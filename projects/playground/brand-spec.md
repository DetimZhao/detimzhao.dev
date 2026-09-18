## Brand spec — Semantic Arithmetic Playground

Source: user brief (tixy.land, City Roads, terminal aesthetic references)
System: Dark monospace terminal — zero chrome, cyan accent, single interactive surface.

### Tokens

```css
:root {
  --bg:      oklch(0.08 0 0);       /* near-black canvas #0a0a0a */
  --surface: oklch(0.13 0.005);     /* input box fill */
  --fg:      oklch(0.92 0 0);       /* off-white monospace text */
  --muted:   oklch(0.40 0 0);       /* dimmed / ghost text */
  --border:  oklch(0.22 0 0);       /* input box border */
  --accent:  oklch(0.77 0.18 200);  /* cyan — terminal green-screen accent */
}
```

### Typography

- **Mono**: JetBrains Mono, IBM Plex Mono, Berkeley Mono, monospace
- Single typeface throughout — monospace only, no sans-serif anywhere
- Weight 400 for body/UI, weight 500 for emphasis
- Letter-spacing: 0 for body, 0.02em for UI labels/captions
- Line-height: 1.5 for input text

### Posture rules

1. Zero chrome — no toolbars, menus, headers, or footers
2. The formula input is the only visible UI chrome — everything else is canvas
3. One accent at a time — cyan for points, threads, and active indicators
4. Semi-transparent white borders on the input surface
5. No decorative gradients — the point cloud IS the texture
6. Secondary UI (help icon, info card) is subtle, discovered not presented
