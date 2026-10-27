const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const all = await m.evaluate(async () => (await (await fetch('data/vegetables.json')).json()));
  const vs = all.vegetables;
  const set = (d) => m.evaluate(([k,d]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(d)); }, [KEY,d]);
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  // 1) 古い保存：version なし・settings に bigText だけ・lastFamily や seasonClears なし
  await set({tutorialDone:true,harvested:{tomato:3},resources:{water:5,fertilizer:2,coins:100},plots:[null,null],settings:{sound:false,vibrate:true,bigText:true}});
  await m.reload(); await m.waitForTimeout(300);
  let s = await get();
  console.log(vp.tag,'old save:', JSON.stringify({v:s.version, size:s.settings.textSize, big:s.settings.bigText, harvested:s.harvested, res:s.resources, lf:Array.isArray(s.lastFamily)||typeof s.lastFamily, sc:typeof s.seasonClears}), '| html', await m.evaluate(() => document.documentElement.className));
  // 2) 変な値は normal に
  await set({version:2,tutorialDone:true,settings:{textSize:'huge'}}); await m.reload(); await m.waitForTimeout(200);
  console.log(vp.tag,'bad size ->', (await get()).settings.textSize);
  // 3) 文字ボタン：ふつう→大きめ→とても大きい→ふつう
  await set({version:2,tutorialDone:true,onboardStep:2,tipHiddenDay:'x',seasonWorkShown:true}); await m.reload(); await m.waitForTimeout(200);
  const seq = [];
  for (let i=0;i<4;i++){ await m.click('#help-btn'); await m.waitForTimeout(80);
    const lb = await m.locator('.modal-buttons .btn', { hasText: '文字：' }).textContent(); seq.push(lb + '/' + (await m.evaluate(() => document.documentElement.className.trim() || '-')));
    await m.locator('.modal-buttons .btn', { hasText: '文字：' }).click(); await m.waitForTimeout(80);
    await m.evaluate(() => Modal.close()); }
  console.log(vp.tag,'text cycle', seq.join(' → '), '| saved', (await get()).settings.textSize);
  // 4) なかまのクイズ
  const hv = {}; vs.forEach(v => hv[v.id] = 1);
  await set({version:2,tutorialDone:true,onboardStep:2,tipHiddenDay:'x',seasonWorkShown:true,harvested:hv}); await m.reload(); await m.waitForTimeout(200);
  let fam = 0, bad = 0, sample = '';
  for (let r=0;r<12;r++){
    await m.evaluate((ids) => Quiz.review(ids.map(Farm.veg)), vs.map(v=>v.id));
    await m.waitForTimeout(60);
    for (let i=0;i<5;i++){
      if (!(await m.locator('.quiz-choice').count())) break;
      const qt = await m.textContent('.quiz-q');
      const isFam = qt.includes('何のなかま');
      if (isFam) { fam++; const n = await m.locator('.quiz-choice').count(); if (n !== 4) bad++; }
      await m.locator('.quiz-choice').first().click(); await m.waitForTimeout(50);
      const body = await m.textContent('.modal-body');
      if (/undefined|\{/.test(body)) bad++;
      if (isFam && !sample) { sample = qt + ' / ' + body.replace(/\s+/g,' ').slice(0,160); await m.screenshot({ path: `${process.env.SP}/s39-${vp.tag}-family.png` }); }
      await m.click('.modal-buttons .btn.primary', {timeout:2000}).catch(()=>{}); await m.waitForTimeout(50);
    }
    await m.evaluate(() => Modal.close());
  }
  console.log(vp.tag,'family questions', fam, 'bad', bad, '\n   ', sample);
  // 5) 収穫のおすすめ：各季節の基本野菜で空にならない
  const empties = await m.evaluate((vs) => {
    const out = [];
    vs.forEach(v => { if (!v.family || v.perennial) return;
      v.seasons.forEach(sid => {
        const list = vs.filter(x => x.seasons.includes(sid) && !Missions.isLocked(x) && !x.perennial && x.family && x.family !== v.family);
        if (!list.length) out.push(v.id + '@' + sid);
      }); });
    return out;
  }, vs);
  console.log(vp.tag,'nextSow empty cases', JSON.stringify(empties));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
