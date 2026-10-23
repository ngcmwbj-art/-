'use strict';
/* =========================================================
   戦闘の顔ぶれ
   - enemies：並ぶ敵（左から順）
   - from：何戦目から出るか（0 が1戦目）
   - weight：出やすさ。bias で農家タイプごとに倍率をかけられる（例：鳥インフルは畜産農家に出やすい）
   ②でマップができたら、マスの種類や季節ごとにここから選ぶ
   ========================================================= */
FR.Encounters = [
  { id: 'twoCrows',     enemies: ['crowSmall', 'crowSmall'],              from: 0, weight: 3 },
  { id: 'crow',         enemies: ['crow'],                                from: 0, weight: 2 },
  { id: 'aphids',       enemies: ['aphids', 'aphids', 'aphids'],          from: 0, weight: 2, bias: { livestock: 0.3 } },
  { id: 'weeds',        enemies: ['weeds'],                               from: 1, weight: 2 },
  { id: 'boar',         enemies: ['boar'],                                from: 1, weight: 2 },
  { id: 'weedsAphids',  enemies: ['aphids', 'weeds'],                     from: 2, weight: 2, bias: { livestock: 0.3 } },
  { id: 'threeCrows',   enemies: ['crowSmall', 'crowSmall', 'crowSmall'], from: 2, weight: 2 },
  { id: 'crowPack',     enemies: ['crowSmall', 'crow'],                   from: 2, weight: 2 },
  { id: 'blast',        enemies: ['blast'],                               from: 2, weight: 2, bias: { livestock: 0.3 } },
  { id: 'avianFlu',     enemies: ['avianFlu'],                            from: 2, weight: 1, bias: { livestock: 4 } },
  { id: 'frost',        enemies: ['frost'],                               from: 2, weight: 2 },
  { id: 'boarCrow',     enemies: ['crowSmall', 'boar'],                   from: 3, weight: 2 },
  { id: 'drought',      enemies: ['drought'],                             from: 3, weight: 2 },
  { id: 'typhoon',      enemies: ['typhoon'],                             from: 4, weight: 2 }
];
