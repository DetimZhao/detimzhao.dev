# Tools matrix — look + organization outline (v0, branch tools-matrix-outline)

Status: DRAFT — Quantum asked to "outline the matrix look" before deciding
build steps. Not shipped. This is the design surface for how tools are
LABELLED, GROUPED and DISPLAYED once the matrix grows from 2 ("jpeg-converter",
"password-generator") toward the ~16 planned.

Source of truth for the tool list: `~/research/detimzhao-dev-lab/tools-matrix-beyond-ittools.md`.

## What the matrix IS
Currently `projects/tools/index.html` = a card grid (`repeat(auto-fill, minmax(240px,1fr))`)
with 2 active cards + `soon` dim rows. As tool count grows, an unstructured
flat grid of 16 unlabelled cards loses the "instrument rack" feel Quantum
likes. The matrix = a **scannable category grid**, not just a longer flat list.

## Look — proposed structure (card grid stays; add category SKIN)
Grid shell stays identical (auto-fill, `minmax(240px,1fr)`, gap 1em) so the
visual weight / typography (Commit Mono name + DM Sans description) is
untouched. What changes:
- Each card gets a **category tag** — a short mono label in the `.n` slot
  (currently the `01`/`02` index number). e.g. `[ conv ] [ enc ] [ gen ]
  [ net ] [ ref ]`.
- Tags use `--muted` and a small `[ ]` bracket motif (terminal voice) —
  no colored chips (color belongs on dots, not text — locked rule).
- **Grouped rendering (desktop):** grid sections break into labelled runs by
  category (automatic, driven by the tag), each with a quiet `.cat` label row
  (`// conv` styled like the landing's `//` comment). On mobile everything
  stays a flat grid (no columns).
- `soon` dimming stays for not-yet-built slots, but now dims by-category too.

Alternative (simpler, no grouping): keep flat grid, show tag only on each
card, no section labels. VOTE for either when reviewing.

## Proposed categories (keyword → tag)
- **conv**  — json-prettify, yaml↔json, text/ascii, url-encoder, html-entities,
  base64, case-converter, color (if ever), markdown↔html, toml
- **enc**   — hash-text, jwt-decoder, base64/image
- **gen**   — uuid, token, password, lorem-ipsum, random-port, crontab
- **net**   — ipv4-subnet, ipv6-ula, http-status ref
- **ref**   — regex-tester (reference+test), text-stats, mime-types
- **tst**   — json-diff, jsonpath, json-schema regex-tester

Exact binning is loose here — the point is the LOOK, not the final taxonomy.

## The 16 (tiered, from the research note) mapped to tags
1  json-prettify/minify   [conv]   (already have)
2  yaml↔json              [conv]
3  uuid-generator         [gen]
4  hash-text              [enc]
5  base64-string          [enc]
6  case-converter         [conv]
7  url-encoder            [conv]
8  html-entities          [conv]
9  regex-tester           [ref]
10 ipv4-subnet-calculator [net]
11 json-diff-viewer       [tst]    (NEW — slotted here)
12 token-generator        [gen]
13 random-port-generator  [gen]
14 crontab-generator      [gen]
15 lorem-ipsum-generator  [gen]
16 jpeg-converter         [conv]   (already have)
(+ backlog: jsonpath, json-schema, toml, docker→compose, chmod, pw-strength,
md→html — build-later.)

## Build order / next steps (for the review)
When Quantum picks a direction (grouped vs flat), the immediate build is:
Head-only (no server). Per two-voice rule (Commit Mono + DM Sans), per-tool
`VERSION` const, QA harness grows a "category tag present" assertion per card.
New tools fill in one page at a time behind `soon` → active.

## RESOLVED 2026-09-21 — locked decisions (see git history on tools-matrix-outline)
- **Display direction:** grouped category runs, each tool its own rounded card,
  adaptive 4→3→2→1 columns (`repeat` breakpoints). Index numbers 01→18 sequential
  top-to-bottom across categories (no gaps, no `--`).
- **Category header = V11b:** big category word (1.4em, weight 700) in derived
  `--accent2` + a faded neutral dashed divider line to the page edge. NOT the
  `//` comment (dropped), NOT two-accent (V11 word different from line rejected as
  too-many-colors; color carries only the word, divider stays muted). Chosen for
  single-accent discipline + label/divider role separation (guidelines).
- **STARRED shelf (option A):** verified it-tools / dock / bookmarks — favorites
  are a DUP linear shelf at top, tool stays in its native category too. ✓Baked:
  `★ starred` run (word + divider in --accent3) at top, hidden until ≥1 star;
  per-card Material `star`/`star_border` toggle (top-right, hover/focus reveal,
  filled + accent3 when starred, star stays VISIBLE once starred — click to
  unstar from BOTH native card and shelf duplicate). `--accent3` derived
  `rotHue(accent,250)`; `--accent2` = `rotHue(accent,165)`. Persistence
  `detimzhao.starred` (JSON object of keys). `soon` tools hide the star button.
  Star color = --accent3 (Quantum deferred color choice to me; picked accent3 to
  match the star metaphor, distinct from category --accent2).
- **Naming:** use "star / starred", NOT "pin" — the lab's `s`-key `pin` already
  means "pin the landing theme" (load-bearing persistence); reusing it here would
  violate NN/g heuristic #4 (consistency).