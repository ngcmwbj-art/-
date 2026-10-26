'use strict';
/* =========================================================
   市場（カードのお店）
   - 行き先の分かれ道で「市場」を選ぶと開く（js/map.js）
   - 買う：その農家タイプに出るカードから5枚並ぶ。値段は出やすさで決まる
   - 売る：デッキのカードを手放して銭にする（デッキを絞る役目もある）。デッキは MIN_DECK 枚より減らせない
   - 並ぶカードはシード付き乱数で決まるので、閉じて開き直しても同じ
   ========================================================= */
FR.Market = {
  STOCK: 5,
  MIN_DECK: 6,
  BUY: { common: 50, uncommon: 75, rare: 130 },        // 買う値段の目安（±10% ゆらぐ）
  SELL: { basic: 8, common: 15, uncommon: 25, rare: 40, upgraded: 10 },  // 売る値段（強化済みは上乗せ）

  make(run) {
    const rnd = FR.Run.rngFor(run, 'market');
    const pool = Object.keys(FR.Cards).filter(id => {
      const c = FR.Cards[id];
      return ['common', 'uncommon', 'rare'].includes(c.rarity) && (c.pool.includes('common') || c.pool.includes(run.farmerId));
    });
    const stock = [];
    // まれ1枚・ときどき2枚・よく出る2枚を目安に、足りなければ何でも
    const want = ['rare', 'uncommon', 'uncommon', 'common', 'common'];
    const used = new Set();
    for (const r of want) {
      const cands = pool.filter(id => FR.Cards[id].rarity === r && !used.has(id));
      const list = cands.length ? cands : pool.filter(id => !used.has(id));
      if (!list.length) break;
      const id = FR.Util.pick(rnd, list);
      used.add(id);
      const base = FR.Market.BUY[FR.Cards[id].rarity] || 60;
      stock.push({ id, price: Math.round(base * (0.9 + rnd() * 0.2)), sold: false });
    }
    return { stock, sales: 0 };
  },

  sellPrice(inst) {
    const c = FR.Cards[inst.id];
    return (FR.Market.SELL[c.rarity] || 10) + (inst.upgraded ? FR.Market.SELL.upgraded : 0);
  },

  // 買う。できたら true
  buy(run, k) {
    const it = run.market && run.market.stock[k];
    if (!it || it.sold || run.gold < it.price) return false;
    run.gold -= it.price;
    it.sold = true;
    FR.Run.addCard(run, it.id, false);
    return true;
  },

  canSell(run) { return run.deck.length > FR.Market.MIN_DECK; },

  // 売る。できたら売れた銭、だめなら 0
  sell(run, uid) {
    const i = run.deck.findIndex(c => c.uid === uid);
    if (i < 0 || !FR.Market.canSell(run)) return 0;
    const price = FR.Market.sellPrice(run.deck[i]);
    run.deck.splice(i, 1);
    run.gold += price;
    run.stats.goldEarned += price;
    run.market.sales++;
    return price;
  }
};
