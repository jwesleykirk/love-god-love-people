from django.test import TestCase
from rest_framework.test import APIClient

from .models import JournalEntry


class EntryCrudTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.get("/api/auth/me/")

    def test_create_entry_with_person_and_org_tags(self):
        person_resp = self.client.post(
            "/api/people/",
            {"full_name": "Karie", "relationship_category": "family"},
            format="json",
        )
        self.assertEqual(person_resp.status_code, 201)
        person_id = person_resp.json()["id"]

        org_resp = self.client.post(
            "/api/organizations/",
            {"name": "Compass", "org_type": "church"},
            format="json",
        )
        self.assertEqual(org_resp.status_code, 201)
        org_id = org_resp.json()["id"]

        entry_resp = self.client.post(
            "/api/entries/",
            {
                "content_markdown": "Karie and I went to Compass on Sunday.",
                "person_ids": [person_id],
                "organization_ids": [org_id],
            },
            format="json",
        )
        self.assertEqual(entry_resp.status_code, 201, entry_resp.content)
        body = entry_resp.json()
        self.assertIn(person_id, body["person_id_list"])
        self.assertIn(org_id, body["organization_id_list"])
        entry = JournalEntry.objects.get(pk=body["id"])
        self.assertEqual(entry.extraction_status, "skipped")
