"""Rebuild today's guide assets and recompile the session playlist."""
from __future__ import annotations

import logging

from django.utils import timezone

from apps.dbr.models import ReadingDay
from apps.prayer.models import BuildStatus, PrayerSession
from apps.guide.services.compiler import compile_session_for_owner
from apps.guide.services.dbr_ingest import download_dbr_audio, ingest_feed
from apps.guide.services.narration import generate_liturgy_segments, generate_topic_narration
from apps.guide.services.scheduler import select_topics_for_session

logger = logging.getLogger(__name__)


def _refresh_todays_dbr_audio() -> None:
    today = timezone.localdate()
    reading = ReadingDay.objects.filter(pub_date__date=today).order_by("-pub_date").first()
    if not reading:
        reading = ReadingDay.objects.order_by("-pub_date").first()
    if not reading or not reading.esv_day_audio_url:
        return
    audio_path = download_dbr_audio(reading.guid, reading.esv_day_audio_url, force=True)
    if audio_path:
        reading.audio_cached_path = audio_path
        reading.save(update_fields=["audio_cached_path"])


def regenerate_todays_guide_for_owner(owner) -> PrayerSession:
    today = timezone.localdate()
    session, _ = PrayerSession.objects.get_or_create(
        owner=owner,
        session_date=today,
        defaults={"build_status": BuildStatus.BUILDING},
    )
    session.build_status = BuildStatus.BUILDING
    session.save(update_fields=["build_status"])

    try:
        ingest_feed()
        _refresh_todays_dbr_audio()
        generate_liturgy_segments(force=False)

        topics = select_topics_for_session(owner, today)
        for topic in topics:
            generate_topic_narration(topic.id, force=True)

        return compile_session_for_owner(owner, today)
    except Exception:
        logger.exception("Regenerate failed for %s on %s", owner, today)
        session.refresh_from_db()
        if session.build_status != BuildStatus.FAILED:
            session.build_status = BuildStatus.FAILED
            session.save(update_fields=["build_status"])
        raise
