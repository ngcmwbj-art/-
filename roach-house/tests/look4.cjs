// 第3回会議で足したもの（死んだふり・段ボール・軍手・お弁当・？！・練習の帯・もう一回・おたすけ・帽子）の見た目確認
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
  const shot = async (name) => { await frames(3); await page.screenshot({ path: `${out}/p-${name}.png` }); console.log('shot', name); };
  const hold = () => { const g = window.__rh.game, f = g.farmer; f.timer = 999; };
  // 練習の帯
  await page.evaluate(() => { document.getElementById('optTutor').checked = true; window.__rh.startGame('s1'); });
  await frames(10);
  await shot('tutor');
  // 段ボール・軍手・お弁当（帽子をかぶって）
  await page.evaluate(() => {
    const RH = window.__rh;
    RH.game.endTutorial(false);
    RH.startGame('s2');
    const g = RH.game;
    g.hat = 'straw'; g.wearHat(g.player);
    g.farmer.state = 'WORK'; g.farmer.phase = 'idle'; g.farmer.timer = 999; g.farmer.x = 19; g.farmer.z = 12;
    const B = g.boxes[0];
    Object.assign(g.player, { x: B.x - 1.6, z: B.z, surface: -1, y: 0, h: Math.PI / 2 });
    RH.cam.yaw = Math.PI / 2; RH.cam.init = true;
  });
  await frames(12);
  await shot('box-hat');
  await page.evaluate(() => {
    const RH = window.__rh, g = RH.game, G = g.glove;
    Object.assign(g.player, { x: G.x - 1.4, z: G.z - 0.4, surface: -1, y: 0, h: Math.PI / 2 });
    RH.cam.yaw = Math.PI / 2 + 0.3; RH.cam.init = true;
  });
  await frames(12);
  await shot('glove');
  await page.evaluate(() => {
    const RH = window.__rh, g = RH.game, Bn = g.bento;
    Object.assign(g.player, { x: Bn.x - 1.4, z: Bn.z, surface: -1, y: 0, h: Math.PI / 2 });
    RH.cam.yaw = Math.PI / 2; RH.cam.init = true;
  });
  await frames(12);
  await shot('bento');
  // 死んだふりと「？」
  await page.evaluate(() => {
    const RH = window.__rh, g = RH.game, F = g.farmer;
    Object.assign(g.player, { x: 0, z: 2.5, surface: -1, y: 0, h: Math.PI / 2 });
    Object.assign(F, { state: 'INVESTIGATE', inv: { x: 0, y: 0, z: 2.5, look: 0, spray: false }, x: -4.5, z: 2.5, h: Math.PI / 2, path: [], pi: 0, act: null, susp: 70 });
    RH.input.press('dead');
    RH.cam.yaw = Math.PI / 2 + 0.6; RH.cam.init = true;
  });
  await frames(14);
  await shot('playdead');
  // 負けの結果画面（3回続けて負けると、おたすけをすすめる）
  for (let k = 0; k < 3; k++) {
    if (k > 0) await page.evaluate(() => window.__rh.startGame('s2'));
    await page.evaluate(() => window.__rh.game.endGame(false, 'shipped'));
    await page.waitForFunction(() => !document.getElementById('result').hidden);
  }
  await frames(10);
  await page.evaluate(() => document.getElementById('btnAssist').scrollIntoView({ block: 'end' }));
  await shot('result-lose');
  await page.click('#btnTitle2');
  await page.click('#btnBook');
  await frames(5);
  await shot('book');
  console.log('ERRORS', errors.length, errors.join('\n'));
  await b.close();
})();
