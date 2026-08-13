---
id: T04
title: Provision the target GitHub repo
labels:
  - wayfinder:task
status: closed
assignee: null
blocked_by: []
blocks: []
---

## Question

Provision the target GitHub repo for the playground and set GitHub Pages to deploy from trunk. Verify the repo-native staging URL is reachable.

Checklist:

- [x] Create repo `detimzhao/detimzhao.dev` (renamed from `detimzhao-dev`)
- [x] Set GitHub Pages source to **GitHub Actions** (`.github/workflows/static.yml`),
      not the classic default-branch deploy
- [x] Verify the repo-native staging URL (`https://detimzhao.github.io/detimzhao.dev/`)
- [x] Confirm no `CNAME` file is present (custom domain promotion is out of scope until real math lands per Destination)

This is a **task** (not a decision) — manual work that unblocks the staging CI step.

## Resolution

User provisions `detimzhao/detimzhao.dev` manually. **Deploy is GitHub
Actions-based**, not the classic branch source — the workflow
`.github/workflows/static.yml` deploys on push to `main` and Pages source is set
to "GitHub Actions" in repo Settings → Pages.

The branch-source command originally locked here is superseded:

```bash
gh repo view detimzhao/detimzhao.dev     # confirm existence
gh repo create detimzhao.dev --public     # if not exists
# SUPERSEDED — branch-source Pages (no longer used):
# gh api repos/detimzhao/detimzhao.dev/pages \
#   --method POST \
#   --input <(echo '{"source":{"branch":"main","path":"/"}}')
```

Expected staging URL: `https://detimzhao.github.io/detimzhao.dev/`. CNAME file reserved for custom domain promotion after real math lands. Subpath at `/detimzhao.dev/` means absolute paths break — deploy task must use relative paths or `<base>` tag (already handled via `import.meta.url`).
