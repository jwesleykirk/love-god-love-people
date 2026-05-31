from rest_framework import viewsets

from .models import Organization, OrganizationMembership
from .serializers import OrganizationMembershipSerializer, OrganizationSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer

    def get_queryset(self):
        qs = Organization.objects.filter(owner=self.request.user)
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(name__icontains=q)
        org_type = self.request.query_params.get("org_type")
        if org_type:
            qs = qs.filter(org_type=org_type)
        parent_id = self.request.query_params.get("parent_id")
        if parent_id == "null":
            qs = qs.filter(parent__isnull=True)
        elif parent_id:
            qs = qs.filter(parent_id=parent_id)
        if self.request.query_params.get("archived") in ("1", "true"):
            qs = qs.filter(archived=True)
        else:
            qs = qs.filter(archived=False)
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class OrganizationMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationMembershipSerializer

    def get_queryset(self):
        qs = OrganizationMembership.objects.filter(owner=self.request.user).select_related(
            "person", "organization"
        )
        person_id = self.request.query_params.get("person_id")
        if person_id:
            qs = qs.filter(person_id=person_id)
        organization_id = self.request.query_params.get("organization_id")
        if organization_id:
            qs = qs.filter(organization_id=organization_id)
        current = self.request.query_params.get("current")
        if current in ("1", "true"):
            qs = qs.filter(ended_at__isnull=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
