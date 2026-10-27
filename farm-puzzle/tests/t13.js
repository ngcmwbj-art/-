const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 390, height: 844, tag: 'sp' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  await m.goto('http://localhost:8765/');
  // ---- マークだけで手に入るか ----
  const board = Array.from({length:8},()=>Array(8).fill(-1)); const marks = Array.from({length:8},()=>Array(8).fill(null));
  for (let c=0;c<7;c++) board[0][c]=2; marks[0][2]='water'; marks[0][5]='water';
  for (let c=0;c<7;c++) board[2][c]=3;   // 2行目はマークなし
  await m.evaluate(([k,board,marks]) => localStorage.setItem(k, JSON.stringify({version:2, tutorialDone:true, firstGrowDone:true, resources:{water:0,fertilizer:0,coins:0}, seasonIndex:1, plots:[{vegId:'tomato',stage:0},null], harvested:{tomato:1}, seasonHarvested:[],
    puzzle:{board, marks, pieces:[{shape:0,color:1,mark:{cell:0,kind:'fertilizer'}},{shape:0,color:4,mark:{cell:0,kind:'water'}},{shape:9,color:5,mark:{cell:0,kind:'water'}}], score:0, combo:0, movesSinceClear:0, over:false, bestBefore:0}})), [KEY,board,marks]);
  await m.reload(); await m.waitForTimeout(300);
  const c0 = await m.locator('#board .cell').nth(0).boundingBox(); const c1 = await m.locator('#board .cell').nth(1).boundingBox(); const pitch = c1.x - c0.x;
  const drop = async (slot, r, c) => { const sb = await m.locator('#tray .slot').nth(slot).boundingBox(); await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down(); await m.mouse.move(c0.x + c*pitch + c0.width/2, c0.y + r*pitch + c0.width/2, {steps:4}); await m.mouse.up(); await m.waitForTimeout(150); };
  await drop(0, 0, 7);  // 🍂付きで0行目を消す：💧2つ＋🍂1つ → 水6・肥料2
  let d = await get(); console.log(vp.tag, 'row with marks: water', d.resources.water, 'fert', d.resources.fertilizer, '(期待 6 / 2)');
  await m.waitForTimeout(500);
  // 2行目（マークなし）を、マークの付いた1マスで消す → 💧1つ分だけ
  await drop(1, 2, 7);
  d = await get(); console.log(vp.tag, 'row only 1 mark: water', d.resources.water, 'fert', d.resources.fertilizer, '(期待 9 / 2)');
  // ---- 畑の区画：次のコツと育て方カード ----
  await m.click('.tab[data-screen="farm"]');
  console.log(vp.tag, 'plot tip:', await m.locator('.plot-tip').first().textContent());
  await m.click('.plot >> nth=0 >> .book-btn'); await m.waitForTimeout(100);
  console.log(vp.tag, 'howto title:', await m.textContent('.modal-title'), '| cal plant', await m.locator('.cal-cell.plant').count(), 'harvest', await m.locator('.cal-cell.harvest').count(), '| rows', (await m.locator('.howto-row dt').allTextContents()).join('/'));
  await m.screenshot({ path: `${process.env.SP}/s13-${vp.tag}-howto.png` });
  await m.click('.modal-buttons .btn >> text=とじる');
  // ---- 種えらび → 育て方 → もどる → 育て方 → 植える ----
  await m.click('.plot >> nth=1 >> .btn.primary'); await m.waitForTimeout(100);
  await m.click('.seed-row >> nth=0 >> .seed-guide'); await m.waitForTimeout(100);
  const t1 = await m.textContent('.modal-title');
  await m.click('.modal-buttons .btn >> text=種えらびにもどる'); await m.waitForTimeout(100);
  const t2 = await m.textContent('.modal-title');
  await m.click('.seed-row >> nth=1 >> .seed-guide'); await m.waitForTimeout(100);
  const t3 = await m.textContent('.modal-title');
  await m.click('.modal-buttons .btn >> text=この野菜を植える'); await m.waitForTimeout(100);
  d = await get();
  console.log(vp.tag, 'seed flow:', t1, '→', t2, '→', t3, '→ planted', d.plots[1] && d.plots[1].vegId);
  await m.click('.plot >> nth=1 >> .btn.primary').catch(()=>{});
  // ---- 図鑑から ----
  await m.click('.tab[data-screen="zukan"]');
  await m.click('.zukan-card:not(.locked) >> .link-btn'); await m.waitForTimeout(100);
  console.log(vp.tag, 'zukan howto:', await m.textContent('.modal-title'));
  await m.click('.modal-buttons .btn >> text=とじる');
  await m.click('.tab[data-screen="farm"]'); await m.screenshot({ path: `${process.env.SP}/s13-${vp.tag}-farm.png`, fullPage: true });
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
