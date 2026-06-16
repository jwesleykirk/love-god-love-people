# Love God, Love People — v2 Product Brief

*Personal project · Non-commercial · Single user (Wesley)*

Canonical source: ChatPRD doc `60ad2609-bae2-4955-977a-d5473c500a4e`.

## What it is

A daily devotional companion that produces one audio file each morning: guided prayer combining the day's Focal Point DBR reading with personalized, AI-narrated prayer topics for people, groups, and general intentions Wesley is praying for.

**Core loop:** open app → press play → follow the guide → mark answered prayers → tap Amen.

## Data model (summary)

| Entity | Purpose |
|--------|---------|
| `Person` + `Child` | People Wesley prays for; age computed from birthdate/birth_year |
| `Group` + `GroupMembership` | Manual prayer groups |
| `PrayerTopic` | Topic text, AI narration, ElevenLabs audio, frequency, schedule |
| `ReadingDay` | Focal Point RSS feed items (upsert by `guid`) + cached MP3 |
| `PrayerSession` | One compiled daily guide + build log |
| `PrayerLog` | Per-topic record for each session (permanent history) |

## Audio pipeline

1. **Liturgy segments** — ElevenLabs, cached permanently in `segments/`
2. **DBR ingest** — daily RSS poll at 2:30 AM PT, MP3 to `dbr/`
3. **Topic narration** — OpenRouter text + ElevenLabs audio per topic
4. **Daily compile** — 3:00 AM PT: scheduler picks topics, ffmpeg stitches to `sessions/YYYY-MM-DD.mp3`
5. **Rotation** — compiled session audio deleted after 3 days; logs kept forever

## Navigation

Home · People (incl. Groups) · Prayer · Journal · Settings (gear on Home)

## Non-goals (v1)

Multi-user, push notifications, photos, flashcards, journal-entry AI extraction, Pastor Mike commentary toggle (parked).
