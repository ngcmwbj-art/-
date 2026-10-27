const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const b2 = Array.from({length:8},(_, r)=>Array(8).fill(-1).map((_, c)=> (r+c)%2===0 ? 1 : -1));
  // 夏・トマト収穫どき、ゲームオーバー直前（このプレイで💧12 🍂5 を持ち帰った）
  await m.evaluate(([k,b2]) => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonIndex:1,
    resources:{water:3,fertilizer:0,coins:0}, plots:[{vegId:'tomato',stage:3},{vegId:'cucumber',stage:0}], harvested:{tomato:1},
    puzzle:{board:b2, pieces:[{shape:0,color:1},{shape:9,color:4},{shape:9,color:5}], score:3, combo:0, movesSinceClear:0, over:false, bestBefore:0, undoUsed:true, shuffleUsed:true, gotWater:12, gotFertilizer:5}})), [KEY,b2]);
  await m.reload(); await m.waitForTimeout(300);
  const c0 = await m.locator('#board .cell').nth(1).boundingBox(); const sb = await m.locator('#tray .slot').nth(0).boundingBox();
  await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down(); await m.mouse.move(c0.x+c0.width/2, c0.y+c0.height/2, {steps:4}); await m.mouse.up();
  await m.waitForTimeout(1100);
  console.log(vp.tag, 'gameover body:', (await m.textContent('.modal-body')).replace(/\n/g,' / '));
  await m.screenshot({ path: `${process.env.SP}/s21-${vp.tag}-over.png` });
  await m.click('.modal-buttons .btn >> text=もう一度あそぶ'); await m.waitForTimeout(200);
  const p = await m.evaluate(k => JSON.parse(localStorage.getItem(k)).puzzle, KEY);
  console.log(vp.tag, 'new game got', p.gotWater, p.gotFertilizer);
  // 夏の食べ方
  await m.click('.tab[data-screen="farm"]'); await m.click('.plot.ready .btn.primary'); await m.waitForTimeout(150);
  console.log(vp.tag, 'harvest toast:', (await m.textContent('#toast')).replace(/\n/g,' / '));
  // 季節バッジから畑しごと
  await m.waitForTimeout(600);
  while (await m.locator('#modal:not(.hidden)').count()) { await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(80); }
  await m.click('.tab[data-screen="zukan"]'); await m.click('.badge-season >> nth=1'); await m.waitForTimeout(100);
  console.log(vp.tag, 'badge modal:', await m.textContent('.modal-title'), '|', (await m.locator('.season-work li').allTextContents()).length, 'lines');
  await m.screenshot({ path: `${process.env.SP}/s21-${vp.tag}-work.png` });
  await m.click('.modal-buttons .btn');
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
