// 型ぬき 番付（げむきか 10/13 の案3。2026-10-13 依頼主の採用、厳選の 直しあり。docs/ideas/2026-10-13.md の
// 「### 3.」と「厳選5案」の 2、01_ch1_index の 変更の 記録）。第1章の 段階2、グソっ君が いっしょの とき。
//
//   はじまり：ひのやの 奥の 壁、クラス写真の 下の『型ぬき 名人 番付』（obj_class_photo の 場所）。段階2・
//     グソっ君が いれば 1回〔intro〕→ ひのやの 品書きに『型ぬき』（10円）。段階0〜2 は 写真と 番付の どちらを
//     見るか えらぶ（番付は 地の文だけ）。
//   型ぬき（品書きで 買うと、その場で 大写し。何回でも）：ひょうたん → かさ → ちょうちょ → いかり。割れたら
//     グソっ君が 食べる（3つの 台詞を 順に）。ぬけると 板の すみに 赤ペンの はなまる・まる・ちょん。
//   番付の コツ（どの 順でも、1人1回。グソっ君が いっしょ）：さや（関脇）・ひより（小結）・ちず（前頭）・
//     なんばるわん（横綱）・ピー・コック（大関。なんばるわんの あと）。聞くと 型ぬきの 画面に 助けが 1つ。
//   いかりが ぬけると 番付の 書きかえ（おばあの 出番は ここだけ）：「横綱｜大関」。朱肉 +2、みました帳①の
//     すみの ページ『型ぬき 番付』。そのあと：なんばるわんの 1回・ピー・コックの「しーっ」・テーブルの 缶の 中・
//     コタロウの ないしょの 顔。4つとも はなまるで『名人』（朱肉 +1）。コツなしで いかりまで ぬくと『独学』。
//
// 案から 変えた 所（厳選の 直し）：最後の 型は『えび』を やめて『いかり』（実在の 型ぬきの 形から。触角と 足の
// かわりに、輪と 2本の つめ）。おばあ（はっち先生）の 台詞は 番付の 書きかえの 1場面だけ：はじまりの 説明・
// 段階0〜1 の ひとことは 地の文に、「よくできました」「教わらなくても」は 書きかえの 場面に 入れた。
// ピー・コックと なんばるわんの 夫婦の 対：「割れない と 思えば」と「最後の ひとかけ」、書きかえの あとの
// 「負けない！」と「しーっ」。いかりは ちょうちょが ぬけたら（コツの 数では しばらない。コツなしで 行けると『独学』）。
//
// 決まり：1ページ3行・1行336px。第1章の台詞に「17」「まだ」「平和」「3人」を 入れない。名札・地の文では
// 名前に「さん」を つけない。グソっ君は 関西弁・わい・敬語なし。お金は ふつうの 買い物（10円）、ぬけても
// お金は もらえない。字の幅は __game.cmd.textcheck2() と __game.cmd.katanukiText() で 見る。

/** 型（ぬく 順）。 */
export type KataKey = 'hyoutan' | 'kasa' | 'chou' | 'ikari';
export const KATA_ORDER: KataKey[] = ['hyoutan', 'kasa', 'chou', 'ikari'];
export const KATA_NAME: Record<KataKey, string> = { hyoutan: 'ひょうたん', kasa: 'かさ', chou: 'ちょうちょ', ikari: 'いかり' };

/** 番付の コツ（聞いた 順は 自由。ピー・コックは なんばるわんの あと）。 */
export type TipKey = 'sae' | 'hiyori' | 'chizu' | 'madam' | 'kazuo';
export const TIP_ORDER: TipKey[] = ['sae', 'hiyori', 'chizu', 'madam', 'kazuo'];
export const TIP_NPC: Record<TipKey, string> = {
  sae: 'npc_sae',
  hiyori: 'npc_sand_girl',
  chizu: 'npc_mizumaki',
  madam: 'npc_madam',
  kazuo: 'npc_kazuo',
};

/** 番付の 段（上から）と、先週の 夏まつりの 名前。 */
export const BANZUKE_ROWS: { rank: string; name: string }[] = [
  { rank: '横綱', name: 'なんばるわん' },
  { rank: '大関', name: 'ピー・コック' },
  { rank: '関脇', name: 'さや' },
  { rank: '小結', name: 'ひより' },
  { rank: '前頭', name: 'ちず' },
];

/** 番付の カードの 字（題・グソっ君の 札・すみの 書きこみ）。 */
export const BANZUKE_CARD = {
  title: '型ぬき 名人 番付',
  date: '夏まつり',
  kn: 'グソっ君',
  east: '東',
  west: '西',
  dokugaku: '独学',
  meijin: '名人',
  wari: '割った 数',
};

// ================================================================ はじまり：奥の 壁

export const KATANUKI_INTRO = `@narr
クラス写真の 下に、
『型ぬき 名人 番付』。{w=300}
先週の、夏まつりの 日付。
/
横綱 なんばるわん。{w=300}
大関 ピー・コック。{w=300}
関脇 さや……
@npc_kanenari
かたぬき？{w=300}
なんや、それ。
@narr
うすい おかしの 板を、
針で、型の とおりに ぬく。{w=300}
割れたら、おしまい。
/
レジの 横に、
『型ぬき 1枚 10円』の 箱。{w=300}
ふたに『はじめは ひょうたん』。
@npc_kanenari
割れたら おしまい……{w=300}
けど、割れても 食えるんやろ。{w=300}
やさしい 遊びやな。
/
わい、{w=300}
はさみの 手やで。{w=300}
細かいのは 得意や。
/
番付に 乗ったる。{w=300}
……ひょうたんから やな。`;

/** 写真と 番付、どちらを 見るか（段階0〜2、はじまりの あと）。 */
export const KATANUKI_WALL_ASK = `@narr
壁に、クラス写真と 番付。
? 写真を 見る | 番付を 見る`;

/** 番付を 見る（書きかえの 前）。 */
export const KATANUKI_WALL = `@narr
『型ぬき 名人 番付』。{w=300}
先週の、夏まつりの 日付。
/
横綱 なんばるわん。{w=300}
大関 ピー・コック。{w=300}
関脇 さや、小結 ひより、前頭 ちず。`;

/** 段階0〜1：レジの 横の 箱（地の文だけ）。 */
export const KATANUKI_WALL_S01 = `@narr
レジの 横の 箱に、
夏まつりの 残りの 型ぬき。`;

/** 書きかえの あと（横綱・大関 で ちがう）と、すみの 書きこみ。 */
export const KATANUKI_WALL_AFTER = {
  yokozuna: `@narr
『型ぬき 名人 番付』。{w=300}
横綱が 2人。{w=300}
東 なんばるわん、西 グソっ君。`,
  ozeki: `@narr
『型ぬき 名人 番付』。{w=300}
大関が 2人。{w=300}
ピー・コックと、グソっ君。`,
  dokugaku: `@narr
グソっ君の 札の すみに、
小さく『独学』。`,
  meijin: `@narr
グソっ君の 札の 上に、
赤い 字で『名人』。`,
  wari: `@narr
番付の すみに、小さく
『割った 数』。`,
  wariKn: `@npc_kanenari
食うた 数や。`,
};

// ================================================================ 型ぬき（品書きで 買った あと）

/** どの 型に するか（ぬけた 型と つぎの 型）。選択肢は 型の 名前。 */
export const KATA_ASK = `@narr
どの 型に する？`;

/** はじめて その 型を ぬく 前の グソっ君。 */
export const KATA_FIRST: Record<KataKey, string> = {
  hyoutan: `@npc_kanenari
ひょうたんか。{w=300}
まるい とこは、{w=300}
ゆっくりやな。`,
  kasa: `@npc_kanenari
かさ。{w=300}
柄の 曲がりが、{w=300}
あやしいな。`,
  chou: `@npc_kanenari
ちょうちょ。{w=300}
細い とこだらけや。`,
  ikari: `@npc_kanenari
いかりか。{w=300}
重たい もんほど、{w=300}
細い とこが あるんや。`,
};

/** 割れたとき（グソっ君。順に）。 */
export const KATA_WARE = [
  `@npc_kanenari
……食お。`,
  `@npc_kanenari
……これも 食お。`,
  `@npc_kanenari
……陸の おかし、{w=300}
割れても うまいな。`,
];

/** しめらせすぎて 線が とけたとき。 */
export const KATA_TOKE = `@narr
板が しめって、
線が とけた。
@npc_kanenari
……しめらせ すぎや。{w=300}
食お。`;

/** やめたとき（キャンセル）。 */
export const KATA_YAME = `@npc_kanenari
……きょうは ここまでや。{w=300}
食お。`;

/** ぬけたとき（型の 名前を 入れる）。 */
export function kataNuketa(name: string): string {
  return `@narr
${name}が、{w=300}
1つも 欠けずに
ぬけた。`;
}

/** 赤ペンの しるし（地の文）。 */
export const KATA_MARK: Record<'hanamaru' | 'maru' | 'chon', string> = {
  hanamaru: `@narr
板の すみに、赤ペンで
はなまる。`,
  maru: `@narr
板の すみに、赤ペンで
まる。`,
  chon: `@narr
板の すみに、赤ペンで
ちょん。`,
};

/** はじめて ぬけた ときの グソっ君と、つぎの 型。 */
export const KATA_CLEAR: Record<Exclude<KataKey, 'ikari'>, string> = {
  hyoutan: `@npc_kanenari
1つ目や。{w=300}
……食うのが もったいないな。
@narr
つぎの 型は、かさ。`,
  kasa: `@npc_kanenari
柄の とこ、{w=300}
息 止めとったわ。
@narr
つぎの 型は、ちょうちょ。`,
  chou: `@npc_kanenari
ちょうちょ、{w=300}
飛んでかんように 食お。
@narr
箱の 底に、いかりの 型。`,
};

/** 4つとも はなまる（1回）。 */
export const KATA_MEIJIN = `@narr
4つとも、はなまる。{w=300}
番付の グソっ君の 札に、
赤い 字で『名人』。
@sys
朱肉が 1 たまった。`;

/** いかりの 画面の 中の グソっ君（1行ずつ。細い ところを 1つ ぬける たびに）。 */
export const IKARI_COUNT = ['輪。', 'つめ、1本。', '2本。はさみと 同じや。', '……さいごの ひとかけ。'];

/** 型ぬきの 画面の 字（キーの 札・めもり・コツの 名前）。 */
export const KATA_UI = {
  key: '押すと すすむ',
  stop: 'やめる',
  shimeri: 'しめり',
  makenai: '負けない！',
  tame: 'ここ',
  hanamaru: 'はなまる',
  maru: 'まる',
  chon: 'ちょん',
};

// ================================================================ 番付の コツ

export const TIP_TALK: Record<TipKey, string> = {
  sae: `@npc_sae
型ぬき？{w=300}
番付の、関脇だよ。
/
型ぬきはね、{w=300}
ぬく 前に、線を
ぜんぶ 目で なぞるの。
/
夕日も そう。{w=300}
描く 前に、{w=300}
いっぱい 見るの。`,
  hiyori: `@npc_sand_girl
型ぬき？{w=300}
せきとめと 同じ。
/
いっぺんに やると、{w=300}
くずれるの。
/
ちょっと やって、{w=300}
ちょっと 待つ。`,
  chizu: `@npc_mizumaki
型ぬき？{w=300}
今日の 地面は、よく 飲むのよ。{w=300}
……型ぬきの 板も。
/
水は ちょっとだけ。{w=300}
飲ませすぎると、{w=300}
とけちゃうの。
@npc_kanenari
わいの はさみ、{w=300}
いつも しめっとるからな。`,
  madam: `@npc_madam
型ぬき？{w=300}
横綱よ。{w=300}
……負けない！
/
コツなんか ないわ。{w=300}
割れない と 思えば、{w=300}
割れないの！
@npc_kanenari
……それ、{w=300}
コツなんか？
@npc_madam
それに、うちの 人、{w=300}
いつも 最後の ところで
割っちゃうのよね。
/
毎年よ。{w=300}
……ふしぎよね。
@narr
コタロウが、{w=300}
しっぽを 1回 ふった。`,
  kazuo: `@npc_kazuo
型ぬきかい。{w=300}
わたしは 2番で いいんだ。
@npc_kanenari
……おっちゃん、{w=300}
最後で 割るんやろ。{w=300}
毎年。
@narr
ピー・コックは、{w=300}
新聞を 少し 下げた。
@npc_kazuo
……針はね、{w=300}
最後の ひとかけが
いちばん かんたんなんだ。
/
だから、{w=300}
そこで 割るのが、{w=300}
いちばん むずかしい。
/
妻には、ないしょだよ。{w=300}
1番の 顔を 見るのが、{w=300}
わたしの 1番なんだ。`,
};

/** コツを おぼえた（型ぬきの 画面に 出る 助け）。 */
export const TIP_GOT: Record<TipKey, string> = {
  sae: `@sys
コツ『線を 見る』を おぼえた。{w=300}
ぬく 前に、線が 1回 光る。`,
  hiyori: `@sys
コツ『ちょっと 待つ』を おぼえた。
指を はなすと、ひびが
ふさがって いくのが 見える。`,
  chizu: `@sys
コツ『水は ちょっとだけ』を
おぼえた。{w=300}
しめりの めもりに、ちょうどの 帯。`,
  madam: `@sys
コツ『負けない！』を おぼえた。{w=300}
1枚に 1回だけ、
割れる ところで もちこたえる。`,
  kazuo: `@sys
コツ『最後の ひとかけ』を
おぼえた。{w=300}
最後の 角の 手前に、しるし。`,
};

/** ピー・コック：なんばるわんより 先に 行ったとき（1回）。 */
export const TIP_KAZUO_EARLY = `@npc_kazuo
型ぬきかい。{w=300}
わたしは 2番で いいんだ。
/
コツなら、妻に 聞くと いい。{w=300}
1番だからね。`;

// ================================================================ 番付の 書きかえ（おばあの 出番は ここだけ）

export const KAKIKAE = {
  nuketa: `@narr
いかりが、{w=300}
1つも 欠けずに
ぬけた。`,
  yoku: `@npc_obaa
……はい、{w=300}
よくできました。`,
  dokugaku: `@npc_obaa
……あんた、{w=300}
教わらなくても
できる 子だね。`,
  ask: `@npc_obaa
さて、{w=300}
番付の どこに 入れようかね。
? 横綱 | 大関
[横綱]
@npc_obaa
横綱が 2人かい。{w=300}
……まあ、いいさ。{w=300}
東と 西だ。
[大関]
@npc_kanenari
わいも、{w=300}
2番で ええわ。
[-]`,
  kaku: `@narr
おばあは、番付に
新しい 札を 書いた。`,
  page: `@sys
みました帳の すみに、ページが ふえた。
『型ぬき 番付』`,
  reward: `@sys
朱肉が 2 たまった。`,
};

// ================================================================ そのあと

/** なんばるわん：書きかえの あとの 1回（横綱／大関）と、その つぎの 1回。 */
export const AFTER_MADAM = {
  yokozuna: `@npc_madam
横綱の となりに 来たわね！{w=300}
……負けない！`,
  ozeki: `@npc_madam
2番が 2人？{w=300}
うちの 人の 仲間ね。`,
  again: `@npc_madam
型ぬきも、{w=300}
負けない！`,
};

/** ピー・コック：書きかえの あとの 1回（名場面）。 */
export const AFTER_KAZUO = {
  yokozuna: `@npc_kazuo
1番がね、{w=300}
2人に なった。
/
妻の となりが、{w=300}
にぎやかで、いい。`,
  ozeki: `@npc_kazuo
2番がね、{w=300}
2人に なった。
/
……にぎやかで、いい。`,
  tail: `@npc_kanenari
おっちゃん、{w=300}
ほんまは 1番やろ。
@npc_kazuo
しーっ。`,
};

/** コタロウ：ピー・コックの わけを 聞いた あと（1回）。 */
export const AFTER_KOTARO = `@narr
コタロウは、{w=300}
ないしょの 顔を した。`;

/** なんばるわんの家の テーブル：書きかえの あと（クッキーの 缶の 中）。 */
export const AFTER_TABLE = `@narr
丸い テーブルに、
クッキーの 青い 缶。
/
さいほう 道具の 下に、
ひょうたんの 型ぬきが 何枚も。
/
どれも、{w=300}
同じ ところで 割れている。{w=300}
最後の ひとかけ。`;

export const AFTER_TABLE_KN = `@npc_kanenari
……毎年 1枚、{w=300}
やな。`;

// ================================================================ みました帳①の すみの ページ『型ぬき 番付』

export const KATANUKI_BOOK = {
  title: '型ぬき 番付',
  /** 1枚目の 小見出し（新しい 番付の 写し） */
  utsushi: '番付の 写し',
  /** 2枚目：型ごとの 記録 */
  kiroku: '型の 記録',
  nuke: 'ぬけた',
  wari: '割った 数',
  kotsu: 'コツ',
  ikari: 'いかりの 絵',
};

/** 文の 検査に 渡す 全部。 */
export const KATANUKI_TEXTS = {
  intro: KATANUKI_INTRO,
  wallAsk: KATANUKI_WALL_ASK,
  wall: KATANUKI_WALL,
  wallS01: KATANUKI_WALL_S01,
  wallAfter: KATANUKI_WALL_AFTER,
  ask: KATA_ASK,
  first: KATA_FIRST,
  ware: KATA_WARE,
  toke: KATA_TOKE,
  yame: KATA_YAME,
  nuketa: KATA_ORDER.map((k) => kataNuketa(KATA_NAME[k])),
  mark: KATA_MARK,
  clear: KATA_CLEAR,
  meijin: KATA_MEIJIN,
  tip: TIP_TALK,
  tipGot: TIP_GOT,
  kazuoEarly: TIP_KAZUO_EARLY,
  kakikae: KAKIKAE,
  madam: AFTER_MADAM,
  kazuo: AFTER_KAZUO,
  kotaro: AFTER_KOTARO,
  table: AFTER_TABLE,
  tableKn: AFTER_TABLE_KN,
};
