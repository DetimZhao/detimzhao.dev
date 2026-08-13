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

- [T01 — Verify redistribution rights and attribution rules](tickets/T01-verify-redistribution-rights.md) — All five sources permit redistribution; HF needs permissive-license filtering, Wikipedia needs CC BY-SA 4.0 on corpus, arXiv is CC0, PyTorch/scikit-learn are BSD 3-Clause.
- [T02 — Document per-source fetch strategies](tickets/T02-document-fetch-strategies.md) — Specific API endpoints, pagination, rate limits documented for HF Hub, arXiv, Wikipedia, PyTorch/scikit-learn, terminology lists.
- [T03 — Document GitHub Releases asset publishing workflow](tickets/T03-document-release-publishing.md) — **GitHub Releases does not serve CORS headers.** Corpus files will be committed to the repo and served from same Pages origin. Overrides PLAN.md Release-asset assumption.
- [T05 — Lock the corpus item-shape schema](tickets/T05-lock-corpus-item-schema.md) — Per-item schema locked: `id (source-name-slug), name (unique), source, source_url, description (~200 chars), pos, nn[{name, score}]. corpus.json.gz bundles items + pca + model metadata; corpus.vec.f32 is raw binary in same order.`
- [T08 — Lock the trail object shape](tickets/T08-lock-trail-object-shape.md) — Strategy B: trail-owned source sprites (not cloud-buffer mutation). Shape locked: `{id, formula, sourceIndices[], neighborLabelIndices[], resultPos, resultName|null, glowSprites[], labelSprites[], lines[], resultGlow, resultLabel, opacity}`. Sequential connectors with animated result arrow. Cloud buffer is write-once; trails are independent render layers.
- [T06 — Lock the loading strategy](tickets/T06-lock-loading-strategy.md) — Two-phase: corpus.json.gz on first visit (cloud renders, black-canvas loading state, no spinner), corpus.vec.f32 lazily on first formula. URL hash with formula triggers parallel fetch of both files; cloud renders first, trail follows. Inline error states (no fallback to WORD_CLUSTERS, no error overlay).
- [T04 — Provision the target GitHub repo](tickets/T04-provision-github-repo.md) — Repo `detimzhao/detimzhao.dev`, Pages via GitHub Actions `.github/workflows/static.yml` (source "GitHub Actions", not classic branch deploy). Staging URL `https://detimzhao.github.io/detimzhao.dev/`. User provisions manually. No CNAME until custom domain promotion.
- [T07 — Lock URL hash parameter space](tickets/T07-lock-url-hash-param-space.md) — Params: `f` (formula), `s` (corpus, default/movies/extensible), `debug` (observatory auto-open). Unknown params ignored (forward-compatible). Bare hash accepted for backward compat; canonical output `#f=...`.
- [T09 — Lock corpus versioning scheme](tickets/T09-lock-release-versioning-scheme.md) — `corpus_version: "1.0"` + `vec_sha256` in model metadata. Regeneration overwrites `data/`, bumps version. Zero hardcoded refs in script.js. Git tag optional garnish.
- [T10 — Prototype "did you mean" UX](tickets/T10-prototype-did-you-mean-ux.md) — Hybrid A+B: ghost text (inline correction at cursor) + status line (4s discoverability flash). Tab accepts, Enter runs, Esc cancels. Prototype in `wayfinder/prototypes/T10-did-you-mean.html`.
- [T11 — Prototype observatory layout](tickets/T11-prototype-observatory-layout.md) — Binned heatmap (32 bins), vertical pipeline flow. 6 sections: formula bar, vector heatmaps, arithmetic, PCA-3 chip, top-10 neighbors, footer. Prototype in `wayfinder/prototypes/T11-observatory.html`.
- [T12 — Prototype info-card layout](tickets/T12-prototype-info-card-layout.md) — 260px card: name (accent) → description (120 chars) → top-5 neighbors (tabular scores) → source (muted). Left-edge cyan accent bar. 3 example cards. Prototype in `wayfinder/prototypes/T12-info-card.html`.
- [T13 — Curate corpus: drop arXiv paper-title entries](tickets/T13-curate-corpus-drop-arxiv.md) — 500 arXiv title entries (27% of corpus) dropped as gibberish; 1,294 kept as-is. PCA preserved (no refit), nn recomputed among kept set, `corpus_version` → `1.1`. Executed by `tools/curate_corpus.py`.
- [T14 — First deploy](tickets/T14-first-deploy-push-main-verify-staging.md) — Repo `DetimZhao/detimzhao.dev` public, `main` pushed @ `f539a11`. Pages deploys via GitHub Actions `.github/workflows/static.yml` (commit `6a9b1a2`) — overrides T04's classic "Deploy from a branch" plan. Staging URL `https://detimzhao.github.io/detimzhao.dev/` verified 22/22 (cloud renders, formula resolves, observatory opens, integrity hash matches, relative paths clean).
- [T15 — Promote staging to custom domain detimzhao.dev](tickets/T15-custom-domain-detimzhao-dev.md) — Live at `https://detimzhao.dev/`. Pages custom domain set (Actions-based, config not CNAME file). Cloudflare DNS: apex A → GitHub Pages IPs + `www` CNAME → `detimzhao.github.io`, all DNS-only (grey cloud; orange proxying was the blocker). GitHub verified + issued the cert, `https_enforced: true`. HTTP→HTTPS 301, apex serves 200 from GitHub, www→apex 301.
- [T16 — Lock down email anti-spoofing](tickets/T16-email-anti-spoof.md) — Both `.dev` and `.com` set to "no mail, no sending": SPF `v=spf1 -all` + DMARC `v=DMARC1; p=reject;`, no MX/DKIM/`rua`. Verified via dig; forgeries rejected.

## Next step

_None — Phase 1 is shipped to the apex `https://detimzhao.dev/` with HTTPS enforced and email anti-spoofing locked down on both domains. Remaining roadmap (Phase 2 self-corpus, v1.5 movies corpus) is deferred and tracked in `PLAN.md`, not as open wayfinder tickets._

## Not yet specified

_None — the shell absorbed the async `loadCorpus()` + render path (QA 21/21), so the former "Shell absorption" fog is resolved._

## Out of scope

- Phase 2 self-corpus mode (deferred per `PLAN.md:172–185`)
- v1.5 movies corpus design (deferred per `PLAN.md:187–196`)
- localStorage trail persistence (contradicts `PLAN.md:144–145` single-formula-in-hash design)
