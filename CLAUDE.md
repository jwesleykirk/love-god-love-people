# CLAUDE.md — Love God, Love People

You're working in `jwesleykirk/love-god-love-people`, Wesley's private personal CRM. The full product brief lives in ChatPRD (UUID `a1381cd7-b390-49b3-9090-20a615a2084d`) with a synced copy in `BRIEF.md`. Read `BRIEF.md` and `_docs/architecture.md` before non-trivial changes.

## What this app is

Wesley journals about people in his life. An AI extraction pipeline parses each entry into structured facts:

- **Values** for known property types (e.g., `mother_name = Linda`)
- **New property types** the AI discovers and proposes (Wesley keeps/renames/merges/archives them in the Review Console)
- **New Person records** the AI infers from the entry but Wesley didn't tag (e.g., "Alfonso's wife Kimberly" → `ProposedPerson`)

Wesley reviews everything in the Review Console (three tabs: Pending Values, New Properties, Proposed People). The schema for AI-discoverable facts grows organically; the foundational graph (Person, Organization, AssociationType, etc.) is pre-loaded.

Single-user (Wesley) for v0.1, but every record carries `owner_id` to enable multi-tenancy in Phase 6.

## Stack and key dependencies

- **Backend:** Django 5.2 + Django REST Framework, Postgres
- **Frontend:** React 18 + Vite + TypeScript, mobile-first
- **Auth:** `django-allauth` Google OAuth + email allowlist (`GOOGLE_OAUTH_ALLOWED_EMAILS`)
- **Background jobs:** `django-q2` with **Postgres broker (no Redis)**
- **AI:** OpenRouter → Claude Sonnet (slug in `OPENROUTER_MODEL`)
- **Audit history:** `django-simple-history` on PersonProperty, Person, PropertyDef, PersonAssociation, OrganizationMembership
- **Deploy:** Railway (single service for API + SPA + worker)

## Architecture overview

Three load-bearing patterns. All documented in detail in `_docs/architecture.md`; this is the orientation.

1. **EAV property bag.** `PropertyDef` (the definitions) + `PersonProperty` (the values). AI can introduce new property definitions; AI *never* runs DDL. The Review Console is the curation surface.
2. **First-class graph above the EAV.** `Person`, `Organization` (with n-level `parent_id` self-ref), `OrganizationMembership` (typed join with temporal validity), `AssociationType` (catalog; 21 seeded), `PersonAssociation` (two-row storage per logical edge with `paired_id`).
3. **Async extraction.** `POST /api/entries/` returns immediately. A Django-Q2 task picks the entry up, calls OpenRouter, writes pending rows to four tables: `PersonProperty` (values), `PropertyDef` (new property proposals), and `ProposedPerson` (new Person proposals). The Review Console reads from all three.

**Feature flags (both off by default so a fresh deploy boots without secrets):**

- `ENABLE_AUTH` — off → app runs as fixture user `wesley@local`; on → Google OAuth + allowlist
- Presence of `OPENROUTER_API_KEY` — empty → extraction task no-ops and logs "skipped: no api key"; set → live AI

## Code conventions

- **One Django app per feature.** Each app under `backend/apps/<feature>/` owns its models, migrations, views, urls, serializers, admin, tests.
- **React features mirror the Django app names.** `frontend/src/features/<feature>/` owns its routes, components, hooks, API client. Same name on both sides.
- **Tests live next to code.** Each app's `tests.py` (or `tests/`) runs via `manage.py test`.
- **One prompt version per file.** `apps/extraction/prompts/v{N}.py` with a `VERSION` string and a `build_user_prompt` function. The active version is imported by `tasks.py`. Old versions stay in the tree as reference.
- **Feature `api.ts` files call through `src/lib/api.ts`** — never `fetch` directly. That's where CSRF tokens and credentials attach.
- **Each React feature exports `<feature>Routes` from `routes.tsx`.** `App.tsx` imports and spreads them.
- **Audit history is opt-in click-through.** Profile pages show current state only. UI history view is implemented for PersonProperty; other models capture history server-side but UI is deferred.

## Hard rules (the "don't do" list)

- **Never run DDL from AI.** Schema-by-discovery happens via `PropertyDef` rows. AI never `ALTER TABLE`s anything.
- **AI never directly creates Person records.** It proposes via `ProposedPerson` and Wesley approves in the Review Console (`Create` action).
- **Never commit secrets.** Read every credential from env: `DJANGO_SECRET_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_ALLOWED_EMAILS`.
- **Never add Redis.** Django-Q2 uses Postgres as broker by design.
- **Never put an Age input anywhere.** Birthday only. Age is derived for display. If only `approximate_birth_year` exists, display "~N years old (approximate)".
- **Plural pronouns always expand to per-referent rows.** "Alfonso and Kimberly love music" → one `loves_music=true` row per person, never a single combined row.
- **Uncertainty in entry text never produces extracted properties.** "I'm not sure how devout they are" → zero property extraction. The Alfonso Morales paragraph (see `_docs/prompt-design.md`) is the canonical regression test.
- **Never fan out the data model with one-off columns for AI-discovered facts.** That's what `PropertyDef` is for. Promotion of a stable PropertyDef to a first-class column is a manual developer action with a migration.

## Source-of-truth map

- **Brief** — ChatPRD doc UUID `a1381cd7-b390-49b3-9090-20a615a2084d` (synced to `BRIEF.md`)
- **Architecture explainer** — `_docs/architecture.md`
- **Data model rationale** — `_docs/data-model-v2.md` (the v0.2 research + decisions)
- **Prompt design** — `_docs/prompt-design.md` (versions, rules, Alfonso fixture)
- **Code conventions / hard rules** — this file

When in doubt, the brief wins. When the brief and a hard rule disagree, surface the conflict.

## Current implementation snapshot (post v0.3 patches)

- Active extraction prompt is **`apps/extraction/prompts/v2_2.py`** (imported by `apps/extraction/tasks.py`).
- Prompt v2.2 keeps v2.1 discipline rules and adds standardized prayer/recall property names.
- Seeded PropertyDefs currently include:
  - school/birth baseline: `current_school_type`, `current_school_name`, `approximate_birth_year`
  - prayer/core baseline: `loves_music`, `religion`, `current_prayer_requests`, `current_stressors`, `upcoming_life_events`, `health_concerns`, `family_concerns`, `spiritual_state`
- Seed migrations:
  - `apps/properties/migrations/0003_seed_standard_property_defs.py`
  - `apps/properties/migrations/0004_seed_prayer_and_core_property_defs.py`

## Common commands

```bash
# Backend
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py runserver
uv run python manage.py qcluster   # async extraction worker; needs OPENROUTER_API_KEY
uv run python manage.py test

# Frontend
cd frontend
npm install
npm run dev
npm run build

# Deploy
git push origin main
railway up --detach     # from repo root, after `railway link` to the love-god-love-people project
railway deployment list # poll status
railway logs --deployment <id>
```

## When you're about to ship

- `uv run python manage.py test` is clean (currently 22 tests).
- `npm run build` is clean.
- Migrations created for any model changes (`manage.py makemigrations` lists nothing pending).
- If you changed the extraction prompt: bump the version (new file `apps/extraction/prompts/v{N}.py`), update the import in `tasks.py`, update `_docs/prompt-design.md`, and add a structural test.
- If you changed the data model: update `_docs/architecture.md` and `_docs/data-model-v2.md` (or supersede the latter with a new doc).
- If you changed user-facing copy/behavior: consider whether `BRIEF.md` needs a re-sync from ChatPRD.
