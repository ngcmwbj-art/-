'use strict';
/* =========================================================
   作物と木の一覧
   ── 野菜（1回収穫すると区画が空く）
   - stages：実るまでの段数（毎ターン終了時に1段育つ。成長カードでも育つ）
   - gold：収穫したときの銭 / yield：収穫量（経営評価のスコア）
   - onHarvest：収穫したときに戦闘で起きること（effects.js の op を並べる）
   ── 木（tree: true。収穫しても木は残り、毎ターン実がなる）
   - stages：成木になるまでの段数。成木になると毎ターン終了時に実が1つなる（育てるカードでも1つなる）
   - maxFruits：なっていられる実の数の上限
   - fruitGold / fruitYield / onPick：実1つを摘んだときの銭・収穫量・効果
   - art：育ち中・実った（成木）ときの絵（js/ui/art.js の名前）
   ========================================================= */
FR.Crops = {
  // ── 野菜 ──
  spinach: {
    name: 'ホウレンソウ', stages: 1, gold: 2, yield: 3,
    onHarvest: [{ op: 'block', amount: 3 }], harvestText: '守り3',
    art: { growing: 'sprout', ripe: 'spinach' }
  },
  komatsuna: {
    name: '小松菜', stages: 2, gold: 4, yield: 5,
    onHarvest: [{ op: 'block', amount: 4 }], harvestText: '守り4',
    art: { growing: 'sprout', ripe: 'komatsuna' }
  },
  eggplant: {
    name: 'ナス', stages: 2, gold: 5, yield: 6,
    onHarvest: [{ op: 'draw', amount: 2 }], harvestText: '2枚引く',
    art: { growing: 'sprout', ripe: 'eggplant' }
  },
  yomogi: {
    name: 'ヨモギ', stages: 2, gold: 2, yield: 3,
    onHarvest: [{ op: 'heal', amount: 5 }], harvestText: '健康度+5',
    art: { growing: 'sprout', ripe: 'spinach' }
  },
  daikon: {
    name: '大根', stages: 3, gold: 6, yield: 8,
    onHarvest: [{ op: 'damage', amount: 6 }, { op: 'block', amount: 6 }], harvestText: '勢いに6・守り6',
    art: { growing: 'sprout', ripe: 'daikon' }
  },
  tomato: {
    name: 'トマト', stages: 3, gold: 10, yield: 12,
    onHarvest: [{ op: 'damage', amount: 10 }], harvestText: '勢いに10',
    art: { growing: 'sprout', ripe: 'tomato' }
  },

  // ── 柑橘の木 ──
  unshu: {
    name: '温州みかん', tree: true, stages: 2, maxFruits: 3, fruitGold: 3, fruitYield: 4,
    onPick: [{ op: 'block', amount: 3 }], harvestText: '実1つで守り3',
    art: { growing: 'sapling', ripe: 'mikantree' }
  },
  lemon: {
    name: 'レモン', tree: true, stages: 2, maxFruits: 3, fruitGold: 2, fruitYield: 3,
    onPick: [{ op: 'damage', amount: 5 }], harvestText: '実1つで勢いに5',
    art: { growing: 'sapling', ripe: 'lemontree' }
  },
  yuzu: {
    name: 'ゆず', tree: true, stages: 3, maxFruits: 3, fruitGold: 3, fruitYield: 4,
    onPick: [{ op: 'draw', amount: 1 }], harvestText: '実1つで1枚引く',
    art: { growing: 'sapling', ripe: 'yuzutree' }
  },
  dekopon: {
    name: 'デコポン', tree: true, stages: 3, maxFruits: 2, fruitGold: 8, fruitYield: 10,
    onPick: [{ op: 'heal', amount: 2 }, { op: 'block', amount: 2 }], harvestText: '実1つで健康度+2・守り2',
    art: { growing: 'sapling', ripe: 'dekopontree' }
  }
};
