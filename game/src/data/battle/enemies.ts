// Enemy definitions: stats, AI, texts (20_systems_battle.md 11–13, 10_narrative.md 9.4–9.7).

import type { AiCtx, EnemyDef } from './types';

const NO_WEAK = { da: 1, han: 1, wara: 1 };

const hato: EnemyDef = {
  id: 'enemy_hato_kakaricho', name: 'ハト係長', lvl: 1, size: [40, 40], core: [20, 22], face: [13, 10],
  hp: 26, atk: 8, def: 3, spd: 9, luck: 3, exp: 12, money: 10, attr: NO_WEAK, drops: [], noFlee: true,
  bg: 'bg_residential', bgm: 'bgm_battle', tsukkomiCount: 2,
  tsukkomi: ['鳥が 名刺 持つな！', '会議 長いわ！'],
  skills: ['skill_hato_meishi', 'skill_hato_kaigi', 'skill_hato_teiji', 'skill_idle'],
  colors: ['#8E95A6', '#4FA37A', '#8A5FB0', '#2F4A8A', '#F4F1E8'],
  ai: (c: AiCtx) => {
    if (c.round <= 1) return 'skill_hato_meishi';
    if (c.hpRate <= 0.3 && !c.mem.teiji) {
      c.mem.teiji = 1;
      return 'skill_hato_teiji';
    }
    return c.pick([['skill_hato_meishi', 55], ['skill_hato_kaigi', 35], ['skill_idle', 10]]);
  },
  texts: {
    appear: ['ハト係長が 名刺を さしだして\n道を ふさいだ！'],
    yousu: [
      'ハト係長は 足首の 腕時計を\n気にしている。',
      'ハト係長は『本件、持ち帰ります』と\n言いたげだ。',
      'ハト係長の 首が、\n緑と 紫に 光っている。',
    ],
    yousuSpecial: { lowHp: 'ハト係長は 定時が 気に なっている。' },
    tele: {
      skill_hato_meishi: ['ハト係長は 名刺を\n両手で さしだした！'],
      skill_hato_kaigi: ['ハト係長は 首を 前後に ふりながら\n会議を はじめた！'],
      skill_hato_teiji: ['ハト係長は 時計を 見た。'],
    },
    extra: {
      kaigiResult: ['$targetの 命中が 下がった！'],
      kaigiGuard: ['会議は 5分で 終わった。'],
      teijiResult: ['……17:00の ままだ。\nハト係長は 帰れなかった。'],
    },
    idle: [['ハト係長は 地面を つついた。\n……パンくずは なかった。'], ['ハト係長は 手帳に『要検討』と\n書いた。']],
    // 〔撃破〕 (10_narrative): the restored pigeon stays on screen (and in the
    // field) pecking beside its card, so the second line says what is seen
    defeat: ['ハト係長は 自分が ハトだったことを\n思いだした。', '足もとに 名刺が 1枚 残った。'],
    noFlee: ['ハト係長は 名刺を 持って\n回りこんだ！'],
  },
  book: { short: 'ハト', shotai: '駅前で 名刺を 拾った、ただの ハト。', weak: '定時。HPが へると 帰りたがる。', hitokoto: '名刺の 裏に『帰りたい』。' },
};

const semi: EnemyDef = {
  id: 'enemy_semi_final', name: 'セミファイナル', lvl: 2, size: [72, 48], core: [36, 26], face: [14, 22],
  hp: 34, atk: 10, def: 6, spd: 6, luck: 4, exp: 14, money: 8, attr: { da: 1.3, han: 1, wara: 1 },
  drops: [{ item: 'item_ramune', rate: 0.25 }], bg: 'bg_residential', bgm: 'bgm_battle', tsukkomiCount: 3,
  tsukkomi: ['生きてるんかい！', '最終回 何回 やるんだ！', '死んだふり 下手か！'],
  skills: ['skill_semi_shindafuri', 'skill_semi_final', 'skill_semi_miin', 'skill_idle'],
  colors: ['#C9A36A', '#5A3A22', '#7A5A3A', '#A8834A', '#2A1A12'],
  ai: (c: AiCtx) => {
    if (!c.mimasareta && c.round >= 1 && c.round % 2 === 1) return 'skill_semi_shindafuri';
    if (c.mimasareta) return c.pick([['skill_semi_final', 65], ['skill_semi_miin', 25], ['skill_idle', 10]]);
    return c.pick([['skill_semi_final', 60], ['skill_semi_miin', 30], ['skill_idle', 10]]);
  },
  texts: {
    appear: ['セミファイナルが あおむけで\n道に 落ちている！'],
    yousu: [
      'セミファイナルは 腹を 見せて\n転がっている。',
      'セミファイナルの 足が 1本だけ\nぴくっと した。',
      'セミファイナルは 夏の 終わりを\n背負っている。',
    ],
    yousuSpecial: { shindafuri: '……たぶん 死んでいる。' },
    tele: {
      skill_semi_shindafuri: ['セミファイナルは ぴくりとも 動かない。'],
      skill_semi_final: ['セミが…… 動いた！'],
      skill_semi_miin: ['セミファイナルは 人生最後の\n一声を しぼりだした！'],
    },
    extra: {
      shindafuriHit: ['……たぶん 死んでいる。'],
      mimashitaAfter: ['セミファイナルは 見られていて、\n死んだふりが できない！'],
      finalResult: ['ジジジジジッ！'],
      miinResult: ['ミーーーン……（最終回）'],
    },
    idle: [['セミファイナルは 羽を たたんで\n反省している。'], ['セミファイナルは 空を 見ている。\n飛び方を 思いだそうと している。']],
    defeat: ['セミファイナルは 静かに\n飛んでいった。', '夏が 少し 終わった。'],
  },
  book: { short: 'セミ', shotai: '木から 落ちた、夏の 最後の セミ。', weak: '虫とりアミ（たたく）。それと、見られること。', hitokoto: '最終回は、毎日 来る。' },
};

const cone: EnemyDef = {
  id: 'enemy_cone_vocal', name: 'コーン・ボーカル', lvl: 2, size: [40, 56], core: [20, 30], face: [20, 20],
  hp: 22, atk: 9, def: 5, spd: 5, luck: 3, exp: 10, money: 6, attr: { da: 0.7, han: 1, wara: 1.3 },
  drops: [{ item: 'item_kinakobou', rate: 0.3 }], bg: 'bg_reverse_rain', bgm: 'bgm_battle', tsukkomiCount: 2,
  tsukkomi: ['工事 してないだろ！', '歌うな、誘導しろ！'],
  skills: ['skill_cone_nessho', 'skill_cone_tsukodome', 'skill_cone_konkon', 'skill_idle'],
  colors: ['#F07A2A', '#F4F1E8', '#FFD23F', '#3A3A44', '#C85A1A'],
  ai: (c: AiCtx) => {
    const canCall = c.sameCount < 3 && (c.shared.coneCalls ?? 0) < 2 && c.shared.coneCallRound !== c.round;
    let r: string;
    if (!canCall) r = c.pick([['skill_cone_nessho', 50], ['skill_cone_tsukodome', 40], ['skill_idle', 10]]);
    else if (c.sameCount <= 1) r = c.pick([['skill_cone_nessho', 30], ['skill_cone_tsukodome', 25], ['skill_cone_konkon', 35], ['skill_idle', 10]]);
    else r = c.pick([['skill_cone_nessho', 40], ['skill_cone_tsukodome', 30], ['skill_cone_konkon', 20], ['skill_idle', 10]]);
    if (r === 'skill_cone_konkon') c.shared.coneCallRound = c.round;
    return r;
  },
  texts: {
    appear: ['コーン・ボーカルが\n路上ライブを はじめた！'],
    yousu: [
      'コーン・ボーカルは 回転灯を\n光らせて ノっている。',
      'コーン・ボーカルは マイク（自分）の\nテストを している。',
      'コーン・ボーカルは 誘導する ふりを\nした。だれも いない。',
    ],
    tele: {
      skill_cone_nessho: ['コーン・ボーカルは 自分を メガホンだと\n思いこんで 歌いだした！'],
      skill_cone_tsukodome: ['コーン・ボーカルは\n『この先 通行止め』を 宣言した！'],
      skill_cone_konkon: ['コーン・ボーカルは 仲間を 呼んだ。\nコーン、コーン。'],
    },
    extra: {
      appearMulti: ['コーン・ボーカルたちが\n路上ライブを はじめた！'],
      nesshoResult: ['コ〜ン、コ〜ン、コ〜〜ン！'],
      tsukodomeGuard: ['$targetは 迂回した！'],
      konkonOk: ['コーン・ボーカルが 1本 増えた！'],
      konkonFail: ['……だれも 来なかった。\n工事の 予定は ない。'],
    },
    idle: [['コーン・ボーカルは 自分が コーンだと\n一瞬 思いだした。'], ['コーン・ボーカルは『迂回』の\n発音を 練習している。']],
    defeat: ['コーン・ボーカルは 転がって\n言った。', '『……迂回して ください』'],
  },
  book: { short: 'カラーコーン', shotai: '路地の 工事に 置かれて、そのまま 忘れられた コーン。', weak: '笑い（歌手なので）。ゴムの 体に たたくは 効きにくい。', hitokoto: '工事は、去年 終わっていた。' },
};

const kasa: EnemyDef = {
  id: 'enemy_wasuregasa', name: 'ワスレガサ', lvl: 2, size: [48, 72], core: [24, 34], face: [24, 10],
  hp: 38, atk: 10, def: 8, spd: 7, luck: 5, exp: 16, money: 0, attr: { da: 1, han: 0.7, wara: 1 },
  drops: [], bg: 'bg_reverse_rain', bgm: 'bgm_battle', tsukkomiCount: 2,
  tsukkomi: ['晴れてるって！', 'おれは 持ち主じゃない！'],
  skills: ['skill_kasa_dakitsuki', 'skill_kasa_hiraku', 'skill_kasa_shizuku', 'skill_idle'],
  colors: ['#CFE3EA', '#9AA3AD', '#3A2B24', '#F4F1E8', '#E23B2E'],
  ai: (c: AiCtx) => {
    const opened = c.has('status_hiraki');
    const grab = c.targets.length > 0 && c.targets.every((t) => t.grabbed) ? 0 : 1;
    if (opened) return c.pick([['skill_kasa_dakitsuki', 40 * grab], ['skill_kasa_shizuku', 50], ['skill_idle', 10]]);
    return c.pick([['skill_kasa_dakitsuki', 30 * grab], ['skill_kasa_hiraku', 25], ['skill_kasa_shizuku', 35], ['skill_idle', 10]]);
  },
  texts: {
    appear: ['ワスレガサが 持ち主を さがして\n跳ねてきた！'],
    yousu: [
      'ワスレガサは 名前シールを 見せてくる。\n『？』と 書いてある。',
      'ワスレガサは 晴れた 空を 見て、\nとまどっている。',
      'ワスレガサの 骨が 1本、きしんだ。',
    ],
    tele: {
      skill_kasa_dakitsuki: ['ワスレガサは 持ち主と まちがえて\n抱きついてきた！'],
      skill_kasa_hiraku: ['ワスレガサは ばさっと 開いた。\n晴れているのに。'],
      skill_kasa_shizuku: ['ワスレガサから\nぽたぽた しずくが 落ちた！'],
    },
    extra: {
      dakitsukiGuard: ['$targetは するりと ぬけた！'],
      release: ['ワスレガサは 人ちがいに 気づいて、\n気まずそうだ。'],
    },
    idle: [['ワスレガサは 自分で 閉じようとして、\n閉じられなかった。'], ['ワスレガサは 傘立てを さがしている。']],
    defeat: ['ワスレガサは 少しだけ\n軽く なった。'],
  },
  book: { short: 'ビニール傘', shotai: '店の 傘立てに 3年、置かれていた ビニール傘。', weak: 'ビニールが インクを はじく。たたくか タックルで。', hitokoto: '名前を、書いて もらえなかった。' },
};

const ojigi: EnemyDef = {
  id: 'enemy_ojigi_jihanki', name: 'おじぎ自販機', lvl: 3, size: [64, 88], core: [32, 44], face: [32, 14],
  hp: 120, atk: 13, def: 8, spd: 4, luck: 6, exp: 35, money: 120, attr: { da: 0.7, han: 1.3, wara: 1 },
  drops: [{ item: 'item_oden_can', rate: 1 }], noFlee: true, bg: 'bg_ojigi', bgm: 'bgm_midboss', tsukkomiCount: 3,
  tsukkomi: ['押してない！', '真夏に あったか〜い！', 'おつり 多すぎ！'],
  skills: ['skill_ojigi_otsuri', 'skill_ojigi_charge', 'skill_ojigi_press', 'skill_ojigi_roulette', 'skill_ojigi_arigatou', 'skill_idle'],
  colors: ['#C8313A', '#E84E3C', '#F4F1E8', '#7CFF9A', '#C08040'],
  ai: (c: AiCtx) => {
    if (c.round === 1) return 'skill_ojigi_otsuri';
    if (c.round === 2 && !c.mem.charged) {
      c.mem.charged = 1;
      c.mem.chargeRound = c.round;
      return 'skill_ojigi_charge';
    }
    if (c.has('status_tame')) {
      c.mem.pressRound = c.round;
      return 'skill_ojigi_press';
    }
    const chargeOk = c.round - (c.mem.pressRound ?? -99) > 2 && c.round - (c.mem.chargeRound ?? -99) > 1 ? 1 : 0;
    const ariOk = c.atkStage >= 2 ? 0 : 1;
    const r =
      c.hpRate > 0.5
        ? c.pick([['skill_ojigi_otsuri', 35], ['skill_ojigi_roulette', 20], ['skill_ojigi_arigatou', 15 * ariOk], ['skill_ojigi_charge', 25 * chargeOk], ['skill_idle', 5]])
        : c.pick([['skill_ojigi_otsuri', 30], ['skill_ojigi_roulette', 15], ['skill_ojigi_arigatou', 15 * ariOk], ['skill_ojigi_charge', 35 * chargeOk], ['skill_idle', 5]]);
    if (r === 'skill_ojigi_charge') c.mem.chargeRound = c.round;
    return r;
  },
  texts: {
    appear: ['おじぎ自販機が 深々と おじぎして\n待ちかまえている！'],
    yousu: [
      'おじぎ自販機の LEDは『17:00』。',
      'おじぎ自販機は コードを 引きずって\n身じろぎした。',
      'おじぎ自販機の 中で、\n缶が ころんと 鳴った。',
      '『あったか〜い』が 光っている。\n8月なのに。',
    ],
    yousuSpecial: { tame: 'おじぎ自販機は 深く 頭を\n下げたまま 動かない……。' },
    tele: {
      skill_ojigi_charge: ['おじぎ自販機は 深々と\nおじぎを はじめた……！'],
      skill_ojigi_press: ['おじぎ自販機は そのまま\n倒れこんできた！'],
      skill_ojigi_otsuri: ['おじぎ自販機は\nおつりを 出しすぎた！'],
      skill_ojigi_roulette: ['ピピピピ……'],
      skill_ojigi_arigatou: ['『アリガトウ ゴザイマシタ』'],
    },
    extra: {
      cancel: ['おじぎ自販機は 気まずそうに\n立ちなおった。'],
      otsuriResult: ['10円玉が 転がっていった。'],
      atari: ['7・7・7・7。\nアタリ！ もう1回 行動する！'],
      hazure: ['7・7・7・6。\n……ハズレ。'],
      otsuri: ['おつりだ。'],
    },
    idle: [['おじぎ自販機は\n『ただいま 準備中』を 表示した。'], ['おじぎ自販機は 取り出し口から\nため息を ついた。']],
    defeat: ['おじぎ自販機は まっすぐ 立った。', '『ありがとう』。\n1回だけ 言った。'],
    noFlee: ['おじぎ自販機が 深々と\n道を ふさいでいる。'],
  },
  book: { short: '自販機', shotai: '銀座の 角で 30年、だれかを 待っていた 自販機。', weak: 'ペケ（『売り切れ』の ×）。溜めが 見えたら、まもって ツッコめ。', hitokoto: '最後に 押されたのは、去年の 夏。' },
};

const souji: EnemyDef = {
  id: 'enemy_soujirou', name: 'ソウジロウ', lvl: 3, size: [48, 24], core: [24, 12], face: [24, 9],
  hp: 40, atk: 12, def: 9, spd: 10, luck: 4, exp: 18, money: 12, attr: { da: 1, han: 1, wara: 1.3 },
  drops: [{ item: 'item_stamp_pad', rate: 0.4 }], bg: 'bg_mall_floor', bgm: 'bgm_battle', tsukkomiCount: 2,
  tsukkomi: ['そこ 段差！', 'HPを 吸うな！'],
  skills: ['skill_souji_teinei', 'skill_souji_dansa', 'skill_souji_juden', 'skill_idle'],
  colors: ['#C8CDD4', '#9AA0A8', '#5CE1FF', '#3A3F48', '#F4F1E8'],
  ai: (c: AiCtx) =>
    c.hpRate > 0.4
      ? c.pick([['skill_souji_teinei', 40], ['skill_souji_dansa', 30], ['skill_souji_juden', 20], ['skill_idle', 10]])
      : c.pick([['skill_souji_teinei', 35], ['skill_souji_dansa', 25], ['skill_souji_juden', 30], ['skill_idle', 10]]),
  texts: {
    appear: ['ソウジロウが 足もとに\nぶつかってきた！'],
    yousu: [
      'ソウジロウの 青い 目が\n点滅している。',
      'ソウジロウの ゴミ箱の 中で、\n片方の くつ下が 回っている。',
      'ソウジロウは『お掃除を 開始します』\nと 言いかけて やめた。',
    ],
    tele: {
      skill_souji_teinei: ['ソウジロウは 足もとを\nていねいに 掃除しはじめた。'],
      skill_souji_dansa: ['ソウジロウは 段差に いどんだ！'],
      skill_souji_juden: ['ソウジロウは 充電台を\nさがしている……。'],
    },
    extra: {
      teineiResult: ['$targetの HPを 吸いとった！'],
      dansaFail: ['……段差に 乗りあげて\n空回りした！'],
      judenResult: ['ホームベースが 見つからない。'],
    },
    idle: [['ソウジロウは 壁に ぶつかって、\n向きを 変えた。'], ['ソウジロウは 同じ ところを\n3回 掃除した。']],
    defeat: ['ソウジロウは 充電台を 見つけた。', '『……ただいま』'],
  },
  book: { short: 'ロボット掃除機', shotai: 'フードコートを 毎晩 掃除していた ロボット掃除機。', weak: '笑い（ツッコミどころが 多い）。段差で 自分から 転ぶ。', hitokoto: '帰る 場所を、さがしている。' },
};

const momi: EnemyDef = {
  id: 'enemy_momisugi', name: 'モミスギ', lvl: 3, size: [72, 72], core: [36, 36], face: [36, 12],
  hp: 70, atk: 14, def: 10, spd: 3, luck: 5, exp: 24, money: 20, attr: { da: 0.7, han: 1.3, wara: 1 },
  drops: [{ item: 'item_shippu', rate: 1 }], bg: 'bg_mall_floor', bgm: 'bgm_battle', tsukkomiCount: 2,
  tsukkomi: ['頼んでない！', 'もう 十分！'],
  skills: ['skill_momi_momi', 'skill_momi_kyou', 'skill_momi_otameshi', 'skill_idle'],
  colors: ['#5A2E2A', '#8A4A3E', '#D9C8B0', '#C0C6CC', '#F6D98A'],
  ai: (c: AiCtx) =>
    c.hpRate >= 0.7
      ? c.pick([['skill_momi_momi', 45], ['skill_momi_kyou', 45], ['skill_idle', 10]])
      : c.pick([['skill_momi_momi', 35], ['skill_momi_kyou', 30], ['skill_momi_otameshi', 25], ['skill_idle', 10]]),
  texts: {
    appear: ['モミスギが リモコンの コードで\n手招きしている！'],
    yousu: [
      'モミスギは『お試し 無料』の 札を\nちらつかせている。',
      'モミスギの 中で、もみ玉が\nぐりぐり 動いた。',
      'モミスギは ひじかけを ぽんぽん\nたたいた。『どうぞ』。',
    ],
    tele: {
      skill_momi_momi: ['モミスギは やさしく つかんで\nもみはじめた。'],
      skill_momi_kyou: ['モミスギの リモコンが\n『強』に なった！'],
      skill_momi_otameshi: ['モミスギは お試しモードに 入った。'],
    },
    extra: {
      momiHeal: ['$targetの HPが 回復した。'],
      momiOver: ['効いてる……\n効きすぎてる！'],
      momiSleep: ['$targetは 気持ちよくて\nねむってしまった……。'],
      otameshiResult: ['モミスギは 自分を もんで\n回復した。'],
    },
    idle: [['モミスギは リクライニングを\n最大まで 倒した。', '……起きられなく なった。'], ['モミスギは『肩』と『腰』を\n押しまちがえた。']],
    defeat: ['モミスギは 言った。', '『お試しは ここまでです』'],
  },
  book: { short: 'マッサージチェア', shotai: '健康器具コーナーで 1年、お試しの 客を 待っていた チェア。', weak: 'クッションで たたくは 効きにくい。くっきりの ペケで 押しきれ。', hitokoto: '最後の 客は、居眠りして 帰った。' },
};

const kanenari: EnemyDef = {
  id: 'enemy_kanenari', name: 'カネナリくん', lvl: 2, size: [48, 64], core: [24, 30], face: [24, 18],
  hp: 999, atk: 7, def: 10, spd: 4, luck: 3, exp: 8, money: 0, attr: { da: 0, han: 0, wara: 0 },
  drops: [], noFlee: true, invulnerable: true, bg: 'bg_kanenari', bgm: 'bgm_battle', tsukkomiCount: 0, tsukkomi: [],
  skills: ['skill_kn_fuusen', 'skill_kn_goaisatsu', 'skill_kn_pose'],
  colors: ['#D9A441', '#F2894B', '#F4F1E8', '#E84E3C'],
  ai: (c: AiCtx) => c.pick([['skill_kn_fuusen', 40], ['skill_kn_goaisatsu', 30], ['skill_kn_pose', 30]]),
  texts: {
    appear: ['カネナリくんが PRを はじめた！'],
    yousu: [
      'カネナリくんは ミナトに\n手を ふっている。',
      'カネナリくんは だれも いない\nほうにも 手を ふっている。',
      'カネナリくんの フリップ：\n『夕鳴町へ ようこそ！』',
    ],
    yousuSpecial: {
      round3: 'カネナリくんは、なにかを\n待っている ように 見える。',
      round4: 'カネナリくんの フリップ：\n『（……だれか、見てますか）』',
      // [events, QA round 2] the stronger hint from round 6 (texts.ts)
      round6: 'ミナトは ふと 思った。\n（……見て ほしい のかな）',
    },
    tele: {
      skill_kn_fuusen: ['カネナリくんは ふうせんを くれた。'],
      skill_kn_goaisatsu: ['カネナリくんは 深々と おじぎした。'],
      skill_kn_pose: ['カネナリくんは PRポーズを きめた。'],
    },
    extra: {
      fuusenResult: ['ミナトの HPが 回復した。'],
      goaisatsuResult: ['ミナトも つられて おじぎした。\nちからが 下がった。'],
      poseResult: ['……なにも 起きない。'],
      fanService: ['カネナリくんは 攻撃を\nファンサービスだと 受け取った。'],
      mimashita: ['ミナトは『みました』の\nハンコを 押した！', 'カネナリくんは 1年ぶりに\n見て もらえた。'],
      lowInk: ['朱肉は かすれていたが、\nちゃんと 押せた。'],
    },
    idle: [['カネナリくんは 手を ふった。']],
    defeat: [],
    noFlee: ['カネナリくんが ついてくる。\nPRは 終わらない。'],
  },
  book: { short: 'カネナリくん', shotai: '夕鳴町の PR大使。', weak: '―', hitokoto: '―' },
};

const boss: EnemyDef = {
  id: 'boss_omukaemachi', name: 'オムカエマチ', lvl: 4, size: [160, 128], core: [80, 64], face: [80, 40], footY: 153,
  // QA round 3 (tempo): 380 took a careful player 12 rounds (≈3 min). At 270
  // a player who answers the boke and breaks the lit parts wins in 5–7
  // rounds, one who only attacks and guards in 7–9 (bossbot runs).
  hp: 270, atk: 15, def: 9, spd: 6, luck: 8, exp: 60, money: 0, attr: NO_WEAK, drops: [], noFlee: true, noCrit: true,
  bg: 'bg_boss', bgm: 'bgm_boss', tsukkomiCount: 3, boss: true,
  tsukkomi: ['片方ずつ かよ！', 'そこで 止めるな！', 'つられるな！'],
  skills: [
    'skill_omu_tebukuro', 'skill_omu_madakonai', 'skill_omu_oshirase', 'skill_omu_chime', 'skill_omu_suitou',
    'skill_omu_kaerinokai', 'skill_omu_uwabaki', 'skill_omu_kasa', 'skill_omu_yoiko',
  ],
  colors: ['#3A2B5C', '#F5D33B', '#E84E3C', '#7FD1E8', '#4AA8E0', '#F4F1E8', '#F6D98A'],
  // Boss AI lives in src/battle/boss.ts (needs parts, phases and the chime counter).
  ai: () => 'skill_omu_tebukuro',
  texts: {
    appear: ['オムカエマチが 体育座りで\nこっちを 見ている。'],
    yousu: [
      'オムカエマチは ひざを かかえている。',
      '迷子札の 目が、ドアの ほうを\n見ている。',
      'オムカエマチの 体から、\nリコーダーの 音が 1つ もれた。',
    ],
    yousuSpecial: {
      chime3: 'つぎで、4つ目の 音だ。',
      p2a: '時計の 針が、逆に 走っている。',
      p2b: 'オムカエマチの 輪郭が\nゆらいでいる。',
      p2c: 'オムカエマチは ドアを 見て、\nすぐ 目を そらした。',
    },
    tele: {
      skill_omu_tebukuro: ['オムカエマチは 片方だけの\n手袋で たたいた！'],
      skill_omu_madakonai: ['オムカエマチは 傘を かさねて\n待っている……。'],
      skill_omu_oshirase: ['ピンポンパンポーン。'],
      skill_omu_chime: ['きーん……'],
      skill_omu_kaerinokai: ['通学帽が『かえりの会』を\nはじめた！'],
      skill_omu_uwabaki: ['上履きが 飛んできた！'],
      skill_omu_suitou: ['水筒が 自分で ふたを 開けた。'],
      skill_omu_kasa: ['傘が ばさっと 開いた。'],
      skill_omu_yoiko: ['オムカエマチは 放送した。\n『よいこは おうちへ かえりましょう』'],
    },
    extra: {
      opening: ['「……だれ？ おむかえ？」'],
      madakonaiResult: ['オムカエマチの まもりが\nぐーんと 上がった！'],
      oshirase_boss_omukaemachi_cap: ['『黄色い 帽子の 子』……'],
      oshirase_boss_omukaemachi_bottle: ['『青い 水筒の 子』……'],
      oshirase_boss_omukaemachi_shoe: ['『上履きが 片方の 子』……'],
      oshirase_boss_omukaemachi_umbrella: ['『透明な 傘の 子』……'],
      oshiraseCommon: ['$partが 光っている！'],
      suitouResult: ['オムカエマチの HPが 回復した！'],
      kaerinokaiResult: ['『きょうの 反省……』'],
      kasaResult: ['オムカエマチの まもりが 上がった！'],
      breakFirst: ['ミナトは $partに\n『みました』を 押した！'],
      break_boss_omukaemachi_cap: ['通学帽の うらに 小さく『1ねん』。\n名前は ない。でも、ちゃんと 見た。'],
      break_boss_omukaemachi_bottle: ['水筒の 名前は にじんで 読めない。\nでも、ちゃんと 見た。'],
      break_boss_omukaemachi_shoe: ['上履きの かかとに、名前の 跡。\n消えかけて いても、ちゃんと 見た。'],
      break_boss_omukaemachi_umbrella: ['傘の 柄に『？』の シール。\n……でも、ちゃんと 見た。'],
      breakLast: ['$partは、静かに なった。'],
      bodyMimashita: ['オムカエマチは 見られて、\n少し うつむいた。'],
      chime: ['きーん……'],
      chime4: ['4つ目の 音が、鳴りひびいた！'],
      chimeAfter: ['チャイムは、また 最初に もどった。'],
      yoikoFail: ['カネナリくんは つられて\n帰っていった……。'],
      yoikoBack: ['カネナリくんは 帰る 家が\nなかったので、すぐ 戻ってきた。'],
      yoikoGuard: ['カネナリくんは 帰りかけて、\nふみとどまった！'],
      phase2: ['「チャイムが 鳴ったら、\nみんな 帰っちゃう。」', '「……ぼくたちの ほかは、\nみんな。」'],
      final1: ['オムカエマチは 手を 止めた。'],
      final2: ['「ぼくたちは、だれも\n迎えに 来ない。」', '「だから、鳴らさない。」'],
      final3: ['カネナリくんが 前に 出た。', 'カネナリくんは 鐘を 鳴らした。'],
      final4: ['…………鳴った。'],
      final5: ['ハンコケースが 光った。', '『おかえりなさい』が\n浮かびあがった。'],
      finalPrompt: ['――『おかえりなさい』を 押す。'],
      finalStamp: ['ミナトは『おかえりなさい』の\nハンコを 押した。'],
      finalTadaima: ['「…………」', '「……ただいま。」'],
      finalLeave: ['忘れ物たちが、ひとつずつ 光に\nなって、町の ほうへ 帰っていく。', '通学帽は 最後に、\n写真館の ほうへ 飛んでいった。'],
    },
    idle: [['オムカエマチは ひざを かかえた。']],
    defeat: [],
    noFlee: ['迷子センターの ドアは、\n内側から 開かない。'],
  },
  book: { short: '忘れ物', shotai: '迎えに 来て もらえなかった、忘れ物たちの 待ちくたびれた 気持ち。', weak: '光った 部位。名前を、見て あげること。', hitokoto: 'ずっと、名前を 呼ばれるのを 待っていた。' },
};

const list = [hato, semi, cone, kasa, ojigi, souji, momi, kanenari, boss];
const table = new Map<string, EnemyDef>();
for (const e of list) table.set(e.id, e);

export function getEnemy(id: string): EnemyDef | undefined {
  return table.get(id);
}

export function allEnemies(): EnemyDef[] {
  return [...list];
}

/** Boss part definitions (13.2). Hit boxes relative to the sprite's top-left. */
export interface BossPartDef {
  id: string;
  name: string;
  box: [number, number, number, number];
  action: string;
}

export const BOSS_PARTS: BossPartDef[] = [
  { id: 'boss_omukaemachi_bottle', name: '水筒', box: [116, 58, 20, 40], action: 'skill_omu_suitou' },
  { id: 'boss_omukaemachi_cap', name: '通学帽', box: [48, 4, 64, 24], action: 'skill_omu_kaerinokai' },
  { id: 'boss_omukaemachi_shoe', name: '上履き', box: [60, 100, 36, 20], action: 'skill_omu_uwabaki' },
  { id: 'boss_omukaemachi_umbrella', name: '傘', box: [4, 36, 40, 70], action: 'skill_omu_kasa' },
];
