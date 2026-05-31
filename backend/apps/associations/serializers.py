from rest_framework import serializers

from .models import AssociationType, PersonAssociation


class AssociationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssociationType
        fields = [
            "id",
            "name",
            "inverse_name",
            "is_symmetric",
            "category",
            "description",
            "system",
            "sort_order",
        ]
        read_only_fields = fields


class PersonAssociationSerializer(serializers.ModelSerializer):
    from_person_name = serializers.CharField(source="from_person.full_name", read_only=True)
    to_person_name = serializers.CharField(source="to_person.full_name", read_only=True)
    association_type_name = serializers.CharField(source="association_type.name", read_only=True)

    class Meta:
        model = PersonAssociation
        fields = [
            "id",
            "from_person",
            "from_person_name",
            "to_person",
            "to_person_name",
            "association_type",
            "association_type_name",
            "started_at",
            "ended_at",
            "notes",
            "paired_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "from_person_name",
            "to_person_name",
            "association_type_name",
            "paired_id",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        if attrs.get("from_person") and attrs.get("to_person") and attrs["from_person"].pk == attrs["to_person"].pk:
            raise serializers.ValidationError("Cannot associate a person with themselves.")
        if request:
            for f in ("from_person", "to_person"):
                obj = attrs.get(f)
                if obj and obj.owner_id != request.user.pk:
                    raise serializers.ValidationError(f"{f} not found.")
        return attrs
