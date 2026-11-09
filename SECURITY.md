# Security

## What this package does

`@chonwai/dsh-gsap-skills` is a Host-only DeepSeek Harness bundle. Its entire
runtime surface (`lib/index.js`) is:

- read the eight `skills/gsap-*/SKILL.md` files from its own package directory;
- parse their frontmatter;
- call `ctx.skills.register(...)` for each, and release those registrations from
  `ctx.effect` cleanup.

It has **no** runtime dependencies, no install scripts, no build step, no
network access, no subprocess spawning, no filesystem writes outside reading its
own files, no environment or credential access, and no telemetry. The
`tests/offline-check.sh` gate enforces the forbidden-API scan on `lib/index.js`.

The vendored skills are documentation. They contain code samples, but nothing
in the package executes them. The GSAP library itself is not included; projects
install it separately under GreenSock's license.

## Supply chain

- `checksums.txt` pins the sha256 of all nine vendored files (versioned header).
- `provenance.json` pins the upstream URL and full 40-hex commit; `NOTICE` must
  name the same commit or the offline gate fails.
- `tools/vendor-upstream.sh` is deterministic and idempotent, and
  `tools/apply-corrections.mjs` fails loudly if upstream text no longer matches,
  so re-vendoring cannot silently ship a different tree.
- CI runs the gates on Node 22 and 24 for every push.

## Reporting

Open a GitHub security advisory at
https://github.com/Chonwai/dsh-gsap-skills/security/advisories/new (preferred)
or a private report to the maintainer. Please include the version, the affected
file, and reproduction steps. Do not include secrets or personal data.

Scope: code and packaging in this repository. The GSAP library, its licensing,
and the content of upstream `greensock/gsap-skills` are out of scope (report
those to GreenSock). This package is not affiliated with or endorsed by
GreenSock.
