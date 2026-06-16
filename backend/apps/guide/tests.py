from django.test import TestCase

from apps.guide.services.scheduler import select_topics_for_session
from apps.guide.services.segments import PAUSE_AFTER_SEGMENT_KEYS, POST_DBR_KEYS
from apps.prayer.models import PrayerTopic, TargetFrequency


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
