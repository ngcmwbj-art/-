// 明日の 朝の 氷（げむきか 10/24 の 案2、2026-10-24 依頼主の 採用。03_ch3_index）。第3章の クリア前、段階2（12:01）。
// S13 の あと（flag_ch3_got_gochisou）から S14 の 前まで（flag_ch3_truck_trap が 立ったら 起きない）。
//
//   段階1 の 前ぶれ：荷さばき場の 製氷機 (39–40,19)（氷が 宙で 止まっている）→ 市場の 中の ツグミ（1回）、
//                    港の 倉庫の 西の はしの 小さな 鉄の 戸 (45,23) の 札『製氷中』。
//   1 氷が 落ちる（市場の 口の ゲン・ツグミ。いつもの〔c2〕の あと、もう 1回 話す〔kori〕）
//   2 135キロ（蔵の 戸の 前）→ 戸の 暗転で 新しい 地図 map_c3_kori（氷の 蔵、16×10）
//   3 氷の 蔵（息が 白い・霜・グソっ君に 防寒着）、機械の 決まり
//   4 角氷（3本）：積み場から 鉤で 引いて、氷道の 口へ。分かれ道・止め板を 合わせ、ツグミの 合図で プッシャー。
//     すべるのは 鉄の 氷道の 中だけ（床は ふつうの 床）。口まで つながって いれば 砕ける。
//   5 明日の 朝（荷さばき場：砕いた 氷の 山）→ ごほうび
//
// 調べ物（$SP/research/koori.md、2026-10-24）に 合わせて 案から 直した 所：
//   ・「午後は、明日の 氷じゃ」→「明日の 朝の 船の 氷を 出す 番じゃ」。角氷は 凍るのに 2昼夜（約48時間）
//     かかるので「この 角氷は、おとといから 凍らせとる」を 足した（作るのでは なく、ためて おいたのを 出して 砕く）。
//   ・「市場の 氷は 135キロ」→「港の 氷屋の 角氷は、1本 135キロ」。「この 港の 氷は、角氷を 砕いて 出す」と
//     この 町の 港の 話に した（今の 小さな 港は 自動の 製氷機の 砕氷が 多い、と 調べ物）。
//   ・「氷の 床」は 使わない。人が 床の 上を 押して すべらせる 手順は 見つからない。本当に あるのは、大きい 角氷を
//     鉤・トングで 引く（FAO）、機械の プッシャーが 氷道を 押し送る（タガワ「角氷搬送装置」）。だから すべるのは
//     鉄の 氷道の 中だけ、押すのは プッシャー、引くのは 鉤（力持ちの グソっ君。いなければ ゲン）。
//   ・角氷の 見た目は「灯りが すけて 青白く」→「まわりが すきとおって、まん中が 白い」。
//   ・「前に 立つな」「押す 前に 声を 出す」は ゲンの 心得として 台詞の 中だけ（氷の 仕事の 決まった 手順・合図
//     としては 出典が ないので、地の文と 帳面では 言い切らない）。
//   ・蔵の 中は マイナス 10度くらい（貯氷庫は −10℃ 前後が 多い）。
// 決まり：地の文・名札に「さん」なし。天丼の 口ぐせは 増やさない。時刻の 数字は 出さない。1ページ 3行 × 336px。

// ================================================================ 段階1 の 前ぶれ

/** 荷さばき場の 製氷機（段階1）。 */
export const KR_SEIHYO_C1 = `@narr
製氷機。{w=300}
口から 落ちる 氷が、
宙で 止まっている。`;

export const KR_SEIHYO_C1_KN = `@npc_kanenari
氷、宙に {w=300}
浮いとる……`;

/** 製氷機を 見た あと、市場の 中の ツグミ（段階1、S07 の あと。1回）。 */
export const KR_TSUGUMI_C1 = `@npc_c3_seri_deshi
氷は、{w=300}
サイレンが 鳴り終わったら
です。`;

/** 製氷機（段階2）。 */
export const KR_SEIHYO_C2 = `@narr
製氷機。{w=300}
口から、ガラガラと
氷が 落ちてくる。`;

/** 製氷機（段階2、すんだ あと）。 */
export const KR_SEIHYO_DONE = `@narr
製氷機の 下に、{w=300}
砕いた 氷が、
山に なっている。`;

// ================================================================ 蔵の 戸（港の 倉庫の 西の はし）

export const KR_DOOR_C1 = `@narr
倉庫の はしの、
小さな 鉄の 戸。{w=300}
札『製氷中』`;

export const KR_DOOR_LOCK = `@narr
小さな 鉄の 戸。{w=300}
鍵が かかっている。`;

export const KR_DOOR_DONE = `@narr
小さな 鉄の 戸。{w=300}
中で、機械の 音が
している。`;

export const KR_DOOR_YASUMI = `@narr
小さな 鉄の 戸。{w=300}
札『本日 休み』`;

// ================================================================ 1 氷が 落ちる（〔kori〕）

export const KR_A = `@narr
ガラガラガラ……{w=300}
荷さばき場の 製氷機が、
氷を 落としている。
@npc_c3_seri
……動いたのう。{w=300}
午後は、明日の 朝の
船の 氷を 出す 番じゃ。
@npc_c3_seri_deshi
船は、{w=300}
氷を 積んで
漁に 出るんです。
/
とった 魚を、{w=300}
すぐ 冷やすから。
@npc_kanenari
冷やされる ほうは、{w=300}
たまらんな……
@npc_c3_seri
角氷は、倉庫の 奥の {w=300}
氷の 蔵じゃ。
……来い。`;

// ================================================================ 2 135キロ（蔵の 戸の 前）

export const KR_TO = `@npc_c3_seri
港の 氷屋の 角氷は、{w=300}
1本 135キロ。
@npc_kanenari
……わい、{w=300}
何人ぶんや。
@npc_c3_seri_deshi
この 港の 氷は、{w=300}
その 角氷を 砕いて
出すんです。
@npc_c3_seri
この 角氷は、{w=300}
おとといから 凍らせとる。
@npc_kanenari
おとといから！？{w=300}
……気の 長い 話や。
@npc_c3_seri
凍るのに、{w=300}
2日 かかるけえの。
@narr
ゲンが、戸の 鍵を 開けた。`;

// ================================================================ 3 氷の 蔵

export const KR_IN = `@narr
息が、白い。{w=300}
壁に、霜が
ついている。`;

export const KR_IN_KN = `@npc_kanenari
さむっ！{w=300}
……深い 海より
さむい！
/
陸に、{w=300}
深い 海より さむい 所、
あったんか。
@narr
ゲンが、かけくぎの 防寒着を
グソっ君の 肩に かけた。
@npc_kanenari
よろいの 上に {w=300}
よろい。`;

/** 機械の 決まり（入って すぐ、1回）。 */
export const KR_RULE = `@npc_c3_seri
角氷は、人の 力じゃ {w=300}
押して 運べん。
/
積み場から、鉤で 引いて、{w=300}
鉄の 氷道に 出す。
あとは、プッシャーが 押す。
/
氷道の 中だけは、{w=300}
すべって 止まらん。
口まで つなげば、砕ける。
@npc_c3_seri
すべって くる 氷の {w=300}
前には、立つな。
押す 前に、声を 出す。
@npc_c3_seri_deshi
合図は、{w=300}
わたしが 言います。`;

export const KR_RULE_KN = `@npc_c3_seri
鉤は、グソっ君じゃ。{w=300}
分かれ道と 止め板は、
しゅん、たのむ。
@npc_kanenari
……まかしとき。`;

export const KR_RULE_SOLO = `@npc_c3_seri
鉤は、わしが 引く。{w=300}
分かれ道と 止め板は、
しゅん、たのむ。`;

// ================================================================ 4 角氷

/** 積み場（角氷を 引く 前に 見る 文）。 */
export const KR_TSUMIBA = `@narr
角氷が、高く 積んである。{w=300}
まわりが すきとおって、
まん中が 白い。`;

export const KR_HIKU_KN = `@narr
グソっ君が、鉤を かけて
角氷を 引いた。`;

export const KR_HIKU_KN_1 = `@npc_kanenari
ずる、ずる……{w=300}
……おもっ！`;

export const KR_HIKU_GEN = `@narr
ゲンが、鉤を かけて
角氷を 引いた。`;

export const KR_HIKU_ARU = `@narr
氷道に、角氷が
1本 出ている。`;

/** プッシャー（角氷が 口に ない とき）。 */
export const KR_PUSHER = `@narr
プッシャー。{w=300}
氷道の 口の 角氷を、
押し出す 機械。`;

export const KR_PUSH_ASK = `@narr
プッシャーの レバー。
? 押す | やめておく`;

export const KR_MAE = `@npc_c3_seri
前に 立つな！`;

/** ツグミの 合図（1本目・2本目・3本目。だんだん 大きく）。 */
export const KR_AIZU = [
  `@npc_c3_seri_deshi
……いきまーす。`,
  `@npc_c3_seri_deshi
いきまーす！`,
  `@npc_c3_seri_deshi
いきまーーす！！`,
];

export const KR_AIZU_KN = `@npc_kanenari
……セリより {w=300}
大きいで。`;

export const KR_LEVER_KN = `@narr
グソっ君が、レバーを 引いた。`;

export const KR_LEVER_GEN = `@narr
ゲンが、レバーを 引いた。`;

export const KR_GARI = `@narr
ガリガリガリ……{w=300}
角氷が、砕けていく。`;

/** ツグミが 数える。 */
export const KR_KAZU = [
  `@npc_c3_seri_deshi
1本！`,
  `@npc_c3_seri_deshi
2本！`,
  `@npc_c3_seri_deshi
3本！`,
];

/** 氷道の はし（行き止まり）で 止まった。 */
export const KR_TOMARU_HASHI = `@narr
角氷は、氷道の はしで
止まった。`;

/** 止め板の 前で 止まった。 */
export const KR_TOMARU_ITA = `@narr
角氷は、止め板の 前で
止まった。`;

export const KR_MODOSU_ASK = `@npc_c3_seri
……もどすか。
? もどす | そのまま`;

export const KR_MODOSU = `@narr
鉤で 引いて、
氷道の 口まで もどした。`;

/** 止まった 角氷は、止め板を 上げても 動かない（1回）。 */
export const KR_MODOSU_HINT = `@npc_c3_seri
止まった 氷は、{w=300}
止め板を 上げても
動かん。もどして、押し直しじゃ。`;

/** 分かれ道（はじめの 1回）。 */
export const KR_BUNKI_1 = `@narr
分かれ道の 板。{w=300}
動かすと、角氷の
行き先が 変わる。`;

/** 止め板（はじめの 1回）。 */
export const KR_TOMEITA_1 = `@narr
止め板。{w=300}
下りていると、角氷は
その 前で 止まる。`;

/** 1本目の あと：ゲンが 分かれ道を 2つ 変える。 */
export const KR_R1 = `@npc_c3_seri
……ええ。{w=300}
次は、分かれ道を
わしが 変えとく。
/
口まで、{w=300}
道を つないで みい。
@narr
ゲンが、分かれ道の 板を
2つ 動かした。`;

/** 2本目の あと：止め板も 2つ 下ろす。 */
export const KR_R2 = `@npc_c3_seri
最後は、止め板も {w=300}
下ろしとく。
/
上がっとらん 止め板の {w=300}
前では、止まる。
よう 見て、つなげ。
@narr
ゲンが、分かれ道の 板を 動かし、
止め板を 2つ 下ろした。`;

/** 3本目を、もどさずに 入れた（かくし、1回）。 */
export const KR_EETE = `@npc_c3_seri
……ええ 手じゃ。{w=300}
わしの 若い ころより。`;

export const KR_OWARI = `@npc_c3_seri
……よし。{w=300}
明日の 朝の ぶんじゃ。
表へ 出よう。`;

/** 蔵の ゲン（ヒント。段ごと）。 */
export const KR_GEN_HINT = [
  `@npc_c3_seri
まずは、積み場から 1本。{w=300}
それから、プッシャーじゃ。`,
  `@npc_c3_seri
分かれ道を、わしが {w=300}
変えといた。
口まで、つないで みい。`,
  `@npc_c3_seri
止め板が 下りとると、{w=300}
そこで 止まる。
道を、たどって みい。`,
];

export const KR_GEN_TASUKE = `@npc_c3_seri
……わしが、道を {w=300}
合わせるか？
? 合わせて もらう | 自分で やる`;

export const KR_GEN_AWASETA = `@narr
ゲンが、分かれ道と
止め板を 合わせた。`;

export const KR_GEN_JIBUN = `@npc_c3_seri
……よし。{w=300}
見とる。`;

/** 蔵の ツグミ。 */
export const KR_TSUGUMI = `@npc_c3_seri_deshi
合図は、{w=300}
わたしが 言います。`;

/** 温度計（蔵の 北の 壁）。 */
export const KR_ONDOKEI = `@narr
温度計。{w=300}
マイナス 10度くらいを
さしている。`;

export const KR_ONDOKEI_KN = `@npc_kanenari
マイナス……{w=300}
わいの 海は、
プラスやで。`;

/** 防寒着の かけくぎ。 */
export const KR_KAKEKUGI = `@narr
防寒着が、
かけくぎに 並んでいる。`;

/** 砕く 機械。 */
export const KR_SAIHYOKI = `@narr
角氷を 砕く 機械。{w=300}
口が、氷道の はしに
開いている。`;

// ================================================================ 5 明日の 朝（荷さばき場）

export const KR_ASA = `@narr
製氷機の 下に、{w=300}
砕いた 氷が、
山に なっている。
@npc_c3_seri_deshi
明日の 朝の 氷、{w=300}
できました。
@npc_kanenari
明日、{w=300}
来るんやな。
……ほんまに。
@npc_c3_seri
氷を 作るんは、{w=300}
明日が 来ると
思うとる もんだけじゃ。
/
……声も、氷も、{w=300}
出し惜しみ せんことじゃ。
@npc_c3_seri_deshi
はい！`;

export const KR_REWARD = `@sys
朱肉が 2 ふえた。
『かち割り』を
2つ もらった。
/
みました帳③の すみに、
『明日の 朝の 氷』の
ページ。`;

/** すんだ あと（市場の 口の 2人）。 */
export const KR_AFTER = `@npc_c3_seri_deshi
明日の 朝も、{w=300}
大きな 声で 言います。`;

/** かくし：来た マサル（★、すんだ あと 1回）。 */
export const KR_MASARU = `@npc_hoshi_gen
……牛舎の {w=300}
水も、夏は
これくらい ほしい。
@npc_c3_seri
……持って いくか。`;

/** かくし：かち割りを 持って、食堂かもめの ナミエ（1回）。 */
export const KR_NAMIE = `@npc_c3_shokudo
かち割り？{w=300}
ゴロウさんの 明日の 船に、
積まれるんじゃね。`;

export const KR_ITEM_DESC: [string, string] = ['つめたい。口に 入れると キーン。', 'HPを 20 回復。'];

/** みました帳③の すみの 1ページ（ui/menu/book_kori.ts）。 */
export const KR_BOOK = {
  title: '明日の 朝の 氷',
  titleLines: ['明日の 朝の 氷'],
  aizu: 'いきまーす！',
  count: (n: number) => `${n}回で 3本`,
  quote: ['氷を 作るんは、', '明日が 来ると', '思うとる', 'もんだけじゃ。'],
};

export const KR_TEXTS: Record<string, unknown> = {
  KR_SEIHYO_C1, KR_SEIHYO_C1_KN, KR_TSUGUMI_C1, KR_SEIHYO_C2, KR_SEIHYO_DONE, KR_DOOR_C1, KR_DOOR_LOCK, KR_DOOR_DONE,
  KR_DOOR_YASUMI, KR_A, KR_TO, KR_IN, KR_IN_KN, KR_RULE, KR_RULE_KN, KR_RULE_SOLO, KR_TSUMIBA, KR_HIKU_KN, KR_HIKU_KN_1,
  KR_HIKU_GEN, KR_HIKU_ARU, KR_PUSHER, KR_PUSH_ASK, KR_MAE, KR_AIZU, KR_AIZU_KN, KR_LEVER_KN, KR_LEVER_GEN, KR_GARI,
  KR_KAZU, KR_TOMARU_HASHI, KR_TOMARU_ITA, KR_MODOSU_ASK, KR_MODOSU, KR_MODOSU_HINT, KR_BUNKI_1, KR_TOMEITA_1, KR_R1,
  KR_R2, KR_EETE, KR_OWARI, KR_GEN_HINT, KR_GEN_TASUKE, KR_GEN_AWASETA, KR_GEN_JIBUN, KR_TSUGUMI, KR_ONDOKEI,
  KR_ONDOKEI_KN, KR_KAKEKUGI, KR_SAIHYOKI, KR_ASA, KR_REWARD, KR_AFTER, KR_MASARU, KR_NAMIE,
};
