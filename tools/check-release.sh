#!/usr/bin/env bash
# Release consistency check for @chonwai/dsh-gsap-skills.
#
# Verifies version mirrors, checksums and npm-tarball completeness everywhere;
# inside a git checkout it also verifies tag == HEAD and a clean working tree.
# From an extracted npm tarball those three git checks print SKIP and the script
# exits 0 when the portable checks pass. Intended for a tagged commit (CI runs
# it only for v* tag pushes); locally run it after creating the tag.
#
#   bash tools/check-release.sh
#
# Exit 0 = consistent; 1 = a release invariant failed.
set -euo pipefail

PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$PKG" || { echo "FAIL: cannot cd to package dir" >&2; exit 2; }

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
ok() { printf 'PASS  %s\n' "$*"; }

command -v node >/dev/null 2>&1 || fail "node is required"
command -v npm >/dev/null 2>&1 || fail "npm is required"

IN_GIT=false
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  IN_GIT=true
fi

VERSION="$(node -e 'process.stdout.write(require("./package.json").version)')"
TAG="v${VERSION}"

grep -qF "export const version = '${VERSION}'" lib/index.js ||
  fail "lib/index.js does not mirror package version ${VERSION}"
grep -qF "assert.equal(pluginVersion, '${VERSION}')" tests/host-smoke.mjs ||
  fail "tests/host-smoke.mjs does not assert version ${VERSION}"
grep -qF "package version is ${VERSION}" tests/offline-check.sh ||
  fail "tests/offline-check.sh does not assert version ${VERSION}"
head -1 checksums.txt | grep -qF "@chonwai/dsh-gsap-skills ${VERSION}" ||
  fail "checksums.txt header does not name version ${VERSION}"
ok "version ${VERSION} is consistent across package/lib/tests/checksums"

if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 -c checksums.txt >/dev/null 2>&1 || fail "checksums.txt does not verify (shasum -a 256 -c)"
else
  TMP="$(mktemp "${TMPDIR:-/tmp}/dsh-gsap-release.XXXXXX")"
  grep -v '^#' checksums.txt > "$TMP"
  sha256sum -c "$TMP" >/dev/null 2>&1 || { rm -f "$TMP"; fail "checksums.txt does not verify (sha256sum -c)"; }
  rm -f "$TMP"
fi
ok "checksums.txt verifies"

if [ "$IN_GIT" = true ]; then
  HEAD_COMMIT="$(git rev-parse HEAD)"
  EXACT_TAG="$(git describe --tags --exact-match 2>/dev/null || true)"
  [ "$EXACT_TAG" = "$TAG" ] ||
    fail "HEAD is not exactly tag ${TAG} (git describe --tags --exact-match: '${EXACT_TAG:-no exact tag}')"
  TAG_COMMIT="$(git rev-parse "refs/tags/${TAG}^{commit}" 2>/dev/null || true)"
  [ -n "$TAG_COMMIT" ] || fail "tag ${TAG} does not resolve to a commit"
  [ "$TAG_COMMIT" = "$HEAD_COMMIT" ] || fail "tag ${TAG} points at ${TAG_COMMIT}, not HEAD ${HEAD_COMMIT}"
  ok "HEAD ${HEAD_COMMIT} is exactly tag ${TAG}"

  DIRTY="$(git status --porcelain)"
  [ -z "$DIRTY" ] || fail "working tree is dirty (commit or stash first):$(printf '\n%s' "$DIRTY")"
  ok "working tree is clean"
else
  printf 'SKIP  tag/HEAD check: not inside a git checkout (extracted tarball?)\n'
  printf 'SKIP  clean-tree check: not inside a git checkout\n'
fi

PACK_JSON="$(npm pack --dry-run --json 2>/dev/null)" || fail "npm pack --dry-run failed"
PACK_JSON="$PACK_JSON" VERSION="$VERSION" node --input-type=module <<'JS' || exit 1
const data = JSON.parse(process.env.PACK_JSON);
if (!Array.isArray(data) || data.length !== 1) {
  console.error('FAIL: unexpected npm pack --dry-run output');
  process.exit(1);
}
const entry = data[0];
if (entry.name !== '@chonwai/dsh-gsap-skills' || entry.version !== process.env.VERSION) {
  console.error(`FAIL: npm pack reports ${entry.name}@${entry.version}, expected @chonwai/dsh-gsap-skills@${process.env.VERSION}`);
  process.exit(1);
}
const paths = new Set(entry.files.map((file) => file.path));
const required = [
  'lib/index.js',
  'cordis.patch.yml',
  'skills/gsap-core/SKILL.md',
  'skills/gsap-timeline/SKILL.md',
  'skills/gsap-scrolltrigger/SKILL.md',
  'skills/gsap-plugins/SKILL.md',
  'skills/gsap-utils/SKILL.md',
  'skills/gsap-react/SKILL.md',
  'skills/gsap-frameworks/SKILL.md',
  'skills/gsap-performance/SKILL.md',
  'skills/llms.txt',
  'docs/DISTRIBUTION.md',
  'docs/KNOWN-UPSTREAM-ISSUES.md',
  'docs/SERIES.md',
  'locale/en.json',
  'locale/zh.json',
  'icon.svg',
  'provenance.json',
  'checksums.txt',
  'tests/offline-check.sh',
  'tests/host-smoke.mjs',
  'tests/registry-smoke.mjs',
  'tools/apply-corrections.mjs',
  'tools/vendor-upstream.sh',
];
const missing = required.filter((path) => !paths.has(path));
if (missing.length > 0) {
  console.error(`FAIL: npm pack is missing: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`PASS  npm pack includes all ${required.length} required files (${paths.size} total)`);
JS
ok "npm tarball would contain the runtime, docs, tests and metadata"

echo "RESULT: PASS (release ${TAG} is consistent)"
