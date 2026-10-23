'use strict';
/* =========================================================
   戦闘後の報酬（銭と、3枚から1枚選ぶカード）
   ========================================================= */
FR.Reward = {
  RARITY_WEIGHT: { common: 60, uncommon: 30, rare: 10 },

  make(run) {
    const rnd = FR.Run.rngFor(run, 'reward');
    const gold = FR.Util.randInt(rnd, 10, 16);
    // 出てくるカード：初期カード以外で、全員共通 or この農家タイプのもの
    const pool = Object.keys(FR.Cards).filter(id => {
      const c = FR.Cards[id];
      return c.rarity !== 'basic' && (c.pool.includes('common') || c.pool.includes(run.farmerId));
    });
    const cards = [];
    while (cards.length < FR.Config.rewardChoices && cards.length < pool.length) {
      const left = pool.filter(id => !cards.includes(id));
      const id = FR.Util.weighted(rnd, left.map(id => ({ value: id, weight: FR.Reward.RARITY_WEIGHT[FR.Cards[id].rarity] || 10 })));
      cards.push(id);
    }
    return { gold, cards, goldTaken: false };
  }
};
