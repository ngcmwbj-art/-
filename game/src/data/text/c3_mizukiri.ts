// 低う、平たく（げむきか 10/22 の 案1、2026-10-22 依頼主の 採用。03_ch3_index）。第3章の クリア前、段階1（正午）。
// S06 の あと（item_c3_map）から S12 の ナリオサメの 前まで。段階2（S13〜S14）も 浜には 入れる。
//
//   1 ぽちゃん（空き地の 子ども npc_c3_kid_a の 2回目〔mizukiri〕）→ flag_mz_start
//   2 こんな 日（灯台の 台座の テルに 話す〔hama〕。S09 の 途中は 出さない）→ flag_mz_hama。テルは 小石の 浜へ
//   3 平たいのを（岸壁の 西の はしの 岩の 石段 (1,25) → 新しい 地図 map_c3_koishi「小石の 浜」24×10）
//   4 テルが 投げる（はじめて 石を ひろった あと 1回：鏡の 海に 輪が 9つ、止まって 残る）
//   5 水切り（大写し：決定を 押さえると 腰が 落ちる〈目盛りは 画面の 上の 横〉、はなすと 投げる。輪は 浜を 出るまで 残る）
//   6 グソっ君の 番（しゅんが 1回 投げた あと 1回）
//   7 押し返して くれる（3回 投げた あと テルに 話す）→ 8 ごほうび（朱肉 +2、みました帳③の すみ）
//   段階2：波が 寄せている（輪は もう ない。跳ねる 数が 少し 減る〈いちばん 下の 帯でも 6まで〉。テルは 灯台）。
//   かくし：9回（テルの 1行）、グソっ君の 番の あと もう一度 グソっ君に 話す、S13 の 防波堤の ミナト（地の文 1行）。
//
// 依頼主の OK（2026-10-22）：止まった 海に、跳ねた あとの 輪が その場で 止まって 残る 見せ方で よい。
// 決まり：地の文・名札に「さん」なし（台詞の「テルばあちゃん」は 子どもの 呼び方）。天丼の 口ぐせは 使わない
// （テルの「昼の 灯台は、光らんでも 立っとる。」も 使わない）。時刻の 数字は 出さない。1ページ 3行 × 336px。

// ================================================================ 1 ぽちゃん（子どもの〔mizukiri〕）

export const MZ_A = `@npc_c3_kid_a
しゅん、水切り {w=300}
できる？
/
昼休みが 終わらんけえ、{w=300}
100回 投げた。
/
……ぜんぶ、{w=300}
ぽちゃん。
@npc_kanenari
100回 ぽちゃんは、{w=300}
もう 才能やで。
@npc_c3_kid_a
テルばあちゃんが、{w=300}
いちばん うまい
らしいんよ。`;

// ================================================================ 2 こんな 日（テルの〔hama〕）

export const MZ_HAMA = `@npc_c3_toudai
水切り？{w=300}
……まあ、なつかしい。
/
海が 鏡の 日は、{w=300}
いちばん ようけ
跳ねるんよ。
/
港の 西の、{w=300}
岩の 向こう。
小石の 浜に おいで。
/
平たい 石が、{w=300}
ようけ ある けえ。
@npc_kanenari
平たい 石なら、{w=300}
……わいも けっこう
平たいで。
@npc_c3_toudai
あんたは 跳ねん。
/
先に 行っとる けえ。`;

// ================================================================ 3 平たいのを（小石の 浜）

export const MZ_IN = `@narr
丸い 石の 浜。{w=300}
海は、空を
そのまま 映している。`;

export const MZ_IN_TERU = `@npc_c3_toudai
丸い 石は、{w=300}
すぐ 沈む。
/
平たいのを、{w=300}
ひろいんさい。
手の ひらに のる くらい。`;

export const MZ_MARU = `@narr
まるい。{w=300}
……ころがる 形だ。`;

export const MZ_OOKI = `@narr
重い。{w=300}
……持ち上がらない。`;

export const MZ_GOT = `@sys
平たい 石を ひろった！`;

export const MZ_FULL = `@narr
手が、{w=300}
もう いっぱいだ。`;

/** 海（石を 持っていない）。 */
export const MZ_UMI = `@narr
鏡みたいな 海。{w=300}
平たい 石が あれば。`;

export const MZ_UMI2 = `@narr
波が、{w=300}
寄せては かえす。`;

export const MZ_REIRU = `@narr
古い 木の レール。{w=300}
舟を 引き上げる
ための もの。
/
舟は、ない。`;

export const MZ_IWA = `@narr
平たい 大きな 岩。{w=300}
2人ぶん、すわれる。`;

// ================================================================ 4 テルが 投げる（1回）

export const MZ_TERU_NAGE_A = `@npc_c3_toudai
見とって。`;

export const MZ_TERU_NAGE = `@narr
とん、とん、とん、{w=300}
とん、とん、とん、とん、
とん、とん……
/
鏡の 海に、{w=300}
輪が 9つ。
/
輪は、{w=300}
ひろがらずに、そこで
止まった。
@npc_kanenari
輪っか、{w=300}
置いてったで！
@c3_kodomotachi
すっげえ！
@npc_c3_toudai
低う、平たく、{w=300}
思いきり。`;

// ================================================================ 5 水切り（大写し）

export const MZ_RULE = `@sys
けってい を 押さえると、{w=300}
腰が 落ちる。
はなすと、投げる。
/
いちばん 下の 帯で
はなすと、よく 跳ねる。`;

/** 跳ねた 数の「とん」（地の文。n は 1〜9）。 */
export function mzTon(n: number): string {
  if (n <= 0) return '@narr\nぽちゃん。';
  const ton = Array.from({ length: n }, () => 'とん');
  const rows: string[] = [];
  for (let i = 0; i < ton.length; i += 4) rows.push(ton.slice(i, i + 4).join('、'));
  return `@narr\n${rows.join('、\n')}……`;
}

export const MZ_KEKKA: Record<'zero' | 'low' | 'high', string> = {
  zero: `@npc_c3_kid_b
おそろいじゃ。`,
  low: `@npc_kanenari
跳ねた！{w=300}
石が、海の 上
走っとる！`,
  high: `@npc_c3_toudai
まあ。{w=300}
……ミナトより
上手。`,
};

/** 6〜8 で テルが 浜に いない（段階2 など）。 */
export const MZ_KEKKA_HIGH_SOLO = `@npc_kanenari
ようけ 跳ねた！{w=300}
テルばあちゃんに
見せたかったな。`;

/** かくし：9回（1回）。 */
export const MZ_KYU = `@npc_c3_toudai
…………{w=300}
あの人には、
ほんとに 言わんでね。
@narr
テルは、少し
くやしそうに 笑った。`;

// ================================================================ 6 グソっ君の 番（1回）

export const MZ_KN_A = `@npc_kanenari
わいも やる。{w=300}
見とけ。`;

export const MZ_KN_B = `@narr
グソっ君が、はさみで
石を つまんで、{w=300}
上から 投げた。
/
……ぽちゃん。
@npc_kanenari
…………{w=300}
わい、沈む ほうが
得意やねん。
@npc_c3_kid_a
グソっ君、{w=300}
101回目の ぽちゃん。`;

/** かくし：グソっ君の 番の あと、もう一度 グソっ君に 話す（1回。テルが 浜に いる とき）。 */
export const MZ_KN_NAZE = `@npc_kanenari
石は 沈むのに、{w=300}
なんで 跳ねるんやろ。
@npc_c3_toudai
急いどる けえよ。`;

// ================================================================ 7 押し返して くれる・8 ごほうび

export const MZ_OSHI = `@npc_c3_toudai
若い ころ、{w=300}
ここで、あの人と
勝負したんよ。
@npc_kanenari
あの人って、{w=300}
サイレンの？
@npc_c3_toudai
いつも あの人は 7つ。{w=300}
わたしは 9つ。
/
……あの人には、{w=300}
言わんでね。
@npc_kanenari
言われへんわ。{w=300}
こわいもん。
@npc_c3_toudai
低う 投げたら、{w=300}
海が 押し返して
くれるんよ。`;

export const MZ_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳③の すみに、
『低う、平たく』の
ページ。`;

/** 3回 投げる 前の テル（浜）。 */
export const MZ_TERU_MADA = `@npc_c3_toudai
低う、平たく、{w=300}
思いきり。`;

/** すんだ あとの テル（浜）。 */
export const MZ_TERU_DONE = `@npc_c3_toudai
……あの人には、{w=300}
言わんでね。`;

/** 浜の 子ども（あとから 走って きて、はしで 見ている）。 */
export const MZ_KIDS: Record<string, string> = {
  npc_c3_kid_a: `@npc_c3_kid_a
ぼくらの は、{w=300}
上から 投げとった。`,
  npc_c3_kid_b: `@npc_c3_kid_b
輪っか、{w=300}
さわれそう。`,
  npc_c3_kid_c: `@npc_c3_kid_c
低う、平たく、{w=300}
思いきり！`,
};

// ================================================================ 段階2（12:01）

export const MZ_IN2 = `@narr
波が、{w=300}
寄せている。`;

/** 前に 輪を 残していた（1回）。 */
export const MZ_IN2_WA = `@npc_kanenari
輪っか、{w=300}
沖へ 行ったんやな。`;

/** 段階2 で はじめて 投げた あと（1回）。 */
export const MZ_NAMI = `@narr
波が 来ると、{w=300}
跳ねにくい。`;

/** 灯台の テル（段階2、〔c2〕の あと 1回。浜で 投げていれば）。 */
export const MZ_TERU_C2 = `@npc_c3_toudai
輪は、{w=300}
沖へ 出ていった
じゃろうね。`;

/** S13 の 防波堤の ミナト（1回。テルの 話を 聞いていれば）。 */
export const MZ_MINATO = `@narr
ミナトは、小石の 浜の
ほうを、ちらっと 見た。`;

// ================================================================ 大写し・帳面

export const MZ_UI = {
  place: '水切り',
  keys: ['けってい：', '押さえる 腰', 'はなす 投げる'],
  koshi: '腰',
  katachiLabel: '石の 形',
  katachi: { usui: 'うすい', futsu: 'ふつう', buatsui: 'ぶあつい' } as Record<string, string>,
};

/** みました帳③の すみの 1ページ（ui/menu/book_mizukiri.ts）。 */
export const MZ_BOOK = {
  title: '低う、平たく',
  best: (n: number) => (n <= 0 ? 'ぽちゃん だけ' : `いちばん：${['', '1つ', '2つ', '3つ', '4つ', '5つ', '6つ', '7つ', '8つ', '9つ'][Math.min(9, n)]}`),
  wa: (n: number) => `きょうの 輪 ${n}こ`,
  quote: ['低う 投げたら、', '海が 押し返して', 'くれるんよ。'],
};

export const MZ_TEXTS: Record<string, unknown> = {
  MZ_A, MZ_HAMA, MZ_IN, MZ_IN_TERU, MZ_MARU, MZ_OOKI, MZ_GOT, MZ_FULL, MZ_UMI, MZ_UMI2, MZ_REIRU, MZ_IWA,
  MZ_TERU_NAGE_A, MZ_TERU_NAGE, MZ_RULE, MZ_KEKKA, MZ_KEKKA_HIGH_SOLO, MZ_KYU, MZ_KN_A, MZ_KN_B, MZ_KN_NAZE,
  MZ_OSHI, MZ_REWARD, MZ_TERU_MADA, MZ_TERU_DONE, MZ_KIDS, MZ_IN2, MZ_IN2_WA, MZ_NAMI, MZ_TERU_C2, MZ_MINATO,
  ton: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(mzTon),
};
