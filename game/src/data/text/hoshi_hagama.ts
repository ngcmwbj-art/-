// 赤子 泣いても（げむきか 10/17 の 案4、2026-10-17 依頼主の 採用。02_ch2_index #105）。
// ペロの 家の かまどの 羽釜には『朝 5時 炊く』の 紙（今の 文）。朝が 来ないので 火が つかない。ペロに 頼んで、
// 夜の うちに 炊いて みる：その場で 米を 研ぐ → 人さし指を 米に 立てて 1つ目の ふしまで 水（水加減）→ 半時間ほど
// 水に つけて 待つ → 囲炉裏の 炭から 火種、杉の 枯れ葉で 焚きつけ → 「はじめ ちょろちょろ、なか ぱっぱ、ジュウジュウ
// ふいたら 火を 引いて、赤子 泣いても ふた 取るな」→ おこげは 町に 下宿して いる くりこの 好物。
//
//   1 朝の 紙（かまどを 2回 調べる。2回目に グソっ君）→ flag_hg_look 2
//   2 ペロの 頼み（3号ハウスの 前の ペロに 話す）→ ペロの 家の 土間へ
//   3 研ぐ・水加減（大写し「羽釜の 中」）・半時間ほど つけて 待つ・火種
//   4 はじめ ちょろちょろ（大写し「かまど」：薪を 足す・引く、火吹き竹で 吹く、わら、蒸らし）
//   5 おこげ（名場面）・6 ごほうび（おにぎり 3つ、朱肉 +2、みました帳②の すみ）→ flag_hg_done
//   かくし：縁側の 梅干しを 取っていれば 塩むすび。きつね色の おこげ → ツガオ便の 分（転回場の ヒロスケへ）
//
// 決まり（依頼主 2026-10-17）：米は 長く 水に つけない。研いだら 半時間ほど 水に つけて 炊く。前もって 研いで
// おく 形は とらない。第2章の 台詞に 時刻の 数字・「まだ」・第3章の 中身・「いただきます」を 入れない（かまどの 紙
// 『朝 5時 炊く』は 今の 地の文の まま。ここには 書かない）。食べる 場面でも「いただきます」と 言わない。
// 地の文・名札の 名前に「さん」なし（ヒロスケの「ペロさん」は 呼び方）。ペロの 口ぐせ「ほどよいなぁ」は 使わない。
// 子どもが 火を 使うので、火ばさみ・薪は ペロが 渡す（いつも 横に いる）。
// 1ページ 3行 × 336px（textcheck2 と hgText）。表示名は hoshi_npcs.ts（ペロ・ヒロスケ・ポコシャ）。

// ================================================================ 1 朝の 紙

/** かまどの 2回目（今の 文の あと）。第2章の 夜だけ（クリア後の 夜は 朝が 来る）。 */
export const HG_KAMI_KN = `@npc_kanenari
朝、炊くんか。{w=300}
……朝、来えへんのに。`;

// ================================================================ 2 ペロの 頼み

export const HG_TANOMI_A = `@npc_hoshi_mitsu
羽釜かい。{w=300}
朝の ぶんの 米が、
米びつに 入ってるよ。`;

/** 第2章の 夜だけ。 */
export const HG_TANOMI_KONAI = `@npc_hoshi_mitsu
朝が 来ないなら、{w=300}
米も 待ちくたびれる。`;

export const HG_TANOMI_B = `@npc_hoshi_mitsu
炊いて みるかい。{w=300}
おれが、横で 見てるよ。`;

// ================================================================ 3 研ぐ・水加減・つけて 待つ・火種

export const HG_TOGU = `@npc_hoshi_mitsu
まず、米を 研ごう。{w=300}
水がめの 水で。
@narr
しゃっ、しゃっ。{w=300}
水が、白く にごる。
/
水を かえて、また 研ぐ。{w=300}
……水が、すきとおって きた。
@npc_hoshi_mitsu
研いだら、{w=300}
水加減だ。`;

export const HG_MIZU_A = `@npc_hoshi_mitsu
人さし指の 先を、{w=300}
米の 上に、そっと
立ててごらん。
/
水が、指の 1つ目の
ふしまで くれば、{w=300}
それで、ちょうど いい。
@npc_kanenari
わいの 手、はさみやで。{w=300}
ふし、どこや。
@npc_hoshi_mitsu
……じゃあ、しゅんの 手で。`;

export const HG_MIZU_RULE = `@sys
←→で ひしゃくの 水を
足す・くむ。{w=300}
けってい で 決める。`;

export const HG_MIZU_OOI = `@npc_hoshi_mitsu
おかゆに なるよ。`;

export const HG_MIZU_SUKUNAI = `@npc_hoshi_mitsu
かたい ごはんに なるよ。`;

/** 水加減の 決まり（かため・ちょうど・やわらかめ）。 */
export const HG_MIZU_KIME: Record<'kata' | 'chodo' | 'yawa', string> = {
  kata: `@npc_hoshi_mitsu
少し、かためだね。{w=300}
それも いい。`,
  chodo: `@npc_hoshi_mitsu
うん。{w=300}
ちょうど いい。`,
  yawa: `@npc_hoshi_mitsu
少し、やわらかめ。{w=300}
それも いい。`,
};

/** 水加減の あと：半時間ほど つけて 待つ（短い 場面）。 */
export const HG_HITASU = `@npc_hoshi_mitsu
研いだら、{w=300}
半時間ほど、水に
つけて おくんだ。
/
米が、水を 吸うまで。
@npc_kanenari
半時間！？{w=300}
わい、待たれへん。
@npc_hoshi_mitsu
……待つのも、{w=300}
炊く うちだよ。`;

export const HG_MATSU = `@narr
囲炉裏の そばで、待った。{w=300}
……米が、少しずつ
白く なっていく。
@npc_kanenari
……そろそろ か？
@npc_hoshi_mitsu
……そろそろ だね。`;

export const HG_HIDANE = `@npc_hoshi_mitsu
囲炉裏の 炭を、{w=300}
1つ もらって いこう。
@npc_kanenari
はさむのは、{w=300}
わいの 仕事やろ。
@npc_hoshi_mitsu
それは、{w=300}
火ばさみの 仕事。
@narr
ペロが、火ばさみで
赤い 炭を かまどへ。
/
杉の 枯れ葉が、{w=300}
ぱちぱち 鳴って
燃えだした。`;

// ================================================================ 4 はじめ ちょろちょろ（大写し「かまど」）

export const HG_HI_RULE = `@sys
→ 薪を 足す　← 薪を 引く
けってい 火吹き竹で 吹く。{w=300}
釜の 音を、よく 聞いて。`;

export const HG_UTA = `@npc_hoshi_mitsu
はじめ ちょろちょろ、{w=300}
なか ぱっぱ。`;

/** ① で 火が 強すぎた（1回）。 */
export const HG_SHIN = `@npc_hoshi_mitsu
はじめから 強いと、{w=300}
芯が 残るよ。`;

export const HG_PAPPA = `@npc_hoshi_mitsu
なか ぱっぱ。{w=300}
薪を 足して。`;

/** ② の はじめ（1回）。 */
export const HG_FUKIDAKE = `@npc_hoshi_mitsu
火吹き竹。{w=300}
ここを くわえて、
ふーっと。
@npc_kanenari
わい、息は
おしりの ほうで
するねん。
/
くわえられへん。
@npc_hoshi_mitsu
……そりゃ、{w=300}
ご苦労さん。
@narr
しゅんが、吹く 番だ。`;

export const HG_JUJU = `@npc_hoshi_mitsu
ジュウジュウ ふいたら、{w=300}
火を 引いて。`;

export const HG_KOBORE = `@narr
ふたの すきまから、{w=300}
泡が あふれた！
@npc_hoshi_mitsu
引いて、引いて。`;

export const HG_PACHI = `@npc_hoshi_mitsu
パチパチ いったら、{w=300}
水が なくなった 合図。
/
わらを ひとにぎり。{w=300}
→ で 入れて。`;

export const HG_WARA = `@narr
わらが、ぱっと 燃えて、{w=300}
ペロが すぐ 火を 落とした。`;

export const HG_WARA_LATE = `@npc_hoshi_mitsu
……ちょっと、{w=300}
こげの においだね。`;

export const HG_WARA_NONE = `@npc_hoshi_mitsu
わらは、{w=300}
入れなかったね。`;

export const HG_MURASHI = `@npc_kanenari
ちょっと だけ、{w=300}
のぞいても ええか。
@npc_hoshi_mitsu
赤子 泣いても、{w=300}
ふた 取るな。
@npc_kanenari
赤ちゃん、{w=300}
おらんやん。
@npc_hoshi_mitsu
……おれが 泣いても、だ。
@sys
何も 押さずに、待つ。`;

export const HG_MURASHI_NG = `@narr
ふたが、少し 浮いた。
@npc_hoshi_mitsu
あっ。{w=300}
……もう 1回、待とう。`;

/** 大写しを やめた（もどる）。 */
export const HG_STOP = `@npc_hoshi_mitsu
火は、おれが
落として おくよ。{w=300}
また 炊こう。`;

// ================================================================ 5 おこげ

export const HG_OKOGE_A = `@narr
ふたを 開けると、{w=300}
湯気が 天井まで
のぼった。`;

/** 炊きあがり（かため・ちょうど・やわらかめ）。 */
export const HG_KAMA: Record<'kata' | 'chodo' | 'yawa', string> = {
  kata: `@npc_hoshi_mitsu
しっかりした、{w=300}
かための ごはんだ。`,
  chodo: `@npc_hoshi_mitsu
ふっくら、{w=300}
炊けたね。`,
  yawa: `@npc_hoshi_mitsu
やわらかめ。{w=300}
……やさしい ごはんだ。`,
};

/** おこげ（なし・うすい・きつね色・こげ）。 */
export const HG_OKOGE: Record<'nashi' | 'usui' | 'kitsune' | 'koge', string> = {
  nashi: `@narr
釜の 底まで、{w=300}
白い ごはん。`,
  usui: `@narr
釜の 底に、{w=300}
うすい おこげ。
@npc_kanenari
ちょっと、{w=300}
パリっと しとる。`,
  kitsune: `@narr
釜の 底に、{w=300}
きつね色の おこげ。
@npc_kanenari
パリパリや！{w=300}
……あっつ！ うまっ！`,
  koge: `@narr
釜の 底が、{w=300}
黒く こげていた。
@npc_kanenari
にがっ！{w=300}
……でも、ちょっと うまい。`,
};

/** おこげが ある とき。 */
export const HG_KURIKO = `@npc_hoshi_mitsu
おこげは、{w=300}
くりこの 好物 でね。
/
下宿の 手紙には、{w=300}
書いて こないけど。
/
炊飯器では、{w=300}
できないんだ。`;

export const HG_HITORI = `@npc_hoshi_mitsu
1人だと、羽釜は
大きすぎる。{w=300}
……今夜は、ちょうど いいね。`;

/** 縁側の 梅干しを 取って いない。 */
export const HG_UME = `@narr
ペロは、縁側の 梅干しで、
おにぎりを にぎった。`;

/** 縁側の 梅干しを 取って ある。 */
export const HG_SHIO = `@npc_hoshi_mitsu
梅干しは、もう
もらって いったね。{w=300}
……塩で にぎろう。
@narr
ペロは、塩で
おにぎりを にぎった。`;

export const HG_KIME = `@npc_hoshi_mitsu
米も トマトも、{w=300}
待つのが うまいんだ。`;

// ================================================================ 6 ごほうび

export const HG_REWARD = `@sys
ペロの おにぎりを 3つ
手に入れた！
/
朱肉が 2 ふえた。
/
みました帳②の すみに、
『はじめ ちょろちょろ』の
ページ。`;

/** 2回目から：いちばん よかった 炊きあがりが かわった。 */
export const HG_BEST = `@sys
みました帳の ページを
書きなおした。`;

// ================================================================ かくし：ツガオ便の 分

export const HG_BIN = `@npc_hoshi_mitsu
もう 1つ、{w=300}
にぎって おこう。
朝の 便の 分。`;

export const HG_GET_BIN = `@sys
『便の分のおにぎり』を
あずかった。`;

export const HG_BIN_HIRO = `@npc_hirosuke
ども！{w=300}
ペロさんの おにぎり？
師匠、起きたら 喜ぶよ。
@npc_pokosha
……あ。
@narr
おにぎりは、軽トラの
助手席に のった。`;

// ================================================================ すんだ あと・2回目

export const HG_PERO_AFTER = `@npc_hoshi_mitsu
羽釜は、{w=300}
洗って ふせて おいたよ。`;

export const HG_AGAIN_ASK = `@npc_hoshi_mitsu
もう 1回、炊くかい。
? 炊く | やめる`;

export const HG_AGAIN_YES = `@npc_hoshi_mitsu
じゃあ、{w=300}
米を 研ごう。`;

export const HG_AGAIN_NO = `@npc_hoshi_mitsu
羽釜は、{w=300}
いつでも 空いてるよ。`;

/** 2回目の 研ぐ（短く）。 */
export const HG_TOGU2 = `@narr
しゃっ、しゃっ。{w=300}
……水が、すきとおって きた。`;

/** 2回目の つけて 待つ（短く）。 */
export const HG_MATSU2 = `@narr
半時間ほど、
囲炉裏の そばで 待った。`;

// ================================================================ 大写しの 字

export const HG_UI = {
  placeMizu: '羽釜の 中',
  placeHi: 'かまど',
  keysMizu: ['← くむ', '→ 足す', 'けってい 決める'],
  keysHi: ['→ 薪を 足す', '← 薪を 引く', 'けってい 吹く'],
  keysMurashi: ['何も 押さない'],
  /** 段の 名前（①〜⑤）。 */
  dan: ['ちょろちょろ', 'なか ぱっぱ', 'ふいたら 引く', 'わら', 'ふた 取るな'],
  /** 釜の 音。 */
  oto: { choro: 'ちょろちょろ', gutsu: 'ぐつぐつ', juju: 'ジュウジュウ', pachi: 'パチパチ', shin: 'しーん' } as Record<string, string>,
  wrist: '指の ふし',
};

/** みました帳②の すみ『はじめ ちょろちょろ』。 */
export const HG_BOOK = {
  title: 'はじめ ちょろちょろ',
  /** 右の ページの 題（2行）。 */
  titleLines: ['はじめ', 'ちょろちょろ'],
  dan: ['ちょろちょろ', 'ぱっぱ', 'ふいたら 引く', 'わら', 'ふた 取るな'],
  kama: { kata: 'かため', chodo: 'ちょうど', yawa: 'やわらかめ' } as Record<string, string>,
  okoge: { nashi: 'なし', usui: 'うすい', kitsune: 'きつね色', koge: 'こげ' } as Record<string, string>,
  kamaLabel: 'ごはん',
  okogeLabel: 'おこげ',
};

/** ページの 順位（大きいほど よい。flag_hg_best_kama・flag_hg_best_okoge）。 */
export const KAMA_RANK: Record<'kata' | 'chodo' | 'yawa', number> = { kata: 1, yawa: 2, chodo: 3 };
export const OKOGE_RANK: Record<'nashi' | 'usui' | 'kitsune' | 'koge', number> = { nashi: 1, koge: 2, usui: 3, kitsune: 4 };
export const KAMA_OF = (r: number): keyof typeof KAMA_RANK | null => (Object.keys(KAMA_RANK) as (keyof typeof KAMA_RANK)[]).find((k) => KAMA_RANK[k] === r) ?? null;
export const OKOGE_OF = (r: number): keyof typeof OKOGE_RANK | null => (Object.keys(OKOGE_RANK) as (keyof typeof OKOGE_RANK)[]).find((k) => OKOGE_RANK[k] === r) ?? null;

export const HG_ITEM_ONIGIRI_DESC: [string, string] = ['ペロの 羽釜の ごはんの おにぎり。', 'HPを 50 回復。'];
export const HG_ITEM_BIN_DESC: [string, string] = ['きつね色の おこげ入り。', 'ツガオ便の 分。'];

/** 文の検査（hgText・debug の walk）に出す物。 */
export const HG_TEXTS: Record<string, unknown> = {
  HG_KAMI_KN, HG_TANOMI_A, HG_TANOMI_KONAI, HG_TANOMI_B, HG_TOGU, HG_MIZU_A, HG_MIZU_RULE, HG_MIZU_OOI, HG_MIZU_SUKUNAI,
  HG_MIZU_KIME, HG_HITASU, HG_MATSU, HG_HIDANE, HG_HI_RULE, HG_UTA, HG_SHIN, HG_PAPPA, HG_FUKIDAKE, HG_JUJU, HG_KOBORE,
  HG_PACHI, HG_WARA, HG_WARA_LATE, HG_WARA_NONE, HG_MURASHI, HG_MURASHI_NG, HG_STOP, HG_OKOGE_A, HG_KAMA, HG_OKOGE,
  HG_KURIKO, HG_HITORI, HG_UME, HG_SHIO, HG_KIME, HG_REWARD, HG_BEST, HG_BIN, HG_GET_BIN, HG_BIN_HIRO, HG_PERO_AFTER,
  HG_AGAIN_ASK, HG_AGAIN_YES, HG_AGAIN_NO, HG_TOGU2, HG_MATSU2,
};
