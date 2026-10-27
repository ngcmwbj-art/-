const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  // 遊び方
  await m.evaluate(k => localStorage.removeItem(k), KEY); await m.reload(); await m.waitForTimeout(300);
  const pages = [];
  for (let k=0;k<6 && await m.locator('#modal:not(.hidden)').count();k++){ pages.push(await m.textContent('.modal-title')); if (k===3) console.log(vp.tag,'p4:', (await m.textContent('.modal-body')).replace(/\n/g,' / ')); if (k===0) console.log(vp.tag,'p1:', (await m.textContent('.modal-body')).replace(/\n/g,' / ')); await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(80); }
  console.log(vp.tag,'guide', pages.join(' → '));
  // 読みがな：畑のコツ・作業の流れ、お知らせに { が出ない
  await m.evaluate(k => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonWorkShown:true,seasonIndex:0,resources:{water:30,fertilizer:20,coins:0},
    harvested:{potato:1,spinach:1,cabbage:1,radish:1,lettuce:1},plots:[{vegId:'potato',stage:1},{vegId:'spinach',stage:3}]})), KEY);
  await m.reload(); await m.waitForTimeout(300); await m.click('.tab[data-screen="farm"]'); await m.waitForTimeout(100);
  console.log(vp.tag,'plot tip ruby', await m.locator('.plot-tip ruby').count(), '| braces', (await m.textContent('#farm')).includes('{'));
  await m.click('.plot[data-index="0"] .plot-action'); await m.waitForTimeout(100);
  const t1 = await m.textContent('#toast'); console.log(vp.tag,'fert toast:', t1.replace(/\n/g,' / '), '| braces', t1.includes('{'));
  await m.click('.plot[data-index="0"] .book-btn'); await m.waitForTimeout(100);
  console.log(vp.tag,'howto steps ruby', await m.locator('.howto-steps ruby').count(), '| words', await m.locator('.howto-words .word').count(), '| braces', (await m.textContent('.howto')).includes('{'));
  await m.click('.modal-buttons .btn');
  // おさらいクイズ：わざとまちがえる
  await m.click('.tab[data-screen="zukan"]'); await m.click('.review-box .btn'); await m.waitForTimeout(100);
  for (let i=0;i<5;i++){
    const choices = await m.locator('.quiz-choice').allTextContents();
    // まちがいを選ぶ：正解を知らないので、最後の選択肢を選び、正解なら気にしない
    await m.click('.quiz-choice >> nth=2'); await m.waitForTimeout(60);
    await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(60);
  }
  const btns = await m.locator('.quiz-wrong-btn').allTextContents();
  console.log(vp.tag,'result:', (await m.textContent('.quiz-result')).replace(/\n/g,' / '), '| wrong btns', btns.join(','));
  await m.screenshot({ path: `${process.env.SP}/s27-${vp.tag}-result.png` });
  if (btns.length) {
    await m.click('.quiz-wrong-btn >> nth=0'); await m.waitForTimeout(100);
    console.log(vp.tag,'opened', await m.textContent('.modal-title'));
    await m.click('.modal-buttons .btn >> text=とじる'); await m.waitForTimeout(100);
    console.log(vp.tag,'back to', await m.textContent('.modal-title'));
  }
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
