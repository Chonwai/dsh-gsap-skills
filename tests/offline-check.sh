#!/usr/bin/env bash
# Static, offline checks for @chonwai/dsh-gsap-skills.
#
# Verifies the package without touching a DSH profile, the Loader, pnpm, the
# network or $HOME: manifest/YAML/JSON structure, the eight vendored skills and
# their four corrections, checksums/provenance, JavaScript syntax, the
# forbidden-API scan, documentation links and the smoke tests. Uses only node
# and coreutils so it runs on macOS and Linux CI alike.
#
#   bash tests/offline-check.sh
#
# Exit 0 = all checks pass; 1 = any failure; 2 = environment problem.
set -u

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
PASS=0
FAIL=0
FAILED_LIST=""

ok() { PASS=$((PASS + 1)); printf 'PASS  %s\n' "$*"; }
bad() {
  FAIL=$((FAIL + 1))
  FAILED_LIST="$FAILED_LIST
  - $*"
  printf 'FAIL  %s\n' "$*"
}
hr() { printf '%s\n' "------------------------------------------------------------"; }

sha256_check() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c "$1" >/dev/null 2>&1
  else
    local filtered status
    filtered=$(mktemp "${TMPDIR:-/tmp}/dsh-gsap-checksums.XXXXXX")
    grep -v '^#' "$1" > "$filtered"
    sha256sum -c "$filtered" >/dev/null 2>&1
    status=$?
    rm -f "$filtered"
    return $status
  fi
}

cd "$PACKAGE_DIR" || { echo "cannot cd to package dir"; exit 2; }
hr
printf 'offline check: @chonwai/dsh-gsap-skills\n'
printf 'package: %s\n' "$PACKAGE_DIR"
hr

manifest() {
  node -e '
    const fs = require("node:fs");
    const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    let value = pkg;
    for (const key of process.argv[2].split(".")) value = value === undefined || value === null ? undefined : value[key];
    process.stdout.write(value === undefined ? "no" : "yes");
  ' "$PACKAGE_DIR/package.json" "$1"
}
manifest_value() {
  node -e '
    const fs = require("node:fs");
    const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    let value = pkg;
    for (const key of process.argv[2].split(".")) value = value === undefined || value === null ? undefined : value[key];
    process.stdout.write(value === undefined ? "" : String(value));
  ' "$PACKAGE_DIR/package.json" "$1"
}

# 1. Manifest JSON and identity.
if node -e 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))' "$PACKAGE_DIR/package.json" 2>/dev/null; then
  ok "package.json parses as JSON"
else
  bad "package.json does not parse"
fi
for field in name version description license author type main exports icon files dsh.bundle.patch engines.node engines.dsh; do
  if [ "$(manifest "$field")" = "yes" ]; then ok "package.json has $field"; else bad "package.json is missing $field"; fi
done
[ "$(manifest_value name)" = "@chonwai/dsh-gsap-skills" ] && ok "package name is @chonwai/dsh-gsap-skills" || bad "package name is wrong"
[ "$(manifest_value version)" = "1.0.2" ] && ok "package version is 1.0.2" || bad "package version is not 1.0.2"
lib_version=$(grep -oE "export const version = '[^']+'" lib/index.js | sed -E "s/.*'([^']+)'/\1/")
[ "$lib_version" = "$(manifest_value version)" ] && ok "lib/index.js version matches package.json" || bad "lib/index.js version (${lib_version:-missing}) does not match package.json"
[ "$(manifest_value license)" = "MIT" ] && ok "package license is MIT" || bad "package license is not MIT"
[ "$(manifest_value author)" = "Chonwai" ] && ok "package author is Chonwai" || bad "package author is not Chonwai"
[ "$(manifest_value private)" = "true" ] && ok "package is private (no accidental npm publish)" || bad "package must stay private"
[ "$(manifest_value type)" = "module" ] && ok "package type is module" || bad "package type must be module"
if node -e 'const p=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));process.exit(Object.keys(p.dependencies||{}).length===0?0:1)' "$PACKAGE_DIR/package.json"; then
  ok "package has no runtime dependencies"
else
  bad "package must not declare runtime dependencies"
fi
if node -e 'const p=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));process.exit(p.scripts&&p.scripts.build?1:0)' "$PACKAGE_DIR/package.json"; then
  ok "package has no build step"
else
  bad "package must not add a build step"
fi
if node -e 'const p=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));const need=[".","./cordis.patch.yml","./locale/*.json","./icon","./package.json"];process.exit(need.every(k=>k in p.exports)?0:1)' "$PACKAGE_DIR/package.json"; then
  ok "package exports the required entry points"
else
  bad "package exports are incomplete"
fi
if node -e 'const p=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));process.exit(p.dsh&&p.dsh.client?1:0)' "$PACKAGE_DIR/package.json"; then
  ok "no client half is declared (out of scope for v1)"
else
  bad "v1 must not declare a dsh.client half"
fi
if node -e 'const p=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));const need=["lib/**/*.js","skills","docs","cordis.patch.yml","locale/*.json","icon.svg","INSTALL.md","LICENSE","NOTICE","checksums.txt","provenance.json"];process.exit(need.every(k=>p.files.includes(k))?0:1)' "$PACKAGE_DIR/package.json"; then
  ok "files whitelist keeps the runtime and docs files"
else
  bad "files whitelist is missing a runtime or docs file"
fi
[ "$(manifest_value engines.node)" = ">=22" ] && ok "engines.node is >=22" || bad "engines.node must be >=22"
[ "$(manifest_value engines.dsh)" = ">=0.2.2-rc.1 <0.3.0" ] && ok "engines.dsh is >=0.2.2-rc.1 <0.3.0" || bad "engines.dsh is wrong"
for entry in "$(manifest_value main)" "$(manifest_value icon)" "$(manifest_value dsh.bundle.patch)"; do
  if [ -f "$entry" ]; then ok "declared file exists: $entry"; else bad "declared file is missing: $entry"; fi
done

# 2. Bundle patch.
if grep -qF -- '- insert:' cordis.patch.yml && grep -qF 'id: gsap' cordis.patch.yml &&
  grep -qF "name: '@chonwai/dsh-gsap-skills'" cordis.patch.yml && grep -qF 'config: {}' cordis.patch.yml &&
  [ "$(grep -c 'id: gsap' cordis.patch.yml)" -eq 1 ]; then
  ok "cordis.patch.yml is one gsap insert row with an empty config"
else
  bad "cordis.patch.yml is invalid (must be one insert row for @chonwai/dsh-gsap-skills)"
fi
if grep -qF 'Do NOT insert this row a second time' cordis.patch.yml; then
  ok "cordis.patch.yml documents the double-insert hazard"
else
  bad "cordis.patch.yml must explain why the row must not be inserted twice"
fi

# 3. Locales and icon.
for language in en zh; do
  if node -e '
    const fs = require("node:fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const meta = data.meta || {};
    if (typeof meta.title !== "string" || meta.title.trim() === "") throw new Error("meta.title required");
    if (typeof meta.description !== "string" || meta.description.trim() === "") throw new Error("meta.description required");
    if (typeof meta.detail !== "string" || !fs.existsSync(meta.detail)) throw new Error("meta.detail must name an existing file");
  ' "locale/$language.json"; then
    ok "locale/$language.json is valid (title, description, detail exists)"
  else
    bad "locale/$language.json is invalid"
  fi
done
if grep -qF '<svg' icon.svg && grep -qF 'viewBox' icon.svg && [ "$(wc -c < icon.svg | tr -d ' ')" -le 262144 ]; then
  ok "icon.svg is an SVG within the 256 KiB limit"
else
  bad "icon.svg is missing, malformed or too large"
fi

# 4. The eight vendored skills and llms.txt.
skill_dirs=$(find skills -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
[ "$skill_dirs" -eq 8 ] && ok "exactly eight skill directories" || bad "expected 8 skill directories, found $skill_dirs"
for name in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance; do
  [ -f "skills/$name/SKILL.md" ] && ok "skill present: $name" || bad "missing skill: $name"
done
[ -f skills/llms.txt ] && ok "skills/llms.txt is vendored" || bad "skills/llms.txt is missing"
[ ! -d skills/examples ] && [ ! -d skills/assets ] && ok "upstream examples/ and assets/ are not vendored" || bad "examples/ or assets/ leaked into skills/"
top_level_files=$(find skills -mindepth 1 -maxdepth 1 -type f | wc -l | tr -d ' ')
[ "$top_level_files" -eq 1 ] && ok "skills/ has no files other than llms.txt" || bad "unexpected file at the top of skills/"

if node --input-type=module <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { loadSkillDefinition, parseSkillMarkdown, SKILL_NAMES, SKILLS_DIR } from './lib/index.js';
for (const name of SKILL_NAMES) {
  const definition = loadSkillDefinition(name);
  if (definition.name !== name) throw new Error(`${name}: frontmatter name mismatch`);
  if (definition.description.length < 40) throw new Error(`${name}: description too short`);
  if (definition.content.length < 500) throw new Error(`${name}: body too short`);
  if (definition.content.includes('{{')) throw new Error(`${name}: unresolved template token`);
  if (!existsSync(`${SKILLS_DIR}/${name}/SKILL.md`)) throw new Error(`${name}: SKILL.md missing`);
}
const llms = readFileSync(`${SKILLS_DIR}/llms.txt`, 'utf8').trim();
if (llms.length < 100) throw new Error('llms.txt is suspiciously short');
const parsed = parseSkillMarkdown('---\nname: demo\ndescription: >\n  folded\nlicense: MIT\n---\nbody');
if (parsed.data.name !== 'demo' || parsed.data.description !== 'folded' || parsed.body !== 'body') {
  throw new Error('frontmatter parser regressed');
}
JS
then
  ok "all eight SKILL.md files parse with matching names and bodies"
else
  bad "a vendored SKILL.md fails the frontmatter/body contract"
fi

# 5. The four documented corrections.
if node tools/apply-corrections.mjs --check; then
  ok "the four corrections verify (10 exact-string replacements)"
else
  bad "a correction is missing or the wrong text is still present"
fi
corrections_ok=1
while IFS= read -r wrong; do
  if grep -qF "$wrong" skills/gsap-core/SKILL.md skills/gsap-timeline/SKILL.md skills/gsap-scrolltrigger/SKILL.md skills/gsap-frameworks/SKILL.md; then
    corrections_ok=0
    bad "uncorrected upstream text still present: $wrong"
  fi
done <<'WRONG'
scale → rotationX/Y → skew → rotation
Relative (default)
ends (default)
Lower = refreshed first
first section on page = lower number
type Plugins = keyof PluginMap;
<K extends Plugins>
WRONG
[ "$corrections_ok" -eq 1 ] && ok "no original wrong strings remain"
for marker in 'translation → rotation → rotationY → rotationX → skew → scale' 'appended at the end of the timeline' 'Higher = refreshed first' 'type PluginName = keyof PluginMap' 'K extends PluginName'; do
  if grep -qF "$marker" skills/gsap-*/SKILL.md; then :; else bad "corrected marker missing: $marker"; corrections_ok=0; fi
done
[ "$corrections_ok" -eq 1 ] && ok "all corrected markers are present"

# 6. Checksums, provenance and NOTICE.
if [ "$(find skills -type f | wc -l | tr -d ' ')" -eq "$(grep -vc '^#' checksums.txt)" ]; then
  ok "checksums.txt pins every vendored file"
else
  bad "checksums.txt does not cover every vendored file (regenerate with tools/vendor-upstream.sh)"
fi
[ "$(grep -vc '^#' checksums.txt)" -eq 9 ] && ok "exactly nine vendored files are pinned" || bad "expected 9 pinned files"
if sha256_check checksums.txt; then
  ok "checksums.txt verifies ($(grep -vc '^#' checksums.txt) files)"
else
  bad "checksums.txt does not verify; regenerate it with tools/vendor-upstream.sh"
fi
manifest_version=$(manifest_value version)
if head -1 checksums.txt | grep -qF "@chonwai/dsh-gsap-skills $manifest_version"; then
  ok "checksums.txt header version matches package.json ($manifest_version)"
else
  bad "checksums.txt header version does not match package.json; regenerate it"
fi
if node -e '
  const fs = require("node:fs");
  const p = JSON.parse(fs.readFileSync("provenance.json", "utf8"));
  if (typeof p.upstream !== "string" || !/^https:\/\//.test(p.upstream)) throw new Error("upstream");
  if (typeof p.ref !== "string" || !/^[0-9a-f]{40}$/.test(p.ref)) throw new Error("ref must be a 40-hex commit");
  if (!Array.isArray(p.corrections) || p.corrections.length !== 4) throw new Error("corrections must list four items");
' 2>/dev/null; then
  ok "provenance.json pins the full commit and four corrections"
else
  bad "provenance.json is missing or malformed; regenerate with tools/vendor-upstream.sh"
fi
prov_ref=$(node -e 'process.stdout.write(require("./provenance.json").ref)' 2>/dev/null || true)
if [ -n "$prov_ref" ] && grep -qF "$prov_ref" NOTICE; then
  ok "NOTICE pins the provenance.json commit"
else
  bad "NOTICE commit does not match provenance.json; re-vendoring requires updating NOTICE's Source line"
fi
if grep -qF 'GreenSock' NOTICE && grep -qF 'MIT' NOTICE && grep -qF 'NOT included' NOTICE && grep -qF 'Modified: 4 factual corrections' NOTICE; then
  ok "NOTICE carries the upstream MIT attribution and modification statement"
else
  bad "NOTICE must carry the GreenSock MIT attribution, trademark note and modification statement"
fi

# 7. Host half: syntax, allowed APIs, no process/network/write/home access.
for file in lib/index.js tests/host-smoke.mjs tests/registry-smoke.mjs tools/apply-corrections.mjs; do
  if node --check "$file" 2>/dev/null; then ok "node --check $file"; else bad "node --check $file"; fi
done
FORBIDDEN='child_process|execSync|execFileSync|\bspawn\b|execFile\(|\bfetch\b|\bhttp\b|\bnet\b|XMLHttpRequest|writeFile|appendFile|createWriteStream|mkdirSync|homedir\(|node:os'
if grep -En "$FORBIDDEN" lib/index.js >/dev/null 2>&1; then
  bad "lib/index.js contains a forbidden process/network/write/home API"
else
  ok "lib/index.js has no process, network, write or home API"
fi
if grep -qF 'node:fs' lib/index.js && grep -qF 'readFileSync' lib/index.js; then
  ok "lib/index.js only reads package files with node:fs readFileSync"
else
  bad "lib/index.js is expected to read its bundled files with node:fs readFileSync"
fi
if grep -qF 'PACKAGE_ROOT' lib/index.js && grep -qF "export const SOURCE = 'bundled'" lib/index.js; then
  ok "host paths resolve from the package root and pass a string source"
else
  bad "host paths must resolve from the package root and pass a string source"
fi
if grep -qF "resourceBase: { kind: 'directory', path: join(SKILLS_DIR, definition.name) }" lib/index.js; then
  ok "registration passes a per-skill directory resourceBase"
else
  bad "registration must pass resourceBase {kind:'directory'}"
fi
if node -e 'const p=JSON.parse(require("node:fs").readFileSync("package.json","utf8"));process.exit(p.dsh&&p.dsh.bundle&&p.dsh.bundle.patch==="./cordis.patch.yml"?0:1)'; then
  ok "dsh.bundle.patch points at cordis.patch.yml"
else
  bad "dsh.bundle.patch is wrong"
fi

# 8. Documentation and licensing.
for file in README.md README.zh-TW.md INSTALL.md CHANGELOG.md LICENSE NOTICE SECURITY.md checksums.txt provenance.json tools/vendor-upstream.sh docs/KNOWN-UPSTREAM-ISSUES.md docs/SERIES.md; do
  [ -f "$file" ] && ok "repo file present: $file" || bad "missing repo file: $file"
done
if grep -qF 'MIT' LICENSE && grep -qF 'Chonwai' LICENSE; then ok "LICENSE is MIT and names the bundle author"; else bad "LICENSE must be MIT and name Chonwai"; fi
if grep -qF 'nearest layer' README.md && grep -qF 'nearest layer' INSTALL.md; then
  ok "README and INSTALL state the nearest-layer rule"
else
  bad "README and INSTALL must state that the nearest layer wins a duplicate name"
fi
if grep -qF 'Migrating from a file-level install' README.md && grep -qF 'migrating from a file-level install' INSTALL.md; then
  ok "README and INSTALL carry the file-level migration section"
else
  bad "README and INSTALL must document the required file-level migration"
fi
if grep -qF 'WARNING: file-level copy will shadow the bundle' README.md && grep -qF 'WARNING: file-level copy will shadow the bundle' INSTALL.md; then
  ok "README and INSTALL ship the file-copy preflight command"
else
  bad "README and INSTALL must ship the file-copy preflight command"
fi
if grep -qF 'KNOWN-UPSTREAM-ISSUES.md' README.md && grep -qF 'easeReverse' docs/KNOWN-UPSTREAM-ISSUES.md &&
  grep -qF 'issues/20' docs/KNOWN-UPSTREAM-ISSUES.md && grep -qF 'issues/21' docs/KNOWN-UPSTREAM-ISSUES.md &&
  grep -qF 'issues/23' docs/KNOWN-UPSTREAM-ISSUES.md && grep -qF 'onMounted' docs/KNOWN-UPSTREAM-ISSUES.md; then
  ok "known-issue documentation covers the four fixes, easeReverse and the Nuxt bug"
else
  bad "docs/KNOWN-UPSTREAM-ISSUES.md is incomplete"
fi
if grep -qF 'dsh-rein' docs/SERIES.md && grep -qF 'dsh-uupm' docs/SERIES.md; then
  ok "docs/SERIES.md cross-links the series"
else
  bad "docs/SERIES.md must cross-link dsh-rein and dsh-uupm"
fi
if node --input-type=module <<'JS'
import { existsSync, readFileSync } from 'node:fs';
const problems = [];
for (const doc of ['README.md', 'README.zh-TW.md', 'INSTALL.md', 'CHANGELOG.md', 'docs/KNOWN-UPSTREAM-ISSUES.md', 'docs/SERIES.md']) {
  const text = readFileSync(doc, 'utf8');
  // Markdown images (screenshots under assets/) are not documentation links.
  for (const match of text.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = target.split('#')[0];
    if (path && !existsSync(path) && !path.includes('{{')) problems.push(`${doc}: ${target}`);
  }
}
if (problems.length > 0) throw new Error(problems.join('\n'));
JS
then
  ok "internal documentation links resolve"
else
  bad "documentation has an internal link to a missing file"
fi

# 9. Offline smoke tests and cleanup.
if node tests/host-smoke.mjs >/tmp/dsh-gsap-host-smoke.log 2>&1; then
  ok "host-smoke.mjs passes ($(grep -c '^PASS' /tmp/dsh-gsap-host-smoke.log) checks)"
else
  bad "host-smoke.mjs failed; see /tmp/dsh-gsap-host-smoke.log"
fi
DSH_MODULES="${DSH_ASAR_MODULES:-/tmp/dsh-asar/dsh/node_modules/@deepseek-ai}"
if [ -f "$DSH_MODULES/dsh-skill/lib/index.js" ] && [ -f "$DSH_MODULES/cordis/lib/index.js" ]; then
  if node tests/registry-smoke.mjs >/tmp/dsh-gsap-registry-smoke.log 2>&1; then
    ok "registry-smoke.mjs passes against the real dsh-skill registry ($(grep -c '^PASS' /tmp/dsh-gsap-registry-smoke.log) checks)"
  else
    bad "registry-smoke.mjs failed; see /tmp/dsh-gsap-registry-smoke.log"
  fi
else
  ok "registry-smoke skipped: no extracted DSH package tree (set DSH_ASAR_MODULES); SKIP is not verification"
fi
if [ "$(find . -name '__pycache__' -o -name '*.pyc' | wc -l | tr -d ' ')" -eq 0 ]; then
  ok "no __pycache__ or *.pyc in the package"
else
  bad "the package contains __pycache__ or *.pyc"
fi

hr
if [ "$FAIL" -eq 0 ]; then
  printf 'RESULT: PASS (%s checks)\n' "$PASS"
  exit 0
fi
printf 'RESULT: FAIL (%s passed, %s failed)\n' "$PASS" "$FAIL"
printf 'failed checks:%s\n' "$FAILED_LIST"
exit 1
