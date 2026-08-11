---
id: T10
title: Prototype the "did you mean" UX
labels:
  - wayfinder:prototype
status: open
assignee: null
blocked_by: []
blocks: []
---

## Question

Produce a concrete prototype of the "did you mean" UX when a typed token isn't in the vocab but a near-neighbor is (e.g., `atention` → nearest vocab token is `attention`).

The project uses the existing `#status-line` element (currently dead code) for invalid-formula flash messages. Options to prototype:

- **A.** Replace the ghost text with the nearest match (e.g., user types `atention`, ghost shows `attention`). Hitting Enter runs `attention` instead.
- **B.** Flash the nearest match in the status line below the input: "did you mean: attention → (enter to accept)"
- **C.** Auto-correct silently — always run the nearest match, no user indication (simplest, least transparent)
- **D.** Something else.

Prototype as a static HTML/CSS snippet (not integrated into the Three.js app — standalone to react to). Keep it cheap: a rough visual sketch that conveys the interaction, not a polished component.
