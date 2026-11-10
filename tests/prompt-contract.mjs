#!/usr/bin/env node
/**
 * Deterministic contract checker for GSAP demo/GIF prompts.
 *
 *   node tests/prompt-contract.mjs <file-or-dir...>
 *
 * It reads .js/.mjs/.jsx/.ts/.tsx/.html files (inline <script> blocks in
 * HTML) and applies
 * these heuristics, kept deliberately simple and documented in
 * demo/PROMPTS.md:
 *
 * - FAIL: a layout property (width, height, top, left, right, bottom, margin*)
 *   appears inside the vars object of a gsap.to/from/fromTo/set call (or a
 *   chained .to/.from/.fromTo/.set call).
 * - FAIL: animation calls exist but the file never mentions gsap.matchMedia()
 *   or prefers-reduced-motion.
 * - FAIL: ScrollTrigger is used without gsap.registerPlugin(ScrollTrigger) in
 *   the same file/script block.
 * - FAIL: animation calls exist but none of ctx/context/mm.revert(),
 *   useGSAP(, or .kill( appears (no cleanup path).
 * - WARN: `opacity:` appears in a vars object without `autoAlpha` in the same
 *   script (prefer autoAlpha so hidden elements do not receive clicks).
 *
 * These are heuristics, not a JS parser: calls are found with a comment-
 * stripped regex and a bracket matcher that respects quotes; a file that
 * generates animation code dynamically can therefore slip through. The
 * contract is still useful because prompt output is ordinary static demo code.
 *
 * Exit 0 = all files pass (warnings allowed); 1 = at least one FAIL.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.jsx', '.ts', '.tsx', '.html']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'assets']);

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}

function collectFiles(target) {
  const stat = statSync(target, { throwIfNoEntry: false });
  if (stat === undefined) throw new Error(`no such file or directory: ${target}`);
  if (stat.isFile()) return CODE_EXTENSIONS.has(extname(target)) ? [target] : [];
  const files = [];
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const path = join(target, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(path));
    else if (CODE_EXTENSIONS.has(extname(path))) files.push(path);
  }
  return files;
}

/** Split a call's argument text on top-level commas (strings respected). */
function splitArguments(text) {
  const args = [];
  let current = '';
  let depth = 0;
  let quote = '';
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quote !== '') {
      current += character;
      if (character === '\\') {
        current += text[index + 1] ?? '';
        index += 1;
      } else if (character === quote) {
        quote = '';
      }
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      current += character;
      continue;
    }
    if ('({['.includes(character)) depth += 1;
    if (')}]'.includes(character)) depth -= 1;
    if (character === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim() !== '') args.push(current.trim());
  return args;
}

/** Return every tween/set call with its split arguments. */
function findTweenCalls(text) {
  const pattern = /\bgsap\s*\.\s*(to|from|fromTo|set)\s*\(|(?<![.\w$])\.\s*(to|from|fromTo|set)\s*\(/g;
  const calls = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const action = match[1] ?? match[2];
    let depth = 1;
    let quote = '';
    let index = pattern.lastIndex;
    let end = -1;
    for (; index < text.length; index += 1) {
      const character = text[index];
      if (quote !== '') {
        if (character === '\\') index += 1;
        else if (character === quote) quote = '';
        continue;
      }
      if (character === "'" || character === '"' || character === '`') {
        quote = character;
        continue;
      }
      if (character === '(') depth += 1;
      if (character === ')') {
        depth -= 1;
        if (depth === 0) {
          end = index;
          break;
        }
      }
    }
    if (end < 0) continue;
    calls.push({ action, args: splitArguments(text.slice(pattern.lastIndex, end)) });
    pattern.lastIndex = end + 1;
  }
  return calls;
}

const LAYOUT = /(?:^|[,{]\s*)(width|height|top|left|right|bottom|margin(?:Top|Right|Bottom|Left|Block|Inline|BlockStart|BlockEnd|InlineStart|InlineEnd)?)\s*:/;
const OPACITY = /(?:^|[,{]\s*)opacity\s*:/;

function analyzeScript(name, source, findings) {
  const text = stripComments(source);
  const calls = findTweenCalls(text);
  if (calls.length === 0) {
    findings.push({ level: 'pass', name, message: 'no animation calls' });
    return;
  }

  const layoutHits = [];
  let usesOpacity = false;
  for (const call of calls) {
    const vars = call.args.slice(1).find((argument) => argument.startsWith('{'));
    if (vars === undefined) continue;
    const layout = LAYOUT.exec(vars);
    if (layout !== null) layoutHits.push(`${layout[1]} in ${call.action}()`);
    if (OPACITY.test(vars)) usesOpacity = true;
  }

  const scrollTrigger = /ScrollTrigger\s*\.|\bscrollTrigger\s*:/.test(text);
  const registered = /registerPlugin\s*\([^)]*ScrollTrigger/.test(text);
  const reducedMotion = /matchMedia\s*\(|prefers-reduced-motion/.test(text);
  const cleanup = /(?:ctx|context|mm|matchMediaContext)\s*\.\s*revert\s*\(|useGSAP\s*\(|\.kill\s*\(/.test(text);
  const autoAlpha = /\bautoAlpha\s*:/.test(text);

  const failures = [];
  if (layoutHits.length > 0) failures.push(`animates layout properties (${layoutHits.join(', ')}); use transforms x/y/scale`);
  if (!reducedMotion) failures.push('animations without prefers-reduced-motion/matchMedia');
  if (scrollTrigger && !registered) failures.push('ScrollTrigger used without gsap.registerPlugin(ScrollTrigger)');
  if (!cleanup) failures.push('animations without a cleanup path (ctx.revert/mm.revert/useGSAP/.kill)');

  if (failures.length > 0) {
    findings.push({ level: 'fail', name, message: `${calls.length} animation calls; ${failures.join('; ')}` });
    return;
  }
  if (usesOpacity && !autoAlpha) {
    findings.push({ level: 'warn', name, message: 'opacity in tween vars; prefer autoAlpha so hidden elements are not clickable' });
    return;
  }
  findings.push({
    level: 'pass',
    name,
    message: `${calls.length} animation calls; reduced-motion, cleanup${scrollTrigger ? ', ScrollTrigger registration' : ''} present`,
  });
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('usage: node tests/prompt-contract.mjs <file-or-dir...>');
  process.exit(2);
}

const findings = [];
const files = [];
for (const target of targets) files.push(...collectFiles(target));
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  if (extname(file) !== '.html') {
    analyzeScript(file, content, findings);
    continue;
  }
  const scripts = [...content.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  if (scripts.length === 0) {
    findings.push({ level: 'pass', name: file, message: 'no inline animation script' });
    continue;
  }
  scripts.forEach((match, index) => analyzeScript(`${file}#script${index + 1}`, match[1], findings));
}

for (const finding of findings) {
  console.log(`${finding.level.toUpperCase()}  ${finding.name} :: ${finding.message}`);
}
const failures = findings.filter((finding) => finding.level === 'fail');
const warnings = findings.filter((finding) => finding.level === 'warn');
const passes = findings.filter((finding) => finding.level === 'pass');
console.log(`\nprompt-contract: ${files.length} files, ${passes.length} pass, ${warnings.length} warn, ${failures.length} fail`);
process.exit(failures.length === 0 ? 0 : 1);
