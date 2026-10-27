const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  // 古い保存データ（lastFamily なし）から
  await m.evaluate(k => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonWorkShown:true,seasonIndex:1,harvested:{tomato:1},plots:[{vegId:'tomato',stage:3},{vegId:'cucumber',stage:3}]})), KEY);
  await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="farm"]');
  await m.click('.plot[data-index="0"] .plot-action'); await m.waitForTimeout(700);
  while (await m.locator('#modal:not(.hidden)').count()) { await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(80); }
  console.log(vp.tag,'lastFamily', JSON.stringify((await get()).lastFamily));
  // 同じなかま（ナス：トマト）をもう一度
  await m.click('.plot[data-index="0"] .sow-btn'); await m.waitForTimeout(100);
  await m.click('.modal-body .seed >> text=トマト'); await m.waitForTimeout(150);
  console.log(vp.tag,'rotation toast:', (await m.textContent('#toast')).replace(/\n/g,' / '));
  await m.screenshot({ path: `${process.env.SP}/s25-${vp.tag}-rotation.png` });
  console.log(vp.tag,'lastFamily after', JSON.stringify((await get()).lastFamily));
  // 違うなかま（きゅうりの区画のあとに枝豆）
  await m.click('.plot[data-index="1"] .plot-action'); await m.waitForTimeout(700);
  while (await m.locator('#modal:not(.hidden)').count()) { await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(80); }
  await m.click('.plot[data-index="1"] .sow-btn'); await m.waitForTimeout(100);
  await m.click('.modal-body .seed >> text=枝豆'); await m.waitForTimeout(150);
  console.log(vp.tag,'normal toast:', (await m.textContent('#toast')).replace(/\n/g,' / ').slice(0,40));
  // 音（オンにして鳴らしてもエラーにならない）
  await m.evaluate(() => { Sound.setSound(true); Sound.play('drop'); Sound.play('leaf'); });
  // 図鑑：今月まける／とれる
  await m.click('.tab[data-screen="zukan"]'); await m.click('.filter-chip.month >> nth=0'); await m.waitForTimeout(100);
  console.log(vp.tag,'headings', (await m.locator('.month-heading').allTextContents()).join(' | '), '| cards', await m.locator('.month-card').count());
  const hv = await m.locator('.month-card').last().textContent(); console.log(vp.tag,'last card', hv.slice(0,60));
  console.log(vp.tag,'scrollW', await m.evaluate(() => document.documentElement.scrollWidth));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
