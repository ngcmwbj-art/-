// 急かすと、甘うならん（げむきか 10/25 の 案3、2026-10-25 依頼主の 採用。03_ch3_index）。第3章の クリア前、段階3
// （旧水族館の 中）。S17 の あと（flag_ch3_diorama_done）から S19 の 決着の 前まで（flag_ch3_esa_done が 立つまで）、
// 水槽の うら map_c3_aq_ura の 搬入口で、裏の 顔の ヒロスケが 小さな 焼き芋の 機械で 芋を 3本 焼く。
// 3本目は「置いとく」→ S21 の 倉庫に すべりこむ、冷めた 焼き芋（S21 に 1ページ：IM_S21）。
//
// 決まり：ヒロスケ（裏）は「わし」、広島ことば寄り、笑わない。表の「ども！」「わはは」と 口ぐせ「焼き芋 食うか？」
// （60 の 割り当て 4回）は 言わない。話は S17 で 本人が 言った 駅の ベンチの 範囲だけ（S20 から 先と 真相には ふれない）。
// 甘く なる わけは ふだんの 言い方で（温度の 数字・酵素の 名前は 出さない）。「まだ」は 使わない（第3章の まだまだ団の 言葉）。
// 地の文・名札の 名前に「さん」なし（グソっ君の「ヒロスケさん」は 呼び方）。1ページ 3行 × 336px（textcheck2 と imText）。

// ================================================================ 焼き芋の 機械（obj_c3_ura_imoki）

/** 〔imo〕の 前・ヒロスケの いない 間。 */
export const IM_IMOKI = `@narr
小さな 焼き芋の 機械。{w=300}
引き出しに、小石が
しきつめて ある。`;

/** すんだ あと。 */
export const IM_IMOKI_AFTER = `@narr
機械は、{w=300}
ほんのり
あたたかい。`;

// ================================================================ 1 親分の 夜食（ヒロスケの〔imo〕）

export const IM_A = `@npc_hirosuke
……腹が 減ったのう。
@narr
搬入口の わきに、{w=300}
小さな 焼き芋の 機械。
引き出しに、小石。
@npc_hirosuke
親分の 夜食じゃ。{w=300}
……わしが 焼く。
@npc_kanenari
焼き芋……{w=300}
真夏の 昼やで？
@npc_hirosuke
芋に、{w=300}
季節は 言わせん。`;

// ================================================================ 2 急かすと（大写しを 開いて）

export const IM_NARABE = `@narr
ヒロスケは、芋を 3本
小石の 上に ならべて、{w=300}
つまみを『弱』に 回した。`;

export const IM_B = `@npc_kanenari
強火で、{w=300}
早よ 焼けへんの？
@npc_hirosuke
芋は、急かすと {w=300}
甘うならん。
/
ゆっくり 焼くと、{w=300}
芋が 自分で
甘う なるんじゃ。
@npc_kanenari
……たかしも、{w=300}
鉄板は 急かすと
すねる 言うとった。
@npc_hirosuke
焼く もんは、{w=300}
どれも そうじゃ。`;

/** かくし：うらの ② 真水の タンクの 話を 聞いている（flag_aqura_hiro。1回）。 */
export const IM_MAMIZU = `@npc_hirosuke
水も 芋も、{w=300}
足さにゃ いけん もんは
足す。`;

// ================================================================ 3 焼き芋の 窓（大写し。待つ）

/** つまみを「強」に した 1回目（ヒロスケが 止める。2回目からは つまみが もどる 絵だけ）。 */
export const IM_KYOU = `@npc_hirosuke
……皮だけ 焦げて、{w=300}
中は 甘うない。`;

/** かくし：「強」に 3回 回した（1回）。 */
export const IM_KYOU3 = `@npc_kanenari
……わい、{w=300}
急かしすぎや。
@npc_hirosuke
海の もんは、{w=300}
せっかちじゃのう。`;

/** 待つ あいだ（1ページずつ。けっていで 進む）。 */
export const IM_MATSU_1 = `@npc_hirosuke
……わしは、{w=300}
待つのが 下手で のう。`;

export const IM_IMA = `@npc_hirosuke
……今じゃ。`;

export const IM_KAESU = `@narr
芋を、ころりと 返した。
@npc_hirosuke
……ええ。`;

export const IM_MATSU_2 = `@npc_hirosuke
駅の ベンチでも、{w=300}
待ちくたびれて
寝てしもうた。
@npc_kanenari
……ほんで、{w=300}
芋は、待てるんか。
@npc_hirosuke
芋は、待てば {w=300}
甘う なるけえ。`;

export const IM_KUSHI = `@npc_hirosuke
……串じゃ。`;

export const IM_SUTTO = `@narr
すっ と、{w=300}
通った。`;

// ================================================================ 4 3本

export const IM_SANBON = `@narr
皮と 身の すきまから、{w=300}
蜜が にじんだ。
@npc_hirosuke
1本は、親分。{w=300}
1本は、おまえらじゃ。
@npc_kanenari
あっつ！{w=300}
……あっま！`;

export const IM_OITOKU = `@narr
ヒロスケは、3本目を
新聞紙で 包んで、{w=300}
台車の 上に 置いた。
@npc_hirosuke
……1本は、{w=300}
置いとく。
@npc_kanenari
冷めてまうで。
@npc_hirosuke
冷めても、うまい。{w=300}
夏は、わざと 冷やして
食う もんも おる。`;

/** かくし：第2章の 野菜の 配達で、ヒロスケの 焼き芋を もらっていた（flag_ch2_delivery。1回）。 */
export const IM_MURA = `@npc_hirosuke
……村でも、{w=300}
1本 もろうて
くれたのう。`;

// ================================================================ 5 待ったぶんだけ

export const IM_C = `@npc_hirosuke
芋は、{w=300}
待ったぶんだけ
甘うなる。
@npc_kanenari
……ヒロスケさんも、{w=300}
今日は、よう
待てたやん。
@npc_hirosuke
…………{w=300}
親分が 待っとる。
@narr
ヒロスケは、シャッターの
小窓の ほうへ
向きなおった。`;

/** 6 ごほうび。 */
export const IM_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳③の すみに、
『急かすと、甘うならん』の
ページ。`;

// ================================================================ 7 S21（倉庫。「……ぬるいのに、うまいわ。」の あと）

export const IM_S21 = `@npc_kanenari
……あの 1本や。{w=300}
冷めても、うまいて
言うとったな。`;

// ================================================================ 大写し「焼き芋の 窓」

export const IM_UI = {
  place: '焼き芋の 窓',
  /** やり方の カード（ui/closeup.ts）。 */
  howto: { id: 'imo', line: '{←→}で つまみ、合図で {Z}', pic: 'lr' as const },
  knob: ['弱', '中', '強'],
  knobLabel: 'つまみ',
  steps: ['待つ', '返す', '串'],
  keys: {
    wait: '←→ つまみ',
    kaesu: 'けってい 返す',
    kushi: 'けってい 刺す',
  },
};

// ================================================================ みました帳③の すみ『急かすと、甘うならん』

export const IM_BOOK = {
  title: '急かすと、甘うならん',
  /** 右の ページは せまいので 2行。 */
  titleLines: ['急かすと、', '甘うならん'],
  /** ヒロスケの 字（角ばって）。 */
  hiro: '弱',
  /** グソっ君の 字。 */
  kn: 'あっま',
  /** 焼けた 芋。 */
  imo: (n: number) => `焼けた 芋 ${n}/3`,
  /** 「強」に 回した 回数（すみに 小さく）。 */
  kyou: (n: number) => `強 ×${n}`,
};

/** 文の検査（imText・debug の walk）に出す物。 */
export const IM_TEXTS: Record<string, unknown> = {
  IM_IMOKI, IM_IMOKI_AFTER, IM_A, IM_NARABE, IM_B, IM_MAMIZU, IM_KYOU, IM_KYOU3, IM_MATSU_1, IM_IMA, IM_KAESU,
  IM_MATSU_2, IM_KUSHI, IM_SUTTO, IM_SANBON, IM_OITOKU, IM_MURA, IM_C, IM_REWARD, IM_S21,
};
