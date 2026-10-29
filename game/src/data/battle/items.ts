// Items (20_systems_battle.md 7, 10_narrative.md 10).

import { flag } from '../../game/state';
import type { ItemDef } from './types';
import { c3Name } from '../text/c3_names';
import { MG_ITEM_FURUI_DESC, MG_ITEM_HAKO_DESC } from '../text/hoshi_mushigomu';
import { IR_ITEM_KUGI_DESC } from '../text/hoshi_iro';
import { AS_ITEM_EZARA_DESC } from '../text/hoshi_asairo';
import { HG_ITEM_BIN_DESC, HG_ITEM_ONIGIRI_DESC } from '../text/hoshi_hagama';
import { YW_ITEM_DESC } from '../text/hoshi_yuwaka';
import { ISO_ITEM_DESC } from '../text/c3_iso';
import { SH_ITEM_DESC } from '../text/c3_shita';
import { MH_ITEM_CAMERA_DESC, MH_ITEM_FUTA_DESC } from '../text/c3_mahiru';
import { YD_ITEM_BIN_DESC, YD_ITEM_DOFU_DESC } from '../text/c3_yose';
import { OJ_ITEM_BALL_DESC } from '../text/c3_okujou';
import { MK_ITEM_DESC } from '../text/c3_mikan';
import { KR_ITEM_DESC } from '../text/c3_kori';
import { AG_ITEM_DESC } from '../text/c3_amigoya';
import { TK_ITEM_DESC, TK_ITEM_TENGUSA_DESC } from '../text/c3_tokoro';
import { HM_ITEM_HANA_DESC } from '../text/hoshi_himo';
import { SS_ITEM_DESC, SS_SARA_DESC } from '../text/hoshi_shishito';
import { KY_ITEM_DESC, KY_SANBON_DESC } from '../text/hoshi_kyuri';
import { RT_ITEM_DESC } from '../text/hoshi_retasu';
import { KS_ITEM_DESC } from '../text/hoshi_touge';

const items: ItemDef[] = [
  // QA round 1 balance: with 500円 (and the yakisoba shop's tab) the bag could
  // hold 8+ strong heals and the boss never threatened. Heals are smaller,
  // ふがし is the dear one, and a visit sells only a couple of each.
  { id: 'item_ramune', name: 'ラムネ', price: 60, target: 'ally', heal: 20, shopLimit: 2, desc: ['ビー玉が からん と鳴る。', 'HPを 20 回復。'] },
  { id: 'item_kinakobou', name: 'きなこぼう', price: 20, target: 'ally', heal: 12, special: 'kinakobou', shopLimit: 3, desc: ['あたりは 入ってない らしい。', 'HPを 12 回復。たまに あたり。'] },
  { id: 'item_fugashi', name: 'ふがし', price: 90, target: 'ally', heal: 40, shopLimit: 1, desc: ['軽い。回復量は 重い。', 'HPを 40 回復。'] },
  // 型ぬき 番付（2026-10-13）：ひのやの 品書き（番付を 見た あと、段階2）。買うと その場で ぬく（events/katanuki.ts）
  { id: 'item_katanuki', name: '型ぬき', price: 10, target: 'ally', heal: 8, desc: ['うす桃色の おかしの 板。型の 線つき。', 'HPを 8 回復。'] },
  { id: 'item_hakka_ame', name: 'ハッカあめ', price: 30, target: 'ally', cure: ['status_konran', 'status_nemuri'], desc: ['すーっと する。目も さめる。', 'こんらん・ねむりを 治す。'] },
  { id: 'item_stamp_pad', name: 'ちびたスタンプ台', price: 70, target: 'minato', mp: 12, desc: ['使いこまれて、まんなかが へこんでいる。', '朱肉を 12 回復。'] },
  { id: 'item_oden_can', name: '八月のおでん缶', target: 'allies', healRate: 0.5, desc: ['温度だけは 本気。', '全員の HPを 半分 回復。'] },
  { id: 'item_shippu', name: 'ひえひえシップ', target: 'ally', heal: 40, special: 'shippu', desc: ['はると 背すじが のびる。', 'HPを 40 回復。下がった 能力を 戻す。'] },
  { id: 'item_capsule', name: 'ガチャのカプセル', price: 100, target: 'ally', special: 'capsule', desc: ['中身は 開けてからの お楽しみ。', 'ランダムで 回復。からっぽも ある。'] },
  // 第2章（51 6.1、50 7.2）: どれでも 100円（無人販売所）
  { id: 'item_kyuri_zuke', name: 'きゅうりの一本漬け', price: 100, target: 'ally', heal: 45, shopLimit: 3, desc: ['割りばしに ささっている。ぽりっ。', 'HPを 45 回復。'] },
  { id: 'item_toumorokoshi', name: 'ゆでとうもろこし', price: 100, target: 'allies', heal: 35, special: 'corn', shopLimit: 1, desc: ['1列ずつ 食べる 派と、ぐるっと 派が いる。', 'みんなの HPを 35 回復。'] },
  {
    id: 'item_umeboshi', name: '梅干し', price: 100, target: 'ally', mp: 3, cure: ['status_konran', 'status_nemuri', 'status_henji'], special: 'umeboshi', shopLimit: 2,
    desc: ['すっぱい。目が さめる。', 'こんらん・ねむり・へんじを 治す。朱肉 3 回復。'],
  },
  // 51 6.1 (2026-09-25 その2): 野菜の配達のおだちん、2つだけ（非売品）
  { id: 'item_yakiimo', name: '焼き芋', target: 'ally', heal: 60, desc: ['ヒロスケの 焼き芋。夏でも 熱い。', 'HPを 60 回復。'] },
  { id: 'item_kairan_shuniku', name: '回覧板の朱肉', target: 'minato', mp: 15, special: 'kairan', desc: ['回覧板の 確認印 用。ふたに『区』の字。', '朱肉を 15 回復。'] },
  // 02 #58（2026-09-28）北の列の部屋の見つけ物としんごのお礼（非売品）
  { id: 'item_house_mikan', name: 'ハウスみかん', target: 'ally', heal: 15, desc: ['夏の みかん。ゆずの『ご自由に』。', 'HPを 15 回復。'] },
  { id: 'item_reitou_mikan', name: '冷凍みかん', target: 'ally', heal: 30, desc: ['しんごの お礼。皮まで 凍っている。', 'HPを 30 回復。'] },
  { id: 'item_shuzumi', name: '朱墨のかけら', target: 'minato', mp: 8, desc: ['はなまるを 描く ための 朱い 墨。', '朱肉を 8 回復。'] },
  // 02 #59（2026-09-28）南の列：写真館の七五三コーナーの見つけ物（非売品）
  { id: 'item_chitose_ame', name: '千歳あめ', target: 'ally', heal: 25, desc: ['写真館の 七五三の おまけ。長い。', 'HPを 25 回復。'] },
  // 02 #61（2026-09-28）第2章 まつ先生の家の見つけ物（非売品）
  { id: 'item_konpeito', name: '金平糖', target: 'ally', heal: 20, desc: ['星の 形の さとう菓子。観望会の 分。', 'HPを 20 回復。'] },
  // 大事なもの
  { id: 'item_otsukai_memo', name: 'おつかいメモ', key: true, target: 'none', desc: ['焼きそば 4つ。青のりは べつ。', ''], battleText: ['これは 晩ごはんの メモだ。'] },
  { id: 'item_gamaguchi', name: 'がま口', key: true, target: 'none', desc: ['母の がま口。ぱちん、と', '閉まる 音が いい。'], battleText: ['がま口を 開けた。\n……戦いに お金は いらない。'] },
  { id: 'item_hanko_case', name: 'ハンコケース', key: true, target: 'none', desc: ['おばあの 採点ハンコが 入っている。', '枠は 10。'], battleText: ['ハンコケースを 見せた。\n$enemyは 少し 身がまえた。'] },
  { id: 'item_mimashita_cho', name: 'みました帳', key: true, target: 'none', desc: ['白紙だった 自由研究の ノート。', '見たものを 書きこんでいく。'], battleText: ['ノートを 開いた。\n……いまは 書いている ひまが ない。'] },
  { id: 'item_maigo_key', name: '迷子センターの鍵', key: true, target: 'none', desc: ['小さな カギ。', 'キーホルダーは、カバ。'], battleText: ['カギは、ここで 使う ものじゃない。'] },
  { id: 'item_hato_meishi', name: 'ハトの名刺', key: true, target: 'none', desc: ['『夕鳴町 鳩課 係長』。', '裏に 小さく『帰りたい』。'], battleText: ['名刺を さしだした。\n……受けとって もらえなかった。'] },
  { id: 'item_korokke', name: 'できたて焼きそば', key: true, target: 'none', desc: ['4つ。青のりは 別。', '……1つは おまけ。'], battleText: ['これは 晩ごはんだ。'] },
  // 04_gusokkun_plan 2章（★2026-09-29 依頼主）：はじめての 焼きそば屋で たかしが 持たせる。
  // 公園で 倒れている グソっ君に わたすと 外れる（10 5.4・5.11）
  { id: 'item_urenokori', name: '売れ残りの焼きそば', key: true, target: 'none', desc: ['ゆうべの 売れ残り。冷たい。青のりは 別。', ''], battleText: ['これは 腹 へってる だれかの 分だ。'] },
  // 屋上 ゆうやけひろば (10_narrative 7.18 ★2026-09-28): the handshake (★2026-09-29 グソっ君の はじめての 握手会。04 2章 8 案A)
  { id: 'item_akushuken', name: '握手券', key: true, target: 'none', desc: ['グソっ君の はじめての 握手会。', '番号は 1。有効期限は なし。'], battleText: ['握手券を 見せた。\n$enemyは 手を 出しかけて やめた。'] },
  // しんごのたんかん（02 #58）：喫茶 初日の出の冷凍庫から → しんごへ（渡すと外れる）
  { id: 'item_tankan', name: '冷凍たんかん', key: true, target: 'none', desc: ['喫茶 初日の出の 冷凍庫から。', '冬の みかん。いまは 8月。'], battleText: ['たんかんを 見せた。\n$enemyは 季節に ついて 考えている。'] },
  // 10 6.10 (02_ch2_index #56): 段階2の郵便屋さんから。第2章でさんかどに あずける
  { id: 'item_ashita_tegami', name: '『あした』宛ての手紙', key: true, target: 'none', desc: ['差出人『ユウナリ 迷子センター』。すみに 黒い しみ。', '切手は、はなまる。'], battleText: ['手紙を 見せた。\n……宛先は、ここでは ない。'] },
  // 10 6.6〔懸垂〕（02 #64）：公園の鉄棒で懸垂に挑戦したあと、交番のワイスタ巡査から
  { id: 'item_hanamaru_kensui', name: 'はなまる「懸垂挑戦！」', key: true, target: 'none', desc: ['ワイスタ巡査の 手帳の 1枚。', '赤ペンの はなまる。記録は 0回。'], battleText: ['はなまるを 見せた。\n$enemyは 少し 背すじを のばした。'] },
  // 10 6.25〔ぬし〕（02 #66）：対岸の水口で ぬしを 釣ったあと、おぴぃから（IDは 据え置き）
  { id: 'item_tamotsu_uki', name: 'おぴぃの浮き', key: true, target: 'none', desc: ['つりえさ屋の、最後の 浮き。', '針は ついていない。'], battleText: ['浮きを 見せた。\n$enemyは、浮きを 見ている だけだ。'] },
  // 10 6.4〔abura〕（02 #67）：祠の からっぽの小皿を 見たあと、くま吉から ただで。祠で のせると 外れる
  { id: 'item_abura_age', name: '油揚げ', key: true, target: 'none', desc: ['豆腐くま吉の 油揚げ。1枚。', 'お代は、祠の きつねの ツケ。'], battleText: ['油揚げを 見せた。\n……これは、きつねの 分だ。'] },
  // 10 6.7〔toban〕（02 #72）：学校の 水やり当番を 終えて、公園の さやから お礼に
  { id: 'item_toban_yuhi', name: 'さやの夕日の絵', key: true, target: 'none', desc: ['夕日の 観察の 1枚。どれも 同じ。', '右下に『8月31日 夕方』。'], battleText: ['夕日の 絵を 見せた。\n$enemyは 少し まぶしそうだ。'] },
  // 大事なもの（第2章、50 7.1）
  {
    id: 'item_hanamaru_tomato', name: 'はなまるトマト', key: true, target: 'none', special: 'tomato', usableInBattleWith: ['boss_yobimodoshi'], priority: 2,
    desc: ['夕焼けを 1つぶん ためこんだ トマト。', 'おしりの すじが、はなまるの 形。'], battleText: ['これは 大事な 明かりだ。'],
  },
  { id: 'item_kairan_map', name: '回覧板の地図', key: true, target: 'none', desc: ['星見台の 回覧板。うらに 区長の 地図。', ''], battleText: ['回覧板を 見せた。\n……回す 相手が いない。'] },
  { id: 'item_seiriken', name: '整理券', key: true, target: 'none', desc: ['整理券。番号は『1』。', '……2人で 乗ったのに。'], battleText: ['整理券を 見せた。\n番号を 呼ばれる 気配は ない。'] },
  {
    id: 'item_tomato_omiyage',
    // 第2章のあと、夕飯で 3つ 食べて 残った おまけの 1つ（60 1.5：「トマト（おまけ）」）
    get name(): string {
      return flag('flag_ch2_clear') ? 'トマト（おまけ）' : 'トマト（4つ）';
    },
    key: true,
    target: 'none',
    get desc(): [string, string] {
      return flag('flag_ch2_clear') ? ['星見台の トマト。', 'おまけの 1つ。'] : ['ペロの トマト。4つ。', '……1つは おまけ。'];
    },
    battleText: ['これは おみやげだ。'],
  },
  // 第3章（60 7.1・4.3）：防波堤の子どもたちの 地図（S06）
  // 第3章の 回復（61 7.1。名前と ID は 60 7.1。文は 60 が正。仮の 文）
  { id: 'item_c3_onigiri', name: 'おにぎり', price: 100, target: 'ally', heal: 60, shopLimit: 3, desc: ['海の家の 塩むすび。のりは 別。', 'HPを 60 回復。'] },
  { id: 'item_c3_mikan_kanzume', name: 'みかんの缶詰', price: 200, target: 'allies', heal: 40, shopLimit: 1, desc: ['シロップまで 飲む 派。', 'みんなの HPを 40 回復。'] },
  { id: 'item_c3_aonori_senbei', name: '青のりせんべい', price: 80, target: 'minato', mp: 8, shopLimit: 2, desc: ['ひのやの 出張所の 品。', '朱肉を 8 回復。'] },
  {
    id: 'item_c3_kakigori', name: 'かき氷', price: 100, target: 'ally', heal: 20, cure: ['status_konran', 'status_nemuri', 'status_c3_mada'], special: 'kakigori', shopLimit: 2,
    desc: ['頭が キーンと する。目が さめる。', 'こんらん・ねむり・すばやさ↓を 治す。'],
  },
  // 印は ①〜③ がほどけるたびに はなまるへ。3つで まん中の サイレン塔に 印（60 4.3）
  {
    id: 'item_c3_map', name: '海ぞいの町の地図', key: true, target: 'none', battleText: ['地図を 見せた。\n……ここは、地図の 外だ。'],
    get desc(): [string, string] {
      if (flag('flag_ch3_nariosame_beaten')) return ['はなまるが 4つ。', 'どこも、ほどけた。'];
      const n = ['flag_ch3_ichiba_done', 'flag_ch3_shokudo_done', 'flag_ch3_umi_done'].filter((f) => flag(f)).length;
      if (n >= 3) return ['はなまるが 3つ。', 'まん中の 塔に、印が 1つ。'];
      return n ? ['子どもの 手描き。', `はなまる ${n}つ、印 ${3 - n}つ。`] : ['子どもの 手描き。', '印が 3つ。'];
    },
  },
  // 第3章 S07〜S09 の 大事なもの（60 7.1）。切れはしは 数を 名前に
  {
    id: 'item_c3_fucho', key: true, target: 'none', desc: [`${c3Name('npc_c3_seri')}の 字。指の 形と 数。`, '買い手の 手が 読める。'], battleText: ['切れはしを 見せた。\n$enemyは 指を 数えている。'],
    get name(): string {
      return `符丁ノートの切れはし ${flag('flag_ch3_fucho_n')}/5`;
    },
  },
  { id: 'item_c3_hashi', name: '割り箸', key: true, target: 'none', desc: ['市場の 割り箸。', '部品①。'], battleText: ['割り箸を 見せた。\n……まだ ごはんじゃ ない。'] },
  { id: 'item_c3_kanban_ka', name: '『か』の字', key: true, target: 'none', desc: ['看板の『か』。', '食堂かもめの もの。'], battleText: ['『か』を 見せた。\n$enemyは 読めずに いる。'] },
  // 本日は、開館です（クリア後の 昼、events/ch3/iso.ts）：ポコシャから あずかる からの 名札（6枚 わたすと なくなる）
  { id: 'item_iso_nafuda', name: 'からの名札', key: true, target: 'none', desc: ISO_ITEM_DESC, battleText: ['名札を 見せた。\n$enemyは 自分の 名前を 考えた。'] },
  // 灯台の 名のり（クリア後の 夜、events/ch3/nanori.ts）：ミナトの 予備の ストップウォッチ（止めない 時計の あとは 説明が かわる：ui/menu/items.ts）
  { id: 'item_nn_stopwatch', name: '予備のストップウォッチ', key: true, target: 'none', desc: [`${c3Name('npc_c3_sirenban')}の 予備。`, '光った とき 押す。'], battleText: ['ストップウォッチを 見せた。\n数字が 進んでいる。'] },
  { id: 'item_c3_megane', name: `${c3Name('npc_c3_sirenban')}のめがね`, key: true, target: 'none', desc: ['古い めがね。', `ふちに 小さく『${c3Name('npc_c3_sirenban').slice(0, 1)}』。`], battleText: ['めがねを 見せた。\n……度が 合わない。'] },
  { id: 'item_c3_shikake', name: '切れた仕掛け', key: true, target: 'none', desc: [`${c3Name('npc_c3_tsuri')}の 釣りの 仕掛け。`, '針は ついていない。'], battleText: ['仕掛けを 見せた。\n……針が ないので、釣れない。'] },
  { id: 'item_c3_bracelet', name: '貝のブレスレット', key: true, target: 'none', desc: [`${c3Name('npc_c3_mago')}が 去年 落とした もの。`, '白い 貝が 7つ。'], battleText: [`ブレスレットを 見せた。\n……これは、${c3Name('npc_c3_mago')}の 分だ。`] },
  // 第3章 S15〜S19（旧水族館）の 大事なもの（60 7.1）。メモと切れはしは 数を 名前に
  { id: 'item_c3_nyukanken', name: '入館券', key: true, target: 'none', desc: ['配達伝票の 形の 入館券。', 'お届け先は、大水槽 ホール。'], battleText: ['入館券を 見せた。\n……ここは、順路の とちゅうだ。'] },
  {
    id: 'item_c3_denpyo', key: true, target: 'none', desc: ['ツガオ便の 伝票の 端。', '3つの 字。'], battleText: ['メモを 見せた。\n$enemyは 日付を 数えている。'],
    get name(): string {
      return `伝票のメモ ${flag('flag_ch3_denpyo_n')}/12`;
    },
  },
  {
    id: 'item_c3_nisshi', key: true, target: 'none', desc: ['太い 字。だれの ことかは', '書いていない。'], battleText: ['切れはしを 見せた。\n……字が 太すぎて、読めない。'],
    get name(): string {
      return `飼育日誌の切れはし ${flag('flag_ch3_nisshi_n')}/6`;
    },
  },
  { id: 'item_c3_hall_key', name: '大水槽ホールの鍵', key: true, target: 'none', desc: ['飼育係の 名札つきの 鍵。', '『ポコシャ』。'], battleText: ['鍵を 見せた。\n……ここに、鍵穴は ない。'] },
  // 沢の上（02 #65）：セキトメがほどけたあと、岸に残った平たい石。トマじいに見せると、あずかる
  { id: 'item_namae_ishi', name: '名前の石', key: true, target: 'none', desc: ['沢の 岸の、平たい 石。', '『とまたろう』と、小さく『マル』。'], battleText: ['石を 見せた。\n$enemyは 字の 大きさを 見くらべた。'] },
  // 朝の ほうだけ 光る 星（02 #77）：まつ先生から 天文台の 鍵、望遠鏡の カバーから タクミの カード
  { id: 'item_dome_key', name: '天文台の鍵', key: true, target: 'none', desc: ['村営 天文台の 鍵。白い 札つき。', 'まつ先生から、朝まで あずかった。'], battleText: ['鍵を 見せた。\n……開ける 扉は、ここには ない。'] },
  { id: 'item_kanbo_card', name: 'タクミの観望会カード', key: true, target: 'none', desc: ['10年前の『観望会 カード』。', '答えの 欄は 白い。『くもり』。'], battleText: ['カードを 見せた。\n$enemyは 空の ほうを 見た。'] },
  { id: 'item_kanbo_card_done', name: 'タクミの観望会カード', key: true, target: 'none', desc: ['3つの 欄に、しゅんの 字。', '1つめは、半分の 丸。'], battleText: ['カードを 見せた。\n$enemyは 空の ほうを 見た。'] },
  // 上の 柵ぞいの 見回り（02 #99）：マサルから 見回りの あいだだけ 借りる（針の 色だけ 見る。電圧の 数字は 出さない）
  { id: 'item_saku_tester', name: '柵のテスター', key: true, target: 'none', desc: ['マサルの 電気柵の テスター。', '針が 赤・黄・緑の どこに 来るか。'], battleText: ['テスターを 見せた。\n$enemyは 針の 色を のぞきこんだ。'] },
  // 上へ 降る 雪（02 #101）：まつ先生から 借りる 箱（返さない：自転車置き場の 2台にも 使う）、替えた あとの 古い 虫ゴム
  { id: 'item_mg_hako', name: 'パンク修理の箱', key: true, target: 'none', desc: MG_ITEM_HAKO_DESC, battleText: ['箱を 見せた。\n$enemyは ゴムのりの ふたを 見た。'] },
  { id: 'item_mg_furui', name: '古い虫ゴム', key: true, target: 'none', desc: MG_ITEM_FURUI_DESC, battleText: ['古い 虫ゴムを 見せた。\n$enemyは ひびを 数えた。'] },
  // ええ 色の わけ（02 #103）：区長の 家の 漬物の おけから 1本（色あわせの あと、おけに もどす）
  { id: 'item_ir_kugi', name: 'さびた釘', key: true, target: 'none', desc: IR_ITEM_KUGI_DESC, battleText: ['釘を 見せた。\n$enemyは ナスの 色を 思いだした。'] },
  // 朝の 前の 色（02 #104）：ソワカから 借りる 絵皿（名場面の あと 返す）
  { id: 'item_as_ezara', name: 'ソワカの絵皿', key: true, target: 'none', desc: AS_ITEM_EZARA_DESC, battleText: ['絵皿を 見せた。\n$enemyは 露の 光を 見た。'] },
  // 赤子 泣いても（02 #105）：ペロの 羽釜の おにぎり（非売品、3つ。HP は 焼き芋と きゅうりの 間）、
  // きつね色の おこげで 炊けた ときの ツガオ便の 分（転回場の ヒロスケに わたす）
  { id: 'item_hg_onigiri', name: 'ペロのおにぎり', target: 'ally', heal: 50, desc: HG_ITEM_ONIGIRI_DESC },
  // 当たりは、かじって みんと（02_ch2_index）：ペロの 七輪の 焼きシシトウ（非売品、2つ）と、寄り合いへの 皿（集会所の 区長へ）
  { id: 'item_ss_yaki', name: '焼きシシトウ', target: 'ally', heal: 51, desc: SS_ITEM_DESC },
  { id: 'item_ss_sara', name: '寄り合いの皿', key: true, target: 'none', desc: SS_SARA_DESC, battleText: ['皿を 見せた。\n$enemyは シシトウの においを かいだ。'] },
  // 絵の きゅうりは、とり遅れない（02_ch2_index）：ソワカの 棚で とった 3本（札と くらべると ソワカへ）と、とれたての きゅうり
  // （非売品、2つ。値は きゅうりの一本漬けと 同じ 51 6.1 の 小さい 回復）
  { id: 'item_ky_sanbon', name: 'とったきゅうり', key: true, target: 'none', desc: KY_SANBON_DESC, battleText: ['きゅうりを 見せた。\n$enemyは いちばん 太い 1本を 見た。'] },
  { id: 'item_ky_tore', name: 'きゅうり（とれたて）', target: 'ally', heal: 45, desc: KY_ITEM_DESC },
  // 寝とる うちに、とる（02_ch2_index）：ペロの 上の 畑の レタス（非売品、1つ。値は 51 6.1 の 小さい 回復）
  { id: 'item_rt_retasu', name: 'しゃきしゃきレタス', target: 'ally', heal: 45, desc: RT_ITEM_DESC },
  // 雲の 下にも、郵便受け（02_ch2_index）：さんかどに あずかる 村の 手紙 3通（並べて 返すと なくなる）
  { id: 'item_ks2_tegami', name: 'さんかどの手紙3通', key: true, target: 'none', desc: KS_ITEM_DESC, battleText: ['手紙を 見せた。\n$enemyは 宛名を のぞきこんだ。'] },
  { id: 'item_hg_bin', name: '便の分のおにぎり', key: true, target: 'none', desc: HG_ITEM_BIN_DESC, battleText: ['おにぎりを 見せた。\n$enemyは おこげの においを かいだ。'] },
  // 湯を わかしてから（02 #106）：裏の 畑で もいだ 2本（集会所の ぴょん夫人に とどけると なべへ）
  { id: 'item_yw_moigi', name: 'もいだとうもろこし', key: true, target: 'none', desc: YW_ITEM_DESC, battleText: ['とうもろこしを 見せた。\n$enemyは ひげの 色を 見た。'] },
  // 真昼の 顔（03_ch3_index）：写真館の 主人に かりた カメラと、市場の 前の トロ箱の ふた（すむと 主人に 返す）
  { id: 'item_c3_camera', name: '古いカメラ', key: true, target: 'none', desc: MH_ITEM_CAMERA_DESC, battleText: ['カメラを 向けた。\n$enemyは 少し 背すじを のばした。'] },
  { id: 'item_c3_futa', name: 'トロ箱のふた', key: true, target: 'none', desc: MH_ITEM_FUTA_DESC, battleText: ['白い ふたを かかげた。\n$enemyの 顔が 明るく なった。'] },
  // 海の 水で 寄せる（03_ch3_index 28）：くま吉に あずかる 空きびん（沖の 水を くむ。豆腐が できると 返す）と、海の 寄せ豆腐（非売品）
  { id: 'item_c3_akibin', name: '空きびん', key: true, target: 'none', desc: YD_ITEM_BIN_DESC, battleText: ['空きびんを 見せた。\n$enemyは びんの 中の 青を のぞいた。'] },
  { id: 'item_c3_yosedofu', name: '海の寄せ豆腐', target: 'ally', heal: 70, desc: YD_ITEM_DOFU_DESC },
  // 紐の 番（02_ch2_index。案の ID の まま）：テツヤの 爪に からんでいた クズの 花（タケじいの 枕もとへ。h3 で 消える）
  { id: 'item_hoshi_tetsuya_kagi', name: 'クズの花', key: true, target: 'none', desc: HM_ITEM_HANA_DESC, battleText: ['クズの 花を 見せた。\n$enemyは ぶどうの においに 気づいた。'] },
  // 掃除は 上から（03_ch3_index）：屋上の 排水口に つまっていた ゴムボール（「持っておく」に した とき。クリア後 ハキコに 返す）
  { id: 'item_c3_ball', name: 'ゴムボール', key: true, target: 'none', desc: OJ_ITEM_BALL_DESC, battleText: ['ゴムボールを 見せた。\n$enemyは ボールを 目で 追った。'] },
  // 落とすけえ、甘うなる（03_ch3_index）：摘果した 青い 実。値は かき氷の 回復と 同じ（61 7.1 の 小さい 回復）
  { id: 'item_c3_ao_mikan', name: '青いみかん', target: 'ally', heal: 20, desc: MK_ITEM_DESC },
  // 明日の 朝の 氷（03_ch3_index）：砕いた 角氷を 袋に 入れた 物。値は 青い みかんと 同じ（61 7.1 の 小さい 回復）
  { id: 'item_c3_kachiwari', name: 'かち割り', target: 'ally', heal: 20, desc: KR_ITEM_DESC },
  // 破れたら、つくろう（03_ch3_index）：ゴロウの 古い 竹の 網針（使い道は ない）
  { id: 'item_c3_amibari', name: '古い網針', key: true, target: 'none', desc: AG_ITEM_DESC, battleText: ['網針を 見せた。\n$enemyは 糸の あとを 見ている。'] },
  // つるっと、終われる（03_ch3_index）：港の 乾物屋の 天草（食堂かもめで 煮ると なくなる）と、ところてん（非売品、2つ。
  // 値は 青い みかんと 同じ 61 7.1 の 小さい 回復）
  { id: 'item_c3_tengusa', name: '天草', key: true, target: 'none', desc: TK_ITEM_TENGUSA_DESC, battleText: ['天草を 見せた。\n$enemyは 海の においを かいだ。'] },
  { id: 'item_c3_tokoroten', name: 'ところてん', target: 'ally', heal: 20, desc: TK_ITEM_DESC },
  // 下の 紙の 字（03_ch3_index）：入口の 売店の 売れ残りの えんぴつ（S28 の あと 消える）
  { id: 'item_c3_enpitsu', name: 'ペンギンのえんぴつ', key: true, target: 'none', desc: SH_ITEM_DESC, battleText: ['えんぴつを 見せた。\n$enemyは おしりの ペンギンを 見た。'] },
  // 70年の 色紙と 小さな 夏祭り（02 #84）：ぴょん夫人から あずかる 色紙（そろうと 返す）、区の 倉庫の 提灯（校庭の 桜に かける）
  { id: 'item_shikishi', name: '70年の色紙', key: true, target: 'none', desc: ['ぴょん夫人から あずかった。', 'ひとことは 7つ。10年に 1つずつ。'], battleText: ['色紙を 見せた。\n$enemyは 少し 背すじを のばした。'] },
  { id: 'item_matsuri_chochin', name: '夏祭りの提灯', key: true, target: 'none', desc: ['『星見台 夏祭り』の 箱の 1つ。', 'トマトの 灯りで、紙が 橙に すける。'], battleText: ['提灯を 見せた。\n$enemyは 祭りの 音に 耳を すませた。'] },
  // ハンチングの 値札（02 #83）：ペロの家の 壁から 3号ハウスの ペロへ（渡すと 外れる）
  { id: 'item_hunting', name: 'ペロのハンチング', key: true, target: 'none', desc: ['値札の 糸が、ついたまま。', ''], battleText: ['ハンチングを 見せた。\n……これは、ペロの 帽子だ。'] },
  // チクタク堂の ばらばら時計（02 #88）：7つ目の あと、時計店の ゆうから（第2章にも 持っていく）
  { id: 'item_tokei7_utsushi', name: '7つの時刻の写し', key: true, target: 'none', desc: ['ゆうの 字。', '1秒も くるって いない 字。'], battleText: ['写しを 見せた。\n$enemyは いつもの 時刻を 考えている。'] },
  // 「ダンゴムシ ちゃうで」の 報告書（02 #93）：ワイスタ巡査の 報告書の 写し（もちもので カードが 開く。2行目は ui/menu/items.ts）
  { id: 'item_hokokusho', name: '報告書の写し', key: true, target: 'none', desc: ['ワイスタ巡査の 報告書の 写し。', ''], battleText: ['報告書の 写しを 見せた。\n$enemyは 自分の 欄を さがしている。'] },
];

const table = new Map<string, ItemDef>();
for (const it of items) table.set(it.id, it);

export function getItem(id: string): ItemDef | undefined {
  return table.get(id);
}

export function allItems(): ItemDef[] {
  return [...table.values()];
}

export function isKeyItem(id: string): boolean {
  return !!table.get(id)?.key;
}

/** Most a shop sells of `id` in one visit (Infinity = no limit). */
export function shopLimit(id: string): number {
  return table.get(id)?.shopLimit ?? Infinity;
}

/** Gacha capsule contents (7.1): weights. null = empty. */
export const CAPSULE_TABLE: [string | null, number][] = [
  ['item_ramune', 35],
  ['item_fugashi', 20],
  ['item_hakka_ame', 20],
  [null, 25],
];
