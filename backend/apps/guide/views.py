from __future__ import annotations

import os
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, JsonResponse
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dbr.models import ReadingDay
from apps.prayer.models import BuildStatus, PrayerSession, PrayerTopic
from apps.prayer.serializers import PrayerSessionSerializer
from apps.guide.services.compiler import compile_session_for_owner
from apps.guide.services.paths import segment_path
from apps.guide.services.readiness import guide_readiness
from apps.guide.services.silence import ensure_silence, silence_path
from django_q.tasks import async_task


def _audio_response(path: Path) -> FileResponse:
    if not path.exists():
        raise Http404
    return FileResponse(path.open("rb"), content_type="audio/mpeg")


class GuideReadinessView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        payload = guide_readiness()
        status = 200 if payload["ready"] else 503
        return Response(payload, status=status)

    def post(self, request):
        token = getattr(settings, "GUIDE_OPS_TOKEN", "") or os.environ.get("GUIDE_OPS_TOKEN", "")
        provided = (
            request.headers.get("X-Guide-Ops-Token")
            or request.META.get("HTTP_X_GUIDE_OPS_TOKEN")
            or ""
        ).strip()
        if not token or provided != token:
            return Response({"detail": "Forbidden"}, status=403)

        from apps.guide.tasks import compile_daily_guides

        compile_daily_guides()
        payload = guide_readiness()
        status = 200 if payload["ready"] else 503
        return Response(payload, status=status)


class TodayGuideView(APIView):
    def get(self, request):
        today = timezone.localdate()
        session = PrayerSession.objects.filter(owner=request.user, session_date=today).first()
        if not session:
            return Response(
                {
                    "session_date": today.isoformat(),
                    "build_status": "pending",
                    "detail": "Today's guide hasn't been built yet.",
                }
            )
        return Response(PrayerSessionSerializer(session).data)


class BuildNowView(APIView):
    def post(self, request):
        today = timezone.localdate()
        try:
            session = compile_session_for_owner(request.user, today)
            return Response(PrayerSessionSerializer(session).data)
        except Exception as exc:
            session = PrayerSession.objects.filter(owner=request.user, session_date=today).first()
            if session:
                return Response(PrayerSessionSerializer(session).data, status=500)
            return Response({"detail": str(exc)}, status=500)


class SessionAudioView(APIView):
    """Legacy single-file session audio (pre-playlist sessions)."""

    def get(self, request, session_id: int):
        session = PrayerSession.objects.get(pk=session_id, owner=request.user)
        if not session.audio_file:
            raise Http404
        return _audio_response(Path(session.audio_file))


class SegmentAudioView(APIView):
    def get(self, request, key: str):
        return _audio_response(segment_path(key))


class DbrAudioView(APIView):
    def get(self, request, reading_id: int):
        reading = ReadingDay.objects.get(pk=reading_id)
        if not reading.audio_cached_path:
            raise Http404
        return _audio_response(Path(reading.audio_cached_path))


class TopicAudioView(APIView):
    def get(self, request, topic_id: int):
        topic = PrayerTopic.objects.get(pk=topic_id, owner=request.user)
        from apps.guide.services.paths import topic_audio_path

        path = topic_audio_path(topic.id)
        if not path.exists() and topic.audio_file:
            path = Path(topic.audio_file)
        return _audio_response(path)


class SilenceAudioView(APIView):
    def get(self, request, seconds: int):
        if seconds < 1 or seconds > 120:
            raise Http404
        ensure_silence(seconds)
        return _audio_response(silence_path(seconds))


class VoicePreviewView(APIView):
    def get(self, request):
        path = segment_path("opening_dbr_header")
        if not path.exists():
            return Response({"detail": "Segments not generated yet."}, status=404)
        return FileResponse(path.open("rb"), content_type="audio/mpeg")


class SettingsView(APIView):
    def get(self, request):
        return JsonResponse(
            {
                "build_time_hour": getattr(settings, "BUILD_TIME_HOUR", 3),
                "elevenlabs_voice_id": getattr(settings, "ELEVENLABS_VOICE_ID", ""),
                "elevenlabs_model": getattr(settings, "ELEVENLABS_MODEL", ""),
                "tts_available": bool(getattr(settings, "ELEVENLABS_API_KEY", "")),
                "openrouter_available": bool(getattr(settings, "OPENROUTER_API_KEY", "")),
            }
        )


class RegenerateSegmentsView(APIView):
    def post(self, request):
        async_task("apps.guide.tasks.generate_liturgy_segments", True)
        return Response({"ok": True, "message": "Segment regeneration queued."})


class RegenerateTodayView(APIView):
    def post(self, request):
        today = timezone.localdate()
        session, _ = PrayerSession.objects.get_or_create(
            owner=request.user,
            session_date=today,
            defaults={"build_status": BuildStatus.BUILDING},
        )
        session.build_status = BuildStatus.BUILDING
        session.save(update_fields=["build_status"])

        async_task("apps.guide.tasks.regenerate_todays_guide", request.user.pk)
        return Response(
            {
                "ok": True,
                "message": "Today's guide regeneration queued.",
                "build_status": session.build_status,
            }
        )
