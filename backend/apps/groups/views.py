from rest_framework import viewsets

from .models import Group
from .serializers import GroupListSerializer, GroupSerializer


class GroupViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Group.objects.filter(owner=self.request.user).prefetch_related(
            "memberships__person"
        )

    def get_serializer_class(self):
        if self.action == "list":
            return GroupListSerializer
        return GroupSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
