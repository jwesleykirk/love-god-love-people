"""AssociationType + PersonAssociation.

Person-to-person typed edges. Storage shape: two rows per logical edge — one
per direction. The AssociationType row knows its inverse_name so the second
row can be written automatically on create. Symmetric types (spouse, sibling,
close friend) are still stored as two rows; the inverse_name simply points
back to the same type.
"""
from django.conf import settings
from django.db import models


class AssociationCategory(models.TextChoices):
    LOVE = "love", "Love"
    FAMILY = "family", "Family"
    FRIEND = "friend", "Friend"
    WORK = "work", "Work"
    MINISTRY = "ministry", "Ministry"
    OTHER = "other", "Other"


class AssociationType(models.Model):
    """A typed kind of person-to-person edge. Seeded list; user-additions allowed."""

    name = models.CharField(max_length=64, unique=True)
    inverse_name = models.CharField(max_length=64)
    is_symmetric = models.BooleanField(default=False)
    category = models.CharField(
        max_length=16,
        choices=AssociationCategory.choices,
        default=AssociationCategory.OTHER,
    )
    description = models.TextField(blank=True)
    system = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=100)

    class Meta:
        ordering = ["category", "sort_order", "name"]

    def __str__(self) -> str:
        return self.name


class PersonAssociation(models.Model):
    """One row per direction. On POST, the viewset writes two rows in a transaction."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="person_associations",
    )
    from_person = models.ForeignKey(
        "people.Person",
        on_delete=models.CASCADE,
        related_name="associations_from",
    )
    to_person = models.ForeignKey(
        "people.Person",
        on_delete=models.CASCADE,
        related_name="associations_to",
    )
    association_type = models.ForeignKey(
        AssociationType,
        on_delete=models.PROTECT,
        related_name="associations",
    )
    started_at = models.DateField(null=True, blank=True)
    ended_at = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Used to find the paired row in the reverse direction so we can update
    # / delete both rows atomically when the user edits one side.
    paired_id = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "from_person", "to_person", "association_type"],
                name="unique_association_row",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "from_person"]),
            models.Index(fields=["owner", "to_person"]),
        ]

    def __str__(self) -> str:
        return f"{self.from_person} —[{self.association_type.name}]→ {self.to_person}"
