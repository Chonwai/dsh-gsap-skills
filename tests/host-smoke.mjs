/**
 * Offline host-half smoke test for @chonwai/dsh-gsap-skills.
 *
 * Imports the host module directly and mounts it against fake Cordis contexts.
 * Nothing here touches a DSH profile, the Loader, the network, `$HOME` or an
 * installed GSAP. The live activation remains unverified until the bundle is
 * installed in a real profile (see INSTALL.md "Verify").
 *
 *   node tests/host-smoke.mjs
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  apply,
  loadSkillDefinition,
  name as pluginName,
  parseSkillMarkdown,
  SKILL_NAMES,
  SKILLS_DIR,
  SOURCE,
  version as pluginVersion,
} from '../lib/index.js';
import { CORRECTIONS, verifyCorrections } from '../tools/apply-corrections.mjs';

const results = [];
async function check(label, fn) {
  try {
    await fn();
    results.push(`PASS  ${label}`);
  } catch (error) {
    results.push(`FAIL  ${label} :: ${error.message}`);
  }
}

const tick = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

/** Build a fake Cordis context exposing exactly the services given. */
function fakeContext(services = {}) {
  const warnings = [];
  const infos = [];
  const disposers = [];
  const ctx = {
    logger: {
      warn: (message) => warnings.push(String(message)),
      info: (message) => infos.push(String(message)),
    },
    get: (name) => services[name],
    inject: (dependencies, mount) => {
      for (const dependency of dependencies) {
        if (services[dependency] !== undefined) mount({ [dependency]: services[dependency] });
      }
    },
    effect: (factory) => {
      const cleanup = factory();
      if (typeof cleanup === 'function') disposers.push(cleanup);
    },
  };
  return { ctx, warnings, infos, disposers };
}

function fakeSkills(catalog) {
  const registered = [];
  return {
    registered,
    service: {
      list: async () => catalog,
      register: (definition) => {
        registered.push(definition);
        return () => {
          const index = registered.indexOf(definition);
          if (index >= 0) registered.splice(index, 1);
        };
      },
    },
  };
}

/** The model-facing contract for one registration. */
function assertRegistrationContract(registration) {
  assert.ok(SKILL_NAMES.includes(registration.name), `${registration.name}: not a bundled skill`);
  assert.equal(typeof registration.description, 'string');
  assert.ok(registration.description.length > 20, `${registration.name}: description is too short`);
  assert.equal(typeof registration.source, 'string', 'source must be a string (load path rejects it otherwise)');
  assert.ok(registration.source.length > 0, 'source is empty');
  assert.equal(typeof registration.content, 'string');
  assert.ok(registration.content.length > 500, `${registration.name}: body is suspiciously short`);
  assert.ok(!registration.content.includes('{{'), `${registration.name}: content has a template token`);
  assert.equal(registration.resourceBase?.kind, 'directory', 'resourceBase.kind must be directory');
  assert.equal(registration.resourceBase?.path, join(SKILLS_DIR, registration.name), 'resourceBase must be the skill directory');
  assert.ok(existsSync(join(registration.resourceBase.path, 'SKILL.md')), 'resourceBase has no SKILL.md');
}

// 1. No services and no inject(): warn, never throw.
await check('mount without services or inject is a graceful skip', () => {
  const warnings = [];
  const ctx = { logger: { warn: (message) => warnings.push(String(message)) } };
  apply(ctx, {});
  assert.ok(warnings.some((line) => line.includes('skills service is not mounted')), 'expected a skills warning');
});

// 2. A context that only offers inject() waits for a late skills mount.
await check('mount with inject() registers all eight skills once skills arrives', async () => {
  const skills = fakeSkills([]);
  let mountLate;
  const ctx = {
    logger: { warn() {}, info() {} },
    inject: (dependencies, mount) => {
      assert.deepEqual(dependencies, ['skills']);
      mountLate = mount;
    },
    effect: () => {},
  };
  apply(ctx, {});
  mountLate({ skills: skills.service });
  await tick();
  assert.equal(skills.registered.length, 8, `expected 8 registrations, got ${skills.registered.length}`);
});

// 3. Empty catalog: eight runtime registrations with the full contract.
await check('empty catalog registers the eight runtime skills', async () => {
  const skills = fakeSkills([]);
  const { ctx, warnings } = fakeContext({ skills: skills.service });
  apply(ctx, {});
  await tick();
  assert.equal(skills.registered.length, 8, `expected 8 registrations, got ${skills.registered.length}`);
  assert.deepEqual(skills.registered.map((skill) => skill.name).sort(), [...SKILL_NAMES].sort());
  for (const registration of skills.registered) assertRegistrationContract(registration);
  assert.deepEqual(warnings, [], 'no warning is expected on the clean path');
});

// 4. Another runtime registration owns one name: skip it, keep the other seven.
await check('a runtime duplicate is skipped with one warning', async () => {
  const skills = fakeSkills([{ name: 'gsap-core', provider: 'runtime', source: SOURCE }]);
  const { ctx, warnings } = fakeContext({ skills: skills.service });
  apply(ctx, {});
  await tick();
  assert.equal(skills.registered.length, 7, `expected 7 registrations, got ${skills.registered.length}`);
  assert.ok(!skills.registered.some((skill) => skill.name === 'gsap-core'), 'the runtime-owned name must not register');
  assert.equal(warnings.length, 1, `expected exactly one warning, got ${warnings.length}`);
  assert.ok(warnings[0].includes('already registered by another bundle'), 'warning must explain the runtime duplicate');
});

// 5. A filesystem provider owns a name: still register, but warn about the layer rule.
await check('a filesystem copy does not block registration but warns about scoping', async () => {
  const skills = fakeSkills([{ name: 'gsap-core', provider: 'user-agents', source: 'user-agents' }]);
  const { ctx, warnings } = fakeContext({ skills: skills.service });
  apply(ctx, {});
  await tick();
  assert.equal(skills.registered.length, 8, 'the bundle must still register over the filesystem copy');
  assert.ok(skills.registered.some((skill) => skill.name === 'gsap-core'), 'gsap-core must still register');
  assert.equal(warnings.length, 1, `expected exactly one warning, got ${warnings.length}`);
  assert.ok(warnings[0].includes('preset-scoped'), 'warning must explain the preset-scoped layer rule');
  assert.ok(warnings[0].includes('remove the file-level copy'), 'warning must say how to fix it');
});

// 6. A failed catalog read never disables registration.
await check('catalog listing failure falls back to blind registration', async () => {
  const registered = [];
  const broken = {
    list: async () => {
      throw new Error('provider exploded');
    },
    register: (definition) => {
      registered.push(definition);
      return () => {};
    },
  };
  const { ctx, warnings } = fakeContext({ skills: broken });
  apply(ctx, {});
  await tick();
  assert.equal(registered.length, 8, 'all eight skills must register when the catalog read fails');
  assert.ok(warnings.some((line) => line.includes('duplicate detection skipped')), 'expected a detection warning');
});

// 7. Cleanup releases every registration.
await check('cleanup releases the captured registrations', async () => {
  const skills = fakeSkills([]);
  const { ctx, disposers } = fakeContext({ skills: skills.service });
  apply(ctx, {});
  await tick();
  assert.equal(skills.registered.length, 8);
  assert.ok(disposers.length >= 1, 'apply must register a cleanup effect');
  for (const cleanup of disposers) cleanup();
  assert.equal(skills.registered.length, 0, 'cleanup should release all skill registrations');
});

// 8. Teardown while the catalog read is in flight must not register afterwards.
await check('dispose before the catalog resolves does not register', async () => {
  const registered = [];
  let resolveCatalog;
  const service = {
    list: () =>
      new Promise((resolve) => {
        resolveCatalog = resolve;
      }),
    register: (definition) => {
      registered.push(definition);
      return () => {};
    },
  };
  const { ctx, disposers } = fakeContext({ skills: service });
  apply(ctx, {});
  await tick(0);
  assert.equal(disposers.length, 1, 'cleanup effect must exist before the catalog resolves');
  disposers[0]();
  resolveCatalog([{ name: 'gsap-core', provider: 'user-agents', source: 'user-agents' }]);
  await tick();
  assert.equal(registered.length, 0, 'a disposed plugin must not register after teardown');
});

// 9. Frontmatter and body: all eight load, llms.txt ships, no template tokens.
await check('all eight vendored SKILL.md files parse and llms.txt ships', () => {
  for (const skillName of SKILL_NAMES) {
    const definition = loadSkillDefinition(skillName);
    assert.equal(definition.name, skillName);
    assert.ok(definition.description.length > 20, `${skillName}: description too short`);
    assert.ok(definition.content.length > 500, `${skillName}: body too short`);
    assert.ok(!definition.content.includes('{{'), `${skillName}: body has a template token`);
  }
  assert.ok(existsSync(join(SKILLS_DIR, 'llms.txt')), 'skills/llms.txt is missing');
  assert.ok(readFileSync(join(SKILLS_DIR, 'llms.txt'), 'utf8').trim().length > 0, 'skills/llms.txt is empty');
  const parsed = parseSkillMarkdown(['---', 'name: demo', 'description: >', '  folded', 'license: MIT', '---', 'body'].join('\n'));
  assert.equal(parsed.data.name, 'demo');
  assert.equal(parsed.data.description, 'folded');
  assert.equal(parsed.body, 'body');
});

// 10. Mutation-style assertion: undoing a correction must fail verification.
await check('mutation: an un-applied correction fails the correction gate', () => {
  const core = readFileSync(join(SKILLS_DIR, 'gsap-core', 'SKILL.md'), 'utf8');
  const wrongOrder = 'translation → scale → rotationX/Y → skew → rotation';
  const rightOrder = 'translation → rotation → rotationY → rotationX → skew → scale';
  assert.ok(core.includes(rightOrder), 'the corrected transform order must be present in the vendored file');
  const mutated = new Map([['skills/gsap-core/SKILL.md', core.replace(rightOrder, wrongOrder)]]);
  assert.throws(
    () =>
      verifyCorrections((file) =>
        mutated.has(file) ? mutated.get(file) : readFileSync(join(SKILLS_DIR, '..', file), 'utf8'),
      ),
    /uncorrected text still present|corrected text missing/,
    'the mutated file must be rejected',
  );
  assert.equal(verifyCorrections(), CORRECTIONS.length, 'the real tree must pass verification');
});

// 11. Module surface: plugin constants, no Config schema, no default class export.
await check('module surface matches the v1 contract (no Config export)', async () => {
  const module = await import('../lib/index.js');
  assert.equal(pluginName, 'gsap');
  assert.equal(pluginVersion, '1.0.1');
  assert.deepEqual(SKILL_NAMES, [
    'gsap-core',
    'gsap-timeline',
    'gsap-scrolltrigger',
    'gsap-plugins',
    'gsap-utils',
    'gsap-react',
    'gsap-frameworks',
    'gsap-performance',
  ]);
  assert.equal(typeof apply, 'function');
  assert.equal(typeof loadSkillDefinition, 'function');
  assert.ok(!('Config' in module), 'v1 must not export a Config schema');
  assert.ok(!('default' in module), 'the host half must not default-export a class');
});

for (const line of results) console.log(line);
const failed = results.filter((line) => line.startsWith('FAIL'));
if (failed.length > 0) {
  console.error(`\nhost-smoke: ${failed.length}/${results.length} failed`);
  process.exit(1);
}
console.log(`\nhost-smoke: ${results.length}/${results.length} passed`);
