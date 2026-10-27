const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 390, height: 844, tag: 'sp' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  await m.goto('http://localhost:8765/');
  // 冬。旬10種のうち7種は収穫ずみ。白菜・ねぎ・かぶ（図鑑未登録）が収穫どき、ほかに水やり待ち2・追肥待ち1
  await m.evaluate(k => localStorage.setItem(k, JSON.stringify({version:2, tutorialDone:true, firstGrowDone:true, resources:{water:9,fertilizer:20,coins:0}, seasonIndex:3,
    plots:[{vegId:'napa',stage:3,growLeft:0},{vegId:'negi',stage:3,growLeft:0},{vegId:'turnip',stage:3,growLeft:0},{vegId:'cabbage',stage:0},{vegId:'mizuna',stage:0},{vegId:'shungiku',stage:1},null,null],
    harvested:{daikon:1}, seasonHarvested:['daikon','spinach','cabbage','broccoli','shungiku','komatsuna','mizuna']})), KEY);
  await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="farm"]');
  const bar = async () => (await m.locator('.bulk-item').allTextContents()).map(s=>s.trim()).join(' | ');
  console.log(vp.tag, 'bar:', await bar());
  await m.screenshot({ path: `${process.env.SP}/s11-${vp.tag}-farm.png` });
  await m.click('.bulk-item >> nth=0 >> .btn');   // ぜんぶ水やり（水9：キャベツ8で1つだけ）
  console.log(vp.tag, 'after water:', (await get()).plots.map(p=>p&&p.stage).join(','), 'water', (await get()).resources.water, '| toast', (await m.textContent('#toast')).replace(/\n/g,' / '));
  console.log(vp.tag, 'bar:', await bar());
  await m.click('.bulk-item >> nth=1 >> .btn');   // ぜんぶ追肥
  console.log(vp.tag, 'after fert:', (await get()).plots.map(p=>p&&p.stage).join(','));
  await m.click('.bulk-item >> nth=2 >> .btn'); await m.waitForTimeout(200);   // ぜんぶ収穫 → 図鑑3つ → 冬コンプ
  const titles = [];
  for (let k=0;k<6 && await m.locator('#modal:not(.hidden)').count();k++) { titles.push(await m.textContent('.modal-title')); await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(80); }
  console.log(vp.tag, 'modals:', titles.join(' → '));
  const d = await get();
  console.log(vp.tag, 'season', d.seasonIndex, 'coins', d.resources.coins, 'harvested', Object.keys(d.harvested).length);
  // ---- とりかえ ----
  await m.click('.tab[data-screen="puzzle"]');
  const before = JSON.stringify((await get()).puzzle.pieces);
  console.log(vp.tag, 'shuffle visible', await m.locator('#shuffle-btn:not([hidden])').count());
  await m.click('#shuffle-btn'); await m.waitForTimeout(100);
  const after = await get();
  console.log(vp.tag, 'shuffled', before !== JSON.stringify(after.puzzle.pieces), 'used', after.puzzle.shuffleUsed, 'btn hidden', await m.locator('#shuffle-btn[hidden]').count());
  await m.screenshot({ path: `${process.env.SP}/s11-${vp.tag}-puzzle.png` });
  // ゲームオーバー画面からのとりかえ
  const b2 = Array.from({length:8},(_, r)=>Array(8).fill(-1).map((_, c)=> (r+c)%2===0 ? 1 : -1));
  await m.evaluate(([k,b2]) => { const d = JSON.parse(localStorage.getItem(k)); d.puzzle = {board:b2, pieces:[{shape:0,color:1},{shape:9,color:4},{shape:9,color:5}], score:3, combo:0, movesSinceClear:0, over:false, bestBefore:0, undoUsed:true}; localStorage.setItem(k, JSON.stringify(d)); }, [KEY,b2]);
  await m.reload(); await m.waitForTimeout(300);
  const c0 = await m.locator('#board .cell').nth(1).boundingBox(); const sb = await m.locator('#tray .slot').nth(0).boundingBox();
  await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down(); await m.mouse.move(c0.x+c0.width/2, c0.y+c0.height/2, {steps:4}); await m.mouse.up();
  await m.waitForTimeout(1100);
  console.log(vp.tag, 'gameover buttons:', (await m.locator('.modal-buttons .btn').allTextContents()).join(' | '));
  await m.click('.modal-buttons .btn >> text=手元をとりかえる'); await m.waitForTimeout(1100);
  const g = await get();
  console.log(vp.tag, 'after shuffle at gameover: over', g.puzzle.over, 'modal', await m.locator('#modal:not(.hidden)').count() ? await m.textContent('.modal-title') : 'なし');
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
