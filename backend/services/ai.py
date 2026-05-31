"""
OpenRouter AI client.

Per Wesley's instruction: this wrapper uses `requests` directly rather than
the `openai` SDK referenced in the playbook (section 10). Reason: minimize
deps and avoid pinning to the OpenAI client's release cadence for a thin
chat-completions call. Easy to swap in the SDK later if streaming/tool-use
features warrant it.

Env vars (see .env.example):
  OPENROUTER_API_KEY   required
  OPENROUTER_MODEL     default 'anthropic/claude-sonnet-4.5' (TODO-verify the
                       current latest Sonnet slug on openrouter.ai)
"""
from __future__ import annotations

import os
from typing import Any

import requests

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "anthropic/claude-sonnet-4.5"  # TODO-verify against openrouter.ai
DEFAULT_TIMEOUT_SECONDS = 60


class OpenRouterError(RuntimeError):
    """Raised when OpenRouter returns a non-2xx response."""


def chat(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
    **extra: Any,
) -> dict[str, Any]:
    """
    Call OpenRouter chat completions and return the parsed JSON response.

    Usage:
        from services.ai import chat
        resp = chat([
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello"},
        ])
        reply = resp["choices"][0]["message"]["content"]
    """
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise OpenRouterError(
            "OPENROUTER_API_KEY is not set. Add it to .env (local) or "
            "Railway service variables (prod)."
        )

    payload: dict[str, Any] = {
        "model": model or os.environ.get("OPENROUTER_MODEL", DEFAULT_MODEL),
        "messages": messages,
    }
    if temperature is not None:
        payload["temperature"] = temperature
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    payload.update(extra)

    response = requests.post(
        f"{OPENROUTER_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=timeout,
    )
    if not response.ok:
        raise OpenRouterError(
            f"OpenRouter returned {response.status_code}: {response.text[:500]}"
        )
    return response.json()
