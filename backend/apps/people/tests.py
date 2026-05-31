from django.test import TestCase
from rest_framework.test import APIClient


class PersonCrudTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.get("/api/auth/me/")

    def test_create_and_list(self):
        resp = self.client.post(
            "/api/people/",
            {"full_name": "Karie Kirk", "relationship_category": "family"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        listing = self.client.get("/api/people/").json()
        self.assertEqual(listing["count"], 1)

    def test_create_with_life_stage_and_birthday(self):
        resp = self.client.post(
            "/api/people/",
            {
                "full_name": "Oliver Kirk",
                "relationship_category": "family",
                "life_stage": "toddler",
                "birthday": "2025-02-25",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        body = resp.json()
        self.assertEqual(body["life_stage"], "toddler")
        self.assertEqual(body["birthday"], "2025-02-25")
