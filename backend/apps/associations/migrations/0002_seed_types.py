"""Seed the AssociationType catalog (locked in _docs/data-model-v2.md)."""
from django.db import migrations


SEEDED = [
    # love
    ("spouse_of", "spouse_of", True, "love", "Married to this person.", 10),
    ("engaged_to", "engaged_to", True, "love", "Betrothed to marry.", 11),
    ("dating", "dating", True, "love", "In a romantic relationship.", 12),
    ("ex_spouse_of", "ex_spouse_of", True, "love", "Previously married to this person.", 13),
    # family
    ("parent_of", "child_of", False, "family", "Has given birth to or raised this person.", 20),
    ("child_of", "parent_of", False, "family", "Was raised by this person.", 21),
    ("sibling_of", "sibling_of", True, "family", "Shares a parent with this person.", 22),
    ("grandparent_of", "grandchild_of", False, "family", "Parent of this person's parent.", 23),
    ("grandchild_of", "grandparent_of", False, "family", "Grandchild of this person.", 24),
    ("in_law_of", "in_law_of", True, "family", "Related by marriage.", 25),
    ("step_parent_of", "step_child_of", False, "family", "Step-parent of this person.", 26),
    ("step_child_of", "step_parent_of", False, "family", "Step-child of this person.", 27),
    # friend
    ("close_friend_of", "close_friend_of", True, "friend", "Close mutual friendship.", 30),
    ("friend_of", "friend_of", True, "friend", "Mutual friendship.", 31),
    ("neighbor_of", "neighbor_of", True, "friend", "Lives nearby.", 32),
    # work
    ("manages", "reports_to", False, "work", "Manages this person at work.", 40),
    ("reports_to", "manages", False, "work", "Direct or matrix report.", 41),
    ("mentor_of", "mentee_of", False, "work", "Trusted counselor/teacher to this person.", 42),
    ("mentee_of", "mentor_of", False, "work", "Mentored by this person.", 43),
    # ministry
    ("disciples", "discipled_by", False, "ministry", "Discipling this person.", 50),
    ("discipled_by", "disciples", False, "ministry", "Discipled by this person.", 51),
]


def seed(apps, schema_editor):
    AssociationType = apps.get_model("associations", "AssociationType")
    for name, inverse, sym, cat, desc, sort_order in SEEDED:
        AssociationType.objects.update_or_create(
            name=name,
            defaults={
                "inverse_name": inverse,
                "is_symmetric": sym,
                "category": cat,
                "description": desc,
                "system": True,
                "sort_order": sort_order,
            },
        )


def unseed(apps, schema_editor):
    AssociationType = apps.get_model("associations", "AssociationType")
    AssociationType.objects.filter(system=True).delete()


class Migration(migrations.Migration):
    dependencies = [("associations", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
