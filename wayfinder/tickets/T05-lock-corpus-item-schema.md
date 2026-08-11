---
id: T05
title: Lock the corpus item-shape schema
labels:
  - wayfinder:grilling
status: closed
assignee: opencode
blocked_by: []
blocks:
  - T08
---

## Question

Lock the schema for each item in the corpus. The `PLAN.md` specifies `corpus.json.gz` as an array of `{name, description, pos:[x,y,z], nn:[10 names + scores]}`. But we need to settle:

1. **Attribution fields**: does each item carry `source_url`, `source_set` (which source it came from)? Or is attribution tracked at the corpus level only (SOURCES.md)?
2. **The `description` field**: what goes in it? The model card excerpt? The Wikipedia first paragraph? The arXiv abstract truncated to N chars? What's the length budget?
3. **The `nn` sub-shape**: `[{name, score, idx}]` or just `[{name, score}]`? Does the index reference into the names array, or is it redundant?
4. **What key identifies an item uniquely?** `name` alone, or does name collision across sources mean we need `id` or `source_set + name` composite?
5. **What should be the final JSON schema for a single item?** Write it out.

Blocking: T08 (trail object shape depends on this schema).

## Resolution

Locked schema:

```json
{
  "id": "string (stable slug: {source}-{name-slug}, e.g. 'wikipedia-deep_learning')",
  "name": "string (display name, lowercase, unique — deduplicated on first occurrence)",
  "source": "string (huggingface|arxiv|wikipedia|pytorch|sklearn|terminology)",
  "source_url": "string (URL to original content)",
  "description": "string (~200 chars max, first sentence/paragraph adapted per source)",
  "pos": [number, number, number],
  "nn": [{"name": "string", "score": number}]
}
```

**Decisions per question:**

1. **Attribution**: per-item `source` + `source_url` — feeds the info-card attribution line and SOURCES.md auto-generation. Individual source URLs satisfy T01's per-source attribution requirements (Wikipedia article links, HF model pages, etc.).
2. **Description**: ~200 chars, always present. Content varies by source (HF README first para, arXiv abstract, Wikipedia first para, PyTorch/sklearn docstring, terminology glossary). Truncated with `…`.
3. **nn**: `[{name, score}]` — names are enforced unique (deduplicate on first occurrence). Raw cosine similarity (0-1). Top-10 per `PLAN.md`. No `id`/`idx` needed since names are unique.
4. **Unique key**: `id` as `{source}-{name_slug}` — stable across regenerations. The items array and `corpus.vec.f32` share index order, but `id` is the semantic key.
5. **File layout**: `corpus.json.gz` root bundles `{"items": [...], "pca": {"mean": [384], "components": [[3,384]]}, "model": {"id": "all-MiniLM-L6-v2", "corpus_size": N, "variance_explained": [pc1, pc2, pc3]}}` — one fetch for all metadata. `corpus.vec.f32` is a separate raw binary file (same order as `items` array). This merges the previously-separate `pca.json` and `model.json` into the gzipped file.
