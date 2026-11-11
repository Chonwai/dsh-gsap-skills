# The `@chonwai/dsh-*` series: naming and verification conventions

This package is part of a small family of DeepSeek Harness (DSH) bundles that
vendor MIT-licensed agent skills as runtime skills. This file records the
conventions the series follows so each new bundle is predictable to review and
audit.

## Naming

| Layer | Convention | Example |
|---|---|---|
| npm package | `@chonwai/dsh-<subject>` | `@chonwai/dsh-gsap-skills` |
| bundle row id | short subject, no prefix | `gsap` |
| plugin export `name` | same as the row id | `gsap` |
| plugin-page title | “<Subject> for DeepSeek Harness” | “GSAP Skills for DeepSeek Harness” |
| repo | `Chonwai/dsh-<subject>` | `Chonwai/dsh-gsap-skills` |
| tagged release | `vMAJOR.MINOR.PATCH`, starting `v1.0.0` | `v1.0.0` |

Packages start `private: true`: they install from a checkout, and a public repo
does not imply an npm release. A package gets a `dsh.bundle.patch` row named
after the subject; the row must never be inserted twice (the patch file says
so).

## Verification conventions

Each bundle is expected to ship and pass:

1. `tests/offline-check.sh` — manifest, patch, locale, icon, inventory,
   checksums/provenance, forbidden-API scan, docs links; prints `RESULT: PASS`.
2. `tests/host-smoke.mjs` — mounts the host half against a fake Cordis context
   (registration contract, duplicate policy, cleanup, at least one
   mutation-style check that proves a gate can fail).
3. `tests/registry-smoke.mjs` — optional: mounts the real `@deepseek-ai/dsh-skill`
   registry from an extracted `app.asar`; prints `SKIP` when unavailable, and
   only a real `PASS` counts.
4. `checksums.txt` — sha256 of every vendored file, with a header version read
   from `package.json`.
5. `provenance.json` — upstream URL, full 40-hex commit, upstream version (or
   `n/a`), and the correction list. `NOTICE` must pin the same full commit; the
   offline gate fails on drift.
6. `tools/vendor-upstream.sh` — deterministic, idempotent re-vendoring that
   re-applies any documented corrections and fails when their expected original
   text disappears.

## Faithfulness and corrections

- Vendored files stay byte-identical unless a **factual correction** is
  documented with a quote, the corrected text, an upstream issue URL (or source
  evidence when no issue exists), and a date. Corrections are applied by a
  fail-loud script (`tools/apply-corrections.mjs`), never by hand-editing the
  vendored copy.
- Documentation gaps are recorded, not silently filled — see each bundle's
  `docs/KNOWN-UPSTREAM-ISSUES.md`.
- `NOTICE` keeps the upstream MIT text, the GreenSock-style trademark/no-
  affiliation note where relevant, and an explicit statement of modifications.

## Layer rule (DSH 0.2.2-rc.1 and later)

Skill resolution is **layer-first**: the standard Web preset mounts
`skill-filesystem` inside the agent preset's scope and disables the host
filesystem row, so a file-level copy under `~/.agents/skills`, `$DSH_HOME/skills`
or a project `.agents/skills` is in the nearer scoped layer and wins a
duplicate name over a host-row bundle. Every bundle in this series must
document that rule, ship the migration/preflight guidance, and never claim that
a profile install alone makes the bundle's skill active. Removing a file copy is
picked up live by the filesystem watcher; installing or toggling a bundle needs
a DSH restart because profile bundle rows compose at host boot.

## Siblings

- [`@chonwai/dsh-rein`](https://github.com/Chonwai/dsh-rein) — Ponytail skills
  plus a scoped always-on ruleset and a composer pill. Public, released.
- [`@chonwai/dsh-uupm`](https://github.com/Chonwai/dsh-uupm) — UI/UX Pro Max
  design-intelligence skill with its data and Python search scripts. Public and
  released (v1.0.5), same conventions and the same layer-first caveat.
- `@chonwai/dsh-gsap-skills` — this package: the eight official GSAP skills,
  four documented corrections.
