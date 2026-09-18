# Semantic Arithmetic Playground

Semantic vector arithmetic explorer: a 3D point cloud of ~1.3k AI/ML concepts (sentence-embedding
corpus) with vector arithmetic (`transformer - attention + diffusion`), in a windowed ("mac window")
UI with light/dark themes.

## Stack
- Vanilla HTML/CSS/JS (no build step)
- Three.js 0.160 via CDN importmap
- Inter + Space Grotesk + JetBrains Mono via Google Fonts
- Corpus assets generated offline (see `tools/`)

## Project structure
```
index.html    — window chrome (titlebar, left panel, stage, inspect panel, statusbar)
style.css     — all styles (theme tokens, panels, observatory inspect)
script.js     — Three.js scene, corpus loader, formula engine, trails, inspect
VERSIONING.md — version scheme (single source: the VERSION const in script.js)
data/         — corpus assets (generated offline)
tools/        — corpus generation scripts
```

## Run locally
```sh
python3 -m http.server 8080
```
(serves the repo root — open `/projects/playground/`)

## Key interactions
- Type a formula → Enter → renders trail, updates URL hash (`#f=…`)
- Single token → highlights the node + its nearest neighbours
- `/clear` or "clear all" → wipes all trails
- Click a point → left-panel inspection (description, neighbours, source)
- `inspect` (titlebar) → right panel: formula, 384-dim heatmaps, PCA-3, top-10 neighbours
- Left panel filters points by corpus source; collapse via `«` or drag
- Drag canvas → orbit; scroll → zoom; Esc → close panels
- `theme` (titlebar) → light/dark; `settings` → sprite/bloom/performance
- URL hash carries the formula — deep-linkable

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
