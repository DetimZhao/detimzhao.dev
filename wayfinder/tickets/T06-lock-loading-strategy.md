---
id: T06
title: Lock the loading strategy
labels:
  - wayfinder:grilling
status: open
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
