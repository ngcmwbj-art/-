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
    // 農協の組合員証など、勝つたびに銭が増える農具
    const bonus = run.relics.reduce((s, id) => s + ((FR.Relics[id] && FR.Relics[id].rewardGold) || 0), 0);
    const gold = (boss ? FR.Util.randInt(rnd, 40, 55) : FR.Util.randInt(rnd, T.gold[0], T.gold[1])) + bonus;
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
    // ★3の強い敵とボスに勝つと、農具を3つから1つ
    let relics = null;
    if (boss || tier === 3) {
      const left = FR.RelicPool.tools(run);
      relics = [];
      while (relics.length < FR.Reward.RELIC_CHOICES && left.length) relics.push(left.splice(Math.floor(rnd() * left.length), 1)[0]);
      if (!relics.length) relics = null;
    }
    return { gold, cards, goldTaken: false, boss, tier, relics, relicTaken: null };
  },

  RELIC_CHOICES: 3,

  // 報酬の農具を1つもらう（もらえるのは1回だけ）
  takeRelic(run, id) {
    const rw = run.reward;
    if (!rw || !rw.relics || rw.relicTaken || !rw.relics.includes(id)) return false;
    run.relics.push(id);
    rw.relicTaken = id;
    return true;
  },

  // 季節のボスのあとの、固有スキルの伸ばし方（2つ）。シードで決まるので開き直しても同じ
  skillChoices(run) {
    const left = FR.RelicPool.skillUps(run);
    const rnd = FR.Util.rng(run.seed * 13 + run.season * 101 + 7);
    const out = [];
    while (out.length < 2 && left.length) out.push(left.splice(Math.floor(rnd() * left.length), 1)[0]);
    return out;
  },

  takeSkill(run, id) {
    if (!run.skillChoice || !run.skillChoice.includes(id)) return false;
    run.relics.push(id);
    run.skillChoice = null;
    return true;
  }
};
