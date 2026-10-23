'use strict';
/* =========================================================
   敵の一覧（10体）
   - kind：pest 害獣・害虫 / weed 雑草 / disease 病害・疫病 / weather 天候
   - hp：勢い（敵の体力）の範囲 [最小, 最大]。hpGrowth：戦闘を重ねるごとに増える量
   - turns：天候だけ。このターン数を耐えきると過ぎ去る（勢いを0にしても勝ち）
   - size：絵の大きさ（1 がふつう）
   - moves：行動。intent の種類
       attack  … 健康度に damage（hits 回）
       steal   … いちばん育った野菜か、木の実を1つ奪う（なければ・覆いがあれば damage）
       trample … いちばん育った作物か木を踏み荒らして消す（なければ・覆いがあれば damage）
       blight  … 作物と木をすべて amount 段しおれさせる（成木は実が落ちる）。damage があれば攻撃も
       debuff  … 農家に状態（status）を amount つける。damage があれば攻撃も
       addCard … 役に立たないカード（card）を count 枚、捨て札に混ぜる。damage があれば攻撃も
       infect  … 家畜1頭を病気で失わせる（防疫があれば防げる）。家畜がいなければ damage
       heal    … 自分の勢いを amount 回復
       buff    … 自分の力（攻撃の上乗せ）を strength 増やす
   - pattern：行動の順番（くり返す）。randomStart なら何番目から始めるかを乱数で決める
   ========================================================= */
FR.Enemies = {
  // ── 害獣 ──
  crowSmall: {
    name: 'はぐれ鴉', kind: 'pest', art: 'crow', size: 0.72,
    hp: [10, 13], hpGrowth: 3,
    moves: {
      peck:  { name: 'ついばむ', intent: 'attack', damage: 4 },
      steal: { name: '作物を狙う', intent: 'steal', damage: 2 }
    },
    pattern: ['peck', 'steal', 'peck'], randomStart: true
  },
  crow: {
    name: '群れ鴉', kind: 'pest', art: 'crow', size: 1,
    hp: [18, 22], hpGrowth: 5,
    moves: {
      peck:  { name: 'ついばむ', intent: 'attack', damage: 6 },
      steal: { name: '作物を狙う', intent: 'steal', damage: 3 },
      caw:   { name: '仲間を呼ぶ', intent: 'buff', strength: 2 }
    },
    pattern: ['peck', 'steal', 'peck', 'caw']
  },
  boar: {
    name: '山の大猪', kind: 'pest', art: 'boar', size: 1.25,
    hp: [40, 46], hpGrowth: 7,
    moves: {
      snort:   { name: '鼻を鳴らす', intent: 'buff', strength: 2 },
      rush:    { name: '突進', intent: 'attack', damage: 12 },
      trample: { name: '畑を荒らす', intent: 'trample', damage: 6 }
    },
    pattern: ['snort', 'rush', 'trample']
  },
  // ── 害虫・雑草 ──
  aphids: {
    name: 'アブラムシの群れ', kind: 'pest', art: 'aphids', size: 0.8,
    hp: [9, 12], hpGrowth: 2,
    moves: {
      suck:     { name: '汁を吸う', intent: 'blight', amount: 1, damage: 2 },
      swarm:    { name: 'たかる', intent: 'attack', damage: 3 },
      multiply: { name: '殖える', intent: 'heal', amount: 4 }
    },
    pattern: ['swarm', 'suck', 'multiply'], randomStart: true
  },
  weeds: {
    name: 'はびこる雑草', kind: 'weed', art: 'weeds', size: 1,
    hp: [26, 30], hpGrowth: 4,
    moves: {
      spread: { name: '根を広げる', intent: 'heal', amount: 6 },
      shade:  { name: '日を遮る', intent: 'debuff', status: 'dry', amount: 1, damage: 4 },
      choke:  { name: '絡みつく', intent: 'debuff', status: 'weak', amount: 2, damage: 5 }
    },
    pattern: ['shade', 'choke', 'spread']
  },
  // ── 病害・疫病 ──
  blast: {
    name: 'いもち病', kind: 'disease', art: 'blast', size: 1,
    hp: [30, 34], hpGrowth: 5,
    moves: {
      spores: { name: '胞子を飛ばす', intent: 'addCard', card: 'lesion', count: 2 },
      rot:    { name: '病斑が広がる', intent: 'blight', amount: 1, damage: 6 },
      fever:  { name: '蔓延', intent: 'attack', damage: 9 }
    },
    pattern: ['spores', 'rot', 'fever']
  },
  avianFlu: {
    name: '鳥インフル', kind: 'disease', art: 'avianflu', size: 1,
    hp: [32, 36], hpGrowth: 5,
    moves: {
      infect: { name: '感染', intent: 'infect', damage: 8 },
      spread: { name: '広がる', intent: 'addCard', card: 'lesion', count: 1, damage: 5 },
      cough:  { name: '瘴気', intent: 'debuff', status: 'fragile', amount: 2, damage: 4 }
    },
    pattern: ['cough', 'infect', 'spread']
  },
  // ── 天候（ターン数を耐えきると過ぎ去る）──
  frost: {
    name: '遅霜', kind: 'weather', art: 'frost', size: 1,
    hp: [36, 40], hpGrowth: 5, turns: 4,
    moves: {
      frostbite: { name: '霜が降りる', intent: 'blight', amount: 1, damage: 5 },
      chill:     { name: '冷え込み', intent: 'debuff', status: 'weak', amount: 2, damage: 6 }
    },
    pattern: ['chill', 'frostbite']
  },
  drought: {
    name: '干ばつ', kind: 'weather', art: 'drought', size: 1.1,
    hp: [44, 50], hpGrowth: 6, turns: 5,
    moves: {
      scorch: { name: '照りつける', intent: 'attack', damage: 8 },
      parch:  { name: '干上がる', intent: 'debuff', status: 'dry', amount: 2, damage: 3 },
      wither: { name: '立ち枯れ', intent: 'blight', amount: 1, damage: 4 }
    },
    pattern: ['parch', 'scorch', 'wither', 'scorch']
  },
  typhoon: {
    name: '大型台風', kind: 'weather', art: 'typhoon', size: 1.3,
    hp: [60, 66], hpGrowth: 7, turns: 5,
    moves: {
      gust:  { name: '強風', intent: 'attack', damage: 10 },
      storm: { name: '暴風雨', intent: 'trample', damage: 8 },
      surge: { name: '勢力を増す', intent: 'buff', strength: 3 }
    },
    pattern: ['gust', 'storm', 'surge', 'gust', 'storm']
  }
};
