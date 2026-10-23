'use strict';
/* =========================================================
   戦闘
   - 画面には触らない。状態 b を変えるだけで、描画は ui/render-battle.js
   - b.fx に「起きたこと」を積むと、描画側が数字の演出などに使う
   ターンの流れ：
     プレイヤーのターン開始（守り0・エネルギー回復・かかし・5枚引く）
     → カードを使う
     → ターン終了：手札を捨てる → 敵の行動 → 作物が1段育つ → 敵の次の行動を決める
   ========================================================= */
FR.Battle = {
  create(run) {
    const rnd = FR.Run.rngFor(run, 'battle');
    const farmer = FR.Farmers[run.farmerId];
    const enemyId = 'crow';  // 最小プレイ版は敵1種（②でマップから決める）
    const def = FR.Enemies[enemyId];
    const sc = FR.Config.scaling;
    const n = run.battleIndex;
    const hp = FR.Util.randInt(rnd, def.hp[0], def.hp[1]) + n * sc.hpPerBattle;

    const b = {
      run, rnd,
      enemy: {
        id: enemyId, def, name: def.name, hp, maxHp: hp,
        strength: Math.floor(n / sc.damageEveryBattles),
        moveIndex: 0, intent: null
      },
      block: 0,
      energy: 0,
      statuses: {},
      draw: FR.Util.shuffle(rnd, run.deck.map(c => ({ ...c }))),
      hand: [], discard: [], exhaust: [],
      plots: new Array(farmer.plots).fill(null),
      turn: 0,
      over: false, won: false,
      fx: [],
      log: []
    };
    FR.Battle.chooseIntent(b);
    FR.Effects.relicHook(b, 'battleStart');
    FR.Battle.startTurn(b);
    return b;
  },

  // ── ターン ─────────────────────────────────
  startTurn(b) {
    b.turn++;
    b.block = 0;
    b.energy = FR.Config.energy;
    if (b.statuses.scarecrow > 0) {
      b.fx.push({ kind: 'note', text: 'かかしが追い払う' });
      FR.Battle.damageEnemy(b, 4);
      b.statuses.scarecrow--;
      if (b.over) return;
    }
    FR.Effects.relicHook(b, 'turnStart');
    FR.Battle.drawCards(b, FR.Config.handSize);
  },

  endTurn(b) {
    if (b.over) return;
    // 手札を捨てる
    b.discard.push(...b.hand);
    b.hand = [];
    // 敵の行動
    FR.Battle.enemyAct(b);
    if (b.over) return;
    b.statuses.netted = 0;
    // 作物が育つ
    FR.Battle.growAll(b, 1, true);
    FR.Battle.chooseIntent(b);
    FR.Battle.startTurn(b);
  },

  // ── カード ─────────────────────────────────
  canPlay(b, inst) {
    const v = FR.cardView(inst);
    if (b.over) return { ok: false, reason: '' };
    if (v.cost > b.energy) return { ok: false, reason: 'エネルギーが足りない' };
    if (v.needs === 'emptyPlot' && !b.plots.some(p => !p)) return { ok: false, reason: '空いた区画がない' };
    if (v.needs === 'ripeCrop' && !b.plots.some(p => p && p.growth >= p.stages)) return { ok: false, reason: '実った作物がない' };
    return { ok: true };
  },

  play(b, uid) {
    const i = b.hand.findIndex(c => c.uid === uid);
    if (i < 0) return false;
    const inst = b.hand[i];
    const chk = FR.Battle.canPlay(b, inst);
    if (!chk.ok) { b.fx.push({ kind: 'warn', text: chk.reason }); return false; }
    const v = FR.cardView(inst);
    b.energy -= v.cost;
    b.hand.splice(i, 1);
    b.log.push(v.name);
    FR.Effects.run(b, v.effects);
    // 常時カードは戦闘の間だけ消える。廃棄カードも同じ
    if (v.type === 'power' || v.exhaust) b.exhaust.push(inst);
    else b.discard.push(inst);
    return true;
  },

  drawCards(b, n) {
    for (let k = 0; k < n; k++) {
      if (b.hand.length >= FR.Config.handMax) return;
      if (!b.draw.length) {
        if (!b.discard.length) return;
        b.draw = FR.Util.shuffle(b.rnd, b.discard);
        b.discard = [];
        b.fx.push({ kind: 'note', text: '捨て札を山札に戻した' });
      }
      b.hand.push(b.draw.pop());
    }
  },

  // ── 数値の増減 ──────────────────────────────
  damageEnemy(b, amount) {
    const e = b.enemy;
    e.hp = Math.max(0, e.hp - amount);
    b.fx.push({ kind: 'damage', target: 'enemy', text: '-' + amount });
    if (e.hp <= 0) FR.Battle.win(b);
  },

  damagePlayer(b, amount) {
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

  gainBlock(b, amount) {
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
    b.run.gold += amount;
    b.run.stats.goldEarned += amount;
    b.fx.push({ kind: 'gold', target: 'player', text: '銭 +' + amount });
  },

  // ── 畑 ────────────────────────────────────
  plant(b, cropId) {
    const i = b.plots.findIndex(p => !p);
    if (i < 0) return;
    const c = FR.Crops[cropId];
    b.plots[i] = { crop: cropId, growth: 0, stages: c.stages };
    b.fx.push({ kind: 'plant', plot: i, text: c.name + 'を植えた' });
  },

  // natural: ターン終了の自然な育ち（地力も効く）
  growAll(b, amount, natural) {
    const soil = b.statuses.soil || 0;
    b.plots.forEach((p, i) => {
      if (!p || p.growth >= p.stages) return;
      const before = p.growth;
      p.growth = Math.min(p.stages, p.growth + amount + soil);
      if (p.growth > before) b.fx.push({ kind: 'grow', plot: i, natural: !!natural });
    });
  },

  harvestRipe(b) {
    b.plots.forEach((p, i) => {
      if (!p || p.growth < p.stages || b.over) return;
      const c = FR.Crops[p.crop];
      b.plots[i] = null;
      b.run.stats.harvest += c.yield;
      b.fx.push({ kind: 'harvest', plot: i, text: c.name + 'を収穫' });
      FR.Battle.gainGold(b, c.gold);
      FR.Effects.run(b, c.onHarvest);
      FR.Effects.relicHook(b, 'harvest');
    });
  },

  // ── 敵 ────────────────────────────────────
  chooseIntent(b) {
    const e = b.enemy;
    const key = e.def.pattern[e.moveIndex % e.def.pattern.length];
    e.moveIndex++;
    e.intent = Object.assign({ key }, e.def.moves[key]);
  },

  // 予告に表示する文字（例「ついばむ 6」）
  intentLabel(b) {
    const it = b.enemy.intent;
    if (!it) return '';
    const dmg = (it.damage || 0) + b.enemy.strength;
    if (it.intent === 'attack') return { name: it.name, value: dmg, kind: 'attack' };
    if (it.intent === 'steal') {
      const target = FR.Battle.stealTarget(b);
      if (target >= 0 && !b.statuses.netted) return { name: it.name, value: '作物', kind: 'steal' };
      return { name: 'つつく', value: dmg, kind: 'attack' };
    }
    if (it.intent === 'buff') return { name: it.name, value: '力+' + it.strength, kind: 'buff' };
    return { name: it.name, value: '', kind: 'other' };
  },

  stealTarget(b) {
    let best = -1;
    b.plots.forEach((p, i) => {
      if (p && (best < 0 || p.growth > b.plots[best].growth)) best = i;
    });
    return best;
  },

  enemyAct(b) {
    const e = b.enemy;
    const it = e.intent;
    const dmg = (it.damage || 0) + e.strength;
    b.fx.push({ kind: 'enemyMove', text: it.name });
    if (it.intent === 'attack') {
      FR.Battle.damagePlayer(b, dmg);
    } else if (it.intent === 'steal') {
      const t = FR.Battle.stealTarget(b);
      if (t >= 0 && !b.statuses.netted) {
        const name = FR.Crops[b.plots[t].crop].name;
        b.plots[t] = null;
        b.run.stats.cropsLost++;
        b.fx.push({ kind: 'stolen', plot: t, text: name + 'を奪われた' });
      } else {
        if (t >= 0) b.fx.push({ kind: 'note', text: 'ネットが作物を守った' });
        FR.Battle.damagePlayer(b, dmg);
      }
    } else if (it.intent === 'buff') {
      e.strength += it.strength;
      b.fx.push({ kind: 'buff', target: 'enemy', text: '力 +' + it.strength });
    }
  },

  // ── 勝ち負け ───────────────────────────────
  win(b) {
    if (b.over) return;
    b.over = true;
    b.won = true;
    const r = b.run;
    // 畑は戦闘ごとにリセット。実っていた作物は半分の値で自動収穫
    let auto = 0;
    b.plots.forEach(p => {
      if (p && p.growth >= p.stages) {
        const c = FR.Crops[p.crop];
        r.stats.harvest += Math.floor(c.yield / 2);
        auto += Math.floor(c.gold / 2);
      }
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
