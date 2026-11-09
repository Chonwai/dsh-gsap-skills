# Known upstream issues and bundle corrections

Vendored from `greensock/gsap-skills` at commit
`aed9cfd3277740755f6bfc1155c7aa645403b760` (2026-04-21). This bundle applies
four factual corrections (10 exact-string replacements across four files) and
documents additional upstream gaps it does **not** patch.

All corrections are applied by `tools/apply-corrections.mjs`, which throws if an
expected original string is missing (so an upstream fix stops the vendor run
instead of silently shipping a stale or duplicated patch). Verified against
GSAP 3.15.1 source on 2026-11-09.

## 1. gsap-core: CSSPlugin transform-alias order

- **File:** `skills/gsap-core/SKILL.md`, "Transforms and CSS properties".
- **Upstream quote:** “they apply in a consistent order (translation → scale →
  rotationX/Y → skew → rotation)”
- **Correction:** “(translation → rotation → rotationY → rotationX → skew →
  scale)”
- **Evidence:** GSAP 3.15.1 `src/CSSPlugin.js`, `_renderCSSTransforms()` emits
  `translate3d` → `rotate` → `rotateY` → `rotateX` → `skew` → `scale`, in that
  order. The documented order puts scale before rotation and merges the two
  rotation axes, which changes the composed matrix when both are used.
- **Upstream issue:** none found in `greensock/gsap-skills` on 2026-11-09; this
  correction is source-verified rather than issue-tracked.

## 2. gsap-timeline: the position parameter's default

- **File:** `skills/gsap-timeline/SKILL.md`, "Position Parameter".
- **Upstream quotes:** “**Relative (default)**” and “`">"` — start when
  recently-added animation ends (default)”
- **Correction:** both “(default)” markers removed, and the opening paragraph now
  states: omitting the position parameter appends the tween at the **end of the
  timeline**; `">"` means “after the most recently added animation”, not “the
  default”.
- **Why it matters:** `">"` is a relative *start* position, not the absence of a
  position. An unpositioned tween starts at the timeline's current end; with a
  `repeat`, a moved playhead, or `recent()` semantics the two are not the same.
- **Upstream issue:** https://github.com/greensock/gsap-skills/issues/21 (open
  on 2026-11-09).

## 3. gsap-scrolltrigger: refreshPriority direction

- **File:** `skills/gsap-scrolltrigger/SKILL.md`, the options table and the
  Refresh/Cleanup guidance.
- **Upstream quotes:** “Lower = refreshed first … (first on page = lower
  number)” and “(first section on page = lower number)”.
- **Correction:** “Higher = refreshed first … (first section on page = higher
  number)”, with the same direction repeated in the refresh and “Do Not”
  guidance.
- **Evidence:** GSAP 3.15.1 `src/ScrollTrigger.js`, `sort()` uses
  `(a.vars.refreshPriority || 0) * -1e6 + …` in an ascending sort, so a larger
  priority sorts first. ScrollSmoother itself relies on `-9999` to sort last.
- **Upstream issue:** https://github.com/greensock/gsap-skills/issues/20 (open;
  also reported as https://github.com/greensock/gsap-skills/issues/15).

## 4. gsap-frameworks: duplicate `type Plugins`

- **File:** `skills/gsap-frameworks/SKILL.md`, the framework plugin-loading
  example.
- **Upstream quote:** the module declares `type Plugins` twice —
  `type Plugins = (typeof PLUGINS)[number];` and later
  `type Plugins = keyof PluginMap;`.
- **Correction:** the second declaration becomes
  `type PluginName = keyof PluginMap;`, and `PluginModule`,
  `PluginExport` and `lazyLoadPlugin` now constrain `K extends PluginName`.
- **Why it matters:** TypeScript rejects the duplicate identifier in one module;
  the snippet does not compile as written.
- **Upstream issue:** https://github.com/greensock/gsap-skills/issues/23 (open).

## Documented gaps (not patched)

### `easeReverse` is missing from the skills

GSAP 3.15 added `easeReverse` (the reverse/yoyo ease, replacing the internal use
of `yoyoEase`; see `src/gsap-core.js` in 3.15.1). None of the eight skills
mention it. This is a **documentation gap, not incorrect text**, so this bundle
does not add a patch: adding new prose would go beyond “faithful vendoring plus
factual corrections”. Tracked in upstream issue #21.

### Nuxt example: cleanup in `onMounted`

`examples/nuxt/app/pages/index.vue` (not vendored — this bundle ships only the
eight skills and `llms.txt`) registers a second `onMounted(() => { ctx &&
ctx.revert(); })` instead of `onUnmounted(...)`, so the cleanup runs on mount
rather than unmount. The `gsap-frameworks` skill text itself correctly says
`onUnmounted` / cleanup on destroy, so no skill patch applies. Tracked in
upstream issue #23.

### Ticker timing after a long frame (issue #22)

`gsap-performance` does not cover the ticker behaviour described in
https://github.com/greensock/gsap-skills/issues/22 (after a long frame the next
tick can arrive ~4 ms later, double-stepping frame-locked work). This is a
documentation gap; no factual correction is possible without adding new
guidance, which is out of scope for this bundle.

## Re-vendoring

```bash
bash tools/vendor-upstream.sh <git-ref> --repo /path/to/gsap-skills
```

The script copies the eight `SKILL.md` files and `llms.txt`, runs
`tools/apply-corrections.mjs`, and fails if any expected original string is
gone. If upstream fixes one of these issues, update `CORRECTIONS` in that script
(remove the obsolete entry) and refresh the quotes above; do not accumulate
dead corrections.
