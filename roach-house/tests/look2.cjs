// 新しく足した画面の見た目確認
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const page = await b.newPage({ viewport: { width: Number(process.env.W || 960), height: Number(process.env.H || 600) } });
  page.setDefaultTimeout(300000);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:8765/index.html?q=' + (process.env.Q || 'low'));
  await page.waitForFunction(() => window.__rh && window.__rh.game);
  const frames = (n) => page.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const shot = async (name) => { await frames(3); await page.screenshot({ path: `${out}/n-${name}.png` }); console.log('shot', name); };
  await shot('title');
  // 練習
  await page.evaluate(() => { document.getElementById('optTutor').checked = true; window.__rh.startGame('normal'); });
  await page.evaluate(() => { const g = window.__rh.game; g.tutorial.step = 2; });
  await shot('tutor');
  // 毒エサと端の矢印
  await page.evaluate(() => {
    const g = window.__rh.game; g.endTutorial(false);
    const bt = g.baits[0]; Object.assign(g.player, { x: bt.x - 0.9, z: bt.z, surface: -1, y: 0, h: Math.PI / 2 });
    window.__rh.cam.yaw = Math.PI / 2; window.__rh.cam.init = true;
    g.farmer.x = -15; g.farmer.z = 12.5; g.farmer.state = 'CHASE'; g.farmer.target = g.player;
  });
  await shot('bait-arrow');
  // ナイス
  await page.evaluate(() => { const g = window.__rh.game; g.niceT = 0.9; g.player.greed = 70; g.player.eatingCrate = g.crates[13]; });
  await frames(2);
  await shot('nice');
  // 栽培槽の上で実
  await page.evaluate(() => {
    const g = window.__rh.game, RH = window.__rh;
    const fr = RH.plantFruits.filter((f) => f.alive && f.y < 2.3 && f.x < -3)[0];
    const row = RH.rows.find((r) => Math.abs(r.z - fr.z) < 1);
    g.farmer.state = 'WORK'; g.farmer.phase = 'idle'; g.farmer.timer = 999; g.farmer.x = 19; g.farmer.z = 9.5;
    Object.assign(g.player, { x: fr.x - 0.3, z: Math.max(row.minZ + 0.1, Math.min(row.maxZ - 0.1, fr.z)), surface: 3 + RH.rows.indexOf(row), y: 1.48, h: Math.PI / 2 });
    RH.cam.yaw = Math.PI / 2 + 0.4; RH.cam.init = true;
  });
  await shot('trough');
  // 燻煙剤
  await page.evaluate(() => {
    const g = window.__rh.game;
    Object.assign(g.player, { x: -12, z: -2.5, surface: -1, y: 0 });
    g.farmer.anger = 3; for (let k = 0; k < 4; k++) g.ruinCrate(g.crates[k]);
    g.startFumigation(); g.farmer.x = -6; g.farmer.z = -2.5; g.farmer.fum.phase = 'placing'; g.farmer.fum.t = 9;
  });
  await page.evaluate(() => window.__rh.sim(14, 1 / 20, (gg, i) => { i.mx = 0; i.mz = 0; }));
  await page.evaluate(() => { window.__rh.cam.yaw = -Math.PI / 2; window.__rh.cam.init = true; });
  await shot('smoke');
  // 結果画面
  await page.evaluate(() => { const g = window.__rh.game; g.snap('panic', '農場主の顔に飛びついた！'); });
  await frames(2);
  await page.evaluate(() => { const g = window.__rh.game; g.stats.attacks = 2; g.stats.fruits = 1; for (let k = 4; k < 8; k++) g.ruinCrate(g.crates[k]); });
  await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 120000 });
  await shot('result');
  await page.evaluate(() => { document.getElementById('btnTitle2').click(); document.getElementById('btnBook').click(); });
  await shot('book');
  console.log('ERRORS', errors.length, errors.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
