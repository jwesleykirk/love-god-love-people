"""Person — the core record."""
from django.conf import settings
from django.db import models


class RelationshipCategory(models.TextChoices):
    FRIEND = "friend", "Friend"
    FAMILY = "family", "Family"
    BRIDGE_STUDENT = "bridge_student", "Bridge student"
    OTHER = "other", "Other"


class Person(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="people",
    )
    full_name = models.CharField(max_length=200)
    preferred_name = models.CharField(max_length=100, blank=True)
    relationship_category = models.CharField(
        max_length=32,
        choices=RelationshipCategory.choices,
        default=RelationshipCategory.OTHER,
    )
    notes_markdown = models.TextField(blank=True)
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["owner", "archived"]),
            models.Index(fields=["owner", "relationship_category"]),
        ]

    def __str__(self) -> str:
        return self.full_name
