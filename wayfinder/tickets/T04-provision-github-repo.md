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

- [ ] Create repo `detimzhao/detimzhao.dev` (or confirm if it already exists with a different name)
- [ ] Set GitHub Pages source to deploy from the default branch root (`/` or `/docs`)
- [ ] Verify the repo-native staging URL (`https://detimzhao.github.io/detimzhao.dev/` or equivalent)
- [ ] Confirm no `CNAME` file is present (custom domain promotion is out of scope until real math lands per Destination)

This is a **task** (not a decision) — manual work that unblocks the staging CI step.

## Resolution

User will provision `detimzhao/detimzhao.dev` manually. Commands locked:

```bash
gh repo view detimzhao/detimzhao.dev     # confirm existence
gh repo create detimzhao.dev --public     # if not exists
gh api repos/detimzhao/detimzhao.dev/pages \
  --method POST \
  --input <(echo '{"source":{"branch":"main","path":"/"}}')
```

Expected staging URL: `https://detimzhao.github.io/detimzhao.dev/`. CNAME file reserved for custom domain promotion after real math lands. Subpath at `/detimzhao.dev/` means absolute paths break — deploy task must use relative paths or `<base>` tag.
