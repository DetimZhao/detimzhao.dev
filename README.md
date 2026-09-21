# detimzhao — lab

A local browser lab. Everything runs client-side — nothing gets uploaded.

**→ [detimzhao.dev](https://detimzhao.dev)**

## Projects

| # | project | description |
|---|---------|-------------|
| 01 | [playground](https://detimzhao.dev/projects/playground/) | semantic arithmetic explorer — 3D point cloud of ~1.3k AI/ML concepts with vector arithmetic (`transformer - attention + diffusion`) |
| 02 | [tools](https://detimzhao.dev/projects/tools/) | self-contained browser tools — jpeg converter, password generator, and more |
| 03 | palette | *(coming soon)* — huemint-style constrained color palette generator |

## Stack

- vanilla HTML/CSS/JS — no build step, no framework
- Three.js (playground only, via CDN)
- GitHub Pages + Cloudflare proxy
- everything client-side — files never leave the browser

## Design

- two-voice type: Commit Mono (surfaces) + DM Sans (prose)
- huemint-style muted palette — dark bg, soft fg, one accent
- `r` reroll · `p` prev · `s` pin (landing palette controls)
- derived accent tokens: `--accent2` (categories), `--accent3` (starred)
- per-project favicons + apple-touch-icons

## License

© 2026 Detim Zhao
