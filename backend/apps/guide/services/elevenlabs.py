"""ElevenLabs text-to-speech client."""
from __future__ import annotations

import logging
from pathlib import Path

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"


class ElevenLabsError(RuntimeError):
    pass


def tts_available() -> bool:
    return bool(getattr(settings, "ELEVENLABS_API_KEY", ""))


def synthesize(text: str, output_path: Path) -> None:
    api_key = getattr(settings, "ELEVENLABS_API_KEY", "")
    if not api_key:
        logger.info("ElevenLabs skipped: no api key")
        raise ElevenLabsError("ELEVENLABS_API_KEY is not set")

    voice_id = getattr(settings, "ELEVENLABS_VOICE_ID", "TmNe0cCqkZBMwPWOd3RD")
    model_id = getattr(settings, "ELEVENLABS_MODEL", "eleven_multilingual_v2")

    response = requests.post(
        f"{ELEVENLABS_BASE}/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": api_key,
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
        },
        json={
            "text": text,
            "model_id": model_id,
        },
        timeout=120,
    )
    if not response.ok:
        raise ElevenLabsError(f"ElevenLabs {response.status_code}: {response.text[:500]}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(response.content)
