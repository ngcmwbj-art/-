// おまけステージ「にげろ！田んぼ道」の確認：何もしないとつかまる・よけて走れば逃げきれる・画面
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage({ viewport: { width: 960, height: 600 } });
  page.setDefaultTimeout(300000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:8765/index.html?q=low');
  await page.waitForFunction(() => window.__rh && window.__rh.game);
  const frames = (n) => page.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const sim = (style, course) => page.evaluate(([style, course]) => {
    const RH = window.__rh, R = RH.runner;
    R.start({ seed: 12345, course });
    R.ui = { say() {}, feed() {}, runOver() {} };
    const inp = { mx: 0, mz: 0, dash: false, actionHeld: false };
    for (let i = 0; i < 30 * 120 && !R.done; i++) {
      inp.mx = 0; inp.dash = false;
      if (style === 'smart') {
        // 前方のじゃまものをよけ、かけらがあれば寄る。ダッシュはスタミナが多いとき
        let tz = 0, best = 1e9;
        for (const o of R.obs) { if (o.hit) continue; const dx = o.x - R.x; if (dx < 0 || dx > 7) continue; if (o.kind === 'bit') { if (dx < best) { best = dx; tz = o.m.position.z; } } }
        for (const o of R.obs) { if (o.hit || o.kind === 'bit') continue; const dx = o.x - R.x; if (dx < 0 || dx > 4) continue; if (Math.abs(o.m.position.z - R.z) < 1.1) tz = o.m.position.z > 0 ? -1.4 : 1.4; }
        if (course === 'dusk' && R.x > 172 - 12 && R.x < 172 + 4) tz = 1.2; // コンバインは右へよける
        if (course === 'dusk' && R.x > 104 && R.x < 127) tz = 0;            // 橋はまん中
        inp.mx = Math.max(-1, Math.min(1, -(tz - R.z) * 1.5));
        inp.dash = R.stam > 35 || R.gap < 3;
      }
      R.update(1 / 30, inp);
    }
    const r = { done: R.done, t: Math.round(R.t), bits: R.bits, x: Math.round(R.x) };
    R.stop();
    return r;
  }, [style, course]);
  console.log('夜明け・何もしない', JSON.stringify(await sim('idle', 'dawn')));
  console.log('夜明け・よけて走る', JSON.stringify(await sim('smart', 'dawn')));
  console.log('夕方・何もしない', JSON.stringify(await sim('idle', 'dusk')));
  console.log('夕方・よけて走る', JSON.stringify(await sim('smart', 'dusk')));
  await page.evaluate(() => window.__rh.startRun());
  await frames(90);
  await page.screenshot({ path: `${out}/run1.png` });
  await page.evaluate(() => { const R = window.__rh.runner; R.x = 120; R.truckX = 113; });
  await frames(10);
  await page.screenshot({ path: `${out}/run2.png` });
  await page.evaluate(() => { const RH = window.__rh; RH.runner.stop(); RH.startRun('dusk'); });
  await frames(90);
  await page.evaluate(() => { const R = window.__rh.runner; R.x = 100; R.truckX = 92; });
  await frames(12);
  await page.screenshot({ path: `${out}/run3.png` });
  await page.evaluate(() => { const R = window.__rh.runner; R.x = 160; R.truckX = 151; });
  await frames(12);
  await page.screenshot({ path: `${out}/run4.png` });
  console.log('ERRORS', errors.length, errors.join('\n'));
  await b.close();
})();
