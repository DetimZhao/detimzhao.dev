---
id: T08
title: Lock the trail object shape for real-math rendering
labels:
  - wayfinder:grilling
status: open
assignee: null
blocked_by:
  - T05
blocks: []
---

## Question

Redesign the trail object for real-math rendering. Currently trails are built around WORD_CLUSTERS (source clusters, result cluster). In the real-math world:

1. **Sources are individual corpus points** (by index), not clusters. Does a trail reference its source point indices, or clone their positions into the trail object at creation time?
2. **The result** is a computed point (from PCA projection of the 384-d result vector), not a pre-existing corpus point. Does the trail store `resultPos: [x,y,z]` directly, or compute it lazily?
3. **Neighbor labels**: currently positioned at random offsets from the result cluster center. In the real-math world, each label should sit at the actual corpus position of the nearest neighbor. Does the trail carry `neighborLabelIndices: [idx1, idx2, ...]` and create sprites at the corpus positions, or store them inline?
4. **Connector threads** between source points: currently a single midpoint connector; in the real-math world, should trails draw lines between N source points sequentially?
5. **The `trail.resultWord` field**: currently a cluster key string. In the real-math world, what is it — the NN result word? The formula's computed term (not guaranteed to be in vocab)?

Blocked by T05 (corpus item schema).
