# Design System

The visual language for Love God, Love People. Decoded from the Vocabulary iOS app reference Wesley shared: warm cream paper backgrounds, white cards with subtle shadows, editorial serif headings, humanist sans body, capsule pill buttons, sage/coral/lime accent palette. Friendly and organic, not clinical.

## Tokens — colors

All colors are exposed as CSS custom properties on `:root` in `frontend/src/styles/tokens.css`. **Components must always read from these variables — never hardcode a hex.**

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#F2EAE0` | App background. Warm cream, paper-like. |
| `--color-card` | `#FFFFFF` | Card and elevated surface fill. |
| `--color-primary` | `#A8C9C4` | Selected state on pills, primary button fill, accent strokes. |
| `--color-primary-dark` | `#7AAAA3` | Hover/pressed on primary surfaces. |
| `--color-success` | `#C5DC83` | Correct answers, approved properties, positive confirmation. |
| `--color-warning` | `#E68F7A` | Errors, rejections, destructive actions. |
| `--color-text` | `#000000` | Primary text. |
| `--color-text-muted` | `#6B6258` | Secondary text, captions, timestamps. |
| `--color-border` | `#EAE0D0` | Hairlines and dividers. |
| `--color-border-strong` | `#D8CCB6` | Stronger borders on inputs and pills at rest. |

## Tokens — typography

Two faces, both Open Font License, loaded from Google Fonts:

- **Source Serif Pro** (`--font-serif`) — headings, hero numbers, editorial moments.
- **Inter** (`--font-sans`) — body, UI labels, buttons.

Scale (line-height pinned to 1.3 for headings, 1.5 for body):

| Token | Size | Weight | Family |
|---|---|---|---|
| `--text-h1` | 2.25rem (36px) | 600 | serif |
| `--text-h2` | 1.75rem (28px) | 600 | serif |
| `--text-h3` | 1.375rem (22px) | 600 | serif |
| `--text-body` | 1rem (16px) | 400 | sans |
| `--text-body-lg` | 1.125rem (18px) | 400 | sans |
| `--text-label` | 0.8125rem (13px) | 500 | sans |
| `--text-caption` | 0.75rem (12px) | 400 | sans |

## Tokens — spacing

Single ramp, used for padding, gap, margin:

`--space-1: 4px · --space-2: 8px · --space-3: 12px · --space-4: 16px · --space-6: 24px · --space-8: 32px · --space-12: 48px`

## Tokens — radius

`--radius-sm: 4px · --radius-md: 8px · --radius-lg: 12px · --radius-xl: 16px · --radius-2xl: 24px · --radius-pill: 9999px`

## Tokens — shadow

Three steps. Vocabulary uses very subtle shadows — when in doubt, less.

- `--shadow-none: none`
- `--shadow-sm: 0 1px 2px rgba(0,0,0,0.04)`
- `--shadow-md: 0 2px 8px rgba(0,0,0,0.05)`

## Components

### Card

```html
<div class="card">
  <h3>Karie Kirk</h3>
  <p class="muted">Family · spouse</p>
</div>
```

- background `--color-card`
- border `1px solid --color-border`
- radius `--radius-xl` (16px)
- padding `--space-6` (24px)
- shadow `--shadow-md`

### Pill button

Capsule shape, three states.

```html
<button class="pill-btn">Friend</button>                  <!-- default -->
<button class="pill-btn pill-btn--selected">Family ✓</button>  <!-- selected -->
<button class="pill-btn pill-btn--primary">Save entry</button> <!-- primary CTA -->
```

- shape `--radius-pill`
- padding `--space-2 --space-4`
- default: white interior, `1px solid --color-border-strong`, `--color-text`
- selected: `--color-primary` fill, white text, check icon
- primary: `--color-text` (pure black) fill, white text (full-width on phones)

### Pill chip (read-only tag)

Smaller than pill-btn, inline with text.

```html
<span class="chip">Bridge student</span>
```

- background `--color-card`, border `--color-border`
- padding `0 --space-3`, height 22px
- text `--text-caption`, `--color-text-muted`

### Input

```html
<label class="label">Full name</label>
<input class="input" type="text" />
```

- background `--color-card`
- border `1px solid --color-border-strong`
- radius `--radius-md`
- padding `--space-3`
- focus: border `--color-primary-dark`, no shadow ring

### Tab pill row

For Person Detail (Profile / Properties / Journal / Associations / Memberships / Prayer) and Review (Pending / New properties / Proposed people).

```html
<div class="tab-row">
  <button class="tab tab--active">Profile</button>
  <button class="tab">Journal</button>
</div>
```

Inactive tab: pill-btn default. Active tab: pill-btn--selected.

### Progress ring (Phase 3 prayer streak / quiz score)

```
       ╭─ ─╮
      │  7  │   ← serif, --text-h1
       ╰─ ─╯
   day streak     ← --text-caption, muted
```

Implementation: SVG circle with stroke-dasharray. 80px diameter default. Stroke `--color-primary`, background track `--color-border`.

### Progress bar (slim, list-row inline)

Used for property review completeness, journaling-streak progress.

```html
<div class="progress-track"><div class="progress-fill" style="width: 70%"></div></div>
```

Track `--color-border`, fill `--color-success` (or `--color-primary` if neutral).

### AnswerChoice / ResultRow

Used in Review Console value cards.

```
┌────────────────────────────────────────┐
│ Karie · mother_name: Linda        ✓    │  ← --color-success icon on right
│ conf 0.95            [Approve][Edit][↺]│
└────────────────────────────────────────┘
```

Status icon: green check for approved, coral X for rejected, neutral dot for pending.

### EntryCard

Reverse-chronological feed row used in Recent Entries on Home and on Person Detail.

```
┌────────────────────────────────────────┐
│ Karie, Oliver · 9:42 PM          ✓ done│  ← header
│                                         │
│ Walked with Karie tonight. She…        │  ← body, 2-line truncate
└────────────────────────────────────────┘
```

### PersonCard

```
┌────────────────────────────────────────┐
│  ⚪  Karie Kirk            Family · ♥   │
│      preferred: Karie                   │
└────────────────────────────────────────┘
```

Left circle = the illustration placeholder slot. White card, hairline border.

## Illustration system

Wesley generates the artwork in Midjourney. The frontend uses two placeholder strategies until real assets land:

1. **Inline SVG placeholder** — `<svg class="illust-placeholder">`. Cream-toned soft circle with the slot name in subtle gray text.
2. **Convention for real assets:** when ready, drop PNG/SVG into `frontend/public/illustrations/<slot>.svg` and components reference `/illustrations/<slot>.svg`. Components are written so this is a one-prop change.

Slots currently planned:

- `family.svg`, `friend.svg`, `work.svg`, `neighbor.svg`, `ministry.svg`, `other.svg` — relationship_category icons used on PersonCard and as the empty-state hero on People list
- `prayer-hero.svg` — banner illustration for the Home page prayer queue card
- `journal-hero.svg` — empty state on Entries
- `bridge-hero.svg` — for Bridge ministry empty/featured states

Every placeholder location is tagged in source with `{/* ILLUSTRATION_PLACEHOLDER: <slot>.svg */}` for grep-ability.

## Page mockups

### Home (`/`)

```
═══════════════════════════════════════════
  LGLP                  People  Orgs  + Entry  Review
═══════════════════════════════════════════

  Good morning, Wesley
  ────────────────────                  ← --text-h1, serif

  ┌─────────────────────────────────┐
  │  ⚪  Today's prayers              │ ← prayer hero card (Phase-3 stub)
  │      3 people scheduled           │
  │      [ View queue → ]              │
  └─────────────────────────────────┘

  ┌─────────────────────────────────┐
  │  Recent journaling               │
  │  ─────────────────────           │
  │  Karie · 9:42 PM        ✓ done   │
  │  Walked with Karie tonight…      │
  │  ───                              │
  │  Oliver · this morning  AI…      │
  │  Watching cartoons together…     │
  └─────────────────────────────────┘

  [ + Add entry ]                ← full-width primary pill on phones
```

### People list (`/people`)

```
  People                                 [+ Add]
  Search [_______________]    Family ▾

  ┌─────────────────────────────────┐
  │  ⚪  Karie Kirk          Family ♥ │
  └─────────────────────────────────┘
  ┌─────────────────────────────────┐
  │  ⚪  Oliver Kirk         Family   │
  └─────────────────────────────────┘
  ┌─────────────────────────────────┐
  │  ⚪  Alfonso Morales     Work     │
  └─────────────────────────────────┘

  Recent entries
  ───────────────
  (compact rows)
```

### Person detail (`/people/:id`)

```
  ← People

  ⚪
  Karie Kirk                            ← --text-h1, serif
  Family · spouse                       ← chip row

  [ Profile ][ Properties ][ Journal ][ Associations ][ Memberships ]
   ──────────────────────────────────  ← active tab underlines

  ┌─────────────────────────────────┐   ← card for active tab content
  │  Notes                            │
  │  …                                │
  └─────────────────────────────────┘
```

### Add Entry (`/entries/new`)

```
  ← Back

   ╔═════════════════════════════════╗   ← paper card, large
   ║  Walked with Karie tonight…    ║   ← serif input, generous padding
   ║                                  ║
   ╚═════════════════════════════════╝

  Tag people
  [ Karie ✓ ] [ Oliver ] [ Alfonso ]    ← pill multiselect

  Tag organizations (optional)
  [ Compass ] [ Bridge ]

  [ Save entry ]                          ← full-width primary
```

### Review Console (`/review`)

```
  Review

  [ Pending values ][ New properties ][ Proposed people ]   ← tab pills

  ┌─────────────────────────────────┐
  │  9:42 PM · v2 · claude-sonnet     │
  │  "Karie's mom Linda has a…"       │
  │  ─────                            │
  │  Karie · mother_name: Linda  0.95 │
  │  [ Approve ][ Edit ][ Reject ]    │
  └─────────────────────────────────┘
```

## Hard rules

- **Always use the token CSS variables.** Never hardcode a hex in a component. If you need a color that isn't in the token set, propose adding it to `tokens.css` first.
- **Headings are serif.** Body is sans. Don't mix.
- **Cards are white on cream.** Inverted (dark on cream) is reserved for primary CTAs only.
- **Illustrations go in `frontend/public/illustrations/`.** Components reference them via `/illustrations/<slot>.svg`. Until Wesley ships the real ones, render the styled SVG placeholder.
- **Shadows are subtle.** `--shadow-md` is the ceiling for normal cards. Reach for `--shadow-sm` more often.
- **Pill is the dominant shape language.** Buttons, tabs, chips, multiselect — all capsule.
