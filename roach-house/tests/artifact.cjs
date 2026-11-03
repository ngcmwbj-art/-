// 1ファイル版（dist/artifact.html）が動くか。CDN の three.js は同じ版の手もとのファイルで代用して確かめる
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const root = path.join(__dirname, '..');
  const body = fs.readFileSync(path.join(root, 'dist/artifact.html'), 'utf8');
  const page0 = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>${body}</body></html>`;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|fonts\.g/.test(m.text())) errors.push(m.text()); });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'vendor/three.module.min.js')) }));
  await page.route('https://artifact.test/', (r) => r.fulfill({ contentType: 'text/html', body: page0 }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { try { localStorage.setItem('roachhouse.quality', '"low"'); } catch (_) {} });
  await page.goto('https://artifact.test/');
  page.setDefaultTimeout(120000);
  await page.waitForFunction(() => window.__rh && window.__rh.game, null, { timeout: 120000 });
  await page.click('[data-diff="s1"]');
  await page.waitForTimeout(1500);
  const bad = await page.evaluate(() => window.__rh.sim(60, 1 / 30, (g, i) => { i.mx = 0.3; i.mz = 1; }));
  await page.waitForTimeout(500);
  if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
  console.log('state', await page.evaluate(() => window.__rh.game.state), 'sanity', JSON.stringify(bad));
  console.log('ERRORS', errors.length, errors.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
