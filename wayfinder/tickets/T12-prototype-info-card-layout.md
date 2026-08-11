---
id: T12
title: Prototype the info-card layout
labels:
  - wayfinder:prototype
status: closed
assignee: null
blocked_by: []
blocks: []
---

## Question

Produce a rough visual prototype of the info card when clicking a point with real nearest-neighbor data. Current behavior: card shows word name + hardcoded neighbor list. The new card must show:

1. Word name (title, monospace, cyan accent)
2. Description (from the corpus item, truncated to ~120 chars)
3. Top-5 neighbors with cosine scores (formatted like `attention  0.923`)
4. Source attribution (small, muted, at the bottom — e.g., "Source: HuggingFace")

The visual challenge: the card currently floats in 3D space (via CSS transform matrix from a ScreenPosition utility). The layout needs to work in a narrow card (~240px wide) with the dark terminal aesthetic.

Prototype as a standalone HTML page (not integrated into the Three.js app). Show 2-3 example cards with different word lengths and neighbor counts.

## Resolution

260px-wide card, vertical stack with 4 sections separated by `--border` dividers:

1. **Word name** — 14px/500, cyan accent
2. **Description** — 120 chars truncated with `…`, 3-line clamp, 11px/400/muted
3. **Top-5 neighbors** — 12px/400: name (fg, left) + score (accent-dim, right, tabular-nums)
4. **Source attribution** — 10px/400/muted, bottom

Left-edge 2px cyan accent bar (`box-shadow: inset 2px 0 0 var(--accent-dim)`). Backdrop: `oklch(0.15 0.005 260 / 0.92)` with `backdrop-filter: blur(12px)`. All JetBrains Mono.

**3 example cards** with varied data: "transformer" (HuggingFace), "backprop" (Wikipedia, short desc), "long short-term memory network" (arXiv, stress-test name truncation).

Prototype artifact: `wayfinder/prototypes/T12-info-card.html`
