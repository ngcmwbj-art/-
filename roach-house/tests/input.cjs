// 本物の入力（タッチのスティック・ボタン、キーボード、一時停止）で動くか
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/index.html';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = [];
  const check = (n, c, i = '') => out.push(`${c ? 'OK  ' : 'FAIL'} ${n} ${i}`);
  const errors = [];
  // タッチ
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.__rh && window.__rh.game);
    await page.tap('[data-diff="easy"]');
    await page.waitForTimeout(500);
    check('タッチでゲーム開始', await page.evaluate(() => window.__rh.game.state === 'play'));
    check('タッチ操作ボタンが出る', await page.isVisible('#touch .tbtns'));
    const cdp = await ctx.newCDPSession(page);
    const p0 = await page.evaluate(() => [window.__rh.game.player.x, window.__rh.game.player.z]);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 90, y: 700, id: 1 }] });
    for (let k = 1; k <= 6; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 90, y: 700 - k * 10, id: 1 }] }); await page.waitForTimeout(30); }
    await page.waitForTimeout(1500);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const p1 = await page.evaluate(() => [window.__rh.game.player.x, window.__rh.game.player.z]);
    check('スティックで前に進む', Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.3 && p1[0] > p0[0], JSON.stringify([p0, p1]));
    // 視点ドラッグ
    const y0 = await page.evaluate(() => window.__rh.game.camYaw);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 300, id: 2 }] });
    for (let k = 1; k <= 5; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300 - k * 20, y: 300, id: 2 }] }); await page.waitForTimeout(30); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(200);
    const y1 = await page.evaluate(() => window.__rh.game.camYaw);
    check('右側ドラッグで視点が回る', Math.abs(y1 - y0) > 0.2, `${y0.toFixed(2)}->${y1.toFixed(2)}`);
    // 食べるボタン長押し
    await page.evaluate(() => { const g = window.__rh.game; const c = g.crates.find((c) => c.table < 0); g.player.x = c.x; g.player.z = c.z + (c.z > 0 ? -0.7 : 0.7); window.__c = c; });
    await page.waitForTimeout(300);
    const box = await page.locator('#tAction').boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 3 }] });
    await page.waitForTimeout(1500);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const hp = await page.evaluate(() => window.__c.hp);
    check('食べるボタン長押しで食べる', hp < 100, `hp=${hp.toFixed(1)}`);
    await page.tap('#cmd-search');
    check('指示ボタンで探索に切りかえ', await page.evaluate(() => window.__rh.game.mode === 'search'));
    await page.tap('#pauseBtn');
    check('一時停止ボタン', await page.isVisible('#pause'));
    const t0 = await page.evaluate(() => window.__rh.game.time);
    await page.waitForTimeout(800);
    check('一時停止中は時間が止まる', await page.evaluate((t) => window.__rh.game.time === t, t0));
    await page.tap('#btnResume');
    check('再開できる', await page.evaluate(() => window.__rh.game.state === 'play') && !(await page.isVisible('#pause')));
    await ctx.close();
  }
  // キーボード
  {
    const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.__rh && window.__rh.game);
    await page.click('[data-diff="normal"]');
    await page.waitForTimeout(300);
    check('PCではタッチ操作を出さない', !(await page.isVisible('#touch .tbtns')));
    await page.evaluate(() => { const g = window.__rh.game; const c = g.crates.find((c) => c.table < 0); g.player.x = c.x; g.player.z = c.z + (c.z > 0 ? -0.7 : 0.7); window.__c = c; });
    await page.keyboard.down('Space');
    await page.waitForTimeout(1500);
    await page.keyboard.up('Space');
    check('スペース長押しで食べる', await page.evaluate(() => window.__c.hp < 100));
    await page.keyboard.press('Digit2'); await page.waitForTimeout(250);
    check('2キーで囮', await page.evaluate(() => window.__rh.game.mode === 'decoy') && await page.evaluate(() => document.getElementById('cmd-decoy').classList.contains('on')));
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    check('Escで一時停止', await page.isVisible('#pause'));
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    check('Escで再開', !(await page.isVisible('#pause')));
    await page.click('#c', { position: { x: 600, y: 300 } });
    await page.keyboard.press('KeyR'); await page.waitForTimeout(250);
    check('栄養不足で産卵しない', await page.evaluate(() => window.__rh.game.eggs.length === 0));
  }
  console.log(out.join('\n'));
  console.log('ERRORS', errors.length, errors.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
