from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, JsonResponse
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.prayer.models import PrayerSession
from apps.prayer.serializers import PrayerSessionSerializer
from apps.guide.services.compiler import compile_session_for_owner
from apps.guide.services.readiness import guide_readiness
from django_q.tasks import async_task


class GuideReadinessView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        payload = guide_readiness()
        status = 200 if payload["ready"] else 503
        return Response(payload, status=status)

    def post(self, request):
        from apps.guide.tasks import compile_daily_guides, dbr_ingest_task

        count = dbr_ingest_task()
        compile_daily_guides()
        payload = guide_readiness()
        payload["smoke_dbr_items"] = count
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
    def get(self, request, session_id: int):
        session = PrayerSession.objects.get(pk=session_id, owner=request.user)
        if not session.audio_file:
            raise Http404
        path = Path(session.audio_file)
        if not path.exists():
            raise Http404
        return FileResponse(path.open("rb"), content_type="audio/mpeg")


class VoicePreviewView(APIView):
    def get(self, request):
        from apps.guide.services.paths import segment_path

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
