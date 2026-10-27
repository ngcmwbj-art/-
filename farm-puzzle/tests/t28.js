const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  const m = await b.newPage({ viewport: { width: 360, height: 640 } });
  m.on('pageerror', e => errors.push(e.message));
  await m.goto('http://localhost:8765/');
  // はみ出しを調べる：横スクロール、モーダルの中で幅を越えた要素
  const over = (label) => m.evaluate((label) => {
    const res = { label, pageW: document.documentElement.scrollWidth };
    const bad = [];
    document.querySelectorAll('#app *, #modal *').forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed') bad.push((e.className || e.tagName) + ':' + Math.round(r.right));
    });
    res.bad = [...new Set(bad)].slice(0, 6);
    return res;
  }, label);
  for (const si of [0,1,2,3]) {
    await m.evaluate(([k,si]) => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'',onboardStep:2,seasonWorkShown:true,seasonIndex:si,settings:{sound:false,vibrate:true,bigText:true},
      resources:{water:30,fertilizer:20,coins:300},harvested:{potato:3,tomato:2,daikon:1,napa:1,cabbage:1,okra:1},plots:[{vegId:'potato',stage:1},{vegId:'tomato',stage:3},{vegId:'daikon',stage:2,growLeft:3},null]})), [KEY,si]);
    await m.reload(); await m.waitForTimeout(300);
    console.log(JSON.stringify(await over('puzzle s'+si)));
    await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(150);
    console.log(JSON.stringify(await over('farm s'+si)));
    await m.screenshot({ path: `${process.env.SP}/s28-farm-${si}.png`, fullPage: true });
    await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(150);
    console.log(JSON.stringify(await over('zukan s'+si)));
    if (si===0) await m.screenshot({ path: `${process.env.SP}/s28-zukan.png`, fullPage: true });
    await m.click('.zukan-card .link-btn >> nth=0'); await m.waitForTimeout(150);
    console.log(JSON.stringify(await over('howto s'+si)));
    if (si===0) await m.locator('.modal').screenshot({ path: `${process.env.SP}/s28-howto.png` });
    await m.click('.modal-buttons .btn >> text=とじる');
    await m.click('.tab[data-screen="farm"]'); await m.click('.plot[data-index="3"] .sow-btn'); await m.waitForTimeout(150);
    console.log(JSON.stringify(await over('seed s'+si)));
    await m.click('.modal-buttons .btn >> nth=-1');
  }
  console.log('errors', errors); await b.close();
})();
