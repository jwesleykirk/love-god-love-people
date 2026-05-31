from rest_framework import serializers

from apps.people.models import Person

from .models import JournalEntry, PersonJournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    person_ids = serializers.PrimaryKeyRelatedField(
        queryset=Person.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    person_id_list = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "content_markdown",
            "mood_tag",
            "person_ids",
            "person_id_list",
            "extraction_status",
            "extraction_error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "extraction_status",
            "extraction_error",
            "created_at",
            "updated_at",
        ]

    def get_person_id_list(self, obj):
        return list(obj.persons.values_list("id", flat=True))

    def validate_person_ids(self, value):
        owner = self.context["request"].user
        for p in value:
            if p.owner_id != owner.pk:
                raise serializers.ValidationError("Person not found.")
        return value

    def create(self, validated_data):
        person_ids = validated_data.pop("person_ids", [])
        entry = JournalEntry.objects.create(**validated_data)
        for person in person_ids:
            PersonJournalEntry.objects.create(person=person, entry=entry)
        return entry

    def update(self, instance, validated_data):
        person_ids = validated_data.pop("person_ids", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if person_ids is not None:
            PersonJournalEntry.objects.filter(entry=instance).delete()
            for person in person_ids:
                PersonJournalEntry.objects.create(person=person, entry=instance)
        return instance
