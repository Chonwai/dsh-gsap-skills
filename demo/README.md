# Interactive demo

A single static page that shows what the bundle is for: a hero entrance
timeline, eight scroll-revealed skill cards, and a pinned, scroll-scrubbed
Timeline → ScrollTrigger → Plugins strip. It is built with the bundle's own
skill guidance (transforms only, `autoAlpha`, `gsap.matchMedia()` for reduced
motion, batched ScrollTrigger reveals, a pinned top-level timeline with
function-based `end` and `invalidateOnRefresh`).

It is **illustrative, not a benchmark**: there is no build step, no data, no
framework and no telemetry.

## Run it

From the repository root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/demo/>. Opening `demo/index.html` directly with
`file://` also works, but a local server is closer to the docs links and avoids
browser file restrictions.

## Requirements and behaviour

- **Network:** GSAP 3.15.1 and ScrollTrigger load from the pinned jsDelivr CDN
  (`https://cdn.jsdelivr.net/npm/gsap@3.15.1/dist/…`). If the CDN is blocked,
  `demo.js` removes the pre-hide class and the full content stays visible with
  no animation and no console errors.
- **No ScrollTrigger:** the hero entrance still runs; the cards and the strip
  stay in their static, readable layout.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, no animation or
  ScrollTrigger is created at all — content is visible immediately. The hero is
  only pre-hidden when motion is allowed, so nothing can be lost if animation
  never runs.
- **Cleanup:** the animations live in `gsap.matchMedia()` contexts; teardown
  reverts them, kills the pin, and refreshes ScrollTrigger after fonts settle.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure and content (semantic sections, inline SVG mark) |
| `demo.css` | Design tokens (`--color-*`, 4/8/12/16/24/32 spacing), layout, static fallbacks |
| `demo.js` | GSAP timelines, `ScrollTrigger.batch`, the pinned strip, reduced-motion/no-GSAP guards |
| `README.md` | This file |

The screenshot referenced from the top-level README is a placeholder path
(`assets/demo.png`); the image is added by the maintainer separately. No image is
committed by this demo.
