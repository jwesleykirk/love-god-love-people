"""Generate fixed liturgy segments and topic narration audio."""
from __future__ import annotations

import logging

from apps.guide.services.elevenlabs import ElevenLabsError, synthesize, tts_available
from apps.guide.services.openrouter import OpenRouterError, generate_narration, openrouter_available
from apps.guide.services.paths import dbr_intro_path, segment_path, topic_audio_path
from apps.guide.services.dbr_intro import build_dbr_introduction
from apps.guide.services.segments import LITURGY_SEGMENTS
from apps.guide.services.scheduler import assign_initial_schedule
from apps.prayer.models import PrayerTopic

logger = logging.getLogger(__name__)


def generate_liturgy_segments(force: bool = False) -> int:
    if not tts_available():
        logger.info("Liturgy segment generation skipped: no ElevenLabs key")
        return 0
    count = 0
    for segment in LITURGY_SEGMENTS:
        path = segment_path(segment.key)
        if path.exists() and not force:
            continue
        synthesize(segment.narration, path)
        count += 1
    return count


def generate_dbr_intro_audio(
    guid: str,
    *,
    ot_reference: str = "",
    nt_reference: str = "",
    force: bool = False,
) -> tuple[str, str]:
    """Return (intro_narration_text, intro_audio_path). Audio path may be empty if TTS skipped."""
    narration = build_dbr_introduction(ot_reference=ot_reference, nt_reference=nt_reference)
    path = dbr_intro_path(guid)
    if not tts_available():
        logger.info("DBR intro TTS skipped for %s: no ElevenLabs key", guid)
        return narration, ""
    if path.exists() and not force:
        return narration, str(path)
    try:
        synthesize(narration, path)
        return narration, str(path)
    except ElevenLabsError:
        logger.info("DBR intro TTS failed for %s", guid)
        return narration, ""


def _subject_for_topic(topic: PrayerTopic) -> str:
    if topic.person_id:
        return topic.person.name
    if topic.group_id:
        return topic.group.name
    return "this need"


def generate_topic_narration(topic_id: int, force: bool = False) -> None:
    topic = PrayerTopic.objects.select_related("person", "group").get(pk=topic_id)
    if not force and topic.narration_generated and topic.audio_file:
        return

    subject = _subject_for_topic(topic)

    if force or not topic.narration_text:
        if openrouter_available():
            try:
                topic.narration_text = generate_narration(subject, topic.topic_text)
            except OpenRouterError:
                topic.narration_text = f"Pray for {subject}'s {topic.topic_text}"
        else:
            topic.narration_text = f"Pray for {subject}'s {topic.topic_text}"
        if force:
            topic.narration_generated = False
        topic.save(update_fields=["narration_text", "narration_generated"] if force else ["narration_text"])

    path = topic_audio_path(topic.id)
    if tts_available():
        try:
            synthesize(topic.narration_text, path)
            topic.audio_file = str(path)
            topic.narration_generated = True
            topic.save(update_fields=["audio_file", "narration_generated"])
        except ElevenLabsError:
            logger.info("Topic TTS skipped for topic %s", topic_id)
    else:
        logger.info("Topic TTS skipped: no ElevenLabs key")

    if not topic.next_scheduled_date:
        assign_initial_schedule(topic)
