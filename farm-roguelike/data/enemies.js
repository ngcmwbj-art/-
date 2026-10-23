'use strict';
/* =========================================================
   敵の一覧
   - hp：勢い（敵の体力）の範囲 [最小, 最大]
   - moves：行動。intent の種類
       attack … 健康度に damage
       steal  … いちばん育った作物を1つ奪う（作物がない・ネットがあるときは damage）
       buff   … 自分の力（攻撃の上乗せ）を strength 増やす
   - pattern：行動の順番（くり返す）
   ========================================================= */
FR.Enemies = {
  crow: {
    name: '群れ鴉', kind: 'pest', art: 'crow',
    hp: [18, 22],
    moves: {
      peck:  { name: 'ついばむ', intent: 'attack', damage: 6 },
      steal: { name: '作物を狙う', intent: 'steal', damage: 3 },
      caw:   { name: '仲間を呼ぶ', intent: 'buff', strength: 2 }
    },
    pattern: ['peck', 'steal', 'peck', 'caw']
  }
};
