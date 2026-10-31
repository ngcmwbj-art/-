// 紐の 番（げむきか 10/20 の 案5「鍵は ポケットに」、2026-10-20 依頼主の 採用。02_ch2_index）。第2章、h2（テツヤを
// 倒した あと flag_ch2_tetsuya_beaten から、星見の 丘へ 上がって ボスに 会うまで）。
// 依頼主の 答え：古い 歩く 型の 耕うん機は、鍵では なく 紐を 引っぱって エンジンを かける。鍵の 話は すべて やめる。
// 安全の 手順：エンジンを 止める（止める レバー）→ 爪の 回るのが 止まるまで 待つ → だれも 紐を 引かないよう、子どもが
// 紐の 番を する → それから つるを 取る。分校の 子どもたちの 役目は「紐の 番」。表示の 題は「紐の 番」（IDは 案の まま：
// flag・obj_hoshi_tetsuya_tsume・item_hoshi_tetsuya_kagi。大事なものは 枕もとへ 持っていく クズの 花）。
// 事実：クズの つるが 爪に 巻きつくのは よく ある。止めずに 手を 出すのは 危ない。クズは 秋の 七草の 1つ、
// 紫の 花は ぶどうの ような 甘い におい（夏の 終わりから 秋）。
//
//   1 ぐるぐる（山道の 入口の 前の テツヤ〈思いだした 姿 (45,2)〉を 2回目に 調べる。(45,3) から 北向き）
//   2 待って！（まつ先生の 大きな 声。グソっ君は はさみを ひっこめる）
//   3 紐の 番（分校の 畑。子どもには 紐の 番を させた）
//   4 止めて、待って、番を して、切る：①止める レバー（回っている 爪が 止まるまで 待つ）②紐の 前に 立つ（選ぶ）
//     ③切る（大写し「爪」：つる 3本。巻き始めの はしを 先に 切ると するっと ほどける）
//   5 ぶどうの におい → 6 紐の 番が おれば（花は タケじいの 枕もとへ）→ 7 ごほうび（朱肉 +2、みました帳②の すみ『紐の 番』）
//
// 決まり：時刻の 数字・「まだ」・第3章の 中身・「いただきます」・「3人」・「12人」を 入れない（「3本」は つるの 数）。
// まだまだ団の 正体・グソっ君の 真相・海ぞいの 町は 出さない。分校の 子らが だれかは 言わない。
// 地の文・名札に「さん」なし（まつ先生の「タケさん」は 呼び方）。1ページ 3行 × 336px（textcheck2 と hmText）。

// ================================================================ 1 ぐるぐる

export const HM_GURU = `@narr
爪に、つるが {w=300}
ぐるぐる 巻いている。
/
エンジンが、{w=300}
ドッ……ドッ……と、
小さく 鳴っている。
/
爪が、{w=300}
ゆっくり 回っている。
@npc_kanenari
からまっとったから、{w=300}
しんどかったんやな。
わいが 切ったる！`;

export const HM_HASAMI = `@narr
グソっ君が、{w=300}
はさみを のばした。`;

// ================================================================ 2 待って！

/** まつ先生の 大きな 声（大きな 字で 画面に 出る。events/ch2/himo.ts の Shout）。 */
export const HM_MATTE = '待って！';

export const HM_MATTE_A = `@narr
まつ先生の 声は、{w=300}
いつもより ずっと
大きかった。
/
グソっ君は、はさみを {w=300}
のばした まま、
かたまった。`;

export const HM_MATTE_B = `@npc_hoshi_fumi
……ごめんね。{w=300}
大きな 声 出して。
/
エンジンが {w=300}
かかっている ときは、
手を 出さないの。
/
止めて、{w=300}
爪が 止まるまで 待って、
それから。
@npc_kanenari
……はさみ、{w=300}
ひっこめます。`;

// ================================================================ 3 紐の 番

export const HM_BAN = `@npc_hoshi_fumi
分校の 畑でね、{w=300}
タケさんに 耕うん機を
借りたの。
/
この 機械は、{w=300}
紐を 引っぱって
エンジンを かけるでしょ。
/
だから 子どもには、{w=300}
紐の 番を させたのよ。
/
止めてから 終わるまで、{w=300}
だれも 紐を 引かない
ように、見てる 係。
@npc_kanenari
地味な 係やな。
@npc_hoshi_fumi
いちばん {w=300}
大事な 係。
/
紐の 番が いれば、{w=300}
だれも エンジンを
かけられない。`;

// ================================================================ 4 止めて、待って、番を して、切る

export const HM_RULE_TOMERU = `@npc_hoshi_fumi
まず、止める レバー。{w=300}
しゅんくん、
倒して くれる？`;

export const HM_SHIN = `@narr
ドッ……ドッ……{w=300}
……しん。`;

/** 爪が 止まりきる 前に けってい。 */
export const HM_MADA_MAWARU = `@npc_hoshi_fumi
止まるまで、{w=300}
見てて。`;

export const HM_TOMATTA = `@narr
爪が、{w=300}
止まった。`;

export const HM_BAN_ASK = `@npc_hoshi_fumi
じゃあ、紐の 番は {w=300}
だれが する？
? しゅんが 紐の 前に 立つ | みんなで つるを 見る`;

/** みんなで つるを 見る（紐の 前が あく）。 */
export const HM_BAN_NG = `@npc_hoshi_fumi
みんなが つるを 見たら、{w=300}
紐の 前が あいちゃう。
/
だれか 1人、{w=300}
紐の 前に。`;

export const HM_BAN_OK = `@narr
しゅんは、{w=300}
紐の 前に 立った。
@sys
紐の 番を まかされた！`;

export const HM_KIRU_RULE = `@npc_hoshi_fumi
グソっ君、{w=300}
もう いいわよ。
@npc_kanenari
よっしゃ。{w=300}
……どこから 切ったら
ええんや。
@npc_hoshi_fumi
巻き始めの はし。{w=300}
よく 見て。`;

export const HM_SURU = `@narr
はしを 切ると、{w=300}
つるが、するっと
ほどけた。`;

/** まん中から 切った（短い 切れはしが 爪の すき間に 残る。失敗は ない）。 */
export const HM_NOKOTTA = `@narr
まん中で 切れた。{w=300}
短い 切れはしが、
爪の すき間に 残った。
@npc_hoshi_fumi
残ったのも、{w=300}
取ってね。`;

export function hmTsuru(n: number): string {
  return `@sys\nつる ${n}/3`;
}

export const HM_TETSU = `@narr
爪が、{w=300}
鉄の 色に もどった。`;

/** 大写しを とちゅうで 閉じた。 */
export const HM_STOP = `@npc_hoshi_fumi
紐の 番は、{w=300}
そのままね。`;

// ================================================================ 5 ぶどうの におい

export const HM_BUDOU = `@narr
切った つるの 先に、{w=300}
紫の 花の ふさ。
@npc_kanenari
……ぶどうの {w=300}
においや。
@npc_hoshi_fumi
クズの 花よ。{w=300}
秋の 七草の 1つ。
/
畑を 取られて {w=300}
しまう 草だけど、
花は、いい においなの。
@npc_kanenari
からんどる くせに、{w=300}
ええ においやな。`;

// ================================================================ 6 紐の 番が おれば

export const HM_KIME = `@npc_hoshi_fumi
紐の 番が おれば、{w=300}
手は、安心して
出せるのよ。
/
……あの 子らも、{w=300}
紐の 番は、ちゃんと
やったのよ。`;

/** かくし：耕作放棄地の 子どもの 足あとを 見ている（1回）。 */
export const HM_ASHI = `@npc_kanenari
あの 足あとの {w=300}
子らも か。
@npc_hoshi_fumi
……ええ。`;

/** かくし：タケじいの 家の 説明書を 見ている（1回）。 */
export const HM_MANUAL = `@npc_kanenari
説明書にも、{w=300}
書いて あったんかな。
@npc_hoshi_fumi
1ページ目に ね。`;

export const HM_HANA = `@npc_hoshi_fumi
花は、{w=300}
タケさんの 枕もとに。`;

export const HM_GET_HANA = `@sys
クズの 花を
あずかった！`;

/** すんだ あと、テツヤ（思いだした 姿）。 */
export const HM_AFTER = `@narr
爪が、{w=300}
鉄の 色を して いる。`;

/** すんだ あと、まつ先生（1回）。 */
export const HM_FUMI_AFTER = `@npc_hoshi_fumi
紐の 番、{w=300}
ごくろうさま。`;

// ================================================================ 集会所：タケじいの 枕もと

export const HM_MAKURA = `@narr
タケじいの 枕もとに、{w=300}
クズの 花を 置いた。
/
タケじいの 寝言が、{w=300}
少し 変わった。
/
『……ほどけたか……』`;

/** かくし：「……もう ひと畝……」を 聞いている（1回）。 */
export const HM_HITOUNE = `@npc_kanenari
ひと畝の 前に、{w=300}
つる、取っといたで。`;

export const HM_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳②の すみに、
『紐の 番』の ページ。`;

// ================================================================ 道具・大写し・帳面

export const HM_ITEM_HANA_DESC: [string, string] = ['テツヤの 爪に からんでいた 花。', 'ぶどうの ような におい。'];

export const HM_UI = {
  place: '爪',
  bandTomeru: 'けってい 止める レバーを 倒す',
  bandMatsu: '爪が 止まるまで 待って、けってい',
  bandKiru: '←→ 切る 所　けってい 切る',
  hashi: 'はし',
  naka: 'まん中',
};

/** みました帳②の すみの 1ページ（ui/menu/book_himo.ts）。 */
export const HM_BOOK = {
  title: '紐の 番',
  how: (n: number) => `はしから ${n}/3`,
  makura: '枕もとへ：○',
  quote: ['紐の 番が', 'おれば、手は、', '安心して', '出せるのよ。'],
};

export const HM_TEXTS: Record<string, unknown> = {
  HM_GURU, HM_HASAMI, HM_MATTE, HM_MATTE_A, HM_MATTE_B, HM_BAN, HM_RULE_TOMERU, HM_SHIN, HM_MADA_MAWARU, HM_TOMATTA,
  HM_BAN_ASK, HM_BAN_NG, HM_BAN_OK, HM_KIRU_RULE, HM_SURU, HM_NOKOTTA, HM_TETSU, HM_STOP, HM_BUDOU, HM_KIME, HM_ASHI,
  HM_MANUAL, HM_HANA, HM_GET_HANA, HM_AFTER, HM_FUMI_AFTER, HM_MAKURA, HM_HITOUNE, HM_REWARD, tsuru: [1, 3].map(hmTsuru),
};
