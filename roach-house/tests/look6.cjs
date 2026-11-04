// 第5回会議で足したもの（粘着シート・クモ・駆除業者・電話・薬をまいた株）の見た目確認
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const page = await b.newPage({ viewport: { width: 960, height: 600 } });
  page.setDefaultTimeout(300000);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:8765/index.html?q=low');
  await page.waitForFunction(() => window.__rh && window.__rh.game);
  const frames = (n) => page.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const shot = async (name) => { await frames(3); await page.screenshot({ path: `${out}/r-${name}.png` }); console.log('shot', name); };
  const onTrough = (x, z) => page.evaluate(([x, z]) => {
    const RH = window.__rh, g = RH.game;
    const row = RH.rows.reduce((a, r) => (Math.abs(r.z - z) < Math.abs(a.z - z) ? r : a), RH.rows[0]);
    Object.assign(g.player, { x, z: row.z, surface: 3 + RH.rows.indexOf(row), y: 1.48, st: 'move', h: Math.PI / 2 });
    g.farmer.x = 19; g.farmer.z = 12; g.farmer.timer = 999; g.farmer.state = 'WORK'; g.farmer.phase = 'idle';
    RH.cam.yaw = Math.PI / 2; RH.cam.init = true;
  }, [x, z]);
  await page.evaluate(() => { document.getElementById('optTutor').checked = false; window.__rh.startGame('s4'); });
  const sh = await page.evaluate(() => { const s = window.__rh.game.sheets[0]; return [s.x, s.z]; });
  await onTrough(sh[0] - 1.6, sh[1]);
  await frames(12);
  await shot('sheet');
  const sp = await page.evaluate(() => { const s = window.__rh.game.spiders[0]; return [s.x, s.z]; });
  await onTrough(sp[0] - 2.2, sp[1]);
  await frames(12);
  await shot('spider');
  // 薬をまいた株
  await page.evaluate(() => { const g = window.__rh.game; g.sprayPlants(g.player.x + 1.5, g.player.z); });
  await frames(6);
  await shot('sprayed');
  // 電話
  await page.evaluate(() => {
    const RH = window.__rh, g = RH.game, F = g.farmer;
    Object.assign(F, { state: 'WORK', phase: 'choose', x: 13, z: 2.4, h: -Math.PI / 2 });
    F.phoneNext = 0;
    Object.assign(g.player, { x: 8.5, z: 2.4, surface: -1, y: 0, st: 'move', h: Math.PI / 2 });
    RH.cam.yaw = Math.PI / 2; RH.cam.init = true;
  });
  await frames(30);
  await shot('phone');
  // 駆除業者
  await page.evaluate(() => {
    const RH = window.__rh; RH.startGame('s5'); const g = RH.game;
    const P = g.player; Object.assign(P, { x: -16, z: -12.5, surface: -1, y: 0 });
    for (let k = 0; k < 9; k++) { g.nutrition = 100; g.tryLayEgg(P); P.x += 0.3; }
    for (const e of [...g.eggs]) g.hatch(e);
    RH.sim(25, 1 / 30, (gg, i) => { i.mx = 0; i.mz = 0; gg.farmer.timer = 999; });
    const E = g.exterm;
    if (E && E.m) { Object.assign(P, { x: E.x - 4, z: E.z + 1.5, surface: -1, y: 0, st: 'move' }); RH.cam.yaw = Math.atan2(E.x - P.x, E.z - P.z); RH.cam.init = true; }
  });
  await frames(12);
  await shot('exterm');
  console.log('ERRORS', errors.length, errors.join('\n'));
  await b.close();
})();
