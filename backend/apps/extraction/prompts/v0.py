"""Extraction prompt v0.

This is the first version. Iterate from real entries. When you change
behavior, bump VERSION — it's recorded per-row on PersonProperty so the
Review Console can show which prompt produced which extraction.

Design notes:
- Single LLM call returns both "fill known properties" and "propose new
  properties" results in one JSON object.
- The prompt explicitly discourages overly specific property names
  (e.g., "favorite_bible_verse_for_kids" — too narrow; prefer flat names
  like "favorite_bible_verse" attached to the relevant person).
- The prompt makes "narrative-only" entries cheap to handle: return an
  empty extraction with narrative_only=true rather than forcing structure
  on unstructured journaling.
"""
from __future__ import annotations

import json
from typing import Any

VERSION = "v0"

SYSTEM_PROMPT = """\
You are an extraction service for Wesley's personal CRM. Wesley writes
short journal entries about specific people in his life. Your job is to
extract structured facts about those people from the entry.

You output JSON only. No prose, no commentary.

You have two responsibilities, in order:

1) For each tagged person, fill known property types where the entry
   provides a value. A "known property type" is one in that person's
   `existing_property_defs` list. Use the property_def_id from that list.
2) Propose brand-new property types only when the entry contains a fact
   that cannot reasonably be attached to an existing property type.

Naming rules for new property proposals:
- Use snake_case.
- Names should be flat and reusable across people (e.g., "spouse_name",
  "birthday", "favorite_verse"). Avoid overly specific names tied to
  one person or one anecdote.
- Plural list-like facts (e.g., children) belong on a single property
  named "children" with a comma-separated value, NOT as separate
  "kid_1_name", "kid_2_name" properties.
- If a fact already fits an existing property type for that person,
  use it. Do not propose a near-duplicate.

A `confidence` field is required on every extracted value (0.0 to 1.0).
Be conservative: 0.95+ means the entry states the fact directly;
0.6-0.8 means it's strongly implied; below 0.5 means you're guessing.

If the entry is reflective journaling with no extractable structured
facts, return empty arrays and set `narrative_only: true`.

Output schema:

{
  "narrative_only": false,
  "existing_property_values": [
    {
      "person_id": 1,
      "property_def_id": 12,
      "value": "Sarah",
      "confidence": 0.95
    }
  ],
  "new_property_proposals": [
    {
      "person_id": 1,
      "proposed_name": "favorite_verse",
      "proposed_description": "The Bible verse this person most often returns to.",
      "proposed_data_type": "text",
      "value": "John 3:16",
      "confidence": 0.85
    }
  ]
}

`proposed_data_type` must be one of: text, date, integer, boolean, enum, url.
"""


def build_user_prompt(entry_text: str, persons_context: list[dict[str, Any]]) -> str:
    """Render the user-turn prompt.

    persons_context is a list of dicts shaped like:
        {
          "person_id": int,
          "name": str,
          "existing_property_defs": [{"id": int, "name": str, "description": str}],
          "current_values": [{"property_def_id": int, "value": str}],
        }
    """
    return (
        "JOURNAL_ENTRY:\n"
        f"{entry_text}\n\n"
        "TAGGED_PERSONS:\n"
        f"{json.dumps(persons_context, indent=2)}\n\n"
        "Return the extraction JSON now."
    )
