'use strict';
/* =========================================================
   効果を実行する仕組み
   - カード・作物・家畜・レリックの effects はすべてここで実行する
   - 新しい効果を足すときは OPS に1つ関数を足す
   ========================================================= */
FR.Effects = {
  OPS: {
    // ── 基本 ──
    damage(b, e) { FR.Battle.damageEnemy(b, e.amount); },
    damageAll(b, e) { FR.Battle.aliveEnemies(b).forEach(en => FR.Battle.damageEnemy(b, e.amount, en)); },
    block(b, e) { FR.Battle.gainBlock(b, e.amount); },
    draw(b, e) { FR.Battle.drawCards(b, e.amount); },
    energy(b, e) { FR.Battle.gainEnergy(b, e.amount); },
    heal(b, e) { FR.Battle.heal(b, e.amount); },
    gold(b, e) { FR.Battle.gainGold(b, e.amount); },
    status(b, e) { b.statuses[e.id] = (b.statuses[e.id] || 0) + e.amount; },
    // 捨て札から指定の種類のカードを1枚手札に戻す
    fetch(b, e) { FR.Battle.fetchFromDiscard(b, e.type); },

    // ── 数に応じて ──
    damagePerPlayed(b, e) { FR.Battle.damageEnemy(b, e.base + e.per * b.playedThisTurn); },
    damagePerAnimal(b, e) { FR.Battle.damageEnemy(b, e.base + e.per * FR.Battle.animalCount(b)); },
    damagePerHarvested(b, e) { if (b.lastHarvested > 0) FR.Battle.damageEnemy(b, e.per * b.lastHarvested); },
    blockPerAnimal(b, e) { const n = FR.Battle.animalCount(b); if (n) FR.Battle.gainBlock(b, e.per * n); },
    blockPerFruit(b, e) { const n = FR.Battle.fruitCount(b); if (n) FR.Battle.gainBlock(b, e.per * n); },
    blockPerCrop(b, e) { const n = FR.Battle.cropCount(b); if (n) FR.Battle.gainBlock(b, e.per * n); },
    healPerCrop(b, e) { const n = FR.Battle.cropCount(b); if (n) FR.Battle.heal(b, e.per * n); },
    drawPerCrop(b, e) { FR.Battle.drawCards(b, e.per * FR.Battle.cropCount(b)); },
    // エネルギー：実った作物と実のなった木の数／家畜の頭数／成木の本数に応じて
    energyPerRipe(b, e) { const n = b.plots.filter(FR.Battle.isRipe).length; if (n) FR.Battle.gainEnergy(b, e.per * n); },
    energyPerAnimal(b, e) { const n = FR.Battle.animalCount(b); if (n) FR.Battle.gainEnergy(b, e.per * n); },
    energyPerTree(b, e) { const n = b.plots.filter(p => p && p.tree && p.growth >= p.stages).length; if (n) FR.Battle.gainEnergy(b, e.per * n); },
    goldPerFruit(b, e) { const n = FR.Battle.fruitCount(b); if (n) FR.Battle.gainGold(b, e.per * n); },

    // ── 畑と木 ──
    plant(b, e) { FR.Battle.plant(b, e.crop); },
    grow(b, e) { FR.Battle.growAll(b, e.amount); },
    harvest(b, e) { FR.Battle.harvestAll(b, !!e.early); },
    prune(b, e) { FR.Battle.prune(b, e.cap || 0, e.fruit || 0); },
    matureTrees(b) { FR.Battle.matureTrees(b); },

    // ── 家畜 ──
    addAnimal(b, e) { FR.Battle.addAnimal(b, e.animal, e.care || 0, e.grow || 0); },
    feed(b, e) { FR.Battle.feed(b, e.grow || 0, e.care || 0); },
    ship(b, e) { FR.Battle.shipAll(b, e.gradeBonus || 0); }
  },

  run(b, list) {
    for (const e of list || []) {
      if (b.over) return;
      const fn = FR.Effects.OPS[e.op];
      if (!fn) { console.warn('知らない効果:', e.op); continue; }
      fn(b, e);
    }
  },

  // レリックの発動
  relicHook(b, hook) {
    for (const id of b.run.relics) {
      const r = FR.Relics[id];
      if (r && r.hooks && r.hooks[hook]) {
        FR.Effects.run(b, r.hooks[hook]);
      }
    }
  }
};
