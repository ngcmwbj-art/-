// 「ダンゴムシ ちゃうで」の 報告書（げむきか 10/9 の案2。2026-10-09 依頼主の採用と「案2 の改良」。
// docs/ideas/2026-10-09.md の「### 2.」、02_ch2_index #93、10_narrative 6.28）。
//
//   交番の ワイスタ巡査の 報告書（段階1 の 通報『公園に 大きな 虫が 倒れている』）が 閉じられない。
//   欄は 5つ：『正体』『大きさ』『足の 数』『好物』『帰る 所』。うまった 欄に 巡査の「確認」印と
//   評価の ハンコ（優・良・可）。もちものの『報告書の 写し』で いつでも カードを 見られ、いちばん下に
//   「つぎ：…」の 1行（何を すれば いいか・あと 何が 残って いるか）。
//   ・『正体』：町の 8人の 聞き込み（証言カード。まちがえた 答えを 写しに 書いて 線で 消す。似顔絵が
//     証言ごとに 1段 変に なる）→ 4人 から さやに 写しを 見せて、本当の 特徴 3つを えらぶ 推理 →
//     さや「オオグソクムシ」。
//   ・『大きさ』（身長計の ツッコミ）・『足の 数』（わしゃっと 動く 足を 数える）・『好物』（つくえの
//     5つの 食べ物）：交番で 巡査と。何回でも やりなおせて、いちばん いい 評価が 残る。
//   ・『帰る 所』：家の 母（1回）。
//   ・閉じる：評価の ハンコ、巡査の 右手が はじめて 下りる、朱肉 +2。ぜんぶ「優」で 似顔絵が 本物
//     そっくりに 描き直されて 交番の 壁に 飾られる（以後 ずっと）。
//   ・8人 ぜんぶ：巡査「聞き込み、満点で あります！」朱肉 +1。
//   ・かくし：コタロウだけは まちがえない → 写しの すみに 犬の 足あと。
//
// 決まり：1ページ3行・1行336px。第1章の 台詞に「17」「まだ」「平和」「3人」を 入れない。名札・地の文では
// 名前に「さん」を つけない（「郵便屋さん」は 名前の 一部）。グソっ君は 関西弁・わい・敬語なし。グソっ君が
// どこから 来たかには だれも ふれない。ボスの「……帰る 家、分からへんかったわ」は 変えない。
// 字の幅は __game.cmd.hokokushoText()・textcheck2()・wrapCheck() で 見る。
//
// 案から 合わせた 所：
//   ・写しは みました帳の 1ページでは なく、大事なもの『報告書の 写し』（もちもので カードが 開く）。
//   ・推理の 本当の 特徴「海の におい」の 出どころに、かずゆきの 1ページを 足した（「香りは 豆じゃない。潮だ」）。
//   ・『大きさ』の 正しい 値は 105cm（新しい 設定。04「カネナリくんと 同じ 大きさ」から）。

import { flag } from '../../game/state';

// ================================================================ 欄と 証言

export type FieldKey = 'shotai' | 'size' | 'legs' | 'food' | 'kaeru';

/** 欄の 名前（カードの 順）。 */
export const HK_FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'shotai', label: '正体' },
  { key: 'size', label: '大きさ' },
  { key: 'legs', label: '足の 数' },
  { key: 'food', label: '好物' },
  { key: 'kaeru', label: '帰る 所' },
];

export type WitnessKey = 'shingo' | 'tomoki' | 'hiyori' | 'yubin' | 'chugaku' | 'kuma' | 'yuu' | 'kazuyuki';

export interface Witness {
  key: WitnessKey;
  npc: string;
  map: string;
  /** カードに 書く まちがえた 答え（線で 消す） */
  ans: string;
  /** うまって いない カードの 行（どこに いるか） */
  where: string;
  /** 似顔絵の 層の 名前（art/props/hokokusho.ts） */
  layer: string;
}

export const HK_WITNESSES: Witness[] = [
  { key: 'shingo', npc: 'npc_ojii', map: 'map_town', ans: 'でっかい たんかん', where: '縁台の しんご', layer: 'tankan' },
  { key: 'tomoki', npc: 'npc_gacha_boy', map: 'map_town', ans: 'シークレット', where: 'ガチャの ともき', layer: 'capsule' },
  { key: 'hiyori', npc: 'npc_sand_girl', map: 'map_town', ans: 'すなの 作品', where: '砂場の ひより', layer: 'suna' },
  { key: 'yubin', npc: 'npc_postman', map: 'map_town', ans: '小包', where: 'ポストの 横', layer: 'himo' },
  { key: 'chugaku', npc: 'npc_chugaku', map: 'map_town', ans: 'よろいの 獣', where: '空き地の 中学生', layer: 'fuin' },
  { key: 'kuma', npc: 'npc_mamekichi', map: 'map_town', ans: 'がんもどき', where: '豆腐屋の くま吉', layer: 'ganmo' },
  { key: 'yuu', npc: 'npc_tokio', map: 'map_clock', ans: '時計の バンド', where: '時計店の ゆう', layer: 'band' },
  { key: 'kazuyuki', npc: 'npc_master', map: 'map_cafe', ans: '中煎りの 豆', where: '喫茶の かずゆき', layer: 'mame' },
];

/** 通報の 1行（はじめから 線で 消して ある）。 */
export const HK_TSUHO = '大きな 虫（通報）';

// ================================================================ フラグ
//   flag_hk_start            報告書を 頼まれた（写しを もらった）
//   flag_hk_w_<key>          その 人の 証言（値は 聞いた 順 1〜8）
//   flag_hk_note4            4人目の あとの グソっ君
//   flag_hk_full8            8人 ぜんぶの 朱肉 +1
//   flag_hk_g_<欄>           評価（1 可・2 良・3 優。いちばん いい もの）。帰る 所は 母の あと 3
//   flag_hk_size_cm          はかった 値（いちばん いい 評価の とき）
//   flag_hk_submit           正体を 出して『帰る 所』を 聞かれた
//   flag_hk_closed           閉じた（朱肉 +2）
//   flag_hk_kazari           ぜんぶ「優」：本物 そっくりの 似顔絵が 交番に
//   flag_hk_kotaro / _told   コタロウの 足あと ／ 巡査が 見た

export const HK = {
  start: 'flag_hk_start',
  note4: 'flag_hk_note4',
  full8: 'flag_hk_full8',
  sizeCm: 'flag_hk_size_cm',
  submit: 'flag_hk_submit',
  closed: 'flag_hk_closed',
  kazari: 'flag_hk_kazari',
  kotaro: 'flag_hk_kotaro',
  kotaroTold: 'flag_hk_kotaro_told',
  /** 好物の 画面を はじめて 開いた（食べ物の 説明は 1回） */
  foodSeen: 'flag_hk_food_seen',
  sizeSeen: 'flag_hk_size_seen',
  legsSeen: 'flag_hk_legs_seen',
} as const;

export const wFlag = (k: WitnessKey): string => `flag_hk_w_${k}`;
export const gFlag = (k: FieldKey): string => `flag_hk_g_${k}`;

export const heard = (k: WitnessKey): boolean => flag(wFlag(k)) > 0;
export const heardCount = (): number => HK_WITNESSES.filter((w) => heard(w.key)).length;
/** 評価（0 まだ・1 可・2 良・3 優）。 */
export const grade = (k: FieldKey): number => flag(gFlag(k));
export const filled = (k: FieldKey): boolean => grade(k) > 0;
export const allYuu = (): boolean => HK_FIELDS.every((f) => grade(f.key) >= 3);

/** 評価の 字。 */
export const GRADE_CH = ['', '可', '良', '優'] as const;

/** 正しい 大きさ（cm）と 足の 数。 */
export const SIZE_TRUE = 105;
export const LEGS_TRUE = 14;

/** 欄に 書く 値（うまって いない ときは null）。 */
export function fieldValue(k: FieldKey): string | null {
  if (!filled(k)) return null;
  switch (k) {
    case 'shotai':
      return 'オオグソクムシ';
    case 'size':
      return `${flag(HK.sizeCm) || SIZE_TRUE}cm`;
    case 'legs':
      return `${LEGS_TRUE}本`;
    case 'food':
      return '焼きそば';
    case 'kaeru':
      return '小林';
  }
}

/** 交番で しらべる 3つ。 */
export const KOBAN_FIELDS: FieldKey[] = ['size', 'legs', 'food'];

/** カードの いちばん下の 1行（何を すれば いいか）。 */
export function nextLine(): string {
  if (!flag(HK.start)) return '';
  if (flag(HK.kazari)) return '似顔絵は、交番の 壁に。';
  if (flag(HK.closed)) return allYuu() ? 'ぜんぶ『優』！ 交番へ' : '『優』が そろうと……？（交番で）';
  if (filled('kaeru')) return 'つぎ：交番で 報告書を 閉じる';
  if (flag(HK.submit)) return 'つぎ：『帰る 所』……家に 帰って みる';
  const n = heardCount();
  if (n < 4 && !filled('shotai')) return `つぎ：町の 人に 聞き込み（あと ${4 - n}人）`;
  if (!filled('shotai')) return 'つぎ：公園の さやに 写しを 見せる';
  const left = KOBAN_FIELDS.filter((k) => !filled(k));
  if (left.length) return `つぎ：交番で『${HK_FIELDS.find((f) => f.key === left[0])!.label}』`;
  return 'つぎ：交番に 報告書を 出す';
}

// ================================================================ 推理（本当の 特徴を 3つ）

export interface Feature {
  id: string;
  label: string;
  /** 本当の 特徴 */
  ok?: boolean;
  /** まちがえた 証言から（その 人の 名前） */
  from?: WitnessKey;
}

export function features(): Feature[] {
  return [
    { id: 'kawa', label: '皮が むける', from: 'shingo' },
    { id: 'yoroi', label: 'よろい', ok: true },
    { id: 'age', label: 'こんがり 揚げ', from: 'kuma' },
    { id: 'suna', label: 'すなで できてる', from: 'hiyori' },
    { id: 'umi', label: '海の におい', ok: true },
    { id: 'himo', label: 'ひもで しばる', from: 'yubin' },
    { id: 'iri', label: '中煎り', from: 'kazuyuki' },
    { id: 'fuin', label: '封印されし', from: 'chugaku' },
    { id: 'ashi', label: filled('legs') ? '足が 14本' : '足が いっぱい', ok: true },
  ];
}

// ================================================================ 台詞

/** 1. 閉じられない 報告書（交番。段階2、グソっ君が いるとき、巡査の いつもの 台詞の あとに 1回）。 */
export const HK_START = `@npc_tsurumi
本官、報告書が 1枚、{w=300}
閉じられずに {w=300}
おります！
/
通報『公園に 大きな 虫が {w=300}
倒れている』。{w=300}
……正体の 欄が、空白で あります！
@npc_kanenari
わいや、それ。
@npc_tsurumi
存じて おります！{w=300}
……で、なんの 生き物で {w=300}
ありますか？
@npc_kanenari
……わいも 分からん。{w=300}
ダンゴムシ ちゃうのは、{w=300}
分かっとるけど。
@npc_tsurumi
では、町の 皆さんに {w=300}
聞き込みを {w=300}
お願い いたします！
/
本官は、敬礼を やめる {w=300}
タイミングを、{w=300}
ここで 探して おります！`;

/** カードを 見せながら：欄と しらべかた。 */
export const HK_START_CARD = `@npc_tsurumi
欄は 5つで あります！{w=300}
『正体』『大きさ』『足の 数』
『好物』『帰る 所』！
/
『大きさ』『足の 数』『好物』は、
本官が ここで {w=300}
しらべます！{w=300}いつでも どうぞ！
/
似顔絵も、{w=300}
証言の とおりに {w=300}
描き足して まいります！`;

export const HK_GET = `@sys
報告書の 写しを
もらった！`;

export const HK_GET_HINT = `@sys
写しは、もちものから
いつでも 見られる。`;

/** 2. 聞き込み（8人。いつもの 台詞の あと、グソっ君が いっしょ、1回ずつ）。 */
export const HK_TALK: Record<WitnessKey, string> = {
  shingo: `@npc_ojii
……ボウズ、その 横の。{w=300}
たんかんか？{w=300}
でっかい たんかんか？
@npc_kanenari
ちゃうで。{w=300}
皮、むかれへんで。
@npc_ojii
色が な、{w=300}
2月の たんかんの 色だ。{w=300}
……つい、手が 出た。`,
  tomoki: `@npc_gacha_boy
シークレットだ！{w=300}
ガチャの、いちばん {w=300}
出ない やつ！
@npc_kanenari
カプセルに 入らへんで。{w=300}
……中身は、{w=300}
つまっとるけどな。
@npc_gacha_boy
からっぽじゃ ないんだ。{w=300}
……いいなあ。`,
  hiyori: `@npc_sand_girl
すなで できてる？{w=300}
……じょうず。
@npc_kanenari
砂ちゃう。{w=300}
よろいや。{w=300}
さわっても、くずれへんで。
@narr
ひよりは、グソっ君の {w=300}
せなかを、そっと {w=300}
ぽんぽん した。
@npc_sand_girl
……ほんとだ。{w=300}
せきとめに、使える。`,
  yubin: `@npc_postman
小包かと 思ったよ。{w=300}
頭に、ひもが {w=300}
かかってるから。
@npc_kanenari
はちまきや。{w=300}
……宛先は、{w=300}
書いてへんで。
@npc_postman
切手も ない。{w=300}
……料金 不足かなあ。`,
  chugaku: `@npc_chugaku
……出たな。{w=300}
封印されし、{w=300}
よろいの 獣。
@npc_kanenari
なんか、かっこええな。{w=300}
……それで 出しとこか。`,
  kuma: `@npc_mamekichi
まいど！{w=300}
がんもどきが、歩いてる！{w=300}
まいど！
@npc_kanenari
がんもどき？
@npc_mamekichi
雁の 肉に 似せた、{w=300}
豆腐の 揚げもんだ。{w=300}
『もどき』って いうんだよ。
@npc_kanenari
ほな わいは、{w=300}
ダンゴムシもどきか。{w=300}
……いや、ちゃうわ！
@npc_mamekichi
まいど！{w=300}
……今の まいどは、{w=300}
ごめんの まいどだ。`,
  yuu: `@npc_tokio
金属の バンドかと。{w=300}
節の 並びが、{w=300}
時計の バンドと 同じです。
/
……正確には、{w=300}
なんですか。{w=300}
わからないと、むずむず します。
@npc_kanenari
わいも、{w=300}
むずむず しとる。`,
  kazuyuki: `@npc_master
……中煎り。
@npc_kanenari
なにが？
@npc_master
その 色。{w=300}
豆なら、中煎りの {w=300}
いい 色だ。`,
};

/** かずゆき：グソっ君の 返し（ぶーさんの 本体の 場面で コーヒーを 飲んだ 人だけ 2行目が つく）。 */
export function hkKazuyukiTail(sipped: boolean): string {
  return `@npc_kanenari
煎られてへんで！${sipped ? '{w=300}\n……にっがいのは、{w=300}\nもう こりごりや。' : ''}
@npc_master
……ただ、香りは {w=300}
豆じゃないな。{w=300}
潮の 香りだ。`;
}

/** 証言を 写しに 書いて、線で 消す（中学生は 台詞の 中で 書く）。 */
export function hkWrite(w: Witness): string {
  if (w.key === 'chugaku')
    return `@narr
写しに『よろいの 獣』。{w=300}
……線で 消した。`;
  return `@narr
写しに『${w.ans}』。{w=300}
……線で 消した。`;
}

/** 4人目の あと（1回）。 */
export const HK_NOTE4 = `@npc_kanenari
……みんな、{w=300}
自分の 好きな もんに {w=300}
見えとるんやな。
/
ほな、わいは {w=300}
みんなに 好かれとる {w=300}
ちゅうことや。`;

/** 8人 ぜんぶの あと、交番で（1回）。 */
export const HK_FULL8 = `@npc_tsurumi
聞き込み、{w=300}
満点で あります！
@sys
朱肉が 1 たまった。`;

/** かくし：コタロウ（グソっ君と、報告書の あいだ）。 */
export const HK_KOTARO = `@narr
コタロウは、{w=300}
しっぽを 振るだけだった。
/
コタロウだけは、{w=300}
何にも まちがえなかった。
/
コタロウが、写しの すみに {w=300}
前足を ぽんと のせた。`;

export const HK_KOTARO_KOBAN = `@npc_tsurumi
……おや、この すみの。{w=300}
参考人の {w=300}
足あとで あります！`;

// ---------------------------------------------------------------- 交番：しらべる 欄

export const HK_MENU_ASK = `@npc_tsurumi
どの 欄を {w=300}
しらべますか！`;
/** 選択肢と いっしょに 出す 形（ask）。 */
export const HK_MENU_Q = 'どの 欄を {w=300}\nしらべますか！';

export const HK_MENU = {
  size: '大きさを はかる',
  legs: '足を 数える',
  food: '好物を 当てる',
  shotai: '特徴を えらびなおす',
  later: 'また あとで',
} as const;

export const HK_LATER = `@npc_tsurumi
いつでも どうぞ！`;

/** 『大きさ』：はじめの 1回だけ 前置き。 */
export const HK_SIZE_INTRO = `@npc_tsurumi
『大きさ』で あります！{w=300}
身長計に、{w=300}
お乗り ください！
@npc_kanenari
よっしゃ。{w=300}
……なるべく 大きく {w=300}
書いといてや。`;

export const HK_SIZE_RULE = `@sys
上から バーが 下りてくる。{w=300}
グソっ君が 背のびしたら、
ツッコんで 止めよう。
/
ツッコミは 3回まで。{w=300}
バーが 頭に つく {w=300}
直前が ねらい目。`;

/** 画面の 中の ことば。 */
export const HK_SIZE_WORD = {
  title: '『大きさ』',
  tsukkomi: 'のびるな！',
  left: 'ツッコミ',
  key: 'ツッコむ',
} as const;

export function hkSizeResult(cm: number, g: number): string {
  if (g >= 3)
    return `@npc_tsurumi
${cm}cm！{w=300}
……本官より {w=300}
小さいで あります！
@npc_kanenari
……知っとるわ。`;
  if (g === 2)
    return `@npc_tsurumi
${cm}cm！{w=300}
……少し、のびて {w=300}
おりませんか？
@npc_kanenari
のびてへんで。{w=300}
……ちょっとだけや。`;
  return `@npc_tsurumi
${cm}cm！{w=300}
……ずいぶん、{w=300}
のびて おりますな！
@npc_kanenari
よろいの 中で、{w=300}
つま先 立ち しとった。`;
}

/** 『足の 数』 */
export const HK_LEGS_INTRO = `@npc_tsurumi
『足の 数』で あります！{w=300}
……ひっくり返って {w=300}
いただけますか！
@npc_kanenari
しゃあないな。{w=300}
……じっと しとるから、{w=300}
早よ 数えてや。`;

export const HK_LEGS_RULE = `@sys
足は、ときどき {w=300}
わしゃっと 動く。{w=300}
よく 見て 数えよう。`;

export const HK_LEGS_WORD = {
  title: '『足の 数』',
  look: 'よく 見て……',
  ask: '足は 何本？',
  unit: '本',
  key: '数を えらぶ',
  ok: 'けってい',
} as const;

export function hkLegsWrong(n: number, tries: number): string {
  const hint =
    n === 16
      ? `@npc_tsurumi
口の 下の 2本は、{w=300}
足では {w=300}
ありません！`
      : n === 12 || n === 10
        ? `@npc_tsurumi
はさみの 手も、{w=300}
足に 入る ようで {w=300}
あります！`
        : `@npc_tsurumi
${n}本……{w=300}
本官の 数えと、{w=300}
ちがいますな！`;
  return tries >= 3
    ? `${hint}
@npc_tsurumi
正解は、14本で あります！`
    : `${hint}
@npc_tsurumi
もう 1度、{w=300}
お願い いたします！`;
}

export const HK_LEGS_RIGHT = `@npc_tsurumi
14本！{w=300}
……正解で あります！
@npc_kanenari
……14本も あったんか。{w=300}
わいも 知らんかった。`;

/** 『好物』 */
export const HK_FOOD_INTRO = `@npc_tsurumi
『好物』で あります！{w=300}
町の 食べ物を、{w=300}
つくえに 並べました！
/
グソっ君の ようすを 見て、{w=300}
当てて ください！`;

export const HK_FOOD_RULE = `@sys
食べ物を えらぶと、
グソっ君が こっそり 反応する。{w=300}
よく 見て、さし出そう。`;

export const HK_FOODS = ['豆腐', 'たんかん', 'コーヒー', 'ラムネ', '焼きそば'] as const;
export type FoodName = (typeof HK_FOODS)[number];

export const HK_FOOD_WORD = {
  title: '『好物』',
  key: 'さし出す',
} as const;

export const HK_FOOD_REACT: Record<FoodName, string> = {
  豆腐: `@npc_kanenari
豆の 味、{w=300}
あとから 来る やつや。{w=300}
……ええけど、いちばん ちゃう。`,
  たんかん: `@npc_kanenari
これ、皮 むくやつやろ。{w=300}
……わいの 皮は、{w=300}
むかんといてや。`,
  コーヒー: `@npc_kanenari
……鼻の おくが、{w=300}
もう にがい。{w=300}
これは ちゃうで。`,
  ラムネ: `@npc_kanenari
しゅわしゅわ！{w=300}
……好きやけど、{w=300}
いちばんは ちゃうねん。`,
  焼きそば: `@npc_kanenari
それや！！{w=300}
……ソースの においで、{w=300}
バレとったやろ。`,
};

export function hkFoodResult(g: number): string {
  return `@npc_tsurumi
好物、焼きそば！{w=300}
……本官も で あります！${g >= 3 ? '' : '\n@npc_kanenari\n顔に 出とった？{w=300}\n……出とったか。'}`;
}

/** 推理（さや）。 */
export const HK_SAE_ASK = `@npc_sae
しゅん、それ、{w=300}
報告書の 写し？{w=300}
……ちょっと 見せて。
@narr
消した 線の ほかに、{w=300}
本当の 特徴が {w=300}
3つ ある はずだ。`;

export const HK_SUIRI_WORD = {
  title: '本当の 特徴を 3つ',
  pick: 'えらぶ',
  done: 'これで きめる',
  from: 'の 証言',
} as const;

export function hkSaeWrong(right: number): string {
  return `@npc_sae
……${right}つは、{w=300}
合ってると 思う。{w=300}
あとは、消した 線の ほう。`;
}

/** 3. 正解（さや）。 */
export const HK_SAE_RIGHT = `@npc_sae
オオグソクムシ。{w=300}
……図鑑にも、{w=300}
そう 書いてあった。
/
エビや カニの なかま。{w=300}
深い 海の 底に いる。{w=300}
……今度は、自信 ある。
@npc_kanenari
……オオグソクムシ。{w=300}
わい、オオグソクムシか。{w=300}
ええ 響きやん。
@npc_sae
13枚目、{w=300}
グソっ君でも いい？
@npc_kanenari
じっと するんは、{w=300}
得意やで。
@narr
写しの『正体』の 欄に、{w=300}
『オオグソクムシ』。`;

/** 交番で えらびなおした とき。 */
export const HK_SUIRI_KOBAN = `@npc_tsurumi
特徴の えらびなおしで あります！`;

export const HK_SUIRI_KOBAN_OK = `@npc_tsurumi
よろい、海の におい、{w=300}
足が 14本！{w=300}
……記録で あります！`;

/** 4. 報告書を 出す（交番。正体と 交番の 3つが うまったら）。 */
export const HK_SUBMIT = `@npc_tsurumi
正体、オオグソクムシ！{w=300}
……ダンゴムシに {w=300}
あらず！
/
消した 線も、記録で {w=300}
あります！{w=300}
ぜんぶ 残します！
/
似顔絵も、{w=300}
証言の とおりに {w=300}
仕上がって おります！`;

export const HK_DAREYANEN = `@npc_kanenari
…………だれやねん！`;

export const HK_SUBMIT_2 = `@npc_tsurumi
最後の 欄。{w=300}
『帰る 所』で あります！
@npc_kanenari
…………。
/
そこは、{w=300}
ちょっと 待っててや。`;

/** 『帰る 所』を 待って いる あいだ。 */
export const HK_WAIT = `@npc_tsurumi
『帰る 所』、{w=300}
お待ち して おります！`;

/** 交番で えらびなおして、ちがった とき。 */
export function hkSuiriKobanWrong(right: number): string {
  return `@npc_tsurumi
${right}つ、合って おります！{w=300}
あとは、{w=300}
消した 線の ほうで あります！`;
}

/** 交番の 3つが のこって いて、正体が うまった とき。 */
export const HK_NOT_YET = `@npc_tsurumi
正体、うけたまわりました！{w=300}
のこりの 欄も、{w=300}
お願い いたします！`;

/** 5. 帰る 所（家の 母。1回）。 */
export const HK_KAERU = `@npc_mother
帰る 所？{w=300}
ここで いいじゃない。
/
麦茶の コップ、{w=300}
とっくに 2つ {w=300}
出してあるのよ。
@npc_kanenari
…………{w=300}
おおきに。
@narr
写しの 最後の 欄に、{w=300}
しゅんの 字で『小林』。`;

/** 6. 閉じる（交番。1回）。 */
export const HK_CLOSE_GRADE = `@npc_tsurumi
では、評価の {w=300}
ハンコで あります！`;

export const HK_CLOSE_ALL = `@npc_tsurumi
ぜんぶ『優』！{w=300}
……本官、似顔絵を {w=300}
描き直して まいります！`;

export const HK_KAZARI = `@npc_tsurumi
本物 そっくりで あります！{w=300}
交番の 壁に、{w=300}
ずっと 飾って おきます！
@npc_kanenari
……わい、{w=300}
こんな ええ 顔 しとったんか。`;

/** 閉じる：巡査、右手が 下りる（地の文）、もう 1回。 */
export const HK_CLOSE = [
  `@npc_tsurumi
報告書、{w=300}
これにて 閉じます！{w=300}
……敬礼を、やめる 時で あります！`,
  `@narr
ワイスタ巡査の 右手が、{w=300}
はじめて 下りた。`,
  `@npc_tsurumi
…………{w=300}
いえ、もう 1回 {w=300}
させて ください！`,
] as const;

export const HK_CLOSE_GET = `@sys
朱肉が 2 たまった。`;

export const HK_CLOSE_NOT_ALL = `@npc_tsurumi
『優』が そろえば、{w=300}
似顔絵を 描き直す {w=300}
所存で あります！
/
しらべ直しは、{w=300}
いつでも どうぞ！`;

/** 閉じた あと、ぜんぶ「優」に なった とき（交番で しらべ直した あと）。 */
export const HK_KAZARI_LATE = `@npc_tsurumi
……ぜんぶ『優』で あります！{w=300}
本官、似顔絵を {w=300}
描き直して まいります！`;

/** 閉じた あと（もう 飾った）：巡査の ひとこと。 */
export const HK_AFTER = `@npc_tsurumi
報告書は、{w=300}
棚に 大事に {w=300}
しまって あります！`;

/** 手配書（壁の 似顔絵）を しらべる。 */
export function hkTehaiText(stage: 'blank' | 'mid' | 'kazari'): string {
  if (stage === 'kazari')
    return `@narr
本物 そっくりの 似顔絵。{w=300}
額に 入って いる。`;
  if (stage === 'mid')
    return `@narr
証言どおりの 似顔絵。{w=300}
……だれだろう。`;
  return `@narr
似顔絵の 紙。{w=300}
『大きな 虫』と だけ {w=300}
書いて ある。`;
}

/** 写し（大事なもの）の 2行目。 */
export function hkItemDesc(): [string, string] {
  if (flag(HK.closed)) return ['正体の 欄に、消した 線が 9本。', '最後の 欄に『小林』。'];
  return ['ワイスタ巡査の 報告書の 写し。', `うまった 欄：${HK_FIELDS.filter((f) => filled(f.key)).length}／5`];
}

/** カードの 見出し。 */
export const HK_CARD = {
  title: '報告書（写し）',
  koban: '夕鳴銀座 交番',
  witness: '証言',
  nigaoe: '似顔絵',
  page1: '報告書',
  page2: '証言',
  cards: '証言カード',
  hint: '手がかり',
  kakunin: '確',
} as const;

/** 文の 検査に 渡す 全部。 */
export const HOKOKUSHO_TEXTS = {
  start: HK_START,
  startCard: HK_START_CARD,
  get: HK_GET,
  getHint: HK_GET_HINT,
  talk: HK_TALK,
  kazuyuki: hkKazuyukiTail(true),
  kazuyuki0: hkKazuyukiTail(false),
  write: HK_WITNESSES.map(hkWrite),
  note4: HK_NOTE4,
  full8: HK_FULL8,
  kotaro: HK_KOTARO,
  kotaroKoban: HK_KOTARO_KOBAN,
  menuAsk: HK_MENU_ASK,
  later: HK_LATER,
  sizeIntro: HK_SIZE_INTRO,
  sizeRule: HK_SIZE_RULE,
  size: [hkSizeResult(105, 3), hkSizeResult(109, 2), hkSizeResult(118, 1)],
  legsIntro: HK_LEGS_INTRO,
  legsRule: HK_LEGS_RULE,
  legs: [hkLegsWrong(16, 1), hkLegsWrong(12, 2), hkLegsWrong(20, 3), HK_LEGS_RIGHT],
  foodIntro: HK_FOOD_INTRO,
  foodRule: HK_FOOD_RULE,
  foodReact: HK_FOOD_REACT,
  food: [hkFoodResult(3), hkFoodResult(2)],
  saeAsk: HK_SAE_ASK,
  saeWrong: hkSaeWrong(2),
  saeRight: HK_SAE_RIGHT,
  suiriKoban: HK_SUIRI_KOBAN,
  suiriKobanOk: HK_SUIRI_KOBAN_OK,
  submit: HK_SUBMIT,
  dareyanen: HK_DAREYANEN,
  submit2: HK_SUBMIT_2,
  notYet: HK_NOT_YET,
  wait: HK_WAIT,
  suiriKobanWrong: hkSuiriKobanWrong(2),
  kaeru: HK_KAERU,
  closeGrade: HK_CLOSE_GRADE,
  closeAll: HK_CLOSE_ALL,
  kazari: HK_KAZARI,
  close: HK_CLOSE,
  closeGet: HK_CLOSE_GET,
  closeNotAll: HK_CLOSE_NOT_ALL,
  kazariLate: HK_KAZARI_LATE,
  after: HK_AFTER,
  tehai: [hkTehaiText('blank'), hkTehaiText('mid'), hkTehaiText('kazari')],
};
