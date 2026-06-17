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
            "during this time of prayer."
        ),
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
        "word_of_the_lord",
        "The Word of the Lord",
        "The Word of the Lord.",
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
        "Confess your sins to God.",
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
    LiturgySegment(
        "doxology",
        "Doxology",
        (
            "Glory be to the Father, and to the Son, and to the Holy Spirit; "
            "as it was in the beginning, is now, and ever shall be, world without end. Amen."
        ),
    ),
]

LITURGY_BY_KEY: dict[str, LiturgySegment] = {segment.key: segment for segment in LITURGY_SEGMENTS}

# Order for compile: segments before DBR, DBR block, segments after DBR, topics, doxology
PRE_DBR_KEYS = [
    "opening_attentive",
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
FIXED_LITURGY_KEYS = PRE_DBR_KEYS + ["word_of_the_lord"] + POST_DBR_KEYS + ["doxology"]

# Seconds of silence after each segment (only keys listed here get a pause).
PAUSE_AFTER_SEGMENT: dict[str, int] = {
    "opening_attentive": 30,
    "love_him_reading": 30,
    "understand_obey": 30,
    "love_others": 30,
    "reflect_god": 60,
    "reading_challenges": 30,
    "help_today": 30,
    "confess_shortcomings": 30,
    "ask_mercy": 30,
    "pray_what_matters": 30,
}

DBR_INTRO_PAUSE_SECONDS = 10
DBR_AFTER_PAUSE_SECONDS = 10
TOPIC_PAUSE_SECONDS = 30
TOPIC_TO_DOXOLOGY_PAUSE_SECONDS = 30
DOXOLOGY_PAUSE_SECONDS = 10
