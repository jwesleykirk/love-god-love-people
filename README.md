# Love God, Love People

A daily devotional companion: one audio guide each morning combining Focal Point Ministries' Bible reading with AI-narrated prayer topics for the people and groups in Wesley's life.

Open the app → press play → follow the guide → mark answered prayers → tap Amen.

Full brief: ChatPRD doc `60ad2609-bae2-4955-977a-d5473c500a4e` (synced to [`BRIEF.md`](./BRIEF.md)). Design system in [`_docs/design-system.md`](./_docs/design-system.md). Architecture in [`_docs/architecture.md`](./_docs/architecture.md).

## Stack

- **Backend:** Django 5 + DRF, Postgres
- **Frontend:** React 18 + Vite + TypeScript, mobile-first
- **Auth:** Google OAuth via `django-allauth`, email allowlist
- **Background jobs:** Django-Q2 with Postgres broker (no Redis)
- **AI narration:** OpenRouter → Claude Sonnet
- **TTS:** ElevenLabs (`eleven_multilingual_v2`)
- **Audio stitch:** ffmpeg (server-side)
- **Storage:** Railway Volume (`RAILWAY_VOLUME_PATH`, default `/data`)
- **Deploy:** Railway (single service: API + SPA + worker)

## Local quickstart

Prereqs: Docker Desktop, Node 20+, Python 3.12+, [uv](https://docs.astral.sh/uv/), **ffmpeg** on PATH.

```bash
cp .env.example .env
docker compose up -d

cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py setup_guide   # optional: liturgy segments + django-q schedules
uv run python manage.py runserver

# Another terminal — frontend
cd frontend && npm install && npm run dev

# Another terminal — background worker
cd backend && uv run python manage.py qcluster
```

- Vite: http://localhost:5173
- Django: http://localhost:8000

## Feature flags / optional integrations

- **`ENABLE_AUTH`** — off → fixture user `wesley@local`; on → Google OAuth + allowlist
- **`OPENROUTER_API_KEY`** — empty → narration uses a simple template; set → AI generation
- **`ELEVENLABS_API_KEY`** — empty → TTS skipped and logged; set → live audio generation

## Tests

```bash
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test uv run python manage.py test
cd frontend && npm run build
```
