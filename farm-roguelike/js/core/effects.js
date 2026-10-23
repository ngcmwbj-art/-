'use strict';
/* =========================================================
   効果を実行する仕組み
   - カード・作物・レリックの effects はすべてここで実行する
   - 新しい効果を足すときは OPS に1つ関数を足す
   ========================================================= */
FR.Effects = {
  OPS: {
    damage(b, e) { FR.Battle.damageEnemy(b, e.amount); },
    block(b, e) { FR.Battle.gainBlock(b, e.amount); },
    draw(b, e) { FR.Battle.drawCards(b, e.amount); },
    energy(b, e) { b.energy += e.amount; },
    heal(b, e) { FR.Battle.heal(b, e.amount); },
    gold(b, e) { FR.Battle.gainGold(b, e.amount); },
    plant(b, e) { FR.Battle.plant(b, e.crop); },
    grow(b, e) { FR.Battle.growAll(b, e.amount); },
    harvest(b) { FR.Battle.harvestRipe(b); },
    status(b, e) {
      const st = b.statuses;
      st[e.id] = (st[e.id] || 0) + e.amount;
    }
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
        b.fx.push({ kind: 'relic', text: r.name });
      }
    }
  }
};
