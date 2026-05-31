from django.test import TestCase
from rest_framework.test import APIClient

from .models import Person, RelationshipCategory


class PersonCrudTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_and_list(self):
        resp = self.client.post(
            "/api/people/",
            {"full_name": "Karie Kirk", "relationship_category": RelationshipCategory.FAMILY},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        listing = self.client.get("/api/people/").json()
        self.assertEqual(listing["count"], 1)
        self.assertEqual(listing["results"][0]["full_name"], "Karie Kirk")
        self.assertEqual(Person.objects.count(), 1)
