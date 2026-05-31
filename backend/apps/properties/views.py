from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    PersonProperty,
    PersonPropertyStatus,
    PropertyDef,
    PropertyDefStatus,
)
from .serializers import PersonPropertySerializer, PropertyDefSerializer


class PropertyDefViewSet(viewsets.ModelViewSet):
    serializer_class = PropertyDefSerializer

    def get_queryset(self):
        qs = PropertyDef.objects.filter(owner=self.request.user)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        pdef = self.get_object()
        pdef.status = PropertyDefStatus.ARCHIVED
        pdef.reviewed_at = timezone.now()
        pdef.save(update_fields=["status", "reviewed_at"])
        return Response(PropertyDefSerializer(pdef).data)

    @action(detail=True, methods=["post"])
    def merge(self, request, pk=None):
        """Merge this PropertyDef into another. Re-points PersonProperty rows."""
        pdef = self.get_object()
        target_id = request.data.get("target_id")
        try:
            target = PropertyDef.objects.get(pk=target_id, owner=request.user)
        except PropertyDef.DoesNotExist:
            return Response({"error": "target not found"}, status=status.HTTP_400_BAD_REQUEST)
        if target.pk == pdef.pk:
            return Response({"error": "cannot merge into self"}, status=status.HTTP_400_BAD_REQUEST)
        PersonProperty.objects.filter(property_def=pdef).update(property_def=target)
        pdef.status = PropertyDefStatus.MERGED
        pdef.merged_into = target
        pdef.reviewed_at = timezone.now()
        pdef.save(update_fields=["status", "merged_into", "reviewed_at"])
        return Response(PropertyDefSerializer(pdef).data)


class PersonPropertyViewSet(viewsets.ModelViewSet):
    serializer_class = PersonPropertySerializer

    def get_queryset(self):
        qs = PersonProperty.objects.filter(owner=self.request.user).select_related(
            "person", "property_def"
        )
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        person_id = self.request.query_params.get("person_id")
        if person_id:
            qs = qs.filter(person_id=person_id)
        return qs

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        pp = self.get_object()
        pp.status = PersonPropertyStatus.APPROVED
        pp.reviewed_at = timezone.now()
        pp.save(update_fields=["status", "reviewed_at"])
        return Response(PersonPropertySerializer(pp).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        pp = self.get_object()
        pp.status = PersonPropertyStatus.REJECTED
        pp.reviewed_at = timezone.now()
        pp.save(update_fields=["status", "reviewed_at"])
        return Response(PersonPropertySerializer(pp).data)

    @action(detail=True, methods=["post"])
    def edit_value(self, request, pk=None):
        pp = self.get_object()
        new_value = request.data.get("value_text")
        if not new_value or not new_value.strip():
            return Response({"error": "value_text required"}, status=status.HTTP_400_BAD_REQUEST)
        pp.value_text = new_value.strip()
        pp.status = PersonPropertyStatus.EDITED
        pp.reviewed_at = timezone.now()
        pp.save(update_fields=["value_text", "status", "reviewed_at"])
        return Response(PersonPropertySerializer(pp).data)
