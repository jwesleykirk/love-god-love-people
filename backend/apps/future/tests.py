from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.people.models import Person
from apps.properties.models import PersonProperty, PersonPropertyStatus, PropertyDef

from .models import PrayerFrequency, PrayerSchedule, ReviewMemo
from .services import apply_flashcard_rating, sync_review_memos, update_prayer_frequency


class FlashcardAndPrayerTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        me = self.client.get("/api/auth/me/").json()
        self.user_id = me["user"]["id"]

        self.person = Person.objects.create(
            owner_id=self.user_id,
            full_name="Karie Kirk",
            preferred_name="Karie",
            relationship_category="family",
        )
        pdef = PropertyDef.objects.create(
            owner_id=self.user_id,
            name="mother_name",
            topic="family",
        )
        self.pp = PersonProperty.objects.create(
            owner_id=self.user_id,
            person=self.person,
            property_def=pdef,
            value_text="Linda",
            status=PersonPropertyStatus.APPROVED,
        )

    def test_sync_creates_review_memo(self):
        created = sync_review_memos(self.person.owner)
        self.assertEqual(created, 1)
        self.assertTrue(ReviewMemo.objects.filter(person_property=self.pp).exists())

    def test_flashcard_queue_and_review(self):
        sync_review_memos(self.person.owner)
        queue = self.client.get("/api/flashcards/queue/").json()
        self.assertEqual(queue["stats"]["due_count"], 1)
        memo_id = queue["due"][0]["id"]
        resp = self.client.post(
            f"/api/flashcards/{memo_id}/review/",
            {"rating": "good"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        memo = ReviewMemo.objects.get(pk=memo_id)
        self.assertGreater(memo.interval_days, 0)
        self.assertIsNotNone(memo.due_at)

    def test_apply_flashcard_rating_again_resets_interval(self):
        memo = ReviewMemo.objects.create(
            person_property=self.pp,
            interval_days=10,
            ease_factor=2.0,
            due_at=timezone.now(),
        )
        apply_flashcard_rating(memo, "again")
        memo.refresh_from_db()
        self.assertEqual(memo.interval_days, 1)

    def test_prayer_schedule_and_mark(self):
        schedule = PrayerSchedule.objects.create(
            owner_id=self.user_id,
            person=self.person,
            frequency=PrayerFrequency.DAILY,
            next_due_at=timezone.now(),
        )
        update_prayer_frequency(schedule, PrayerFrequency.WEEKLY)
        schedule.refresh_from_db()
        self.assertEqual(schedule.frequency, PrayerFrequency.WEEKLY)

        resp = self.client.post(f"/api/prayer/{self.person.pk}/prayed/")
        self.assertEqual(resp.status_code, 200)
        schedule.refresh_from_db()
        self.assertIsNotNone(schedule.last_prayed_at)

    def test_prayer_queue_lists_due(self):
        PrayerSchedule.objects.create(
            owner_id=self.user_id,
            person=self.person,
            frequency=PrayerFrequency.DAILY,
            next_due_at=timezone.now(),
        )
        data = self.client.get("/api/prayer/queue/").json()
        self.assertEqual(data["stats"]["due_count"], 1)
        self.assertEqual(data["due"][0]["person_name"], "Karie")

    def test_prayer_session_and_complete(self):
        PrayerSchedule.objects.create(
            owner_id=self.user_id,
            person=self.person,
            frequency=PrayerFrequency.DAILY,
            next_due_at=timezone.now(),
        )
        session = self.client.get("/api/prayer/session/").json()
        self.assertEqual(len(session["segments"]), 1)
        self.assertIn("intro", session)
        self.assertTrue(session["segments"][0]["guided_text"])

        complete = self.client.post(
            "/api/prayer/session/complete/",
            {"person_ids": [self.person.pk]},
            format="json",
        ).json()
        self.assertEqual(complete["count"], 1)
        schedule = PrayerSchedule.objects.get(person=self.person)
        self.assertIsNotNone(schedule.last_prayed_at)

    def test_deceased_person_gets_remembrance_not_future_tense(self):
        from datetime import date

        self.person.deceased_at = date(2020, 1, 1)
        self.person.save(update_fields=["deceased_at"])
        PrayerSchedule.objects.create(
            owner_id=self.user_id,
            person=self.person,
            frequency=PrayerFrequency.DAILY,
            next_due_at=timezone.now(),
        )
        session = self.client.get("/api/prayer/session/").json()
        self.assertEqual(len(session["segments"]), 1)
        text = session["segments"][0]["guided_text"].lower()
        self.assertIn("thank you for the life", text)
        self.assertNotIn("days ahead", text)
