// 話しかけた記録 `flag_talked_<npc_id>`（60_ch3_story 3.0・3.4・12.1 #2）.
//
// - From now on every talk records it (src/world/interact.ts interactActor:
//   the npc's id), in chapters 1 and 2 too, and it stays in the save.
// - A save made before that has none: at the start of chapter 3
//   (ui/flow.startChapter3 → registerChapter3StartHook) they are made from what
//   the save does have — the talk keys heard (`flag_seen_<npc>_s1_2`,
//   `_h0_1`… and the visit counts `flag_seen_<npc>_s1`), the side quests and
//   story beats of that person (TALK_FLAGS below, 3.4's 「寄り道」 column), and
//   the six who are always talked to on the main line (MUST_TALK) for anyone
//   who has played chapters 1–2.
// - 「第3章から」 (the standard data): only MUST_TALK (60 1.5).
//
// Used from the second part of chapter 3 (S10 あぜ道市, S25, S27 よぶ). QA:
// __game.cmd.talked() lists them, __game.cmd.talkedAudit() lists the chapter-1/2
// people whose talks leave no flag_seen_ (pickTalk's direct keys, 12.1 #2).

import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerChapter3StartHook } from '../../ui/flow';
import { getMapDef, mapIds } from '../../world/maps';
import { hasScript } from '../../world/scripts';
import type { NpcObj } from '../../world/types';

/** 3.4 ★: talked to on the main line by anyone who played chapters 1 and 2 (and in the standard data). */
export const MUST_TALK = ['npc_obaa', 'npc_mamekichi', 'npc_hoshi_mitsu', 'npc_hoshi_gen', 'npc_hoshi_fumi', 'npc_hoshi_kucho'];

/**
 * Flags that can only be set by talking to that person (3.4 「寄り道」, and the
 * story beats where しゅん talks to them). `*` at the end: any flag with that start.
 */
export const TALK_FLAGS: Record<string, string[]> = {
  npc_obaa: ['flag_met_obaa'],
  npc_maruyama: ['flag_met_maruyama'],
  npc_mamekichi: ['flag_kitsune_*'],
  npc_hoshi_mitsu: ['flag_ch2_met_mitsu', 'flag_ch2_wakime_done'],
  npc_hoshi_gen: ['flag_ch2_met_gen', 'flag_ch2_barn_work', 'flag_ashiato_*'],
  npc_hoshi_fumi: ['flag_kanbo_report'],
  npc_hoshi_kucho: ['flag_ch2_yoriai'],
  npc_tsurumi: ['flag_got_hanamaru_kensui'],
  npc_sae: ['flag_toban_done'],
  npc_ojii: ['flag_got_tankan'],
  npc_tamotsu: ['flag_zari_*'],
  npc_tokio: ['flag_tokei7_done'],
  npc_master: ['flag_bu_left'],
  npc_madam: ['flag_kotei_done'],
  npc_maru: ['flag_met_maru', 'flag_ch2_maru_told'],
  npc_hoshi_tome: ['flag_yoburi_report'],
  npc_hoshi_sawako: ['flag_tenban_done'],
  npc_jk: ['flag_hunting_got'],
  npc_hoshi_busdriver: ['flag_ch2_tegami'],
};

/** The npc id a `flag_seen_<npc>_<key>` flag is about (null: not a talk-key record). */
export function seenNpc(flagId: string): string | null {
  const m = /^flag_seen_(npc_[a-z0-9_]+?)_[sh]\d/.exec(flagId);
  return m ? m[1] : null;
}

/** A flag is set (`*` at the end: any flag with that start). */
export function anyFlag(spec: string): boolean {
  if (!spec.endsWith('*')) return flag(spec) > 0;
  const pre = spec.slice(0, -1);
  return Object.entries(state.flags).some(([k, v]) => k.startsWith(pre) && v > 0);
}

/**
 * Make the talked records from a chapter-1/2 save (3.4 判定). `standard`: the
 * 「第3章から」 standard data — only the six of the main line. Returns the ids set.
 */
export function deriveTalked(standard: boolean): string[] {
  const out = new Set<string>();
  const mark = (id: string) => {
    if (!flag(`flag_talked_${id}`)) setFlag(`flag_talked_${id}`, 1);
    out.add(id);
  };
  if (!standard) {
    for (const [k, v] of Object.entries(state.flags)) {
      if (!v) continue;
      const id = seenNpc(k);
      if (id) mark(id);
    }
    for (const [id, specs] of Object.entries(TALK_FLAGS)) if (specs.some(anyFlag)) mark(id);
  }
  // played chapter 1 (or the standard data): おばあ・くま吉; chapter 2: the four of 星見台
  if (standard || flag('flag_clear') || flag('flag_ch2_started')) for (const id of MUST_TALK.slice(0, 2)) mark(id);
  if (standard || flag('flag_ch2_clear') || flag('flag_ch2_yoriai')) for (const id of MUST_TALK.slice(2)) mark(id);
  return [...out].sort();
}

registerChapter3StartHook((standard) => {
  deriveTalked(standard);
});

// ---------------------------------------------------------------- QA

/** Everyone with a talked record now. */
registerDebug('talked', () =>
  Object.keys(state.flags)
    .filter((k) => k.startsWith('flag_talked_') && flag(k))
    .map((k) => k.slice('flag_talked_'.length))
    .sort(),
);

/** For the tests: run the derivation now (`standard` as for 「第3章から」). */
registerDebug('deriveTalked', (standard = false) => deriveTalked(!!standard));

/**
 * 12.1 #2: the chapter-1/2 people whose talks leave no flag_seen_ (only direct
 * keys like s1-2 / h0, or a script of their own with no talk table), and whether
 * a flag of TALK_FLAGS / MUST_TALK covers them. Old saves can't tell if they were
 * talked to; from this version on flag_talked_ records them anyway.
 */
registerDebug('talkedAudit', () => {
  const rows: { id: string; maps: string[]; keys: string; script: boolean; covered: string }[] = [];
  const seen = new Map<string, (typeof rows)[number]>();
  for (const mid of mapIds()) {
    const def = getMapDef(mid);
    if (!def || mid.startsWith('map_c3_') || mid === 'map_umizoi') continue;
    for (const o of def.objects) {
      if (o.t !== 'npc') continue;
      const n = o as NpcObj;
      if (n.passerby || n.vehicle || !n.id.startsWith('npc_')) continue;
      const keys = Object.keys(n.talk ?? {});
      const numbered = keys.some((k) => /^[sh]\d_\d$/.test(k));
      const row = seen.get(n.id);
      if (row) {
        if (!row.maps.includes(mid)) row.maps.push(mid);
        if (numbered) row.keys = 'numbered';
        continue;
      }
      const r = {
        id: n.id,
        maps: [mid],
        keys: numbered ? 'numbered' : keys.length ? `direct: ${keys.join(' ')}` : 'none',
        script: hasScript(n.script ?? n.id),
        covered: MUST_TALK.includes(n.id) ? 'must' : TALK_FLAGS[n.id] ? TALK_FLAGS[n.id].join(' ') : '',
      };
      seen.set(n.id, r);
      rows.push(r);
    }
  }
  return rows.filter((r) => r.keys !== 'numbered').sort((a, b) => a.id.localeCompare(b.id));
});
