"""Person — the core record.

v0.2 changes:
- Drop bridge_student from RelationshipCategory (now expressed via Organization
  membership, not a flat category).
- Add neighbor + ministry as categories.
- Add optional life_stage, birthday, deceased_at.
"""
from django.conf import settings
from django.db import models
from simple_history.models import HistoricalRecords


class RelationshipCategory(models.TextChoices):
    FAMILY = "family", "Family"
    FRIEND = "friend", "Friend"
    WORK = "work", "Work"
    NEIGHBOR = "neighbor", "Neighbor"
    MINISTRY = "ministry", "Ministry"
    OTHER = "other", "Other"


class LifeStage(models.TextChoices):
    INFANT = "infant", "Infant (0–1)"
    TODDLER = "toddler", "Toddler (1–3)"
    CHILD = "child", "Child"
    TEEN = "teen", "Teen"
    YOUNG_ADULT = "young_adult", "Young adult"
    ADULT = "adult", "Adult"
    SENIOR = "senior", "Senior"


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
    life_stage = models.CharField(
        max_length=16,
        choices=LifeStage.choices,
        blank=True,
        default="",
    )
    birthday = models.DateField(null=True, blank=True)
    deceased_at = models.DateField(null=True, blank=True)
    notes_markdown = models.TextField(blank=True)
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    class Meta:
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["owner", "archived"]),
            models.Index(fields=["owner", "relationship_category"]),
            models.Index(fields=["owner", "life_stage"]),
        ]

    def __str__(self) -> str:
        return self.full_name
