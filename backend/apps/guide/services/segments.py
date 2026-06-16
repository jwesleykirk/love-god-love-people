"""Fixed liturgy segment definitions."""
from __future__ import annotations

LITURGY_SEGMENTS: list[tuple[str, str]] = [
    ("opening_dbr_header", "Daily Bible Reading."),
    (
        "love_him_reading",
        "Ask God to help you love him more through the reading.",
    ),
    (
        "understand_obey",
        "Ask God to help you understand and obey his word.",
    ),
    (
        "love_others",
        "Ask God to help you love others more through his word.",
    ),
    (
        "goodness_truth_beauty",
        "What does this reading show you about God's goodness, truth, and beauty?",
    ),
    (
        "reading_challenges",
        "How does this reading challenge you?",
    ),
    (
        "help_today",
        "Ask God to help with this today.",
    ),
    ("topical_header", "Prayer topics."),
    (
        "confess_mercy",
        "Confess your shortcomings and receive God's mercy.",
    ),
    (
        "pray_what_matters",
        "Ask God to help you pray for what really matters to him.",
    ),
]

# Order for compile: segments before DBR, DBR, segments after DBR, topics
PRE_DBR_KEYS = [
    "opening_dbr_header",
    "love_him_reading",
    "understand_obey",
    "love_others",
]
POST_DBR_KEYS = [
    "goodness_truth_beauty",
    "reading_challenges",
    "help_today",
    "topical_header",
    "confess_mercy",
    "pray_what_matters",
]
