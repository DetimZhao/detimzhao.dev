# Semantic Arithmetic Playground

Semantic vector arithmetic explorer with a 3D point cloud interface. Dark terminal aesthetic, zero chrome.

## Stack
- Vanilla HTML/CSS/JS
- Three.js 0.160 via CDN importmap
- JetBrains Mono typeface via Google Fonts

## Project structure
```
index.html       — app shell
style.css        — all styles
script.js        — Three.js scene, formula engine, trails
brand-spec.md    — design tokens
data/            — corpus assets (generated offline)
tools/           — corpus generation scripts
```

## Run locally
```sh
python3 -m http.server 8080
```
Or:
```sh
npx serve .
```

## Commands
- `npm run serve` — start dev server

## Key interactions
- Type formula → Enter → renders trail, updates URL hash
- `/clear` in input → wipes all trails
- `×` button → wipes all trails (same as /clear)
- Click point → info card with neighbors + cosine scores
- `?` button → observatory modal (pipeline diagram)
- Drag canvas → orbit; scroll → zoom
- Auto-rotate resumes after 5s idle
- Esc → dismiss modals, blur input
- URL hash carries formula (e.g., `#f=king-man+woman`)

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
