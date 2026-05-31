"""Async extraction tasks. Enqueued by `apps.entries.views`."""
from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.entries.models import JournalEntry
from apps.properties.models import (
    DataTypeHint,
    PersonProperty,
    PersonPropertyStatus,
    PropertyDef,
    PropertyDefStatus,
)

from .prompts import v0 as prompt_v0
from .services.openrouter import OpenRouterError, extract_json

logger = logging.getLogger(__name__)


def _persons_context(entry: JournalEntry) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for person in entry.persons.all():
        defs = PropertyDef.objects.filter(
            owner=entry.owner, status=PropertyDefStatus.ACTIVE
        )
        current = (
            PersonProperty.objects.filter(
                person=person,
                status__in=[
                    PersonPropertyStatus.APPROVED,
                    PersonPropertyStatus.EDITED,
                ],
            )
            .select_related("property_def")
        )
        out.append(
            {
                "person_id": person.pk,
                "name": person.full_name,
                "existing_property_defs": [
                    {"id": d.pk, "name": d.name, "description": d.description}
                    for d in defs
                ],
                "current_values": [
                    {"property_def_id": pp.property_def_id, "value": pp.value_text}
                    for pp in current
                ],
            }
        )
    return out


def run_extraction(entry_id: int) -> str:
    """Run extraction for a single entry. Idempotent: safe to retry.

    Returns a short status string for the Django-Q2 result log.
    """
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
        user_prompt = prompt_v0.build_user_prompt(entry.content_markdown, persons_ctx)
        result = extract_json(prompt_v0.SYSTEM_PROMPT, user_prompt)
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
    """Insert PersonProperty + PropertyDef rows from an extraction result.

    Tolerates malformed-but-survivable shapes (missing keys, unknown
    property_def_ids). Skips rows it can't make sense of rather than
    failing the whole entry.
    """
    owner = entry.owner
    model_slug = getattr(settings, "OPENROUTER_MODEL", "")
    pv = prompt_v0.VERSION

    valid_data_types = {choice.value for choice in DataTypeHint}

    # Fast lookup of allowed persons for this entry — guard against the LLM
    # writing facts about people who weren't tagged.
    person_ids_in_entry = set(entry.persons.values_list("id", flat=True))

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
        PersonProperty.objects.create(
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
        PropertyDef.objects.filter(pk=pdef.pk).update(usage_count=pdef.usage_count + 1)

    for row in result.get("new_property_proposals", []) or []:
        try:
            person_id = int(row["person_id"])
            proposed_name = str(row["proposed_name"]).strip().lower().replace(" ", "_")
            proposed_description = str(row.get("proposed_description", "")).strip()
            proposed_data_type = str(row.get("proposed_data_type", "text")).strip().lower()
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
        pdef, created = PropertyDef.objects.get_or_create(
            owner=owner,
            name=proposed_name,
            defaults={
                "description": proposed_description,
                "data_type_hint": proposed_data_type,
                "first_proposed_from_entry": entry,
                "ai_confidence_on_creation": confidence,
            },
        )
        PersonProperty.objects.create(
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
        PropertyDef.objects.filter(pk=pdef.pk).update(usage_count=pdef.usage_count + 1)
