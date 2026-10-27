const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 390, height: 844, tag: 'sp' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  await m.goto('http://localhost:8765/');
  // 前の形のデータ：いちごを育てたことがある（→最初から使える）、春の基本4種は収穫ずみ
  await m.evaluate(k => localStorage.setItem(k, JSON.stringify({version:2, tutorialDone:true, firstGrowDone:true, highScore:120, resources:{water:30,fertilizer:20,coins:0}, seasonIndex:0,
    plots:[{vegId:'lettuce',stage:3,growLeft:0}, null], harvested:{strawberry:1, potato:1}, seasonHarvested:['potato','spinach','cabbage','radish']})), KEY);
  await m.reload(); await m.waitForTimeout(300);
  let d = await get();
  console.log(vp.tag, 'unlocked at start:', JSON.stringify(d.unlocked), '| hud', await m.textContent('#hud-season'));
  await m.click('.tab[data-screen="farm"]');
  console.log(vp.tag, 'banner:', (await m.locator('.season-veg').allTextContents()).map(s=>s.replace(/\s+/g,' ')).join(' || '));
  // 種えらび
  await m.click('.plot >> nth=1 >> .btn.primary'); await m.waitForTimeout(100);
  console.log(vp.tag, 'headings:', (await m.locator('.seed-heading').allTextContents()).join(' / '), '| locked rows', await m.locator('.seed-row.locked').count());
  await m.screenshot({ path: `${process.env.SP}/s14-${vp.tag}-seeds.png` });
  // ロックされたそら豆（クイズ）を押す → ミッション → クイズ
  await m.click('.seed-row.locked >> text=そら豆'); await m.waitForTimeout(100);
  console.log(vp.tag, 'mission modal:', await m.textContent('.modal-title'), '|', await m.textContent('.mission-goal'));
  await m.click('.modal-buttons .btn >> text=クイズに挑戦'); await m.waitForTimeout(100);
  const q = await m.textContent('.quiz-q');
  const choices = await m.locator('.quiz-choice').allTextContents();
  // 正解をデータから計算
  const right = await m.evaluate(async (q) => { const cfg = await (await fetch('data/vegetables.json')).json(); const v = cfg.vegetables.find(x=>x.id==='broadbean'); return Quiz.formatMonths(q.includes('収穫') ? v.guide.harvestMonths : v.guide.plantMonths); }, q);
  console.log(vp.tag, 'quiz:', q, '| choices', choices.join(' / '), '| right', right);
  await m.screenshot({ path: `${process.env.SP}/s14-${vp.tag}-quiz.png` });
  // まずわざとまちがえる
  const wrong = choices.find(c => c !== right);
  await m.click(`.quiz-choice >> text="${wrong}"`); await m.waitForTimeout(100);
  console.log(vp.tag, 'wrong ->', await m.textContent('.modal-title'));
  await m.click('.modal-buttons .btn >> text=もう一度挑戦'); await m.waitForTimeout(100);
  const q2 = await m.textContent('.quiz-q');
  const right2 = await m.evaluate(async (q) => { const cfg = await (await fetch('data/vegetables.json')).json(); const v = cfg.vegetables.find(x=>x.id==='broadbean'); return Quiz.formatMonths(q.includes('収穫') ? v.guide.harvestMonths : v.guide.plantMonths); }, q2);
  await m.click(`.quiz-choice >> text="${right2}"`); await m.waitForTimeout(100);
  console.log(vp.tag, 'right ->', await m.textContent('.modal-title'));
  await m.click('.modal-buttons .btn >> text=とじる'); await m.waitForTimeout(150);
  d = await get();
  console.log(vp.tag, 'after quiz: unlocked', JSON.stringify(d.unlocked), 'quizDone', JSON.stringify(d.quizDone), '| toast', await m.textContent('#toast'), '| back to', await m.textContent('.modal-title'));
  await m.click('.seed-row >> text=そら豆'); await m.waitForTimeout(100);
  d = await get(); console.log(vp.tag, 'planted', d.plots[1] && d.plots[1].vegId);
  // 季節：レタス（基本の5つ目）を収穫 → 夏へ
  await m.click('.plot >> nth=0 >> .btn.primary'); await m.waitForTimeout(150);
  const titles = []; for (let k=0;k<4 && await m.locator('#modal:not(.hidden)').count();k++){ titles.push(await m.textContent('.modal-title')); await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(80); }
  d = await get(); console.log(vp.tag, 'season after lettuce:', d.seasonIndex, titles.join(' → '), '| hud', await m.textContent('#hud-season'));
  // ミッション：記録で解放（コンボ3 → いちごは既に、すいか=3列いっしょ）
  await m.evaluate(k => { const d = JSON.parse(localStorage.getItem(k)); d.stats.bestMulti = 3; localStorage.setItem(k, JSON.stringify(d)); }, KEY);
  await m.reload(); await m.waitForTimeout(300);
  d = await get(); console.log(vp.tag, 'after multi3: unlocked', JSON.stringify(d.unlocked), '| toast', await m.textContent('#toast'));
  // 図鑑のチャレンジ野菜の表示
  await m.click('.tab[data-screen="zukan"]');
  console.log(vp.tag, 'zukan challenge texts', await m.locator('.zukan-locked-text >> text=チャレンジ野菜').count());
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
