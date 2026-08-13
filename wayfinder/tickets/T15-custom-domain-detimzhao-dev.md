---
id: T15
title: Promote staging to custom domain detimzhao.dev
labels:
  - wayfinder:task
status: open
assignee: null
blocked_by: []
blocks: []
---

## Question

Promote the shipped Phase 1 site from the repo-native staging URL
(`https://detimzhao.github.io/detimzhao.dev/`) to the apex custom domain
`https://detimzhao.dev/`.

Checklist:

- [ ] Set the Pages custom domain to `detimzhao.dev` (source is GitHub Actions;
      stored in Pages config, not a branch-deploy CNAME file)
- [ ] Captain points DNS at the registrar: apex → GitHub Pages (A/ALIAS) and
      `www` → CNAME `detimzhao.github.io`
- [ ] GitHub verifies the domain and issues a Let's Encrypt cert (HTTPS enforced)
- [ ] Verify `https://detimzhao.dev/` serves 200 and the app runs (no absolute
      subpath leak; app already uses `import.meta.url`)

This is a **task** — manual DNS change at the registrar plus a Pages config
change. No math/corpus work.

## Resolution

_Pending execution._
