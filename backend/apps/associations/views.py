from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.response import Response

from .models import AssociationType, PersonAssociation
from .serializers import AssociationTypeSerializer, PersonAssociationSerializer


class AssociationTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """List-only. Wesley sees the seeded catalog plus any user-added types."""

    serializer_class = AssociationTypeSerializer

    def get_queryset(self):
        qs = AssociationType.objects.all()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        return qs


class PersonAssociationViewSet(viewsets.ModelViewSet):
    """CRUD for person-to-person edges.

    On create: writes two rows in one transaction. On delete: deletes both
    rows. On update: applies changes to both rows symmetrically.
    """

    serializer_class = PersonAssociationSerializer

    def get_queryset(self):
        qs = PersonAssociation.objects.filter(owner=self.request.user).select_related(
            "from_person", "to_person", "association_type"
        )
        person_id = self.request.query_params.get("person_id")
        if person_id:
            qs = qs.filter(from_person_id=person_id)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        forward = serializer.save(owner=self.request.user)
        # Look up the type that pairs with this one's inverse_name.
        a_type = forward.association_type
        try:
            inverse_type = AssociationType.objects.get(name=a_type.inverse_name)
        except AssociationType.DoesNotExist:
            inverse_type = a_type  # symmetric or self-referencing types fall back here
        backward = PersonAssociation.objects.create(
            owner=forward.owner,
            from_person=forward.to_person,
            to_person=forward.from_person,
            association_type=inverse_type,
            started_at=forward.started_at,
            ended_at=forward.ended_at,
            notes=forward.notes,
            paired_id=forward.pk,
        )
        forward.paired_id = backward.pk
        forward.save(update_fields=["paired_id"])

    @transaction.atomic
    def perform_update(self, serializer):
        forward = serializer.save()
        if forward.paired_id:
            PersonAssociation.objects.filter(pk=forward.paired_id).update(
                started_at=forward.started_at,
                ended_at=forward.ended_at,
                notes=forward.notes,
            )

    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.paired_id:
            PersonAssociation.objects.filter(pk=instance.paired_id).delete()
        instance.delete()
