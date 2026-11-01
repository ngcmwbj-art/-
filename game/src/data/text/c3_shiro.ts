// 波に 見せる 城（げむきか 10/27 の 案1、2026-10-27 依頼主の 採用。03_ch3_index）。第3章の クリア前、段階1（正午）。
// ③海水浴場の 決着の あと（flag_ch3_umi_done）から S12 の ナリオサメの 前まで。台本は events/ch3/shiro.ts。
//
//   1 波が 来る ところで（波打ちぎわの ウミ npc_c3_mago。③の あとの いつもの 会話の あと、もう1回〔shiro〕）→ flag_sr_start
//   2 大写し「砂」その1：海の 家の 前の バケツを 持って、浜の 3つの 所で 砂を すくって 手で 押す
//       上の 乾いた 砂（さらさら）・渚の 波の 中（どろっ）・波打ちぎわの しめった 砂（しっとり。城の 所）
//     まちがえた 砂で 作ると「ざざっ。……山に なった。」（しくじりに しない。もう1回）
//   3 大写し「砂」その2：しめった 砂で 3段（押しかためる → ひっくり返す → 持ち上げる。1つずつ）
//     押しかためずに 返すと「……ずるっ。角が、落ちた。」（もう1回）
//   4 かざり（集めた 物を 1つずつ。0個でも 先へ）：貝がら＝窓・小石＝門・小枝＝旗
//   5 波に 見せる（城が できると すぐ。寄せる 波）→ 6 ごほうび（朱肉 +2、みました帳③の すみ）
//   段階1 で 済んだ あと：城の あと（まるい 小山）。段階2（S13〜S14）：ウミの〔c2〕の あと 1ページ。S14 から 先は 足さない。
//   かくし：城の あとで カイト（穴を 埋める）。水切り（flag_mz_done）を 済ませて いれば 小石で 1行。3段とも 1回で（じいちゃん）。
//
// 調べた こと（げむきか 10-27 の 出典）：砂は 水が 少しだけの ときに いちばん 固まり、乾いても 水びたしでも 崩れる。
// 台詞では 数字を 出さず「水が ちょっとだけ」と だけ 言う（会議 10-27）。
// 決まり：地の文・名札に「さん」なし（グソっ君の「監視員さん」は 台詞）。ウミの 口ぐせ「最後って、こわくない？」と
// カイトの「ピッ！……あ、つい。」は 使わない。時刻の 数字は 出さない。1ページ 3行 × 336px。

// ================================================================ 1 波が 来る ところで

export const SR_A = `@npc_c3_mago
城、作ろ。{w=300}
波が 来る
ところで。
@npc_kanenari
波が 来たら、{w=300}
こわれるやん。
@npc_c3_mago
こわれるよ。
/
……バケツ、{w=300}
海の 家の 前に
あるけえ。`;

/** バケツの 前に もう一度。 */
export const SR_WAIT = `@npc_c3_mago
バケツは、{w=300}
浮き輪の 山の よこ。`;

/** バケツを 持って、城の 前に（どこの 砂でも すくって みる）。 */
export const SR_WAIT2 = `@npc_c3_mago
砂を すくって、{w=300}
手で 押して みて。
……城は、ここの よこ。`;

// ================================================================ 2 バケツ・砂

export const SR_BUCKET = `@narr
砂の ついた 赤い バケツ。
@sys
バケツを 持った。`;

/** 〔shiro〕の 前・済んだ あとの バケツ。 */
export const SR_BUCKET_LOOK = `@narr
砂の ついた 赤い バケツ。`;

/** すくった 砂（手で 押した あと）。 */
export const SR_SUNA = {
  kawaki: `@narr
さらさら。{w=300}
押すと、指の あいだから
こぼれた。
@npc_kanenari
砂時計の 砂や。`,
  doro: `@narr
どろっ。{w=300}
押すと、横へ
流れていった。
@npc_kanenari
……おかゆや。`,
  shittori: `@narr
しっとり。{w=300}
押すと、指の 形が
そのまま 残った。
@npc_c3_mago
それ！{w=300}
水が ちょっとだけ の 砂。`,
} as const;

/** すくって バケツへ（乾いた・水びたし）。 */
export const SR_SUKUU = `@sys
バケツに、砂を すくった。`;

/** 上の 乾いた 砂（〔shiro〕の 前・済んだ あと）。 */
export const SR_KAWAKI_LOOK = `@narr
白っぽい、乾いた 砂。`;

/** まちがえた 砂で 返した。 */
export const SR_ZAZA = `@narr
ざざっ。{w=300}
……山に なった。`;

// ================================================================ 3 3段

export const SR_TATTA = `@narr
すぽっ。{w=300}
バケツの 形の 砂が
立った。
@npc_kanenari
立った！`;

export const SR_TEPPEN = `@npc_c3_mago
てっぺんは、{w=300}
ちっちゃい ほうが
ええんよ。
/
上の 段は、{w=300}
バケツの 半分だけ。`;

export const SR_DAN2 = `@narr
すぽっ。{w=300}
2段目が、のった。`;

export const SR_DAN3 = `@narr
すぽっ。{w=300}
てっぺんが、のった。`;

/** 押しかためずに 返した。 */
export const SR_ZURU = `@narr
……ずるっ。{w=300}
角が、落ちた。
@npc_c3_mago
上から、{w=300}
ぎゅっと せんと。`;

/** かくし：3段とも 1回で（押しかため忘れ 0）。ミナトは サイレン塔なので 名前は 言わない。 */
export const SR_JII = `@npc_c3_mago
……じいちゃんより、{w=300}
うまい。`;

// ================================================================ 4 かざり

export type Kazari = 'kaigara' | 'koishi' | 'eda';
export const KAZARI_ORDER: Kazari[] = ['kaigara', 'koishi', 'eda'];

/** ひろう（浜に もとから ある 物。生き物は 入っていない）。 */
export const SR_HIROU: Record<Kazari, string> = {
  kaigara: `@narr
監視台の 足もとに、{w=300}
白い 貝がら。
中は、からっぽ。
@sys
貝がらを ひろった。`,
  koishi: `@narr
ロープの 杭の よこに、{w=300}
平たい 小石。
@sys
小石を ひろった。`,
  eda: `@narr
パラソルの 下に、{w=300}
流木の 小枝。
@sys
小枝を ひろった。`,
};

export const SR_KAZARI_A = `@npc_c3_mago
かざり、のせよ。`;

export const SR_KAZARI: Record<Kazari, string> = {
  kaigara: `@npc_c3_mago
窓。`,
  koishi: `@npc_c3_mago
門。`,
  eda: `@npc_c3_mago
旗。
@npc_kanenari
……旗は、{w=300}
監視員さんに
下ろされるで。`,
};

/** かくし：水切り（低う、平たく）を 済ませて いれば、小石の とき（1回）。 */
export const SR_KOISHI_MZ = `@npc_kanenari
この 石、{w=300}
水切りに ちょうど ええ
形やな。
/
……今日は 門や。`;

// ================================================================ 5 波に 見せる

export const SR_NAMI_A = `@narr
波が、{w=300}
城の ほうへ
寄せて きた。
@npc_kanenari
来るなら 来い！{w=300}
わいが 守ったる！`;

export const SR_NAMI_B = `@narr
波は、{w=300}
グソっ君の 足の あいだを
通っていった。
/
城の 下の ほうが、{w=300}
すこし、とけた。
@npc_kanenari
……あかん。{w=300}
14本も 足 あるのに、
1本も 止められへん。`;

export const SR_NAMI_C = `@npc_c3_mago
ええんよ。
/
砂の 城は、{w=300}
波に 見せる ために
作るんよ。
@npc_kanenari
……ほな、{w=300}
波に 見て もろたんか。
@npc_c3_mago
うん。{w=300}
……さっきは、海に
見て もろた けえ。`;

/** 2つめの 波（小枝が あれば、それだけ 残る）。 */
export const SR_NAMI_D = `@narr
2つめの 波で、{w=300}
城は、まるい 小山に
なった。`;
export const SR_NAMI_D_EDA = `@narr
2つめの 波で、{w=300}
城は、まるい 小山に
なった。
/
旗の 小枝だけが、{w=300}
立って いた。`;

export const SR_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳③の すみに、
『波に 見せる 城』の
ページ。`;

// ================================================================ 段階で 変わる・かくし

/** 済んだ あと、城の あと（段階1）。 */
export const SR_ATO = `@narr
まるい 小山。{w=300}
てっぺんに、小枝が
1本。`;
export const SR_ATO_NAKI = `@narr
まるい 小山。{w=300}
波の あとが、
ついている。`;

/** 段階2（12:01）：ウミの 今の〔c2〕の あと（済ませた 人だけ。1回）。 */
export const SR_C2 = `@npc_c3_mago
城は、{w=300}
もう ないよ。……ちゃんと、
波が 持って いった。`;

/** かくし：城を 作った あとで カイト（1回）。 */
export const SR_KAITO = `@npc_c3_kanshiin
掘った 穴は、{w=300}
埋めて 帰る。
/
……これ、{w=300}
監視員の しごと。
@narr
グソっ君が、足で 穴を 埋めた。{w=300}
14本ぶん、ていねいに。`;

// ================================================================ 大写しの 字・帳面

export const SR_UI = {
  place: '砂',
  suna: (n: number) => `砂 ${n}/3`,
  dan: (n: number) => `段 ${n}/3`,
  kazari: (n: number) => `かざり ${n}/3`,
  /** 押す 前（決定 1つ）。 */
  keysPress: ['けってい', '押す'],
  /** 詰めた バケツ：↑↓ で えらんで、決定。 */
  menu: ['押しかためる', 'ひっくり返す'],
  keysMenu: ['↑↓ えらぶ'],
  /** 返した あと。 */
  keysLift: ['けってい', '持ち上げる'],
  namae: { kawaki: '乾いた 砂', doro: '水びたし', shittori: 'しめった 砂' } as Record<string, string>,
};

/** 大写しの はじめの カード（1行 全角 15字くらい まで。ui/closeup.ts）。 */
export const SR_HOWTO_SUNA = { id: 'suna', line: '{Z}で 砂を 押す', pic: 'tap' as const };
export const SR_HOWTO_SHIRO = { id: 'shiro', line: '{↑↓}で えらんで、{Z}', pic: 'ud' as const };

/** みました帳③の すみの 1ページ（ui/menu/book_shiro.ts）。 */
export const SR_BOOK = {
  title: '波に 見せる 城',
  suna: (n: number) => `さわった 砂 ${n}/3`,
  kazari: (n: number) => `かざり ${n}/3`,
  /** ウミの 字 */
  umi: 'みず ちょっとだけ',
};

export const SR_TEXTS: Record<string, unknown> = {
  SR_A, SR_WAIT, SR_WAIT2, SR_BUCKET, SR_BUCKET_LOOK, SR_SUNA, SR_SUKUU, SR_KAWAKI_LOOK, SR_ZAZA, SR_TATTA, SR_TEPPEN, SR_DAN2, SR_DAN3,
  SR_ZURU, SR_JII, SR_HIROU, SR_KAZARI_A, SR_KAZARI, SR_KOISHI_MZ, SR_NAMI_A, SR_NAMI_B, SR_NAMI_C, SR_NAMI_D, SR_NAMI_D_EDA,
  SR_REWARD, SR_ATO, SR_ATO_NAKI, SR_C2, SR_KAITO,
};
