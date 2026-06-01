"""Seed prayer/core PropertyDefs for upcoming Phase 2/3 features.

Adds a small starter set that the prayer queue and recall workflows can
depend on as stable names.
"""
from django.db import migrations


PRAYER_AND_CORE_DEFS = [
    (
        "loves_music",
        "boolean",
        "Whether the person loves music.",
    ),
    (
        "religion",
        "text",
        "Religious self-identification (e.g., Christian, nominal Christian, Catholic, agnostic).",
    ),
    (
        "current_prayer_requests",
        "text",
        "Current prayer requests this person has shared.",
    ),
    (
        "current_stressors",
        "text",
        "Current stressors this person is carrying right now.",
    ),
    (
        "upcoming_life_events",
        "text",
        "Upcoming events this person is looking forward to or dreading.",
    ),
    (
        "health_concerns",
        "text",
        "Current health concerns, diagnoses, treatments, or medical worries.",
    ),
    (
        "family_concerns",
        "text",
        "Current family-related burdens, conflicts, or care concerns.",
    ),
    (
        "spiritual_state",
        "text",
        "Observed current spiritual season (e.g., growing, doubtful, discouraged, newly engaged).",
    ),
]


def seed(apps, schema_editor):
    User = apps.get_model("auth", "User")
    PropertyDef = apps.get_model("properties", "PropertyDef")
    for user in User.objects.all():
        for name, data_type, description in PRAYER_AND_CORE_DEFS:
            PropertyDef.objects.get_or_create(
                owner=user,
                name=name,
                defaults={
                    "description": description,
                    "data_type_hint": data_type,
                    "status": "active",
                    "ai_confidence_on_creation": 1.0,
                },
            )


def unseed(apps, schema_editor):
    PropertyDef = apps.get_model("properties", "PropertyDef")
    PropertyDef.objects.filter(
        name__in=[name for name, _, _ in PRAYER_AND_CORE_DEFS]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("properties", "0003_seed_standard_property_defs"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [migrations.RunPython(seed, unseed)]
