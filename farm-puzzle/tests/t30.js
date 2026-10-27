const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  // 遊び方3ページ目
  await m.evaluate(k => localStorage.removeItem(k), KEY); await m.reload(); await m.waitForTimeout(300);
  await m.click('.modal-buttons .btn.primary'); await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(80);
  console.log(vp.tag,'guide p3:', (await m.textContent('.modal-body')).replace(/\n/g,' / '));
  // 春をそろえる（前に1回そろえた記録あり → 2回目）
  const setup = (rec) => m.evaluate(([k,rec]) => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonWorkShown:true,seasonIndex:0,settings:{sound:true,vibrate:false,bigText:false},
    harvested:{potato:2,spinach:1,cabbage:1,radish:3,lettuce:1,pea:1},seasonHarvested:['potato','spinach','cabbage','radish'],seasonClears:rec,plots:[{vegId:'lettuce',stage:3}]})), [KEY,rec]);
  await setup({spring:{count:1,y:2026,m:4,d:1,total:3,n:3,all:35}});
  await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="farm"]'); await m.click('.plot.ready .plot-action'); await m.waitForTimeout(700);
  const titles=[];
  for (let k=0;k<5 && await m.locator('#modal:not(.hidden)').count();k++){
    titles.push(await m.textContent('.modal-title'));
    if (await m.locator('.certificate').count()) console.log(vp.tag,'cert:', (await m.textContent('.certificate')).replace(/\s+/g,' '));
    if (await m.locator('.dish-chip').count()) console.log(vp.tag,'dishes:', (await m.locator('.dish-chip').allTextContents()).join(','));
    await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(100);
  }
  console.log(vp.tag,'modals', titles.join(' → '), '| rec', JSON.stringify((await get()).seasonClears.spring));
  // 図鑑のバッジから見返す
  await m.click('.tab[data-screen="zukan"]'); await m.click('.badge-season >> nth=0'); await m.waitForTimeout(100);
  console.log(vp.tag,'badge:', await m.textContent('.modal-title'), '|', (await m.textContent('.certificate')).replace(/\s+/g,' ').slice(0,60), '| dishes', await m.locator('.dish-chip').count(), 'got', await m.locator('.dish-chip.got').count());
  await m.locator('.modal').screenshot({ path: `${process.env.SP}/s30-${vp.tag}-badge.png` });
  await m.click('.dish-chip >> nth=0'); await m.waitForTimeout(100);
  console.log(vp.tag,'dish →', await m.textContent('.modal-title'));
  await m.click('.modal-buttons .btn >> text=とじる');
  // 記録のない季節（夏・未達成）
  await m.click('.badge-season >> nth=1'); await m.waitForTimeout(100);
  console.log(vp.tag,'summer badge cert', await m.locator('.certificate').count(), '|', await m.textContent('.badge-note'));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
