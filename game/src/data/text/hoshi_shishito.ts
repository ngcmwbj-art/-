// 当たりは、かじって みんと（げむきか 10/22 の 案5、2026-10-22 依頼主の 採用。02_ch2_index）。第2章、段階1〜2
// （トマトの 灯り）。3号ハウスの 前の ペロ (3,32) の 今の 会話の あと、もう 1回 話すと〔shishito〕。段階0 は
// 1 の 台詞だけ（畑は 暗くて 実が 見えない）。
//
//   1 夜食（ペロの〔shishito〕）→ flag_ss_start。ペロは 縁側の 七輪へ 歩く（すむと 3号ハウスの 前へ もどる）
//   2 とる（家の 前の 畑の シシトウの 株 2つ。グソっ君が 1本 よけいに とる）
//   3 七輪（大写し「七輪」：串を さす〈けってい 2回〉→ グソっ君が 残りの 1本を そのまま 網に → 焼き色の
//     目盛りで 返す〈2回〉→ パンッ！）
//   4 当たり（くじ：焼けた 3本から しゅんが 1本 えらぶ。だれに 当たるかは 毎回 ちがう。しゅん・グソっ君・ペロ）
//   5 かじって みんと → 6 ごほうび（焼きシシトウ 2つ、朱肉 +2、みました帳②の すみ、寄り合いへの 皿）
//   2回目から：畑に 小さい 実が 3本。ペロに 話すと「もう 1回、焼くかい」（穴あけと パンッは はぶく）。
//   かくし：皿を 集会所の ハモ区長へ（区長は はずれ、ぴょん夫人の 1行）。羽釜が すんでいる → かまどの 残り火。
//   3人とも 当たった → ペロ「……みんな、当たりだね。」。
//
// 決まり：第2章の 台詞に 時刻の 数字・「まだ」・第3章の 中身・「いただきます」を 入れない。辛いのが 当たる 割合の
// 数は 言わない（「10本に 1本」など）。グソっ君の「ロシアン……」は「くじ引きや！」に、「人も、そうかも しれんな。」は
// 外した（2026-10-22 改善会議）。天丼の 口ぐせは 使わない（案の ペロの「ほどよいなぁ」1回も、いちばん よい 焼き色の
// ときは「……いい 色だ。」に した）。地の文・名札に「さん」なし（台詞の「ペロさん」は グソっ君の 呼び方）。1ページ 3行 × 336px。

// ================================================================ 1 夜食（ペロの〔shishito〕）

export const SS_A = `@npc_hoshi_mitsu
寄り合いの 夜食に、{w=300}
シシトウを 焼こうと
思ってね。
/
とって きて {w=300}
くれるかい。
家の 前の 畑さ。
@npc_kanenari
シシトウ？{w=300}
……小さい ピーマン？
@npc_hoshi_mitsu
まあ、{w=300}
そんな ところさ。
/
おれは 縁側で、{w=300}
七輪に 火を 入れとくよ。`;

/** 段階0（畑は 暗くて 見えない）：1 の 台詞だけ（1回）。 */
export const SS_A_H0 = `@npc_hoshi_mitsu
寄り合いの 夜食に、{w=300}
シシトウでも 焼こうかと
思ってね。
/
……暗くて、{w=300}
畑の 実が 見えないや。`;

/** 段階0 で 1 を 聞いた あと、灯りが ついてから（はじめの 1回）。 */
export const SS_A_LIT = `@npc_hoshi_mitsu
明るく なったね。{w=300}
シシトウ、とって きて
くれるかい。
/
家の 前の 畑さ。{w=300}
おれは 縁側で、
七輪に 火を 入れとくよ。`;

/** グソっ君が いない とき（隊列に いない）。 */
export const SS_NO_KN = `@npc_hoshi_mitsu
シシトウでも 焼こうかと
思ってね。{w=300}
……また 今度に しよう。`;

/** 縁側の ペロ：実を とる 前。 */
export const SS_WAIT = `@npc_hoshi_mitsu
家の 前の 畑さ。{w=300}
株は 2つ。`;

// ================================================================ 2 とる

/** 株（とる 前・段階1〜2・〔shishito〕の 前）。 */
export const SS_KABU = `@narr
シシトウの 株。{w=300}
細長い 緑の 実が、
下がっている。`;

/** 株（段階0）。 */
export const SS_KABU_DARK = `@narr
暗くて、{w=300}
何の 株か 分からない。`;

export const SS_TORU = `@narr
つやつやの {w=300}
緑の 実。
@npc_kanenari
どれも {w=300}
おんなじ 顔や。`;

export const SS_TORU_2 = `@narr
こっちの 株も、{w=300}
つやつやの 緑。
@npc_kanenari
わいも 1本、{w=300}
とっとこ。`;

export const SS_GOT = `@sys
シシトウを とった！`;

/** とった あとの 株。 */
export const SS_KABU_DONE = `@narr
とった あとの 株。{w=300}
葉の かげに、
小さい 花。`;

/** 2回目から：新しい 実。 */
export const SS_KABU_NEW = `@narr
小さい 実が、{w=300}
3本。`;

// ================================================================ 3 七輪

/** 羽釜（赤子 泣いても）が すんでいる（1回）。 */
export const SS_HAGAMA = `@npc_hoshi_mitsu
かまどの 残り火、{w=300}
ちょうど いいね。`;

export const SS_ANA = `@npc_hoshi_mitsu
焼く 前に、{w=300}
穴を あけるんだ。
/
串に させば、{w=300}
それが 穴に なる。`;

export const SS_KUSHI_RULE = `@sys
けってい で、{w=300}
串を さす。`;

/** 串を 2本 さした あと：グソっ君が 残りの 1本を そのまま 網に。 */
export const SS_NOSE = `@narr
グソっ君が、{w=300}
残りの 1本を、そのまま
網に のせた。
@npc_kanenari
これも、{w=300}
焼いたろ。`;

export const SS_KAESU_RULE = `@npc_hoshi_mitsu
色が ついたら、{w=300}
返すんだ。
@sys
けってい で 返す。`;

/** 返した ときの 焼き色（いちばん よい 色は 1回だけ ペロの 1行）。 */
export const SS_IRO: Record<'nama' | 'yoi' | 'koge', string> = {
  nama: `@npc_hoshi_mitsu
もう 少し {w=300}
焼いても いいね。`,
  yoi: `@npc_hoshi_mitsu
……いい 色だ。`,
  koge: `@npc_hoshi_mitsu
ちょっと {w=300}
焦げたね。`,
};

export const SS_PAN = `@narr
……パンッ！
@npc_kanenari
はじけた！{w=300}
わいの よろいも
はじけたか 思た！
@npc_hoshi_mitsu
穴を あけないと、{w=300}
中で ふくらんで、
はじけるのさ。
@npc_kanenari
先に {w=300}
言うてや……
@npc_hoshi_mitsu
言ったさ。`;

// ================================================================ 4 当たり

export const SS_ATARI_A = `@npc_hoshi_mitsu
シシトウは、{w=300}
たまに 辛いのが
ある。
/
見ても、{w=300}
分からないんだ。
@npc_kanenari
くじ引きや！
@npc_hoshi_mitsu
そういう 言い方も、{w=300}
するね。`;

/** 2回目からの くじの 前。 */
export const SS_ATARI_AGAIN = `@npc_kanenari
くじ引き、{w=300}
もう 1回や！`;

export const SS_KUJI_RULE = `@sys
←→ で えらんで、{w=300}
けってい で 食べる。`;

export const SS_HIT: Record<'kn' | 'shun' | 'pero', string> = {
  kn: `@narr
……ぴく。
@npc_kanenari
からっ！！{w=300}
海の 底にも、
こんなん おらんで！
@npc_hoshi_mitsu
当たり だね。`,
  shun: `@narr
……！！
@npc_kanenari
しゅん、{w=300}
顔 まっ赤や！
トマトか！
@npc_hoshi_mitsu
当たり だね。{w=300}
水を どうぞ。`,
  pero: `@narr
ペロは、{w=300}
だまって 食べた。
@npc_kanenari
……ペロさん、{w=300}
今の、辛いやつ
ちゃうん？
@npc_hoshi_mitsu
……くりこは、{w=300}
これが 当たると、
喜んだ。
@narr
ペロは、少し 笑った。`,
};

// ================================================================ 5 かじって みんと・6 ごほうび

export const SS_KIME = `@npc_hoshi_mitsu
当たりは、{w=300}
かじって みんと
分からんさ。
/
のこりは、{w=300}
寄り合いに 持って
いこう。`;

/** 3人とも 当たった（2回目から、1回）。 */
export const SS_MINNA = `@npc_hoshi_mitsu
……みんな、{w=300}
当たりだね。`;

export const SS_REWARD = `@sys
焼きシシトウを 2つ
手に入れた！
/
朱肉が 2 ふえた。
/
みました帳②の すみに、
『当たりは、かじって
みんと』の ページ。`;

export const SS_GET_SARA = `@sys
寄り合いの 皿を
あずかった！`;

/** 2回目から：新しい 人に 当たって ページに 書きたした。 */
export const SS_PAGE_ADD = `@sys
みました帳の『あたり』に、
名前を 書きたした。`;

/** すんだ あと、縁側から もどる 前の ペロ（1回）。 */
export const SS_AFTER = `@npc_hoshi_mitsu
皿は、{w=300}
集会所の 区長に。`;

export const SS_AGAIN_ASK = `@npc_hoshi_mitsu
もう 1回、焼くかい。
? 焼く | やめる`;

export const SS_AGAIN_NO = `@npc_hoshi_mitsu
そうかい。`;

/** 七輪（ペロが 縁側に いない とき）。 */
export const SS_SHICHIRIN = `@narr
七輪。{w=300}
炭が、赤く
残っている。`;

// ================================================================ かくし：寄り合いの 皿

export const SS_KUCHO = `@narr
区長が、{w=300}
1本 食べた。
@npc_hoshi_kucho
えー、{w=300}
まことに 結構な
お味で ございます。
@npc_hoshi_yoshie
あんたは、{w=300}
いっつも はずれじゃ。`;

// ================================================================ 回復の 物・大写し・帳面

export const SS_ITEM_DESC: [string, string] = ['ペロの 七輪の 焼きシシトウ。', 'HPを 51 回復。'];
export const SS_SARA_DESC: [string, string] = ['焼きシシトウの 皿。', '集会所の 寄り合いへ。'];

export const SS_UI = {
  place: '七輪',
  keysKushi: ['けってい さす'],
  keysYaku: ['けってい 返す'],
  keysKuji: ['←→ えらぶ', 'けってい 食べる'],
  iro: '焼き色',
  dan: ['串', '焼く', 'くじ'],
};

/** みました帳②の すみの 1ページ（ui/menu/book_shishito.ts）。 */
export const SS_BOOK = {
  title: '当たりは、かじって みんと',
  atari: 'あたり：',
  names: { shun: 'しゅん', kn: 'グソっ君', pero: 'ペロ' } as Record<string, string>,
  quote: ['当たりは、', 'かじって みんと', '分からんさ。'],
};

export const SS_TEXTS: Record<string, unknown> = {
  SS_A, SS_A_H0, SS_A_LIT, SS_NO_KN, SS_WAIT, SS_KABU, SS_KABU_DARK, SS_TORU, SS_TORU_2, SS_GOT, SS_KABU_DONE, SS_KABU_NEW,
  SS_HAGAMA, SS_ANA, SS_KUSHI_RULE, SS_NOSE, SS_KAESU_RULE, SS_IRO, SS_PAN, SS_ATARI_A, SS_ATARI_AGAIN, SS_KUJI_RULE, SS_HIT,
  SS_KIME, SS_MINNA, SS_REWARD, SS_GET_SARA, SS_PAGE_ADD, SS_AFTER, SS_AGAIN_ASK, SS_AGAIN_NO, SS_SHICHIRIN, SS_KUCHO,
};
