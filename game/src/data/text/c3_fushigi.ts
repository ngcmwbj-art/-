// みました帳 ③ — 海ぞいの町の ふしぎ 10（60_ch3_story 8章）の文。
// 見出し・場所は 60 の表のまま。調べたときの文（seen）は、その物のいつもの文（60 の「押すと」の文と
// 同じ。町の物は c3_events.ts、館の物は c3_story2.ts・c3_story3.ts）を使い、押したあとの
// 文（pressed）と、押したあとに調べた文（after）は E 作。帳面の頁に書くのは 60 の文（book）。
// どのページも 3行 × 336px まで。

export interface Fushigi3 {
  title: string;
  place: string;
  /** 帳面の頁の文（60 8章「押すと」）。 */
  book: string;
  /** 押した直後（E 作）。 */
  pressed: string;
  /** 押したあとに調べたとき（E 作）。 */
  after: string;
}

export const FUSHIGI3: Record<string, Fushigi3> = {
  fushigi_ch3_01: {
    title: '真下の 影',
    place: '港',
    book: '影が、足の 真下に しか ない。太陽が、ずっと 真上だ。',
    pressed: `@narr
足の 下の 影が、
ほんの 少し ゆれた。`,
    after: `@narr
影は、足の 下で
じっと している。`,
  },
  fushigi_ch3_02: {
    title: '41杯目の 茶わん',
    place: '食堂かもめ',
    book: '茶わんの 底に、小さな 字。『40年 ありがとう』。',
    pressed: `@narr
いちばん 上の 茶わんが、
カタッと 小さく 鳴った。`,
    after: `@narr
ゴロウの 茶わんの 山。
いちばん 上が、41杯目。`,
  },
  fushigi_ch3_03: {
    title: '鏡の 海',
    place: '防波堤の先',
    book: '波が ない。海に 空が そのまま 写っている。',
    pressed: `@narr
鏡の 海に、しゅんと
グソっ君の 顔が 写った。`,
    after: `@narr
海に 空が 写っている。
……雲も、動かない。`,
  },
  fushigi_ch3_04: {
    title: '空中の カモメ',
    place: '市場の屋根の上',
    book: '羽を ひろげたまま、カモメが 空に 置いてある。',
    pressed: `@narr
カモメが、片目だけ
ぱちっと まばたきした。`,
    after: `@narr
カモメは、空の 同じ 所に
置いてある。`,
  },
  fushigi_ch3_05: {
    title: '昼の 灯台',
    place: '灯台のレンズの部屋',
    book: 'レンズの 中に、小さな 太陽が いくつも 入っている。',
    pressed: `@narr
レンズの 中の 太陽が、
いっせいに きらっと 光った。`,
    after: `@narr
レンズの 中で、小さな 太陽が
ならんで 光っている。`,
  },
  fushigi_ch3_06: {
    title: '干物の 年輪',
    place: '干物屋の干し台',
    book: '干しすぎた アジの 開きに、日の あとが 輪に なっている。',
    pressed: `@narr
アジの 開きの 輪が、
ひとつ ふえた 気が した。`,
    after: `@narr
干しすぎた アジの 開き。
輪は、数えきれない。`,
  },
  fushigi_ch3_07: {
    title: '40年の 伝票',
    place: '回廊の壁',
    book: '40年で、1枚だけ 白い。日付だけが 書いてある。',
    pressed: `@narr
白い 伝票の すみに、
朱の しるしが 小さく 残った。`,
    after: `@narr
白紙の 日の 伝票。
すみに、朱の しるし。`,
  },
  fushigi_ch3_08: {
    title: '3つの 町の 時計',
    place: 'ジオラマの部屋',
    book: '5:00、4:59、12:00。……2つは、もう 動いている。',
    pressed: `@narr
12:00 の 時計の 秒針が、
ぴくりと 動きかけた。`,
    after: `@narr
5:00、4:59、12:00。
3つめは、まだ 待っている。`,
  },
  fushigi_ch3_09: {
    title: '降る 雪の 展示',
    place: '深海の展示室',
    book: '展示の 中で、白い 粒が ゆっくり 下へ 降っている。',
    pressed: `@narr
白い 粒が 1つだけ、
ふわっと 上へ のぼった。`,
    after: `@narr
白い 粒が、ゆっくり
下へ 降っている。`,
  },
  fushigi_ch3_10: {
    title: '退勤の 打刻',
    place: '大水槽のホール',
    book: 'タイムカードに、はじめて『退勤』の 字。',
    pressed: `@narr
タイムカードに、はじめて
『退勤』の 字。`,
    after: `@narr
エゴの タイムカード。
『退勤』の 字が、乾いている。`,
  },
};

/** 押したあとの ごほうびの文（朱肉 +2、③ の数）。 */
export function fushigiRewardCh3(n: number): string {
  return `@sys
朱肉が 2 たまった。
みました帳 ③に 書きこんだ。（ふしぎ ${n}/10）`;
}

/** 調べる物：ゴロウの茶わんの山（62 4.3 obj_c3_chawan。60 9.3 の文がないので、60 8章の文）。 */
export const CHAWAN = `@narr
ゴロウの 前に、茶わんの 山。
いちばん 上は、41杯目。
/
茶わんの 底に、小さな 字。
『40年 ありがとう』。`;
export const CHAWAN_LATER = `@narr
ゴロウの 茶わんの 山。
……もう、ふえていない。`;
