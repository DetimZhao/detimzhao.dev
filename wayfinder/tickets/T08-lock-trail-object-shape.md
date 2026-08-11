---
id: T08
title: Lock the trail object shape for real-math rendering
labels:
  - wayfinder:grilling
status: closed
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

## Resolution

Trail object shape locked. Strategy B across the board — trails own their visual output (sprites, not cloud-buffer mutation). No `highlightedIndices`. The cloud color buffer is write-once at load and never mutated by trails.

**Decisions per question:**

1. **Source reference — Strategy B (trail-owned).** Trail carries `sourceIndices: number[]` (ordered corpus indices, matching formula token order) and spawns glow sprites at the cloned positions. `highlightedIndices` removed entirely. Trails never touch the cloud color buffer; cloud/trail are independent render layers. This kills the latent shared-source dim-on-evict bug and survives async vector loading after the cloud renders.

2. **Result position — stored eagerly.** `resultPos: THREE.Vector3` computed once in `renderFormula` via PCA-3 projection and stored on the trail. The 384-d result vector lives in a separate `lastFormulaResult` global (for the observatory), not on the trail — keeping the trail purely visual/3D.

3. **Neighbor labels — indices + real corpus positions.** Trail carries `neighborLabelIndices: number[]` (top-k from NN search). Label sprites are trail-owned but positioned at the actual corpus PCA positions of those neighbors (not random offsets). For single-token formulas the neighbors come from the item's precomputed `nn`; for arithmetic results they're from the result vector's runtime NN search.

4. **Connector threads — sequential + animated result arrow.** Connectors draw from first source → second → … → last source → resultPos, sequentially. The result arrow (last segment to `resultPos`) is visually distinct from the source-to-source connectors — animated/brighter vs. static dim accent. Single-token formulas get no connectors. This generalizes the parser's arbitrary-length linear form.

5. **`resultWord` → `resultName: string | null`.** Top-1 NN name from the result vector's nearest-neighbor search, or `null` if no match crosses a confidence threshold. For single-token exact matches, `resultName` is the token itself. No longer a cluster key — a real vocab name.

**Locked trail object shape:**
```js
{
  id: number,           // Date.now()
  formula: string,      // raw input string
  sourceIndices: number[],        // ordered corpus indices (formula token order)
  neighborLabelIndices: number[], // NN result indices (top-k)
  resultPos: THREE.Vector3,       // PCA-projected 3D point (computed eagerly)
  resultName: string | null,      // top-1 NN name, or null
  glowSprites: Sprite[],          // trail-owned (source + result)
  labelSprites: Sprite[],         // trail-owned (neighbor + result labels)
  lines: Mesh[],                  // connector meshes (seq source path + result arrow)
  resultGlow: Sprite | null,      // pulsed per-frame, kept as named ref
  resultLabel: Sprite | null,     // kept as named ref
  opacity: number,                // 0.12–1.0
}
```
Removed fields: `highlightedIndices`, `sourceClusters`, `resultWord`, `resultPoint`.

**Side effects on existing code:**
- `evictTrails` / `clearAllTrails` — drop color-buffer unwinding loops; pure sprite/group removal.
- `brightenCluster` — disappears; replaced by `highlightSources(trail, indices)` that adds glow sprites at corpus positions.
- `dimAllTrails` — simplifies to sprite-opacity-only, no per-index color bookkeeping.
- `createTrailObject` — adopts new shape.
- Cloud color buffer — write-once at load (dim color for all points), never mutated by trails again.
