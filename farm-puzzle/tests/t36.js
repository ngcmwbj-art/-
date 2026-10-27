const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const base = {version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonWorkShown:true};
  const all = await m.evaluate(async () => (await (await fetch('data/vegetables.json')).json()));
  const vs = all.vegetables || all; const harvested = {}; vs.forEach(v => harvested[v.id] = 1);
  await m.evaluate(([k,b,hv]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({...b, harvested:hv})); }, [KEY,base,harvested]);
  await m.reload(); await m.waitForTimeout(300);
  // FAQ
  await m.click('#help-btn'); await m.waitForTimeout(100);
  console.log(vp.tag,'faq count', await m.locator('.faq details').count());
  await m.click('.faq summary >> nth=0'); await m.waitForTimeout(100);
  console.log(vp.tag,'faq open', await m.locator('.faq details[open] p').textContent());
  const mb = await m.locator('.modal').boundingBox(); console.log(vp.tag,'modal h', Math.round(mb.height), 'vh', vp.height);
  await m.screenshot({ path: `${process.env.SP}/s36-faq-${vp.tag}.png` });
  await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(200);   // 遊び方
  for (let i=0;i<3;i++){ await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(100); }
  console.log(vp.tag,'guide4', (await m.textContent('.modal-body')).includes('🔇'));
  await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(100);
  // 図鑑のミニ知識
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(200);
  const zt = await m.locator('.zukan-tips').allTextContents();
  console.log(vp.tag,'zukan tips ruby', await m.locator('.zukan-tips ruby').count(), '| braces', zt.join('').includes('{'));
  // 育て方カード（落花生：柄）
  await m.evaluate(() => HowTo.open(Farm.veg ? Farm.veg('peanut') || null : null)).catch(()=>{});
  await m.waitForTimeout(200);
  if (await m.locator('.howto-tips').count()) {
    console.log(vp.tag,'howto tips ruby', await m.locator('.howto-tips ruby').count(), '| pests', await m.locator('.howto-list').textContent().then(t=>t.includes('{')));
    await m.screenshot({ path: `${process.env.SP}/s36-howto-${vp.tag}.png` });
    await m.keyboard.press('Escape'); await m.click('.modal-buttons .btn >> nth=-1').catch(()=>{});
  } else console.log(vp.tag,'howto not opened');
  await m.waitForTimeout(200);
  // クイズ：問題・答えに印 { } が残らない（数回）
  await m.keyboard.press('Escape').catch(()=>{});
  let braces = false, n = 0, pestQ = 0;
  for (let r=0;r<8;r++){
    await m.evaluate(() => { document.querySelectorAll('.modal-buttons .btn').forEach(()=>{}); Quiz.review(Farm.seasonalVegs ? window.__all || [] : []); }).catch(()=>{});
    await m.evaluate((vs) => Quiz.review(vs.map(v => Farm.veg(v.id))), vs);
    await m.waitForTimeout(100);
    for (let i=0;i<5;i++){
      const c = m.locator('.quiz-choice').first(); if (!(await c.count())) break;
      const t = await m.textContent('.modal-body'); if (t.includes('{')) braces = true; if (t.includes('病気') || t.includes('虫')) pestQ++; n++;
      await c.click({timeout:2000}); await m.waitForTimeout(60);
      if ((await m.textContent('.modal-body')).includes('{')) braces = true;
      await m.click('.modal-buttons .btn.primary', {timeout:2000}).catch(()=>{}); await m.waitForTimeout(60);
    }
    const t = await m.textContent('.modal-body').catch(()=>''); if (t.includes('{')) braces = true;
    await m.click('.modal-buttons .btn >> nth=-1', {timeout:2000}).catch(()=>{}); await m.waitForTimeout(60);
  }
  console.log(vp.tag,'quiz screens', n, 'braces', braces, 'pestQ', pestQ);
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
