// 一つずつの仕組みが正しく動くかを確かめる
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/index.html?q=low';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.__rh && window.__rh.game);
  const results = await page.evaluate(() => {
    const RH = window.__rh, g = RH.game, inp = RH.input;
    const out = [];
    const check = (name, cond, info = '') => out.push(`${cond ? 'OK  ' : 'FAIL'} ${name} ${info}`);
    const idle = (gg, i) => { i.mx = 0; i.mz = 0; i.actionHeld = false; };
    const freezeFarmer = () => { g.farmer.state = 'WORK'; g.farmer.phase = 'idle'; g.farmer.timer = 999; g.farmer.x = 19; g.farmer.z = 12; g.farmer.h = Math.PI / 2; };

    // 1. 食べるとコンテナが減り、栄養がたまり、0でダメになる
    g.start('normal', 11); freezeFarmer();
    const c = g.crates.find((c) => c.table < 0);
    const p = g.player;
    p.x = c.x; p.z = c.z - 0.7; p.surface = -1; p.y = 0;
    let n0 = g.ruined;
    RH.sim(30, 1 / 30, (gg, i, k) => { idle(gg, i); i.actionHeld = (k % 90) < 60; freezeFarmer(); });
    check('食べてダメにできる', c.rotten && g.ruined === n0 + 1, `hp=${c.hp.toFixed(1)}`);
    check('栄養がたまる', g.nutrition > 30, `nut=${g.nutrition.toFixed(0)}`);

    // 2. がっつきすぎると音で気づかれる
    g.start('normal', 12); freezeFarmer();
    const c2 = g.crates.find((c) => c.table < 0 && c.x > 0);
    g.player.x = c2.x; g.player.z = c2.z + (c2.z > 0 ? -0.7 : 0.7);
    g.farmer.x = c2.x + 4; g.farmer.z = c2.z > 0 ? 10.5 : -10.5; g.farmer.h = Math.PI;
    const s0 = g.farmer.susp;
    RH.sim(4, 1 / 30, (gg, i) => { idle(gg, i); i.actionHeld = true; gg.farmer.timer = 999; });
    check('がっつくと農場主があやしむ', g.farmer.susp > s0 + 40 || g.farmer.state !== 'WORK', `susp=${g.farmer.susp.toFixed(0)} st=${g.farmer.state}`);

    // 3. 産卵 → ふ化で仲間が3匹
    g.start('normal', 13); freezeFarmer();
    g.nutrition = 100; g.player.x = -10; g.player.z = 0;
    inp.press('egg');
    RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('卵を産める', g.eggs.length === 1 && g.nutrition === 0);
    RH.sim(11, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('卵がかえって仲間が3匹', g.nymphs.length === 3, `n=${g.nymphs.length}`);

    // 4. 指示：探索で仲間がコンテナを食べに行く
    g.setMode('search');
    RH.sim(40, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    const eaten = g.crates.some((c) => c.hp < 100);
    check('探索の仲間がコンテナをかじる', eaten, g.crates.filter((c) => c.hp < 100).map((c) => c.hp.toFixed(0)).join(','));
    // 囮で農場主の近くに行く
    g.setMode('decoy');
    RH.sim(15, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    const near = g.nymphs.filter((r) => Math.hypot(r.x - g.farmer.x, r.z - g.farmer.z) < 7).length;
    check('囮の仲間が農場主に近づく', near >= 1, `near=${near}/${g.nymphs.length}`);
    // 集合
    g.setMode('follow');
    RH.sim(25, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    const close = g.nymphs.filter((r) => Math.hypot(r.x - g.player.x, r.z - g.player.z) < 3).length;
    check('集合で仲間が戻る', close === g.nymphs.length, `close=${close}/${g.nymphs.length}`);

    // 5. 突撃で農場主がパニック、運んでいたコンテナを落とす
    g.start('normal', 14);
    g.attackCD = 0;
    const cc = g.crates[0];
    g.farmer.carry = cc; cc.carried = true; g.farmer.model.root.attach(cc.model.group);
    g.farmer.state = 'WORK'; g.farmer.phase = 'toDoor'; g.pathTo(20.5, 11);
    g.player.x = g.farmer.x - 1.5; g.player.z = g.farmer.z;
    inp.press('attack');
    RH.sim(0.8, 1 / 30, (gg, i) => idle(gg, i));
    check('突撃で農場主がパニック', g.farmer.state === 'PANIC', g.farmer.state);
    check('運んでいたコンテナを落とす', !cc.carried && !cc.shipped && cc.baseY === 0);
    RH.sim(2, 1 / 30, (gg, i) => idle(gg, i));
    check('着地して動ける', g.player.st === 'move' && g.player.y === 0, g.player.st);

    // 6. ホイホイ：くっつく → 連打で脱出
    g.start('normal', 15); freezeFarmer();
    const t = g.traps[0];
    g.player.x = t.x - 1; g.player.z = t.z;
    RH.sim(1.5, 1 / 30, (gg, i) => { idle(gg, i); const fx = Math.sin(gg.camYaw), fz = Math.cos(gg.camYaw); const dx = t.x - gg.player.x, dz = t.z - gg.player.z; const d = Math.hypot(dx, dz) || 1; i.mz = (dx * fx + dz * fz) / d; i.mx = (-dx * fz + dz * fx) / d; freezeFarmer(); });
    check('ホイホイにくっつく', g.player.st === 'stuck', g.player.st);
    RH.sim(4, 1 / 30, (gg, i, k) => { idle(gg, i); if (k % 4 === 0) i.press('action'); freezeFarmer(); });
    check('連打で脱出できる', g.player.st === 'move' && g.player.alive);

    // 7. 台に登る・落ちる
    g.start('normal', 16); freezeFarmer();
    g.player.x = 13; g.player.z = -8 - 1.5; g.player.st = 'move';
    inp.press('action');
    RH.sim(1.2, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('台に登れる', g.player.surface === 0 && Math.abs(g.player.y - 2.2) < 0.01, `s=${g.player.surface} y=${g.player.y}`);
    RH.sim(2, 1 / 30, (gg, i) => { idle(gg, i); i.mz = 0; const fx = Math.sin(gg.camYaw), fz = Math.cos(gg.camYaw); i.mz = -fz; i.mx = -fx * 0 + (-1) * 0; i.mz = (0 * fx + -1 * fz); i.mx = (-0 * fz + -1 * fx); freezeFarmer(); });
    check('台から落ちて床に戻る', g.player.surface === -1 && g.player.y === 0, `s=${g.player.surface} y=${g.player.y.toFixed(2)}`);

    // 8. 殺虫剤の霧でダメージ・仲間に乗りかわり
    g.start('normal', 17); freezeFarmer();
    g.nutrition = 100; inp.press('egg');
    RH.sim(11, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    const before = g.nymphs.length;
    const old = g.player;
    g.spawnCloud(old.x, 0, old.z);
    RH.sim(6, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('霧の中でやられる', !old.alive);
    check('仲間に意識が移る', g.player !== old && g.player.alive && g.state === 'play', `n ${before}->${g.nymphs.length}`);

    // 9. 時間切れで負け
    g.start('normal', 18); g.time = 0.5;
    RH.sim(1, 1 / 30, (gg, i) => idle(gg, i));
    check('時間切れで負け', g.state === 'over' && g.result && !g.result.win && g.result.reason === 'time');
    // 10. 目標達成で勝ち
    g.start('easy', 19);
    for (let k = 0; k < 6; k++) g.ruinCrate(g.crates[k]);
    RH.sim(0.1, 1 / 30, (gg, i) => idle(gg, i));
    check('目標達成で勝ち', g.state === 'over' && g.result.win);
    // 11. 出荷されすぎで負け
    g.start('hard', 20);
    for (let k = 0; k < 7; k++) g.crates[k].shipped = true;
    RH.sim(0.1, 1 / 30, (gg, i) => idle(gg, i));
    check('出荷されすぎで負け', g.state === 'over' && g.result.reason === 'shipped');
    // 12. 道さがし：どの置き場所にも農場主がたどり着ける
    const grid = g.grid;
    let bad = 0;
    for (const c of g.crates) {
      const path = grid.find(19, 9.5, c.x, c.z);
      const end = path[path.length - 1];
      if (Math.hypot(end.x - c.x, end.z - c.z) > 2.9) bad++;
    }
    check('どのコンテナにも手が届く', bad === 0, `bad=${bad}`);
    // 13. 台のふちで産んだ卵も、生まれた仲間も台の上にいる
    g.start('normal', 21); freezeFarmer();
    Object.assign(g.player, { x: 13, z: -6.85, surface: 0, y: 2.2, h: Math.PI, st: 'move' });
    g.nutrition = 100; inp.press('egg');
    RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    const egg = g.eggs[0];
    check('台のふちの卵が台の上にある', egg && egg.z <= -6.8 - 0.1 && egg.z >= -9.2, egg && egg.z.toFixed(2));
    g.hatch(egg);
    check('生まれた仲間も台の上', g.nymphs.every((r) => r.z <= -6.8 && r.z >= -9.2 && r.x >= 8.5 && r.x <= 17.5));
    // 14. やり直しをくり返してもメモリが増え続けない
    const mem = () => RH.renderer.info.memory.geometries;
    g.start('normal', 22); RH.sim(2, 1 / 30, idle);
    RH.renderer.render(RH.scene, RH.camera);
    const m0 = mem();
    for (let k = 0; k < 4; k++) { g.start('normal', 23 + k); for (let j = 0; j < 4; j++) { g.startAct('spray', 0, 0, 0); g.farmer.act.t = 9; g.updateAct(0.01); } RH.sim(2, 1 / 30, idle); RH.renderer.render(RH.scene, RH.camera); }
    const m1 = mem();
    check('やり直しでメモリが増え続けない', m1 - m0 < 30, `${m0}->${m1}`);
    // 15. 落としたコンテナは畝・台・わなの上に置かれない
    let badDrop = 0;
    for (const [fx, fz] of [[0, 0], [-10, 2.5], [13, -4.5], [21, 13], [-21, -13]]) {
      g.start('normal', 30);
      const cc2 = g.crates[0];
      g.farmer.x = fx; g.farmer.z = fz; g.farmer.carry = cc2; cc2.carried = true; g.farmer.model.root.attach(cc2.model.group);
      g.dropCarry();
      const W = window.__rh;
      if (cc2.x < -21 || cc2.x > 21 || cc2.z < -13 || cc2.z > 13) badDrop++;
      if (g.traps.some((t) => Math.hypot(t.x - cc2.x, t.z - cc2.z) < 1)) badDrop++;
    }
    check('落としたコンテナの置き場所', badDrop === 0, `bad=${badDrop}`);
    // 16. 殺虫剤で卵がやられる
    g.start('normal', 31); freezeFarmer();
    g.nutrition = 100; g.player.x = -10; g.player.z = 0; inp.press('egg');
    RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    g.player.x = -5;
    g.spawnCloud(g.eggs[0].x, 0, g.eggs[0].z);
    RH.sim(2.5, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('殺虫剤で卵がやられる', !g.eggs[0].alive);
    return out;
  });
  console.log(results.join('\n'));
  console.log('ERRORS', errors.length, errors.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
