#!/usr/bin/env node
/**
 * Apply the four documented corrections to the vendored GSAP skills.
 *
 * Fail-loud by design: every `find` string must occur exactly once. If upstream
 * fixes one of these issues, the vendor run stops instead of silently shipping
 * a stale patch or a duplicate correction. See docs/KNOWN-UPSTREAM-ISSUES.md.
 *
 *   node tools/apply-corrections.mjs          # patch skills/ in place
 *   node tools/apply-corrections.mjs --check  # verify only, no writes
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(join(fileURLToPath(import.meta.url), '..', '..'));

/** The four logical corrections, for provenance and documentation. */
export const CORRECTIONS_SUMMARY = [
  {
    id: 'core-transform-order',
    title: 'CSSPlugin transform-alias order',
    issue: 'unreported; verified against gsap@3.15.1 src/CSSPlugin.js (_renderCSSTransforms)',
  },
  {
    id: 'timeline-position-parameter-defaults',
    title: 'position parameter "(default)" markers and append-at-end semantics',
    issue: 'https://github.com/greensock/gsap-skills/issues/21',
  },
  {
    id: 'scrolltrigger-refresh-priority-direction',
    title: 'refreshPriority direction (higher numbers refresh first)',
    issue: 'https://github.com/greensock/gsap-skills/issues/20 (see also #15)',
  },
  {
    id: 'frameworks-duplicate-type-plugins',
    title: 'duplicate `type Plugins` declaration in the framework plugin loader',
    issue: 'https://github.com/greensock/gsap-skills/issues/23',
  },
];

/** The four corrections, each tied to its upstream issue (or source evidence). */
export const CORRECTIONS = [
  {
    id: 'core-transform-order',
    file: 'skills/gsap-core/SKILL.md',
    issue: 'unreported; verified against gsap@3.15.1 src/CSSPlugin.js (_renderCSSTransforms)',
    find: 'they apply in a consistent order (translation → scale → rotationX/Y → skew → rotation), are more performant',
    replace: 'they apply in a consistent order (translation → rotation → rotationY → rotationX → skew → scale), are more performant',
  },
  {
    id: 'timeline-relative-default',
    file: 'skills/gsap-timeline/SKILL.md',
    issue: 'https://github.com/greensock/gsap-skills/issues/21',
    find: '- **Relative (default)**: `"+=0.5"` — 0.5s after end; `"-=0.2"` — 0.2s before end.',
    replace: '- **Relative**: `"+=0.5"` — 0.5s after end; `"-=0.2"` — 0.2s before end.',
  },
  {
    id: 'timeline-placement-default',
    file: 'skills/gsap-timeline/SKILL.md',
    issue: 'https://github.com/greensock/gsap-skills/issues/21',
    find: '- **Placement**: `"<"` — start when recently-added animation starts; `">"` — start when recently-added animation ends (default); `"<0.2"` — 0.2s after recently-added animation start.',
    replace: '- **Placement**: `"<"` — start when recently-added animation starts; `">"` — start when recently-added animation ends; `"<0.2"` — 0.2s after recently-added animation start.',
  },
  {
    id: 'timeline-append-default',
    file: 'skills/gsap-timeline/SKILL.md',
    issue: 'https://github.com/greensock/gsap-skills/issues/21',
    find: 'By default, tweens are **appended** one after another. Use the **position parameter** to place tweens at specific times or relative to other tweens.',
    replace: 'By default — when no position parameter is given — tweens are **appended at the end of the timeline**, one after another. `">"` means "after the most recently added animation", not "the default". Use the **position parameter** to place tweens at specific times or relative to other tweens.',
  },
  {
    id: 'scrolltrigger-refresh-priority',
    file: 'skills/gsap-scrolltrigger/SKILL.md',
    issue: 'https://github.com/greensock/gsap-skills/issues/20 (see also #15)',
    find: '| **refreshPriority** | Number | Lower = refreshed first. Use when creating ScrollTriggers in non–top-to-bottom order: set so triggers refresh in page order (first on page = lower number). |',
    replace: '| **refreshPriority** | Number | Higher = refreshed first. Use when creating ScrollTriggers in non–top-to-bottom order: set so triggers refresh in page order (first on page = higher number). |',
  },
  {
    id: 'scrolltrigger-page-order',
    file: 'skills/gsap-scrolltrigger/SKILL.md',
    issue: 'https://github.com/greensock/gsap-skills/issues/20 (see also #15)',
    find: 'set **refreshPriority** on each so they are refreshed in that same top-to-bottom order (first section on page = lower number).',
    replace: 'set **refreshPriority** on each so they are refreshed in that same top-to-bottom order (higher numbers refresh first, so the first section on the page gets a higher number).',
  },
  {
    id: 'scrolltrigger-do-not-order',
    file: 'skills/gsap-scrolltrigger/SKILL.md',
    issue: 'https://github.com/greensock/gsap-skills/issues/20 (see also #15)',
    find: 'Create them top-to-bottom or assign **refreshPriority** so they refresh in page order.',
    replace: 'Create them top-to-bottom or assign **refreshPriority** (higher numbers refresh first) so they refresh in page order.',
  },
  {
    id: 'frameworks-duplicate-type',
    file: 'skills/gsap-frameworks/SKILL.md',
    issue: 'https://github.com/greensock/gsap-skills/issues/23',
    find: 'type PluginMap = typeof pluginMap;\ntype Plugins = keyof PluginMap;',
    replace: 'type PluginMap = typeof pluginMap;\ntype PluginName = keyof PluginMap;',
  },
  {
    id: 'frameworks-plugin-module',
    file: 'skills/gsap-frameworks/SKILL.md',
    issue: 'https://github.com/greensock/gsap-skills/issues/23',
    find: 'type PluginModule<K extends Plugins> = Awaited<ReturnType<PluginMap[K]>>;\ntype PluginExport<K extends Plugins> = PluginModule<K>[K & keyof PluginModule<K>];',
    replace: 'type PluginModule<K extends PluginName> = Awaited<ReturnType<PluginMap[K]>>;\ntype PluginExport<K extends PluginName> = PluginModule<K>[K & keyof PluginModule<K>];',
  },
  {
    id: 'frameworks-lazy-load',
    file: 'skills/gsap-frameworks/SKILL.md',
    issue: 'https://github.com/greensock/gsap-skills/issues/23',
    find: 'async function lazyLoadPlugin<K extends Plugins>(plugin: K): Promise<PluginExport<K>> {',
    replace: 'async function lazyLoadPlugin<K extends PluginName>(plugin: K): Promise<PluginExport<K>> {',
  },
];

function occurrences(text, needle) {
  return text.split(needle).length - 1;
}

/**
 * Patch the vendored skills in place.
 * @param {string} [root] package root.
 * @returns {string[]} ids applied (empty when already applied).
 */
export function applyCorrections(root = ROOT) {
  const applied = [];
  for (const correction of CORRECTIONS) {
    const path = join(root, correction.file);
    const text = readFileSync(path, 'utf8');
    const found = occurrences(text, correction.find);
    if (found === 0) {
      if (occurrences(text, correction.replace) === 1) continue;
      throw new Error(
        `[${correction.id}] expected upstream text is missing from ${correction.file}; ` +
          `upstream may have fixed ${correction.issue} — re-check corrections before vendoring`,
      );
    }
    if (found !== 1) {
      throw new Error(`[${correction.id}] expected exactly one match in ${correction.file}, found ${found}`);
    }
    writeFileSync(path, text.replace(correction.find, correction.replace));
    applied.push(correction.id);
  }
  return applied;
}

/**
 * Assert the corrections are present and the wrong text is gone.
 * @param {(file: string) => string} read reads a package-relative file.
 * @returns {number} number of corrections verified.
 */
export function verifyCorrections(read = (file) => readFileSync(join(ROOT, file), 'utf8')) {
  for (const correction of CORRECTIONS) {
    const text = read(correction.file);
    if (occurrences(text, correction.find) !== 0) {
      throw new Error(`[${correction.id}] uncorrected text still present in ${correction.file}`);
    }
    if (occurrences(text, correction.replace) !== 1) {
      throw new Error(`[${correction.id}] corrected text missing from ${correction.file}`);
    }
  }
  return CORRECTIONS.length;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const checked = verifyCorrections();
    console.log(`corrections: ${checked}/${CORRECTIONS.length} verified`);
  } else {
    const applied = applyCorrections();
    console.log(`corrections: ${applied.length} applied${applied.length === 0 ? ' (already present)' : ` (${CORRECTIONS.length} total)`}`);
    verifyCorrections();
  }
}
