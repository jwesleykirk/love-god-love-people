"""OpenRouter narration generation."""
from __future__ import annotations

import logging

from django.conf import settings

logger = logging.getLogger(__name__)

NARRATION_SYSTEM = (
    "You generate short prayer prompts for a guided prayer app. "
    "Return only the prompt text, nothing else."
)

NARRATION_USER_TEMPLATE = (
    'Generate a short, simple prayer prompt following the pattern '
    '"Pray for {subject}\'s {thing}". Keep it direct and under 10 words. '
    "No filler. No 'please' or 'Lord'—just the prompt.\n\n"
    "Subject: {subject}\nThing to pray for: {thing}"
)


class OpenRouterError(RuntimeError):
    pass


def openrouter_available() -> bool:
    return bool(getattr(settings, "OPENROUTER_API_KEY", ""))


def generate_narration(subject: str, topic_text: str) -> str:
    api_key = getattr(settings, "OPENROUTER_API_KEY", "")
    if not api_key:
        logger.info("OpenRouter skipped: no api key")
        raise OpenRouterError("OPENROUTER_API_KEY is not set")

    import requests

    model = getattr(settings, "OPENROUTER_MODEL", "anthropic/claude-sonnet-4.5")
    user_prompt = NARRATION_USER_TEMPLATE.format(subject=subject, thing=topic_text)

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/jwesleykirk/love-god-love-people",
            "X-Title": "Love God Love People",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": NARRATION_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": 60,
            "temperature": 0.3,
        },
        timeout=60,
    )
    if not response.ok:
        raise OpenRouterError(f"OpenRouter {response.status_code}: {response.text[:500]}")

    body = response.json()
    content = body["choices"][0]["message"]["content"].strip()
    return content
