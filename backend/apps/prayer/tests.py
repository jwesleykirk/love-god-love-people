from django.contrib.auth import get_user_model
from django.test import TestCase

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
