---
id: T06
title: Lock the loading strategy
labels:
  - wayfinder:grilling
status: closed
assignee: null
blocked_by: []
blocks: []
---

## Question

Lock the first-paint and lazy-load strategy for the corpus.

PLAN.md says "metadata ~200KB first paint, vector binary ~1.8MB lazy-loaded on first formula." But we need to settle:

1. **What exactly is in 'metadata'?** Just names + positions (for the cloud), or also descriptions (for info-card), or also nn lists (for click-to-inspect)?
2. **If metadata includes everything except the 384-d vectors**, then `corpus.json.gz` is loaded on first visit, and `corpus.vec.f32` is fetched on first formula entry. Confirm this is the plan.
3. **What is the perceived-load budget?** Is there a loading screen? A skeleton cloud (positions without vectors, gray dots)? Or does the cloud just not render until metadata arrives?
4. **How does the loading sequence interact with URL hash auto-run on first visit?** If the hash carries `#f=king-man+woman`, does the site wait for `corpus.vec.f32` to load before running the formula, or does it show the cloud first and defer?
5. **Error handling**: what if the Release fetch fails (corpus unavailable)? Show a static fallback (the current WORD_CLUSTERS), or show an error screen?

## Resolution

Loading strategy locked. Two-phase fetch: cloud-on-visit, vectors-on-first-formula. No WORD_CLUSTERS fallback.

**Decisions per question:**

1. **Metadata scope** — corpus.json.gz (per T05) contains items (name, description, pos, nn), pca (mean + components), and model metadata. This is everything except the 384-d vector weights. Sufficient for: point cloud render, info cards, observatory footer. Not sufficient for: formula arithmetic, runtime NN search, PCA projection of computed vectors.

2. **Two-phase load confirmed** — corpus.json.gz on first visit → cloud renders. corpus.vec.f32 on first formula entry → arithmetic unlocks. No further subdivision.

3. **Perceived-load budget: black canvas** — no loading spinner, skeleton cloud, or text. The `#0a0a0a` page background matches the empty canvas background. Cloud "emerges" when corpus.json.gz arrives (200–500ms from same origin). Zero-chrome loading state.

4. **URL hash auto-run** — when `#f=formula` is present on first visit, corpus.json.gz and corpus.vec.f32 are fetched in parallel. Cloud renders as soon as corpus.json.gz arrives. Trail renders as soon as .vec.f32 arrives (input is pre-filled with a subtle pulse until trail appears). If hash has no formula, .vec.f32 is not fetched (save the ~4.6MB).

5. **Error handling: inline, no fallback** — corpus.json.gz failure: ghost text "corpus unavailable" in the input area. corpus.vec.f32 failure: status-line flash "vector data unavailable", formula input still works for token lookups (exact-match only). No fallback to WORD_CLUSTERS (dead code after real-math render rewrite). No error overlay or modal.
