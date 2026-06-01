# Prompt design

Lives in `apps/extraction/prompts/v{N}.py`. The active version is imported by `apps/extraction/tasks.py`. Old versions stay in the tree for diffing and regression analysis.

The `PersonProperty.prompt_version` and `model` columns carry the version used to produce each row, so the Review Console can show provenance per extraction.

## Version history

### v0 (Phase 1 / v0.1)

The first cut. Established the basic output schema:
- `existing_property_values` — fill known property types
- `new_property_proposals` — propose brand-new property types
- `narrative_only` — flag that the entry has nothing structured to extract

### v1 (v0.2)

Same output schema as v0. Three things added to the system prompt:
- **Person context now includes `life_stage`, `birthday`, `deceased_at`.** AI was told to scope proposed properties accordingly (no `job_title` for toddlers).
- **Person context now includes existing `associations` and `memberships`.** AI was told not to propose properties recoverable from first-class records — no `spouse_name` when a `spouse_of` association is present.
- **Organization context** for any orgs tagged on the entry.

### v2 (v0.3 — current)

Adds a third output stream and two hard discipline rules.

**Output schema additions:**
- `proposed_persons` — when the AI detects a person mentioned in the entry but not tagged, it proposes creating them as a new `Person`. Each proposal carries `full_name`, `preferred_name`, `life_stage` (best-guess), `proposed_associations` to already-tagged persons, `proposed_properties` for the new person, and confidence.

**Hard rules baked into the system prompt:**

#### Rule A — Uncertainty discipline

If the entry frames a fact as speculation, absence of evidence, or self-acknowledged ignorance, the AI must NOT extract a property. Common markers: "I'm not sure", "I don't know", "I've never heard", "maybe", "might be", "seems like".

The Alfonso Morales paragraph (below) is the canonical negative-test fixture. Any prompt version that produces a devotion-related property from this paragraph has regressed.

#### Rule B — Plural pronoun expansion

When a plural pronoun ("they", "both of them", "the kids") refers to multiple identified people, the AI must produce ONE row per referent — never a single combined row.

> "Alfonso and Kimberly love music" → `loves_music=true` on Alfonso AND `loves_music=true` on Kimberly.

Combining into a single row, or producing a property like `alfonso_and_kimberly_love_music`, is a regression.

If a plural referent cannot be confidently resolved, the AI leaves it as narrative.

#### Rule C — Don't extract facts that are first-class records

The AI never proposes property types for facts captured by the graph:
- spouse/wife/husband names → `PersonAssociation(spouse_of)`, plus a `ProposedPerson` if untagged
- parent/child/sibling names → `PersonAssociation(parent_of, child_of, sibling_of)`, plus `ProposedPerson` if untagged
- church/employer/small group → `OrganizationMembership`

#### Rule D — Standardized property names

When applicable, use these exact snake_case names:
- `current_school_type` — "Lutheran", "public", "private", "homeschool", "Christian"
- `current_school_name` — specific school
- `approximate_birth_year` — year or year-range string ("2017-2018") when exact birthday is unknown
- `religion` — "Christian", "nominal Christian", "Catholic", "agnostic", etc.

`approximate_birth_year` is automatically marked `status=superseded` when `Person.birthday` is later set (see `apps/people/signals.py`).

#### Rule E — Life-stage scoping

For people whose life_stage is infant/toddler/child/teen, only age-appropriate properties are proposed.

For people with `deceased_at` set, no future-tense properties.

#### Rule F — Confidence scoring

0.95+ for direct statements. 0.6–0.8 for strong implications. Below 0.5 usually means: don't extract.

## Output schema (v2)

```json
{
  "narrative_only": false,
  "existing_property_values": [
    {"person_id": 1, "property_def_id": 12, "value": "Sarah", "confidence": 0.95}
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
  ],
  "proposed_persons": [
    {
      "full_name": "Kimberly Morales",
      "preferred_name": "",
      "life_stage": "adult",
      "confidence": 0.9,
      "proposed_associations": [
        {"to_person_id": 1, "association_type": "spouse_of"}
      ],
      "proposed_properties": [
        {"property_name": "loves_music", "value": "true", "data_type": "boolean", "confidence": 0.85}
      ]
    }
  ]
}
```

## Negative-test fixtures

### The Alfonso Morales paragraph (verbatim)

> Alfonso Morales is one of my coworkers him and his wife Kimberly have a son named Jack was about seven or eight. They love music and Alfonso and Kimberly our diehard members of the Dave Matthews Band band club. Their son Jack is in a Lutheran school and I know they are at least nominally Christian but I've never heard Alfonso pray during our prayer meeting openers so I'm not sure how devout they are.

**Expected v2 output when Alfonso is the only tagged person:**

- `proposed_persons`:
  - Kimberly Morales — life_stage=adult, spouse_of Alfonso, proposed_properties: loves_music=true, religion=nominal Christian
  - Jack Morales — life_stage=child, child_of Alfonso, proposed_properties: current_school_type=Lutheran, approximate_birth_year=2017-2018
- `existing_property_values` / `new_property_proposals` on Alfonso: loves_music=true, religion=nominal Christian, possibly favorite_band=Dave Matthews Band
- **ZERO properties about devotion / prayer practice anywhere.** This is the hard assertion. The text says "I'm not sure how devout they are" — that's ignorance, not a fact.

The unit test (`apps/extraction/tests.py::ProposedPersonsPersistenceTests::test_persist_proposed_kimberly`) asserts that no property name across all extracted/proposed rows contains any of: `devout`, `devotion`, `pray`, `prays`, `praying`, `prayerful`. If that assertion fails, the prompt regressed.

The live e2e check at deploy time runs the actual Alfonso paragraph through the live extraction pipeline and verifies the same.

## Adding a new prompt version

1. Copy `apps/extraction/prompts/v{N}.py` to `v{N+1}.py`. Bump `VERSION`.
2. Make the prompt changes. If you're loosening a rule (e.g., letting the AI propose first-class-record-like properties again), document why in the file's docstring.
3. Update the import in `apps/extraction/tasks.py`: `from .prompts import v{N+1} as prompt_vN`.
4. Add structural tests to `apps/extraction/tests.py::PromptV2StructureTests` (or a new class) asserting your new rules are encoded in the prompt text.
5. Run the Alfonso fixture regression — if it fails, the new prompt has a discipline gap.
6. Update this doc's "Version history" section with what changed and why.
7. Optionally, run a side-by-side A/B (one entry, two prompts) to gauge real-world impact before flipping the import.
