// 本物の入力（タッチのスティック・ボタン、キーボード、一時停止）で動くか
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/index.html?q=low';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = [];
  const check = (n, c, i = '') => out.push(`${c ? 'OK  ' : 'FAIL'} ${n} ${i}`);
  const errors = [];
  // タッチ
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.setDefaultTimeout(240000);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.__rh && window.__rh.game);
    await page.tap('[data-diff="s1"]');
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
    await page.evaluate(() => { const g = window.__rh.game; g.spawnRoach(g.player.x + 0.5, g.player.z, true); });
    await page.waitForSelector('#cmd-search', { state: 'visible', timeout: 15000 }).catch(() => {});
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
    page.setDefaultTimeout(240000);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.__rh && window.__rh.game);
    await page.click('[data-diff="s1"]');
    await page.waitForTimeout(300);
    check('PCではタッチ操作を出さない', !(await page.isVisible('#touch .tbtns')));
    await page.evaluate(() => { const g = window.__rh.game; const c = g.crates.find((c) => c.table < 0); g.player.x = c.x; g.player.z = c.z + (c.z > 0 ? -0.7 : 0.7); window.__c = c; });
    await page.keyboard.down('Space');
    await page.waitForTimeout(1500);
    await page.keyboard.up('Space');
    check('スペース長押しで食べる', await page.evaluate(() => window.__c.hp < 100));
    await page.keyboard.press('Digit2'); await page.waitForFunction(() => window.__rh.game.mode === 'search', null, { timeout: 15000 }).catch(() => {});
    check('2キーで「まかせた」', await page.evaluate(() => window.__rh.game.mode === 'search') && await page.evaluate(() => document.getElementById('cmd-search').classList.contains('on')));
    await page.keyboard.press('Escape');
    check('Escで一時停止', await page.waitForSelector('#pause', { state: 'visible', timeout: 15000 }).then(() => true, () => false));
    await page.keyboard.press('Escape');
    check('Escで再開', await page.waitForSelector('#pause', { state: 'hidden', timeout: 15000 }).then(() => true, () => false));
    await page.click('#c', { position: { x: 600, y: 300 } });
    await page.keyboard.press('KeyR'); await page.waitForTimeout(250);
    check('栄養不足で産卵しない', await page.evaluate(() => window.__rh.game.eggs.length === 0));
    // 第19回：PCの操作
    check('PCでは右下に大きな Space の札', await page.isVisible('#pcCard') && /Space/.test(await page.textContent('#pcCard')));
    await page.evaluate(() => { localStorage.removeItem('roachhouse.pcPracticed'); window.__rh.startPcPractice(); });
    check('はじめてのPCは練習が出る', await page.isVisible('#pcPractice'));
    await page.evaluate(() => { const g = window.__rh.game; const c = g.crates.find((c) => c.table < 0 && c.hp > 50); g.player.x = c.x; g.player.z = c.z + (c.z > 0 ? -0.7 : 0.7); window.__c2 = c; window.__h2 = c.hp; });
    await page.waitForTimeout(200);
    check('札に「食べる」と出る', /食べる/.test(await page.textContent('#pcAct')), await page.textContent('#pcAct'));
    await page.mouse.move(600, 300); await page.mouse.down(); await page.waitForTimeout(300);
    const la = await page.evaluate(() => { const i = window.__rh.input; i.poll(); return i.actionHeld; });
    await page.waitForTimeout(1200); await page.mouse.up();
    check('左クリック長押しは Space と同じ', la, String(la));
    const y0 = await page.evaluate(() => window.__rh.cam ? window.__rh.cam.yaw : null);
    await page.mouse.move(600, 300); await page.mouse.down({ button: 'left' }); await page.mouse.move(800, 300, { steps: 5 }); await page.mouse.up({ button: 'left' });
    const y1 = await page.evaluate(() => window.__rh.cam ? window.__rh.cam.yaw : null);
    await page.mouse.move(600, 300); await page.mouse.down({ button: 'right' }); await page.mouse.move(800, 300, { steps: 5 }); await page.mouse.up({ button: 'right' });
    const y2 = await page.evaluate(() => window.__rh.cam ? window.__rh.cam.yaw : null);
    check('左ドラッグでは視点が回らず、右ドラッグで回る', y0 !== null && Math.abs(y1 - y0) < 0.05 && Math.abs(y2 - y1) > 0.3, `${y0} ${y1} ${y2}`);
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(400);
    const d1 = await page.evaluate(() => { const i = window.__rh.input; i.poll(); return i.dash; });
    await page.waitForTimeout(2200);
    const d2 = await page.evaluate(() => { const i = window.__rh.input; i.poll(); return i.dash && i.autoDash; });
    await page.keyboard.up('ArrowUp');
    check('Shiftなしでも、まっすぐ2秒歩くと速くなる', !d1 && d2, `${d1} ${d2}`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('#pause', { state: 'visible' });
    check('一時停止でキーの絵が出る', await page.isVisible('.key-pics') && await page.isVisible('#btnFull'));
    await page.keyboard.press('Escape');
  }
  console.log(out.join('\n'));
  console.log('ERRORS', errors.length, errors.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
