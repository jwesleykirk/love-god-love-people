from django.conf import settings
from django.db import models


class LifeStage(models.TextChoices):
    STUDENT = "student", "Student"
    SINGLE = "single", "Single"
    MARRIED = "married", "Married"
    ADULT = "adult", "Adult"


class Person(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="people",
    )
    name = models.CharField(max_length=255)
    life_stage = models.CharField(
        max_length=16,
        choices=LifeStage.choices,
        default=LifeStage.ADULT,
    )
    career = models.TextField(blank=True, default="")
    school = models.TextField(blank=True, default="")
    major = models.TextField(blank=True, default="")
    partner_name = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["owner", "name"])]

    def __str__(self) -> str:
        return self.name


class Child(models.Model):
    person = models.ForeignKey(
        Person,
        on_delete=models.CASCADE,
        related_name="children",
    )
    name = models.CharField(max_length=255)
    birthdate = models.DateField(null=True, blank=True)
    birth_year = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
