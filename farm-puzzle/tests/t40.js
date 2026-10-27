const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
// 初めての人の通し：まっさらの保存から、遊び方 → パズル → 種まき → 育てる → 収穫 → 図鑑
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const size of ['normal','big','xl']) for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(size+vp.tag+': '+e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  await m.evaluate(([k,size]) => { localStorage.clear(); if (size !== 'normal') localStorage.setItem(k, JSON.stringify({settings:{textSize:size,bigText:true}})); }, [KEY,size]);
  await m.reload(); await m.waitForTimeout(400);
  const tag = size + '-' + vp.tag; const log = [];
  // 遊び方
  let pages = 0;
  while (await m.locator('#modal:not(.hidden)').count() && pages < 8) {
    const t = await m.textContent('.modal-title'); log.push('modal:' + t);
    const box = await m.locator('.modal').boundingBox(); if (box.y < 0 || box.y + box.height > vp.height + 1) log.push('  !! modal out of screen ' + Math.round(box.y) + '+' + Math.round(box.height));
    if (pages === 0) await m.screenshot({ path: `${process.env.SP}/s40-${tag}-guide1.png` });
    await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(150); pages++;
  }
  log.push('goal: ' + (await m.textContent('#goal')));
  await m.screenshot({ path: `${process.env.SP}/s40-${tag}-puzzle.png` });
  // 目標を押して畑へ
  await m.click('#goal'); await m.waitForTimeout(300);
  log.push('screen: ' + await m.evaluate(() => document.body.dataset.screen) + ' glow: ' + await m.locator('.glow').count());
  await m.screenshot({ path: `${process.env.SP}/s40-${tag}-farm.png` });
  // 種まき
  const sow = m.locator('.sow-btn').first();
  if (await sow.count()) { await sow.click(); await m.waitForTimeout(200);
    log.push('seed modal: ' + (await m.textContent('.modal-title').catch(()=> '-')));
    await m.screenshot({ path: `${process.env.SP}/s40-${tag}-seeds.png` });
    await m.locator('.modal-body .seed').first().click(); await m.waitForTimeout(200);
    log.push('toast: ' + (await m.textContent('#toast')).replace(/\n/g,' / ').slice(0,80));
  } else log.push('!! no sow button');
  while (await m.locator('#modal:not(.hidden)').count()) { log.push('modal:' + await m.textContent('.modal-title')); await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(100); }
  log.push('goal after sow: ' + (await m.textContent('#goal')));
  // 区画の作業ボタンが画面内か
  const act = m.locator('.plot .plot-action').first();
  if (await act.count()) { const r = await act.boundingBox(); log.push('plot action: ' + (await act.textContent()).trim() + ' y=' + Math.round(r.y)); }
  console.log(tag + '\n  ' + log.join('\n  '));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
