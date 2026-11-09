#!/usr/bin/env bash
# Re-vendor the official GSAP skills into this bundle. Deterministic and idempotent.
#
#   bash tools/vendor-upstream.sh aed9cfd3277740755f6bfc1155c7aa645403b760 \
#     --repo /path/to/gsap-skills
#   bash tools/vendor-upstream.sh --from-dir /path/to/checkout --ref <40-hex-sha>
#
# Copies the eight skills/gsap-*/SKILL.md files plus skills/llms.txt (never
# examples/ or assets/), applies the four documented corrections
# (tools/apply-corrections.mjs, fail-loud), rewrites checksums.txt and
# provenance.json, then runs the tests.
set -euo pipefail

PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
REF=""
REF_SHA="${GSAP_REF:-${UPSTREAM_REF:-}}"
REPO="${GSAP_UPSTREAM:-}"
FROM_DIR=""
RUN_TESTS=1
SKILLS=(gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance)

while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO="${2:?--repo needs a path}"; shift 2 ;;
    --from-dir) FROM_DIR="${2:?--from-dir needs a path}"; shift 2 ;;
    --ref) REF_SHA="${2:?--ref needs a commit sha}"; shift 2 ;;
    --no-tests) RUN_TESTS=0; shift ;;
    -*) echo "unknown option: $1" >&2; exit 2 ;;
    *) REF="$1"; shift ;;
  esac
done

STAGE="$(mktemp -d "${TMPDIR:-/tmp}/dsh-gsap-vendor.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT

if [ -n "$FROM_DIR" ]; then
  echo "source: existing checkout $FROM_DIR"
  [ -d "$FROM_DIR/skills" ] || { echo "not an upstream checkout: $FROM_DIR" >&2; exit 2; }
  cp -R "$FROM_DIR/skills" "$STAGE/skills"
else
  [ -n "$REF" ] || { echo "usage: vendor-upstream.sh <git-ref> [--repo DIR]" >&2; exit 2; }
  [ -n "$REPO" ] || { echo "set GSAP_UPSTREAM or pass --repo" >&2; exit 2; }
  echo "source: $REPO at $REF"
  git -C "$REPO" archive --format=tar "$REF" skills | tar -xf - -C "$STAGE"
fi

if [ -z "$REF_SHA" ]; then
  if [ -n "$FROM_DIR" ]; then
    REF_SHA="$(git -C "$FROM_DIR" rev-parse HEAD 2>/dev/null || true)"
  else
    REF_SHA="$(git -C "$REPO" rev-parse "$REF^{commit}")"
  fi
fi
echo "$REF_SHA" | grep -Eq '^[0-9a-f]{40}$' || {
  echo "need a full 40-hex commit sha; pass --ref <sha>" >&2
  exit 2
}

rm -rf "$PKG/skills"
mkdir -p "$PKG/skills"
for name in "${SKILLS[@]}"; do
  [ -f "$STAGE/skills/$name/SKILL.md" ] || { echo "missing upstream skills/$name/SKILL.md" >&2; exit 2; }
  mkdir -p "$PKG/skills/$name"
  cp "$STAGE/skills/$name/SKILL.md" "$PKG/skills/$name/SKILL.md"
done
[ -f "$STAGE/skills/llms.txt" ] || { echo "missing upstream skills/llms.txt" >&2; exit 2; }
cp "$STAGE/skills/llms.txt" "$PKG/skills/llms.txt"

# Four documented corrections; throws when an expected upstream string is gone.
node "$PKG/tools/apply-corrections.mjs"

VERSION="$(node -e 'process.stdout.write(require(process.argv[1]).version)' "$PKG/package.json")"
REF_SHA="$REF_SHA" PROVENANCE_OUT="$PKG/provenance.json" node -e '
const { writeFileSync } = require("node:fs");
import("./tools/apply-corrections.mjs").then(({ CORRECTIONS_SUMMARY }) => {
  const record = {
    upstream: "https://github.com/greensock/gsap-skills",
    ref: process.env.REF_SHA,
    upstreamVersion: "n/a (no package.json or skill.json in the upstream repo)",
    corrections: CORRECTIONS_SUMMARY,
  };
  writeFileSync(process.env.PROVENANCE_OUT, JSON.stringify(record, null, 2) + "\n");
}).catch((error) => { console.error(error); process.exit(1); });
'

{
  echo "# sha256 pins for the vendored files of @chonwai/dsh-gsap-skills $VERSION"
  echo "# Upstream: GSAP skills, MIT (https://github.com/greensock/gsap-skills)"
  echo "# Pinned commit: provenance.json / NOTICE. Regenerate: bash tools/vendor-upstream.sh <git-ref> --repo <checkout>"
  cd "$PKG" || exit 1
  find skills -type f | LC_ALL=C sort | while read -r file; do
    if command -v shasum >/dev/null 2>&1; then shasum -a 256 "$file"; else sha256sum "$file"; fi
  done
} > "$PKG/checksums.txt"

if ! grep -qF "$REF_SHA" "$PKG/NOTICE"; then
  echo "WARN: NOTICE does not pin $REF_SHA yet; offline-check fails until its Source line is updated." >&2
fi

echo "files: $(find "$PKG/skills" -type f | wc -l | tr -d ' '), ref: $REF_SHA"
if [ "$RUN_TESTS" -eq 1 ]; then
  cd "$PKG" || exit 1
  bash tests/offline-check.sh
  node tests/host-smoke.mjs
  node tests/registry-smoke.mjs
fi
