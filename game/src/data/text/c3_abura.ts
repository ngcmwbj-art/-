// 毎晩の 油（げむきか 10/19 の 案3、2026-10-19 依頼主の 採用。03_ch3_index 28）。第3章の クリア前、段階3
// （旧水族館の 中。12:00）。S23 で ヤキソバンが 仲間に なってから（flag_ch3_yakisoban）、S24 の 起動
// （trig_ch3_hp）に 入るまで。倉庫の 外の 廊下 map_c3_aq_rouka の ハンコケースの 机 obj_c3_rouka_desk (1–2,5)：
// ケースを 取りもどした あと、机を 2回目に 調べると〔abura〕。ヒロスケ (10,3)・ポコシャ (12,3) は 今の 立ち位置の まま。
//
//   1 使ったら すぐ（机の 2回目。1回だけ）→ flag_ab_start
//   2 うすく、のばす（大写し「ヘラ」：① ふく ←→ 3往復 ② 1てき けってい ③ のばす ←→）× 2本
//   3 待っている（1本目の あと。廊下の 先から 2人が 1回ずつ。S24 の 重さを こわさないよう 短く）
//   4 置物の ヘラ（2本目の あと）→ 5 ごほうび（朱肉 +2、みました帳③の すみ『毎晩の 油』）→ flag_ab_done
//   S33（ending.ts cut5Morning）：すんで いれば 1ページ（置物の ヘラが 朝の 光で 光っている）。
//
// 決まり：S23 までに 明かした ことだけ（ヤキソバン＝たかし、毎晩 最後の 1パックの 客が ツガオ）。グソっ君の 生まれ・
// 8月30日・「1つだけ」には ふれない。地の文・名札に「さん」なし。天丼の 口ぐせは 使わない。1ページ 3行 × 336px。

// ================================================================ 1 使ったら すぐ

export const AB_A = `@narr
ヤキソバンが、{w=300}
ヘラを 2本、机に
ならべた。
/
黒い 墨が、{w=300}
べったり ついている。
@npc_yakisoban
……鉄は、{w=300}
使ったら すぐ だ。
@npc_kanenari
今!? {w=300}
向こうに、ヒロスケと
ポコシャ おるで！
@npc_yakisoban
ほっとくと、{w=300}
さびる。
/
ボウズ、布。{w=300}
グソっ君、そっち 持て。`;

// ================================================================ 2 うすく、のばす（大写し）

export const AB_RULE = `@narr
①←→を 交互に 押して、
布で 墨を ふく。
/
②けっていで、油を 1てき。{w=300}
③←→で、うすく のばす。`;

/** 油を 2てき 以上（べたべた）。 */
export const AB_BETA = `@narr
……べたべたや。
@npc_kanenari
油、ひきすぎや。{w=300}
わいの はさみまで
ぬるぬるや。`;

/** のびた。 */
export const AB_KURO = `@narr
鉄が、黒く
光った。`;

/** 2本目に かかる 前。 */
export const AB_NIHONME = `@npc_yakisoban
……もう 1本。`;

// ================================================================ 3 待っている（1本目の あと）

export const AB_MATSU = `@npc_hirosuke
……早う せえ。
@npc_pokosha
……親分が、{w=300}
言ってました。
/
たかしの 鉄板は、{w=300}
急かしたら いけんって。
@npc_kanenari
待って くれとるんか、{w=300}
あの 2人！
@npc_yakisoban
……鉄板は、{w=300}
急かすと すねる。`;

// ================================================================ 4 置物の ヘラ（2本目の あと）

export const AB_OKIMONO_A = `@npc_kanenari
……あ。{w=300}
店の 前の 置物の ヘラ、
いつも 光っとるやん。
/
20年、外に {w=300}
立っとるのに。`;

/** かくし：段階0 に 置物を 2回 調べている（1回）。 */
export const AB_ASA = `@npc_kanenari
朝、見たで。{w=300}
ほんまに、光っとった。`;

export const AB_OKIMONO_B = `@npc_yakisoban
…………
/
……店を 閉めたら、{w=300}
あっちのにも、ひく。
@npc_kanenari
毎晩!?
@npc_yakisoban
鉄は、{w=300}
毎日 さわって やりゃ、
さびねえ。
@npc_kanenari
……ほな、置物も、{w=300}
毎晩 さわって
もろとったんやな。
@npc_yakisoban
……店の 前に、{w=300}
立っとるからな。`;

/** かくし：2本とも べたべた（1回）。 */
export const AB_BETA2 = `@npc_yakisoban
……まあ、{w=300}
さびるよりは ましだ。`;

/** かくし：第2章の 二百十日（農具小屋）を して いる（1回）。 */
export const AB_KAMA = `@npc_kanenari
トマじいの 鎌も、{w=300}
こうやって
しまっとったで。`;

export const AB_SOURCE = `@npc_kanenari
わいの よろいにも、{w=300}
油 ひいてや。
@npc_yakisoban
……おまえは、{w=300}
鉄じゃ ねえ。
@npc_kanenari
ほな、ソースで
ええで。
@npc_yakisoban
……焼くぞ。
@narr
ヤキソバンは、ヘラを
たすきに さした。{w=300}
……少しだけ、笑った。`;

export const AB_REWARD = `@sys
朱肉が 2 ふえた。
/
みました帳③の すみに、
『毎晩の 油』の
ページ。`;

/** すんだ あと、机（いつもの 文の かわり）。 */
export const AB_DESK_AFTER = `@narr
古い 机。{w=300}
油の においが、
少しだけ 残っている。`;

// ================================================================ S33（いつもの 明日）

export const AB_S33 = `@narr
置物の ヘラが、{w=300}
朝の 光で 光っている。
@npc_kanenari
……ゆうべも、{w=300}
ひいたんやな。`;

// ================================================================ 帳面・大写し

export const AB_UI = {
  place: 'ヘラ',
  steps: ['① ふく', '② 1てき', '③ のばす'],
  keys: { fuku: '←→ ふく', teki: 'けってい 油', nobasu: '←→ のばす' } as Record<string, string>,
  hon: (i: number) => `${i + 1}本目`,
};

/** みました帳③の すみの 1ページ（ui/menu/book_abura.ts）。 */
export const AB_BOOK = {
  title: '毎晩の 油',
  dekiLabel: '2本の でき',
  deki: { kuro: '黒く 光った', beta: 'べたべた' } as Record<string, string>,
  quote: ['鉄は、毎日', 'さわって やりゃ、', 'さびねえ。'],
};

export const AB_TEXTS: Record<string, unknown> = {
  AB_A, AB_RULE, AB_BETA, AB_KURO, AB_NIHONME, AB_MATSU, AB_OKIMONO_A, AB_ASA, AB_OKIMONO_B, AB_BETA2, AB_KAMA,
  AB_SOURCE, AB_REWARD, AB_DESK_AFTER, AB_S33,
};
