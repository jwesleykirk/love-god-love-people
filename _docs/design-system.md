# Love God, Love People — Design Spec

The single source of truth for how the app looks and behaves. Pair this with the
HTML mockups in `_docs/design/` (open them in a browser — they are pixel-accurate
references, not production code).

**Direction:** *Resilient Native* — iOS 26/27 material language (Liquid Glass,
floating translucent chrome, concentric radii, capsule controls) carrying the
*Iconoclast* soul: a graphite-only palette, word-first hierarchy, and a typographic
identity with no decorative imagery. Native components by default; deviate only
where it earns its keep.

---

## 1. Palette — graphite only, no accent color

One neutral ramp, by conviction. There is **no brand accent hue.** Emphasis comes
from weight, scale, contrast, and space — never color.

| Token            | Hex       | Use |
|------------------|-----------|-----|
| `paper`          | `#FBFBF9` | App background (light) |
| `surface`        | `#FFFFFF` | Cards, grouped lists |
| `hairline`       | `#EDECE8` | Separators, list dividers |
| `stone-200`      | `#D6D5D0` | Inactive fills, toggles off |
| `stone-400`      | `#A7A7A2` | Tertiary text, captions |
| `graphite-500`   | `#6B6B67` | Secondary text |
| `ink-800`        | `#2A2A28` | — |
| `ink-900`        | `#0E0E0D` | Primary text, primary buttons, active tab |

**Dark surfaces** (the player + the daily cover):
- Player background gradient: `linear-gradient(180deg, #201F24, #0C0C0F)`
- Cover background gradient: `linear-gradient(150deg, #34343C, #0C0C10)`
- On-dark text: `#F1F1F6` primary, `#B6B6C0` secondary, `#8A8A98` tertiary/labels.

iOS system grays are acceptable for native chrome (tab bar inactive icons
`#9A9A96`, fill `#E5E5EA`, etc.) — they read as part of the same neutral family.

---

## 2. Type — two voices

- **SF Pro** (system, `-apple-system`) — *the interface.* All navigation,
  controls, lists, labels, body. Large titles use SF Pro Display 700, ~32px,
  letter-spacing -1px.
- **Space Grotesk** — *the Word.* Reserved for devotional moments only: the guide
  headline on Home, scripture title in the player, "Amen", the daily cover, and
  section grandeur. Weights 500/600/700.

Tracked-uppercase labels (SF Pro, 11px, letter-spacing 1.5px, `stone-400`) mark
metadata throughout ("PRAYING TODAY", "TUESDAY · JUNE 16").

Never use Inter, Roboto, or Arial.

---

## 3. Material — Liquid Glass

Chrome floats and refracts; content stays opaque and quiet beneath it.

```
background: rgba(250, 250, 248, 0.70);
backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.85);
box-shadow: 0 10px 30px -10px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.9);
```

Used on: the floating tab bar, the Home settings button, search fields, the
segmented filter. **Not** on body cards — those are solid `surface` white.

- **Tab bar:** floating capsule, inset from the screen edges (left/right 14px,
  bottom 13px), height 62px, radius 31px. 4 tabs: Home, People, Prayer, Journal.
  Active tab = filled `ink-900` rounded-rect behind a white glyph.
- **Radii:** cards 20–26px, hero cards 26px, buttons/pills full-capsule (99px),
  cover 24px (1024px export uses proportional ~6%).
- **Shadows:** soft, low, neutral. Cards `0 8–12px 22–30px -18px rgba(0,0,0,0.3)`.
- **Primary button:** solid `ink-900`, white text, capsule, height 52–56px.

---

## 4. Screens (see `_docs/design/`)

| Screen | Mockup file | Notes |
|---|---|---|
| Today (Home) | `Love God — iOS27 Liquid Glass` (frame 1) | Word-first. Hero guide card → grouped "praying today" list → floating tab bar. Settings gear top-right. |
| Listening / Player | `Love God — Native Player` | **Native pattern** — see §5. Dark, artwork-forward, scrubber, skip ±15, AirPlay route, liturgy as chapters. The orb is **removed.** |
| Post-session review | `Love God — iOS27 Liquid Glass` (frame 3) | Native sheet w/ grabber. iOS toggle per topic = "answered"; answer-note field; floating "Amen" (Space Grotesk). |
| Prayer list | `Love God — iOS27 Liquid Glass` (frame 4) | Large title, glass search + segmented filter (All/Person/Group/General), grouped list, frequency pills. |
| Daily cover | `Love God — Title Page Cover` | Generated artwork — see §6. |
| People / forms / Journal / Settings | `Love God Love People — Wireframes` | Structure reference (low-fi); apply the system above when building. |

---

## 5. Audio player — the resilient-native core

**Do not build a custom player engine.** Back it with the system Now Playing stack
so background playback, lock screen, Control Center, CarPlay, and Apple Watch all
work for free and stay stable.

- **One `AVPlayer`** on the single stitched daily MP3 (`sessions/YYYY-MM-DD.mp3`).
  A single file = reliable seeking on every surface.
- **`AVAudioSession`** category `.playback`, activated on first play. Enable
  Background Mode → **Audio** in capabilities. This is what keeps it playing when
  the screen locks / app backgrounds.
- **`MPNowPlayingInfoCenter`** — publish title, subtitle, artwork (the daily
  cover, §6), duration, elapsed, rate. Update elapsed on a timer + on seek.
- **`MPRemoteCommandCenter`** — wire `play`, `pause`, `skipForward` (15s),
  `skipBackward` (15s), and `changePlaybackPosition` (scrub). These power the lock
  screen / CarPlay / Watch transport. Never custom-draw transport off-device.
- **Liturgy steps = chapter markers.** Embed `AVTimedMetadataGroup` chapters (12
  steps: opening, three prayers, reading, three reflections, confession, topics).
  "Skip step" works everywhere, and chapter titles surface in system UI.
- **In-app player** is the only bespoke surface (graphite skin, Space Grotesk
  title, artwork tile). Lock/CarPlay/Watch are system-drawn from the metadata
  above — they cannot host custom UI, which is exactly why this is resilient.

Off-device brand presence rides entirely on the **artwork**, so treat the cover as
first-class (next section).

---

## 6. Daily cover generator — the Title Page leaf

One universal cover per day, generated from the date + that day's readings. No
mid-session swap. 1024×1024 PNG, published to `MPNowPlayingInfoCenter` artwork and
shown in the in-app player + Journal.

**Background:** `linear-gradient(150deg, #34343C, #0C0C10)`.
**Frame:** 1px keyline inset ~6% (`rgba(255,255,255,0.22)`), radius ~8px at export.

Three balanced registers, all centered:

1. **Standing head** — `MORNING PRAYER`, Space Grotesk, tracked caps (~letter-spacing
   4px), `#9A9AA2`. Fixed every day.
2. **Date (hero)** — weekday in tracked caps (`#C8C8D0`) over `Month DD` in Space
   Grotesk 600 (~48px at 360 box; scale to canvas), `#F1F1F6`. Flanked above and
   below by a centered 46px hairline (`rgba(255,255,255,0.3)`).
3. **Readings (colophon)** — `TODAY'S READING` micro-label, then the three passages
   dot-separated: **two Old Testament chapters · one New Testament book**, e.g.
   `2 Samuel 7 · Psalm 23 · Romans 8`. Space Grotesk 500, `#E2E2E8`, dots
   `#6E6E7C`.

**Degradation (generator emits 3 size variants):**
- Full leaf (≥256px): all three registers.
- Medium (lock/Watch): drop the readings colophon; keep head + date.
- Thumbnail (Control Center): drop everything but the day — `Jun` over big `16`.

The readings line is the first to drop; the day number is the last to survive.

**Abbreviation rules** (keep the colophon to one line):
- Books abbreviate when long: `1 Thessalonians → 1 Thess`, `Philippians → Phil`,
  `Deuteronomy → Deut`, `Revelation → Rev`. Psalms → `Ps`. Single-word short
  books (`Mark`, `John`, `Acts`, `Romans`) stay full.
- Always `Book Chapter` (no verses on the cover).
- If the combined line would still wrap at thumbnail width, drop to medium variant.

---

## 7. Voice & copy

Quiet, second person, devotional but not saccharine. "Today's guide is ready."
"Anything answered today?" "How did God answer this?" "Amen." No emoji. Sentence
case for UI; the daily cover uses tracked caps for labels only.
