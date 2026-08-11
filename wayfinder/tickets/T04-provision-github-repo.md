---
id: T04
title: Provision the target GitHub repo
labels:
  - wayfinder:task
status: open
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
