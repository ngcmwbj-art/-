// Adapters to the other teams' chapter-2 APIs (02_ch2_index 6章). They are
// called by the ids and signatures of the design books; while a function is
// not there yet (the teams work in parallel) the call does nothing, or a
// plain fallback of our own stands in, so the story always runs through.

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import * as audio from '../../audio';
import * as battleData from '../../data/battle';
import * as battleResults from '../../battle/results';
import * as uiApi from '../../ui/api';
import * as uiFlow from '../../ui/flow';
import * as uiHud from '../../ui/hud';
import * as worldApi from '../../world/api';
import * as worldMaps from '../../world/maps';
import * as worldAudio from '../../world/audio';
import type { LevelUpResult } from '../../data/battle';
import { playHankoLearnField } from '../../battle/learn';
import { loopTable, sfxTable, type SfxOpts } from '../../audio/registry';

type AnyFn = (...args: unknown[]) => unknown;

/** A function exported by `mod` under `name`, if there is one. */
export function fnOf(mod: unknown, name: string): AnyFn | undefined {
  const f = (mod as Record<string, unknown>)[name];
  return typeof f === 'function' ? (f as AnyFn) : undefined;
}

function call(mod: unknown, name: string, ...args: unknown[]): unknown {
  const f = fnOf(mod, name);
  if (!f) return undefined;
  try {
    return f(...args);
  } catch (e) {
    if (import.meta.env.DEV) console.warn(`[events/ch2] ${name} failed`, e);
    return undefined;
  }
}

/** Is `v` a coroutine (a generator object)? */
function isCo(v: unknown): v is Co {
  return !!v && typeof (v as { next?: unknown }).next === 'function' && typeof (v as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function';
}

/** Wait for whatever a call returned: a coroutine, a promise, or nothing. */
export function* awaitResult(r: unknown): Co {
  if (isCo(r)) {
    yield* r;
    return;
  }
  if (r && typeof (r as Promise<unknown>).then === 'function') {
    let done = false;
    (r as Promise<unknown>).then(
      () => (done = true),
      () => (done = true),
    );
    yield () => done;
  }
}

// ---------------------------------------------------------------- sound (53 13章)

/** Sound ids the chapter-2 scripts asked for that no one has registered (QA: __game.cmd.ch2sounds()). */
export const missingSounds = new Set<string>();

/** Is this SFX registered (the audio team adds them as they go)? */
export function hasSfx(id: string): boolean {
  return sfxTable.has(id);
}

/** A sound effect of the cue sheet (53 12章): silent — and noted for QA — while it is not registered. */
export function se(id: string, opts?: SfxOpts): void {
  if (!sfxTable.has(id)) {
    missingSounds.add(id);
    return;
  }
  audio.sfx(id, opts);
}

/** A sound effect at a place of the field (world px; the world pans and fades it by distance). */
export function seAt(id: string, x: number, y: number, opts: { pitch?: number; vol?: number; level?: number } = {}): void {
  if (!sfxTable.has(id)) {
    missingSounds.add(id);
    return;
  }
  worldAudio.seAt(id, x, y, opts);
}

/** A looping sound: a do-nothing handle while it is not registered. */
export function seLoop(id: string, opts?: SfxOpts): { set(p: Record<string, number>): void; stop(fade?: number): void } {
  if (!loopTable.has(id)) {
    missingSounds.add(id);
    return { set() {}, stop() {} };
  }
  const h = audio.sfxLoop(id, opts);
  return {
    set: (p) => {
      for (const [k, v] of Object.entries(p)) h.set(k, v);
    },
    stop: (fade = 0.2) => h.stop(fade),
  };
}

export function au(name: string, ...args: unknown[]): unknown {
  return call(audio, name, ...args);
}
export const hasAudio = (name: string): boolean => !!fnOf(audio, name);

/** setMusicParam('h_stage' | 'h_light' | 'tenko' | 'h_rest' | 'boss_phase' ...). */
export function musicParam(name: string, v: number): void {
  au('setMusicParam', name, v);
}
export function paMode(mode: 'town' | 'yama'): void {
  au('setPaMode', mode);
}
export function paDistance(d: number, indoor = false): void {
  au('setPaDistance', d, indoor);
}
/** The bus_pa echo swell (53 7.4 stage 2, evt_ch2_yobigoe's three returns). */
export function paEcho(amount = 0.6, hold = 2.0): void {
  au('paEcho', amount, hold);
}
export function space(id: string): void {
  au('setSpace', id);
}
export function ambEvent(id: string, name: string, pan?: number): void {
  au('ambientEvent', id, name, pan);
}
export function ambVol(id: string, v: number, ramp?: number): void {
  au('setAmbientVol', id, v, ramp);
}
export function muteMusic(seconds: number): void {
  au('muteMusic', seconds);
}

/** A looping SFX handle (a do-nothing one when the loop is not registered). */
export function sfxLoop(id: string, opts?: Record<string, unknown>): { set(p: Record<string, number>): void; stop(fade?: number): void } {
  const h = au('sfxLoop', id, opts) as { set?: AnyFn; stop?: AnyFn } | undefined;
  return {
    set: (p) => void h?.set?.(p),
    stop: (fade = 0.2) => void h?.stop?.(fade),
  };
}

/**
 * 星見台の朝のチャイム (53 1.4): A5 F5 D5 C5 D5 F5, 0.55 s apart, the last
 * one held. `onNote(i)` fires on each note (the ending brightens on 0).
 * Without playMorningChime the recipe se_h_morning_chime is played and the
 * notes are timed here.
 */
export function* morningChime(onNote: (i: number) => void): Co {
  const f = fnOf(audio, 'playMorningChime');
  if (f) {
    let r: unknown;
    try {
      r = f({ onNote });
    } catch {
      r = undefined;
    }
    if (r) {
      yield* awaitResult(r);
      return;
    }
  }
  audio.sfx('se_h_morning_chime');
  for (let i = 0; i < 6; i++) {
    onNote(i);
    yield 550;
  }
  yield 2500;
}

// ---------------------------------------------------------------- battle data (51 3章, 18.2)

/** 51 3.1 chapter2Adjust(): the level-ups for the report card. */
export function chapter2Adjust(): LevelUpResult[] {
  const r = call(battleData, 'chapter2Adjust');
  return Array.isArray(r) ? (r as LevelUpResult[]) : [];
}
export function newChapter2Party(): boolean {
  if (!fnOf(battleData, 'newChapter2Party')) return false;
  call(battleData, 'newChapter2Party');
  return true;
}

/** The report card outside battle, headed 「なつやすみの つうちひょう」 where the card supports a title. */
export function* reportCard(results: LevelUpResult[], title: string): Co {
  if (!results.length) return;
  const f = fnOf(battleResults, 'playLevelUpField');
  if (!f) return;
  yield* awaitResult(f(results, { title, heading: title }));
}

/**
 * 20 18.5 playHankoLearn(id) in the field: the case rises, opens, the new
 * hanko settles in its frame, and the two @sys pages (「ハンコケースに 新しい
 * ハンコが 浮かびあがった。」「〜が 使えるように なった！」) run under it.
 * Returns false when the skill is not defined yet (the caller shows the pages).
 */
export function* hankoLearn(id: string): Co<boolean> {
  if (!battleData.getSkill(id)) return false;
  yield* playHankoLearnField(id);
  return true;
}

// ---------------------------------------------------------------- UI (02 6.1, 52 12〜13章)

export function ui(name: string, ...args: unknown[]): unknown {
  for (const mod of [uiApi, uiFlow, uiHud] as unknown[]) if (fnOf(mod, name)) return call(mod, name, ...args);
  return undefined;
}
export const hasUi = (name: string): boolean => [uiApi, uiFlow, uiHud].some((m) => !!fnOf(m, name));

/** Run a UI coroutine by name if it exists; false when there is none. */
export function* uiCo(name: string, ...args: unknown[]): Co<boolean> {
  if (!hasUi(name)) return false;
  yield* awaitResult(ui(name, ...args));
  return true;
}

/** Wait until no modal widget / pushed scene is up (a UI cut that returns before closing). */
export function* settleUi(maxMs = 20000): Co {
  const t0 = performance.now();
  yield () => !game.ui.modal || performance.now() - t0 > maxMs;
}

// ---------------------------------------------------------------- world (02 6.2〜6.3)

export function world(name: string, ...args: unknown[]): unknown {
  for (const mod of [worldApi, worldMaps] as unknown[]) if (fnOf(mod, name)) return call(mod, name, ...args);
  return undefined;
}
export const hasWorld = (name: string): boolean => [worldApi, worldMaps].some((m) => !!fnOf(m, name));
