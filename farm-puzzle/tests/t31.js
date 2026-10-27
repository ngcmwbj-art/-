const { chromium } = require('playwright');
const KEY='hatake-puzzle-save';
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
  const m = await b.newPage({ viewport: vp });
  m.on('pageerror', e => errors.push(e.message)); m.on('console', x => x.type()==='error' && errors.push(x.text()));
  await m.goto('http://localhost:8765/');
  const get = () => m.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const set = (d) => m.evaluate(([k,d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY,d]);
  const base = {version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonWorkShown:true};
  // 設定：音
  await set({...base}); await m.reload(); await m.waitForTimeout(300);
  const seq=[];
  for (let i=0;i<4;i++){ await m.click('#help-btn'); const l = await m.locator('.modal-buttons .btn >> text=/^音：/').textContent(); seq.push(l + '/' + (await m.textContent('#sound-btn'))); await m.click('.modal-buttons .btn >> text=/^音：/'); await m.waitForTimeout(60); await m.click('.modal-buttons .btn >> text=とじる'); }
  console.log(vp.tag,'sound cycle', seq.join(' → '), '| saved', JSON.stringify((await get()).settings));
  // 夏：オクラの種あり（未収穫）→ 🔒文が出ない。ほかの夏チャレンジは出る
  await set({...base, seasonIndex:1, harvested:{tomato:1}, unlocked:['okra']}); await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="zukan"]'); await m.click('.filter-chip >> text=夏'); await m.waitForTimeout(100);
  console.log(vp.tag,'locked texts (夏, 5チャレンジ中1つ種あり)', await m.locator('.zukan-locked-text').count());
  // まとめて水やりのお知らせに野菜の名前
  await set({...base, seasonIndex:1, resources:{water:40,fertilizer:0,coins:0}, plots:[{vegId:'tomato',stage:0},{vegId:'cucumber',stage:0}]}); await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="farm"]'); await m.click('.bulk-item >> nth=0 >> .btn'); await m.waitForTimeout(100);
  console.log(vp.tag,'bulk toast:', (await m.textContent('#toast')).replace(/\n/g,' / '));
  // 育て方カード：いちごの「敷きわら」説明、玉ねぎの科、旬の文
  await m.evaluate(() => { HowTo.open(Farm.veg('strawberry')); });
  console.log(vp.tag,'strawberry words', (await m.locator('.howto-words dt').allTextContents()).join(','));
  await m.click('.modal-buttons .btn >> text=とじる');
  await m.evaluate(() => { HowTo.open(Farm.veg('onion')); });
  const rows = await m.locator('.howto-row').allTextContents(); console.log(vp.tag,'onion', rows.find(r=>r.startsWith('なかま')), '|', await m.textContent('.howto-season'));
  await m.click('.modal-buttons .btn >> text=とじる');
  // 連作：えんどう豆は4〜5年、アスパラガスは出ない
  await set({...base, seasonIndex:0, unlocked:['pea','asparagus'], lastFamily:['マメ','キジカクシ'], plots:[null,null]}); await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="farm"]');
  await m.click('.plot[data-index="0"] .sow-btn'); await m.click('.modal-body .seed >> text=えんどう豆'); await m.waitForTimeout(100);
  console.log(vp.tag,'pea:', (await m.textContent('#toast')).replace(/\n/g,' / ').slice(0,80));
  await m.click('.plot[data-index="1"] .sow-btn'); await m.click('.modal-body .seed >> text=アスパラガス'); await m.waitForTimeout(100);
  console.log(vp.tag,'asparagus:', (await m.textContent('#toast')).replace(/\n/g,' / ').slice(0,30));
  // 賞状の名前
  await set({...base, seasonIndex:1, seasonClears:{spring:{count:1,y:2026,m:10,d:24,total:9,n:5,all:35}}, harvested:{potato:1,spinach:1,cabbage:1,radish:1,lettuce:1}}); await m.reload(); await m.waitForTimeout(300);
  await m.click('.tab[data-screen="zukan"]'); await m.click('.badge-season >> nth=0'); await m.waitForTimeout(100);
  console.log(vp.tag,'cert names', (await m.locator('.cert-veg small').allTextContents()).join(','));
  await m.locator('.certificate').screenshot({ path: `${process.env.SP}/s31-${vp.tag}-cert.png` });
  await m.close();
  }
  console.log('errors', errors); await b.close();
})();
