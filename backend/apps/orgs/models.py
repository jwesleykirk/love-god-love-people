"""Organization + OrganizationMembership.

Organizations are first-class taggable entities. They have an n-level hierarchy
(self-referential parent FK; recursive CTEs handle deep walks). Memberships are
typed joins between Person and Organization with optional role and temporal
validity.

A Household is an Organization with org_type='household' — lets you tag "the
Kirk family" as a unit without iterating every member.
"""
from django.conf import settings
from django.db import models


class OrgType(models.TextChoices):
    CHURCH = "church", "Church"
    MINISTRY = "ministry", "Ministry"
    WORK = "work", "Work"
    SCHOOL = "school", "School"
    COMMUNITY = "community", "Community"
    HOUSEHOLD = "household", "Household"
    OTHER = "other", "Other"


class Organization(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organizations",
    )
    name = models.CharField(max_length=200)
    org_type = models.CharField(
        max_length=32,
        choices=OrgType.choices,
        default=OrgType.OTHER,
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    notes_markdown = models.TextField(blank=True)
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["owner", "archived"]),
            models.Index(fields=["owner", "org_type"]),
            models.Index(fields=["parent"]),
        ]

    def __str__(self) -> str:
        return self.name


class OrganizationMembership(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    person = models.ForeignKey(
        "people.Person",
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=100, blank=True)
    started_at = models.DateField(null=True, blank=True)
    ended_at = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "person", "organization", "role"],
                name="unique_membership_per_role",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "person"]),
            models.Index(fields=["owner", "organization"]),
            models.Index(fields=["ended_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.person} @ {self.organization} ({self.role or '—'})"

    @property
    def current(self) -> bool:
        return self.ended_at is None
