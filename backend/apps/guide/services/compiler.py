"""Daily guide compiler — stitches segments, DBR, and topic audio via ffmpeg."""
from __future__ import annotations

import logging
import shutil
import subprocess
import tempfile
from datetime import date, timedelta
from pathlib import Path

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.dbr.models import ReadingDay
from apps.prayer.models import BuildStatus, PrayerLog, PrayerSession, PrayerTopic
from apps.guide.services.build_log import BuildLogger
from apps.guide.services.paths import (
    segment_path,
    session_audio_path,
    topic_audio_path,
)
from apps.guide.services.scheduler import select_topics_for_session
from apps.guide.services.segments import POST_DBR_KEYS, PRE_DBR_KEYS

logger = logging.getLogger(__name__)


def _run_ffmpeg_concat(manifest: Path, output: Path) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(manifest),
        "-c",
        "copy",
        str(output),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr or result.stdout or "ffmpeg failed")


def _ensure_ffmpeg(log: BuildLogger) -> None:
    if not shutil.which("ffmpeg"):
        log.error("ffmpeg_check", error="ffmpeg not found on PATH")
        raise RuntimeError("ffmpeg not found on PATH")


def _ensure_topic_audio(topic: PrayerTopic, log: BuildLogger) -> Path:
    path = topic_audio_path(topic.id)
    if path.exists():
        log.ok("topic_audio", topic_id=topic.id, path=str(path))
        return path
    if topic.audio_file and Path(topic.audio_file).exists():
        log.ok("topic_audio", topic_id=topic.id, path=topic.audio_file)
        return Path(topic.audio_file)
    log.error("topic_audio", topic_id=topic.id, error="missing audio file")
    raise RuntimeError(f"Missing audio for prayer topic {topic.id}")


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

        dbr_path = reading.audio_cached_path
        if not dbr_path or not Path(dbr_path).exists():
            log.error("dbr_check", error="audio_cached_path missing", guid=reading.guid)
            raise RuntimeError("DBR audio not cached")

        log.ok("dbr_check", path=dbr_path, guid=reading.guid)

        topics = select_topics_for_session(owner, session_date)
        log.ok("schedule", topic_count=len(topics), topic_ids=[t.id for t in topics])

        audio_paths: list[Path] = []
        for key in PRE_DBR_KEYS:
            p = segment_path(key)
            if not p.exists():
                log.error("segment_check", key=key, error="missing segment")
                raise RuntimeError(f"Missing segment: {key}")
            audio_paths.append(p)

        audio_paths.append(Path(dbr_path))

        for key in POST_DBR_KEYS:
            p = segment_path(key)
            if not p.exists():
                log.error("segment_check", key=key, error="missing segment")
                raise RuntimeError(f"Missing segment: {key}")
            audio_paths.append(p)

        for topic in topics:
            audio_paths.append(_ensure_topic_audio(topic, log))

        output = session_audio_path(session_date)
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as mf:
            for p in audio_paths:
                mf.write(f"file '{p.resolve()}'\n")
            manifest = Path(mf.name)

        try:
            _run_ffmpeg_concat(manifest, output)
            log.ok("ffmpeg", path=str(output))
        finally:
            manifest.unlink(missing_ok=True)

        session.logs.all().delete()
        for topic in topics:
            PrayerLog.objects.create(
                session=session,
                prayer_topic=topic,
                prayed_on=session_date,
            )

        session.audio_file = str(output)
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
            session.save(update_fields=["audio_file"])


def compile_all_owners(session_date: date | None = None):
    User = get_user_model()
    for user in User.objects.all():
        try:
            compile_session_for_owner(user, session_date)
        except Exception:
            logger.exception("Compile failed for user %s", user.pk)
