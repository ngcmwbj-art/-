// 穂は ほうき、茎は 柄（第2章。げむきか 10/27 の 案5、2026-10-27 依頼主の 採用。02_ch2_index）。
// 集会所の ハモ区長（いつもの 会話の あと、もう 1回）→ 区長の 家の 東の 路地の ホウキモロコシ 3株（大写し「節」：
// ↑↓で 切る 所を えらぶ → 切る → 葉を とる）→ 分校の 軒下の 竹ざおに かける → 集会所（段階1：式辞と さかさの ほうき）
// → ハモ区長。
//
// 事実（調べた 範囲。$SP/handoff/houki_progress.md）：ホウキモロコシは 座敷ほうきの 材料。長野の 農業高校では
// 5月下旬に まいて 8月中下旬〜9月上旬に 収穫（山の 村の 8月末に 穂は 出ている）。穂首節から 一つ 下の 節で 切り、
// 茎の ついた 穂を とる。葉と 葉鞘を とって 束ね、棒に かけて 干し、脱穀（種を 落とす）して ほうきに する。
// 「種を 来年の 畑に まく」は 出典が 見つからないので 言わない（決めゼリフは 穂と 茎の 2つ）。干す 向き
// （穂を 下に）も 言わない。ほうきを さかさに 立てると 長居の 客が 帰る、は 言い伝え（効くとは 言わない）。
// 子どもが 鎌を 使う 形は 依頼主の 返事（2026-10-27「鎌で よい」）。区長は 持ち方を 教えるだけ。
//
// 決まり：第2章の 台詞に 時刻の 数字・「まだ」・「12人」「1日2本」「おまけの 1つ」「3人」・「いただきます」・第3章の
// 中身を 入れない（式辞は「お集まり くださり」）。天丼の 口ぐせは 足さない。区長の「えー」は 式辞の 前置き（説教に
// しない）。「節」「穂首」は グソっ君の 聞き返しで 言いかえる。切る 音は「しゃく」と 軽く。
// 地の文・名札の 名前に「さん」なし。1ページ 3行 × 336px。

// ================================================================ 1 ほうきの 畑（ハモ区長の〔houki〕）

const HATA = `@npc_hoshi_kucho
えー、{w=300}
ほうき家の 東の 路地には、
ほうきの 畑が……
/
……ございます。
@npc_kanenari
名前の {w=300}
まんまやん！
@npc_hoshi_kucho
えー、毎年、{w=300}
1本目の ほうきは、
この 分校に おろします。`;

/** 段階0（灯りの 前）：最初の 5ページで おわる（1回）。 */
export const HB_H0 = `${HATA}
/
刈りごろで {w=300}
ございますが、暗うて、
節が 見えんので ございます。`;

const TANOMU = `@npc_hoshi_kucho
えー、{w=300}
穂首の 1つ 下の
節で、お願い いたします。
@npc_kanenari
ほくび？{w=300}
ふし？
@npc_hoshi_kucho
えー、穂の 根もとが
穂首。{w=300}
茎の 継ぎ目が 節で ございます。
/
鎌は、{w=300}
家の 軒下に ございます。
/
茎を 持つ 手は、{w=300}
切る 所より 上。
鎌は、手前へ 引きます。
/
刈った 穂は、{w=300}
分校の 軒下の 竹ざおに
かけるので ございます。`;

/** 段階1〜2（トマトの 灯り）：〔houki〕の はじまり。 */
export const HB_START = `${HATA}
/
刈りごろで {w=300}
ございます。
${TANOMU}`;

/** 段階0 で 最初の 5ページを 聞いた あと、灯りを 持って。 */
export const HB_START_LIT = `@npc_hoshi_kucho
えー、その 灯りなら、{w=300}
節が 見えるので
ございます。
${TANOMU}`;

/** 刈りに 行く 前・刈って いる 間に もう一度。 */
export const HB_WAIT = `@npc_hoshi_kucho
えー、東の 路地で {w=300}
ございます。
穂首の 1つ 下の 節。`;

// ================================================================ 株（obj_hb_kabu_0〜2）

/** 段階0（暗い）。 */
export const HB_KABU_DARK = `@narr
背の 高い 草が、{w=300}
ならんでいる。
……先が、重たそうだ。`;

/** 〔houki〕の 前・クリア後。 */
export const HB_KABU = `@narr
背の 高い 草。{w=300}
先に、赤茶の 穂が
重たそうに たれている。`;

/** 刈った あと。 */
export const HB_KARITA = `@narr
刈った あと。{w=300}
茎の 下の ほうが
のこっている。`;

/** 1株目を 調べた とき（1回）。 */
export const HB_KAMA = `@narr
区長の 家の 軒下の
鎌を、借りた。`;

// ================================================================ 2 大写し「節」

/** 穂首の すぐ 下で 切った（△。失敗に しない）。 */
export const HB_MIJIKA = `@narr
しゃく。
@npc_kanenari
……短っ。{w=300}
これ、柄 どこ？
@narr
穂だけに なった。`;

/** 穂首の 1つ 下の 節で 切った（◎）。 */
export const HB_CHOUDO = `@narr
しゃく。{w=300}
穂に、茎が ひと節
ついてきた。
@npc_kanenari
柄に なる ぶんや！`;

/** 2つ 下の 節（切らない。もう 1回）。 */
export const HB_NAGA = `@narr
ここで 切ると、{w=300}
長すぎる。
もう ひと節 上だ。`;

/** けっていで 葉を とる。 */
export const HB_HA = `@narr
葉を、{w=300}
下へ しごいて
はがした。`;

export function hbCount(n: number): string {
  return `@sys
刈った 穂 ${n}/3`;
}

/** 3本 とったら（自動）。 */
export const HB_TABA = `@narr
わら縄で、{w=300}
3本を 束ねた。`;

// ================================================================ 3 干す（分校の 軒下の 竹ざお obj_hb_sao）

/** 束を 持つ 前。 */
export const HB_SAO = `@narr
軒下の 竹ざお。{w=300}
何も かかっていない。`;

export const HB_KAKERU = `@narr
束を、{w=300}
竹ざおに かけた。
@npc_kanenari
……いつ 乾くん？`;

/** かくし：「ふくじんづけと 耳の あいさつ」（flag_mimi_awase）の あと（1回）。 */
export const HB_KUSHUN = `@narr
ふくじんづけが 来て、{w=300}
穂の においを かいだ。
/
……くしゅん。`;

/** 段階2：かけた あとの 束（1回）。 */
export const HB_SAO_H2 = `@npc_kanenari
……ほうきも、{w=300}
山の ほう 向いとる。`;

/** かけた あと。 */
export const HB_SAO_AFTER = `@narr
竹ざおの 束が、{w=300}
お日さんを 待っている。`;

// ================================================================ 4 さかさに 立てる（段階1、集会所に もどると）

/** グソっ君が いる ときだけ。 */
export const HB_OHISAN = `@npc_kanenari
なあ、{w=300}
ほうきって、いつ 乾くん？
@npc_hoshi_yoshie
お日さんが {w=300}
出たらね。
@npc_kanenari
……ほな、{w=300}
今年の ほうきは、
お日さん 待ちか。`;

export const HB_SHIKIJI = `@npc_hoshi_kucho
えー、本日は {w=300}
お足もとの 暗い 中、
お集まり くださり……
/
えー、思えば {w=300}
この 分校の 屋根の 下で……`;

export const HB_SAKASA = `@narr
ぴょん夫人が、{w=300}
去年の ほうきを、
そっと さかさに 立てた。`;

export const HB_KOKOMADE = `@npc_hoshi_kucho
……えー、{w=300}
本日は、ここまでと
いたします。
@npc_kanenari
効いとる！
@npc_hoshi_yoshie
ええ {w=300}
おまじない じゃろ。`;

// ================================================================ 去年の ほうき（obj_hb_houki）

export const HB_HOUKI = `@narr
去年の ほうき。{w=300}
よく 使いこんで ある。`;

/** かくし：さかさに 立った あと（1回）。 */
export const HB_HOUKI_SAKASA = `@narr
さかさの ほうき。{w=300}
……区長は、見て 見ぬ
ふりを している。`;

export const HB_HOUKI_SAKASA2 = `@narr
さかさの ほうき。`;

// ================================================================ 5 穂は ほうき（ハモ区長に 話す）

export const HB_HOWA = `@npc_hoshi_kucho
えー、刈って、{w=300}
干して、種を 落として、
編むので ございます。
/
穂は ほうきに、{w=300}
茎は 柄に
なるので ございます。
@npc_kanenari
……ほな、{w=300}
ひと節 長う 切るのは、
柄の ぶんか。
@npc_hoshi_kucho
えー、{w=300}
名字に 恥じぬ よう。`;

/** かくし：3本とも ちょうどの 節で 切れた（1回）。 */
export const HB_MUKO = `@npc_hoshi_kucho
えー、{w=300}
ほうき家の 婿に……
@npc_hoshi_yoshie
ええから。`;

/** 6 ごほうび。 */
export const HB_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳②の すみに、
『穂は ほうき、茎は 柄』の
ページ。`;

/** すんだ あと、もう一度（1回）。 */
export const HB_AFTER = `@npc_hoshi_kucho
えー、お日さんが {w=300}
出ましたら、
1本目は この 分校に。`;

// ================================================================ 大写し「節」の 字

export const HB_UI = {
  place: '節',
  /** やり方の カード（ui/closeup.ts）。 */
  howto: { id: 'hokihata', line: '{↑↓}で 切る 所を えらぶ', pic: 'ud' as const },
  kabu: (k: number) => `${k + 1}本目`,
  keys: {
    erabu: '↑↓ えらぶ',
    kiru: 'けってい 切る',
    ha: 'けってい',
    ha2: '葉を とる',
  },
  ho: '穂',
  hokubi: '穂首',
  fushi: '節',
};

// ================================================================ みました帳②の すみ『穂は ほうき、茎は 柄』

function HB_BOOK_MARKS(v: number[]): string {
  return v.map((x) => (x === 1 ? '◎' : x === 2 ? '△' : '・')).join('');
}

export const HB_BOOK = {
  title: '穂は ほうき、茎は 柄',
  titleLines: ['穂は ほうき、', '茎は 柄'],
  /** 区長の 字。 */
  quote: ['穂首の 1つ 下'],
  /** すみに 区長の 字で 小さく。 */
  kucho: 'えー',
  /** ◎（ちょうどの 節）・△（穂だけ）。 */
  marks: (v: number[]) => '刈った 穂 ' + HB_BOOK_MARKS(v),
  marksOnly: (v: number[]) => HB_BOOK_MARKS(v),
};

/** 文の検査（hbText・textcheck2 の walk）に出す物。 */
export const HB_TEXTS: Record<string, unknown> = {
  HB_H0, HB_START, HB_START_LIT, HB_WAIT, HB_KABU_DARK, HB_KABU, HB_KARITA, HB_KAMA, HB_MIJIKA, HB_CHOUDO, HB_NAGA, HB_HA,
  count: [1, 3].map(hbCount), HB_TABA, HB_SAO, HB_KAKERU, HB_KUSHUN, HB_SAO_H2, HB_SAO_AFTER, HB_OHISAN, HB_SHIKIJI, HB_SAKASA,
  HB_KOKOMADE, HB_HOUKI, HB_HOUKI_SAKASA, HB_HOUKI_SAKASA2, HB_HOWA, HB_MUKO, HB_REWARD, HB_AFTER,
};
