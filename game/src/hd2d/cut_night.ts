// HD-2D: the town at night — chapter 1's only night is its ending
// (flag_stage 3, 10_narrative 5.20: the lot after the chime, the photo
// studio's window, the crossing, the star cut's street) — lit the way the
// 2D lights it: the 2D's light map (world/render.ts grade(): every prop's
// light() — the street lamps' pools, the lit windows, the vending machines,
// the crossing's lamps — added up) laid on the ground as its light map,
// coming up with the night (Grade.night × lit). The night's colour is the
// grade's, as in 2D. Built only for the town stood up at stage 3, so every
// other map and stage keeps the ground's shader as it was.

import * as THREE from 'three';
import { Gfx } from '../engine/gfx';
import { flag } from '../game/state';
import { registerDebug } from '../debug';
import type { FieldScene } from '../world/field';
import { canvas } from './solid';

/**
 * How strongly the 2D's pools light the ground (× π: the map's value times
 * the ground's colour, as room.ts LIGHT_MAP), before the grade's multiply.
 * The 2D adds its lights to the grade's multiply colour; here the finish
 * multiplies them by it after they light the ground, so they are raised by
 * 1 / that colour (its red and green: the lamps are warm), and lit in linear
 * light where the 2D adds in the picture's colours: 1.6 by eye against the
 * 2D's pools (the mall's lot, the crossing; __game.cmd.hd2dNightGround(false, k)).
 */
const NIGHT_LIGHT = 1.6;
/** The light map's px per world px (the pools are soft; the ground's own texture is 1:1). */
const SCALE = 0.5;
/**
 * The street lamps come on one after another as the night comes, nearest
 * first (art/props/street.ts lampState: 0.15 s a tile): the map is painted
 * again every RELIGHT_STEP ms for RELIGHT_MS after the night first shows.
 */
const RELIGHT_MS = 8000;
const RELIGHT_STEP = 150;

interface NightMap {
  c: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** World px (0, 0) in the ground texture's px (its margins). */
  ox: number;
  oy: number;
  painted: boolean;
  /** Field time of the first painting and of the last (ms). */
  t0: number;
  last: number;
}

const maps = new WeakMap<THREE.Texture, NightMap>();

/**
 * The ground's light map for the town stood up at night (w × h: the ground
 * texture's px, world px 0 at (ox, oy)), black until the night has come
 * (nightGround paints it), or null — any other map or stage.
 */
export function nightGroundMap(f: FieldScene, w: number, h: number, ox: number, oy: number): THREE.CanvasTexture | null {
  if (f.map.id !== 'map_town' || flag('flag_stage') !== 3) return null;
  const [c, ctx] = canvas(w * SCALE, h * SCALE);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  // (the 2D light map's values as they are, not decoded as colours: as room.ts's)
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  maps.set(tex, { c, ctx, ox, oy, painted: false, t0: 0, last: 0 });
  return tex;
}

/** Per frame (TownWorld.update): the pools come up with the night; painted when it first comes, and again while the lamps come on. */
export function nightGround(mat: THREE.MeshLambertMaterial, f: FieldScene, lit: number): void {
  const tex = mat.lightMap;
  const n = tex ? maps.get(tex) : undefined;
  if (!tex || !n) return;
  const k = Math.max(0, Math.min(1, f.grade.night)) * lit;
  if (k > 0.01 && (!n.painted || (f.t - n.t0 < RELIGHT_MS && f.t - n.last >= RELIGHT_STEP))) {
    paint(n, f);
    tex.needsUpdate = true;
  }
  mat.lightMapIntensity = (Math.PI * NIGHT_LIGHT * k * qa.boost) / under(f);
  qa.last = n;
  qa.intensity = mat.lightMapIntensity;
}

/** The grade's multiply colour (its red and green: the lamps are warm) that the finish lays over the lights. */
function under(f: FieldScene): number {
  const mul = f.grade.mul;
  return Math.max(0.3, (mul[0] + mul[1]) / 510);
}

/**
 * The lit windows' and signs' glow (emissive: town.ts BuildingView,
 * CutoutView) in the town at night, raised as the pools are: the 2D draws its
 * glow over the grading, the finish multiplies it here. 1 anywhere else.
 */
export function nightGlowK(f: FieldScene): number {
  if (f.map.id !== 'map_town' || flag('flag_stage') !== 3) return 1;
  const n = Math.max(0, Math.min(1, f.grade.night));
  return 1 + n * (1 / under(f) - 1);
}

/** QA (hd2dNightGround): the last night light map and its strength. */
const qa: { last: NightMap | null; intensity: number; boost: number } = { last: null, intensity: 0, boost: 1 };

/**
 * The 2D's lights, added up as render.ts adds them (its light map less the
 * grade's base), as they are once the night has come (a light() is weaker
 * while Grade.night is low: the pools come up through lightMapIntensity).
 */
function paint(n: NightMap, f: FieldScene): void {
  if (!n.painted) n.t0 = f.t;
  n.painted = true;
  n.last = f.t;
  const ctx = n.ctx;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, n.c.width, n.c.height);
  const g = new Gfx(ctx, n.c.width / SCALE, n.c.height / SCALE);
  const grade = { ...f.grade, night: 1, lit: 1 };
  ctx.save();
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  for (const p of f.props) {
    const a = p.art;
    if (!p.present || !a.light) continue;
    ctx.save();
    a.light(g, p.x + n.ox, p.y + n.oy, { ...f.propEnv(p), grade });
    ctx.restore();
  }
  ctx.restore();
}

// QA (dev server only)
if (import.meta.env.DEV) {
  /** The town's night light map: painted?, its strength, its size, and its brightest and mean px (0–255, red); `png`: the map itself. */
  registerDebug('hd2dNightGround', (png = false, boost?: number) => {
    if (boost !== undefined) qa.boost = boost;
    const n = qa.last;
    if (!n) return null;
    if (png) return n.c.toDataURL('image/png');
    const d = n.ctx.getImageData(0, 0, n.c.width, n.c.height).data;
    let max = 0;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      max = Math.max(max, d[i]);
      sum += d[i];
    }
    return { painted: n.painted, intensity: qa.intensity, w: n.c.width, h: n.c.height, max, mean: sum / (d.length / 4) };
  });
}
