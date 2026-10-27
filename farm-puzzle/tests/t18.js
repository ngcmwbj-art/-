const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 390, height: 844, tag: 'sp' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  // 初めての人（チュートリアルだけ済ませた状態）
  await m.evaluate(k => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x'})), KEY);
  await m.reload(); await m.waitForTimeout(300);
  console.log(vp.tag,'goal:', await m.textContent('#goal'), '| farm tab glow', await m.locator('.tab.glow').count());
  await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(100);
  console.log(vp.tag,'sow glow', await m.locator('.sow-btn.glow').count(), '/ sow btns', await m.locator('.sow-btn').count());
  await m.click('.sow-btn.glow'); await m.waitForTimeout(100);
  console.log(vp.tag,'fold:', await m.textContent('.seed-fold'), '| seed rows', await m.locator('.modal .seed-btn, .modal .seed').count());
  await m.screenshot({ path: `${process.env.SP}/s18-${vp.tag}-picker.png` });
  await m.click('.seed-fold'); await m.waitForTimeout(80);
  console.log(vp.tag,'after open fold:', await m.textContent('.seed-fold'));
  await m.click('.seed-fold');
  // 最初の野菜ボタンで種まき
  const seed = m.locator('.modal-body button:not(.seed-fold):not(.seed-guide):not(.link-btn)').first();
  await seed.click(); await m.waitForTimeout(150);
  if (await m.locator('#modal:not(.hidden)').count()) { console.log(vp.tag,'modal still open:', await m.textContent('.modal-title')); }
  const st = await m.evaluate(k => JSON.parse(localStorage.getItem(k)).onboardStep, KEY);
  console.log(vp.tag,'step after sow', st, '| goal', await m.textContent('#goal'), '| water glow', await m.locator('.plot .btn.glow').count());
  // 水を入れて水やり
  await m.evaluate(k => { const d=JSON.parse(localStorage.getItem(k)); d.resources.water=40; localStorage.setItem(k,JSON.stringify(d)); }, KEY);
  await m.reload(); await m.waitForTimeout(250); await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(100);
  console.log(vp.tag,'water glow', await m.locator('.plot .btn.glow').count());
  await m.screenshot({ path: `${process.env.SP}/s18-${vp.tag}-water.png` });
  await m.click('.plot .btn.glow'); await m.waitForTimeout(150);
  console.log(vp.tag,'step after water', await m.evaluate(k => JSON.parse(localStorage.getItem(k)).onboardStep, KEY), '| glow left', await m.locator('.glow').count());
  // 既存プレイヤーは案内なし
  await m.evaluate(k => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x',harvested:{tomato:1}})), KEY);
  await m.reload(); await m.waitForTimeout(250); console.log(vp.tag,'veteran glow', await m.locator('.glow').count());
  // 図鑑：今月・育てやすい順
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(100);
  await m.click('.filter-chip.month'); await m.waitForTimeout(80);
  console.log(vp.tag,'month chip', await m.textContent('.filter-chip.month'), '| cards', await m.locator('.month-card').count(), '|', (await m.locator('.month-card .zukan-name').allTextContents()).join(','));
  await m.screenshot({ path: `${process.env.SP}/s18-${vp.tag}-month.png` });
  await m.click('.filter-chip.sort'); await m.waitForTimeout(80);
  console.log(vp.tag,'sorted', (await m.locator('.month-card .stars').allTextContents()).join(''));
  await m.click('.month-card .link-btn'); await m.waitForTimeout(80); console.log(vp.tag,'howto', await m.textContent('.modal-title')); await m.click('.modal-buttons .btn');
  await m.click('.filter-chip >> text=すべて'); await m.waitForTimeout(80);
  console.log(vp.tag,'all sorted first', (await m.locator('.zukan-card').count()));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
