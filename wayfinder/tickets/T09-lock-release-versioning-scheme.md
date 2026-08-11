---
id: T09
title: Lock GitHub Releases versioning scheme
labels:
  - wayfinder:grilling
status: closed
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

## Resolution

Re-interpreted under T03 (corpus files committed to repo, not GitHub Releases).

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | `corpus_version: "1.0"` in model metadata (corpus.json.gz) | Files committed to repo — no Release tags needed. Metadata field is the single source of truth. |
| 2 | Regeneration overwrites `data/`, bumps `corpus_version`, optional git tag | v1 frozen per PLAN.md. Git history is the archive. |
| 3 | Zero hardcoded version refs in script.js. Version read from runtime metadata. | Same-origin paths (`/data/corpus.json.gz`) are fixed. Version is data, not code. |
| 4 | `vec_sha256` hex string in model metadata. Verified at runtime via `SubtleCrypto.digest`. | Catches cache corruption. Mismatch → `console.error` + observatory footer warning (non-blocking). |
| 5 | Metadata field authoritative. Git tag (`corpus-v1.0`) is optional human convenience. | `git log -- data/corpus.json.gz` already reveals version history. Tag is garnish, not contract. |

No further integrity fields needed. `corpus_version` + `vec_sha256` cover identification and verification.
