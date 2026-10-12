// The sound of chapter 3's maps (63_ch3_audio 4.2–4.3, 7.3, 14.3): which song
// (and its form), which beds, the acoustic space and the PA voicing a map
// takes at each chapter-3 stage, the music params read back from the flags
// (12:00 / 12:01, the three 「まだ」 undone, あぜ道市), the positional beds of
// 海ぞいの町 by area, and the noon siren's distance (the tower's foot is d 0).
//
// It also covers 夕鳴町 before noon on 9月1日 (ch3Hirumae: S01–S04 run on
// chapter 1's maps): their stage-0 songs in the 'hirumae' form, ヒグラシ
// swapped for ツクツクボウシ (amb_c3_hirumae — the evening insect never sings
// at noon, 1.2), the TV on in ひのや.
//
// field.ts hands its applyAudio over to applyC3Audio on these maps, and the
// renderer its positional pass to c3Positional. Chapter 1 and 2 are untouched.

import * as audio from '../audio';
import { flag } from '../game/state';
import * as snd from './audio';
import type { FieldScene } from './field';
import { isCh2Map, isCh3Map } from './maps';
import type { MapDef } from './types';
import { ch3Hirumae } from './umizoi';

interface C3Audio {
  space: string;
  pa: 'town' | 'umi' | 'kannai';
  /** Song per chapter-3 stage (undefined: leave the music alone — an event runs it). */
  bgm: Partial<Record<number, string | null>>;
  variant?: string | ((s: number) => string | undefined);
  amb: Partial<Record<number, string[]>>;
  /** Beds heard through a wall or a window: their level and low-pass. */
  ambVol?: Record<string, { vol: number; lp?: number }>;
  /** 1 海ぞいの町, 2 旧水族館 (63 6.7). */
  phase: 1 | 2;
}

const UMI = 'bgm_umi_noon';
/** The town's beds outdoors (4.3): 12:00 and 12:01. */
const OUT_1200 = ['amb_c3_umi', 'amb_c3_semi', 'amb_c3_tori', 'amb_c3_siren_hold', 'amb_c3_minato', 'amb_c3_ichiba_out', 'amb_c3_shokudo_out', 'amb_c3_himono', 'amb_c3_siren_hum', 'amb_c3_bouhatei', 'amb_c3_kaisui', 'amb_c3_mikan'];
const OUT_1201 = ['amb_c3_umi', 'amb_c3_semi', 'amb_c3_tori', 'amb_c3_minato', 'amb_c3_ichiba_out', 'amb_c3_himono', 'amb_c3_bouhatei', 'amb_c3_kaisui', 'amb_c3_mikan'];

/** 63 4.2 (海ぞいの町 and its rooms; the old aquarium follows with the third period). */
const C3_AUDIO: Record<string, C3Audio> = {
  map_umizoi: {
    space: 'minato',
    pa: 'umi',
    bgm: { 1: UMI, 2: UMI },
    variant: 'outdoor',
    amb: { 1: OUT_1200, 2: OUT_1201, 3: OUT_1201 },
    phase: 1,
  },
  map_c3_nidai: {
    space: 'outdoor',
    pa: 'town',
    bgm: { 0: 'bgm_tsugaobin', 2: 'bgm_tsugaobin', 4: 'bgm_tsugaobin' },
    variant: (s) => (s === 2 ? 'wana' : s >= 4 ? 'kaeri' : 'iki'),
    amb: { 0: ['amb_c3_keitora'], 1: ['amb_c3_keitora'], 2: ['amb_c3_keitora'], 4: ['amb_c3_keitora'] },
    phase: 1,
  },
  map_c3_ichiba: {
    space: 'room',
    pa: 'umi',
    bgm: { 1: UMI, 2: UMI },
    variant: 'ichiba',
    amb: { 1: ['amb_c3_ichiba', 'amb_c3_siren_hold'], 2: ['amb_c3_ichiba'] },
    phase: 1,
  },
  map_c3_shokudo: {
    space: 'room',
    pa: 'umi',
    // 12:01: the noren is down — the little radio plays the lunch on the breakwater (63 4.2)
    bgm: { 1: UMI, 2: 'bgm_hirugohan' },
    variant: 'shokudo',
    amb: { 1: ['amb_c3_shokudo', 'amb_c3_siren_hold'], 2: ['amb_c3_shokudo'] },
    phase: 1,
  },
  map_c3_siren: {
    space: 'room',
    pa: 'umi',
    // no song up the tower: the wind and the siren's machine (4.2)
    bgm: { 1: null, 2: null },
    amb: { 1: ['amb_c3_siren_room', 'amb_c3_siren_hold', 'amb_c3_umi', 'amb_c3_tori'], 2: ['amb_c3_siren_room', 'amb_c3_umi', 'amb_c3_tori'] },
    ambVol: { amb_c3_umi: { vol: 0.5, lp: 1500 }, amb_c3_tori: { vol: 0.5, lp: 1500 } },
    phase: 1,
  },
  map_c3_toudai: {
    space: 'room',
    pa: 'umi',
    bgm: { 1: UMI, 2: UMI },
    variant: 'toudai',
    amb: { 1: ['amb_c3_toudai', 'amb_c3_umi', 'amb_c3_siren_hold'], 2: ['amb_c3_toudai', 'amb_c3_umi'] },
    ambVol: { amb_c3_umi: { vol: 0.4, lp: 1200 } },
    phase: 1,
  },
  map_c3_uminoie: {
    space: 'room',
    pa: 'umi',
    bgm: { 1: UMI, 2: UMI },
    variant: 'uminoie',
    amb: { 1: ['amb_c3_uminoie', 'amb_c3_umi', 'amb_c3_kaisui', 'amb_c3_siren_hold'], 2: ['amb_c3_uminoie', 'amb_c3_umi', 'amb_c3_kaisui'] },
    ambVol: { amb_c3_umi: { vol: 0.6, lp: 2500 }, amb_c3_kaisui: { vol: 0.5, lp: 2500 } },
    phase: 1,
  },
  // 海の中 (グソっ君's dive, S09): the song's underwater form, the sea's own bed, setUnderwater(1) (3.5)
  map_c3_umi: {
    space: 'minato',
    pa: 'umi',
    bgm: { 1: UMI, 2: UMI },
    variant: 'suichu',
    amb: { 1: ['amb_c3_suichu'], 2: ['amb_c3_suichu'] },
    phase: 1,
  },
};

/** Does chapter 3 decide this map's sound now? */
export function isC3AudioMap(def: MapDef | undefined | null): boolean {
  if (!def) return false;
  if (isCh3Map(def)) return true;
  return !isCh2Map(def) && ch3Hirumae();
}

/** The chapter-3 stage a map hears (夕鳴町 before noon: 0). */
function stageOf(def: MapDef): number {
  return isCh3Map(def) ? flag('flag_ch3_stage') : 0;
}

/** あぜ道市's step from the number who came (63 6.3). */
function ichiStep(n: number): number {
  return n <= 0 ? 0 : n <= 6 ? 1 : n <= 12 ? 2 : 3;
}

/** The music params read back from the flags (on entering, on a stage change, on load: 14.3). */
export function applyC3Params(def: MapDef): void {
  snd.setMusicParam('c3_noon', flag('flag_ch3_clock') >= 1 ? 1 : 0);
  snd.setMusicParam('c3_ichiba', flag('flag_ch3_ichiba_done') ? 1 : 0);
  snd.setMusicParam('c3_shokudo', flag('flag_ch3_shokudo_done') ? 1 : 0);
  snd.setMusicParam('c3_umi', flag('flag_ch3_umi_done') ? 1 : 0);
  snd.setMusicParam('c3_ichi', ichiStep(flag('flag_ch3_kita_n')));
  snd.setMusicParam('c3_phase', isCh3Map(def) ? C3_AUDIO[def.id]?.phase ?? (def.id.startsWith('map_c3_aq') ? 2 : 1) : 0);
}

/** Leaving chapter 3's maps: the battle songs' forms go back (c3_phase 0); the rest are kept. */
export function leaveC3Audio(): void {
  snd.setMusicParam('c3_phase', 0);
  callAudio('setUnderwater', 0);
}

/** 夕鳴町 before noon: the map's stage-0 sound, in the 'hirumae' light. */
function hirumaeOf(def: MapDef): { bgm: string | null | undefined; variant?: string; amb: string[]; ambVol: Record<string, { vol: number; lp?: number }>; space: string } {
  const bgm = def.bgm?.[0];
  const amb = (def.amb?.[0] ?? []).map((id) => (id === 'amb_higurashi' ? 'amb_c3_hirumae' : id));
  const ambVol: Record<string, { vol: number; lp?: number }> = {};
  // the house's upstairs hears 夕鳴町 through its window (as ヒグラシ in chapter 1)
  if (def.id === 'map_home_2f') ambVol.amb_c3_hirumae = { vol: 0.4, lp: 2500 };
  // ひのや: the small TV with 海ぞいの町 on it (63 4.2, 12.2)
  if (def.id === 'map_hinoya' && !amb.includes('amb_tv')) {
    amb.push('amb_tv');
    ambVol.amb_tv = { vol: 0.5 };
  }
  // (the house downstairs: the TV is on in S01 — the event sets its level)
  return {
    bgm,
    variant: bgm === 'bgm_home' || bgm === 'bgm_town_s0' ? 'hirumae' : undefined,
    amb,
    ambVol,
    space: def.space ?? (def.kind === 'indoor' ? 'room' : 'outdoor'),
  };
}

/** The map's song, its form, its beds and the space for the current stage. */
function planOf(def: MapDef): { bgm: string | null | undefined; variant?: string; amb: string[]; ambVol: Record<string, { vol: number; lp?: number }>; space: string; pa: 'town' | 'umi' | 'kannai' } {
  if (!isCh3Map(def)) return { ...hirumaeOf(def), pa: 'town' };
  const s = stageOf(def);
  const t = C3_AUDIO[def.id];
  if (!t) {
    // a chapter-3 map this table does not know yet: the map's own data
    return { bgm: def.bgm?.[s], variant: def.variant, amb: def.amb?.[s] ?? [], ambVol: def.ambVol ?? {}, space: def.space ?? (def.kind === 'indoor' ? 'room' : 'minato'), pa: def.id.startsWith('map_c3_aq') ? 'kannai' : 'umi' };
  }
  const variant = typeof t.variant === 'function' ? t.variant(s) : t.variant;
  return { bgm: t.bgm[s], variant, amb: t.amb[s] ?? def.amb?.[s] ?? [], ambVol: { ...(def.ambVol ?? {}), ...(t.ambVol ?? {}) }, space: t.space, pa: t.pa };
}

/** Beds whose level follows where しゅん stands. */
export function c3PositionalBeds(def: MapDef): string[] {
  if (def.id !== 'map_umizoi') return [];
  return ['amb_c3_minato', 'amb_c3_ichiba_out', 'amb_c3_shokudo_out', 'amb_c3_himono', 'amb_c3_siren_hum', 'amb_c3_bouhatei', 'amb_c3_kaisui', 'amb_c3_mikan'];
}

/**
 * field.ts applyAudio for these maps (4.2): space, PA voicing, params, the
 * song in the map's form (the same song only changes its form), the beds.
 */
export function applyC3Audio(f: FieldScene, entering: boolean, music = true): void {
  const def = f.map.def;
  const plan = planOf(def);
  snd.setSpace(plan.space);
  callAudio('setPaMode', plan.pa);
  // under the sea the music is under water too (63 3.5); anywhere else it is not
  callAudio('setUnderwater', def.id === 'map_c3_umi' ? 1 : 0);
  if (!isCh3Map(def)) snd.setMusicParam('stage', 0);
  applyC3Params(def);
  if (music && plan.bgm !== undefined && !flag('flag_bgm_hold')) {
    if (plan.bgm) audio.playBgm(plan.bgm, { fade: entering ? 0.6 : 1.0, resume: true, variant: plan.variant });
    else snd.bgm(null, entering ? 0.6 : 1.0);
  }
  const amb = plan.amb;
  f.renderer.ambient = amb;
  const playing = snd.activeAmbients();
  if (entering) {
    const keep = new Set<string>(amb);
    if (playing) {
      for (const id of playing) if (!keep.has(id)) snd.stopAmbient(id, 0.3);
    } else snd.stopAllAmbient(0.3);
  } else if (playing) {
    // a stage change: the beds the new stage has not (12:01: the siren's hold, the tower's hum)
    for (const id of playing) if (id.startsWith('amb_c3_') && !amb.includes(id)) snd.stopAmbient(id, 0.8);
  }
  const positional = c3PositionalBeds(def);
  for (const id of amb) {
    const on = playing?.includes(id) ?? false;
    const opts: { vol?: number; fade?: number; lp?: number } = { fade: 0.6 };
    const wall = plan.ambVol[id];
    if (wall) {
      opts.vol = wall.vol;
      opts.lp = wall.lp ?? 20000;
    } else if (positional.includes(id)) {
      if (on) delete opts.vol;
      else opts.vol = 0;
    } else if (entering && on) {
      opts.vol = 1;
      opts.lp = 20000;
    }
    snd.playAmbient(id, opts);
  }
  paLast = -1;
  c3Positional(f, amb);
}

function callAudio(name: string, ...args: unknown[]): void {
  const fn = (audio as unknown as Record<string, ((...a: unknown[]) => unknown) | undefined>)[name];
  if (typeof fn !== 'function') return;
  try {
    fn(...args);
  } catch (e) {
    if (import.meta.env.DEV) console.warn(`[world/c3audio] ${name} failed`, e);
  }
}

// ---- positional levels (4.3) and the siren's distance (7.3)

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ramp = (d: number, full: number, zero: number) => clamp01(1 - (d - full) / Math.max(0.001, zero - full));
/** Distance (tiles) from (x, y) to the nearest zone of that id (0 inside; Infinity when the map has none). */
function distZone(def: MapDef, id: string, x: number, y: number): number {
  let best = Infinity;
  for (const z of def.zones ?? []) {
    if (z.id !== id) continue;
    const dx = x < z.x ? z.x - x : x > z.x + z.w ? x - (z.x + z.w) : 0;
    const dy = y < z.y ? z.y - y : y > z.y + z.h ? y - (z.y + z.h) : 0;
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

/** The siren tower's foot (62 1.10: (33–36, 7)) — the origin of the siren's distance. */
const TOWER: [number, number] = [34.5, 7.5];
let paLast = -1;
let paIndoorLast = false;
let outdoorD = 0.3;

/** Every 10 frames on these maps (the renderer's positional pass). */
export function c3Positional(f: FieldScene, playing: string[]): void {
  const def = f.map.def;
  if (!isCh3Map(def)) return;
  const x = f.player.x / 16;
  const y = f.player.y / 16 - 0.5;
  const has = (id: string) => playing.includes(id);
  const set = (id: string, v: number, r = 0.3) => {
    if (has(id)) snd.setAmbientVol(id, clamp01(v), r);
  };
  if (def.id === 'map_umizoi') {
    const dz = (id: string) => distZone(def, id, x, y);
    // the alleys away from the sea hear less of it (0.5); the aquarium's front 0.7
    const inAlley = dz('area_c3_himono') === 0;
    const nearAq = dz('area_c3_suizokukan') === 0;
    set('amb_c3_umi', inAlley ? 0.5 : nearAq ? 0.7 : 1);
    // no trees on the breakwater's end or the beach: fewer cicadas
    set('amb_c3_semi', dz('area_c3_bouhatei') === 0 || dz('area_c3_kaisui') === 0 ? 0.4 : 1);
    const port = dz('area_c3_minato');
    set('amb_c3_tori', port === 0 || dz('area_c3_bouhatei') === 0 ? 1 : dz('area_c3_ichiba_mae') === 0 ? 0.6 : inAlley ? 0.3 : 0.6);
    set('amb_c3_minato', ramp(port, 3, 12));
    set('amb_c3_ichiba_out', ramp(dz('area_c3_ichiba_mae'), 2, 10));
    set('amb_c3_shokudo_out', ramp(dz('area_c3_shokudo_mae'), 0, 6));
    set('amb_c3_himono', ramp(dz('area_c3_himono'), 0, 4));
    set('amb_c3_siren_hum', ramp(Math.hypot(x - TOWER[0], y - TOWER[1]), 1, 10));
    set('amb_c3_bouhatei', ramp(dz('area_c3_bouhatei'), 0, 6));
    set('amb_c3_kaisui', ramp(dz('area_c3_kaisui'), 0, 8));
    set('amb_c3_mikan', ramp(dz('area_c3_dandan'), 0, 5));
  }
  // the siren's distance (7.3): from the tower's foot, ÷30, indoors as outside but behind the wall
  let d = outdoorD;
  let indoor = false;
  if (def.id === 'map_umizoi') d = outdoorD = clamp01(Math.hypot(x - TOWER[0], y - TOWER[1]) / 30);
  else if (def.id === 'map_c3_siren') d = 0;
  else if (def.kind === 'indoor') indoor = true;
  if (Math.abs(d - paLast) >= 0.02 || indoor !== paIndoorLast) {
    paLast = d;
    paIndoorLast = indoor;
    callAudio('setPaDistance', d, indoor);
  }
}
