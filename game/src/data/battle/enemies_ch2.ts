// Chapter 2 enemies: stats and AI (51_ch2_battle.md 8–10), texts and the
// みました帳 lines (50_ch2_story.md 6). The boss's own AI and its round-end
// rules (点呼, 明るさ) live in src/battle/boss_yobimodoshi.ts.

import type { AiCtx, BossPartDef, EnemyDef } from './types';
import { SYS2 } from './text_ch2';

const NO_WEAK = { da: 1, han: 1, wara: 1 };

/** Moves allowed only when some member can still lose a 命中 step. */
function hitDownOk(c: AiCtx): number {
  const live = c.targets.filter((t) => t.canAct || t.blocked || t.henji);
  return live.length && live.every((t) => t.hitDown) ? 0 : 1;
}

const sune: EnemyDef = {
  id: 'enemy_sune_tomato', name: 'スネトマト', lvl: 4, size: [40, 40], core: [20, 22], face: [20, 20], chapter: 2,
  hp: 90, atk: 15, def: 10, spd: 7, luck: 5, exp: 22, money: 0, attr: NO_WEAK, drops: [],
  bg: 'bg_h_house', bgm: 'bgm_battle', tsukkomiCount: 2, startStatus: ['status_sune'],
  tsukkomi: ['すねるな、熟せ！', '青くさいのは 当然！'],
  skills: ['skill_sune_suneru', 'skill_sune_korogaru', 'skill_sune_aokusai', 'skill_idle'],
  colors: ['#5FA85A', '#9BCB6B', '#3FA66B', '#2E6B4A', '#E8F4D8'],
  ai: (c: AiCtx) => {
    // the first move is always the roll (out of its sulk, back first)
    if (c.acts === 0) return 'skill_sune_korogaru';
    const ao = hitDownOk(c);
    if (c.has('status_sune')) return c.pick([['skill_sune_korogaru', 45], ['skill_sune_aokusai', 35 * ao], ['skill_idle', 20]]);
    if (c.seen) return c.pick([['skill_sune_korogaru', 55], ['skill_sune_aokusai', 30 * ao], ['skill_idle', 15]]);
    // a bunch of two never both sulk in the same round (the second redraws)
    const suneOk = c.shared.suneRound === c.round ? 0 : 1;
    const r = c.pick([['skill_sune_suneru', 35 * suneOk], ['skill_sune_korogaru', 35], ['skill_sune_aokusai', 20 * ao], ['skill_idle', 10]]);
    if (r === 'skill_sune_suneru') c.shared.suneRound = c.round;
    return r;
  },
  texts: {
    appear: ['スネトマトが 通路の まんなかで\n背中を 向けている！'],
    yousu: [
      'スネトマトは 赤い トマトの ほうを\nちらっと 見た。',
      'スネトマトの ヘタが、\nすこし かたむいている。',
      'スネトマトは まだ 青い。\n本人も わかっている。',
    ],
    yousuSpecial: { sune: 'スネトマトは 背中を 向けたままだ。' },
    tele: {
      skill_sune_suneru: ['スネトマトは ぷいっと\n背中を 向けた！'],
      skill_sune_korogaru: ['スネトマトは ごろごろ\n転がってきた！'],
      skill_sune_aokusai: ['スネトマトから 青くさい においが\nただよってきた！'],
    },
    extra: {
      appearMulti: ['スネトマトたちが 房ごと\nそっぽを 向いている！'],
      suneruResult: ['スネトマトの まもりが 上がった！'],
      aokusaiResult: ['みんなの 命中が 下がった！'],
      mimashitaAfter: ['スネトマトは 見て もらえて、\nこっちを 向いた！'],
    },
    idle: [['スネトマトは ヘタを いじっている。'], ['スネトマトは『どうせ 青いよ』と\n言いたげだ。']],
    defeat: ['スネトマトは 枝に もどった。', '朝が 来たら、赤く なる\nつもり らしい。'],
  },
  book: { short: '青い トマト', shotai: 'ペロリさんの 3号ハウスの、まだ 色づいていない トマト。', weak: '見て もらうこと。すねたら『みました』。', hitokoto: '赤く なる 順番を、待っている。' },
};

const kacho: EnemyDef = {
  id: 'enemy_henoheno_kacho', name: 'ヘノヘノ課長', lvl: 5, size: [48, 72], core: [24, 34], face: [24, 14], chapter: 2,
  hp: 120, atk: 16, def: 12, spd: 9, luck: 6, exp: 26, money: 100, attr: { da: 0.7, han: 1.3, wara: 1 }, drops: [],
  bg: 'bg_h_tanada', bgm: 'bgm_battle', tsukkomiCount: 3,
  tsukkomi: ['顔 描きなおすな！', '一本足で 課長 やるな！', '鳥 いないだろ！'],
  skills: ['skill_heno_kaonaoshi', 'skill_heno_tachippanashi', 'skill_heno_toriodoshi', 'skill_idle'],
  colors: ['#E8C878', '#2F3A5A', '#C8B87A', '#F4F1E8', '#C8CDD4'],
  ai: (c: AiCtx) => {
    if (c.acts === 0) return 'skill_heno_kaonaoshi';
    const tachi = c.defStage >= 1 ? 0 : 1;
    if (c.hpRate >= 0.5)
      return c.pick([['skill_heno_kaonaoshi', 35], ['skill_heno_toriodoshi', 30], ['skill_heno_tachippanashi', 25 * tachi], ['skill_idle', 10]]);
    return c.pick([['skill_heno_kaonaoshi', 30], ['skill_heno_toriodoshi', 30], ['skill_heno_tachippanashi', 30 * tachi], ['skill_idle', 10]]);
  },
  texts: {
    appear: ['ヘノヘノ課長が 一本足で\n立ちはだかった！'],
    yousu: ['ヘノヘノ課長の 名札：\n『鳥獣対策課 課長』。', 'ヘノヘノ課長の CDが、\nくるくる 回っている。', 'ヘノヘノ課長は『前向きに 検討』と\n顔に 書いた。'],
    yousuSpecial: { lowHp: 'ヘノヘノ課長の 顔が、\nだんだん『へ』だけに なってきた。' },
    tele: {
      skill_heno_kaonaoshi: ['ヘノヘノ課長は 顔を\n描きなおした！'],
      skill_heno_tachippanashi: ['ヘノヘノ課長は 一本足で 立ったまま、\n動かなく なった……。'],
      skill_heno_toriodoshi: ['ヘノヘノ課長は CDを\nぎらりと 光らせた！'],
    },
    extra: {
      kaonaoshiResult: ['どっちが 前だか\nわからなく なった！'],
      tachippanashiResult: ['ヘノヘノ課長の まもりが\nぐーんと 上がった！'],
      toriodoshiResult: ['まぶしくて、みんなの\n命中が 下がった！'],
      money: ['背広の ポケットに 入っていた。'],
      hatoMeishi: SYS2.hatoMeishiKacho,
    },
    idle: [['ヘノヘノ課長の 背広の すそが、\nぱたぱた した。'], ['ヘノヘノ課長は 田んぼの ほうを\n気に している。']],
    defeat: ['ヘノヘノ課長は 一本足で\n立ちなおした。', '田んぼの ほうを 向いて、\n番に もどった。'],
  },
  book: { short: 'かかし', shotai: 'トマじいの 背広を 着た、棚田の かかし。', weak: 'ペケ。顔に 描かれると 弱い。CDには ツッコミで。', hitokoto: 'かかしに、定年は ない。' },
};

const biri: EnemyDef = {
  id: 'enemy_biribiri_ban', name: 'ビリビリ番', lvl: 5, size: [56, 48], core: [28, 26], face: [28, 14], chapter: 2,
  hp: 100, atk: 17, def: 14, spd: 10, luck: 5, exp: 28, money: 0, attr: { da: 0.7, han: 1.3, wara: 1 }, drops: [],
  bg: 'bg_h_fence', bgm: 'bgm_battle', tsukkomiCount: 2, shock: { base: 3, charged: 5 },
  tsukkomi: ['人間は 通せ！', 'リズム 正確すぎ！'],
  skills: ['skill_biri_kinshi', 'skill_biri_pulse', 'skill_biri_tsuden', 'skill_idle'],
  colors: ['#FFD23F', '#E8E4D8', '#7CFF9A', '#2F4A8A', '#C8CDD4'],
  ai: (c: AiCtx) => {
    // 立ち入り禁止 never goes to a member already blocked; with nobody free it drops out
    const kin = c.targets.some((t) => !t.blocked && t.canAct) ? 1 : 0;
    if (c.acts === 0 && kin) return 'skill_biri_kinshi';
    if (c.acts <= 1) return 'skill_biri_pulse';
    if (c.atkStage >= 1) return c.pick([['skill_biri_pulse', 55], ['skill_biri_kinshi', 30 * kin], ['skill_idle', 15]]);
    return c.pick([['skill_biri_pulse', 40], ['skill_biri_kinshi', 25 * kin], ['skill_biri_tsuden', 25], ['skill_idle', 10]]);
  },
  texts: {
    appear: ['ビリビリ番が 表示板を かかげて\n立ちふさがった！'],
    yousu: ['ビリビリ番の 線を、光が\n1秒おきに 走っていく。', '表示板：『危険 電気さく』。', 'ビリビリ番の 通電ランプが、\nみどりに 光っている。'],
    tele: {
      skill_biri_kinshi: ['ビリビリ番は 表示板を\nこっちに 向けた！『危険』'],
      skill_biri_pulse: ['ビリビリ番の 線に、\n光が 走りだした！'],
      skill_biri_tsuden: ['ビリビリ番は『夜間 通電中』の\nランプを 点けた。'],
    },
    extra: {
      pulseResult: ['パチッ、パチッ、パチッ。'],
      tsudenResult: ['ビリビリ番の ちからが 上がった！'],
      shockFirst: SYS2.shockFirst,
    },
    idle: [['ビリビリ番の 線が、\n少し たるんだ。'], ['ビリビリ番は アースの 棒を\n地面に さしなおした。']],
    defeat: ['ビリビリ番は 柵の 列に\nもどった。', '……イノシシ だけを\n通さない ことに した。'],
  },
  book: { short: '電気柵', shotai: 'イノシシよけの、電気柵の ひと区画。', weak: 'ペケ（立ち入り禁止の ×）。たたくと しびれるので、ハンコで。', hitokoto: '番を するのが 仕事。だれの 番かは、忘れた。' },
};

const chototsu: EnemyDef = {
  id: 'enemy_chototsu', name: 'チョトツ', lvl: 5, size: [56, 40], core: [28, 22], face: [12, 16], chapter: 2,
  hp: 130, atk: 17, def: 11, spd: 11, luck: 4, exp: 26, money: 0, attr: { da: 1.3, han: 1, wara: 1 }, drops: [],
  bg: 'bg_h_yama', bgm: 'bgm_battle', tsukkomiCount: 2, defeatStyle: 'runaway',
  tsukkomi: ['曲がれるんかい！', '畑を 掘るな！'],
  skills: ['skill_cho_tame', 'skill_cho_totsu', 'skill_cho_horu', 'skill_cho_nuta', 'skill_idle'],
  colors: ['#5A3A22', '#8A5A3A', '#3A2616', '#6B5A4A', '#F4F1E8'],
  ai: (c: AiCtx) => {
    if (c.acts === 0) return 'skill_cho_tame';
    if (c.has('status_tame')) return 'skill_cho_totsu';
    // the charge waits two of its own actions after the last dash (or cancel)
    const tame = c.acts - (c.mem.chargeEnd ?? -99) >= 2 ? 1 : 0;
    const nuta = c.defStage >= 1 ? 0 : 1;
    return c.pick([['skill_cho_tame', 30 * tame], ['skill_cho_horu', 35], ['skill_cho_nuta', 20 * nuta], ['skill_idle', 15]]);
  },
  texts: {
    appear: ['チョトツが 鼻を 鳴らして\n向かってきた！'],
    yousu: ['チョトツは 鼻を ひくひく させた。\n……トマトの においだ。', 'チョトツの 背中の 毛が\n逆立っている。', 'チョトツの 足に、\n乾いた 泥が ついている。'],
    yousuSpecial: { tame: 'チョトツは まっすぐ $targetを\n見ている……。' },
    tele: {
      skill_cho_tame: ['チョトツは 前足で 地面を\nかきはじめた……！'],
      skill_cho_totsu: ['チョトツは まっすぐ 突進して……'],
      skill_cho_horu: ['チョトツは 足もとを 鼻で\n掘りかえした！'],
      skill_cho_nuta: ['チョトツは 泥の 中で\n転がりはじめた！'],
    },
    extra: {
      totsuBend: ['……曲がった！'],
      cancel: ['チョトツは 地面を かくのを\nやめて、鼻を かいた。'],
      nutaResult: ['泥の よろいで、チョトツの\nまもりが 上がった！'],
    },
    idle: [['チョトツは ミミズを 見つけて、\nそっちに 夢中だ。'], ['チョトツは 耳を ぴくっと させて、\n山の ほうを 見た。']],
    defeat: ['チョトツは 山の においを\n思いだした。', 'ふり返らずに、\n山へ 帰っていった。'],
  },
  book: { short: 'イノシシ', shotai: '山から 下りてきた、イノシシ。', weak: '溜めが 見えたら、まもるか『やりなおし』。', hitokoto: '曲がれない、と よく 言われる。' },
};

const mujin: EnemyDef = {
  id: 'enemy_mujin_hanbaiin', name: 'ムジン販売員', lvl: 5, size: [40, 48], core: [20, 26], face: [20, 14], chapter: 2,
  hp: 120, atk: 15, def: 13, spd: 13, luck: 10, exp: 24, money: 0, attr: { da: 1.3, han: 1, wara: 1 },
  drops: [{ item: 'item_kyuri_zuke', rate: 1 }], bg: 'bg_h_mujin', bgm: 'bgm_battle', tsukkomiCount: 2,
  tsukkomi: ['無人だろ！', '押し売りか！'],
  skills: ['skill_mujin_irasshai', 'skill_mujin_osusume', 'skill_mujin_charin', 'skill_mujin_nefuda', 'skill_idle'],
  colors: ['#C8A06A', '#D8B888', '#F4F1E8', '#C8C2B4', '#3F7A3A'],
  ai: (c: AiCtx) => {
    if (c.acts === 0) return 'skill_mujin_irasshai';
    const ir = c.spdStage >= 1 ? 0 : 1;
    if (c.atkStage >= 1) return c.pick([['skill_mujin_osusume', 40], ['skill_mujin_charin', 35], ['skill_mujin_irasshai', 15 * ir], ['skill_idle', 10]]);
    return c.pick([['skill_mujin_osusume', 30], ['skill_mujin_charin', 25], ['skill_mujin_nefuda', 25], ['skill_mujin_irasshai', 10 * ir], ['skill_idle', 10]]);
  },
  texts: {
    appear: ['ムジン販売員が 札を かかげて\nとびだしてきた！'],
    // 〔様子1〕 is the first round only (texts.ts); then 2 and 3 alternate
    yousu: ['ムジン販売員の 札：\n『どれでも 100円』。', 'ムジン販売員の 中で、100円玉が\n1枚 ころんと 鳴った。'],
    yousuSpecial: { first: 'カネナリくんの フリップ：\n『（キャラが かぶっています）』' },
    tele: {
      skill_mujin_irasshai: ['ムジン販売員は 札を かかげた。\n『いらっしゃいませ』'],
      skill_mujin_osusume: ['ムジン販売員は きゅうりを\n押しつけてきた！『おすすめ』'],
      skill_mujin_charin: ['ムジン販売員は 体を ゆすった。\nチャリン、チャリン！'],
      skill_mujin_nefuda: ['ムジン販売員は 札を 書きかえた。\n『全品 200円』'],
    },
    extra: {
      irasshaiResult: ['ムジン販売員の すばやさが\n上がった！'],
      nefudaResult: ['ムジン販売員の ちからが\n上がった！'],
      money: ['お金は 1円も 出てこなかった。\n……えらい。'],
    },
    idle: [['ムジン販売員は 札を 裏返した。\n『ただいま 休憩中』'], ['ムジン販売員は 台の ほうを\nふり返った。']],
    defeat: ['ムジン販売員は 台の 上に\nもどった。', '……だれも 見ていない ところで、\nちゃんと 待っている。'],
  },
  book: { short: '料金箱', shotai: '無人販売所の、料金箱。', weak: '木の 箱なので、たたくが 効く。札の 字が 大きいほど 強気。', hitokoto: 'だれも 見ていなくても、1円も まちがえない。' },
};

const tetsuya: EnemyDef = {
  id: 'enemy_tetsuya', name: '耕うん機テツヤ', lvl: 6, size: [72, 64], core: [36, 34], face: [18, 22], chapter: 2,
  hp: 220, atk: 19, def: 12, spd: 6, luck: 6, exp: 64, money: 0, attr: NO_WEAK, drops: [], noFlee: true,
  bg: 'bg_h_tetsuya', bgm: 'bgm_midboss', tsukkomiCount: 3, startStatus: ['status_tetsuya'], restActions: 2, restAlways: true,
  tsukkomi: ['寝ろ！', 'そこ 道！', 'エンスト するな！'],
  skills: ['skill_tetsuya_light', 'skill_tetsuya_rotary', 'skill_tetsuya_ensuto', 'skill_tetsuya_fullthrottle', 'skill_idle'],
  colors: ['#3A7A8A', '#5A9AA8', '#9AA0A8', '#FFE7A3', '#A8742A'],
  ai: (c: AiCtx) => {
    if (c.has('status_tame')) return 'skill_tetsuya_fullthrottle';
    if (c.acts === 0) return 'skill_tetsuya_light';
    if (c.acts === 1) return 'skill_tetsuya_rotary';
    // the big move's warning is shown at least once
    if (!c.mem.ensutoUsed) return 'skill_tetsuya_ensuto';
    const en = c.acts - (c.mem.chargeEnd ?? -99) >= 2 ? 1 : 0;
    if (c.hpRate > 0.5)
      return c.pick([['skill_tetsuya_light', 30], ['skill_tetsuya_rotary', 30], ['skill_tetsuya_ensuto', 30 * en], ['skill_idle', 10]]);
    return c.pick([['skill_tetsuya_light', 25], ['skill_tetsuya_rotary', 30], ['skill_tetsuya_ensuto', 40 * en], ['skill_idle', 5]]);
  },
  texts: {
    appear: ['耕うん機テツヤが ヘッドライトを\nこっちに 向けた！'],
    yousu: ['テツヤの エンジンが、\nドッドッドッ と 鳴っている。', 'テツヤの ハンドルに、\n『タケ』の シール。', 'テツヤの 燃料計は『E』。\n……まだ 動く。'],
    yousuSpecial: {
      tetsuya: 'テツヤは まだまだ いける 顔を\nしている。',
      kyuukei: 'テツヤは エンジンを 止めて、\nひと息 ついている。',
      tame: 'テツヤは 静かに 力を\nためている……。',
    },
    tele: {
      skill_tetsuya_light: ['テツヤは ヘッドライトを\nまっすぐ 向けてきた！'],
      skill_tetsuya_rotary: ['テツヤの 爪が 回りだした！\n土が はねる！'],
      skill_tetsuya_ensuto: ['テツヤの エンジンが、\nプスン……と 止まった。'],
      skill_tetsuya_fullthrottle: ['テツヤは エンジンを かけなおして、\n全力で 突っこんできた！'],
    },
    extra: {
      roundEnd: ['テツヤは『モウ ヒト ウネ』と\n耕しなおした。'],
      lightResult: ['まぶしくて、$targetの 命中が\n下がった！'],
      cancel: ['テツヤは エンストした まま、\nチョークを 引きなおした。'],
      otsukareOk: ['テツヤの ヘッドライトが、\n半分 閉じた。', 'テツヤは 休憩に 入った！'],
      restEnd: ['テツヤは『モウ ヒト ウネ』と、\nエンジンを かけなおした。'],
      hint: ['カネナリくんの フリップ：\n『（あの人、休んで いません）』'],
      hintFlip: ['あの人、休んで いません'],
    },
    idle: [['テツヤは ひと畝 バックして、\n耕しなおした。'], ['テツヤは 同じ ところを\n2回 耕した。']],
    defeat: ['耕うん機テツヤは\nエンジンを 止めた。', '……ひと晩じゅう、\nたがやしていた。'],
    noFlee: SYS2.noFleeTetsuya,
  },
  book: { short: '耕うん機', shotai: 'タケじいの、歩いて 押す 耕うん機。', weak: 'おつかれさま（休めば まもりが 下がる）。溜めには『やりなおし』。', hitokoto: '乗る人が いなくても、春を 待っている。' },
};

/** ヨビモドシ's four ラッパ (51 10.2): boxes from the sprite's top-left; each drives one move. */
export const YOBI_PARTS: BossPartDef[] = [
  { id: 'boss_yobimodoshi_east', name: '東のラッパ', box: [82, 16, 46, 28], action: 'skill_yobi_ressha' },
  { id: 'boss_yobimodoshi_west', name: '西のラッパ', box: [0, 16, 46, 28], action: 'skill_yobi_sukima' },
  { id: 'boss_yobimodoshi_south', name: '南のラッパ', box: [46, 26, 36, 30], action: 'skill_yobi_amado' },
  { id: 'boss_yobimodoshi_north', name: '北のラッパ', box: [44, 6, 40, 20], action: 'skill_yobi_yamabiko' },
];

const yobimodoshi: EnemyDef = {
  id: 'boss_yobimodoshi', name: 'ヨビモドシ', lvl: 7, size: [128, 160], core: [64, 72], face: [64, 66], footY: 192, chapter: 2,
  hp: 440, atk: 21, def: 12, spd: 8, luck: 8, exp: 100, money: 0, attr: NO_WEAK, drops: [], noFlee: true, noCrit: true,
  bg: 'bg_h_boss', bgm: 'bgm_boss_yobimodoshi', tsukkomiCount: 3, boss: true, restActions: 0, parts: YOBI_PARTS,
  tsukkomi: ['出席 とるな！', 'こんな 時間に 呼ぶな！', '山びこ かよ！'],
  skills: ['skill_yobi_tenko', 'skill_yobi_yofukashi', 'skill_yobi_ressha', 'skill_yobi_sukima', 'skill_yobi_amado', 'skill_yobi_yamabiko', 'skill_yobi_onamae', 'skill_idle'],
  colors: ['#9AA0A8', '#C8CDD4', '#E84E3C', '#8E95A6', '#FFF6D8'],
  // the boss AI lives in src/battle/boss_yobimodoshi.ts (parts, phases, 点呼)
  ai: () => 'skill_yobi_ressha',
  texts: {
    appear: ['ヨビモドシの 赤い ランプが、\nこっちを 向いた！'],
    yousu: ['暗くて、ランプの 赤しか\n見えない。', 'どこかの ラッパの 奥が、\nかすかに 光った。', 'ヨビモドシは 名簿を\n読みあげる 息を している。'],
    yousuSpecial: {
      light1: '四方の ラッパが、\n夕焼け色に 照らされている。',
      light2: 'ヨビモドシは まぶしそうに\nランプを 細くした。',
      tenko3: 'つぎで、4つ目の 名前だ。',
      p2a: '名札が、どんどん 流れていく。',
      p2b: 'ヨビモドシの 柱が、\n小さく ふるえている。',
    },
    tele: {
      skill_yobi_yofukashi: ['……だれも、へんじを しません。'],
      skill_yobi_ressha: ['東の ラッパから、\n最終列車の 音が した！'],
      skill_yobi_sukima: ['西の ラッパから、\nすきま風が 吹いてきた！'],
      skill_yobi_amado: ['南の ラッパから、雨戸を\n閉める 音が した！'],
      skill_yobi_yamabiko: ['北の ラッパが、\nいまの 音を くり返した！'],
      skill_yobi_onamae: ['ヨビモドシは $targetの\n名前を 呼んだ！'],
    },
    extra: {
      opening: ['「……点呼を 続けます。」'],
      tenko: ['……$name。', '……へんじが ありません。'],
      tenko2: ['……$name。……$name2。\n……へんじが ありません。'],
      tenkoLight: ['……だれか、いますか？'],
      yofukashiHit: ['夜が、また 長く なった！'],
      yofukashiAfter: ['名簿は、また 最初に もどった。'],
      resshaResult: ['ガタン、ゴトン……\n行ってしまった。'],
      amadoResult: ['バタン！'],
      breakFirst: ['ミナトは $partに\n『みました』を 押した！'],
      break_boss_yobimodoshi_east: ['東の ラッパの 奥に、\n駅の 時刻表の 形。', 'ちゃんと 見た。\n東は、もう 呼ばない。'],
      break_boss_yobimodoshi_west: ['西の ラッパの 奥に、\nハウスの ビニールの 形。', 'ちゃんと 見た。\n西は、もう 呼ばない。'],
      break_boss_yobimodoshi_south: ['南の ラッパの 奥に、\n空き家の 表札の 形。', 'ちゃんと 見た。\n南は、もう 呼ばない。'],
      break_boss_yobimodoshi_north: ['北の ラッパの 奥に、\n山の 形。', 'ちゃんと 見た。\n北は、山びこを やめた。'],
      bodyMimashita: ['ヨビモドシは 見られて、\nランプを 少し 下げた。'],
      phase2: ['「……お盆にも、だれも\n帰って こなかった。」', '「名簿の 名前は、\nまだ 30人 あります。」'],
      final1: ['ヨビモドシは 点呼を 止めた。'],
      final2: ['「……だれも、へんじを\nしません。」', '「朝が 来たら、きょうも\nだれも 帰らなかった ことに なる。」', '「だから、点呼を\n終われません。」'],
      final3: ['カネナリくんが 前に 出た。'],
      final4: ['カネナリくんは ミナトの アミを\n受けとって、高く かかげた！'],
      finalFlipText: ['カネナリくんの フリップ：\n『星見台へ ようこそ！』', '『（となり町の PR大使ですが）』'],
      finalFlip: ['星見台へ ようこそ！', '（となり町の PR大使ですが）'],
      finalCut: [
        'トマトの 光が、夜の 村を\nすみずみまで 照らした。',
        '「……牛舎に、明かり。」',
        '「ハウス。集会所。棚田。」',
        '「マサルさん。ペロリさん。\nまつ先生。」',
        '「……みんな、ずっと\nここに いたんですね。」',
        '「点呼を、終わります。」',
      ],
      final5: ['ハンコケースが 光った。', '『おやすみなさい』の 輪郭が、\nくっきり 浮かびあがった！'],
      finalPrompt: ['――『おやすみなさい』を 押す。'],
      finalStamp: ['ミナトは『おやすみなさい』の\nハンコを 押した。'],
      finalGoodnight: ['「……星見台の みなさん。」', '「きょうも 一日、\nおつかれさまでした。」', '「{spd=0.5}おやすみなさい。」'],
      finalLamp: ['赤い ランプが、\nゆっくり 消えた。'],
      otsukare: SYS2.otsukareBoss,
    },
    idle: [['ヨビモドシは 名簿の\nページを めくる 音を 立てた。'], ['ヨビモドシの マイクが、\n『あー、あー』と 言いかけた。']],
    defeat: [],
    noFlee: ['山の 上の 夜は、\nどっちを 向いても 夜だ。'],
  },
  book: { short: '防災無線', shotai: '星見の丘の 防災無線。出ていった 人の 名前を 呼び続けた 声。', weak: 'トマトで 照らした ラッパ。明るいと、名前を 呼ばない。', hitokoto: '毎晩、『おやすみなさい』で 終わっていた。' },
};

/** Every chapter-2 enemy definition. */
export const CH2_ENEMIES: EnemyDef[] = [sune, kacho, biri, chototsu, mujin, tetsuya, yobimodoshi];
