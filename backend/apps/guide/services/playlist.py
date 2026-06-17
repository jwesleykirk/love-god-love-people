"""Build ordered clip playlists for daily guide playback."""
from __future__ import annotations

from pathlib import Path

from apps.dbr.models import ReadingDay
from apps.guide.services.build_log import BuildLogger
from apps.guide.services.dbr_intro import build_dbr_introduction_for_reading, dbr_display_title
from apps.guide.services.narration import generate_dbr_intro_audio
from apps.guide.services.paths import dbr_intro_path, segment_path, topic_audio_path
from apps.guide.services.segments import (
    DBR_AFTER_PAUSE_SECONDS,
    DBR_INTRO_PAUSE_SECONDS,
    DOXOLOGY_PAUSE_SECONDS,
    LITURGY_BY_KEY,
    PAUSE_AFTER_SEGMENT,
    POST_DBR_KEYS,
    PRE_DBR_KEYS,
    TOPIC_PAUSE_SECONDS,
    TOPIC_TO_DOXOLOGY_PAUSE_SECONDS,
)
from apps.guide.services.silence import ensure_silence
from apps.prayer.models import PrayerTopic

SEGMENT_TITLES = {key: segment.title for key, segment in LITURGY_BY_KEY.items()}


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


def _dbr_intro_clip(reading: ReadingDay) -> dict:
    return {
        "id": f"dbr-intro-{reading.pk}",
        "kind": "dbr_intro",
        "title": "Passage introduction",
        "subtitle": build_dbr_introduction_for_reading(reading),
        "audio_url": f"/api/guide/audio/dbr-intro/{reading.pk}/",
        "reading_id": reading.pk,
    }


def _dbr_clip(reading: ReadingDay) -> dict:
    return {
        "id": f"dbr-{reading.pk}",
        "kind": "dbr",
        "title": dbr_display_title(reading),
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


def _ensure_dbr_intro(reading: ReadingDay, log: BuildLogger) -> None:
    path = dbr_intro_path(reading.guid)
    if path.exists():
        log.ok("dbr_intro", path=str(path), guid=reading.guid)
        return
    _, intro_path = generate_dbr_intro_audio(
        reading.guid,
        ot_reference=reading.ot_reference,
        nt_reference=reading.nt_reference,
    )
    if intro_path and Path(intro_path).exists():
        log.ok("dbr_intro", path=intro_path, guid=reading.guid, generated=True)
        return
    log.error("dbr_intro", error="missing intro audio", guid=reading.guid)
    raise RuntimeError("Missing DBR introduction audio")


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


def _append_segment_clips(clips: list[dict], keys: list[str], log: BuildLogger, pause_index: int) -> int:
    for key in keys:
        _ensure_segment(key, log)
        clips.append(_segment_clip(key))
        if key in PAUSE_AFTER_SEGMENT:
            seconds = PAUSE_AFTER_SEGMENT[key]
            ensure_silence(seconds)
            clips.append(_pause_clip(seconds, pause_index))
            pause_index += 1
    return pause_index


def _append_dbr_clips(clips: list[dict], reading: ReadingDay, log: BuildLogger, pause_index: int) -> int:
    _ensure_dbr_intro(reading, log)
    clips.append(_dbr_intro_clip(reading))
    ensure_silence(DBR_INTRO_PAUSE_SECONDS)
    clips.append(_pause_clip(DBR_INTRO_PAUSE_SECONDS, pause_index))
    pause_index += 1

    dbr_path = reading.audio_cached_path
    if not dbr_path or not Path(dbr_path).exists():
        log.error("dbr_check", error="audio_cached_path missing", guid=reading.guid)
        raise RuntimeError("DBR audio not cached")
    log.ok("dbr_check", path=dbr_path, guid=reading.guid)
    clips.append(_dbr_clip(reading))

    _ensure_segment("word_of_the_lord", log)
    clips.append(_segment_clip("word_of_the_lord"))
    ensure_silence(DBR_AFTER_PAUSE_SECONDS)
    clips.append(_pause_clip(DBR_AFTER_PAUSE_SECONDS, pause_index))
    pause_index += 1
    return pause_index


def build_session_playlist(
    reading: ReadingDay,
    topics: list[PrayerTopic],
    log: BuildLogger,
) -> list[dict]:
    """Return ordered clip metadata for lock-screen / in-app skip navigation."""
    clips: list[dict] = []
    pause_index = 0

    pause_index = _append_segment_clips(clips, PRE_DBR_KEYS, log, pause_index)
    pause_index = _append_dbr_clips(clips, reading, log, pause_index)
    pause_index = _append_segment_clips(clips, POST_DBR_KEYS, log, pause_index)

    for index, topic in enumerate(topics):
        _ensure_topic_audio(topic, log)
        clips.append(_topic_clip(topic))
        if index < len(topics) - 1:
            ensure_silence(TOPIC_PAUSE_SECONDS)
            clips.append(_pause_clip(TOPIC_PAUSE_SECONDS, pause_index))
            pause_index += 1

    if topics:
        ensure_silence(TOPIC_TO_DOXOLOGY_PAUSE_SECONDS)
        clips.append(_pause_clip(TOPIC_TO_DOXOLOGY_PAUSE_SECONDS, pause_index))
        pause_index += 1

    _ensure_segment("doxology", log)
    clips.append(_segment_clip("doxology"))
    ensure_silence(DOXOLOGY_PAUSE_SECONDS)
    clips.append(_pause_clip(DOXOLOGY_PAUSE_SECONDS, pause_index))

    log.ok("playlist", clip_count=len(clips))
    return clips
