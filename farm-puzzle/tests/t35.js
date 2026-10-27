const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 844, height: 390, tag: 'land' }, { width: 667, height: 375, tag: 'land-s' }, { width: 768, height: 1024, tag: 'ipad' }, { width: 375, height: 667, tag: 'se' }]) {
  const m = await b.newPage({ viewport: vp, hasTouch: false });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  await m.evaluate(k => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonWorkShown:true})), KEY);
  await m.reload(); await m.waitForTimeout(400);
  const r = await m.evaluate(() => {
    const q = (s) => document.querySelector(s).getBoundingClientRect();
    const tabs = q('.tabs'), board = q('#board'), tray = q('#tray');
    return { board: Math.round(board.width), boardBottom: Math.round(board.bottom), trayBottom: Math.round(tray.bottom), tabsTop: Math.round(tabs.top), sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, h: innerHeight };
  });
  console.log(vp.tag, JSON.stringify(r), (r.boardBottom <= r.tabsTop && r.trayBottom <= r.tabsTop) ? '収まる' : 'はみ出し');
  await m.screenshot({ path: `${process.env.SP}/s35-${vp.tag}.png` });
  // 1つ置いてみる
  const c0 = await m.locator('#board .cell').nth(0).boundingBox(); const sb = await m.locator('#tray .slot').nth(0).boundingBox();
  const before = await m.evaluate(k => JSON.parse(localStorage.getItem(k)).puzzle.pieces.filter(Boolean).length, KEY);
  await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down(); await m.mouse.move(c0.x+c0.width*1.5, c0.y+c0.height*1.5 + (vp.tag==='ipad'||vp.tag==='se'?0:0), {steps:6}); await m.mouse.up(); await m.waitForTimeout(300);
  const after = await m.evaluate(k => JSON.parse(localStorage.getItem(k)).puzzle.pieces.filter(Boolean).length, KEY);
  console.log(vp.tag, 'pieces', before, '->', after);
  // 畑のお知らせ位置
  await m.click('.tab[data-screen="farm"]'); await m.evaluate(() => toast('テスト')); await m.waitForTimeout(300);
  const t = await m.evaluate(() => { const a=document.querySelector('#toast').getBoundingClientRect(); const bb=document.querySelector('.bulk-bar'); return {toastBottom: Math.round(a.bottom), bulkTop: bb ? Math.round(bb.getBoundingClientRect().top) : null}; });
  console.log(vp.tag, 'farm toast', JSON.stringify(t));
  await m.close();
  }
  // お知らせの順番：大事なお知らせのあとに来たものは消えてから
  const m = await b.newPage({ viewport: { width: 375, height: 667 } });
  await m.goto('http://localhost:8765/'); await m.waitForTimeout(300);
  await m.evaluate(() => { toast('実った！', 800, true); toast('ふつうのお知らせ', 800); });
  const t1 = await m.textContent('#toast'); await m.waitForTimeout(1300); const t2 = await m.textContent('#toast');
  console.log('queue', t1, '→', t2);
  await m.close();
  console.log('errors', errors); await b.close();
})();
