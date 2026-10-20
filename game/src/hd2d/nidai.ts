// HD-2D: the bed of ツガオ便's kei truck on the move (map_c3_nidai, 62 4.1・12.2;
// 2026-10-14 依頼主「移動中の軽トラの中が簡素過ぎるから丁寧に作って、軽トラもツガオが
// 運転してる姿を見せて」). Not stood up from the 2D pictures like the town: the
// truck is built here in 3D — the steel bed, its olive gates (the chalk
// はなまる on the far one, 「青果 ツガオ便」's strokes on the near one), the
// headboard guard, the cab with its rear glass and the driver's window rolled
// down: ツガオ at the wheel (work cap, the everyday face) and ポコシャ with
// ぴーちゃん beside him; the yellow crates of vegetables tied down with rope,
// the cabbage basket (S14: the black board's corner under it), the wheels
// turning — and the land rushing past it, the bed standing still in the
// middle: the road, the guard rails, the poles and their wires, and by the
// scenario's flag_c3_nidai_view the stretches of 60 4.1 —
//   0 夕鳴町's houses → the paddies → the mountain road and its cutting
//   1 over the pass: the sea all along (12.2)
//   2 the harbour town (焼き杉 and いぶし瓦) → the coast road out of the town,
//     the sea alongside → the slope to the cape, the old aquarium up ahead
//     (S14; 2026-10-20 the aquarium moved out of the town to the cape: the
//     ride is longer and has the road between)
//   3 the way home: the sea, then 夕鳴町 (the ending sets 1 then 0)
// The near land comes in chunks from ahead (east) and goes off behind (west),
// each as the stretch the truck will be in when it gets there; the far land
// (mountains, islands) slides by slowly. The truck rocks on the road (the
// land bobs under it, the camera with the truck), a jolt every few seconds.
// The light is the hour's: the late morning and the noon (S04, S14), the
// evening of the way home (S32, stage 4) with its long shadows forward.
// The camera is the scene's own: from behind the bed, high on the driver's
// side; at the pass it swings low to show the sea up to the horizon; on the
// way to the cape (S14) it closes in, slowly.
// The 2D's people stand on the bed as everywhere (actors.ts); the 2D view
// (c3_props.ts prop_c3_nidai_*) is what a machine without WebGL sees.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { flag } from '../game/state';
import { charSprite, hasChar, idleFrame, type CharSprite } from '../art/chars/registry';
import { H, W } from '../engine/screen';
import type { FieldScene } from '../world/field';
import type { Solid } from './overlap';
import { canvas, pixelTexture } from './solid';
import { SV, type Box, type CutoutView, type LightSpot } from './town';
import type { Crop } from './view';

export function nidaiMap(id: string): boolean {
  return id === 'map_c3_nidai';
}

// ---------------------------------------------------------------- measures (units = tiles)

const ROAD_Y = -0.85;
const SEA_Y = ROAD_Y - 1.7;
/** The gates' height over the bed's floor. */
const GH = 0.42;
const BX0 = 0.35;
const BX1 = 9.75;
const BZ0 = 0.42;
const BZ1 = 5.73;
/** The cab (east of the bed). */
const CX0 = 9.8;
const CX1 = 12.85;
const SILL = 0.72;
const ROOF = 1.95;
const WHEEL_R = 0.36;
/** ツガオ's seat (x): the wheel just ahead of him. */
const DRIVER_X = CX0 + 1.2;
/** A chunk of the near land (along the road, x). */
const L = 12;
const BACK = -52;
const AHEAD = 88;
const FAR_L = 44;
const FAR_BACK = -120;
const FAR_AHEAD = 190;
/** The backdrop of the sky, far north. */
const SKY_Z = -112;
const OLIVE = '#5A6B2A';
const OLIVE_LT = '#7A8B3A';
const OLIVE_DK = '#3A4A1A';

type Kind = 'town' | 'paddy' | 'yama' | 'touge' | 'umi' | 'minato' | 'saka';

/** The stretch of road at `tv` s since the view was set (60 4.1). */
function zoneOf(view: number, tv: number): Kind {
  if (view === 1) return tv < 0.6 ? 'touge' : 'umi';
  if (view === 2) return tv < 3 ? 'minato' : tv < 11 ? 'umi' : 'saka';
  if (view === 3) return tv < 12 ? 'umi' : 'town';
  return tv < 9 ? 'town' : tv < 21 ? 'paddy' : 'yama';
}
const SEA_VIEW = (view: number) => view === 1 || view === 2 || view === 3;
const POLES: Kind[] = ['town', 'paddy', 'minato'];
const RAILS: Kind[] = ['yama', 'touge', 'umi', 'saka'];

/** A small seeded random (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- the paint box

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** Shared geometries, materials and painted textures of one world. */
class Kit {
  private readonly mats = new Map<string, THREE.Material>();
  private readonly texs = new Map<string, THREE.CanvasTexture>();
  readonly box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  readonly cyl = new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0);
  readonly cone = new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0);
  readonly ball = new THREE.IcosahedronGeometry(1, 1);
  readonly geos: THREE.BufferGeometry[] = [this.box, this.cyl, this.cone, this.ball];

  col(c: string, flat = true): THREE.MeshLambertMaterial {
    const k = `${c}|${flat}`;
    let m = this.mats.get(k) as THREE.MeshLambertMaterial | undefined;
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: new THREE.Color(c), flatShading: flat });
      this.mats.set(k, m);
    }
    return m;
  }

  tex(key: string, w: number, h: number, paint: Painter, repeat = false): THREE.CanvasTexture {
    let t = this.texs.get(key);
    if (!t) {
      const [c, ctx] = canvas(w, h);
      ctx.imageSmoothingEnabled = false;
      paint(ctx, w, h);
      t = pixelTexture(c);
      // (crisp near, but no shimmer where the land and the sea lie far and flat)
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      this.texs.set(key, t);
    }
    return t;
  }

  texMat(key: string, w: number, h: number, paint: Painter, opts: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial {
    const k = `tex:${key}`;
    let m = this.mats.get(k) as THREE.MeshLambertMaterial | undefined;
    if (!m) {
      m = new THREE.MeshLambertMaterial({ map: this.tex(key, w, h, paint), ...opts });
      this.mats.set(k, m);
    }
    return m;
  }

  geo<T extends THREE.BufferGeometry>(g: T): T {
    this.geos.push(g);
    return g;
  }

  dispose(): void {
    for (const g of this.geos) g.dispose();
    for (const m of this.mats.values()) m.dispose();
    for (const t of this.texs.values()) t.dispose();
  }
}

/** A mesh of `geo` (a unit box/cylinder… standing on y 0) scaled and placed by its foot. */
function put(group: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, sx: number, sy: number, sz: number, cast = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = cast;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

/**
 * Few draw calls: the plain meshes directly under `g` (one material, opaque, no children,
 * not in `keep`) merged into one mesh per material. The merged geometries are marked
 * as `g`'s own (userData.own), to be disposed with it.
 */
function bake(g: THREE.Object3D, keep: Set<THREE.Object3D> = new Set()): void {
  const sets = new Map<string, { mat: THREE.Material; cast: boolean; geos: THREE.BufferGeometry[] }>();
  for (const o of [...g.children]) {
    if (!(o instanceof THREE.Mesh) || keep.has(o) || Array.isArray(o.material) || o.children.length || o.material.transparent) continue;
    o.updateMatrix();
    const src = o.geometry as THREE.BufferGeometry;
    const geo = src.index ? src.toNonIndexed() : src.clone();
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((geo.attributes.position.count) * 2), 2));
    geo.clearGroups();
    geo.applyMatrix4(o.matrix);
    const key = `${o.material.uuid}|${o.castShadow}`;
    let set = sets.get(key);
    if (!set) sets.set(key, (set = { mat: o.material, cast: o.castShadow, geos: [] }));
    set.geos.push(geo);
    g.remove(o);
  }
  for (const set of sets.values()) {
    const merged = mergeGeometries(set.geos, false);
    for (const geo of set.geos) geo.dispose();
    if (!merged) continue;
    merged.userData.own = true;
    const m = new THREE.Mesh(merged, set.mat);
    m.castShadow = set.cast;
    m.receiveShadow = true;
    g.add(m);
  }
}

/** A box from corner to corner (x0..x1, y0..y1, z0..z1). */
function slab(group: THREE.Object3D, k: Kit, mat: THREE.Material | THREE.Material[], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, cast = true): THREE.Mesh {
  return put(group, k.box, mat, (x0 + x1) / 2, y0, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, cast);
}

const noise = (ctx: CanvasRenderingContext2D, w: number, h: number, cols: string[], n: number, seed: number) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = cols[Math.floor(r() * cols.length)];
    ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1 + Math.floor(r() * 2), 1);
  }
};

// ---------------------------------------------------------------- the truck

/** The gates' face: olive steel pressed with two ribs, the rope hooks along the top. */
const gatePaint = (hanamaru: boolean, logo: boolean): Painter => (ctx, w, h) => {
  ctx.fillStyle = OLIVE;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#9AAA5A';
  ctx.fillRect(0, 0, w, 1);
  ctx.fillStyle = OLIVE_LT;
  ctx.fillRect(0, 1, w, 1);
  ctx.fillRect(0, 4, w, 1);
  ctx.fillRect(0, 7, w, 1);
  ctx.fillStyle = OLIVE_DK;
  ctx.fillRect(0, 5, w, 1);
  ctx.fillRect(0, 8, w, 1);
  ctx.fillRect(0, h - 1, w, 1);
  // scuffs where the crates knock it
  noise(ctx, w, h, ['#6B7A3A', '#4A5A22', '#8A9A5A'], w / 2, w * 7 + h);
  // the rope hooks
  for (let x = 6; x < w - 4; x += 28) {
    ctx.fillStyle = '#C8CCD2';
    ctx.fillRect(x, h - 3, 3, 2);
    ctx.fillStyle = '#6B7186';
    ctx.fillRect(x, h - 2, 3, 1);
  }
  if (hanamaru) {
    // the chalk はなまる (obj_c3_nidai_aori: ヒロスケ copied しゅん's stamp, chapter 2)
    const cx = Math.round(w * 0.47);
    const cy = Math.round(h / 2);
    ctx.fillStyle = 'rgba(244,241,232,0.92)';
    for (let a = 0; a < 40; a++) {
      const th = (a / 40) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(th) * 7), Math.round(cy + Math.sin(th) * 3.6), 1, 1);
      if (a % 2 === 0) ctx.fillRect(Math.round(cx + Math.cos(th) * 3), Math.round(cy + Math.sin(th) * 1.6), 1, 1);
    }
    for (let p = 0; p < 8; p++) {
      const th = (p / 8) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(th) * 9.5), Math.round(cy + Math.sin(th) * 4.6), 2, 1);
    }
  }
  if (logo) {
    // ツガオ便's mark, hand-painted: a white board, a red tomato with its green calyx, two strokes of a name
    const x0 = Math.round(w * 0.42);
    ctx.fillStyle = '#F4F1E8';
    ctx.fillRect(x0, 2, 22, 6);
    ctx.fillStyle = '#E84E3C';
    ctx.fillRect(x0 + 2, 3, 4, 4);
    ctx.fillStyle = '#3A7A3A';
    ctx.fillRect(x0 + 3, 3, 2, 1);
    ctx.fillStyle = OLIVE_DK;
    ctx.fillRect(x0 + 8, 4, 12, 1);
    ctx.fillRect(x0 + 8, 6, 9, 1);
  }
};

/** The bed's floor: painted steel, its ribs lengthwise, worn bare where feet and crates go, a leaf or two. */
const floorPaint: Painter = (ctx, w, h) => {
  ctx.fillStyle = '#56622E';
  ctx.fillRect(0, 0, w, h);
  for (let y = 2; y < h; y += 6) {
    ctx.fillStyle = '#6E7C3C';
    ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = '#3E4A20';
    ctx.fillRect(0, y + 1, w, 1);
  }
  noise(ctx, w, h, ['#7A7A70', '#8A8670', '#4A5226', '#6A6A5A'], w * 3, 911);
  // worn patches (bare steel) in the middle
  const r = rng(77);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = 'rgba(150,150,140,0.35)';
    ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 4 + Math.floor(r() * 8), 2);
  }
  // dried mud and a few leaves
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 3 ? '#7A6A4A' : '#5FA85A';
    ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2, 1);
  }
};

/** The cab's door (the south side; the north is the same, mirrored): the seam, the handle, the hand-painted name. */
const doorPaint: Painter = (ctx, w, h) => {
  ctx.fillStyle = OLIVE;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#9AAA5A';
  ctx.fillRect(0, 0, w, 1);
  ctx.fillStyle = OLIVE_LT;
  ctx.fillRect(0, 1, w, 1);
  // the door's seam and its lower crease
  ctx.fillStyle = OLIVE_DK;
  ctx.fillRect(Math.round(w * 0.12), 1, 1, h - 4);
  ctx.fillRect(Math.round(w * 0.8), 1, 1, h - 4);
  ctx.fillRect(Math.round(w * 0.12), h - 4, Math.round(w * 0.68), 1);
  ctx.fillStyle = '#6B7A3A';
  ctx.fillRect(0, Math.round(h * 0.55), w, 1);
  // the handle
  ctx.fillStyle = '#2A2440';
  ctx.fillRect(Math.round(w * 0.2), 4, 4, 1);
  ctx.fillStyle = '#C8CCD2';
  ctx.fillRect(Math.round(w * 0.2), 3, 4, 1);
  // ツガオ便's mark: the tomato in a white ring, and the lines of the name and the number under it (not to be read)
  const mx = Math.round(w * 0.5);
  ctx.fillStyle = '#F4F1E8';
  ctx.fillRect(mx - 4, 6, 9, 7);
  ctx.fillRect(mx - 3, 5, 7, 9);
  ctx.fillStyle = '#E84E3C';
  ctx.fillRect(mx - 2, 7, 5, 5);
  ctx.fillStyle = '#FF8A6A';
  ctx.fillRect(mx - 1, 8, 1, 1);
  ctx.fillStyle = '#3A7A3A';
  ctx.fillRect(mx - 1, 6, 3, 1);
  ctx.fillStyle = '#F4F1E8';
  ctx.fillRect(mx - 9, 15, 19, 1);
  ctx.fillStyle = '#C8C2B4';
  ctx.fillRect(mx - 6, 17, 13, 1);
  // the step's shadow at the bottom
  ctx.fillStyle = OLIVE_DK;
  ctx.fillRect(0, h - 1, w, 1);
};

/** The cab's front: the grille, the round headlamps, the turn signals, the bumper line. */
const frontPaint: Painter = (ctx, w, h) => {
  ctx.fillStyle = OLIVE;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#3A3F48';
  ctx.fillRect(Math.round(w * 0.3), Math.round(h * 0.45), Math.round(w * 0.4), 4);
  ctx.fillStyle = '#6B7186';
  for (let x = Math.round(w * 0.3); x < w * 0.7; x += 2) ctx.fillRect(x, Math.round(h * 0.45), 1, 4);
  for (const x of [Math.round(w * 0.12), Math.round(w * 0.8)]) {
    ctx.fillStyle = '#E8E4D8';
    ctx.fillRect(x, Math.round(h * 0.42), 5, 5);
    ctx.fillStyle = '#FFF6D8';
    ctx.fillRect(x + 1, Math.round(h * 0.42) + 1, 2, 2);
    ctx.fillStyle = '#F2A23A';
    ctx.fillRect(x, Math.round(h * 0.42) + 6, 5, 1);
  }
  ctx.fillStyle = '#2A2440';
  ctx.fillRect(0, h - 3, w, 3);
};

/** A yellow plastic crate's side (the ribs, the hand hole) and its top full of the day's vegetables. */
const crateSide: Painter = (ctx, w, h) => {
  ctx.fillStyle = '#FFD23F';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#F6E08A';
  ctx.fillRect(0, 0, w, 1);
  ctx.fillStyle = '#D9A441';
  for (let x = 2; x < w; x += 3) ctx.fillRect(x, 3, 1, h - 4);
  ctx.fillRect(0, h - 1, w, 1);
  ctx.fillStyle = '#A8742A';
  ctx.fillRect(Math.round(w / 2) - 3, 2, 6, 2);
};
const crateTop = (kind: number): Painter => (ctx, w, h) => {
  ctx.fillStyle = '#D9A441';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#FFD23F';
  ctx.strokeStyle = '#FFD23F';
  ctx.fillRect(0, 0, w, 1);
  ctx.fillRect(0, h - 1, w, 1);
  ctx.fillRect(0, 0, 1, h);
  ctx.fillRect(w - 1, 0, 1, h);
  const r = rng(kind * 31 + 5);
  const veg = [
    // tomatoes
    ['#E84E3C', '#B83A2A', '#FF8A6A', '#3A7A3A'],
    // cucumbers
    ['#3A7A3A', '#2A5A2A', '#6AA05A', '#2A5A2A'],
    // eggplants
    ['#4A2A5A', '#2A1A3A', '#7A5A8A', '#3A6A3A'],
    // green peppers
    ['#4A9A3A', '#2A6A2A', '#8ACB6B', '#2A6A2A'],
    // potatoes
    ['#C8A06A', '#A87A4A', '#E8C890', '#8A6A3A'],
  ][kind % 5];
  for (let i = 0; i < 14; i++) {
    const x = 1 + Math.floor(r() * (w - 4));
    const y = 1 + Math.floor(r() * (h - 4));
    const long = kind % 5 === 1;
    ctx.fillStyle = veg[1];
    ctx.fillRect(x, y + 1, long ? 4 : 3, 2);
    ctx.fillStyle = veg[0];
    ctx.fillRect(x, y, long ? 4 : 3, 2);
    ctx.fillStyle = veg[2];
    ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = veg[3];
    ctx.fillRect(x + 1, y, 1, 1);
  }
};

const basketSide: Painter = (ctx, w, h) => {
  ctx.fillStyle = '#8A5A3A';
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 2) {
    ctx.fillStyle = (x / 2) % 2 ? '#C8A06A' : '#A87A4A';
    ctx.fillRect(x, 0, 1, h);
  }
  for (let y = 2; y < h; y += 3) {
    ctx.fillStyle = '#6A4A2A';
    ctx.fillRect(0, y, w, 1);
  }
  ctx.fillStyle = '#E8C890';
  ctx.fillRect(0, 0, w, 1);
};

/** A person in the cab: their 2D frame facing east (the way the truck goes), redrawn as they breathe. */
class CabPerson {
  readonly mesh: THREE.Mesh;
  private readonly c: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tex: THREE.CanvasTexture;
  private readonly sprite: CharSprite | null;
  private last: HTMLCanvasElement | null = null;
  /** The frame's rows above the head (the rig's headroom), cut off. */
  private top = -1;

  constructor(
    id: string,
    readonly x: number,
    readonly z: number,
    /** Where the top of the head is (units over the bed's floor). */
    readonly head: number,
    /** Paint the arms reaching forward to the wheel. */
    readonly driving: boolean,
  ) {
    this.sprite = hasChar(id) ? charSprite(id) : null;
    const f = this.sprite ? idleFrame(this.sprite, 'right', 0) : null;
    const w = (f?.width ?? 16) + 4;
    const h = f?.height ?? 24;
    [this.c, this.ctx] = canvas(w, h);
    this.ctx.imageSmoothingEnabled = false;
    this.tex = pixelTexture(this.c);
    const mat = new THREE.MeshLambertMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(w / 16, (h / 16) * SV).translate(0, ((h / 16) * SV) / 2, 0);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, 0, z);
  }

  update(t: number, bob: number): void {
    if (!this.sprite) return;
    const f = idleFrame(this.sprite, 'right', t);
    if (f !== this.last) {
      this.last = f;
      if (this.top < 0) this.top = topRow(f);
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.c.width, this.c.height);
      ctx.drawImage(f, 0, -this.top);
      if (this.driving) {
        // the forearms out to the wheel, the hands on its rim
        const fh = f.height - this.top;
        const sy = Math.round(fh * 0.45);
        const sx = Math.round(f.width * 0.5);
        ctx.fillStyle = '#5A4A32';
        ctx.fillRect(sx, sy + 1, 6, 2);
        ctx.fillStyle = '#8A7A4A';
        ctx.fillRect(sx, sy, 6, 2);
        ctx.fillStyle = '#A8986A';
        ctx.fillRect(sx + 1, sy, 4, 1);
        ctx.fillStyle = '#C98A6A';
        ctx.fillRect(sx + 6, sy - 1, 2, 3);
        ctx.fillStyle = '#A86A4E';
        ctx.fillRect(sx + 6, sy + 1, 2, 1);
      }
      this.tex.needsUpdate = true;
    }
    // (the picture is drawn `top` rows up, so the top of the head is the plane's top edge)
    this.mesh.position.y = this.head - (this.c.height / 16) * SV + bob;
  }

  dispose(): void {
    this.tex.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** The first row of a picture with anything in it. */
function topRow(c: HTMLCanvasElement): number {
  const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data;
  if (!d) return 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 20) return y;
  return 0;
}

/** Builds the truck into `g` (static: the land moves, not the truck). Returns what turns and what shakes. */
function buildTruck(g: THREE.Group, k: Kit, kairan: boolean): { wheels: THREE.Mesh[]; shake: THREE.Object3D[]; wheel: THREE.Mesh } {
  const olive = k.col(OLIVE, false);
  const oliveDk = k.col(OLIVE_DK, false);
  const steel = k.col('#9AA0A8', false);
  const dark = k.col('#2A2A30', false);
  // ---- the bed: the floor (its top is y 0, where the people stand) and its frame under it
  const floorTex = k.texMat('floor', 160, 92, floorPaint);
  slab(g, k, [oliveDk, oliveDk, floorTex, dark, oliveDk, oliveDk], BX0, BX1, -0.16, 0, BZ0, BZ1);
  slab(g, k, dark, BX0 + 0.4, BX1 + 2.8, -0.42, -0.16, 1.4, 1.75);
  slab(g, k, dark, BX0 + 0.4, BX1 + 2.8, -0.42, -0.16, 4.4, 4.75);
  // the shade under the bed: the fuel tank, the spare tyre, the exhaust
  slab(g, k, k.col('#26242C', false), BX0 + 0.3, BX1 - 0.2, -0.5, -0.16, BZ0 + 0.5, BZ1 - 0.5, false);
  slab(g, k, k.col('#3A3F48'), 4.2, 5.6, -0.62, -0.2, BZ1 - 1.4, BZ1 - 0.6);
  // the cross members' ends showing under the gates
  for (let x = 1; x < 9.6; x += 2) slab(g, k, oliveDk, x, x + 0.14, -0.3, -0.16, BZ0 + 0.05, BZ1 - 0.05, false);
  // ---- the gates (あおり): far (the chalk はなまる inside), near (the name outside), tail
  const gw = 228;
  const gFar = k.texMat('gate_far', gw, 10, gatePaint(true, false));
  const gNear = k.texMat('gate_near', gw, 10, gatePaint(false, true));
  const gPlain = k.texMat('gate', gw, 10, gatePaint(false, false));
  const gEnd = k.texMat('gate_end', 132, 10, gatePaint(false, false));
  const top = k.col('#9AAA5A', false);
  slab(g, k, [oliveDk, oliveDk, top, oliveDk, gFar, gPlain], BX0, BX1, 0, GH, BZ0, BZ0 + 0.1);
  slab(g, k, [oliveDk, oliveDk, top, oliveDk, gNear, gPlain], BX0, BX1, 0, GH, BZ1 - 0.1, BZ1);
  slab(g, k, [gEnd, gEnd, top, oliveDk, oliveDk, oliveDk], BX0, BX0 + 0.1, 0, GH, BZ0 + 0.1, BZ1 - 0.1);
  // the gates' hinge posts at the corners, the latches of the tail gate
  for (const [x, z] of [[BX0, BZ0], [BX0, BZ1 - 0.1], [BX1 - 0.12, BZ0], [BX1 - 0.12, BZ1 - 0.1]]) slab(g, k, oliveDk, x - 0.02, x + 0.14, -0.16, GH + 0.04, z - 0.02, z + 0.12);
  for (const z of [BZ0 + 0.3, BZ1 - 0.4]) slab(g, k, steel, BX0 - 0.05, BX0, GH - 0.14, GH - 0.06, z, z + 0.1, false);
  // tail lamps, the yellow kei plate, the bumper, the mud flaps
  for (const z of [BZ0 + 0.15, BZ1 - 0.45]) {
    slab(g, k, k.col('#E84E3C', false), BX0 - 0.06, BX0, -0.36, -0.2, z, z + 0.3, false);
    slab(g, k, k.col('#F2A23A', false), BX0 - 0.06, BX0, -0.36, -0.2, z + 0.3, z + 0.38, false);
  }
  slab(g, k, k.col('#F2D23A', false), BX0 - 0.05, BX0, -0.42, -0.2, 2.75, 3.4, false);
  slab(g, k, dark, BX0 - 0.1, BX0 + 0.2, -0.52, -0.42, BZ0 + 0.1, BZ1 - 0.1);
  for (const z of [BZ0 + 0.05, BZ1 - 0.35]) slab(g, k, dark, 2.75, 2.8, -0.75, -0.3, z, z + 0.3, false);
  // ---- the wheels (rear under the bed, front under the cab), turning
  const tire = k.geo(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.28, 14).rotateX(Math.PI / 2));
  const hub = k.geo(new THREE.CylinderGeometry(WHEEL_R * 0.5, WHEEL_R * 0.5, 0.3, 6).rotateX(Math.PI / 2));
  const wheels: THREE.Mesh[] = [];
  for (const x of [2.1, 11.7])
    for (const z of [BZ0 + 0.25, BZ1 - 0.25]) {
      const w = new THREE.Mesh(tire, dark);
      w.position.set(x, ROAD_Y + WHEEL_R, z);
      w.castShadow = true;
      const h = new THREE.Mesh(hub, k.col('#C8CCD2'));
      w.add(h);
      g.add(w);
      wheels.push(w);
    }
  // ---- the headboard guard (鳥居) over the cab's back window: steel pipes
  const pipe = k.geo(new THREE.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, 0.5, 0));
  const pipeMat = k.col('#B8BCC4', false);
  for (const z of [BZ0 + 0.08, BZ1 - 0.08]) put(g, pipe, pipeMat, BX1 - 0.12, 0, z, 1, ROOF + 0.12, 1);
  put(g, pipe, pipeMat, BX1 - 0.12, ROOF + 0.12, BZ0 + 0.08, 1, BZ1 - BZ0 - 0.16, 1).rotation.x = Math.PI / 2;
  put(g, pipe, pipeMat, BX1 - 0.12, GH, BZ0 + 0.08, 1, BZ1 - BZ0 - 0.16, 1).rotation.x = Math.PI / 2;
  for (let z = BZ0 + 0.9; z < BZ1 - 0.5; z += 0.85) put(g, pipe, pipeMat, BX1 - 0.12, GH, z, 0.8, ROOF + 0.12 - GH, 0.8);
  // ---- the cab: the body to the window line, the pillars, the roof, the glass
  const door = k.texMat('door', 64, 20, doorPaint);
  const front = k.texMat('front', 84, 20, frontPaint);
  // (no lid: the cab's inside shows through the open window)
  const none = new THREE.MeshBasicMaterial({ visible: false });
  slab(g, k, [front, olive, none, dark, door, door], CX0, CX1, -0.6, SILL, BZ0, BZ1);
  // the door's inner skin and the window channel
  slab(g, k, k.col('#4A5A22', false), CX0 + 0.16, CX1 - 0.3, -0.2, SILL, BZ1 - 0.12, BZ1 - 0.08, false);
  // the bumper and the step under the door
  slab(g, k, k.col('#C8CCD2', false), CX1, CX1 + 0.14, -0.62, -0.42, BZ0 - 0.05, BZ1 + 0.05);
  slab(g, k, dark, CX0 + 0.3, CX1 - 0.4, -0.64, -0.56, BZ1, BZ1 + 0.12);
  // the cab's upper frame: the rear pillars, the rear window's top and bottom, the front pillars (slanted)
  for (const [z0, z1] of [[BZ0, BZ0 + 0.16], [BZ1 - 0.16, BZ1]]) {
    slab(g, k, olive, CX0, CX0 + 0.16, SILL, ROOF, z0, z1);
    const a = slab(g, k, olive, CX1 - 0.32, CX1 - 0.18, SILL, ROOF + 0.02, z0, z1);
    a.rotation.z = 0.28;
  }
  slab(g, k, olive, CX0, CX0 + 0.1, SILL, SILL + 0.12, BZ0, BZ1);
  slab(g, k, olive, CX0, CX0 + 0.1, ROOF - 0.1, ROOF, BZ0, BZ1);
  slab(g, k, [olive, olive, k.col('#9AAA5A', false), olive, olive, olive], CX0 - 0.02, CX1 - 0.5, ROOF, ROOF + 0.1, BZ0 - 0.02, BZ1 + 0.02);
  // the driver's door: its window is down — just the sill; the passenger's is glass
  slab(g, k, k.col('#2A2440', false), CX0 + 0.16, CX1 - 0.3, SILL, SILL + 0.04, BZ1 - 0.08, BZ1);
  const glass = new THREE.MeshLambertMaterial({ color: new THREE.Color('#9CC8E0'), transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const pane = (w: number, h: number) => k.geo(new THREE.PlaneGeometry(w, h));
  const back = new THREE.Mesh(pane(BZ1 - BZ0 - 0.32, ROOF - SILL - 0.22), glass);
  back.rotation.y = -Math.PI / 2;
  back.position.set(CX0 + 0.05, (SILL + 0.12 + ROOF - 0.1) / 2, (BZ0 + BZ1) / 2);
  g.add(back);
  const side = new THREE.Mesh(pane(CX1 - CX0 - 0.75, ROOF - SILL), glass);
  side.position.set((CX0 + CX1 - 0.6) / 2, (SILL + ROOF) / 2, BZ0 + 0.02);
  g.add(side);
  const shield = new THREE.Mesh(pane(BZ1 - BZ0 - 0.3, (ROOF - SILL) / Math.cos(0.28)), glass);
  shield.rotation.y = Math.PI / 2;
  shield.rotation.x = 0;
  shield.rotation.order = 'YXZ';
  shield.rotation.x = -0.28;
  shield.position.set(CX1 - 0.18 - Math.tan(0.28) * ((ROOF - SILL) / 2), (SILL + ROOF) / 2, (BZ0 + BZ1) / 2);
  g.add(shield);
  // the mirrors on their stalks
  for (const [z, s] of [[BZ1 + 0.28, 1], [BZ0 - 0.28, -1]] as const) {
    slab(g, k, dark, CX1 - 0.4, CX1 - 0.34, SILL - 0.1, SILL + 0.02, z - 0.18 * s - 0.03, z - 0.18 * s + 0.03);
    slab(g, k, dark, CX1 - 0.44, CX1 - 0.3, SILL, SILL + 0.3, z - 0.1, z + 0.1);
  }
  // ---- inside: the floor, the bench seat, the dashboard, the wheel
  slab(g, k, k.col('#3A3F48'), CX0 + 0.1, CX1 - 0.1, -0.3, -0.25, BZ0 + 0.1, BZ1 - 0.1, false);
  slab(g, k, k.col('#4A5068'), CX0 + 0.12, CX0 + 0.4, -0.25, 1.3, BZ0 + 0.3, BZ1 - 0.3);
  for (const z of [BZ0 + 1.6, BZ1 - 0.9]) slab(g, k, k.col('#4A5068'), CX0 + 0.14, CX0 + 0.36, 1.35, 1.6, z - 0.35, z + 0.35);
  slab(g, k, k.col('#3A3F48'), CX0 + 0.4, CX0 + 1.1, -0.25, 0.1, BZ0 + 0.3, BZ1 - 0.3, false);
  slab(g, k, k.col('#2A2A30'), CX1 - 0.75, CX1 - 0.25, 0.15, SILL + 0.12, BZ0 + 0.15, BZ1 - 0.15);
  // (a towel over the dashboard, the delivery slips on a clip)
  slab(g, k, k.col('#F4F1E8'), CX1 - 0.7, CX1 - 0.45, SILL + 0.12, SILL + 0.16, BZ0 + 1.0, BZ0 + 1.9, false);
  slab(g, k, k.col('#E8E4D8'), CX1 - 0.62, CX1 - 0.48, SILL + 0.12, SILL + 0.2, BZ1 - 1.6, BZ1 - 1.3, false);
  const wz = BZ1 - 0.36;
  const column = put(g, pipe, k.col('#2A2A30'), CX1 - 0.55, 0.42, wz, 1.4, 0.6, 1.4, false);
  column.rotation.z = 0.9;
  column.position.y = SILL - 0.1;
  const wheel = new THREE.Mesh(k.geo(new THREE.TorusGeometry(0.2, 0.035, 6, 16)), k.col('#2A2A30'));
  wheel.rotation.order = 'YXZ';
  wheel.rotation.y = Math.PI / 2;
  wheel.rotation.x = -0.45;
  wheel.position.set(DRIVER_X + 0.38, SILL + 0.26, wz);
  // his right elbow out on the open window's sill (a hot day, the window down)
  slab(g, k, k.col('#8A7A4A'), DRIVER_X - 0.32, DRIVER_X - 0.02, SILL + 0.02, SILL + 0.13, BZ1 - 0.12, BZ1 + 0.1);
  slab(g, k, k.col('#C98A6A'), DRIVER_X - 0.02, DRIVER_X + 0.1, SILL + 0.03, SILL + 0.12, BZ1 - 0.06, BZ1 + 0.08, false);
  g.add(wheel);
  // ---- the load: the yellow crates (two tiers), their vegetables, the ropes, the basket, a folded tarp
  const side2 = k.texMat('crate', 15, 8, crateSide);
  const shake: THREE.Object3D[] = [];
  const crate = (tx: number, tz: number, tier: number, kind: number) => {
    const topM = k.texMat(`crate_top${kind % 5}`, 15, 15, crateTop(kind));
    const m = slab(g, k, [side2, side2, topM, side2, side2, side2], tx + 0.06, tx + 0.94, tier * 0.44, tier * 0.44 + 0.43, tz + 0.08, tz + 0.92);
    shake.push(m);
  };
  for (let i = 0; i < 6; i++) crate(1 + i, 1, 0, i);
  for (let i = 0; i < 5; i++) crate(1 + i, 1, 1, i + 2);
  for (let i = 0; i < 2; i++) {
    crate(1 + i, 2, 0, i + 3);
    crate(1 + i, 2, 1, i + 1);
  }
  // the ropes: from the far gate's hooks over the stack, down to its foot, and once along its top
  const rope = k.col('#E8D8A0');
  const tube = (pts: [number, number, number][]) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const m = new THREE.Mesh(k.geo(new THREE.TubeGeometry(curve, 24, 0.022, 4, false)), rope);
    m.castShadow = true;
    g.add(m);
  };
  for (const x of [1.95, 3.9, 5.5]) tube([[x, GH, BZ0 + 0.1], [x, 0.92, 1.1], [x, 0.92, 1.95], [x + 0.02, 0.9, x < 3 ? 2.95 : 2.0], [x + 0.04, x < 3 ? 0.5 : 0.44, x < 3 ? 3.0 : 2.05], [x + 0.06, 0.06, x < 3 ? 3.05 : 2.1]]);
  tube([[BX0 + 0.1, GH, 1.5], [1.05, 0.9, 1.5], [3.5, 0.91, 1.48], [5.95, 0.91, 1.52], [6.4, 0.5, 1.5], [7.1, 0.04, 1.5]]);
  // the knot on the floor ring and the coil of spare rope by the tail gate
  slab(g, k, k.col('#C8CCD2'), 7.05, 7.2, 0, 0.04, 1.45, 1.6, false);
  const coil = new THREE.Mesh(k.geo(new THREE.TorusGeometry(0.22, 0.05, 5, 12).rotateX(Math.PI / 2)), rope);
  coil.position.set(BX0 + 0.45, 0.05, BZ1 - 0.45);
  coil.castShadow = true;
  g.add(coil);
  // the blue tarp, folded in the corner by the cab
  slab(g, k, k.col('#3A6AC8'), 7.4, 8.8, 0, 0.1, BZ0 + 0.15, BZ0 + 0.85);
  slab(g, k, k.col('#5A8AE0'), 7.45, 8.75, 0.1, 0.13, BZ0 + 0.2, BZ0 + 0.8, false);
  // 星見台's cabbages in the basket (5–6, 4)
  const bas = k.texMat('basket', 28, 6, basketSide);
  const basket = slab(g, k, [bas, bas, k.col('#5A3A2A'), bas, bas, bas], 5.06, 6.94, 0, 0.36, 4.1, 4.9);
  shake.push(basket);
  const cab = k.col('#9BCB6B');
  const cabDk = k.col('#6FA850');
  for (const [x, z, r] of [[5.35, 4.35, 0.2], [5.8, 4.3, 0.22], [6.3, 4.4, 0.21], [6.65, 4.65, 0.19], [5.5, 4.7, 0.21], [6.05, 4.7, 0.22]] as const) {
    const m = put(g, k.ball, (x * 10) % 2 > 1 ? cab : cabDk, x, 0.38, z, r, r * 0.85, r);
    shake.push(m);
  }
  // S14: the black 回覧板's corner, 2 px under the basket (60 9.2)
  if (kairan) slab(g, k, k.col('#2A2440'), 4.92, 5.1, 0, 0.025, 4.62, 4.86, false);
  return { wheels, shake, wheel };
}

// ---------------------------------------------------------------- the land

/** The road: two lanes of asphalt, the edge line by the truck, the centre line's dashes. */
const roadPaint: Painter = (ctx, w, h) => {
  // 8 units (x) × 16 units (z −0.9..15.1); 8 px a unit
  ctx.fillStyle = '#6B6F7E';
  ctx.fillRect(0, 0, w, h);
  noise(ctx, w, h, ['#7A7E8E', '#5E6272', '#82869A', '#646878'], w * h * 0.25, 4242);
  // the north edge line (solid) and the centre line (dashed)
  ctx.fillStyle = '#E8E4D8';
  ctx.fillRect(0, 2, w, 1);
  ctx.fillRect(0, 66, 26, 2);
  // a patch of new asphalt and a crack sealed in tar
  ctx.fillStyle = '#5A5E6C';
  ctx.fillRect(40, 100, 18, 9);
  ctx.fillStyle = '#3A3F48';
  ctx.fillRect(10, 30, 1, 6);
  ctx.fillRect(11, 36, 1, 4);
  // the south lane's edge line
  ctx.fillStyle = '#E8E4D8';
  ctx.fillRect(0, h - 4, w, 1);
};

function groundPaint(kind: Kind): Painter {
  return (ctx, w, h) => {
    // w: L units × 8 px; h: the depth × 8 px; the road's side at the bottom (y = h)
    const r = rng(kind.length * 977 + w);
    const bottom = (rows: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, h - rows, w, rows);
    };
    if (kind === 'paddy') {
      // the rice in ear (1 September: green going gold), its rows; the ridges (あぜ) between the fields
      ctx.fillStyle = '#9AAE48';
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) {
        ctx.fillStyle = y % 4 ? '#8AA040' : '#A8B850';
        ctx.fillRect(0, y, w, 1);
      }
      noise(ctx, w, h, ['#D8C860', '#C8B850', '#E0D070', '#7A9038'], w * h * 0.12, 31);
      for (let y = h - 40; y > 0; y -= 56) {
        ctx.fillStyle = '#7A9A4A';
        ctx.fillRect(0, y, w, 3);
        ctx.fillStyle = '#9A8A5A';
        ctx.fillRect(0, y + 1, w, 1);
      }
      ctx.fillStyle = '#7A9A4A';
      ctx.fillRect(0, 0, 3, h);
      ctx.fillStyle = '#9A8A5A';
      ctx.fillRect(1, 0, 1, h);
      // the concrete channel along the road, its water catching the sky; the grass verge
      bottom(14, '#6FA050');
      ctx.fillStyle = '#B8B4AC';
      ctx.fillRect(0, h - 11, w, 6);
      ctx.fillStyle = '#5A8AA8';
      ctx.fillRect(0, h - 10, w, 4);
      ctx.fillStyle = '#9CC8E0';
      for (let x = 0; x < w; x += 9) ctx.fillRect(x + Math.floor(r() * 4), h - 9, 3, 1);
      noise(ctx, w, 4, ['#5FA85A', '#8ACB6B'], w, 7);
      return;
    }
    if (kind === 'town') {
      // gravel lots, gardens, the narrow strip by the road
      ctx.fillStyle = '#6FA050';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, ['#5F9A4A', '#7FB060', '#8A9A5A'], w * h * 0.2, 55);
      // the yards' gravel and the drives to the road
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#B9A98A' : '#C8BCA0';
        ctx.fillRect(Math.floor(r() * w), Math.floor(h * 0.5 + r() * (h * 0.4)), 14 + Math.floor(r() * 18), 8 + Math.floor(r() * 10));
      }
      ctx.fillStyle = '#A8A49C';
      ctx.fillRect(Math.floor(w * 0.15), Math.floor(h * 0.75), 10, Math.ceil(h * 0.25));
      // the fields behind the houses
      ctx.fillStyle = '#8AA048';
      ctx.fillRect(0, 0, w, Math.round(h * 0.45));
      for (let y = 0; y < h * 0.45; y += 3) {
        ctx.fillStyle = '#7A9038';
        ctx.fillRect(0, y, w, 1);
      }
      bottom(10, '#A8A49C');
      ctx.fillStyle = '#C8C4BC';
      ctx.fillRect(0, h - 10, w, 1);
      ctx.fillStyle = '#5A8A4A';
      ctx.fillRect(0, h - 12, w, 2);
      return;
    }
    if (kind === 'minato') {
      // the quay's concrete, the bollards' paint, the harbour's edge far side
      ctx.fillStyle = '#A8A49C';
      ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, ['#9A968E', '#B8B4AC', '#8A867E'], w * h * 0.2, 66);
      for (let x = 0; x < w; x += 24) {
        ctx.fillStyle = '#8A867E';
        ctx.fillRect(x, 0, 1, h);
      }
      ctx.fillStyle = '#E8E4D8';
      ctx.fillRect(0, 2, w, 1);
      bottom(8, '#9A968E');
      return;
    }
    // the verge (the mountain road, the pass, the sea road, the cape's slope): grass and gravel, the gutter
    ctx.fillStyle = kind === 'umi' ? '#C8B488' : '#5FA85A';
    ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, kind === 'umi' ? ['#B8A478', '#D8C498', '#8A9A5A'] : ['#4A8A4A', '#7AB86A', '#3A7A3A'], w * h * 0.25, 77);
    ctx.fillStyle = '#9A968E';
    ctx.fillRect(0, h - 6, w, 4);
    ctx.fillStyle = '#6B6F7E';
    ctx.fillRect(0, h - 5, w, 1);
  };
}

/** The 法面 of the cutting: the concrete lattice, grass in its squares. */
const latticePaint: Painter = (ctx, w, h) => {
  ctx.fillStyle = '#5A9A4A';
  ctx.fillRect(0, 0, w, h);
  noise(ctx, w, h, ['#4A8A3A', '#6AAA5A', '#3A7A3A'], w * h * 0.3, 88);
  ctx.fillStyle = '#C8C4BC';
  for (let x = 0; x < w; x += 12) ctx.fillRect(x, 0, 2, h);
  for (let y = 0; y < h; y += 12) ctx.fillRect(0, y, w, 2);
  ctx.fillStyle = '#9A968E';
  for (let x = 1; x < w; x += 12) ctx.fillRect(x, 0, 1, h);
};

const seaPaint: Painter = (ctx, w, h) => {
  ctx.fillStyle = '#3A7EA8';
  ctx.fillRect(0, 0, w, h);
  const r = rng(303);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * w);
    const y = Math.floor(r() * h);
    ctx.fillStyle = i % 4 === 0 ? '#C8E4F4' : i % 2 ? '#5AA0C8' : '#2E6A92';
    ctx.fillRect(x, y, 3 + Math.floor(r() * 5), 1);
  }
};

const wallPaint = (kind: number): Painter => (ctx, w, h) => {
  // 0 white plaster, 1 焼き杉 boards, 2 the little shop's front
  const wood = kind === 1;
  ctx.fillStyle = wood ? '#3A3530' : kind === 2 ? '#E8E4D8' : '#EDE6D6';
  ctx.fillRect(0, 0, w, h);
  if (wood) for (let x = 0; x < w; x += 3) {
    ctx.fillStyle = '#2A2622';
    ctx.fillRect(x, 0, 1, h);
  }
  else noise(ctx, w, h, ['#D8D0C0', '#F4F1E8'], w * 2, 12);
  // windows, a door
  ctx.fillStyle = '#2A3A4A';
  ctx.fillRect(3, 3, 6, 4);
  ctx.fillRect(w - 10, 3, 6, 4);
  ctx.fillStyle = '#9CC8E0';
  ctx.fillRect(4, 4, 2, 1);
  ctx.fillRect(w - 9, 4, 2, 1);
  ctx.fillStyle = wood ? '#C8C4B8' : '#8A5A3A';
  ctx.fillRect(Math.round(w / 2) - 3, h - 9, 6, 9);
  if (kind === 2) {
    // the shop's awning stripes and its sign board
    for (let x = 0; x < w; x += 4) {
      ctx.fillStyle = (x / 4) % 2 ? '#E84E3C' : '#F4F1E8';
      ctx.fillRect(x, 0, 4, 2);
    }
    ctx.fillStyle = '#2F4A8A';
    ctx.fillRect(Math.round(w / 2) - 8, 2, 16, 3);
  }
  // the skirting
  ctx.fillStyle = wood ? '#1E1B18' : '#8A867E';
  ctx.fillRect(0, h - 1, w, 1);
};

interface Chunk {
  kind: Kind;
  x: number;
  g: THREE.Group;
  serial: number;
}

/** The sky's backdrop far north: the hour's gradient, a cloud or two, the far land at its foot. */
function skyPaint(top: string, bot: string, haze: string, land: 'mount' | 'sea'): Painter {
  return (ctx, w, h) => {
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top);
    gr.addColorStop(0.72, bot);
    gr.addColorStop(1, haze);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [x, y, cw] of [[40, 30, 40], [170, 22, 54], [300, 36, 30], [420, 26, 46]]) {
      ctx.fillRect(x, y, cw, 4);
      ctx.fillRect(x + 6, y - 3, cw - 16, 3);
      ctx.fillRect(x + 12, y - 5, cw / 3, 2);
    }
    if (land === 'mount') {
      ctx.fillStyle = 'rgba(120,150,170,0.55)';
      for (let x = 0; x < w; x++) {
        const hh = 8 + Math.sin(x / 31) * 5 + Math.sin(x / 11) * 2;
        ctx.fillRect(x, h - 14 - hh, 1, hh + 14);
      }
    }
  };
}

// ---------------------------------------------------------------- the world

interface Lens {
  yaw: number;
  pitch: number;
  dist: number;
  fov: number;
  x: number;
  y: number;
  z: number;
}

export class NidaiWorld {
  readonly group = new THREE.Group();
  readonly cutouts: CutoutView[] = [];
  readonly spots: LightSpot[] = [];
  readonly solids: Solid[] = [];
  readonly buildParts: Record<string, number> = {};
  private readonly k = new Kit();
  /** The land (bobs under the truck). */
  private readonly land = new THREE.Group();
  private readonly truck = new THREE.Group();
  private readonly chunks: Chunk[] = [];
  private readonly far: Chunk[] = [];
  private serial = 0;
  private readonly roadTex: THREE.CanvasTexture;
  private readonly seaTex: THREE.CanvasTexture;
  private readonly sea: THREE.Mesh;
  private readonly sky: THREE.Mesh;
  private skyKey = '';
  private readonly wheels: THREE.Mesh[];
  private readonly shake: THREE.Object3D[];
  private readonly shakeY: number[];
  private readonly steer: THREE.Mesh;
  readonly people: CabPerson[] = [];
  private view = -1;
  private viewAt = 0;
  private lastT = -1;
  /** The road gone by (units) and the speed now (units/s). */
  private s = 0;
  private speed = 7;
  private lens: Lens | null = null;
  private saved: { sun: THREE.Color; sky: THREE.Color; ground: THREE.Color; sunRef: THREE.DirectionalLight; hemiRef: THREE.HemisphereLight } | null = null;

  constructor(
    readonly f: FieldScene,
    readonly lightQuality = false,
  ) {
    const t0 = performance.now();
    const k = this.k;
    this.group.add(this.land, this.truck);
    // the road (one long strip; its picture slides)
    this.roadTex = k.tex('road', 64, 128, roadPaint, true);
    this.roadTex.repeat.set(160 / 8, 1);
    const road = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(160, 16).rotateX(-Math.PI / 2)), new THREE.MeshLambertMaterial({ map: this.roadTex }));
    road.position.set(20, ROAD_Y, 7.1);
    road.receiveShadow = true;
    this.land.add(road);
    // past the south lane: the verge and its grass (rarely in sight)
    const southTex = k.tex('south', 32, 32, groundPaint('saka'), true);
    southTex.repeat.set(160 / 4, 4);
    const south = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(160, 16).rotateX(-Math.PI / 2)), new THREE.MeshLambertMaterial({ map: southTex }));
    south.position.set(20, ROAD_Y - 0.02, 23.1);
    south.receiveShadow = true;
    this.land.add(south);
    // the sea, under everything north (the land's chunks cover it where there is land)
    this.seaTex = k.tex('sea', 64, 64, seaPaint, true);
    this.seaTex.repeat.set(260 / 12, 130 / 12);
    this.sea = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(260, 130).rotateX(-Math.PI / 2)), new THREE.MeshLambertMaterial({ map: this.seaTex }));
    this.sea.position.set(30, SEA_Y, -1 - 65);
    this.sea.receiveShadow = true;
    this.land.add(this.sea);
    // the sky's backdrop
    this.sky = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(420, 90)), new THREE.MeshBasicMaterial({ fog: false, depthWrite: false }));
    this.sky.position.set(40, SEA_Y + 45 - 1, SKY_Z);
    this.sky.renderOrder = -1;
    this.group.add(this.sky);
    // the truck
    const kairan = f.props.some((p) => p.obj.t === 'prop' && p.obj.prop === 'prop_c3_nidai_kairan' && p.present);
    const tr = buildTruck(this.truck, k, kairan);
    this.wheels = tr.wheels;
    this.shake = tr.shake;
    this.shakeY = tr.shake.map((o) => o.position.y);
    this.steer = tr.wheel;
    // ツガオ at the wheel (the driver's side: south, Japan), ポコシャ and ぴーちゃん beside him
    const ts = new CabPerson('npc_tsugao', DRIVER_X, BZ1 - 0.3, ROOF - 0.3, true);
    const po = new CabPerson('npc_pokosha', CX0 + 0.95, BZ0 + 1.6, ROOF - 0.2, false);
    this.people.push(ts, po);
    for (const p of this.people) this.truck.add(p.mesh);
    bake(this.truck, new Set<THREE.Object3D>([...tr.wheels, ...tr.shake, tr.wheel, ...this.people.map((p) => p.mesh)]));
    this.buildParts.truck = Math.round(performance.now() - t0);
    this.view = flag('flag_c3_nidai_view');
    this.fill();
    this.buildParts.land = Math.round(performance.now() - t0);
  }

  // ---- the land's chunks

  /** The stretch a chunk starting at x will be when it gets to the truck. */
  private kindAt(x: number, now: number): Kind {
    return zoneOf(this.view, Math.max(0, now - this.viewAt) + (x + L / 2 - 6) / Math.max(1, this.speed));
  }

  private fill(): void {
    for (const c of this.chunks) this.drop(c);
    for (const c of this.far) this.drop(c);
    this.chunks.length = 0;
    this.far.length = 0;
    const now = Math.max(0, this.lastT);
    for (let x = BACK; x < AHEAD; x += L) this.chunks.push(this.make(this.kindAt(x, now), x));
    for (let x = FAR_BACK; x < FAR_AHEAD; x += FAR_L) this.far.push(this.makeFar(x));
    this.paintSky();
  }

  private drop(c: Chunk): void {
    this.land.remove(c.g);
    c.g.traverse((o) => {
      // (the kit's shared pieces stay; only a chunk's own wires are its own)
      if (o instanceof THREE.Line || ((o instanceof THREE.Mesh) && o.geometry.userData.own)) o.geometry.dispose();
    });
  }

  private make(kind: Kind, x: number): Chunk {
    const g = new THREE.Group();
    g.position.x = x;
    const serial = this.serial++;
    const r = rng(serial * 7919 + kind.length);
    const k = this.k;
    const depth = kind === 'umi' || kind === 'touge' || kind === 'saka' ? 3.6 : kind === 'minato' ? 13 : 70;
    const gm = k.texMat(`ground_${kind}_${depth}`, L * 8, Math.round(depth * 8), groundPaint(kind));
    const ground = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(L, depth).rotateX(-Math.PI / 2)), gm);
    ground.position.set(L / 2, ROAD_Y + 0.005, -0.9 - depth / 2);
    ground.receiveShadow = true;
    g.add(ground);
    // the poles and their two wires (to the next chunk's pole, sagging)
    if (POLES.includes(kind)) {
      const pz = -1.5;
      put(g, k.cyl, k.col('#A8A49C'), 1, ROAD_Y, pz, 0.09, 4.6, 0.09);
      put(g, k.box, k.col('#8A867E'), 1, ROAD_Y + 4.05, pz, 0.08, 0.08, 1.3);
      for (const dz of [-0.5, 0.5]) put(g, k.cyl, k.col('#E8E4D8'), 1, ROAD_Y + 4.13, pz + dz, 0.03, 0.08, 0.03, false);
      if (serial % 3 === 0) put(g, k.cyl, k.col('#9AA0A8'), 1.12, ROAD_Y + 3.2, pz + 0.18, 0.18, 0.5, 0.18);
      const wireMat = this.wireMat;
      for (const [dz, y] of [[-0.5, 4.15], [0.5, 4.15], [0, 3.55]] as const) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          pts.push(new THREE.Vector3(1 + u * L, ROAD_Y + y - Math.sin(u * Math.PI) * 0.35, pz + dz));
        }
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
      }
    }
    // the guard rail (white W-beam on its posts), the delineators
    if (RAILS.includes(kind)) {
      const rz = -1.25;
      put(g, k.box, k.col('#E4E8EC', false), L / 2, ROAD_Y + 0.42, rz, L, 0.16, 0.05);
      put(g, k.box, k.col('#B8BCC4', false), L / 2, ROAD_Y + 0.47, rz - 0.01, L, 0.03, 0.06, false);
      for (let px = 0.5; px < L; px += 2) put(g, k.box, k.col('#C8CCD2', false), px, ROAD_Y, rz - 0.06, 0.08, 0.6, 0.08);
      put(g, k.cyl, k.col('#F2A23A', false), 4.5, ROAD_Y + 0.6, rz, 0.04, 0.3, 0.04, false);
    }
    if (kind === 'town') this.town(g, r, false);
    else if (kind === 'minato') this.town(g, r, true);
    else if (kind === 'paddy') this.paddy(g, r, serial);
    else if (kind === 'yama') this.yama(g, r);
    else if (kind === 'touge' || kind === 'saka') this.slope(g, r, kind === 'saka');
    else this.shore(g, r, serial);
    bake(g);
    this.land.add(g);
    return { kind, x, g, serial };
  }

  private tree(g: THREE.Object3D, x: number, z: number, y: number, s: number, col = '#3A7A3A'): void {
    const k = this.k;
    put(g, k.cyl, k.col('#7A4A3A'), x, y, z, 0.1 * s, 0.9 * s, 0.1 * s);
    put(g, k.ball, k.col(col), x, y + 1.3 * s, z, 0.75 * s, 0.7 * s, 0.75 * s);
    put(g, k.ball, k.col('#5A9A4A'), x - 0.25 * s, y + 1.55 * s, z + 0.2 * s, 0.4 * s, 0.35 * s, 0.4 * s, false);
  }

  private pine(g: THREE.Object3D, x: number, z: number, y: number, s: number): void {
    const k = this.k;
    const t = put(g, k.cyl, k.col('#7A4A3A'), x, y, z, 0.09 * s, 2.2 * s, 0.09 * s);
    t.rotation.z = 0.18;
    for (const [dx, dy, r] of [[-0.35, 1.5, 0.75], [0.1, 2.05, 0.6], [0.45, 2.4, 0.45]] as const) put(g, k.ball, k.col('#2E5A3A'), x + dx * s, y + dy * s, z, r * s, 0.28 * s, r * 0.8 * s);
  }

  private cedar(g: THREE.Object3D, x: number, z: number, y: number, s: number): void {
    const k = this.k;
    put(g, k.cyl, k.col('#5A3A2A'), x, y, z, 0.08 * s, 0.5 * s, 0.08 * s);
    put(g, k.cone, k.col('#2E5A3A'), x, y + 0.4 * s, z, 0.55 * s, 2.6 * s, 0.55 * s);
  }

  /** A house: its walls, the gable roof of いぶし瓦 (or 焼き杉 by the harbour). */
  private house(g: THREE.Object3D, x: number, z: number, w: number, d: number, h: number, wall: number, roof: string): void {
    const k = this.k;
    const wm = k.texMat(`wall${wall}`, 32, 18, wallPaint(wall));
    put(g, k.box, wm, x, ROAD_Y, z, w, h, d);
    const rh = d * 0.38;
    const key = `roof_${w}_${d}`;
    const shape = new THREE.Shape([new THREE.Vector2(-d / 2 - 0.25, 0), new THREE.Vector2(d / 2 + 0.25, 0), new THREE.Vector2(0, rh)]);
    let geo = this.roofs.get(key);
    if (!geo) {
      geo = k.geo(new THREE.ExtrudeGeometry(shape, { depth: w + 0.3, bevelEnabled: false }).translate(0, 0, -(w + 0.3) / 2).rotateY(Math.PI / 2));
      this.roofs.set(key, geo);
    }
    const m = new THREE.Mesh(geo, k.col(roof));
    m.position.set(x, ROAD_Y + h, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    // the ridge
    put(g, k.box, k.col('#3A3F48'), x, ROAD_Y + h + rh - 0.04, z, w + 0.34, 0.1, 0.12, false);
  }
  private readonly roofs = new Map<string, THREE.BufferGeometry>();
  /** The overhead wires' line (thin, dark, the fog over them far off). */
  private readonly wireMat = new THREE.LineBasicMaterial({ color: new THREE.Color('#3A3550') });

  private town(g: THREE.Group, r: () => number, harbour: boolean): void {
    const k = this.k;
    // the houses along the road; between them a garden tree, a block wall, a vending machine now and then
    const w = 3.6 + r() * 1.4;
    const x = 2.6 + r() * 2;
    const wall = harbour ? 1 : r() < 0.2 ? 2 : 0;
    this.house(g, x + w / 2, -5.2 - r() * 1.5, Math.round(w * 2) / 2, 3.2, 1.6 + r() * 0.5, wall, harbour ? '#4A4E58' : r() < 0.5 ? '#5A5E66' : '#3A5A8A');
    if (!harbour) {
      // the block wall in front, broken by the gate
      put(g, k.box, k.col('#B8B4AC'), x + 0.6, ROAD_Y, -3.0, 1.8, 0.55, 0.18);
      put(g, k.box, k.col('#B8B4AC'), x + w - 0.3, ROAD_Y, -3.0, 1.4, 0.55, 0.18);
      if (r() < 0.6) this.tree(g, x + w + 1.4, -4.6, ROAD_Y, 0.9 + r() * 0.4, r() < 0.5 ? '#3A7A3A' : '#4A8A3A');
      // a second row of roofs further back, and the hills' trees
      this.house(g, 1 + r() * 8, -11 - r() * 3, 3, 2.8, 1.5, 0, '#5A5E66');
      if (r() < 0.5) put(g, k.box, k.col('#E84E3C', false), x + w + 0.3, ROAD_Y, -2.4, 0.5, 0.95, 0.4);
    } else {
      // by the harbour: the next house close by, fish boxes and a float, the boats beyond the quay
      if (r() < 0.7) this.house(g, x + w + 2.4, -5.0, 2.6, 3, 1.5, 1, '#4A4E58');
      put(g, k.box, k.col('#3A6AC8'), x - 1.2, ROAD_Y, -3.2, 0.5, 0.25, 0.4);
      put(g, k.box, k.col('#E8E4D8'), x - 1.2, ROAD_Y + 0.25, -3.2, 0.5, 0.25, 0.4);
      put(g, k.ball, k.col('#F2A23A'), x - 0.5, ROAD_Y + 0.15, -3.3, 0.18, 0.18, 0.18);
      if (r() < 0.6) {
        const bx = 2 + r() * 7;
        put(g, k.box, k.col('#F4F1E8'), bx, SEA_Y - 0.1, -17 - r() * 4, 2.6, 0.45, 0.9);
        put(g, k.box, k.col('#C8CCD2'), bx + 0.4, SEA_Y + 0.35, -17.2, 0.9, 0.5, 0.6);
      }
      // the quay's bollards
      put(g, k.cyl, k.col('#3A3F48'), 6, ROAD_Y, -13.2, 0.18, 0.3, 0.18);
    }
  }

  private paddy(g: THREE.Group, r: () => number, serial: number): void {
    const k = this.k;
    // the rice standing a little over the field (a second sheet of ears, with holes)
    const ears = k.texMat('ears', 48, 80, (ctx, w, h) => {
      const rr = rng(4);
      for (let i = 0; i < w * h * 0.35; i++) {
        const y = Math.floor(rr() * h);
        // (the ridges between the fields stay bare)
        if (y % 14 === 13) continue;
        ctx.fillStyle = ['#8FB048', '#A8B848', '#7A9A38', '#9AB040', '#C8C050', '#8AA040'][i % 6];
        ctx.fillRect(Math.floor(rr() * w), y, 1, 1);
      }
    }, { alphaTest: 0.5, transparent: false });
    const sheet = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(L, 50).rotateX(-Math.PI / 2)), ears);
    sheet.position.set(L / 2, ROAD_Y + 0.22, -3.2 - 25);
    sheet.receiveShadow = true;
    g.add(sheet);
    // a scarecrow, a farmhouse among its trees far off, the line of the hills
    if (serial % 4 === 1) {
      const sx = 4 + r() * 4;
      put(g, k.cyl, k.col('#7A4A3A'), sx, ROAD_Y, -7, 0.04, 1.3, 0.04);
      put(g, k.box, k.col('#2F4A8A'), sx, ROAD_Y + 0.7, -7, 0.6, 0.06, 0.06);
      put(g, k.box, k.col('#5A7AC8'), sx, ROAD_Y + 0.55, -7, 0.3, 0.45, 0.15);
      put(g, k.cone, k.col('#E8C890'), sx, ROAD_Y + 1.25, -7, 0.32, 0.22, 0.32);
    }
    if (serial % 3 === 0) {
      this.house(g, 5, -24, 3.6, 3, 1.7, 0, '#5A5E66');
      this.tree(g, 2.5, -25, ROAD_Y, 1.5);
      this.tree(g, 8, -26, ROAD_Y, 1.3);
    }
    if (r() < 0.4) this.tree(g, r() * L, -36, ROAD_Y, 1.8);
  }

  private yama(g: THREE.Group, r: () => number): void {
    const k = this.k;
    // the cutting's face (法面 with its concrete lattice) rising from the gutter, the cedars on top
    const lat = k.texMat('lattice', L * 8, 56, latticePaint);
    const H = 4.6;
    const face = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(L, Math.hypot(H, 4.2))), lat);
    face.rotation.x = -Math.atan2(4.2, H);
    face.position.set(L / 2, ROAD_Y + H / 2, -2.2 - 2.1);
    face.receiveShadow = true;
    g.add(face);
    const topM = k.col('#3A6A3A');
    put(g, k.box, topM, L / 2, ROAD_Y, -6.4 - 18, L, H, 36, false);
    for (let i = 0; i < 4; i++) this.cedar(g, 0.6 + i * 3 + r() * 1.5, -6.9 - r() * 2, ROAD_Y + H, 0.9 + r() * 0.4);
    for (let i = 0; i < 3; i++) this.cedar(g, 1 + i * 4 + r() * 2, -10 - r() * 4, ROAD_Y + H, 1.1 + r() * 0.4);
    // a little shrine's red post now and then? no: a road sign (カーブ注意) on its post
    if (r() < 0.25) {
      put(g, k.cyl, k.col('#C8CCD2'), 7, ROAD_Y, -1.6, 0.04, 1.6, 0.04);
      const s = put(g, k.box, k.col('#F2D23A', false), 7, ROAD_Y + 1.5, -1.58, 0.5, 0.5, 0.03, false);
      s.rotation.z = Math.PI / 4;
    }
  }

  /** The pass, the cape's slope: grass falling away north to the sea, trees on it. */
  private slope(g: THREE.Group, r: () => number, pines: boolean): void {
    const k = this.k;
    const drop = ROAD_Y - (SEA_Y - 0.2);
    const run = 16;
    const m = k.col('#5FA85A');
    const s = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(L, Math.hypot(drop, run)).rotateX(-Math.PI / 2)), m);
    s.rotation.x = -Math.atan2(drop, run);
    s.position.set(L / 2, (ROAD_Y + SEA_Y - 0.2) / 2, -4.5 - run / 2);
    s.receiveShadow = true;
    g.add(s);
    for (let i = 0; i < 3; i++) {
      const tz = -6 - r() * 10;
      const ty = ROAD_Y - (((-4.5 - tz) / run) * drop);
      if (pines) this.pine(g, r() * L, tz, ty, 1 + r() * 0.4);
      else this.tree(g, r() * L, tz, ty, 1.2 + r() * 0.5, r() < 0.5 ? '#3A7A3A' : '#2E6A3A');
    }
  }

  /** The sea road: the shore below it — sand, rocks, a pine. */
  private shore(g: THREE.Group, r: () => number, serial: number): void {
    const k = this.k;
    const sand = serial % 3 !== 0;
    const run = 5;
    const drop = ROAD_Y - SEA_Y + 0.05;
    const s = new THREE.Mesh(k.geo(new THREE.PlaneGeometry(L, Math.hypot(drop, run)).rotateX(-Math.PI / 2)), k.col(sand ? '#D8C498' : '#8A867E'));
    s.rotation.x = -Math.atan2(drop, run);
    s.position.set(L / 2, (ROAD_Y + SEA_Y) / 2, -4.5 - run / 2);
    s.receiveShadow = true;
    g.add(s);
    if (!sand) for (let i = 0; i < 6; i++) put(g, k.ball, k.col(i % 2 ? '#6B6A66' : '#8A867E'), r() * L, SEA_Y, -9 - r() * 2, 0.5 + r() * 0.4, 0.45, 0.5 + r() * 0.3);
    else {
      // the wash on the sand
      put(g, k.box, k.col('#F4F1E8', false), L / 2, SEA_Y + 0.01, -9.6, L, 0.02, 0.25, false);
    }
    if (r() < 0.5) this.pine(g, r() * L, -3.1, ROAD_Y, 0.9 + r() * 0.3);
    // a small boat out on the water
    if (serial % 4 === 2) {
      const bx = r() * L;
      put(g, k.box, k.col('#F4F1E8'), bx, SEA_Y - 0.1, -22, 2, 0.4, 0.7);
      put(g, k.box, k.col('#2F4A8A'), bx + 0.3, SEA_Y + 0.3, -22, 0.6, 0.4, 0.5);
    }
  }

  /** The far land: mountains (inland) or islands and the cape (the sea). */
  private makeFar(x: number): Chunk {
    const g = new THREE.Group();
    g.position.x = x;
    const serial = this.serial++;
    const r = rng(serial * 131 + 7);
    const k = this.k;
    const sea = SEA_VIEW(this.view);
    if (!sea) {
      for (let i = 0; i < 3; i++) {
        const h = 10 + r() * 12;
        put(g, k.ball, k.col(i % 2 ? '#4A7A5A' : '#5A8A6A'), r() * FAR_L, ROAD_Y - 2, -62 - r() * 26, 12 + r() * 8, h, 9 + r() * 4, false);
      }
    } else {
      if (r() < 0.6) put(g, k.ball, k.col('#5A7A6A'), r() * FAR_L, SEA_Y - 0.5, -78 - r() * 15, 6 + r() * 6, 2.2 + r() * 2, 3 + r() * 2, false);
      if (this.view === 2 && serial % 2 === 0) {
        // the cape ahead and on it the old white building with its blue band (the old aquarium)
        const cx = FAR_L / 2;
        put(g, k.ball, k.col('#4A7A5A'), cx, SEA_Y - 0.5, -60, 10, 6, 6, false);
        put(g, k.box, k.col('#E8E4D8'), cx, SEA_Y + 4.8, -59, 4, 1.6, 2.4, false);
        put(g, k.box, k.col('#3A7EA8'), cx, SEA_Y + 5.6, -57.79, 4.02, 0.25, 0.02, false);
        put(g, k.box, k.col('#9AA0A8'), cx + 1.3, SEA_Y + 6.4, -59, 0.6, 0.5, 0.6, false);
      }
    }
    bake(g);
    this.land.add(g);
    return { kind: sea ? 'umi' : 'yama', x, g, serial };
  }

  private paintSky(): void {
    const eve = this.evening();
    const sea = SEA_VIEW(this.view);
    const key = `${eve}|${sea}|${this.view}`;
    if (key === this.skyKey) return;
    this.skyKey = key;
    const [top, bot, haze] = this.skyCols();
    const t = this.k.tex(`sky_${key}`, 512, 128, skyPaint(top, bot, haze, sea ? 'sea' : 'mount'));
    const m = this.sky.material as THREE.MeshBasicMaterial;
    m.map = t;
    m.needsUpdate = true;
  }

  /** S32 (stage 4, the ending's way home): the evening. */
  private evening(): boolean {
    return flag('flag_ch3_stage') >= 4;
  }

  /** The sky's top, its foot, and the haze (the fog, the horizon). */
  private skyCols(): [string, string, string] {
    if (this.evening()) return ['#5A6AA8', '#F2A878', '#F4C8A0'];
    if (this.view === 2) return ['#6F9CC8', '#C8DCEA', '#D4DEE6'];
    if (this.view === 1 || this.view === 3) return ['#7FB0DA', '#DCEAF4', '#E6EEF4'];
    return ['#5F9CD8', '#BCDDF2', '#D2E4F0'];
  }

  // ---- each frame

  /** How much the land is down this moment (the truck rocking on the road; a jolt now and then). */
  private bump(t: number): number {
    const s = t / 1000;
    const jolt = (s % 5.3) / 5.3;
    const j = jolt < 0.05 ? Math.sin((jolt / 0.05) * Math.PI) * 0.07 : 0;
    return 0.018 * Math.sin(s * 10.7) + 0.011 * Math.sin(s * 18.3 + 1) + j;
  }

  update(t: number, _sunYaw: number, _sunDir: THREE.Vector3, _lit: number, _tx: number, _tz: number, _hides: unknown): void {
    const now = t / 1000;
    const dt = this.lastT < 0 ? 0 : Math.max(0, Math.min(0.1, now - this.lastT));
    this.lastT = now;
    const v = flag('flag_c3_nidai_view');
    if (v !== this.view) {
      this.view = v;
      this.viewAt = now;
      // what is ahead of the cab becomes the new stretch at once (the pass: the sea all along, 12.2)
      for (let i = 0; i < this.chunks.length; i++) {
        const c = this.chunks[i];
        if (c.x < 14) continue;
        this.drop(c);
        this.chunks[i] = this.make(this.kindAt(c.x, now), c.x);
      }
      for (let i = 0; i < this.far.length; i++) {
        const c = this.far[i];
        this.drop(c);
        this.far[i] = this.makeFar(c.x);
      }
      this.paintSky();
    }
    const want = this.view === 2 ? 5.5 : this.evening() ? 6.5 : 7.5;
    this.speed += (want - this.speed) * Math.min(1, dt * 0.8);
    const dx = this.speed * dt;
    this.s += dx;
    // the near land goes by
    for (let i = 0; i < this.chunks.length; i++) {
      const c = this.chunks[i];
      c.x -= dx;
      c.g.position.x = c.x;
    }
    while (this.chunks.length && this.chunks[0].x + L < BACK) {
      const c = this.chunks.shift()!;
      this.drop(c);
      const x = this.chunks[this.chunks.length - 1].x + L;
      this.chunks.push(this.make(this.kindAt(x, now), x));
    }
    // the far land slowly
    for (const c of this.far) {
      c.x -= dx * 0.12;
      c.g.position.x = c.x;
    }
    while (this.far.length && this.far[0].x + FAR_L < FAR_BACK) {
      const c = this.far.shift()!;
      this.drop(c);
      this.far.push(this.makeFar(this.far[this.far.length - 1].x + FAR_L));
    }
    this.roadTex.offset.x = (this.s / 8) % 1;
    this.seaTex.offset.x = ((this.s * 0.05) / 8 + now * 0.004) % 1;
    this.seaTex.offset.y = (Math.sin(now * 0.5) * 0.01) % 1;
    // the rocking: the land down, the load a little after it
    const b = this.bump(t);
    this.land.position.y = -b;
    this.truck.rotation.x = Math.sin(now * 2.3) * 0.002;
    this.shake.forEach((o, i) => {
      o.position.y = this.shakeY[i] + Math.max(0, this.bump(t - 60 - i * 9) - 0.02) * 0.25;
    });
    for (const w of this.wheels) w.rotation.z -= dx / WHEEL_R;
    // the wheel in ツガオ's hands: small corrections
    this.steer.rotation.z = Math.sin(now * 0.7) * 0.12 + Math.sin(now * 1.9) * 0.04;
    for (const p of this.people) p.update(t, b * 0.3);
  }

  /** The hour's sun and sky light. Returns the sun's yaw (the people's long shadows). */
  light(sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight, scene: THREE.Scene, dir: THREE.Vector3): number {
    if (!this.saved) this.saved = { sun: sun.color.clone(), sky: hemi.color.clone(), ground: hemi.groundColor.clone(), sunRef: sun, hemiRef: hemi };
    const eve = this.evening();
    // (noon: high in the south — the shadows fall north, behind what casts them; 11:10 a little east;
    // the evening: low behind the truck in the west, the shadows long forward)
    const el = ((eve ? 16 : this.view === 0 ? 58 : 66) * Math.PI) / 180;
    const az = ((eve ? -100 : this.view === 0 ? 25 : 8) * Math.PI) / 180;
    const d = dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
    const tx = 6;
    const tz = 1;
    sun.target.position.set(tx, 0, tz);
    sun.position.set(tx + d.x * 40, d.y * 40, tz + d.z * 40);
    sun.target.updateMatrixWorld();
    sun.color.set(eve ? '#ffb070' : '#fffaf0');
    sun.intensity = eve ? 2.4 : 2.7;
    hemi.color.set(eve ? '#c8a8d8' : '#d8e6ff');
    hemi.groundColor.set(eve ? '#d89060' : '#d8ccb0');
    hemi.intensity = 1.7;
    const haze = new THREE.Color(this.skyCols()[2]);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(haze);
      scene.fog.near = 34;
      scene.fog.far = 125;
    }
    if (scene.background instanceof THREE.Color) scene.background.copy(haze);
    return Math.atan2(d.x, d.z);
  }

  /**
   * The scene's own camera (no 2D picture to keep: from behind the bed, high on
   * the driver's side): settled on the bed; swung low at the pass to show the
   * sea to the horizon (view 1's first seconds); closing in on the way to the
   * cape (S14). The 2D camera's slide (the dialog keeping people clear of the
   * window) moves the target with it.
   */
  placeCamera(f: FieldScene, cams: THREE.PerspectiveCamera[], crop: Crop | null, main: THREE.PerspectiveCamera): THREE.Vector3 {
    const now = this.lastT < 0 ? f.t / 1000 : this.lastT;
    const tv = now - this.viewAt;
    let want: Lens;
    if (this.evening()) want = { yaw: 30 + Math.sin(now / 9) * 3, pitch: 25, dist: 18, fov: 31, x: 6.3, y: 0.4, z: 3.8 };
    else if (this.view === 1 || this.view === 3) {
      // the pass: low, wide, out over the sea for a few seconds; then up again a little
      const low = tv < 7;
      want = low ? { yaw: 34, pitch: 17, dist: 17.5, fov: 36, x: 7, y: 1.0, z: 3.0 } : { yaw: 28 + Math.sin(now / 10) * 3, pitch: 24, dist: 17.8, fov: 33, x: 6.4, y: 0.5, z: 3.8 };
    } else if (this.view === 2) {
      // S14: tighter, slowly pushing in on the bed (the gate is shut)
      const k = Math.min(1, tv / 16);
      want = { yaw: 14 + Math.sin(now / 7) * 1.5, pitch: 32, dist: 17 - 2.5 * k, fov: 27, x: 5.9, y: 0.3, z: 4.0 };
    } else want = { yaw: 23 + Math.sin(now / 11) * 4, pitch: 27, dist: 17.6 + Math.sin(now / 8) * 0.6, fov: 30, x: 6.3, y: 0.3, z: 4.0 };
    // the ride opens on the cab: ツガオ at the wheel through the open window, then back to the bed
    if (this.bornAt < 0) this.bornAt = now;
    if (now - this.bornAt < 2.4) want = { yaw: 12, pitch: 18, dist: 10.5, fov: 30, x: DRIVER_X + 0.4, y: 1.0, z: BZ1 - 0.6 };
    // ease toward it (a cut — the first frame — goes straight there)
    const l = this.lens;
    if (!l || Math.abs(f.t / 1000 - (this.lensAt ?? 0)) > 0.5) this.lens = { ...want };
    else {
      const e = Math.min(1, (f.t / 1000 - this.lensAt) * 0.9);
      for (const key of Object.keys(want) as (keyof Lens)[]) l[key] += (want[key] - l[key]) * e;
    }
    this.lensAt = f.t / 1000;
    // (the cab's people turned a little toward the camera, as the bed's stand facing it)
    for (const p of this.people) p.mesh.rotation.y = -((this.lens!.yaw * Math.PI) / 180) * 0.7;
    const L0 = this.lens!;
    // (the 2D camera's slide from the bed's centre)
    const sx = (f.camX + W / 2) / 16 - f.map.w / 2;
    const sz = (f.camY + H / 2) / 16 - f.map.h / 2;
    const b = this.bump(f.t) * 0.35;
    const tx = L0.x + sx;
    const ty = L0.y + b;
    const tz = L0.z + sz;
    const yaw = (L0.yaw * Math.PI) / 180;
    const p = (L0.pitch * Math.PI) / 180;
    for (const c of cams) {
      c.fov = L0.fov;
      c.aspect = W / H;
      c.position.set(tx - Math.sin(yaw) * Math.cos(p) * L0.dist, ty + Math.sin(p) * L0.dist, tz + Math.cos(yaw) * Math.cos(p) * L0.dist);
      c.lookAt(tx, ty, tz);
      c.updateMatrixWorld();
    }
    for (const c of cams) if (c !== main) c.clearViewOffset();
    if (crop) main.setViewOffset(W, H, crop[0], crop[1], crop[2], crop[3]);
    else main.clearViewOffset();
    return new THREE.Vector3(tx, ty, tz);
  }
  private lensAt = 0;
  /** When the bed was first seen (the opening on the cab). */
  private bornAt = -1;

  // ---- what the people and the 2D's overlays ask

  heightAt(_x: number, _z: number): number {
    return 0;
  }

  boxAt(_x: number, _z: number): Box | null {
    return null;
  }

  inShadow(_p: [number, number, number], _dir: THREE.Vector3): boolean {
    return false;
  }

  dispose(): void {
    for (const c of [...this.chunks, ...this.far]) this.drop(c);
    for (const p of this.people) p.dispose();
    this.k.dispose();
    this.wireMat.dispose();
    // (the glass, the road's, the sea's and the sky's own materials; the kit's are gone already — twice is harmless)
    this.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
      if (o.geometry.userData.own) o.geometry.dispose();
    });
    if (this.saved) {
      // (the town's light back as it was: view.ts sets its colours only when the kind of light changes)
      this.saved.sunRef.color.copy(this.saved.sun);
      this.saved.hemiRef.color.copy(this.saved.sky);
      this.saved.hemiRef.groundColor.copy(this.saved.ground);
    }
  }
}
