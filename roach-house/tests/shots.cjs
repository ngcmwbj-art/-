// 見た目の確認用スクリーンショット（PC横・スマホ縦）
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/index.html';
const out = process.argv[2] || '.';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  for (const vp of [{ name: 'pc', width: 1280, height: 760, touch: false }, { name: 'phone', width: 390, height: 844, touch: true }, { name: 'phoneL', width: 844, height: 390, touch: true }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(vp.name + ' pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(vp.name + ' console: ' + m.text()); });
    await page.goto(URL);
    await page.waitForFunction(() => window.__rh && window.__rh.game);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${vp.name}-0title.png` });
    await page.evaluate(() => window.__rh.startGame('normal'));
    // 場面1：台の上で食べている、農場主が近い
    await page.evaluate(() => {
      const g = window.__rh.game;
      const p = g.player; p.x = 12.0; p.z = -8.85; p.surface = 0; p.y = 2.2; p.h = 0;
      g.farmer.x = 9; g.farmer.z = -4.5; g.farmer.h = 2.4; g.farmer.state = 'INVESTIGATE'; g.farmer.inv = { x: 12, y: 2.2, z: -8.8, look: 0.01 };
      g.farmer.susp = 70; g.farmer.speech = 'ん？ 今なにか動いたか？'; g.farmer.speechT = 5;
      g.crates[1].hp = 40;
      window.__rh.input.camDX = 0;
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${vp.name}-1table.png` });
    // 場面2：追跡・殺虫剤・仲間・わな
    await page.evaluate(() => {
      const g = window.__rh.game;
      g.nutrition = 100; g.tryLayEgg(g.player);
      g.hatch(g.eggs[0]);
      const p = g.player; p.st = 'move'; p.surface = -1; p.y = 0; p.x = 4; p.z = -2.5; p.h = Math.PI / 2;
      for (const r of g.nymphs) { r.x = 4 + Math.random(); r.z = -3 + Math.random(); r.y = 0; r.surface = -1; }
      g.farmer.x = 8.5; g.farmer.z = -3.5; g.startChase(p); g.spawnCloud(5.5, 0, -3.2);
      g.ruinCrate(g.crates[12]);
      g.camYaw = Math.PI / 2;
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${vp.name}-2chase.png` });
    await page.evaluate(() => { const g = window.__rh.game; g.time = 0.2; });
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${out}/${vp.name}-3result.png` });
    await ctx.close();
  }
  console.log('ERRORS', errors.length, errors.slice(0, 6).join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
