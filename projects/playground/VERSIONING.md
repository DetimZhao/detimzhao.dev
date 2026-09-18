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

- **v8.0** — windowed UI with the real corpus engine integrated (real point cloud,
  vector arithmetic + trails, real nearest-neighbour inspect, source-driven left panel,
  light/dark themes). Deployed under `projects/playground/`.
