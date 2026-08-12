---
id: T14
title: First deploy — push main and verify staging URL
labels:
  - wayfinder:task
status: open
assignee: null
blocked_by: []
blocks: []
---

## Question

Ship Phase 1 to the GitHub Pages staging URL. The repo does not exist yet
(`detimzhao/detimzhao.dev` 404s; `origin` is still a local path), and the T04
provisioning checklist was never executed.

## Task

- [ ] Captain provisions `detimzhao/detimzhao.dev` (public) and enables Pages
      from `main` root (`/`) — T04's locked commands.
- [ ] Add the GitHub remote and push `main` (includes `data/corpus.json.gz`,
      `data/corpus.vec.f32`, `tools/`, and the curated 1,294-item corpus).
- [ ] Verify the staging URL `https://detimzhao.github.io/detimzhao.dev/` loads,
      cloud renders, a formula resolves, and no `corpus.vec.f32` integrity error.
- [ ] Confirm relative paths survive the `/detimzhao.dev/` subpath (data fetches
      use `import.meta.url`; favicon is relative — expected clean).

## Resolution

_Pending execution._
