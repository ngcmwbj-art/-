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
    const freezeFarmer = () => { g.farmer.state = 'WORK'; g.farmer.phase = 'idle'; g.farmer.timer = 999; g.farmer.act = null; g.farmer.susp = 0; g.farmer.x = 19; g.farmer.z = 12; g.farmer.h = Math.PI / 2; };

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
    g.start('s5', 17); freezeFarmer();
    g.nutrition = 100; inp.press('egg');
    RH.sim(11, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    const before = g.nymphs.length;
    const old = g.player;
    g.spawnCloud(old.x, 0, old.z);
    RH.sim(6, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('霧の中でやられる', !old.alive);
    check('仲間に意識が移る', g.player !== old && g.player.alive && g.state === 'play', `n ${before}->${g.nymphs.length}`);

    // 9. 時間制限はない：何もしなくても時間では終わらない
    g.start('normal', 18); freezeFarmer();
    RH.sim(400, 1 / 15, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('時間では負けない', g.state === 'play', g.state);
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

    // 17. 練習：農場主は動かず、手順どおりに進んで本番になる
    g.start('normal', 40, { tutorial: true });
    const fx0 = g.farmer.x;
    RH.sim(2, 1 / 30, (gg, i) => { idle(gg, i); i.mz = 1; });
    check('練習1：歩くと次へ', g.tutorial && g.tutorial.step >= 1);
    g.camYaw += 1.2;
    RH.sim(0.2, 1 / 30, idle);
    check('練習2：見回すと次へ', g.tutorial && g.tutorial.step >= 2);
    const tc = g.crates.find((c) => c.table < 0);
    Object.assign(g.player, { x: tc.x, z: tc.z + (tc.z > 0 ? -0.7 : 0.7), surface: -1, y: 0 });
    RH.sim(3, 1 / 30, (gg, i) => { idle(gg, i); i.actionHeld = true; });
    check('練習3：食べると次へ', g.tutorial && g.tutorial.step >= 3, g.tutorial && g.tutorial.step);
    check('練習中は農場主が動かない', Math.abs(g.farmer.x - fx0) < 0.01 && g.farmer.susp === 0);
    g.endTutorial(false);
    check('練習をとばすと本番', !g.tutorial && !g.calm);

    // 18. ナイス！：緑の帯で離すと少し多く食べられる
    g.start('normal', 41); freezeFarmer();
    const nc = g.crates.find((c) => c.table < 0);
    Object.assign(g.player, { x: nc.x, z: nc.z + (nc.z > 0 ? -0.7 : 0.7), surface: -1, y: 0 });
    let held = true;
    RH.sim(3, 1 / 30, (gg, i) => { idle(gg, i); if (gg.player.greed > 70) held = false; i.actionHeld = held; freezeFarmer(); });
    check('ナイス！が出る', g.stats.nice >= 1, `nice=${g.stats.nice}`);

    // 19. 栽培槽に登って株の実をかじる → 落ちて音がする
    g.start('normal', 42); freezeFarmer();
    const fr = RH.plantFruits.filter((f) => f.alive && f.y < 2.3 && f.x < -2).sort((a, b) => a.y - b.y)[0];
    const row = RH.rows.find((r) => Math.abs(r.z - fr.z) < 1);
    Object.assign(g.player, { x: fr.x, z: row.z + (fr.z > row.z ? -0.85 : 0.85), surface: -1, y: 0, st: 'move' });
    inp.press('action');
    RH.sim(1.2, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('栽培槽に登れる', g.player.surface >= 3 && Math.abs(g.player.y - 1.48) < 0.01, `s=${g.player.surface} y=${g.player.y}`);
    Object.assign(g.player, { x: fr.x, z: Math.max(row.minZ + 0.1, Math.min(row.maxZ - 0.1, fr.z)) });
    const reachF = g.fruitInReach(g.player);
    check('実に届く', !!reachF);
    g.farmer.x = fr.x + 6; g.farmer.z = row.z + 2.5;
    let susp0 = g.farmer.susp;
    RH.sim(8, 1 / 30, (gg, i) => { idle(gg, i); i.actionHeld = (Math.floor(gg.elapsed * 2) % 3) !== 2; gg.farmer.state = 'WORK'; gg.farmer.phase = 'idle'; gg.farmer.timer = 999; });
    check('実が落ちる', g.stats.fruits >= 1, `fruits=${g.stats.fruits}`);
    check('落ちた音で農場主があやしむ', g.farmer.susp > susp0 || g.farmer.state !== 'WORK', `susp=${g.farmer.susp.toFixed(0)}`);

    // 20. 毒エサ：栄養は満タン、でも体力が減る
    g.start('normal', 43); freezeFarmer();
    const bt = g.baits[0];
    check('ふつうは毒エサが1つある', g.baits.length === 1);
    Object.assign(g.player, { x: bt.x + 0.3, z: bt.z, surface: -1, y: 0 });
    RH.sim(1.6, 1 / 30, (gg, i) => { idle(gg, i); i.actionHeld = true; freezeFarmer(); });
    check('毒エサで栄養が満タン', g.nutrition >= 99 && g.player.poison > 0, `nut=${g.nutrition} poison=${g.player.poison.toFixed(1)}`);
    const hp1 = g.player.hp;
    RH.sim(5, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('毒で体力が減る', g.player.hp < hp1 - 8, `${hp1.toFixed(0)}->${g.player.hp.toFixed(0)}`);

    // 21. 風に乗る：通路の先まで飛ぶ
    g.start('normal', 44); freezeFarmer();
    const LN = RH.windLanes[0];
    Object.assign(g.player, { x: LN.x0 + 0.2, z: LN.z, surface: -1, y: 0 });
    check('風の入口で「風に乗る」', g.context() && g.context().text === '風に乗る');
    inp.press('action');
    RH.sim(4, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('通路の先に着地', Math.abs(g.player.x - LN.x1) < 0.6 && g.player.y === 0 && g.player.st === 'move', `x=${g.player.x.toFixed(1)}`);

    // 22. 燻煙剤：逃げ場にいれば助かり、外にいる仲間はやられる。卵は無事
    g.start('normal', 45);
    g.nutrition = 100; Object.assign(g.player, { x: -10, z: 2.5 }); inp.press('egg');
    RH.sim(0.1, 1 / 30, idle);
    const egg2 = g.eggs[0];
    egg2.t = -999; // ふ化しないように
    for (let k = 0; k < 4; k++) g.ruinCrate(g.crates[k]);
    g.farmer.anger = 3; g.farmer.state = 'WORK'; g.farmer.phase = 'choose'; g.farmer.x = 19; g.farmer.z = 9.5;
    RH.sim(0.1, 1 / 30, idle);
    check('怒りが最大で燻煙剤', g.farmer.state === 'FUMIGATE');
    const sp2 = RH.safeSpots[1];
    Object.assign(g.player, { x: sp2.x + 0.3, z: sp2.z, surface: -1, y: 0 });
    const nym = g.spawnRoach(-3, -7.5, true);
    RH.sim(60, 1 / 20, (gg, i) => { idle(gg, i); });
    check('逃げ場にいれば助かる', g.player.alive && g.state === 'play');
    check('煙が晴れて農場主がもどる', g.fog && g.fog.cleared && g.farmer.state !== 'FUMIGATE');
    check('燻煙剤から生きのびた記録', g.stats.smokeSurvived === 1);
    check('卵は煙に強い', egg2.alive);

    // 23. 出荷が終わるまでの勝負：残りの出荷数
    g.start('normal', 46);
    check('最初は「あと9箱」', g.shipLeft() === 9, g.shipLeft());

    // 24. 今日の注文・称号・羽の色
    const F = RH.features;
    const ords = F.todaysOrders('2026-11-03');
    check('今日の注文は2つ', ords.length === 2 && ords[0].id !== ords[1].id);
    check('同じ日は同じ注文', F.todaysOrders('2026-11-03').map((o) => o.id).join() === ords.map((o) => o.id).join());
    const st = { ruined: 10, eggs: 3, attacks: 2, escapes: 0, nice: 9, winds: 2, fruits: 5, baits: 0, smokeSurvived: 0, shipped: 2, stuck: 0, chased: 0, ruinedColor: [3, 3, 4], seen: ['trap'] };
    const rs1 = F.applyResult(F.normalizeRecords(null), { win: true, diff: 'normal', alive: 6 }, st, ords, '2026-11-03');
    check('注文をこなせる', rs1.cleared.length === 2, rs1.cleared.join());
    check('称号が取れる', rs1.newTitles.some((t) => t.id === 'first') && rs1.newTitles.some((t) => t.id === 'win1'));
    check('羽の色が増える', rs1.newWings.includes('black') && rs1.newWings.includes('paprika'));
    const rs2 = F.applyResult(rs1.rec, { win: true, diff: 'normal', alive: 6 }, st, ords, '2026-11-03');
    check('同じ日の同じ注文は1回だけ数える', rs2.rec.orders === rs1.rec.orders);

    // 25. 仲間の数に上限はない：45匹にしても動く
    g.start('normal', 50); freezeFarmer();
    Object.assign(g.player, { x: -10, z: 2.5, surface: -1, y: 0 });
    for (let k = 0; k < 15; k++) { g.nutrition = 100; g.tryLayEgg(g.player); g.player.x += 0.4; }
    for (const e of [...g.eggs]) g.hatch(e);
    check('仲間が9匹をこえて増える', g.nymphs.length >= 45, `n=${g.nymphs.length}`);
    g.setMode('search');
    const t0 = performance.now();
    const badMany = RH.sim(20, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    const msPer = (performance.now() - t0) / 600;
    check('45匹でも異常なく動く', badMany.length === 0 && g.state === 'play', badMany.join());
    check('45匹でも計算が軽い（1コマ8ms未満）', msPer < 8, `${msPer.toFixed(2)}ms`);

    // 26. 6つのステージ：1〜5はだんだん難しくなり、6は夜の特別ステージ。クリアで次が開く
    const STG = RH.stages, S5 = STG.slice(0, 5);
    check('ステージは6つ', STG.length === 6);
    check('先へ進むほど目標の箱が増える（1〜5）', S5.every((st, k) => k === 0 || st.target > S5[k - 1].target), S5.map((x) => x.target).join(','));
    check('先へ進むほど農場主が速く鋭い（1〜5）', S5.every((st, k) => k === 0 || (st.fSpeed >= S5[k - 1].fSpeed && st.susp >= S5[k - 1].susp)));
    check('ステージ6は夜', !!STG[5].night && S5.every((x) => !x.night));
    check('どのステージにも開始時の一言がある', STG.every((x) => typeof x.tip === 'string' && x.tip.length > 5));
    const btns = [...document.querySelectorAll('#stages .stage')];
    check('はじめはステージ1だけ遊べる', btns.length === 6 && !btns[0].disabled && btns.slice(1).every((b) => b.disabled));
    const r1 = F.applyResult(F.normalizeRecords(null), { win: true, diff: 's1', alive: 0 }, st, [], '2026-11-03');
    check('ステージ1クリアでステージ2が開く', r1.rec.cleared === 1 && r1.unlockedStage === 2);
    const r2 = F.applyResult(r1.rec, { win: false, diff: 's2', alive: 0 }, st, [], '2026-11-03');
    check('負けたら次は開かない', r2.rec.cleared === 1 && r2.unlockedStage === 0);
    const r3 = F.applyResult(r1.rec, { win: true, diff: 's1', alive: 0 }, st, [], '2026-11-03');
    check('同じステージをもう一度クリアしても進まない', r3.rec.cleared === 1 && r3.unlockedStage === 0);
    check('以前の記録（むずかしいで勝ち）はステージ5まで開いた扱い', F.normalizeRecords({ winHard: true }).cleared === 5);
    g.start('s4', 60);
    check('ステージ4の目標は9箱・出荷の限度は8箱', g.diff.target === 9 && g.shipLeft() === 8, `${g.diff.target}/${g.shipLeft()}`);

    // 27. 星3つと自己ベスト
    const stA = { ...st, shipped: 2, chased: 1, deaths: 0 };
    const s3 = F.starsOf({ win: true }, stA);
    check('出荷少なく見つからずに勝てば星3つ', s3.count === 3);
    check('負けたら星0', F.starsOf({ win: false }, stA).count === 0);
    check('出荷が多いと星2つめはつかない', F.starsOf({ win: true }, { ...stA, shipped: 6 }).each[1] === false);
    const rb1 = F.applyResult(F.normalizeRecords(null), { win: true, diff: 's1', alive: 0, elapsed: 300 }, stA, [], '2026-11-03');
    check('星が記録される', rb1.rec.stars.s1 === 3);
    check('自己ベストが記録される', rb1.rec.bests.s1.time === 300 && rb1.rec.bests.s1.shipped === 2 && rb1.newBest.time);
    const rb2 = F.applyResult(rb1.rec, { win: true, diff: 's1', alive: 0, elapsed: 400 }, { ...stA, shipped: 5 }, [], '2026-11-03');
    check('遅い記録でベストは上書きされない', rb2.rec.bests.s1.time === 300 && rb2.rec.bests.s1.shipped === 2 && !rb2.newBest.time && rb2.rec.stars.s1 === 3);
    check('本の自己ベスト表がある', !!document.getElementById('bookBest'));

    // 28. 負けたときの一言：記録された理由に合わせる
    g.start('s1', 70);
    g.lastDeathCause = 'trap';
    check('ホイホイでやられたらホイホイの助言', /ホイホイ/.test(g.advice(false, 'dead')));
    g.lastDeathCause = 'cat';
    check('ネコでやられたらネコの助言', /ネコ/.test(g.advice(false, 'dead')));
    g.stats.attacks = 0;
    check('出荷されて負け・突撃なしなら突撃をすすめる', /突撃/.test(g.advice(false, 'shipped')));

    // 29. ネコ（ステージ4以降）
    g.start('s1', 71);
    check('ステージ1にネコはいない', !g.cat);
    g.start('s4', 72); freezeFarmer();
    check('ステージ4にはネコがいる', !!g.cat);
    {
      const C = g.cat, P = g.player;
      Object.assign(P, { x: -8, z: 3, surface: -1, y: 0, hp: 100 });
      Object.assign(C, { x: -8, z: 0.2, h: 0, st: 'wander', cd: 0, t: 0, pesterT: 999 });
      g.toast = () => {};
      let pounced = false;
      RH.sim(6, 1 / 30, (gg, i, k) => { idle(gg, i); i.mz = k % 20 < 10 ? 0.3 : -0.3; freezeFarmer(); if (gg.cat.st === 'pounce') pounced = true; });
      check('床のゴキブリにネコがとびかかる', pounced, `st=${C.st} hp=${P.hp.toFixed(0)}`);
      g.start('s4', 73); freezeFarmer();
      const C2 = g.cat, P2 = g.player, sf = RH.world ? null : null;
      const tb = g.crates.find((c) => c.table >= 0);
      Object.assign(P2, { x: tb.x, z: tb.z + 0.6, surface: tb.table, y: 1, hp: 100 });
      P2.y = 0.9;
      Object.assign(C2, { x: tb.x, z: tb.z - 2, st: 'wander', cd: 0, pesterT: 999 });
      RH.sim(4, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('台の上ならネコにねらわれない', C2.st !== 'pounce' && C2.st !== 'stalk' && P2.hp === 100, `st=${C2.st}`);
      let bells = 0;
      g.cat.pesterT = 999;
      RH.sim(5, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); bells += gg.soundPings.filter((s) => s.kind === 'bell').length; gg.soundPings.length = 0; });
      check('ネコが動くと鈴が鳴る（波紋も出る）', bells > 0, `n=${bells}`);
    }

    // 30. JAの検品
    g.start('s1', 74);
    check('ステージ1に検品はない', !g.diff.inspect);
    g.start('s3', 75); freezeFarmer();
    g.shipped = 3;
    RH.sim(0.2, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('出荷3箱で検品の予告が出る', g.inspector && g.inspector.st === 'coming');
    Object.assign(g.player, { x: -18, z: -12, surface: -1, y: 0 });
    RH.sim(11, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    check('10秒後に検品員が入ってくる', g.inspector && g.inspector.st !== 'coming' && !!g.inspector.m);
    if (g.inspector && g.inspector.m) {
      const I = g.inspector;
      Object.assign(g.player, { x: I.x + Math.sin(I.h) * 2.5, z: I.z + Math.cos(I.h) * 2.5, surface: -1, y: 0 });
      g.farmer.timer = 0;
      RH.sim(0.5, 1 / 30, (gg, i) => { idle(gg, i); i.mx = 0.2; });
      check('検品員の前に出ると農場主が飛んでくる', I.spotted && g.farmer.state === 'CHASE', `st=${g.farmer.state}`);
    }

    // 31. 夜のステージ：懐中電灯
    RH.startGame('s6');
    check('ステージ6は夜になる', RH.world.night === true && g.diff.key === 's6');
    check('夜は農場主が懐中電灯を持つ', !!g.flashlight && g.flashlight.visible && g.flashlight.intensity > 0);
    RH.startGame('s1');
    check('ほかのステージは昼にもどる', RH.world.night === false);

    // 32. 燻煙剤の煙の中の逃げ道の線
    g.start('s2', 78);
    g.startFumigation();
    RH.sim(1, 1 / 30, (gg, i) => { idle(gg, i); });
    check('燻煙剤のとき逃げ道の線が出る', !!g.safeLine && g.safeLine.visible !== false);

    // 33. 音：かじる音は同時に4つまで、音量のつまみ
    check('音量のつまみがある', !!document.getElementById('optVolume'));
    check('音の大きさを変えられる', typeof g.sfx.setVolume === 'function');
    return out;
  });
  console.log(results.join('\n'));
  console.log('ERRORS', errors.length, errors.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
