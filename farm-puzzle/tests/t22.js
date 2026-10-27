const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const set = (d) => m.evaluate(([k,d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY,d]);
  const base = {version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonIndex:2,harvested:{daikon:1}};
  // 4区画目が水やりできる
  await set({...base, resources:{water:30,fertilizer:0,coins:0}, plots:[{vegId:'daikon',stage:2,growLeft:3},{vegId:'carrot',stage:1},null,{vegId:'turnip',stage:0}]});
  await m.reload(); await m.waitForTimeout(250);
  console.log(vp.tag,'goal:', await m.textContent('#goal'));
  await m.click('#goal'); await m.waitForTimeout(200);
  const fl = await m.evaluate(() => { const e=document.querySelector('.flash'); return e ? e.closest('.plot').dataset.index + ':' + e.textContent : 'なし'; });
  console.log(vp.tag,'flash on', fl);
  await m.screenshot({ path: `${process.env.SP}/s22-${vp.tag}-flash.png` });
  await m.waitForTimeout(2100); console.log(vp.tag,'flash after 2s', await m.locator('.flash').count());
  // 📖 今の作業
  await m.click('.plot[data-index="1"] .book-btn'); await m.waitForTimeout(100);
  console.log(vp.tag,'howto now:', (await m.textContent('.howto-steps li.now')).slice(0,20));
  await m.click('.modal-buttons .btn');
  // 区画をふやす目標
  await set({...base, resources:{water:0,fertilizer:0,coins:100}, plots:[{vegId:'daikon',stage:3}]});
  await m.reload(); await m.waitForTimeout(250);
  // ゲームオーバー：満タンで持ち帰れず
  const b2 = Array.from({length:8},(_, r)=>Array(8).fill(-1).map((_, c)=> (r+c)%2===0 ? 1 : -1));
  await set({...base, resources:{water:50,fertilizer:30,coins:0}, plots:[{vegId:'daikon',stage:3},null],
    puzzle:{board:b2, pieces:[{shape:0,color:1},{shape:9,color:4},{shape:9,color:5}], score:3, combo:0, movesSinceClear:0, over:false, bestBefore:99, undoUsed:true, shuffleUsed:true, gotWater:0, gotFertilizer:0, gameMarks:4}});
  await m.reload(); await m.waitForTimeout(300);
  const c0 = await m.locator('#board .cell').nth(1).boundingBox(); const sb = await m.locator('#tray .slot').nth(0).boundingBox();
  await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down(); await m.mouse.move(c0.x+c0.width/2, c0.y+c0.height/2, {steps:4}); await m.mouse.up();
  await m.waitForTimeout(1100);
  console.log(vp.tag,'over:', (await m.textContent('.modal-body')).replace(/\n/g,' / '), '| primary:', await m.textContent('.modal-buttons .btn.primary'));
  await m.screenshot({ path: `${process.env.SP}/s22-${vp.tag}-over.png` });
  await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(200);
  console.log(vp.tag,'after toFarm: screen farm', await m.locator('#screen-farm.active').count(), 'flash', await m.evaluate(() => { const e=document.querySelector('.flash'); return e ? e.textContent : 'なし'; }));
  // 図鑑：秋冬の食べ方・バッジの文字
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(100);
  console.log(vp.tag,'zukan:', await m.textContent('.badges-label'), '|', await m.locator('.zukan-eat').first().textContent());
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
