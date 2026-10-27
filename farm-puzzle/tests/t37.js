const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  // 音を記録する
  await m.addInitScript(() => { window.__played = []; });
  const set = (d) => m.evaluate(([k,d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY,d]);
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const base = {version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonWorkShown:true,seasonIndex:1,settings:{sound:true,vibrate:false,volume:'small'}};
  // 夏：トマトを初めて収穫
  await set({...base, harvested:{}, seasonHarvested:[], resources:{water:0,fertilizer:0,coins:0}, plots:[{vegId:'tomato',stage:3},null]});
  await m.reload(); await m.waitForTimeout(300);
  await m.evaluate(() => { const p = Sound.play; Sound.play = (n, l) => { window.__played.push(n); return p(n, l); }; });
  await m.click('.tab[data-screen="farm"]');
  await m.click('.plot.ready .plot-action'); await m.waitForTimeout(150);
  const t1 = await m.textContent('#toast');
  console.log(vp.tag,'1st harvest toast:', t1.replace(/\n/g,' / '));
  const tb = await m.locator('#toast').boundingBox(); console.log(vp.tag,'toast box', Math.round(tb.width), Math.round(tb.height), 'in screen', tb.x >= 0 && tb.x + tb.width <= vp.width);
  await m.screenshot({ path: `${process.env.SP}/s37-${vp.tag}-toast.png` });
  await m.waitForTimeout(600);
  console.log(vp.tag,'played', JSON.stringify(await m.evaluate(() => window.__played)));
  while (await m.locator('#modal:not(.hidden)').count()) { await m.click('.modal-buttons .btn >> nth=0'); await m.waitForTimeout(100); }
  // 2回目：食べ方
  await set({...(await get()), plots:[{vegId:'tomato',stage:3},null]}); await m.reload(); await m.waitForTimeout(300);
  await m.evaluate(() => { window.__played=[]; const p = Sound.play; Sound.play = (n, l) => { window.__played.push(n); return p(n, l); }; });
  await m.click('.tab[data-screen="farm"]'); await m.click('.plot.ready .plot-action'); await m.waitForTimeout(700);
  console.log(vp.tag,'2nd harvest toast:', (await m.textContent('#toast')).replace(/\n/g,' / '), '| played', JSON.stringify(await m.evaluate(() => window.__played)));
  // ことばの説明：すいか（子づる・親づる）
  await m.evaluate(() => HowTo.open(Farm.veg('watermelon'))); await m.waitForTimeout(200);
  const words = await m.locator('.howto-words dt').allTextContents();
  console.log(vp.tag,'watermelon words', words.join(' '));
  await m.evaluate(() => HowTo.open(Farm.veg('tomato'))); await m.waitForTimeout(200);
  console.log(vp.tag,'tomato words', (await m.locator('.howto-words dt').allTextContents()).join(' '));
  console.log(vp.tag,'color-scheme', await m.evaluate(() => document.querySelector('meta[name=color-scheme]')?.content));
  console.log(vp.tag,'saved ok', JSON.stringify((await get()).harvested));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
