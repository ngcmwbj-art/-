// Map registry + loader. Map definitions register themselves on import
// (src/data/maps/*); other teams add their indoor maps the same way:
//
//   import { registerMap } from '../../world/maps';
//   registerMap({ id: 'map_laundry', ... });

import { flag, state } from '../game/state';
import type { Cond, Ground, MapDef, MapObj, TileSpec } from './types';

const registry = new Map<string, MapDef>();

export function registerMap(def: MapDef): void {
  registry.set(def.id, def);
  loaded.delete(def.id);
}

export function hasMap(id: string): boolean {
  return registry.has(id);
}

export function mapIds(): string[] {
  return [...registry.keys()];
}

export function getMapDef(id: string): MapDef | undefined {
  return registry.get(id);
}

/** Parsed, ready-to-use map. */
export interface LoadedMap {
  def: MapDef;
  id: string;
  w: number;
  h: number;
  /** Per-cell spec (legend lookup). */
  cells: TileSpec[];
  /** Raw chars. */
  chars: string[];
  ground: Ground[];
  objects: MapObj[];
}

const loaded = new Map<string, LoadedMap>();
const VOID: TileSpec = { ground: 'none', solid: true };

export function loadMap(id: string): LoadedMap | null {
  const hit = loaded.get(id);
  if (hit) return hit;
  const def = registry.get(id);
  if (!def) return null;
  const h = def.rows.length;
  const w = Math.max(...def.rows.map((r) => [...r].length));
  const cells: TileSpec[] = [];
  const chars: string[] = [];
  const ground: Ground[] = [];
  for (let y = 0; y < h; y++) {
    const row = [...def.rows[y]];
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? ' ';
      const spec = def.legend[ch] ?? VOID;
      cells.push(spec);
      chars.push(ch);
      ground.push(spec.ground);
    }
  }
  resolveAuto(ground, w, h);
  // Anonymous objects get stable ids.
  let n = 0;
  const objects = def.objects.map((o) => (o.id ? o : { ...o, id: `${o.t}_${(o as { prop?: string }).prop ?? ''}_${n++}` }));
  const m: LoadedMap = { def, id, w, h, cells, chars, ground, objects };
  loaded.set(id, m);
  return m;
}

/** Cells marked 'auto' (under props, poles, walls) take the most common neighbouring ground. */
function resolveAuto(ground: Ground[], w: number, h: number): void {
  for (let pass = 0; pass < 12; pass++) {
    let left = 0;
    const next = ground.slice();
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (ground[i] !== 'auto') continue;
        const count = new Map<Ground, number>();
        for (const [dx, dy, wt] of [[0, 1, 3], [0, -1, 2], [1, 0, 2], [-1, 0, 2], [1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const g = ground[ny * w + nx];
          if (g === 'auto' || g === 'none' || g === 'water' || g === 'hedge') continue;
          count.set(g, (count.get(g) ?? 0) + wt);
        }
        let best: Ground | null = null;
        let bn = 0;
        for (const [g, n] of count) if (n > bn) { best = g; bn = n; }
        if (best) next[i] = best;
        else left++;
      }
    for (let i = 0; i < ground.length; i++) ground[i] = next[i];
    if (!left) break;
  }
  for (let i = 0; i < ground.length; i++) if (ground[i] === 'auto') ground[i] = 'dirt';
}

export function cellAt(m: LoadedMap, x: number, y: number): TileSpec {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return VOID;
  return m.cells[y * m.w + x];
}

export function charAt(m: LoadedMap, x: number, y: number): string {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return ' ';
  return m.chars[y * m.w + x];
}

export function groundAt(m: LoadedMap, x: number, y: number): Ground {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return 'none';
  return m.ground[y * m.w + x];
}

// ---- stages -----------------------------------------------------------------
//
// Chapter 1 keeps its stage in flag_stage; the 星見台 maps (chapter 2) keep
// theirs in flag_ch2_stage (02_ch2 6.2). The field tells this module which
// flag the current map uses when it loads a map (setStageSource), and every
// stage-dependent lookup (conditions, talk keys, stage texts, bgm/amb per
// stage, grading, fushigi) reads currentStage(). Default: flag_stage, i.e.
// chapter 1 behaves exactly as before.

export type StageFlag = 'flag_stage' | 'flag_ch2_stage';

let stageSource: StageFlag = 'flag_stage';

/** The stage flag of a map definition (MapDef.stageFlag, else by chapter). */
export function stageFlagOf(def: MapDef | undefined | null): StageFlag {
  if (!def) return 'flag_stage';
  return def.stageFlag ?? (def.chapter === 2 ? 'flag_ch2_stage' : 'flag_stage');
}

/** Is this a chapter-2 (星見台) map? */
export function isCh2Map(def: MapDef | undefined | null): boolean {
  return !!def && (def.chapter === 2 || def.stageFlag === 'flag_ch2_stage');
}

/** Called by the field when it loads a map (and by QA tools). */
export function setStageSource(flagId: StageFlag): void {
  stageSource = flagId;
}

/** The flag the current map's stage is kept in. */
export function stageSourceFlag(): StageFlag {
  return stageSource;
}

/** The current map's stage (flag_stage in chapter 1, flag_ch2_stage on 星見台). */
export function currentStage(): number {
  return flag(stageSource);
}

/** Talk-table key prefix of the current stage source: 's' (chapter 1) or 'h' (星見台). */
export function stageKeyPrefix(): 's' | 'h' {
  return stageSource === 'flag_ch2_stage' ? 'h' : 's';
}

// ---- conditions -------------------------------------------------------------

function stageMatches(spec: number | number[] | string, s: number): boolean {
  if (typeof spec === 'number') return spec === s;
  if (Array.isArray(spec)) return spec.includes(s);
  const t = spec.trim();
  if (t.endsWith('+')) return s >= parseInt(t, 10);
  const m = /^(\d)\s*-\s*(\d)$/.exec(t);
  if (m) return s >= +m[1] && s <= +m[2];
  return t.split(',').map((v) => parseInt(v, 10)).includes(s);
}

export function condOk(c: Cond | undefined, stage = currentStage()): boolean {
  if (!c) return true;
  if (c.stage !== undefined && !stageMatches(c.stage, stage)) return false;
  const arr = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
  for (const f of arr(c.flag)) if (!flag(f)) return false;
  for (const f of arr(c.notFlag)) if (flag(f)) return false;
  if (c.taken && !state.taken[c.taken]) return false;
  if (c.notTaken && state.taken[c.notTaken]) return false;
  if (c.when && !c.when()) return false;
  return true;
}

/**
 * Pick the entry of a stage-keyed record for the current stage. Keys are
 * s0, s1-2, s2+, s0,1 … and, on 星見台 maps, the same with `h` (h0, h1-2);
 * there the `h` keys win and `s` keys are read as a fallback.
 */
export function pickStage<T>(v: T | Record<string, T> | undefined, stage = currentStage()): T | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'object' || Array.isArray(v)) return v as T;
  const rec = v as Record<string, T>;
  const keys = Object.keys(rec);
  if (!keys.some((k) => k === 'default' || /^[sh]\d/.test(k))) return v as T;
  const prefixes = stageKeyPrefix() === 'h' ? ['h', 's'] : ['s'];
  for (const pre of prefixes) {
    const own = keys.filter((k) => k.startsWith(pre) && /^\d/.test(k.slice(1)));
    if (!own.length) continue;
    // exact / range keys like s0, s1-2, s2+, s0,1
    for (const k of own) if (stageMatches(k.slice(1), stage)) return rec[k];
    // fall back to the closest earlier stage
    for (let s = stage - 1; s >= 0; s--) for (const k of own) if (stageMatches(k.slice(1), s)) return rec[k];
  }
  return rec.default;
}
