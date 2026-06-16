from rest_framework import serializers

from apps.people.models import Person
from apps.people.serializers import PersonListSerializer

from .models import Group, GroupMembership


class GroupMembershipSerializer(serializers.ModelSerializer):
    person = PersonListSerializer(read_only=True)

    class Meta:
        model = GroupMembership
        fields = ["id", "person"]
        read_only_fields = ["id", "person"]


class GroupSerializer(serializers.ModelSerializer):
    memberships = GroupMembershipSerializer(many=True, read_only=True)
    member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Group
        fields = ["id", "name", "notes", "memberships", "member_ids", "created_at"]
        read_only_fields = ["id", "created_at"]

    def _sync_members(self, group: Group, person_ids: list[int] | None):
        if person_ids is None:
            return
        group.memberships.all().delete()
        people = Person.objects.filter(owner=group.owner, pk__in=person_ids)
        GroupMembership.objects.bulk_create(
            [GroupMembership(group=group, person=p) for p in people]
        )

    def create(self, validated_data):
        member_ids = validated_data.pop("member_ids", None)
        group = Group.objects.create(**validated_data)
        self._sync_members(group, member_ids)
        return group

    def update(self, instance, validated_data):
        member_ids = validated_data.pop("member_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        self._sync_members(instance, member_ids)
        return instance


class GroupListSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ["id", "name", "member_count"]

    def get_member_count(self, obj: Group) -> int:
        return obj.memberships.count()
