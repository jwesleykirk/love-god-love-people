"""Seed standard PropertyDefs (locked in v0.3 scope).

Seeded for every existing User. Idempotent — re-running the migration
is safe because we use get_or_create on (owner, name).
"""
from django.db import migrations


STANDARD_DEFS = [
    ("current_school_type", "text", "Type of school the person currently attends (Lutheran, public, private, homeschool, Christian, etc.)."),
    ("current_school_name", "text", "Name of the school the person currently attends."),
    ("approximate_birth_year", "text", "Approximate birth year or year-range (e.g., '2017-2018') when exact birthday is unknown. Superseded automatically when Person.birthday is set."),
]


def seed(apps, schema_editor):
    User = apps.get_model("auth", "User")
    PropertyDef = apps.get_model("properties", "PropertyDef")
    for user in User.objects.all():
        for name, dtype, desc in STANDARD_DEFS:
            PropertyDef.objects.get_or_create(
                owner=user,
                name=name,
                defaults={
                    "description": desc,
                    "data_type_hint": dtype,
                    "status": "active",
                    "ai_confidence_on_creation": 1.0,
                    "system": True if hasattr(PropertyDef, "system") else False,
                } if False else {
                    "description": desc,
                    "data_type_hint": dtype,
                    "status": "active",
                    "ai_confidence_on_creation": 1.0,
                },
            )


def unseed(apps, schema_editor):
    PropertyDef = apps.get_model("properties", "PropertyDef")
    PropertyDef.objects.filter(
        name__in=[name for name, _, _ in STANDARD_DEFS]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("properties", "0002_alter_personproperty_status_historicalpersonproperty_and_more"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]
    operations = [migrations.RunPython(seed, unseed)]
