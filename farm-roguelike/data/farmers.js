'use strict';
/* =========================================================
   農家タイプ
   - 新しいタイプは、ここに1件足し、専用カードの pool にタイプIDを入れるだけで増やせる
   - plots：畑の区画の数 / barns：畜舎の数
   - enabled:false のタイプは選択画面で「準備中」と表示される
   ========================================================= */
FR.Farmers = {
  vegetable: {
    name: '野菜農家', art: 'komatsuna', enabled: true,
    text: '回転が速い。次々に植えて収穫し、続けてカードを使うほど強くなる',
    hp: 70, gold: 50, plots: 3, barns: 0,
    deck: ['weeding', 'weeding', 'weeding', 'weeding', 'mulch', 'mulch', 'mulch', 'sowKomatsuna', 'sowKomatsuna', 'harvest'],
    relic: 'basket'
  },
  livestock: {
    name: '畜産農家', art: 'calf', enabled: true,
    text: '子牛を導入し、給餌と手入れで育てて出荷する。格付けが上がれば大きく稼げる',
    hp: 80, gold: 50, plots: 0, barns: 3,
    deck: ['shoo', 'shoo', 'shoo', 'shoo', 'fence', 'fence', 'fence', 'buyCalf', 'feed', 'feed', 'ship'],
    relic: 'cowbell'
  },
  citrus: {
    name: '柑橘農家', art: 'mikantree', enabled: true,
    text: '苗木を植えると、成木になってから毎ターン実がなる。守りながら摘み続ける安定型',
    hp: 75, gold: 50, plots: 3, barns: 0,
    deck: ['weeding', 'weeding', 'weeding', 'weeding', 'mulch', 'mulch', 'mulch', 'plantUnshu', 'plantUnshu', 'harvest'],
    relic: 'stoneWall'
  }
};
