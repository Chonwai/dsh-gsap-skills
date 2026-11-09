# Why there are no `.patch` files here

The four corrections are **exact-string replacements applied at vendor time** by
`tools/apply-corrections.mjs`, not stored diffs:

- each entry names the file, the exact upstream text, the replacement, and the
  upstream issue or source evidence;
- the script throws when an expected original string is missing, so an upstream
  fix is loud instead of producing a silently stale patch;
- `node tools/apply-corrections.mjs --check` verifies the already-vendored tree
  in the offline gate;
- the source of truth is `CORRECTIONS` in `tools/apply-corrections.mjs`; the
  human-readable rationale lives in `docs/KNOWN-UPSTREAM-ISSUES.md`. Keep both
  in sync when adding or removing a correction.

A unified diff would be easier to read but harder to keep honest across
re-vendoring: it applies with fuzz, can half-apply, and fails silently when the
context moves. The string-replacement form fails loudly, which matters more for
a package that ships third-party prose.

To add a correction: add one `CORRECTIONS` entry per replacement (with a unique
`id`, the `file`, the `issue`, the exact `find`, and the `replace`), add it to
`CORRECTIONS_SUMMARY` if it is a new logical correction, extend the marker checks
in `tests/offline-check.sh`, and update `docs/KNOWN-UPSTREAM-ISSUES.md` and
`NOTICE`.
