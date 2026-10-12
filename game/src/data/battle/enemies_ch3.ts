// 第3章の敵（海ぞいの町）：ネフダマヨイ、中ボス オカワリナベ・ナリオサメ。
// 数値・AI は 61_ch3_battle.md 9.1・10・11、文は 60_ch3_story.md 6.1・6.6・6.7（60 が正。
// 60 に表のない ツッコミ台詞・付箋・帯の文は 61 の仮の文）。独自のしくみ（値段が 決まらない、
// ふた、巻きもどし、錠、最終局面）は src/battle/ch3rules.ts、技は src/battle/enemy_ch3.ts。
//
// ツガオの黒い判「まだ」が どの敵にも 押されている（絵：src/art/enemies/c3_*.ts）。
// 町の敵は 真上からの 正午の 日ざしと、下からの 海の 照り返しで 描く（61 9.0）。

import type { AiCtx, EnemyDef } from './types';

const NO_WEAK = { da: 1, han: 1, wara: 1 };

/** ネフダマヨイ (61 9.1・60 6.1): 市場の 手書きの 値札が 3枚、人の形に くっついた。 */
const nefuda: EnemyDef = {
  id: 'enemy_nefuda', name: 'ネフダマヨイ', lvl: 8, size: [40, 48], core: [20, 24], face: [20, 10], chapter: 3,
  hp: 160, atk: 22, def: 16, spd: 12, luck: 7, exp: 34, money: 50, attr: NO_WEAK, drops: [],
  bg: 'bg_c3_ichiba', bgm: 'bgm_battle', tsukkomiCount: 2, startStatus: ['status_c3_mayoi'],
  // 1 は しゅんの 書き文字（グソっ君の 代わりの ツッコミなら「いくらやねん！」。61 9.1 の 仮）
  tsukkomi: ['いくらなの！', 'はりかえるな！'],
  skills: ['skill_nefuda_hyaku', 'skill_nefuda_harikae', 'skill_nefuda_makari', 'skill_idle'],
  colors: ['#D8B878', '#A88848', '#F2D8A0', '#E8D8B0', '#2A2440'],
  ai: (c: AiCtx) => {
    // the first move is always the stammer (the tsukkomi decides it: 61 9.1)
    if (c.acts === 0 && c.has('status_c3_mayoi')) return 'skill_nefuda_hyaku';
    if (c.has('status_c3_mayoi')) {
      const hy = c.defStage >= 2 ? 0 : 1;
      return c.pick([['skill_nefuda_hyaku', 35 * hy], ['skill_nefuda_harikae', 35], ['skill_nefuda_makari', 20], ['skill_idle', 10]]);
    }
    return c.pick([['skill_nefuda_harikae', 55], ['skill_nefuda_makari', 30], ['skill_idle', 15]]);
  },
  texts: {
    appear: ['ネフダマヨイが あらわれた！\n『ひゃく……』の まま だ！'],
    yousu: ['ネフダマヨイは 自分の 値段を\n読もうと している。', 'ネフダマヨイの 札が 1枚、\nぱたんと 裏がえった。'],
    yousuSpecial: { decided: 'ネフダマヨイの 札に、\n『100円』と 書いてある。' },
    tele: {
      skill_nefuda_hyaku: ['ネフダマヨイは\n「ひゃく……ひゃく……」'],
      skill_nefuda_harikae: ['ネフダマヨイは 値札を\nはりかえてきた！'],
      skill_nefuda_makari: ['ネフダマヨイは 「まかり……」と\n言いかけて 止まった！'],
    },
    extra: {
      hyakuResult: ['値段が 決まらない！\nネフダマヨイの まもりが 上がった！'],
      decided: ['値段が 決まった！\nネフダマヨイは ほっと している。'],
      decidedMima: ['札の 字が、ちゃんと 見えた。\n値段が 決まった！'],
      makariResult: ['みんなの すばやさが 下がった！'],
      // 61 24 #16: the money's own line (60 に 1件 足す お願い)
      money: ['値札の 裏に、はって あった。'],
    },
    idle: [['ネフダマヨイは 割り箸の 足で\nふらついている。'], ['ネフダマヨイは 札を 1枚ずつ\n数えなおしている。']],
    defeat: ['ネフダマヨイは 札に もどった。', '『100円』。{w=300}\n……やっと、言えた らしい。'],
  },
  book: { short: '市場の 値札', shotai: '朝の セリの、最後の 1箱の 値札。黒い 判は 札の 裏。', weak: '値段を 決めて あげる。ツッコミ。', hitokoto: '言い終わりたい。' },
};

/** オカワリナベ (61 10・60 6.6): 食堂かもめの アルミの 寸胴鍋。中ボス1（S08）。 */
const okawari: EnemyDef = {
  id: 'enemy_okawarinabe', name: 'オカワリナベ', lvl: 8, size: [64, 56], core: [32, 32], face: [32, 22], chapter: 3,
  footY: 140, hp: 280, atk: 23, def: 16, spd: 7, luck: 8, exp: 80, money: 0, attr: NO_WEAK, drops: [], noFlee: true,
  bg: 'bg_c3_shokudo', bgm: 'bgm_midboss', tsukkomiCount: 2, startStatus: ['status_c3_futa'],
  tsukkomi: ['もう 食べられない！', '前が 見えない！'],
  skills: ['skill_okawari_okawari', 'skill_okawari_yuge', 'skill_okawari_futa', 'skill_idle'],
  colors: ['#C8CDD4', '#8E95A6', '#F4F6F8', '#8A5A2A', '#C8884A'],
  ai: (c: AiCtx) => {
    // the first move: the lid that won't close (61 10.5: the tsukkomi closes it)
    if (c.acts === 0) return 'skill_okawari_futa';
    // おかわり never goes to one already at −2 (all at −2: steam instead)
    const oka = c.targets.some((t) => t.spd > -2) ? 1 : 0;
    if (c.has('status_c3_futa')) return c.pick([['skill_okawari_okawari', 35 * oka], ['skill_okawari_yuge', 35], ['skill_okawari_futa', 20], ['skill_idle', 10]]);
    return c.pick([['skill_okawari_okawari', 40 * oka], ['skill_okawari_yuge', 40], ['skill_okawari_futa', 15], ['skill_idle', 5]]);
  },
  texts: {
    appear: ['オカワリナベが ぐらぐら 煮えている！\nふたが 閉まらない！'],
    yousu: ['オカワリナベから、\nいい においの 湯気。', 'オカワリナベの お玉が、\n次の 皿を さがしている。'],
    yousuSpecial: {
      closed: 'オカワリナベの ふたは、\nちゃんと 閉まっている。',
      ready: '中身が 半分に なった。\nいまなら『はなまる』が 押せる！',
    },
    tele: {
      skill_okawari_okawari: ['オカワリナベは $targetの 皿に\nおかわりを よそった！'],
      skill_okawari_yuge: ['オカワリナベの 湯気が\nもうもうと ひろがった！'],
      skill_okawari_futa: ['オカワリナベの ふたが、\nガタガタ 鳴った！ 閉まらない！'],
    },
    extra: {
      okawariResult: ['$targetは おなかが いっぱいだ！\nすばやさが 下がった！'],
      okawariGuard: ['$targetは おかわりを 食べきった！\nおなか いっぱいは 防いだ。'],
      // グソっ君の 決まった 台詞（knSay。図鑑に 入れない）と、ふたが 閉まる
      futaLine: ['おかわりは、ちゃんと\n食べ終わってから 言うもんや！'],
      futaClosed: ['カタン。\nオカワリナベの ふたが 閉まった！'],
      futaShort: ['カタン。'],
      futaOpen: ['ふたが 開いた！\nオカワリナベの まもりが 上がった！'],
      futaStill: ['ふたが 閉まらない！\nオカワリナベの まもりが 上がった！'],
      // 61 24 #19: three rounds after it closed
      futaReopen: ['ふたが また 浮いてきた！'],
      // ラウンドの 終わり：おかわりが 湧く（中身 +20）
      wake: ['鍋の 底から、おかわりが 湧いた！'],
      settle: ['オカワリナベの 湯気が、\nゆっくり おさまった。'],
      hanamaru: ['しゅんは 鍋に はなまるを 押した！'],
      potSlip: ['ふたが 開いていて、\nはなまるが すべった！'],
    },
    idle: [['オカワリナベは 火加減を\n見ている。'], ['オカワリナベの お玉が、\n鍋の ふちを カンと たたいた。']],
    defeat: ['オカワリナベの 湯気が、\nゆっくり おさまった。'],
    // 61 24 #18
    noFlee: ['台所の 出口に、ゴロウが\nすわりこんで いる。'],
  },
  book: { short: '食堂の 大鍋', shotai: '食堂かもめの 寸胴鍋。40年、毎日 煮つけを 作った。', weak: 'ちゃんと 食べ終わる こと。', hitokoto: 'ごちそうさまを、聞きたい。' },
};

/** ナリオサメ (61 11・60 6.7): サイレン塔の 引退する モーターサイレン。中ボス2（S12）。 */
const nariosame: EnemyDef = {
  id: 'enemy_nariosame', name: 'ナリオサメ', lvl: 9, size: [96, 96], core: [48, 52], face: [48, 48], chapter: 3,
  footY: 150, hp: 520, atk: 25, def: 17, spd: 9, luck: 9, exp: 120, money: 0, attr: NO_WEAK, drops: [], noFlee: true, noCrit: true, restActions: 0,
  decalAt: [48, 40],
  bg: 'bg_c3_siren', bgm: 'bgm_boss_nariosame', tsukkomiCount: 3, startStatus: ['status_c3_makimodoshi'],
  tsukkomi: ['風、強すぎ！', '呼ぶなら 鳴って！', 'こらえるな！'],
  skills: ['skill_nari_kaze', 'skill_nari_yobu', 'skill_nari_mada', 'skill_nari_shougo', 'skill_idle'],
  colors: ['#8EA69A', '#5A6B62', '#C8D8CC', '#E8ECF0', '#A86A3A'],
  ai: (c: AiCtx) => {
    // 第2段階 (61 11.5): the move that says so comes first
    if ((c.shared.nariPhase ?? 1) >= 2) {
      if (!c.mem.madaShown) {
        c.mem.madaShown = 1;
        return 'skill_nari_mada';
      }
      const mada = c.defStage >= 2 ? 0 : 1;
      return c.pick([['skill_nari_kaze', 35], ['skill_nari_yobu', 30], ['skill_nari_mada', 20 * mada], ['skill_idle', 15]]);
    }
    if (c.acts === 0) return 'skill_nari_kaze';
    return c.pick([['skill_nari_kaze', 40], ['skill_nari_yobu', 35], ['skill_idle', 25]]);
  },
  texts: {
    appear: ['ナリオサメが うなりはじめた！\n……でも、最初の 音で 止まった！'],
    yousu: ['ナリオサメの 口から、\n止まった 音が たれている。', 'ナリオサメは 町を 見下ろしている。\n40年、毎日 見てきた 町だ。'],
    yousuSpecial: {
      // 61 24 #21: the round its noon sound rings
      shougo: 'ナリオサメの 羽根が、\nゆっくり 回りはじめた……。',
      after: 'ナリオサメの 止まった 音が、\nゆっくり 先へ 流れている。',
    },
    tele: {
      skill_nari_kaze: ['ナリオサメの 羽根が 回った！\n強い 風！'],
      skill_nari_yobu: ['ナリオサメは 町じゅうを\n呼ぼうと した！'],
      // 61 24 #14
      skill_nari_mada: ['ナリオサメは 羽根を 止めて、\n音を こらえた！'],
      skill_nari_shougo: ['ナリオサメは 正午の 最初の 音を\nもう 一度 鳴らした！'],
    },
    extra: {
      yobuResult: ['……でも、だれも 来ない。\n音が 最初で 止まって いるから。'],
      madaResult: ['ナリオサメの まもりが 上がった！'],
      shougoResult: ['時間が 巻きもどった！\nさっきの ターンが なかった ことに！'],
      // 戦闘の 吹き出し（@ナリオサメ。カタカナ。60 6.7）
      voiceOpen: ['……マダ、鳴リ終ワリタク ナイ。'],
      voiceRewind: ['……正午ハ、ゴハンノ 合図 ダッタ。'],
      voicePhase2: ['鳴リ終ワッタラ、モウ ダレモ 呼ベナイ。'],
      // ミナト（npc_c3_sirenban）の ヒント（60〔いただきますの前〕）
      hint: ['……あの 音は、ごはんの 合図\nだったんじゃ。'],
      // テル（npc_c3_toudai）が 第2段階で
      teru: ['押しなさい。{w=300}……わたしの 灯台は、\n毎晩 ちゃんと 消して きたよ。'],
      itadakiAfter: ['町じゅうで、手を 合わせる 音が\nした。{w=300}正午の 音が、先へ 進む！'],
      lockHold: ['ナリオサメは 最初の 音で\n止まったままだ。'],
      // 最終局面（61 11.8。台詞は 60 10.12）
      finalMinato: ['……そうか。{w=300}正午は、\nごはんの 合図 だったな。'],
      finalPrompt: ['――しゅんは『いただきます』を 押す。'],
      finalRing: ['サイレンが 鳴る。{w=300}\n最初の 音から、長く、長く。'],
      clock: ['町の 時計が、12時1分に なった。'],
      noYarinaoshi: ['時間を もどす もの どうし。\n……やりなおしは 効かない。'],
    },
    idle: [['ナリオサメは、ボタンの ほうを\nじっと 見ている。'], ['ナリオサメの 傘から、\nさびが ひとつ 落ちた。']],
    defeat: [],
    // 61 24 #18
    noFlee: ['塔の 階段を、テルが\nゆっくり 上ってくる。'],
  },
  book: { short: 'サイレン', shotai: 'サイレン塔の サイレン。40年、毎日 正午を 知らせた。', weak: '最後まで 聞いて もらう こと。', hitokoto: '明日から、チャイムが 鳴る。' },
};

/** ホシスギ (61 9.2・60 6.2): 干物屋の 干し台の、干しすぎた アジの 開き。任意。 */
const hoshisugi: EnemyDef = {
  id: 'enemy_hoshisugi', name: 'ホシスギ', lvl: 8, size: [48, 36], core: [24, 20], face: [24, 10], chapter: 3,
  hp: 150, atk: 21, def: 17, spd: 8, luck: 6, exp: 32, money: 0, attr: { da: 0.7, han: 1, wara: 1 }, drops: [],
  bg: 'bg_c3_himono', bgm: 'bgm_battle', tsukkomiCount: 2,
  tsukkomi: ['干しすぎ！', 'しょっぱい！'],
  skills: ['skill_hoshi_hinata', 'skill_hoshi_shio', 'skill_hoshi_sori', 'skill_idle'],
  colors: ['#C8884A', '#8A5A2A', '#F2C88A', '#F4F1E8', '#E8D8B8'],
  ai: (c: AiCtx) => {
    if (c.acts === 0) return 'skill_hoshi_hinata';
    // 水に もどされて 2ターンは しっとり（日なたぼっこを しない）
    const wet = (c.mem.wetUntil ?? -1) >= c.round ? 0 : 1;
    const hin = c.defStage >= 2 ? 0 : wet;
    return c.pick([['skill_hoshi_hinata', 30 * hin], ['skill_hoshi_shio', 30], ['skill_hoshi_sori', 30], ['skill_idle', 10]]);
  },
  texts: {
    appear: ['ホシスギが ぺらりと\n立ちあがった！'],
    yousu: ['ホシスギは 日なたの ほうへ\nじりじり 動いている。', 'ホシスギの ひれが、\nパリッと 鳴った。'],
    tele: {
      skill_hoshi_hinata: ['ホシスギは 日なたぼっこを\nはじめた！ {w=300}……まだ 干せる。'],
      skill_hoshi_shio: ['ホシスギから 塩が\nとんできた！'],
      skill_hoshi_sori: ['ホシスギは そりかえって\nはねた！'],
    },
    extra: {
      appearMulti: ['ホシスギたちが ぺらりと\n立ちあがった！'],
      hinataResult: ['ホシスギの まもりが 上がった！'],
      shioResult: ['塩が 目に 入った！\nみんなの 命中が 下がった！'],
      // やりなおしで 水に もどす（61 9.2）
      modosu: ['ホシスギを 水に もどした！\nしっとりして、まもりが もとに もどった。'],
    },
    idle: [['ホシスギは 板の ふりを している。']],
    defeat: ['ホシスギは 干し台に もどった。', '……ちょうど ええ 干し加減に\nなった らしい。'],
  },
  book: { short: 'アジの 開き', shotai: '干物屋の 干し台の アジ。正午の 日に 当たりすぎた。', weak: '水に もどす。やりなおし。', hitokoto: '干したりない？ 干しすぎ？' },
};

/** アソビタリン (61 9.3・60 6.3): 海の家の、赤と白の しまの 浮き輪。今年 最後の 1つ。任意。 */
const asobitarin: EnemyDef = {
  id: 'enemy_asobitarin', name: 'アソビタリン', lvl: 8, size: [44, 44], core: [22, 22], face: [22, 12], chapter: 3,
  hp: 170, atk: 21, def: 14, spd: 9, luck: 8, exp: 34, money: 0, attr: { da: 1, han: 1, wara: 1.3 }, drops: [],
  bg: 'bg_c3_kaisui', bgm: 'bgm_battle', tsukkomiCount: 2,
  tsukkomi: ['もう 上がりなさい！', '自分で 入れるな！'],
  skills: ['skill_asobi_kuuki', 'skill_asobi_wa', 'skill_asobi_mada', 'skill_idle'],
  colors: ['#E23B2E', '#F4F1E8', '#8FD3E8', '#E8D8B0', '#FFFFFF'],
  ai: (c: AiCtx) => {
    if (c.acts === 0) return 'skill_asobi_mada';
    if (c.hpRate >= 0.85) return c.pick([['skill_asobi_wa', 45], ['skill_asobi_mada', 40], ['skill_idle', 15]]);
    const air = (c.mem.air ?? 0) < 3 ? 1 : 0;
    return c.pick([['skill_asobi_kuuki', 35 * air], ['skill_asobi_wa', 30], ['skill_asobi_mada', 25], ['skill_idle', 10]]);
  },
  texts: {
    appear: ['アソビタリンが ころがってきた！\n「まだ 遊ぶ！」'],
    yousu: ['アソビタリンは 少し しぼんでいる。\n本人は 気づいて いない。', 'アソビタリンは 砂の 上で\nぷかぷか している。'],
    // 61 24 #17
    yousuSpecial: { full: 'アソビタリンは、もう 空気が\n入らない くらい ぱんぱんだ。' },
    tele: {
      skill_asobi_kuuki: ['アソビタリンは 自分で\n空気を 入れた！ {w=300}……ふう。'],
      skill_asobi_wa: ['アソビタリンは $targetに\nすっぽり はまった！'],
      skill_asobi_mada: ['アソビタリンは「まだ 遊ぶ！」と\nはねまわった！'],
    },
    extra: {
      // 60 6.3: グソっ君の まるくなる の 特例（1戦1回）
      kane: ['……浮き輪には かなわんわ。'],
    },
    idle: [['アソビタリンは 浮かぶ 練習を\nしている。 {w=300}陸で。']],
    defeat: ['アソビタリンは 空気が 抜けて、\nぺたんと たたまれた。', '来年の 夏まで、\nひと休み らしい。'],
  },
  book: { short: '浮き輪', shotai: '海の家の 浮き輪。今年 最後の 日の、最後の 1つ。', weak: 'たたんで あげる。', hitokoto: '来年も、ふくらませて。' },
};

/** ヨコドリ (61 9.4・60 6.4): 防波堤の トンビ。ずっと 同じ おにぎりを ねらっている。任意。 */
const yokodori: EnemyDef = {
  id: 'enemy_yokodori', name: 'ヨコドリ', lvl: 8, size: [56, 36], core: [28, 20], face: [32, 10], chapter: 3,
  hp: 130, atk: 22, def: 13, spd: 18, luck: 9, exp: 32, money: 0, attr: NO_WEAK, drops: [{ item: 'item_c3_onigiri', rate: 1 }],
  bg: 'bg_c3_bouhatei', bgm: 'bgm_battle', tsukkomiCount: 2,
  tsukkomi: ['上から 来るな！', '見るな、おにぎりを！'],
  skills: ['skill_yoko_nerai', 'skill_yoko_dori', 'skill_yoko_pihyoro', 'skill_idle'],
  colors: ['#8A5A3A', '#5A3A2A', '#B88A5A', '#E8E0D0', '#E8C878'],
  ai: (c: AiCtx) => {
    if (c.has('status_tame')) return 'skill_yoko_dori';
    if (c.mimasareta) return c.pick([['skill_yoko_pihyoro', 50], ['skill_idle', 50]]);
    if (c.acts === 0) return 'skill_yoko_nerai';
    return c.pick([['skill_yoko_nerai', 45], ['skill_yoko_pihyoro', 35], ['skill_idle', 20]]);
  },
  texts: {
    appear: ['ヨコドリが 空から\nおにぎりを ねらっている！'],
    yousu: ['ヨコドリは ずっと 同じ\nおにぎりを ねらっている。', 'ヨコドリの 影が、\n防波堤の 上で 輪を かいている。'],
    yousuSpecial: { tame: 'ヨコドリは $targetの\nもちものを 見ている……。' },
    tele: {
      skill_yoko_nerai: ['ヨコドリは $targetの\nもちものを じっと 見た！'],
      skill_yoko_dori: ['ヨコドリが 急降下！'],
      skill_yoko_pihyoro: ['ピーヒョロロ……\nみんな 空を 見上げて しまった！'],
    },
    extra: {
      miss: ['……$itemを つかみそこねた！'],
      pihyoroResult: ['みんなの すばやさが 下がった！'],
      mimashitaAfter: ['ヨコドリは 見られて、\nねらうのを やめた。'],
      // 61 19.1（24 #30）
      drop: ['ヨコドリが、おにぎりを\n落としていった。'],
    },
    idle: [['ヨコドリは 風に 乗っている。\n……ただ 乗っている。']],
    defeat: ['ヨコドリは 高く 舞いあがった。', '正午の 空で、ぐるっと\n1回 まわって いった。'],
  },
  book: { short: 'トンビ', shotai: '防波堤の トンビ。お昼の 時間が 終わらないので、ずっと お昼。', weak: '見られると、照れる。', hitokoto: 'おにぎり、ひとくち だけ。' },
};

export const CH3_ENEMIES: EnemyDef[] = [nefuda, okawari, nariosame, hoshisugi, asobitarin, yokodori];

/** 第3章の 中ボス（ナリオサメ・オカワリナベ）：ラスボスの しくみ（白い フェードで エンディング）は 通さない。 */
export const CH3_MIDBOSS = new Set(['enemy_okawarinabe', 'enemy_nariosame']);
