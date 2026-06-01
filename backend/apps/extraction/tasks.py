"""Async extraction tasks (v0.3 — prompt v2 + proposed_persons)."""
from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.associations.models import AssociationType, PersonAssociation
from apps.entries.models import JournalEntry
from apps.orgs.models import OrganizationMembership
from apps.people.models import Person
from apps.properties.models import (
    DataTypeHint,
    PersonProperty,
    PersonPropertyStatus,
    PropertyDef,
    PropertyDefStatus,
    PropertyTopic,
)

from .models import ProposedPerson, ProposedPersonStatus
from .prompts import v3 as prompt_v3
from .services.openrouter import OpenRouterError, extract_json

logger = logging.getLogger(__name__)


def _person_associations_summary(person, owner) -> list[dict[str, Any]]:
    rows = PersonAssociation.objects.filter(owner=owner, from_person=person).select_related(
        "association_type", "to_person"
    )
    return [
        {
            "type": r.association_type.name,
            "to_person_name": r.to_person.full_name,
            "to_person_id": r.to_person_id,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "ended_at": r.ended_at.isoformat() if r.ended_at else None,
        }
        for r in rows
    ]


def _person_memberships_summary(person, owner) -> list[dict[str, Any]]:
    rows = OrganizationMembership.objects.filter(owner=owner, person=person).select_related("organization")
    return [
        {
            "organization_name": m.organization.name,
            "organization_type": m.organization.org_type,
            "role": m.role,
            "current": m.ended_at is None,
        }
        for m in rows
    ]


def _persons_context(entry: JournalEntry) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for person in entry.persons.all():
        defs = PropertyDef.objects.filter(owner=entry.owner, status=PropertyDefStatus.ACTIVE)
        current = (
            PersonProperty.objects.filter(
                person=person,
                status__in=[PersonPropertyStatus.APPROVED, PersonPropertyStatus.EDITED],
            )
            .select_related("property_def")
        )
        out.append(
            {
                "person_id": person.pk,
                "name": person.full_name,
                "preferred_name": person.preferred_name,
                "relationship_category": person.relationship_category,
                "life_stage": person.life_stage or None,
                "birthday": person.birthday.isoformat() if person.birthday else None,
                "deceased_at": person.deceased_at.isoformat() if person.deceased_at else None,
                "existing_property_defs": [
                    {"id": d.pk, "name": d.name, "description": d.description}
                    for d in defs
                ],
                "current_values": [
                    {"property_def_id": pp.property_def_id, "value": pp.value_text}
                    for pp in current
                ],
                "associations": _person_associations_summary(person, entry.owner),
                "memberships": _person_memberships_summary(person, entry.owner),
            }
        )
    return out


def _organizations_context(entry: JournalEntry) -> list[dict[str, Any]]:
    return [
        {
            "organization_id": org.pk,
            "name": org.name,
            "org_type": org.org_type,
            "parent_name": org.parent.name if org.parent else None,
        }
        for org in entry.organizations.all()
    ]


def _available_association_types() -> list[dict[str, Any]]:
    return [
        {"name": t.name, "inverse_name": t.inverse_name, "category": t.category, "is_symmetric": t.is_symmetric}
        for t in AssociationType.objects.all()
    ]


def run_extraction(entry_id: int) -> str:
    try:
        entry = JournalEntry.objects.get(pk=entry_id)
    except JournalEntry.DoesNotExist:
        return f"entry {entry_id} not found"

    if not getattr(settings, "OPENROUTER_API_KEY", ""):
        entry.extraction_status = "skipped"
        entry.save(update_fields=["extraction_status"])
        logger.info("extraction skipped: no API key (entry %s)", entry_id)
        return "skipped: no api key"

    entry.extraction_status = "running"
    entry.extraction_error = ""
    entry.save(update_fields=["extraction_status", "extraction_error"])

    try:
        persons_ctx = _persons_context(entry)
        orgs_ctx = _organizations_context(entry)
        types_ctx = _available_association_types()
        user_prompt = prompt_v3.build_user_prompt(
            entry.content_markdown, persons_ctx, orgs_ctx, types_ctx
        )
        result = extract_json(prompt_v3.SYSTEM_PROMPT, user_prompt)
    except OpenRouterError as exc:
        logger.exception("openrouter error on entry %s", entry_id)
        entry.extraction_status = "error"
        entry.extraction_error = f"OpenRouter: {exc}"[:1000]
        entry.save(update_fields=["extraction_status", "extraction_error"])
        return f"error: {exc}"
    except Exception as exc:  # pragma: no cover
        logger.exception("unexpected extraction error on entry %s", entry_id)
        entry.extraction_status = "error"
        entry.extraction_error = f"{type(exc).__name__}: {exc}"[:1000]
        entry.save(update_fields=["extraction_status", "extraction_error"])
        return f"error: {exc}"

    _persist_extraction(entry, result)
    entry.extraction_status = "done"
    entry.save(update_fields=["extraction_status"])
    return "done"


@transaction.atomic
def _persist_extraction(entry: JournalEntry, result: dict[str, Any]) -> None:
    owner = entry.owner
    model_slug = getattr(settings, "OPENROUTER_MODEL", "")
    pv = prompt_v3.VERSION

    valid_data_types = {choice.value for choice in DataTypeHint}
    valid_topics = {choice.value for choice in PropertyTopic}
    person_ids_in_entry = set(entry.persons.values_list("id", flat=True))

    # 1. existing_property_values
    for row in result.get("existing_property_values", []) or []:
        try:
            person_id = int(row["person_id"])
            property_def_id = int(row["property_def_id"])
            value = str(row.get("value", "")).strip()
            confidence = float(row.get("confidence", 0.0))
        except (KeyError, TypeError, ValueError):
            logger.warning("skipping malformed existing-value row: %s", row)
            continue
        if person_id not in person_ids_in_entry:
            continue
        if not value:
            continue
        try:
            pdef = PropertyDef.objects.get(pk=property_def_id, owner=owner)
        except PropertyDef.DoesNotExist:
            logger.warning("ignoring unknown property_def_id=%s", property_def_id)
            continue
        pp = PersonProperty.objects.create(
            owner=owner,
            person_id=person_id,
            property_def=pdef,
            value_text=value,
            ai_confidence=confidence,
            source_entry=entry,
            prompt_version=pv,
            model=model_slug,
            status=PersonPropertyStatus.PENDING_REVIEW,
        )
        pp._change_reason = f"ai_extraction:entry_id={entry.pk}"
        pp.save(update_fields=[])
        PropertyDef.objects.filter(pk=pdef.pk).update(usage_count=pdef.usage_count + 1)

    # 2. new_property_proposals
    for row in result.get("new_property_proposals", []) or []:
        try:
            person_id = int(row["person_id"])
            proposed_name = str(row["proposed_name"]).strip().lower().replace(" ", "_")
            proposed_description = str(row.get("proposed_description", "")).strip()
            proposed_data_type = str(row.get("proposed_data_type", "text")).strip().lower()
            proposed_topic = str(row.get("proposed_topic", "other")).strip().lower()
            value = str(row.get("value", "")).strip()
            confidence = float(row.get("confidence", 0.0))
        except (KeyError, TypeError, ValueError):
            logger.warning("skipping malformed new-property row: %s", row)
            continue
        if person_id not in person_ids_in_entry:
            continue
        if not proposed_name or not value:
            continue
        if proposed_data_type not in valid_data_types:
            proposed_data_type = DataTypeHint.TEXT
        if proposed_topic not in valid_topics:
            proposed_topic = PropertyTopic.OTHER
        pdef, _ = PropertyDef.objects.get_or_create(
            owner=owner,
            name=proposed_name,
            defaults={
                "description": proposed_description,
                "data_type_hint": proposed_data_type,
                "topic": proposed_topic,
                "first_proposed_from_entry": entry,
                "ai_confidence_on_creation": confidence,
            },
        )
        pp = PersonProperty.objects.create(
            owner=owner,
            person_id=person_id,
            property_def=pdef,
            value_text=value,
            ai_confidence=confidence,
            source_entry=entry,
            prompt_version=pv,
            model=model_slug,
            status=PersonPropertyStatus.PENDING_REVIEW,
        )
        pp._change_reason = f"ai_extraction:entry_id={entry.pk}"
        pp.save(update_fields=[])
        PropertyDef.objects.filter(pk=pdef.pk).update(usage_count=pdef.usage_count + 1)

    # 3. proposed_persons
    for row in result.get("proposed_persons", []) or []:
        try:
            full_name = str(row["full_name"]).strip()
            preferred_name = str(row.get("preferred_name", "")).strip()
            life_stage = str(row.get("life_stage", "")).strip()
            confidence = float(row.get("confidence", 0.0))
        except (KeyError, TypeError, ValueError):
            logger.warning("skipping malformed proposed_persons row: %s", row)
            continue
        if not full_name:
            continue
        # Build payload from the AI's proposed_associations + proposed_properties
        associations = []
        for assoc in row.get("proposed_associations", []) or []:
            try:
                to_person_id = int(assoc.get("to_person_id"))
                a_type = str(assoc.get("association_type") or "").strip()
            except (TypeError, ValueError):
                continue
            if not a_type or to_person_id not in person_ids_in_entry:
                continue
            if not AssociationType.objects.filter(name=a_type).exists():
                continue
            associations.append({"to_person_id": to_person_id, "association_type": a_type})

        properties = []
        for prop in row.get("proposed_properties", []) or []:
            try:
                name = str(prop.get("property_name") or "").strip().lower().replace(" ", "_")
                value = str(prop.get("value") or "").strip()
                pconf = float(prop.get("confidence") or 0.0)
                data_type = str(prop.get("data_type") or "text").strip().lower()
                topic = str(prop.get("topic") or "other").strip().lower()
            except (TypeError, ValueError):
                continue
            if not name or not value:
                continue
            if data_type not in valid_data_types:
                data_type = DataTypeHint.TEXT
            if topic not in valid_topics:
                topic = PropertyTopic.OTHER
            properties.append({"property_name": name, "value": value, "confidence": pconf, "data_type": data_type, "topic": topic})

        ProposedPerson.objects.create(
            owner=owner,
            source_entry=entry,
            full_name=full_name,
            preferred_name=preferred_name,
            life_stage=life_stage,
            ai_confidence=confidence,
            proposal_payload={"associations": associations, "properties": properties},
            prompt_version=pv,
            model=model_slug,
        )
