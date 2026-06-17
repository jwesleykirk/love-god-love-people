"""Fixed liturgy segment definitions."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LiturgySegment:
    key: str
    title: str
    narration: str


LITURGY_SEGMENTS: list[LiturgySegment] = [
    LiturgySegment(
        "opening_attentive",
        "Begin",
        (
            "As you begin, pray that God would keep you attentive and thankful "
            "in this prayer time. Remember that Christ is coming soon."
        ),
    ),
    LiturgySegment(
        "opening_dbr_header",
        "Daily Bible Reading",
        "Daily Bible Reading.",
    ),
    LiturgySegment(
        "love_him_reading",
        "Love God",
        "Ask God to help you love him more through the reading.",
    ),
    LiturgySegment(
        "understand_obey",
        "Understand and obey",
        "Ask God to help you understand and obey his word.",
    ),
    LiturgySegment(
        "love_others",
        "Love others",
        "Ask God to help you love others more through his word.",
    ),
    LiturgySegment(
        "reflect_god",
        "Reflect",
        "What does these passages show you about God?",
    ),
    LiturgySegment(
        "reading_challenges",
        "Reflect",
        "How does this reading challenge you?",
    ),
    LiturgySegment(
        "help_today",
        "Reflect",
        "Ask God to help with this today.",
    ),
    LiturgySegment(
        "confess_shortcomings",
        "Confession",
        "Confess your shortcomings to God.",
    ),
    LiturgySegment(
        "ask_mercy",
        "Confession",
        "Ask for God's mercy.",
    ),
    LiturgySegment(
        "pray_what_matters",
        "Intercession",
        "Ask God to help you pray for what really matters to him.",
    ),
]

LITURGY_BY_KEY: dict[str, LiturgySegment] = {segment.key: segment for segment in LITURGY_SEGMENTS}

# Order for compile: segments before DBR, DBR, segments after DBR, topics
PRE_DBR_KEYS = [
    "opening_attentive",
    "opening_dbr_header",
    "love_him_reading",
    "understand_obey",
    "love_others",
]
POST_DBR_KEYS = [
    "reflect_god",
    "reading_challenges",
    "help_today",
    "confess_shortcomings",
    "ask_mercy",
    "pray_what_matters",
]

# Seconds of silence after each segment (only keys listed here get a pause).
PAUSE_AFTER_SEGMENT: dict[str, int] = {
    "opening_attentive": 10,
    "love_him_reading": 15,
    "understand_obey": 15,
    "love_others": 15,
    "reflect_god": 15,
    "confess_shortcomings": 20,
    "ask_mercy": 10,
    "pray_what_matters": 10,
}

TOPIC_PAUSE_SECONDS = 20
