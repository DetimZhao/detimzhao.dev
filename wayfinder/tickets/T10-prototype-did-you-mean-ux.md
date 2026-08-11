---
id: T10
title: Prototype the "did you mean" UX
labels:
  - wayfinder:prototype
status: closed
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

## Resolution

**Hybrid A+B.** Ghost text as persistent indicator (inline, muted, at cursor — Option A). Status line as transient 4s discoverability flash (Option B). Interaction model:

| Trigger | Behavior |
|---|---|
| Type unrecognized token | Ghost shows nearest match at cursor |
| Press Tab | Input fills with correction; ghost + status line clear |
| Press Enter | Runs the corrected match |
| Press Esc | Cancels correction; raw input remains |
| Exact match | No ghost, no status line |
| Partial prefix match (`atten` for `attention`) | Suppressed — user may be typing it correctly |
| Multi-token (`atention - man + queen`) | Per-token correction; only unrecognized tokens get ghost |
| Edit distance > 3 or low similarity | Status line: "token not found: ___" (muted), no ghost |

Prototype artifact: `wayfinder/prototypes/T10-did-you-mean.html`
