from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any

from apps.groups.models import Group
from apps.guide.services.openrouter import OpenRouterError, openrouter_available
from apps.people.models import Person

logger = logging.getLogger(__name__)

MAX_IMPORT_CHARACTERS = 12000
MAX_SUGGESTIONS = 50

IMPORT_SYSTEM_PROMPT = (
    "You convert pasted prayer-list text into structured prayer topic suggestions. "
    "Return a single JSON object only. Do not include markdown, comments, or prose."
)

IMPORT_USER_TEMPLATE = """Extract prayer topics from the pasted text.

Return exactly this JSON shape:
{{
  "topics": [
    {{
      "name": "person, family, group, or empty if general",
      "kind": "person|group|general",
      "request": "short concrete topic phrase",
      "frequency": "daily|weekly|monthly"
    }}
  ]
}}

Rules:
- Use only people, groups, and requests found in the text. Do not invent names or facts.
- Omit vague lines that do not contain a prayer request.
- Split multiple requests for the same name into separate topics.
- Keep each request concise and readable after "Pray for NAME's ...".
- Do not include "pray for", "please pray", or "Lord" in the request.
- Default to "weekly" unless the text clearly says daily/urgent/ongoing daily or monthly/long-term.
- Use kind "person" for named individuals, "group" for families, teams, churches, classes, or organizations, and "general" when no subject is named.
- Return no more than {max_suggestions} topics.

Pasted text:
\"\"\"
{raw_text}
\"\"\"
"""


@dataclass(frozen=True)
class ImportedPrayerSuggestion:
    name: str
    kind: str
    topic_text: str
    target_frequency: str
    person_id: int | None = None
    group_id: int | None = None

    def as_dict(self, index: int) -> dict[str, Any]:
        return {
            "client_id": f"suggestion-{index}",
            "name": self.name,
            "kind": self.kind,
            "topic_text": self.topic_text,
            "target_frequency": self.target_frequency,
            "person_id": self.person_id,
            "group_id": self.group_id,
        }


def generate_import_suggestions(owner, raw_text: str) -> list[dict[str, Any]]:
    text = raw_text.strip()
    if not text:
        return []
    if len(text) > MAX_IMPORT_CHARACTERS:
        raise ValueError(f"Paste at most {MAX_IMPORT_CHARACTERS:,} characters at a time.")
    if not openrouter_available():
        raise OpenRouterError("OPENROUTER_API_KEY is not set")

    body = _call_openrouter_for_import(text)
    parsed = _parse_json_object(body)
    topics = parsed.get("topics", [])
    if not isinstance(topics, list):
        raise ValueError("OpenRouter returned JSON without a topics list.")

    people_by_name = _name_map(Person.objects.filter(owner=owner).only("id", "name"))
    groups_by_name = _name_map(Group.objects.filter(owner=owner).only("id", "name"))
    suggestions: list[ImportedPrayerSuggestion] = []
    for raw_topic in topics[:MAX_SUGGESTIONS]:
        suggestion = _normalize_suggestion(raw_topic, people_by_name, groups_by_name)
        if suggestion:
            suggestions.append(suggestion)

    return [suggestion.as_dict(index) for index, suggestion in enumerate(suggestions, start=1)]


def _call_openrouter_for_import(raw_text: str) -> str:
    import requests
    from django.conf import settings

    model = getattr(settings, "OPENROUTER_MODEL", "anthropic/claude-sonnet-4.5")
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/jwesleykirk/love-god-love-people",
            "X-Title": "Love God Love People",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": IMPORT_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": IMPORT_USER_TEMPLATE.format(
                        max_suggestions=MAX_SUGGESTIONS,
                        raw_text=raw_text,
                    ),
                },
            ],
            "max_tokens": 1800,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    if not response.ok:
        raise OpenRouterError(f"OpenRouter {response.status_code}: {response.text[:500]}")

    try:
        return response.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning("Unexpected OpenRouter import response: %s", exc)
        raise ValueError("OpenRouter returned an unexpected response.") from exc


def _parse_json_object(content: str) -> dict[str, Any]:
    cleaned = content.strip()
    fence_match = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", cleaned, flags=re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError("OpenRouter returned invalid JSON.") from exc
    if not isinstance(parsed, dict):
        raise ValueError("OpenRouter returned JSON that was not an object.")
    return parsed


def _normalize_suggestion(
    raw_topic: Any,
    people_by_name: dict[str, Person],
    groups_by_name: dict[str, Group],
) -> ImportedPrayerSuggestion | None:
    if not isinstance(raw_topic, dict):
        return None

    name = _clean_text(raw_topic.get("name", ""))
    topic_text = _clean_request(raw_topic.get("request", ""))
    if not topic_text:
        return None

    kind = str(raw_topic.get("kind", "general")).strip().lower()
    if kind not in {"person", "group", "general"}:
        kind = "general"

    frequency = str(raw_topic.get("frequency", "weekly")).strip().lower()
    if frequency not in {"daily", "weekly", "monthly"}:
        frequency = "weekly"

    person_id: int | None = None
    group_id: int | None = None
    if name:
        normalized_name = _normalize_name(name)
        if kind == "person" and normalized_name in people_by_name:
            person_id = people_by_name[normalized_name].id
        elif kind == "group" and normalized_name in groups_by_name:
            group_id = groups_by_name[normalized_name].id
        elif normalized_name in people_by_name:
            kind = "person"
            person_id = people_by_name[normalized_name].id
        elif normalized_name in groups_by_name:
            kind = "group"
            group_id = groups_by_name[normalized_name].id

    if not name:
        kind = "general"

    return ImportedPrayerSuggestion(
        name=name,
        kind=kind,
        topic_text=topic_text,
        target_frequency=frequency,
        person_id=person_id,
        group_id=group_id,
    )


def _name_map(items) -> dict[str, Any]:
    return {_normalize_name(item.name): item for item in items}


def _normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).casefold()


def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())[:255]


def _clean_request(value: Any) -> str:
    text = _clean_text(value)
    text = re.sub(r"^(please\s+)?pray\s+for\s+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^(lord,?\s+)", "", text, flags=re.IGNORECASE)
    return text.strip(" .")
