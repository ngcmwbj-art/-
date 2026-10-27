'use strict';
/* =========================================================
   家畜の一覧
   - 家畜は自然には育たない。給餌などのカードで育てる
   - stages：出荷できるまでの段数
   - gold / yield：出荷したときの銭・収穫量（格付けの倍率がかかる）
   - onShip：出荷したときに戦闘で起きること
   - onTurnMature：育ちきっている間、毎ターン始めに起きること（鶏の卵など）
   - grading：格付けの表の名前（FR.GradeTables）。null なら格付けなし（採卵鶏）
   - art：育ち中・育ちきったときの絵
   ========================================================= */
FR.Animals = {
  calf: {
    name: '牛', matureName: '肥育牛', stages: 3, gold: 24, yield: 30, grading: 'beef',
    onShip: [{ op: 'heal', amount: 6 }], shipText: '健康度+6',
    art: { growing: 'calf', ripe: 'calf' }
  },
  piglet: {
    name: '子豚', matureName: '肥育豚', stages: 2, gold: 14, yield: 16, grading: 'pork',
    onShip: [{ op: 'block', amount: 8 }], shipText: '守り8',
    art: { growing: 'piglet', ripe: 'piglet' }
  },
  chick: {
    name: 'ひよこ', matureName: '成鶏', stages: 2, gold: 5, yield: 4, grading: null, layer: true,
    // 採卵鶏：成鶏になると卵を産む。出荷は卵を産み終えた「廃鶏」として安く引き取られる
    onShip: [{ op: 'draw', amount: 1 }], shipText: '1枚引く', shipName: '廃鶏',
    onTurnMature: [{ op: 'block', amount: 2 }, { op: 'gold', amount: 1 }], turnText: '毎ターン卵：守り2・銭1',
    art: { growing: 'chick', ripe: 'hen' }
  }
};

/* 格付け：手入れ（care）の合計で決まる。出荷の銭と収穫量に倍率がかかる
   - beef：牛枝肉の格付け（C2〜A5） / pork：豚枝肉の格付け（等外〜極上） */
FR.GradeTables = {
  beef: [
    { care: 0, label: 'C2', mult: 0.7 },
    { care: 2, label: 'B3', mult: 1.0 },
    { care: 4, label: 'A3', mult: 1.3 },
    { care: 6, label: 'A4', mult: 1.6 },
    { care: 8, label: 'A5', mult: 2.0 }
  ],
  pork: [
    { care: 0, label: '等外', mult: 0.7 },
    { care: 2, label: '並', mult: 1.0 },
    { care: 4, label: '中', mult: 1.3 },
    { care: 6, label: '上', mult: 1.6 },
    { care: 8, label: '極上', mult: 2.0 }
  ]
};
FR.Grades = FR.GradeTables.beef;   // 古い呼び方用
