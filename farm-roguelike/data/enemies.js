'use strict';
/* =========================================================
   敵の一覧
   - hp：勢い（敵の体力）の範囲 [最小, 最大]。hpGrowth：戦闘を重ねるごとに増える量
   - size：絵の大きさ（1 がふつう）
   - moves：行動。intent の種類
       attack  … 健康度に damage
       steal   … いちばん育った野菜か、木の実を1つ奪う（なければ・覆いがあれば damage）
       trample … いちばん育った作物か木を踏み荒らして消す（なければ・覆いがあれば damage）
       buff    … 自分の力（攻撃の上乗せ）を strength 増やす
   - pattern：行動の順番（くり返す）。randomStart なら何番目から始めるかを乱数で決める（群れの足並みをずらす）
   ========================================================= */
FR.Enemies = {
  crow: {
    name: '群れ鴉', kind: 'pest', art: 'crow', size: 1,
    hp: [18, 22], hpGrowth: 5,
    moves: {
      peck:  { name: 'ついばむ', intent: 'attack', damage: 6 },
      steal: { name: '作物を狙う', intent: 'steal', damage: 3 },
      caw:   { name: '仲間を呼ぶ', intent: 'buff', strength: 2 }
    },
    pattern: ['peck', 'steal', 'peck', 'caw']
  },
  crowSmall: {
    name: 'はぐれ鴉', kind: 'pest', art: 'crow', size: 0.72,
    hp: [10, 13], hpGrowth: 3,
    moves: {
      peck:  { name: 'ついばむ', intent: 'attack', damage: 4 },
      steal: { name: '作物を狙う', intent: 'steal', damage: 2 }
    },
    pattern: ['peck', 'steal', 'peck'], randomStart: true
  },
  boar: {
    name: '山の大猪', kind: 'beast', art: 'boar', size: 1.25,
    hp: [40, 46], hpGrowth: 7,
    moves: {
      snort:   { name: '鼻を鳴らす', intent: 'buff', strength: 2 },
      rush:    { name: '突進', intent: 'attack', damage: 12 },
      trample: { name: '畑を荒らす', intent: 'trample', damage: 6 }
    },
    pattern: ['snort', 'rush', 'trample']
  }
};
