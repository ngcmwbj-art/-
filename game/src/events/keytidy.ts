// 大事なものの 点検（改善会議 2026-10-31 の 5。一覧は docs/game/key_items.md）。
//
// 寄り道の 窓が 閉じた（章が 進んだ）のに、持ち主へ わたす 前の 物が 大事なものに 残る ことが ある。
// 章の フラグが 立った ときに 袋から 外し（持ち主へ わたした ことに する）、みました帳②の すみに
// 「あずかった 物は、わたした」の 1行（だれに わたしたか。ui/menu/book_keytidy.ts）。
//   第1章の 物：flag_clear（第1章の「つづく」）・flag_ch2_started
//   第2章の 物：flag_ch2_clear（第2章の「つづく」）・flag_ch3_started
// 外した 物は flag_kt_<id> に 覚えて おく。クリア後（flag_ch3_clear）は 第1章・第2章の 寄り道の 窓が
// また 開く（05_postgame 2.0）ので、まだ すんでいない 物だけ 袋に もどす（その 寄り道が 最後まで できる）。
// 自分で 片づける 物（クズの花・第3章の 寄り道の 道具・さんかどの 手紙・天文台の 鍵・焼きそば・たんかん・
// トマト）と、話の 道具として わざと 残す 物（握手券など）は ここに 入れない（表に 理由）。
//
// 古い セーブ（この 片づけの 前に 作った もの）は、つづきから 読みこんだ ときに 同じ 片づけを する
// （keyTidyOnLoad、ui/flow.ts）。クリア後の セーブには 何も しない。
//
// QA：__game.cmd.keyTidy()（今の ようす）、keyTidy('run')（今の フラグで 片づける）、keyTidy('restore')

import { addItem, flag, hasItem, onFlagRaised, removeItem, setFlag } from '../game/state';
import { registerDebug } from '../debug';

export interface KeyTidy {
  id: string;
  /** どの 章の 終わりで 外すか。 */
  ch: 1 | 2;
  /** 持ち主（みました帳の「わたした 人」。表示名）。 */
  to: string;
  /** その 寄り道が すんだ 印（立っていれば クリア後に もどさない）。 */
  done: string;
  /** クリア後に その 寄り道が また 開く（もどす）。 */
  pg: boolean;
}

export const KEY_TIDY: KeyTidy[] = [
  // 第1章：きつねの 常連（aze.ts）。祠に のせる 前の 油揚げ
  { id: 'item_abura_age', ch: 1, to: 'くま吉', done: 'flag_abura_offered', pg: true },
  // 第2章（窓は 段階1〜2。クリア後は 夜に また 開く。シシトウと きゅうりは クリア後に 開かない）
  { id: 'item_saku_tester', ch: 2, to: 'マサル', done: 'flag_saku_done', pg: true },
  { id: 'item_mg_hako', ch: 2, to: 'まつ先生', done: 'flag_mg_done', pg: true },
  { id: 'item_ir_kugi', ch: 2, to: 'ハモ区長', done: 'flag_ir_done', pg: true },
  { id: 'item_as_ezara', ch: 2, to: 'ソワカ', done: 'flag_as_done', pg: true },
  { id: 'item_ss_sara', ch: 2, to: 'ハモ区長', done: 'flag_ss_kucho', pg: false },
  { id: 'item_ky_sanbon', ch: 2, to: 'ソワカ', done: 'flag_ky_done', pg: false },
  { id: 'item_hg_bin', ch: 2, to: 'ヒロスケ', done: 'flag_hg_bin_done', pg: true },
  { id: 'item_yw_moigi', ch: 2, to: 'ぴょん夫人', done: 'flag_yw_done', pg: true },
  { id: 'item_shikishi', ch: 2, to: 'ぴょん夫人', done: 'flag_shikishi_done', pg: true },
  { id: 'item_matsuri_chochin', ch: 2, to: 'ハモ区長', done: 'flag_matsuri_kake', pg: true },
  { id: 'item_hunting', ch: 2, to: 'ペロ', done: 'flag_hunting_on', pg: true },
  { id: 'item_namae_ishi', ch: 2, to: 'トマじい', done: 'flag_ch2_sawa_ishi', pg: true },
  // 第1章の 郵便屋さんから。第2章の さんかどへ（調整で 外さない：50 1.5）
  { id: 'item_ashita_tegami', ch: 2, to: 'さんかど', done: 'flag_ch2_tegami', pg: true },
];

export const ktFlag = (id: string): string => `flag_kt_${id.replace(/^item_/, '')}`;

/** 章 ch まで の 物を 袋から 外す（持ち主へ わたした）。外した 数。 */
export function keyTidy(ch: 1 | 2): number {
  let n = 0;
  for (const e of KEY_TIDY) {
    if (e.ch > ch || !hasItem(e.id)) continue;
    while (hasItem(e.id)) removeItem(e.id);
    setFlag(ktFlag(e.id), 1);
    n++;
  }
  return n;
}

/** クリア後：まだ すんでいない 寄り道の 物を 袋に もどす。 */
export function keyTidyRestore(): number {
  let n = 0;
  for (const e of KEY_TIDY) {
    if (!flag(ktFlag(e.id))) continue;
    setFlag(ktFlag(e.id), 0);
    if (!e.pg || flag(e.done) || hasItem(e.id)) continue;
    addItem(e.id);
    n++;
  }
  return n;
}

/** わたした 人（重なりなし、表の 順）。 */
export function keyTidyPeople(): string[] {
  const out: string[] = [];
  for (const e of KEY_TIDY) if (flag(ktFlag(e.id)) && !out.includes(e.to)) out.push(e.to);
  return out;
}

/** つづきから 読みこんだ とき（古い セーブ）：その 章の 片づけ。クリア後は 何も しない。 */
export function keyTidyOnLoad(): number {
  if (flag('flag_ch3_clear')) return 0;
  if (flag('flag_ch2_clear') || flag('flag_ch3_started')) return keyTidy(2);
  if (flag('flag_clear') || flag('flag_ch2_started')) return keyTidy(1);
  return 0;
}

onFlagRaised((id) => {
  if (id === 'flag_clear' || id === 'flag_ch2_started') keyTidy(1);
  else if (id === 'flag_ch2_clear' || id === 'flag_ch3_started') keyTidy(2);
  else if (id === 'flag_ch3_clear') keyTidyRestore();
});

if (import.meta.env.DEV)
  registerDebug('keyTidy', (step = 'state') => {
    if (step === 'run') return { tidied: keyTidyOnLoad(), people: keyTidyPeople() };
    if (step === 'restore') return { restored: keyTidyRestore() };
    return KEY_TIDY.map((e) => ({ id: e.id, has: hasItem(e.id), kt: flag(ktFlag(e.id)), done: flag(e.done) }));
  });
