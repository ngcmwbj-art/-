'use strict';
/* =========================================================
   レリック（常時効果）
   - hooks：発動するタイミングごとに effects を並べる
     battleStart 戦闘開始 / turnStart ターン開始 / harvest 作物を1つ収穫するたび
   ========================================================= */
FR.Relics = {
  basket: {
    name: '使い込んだ竹かご', art: 'basket', rarity: 'basic',
    text: '作物を1つ収穫するたび、守り3',
    hooks: { harvest: [{ op: 'block', amount: 3 }] }
  }
};
