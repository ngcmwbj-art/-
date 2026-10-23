'use strict';
/* =========================================================
   農家タイプ
   - 新しいタイプは、ここに1件足し、専用カードの pool にタイプIDを入れるだけで増やせる
   - enabled:false のタイプは選択画面で「準備中」と表示される
   ========================================================= */
FR.Farmers = {
  vegetable: {
    name: '野菜農家', art: 'komatsuna', enabled: true,
    text: '回転が速い。種をまいて育て、収穫で守りと反撃を生む',
    hp: 70, gold: 50, plots: 3, barns: 0,
    deck: ['weeding', 'weeding', 'weeding', 'weeding', 'mulch', 'mulch', 'mulch', 'sowKomatsuna', 'sowKomatsuna', 'harvest'],
    relic: 'basket'
  },
  livestock: {
    name: '畜産農家', art: 'calf', enabled: false,
    text: '子牛を導入し、給餌で育てて出荷する。高リスク・高リターン',
    hp: 80, gold: 50, plots: 1, barns: 2, deck: [], relic: null
  },
  fruit: {
    name: '果樹農家', art: 'fruittree', enabled: false,
    text: '木を植えると毎ターン少しずつ実りが入る。守って育てる安定型',
    hp: 75, gold: 50, plots: 2, barns: 0, deck: [], relic: null
  }
};
