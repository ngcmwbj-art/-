// 第3章『海ぞいの町の いただきます』 — 海ぞいの町の人の表示名（60_ch3_story 0章の冒頭・3.0・12.1）。
//
// 名前は仮（依頼主が変える予定、2026-10-10）。ID は役目の英語のまま、名札と台詞の
// 中の名前だけをこの表から出す。台詞では `{name:npc_c3_shokudo}` と書き、
// c3Name() / fillNames() が表示名に置きかえる。名前を変えたら、文の検査
// （__game.cmd.textcheck2()・wrapCheck()）をやりなおす。
//
// 名札と地の文では、名前に「さん」をつけない（台詞の中の「ナミエさん」はよい）。

export const C3_NAMES: Record<string, string> = {
  npc_c3_shokudo: 'ナミエ',
  npc_c3_jouren: 'ゴロウ',
  npc_c3_seri: 'ゲン',
  npc_c3_seri_deshi: 'ツグミ',
  npc_c3_sirenban: 'ミナト',
  npc_c3_toudai: 'テル',
  npc_c3_mago: 'ウミ',
  npc_c3_kanshiin: 'カイト',
  npc_c3_himono_otto: 'ホシオ',
  npc_c3_himono_tsuma: 'ホシミ',
  npc_c3_tsuri: 'ツリノ',
  npc_c3_uketsuke: 'ハキコ',
  npc_c3_kid_a: '子ども',
  npc_c3_kid_b: '子ども',
  npc_c3_kid_c: '子ども',
};

/** 声（63 9.1）：役目の英語。子どもは3人とも `c3_kid`。 */
export function c3Voice(id: string): string {
  if (id.startsWith('npc_c3_kid_')) return 'c3_kid';
  return id.replace(/^npc_/, '');
}

/** 表示名（ない ID はそのまま）。 */
export function c3Name(id: string): string {
  return C3_NAMES[id] ?? id;
}

/** 台詞の中の `{name:npc_c3_*}` を表示名に。 */
export function fillNames(src: string): string {
  return src.replace(/\{name:(npc_[a-z0-9_]+)\}/g, (_, id: string) => c3Name(id));
}
