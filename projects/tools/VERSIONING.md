# Versioning — Lab Tools (`projects/tools/`)

Single source of truth: the `VERSION` constant in `jpeg-converter.html`
(the current shipped tool). The footer version label renders that constant —
never hand-edit the label.

## Scheme: `vMAJOR.MINOR[.PATCH]`

- **MAJOR** — a new generation / design language for the tools section.
  Changing the layout, chrome, or type system bumps MAJOR and resets MINOR
  (and PATCH) to `0`.
  - `v1` = tools index (card grid) + self-contained jpeg-converter
- **MINOR** — a shipped feature or UX iteration within a generation. Each
  deploy that adds or changes user-facing behaviour bumps MINOR.
- **PATCH** (optional, e.g. `v1.2.1`) — bug-fix-only releases.

## Rules

1. Bump the `VERSION` constant only — the footer label renders it automatically.
2. Tag the deploy commit `v<MAJOR.MINOR>` (annotated):
   `git tag -a v1.0 -m "tools: jpeg-converter + index"`.
3. A MAJOR bump resets MINOR/PATCH to `0`.
4. One bump per shipped change set. Do not bump for uncommitted work-in-progress.
5. Version describes the *deployed tools section*, independent of the landing /
   playground versions.

## History

- **v1.0** — tools index (card grid, palette-matched to the landing) +
  self-contained jpeg-converter (drag-drop / picker, Canvas API, resize
  presets + scale, JPEG/WebP, quality, size readout, download). Deployed under
  `projects/tools/`.
- **v1.0.1** — privacy line icon: unicode `⊕` → Material Symbols `lock`
  (palette-accent), loaded via Google Fonts `icon_names=lock` (matches the
  landing's `follow_the_signs` icon convention). QA harness tracks it.
- **v1.0.2** — UX policy: privacy promise is lab-level (already on the landing),
  so the converter's redundant privacy line is removed entirely (text + icon +
  the now-unused Material Symbols font link). Landing pin toast reads
  `✓ pinned theme` for clarity (footer hint stays `[ s ] pin`).
- **v1.1** — drop zone becomes the hero: fills the stage on first load
  (flex-grow, centered) so there's no dead negative space and the drop target
  is larger/more tappable (matches client-side tools like Google Squoosh). The
  prompt retires once a file loads (`main.has-file`), and the working panel
  takes the full stage. Bump: MINOR (UX/layout iteration).
- **v1.0** (password-generator) — second tool: crypto-random password generator.
  Length slider 8–128 (default 20), char-class toggles (uppercase/lowercase/
  digits/symbols, all on, last-class guard), entropy-based strength meter
  (weak/fair/strong), copy to clipboard + copy-on-click, regenerate. Deployed
  under `projects/tools/`. Card added to the tools index.
- **v1.3 typography (cross-tool)** — tools pages now follow the lab's locked
  **two-voice type**: prose (lead lines, card descriptions, field captions,
  drop-zone instructions) renders in **DM Sans**; all surfaces (titles,
  buttons, toggles, the password itself, numeric stats) stay in **Commit
  Mono / JetBrains Mono**. Pages previously loaded only JetBrains Mono, so
  prose was wrongly mono. Deployed as tools-log `v1.3`; per-tool labels bumped
  to `jpeg-converter v1.1.1` / `password-generator v1.0.1`.
- **v2.0 (password-generator)** — 1Password-style restructure: the password
  now sits alone in a bordered box; **Copy / Regenerate moved to an action bar
  outside the box**. Added a **type toggle (password / PIN)**: PIN mode
  generates a numeric code (digits only, 4–12 length, default 4), hides the
  char-class options, and sizes the length slider to the numeric range. Bump:
  MINOR (new PIN feature + layout).
- **v2.1 (password-generator)** — matched 1Password's **flow direction**:
  controls (password type → length → characters) now sit at the top, and the
  output region (strength meter + password box + copy/regenerate) fills below,
  so you configure first, then review and act on the result where your eye is.
  Bump: MINOR (layout/flow iteration).
- **v2.2 (password-generator)** — 1Password detail pass: **accent coloring** —
  digits *and* symbol chars render in the accent colour, letters stay neutral
  (matches 1Password's generator). **Strength meter hidden in PIN mode**
  (a numeric code has no meaningful strength readout). **Typeable length via
  `input[type=number]`, synced both ways with the slider**. **Copy icon
  (Material `content_copy`) fades into the box's top-right corner on hover**
  (desktop) / always visible on touch. **Centered** controls + action bar
  (kills the edge-hugging negative space). Rounded edges up. Bump: MINOR
  (UX + feature detail).
- **v3.0 (password-generator)** — full 1Password-faithful rework:
  - **Three distinct colours**: page `--accent` stays for UI; digits derive
    `--accent2`, symbols derive `--accent3` (hue-rotated at palette-apply —
    theme-proof, no hardcoded theme set).
  - **Real switch toggles** (pure CSS pill + knob) for all 4 char classes.
  - **password / PIN as a tab rail** with Material icons (`key`, `pin`).
  - **Copy + Regenerate** full-width stacked buttons (icons `content_copy`,
    `refresh`); copy label trimmed to "copy".
  - **Square password box** (border-radius 0) for contrast vs rounded controls.
  - **Length number input centered** (native spinners hidden) right of slider.
  - **Strength meter below** the password box.
  Bump: MAJOR (design-language rework).
- **v3.0.1 (password-generator)** — box-corner copy icon is **hover/focus-only**
  (removed the `@media (hover:none)` always-on override that made it persistent
  on some setups). At rest the box is clean. Bump: PATCH (bugfix).