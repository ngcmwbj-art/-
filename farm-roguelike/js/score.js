'use strict';
/* =========================================================
   経営評価
   ========================================================= */
FR.Score = {
  RANKS: [
    { min: 1100, rank: 'S', title: '地域を支える篤農家' },
    { min: 750, rank: 'A', title: '頼れる担い手' },
    { min: 450, rank: 'B', title: '一人前の百姓' },
    { min: 200, rank: 'C', title: '駆け出しの農家' },
    { min: 0,   rank: 'D', title: '来年こそ' }
  ],

  calc(run) {
    const s = run.stats;
    const parts = [
      { label: '収穫量', value: s.harvest, points: s.harvest },
      { label: '手元の銭', value: run.gold, points: Math.floor(run.gold * 0.5) },
      { label: '追い払った数', value: s.battlesWon, points: s.battlesWon * 30 },
      { label: '越えた季節', value: s.seasonsCleared || 0, points: (s.seasonsCleared || 0) * 60 },
      { label: '受けた被害', value: s.damageTaken, points: -Math.floor(s.damageTaken * 0.5) }
    ];
    if (run.cleared) parts.push({ label: '一年を乗り切った', value: '冬越え', points: 300 });
    const total = Math.max(0, parts.reduce((a, p) => a + p.points, 0));
    const r = FR.Score.RANKS.find(x => total >= x.min);
    return { parts, total, rank: r.rank, title: r.title };
  }
};
