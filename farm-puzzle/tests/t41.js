const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message));
  await m.goto('http://localhost:8765/');
  await m.evaluate(k => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,onboardStep:2,tipHiddenDay:'x',seasonWorkShown:true})); }, KEY);
  await m.reload(); await m.waitForTimeout(300);
  // 1つ置く
  const sb = await m.locator('#tray .slot').nth(0).boundingBox(); const bb = await m.locator('#board').boundingBox();
  await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down();
  await m.mouse.move(bb.x+bb.width/2, bb.y+bb.height/2, {steps:8}); await m.mouse.up(); await m.waitForTimeout(300);
  const before = await m.evaluate(() => ({ filled: document.querySelectorAll('#board .cell.filled').length, score: document.querySelector('#score')?.textContent, tray: [...document.querySelectorAll('#tray .slot')].map(s => s.querySelectorAll('.cell').length).join(',') }));
  await m.reload(); await m.waitForTimeout(300);
  const after = await m.evaluate(() => ({ filled: document.querySelectorAll('#board .cell.filled').length, score: document.querySelector('#score')?.textContent, tray: [...document.querySelectorAll('#tray .slot')].map(s => s.querySelectorAll('.cell').length).join(',') }));
  console.log(vp.tag, 'before', JSON.stringify(before), 'after reload', JSON.stringify(after), JSON.stringify(before) === JSON.stringify(after) ? 'SAME' : 'DIFF');
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
