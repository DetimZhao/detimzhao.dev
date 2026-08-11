---
id: T03
title: Document GitHub Releases asset publishing workflow
labels:
  - wayfinder:research
status: closed
assignee: null
blocked_by: []
blocks: []
---

## Question

Document the GitHub Releases asset publishing workflow for this project's corpus artifacts.

1. What's the asset URL pattern for a tagged release? (e.g., `https://github.com/{owner}/{repo}/releases/download/{tag}/{asset}`)
2. What `Cache-Control` headers does `objects.githubusercontent.com` serve for Release assets? Is immutable caching available? What's the recommended approach for versioned assets (cache forever on a unique tag URL)?
3. How do you create a Release + upload multiple binary assets in a single operation? (`gh` CLI vs REST API — prefer `gh` CLI)
4. What's the maximum asset size limit for GitHub Releases? Verify `corpus.vec.f32` at ~1.8MB fits comfortably.
5. Are there auth requirements for downloading Release assets from a public repo's Pages site? (the playground loads from the browser — must be public, no auth)

Output: Release-publishing instructions for `tools/README.md`, including the exact `gh` CLI commands to create a release and upload the four asset files (`corpus.json.gz`, `corpus.vec.f32`, `pca.json`, `model.json`).

## Research context

Findings at [`wayfinder/research/T03-document-release-publishing.md`](../research/T03-document-release-publishing.md).

**Critical finding**: GitHub Release asset URLs do NOT serve `Access-Control-Allow-Origin` headers — a GitHub Pages site cannot cross-origin `fetch()` Release assets. jsDelivr mirrors git repo trees, not Release attachments. **Recommendation**: commit corpus files to the repository and serve from the same Pages origin (no CORS issue; 2 GiB per-file limit is far above the ~2.5MB total). This overrides the PLAN.md assumption that corpus files live on GitHub Releases.

## Resolution

GitHub Releases cannot serve as a runtime asset host because Pages sites are on a different origin (`*.github.io`) and Release assets lack CORS headers. The corpus files (2.5 MB total) will be **committed to the repo** and served from the same Pages origin — no CORS issue, no Release dependency.

- **Asset URL pattern** (for reference only, not used for runtime): `https://github.com/{owner}/{repo}/releases/download/{tag}/{asset}`
- **CORS**: no `Access-Control-Allow-Origin` on `release-assets.githubusercontent.com` — confirmed by HEAD request.
- **jsDelivr**: only serves git tree files, not Release attachments.
- **New plan**: corpus files (`corpus.json.gz`, `corpus.vec.f32`, `pca.json`, `model.json`) committed to `data/` directory, `fetch('./data/corpus.json.gz')` from same origin. Add to `.gitignore` exception.
- Full findings at [`wayfinder/research/T03-document-release-publishing.md`](../research/T03-document-release-publishing.md).
