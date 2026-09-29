// 捕まえない自由研究（50_ch2_story 10.21、02_ch2_index #64）: the pages. グソっ君
// talks しゅん into it once the lantern is lit (at the greenhouse door, after
// ペロ's line): the net is full of tomato, so it is a 自由研究 of looking, not
// catching. Five insects of an August night in a mountain village (53 1.6),
// each where it really lives; the fifth makes しゅん give the page its title —
// he has come to like telling their voices apart — and from then on what he
// notices about each is a little more (〔くわしく〕). ぴょん夫人 hears of it
// (「……ええ 耳ね。」, 朱肉 +2). The beetle at the クヌギ is a bonus, not counted.
// ★2026-09-29 カネナリくん→グソっ君 (@npc_kanenari, no flips): at the fifth,
// 「わいは 数に 入れんといてや。エビや カニの なかまやからな」.

import type { MushiKind } from '../../art/props/hoshi_mushi';

/** グソっ君's invitation (once, after 〔ハウスを出たとき〕). */
export const MUSHI_INVITE = `@npc_kanenari
なあ、しゅん。{w=300}
この 灯りで、村中の 虫、
探して みいひん？
/
アミは トマトで いっぱいやから、
捕まえへんで。{w=300}
見るだけの 自由研究や。
@sys
みました帳 ②に、
『むし』の らんが できた。`;

export interface MushiText {
  /** The first time: what is seen and heard. */
  first: string;
  /** Again, before the fifth. */
  again: string;
  /** Again, after the fifth (〔くわしく〕: しゅん notices more). */
  more: string;
}

export const MUSHI_TEXT: Record<Exclude<MushiKind, 'kabuto'>, MushiText> = {
  kantan: {
    first: `@narr
ヨモギの 葉の 上に、
うすい 緑の 虫。{w=300}
羽を 立てて、ルルルル……。
/
カンタン。{w=300}
声は 大きいのに、体は
草と 同じ 色を している。`,
    again: `@narr
カンタンは、まだ 鳴いている。
{w=300}ルルルル……。`,
    more: `@narr
カンタン。{w=300}
ルルルル……は、息つぎを しない。
/
近づくと 止まって、
はなれると、また 鳴く。`,
  },
  enma: {
    first: `@narr
石垣の すきまから、
黒い 顔が のぞいている。
{w=300}コロコロリー……。
/
エンマコオロギ。{w=300}
まゆげが こわい だけで、
歌は やさしい。`,
    again: `@narr
コロコロリー……。{w=300}
石垣の 奥で、もう 1ぴき。`,
    more: `@narr
エンマコオロギ。{w=300}
コロコロリーは、となりへの
「ここに いるよ」。
/
けんかの ときの 声は、
もっと 短くて、強い。`,
  },
  kutsuwa: {
    first: `@narr
クズの 大きな 葉の 上。{w=300}
緑の 太い 虫が、
ガチャガチャ ガチャガチャ……。
@npc_kanenari
ガチャガチャ いうても、
100円は いらんのやな。
@narr
クツワムシ。{w=300}
馬の くつわが 鳴る 音に
にている から、この 名前。`,
    again: `@narr
ガチャガチャ……。{w=300}
やっぱり、100円は 入れない。`,
    more: `@narr
クツワムシ。{w=300}
ガチャガチャの 前に、
ジー……と、助走が ある。`,
  },
  umaoi: {
    first: `@narr
桜の 根もとの 草に、
細い 緑の 虫。{w=300}
スイーッ……チョン。
/
ウマオイ。{w=300}
分校の 桜の 下の、
夜の 当番 らしい。`,
    again: `@narr
スイーッ……{w=600}チョン。{w=300}
当番は、今夜も 休まない。`,
    more: `@narr
ウマオイ。{w=300}
前あしの とげは、
虫を つかまえる ための もの。
/
……鳴いている あいだは、
なにも つかまえない。`,
  },
  suzu: {
    first: `@narr
飼育ケースの 中で、黒い 虫が
羽を 立てた。{w=300}
リーン……。
/
スズムシ。{w=300}
この 村で ただ 1つ、
家の 中で 鳴く 声。`,
    again: `@narr
リーン……。{w=300}
金魚も、聞いている 顔を している。`,
    more: `@narr
スズムシ。{w=300}
羽を 立てて 鳴くのは、
オスだけ。
/
ナスの 切れはしは、
晩ごはんの あまり らしい。`,
  },
};

/** The rearing case before the research has begun (an ordinary thing in her room). */
export const MUSHI_CASE_PLAIN = `@narr
金魚鉢の となりに、飼育ケース。
{w=300}ふたに、ぴょん夫人の 字で
『リーン』。`;

/** The beetle at the クヌギ (a bonus, not counted). `genjiro`: he looked at his own in chapter 1. */
export const KABUTO_FIRST_GENJIRO = `@narr
クヌギの 樹液に、カブトムシ。
/
……ゲンジロウより、
ひとまわり 大きい。
/
あした、放しに 行く 約束を
思いだした。`;
export const KABUTO_FIRST = `@narr
クヌギの 樹液に、カブトムシ。
{w=300}灯りに 気づいても、
食事を やめない。`;
export const KABUTO_AGAIN = `@narr
カブトムシは、まだ 食事中。
{w=300}……鳴かない 虫も いる。`;

/** After each of the five, the first time. */
export function mushiCountText(n: number): string {
  return `@sys
みました帳 ②に 書きこんだ。
（むし ${n}/5）`;
}

/** The fifth: the page gets its title, and しゅん has come to like it. */
export const MUSHI_BLOSSOM = `@narr
しゅんは、『むし』の ページの
いちばん 上に、題を 書いた。
{w=300}『星見台の 夜の 虫』。
/
5つの 声の 横に、
5つの 絵。
/
しゅんは、虫の 声を
聞きわけるのが、
好きに なって いた。
@npc_kanenari
5つ そろたな！{w=300}
来年の 自由研究も、決まりやな。
/
……あ、わいは 数に
入れんといてや。{w=300}
エビや カニの なかまやからな。`;

/** ぴょん夫人, the next talk after the fifth (once): 朱肉 +2. */
export const MUSHI_YOSHIE = `@npc_hoshi_yoshie
あら、あんた。{w=300}
虫の 声、5つ 聞きわけたの。
/
……ええ 耳ね。`;
export const MUSHI_YOSHIE_GET = `@sys
朱肉が 2 たまった。`;
export const MUSHI_YOSHIE_FLIP = `@npc_kanenari
しゅん、耳 赤なっとるで。`;

/** みました帳 ②『むし』: the index name, the call, the place, しゅん's note (the beetle's: ゲンジロウ's, if he looked at his own in chapter 1), and — not seen yet — where the voice comes from. */
export const MUSHI_BOOK: { kind: MushiKind; name: string; call: string; place: string; note: string; hint: string; noteGenjiro?: string }[] = [
  { kind: 'kantan', name: 'カンタン', call: 'ルルルル……', place: '棚田の 石段の ヨモギ', note: '声は 大きいのに、草と 同じ 色。', hint: '棚田の 石段の ほうから' },
  { kind: 'enma', name: 'エンマコオロギ', call: 'コロコロリー', place: '東の 台地の 石垣', note: 'まゆげが こわい だけ。', hint: '牛舎の 下の 石垣から' },
  { kind: 'kutsuwa', name: 'クツワムシ', call: 'ガチャガチャ', place: '耕作放棄地の クズ', note: '100円は 入れない。', hint: '耕作放棄地の やぶから' },
  { kind: 'umaoi', name: 'ウマオイ', call: 'スイーッチョン', place: '分校の 桜の 下', note: '分校の 桜の、夜の 当番。', hint: '分校の 桜の ほうから' },
  { kind: 'suzu', name: 'スズムシ', call: 'リーン', place: 'ほうき家の 飼育ケース', note: 'ふたに『リーン』。', hint: 'だれかの 家の 中から' },
  { kind: 'kabuto', name: 'カブトムシ', call: '（鳴かない）', place: '山道の 入口の クヌギ', note: '灯りに 気づいても、食事中。', hint: '', noteGenjiro: 'ゲンジロウより、ひとまわり 大きい。' },
];

/** The page's title once the five are seen. */
export const MUSHI_PAGE_TITLE = '星見台の 夜の 虫';

/** Every page (textcheck2 walks these). */
export const MUSHI_PAGES: Record<string, unknown> = {
  invite: MUSHI_INVITE,
  text: MUSHI_TEXT,
  case_plain: MUSHI_CASE_PLAIN,
  kabuto: { genjiro: KABUTO_FIRST_GENJIRO, first: KABUTO_FIRST, again: KABUTO_AGAIN },
  count: mushiCountText(5),
  blossom: MUSHI_BLOSSOM,
  yoshie: { talk: MUSHI_YOSHIE, get: MUSHI_YOSHIE_GET, flip: MUSHI_YOSHIE_FLIP },
};
