# Installing and distributing `@chonwai/dsh-gsap-skills`

A friend-facing guide to the four supported ways to install this DeepSeek Harness
(DSH) bundle, how to verify it, and what to do when it does not show up.
Canonical repo: <https://github.com/Chonwai/dsh-gsap-skills>.

This package is an **unofficial** bundle of GreenSock's official GSAP skills. It
is not affiliated with or endorsed by GreenSock or DeepSeek. The skill
documentation is MIT; **the GSAP library is not included and is not MIT** —
each project installs GSAP separately under GreenSock's license.

## What is verified / not verified

| Verified in this repo | Not verified here |
|---|---|
| `npm pack` tarball completeness and gates (`npm test`, host/registry smoke, checksums) run from an extracted package | the actual **Plugins-page UI flow** (dialog, trust box, Enable now) — documented as expected UI behavior, not end-to-end re-tested in this repo |
| the real DSH `parseInstallSpec` accepting the documented forms (and rejecting tree URLs / relative paths) | installing into a managed DSH profile — no profile was installed during release verification |
| `npm install github:…#v1.0.6` resolving the tag to the right commit | the npm registry channel (the package is `private`) |
| version/checksums/release consistency via `tools/check-release.sh` | GSAP runtime animation behavior (the bundle ships docs, not the library) |

## 1. Prerequisites

- **DSH desktop 0.2.2-rc.1 or newer within the 0.2.x line**
  (`engines.dsh: ">=0.2.2-rc.1 <0.3.0"`).
- A **managed DSH profile** (the desktop app's `desktop` profile or a
  CLI-managed profile). The desktop app manages its own profile; use the
  Plugins page or `plugin_manager`, not `dsh plugin add`.
- **Network access** for git installs and for the Plugins page catalog.
- **`git`** for the git channels. If git is unavailable, use the release
  tarball instead.
- **Node.js is not required by the bundle.** Node >= 22 is only needed to
  develop or test the package; the installed bundle just reads files.
- Every `plugin_manager` action (including listing) needs **Full access** or an
  approval prompt. The Web install dialog has its own trust confirmation.

## 2. How DSH reads an install spec

The Plugin Manager accepts these forms (verified against
`@deepseek-ai/dsh-plugin-manager`'s install-spec parser; a `#tag`/`#ref`
fragment is allowed on hosted git URLs and shorthand specs):

| Form | Example |
|---|---|
| absolute local directory | `/Users/you/dsh-gsap-skills` |
| absolute local tarball | `/Users/you/Downloads/dsh-gsap-skills-1.0.7.tgz` |
| http(s) tarball | `https://example.com/dsh-gsap-skills-1.0.7.tgz` |
| git shorthand + tag | `github:Chonwai/dsh-gsap-skills#v1.0.6` |
| git URL | `git+https://github.com/Chonwai/dsh-gsap-skills.git#v1.0.6` |
| hosted repository URL + tag | `https://github.com/Chonwai/dsh-gsap-skills#v1.0.6` |
| npm package name (future) | `@chonwai/dsh-gsap-skills@1.0.7` |

Pinning a tag is strongly recommended: branches move, tags do not. The forms
above are equivalent; the hosted URL is the friendliest to paste into the
dialog.

### Common mistakes the installer refuses

The Plugin Manager validates the spec before pnpm sees it. Two failures are
common:

- A GitHub **tree URL** — `https://github.com/Chonwai/dsh-gsap-skills/tree/main`
  or `…/tree/v1.0.6` — is refused with
  `a URL must point at a git repository or a tarball`. Use the **repo-root**
  URL plus the tag: `https://github.com/Chonwai/dsh-gsap-skills#v1.0.6`.
- A **relative path** — `./x`, `../x`, `file:./x` — is refused with
  `a local path must be absolute`. Use an absolute directory or `.tgz` path
  (`/Users/you/...`).

`github:Chonwai/dsh-gsap-skills#v1.0.6` and
`git+https://github.com/Chonwai/dsh-gsap-skills.git#v1.0.6` are accepted
alternatives to the hosted URL.

## 3. Channel 1 — Plugins page (recommended for friends)

1. Open **DSH → Plugins** in the sidebar.
2. **Add plugin** → **Install a third-party plugin**.
3. Paste the pinned spec:
   `https://github.com/Chonwai/dsh-gsap-skills#v1.0.6`
   (or `github:Chonwai/dsh-gsap-skills#v1.0.6`).
4. Read the trust box and confirm. DSH clones the tag, adds the profile
   dependency and bundle row, and enables the bundle.
5. If the dialog offers **Enable now**, accept it.
6. If the skills do not appear in a new session, **restart DSH** (profile
   bundle rows compose when the host boots; a page refresh alone does not
   re-compose them) and open a new session.

The dialog steps above are **expected UI behavior, not end-to-end re-tested in
this repo**; the spec parsing, package resolution, tarball gates and release
checks are tested (see the verification box above).

The git channel needs `git` and network; a private fork needs its own
credentials.

## 4. Channel 2 — agent / `plugin_manager`

From a session with Full access (or an approval prompt you can answer):

```
plugin_manager(action: "install_bundle", target: "https://github.com/Chonwai/dsh-gsap-skills#v1.0.6")
```

The same absolute-path, tarball-URL or git forms are accepted. The returned
`application: "applied"` means the profile changed; it does not mean the running
host mounted the row — restart DSH before expecting the skills.

## 5. Channel 3 — offline tarball

Download `dsh-gsap-skills-1.0.7.tgz` from the GitHub release, then verify and
install it (`npm pack` names the same bytes `chonwai-dsh-gsap-skills-1.0.7.tgz`;
the release asset is renamed):

```bash
shasum -a 256 -c dsh-gsap-skills-1.0.7.tgz.sha256
# then, in the Plugins dialog, paste the absolute path to the .tgz:
#   /Users/you/Downloads/dsh-gsap-skills-1.0.7.tgz
```

`plugin_manager` accepts the same absolute tarball path. An extracted directory
also works, as long as the path is absolute. The tarball is complete: it
contains `lib/`, `skills/`, `docs/`, `locale/`, `icon.svg`, `provenance.json`,
`checksums.txt` and the tests, so an extracted copy passes the same gates as
the repository.

## 6. Channel 4 — npm (future; not published)

The package is `private: true` today, so there is no npm release and the
registry channel is **not available yet**. If the maintainer later publishes it:

```bash
# maintainer, once per release (needs `npm login` and publish rights)
npm publish --access public        # after flipping private -> false for that release

# friend
plugin_manager(action: "install_bundle", target: "@chonwai/dsh-gsap-skills@1.0.7")
```

Publishing is a deliberate human step; do not assume a registry name exists
until the release notes say so.

## 7. Verify what you installed

Run these from a session, then from a shell:

1. `plugin_manager(action: "list_bundles")` → `@chonwai/dsh-gsap-skills`
   shows `installed: true`, `enabled: true`, `removable: true`, with row
   `include:gsap`.
2. A new session's skill catalog lists all eight names: `gsap-core`,
   `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`,
   `gsap-react`, `gsap-frameworks`, `gsap-performance`.
3. Layer preflight: a file-level copy beats the bundle.
   `test -d ~/.agents/skills/gsap-core && echo "shadowed"` should print nothing
   (check `$DSH_HOME/skills` and project `.agents/skills` too). If it prints,
   see §8.
4. `skill("gsap-core")` (or `/gsap-core`) returns `<skill_content>` with
   `Base directory for this skill: /abs/path/.../skills/gsap-core`, the
   corrected transform order `translation → rotation → rotationY → rotationX →
   skew → scale`, and no `{{...}}` token.

## 8. Layer caveat: file copies win, and how to migrate

DSH's standard Web preset mounts `skill-filesystem` inside the agent preset's
scope and disables the host-level filesystem row; the catalogue merges the
global layer with the viewing scope's chain, and **the nearest layer wins a
duplicate name outright**. This bundle is a host row in the global layer, so a
file-level `gsap-*` copy under `~/.agents/skills`, `$DSH_HOME/skills`, or a
project `.agents/skills` is nearer and wins. The bundle cannot override it.

Back up and move the copies out (removal is picked up live by the filesystem
watcher; installing or toggling the bundle still needs a DSH restart):

```bash
mkdir -p ~/.dsh-backup
for s in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance; do
  test -d ~/.agents/skills/$s && mv ~/.agents/skills/$s ~/.dsh-backup/$s-$(date +%F)
  test -d "${DSH_HOME:-$HOME/.dsh}/skills/$s" && mv "${DSH_HOME:-$HOME/.dsh}/skills/$s" ~/.dsh-backup/$s-dsh-$(date +%F)
done
```

Also move project-local `<repo>/.agents/skills/gsap-*` copies. Nothing in this
package deletes or edits those copies for you.

## 9. Update and uninstall

- **Update**: install the newer pinned spec again (Remove the old bundle first
  if the Plugins page will not update in place), or use the Plugins **Update**
  action when offered. Restart DSH afterwards.
- **Pause**: Plugins → toggle the bundle off, then restart DSH.
- **Uninstall**: Plugins → Remove (or
  `plugin_manager(action: "remove_bundle", target: "@chonwai/dsh-gsap-skills")`),
  then restart DSH. Removing the bundle does not touch `~/.agents` or
  `$DSH_HOME`, and does not uninstall GSAP from any project.
- No backup is needed: the bundle is display-only documentation; removing it
  loses no user data.

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Installed/enabled, skills missing after reload | bundle rows compose at host boot | restart DSH; open a new session |
| Catalog shows an old copy of a skill | file-level copy in a preset-scanned root | run §8 preflight/migration |
| Install fails with a git/auth error | private fork, missing `git`, or network | use the release tarball (§5) or fix credentials |
| Install refused with `engines`/version message | DSH outside `>=0.2.2-rc.1 <0.3.0` | upgrade/downgrade DSH; do not force |
| `plugin_manager` cannot find `@chonwai/dsh-gsap-skills` | npm channel is not published | use a git tag or the tarball |
| CI says `SKIP registry-smoke` | optional real-registry test needs an extracted `app.asar` | SKIP is **not** verification; only a `PASS` counts |
| `gsap` import errors in a project | the bundle ships docs, not the library | `npm install gsap` in that project under GreenSock's license |
| Unsure whether it is official | it is not | unofficial community bundle; see NOTICE |

## 11. Copy-paste message for friends

```
GSAP skills for DeepSeek Harness — unofficial bundle, 8 skills:
https://github.com/Chonwai/dsh-gsap-skills
DSH → Plugins → Add plugin → Install a third-party plugin → paste https://github.com/Chonwai/dsh-gsap-skills#v1.0.6
Read the trust box and confirm, choose Enable now, restart DSH, then load /gsap-core.
If skills don't appear: move ~/.agents/skills/gsap-* (and $DSH_HOME/skills, project .agents/skills) out of the skills root.
```
