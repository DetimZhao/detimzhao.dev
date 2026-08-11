# Plan: Semantic Arithmetic Playground — `detimzhao.dev`

## Reference prototype

The existing prototype lives in the local Open Design project folder. It is a single-file HTML app with a hardcoded shell (Three.js point cloud, formula input, terminal aesthetic, info card, scanlines) — all of which is preserved as the visual/interaction baseline. Only the fake math core is replaced.

```
/Users/tim/Library/Application Support/Open Design/namespaces/release-stable/data/projects/f4e30a47-3795-47c4-9292-f9a0f4e6a8e1
```

Key files:
- `semantic-arithmetic-playground.html` — 993 lines. Vanilla HTML/CSS/JS, Three.js via CDN importmap. Contains the `WORD_CLUSTERS` hardcoded proto (8 clusters with hardcoded neighbor lists and decorative positions), the scripted `king - man + woman → queen` path, and all UI shell code that the rebuild inherits.
- `brand-spec.md` — design tokens (colors, typography, posture rules). Authoritative.
- `image.png` — screenshot of current render.

Stack target for the rebuild: **vanilla JavaScript, HTML, CSS**. CLI: **OpenCode (opencode-cli)**.

## Locked decisions

| Decision | Choice |
|---|---|
| Corpus direction | Hybrid: frozen embeddings (default landing) + self-corpus mode (Phase 2) |
| Frozen corpus (v1) | **AI/ML concepts, ~3k items, ~2MB gzipped.** Sources: HuggingFace model cards, Wikipedia ML/DL articles, arXiv cs.CL/cs.LG abstracts (top-cited), PyTorch/sklearn docs, NLP/CV/RL terminology. Hosted via GitHub Releases assets (no LFS). The toy's latent space *is* the concepts behind the toy — a meta-loop. |
| Frozen corpus model | `all-MiniLM-L6-v2` (384-dim) — chosen so Phase 2 user embeddings project into the *same* PCA basis via the saved transform matrix |
| Projection | PCA-3 (linear, deterministic — required for Phase 2 alignment; UMAP is non-parametric and can't project new points) |
| Repo layout | New repo `detimzhao/detimzhao.dev` on GitHub Pages with `detimzhao.dev` custom domain. Corpus assets on GitHub Releases (self-service delete-and-replace). No LFS. |
| Trail behavior | Each formula persists as a glowing thread + labeled result + neighbor bloom; old trails dim to ~0.2 opacity until cleared |
| Trail clearing UX | Both: `/clear` slash command in the input AND a subtle clear button (better UX for discoverability) |
| Deep links | URL hash carries current formula (e.g. `#transformer-attention+diffusion`); on load, auto-runs if present |
| Observatory depth | Live pipeline visualization in v1 — tokens, 384-dim vector heatmap, arithmetic, PCA-3 → point, neighbors — pulled live from current formula |
| Auto-rotate | Slow auto-rotate on idle (keep), stops on user drag, resumes after ~5s idle |
| Movies corpus | **Deferred to v1.5.** Layered visibility on top of AI/ML cloud, color TBD (spec is amendable), toggle clears trails+input (acceptable reset behavior), URL `#s=movies&f=...`. Design it when movies actually ship, informed by v1 usage. |
| Aesthetic | Dark `#0a0a0a`, JetBrains Mono, cyan accent (single accent for v1), zero chrome. `brand-spec.md` is a draft — amendable if v1.5 introduces a second color for the movies layer. |
| Stack | Vanilla JS/HTML/CSS, no build. **Three.js** via CDN importmap (as in the existing Open Design prototype). Transformers.js added only in Phase 2 |

## What's wrong with the existing prototype (the work to do)

The Open Design HTML (`semantic-arithmetic-playground.html`, 993 lines) is the *right shell* but its math is fake:

- `WORD_CLUSTERS` has 8 hand-authored clusters with decorative positions (`randomNear`) — not derived from vectors
- Neighbor lists are hardcoded, not computed
- The arithmetic path `king - man + woman → queen` is **single-scripted**: lines 802–860 always jump to the `queen` cluster regardless of inputs
- No loading of real embeddings, no formula parser, no trail, no URL state

The rebuild keeps the visual/interaction shell (point cloud, orbit controls, input box, info card, scanlines, help button, loading screen) and replaces the math core.

## Phases

### Phase 0 — Corpus generation (offline Python, no relation to site deploy)

New tool `tools/generate_corpus.py`:

1. Fetch raw text from AI/ML concept sources: HuggingFace model cards (most-downloaded ~1k models), Wikipedia ML/DL articles (categories: Machine Learning, Deep Learning, NLP, Computer Vision, Reinforcement Learning), arXiv cs.CL/cs.LG top-cited abstracts (~500), PyTorch/sklearn docs (API reference terms), key NLP/CV/RL terminology lists. Target ~3k items.
2. For each item, build an embedding input string (e.g. `[concept name] [definition/description] [context excerpt]`)
3. Embed all items with `sentence-transformers/all-MiniLM-L6-v2` (batched, GPU optional)
4. Fit PCA-3 on the N × 384 matrix; **save the mean (384) and components (3 × 384)** — this is the projection basis both phases use
5. Project all items to 3D; min-max normalize to ~±10 cube
6. Precompute top-10 nearest neighbors per point (cosine sim) for the click-to-inspect card

Output artifacts in `data/`:
- `corpus.json.gz` — array of `{name, description, pos:[x,y,z], nn:[10 names + scores]}`
- `corpus.vec.f32` — `Float32Array` of `N × 384`, used for runtime arithmetic
- `pca.json` — `{mean:[384], components:[[3×384]]}` — used by Phase 2 to project user embeddings
- `model.json` — metadata: model id, corpus stats, variance explained by PC1–3

Target weight after gzip: ~2MB. Corpus shipped as a GitHub Release asset (not Git LFS — self-service delete-and-replace, no GH support tickets). v1 corpus is frozen; no periodic regen unless Phase 2 or v1.5 warrants it.

### Phase 1 — Playground site (frozen corpus)

File structure:

```
detimzhao.dev/
  index.html
  style.css
  script.js
  data/
    corpus.json.gz
    corpus.vec.f32
    pca.json
    model.json
  tools/
    generate_corpus.py
    requirements.txt
  .github/workflows/
    static.yml
  CNAME  →  detimzhao.dev
  README.md
  AGENTS.md
  favicon.svg
```

**`index.html` / `style.css`** — adapted from the Open Design prototype, keeping:
- Dark monospace aesthetic (brand-spec tokens already defined)
- `<canvas>` full-bleed, bottom-center prompt box (`>` prompt char), bottom-right `?` + clear button, status line, scanlines overlay, info-card on click
- Three.js `importmap` for `three@0.160.0` + `OrbitControls`

**`script.js`** — the rebuild. Major modules:

```js
// 1. Load async — decompress gzip from GitHub Release, parse Float32 binary
loadCorpus() → { names, descriptions, positions, vectors(N×384), nn }

// 2. Build geometry — N points at real PCA positions (not random)
buildPointCloud()

// 3. Formula parser — general linear form, arbitrary length
parseFormula("transformer - attention + diffusion")           → { tokens, ops }
parseFormula("RAG - retrieval + generation")                  → valid too

// 4. Token resolution — exact match first, fallback to cosine-nearest-vocab ("did you mean")
lookupToken("tranformer") → "transformer" or null

// 5. Arithmetic — add/subtract vectors in 384-d space
computeResult(tokens, ops, vectors) → resultVec(384)

// 6. Search — top-k nearest neighbors by cosine similarity
nearestNeighbors(resultVec, k=10) → [{name, score, idx}]

// 7. Project — apply precomputed PCA to result vector → 3D position
projectVec(resultVec, pca) → [x, y, z]

// 8. Render one formula as a trail
renderFormula(trailId) → {
  sourcePoints highlight (sequence)           // brighten source points cyan
  threads between source points               // cylinders/lines showing subtraction/addition paths
  arrow from last source toward result        // animated
  bloom at resultPos                          // pulsing glow sprite
  neighbor labels (~10) with cosine scores    // spaced around result
  trail object pushed to trails[]
}

// 9. Trail lifecycle
trails = []                   // max ~10, FIFO evict
addTrail(trailObject)         // bright, full opacity
dimOldTrails()                // fade everything except latest to ~0.2 opacity
clearTrails()                 // wipe all, triggered by '/clear' or button click

// 10. Clear UX — both mechanisms
inputListener: keydown '/clear' → clearTrails(), reset URL hash
clearButton: click → clearTrails(), reset URL hash, briefly flash button

// 11. URL state
serializeToHash(formula) → history.pushState
deserializeFromHash() → on load, populate input, auto-run if non-empty

// 12. Click inspect — preserved from prototype, rewired to use loaded nn[]
showInfoCard(pointIdx) → render word + top-5 neighbors + cosine scores
dismiss on click-away

// 13. Observatory modal — open on '?' button click
openObservatory() → render live pipeline from lastFormula:
  tokens → embed vector heatmap(384) → arithmetic expression → result vec heatmap(384)
  → PCA-3 → 3D point chip → neighbors[10] list + scores
  footer: model card, corpus size, variance explained, link to tools/generate_corpus.py
close on Esc or click outside

// 14. Auto-rotate (slow, ~0.2 rad/s target orbit)
idleTimer → 5s after last drag → resume auto-rotate → stop on mousedown/touchstart on canvas
```

**Interactions summary:**
- Type formula → Enter → new trail rendered, URL updated, observatory (if open) refreshes with live pipeline
- Drag canvas → orbit; scroll → zoom; auto-rotate resumes after ~5s idle
- Click point → info card with real top-5 neighbors + cosine scores; dismiss on click-away
- `?` bottom-right → observatory modal overlay (semi-opaque backdrop, monospace pipeline diagram)
- **Clear button** bottom-right near `?` → wipe all trails, reset URL hash (subtle, icon-based)
- **`/clear` in input** → same as clear button (discoverable for terminal users)
- `Esc` → close observatory / info card, blur input
- Initial hash → auto-runs on first visit (e.g. `detimzhao.dev/#transformer-attention+diffusion` renders on arrival)

### Phase 2 — Self-corpus mode (additive, weeks later)

- New button in observatory footer: `[ load your own corpus ]`
- Modal with paste textarea (any plain text — a script, README, subthread)
- Flow:
  1. Load `@xenova/transformers` (Transformers.js) + `all-MiniLM-L6-v2` (quantized, ~23MB) via importmap — **lazy, only when this button is clicked**
  2. Web Worker chunks the text by sentence/paragraph, embeds each
  3. Apply stored PCA: `userVec(384) × components(3×384) − mean → userPos3D` — projects into the AI/ML PCA basis (single basis for v1; multi-space routing deferred to v1.5)
  4. User points render in a second color (e.g. amber, on top of cyan frozen points)
  5. Formula input vocabulary expands to union of {frozen corpus names} + {user chunk labels}
  6. Arithmetic finds nearest user chunk to user phrases, mixes with frozen items
  7. `localStorage` cache on a hash of pasted text → embeddings, so revisits skip re-embedding

Phase 2 reuses Phase 1's render/parse/arithmetic/trail/observatory code paths — only the vocab + a second point cloud layer change.

## Future / v1.5 — Movies corpus

When movies ship as a second corpus (deferred, no design until v1 has real usage data):

- Separate corpus generation run: IMDb/Kaggle movie dataset, ~10k films, embed with same `all-MiniLM-L6-v2`, fit its own PCA-3 basis, ship as a separate GitHub Release asset (`corpus-movies.json.gz` + `.vec.f32` + `pca.json`)
- **Layered visibility**: both clouds rendered simultaneously (not a toggle that flips the whole view). AI/ML points in cyan, movie points in a second color TBD. Layering keeps both spaces visible — no destructive "toggle clears everything" UX.
- **Arithmetic stays single-space**: the formula input resolves tokens from one space at a time (auto-detected by which corpus the typed tokens belong to). No cross-domain arithmetic. A subtle state indicator shows which space is active.
- **Color for movies**: TBD when v1.5 is scoped. `brand-spec.md` is a draft — amendable if needed.
- **URL**: hash param encodes space + formula — `#s=movies&f=drive-heat+romance`. One product, state in hash, not `/movies` path.
- **Toggle UX**: not designed now (YAGNI). Decide based on v1 real-world usage: how often do people clear trails? Do they revisit? Is layered crowding an issue with two clouds?

## Risks / open items

1. **Corpus sourcing** — HuggingFace/arXiv/Wikipedia bulk fetch strategy + ToS verification needed before Phase 0. HuggingFace model cards are permissive; arXiv API has rate limits; Wikipedia has dumps and clear ToS. Evaluate scale (~3k items across all sources), rate limits, and redistribution rights before running `generate_corpus.py`.
2. **Bundle weight** — ~2MB gzipped total for v1 (metadata ~200KB first paint, vector binary ~1.8MB lazy-loaded on first formula). Mitigations: Brotli over gzip; `Cache-Control: max-age=86400, immutable` on Release assets; split metadata from vectors so cloud renders before vectors download. At ~2MB this is well within tolerable range for a portfolio toy.
3. **PCA-3 variance explained** — typical for MiniLM-L6 is ~12–18% on natural text, so the 3D view is a *very* lossy projection. That's fine — arithmetic happens in the original 384-d space; PCA only affects display. Will show variance in observatory footer.
4. **Three.js as the only dependency** — loaded via importmap (no bundler, no framework, no build). Same approach as the existing Open Design prototype. The `.com` site goes further (hand-rolled WebGL shaders); we could match that flex later by rewriting the point renderer, but Three.js is the right choice for shipping v1 fast.
5. **`detimzhao.dev` domain ownership** — assumed the user owns it and will point DNS at GitHub Pages.
6. **Trail accumulating into clutter** — trail dim to 0.2 + cap at ~10 active trails (FIFO evict). `/clear` or clear button resets. Button provides discoverable escape hatch.
7. **Phase 2 model weight** — first self-corpus load downloads ~23MB model on click. Acceptable for a "load your own" flow (user has opted in), but needs a loading progress indicator.

## Verification commands

```sh
# Dev preview
python3 -m http.server 8080
# → open http://localhost:8080

# Or
npx serve .

# Phase 0 corpus regen (offline, once; periodic CI regen later)
cd tools && pip install -r requirements.txt
python generate_corpus.py --out ../data/

# Verify output
ls -lh data/
```
