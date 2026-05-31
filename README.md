# Love God, Love People

A private personal CRM that helps me remember people — their lives, their kids, their needs — so I can ask better questions, pray more faithfully, and represent God's love through personal attention.

**The core unlock:** low-friction journaling backed by AI-driven schema discovery. Write a quick text entry; AI parses it into structured properties on the right Person record, including proposing brand-new property types as it discovers them. Review everything in a dedicated console. Single-user for v0.1; architecture supports multi-user from day one.

Built as a Django + DRF + React + Postgres web app on Railway, with a path to a native Swift iOS app in Phase 5. Full product brief in [`BRIEF.md`](./BRIEF.md). Authoritative source lives in ChatPRD.

## Stack

- **Backend:** Django 5 + Django REST Framework, Postgres
- **Frontend:** React + Vite + TypeScript, mobile-first
- **Auth:** Google OAuth via `django-allauth`, allowlist-gated for v0.1
- **AI extraction:** OpenRouter → Claude Sonnet, async via Django-Q2 (Postgres broker)
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

- Vite dev server: <http://localhost:5173> (proxies `/api/*` to Django on 8000)
- Django dev server: <http://localhost:8000>

Run the async extraction worker (only needed once `OPENROUTER_API_KEY` is set):

```bash
cd backend && uv run python manage.py qcluster
```

## Feature flags

Auth and AI extraction are off by default so the first Railway deploy boots without secrets:

- **Auth** — `ENABLE_AUTH=False` runs the app as the fixture user `wesley@local` (auto-created on first request). `ENABLE_AUTH=True` requires Google OAuth and the user's email must appear in `GOOGLE_OAUTH_ALLOWED_EMAILS`.
- **AI extraction** — controlled by the presence of `OPENROUTER_API_KEY`. When empty, the async task logs "extraction skipped: no API key" and the Review Console stays empty.

## Phase 1 v0.1 scope

- Person CRUD
- JournalEntry CRUD with multi-person tagging
- PropertyDef + PersonProperty (EAV property bag)
- Async extraction pipeline (OpenRouter → Claude Sonnet)
- Extraction Review Console — Pending Values surface
- Google OAuth with allowlist
- Railway deploy

Deferred to v0.1.1: New Property Definitions review surface, PWA manifest, advanced search, pg_dump backup cron.

## Don't

- No DDL from AI — schema discovery happens via PropertyDef rows.
- No committed secrets — everything via env vars.
- No Redis — background jobs use Django-Q2 with Postgres broker.
