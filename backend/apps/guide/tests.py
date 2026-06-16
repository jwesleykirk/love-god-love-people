from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.guide.services.scheduler import select_topics_for_session
from apps.guide.services.segments import PAUSE_AFTER_SEGMENT_KEYS, POST_DBR_KEYS
from apps.prayer.models import PrayerTopic, TargetFrequency


class GuideReadinessOpsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_post_compile_requires_ops_token(self):
        response = self.client.post("/api/guide/readiness/")
        self.assertEqual(response.status_code, 403)

    @override_settings(GUIDE_OPS_TOKEN="test-token")
    @patch("apps.guide.tasks.compile_daily_guides")
    def test_post_compile_accepts_valid_ops_token(self, compile_daily_guides):
        response = self.client.post(
            "/api/guide/readiness/",
            HTTP_X_GUIDE_OPS_TOKEN="test-token",
        )
        compile_daily_guides.assert_called_once()
        self.assertIn(response.status_code, {200, 503})


class SegmentPauseTests(TestCase):
    def test_reflection_prompts_pause_after_playback(self):
        reflection_keys = {
            "goodness_truth_beauty",
            "reading_challenges",
            "help_today",
        }
        self.assertEqual(PAUSE_AFTER_SEGMENT_KEYS, reflection_keys)
        for key in PAUSE_AFTER_SEGMENT_KEYS:
            self.assertIn(key, POST_DBR_KEYS)


class SchedulerTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        self.user = User.objects.create_user(username="wesley@local", email="wesley@local")

    def test_daily_always_included(self):
        from datetime import date

        t = PrayerTopic.objects.create(
            owner=self.user,
            topic_text="health",
            target_frequency=TargetFrequency.DAILY,
            narration_text="Pray for health",
        )
        selected = select_topics_for_session(self.user, date.today())
        self.assertIn(t, selected)
