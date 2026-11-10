# Prompt contracts for demo and GIF material

Six copy-paste prompts for a fresh DeepSeek Harness session. Each prompt asks for
one self-contained file that follows the bundle's GSAP skills, so the output can
be recorded as demo/GIF material instead of hand-animated.

Run every contract check **from the repository root** after the agent writes the
file (paths shown are examples):

```bash
node tests/prompt-contract.mjs generated/hero.js
```

`tests/prompt-contract.mjs` is a deterministic heuristic checker, not a JS
parser. It fails on: layout-property animation (`width`, `height`, `top`,
`left`, `right`, `bottom`, `margin*`) inside tween vars; animations without
`gsap.matchMedia()`/`prefers-reduced-motion`; `ScrollTrigger` without
`gsap.registerPlugin(ScrollTrigger)`; and animations without a cleanup path
(`ctx.revert`, `mm.revert`, `useGSAP`, or `.kill()`). It warns (exit 0) on
`opacity:` in tween vars without `autoAlpha`. It reads `.js`, `.mjs`, `.jsx`,
`.ts`, `.tsx` and inline `<script>` blocks in `.html`.

The prompts assume the vendored skills `gsap-core`, `gsap-timeline`,
`gsap-scrolltrigger`, `gsap-react`, `gsap-plugins` and `gsap-performance` are
available. Do not ask an agent to invent APIs; every pattern below is in the
skills.

## 1. Hero entrance timeline

- **Goal:** a page-load hero that reveals eyebrow, two headline lines, subtitle,
  buttons and stats without layout shifts.
- **Prompt:**
  > Write `generated/hero.js` for a dark developer-tool hero. Use one
  > `gsap.timeline({ defaults: { ease: "power3.out" } })`; animate
  > `[data-hero-eyebrow]`, two `[data-hero-line]` elements with `yPercent` and
  > stagger, `[data-hero-sub]`, `.hero-actions .btn` and `.hero-stats li`.
  > Use `autoAlpha` and transforms only, no `delay` chains. Wrap it in
  > `gsap.matchMedia()` so `(prefers-reduced-motion: reduce)` skips the animation
  > and leaves content visible. Return or register a cleanup that reverts the
  > context (`mm.revert()`), and guard `if (!window.gsap) return;`.
- **Required patterns:** `gsap.timeline`, `defaults`, `autoAlpha`, `yPercent`,
  `matchMedia`, cleanup (`mm.revert`), CDN guard.
- **Forbidden:** animating `opacity` (use `autoAlpha`), `width`/`height`/`top`/
  `left`, chained `delay`, hiding content in CSS when the animation can be
  skipped.
- **Contract:** `node tests/prompt-contract.mjs generated/hero.js`

## 2. Pinned scroll-scrubbed strip

- **Goal:** a horizontally moving three-step strip while its section is pinned.
- **Prompt:**
  > Write `generated/strip.js`. Register ScrollTrigger once
  > (`gsap.registerPlugin(ScrollTrigger)`), animate only the inner
  > `[data-strip-track]` with `x`, and attach a top-level
  > `gsap.timeline({ scrollTrigger: { trigger: "#strip", start: "top top",
  > end: () => "+=" + distance(), pin: true, scrub: 1,
  > invalidateOnRefresh: true } })`. Use `ease: "none"` for the scrub tween.
  > Add `ScrollTrigger.refresh()` after `document.fonts.ready`. Respect
  > `prefers-reduced-motion` by skipping the pin, and kill the timeline and its
  > ScrollTrigger in the matchMedia cleanup.
- **Required patterns:** `registerPlugin`, top-level timeline, `pin: true`,
  `scrub: 1`, function `end`, `invalidateOnRefresh`, `ease: "none"`, cleanup
  with `.kill()` and `mm.revert()`, reduced-motion branch.
- **Forbidden:** animating the pinned element itself, animating `left`/`top`,
  `scrub` together with `toggleActions`, nested ScrollTriggers, `markers: true`
  in production.
- **Contract:** `node tests/prompt-contract.mjs generated/strip.js`

## 3. Reduced-motion variant

- **Goal:** prove the same component is animation-free when the OS asks for it.
- **Prompt:**
  > Write `generated/reduced.js` that uses `gsap.matchMedia()` with two queries:
  > `(prefers-reduced-motion: reduce)` and
  > `(prefers-reduced-motion: no-preference)`. In the reduce branch set the
  > animated elements to their final visible state (`autoAlpha: 1`, `y: 0`)
  > with no tween, and do not create any ScrollTrigger. In the no-preference
  > branch run a short `gsap.from` entrance. Revert the matchMedia context in
  > both branches so toggling the OS setting is instant.
- **Required patterns:** `gsap.matchMedia`, both queries, final-state `gsap.set`
  in reduce, `mm.revert()` cleanup, no ScrollTrigger in reduce.
- **Forbidden:** CSS that hides content until JS runs, `duration: 0` fakes that
  still create triggers, branching only once at load and never reverting.
- **Contract:** `node tests/prompt-contract.mjs generated/reduced.js`

## 4. React `useGSAP` cleanup

- **Goal:** a React component whose animation and ScrollTrigger are cleaned up on
  unmount.
- **Prompt:**
  > Write `generated/Hero.jsx` (JSX is fine in a `.js` file too) using
  > `@gsap/react`'s `useGSAP(() => { ... }, { scope: containerRef })`. Animate
  > with `autoAlpha`/`y` only, create a `ScrollTrigger` inside the hook, and rely
  > on `useGSAP`'s automatic `gsap.context` cleanup on unmount. Add a
  > `gsap.matchMedia()` reduced-motion branch inside the hook. Do not call
  > `gsap.to` at module scope.
- **Required patterns:** `useGSAP(`, `scope:`, `ref` container, `matchMedia`,
  automatic context cleanup, transforms only.
- **Forbidden:** `useEffect` without a cleanup that calls `ctx.revert()`/`kill()`,
  animating refs before mount, global ScrollTriggers never killed.
- **Contract:** `node tests/prompt-contract.mjs generated/Hero.jsx`

## 5. Plugin registration and Flip

- **Goal:** a layout transition that uses the Flip plugin safely.
- **Prompt:**
  > Write `generated/flip.js` that registers plugins once
  > (`gsap.registerPlugin(Flip, ScrollTrigger)`), captures
  > `const state = Flip.getState(".card")`, changes a class/layout, then calls
  > `Flip.from(state, { duration: 0.5, ease: "power2.out", absolute: true })`.
  > Use `autoAlpha` for fades, keep the change transform-based, respect
  > `prefers-reduced-motion` by applying the final layout without the Flip tween,
  > and kill/revert the matchMedia context in cleanup.
- **Required patterns:** `registerPlugin(Flip`, `Flip.getState`, `Flip.from`,
  `matchMedia`, cleanup, `autoAlpha`.
- **Forbidden:** animating `width`/`height` to fake the layout change,
  registering plugins inside the animation callback on every call, leaving the
  Flip tween running after unmount.
- **Contract:** `node tests/prompt-contract.mjs generated/flip.js`

## 6. Performance-safe list stagger

- **Goal:** a list entrance that stays off the layout thread.
- **Prompt:**
  > Write `generated/list.js` that staggers list items with
  > `gsap.from(".item", { y: 24, autoAlpha: 0, duration: 0.4, stagger: 0.06,
  > ease: "power2.out" })` triggered by a ScrollTrigger batch
  > (`ScrollTrigger.batch(".item", { once: true, start: "top 88%", onEnter })`).
  > Register ScrollTrigger once; animate only `x`/`y`/`scale`/`autoAlpha`; keep
  > the batched tween short and use `overwrite: true`. Add a reduced-motion
  > branch that shows items immediately, and clean up the batch triggers and the
  > matchMedia context.
- **Required patterns:** `ScrollTrigger.batch`, `once: true`, `stagger`,
  `autoAlpha`, transforms only, `registerPlugin`, cleanup, reduced motion.
- **Forbidden:** animating `height`/`margin`/`top`, one tween per item with a
  long delay, layout reads inside `onUpdate`, leaving batch triggers alive.
- **Contract:** `node tests/prompt-contract.mjs generated/list.js`

## Recording tips

- Keep the generated file self-contained and small; record with a consistent
  viewport (the demo uses 1440x1000 desktop and 390x844 mobile).
- Verify the contract **before** recording; a FAIL is a real defect, a WARN is a
  style note (`opacity` → `autoAlpha`).
- The checker is static: it cannot prove visual quality. Run the demo smoke
  (`npm run smoke:demo`) or record and inspect the result for that.
