'use strict';
/* =========================================================
   戦闘の顔ぶれ
   - enemies：並ぶ敵（左から順）
   - seasons：出てくる季節（0 春 / 1 夏 / 2 秋 / 3 冬）
   - first：季節の1戦目に出てよい弱い顔ぶれ
   - weight：出やすさ。bias で農家タイプごとに倍率をかけられる（例：鳥インフルは畜産農家に出やすい）
   ========================================================= */
FR.Encounters = [
  { id: 'twoCrows',     enemies: ['crowSmall', 'crowSmall'],              seasons: [0, 1], first: true, weight: 3 },
  { id: 'crow',         enemies: ['crow'],                                seasons: [0, 1, 2], first: true, weight: 2 },
  { id: 'aphids',       enemies: ['aphids', 'aphids', 'aphids'],          seasons: [0, 1], first: true, weight: 2, bias: { livestock: 0.3 } },
  { id: 'weeds',        enemies: ['weeds'],                               seasons: [0, 1, 2], weight: 2 },
  { id: 'boar',         enemies: ['boar'],                                seasons: [1, 2, 3], weight: 2 },
  { id: 'weedsAphids',  enemies: ['aphids', 'weeds'],                     seasons: [1, 2], weight: 2, bias: { livestock: 0.3 } },
  { id: 'threeCrows',   enemies: ['crowSmall', 'crowSmall', 'crowSmall'], seasons: [1, 2, 3], first: true, weight: 2 },
  { id: 'crowPack',     enemies: ['crowSmall', 'crow'],                   seasons: [2, 3], weight: 2 },
  { id: 'blast',        enemies: ['blast'],                               seasons: [1, 2], weight: 2, bias: { livestock: 0.3 } },
  { id: 'avianFlu',     enemies: ['avianFlu'],                            seasons: [2, 3], weight: 1, bias: { livestock: 4 } },
  { id: 'frost',        enemies: ['frost'],                               seasons: [0, 3], weight: 2 },
  { id: 'boarCrow',     enemies: ['crowSmall', 'boar'],                   seasons: [2, 3], weight: 2 },
  { id: 'drought',      enemies: ['drought'],                             seasons: [1], weight: 2 },
  { id: 'typhoon',      enemies: ['typhoon'],                             seasons: [2], weight: 2 }
];
