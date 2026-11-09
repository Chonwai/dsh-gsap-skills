# INSTALL — @chonwai/dsh-gsap-skills

DeepSeek Harness (DSH) bundle installation, activation, migration, verification,
updates and rollback. Written for DSH **0.2.2-rc.1** on macOS; the same flow
applies to any managed profile.

> The bundle is Host-only: one plugin row registers eight runtime skills.
>
> **Activation rule: profile bundle rows are composed when the DSH host boots.**
> After installing, enabling, disabling or removing a bundle in an already
> running host, **restart DSH**. A new session or a Web page reload does **not**
> re-compose the profile. `plugin_manager` reporting installed/enabled only
> means the profile is correct; it does not prove the running host mounted the
> row.
>
> **Skill layer rule: this bundle registers in the host/global layer.** The Web
> app mounts `skill-filesystem` **inside the agent preset's scope** and disables
> the host-level filesystem row, so a file-level copy of a `gsap-*` skill under
> `~/.agents/skills`, `$DSH_HOME/skills`, or a project `.agents/skills` is
> discovered by the preset's provider and sits in the **nearer scoped layer**,
> which wins the duplicate name outright. **The bundle cannot override it.**
> Migrate the file copies out first (§5).

## 0. Before you install

| Item | Detail |
|---|---|
| Preflight | `test -d ~/.agents/skills/gsap-core && echo "WARNING: file-level copy will shadow the bundle"` — if it prints, migrate first (§5) |
| What gets written | the profile's `package.json` dependency (`link:` for a local directory), the ordered `dsh.profile.bundles` list, the profile `node_modules` link and the lockfile — done by DSH's Plugin Manager, not by this package |
| What this package writes at runtime | nothing outside its own package; it only reads `skills/**` |
| Approval needed | every `plugin_manager` action (including listing) needs **Full access** or an approval prompt; the Web UI install dialog has its own trust confirmation |
| Network | none for a local-directory install; no dependencies to download |
| Restart | **required after any bundle change**; the running host keeps the rows it booted with |
| GSAP library | **not included**. The skills document GSAP; each project installs `gsap` separately under GreenSock's license |
| Backout | toggle the bundle off (then restart), or remove it (see §7) |

## 1. Install from the Web UI (recommended)

1. Open DSH → **Plugins** in the sidebar.
2. **Add plugin** → **Install a third-party plugin**.
3. Paste the **absolute path** to this directory, e.g.
   `/Users/you/code/dsh-gsap-skills`.
4. Read the trust box and confirm. DSH reads the package, runs pnpm against the
   profile, then applies the bundle patch.
5. If the dialog offers **Enable now**, accept it.
6. **Restart DSH** (quit and reopen), then migrate any file-level copies (§5),
   open a new session and verify with §4.

## 2. Install through `plugin_manager` (agent-driven)

From a session with Full access (or an approval prompt you can answer):

```
plugin_manager(action: "install_bundle", target: "/abs/path/to/dsh-gsap-skills")
```

- This runs the same operation as the UI: `pnpm add link:<path>`, append to
  `dsh.profile.bundles`, apply `dsh.bundle.patch`, enable the bundle.
- No dependencies and no install scripts, so no `approvedBuilds` /
  `pendingBuilds` prompt appears.
- Read the returned `application` field: `applied` means the profile layer was
  applied. It does **not** mean the running host mounted the row — restart DSH
  before expecting the skills. `restart-required` says the same thing explicitly.

Do **not** reproduce the install by editing the profile's `package.json` or
`cordis.patch.yml` by hand and running pnpm yourself — that is outside the
supported Plugin Manager flow and needs a separate approval per write. Use §1
or §2.

## 3. Manual copy (advanced; only when Plugin Manager is unavailable)

This bypasses the supported flow. Back up the profile first, and expect to
manage updates/rollback yourself. All paths are inside the managed profile
directory (`$DSH_PROFILE_DIR`, e.g. `~/.dsh/profiles/desktop`):

```bash
PROFILE="${DSH_PROFILE_DIR:-$HOME/.dsh/profiles/desktop}"
mkdir -p "$PROFILE/node_modules/@chonwai"
rsync -a --delete /abs/path/to/dsh-gsap-skills/ \
  "$PROFILE/node_modules/@chonwai/dsh-gsap-skills/"
```

Then, with the app stopped or the profile file open only in a text editor:

1. add `"@chonwai/dsh-gsap-skills": "link:/abs/path/to/dsh-gsap-skills"` (or a
   `file:` path) to the profile `package.json` `dependencies`;
2. append `"@chonwai/dsh-gsap-skills"` to `dsh.profile.bundles`;
3. run the profile's package manager install once (only if the host requires it);
4. **restart DSH**.

Rollback: remove the copied directory, the dependency entry and the bundle
entry, then restart. This route is not covered by `plugin_manager` diagnostics
and is not tested by CI; prefer §1/§2.

## 4. Verify (after restart and migration)

1. **Preflight**: `test -d ~/.agents/skills/gsap-core` must print nothing (same
   for `$DSH_HOME/skills` and project `.agents/skills`). A remaining copy sits
   in the preset's scoped layer and wins; migrate it first (§5).
2. **Restart DSH**, then open a new session.
3. **Load one skill** with the `skill` tool or `/gsap-core`. The result must
   show `<skill_resources>` with
   `Base directory for this skill: /abs/path/dsh-gsap-skills/skills/gsap-core`,
   the upstream body, and no `{{...}}` token.
4. **Catalog**: all eight names should be listed as runtime skills:
   `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`,
   `gsap-utils`, `gsap-react`, `gsap-frameworks`, `gsap-performance`.
5. **If the catalog still shows a stale copy** (for example a skill body without
   the corrected transform order):
   - run the step-1 preflight again — a scoped file copy is the likeliest cause;
   - confirm the host was restarted **after** the install;
   - check `plugin_manager(action: "list_bundles")` shows
     `@chonwai/dsh-gsap-skills` installed/enabled with row `include:gsap`;
   - restart DSH again and repeat. A new session alone cannot fix this.
6. **Plugins page**: the installed bundle should appear with its localized
   title/description and icon (if the build surfaces bundle metadata), and row
   **gsap** should be listed.
7. **Read-only inspection**: `cordis_inspect_query(platform: "host",
   provider: "Config", method: "listConfigs", input: { name:
   "@chonwai/dsh-gsap-skills" })` finds the live row. `status: "absent"` means
   “no Config schema”, not “disabled”.

> The bundle's `[gsap] …` warning is only emitted when the host-global catalog
> read sees a same-name **global** entry. In the standard Web preset the
> file-level copy lives in the preset's scoped layer, so the bundle never sees
> it; the scoped copy simply wins. Do not use that line as the verification
> signal.

## 5. Layer semantics and migrating from a file-level install (required)

Three facts from the DSH source decide which copy wins:

1. `@deepseek-ai/dsh-web-app/presets/standard.patch.yml` mounts
   `skill-filesystem` **inside the agent preset's scope**.
2. `@deepseek-ai/dsh-web-app/cordis.patch.yml` **disables the host-level
   `skill-filesystem` row** ("presets own local discovery").
3. `@deepseek-ai/dsh-skill` merges the global layer with the viewing scope's
   chain: **the nearest layer's entry wins a duplicate name outright**, and rank
   only orders duplicates inside one layer.

Consequences:

- This bundle is a host row in the **global** layer. A file-level `gsap-*`
  copy under `~/.agents/skills`, `$DSH_HOME/skills`, or a project
  `.agents/skills` is discovered by the preset's provider and lives in the
  **nearer scoped layer**; it wins unconditionally and the bundle cannot
  override it.
- Removing the file copy is picked up **live** by the filesystem watcher (the
  catalog refreshes at the next pre-step). Installing or toggling the bundle
  itself still needs a **host restart**.
- A profile install can therefore be correct while the old file copy is still
  the winning catalog entry. That is expected, not a failed install.

Preflight:

```bash
test -d ~/.agents/skills/gsap-core && echo "WARNING: file-level copy will shadow the bundle"
test -d "${DSH_HOME:-$HOME/.dsh}/skills/gsap-core" && echo "WARNING: DSH_HOME copy will shadow the bundle"
```

Move the copies out (manual; this package never does it):

```bash
mkdir -p ~/.dsh-backup
for s in gsap-core gsap-timeline gsap-scrolltrigger gsap-plugins gsap-utils gsap-react gsap-frameworks gsap-performance; do
  TARGET=~/.dsh-backup/$s-$(date +%F)
  test -d ~/.agents/skills/$s && mv ~/.agents/skills/$s "$TARGET"
  test -d "${DSH_HOME:-$HOME/.dsh}/skills/$s" && mv "${DSH_HOME:-$HOME/.dsh}/skills/$s" "$TARGET-dsh"
done
```

Also move any project-local `<repo>/.agents/skills/gsap-*`. Keep the backup
until the bundle is verified. After moving, wait for the next pre-step (or send
a message) and try §4.3 again — the flip should not need a restart. If nothing
changes, restart DSH once (the bundle row must still be composed at boot).

## 6. Updates

1. Bump `package.json` and `lib/index.js` together (same version string).
2. Re-vendor when upstream changes:

   ```bash
   bash tools/vendor-upstream.sh aed9cfd3277740755f6bfc1155c7aa645403b760 \
     --repo /path/to/gsap-skills
   # or from an existing checkout:
   bash tools/vendor-upstream.sh --from-dir /path/to/gsap-skills \
     --ref aed9cfd3277740755f6bfc1155c7aa645403b760
   ```

   It copies the eight `SKILL.md` files and `llms.txt`, applies the four
   corrections (failing if an expected original string is gone), rewrites
   `checksums.txt` and `provenance.json`, and runs the gates.
3. Update the `Source:` line in `NOTICE` to the new full commit; the offline
   gate fails when `NOTICE` and `provenance.json.ref` disagree.
4. Reinstall/restart the bundle. A linked install is remounted by a **DSH
   restart**; a replaced package also needs a restart for a fresh Host module
   generation.
5. Re-run §4 after the purge in §5. Only claim success after the catalog, the
   loaded body and (optionally) a project-level GSAP test pass.

## 7. Toggle and rollback

| Intent | Action | Notes |
|---|---|---|
| Pause without uninstalling | Plugins → switch the bundle off (or `plugin_manager(action: "set_bundle", target: "@chonwai/dsh-gsap-skills", enabled: false)`) | profile change only; **restart DSH** to drop the eight registrations from the running host |
| Resume | switch it on / `enabled: true` | **restart DSH** to re-compose the bundle |
| Remove completely | Plugins → Remove (or `plugin_manager(action: "remove_bundle", target: "@chonwai/dsh-gsap-skills")`) | removes the dependency and bundle layer; restart if asked (recommended) |
| Keep working from files | copy the eight `SKILL.md` files into `~/.agents/skills` yourself | that copy will win over the bundle (nearer preset layer); pick one route |

Removing the bundle does not delete anything in `~/.agents` or `$DSH_HOME`.

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Bundle installed/enabled, catalog unchanged after reload/new session | expected before restart; bundle rows compose at host boot | restart DSH |
| Catalog still shows an old copy of a skill after restart | a file-level copy is still in a preset-scanned root; it wins from the nearer layer | run the §5 preflight, move the copy out, wait one pre-step |
| `skill("gsap-core")` shows the wrong transform order | the loaded body is a file-level copy or an older module generation | migrate the file copy; if the bundle is already the winner, restart DSH for a fresh module generation |
| A skill is missing from the catalog | another runtime registration owns that name (warning), or `skills` is absent | remove the competing runtime source; confirm `skills` is mounted |
| `[gsap] …` warning never appears | expected in the Web preset: the scoped file copy is invisible to the bundle's global catalog read | use the §5 preflight instead |
| `skill(...)` throws `source must be a string` | a Host module generation older than this package is loaded | restart DSH |
| Plugins card has no icon/title | the build does not surface bundle locale metadata | check row diagnostics; visual rendering is unverified in this repo |
| Offline check fails with "NOTICE commit does not match provenance.json" | re-vendored without updating NOTICE | set `NOTICE` to `provenance.json.ref` |
| Offline check fails with "uncorrected upstream text still present" | someone hand-edited the vendored skill | re-run `tools/vendor-upstream.sh`; never hand-edit vendored files |

## 9. Uninstall

Plugins page → remove the bundle, or
`plugin_manager(action: "remove_bundle", target: "@chonwai/dsh-gsap-skills")`,
then restart DSH so the running host stops serving the registrations. Nothing
outside the profile changes. The skills are documentation only; removing the
bundle does not uninstall GSAP from any project.

## 10. Filing an issue

Include: DSH version and host boot time, profile name, the `gsap` row's
activation state, whether DSH was restarted after install, whether file-level
`gsap-*` copies exist under `~/.agents/skills`, `$DSH_HOME/skills` or a project
`.agents/skills`, the output of `tests/offline-check.sh`, and the exact skill
body you saw.
