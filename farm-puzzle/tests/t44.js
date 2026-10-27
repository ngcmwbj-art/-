const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const set = (d) => m.evaluate(([k,d]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(d)); }, [KEY,d]);
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const base = {version:2,tutorialDone:true,onboardStep:2,tipHiddenDay:'x',seasonWorkShown:true,resources:{water:0,fertilizer:0,coins:0}};
  // 2周目の春：前の版の記録（count 1、10/20）→ そろえると first に 10/20 が残る
  await set({...base, seasonIndex:0, seasonHarvested:['potato','spinach','cabbage','radish'], harvested:{potato:2,spinach:2,cabbage:2,radish:2,lettuce:1},
    seasonClears:{spring:{count:1,y:2026,m:10,d:20,total:9,n:9,all:35}}, plots:[{vegId:'lettuce',stage:3},null]});
  await m.reload(); await m.waitForTimeout(300); await m.click('.tab[data-screen="farm"]'); await m.click('.plot.ready .plot-action'); await m.waitForTimeout(800);
  let cert = '';
  for (let k=0;k<4 && await m.locator('#modal:not(.hidden)').count();k++){ if (await m.locator('.cert-first').count()) cert = await m.textContent('.cert-first'); await m.click('.modal-buttons .btn >> nth=-1'); await m.waitForTimeout(150); }
  const s = await get();
  console.log(vp.tag, 'spring rec', JSON.stringify(s.seasonClears.spring), '| shown:', cert);
  // 図鑑コンプのあとの目標
  const all = await m.evaluate(async () => (await (await fetch('data/vegetables.json')).json()));
  await set({...base, seasonIndex:1, harvested:Object.fromEntries(all.vegetables.map(v=>[v.id,1])), zukanComplete:{y:2026,m:10,d:27,total:35}, plots:[null,null]});
  await m.reload(); await m.waitForTimeout(300);
  console.log(vp.tag, 'goal:', await m.textContent('#goal'));
  await m.evaluate(() => Guide.show()); await m.waitForTimeout(100);
  for (let i=0;i<2;i++){ await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(80); }
  console.log(vp.tag, 'guide3 has 追肥説明', (await m.textContent('.modal-body')).includes('追肥（肥料をあげること）'));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
