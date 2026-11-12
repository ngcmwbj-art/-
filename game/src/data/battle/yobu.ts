// ツガオ決戦の「よぶ」（61 14.3〜14.5・60 3.4・7.4）：来た人の 表と、その人の はなまるの 絵の 色。
// 来た人は `flag_ch3_kita_<id>`（第1章・第2章で 話しかけた 人が ツガオ便で 来た）、海ぞいの 町の 人は
// `flag_talked_<id>`（子ども3人は 1組で 1人分）。よぶ①＝章1、②＝章2（くりこは ②）、③＝海ぞいの 町。

import { flag } from '../../game/state';

/** 回覧板に 描く はなまるの 形（60 3.4「よぶ：はなまるの絵」）。 */
export type YobuMark =
  | 'akapen' | 'tofu' | 'tomato' | 'hanawa' | 'hoshi' | 'hanko' | 'keirei' | 'enogu' | 'mikan' | 'zari' | 'tokei'
  | 'coffee' | 'higasa' | 'futatsu' | 'onigiri' | 'inaho' | 'fude' | 'yunomi' | 'tomato_dan' | 'keshiin' | 'kippu'
  | 'shuzumi' | 'lens' | 'jouro' | 'umi';

export interface YobuPerson {
  id: string;
  /** よぶの 回（1 夕鳴町・2 星見台・3 海ぞいの 町）。 */
  call: 1 | 2 | 3;
  mark: YobuMark;
  /** はなまるの 色（その人の 色）。 */
  color: string;
  /** 寄り道の フラグ（済んでいたら 線が 2重・2色。60 3.4）。'*' で 前方一致。 */
  yori?: string[];
}

/** 60 3.4 の 表の 順（便の 順＝来た 順）。 */
export const YOBU_KITA: YobuPerson[] = [
  { id: 'npc_obaa', call: 1, mark: 'akapen', color: '#E23B2E' },
  { id: 'npc_mamekichi', call: 1, mark: 'tofu', color: '#E8E4D0', yori: ['flag_kitsune_*'] },
  { id: 'npc_hoshi_mitsu', call: 2, mark: 'tomato', color: '#E0442E', yori: ['flag_ch2_wakime_done'] },
  { id: 'npc_hoshi_gen', call: 2, mark: 'hanawa', color: '#C8A040', yori: ['flag_ch2_barn_work', 'flag_ashiato_*'] },
  { id: 'npc_hoshi_fumi', call: 2, mark: 'hoshi', color: '#F2C84B', yori: ['flag_kanbo_report'] },
  { id: 'npc_hoshi_kucho', call: 2, mark: 'hanko', color: '#C8402E' },
  { id: 'npc_tsurumi', call: 1, mark: 'keirei', color: '#3A5AA8', yori: ['flag_got_hanamaru_kensui'] },
  { id: 'npc_sae', call: 1, mark: 'enogu', color: '#4AA8E0', yori: ['flag_toban_done'] },
  { id: 'npc_ojii', call: 1, mark: 'mikan', color: '#F2894B', yori: ['flag_got_tankan'] },
  { id: 'npc_tamotsu', call: 1, mark: 'zari', color: '#C8402E', yori: ['flag_zari_*'] },
  { id: 'npc_tokio', call: 1, mark: 'tokei', color: '#8E95A6', yori: ['flag_tokei7_done'] },
  { id: 'npc_master', call: 1, mark: 'coffee', color: '#8A5A3A', yori: ['flag_bu_left'] },
  { id: 'npc_madam', call: 1, mark: 'higasa', color: '#E0567A', yori: ['flag_kotei_done'] },
  { id: 'npc_bu_body', call: 1, mark: 'futatsu', color: '#6B5A8A' },
  { id: 'npc_maru', call: 1, mark: 'onigiri', color: '#F4F1E8', yori: ['flag_ch2_maru_told'] },
  { id: 'npc_hoshi_tome', call: 2, mark: 'inaho', color: '#D9A441', yori: ['flag_yoburi_report'] },
  { id: 'npc_hoshi_sawako', call: 2, mark: 'fude', color: '#2A2440', yori: ['flag_tenban_done'] },
  { id: 'npc_hoshi_yoshie', call: 2, mark: 'yunomi', color: '#5A8A5A' },
  { id: 'npc_jk', call: 2, mark: 'tomato_dan', color: '#E0442E', yori: ['flag_hunting_got'] },
  { id: 'npc_hoshi_busdriver', call: 2, mark: 'keshiin', color: '#4A6AB0', yori: ['flag_ch2_tegami'] },
  { id: 'npc_hoshi_traindriver', call: 2, mark: 'kippu', color: '#8A8A5A' },
  { id: 'npc_fudeno', call: 1, mark: 'shuzumi', color: '#E2502E' },
  { id: 'npc_photo_master', call: 1, mark: 'lens', color: '#3A3F48' },
  { id: 'npc_mizumaki', call: 1, mark: 'jouro', color: '#4AA8E0' },
];

/** 海ぞいの 町の 人（③。必ず 話す 5人は 必ず 来る。子ども3人は 1組）。 */
export const YOBU_TOWN: { id: string; ids?: string[]; color: string }[] = [
  { id: 'npc_c3_shokudo', color: '#E23B2E' },
  { id: 'npc_c3_jouren', color: '#6B5A4A' },
  { id: 'npc_c3_seri', color: '#3A5AA8' },
  { id: 'npc_c3_seri_deshi', color: '#4AA8E0' },
  { id: 'npc_c3_sirenban', color: '#C8402E' },
  { id: 'npc_c3_toudai', color: '#F2C84B' },
  { id: 'npc_c3_mago', color: '#E0567A' },
  { id: 'npc_c3_kanshiin', color: '#F2894B' },
  { id: 'npc_c3_himono_otto', color: '#B8904A' },
  { id: 'npc_c3_himono_tsuma', color: '#D86A5A' },
  { id: 'npc_c3_tsuri', color: '#5A8A5A' },
  { id: 'npc_c3_uketsuke', color: '#8A6AB0' },
  { id: 'npc_c3_kid_a', ids: ['npc_c3_kid_a', 'npc_c3_kid_b', 'npc_c3_kid_c'], color: '#F2C84B' },
];

/** 必ず 話す 5人（60 7.4）。 */
const TOWN_MUST = new Set(['npc_c3_shokudo', 'npc_c3_jouren', 'npc_c3_seri_deshi', 'npc_c3_mago', 'npc_c3_sirenban']);

export interface YobuCome {
  id: string;
  call: 1 | 2 | 3;
  mark: YobuMark;
  color: string;
  /** 寄り道が 済んでいる（絵が 少し 豪華）。 */
  rich: boolean;
}

function anyFlag(f: string): boolean {
  if (!f.endsWith('*')) return flag(f) > 0;
  return false;
}

/** 来た人（よぶ①〜③ の 順）。`prefixFlags` は state.flags の キーで 前方一致を 見る。 */
export function yobuPeople(prefixFlags: string[] = []): YobuCome[] {
  const has = (f: string) => (f.endsWith('*') ? prefixFlags.some((k) => k.startsWith(f.slice(0, -1)) && flag(k) > 0) : anyFlag(f));
  const out: YobuCome[] = [];
  for (const call of [1, 2] as const)
    for (const p of YOBU_KITA)
      if (p.call === call && flag(`flag_ch3_kita_${p.id}`) > 0) out.push({ id: p.id, call, mark: p.mark, color: p.color, rich: !!p.yori?.some(has) });
  for (const t of YOBU_TOWN) {
    const ids = t.ids ?? [t.id];
    if (TOWN_MUST.has(t.id) || ids.some((id) => flag(`flag_talked_${id}`) > 0)) out.push({ id: t.id, call: 3, mark: 'umi', color: t.color, rich: false });
  }
  return out;
}
