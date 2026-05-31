"""JournalEntry and the PersonJournalEntry join."""
from django.conf import settings
from django.db import models


class JournalEntry(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    content_markdown = models.TextField()
    mood_tag = models.CharField(max_length=64, blank=True)
    persons = models.ManyToManyField(
        "people.Person",
        through="entries.PersonJournalEntry",
        related_name="entries",
    )
    extraction_status = models.CharField(
        max_length=32,
        default="pending",
        choices=(
            ("pending", "Pending"),
            ("running", "Running"),
            ("done", "Done"),
            ("skipped", "Skipped (no API key)"),
            ("error", "Error"),
        ),
    )
    extraction_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"]),
            models.Index(fields=["owner", "extraction_status"]),
        ]

    def __str__(self) -> str:
        return self.content_markdown[:60]


class PersonJournalEntry(models.Model):
    person = models.ForeignKey("people.Person", on_delete=models.CASCADE)
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE)

    class Meta:
        unique_together = [("person", "entry")]
