// 屋上 ゆうやけひろば（map_mall_roof）— the 1st chapter's side quest
// 「屋上ゆうやけひろばの『4人目』」 (docs/ideas/2026-09-28 #2, 10_narrative 7.18,
// ★2026-09-28 追加). Every page: 3 lines at most, 336 px a line (1.1).
//
// The names in the note are the client's (2026-09-28): はらぺこはっち,
// よっしー, おかみ — who they are is never said.
// ★2026-09-29 グソっ君 (04_gusokkun_plan 2章 8, 案A): the note is from some
// old event of the mall's; グソっ君 reads it and holds his own first
// handshake event — しゅん is his first, the note's 4th.

/** Things to examine on the roof (and the stairs up from M4). */
export const ROOF_OBJ: Record<string, string> = {
  // M4 2F通路, the stairs up in the west end of the north wall
  obj_m4_roof_stairs: `@narr
『屋上 ゆうやけひろば』。{w=300}
営業時間は、10:00〜17:00。
階段の 上から、夕日の 色が おりてくる。`,
  obj_roof_welcome: `@narr
『うこそ ゆうやけひろば』。{w=300}
『よ』は、足もとに 落ちている。`,
  obj_roof_stage: `@narr
『ユウナリ 握手会』。{w=300}
マイクスタンドに、マイクは ない。`,
  obj_roof_chair: `@narr
パイプいす。{w=300}
1つだけ、ステージに 背中を 向けている。`,
  obj_roof_panda_broken: `@narr
『故障中』の 貼り紙。{w=300}
となりの パンダを、じっと 見ている。`,
  obj_roof_tank: `@narr
給水タンク。{w=300}
『この上で 花火を 見ないでください』。`,
  obj_roof_skylight: `@narr
天窓。{w=300}
下の 2F通路に、四角い 夕日が 落ちている。`,
  obj_roof_ac: `@narr
室外機。{w=300}
風で、ファンだけ 回っている。`,
  obj_roof_saigobi: `@narr
『最後尾』の 札。{w=300}
ステージまで、線が 12m 続いている。`,
  obj_roof_balloon: `@narr
手すりに、しぼんだ 風船。{w=300}
鐘の マークが、
ステージの ほうを 向いている。`,
  obj_roof_town: `@narr
夕鳴町が 見える。{w=300}
町じゅうの 影が、こっちを 向いている。`,
};

// ---------------------------------------------------------------- 『握手会 お名前ノート』 (obj_roof_note)

export const ROOF_NOTE = `@narr
『握手会 お名前ノート』。{w=300}
名前は 3つ。
/
『はらぺこはっち』
『よっしー』
『おかみ』。`;

export const ROOF_NOTE_AFTER = `@narr
『握手会 お名前ノート』。{w=300}
名前は 4つに なった。
4行目は、しゅんの 字だ。`;

// ---------------------------------------------------------------- パンダカー (obj_roof_panda)

export const ROOF_PANDA = `@narr
パンダカー。『1回 100円』。{w=300}
目の ランプが、まだ ついている。`;

export const ROOF_PANDA_ASK = `@sys
乗る？（100円）
? 乗る | やめておく`;

export const ROOF_PANDA_RIDE = `@narr
パンダは 1m 進んで、
1m 下がった。{w=300}
満足そうだ。`;

export const ROOF_NO_COIN = `@narr
100円玉が ない。`;

// ---------------------------------------------------------------- コインの双眼鏡 (obj_roof_scope)

export const ROOF_SCOPE = `@narr
コインの 双眼鏡。{w=300}
『100円で 2分』。`;

export const ROOF_SCOPE_ASK = `@sys
のぞく？（100円）
? のぞく | やめておく`;

/** After the first look: the east, beyond the mountains, is night; and the timer never runs (it is 17:00). */
export const ROOF_SCOPE_SEEN = `@narr
山の むこうだけ、夜だった。{w=600}
タイマーは、2分の まま 動かない。`;

/** Looking again: the 2 minutes are still there (no coin). */
export const ROOF_SCOPE_AGAIN = `@narr
タイマーは、まだ 2分 のこっている。`;

export const ROOF_SCOPE_SEEN2 = `@narr
山の むこうは、まだ 夜だ。`;

// ---------------------------------------------------------------- グソっ君 on the roof

/** His word the first time on the roof (before the note). */
export const ROOF_FLIP_FIRST = `@npc_kanenari
空って、こんなに 近いんか。{w=300}
海の 底からやと、見えへんかったで。`;

/** M4 2F, the first time there: a little speech bubble over his head for a moment (not a window). */
export const ROOF_HINT = '上にも なんか あるで';

/** After the handshake, every time on the roof. */
export const ROOF_FLIP_DONE = `@npc_kanenari
本日の 握手会は、終了や。{w=300}
……またの お越しを、やで。`;

// ---------------------------------------------------------------- the handshake (evt_roof_handshake)

/** Talking to him after the note, the first time: the idea (then he goes up by himself). */
export const HS_START = `@npc_kanenari
握手会、か。{w=300}
……ほな、わいも やったろか。握手会。`;

/** On the stage, the first time. */
export const HS_OPEN = `@npc_kanenari
ただいまより、グソっ君の
はじめての 握手会や！{w=300}並んでや！
? 握手する | やめておく`;

/** On the stage again, after 「やめておく」. */
export const HS_OPEN_AGAIN = `@npc_kanenari
握手会、まだ やっとるで。
? 握手する | やめておく`;

/** しゅん holds out his hand: which of his hands? (the little legs all come forward) */
export const HS_WHICH = `@npc_kanenari
……手ぇ、どれで したら ええねん。
@narr
小さい 足が、いっせいに
わしゃっと 前へ 出た。`;

/** The one page that is a little moving (the rest is laughs). */
export const HS_WARM = `@narr
グソっ君の 手は、ひんやりして かたい。{w=300}
にぎり返す 力は、やさしかった。`;

export const HS_FLIP = `@npc_kanenari
これが 握手か。{w=300}
……なんや、ええもんやな。
/
しゅんが 1人目や。{w=300}
ノートやと、4人目やけどな。`;

export const HS_WRITE = `@narr
しゅんは、ノートの 4行目に
名前を 書いた。`;

export const HS_TICKET = `@sys
握手券を 受けとった！`;

export const HS_NO = `@npc_kanenari
え、せえへんの！？{w=300}
……ほな、また 今度な。`;

/** Every page above, for the width check (roofText). */
export const ROOF_TEXTS: Record<string, string> = {
  ...ROOF_OBJ,
  ROOF_NOTE,
  ROOF_NOTE_AFTER,
  ROOF_PANDA,
  ROOF_PANDA_ASK,
  ROOF_PANDA_RIDE,
  ROOF_NO_COIN,
  ROOF_SCOPE,
  ROOF_SCOPE_ASK,
  ROOF_SCOPE_SEEN,
  ROOF_SCOPE_AGAIN,
  ROOF_SCOPE_SEEN2,
  ROOF_FLIP_FIRST,
  ROOF_FLIP_DONE,
  HS_START,
  HS_OPEN,
  HS_OPEN_AGAIN,
  HS_WHICH,
  HS_WARM,
  HS_FLIP,
  HS_WRITE,
  HS_TICKET,
  HS_NO,
};
