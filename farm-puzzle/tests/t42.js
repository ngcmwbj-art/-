const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const size of ['normal','xl']) for (const vp of [{ width: 320, height: 568, tag: '320' }, { width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
    const m = await b.newPage({ viewport: vp }); m.on('pageerror', e => errors.push(e.message));
    await m.goto('http://localhost:8765/');
    await m.evaluate((size) => { localStorage.clear(); localStorage.setItem('hatake-puzzle-save', JSON.stringify({version:2,settings:{textSize:size}})); }, size);
    await m.reload(); await m.waitForTimeout(300);
    await m.evaluate(() => Guide.show()); await m.waitForTimeout(150);
    for (let i=0;i<3;i++){ await m.click('.modal-buttons .btn.primary'); await m.waitForTimeout(100); }
    const t = await m.textContent('.modal-body'); const box = await m.locator('.modal').boundingBox();
    const btn = await m.locator('.modal-buttons .btn.primary').boundingBox();
    console.log(size, vp.tag, 'p4 learn', t.includes('覚えられること'), t.includes('🔇'), '| modal', Math.round(box.y), Math.round(box.height), '| btn visible', btn.y + btn.height <= vp.height);
    await m.screenshot({ path: `${process.env.SP}/s42-${size}-${vp.tag}.png` });
    await m.close();
  }
  console.log('errors', errors); await b.close();
})();
