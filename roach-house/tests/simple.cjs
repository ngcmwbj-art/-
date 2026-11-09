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
  check('そのボタンが光る（かくれるとき以外）', /かくれ/.test(hintTxt) || await page.evaluate(() => !!document.querySelector('.tbtn.nudge')), hintTxt);

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

  // 第11回：きょうの1回・かんたん・ボタンの絵・今日の1枚・しょんぼりトラック
  check('タイトルに「きょうの1回」', await page.evaluate(() => /きょうの1回/.test(document.getElementById('btnToday').textContent)));
  check('かんたんモードのチェック', await page.evaluate(() => !!document.getElementById('optEasy')));
  check('スマホのボタンは絵＋短い言葉', await page.evaluate(() => [...document.querySelectorAll('.t-dead .tl, .t-egg .tl, .t-attack .tl')].every((e) => e.textContent.length <= 2) && document.querySelectorAll('.tbtn svg.ic').length === 3));
  await page.evaluate(() => { const g = window.__rh.game; g.snap('close', 'テスト'); });
  await frames(3);
  await page.evaluate(() => { const g = window.__rh.game; g.endGame(true, 'ruined'); });
  await frames(4);
  check('勝つとトラックがしょんぼり出発', await page.evaluate(() => !!window.__rh.cam.ending));
  await page.waitForSelector('#result', { state: 'visible', timeout: 120000 }).catch(() => {});
  check('結果に今日の1枚', await page.isVisible('#rPhoto'));
  await frames(30);
  check('トラックが走り出す', await page.evaluate(() => window.__rh.world.truck.position.x > 27.2));

  // 第12回：結果は口癖の1行・日記はたたむ／トラックの写真に吹き出し／見本プレイ／おまけは「みる」へ／省エネ
  check('結果に口癖の1行', await page.evaluate(() => /もう限界だ/.test(document.getElementById('rCatch').textContent)));
  check('日記はたたんである', await page.evaluate(() => !document.querySelector('.r-diary').open));
  check('今日の1枚はトラックの写真', await page.evaluate(() => (window.__rh.game.highlights || []).some((h) => h.type === 'truck')));
  await page.evaluate(() => { document.getElementById('btnTitle2').click(); });
  await frames(3);
  check('田んぼ道は「みる」のタブに', await page.evaluate(() => !!document.querySelector('[data-pane="see"] #btnRun') && !document.querySelector('[data-pane="play"] #btnRun')));
  check('省エネの設定がある（スマホは最初からオン）', await page.evaluate(() => document.getElementById('optEco').checked));
  await page.evaluate(() => document.getElementById('btnDemo').click());
  await frames(4);
  check('見本プレイが始まる', await page.evaluate(() => !document.getElementById('demoBar').hidden && /かじる|かくれる|ふやす/.test(document.getElementById('demoCap').textContent)));
  await page.evaluate(() => document.getElementById('btnDemoEnd').click());
  await frames(3);
  check('見本を閉じるとタイトルへ', await page.evaluate(() => !document.getElementById('title').hidden));

  // 第13回：右上をたたむ・省エネで仕上げを切る・縦で少し引く・結果のボタンは下・仲間を次のステージへ・ぞろぞろ
  await page.evaluate(() => window.__rh.startGame('s1'));
  await frames(3);
  check('右上は最初たたんである（地図なし）', await page.evaluate(() => document.getElementById('trPanel').classList.contains('folded') && getComputedStyle(document.getElementById('minimap')).display === 'none'));
  await page.evaluate(() => document.getElementById('trPanel').click());
  await frames(2);
  check('押すと地図が開く', await page.evaluate(() => getComputedStyle(document.getElementById('minimap')).display !== 'none'));
  await page.evaluate(() => document.getElementById('trPanel').click());
  check('省エネ中は画面全体の仕上げを切る', await page.evaluate(() => !window.__rh.fx.composer));
  await page.evaluate(() => { const g = window.__rh.game; Object.assign(g.player, { x: 6, z: 2.5, y: 0, surface: -1 }); g.farmer.timer = 999; g.farmer.x = 19; g.farmer.z = 12; });
  await page.setViewportSize({ width: 390, height: 844 });
  await frames(30);
  const dPort = await page.evaluate(() => window.__rh.cam.dist);
  await page.setViewportSize({ width: 844, height: 390 });
  await frames(30);
  const dLand = await page.evaluate(() => window.__rh.cam.dist);
  check('縦画面では少し引いて見る', dPort > dLand * 1.1, `縦${dPort.toFixed(2)} 横${dLand.toFixed(2)}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { const g = window.__rh.game; for (let i = 0; i < 5; i++) g.spawnRoach(g.player.x + 0.3 * i, g.player.z + 0.5, true); g.endGame(true, 'ruined'); });
  await frames(20);
  check('勝つと仲間がトラックの後ろを走る', await page.evaluate(() => { const E = window.__rh.cam.ending; return !!(E && E.mates && E.mates.length === 5 && E.mates.every((r) => r.x > 20)); }));
  await page.waitForSelector('#result', { state: 'visible', timeout: 120000 }).catch(() => {});
  check('結果のボタンは画面のいちばん下', await page.evaluate(() => { const b = document.querySelector('#result .r-btns').getBoundingClientRect(); return b.bottom > window.innerHeight - 80; }));
  const nBefore = await page.evaluate(() => window.__rh.game.nymphs.length);
  await page.evaluate(() => document.getElementById('btnNext').click());
  await frames(3);
  check('次のステージのはじめに仲間がいる', await page.evaluate((n) => window.__rh.game.diff.key === 's2' && window.__rh.game.nymphs.length === Math.min(8, n), nBefore), `前${nBefore}`);

  // 第14〜18回：止まった絵・タイトルの農場主・旗・星の絵・パプリカの山・エンディング
  await page.evaluate(() => { document.getElementById('btnTitle2') && document.getElementById('btnTitle2').click(); });
  await frames(3);
  check('タイトルに農場主の顔', await page.isVisible('#titleFarmer'));
  await page.evaluate(() => document.getElementById('titleFarmer').click());
  check('農場主を押すと口癖', await page.evaluate(() => !document.getElementById('tfBubble').hidden && /限界|勝ち/.test(document.getElementById('tfBubble').textContent)));
  check('省エネ中のタイトルは描くのをやめる', await page.evaluate(() => new Promise((res) => { const r = window.__rh.renderer; let n = 0; const o = r.render.bind(r); r.render = (...a) => { n++; return o(...a); }; setTimeout(() => { r.render = o; res(n === 0); }, 700); })));
  await page.evaluate(() => window.__rh.startGame('s6'));
  await frames(3);
  await page.evaluate(() => { const g = window.__rh.game; g.ruined = g.diff.target; g.stats.ruined = 5; g.endGame(true, 'ruined'); });
  await page.waitForSelector('#result', { state: 'visible', timeout: 120000 }).catch(() => {});
  check('結果の星の条件は絵', await page.evaluate(() => document.querySelectorAll('#rStars .star-rules svg').length === 3));
  check('結果にパプリカの山', await page.evaluate(() => document.querySelectorAll('#rPile ellipse').length === 5));
  await page.waitForSelector('#ending', { state: 'visible', timeout: 20000 }).catch(() => {});
  check('ステージ6をクリアするとエンディング', await page.isVisible('#ending'));
  await page.evaluate(() => document.getElementById('btnEndingClose').click());

  // 第19〜21回
  check('結果画面で「次へ」か「もう一度」が一度ぴょん', await page.evaluate(() => !!document.querySelector('#result .r-btns .hop')));
  // 写真がまだない場合（すぐ終わらせたとき）は、試しの写真を1枚入れて確かめる
  await page.evaluate(() => { const f = document.getElementById('rPhoto'); if (!f.querySelector('img')) { f.innerHTML = '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt=""><figcaption>ためし</figcaption>'; f.hidden = false; } });
  await page.evaluate(() => document.querySelector('#rPhoto img').click());
  check('結果の写真をタップすると大きく', await page.isVisible('#photoBig img'));
  await page.evaluate(() => document.getElementById('photoBig').click());
  check('もう一度タップでとじる', !(await page.isVisible('#photoBig')));
  await page.evaluate(() => { document.getElementById('btnTitle2').click(); });
  await frames(3);
  check('タイトルに「今日のお題」は出さない', await page.evaluate(() => !/今日のお題/.test(document.getElementById('title').textContent)));
  check('入口の看板と壁の落書き', await page.evaluate(() => { const d = window.__rh.deco; return !!d; }));
  await page.evaluate(() => window.__rh.startGame('s1'));
  await frames(3);
  check('スマホでは右下のSpaceの札を出さない', !(await page.isVisible('#pcCard')));
  check('一時停止ボタンは押しやすい大きさ', await page.evaluate(() => { const b = document.getElementById('pauseBtn').getBoundingClientRect(); return b.width >= 50 && b.height >= 44; }));
  await page.evaluate(() => { const g = window.__rh.game; g.farmer.timer = 999; g.farmer.x = 19; g.farmer.z = 12; for (let i = 0; i < 15; i++) g.spawnRoach(g.player.x + 0.3 * (i % 5), g.player.z + 0.4 + Math.floor(i / 5) * 0.3, true); });
  await frames(4);
  check('仲間が多いと右上の農場主が青ざめる', await page.evaluate(() => document.getElementById('fface').dataset.pale === '3'));
  await page.evaluate(() => { const g = window.__rh.game; g.kill(g.player, 'trap'); });
  await frames(3);
  check('やられたら、何にやられたかを絵で一瞬', await page.evaluate(() => !document.getElementById('deathPic').hidden && document.getElementById('deathPic').dataset.c === 'trap'));

  console.log(out.join('\n'));
  console.log('ERRORS', errors.length, errors.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
