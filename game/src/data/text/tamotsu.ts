// おぴぃとザリガニ釣り（2026-09-29 依頼主の採用「浮きを 見ている だけ」＋「釣りの
// イベントは 楽しいから もう少し こだわって」。docs/ideas/2026-09-29_taigan.md の1、
// 02_ch2_index #66。10_narrative 6.25・7.21）。★2026-09-29 依頼主の指示で 70代の男性から
// 40代の女性に（IDは 据え置き：npc_tamotsu、TAMOTSU、item_tamotsu_uki、flag_tamotsu_*、ボイス tamotsu）
//
//   おぴぃ：閉店した つりえさ屋（map_sk_bait）の元店主、40代の女性。一人称は「あたし」。
//     さっぱり・さばさばして 口数は 少なめ、ぼそっと 面白い ことを 言う。
//     対岸の畦道の東の端 (21,39) に、伏せた バケツに 座って、田んぼの 水口
//     (20,41) の ペットボトルの しかけを 見ている。話すたびに、北岸に 置いた
//     ままの種（石段の浮き・看板・魚拓・竿・メダカと「換気中」）が 1つずつ答えになる。
//   ザリガニ釣り（src/events/tsuri.ts）：割りばし＋たこ糸＋するめ（おぴぃが貸す）。
//     場所を えらぶ → 下ろす → 待つ（ツン……ツン は味見）→ ぐいっ → 長押しで
//     そーっと 引き上げる → おぴぃの たも網 → 計る（少し 盛る）→ 放す。
//
// 表記（10 1.1・2.x）：1ページ3行、1行336px。名札・地の文では名前に「さん」を
// つけない（台詞の中で 人が 呼ぶときは「おぴぃさん」でもよい）。第1章の台詞に
// 「平和」「まだ」「17」を使わない。段階1の おぴぃの 台詞は {wave}（ピッチの揺れ）。
// 数字の入る文は tamotsuMeasure() などで作る（文字幅の検査は いちばん長い数字で
// 行う：__game.cmd.tamotsuText()）。

/** 名札とボイス（10 1.5）。 */
export const TAMOTSU_SPEAKER = { name: 'おぴぃ', voice: 'tamotsu' };

/** 釣りの場所（10 7.21・30 3.13）。 */
export type TsuriSpot = 'kusa' | 'ishi' | 'dokan';
export const SPOT_NAME: Record<TsuriSpot, string> = {
  kusa: '畦の 草の下',
  ishi: '水口の 石の陰',
  dokan: '土管の 口',
};
/** 放したあと、帰っていく所。 */
const SPOT_HOME: Record<TsuriSpot, string> = {
  kusa: '草の 下',
  ishi: '石の 陰',
  dokan: '土管の 中',
};

// ---------------------------------------------------------------- おぴぃと話す

export const TAMOTSU = {
  /** 1回目（どの段階でも）。2倍に寄る。 */
  meet: `@narr
伏せた バケツに、女の人が 座っている。
水口の しかけを、じっと 見ている。
@npc_tamotsu
……小林さんとこの、しゅんくん？{w=300}
ザリガニ？
/
おぴぃ。{w=300}みんな、そう 呼ぶ。
由来は、忘れた。
/
割りばしに たこ糸、先に するめ。{w=300}
道具なら、貸して あげる。`,
  /** 段階ごとの台詞（種の答えが ないとき）。段階1は _1 と _2 が同じ台詞で、地の文が1行足す（6.0）。 */
  s0_1: `@npc_tamotsu
夕方は、ザリガニの 時間。{w=300}
日が かたむくと、穴から 出てくる。`,
  s0_2: `@npc_tamotsu
稲の 穂が、垂れてきたね。{w=300}
……あと ひと月で、稲刈り。`,
  s1_1: `@npc_tamotsu
{wave}浮きが 動かない。{w=300}
アタリも ハズレも ない。{/wave}`,
  s1_2: `@npc_tamotsu
{wave}浮きが 動かない。{w=300}
アタリも ハズレも ない。{/wave}
@narr
おぴぃは、向こう岸の 浮きを
同じ 顔で 見ている。`,
  s2_1: `@npc_tamotsu
糸が 北東へ……{w=300}
ぬしが かかったかな。
/
……ほっとけば いい。{w=300}
ぬしは、見る もんだよ。`,
  s2_2: `@npc_tamotsu
水口の 水まで、北東に 寄ってる。{w=300}
田んぼの 水が、どこへ 行く 気だろ。`,

  // ---- 置いたままの種の答え（1回の話で1つ。見た物だけ。メダカは最後）
  /** 北岸の石段 (37,35) の浮き（flag_seen_obj_river_steps）。 */
  uki: `@npc_tamotsu
向こうの 石段の 浮き？{w=300}
あれ、あたしの。
/
釣り？ してないよ。
浮きを 浮かべてる だけ。{w=300}針は ついてない。`,
  /** 看板 (34,35)『ザリガニは 可』（flag_seen_obj_canal_sign）。 */
  kanban: `@npc_tamotsu
看板の 『ザリガニは 可』。{w=300}
あれ、あたしが 書き足した。
/
用水路は 深いから。{w=300}
ザリガニは、浅い 水口で やるもんだよ。`,
  /** つりえさ屋の魚拓（flag_seen_obj_sb_gyotaku）。 */
  gyotaku: `@npc_tamotsu
店の 魚拓、見たんだ。
/
32cmは、ちょっと 盛った。{w=300}
……29cm。{w=300}紙が のびたの。`,
  /** つりえさ屋の竿（flag_seen_obj_sb_rods）。 */
  sao: `@npc_tamotsu
竿は おまわりさんの あずかりもの。
敬礼を やめたら、取りに 来るって。`,
  /** 竿のあと、懸垂の はなまるを もらった人だけ（10 6.6〔懸垂〕）。 */
  sao_kensui: `@narr
……ワイスタ巡査は、1回だけ
敬礼を やめていた。`,
  /** メダカ（flag_seen_obj_sb_tank）。種の最後。「換気中」の札も えさも、おぴぃだった。 */
  medaka: `@npc_tamotsu
『換気中』の 札は、あたし。{w=300}
閉めきると、夏は 水が 煮えるから。
えさも、毎日 やりに 行く。
/
店は 3月で 閉めた。{w=300}
メダカは、閉められない。`,

  // ---- 釣るか
  ask: `@npc_tamotsu
……やってく？
? ザリガニを 釣る | やめておく`,
  again: `? もう 1回 | やめておく`,
  bye: `@npc_tamotsu
また 来な。{w=300}
ザリガニは、どこへも 行かないよ。`,
  /** 水口を調べたとき（おぴぃと話したあと）。 */
  mizuguchi_ask: `@npc_tamotsu
……やる？
? ザリガニを 釣る | やめておく`,
  /** はじめての1回の前だけ。 */
  howto: `@npc_tamotsu
ツン、ツン、は 味見。{w=300}
ぐいっと 来たら、そーっと 上げな。
あわてると、はなすよ。
/
草の 下は、小さいのが 多い。{w=300}
土管には、でかいのが いる。`,
};

// ---------------------------------------------------------------- 水口（obj_tamotsu_mizuguchi）

export const MIZUGUCHI = {
  s0: `@narr
田んぼの 水口。{w=300}
用水路の 水が、土管から 落ちてくる。
/
石の そばに、ペットボトルの しかけ。{w=300}
中は からっぽ。`,
  s1: `@narr
土管から 落ちる 水が、
とちゅうで 止まっている。{w=300}
しかけの 中も、からっぽの まま。`,
  s2: `@narr
落ちる 水が、北東へ 曲がっている。{w=300}
田んぼに 入る 前に、
どこかへ 行きたそうだ。`,
  /** おぴぃと 話す 前は、最後に1行。 */
  nudge: `@narr
となりで、女の人が
同じ しかけを 見ている。`,
};

// ---------------------------------------------------------------- 釣りの結果

/** 早い！（ツン……ツン の味見で押した）。1回目と、それから。 */
export const EARLY_1 = `@npc_tamotsu
早い。{w=300}
つかんでから。`;
export const EARLY = [
  `@npc_tamotsu
……早い。`,
  `@npc_tamotsu
それは、味見。`,
  `@npc_tamotsu
ザリガニの ほうが、気が 長いね。`,
];

/** 持ってかれた（ぐいっ のあと 引かなかった／底で 放っておいた）。 */
export const LOST_1 = `@npc_tamotsu
……持ってかれたね。{w=300}
するめなら、山ほど ある。`;
export const LOST = [
  `@npc_tamotsu
穴に 引っぱりこまれたね。`,
  `@npc_tamotsu
するめごと、晩ごはんに なった。`,
];

/** ぽとん（速すぎて はなした）。 */
export const DROP_1 = `@npc_tamotsu
あわてない。{w=300}
ザリガニは、逃げないから。
/
……逃げたけど。`;
export const DROP = [
  `@npc_tamotsu
水の 上に 出る ときが、
いちばん はなしやすい。`,
  `@npc_tamotsu
……ぽとん、だね。`,
  `@npc_tamotsu
あわてると、はなす。{w=300}
ザリガニは そういう もんだよ。`,
];

/** 段階1：たも網に 入ったあと（はさんだまま 止まっている）。 */
export const STILL_HOLD = `@narr
……はなさない ところは、
いつもと 同じだ。`;

/** はじめての1匹（ラムネ1本。もちものが いっぱいなら、次に話したとき）。 */
export const FIRST = `@npc_tamotsu
はじめての 1匹だね。{w=300}
……はい、ラムネ。お祝い。`;
export const FIRST_FULL = `@narr
もちものが いっぱいだ。
@npc_tamotsu
……あとで 取りに 来な。`;
export const OWED = `@npc_tamotsu
はい、さっきの ラムネ。`;
export const GOT_RAMUNE = `@sys
ラムネを 手に入れた！`;

/** 記録（いちばん大きい 認定の cm）。はじめての記録と、更新。 */
export const RECORD_1 = `@npc_tamotsu
……記録だね。{w=300}
ザリ拓に しとく。`;
/** はじめての記録：なぞったあと。 */
export const RECORD_1B = `@narr
おぴぃは えんぴつで、
ザリガニの 形を なぞった。
@npc_tamotsu
拓じゃ ないよ。なぞった だけ。{w=300}
……店の 壁に、貼っとく。`;
export const RECORD = `@npc_tamotsu
……記録、更新。{w=300}
ザリ拓、なぞりなおす。`;
/** はじめての 場所の 記録（ザリ拓は 場所ごとに 3枚。02 #81 水辺の 図鑑）。 */
export const RECORD_SPOT = `@npc_tamotsu
……この 場所の 記録。{w=300}
ザリ拓、もう 1枚。`;

/** グソっ君が いっしょのとき、はじめて盛ったあと（1回。IDは 据え置き）。 */
export const FLIP_MORI = `@npc_kanenari
今、盛ったやろ。
@npc_tamotsu
……定規が のびるの。`;

/** 放す（はじめては 案のとおり）。 */
export const RELEASE_1 = `@npc_tamotsu
放して あげな。{w=300}
ここの 子だよ。`;
export const RELEASE_NARR_1 = `@narr
ザリガニは するめを 持ったまま、
帰っていった。`;
export const RELEASE = [
  `@npc_tamotsu
ほら、帰んな。`,
  `@npc_tamotsu
放して あげな。`,
  `@npc_tamotsu
……元気でね。`,
];
export function releaseNarr(spot: TsuriSpot, n: number): string {
  if (n % 2 === 0)
    return `@narr
ザリガニは するめを 持ったまま、
${SPOT_HOME[spot]}へ 帰っていった。`;
  return `@narr
ザリガニは、後ろ向きに
${SPOT_HOME[spot]}へ 帰っていった。`;
}

/** 長靴（去年 なくした、おぴぃの。1回だけ）。 */
export const BOOT = `@narr
長靴が 上がってきた。{w=300}
片方だけ。
@npc_tamotsu
……それ、あたしの。{w=300}
去年 なくしたやつ。`;
export const BOOT_FLIP = `@npc_kanenari
もう 片方は、どこ 行ったん？
@npc_tamotsu
……家で 待ってる。{w=300}
1年、片方で。`;
export const BOOT_END = `@npc_tamotsu
……ありがとね。`;

/** 空き缶（中に 小さいザリガニ）。ゴミは 持って帰る → ほめる。 */
export const CAN = `@narr
空き缶が 上がってきた。{w=300}
中から、小さい はさみが 2つ。
@npc_tamotsu
……家ごと 釣れたね。`;
export const CAN_KEEP = `@npc_tamotsu
缶は、持って 帰んな。{w=300}
中身は、置いてって。
@narr
しゅんは、空き缶を
持って 帰る ことに した。`;
export const CAN_PRAISE_1 = `@npc_tamotsu
……えらい。{w=300}
あたしは 去年、長靴を 置いてった。`;
export const CAN_PRAISE = `@npc_tamotsu
……えらい。`;

/** ぬし（片方の はさみが 小さい。おぴぃは 見ていたい）。計らない。 */
export const NUSHI = `@npc_tamotsu
……片方の はさみが、小さい。
/
10年 前にも、こいつを 見た。{w=300}
同じ 顔、同じ はさみ。
@narr
ザリガニは、10年も 生きない。
@npc_tamotsu
知ってるよ。{w=300}
……子か、孫か、ひ孫か。
/
計らない。{w=300}
ぬしは、ぬしだから。`;
export const NUSHI_GIFT = `@npc_tamotsu
これ、あげる。{w=300}
店の、最後の 浮き。`;
export const NUSHI_GET = `@sys
おぴぃの浮きを もらった！`;
export const NUSHI_RELEASE = `@narr
おぴぃは、ぬしを 両手で
水口へ もどした。
@npc_tamotsu
……10年 ぶりに、顔を 見た。`;
/** 2回目からの ぬし。 */
export const NUSHI_AGAIN = `@npc_tamotsu
……また 来たの。{w=300}
見るだけで、いい。
@narr
おぴぃは、ぬしを そっと
水に もどした。`;

/**
 * 計る（おぴぃの定規。少し盛る）。`n` は計った長さ、返すのは [ページ, 認定の cm]。
 * 型は くり返すたびに かわる（`k`）。大きいのは盛らない。小さいのは、たまに来年へ。
 */
export function tamotsuMeasure(kind: 'kozari' | 'zari' | 'makka' | 'can', n: number, k: number, stage: number): [string, number] {
  const w = (s: string) => (stage === 1 ? `{wave}${s}{/wave}` : s);
  if (kind === 'makka')
    return [
      `@npc_tamotsu
${w(`${n}cm。`)}{w=300}……これは 盛らない。
盛らなくても、でかい。`,
      n,
    ];
  if (kind === 'can')
    return [
      `@npc_tamotsu
${w(`${n}cm。`)}{w=300}
……缶の ぶんで、${n + 1}cm に しとこうか。`,
      n + 1,
    ];
  const v = k % (kind === 'kozari' ? 4 : 3);
  if (kind === 'kozari' && v === 3)
    return [
      `@npc_tamotsu
${w(`${n}cm。`)}{w=300}
……来年、また 来な。`,
      n,
    ];
  if (v === 1)
    return [
      `@npc_tamotsu
${w(`${n}cm。`)}{w=300}
はさみを 入れたら、${n + 1}cm。`,
      n + 1,
    ];
  if (v === 2)
    return [
      `@npc_tamotsu
${w(`${n}cm。`)}{w=300}ひげを 入れたら、${n + 3}cm。
{w=300}……${n + 1}cm に しとく。`,
      n + 1,
    ];
  return [
    `@npc_tamotsu
${w(`${n}cm。`)}{w=300}
……${n + 1}cm に しとこうか。`,
    n + 1,
  ];
}

// ---------------------------------------------------------------- つりえさ屋の ザリ拓（map_sk_bait）

/** 魚拓の となりに 貼られた ザリ拓（魚拓の文のあとに 1ページ）。 */
export function zariTakuText(cm: number, stage: number): string {
  if (stage >= 2)
    return `@narr
となりの ザリ拓も、北東を 向いている。{w=300}
『しゅん ${cm}cm（おぴぃ 認定）』。`;
  return `@narr
となりに、えんぴつで なぞった ザリガニ。{w=300}
『しゅん ${cm}cm（おぴぃ 認定）』。`;
}

/** ザリ拓が 場所ごとに 2枚 以上（02 #81）：魚拓の 文の あとに 1ページ。 */
const TAKU_NAME: Record<TsuriSpot, string> = { kusa: '草の下', ishi: '石の陰', dokan: '土管' };
export function zariTaku3Text(list: [TsuriSpot, number][], stage: number): string {
  const tags = list.map(([s, cm]) => `『${TAKU_NAME[s]} ${cm}cm』`);
  const l1 = tags.slice(0, 2).join('');
  const l2 = tags.length > 2 ? tags[2] : '';
  if (stage >= 2)
    return `@narr
となりの ザリ拓も ${list.length}枚、北東向き。
${l1}${l2 ? `\n${l2}` : ''}`;
  return `@narr
となりに、えんぴつの ザリ拓が ${list.length}枚。
${l1}
${l2 ? `${l2}（おぴぃ 認定）` : '（おぴぃ 認定）'}`;
}

// ---------------------------------------------------------------- 釣りの画面の言葉（UI）

/** 画面に出る 小さい言葉（地の文ではない。UI の書き文字）。 */
export const TSURI_UI = {
  tsun: 'ツン',
  gui: 'ぐいっ',
  poton: 'ぽとん',
  hold: '長押し！',
  release: 'はなす！',
  early: '早い！',
  record: '記録',
  pick: '場所',
  drop: '下ろす',
  pull: '引き上げる',
};

/** 文字幅の検査に使う、数字の入る文の いちばん長い形（__game.cmd.tamotsuText）。 */
export function tamotsuTextSamples(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(TAMOTSU)) out[`talk.${k}`] = v;
  for (const [k, v] of Object.entries(MIZUGUCHI)) out[`mizuguchi.${k}`] = v;
  const one = { EARLY_1, LOST_1, DROP_1, STILL_HOLD, FIRST, FIRST_FULL, OWED, GOT_RAMUNE, RECORD_1, RECORD_1B, RECORD, FLIP_MORI, RELEASE_1, RELEASE_NARR_1, BOOT, BOOT_FLIP, BOOT_END, CAN, CAN_KEEP, CAN_PRAISE_1, CAN_PRAISE, NUSHI, NUSHI_GIFT, NUSHI_GET, NUSHI_RELEASE, NUSHI_AGAIN };
  for (const [k, v] of Object.entries(one)) out[k] = v;
  EARLY.forEach((v, i) => (out[`EARLY[${i}]`] = v));
  LOST.forEach((v, i) => (out[`LOST[${i}]`] = v));
  DROP.forEach((v, i) => (out[`DROP[${i}]`] = v));
  RELEASE.forEach((v, i) => (out[`RELEASE[${i}]`] = v));
  for (const s of ['kusa', 'ishi', 'dokan'] as TsuriSpot[]) for (const n of [0, 1]) out[`releaseNarr.${s}.${n}`] = releaseNarr(s, n);
  for (const kind of ['kozari', 'zari', 'makka', 'can'] as const) for (let k = 0; k < 4; k++) for (const st of [0, 1]) out[`measure.${kind}.${k}.s${st}`] = tamotsuMeasure(kind, 12, k, st)[0];
  for (const st of [0, 2]) out[`zariTaku.s${st}`] = zariTakuText(13, st);
  for (const st of [0, 2]) out[`zariTaku3.s${st}`] = zariTaku3Text([['kusa', 12], ['ishi', 12], ['dokan', 13]], st);
  out.RECORD_SPOT = RECORD_SPOT;
  return out;
}
