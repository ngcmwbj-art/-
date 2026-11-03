// 第2回会議で足したもの（夜・ネコ・検品・ボタンの輪・星・自己ベスト・波紋）の見た目確認
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const page = await b.newPage({ viewport: { width: Number(process.env.W || 960), height: Number(process.env.H || 600) }, hasTouch: !!process.env.TOUCH });
  page.setDefaultTimeout(300000);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:8765/index.html?q=' + (process.env.Q || 'low'));
  await page.waitForFunction(() => window.__rh && window.__rh.game);
  const frames = (n) => page.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const shot = async (name) => { await frames(3); await page.screenshot({ path: `${out}/m-${name}.png` }); console.log('shot', name); };
  // 夜のステージ
  await page.evaluate(() => {
    document.getElementById('optTutor').checked = false;
    window.__rh.startGame('s6');
    const g = window.__rh.game, f = g.farmer;
    g.farmer.state = 'WORK'; f.phase = 'idle'; f.timer = 999; f.x = -4; f.z = 2.4; f.h = -Math.PI / 2;
    Object.assign(g.player, { x: -11, z: 2.6, surface: -1, y: 0, h: Math.PI / 2 });
    window.__rh.cam.yaw = Math.PI / 2; window.__rh.cam.init = true;
  });
  await frames(20);
  await shot('night');
  // ネコ
  await page.evaluate(() => {
    window.__rh.startGame('s4');
    const g = window.__rh.game, C = g.cat;
    g.farmer.x = 19; g.farmer.z = 12; g.farmer.timer = 999;
    Object.assign(g.player, { x: -8, z: 2.6, surface: -1, y: 0, h: 0 });
    Object.assign(C, { x: -8, z: 4.6, h: Math.PI, st: 'stalk', target: g.player, t: 0, cd: 0 });
    window.__rh.cam.yaw = 0; window.__rh.cam.init = true;
  });
  await frames(10);
  await shot('cat');
  // 検品員
  await page.evaluate(() => {
    window.__rh.startGame('s3');
    const g = window.__rh.game;
    g.shipped = 3;
  });
  await page.evaluate(() => { const g = window.__rh.game; g.update && 0; });
  await page.waitForFunction(() => window.__rh.game.inspector);
  await page.evaluate(() => { const g = window.__rh.game; g.inspector.t = 9.9; });
  await page.waitForFunction(() => window.__rh.game.inspector && window.__rh.game.inspector.m);
  await page.evaluate(() => {
    const g = window.__rh.game, I = g.inspector;
    I.x = 13; I.z = 6; I.path = []; I.st = 'look'; I.wait = 99; I.baseH = 0; I.speechT = 5;
    g.farmer.x = 19; g.farmer.z = 12; g.farmer.timer = 999;
    Object.assign(g.player, { x: 9.5, z: 6, surface: -1, y: 0, h: Math.PI / 2 });
    window.__rh.cam.yaw = Math.PI / 2; window.__rh.cam.init = true;
  });
  await frames(10);
  await shot('inspector');
  // 波紋とボタンの輪
  await page.evaluate(() => {
    const g = window.__rh.game;
    g.player.greed = 72; g.player.eatingCrate = g.crates[0];
    g.soundPings.push({ x: g.player.x + 5, z: g.player.z, v: 0.9, kind: 'step' }, { x: g.player.x - 30, z: g.player.z, v: 0.7, kind: 'bell' });
  });
  await frames(4);
  await shot('ring-ripple');
  // 結果（星）
  await page.evaluate(() => {
    const g = window.__rh.game;
    g.player.eatingCrate = null; g.player.greed = 0;
    g.stats.shipped = 2; g.stats.chased = 1;
    g.endGame(true, 'ruined');
  });
  await frames(30);
  await shot('result');
  // 図鑑の自己ベスト
  await page.evaluate(() => { document.getElementById('btnToTitle') && 0; });
  await page.click('#btnTitle2'); await page.click('#btnBook');
  await frames(5);
  await page.evaluate(() => { const el = document.getElementById('bookBest'); if (el) el.scrollIntoView(); });
  await shot('book');
  console.log('ERRORS', errors.length, errors.join('\n'));
  await b.close();
})();
