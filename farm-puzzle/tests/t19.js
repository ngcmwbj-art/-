const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 390, height: 844, tag: 'sp' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const spring = ['potato','spinach','cabbage','onion','komatsuna'];
  await m.evaluate(([k]) => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,harvested:{tomato:2,potato:1,spinach:1,cabbage:1,radish:1,lettuce:1,edamame:1,cucumber:1}})), [KEY]);
  await m.reload(); await m.waitForTimeout(300);
  // 文字の大きさ
  await m.click('#help-btn'); await m.click('.modal-buttons .btn >> text=文字：ふつう'); await m.waitForTimeout(80);
  console.log(vp.tag,'help btns', (await m.locator('.modal-buttons .btn').allTextContents()).join(' | '));
  await m.click('.modal-buttons .btn >> text=とじる');
  const fs = await m.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  const r = await m.evaluate(() => { const t=document.querySelector('#tray').getBoundingClientRect(), n=document.querySelector('.tabs').getBoundingClientRect(), bd=document.querySelector('#board').getBoundingClientRect(); return {trayBottom:Math.round(t.bottom), tabsTop:Math.round(n.top), board:Math.round(bd.width), scrollW:document.documentElement.scrollWidth, w:innerWidth}; });
  console.log(vp.tag,'big font', fs, JSON.stringify(r), r.trayBottom<=r.tabsTop?'収まる':'はみ出し');
  await m.screenshot({ path: `${process.env.SP}/s19-${vp.tag}-big.png` });
  const saved = await m.evaluate(k => JSON.parse(localStorage.getItem(k)).settings, KEY); console.log(vp.tag,'saved', JSON.stringify(saved));
  // 図鑑バッジ
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(100);
  console.log(vp.tag,'badges got', await m.locator('.badge-season.got').count(), '/', await m.locator('.badge-season').count());
  await m.screenshot({ path: `${process.env.SP}/s19-${vp.tag}-zukan.png` });
  // おさらいクイズを20問ほど回して種類を数える
  const kinds = {};
  await m.click('.review-box .btn');
  for (let i=0;i<20;i++){
    await m.waitForTimeout(40);
    const q = await m.textContent('.quiz-q'); const k = q.includes('病気')?'pests':q.includes('プランター')?'planter':q.includes('収穫')?'harvest':'plant';
    kinds[k]=(kinds[k]||0)+1;
    const n = await m.locator('.quiz-choice').count(); if (n<3) console.log('choices<3', q);
    if (k==='pests' && !kinds.shot) { kinds.shot=1; await m.screenshot({ path: `${process.env.SP}/s19-${vp.tag}-quiz.png` }); }
    await m.click('.quiz-choice >> nth=0'); await m.waitForTimeout(40);
    await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(40);
    if ((i+1)%5===0) { await m.click('.modal-buttons .btn.primary'); }
  }
  console.log(vp.tag,'kinds', JSON.stringify(kinds));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
