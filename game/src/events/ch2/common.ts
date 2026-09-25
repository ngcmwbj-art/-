// Shared helpers of the chapter-2 scripts: the ch2 stage (flag_ch2_stage),
// the talk keys h0_1 … (50 3.0), the village's name tags, event battles with
// the chapter-2 wipe-out pages (50 10.17), and small staging utilities.

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, setFlag, state, type Dir } from '../../game/state';
import { startBattle, type BattleOpts } from '../../battle/api';
import { field, type FieldScene } from '../../world/field';
import { SPEAKERS, runMsg } from '../../world/msg';
import { hasMap } from '../../world/maps';
import { registerWorldFx } from '../../world/fx';
import type { Actor } from '../../world/actor';
import { runGameOver } from '../../ui/gameover';
import { continueGame } from '../../ui/flow';
import { sfx } from '../../audio';
import { HOSHI_SPEAKERS } from '../../data/text/hoshi_npcs';
import { GAMEOVER_FLIP_BOSS, GAMEOVER_FLIP_TETSUYA } from '../../data/text/hoshi_events';
import { grace } from '../lib';

// ---------------------------------------------------------------- name tags (50 2.4)

// the village's tags and voices join the msg runner's table (world/msg.ts);
// ours win (the name tags changed on 2026-09-25, the ids did not)
for (const [id, s] of Object.entries(HOSHI_SPEAKERS)) SPEAKERS[id] = { ...s };

// ---------------------------------------------------------------- maps and stage

export const HOSHI_MAPS = ['map_hoshi_train', 'map_hoshimidai', 'map_hoshi_house', 'map_hoshi_barn', 'map_hoshi_school', 'map_hoshi_hill'];

export function isHoshi(mapId: string | null | undefined): boolean {
  return !!mapId && mapId.startsWith('map_hoshi');
}
export function onHoshi(): boolean {
  return isHoshi(field()?.map.id);
}
export function mapId(): string {
  return field()?.map.id ?? '';
}

/** The chapter-2 stage: 0 よなか, 1 ともしび, 2 よびごえ, 3 あさ. */
export function hStage(): number {
  return flag('flag_ch2_stage');
}

/** Does the lantern shine (the tomato is in the net)? */
export function lanternOn(): boolean {
  return flag('flag_ch2_got_tomato') > 0 && flag('flag_ch2_boss_beaten') === 0;
}

/** A map is there to warp to / cut to (the level team adds them as they go). */
export function mapReady(id: string): boolean {
  return hasMap(id);
}

// ---------------------------------------------------------------- talk keys (50 3.0)

/**
 * The key to say at the current chapter-2 stage. Numbered keys hN_1, hN_2 …
 * count the talks at that stage (flag_seen_<npc>_hN), the last one repeats;
 * a plain hN key is said every time; a stage with no keys falls back to the
 * one before it (「空欄の段階は、直前の段階の台詞のまま」). The key said is
 * recorded as flag_seen_<npc>_<key>.
 */
export function pickH(npcId: string, table: Record<string, string>, stage = hStage()): string | null {
  for (let s = Math.min(stage, 3); s >= 0; s--) {
    const numbered: string[] = [];
    for (let n = 1; n <= 9; n++) if (table[`h${s}_${n}`] !== undefined) numbered.push(`h${s}_${n}`);
    if (numbered.length) {
      const cf = `flag_seen_${npcId}_h${s}`;
      const count = flag(cf);
      const key = numbered[Math.min(count, numbered.length - 1)];
      setFlag(cf, count + 1);
      setFlag(`flag_seen_${npcId}_${key}`, 1);
      return key;
    }
    if (table[`h${s}`] !== undefined) {
      setFlag(`flag_seen_${npcId}_h${s}`, flag(`flag_seen_${npcId}_h${s}`) + 1);
      return `h${s}`;
    }
  }
  return null;
}

/**
 * The entry of a record keyed by chapter-2 stage: 'h0', 'h1+', 'h0-1', with
 * 'text' / 'default' as the fallback (the closest earlier stage first).
 */
export function pickHText(v: string | Record<string, string> | undefined, stage = hStage()): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === 'string') return v;
  const match = (k: string, s: number): boolean => {
    const m = /^h(\d)(?:(\+)|-(\d))?$/.exec(k);
    if (!m) return false;
    const lo = +m[1];
    const hi = m[2] ? 9 : m[3] !== undefined ? +m[3] : lo;
    return s >= lo && s <= hi;
  };
  for (let s = stage; s >= 0; s--) for (const k of Object.keys(v)) if (match(k, s)) return v[k];
  return v.text ?? v.default;
}

// ---------------------------------------------------------------- talking

/** Run a msg block (ignores empty ones). */
export function* say(text: string | undefined | null): Co<number> {
  if (!text) return -1;
  return yield* runMsg(text);
}

export type Cues = Record<string, (arg?: string) => Co | void>;

/**
 * Run a msg block with `!cue <name> [arg]` lines (data/text/hoshi_events):
 * the pages before a cue are shown, then the cue runs (a coroutine is
 * waited for), then the block goes on with the same speaker. Returns the
 * last choice made (−1 if none). A cue without a handler is skipped.
 */
export function* runCue(src: string, cues: Cues = {}): Co<number> {
  let speaker = '';
  let chunk: string[] = [];
  let last = -1;
  function* flush(): Co {
    const body = chunk.filter((l) => l.trim() && !l.trim().startsWith('>'));
    chunk = [];
    if (!body.length) return;
    const text = (body[0].trim().startsWith('@') || !speaker ? '' : speaker + '\n') + body.join('\n');
    const r = yield* runMsg(text);
    if (r >= 0) last = r;
  }
  for (const line of src.split('\n')) {
    const t = line.trim();
    const m = /^!cue\s+(\S+)(?:\s+(.*))?$/.exec(t);
    if (m) {
      yield* flush();
      const r = cues[m[1]]?.(m[2]);
      if (r) yield* r;
      continue;
    }
    if (t.startsWith('@')) speaker = t;
    chunk.push(line);
  }
  yield* flush();
  return last;
}

/** An NPC's current actor on the field. */
export function npc(id: string): Actor | null {
  return field()?.actorById(id) ?? null;
}

/** Keep an NPC still for a scene (its idle wander stops) — and let it go again. */
export function hold(id: string, on = true): Actor | null {
  const a = npc(id);
  if (!a) return null;
  if (on) a.data.scripted = true;
  else delete a.data.scripted;
  return a;
}

/** Turn an actor (tile directions). */
export function turn(a: Actor | null | undefined, dir: Dir): void {
  if (a) a.dir = dir;
}

/** Does the actor's sprite have this pose / anim (the char team adds the chapter-2 extras as they go)? */
export function hasPose(a: Actor | null | undefined, name: string): boolean {
  if (!a) return false;
  const s = a.sprite;
  return !!(s.extra?.[name] || s.extraDir?.[name] || s.anims?.[name]);
}

/** Hold a pose if the sprite has it (null clears); returns whether it was shown. */
export function poseIf(a: Actor | null | undefined, name: string | null): boolean {
  if (!a) return false;
  if (name === null) {
    a.tempPose = null;
    return true;
  }
  if (!hasPose(a, name)) return false;
  if (a.sprite.anims?.[name]) a.playAnim(name, false);
  else a.tempPose = name;
  return true;
}

/** Play a one-off anim if the sprite has it and wait for it (else just wait `ms`). */
export function* animIf(a: Actor | null | undefined, name: string, ms: number): Co {
  if (a && a.sprite.anims?.[name]) {
    a.playAnim(name, false);
    const t0 = performance.now();
    yield () => a.animDone() || performance.now() - t0 > ms + 400;
    return;
  }
  if (a && hasPose(a, name)) a.tempPose = name;
  yield ms;
}

/** Clear a scene's poses and anims on these actors. */
export function unpose(...as: (Actor | null | undefined)[]): void {
  for (const a of as) {
    if (!a) continue;
    a.tempPose = null;
    a.anim = null;
  }
}

// ---------------------------------------------------------------- routes

/**
 * A 4-way tile route (breadth first over walkable tiles, other characters
 * ignored) from (sx, sy) to (tx, ty); the start is not included. Straight
 * runs are merged into their end points (fewer path points, same walk).
 */
export function routeTiles(sx: number, sy: number, tx: number, ty: number, avoid: [number, number][] = []): [number, number][] | null {
  const f = field();
  if (!f) return null;
  const W = f.map.w;
  const H = f.map.h;
  const idx = (x: number, y: number) => y * W + x;
  const blocked = new Set(avoid.map(([x, y]) => idx(x, y)));
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && f.free(f.player, x * 16 + 8, y * 16 + 16, true);
  const prev = new Map<number, number>([[idx(sx, sy), -1]]);
  const q: number[] = [idx(sx, sy)];
  while (q.length) {
    const c = q.shift()!;
    const x = c % W;
    const y = (c / W) | 0;
    if (x === tx && y === ty) {
      const pts: [number, number][] = [];
      for (let k = c; k !== idx(sx, sy); k = prev.get(k)!) pts.unshift([k % W, (k / W) | 0]);
      // keep only the corners
      const out: [number, number][] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = i === 0 ? [sx, sy] : pts[i - 1];
        const b = pts[i];
        const n = pts[i + 1];
        if (!n || n[0] - b[0] !== b[0] - a[0] || n[1] - b[1] !== b[1] - a[1]) out.push(b);
      }
      return out;
    }
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      const n = idx(nx, ny);
      if (prev.has(n) || blocked.has(n)) continue;
      if (!(nx === tx && ny === ty) && !free(nx, ny)) continue;
      prev.set(n, c);
      q.push(n);
    }
  }
  return null;
}

// ---------------------------------------------------------------- battles (50 10.17)

export type Ch2BattleResult = 'win' | 'retry' | 'load';

/**
 * A story battle of chapter 2 that can be lost: 'win'; 'retry' (「戦う前から
 * やりなおす」: HP full, 朱肉 back to the start; the caller replays its event,
 * after the chapter-2 flip on the second wipe-out of テツヤ / ヨビモドシ);
 * 'load' (the save was loaded, the caller stops).
 */
export function* storyBattle(o: BattleOpts, kind: 'sune' | 'tetsuya' | 'boss'): Co<Ch2BattleResult> {
  const mp0 = new Map(state.party.map((m) => [m.id, m.mp] as const));
  const r = yield* startBattle({ ...o, canLose: true });
  if (r === 'win') {
    grace();
    return 'win';
  }
  if (r === 'flee') return 'retry';
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  // (the chapter-1 boss's retry memo is about the five-o'clock chime: not here)
  const choice = yield* runGameOver({ boss: false });
  if (choice === 'load') {
    const ok = yield* continueGame();
    if (ok) return 'load';
  }
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = Math.min(m.maxMp, mp0.get(m.id) ?? m.mp);
    m.status = {};
  }
  if (flag('flag_lost_count') >= 2 && (kind === 'tetsuya' || kind === 'boss')) {
    game.fadeAlpha = 1;
    sfx('se_flip');
    yield* runMsg(kind === 'boss' ? GAMEOVER_FLIP_BOSS : GAMEOVER_FLIP_TETSUYA);
  }
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  return 'retry';
}

// ---------------------------------------------------------------- once per map load

/** Every map load builds a new ground cache: its identity tells one load from the next. */
let loadMark: unknown = null;
const ranKeys = new Set<string>();

function syncLoadMark(f: FieldScene): void {
  if (f.ground !== loadMark) {
    loadMark = f.ground;
    ranKeys.clear();
  }
}
registerWorldFx({
  map: '',
  update(f) {
    syncLoadMark(f);
  },
});

/** true the first time `key` is asked for during this load of the map (an onEnter hook listed twice runs once). */
export function firstThisLoad(key: string): boolean {
  const f = field();
  if (!f) return true;
  syncLoadMark(f);
  if (ranKeys.has(key)) return false;
  ranKeys.add(key);
  return true;
}
