const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const all = await m.evaluate(async () => (await (await fetch('data/vegetables.json')).json()));
  const hv = {}; all.vegetables.forEach(v => { if (v.id !== 'okra') hv[v.id] = 2; });
  const set = (d) => m.evaluate(([k,d]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(d)); }, [KEY,d]);
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const base = {version:2,tutorialDone:true,onboardStep:2,tipHiddenDay:'x',seasonWorkShown:true,seasonIndex:1,seasonHarvested:['tomato','cucumber','edamame','pepper'],
    missions:{}, resources:{water:0,fertilizer:0,coins:0}};
  // 夏：オクラ（34種目→35種目）を収穫。オクラはチャレンジ野菜なので季節はそろわない
  await set({...base, harvested:hv, plots:[{vegId:'okra',stage:3},null]});
  await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(150);
  console.log(vp.tag,'book badge before', await m.locator('.badge-season.book').getAttribute('class'), await m.locator('.badge-season.book').getAttribute('aria-label'));
  await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(150);
  await m.click('.plot.ready .plot-action'); await m.waitForTimeout(800);
  const titles = [];
  for (let k=0;k<5 && await m.locator('#modal:not(.hidden)').count();k++){ const t = await m.textContent('.modal-title'); titles.push(t);
    if (t.includes('コンプリート')) { await m.screenshot({ path: `${process.env.SP}/s43-${vp.tag}-cert.png` }); console.log(vp.tag,'cert vegs', await m.locator('.zukan-cert .cert-veg').count()); }
    await m.click('.modal-buttons .btn >> nth=-1'); await m.waitForTimeout(150); }
  console.log(vp.tag,'modals:', titles.join(' → '));
  const s = await get();
  console.log(vp.tag,'saved zukanComplete', JSON.stringify(s.zukanComplete), 'harvested n', Object.keys(s.harvested).length);
  // 2回目の収穫では出ない
  await set({...s, plots:[{vegId:'okra',stage:3},null]}); await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="farm"]'); await m.click('.plot.ready .plot-action'); await m.waitForTimeout(800);
  const t2 = []; for (let k=0;k<5 && await m.locator('#modal:not(.hidden)').count();k++){ t2.push(await m.textContent('.modal-title')); await m.click('.modal-buttons .btn >> nth=-1'); await m.waitForTimeout(150); }
  console.log(vp.tag,'2nd time modals:', JSON.stringify(t2));
  // 図鑑の📖バッジから見返す
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(150);
  await m.click('.badge-season.book'); await m.waitForTimeout(150);
  console.log(vp.tag,'badge reopen', await m.textContent('.modal-title'), await m.locator('.zukan-cert').count());
  await m.evaluate(() => Modal.close());
  // 季節と同時：春の最後の基本野菜が35種目
  const hv2 = {}; all.vegetables.forEach(v => { if (v.id !== 'lettuce') hv2[v.id] = 1; });
  await set({...base, seasonIndex:0, seasonHarvested:['potato','spinach','cabbage','radish'], harvested:hv2, plots:[{vegId:'lettuce',stage:3},null]});
  await m.reload(); await m.waitForTimeout(300); await m.click('.tab[data-screen="farm"]'); await m.click('.plot.ready .plot-action'); await m.waitForTimeout(800);
  const t3 = []; for (let k=0;k<6 && await m.locator('#modal:not(.hidden)').count();k++){ t3.push(await m.textContent('.modal-title')); await m.click('.modal-buttons .btn >> nth=-1'); await m.waitForTimeout(200); }
  console.log(vp.tag,'with season:', t3.join(' → '));
  // 古い保存（35種そろっているが記録なし）：次の収穫で1回だけ
  await set({...base, harvested:Object.fromEntries(all.vegetables.map(v=>[v.id,3])), plots:[{vegId:'tomato',stage:3},null]});
  await m.reload(); await m.waitForTimeout(300); await m.click('.tab[data-screen="farm"]'); await m.click('.plot.ready .plot-action'); await m.waitForTimeout(800);
  const t4 = []; for (let k=0;k<5 && await m.locator('#modal:not(.hidden)').count();k++){ t4.push(await m.textContent('.modal-title')); await m.click('.modal-buttons .btn >> nth=-1'); await m.waitForTimeout(150); }
  console.log(vp.tag,'legacy:', JSON.stringify(t4));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
