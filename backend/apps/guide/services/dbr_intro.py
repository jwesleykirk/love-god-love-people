"""BCP-style DBR passage introductions from Focal Point feed metadata."""
from __future__ import annotations

import re
from html import unescape

from apps.dbr.models import ReadingDay

GOSPELS = frozenset({"Matthew", "Mark", "Luke", "John"})
PROPHETS = frozenset(
    {
        "Isaiah",
        "Jeremiah",
        "Lamentations",
        "Ezekiel",
        "Daniel",
        "Hosea",
        "Joel",
        "Amos",
        "Obadiah",
        "Jonah",
        "Micah",
        "Nahum",
        "Habakkuk",
        "Zephaniah",
        "Haggai",
        "Zechariah",
        "Malachi",
    }
)
PAUL_EPISTLES = frozenset(
    {
        "Romans",
        "Galatians",
        "Ephesians",
        "Philippians",
        "Colossians",
        "Titus",
        "Philemon",
        "Hebrews",
        "1 Corinthians",
        "2 Corinthians",
        "1 Thessalonians",
        "2 Thessalonians",
        "1 Timothy",
        "2 Timothy",
    }
)
CATHOLIC_EPISTLE_AUTHORS = frozenset({"Peter", "John"})

NUMBER_WORDS = {1: "first", 2: "second", 3: "third"}


def book_from_feed_reference(reference: str) -> str:
    """Extract book name from feed label, e.g. 'Old Testament: Nehemiah 4-6'."""
    ref = unescape(reference or "").strip()
    if not ref:
        return ""

    if ":" in ref and not re.search(r"\d:\d", ref.split(":", 1)[0]):
        ref = ref.split(":", 1)[1].strip()

    psalm_match = re.match(r"^(Psalms?)\b", ref, re.IGNORECASE)
    if psalm_match:
        if re.search(r"\d+\s*[-–]\s*\d+", ref):
            return "Psalms"
        number_match = re.search(r"\b(\d+)\b", ref)
        if number_match:
            return f"Psalm {number_match.group(1)}"
        return "Psalms"

    numbered = re.match(r"^(\d)\s+([A-Za-z].*)", ref)
    if numbered:
        rest = numbered.group(2)
        book_match = re.match(r"^([A-Za-z]+(?:\s+(?:of\s+)?[A-Za-z]+)*)", rest)
        if book_match:
            return f"{numbered.group(1)} {book_match.group(1)}"

    book_match = re.match(r"^([A-Za-z]+(?:\s+(?:of\s+)?[A-Za-z]+)*)", ref)
    return book_match.group(1).strip() if book_match else ""


def _psalm_phrase(book: str) -> str:
    single = re.match(r"^Psalm\s+(\d+)\s*$", book, re.IGNORECASE)
    if single:
        return f"A reading from Psalm {single.group(1)}"
    if re.match(r"^Psalm\s+\d+", book, re.IGNORECASE):
        return f"A reading from Psalm {book.split()[-1]}"
    return "A reading from the Psalms"


def _numbered_book_phrase(book: str, *, kind: str) -> str:
    match = re.match(r"^(\d)\s+(.+)$", book)
    if not match:
        return ""
    ordinal = NUMBER_WORDS.get(int(match.group(1)), match.group(1))
    name = match.group(2)
    if kind == "ot":
        return f"A reading from the {ordinal} Book of {name}"
    if name in CATHOLIC_EPISTLE_AUTHORS:
        return f"A reading from the {ordinal} Letter of {name}"
    return f"A reading from the {ordinal} Letter of {name}"


def _ot_book_phrase(book: str) -> str:
    if not book:
        return ""
    if book.lower().startswith("psalm") or book == "Psalms":
        return _psalm_phrase(book)
    if book in PROPHETS:
        return f"A reading from the Book of the Prophet {book}"
    if book in {"Song of Solomon", "Song of Songs"}:
        return "A reading from the Song of Songs"
    numbered = _numbered_book_phrase(book, kind="ot")
    if numbered:
        return numbered
    return f"A reading from the Book of {book}"


def _paul_epistle_phrase(book: str) -> str:
    match = re.match(r"^(\d)\s+(.+)$", book)
    if match:
        ordinal = NUMBER_WORDS.get(int(match.group(1)), match.group(1))
        return f"A reading from the {ordinal} Letter of Paul to the {match.group(2)}"
    return f"A reading from the Letter of Paul to the {book}"


def _nt_book_phrase(book: str) -> str:
    if not book:
        return ""
    if book in GOSPELS:
        return f"A reading from the holy Gospel according to {book}"
    if book == "Acts":
        return "A reading from the Acts of the Apostles"
    if book == "Revelation":
        return "A reading from the Book of Revelation"
    if book in PAUL_EPISTLES:
        return _paul_epistle_phrase(book)
    if book == "James":
        return "A reading from the Letter of James"
    if book == "Jude":
        return "A reading from the Letter of Jude"
    numbered = _numbered_book_phrase(book, kind="nt")
    if numbered:
        return numbered
    return f"A reading from the Book of {book}"


def _combine_phrases(ot_phrase: str, nt_phrase: str) -> str:
    ot_body = ot_phrase.removeprefix("A reading from ")
    nt_body = nt_phrase.removeprefix("A reading from ")
    return f"A reading from {ot_body}, and from {nt_body}."


def build_dbr_introduction(
    *,
    ot_reference: str = "",
    nt_reference: str = "",
) -> str:
    ot_book = book_from_feed_reference(ot_reference)
    nt_book = book_from_feed_reference(nt_reference)
    ot_phrase = _ot_book_phrase(ot_book)
    nt_phrase = _nt_book_phrase(nt_book)

    if not ot_phrase and not nt_phrase:
        return "A reading from Holy Scripture."
    if ot_phrase and not nt_phrase:
        return ot_phrase if ot_phrase.endswith(".") else f"{ot_phrase}."
    if nt_phrase and not ot_phrase:
        return nt_phrase if nt_phrase.endswith(".") else f"{nt_phrase}."
    return _combine_phrases(ot_phrase, nt_phrase)


def build_dbr_introduction_for_reading(reading: ReadingDay) -> str:
    if reading.intro_narration_text:
        return reading.intro_narration_text
    return build_dbr_introduction(
        ot_reference=reading.ot_reference,
        nt_reference=reading.nt_reference,
    )


def dbr_display_title(reading: ReadingDay) -> str:
    refs = unescape(reading.passage_reference or "").replace(" & ", ", ").strip()
    date_part = (reading.title or "").strip()
    if date_part and refs:
        return f"{date_part} — {refs}"
    return date_part or refs or "Daily Bible Reading"
