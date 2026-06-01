from rest_framework import serializers

from .models import ProposedPerson


class ProposedPersonSerializer(serializers.ModelSerializer):
    source_entry_text = serializers.CharField(source="source_entry.content_markdown", read_only=True)
    source_entry_created_at = serializers.DateTimeField(source="source_entry.created_at", read_only=True)

    class Meta:
        model = ProposedPerson
        fields = [
            "id",
            "full_name",
            "preferred_name",
            "life_stage",
            "ai_confidence",
            "proposal_payload",
            "prompt_version",
            "model",
            "status",
            "resolved_to_person",
            "source_entry",
            "source_entry_text",
            "source_entry_created_at",
            "created_at",
            "reviewed_at",
        ]
        read_only_fields = fields
