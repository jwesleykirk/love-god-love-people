# AGENTS.md

Wesley's private personal CRM. Built so he can remember the people in his life — their kids, their work, their stories — and pray for them faithfully. Single-user for now; multi-tenant from day one in the data model.

## Start here

Read in this order:

1. `README.md` — what this is, how to run it locally
2. `CLAUDE.md` — code conventions, hard rules, source-of-truth map
3. `_docs/architecture.md` — data model, extraction pipeline, auth, feature flags
4. `BRIEF.md` — product intent (synced from ChatPRD, link inside)
5. `_docs/prompt-design.md` — when touching `apps/extraction/`
6. `_docs/data-model-v2.md` — the v0.2 schema design research, kept as historical rationale

## Hard rules (restated from CLAUDE.md)

- **No DDL from AI, ever.** Schema-by-discovery uses `PropertyDef` rows.
- **AI never directly creates Person records.** It proposes via `ProposedPerson`; Wesley approves in the Review Console.
- **No committed secrets.** Read from env.
- **No Redis.** Background jobs use Django-Q2 with Postgres broker.
- **No Age input anywhere.** Birthday only; age derived for display.
- **Plural pronouns always expand to per-referent rows** in extracted properties.
- **Uncertainty in entry text never produces extracted properties.** "I'm not sure" / "I've never heard" → leave as narrative.
- **Don't fan out the data model with one-off columns for AI-discovered facts.** That's what `PropertyDef` is for.

## How to ship a change

1. Tests green: `cd backend && uv run python manage.py test` and `cd frontend && npm run build`.
2. Migrations clean: `manage.py makemigrations` shows nothing pending.
3. Docs synced if relevant — schema change → update `_docs/architecture.md`; prompt change → update `_docs/prompt-design.md` and bump prompt version.
4. Commit with a message that names the version step if applicable ("v0.4: …").
5. `git push origin main` → `railway up --detach` from repo root → poll `railway deployment list`.
6. Smoke-check live: `curl /api/auth/me/` and load the SPA.

## Quick links

- Repo: https://github.com/jwesleykirk/love-god-love-people
- Brief (canonical): ChatPRD document UUID `a1381cd7-b390-49b3-9090-20a615a2084d`
- Live: https://web-production-0bdba.up.railway.app
