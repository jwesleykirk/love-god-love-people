"""Daily guide compiler — assembles clip playlists from segments, DBR, and topics."""
from __future__ import annotations

import logging
import shutil
from datetime import date, timedelta
from pathlib import Path

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.dbr.models import ReadingDay
from apps.prayer.models import BuildStatus, PrayerLog, PrayerSession
from apps.guide.services.build_log import BuildLogger
from apps.guide.services.playlist import build_session_playlist
from apps.guide.services.scheduler import select_topics_for_session

logger = logging.getLogger(__name__)


def _ensure_ffmpeg(log: BuildLogger) -> None:
    if not shutil.which("ffmpeg"):
        log.error("ffmpeg_check", error="ffmpeg not found on PATH")
        raise RuntimeError("ffmpeg not found on PATH")


def compile_session_for_owner(owner, session_date: date | None = None) -> PrayerSession:
    session_date = session_date or timezone.localdate()
    log = BuildLogger()

    session, _ = PrayerSession.objects.get_or_create(
        owner=owner,
        session_date=session_date,
        defaults={"build_status": BuildStatus.BUILDING},
    )
    session.build_status = BuildStatus.BUILDING
    session.save(update_fields=["build_status"])

    try:
        _ensure_ffmpeg(log)

        reading = (
            ReadingDay.objects.filter(pub_date__date=session_date).first()
            or ReadingDay.objects.order_by("-pub_date").first()
        )
        if not reading:
            log.error("dbr_check", error="no reading_day row")
            raise RuntimeError("No reading day available")

        topics = select_topics_for_session(owner, session_date)
        log.ok("schedule", topic_count=len(topics), topic_ids=[t.id for t in topics])

        playlist = build_session_playlist(reading, topics, log)

        session.logs.all().delete()
        for topic in topics:
            PrayerLog.objects.create(
                session=session,
                prayer_topic=topic,
                prayed_on=session_date,
            )

        session.playlist = playlist
        session.audio_file = ""
        session.build_status = BuildStatus.READY
        session.build_log = log.dump()
        session.save()

        rotate_old_session_audio(owner)
        return session

    except Exception as exc:
        logger.exception("Compile failed for %s on %s", owner, session_date)
        log.error("compile", error=str(exc))
        session.build_status = BuildStatus.FAILED
        session.build_log = log.dump()
        session.save(update_fields=["build_status", "build_log"])
        raise


def rotate_old_session_audio(owner) -> None:
    cutoff = timezone.localdate() - timedelta(days=3)
    for session in PrayerSession.objects.filter(owner=owner, session_date__lt=cutoff):
        if session.audio_file:
            p = Path(session.audio_file)
            if p.exists():
                p.unlink(missing_ok=True)
            session.audio_file = ""
        if session.playlist:
            session.playlist = []
        session.save(update_fields=["audio_file", "playlist"])


def compile_all_owners(session_date: date | None = None):
    User = get_user_model()
    for user in User.objects.all():
        try:
            compile_session_for_owner(user, session_date)
        except Exception:
            logger.exception("Compile failed for user %s", user.pk)
