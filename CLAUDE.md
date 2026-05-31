# CLAUDE.md — Love God, Love People

You are working in `jwesleykirk/love-god-love-people`, a private personal CRM Wesley built for himself. The full product brief is in `BRIEF.md` (and lives canonically in ChatPRD, UUID `a1381cd7-b390-49b3-9090-20a615a2084d`). Read `BRIEF.md` before non-trivial changes.

## What this app is

Wesley journals about people in his life; an AI extraction pipeline parses entries into structured properties attached to Person records — both filling values for known property types and *proposing brand-new property types* it discovers. He reviews extractions in an Extraction Review Console. The schema grows organically without DDL.

Single-user for v0.1, but every record carries `owner_id` from Phase 1 to enable multi-tenancy later. Path to native Swift iOS in Phase 5.

## Stack and key architectural choices

- **Backend:** Django 5 + Django REST Framework, Postgres on Railway.
- **Frontend:** React + Vite + TypeScript. Mobile-first.
- **Auth:** `django-allauth` Google OAuth with email allowlist (`GOOGLE_OAUTH_ALLOWED_EMAILS`).
- **AI:** OpenRouter → Claude Sonnet, called async via Django-Q2.
- **Background jobs:** Django-Q2 with Postgres broker. No Redis.

Three architectural decisions are load-bearing:

1. **EAV property bag.** `PropertyDef` (definitions) + `PersonProperty` (values). AI can introduce property definitions freely; AI *never* runs DDL.
2. **Async extraction.** `POST /api/entries/` returns immediately. A Django-Q2 task picks the entry up, calls OpenRouter, writes `pending_review` rows. The Review Console is where Wesley resolves them.
3. **Feature flags for auth and AI.** Both off by default so a fresh Railway deploy boots without secrets. `ENABLE_AUTH=True` flips on auth; presence of `OPENROUTER_API_KEY` flips on extraction.

## Feature folder convention

- **Django:** `backend/apps/<feature>/` owns its models, migrations, views, urls, serializers, admin, tests.
- **React:** `frontend/src/features/<feature>/` owns its routes, components, hooks, API client.
- Same name on both sides.
- Each React feature exports `<feature>Routes` from `routes.tsx`. `App.tsx` imports and spreads them.
- Feature `api.ts` files call through `src/lib/api.ts` — never `fetch` directly.

## Standard commands

```bash
# Backend
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py runserver
uv run python manage.py qcluster   # async extraction worker
uv run python manage.py test

# Frontend
cd frontend
npm install
npm run dev
npm run build
```

## Where the brief lives

- `BRIEF.md` at repo root — committed copy.
- Canonical source: ChatPRD document UUID `a1381cd7-b390-49b3-9090-20a615a2084d`.

If they disagree, ChatPRD wins. Flag the divergence; don't silently sync.

## Don't do

- **Never `ALTER TABLE` from AI.** Schema discovery uses `PropertyDef` rows.
- **Never commit secrets.** Read every credential from env.
- **Never add Redis.** Django-Q2 uses Postgres as broker.
- **Never serve the React build through anything but Django + WhiteNoise.**
- **Never fan out the data model with one-off columns for AI-discovered facts.** That's what `PropertyDef` is for.

## When you're about to ship

- Run `uv run python manage.py test` and `npm run build` cleanly.
- Don't add a dependency without checking it doesn't pull Redis transitively.
- If you changed the extraction prompt, bump the prompt version string in `apps/extraction/prompts/` and the new version will be recorded per-row in `PersonProperty.prompt_version`.
