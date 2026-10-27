const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 360, height: 640, tag: 'xs' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const set = (d) => m.evaluate(([k,d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY,d]);
  const base = {version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonWorkShown:true,seasonIndex:0};
  // 区画の目標：コイン十分・水が足りない
  await set({...base, resources:{water:0,fertilizer:0,coins:500}, seasonHarvested:['potato','spinach'], harvested:{potato:1,spinach:1,cabbage:1,radish:1,lettuce:1,onion:1}, unlocked:['onion'], plots:[{vegId:'potato',stage:0},{vegId:'spinach',stage:2,growLeft:3}]});
  await m.reload(); await m.waitForTimeout(300);
  console.log(vp.tag,'goal:', await m.textContent('#goal'), '| hud:', await m.textContent('#hud-season'));
  const hud = await m.evaluate(() => { const r=document.querySelector('.hud').getBoundingClientRect(); return {h: Math.round(r.height), sw: document.documentElement.scrollWidth}; });
  console.log(vp.tag,'hud height', JSON.stringify(hud));
  await m.screenshot({ path: `${process.env.SP}/s32-${vp.tag}-top.png`, clip: {x:0,y:0,width:vp.width,height:150} });
  await m.click('#goal'); await m.waitForTimeout(300);
  console.log(vp.tag,'flash on expand', await m.locator('.expand-btn.flash').count());
  console.log(vp.tag,'farm banner:', (await m.textContent('.season-banner')).replace(/\s+/g,' ').slice(0,60));
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(100);
  console.log(vp.tag,'zukan:', await m.textContent('.zukan-count-now'), '|', await m.textContent('.zukan-count-all'));
  // クイズ：5問がちがう野菜
  await m.click('.review-box .btn'); await m.waitForTimeout(80);
  const names=[];
  for (let i=0;i<5;i++){ await m.click('.quiz-choice >> nth=0'); await m.waitForTimeout(60); names.push(await m.textContent('.quiz-name')); await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(60); }
  console.log(vp.tag,'quiz vegs', names.join(','), '| distinct', new Set(names).size);
  await m.click('.modal-buttons .btn >> nth=0');
  // ゲームオーバー
  const b2 = Array.from({length:8},(_, r)=>Array(8).fill(-1).map((_, c)=> (r+c)%2===0 ? 1 : -1));
  await set({...base, resources:{water:3,fertilizer:0,coins:0}, plots:[{vegId:'potato',stage:0},null],
    puzzle:{board:b2, pieces:[{shape:0,color:1},{shape:9,color:4},{shape:9,color:5}], score:3, combo:0, movesSinceClear:0, over:false, bestBefore:0, undoUsed:false, shuffleUsed:false, gotWater:12, gotFertilizer:5}});
  await m.reload(); await m.waitForTimeout(300);
  const c0 = await m.locator('#board .cell').nth(1).boundingBox(); const sb = await m.locator('#tray .slot').nth(0).boundingBox();
  await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down(); await m.mouse.move(c0.x+c0.width/2, c0.y+c0.height/2, {steps:4}); await m.mouse.up();
  await m.waitForTimeout(1100);
  console.log(vp.tag,'over body:', [await m.textContent('.over-brought'), await m.textContent('.over-goal'), await m.textContent('.over-score')].join(' | '));
  const btns = await m.locator('.modal-buttons .btn').evaluateAll(els => els.map(e => e.textContent + (e.classList.contains('primary')?'[主]':'') + (e.classList.contains('small')?'[小]':'') + ':' + Math.round(e.getBoundingClientRect().height)));
  console.log(vp.tag,'over btns', btns.join(' / '));
  await m.locator('.modal').screenshot({ path: `${process.env.SP}/s32-${vp.tag}-over.png` });
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
