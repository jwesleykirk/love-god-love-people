from rest_framework import serializers

from apps.orgs.models import Organization
from apps.people.models import Person

from .models import JournalEntry, OrganizationJournalEntry, PersonJournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    person_ids = serializers.PrimaryKeyRelatedField(
        queryset=Person.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    organization_ids = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    person_id_list = serializers.SerializerMethodField()
    organization_id_list = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "content_markdown",
            "mood_tag",
            "person_ids",
            "organization_ids",
            "person_id_list",
            "organization_id_list",
            "extraction_status",
            "extraction_error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "person_id_list",
            "organization_id_list",
            "extraction_status",
            "extraction_error",
            "created_at",
            "updated_at",
        ]

    def get_person_id_list(self, obj):
        return list(obj.persons.values_list("id", flat=True))

    def get_organization_id_list(self, obj):
        return list(obj.organizations.values_list("id", flat=True))

    def validate(self, attrs):
        request = self.context.get("request")
        for field in ("person_ids", "organization_ids"):
            for obj in attrs.get(field, []) or []:
                if obj.owner_id != request.user.pk:
                    raise serializers.ValidationError(f"{field}: not found.")
        return attrs

    def create(self, validated_data):
        person_ids = validated_data.pop("person_ids", [])
        organization_ids = validated_data.pop("organization_ids", [])
        entry = JournalEntry.objects.create(**validated_data)
        for p in person_ids:
            PersonJournalEntry.objects.create(person=p, entry=entry)
        for o in organization_ids:
            OrganizationJournalEntry.objects.create(organization=o, entry=entry)
        return entry

    def update(self, instance, validated_data):
        person_ids = validated_data.pop("person_ids", None)
        organization_ids = validated_data.pop("organization_ids", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if person_ids is not None:
            PersonJournalEntry.objects.filter(entry=instance).delete()
            for p in person_ids:
                PersonJournalEntry.objects.create(person=p, entry=instance)
        if organization_ids is not None:
            OrganizationJournalEntry.objects.filter(entry=instance).delete()
            for o in organization_ids:
                OrganizationJournalEntry.objects.create(organization=o, entry=instance)
        return instance
