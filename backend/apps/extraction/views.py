"""ProposedPerson viewset.

Actions:
- list  GET   /api/proposed-persons/?status=pending_review  → list pending proposals
- create POST /api/proposed-persons/{id}/create_person/      → materialize as real Person
- reject POST /api/proposed-persons/{id}/reject/             → mark rejected
"""
from django.db import transaction
from django.utils import timezone
from rest_framework import status as drf_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.associations.models import AssociationType, PersonAssociation
from apps.people.models import Person, RelationshipCategory
from apps.properties.models import (
    DataTypeHint,
    PersonProperty,
    PersonPropertyStatus,
    PropertyDef,
)

from .models import ProposedPerson, ProposedPersonStatus
from .serializers import ProposedPersonSerializer


class ProposedPersonViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProposedPersonSerializer

    def get_queryset(self):
        qs = ProposedPerson.objects.filter(owner=self.request.user).select_related("source_entry")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["post"], url_path="create-person")
    @transaction.atomic
    def create_person(self, request, pk=None):
        prop = self.get_object()
        if prop.status != ProposedPersonStatus.PENDING_REVIEW:
            return Response(
                {"error": f"already {prop.status}"},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        # Optional override: user can edit name/category at creation time
        full_name = (request.data.get("full_name") or prop.full_name).strip()
        preferred_name = (request.data.get("preferred_name") or prop.preferred_name).strip()
        relationship_category = (request.data.get("relationship_category") or "").strip()
        valid_categories = {c.value for c in RelationshipCategory}
        if relationship_category not in valid_categories:
            return Response(
                {"relationship_category": "A relationship category is required."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        person = Person.objects.create(
            owner=prop.owner,
            full_name=full_name,
            preferred_name=preferred_name,
            relationship_category=relationship_category,
            life_stage=prop.life_stage or "",
        )
        person._change_reason = f"ai_extraction:entry_id={prop.source_entry_id}:proposed_person={prop.pk}"
        person.save(update_fields=[])  # trigger history with reason

        payload = prop.proposal_payload or {}

        # Materialize proposed associations
        for assoc in payload.get("associations", []) or []:
            type_name = (assoc.get("association_type") or "").strip()
            other_id = assoc.get("to_person_id")
            if not type_name or not other_id:
                continue
            try:
                a_type = AssociationType.objects.get(name=type_name)
                other = Person.objects.get(pk=other_id, owner=prop.owner)
            except (AssociationType.DoesNotExist, Person.DoesNotExist):
                continue
            forward = PersonAssociation.objects.create(
                owner=prop.owner,
                from_person=person,
                to_person=other,
                association_type=a_type,
            )
            try:
                inverse_type = AssociationType.objects.get(name=a_type.inverse_name)
            except AssociationType.DoesNotExist:
                inverse_type = a_type
            backward = PersonAssociation.objects.create(
                owner=prop.owner,
                from_person=other,
                to_person=person,
                association_type=inverse_type,
                paired_id=forward.pk,
            )
            forward.paired_id = backward.pk
            forward.save(update_fields=["paired_id"])

        # Materialize proposed properties as pending PersonProperty rows
        valid_data_types = {c.value for c in DataTypeHint}
        for prop_row in payload.get("properties", []) or []:
            name = (prop_row.get("property_name") or "").strip().lower().replace(" ", "_")
            value = str(prop_row.get("value", "")).strip()
            confidence = float(prop_row.get("confidence") or 0.0)
            data_type = (prop_row.get("data_type") or "text").strip().lower()
            if data_type not in valid_data_types:
                data_type = DataTypeHint.TEXT
            if not name or not value:
                continue
            pdef, _ = PropertyDef.objects.get_or_create(
                owner=prop.owner,
                name=name,
                defaults={
                    "description": "",
                    "data_type_hint": data_type,
                    "first_proposed_from_entry": prop.source_entry,
                    "ai_confidence_on_creation": confidence,
                },
            )
            pp = PersonProperty.objects.create(
                owner=prop.owner,
                person=person,
                property_def=pdef,
                value_text=value,
                ai_confidence=confidence,
                source_entry=prop.source_entry,
                prompt_version=prop.prompt_version,
                model=prop.model,
                status=PersonPropertyStatus.PENDING_REVIEW,
            )
            pp._change_reason = f"ai_extraction:entry_id={prop.source_entry_id}:proposed_person={prop.pk}"
            pp.save(update_fields=[])

        prop.status = ProposedPersonStatus.CREATED
        prop.resolved_to_person = person
        prop.reviewed_at = timezone.now()
        prop.save(update_fields=["status", "resolved_to_person", "reviewed_at"])
        return Response(ProposedPersonSerializer(prop).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        prop = self.get_object()
        prop.status = ProposedPersonStatus.REJECTED
        prop.reviewed_at = timezone.now()
        prop.save(update_fields=["status", "reviewed_at"])
        return Response(ProposedPersonSerializer(prop).data)
