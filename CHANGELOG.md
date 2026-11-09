# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-11-10

### Added

- `docs/DISTRIBUTION.md`: friend-facing install guide covering the Plugins page
  with a pinned git tag, `plugin_manager`, the offline release tarball, the
  future npm channel, verification, the layer/migration caveat, update and
  uninstall, troubleshooting, and a copy-paste message. README (both languages)
  gained a quick start; INSTALL points at the guide.
- `tools/check-release.sh`, run by CI on `v*` tags: asserts tag == HEAD, version
  mirrors (package/lib/host test/offline gate/checksums header), checksum
  verification, a clean working tree, and that the npm tarball contains the
  runtime, docs, tests and metadata.
- Release tarball (`dsh-gsap-skills-1.0.1.tgz`) and its `.sha256` attached to
  the GitHub release. `tests/` is now included in the npm tarball so an
  extracted copy can run its own gates.

### Fixed (post-1.0.0 documentation and chore fixes)

- Corrected the patched-file count in `NOTICE`, `CHANGELOG.md` and
  `docs/KNOWN-UPSTREAM-ISSUES.md`: four files, not five.
- Clarified the package description and both locale descriptions as
  **unofficial** (no DeepSeek or GreenSock endorsement implied).
- Renamed the leftover `UUPM_REF` vendor-script variable to `UPSTREAM_REF`.
- Made `tools/vendor-upstream.sh` cwd-independent: absolute script/module
  paths, and the provenance import resolves via a file URL instead of `./`.

### Changed

- Version 1.0.1 (package, `lib/index.js`, test assertions, checksums header).
  `provenance.json` is unchanged; no vendored skill content changed.

## [1.0.0] - 2026-11-09

Initial release.

### Added

- `@chonwai/dsh-gsap-skills`: a Host-only DSH bundle that registers the eight
  official GSAP skills (`gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`,
  `gsap-plugins`, `gsap-utils`, `gsap-react`, `gsap-frameworks`,
  `gsap-performance`) as runtime skills, each with a per-skill directory
  `resourceBase`. Vendored from `greensock/gsap-skills` at
  `aed9cfd3277740755f6bfc1155c7aa645403b760` (2026-04-21), MIT, together with
  upstream `skills/llms.txt`; `examples/` and `assets/` are deliberately not
  vendored.
- Four documented factual corrections, applied at vendor time by the fail-loud
  `tools/apply-corrections.mjs` (10 exact-string replacements across four
  files):
  1. `gsap-core`: CSSPlugin transform-alias order corrected to
     translation → rotation → rotationY → rotationX → skew → scale.
  2. `gsap-timeline`: wrong "default" markers on the position parameter removed;
     omitting it appends at the end of the timeline and `">"` means after the
     most recently added animation.
  3. `gsap-scrolltrigger`: refreshPriority direction corrected (higher numbers
     refresh first; first section on the page = higher number).
  4. `gsap-frameworks`: duplicate `type Plugins` renamed to
     `type PluginName = keyof PluginMap`, with the dependent constraints
     updated.
  Sources and upstream issue links: `docs/KNOWN-UPSTREAM-ISSUES.md` (#20, #21,
  #23, plus GSAP 3.15.1 source evidence for the transform order).
- `tools/vendor-upstream.sh`: deterministic, idempotent re-vendoring from a git
  ref or `--from-dir`, re-applying corrections, rewriting `checksums.txt` and
  `provenance.json`, and running the gates. Stops when an expected upstream
  string is gone.
- Gates: `tests/offline-check.sh` (manifest, patch, locale, icon, inventory,
  corrections, checksums/provenance, forbidden APIs, docs links),
  `tests/host-smoke.mjs` (fake Cordis context, registration contract, duplicate
  policy, cleanup, mutation check), and optional `tests/registry-smoke.mjs`
  (real `@deepseek-ai/dsh-skill` registry; SKIP without an extracted app.asar).
- CI workflow for Node 22/24 (`.github/workflows/ci.yml`), running `npm test`
  and `npm run smoke`.
- Plugin-page metadata (`locale/en.json`, `locale/zh.json`, original
  `icon.svg`), MIT `LICENSE`, upstream `NOTICE` (including the explicit
  statement that the GSAP library is not included and not MIT),
  `provenance.json`, `SECURITY.md`, `docs/SERIES.md` and `patches/README.md`.

### Notes

- No GSAP library code is bundled; the bundle ships documentation skills only.
- A file-level `gsap-*` copy under `~/.agents/skills`, `$DSH_HOME/skills` or a
  project `.agents/skills` wins over this host-row bundle because the preset's
  filesystem provider is in the nearer scoped layer; README/INSTALL document the
  required migration. Profile bundle rows compose at host boot, so installing or
  toggling the bundle needs a DSH restart; removing a file copy is live.

### Documentation gaps (not patched)

- `easeReverse` (GSAP 3.15) is not covered by the skills.
- The upstream Nuxt example cleans up in `onMounted` instead of `onUnmounted`
  (issue #23); examples are not vendored.
- Ticker timing after a long frame (issue #22) is not covered.
