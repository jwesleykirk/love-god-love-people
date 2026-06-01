# Architecture

Canonical high-level explainer for Love God, Love People as of v0.3. For the rationale on why we chose this shape, see `_docs/data-model-v2.md`. For the brief, see `BRIEF.md`.

## Data model

Two layers:

1. A **first-class graph** of records you expect to query, filter, and link (Person, Organization, OrganizationMembership, AssociationType, PersonAssociation, JournalEntry).
2. An **EAV property bag** for AI-discoverable facts (PropertyDef + PersonProperty) that lets the schema grow without DDL.

### First-class records

| Table | Purpose | Key columns |
|---|---|---|
| `people.Person` | The person being remembered. | `owner`, `full_name`, `preferred_name`, `relationship_category` (family/friend/work/neighbor/ministry/other), `life_stage` (optional, infant/toddler/child/teen/young_adult/adult/senior), `birthday` (nullable), `deceased_at` (nullable), `notes_markdown`, `archived` |
| `orgs.Organization` | Churches, ministries, employers, schools, communities, households. Self-referential `parent` enables n-level hierarchy. | `owner`, `name`, `org_type`, `parent` (FK self, nullable), `notes_markdown`, `archived` |
| `orgs.OrganizationMembership` | Typed Person↔Organization join with optional role and temporal validity. | `owner`, `person`, `organization`, `role` (free-form), `started_at`, `ended_at`. `current` = `ended_at IS NULL` |
| `associations.AssociationType` | Catalog of typed person-to-person edge types. 21 seeded (spouse_of, parent_of/child_of, sibling_of, close_friend_of, mentor_of/mentee_of, disciples/discipled_by, …). | `name`, `inverse_name`, `is_symmetric`, `category`, `description`, `system`, `sort_order` |
| `associations.PersonAssociation` | One row per direction of a logical edge. Created in pairs: forward and inverse. `paired_id` links the two rows so updates and deletes apply symmetrically. | `owner`, `from_person`, `to_person`, `association_type`, `started_at`, `ended_at`, `notes`, `paired_id` |
| `entries.JournalEntry` | The raw journal text. | `owner`, `content_markdown`, `mood_tag`, `extraction_status` (pending/running/done/skipped/error), `extraction_error` |
| `entries.PersonJournalEntry` | Tagging table: which people an entry is about. | `person`, `entry` |
| `entries.OrganizationJournalEntry` | Tagging table: which orgs an entry is about. | `organization`, `entry` |

### EAV property bag

| Table | Purpose | Key columns |
|---|---|---|
| `properties.PropertyDef` | The schema for AI-discoverable facts. AI proposes; Wesley curates. | `owner`, `name` (unique per owner, snake_case), `description`, `data_type_hint` (text/date/integer/boolean/enum/url), `status` (active/archived/merged), `merged_into`, `usage_count`, `first_proposed_at`, `first_proposed_from_entry`, `ai_confidence_on_creation`, `reviewed_at` |
| `properties.PersonProperty` | A value attached to a Person via a PropertyDef. | `owner`, `person`, `property_def`, `value_text`, `ai_confidence`, `source_entry`, `prompt_version`, `model`, `status` (pending_review/approved/rejected/edited/superseded), `created_at`, `reviewed_at` |

**Seeded PropertyDefs** (created by `apps/properties/migrations/0003_seed_standard_property_defs.py` + `0004_seed_prayer_and_core_property_defs.py` for every User): `current_school_type`, `current_school_name`, `approximate_birth_year`, `loves_music`, `religion`, `current_prayer_requests`, `current_stressors`, `upcoming_life_events`, `health_concerns`, `family_concerns`, `spiritual_state`.

### Extraction-side staging

| Table | Purpose | Key columns |
|---|---|---|
| `extraction.ProposedPerson` | A Person the AI inferred from an entry but Wesley didn't tag. Awaits Wesley's Create/Reject decision in the Review Console. | `owner`, `source_entry`, `full_name`, `preferred_name`, `life_stage`, `ai_confidence`, `proposal_payload` (JSON: proposed associations + properties), `prompt_version`, `model`, `status` (pending_review/created/rejected), `resolved_to_person` (FK, set on Create) |

### Phase-2 / Phase-3 scaffolds

`future.PrayerSchedule` and `future.ReviewMemo` are scaffolded so the schema is already in place when those features are built. No UI or business logic references them yet.

### Audit history

`django-simple-history` is applied to **PersonProperty, Person, PropertyDef, PersonAssociation, OrganizationMembership**. Each generates a parallel `Historical{Model}` table that captures every save (and delete) along with a `history_change_reason` string. Source tagging convention:

- `ui:user_id={id}` — set by viewsets on user-driven CRUD
- `ui:user_id={id}:approve|reject|edit|delete` — for specific actions
- `ai_extraction:entry_id={id}` — set by the extraction task on writes
- `ai_extraction:entry_id={id}:proposed_person={id}` — for ProposedPerson → real-person materialization
- `superseded:birthday_set_on_person={id}` — set by the `approximate_birth_year` supersession signal

Main queries hit the live tables only; history queries are opt-in. Currently exposed via `GET /api/properties/{id}/history/`. UI for the other models' history is deferred.

## Extraction pipeline

```
┌─ POST /api/entries/ ─────────────────────────────────────────────┐
│  serializer creates JournalEntry + PersonJournalEntry +          │
│  OrganizationJournalEntry rows                                   │
│  ─→ enqueue async_task("apps.extraction.tasks.run_extraction")   │
│  ─→ respond 201 immediately                                       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Django-Q2 worker picks up)
┌─ run_extraction(entry_id) ───────────────────────────────────────┐
│  if not OPENROUTER_API_KEY: mark "skipped" and return            │
│  set extraction_status=running                                    │
│  build persons_context, organizations_context, types_context     │
│  build system+user prompt from apps/extraction/prompts/v2_2.py   │
│  call OpenRouter (services/openrouter.py)                        │
│  on error: mark "error" + store extraction_error                 │
│  on success: _persist_extraction(entry, result)                  │
│  mark "done"                                                      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─ _persist_extraction ────────────────────────────────────────────┐
│  for each existing_property_values row:                          │
│    ─→ create PersonProperty (status=pending_review)              │
│  for each new_property_proposals row:                            │
│    ─→ create-or-fetch PropertyDef (status=active, unreviewed)    │
│    ─→ create PersonProperty (status=pending_review)              │
│  for each proposed_persons row:                                  │
│    ─→ create ProposedPerson (status=pending_review)              │
│       (associations + properties stored in proposal_payload JSON)│
│  Each write sets _change_reason on the model for simple_history. │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              Review Console reads from these three streams
```

## Review Console — three surfaces

| Tab | Reads from | User actions → state changes |
|---|---|---|
| **Pending Values** | `PersonProperty` where status=pending_review, grouped by source entry | Approve → status=approved · Edit → status=edited + new value_text · Reject → status=rejected |
| **New Properties** | `PropertyDef` where status=active AND reviewed_at IS NULL | Keep → reviewed_at=now · Rename → name + description updated · Merge into [target] → status=merged, merged_into set, all `PersonProperty` rows repointed to target · Archive → status=archived |
| **Proposed People** | `ProposedPerson` where status=pending_review | Create → new `Person` row materialized; proposal_payload's associations become real `PersonAssociation` two-row writes; proposal_payload's properties become `PersonProperty` rows with status=pending_review (so they surface back in tab 1). status=created, resolved_to_person set · Reject → status=rejected |

Each action also writes a history row via `django-simple-history` with a `ui:user_id=…` reason.

## Auth flow

```
Browser ─→ React SPA at /          (served by Django + WhiteNoise)
                                    React calls /api/auth/me/
                                    ─→ if authenticated: render app
                                    ─→ if not + auth_enabled: render "Sign in with Google"
                                       button that links to /accounts/google/login/

Browser ─→ /accounts/google/login/  (django-allauth)
                                    ─→ redirect to Google OAuth
                                    ─→ callback /accounts/google/login/callback/
                                    ─→ allauth runs AllowlistSocialAccountAdapter.pre_social_login
                                       ─→ if email not in GOOGLE_OAUTH_ALLOWED_EMAILS: 403
                                       ─→ otherwise: create/get User, set session, redirect to /
```

When `ENABLE_AUTH=False`, `FixtureUserMiddleware` runs after `AuthenticationMiddleware` and auto-logs-in the fixture user `wesley@local` for every request. Lets the app run end-to-end with no OAuth setup — used for the very first Railway deploy and for local dev.

## Feature flag pattern

Two flags. Both default off so a fresh Railway deploy can boot before any secrets are configured.

| Flag | Off behavior | On behavior |
|---|---|---|
| `ENABLE_AUTH` | `FixtureUserMiddleware` auto-logs-in `wesley@local`. No OAuth required. | Middleware no-ops. Anonymous users get the sign-in CTA in the SPA. Google OAuth + allowlist enforced. |
| Presence of `OPENROUTER_API_KEY` | Extraction task no-ops, marks entry `extraction_status=skipped`, logs a notice. Review Console stays empty. | Extraction runs against OpenRouter for every new entry. |

This lets Wesley get a working URL up before he's done with Google Cloud Console or OpenRouter signup.

## Phase 2/3 handoff notes

- **Spaced repetition (Phase 2)** currently schedules only `PersonProperty` rows via `future.ReviewMemo`; first-class graph facts (associations/memberships) are not yet memo-scheduled.
- **Prayer engine (Phase 3)** already has cadence scaffolding in `future.PrayerSchedule` (`frequency`, `last_prayed_at`, `next_due_at`) and should pair it with recent approved/relevant `PersonProperty` values.
- Prompt/seed baseline has been prepared for prayer context via v2.2 and seeded prayer-oriented `PropertyDef` names.

## Source-typing convention for audit history

When viewing the historical record list for any model, every row carries a `change_reason` string. The convention:

- Starts with `ui:user_id={id}` for any UI-driven CRUD action.
- Starts with `ai_extraction:entry_id={id}` for any write originating from the extraction pipeline.
- Starts with `superseded:` for signal-driven status flips (currently only `approximate_birth_year`).

If you add a new write path that mutates one of the audited models, set `_change_reason` before calling `save()` so the history row carries provenance.
