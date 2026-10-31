// クリア後（05_postgame 2章・6.4）：寄り道を クリア後に 遊べるようにするための 文（E の第2期）。
// 1ページ3行・1行 336px。名札・地の文に「さん」をつけない（台詞の中の「しんごさん」はそのまま）。
// 止まった時間の話はしない。

/** yr_c1_tankan：第1章のクリアで袋から消えた たんかんを、マスターが もう1つ。 */
export const PG_MASTER_TANKAN = `@npc_master
……たんかん、まだ
しんごさんに 渡して ないのか。
/
冷凍庫に、もう 1つ あった。{w=300}
今度は、とけないうちに。`;

/** yr_c1_suito：水筒の はじめの1ページ（「水が 北東へ 寄る」は段階2のおかしさ。05 5.3）。 */
export const PG_AZE_SUITO_HEAD = `@npc_toyozou
……今日は、分水の 水が
こっちへ 細い。{w=300}
わしの 田の ほうが、少ない。`;

/** yr_c3_fucho：セリのあとで切れはしを拾うと、ツグミ（はじめの1回）。 */
export const PG_FUCHO_TSUGUMI = `@npc_c3_seri_deshi
……あ、それ、師匠の
ノートの 切れはし です。
/
今は、わたしも セリで
言えるように なりました。
{w=300}……ちょっとだけ、ですけど。`;

/**
 * 6.4 第3章の正午のふしぎ（クリア後）：止まった正午の物を、流れる昼に「本当に ある ふしぎ」として。
 * seen = 窓の中で調べた文、off = 窓の外の文、pressed / after = 押したとき・押したあと（無い物は今の文）。
 */
export const PG_FUSHIGI3: Record<string, { seen: string; off: string; pressed?: string; after: string }> = {
  fushigi_ch3_01: {
    seen: `@narr
港の 柱の 影が、足もとに
小さく まるまっている。
{w=300}……今は、ほとんど 真下だ。`,
    off: `@narr
港の 柱の 影が、
地面に 長く のびている。`,
    pressed: `@narr
影の ふちが、ほんの 少し
東へ ずれた。{w=300}
……もう、午後だ。`,
    after: `@narr
正午の まわりだけ、
影は 足の 下に かくれる。`,
  },
  fushigi_ch3_03: {
    seen: `@narr
防波堤の 内側だけ、
波が 小さい。{w=300}凪だ。
/
水に、空と 雲が
そのまま 写っている。`,
    off: `@narr
防波堤の 内側。
小さな 波が 寄せている。`,
    after: `@narr
凪の 時間。{w=300}
内側の 海を、雲が
ゆっくり 流れていく。`,
  },
  // 08 3つの町の時計：止まった時計の話はしない（クリア後は 3つの町が 同じ時計）
  fushigi_ch3_08: {
    seen: `@narr
ジオラマの 3つの 時計。
{w=300}……3つとも、同じ 時刻を
指している。`,
    off: `@narr
ジオラマの 3つの 時計。
{w=300}……3つとも、同じ 時刻を
指している。`,
    pressed: `@narr
3つの 時計が、そろって
カチッと 1つ 進んだ。`,
    after: `@narr
夕鳴町、星見台、海ぞいの 町。
3つとも、同じ 時刻。`,
  },
  fushigi_ch3_04: {
    seen: `@narr
向かい風に 乗って、カモメが
羽ばたかずに 浮いている。
{w=300}……空に 貼りついた みたいだ。`,
    off: `@narr
市場の 屋根の 上を、
カモメが 飛んでいく。`,
    after: `@narr
風が 弱まると、カモメは
すっと 流れて いった。`,
  },
};

/** yr_c2_sawako：下絵を 見た グソっ君（クリア後。置物が ヤキソバン＝たかしだと 知っている）。 */
export const PG_SAWAKO_YK_FLIP = `@npc_kanenari
これ、うちの 店の 前の
ヤキソバンやんか！{w=300}
……ひげ、描いて あったんか。`;

export function pgRowTexts(): Record<string, unknown> {
  return { PG_MASTER_TANKAN, PG_AZE_SUITO_HEAD, PG_FUCHO_TSUGUMI, PG_SAWAKO_YK_FLIP, fushigi3: PG_FUSHIGI3 };
}
