"""Example feature models.

Replace with real models when building a feature. Keeping a tiny model here so
the migrations directory has something to migrate end-to-end on day one.
"""
from django.db import models


class Note(models.Model):
    """Trivial example model — proves the DB connection and migration path."""

    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.body[:50]
