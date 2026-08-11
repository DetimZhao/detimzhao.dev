---
id: T05
title: Lock the corpus item-shape schema
labels:
  - wayfinder:grilling
status: open
assignee: null
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
