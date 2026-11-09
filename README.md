# GSAP Skills for DeepSeek Harness

**`@chonwai/dsh-gsap-skills`** packages the eight official [GSAP skills](https://github.com/greensock/gsap-skills)
as a DeepSeek Harness (DSH) bundle, with **four documented factual corrections**.
Each `SKILL.md` is registered as a runtime skill, so a session can load
`gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`,
`gsap-utils`, `gsap-react`, `gsap-frameworks` and `gsap-performance` on demand.

An independent community integration: not affiliated with, sponsored by or
endorsed by GreenSock or the GSAP project. “GSAP” and “GreenSock” are trademarks
of GreenSock, Inc. The skill documentation is MIT-licensed; **the GSAP library
itself is not included and is not MIT** — you install GSAP in your project under
GreenSock's own terms.

**Scope rule (read this first):** this bundle registers in the host/global skill
layer. The Web app mounts `skill-filesystem` inside the agent preset's scope and
disables the host-level filesystem row, so a file-level copy of any of these
skills under `~/.agents/skills`, `$DSH_HOME/skills`, or a project
`.agents/skills` lives in the nearer preset layer and wins the name outright —
**the bundle cannot override it**. Move the file copies out of the skills root
to activate the bundle; see *Migrating from a file-level install* below. A
profile install does not mean the row is the winning catalog entry while such a
copy exists.

## Quick start

Install from **Plugins → Add plugin → Install a third-party plugin** with
`https://github.com/Chonwai/dsh-gsap-skills#v1.0.2`, accept **Enable now**, then
**restart DSH** and open a session; load `/gsap-core`. Other channels (release
tarball, agent/`plugin_manager`, future npm), verification, layer migration and
troubleshooting: [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md).

## What it provides

| Skill | Use it for |
|---|---|
| `gsap-core` | `gsap.to/from/fromTo`, easing, duration, stagger, defaults, `matchMedia` |
| `gsap-timeline` | sequencing, the position parameter, nesting, playback |
| `gsap-scrolltrigger` | scroll-linked animation, pinning, scrub, triggers |
| `gsap-plugins` | registration, Flip, Draggable, ScrollSmoother, SplitText, SVG, eases |
| `gsap-utils` | `clamp`, `mapRange`, `normalize`, `interpolate`, `random`, `snap`, `wrap`, `pipe` |
| `gsap-react` | `useGSAP`, refs, `gsap.context()`, cleanup |
| `gsap-frameworks` | Vue, Nuxt, Svelte, SvelteKit lifecycle and cleanup |
| `gsap-performance` | transforms, layout thrashing, `will-change`, batching |

Plus `skills/llms.txt` (upstream's skill index). The host half registers all
eight with `resourceBase` pointing at each skill's own directory. There is no
client half, no settings/Config schema, no prompt section, no telemetry, no
runtime dependency and no network/process/write access — the module only reads
its own files.

## What is corrected

Applied at vendor time by `tools/apply-corrections.mjs`; every replacement is
quoted with its upstream issue or source evidence in
[docs/KNOWN-UPSTREAM-ISSUES.md](docs/KNOWN-UPSTREAM-ISSUES.md):

1. **`gsap-core` transform order** — the documented alias order
   `translation → scale → rotationX/Y → skew → rotation` is wrong; GSAP 3.15.1
   CSSPlugin composes `translation → rotation → rotationY → rotationX → skew →
   scale`.
2. **`gsap-timeline` position parameter** — removed the wrong “(default)”
   markers; omitting the parameter appends at the end of the timeline, while
   `">"` means “after the most recently added animation”.
3. **`gsap-scrolltrigger` refreshPriority** — direction was backwards; **higher
   numbers refresh first**, so the first section on the page gets a higher
   number.
4. **`gsap-frameworks` duplicate `type Plugins`** — the second declaration is
   renamed `type PluginName = keyof PluginMap`, with `PluginModule`,
   `PluginExport` and `lazyLoadPlugin` updated.

Documented but not patched: `easeReverse` (GSAP 3.15) is missing from the skills,
and the Nuxt example's cleanup runs in `onMounted` (issue #23) — the example is
not vendored. Both are recorded in the known-issues file. The fail-loud vendor
script stops if upstream fixes any expected string, so a correction cannot
silently rot.

## Requirements

- DeepSeek Harness **0.2.2-rc.1** (`engines.dsh: ">=0.2.2-rc.1 <0.3.0"`).
- Node.js **>= 22** (inherited from the Harness).
- A managed DSH profile (the Desktop app's `desktop` profile, or a CLI-managed
  profile).
- **GSAP itself is not included.** The skills only document how to use it; each
  user's project installs `gsap` (and any plugins) from npm under GreenSock's
  license.

## Install

All three routes are in [INSTALL.md](INSTALL.md):

1. **Plugins page** (recommended): Plugins → Add plugin → install a
   third-party plugin → paste this directory's absolute path.
2. **`plugin_manager` tool**:
   `plugin_manager(action: "install_bundle", target: "/abs/path/to/dsh-gsap-skills")`.
3. **Manual copy** (advanced, only when Plugin Manager is unavailable): copy
   the checkout into the profile's `node_modules` and add it to the profile's
   dependency/bundle list by hand; INSTALL.md has the exact steps and the
   rollback.

**Restart DSH after installing or toggling.** Profile bundle rows are composed
when the DSH host boots; a new session or a page reload does not re-compose
them, and `plugin_manager` showing installed/enabled is profile state, not proof
that the running host mounted the row.

## Usage

In a session, load a skill with the `skill` tool or its `/` gesture:

- `/gsap-core` — “how do I animate this element with GSAP?”
- `/gsap-timeline` — “sequence these steps, and what does `"<"` do?”
- `/gsap-scrolltrigger` — “pin this section and scrub the animation”
- `/gsap-plugins` — “register SplitText and lazy-load Draggable”
- `/gsap-react` — “clean up this animation in React”
- `/gsap-frameworks` — “Vue/Nuxt/Svelte lifecycle cleanup”
- `/gsap-performance` — “this list animation janks; why?”
- `/gsap-utils` — “clamp and snap values with gsap.utils”

Natural language works too: “use the GSAP timeline skill and review this
sequence”. The skill body is the upstream documentation; it does not install
packages or execute animation code.

## Migrating from a file-level install (required for the bundle to take effect)

Three facts from the DSH source decide which copy wins:

1. `@deepseek-ai/dsh-web-app/presets/standard.patch.yml` mounts
   `skill-filesystem` **inside the agent preset's scope**.
2. `@deepseek-ai/dsh-web-app/cordis.patch.yml` **disables the host-level
   `skill-filesystem` row** ("presets own local discovery").
3. `@deepseek-ai/dsh-skill` merges the global layer with the viewing scope's
   chain: **the nearest layer's entry wins a duplicate name outright**, and rank
   only orders duplicates inside one layer.

This bundle is a host row, so it registers in the **global** layer. Any
file-level copy of these skills under `~/.agents/skills`, `$DSH_HOME/skills`, or
a project `.agents/skills` is discovered by the preset's provider and lives in
the **nearer scoped layer**, which wins unconditionally; the bundle cannot
override it. Preflight:

```bash
for d in ~/.agents/skills "${DSH_HOME:-$HOME/.dsh}/skills"; do
  for s in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance; do
    test -d "$d/$s" && echo "WARNING: file-level copy will shadow the bundle: $d/$s"
  done
done
```

Move the copies out (this package never does it for you):

```bash
mkdir -p ~/.dsh-backup
for s in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance; do
  test -d ~/.agents/skills/$s && mv ~/.agents/skills/$s ~/.dsh-backup/$s-$(date +%F)
  test -d "${DSH_HOME:-$HOME/.dsh}/skills/$s" && mv "${DSH_HOME:-$HOME/.dsh}/skills/$s" ~/.dsh-backup/$s-dsh-$(date +%F)
done
```

Project-local `<repo>/.agents/skills/gsap-*` copies must be moved too. The
filesystem watcher picks the removal up at the next pre-step (no restart needed
for the removal); installing or toggling the bundle itself needs a DSH restart.

## Verified vs unverified

Every claim below is executable from the package directory. **Verified** on
macOS 27.2 (arm64), Node 22.21.1, on 2026-11-09:

| Check | Command | Result |
|---|---|---|
| Offline gate | `bash tests/offline-check.sh` | `RESULT: PASS (90 checks)` |
| Host smoke | `node tests/host-smoke.mjs` | `11/11 passed` |
| Registry smoke (optional) | `node tests/registry-smoke.mjs` with `DSH_ASAR_MODULES` pointing at an extracted `app.asar`’s `@deepseek-ai` | `3/3 passed` |
| Corrections | `node tools/apply-corrections.mjs --check` | `corrections: 10/10 verified` |
| JS syntax | `node --check lib/index.js` | exit 0 |
| Vendor idempotency | re-run `tools/vendor-upstream.sh --from-dir /tmp/gsap-skills --ref aed9cfd3… --no-tests` | byte-identical `skills/`, `checksums.txt`, `provenance.json` |

The optional registry test prints `SKIP` and exits 0 when no extracted DSH
package tree is present; **SKIP is not verification, only a real `PASS` counts.**

**Unverified:**

- **Live activation on other machines.** The maintainer's machine has the
  bundle installed and live: `skill("gsap-core")` loads from the installed
  package on v1.0.1/1.0.2 (after the required DSH restart). Verify the same on
  yours — the loaded `Base directory` must point into the package, not
  `~/.agents`.
- **Plugins page rendering** of the localized title/description and the icon.
- **GSAP runtime behaviour.** The corrections were verified against GSAP 3.15.1
  source (and the upstream issues), not by running each animation in a browser;
  no GSAP library is bundled.
- **Upstream fixes.** Issues #20/#21/#23 were open on 2026-11-09; the vendored
  corrections are this bundle's, not upstream's.
- **Non-macOS hosts** and DSH versions other than 0.2.2-rc.1.
- **No npm release:** installed from a checkout only (`private: true`).

## Known upstream issues

Full quotes, source evidence and issue links:
[docs/KNOWN-UPSTREAM-ISSUES.md](docs/KNOWN-UPSTREAM-ISSUES.md).
Series conventions: [docs/SERIES.md](docs/SERIES.md).

## Development

```bash
npm test                  # offline gate; prints RESULT: PASS
npm run check             # node --check lib/, tests/, tools/
npm run smoke             # host + optional registry smoke
npm run corrections-check # verify the four corrections in the vendored tree
```

Re-vendoring (deterministic, idempotent):

```bash
bash tools/vendor-upstream.sh aed9cfd3277740755f6bfc1155c7aa645403b760 \
  --repo /path/to/gsap-skills
# or from an existing checkout:
bash tools/vendor-upstream.sh --from-dir /path/to/gsap-skills \
  --ref aed9cfd3277740755f6bfc1155c7aa645403b760
```

It copies the eight `SKILL.md` files and `llms.txt`, applies the corrections
(failing if an expected original string is gone), rewrites `checksums.txt` and
`provenance.json`, and runs the gates. Update the `Source:` line in
[NOTICE](NOTICE) if the commit changes: the offline gate fails when `NOTICE` and
`provenance.json.ref` disagree. There is no build step.

## Repository layout

```
lib/index.js                 host half: read, parse, register, dispose
cordis.patch.yml             one insert row: id gsap -> @chonwai/dsh-gsap-skills
skills/gsap-*/SKILL.md       the eight vendored skills (four corrections applied)
skills/llms.txt              upstream skill index
locale/{en,zh}.json          plugin-page title/description/detail
icon.svg                     original motion/timeline glyph
checksums.txt                sha256 pins for the nine vendored files
provenance.json              upstream URL, full commit, four corrections
tools/vendor-upstream.sh     re-vendor + correct + checksums + provenance + tests
tools/apply-corrections.mjs  the fail-loud four-correction script
docs/KNOWN-UPSTREAM-ISSUES.md  quotes, corrections, issue links, documented gaps
docs/SERIES.md               series naming and verification conventions
patches/README.md            why corrections are code, not diff files
tests/offline-check.sh       static acceptance gate
tests/host-smoke.mjs         fake-Cordis mount test
tests/registry-smoke.mjs     optional real dsh-skill registry test
```

## License and attribution

MIT — see [LICENSE](LICENSE). The eight skill files and `llms.txt` are vendored
from [greensock/gsap-skills](https://github.com/greensock/gsap-skills) at
`aed9cfd3…` (MIT, Copyright (c) 2026 GreenSock), with the four corrections
described above. [NOTICE](NOTICE) carries the upstream MIT text, the
trademark/no-affiliation note, the modification statement and the explicit
statement that the GSAP library is not included and is not MIT. The icon is
original artwork for this bundle.
