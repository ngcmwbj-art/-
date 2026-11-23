// はく 前に、ふる（げむきか 10/21 の 案4、2026-10-21 依頼主の 採用。02_ch2_index #111）。第2章、段階0〜2。
// 棚田の 4段目の 畦の トマじい (21,11) の 今の 会話の あと、もう 1回 話すと〔kutsu〕。分校の 昇降口の 外（像の 東
// (29,28)）に 寄り合いの 人と 座布団で 眠っている 人の 長靴が 6足。
//
//   1 ぽとん（トマじいの〔kutsu〕：長靴を ぬいで ふる、アマガエル）→ flag_ku_start
//   2 たまげる（ふって おいて やれ）。段階0 は 1・2 だけ（昇降口の 外は 暗くて 長靴の 中が 見えない）
//   3 逆さに して、ふる（大写し「長靴」。1足ごとに 出方が ちがう：はりつく・待つ・跳ぶ・糸で 下りる）
//     出てきた 物は 手の ひらに のせて、校庭の すみの 草 (27,30) へ 帰す。グソっ君の 番（区長の 長靴に 片足）
//   4 帰したれ（トマじいに 話す。帰した 数で 1行 変わる）→ 5 ごほうび（朱肉 +2、みました帳②の すみ）
//
// 決まり：第2章の 台詞に 時刻の 数字・「まだ」・第3章の 中身・「いただきます」を 入れない。地の文・名札の 名前に
// 「さん」なし（台詞の「区長さん」は 呼び方）。天丼の 口ぐせは 使わない。トマじいの「待つのは、下手じゃ」は もじりで
// 1回だけ、「トマトは 作っとらん」は 使わない。ムカデは 台詞だけ（絵は 出さない）。生き物は つかまない・はさまない、
// 手の ひらに のせて 草へ 帰す。1ページ 3行 × 336px。
//
// 生き物（依頼主「夏の虫だからその辺調べて」→ リードの 調べ、docs/ideas/2026-10-21.md）：8月末の 山の 村の 夜に
// いる 5つ。エンマコオロギの 声は 自由研究（hoshi_mushi.ts）と 同じ「コロコロリー」に そろえた。

/** 長靴 6足（左から）と、中の 生き物。 */
export type KuBootKey = 'kucho' | 'yoshie' | 'fumi' | 'take' | 'shige' | 'sugi';
export type KuMonKey = 'enma' | 'kaeru' | 'name' | 'kama' | 'kumo';

export const KU_BOOTS: { key: KuBootKey; owner: string; mon: KuMonKey | null }[] = [
  { key: 'kucho', owner: '区長', mon: 'enma' },
  { key: 'yoshie', owner: 'ぴょん夫人', mon: 'kaeru' },
  { key: 'fumi', owner: 'まつ先生', mon: null },
  { key: 'take', owner: 'タケじい', mon: 'name' },
  { key: 'shige', owner: 'シゲじい', mon: 'kama' },
  { key: 'sugi', owner: 'スギばあ', mon: 'kumo' },
];

/** 生き物の 名前（大写しの 札・帳面）と、文の 中の 呼び名。 */
export const KU_MONS: Record<KuMonKey, { name: string; word: string }> = {
  kaeru: { name: 'アマガエル', word: 'アマガエル' },
  enma: { name: 'エンマコオロギ', word: 'コオロギ' },
  kama: { name: 'カマドウマ', word: 'カマドウマ' },
  name: { name: 'ナメクジ', word: 'ナメクジ' },
  kumo: { name: '小さな クモ', word: 'クモ' },
};
/** 帳面の 順（○/5）。 */
export const KU_MON_ORDER: KuMonKey[] = ['kaeru', 'enma', 'kama', 'name', 'kumo'];

// ================================================================ 1 ぽとん（トマじいの〔kutsu〕）

/** トマじいが 長靴を ぬいで、逆さに する（この あと ふる 動き）。 */
export const KU_A0 = `@narr
トマじいが、長靴を
片方 ぬいだ。{w=300}
逆さに して、ふる。`;

export const KU_A = `@narr
……ぽとん。
/
長靴の 中から、{w=300}
アマガエルが 1ぴき。
@npc_kanenari
住んどった！{w=300}
長靴に、住んどった！
@npc_hoshi_tome
はく 前に、ふる。{w=300}
……80年、毎朝
やっとる。
/
外に 置いた 長靴は、{w=300}
夜の うちに、
だれかが 入る。
/
カエルなら ええ。{w=300}
……ムカデの ことも
ある。
@npc_kanenari
ひぇっ。
@narr
カエルは、{w=300}
田の 水の ほうへ
はねて いった。`;

// ================================================================ 2 たまげる

export const KU_B = `@npc_hoshi_tome
集会所の 前にも、{w=300}
長靴が 並んどる じゃろ。
/
朝に なったら、{w=300}
みんな はく。
/
……ばあさんらが、{w=300}
たまげる。
/
ふって おいて やれ。{w=300}
わしは、水を 見とる。
@npc_kanenari
自分で 行かへんの？
@npc_hoshi_tome
……水は、{w=300}
目を はなすと
すねる。`;

/** はじめた あと、6足 ふる 前に もう一度（1回）。 */
export const KU_WAIT = `@npc_hoshi_tome
……ふって おいて やれ。{w=300}
わしは、水を 見とる。`;

/** 6足 ふったが、手の ひらに 生き物が いる。 */
export const KU_TE = `@npc_hoshi_tome
……手の 中の もんは、{w=300}
草へ じゃ。`;

// ================================================================ 3 逆さに して、ふる（大写し「長靴」）

/** 長靴を 調べた：段階0（暗い）。 */
export const KU_KURAI = `@narr
昇降口の 外に、{w=300}
長靴が 6足。
/
暗くて、{w=300}
中が 見えない。`;

/** 長靴を 調べた：はじめる 前（段階1〜2）。 */
export const KU_BEFORE = `@narr
昇降口の 外に、{w=300}
長靴が 6足。
口の ところに、名前の 字。`;

/** 長靴を 調べた：ふり おわった あと・すんだ あと。 */
export const KU_SOROE = `@narr
長靴が、{w=300}
そろえて ある。`;

/** やり方（はじめの 1回）。 */
export const KU_RULE = `@narr
どの 長靴から でも いい。{w=300}
逆さに して、
←→か けっていで ふる。`;

/** 1足ごとの 出方（台本は 1足 1ページ〈と ツッコミ〉）。 */
export const KU_OUT: Record<KuBootKey, string> = {
  kucho: `@narr
ころん。{w=300}
……コオロギ。
@npc_kanenari
区長さんの 長靴で、{w=300}
コロコロリー 言うとったんか。`,
  yoshie: `@narr
ぺた。{w=300}
……長靴の 内がわに
はりついている。`,
  fumi: `@narr
何も 出ない。
@npc_kanenari
先生は、{w=300}
ふってから 脱いだんやな。`,
  take: `@narr
……出ない。{w=300}
のぞくと、ナメクジが
ゆっくり。`,
  shige: `@narr
ぴょーん！
@npc_kanenari
どこ 行くねん！
@narr
……校庭の すみの、{w=300}
草の 上に 着いた。`,
  sugi: `@narr
糸を ひいて、{w=300}
すうっと 下りた。
……小さな クモ。`,
};

/** ぴょん夫人の 長靴：もう 1回 ふると 落ちる。 */
export const KU_KAERU_OCHI = `@narr
……ぽとん。{w=300}
アマガエル。
@npc_kanenari
ぴょん夫人の 長靴に、{w=300}
ほんまに ぴょん、や。`;

/** タケじいの 長靴：灯りを 当てたまま 待つ（はじめの 1回）。 */
export const KU_MATSU = `@narr
灯りを 当てたまま、{w=300}
待って みる。`;

/** 待って いる 間に ふった（1回）。 */
export const KU_SEKU = `@narr
ナメクジは、{w=300}
角を ひっこめた。`;

/** 口まで 来た。 */
export const KU_NAME_DETA = `@narr
ナメクジが、{w=300}
口まで 来た。
@npc_kanenari
急かしたら あかん。{w=300}
……わいも 遅いほうや。`;

/** 待たずに やめた。 */
export const KU_NAME_YAME = `@narr
ナメクジは、{w=300}
長靴の 奥で 止まった。`;

/** 手の ひらに のせる（グソっ君。はじめの 1回は ていねいに、あとは 短く）。 */
export function kuTe(word: string, first: boolean, kn: boolean): string {
  if (first)
    return kn
      ? `@narr
グソっ君は、{w=300}
はさまずに、両手の ひらに
${word}を のせた。`
      : `@narr
しゅんは、そっと {w=300}
手の ひらに
${word}を のせた。`;
  return `@narr
手の ひらに、{w=300}
${word}。`;
}

/** かくし：寝言しりとり（flag_ch2_negoto_n）を 見ている → スギばあの 長靴の あと（1回。今の 寝言の 文の まま）。 */
export const KU_NEGOTO = `@narr
!se se_h_acha
集会所の 中から、寝言。{w=300}
『……あちゃ〜……』`;

/** グソっ君の 番（6足目の あと）。 */
export const KU_KN_BAN = `@narr
グソっ君が、{w=300}
いちばん 大きい 区長の
長靴に、片足を 入れて みる。
/
……入らない。
@npc_kanenari
わかるで。{w=300}
暗くて しめっとって、
ええ 部屋や。
/
……わいには、{w=300}
せまいけど。`;

/** 6足 ふった あと、手の ひらに 生き物が いる。 */
export const KU_KUSA_HINT = `@narr
手の ひらの 生き物を、{w=300}
校庭の すみの 草へ。`;

/** 草へ 帰す（1つずつ）。 */
export function kuKaesu(word: string): string {
  return `@narr
${word}を、{w=300}
草へ 帰した。`;
}

/** かくし：捕まえない 自由研究（flag_ch2_mushi_done）が すんでいる → はじめて 草へ 帰した とき（1回）。 */
export const KU_JIYUU = `@npc_kanenari
自由研究の 続きや。{w=300}
……見て、帰す。`;

// ================================================================ 4 帰したれ

export const KU_D_A = `@npc_hoshi_tome
……ふったか。
/
何が 出た。`;

/** 出てきた 物を 指で 数える（グソっ君。いなければ しゅん）。 */
export function kuNames(words: string[], kn: boolean): string {
  const lines: string[] = [];
  let cur = '';
  words.forEach((w, i) => {
    const part = i < words.length - 1 ? `${w}に、` : `${w}や。`;
    if (cur && (cur + part).length > 14) {
      lines.push(cur);
      cur = part;
    } else cur += part;
  });
  if (cur) lines.push(cur);
  if (!kn)
    return `@narr
しゅんは、{w=300}
指を おって 数えた。`;
  return `@npc_kanenari
${lines.slice(0, 3).join('\n')}`;
}

/** 帰した 数で 1行 変わる（第2章なので「まだ」は 入れない）。 */
export const KU_D_ALL = `@npc_hoshi_tome
……よう 入っとった のう。`;
export const KU_D_NETORU = `@npc_hoshi_tome
……1つ、{w=300}
寝とるかも しれん。`;

/** かくし：農具小屋の 杭の 逆さの 長靴を 見ている（1回）。 */
export const KU_D_KUI = `@npc_hoshi_tome
逆さに して おけば、{w=300}
だれも 入らん。
@npc_kanenari
最初から {w=300}
そう したら ええやん。
@npc_hoshi_tome
……集会所に、{w=300}
杭は ない。`;

/** 決めゼリフ。 */
export const KU_D_KIME = `@npc_hoshi_tome
はく 前に、ふる。
/
……出てきた もんは、{w=300}
草へ 帰したれ。
@npc_kanenari
帰したで。{w=300}
みんな、草の 中や。
@npc_hoshi_tome
ほう。{w=300}
……待つのは 下手じゃが、
ふるのは うまい。`;

/** グソっ君が いない とき（しゅんが うなずく）。 */
export const KU_D_KIME_SOLO = `@npc_hoshi_tome
はく 前に、ふる。
/
……出てきた もんは、{w=300}
草へ 帰したれ。
@narr
しゅんは、うなずいた。
@npc_hoshi_tome
ほう。{w=300}
……待つのは 下手じゃが、
ふるのは うまい。`;

// ================================================================ 5 ごほうび・すんだ あと

export const KU_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳②の すみに、
『はく 前に、ふる』の
ページ。`;

/** すんだ あと、トマじいに もう一度（1回）。 */
export const KU_TOME_AFTER = `@npc_hoshi_tome
昼は、逆さに して 干す。{w=300}
……中の 奥まで、
よう 乾く。`;

/** 農具小屋の 杭（地の文だけ）。 */
export const KU_KUI = `@narr
小屋の 横の 杭に、{w=300}
長靴が 1足、
逆さに さして ある。`;

// ================================================================ 大写し・帳面

export const KU_UI = {
  place: '長靴',
  /** 札：〇〇の 長靴。 */
  boot: (owner: string) => `${owner}の 長靴`,
  count: (n: number) => `長靴 ${n}/6`,
  mons: (n: number) => `生き物 ${n}/5`,
  bandPick: '←→ えらぶ　けってい 逆さに',
  bandFuru: '←→ か けってい で ふる',
  bandMatsu: '待つ（押さない）　× やめる',
  karappo: 'からっぽ',
};

/** みました帳②の すみの 1ページ（ui/menu/book_kutsu.ts）。 */
export const KU_BOOK = {
  title: 'はく 前に、ふる',
  label: '帰した 生き物',
  /** トマじいの 決めゼリフ（ページの 幅で 4行に）。 */
  quote: ['はく 前に、ふる。', '……出てきた', 'もんは、', '草へ 帰したれ。'],
};

export const KU_TEXTS: Record<string, unknown> = {
  KU_A0, KU_A, KU_B, KU_WAIT, KU_TE, KU_KURAI, KU_BEFORE, KU_SOROE, KU_RULE, KU_OUT, KU_KAERU_OCHI, KU_MATSU, KU_SEKU,
  KU_NAME_DETA, KU_NAME_YAME, KU_NEGOTO, KU_KN_BAN, KU_KUSA_HINT, KU_JIYUU, KU_D_A, KU_D_ALL, KU_D_NETORU, KU_D_KUI,
  KU_D_KIME, KU_D_KIME_SOLO, KU_REWARD, KU_TOME_AFTER, KU_KUI,
  // the made-up pages, every one of their forms
  te: KU_MON_ORDER.flatMap((k) => [kuTe(KU_MONS[k].word, true, true), kuTe(KU_MONS[k].word, true, false), kuTe(KU_MONS[k].word, false, true)]),
  kaesu: KU_MON_ORDER.map((k) => kuKaesu(KU_MONS[k].word)),
  names: [
    kuNames(KU_MON_ORDER.map((k) => KU_MONS[k].word), true),
    kuNames(KU_MON_ORDER.filter((k) => k !== 'name').map((k) => KU_MONS[k].word), true),
    kuNames(['コオロギ'], false),
  ],
};
