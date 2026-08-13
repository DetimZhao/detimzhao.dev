---
id: T14
title: First deploy — push main and verify staging URL
labels:
  - wayfinder:task
status: closed
assignee: null
blocked_by: []
blocks: []
---

## Question

Ship Phase 1 to the GitHub Pages staging URL. The repo does not exist yet
(`detimzhao/detimzhao.dev` 404s; `origin` is still a local path), and the T04
provisioning checklist was never executed.

## Task

- [x] Captain provisions `detimzhao/detimzhao.dev` (public, renamed from
      `detimzhao-dev`) and enables Pages. Pages deploys via a GitHub Actions
      workflow (`.github/workflows/static.yml`), not T04's classic
      "Deploy from a branch" source.
- [x] Add the GitHub remote and push `main` (includes `data/corpus.json.gz`,
      `data/corpus.vec.f32`, `tools/`, and the curated 1,294-item corpus).
- [x] Verify the staging URL `https://detimzhao.github.io/detimzhao.dev/` loads,
      cloud renders, a formula resolves, and no `corpus.vec.f32` integrity error.
- [x] Confirm relative paths survive the `/detimzhao.dev/` subpath (data fetches
      use `import.meta.url`; favicon is relative — expected clean).

## Resolution

Phase 1 shipped to the repo-native staging URL.

- Repo `DetimZhao/detimzhao.dev` is public; default branch `main` pushed at
  `f539a11` (includes the curated 1,294-item corpus).
- Pages deploys via a GitHub Actions workflow (`.github/workflows/static.yml`,
  commit `6a9b1a2`) — a deviation from T04's classic "Deploy from a branch"
  plan, since the branch source was never configured. Source is set to
  "GitHub Actions" in repo Settings → Pages.
- Staging URL `https://detimzhao.github.io/detimzhao.dev/` verified 22/22
  Playwright checks: cloud renders, `attention` → trail, multi-token arithmetic
  resolves to a real neighbor (`transformer - attention + convolution` →
  `convolution`), observatory opens/closes, and no JS or console errors.
- `corpus.vec.f32` integrity confirmed: the served bytes SHA-256 to
  `9630eafc88f4aacffaa2583eefb84fb789f95797d1068ff2fbe98f8ea064f5d9`, matching
  `model.vec_sha256` (no "integrity check failed" error).
- Relative paths survive the `/detimzhao.dev/` subpath: all `data/` fetches
  succeeded (zero 4xx/5xx), confirming `import.meta.url`-based loading.
