"""Pre-flight checks for nightly guide assembly."""
from __future__ import annotations

import shutil
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.dbr.models import ReadingDay
from apps.guide.services.paths import segment_path, volume_root
from apps.guide.services.scheduler import select_topics_for_session
from apps.guide.services.segments import POST_DBR_KEYS, PRE_DBR_KEYS
from apps.guide.services.elevenlabs import tts_available
from apps.guide.services.openrouter import openrouter_available


class Command(BaseCommand):
    help = "Verify prerequisites for daily prayer guide assembly."

    def handle(self, *args, **options):
        today = timezone.localdate()
        tomorrow = today + timedelta(days=1)
        ok = True

        def check(label: str, passed: bool, detail: str = "") -> None:
            nonlocal ok
            if not passed:
                ok = False
            status = self.style.SUCCESS("OK") if passed else self.style.ERROR("FAIL")
            line = f"[{status}] {label}"
            if detail:
                line = f"{line} — {detail}"
            self.stdout.write(line)

        check("ffmpeg on PATH", bool(shutil.which("ffmpeg")))
        check("volume writable", _volume_writable())

        segment_keys = PRE_DBR_KEYS + POST_DBR_KEYS
        missing_segments = [k for k in segment_keys if not segment_path(k).exists()]
        check(
            "liturgy segments",
            not missing_segments,
            "missing: " + ", ".join(missing_segments) if missing_segments else f"{len(segment_keys)} present",
        )

        check("ElevenLabs API key", tts_available() or not missing_segments, "needed when liturgy segments are missing")
        if openrouter_available():
            check("OpenRouter API key", True, "narration AI enabled")
        else:
            self.stdout.write("[WARN] OpenRouter API key — optional; template fallback used")

        schedules_ok, schedule_detail = _django_q_schedules()
        check("django-q schedules", schedules_ok, schedule_detail)

        reading = (
            ReadingDay.objects.filter(pub_date__date=tomorrow).first()
            or ReadingDay.objects.filter(pub_date__date=today).first()
            or ReadingDay.objects.order_by("-pub_date").first()
        )
        if reading:
            audio_ok = bool(reading.audio_cached_path and Path(reading.audio_cached_path).exists())
            check(
                "DBR reading + audio",
                audio_ok,
                f"{reading.title or reading.guid[:40]} ({reading.pub_date})",
            )
        else:
            check("DBR reading + audio", False, "no ReadingDay rows — run dbr_ingest")

        User = get_user_model()
        users = list(User.objects.all())
        if not users:
            check("owner accounts", False, "no users in database")
        else:
            for user in users:
                topics = select_topics_for_session(user, tomorrow)
                missing_audio = _topics_missing_audio(topics)
                check(
                    f"topics for {user.email or user.username} ({tomorrow})",
                    not missing_audio,
                    f"{len(topics)} scheduled"
                    + (f"; missing audio: {missing_audio}" if missing_audio else ""),
                )

        build_hour = getattr(settings, "BUILD_TIME_HOUR", 3)
        dbr_hour = getattr(settings, "DBR_INGEST_HOUR", 2)
        self.stdout.write(
            f"\nNightly jobs (America/Los_Angeles): DBR ingest {dbr_hour}:30, compile {build_hour}:00"
        )

        if ok:
            self.stdout.write(self.style.SUCCESS("\nGuide assembly looks ready."))
        else:
            self.stdout.write(self.style.ERROR("\nGuide assembly has blockers — fix FAIL items above."))
            raise SystemExit(1)


def _volume_writable() -> bool:
    root = volume_root()
    probe = root / ".write_probe"
    try:
        probe.write_text("ok")
        probe.unlink(missing_ok=True)
        return True
    except OSError:
        return False


def _django_q_schedules() -> tuple[bool, str]:
    try:
        from django_q.models import Schedule
    except Exception as exc:
        return False, str(exc)

    expected = {"dbr_ingest", "compile_daily_guides"}
    found = set(Schedule.objects.filter(name__in=expected).values_list("name", flat=True))
    missing = expected - found
    if missing:
        return False, "missing: " + ", ".join(sorted(missing))
    return True, "dbr_ingest + compile_daily_guides registered"


def _topics_missing_audio(topics) -> list[int]:
    from apps.guide.services.paths import topic_audio_path

    missing: list[int] = []
    for topic in topics:
        path = topic_audio_path(topic.id)
        if path.exists():
            continue
        if topic.audio_file and Path(topic.audio_file).exists():
            continue
        missing.append(topic.id)
    return missing
