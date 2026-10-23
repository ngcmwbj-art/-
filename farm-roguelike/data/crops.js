'use strict';
/* =========================================================
   作物の一覧
   - stages：実るまでの段数（毎ターン終了時に1段育つ。成長カードでも育つ）
   - gold：収穫したときの銭 / yield：収穫量（経営評価のスコア）
   - onHarvest：収穫したときに戦闘で起きること（effects.js の op を並べる）
   - art：育ち中・実ったときの絵（js/ui/art.js の名前）
   ========================================================= */
FR.Crops = {
  komatsuna: {
    name: '小松菜', stages: 2, gold: 4, yield: 5,
    onHarvest: [{ op: 'block', amount: 4 }], harvestText: '守り4',
    art: { growing: 'sprout', ripe: 'komatsuna' }
  },
  tomato: {
    name: 'トマト', stages: 3, gold: 10, yield: 12,
    onHarvest: [{ op: 'damage', amount: 10 }], harvestText: '勢いに10',
    art: { growing: 'sprout', ripe: 'tomato' }
  }
};
