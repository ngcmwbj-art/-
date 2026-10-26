// 寝とる うちに、とる（第2章。げむきか 10/26 の 案5、2026-10-26 依頼主の 採用。02_ch2_index）。
// 3号ハウスの 前の ペロ（いつもの 会話の あと、もう 1回）→ ハウスの 裏の 獣よけの ネットの 戸 → 上の 畑
// （map_hoshi_ue_hata）の レタス 3株（大写し「玉」：押す → 切る〈ペロ〉→ 洗う）→ コンテナの 前で ペロ。
//
// 事実（調べた 範囲。$SP/handoff/retasu_progress.md に 出典）：高原の レタスは 夏から 秋（夏秋どり、6〜10月。川上村は
// 6〜9月が 最盛期）、早ければ 夜明け前から 照明を つけて とる（朝に とった 物は みずみずしい）。玉の てっぺんを 手で
// 押さえて かたく しまって いれば とりごろ。とり遅れは 葉が かたく、苦みが 出やすい。株もとを 切ると 乳白色の 汁が
// にじみ、葉に つくと 色が 変わる（ピンク〜赤茶）ので、切り口に 水を 吹きかけて 洗う。和名の「ちしゃ」は「乳草」から
// と 言われる（和歌山県・農畜産業振興機構）。外の 葉を 2枚 残して とるのは 依頼主の 事実（出典は 見つけていない）。
//
// 決まり：第2章の 台詞に 時刻の 数字・「まだ」・「12人」「1日2本」「おまけの 1つ」「3人」・「いただきます」・第3章の 中身を
// 入れない。天丼の 口ぐせ（「ほどよいなぁ」「牛は、しゃべらん。」ほか）は 足さない。刃物は ペロの 手だけ（しゅんは
// 玉を ささえる）。地の文・名札の 名前に「さん」なし。1ページ 3行 × 336px。

// ================================================================ 1 暗い うちに（ペロの〔retasu〕）

const HAJIME = `@npc_hoshi_mitsu
上の 畑は、{w=300}
灯りが いるよ。`;

/** 段階0（灯りの 前）：最初の 1ページだけ（1回）。 */
export const RT_H0 = HAJIME;

/** 段階1〜2：〔retasu〕。 */
export const RT_START = `${HAJIME}
/
レタスは、{w=300}
暗い うちに
とるんだよ。
@npc_kanenari
なんで？{w=300}
見えへんやん。
@npc_hoshi_mitsu
日が 当たる 前が、{w=300}
いちばん 冷えて、
しゃきっと してる。
/
ハウスの 裏の、{w=300}
ネットの 戸から
上がって おいで。
/
……手伝って くれ。`;

/** ペロが 頭に ライトを つける。 */
export const RT_LAMP = `@narr
ペロは、{w=300}
頭に 小さな ライトを
つけた。`;

/** 上の 畑に 行く 前に もう一度（ハウスの 前の ペロは いない：念の ため）。 */
export const RT_WAIT = `@npc_hoshi_mitsu
ハウスの 裏の、{w=300}
ネットの 戸だよ。`;

// ================================================================ ネットの 戸（村の (6,19)）

/** 段階0（灯りの 前）。 */
export const RT_TO_DARK = `@narr
ネットの 向こうに、{w=300}
丸い 影が
ならんでいる。`;

/** 〔retasu〕の 前（段階1〜2）。 */
export const RT_TO_SHUT = `@narr
獣よけの ネットの 戸。{w=300}
ひもで しばってある。`;

/** すんだ あと・クリア後（戸は しばってある）。 */
export const RT_TO_AFTER = `@narr
ネットの 戸。{w=300}
向こうは、ペロの
小さな レタス畑。`;

// ================================================================ 2 上の 畑（入ると すぐ）

export const RT_HATA_FIRST = `@narr
暗い 畑に、{w=300}
丸い 葉っぱが
ならんでいる。
@npc_kanenari
キャベツ？
@npc_hoshi_mitsu
レタス。{w=300}
……さわって みな。
/
光ってる 3つを、{w=300}
押して みて くれ。`;

/** 2回目から 入った とき（畑の 中の ペロ）。 */
export const RT_PERO_WAIT = `@npc_hoshi_mitsu
光ってる 玉を、{w=300}
上から 押して みな。`;

/** 段階2：すみの 小さな かかしも 山を 向いている（1回）。 */
export const RT_KAKASHI_H2 = `@npc_kanenari
……こいつも、{w=300}
山 見とる。`;
export const RT_KAKASHI = `@narr
小さな かかし。{w=300}
エプロンを
かけている。`;

// ================================================================ 3 大写し「玉」

/** 押した かたさ。 */
export const RT_OSU = {
  kata: `@narr
ぎゅっと、{w=300}
しまっている。`,
  yawa: `@narr
ふかっと、{w=300}
へこんだ。`,
  kosugi: `@narr
石みたいに、{w=300}
かたい。`,
};

export const RT_ASK = `@narr
? とる | とらない`;

/** 選んだ あとの ペロ（ok：見分けが 合った）。 */
export const RT_KIME = {
  kata_ok: `@npc_hoshi_mitsu
とりごろ。`,
  kata_ng: `@npc_hoshi_mitsu
……いや、{w=300}
こいつは とりごろだ。`,
  kosugi_ok: `@npc_hoshi_mitsu
……とり遅れ。{w=300}
苦く なる 前に
とっちまおう。`,
  kosugi_ng: `@npc_hoshi_mitsu
……とり遅れだ。{w=300}
これ以上 置くと、
苦く なる。`,
  yawa_ok: `@npc_hoshi_mitsu
うん。{w=300}
こいつは、もう ひと晩。`,
  yawa_ng: `@npc_hoshi_mitsu
待った。{w=300}
こいつは、もう ひと晩。`,
};

/** やわらかい 株（とらない）。 */
export const RT_HITOBAN = `@npc_kanenari
……ひと晩、{w=300}
来るんかな。
@npc_hoshi_mitsu
……来るさ。`;

/** 切る（ペロ。しゅんは 玉を ささえる）。外の 葉を 2枚 残して。 */
export const RT_KIRU = `@narr
しゅんが 玉を ささえ、{w=300}
ペロが 外の 葉を
2枚 残して、切った。`;

/** 1つ目に 切った とき：白い 汁・ちしゃ・すぐ 洗う。 */
export const RT_SHIRU_FIRST = `@narr
切り口から、{w=300}
白い 汁が
にじんだ。
@npc_kanenari
牛乳 出た！
@npc_hoshi_mitsu
レタスの {w=300}
昔の 名前は
『ちしゃ』。
/
乳の 草、で ちしゃ……{w=300}
と、言われとる。
/
その 汁は、{w=300}
すぐ 洗う。
切り口の 色が 変わる。`;

/** 2つ目から。 */
export const RT_SHIRU = `@narr
白い 汁が、{w=300}
にじむ。
@npc_hoshi_mitsu
洗って。`;

/** 霧吹きの あと。 */
export const RT_ARAU_FIRST = `@narr
しゅっ。{w=300}
……切り口が、
きれいに なった。`;
export const RT_ARAU = `@narr
しゅっ。`;

/** とり遅れの 株を 洗った あと。 */
export const RT_OKURE = `@npc_kanenari
とり遅れても、{w=300}
とって もらえるんや。
@npc_hoshi_mitsu
うちの もんは、{w=300}
みんな 食べる。`;

/** 2つ とって、コンテナへ（外の 葉 2枚）。 */
export const RT_SOTOBA = `@narr
コンテナの 玉は、{w=300}
外の 葉を 2枚、
つけた まま。
@npc_hoshi_mitsu
外の 葉が、{w=300}
中を 守る。`;

export function rtCount(n: number): string {
  return `@sys
見た 玉 ${n}/3`;
}

// ================================================================ 畑の 物

/** 光っていない レタス（ほかの 株）。 */
export const RT_HOKA = `@narr
レタスの 玉。{w=300}
葉の ふちが、露で
白く 光っている。`;

/** とった 株の あと。 */
export const RT_TOTTA = `@narr
切り株が、{w=300}
1つ 残っている。`;

/** 見送った 株（すんだ あとも）。 */
export const RT_MIOKURI = `@narr
ふかっと した 玉。{w=300}
……もう ひと晩、
寝て いる。`;

export const RT_KONTENA = `@narr
オレンジの 収穫コンテナ。{w=300}
とった レタスが
並んでいる。`;
export const RT_KONTENA_EMPTY = `@narr
オレンジの {w=300}
収穫コンテナ。
からっぽ。`;

export const RT_KIRI = `@narr
霧吹きと、{w=300}
水の 入った バケツ。`;

export const RT_KUSA = `@narr
ネットに、{w=300}
草の つるが
からんでいる。`;

export const RT_NET = `@narr
獣よけの ネットの 戸。{w=300}
下に もどる。`;

// ================================================================ 4 寝とる うちに（コンテナの 前）

export const RT_NETORU = `@npc_kanenari
……この 村、{w=300}
ずっと 暗い ままや。
/
ほな、{w=300}
レタスは ずっと
とりごろ やん。
@npc_hoshi_mitsu
レタスが 寝とる {w=300}
うちに、とる。
/
……起こすと、{w=300}
しなっと する
からね。
/
でも、{w=300}
朝が 来なきゃ、
運べも しない。`;

/** かくし：3株とも 見分けが 合った（1回）。 */
export const RT_IITE = `@npc_hoshi_mitsu
……いい 手だ。{w=300}
くりこより、
わかってる。`;

export const RT_WATASU = `@narr
ペロが、{w=300}
レタスを 1つ
わたして くれた。`;

export const RT_GOT = `@sys
『しゃきしゃきレタス』を
手に 入れた。`;
export const RT_BAG_FULL = `@npc_hoshi_mitsu
……荷物が いっぱいか。{w=300}
また 取りに おいで。`;

export const RT_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳②の すみに、
『寝とる うちに、とる』の
ページ。`;

/** すんだ あとの 畑の ペロ（1回）、3号ハウスの 前の ペロ（1回）。 */
export const RT_PERO_AFTER = `@npc_hoshi_mitsu
レタスは、{w=300}
寝かして おいた。`;

// ================================================================ かくし

/** マサルに『しゃきしゃきレタス』を 持って 話す（1回）。 */
export const RT_MASARU = `@npc_kanenari
牛乳 出たで！{w=300}
レタスから！
@npc_hoshi_gen
……うちは、{w=300}
肉牛だ。`;

/** ペロの 家の 水がめ（すんだ あと、1回）。 */
export const RT_KOMINKA = `@narr
水がめの 横に、{w=300}
霧吹きが もう 1つ。`;

// ================================================================ 回復の 物

export const RT_ITEM_DESC: [string, string] = ['つめたい。外の 葉が、2枚。', 'HPを 45 回復。'];

// ================================================================ 大写し「玉」の 字

export const RT_UI = {
  place: '玉',
  /** やり方の カード（ui/closeup.ts）。 */
  howto: { id: 'retasu', line: '{Z}で 押して、{Z}で 洗う', pic: 'tap' as const },
  kabu: (k: number) => `${k + 1}つ目`,
  kata: 'かたさ',
  levels: ['ふかっ', 'ぎゅっ', 'かちっ'],
  keys: {
    osu: 'けってい 押す',
    arau: 'けってい 洗う',
  },
};

// ================================================================ みました帳②の すみ『寝とる うちに、とる』

export const RT_BOOK = {
  title: '寝とる うちに、とる',
  titleLines: ['寝とる うちに、', 'とる'],
  /** ペロの 作業日誌の 字。 */
  nisshi: 'ちしゃ＝乳草',
  /** すみの グソっ君。 */
  kn: '牛乳 出た！',
  rows: ['とった 玉', '見送った 玉', '洗った 切り口'],
  count: (a: number, b: number) => `${a}/${b}`,
};

/** 文の検査（rtText・textcheck2 の walk）に出す物。 */
export const RT_TEXTS: Record<string, unknown> = {
  RT_H0, RT_START, RT_LAMP, RT_WAIT, RT_TO_DARK, RT_TO_SHUT, RT_TO_AFTER, RT_HATA_FIRST, RT_PERO_WAIT, RT_KAKASHI_H2, RT_KAKASHI,
  RT_OSU, RT_ASK, RT_KIME, RT_HITOBAN, RT_KIRU, RT_SHIRU_FIRST, RT_SHIRU, RT_ARAU_FIRST, RT_ARAU, RT_OKURE, RT_SOTOBA,
  count: [1, 3].map(rtCount), RT_HOKA, RT_TOTTA, RT_MIOKURI, RT_KONTENA, RT_KONTENA_EMPTY, RT_KIRI, RT_KUSA, RT_NET,
  RT_NETORU, RT_IITE, RT_WATASU, RT_GOT, RT_BAG_FULL, RT_REWARD, RT_PERO_AFTER, RT_MASARU, RT_KOMINKA,
};
