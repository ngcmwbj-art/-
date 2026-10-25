'use strict';
/* =========================================================
   季節（1年 = 春・夏・秋・冬）
   - 1つの季節は steps 段。最後の段は季節のボス
   - boss：ボスの敵ID。農家タイプごとに変えるときは bossBy に書く
   - heal：季節を越えたときに回復する健康度（最大の何割か）
   ========================================================= */
FR.Seasons = [
  { id: 'spring', name: '春', steps: 6, boss: 'lateFrostBoss', heal: 0.3,
    text: '芽吹きの季節。遅霜に気をつけて、最初の畑を守り抜く' },
  { id: 'summer', name: '夏', steps: 6, boss: 'droughtBoss', heal: 0.3,
    text: '日照りと害獣の季節。水と守りが試される' },
  { id: 'autumn', name: '秋', steps: 6, boss: 'typhoonBoss', heal: 0.3,
    text: '実りの季節。台風が来る前に、どれだけ取り入れられるか' },
  { id: 'winter', name: '冬', steps: 6, boss: 'heavySnowBoss', bossBy: { livestock: 'plagueBoss' }, heal: 0,
    text: '厳しい冬。これを越えれば、一年の経営評価' }
];

/* 行き先の種類（分岐の選択肢） */
FR.NodeTypes = {
  battle: { name: '戦い', art: null, text: '害獣や天候と戦う。勝てば報酬のカード' },
  market: { name: '市場', art: 'coin', text: 'カードを買う・売る' },
  rest:   { name: '休憩所', art: 'sunrise', text: '休んで回復するか、カードを強化する' },
  boss:   { name: '季節の大災害', art: null, text: '季節の終わりのボス。勝てば次の季節へ' }
};
