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

### Card anatomy (every bento card)
- Padding: `1.5rem` desktop, `1.25rem` mobile.
- Background: surface color (see tokens below), subtle 1px border, no heavy
  drop shadow — use a soft ambient shadow only (avoid skeuomorphic depth).
- Optional icon or small label top-left, primary content centered/left,
  optional trend/footnote bottom.
- Hover state (desktop only): border color shifts to accent, very slight
  `translateY(-2px)`, transition `150ms ease-out`. No hover state on mobile.

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

## 2. Color tokens & Dark Mode

Use CSS custom properties on `:root`, redefined under
`prefers-color-scheme: dark` and overridable via a manual toggle
(`[data-theme="dark"]` / `[data-theme="light"]` takes precedence).

```css
:root {
  --bg: #f7f7f8;
  --surface: #ffffff;
  --surface-border: #e5e5e8;
  --text-primary: #14141a;
  --text-secondary: #5c5c66;
  --accent: #4f46e5;       /* indigo — adjust to taste */
  --accent-soft: #eef0fd;
  --success: #16a34a;
  --chart-1: #4f46e5;
  --chart-2: #06b6d4;
  --chart-3: #f59e0b;
  --chart-4: #ec4899;
  --shadow-ambient: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0d0d12;
    --surface: #17171d;
    --surface-border: #2a2a33;
    --text-primary: #f2f2f5;
    --text-secondary: #9a9aa5;
    --accent: #818cf8;
    --accent-soft: #1e1e3a;
    --shadow-ambient: 0 1px 2px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.4);
  }
}

[data-theme="dark"] {
  --bg: #0d0d12;
  --surface: #17171d;
  --surface-border: #2a2a33;
  --text-primary: #f2f2f5;
  --text-secondary: #9a9aa5;
  --accent: #818cf8;
  --accent-soft: #1e1e3a;
  --shadow-ambient: 0 1px 2px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.4);
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
- Never use pure black (`#000`) or pure white (`#fff`) as a background —
  tokens above already avoid this for reduced eye strain.

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
