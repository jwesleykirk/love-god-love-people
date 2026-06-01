"""EAV property bag.

PropertyDef holds the definitions (the "schema" that AI discovers and
Wesley curates). PersonProperty holds the per-person values.

Neither table requires DDL when a new property type is proposed — that's
the whole point. AI proposes a PropertyDef row; Wesley keeps/renames/
merges/archives it via the Review Console.
"""
from django.conf import settings
from django.db import models
from simple_history.models import HistoricalRecords


class DataTypeHint(models.TextChoices):
    TEXT = "text", "Text"
    DATE = "date", "Date"
    INTEGER = "integer", "Integer"
    BOOLEAN = "boolean", "Boolean"
    ENUM = "enum", "Enum"
    URL = "url", "URL"


class PropertyDefStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"
    MERGED = "merged", "Merged"


class PropertyDef(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="property_defs",
    )
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    data_type_hint = models.CharField(
        max_length=16,
        choices=DataTypeHint.choices,
        default=DataTypeHint.TEXT,
    )
    first_proposed_at = models.DateTimeField(auto_now_add=True)
    first_proposed_from_entry = models.ForeignKey(
        "entries.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="proposed_property_defs",
    )
    ai_confidence_on_creation = models.FloatField(default=0.0)
    status = models.CharField(
        max_length=16,
        choices=PropertyDefStatus.choices,
        default=PropertyDefStatus.ACTIVE,
    )
    merged_into = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="merged_from",
    )
    usage_count = models.IntegerField(default=0)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    history = HistoricalRecords()

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"],
                name="unique_property_name_per_owner",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "status"]),
        ]

    def __str__(self) -> str:
        return self.name


class PersonPropertyStatus(models.TextChoices):
    PENDING_REVIEW = "pending_review", "Pending review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    EDITED = "edited", "Edited"
    SUPERSEDED = "superseded", "Superseded"


class PersonProperty(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="person_properties",
    )
    person = models.ForeignKey(
        "people.Person",
        on_delete=models.CASCADE,
        related_name="properties",
    )
    property_def = models.ForeignKey(
        PropertyDef,
        on_delete=models.CASCADE,
        related_name="values",
    )
    value_text = models.TextField()
    ai_confidence = models.FloatField(default=0.0)
    source_entry = models.ForeignKey(
        "entries.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="extracted_properties",
    )
    prompt_version = models.CharField(max_length=32, blank=True)
    model = models.CharField(max_length=128, blank=True)
    status = models.CharField(
        max_length=16,
        choices=PersonPropertyStatus.choices,
        default=PersonPropertyStatus.PENDING_REVIEW,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    history = HistoricalRecords()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "status"]),
            models.Index(fields=["person", "property_def"]),
        ]

    def __str__(self) -> str:
        return f"{self.person} · {self.property_def}: {self.value_text[:40]}"
