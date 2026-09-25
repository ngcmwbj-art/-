// 第2章『星見台のトマト』 — what the player examines (50_ch2_story 9章, 116
// objects), the ten ふしぎ of みました帳 ② (8章) and the 「思いだした姿」 left
// where an enemy was beaten (6章).
//
// Every entry is either one msg block, or a record whose keys are
//   - stage keys picked by the ch2 stage (flag_ch2_stage): 'h0', 'h1', 'h2',
//     'h1+', 'h0-1' ... and 'text' as the fallback, and / or
//   - named parts the scripts in src/events/ch2/objects.ts choose between
//     ('second', 'get', 'again', ...).
// The level team places the objects with these ids (52_ch2_level_art 3.5, 4章,
// 5章); src/events/ch2 registers a script for every id, so the text lives here
// only. The msg-block format of 10_narrative 1.4 (world/msg.ts).

export type HText = string | Record<string, string>;

export const HOSHI_OBJ: Record<string, HText> = {
  // ================================================================ 9.1 map_hoshi_train（夜の電車）
  obj_hoshi_tsurikawa: `@narr
つり革が、そろって 同じ ほうへ
ゆれている。{w=300}
……カーブの 前に、もう ゆれている。`,
  obj_hoshi_amidana: `@narr
網棚に、麦わら帽子が 1つ。{w=300}
……夏休みの 忘れ物 らしい。`,
  obj_hoshi_rosenzu: `@narr
路線図。『夕鳴』から『星見台』まで。
/
あいだの 駅には、ぜんぶ
『通過』の シールが はってある。`,
  obj_hoshi_nakazuri: `@narr
中づり広告『星見台 天文台
夏の 観望会 入場無料』。
/
小さく『ゲスト：夕鳴町PR大使
カネナリくん』。{w=300}
……10年前の 日付だ。
@flip
（なつかしいです）`,
  obj_hoshi_seiriken: {
    text: `@narr
整理券の 機械。{w=300}
ボタンを 押すと、1枚 出てきた。`,
    get: `@sys
整理券を 手に入れた！`,
    again: `@narr
整理券は、1人 1枚。`,
  },
  obj_hoshi_untin: `@narr
運賃箱。運賃表の『星見台』の
欄は『――円』。{w=300}
/
……この 電車に、
値段は ない らしい。`,
  obj_hoshi_train_window: `@narr
窓の 外は、星と 山の 影。
{w=300}ときどき、遠くに
家の 明かりが 1つ。`,

  // ================================================================ 9.2 駅と駅前・県道の路肩
  obj_hoshi_ekimeihyo: `@narr
駅名標『ほしみだい』。{w=300}
となりの 駅の 欄は、片方だけ。
……終点だ。`,
  obj_hoshi_kurumadome: `@narr
線路の おしまい。{w=300}
車止めに、夜つゆが ついている。`,
  obj_hoshi_machiai_bench: `@narr
木の ベンチに、座布団が 3枚。
{w=300}だれかが 手作りで
置いていった ものだ。`,
  obj_hoshi_jikokuhyo_eki: `@narr
駅の 時刻表。{w=300}
きょうの 電車は、もう ない。
……時刻表の 上では。`,
  obj_hoshi_tsubame: `@narr
軒下に ツバメの 巣。{w=300}
ことしの ヒナは、
もう 飛んでいった。`,
  obj_hoshi_senpuki: `@narr
天井の 扇風機が、
ゆっくり 回っている。{w=300}
『強』の ボタンは、すりへっていない。`,
  /** Also trig_ch2_edge_rail (pushing south at the platform's edge). */
  obj_hoshi_rail: `@narr
電車は、もう 行ってしまった。`,
  obj_hoshi_bus: `@narr
小さな バス。方向幕『ユウナリ前』。
/
窓に 手書きの 紙。{w=300}
『村営バス 1日2本
いつも ありがとう』`,
  obj_hoshi_mujin: {
    h0: `@narr
無人販売所。きゅうり、なす、
とうもろこし。{w=300}
どれでも 100円。`,
    /** h1〜, while ムジン販売員 is out (after it is beaten: restored_enemy_mujin_hanbaiin). */
    h1: `@narr
台の 上の 料金箱が いない。
{w=300}……台の まわりを、
ぴょんぴょん 跳ねている。`,
  },
  obj_hoshi_nasu: `@narr
なすが 3本、袋に 入っている。
{w=300}つやつやで、
夜空が 映っている。`,
  obj_hoshi_michishirube: `@narr
木の 道標。『↑ 集会所（旧分校）』
『← ハウス』『→ 牛舎』。
/
『↑↑ 星見の丘 天文台』の 字だけ、
新しく 書きなおしてある。`,
  /** Also trig_ch2_edge_road (pushing west at the road's end). */
  obj_hoshi_edge_road: `@narr
ふもとの 町まで、歩くと 2時間。
{w=300}……朝の バスで ないと、
ふもとまで 遠い。`,
  obj_hoshi_jihanki: `@narr
駅前の 自販機。{w=300}
夜の 村で、いちばん 明るい。
/
……おじぎは しない。
ふつうの 自販機だ。`,
  obj_hoshi_kippu: `@narr
無人駅の『きっぷは こちらへ』の 箱。
{w=300}ふたの 上で、
コオロギが 1匹 休んでいる。`,

  // ================================================================ 9.3 集落
  // obj_hoshi_dosojin: 10.18 evt_ch2_save_dosojin (HOSHI_SAVE in hoshi_events.ts)
  obj_hoshi_school_sign: `@narr
板の 看板『星見台 集会所』。
/
その 上に、前の 看板の 跡。
{w=300}『星見台分校』。`,
  obj_hoshi_kinenhi: `@narr
石の 碑『星見台分校 ここに
ありき』。{w=300}
/
裏に、卒業生の 名前。
……放送で 聞いた 名前も ある。`,
  obj_hoshi_hyakuyobako: `@narr
白い 百葉箱。{w=300}
板の すきまから、温度計が
のぞいている。`,
  obj_hoshi_tetsubou: {
    text: `@narr
鉄棒。いちばん 低い 段だけ、
さびが 手の 形に とれている。
{w=300}……だれかが、いまも 使っている。`,
    /** The second look, while フミ先生 is in the gathering room (h0–h1). */
    second: `@narr
朝の 体操の あと、フミ先生が
ぶら下がる らしい。`,
  },
  obj_hoshi_sakura: `@narr
校庭の 桜。夏なので、葉っぱだけ。
{w=300}春の 写真が、
集会所に 貼ってあった。`,
  obj_hoshi_monohoshi: `@narr
物干しに、洗濯物が 3日ぶん。
{w=300}……朝が 来ないので、乾かない。`,
  obj_hoshi_akiya_a: `@narr
雨戸の 閉まった 家。表札『森本』。
{w=300}玄関の 前だけ、
草が 刈ってある。`,
  obj_hoshi_akiya_b: `@narr
空き家。戸に『区の 倉庫
（ご用の 方は 区長まで）』。`,
  obj_hoshi_soko_box: {
    text: `@narr
軒先の 箱に『回覧板用 朱肉
ご自由に』の 札。`,
    get: `@sys
回覧板の朱肉を 手に入れた！`,
    again: `@narr
箱は からっぽ。{w=300}
札だけが、ご自由に と 言っている。`,
  },
  obj_hoshi_kucho_house: {
    text: `@narr
区長の 家。玄関に、回覧板を
置く 台。{w=300}台の 上は からっぽ。`,
    /** After fushigi_ch2_04: the circular came round. */
    after_f04: `@narr
台の 上に、回覧板が
もどってきている。{w=300}
……ちゃんと 回った。`,
  },
  obj_hoshi_fumi_house: `@narr
小さな 平屋。窓辺に、
望遠鏡の 形の 置物。{w=300}
表札の 横に、星の シール。`,
  obj_hoshi_sawako_house: `@narr
軒下に、たまねぎが
つるしてある。{w=300}
……無人販売所の 在庫 らしい。`,
  obj_hoshi_boukatou: {
    h0: `@narr
防犯灯が 1本、切れかけて
またたいている。{w=300}
……星の まねを している。`,
    'h1+': `@narr
防犯灯が、ちゃんと 点いている。
{w=300}トマトの 光に 気づいて、
はりきった らしい。`,
  },
  obj_hoshi_yousui: `@narr
用水路の 水は、山から 来て、
棚田を 回って、ここを 通る。`,
  obj_hoshi_post: `@narr
赤い ポスト。取集時刻の 札。
{w=300}『1日1回』。`,
  obj_hoshi_denchu: `@narr
電柱の 張り紙『イノシシに
注意』。{w=300}
イノシシの 絵が、けっこう かわいい。`,
  obj_hoshi_urie: `@narr
シャッターの 閉まった 店。
色あせた『売家』の 札。
/
連絡先の 字は、雨に
にじんで 読めない。`,
  obj_hoshi_hinomi: `@narr
火の見やぐら。{w=300}
てっぺんに、小さな 半鐘。
@flip
（同業者です）`,
  obj_hoshi_zou: `@narr
空を 指さす 子どもの 像。
台座に『星を 見上げて』。
/
指の 先には、
またたかない 星が 1つ。`,
  obj_hoshi_taiikukan: `@narr
木の 体育館。{w=300}
戸の すきまから、床の
ワックスの においが する。`,
  obj_hoshi_school_clock: `@narr
昇降口の 上の 時計。{w=300}
長い 針が、12の 手前で
止まっている。`,

  // ================================================================ 9.4 西の斜面・3号ハウス
  obj_hoshi_house1: `@narr
1号ハウス。中は 暗くて 見えない。
{w=300}ビニールごしに、
青い トマトの 影。`,
  obj_hoshi_house2: `@narr
2号ハウスの 入口に 札。
{w=300}『ハチ 飼育中
あけたら しめて』。`,
  obj_hoshi_house3_out: {
    h0: `@narr
3号ハウス。ビニールの 奥で、
橙の 点が ぼんやり 光っている。`,
    'h1+': `@narr
3号ハウス。奥は 暗い。{w=300}
……光は、いま アミの 中に ある。`,
  },
  obj_hoshi_container: `@narr
オレンジ色の 収穫コンテナが
重ねてある。{w=300}
ぜんぶ からっぽ。朝を 待っている。`,
  obj_hoshi_danball: `@narr
段ボール『星見台 夏秋トマト』。
{w=300}組み立てたのが 12箱。
……朝 とる 分だ。`,
  obj_hoshi_taihi_bag: `@narr
堆肥の 袋。手書きで『石黒牛舎』。
{w=300}……牛舎から 来た 土だ。`,
  obj_hoshi_tank: `@narr
青い タンク。ハウスの トマトに
水を 送る。{w=300}
タイマーは『5:00』。`,
  obj_hoshi_net: `@narr
山ぎわの 獣害ネット。{w=300}
下の ほうに、鼻で
押した あとが ある。`,
  /** litOnly: only in the lantern's light (h1〜). */
  obj_hoshi_kamado: `@narr
土間の 奥に、かまど。{w=300}
黒い 羽釜が、ふたを して
朝を 待っている。`,
  obj_hoshi_engawa: {
    text: `@narr
縁側に、梅干しの びん。
{w=300}ふたに『ひとつ どうぞ』。`,
    get: `@sys
梅干しを 手に入れた！`,
    again: `@narr
奥の 仏間の 明かりで、
びんの 梅干しが 赤い。`,
  },
  obj_hoshi_ondokei: `@narr
ハウスの 温度計。{w=300}
夜なのに、ちょうど いい 温度。`,
  obj_hoshi_subako: `@narr
マルハナバチの 巣箱。{w=300}
夜は、みんな 巣に 帰っている。`,
  obj_hoshi_kansui: `@narr
トマトの 根もとに、細い
黒い チューブ。{w=300}
朝に なると、水が ぽたぽた 出る。`,
  obj_hoshi_yuuin: `@narr
トマトの 木が、上から 下がった
ひもに そって のびている。{w=300}
ミナトより ずっと 背が 高い。`,
  obj_hoshi_aotomato: `@narr
下の 段は、もう とり終えて
茎だけ。{w=300}
/
上の 段で、青い 実が
ずらりと 待っている。`,
  obj_hoshi_wakime: `@narr
かき取った 脇芽の バケツ。{w=300}
……トマトの いい においが する。`,
  obj_hoshi_nisshi: `@narr
作業日誌。大きな 字で
『8月28日 5段目 色づき』。
/
その 次の 日から、
日付が 進んでいない。`,
  obj_hoshi_makiage: `@narr
横の ビニールを 巻き上げる
ハンドル。{w=300}
朝に 回して、風を 通す。`,
  /** Once, when leaving the house before the tomato is taken. */
  obj_hoshi_house_door: `@narr
奥の 光が、まだ ついている。`,

  // ================================================================ 9.5 東の台地・電気柵・石黒牛舎
  obj_hoshi_barn_out: `@narr
牛舎の 中から、大きな
換気扇の 音。{w=300}
ときどき、牛の 鼻息。`,
  obj_hoshi_barn_sign: `@narr
看板『石黒牛舎』。{w=300}
その 下に『防疫の ため
関係者 以外 立入禁止』。`,
  obj_hoshi_warairoll: `@narr
稲わらの ロールが、屋根の 下に
積んである。{w=300}
牛の ごはんに なる。`,
  obj_hoshi_keitora: `@narr
軽トラの 荷台に、配合飼料の 袋。
{w=300}すみで、ゴンの 毛布が
まるまっている。`,
  obj_hoshi_taihisha: `@narr
堆肥舎。おがくずと ふんが、
ゆっくり 堆肥に なっていく。
/
ほんのり あたたかい。{w=300}
……ミツばあの ハウスへ 行く 土だ。`,
  obj_hoshi_gen_house: `@narr
ゲンさんの 家。{w=300}
奥の 部屋で、だれかが 静かに
寝ている 気配。`,
  obj_hoshi_gate: {
    text: `@narr
電気柵の ゲート。
取っ手が かかっている。{w=300}
……ゲンさんに 聞こう。`,
    open: `@narr
ゲートの 取っ手は、支柱に
かけてある。{w=300}
ゲンさんが 開けて くれた。`,
  },
  obj_hoshi_fence_sign: `@narr
黄色い 表示板『危険 電気さく』。
{w=300}……さわらないで おこう。`,
  obj_hoshi_dengen: `@narr
電気柵の 電源の 箱。
小さな ソーラーパネル つき。
/
緑の ランプが、
1秒おきに 点く。`,
  obj_hoshi_shoukai: `@narr
牛舎の 入口に、白い 粉。
{w=300}消石灰。牛舎に 病気を
持ちこまない ための もの。`,
  obj_hoshi_shodoku: `@narr
入口の 消毒槽。{w=300}
ビーサンでも、ちゃんと 踏んだ。`,
  obj_hoshi_cow: {
    text: `@narr
黒い 牛が、ゆっくり
反すうしている。{w=300}
耳に 黄色い 耳標。10けたの 番号。`,
    /** The same pen again. */
    second: `@narr
牛は こっちを 見て、
また 反すうに もどった。`,
  },
  obj_hoshi_cow_white: `@narr
黒い 牛の なかに、おなかに
白が 少し ある 子。{w=300}
……顔つきも、ちょっと ちがう。`,
  obj_hoshi_shisou: `@narr
飼槽に、稲わらが 少し
残っている。{w=300}
朝の エサは、まだ。`,
  obj_hoshi_haigou: `@narr
配合飼料の 袋。{w=300}
朝の 分が、もう 量ってある。`,
  obj_hoshi_ogakuzu: `@narr
牛房の 床に、おがくず。{w=300}
ふかふかで、木の においが する。`,
  obj_hoshi_watercup: `@narr
牛が 鼻で 押すと、水が 出る。
{w=300}押す ところが、
つやつやしている。`,
  obj_hoshi_kanki: `@narr
天井の 大きな 換気扇。{w=300}
夏の 牛舎は、風が だいじ。`,
  obj_hoshi_kanriban: `@narr
管理板。耳標の 番号と、
来た 日と、出荷の 予定月。
/
字は 小さいが、ていねいだ。`,
  obj_hoshi_kyujisha: `@narr
給餌車。ハンドルに
タオルが 巻いてある。{w=300}
毎日 にぎる ところだ。`,
  obj_hoshi_brush: `@narr
柄の 長い ブラシ。{w=300}
毛先が、牛の 背中の 形に
すりへっている。`,
  obj_hoshi_mimawari: {
    text: `@narr
見回り帳。牛房ごとに
『食い 良し』『便 良し』。
/
南5の 欄だけ、まだ 空いている。`,
    /** After evt_ch2_barn. */
    done: `@narr
南5の 欄にも『良し』。{w=300}
その 横に 小さく、
『トマトの 明かりで 確認』。`,
  },

  // ================================================================ 9.6 旧 星見台分校・集会所
  obj_hoshi_kokuban1: `@narr
黒板『本日の 寄り合い
議題：朝が 来ない 件』。
/
その 下に『お茶 おかわり 自由』。`,
  obj_hoshi_zabuton: `@narr
座布団が 12枚、輪に なって
並んでいる。{w=300}
3枚は、いま 使用中。`,
  obj_hoshi_nappers: {
    'h0-1': `@narr
座布団で 3人、眠っている。
/
1人が 寝言。{w=300}
『……もう ひと畝……』`,
    /** After テツヤ (stage 2). */
    'h2+': `@narr
座布団で 3人、眠っている。
/
1人が 寝言。{w=300}
『……よし、今日は ここまで……』`,
  },
  obj_hoshi_photo: `@narr
満開の 桜の 下で、子どもが 5人、
先生が 1人。
/
先生は、少し 若い フミ先生だ。`,
  obj_hoshi_kouka: `@narr
校歌の 額。{w=300}
『星を 見上げて 手を つなぎ』。
……3番まで ある。`,
  obj_hoshi_school_window: `@narr
窓の 外に、山の 黒い 影。
{w=300}てっぺんに、天文台の
白い ドーム。`,
  // obj_hoshi_rouka_dark: trig_ch2_dark_school → evt_ch2_dark_block (hoshi_events.ts)
  obj_hoshi_desks: `@narr
机と いすが、後ろに
寄せてある。{w=300}
いちばん 前の 机にだけ、名札の 跡。`,
  obj_hoshi_gakkyu_nisshi: `@narr
学級日誌の 最後の ページ。
/
『きょうで おしまい。
みんな、元気でね。{w=300}先生より』`,
  /** Only in the lantern's light (h1〜). */
  obj_hoshi_yosegaki: `@narr
模造紙の 寄せ書き。
『ありがとう 星見台分校』。
/
5人ぶんの 字と、
先生の はなまるが 1つ。`,
  obj_hoshi_shokuin_desk: {
    text: `@narr
机の 引き出しに『区の 備品
ご自由に』の 札と、朱肉。`,
    get: `@sys
回覧板の朱肉を 手に入れた！`,
    again: `@narr
引き出しには、
朱肉の においだけ 残っている。`,
  },
  obj_hoshi_kagi: `@narr
鍵かけの 札『天文台』の ところは、
鍵が ない。{w=300}
……フミ先生が 持っている らしい。`,
  obj_hoshi_housou_kiki: `@narr
放送の 機械。スイッチに
『防災無線 遠隔』の テープ。
/
村の 放送は、ここからも
できた らしい。`,
  obj_hoshi_zukan: `@narr
『星座の 図鑑』が 3冊。{w=300}
どれも、同じ ページで
ひらき ぐせ。……夏の 大三角。`,

  // ================================================================ 9.7 棚田・耕作放棄地・山道の入口
  obj_hoshi_kakashi: {
    'h0-1': `@narr
かかし。麦わら帽に、
ふつうの 顔。{w=300}
……へのへのもへじでは ない。`,
    'h2+': `@narr
かかしが、山の ほうを
向いている。{w=300}
みんな そろって。`,
  },
  obj_hoshi_minakuchi: `@narr
田んぼの 水口。板で 水の 量を
決める。{w=300}
板が、手の あかで 黒い。`,
  obj_hoshi_ine: `@narr
稲の 穂が、重そうに
下がっている。{w=300}
実が つまっていく ところだ。`,
  obj_hoshi_ishidan: `@narr
棚田の 石段。{w=300}
1段ずつ、高さが ちがう。`,
  obj_hoshi_koya: `@narr
農具小屋。くわ、長靴、
水口の 予備の 板。{w=300}
壁に『トメキチ』の 字。`,
  obj_hoshi_houki_sign: `@narr
朽ちた 看板『――さんの 畑』。
{w=300}名前の ところだけ、読めない。`,
  obj_hoshi_kuzu: `@narr
クズが、支柱ごと
のみこんでいる。{w=300}
……むかしは 畑の 支柱だった。`,
  obj_hoshi_nuta: `@narr
泥の くぼみ。{w=300}
イノシシの 泥浴びの 場所だ。
まだ 新しい。`,
  /** Only in the lantern's light. */
  obj_hoshi_footprints: `@narr
小さな 足あとが、山道の
ほうへ 続いている。{w=300}
子どもの 運動ぐつの 形。
/
……むかし、観望会へ
走っていった 足あと らしい。`,
  obj_hoshi_yamaguchi_sign: `@narr
道標『星見の丘 天文台 →』。
{w=300}矢印の 先は、真っ暗だ。`,

  // ================================================================ 9.8 map_hoshi_hill（星見の丘）
  obj_hoshi_kanbou_board: {
    text: `@narr
倒れた 案内板『観望会 会場まで
あと 300m』。{w=300}
……立てて おいた。`,
    again: `@narr
案内板は、ちゃんと 立っている。`,
  },
  obj_hoshi_sugi: `@narr
杉の 幹に、背くらべの
傷が 3本。{w=300}
いちばん 上の 傷は、少し 古い。`,
  obj_hoshi_dome: `@narr
村営 天文台。白い ドームの
すきまは、閉じている。
/
扉に『観望会 休止中』の 札。
{w=300}日付は、10年前。`,
  obj_hoshi_pier: `@narr
屋外の 望遠鏡の 台。{w=300}
台だけ 残って、
望遠鏡は ない。`,
  obj_hoshi_view_east: {
    'h0-2': `@narr
東の 空。{w=300}
またたかない 星が 1つ、
低い ところに いる。`,
    'h3+': `@narr
朝日が、村を 照らしている。`,
  },
  obj_hoshi_view_west: `@narr
西の 山の 向こうに、
町の 明かり。{w=300}
……夕鳴町だ。`,
  obj_hoshi_speaker_plate: `@narr
銘板『防災行政無線 星見台』。
{w=300}赤い ランプは、消えている。`,
  // obj_hoshi_hill_bench: 10.18 evt_ch2_save_bench (hoshi_events.ts)
};

/** Objects whose examine runs an event instead of a text (the ids the level team places). */
export const HOSHI_OBJ_EVENTS: Record<string, string> = {
  obj_hoshi_dosojin: 'evt_ch2_save_dosojin',
  obj_hoshi_hill_bench: 'evt_ch2_save_bench',
  obj_hoshi_rouka_dark: 'evt_ch2_dark_block',
  /** The lectern's circular in the gathering room (map_hoshi_school (5,3)). */
  obj_hoshi_kairan: 'evt_ch2_save_kairan',
};

// ================================================================ 8章 ふしぎ（みました帳 ②）

export interface HoshiFushigiText {
  /** When examined (before the stamp). */
  seen: string;
  /** Right after 『みました』 (fushigi_ch2_06 goes on into evt_ch2_tomato instead). */
  pressed: string;
  /** Examined again afterwards. */
  after: string;
}

export const HOSHI_FUSHIGI: Record<string, HoshiFushigiText> = {
  // 8.1 駅ノート
  fushigi_ch2_01: {
    seen: `@narr
ベンチの 上に 駅ノート。{w=300}
旅の 人が、ひとこと 書いていく
ノートだ。
/
前の ページに『集会所は
まっすぐ 北。お茶が 出ます』。
/
ページが ひとりでに めくれて、
白い ページで 止まった。{w=300}
……だれかを 待っている。`,
    pressed: `@narr
白い ページに、ミナトの 字で
『夕鳴町から 来ました』と
書かれた。`,
    after: `@narr
『夕鳴町から 来ました』の 下に、
鐘の 絵が 描きたしてある。`,
  },
  // 8.2 1日2本の時刻表
  fushigi_ch2_02: {
    seen: `@narr
バス停の 時刻表。1日2本。
のぼり 17:48着、くだり 6:12発。
/
……2本とも、数字が『4:59』に
書きかわっては、もどる。`,
    pressed: `@narr
時刻表は 照れて、
『6:12』に 落ちついた。`,
    after: `@narr
『6:12発 ユウナリ前 ゆき』。{w=300}
ちゃんと 待っている 字だ。`,
  },
  // 8.3 用水路を流れる星
  fushigi_ch2_03: {
    seen: `@narr
用水路の 水に、星が
映っている。{w=300}
/
……映った 星だけ、
下へ 流されていく。`,
    pressed: `@narr
星たちは 流れに さからって、
空と 同じ 場所に もどった。`,
    after: `@narr
用水路の 星が、空と ぴったり
同じ 場所で ゆれている。`,
  },
  // 8.4 空き家の回覧板（報酬：回覧板の朱肉。押したときの2つ目の narr と @sys は scripts が続ける）
  fushigi_ch2_04: {
    seen: `@narr
空き家の 郵便受けに、
回覧板が はさまっている。
/
確認の 欄に、家の 名前が
並んでいる。{w=300}
『森本』の 欄だけ、ずっと 空いている。`,
    pressed: `@narr
『森本』の 欄に、
『みました』の 判が 押された。
/
回覧板は、次の 家へ
回っていった。`,
    after: `@narr
郵便受けは、からっぽだ。{w=300}
……回覧板は、ちゃんと 回った。`,
  },
  // 8.5 棚田の夕焼け
  fushigi_ch2_05: {
    seen: `@narr
いちばん 西の 田んぼの 水に、
夕焼けが 映っている。
/
空は 夜なのに。{w=300}
……西の 山の 向こうの、
夕鳴町の 色だ。`,
    pressed: `@narr
夕焼けは、あわてて 西の
ほうへ 帰っていった。
/
水の 面に、夜の 空が もどった。
……ヒグラシの 声も、西へ
帰っていった。`,
    after: `@narr
田んぼの 水に、星が 映っている。
{w=300}西の はしだけ、
少し あたたかい 色。`,
  },
  // 8.6 はなまるトマト ★（押したあとは evt_ch2_tomato）
  fushigi_ch2_06: {
    seen: `@narr
暗い ハウスの いちばん 奥で、
トマトが 1つだけ 光っている。
/
夕焼けの 色だ。{w=300}
おしりの 白い すじが、
はなまるの 形を している。
/
……だれにも 見て もらえずに、
ひとりで 赤く なっていた。`,
    pressed: '',
    after: `@narr
トマトの 木の 5段目。{w=300}
はなまるトマトが なっていた
ところだけ、枝が 上を 向いている。`,
  },
  // 8.7 息をするハウス
  fushigi_ch2_07: {
    seen: `@narr
風も ないのに、ハウスの
ビニールが ふくらんで、しぼむ。
/
ゆっくり 息を している。{w=300}
……朝の 空気を 待っている らしい。`,
    pressed: `@narr
ビニールは 深呼吸を 1回して、
静かに なった。`,
    after: `@narr
ビニールは 静かだ。{w=300}
朝に なったら、サイドを
巻き上げて もらえる。`,
  },
  // 8.8 そろった反すう
  fushigi_ch2_08: {
    seen: `@narr
北3の 牛房の 牛が 4頭、
反すうしている。
/
……4頭とも、口の 動きが
ぴったり そろっている。{w=300}
夜が 長すぎて、拍子が そろった。`,
    pressed: `@narr
牛たちは、それぞれの
ペースに もどった。`,
    after: `@narr
牛たちが、それぞれの ペースで
反すうしている。{w=300}
もぐ、……もぐ、もぐ。`,
  },
  // 8.9 あしたの日直
  fushigi_ch2_09: {
    seen: `@narr
黒板の すみに『3月24日 日直』。
{w=300}閉校の 日の 日付だ。
/
日直の 名前が、消えては
書かれる。{w=300}
……だれの 番か、決まらない。`,
    pressed: `@narr
日直の 欄に、はなまるが
描かれた。
/
名前は 書かれない まま、
黒板は 落ちついた。`,
    after: `@narr
日直の 欄に、はなまるが 1つ。
{w=300}……みんなの 番、と いう
ことに なった らしい。`,
  },
  // 8.10 本日は晴天なり
  fushigi_ch2_10: {
    seen: `@narr
放送室の マイク。{w=300}
むかし、夜の 放送を
読んでいた マイクだ。
/
……だれも いないのに、
『あー、あー』と 言いかけては、
やめる。`,
    pressed: `@narr
マイクは 小さく、
『……本日は 晴天なり』と 言った。
/
放送中の ランプが、
ほっと したように 消えた。`,
    after: `@narr
マイクの 横に、古い 原稿。{w=300}
最後の 行は
『おやすみなさい』。`,
  },
};

/** Stage (flag_ch2_stage) from which each ふしぎ is stampable (8.0). */
export const HOSHI_FUSHIGI_STAGE: Record<string, number> = {
  fushigi_ch2_01: 0,
  fushigi_ch2_02: 0,
  fushigi_ch2_03: 0,
  fushigi_ch2_04: 0,
  fushigi_ch2_05: 0,
  fushigi_ch2_06: 0,
  fushigi_ch2_07: 1,
  fushigi_ch2_08: 1,
  fushigi_ch2_09: 1,
  fushigi_ch2_10: 1,
};

/** fushigi_ch2_04's reward: the ink pad drops off the circular. */
export const FUSHIGI04_DROP = `@narr
回覧板に くっついていた 朱肉が、
ぽとんと 落ちた。`;
export const FUSHIGI04_GET = `@sys
回覧板の朱肉を 手に入れた！`;

/** The reward pages of every ふしぎ ② (8.0); $n is the count after this one. */
export function fushigiRewardCh2(n: number): string {
  return `@sys
朱肉が 2 たまった。
/
みました帳に 書きこんだ。
（ふしぎ② ${n}/10）`;
}

/** みました帳 ② (8.11): headings and places of the ten ふしぎ. */
export const FUSHIGI2_BOOK: { id: string; title: string; place: string }[] = [
  { id: 'fushigi_ch2_01', title: '待っている 駅ノート', place: '星見台駅' },
  { id: 'fushigi_ch2_02', title: '4:59に なりたい 時刻表', place: '転回場' },
  { id: 'fushigi_ch2_03', title: '流されていく 星', place: '用水路' },
  { id: 'fushigi_ch2_04', title: '回らない 回覧板', place: '空き家' },
  { id: 'fushigi_ch2_05', title: '田んぼの 夕焼け', place: '棚田' },
  { id: 'fushigi_ch2_06', title: 'はなまるトマト', place: '3号ハウス' },
  { id: 'fushigi_ch2_07', title: '息を する ハウス', place: '3号ハウス' },
  { id: 'fushigi_ch2_08', title: 'そろった 反すう', place: '石黒牛舎' },
  { id: 'fushigi_ch2_09', title: '決まらない 日直', place: '旧分校' },
  { id: 'fushigi_ch2_10', title: '本日は 晴天なり', place: '旧分校' },
];

/** みました帳 ② 「あいて」 (8.11): who they were, and a word. */
export const AITE2_BOOK: { id: string; who: string; word: string }[] = [
  { id: 'enemy_sune_tomato', who: 'ミツばあの 3号ハウスの、\nまだ 色づいていない トマト。', word: '赤く なる 順番を、待っている。' },
  { id: 'enemy_henoheno_kacho', who: 'トメじいの 背広を 着た、\n棚田の かかし。', word: 'かかしに、定年は ない。' },
  { id: 'enemy_biribiri_ban', who: 'イノシシよけの、電気柵の\nひと区画。', word: '番を するのが 仕事。\nだれの 番かは、忘れた。' },
  { id: 'enemy_chototsu', who: '山から 下りてきた、イノシシ。', word: '曲がれない、と よく 言われる。' },
  { id: 'enemy_mujin_hanbaiin', who: '無人販売所の、料金箱。', word: 'だれも 見ていなくても、\n1円も まちがえない。' },
  { id: 'enemy_tetsuya', who: 'タケじいの、歩いて 押す\n耕うん機。', word: '乗る人が いなくても、春を 待っている。' },
];

// ================================================================ 6章 思いだした姿（restored_*）

export const HOSHI_RESTORED: Record<string, HText> = {
  restored_enemy_sune_tomato: `@narr
青い トマトが 枝に 下がっている。
{w=300}……さっきより、ちょっと
顔を 上げている。`,
  restored_enemy_henoheno_kacho: {
    'h0-1': `@narr
背広の かかしが、田んぼの
番を している。{w=300}
顔は『へのへのもへじ』に もどった。`,
    'h2+': `@narr
背広の かかしが、山の ほうを
向いている。{w=300}
……課長の 判断 らしい。`,
  },
  restored_enemy_biribiri_ban: `@narr
電気柵が、きちんと 並んでいる。
{w=300}……さわらないで おこう。`,
  restored_enemy_chototsu: `@narr
イノシシの 足あとが、
山の ほうへ 続いている。{w=300}
……ちゃんと 帰った らしい。`,
  restored_enemy_mujin_hanbaiin: `@narr
料金箱が 台の 上に もどっている。
{w=300}『ありがとう ございます』の
手書きの 字が、やさしい。`,
  restored_enemy_tetsuya: `@narr
耕うん機が 止まっている。{w=300}
ハンドルの『タケ』の シールが、
少し はがれかけている。`,
};
