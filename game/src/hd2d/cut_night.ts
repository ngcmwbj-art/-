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
import type { FieldScene } from '../world/field';
import { canvas } from './solid';

/** How strongly the 2D's pools light the ground (× π: the map's value times the ground's colour, as room.ts LIGHT_MAP). */
const NIGHT_LIGHT = 1.0;
/** The light map's px per world px (the pools are soft; the ground's own texture is 1:1). */
const SCALE = 0.5;

interface NightMap {
  c: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** World px (0, 0) in the ground texture's px (its margins). */
  ox: number;
  oy: number;
  painted: boolean;
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
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  maps.set(tex, { c, ctx, ox, oy, painted: false });
  return tex;
}

/** Per frame (TownWorld.update): the pools come up with the night; painted once, when it first comes. */
export function nightGround(mat: THREE.MeshLambertMaterial, f: FieldScene, lit: number): void {
  const tex = mat.lightMap;
  const n = tex ? maps.get(tex) : undefined;
  if (!tex || !n) return;
  const k = Math.max(0, Math.min(1, f.grade.night)) * lit;
  if (k > 0.01 && !n.painted) {
    paint(n, f);
    tex.needsUpdate = true;
  }
  mat.lightMapIntensity = Math.PI * NIGHT_LIGHT * k;
}

/**
 * The 2D's lights, added up as render.ts adds them (its light map less the
 * grade's base), as they are once the night has come (a light() is weaker
 * while Grade.night is low: the pools come up through lightMapIntensity).
 */
function paint(n: NightMap, f: FieldScene): void {
  n.painted = true;
  const ctx = n.ctx;
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
