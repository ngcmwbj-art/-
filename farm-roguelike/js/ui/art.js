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
    // 敵
    crow: 'crow.svg', boar: 'boar.svg',
    // 家畜
    calf: 'calf.svg', piglet: 'piglet.svg', chick: 'chick.svg', hen: 'hen.svg', dog: 'dog.svg',
    // 野菜
    sprout: 'sprout.svg', komatsuna: 'komatsuna.svg', tomato: 'tomato.svg', cabbage: 'cabbage.svg',
    spinach: 'spinach.svg', eggplant: 'eggplant.svg', daikon: 'daikon.svg',
    // 柑橘
    sapling: 'sapling.svg', fruittree: 'fruittree.svg', mikantree: 'mikantree.svg', lemontree: 'lemontree.svg',
    yuzutree: 'yuzutree.svg', dekopontree: 'dekopontree.svg', mikanbox: 'mikanbox.svg', jar: 'jar.svg',
    // 道具・作業・機械
    weeding: 'weeding.svg', mulch: 'mulch.svg', seeds: 'seeds.svg', basket: 'basket.svg', water: 'water.svg',
    net: 'net.svg', fertilizer: 'fertilizer.svg', scarecrow: 'scarecrow.svg', compost: 'compost.svg',
    greenhouse: 'greenhouse.svg', sprayer: 'sprayer.svg', tractor: 'tractor.svg', feed: 'feed.svg',
    vaccine: 'vaccine.svg', fence: 'fence.svg', truck: 'truck.svg', hay: 'hay.svg', shears: 'shears.svg',
    firework: 'firework.svg', fan: 'fan.svg', stonewall: 'stonewall.svg', cowbell: 'cowbell.svg'
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
