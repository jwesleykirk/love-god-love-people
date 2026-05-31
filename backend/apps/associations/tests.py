from django.test import TestCase
from rest_framework.test import APIClient


class AssociationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.get("/api/auth/me/")

    def test_spouse_creates_paired_rows(self):
        wes = self.client.post(
            "/api/people/",
            {"full_name": "Wesley", "relationship_category": "family"},
            format="json",
        ).json()
        karie = self.client.post(
            "/api/people/",
            {"full_name": "Karie", "relationship_category": "family"},
            format="json",
        ).json()

        types = self.client.get("/api/association-types/?category=love").json()["results"]
        spouse_type = next(t for t in types if t["name"] == "spouse_of")

        resp = self.client.post(
            "/api/person-associations/",
            {"from_person": wes["id"], "to_person": karie["id"], "association_type": spouse_type["id"]},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        listing = self.client.get("/api/person-associations/").json()
        self.assertEqual(listing["count"], 2)

    def test_self_association_rejected(self):
        wes = self.client.post(
            "/api/people/",
            {"full_name": "Wesley", "relationship_category": "family"},
            format="json",
        ).json()
        types = self.client.get("/api/association-types/").json()["results"]
        any_type = types[0]
        resp = self.client.post(
            "/api/person-associations/",
            {"from_person": wes["id"], "to_person": wes["id"], "association_type": any_type["id"]},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
