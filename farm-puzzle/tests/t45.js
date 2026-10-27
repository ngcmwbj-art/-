const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  const day = (n) => new Date(Date.now() - n*86400000).toISOString().slice(0,10);
  const base = {version:2,tutorialDone:true,onboardStep:2,seasonWorkShown:true,harvested:{tomato:2},plots:[{vegId:'tomato',stage:1},null]};
  for (const [label, last] of [['5days', day(5)], ['1day', day(1)], ['none', null]]) {
    // ゲームのページは閉じるときにも保存するので、ゲームのないページで書いてから開く
    await m.goto('http://localhost:8765/data/messages.json');
    await m.evaluate(([k,d]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(d)); }, [KEY, {...base, lastPlayed:last}]);
    await m.goto('http://localhost:8765/'); await m.waitForTimeout(300);
    await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(150);
    const w = await m.locator('.daily-tip.welcome').count();
    const saved = await m.evaluate(k => JSON.parse(localStorage.getItem(k)).lastPlayed, KEY);
    console.log(vp.tag, label, 'welcome', w, w ? (await m.textContent('.daily-tip.welcome')).replace(/\s+/g,' ') : '', '| saved lastPlayed', saved, '| plots kept', await m.evaluate(k => JSON.parse(localStorage.getItem(k)).plots[0].vegId, KEY));
    if (w) { await m.screenshot({ path: `${process.env.SP}/s45-${vp.tag}.png` }); await m.click('.daily-tip.welcome .daily-close'); await m.waitForTimeout(100);
      console.log(vp.tag, '  after close welcome', await m.locator('.daily-tip.welcome').count(), 'normal tip', await m.locator('.daily-tip').count()); }
  }
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
