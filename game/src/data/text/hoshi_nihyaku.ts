// 二百十日の 前の 晩（げむきか10/1の5。依頼主の 変更：グソっ君が、聞きに 行く 4人の
// 名前も 言う。02_ch2_index #78、50 9.9・10.24）。
//
//   段階1〜2：とまたろうの 農具小屋 map_hoshi_koya の 表 obj_hr_koya_hyou (3,1) の いつもの
//   文の あとに 1ページ（9月1日の ますに『二百十日』、横に『風』）→ グソっ君（1回）が
//   4人の 名前を 言う。
//   そのあと トマじい・ペロ・マサル・ハモ区長に 1回ずつ〔210〕（グソっ君が 聞いて、
//   村の 人が 自分の 仕事の 目で 答える）。ハモ区長の ところは 選べる 笑いも 入れた。
//   4人目の あと、グソっ君（1回）→ みました帳②の すみに、しゅんの 字で
//   『二百十日の 前の 晩』の 1ページ → 朱肉 +2。ふしぎの 数には 入れない。
//
// 農家の 目（50 2.2 の 表に 足した 事実）：穂の 重い 稲の 倒伏と 刈りにくさ、雨よけハウスの
// 台風の 前の 備え（サイドを 下ろして バンドを 締めなおす。強ければ 屋根の ビニールを
// はがして 骨組みを 守る）、雨に あたった トマトの 裂果、牛舎の 停電で 換気扇が 止まる
// こと と 発電機の 燃料。
//
// 決まり：「防災の日」と 言わない（実在の 制度の 名前）。ペロの「ほどよいなぁ」と マサルの
// 口癖は 使わない。時刻の 数字を 出さない。嵐が 来る 話に しない（第1章の エンディングの
// 天気予報は「あすは 晴れ」）。1ページ 3行 × 336px（textcheck2 が 見る）。地の文・名札の
// 名前に「さん」を つけない（グソっ君の 台詞の 中の「区長さん」は よい）。

/** 表の いつもの 文の あとに 足す 1ページ（@narr の 行は 呼ぶ側が はずして つなぐ）。 */
export const NIHYAKU_HYOU = `@narr
9月1日の ますに、赤い 字で
『二百十日』。{w=300}
その 横に『風』。`;

/** 表を 見たとき、1回だけ（flag_kanenari_flip_nihyaku）：聞きに 行く 4人の 名前。 */
export const NIHYAKU_FLIP = `@npc_kanenari
にひゃくとおか？{w=300}
なんの 日や。
/
トマじいと、ペロと、マサルの
おっちゃんと、ハモ区長に
聞いて みいひん？`;

export type NihyakuWho = 'tome' | 'mitsu' | 'gen' | 'kucho';

/** 4人の 順番（みました帳の ページの 順）と NPC の id。 */
export const NIHYAKU_WHO: { who: NihyakuWho; npc: string }[] = [
  { who: 'tome', npc: 'npc_hoshi_tome' },
  { who: 'mitsu', npc: 'npc_hoshi_mitsu' },
  { who: 'gen', npc: 'npc_hoshi_gen' },
  { who: 'kucho', npc: 'npc_hoshi_kucho' },
];

/** グソっ君が 聞く（隊列に いれば）。 */
export const NIHYAKU_ASK: Record<NihyakuWho, string> = {
  tome: `@npc_kanenari
トマじい、にひゃくとおかて
なんの 日や？`,
  mitsu: `@npc_kanenari
ペロ、にひゃくとおかて
知っとる？`,
  gen: `@npc_kanenari
おっちゃん、にひゃくとおかて
なんの 日や？`,
  kucho: `@npc_kanenari
区長さん、にひゃくとおかて
なんの 日や？`,
};

/** 〔210〕 4人の 答え（1回ずつ）。ハモ区長は このあと NIHYAKU_KUCHO_TSUKKOMI（グソっ君が いるとき）。 */
export const NIHYAKU_210: Record<NihyakuWho, string> = {
  tome: `@npc_hoshi_tome
立春から 数えて、210日目。{w=300}
昔から、嵐の 来る 日と
いうての。
/
穂の 重うなった 稲は、
風で 倒れる。{w=300}
倒れた 田は、刈るのが 骨じゃ。
/
……朝が 来んかぎり、嵐も 来ん。
{w=300}それでも、来て もらわんと
困る。{w=300}稲は、刈って なんぼじゃ。`,
  mitsu: `@npc_hoshi_mitsu
台風の 前はね、サイドを 下ろして、
{w=300}バンドを 締めなおす。{w=300}
風を 中に 入れない。
/
それでも 強けりゃ、
屋根の ビニールを はがす。{w=300}
骨さえ 残れば、また 張れる。
/
トマトは 雨に あたると
割れちまう。{w=300}
……ハウスごと 飛ぶよりは、いいさ。`,
  gen: `@npc_hoshi_gen
停電が いちばん こわい。{w=300}
換気扇が 止まると、
牛が 暑さで まいる。
/
発電機の 燃料は、
いつも 満タンだ。{w=300}
……牛は、風の 日も 食う。`,
  kucho: `@npc_hoshi_kucho
えー、あすは 1日。{w=300}
空き家の 風通しと、体育館の
備蓄の 点検の 日で ございます。
/
えー、懐中電灯の 電池も、
新しいのが ございます。`,
};

/** ハモ区長の 選べる 笑い（グソっ君が 隊列に いるとき）。 */
export const NIHYAKU_KUCHO_TSUKKOMI = `@npc_kanenari
……それ、マサルの おっちゃんに
言うたら よかったんちゃう？
@npc_hoshi_kucho
えー、備蓄は、非常の ときの
もので ございます。{w=600}
/
……夜が 明けないのは、
非常で ございましたな。`;

/** 4人目の あと、グソっ君（1回）。 */
export const NIHYAKU_UMI = `@npc_kanenari
台風て、上で 吹くんやろ。{w=300}
海の 底は、上が 嵐でも、
しーんと しとったで。`;

/** みました帳②の すみの 1ページ（書きとめた とき）。 */
export const NIHYAKU_NOTE = `@narr
みました帳②の すみに、しゅんの
字で『二百十日の 前の 晩』。
/
トマじい：稲が たおれないか
ペロ：ハウスの ビニール
マサル：停電と 換気扇
/
区長：備蓄`;
export const NIHYAKU_REWARD = `@sys
朱肉が 2 たまった。`;

/** みました帳②（ふしぎの 一覧の すみ。番号なし、数に 入れない）の ページ：題と 4人の 行。 */
export const NIHYAKU_BOOK = {
  title: '二百十日の 前の 晩',
  rows: [
    ['トマじい', '稲が たおれないか'],
    ['ペロ', 'ハウスの ビニール'],
    ['マサル', '停電と 換気扇'],
    ['区長', '備蓄'],
  ] as [string, string][],
};

/** textcheck2 が 見る ページ。 */
export const NIHYAKU_TEXTS: Record<string, unknown> = {
  hyou: NIHYAKU_HYOU,
  flip: NIHYAKU_FLIP,
  ask: NIHYAKU_ASK,
  a210: NIHYAKU_210,
  tsukkomi: NIHYAKU_KUCHO_TSUKKOMI,
  umi: NIHYAKU_UMI,
  note: NIHYAKU_NOTE,
  reward: NIHYAKU_REWARD,
};
