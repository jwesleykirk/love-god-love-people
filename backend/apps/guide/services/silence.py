"""Generate cached silence clips for guide compile."""
from __future__ import annotations

import subprocess
from pathlib import Path

from apps.guide.services.paths import segments_dir

DEFAULT_PAUSE_SECONDS = 10


def silence_path(seconds: int = DEFAULT_PAUSE_SECONDS) -> Path:
    return segments_dir() / f"silence_{seconds}s.mp3"


def ensure_silence(seconds: int = DEFAULT_PAUSE_SECONDS) -> Path:
    path = silence_path(seconds)
    if path.exists():
        return path

    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=mono:sample_rate=44100",
        "-t",
        str(seconds),
        "-c:a",
        "libmp3lame",
        "-q:a",
        "4",
        str(path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr or result.stdout or "ffmpeg silence generation failed")
    return path
