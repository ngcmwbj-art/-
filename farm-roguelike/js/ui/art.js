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
    // 農家（戦闘で左に立つ）
    farmer_vegetable: 'farmer_vegetable.svg', farmer_livestock: 'farmer_livestock.svg', farmer_citrus: 'farmer_citrus.svg',
    // 敵
    crow: 'crow.svg', boar: 'boar.svg', aphids: 'aphids.svg', weeds: 'weeds.svg', blast: 'blast.svg',
    avianflu: 'avianflu.svg', frost: 'frost.svg', drought: 'drought.svg', typhoon: 'typhoon.svg',
    // 家畜
    calf: 'calf.svg', piglet: 'piglet.png', chick: 'chick.png', hen: 'hen.png', dog: 'dog.svg',
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
    firework: 'firework.svg', fan: 'fan.svg', stonewall: 'stonewall.svg', cowbell: 'cowbell.svg',
    sunrise: 'sunrise.svg', coin: 'coin.svg'
  },
  // 敵の絵（いただいた絵から切り出し、背景を透明にした PNG）
  ENEMY_BASE: 'assets/img/enemies/',
  ENEMIES: ['crowSmall', 'crow', 'boar', 'aphids', 'weeds', 'blast', 'avianFlu', 'frost', 'drought', 'typhoon'],

  // カードの絵（いただいた絵から切り出した 360×240 の JPEG）。ここにある ID はこの絵を使い、ない ID は上の FILES の絵を使う
  CARD_BASE: 'assets/img/cards/',
  CARDS: new Set(["auction", "bagging", "barnRepair", "birdNet", "brushing", "bullRush", "buyCalf", "buyChicks", "buyPiglet", "companion", "compost", "concentrate", "contract", "directSale", "drone", "earlyPick", "earlyRise", "familyHelp", "feed", "fence", "fertilizer", "festival", "firework", "frostFan", "goodHarvestSign", "grafting", "grassCover", "greenhouse", "guardDogs", "harvest", "hay", "hilling", "lightTruck", "liquidFert", "machineOil", "manure", "marmalade", "mikanBox", "mikanMorning", "monorail", "morningEggs", "morningRounds", "morningWork", "mulch", "nightWatch", "pesticide", "pickling", "plantDekopon", "plantEggplant", "plantLemon", "plantTomato", "plantUnshu", "plantYuzu", "pruning", "restInField", "rhythm", "rotation", "scarecrow", "shearsCut", "ship", "shoo", "soilBlessing", "sorting", "sowDaikon", "sowKomatsuna", "sowSpinach", "sowYomogi", "sprinkler", "stoneWall", "subsidy", "thinning", "tiller", "tmrMixer", "tractor", "treeRipening", "tunnel", "vaccine", "vegSoup", "water", "weeding"]),

  FALLBACK: {},

  url(name) {
    if (name && name.startsWith('enemy:')) return FR.Art.ENEMY_BASE + name.slice(6) + '.png';
    const f = FR.Art.FILES[name];
    return f ? FR.Art.BASE + f : null;
  },

  // 農家の立ち絵：assets/img/farmers/<タイプID>.png があればそれ、なければ今の SVG
  farmerImg(id, alt) {
    const svg = FR.Art.BASE + 'farmer_' + id + '.svg';
    const src = FR.Art.missing[id] ? svg : `${FR.Art.FARMER_BASE}${id}.png`;
    // 一度見つからなかったら、次からは最初から SVG を使う（毎回読みに行かない）
    return `<img src="${src}" alt="${FR.Util.escape(alt || '')}" draggable="false" onerror="this.onerror=null;FR.Art.missing['${id}']=1;this.src='${svg}'">`;
  },
  FARMER_BASE: 'assets/img/farmers/',
  missing: {},

  // カードの絵：専用の絵があればそれ、なければ道具の絵
  cardImg(v) {
    if (FR.Art.CARDS.has(v.id)) return `<img class="photo" src="${FR.Art.CARD_BASE}${v.id}.jpg" alt="" draggable="false" loading="lazy">`;
    return FR.Art.img(v.art, '', '');
  },

  // <img> の HTML を返す（なければ絵文字）
  img(name, cls, alt) {
    const u = FR.Art.url(name);
    if (u) return `<img class="${cls || ''}" src="${u}" alt="${FR.Util.escape(alt || '')}" draggable="false">`;
    return `<span class="${cls || ''} art-fallback">${FR.Art.FALLBACK[name] || ''}</span>`;
  }
};
