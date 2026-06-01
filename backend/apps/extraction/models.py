"""Extraction-side models: ProposedPerson.

When the AI detects a person mentioned in an entry but not tagged
(e.g., "Alfonso's wife Kimberly"), it produces a ProposedPerson row
instead of silently creating the Person. Wesley reviews and Creates
or Rejects.

The proposed properties and proposed associations for the new person
ride along inside `proposal_payload` (JSON). On Create, they get
materialized as real PersonProperty + PersonAssociation rows.
"""
from django.conf import settings
from django.db import models


class ProposedPersonStatus(models.TextChoices):
    PENDING_REVIEW = "pending_review", "Pending review"
    CREATED = "created", "Created"
    REJECTED = "rejected", "Rejected"


class ProposedPerson(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="proposed_persons",
    )
    source_entry = models.ForeignKey(
        "entries.JournalEntry",
        on_delete=models.CASCADE,
        related_name="proposed_persons",
    )
    full_name = models.CharField(max_length=200)
    preferred_name = models.CharField(max_length=100, blank=True)
    life_stage = models.CharField(max_length=16, blank=True, default="")
    ai_confidence = models.FloatField(default=0.0)
    # JSON shape: {
    #   "associations": [{"to_person_id": int, "association_type": "spouse_of"}],
    #   "properties":   [{"property_name": "loves_music", "value": "true", "confidence": 0.9, "data_type": "boolean"}]
    # }
    proposal_payload = models.JSONField(default=dict, blank=True)
    prompt_version = models.CharField(max_length=32, blank=True)
    model = models.CharField(max_length=128, blank=True)
    status = models.CharField(
        max_length=16,
        choices=ProposedPersonStatus.choices,
        default=ProposedPersonStatus.PENDING_REVIEW,
    )
    resolved_to_person = models.ForeignKey(
        "people.Person",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="proposed_from",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} (proposed from entry {self.source_entry_id})"
