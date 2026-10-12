// 第3章『海ぞいの町の いただきます』 — the scenario's shared helpers (60_ch3_story 3.0・12.1):
// the speakers of 海ぞいの町 (name tags from C3_NAMES, voices `c3_*`), the talk-key
// picker with the `c` prefix (c1_1 = stage 1, first time), the names filled into
// the lines, and the chapter's state.

import type { Co } from '../../engine/co';
import { flag, setFlag } from '../../game/state';
import { SPEAKERS, runMsg } from '../../world/msg';
import { field } from '../../world/field';
import type { Actor } from '../../world/actor';
import { C3_NAMES, c3Voice, fillNames } from '../../data/text/c3_names';

// ---------------------------------------------------------------- speakers (60 0.4, 63 9.1)

for (const [id, name] of Object.entries(C3_NAMES)) SPEAKERS[id] = { name, voice: c3Voice(id) };

// ---------------------------------------------------------------- state

/** Chapter 3 is under way (started, not finished). */
export function inCh3(): boolean {
  return flag('flag_ch3_started') > 0 && !flag('flag_ch3_clear');
}

/** 60 4.4: 0 夕鳴町の昼前 / 1 正午 / 2 12:01 / 3 旧水族館 / 4 エンディング. */
export function c3Stage(): number {
  return flag('flag_ch3_stage');
}

/** 夕鳴町 in chapter 3's stage 0 (S01〜S04: 9月1日 11:10). */
export function c3Town(): boolean {
  return inCh3() && c3Stage() === 0;
}

export function mapId(): string {
  return field()?.map.id ?? '';
}

/** An actor of the field now. */
export function npc(id: string): Actor | null {
  return field()?.actorById(id) ?? null;
}

// ---------------------------------------------------------------- talking

/** Run a msg block with `{name:npc_c3_*}` filled in (ignores empty ones). */
export function* say3(text: string | undefined | null, speaker?: string): Co<number> {
  if (!text) return -1;
  return yield* runMsg(fillNames(text), speaker);
}

/**
 * The talk key for the current chapter-3 stage (3.0): numbered keys c1_1,
 * c1_2… are taken in turn and the last one repeats (flag_seen_<npc>_c1 counts
 * the visits, flag_seen_<npc>_c1_1 marks each key heard); a plain key `c1`
 * is used as it is. An earlier stage's keys stand in for a later stage
 * without its own.
 */
export function pickC3(npcId: string, table: Record<string, string>, stage = c3Stage()): string | null {
  for (let s = stage; s >= 0; s--) {
    const numbered: string[] = [];
    for (let n = 1; n <= 9; n++) if (table[`c${s}_${n}`] !== undefined) numbered.push(`c${s}_${n}`);
    if (numbered.length) {
      const cf = `flag_seen_${npcId}_c${s}`;
      const count = flag(cf);
      const key = numbered[Math.min(count, numbered.length - 1)];
      setFlag(cf, count + 1);
      setFlag(`flag_seen_${npcId}_${key}`, 1);
      return key;
    }
    if (table[`c${s}`] !== undefined) return `c${s}`;
  }
  return null;
}

/** グソっ君's one-time word after an examine (〔kn〕, flag_kanenari_flip_c3_<obj>). */
export function knOnce(objId: string): boolean {
  const f = `flag_kanenari_flip_c3_${objId.replace(/^obj_c3_/, '')}`;
  if (flag(f)) return false;
  setFlag(f, 1);
  return true;
}
