const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 390, height: 844, tag: 'sp' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  const setSave = (d) => m.evaluate(([k,d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY,d]);
  await m.goto('http://localhost:8765/');
  const base = {version:2, tutorialDone:true, firstGrowDone:true, tipHiddenDay:'', seasonIndex:1, harvested:{}};
  const goal = async (d) => { await setSave({...base, ...d}); await m.reload(); await m.waitForTimeout(250); return await m.textContent('#goal'); };
  console.log(vp.tag, 'goal 空き:', await goal({resources:{water:0,fertilizer:0,coins:0}, plots:[null,null]}));
  console.log(vp.tag, 'goal 水不足:', await goal({resources:{water:3,fertilizer:0,coins:0}, plots:[{vegId:'tomato',stage:0},{vegId:'edamame',stage:2,growLeft:3}]}));
  console.log(vp.tag, 'goal 水やりできる:', await goal({resources:{water:30,fertilizer:0,coins:0}, plots:[{vegId:'tomato',stage:0},{vegId:'edamame',stage:2,growLeft:3}]}));
  console.log(vp.tag, 'goal 育ち中のみ:', await goal({resources:{water:0,fertilizer:0,coins:0}, plots:[{vegId:'tomato',stage:2,growLeft:4},{vegId:'edamame',stage:2,growLeft:2}]}));
  console.log(vp.tag, 'goal 収穫:', await goal({resources:{water:0,fertilizer:0,coins:0}, plots:[{vegId:'tomato',stage:3},null]}));
  await m.screenshot({ path: `${process.env.SP}/s17-${vp.tag}-puzzle.png` });
  await m.click('#goal'); await m.waitForTimeout(100);
  console.log(vp.tag, 'goal click -> farm', await m.locator('#screen-farm.active').count());
  console.log(vp.tag, 'banner folded:', (await m.textContent('.season-banner')).replace(/\s+/g,' '), '| chips', await m.locator('.season-chip').count(), '| bulk', await m.locator('.bulk-bar').count());
  await m.screenshot({ path: `${process.env.SP}/s17-${vp.tag}-farm.png` });
  await m.click('.season-now'); console.log(vp.tag, 'opened chips', await m.locator('.season-chip').count());
  await m.click('.season-chip.challenge >> nth=0'); await m.waitForTimeout(80); console.log(vp.tag, 'mission list', await m.textContent('.modal-title')); await m.click('.modal-buttons .btn');
  // 育て方カードのプランター欄
  await m.click('.book-btn'); await m.waitForTimeout(100);
  console.log(vp.tag, 'planter:', (await m.textContent('.howto-planter')).replace(/\s+/g,' '));
  await m.locator('.howto-planter').scrollIntoViewIfNeeded(); await m.screenshot({ path: `${process.env.SP}/s17-${vp.tag}-planter.png` });
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
