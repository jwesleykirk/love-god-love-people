from django.test import TestCase

from apps.guide.services.scheduler import select_topics_for_session
from apps.prayer.models import PrayerTopic, TargetFrequency


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
