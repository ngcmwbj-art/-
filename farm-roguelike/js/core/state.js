'use strict';
/* =========================================================
   ラン（1回の挑戦）の状態
   - ここにあるものがそのまま保存される（save.js）
   - 戦闘中の山札や手札は保存しない。再開すると「その戦闘の最初から」
   ========================================================= */
FR.Run = {
  create(farmerId, seed) {
    const f = FR.Farmers[farmerId];
    const run = {
      version: FR.Config.saveVersion,
      seed: seed,
      farmerId: farmerId,
      hp: f.hp,
      maxHp: f.hp,
      gold: f.gold,
      deck: [],
      relics: f.relic ? [f.relic] : [],
      battleIndex: 0,          // 何戦目か（0 から）
      phase: 'battle',         // battle 戦闘 / reward 報酬を選ぶところ / over 終わり
      reward: null,            // 報酬の中身（選んでいる途中で閉じても同じものが出るように保存）
      nextUid: 1,
      stats: { harvest: 0, goldEarned: 0, damageTaken: 0, battlesWon: 0, cropsLost: 0 }
    };
    f.deck.forEach(id => FR.Run.addCard(run, id, false));
    return run;
  },

  addCard(run, id, upgraded) {
    run.deck.push({ uid: run.nextUid++, id: id, upgraded: !!upgraded });
  },

  // 今の戦闘・報酬のための乱数（シード＋何戦目＋用途で決まるので、やり直しても同じになる）
  rngFor(run, purpose) {
    const salt = { battle: 1, reward: 2 }[purpose] || 9;
    return FR.Util.rng(run.seed + run.battleIndex * 7919 + salt * 104729);
  }
};

// カード1枚の「今の中身」（強化済みなら upgrade を上書き）
FR.cardView = function (inst) {
  const base = FR.Cards[inst.id];
  const v = Object.assign({ id: inst.id }, base);
  if (inst.upgraded && base.upgrade) Object.assign(v, base.upgrade);
  v.upgraded = !!inst.upgraded;
  v.uid = inst.uid;
  return v;
};
