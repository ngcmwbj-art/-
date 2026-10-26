'use strict';
/* =========================================================
   レリック（常時効果）
   - hooks：発動するタイミングごとに effects を並べる
     battleStart 戦闘開始 / turnStart ターン開始 /
     harvest 作物を1つ収穫するたび / pick 実を1つ摘むたび / ship 家畜を1頭出荷するたび
   ========================================================= */
FR.Relics = {
  basket: {
    name: '使い込んだ竹かご', art: 'basket', rarity: 'basic',
    text: '作物を1つ収穫するたび、守り3',
    hooks: { harvest: [{ op: 'block', amount: 3 }] }
  },
  cowbell: {
    name: '古いカウベル', art: 'cowbell', rarity: 'basic',
    text: '家畜を1頭出荷するたび、守り6',
    hooks: { ship: [{ op: 'block', amount: 6 }] }
  },
  stoneWall: {
    name: '先祖代々の石垣', art: 'stonewall', rarity: 'basic',
    text: '戦闘開始時、守り6',
    hooks: { battleStart: [{ op: 'block', amount: 6 }] }
  }
};
