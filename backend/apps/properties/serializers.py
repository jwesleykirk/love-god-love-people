from rest_framework import serializers

from .models import PersonProperty, PropertyDef


class PropertyDefSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyDef
        fields = [
            "id",
            "name",
            "description",
            "data_type_hint",
            "status",
            "first_proposed_at",
            "first_proposed_from_entry",
            "ai_confidence_on_creation",
            "merged_into",
            "usage_count",
            "reviewed_at",
        ]
        read_only_fields = [
            "id",
            "first_proposed_at",
            "first_proposed_from_entry",
            "ai_confidence_on_creation",
            "usage_count",
        ]


class PersonPropertySerializer(serializers.ModelSerializer):
    property_def_name = serializers.CharField(source="property_def.name", read_only=True)
    person_name = serializers.CharField(source="person.full_name", read_only=True)

    class Meta:
        model = PersonProperty
        fields = [
            "id",
            "person",
            "person_name",
            "property_def",
            "property_def_name",
            "value_text",
            "ai_confidence",
            "source_entry",
            "prompt_version",
            "model",
            "status",
            "created_at",
            "reviewed_at",
        ]
        read_only_fields = [
            "id",
            "person_name",
            "property_def_name",
            "ai_confidence",
            "source_entry",
            "prompt_version",
            "model",
            "created_at",
        ]
