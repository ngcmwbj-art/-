// 星見台 (chapter 2) systems of the field (02_ch2 6.2 / 7章 world):
//
//   - the audio of the 星見台 maps (53 4.2): bgm_hoshi_night and its variant,
//     the beds per stage, the acoustic space, the PA shape ('yama') and
//     h_stage — on entering a map, on a stage change and on load; the
//     positional beds of map_hoshimidai every 10 frames (53 4.3), the PA
//     distance d (53 7.3) and the leaf rustle of amb_h_wind by area
//   - the 1.0 s village clock (53 17 #7): the fence power unit's LED, the
//     steps of ビリビリ番 and ambientEvent('amb_h_fence', 'pulse')
//   - the calls of the loudspeaker (evt_ch2_calls, 50 3.13 / 53 7.4): 45 /
//     30 / 15 s by stage, paused while a battle, an event or a menu has the
//     screen; the bubble at the top of the screen (world/hud.ts)
//   - stage looks (52 9章): the scarecrows turning to the hill, the one
//     security light flickering in h0, moths at the lights from h1, the
//     sounds that go with the fushigi's own clocks (53 8.9, 17 #8), マサルさん's
//     flashlight
//
// Everything here only runs on 星見台 maps (MapDef.chapter 2 / stageFlag
// 'flag_ch2_stage'); chapter 1 is untouched.

import { Task, type Co } from '../engine/co';
import { game } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { hash2, valueNoise } from '../engine/rng';
import { flag } from '../game/state';
import * as audio from '../audio';
import type { Actor } from './actor';
import * as snd from './audio';
import type { FieldScene, PropInst } from './field';
import { fushigiDone, onFushigiPressed } from './fushigi';
import { registerWorldFx } from './fx';
import { callBubble, clearCallBubble } from './hud';
import { condOk, isCh2Map, type LoadedMap } from './maps';
import { getScript } from './scripts';
import * as hoshiNpcText from '../data/text/hoshi_npcs';
import type { MapDef } from './types';

// ---------------------------------------------------------------- props see the chapter-2 state

declare module '../art/props/types' {
  interface PropEnv {
    /** 星見台's stage (flag_ch2_stage) on chapter-2 maps, −1 elsewhere. */
    hstage?: number;
    /** The tomato light this frame (world px centre and radius), or null. */
    lantern?: { x: number; y: number; r: number } | null;
    /** ms since the village clock's last tick (1.0 s): the fence LED is on while < 120. */
    pulse?: number;
    /** This scarecrow's facing: 0 front, 1 side, 2 back (to the hill, h2). */
    kakashi?: 0 | 1 | 2;
    /** The village's one security light is on (h0: it flickers, h1+: steady). */
    lampOn?: boolean;
    /** How visible this prop is in the dark (1 = fully; 52 8.5). */
    lit?: number;
    /** ms since the loudspeaker's last call began (52 9.2: the bell trembles 1px, the shrine light wavers; 11.3 the horn's mouth glows). */
    callAge?: number;
    /** The HUD's colon almost blinks this instant (h2, 80 ms every 7–11 s): the school clock's hand trembles with it (52 9.2). */
    colonDip?: boolean;
  }
  interface PropArt {
    /**
     * Moths circle this point (px from the anchor tile's top-left) from h1
     * on (fx_h_moth): lamps, the vending machine, lit windows.
     */
    moths?: { x: number; y: number; r?: number };
  }
}

/** Is the field on a 星見台 map? */
export function onHoshi(f: FieldScene | null): boolean {
  return !!f && isCh2Map(f.map.def);
}

/** 星見台's stage (0..3). */
export function hstage(): number {
  return flag('flag_ch2_stage');
}

// ---------------------------------------------------------------- audio (53 4.2 / 4.3 / 7.3)

interface HoshiAudio {
  variant?: string;
  space: string;
  /** Beds per stage (0..2). */
  amb: Record<number, string[]>;
  bgm: Record<number, string | null>;
}

const NIGHT = 'bgm_hoshi_night';
const OUT0 = ['amb_h_insects', 'amb_h_wind', 'amb_h_mizu', 'amb_h_tanada', 'amb_h_kusa', 'amb_h_fence', 'amb_h_barn_out'];

/** 53 4.2, used where the map data doesn't give bgm / amb / variant / space itself. */
const HOSHI_AUDIO: Record<string, HoshiAudio> = {
  map_hoshi_train: { space: 'room', amb: { 0: ['amb_h_train'], 1: ['amb_h_train'], 2: ['amb_h_train'] }, bgm: { 0: null, 1: null, 2: null } },
  map_hoshimidai: {
    variant: 'outdoor',
    space: 'yama',
    amb: {
      0: OUT0,
      1: [...OUT0, 'amb_h_yama', 'amb_h_boukatou', 'amb_h_tetsuya'],
      2: [...OUT0, 'amb_h_yama', 'amb_h_boukatou', 'amb_h_pa_hum'],
    },
    bgm: { 0: NIGHT, 1: NIGHT, 2: NIGHT },
  },
  map_hoshi_house: {
    variant: 'house',
    space: 'room',
    amb: { 0: ['amb_h_house', 'amb_h_tomato', 'amb_h_hachi'], 1: ['amb_h_house', 'amb_h_hachi'], 2: ['amb_h_house', 'amb_h_hachi'] },
    bgm: { 0: NIGHT, 1: NIGHT, 2: NIGHT },
  },
  map_hoshi_barn: { variant: 'barn', space: 'barn', amb: { 0: ['amb_h_barn'], 1: ['amb_h_barn'], 2: ['amb_h_barn'] }, bgm: { 0: NIGHT, 1: NIGHT, 2: NIGHT } },
  map_hoshi_school: {
    variant: 'school',
    space: 'room',
    amb: { 0: ['amb_h_school', 'amb_h_insects'], 1: ['amb_h_school', 'amb_h_insects'], 2: ['amb_h_school', 'amb_h_insects'] },
    bgm: { 0: NIGHT, 1: NIGHT, 2: NIGHT },
  },
  map_hoshi_hill: {
    variant: 'hill',
    space: 'yama',
    amb: { 0: ['amb_h_insects', 'amb_h_wind'], 1: ['amb_h_insects', 'amb_h_wind'], 2: ['amb_h_insects', 'amb_h_wind', 'amb_h_pa_hum'] },
    bgm: { 0: NIGHT, 1: NIGHT, 2: NIGHT },
  },
};

/** The map's beds for stage s (map data first, then 53 4.2). */
export function hoshiAmb(def: MapDef, s: number): string[] {
  let list = def.amb?.[s] ?? HOSHI_AUDIO[def.id]?.amb[s] ?? [];
  // the tomato's hum stops once it is picked (53 7.2)
  if (flag('flag_ch2_got_tomato')) list = list.filter((id) => id !== 'amb_h_tomato');
  // テツヤ's engine stops once he is beaten
  if (flag('flag_ch2_tetsuya_beaten')) list = list.filter((id) => id !== 'amb_h_tetsuya');
  return list;
}

/** The map's music for stage s: undefined = leave the music alone (the ending's cuts). */
export function hoshiBgm(def: MapDef, s: number): string | null | undefined {
  if (def.bgm && s in def.bgm) return def.bgm[s];
  return HOSHI_AUDIO[def.id]?.bgm[s];
}

export function hoshiVariant(def: MapDef): string | undefined {
  return def.variant ?? HOSHI_AUDIO[def.id]?.variant ?? (def.kind === 'outdoor' ? 'outdoor' : undefined);
}

export function hoshiSpace(def: MapDef): string {
  return def.space ?? HOSHI_AUDIO[def.id]?.space ?? (def.kind === 'indoor' ? 'room' : 'yama');
}

/** Beds whose level follows where Minato stands (started silent, then set). */
export function hoshiPositionalBeds(def: MapDef): string[] {
  switch (def.id) {
    case 'map_hoshimidai':
      return ['amb_h_insects', 'amb_h_mizu', 'amb_h_tanada', 'amb_h_kusa', 'amb_h_fence', 'amb_h_barn_out', 'amb_h_yama', 'amb_h_boukatou', 'amb_h_tetsuya', 'amb_h_pa_hum'];
    case 'map_hoshi_house':
      return ['amb_h_tomato', 'amb_h_hachi'];
    case 'map_hoshi_school':
      return ['amb_h_school'];
    default:
      return [];
  }
}

function call(name: string, ...args: unknown[]): void {
  const fn = (audio as unknown as Record<string, ((...a: unknown[]) => unknown) | undefined>)[name];
  if (typeof fn !== 'function') return;
  try {
    fn(...args);
  } catch (e) {
    if (import.meta.env.DEV) console.warn(`[world/hoshi] ${name} failed`, e);
  }
}

/** PA shape and h_stage for the map just entered / the stage just set (53 17 #5). */
export function applyHoshiParams(def: MapDef): void {
  if (isCh2Map(def)) {
    call('setPaMode', def.pa ?? 'yama');
    snd.setMusicParam('h_stage', flag('flag_ch2_stage'));
  } else {
    call('setPaMode', def.pa ?? 'town');
    snd.setMusicParam('h_stage', -1);
  }
}

/** Play bgm with the map's variant (same song: only the shape moves, 53 5.2). */
export function playHoshiBgm(id: string, def: MapDef, fade: number): void {
  const variant = hoshiVariant(def);
  audio.playBgm(id, { fade, resume: true, variant });
}

// ---- positional levels

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Distance (tiles) from (x, y) to a tile rect (0 inside). */
function distRect(x: number, y: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x < x0 ? x0 - x : x > x1 + 1 ? x - (x1 + 1) : 0;
  const dy = y < y0 ? y0 - y : y > y1 + 1 ? y - (y1 + 1) : 0;
  return Math.hypot(dx, dy);
}
const ramp = (d: number, full: number, zero: number) => clamp01(1 - (d - full) / Math.max(0.001, zero - full));

let paLast = -1;
let paIndoorLast = false;
let outdoorD = 0.7;
let windLast = '';

/** 53 4.3 / 7.3: bed levels, the PA distance and the leaf rustle, every 10 frames. */
export function hoshiPositional(f: FieldScene, playing: string[]): void {
  const m = f.map;
  const x = f.player.x / 16;
  const y = f.player.y / 16 - 0.5;
  const s = flag('flag_ch2_stage');
  const has = (id: string) => playing.includes(id);
  const set = (id: string, v: number, ramp_ = 0.3) => {
    if (has(id)) snd.setAmbientVol(id, clamp01(v), ramp_);
  };
  if (m.id === 'map_hoshimidai') {
    set('amb_h_insects', x >= 15 && x < 22 && y >= 40 && y < 44 ? 0.6 : 1);
    const dCanal = distRect(x, y, 13, 20, 59, 21);
    const dStream = distRect(x, y, 13, 0, 13, 39);
    set('amb_h_mizu', ramp(Math.min(dCanal, dStream), 1, 6));
    set('amb_h_tanada', ramp(distRect(x, y, 14, 1, 35, 19), 0, 4));
    let kusa = ramp(distRect(x, y, 37, 0, 59, 17), 0, 5);
    if (x < 36.5) kusa = Math.min(kusa, 0.3);
    set('amb_h_kusa', kusa);
    const dPow = Math.hypot(x - 47.5, y - 19.5);
    const dLine = Math.min(Math.abs(y - 18.5) + (x < 36 ? 36 - x : 0), Math.abs(x - 36.5) + (y > 19 ? y - 19 : 0));
    set('amb_h_fence', Math.max(ramp(dPow, 2, 8), 0.6 * ramp(dLine, 0, 3)));
    set('amb_h_barn_out', ramp(distRect(x, y, 50, 24, 59, 31), 2, 8));
    set('amb_h_yama', s >= 1 && s <= 2 ? clamp01((30 - y) / 18) : 0);
    set('amb_h_boukatou', s >= 1 && s <= 2 ? ramp(Math.hypot(x - 32.5, y - 37.5), 1, 5) : 0);
    const tet = f.actors.find((a) => a.kind === 'sym' && (a.data.sym as { kind?: string } | undefined)?.kind === 'tetsuya');
    set('amb_h_tetsuya', tet && s === 1 && !flag('flag_ch2_tetsuya_beaten') ? ramp(Math.hypot(x - tet.x / 16, y - tet.y / 16 + 0.5), 3, 18) : 0);
    set('amb_h_pa_hum', s === 2 ? (y <= 3 ? 1 : Math.max(0.25, 1 - ((y - 3) / 44) * 0.75)) : 0);
  } else if (m.id === 'map_hoshi_house') {
    set('amb_h_tomato', flag('flag_ch2_got_tomato') ? 0 : ramp(Math.hypot(x - 5.5, y - 2.5), 0, 8));
    set('amb_h_hachi', ramp(Math.hypot(x - 2.5, y - 2.5), 1, 3.5));
  } else if (m.id === 'map_hoshi_school') {
    set('amb_h_school', x < 11 && y >= 3 && y < 9 ? 1 : 0.3);
  }
  // the PA distance (53 7.3): 10 frames, only when it moves by 0.02+
  let d = outdoorD;
  let indoor = false;
  if (m.id === 'map_hoshimidai') d = outdoorD = 0.35 + 0.65 * clamp01(y / 47);
  else if (m.id === 'map_hoshi_hill') d = outdoorD = y <= 7 ? 0 : 0.2 * clamp01((y - 7) / 12);
  else if (m.def.kind === 'indoor') indoor = true;
  if (Math.abs(d - paLast) >= 0.02 || indoor !== paIndoorLast) {
    paLast = d;
    paIndoorLast = indoor;
    call('setPaDistance', d, indoor);
  }
  // the leaf rustle of the area (53 7.2)
  if (m.def.kind === 'outdoor' && playing.includes('amb_h_wind')) {
    const w = windZone(m, Math.floor(x), Math.floor(y));
    if (w !== windLast) {
      windLast = w;
      snd.ambientEvent('amb_h_wind', w);
    }
  }
}

/** Forget the last sent values (a new map: send them again). */
export function resetHoshiPositional(): void {
  paLast = -1;
  windLast = '';
}

const WIND_BY_AREA: Record<string, string> = {
  area_hoshi_tanada: 'ine',
  area_hoshi_houki: 'susuki',
  area_hoshi_yamaguchi: 'susuki',
};

/** The area (area_hoshi_*) at a tile: the narrowest zone holding it. */
export function zoneAt(m: LoadedMap, tx: number, ty: number): NonNullable<MapDef['zones']>[number] | null {
  let best: NonNullable<MapDef['zones']>[number] | null = null;
  let bestA = Infinity;
  for (const z of m.def.zones ?? []) {
    if (tx < z.x || ty < z.y || tx >= z.x + z.w || ty >= z.y + z.h) continue;
    const a = z.w * z.h;
    if (a < bestA) {
      best = z;
      bestA = a;
    }
  }
  return best;
}

function windZone(m: LoadedMap, tx: number, ty: number): string {
  if (m.id === 'map_hoshi_hill') return ty <= 7 ? 'hill' : 'sugi';
  const z = zoneAt(m, tx, ty);
  if (z?.wind) return z.wind;
  if (z && WIND_BY_AREA[z.id]) return WIND_BY_AREA[z.id];
  if (m.id === 'map_hoshimidai') {
    if (tx >= 14 && tx <= 35 && ty >= 1 && ty <= 19) return 'ine';
    if (tx >= 37 && ty <= 17) return 'susuki';
  }
  return 'none';
}

// ---------------------------------------------------------------- the village clock (1.0 s)

export const VILLAGE_TICK = 1000;
let clockAcc = 0;
let lastTickAt = 0;
let clockNow = 0;
const tickListeners: ((f: FieldScene) => void)[] = [];

/** Run `fn` on every tick of the 1.0 s village clock (53 17 #7). */
export function onVillageTick(fn: (f: FieldScene) => void): void {
  tickListeners.push(fn);
}

/** ms since the village clock's last tick. */
export function villagePulse(): number {
  return clockNow - lastTickAt;
}

function villageTick(f: FieldScene): void {
  lastTickAt = clockNow;
  if (f.map.id === 'map_hoshimidai') {
    // the power unit's click, placed by where the unit is on screen
    const pow = powerUnit(f);
    const pan = pow ? Math.max(-0.6, Math.min(0.6, ((pow[0] - (f.camX + 192)) / 192) * 0.6)) : 0;
    snd.ambientEvent('amb_h_fence', 'pulse', pan);
  }
  for (const fn of tickListeners) fn(f);
}

function powerUnit(f: FieldScene): [number, number] | null {
  const o = f.map.objects.find((o) => o.id === 'obj_hoshi_dengen');
  if (o) return [o.x * 16 + 8, o.y * 16 + 8];
  return f.map.id === 'map_hoshimidai' ? [47 * 16 + 8, 19 * 16 + 8] : null;
}

// ---------------------------------------------------------------- the calls (evt_ch2_calls)

/**
 * The names the loudspeaker calls, in order, over and over (50 3.2) and the
 * station's line of stage 2 — the scenario's text (data/text/hoshi_npcs)
 * when it gives them, so a renamed villager changes in one place.
 */
const TEXT = hoshiNpcText as unknown as { CALL_NAMES?: string[]; CALL_HEAD?: string };
export const CALL_NAMES: string[] = TEXT.CALL_NAMES?.length ? TEXT.CALL_NAMES : ['ナナミちゃん', 'ケンイチくん', 'ユウタくん', 'ミホちゃん', 'サトシくん', 'タクミくん', 'マユミさん', 'コウジさん'];
export const CALL_PREFACE: string = TEXT.CALL_HEAD ?? 'こちらは、防災 星見台です。';
/** Seconds between calls by stage (50 3.13). */
export const CALL_EVERY: Record<number, number> = { 0: 45000, 1: 30000, 2: 15000 };

export interface CallInfo {
  stage: number;
  /** The line this call would say by default. */
  line: string;
  /** Index into CALL_NAMES of the name (the preface lines of h2 keep the last one). */
  nameIndex: number;
  /** Heard indoors (no bubble; muffled). */
  indoor: boolean;
}

let callTimer = 0;
let callIdx = 1; // evt_ch2_arrive calls ナナミちゃん itself; the timer goes on from ケンイチくん
let callAlt = false;
let callTask: Task | null = null;
let callStage = -1;
let callHandler: ((c: CallInfo) => Co | null | void) | null = null;

/**
 * Events: take over what a call says / does. Return a coroutine to run
 * instead of the default (it runs beside the game: input is never stopped),
 * or null / nothing to let the default call play.
 */
export function setCallHandler(fn: ((c: CallInfo) => Co | null | void) | null): void {
  callHandler = fn;
}

/** Restart the count (e.g. right after a scripted call) and/or set the next name. */
export function resetCallTimer(nextName?: number): void {
  callTimer = 0;
  if (nextName !== undefined) callIdx = ((nextName % CALL_NAMES.length) + CALL_NAMES.length) % CALL_NAMES.length;
}

/** Is a call being made right now? */
export function callBusy(): boolean {
  return !!callTask && !callTask.done;
}

function callsActive(f: FieldScene): boolean {
  if (!onHoshi(f) || f.map.id === 'map_hoshi_train') return false;
  if (!flag('flag_ch2_arrived') || flag('flag_ch2_boss_beaten') || flag('flag_ch2_calls_off')) return false;
  return flag('flag_ch2_stage') <= 2;
}

/** Fire a call now (QA and events). */
export function callNow(f: FieldScene): void {
  callTimer = 0;
  startCall(f);
}

function startCall(f: FieldScene): void {
  const s = flag('flag_ch2_stage');
  const indoor = f.map.def.kind === 'indoor';
  let line: string;
  let nameIndex = callIdx;
  if (s >= 2 && callAlt) {
    line = CALL_PREFACE;
    nameIndex = (callIdx + CALL_NAMES.length - 1) % CALL_NAMES.length;
  } else {
    line = `……${CALL_NAMES[callIdx]}。`;
    callIdx = (callIdx + 1) % CALL_NAMES.length;
  }
  if (s >= 2) callAlt = !callAlt;
  const info: CallInfo = { stage: s, line, nameIndex, indoor };
  const hill = f.map.id === 'map_hoshi_hill' && f.player.y < 8 * 16;
  const def = () => playCall(line, { stage: s, indoor, hill });
  // an event's own handler, else the scenario's evt_ch2_calls (it says the
  // lines of 50 3.13 in its own order), else the default call. It runs
  // beside the game: the player keeps walking.
  const custom = callHandler?.(info);
  const scr = getScript('evt_ch2_calls');
  const co = custom ?? (scr ? scr({ source: 'calls', map: f.map.id, defaultText: line, runDefault: def }) : def());
  callTask = new Task(co);
  noteCall();
}

let lastCallAt = -1e9;
/** A call has just begun (the world's timer, or an event making one itself): props and the HUD follow it. */
export function noteCall(): void {
  lastCallAt = clockNow;
}
/** ms since the last call began (the fire-watch bell trembles, the shrine light wavers, 52 9.2). */
export function callAge(): number {
  return clockNow - lastCallAt;
}

/**
 * The default call (53 7.4): h0/h1 the mic opens (ブツッ), 0.35 s, the line is
 * typed into the bubble in the voice of the loudspeaker, 0.4 s, the mic
 * closes; h2 the line stays open (no clicks) and the echo swells three
 * times after it. BGM −4 dB, beds −2 dB while it speaks. Indoors there is
 * no bubble (only the muffled voice). Usable from events (yield*).
 */
export function* playCall(line: string, o: { stage?: number; indoor?: boolean; hill?: boolean } = {}): Co {
  const s = o.stage ?? flag('flag_ch2_stage');
  const open = s <= 1;
  const loud = !!o.hill;
  snd.duckMusic(loud ? 0.5 : 0.63, 3.2);
  call('duckAmbience', loud ? 0.63 : 0.79, 0.05, 3.0, 0.4);
  if (open) {
    snd.se('se_h_pa_open', { vol: o.indoor ? 0.35 : 1 });
    yield 350;
  }
  const bubble = !o.indoor;
  const typing = callBubble(line, { at: o.hill ? 'speaker' : 'top', show: bubble });
  yield () => typing.done;
  yield 400;
  if (open) snd.se('se_h_pa_close', { vol: o.indoor ? 0.35 : 1 });
  else call('paEcho', 0.6, 2.0);
  yield () => typing.gone;
}

function updateCalls(f: FieldScene, dt: number, ctrl: boolean): void {
  if (callTask && !callTask.done) callTask.step(dt);
  if (!callsActive(f)) {
    if (!onHoshi(f)) clearCallBubble();
    return;
  }
  const s = flag('flag_ch2_stage');
  if (s !== callStage) {
    // a new stage: the count starts over at its own interval
    callStage = s;
    callTimer = 0;
    callAlt = false;
  }
  // battles, events and menus stop the count (the field isn't updated
  // under a battle or a menu at all; events and talks lock the player)
  if (!ctrl || callBusy()) return;
  callTimer += dt;
  if (callTimer >= (CALL_EVERY[s] ?? 45000)) {
    callTimer = 0;
    startCall(f);
  }
}

/** QA: the timer's state. */
export function callState(): { timer: number; every: number; next: string; active: boolean } {
  const s = flag('flag_ch2_stage');
  return { timer: Math.round(callTimer), every: CALL_EVERY[s] ?? 45000, next: CALL_NAMES[callIdx], active: callStage >= 0 };
}

// ---------------------------------------------------------------- stage looks (52 9章)

/** Scarecrow turn (fx_h_kakashi_turn): 3 frames over 1.2 s, each one 0–6 frames late. */
let kakashiAnim: { t0: number; from: 0 | 2; to: 0 | 2 } | null = null;
const KAKASHI_MS = 1200;

/** Facing of a scarecrow with this instance seed: 0 front, 1 side, 2 back (to the hill). */
export function kakashiFrame(seed: number, t: number): 0 | 1 | 2 {
  const rest: 0 | 2 = flag('flag_ch2_stage') === 2 ? 2 : 0;
  const a = kakashiAnim;
  if (!a) return rest;
  const lag = Math.floor(seed * 7) * (1000 / 60);
  const p = (t - a.t0 - lag) / KAKASHI_MS;
  if (p < 0) return a.from;
  if (p >= 1) return a.to;
  const k = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
  return (a.from === 0 ? k : 2 - k) as 0 | 1 | 2;
}

/** Is this prop a scarecrow (prop_kakashi / obj_hoshi_kakashi*)? */
export function isKakashi(p: PropInst): boolean {
  const id = p.obj.t === 'prop' ? p.obj.prop : p.obj.prop ?? p.obj.id;
  return id === 'prop_kakashi' || id.startsWith('obj_hoshi_kakashi') || id.startsWith('prop_h_kakashi');
}

/**
 * Every scarecrow turns to the hill (h2) or back to its field (the morning):
 * 1.2 s, 0–6 frames apart, a se_h_kakashi_turn per scarecrow (the ones off
 * screen only faintly). The stage flag decides where they rest afterwards.
 */
export function turnScarecrows(f: FieldScene, to: 'hill' | 'field' = 'hill'): void {
  const toF: 0 | 2 = to === 'hill' ? 2 : 0;
  kakashiAnim = { t0: f.t, from: toF === 2 ? 0 : 2, to: toF };
  const list = f.props.filter((p) => p.present && isKakashi(p));
  const restored = f.actors.filter((a) => a.kind === 'restored' && a.data.enemy === 'enemy_henoheno_kacho');
  let far = 0;
  for (const p of list) {
    const x = p.x + 8;
    const y = p.y + 8;
    const lag = Math.floor(p.seed * 7) * (1000 / 60);
    const onScreen = x > f.camX - 8 && x < f.camX + 392 && y > f.camY - 8 && y < f.camY + 240;
    if (onScreen) later(lag + 380, () => snd.seAt('se_h_kakashi_turn', x, y));
    else if (far++ < 3) later(lag + 380 + far * 90, () => snd.se('se_h_kakashi_turn', { vol: 0.18, pitch: 0.94 + far * 0.03 }));
  }
  for (const a of restored) later(380, () => snd.seAt('se_h_kakashi_turn', a.x, a.y));
}

const timers: { at: number; fn: () => void }[] = [];
function later(ms: number, fn: () => void): void {
  timers.push({ at: clockNow + ms, fn });
}

/**
 * The security light (防犯灯 (32,37)): in h0 it is failing — on 80–400 ms,
 * off 1–3 s, irregular; from h1 it stays on (52 8.6).
 */
export function lampOn(t: number, seed = 0): boolean {
  if (flag('flag_ch2_stage') >= 1) return true;
  // cycles of 1.2–3.4 s, each with one flash (sometimes a second short one)
  const base = Math.floor(seed * 1000);
  let k = Math.floor(t / 2300);
  const within = t - k * 2300;
  k += base;
  const len = 80 + Math.floor(hash2(k, 1, 77) * 320);
  const at = Math.floor(hash2(k, 2, 77) * 900);
  if (within >= at && within < at + len) return true;
  if (hash2(k, 3, 77) < 0.35) {
    const at2 = at + len + 90 + Math.floor(hash2(k, 4, 77) * 120);
    if (within >= at2 && within < at2 + 60) return true;
  }
  return false;
}

// ---------------------------------------------------------------- fushigi clocks (53 8.9)

interface FClock {
  period: number | [number, number];
  play(x: number, y: number, f: FieldScene): void;
  /** Only within this many tiles (default: seAt's own reach). */
  near?: number;
}

/**
 * Period (ms) of each fushigi's visible loop. Prop art should key its
 * animation on env.t % period so sight and sound stay together:
 * 01 the notebook's page (turns at the start of each 6 s), 02 the timetable
 * (4 s: the digits flip to 4:59 and back), 04 the circular board (8 s:
 * slides out 4px, 0.4 s, back), 05 the paddy's evening glow (12 s: a
 * higurashi), 07 the breathing film (4 s), 09 the duty board (3 s: a name
 * written, then wiped).
 */
export const FUSHIGI_PERIOD: Record<string, number> = {
  fushigi_ch2_01: 6000,
  /** 07 the greenhouse film breathes: 1px out and back, a band of light running down it */
  fushigi_ch2_07: 4000,
  fushigi_ch2_02: 4000,
  fushigi_ch2_04: 8000,
  fushigi_ch2_05: 12000,
  fushigi_ch2_09: 3000,
};

const FCLOCKS: Record<string, FClock> = {
  fushigi_ch2_01: { period: 6000, play: (x, y) => snd.seAt('se_page', x, y, { vol: 0.35 }) },
  fushigi_ch2_02: {
    period: 4000,
    play: (x, y) => {
      snd.seAt('se_clock_flip', x, y, { vol: 0.25, pitch: 1.3 });
      later(130, () => snd.seAt('se_clock_flip', x, y, { vol: 0.25, pitch: 1.3 }));
    },
  },
  fushigi_ch2_04: { period: 8000, play: (x, y) => snd.seAt('se_h_kairan', x, y) },
  fushigi_ch2_05: {
    period: 12000,
    near: 6,
    play: (x, y, f) => {
      const pan = Math.max(-0.5, Math.min(0.5, ((x - (f.camX + 192)) / 192) * 0.5));
      snd.se('se_higurashi_call', { vol: 0.25, pan });
      void y;
    },
  },
  fushigi_ch2_09: {
    period: 3000,
    play: (x, y) => {
      for (let i = 0; i < 3; i++) later(i * 120, () => snd.seAt('se_h_chalk', x, y, { vol: 0.8 }));
      later(1700, () => snd.seAt('se_h_chalk_erase', x, y, { vol: 0.8 }));
    },
  },
  fushigi_ch2_10: {
    period: [10000, 16000],
    play: (x, y) => {
      snd.seAt('se_h_pa_open', x, y, { vol: 0.3 });
      // "あー、あー" from the little speaker, cut short
      later(260, () => audio.textBlip('broadcast', 'あ'));
      later(560, () => audio.textBlip('broadcast', 'あ'));
    },
  },
};
const fclockNext = new Map<string, number>();

function updateFushigiClocks(f: FieldScene): void {
  for (const o of f.map.objects) {
    if (o.t !== 'obj' || !o.fushigi) continue;
    const c = FCLOCKS[o.fushigi];
    if (!c || fushigiDone(o.fushigi) || !condOk(o.cond)) continue;
    const x = (o.x + (o.w ?? 1) / 2) * 16;
    const y = (o.y + (o.h ?? 1) / 2) * 16;
    const key = f.map.id + ':' + o.fushigi;
    let next = fclockNext.get(key);
    const per = typeof c.period === 'number' ? c.period : c.period[0] + Math.random() * (c.period[1] - c.period[0]);
    if (next === undefined) {
      next = typeof c.period === 'number' ? (Math.floor(f.t / c.period) + 1) * c.period : f.t + per;
      fclockNext.set(key, next);
    }
    if (f.t < next) continue;
    fclockNext.set(key, typeof c.period === 'number' ? (Math.floor(f.t / c.period) + 1) * c.period : f.t + per);
    if (c.near !== undefined && Math.hypot(f.player.x - x, f.player.y - y) / 16 > c.near) continue;
    // in the dark, a fushigi is heard even where it isn't seen (53 4.3)
    c.play(x, y, f);
  }
}

// barn / house fushigi beds (53 7.2): sent on entering and when pressed
function fushigiBeds(f: FieldScene): void {
  if (f.map.id === 'map_hoshi_barn' && flag('flag_ch2_stage') >= 1) snd.ambientEvent('amb_h_barn', fushigiDone('fushigi_ch2_08') ? 'sync_off' : 'sync_on', 0.2);
  if (f.map.id === 'map_hoshi_house' && fushigiDone('fushigi_ch2_07')) snd.ambientEvent('amb_h_house', 'calm');
}
onFushigiPressed((id) => {
  if (id === 'fushigi_ch2_07') {
    snd.ambientEvent('amb_h_house', 'deep_breath');
    later(2600, () => snd.ambientEvent('amb_h_house', 'calm'));
  }
  if (id === 'fushigi_ch2_08') snd.ambientEvent('amb_h_barn', 'sync_off', 0.2);
});

// ---------------------------------------------------------------- the rooms' own light (52 4.1 / 4.3)

/** The night train (and its QA copy, hoshi_debug.ts). */
const TRAIN_MAPS = new Set(['map_hoshi_train', 'map_hoshi_qa_train']);

interface RoomLights {
  map: string;
  on: boolean;
  t0: number;
  ms: number;
}
let roomLights: RoomLights | null = null;

/**
 * The barn's tubes at 5:00 (52 4.3 カット2a): `on` sweeps the room's light
 * on from the west end, six tubes 0.08 s apart (each one a frame too bright
 * as it catches); `off` holds the room dark whatever the stage. null gives
 * the room back to its stage (lit from h3). For the current map.
 */
export function setRoomLights(f: FieldScene, on: boolean | null, sweepMs = 480): void {
  roomLights = on === null ? null : { map: f.map.id, on, t0: f.t, ms: Math.max(1, sweepMs) };
}

/** 0..1 how far the room's lights are on (null: by the stage). */
export function roomLit(mapId: string): number | null {
  const r = roomLights;
  if (!r || r.map !== mapId) return null;
  if (!r.on) return 0;
  const f = currentField;
  if (!f) return 1;
  return Math.min(1, (f.t - r.t0) / r.ms);
}

let currentField: FieldScene | null = null;

/**
 * Light-map extras of the rooms, painted over the base (source-over): the
 * tubes sweeping on (the lit part of the room in `litCol`, each new tube's
 * strip white for one frame), and in the night train the starlight through
 * the north windows — 24px parallelograms of #7FD1E8 α10% running from
 * right to left over the seats and the floor at 90px/s, one every 1.4 s
 * (the train goes east, the light outside goes west: fx_h_train_window).
 */
export function paintRoomLight(f: FieldScene, lx: CanvasRenderingContext2D, cx: number, cy: number, litCol: string): void {
  currentField = f;
  const r = roomLights;
  if (r && r.map === f.map.id && r.on) {
    const k = Math.min(1, (f.t - r.t0) / r.ms);
    if (k < 1) {
      const n = 6;
      const lit = Math.floor(k * n + 1e-6);
      const segW = (f.map.w * 16) / n;
      lx.save();
      lx.globalCompositeOperation = 'source-over';
      lx.fillStyle = litCol;
      lx.fillRect(-cx, -cy, Math.round(segW * lit), f.map.h * 16);
      // the tube that has just caught: one frame too bright
      const fresh = k * n - lit < 0.035 * n && lit > 0;
      if (fresh) {
        lx.fillStyle = '#FFFFFF';
        lx.fillRect(Math.round(segW * (lit - 1)) - cx, -cy, Math.round(segW), f.map.h * 16);
      }
      lx.restore();
    }
  }
  if (TRAIN_MAPS.has(f.map.id) && flag('flag_ch2_stage') <= 2) {
    // inside the car: rows 2–5, x 1–15 (the driver's cab has its own dials)
    const x0 = 16 - cx;
    const x1 = 16 * 16 - cx;
    const y0 = 2 * 16 - cy;
    const y1 = 6 * 16 - cy;
    const period = 1400;
    const speed = 90 / 1000;
    const span = speed * period;
    lx.save();
    lx.beginPath();
    lx.rect(x0, y0, x1 - x0, y1 - y0);
    lx.clip();
    lx.globalCompositeOperation = 'source-over';
    lx.fillStyle = 'rgba(127,209,232,0.10)';
    const phase = (f.t * speed) % span;
    for (let bx = x1 + 24 - phase; bx > x0 - 80; bx -= span) {
      // leaning: the light falls from the north windows to the south
      for (let y = y0; y < y1; y += 2) {
        const lean = Math.round((y - y0) * 0.5);
        lx.fillRect(Math.round(bx - lean), y, 24, 2);
      }
    }
    lx.restore();
  }
}

// ---------------------------------------------------------------- per-frame

let enteredMap: LoadedMap | null = null;

/** Called by the field every frame (ctrl: the player has control). */
export function hoshiUpdate(f: FieldScene, dt: number, ctrl: boolean): void {
  clockNow += dt;
  for (let i = timers.length - 1; i >= 0; i--)
    if (timers[i].at <= clockNow) {
      const t = timers[i];
      timers.splice(i, 1);
      t.fn();
    }
  // the turn holds where it ended until the stage agrees (a scene may turn
  // them a moment before it sets flag_ch2_stage), or it is long over
  if (kakashiAnim && f.t - kakashiAnim.t0 > KAKASHI_MS + 200) {
    const rest = flag('flag_ch2_stage') === 2 ? 2 : 0;
    if (rest === kakashiAnim.to || f.t - kakashiAnim.t0 > 60000 || f.t < kakashiAnim.t0) kakashiAnim = null;
  }
  if (f.map !== enteredMap) {
    enteredMap = f.map;
    if (onHoshi(f)) fushigiBeds(f);
  }
  updateCalls(f, dt, ctrl);
  if (!onHoshi(f)) return;
  clockAcc += dt;
  while (clockAcc >= VILLAGE_TICK) {
    clockAcc -= VILLAGE_TICK;
    villageTick(f);
  }
  updateFushigiClocks(f);
  // the night train: the straps swing west every 5 s, and 0.3 s later the
  // car itself sways — it swings before the bend (52 4.1)
  if (TRAIN_MAPS.has(f.map.id) && !flag('flag_ch2_arrived')) {
    const ph = f.t % 5000;
    if (ph >= 300 && ph - dt < 300) game.shake(1, 160);
  }
  // the restored ヘノヘノ課長 turns with the scarecrows
  for (const a of f.actors) {
    if (a.kind !== 'restored' || a.data.enemy !== 'enemy_henoheno_kacho') continue;
    const fr = kakashiFrame(((a.x * 7 + a.y * 13) % 97) / 97, f.t);
    a.dir = fr === 0 ? 'down' : fr === 1 ? 'right' : 'up';
  }
}

// ---------------------------------------------------------------- マサルさん's flashlight (52 3.4 / 8.6)

/** マサルさん shaking his flat flashlight on the terrace (h0–h1, until evt_ch2_gen_stop). */
export function genFlash(f: FieldScene): Actor | null {
  if (f.map.id !== 'map_hoshimidai' || flag('flag_ch2_met_gen') || flag('flag_ch2_stage') > 1) return null;
  const g = f.actors.find((a) => a.id === 'npc_hoshi_gen');
  if (!g || !g.visible) return null;
  return villagePulse() < 50 ? g : null;
}
onVillageTick((f) => {
  if (f.map.id !== 'map_hoshimidai' || flag('flag_ch2_met_gen') || flag('flag_ch2_stage') > 1) return;
  const g = f.actors.find((a) => a.id === 'npc_hoshi_gen');
  if (g) snd.seAt('se_h_kaichu', g.x, g.y, { vol: 0.7 });
});

// ---------------------------------------------------------------- moths (fx_h_moth)

interface MothSpot {
  x: number;
  y: number;
  r: number;
  n: number;
  seed: number;
}

/** The props moths gather at when they don't say so themselves (PropArt.moths). */
const MOTH_AT: Record<string, { x: number; y: number }> = {
  obj_hoshi_jihanki: { x: 8, y: -12 },
  prop_h_boukatou: { x: 6, y: -30 },
  prop_h_platform_lamp: { x: 4, y: -38 },
};

function mothSpots(f: FieldScene): MothSpot[] {
  const out: MothSpot[] = [];
  const l = f.light.lantern;
  if (l) out.push({ x: l.x, y: l.y - 2, r: 14, n: 3, seed: 1 });
  for (const p of f.props) {
    if (!p.present) continue;
    const id = p.obj.t === 'prop' ? p.obj.prop : p.obj.prop ?? p.obj.id;
    let at = p.art.moths ?? MOTH_AT[id];
    // the one security light: a utility pole's lamp (52 3.7)
    if (!at && id === 'prop_utility_pole' && p.obj.opts?.lamp !== false && f.map.id === 'map_hoshimidai' && p.obj.x === 32 && p.obj.y === 37) at = { x: -1, y: -33 };
    if (!at) continue;
    if (f.light.alphaOf(p) < 0.5) continue;
    out.push({ x: p.x + at.x, y: p.y + at.y, r: (at as { r?: number }).r ?? 13, n: 2 + (p.seed > 0.5 ? 1 : 0), seed: p.seed * 100 });
  }
  return out;
}

registerWorldFx({
  map: '',
  draw(f, g: Gfx, cx, cy, layer) {
    if (layer !== 'glow' || !onHoshi(f)) return;
    const s = flag('flag_ch2_stage');
    if (s < 1 || s > 2) return;
    const t = f.t / 1000;
    for (const sp of mothSpots(f)) {
      if (sp.x - cx < -24 || sp.x - cx > 408 || sp.y - cy < -24 || sp.y - cy > 240) continue;
      for (let i = 0; i < sp.n; i++) {
        const ph = sp.seed * 3.1 + i * 2.39;
        // 1.2 turns a second, not steady: a wobble of speed and of radius
        const th = 2 * Math.PI * 1.2 * t * (0.85 + 0.3 * valueNoise(t * 0.7, i, sp.seed | 0)) + ph;
        const r = sp.r - 3 + 8 * valueNoise(t * 1.3 + i * 5, sp.seed, 9);
        const x = Math.round(sp.x + Math.cos(th) * r - cx);
        const y = Math.round(sp.y + Math.sin(th) * r * 0.55 + Math.sin(t * 7 + i) * 1.5 - cy);
        const flap = Math.floor(f.t / 70 + i) % 2 === 0;
        g.rect(x, y, flap ? 2 : 1, 1, '#E8D9B5', 0.9);
        if (!flap) g.rect(x + 1, y - 1, 1, 1, '#C8A06A', 0.6);
      }
    }
  },
});

