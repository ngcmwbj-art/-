// 第9回・第10回のあとの画面まわり（ぐるっと見せる・ジャックから田んぼ道・卵の輪・技の一覧・迷ったときのヒント・文字の少なさ）
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/index.html?q=low';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.__rh && window.__rh.game);
  const out = [];
  const check = (name, cond, info = '') => out.push(`${cond ? 'OK  ' : 'FAIL'} ${name} ${info}`);
  const frames = (n) => page.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

  // ハウスをぐるっと：1回目だけ。そのあいだゲームは止まる。とばせる
  await page.evaluate(() => { document.getElementById('optTutor').checked = false; window.__rh.startGame('s2', { intro: true }); });
  await frames(3);
  const introOn = await page.evaluate(() => !!window.__rh.cam.intro && !document.getElementById('introSkip').hidden);
  check('ステージの始めにハウスをぐるっと見せる', introOn);
  const e0 = await page.evaluate(() => window.__rh.game.elapsed);
  await frames(5);
  check('ぐるっと見せる間はゲームが止まる', await page.evaluate((e0) => window.__rh.game.elapsed === e0, e0));
  await page.click('#introSkip');
  await frames(2);
  check('とばすボタンで終わる', await page.evaluate(() => !window.__rh.cam.intro && document.getElementById('introSkip').hidden));
  await page.evaluate(() => window.__rh.startGame('s2', { intro: true }));
  await frames(2);
  check('2回目は見せない', await page.evaluate(() => !window.__rh.cam.intro));

  // 仲間がいないときは指示ボタンを出さない
  await page.evaluate(() => window.__rh.startGame('s1'));
  await frames(3);
  check('仲間がいないときは指示ボタンなし', await page.evaluate(() => getComputedStyle(document.querySelector('.cmds')).display === 'none'));
  check('指示は2つだけ', await page.evaluate(() => document.querySelectorAll('.cmds .cmd').length === 2));

  // 卵の輪
  await page.evaluate(() => {
    const g = window.__rh.game;
    g.farmer.timer = 999; g.farmer.x = 19; g.farmer.z = 12;
    g.nutrition = 100; g.tryLayEgg(g.player);
    g.eggs[0].t = g.diff.hatch * 0.5;
  });
  await frames(4);
  check('卵の上に輪が出る', await page.evaluate(() => [...document.querySelectorAll('.lbl.egg-ring')].some((e) => e.style.display !== 'none')));

  // 迷ったときのヒント（10秒動かない）
  await page.evaluate(() => { const g = window.__rh.game; g.eggs.forEach((e) => { e.t = 0; }); g.nutrition = 0; g.elapsed = 20; const h = window.__rh.hints; h.cur = null; h.done = new Set(h.list.map((x) => x.id)); h.idle = 10.5; });
  await page.waitForFunction(() => { const h = document.getElementById('hint'); return !h.hidden && /食べる|かくれ|産卵/.test(h.textContent); }, null, { timeout: 200000 }).catch(() => {});
  const hintTxt = await page.evaluate(() => document.getElementById('hint').textContent);
  check('迷ったら今できることを1行', /食べる|かくれ|産卵/.test(hintTxt), hintTxt);
  check('そのボタンが光る', await page.evaluate(() => !!document.querySelector('.tbtn.nudge')));

  // 出荷ジャック成功 → 田んぼ道へ → もどるとおみやげ
  await page.evaluate(() => {
    const g = window.__rh.game, P = g.player;
    const c = g.crates.find((x) => !x.rotten && !x.shipped);
    c.carried = true; P.stow = c; c.stowed = P;
    g.stowShipped(P, c);
  });
  await page.waitForSelector('#jackOffer', { state: 'visible', timeout: 30000 }).catch(() => {});
  check('ジャックのあと「田んぼ道へにげる」を選べる', await page.isVisible('#jackOffer'));
  await page.click('#btnJackRun');
  await frames(3);
  check('そのまま田んぼ道が始まる', await page.evaluate(() => !document.getElementById('runHud').hidden));
  const n0 = await page.evaluate(() => window.__rh.game.nymphs.length);
  await page.evaluate(() => { const R = window.__rh.runner; R.count = 0; R.x = 229.5; });
  await page.waitForSelector('#runResult', { state: 'visible', timeout: 60000 }).catch(() => {});
  check('ハウスにもどるボタン', await page.isVisible('#btnRunBack'));
  await page.click('#btnRunBack');
  await frames(3);
  check('もどるとステージの続き', await page.evaluate(() => window.__rh.game.state === 'play' && !document.getElementById('hud').hidden));
  check('おみやげで仲間がふえる', await page.evaluate((n0) => window.__rh.game.nymphs.length > n0, n0));

  // 技の一覧（図鑑）
  await page.evaluate(() => { window.__rh.setTab && window.__rh.setTab('see'); });
  check('図鑑に技の一覧', await page.evaluate(() => !!document.getElementById('bookTechs')));

  // 文字の少なさ：遊んでいる画面の文字数
  await page.evaluate(() => window.__rh.startGame('s3'));
  await frames(5);
  const chars = await page.evaluate(() => {
    const vis = (el) => el && !el.hidden && el.offsetParent !== null;
    let n = 0;
    for (const id of ['timerCard', 'orderMini']) { const el = document.getElementById(id); if (vis(el)) n += el.innerText.replace(/\s/g, '').length; }
    for (const el of document.querySelectorAll('.hud-bl, .farmer-card')) if (vis(el)) n += el.innerText.replace(/\s/g, '').length;
    return n;
  });
  check('遊んでいる画面の表示の文字が少ない（40字以下）', chars <= 40, `${chars}字`);

  console.log(out.join('\n'));
  console.log('ERRORS', errors.length, errors.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
