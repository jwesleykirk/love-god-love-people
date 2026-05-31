"""Thin OpenRouter chat client.

Uses `requests` rather than the OpenAI SDK — keeps the dep surface small
and avoids being tied to that SDK's release cadence for a single chat
completions call. Easy to swap later if streaming / tool-use is needed.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_TIMEOUT_SECONDS = 60


class OpenRouterError(RuntimeError):
    """Raised when OpenRouter returns a non-2xx response or malformed JSON."""


def extract_json(
    system_prompt: str,
    user_prompt: str,
    *,
    model: str | None = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    """Call OpenRouter and return the parsed JSON object from the assistant.

    The caller is responsible for prompt design — we request JSON-only
    responses via `response_format`, but we also tolerate fenced output by
    stripping common markdown wrappers.
    """
    api_key = getattr(settings, "OPENROUTER_API_KEY", "")
    if not api_key:
        raise OpenRouterError("OPENROUTER_API_KEY is not set")

    model_slug = model or getattr(settings, "OPENROUTER_MODEL", "anthropic/claude-sonnet-4.5")

    payload = {
        "model": model_slug,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }

    response = requests.post(
        f"{OPENROUTER_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/jwesleykirk/love-god-love-people",
            "X-Title": "Love God Love People",
        },
        json=payload,
        timeout=timeout,
    )
    if not response.ok:
        raise OpenRouterError(
            f"OpenRouter {response.status_code}: {response.text[:500]}"
        )

    body = response.json()
    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise OpenRouterError(f"unexpected response shape: {body}") from exc

    content = content.strip()
    if content.startswith("```"):
        content = content.strip("`")
        if content.startswith("json\n"):
            content = content[len("json\n"):]
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise OpenRouterError(f"non-JSON response: {content[:500]}") from exc
