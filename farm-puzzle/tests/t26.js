const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  // 春：基本の4種は収穫ずみ、レタス（未登録）が収穫どき
  await m.evaluate(k => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'',onboardStep:2,seasonWorkShown:true,seasonIndex:0,
    harvested:{potato:2,spinach:1,cabbage:1,radish:3},seasonHarvested:['potato','spinach','cabbage','radish'],plots:[{vegId:'lettuce',stage:3},{vegId:'potato',stage:0}]})), KEY);
  await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(100);
  console.log(vp.tag,'daily tip ruby', await m.locator('.daily-text ruby').count(), '|', (await m.textContent('.daily-text')).slice(0,30));
  // 育て方カード：読みがな
  await m.click('.plot[data-index="1"] .book-btn'); await m.waitForTimeout(100);
  const rows = await m.locator('.howto-row').evaluateAll(els => els.map(e => e.querySelector('dt').textContent + ':' + e.querySelectorAll('ruby').length));
  console.log(vp.tag,'howto ruby', rows.join(' '), '| raw braces?', (await m.textContent('.howto')).includes('{'));
  await m.locator('.howto-list').screenshot({ path: `${process.env.SP}/s26-${vp.tag}-ruby.png` });
  await m.click('.modal-buttons .btn');
  // 収穫 → 図鑑の数 → 賞状
  await m.click('.plot[data-index="0"] .plot-action'); await m.waitForTimeout(150);
  console.log(vp.tag,'toast:', (await m.textContent('#toast')).replace(/\n/g,' / '));
  await m.waitForTimeout(500);
  const titles=[];
  for (let k=0;k<5 && await m.locator('#modal:not(.hidden)').count();k++){
    const t = await m.textContent('.modal-title'); titles.push(t);
    if (await m.locator('.certificate').count()) { console.log(vp.tag,'cert:', (await m.textContent('.certificate')).replace(/\s+/g,' ')); await m.locator('.modal').screenshot({ path: `${process.env.SP}/s26-${vp.tag}-cert.png` }); }
    await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(100);
  }
  console.log(vp.tag,'modals', titles.join(' → '));
  // 読みがなオフ
  await m.click('#help-btn'); await m.click('.modal-buttons .btn >> text=読みがな：オン'); await m.click('.modal-buttons .btn >> text=とじる');
  await m.click('.tab[data-screen="farm"]'); await m.click('.plot[data-index="1"] .book-btn'); await m.waitForTimeout(100);
  console.log(vp.tag,'ruby off', await m.locator('.howto ruby').count(), '| raw braces?', (await m.textContent('.howto')).includes('{'));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
