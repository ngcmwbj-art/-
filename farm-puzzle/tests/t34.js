const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const base = {version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonWorkShown:true};
  // 予備：正しい保存を2回 → 本体を壊す → 起動で予備から
  await m.evaluate(([k,b]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({...b, harvested:{tomato:3}})); }, [KEY,base]);
  await m.reload(); await m.waitForTimeout(300);   // ここで保存 → 予備ができる
  console.log(vp.tag,'bak exists', await m.evaluate(() => !!localStorage.getItem('hatake-puzzle-save-bak')));
  await m.evaluate(k => localStorage.setItem(k, '{こわれた'), KEY);
  await m.reload(); await m.waitForTimeout(300);
  const st = await m.evaluate(k => ({ h: JSON.parse(localStorage.getItem(k)).harvested, broken: localStorage.getItem('hatake-puzzle-save-broken') }), KEY);
  console.log(vp.tag,'recovered:', JSON.stringify(st), '| toast', await m.textContent('#toast'));
  // 予備もない
  await m.evaluate(k => { localStorage.clear(); localStorage.setItem(k, '{こわれた'); }, KEY);
  await m.reload(); await m.waitForTimeout(300);
  console.log(vp.tag,'reset toast', await m.textContent('#toast'), '| broken kept', await m.evaluate(() => localStorage.getItem('hatake-puzzle-save-broken')));
  // ドラッグ中にタブが裏へ
  await m.evaluate(([k,b]) => localStorage.setItem(k, JSON.stringify(b)), [KEY,base]); await m.reload(); await m.waitForTimeout(300);
  const sb = await m.locator('#tray .slot').nth(0).boundingBox();
  await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down(); await m.mouse.move(sb.x+10, sb.y-100, {steps:3});
  console.log(vp.tag,'ghost while drag', await m.locator('.ghost').count());
  await m.evaluate(() => window.dispatchEvent(new Event('blur')));
  console.log(vp.tag,'ghost after blur', await m.locator('.ghost').count());
  await m.mouse.up();
  await m.mouse.move(sb.x+sb.width/2, sb.y+sb.height/2); await m.mouse.down(); await m.mouse.move(sb.x+10, sb.y-100, {steps:3});
  console.log(vp.tag,'can drag again', await m.locator('.ghost').count()); await m.mouse.up();
  // 目標：空き区画があれば種まき
  await m.evaluate(([k,b]) => localStorage.setItem(k, JSON.stringify({...b, resources:{water:0,fertilizer:0,coins:0}, plots:[{vegId:'potato',stage:0},null]})), [KEY,base]); await m.reload(); await m.waitForTimeout(300);
  console.log(vp.tag,'goal:', await m.textContent('#goal'));
  // バッジ：春の野菜を全部収穫しても、記録があって春がないなら色なし
  await m.evaluate(([k,b]) => localStorage.setItem(k, JSON.stringify({...b, seasonIndex:2, seasonClears:{summer:{count:1,y:2026,m:10,d:20,total:9,n:9,all:35}}, harvested:{potato:1,spinach:1,cabbage:1,radish:1,lettuce:1,tomato:1}})), [KEY,base]); await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(100);
  console.log(vp.tag,'badges got', (await m.locator('.badge-season.got').allTextContents()).join(''));
  await m.click('.badge-season >> nth=3'); await m.waitForTimeout(100);
  console.log(vp.tag,'winter work ruby', await m.locator('.season-work li ruby').count(), '| braces', (await m.textContent('.season-work')).includes('{'));
  await m.click('.modal-buttons .btn');
  // 連作：すいか
  console.log(vp.tag,'favicon', await m.evaluate(() => !!document.querySelector('link[rel=icon]')));
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
