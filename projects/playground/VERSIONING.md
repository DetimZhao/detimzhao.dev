# Versioning — Semantic Playground

Single source of truth: the `VERSION` constant at the top of `script.js`.
The statusbar label (`#ver`) renders that constant — never hand-edit the label.

## Scheme: `vMAJOR.MINOR[.PATCH]`

- **MAJOR** — a new UI generation / design language. Changing the chrome paradigm,
  layout, or type system bumps MAJOR and resets MINOR (and PATCH) to `0`.
  - `v8` = windowed ("mac window") UI
  - `v7.x` = prior redesign iteration
  - `v6` and earlier = dark terminal playground
- **MINOR** — a shipped feature or UX iteration within a generation. Each deploy
  that adds or changes user-facing behaviour bumps MINOR.
- **PATCH** (optional, e.g. `v8.1.2`) — bug-fix-only releases that change no behaviour.

## Rules

1. Bump the `VERSION` constant only — the statusbar renders it automatically.
2. Tag the deploy commit `v<MAJOR.MINOR>` (annotated) so a live build maps to a tag:
   `git tag -a v8.0 -m "windowed UI + real engine"`.
3. A MAJOR bump resets MINOR/PATCH to `0`.
4. One bump per shipped change set. Do not bump for uncommitted work-in-progress.
5. Version describes the *deployed playground*, independent of the lab-landing /
   other `projects/*` versions.

## History

- **v8.0.1** — bug-fixes only, light theme focus (dark untouched). (1) Latent space now
  STAYS centered when the left source panel is collapsed/expanded — the camera view-offset
  + `--xc` were computed once, mid-width-transition, and never recomputed after the panel's
  `.22s` width transition settled; now recalculated on `transitionend`/timeout (and once on
  load). (2) Connection lines/glows were hard-coded white + sky-blue with AdditiveBlending,
  which only adds light so vanished on the light canvas; now theme-aware (dark slate lines
  + Normal-blended glows on light). (3) **Light node labels were unreadably tiny (~5–8 px)
  and washed into the node glow** — enlarged 4× (bigger + higher-res texture, ~18 px glyphs),
  near-black for max contrast against both the paper and the glow; dark labels unchanged.
  Older trails still dim for hierarchy; latest trail labels read at full size/opacity.
- **v8.0** — windowed UI with the real corpus engine integrated (real point cloud,
  vector arithmetic + trails, real nearest-neighbour inspect, source-driven left panel,
  light/dark themes). Deployed under `projects/playground/`.
