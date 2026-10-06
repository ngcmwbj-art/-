// HD-2D: the town at night — chapter 1's only night is its ending
// (flag_stage 3, 10_narrative 5.20: the lot after the chime, the photo
// studio's window, the crossing, the star cut's street) — lit the way the
// 2D lights it: the 2D's light map (world/render.ts grade(): every prop's
// light() — the street lamps' pools, the lit windows, the vending machines,
// the crossing's lamps — added up) laid on the ground as its light map,
// coming up with the night (Grade.night × lit). The night's colour is the
// grade's, as in 2D. Built only for the town stood up at stage 3, so every
// other map and stage keeps the ground's shader as it was.
//
// Chapter 2 (2026-10-06, below: nightMul): 星見台's night outdoors — and
// 夕鳴町 at night once chapter 2 has begun — take the whole 2D light map as
// a multiply on every surface instead.

import * as THREE from 'three';
import { Gfx } from '../engine/gfx';
import { flag } from '../game/state';
import { registerDebug } from '../debug';
import type { Actor } from '../world/actor';
import type { FieldScene } from '../world/field';
import { genFlash } from '../world/hoshi';
import { fanImage } from '../world/lantern';
import { css, type Grade } from '../world/lighting';
import { isCh2Map } from '../world/maps';
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
  if (f.map.id !== 'map_town' || flag('flag_stage') !== 3 || flag('flag_ch2_started')) return null;
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
  if (f.map.id !== 'map_town' || flag('flag_stage') !== 3 || flag('flag_ch2_started')) return 1;
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

// ---------------------------------------------------------------- 星見台's night (chapter 2, 2026-10-06)

/**
 * Chapter 2 is the night at 4:59 (星見台: 52 8.3 / 8.4 / 8.5). The 2D
 * multiplies its whole picture by a light map (render.ts grade()): the
 * night's colour (pal_h*: Grade.mul), a step darker over the dark tiles,
 * the starlight round Minato's feet there, the tomato light's warm rings
 * mixed in (not added), テツヤ's headlight, マサル's flashlight and every
 * prop's light() — the street lamps' pools, the lit windows, the vending
 * machines — added. Here the same map is painted round the camera's target
 * in world px, and every surface's diffuse light is multiplied by it where
 * its pixel would be in the 2D picture: (x, z − y / SV) — the ground where
 * it lies, a standing thing up its picture, the people too — so the dark,
 * the pools and the rings fall where the 2D has them and mean the same.
 * The glows (emissive) stay over it, as the 2D screens them after grading,
 * and the finish's multiply is left white (it is in the map: nightGrade).
 * Past the painted rect a surface takes the night's colour alone.
 */

/** The map's px per world px (soft: the 3D picture is finer than the 2D's px, its dither would show as blocks). */
const NM_SCALE = 0.5;
/** The painted rect round the camera's target (tiles: across each way, north, south): what the camera sees and the pictures of the tall things there. */
const NM_X = 22;
const NM_N = 26;
const NM_S = 10;

/** The far haze by day (view.ts) and on 星見台's night. */
const FOG_DAY = new THREE.Color('#e0a080');
const fogNight = new THREE.Color('#24223c');

/** The uniforms every patched material shares (one update a frame reaches them all). */
const nm = {
  hdNightOn: { value: 0 },
  hdNight: { value: null as THREE.Texture | null },
  /** World units of the map's north-west corner, and its size. */
  hdOrigin: { value: new THREE.Vector2() },
  hdSize: { value: new THREE.Vector2(1, 1) },
  /** Past the map: the night's colour (linear). */
  hdBase: { value: new THREE.Color(1, 1, 1) },
  /** How tall a standing thing is per px of its picture (SV, × a room's stretch). */
  hdSV: { value: 1 },
};

let nmCanvas: HTMLCanvasElement | null = null;
let nmCtx: CanvasRenderingContext2D | null = null;
let nmTex: THREE.CanvasTexture | null = null;
let nmGfx: Gfx | null = null;
/** The field the map was last painted for, and a frame count (light quality: every other frame). */
let nmField: FieldScene | null = null;
let nmFrame = 0;
/** QA: the last painting's time (ms) and rect. */
const nmQa = { ms: 0, rect: [0, 0, 0, 0] };

/** Does field f's picture take 星見台's night map (its outdoor places)? */
export function nightMulWanted(f: FieldScene): boolean {
  if (isCh2Map(f.map.def)) return f.map.def.kind !== 'indoor';
  // (chapter 2 back in 夕鳴町 at night — its prologue's crossing at 19:30, its
  // ending's 19:31: the same map as the 2D's, the shop windows' pools and the
  // lamps' as warm; chapter 1's own night, its ending, keeps the ground's light map above)
  return f.map.id === 'map_town' && !!flag('flag_ch2_started') && f.grade.night > 0.5;
}

const VERT_HEAD = 'varying vec3 vHdWorld;\n';
const VERT_BODY = `#include <project_vertex>
  {
    vec4 hdW = vec4( transformed, 1.0 );
    #ifdef USE_INSTANCING
      hdW = instanceMatrix * hdW;
    #endif
    vHdWorld = ( modelMatrix * hdW ).xyz;
  }`;
const FRAG_HEAD = `varying vec3 vHdWorld;
uniform float hdNightOn;
uniform sampler2D hdNight;
uniform vec2 hdOrigin;
uniform vec2 hdSize;
uniform vec3 hdBase;
uniform float hdSV;
`;
const FRAG_BODY = `#include <aomap_fragment>
  if ( hdNightOn > 0.5 ) {
    vec2 hdUv = ( vec2( vHdWorld.x, vHdWorld.z - vHdWorld.y / hdSV ) - hdOrigin ) / hdSize;
    vec3 hdK = hdBase;
    if ( hdUv.x >= 0.0 && hdUv.x <= 1.0 && hdUv.y >= 0.0 && hdUv.y <= 1.0 ) hdK = texture2D( hdNight, vec2( hdUv.x, 1.0 - hdUv.y ) ).rgb;
    reflectedLight.directDiffuse *= hdK;
    reflectedLight.indirectDiffuse *= hdK;
  }`;

const patched = new WeakSet<THREE.Material>();

/** One material: its diffuse light multiplied by the night map (Lambert and Basic; never a shadow-only one or one marked userData.noNight). */
function patchMaterial(mat: THREE.Material): void {
  if (patched.has(mat)) return;
  patched.add(mat);
  if (!(mat instanceof THREE.MeshLambertMaterial || mat instanceof THREE.MeshBasicMaterial)) return;
  if (!mat.colorWrite || mat.userData.noNight) return;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    prev.call(mat, shader, renderer);
    Object.assign(shader.uniforms, nm);
    shader.vertexShader = VERT_HEAD + shader.vertexShader.replace('#include <project_vertex>', VERT_BODY);
    shader.fragmentShader = FRAG_HEAD + shader.fragmentShader.replace('#include <aomap_fragment>', FRAG_BODY);
  };
  mat.customProgramCacheKey = () => 'hdNight';
  mat.needsUpdate = true;
}

/** Every material under `root` takes the night map (once each; a new one — a person come into view — on the frame it first shows). */
export function patchNight(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    if (Array.isArray(m)) m.forEach(patchMaterial);
    else patchMaterial(m);
  });
}

/**
 * Per frame, before rendering: on 星見台 (nightMulWanted) the map is painted
 * round the camera's target (tx, tz: units) and switched on; anywhere else
 * switched off (the patched materials then draw as they did). `sv`: a
 * standing thing's height per px of its picture. Returns whether it is on.
 */
export function nightMul(f: FieldScene, tx: number, tz: number, sv: number, fog: THREE.Fog | THREE.FogExp2 | null = null, half = false): boolean {
  if (!nightMulWanted(f)) {
    nm.hdNightOn.value = 0;
    return false;
  }
  // (light quality — the phones — paints it every other frame; the last one, with its own rect, stands between)
  if (half && nm.hdNightOn.value && nmField === f && nmFrame++ % 2) return true;
  nmField = f;
  // the haze far off: the night's, not the evening's orange (towards it again as the morning comes)
  if (fog) fog.color.set(FOG_DAY).lerp(fogNight, Math.max(0, Math.min(1, f.grade.night)));
  const t0 = performance.now();
  // the rect in world px, snapped to the map's px
  const step = 1 / NM_SCALE;
  const x0 = Math.floor(((tx - NM_X) * 16) / step) * step;
  const y0 = Math.floor(((tz - NM_N) * 16) / step) * step;
  const w = NM_X * 2 * 16;
  const h = (NM_N + NM_S) * 16;
  if (!nmCanvas || nmCanvas.width !== w * NM_SCALE || nmCanvas.height !== h * NM_SCALE) {
    nmTex?.dispose();
    [nmCanvas, nmCtx] = canvas(w * NM_SCALE, h * NM_SCALE);
    nmCtx.imageSmoothingEnabled = true;
    nmGfx = new Gfx(nmCtx, w, h);
    nmTex = new THREE.CanvasTexture(nmCanvas);
    // (the map's colours as the 2D multiplies them: decoded to linear, multiplied there ≈ multiplied in sRGB)
    nmTex.colorSpace = THREE.SRGBColorSpace;
    nmTex.generateMipmaps = false;
    nmTex.minFilter = THREE.LinearFilter;
    nmTex.magFilter = THREE.LinearFilter;
    nmTex.wrapS = nmTex.wrapT = THREE.ClampToEdgeWrapping;
  }
  const ctx = nmCtx!;
  ctx.save();
  ctx.setTransform(NM_SCALE, 0, 0, NM_SCALE, 0, 0);
  const base = paintLightMap(f, ctx, nmGfx!, x0, y0, w, h);
  ctx.restore();
  nmTex!.needsUpdate = true;
  nm.hdNightOn.value = 1;
  nm.hdNight.value = nmTex;
  nm.hdOrigin.value.set(x0 / 16, y0 / 16);
  nm.hdSize.value.set(w / 16, h / 16);
  nm.hdBase.value.set(base).convertSRGBToLinear();
  nm.hdSV.value = sv;
  nmQa.ms = performance.now() - t0;
  nmQa.rect = [x0, y0, w, h];
  return true;
}

/** The grade the finish lays over a picture that took the night map: its multiply is in the map. */
export function nightGrade(g: Grade): Grade {
  return nm.hdNightOn.value ? { ...g, mul: [255, 255, 255] } : g;
}

/** Where テツヤ's lamp sits (world px): on the machine's nose, turned with the beam (as render.ts lampPos). */
function lampPos(a: Actor): [number, number] {
  const ang = (a.data.lampAngle as number | undefined) ?? (a.dir === 'left' ? Math.PI : 0);
  return [a.x + Math.cos(ang) * 11, a.y - 8 + Math.sin(ang) * 3];
}

/**
 * The 2D's light map of 星見台 outdoors (render.ts grade(), its light-map
 * part) for the world px rect x0, y0, w × h, into ctx (already scaled to
 * its px). Returns the night's colour (css) it starts from.
 */
function paintLightMap(f: FieldScene, ctx: CanvasRenderingContext2D, g: Gfx, x0: number, y0: number, w: number, h: number): string {
  const base = css(f.grade.mul);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // regions of another base (52 4.0)
  for (const r of f.map.def.lightRegions ?? []) {
    ctx.fillStyle = r.color;
    ctx.fillRect(r.x * 16 - x0, r.y * 16 - y0, r.w * 16, r.h * 16);
  }
  // the dark, the starlight, the tomato light (mixed, not added)
  const star = f.map.def.darkStar;
  f.light.paint(ctx, x0, y0, star === false ? base : (star ?? base), w, h);
  ctx.globalCompositeOperation = 'lighter';
  // テツヤ's headlight: a fan of light that shows from outside the dark too
  for (const a of f.actors) {
    if (!a.data.selfLit || !a.visible) continue;
    const ang = (a.data.lampAngle as number | undefined) ?? (a.dir === 'left' ? Math.PI : 0);
    const fan = fanImage(ang);
    const [hx, hy] = lampPos(a);
    ctx.drawImage(fan, Math.round(hx - x0 - (fan.width - 1) / 2), Math.round(hy - y0 - (fan.height - 1) / 2));
  }
  // マサル's flashlight: a 10px circle, one frame a second
  const gen = genFlash(f);
  if (gen) {
    ctx.fillStyle = 'rgba(246,217,138,0.2)';
    ctx.beginPath();
    ctx.arc(Math.round(gen.x + (gen.dir === 'left' ? -6 : 6) - x0), Math.round(gen.y - 6 - y0), 10, 0, Math.PI * 2);
    ctx.fill();
  }
  // every prop's light (the lamp pools, the lit windows)
  for (const p of f.props) {
    const a = p.art;
    if (!p.present || !a.light) continue;
    if (p.x + a.ox + a.w + 144 < x0 || p.y + a.oy + a.h + 144 < y0 || p.x + a.ox - 144 > x0 + w || p.y + a.oy - 144 > y0 + h) continue;
    ctx.save();
    a.light(g, p.x - x0, p.y - y0, f.propEnv(p));
    ctx.restore();
  }
  // fx_h_lantern_on: the 1px #FFE7A3 ring running out with the opening circle (2D: over the grade)
  const L = f.light;
  if (L.lantern && L.onT < 1) {
    ctx.globalAlpha = 1 - L.onT * 0.6;
    ctx.strokeStyle = '#FFE7A3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(L.lantern.x - x0, L.lantern.y - y0, L.lantern.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
  return base;
}

if (import.meta.env.DEV) {
  /** QA: 星見台's night map — on?, the last painting's ms and rect (world px); `png`: the map itself. */
  registerDebug('hd2dNightMul', (png = false) => {
    if (png) return nmCanvas?.toDataURL('image/png') ?? null;
    return { on: nm.hdNightOn.value, ms: Math.round(nmQa.ms * 100) / 100, rect: nmQa.rect, size: nmCanvas ? [nmCanvas.width, nmCanvas.height] : null };
  });
}
