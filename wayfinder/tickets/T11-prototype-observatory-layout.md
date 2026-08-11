---
id: T11
title: Prototype the observatory live-pipeline layout
labels:
  - wayfinder:prototype
status: open
assignee: null
blocked_by: []
blocks: []
---

## Question

Produce a rough visual prototype of the observatory modal's live pipeline layout. The observatory must show (per `PLAN.md`):

- Token list (the parsed formula tokens)
- 384-d vector heatmap for each source token and the result vector
- Arithmetic expression (formula in symbolic form)
- PCA-3 → point chip (3D coordinates shown as a small display)
- Neighbors list (top-10 with cosine scores)
- Footer: model card, corpus size, variance explained, link to `tools/generate_corpus.py`

The key visual challenge is the 384-d heatmap — that's too many pixels for a small modal. Options:

- (a) a per-vec summary stat (norm, min, max, mean) instead of a pixel heatmap
- (b) a binned heatmap (group 384 dims into ~32 bins)
- (c) a sparkline-style strip

Prototype as a standalone HTML page (not integrated into the Three.js app). Dark terminal aesthetic per `brand-spec.md`. Show: tokens `king`, `-`, `man`, `+`, `woman` → result `queen` as a concrete case.
