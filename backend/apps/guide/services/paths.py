"""Volume path helpers."""
from __future__ import annotations

from pathlib import Path

from django.conf import settings


def volume_root() -> Path:
    root = Path(getattr(settings, "RAILWAY_VOLUME_PATH", "/data"))
    root.mkdir(parents=True, exist_ok=True)
    return root


def segments_dir() -> Path:
    d = volume_root() / "segments"
    d.mkdir(parents=True, exist_ok=True)
    return d


def dbr_dir() -> Path:
    d = volume_root() / "dbr"
    d.mkdir(parents=True, exist_ok=True)
    return d


def topics_dir() -> Path:
    d = volume_root() / "topics"
    d.mkdir(parents=True, exist_ok=True)
    return d


def sessions_dir() -> Path:
    d = volume_root() / "sessions"
    d.mkdir(parents=True, exist_ok=True)
    return d


def segment_path(key: str) -> Path:
    return segments_dir() / f"{key}.mp3"


def topic_audio_path(topic_id: int) -> Path:
    return topics_dir() / f"{topic_id}.mp3"


def session_audio_path(session_date) -> Path:
    return sessions_dir() / f"{session_date.isoformat()}.mp3"


def dbr_audio_path(guid: str) -> Path:
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in guid)[:120]
    return dbr_dir() / f"{safe}.mp3"
