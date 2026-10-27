const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const set = (d) => m.evaluate(([k,d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY,d]);
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  // 春：基本5種のうち3種収穫ずみ、ラディッシュが収穫どき、空き区画あり。初めての収穫（図鑑未登録）
  await set({version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonIndex:0,harvested:{},seasonHarvested:['potato','spinach','cabbage'],
    resources:{water:0,fertilizer:0,coins:0}, plots:[{vegId:'radish',stage:3},null]});
  await m.reload(); await m.waitForTimeout(300);
  // マークのふち
  const mk = await m.evaluate(() => [...document.querySelectorAll('#tray .cell.marked')].map(e => e.className.match(/mark-\w+/)[0] + ':' + getComputedStyle(e).borderRadius).slice(0,3));
  console.log(vp.tag,'tray marks', JSON.stringify(mk));
  await m.screenshot({ path: `${process.env.SP}/s23-${vp.tag}-marks.png` });
  await m.click('.tab[data-screen="farm"]');
  await m.click('.plot.ready .plot-action'); await m.waitForTimeout(150);
  console.log(vp.tag,'harvest toast:', (await m.textContent('#toast')).replace(/\n/g,' / '));
  await m.waitForTimeout(500);
  const titles=[];
  for (let k=0;k<4 && await m.locator('#modal:not(.hidden)').count();k++){ titles.push(await m.textContent('.modal-title')); await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(100); }
  console.log(vp.tag,'modals:', titles.join(' → '), '| shown', (await get()).seasonWorkShown);
  // 種まき：失敗しないコツ
  await m.click('.plot[data-index="0"] .sow-btn'); await m.waitForTimeout(100);
  await m.click('.modal-body .seed >> text=ほうれん草'); await m.waitForTimeout(150);
  if (await m.locator('#modal:not(.hidden)').count()) console.log(vp.tag,'modal open?', await m.textContent('.modal-title'));
  console.log(vp.tag,'sow toast:', (await m.textContent('#toast')).replace(/\n/g,' / '));
  await m.screenshot({ path: `${process.env.SP}/s23-${vp.tag}-sow.png` });
  // 2回目の収穫ではもう出ない
  await set({...(await get()), plots:[{vegId:'radish',stage:3},null]}); await m.reload(); await m.waitForTimeout(250);
  await m.click('.tab[data-screen="farm"]'); await m.click('.plot.ready .plot-action'); await m.waitForTimeout(700);
  console.log(vp.tag,'2nd harvest modal', await m.locator('#modal:not(.hidden)').count());
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
