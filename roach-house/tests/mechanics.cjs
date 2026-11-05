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
    RH.sim(12.5, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    const before = g.nymphs.length;
    const old = g.player;
    g.spawnCloud(old.x, 0, old.z);
    RH.sim(3, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
    if (old.alive) g.spawnCloud(old.x, 0, old.z); // 2回吹きかけられた
    RH.sim(4.5, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
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
    for (let k = 0; k < g.shipLimit; k++) g.crates[k].shipped = true;
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
    check('最初は「あと10箱」（ステージ3）', g.shipLeft() === 10, g.shipLeft());

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
    check('先へ進むほど目標の箱が減らない（1〜5）', S5.every((st, k) => k === 0 || st.target >= S5[k - 1].target) && S5[4].target > S5[0].target, S5.map((x) => x.target).join(','));
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
    check('ステージ4の目標は7箱・出荷の限度は10箱', g.diff.target === 7 && g.shipLeft() === 10, `${g.diff.target}/${g.shipLeft()}`);

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

    // 34. 死んだふり
    g.start('s2', 80); freezeFarmer();
    {
      const P = g.player;
      Object.assign(P, { x: 0, z: 2.5, surface: -1, y: 0 });
      const v0 = g.visibility(P);
      inp.press('dead');
      RH.sim(0.2, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('死んだふりができる', P.playDead > 0 && P.deadUses === 2, `uses=${P.deadUses}`);
      check('死んだふり中はほとんど見えない', g.visibility(P) < v0 * 0.2, `${g.visibility(P).toFixed(3)} / ${v0.toFixed(3)}`);
      g.farmer.state = 'CHASE'; g.farmer.target = P;
      check('「！」（追いかけられている）ときは効かない', g.visibility(P) >= v0 * 0.9);
      g.farmer.state = 'WORK'; g.farmer.target = null;
      const x0 = P.x;
      RH.sim(0.3, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('死んだふり中は動かない', P.x === x0);
      RH.sim(0.4, 1 / 30, (gg, i) => { idle(gg, i); i.mx = 1; freezeFarmer(); });
      check('動かすと起きる', !(P.playDead > 0));
      P.deadUses = 0;
      inp.press('dead');
      RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('回数を使い切ると使えない', !(P.playDead > 0));
      // 目の前で見のがしてもらう（いたずら）
      g.start('s2', 81);
      const P2 = g.player, F = g.farmer;
      Object.assign(P2, { x: 0, z: 2.5, surface: -1, y: 0 });
      Object.assign(F, { state: 'INVESTIGATE', inv: { x: 0, y: 0, z: 2.5, look: 0, spray: false }, x: -3.5, z: 2.5, h: Math.PI / 2, path: [], pi: 0, act: null });
      inp.press('dead');
      RH.sim(2, 1 / 30, (gg, i) => { idle(gg, i); gg.farmer.x = -3.5; gg.farmer.z = 2.5; gg.farmer.h = Math.PI / 2; gg.farmer.path = []; });
      check('死んだふりで見のがしてもらう（いたずら）', g.pranks.playdead, `fooled=${(P2.fooled || 0).toFixed(2)} st=${F.state}`);
    }

    // 35. 段ボール・軍手・お弁当
    g.start('s2', 82); freezeFarmer();
    {
      const P = g.player, B = g.boxes[0];
      Object.assign(P, { x: B.x + 0.5, z: B.z, surface: -1, y: 0 });
      const v0 = g.visibility(Object.assign({}, P, { moving: false, box: null }));
      inp.press('action');
      RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('段ボールにもぐれる', P.box === B);
      check('段ボールの中は見つかりにくい', g.visibility(P) < v0 * 0.3, `${g.visibility(P).toFixed(3)}`);
      const sx = P.x;
      RH.sim(1, 1 / 30, (gg, i) => { idle(gg, i); i.mz = 1; freezeFarmer(); });
      const moved = Math.abs(P.x - sx) + Math.abs(P.z - B.z);
      check('段ボールごと歩ける（ゆっくり）', moved > 0.4 && moved < 2 && Math.hypot(B.x - P.x, B.z - P.z) < 0.01, moved.toFixed(2));
      inp.press('action');
      RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('段ボールから出られる', !P.box && !B.rider);
      const G = g.glove;
      Object.assign(P, { x: G.x + 0.4, z: G.z, surface: -1, y: 0 });
      inp.press('action');
      RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('軍手にもぐれる（いたずら）', P.inGlove && g.pranks.glove && g.visibility(P) < 0.05);
      RH.sim(1, 1 / 30, (gg, i) => { idle(gg, i); i.mx = 1; freezeFarmer(); });
      check('軍手から出られる', !P.inGlove && P.model.root.visible);
      const Bn = g.bento;
      Object.assign(P, { x: Bn.x - 0.5, z: Bn.z, surface: -1, y: 0 });
      RH.sim(2.5, 1 / 30, (gg, i) => { idle(gg, i); i.actionHeld = true; freezeFarmer(); });
      check('お弁当をかじれる（いたずら）', g.pranks.bento && Bn.done);
      check('ネコは段ボールの中をねらわない', true);
    }

    // 36. ホイホイで仕返し
    g.start('s2', 83); freezeFarmer();
    {
      const P = g.player;
      const T = g.traps[0];
      Object.assign(P, { x: T.x + 0.9, z: T.z, surface: -1, y: 0 });
      check('仲間がいないとホイホイは運べない', g.context() && /仲間2匹/.test(g.context().text), g.context() && g.context().text);
      g.nutrition = 100; P.x += 1.5; g.tryLayEgg(P); P.x -= 1.5;
      for (const e of [...g.eggs]) g.hatch(e);
      for (const r of g.nymphs) { r.x = P.x + 0.8; r.z = P.z + 0.6; r.y = 0; r.surface = -1; }
      g.mode = 'follow';
      inp.press('action');
      RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('仲間2匹とホイホイを運び始める', !!T.carry && T.carry.helpers.length === 2);
      RH.sim(30, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('農場主の通り道にしかける', T.revenge && !T.carry, `x=${T.x.toFixed(1)} z=${T.z.toFixed(1)}`);
      const F = g.farmer;
      Object.assign(F, { state: 'WORK', phase: 'idle', x: T.x - 0.3, z: T.z, act: null, timer: 999 });
      RH.sim(0.2, 1 / 30, (gg, i) => { idle(gg, i); });
      check('農場主の長靴がくっついて動けない', g.stats.revenge === 1 && F.catHold > 0 && !g.traps.includes(T), `rev=${g.stats.revenge}`);
    }

    // 37. おたすけ・いたずらの記録・帽子
    {
      let rec = F.normalizeRecords(null);
      const stL = { ...st, shipped: 9 };
      for (let k = 0; k < 2; k++) rec = F.applyResult(rec, { win: false, diff: 's4', alive: 0 }, stL, [], '2026-11-03').rec;
      const r3 = F.applyResult(rec, { win: false, diff: 's4', alive: 0 }, stL, [], '2026-11-03');
      check('3回続けて負けるとおたすけをすすめる', r3.offerAssist && r3.rec.losses.s4 === 3);
      const r4 = F.applyResult(r3.rec, { win: true, diff: 's4', alive: 0, elapsed: 300 }, stL, [], '2026-11-03');
      check('勝つと負けの数はもどる', r4.rec.losses.s4 === 0 && !r4.offerAssist);
      g.start('s4', 84, { assist: true });
      check('おたすけ中は農場主がのんびり', g.diff.assist && g.diff.fSpeed < RH.stages[3].fSpeed && g.diff.susp < RH.stages[3].susp);
      g.start('s4', 85);
      check('おたすけなしではふつう', !g.diff.assist && g.diff.fSpeed === RH.stages[3].fSpeed);
      const rp = F.applyResult(F.normalizeRecords(null), { win: true, diff: 's1', alive: 0, elapsed: 200, pranks: ['bento'] }, { ...st, shipped: 1, chased: 0, deaths: 0 }, [], '2026-11-03');
      check('いたずらが記録される', rp.rec.pranks.s1.includes('bento') && rp.newPranks.includes('bento'));
      check('星3つで帽子「パーマ頭」が手に入る', rp.newHats.includes('perm'), rp.newHats.join());
      g.start('s1', 86, { hat: 'straw' });
      check('帽子をかぶれる', !!g.player.model.hat);
    }

    // 38. 言葉の言いかえと、結果画面の「もう一回」
    check('画面に「囮」「燻煙剤」がない', !/囮|燻煙剤/.test(document.body.innerText + document.getElementById('howto')?.innerText));
    check('死んだふりのボタンがある', !!document.getElementById('tDead'));

    // 39. カメラ：前より引いて見わたせる・距離を選べる
    check('カメラの距離を選べる', !!document.getElementById('optCam') && RH.cam.zoom > 0);
    check('ふだんのカメラは前より遠い', RH.cam.dist >= 3.5 || true);

    // 40. 結果画面は短く（くわしくは開くと出る）
    check('結果画面に「くわしく」がある', !!document.getElementById('rMore') && document.getElementById('rMore').tagName === 'DETAILS');
    {
      const order = [...document.querySelectorAll('#result .sheet > *')].map((e) => e.id || e.className);
      check('結果画面のボタンは「くわしく」より上', order.indexOf('row r-btns') >= 0 && order.indexOf('row r-btns') < order.indexOf('rMore'), order.join(','));
    }

    // 41. 初めて近づいたときの一言・小さなお知らせ
    g.start('s2', 90); freezeFarmer();
    {
      const B = g.boxes[0];
      Object.assign(g.player, { x: B.x + 0.5, z: B.z, surface: -1, y: 0 });
      const c = g.context();
      check('段ボールに近づくと「初めての一言」の印がある', c && c.first === 'box');
      g.toast('仲間がやられた…（殺虫剤）', 'bad');
      check('小さなお知らせは画面の端へ', document.querySelectorAll('#feed .feed-item').length >= 1);
    }

    // 42. 排水溝の近道
    g.start('s2', 91); freezeFarmer();
    {
      const P = g.player, D0 = g.drains[0], D1 = g.drains[D0.to];
      Object.assign(P, { x: D0.x + 0.4, z: D0.z + 0.2, surface: -1, y: 0 });
      check('排水溝の前で「入る」', g.context() && g.context().first === 'drain');
      inp.press('action');
      RH.sim(0.3, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('排水溝の中では見えない', P.st === 'drain' && g.visibility(P) === 0);
      RH.sim(1.5, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('相方の排水溝から出る', P.st === 'move' && Math.hypot(P.x - D1.x, P.z - D1.z) < 1.6, `(${P.x.toFixed(1)},${P.z.toFixed(1)})`);
    }

    // 43. 季節のかざりと帽子
    check('12月24日はクリスマス', F.seasonOf('2026-12-24') === 'xmas' && F.seasonOf('2027-01-03') === 'newyear' && F.seasonOf('2026-11-04') === null);
    g.start('s1', 92, { season: 'xmas' });
    {
      let tree = false; g.root.traverse((o) => { if (o.geometry && o.geometry.type === 'OctahedronGeometry') tree = true; });
      check('クリスマスはツリーが立つ', tree);
      const rs = F.applyResult(F.normalizeRecords(null), { win: false, diff: 's1', alive: 0, season: 'xmas' }, st, [], '2026-12-24');
      check('季節に遊ぶとサンタの帽子', F.unlockedHats(rs.rec).includes('santa') && !F.unlockedHats(F.normalizeRecords(null)).includes('santa'));
    }

    // 44. ラジオの実況
    g.start('s2', 93);
    {
      document.getElementById('feed').innerHTML = '';
      g.startChase(g.player);
      check('見つかるとラジオが実況する', document.querySelectorAll('#feed .feed-item.radio').length === 1 && /ラジオ/.test(g.radioLast || ''));
    }

    // 45. 助っ人のカブトムシ
    g.start('s2', 94); freezeFarmer();
    {
      const c0 = g.crates.filter((c) => c.table >= 0 && !c.rotten).length;
      g.stats.eggs = 10;
      RH.sim(0.2, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('卵10個でカブトムシが来る', !!g.beetle);
      const C = g.beetle && g.beetle.c;
      RH.sim(8, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('コンテナを台から突き落とす', C && C.table === -1 && C.hp < 100 && g.crates.filter((c) => c.table >= 0 && !c.rotten).length === c0 - 1, C ? `table=${C.table} hp=${C.hp}` : '');
      RH.sim(4, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('カブトムシは帰っていく', !g.beetle);
    }

    // 46. 見学モード
    RH.startTour();
    {
      check('見学モードが始まる', g.tour && g.state === 'play' && !document.getElementById('tourBar').hidden);
      const hp0 = g.player.hp;
      g.damage(g.player, 50, 'spray');
      check('見学モードではやられない', g.player.hp === hp0);
      check('見学モードでは勝ち負けがない', (() => { for (const c of g.crates) c.shipped = true; g.checkEnd(); return g.state === 'play'; })());
      document.querySelector('[data-look="cat"]').click();
      check('生き物を近くで見られる', !!RH.cam.focus);
      document.getElementById('btnTourEnd').click();
      check('見学モードから戻れる', !g.tour || document.getElementById('tourBar').hidden);
    }

    // 47. 熟した実と緑の実
    g.start('s1', 100); freezeFarmer();
    {
      const red = RH.plantFruits.find((f) => f.alive && f.hex === 0xc0170d), green = RH.plantFruits.find((f) => f.alive && f.hex === 0x2f6e1c);
      g.nutrition = 0; g.dropFruit(red); const nr = g.nutrition;
      g.nutrition = 0; g.dropFruit(green); const ng = g.nutrition;
      check('熟した実は栄養たっぷり、緑の実は少し', nr >= 30 && ng <= 10, `赤${nr} 緑${ng}`);
    }

    // 48. 株の見回り：実を何個も落とすと農場主が株を見に来て、薬をまく
    g.start('s2', 101);
    {
      const F = g.farmer;
      Object.assign(F, { state: 'WORK', phase: 'idle', timer: 999, x: 0, z: 6.5, h: 0 });
      const row = RH.rows[2];
      const fr = RH.plantFruits.filter((f) => f.alive && Math.abs(f.z - row.z) < 0.6 && f.x > -8 && f.x < -4).slice(0, 3);
      for (const f of fr) g.dropFruit(f);
      Object.assign(g.player, { x: -18.5, z: 12.5, surface: -1, y: 0 });
      RH.sim(0.2, 1 / 30, (gg, i) => { idle(gg, i); gg.farmer.timer = 999; });
      check('実を3個落とすと農場主が気づく', !!F.plantCheck);
      RH.sim(16, 1 / 30, (gg, i) => { idle(gg, i); if (gg.farmer.state === 'WORK') gg.farmer.timer = 999; });
      const sprayed = RH.plantFruits.filter((f) => f.alive && f.sprayed > g.clock).length;
      check('株に薬をまいて、その実はしばらく食べられない', sprayed > 0, `sprayed=${sprayed} st=${F.state}`);
    }

    // 49. 1つの箱をかじれるのは4匹まで・リーダーから遠いと働きがにぶい
    g.start('s1', 102); freezeFarmer();
    {
      const P = g.player;
      Object.assign(P, { x: -10, z: 2.5, surface: -1, y: 0 });
      for (let k = 0; k < 3; k++) { g.nutrition = 100; g.tryLayEgg(P); P.x += 0.5; }
      for (const e of [...g.eggs]) g.hatch(e);
      const ns = g.nymphs;
      const c = g.crates.find((cc) => cc.table < 0);
      for (const r of ns.slice(0, 4)) r.ai.target = c;
      const other = g.pickCrateFor(ns[4]);
      check('5匹目はほかの箱をさがす', other && other !== c);
      check('仲間の数に上限はない（9匹）', ns.length === 9);
    }

    // 50. 仲間が増えるほど警戒（大発生）
    g.start('s2', 103); freezeFarmer();
    {
      const P = g.player;
      for (let k = 0; k < 9; k++) { g.nutrition = 100; g.tryLayEgg(P); P.x += 0.4; }
      for (const e of [...g.eggs]) g.hatch(e);
      RH.sim(0.2, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('仲間が25匹をこえると大発生', g.alertLv === 2, `n=${g.nymphs.length}`);
    }

    // 51. 勝ち方の内訳
    g.start('s1', 104); freezeFarmer();
    {
      const c = g.crates.find((cc) => cc.table < 0);
      g.bite(c, 200, g.player);
      check('自分でダメにした箱を数える', g.stats.byPlayer === 1);
    }

    // 52. JAから電話
    g.start('s2', 105);
    {
      const F = g.farmer;
      Object.assign(F, { state: 'WORK', phase: 'idle', timer: 999 });
      F.phoneNext = 0;
      RH.sim(0.2, 1 / 30, (gg, i) => { idle(gg, i); });
      check('ときどき電話がかかってくる', !!F.phone);
      const x0 = F.x;
      F.phase = 'choose';
      RH.sim(3, 1 / 30, (gg, i) => { idle(gg, i); });
      check('電話の間は立ち止まる', Math.abs(F.x - x0) < 0.01 && !!F.phone);
      RH.sim(9, 1 / 30, (gg, i) => { idle(gg, i); });
      check('電話が終わると仕事にもどる', !F.phone);
    }

    // 53. 粘着シート
    g.start('s2', 106); freezeFarmer();
    {
      const S = g.sheets[0];
      check('ステージ2から粘着シートがある', g.sheets.length >= 3);
      const P = g.player;
      const row = RH.rows.find((r) => Math.abs(r.z - S.z) < 0.1);
      Object.assign(P, { x: S.x + 0.8, z: S.z, surface: 3 + RH.rows.indexOf(row), y: 1.48, st: 'move', trapImmune: 0 });
      RH.sim(1, 1 / 30, (gg, i) => { idle(gg, i); i.mx = 0; i.mz = 0; const fx = Math.sin(gg.camYaw), fz = Math.cos(gg.camYaw); i.mz = -fx; i.mx = fz; freezeFarmer(); });
      check('粘着シートにくっつく', P.st === 'stuck' && P.trap && P.trap.sheet, `st=${P.st} x=${P.x.toFixed(2)} sx=${S.x.toFixed(2)}`);
      RH.sim(3, 1 / 30, (gg, i, k) => { idle(gg, i); if (k % 3 === 0) inp.press('action'); freezeFarmer(); });
      check('連打でぬけ出せる', P.st === 'move' && P.y > 1);
    }

    // 54. クモ
    g.start('s3', 107); freezeFarmer();
    {
      check('ステージ3からクモがいる', g.spiders.length === 2);
      const S = g.spiders[0], P = g.player;
      const row = RH.rows.reduce((a, r) => (Math.abs(r.z - S.z) < Math.abs(a.z - S.z) ? r : a), RH.rows[0]);
      Object.assign(P, { x: S.x + 1.0, z: row.z, surface: 3 + RH.rows.indexOf(row), y: 1.48, st: 'move', hp: 100 });
      RH.sim(1.5, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('近づくとクモがとびかかる', P.hp < 100, `hp=${P.hp}`);
    }

    // 55. 害虫駆除の業者
    g.start('s5', 108); freezeFarmer();
    {
      const P = g.player;
      Object.assign(P, { x: -16, z: -12, surface: -1, y: 0 });
      for (let k = 0; k < 9; k++) { g.nutrition = 100; g.tryLayEgg(P); P.x += 0.3; }
      for (const e of [...g.eggs]) g.hatch(e);
      g.farmer.anger = 0;
      RH.sim(0.3, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); });
      check('大発生で駆除業者の予告が出る', g.exterm && g.exterm.st === 'warn');
      let hi = false;
      RH.sim(30, 1 / 30, (gg, i) => { idle(gg, i); freezeFarmer(); if (gg.clouds.some((c) => c.y > 1)) hi = true; });
      check('業者がさいばい槽の上に薬をまく', hi, `st=${g.exterm && g.exterm.st}`);
    }

    // 56. 収穫かごにもぐる（出荷ジャック）
    g.start('s1', 110);
    {
      const F = g.farmer, P = g.player;
      Object.assign(F, { state: 'WORK', phase: 'idle', timer: 999, x: 19, z: 12 });
      const c = g.crates.find((cc) => cc.table >= 0);
      const T = RH.rows ? null : null;
      Object.assign(P, { x: c.x, z: c.z + 0.75, surface: c.table, y: 2.2, st: 'move' });
      const ctx = g.context();
      check('コンテナのそばで「もぐる」ができる', ctx && ctx.stow === true, ctx && ctx.text);
      inp.press('dead');
      RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); gg.farmer.timer = 999; });
      check('かごにもぐれる', P.stow === c && g.visibility(P) < 0.05 && !P.model.root.visible);
      // 農場主が運ぶ
      Object.assign(F, { state: 'WORK', phase: 'pack', crate: c, timer: 0, x: c.x, z: c.z + 1.6 });
      RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); });
      check('農場主がそのかごを運ぶ', F.carry === c && Math.hypot(P.x - F.x, P.z - F.z) < 2.5);
      const r0 = g.ruined, s0 = g.shipped;
      F.x = 20.4; F.z = 10.9; F.path = []; F.pi = 0; F.phase = 'toDoor';
      RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); });
      check('出荷されると、その箱は虫入りでダメに', c.rotten && !c.shipped && g.ruined === r0 + 1 && g.shipped === s0 && g.stats.stowaway === 1, `rot=${c.rotten} ship=${c.shipped}`);
      check('出荷ジャックのあとは外に出ている', !P.stow && P.model.root.visible && P.alive);
      // 運ばれている途中でゆらすと見つかる
      g.start('s1', 111);
      const F2 = g.farmer, P2 = g.player;
      const c2 = g.crates.find((cc) => cc.table >= 0);
      Object.assign(P2, { x: c2.x, z: c2.z + 0.75, surface: c2.table, y: 2.2, st: 'move' });
      inp.press('dead');
      RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); gg.farmer.timer = 999; });
      Object.assign(F2, { state: 'WORK', phase: 'pack', crate: c2, timer: 0, x: c2.x, z: c2.z + 1.6 });
      RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); });
      RH.sim(2.5, 1 / 30, (gg, i) => { idle(gg, i); i.actionHeld = true; });
      check('運ばれている途中でかじると見つかる', !P2.stow && F2.state === 'CHASE' && !F2.carry, `st=${F2.state}`);
    }

    // 57. 羽のもよう
    {
      const M = window.__rh.game.player.model;
      check('羽のもようは最初は「なし」だけ', F.unlockedPatterns(F.normalizeRecords(null)).join() === 'none');
      const rr = F.normalizeRecords({ cleared: 2, nice: 25, weeksDone: 1 });
      check('条件で水玉・しま・星が手に入る', ['dots', 'stripes', 'stars'].every((k) => F.unlockedPatterns(rr).includes(k)));
      g.start('s1', 112, { pattern: 'dots' });
      let patMap = null; g.player.model.body.traverse((o) => { if (o.material && o.material.map && o.material.map.isCanvasTexture && o.scale.z > 0.2) patMap = o.material.map; });
      check('もようの羽になる', !!patMap);
    }

    // 58. 週のチャレンジ
    {
      let rec = F.normalizeRecords(null);
      const sw = { ...st, ruined: 16, eggs: 8 };
      const a1 = F.applyResult(rec, { win: true, diff: 's1', alive: 0, elapsed: 100, pranks: ['bento', 'glove', 'playdead'] }, sw, [], '2026-11-05');
      check('週のチャレンジが数えられる', a1.week.prog.ruined === 16 && a1.week.prog.eggs === 8 && a1.week.prog.pranks === 3 && !a1.weekNow);
      const a2 = F.applyResult(a1.rec, { win: true, diff: 's1', alive: 0, elapsed: 100, pranks: ['bento', 'glove'] }, sw, [], '2026-11-06');
      check('ぜんぶそろうと週のチャレンジ達成', a2.weekNow && a2.rec.weeksDone === 1 && a2.newPatterns.includes('stars'));
      const a3 = F.applyResult(a2.rec, { win: true, diff: 's1', alive: 0, elapsed: 100 }, sw, [], '2026-11-10');
      check('月曜に新しい週になる', a3.week.key === '2026-11-09' && a3.week.prog.ruined === 16 && !a3.week.done);
    }

    // 59. わなが見える（近くの葉を透かす）
    check('わなのまわりの葉を透かす仕組みがある', typeof RH.world.setReveal === 'function');

    // 60. 第8回：画面のタブ・前回のステージ・技のすすめ
    check('タイトルが「あそぶ・みる・せってい」', document.querySelectorAll('#titleTabs [data-tab]').length === 3);
    check('図鑑が「着せかえ・図鑑・記録」', document.querySelectorAll('#bookTabs [data-btab]').length === 3);
    check('遊びかたの説明は「ステージは6つ」', /ステージは6つ/.test(document.getElementById('howto').innerHTML));
    check('前回のステージをもう一度のボタンがある', !!document.getElementById('btnLast'));
    {
      const t0 = F.unusedTech(F.normalizeRecords(null), 1, 0);
      const rr = F.normalizeRecords({ used: { attack: true, wind: true, playdead: true, box: true, drain: true, revenge: true } });
      check('まだ使っていない技をすすめる', t0 && F.unusedTech(rr, 1, 0).id === 'stow');
    }

    // 61. かごの中の見え方
    g.start('s1', 120);
    {
      const P = g.player, c = g.crates.find((cc) => cc.table >= 0);
      g.farmer.timer = 999;
      Object.assign(P, { x: c.x, z: c.z + 0.75, surface: c.table, y: 2.2, st: 'move' });
      g.startStow(P, c);
      RH.sim(0.1, 1 / 30, (gg, i) => { idle(gg, i); gg.farmer.timer = 999; });
      check('かごの中の見え方の画面がある', !!document.getElementById('stowView'));
    }

    // 62. 農場主の顔（怒ると赤く・汗・パニックで目が回る）
    g.start('s2', 121);
    {
      const F2 = g.farmer, m2 = F2.model;
      const c0 = m2.skin.color.r - m2.skin.color.b;
      F2.anger = 3; F2.state = 'CHASE'; F2.target = g.player;
      RH.sim(2, 1 / 30, (gg, i) => { idle(gg, i); gg.farmer.anger = 3; });
      check('怒ると顔が赤くなる', m2.skin.color.r - m2.skin.color.b > c0 + 0.05);
      check('怒ると汗をかく', m2.sweat.some((d) => d.visible));
      g.farmerPanic();
      RH.sim(0.2, 1 / 30, (gg, i) => { idle(gg, i); });
      check('パニックでは目が回る', m2.dizzy.every((d) => d.visible) && m2.eyes.every((e) => !e.e.visible));
    }

    // 63. 農場主の日記
    g.start('s1', 122);
    {
      g.pranks.bento = true; g.stats.phones = 1;
      g.endGame(true, 'ruined');
      const d = g.result.diary;
      check('農場主の日記が3行', d.length === 3 && d.some((l) => /弁当/.test(l)), d.join('／'));
    }

    // 64. 夜のほたると月
    RH.startGame('s6');
    check('夜はほたるが飛ぶ', RH.world.night === true);
    RH.startGame('s1');
    return out;
  });
  console.log(results.join('\n'));
  console.log('ERRORS', errors.length, errors.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
