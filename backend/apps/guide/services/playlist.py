"""Build ordered clip playlists for daily guide playback."""
from __future__ import annotations

from pathlib import Path

from apps.dbr.models import ReadingDay
from apps.guide.services.build_log import BuildLogger
from apps.guide.services.paths import segment_path, topic_audio_path
from apps.guide.services.segments import (
    LITURGY_SEGMENTS,
    PAUSE_AFTER_SEGMENT_KEYS,
    POST_DBR_KEYS,
    PRE_DBR_KEYS,
)
from apps.guide.services.silence import DEFAULT_PAUSE_SECONDS, ensure_silence
from apps.prayer.models import PrayerTopic

SEGMENT_TITLES = dict(LITURGY_SEGMENTS)


def _segment_clip(key: str) -> dict:
    return {
        "id": f"segment-{key}",
        "kind": "segment",
        "title": SEGMENT_TITLES.get(key, key.replace("_", " ").title()),
        "subtitle": "Liturgy",
        "audio_url": f"/api/guide/audio/segments/{key}/",
        "segment_key": key,
    }


def _pause_clip(seconds: int, index: int) -> dict:
    return {
        "id": f"pause-{index}",
        "kind": "pause",
        "title": "Pause for reflection",
        "subtitle": "Silence",
        "audio_url": f"/api/guide/audio/silence/{seconds}/",
        "pause_seconds": seconds,
    }


def _dbr_clip(reading: ReadingDay) -> dict:
    return {
        "id": f"dbr-{reading.pk}",
        "kind": "dbr",
        "title": reading.title or "Daily Bible Reading",
        "subtitle": "Scripture",
        "audio_url": f"/api/guide/audio/dbr/{reading.pk}/",
        "reading_id": reading.pk,
    }


def _topic_clip(topic: PrayerTopic) -> dict:
    return {
        "id": f"topic-{topic.pk}",
        "kind": "topic",
        "title": (topic.narration_text or topic.topic_text)[:120],
        "subtitle": "Prayer topic",
        "audio_url": f"/api/guide/audio/topics/{topic.pk}/",
        "topic_id": topic.pk,
    }


def _ensure_segment(key: str, log: BuildLogger) -> None:
    path = segment_path(key)
    if not path.exists():
        log.error("segment_check", key=key, error="missing segment")
        raise RuntimeError(f"Missing segment: {key}")
    log.ok("segment_check", key=key, path=str(path))


def _ensure_topic_audio(topic: PrayerTopic, log: BuildLogger) -> None:
    path = topic_audio_path(topic.id)
    if path.exists():
        log.ok("topic_audio", topic_id=topic.id, path=str(path))
        return
    if topic.audio_file and Path(topic.audio_file).exists():
        log.ok("topic_audio", topic_id=topic.id, path=topic.audio_file)
        return
    log.error("topic_audio", topic_id=topic.id, error="missing audio file")
    raise RuntimeError(f"Missing audio for prayer topic {topic.id}")


def build_session_playlist(
    reading: ReadingDay,
    topics: list[PrayerTopic],
    log: BuildLogger,
    *,
    pause_seconds: int = DEFAULT_PAUSE_SECONDS,
) -> list[dict]:
    """Return ordered clip metadata for lock-screen / in-app skip navigation."""
    ensure_silence(pause_seconds)
    clips: list[dict] = []
    pause_index = 0

    for key in PRE_DBR_KEYS:
        _ensure_segment(key, log)
        clips.append(_segment_clip(key))

    dbr_path = reading.audio_cached_path
    if not dbr_path or not Path(dbr_path).exists():
        log.error("dbr_check", error="audio_cached_path missing", guid=reading.guid)
        raise RuntimeError("DBR audio not cached")
    log.ok("dbr_check", path=dbr_path, guid=reading.guid)
    clips.append(_dbr_clip(reading))

    for key in POST_DBR_KEYS:
        _ensure_segment(key, log)
        clips.append(_segment_clip(key))
        if key in PAUSE_AFTER_SEGMENT_KEYS:
            clips.append(_pause_clip(pause_seconds, pause_index))
            pause_index += 1

    for index, topic in enumerate(topics):
        _ensure_topic_audio(topic, log)
        clips.append(_topic_clip(topic))
        if index < len(topics) - 1:
            clips.append(_pause_clip(pause_seconds, pause_index))
            pause_index += 1

    log.ok("playlist", clip_count=len(clips))
    return clips
