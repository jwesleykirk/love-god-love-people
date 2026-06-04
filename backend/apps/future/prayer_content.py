"""Unified prayer session — CRM context + guided-prayer voice."""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout, as_completed

from django.conf import settings
from django.utils import timezone

from apps.extraction.services.openrouter import OpenRouterError, complete_text
from apps.people.models import Person
from apps.properties.models import PersonProperty, PersonPropertyStatus

from .models import PrayerFrequency, PrayerSchedule
from .services import is_meaningful_value

logger = logging.getLogger(__name__)

# Keep "Begin prayer time" responsive no matter how many people are due or how
# slow OpenRouter is. Live generation runs in parallel under a hard total
# budget; anything not finished in time falls back to template prayer text.
AI_PER_CALL_TIMEOUT_SECONDS = 12
AI_TOTAL_BUDGET_SECONDS = 14
AI_MAX_SEGMENTS = 12
AI_MAX_WORKERS = 4

PRAYER_INTRO = (
    "We come together in this quiet moment. Let's open our hearts "
    "and bring before God the people we love and the needs we carry today."
)

GUIDED_PRAYER_SYSTEM = """You are a gentle, warm prayer guide. Given context about a person \
Wesley cares for, write a short guided prayer prompt (3-5 sentences) for spoken meditation. \
Use "we" and "us" language. Be nondenominational but reverent. No stage directions, brackets, \
or formatting. Under 60 words (~20-30 seconds spoken). Do not invent facts beyond the context given."""

TOPIC_PRIORITY = ("family", "faith", "health", "bio", "work", "interests", "other")


def person_display(person: Person) -> str:
    return person.preferred_name.strip() or person.full_name


def format_property_label(name: str) -> str:
    return name.replace("_", " ")


def context_lines_for_person(owner, person: Person, limit: int = 5) -> list[str]:
    rows = list(
        PersonProperty.objects.filter(
            owner=owner,
            person=person,
            status__in=(
                PersonPropertyStatus.APPROVED,
                PersonPropertyStatus.EDITED,
            ),
        ).select_related("property_def")
    )

    def sort_key(pp: PersonProperty) -> tuple:
        topic = pp.property_def.topic or "other"
        try:
            pri = TOPIC_PRIORITY.index(topic)
        except ValueError:
            pri = len(TOPIC_PRIORITY)
        reviewed_ts = pp.reviewed_at.timestamp() if pp.reviewed_at else 0
        return (pri, -reviewed_ts)

    rows.sort(key=sort_key)
    lines: list[str] = []
    for pp in rows:
        if not is_meaningful_value(pp.value_text):
            continue
        label = format_property_label(pp.property_def.name)
        lines.append(f"{label}: {pp.value_text.strip()}")
        if len(lines) >= limit:
            break
    if len(lines) < limit and person.notes_markdown.strip():
        snippet = person.notes_markdown.strip().split("\n")[0][:120]
        lines.append(snippet)
    return lines


def fallback_guided_text(person_name: str, context_lines: list[str]) -> str:
    if context_lines:
        detail = context_lines[0]
        return (
            f"We lift up {person_name} before you. We remember {detail}. "
            "Grant them your peace, wisdom, and care in the days ahead."
        )
    return (
        f"We lift up {person_name} before you. "
        "Hold them in your love and guide their path."
    )


def remembrance_text(person_name: str) -> str:
    """Past-tense wording for someone who has passed (no future-tense intercession)."""
    return (
        f"We thank you for the life of {person_name} and the memories we carry. "
        "Comfort those who loved them, and hold them in your peace."
    )


def generate_guided_text(
    person_name: str,
    context_lines: list[str],
    timeout: float = AI_PER_CALL_TIMEOUT_SECONDS,
) -> tuple[str, bool]:
    """Returns (text, ai_generated). Network-only — safe to call off the main thread."""
    context_block = "\n".join(f"- {line}" for line in context_lines) or "- (no extra detail)"
    user_prompt = f"Person: {person_name}\nContext:\n{context_block}"
    try:
        text = complete_text(
            GUIDED_PRAYER_SYSTEM,
            user_prompt,
            max_tokens=200,
            temperature=0.7,
            timeout=timeout,
        )
        if text:
            return text, True
    except OpenRouterError as exc:
        logger.warning("guided prayer generation failed: %s", exc)
    return fallback_guided_text(person_name, context_lines), False


def build_due_segments(owner, *, generate_ai: bool = True) -> list[dict]:
    now = timezone.now()
    people = Person.objects.filter(owner=owner, archived=False).order_by("full_name")
    schedules = {
        s.person_id: s
        for s in PrayerSchedule.objects.filter(owner=owner).select_related("person")
    }

    # 1) Gather due people + their context (all DB work on the main thread).
    pending: list[dict] = []
    for person in people:
        schedule = schedules.get(person.pk)
        if not schedule or schedule.frequency == PrayerFrequency.NONE:
            continue
        if schedule.next_due_at and schedule.next_due_at > now:
            continue
        pending.append(
            {
                "person_id": person.pk,
                "person_name": person_display(person),
                "full_name": person.full_name,
                "relationship_category": person.relationship_category,
                "frequency": schedule.frequency,
                "deceased": person.deceased_at is not None,
                "context_lines": context_lines_for_person(owner, person),
            }
        )

    ai_on = generate_ai and bool(getattr(settings, "OPENROUTER_API_KEY", ""))

    # 2) Resolve guided text. Deceased → remembrance (no AI, no future tense).
    #    Living people get bounded parallel AI; overflow/timeouts use fallback.
    texts: dict[int, tuple[str, bool]] = {}
    to_generate: list[dict] = []
    for item in pending:
        if item["deceased"]:
            texts[item["person_id"]] = (remembrance_text(item["person_name"]), False)
        elif ai_on and len(to_generate) < AI_MAX_SEGMENTS:
            to_generate.append(item)
        else:
            texts[item["person_id"]] = (
                fallback_guided_text(item["person_name"], item["context_lines"]),
                False,
            )

    if to_generate:
        with ThreadPoolExecutor(max_workers=AI_MAX_WORKERS) as pool:
            fut_map = {
                pool.submit(
                    generate_guided_text, item["person_name"], item["context_lines"]
                ): item
                for item in to_generate
            }
            try:
                for fut in as_completed(fut_map, timeout=AI_TOTAL_BUDGET_SECONDS):
                    item = fut_map[fut]
                    try:
                        texts[item["person_id"]] = fut.result()
                    except Exception as exc:  # noqa: BLE001 - fall back on any failure
                        logger.warning("prayer generation error: %s", exc)
                        texts[item["person_id"]] = (
                            fallback_guided_text(item["person_name"], item["context_lines"]),
                            False,
                        )
            except FuturesTimeout:
                logger.warning("prayer generation exceeded budget; using fallback for rest")
            for item in to_generate:
                texts.setdefault(
                    item["person_id"],
                    (fallback_guided_text(item["person_name"], item["context_lines"]), False),
                )

    # 3) Assemble in stable order.
    segments: list[dict] = []
    for item in pending:
        guided, ai_generated = texts[item["person_id"]]
        segments.append(
            {
                "person_id": item["person_id"],
                "person_name": item["person_name"],
                "full_name": item["full_name"],
                "relationship_category": item["relationship_category"],
                "frequency": item["frequency"],
                "context_lines": item["context_lines"],
                "guided_text": guided,
                "ai_generated": ai_generated,
            }
        )
    return segments


def estimate_session_minutes(segment_count: int, pause_seconds: int = 30) -> int:
    if segment_count == 0:
        return 0
    # intro ~0.5 min + each segment ~0.5 min speech + pause
    total_seconds = 30 + segment_count * (25 + pause_seconds)
    return max(1, round(total_seconds / 60))
