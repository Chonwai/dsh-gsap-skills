/**
 * @chonwai/dsh-gsap-skills — host half.
 *
 * GSAP's official skills (https://github.com/greensock/gsap-skills) as one
 * DeepSeek Harness bundle. When the `gsap` row activates, this half:
 *
 *   1. reads the eight vendored `skills/gsap-NAME/SKILL.md` files;
 *   2. registers each as one runtime skill with
 *      `resourceBase: { kind: 'directory', path: skills/<name> }`, so the model
 *      can resolve any relative reference next to the skill.
 *
 * The vendored files carry four documented factual corrections applied by
 * `tools/apply-corrections.mjs`; see docs/KNOWN-UPSTREAM-ISSUES.md. Nothing is
 * rendered at mount time: the correction happens at vendor time, not runtime.
 *
 * Layer note (DSH 0.2.2-rc.1): this bundle is a host row, so it registers in the
 * GLOBAL skill layer. The Web app mounts `skill-filesystem` inside the agent
 * preset's scope and disables the host filesystem row; the nearest layer wins a
 * duplicate name outright, regardless of rank. A file-level copy of any of these
 * skills under `~/.agents/skills`, `$DSH_HOME/skills`, or a project
 * `.agents/skills` therefore beats this bundle, which cannot override it —
 * remove the file copy for the bundle to take effect (README migration section).
 *
 * The `skills` service is optional: a composition without it skips the
 * capability with a warning instead of failing the row. This module reads only
 * files inside its own package — no process spawning, no network, no writes, no
 * Config schema.
 *
 * Skill contents are vendored from GSAP skills (MIT, Copyright (c) 2026
 * GreenSock); the GSAP library itself is not bundled or licensed here. See
 * NOTICE and checksums.txt.
 *
 * @module @chonwai/dsh-gsap-skills
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Cordis plugin name (matches the bundle row id in `cordis.patch.yml`). */
export const name = 'gsap';

/** Package version, mirrored here for diagnostics. Keep in sync with package.json. */
export const version = '1.0.3';

/** Runtime registration source; must be a non-empty string for `skills.get()`. */
export const SOURCE = 'bundled';

/** The eight vendored skills, in upstream catalog order. */
export const SKILL_NAMES = [
  'gsap-core',
  'gsap-timeline',
  'gsap-scrolltrigger',
  'gsap-plugins',
  'gsap-utils',
  'gsap-react',
  'gsap-frameworks',
  'gsap-performance',
];

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Directory holding the vendored skills and `llms.txt`. */
export const SKILLS_DIR = join(PACKAGE_ROOT, 'skills');

/**
 * Mount the host half.
 *
 * @param {object} ctx - Cordis plugin context supplied by the Loader.
 * @param {object} [config] - the row config; empty in v1 and not required.
 * @returns {void}
 */
export function apply(ctx, config) {
  const state = { disposed: false, released: [] };

  // Toggling the row off or removing the bundle disposes this plugin, which
  // releases every registration captured below. `disposed` also stops a catalog
  // read that is still in flight from registering after teardown.
  try {
    if (typeof ctx.effect === 'function') {
      ctx.effect(() => () => {
        state.disposed = true;
        while (state.released.length > 0) {
          const release = state.released.pop();
          try {
            release();
          } catch (error) {
            warn(ctx, `cleanup failed: ${describe(error)}`);
          }
        }
      });
    }
  } catch (error) {
    warn(ctx, `could not register cleanup; a row toggle may keep the skills until restart: ${describe(error)}`);
  }

  mountSkills(ctx, state);
}

/**
 * Register the bundled skills through an already-mounted `skills` service, or
 * wait for one that mounts later.
 *
 * @param {object} ctx - plugin context.
 * @param {{disposed: boolean, released: Function[]}} state - mount state.
 */
function mountSkills(ctx, state) {
  const mount = (skills) => {
    if (!skills || typeof skills.register !== 'function') {
      warn(ctx, 'skills service has no register(); the bundled skills were not registered');
      return;
    }
    // The catalog read is async; registration still lands before the next model
    // step because DSH republishes the skill catalog on each pre-step.
    void registerBundledSkills(ctx, skills, state).catch((error) => {
      warn(ctx, `skill registration failed: ${describe(error)}`);
    });
  };

  const current = optionalService(ctx, 'skills');
  if (current !== undefined) {
    try {
      mount(current);
    } catch (error) {
      warn(ctx, `skills mount failed: ${describe(error)}`);
    }
    return;
  }
  if (typeof ctx.inject !== 'function') {
    warn(ctx, 'skills service is not mounted; the bundled skills were not registered (optional capability)');
    return;
  }
  try {
    ctx.inject(['skills'], (scope) => {
      try {
        mount(scope.skills);
      } catch (error) {
        warn(ctx, `skills mount failed after injection: ${describe(error)}`);
      }
    });
  } catch (error) {
    warn(ctx, `ctx.inject(['skills']) failed; the bundled skills were not registered (${describe(error)})`);
  }
}

/**
 * Load every vendored definition, read the catalog once, then register.
 *
 * Duplicate policy:
 * - another **runtime** registration in the same (global) layer wins: skip with
 *   a warning, because `skills.register()` would be a no-op anyway;
 * - a **filesystem** provider entry: still register, but warn that in the Web
 *   app the preset-scoped copy is nearer than this host row and wins; the user
 *   must remove the file copy for the bundle to take effect.
 * - a failed catalog read never disables registration (register blind).
 *
 * @param {object} ctx - plugin context.
 * @param {object} skills - the `ctx.skills` service.
 * @param {{disposed: boolean, released: Function[]}} state - mount state.
 * @returns {Promise<void>} resolves after every candidate was handled.
 */
async function registerBundledSkills(ctx, skills, state) {
  const definitions = [];
  for (const skillName of SKILL_NAMES) {
    try {
      definitions.push(loadSkillDefinition(skillName));
    } catch (error) {
      warn(ctx, `cannot load bundled skill "${skillName}": ${describe(error)}`);
    }
  }
  if (state.disposed || definitions.length === 0) return;

  const existing = new Map();
  try {
    if (typeof skills.list === 'function') {
      const catalog = await skills.list({});
      if (Array.isArray(catalog)) {
        for (const entry of catalog) {
          if (entry !== null && typeof entry === 'object' && typeof entry.name === 'string') {
            existing.set(entry.name, entry);
          }
        }
      }
    }
  } catch (error) {
    warn(ctx, `could not list existing skills; duplicate detection skipped (${describe(error)})`);
  }
  if (state.disposed) return;

  for (const definition of definitions) {
    const current = existing.get(definition.name);
    if (current !== undefined && current.provider === 'runtime') {
      warn(ctx, `runtime skill "${definition.name}" is already registered by another bundle; skipping the bundled copy`);
      continue;
    }
    if (current !== undefined) {
      const provider = typeof current.provider === 'string' ? current.provider : 'unknown';
      const source = typeof current.source === 'string' ? current.source : 'unknown';
      warn(
        ctx,
        `skill "${definition.name}" is also provided by ${provider}/${source}; in the Web app that preset-scoped copy ` +
          'is nearer than this host row and wins the name regardless of rank — remove the file-level copy for this bundle to take effect',
      );
    }
    try {
      const release = skills.register({
        name: definition.name,
        description: definition.description,
        // register() checks only name/description/invocation, but the load path
        // (skills.get -> validateDefinition) requires a string source; without
        // it registration succeeds and every skill() call throws.
        source: SOURCE,
        content: definition.content,
        resourceBase: { kind: 'directory', path: join(SKILLS_DIR, definition.name) },
      });
      if (typeof release === 'function') {
        if (state.disposed) release();
        else state.released.push(release);
      }
    } catch (error) {
      warn(ctx, `skills.register("${definition.name}") failed: ${describe(error)}`);
    }
  }
}

/**
 * Load one vendored skill from `skills/<name>/SKILL.md`.
 *
 * @param {string} skillName - directory name, also the frontmatter name.
 * @returns {{name: string, description: string, content: string}}
 */
export function loadSkillDefinition(skillName) {
  if (!SKILL_NAMES.includes(skillName)) throw new Error(`unknown bundled skill "${skillName}"`);
  const file = join(SKILLS_DIR, skillName, 'SKILL.md');
  const parsed = parseSkillMarkdown(readFileSync(file, 'utf8'));
  const data = parsed.data;
  if (data.name !== skillName) {
    throw new Error(`frontmatter name "${String(data.name)}" does not match directory "${skillName}"`);
  }
  if (typeof data.description !== 'string' || data.description.trim() === '') {
    throw new Error('frontmatter description is missing');
  }
  if (parsed.body.trim() === '') throw new Error('skill body is empty');
  if (parsed.body.includes('{{')) throw new Error('skill body contains an unresolved template token');
  return {
    name: data.name,
    description: data.description.trim(),
    content: parsed.body,
  };
}

/**
 * Minimal SKILL.md frontmatter reader.
 *
 * Reads `name`, `description` (plain, quoted, or `>` / `|` block) and the
 * optional `whenToUse`; unknown fields such as `license` are ignored, exactly
 * like the DSH skill loader.
 *
 * @param {string} markdown - file content.
 * @returns {{data: Record<string, string>, body: string}}
 */
export function parseSkillMarkdown(markdown) {
  const lines = String(markdown).replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines[0] !== '---') throw new Error('missing YAML frontmatter (line 1 must be ---)');
  let closing = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === '---') {
      closing = index;
      break;
    }
  }
  if (closing < 0) throw new Error('frontmatter is never closed');

  const data = {};
  let index = 1;
  while (index < closing) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$/.exec(lines[index]);
    if (match === null) {
      index += 1;
      continue;
    }
    const key = match[1];
    const inline = match[2].trim();
    if (inline === '>' || inline === '|' || inline === '>-' || inline === '|-') {
      const folded = inline.charAt(0) === '>';
      const groups = [];
      let current = [];
      index += 1;
      while (index < closing) {
        const line = lines[index];
        if (line === '' || /^[ \t]+/.test(line)) {
          if (line === '' && current.length > 0) {
            groups.push(current.join(' '));
            current = [];
          } else if (line !== '') {
            current.push(line.trim());
          }
          index += 1;
          continue;
        }
        break;
      }
      if (current.length > 0) groups.push(current.join(' '));
      data[key] = folded ? groups.join('\n\n') : groups.join('\n');
      continue;
    }
    data[key] =
      (inline.startsWith('"') && inline.endsWith('"')) || (inline.startsWith("'") && inline.endsWith("'"))
        ? inline.slice(1, -1)
        : inline;
    index += 1;
  }
  return { data, body: lines.slice(closing + 1).join('\n').trim() };
}

/**
 * Fetch one optional Cordis service without failing when absent.
 *
 * @param {object} ctx - plugin context.
 * @param {string} serviceName - service key.
 * @returns {object|undefined}
 */
function optionalService(ctx, serviceName) {
  try {
    return typeof ctx.get === 'function' ? ctx.get(serviceName) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Log through the Host logger at warn level, `console.warn` otherwise.
 *
 * @param {object} ctx - plugin context.
 * @param {string} message - message without the plugin prefix.
 */
function warn(ctx, message) {
  const text = `[gsap] ${message}`;
  try {
    if (ctx.logger && typeof ctx.logger.warn === 'function') {
      ctx.logger.warn(text);
      return;
    }
  } catch {
    /* fall through to console */
  }
  try {
    console.warn(text);
  } catch {
    /* no logger at all: stay silent rather than fail the mount */
  }
}

/**
 * Compact error text for logs.
 *
 * @param {unknown} error - thrown value.
 * @returns {string}
 */
function describe(error) {
  return error instanceof Error ? error.message : String(error);
}
