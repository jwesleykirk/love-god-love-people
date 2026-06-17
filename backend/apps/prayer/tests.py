from django.contrib.auth import get_user_model
from django.test import override_settings
from django.test import TestCase
from unittest.mock import patch

from apps.groups.models import Group
from apps.people.models import Person
from .models import PrayerTopic, TargetFrequency


class PrayerTopicTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="wesley@local", email="wesley@local")

    def test_create_topic(self):
        self.client.force_login(self.user)
        response = self.client.post(
            "/api/prayer/topics/",
            data={"topic_text": "career direction", "target_frequency": TargetFrequency.WEEKLY},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        topic = PrayerTopic.objects.get()
        self.assertFalse(topic.narration_generated)

    @override_settings(OPENROUTER_API_KEY="test-key")
    @patch("requests.post")
    def test_import_preview_returns_ai_suggestions_with_owner_matches(self, mock_post):
        self.client.force_login(self.user)
        person = Person.objects.create(owner=self.user, name="Sarah")
        group = Group.objects.create(owner=self.user, name="Young Adults")
        mock_post.return_value.ok = True
        mock_post.return_value.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"topics": ['
                            '{"name": "Sarah", "kind": "person", "request": "job interview", "frequency": "weekly"},'
                            '{"name": "Young Adults", "kind": "group", "request": "retreat planning", "frequency": "monthly"}'
                            "]}"
                        )
                    }
                }
            ]
        }

        response = self.client.post(
            "/api/prayer/import/preview/",
            data={"text": "Sarah - job interview\nYoung Adults - retreat planning"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["suggestions"]), 2)
        self.assertEqual(response.json()["suggestions"][0]["person_id"], person.id)
        self.assertEqual(response.json()["suggestions"][1]["group_id"], group.id)

    @override_settings(OPENROUTER_API_KEY="")
    def test_import_preview_requires_openrouter(self):
        self.client.force_login(self.user)

        response = self.client.post(
            "/api/prayer/import/preview/",
            data={"text": "Sarah - job interview"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 503)

    @patch("django_q.tasks.async_task")
    def test_import_commit_creates_confirmed_topics(self, mock_async_task):
        self.client.force_login(self.user)
        person = Person.objects.create(owner=self.user, name="Sarah")

        response = self.client.post(
            "/api/prayer/import/commit/",
            data={
                "topics": [
                    {
                        "topic_text": "job interview",
                        "target_frequency": TargetFrequency.WEEKLY,
                        "person_id": person.id,
                        "group_id": None,
                    },
                    {
                        "topic_text": "wisdom for the church",
                        "target_frequency": TargetFrequency.DAILY,
                        "person_id": None,
                        "group_id": None,
                    },
                ]
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(PrayerTopic.objects.count(), 2)
        self.assertEqual(PrayerTopic.objects.filter(person=person).count(), 1)
        self.assertEqual(mock_async_task.call_count, 2)
