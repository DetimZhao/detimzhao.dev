# Wayfinder map — Semantic Arithmetic Playground

## Destination

Ship the Semantic Arithmetic Playground to `detimzhao.dev` with the real math core from `PLAN.md` Phase 1 — async corpus load, general linear formula parser, 384-d vector arithmetic, cosine nearest-neighbor search, PCA-3 projection, live observatory — plus the surviving shell bug fixes from the code audit. Staging deploys to the repo-native GitHub Pages URL only; the custom domain is promoted after real math lands.

## Notes

- Domain: vanilla HTML/CSS/JS + Three.js 0.160 via CDN importmap. No build, no framework.
- Skills each working session should consult:
  - `grill-me` — for grilling-type tickets (decision conversations)
  - `grill-with-docs` — for grilling tickets that also need ADR/glossary output
  - `research` — resolves research-type tickets via subagent (installed: `mattpocock/skills@research`)
  - `stop-slop` — editing prose in observatory/UX copy
- Reference files: `PLAN.md` (authoritative spec), `AGENTS.md` (project conventions), `brand-spec.md` (design tokens)
- No `/prototype` skill installed; prototype tickets (T10/T11/T12) are resolved by producing rough standalone HTML artifacts in this workspace

## Decisions so far

*(empty — charting session; no tickets resolved yet)*

## Not yet specified

- **Shell absorption**: will the existing Three.js shell structurally accept async `loadCorpus()` + the new render path, or need refactor first? Only visible once Sprint 1 integration is attempted. Graduates when parser/arithmetic ticket resolves.
- **Vector binary on first paint**: does the cloud render from metadata alone, or do positions need to be inline? Depends on the loading-strategy decision (T06) but rendering performance is foggy until tried.
- **Trail object redesign**: when sources are individual corpus points (indices) rather than clusters, what does the trail object shape become? Depends on corpus schema decision (T05) and parser/arithmetic resolution.

## Out of scope

- Phase 2 self-corpus mode (deferred per `PLAN.md:172–185`)
- v1.5 movies corpus design (deferred per `PLAN.md:187–196`)
- localStorage trail persistence (contradicts `PLAN.md:144–145` single-formula-in-hash design)
