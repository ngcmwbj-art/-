'use strict';
/* =========================================================
   カードの一覧
   - キー（weeding など）がカードID。保存データで使うので後から変えない
   - type：attack 攻撃 / skill 守り / crop 作物 / growth 成長 / livestock 畜産 / machine 機械 / power 常時（使うとこの戦闘の間ずっと効く）
   - rarity：basic 初期 / common / uncommon / rare（報酬の出やすさ）
   - pool：出てくる農家タイプ（'common' は全員、vegetable 野菜 / livestock 畜産 / citrus 柑橘）
   - needs：使う条件
       emptyPlot 空いた区画 / ripeCrop 収穫できる作物か実 / tree 柑橘の木 /
       emptyBarn 空いた畜舎 / animal 家畜がいる / matureAnimal 出荷できる家畜
   - effects：効果。op の種類は js/core/effects.js を参照
     damage など1体を狙う効果があるカードは、敵が2体以上いると「どの敵に使うか」を選ぶ（敵をタップ／敵の上で離す）
   - upgrade：強化したときに上書きする項目（休憩所で強化。②以降）
   - exhaust：true なら使うとこの戦闘から消える（廃棄）
   ========================================================= */
FR.Cards = {
  /* ════════ 全員共通 ════════ */
  weeding: {
    name: '除草', type: 'attack', cost: 1, rarity: 'basic', pool: ['common'], art: 'weeding',
    text: '勢いに6',
    effects: [{ op: 'damage', amount: 6 }],
    upgrade: { name: '除草+', text: '勢いに9', effects: [{ op: 'damage', amount: 9 }] }
  },
  mulch: {
    name: 'マルチ', type: 'skill', cost: 1, rarity: 'basic', pool: ['common'], art: 'mulch',
    text: '守り5',
    effects: [{ op: 'block', amount: 5 }],
    upgrade: { name: 'マルチ+', text: '守り8', effects: [{ op: 'block', amount: 8 }] }
  },
  harvest: {
    name: '収穫', type: 'crop', cost: 0, rarity: 'basic', pool: [], art: 'basket', retired: true,  // 収穫ボタンに置きかえ（古い保存データ用に残す）
    text: '実った作物と、木になった実をすべて収穫する',
    needs: 'ripeCrop',
    effects: [{ op: 'harvest' }],
    upgrade: { name: '収穫+', text: '実った作物と、木になった実をすべて収穫し、1枚引く', effects: [{ op: 'harvest' }, { op: 'draw', amount: 1 }] }
  },
  water: {
    name: '水やり', type: 'growth', cost: 1, rarity: 'common', pool: ['vegetable', 'citrus'], art: 'water',
    text: '作物と木をすべて1段育て、1枚引く',
    effects: [{ op: 'grow', amount: 1 }, { op: 'draw', amount: 1 }],
    upgrade: { name: '水やり+', text: '作物と木をすべて1段育て、2枚引く', effects: [{ op: 'grow', amount: 1 }, { op: 'draw', amount: 2 }] }
  },
  birdNet: {
    name: '防鳥ネット', type: 'skill', cost: 1, rarity: 'common', pool: ['common'], art: 'net',
    text: '守り7。このターン、作物と実を奪われない',
    effects: [{ op: 'block', amount: 7 }, { op: 'status', id: 'netted', amount: 1 }],
    upgrade: { name: '防鳥ネット+', text: '守り10。このターン、作物と実を奪われない', effects: [{ op: 'block', amount: 10 }, { op: 'status', id: 'netted', amount: 1 }] }
  },
  scarecrow: {
    name: 'かかし', type: 'attack', cost: 2, rarity: 'uncommon', pool: ['common'], art: 'scarecrow',
    text: '勢いに4。この先3ターン、毎ターン始めに勢いに4',
    effects: [{ op: 'damage', amount: 4 }, { op: 'status', id: 'scarecrow', amount: 3 }],
    upgrade: { name: 'かかし+', text: '勢いに6。この先4ターン、毎ターン始めに勢いに4', effects: [{ op: 'damage', amount: 6 }, { op: 'status', id: 'scarecrow', amount: 4 }] }
  },

    /* ── エネルギーを増やすカード ── */
  earlyRise: {
    name: '早起き', type: 'skill', cost: 0, rarity: 'common', pool: ['common'], art: 'sunrise',
    text: 'エネルギー+1。廃棄',
    exhaust: true,
    effects: [{ op: 'energy', amount: 1 }],
    upgrade: { name: '早起き+', text: 'エネルギー+1、1枚引く。廃棄', effects: [{ op: 'energy', amount: 1 }, { op: 'draw', amount: 1 }] }
  },
  subsidy: {
    name: '農協の補助金', type: 'skill', cost: 1, rarity: 'common', pool: ['common'], art: 'coin',
    text: '次のターン始めにエネルギー+2',
    effects: [{ op: 'status', id: 'nextEnergy', amount: 2 }],
    upgrade: { name: '農協の補助金+', cost: 0 }
  },
  familyHelp: {
    name: '家族の手伝い', type: 'power', cost: 2, rarity: 'rare', pool: ['common'], art: 'farmer_vegetable',
    text: 'この戦闘の間、毎ターン始めにエネルギー+1',
    effects: [{ op: 'status', id: 'energyUp', amount: 1 }],
    upgrade: { name: '家族の手伝い+', cost: 1 }
  },

/* ════════ 野菜農家：回転が速い。たくさん植えて、続けて使うほど強い ════════ */
  sowKomatsuna: {
    name: '種まき', type: 'crop', cost: 1, rarity: 'basic', pool: ['vegetable'], art: 'seeds',
    text: '小松菜を植える（2段で実る。収穫で守り4・銭4）',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'komatsuna' }],
    upgrade: { name: '種まき+', cost: 0 }
  },
  sowSpinach: {
    name: 'ホウレンソウ', type: 'crop', cost: 0, rarity: 'common', pool: ['vegetable'], art: 'spinach',
    text: 'ホウレンソウを植える（1段で実る。収穫で守り3・銭2）',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'spinach' }],
    upgrade: { name: 'ホウレンソウ+', text: 'ホウレンソウを植え、1枚引く', effects: [{ op: 'plant', crop: 'spinach' }, { op: 'draw', amount: 1 }] }
  },
  plantEggplant: {
    name: 'ナスの苗', type: 'crop', cost: 1, rarity: 'common', pool: ['vegetable'], art: 'eggplant',
    text: 'ナスを植える（2段で実る。収穫で2枚引く・銭5）',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'eggplant' }],
    upgrade: { name: 'ナスの苗+', cost: 0 }
  },
  sowDaikon: {
    name: '大根の種まき', type: 'crop', cost: 1, rarity: 'common', pool: ['vegetable'], art: 'daikon',
    text: '大根を植える（3段で実る。収穫で勢いに6・守り6・銭6）',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'daikon' }],
    upgrade: { name: '大根の種まき+', cost: 0 }
  },
  plantTomato: {
    name: 'トマトの苗', type: 'crop', cost: 2, rarity: 'uncommon', pool: ['vegetable'], art: 'tomato',
    text: 'トマトを植える（3段で実る。収穫で勢いに10・銭10）',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'tomato' }],
    upgrade: { name: 'トマトの苗+', cost: 1 }
  },
  fertilizer: {
    name: '肥料', type: 'growth', cost: 1, rarity: 'common', pool: ['vegetable', 'citrus'], art: 'fertilizer',
    text: '作物と木をすべて2段育てる',
    effects: [{ op: 'grow', amount: 2 }],
    upgrade: { name: '肥料+', cost: 0 }
  },
  liquidFert: {
    name: '液肥', type: 'growth', cost: 0, rarity: 'common', pool: ['vegetable'], art: 'fertilizer',
    text: '作物と木をすべて1段育てる',
    effects: [{ op: 'grow', amount: 1 }],
    upgrade: { name: '液肥+', text: '作物と木をすべて1段育て、1枚引く', effects: [{ op: 'grow', amount: 1 }, { op: 'draw', amount: 1 }] }
  },
  hilling: {
    name: '土寄せ', type: 'skill', cost: 1, rarity: 'common', pool: ['vegetable'], art: 'mulch',
    text: '守り5。作物をすべて1段育てる',
    effects: [{ op: 'block', amount: 5 }, { op: 'grow', amount: 1 }],
    upgrade: { name: '土寄せ+', text: '守り8。作物をすべて1段育てる', effects: [{ op: 'block', amount: 8 }, { op: 'grow', amount: 1 }] }
  },
  tunnel: {
    name: 'トンネル栽培', type: 'skill', cost: 1, rarity: 'common', pool: ['vegetable'], art: 'greenhouse',
    text: '守り6。このターン、作物を奪われない。1枚引く',
    effects: [{ op: 'block', amount: 6 }, { op: 'status', id: 'netted', amount: 1 }, { op: 'draw', amount: 1 }],
    upgrade: { name: 'トンネル栽培+', text: '守り9。このターン、作物を奪われない。1枚引く', effects: [{ op: 'block', amount: 9 }, { op: 'status', id: 'netted', amount: 1 }, { op: 'draw', amount: 1 }] }
  },
  pesticide: {
    name: '農薬散布', type: 'attack', cost: 2, rarity: 'common', pool: ['vegetable'], art: 'sprayer',
    text: '敵すべての勢いに5',
    effects: [{ op: 'damageAll', amount: 5 }],
    upgrade: { name: '農薬散布+', text: '敵すべての勢いに8', effects: [{ op: 'damageAll', amount: 8 }] }
  },
  morningWork: {
    name: '朝どれ作業', type: 'attack', cost: 1, rarity: 'common', pool: ['vegetable'], art: 'weeding',
    text: '勢いに3＋このターン使ったカード1枚につき2',
    effects: [{ op: 'damagePerPlayed', base: 3, per: 2 }],
    upgrade: { name: '朝どれ作業+', text: '勢いに3＋このターン使ったカード1枚につき3', effects: [{ op: 'damagePerPlayed', base: 3, per: 3 }] }
  },
  earlyPick: {
    name: '早どり', type: 'crop', cost: 0, rarity: 'uncommon', pool: ['vegetable'], art: 'basket',
    text: '1段以上育った作物をすべて収穫する（実る前のものは銭と収穫量が半分・効果なし）',
    needs: 'anyCrop',
    effects: [{ op: 'harvest', early: true }],
    upgrade: { name: '早どり+', text: '1段以上育った作物をすべて収穫し、1枚引く（実る前のものは半分・効果なし）', effects: [{ op: 'harvest', early: true }, { op: 'draw', amount: 1 }] }
  },
  companion: {
    name: 'コンパニオンプランツ', type: 'growth', cost: 0, rarity: 'uncommon', pool: ['vegetable'], art: 'komatsuna',
    text: '植えてある作物1つにつき1枚引く',
    effects: [{ op: 'drawPerCrop', per: 1 }],
    upgrade: { name: 'コンパニオンプランツ+', text: '植えてある作物1つにつき1枚引き、守り2ずつ', effects: [{ op: 'drawPerCrop', per: 1 }, { op: 'blockPerCrop', per: 2 }] }
  },
  rotation: {
    name: '輪作', type: 'crop', cost: 0, rarity: 'uncommon', pool: ['vegetable'], art: 'seeds',
    text: '捨て札から作物のカードを1枚、手札に戻す',
    needs: 'cropInDiscard',
    effects: [{ op: 'fetch', type: 'crop' }],
    upgrade: { name: '輪作+', text: '捨て札から作物のカードを2枚、手札に戻す', effects: [{ op: 'fetch', type: 'crop' }, { op: 'fetch', type: 'crop' }] }
  },
  directSale: {
    name: '直売所', type: 'crop', cost: 1, rarity: 'uncommon', pool: ['vegetable', 'citrus'], art: 'mikanbox',
    text: '収穫できるものをすべて収穫し、さらに銭+6',
    needs: 'ripeCrop',
    effects: [{ op: 'harvest' }, { op: 'gold', amount: 6 }],
    upgrade: { name: '直売所+', text: '収穫できるものをすべて収穫し、さらに銭+10', effects: [{ op: 'harvest' }, { op: 'gold', amount: 10 }] }
  },
  pickling: {
    name: '漬物づくり', type: 'skill', cost: 0, rarity: 'uncommon', pool: ['vegetable'], art: 'eggplant',
    text: 'エネルギー+2。廃棄',
    exhaust: true,
    effects: [{ op: 'energy', amount: 2 }],
    upgrade: { name: '漬物づくり+', text: 'エネルギー+2、1枚引く。廃棄', effects: [{ op: 'energy', amount: 2 }, { op: 'draw', amount: 1 }] }
  },
  tiller: {
    name: '管理機', type: 'machine', cost: 2, rarity: 'uncommon', pool: ['vegetable'], art: 'tractor',
    text: '勢いに8。作物をすべて1段育てる',
    effects: [{ op: 'damage', amount: 8 }, { op: 'grow', amount: 1 }],
    upgrade: { name: '管理機+', text: '勢いに11。作物をすべて1段育てる', effects: [{ op: 'damage', amount: 11 }, { op: 'grow', amount: 1 }] }
  },
  compost: {
    name: '堆肥づくり', type: 'power', cost: 1, rarity: 'rare', pool: ['vegetable', 'citrus'], art: 'compost',
    text: '地力+1（この戦闘の間、作物と木が育つたびに1段多く育つ）',
    effects: [{ op: 'status', id: 'soil', amount: 1 }],
    upgrade: { name: '堆肥づくり+', cost: 0 }
  },
  greenhouse: {
    name: 'ビニールハウス', type: 'power', cost: 2, rarity: 'rare', pool: ['vegetable'], art: 'greenhouse',
    text: 'この戦闘の間、毎ターン始めに守り4',
    effects: [{ op: 'status', id: 'greenhouse', amount: 4 }],
    upgrade: { name: 'ビニールハウス+', text: 'この戦闘の間、毎ターン始めに守り6', effects: [{ op: 'status', id: 'greenhouse', amount: 6 }] }
  },
  rhythm: {
    name: '段取り八分', type: 'power', cost: 1, rarity: 'rare', pool: ['vegetable'], art: 'seeds',
    text: 'この戦闘の間、1ターンに3枚目・6枚目…のカードを使うたび1枚引く',
    effects: [{ op: 'status', id: 'rhythm', amount: 1 }],
    upgrade: { name: '段取り八分+', cost: 0 }
  },
  festival: {
    name: '収穫祭', type: 'crop', cost: 1, rarity: 'rare', pool: ['vegetable'], art: 'basket',
    text: '収穫できるものをすべて収穫し、収穫した数1つにつき勢いに5',
    needs: 'ripeCrop',
    effects: [{ op: 'harvest' }, { op: 'damagePerHarvested', per: 5 }],
    upgrade: { name: '収穫祭+', text: '収穫できるものをすべて収穫し、収穫した数1つにつき勢いに7', effects: [{ op: 'harvest' }, { op: 'damagePerHarvested', per: 7 }] }
  },
  tractor: {
    name: 'トラクター', type: 'machine', cost: 3, rarity: 'rare', pool: ['vegetable'], art: 'tractor',
    text: '勢いに14。作物をすべて2段育てる',
    effects: [{ op: 'damage', amount: 14 }, { op: 'grow', amount: 2 }],
    upgrade: { name: 'トラクター+', text: '勢いに18。作物をすべて2段育てる', effects: [{ op: 'damage', amount: 18 }, { op: 'grow', amount: 2 }] }
  },

  /* ── 野菜農家の回復 ── */
  vegSoup: {
    name: '野菜スープ', type: 'skill', cost: 1, rarity: 'common', pool: ['vegetable'], art: 'jar',
    text: '健康度+6、1枚引く。廃棄',
    exhaust: true,
    effects: [{ op: 'heal', amount: 6 }, { op: 'draw', amount: 1 }],
    upgrade: { name: '野菜スープ+', text: '健康度+9、1枚引く。廃棄', effects: [{ op: 'heal', amount: 9 }, { op: 'draw', amount: 1 }] }
  },
  sowYomogi: {
    name: 'ヨモギの株分け', type: 'crop', cost: 1, rarity: 'common', pool: ['vegetable'], art: 'spinach',
    text: 'ヨモギを植える。2段で実り、収穫で健康度+5・銭2',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'yomogi' }],
    upgrade: { name: 'ヨモギの株分け+', cost: 0 }
  },
  restInField: {
    name: '畑で一息', type: 'skill', cost: 1, rarity: 'uncommon', pool: ['vegetable'], art: 'komatsuna',
    text: '守り4。植えてある作物1つにつき健康度+2',
    effects: [{ op: 'block', amount: 4 }, { op: 'healPerCrop', per: 2 }],
    upgrade: { name: '畑で一息+', text: '守り6。植えてある作物1つにつき健康度+3', effects: [{ op: 'block', amount: 6 }, { op: 'healPerCrop', per: 3 }] }
  },
  soilBlessing: {
    name: '土の恵み', type: 'power', cost: 2, rarity: 'rare', pool: ['vegetable'], art: 'compost',
    text: 'この戦闘の間、作物を1つ収穫するたび健康度+2',
    effects: [{ op: 'status', id: 'harvestHeal', amount: 2 }],
    upgrade: { name: '土の恵み+', cost: 1 }
  },

  goodHarvestSign: {
    name: '豊作の気配', type: 'growth', cost: 0, rarity: 'uncommon', pool: ['vegetable'], art: 'basket',
    text: '実った作物1つにつきエネルギー+1',
    needs: 'ripeCrop',
    effects: [{ op: 'energyPerRipe', per: 1 }],
    upgrade: { name: '豊作の気配+', text: '実った作物1つにつきエネルギー+1、1枚引く', effects: [{ op: 'energyPerRipe', per: 1 }, { op: 'draw', amount: 1 }] }
  },

  /* ════════ 畜産農家：家畜を導入し、手をかけて育て、出荷で大きく稼ぐ ════════ */
  shoo: {
    name: '追い払う', type: 'attack', cost: 1, rarity: 'basic', pool: ['livestock'], art: 'dog',
    text: '勢いに6',
    effects: [{ op: 'damage', amount: 6 }],
    upgrade: { name: '追い払う+', text: '勢いに9', effects: [{ op: 'damage', amount: 9 }] }
  },
  fence: {
    name: '柵', type: 'skill', cost: 1, rarity: 'basic', pool: ['livestock'], art: 'fence',
    text: '守り5',
    effects: [{ op: 'block', amount: 5 }],
    upgrade: { name: '柵+', text: '守り8', effects: [{ op: 'block', amount: 8 }] }
  },
  buyCalf: {
    name: '子牛導入', type: 'livestock', cost: 1, rarity: 'basic', pool: ['livestock'], art: 'calf',
    text: 'F1子牛を入れる。給餌などで3段育つと出荷でき、銭24×格付け・健康度+6',
    needs: 'emptyBarn',
    effects: [{ op: 'addAnimal', animal: 'calf' }],
    upgrade: { name: '子牛導入+', text: 'F1子牛を入れ、手入れ+1。3段で出荷でき、銭24×格付け・健康度+6', effects: [{ op: 'addAnimal', animal: 'calf', care: 1 }] }
  },
  feed: {
    name: '給餌', type: 'livestock', cost: 1, rarity: 'basic', pool: ['livestock'], art: 'feed',
    text: '家畜をすべて1段育て、手入れ+1（手入れが多いほど格付けが上がる）',
    needs: 'animal',
    effects: [{ op: 'feed', grow: 1, care: 1 }],
    upgrade: { name: '給餌+', text: '家畜をすべて1段育て、手入れ+1。1枚引く', effects: [{ op: 'feed', grow: 1, care: 1 }, { op: 'draw', amount: 1 }] }
  },
  ship: {
    name: '出荷', type: 'livestock', cost: 0, rarity: 'basic', pool: [], art: 'truck', retired: true,  // 収穫ボタンに置きかえ（古い保存データ用に残す）
    text: '出荷できる家畜をすべて出荷する。手入れが多いほど格付けが上がり、高く売れる',
    needs: 'matureAnimal',
    effects: [{ op: 'ship' }],
    upgrade: { name: '出荷+', text: '出荷できる家畜をすべて出荷し、1枚引く', effects: [{ op: 'ship' }, { op: 'draw', amount: 1 }] }
  },
  buyPiglet: {
    name: '子豚導入', type: 'livestock', cost: 1, rarity: 'common', pool: ['livestock'], art: 'piglet',
    text: '子豚を入れる。2段育つと出荷でき、銭14×豚の格付け・守り8',
    needs: 'emptyBarn',
    effects: [{ op: 'addAnimal', animal: 'piglet' }],
    upgrade: { name: '子豚導入+', cost: 0 }
  },
  buyChicks: {
    name: 'ひよこ導入', type: 'livestock', cost: 0, rarity: 'common', pool: ['livestock'], art: 'chick',
    text: 'ひよこを入れる。給餌などで2段育つと成鶏になり、毎ターン始めに卵（守り2・銭1）',
    needs: 'emptyBarn',
    effects: [{ op: 'addAnimal', animal: 'chick' }],
    upgrade: { name: 'ひよこ導入+', text: 'ひよこを畜舎に入れ、1段育てる', effects: [{ op: 'addAnimal', animal: 'chick', grow: 1 }] }
  },
  concentrate: {
    name: '濃厚飼料', type: 'livestock', cost: 1, rarity: 'common', pool: ['livestock'], art: 'feed',
    text: '家畜をすべて2段育てる（手入れは増えない）',
    needs: 'animal',
    effects: [{ op: 'feed', grow: 2, care: 0 }],
    upgrade: { name: '濃厚飼料+', cost: 0 }
  },
  hay: {
    name: '良質な乾草', type: 'livestock', cost: 1, rarity: 'uncommon', pool: ['livestock'], art: 'hay',
    text: '家畜をすべて1段育て、手入れ+2',
    needs: 'animal',
    effects: [{ op: 'feed', grow: 1, care: 2 }],
    upgrade: { name: '良質な乾草+', text: '家畜をすべて1段育て、手入れ+3', effects: [{ op: 'feed', grow: 1, care: 3 }] }
  },
  brushing: {
    name: 'ブラッシング', type: 'livestock', cost: 0, rarity: 'common', pool: ['livestock'], art: 'hay',
    text: '家畜すべての手入れ+1。1枚引く',
    needs: 'animal',
    effects: [{ op: 'feed', grow: 0, care: 1 }, { op: 'draw', amount: 1 }],
    upgrade: { name: 'ブラッシング+', text: '家畜すべての手入れ+2。1枚引く', effects: [{ op: 'feed', grow: 0, care: 2 }, { op: 'draw', amount: 1 }] }
  },
  vaccine: {
    name: 'ワクチン', type: 'livestock', cost: 1, rarity: 'common', pool: ['livestock'], art: 'vaccine',
    text: '守り5。家畜すべての手入れ+1。この戦闘の間、家畜が病気にかからない',
    effects: [{ op: 'block', amount: 5 }, { op: 'feed', grow: 0, care: 1 }, { op: 'status', id: 'immune', amount: 1 }],
    upgrade: { name: 'ワクチン+', text: '守り8。家畜すべての手入れ+1。この戦闘の間、家畜が病気にかからない', effects: [{ op: 'block', amount: 8 }, { op: 'feed', grow: 0, care: 1 }, { op: 'status', id: 'immune', amount: 1 }] }
  },
  disinfect: {
    name: '消毒', type: 'livestock', cost: 1, rarity: 'common', pool: ['livestock'], art: 'sprayer',
    text: '守り6。この戦闘の間、家畜が病気にかからない',
    effects: [{ op: 'block', amount: 6 }, { op: 'status', id: 'immune', amount: 1 }],
    upgrade: { name: '消毒+', text: '守り9。この戦闘の間、家畜が病気にかからない', effects: [{ op: 'block', amount: 9 }, { op: 'status', id: 'immune', amount: 1 }] }
  },
  barnRepair: {
    name: '畜舎の補強', type: 'skill', cost: 2, rarity: 'common', pool: ['livestock'], art: 'fence',
    text: '守り13',
    effects: [{ op: 'block', amount: 13 }],
    upgrade: { name: '畜舎の補強+', text: '守り17', effects: [{ op: 'block', amount: 17 }] }
  },
  nightWatch: {
    name: '夜回り', type: 'skill', cost: 1, rarity: 'common', pool: ['livestock'], art: 'dog',
    text: '守り5。次のターン始めにも守り5',
    effects: [{ op: 'block', amount: 5 }, { op: 'status', id: 'dawnBlock', amount: 5 }],
    upgrade: { name: '夜回り+', text: '守り7。次のターン始めにも守り7', effects: [{ op: 'block', amount: 7 }, { op: 'status', id: 'dawnBlock', amount: 7 }] }
  },
  guardDogs: {
    name: '猟犬', type: 'attack', cost: 2, rarity: 'common', pool: ['livestock'], art: 'dog',
    text: '勢いに6を2回',
    effects: [{ op: 'damage', amount: 6 }, { op: 'damage', amount: 6 }],
    upgrade: { name: '猟犬+', text: '勢いに8を2回', effects: [{ op: 'damage', amount: 8 }, { op: 'damage', amount: 8 }] }
  },
  bullRush: {
    name: '牛追い', type: 'attack', cost: 2, rarity: 'uncommon', pool: ['livestock'], art: 'calf',
    text: '勢いに5＋家畜1頭につき5',
    effects: [{ op: 'damagePerAnimal', base: 5, per: 5 }],
    upgrade: { name: '牛追い+', text: '勢いに5＋家畜1頭につき7', effects: [{ op: 'damagePerAnimal', base: 5, per: 7 }] }
  },
  manure: {
    name: '堆肥の還元', type: 'skill', cost: 1, rarity: 'uncommon', pool: ['livestock'], art: 'compost',
    text: '家畜1頭につき守り4。1枚引く',
    effects: [{ op: 'blockPerAnimal', per: 4 }, { op: 'draw', amount: 1 }],
    upgrade: { name: '堆肥の還元+', text: '家畜1頭につき守り6。1枚引く', effects: [{ op: 'blockPerAnimal', per: 6 }, { op: 'draw', amount: 1 }] }
  },
  morningEggs: {
    name: '朝の卵', type: 'skill', cost: 1, rarity: 'common', pool: ['livestock'], art: 'hen',
    text: '健康度+4。1枚引く。廃棄',
    exhaust: true,
    effects: [{ op: 'heal', amount: 4 }, { op: 'draw', amount: 1 }],
    upgrade: { name: '朝の卵+', text: '健康度+7。1枚引く。廃棄', effects: [{ op: 'heal', amount: 7 }, { op: 'draw', amount: 1 }] }
  },
  lightTruck: {
    name: '軽トラ', type: 'machine', cost: 0, rarity: 'uncommon', pool: ['livestock', 'citrus'], art: 'truck',
    text: 'エネルギー+1、1枚引く。廃棄',
    exhaust: true,
    effects: [{ op: 'energy', amount: 1 }, { op: 'draw', amount: 1 }],
    upgrade: { name: '軽トラ+', text: 'エネルギー+1、2枚引く。廃棄', effects: [{ op: 'energy', amount: 1 }, { op: 'draw', amount: 2 }] }
  },
  auction: {
    name: '家畜市場のセリ', type: 'livestock', cost: 1, rarity: 'rare', pool: ['livestock'], art: 'truck',
    text: '出荷できる家畜をすべて出荷する。格付けが1段上がる',
    needs: 'matureAnimal',
    effects: [{ op: 'ship', gradeBonus: 1 }],
    upgrade: { name: '家畜市場のセリ+', text: '出荷できる家畜をすべて出荷する。格付けが2段上がる', effects: [{ op: 'ship', gradeBonus: 2 }] }
  },
  contract: {
    name: '契約出荷', type: 'power', cost: 1, rarity: 'rare', pool: ['livestock'], art: 'cowbell',
    text: 'この戦闘の間、出荷の銭が1.5倍',
    effects: [{ op: 'status', id: 'contract', amount: 1 }],
    upgrade: { name: '契約出荷+', cost: 0 }
  },
  tmrMixer: {
    name: '飼料ミキサー', type: 'machine', cost: 3, rarity: 'rare', pool: ['livestock'], art: 'feed',
    text: '家畜をすべて2段育て、手入れ+2。守り6',
    needs: 'animal',
    effects: [{ op: 'feed', grow: 2, care: 2 }, { op: 'block', amount: 6 }],
    upgrade: { name: '飼料ミキサー+', cost: 2 }
  },

  morningRounds: {
    name: '朝の見回り', type: 'livestock', cost: 0, rarity: 'uncommon', pool: ['livestock'], art: 'dog',
    text: '家畜1頭につきエネルギー+1。廃棄',
    needs: 'animal', exhaust: true,
    effects: [{ op: 'energyPerAnimal', per: 1 }],
    upgrade: { name: '朝の見回り+', text: '家畜1頭につきエネルギー+1。（廃棄しない）', exhaust: false }
  },

  /* ════════ 柑橘農家：木を植えると毎ターン実がなる。守って摘み続ける ════════ */
  plantUnshu: {
    name: '温州みかんの苗木', type: 'crop', cost: 1, rarity: 'basic', pool: ['citrus'], art: 'sapling',
    text: '温州みかんを植える（2段で成木。毎ターン実が1つなる。実1つで守り3・銭3）',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'unshu' }],
    upgrade: { name: '温州みかんの苗木+', cost: 0 }
  },
  plantLemon: {
    name: 'レモンの苗木', type: 'crop', cost: 1, rarity: 'common', pool: ['citrus'], art: 'lemontree',
    text: 'レモンを植える（2段で成木。実1つで勢いに5・銭2）',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'lemon' }],
    upgrade: { name: 'レモンの苗木+', cost: 0 }
  },
  plantYuzu: {
    name: 'ゆずの苗木', type: 'crop', cost: 1, rarity: 'common', pool: ['citrus'], art: 'yuzutree',
    text: 'ゆずを植える（3段で成木。実1つで1枚引く・銭3）',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'yuzu' }],
    upgrade: { name: 'ゆずの苗木+', cost: 0 }
  },
  plantDekopon: {
    name: 'デコポンの苗木', type: 'crop', cost: 2, rarity: 'uncommon', pool: ['citrus'], art: 'dekopontree',
    text: 'デコポンを植える（3段で成木。実は2つまで。実1つで健康度+2・守り2・銭8）',
    needs: 'emptyPlot',
    effects: [{ op: 'plant', crop: 'dekopon' }],
    upgrade: { name: 'デコポンの苗木+', cost: 1 }
  },
  pruning: {
    name: '剪定', type: 'growth', cost: 1, rarity: 'common', pool: ['citrus'], art: 'shears',
    text: '木すべての実の上限+1。成木なら実を1つ増やす',
    needs: 'tree',
    effects: [{ op: 'prune', cap: 1, fruit: 1 }],
    upgrade: { name: '剪定+', text: '木すべての実の上限+1。成木なら実を2つ増やす', effects: [{ op: 'prune', cap: 1, fruit: 2 }] }
  },
  shearsCut: {
    name: '剪定ばさみ', type: 'attack', cost: 1, rarity: 'common', pool: ['citrus'], art: 'shears',
    text: '勢いに5。成木の実を1つ増やす',
    effects: [{ op: 'damage', amount: 5 }, { op: 'prune', cap: 0, fruit: 1 }],
    upgrade: { name: '剪定ばさみ+', text: '勢いに8。成木の実を1つ増やす', effects: [{ op: 'damage', amount: 8 }, { op: 'prune', cap: 0, fruit: 1 }] }
  },
  bagging: {
    name: '袋かけ', type: 'skill', cost: 1, rarity: 'common', pool: ['citrus'], art: 'net',
    text: '守り7。このターン、実を奪われない',
    effects: [{ op: 'block', amount: 7 }, { op: 'status', id: 'netted', amount: 1 }],
    upgrade: { name: '袋かけ+', text: '守り10。このターン、実を奪われない', effects: [{ op: 'block', amount: 10 }, { op: 'status', id: 'netted', amount: 1 }] }
  },
  stoneWall: {
    name: '石垣積み', type: 'skill', cost: 2, rarity: 'common', pool: ['citrus'], art: 'stonewall',
    text: '守り13',
    effects: [{ op: 'block', amount: 13 }],
    upgrade: { name: '石垣積み+', text: '守り17', effects: [{ op: 'block', amount: 17 }] }
  },
  mikanBox: {
    name: 'みかん箱の山', type: 'skill', cost: 1, rarity: 'common', pool: ['citrus'], art: 'mikanbox',
    text: '木になっている実1つにつき守り3',
    effects: [{ op: 'blockPerFruit', per: 3 }],
    upgrade: { name: 'みかん箱の山+', text: '守り3＋木になっている実1つにつき守り3', effects: [{ op: 'block', amount: 3 }, { op: 'blockPerFruit', per: 3 }] }
  },
  sorting: {
    name: '選果', type: 'growth', cost: 0, rarity: 'common', pool: ['citrus'], art: 'mikanbox',
    text: '木になっている実1つにつき銭+2。1枚引く',
    effects: [{ op: 'goldPerFruit', per: 2 }, { op: 'draw', amount: 1 }],
    upgrade: { name: '選果+', text: '木になっている実1つにつき銭+3。2枚引く', effects: [{ op: 'goldPerFruit', per: 3 }, { op: 'draw', amount: 2 }] }
  },
  firework: {
    name: 'ロケット花火', type: 'attack', cost: 1, rarity: 'common', pool: ['citrus'], art: 'firework',
    text: '勢いに11。廃棄',
    exhaust: true,
    effects: [{ op: 'damage', amount: 11 }],
    upgrade: { name: 'ロケット花火+', text: '勢いに15。廃棄', effects: [{ op: 'damage', amount: 15 }] }
  },
  machineOil: {
    name: 'マシン油散布', type: 'attack', cost: 2, rarity: 'common', pool: ['citrus'], art: 'sprayer',
    text: '敵すべての勢いに6',
    effects: [{ op: 'damageAll', amount: 6 }],
    upgrade: { name: 'マシン油散布+', text: '敵すべての勢いに9', effects: [{ op: 'damageAll', amount: 9 }] }
  },
  sprinkler: {
    name: 'スプリンクラー', type: 'machine', cost: 1, rarity: 'uncommon', pool: ['citrus'], art: 'water',
    text: '作物と木をすべて1段育てる（成木なら実が1つなる）。守り4',
    effects: [{ op: 'grow', amount: 1 }, { op: 'block', amount: 4 }],
    upgrade: { name: 'スプリンクラー+', text: '作物と木をすべて1段育てる（成木なら実が1つなる）。守り7', effects: [{ op: 'grow', amount: 1 }, { op: 'block', amount: 7 }] }
  },
  frostFan: {
    name: '防霜ファン', type: 'machine', cost: 2, rarity: 'uncommon', pool: ['citrus'], art: 'fan',
    text: '守り10。次のターン始めにも守り5',
    effects: [{ op: 'block', amount: 10 }, { op: 'status', id: 'dawnBlock', amount: 5 }],
    upgrade: { name: '防霜ファン+', text: '守り13。次のターン始めにも守り7', effects: [{ op: 'block', amount: 13 }, { op: 'status', id: 'dawnBlock', amount: 7 }] }
  },
  monorail: {
    name: '園内モノレール', type: 'machine', cost: 2, rarity: 'uncommon', pool: ['citrus'], art: 'mikanbox',
    text: '収穫できるものをすべて収穫し、2枚引く',
    needs: 'ripeCrop',
    effects: [{ op: 'harvest' }, { op: 'draw', amount: 2 }],
    upgrade: { name: '園内モノレール+', cost: 1 }
  },
  marmalade: {
    name: 'マーマレード', type: 'skill', cost: 1, rarity: 'uncommon', pool: ['citrus'], art: 'jar',
    text: '健康度+6。廃棄',
    exhaust: true,
    effects: [{ op: 'heal', amount: 6 }],
    upgrade: { name: 'マーマレード+', text: '健康度+9。廃棄', effects: [{ op: 'heal', amount: 9 }] }
  },
  thinning: {
    name: '摘果', type: 'growth', cost: 1, rarity: 'uncommon', pool: ['citrus'], art: 'shears',
    text: '次に実を収穫するとき、実1つごとの効果が2倍',
    needs: 'tree',
    effects: [{ op: 'status', id: 'bigFruit', amount: 1 }],
    upgrade: { name: '摘果+', cost: 0 }
  },
  grassCover: {
    name: '草生栽培', type: 'power', cost: 1, rarity: 'uncommon', pool: ['citrus'], art: 'spinach',
    text: 'この戦闘の間、毎ターン始めに守り2＋木1本につき守り2',
    effects: [{ op: 'status', id: 'cover', amount: 1 }],
    upgrade: { name: '草生栽培+', cost: 0 }
  },
  grafting: {
    name: '接ぎ木', type: 'growth', cost: 2, rarity: 'rare', pool: ['citrus'], art: 'sapling',
    text: '木をすべてすぐに成木にし、実を1つずつならせる',
    needs: 'tree',
    effects: [{ op: 'matureTrees' }],
    upgrade: { name: '接ぎ木+', cost: 1 }
  },
  treeRipening: {
    name: '樹上完熟', type: 'power', cost: 2, rarity: 'rare', pool: ['citrus'], art: 'mikantree',
    text: 'この戦闘の間、実1つごとの銭+3、守り+2',
    effects: [{ op: 'status', id: 'ripening', amount: 1 }],
    upgrade: { name: '樹上完熟+', cost: 1 }
  },
  drone: {
    name: 'ドローン防除', type: 'machine', cost: 2, rarity: 'rare', pool: ['citrus', 'vegetable'], art: 'sprayer',
    text: '敵すべての勢いに7。このターン、作物と実を奪われない',
    effects: [{ op: 'damageAll', amount: 7 }, { op: 'status', id: 'netted', amount: 1 }],
    upgrade: { name: 'ドローン防除+', text: '敵すべての勢いに10。このターン、作物と実を奪われない', effects: [{ op: 'damageAll', amount: 10 }, { op: 'status', id: 'netted', amount: 1 }] }
  }
};

/* ════════ 敵が混ぜてくる、役に立たないカード（報酬には出ない）════════ */
FR.Cards.lesion = {
  name: '病斑', type: 'status', cost: 0, rarity: 'status', pool: [], art: 'blast',
  text: '使えない。この戦闘の間だけ山札に混ざる',
  unplayable: true,
  effects: []
};

FR.Cards.mikanMorning = {
  name: 'みかん山の朝', type: 'growth', cost: 0, rarity: 'uncommon', pool: ['citrus'], art: 'mikantree',
  text: '成木1本につきエネルギー+1。廃棄',
  needs: 'tree', exhaust: true,
  effects: [{ op: 'energyPerTree', per: 1 }],
  upgrade: { name: 'みかん山の朝+', text: '成木1本につきエネルギー+1。（廃棄しない）', exhaust: false }
};

// 種類の表示名
FR.CardTypes = {
  attack: '攻撃', skill: '守り', crop: '作物', growth: '成長', livestock: '畜産', machine: '機械', power: '常時', status: '病'
};
