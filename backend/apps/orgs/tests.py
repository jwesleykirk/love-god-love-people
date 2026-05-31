from django.test import TestCase
from rest_framework.test import APIClient


class OrgsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.get("/api/auth/me/")

    def test_create_and_nest_orgs(self):
        compass = self.client.post(
            "/api/organizations/",
            {"name": "Compass Bible Church", "org_type": "church"},
            format="json",
        )
        self.assertEqual(compass.status_code, 201, compass.content)
        bridge = self.client.post(
            "/api/organizations/",
            {"name": "Bridge College Ministry", "org_type": "ministry", "parent": compass.json()["id"]},
            format="json",
        )
        self.assertEqual(bridge.status_code, 201, bridge.content)
        small_group = self.client.post(
            "/api/organizations/",
            {"name": "My Small Group", "org_type": "ministry", "parent": bridge.json()["id"]},
            format="json",
        )
        self.assertEqual(small_group.status_code, 201, small_group.content)

    def test_cycle_prevention(self):
        a = self.client.post("/api/organizations/", {"name": "A", "org_type": "other"}, format="json").json()
        b = self.client.post(
            "/api/organizations/",
            {"name": "B", "org_type": "other", "parent": a["id"]},
            format="json",
        ).json()
        # Try to make A a child of B (cycle)
        resp = self.client.patch(f"/api/organizations/{a['id']}/", {"parent": b["id"]}, format="json")
        self.assertEqual(resp.status_code, 400, resp.content)
