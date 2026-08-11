---
id: T03
title: Document GitHub Releases asset publishing workflow
labels:
  - wayfinder:research
status: open
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
