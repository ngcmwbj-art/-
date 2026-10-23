'use strict';
/* =========================================================
   戦闘の顔ぶれ
   - enemies：並ぶ敵（左から順）
   - from：何戦目から出るか（0 が1戦目）
   - weight：出やすさ
   ②でマップができたら、マスの種類や季節ごとにここから選ぶ
   ========================================================= */
FR.Encounters = [
  { id: 'twoCrows',   enemies: ['crowSmall', 'crowSmall'],              from: 0, weight: 3 },
  { id: 'crow',       enemies: ['crow'],                                from: 0, weight: 2 },
  { id: 'boar',       enemies: ['boar'],                                from: 1, weight: 2 },
  { id: 'threeCrows', enemies: ['crowSmall', 'crowSmall', 'crowSmall'], from: 2, weight: 2 },
  { id: 'crowPack',   enemies: ['crowSmall', 'crow'],                   from: 2, weight: 2 },
  { id: 'boarCrow',   enemies: ['crowSmall', 'boar'],                   from: 3, weight: 2 }
];
