# Love God, Love People

> Synced from ChatPRD on 2026-05-31. Source of truth is ChatPRD document UUID `a1381cd7-b390-49b3-9090-20a615a2084d`. If this file and ChatPRD diverge, ChatPRD wins — re-sync and flag the drift.

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

- **Daily-use signal:** ≥1 journal entry per day for 30 consecutive days.
- **Extraction-quality signal:** ≥70% of AI-proposed property values approved without edit by Wesley after the first month.
- **Schema-discovery signal:** At least 5 distinct property types proposed and approved by AI in the first 30 days.
- **Recall signal:** Wesley correctly recalls the kids' names of his 10 closest friends after 90 days of use.
- **Ministry signal:** Wesley correctly recalls the names of all current Bridge students within 30 days of meeting them (target: 100%).
- **Prayer signal:** Wesley completes his daily prayer queue ≥5 days per week for 30 consecutive days.

## Phased Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 — Journal + DB + AI schema discovery + review console | People CRUD, entries, tagging, AI property extraction, review UI, Google OAuth | **shipped (v0.1)** |
| 1.1 — UX polish | Person edit form, entry processing-status indicator, New Property Definitions review surface | **shipped (v0.1.1)** |
| 1.5 — Foundational graph | Organizations + hierarchy, OrganizationMembership, PersonAssociation typed edges (22 seeded types), entries tag orgs, life_stage, birthday, deceased_at | **shipped (v0.2)** |
| 1.7 — Extraction discipline | ProposedPerson workflow (AI proposes new Person records for un-tagged people), prompt v2 (uncertainty discipline, plural-pronoun expansion), audit history via django-simple-history, approximate_birth_year supersession | **shipped (v0.3)** |
| 2 — Spaced repetition | Flag properties for review, daily queue, Anki-style intervals | planned |
| 3 — Prayer engine | Frequency per person (daily/weekly/monthly/none), daily queue, mark-as-prayed | planned |
| 4 — Photos | Object storage, face on profile, photo-name flashcards | planned |
| 5 — Private Swift iOS | Native Swift client, TestFlight, Sign in with Apple | planned |
| 6 — App Store | Multi-user, auth hardening, privacy, App Store review | planned |

## Architecture (current, post-v0.3)

- **Stack:** Django 5 + DRF + Postgres, React + Vite, Railway. See `_docs/architecture.md` for the canonical explainer.
- **Auth:** Google OAuth via `django-allauth`, email allowlist.
- **AI integration:** OpenRouter routing to Claude Sonnet. Prompts versioned in `apps/extraction/prompts/v{N}.py` and referenced per `PersonProperty` row.
- **Background processing:** Django-Q2 with Postgres broker. No Redis.
- **Audit history:** `django-simple-history` on PersonProperty, Person, PropertyDef, PersonAssociation, OrganizationMembership. Source tagged via `history_change_reason`.

## Decisions Locked

- **Project codename:** Love God, Love People.
- **Repo:** `jwesleykirk/love-god-love-people` (personal namespace).
- **Schema strategy:** EAV property bag (PropertyDef + PersonProperty) for AI-discoverable facts. First-class graph (Person, Organization, OrganizationMembership, AssociationType, PersonAssociation) for relationships and structure. **No DDL ever from AI.**
- **AI behavior:** AI never directly creates Person records. It proposes via `ProposedPerson`; Wesley approves in the Review Console.
- **Auth:** Google OAuth via `django-allauth`. Apple Sign-In added in Phase 5.
- **AI model:** OpenRouter routing to Claude Sonnet.
- **Background jobs:** Django-Q2 with Postgres broker. No Redis.
- **No Age field anywhere.** Birthday only; age derived for display. If only `approximate_birth_year` exists, display "~7 years old (approximate)".

## Risks

- **Personal CRMs have notoriously low retention.** The 30-day daily-use signal is the hold-or-fold gate.
- **AI extraction quality is the make-or-break.** Prompt iteration discipline matters.
- **Schema-by-discovery can run amok.** Mitigation: the Review Console's New Property Definitions surface forces regular curation.
- **Privacy of others' data.** Acceptable for private use; legal review needed before Phase 6.
- **Single-tenant trap.** Mitigation: `owner_id` FK on every record from day one.

For full user stories, functional requirements, and rationale, see ChatPRD (link at top of file).
