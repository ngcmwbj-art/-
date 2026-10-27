const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
  const m = await ctx.newPage();
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const put = (d) => m.evaluate(([k,d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY,d]);
  const shot = (n) => m.screenshot({ path: process.env.SP + '/' + n + '.png' });

  // --- 1. 初回ガイド ---
  await m.goto('http://localhost:8765/'); await m.waitForTimeout(300);
  console.log('[guide]', (await m.textContent('.modal-title')));
  await shot('g1');
  await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(50);
  console.log('[guide]', (await m.textContent('.modal-title')));
  await m.click('.modal-buttons .btn >> text=スキップ'); await m.waitForTimeout(50);
  console.log('[guide] closed:', await m.locator('#modal.hidden').count()===1, 'saved:', (await get()).tutorialDone);
  await m.reload(); await m.waitForTimeout(300);
  console.log('[guide] not shown again:', await m.locator('#modal.hidden').count()===1);
  await shot('p-top');

  // --- 2. 古い保存データ（version 1）の引きつぎ ---
  await put({version:1, highScore:120, resources:{water:5,fertilizer:3,coins:40}, seasonIndex:1, plots:[{vegId:'tomato',stage:2},{vegId:'spinach',stage:0}], harvested:{tomato:1}});
  await m.reload(); await m.waitForTimeout(300);
  const d2 = await get();
  console.log('[migrate] version', d2.version, 'plots', JSON.stringify(d2.plots), 'coins', d2.resources.coins, 'harvested', JSON.stringify(d2.harvested), 'best', d2.highScore, 'guide hidden', await m.locator('#modal.hidden').count()===1);

  // --- 3. 育ち時間・上限 ---
  const board = Array.from({length:8},()=>Array(8).fill(-1));
  for (let c=0;c<7;c++) { board[0][c]=2; board[1][c]=2; board[2][c]=2; }
  await put({version:2, tutorialDone:true, firstGrowDone:false, highScore:0, resources:{water:29,fertilizer:10,coins:0}, seasonIndex:0, plots:[{vegId:'potato',stage:1,growLeft:0}, null], harvested:{}, settings:{sound:true,vibrate:true},
    puzzle:{board, pieces:[{shape:0,color:1},{shape:2,color:4},{shape:4,color:5}], score:0, combo:0, movesSinceClear:0, over:false, bestBefore:0}});
  await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="farm"]');
  await m.click('.plot >> nth=0 >> .btn');  // 追肥
  console.log('[grow] button:', await m.textContent('.plot >> nth=0 >> .btn'), 'disabled', await m.locator('.plot >> nth=0 >> .btn').isDisabled());
  await shot('f-growing');
  await m.click('.tab[data-screen="puzzle"]');
  const drop = async (slot, r, c, rows, cols) => {
    const c0 = await m.locator('#board .cell').nth(0).boundingBox(); const c1 = await m.locator('#board .cell').nth(1).boundingBox();
    const pitch = c1.x - c0.x, gap = pitch - c0.width;
    const sb = await m.locator('#tray .slot').nth(slot).boundingBox();
    await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down();
    await m.mouse.move(c0.x + c*pitch + (cols*pitch-gap)/2, c0.y + r*pitch + (rows*pitch-gap)/2, { steps: 4 }); await m.mouse.up();
    await m.waitForTimeout(150);
  };
  // 1×1 を (0,7) → 1列消える（水 29→30 で上限、ジャガイモは1列で実る）
  await drop(0, 0, 7, 1, 1);
  let d3 = await get();
  console.log('[grow] after 1 line: plot', JSON.stringify(d3.plots[0]), 'water', d3.resources.water, 'toast:', await m.textContent('#toast'));
  await shot('p-ripen');
  // --- 5. 一手もどす ---
  console.log('[undo] visible', await m.locator('#undo-btn:not([hidden])').count());
  await m.click('#undo-btn'); await m.waitForTimeout(100);
  d3 = await get();
  console.log('[undo] plot', JSON.stringify(d3.plots[0]), 'water', d3.resources.water, 'filled', await m.locator('#board .cell.filled').count(), 'button hidden', await m.locator('#undo-btn[hidden]').count(), 'undoUsed', d3.puzzle.undoUsed);
  await drop(0, 0, 7, 1, 1);
  d3 = await get();
  console.log('[undo] replaced: plot stage', d3.plots[0].stage, 'undo still hidden', await m.locator('#undo-btn[hidden]').count());
  // 上限チェック：縦2を(1,7)(2,7)へ → 2列。水はもう30なので増えない
  await drop(1, 1, 7, 2, 1);
  d3 = await get();
  console.log('[cap] water', d3.resources.water, 'fert', d3.resources.fertilizer);
  // 収穫 → 2回目の追肥は3列
  await m.click('.tab[data-screen="farm"]');
  await m.click('.plot >> nth=0 >> .btn'); await m.waitForTimeout(800);
  while (await m.locator('#modal:not(.hidden)').count()) { await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(100); }
  await m.click('.plot >> nth=0 >> .btn'); await m.click('.seed >> text=ほうれん草');
  await m.click('.plot >> nth=0 >> .btn'); await m.click('.plot >> nth=0 >> .btn');
  console.log('[grow] 2nd time button:', await m.textContent('.plot >> nth=0 >> .btn'));
  await shot('f-after');

  // --- 6. ゲームオーバー画面から一手もどす ---
  const b2 = Array.from({length:8},(_, r)=>Array(8).fill(-1).map((_, c)=> (r+c)%2===0 ? 1 : -1));
  await put({...(await get()), puzzle:{board:b2, pieces:[{shape:0,color:1},{shape:9,color:4},{shape:9,color:5}], score:3, combo:0, movesSinceClear:0, over:false, bestBefore:0}});
  await m.reload(); await m.waitForTimeout(300);
  const s0 = (await get()).seasonIndex;
  await drop(0, 0, 1, 1, 1); await m.waitForTimeout(1000);
  console.log('[gameover] buttons:', (await m.locator('.modal-buttons .btn').allTextContents()).join(' | '));
  await shot('p-gameover');
  await m.click('.modal-buttons .btn >> text=一手もどす'); await m.waitForTimeout(100);
  let d6 = await get();
  console.log('[gameover] after undo over=', d6.puzzle.over, 'filled', await m.locator('#board .cell.filled').count(), 'season same', d6.seasonIndex===s0);
  await drop(0, 0, 1, 1, 1); await m.waitForTimeout(1000);
  console.log('[gameover] 2nd buttons:', (await m.locator('.modal-buttons .btn').allTextContents()).join(' | '));
  await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(100);
  d6 = await get();
  console.log('[gameover] season advanced', d6.seasonIndex === (s0+1)%4, 'new board empty', await m.locator('#board .cell.filled').count()===0);

  // --- 7. 設定 ---
  await m.click('#sound-btn'); await m.click('#help-btn');
  console.log('[help]', (await m.locator('.modal-buttons .btn').allTextContents()).join(' | '));
  await shot('help');
  await m.click('.modal-buttons .btn >> text=振動'); 
  console.log('[help] after', (await m.locator('.modal-buttons .btn').allTextContents()).join(' | '), 'settings', JSON.stringify((await get()).settings));
  await m.click('.modal-buttons .btn >> text=とじる');
  console.log('errors', errors);
  await b.close();
})();
