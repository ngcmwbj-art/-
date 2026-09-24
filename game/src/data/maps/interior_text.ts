// Texts of the shop interiors and the mall (10_narrative.md 6.2 / 6.3 / 6.5 /
// 6.6, 7.3–7.6, 7.12–7.17, 8.6). They are the default texts of the map
// objects; a script registered with the same id (src/events) always wins.

import type { StageText, TalkTable } from '../../world/types';

export const IOBJ: Record<string, StageText> = {
  // ---------------------------------------------------------------- 7.3 肉のマルヤマ
  obj_showcase: `@narr
メンチ、ハムカツ、コロッケ。
値札は 手書き。{w=300}『コロッケ
80円（揚げたては 5時）』。`,
  obj_fryer: {
    s0: `@narr
油が 静かに 待っている。`,
    s1: `@narr
油の 表面が、ときどき
小さく ため息を つく。`,
    's2+': `@narr
油に 夕日が 映っている。{w=300}
ここは 屋根の 下なのに。`,
  },
  obj_meat_chart: `@narr
『牛・豚・鶏 部位の 図』。{w=300}
牛が やけに 誇らしげだ。`,
  obj_scale: {
    s0: `@narr
はかり。{w=300}
ぴかぴかに みがいてある。`,
    's1+': `@narr
なにも 乗っていないのに、
針が 17を さしている。`,
  },
  obj_manekineko: `@narr
招き猫。左手を 上げている。{w=300}
人を 招く ほうだ。`,
  obj_menu_meat: `@narr
『本日の おすすめ：コロッケ』
『明日の おすすめ：コロッケ』`,
  obj_tsuke_book: `@narr
ツケの 帳面。{w=300}
『潮見』の ページが、
新しく 作ってある。`,

  // ---------------------------------------------------------------- 7.4 駄菓子 ひのや
  obj_dagashi_shelf: `@narr
すっぱい 粉、なぞの ゼリー、
長い 棒。{w=300}
どれも 30円より 安い。`,
  obj_kuji: `@narr
当てくじ。{w=300}
1等の 景品は 色あせて、
何だったのか わからない。`,
  obj_bungu: `@narr
赤ペン、のり、スタンプ台。{w=300}
先生みたいな 品ぞろえ。`,
  obj_class_photo: {
    's0-1': `@narr
古い クラス写真。{w=300}
まんなかの 先生は、
若い ころの おばあだ。`,
    's2+': `@narr
古い クラス写真。{w=300}
子どもたちの 名札が、
みんな ちゃんと 読める。`,
  },
  obj_kayaributa: `@narr
ブタの 蚊やり。{w=300}
ブタは 煙を はきながら、
なにも 考えていない 顔だ。`,
  obj_ramune_case: `@narr
ラムネが 冷えている。{w=300}
ビー玉が みんな、
こっちを 見ている。`,
  obj_kids_drawings: `@narr
壁に 子どもの 絵が 貼ってある。
全部に、赤い はなまる。`,

  // ---------------------------------------------------------------- 7.5 コインランドリー ふわり
  obj_dryer_1: `@narr
からっぽ。{w=300}
ガラスに ミナトの 顔が
まるく 映る。`,
  obj_dryer_2: `@narr
タオルが 1枚。{w=300}
持ち主は、まだ 来ない。`,
  obj_dryer_4: `@narr
『故障中』。{w=300}
貼り紙の ほうが、
乾燥機より 古い。`,
  obj_dryer_5: `@narr
くつ下の 片方が 1つ。{w=300}
……乾さんの じゃない 色だ。`,
  obj_dryer_6: `@narr
中で 10円玉が 1枚、
ずっと 回っていた 跡がある。`,
  obj_laundry_mag: `@narr
週刊誌。{w=300}
『今週の 占い：待ち人 来る』。
先週号だ。`,
  obj_detergent_vend: `@narr
洗剤の 自販機。{w=300}
『ありがとう』は 1回だけ 言う。
……ふつうだ。`,
  obj_laundry_notice: `@narr
『乾燥機に 入れたまま
帰らないで ください』。{w=300}
赤字で 3回 書いてある。`,
  obj_lost_socks: `@narr
忘れ物かご。{w=300}
片方だけの くつ下が、
23足ぶん 入っている。`,
  obj_laundry_clock: {
    s0: `@narr
壁の 時計は 16時台。{w=300}
秒針は、ちゃんと 回っている。`,
    's1+': `@narr
17:00。{w=300}
秒針が 12の 手前で、
足ぶみ している。`,
  },

  // ---------------------------------------------------------------- 7.6 交番
  obj_koban_map: `@narr
夕鳴町の 地図。{w=300}
モールの ところに、まだ
『営業中』の 付箋が 貼ってある。`,
  obj_koban_diary: `@narr
日誌。{w=300}
『本日も 異常なし』が、
365行 並んでいる。`,
  obj_koban_poster: `@narr
『交通安全 週間』。{w=300}
信号機の キャラクターが、
3色 全部で 笑っている。`,
  obj_koban_teacup: `@narr
『交通安全』の 湯のみ。{w=300}
お茶は、とっくに 冷めている。`,
  obj_koban_lostbox: `@narr
落とし物の 箱。{w=300}
ハンカチ、手袋の 片方、
名前の ない 定期入れ。`,
  // the koban's lived-in corners (level art; not in the narrative's list)
  obj_koban_tea: `@narr
魔法瓶と、茶筒。{w=300}
伏せた 湯のみが 2つ。
1つは、お客さん用だ。`,
  obj_koban_fan: {
    s0: `@narr
扇風機が、机の ほうへ
首を ふっている。{w=300}
リボンが ぱたぱた 鳴る。`,
    s1: `@narr
扇風機が、首を ふりかけた
まま 止まっている。{w=300}
リボンも、なびいた 形で 止まった。`,
    's2+': `@narr
扇風機が、首を ふっている。{w=300}
風は、なぜか 北東から 来る。`,
  },
  obj_koban_umbrella: `@narr
傘立てに、忘れ傘が 3本。{w=300}
どれにも、名前が
書いていない。`,
  // fushigi_06 before stage 1 (8.6: not an anomaly yet)
  obj_koban_board: {
    s0: `@narr
掲示板 『本日の 落とし物』。{w=300}
……今日は まだ、何も ない。`,
  },

  // ---------------------------------------------------------------- 7.12 M1 正面ホール
  obj_gacha_corner: `@narr
ガチャが 8台。{w=300}
全部 『故障中』の 札。
1台だけ、札が 『休憩中』。`,
  obj_floor_guide: `@narr
『1F 正面ホール・フードコート
・健康器具  2F 迷子センター』
/
手書きで：『迷子センターの カギ
→ フードコート 忘れ物
カウンター』`,
  obj_hall_clock: `@narr
大時計は 17:00。{w=300}
……この 時計は、去年から
止まっている。
/
今日、町が 追いついた。`,
  obj_tanabata: `@narr
七夕の 笹が 残っている。{w=300}
短冊：『あしたも ここに
来れますように』。`,
  obj_ceiling_balloon: `@narr
天井に 風船が 1つ。{w=300}
鐘の 顔が 描いてある。
1年、天井で 待っている。`,
  obj_info_counter: `@narr
呼び鈴を 押すと、
『少々 お待ちください』。{w=300}
……1年 待っている。`,
  obj_hall_escalator_sign: `@narr
『健康器具コーナー・
エスカレーターは こちら』。{w=300}
矢印だけ、元気だ。`,

  // ---------------------------------------------------------------- 7.13 M2 フードコート
  obj_lost_counter: `@narr
『お名前を お書きください』の
用紙の 束。{w=300}
名前の 欄は、全部 空白。`,
  obj_menu_sign: `@narr
『ラーメン』『うどん』
『回転焼き（今川焼き）
（大判焼き）』
/
かっこが 増えている。`,
  obj_pager: `@narr
呼び出しベル。{w=300}
鳴らない まま、1年。
呼ばれるのを 待っている。`,
  obj_water_server: `@narr
コップが 全部 伏せてある。{w=300}
お行儀が いい。`,
  obj_tray_return: `@narr
『ごちそうさまでした』の
プレート。{w=300}
最後の トレーが 1枚。`,
  obj_ramen_shutter: `@narr
『スープ 切れ』。{w=300}
去年から。`,
  obj_food_table: `@narr
テーブルに 子ども用の いす。{w=300}
座面に、ジュースの
まるい 跡。`,
  // 回転焼き機: plain examine text until the fushigi / evt_kaitenyaki takes over
  obj_kaitenyaki: `@narr
回転焼き機が 回り続けている。{w=300}
鉄板の 上で、小さな カギも
いっしょに 回っている。`,

  // ---------------------------------------------------------------- 7.14 M3 健康器具コーナー
  obj_massage_row: `@narr
マッサージチェアが 5台。{w=300}
全部 『お試し中』の まま。`,
  obj_burasagari: `@narr
ぶら下がり 健康器。{w=300}
洗濯物を かけた 跡が ある。
……正しい 使い方だ。`,
  obj_body_scale: `@narr
乗ってみると、『17』と 出た。{w=300}
……何の 17だろう。`,
  obj_foot_mat: `@narr
足つぼ マット。{w=300}
1歩 乗って、2歩 戻った。`,
  obj_health_poster: `@narr
『1日 1万歩』。{w=300}
この コーナー、1年で 0歩。`,

  // ---------------------------------------------------------------- 7.15 M4 2F通路
  obj_mannequin: `@narr
マネキン。{w=300}
ポーズを 決めたまま、1年。
……ちょっと 疲れて 見える。`,
  obj_toy_shutter: `@narr
すき間から、プラモデルの 箱。{w=300}
『未開封』。`,
  obj_glasses_sign: `@narr
眼鏡屋の 看板の 目が、
こっちを 見ている。{w=300}
……看板だった。`,
  obj_skylight: `@narr
天窓から 夕日。{w=300}
床に、四角い 夕方が
落ちている。`,
  obj_cleaning_sign: `@narr
『清掃中』。{w=300}
その 向こうで、掃除機が
1年 ぶん 掃除を している。`,
  obj_maigo_door: `@narr
カギが かかっている。
/
貼り紙：『カギは フードコートの
忘れ物カウンターで
お預かり しています』`,
  obj_rest_bench: `@narr
休憩ベンチ。
『ご自由に おかけください』。`,

  // ---------------------------------------------------------------- 7.16 M5 迷子センター
  obj_maigo_counter: `@narr
低い カウンター。{w=300}
子どもの 目の 高さに、
『どうしたの？』。`,
  obj_broadcast_mic: `@narr
放送用の マイク。{w=300}
電源は 切れている。
/
……さっきの 放送は、だれが？`,
  obj_maigo_log: `@narr
『迷子の おしらせ 記録』。{w=300}
最後の ページだけ、
名前が 書いてない。`,
  obj_lost_pile: `@narr
傘、水筒、片方の 手袋。{w=300}
……将棋の 『歩』が 1枚、
まじっている。`,
  // level-side: the faded mascot poster on the west wall of M5
  obj_maigo_poster: `@narr
色あせた ポスター。{w=300}
『よいこの みかた カネナリくん』。
鐘の 色が、ほとんど 白い。`,

  // ---------------------------------------------------------------- level-side (30_level_art 1.4 / 5.2 / 5.3)
  // The STAFF door between the food court and the health corner.
  obj_staff_door_m2: `@narr
『関係者以外 立入禁止』。{w=300}
カギは、こちら側から 開く。`,
  obj_staff_door_m3: `@narr
むこう側から カギが かかっている。`,
};

/** 7.17: second-examine texts of the hidden items (the 1st text is IOBJ). */
export const IREWARD2: Record<string, string> = {
  obj_tray_return: `@narr
最後の トレーの 下に、
ふがしが 1本 はさまっていた。{w=300}
1年もの だが、軽い。`,
  obj_body_scale: `@narr
体脂肪計の 裏に、
ハッカあめが 貼りついていた。{w=300}
『17』の 正体では なさそうだ。`,
};
/** 7.17: third and later examines. */
export const IREWARD3: Record<string, string> = {
  obj_tray_return: `@narr
『ごちそうさまでした』。{w=300}
もう 何も はさまっていない。`,
  obj_body_scale: `@narr
乗ってみると、やっぱり 『17』。`,
};

/** 13.3: texts of the restored objects left by the mall symbols. */
export const IRESTORED: Record<string, string> = {
  restored_enemy_soujirou: `@narr
掃除機が 充電台で、
小さく 光っている。{w=300}
ランプの 色は、緑。`,
  restored_enemy_momisugi: `@narr
『お試し 中止』の 札。{w=300}
チェアは、ちょっと
ほっとした 顔を している。`,
};

// ---------------------------------------------------------------- NPC talk (6.2 / 6.3 / 6.5 / 6.6)

export const ITALK: Record<string, TalkTable> = {
  npc_maruyama: {
    // s0 1st visit is evt_maruyama_first (on entering the shop)
    s0_1: `@npc_maruyama
油は 急かすと すねる。{w=300}
チャイムまで 待ちな。`,
    s0_2: `@npc_maruyama
ツケの 帳面なら 用意してある。{w=300}
ボウズの ページは、
まだ 白紙だ。`,
    s1_1: `@npc_maruyama
チャイムが 途中で 止まった。{w=300}
油が……迷ってる。
/
揚げて いいのか、待つべきか。{w=300}
油は まじめ だからな。`,
    s1_2: `@npc_maruyama
チャイムが 途中で 止まった。{w=300}
油が……迷ってる。
@narr
丸山は さっきと 同じ 深さで、
眉を 寄せた。`,
    s2_1: `@npc_maruyama
油がな、『まだですか』って
顔してる。{w=300}
油に 顔は ないが。
/
チャイムの 続きが 鳴るまで、
オレも 油も 動けねえ。`,
    s2_2: `@npc_maruyama
ユウナリの フードコートにも、
昔は うちの コロッケを
卸してたんだ。
/
あそこの 回転焼き屋とは、
名前の ことで よく もめたよ。`,
  },
  npc_obaa: {
    // s0 1st visit is evt_obaa_first; the shop menu is opened by the scenario script
    s0_1: `@npc_obaa
おや、また 来たね。{w=300}
……宿題から 逃げてる 顔だ。`,
    s1_1: `@npc_obaa
公園へ 行っておいで。{w=300}
鐘の 頭が 待ってるよ。`,
    s1_2: `@npc_obaa
あの子も 昔は 人気者 だったんだ。
握手会なんか、3人も 並んでね。`,
    s2_1: `@npc_obaa
迷子センター？{w=300}
去年から だれも いないよ。
/
……だれも、
迎えに 行って ないんだ。`,
    s2_2: `@npc_obaa
カネナリくん。{w=300}
あんた、ちゃんと 見て
もらえたかい。
@flip
はなまる もらいました。
@npc_obaa
そうかい。{w=300}
……はい、よくできました。`,
    s2_3: `@npc_obaa
行く前に、スタンプ台を
持って おいき。{w=300}
朱肉は 大事だよ。`,
  },
  npc_inui: {
    s0_1: `@npc_inui
3年 待ってる。{w=300}
靴下の 片方が、乾燥機から
帰ってくるのを。
/
乾です。{w=300}
名前の わりに、乾くのを
待って ばかりで。`,
    s0_2: `@npc_inui
3番の 乾燥機、もう 40分
回ってる。{w=300}
……僕のじゃ ないんです。`,
    s1_1: `@npc_inui
町は 止まってるのに、
乾燥機の 音だけ 止まらない。
/
……乾燥機は、17時を
知らないのかも しれません。`,
    s1_2: `@npc_inui
町は 止まってるのに、
乾燥機の 音だけ 止まらない。
@narr
乾は 文庫本の 同じ ページを、
また めくった。`,
    s2_1: `@npc_inui
……今、片方だけ 帰ってきた。{w=300}
そしたら、もう片方が
行っちゃった。
/
待つのが 終わると、
ちょっと さみしいですね。`,
    s2_2: `@npc_inui
公園の ほうで、放送が
聞こえました。迷子センター。{w=300}
……あそこ、まだ あったんですね。`,
  },
  npc_tsurumi: {
    s0_1: `@npc_tsurumi
異常なし！{w=300}
本日も 夕鳴町は
平和で あります！`,
    s0_2: `@npc_tsurumi
敬礼を やめる タイミングを、
着任以来 のがして おります！`,
    s1_1: `@npc_tsurumi
異常なし！{w=300}
……夕日が 10分 動かないのは、
異常に 入りますかね？
/
それと、公園で
『引退した 方が 勤務中』との
通報が ありました！`,
    s1_2: `@npc_tsurumi
異常なし！{w=300}
……夕日が 10分 動かないのは、
異常に 入りますかね？
@narr
巡査は さっきと 同じ 角度で、
首を かしげた。`,
    s2_1: `@npc_tsurumi
本日の 落とし物は 『17時』。{w=300}
心当たりの ある方は、
交番まで！
/
それと、迷子センターから
無言の 通報が 1件！{w=300}
……モールは 閉店中 なのですが！`,
    s2_2: `@npc_tsurumi
敬礼しすぎて、右手だけ
夕日に 焼けて おります！`,
  },
};

/** 6.5 f05: Inui's one line after fushigi_05 was stamped (once, any stage). */
export const INUI_F05 = `@npc_inui
3番、止まりましたね。{w=300}
……中の 声、君に 似てました。`;

// ---------------------------------------------------------------- event texts used by the fallbacks (5.4 / 5.5 / 5.15 / 5.17 / 5.22)

export const EVT_MARUYAMA_FIRST_A = `@npc_maruyama
へい、らっしゃい！{w=300}
お、潮見さんとこの ボウズか。
/
コロッケ 4つ？{w=300}
悪いな、まだ 揚げてねえんだ。
/
揚げたては 五時の チャイムが
鳴り終わってから。
/
オレの 信念じゃない。{w=300}
油の 信念だ。`;
export const EVT_MARUYAMA_FIRST_B = `@npc_maruyama
金が 足りなきゃ ツケで いい。
それまで ひのやで 時間でも
つぶしてきな。`;

export const EVT_OBAA_FIRST = `@npc_obaa
おや、ミナト。{w=300}
自由研究は？
/
……白紙の 顔を してるね。
/
先生を 40年 やってるとね、
白紙は 顔で わかるのさ。`;
export const EVT_OBAA_FIRST_NOMEAT = `@npc_obaa
コロッケかい？{w=300}
マルヤマは 5時に ならないと
揚げないよ。まあ、見ておいき。`;
export const EVT_OBAA_FIRST_MEAT = `@npc_obaa
チャイムまで あと ちょっと。
好きなの 選びな。`;

export const EVT_MALL_ENTER = `@narr
ショッピングプラザ・ユウナリ。{w=300}
閉店して、ちょうど 1年。
@flip
ここで 握手会を したことが
あります。（3人 来ました）`;

export const EVT_MAIGO_DOOR_LOCKED = `@narr
カギが かかっている。
/
貼り紙：『カギは フードコートの
忘れ物カウンターで
お預かり しています』
@flip
（フードコートは 1Fです）`;
export const EVT_MAIGO_DOOR_OPEN = `@sys
迷子センターの カギを 使った。`;
export const EVT_MAIGO_DOOR_FLIP = `@flip
（……ここ、知っている
気がします）`;
export const EVT_MAIGO_REST = `@flip
ベンチで ひと休み してから
行きましょう。`;

export const EVT_SAVE_BENCH = `@narr
休憩ベンチ。
『ご自由に おかけください』。
/
すわると、体が かるくなった。`;

export const GACHA_M1_MORE = `@narr
……『休憩中』の 1台だけ、
ハンドルが 回りそうだ。`;
export const GACHA_M1_TURN = `@narr
ガチャッ……{w=600}
……ころん。{w=300}休憩あけの 音だ。`;

/** 8.12 fushigi_12 (evt_kaitenyaki). */
export const KAITENYAKI_SEEN = `@narr
回転焼き機が 回り続けている。{w=300}
鉄板の 上で、小さな カギも
いっしょに 回っている。
/
今川焼きか、大判焼きか、
回転焼きか。
/
だれも 名前を 決めて
くれなかった。{w=600}
だから ずっと、回っている。`;
export const KAITENYAKI_PRESSED = `@narr
回転焼き機は、
ようやく 止まった。
/
焼き型が、こっちを 見ている。{w=300}
……名前を、待っている。`;
export const YAKINAMES = ['今川焼き', '大判焼き', '回転焼き'];
export const YAKINAMES_KANA = ['イマガワヤキ。', 'オオバンヤキ。', 'カイテンヤキ。'];
