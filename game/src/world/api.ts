// Script API for the scenario team (NPC talk, examine, triggers, cutscenes).
//
//   import { registerScript, actor, walk, face, emote, msg, setStage } from '../world/api';
//
//   registerScript('evt_errand', function* (ctx) {
//     face('npc_mother', 'player');
//     yield* emote('npc_mother', 'exclaim');
//     yield* msg(`@npc_mother
//   あ、起きた。{w=300}
//   おつかい 行ってきて。`);
//     giveItem('item_otsukai_memo');
//   });
//
// Scripts run on game.scripts while the player is locked. Coordinates are
// tiles unless a name says px. Every waiting function is a coroutine (yield*).

import type { Co } from '../engine/co';
import { all } from '../engine/co';
import { game } from '../engine/game';
import { animate, ease, tween } from '../engine/tween';
import { H, W } from '../engine/screen';
import { addItem, flag, removeItem, setFlag, state, type Dir } from '../game/state';
import type { EmoteKind } from '../art/chars';
import { Actor, DIR_VEC } from './actor';
import * as snd from './audio';
import { field, type FieldScene } from './field';
import { runMsg } from './msg';
import { initNpc } from './npc';
import { defeatSymbol as defeatSym } from './symbols';
import { hud } from './hud';
import type { NpcMove } from './types';

export { registerScript, hasScript } from './scripts';
export type { ScriptCtx, ScriptFn } from './scripts';
export { say, choose, ask } from '../ui/dialog';
export { flag, setFlag } from '../game/state';
export { registerMap, hasMap } from './maps';
export { registerFushigi, runFushigi, fushigiDone, fushigiActive, fushigiCount } from './fushigi';
export { runMsg } from './msg';
export { setFieldHud } from './hud';
export { registerWorldFx } from './fx';
export { trainPass } from './places';

// ---------------------------------------------------------------- access

/** The active field scene (throws when the field is not running). */
export function world(): FieldScene {
  const f = field();
  if (!f) throw new Error('field scene is not active');
  return f;
}

/**
 * Actor by id: 'player' (ミナト), 'kanenari' (the follower), NPC ids
 * ('npc_mother'), symbol ids ('sym_town_01'), restored objects ('restored:sym_town_02').
 */
export function actor(id: string): Actor | null {
  return field()?.actorById(id) ?? null;
}

function need(id: string): Actor {
  const a = actor(id);
  if (!a) throw new Error(`actor not found: ${id}`);
  return a;
}

/** Tile position of an actor. */
export function tileOf(id: string): [number, number] {
  const a = need(id);
  return [a.tileX, a.tileY];
}

// ---------------------------------------------------------------- movement

type Step = [number, number] | Dir | `${Dir}${number}`;

/**
 * Walk along a tile path. Accepts absolute tiles ([x,y]) and relative steps
 * ('up', 'left3'). Speed in tiles/s (default 4.5 player, 2.5 others).
 */
export function* walk(id: string, path: Step[] | Step, opts: { speed?: number; face?: Dir; lockFace?: boolean } = {}): Co {
  const a = need(id);
  const steps = Array.isArray(path) && typeof path[0] !== 'number' ? (path as Step[]) : [path as Step];
  let cx = a.x;
  let cy = a.y;
  const pts: [number, number][] = [];
  for (const s of steps) {
    if (Array.isArray(s)) {
      cx = s[0] * 16 + 8;
      cy = s[1] * 16 + 16;
      pts.push([cx, cy]);
    } else {
      const m = /^(up|down|left|right)(\d*)$/.exec(s);
      if (!m) continue;
      const n = m[2] ? parseInt(m[2], 10) : 1;
      const [dx, dy] = DIR_VEC[m[1] as Dir];
      cx += dx * 16 * n;
      cy += dy * 16 * n;
      pts.push([cx, cy]);
    }
  }
  a.pathSpeed = (opts.speed ?? (a.kind === 'player' ? 4.5 : 2.5)) * 16;
  a.faceLock = !!opts.lockFace;
  a.data.scripted = true;
  a.path.push(...pts);
  yield () => a.path.length === 0;
  a.moving = false;
  a.faceLock = false;
  if (opts.face) a.dir = opts.face;
  if (a.kind !== 'player') {
    a.data.home = [a.x, a.y];
  }
}

/** Walk to pixel coordinates (feet). */
export function* walkPx(id: string, x: number, y: number, speed = 2.5): Co {
  const a = need(id);
  a.pathSpeed = speed * 16;
  a.data.scripted = true;
  a.path.push([x, y]);
  yield () => a.path.length === 0;
  a.moving = false;
}

/** Stop scripted control of an NPC (resume its idle behaviour). */
export function release(id: string): void {
  const a = actor(id);
  if (a) delete a.data.scripted;
}

/** Face a direction, the player, or another actor. */
export function face(id: string, to: Dir | string): void {
  const a = need(id);
  if (to === 'up' || to === 'down' || to === 'left' || to === 'right') {
    a.dir = to;
    return;
  }
  const b = need(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}

/** Teleport an actor to a tile. */
export function place(id: string, x: number, y: number, dir?: Dir): void {
  const a = need(id);
  a.x = x * 16 + 8;
  a.y = y * 16 + 16;
  a.path = [];
  if (dir) a.dir = dir;
  if (a.kind === 'player') {
    const f = world();
    f.trail = [];
    f.syncFollower(true);
  }
}

/** Emote balloon over an actor (exclaim, question, dots, note, sweat, anger, heart, zzz, light). */
export function* emote(id: string, kind: EmoteKind, opts: { wait?: boolean; dur?: number; se?: boolean } = {}): Co {
  const a = need(id);
  const dur = opts.dur ?? 1100;
  a.showEmote(kind, dur);
  if (opts.se !== false) {
    const s = kind === 'question' ? 'se_emote_question' : kind === 'sweat' ? 'se_emote_sweat' : kind === 'light' ? 'se_emote_light' : 'se_emote';
    snd.se(s);
  }
  if (opts.wait !== false) yield Math.min(dur, 700);
}

/** Little jump (h px, ms). */
export function* jump(id: string, opts: { h?: number; ms?: number } = {}): Co {
  const a = need(id);
  a.hop(opts.h ?? 6, opts.ms ?? 260);
  yield opts.ms ?? 260;
}

/** Hold a pose (extra name, e.g. 'look_up', 'surprised', 'sit'); null clears. */
export function pose(id: string, name: string | null): void {
  const a = need(id);
  a.tempPose = name;
}

/** Play a named sprite animation (anims of the CharSprite). */
export function* anim(id: string, name: string, opts: { loop?: boolean; wait?: boolean } = {}): Co {
  const a = need(id);
  a.playAnim(name, !!opts.loop);
  if (opts.wait && !opts.loop) yield () => a.animDone();
}

export function stopAnim(id: string): void {
  const a = actor(id);
  if (a) a.anim = null;
}

/** Show / hide an actor. */
export function show(id: string, on: boolean): void {
  const a = actor(id);
  if (a) a.visible = on;
}

/** Spawn a scripted NPC (not in the map data). */
export function spawn(id: string, x: number, y: number, opts: { sprite?: string; dir?: Dir; move?: NpcMove; ghost?: boolean; pose?: string } = {}): Actor {
  const f = world();
  const a = new Actor(id, 'npc', opts.sprite ?? id, x * 16 + 8, y * 16 + 16);
  a.dir = opts.dir ?? 'down';
  a.solid = !opts.ghost;
  initNpc(a, { t: 'npc', id, x, y, dir: a.dir, move: opts.move, pose: opts.pose });
  f.addActor(a);
  return a;
}

export function despawn(id: string): void {
  const f = field();
  const a = f?.actorById(id);
  if (f && a && a.kind !== 'player') f.removeActor(a);
}

/** Swap an actor's sprite (e.g. ハト → ハト係長). */
export function setSprite(id: string, sprite: string): void {
  need(id).setSprite(sprite);
}

// ---------------------------------------------------------------- camera

/** Pan the camera so tile (x,y) is centred. */
export function* cameraPan(x: number, y: number, ms = 800): Co {
  const f = world();
  const from = { x: f.camX + W / 2, y: f.camY + H / 2 };
  f.camOverride = { ...from };
  const to = { x: x * 16 + 8, y: y * 16 + 8 };
  yield* animate(
    ms,
    (p) => {
      f.camOverride = { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p };
      const mw = f.map.w * 16;
      const mh = f.map.h * 16;
      f.camX = Math.max(0, Math.min(mw - W, f.camOverride.x - W / 2));
      f.camY = Math.max(0, Math.min(mh - H, f.camOverride.y - H / 2));
    },
    ease.sineInOut,
  );
}

/** Return the camera to the player (or the follow target). */
export function* cameraBack(ms = 600): Co {
  const f = world();
  if (!f.camOverride) return;
  const fromX = f.camX;
  const fromY = f.camY;
  const [tx, ty] = f.followTarget();
  yield* animate(
    ms,
    (p) => {
      f.camX = fromX + (tx - fromX) * p;
      f.camY = fromY + (ty - fromY) * p;
    },
    ease.sineInOut,
  );
  f.camOverride = null;
}

/** Make the camera follow another actor (null = player). */
export function cameraFollow(id: string | null): void {
  const f = world();
  f.camFollow = id ? need(id) : null;
}

// ---------------------------------------------------------------- control

/** Lock / unlock player control (counts nested locks). Scripts are locked automatically. */
export function lockPlayer(on: boolean): void {
  const f = world();
  if (on) f.lock();
  else f.unlock();
}

/** Warp to a map (fade + optional SE). */
export function* warp(map: string, x: number, y: number, dir: Dir = 'down', opts: { se?: string | string[] } = {}): Co {
  const f = world();
  yield* f.warpCo(map, x, y, dir, opts.se, f.map.id);
}

/** Current stage (0/1/2, 3 = night). */
export function stage(): number {
  return flag('flag_stage');
}

/**
 * Change the town stage: grading tween (0→1 0.6s, 1→2 1.5s, 2→night 3s by
 * default), NPC/prop presence, music param. With `music` true also switches
 * the map BGM/ambience to the new stage's.
 */
export function setStage(n: number, opts: { ms?: number; music?: boolean } = {}): void {
  const f = field();
  if (f) {
    f.setStage(n, opts.ms);
    if (opts.music) f.applyAudio(false);
  } else setFlag('flag_stage', n);
}

/** HUD clock (flag_clock 0..4 = 16:52 16:55 16:58 17:00 17:01). */
export function setClock(n: number, se = true): void {
  setFlag('flag_clock', n);
  hud.setTime(null);
  hud.show();
  if (se) snd.se('se_clock_flip');
}

/** Temporarily show an arbitrary time on the HUD plate ('16:59'); null restores. */
export function setClockText(s: string | null, se = true): void {
  hud.setTime(s);
  if (se && s) snd.se('se_clock_flip');
}

// ---------------------------------------------------------------- 17:00 / stage effects

/** Everyone on screen looks up at the sky (fx_look_up, 0–4 frame stagger). */
export function* lookUpAll(on: boolean, stagger = true): Co {
  const f = world();
  const list = f.actors.filter((a) => (a.kind === 'npc' || a.kind === 'restored') && onScreen(f, a));
  list.push(f.player);
  if (f.follower) list.push(f.follower);
  for (const a of list) {
    a.tempPose = on ? 'look_up' : null;
    a.data.scripted = on ? true : undefined;
    if (!on) delete a.data.scripted;
    if (stagger) yield Math.floor(Math.random() * 5) * 16;
  }
}

function onScreen(f: FieldScene, a: Actor): boolean {
  return a.x > f.camX - 16 && a.x < f.camX + W + 16 && a.y > f.camY - 8 && a.y < f.camY + H + 32;
}

/**
 * The 17:00 screen wave (fx_chime_wave): horizontal sine offset per row,
 * amplitude `amp` px easing out over `ms`.
 */
export function* chimeWave(amp = 3, ms = 800): Co {
  const f = world();
  f.wave.t = 0;
  yield* animate(ms, (p) => (f.wave.amp = amp * (1 - ease.quadOut(p))));
  f.wave.amp = 0;
  f.wave.t = 0;
}

/**
 * Convenience for evt_chime_stop's visual beat: wave + 0.6 s colour shift to
 * stage 1 (sound, NPC look-up and text stay in the scenario script).
 */
export function* chimeMoment(): Co {
  yield* all(chimeWave(3, 800), (function* () {
    setStage(1, { ms: 600 });
    yield 600;
  })());
}

/** Rotate every shadow towards the mall over 1.2s (fx_shadow_swing), part of the 1→2 switch. */
export function* shadowSwing(): Co {
  snd.se('se_shadow_swing');
  setStage(2, { ms: 1500 });
  yield 1500;
}

// ---------------------------------------------------------------- items, money, party

export function giveItem(id: string): boolean {
  return addItem(id);
}
export function takeItem(id: string): boolean {
  return removeItem(id);
}
export function addMoney(n: number): void {
  state.money = Math.max(0, state.money + n);
}
/** Full HP (and optionally 朱肉) for the whole party. */
export function healParty(mp = false): void {
  for (const m of state.party) {
    m.hp = m.maxHp;
    if (mp) m.mp = m.maxMp;
  }
}

/** Show or hide the follower (Kanenari) while flag_kanenari_joined is set. */
export function setFollowerVisible(on: boolean): void {
  setFlag('flag_follower_hidden', on ? 0 : 1);
  field()?.syncFollower(true);
}

/** Refresh the follower after flag_kanenari_joined changed (placed behind the player). */
export function refreshFollower(): void {
  field()?.syncFollower(true);
}

/** Mark a symbol encounter as won (never respawns, leaves its restored object). */
export function defeatSymbol(symId: string): void {
  const f = field();
  if (f) defeatSym(f, symId);
  else state.taken[symId] = true;
}

// ---------------------------------------------------------------- screen fx, sound

export function* fadeOut(ms = 300, color = '#1B1733'): Co {
  yield* game.fadeOut(ms, color);
}
export function* fadeIn(ms = 300): Co {
  yield* game.fadeIn(ms);
}
export function shake(amp = 3, ms = 250): void {
  game.shake(amp, ms);
}
export function flash(color = '#FFF6D8', ms = 120, alpha = 1): void {
  game.flash(color, ms, alpha);
}
export function se(id: string, opts?: { pitch?: number; pan?: number; vol?: number }): void {
  snd.se(id, opts);
}
export function bgm(id: string | null, fade = 0.6): void {
  snd.bgm(id, fade);
}
export function stopBgm(fade = 0.5): void {
  snd.stopBgm(fade);
}
export function amb(id: string, opts?: { vol?: number; fade?: number; lp?: number }): void {
  snd.playAmbient(id, opts);
}
export function stopAmb(id: string, fade?: number): void {
  snd.stopAmbient(id, fade);
}
/** Restore the current map's stage music and ambience. */
export function mapAudio(): void {
  field()?.applyAudio(false);
}

export function* wait(ms: number): Co {
  yield ms;
}

/** Run a text block in the 10_narrative msg format. Returns the last choice index. */
export function* msg(text: string): Co<number> {
  return yield* runMsg(text);
}

/** Tween any numeric props (re-export for cutscenes). */
export { tween, animate, ease };
