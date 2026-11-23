// クリア後（05_postgame 6.1・6.3）：調べる物の、クリア後の文。
// 第1章の段階1〜2・第2章の h1 の「止まった時間」の文（北東へ寄る・17時で止まる・朝が来ない…）が、
// クリア後の どの時間帯にも出ていた物（2026-10-14 に全部の地図を帯ごとに読んで洗い出した）。
// 1ページ。止まった時間の話はしない。季節は 9月のはじめ。

export const PG_OBJ_TEXT: Record<string, string> = {
  // ---------------------------------------------------------------- 小林家
  obj_fan: `@narr
扇風機が、首を ふっている。
9月の 風も、まだ ぬるい。`,
  obj_fridge: `@narr
冷蔵庫が、ぶうんと 鳴っている。
{w=300}麦茶が 冷えている。`,
  obj_katori: `@narr
蚊取り線香の 煙が、
細く のぼっていく。`,
  obj_furin: `@narr
風鈴が、ちりん と 鳴った。`,

  // ---------------------------------------------------------------- 夕鳴町
  obj_outdoor_unit: `@narr
室外機が、ごうごう
回っている。`,
  obj_asagao: `@narr
朝顔の つるが、2階まで
のびている。{w=300}
種が できはじめた。`,
  obj_signpost: `@narr
道しるべ。
『←夕鳴銀座　夕鳴公園→』。`,
  obj_barricade: `@narr
工事は 終わった らしい。
{w=300}コーンが、すみに
重ねてある。`,
  obj_meat_showcase: `@narr
『焼きそば 80円』の 札。
その下に 小さく、
『出来たて あります』。`,
  obj_gacha_ginza: `@narr
ガチャの ハンドルが、
カチカチ 回る。{w=300}
……100円、いる。`,
  obj_clock_shop: `@narr
ウィンドウの 時計たち。
{w=300}秒針が、そろって
同じ 速さで 進んでいる。`,
  obj_cafe_board: `@narr
『本日の おすすめ
夕焼けソーダ 350円』。
{w=300}夕方 限定 らしい。`,
  obj_vending_ginza: `@narr
自販機。
『つめた〜い』が 8つ、
『あったか〜い』が 2つ。`,
  obj_vending_trace: `@narr
自販機の あった 場所。
日焼けの 跡と、コンセントだけ
残っている。`,
  obj_laundry_window: `@narr
ガラスの 向こうで、
乾燥機が 回っている。`,
  obj_shutter_2: `@narr
シャッターに、へのへのもへじが
3つ。{w=300}……3つとも、
ちょっと 笑っている。`,
  obj_koban_lamp: `@narr
交番の 赤い ランプ。
{w=300}町の 目印だ。`,
  obj_arcade_roof: `@narr
アーケードの 縞もよう。
{w=300}日の 光が、縞に そって
ゆっくり 動いていく。`,
  obj_canal: `@narr
用水路の 水が、
さらさら 流れている。`,
  obj_scarecrow: `@narr
かかしが、田んぼを
見張っている。{w=300}
スズメは、気に していない。`,
  obj_swing: `@narr
ブランコが、風で
小さく ゆれている。`,
  obj_clocktower_base: `@narr
台座の プレート。
『夕鳴町 町制 50年 記念』。`,
  obj_tetsubo: `@narr
鉄棒が 3段。
{w=300}いちばん 高い 段は、
にぎると ひんやりする。`,
  obj_sch_uramon: `@narr
夕鳴小学校の 裏門。
{w=300}『2学期の 水やり当番』の
札が、新しく なっている。`,
  obj_speaker_pole: `@narr
町の スピーカー。
{w=300}5時に なると、
チャイムが 鳴る。`,
  obj_bus_stop: `@narr
バス停『ユウナリ前』。
{w=300}時刻表の 最終便は 17:00。
星見台ゆきだ。`,
  obj_covered_car: `@narr
ボディカバーを かけられた 車。
{w=300}カバーの 上で、
猫が 昼寝を している。`,
  obj_pay_machine: `@narr
駐車場の 精算機。
『1時間 100円』。`,
  obj_crossing: `@narr
踏切。{w=300}
カン、カン、カン……と
鳴って、電車が 通りすぎた。`,
  obj_rail: `@narr
耳を すませた。
{w=300}……遠くで、電車の
音が した。`,
  obj_river_steps: `@narr
川の 石段。
{w=300}釣り糸が、ゆるく
水に たれている。`,

  // ---------------------------------------------------------------- 焼きそばの たかし・コインランドリー・交番
  obj_fryer: `@narr
ソースの 鍋。{w=300}
甘い においが する。`,
  obj_showcase: `@narr
大きな 鉄板の カウンター。
値札は 手書き。
『焼きそば 80円』。`,
  obj_scale: `@narr
はかりの 針が、
0を さしている。`,
  obj_dryer_2: `@narr
乾燥機の 中に、
タオルが 1枚。{w=300}
ふかふかだ。`,
  obj_dryer_6: `@narr
乾燥機の 中で、
10円玉が 1枚 光っている。
{w=300}……だれかの 忘れ物だ。`,
  obj_laundry_clock: `@narr
壁の 時計。
{w=300}秒針が、カチ、カチと
進んでいる。`,
  obj_koban_fan: `@narr
扇風機が、首を ふっている。
{w=300}巡査の ほうを 向くと、
少し 長く 風を 送る。`,

  // ---------------------------------------------------------------- モール
  obj_hall_clock: `@narr
モールの 大時計。
{w=300}去年 こわれていたのを、
直した らしい。`,
  obj_body_scale: `@narr
体重計。{w=300}
乗ってみると、
きのうと 同じだった。`,
  obj_fallen_nobori: `@narr
『健康まつり』の のぼり。
{w=300}今度は、まっすぐ
立てて ある。`,
  obj_m4_roof_stairs: `@narr
『屋上 ゆうやけひろば』。
営業時間は、10:00〜17:00。
{w=300}階段の 上から、風が おりてくる。`,
  obj_roof_skylight: `@narr
天窓。
{w=300}下の 2F通路に、
四角い 光が 落ちている。`,

  // ---------------------------------------------------------------- 町の 部屋
  obj_sg_calendar: `@narr
カレンダー。9月。
{w=300}『ボウズ 5時』と、
赤丸が いくつも ついている。`,
  obj_sd_clock: `@narr
柱時計が、カッチ、コッチと
ゆれている。`,
  obj_ck_wall: `@narr
壁の 時計たち。
{w=300}どれも、同じ 時刻を
さしている。`,
  obj_cf_menu: `@narr
メニュー。
『クリームソーダ』『ナポリタン』
『夕焼けセット』。`,
  obj_cf_painting: `@narr
山から のぼる 初日の出の 絵。
すみに『開店 記念』。`,
  obj_cf_phone: `@narr
黒電話。{w=300}
受話器を 持ち上げると、
ツー、と 鳴った。`,
  obj_cz_calendar: `@narr
カレンダー。
{w=300}『運動会』と『敬老会』に
○が ついている。`,
  obj_cz_clock: `@narr
振り子時計が、
ゆっくり ゆれている。`,
  obj_cz_vase: `@narr
ひまわりが 1本。
{w=300}少し、首を
かしげている。`,
  obj_cz_fan: `@narr
扇風機が、首を ふっている。
{w=300}風が、行ったり 来たり。`,
  obj_cz_table: `@narr
ざるに、さやいんげん。
すじを とったのと、
まだのが 半分ずつ。`,
  obj_md_parasol: `@narr
日傘が 3本。
{w=300}レースの、花柄の、
黒い の。`,
  obj_md_dogbed: `@narr
犬の ベッド。
{w=300}テニスボールが、
まん中に 置いてある。`,
  obj_ph_clock: `@narr
写真館の 時計。
{w=300}秒針が、カチ、カチと
進んでいる。`,
  obj_ph_window: `@narr
ショーウィンドウの 裏側。
{w=300}海ぞいの 町の 集合写真が、
いちばん 前に 立ててある。`,
  obj_sk_rail: `@narr
はっぴが、ハンガーに
ずらりと かかっている。
{w=300}秋祭りの ぶん だ。`,
  obj_sk_lantern: `@narr
提灯が、きれいに
ならべてある。{w=300}
秋祭りを 待っている。`,
  obj_sk_taiko: `@narr
たいこ。{w=300}
皮を 指で たたくと、
ぽん、と 鳴った。`,
  obj_sr_books: `@narr
まんがの 背表紙。
{w=300}3巻が、新しく
入っている。`,
  obj_sr_fridge: `@narr
冷蔵庫に、紙コップの 麦茶。
『ご自由に』。`,
  obj_sr_bench: `@narr
長いす。{w=300}
すわると、ぎし、と 鳴った。`,
  obj_sb_gyotaku: `@narr
フナの 魚拓。
{w=300}左を 向いて、
口を あけている。`,
  obj_sb_tank: `@narr
メダカが 5匹、
水草の あいだを
すいすい 泳いでいる。`,
  obj_sb_register: `@narr
呼びりんを 押した。
チーン。{w=300}
……奥で、返事が した。`,
  obj_sb_gap: `@narr
板の すきまから、
細い 光が さしている。`,
  obj_wc_fan: `@narr
換気扇が、ゆっくり
回っている。`,
  obj_wc_locker: `@narr
『本日の 清掃 16:30 済』。
{w=300}きれいに なっている。`,

  // ---------------------------------------------------------------- 畦道・小学校・堰
  obj_bunsui: `@narr
分水。{w=300}
水が、2つの 田へ
6と 4に 分かれていく。`,
  obj_aze_sakai: `@narr
『境』と 彫った 石。
{w=300}石の 上を またいで、
ベンチが 1つ。`,
  obj_aze_ta: `@narr
稲の 穂が、重そうに
垂れている。{w=300}
もうすぐ 稲刈りだ。`,
  obj_sch_mado: `@narr
教室の 窓。
{w=300}カーテンが、風で
ふくらんでいる。`,
  obj_sch_tokei: `@narr
校舎の 時計。
{w=300}長い 針が、
カチッと 1つ 進んだ。`,
  obj_sch_chalk: `@narr
地面に、チョークの けんけんぱ。
{w=300}新しく 描きなおして ある。`,
  obj_sch_pool: `@narr
金網の 向こうに、プール。
{w=300}水は もう 抜いてある。
夏が 終わったのだ。`,
  obj_sch_sakura: `@narr
桜の 木。
{w=300}葉っぱの はしが、
少し 黄色い。`,
  obj_sch_taiya: `@narr
半分 うまった 古タイヤが 3つ。
{w=300}中に、雨水が
たまっている。`,
  obj_sch_uramon_in: `@narr
裏門の 向こうに、
公園の 時計塔。{w=300}
針は、ちゃんと 今を さしている。`,
  obj_kotei_tokei: `@narr
校舎の 大時計。
{w=300}運動会の 練習の 声が、
時計の 下まで 聞こえる。`,
  obj_kotei_nobori: `@narr
のぼり棒が 5本。
{w=300}てっぺんが、
日に 光っている。`,
  obj_kotei_hidokei: `@narr
日時計。
{w=300}影が、今の 時刻を
さしている。`,
  obj_seki_suimon: `@narr
用水路へ 入る 水門。
{w=300}水が、すじに なって
流れこんでいく。`,
  obj_seki_ryousui: `@narr
量水標。
{w=300}水の 線は、
いつもの 高さだ。`,
  obj_seki_seki: `@narr
堰を 落ちる 水が、
白く 光っている。`,
  obj_seki_gyodo: `@narr
魚道。{w=300}
小さな 魚が、段を
1つずつ のぼっていく。`,
  obj_seki_fuchi: `@narr
淵の 泡が、
ゆっくり 回っている。`,
  obj_seki_ryuboku: `@narr
流木。{w=300}
根っこに、小さな
カニが かくれている。`,
  obj_seki_bucket: `@narr
バケツに、川の 水。
{w=300}底で、エビが 1匹
はねた。`,
  obj_seki_yoshi: `@narr
ヨシの 原の 上を、
ツバメが 低く 飛んでいる。
{w=300}……南へ 帰る 前だ。`,

  // ---------------------------------------------------------------- 星見台
  obj_hr_mk2_tokei: `@narr
テレビの 上に、
目覚まし時計が 2つ。
{w=300}……起きる 気は ある らしい。`,
  obj_hr_sawako_enogu: `@narr
絵の具の びんが 並ぶ 棚。
{w=300}『夕焼けの 赤』が、
新しく 入っている。`,
  obj_hr_shoten_abacus: `@narr
そろばん。
{w=300}玉が、きれいに
そろえてある。`,
  obj_hr_h1_fan: `@narr
奥の 換気扇が、
ゆっくり 回っている。`,
  obj_hoshi_school_clock: `@narr
昇降口の 上の 時計。
{w=300}カチ、と 長い 針が
進んだ。`,
  obj_hoshi_monohoshi: `@narr
物干しに、洗濯物。
{w=300}山の 風で、
よく かわいている。`,
  obj_hoshi_kokuban1: `@narr
黒板『本日の 寄り合い
議題：稲刈りの 順番』。
{w=300}その 下に『お茶 おかわり 自由』。`,
  obj_hoshi_nappers: `@narr
座布団が 3枚、ならんでいる。
{w=300}……さっきまで、だれか
寝ていた らしい。`,
  obj_sawa_fuda: `@narr
札が 岸に ささっている。
『遊泳は 5時まで』。`,
  obj_hr_fumi_genko: `@narr
文机に、原稿の 束。
『おやすみ放送』。30年ぶん。
{w=300}いちばん 上は、今夜の ぶん。`,
  obj_hr_mk3_tv: `@narr
テレビが 点いている。
{w=300}天気予報。
あしたも、晴れ。`,
  obj_hr_kominka_kamado: `@narr
かまど。火は 落としてある。
{w=300}羽釜の ふたに、紙。
『朝 5時 炊く』。`,
};

/** 同じ文の物（地図に いくつか 置いてある物）。 */
export const PG_OBJ_SAME: Record<string, string> = {
  obj_aze_ta2: 'obj_aze_ta',
  obj_aze_ta3: 'obj_aze_ta',
  obj_aze_ta4: 'obj_aze_ta',
  obj_aze_ta5: 'obj_aze_ta',
  obj_aze_ta6: 'obj_aze_ta',
  obj_aze_ta7: 'obj_aze_ta',
  obj_aze_ta8: 'obj_aze_ta',
  obj_aze_ta9: 'obj_aze_ta',
  obj_aze_ta10: 'obj_aze_ta',
  obj_seki_yoshi2: 'obj_seki_yoshi',
  obj_seki_yoshi3: 'obj_seki_yoshi',
  obj_seki_yoshi4: 'obj_seki_yoshi',
  obj_seki_yoshi5: 'obj_seki_yoshi',
  obj_hoshi_kokuban1_1: 'obj_hoshi_kokuban1',
  obj_hoshi_kokuban1_2: 'obj_hoshi_kokuban1',
  obj_hoshi_kokuban1_3: 'obj_hoshi_kokuban1',
  obj_hoshi_nappers_1: 'obj_hoshi_nappers',
  obj_hoshi_nappers_2: 'obj_hoshi_nappers',
};

/**
 * 寄り道の物：その帯（窓）の間は、今の台本（懸垂・7つの時計・分水・水辺の図鑑・沢の上）に通す。
 * （ほかの帯は 上の文）
 */
export const PG_OBJ_WINDOW: Record<string, 'yu' | 'yoru'> = {
  obj_tetsubo: 'yu',
  obj_clock_shop: 'yu',
  obj_bunsui: 'yu',
  obj_sb_gyotaku: 'yu',
  obj_sb_tank: 'yu',
  obj_sb_register: 'yu',
  obj_seki_suimon: 'yu',
  obj_seki_fuchi: 'yu',
  obj_seki_yoshi: 'yu',
  obj_seki_yoshi2: 'yu',
  obj_seki_yoshi3: 'yu',
  obj_seki_yoshi4: 'yu',
  obj_seki_yoshi5: 'yu',
  obj_sawa_fuda: 'yoru',
};
