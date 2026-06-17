"""Loop bundled background music under compiled session audio."""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from django.conf import settings

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
DEFAULT_BACKGROUND_MUSIC = ASSETS_DIR / "Sovereign.mp3"


def background_music_path() -> Path | None:
    override = getattr(settings, "GUIDE_BACKGROUND_MUSIC_PATH", "") or ""
    if override:
        path = Path(override)
        return path if path.exists() else None
    return DEFAULT_BACKGROUND_MUSIC if DEFAULT_BACKGROUND_MUSIC.exists() else None


def background_music_volume() -> float:
    return float(getattr(settings, "GUIDE_BACKGROUND_MUSIC_VOLUME", 0.12))


def mix_background_music(voice_path: Path, output_path: Path) -> bool:
    """Mix looped background music under narration. Returns True if mixed."""
    music_path = background_music_path()
    if not music_path:
        shutil.copy(voice_path, output_path)
        return False

    volume = background_music_volume()
    filter_graph = (
        f"[1:a]volume={volume}[bg];"
        "[0:a][bg]amix=inputs=2:duration=first:dropout_transition=0[aout]"
    )
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(voice_path),
        "-stream_loop",
        "-1",
        "-i",
        str(music_path),
        "-filter_complex",
        filter_graph,
        "-map",
        "[aout]",
        "-c:a",
        "libmp3lame",
        "-q:a",
        "2",
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr or result.stdout or "ffmpeg background mix failed")
    return True
