from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Group


class GroupApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="wesley@local", email="wesley@local")

    def test_create_group(self):
        self.client.force_login(self.user)
        response = self.client.post(
            "/api/groups/",
            data={"name": "Small Group"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Group.objects.count(), 1)
