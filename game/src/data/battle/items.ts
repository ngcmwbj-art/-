// Items (20_systems_battle.md 7, 10_narrative.md 10).

import type { ItemDef } from './types';

const items: ItemDef[] = [
  // QA round 1 balance: with 500円 (and the yakisoba shop's tab) the bag could
  // hold 8+ strong heals and the boss never threatened. Heals are smaller,
  // ふがし is the dear one, and a visit sells only a couple of each.
  { id: 'item_ramune', name: 'ラムネ', price: 60, target: 'ally', heal: 20, shopLimit: 2, desc: ['ビー玉が からん と鳴る。', 'HPを 20 回復。'] },
  { id: 'item_kinakobou', name: 'きなこぼう', price: 20, target: 'ally', heal: 12, special: 'kinakobou', shopLimit: 3, desc: ['あたりは 入ってない らしい。', 'HPを 12 回復。たまに あたり。'] },
  { id: 'item_fugashi', name: 'ふがし', price: 90, target: 'ally', heal: 40, shopLimit: 1, desc: ['軽い。回復量は 重い。', 'HPを 40 回復。'] },
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
  { id: 'item_tomato_omiyage', name: 'トマト（4つ）', key: true, target: 'none', desc: ['ペロの トマト。4つ。', '……1つは おまけ。'], battleText: ['これは おみやげだ。'] },
  // 沢の上（02 #65）：セキトメがほどけたあと、岸に残った平たい石。トマじいに見せると、あずかる
  { id: 'item_namae_ishi', name: '名前の石', key: true, target: 'none', desc: ['沢の 岸の、平たい 石。', '『とまたろう』と、小さく『マル』。'], battleText: ['石を 見せた。\n$enemyは 字の 大きさを 見くらべた。'] },
  // 朝の ほうだけ 光る 星（02 #77）：まつ先生から 天文台の 鍵、望遠鏡の カバーから タクミの カード
  { id: 'item_dome_key', name: '天文台の鍵', key: true, target: 'none', desc: ['村営 天文台の 鍵。白い 札つき。', 'まつ先生から、朝まで あずかった。'], battleText: ['鍵を 見せた。\n……開ける 扉は、ここには ない。'] },
  { id: 'item_kanbo_card', name: 'タクミの観望会カード', key: true, target: 'none', desc: ['10年前の『観望会 カード』。', '答えの 欄は 白い。『くもり』。'], battleText: ['カードを 見せた。\n$enemyは 空の ほうを 見た。'] },
  { id: 'item_kanbo_card_done', name: 'タクミの観望会カード', key: true, target: 'none', desc: ['3つの 欄に、しゅんの 字。', '1つめは、半分の 丸。'], battleText: ['カードを 見せた。\n$enemyは 空の ほうを 見た。'] },
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
