const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/data/messages.json');
  await m.evaluate(k => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,onboardStep:2,tipHiddenDay:'x',seasonWorkShown:true,seasonIndex:0,
    seasonHarvested:['potato','spinach','cabbage','radish'],harvested:{potato:1,spinach:1,cabbage:1,radish:1},resources:{water:0,fertilizer:0,coins:0},
    plots:[{vegId:'lettuce',stage:3},{vegId:'potato',stage:1}]})); }, KEY);
  await m.goto('http://localhost:8765/'); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(150);
  console.log(vp.tag, 'steps', (await m.locator('.plot').nth(1).locator('.steps').textContent()));
  // 収穫 → お知らせは窓が開いているあいだ出ない → 窓を全部閉じたら出る
  await m.click('.plot.ready .plot-action'); await m.waitForTimeout(100);
  const t0 = await m.textContent('#toast');
  await m.waitForTimeout(600);
  const during = [];
  for (let k=0;k<5 && await m.locator('#modal:not(.hidden)').count();k++){ during.push(await m.evaluate(() => document.getElementById('toast').classList.contains('show'))); await m.click('.modal-buttons .btn >> nth=-1'); await m.waitForTimeout(150); }
  await m.waitForTimeout(400);
  console.log(vp.tag, 'toast first', t0.slice(0,20), '| shown while modal', JSON.stringify(during), '| after close show', await m.evaluate(() => document.getElementById('toast').classList.contains('show')), (await m.textContent('#toast')).slice(0,30));
  // 図鑑の数
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(150);
  const counts = await m.evaluate(() => [...document.querySelectorAll('#zukan *')].filter(e => e.children.length === 0 && /図鑑/.test(e.textContent) && /\d+\/\d+/.test(e.textContent)).map(e => e.textContent.trim()));
  console.log(vp.tag, 'zukan counts', JSON.stringify(counts));
  // カレンダーの線
  await m.evaluate(() => HowTo.open(Farm.veg('tomato'))); await m.waitForTimeout(150);
  console.log(vp.tag, 'cal shadows', await m.evaluate(() => ['plant','harvest'].map(c => getComputedStyle(document.querySelector('.cal-cell.' + c)).boxShadow.slice(0,40))));
  await m.screenshot({ path: `${process.env.SP}/s46-${vp.tag}-cal.png` });
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
