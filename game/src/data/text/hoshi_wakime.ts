// 脇芽は 朝に かく（第2章・任意のミニゲーム。02_ch2_index #73、docs/ideas/2026-09-30.md の4、
// 50 3.8・9.4・10.23、52 12.6、53 8.16）。
//
//   ペロ (3,32) に 1回だけ〔wakime〕（段階1〜、トマトの 灯りを 持ってから。
//   〔h1_1〕か〔h2_1〕を 聞いた つぎの 1回）→ 1号ハウス map_hoshi_house1 の 株を 調べると
//   ミニゲーム（src/events/ch2/wakime.ts）。3株で 脇芽 9つ。2株目は グソっ君が 足で
//   いっぺんに かく（脇芽 3つと 花 1つ）。終わったら ペロに 話すと〔wakime_done〕と
//   朱肉 +2、3号ハウスの 作業日誌に 1行 ふえる。
//
// 描写は 50 2.2 の「脇芽を かく」の はんい：脇芽は 葉の つけ根（主枝と 葉の あいだ）から
// 出る 芽、花房は 葉と 葉の あいだの 茎から 出る 黄色い 花で かかない、晴れた 朝に 手で
// かく、指が 青くさい においに なる。ペロの「ほどよいなぁ」は 使わない。
// どのページも 3行 × 336px 以内（textcheck2）。画面の 小さな 言葉は wakimeText が 見る。

/** 〔wakime〕 ペロの 頼み（1回。flag_ch2_wakime_ask）。 */
export const WAKIME_ASK = `@npc_hoshi_mitsu
ひとつ、たのめるかい。{w=300}
1号の 脇芽が のびてるんだ。
/
脇芽は、葉の つけ根から
出る 芽さ。{w=300}放っておくと、
実に 行く 力を とっちまう。
/
晴れた 朝に、手で かく。{w=300}
……朝が 来ないなら、
今が 朝さ。`;

/** 花房を かいたとき（しゅん）。 */
export const WAKIME_HANA = `@narr
あっ。{w=300}……花だった。`;

/** 2株目で 1回：グソっ君が 手伝う（そのあいだに 足が いっせいに 動く）。 */
export const WAKIME_KANENARI_A = `@npc_kanenari
わいも やるで。{w=300}
足、いっぱい あるからな。`;
export const WAKIME_KANENARI_NARR = `@narr
小さい 足が、いっせいに 動いた。
脇芽が 3つ……と、花が 1つ。`;
export const WAKIME_KANENARI_B = `@npc_kanenari
……すまん。{w=300}足、多すぎたわ。`;

/** 9つ かき終えたとき。 */
export const WAKIME_END = `@narr
指が 緑に そまって、
トマトの 青い においが する。`;

/** 〔wakime_done〕 終えたあと、ペロに 話した 1回（flag_ch2_wakime_report）。 */
export const WAKIME_REPORT = `@npc_hoshi_mitsu
その においが したら、
一人前さ。{w=300}
……日誌に つけとくよ。`;
export const WAKIME_REWARD = `@sys
朱肉が 2 たまった。`;

/**
 * 3号ハウスの 作業日誌 obj_hoshi_nisshi：〔wakime_done〕の あと、いつもの 文の
 * あとに 1ページ（グソっ君が 花を かいたら、同じ 行に『花 1 グソっ君』も）。
 */
export const WAKIME_NISSHI = `@narr
……いちばん 下に、新しい 1行。
{w=300}『8/31 1号 脇芽 9 しゅん』。`;
export const WAKIME_NISSHI_HANA = `@narr
……いちばん 下に、新しい 1行。
{w=300}『8/31 1号 脇芽 9 しゅん
花 1 グソっ君』。`;

/** 画面の 小さな 言葉（キャプションと 札。wakimeText が 幅を 見る）。 */
export const WAKIME_WORD = {
  /** うまく かけた（輪が 重なった ところで はなした）。 */
  poki: 'ぽきっ',
  /** 早く はなした：芽は しなって もどる。 */
  early: '……しなった だけ。',
  /** 遅い：押しつづけて、ちぎれた。 */
  late: '切り口が、ぎざぎざ。',
  hold: '長押し！',
  release: 'はなす！',
  /** 右上の 札（n 株目）。 */
  kabu: (n: number) => `${n}株目`,
  /** はじめの 操作の 案内。 */
  move: '灯りを 動かす',
  kaku: '長押しで かく',
};

/** textcheck2 が 見る ページ。 */
export const WAKIME_PAGES: Record<string, string> = {
  ask: WAKIME_ASK,
  hana: WAKIME_HANA,
  kanenariA: WAKIME_KANENARI_A,
  kanenariNarr: WAKIME_KANENARI_NARR,
  kanenariB: WAKIME_KANENARI_B,
  end: WAKIME_END,
  report: WAKIME_REPORT,
  reward: WAKIME_REWARD,
  nisshi: WAKIME_NISSHI,
  nisshiHana: WAKIME_NISSHI_HANA,
};
