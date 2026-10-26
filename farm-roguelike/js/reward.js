'use strict';
/* =========================================================
   戦闘後の報酬（銭と、3枚から1枚選ぶカード）
   ========================================================= */
FR.Reward = {
  RARITY_WEIGHT: { common: 60, uncommon: 30, rare: 10 },

  // ボスのあとは銭が多く、カードは「ときどき」「まれ」だけ
  BOSS_WEIGHT: { uncommon: 60, rare: 40 },

  // 顔ぶれの強さ（FR.Map.tier）ごとの、カードの出やすさと銭
  TIER: {
    1: { weight: { common: 75, uncommon: 22, rare: 3 }, gold: [8, 12] },
    2: { weight: { common: 60, uncommon: 30, rare: 10 }, gold: [10, 16] },
    3: { weight: { common: 30, uncommon: 45, rare: 25 }, gold: [16, 24] }
  },

  make(run) {
    const rnd = FR.Run.rngFor(run, 'reward');
    const boss = run.node && run.node.type === 'boss';
    const tier = boss ? 0 : FR.Map.tier(run.node && run.node.enc);
    const T = FR.Reward.TIER[tier] || { weight: FR.Reward.RARITY_WEIGHT, gold: [10, 16] };
    const gold = boss ? FR.Util.randInt(rnd, 40, 55) : FR.Util.randInt(rnd, T.gold[0], T.gold[1]);
    const W = boss ? FR.Reward.BOSS_WEIGHT : T.weight;
    // 出てくるカード：初期カード以外で、全員共通 or この農家タイプのもの
    const pool = Object.keys(FR.Cards).filter(id => {
      const c = FR.Cards[id];
      return (W[c.rarity] || 0) > 0 && (c.pool.includes('common') || c.pool.includes(run.farmerId));
    });
    const cards = [];
    while (cards.length < FR.Config.rewardChoices && cards.length < pool.length) {
      const left = pool.filter(id => !cards.includes(id));
      const id = FR.Util.weighted(rnd, left.map(id => ({ value: id, weight: W[FR.Cards[id].rarity] })));
      cards.push(id);
    }
    return { gold, cards, goldTaken: false, boss, tier };
  }
};
