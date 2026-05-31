# Love God, Love People

> Source of truth lives in ChatPRD (document UUID `a1381cd7-b390-49b3-9090-20a615a2084d`). This file is a snapshot. If they diverge, ChatPRD wins.

## Summary

A private personal CRM that helps Wesley remember people — their lives, their kids, their needs — so he can ask better questions, pray more faithfully, and represent God's love through personal attention. **The core unlock is low-friction journaling backed by AI-driven schema discovery**: Wesley writes a quick text entry, AI parses it into structured properties attached to the right Person record — including *proposing brand-new property types* it discovers from his journaling. Wesley reviews everything in a dedicated console. The data structure evolves as Wesley uses the app.

Built as a Django + DRF + React + Postgres web app on Railway first, scaled to a private Swift iOS app via TestFlight, eventually App Store. Single-user (Wesley) for v0.1; architecture supports multi-user from day one.

## Problem

Wesley struggles to remember names, faces, and the personal details of people he wants to love well — especially the college students he disciples in the Bridge ministry. Existing tools fail him for two reasons: (1) general note apps don't surface relevant details at the right moment, and (2) any system that requires Wesley to manually maintain structured records about people will atrophy within weeks. He needs *capture so cheap it survives a tired Tuesday*, with AI doing the structuring work in the background — and a schema flexible enough to capture whatever Wesley actually writes about, without him pre-thinking the data model.

## Target User

- **v0.1 – v1.0:** Wesley, single user. Personal use only.
- **Long-term:** Other Christians (and any caring person) who want to be more present in others' lives. App Store distribution as a future possibility, but not a constraint on early design.

## Goals

- **Low-friction capture.** Wesley writes a short text entry from his phone and the system handles structuring.
- **Schema-by-discovery.** AI extracts properties from journal entries; when a new kind of property appears (e.g., "birthday"), AI proposes it as a new property type. The schema grows organically with use, without DDL.
- **High-quality structured recall.** Wesley reviews and refines AI extractions in a console; the property catalog improves over time.
- **Better connection.** Wesley recalls names, family details, and life events more reliably than he does now.
- **Faithful prayer.** Wesley prays for specific people on a cadence that matches their place in his life.
- **Path to scale.** Code scales cleanly from web prototype to private Swift iOS app to public App Store release without major rewrites.

## Non-Goals (for v0.1)

- Multi-user accounts, sharing, or social features.
- Photos / face recognition (deferred to Phase 4).
- Native iOS app (web app first; Swift iOS in Phase 5).
- Public App Store distribution (Phase 6).
- AI-generated conversation prompts or sermon prep.
- Voice input.

## Success Signals

*(Placeholders — Wesley to refine after first 30 days of use.)*

- **Daily-use signal:** ≥1 journal entry per day for 30 consecutive days.
- **Extraction-quality signal:** ≥70% of AI-proposed property values approved without edit by Wesley after the first month.
- **Schema-discovery signal:** At least 5 distinct property types proposed and approved by AI in the first 30 days.
- **Recall signal:** Wesley correctly recalls the kids' names of his 10 closest friends after 90 days of use.
- **Ministry signal:** Wesley correctly recalls the names of all current Bridge students within 30 days of meeting them.
- **Prayer signal:** Wesley completes his daily prayer queue ≥5 days per week for 30 consecutive days.

## User Stories by Phase

### Phase 1 — Journal + DB + AI Schema Discovery (MVP)

- Add a Person record with name, relationship category (friend / family / Bridge student / other), and free-form notes.
- Write a quick text journal entry tagged to one or more Person records. The full entry is always saved verbatim, regardless of what AI extracts.
- System runs each entry through an AI extraction pass that proposes (a) values for *known* property types and (b) brand-new property types when something novel comes up.
- Open the **Extraction Review Console** to see (a) pending property values to approve/edit/reject, and (b) newly-proposed property definitions to keep, rename, merge, or archive.
- View a Person's profile and see (a) the chronological timeline of journal entries and (b) a structured property list grouped sensibly.
- Search and filter people by name, relationship, recent mention, or property value.

### Phase 2 — Spaced Repetition for Properties

- Flag specific property values as "remember this" (e.g., kid's name).
- Daily review queue scored using a simplified Anki-style algorithm.
- Rate each review Easy / Hard / Forgot; the next interval adjusts accordingly.

### Phase 3 — Prayer Engine

- Set a prayer frequency on each Person: **daily, weekly, monthly, or none**. UI default shows blank for none.
- See a daily prayer queue of people due to be prayed for today.
- Mark a person as "prayed for" and they roll forward to their next scheduled date.
- Attach specific prayer requests / focuses to each Person.

### Phase 4 — Photos

Initial scope: photo per Person, face-name flashcards integrated into spaced rep.

### Phase 5 — Private Swift iOS App

Native Swift client via TestFlight, hitting the same backend API. Sign in with Apple alongside Google login.

### Phase 6 — App Store

Multi-user, auth hardening, privacy posture suitable for App Store review.

## The Extraction Review Console (Phase 1 — first-class feature)

This is **the main feedback loop** that keeps schema discovery and value extraction useful over time. Two surfaces:

### A. Pending Property Values

- Reverse-chronological list of journal entries.
- For each entry: input text, AI-proposed property values (with confidence), action buttons per value (Approve / Edit / Reject).
- Bulk-approve high-confidence values.
- Prompt version + model used (e.g., `claude-sonnet-4.5`, prompt v3) shown per entry.

### B. New Property Definitions

- List of PropertyDef rows where `first_proposed_at` is recent and not yet "blessed" by Wesley.
- For each: proposed name, AI-generated description, AI-suggested data type, the journal entry that triggered the proposal, the value(s) AI assigned.
- Actions: **Keep**, **Rename**, **Merge into [existing property]**, **Archive**.
- "Rejected facts" log so Wesley can spot prompt patterns that produce bad output.

### Developer-side actions (manual, periodic)

- Promote a PropertyDef with high usage to a first-class column (writes a migration).
- A/B prompt experiments: same entry through two prompt versions, compare extractions.

## Functional Requirements — Phase 1

### Data Model

The schema uses an EAV (Entity-Attribute-Value) pattern for AI-discovered properties so that new property types can be added without DDL.

- **Person:** id, owner_id, full_name, preferred_name, relationship_category (enum), notes_markdown, created_at, updated_at, archived
- **JournalEntry:** id, owner_id, content_markdown, mood_tag (optional), created_at, updated_at
- **PersonJournalEntry** (join): person_id, entry_id
- **PropertyDef:** id, owner_id, name, description, data_type_hint, first_proposed_at, first_proposed_from_entry_id, ai_confidence_on_creation, status, merged_into_id, usage_count
- **PersonProperty:** id, owner_id, person_id, property_def_id, value_text, ai_confidence, source_entry_id, prompt_version, model, created_at, reviewed_at, status
- **PrayerSchedule** (Phase 3 scaffold): id, owner_id, person_id, frequency, last_prayed_at, next_due_at
- **ReviewMemo** (Phase 2 scaffold): id, person_property_id, ease_factor, interval_days, due_at

All tables scaffolded from Phase 1 migration; UI feature flags hide Phase 2+ surfaces.

### Extraction Pipeline (Phase 1)

1. `POST /api/entries/` saves the JournalEntry and creates PersonJournalEntry rows for tagged persons. Saves are optimistic — the response returns immediately without waiting for AI extraction.
2. A Django-Q2 task picks up the new entry asynchronously and sends to OpenRouter (Claude Sonnet) with the entry's text + for each tagged person their name, current property values, and relevant PropertyDefs.
3. The AI returns structured JSON: `existing_property_values`, `new_property_proposals`, `narrative_only`.
4. For each existing value: insert PersonProperty with `status='pending_review'`.
5. For each new proposal: insert PropertyDef + PersonProperty (both `pending_review`).
6. The Extraction Review Console reads from these tables.
7. On approve/edit/reject, status transitions and `reviewed_at` is set.
8. Failed extractions retry with backoff; persistent failures surface in the console as an error row (not silent).

### API Endpoints (Phase 1)

- `/api/people/` — full CRUD
- `/api/entries/` — full CRUD, with `person_ids[]` on create
- `/api/property-defs/` — GET (filterable), PATCH (rename/edit/archive/merge), POST (manual add)
- `/api/properties/` — GET (filterable), PATCH (approve/edit/reject)
- `/api/entries/:id/re-extract/` — POST to force re-run
- All endpoints filter by `owner_id` from the authenticated user.

### Frontend (Phase 1)

- People list — searchable, filterable
- Person detail — profile, property list, entry timeline
- Add Entry — text input, person tagger, optimistic save
- Extraction Review Console — Pending Values surface (New Property Definitions surface in v0.1.1)
- Mobile-first responsive
- PWA manifest (deferred to v0.1.1)

## Architecture

- **Stack:** Django + DRF, React + Vite, Postgres, Railway.
- **Auth:** Google OAuth via `django-allauth`. Email allowlist for v0.1. Prepares for Phase 5 Sign in with Apple.
- **AI integration (Phase 1):** OpenRouter / Claude Sonnet. Prompt versions stored in code + referenced per PersonProperty row.
- **Background processing:** Django-Q2 with Postgres broker. No Redis.
- **iOS path (Phase 5):** Native Swift client consumes the same JSON API.
- **Privacy posture:** All data in Wesley's private Railway Postgres.

## Phased Roadmap

| Phase | Scope | Rough effort |
|---|---|---|
| 1 — Journal + DB + AI schema discovery + review console | People CRUD, entries, tagging, AI property extraction, review UI, timeline + property views, Google OAuth | ~1–2 weeks |
| 2 — Spaced repetition | Flag properties for review, daily queue, Anki-style intervals | ~1 week |
| 3 — Prayer engine | Frequency per person, daily prayer queue, mark-as-prayed | ~3–4 days |
| 4 — Photos | Object storage, photo-name flashcards | ~1 week |
| 5 — Private Swift iOS | Native Swift client, TestFlight, Sign in with Apple | 4–8 weeks |
| 6 — App Store | Multi-user, auth hardening, privacy review | TBD |

## Open Questions

- **Prompt v0.** One prompt with structured output is the v0 choice. Iterate from real entries.
- **Property promotion criteria.** Heuristic: ≥20 people with values, ≥3 months stable. Promotion is a manual developer action with a migration.
- **Fuzzy property merging.** Console needs to surface high-similarity property names (Phase 1.5 polish).
- **Backup strategy.** Weekly `pg_dump` to Google Drive via Railway cron — deferred to v0.1.1.

## Risks

- **Personal CRMs have notoriously low retention.** 30-day daily-use signal is the hold-or-fold gate. If unmet by day 45, retire honestly.
- **AI extraction quality is the make-or-break.** Prompt iteration in the first 2-3 weeks is critical.
- **Schema-by-discovery can run amok.** Mitigation: regular review of New Property Definitions, AI prompt discourages overly-specific properties, console makes "Archive" one-click.
- **Privacy of others' data.** Acceptable for private use; before Phase 6, requires legal review.
- **Prayer queue as chore vs. discipline.** Mitigation: opt-in per person (default blank), keep daily queue short.
- **Single-tenant trap.** Mitigation: `owner_id` FK on every record from Phase 1.

## Decisions Locked (2026-05-31)

- **Project codename:** Love God, Love People.
- **Repo namespace:** personal — `jwesleykirk/love-god-love-people`.
- **Schema strategy:** EAV property bag pattern. AI can introduce property definitions; no DDL from AI ever.
- **AI extraction is Phase 1, not Phase 2.**
- **Prayer cadence options:** daily, weekly, monthly, none.
- **iOS approach:** native Swift in Phase 5.
- **Auth:** Google OAuth via `django-allauth`. Apple Sign-In added in Phase 5.
- **AI model:** OpenRouter routing to Claude Sonnet (latest, slug to be confirmed at scaffold time).
- **Background jobs:** Django-Q2 with Postgres broker. No Redis.
