# S3 Prototype Template

Default scaffold for new S3 internal prototypes per the [S3 New App Playbook](../S3-Cowork/_context/s3-new-app-playbook.md).

Stack: **Django + Postgres + React (Vite) + Railway**, with Microsoft Entra OIDC auth and OpenRouter (Claude) wired as stubs.

```
.
├── backend/                  Django project (uv-managed)
│   ├── manage.py
│   ├── pyproject.toml
│   ├── config/               Django project shell
│   │   ├── settings/         base.py + dev.py + prod.py (env-selected)
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/                 Feature apps (each owns models + views + urls)
│   │   ├── example/          Example feature — replace when building
│   │   └── accounts/         Entra OIDC stubs (CONFIGURE ME markers)
│   └── services/
│       └── ai.py             OpenRouter chat() helper (uses `requests`)
├── frontend/                 Vite + React + TypeScript
│   └── src/
│       ├── lib/api.ts        Shared API client (attaches auth headers)
│       └── features/
│           └── example/      Mirrors backend feature; copy this when scaffolding
├── docker-compose.yml        Local Postgres 16
├── railway.toml              Single-service deploy config
├── .env.example              Required env vars (Django, Entra, OpenRouter)
└── NEXT-STEPS.md             Wesley's first-time setup cheat sheet
```

---

## Local dev quickstart

Prereqs: Docker Desktop, Node 20+, Python 3.12+, [uv](https://docs.astral.sh/uv/).

```bash
# 1. Copy env template and fill in values
cp .env.example .env

# 2. Start Postgres
docker compose up -d

# 3. Backend (terminal 1)
cd backend
uv sync
uv run python manage.py makemigrations
uv run python manage.py migrate
uv run python manage.py runserver

# 4. Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

Vite dev server: <http://localhost:5173> (proxies `/api/*` to Django on 8000).
Django dev server: <http://localhost:8000>.

For a production-like local check (Django serving the built SPA on a single port):

```bash
cd frontend && npm run build
cd ../backend && uv run python manage.py collectstatic --noinput
uv run python manage.py runserver
```

---

## Deploying to Railway

The full first-time path lives in [NEXT-STEPS.md](./NEXT-STEPS.md). Short version:

```bash
railway init      # one Railway project per app
railway add       # add Postgres plugin
railway up        # deploy from local
railway domain    # generate a *.up.railway.app URL
```

Build command and start command are declared in `railway.toml`. Set all the env vars from `.env.example` in the service's **Variables** tab (Raw Editor is fastest).

---

## Graduation — why the example feature looks the way it does

Every prototype should be one Tempo or Broomer merge away from production. The playbook's second principle ("Structure every prototype for graduation") only pays off if every feature is self-contained from day one.

**Concretely:**

- **Django side:** Every feature is its own app under `backend/apps/<feature>/`. Each app owns its models, views, URLs, serializers, and migrations. No "core" or "main" grab-bag module that collects logic from multiple features.
- **React side:** Every feature lives under `frontend/src/features/<feature>/` with its own routes, components, hooks, and API client. Shared utilities go in `src/lib/` or `src/components/` only when they are *genuinely* shared.
- **Same name, same casing:** The feature is `example` on both sides. Keep that 1:1 mapping for every new feature.
- **Routing pattern:** Each feature exports a routes element from `features/<feature>/routes.tsx`. `App.tsx` imports and spreads them. URL pattern on the backend mirrors: `apps/<feature>/urls.py` mounted at `/api/<feature>/` in `config/urls.py`.
- **API access:** Feature `api.ts` files call through `src/lib/api.ts` — never `fetch` directly. That gives one place to attach Entra tokens and normalize errors.

When the prototype graduates, copying `backend/apps/<feature>/` + `frontend/src/features/<feature>/`, registering the Django app in `INSTALLED_APPS`, registering the React route, and running migrations should be the entire integration. No archaeology.

The included `example` feature is intentionally trivial (one model, one endpoint, one route). Use it as a structural reference; delete it when you ship real features.

---

## CONFIGURE ME markers

Things wired as stubs that need real values before the app is useful:

- **Entra OIDC** — `backend/config/settings/base.py` has the full config block commented with `CONFIGURE ME` markers. Uncomment after creating the app registration. `apps/accounts/middleware.py` and `apps/accounts/views.py` carry project-specific extension points; the OAuth code-exchange itself is handled by `mozilla-django-oidc`.
- **OpenRouter model** — `OPENROUTER_MODEL` defaults to `anthropic/claude-sonnet-4.5`. **TODO-verify** the current latest Sonnet slug on openrouter.ai before relying on this.
- **`DJANGO_SECRET_KEY`** — generate per-environment. Local dev has an insecure default; production must override.

---

## Deviations from the playbook

Documented here so the next reader doesn't have to diff against the playbook to find them:

- **OpenRouter integration uses `requests`, not the `openai` Python SDK.** Playbook section 10 shows the `openai` SDK; this template uses a direct `requests` call in `backend/services/ai.py`. Reason: minimize deps for the prototype use case. Easy to swap to the SDK if streaming or tool-use features warrant it.
- **Auth library:** Playbook section 9 does not pick a specific Python OIDC library. This template recommends `mozilla-django-oidc` (added to `pyproject.toml`, settings block commented). Override here if your preference differs.
- **Settings split:** Playbook section 5 shows a single `config/settings.py`. This template splits into `base.py` + `dev.py` + `prod.py` selected via `DJANGO_SETTINGS_MODULE`. Reason: cleaner prod hardening (HSTS, secure cookies) without conditionals.
