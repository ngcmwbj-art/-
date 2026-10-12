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
import { getMapDef, registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { game } from '../../engine/game';
import type { BattleOpts } from '../../battle/api';
import { getEnemy } from '../../data/battle';
import { eventBattle } from '../lib';

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

// ---------------------------------------------------------------- 第2期（S07〜S14）


/**
 * Add the scenario's own objects (triggers, things to pick up, the people who
 * came) to a map W registered — W's map files are left alone. Re-registering
 * drops the parsed cache. A map that isn't there (yet) is skipped; `onEnter`
 * scripts are appended once.
 */
export function addToMap(id: string, objects: MapObj[], onEnter: string[] = []): boolean {
  const def = getMapDef(id);
  if (!def) return false;
  const have = new Set(def.objects.map((o) => o.id));
  for (const o of objects) if (!o.id || !have.has(o.id)) def.objects.push(o);
  if (onEnter.length) def.onEnter = [...new Set([...(def.onEnter ?? []), ...onEnter])];
  registerMap(def);
  return true;
}

/** ①市場・②食堂・③海水浴場 — how many are done (60 5.1). */
export function partsDone(): number {
  return ['flag_ch3_ichiba_done', 'flag_ch3_shokudo_done', 'flag_ch3_umi_done'].filter((f) => flag(f)).length;
}

/** The town at noon, before S12 (stage 1). */
export function noon(): boolean {
  return inCh3() && c3Stage() === 1;
}

/** Came to 海ぞいの町 on ヒロスケ's truck (S10). */
export function kita(id: string): boolean {
  return flag(`flag_ch3_kita_${id}`) > 0;
}

/**
 * A story battle of chapter 3 (61 21.4) that ends only by winning: a loss is
 * 「戦う前から やりなおす」 again (evt_gameover), a loaded save stops the scene
 * ('load'). Skipped (as won) while the enemy isn't registered, and in QA with
 * __game.cmd.flag('flag_qa_c3_nobattle', 1).
 */
export function* c3Battle(o: BattleOpts): Co<'win' | 'load'> {
  if (!getEnemy(o.enemies[0]) || (import.meta.env.DEV && flag('flag_qa_c3_nobattle'))) return 'win';
  for (;;) {
    const r = yield* eventBattle(o);
    if (r === 'load') return 'load';
    if (r === 'win') return 'win';
    yield* game.fadeIn(400);
  }
}
