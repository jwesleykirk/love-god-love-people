from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PrayerLog, PrayerSession, PrayerTopic
from .serializers import (
    PrayerSessionListSerializer,
    PrayerSessionSerializer,
    PrayerTopicSerializer,
)


class PrayerTopicViewSet(viewsets.ModelViewSet):
    serializer_class = PrayerTopicSerializer

    def get_queryset(self):
        qs = PrayerTopic.objects.filter(owner=self.request.user).select_related("person", "group")
        if self.request.query_params.get("active") == "1":
            qs = qs.filter(answered_date__isnull=True)
        person_id = self.request.query_params.get("person")
        if person_id:
            qs = qs.filter(person_id=person_id)
        group_id = self.request.query_params.get("group")
        if group_id:
            qs = qs.filter(group_id=group_id)
        if self.request.query_params.get("general") == "1":
            qs = qs.filter(person__isnull=True, group__isnull=True)
        if self.request.query_params.get("has_person") == "1":
            qs = qs.filter(person__isnull=False)
        if self.request.query_params.get("has_group") == "1":
            qs = qs.filter(group__isnull=False)
        return qs

    def perform_create(self, serializer):
        topic = serializer.save(owner=self.request.user)
        from django_q.tasks import async_task

        async_task("apps.guide.tasks.generate_topic_narration", topic.id)

    def perform_update(self, serializer):
        topic = serializer.save()
        if not topic.narration_generated:
            from django_q.tasks import async_task

            async_task("apps.guide.tasks.generate_topic_narration", topic.id)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        topic = self.get_object()
        logs = PrayerLog.objects.filter(prayer_topic=topic).select_related("session").order_by(
            "-prayed_on"
        )
        data = [
            {
                "prayed_on": log.prayed_on.isoformat(),
                "answered": log.answered,
                "answer_note": log.answer_note,
                "session_id": log.session_id,
            }
            for log in logs
        ]
        return Response(data)


class PrayerSessionViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        return PrayerSession.objects.filter(owner=self.request.user).prefetch_related("logs__prayer_topic")

    def get_serializer_class(self):
        if self.action == "list":
            return PrayerSessionListSerializer
        return PrayerSessionSerializer


class SessionTopicActionView(APIView):
    """Mark a topic answered or record an answer note during post-session review."""

    def post(self, request, session_id: int, topic_id: int):
        session = PrayerSession.objects.get(pk=session_id, owner=request.user)
        topic = PrayerTopic.objects.get(pk=topic_id, owner=request.user)
        log, _ = PrayerLog.objects.get_or_create(
            session=session,
            prayer_topic=topic,
            defaults={"prayed_on": session.session_date},
        )
        action_type = request.data.get("action")
        if action_type == "answered":
            today = timezone.localdate()
            topic.answered_date = today
            topic.save(update_fields=["answered_date"])
            log.answered = True
            note = request.data.get("answer_note", "")
            if note:
                log.answer_note = note
                topic.answer_note = note
                topic.save(update_fields=["answer_note"])
            log.save()
        elif action_type == "record_answer":
            note = request.data.get("answer_note", "")
            log.answer_note = note
            log.save()
            topic.answer_note = note
            topic.save(update_fields=["answer_note"])
        return Response({"ok": True})


class SessionAmenView(APIView):
    def post(self, request, session_id: int):
        session = PrayerSession.objects.get(pk=session_id, owner=request.user)
        session.completed_at = timezone.now()
        session.save(update_fields=["completed_at"])
        today = session.session_date
        for log in session.logs.select_related("prayer_topic"):
            topic = log.prayer_topic
            topic.last_prayed_at = today
            topic.save(update_fields=["last_prayed_at"])
            from apps.guide.services.scheduler import reschedule_after_prayer

            reschedule_after_prayer(topic, today)
        return Response({"ok": True})
