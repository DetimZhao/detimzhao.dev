---
id: T09
title: Lock GitHub Releases versioning scheme
labels:
  - wayfinder:grilling
status: open
assignee: null
blocked_by: []
blocks: []
---

## Question

Lock the versioning convention for corpus releases.

1. **Tag format**: `v1-corpus`, `corpus-v1.0`, `corpus-2024-09`, or date-tagged like `corpus-20240811`?
2. **Regeneration**: if the corpus is regenerated (e.g., sources update, new fetch strategy), does it get a new tag? Is the old tag kept or deleted?
3. **Hardcoded tag references**: where does the code hardcode the Release tag to fetch from? Just hardcoded in `script.js`, or in a `model.json` field that the loader reads?
4. **Integrity**: should `pca.json` and `model.json` carry their own version/tag fields for integrity checks?
5. **Tag-to-commit relationship**: should the tag point to a specific commit in the repo?
