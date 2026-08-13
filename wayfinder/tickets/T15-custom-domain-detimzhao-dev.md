---
id: T15
title: Promote staging to custom domain detimzhao.dev
labels:
  - wayfinder:task
status: closed
assignee: null
blocked_by: []
blocks: []
---

## Question

Promote the shipped Phase 1 site from the repo-native staging URL
(`https://detimzhao.github.io/detimzhao.dev/`) to the apex custom domain
`https://detimzhao.dev/`.

Checklist:

- [x] Set the Pages custom domain to `detimzhao.dev` (source is GitHub Actions;
      stored in Pages config, not a branch-deploy CNAME file)
- [x] Captain points DNS at Cloudflare: apex → GitHub Pages A records (DNS-only)
      and `www` → CNAME `detimzhao.github.io` (DNS-only)
- [x] GitHub verifies the domain and issues a Let's Encrypt cert (HTTPS enforced)
- [x] Verify `https://detimzhao.dev/` serves 200 and the app runs (no absolute
      subpath leak; app already uses `import.meta.url`)

This is a **task** — manual DNS change at the registrar plus a Pages config
change. No math/corpus work.

## Resolution

Custom domain is live and HTTPS-enforced.

- Pages custom domain `detimzhao.dev` set in Pages config (`cname`), Actions
  source (`build_type: workflow`), no branch-deploy CNAME file (the
  `configure-pages@v5` step emits it into the artifact).
- Cloudflare DNS: apex `@` A records → GitHub Pages IPs
  (`185.199.108.153` / `.109.153` / `.110.153` / `.111.153`), DNS-only (grey
  cloud); `www` CNAME → `detimzhao.github.io`, DNS-only. Orange-cloud proxying
  was the blocker — it hid the apex behind Cloudflare's anycast IPs so GitHub
  could not verify the domain or mint its cert.
- GitHub verified the domain, issued the Let's Encrypt cert, and HTTPS is
  enforced (`https_enforced: true`, `html_url: https://detimzhao.dev/`).
- Verified: `http://detimzhao.dev/` → 301 → `https://detimzhao.dev/`; HTTPS
  serves `200` directly from GitHub (`server: GitHub.com`); `www` → 301 → apex.

Note: the pre-existing `detimzhao.dev → detimzhao.com` Cloudflare redirect rule
was disabled; a browser-cached 301 can linger until cache is cleared.
