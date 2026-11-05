// 第4回会議で足したもの（カメラ・結果画面・お知らせ・排水溝・季節・見学・カブトムシ）の見た目確認
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const page = await b.newPage({ viewport: { width: 960, height: 600 } });
  page.setDefaultTimeout(300000);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:8765/index.html?q=low&date=2026-12-24');
  await page.waitForFunction(() => window.__rh && window.__rh.game);
  const frames = (n) => page.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const shot = async (name) => { await frames(3); await page.screenshot({ path: `${out}/q-${name}.png` }); console.log('shot', name); };
  await shot('title-xmas');
  await page.evaluate(() => { document.getElementById('optTutor').checked = false; window.__rh.startGame('s2'); const g = window.__rh.game; g.farmer.timer = 999; });
  await frames(15);
  await shot('camera');
  await page.evaluate(() => {
    const RH = window.__rh, g = RH.game;
    Object.assign(g.player, { x: 17.5, z: 5.2, surface: -1, y: 0, h: Math.PI / 2 });
    RH.cam.yaw = Math.PI / 2 + 0.2; RH.cam.init = true;
    g.toast('仲間がやられた…（殺虫剤）', 'bad'); g.toast('卵がかえった！ 仲間が3匹ふえた', 'good');
    g.radio('ラジオ「ただいまハウスにゴキブリ注意報が出ています」', true);
    const D = g.drains[3]; Object.assign(g.player, { x: D.x - 1.4, z: D.z, h: Math.PI / 2 });
  });
  await frames(10);
  await shot('drain-feed');
  await page.evaluate(() => { const g = window.__rh.game; g.stats.eggs = 10; g.farmer.timer = 999; });
  await frames(40);
  await page.evaluate(() => {
    const RH = window.__rh, g = RH.game, B = g.beetle;
    if (B) { Object.assign(g.player, { x: B.c.x - 2.2, z: B.c.z + (B.c.z > 0 ? -2 : 2), surface: -1, y: 0 }); RH.cam.yaw = Math.atan2(B.c.x - g.player.x, B.c.z - g.player.z); RH.cam.init = true; }
  });
  await frames(12);
  await shot('beetle');
  await page.evaluate(() => window.__rh.game.endGame(false, 'shipped'));
  await page.waitForFunction(() => !document.getElementById('result').hidden);
  await frames(8);
  await shot('result-short');
  await page.click('#btnTitle2');
  await page.evaluate(() => window.__rh.setTab('see')); await page.click('#btnTour');
  await frames(10);
  await page.click('[data-look="cat"]');
  await frames(25);
  await shot('tour-cat');
  await page.click('[data-look="farmer"]');
  await frames(25);
  await shot('tour-farmer');
  console.log('ERRORS', errors.length, errors.join('\n'));
  await b.close();
})();
