// 屋上 ゆうやけひろば（map_mall_roof）— the 1st chapter's side quest
// 「屋上ゆうやけひろばの『4人目』」 (docs/ideas/2026-09-28 #2, 10_narrative 7.18,
// ★2026-09-28 追加). Every page: 3 lines at most, 336 px a line (1.1).
//
// The names in the note are the client's (2026-09-28): はらぺこはっち,
// よっしー, おかみ — who they are is never said.

/** Things to examine on the roof (and the sign by the door in M4). */
export const ROOF_OBJ: Record<string, string> = {
  // M4 2F通路, the steel door at the west end of the north wall
  obj_m4_roof_door: `@narr
『屋上 ゆうやけひろば』。{w=300}
営業時間は、10:00〜17:00。`,
  obj_roof_welcome: `@narr
『うこそ ゆうやけひろば』。{w=300}
『よ』は、足もとに 落ちている。`,
  obj_roof_stage: `@narr
『カネナリくん 握手会』。{w=300}
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
鐘の 顔が、ステージの ほうを 向いている。`,
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

// ---------------------------------------------------------------- カネナリくん on the roof

/** The place flip, the first time (before the note). */
export const ROOF_FLIP_FIRST = `@flip
ここで 握手会を しました。
（ノートが 残っているはずです）`;

/** After the handshake, every time on the roof. */
export const ROOF_FLIP_DONE = `@flip
本日の 握手会は 終了しました。
（またの お越しを）`;

// ---------------------------------------------------------------- the handshake (evt_roof_handshake)

/** On the stage (he has gone up by himself), the first time. */
export const HS_OPEN = `@flip
ただいまより、握手会を
再開します。（1年ぶり）
? 握手する | やめておく`;

/** On the stage again, after 「やめておく」. */
export const HS_OPEN_AGAIN = `@flip
握手会、まだ やってます。
? 握手する | やめておく`;

export const HS_WARM = `@narr
カネナリくんの 手は、夕日で あたたかい。`;

export const HS_FLIP = `@flip
（4人目の 人）
/
（記録 更新です）`;

export const HS_WRITE = `@narr
しゅんは、ノートの 4行目に
名前を 書いた。`;

export const HS_TICKET = `@sys
握手券を 受けとった！`;

export const HS_NO = `@flip
（あと 1年は 待てます）`;

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
  HS_OPEN,
  HS_OPEN_AGAIN,
  HS_WARM,
  HS_FLIP,
  HS_WRITE,
  HS_TICKET,
  HS_NO,
};
