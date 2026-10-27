const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const set = (d) => m.evaluate(([k,d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY,d]);
  const base = {version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonWorkShown:true};
  // 置けないブロック（3つ目）：揺れて、持ち上がらない
  const b2 = Array.from({length:8},(_, r)=>Array(8).fill(-1).map((_, c)=> (r+c)%2===0 ? 1 : -1));
  await set({...base, puzzle:{board:b2, pieces:[{shape:0,color:1},{shape:9,color:4},{shape:9,color:5}], score:0, combo:0, movesSinceClear:0, over:false, bestBefore:0, undoUsed:true, shuffleUsed:true}});
  await m.reload(); await m.waitForTimeout(300);
  console.log(vp.tag,'no-fit', await m.locator('#tray .piece.no-fit').count());
  const sb = await m.locator('#tray .slot').nth(2).boundingBox();
  await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down(); await m.waitForTimeout(50);
  console.log(vp.tag,'shake', await m.locator('#tray .slot >> nth=2 >> .piece.shake').count(), '| ghost', await m.locator('.ghost').count());
  await m.mouse.up(); await m.waitForTimeout(400);
  console.log(vp.tag,'shake after', await m.locator('.piece.shake').count());
  // 色
  const col = await m.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sub').trim()); console.log(vp.tag,'--sub', col);
  // 季節の帯・種えらびの言葉、ことばの説明
  await set({...base, seasonIndex:1, plots:[null]}); await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="farm"]'); await m.click('.season-now'); await m.waitForTimeout(100);
  console.log(vp.tag,'note:', await m.textContent('.season-note'), '| ruby', await m.locator('.season-note ruby').count());
  console.log(vp.tag,'line(夏)', await m.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--line').trim()));
  await m.click('.plot[data-index="0"] .sow-btn'); await m.waitForTimeout(100);
  console.log(vp.tag,'seed heading:', await m.locator('.seed-heading').first().textContent());
  await m.click('.modal-buttons .btn >> nth=-1');
  await m.evaluate(() => HowTo.open(Farm.veg('tomato'))); await m.waitForTimeout(100);
  console.log(vp.tag,'tomato words', (await m.locator('.howto-words dt').allTextContents()).join(','));
  await m.click('.modal-buttons .btn >> text=とじる');
  await m.evaluate(() => HowTo.open(Farm.veg('spinach'))); await m.waitForTimeout(100);
  console.log(vp.tag,'spinach words', (await m.locator('.howto-words dt').allTextContents()).join(','));
  await m.screenshot({ path: `${process.env.SP}/s33-${vp.tag}-howto.png` });
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
