"""Extraction unit tests — exercise the persistence path without hitting OpenRouter."""
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.entries.models import JournalEntry, PersonJournalEntry
from apps.people.models import Person, RelationshipCategory
from apps.properties.models import (
    PersonProperty,
    PersonPropertyStatus,
    PropertyDef,
)

from .tasks import _persist_extraction


class PersistenceTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create(username="wesley@local", email="wesley@local")
        self.person = Person.objects.create(
            owner=self.user,
            full_name="Karie",
            relationship_category=RelationshipCategory.FAMILY,
        )
        self.entry = JournalEntry.objects.create(
            owner=self.user,
            content_markdown="Karie's mom is named Linda. Her birthday is in April.",
        )
        PersonJournalEntry.objects.create(person=self.person, entry=self.entry)

    def test_persist_new_property_proposals(self):
        result = {
            "narrative_only": False,
            "existing_property_values": [],
            "new_property_proposals": [
                {
                    "person_id": self.person.pk,
                    "proposed_name": "mother_name",
                    "proposed_description": "First name of this person's mother.",
                    "proposed_data_type": "text",
                    "value": "Linda",
                    "confidence": 0.9,
                },
                {
                    "person_id": self.person.pk,
                    "proposed_name": "birthday_month",
                    "proposed_description": "The month this person was born.",
                    "proposed_data_type": "text",
                    "value": "April",
                    "confidence": 0.7,
                },
            ],
        }
        _persist_extraction(self.entry, result)
        self.assertEqual(PropertyDef.objects.count(), 2)
        self.assertEqual(PersonProperty.objects.count(), 2)
        for pp in PersonProperty.objects.all():
            self.assertEqual(pp.status, PersonPropertyStatus.PENDING_REVIEW)
            self.assertEqual(pp.source_entry_id, self.entry.pk)

    def test_persist_skips_untagged_persons(self):
        other = Person.objects.create(
            owner=self.user, full_name="Other", relationship_category=RelationshipCategory.OTHER
        )
        result = {
            "existing_property_values": [],
            "new_property_proposals": [
                {
                    "person_id": other.pk,  # NOT tagged on this entry
                    "proposed_name": "favorite_food",
                    "proposed_description": "x",
                    "proposed_data_type": "text",
                    "value": "ramen",
                    "confidence": 0.9,
                }
            ],
        }
        _persist_extraction(self.entry, result)
        self.assertEqual(PropertyDef.objects.count(), 0)  # untagged person → skip entirely
        # But no PersonProperty because the person wasn't tagged on the entry.
        self.assertEqual(
            PersonProperty.objects.filter(person=other).count(), 0
        )
