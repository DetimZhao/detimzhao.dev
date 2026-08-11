---
id: T07
title: Lock URL hash parameter space
labels:
  - wayfinder:grilling
status: closed
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

## Resolution

URL hash param space locked.

**Param spec:**

| Param | Required | Values | Encoding | Behavior |
|---|---|---|---|---|
| `f` | Yes | `encodeURIComponent(formula)` | `encodeURIComponent` | Formula string. Triggers trail render on load per T06. |
| `s` | No | `default` (implicit/absent), `movies` (v1.5), extensible | Plain string | Active corpus vocabulary. Absent → `"default"`. Unknown → fallback to `"default"`. |
| `debug` | No | Boolean (key-only, or `=true`/`=1`) | None | Auto-opens observatory modal on load. Ignored if observatory not yet implemented. |

**Decoder behavior:**
- Strip `#`, split on `&`, iterate `key=value` pairs.
- Handle `f`, `s`, `debug`. Ignore all unknown params (forward-compatible, `console.debug` only).
- Bare hash (no `f=`) accepted for backward compat but canonical output on Enter is always `#f=...`.
- `/clear` resets hash to `#`.

**No other params reserved.** Camera position (`#v`) is ephemeral/device-dependent state — not serializable.

**Example URLs:**
```
#f=king-man%2Bwoman                  → "king-man+woman", default corpus
#s=movies&f=drive-heat%2Bromance     → v1.5 movies corpus
#f=RAG-retrieval%2Bgeneration&debug  → formula + observatory auto-open
```
