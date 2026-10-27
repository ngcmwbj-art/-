'use strict';
/* =========================================================
   レリック（常時効果）＝ 固有スキル・その伸ばし方・農具
   - hooks：発動するタイミングごとに effects を並べる
     battleStart 戦闘開始（1ターン目の始め、ターン開始のあと） / turnStart 毎ターン開始（1ターン目も） /
     harvest 作物を1つ収穫するたび / pick 実を1つ摘むたび / ship 家畜を1頭出荷するたび
   - rarity
     basic：農家の固有スキル（最初から持っている）
     skill：固有スキルの伸ばし方。skillOf の固有スキルを持つ農家が、季節のボスに勝つたびに2つから1つ選ぶ
     tool ：農具。★3の強い敵やボスに勝つと3つから1つもらえる。pool で出る農家タイプを決める（common は全員）
   - rewardGold：戦闘に勝ったときの銭が増える（hooks ではなく報酬で足す）
   ========================================================= */
FR.Relics = {
  // ── 固有スキル ──
  basket: {
    name: '使い込んだ竹かご', art: 'basket', rarity: 'basic',
    text: '作物を1つ収穫するたび、守り3',
    hooks: { harvest: [{ op: 'block', amount: 3 }] }
  },
  cowbell: {
    name: '古いカウベル', art: 'cowbell', rarity: 'basic',
    text: '家畜を1頭出荷するたび、守り6',
    hooks: { ship: [{ op: 'block', amount: 6 }] }
  },
  stoneWall: {
    name: '先祖代々の石垣', art: 'stonewall', rarity: 'basic',
    text: '戦闘開始時、守り6',
    hooks: { battleStart: [{ op: 'block', amount: 6 }] }
  },

  // ── 固有スキルの伸ばし方（野菜：竹かご） ──
  basketBig: {
    name: '大きな竹かご', art: 'basket', rarity: 'skill', skillOf: 'basket',
    text: '作物を1つ収穫するたび、さらに守り3・銭1',
    hooks: { harvest: [{ op: 'block', amount: 3 }, { op: 'gold', amount: 1 }] }
  },
  basketMorning: {
    name: '朝どりの段取り', art: 'sunrise', rarity: 'skill', skillOf: 'basket',
    text: '戦闘開始時、1枚多く引く',
    hooks: { battleStart: [{ op: 'draw', amount: 1 }] }
  },
  basketSoil: {
    name: '土づくり', art: 'compost', rarity: 'skill', skillOf: 'basket',
    text: '戦闘開始時、地力+1（作物がよく育つ）',
    hooks: { battleStart: [{ op: 'status', id: 'soil', amount: 1 }] }
  },
  basketStrike: {
    name: '収穫の手応え', art: 'weeding', rarity: 'skill', skillOf: 'basket',
    text: '作物を1つ収穫するたび、敵1体に勢い4',
    hooks: { harvest: [{ op: 'damage', amount: 4 }] }
  },

  // ── 固有スキルの伸ばし方（畜産：カウベル） ──
  cowbellLoud: {
    name: 'よく鳴るカウベル', art: 'cowbell', rarity: 'skill', skillOf: 'cowbell',
    text: '家畜を1頭出荷するたび、さらに守り3・健康度+2',
    hooks: { ship: [{ op: 'block', amount: 3 }, { op: 'heal', amount: 2 }] }
  },
  cowbellCalf: {
    name: '牛の買い付け', art: 'feed', rarity: 'skill', skillOf: 'cowbell',
    text: '戦闘開始時、空いた畜舎に牛を1頭入れる',
    hooks: { battleStart: [{ op: 'addAnimal', animal: 'calf' }] }
  },
  cowbellBarn: {
    name: '堆肥小屋', art: 'compost', rarity: 'skill', skillOf: 'cowbell',
    text: '毎ターン始め、家畜1頭につき守り1',
    hooks: { turnStart: [{ op: 'blockPerAnimal', per: 1 }] }
  },
  cowbellGuard: {
    name: '防疫の心得', art: 'vaccine', rarity: 'skill', skillOf: 'cowbell',
    text: '戦闘開始時、守り3。家畜が病気にかからない',
    hooks: { battleStart: [{ op: 'block', amount: 3 }, { op: 'status', id: 'immune', amount: 1 }] }
  },

  // ── 固有スキルの伸ばし方（柑橘：石垣） ──
  wallHigh: {
    name: '積み増した石垣', art: 'stonewall', rarity: 'skill', skillOf: 'stoneWall',
    text: '戦闘開始時、さらに守り3',
    hooks: { battleStart: [{ op: 'block', amount: 3 }] }
  },
  wallGold: {
    name: '家族の直売所', art: 'mikanbox', rarity: 'skill', skillOf: 'stoneWall',
    text: '実を1つ摘むたび、銭1',
    hooks: { pick: [{ op: 'gold', amount: 1 }] }
  },
  wallRest: {
    name: '縁側のひと休み', art: 'sunrise', rarity: 'skill', skillOf: 'stoneWall',
    text: '戦闘開始時、健康度+3',
    hooks: { battleStart: [{ op: 'heal', amount: 3 }] }
  },
  wallPlan: {
    name: '剪定の段取り', art: 'shears', rarity: 'skill', skillOf: 'stoneWall',
    text: '戦闘開始時、1枚多く引く',
    hooks: { battleStart: [{ op: 'draw', amount: 1 }] }
  },

  // ── 農具（★3の敵・ボスに勝つともらえる） ──
  oldTruck: {
    name: '古い軽トラ', art: 'truck', rarity: 'tool', pool: ['common'],
    text: '毎ターン始め、銭1',
    hooks: { turnStart: [{ op: 'gold', amount: 1 }] }
  },
  strawHat: {
    name: '麦わら帽子', art: 'hay', rarity: 'tool', pool: ['common'],
    text: '戦闘開始時、健康度+3',
    hooks: { battleStart: [{ op: 'heal', amount: 3 }] }
  },
  thermos: {
    name: '魔法瓶のお茶', art: 'water', rarity: 'tool', pool: ['common'],
    text: '戦闘開始時、エネルギー+1',
    hooks: { battleStart: [{ op: 'energy', amount: 1 }] }
  },
  workGloves: {
    name: '野良仕事の手袋', art: 'seeds', rarity: 'tool', pool: ['common'],
    text: '戦闘開始時、1枚多く引く',
    hooks: { battleStart: [{ op: 'draw', amount: 1 }] }
  },
  shibaDog: {
    name: '番犬の柴', art: 'dog', rarity: 'tool', pool: ['common'],
    text: '毎ターン始め、守り2',
    hooks: { turnStart: [{ op: 'block', amount: 2 }] }
  },
  oldHoe: {
    name: '祖父の鍬', art: 'weeding', rarity: 'tool', pool: ['common'],
    text: '戦闘開始時、すべての敵に勢い3',
    hooks: { battleStart: [{ op: 'damageAll', amount: 3 }] }
  },
  jaCard: {
    name: '農協の組合員証', art: 'coin', rarity: 'tool', pool: ['common'],
    text: '戦闘に勝つたび、銭+8',
    rewardGold: 8
  },
  harvestCrate: {
    name: '収穫コンテナ', art: 'mikanbox', rarity: 'tool', pool: ['vegetable'],
    text: '作物を1つ収穫するたび、1枚引く',
    hooks: { harvest: [{ op: 'draw', amount: 1 }] }
  },
  feedBag: {
    name: '予備の飼料袋', art: 'feed', rarity: 'tool', pool: ['livestock'],
    text: '家畜を1頭出荷するたび、1枚引く',
    hooks: { ship: [{ op: 'draw', amount: 1 }] }
  },
  pickShears: {
    name: '摘み取りばさみ', art: 'shears', rarity: 'tool', pool: ['citrus'],
    text: '実を1つ摘むたび、銭1',
    hooks: { pick: [{ op: 'gold', amount: 1 }] }
  }
};

// 固有スキルの伸ばし方・農具の選び方
FR.RelicPool = {
  // この農家が、まだ持っていない伸ばし方（季節のボスのあと2つ出す）
  skillUps(run) {
    const base = FR.Farmers[run.farmerId].relic;
    return Object.keys(FR.Relics).filter(id => FR.Relics[id].skillOf === base && !run.relics.includes(id));
  },
  // この農家に出る、まだ持っていない農具
  tools(run) {
    return Object.keys(FR.Relics).filter(id => {
      const r = FR.Relics[id];
      return r.rarity === 'tool' && !run.relics.includes(id) && (r.pool.includes('common') || r.pool.includes(run.farmerId));
    });
  },
  // 固有スキルの段階（1＝最初。伸ばすたびに +1）
  skillLevel(run) {
    const base = FR.Farmers[run.farmerId].relic;
    return 1 + run.relics.filter(id => FR.Relics[id].skillOf === base).length;
  }
};
