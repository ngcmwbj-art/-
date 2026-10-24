'use strict';
/* =========================================================
   戦闘
   - 画面には触らない。状態 b を変えるだけで、描画は ui/render-battle.js
   - b.fx に「起きたこと」を積むと、描画側が数字の演出などに使う
   ターンの流れ：
     プレイヤーのターン開始（守り0・エネルギー回復・状態の効果・鶏の卵・5枚引く）
     → カードを使う
     → ターン終了：手札を捨てる → 敵の行動 → 作物と木が1段育つ（成木は実が1つなる）→ 敵の次の行動を決める
   畑（plots）：野菜 { crop, growth, stages } / 木 { crop, tree:true, growth, stages, fruits, maxFruits }
   畜舎（barns）：{ animal, growth, stages, care }  家畜は自然には育たない
   ========================================================= */
FR.Battle = {
  create(run) {
    const rnd = FR.Run.rngFor(run, 'battle');
    const farmer = FR.Farmers[run.farmerId];
    const n = run.battleIndex;
    // 顔ぶれを選ぶ（②でマップができたら、マスの種類から決める）
    const pool = FR.Encounters.filter(en => n >= en.from);
    const enc = FR.Util.weighted(rnd, pool.map(en => ({ value: en, weight: en.weight * ((en.bias && en.bias[run.farmerId]) || 1) })));
    const strength = Math.floor(n / FR.Config.scaling.damageEveryBattles);
    const enemies = enc.enemies.map((id, k) => {
      const def = FR.Enemies[id];
      const hp = FR.Util.randInt(rnd, def.hp[0], def.hp[1]) + n * (def.hpGrowth || 0);
      return {
        uid: k + 1, id, def, name: def.name, hp, maxHp: hp, strength, dead: false,
        turnsLeft: def.turns || null,   // 天候：あと何ターンで過ぎ去るか
        moveIndex: def.randomStart ? FR.Util.randInt(rnd, 0, def.pattern.length - 1) : 0, intent: null
      };
    });

    const b = {
      run, rnd,
      encounter: enc.id,
      enemies,
      target: null,     // いま使っているカードの狙い（敵）
      block: 0,
      energy: 0,
      statuses: {},
      draw: FR.Util.shuffle(rnd, run.deck.map(c => ({ ...c }))),
      hand: [], discard: [], exhaust: [],
      plots: new Array(farmer.plots).fill(null),
      barns: new Array(farmer.barns || 0).fill(null),
      turn: 0,
      playedThisTurn: 0,
      lastHarvested: 0,
      nextUid: 10000,   // 戦闘中にだけ混ざるカード（病斑など）の番号
      over: false, won: false,
      fx: [],
      log: []
    };
    FR.Battle.chooseIntents(b);
    FR.Effects.relicHook(b, 'battleStart');
    FR.Battle.startTurn(b);
    return b;
  },

  // ── ターン ─────────────────────────────────
  startTurn(b) {
    b.turn++;
    b.block = 0;
    b.energy = FR.Config.energy;
    b.playedThisTurn = 0;
    // 状態の効果（かかし・ハウス・備え・草生など）
    for (const id of Object.keys(FR.Statuses)) {
      const st = FR.Statuses[id];
      const n = b.statuses[id] || 0;
      if (n > 0 && st.turnStart) st.turnStart(b, n);
      if (b.over) return;
    }
    // 育ちきった家畜の毎ターンの効果（鶏の卵）
    b.barns.forEach(a => {
      if (!a || a.growth < a.stages) return;
      const def = FR.Animals[a.animal];
      if (def.onTurnMature) FR.Effects.run(b, def.onTurnMature);
    });
    FR.Effects.relicHook(b, 'turnStart');
    FR.Battle.drawCards(b, FR.Config.handSize);
  },

  // ターン終了をまとめて行う（テストや自動プレイ用。画面では endTurnBegin → enemyActOne × 敵の数 → endTurnFinish を間をあけて呼ぶ）
  endTurn(b) {
    if (b.over) return;
    FR.Battle.endTurnBegin(b);
    FR.Battle.enemyAct(b);
    if (b.over) return;
    FR.Battle.endTurnFinish(b);
  },

  // 手札を捨てる
  endTurnBegin(b) {
    b.discard.push(...b.hand);
    b.hand = [];
  },

  // 敵が動いたあと：覆いが外れ、作物が育ち、悪い状態が減り、天候が進み、次のターンへ
  endTurnFinish(b) {
    if (b.over) return;
    for (const id of Object.keys(FR.Statuses)) {
      if (FR.Statuses[id].clearAtTurnEnd) b.statuses[id] = 0;
    }
    // 乾燥していなければ作物と木が育つ
    if (b.statuses.dry > 0) b.fx.push({ kind: 'note', text: '乾燥で作物が育たない' });
    else FR.Battle.growAll(b, 1, true);
    // 悪い状態は1ずつ減る
    for (const id of Object.keys(FR.Statuses)) {
      if (FR.Statuses[id].decay && b.statuses[id] > 0) b.statuses[id]--;
    }
    // 天候は時間がたつと過ぎ去る
    FR.Battle.aliveEnemies(b).forEach(e => {
      if (!e.turnsLeft) return;
      e.turnsLeft--;
      if (e.turnsLeft <= 0) {
        e.dead = true;
        b.fx.push({ kind: 'defeated', enemy: e.uid });
        b.fx.push({ kind: 'note', text: e.name + 'が過ぎ去った' });
      }
    });
    if (!FR.Battle.aliveEnemies(b).length) { FR.Battle.win(b); return; }
    FR.Battle.chooseIntents(b);
    FR.Battle.startTurn(b);
  },

  // ── カード ─────────────────────────────────
  NEEDS: {
    emptyPlot:     { test: b => b.plots.some(p => !p), reason: '空いた区画がない' },
    ripeCrop:      { test: b => FR.Battle.hasHarvestable(b), reason: '収穫できるものがない' },
    anyCrop:       { test: b => b.plots.some(p => p && ((!p.tree && p.growth >= 1) || (p.tree && p.fruits > 0))), reason: '1段以上育った作物がない' },
    tree:          { test: b => FR.Battle.treeCount(b) > 0, reason: '木が植わっていない' },
    emptyBarn:     { test: b => b.barns.some(a => !a), reason: b => b.barns.length ? '空いた畜舎がない' : '畜舎がない' },
    animal:        { test: b => FR.Battle.animalCount(b) > 0, reason: '家畜がいない' },
    matureAnimal:  { test: b => b.barns.some(a => a && a.growth >= a.stages), reason: '出荷できる家畜がいない' },
    cropInDiscard: { test: b => b.discard.some(c => FR.cardView(c).type === 'crop'), reason: '捨て札に作物のカードがない' }
  },

  // 1体を狙う効果があるか（敵が2体以上なら、どの敵に使うかを選ぶ）
  TARGET_OPS: ['damage', 'damagePerPlayed', 'damagePerAnimal', 'damagePerHarvested'],
  needsTarget(b, inst) {
    const v = FR.cardView(inst);
    return v.effects.some(e => FR.Battle.TARGET_OPS.includes(e.op)) && FR.Battle.aliveEnemies(b).length > 1;
  },

  canPlay(b, inst) {
    const v = FR.cardView(inst);
    if (b.over) return { ok: false, reason: '' };
    if (v.unplayable) return { ok: false, reason: 'このカードは使えない' };
    if (v.cost > b.energy) return { ok: false, reason: 'エネルギーが足りない' };
    const need = v.needs && FR.Battle.NEEDS[v.needs];
    if (need && !need.test(b)) return { ok: false, reason: typeof need.reason === 'function' ? need.reason(b) : need.reason };
    return { ok: true };
  },

  // targetUid：狙う敵（1体を狙うカードで、敵が2体以上いるときは必要）
  play(b, uid, targetUid) {
    const i = b.hand.findIndex(c => c.uid === uid);
    if (i < 0) return false;
    const inst = b.hand[i];
    const chk = FR.Battle.canPlay(b, inst);
    if (!chk.ok) { b.fx.push({ kind: 'warn', text: chk.reason }); return false; }
    const target = b.enemies.find(e => e.uid === targetUid && !e.dead);
    if (FR.Battle.needsTarget(b, inst) && !target) return false;
    b.target = target || null;
    const v = FR.cardView(inst);
    b.energy -= v.cost;
    b.hand.splice(i, 1);
    b.playedThisTurn++;
    b.log.push(v.name);
    FR.Effects.run(b, v.effects);
    b.target = null;
    // 常時カードは戦闘の間だけ消える。廃棄カードも同じ
    if (v.type === 'power' || v.exhaust) b.exhaust.push(inst);
    else b.discard.push(inst);
    // 段取り八分：3枚目・6枚目…で引く
    if (!b.over && b.statuses.rhythm > 0 && b.playedThisTurn % 3 === 0) FR.Battle.drawCards(b, b.statuses.rhythm);
    return true;
  },

  drawCards(b, n) {
    for (let k = 0; k < n; k++) {
      if (b.hand.length >= FR.Config.handMax) return;
      if (!b.draw.length) {
        if (!b.discard.length) return;
        b.draw = FR.Util.shuffle(b.rnd, b.discard);
        b.discard = [];
      }
      b.hand.push(b.draw.pop());
    }
  },

  fetchFromDiscard(b, type) {
    if (b.hand.length >= FR.Config.handMax) return;
    for (let i = b.discard.length - 1; i >= 0; i--) {
      if (FR.cardView(b.discard[i]).type === type) {
        b.hand.push(b.discard.splice(i, 1)[0]);
        return;
      }
    }
  },

  // ── 数値の増減 ──────────────────────────────
  aliveEnemies(b) { return b.enemies.filter(e => !e.dead); },
  randomEnemy(b) {
    const alive = FR.Battle.aliveEnemies(b);
    return alive.length ? alive[Math.floor(b.rnd() * alive.length)] : null;
  },

  // target を省くと、カードで選んだ敵 → いなければ生きている敵から乱数で
  damageEnemy(b, amount, target) {
    if (b.over || amount <= 0) return;
    let e = target || b.target;
    if (!e || e.dead) e = FR.Battle.randomEnemy(b);
    if (!e) return;
    if (b.statuses.weak > 0) amount = Math.floor(amount * 0.75);
    e.hp = Math.max(0, e.hp - amount);
    b.fx.push({ kind: 'damage', target: 'enemy', enemy: e.uid, text: '-' + amount });
    if (e.hp <= 0) {
      e.dead = true;
      b.fx.push({ kind: 'defeated', enemy: e.uid });
      if (!FR.Battle.aliveEnemies(b).length) FR.Battle.win(b);
    }
  },

  damagePlayer(b, amount) {
    if (b.statuses.fragile > 0) amount = Math.floor(amount * 1.5);
    const blocked = Math.min(b.block, amount);
    b.block -= blocked;
    const rest = amount - blocked;
    if (blocked) b.fx.push({ kind: 'blocked', target: 'player', text: '守り -' + blocked });
    if (rest > 0) {
      b.run.hp = Math.max(0, b.run.hp - rest);
      b.run.stats.damageTaken += rest;
      b.fx.push({ kind: 'damage', target: 'player', text: '-' + rest });
    }
    if (b.run.hp <= 0) FR.Battle.lose(b);
  },

  gainEnergy(b, amount) {
    if (amount <= 0) return;
    b.energy += amount;
    b.fx.push({ kind: 'energy', target: 'player', text: 'エネルギー +' + amount });
  },

  gainBlock(b, amount) {
    if (amount <= 0) return;
    b.block += amount;
    b.fx.push({ kind: 'block', target: 'player', text: '守り +' + amount });
  },

  heal(b, amount) {
    const r = b.run;
    const before = r.hp;
    r.hp = Math.min(r.maxHp, r.hp + amount);
    if (r.hp > before) b.fx.push({ kind: 'heal', target: 'player', text: '+' + (r.hp - before) });
  },

  gainGold(b, amount) {
    if (amount <= 0) return;
    b.run.gold += amount;
    b.run.stats.goldEarned += amount;
    b.fx.push({ kind: 'gold', target: 'player', text: '銭 +' + amount });
  },

  // ── 数える ─────────────────────────────────
  cropCount(b) { return b.plots.filter(p => p).length; },
  treeCount(b) { return b.plots.filter(p => p && p.tree).length; },
  fruitCount(b) { return b.plots.reduce((s, p) => s + (p && p.tree ? p.fruits : 0), 0); },
  animalCount(b) { return b.barns.filter(a => a).length; },
  isRipe(p) { return p && (p.tree ? p.fruits > 0 : p.growth >= p.stages); },
  hasHarvestable(b) { return b.plots.some(FR.Battle.isRipe); },

  // ── 畑と木 ─────────────────────────────────
  plant(b, cropId) {
    const i = b.plots.findIndex(p => !p);
    if (i < 0) return;
    const c = FR.Crops[cropId];
    b.plots[i] = c.tree
      ? { crop: cropId, tree: true, growth: 0, stages: c.stages, fruits: 0, maxFruits: c.maxFruits }
      : { crop: cropId, growth: 0, stages: c.stages };
    b.fx.push({ kind: 'plant', plot: i });
  },

  // natural: ターン終了の自然な育ち。地力の分だけ多く育つ。成木は育つ代わりに実がなる
  growAll(b, amount, natural) {
    const n = amount + (b.statuses.soil || 0);
    b.plots.forEach((p, i) => {
      if (!p) return;
      if (p.growth < p.stages) {
        p.growth = Math.min(p.stages, p.growth + n);
        b.fx.push({ kind: 'grow', plot: i, natural: !!natural });
      } else if (p.tree && p.fruits < p.maxFruits) {
        p.fruits = Math.min(p.maxFruits, p.fruits + n);
        b.fx.push({ kind: 'grow', plot: i, natural: !!natural });
      }
    });
  },

  prune(b, cap, fruit) {
    b.plots.forEach((p, i) => {
      if (!p || !p.tree) return;
      p.maxFruits += cap;
      if (p.growth >= p.stages && fruit) p.fruits = Math.min(p.maxFruits, p.fruits + fruit);
      b.fx.push({ kind: 'grow', plot: i });
    });
  },

  matureTrees(b) {
    b.plots.forEach((p, i) => {
      if (!p || !p.tree) return;
      p.growth = p.stages;
      p.fruits = Math.max(p.fruits, 1);
      b.fx.push({ kind: 'grow', plot: i });
    });
  },

  // 実った作物と、木の実をすべて収穫する。early なら1段以上育った野菜も（半分の値・効果なし）
  harvestAll(b, early) {
    let count = 0;
    const st = b.statuses;
    let pickedFruit = false;
    b.plots.forEach((p, i) => {
      if (!p || b.over) return;
      const c = FR.Crops[p.crop];
      if (p.tree) {
        if (p.fruits <= 0) return;
        const n = p.fruits;
        p.fruits = 0;
        pickedFruit = true;
        const times = st.bigFruit > 0 ? 2 : 1;
        const ripen = st.ripening || 0;
        b.fx.push({ kind: 'harvest', plot: i, text: `${c.name}を${n}つ摘んだ` });
        for (let k = 0; k < n && !b.over; k++) {
          count++;
          b.run.stats.harvest += c.fruitYield;
          FR.Battle.gainGold(b, c.fruitGold + ripen * 3);
          if (ripen) FR.Battle.gainBlock(b, ripen * 2);
          for (let t = 0; t < times; t++) FR.Effects.run(b, c.onPick);
          FR.Effects.relicHook(b, 'pick');
        }
        return;
      }
      if (p.growth >= p.stages) {
        b.plots[i] = null;
        count++;
        b.run.stats.harvest += c.yield;
        b.fx.push({ kind: 'harvest', plot: i, text: c.name + 'を収穫' });
        FR.Battle.gainGold(b, c.gold);
        FR.Effects.run(b, c.onHarvest);
        FR.Effects.relicHook(b, 'harvest');
      } else if (early && p.growth >= 1) {
        b.plots[i] = null;
        count++;
        b.run.stats.harvest += Math.floor(c.yield / 2);
        b.fx.push({ kind: 'harvest', plot: i, text: c.name + 'を早どり' });
        FR.Battle.gainGold(b, Math.floor(c.gold / 2));
        FR.Effects.relicHook(b, 'harvest');
      }
    });
    if (pickedFruit) st.bigFruit = 0;
    b.lastHarvested = count;
  },

  // 収穫ボタン：自分のターンならいつでも、エネルギーを使わずに、実った作物・木の実・出荷できる家畜をすべて取る
  canHarvestNow(b) {
    return !b.over && (FR.Battle.hasHarvestable(b) || b.barns.some(a => a && a.growth >= a.stages));
  },
  harvestButton(b) {
    if (!FR.Battle.canHarvestNow(b)) return false;
    if (FR.Battle.hasHarvestable(b)) FR.Battle.harvestAll(b, false);
    if (!b.over && b.barns.some(a => a && a.growth >= a.stages)) FR.Battle.shipAll(b, 0);
    return true;
  },

  // ── 家畜 ───────────────────────────────────
  addAnimal(b, animalId, care, grow) {
    const i = b.barns.findIndex(a => !a);
    if (i < 0) return;
    const def = FR.Animals[animalId];
    b.barns[i] = { animal: animalId, growth: Math.min(def.stages, grow), stages: def.stages, care };
    b.fx.push({ kind: 'plant', barn: i });
  },

  feed(b, grow, care) {
    b.barns.forEach((a, i) => {
      if (!a) return;
      a.growth = Math.min(a.stages, a.growth + grow);
      a.care += care;
      b.fx.push({ kind: 'grow', barn: i });
    });
  },

  // 手入れの合計から格付けを決める（bonus 段だけ上げる）
  gradeOf(care, bonus) {
    let idx = 0;
    FR.Grades.forEach((g, k) => { if (care >= g.care) idx = k; });
    idx = Math.min(FR.Grades.length - 1, idx + (bonus || 0));
    return FR.Grades[idx];
  },

  shipAll(b, gradeBonus) {
    const contract = 1 + 0.5 * (b.statuses.contract || 0);
    b.barns.forEach((a, i) => {
      if (!a || a.growth < a.stages || b.over) return;
      const def = FR.Animals[a.animal];
      const g = FR.Battle.gradeOf(a.care, gradeBonus);
      const gold = Math.round(def.gold * g.mult * contract);
      b.barns[i] = null;
      b.run.stats.harvest += Math.round(def.yield * g.mult);
      b.run.stats.shipped = (b.run.stats.shipped || 0) + 1;
      b.fx.push({ kind: 'harvest', barn: i, text: `${def.matureName}を出荷 格付け${g.label}` });
      FR.Battle.gainGold(b, gold);
      FR.Effects.run(b, def.onShip);
      FR.Effects.relicHook(b, 'ship');
    });
  },

  // ── 敵 ────────────────────────────────────
  chooseIntents(b) {
    FR.Battle.aliveEnemies(b).forEach(e => {
      const key = e.def.pattern[e.moveIndex % e.def.pattern.length];
      e.moveIndex++;
      e.intent = Object.assign({ key }, e.def.moves[key]);
    });
  },

  // 予告に表示するもの（kind はアイコンの種類）
  intentLabel(b, e) {
    const it = e.intent;
    if (!it) return null;
    const dmg = (it.damage || 0) + e.strength;
    const withDmg = (kind, extra) => ({ name: it.name, value: it.damage ? dmg : extra, kind });
    switch (it.intent) {
      case 'attack': return { name: it.name, value: dmg, kind: 'attack' };
      case 'steal':
      case 'trample': {
        const t = it.intent === 'steal' ? FR.Battle.stealTarget(b) : FR.Battle.trampleTarget(b);
        if (t >= 0 && !b.statuses.netted) return { name: it.name, value: it.intent === 'steal' && b.plots[t].tree ? '実' : '作物', kind: it.intent };
        return { name: it.intent === 'steal' ? 'つつく' : '体当たり', value: dmg, kind: 'attack' };
      }
      case 'blight': return withDmg('blight', 'しおれ');
      case 'debuff': return withDmg('debuff', FR.Statuses[it.status].name);
      case 'addCard': return withDmg('curse', '病斑');
      case 'infect':
        if (FR.Battle.animalCount(b) > 0 && !b.statuses.immune) return { name: it.name, value: '家畜', kind: 'infect' };
        return { name: it.name, value: dmg, kind: 'attack' };
      case 'heal': return { name: it.name, value: '+' + it.amount, kind: 'heal' };
      case 'buff': return { name: it.name, value: '+' + it.strength, kind: 'buff' };
    }
    return { name: it.name, value: '', kind: 'other' };
  },

  // 奪う相手：いちばん育った野菜。なければ、いちばん実の多い木
  stealTarget(b) {
    let best = -1;
    b.plots.forEach((p, i) => {
      if (p && !p.tree && (best < 0 || p.growth > b.plots[best].growth)) best = i;
    });
    if (best >= 0) return best;
    b.plots.forEach((p, i) => {
      if (p && p.tree && p.fruits > 0 && (best < 0 || p.fruits > b.plots[best].fruits)) best = i;
    });
    return best;
  },

  // 踏み荒らす相手：いちばん育った作物か木（木は実ごと消える）
  trampleTarget(b) {
    let best = -1;
    const worth = p => p.growth + (p.tree ? 2 + p.fruits : 0);
    b.plots.forEach((p, i) => {
      if (p && (best < 0 || worth(p) > worth(b.plots[best]))) best = i;
    });
    return best;
  },

  enemyAct(b) {
    for (const e of FR.Battle.aliveEnemies(b)) {
      if (b.over) return;
      FR.Battle.enemyActOne(b, e);
    }
  },

  // 敵1体の行動
  enemyActOne(b, e) {
    if (b.over || e.dead) return;
    {
      const it = e.intent;
      const dmg = (it.damage || 0) + e.strength;
      b.fx.push({ kind: 'enemyMove', enemy: e.uid, text: `${e.name}：${it.name}` });
      if (it.intent === 'attack') {
        FR.Battle.damagePlayer(b, dmg);
      } else if (it.intent === 'steal' || it.intent === 'trample') {
        const t = it.intent === 'steal' ? FR.Battle.stealTarget(b) : FR.Battle.trampleTarget(b);
        if (t >= 0 && !b.statuses.netted) {
          const p = b.plots[t];
          const name = FR.Crops[p.crop].name;
          let text;
          if (it.intent === 'steal' && p.tree) { p.fruits--; text = name + 'の実を奪われた'; }
          else { b.plots[t] = null; text = name + (it.intent === 'steal' ? 'を奪われた' : 'を踏み荒らされた'); }
          b.run.stats.cropsLost++;
          b.fx.push({ kind: 'stolen', plot: t, text });
        } else {
          if (t >= 0) b.fx.push({ kind: 'note', text: '覆いが作物を守った' });
          FR.Battle.damagePlayer(b, dmg);
        }
      } else if (it.intent === 'buff') {
        e.strength += it.strength;
        b.fx.push({ kind: 'buff', target: 'enemy', enemy: e.uid, text: '力 +' + it.strength });
      } else if (it.intent === 'heal') {
        const before = e.hp;
        e.hp = Math.min(e.maxHp, e.hp + it.amount);
        if (e.hp > before) b.fx.push({ kind: 'heal', target: 'enemy', enemy: e.uid, text: '+' + (e.hp - before) });
      } else if (it.intent === 'blight') {
        FR.Battle.blight(b, it.amount);
        if (it.damage) FR.Battle.damagePlayer(b, dmg);
      } else if (it.intent === 'debuff') {
        b.statuses[it.status] = (b.statuses[it.status] || 0) + it.amount;
        b.fx.push({ kind: 'note', text: FR.Statuses[it.status].name + 'になった' });
        if (it.damage) FR.Battle.damagePlayer(b, dmg);
      } else if (it.intent === 'addCard') {
        for (let k = 0; k < it.count; k++) b.discard.push({ uid: b.nextUid++, id: it.card, upgraded: false, temp: true });
        b.fx.push({ kind: 'note', text: `${FR.Cards[it.card].name}が${it.count}枚、捨て札に混ざった` });
        if (it.damage) FR.Battle.damagePlayer(b, dmg);
      } else if (it.intent === 'infect') {
        FR.Battle.infect(b, dmg);
      }
    }
  },

  // 作物と木をしおれさせる（覆いがあれば防げる）。成木は実が落ちる
  blight(b, amount) {
    if (b.statuses.netted) { if (FR.Battle.cropCount(b)) b.fx.push({ kind: 'note', text: '覆いが作物を守った' }); return; }
    b.plots.forEach((p, i) => {
      if (!p) return;
      if (p.tree && p.growth >= p.stages) {
        if (p.fruits > 0) { p.fruits = Math.max(0, p.fruits - amount); b.fx.push({ kind: 'stolen', plot: i, text: '実が落ちた' }); }
      } else if (p.growth > 0) {
        p.growth = Math.max(0, p.growth - amount);
        b.fx.push({ kind: 'stolen', plot: i, text: '作物がしおれた' });
      }
    });
  },

  // 家畜1頭を病気で失う（いちばん育った家畜から）。防疫があれば防ぐ。家畜がいなければ攻撃
  infect(b, dmg) {
    let t = -1;
    b.barns.forEach((a, i) => { if (a && (t < 0 || a.growth > b.barns[t].growth)) t = i; });
    if (t < 0) { FR.Battle.damagePlayer(b, dmg); return; }
    if (b.statuses.immune) { b.fx.push({ kind: 'note', text: 'ワクチンが家畜を守った' }); return; }
    const name = FR.Animals[b.barns[t].animal].name;
    b.barns[t] = null;
    b.run.stats.cropsLost++;
    b.fx.push({ kind: 'stolen', barn: t, text: name + 'が病気で倒れた' });
  },

  // ── 勝ち負け ───────────────────────────────
  win(b) {
    if (b.over) return;
    b.over = true;
    b.won = true;
    const r = b.run;
    // 畑と畜舎は戦闘ごとにリセット。実っていた作物・なっていた実・出荷できた家畜は半分の値で引き取り
    let auto = 0;
    b.plots.forEach(p => {
      if (!p) return;
      const c = FR.Crops[p.crop];
      if (p.tree) {
        r.stats.harvest += Math.floor(c.fruitYield * p.fruits / 2);
        auto += Math.floor(c.fruitGold * p.fruits / 2);
      } else if (p.growth >= p.stages) {
        r.stats.harvest += Math.floor(c.yield / 2);
        auto += Math.floor(c.gold / 2);
      }
    });
    b.barns.forEach(a => {
      if (!a || a.growth < a.stages) return;
      const def = FR.Animals[a.animal];
      const g = FR.Battle.gradeOf(a.care, 0);
      r.stats.harvest += Math.floor(def.yield * g.mult / 2);
      auto += Math.floor(def.gold * g.mult / 2);
    });
    if (auto) { r.gold += auto; r.stats.goldEarned += auto; }
    b.autoHarvestGold = auto;
    r.stats.battlesWon++;
  },

  lose(b) {
    if (b.over) return;
    b.over = true;
    b.won = false;
  }
};
