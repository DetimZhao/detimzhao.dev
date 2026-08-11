---
id: T07
title: Lock URL hash parameter space
labels:
  - wayfinder:grilling
status: open
assignee: null
blocked_by: []
blocks: []
---

## Question

Lock the URL hash param space now, so the format committed in the shell-fix doesn't need a second change when v1.5 lands.

1. Confirm `#f=<encodeURIComponent-formula>` as the current formula param.
2. PLAN.md v1.5 spec is `#s=movies&f=drive-heat+romance`. Reserve `#s=<corpus-id>` now? What are the valid `<corpus-id>` values — just `default` (AI/ML) and `movies`? Or extensible to N corpora?
3. Are there any other params we can foresee? A `debug` param for observatory-on-load? A `v` param for viewer settings (camera position)?
4. If we reserve param space now but don't implement it, what does the decoder do with unknown params? Ignore them (forward-compatible)?
5. Document the final param spec: param list, encoding rules, parser behavior.
