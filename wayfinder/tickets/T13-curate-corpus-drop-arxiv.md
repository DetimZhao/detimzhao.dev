---
id: T13
title: Curate corpus — drop arXiv paper-title entries
labels:
  - wayfinder:grilling
status: closed
assignee: null
blocked_by: []
blocks: []
---

## Question

Corpus-quality review found 500 of 1,794 entries (27%) are truncated arXiv paper
titles — verbose gibberish like "catgan categoryaware generative adversarial
networks with hierarchical evolutionary" (83 chars) — because `generate_corpus.py`
used arXiv abstract *titles* as the `name` field. They pollute point-cloud clicks
and formula results. Decide how to clean them up.

## Resolution

**Drop all 500 arXiv entries; keep the 1,294 non-arxiv entries as-is.**

- Investigation showed only 10 of 500 arXiv entries are under 35 chars, and even
  those are paper titles ("how to avoid being eaten by a grue", "passage
  reranking with bert") — none are clean concepts. Drop all 500.
- The long pytorch/sklearn API names (`torch.nn.functional.binary_cross_entropy_with_logits`)
  stay — verbose but precise and identifiable, not gibberish. Captain chose
  "keep as-is" over tidying them.

**Execution** (`tools/curate_corpus.py`, numpy + hashlib only):

- Filter `source != "arxiv"` → 1,294 kept; reindex vectors in kept order
  (384-D embeddings unchanged).
- **PCA transform preserved exactly — NOT refit.** Kept items' 3D `pos` are
  unchanged, so the Phase 2 shared-basis contract (user embeddings project into
  the same basis) stays stable.
- Recompute top-10 cosine nn among the kept 1,294 only (old nn lists referenced
  dropped arXiv items), written as `{"name", "score"}` objects natively.
- `model.corpus_count`/`corpus_size` = 1294; `vec_sha256` recomputed from the
  filtered vec bytes; `corpus_version` bumped to `1.1` (per T09).

QA: 21/21 Playwright checks pass, observatory footer reads "1,294 items", zero
console errors.
