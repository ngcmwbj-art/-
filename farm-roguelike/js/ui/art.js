'use strict';
/* =========================================================
   絵の窓口
   - データ側は art: 'crow' のように名前だけを書く
   - ここで名前 → 画像ファイルを決める。PNG の手描き絵に差し替えるときは、パスを書き換えるだけ
   - 一覧にない名前は、絵文字（FALLBACK）か空欄で表示する
   ========================================================= */
FR.Art = {
  BASE: 'assets/img/art/',
  FILES: {
    // 敵・家畜
    crow: 'crow.svg', boar: 'boar.svg', calf: 'calf.svg',
    // 作物
    sprout: 'sprout.svg', komatsuna: 'komatsuna.svg', tomato: 'tomato.svg', cabbage: 'cabbage.svg', fruittree: 'fruittree.svg',
    // 道具・作業
    weeding: 'weeding.svg', mulch: 'mulch.svg', seeds: 'seeds.svg', basket: 'basket.svg', water: 'water.svg',
    net: 'net.svg', fertilizer: 'fertilizer.svg', scarecrow: 'scarecrow.svg', compost: 'compost.svg'
  },
  FALLBACK: {},

  url(name) {
    const f = FR.Art.FILES[name];
    return f ? FR.Art.BASE + f : null;
  },

  // <img> の HTML を返す（なければ絵文字）
  img(name, cls, alt) {
    const u = FR.Art.url(name);
    if (u) return `<img class="${cls || ''}" src="${u}" alt="${FR.Util.escape(alt || '')}" draggable="false">`;
    return `<span class="${cls || ''} art-fallback">${FR.Art.FALLBACK[name] || ''}</span>`;
  }
};
