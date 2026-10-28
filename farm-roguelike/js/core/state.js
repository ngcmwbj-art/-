'use strict';
/* =========================================================
   ラン（1回の挑戦）の状態
   - ここにあるものがそのまま保存される（save.js）
   - 戦闘中の山札や手札は保存しない。再開すると「その戦闘の最初から」
   ========================================================= */
FR.Run = {
  create(farmerId, seed, difficulty) {
    const f = FR.Farmers[farmerId];
    const run = {
      version: FR.Config.saveVersion,
      seed: seed,
      farmerId: farmerId,
      difficulty: FR.Config.difficulties[difficulty] ? difficulty : FR.Config.defaultDifficulty,   // 難しさ（FR.Config.difficulties）
      hp: f.hp,
      maxHp: f.hp,
      gold: f.gold,
      deck: [],
      relics: f.relic ? [f.relic] : [],
      battleIndex: 0,          // 何戦目か（0 から。乱数の種に使う）
      season: 0,               // 今の季節（FR.Seasons の番号）
      step: 0,                 // 季節の中の何段目か（0 から。最後の段がボス）
      choices: null,           // 今の段の行き先の選択肢
      node: null,              // 選んだ行き先 { type, enc / boss }
      nextBattle: null,        // 休憩所でかけた、次の戦闘の始めの状態 { soil: 1 } など
      phase: 'map',            // map 行き先を選ぶ / battle 戦闘 / reward 報酬 / market 市場 / rest 休憩所 / season 季節の終わり
      market: null,            // 市場の品ぞろえ（開いている間だけ）
      reward: null,            // 報酬の中身（選んでいる途中で閉じても同じものが出るように保存）
      nextUid: 1,
      stats: { harvest: 0, goldEarned: 0, damageTaken: 0, battlesWon: 0, cropsLost: 0, shipped: 0, seasonsCleared: 0, bossesWon: 0 }
    };
    f.deck.forEach(id => FR.Run.addCard(run, id, false));
    return run;
  },

  // この挑戦の難しさの設定（古い保存データは「ふつう」）
  difficulty(run) { return FR.Config.difficulties[run.difficulty] || FR.Config.difficulties[FR.Config.defaultDifficulty]; },

  addCard(run, id, upgraded) {
    run.deck.push({ uid: run.nextUid++, id: id, upgraded: !!upgraded });
  },

  // 今の戦闘・報酬のための乱数（シード＋何戦目＋用途で決まるので、やり直しても同じになる）
  rngFor(run, purpose) {
    const salt = { battle: 1, reward: 2, market: 3 }[purpose] || 9;
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
