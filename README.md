# Love God, Love People

A private personal CRM that helps me remember the people in my life — their families, their kids, their stories — so I can ask better questions, pray more faithfully, and represent God's love through personal attention.

The core unlock: low-friction journaling backed by AI-driven schema discovery. Write a quick text entry; AI parses it into structured properties on the right Person record — and proposes new property types it discovers along the way. Wesley reviews everything in a dedicated console. The schema for AI-discoverable facts grows organically; the foundational graph (people, organizations, typed associations) is pre-loaded.

Single-user for v0.1 (Wesley). Architecture supports multi-user from day one. Path to a private Swift iOS app in Phase 5.

Full brief in [`BRIEF.md`](./BRIEF.md). Design system in [`_docs/design-system.md`](./_docs/design-system.md). Architecture explainer in [`_docs/architecture.md`](./_docs/architecture.md). Prompt design in [`_docs/prompt-design.md`](./_docs/prompt-design.md). Code conventions and hard rules in [`CLAUDE.md`](./CLAUDE.md).

## Stack

- **Backend:** Django 5 + Django REST Framework, Postgres
- **Frontend:** React 18 + Vite + TypeScript, mobile-first
- **Auth:** Google OAuth via `django-allauth`, email allowlist
- **Background jobs:** Django-Q2 with Postgres broker (no Redis)
- **AI:** OpenRouter → Claude Sonnet
- **Audit history:** `django-simple-history` on PersonProperty, Person, PropertyDef, PersonAssociation, OrganizationMembership
- **Deploy:** Railway (single service for API + SPA + worker)

## Local quickstart

Prereqs: Docker Desktop, Node 20+, Python 3.12+, [uv](https://docs.astral.sh/uv/).

```bash
cp .env.example .env
docker compose up -d

cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py runserver

# In another terminal
cd frontend
npm install
npm run dev
```

- Vite dev server: <http://localhost:5173> (proxies `/api/*` and `/accounts/*` to Django on 8000)
- Django dev server: <http://localhost:8000>

To run the async extraction worker (only needed once `OPENROUTER_API_KEY` is set):

```bash
cd backend && uv run python manage.py qcluster
```

## Feature flags

Both off by default so a fresh Railway deploy boots without any secrets configured:

- **`ENABLE_AUTH`** — when False, the app runs as the fixture user `wesley@local` (auto-created on first request). When True, Google OAuth + email allowlist are enforced.
- **`OPENROUTER_API_KEY` presence** — when empty, the async extraction task no-ops and logs "extraction skipped: no API key". When set, AI extraction runs for every new entry.

## Shipped scope

- **v0.1** — Person CRUD, JournalEntry with multi-person tagging, EAV property bag (PropertyDef + PersonProperty), async extraction pipeline (OpenRouter → Claude Sonnet), Review Console with Pending Values, Google OAuth, Railway deploy.
- **v0.1.1** — Person edit form, entry processing-status indicator, New Property Definitions review surface.
- **v0.2** — Foundational graph: Organizations (n-level parent hierarchy), OrganizationMembership (typed join with temporal validity), AssociationType (21 seeded types — spouse_of, parent_of, mentor_of, etc.), PersonAssociation (two-row storage), entries can tag orgs alongside people, Person.life_stage / birthday / deceased_at, extraction prompt v1.
- **v0.4** — Design system iteration: tokens (warm cream + sage/coral/lime palette, Source Serif Pro + Inter), Home page, restyled People list and Add Entry as paper-card. Placeholder illustration slots.
- **v0.3** — ProposedPerson workflow (AI proposes new Person records for un-tagged people), Review Console third tab "Proposed People", audit history via `django-simple-history`, extraction prompt v2 with uncertainty discipline + plural-pronoun expansion + standardized property names, `approximate_birth_year` PropertyDef with automatic supersession when `Person.birthday` is set.

## Shipped (practice)

- **Remember** — Spaced-repetition flashcards for approved properties (`/remember`).
- **Pray** — Unified guided prayer time (`/pray`, `/pray/session`): CRM due-queue, per-person rhythm, intro → guided segment per person (AI when `OPENROUTER_API_KEY` set) → pause → Amen.

## Planned

- **Phase 2+** — Per-property “flag for review” (deck curation beyond auto-sync)
- **Phase 3+** — Prayer streak ring, richer prompts
- **Phase 4** — Photos + face-name flashcards
- **Phase 5** — Private Swift iOS app via TestFlight
- **Phase 6** — App Store distribution
