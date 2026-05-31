from rest_framework import viewsets

from .models import Person
from .serializers import PersonSerializer


class PersonViewSet(viewsets.ModelViewSet):
    """CRUD for Person, owner-scoped."""

    serializer_class = PersonSerializer

    def get_queryset(self):
        qs = Person.objects.filter(owner=self.request.user)
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(full_name__icontains=q)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(relationship_category=category)
        archived = self.request.query_params.get("archived")
        if archived in ("0", "false"):
            qs = qs.filter(archived=False)
        elif archived in ("1", "true"):
            qs = qs.filter(archived=True)
        else:
            qs = qs.filter(archived=False)
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
