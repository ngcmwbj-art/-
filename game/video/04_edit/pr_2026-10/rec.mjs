// node rec.mjs scenes.json outDir [onlyName,...]
// scene: { name, setup:[steps], frames:N, fps:30, keys:[{f, down|up|tap}], evalAt:[{f, js}] }
import { chromium } from '/home/user/-/game/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const [,, file, outDir, only] = process.argv;
const scenes = JSON.parse(fs.readFileSync(file, 'utf8')).filter((s) => !only || only.split(',').includes(s.name));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const sc of scenes) {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const logs = [];
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
  await page.goto('http://127.0.0.1:5173/' + (sc.query ?? ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 20000 });
  await page.waitForTimeout(400);
  const sleep = (ms) => page.waitForTimeout(ms);
  for (const s of sc.setup ?? []) {
    if (s.wait) await sleep(s.wait);
    if (s.eval) { const r = await page.evaluate(s.eval).catch((e) => 'ERR ' + e.message); if (r !== undefined) console.log(sc.name, 'eval →', JSON.stringify(r)?.slice(0, 300)); }
    if (s.press) { await page.keyboard.down(s.press); await sleep(60); await page.keyboard.up(s.press); await sleep(s.after ?? 60); }
    if (s.hold) { await page.keyboard.down(s.hold); await sleep(s.ms ?? 300); await page.keyboard.up(s.hold); }
    if (s.waitFor) await page.waitForFunction(s.waitFor, null, { timeout: s.timeout ?? 10000 }).catch(() => console.log(sc.name, 'waitFor timeout', s.waitFor));
  }
  const dir = path.join(outDir, sc.name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const n = sc.frames ?? 1;
  const dt = 1000 / (sc.fps ?? 30);
  await page.evaluate(() => window.__game.pause());
  for (let i = 0; i < n; i++) {
    for (const k of (sc.keys ?? []).filter((k) => k.f === i)) {
      if (k.down) await page.keyboard.down(k.down);
      if (k.up) await page.keyboard.up(k.up);
    }
    for (const e of (sc.evalAt ?? []).filter((e) => e.f === i)) await page.evaluate(e.js).catch((er) => console.log('evalAt err', er.message));
    await page.evaluate((ms) => window.__game.advance(ms), dt);
    const url = await page.evaluate(() => document.querySelector('#screen').toDataURL('image/png'));
    fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  if (logs.length) console.log(sc.name, logs.join('\n'));
  console.log('done', sc.name, n);
  await page.close();
}
await browser.close();
