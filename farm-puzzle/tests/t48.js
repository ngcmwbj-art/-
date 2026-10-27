const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
// 2周目の冬→春：季節が春に戻り、冬の賞状が2回目になり、はじめての日が残る。資源0・区画8つ（最大）でもこわれない
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 320, height: 568, tag: '320' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/data/messages.json');
  const all = await (await fetch('http://localhost:8765/data/vegetables.json')).json();
  const basic = all.vegetables.filter(v => v.seasons.includes('winter') && !v.unlock).map(v => v.id);
  const last = basic[basic.length - 1];
  const hv = Object.fromEntries(all.vegetables.map(v => [v.id, 2]));
  await m.evaluate(([k,d]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(d)); }, [KEY, {version:2,tutorialDone:true,onboardStep:2,tipHiddenDay:'x',seasonWorkShown:true,
    seasonIndex:3, seasonHarvested: basic.filter(id => id !== last), harvested: hv, zukanComplete:{y:2026,m:10,d:20,total:70},
    seasonClears:{winter:{count:1,y:2026,m:10,d:21,total:60,n:35,all:35}},
    resources:{water:0,fertilizer:0,coins:0}, settings:{textSize:'xl',bigText:true},
    plots:[{vegId:last,stage:3},{vegId:'spinach',stage:0},{vegId:'cabbage',stage:0},{vegId:'daikon',stage:1},{vegId:'napa',stage:0},{vegId:'negi',stage:0},{vegId:'turnip',stage:0},null]}]);
  await m.goto('http://localhost:8765/'); await m.waitForTimeout(400);
  console.log(vp.tag, 'goal (0 resources, 8 plots):', await m.textContent('#goal'));
  await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(200);
  console.log(vp.tag, 'page scroll width', await m.evaluate(() => document.documentElement.scrollWidth), 'expand btn', await m.locator('.expand-btn').count() ? (await m.textContent('.expand-btn')).trim() : '-');
  await m.click('.plot.ready .plot-action'); await m.waitForTimeout(800);
  const titles = [];
  for (let k=0;k<5 && await m.locator('#modal:not(.hidden)').count();k++){ titles.push(await m.textContent('.modal-title')); await m.click('.modal-buttons .btn >> nth=-1'); await m.waitForTimeout(150); }
  const s = await m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  console.log(vp.tag, 'modals', titles.join(' → '), '| seasonIndex', s.seasonIndex, '| winter', JSON.stringify(s.seasonClears.winter));
  console.log(vp.tag, 'goal after', await m.textContent('#goal'));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
