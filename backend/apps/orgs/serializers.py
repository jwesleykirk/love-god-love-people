from rest_framework import serializers

from .models import Organization, OrganizationMembership


class OrganizationSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)
    child_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "org_type",
            "parent",
            "parent_name",
            "notes_markdown",
            "archived",
            "child_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "parent_name", "child_count", "created_at", "updated_at"]

    def get_child_count(self, obj):
        return obj.children.count()

    def validate_parent(self, value):
        # An org cannot be its own ancestor.
        if value and self.instance and value.pk == self.instance.pk:
            raise serializers.ValidationError("Organization cannot be its own parent.")
        # Walk the parent chain to check for cycles.
        if value and self.instance:
            node = value
            while node is not None:
                if node.pk == self.instance.pk:
                    raise serializers.ValidationError("Parent assignment would create a cycle.")
                node = node.parent
        return value


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    person_name = serializers.CharField(source="person.full_name", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    current = serializers.BooleanField(read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = [
            "id",
            "person",
            "person_name",
            "organization",
            "organization_name",
            "role",
            "started_at",
            "ended_at",
            "current",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "person_name", "organization_name", "current", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        if request:
            for field in ("person", "organization"):
                obj = attrs.get(field)
                if obj and obj.owner_id != request.user.pk:
                    raise serializers.ValidationError(f"{field} not found.")
        return attrs
