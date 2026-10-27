const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  for (const motion of ['no-preference','reduce']) {
  const m = await b.newPage({ viewport: vp, reducedMotion: motion });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  await m.evaluate(k => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,harvested:{potato:1},resources:{water:40,fertilizer:20,coins:0},plots:[{vegId:'radish',stage:3},{vegId:'spinach',stage:0}]})), KEY);
  await m.reload(); await m.waitForTimeout(250); await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(100);
  // 水やり（ことばの説明が付くか）
  await m.click('.plot >> nth=1 >> .btn:not(.book-btn)'); await m.waitForTimeout(80);
  console.log(vp.tag, motion, 'water toast:', (await m.textContent('#toast')).replace(/\n/g,' / '));
  // 収穫
  await m.click('.plot.ready .btn.primary'); await m.waitForTimeout(150);
  const pop = await m.locator('.harvest-pop').count(); const cls = pop ? await m.getAttribute('.harvest-pop','class') : '';
  const anim = pop ? await m.evaluate(() => getComputedStyle(document.querySelector('.harvest-pop')).animationName) : '';
  console.log(vp.tag, motion, 'pop', pop, cls, anim);
  if (vp.tag==='se' && motion==='no-preference') await m.screenshot({ path: `${process.env.SP}/s20-pop.png` });
  await m.waitForTimeout(700); console.log(vp.tag, motion, 'pop after', await m.locator('.harvest-pop').count());
  console.log(vp.tag, motion, 'harvest toast:', (await m.textContent('#toast')).replace(/\n/g,' / '));
  // 図鑑の登録お知らせを閉じる
  while (await m.locator('#modal:not(.hidden)').count()) { await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(80); }
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(100);
  console.log(vp.tag, motion, 'zukan eat', await m.locator('.zukan-eat').count(), await m.locator('.zukan-eat').first().textContent());
  await m.click('.zukan-card >> nth=0 >> .link-btn'); await m.waitForTimeout(80);
  console.log(vp.tag, motion, 'howto eat row', (await m.locator('.howto-row dt').allTextContents()).join('/'));
  await m.close();
  }}
  console.log('errors', errors); await b.close();
})();
