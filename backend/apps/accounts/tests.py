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


class IOSAuthCompleteTests(TestCase):
    def test_ios_auth_complete_redirects_to_custom_scheme(self):
        response = self.client.get("/accounts/ios-auth-complete/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "lglp://auth-complete")
