const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  const big = process.env.BIG || 'true';
  for (const vp of [{ width: 320, height: 568, tag: '320' }, { width: 375, height: 667, tag: '375' }, { width: 667, height: 375, tag: 'land' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const all = await m.evaluate(async () => (await (await fetch('data/vegetables.json')).json()));
  const hv = {}; all.vegetables.forEach(v => hv[v.id] = 2);
  const bigv = big === 'true' ? true : big === 'false' ? false : big;
  await m.evaluate(([k,hv,bigv]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonWorkShown:true,seasonIndex:1,harvested:hv,
    seasonClears:{spring:{count:1,y:2026,m:10,d:20,total:9,n:9,all:35}},
    resources:{water:30,fertilizer:30,coins:900}, plots:[{vegId:'tomato',stage:3},{vegId:'shiso',stage:1,watered:true},null],
    settings:{sound:false,vibrate:true,bigText:bigv!==false,textSize:bigv==='xl'?'xl':bigv===true?'big':'normal',volume:'normal'}})); }, [KEY,hv,bigv]);
  await m.reload(); await m.waitForTimeout(400);
  // はみ出しをさがす：画面の右をこえる要素・中身が切れている要素
  const scan = (label) => m.evaluate(([label, W]) => {
    const out = [];
    const sw = document.documentElement.scrollWidth; if (sw > W) out.push(`page scrollWidth ${sw}`);
    document.querySelectorAll('body *').forEach(e => {
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
      if (e.closest('.modal-body') && e.closest('.modal-body').scrollHeight > 0 && false) return;
      const name = e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '') + (e.id ? '#' + e.id : '');
      if (r.right > W + 1 && !e.closest('.harvest-pop')) out.push(`right ${Math.round(r.right)} ${name} "${(e.textContent||'').trim().slice(0,15)}"`);
      if (!e.matches('.icon-btn,.book-btn,.daily-close') && e.scrollWidth > e.clientWidth + 2 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll' && e.children.length === 0 && e.clientWidth > 0) out.push(`clip ${name} "${(e.textContent||'').trim().slice(0,15)}" ${e.scrollWidth}>${e.clientWidth}`);
    });
    return [...new Set(out)].slice(0, 12).map(x => label + ': ' + x);
  }, [label, vp.width]);
  const res = [];
  res.push(...await scan('puzzle'));
  await m.screenshot({ path: `${process.env.SP}/s38-${big}-${vp.tag}-puzzle.png` });
  await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(300);
  res.push(...await scan('farm'));
  await m.screenshot({ path: `${process.env.SP}/s38-${big}-${vp.tag}-farm.png`, fullPage: true });
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(300);
  res.push(...await scan('zukan'));
  await m.screenshot({ path: `${process.env.SP}/s38-${big}-${vp.tag}-zukan.png` });
  await m.evaluate(() => HowTo.open(Farm.veg('shiso'))); await m.waitForTimeout(200);
  res.push(...await scan('howto'));
  await m.screenshot({ path: `${process.env.SP}/s38-${big}-${vp.tag}-howto.png` });
  await m.keyboard.press('Escape'); await m.evaluate(() => Quiz.review(['tomato','potato','cabbage','cucumber','daikon','pumpkin'].map(Farm.veg))); await m.waitForTimeout(200);
  res.push(...await scan('quiz'));
  await m.screenshot({ path: `${process.env.SP}/s38-${big}-${vp.tag}-quiz.png` });
  await m.evaluate(() => Modal.close()); await m.click('#help-btn'); await m.waitForTimeout(200);
  res.push(...await scan('help'));
  await m.screenshot({ path: `${process.env.SP}/s38-${big}-${vp.tag}-help.png` });
  await m.click('.modal-buttons .btn >> nth=-1');
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(200);
  await m.click('.badge-season.got >> nth=0').catch(()=>{}); await m.waitForTimeout(200);
  res.push(...await scan('cert'));
  await m.screenshot({ path: `${process.env.SP}/s38-${big}-${vp.tag}-cert.png` });
  console.log(vp.tag, res.length ? '\n  ' + res.join('\n  ') : 'OK');
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
