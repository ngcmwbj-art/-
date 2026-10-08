// グソっ君の はじめて帳（げむきか 10/7 の案5。2026-10-08 依頼主の採用。docs/ideas/2026-10-07.md の
// 「### 5.」、02_ch2_index #89、10_narrative 6.27、50_ch2_story 10.29、04_gusokkun_plan 1章）。
//
//   みました帳 ① ② の うしろの 欄『はじめて』（『みずべ』の うしろ）。1ページに 1つ：しゅんの えんぴつの 絵、
//   教えて くれた 人、グソっ君の ひとこと、グソっ君が 自分で つける「びっくり度」★1〜5。
//   ① 夕鳴町：今ある グソっ君の ひとことの 4つ（売れ残りの 焼きそば・ラムネ・みかん・自販機）と、
//     出来たての 焼きそば（エンディングの あと、自動。★6 で 欄から はみ出す）、町の 8人の はじめて。
//     らん外：『北東へ 流れる 打ち水』（段階2 の ちず。案の「段階1 の 1ページ」を 合わせた。下の メモ）。
//   ② 星見台：村の 6人の はじめて。ぜんぶ うめると ② の いちばん下に『裏表紙』。
//
// 決まり：1ページ3行・1行336px。第1章の台詞に「17」「まだ」「平和」「3人」を 入れない。第2章の 台詞に
// 時刻の 数字・「12人」「1日2本」「おまけの1つ」「具足様」「まだ」を 入れない。名札・地の文では 名前に
// 「さん」を つけない。グソっ君は 関西弁・わい・敬語なし。「はじめての もんは、忘れたら もったいない」は
// ばれない 程度の 伏線のまま（どこから 来たか・だれに 呼ばれて いたかは 言わない）。
// 字の幅は __game.cmd.textcheck2()・__game.cmd.hajimeteText()・__game.cmd.wrapCheck() で 見る。
//
// 案から 合わせた 所：
//   ・第1章の 段階1 は、グソっ君が 仲間に なると すぐ 練習の 戦闘と 迷子の 放送で 段階2 に なるので、
//     打ち水の ふえる 1ページは 段階2 の「打ち水が ぜんぶ 北東へ 流れる」（ちずの いつもの 台詞）に 合わせた。
//   ・新聞の グソっ君「海の 底は、きのうも きょうも、同じ 暗さやで。」は、時計店の ひとこと「海の 底には、
//     時計 なかったで。朝も 夜も、ずっと 同じ 色や。」と 重なるので、紙の 話に かえた。

import { flag } from '../../game/state';

/** ページの 1つ。 */
export interface HajimeteEntry {
  id: string;
  vol: 1 | 2;
  /** 一覧と ページの 名前 */
  name: string;
  /** 教えて くれた 人（ページの えんぴつ） */
  from: string;
  /** グソっ君の ひとこと（ページ。2行まで） */
  note: string;
  /** びっくり度（0 は「？」） */
  stars: number;
  /** うまって いない とき：どこで 教わるか（1行。'' は 点線だけ） */
  hint: string;
  /** 教えて くれる 人（話すと 1回）。今ある ひとことの 4つと 出来たてには ない */
  npc?: string;
  /** らん外（数に 入れない） */
  bonus?: boolean;
}

export const HAJIMETE: HajimeteEntry[] = [
  // ---- ① 夕鳴町：04 の ネタの 柱（今ある ひとことを 見ていれば 先に 入る）と 出来たて
  { id: 'urenokori', vol: 1, name: '売れ残りの 焼きそば', from: 'たかしの 店', note: '「な、なんやこれ……！！」', stars: 5, hint: '' },
  { id: 'dekitate', vol: 1, name: '出来たての 焼きそば', from: 'たかしの 店', note: '「めっちゃ美味いやんけ！」', stars: 6, hint: '' },
  { id: 'ramune', vol: 1, name: 'ラムネ', from: 'しゅん', note: '「な、なんや この しゅわしゅわ……！」', stars: 4, hint: 'わけて あげたら？' },
  { id: 'mikan', vol: 1, name: 'みかん', from: 'しんごの 家', note: '「みかんて、皮 むくんか。」', stars: 4, hint: 'しんごの 家？' },
  { id: 'jihanki', vol: 1, name: '自販機', from: 'おじぎ自販機', note: '「陸の あいさつ、覚えたで。」', stars: 3, hint: 'モールの 入口？' },
  // ---- ① 町の 8人（話すと 1回。どの 順でも）
  { id: 'uchimizu', vol: 1, name: '打ち水', from: 'ちず', note: '「陸は、地面まで のど かわくんか。」', stars: 3, hint: '川べり通りの ちず？', npc: 'npc_mizumaki' },
  { id: 'tofu', vol: 1, name: '豆腐', from: 'くま吉', note: '「豆の 味、あとから 来た！」', stars: 4, hint: '豆腐屋の くま吉？', npc: 'npc_mamekichi' },
  { id: 'higasa', vol: 1, name: '日傘', from: 'なんばるわん', note: '「よろいも、日焼け するんかな。」', stars: 2, hint: '坂の なんばるわん？', npc: 'npc_madam' },
  { id: 'shinbun', vol: 1, name: '新聞', from: 'ピー・コック', note: '「毎朝、新しい 紙が 来るんか！」', stars: 3, hint: 'ピー・コックの 家？', npc: 'npc_kazuo' },
  { id: 'fude', vol: 1, name: '筆と 墨', from: 'ふでの先生', note: '半紙に、大きく『グ』。', stars: 4, hint: '書道教室？', npc: 'npc_fudeno' },
  { id: 'kansouki', vol: 1, name: '乾燥機', from: 'えすけ', note: '「深い 海の 流れより、速いで。」', stars: 2, hint: 'コインランドリー？', npc: 'npc_inui' },
  { id: 'keirei', vol: 1, name: '敬礼', from: 'ワイスタ巡査', note: '「どの 手で するん？」', stars: 3, hint: '交番の 巡査？', npc: 'npc_tsurumi' },
  { id: 'atari', vol: 1, name: '当たり', from: 'おばあ', note: '「永遠に 食べられるやん！」', stars: 5, hint: 'ひのやの おばあ？', npc: 'npc_obaa' },
  // らん外：段階2 の ちず（打ち水が ぜんぶ 北東へ）。★は つけられない
  { id: 'uchimizu_ne', vol: 1, name: '北東へ 流れる 打ち水', from: 'ちず', note: '「陸の ふつうや なかった。」', stars: 0, hint: '', bonus: true },
  // ---- ② 星見台：村の 6人（h0〜h2 の どこでも）
  { id: 'tsukemono', vol: 2, name: '漬物', from: 'ぴょん夫人', note: '「すっぱ！ しょっぱ！ もう 1切れ。」', stars: 4, hint: '集会所の ぴょん夫人？', npc: 'npc_hoshi_yoshie' },
  { id: 'tomatoha', vol: 2, name: 'トマトの 葉の におい', from: 'ペロ', note: '「葉っぱが、トマトの においや！」', stars: 3, hint: 'ハウスの ペロ？', npc: 'npc_hoshi_mitsu' },
  { id: 'inaho', vol: 2, name: '稲の 穂', from: 'トマじい', note: '「わいは、はじめから 頭 低いで。」', stars: 4, hint: '棚田の トマじい？', npc: 'npc_hoshi_tome' },
  { id: 'iro', vol: 2, name: '色を まぜる', from: 'ソワカ', note: '「青と 黄色で、緑や！ 魔法か！」', stars: 3, hint: 'ソワカの 家？', npc: 'npc_hoshi_sawako' },
  { id: 'shikiji', vol: 2, name: '式辞', from: 'ハモ区長', note: '「長い！ けど、ねむなる ええ 声や。」', stars: 2, hint: '集会所の ハモ区長？', npc: 'npc_hoshi_kucho' },
  { id: 'tegami', vol: 2, name: '手紙', from: 'さんかど', note: '「『村、まっくらやで』って 書こか。」', stars: 3, hint: '郵便の さんかど？', npc: 'npc_hoshi_busdriver' },
];

export const HAJIMETE1 = HAJIMETE.filter((e) => e.vol === 1 && !e.bonus);
export const HAJIMETE2 = HAJIMETE.filter((e) => e.vol === 2);
/** 町の 8人。 */
export const HAJIMETE_TOWN = HAJIMETE1.filter((e) => !!e.npc);

// ================================================================ フラグ
//   flag_hajimete_book / flag_hajimete_book2   ① ② に 欄が できた
//   flag_hajimete_<id>                          その ページを 教わった（町の 8人・村の 6人・らん外）
//   今ある ひとことの 4つと 出来たて：flag_kanenari_joined（売れ残り）、flag_kn_says_item_ramune（ラムネを
//   グソっ君に。もちもの・戦闘）、flag_kanenari_flip_map_shingo（しんごの 家の ひとこと）、flag_ojigi_beaten
//   （おじぎ自販機の あとの「陸の あいさつ、覚えたで。」）、flag_clear（第1章の エンディング）

export const HF = {
  book: 'flag_hajimete_book',
  book2: 'flag_hajimete_book2',
  /** ① の 8人 ／ ② の 6人：朱肉 +2 */
  reward1: 'flag_hajimete_reward1',
  reward2: 'flag_hajimete_reward2',
  /** 裏表紙の 場面を 見た */
  ura: 'flag_hajimete_ura',
} as const;

export const pageFlag = (id: string): string => `flag_hajimete_${id}`;

/** その ページが うまって いるか。 */
export function hajimeteDone(id: string): boolean {
  switch (id) {
    case 'urenokori':
      return flag('flag_kanenari_joined') > 0;
    case 'dekitate':
      return flag('flag_clear') > 0;
    case 'ramune':
      return flag('flag_kn_says_item_ramune') > 0;
    case 'mikan':
      return flag('flag_kanenari_flip_map_shingo') > 0;
    case 'jihanki':
      return flag('flag_ojigi_beaten') > 0 && flag('flag_kanenari_joined') > 0;
  }
  return flag(pageFlag(id)) > 0;
}

/** 欄が あるか。 */
export function hajimeteBook(vol: 1 | 2): boolean {
  return flag(vol === 1 ? HF.book : HF.book2) > 0;
}

/** [うまった 数, ぜんぶ]（らん外は 入れない）。 */
export function hajimeteCount(vol: 1 | 2): [number, number] {
  const list = vol === 1 ? HAJIMETE1 : HAJIMETE2;
  return [list.filter((e) => hajimeteDone(e.id)).length, list.length];
}

/** ① ② ぜんぶ（裏表紙）。「第2章から」の 人は ① が ないので 出ない。 */
export function hajimeteAll(): boolean {
  if (!hajimeteBook(1) || !hajimeteBook(2)) return false;
  const [a, b] = hajimeteCount(1);
  const [c, d] = hajimeteCount(2);
  return a === b && c === d;
}

/** ★の 合計（その 帳の うまった ページ。らん外の「？」は 0）。 */
export function hajimeteStars(vol: 1 | 2): number {
  return HAJIMETE.filter((e) => e.vol === vol && hajimeteDone(e.id)).reduce((a, e) => a + e.stars, 0);
}

/** 欄の 名前（みました帳の 見出しの つまみ）。 */
export const HAJIMETE_TAB = 'はじめて';
/** ② の いちばん下の 行（ぜんぶ うめたあと）。 */
export const URA_ROW = '裏表紙';
/** 裏表紙の 題（グソっ君の 字）と ひとこと。 */
export const URA_TITLE = '『はじめての ともだち』';
export const URA_NOTE = '「★は、つけられへん。数えきれんから。」';
/** 「教えて くれた 人」の 書き方。 */
export function fromLine(e: HajimeteEntry): string {
  return e.npc || e.bonus ? `${e.from}に 教わった` : e.id === 'ramune' ? `${e.from}に もろた` : e.from;
}

// ================================================================ はじまり

/** 第1章：グソっ君が 仲間に なってから、はじめて ふしぎに『みました』を 押したとき（または 8人の だれかに 話したとき）。 */
export const HJ_START = `@npc_kanenari
しゅん、その 帳面。{w=300}
わいの ぶんの ページも、{w=300}
作って くれへん？
/
陸の もん、ぜんぶ はじめてや。{w=300}
……はじめての もんは、{w=300}
忘れたら もったいないねん。
@narr
みました帳の うしろに、{w=300}
『はじめて帳』の 欄が できた。`;

/** はじまりの あと：もう 書いて ある ページ（焼きそばは いつも。ほかは 見ていれば）。 */
export function hjStartFilled(n: number): string {
  return n <= 1
    ? `@narr
1ページ目は、{w=300}
『売れ残りの 焼きそば』。{w=300}
★が 5つ。`
    : `@narr
1ページ目は、{w=300}
『売れ残りの 焼きそば』。{w=300}
★が 5つ。
/
ほかにも、もう ${n - 1}ページ。{w=300}
グソっ君が 先に
書きこんで いた。`;
}

/** 第2章：第1章で 欄を 作った 人（村の 6人の だれかに はじめて 話したとき）。 */
export const HJ_OPEN2 = `@npc_kanenari
しゅん、『はじめて帳』、{w=300}
こっちでも 書けるで！
@narr
みました帳 ②の うしろにも、{w=300}
『はじめて帳』の 欄が できた。`;

/** 第2章から 始めた 人：①の はじまりと 同じ ことを 言って ② に 作る。 */
export const HJ_START2 = `@npc_kanenari
しゅん、その 帳面。{w=300}
わいの ぶんの ページも、{w=300}
作って くれへん？
/
陸の もん、ぜんぶ はじめてや。{w=300}
……はじめての もんは、{w=300}
忘れたら もったいないねん。
@narr
みました帳 ②の うしろに、{w=300}
『はじめて帳』の 欄が できた。`;

/** 1ページ うまった（@sys）。 */
export function hjCountText(vol: 1 | 2, have: number, total: number): string {
  return `@sys
はじめて帳${vol === 2 ? ' ②' : ''}に 書きこんだ。（${have}/${total}）`;
}

/** らん外の 1ページ。 */
export const HJ_BONUS_PAGE = `@sys
はじめて帳の らん外に、
1ページ ふえた。`;

/** ① の 8人 ／ ② の 6人：朱肉 +2。 */
export const HJ_REWARD = {
  1: `@npc_kanenari
町の 人、みんな 先生やな。{w=300}
……おおきに。
@sys
朱肉が 2 たまった。`,
  2: `@npc_kanenari
村の 人も、みんな 先生や。{w=300}
……おおきに。
@sys
朱肉が 2 たまった。`,
} as const;

// ================================================================ 第1章の はじめて（8つ）

export const HJ_TALK: Record<string, string> = {
  // a. 打ち水（ちず。川べり通り）
  uchimizu: `@npc_kanenari
水を 道に まくんか！{w=300}
海に 返さんで ええんか？
@npc_mizumaki
地面が 飲むのよ。{w=300}
今日の 地面は、{w=300}
よく 飲むの。
@npc_kanenari
陸は、地面まで {w=300}
のど かわくんか……{w=300}
たいへんやなあ。`,
  // b. 豆腐（くま吉。店先）
  tofu: `@npc_mamekichi
まいど！{w=300}
切れ端だ、味見しな！{w=300}
まいど！
@npc_kanenari
白い 石や……{w=300}
やわっ！{w=300}……味、うすっ！
/
……あ。{w=300}あとから 来た。{w=300}
豆の 味、あとから 来た！
@npc_mamekichi
豆腐はな、{w=300}
あとから 来るのが 本物だ。{w=300}
……まいど。`,
  // c. 日傘（なんばるわん。坂）
  higasa: `@npc_kanenari
陸の 人は、{w=300}
空から 身を 守るんか。{w=300}
わいは、よろいで 十分や。
@npc_madam
日焼けにも、負けない！
@npc_kanenari
……よろいも、{w=300}
日焼け するんかな。`,
  // d. 新聞（ピー・コック。家）
  shinbun: `@npc_kanenari
毎朝、新しい 紙が {w=300}
来るんか！{w=300}
字が、びっしりや。
/
……これ、ぜんぶ {w=300}
きのうの 話なんか。{w=300}
陸は、毎日 話が ようけ あるなあ。
@npc_kazuo
わたしは、毎朝 {w=300}
2番目に 読むんだ。{w=300}
……1番は、妻。`,
  // e. 筆と 墨（ふでの先生。書道教室）
  fude: `@npc_fudeno
名前を 書いて ごらん。{w=300}
いちばん 落ちつく {w=300}
手で 持つんだよ。
@narr
グソっ君は、14本の 足を {w=300}
1本ずつ、ぜんぶ ためした。
/
半紙に、大きく『グ』。
@npc_fudeno
……読めるねえ。{w=300}
わたしより、うまい。`,
  // f. 乾燥機（えすけ。コインランドリー）
  kansouki: `@npc_kanenari
服を ぐるぐる 回す 箱！{w=300}
深い 海の 流れより、{w=300}
速いで。
@npc_inui
中に 入るのは、だめです。{w=300}
……3年 見てきた 僕でも、{w=300}
入った ことは ないです。`,
  // g. 敬礼（ワイスタ巡査。交番）
  keirei: `@npc_tsurumi
敬礼で あります！
@npc_kanenari
どの 手で するん？
@narr
グソっ君は、右の 腕と、{w=300}
小さい 足を 6本、{w=300}
いっせいに 上げた。
@npc_tsurumi
……本官より、{w=300}
気合いが 入って おります！`,
  // h. 当たり（おばあ。ひのや）
  atari: `@npc_kanenari
当たり？{w=300}
当たったら、どうなるん？
@npc_obaa
もう 1本。
@npc_kanenari
ほな、ずっと 当たったら、{w=300}
永遠に 食べられるやん！
@npc_obaa
そう 思うだろ。{w=300}
……永遠は、来ないよ。{w=300}
50年 見てきた。`,
};

/** らん外：段階2 の ちず（打ち水が ぜんぶ 北東へ）。打ち水の あとに 続けて（または、もう 書いた あとの 1回）。 */
export const HJ_UCHIMIZU_NE = `@npc_kanenari
せやけど、その 水、{w=300}
ぜんぶ 同じ ほうへ 流れとる。{w=300}
……これも 陸の ふつうか？
@npc_mizumaki
ちがうわよ。`;

// ================================================================ 第2章の はじめて（6つ）

export const HJ_TALK2: Record<string, string> = {
  // a. 漬物（ぴょん夫人。今の お茶と 漬物の あと）
  tsukemono: `@npc_kanenari
すっぱ！{w=300}……しょっぱ！{w=300}
……もう 1切れ。
@npc_hoshi_yoshie
ええ 食べっぷりじゃ。{w=300}
……重しの 石が、{w=300}
ええ 仕事を しとる。`,
  // b. トマトの 葉の におい（ペロ）
  tomatoha: `@npc_kanenari
実やのうて、{w=300}
葉っぱが、トマトの {w=300}
においや！
@npc_hoshi_mitsu
実より 先に、{w=300}
葉が トマトに なるのさ。`,
  // c. 稲の 穂（トマじい）
  inaho: `@npc_kanenari
草に、つぶつぶが {w=300}
ぶら下がっとる！{w=300}
……これが 米か！
@npc_hoshi_tome
実るほど、{w=300}
頭が 下がるんじゃ。
@npc_kanenari
わいは、はじめから {w=300}
頭 低いで。{w=300}
……底の 生まれやし。`,
  // d. 色を まぜる（ソワカ）
  iro: `@npc_kanenari
青と 黄色 まぜたら、{w=300}
緑に なった！{w=300}
……魔法か！
@npc_hoshi_sawako
魔法じゃ ないわ。{w=300}
……でも、毎回 ちょっと {w=300}
うれしいの。`,
  // e. 式辞（ハモ区長。区長の 家の 原稿と そろえた）
  shikiji: `@npc_hoshi_kucho
えー、本日は {w=300}
お日柄も よく……
@npc_kanenari
長い！{w=300}……けど、{w=300}
ねむなる ええ 声や。
@npc_hoshi_kucho
えー、それが 式辞で {w=300}
ございます。`,
  // f. 手紙（さんかど）
  tegami: `@npc_kanenari
紙に 書いて、{w=300}
遠くの 人に 届けるんか。{w=300}
……海の 底には、ないなあ。
@npc_hoshi_busdriver
書いて くれたら、{w=300}
届けるよ。{w=300}
……朝の バスでね。
@npc_kanenari
ほな、しゅんの {w=300}
お母ちゃんに 書こか。{w=300}
『村、まっくらやで』って。`,
};

// ================================================================ かくし：裏表紙（ぜんぶ うめたあと）

export const HJ_URA = `@narr
はじめて帳の 裏表紙に、{w=300}
グソっ君の 絵。
/
えんぴつの、しゅんの 顔。{w=300}
『はじめての ともだち』。{w=300}
★の 欄は、からっぽ。
@npc_kanenari
……★は、つけられへん。{w=300}
数えきれんから。`;

// ================================================================ 検査用（textcheck2・hajimeteText）

export const HAJIMETE_TEXTS_CH1 = {
  start: HJ_START,
  filled: hjStartFilled(4),
  filled1: hjStartFilled(1),
  count: hjCountText(1, 13, 13),
  bonus: HJ_BONUS_PAGE,
  reward: HJ_REWARD[1],
  talk: HJ_TALK,
  ne: HJ_UCHIMIZU_NE,
};
export const HAJIMETE_TEXTS_CH2 = {
  open: HJ_OPEN2,
  start: HJ_START2,
  count: hjCountText(2, 6, 6),
  reward: HJ_REWARD[2],
  talk: HJ_TALK2,
  ura: HJ_URA,
};
export const HAJIMETE_TEXTS = { ch1: HAJIMETE_TEXTS_CH1, ch2: HAJIMETE_TEXTS_CH2 };
