#!/usr/bin/env node
// Playwright playtest driver. Runs a JSON list of steps against the game and
// saves screenshots of the canvas.
//
//   node tools/shot.mjs steps.json            (server must be running)
//   node tools/shot.mjs --inline '[{"wait":800},{"shot":"title.png"}]'
//
// Steps:
//   {"wait": ms}                    real-time wait
//   {"press": "KeyZ"}               tap a key (keydown, 1 frame, keyup) — use KeyboardEvent.code names
//   {"hold": "ArrowRight", "ms": 600}  hold a key
//   {"keys": ["KeyZ","KeyZ"], "gap": 150}  several taps
//   {"eval": "js expression"}       run in page (window.__game available)
//   {"shot": "file.png"}            screenshot canvas → shots dir
//   {"pause": true} / {"resume": true} / {"advance": ms}  deterministic stepping
//   {"waitFor": "js predicate", "timeout": ms}
// Options: --base http://127.0.0.1:5173/  --out shots/  --scale 3  --query "?x=y"

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
let steps;
if (args.includes('--inline')) steps = JSON.parse(opt('--inline'));
else steps = JSON.parse(fs.readFileSync(args.find((a) => !a.startsWith('--') && a.endsWith('.json')), 'utf8'));
const base = opt('--base', 'http://127.0.0.1:5173/');
const outDir = opt('--out', 'shots');
const scale = Number(opt('--scale', '3'));
const query = opt('--query', '');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 384 * scale, height: 216 * scale }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`));
await page.goto(base + query, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
await page.waitForTimeout(300);

const sleep = (ms) => page.waitForTimeout(ms);
// Vite HMR may reload the page while other work is in progress: re-wait for the game.
let reloaded = false;
page.on('framenavigated', (f) => {
  if (f === page.mainFrame()) reloaded = true;
});
reloaded = false;
for (const s of steps) {
  if (reloaded) {
    reloaded = false;
    console.log('(page reloaded — waiting for __game again)');
    await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 }).catch(() => {});
    await sleep(300);
  }
  if (s.wait) await sleep(s.wait);
  if (s.press) {
    await page.keyboard.down(s.press);
    await sleep(s.ms ?? 50);
    await page.keyboard.up(s.press);
    await sleep(s.after ?? 30);
  }
  if (s.hold) {
    await page.keyboard.down(s.hold);
    await sleep(s.ms ?? 300);
    await page.keyboard.up(s.hold);
  }
  if (s.keys) {
    for (const k of s.keys) {
      await page.keyboard.down(k);
      await sleep(50);
      await page.keyboard.up(k);
      await sleep(s.gap ?? 120);
    }
  }
  if (s.eval) {
    const r = await page.evaluate(s.eval);
    if (r !== undefined) console.log('eval →', JSON.stringify(r)?.slice(0, 2000));
  }
  if (s.waitFor) await page.waitForFunction(s.waitFor, null, { timeout: s.timeout ?? 10000 });
  if (s.pause) await page.evaluate(() => window.__game.pause());
  if (s.resume) await page.evaluate(() => window.__game.resume());
  if (s.advance) await page.evaluate((ms) => window.__game.advance(ms), s.advance);
  if (s.shot) {
    const file = path.join(outDir, s.shot);
    await page.locator('#screen').screenshot({ path: file });
    console.log('shot →', file);
  }
}
const errs = logs.filter((l) => l.includes('error') || l.includes('pageerror') || l.includes('warn'));
if (errs.length) console.log('--- console (errors/warnings) ---\n' + errs.join('\n'));
await browser.close();
