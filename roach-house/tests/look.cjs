// 画質「高」の見た目確認（ソフト描画なので時間がかかる）
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const Q = process.env.Q || 'high';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: Number(process.env.W || 960), height: Number(process.env.H || 540) } });
  page.setDefaultTimeout(240000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://localhost:8765/index.html?q=${Q}`);
  await page.waitForFunction(() => window.__rh && window.__rh.game);
  const frames = (n) => page.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const scenes = (process.env.SCENES || 'rows,table,farmer,crate').split(',');
  if (scenes.includes('wide')) {
    await page.evaluate(() => { document.getElementById('title').hidden = true; });
    await frames(3);
    await page.screenshot({ path: `${out}/look-${Q}-wide.png` });
    console.log('shot wide');
  }
  await page.evaluate(() => { window.__rh.startGame('normal'); document.getElementById('hint').hidden = true; });
  for (const sc of scenes.filter((x) => x !== 'wide')) {
    await page.evaluate((sc) => {
      const g = window.__rh.game, p = g.player, f = g.farmer;
      f.state = 'WORK'; f.phase = 'idle'; f.timer = 999;
      if (sc === 'rows') { p.x = -9; p.z = 2.4; p.surface = -1; p.y = 0; g.camYaw = Math.PI / 2 + 0.5; f.x = 2; f.z = 2.5; f.h = -Math.PI / 2; }
      if (sc === 'table') { p.x = 11.9; p.z = -8.85; p.surface = 0; p.y = 2.2; g.camYaw = 0.6; f.x = 15; f.z = -4.5; f.h = Math.PI; }
      if (sc === 'farmer') { p.x = 8.5; p.z = 2.6; p.surface = -1; p.y = 0; g.camYaw = Math.PI / 2; f.x = 11.5; f.z = 2.8; f.h = -Math.PI / 2; }
      if (sc === 'pepper') { const c = g.crates[1]; p.x = c.x - 0.2; p.z = c.z - 0.62; p.surface = 0; p.y = 2.2; g.camYaw = 0.25; f.x = 19; f.z = 12; window.__rh.cam.pitch = 0.75; }
      if (sc === 'plant') { p.x = -6; p.z = 2.4; p.surface = -1; p.y = 0; g.camYaw = Math.PI; f.x = 19; f.z = 12; window.__rh.cam.pitch = 0.05; }
      if (sc === 'crate') { const c = g.crates[13]; p.x = c.x - 1.0; p.z = c.z - 0.75; p.surface = -1; p.y = 0; g.camYaw = 0.9; f.x = 15; f.z = 9; }
      window.__rh.cam.yaw = g.camYaw; window.__rh.cam.init = true;
    }, sc);
    await page.evaluate(() => { /* カメラの向きを反映 */ });
    await frames(4);
    await page.screenshot({ path: `${out}/look-${Q}-${sc}.png` });
    console.log('shot', sc);
  }
  console.log('ERRORS', errors.length, errors.slice(0, 5).join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
