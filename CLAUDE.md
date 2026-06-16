# CLAUDE.md — Love God, Love People v2

Daily devotional companion. Full brief in ChatPRD doc `60ad2609-bae2-4955-977a-d5473c500a4e` (synced to `BRIEF.md`). Read `BRIEF.md` and `_docs/architecture.md` before non-trivial changes.

## What this app is

Each morning the app compiles one audio prayer guide: fixed liturgy + Focal Point DBR reading + up to 5 scheduled prayer topics (plus all daily topics). Wesley presses play, follows the guide, marks answered prayers, taps Amen.

People, groups, and prayer topics are managed manually. AI generates short narration text (OpenRouter) and ElevenLabs TTS audio. No journal-entry extraction, no EAV property bag, no flashcards.

Single-user (Wesley) for v1; every record carries `owner_id` for future multi-tenancy.

## Stack

- **Backend:** Django 5.2 + DRF, Postgres
- **Frontend:** React 18 + Vite + TypeScript, mobile-first
- **Auth:** `django-allauth` Google OAuth + email allowlist (`GOOGLE_OAUTH_ALLOWED_EMAILS`)
- **Background jobs:** `django-q2` with Postgres broker (no Redis)
- **AI narration:** OpenRouter → Claude Sonnet (`OPENROUTER_MODEL`)
- **TTS:** ElevenLabs (`ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL`)
- **Audio stitch:** ffmpeg
- **Storage:** Railway Volume (`RAILWAY_VOLUME_PATH`)
- **Deploy:** Railway (single service for API + SPA + worker)

## Django apps

- `accounts` — fixture user middleware, OAuth allowlist adapters
- `people` — Person, Child
- `groups` — Group, GroupMembership
- `prayer` — PrayerTopic, PrayerSession, PrayerLog
- `dbr` — ReadingDay (Focal Point RSS)
- `guide` — compile pipeline, scheduling, ingest, settings API

## Hard rules

- **Never run DDL from AI.** Schema is Django migrations only.
- **No age column.** Age computed from `birthdate` or `birth_year` on Child.
- **No Redis.** Django-Q2 uses Postgres broker.
- **Never commit secrets.** Read from env.
- **Answered topics are never reopened.** Create a new topic if the need recurs.
- **Compiled session audio rotates after 3 days.** Session and prayer logs are permanent.
- **5-topic cap** for scheduled (non-daily) topics per session.
- **DBR source:** `https://feedpress.me/focalpoint-dbr` only. Personal use.

## Feature flags

- `ENABLE_AUTH` — off → fixture user `wesley@local`
- `OPENROUTER_API_KEY` — empty → narration template fallback
- `ELEVENLABS_API_KEY` — empty → TTS skipped, logged

## Common commands

```bash
cd backend && uv sync && uv run python manage.py migrate && uv run python manage.py runserver
cd backend && uv run python manage.py qcluster
cd backend && DJANGO_SETTINGS_MODULE=config.settings.test uv run python manage.py test
cd frontend && npm run dev && npm run build
cd backend && uv run python manage.py setup_guide
```

## Design system

See `_docs/design-system.md` and `frontend/src/styles/tokens.css`. Always use CSS variables; headings serif, body sans; pill buttons.

## Navigation (4 tabs)

Home · People · Prayer · Journal. Settings via gear on Home.
