const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  // 初めて：遊び方2ページ目
  await m.evaluate(k => localStorage.removeItem(k), KEY); await m.reload(); await m.waitForTimeout(300);
  await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(100);
  console.log(vp.tag,'guide p2:', (await m.textContent('.modal-body')).replace(/\n/g,' / '));
  await m.screenshot({ path: `${process.env.SP}/s24-${vp.tag}-guide.png` });
  await m.evaluate(k => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonIndex:1,harvested:{tomato:1},plots:[null,null]})), KEY);
  await m.reload(); await m.waitForTimeout(300);
  // 夏の種まき：失敗しないコツ
  await m.click('.tab[data-screen="farm"]'); await m.click('.plot[data-index="0"] .sow-btn'); await m.waitForTimeout(100);
  await m.click('.modal-body .seed >> text=きゅうり'); await m.waitForTimeout(150);
  console.log(vp.tag,'sow toast:', (await m.textContent('#toast')).replace(/\n/g,' / '));
  // 図鑑：なかま・ベランダOK
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(100);
  console.log(vp.tag,'family:', await m.locator('.zukan-family').first().textContent());
  await m.click('.filter-chip >> text=プランターで育つ'); await m.waitForTimeout(100);
  const fits = await m.locator('.month-card .month-planter').allTextContents();
  console.log(vp.tag,'planter list', fits.length, '|', fits[0], '|', fits[fits.length-1]);
  const sw = await m.evaluate(() => document.documentElement.scrollWidth); console.log(vp.tag,'scrollW', sw);
  await m.screenshot({ path: `${process.env.SP}/s24-${vp.tag}-planter.png` });
  await m.click('.month-card .link-btn >> nth=0'); await m.waitForTimeout(100);
  const rows = await m.locator('.howto-row').allTextContents(); console.log(vp.tag,'howto family row:', rows.find(r=>r.startsWith('なかま')), '|', rows.find(r=>r.startsWith('失敗しない')));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
