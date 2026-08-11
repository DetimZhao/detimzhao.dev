---
id: T12
title: Prototype the info-card layout
labels:
  - wayfinder:prototype
status: open
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
