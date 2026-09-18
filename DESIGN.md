# DESIGN.md — Batch Portfolio UI

## 1. Layout system — Bento Grid

Bento grid is the primary layout pattern across the landing page, stats
dashboard, and directory. Uniform cards for repeatable content (student
profiles), mixed-size cards for the stats dashboard (headline numbers get
bigger cells than secondary charts).

### Grid mechanics
- CSS Grid, not flexbox, for all bento sections.
- Base unit: 12-column grid on desktop, 4-column on mobile.
- Card sizes are expressed as column/row spans, not fixed pixel widths:
  - `span-3` (quarter width) — small stat card, e.g. "89 students"
  - `span-4` (third width) — medium card, e.g. single chart or skill cluster
  - `span-6` (half width) — large card, e.g. top-skills bar chart
  - `span-12` (full width) — hero / search bar
- Row height: fixed base row (`grid-auto-rows: minmax(120px, auto)`), cards
  span 1–3 rows depending on content density.
- Gap: `1rem` mobile, `1.5rem` desktop. Consistent across all bento sections
  — do not vary gap size between sections.
- Card corner radius: `1rem` (`rounded-2xl` equivalent). Consistent everywhere.
- On mobile, all cards collapse to full width (`span-4` → full), stacked in
  the same visual priority order as desktop (don't reflow-reorder).

### Card anatomy (every bento card) — Neumorphic
- Padding: `1.5rem` desktop, `1.25rem` mobile.
- Background: **same tone as the page background** (`--surface` ≈ `--bg`) —
  neumorphism reads through shadow, not color contrast, so do not lighten
  cards against the page the way a flat design would.
- No border. Depth comes entirely from the dual-shadow pair below
  (`--shadow-neu`), not from a stroke.
- Corner radius stays `1rem` per the grid spec above — soften shadow blur to
  match, don't sharpen the radius to compensate for the softer shadow.
- Optional icon or small label top-left, primary content centered/left,
  optional trend/footnote bottom.
- Hover state (desktop only): shadow depth increases slightly (`10px 10px
  20px` / `-10px -10px 20px`) rather than a border/color shift, `translateY(-2px)`,
  transition `150ms ease-out`. No hover state on mobile.
- Pressed/active state (buttons, toggles, selected filter chips): swap to
  `--shadow-neu-inset` — the element reads as pushed into the surface. Use
  this for the "active skill filter" state in `/directory` and for the
  Google sign-in button's pressed state.

### Where bento applies
- **Landing page**: hero (span-12) → stats cards (mixed spans) → search
  CTA (span-12).
- **Stats dashboard section**: top-skills chart card (span-6), batch
  headcount card (span-3), total-students card (span-3), 2–3 smaller
  "trending skill" cards (span-4 each) below.
- **Directory**: uniform `span-3` cards per student (photo, name, batch
  badge, 3 skill chips) — NOT mixed sizing here, uniformity aids scanning.
- **Profile page**: NOT a bento grid — single-column or two-column reading
  layout (bento is for overview/scanning, not detail reading).

---

## 2. Color tokens & Dark Mode — Vercel palette + Neumorphic shadows

Palette is Vercel-inspired: near-black primary, light warm-grey surfaces,
sharp semantic accent colors used sparingly (status/charts only — not for
card backgrounds). Depth comes from a **dual-shadow neumorphic pair**, not
from surface/background contrast, so `--surface` and `--bg` stay close in
tone within each theme.

Use CSS custom properties on `:root`, redefined under
`prefers-color-scheme: dark` and overridable via a manual toggle
(`[data-theme="dark"]` / `[data-theme="light"]` takes precedence).

```css
:root {
  --bg: #E7E5E4;              /* warm light grey — neumorphic base */
  --surface: #E7E5E4;         /* same as bg by design (see rules below) */
  --primary: #111111;         /* Vercel black — CTAs, active states */
  --secondary: #F1F2F5;
  --text-primary: #1E2938;
  --text-secondary: #5c5c66;
  --success: #00A63D;
  --warning: #FE9900;
  --danger: #FF2157;
  --accent: #111111;          /* use primary as the interaction signal, not a color accent */
  --chart-1: #111111;
  --chart-2: #00A63D;
  --chart-3: #FE9900;
  --chart-4: #FF2157;

  /* Neumorphic shadow pair: light source top-left */
  --shadow-neu-light: rgba(255, 255, 255, 0.75);
  --shadow-neu-dark: rgba(163, 161, 159, 0.55);
  --shadow-neu: 8px 8px 16px var(--shadow-neu-dark),
                -8px -8px 16px var(--shadow-neu-light);
  --shadow-neu-inset: inset 4px 4px 8px var(--shadow-neu-dark),
                      inset -4px -4px 8px var(--shadow-neu-light);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #17181A;             /* near-black warm grey — neumorphic base */
    --surface: #17181A;
    --primary: #F1F2F5;        /* invert: light becomes the CTA color */
    --secondary: #1E2938;
    --text-primary: #F1F2F5;
    --text-secondary: #9a9aa5;
    --success: #2ED860;
    --warning: #FFB13D;
    --danger: #FF5C7C;
    --accent: #F1F2F5;
    --chart-1: #F1F2F5;
    --chart-2: #2ED860;
    --chart-3: #FFB13D;
    --chart-4: #FF5C7C;

    --shadow-neu-light: rgba(255, 255, 255, 0.04);
    --shadow-neu-dark: rgba(0, 0, 0, 0.6);
    --shadow-neu: 8px 8px 16px var(--shadow-neu-dark),
                  -8px -8px 16px var(--shadow-neu-light);
    --shadow-neu-inset: inset 4px 4px 8px var(--shadow-neu-dark),
                        inset -4px -4px 8px var(--shadow-neu-light);
  }
}

[data-theme="dark"] {
  /* identical block to the prefers-color-scheme dark values above */
}
```

### Dark mode rules
- Default to system preference (`prefers-color-scheme`) on first visit.
- Store manual override in `localStorage` (`theme: "light" | "dark"`); apply
  via `data-theme` attribute on `<html>` before first paint (inline script in
  `<head>`, not after hydration) to avoid a flash of wrong theme.
- Toggle lives top-right of the nav/header, icon-only (sun/moon), on every
  page including the public landing page.
- Charts must use the `--chart-*` tokens, not hardcoded hex, so they stay
  legible in both themes.
- In dark mode the neumorphic shadow pair flips emphasis (barely-visible
  light edge, strong dark edge) — this is intentional; don't force the
  light-mode ratio onto dark mode or cards will look flat.

### Neumorphism-specific color rules
- `--surface` must never diverge from `--bg` — if a component needs to look
  "raised," raise it with `--shadow-neu`, not with a lighter fill color.
- Reserve `--primary` (Vercel black / inverted white) for CTAs, active nav
  items, and the pressed/inset state — it's the one place flat color, not
  shadow, carries the signal.
- `--success` / `--warning` / `--danger` are for status only (form
  validation, skill-added confirmation) — never used as a card background.

---

## 3. Typography

- Font: a single variable sans-serif (e.g. Inter or Geist) via Google Fonts
  or self-hosted variable font. One family for everything — use weight, not
  a second font, for hierarchy.
- Scale:
  - Hero heading: `2.5rem` / weight 700
  - Section heading: `1.5rem` / weight 600
  - Card title: `1rem` / weight 600
  - Body: `0.9375rem` / weight 400
  - Stat number (big card figures): `2.25rem` / weight 700, tabular-nums
  - Caption/footnote: `0.8125rem` / weight 400, `--text-secondary`

---

## 4. Stats components

### Big number card
- Large tabular-nums figure (e.g. "89"), label beneath in
  `--text-secondary`, optional small delta/footnote (e.g. "MCA: 51 · MSc CS: 38").
- No chart — just the number. Used for total students, total skills logged.

### Top-skills chart card
- Horizontal bar chart, one bar per top-N skill (cap at 8, "+N more" link to
  full directory filter).
- Bars colored using `--chart-1..4` cycling, count label at bar end.
- Sort descending by `usageCount`. Clicking a bar deep-links to
  `/directory?skill={id}` (post-login).

### Batch breakdown card
- Simple horizontal split bar or two stacked numbers (MCA vs MSc CS) — avoid
  a pie chart for a 2-category split, it's visually inefficient for two
  values.

### Trending/skill-cluster cards (smaller, span-4)
- 3–4 skill chips grouped by theme (e.g. "Frontend", "Data/ML", "Cloud") with
  aggregate counts — optional, only if categorization data exists; skip
  rather than force a category taxonomy that isn't there yet.

### General stats rules
- All stats pull from the public `skills` collection only (no student PII)
  — this section renders before login, per the access-control spec.
- Numbers should animate on first scroll into view (simple count-up, under
  600ms) — subtle, not gimmicky.
- Empty/low-data states (e.g. a skill with 1 use) must not look broken —
  bars should have a visible minimum width.

---

## 5. Components checklist (build order)

1. Theme provider + toggle (blocks everything else visually)
2. Bento grid layout primitive (reusable `<BentoCard span="3">`)
3. Big number card, bar chart card, batch split card
4. Student directory card (photo, name, batch badge, skill chips, hover)
5. Skill chip component (used in directory cards, profile page, chart)
6. Profile page (two-column: photo/bio/links left, skills/projects/certs right)
7. Create/Edit profile form (skill autocomplete-or-create, project/cert
   repeatable field groups, photo upload with preview)