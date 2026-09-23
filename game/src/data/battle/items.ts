// Items (20_systems_battle.md 7, 10_narrative.md 10).

import type { ItemDef } from './types';

const items: ItemDef[] = [
  { id: 'item_ramune', name: 'ラムネ', price: 60, target: 'ally', heal: 30, desc: ['ビー玉が からん と鳴る。', 'HPを 30 回復。'] },
  { id: 'item_kinakobou', name: 'きなこぼう', price: 20, target: 'ally', heal: 20, special: 'kinakobou', desc: ['あたりは 入ってない らしい。', 'HPを 20 回復。たまに あたり。'] },
  { id: 'item_fugashi', name: 'ふがし', price: 40, target: 'ally', heal: 55, desc: ['軽い。回復量は 重い。', 'HPを 55 回復。'] },
  { id: 'item_hakka_ame', name: 'ハッカあめ', price: 30, target: 'ally', cure: ['status_konran', 'status_nemuri'], desc: ['すーっと する。目も さめる。', 'こんらん・ねむりを 治す。'] },
  { id: 'item_stamp_pad', name: 'ちびたスタンプ台', price: 70, target: 'minato', mp: 12, desc: ['使いこまれて、まんなかが へこんでいる。', '朱肉を 12 回復。'] },
  { id: 'item_oden_can', name: '八月のおでん缶', target: 'allies', healRate: 0.5, desc: ['温度だけは 本気。', '全員の HPを 半分 回復。'] },
  { id: 'item_shippu', name: 'ひえひえシップ', target: 'ally', heal: 40, special: 'shippu', desc: ['はると 背すじが のびる。', 'HPを 40 回復。下がった 能力を 戻す。'] },
  { id: 'item_capsule', name: 'ガチャのカプセル', price: 100, target: 'ally', special: 'capsule', desc: ['中身は 開けてからの お楽しみ。', 'ランダムで 回復。からっぽも ある。'] },
  // 大事なもの
  { id: 'item_otsukai_memo', name: 'おつかいメモ', key: true, target: 'none', desc: ['コロッケ 4つ。ソースは べつ。', ''], battleText: ['これは 晩ごはんの メモだ。'] },
  { id: 'item_gamaguchi', name: 'がま口', key: true, target: 'none', desc: ['母の がま口。ぱちん、と', '閉まる 音が いい。'], battleText: ['がま口を 開けた。\n……戦いに お金は いらない。'] },
  { id: 'item_hanko_case', name: 'ハンコケース', key: true, target: 'none', desc: ['おばあの 採点ハンコが 入っている。', '枠は 10。'], battleText: ['ハンコケースを 見せた。\n$enemyは 少し 身がまえた。'] },
  { id: 'item_mimashita_cho', name: 'みました帳', key: true, target: 'none', desc: ['白紙だった 自由研究の ノート。', '見たものを 書きこんでいく。'], battleText: ['ノートを 開いた。\n……いまは 書いている ひまが ない。'] },
  { id: 'item_maigo_key', name: '迷子センターの鍵', key: true, target: 'none', desc: ['小さな カギ。', 'キーホルダーは、カバ。'], battleText: ['カギは、ここで 使う ものじゃない。'] },
  { id: 'item_hato_meishi', name: 'ハトの名刺', key: true, target: 'none', desc: ['『夕鳴町 鳩課 係長』。', '裏に 小さく『帰りたい』。'], battleText: ['名刺を さしだした。\n……受けとって もらえなかった。'] },
  { id: 'item_korokke', name: '揚げたてコロッケ', key: true, target: 'none', desc: ['4つ。ソースは 別。', '……1つは おまけ。'], battleText: ['これは 晩ごはんだ。'] },
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

/** Gacha capsule contents (7.1): weights. null = empty. */
export const CAPSULE_TABLE: [string | null, number][] = [
  ['item_ramune', 35],
  ['item_fugashi', 20],
  ['item_hakka_ame', 20],
  [null, 25],
];
