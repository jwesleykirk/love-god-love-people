"""Phase 2 + Phase 3 scaffolds.

These tables exist from Phase 1 so the migration history stays clean when
we light up the prayer engine and spaced repetition features in Phase 2/3.
No UI references them yet.
"""
from django.conf import settings
from django.db import models


class PrayerFrequency(models.TextChoices):
    DAILY = "daily", "Daily"
    WEEKLY = "weekly", "Weekly"
    MONTHLY = "monthly", "Monthly"
    NONE = "none", "None"


class PrayerSchedule(models.Model):
    """Phase 3 — per-person prayer cadence."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="prayer_schedules",
    )
    person = models.OneToOneField(
        "people.Person",
        on_delete=models.CASCADE,
        related_name="prayer_schedule",
    )
    frequency = models.CharField(
        max_length=16,
        choices=PrayerFrequency.choices,
        default=PrayerFrequency.NONE,
    )
    last_prayed_at = models.DateTimeField(null=True, blank=True)
    next_due_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["owner", "next_due_at"])]


class ReviewMemo(models.Model):
    """Phase 2 — spaced-repetition scoring per property value."""

    person_property = models.OneToOneField(
        "properties.PersonProperty",
        on_delete=models.CASCADE,
        related_name="review_memo",
    )
    ease_factor = models.FloatField(default=2.5)
    interval_days = models.IntegerField(default=1)
    due_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["due_at"])]
