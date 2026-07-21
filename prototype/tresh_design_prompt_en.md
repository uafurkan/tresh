# TRESH — Design & Engineering Prototype Brief

*Placeholder name: Tresh (can be swapped later — replace all instances if renamed)*

Paste this entire brief into Claude Design. It is written as a professional creative + engineering brief, not a casual request — treat every section as a constraint, not a suggestion.

---

## 0. Role & Mandate

You are acting as three roles simultaneously on this task:

1. **Senior Product/Web Designer** — responsible for a distinctive, non-templated visual identity and interaction design.
2. **Senior Frontend Engineer** — responsible for clean, performant, production-quality React code.
3. **Prompt/Systems Thinker** — responsible for internal consistency: every visual and motion decision must trace back to one governing idea, not be picked independently.

Do not default to generic SaaS/fintech visual language. The client has explicitly rejected: glassmorphism, neumorphism, purple-blue-pink AI gradients, generic dark mode (`#0a0a0a` + pure white), stock "rising green chart + up arrow" fintech clichés, confetti/celebration micro-animations, and any layout that would be indistinguishable from a Dribbble template. If a design decision cannot be justified by the governing metaphor below, do not include it.

---

## 1. Product Definition

**What it is:** A currency/exchange-rate threshold alert app. The user selects a currency pair (e.g. USD/TRY) and a limit value. When the live rate crosses that limit, the user receives a notification — even if the app/site is closed (background push).

**Who it's for:** People who send/receive money internationally, save in foreign currency, or time currency conversions — currently relying on manually checking rates or crude bank apps with no real alerting.

**Core job to be done:** "Tell me the moment my number is hit. I don't want to babysit a chart."

---

## 2. Governing Metaphor (single source of truth for all design decisions)

Everything in this product obeys **water level / tide physics.** The exchange rate is a body of water; the user's limit is a **threshold** — the rim of a container, a levee, a shoreline. As the rate approaches the threshold, tension builds (visual and motion intensity increase). When the threshold is crossed, an **overflow** occurs — the notification IS that overflow moment, propagating outward like a wave. At rest, water breathes calmly (slow, low-amplitude motion). Near danger, it breathes faster and rises.

**Rule:** Before adding any visual or motion element, ask: *does this belong to water physics?* If the answer requires justification longer than one sentence, cut it.

---

## 3. Visual System

### 3.1 Color

Single accent discipline — one calm "water" color, one warning color, used sparingly and only at the moment of crossing.

| Token | Approx. value | Role |
|---|---|---|
| `bg-deep` | `#050B14` | Night-water base — never pure black |
| `bg-surface` | `#0B1622` | Cards, panels |
| `bg-raised` | `#122236` | Elevated/hover surfaces |
| `content-primary` | `#E8F1F5` | Primary text — never pure white |
| `content-secondary` | `#8FA5B3` | Secondary text/labels |
| `water` | `#2FD4C9` | Calm-state accent (cool teal/cyan) — dulls at rest, brightens near threshold |
| `overflow` | `#FF9F5A` or similar warm amber | Only appears during the crossing moment; never persistent |

No gradients other than a subtle vertical depth gradient within the water visualization itself (dark at bottom, lighter toward the surface line) — this is physically motivated (light penetration in water), not decorative.

### 3.2 Typography

- **Display/headline:** A serif or soft-geometric sans with character (e.g. Fraunces, or a warm grotesk) — explicitly not Inter/Roboto/system-ui as the hero font. Numbers and rate values must feel deliberate, not default.
- **Data/numeric:** A monospace with tabular figures (e.g. IBM Plex Mono) for all rate values — digits must not jitter or reflow as they update live.
- **Body:** A clean, humanist sans for secondary text.

### 3.3 Iconography & Imagery

No stock icon packs used raw. If using a base icon library (Lucide acceptable as a base), adjust stroke weight and corner treatment to feel intentional. No literal "up/down arrow + dollar sign" cliché icons.

---

## 4. Core Screens & Flows

### 4.1 Home / Live View

- Dominant visual: a live "water level" visualization — a horizontal wave line (SVG path, layered sine-based curves at different amplitude/speed for depth) representing the current rate in real time (simulate with mock data — no live API required for this prototype).
- A thin horizontal line marks the user's threshold. As the water line approaches it:
  - Water color shifts from dull to vivid `water` tone (continuous, not binary)
  - Wave frequency subtly increases (tension)
- Large tabular-mono rate value anchored near the water line.
- Below: primary CTA "Set a threshold" + a compact list of active thresholds, each with its own micro wave preview.

### 4.2 Set Threshold Flow

- Single-screen flow: select currency pair → select direction (rises above / falls below) → set value.
- Value input uses a vertical drag/slider metaphor consistent with water (a draggable "float" marker on a vertical scale), not a generic numeric stepper.
- Notification permission is requested inline with a one-line explanation of why it's needed — never a bare OS permission dialog with no context.

### 4.3 Overflow Moment (signature interaction)

When a threshold is crossed while the app is open:
- The water line briefly overtops the threshold line; a single ripple/ring propagates outward from the crossing point (300–500ms).
- Water color pulses to `overflow` tone, then cools back to calm `water` tone over 2–3 seconds.
- This plays **once** per crossing — no repeating pulse, no persistent alarm state. A calm product feels trustworthy; a nagging one does not.
- Push notification copy (for background case) is plain and factual: *"USD/TRY crossed 35.00 — now at 35.04."* No emoji, no exclamation marks, no false urgency.

---

## 5. Component State Discipline

Every interactive/data component must define, at minimum:

| State | Behavior |
|---|---|
| Calm (default) | Resting visual, slow breathing motion |
| Approaching | Gradual intensification as value nears threshold |
| Overflow | One-time crossing animation (see 4.3) |
| Dismissed/inactive | Muted, desaturated, clearly non-live |
| Empty | No thresholds set yet — inviting, not a blank void; one clear primary action |
| Error | Connection/data loss — calm, factual message, no red panic styling beyond a single accent cue |
| Loading | No spinners or skeleton screens. Use a "hazy/uncertain water" state — a slightly blurred, low-amplitude wave — communicating "data is flowing in," not "system is broken." |

---

## 6. Motion Principles

- All transitions use eased curves — no linear, no hard snaps.
- Asymmetric timing: escalation into tension is fast (150–250ms), settling back to calm is slow (800ms–1200ms). Tension builds quickly; it dissipates gradually — this is both physically accurate and emotionally correct (don't startle, do reassure).
- Respect `prefers-reduced-motion`: disable wave animation entirely; convey state through color/opacity only.
- Mobile-first, thumb-reachable: primary actions live in the lower half of the viewport.

---

## 7. Engineering Requirements

- Build as a single-file React component (functional, hooks-based: `useState`/`useEffect` for simulated live data).
- Use Tailwind utility classes for layout; encode the color/typography tokens above as CSS custom properties or a Tailwind theme extension — no hard-coded hex values scattered through JSX.
- Simulate live rate data with a small internal generator (randomized walk within a realistic band) — do not wire to a real API for this prototype.
- Code must run cleanly as a standalone artifact with no external dependencies beyond what's available in this environment (React, Tailwind, optionally Recharts/D3 if needed for the wave path — otherwise hand-rolled SVG path is preferred for full control over the metaphor).
- No `localStorage`/`sessionStorage` — keep all state in React state for this prototype.

---

## 8. Definition of Done (self-check before presenting)

- [ ] Every visual/motion element traces to the water/threshold metaphor in one sentence or less
- [ ] No clichéd fintech visual patterns present (see rejected list in Section 0)
- [ ] All seven component states from Section 5 are implemented, not just "default" and "hover"
- [ ] Numbers use tabular figures and never visually jitter on update
- [ ] The overflow moment plays once and calmly resolves — verified by simulating a threshold crossing
- [ ] Reduced-motion path implemented and does not lose any information, only motion
- [ ] Mobile viewport (390px) tested with no horizontal overflow and thumb-reachable primary actions
