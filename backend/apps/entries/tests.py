from django.test import TestCase
from rest_framework.test import APIClient

from apps.people.models import Person, RelationshipCategory

from .models import JournalEntry


class EntryCrudTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Hit /api/auth/me/ once to create the fixture user via middleware.
        self.client.get("/api/auth/me/")

    def test_create_entry_with_tagged_person(self):
        # Create a person first
        person_resp = self.client.post(
            "/api/people/",
            {"full_name": "Karie", "relationship_category": RelationshipCategory.FAMILY},
            format="json",
        )
        self.assertEqual(person_resp.status_code, 201)
        person_id = person_resp.json()["id"]

        # Create an entry tagged to that person
        entry_resp = self.client.post(
            "/api/entries/",
            {"content_markdown": "Walked with Karie tonight.", "person_ids": [person_id]},
            format="json",
        )
        self.assertEqual(entry_resp.status_code, 201, entry_resp.content)
        body = entry_resp.json()
        self.assertIn(person_id, body["person_id_list"])
        # No OPENROUTER_API_KEY in tests, so extraction is skipped.
        entry = JournalEntry.objects.get(pk=body["id"])
        self.assertEqual(entry.extraction_status, "skipped")
