from rest_framework import viewsets

from .models import Person
from .serializers import PersonListSerializer, PersonSerializer


class PersonViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Person.objects.filter(owner=self.request.user).prefetch_related("children")

    def get_serializer_class(self):
        if self.action == "list":
            return PersonListSerializer
        return PersonSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
