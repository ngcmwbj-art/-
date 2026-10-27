const { chromium } = require('playwright');
const KEY = 'hatake-puzzle-save';
// QA の残り：チャレンジ野菜を全部解放したときの種えらび／水50・肥料30の上限ちょうどでマークを消したとき
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 320, height: 568, tag: '320' }, { width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
    const m = await b.newPage({ viewport: vp });
    m.on('pageerror', (e) => errors.push(e.message)); m.on('console', (x) => x.type() === 'error' && errors.push(x.text()));
    await m.goto('http://localhost:8765/data/messages.json');
    const all = await (await fetch('http://localhost:8765/data/vegetables.json')).json();
    const unlocked = all.vegetables.filter((v) => v.unlock).map((v) => v.id);
    await m.evaluate(([k, d]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(d)); }, [KEY, {
      version: 2, tutorialDone: true, onboardStep: 2, tipHiddenDay: 'x', seasonWorkShown: true, seasonIndex: 1,
      unlocked, harvested: { tomato: 1 }, resources: { water: 50, fertilizer: 30, coins: 0 }, plots: [null, null],
      settings: { textSize: 'xl', bigText: true },
    }]);
    await m.goto('http://localhost:8765/'); await m.waitForTimeout(300);
    // 上限ちょうどで列を消しても、こえない
    await m.evaluate(() => { Farm.gainFromLines && Farm.gainFromLines({ lines: 2, combo: 1, marks: { water: 5, fertilizer: 5 } }); });
    await m.waitForTimeout(150);
    const res = await m.evaluate((k) => JSON.parse(localStorage.getItem(k)).resources, KEY);
    console.log(vp.tag, 'resources after gain at max', JSON.stringify(res), res.water <= 50 && res.fertilizer <= 30 ? 'OK' : 'OVER');
    // 種えらび：夏の10種（チャレンジ5種も）が並び、窓が画面からはみ出さない・下のボタンが見える
    await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(150);
    await m.locator('.sow-btn').first().click(); await m.waitForTimeout(200);
    const seeds = await m.locator('.modal-body .seed').count();
    const box = await m.locator('.modal').boundingBox();
    const btn = await m.locator('.modal-buttons .btn').last().boundingBox();
    console.log(vp.tag, 'seeds', seeds, '| modal in screen', box.y >= 0 && box.y + box.height <= vp.height + 1, '| button visible', btn.y + btn.height <= vp.height + 1,
      '| page scroll width', await m.evaluate(() => document.documentElement.scrollWidth));
    await m.locator('.modal-body .seed').last().click(); await m.waitForTimeout(200);
    const s = await m.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
    console.log(vp.tag, 'sowed last seed', JSON.stringify(s.plots[0]));
    await m.close();
  }
  console.log('errors', errors); await b.close();
})();
