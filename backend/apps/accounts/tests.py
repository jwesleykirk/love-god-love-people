from django.test import TestCase, Client


class MeEndpointTests(TestCase):
    def test_me_returns_authenticated_under_fixture_user(self):
        # ENABLE_AUTH is False in test settings — FixtureUserMiddleware logs in
        # the fixture user automatically.
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["authenticated"])
        self.assertIn("user", payload)
