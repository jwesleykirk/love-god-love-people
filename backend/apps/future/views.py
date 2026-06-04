"""Flashcards (Phase 2) and prayer queue (Phase 3) APIs."""
from __future__ import annotations

from datetime import datetime, timezone as dt_tz

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.people.models import Person
from apps.properties.models import PersonProperty, PersonPropertyStatus

from .models import PrayerFrequency, PrayerSchedule, ReviewMemo
from .services import (
    RATING_AGAIN,
    RATING_EASY,
    RATING_GOOD,
    apply_flashcard_rating,
    ensure_prayer_schedule,
    is_meaningful_value,
    mark_prayed,
    sync_review_memos,
    update_prayer_frequency,
)


def _person_display(person: Person) -> str:
    return person.preferred_name.strip() or person.full_name


def _format_property_label(name: str) -> str:
    return name.replace("_", " ")


class FlashcardQueueView(APIView):
    """GET /api/flashcards/queue/ — due cards and deck stats."""

    def get(self, request):
        owner = request.user
        sync_review_memos(owner)
        now = timezone.now()

        memos = (
            ReviewMemo.objects.filter(
                person_property__owner=owner,
                suspended=False,
            )
            .select_related(
                "person_property__person",
                "person_property__property_def",
            )
            .order_by("due_at", "pk")
        )

        due = [m for m in memos if m.due_at and m.due_at <= now]
        upcoming = [m for m in memos if m.due_at and m.due_at > now]

        def serialize_memo(m: ReviewMemo, *, due_flag: bool) -> dict:
            pp = m.person_property
            person = pp.person
            return {
                "id": m.pk,
                "person_property_id": pp.pk,
                "due_at": m.due_at.isoformat() if m.due_at else None,
                "due": due_flag,
                "interval_days": m.interval_days,
                "person_id": person.pk,
                "person_name": _person_display(person),
                "person_category": person.relationship_category,
                "property_name": pp.property_def.name,
                "property_label": _format_property_label(pp.property_def.name),
                "property_topic": pp.property_def.topic,
                "prompt": f"Who is {person.preferred_name or person.full_name}'s {_format_property_label(pp.property_def.name)}?",
                "answer": pp.value_text.strip(),
            }

        return Response(
            {
                "due": [serialize_memo(m, due_flag=True) for m in due],
                "upcoming": [serialize_memo(m, due_flag=False) for m in upcoming[:12]],
                "stats": {
                    "due_count": len(due),
                    "deck_count": memos.count(),
                    "upcoming_count": len(upcoming),
                },
                "fetched_at": datetime.now(dt_tz.utc).isoformat(),
            }
        )


class FlashcardReviewView(APIView):
    """POST /api/flashcards/<memo_id>/review/ — body: { rating: again|good|easy }"""

    def post(self, request, memo_id: int):
        rating = (request.data.get("rating") or RATING_GOOD).lower()
        if rating not in (RATING_AGAIN, RATING_GOOD, RATING_EASY):
            return Response(
                {"error": "rating must be again, good, or easy"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            memo = ReviewMemo.objects.select_related(
                "person_property__person",
                "person_property__property_def",
            ).get(
                pk=memo_id,
                person_property__owner=request.user,
                suspended=False,
            )
        except ReviewMemo.DoesNotExist:
            return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)

        apply_flashcard_rating(memo, rating)
        pp = memo.person_property
        return Response(
            {
                "id": memo.pk,
                "due_at": memo.due_at.isoformat() if memo.due_at else None,
                "interval_days": memo.interval_days,
                "person_name": _person_display(pp.person),
                "property_label": _format_property_label(pp.property_def.name),
                "answer": pp.value_text.strip(),
            }
        )


class FlashcardSuspendView(APIView):
    """POST /api/flashcards/<memo_id>/suspend/ — remove from active deck."""

    def post(self, request, memo_id: int):
        updated = ReviewMemo.objects.filter(
            pk=memo_id,
            person_property__owner=request.user,
        ).update(suspended=True)
        if not updated:
            return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"ok": True})


class PrayerQueueView(APIView):
    """GET /api/prayer/queue/ — people due for prayer today."""

    def get(self, request):
        owner = request.user
        now = timezone.now()

        people = Person.objects.filter(owner=owner, archived=False).order_by("full_name")
        schedules = {
            s.person_id: s
            for s in PrayerSchedule.objects.filter(owner=owner).select_related("person")
        }

        due_cards = []
        all_scheduled = []

        for person in people:
            schedule = schedules.get(person.pk)
            if not schedule or schedule.frequency == PrayerFrequency.NONE:
                continue
            all_scheduled.append(schedule)
            is_due = schedule.next_due_at is None or schedule.next_due_at <= now
            if not is_due:
                continue

            prompts = self._prayer_prompts(owner, person)
            due_cards.append(
                {
                    "person_id": person.pk,
                    "person_name": _person_display(person),
                    "full_name": person.full_name,
                    "relationship_category": person.relationship_category,
                    "frequency": schedule.frequency,
                    "last_prayed_at": (
                        schedule.last_prayed_at.isoformat()
                        if schedule.last_prayed_at
                        else None
                    ),
                    "next_due_at": (
                        schedule.next_due_at.isoformat() if schedule.next_due_at else None
                    ),
                    "prompts": prompts,
                }
            )

        return Response(
            {
                "due": due_cards,
                "stats": {
                    "due_count": len(due_cards),
                    "scheduled_count": len(all_scheduled),
                },
                "fetched_at": datetime.now(dt_tz.utc).isoformat(),
            }
        )

    def _prayer_prompts(self, owner, person: Person, limit: int = 4) -> list[str]:
        rows = (
            PersonProperty.objects.filter(
                owner=owner,
                person=person,
                status__in=(
                    PersonPropertyStatus.APPROVED,
                    PersonPropertyStatus.EDITED,
                ),
            )
            .select_related("property_def")
            .order_by("-reviewed_at", "-created_at")[:limit]
        )
        prompts = []
        for pp in rows:
            if not is_meaningful_value(pp.value_text):
                continue
            label = _format_property_label(pp.property_def.name)
            prompts.append(f"{label}: {pp.value_text.strip()}")
        if person.notes_markdown.strip():
            snippet = person.notes_markdown.strip().split("\n")[0][:120]
            prompts.append(snippet)
        return prompts[:limit]


class PrayerMarkView(APIView):
    """POST /api/prayer/<person_id>/prayed/"""

    def post(self, request, person_id: int):
        try:
            person = Person.objects.get(pk=person_id, owner=request.user)
        except Person.DoesNotExist:
            return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)

        schedule = ensure_prayer_schedule(request.user, person)
        if schedule.frequency == PrayerFrequency.NONE:
            return Response(
                {"error": "set a prayer frequency first"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mark_prayed(schedule)
        return Response(
            {
                "person_id": person.pk,
                "last_prayed_at": schedule.last_prayed_at.isoformat(),
                "next_due_at": (
                    schedule.next_due_at.isoformat() if schedule.next_due_at else None
                ),
            }
        )


class PrayerSchedulesView(APIView):
    """GET /api/prayer/schedules/ — all people with optional schedule rows."""

    def get(self, request):
        owner = request.user
        people = Person.objects.filter(owner=owner, archived=False).order_by("full_name")
        by_person = {
            s.person_id: s
            for s in PrayerSchedule.objects.filter(owner=owner).select_related("person")
        }
        rows = []
        for person in people:
            schedule = by_person.get(person.pk)
            rows.append(
                {
                    "person_id": person.pk,
                    "person_name": _person_display(person),
                    "relationship_category": person.relationship_category,
                    "frequency": (
                        schedule.frequency if schedule else PrayerFrequency.NONE
                    ),
                    "last_prayed_at": (
                        schedule.last_prayed_at.isoformat()
                        if schedule and schedule.last_prayed_at
                        else None
                    ),
                    "next_due_at": (
                        schedule.next_due_at.isoformat()
                        if schedule and schedule.next_due_at
                        else None
                    ),
                }
            )
        return Response({"schedules": rows})


class PrayerScheduleUpdateView(APIView):
    """PATCH /api/prayer/schedules/<person_id>/ — body: { frequency }"""

    def patch(self, request, person_id: int):
        frequency = request.data.get("frequency")
        if frequency not in PrayerFrequency.values:
            return Response(
                {"error": "invalid frequency"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            person = Person.objects.get(pk=person_id, owner=request.user)
        except Person.DoesNotExist:
            return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)

        schedule = ensure_prayer_schedule(request.user, person)
        update_prayer_frequency(schedule, frequency)
        return Response(
            {
                "person_id": person.pk,
                "frequency": schedule.frequency,
                "next_due_at": (
                    schedule.next_due_at.isoformat() if schedule.next_due_at else None
                ),
            }
        )
