const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  for (const mode of ['bakFull', 'allFail', 'ok']) {
    const ctx = await b.newContext({ viewport: vp }); const m = await ctx.newPage();
    m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
    await m.goto('http://localhost:8765/data/messages.json');
    await m.evaluate(k => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,onboardStep:2,tipHiddenDay:'x',seasonWorkShown:true,harvested:{tomato:1},resources:{water:3,fertilizer:0,coins:10},plots:[null,null]})); }, KEY);
    // 容量いっぱいのまね：bakFull＝予備を書くときだけ失敗、allFail＝いつも失敗（本体の書きこみも）
    await m.addInitScript((mode) => {
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (mode === 'bakFull' && k === 'hatake-puzzle-save-bak') throw new DOMException('full', 'QuotaExceededError');
        if (mode === 'bakFull' && k === 'hatake-puzzle-save' && localStorage.getItem('hatake-puzzle-save-bak')) throw new DOMException('full', 'QuotaExceededError');
        if (mode === 'allFail') throw new DOMException('full', 'QuotaExceededError');
        return orig.call(this, k, v);
      };
    }, mode);
    await m.goto('http://localhost:8765/'); await m.waitForTimeout(300);
    // 遊ぶ：1つ置いて保存させる
    const sb = await m.locator('#tray .slot').nth(0).boundingBox(); const bb = await m.locator('#board').boundingBox();
    await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down(); await m.mouse.move(bb.x+bb.width/2, bb.y+bb.height/2, {steps:8}); await m.mouse.up(); await m.waitForTimeout(300);
    const toastShown = await m.evaluate(() => document.getElementById('toast').classList.contains('show') ? document.getElementById('toast').textContent : '');
    // 2回目も置く → お知らせは1回だけ（同じ文が2回出ていない）
    const saved = await m.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); return { harvested: s.harvested, filled: (s.puzzle && s.puzzle.board || []).flat().filter(x => x >= 0).length }; }, KEY);
    console.log(vp.tag, mode, '| toast:', toastShown.slice(0,28) || '-', '| saved', JSON.stringify(saved), '| bak', await m.evaluate(() => !!localStorage.getItem('hatake-puzzle-save-bak')));
    await ctx.close();
  }
  }
  console.log('errors', errors); await b.close();
})();
