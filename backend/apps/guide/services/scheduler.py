"""Prayer topic scheduling."""
from __future__ import annotations

import calendar
from datetime import date, timedelta

from apps.prayer.models import PrayerTopic, TargetFrequency

SCHEDULED_CAP = 5


def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _month_days(d: date) -> list[date]:
    _, num_days = calendar.monthrange(d.year, d.month)
    return [date(d.year, d.month, day) for day in range(1, num_days + 1)]


def _week_days(d: date) -> list[date]:
    start = _week_start(d)
    return [start + timedelta(days=i) for i in range(7)]


def assign_initial_schedule(topic: PrayerTopic, today: date | None = None) -> None:
    today = today or date.today()
    if topic.target_frequency == TargetFrequency.DAILY:
        topic.next_scheduled_date = today
    elif topic.target_frequency == TargetFrequency.WEEKLY:
        days = _week_days(today)
        idx = topic.id % len(days) if topic.id else 0
        topic.next_scheduled_date = days[idx]
    else:
        days = _month_days(today)
        idx = topic.id % len(days) if topic.id else 0
        topic.next_scheduled_date = days[idx]
    topic.save(update_fields=["next_scheduled_date"])


def redistribute_weekly(topics: list[PrayerTopic], today: date) -> None:
    days = _week_days(today)
    remaining = [d for d in days if d >= today]
    if not remaining:
        return
    for i, topic in enumerate(topics):
        topic.next_scheduled_date = remaining[i % len(remaining)]
        topic.save(update_fields=["next_scheduled_date"])


def redistribute_monthly(topics: list[PrayerTopic], today: date) -> None:
    days = [d for d in _month_days(today) if d >= today]
    if not days:
        return
    for i, topic in enumerate(topics):
        topic.next_scheduled_date = days[i % len(days)]
        topic.save(update_fields=["next_scheduled_date"])


def select_topics_for_session(owner, today: date) -> list[PrayerTopic]:
    active = PrayerTopic.objects.filter(owner=owner, answered_date__isnull=True)
    daily = list(active.filter(target_frequency=TargetFrequency.DAILY))

    due_scheduled = list(
        active.exclude(target_frequency=TargetFrequency.DAILY)
        .filter(next_scheduled_date__lte=today)
        .exclude(last_prayed_at=today)
        .order_by("next_scheduled_date", "id")
    )

    selected_scheduled = due_scheduled[:SCHEDULED_CAP]
    overflow = due_scheduled[SCHEDULED_CAP:]

    weekly_overflow = [t for t in overflow if t.target_frequency == TargetFrequency.WEEKLY]
    monthly_overflow = [t for t in overflow if t.target_frequency == TargetFrequency.MONTHLY]
    if weekly_overflow:
        redistribute_weekly(weekly_overflow, today)
    if monthly_overflow:
        redistribute_monthly(monthly_overflow, today)

    return daily + selected_scheduled


def reschedule_after_prayer(topic: PrayerTopic, prayed_date: date) -> None:
    if topic.answered_date:
        return
    if topic.target_frequency == TargetFrequency.DAILY:
        topic.next_scheduled_date = prayed_date + timedelta(days=1)
    elif topic.target_frequency == TargetFrequency.WEEKLY:
        topic.next_scheduled_date = prayed_date + timedelta(days=7)
    else:
        _, num_days = calendar.monthrange(prayed_date.year, prayed_date.month)
        if prayed_date.day < num_days:
            topic.next_scheduled_date = prayed_date + timedelta(days=max(1, num_days // 4))
        else:
            next_month = prayed_date.month % 12 + 1
            year = prayed_date.year + (1 if prayed_date.month == 12 else 0)
            topic.next_scheduled_date = date(year, next_month, 1)
    topic.save(update_fields=["next_scheduled_date"])
