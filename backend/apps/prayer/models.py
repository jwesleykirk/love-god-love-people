from django.conf import settings
from django.db import models


class TargetFrequency(models.TextChoices):
    DAILY = "daily", "Daily"
    WEEKLY = "weekly", "Weekly"
    MONTHLY = "monthly", "Monthly"


class BuildStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    BUILDING = "building", "Building"
    READY = "ready", "Ready"
    FAILED = "failed", "Failed"


class PrayerTopic(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="prayer_topics",
    )
    person = models.ForeignKey(
        "people.Person",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="prayer_topics",
    )
    group = models.ForeignKey(
        "groups.Group",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="prayer_topics",
    )
    topic_text = models.TextField()
    narration_text = models.TextField(blank=True, default="")
    narration_generated = models.BooleanField(default=False)
    audio_file = models.TextField(blank=True, default="")
    target_frequency = models.CharField(
        max_length=16,
        choices=TargetFrequency.choices,
        default=TargetFrequency.WEEKLY,
    )
    next_scheduled_date = models.DateField(null=True, blank=True)
    last_prayed_at = models.DateField(null=True, blank=True)
    answered_date = models.DateField(null=True, blank=True)
    answer_note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "answered_date"]),
            models.Index(fields=["owner", "target_frequency", "next_scheduled_date"]),
        ]

    def __str__(self) -> str:
        return self.narration_text or self.topic_text


class PrayerSession(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="prayer_sessions",
    )
    session_date = models.DateField()
    completed_at = models.DateTimeField(null=True, blank=True)
    audio_file = models.TextField(blank=True, default="")
    playlist = models.JSONField(default=list, blank=True)
    build_status = models.CharField(
        max_length=16,
        choices=BuildStatus.choices,
        default=BuildStatus.PENDING,
    )
    build_log = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-session_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "session_date"],
                name="unique_session_per_owner_date",
            ),
        ]

    def __str__(self) -> str:
        return f"Session {self.session_date}"


class PrayerLog(models.Model):
    session = models.ForeignKey(
        PrayerSession,
        on_delete=models.CASCADE,
        related_name="logs",
    )
    prayer_topic = models.ForeignKey(
        PrayerTopic,
        on_delete=models.CASCADE,
        related_name="logs",
    )
    prayed_on = models.DateField()
    answered = models.BooleanField(default=False)
    answer_note = models.TextField(blank=True, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["session", "prayer_topic"],
                name="unique_log_per_session_topic",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.prayer_topic} on {self.prayed_on}"
