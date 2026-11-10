#!/usr/bin/env node
/**
 * Real-browser smoke test for demo/index.html.
 *
 * Zero npm dependencies: Node >= 22 built-ins only (`node:http`, `node:fs`,
 * `node:child_process`, global `fetch`, global `WebSocket`). The test serves
 * `demo/` itself (no python), launches headless Chrome with a CDP endpoint,
 * and drives Chrome DevTools Protocol directly.
 *
 * It checks:
 *   1. desktop: GSAP loads, the hero elements animate to visible, no uncaught
 *      exceptions;
 *   2. the eight skill cards reveal when scrolled into view;
 *   3. the pinned strip stays at viewport top while pinned, the track moves
 *      monotonically negative, the progress bar grows 0 → ~1, then releases;
 *   4. reduced motion: no ScrollTrigger is created and content is visible;
 *   5. CDN + fonts blocked: no GSAP, all content visible, no uncaught errors;
 *   6. mobile 390x844: no horizontal overflow, no pin triggers, cards reveal.
 *
 * Chrome lookup (first hit wins): $CHROME_BIN, macOS Google Chrome, then the
 * `google-chrome`, `chromium`, `chromium-browser` commands. If nothing is
 * found the test prints `demo-smoke: SKIP (no Chrome found)` and exits 0 —
 * SKIP is not verification.
 *
 *   node tests/demo-smoke.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMO_DIR = fileURLToPath(new URL('../demo/', import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'google-chrome',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate.includes('/')) {
      if (existsSync(candidate)) return candidate;
      continue;
    }
    const probe = spawnSync(candidate, ['--version'], { stdio: 'ignore', timeout: 10_000 });
    if (probe.status === 0) return candidate;
  }
  return undefined;
}

function startServer() {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };
  const server = createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const file = normalize(join(DEMO_DIR, relative));
      if (!file.startsWith(normalize(DEMO_DIR))) {
        response.writeHead(403).end('forbidden');
        return;
      }
      const body = readFileSync(file);
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

/** Minimal CDP client over Node's built-in WebSocket. */
class CDP {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const entry = this.pending.get(message.id);
        if (entry === undefined) return;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
        else entry.resolve(message.result);
        return;
      }
      const handlers = this.listeners.get(message.method) ?? [];
      for (const handler of handlers) handler(message.params);
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', () => reject(new Error('WebSocket connect failed')), { once: true });
    });
    return new CDP(socket);
  }

  on(method, handler) {
    const handlers = this.listeners.get(method) ?? [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.socket.close();
    } catch {
      /* already closed */
    }
  }
}

async function pageWebSocketUrl(port) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = targets.find((target) => target.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* Chrome is still starting */
    }
    await sleep(100);
  }
  throw new Error('Chrome did not expose a page target');
}

async function devtoolsPort(userDataDir) {
  const file = join(userDataDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (existsSync(file)) {
      const [port] = readFileSync(file, 'utf8').split('\n');
      if (port && Number(port) > 0) return Number(port);
    }
    await sleep(100);
  }
  throw new Error(`Chrome did not write ${file}`);
}

const results = [];
function record(ok, label, detail = '') {
  results.push({ ok, label, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` :: ${detail}`}`);
}
async function check(label, fn) {
  try {
    await fn();
    record(true, label);
  } catch (error) {
    record(false, label, error.message);
  }
}

const chrome = findChrome();
if (chrome === undefined) {
  console.log('demo-smoke: SKIP (no Chrome found)');
  console.log('SKIP is not verification: run this on a machine with Chrome.');
  process.exit(0);
}

let server;
let chromeProcess;
let userDataDir;
let cdp;
let exceptions = [];

try {
  const listening = await startServer();
  server = listening.server;
  const baseUrl = `http://127.0.0.1:${listening.port}/`;

  userDataDir = mkdtempSync(join(tmpdir(), 'dsh-gsap-demo-'));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-port=0',
    '--disable-dev-shm-usage',
  ];
  if (process.env.CI === 'true') args.push('--no-sandbox');
  args.push('about:blank');
  chromeProcess = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  chromeProcess.stderr.on('data', () => {});

  const port = await devtoolsPort(userDataDir);
  cdp = await CDP.connect(await pageWebSocketUrl(port));
  cdp.on('Runtime.exceptionThrown', (params) => {
    exceptions.push(params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text ?? 'exception');
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  const evaluate = async (expression) => {
    const result = await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    }
    return result.result.value;
  };
  const waitUntil = async (expression, timeout = 7000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try {
        if (await evaluate(expression)) return;
      } catch {
        /* execution context may still be loading */
      }
      await sleep(120);
    }
    throw new Error(`timed out waiting for: ${expression}`);
  };
  const navigate = async (url) => {
    exceptions = [];
    await cdp.send('Page.navigate', { url });
    await waitUntil('document.readyState === "complete"', 8000);
    await sleep(900);
  };
  const mount = async (width = 1440, height = 1000, mobile = false) => {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    });
  };
  const heroVisible = () =>
    `[...document.querySelectorAll('[data-hero-eyebrow],[data-hero-line],[data-hero-sub],.hero-actions .btn,.hero-stats li')].every((el) => { const s = getComputedStyle(el); return Number(s.opacity) > 0.99 && s.visibility === 'visible'; })`;
  const cardsVisible = () =>
    `[...document.querySelectorAll('.skill-card')].every((el) => Number(getComputedStyle(el).opacity) > 0.99)`;
  const heroCount = () =>
    `document.querySelectorAll('[data-hero-eyebrow],[data-hero-line],[data-hero-sub],.hero-actions .btn,.hero-stats li').length`;

  // 1. Desktop, normal load.
  await mount(1440, 1000, false);
  await cdp.send('Network.setBlockedURLs', { urls: [] });
  await cdp.send('Emulation.setEmulatedMedia', { features: [] });
  await navigate(baseUrl);
  await check('desktop: window.gsap loads from the pinned CDN', async () => {
    const version = await evaluate('window.gsap && window.gsap.version');
    if (!version) throw new Error('window.gsap is missing');
    if (!String(version).startsWith('3.15.')) throw new Error(`unexpected gsap version ${version}`);
  });
  await check('desktop: hero elements animate to visible', async () => {
    await waitUntil(heroVisible(), 7000);
    const count = await evaluate(heroCount());
    if (count !== 11) throw new Error(`expected 11 hero elements, found ${count}`);
  });
  await check('desktop: no uncaught exceptions', async () => {
    if (exceptions.length > 0) throw new Error(exceptions.join(' | '));
  });

  // 2. Card batch reveal.
  await check('desktop: the eight skill cards reveal on scroll', async () => {
    await evaluate("document.querySelector('#skills').scrollIntoView({ block: 'start' })");
    await waitUntil(cardsVisible(), 7000);
    const count = await evaluate("document.querySelectorAll('.skill-card').length");
    if (count !== 8) throw new Error(`expected 8 cards, found ${count}`);
  });

  // 3. Pin, scrubbed track and progress, then release.
  await check('desktop: pinned strip moves monotonically and releases', async () => {
    const range = await evaluate(`(() => {
      const trigger = ScrollTrigger.getAll().find((entry) => entry.pin);
      return trigger ? { start: trigger.start, end: trigger.end } : null;
    })()`);
    if (!range) throw new Error('no ScrollTrigger pin instance found');
    const samples = [];
    for (const ratio of [0.15, 0.5, 0.85]) {
      await evaluate(`window.scrollTo(0, ${Math.round(range.start + (range.end - range.start) * ratio)})`);
      await sleep(800);
      samples.push(
        await evaluate(`(() => {
          const section = document.querySelector('#pin-section');
          const track = document.querySelector('[data-pin-track]');
          const bar = document.querySelector('[data-pin-progress]');
          const matrix = (value) => (value.match(/matrix\\(([^)]+)\\)/)?.[1] ?? '').split(',').map(Number);
          const trackMatrix = matrix(getComputedStyle(track).transform);
          const barMatrix = matrix(getComputedStyle(bar).transform);
          const trigger = ScrollTrigger.getAll().find((entry) => entry.pin);
          return {
            top: section.getBoundingClientRect().top,
            x: trackMatrix[4] ?? 0,
            scaleX: barMatrix[0] ?? 0,
            progress: trigger ? trigger.progress : -1,
          };
        })()`),
      );
    }
    for (const [index, sample] of samples.entries()) {
      if (Math.abs(sample.top) > 2) throw new Error(`sample ${index}: section top ${sample.top}, expected ~0 while pinned`);
    }
    if (!(samples[1].x < samples[0].x && samples[2].x < samples[1].x)) {
      throw new Error(`track x is not monotonically negative: ${samples.map((s) => s.x).join(', ')}`);
    }
    if (!(samples[1].scaleX > samples[0].scaleX && samples[2].scaleX > samples[1].scaleX)) {
      throw new Error(`progress scaleX does not increase: ${samples.map((s) => s.scaleX).join(', ')}`);
    }
    if (!(samples[2].scaleX > 0.8)) throw new Error(`final progress scaleX ${samples[2].scaleX}, expected > 0.8`);

    await evaluate(`window.scrollTo(0, ${Math.round(range.end + 400)})`);
    await sleep(800);
    const released = await evaluate(`(() => {
      const section = document.querySelector('#pin-section');
      const trigger = ScrollTrigger.getAll().find((entry) => entry.pin);
      return { top: section.getBoundingClientRect().top, active: trigger ? trigger.isActive : null };
    })()`);
    if (!(released.top < -10)) throw new Error(`section did not release (top ${released.top})`);
    if (released.active === true) throw new Error('pin trigger is still active past its end');
  });

  // 4. Reduced motion.
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await navigate(baseUrl);
  await check('reduced motion: no ScrollTriggers are created', async () => {
    const count = await evaluate('window.ScrollTrigger ? ScrollTrigger.getAll().length : -1');
    if (count !== 0) throw new Error(`expected 0 ScrollTriggers, found ${count}`);
  });
  await check('reduced motion: hero and cards are visible immediately', async () => {
    if (!(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"))) {
      throw new Error('reduced-motion media query did not match');
    }
    await waitUntil(heroVisible(), 4000);
    await waitUntil(cardsVisible(), 4000);
  });

  // 5. CDN and fonts blocked.
  await cdp.send('Emulation.setEmulatedMedia', { features: [] });
  await cdp.send('Network.setBlockedURLs', {
    urls: ['*cdn.jsdelivr.net*', '*fonts.googleapis.com*'],
  });
  await navigate(baseUrl);
  await check('CDN blocked: no GSAP, content still visible, no uncaught errors', async () => {
    if (await evaluate('window.gsap')) throw new Error('window.gsap should be missing');
    await waitUntil('document.querySelectorAll(".skill-card").length === 8', 4000);
    const state = await evaluate(`(() => ({
      hero: [...document.querySelectorAll('[data-hero-line]')].every((el) => Number(getComputedStyle(el).opacity) > 0.99),
      cards: [...document.querySelectorAll('.skill-card')].every((el) => Number(getComputedStyle(el).opacity) > 0.99),
      pin: getComputedStyle(document.querySelector('#pin-section')).display !== 'none',
    }))()`);
    if (!state.hero || !state.cards || !state.pin) throw new Error(`content hidden: ${JSON.stringify(state)}`);
    if (exceptions.length > 0) throw new Error(exceptions.join(' | '));
  });

  // 6. Mobile layout.
  await cdp.send('Network.setBlockedURLs', { urls: [] });
  await mount(390, 844, true);
  await navigate(baseUrl);
  await check('mobile: no horizontal overflow and no pin triggers', async () => {
    await waitUntil('document.readyState === "complete"', 6000);
    const state = await evaluate(`(() => ({
      overflow: document.scrollingElement.scrollWidth - innerWidth,
      pins: window.ScrollTrigger ? ScrollTrigger.getAll().filter((entry) => entry.pin).length : 0,
    }))()`);
    if (state.overflow > 1) throw new Error(`horizontal overflow ${state.overflow}px`);
    if (state.pins !== 0) throw new Error(`expected 0 pin triggers, found ${state.pins}`);
  });
  await check('mobile: cards reveal when scrolled into view', async () => {
    // Four stacked rows do not all fit at once, so scroll through the section;
    // the batch triggers fire as each row enters and stay revealed.
    await evaluate(`(() => {
      const skills = document.querySelector('#skills');
      window.scrollTo(0, skills.offsetTop + skills.offsetHeight - innerHeight + 24);
    })()`);
    await waitUntil(cardsVisible(), 7000);
  });
} catch (error) {
  console.error(`demo-smoke: fatal: ${error.message}`);
  results.push({ ok: false, label: 'harness', detail: error.message });
} finally {
  cdp?.close();
  if (chromeProcess && chromeProcess.exitCode === null) chromeProcess.kill('SIGKILL');
  if (server) await new Promise((resolve) => server.close(resolve));
  await sleep(150);
  if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
}

const failed = results.filter((entry) => !entry.ok);
if (failed.length > 0) {
  console.error(`\ndemo-smoke: ${results.length - failed.length}/${results.length} passed, ${failed.length} failed`);
  process.exit(1);
}
console.log(`\ndemo-smoke: ${results.length}/${results.length} passed`);
process.exit(0);
