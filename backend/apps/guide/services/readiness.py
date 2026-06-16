"""Production readiness checks for nightly guide assembly."""
from __future__ import annotations

import shutil
from datetime import timedelta
from pathlib import Path

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.dbr.models import ReadingDay
from apps.guide.services.elevenlabs import tts_available
from apps.guide.services.openrouter import openrouter_available
from apps.guide.services.paths import segment_path, topic_audio_path, volume_root
from apps.guide.services.scheduler import select_topics_for_session
from apps.guide.services.segments import POST_DBR_KEYS, PRE_DBR_KEYS
from apps.prayer.models import PrayerSession


def guide_readiness() -> dict:
    today = timezone.localdate()
    tomorrow = today + timedelta(days=1)
    checks: list[dict] = []
    ready = True

    def add(name: str, ok: bool, detail: str = "") -> None:
        nonlocal ready
        if not ok:
            ready = False
        checks.append({"name": name, "ok": ok, "detail": detail})

    add("ffmpeg", bool(shutil.which("ffmpeg")))

    try:
        probe = volume_root() / ".write_probe"
        probe.write_text("ok")
        probe.unlink(missing_ok=True)
        add("volume_writable", True)
    except OSError as exc:
        add("volume_writable", False, str(exc))

    segment_keys = PRE_DBR_KEYS + POST_DBR_KEYS
    missing_segments = [k for k in segment_keys if not segment_path(k).exists()]
    add(
        "liturgy_segments",
        not missing_segments,
        f"{len(segment_keys) - len(missing_segments)}/{len(segment_keys)} present",
    )

    add(
        "elevenlabs",
        tts_available() or not missing_segments,
        "configured" if tts_available() else "segments already on volume",
    )
    add("openrouter", openrouter_available(), "configured" if openrouter_available() else "template fallback")

    try:
        from django_q.models import Schedule

        expected = {"dbr_ingest", "compile_daily_guides"}
        rows = {
            row["name"]: row
            for row in Schedule.objects.filter(name__in=expected).values("name", "cron", "next_run")
        }
        missing = expected - set(rows)
        add(
            "django_q_schedules",
            not missing,
            str({k: rows[k] for k in sorted(rows)}) if rows else f"missing {sorted(missing)}",
        )
    except Exception as exc:
        add("django_q_schedules", False, str(exc))

    reading = (
        ReadingDay.objects.filter(pub_date__date=tomorrow).first()
        or ReadingDay.objects.filter(pub_date__date=today).first()
        or ReadingDay.objects.order_by("-pub_date").first()
    )
    if reading:
        audio_ok = bool(reading.audio_cached_path and Path(reading.audio_cached_path).exists())
        add(
            "dbr_reading",
            audio_ok,
            f"{reading.title or reading.guid[:40]} ({reading.pub_date})",
        )
    else:
        add("dbr_reading", False, "no ReadingDay rows")

    User = get_user_model()
    for user in User.objects.all():
        topics = select_topics_for_session(user, tomorrow)
        missing_audio = [
            t.id
            for t in topics
            if not topic_audio_path(t.id).exists()
            and not (t.audio_file and Path(t.audio_file).exists())
        ]
        add(
            f"topics_{user.email or user.username}",
            not missing_audio,
            f"{len(topics)} scheduled for {tomorrow}"
            + (f"; missing audio {missing_audio}" if missing_audio else ""),
        )

    latest_session = PrayerSession.objects.order_by("-session_date").first()
    session_info = None
    if latest_session:
        session_info = {
            "session_date": latest_session.session_date.isoformat(),
            "build_status": latest_session.build_status,
            "has_audio": bool(latest_session.audio_file),
        }

    return {
        "ready": ready,
        "checks": checks,
        "latest_session": session_info,
        "today": today.isoformat(),
        "tomorrow": tomorrow.isoformat(),
    }
