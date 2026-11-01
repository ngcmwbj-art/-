# 大事なものの点検（改善会議 2026-10-31 の 5）

`src/data/battle/items.ts` の大事なもの（`key: true`）59 個を、どこで渡す（addItem・giveKey・getKeyItem）・使う（hasItem・inventory.includes）・消す（removeItem・takeItem・章の切りかえの filter）かで調べた一覧。debug・QA の命令だけで使う所は数えていない。

- **扱い**：
  - **本筋**＝章の本筋で使う・本筋の決まりで持ち続ける（50 1.5・60 1.5 の「大事なもの」）。
  - **自分で消す**＝そのイベントや章の切りかえで、もう消している。
  - **残す（理由）**＝話の道具・記念として、わざと残す。
  - **今回 片づけ**＝窓が閉じても持ったまま残っていた物。`src/events/keytidy.ts` で章のフラグが立つと袋から外し、みました帳②のすみに「あずかった 物は、わたした」1行（右のページに だれに わたしたか）。クリア後（`flag_ch3_clear`）は第1章・第2章の寄り道の窓がまた開く（05_postgame 2.0）ので、まだすんでいない物だけ袋にもどす（✓ の物）。
- 章のフラグ：第1章の物は `flag_clear`（第1章の「つづく」）・`flag_ch2_started`、第2章の物は `flag_ch2_clear`（第2章の「つづく」）・`flag_ch3_started`。
- 古いセーブ：「つづきから」と「第2章から」「第3章から」のスナップショットを読みこんだとき、同じ片づけをする（`keyTidyOnLoad`、ui/flow.ts）。クリア後のセーブには何もしない。試すセーブで確かめた（kaizenS の進みぐあい）。

## 第1章

| id | 名前 | 渡す | 使う・消す | 扱い |
|---|---|---|---|---|
| item_otsukai_memo | おつかいメモ | home.ts（母） | もちもので 進みぐあい（menu/items.ts） | 本筋（50 1.5：第2章に持ちこむ。説明「→ おつかい 完了。」） |
| item_gamaguchi | がま口 | home.ts | 3章とも持つ | 本筋 |
| item_hanko_case | ハンコケース | chime.ts | ハンコのタブを開く | 本筋 |
| item_mimashita_cho | みました帳 | chime.ts | みました帳のタブを開く・mizube_zari.ts | 本筋 |
| item_maigo_key | 迷子センターの鍵 | mall.ts | 迷子センターの戸 | 残す（50 1.5：第2章に持ちこむ本筋の物） |
| item_hato_meishi | ハトの名刺 | chime.ts | 戦闘で使える（ヘノヘノ課長） | 本筋（第2章の標準の袋にも入る） |
| item_korokke | できたて焼きそば | ending.ts | 第1章のクリアデータ・第2章の調整で消す（flow.ts・members.ts） | 自分で消す |
| item_urenokori | 売れ残りの焼きそば | shops.ts | 公園でグソっ君へ（park.ts） | 本筋（かならず渡す） |
| item_akushuken | 握手券 | mall_roof.ts | 握手会で外す。会の前に章が進むと残る | 残す（話の道具。番号は1、有効期限なし。クリア後に屋上の握手会がまた遊べる：05 yr_c1_roof） |
| item_tankan | 冷凍たんかん | rooms_north.ts | しんごへ。第1章のクリアデータで消す | 自分で消す |
| item_ashita_tegami | 『あした』宛ての手紙 | npcs.ts（郵便屋さん） | 第2章のさんかどへ（ch2/npcs.ts） | 今回 片づけ（第2章のフラグ）→ さんかど ✓ |
| item_hanamaru_kensui | はなまる「懸垂挑戦！」 | kensui.ts | 第2章の鉄棒（ch2/tetsubou.ts）で使う | 残す（第2章の寄り道で使う。記念） |
| item_tamotsu_uki | おぴぃの浮き | tamotsu.ts | mizube.ts・第2章の夜ぶり（ch2/yoburi.ts）で使う | 残す（第2章で使う。記念） |
| item_abura_age | 油揚げ | aze.ts（くま吉） | 祠の小皿にのせると外す（aze.ts） | 今回 片づけ（第1章のフラグ）→ くま吉 ✓ |
| item_toban_yuhi | さやの夕日の絵 | school.ts（さやのお礼） | 外さない | 残す（お礼の記念。8月31日の絵） |
| item_hunting | ペロのハンチング | hunting.ts（第2章 ペロの家の壁） | ペロへ（hunting.ts） | 今回 片づけ（第2章のフラグ）→ ペロ ✓ |
| item_tokei7_utsushi | 7つの時刻の写し | tokei7.ts | 第2章にも持っていく（駅ノート） | 残す（02 #88：第2章で使う） |
| item_hokokusho | 報告書の写し | hokokusho.ts | もちものでカードが開く | 残す（カードを見る道具） |

## 第2章

| id | 名前 | 渡す | 使う・消す | 扱い |
|---|---|---|---|---|
| item_hanamaru_tomato | はなまるトマト | ch2/house.ts | ボス戦・灯り。エンディングで外す（ch2/ending.ts・flow.ts） | 自分で消す |
| item_kairan_map | 回覧板の地図 | ch2/village.ts | 目的メモ | 本筋（60 1.5：第2章の終わりのまま） |
| item_seiriken | 整理券 | ch2/objects.ts（任意） | 外さない | 残す（話の道具「……2人で 乗ったのに。」） |
| item_tomato_omiyage | トマト（4つ）／（おまけ） | ch2/ending.ts | 第3章 S02 で外す（ch3/prologue.ts） | 自分で消す |
| item_namae_ishi | 名前の石 | ch2/sawa.ts | トマじいに見せると外す | 今回 片づけ → トマじい ✓ |
| item_dome_key | 天文台の鍵 | ch2/dome.ts | エンディングで静かに返す（kanboEndSetup） | 自分で消す |
| item_kanbo_card / _done | タクミの観望会カード | ch2/dome.ts | まつ先生への報告・エンディングで外す | 自分で消す |
| item_saku_tester | 柵のテスター | ch2/sakuzoi.ts | 見回りのあと返す | 今回 片づけ → マサル ✓ |
| item_mg_hako | パンク修理の箱 | ch2/mushigomu.ts | 返さない（自転車置き場の2台にも使う） | 今回 片づけ → まつ先生 ✓ |
| item_mg_furui | 古い虫ゴム | ch2/mushigomu.ts | 外さない | 残す（「よく がんばった。」の記念） |
| item_ir_kugi | さびた釘 | ch2/iro.ts | 色あわせのあとおけへ | 今回 片づけ → ハモ区長 ✓ |
| item_as_ezara | ソワカの絵皿 | ch2/asairo.ts | 名場面のあと返す | 今回 片づけ → ソワカ ✓ |
| item_ss_sara | 寄り合いの皿 | ch2/shishito.ts | 集会所の区長へ | 今回 片づけ → ハモ区長（クリア後は窓が開かないので、もどさない） |
| item_ky_sanbon | とったきゅうり | ch2/kyuri.ts | 無人販売所の札とくらべると外す（kyuri_late.ts） | 今回 片づけ → ソワカ（クリア後は窓が開かないので、もどさない） |
| item_ks2_tegami | さんかどの手紙3通 | ch2/touge.ts | 並べて返すと外す。章が進むと ksTegamiTidy（10-30） | 自分で消す（みました帳②に別の1行） |
| item_hg_bin | 便の分のおにぎり | ch2/hagama.ts | 転回場のヒロスケへ | 今回 片づけ → ヒロスケ ✓ |
| item_yw_moigi | もいだとうもろこし | ch2/yuwaka.ts | 集会所のなべへ | 今回 片づけ → ぴょん夫人 ✓ |
| item_hoshi_tetsuya_kagi | クズの花 | ch2/himo.ts | 枕もとへ。段階3で外す | 自分で消す |
| item_shikishi | 70年の色紙 | ch2/shikishi.ts | 7つそろうと返す | 今回 片づけ → ぴょん夫人 ✓ |
| item_matsuri_chochin | 夏祭りの提灯 | ch2/shikishi.ts | 校庭の桜にかける | 今回 片づけ → ハモ区長 ✓ |

## 第3章

| id | 名前 | 渡す | 使う・消す | 扱い |
|---|---|---|---|---|
| item_c3_map | 海ぞいの町の地図 | ch3/prologue.ts（S06） | 目的の印 | 本筋 |
| item_c3_fucho | 符丁ノートの切れはし | ch3/ichiba.ts | 数を名前に | 本筋（第3章の決着にかかわるので今回はさわらない） |
| item_c3_hashi | 割り箸 | ch3/ichiba.ts | 部品① | 本筋（同上） |
| item_c3_kanban_ka | 『か』の字 | ch3/kaisui.ts | 食堂かもめへ（shokudo.ts・クリア後は pg_talk.ts） | 自分で消す |
| item_c3_megane | ミナトのめがね | ch3/kaisui.ts | サイレン塔へ（siren.ts・pg_talk.ts） | 自分で消す |
| item_c3_shikake | 切れた仕掛け | ch3/kaisui.ts | ツリノへ（kaisui.ts・pg_talk.ts） | 自分で消す |
| item_c3_bracelet | 貝のブレスレット | ch3/kaisui.ts | ウミへ | 自分で消す |
| item_c3_nyukanken | 入館券 | ch3/aq.ts | 旧水族館の順路 | 本筋（同上） |
| item_c3_denpyo | 伝票のメモ | ch3/aq.ts | 数を名前に | 本筋（同上） |
| item_c3_nisshi | 飼育日誌の切れはし | ch3/aq.ts | 数を名前に | 本筋（同上） |
| item_c3_hall_key | 大水槽ホールの鍵 | ch3/aq.ts | 大水槽ホール | 本筋（同上） |
| item_iso_nafuda | からの名札 | ch3/iso.ts（クリア後） | 6枚わたすと外す | 自分で消す（クリア後の寄り道。窓は毎日めぐる） |
| item_nn_stopwatch | 予備のストップウォッチ | ch3/nanori.ts（クリア後） | すむと外す | 自分で消す（同上） |
| item_c3_camera / item_c3_futa | 古いカメラ・トロ箱のふた | ch3/mahiru.ts | 段階2・3で返す（dropTools） | 自分で消す |
| item_c3_akibin | 空きびん | ch3/yose.ts | 段階3で返す | 自分で消す |
| item_c3_ball | ゴムボール | ch3/okujou.ts | クリア後にハキコへ（okujou_pg.ts） | 自分で消す |
| item_c3_tengusa | 天草 | ch3/tokoro.ts | 段階3で外す | 自分で消す |
| item_c3_enpitsu | ペンギンのえんぴつ | ch3/shita.ts | 段階4で外す | 自分で消す |
| item_c3_amibari | 古い網針 | ch3/amigoya.ts | 外さない（使い道はない） | 残す（ゴロウからもらった記念） |

## 気になる所（次の点検へ）

- 第3章の本筋の物（切れはし・割り箸・入館券・伝票のメモ・飼育日誌・大水槽ホールの鍵）は、クリア後も袋に残る。本筋の決着とクリア後の会話（pg_talk.ts）にかかわり、今日は第3章のファイルを5人が作っているので、今回はさわらない。
- 握手券・整理券のように話の道具として残す物は、戦闘の「もちもの」で見せる1行（battleText）がそれぞれある。
