/**
 * Optional integration test for @chonwai/dsh-gsap-skills.
 *
 * Mounts the host half next to the REAL `@deepseek-ai/dsh-skill` registry (and
 * Cordis), using an extracted DSH `app.asar` package tree. This exercises the
 * load path the offline fake-context test cannot: `skills.register()` accepts a
 * definition that `skills.get()` then rejects (the "source must be a string"
 * bug class from an earlier DSH bundle).
 *
 *   node tests/registry-smoke.mjs
 *   DSH_ASAR_MODULES=/path/to/app.asar/dsh/node_modules/@deepseek-ai node tests/registry-smoke.mjs
 *
 * Without an extracted package tree it prints SKIP and exits 0. SKIP is not
 * verification; only a real PASS counts.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CANDIDATES = [process.env.DSH_ASAR_MODULES, '/tmp/dsh-asar/dsh/node_modules/@deepseek-ai'].filter(Boolean);
const modules = CANDIDATES.find(
  (dir) => existsSync(join(dir, 'cordis/lib/index.js')) && existsSync(join(dir, 'dsh-skill/lib/index.js')),
);

if (modules === undefined) {
  console.log('SKIP registry-smoke: no extracted DSH package tree (set DSH_ASAR_MODULES)');
  process.exit(0);
}

const { Context } = await import(pathToFileURL(join(modules, 'cordis/lib/index.js')).href);
const skillModule = await import(pathToFileURL(join(modules, 'dsh-skill/lib/index.js')).href);
const SkillRegistry = skillModule.default;
const { renderSkillContent } = skillModule;
const { apply, SKILL_NAMES, SKILLS_DIR } = await import('../lib/index.js');

const results = [];
function check(label, fn) {
  try {
    fn();
    results.push(`PASS  ${label}`);
  } catch (error) {
    results.push(`FAIL  ${label} :: ${error.message}`);
  }
}

const ctx = new Context();
ctx.logger = { warn() {}, info() {} };
ctx.plugin(SkillRegistry);
ctx.plugin({ name: 'gsap', apply });
await new Promise((resolve) => setTimeout(resolve, 150));

const skills = ctx.get('skills');
const catalog = skills === undefined ? [] : await skills.list({});
const summaries = new Map(catalog.map((entry) => [entry.name, entry]));
let core;
try {
  core = skills === undefined ? undefined : await skills.get('gsap-core');
} catch (error) {
  core = undefined;
  results.push(`FAIL  skills.get('gsap-core') threw :: ${error.message}`);
}

check('the runtime registry lists all eight skills', () => {
  if (skills === undefined) throw new Error('skills service is missing');
  assertCatalog();
  function assertCatalog() {
    for (const skillName of SKILL_NAMES) {
      const summary = summaries.get(skillName);
      if (summary === undefined) throw new Error(`${skillName} missing from the catalog`);
      if (summary.provider !== 'runtime') throw new Error(`${skillName} provider is ${String(summary.provider)}`);
      if (summary.source !== 'bundled') throw new Error(`${skillName} source is ${String(summary.source)}`);
    }
  }
});

check('skills.get() accepts the registered definition', () => {
  if (core === undefined) throw new Error('skills.get() returned undefined');
  if (core.name !== 'gsap-core') throw new Error(`loaded name is ${String(core.name)}`);
  if (typeof core.source !== 'string') throw new Error('loaded source is not a string');
  if (typeof core.provider !== 'string') throw new Error('loaded provider is not a string');
  if (typeof core.content !== 'string') throw new Error('loaded content is not a string');
  if (core.content.includes('{{')) throw new Error('loaded content still has a template token');
  if (core.resourceBase?.kind !== 'directory') throw new Error('loaded resourceBase is not a directory');
  if (core.resourceBase?.path !== join(SKILLS_DIR, 'gsap-core')) throw new Error('loaded resourceBase is not the skill directory');
  if (!core.content.includes('translation → rotation → rotationY → rotationX → skew → scale')) {
    throw new Error('loaded content is missing the corrected transform order');
  }
});

check('renderSkillContent() emits the base directory and instructions', () => {
  const rendered = renderSkillContent(core);
  if (!rendered.includes(`Base directory for this skill: ${join(SKILLS_DIR, 'gsap-core')}`)) {
    throw new Error('missing base directory hint');
  }
  if (!rendered.includes('<skill_instructions>')) throw new Error('missing instructions wrapper');
});

for (const line of results) console.log(line);
const failed = results.filter((line) => line.startsWith('FAIL'));
if (failed.length > 0) {
  console.error(`\nregistry-smoke: ${failed.length}/${results.length} failed`);
  process.exit(1);
}
console.log(`\nregistry-smoke: ${results.length}/${results.length} passed`);
process.exit(0);
