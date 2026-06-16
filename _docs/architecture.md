# Architecture — Love God, Love People v2

## Overview

Single Railway service: Django API + React SPA (WhiteNoise) + Django-Q2 worker. Postgres for all data and job queue. Railway Volume for audio files.

## Django apps

| App | Responsibility |
|-----|----------------|
| `accounts` | Fixture-user middleware, Google OAuth allowlist adapters, `/api/auth/me/` |
| `people` | `Person`, `Child` |
| `groups` | `Group`, `GroupMembership` |
| `prayer` | `PrayerTopic`, `PrayerSession`, `PrayerLog` |
| `dbr` | `ReadingDay` (Focal Point RSS) |
| `guide` | Scheduling, ElevenLabs/OpenRouter services, DBR ingest, daily compile, settings API |

## Audio volume layout

```
{RAILWAY_VOLUME_PATH}/
  segments/     # fixed liturgy (generated once)
  dbr/          # RSS enclosure MP3s
  topics/       # per-topic narration MP3s
  sessions/     # compiled daily guides (rotated after 3 days)
```

## Background jobs (django-q2)

| Schedule | Default (PT) | Task |
|----------|--------------|------|
| `dbr_ingest` | 2:30 AM | Poll RSS, upsert `ReadingDay`, download MP3 |
| `compile_daily_guides` | 3:00 AM | Schedule topics, ffmpeg compile, create `PrayerSession` |

On-demand: topic narration generation (on create/edit), manual build from Home.

## Scheduling

- **Daily topics:** always included, not counted toward 5-topic cap
- **Weekly/monthly:** distributed across period; due topics prioritized; overflow rescheduled
- **Answered topics:** excluded immediately

## Auth

`ENABLE_AUTH=False` → `FixtureUserMiddleware` sets `wesley@local` on every request.

## Feature-flagged integrations

- `OPENROUTER_API_KEY` — AI narration text
- `ELEVENLABS_API_KEY` — TTS for segments and topics

Both skip gracefully with log lines when empty.
