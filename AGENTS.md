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

## Response format

End **every** reply with these three lines (use the exact labels):

1. **TLDR** — One or two sentences: what changed, what we learned, or what’s blocked.
2. **What I need from you** — Only real blockers (decision, credential, manual step, explicit approval). If work is done and diligence is covered, write **Nothing**.
3. **Worth a look** — Subjective things Wesley may want to eyeball (copy, layout, UX judgment calls). Include a **preview link** when one exists; otherwise say there is nothing subjective to review.

**Preview links**

- After UI changes: path on local dev (`http://localhost:5173/…` when the dev server is running) or on [live](https://web-production-0bdba.up.railway.app) after deploy.
- Backend-only, docs-only, or non-visual work: no preview link — state that explicitly.
- Do not invent URLs; link only to routes you know exist.

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
4. Commit when Wesley asks (message names the version step if applicable, e.g. `v0.8: …`).
5. **Deploy** (prototype: **always keep GitHub and Railway in sync** after shippable work on `main`):
   - Push: `git push origin main` (default yes for prototype — do not wait to be asked).
   - **Ship code:** `railway-local` → `deploy` (or `railway up --detach` from repo root), then `get_logs` until SUCCESS.
   - **Quick rebuild** (no new upload): `railway` → `redeploy`.
   - **CLI fallback** (if MCP unavailable): `railway up --detach` from repo root, then `railway deployment list` / `railway logs --deployment <id>`.
   - **Debug a failed deploy:** `railway` → `railway-agent` (or `railway agent -p "…"` in terminal).
6. Smoke-check live: `https://web-production-0bdba.up.railway.app/api/auth/me/` and load the SPA.

### Railway MCP (one-time setup)

Configured in **both** `.cursor/mcp.json` (project) and `~/.cursor/mcp.json` (global). Two servers:

| Server | Transport | Auth |
|--------|-----------|------|
| `railway` | Remote `https://mcp.railway.com` | OAuth when Cursor prompts |
| `railway-local` | `railway mcp` (stdio) | Uses existing `railway login` CLI session |

After editing MCP config:

1. **Restart Cursor** (full quit, not reload window).
2. **Settings → Tools & MCP** — enable both Railway entries if they appear disabled.
3. **Remote:** click **Connect** / sign in when OAuth opens.
4. **Local fallback:** if remote never appears, use `railway-local` (requires `railway` on PATH: `/opt/homebrew/bin/railway`).
5. Confirm in chat: `check-railway-status` or list services for `love-god-love-people`.

If still missing: run `railway mcp install --agent cursor --remote` from the repo, then restart again.

### Which Railway MCP when

Keep **both** enabled. Default to **local for ship/configure**, **remote for diagnose/redeploy**.

| Goal | Server | Tools |
|------|--------|-------|
| Deploy current working tree | `railway-local` | `deploy` → `get_logs` → `list_deployments` |
| Env vars (inspect / set) | `railway-local` | `list_variables`, `set_variables` |
| Metrics / health | `railway-local` | `environment_status`, `service_metrics`, `http_error_rate` |
| Redeploy without re-upload | `railway` | `redeploy`, `get_status` |
| Build failed / crash loop / 502 | `railway` | **`railway-agent`** (pass project + environment IDs) |
| Logs / list services (overlap) | `railway-local` first | Uses linked project; remote needs explicit IDs |

**Agent prompts that work well:**

- *Deploy `web` from this repo and tail build logs until SUCCESS.*
- *List env vars for `web` (redact values) — confirm `OPENROUTER_API_KEY` is set.*
- *Use railway-agent: last `web` deploy failed — find the Nixpacks error and suggest a fix.*

**Rule:** `railway-local` = ship & configure · `railway` = diagnose (`railway-agent`) & redeploy.

## Quick links

- Repo: https://github.com/jwesleykirk/love-god-love-people
- Brief (canonical): ChatPRD document UUID `a1381cd7-b390-49b3-9090-20a615a2084d`
- Live: https://web-production-0bdba.up.railway.app


## Design system

Visual tokens and component specs live in `_docs/design-system.md`. Implementation in `frontend/src/styles/tokens.css`.

**Hard rules:** always read from CSS variables — never hardcode hexes. Illustrations land in `frontend/public/illustrations/` (Wesley generates them separately; placeholders are in place).
