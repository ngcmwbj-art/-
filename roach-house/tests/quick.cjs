// すばやい確認：読みこみ・開始・少し動かしてエラーが出ないか
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 500 } });
  p.setDefaultTimeout(240000);
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('http://localhost:8765/index.html?q=low');
  await p.waitForFunction(() => window.__rh && window.__rh.game);
  const r = await p.evaluate(() => {
    const RH = window.__rh;
    RH.startGame('normal');
    const g = RH.game;
    const bad = RH.sim(30, 1 / 30, (gg, i) => { i.mx = 0.2; i.mz = 1; });
    return { state: g.state, left: g.shipLeft(), bad, tut: !!g.tutorial };
  });
  await p.waitForTimeout(1500);
  console.log(JSON.stringify(r));
  const err2 = await p.evaluate(() => { const e = document.getElementById('err'); return e.hidden ? '' : e.textContent; });
  if (err2) errs.push('画面のエラー表示: ' + err2);
  console.log('ERRORS', errs.length, errs.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
