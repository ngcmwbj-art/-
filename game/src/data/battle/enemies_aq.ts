// 第3章 第3期の 敵（旧水族館。61 9.5・12・13、文は 60 6.5・6.8・6.9 が 正。60 に ない 文は 61 の 仮）：
//  ジュンロ        任意の 敵。順路の 矢印。「順路は こちら」で 次の ラウンドの 味方の 順が 逆に
//  ツガオ（初戦）  負け戦。何も 効かない。煽るだけ。4ラウンドで かならず 終わる（'lose'）
//  ヒロスケ        1段目。黒い「まだ」の ゲージ（錠 108）。鉄板の 熱で 手が ゆるむ。ごちそうさまで 決め手
//  ポコシャ        2段目。係長の 声（黒い 吹き出し）を 3つ ほどいて、名札に はなまる
// 独自の しくみは src/battle/boss_c3aq.ts。人が 相手の 3人は 図鑑・みました帳に 入れない（noBook）。

import type { AiCtx, EnemyDef } from './types';

const NO_WEAK = { da: 1, han: 1, wara: 1 };

/** ジュンロ (61 9.5・60 6.5): 旧水族館の 床の「順路」の 矢印の 札が、立ちあがった。 */
const junro: EnemyDef = {
  id: 'enemy_junro', name: 'ジュンロ', lvl: 9, size: [40, 48], core: [20, 24], face: [20, 22], chapter: 3,
  hp: 170, atk: 23, def: 16, spd: 12, luck: 7, exp: 40, money: 0, attr: { da: 1, han: 1.3, wara: 1 }, drops: [],
  bg: 'bg_c3_aq_kairo', bgm: 'bgm_battle', tsukkomiCount: 2,
  tsukkomi: ['どっちだよ！', 'さっきも 通った！'],
  skills: ['skill_junro_kochira', 'skill_junro_modoru', 'skill_idle'],
  colors: ['#E8ECF0', '#4AA8E0', '#2E7AB0', '#C8D0D8', '#2A2440'],
  ai: (c: AiCtx) => {
    if (c.acts === 0) return 'skill_junro_kochira';
    // ごちそうさま (61 6.2): 入口へ もどす を もう 使わない
    const mo = c.has('c3_gochisou') ? 0 : 1;
    const ko = c.lastSkill === 'skill_junro_kochira' ? 0 : 1;
    return c.pick([['skill_junro_kochira', 40 * ko], ['skill_junro_modoru', 45 * mo], ['skill_idle', 15]]);
  },
  texts: {
    appear: ['ジュンロが 床から 立ちあがった！\n「順路は、こちら」'],
    yousu: ['ジュンロの 矢印が、\n自分を 指している。', 'ジュンロの 矢印が、\nくるくる 回っている。'],
    tele: {
      skill_junro_kochira: ['ジュンロは「順路は こちら」と\nくるくる 回った！'],
      skill_junro_modoru: ['ジュンロは $targetを\n入口へ もどそうと した！'],
    },
    extra: {
      kochiraResult: ['順番が、さかさまに なった！'],
      modoruResult: ['$targetは 入口から\nやりなおしに なった！'],
      gochisouSeal: ['$enemyは、もう 入口へ\nもどさなく なった。'],
    },
    idle: [['ジュンロは 10年ぶりの お客に、\n少し 緊張している。']],
    defeat: ['ジュンロは 床に もどった。', '矢印は、まっすぐ\n奥を 指している。'],
  },
  book: { short: '順路の 矢印', shotai: '旧水族館の 床の 矢印。10年、だれも 歩かなかった。黒い 判は 札の 裏。', weak: 'ちゃんと 歩いて あげる。', hitokoto: '奥に、まだ いる。' },
};

/** ツガオ 初戦 (61 12・60 6.8): 長いすに すわった まま。何も 効かない。煽るだけ。 */
const tsugao1: EnemyDef = {
  id: 'boss_tsugao_1', name: 'ツガオ', lvl: 10, size: [56, 96], core: [28, 48], face: [28, 16], chapter: 3,
  footY: 144, hp: 999, atk: 1, def: 99, spd: 6, luck: 10, exp: 0, money: 0, attr: NO_WEAK, drops: [], noFlee: true, noCrit: true,
  restActions: 0, untouchable: true, noBook: true,
  bg: 'bg_c3_aq_hall', bgm: 'keep', tsukkomiCount: 0, tsukkomi: [],
  skills: ['skill_tsugao_aori'],
  colors: ['#2A2440', '#3A3F48', '#E8E4D8', '#D9A441'],
  ai: () => 'skill_tsugao_aori',
  texts: {
    appear: ['ツガオは 長いすに すわった まま だ。\n……仁義は 切らせて もらう。'],
    yousu: ['ツガオは 腕時計を 見た。\n12時で 止まっている。', 'ツガオは 目を 細めて、\nこちらを 見ている。'],
    tele: {},
    extra: {
      // グソっ君の 帯（knSay）：1ラウンド目の はじめ
      knAshi: ['……あかん。{w=300}\n足が、動かへん。'],
      hajiku: ['朱の インクが、黒い『まだ』に\nはじかれた！'],
      bikutomo: ['$actorの $move！\n……ツガオは びくとも しない。'],
      mimashita: ['ツガオは 目を 細めた。\n……見られるのは、なれとる。'],
      aori1: ['ツガオ「そがあな 手で、\nわしの 目が 覚めるかのう。」'],
      aori2: ['ツガオ「ハンコは、押したら\nそれきりじゃ。」'],
      aori3: ['ツガオ「……念のため、もう 1回。\nほれ、押して みい。」'],
      aori4: ['ツガオは 大きな あくびを した。'],
      end: ['ツガオ「……この程度じゃあ、\n寝てしまうわい。」'],
      ashi: ['グソっ君は 足が 動かない……。'],
    },
    idle: [['ツガオは 長いすに すわった まま だ。']],
    defeat: [],
    noFlee: ['ホールの 扉は、もう 閉まっている。'],
  },
  book: { short: 'ツガオ', shotai: 'ツガオ便の 親分。', weak: '', hitokoto: '' },
};

/** ヒロスケ (61 13.3・60 6.9): 1段目。焼き芋で みんなを 回復して しまう。攻撃しない。 */
const hirosuke: EnemyDef = {
  id: 'boss_hirosuke', name: 'ヒロスケ', lvl: 10, size: [48, 80], core: [24, 40], face: [24, 14], chapter: 3,
  footY: 140, hp: 360, atk: 20, def: 18, spd: 10, luck: 10, exp: 120, money: 0, attr: NO_WEAK, drops: [], noFlee: true, noCrit: true,
  restActions: 0, gauge: { kind: 'mada', lock: 108 }, noBook: true,
  bg: 'bg_c3_aq_rouka', bgm: 'bgm_boss_madamada', tsukkomiCount: 1,
  tsukkomi: ['段取り 組みなおすな！'],
  skills: ['skill_hiro_yakiimo', 'skill_hiro_dandori', 'skill_idle'],
  colors: ['#E8C8A8', '#2A2440', '#E8E0C8', '#6B7A4A', '#F4F1E8'],
  ai: (c: AiCtx) => {
    // こちらの だれかが 25% 以下：焼き芋を こちらにだけ（61 13.3「負けにくい」）
    if (c.targets.some((t) => t.hpRate <= 0.25)) return 'skill_hiro_yakiimo';
    if (c.acts === 0) return 'skill_hiro_yakiimo';
    return c.pick([['skill_hiro_yakiimo', 50], ['skill_hiro_dandori', 35], ['skill_idle', 15]]);
  },
  texts: {
    appear: ['ヒロスケが 前に 出た！\n「……親分は、40年 寝とらんのじゃ。」', 'ポコシャ「……起こさないで ください。\n……お願い、です。」'],
    yousu: ['ヒロスケの サングラスの 奥が、\n少し ゆれた。', 'ヒロスケの 前掛けから、\n焼き芋の 湯気。'],
    yousuSpecial: { seen: 'ヒロスケの 胸に、\n黒い『まだ』が 見えている。' },
    tele: {
      skill_hiro_dandori: ['ヒロスケは 段取りを\n組みなおした！'],
    },
    extra: {
      yakiimo: ['ヒロスケ「……焼き芋 食うか？」'],
      yakiimoResult: ['みんなの HPが 回復した！\n……ヒロスケも 回復した！'],
      yakiimoOurs: ['みんなの HPが 回復した！'],
      yakiimoKn: ['敵まで 回復 しとるやん！'],
      yakiimoSelfless: ['（ヒロスケは、自分の 分を\n出さなかった。）'],
      dandoriResult: ['次の 番は、ヒロスケたちが\n先に 動く！'],
      teppanAfter: ['鉄板の 熱で、ヒロスケの\n手が 少し ゆるんだ。'],
      madaSeen: ['ヒロスケの 胸の あたりに、\n黒い『まだ』が 見えた。', '……『まだ 置いていかれたくない』。'],
      gochisouSeal: ['ヒロスケは、自分の 焼き芋を\nそっと ひっこめた。'],
      gochisouPressed: ['しゅんは『ごちそうさま』を 押した！'],
      yakiLine: ['店は、閉めても\nまた 開けられる。', '……鉄板が\n冷めとらん うちはな。'],
      phase1End: ['ヒロスケの 手から、\n焼き芋が ころがった。'],
      hiroAfter: ['……マフィ屋の 鉄板も、\nまだ、物置に あるんじゃ。'],
      mimashita: ['ヒロスケの 前掛けの すみに、\n小さく『マフィ屋』。'],
      lockHold: ['ヒロスケは、ふんばっている。\n……まだ、ゆずらない。'],
    },
    idle: [['ヒロスケの サングラスの 奥が、\n少し ゆれた。']],
    defeat: [],
    noFlee: ['廊下の うしろは、倉庫だ。'],
  },
  book: { short: 'ヒロスケ', shotai: 'ツガオ便の ヒロスケ。', weak: '', hitokoto: '『マフィ屋』' },
};

/** ポコシャ (61 13.5・60 6.9): 1段目は うしろで 見回り。2段目は 係長の 声から 身を 守る。攻撃しない。 */
const pokosha: EnemyDef = {
  id: 'boss_pokosha', name: 'ポコシャ', lvl: 10, size: [56, 80], core: [28, 40], face: [28, 14], chapter: 3,
  footY: 126, hp: 999, atk: 24, def: 22, spd: 8, luck: 8, exp: 0, money: 0, attr: NO_WEAK, drops: [], noFlee: true, noCrit: true,
  restActions: 0, untouchable: true, noBook: true,
  bg: 'bg_c3_aq_rouka', bgm: 'bgm_boss_madamada', tsukkomiCount: 0, tsukkomi: [],
  skills: ['skill_pokosha_mimawari', 'skill_pokosha_mamoru', 'skill_c3_kakaricho'],
  colors: ['#F4F1E8', '#6B7A4A', '#8A8A5A', '#C8CDD4', '#E23B2E'],
  ai: () => 'skill_pokosha_mimawari',
  texts: {
    appear: [],
    yousu: ['ポコシャは 名札を、\n手で かくそうと している。'],
    tele: {},
    extra: {
      back: ['ポコシャは うしろで、\nじっと こちらを 見ている。'],
      mimawari1: ['ポコシャと ぴーちゃんが、\nこちらを じっと 見ている。'],
      mimawari2: ['ぴーちゃんが、こちらの 手を\nのぞきこんでいる！'],
      halfBlock: ['ポコシャが 前に 出て、\n半分を 受けとめた！'],
      appear2: ['ポコシャが 前に 出た。\nぴーちゃんが 肩で 羽を ふくらませた。'],
      nameMada: ['ポコシャの 胸の 古い 名札に、\n小さな 黒い『まだ』が 浮かんだ。'],
      koe1: ['『おまえの せいだ』'],
      koe2: ['『えさが 遅い』'],
      koe3: ['『声が 小さい』'],
      koeResult: ['ポコシャは 体を 小さく して、\n身を 守った。'],
      tsuk1: ['えさが 遅いんは、\nトラックが 遅れたからや！'],
      tsuk2: ['焦げは、鍋の せいじゃない。\n火を 強う した もんの せいじゃ。'],
      tsuk3: ['小さい 声でも、\nちゃんと 聞こえとるで！'],
      koeBreak: ['黒い 吹き出しが、\nぱらぱらと ほどけた。'],
      chijimu: ['ポコシャは 小さく なっている。\n……今は、声の ほうだ。'],
      prompt: ['――名札に、はなまるを。'],
      hanamaru: ['しゅんは、ポコシャの 名札に\n『はなまる』を 押した！'],
      // 決着（60 10.24。戦闘の 中は ここまで。「……親分は、一度も どならなかった。」から 先は E の フィールド）
      shout: ['……自分は、\n悪く ない！'],
      kokee: ['コケーーッ！'],
      kokeeNarr: ['めんどりの ぴーちゃんが、\nはじめて 大きな 声で 鳴いた。'],
      mimashita: ['名札に『飼育係 ポコシャ』。'],
      idle: ['ポコシャは 名札を、\n手で かくそうと している。'],
    },
    idle: [['ポコシャは 名札を、\n手で かくそうと している。']],
    defeat: [],
    noFlee: ['廊下の うしろは、倉庫だ。'],
  },
  book: { short: 'ポコシャ', shotai: 'ツガオ便の ポコシャ。', weak: '', hitokoto: '『飼育係 ポコシャ』の 名札' },
};

/**
 * ツガオ決戦 (61 14・60 6.10・10.27)：1段目は「まだ」の ゲージ 640（錠 320）。ハンコは 半分しか しみこまない
 * （こそげた 直後と、眠っている あいだは まるごと）。2段目は 攻撃しない。しゅんの「よぶ」で 来た人が 回覧板に
 * はなまるを 描き、10マス うまったら「みんなの はなまる」で 決着（'win'。黒い 判が 落ちる 所からは E の フィールド）。しくみは src/battle/boss_tsugao.ts。
 */
const tsugao: EnemyDef = {
  id: 'boss_tsugao', name: 'ツガオ', lvl: 10, size: [64, 112], core: [32, 56], face: [32, 18], chapter: 3,
  footY: 160, hp: 640, atk: 26, def: 20, spd: 11, luck: 10, exp: 0, money: 0, attr: NO_WEAK, drops: [], noFlee: true, noCrit: true,
  restActions: 0, gauge: { kind: 'mada', lock: 320 }, noBook: true,
  bg: 'bg_c3_aq_hall', bgm: 'bgm_boss_tsugao', tsukkomiCount: 3,
  tsukkomi: ['まだって 言うな！', '貯金 使うな！', '何年分だよ！'],
  skills: ['skill_tsugao_mada', 'skill_tsugao_denpyo', 'skill_tsugao_chokin', 'skill_tsugao_neru', 'skill_idle'],
  colors: ['#1E1A30', '#2A2440', '#E8E4D8', '#1B1733', '#6FC3E0'],
  ai: (c: AiCtx) => {
    // 2段目からは 攻撃しない（見守る）
    if ((c.shared.tgPhase ?? 1) >= 2) return 'skill_idle';
    if (c.acts === 0) return 'skill_tsugao_mada';
    const chokin = c.hpRate >= 0.9 || c.has('c3_gochisou') ? 0 : 20;
    const neru = c.lastSkill === 'skill_tsugao_neru' || (c.mem.neruN ?? 0) >= 2 ? 0 : 15;
    return c.pick([['skill_tsugao_mada', 30], ['skill_tsugao_denpyo', 35], ['skill_tsugao_chokin', chokin], ['skill_tsugao_neru', neru]]);
  },
  texts: {
    appear: ['ツガオが 立ちあがった！'],
    yousu: ['ツガオの 背中の 回覧板が、\nまっ黒に 光っている。', '大水槽の 青い 光が、\nツガオの 肩に ゆれている。'],
    yousuSpecial: { yobu: 'ツガオは 回覧板を 胸に 持って、\nこちらを 見ている。' },
    tele: {
      skill_tsugao_mada: ['ツガオは 黒い 判を かまえた！\n『まだ』！'],
      skill_tsugao_denpyo: ['40年 ぶんの 伝票が、\nホールに ふぶいた！'],
      skill_tsugao_chokin: ['ツガオは 休みの 貯金を\n少し 引き出した！'],
    },
    extra: {
      madaResult: ['$targetは まだ 動けない！'],
      madaHajiku: ['黒い 判が、はじかれて\nツガオの 手に もどった。'],
      chokinGuard: ['ツガオは 通帳を、\nそっと しまった。'],
      neru: ['ツガオ「……つがおちゃん 寝る〜♪」'],
      neruResult: ['ツガオは 眠って しまった！'],
      neruKn: ['戦いの とちゅうやで！'],
      neruWake: ['ツガオは 目を さました。'],
      half: ['朱の はなまるが、黒い『まだ』に\n半分だけ しみこんだ。'],
      full: ['『まだ』が はがれた 所に、\n朱が まるごと しみこんだ！'],
      sleepFull: ['眠っている あいだは、\n『まだ』が ゆるんでいる。'],
      lockHold: ['ツガオは、ふんばっている。\n……まだ、打刻せん。'],
      gochisouSeal: ['ツガオは、貯金の 通帳を\nそっと 閉じた。'],
      otsukare: ['ツガオ「……わしゃあ、\nまだ 打刻せん。」'],
      mimashita: ['ツガオの 左の 腕時計は、\n12時で 止まった まま。'],
      // 2段目（60 6.10〔よぶ が出る〕。よぶ①〜④）
      yobuAppear: ['しゅんの 手に、\nふしぎな 気持ちが わいてきた。', '……だれかを、よべる 気が する。'],
      yobu1: ['しゅんは 夕鳴町の 人を よんだ！'],
      yobu1Tg: ['ツガオ「……夕鳴町の もんか。」'],
      yobu2: ['しゅんは 星見台の 人を よんだ！'],
      yobu2Tg: ['ツガオ「……山の 上から、わざわざ。」'],
      yobu3: ['しゅんは 海ぞいの 町の 人を よんだ！'],
      yobu3Tg: ['ツガオ「……正午の 町の もんまで。」'],
      yobu4: ['しゅんと グソっ君と ヤキソバンが、\n最後の はなまるを 描いた！'],
      yobu4Two: ['しゅんと グソっ君が、\n最後の はなまるを 描いた！'],
      yobu4Tg: ['ツガオ「……ハンコじゃ、ないんか。」'],
      notYet: ['朱の はなまるが、黒い『まだ』に\nしみこまない。', '……だれかを、よぼう。'],
      nothing: ['ツガオは 回覧板を 胸に、\nじっと 待っている。'],
      full10: ['黒い 回覧板が、\nはなまるで いっぱいに なった！', 'ハンコケースの 10番目が、\n光って いる！'],
      prompt: ['――『みんなの はなまる』を 押す。'],
      minna: ['しゅんは『みんなの はなまる』を\n押した！'],
    },
    idle: [['ツガオは 回覧板を 胸に、\nじっと 待っている。']],
    defeat: [],
    noFlee: ['みんなが、うしろで 見ている。'],
  },
  book: { short: 'ツガオ', shotai: 'ツガオ便の 親分。', weak: '', hitokoto: '' },
};

export const AQ_ENEMIES: EnemyDef[] = [junro, tsugao1, hirosuke, pokosha, tsugao];

/** 人が 相手の 戦闘（第3章の 中ボスと 同じく、ラスボスの しくみは 通さない）。 */
export const AQ_PEOPLE = new Set(['boss_tsugao_1', 'boss_hirosuke', 'boss_pokosha', 'boss_tsugao']);
