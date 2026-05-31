"""Smoke test for the review endpoint."""
from django.test import TestCase
from rest_framework.test import APIClient


class ReviewSmokeTests(TestCase):
    def test_pending_values_endpoint_returns_200(self):
        client = APIClient()
        client.get("/api/auth/me/")
        resp = client.get("/api/review/pending-values/")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn("entries", body)
        self.assertIn("errors", body)
