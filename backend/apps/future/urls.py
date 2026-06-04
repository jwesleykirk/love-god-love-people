from django.urls import path

from .views import (
    FlashcardQueueView,
    FlashcardReviewView,
    FlashcardSuspendView,
    PrayerMarkView,
    PrayerQueueView,
    PrayerScheduleUpdateView,
    PrayerSchedulesView,
)

flashcard_urlpatterns = [
    path("queue/", FlashcardQueueView.as_view(), name="flashcard-queue"),
    path("<int:memo_id>/review/", FlashcardReviewView.as_view(), name="flashcard-review"),
    path("<int:memo_id>/suspend/", FlashcardSuspendView.as_view(), name="flashcard-suspend"),
]

prayer_urlpatterns = [
    path("queue/", PrayerQueueView.as_view(), name="prayer-queue"),
    path("schedules/", PrayerSchedulesView.as_view(), name="prayer-schedules"),
    path(
        "schedules/<int:person_id>/",
        PrayerScheduleUpdateView.as_view(),
        name="prayer-schedule-update",
    ),
    path("<int:person_id>/prayed/", PrayerMarkView.as_view(), name="prayer-mark"),
]
