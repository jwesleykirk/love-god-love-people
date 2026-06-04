"""Spaced repetition and prayer scheduling (Phase 2 / 3)."""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.properties.models import PersonProperty, PersonPropertyStatus

from .models import PrayerFrequency, PrayerSchedule, ReviewMemo

MEANINGLESS_VALUES = frozenset({"", "null", "none", "n/a", "—"})

# Anki-style quality mapped to UI buttons
RATING_AGAIN = "again"
RATING_GOOD = "good"
RATING_EASY = "easy"


def is_meaningful_value(value_text: str | None) -> bool:
    if value_text is None:
        return False
    v = str(value_text).strip().lower()
    return len(v) > 0 and v not in MEANINGLESS_VALUES


def reviewable_properties_queryset(owner):
    return PersonProperty.objects.filter(
        owner=owner,
        status__in=(
            PersonPropertyStatus.APPROVED,
            PersonPropertyStatus.EDITED,
        ),
    ).select_related("person", "property_def")


def sync_review_memos(owner) -> int:
    """Ensure each meaningful approved property has a ReviewMemo. Returns count created."""
    created = 0
    now = timezone.now()
    for pp in reviewable_properties_queryset(owner):
        if not is_meaningful_value(pp.value_text):
            continue
        memo, was_created = ReviewMemo.objects.get_or_create(
            person_property=pp,
            defaults={"due_at": now, "interval_days": 1, "ease_factor": 2.5},
        )
        if was_created:
            created += 1
        elif memo.suspended:
            continue
        elif memo.due_at is None:
            memo.due_at = now
            memo.save(update_fields=["due_at"])
    return created


def apply_flashcard_rating(memo: ReviewMemo, rating: str) -> ReviewMemo:
    now = timezone.now()
    if rating == RATING_AGAIN:
        memo.interval_days = 1
        memo.ease_factor = max(1.3, memo.ease_factor - 0.2)
    elif rating == RATING_EASY:
        memo.interval_days = max(1, int(memo.interval_days * memo.ease_factor * 1.3))
        memo.ease_factor = min(2.5, memo.ease_factor + 0.15)
    else:  # good (default)
        memo.interval_days = max(1, int(memo.interval_days * memo.ease_factor))
    memo.due_at = now + timedelta(days=memo.interval_days)
    memo.save(update_fields=["interval_days", "ease_factor", "due_at"])
    return memo


def prayer_interval(frequency: str) -> timedelta | None:
    if frequency == PrayerFrequency.DAILY:
        return timedelta(days=1)
    if frequency == PrayerFrequency.WEEKLY:
        return timedelta(days=7)
    if frequency == PrayerFrequency.MONTHLY:
        return timedelta(days=30)
    return None


def compute_prayer_next_due(
    frequency: str,
    *,
    from_dt=None,
) -> timezone.datetime | None:
    delta = prayer_interval(frequency)
    if delta is None:
        return None
    base = from_dt or timezone.now()
    return base + delta


def ensure_prayer_schedule(owner, person) -> PrayerSchedule:
    schedule, _ = PrayerSchedule.objects.get_or_create(
        owner=owner,
        person=person,
        defaults={"frequency": PrayerFrequency.NONE},
    )
    return schedule


def mark_prayed(schedule: PrayerSchedule) -> PrayerSchedule:
    now = timezone.now()
    schedule.last_prayed_at = now
    schedule.next_due_at = compute_prayer_next_due(schedule.frequency, from_dt=now)
    schedule.save(update_fields=["last_prayed_at", "next_due_at"])
    return schedule


def update_prayer_frequency(schedule: PrayerSchedule, frequency: str) -> PrayerSchedule:
    schedule.frequency = frequency
    if frequency == PrayerFrequency.NONE:
        schedule.next_due_at = None
    elif schedule.last_prayed_at:
        schedule.next_due_at = compute_prayer_next_due(
            frequency, from_dt=schedule.last_prayed_at
        )
    else:
        schedule.next_due_at = timezone.now()
    schedule.save(update_fields=["frequency", "next_due_at"])
    return schedule
