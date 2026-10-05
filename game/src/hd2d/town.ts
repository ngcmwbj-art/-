// HD-2D prototype: the field map stood up in 3D from its 2D art. Nothing is
// drawn twice — every surface is a picture the 2D renderer already uses:
//
//  - the ground: the baked ground chunks plus the flat decals, one texture
//    on one plane (pixels kept square: NearestFilter);
//  - buildings (bkit, PropArt.box): the facade rows stand up as the front
//    wall, the roof rows lie on a box behind it, the strip above the roof
//    stands at its back edge; tune.ts adds the hand-cut pieces (signboards,
//    the chimney, the clock) for 夕鳴銀座;
//  - other props, their foreground parts (canopies, overhead signs) and the
//    walls / hedges / fences of the ASCII layer: "cut-outs" — the rows above
//    the thing's foot line stand up there, the rows below lie on the ground
//    in front of it (that is how a ¾-view picture reads);
//  - glows (PropArt.glow) become the emissive map of the same surface, so
//    lanterns and lit signs feed the bloom, and the nearest few also get a
//    small point light.
//
// Units: one tile = 1. World px (x, y) → (x/16, ·, y/16); up is +Y. Things
// that stand are stretched by SV so that seen from the tilted camera they
// keep the proportions they have in 2D.

import * as THREE from 'three';
import { Gfx } from '../engine/gfx';
import { P } from '../art/tiles/palette';
import type { PropArt, PropEnv, PropPart } from '../art/props/types';
import type { FieldScene, PropInst } from '../world/field';
import { POLE, poleFoot, type WireLine } from '../art/props/wires';
import { TUNE, type Piece } from './tune';

/** The camera's pitch (degrees down from the horizon). 50 at first; 2026-10-05 依頼主「上すぎる」→ lower. */
export const PITCH = 40;
/** Vertical stretch of standing things: tan(pitch), so a standing picture keeps its 2D proportions on screen. */
export const SV = Math.tan((PITCH * Math.PI) / 180);
const PX = 1 / 16;
/** How often animated pictures (over(), glows) are redrawn (ms). */
const REDRAW_MS = 100;
/** Margin (px) round a cut-out's picture for its over() parts and glow. */
const PAD = 20;

type V3 = [number, number, number];

export function pixelTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Quads collected into one BufferGeometry (one draw call per material). */
export class Quads {
  private pos: number[] = [];
  private nor: number[] = [];
  private uv: number[] = [];
  private idx: number[] = [];
  /** Corners a, b, c, d counter-clockwise seen from the front; uv (u0,v0) at a, (u1,v1) at c. */
  add(a: V3, b: V3, c: V3, d: V3, n: V3, u0: number, v0: number, u1: number, v1: number): void {
    const i = this.pos.length / 3;
    this.pos.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k++) this.nor.push(...n);
    this.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  get empty(): boolean {
    return this.idx.length === 0;
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

/** uv of the image rect (columns c0..c1, rows r0..r1 of a w×h picture): [u0, vBottom, u1, vTop]. */
function uvOf(w: number, h: number, c0: number, r0: number, c1: number, r1: number): [number, number, number, number] {
  return [c0 / w, 1 - r1 / h, c1 / w, 1 - r0 / h];
}

/** A standing quad facing +Z (south, the camera). */
function vquad(q: Quads, x0: number, x1: number, yb: number, yt: number, z: number, uv: [number, number, number, number]): void {
  q.add([x0, yb, z], [x1, yb, z], [x1, yt, z], [x0, yt, z], [0, 0, 1], uv[0], uv[1], uv[2], uv[3]);
}

/** A quad lying at height y: the picture's top edge to the north (zN), its bottom to the south (zS). */
function fquad(q: Quads, x0: number, x1: number, zN: number, zS: number, y: number, uv: [number, number, number, number]): void {
  q.add([x0, y, zS], [x1, y, zS], [x1, y, zN], [x0, y, zN], [0, 1, 0], uv[0], uv[1], uv[2], uv[3]);
}

/**
 * A ¾-view picture as a cut-out: drawn at world px (left, top), foot line at
 * world y `foot`. Rows above the foot stand at z = foot; rows below it lie on
 * the ground in front. Returns the standing part's [bottom, top] heights
 * (null when nothing stands).
 */
function cutout(q: Quads, iw: number, ih: number, left: number, top: number, foot: number, lift = 0): [number, number] | null {
  const x0 = left * PX;
  const x1 = (left + iw) * PX;
  const rf = Math.max(0, Math.min(ih, foot - top));
  let stand: [number, number] | null = null;
  if (rf > 0) {
    const yt = (foot - top) * PX * SV + lift;
    const yb = (foot - top - rf) * PX * SV + lift;
    vquad(q, x0, x1, yb, yt, foot * PX, uvOf(iw, ih, 0, 0, iw, rf));
    stand = [yb, yt];
  }
  if (rf < ih) fquad(q, x0, x1, foot * PX, (top + ih) * PX, 0.012 + lift, uvOf(iw, ih, 0, rf, iw, ih));
  return stand;
}

// ---------------------------------------------------------------- materials

function litMaterial(map: THREE.Texture | null, opts: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map, alphaTest: 0.5, side: THREE.FrontSide, shadowSide: THREE.DoubleSide, ...opts });
}

/** A plane that only casts the shadow of its picture (never drawn on screen). */
export function casterMaterial(map: THREE.Texture | null): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
}

// ---------------------------------------------------------------- the picture of a prop

/**
 * The live picture of one prop: its current img(), with its over() parts
 * drawn on top, and its glow on black (the emissive map). Redrawn when
 * img() hands back another canvas, and every REDRAW_MS while something on
 * it moves.
 */
class Skin {
  readonly c: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly g: Gfx;
  readonly tex: THREE.CanvasTexture;
  glowTex: THREE.CanvasTexture | null = null;
  private glowC: HTMLCanvasElement | null = null;
  private glowCtx: CanvasRenderingContext2D | null = null;
  private glowG: Gfx | null = null;
  private last: HTMLCanvasElement | null = null;
  private lastT = -1e9;
  private glowT = -1e9;
  /** Extra work after each redraw (building patches). */
  post: ((ctx: CanvasRenderingContext2D) => void) | null = null;

  /** w × h: the picture's size plus `pad` px of margin on every side (over() and glows reach past the image). */
  constructor(
    readonly art: PropArt,
    readonly w: number,
    readonly h: number,
    readonly pad = 0,
  ) {
    [this.c, this.ctx] = canvas(w, h);
    this.g = new Gfx(this.ctx, this.c.width, this.c.height);
    this.tex = pixelTexture(this.c);
    if (art.glow) {
      [this.glowC, this.glowCtx] = canvas(w, h);
      this.glowG = new Gfx(this.glowCtx, this.glowC.width, this.glowC.height);
      this.glowTex = pixelTexture(this.glowC);
    }
  }

  /** Returns true when the picture changed. */
  refresh(env: PropEnv, t: number): boolean {
    const a = this.art;
    const img = a.img(env);
    let changed = false;
    if (img !== this.last || (a.over && t - this.lastT >= REDRAW_MS)) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, this.c.width, this.c.height);
      if (img) ctx.drawImage(img, this.pad, this.pad);
      ctx.restore();
      if (a.over) {
        ctx.save();
        a.over(this.g, this.pad - a.ox, this.pad - a.oy, env);
        ctx.restore();
      }
      this.post?.(ctx);
      this.last = img;
      this.lastT = t;
      this.tex.needsUpdate = true;
      changed = true;
    }
    if (this.glowCtx && this.glowG && t - this.glowT >= REDRAW_MS) {
      const ctx = this.glowCtx;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.glowC!.width, this.glowC!.height);
      a.glow!(this.glowG, this.pad - a.ox, this.pad - a.oy, env);
      ctx.restore();
      this.glowT = t;
      this.glowTex!.needsUpdate = true;
    }
    return changed;
  }

  dispose(): void {
    this.tex.dispose();
    this.glowTex?.dispose();
  }
}

/** A box (world units) things can stand in the shadow of. */
export interface Box {
  x0: number;
  x1: number;
  y1: number;
  z0: number;
  z1: number;
}

/** Where a glow is, for the few small point lights. */
export interface LightSpot {
  x: number;
  y: number;
  z: number;
  p: PropInst;
}

// ---------------------------------------------------------------- buildings

class BuildingView {
  readonly group = new THREE.Group();
  readonly skin: Skin;
  readonly mat: THREE.MeshLambertMaterial;
  readonly box: Box;
  private readonly masked: { piece: Piece; c: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; mat: THREE.MeshLambertMaterial }[] = [];
  readonly spot: LightSpot | null;

  constructor(
    readonly p: PropInst,
    env: PropEnv,
  ) {
    const a = p.art;
    const b = a.box!;
    const id = p.obj.t === 'prop' ? p.obj.prop : (p.obj.prop ?? p.obj.id);
    const tune = TUNE[id] ?? {};
    const first = a.img(env);
    const iw = first?.width ?? b.W * 16;
    const ih = first?.height ?? b.top + (b.R + b.F) * 16;
    this.skin = new Skin(a, iw, ih);
    this.skin.refresh(env, 0);
    const faceY = b.top + b.R * 16;
    const roofY = b.top;
    const x0 = (p.x + a.ox) * PX;
    const x1 = x0 + iw * PX;
    const zf = (p.y + a.foot) * PX;
    const D = b.R;
    const zb = zf - D;
    const hF = b.F * SV;
    const rise = tune.rise ?? 0;
    this.box = { x0, x1, y1: hF + rise, z0: zb, z1: zf };
    const q = new Quads();
    // the front wall: the facade rows
    vquad(q, x0, x1, 0, hF, zf, uvOf(iw, ih, 0, faceY, iw, ih));
    // the roof: front edge on the wall's top, back edge `rise` higher
    const ruv = uvOf(iw, ih, 0, roofY, iw, faceY);
    q.add([x0, hF, zf], [x1, hF, zf], [x1, hF + rise, zb], [x0, hF + rise, zb], norm([0, D, rise]), ruv[0], ruv[1], ruv[2], ruv[3]);
    // the strip above the roof stands at the back edge
    if (roofY > 0 && tune.top !== false) vquad(q, x0, x1, hF + rise, hF + rise + roofY * PX * SV, zb, uvOf(iw, ih, 0, 0, iw, roofY));
    // hand-cut pieces standing up from the roof (unmasked ones share the texture)
    for (const pc of tune.pieces ?? []) {
      const base = pc.base ?? faceY;
      const k = Math.max(0, Math.min(1, (faceY - base) / (b.R * 16)));
      const z = zf - k * D + 0.01;
      const yb = hF + k * rise + (base - (pc.y + pc.h)) * PX * SV;
      const yt = hF + k * rise + (base - pc.y) * PX * SV;
      const px0 = x0 + pc.x * PX;
      const px1 = x0 + (pc.x + pc.w) * PX;
      if (!pc.keep) {
        vquad(q, px0, px1, yb, yt, z, uvOf(iw, ih, pc.x, pc.y, pc.x + pc.w, pc.y + pc.h));
        continue;
      }
      const [c, ctx] = canvas(pc.w, pc.h);
      const tex = pixelTexture(c);
      const mat = litMaterial(tex);
      const mq = new Quads();
      vquad(mq, px0, px1, yb, yt, z, [0, 0, 1, 1]);
      const m = new THREE.Mesh(mq.geometry(), mat);
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
      this.masked.push({ piece: pc, c, ctx, tex, mat });
    }
    this.mat = litMaterial(this.skin.tex, this.skin.glowTex ? { emissive: 0xffffff, emissiveMap: this.skin.glowTex, emissiveIntensity: 0 } : {});
    const mesh = new THREE.Mesh(q.geometry(), this.mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    // the side walls (and a back wall for the shadow), in the facade's own colour
    const sq = new Quads();
    const yTop = hF;
    sq.add([x0, 0, zb], [x0, 0, zf], [x0, yTop, zf], [x0, yTop, zb], [-1, 0, 0], 0, 0, 1, 1);
    sq.add([x1, 0, zf], [x1, 0, zb], [x1, yTop, zb], [x1, yTop, zf], [1, 0, 0], 0, 0, 1, 1);
    sq.add([x1, 0, zb], [x0, 0, zb], [x0, yTop + rise, zb], [x1, yTop + rise, zb], [0, 0, -1], 0, 0, 1, 1);
    if (rise > 0) {
      // the gable ends under a sloped roof (triangles: the 4th corner repeats the 3rd)
      sq.add([x0, yTop, zb], [x0, yTop, zf], [x0, yTop + rise, zb], [x0, yTop + rise, zb], [-1, 0, 0], 0, 0, 1, 1);
      sq.add([x1, yTop, zf], [x1, yTop, zb], [x1, yTop + rise, zb], [x1, yTop + rise, zb], [1, 0, 0], 0, 0, 1, 1);
    }
    const side = new THREE.Mesh(sq.geometry(), new THREE.MeshLambertMaterial({ color: sideColour(this.skin.c, faceY), shadowSide: THREE.DoubleSide }));
    side.castShadow = true;
    side.receiveShadow = true;
    this.group.add(side);
    this.refreshMasked();
    // every building has a glow() (its windows at night): no point light of its own
    this.spot = null;
    this.cx = (x0 + x1) / 2;
    this.cz = zf;
  }
  readonly cx: number;
  readonly cz: number;

  private refreshMasked(): void {
    for (const m of this.masked) {
      const { piece: pc, ctx, c } = m;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(this.skin.c, pc.x, pc.y, pc.w, pc.h, 0, 0, pc.w, pc.h);
      // keep only the listed shapes
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      for (const s of pc.keep!) {
        if (s.length === 3) {
          ctx.moveTo(s[0] - pc.x + s[2], s[1] - pc.y);
          ctx.arc(s[0] - pc.x, s[1] - pc.y, s[2], 0, Math.PI * 2);
        } else ctx.rect(s[0] - pc.x, s[1] - pc.y, s[2], s[3]);
      }
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      m.tex.needsUpdate = true;
    }
  }

  update(f: FieldScene, t: number, lit: number, near: boolean): void {
    this.group.visible = this.p.present;
    if (!this.p.present || !near) return;
    if (this.skin.refresh(f.propEnv(this.p), t) && this.masked.length) this.refreshMasked();
    if (this.skin.glowTex) this.mat.emissiveIntensity = 1.6 * lit;
  }

  dispose(): void {
    this.skin.dispose();
    for (const m of this.masked) {
      m.tex.dispose();
      m.mat.dispose();
    }
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.mat.dispose();
  }
}

/** In rows 0..rows: the first and one past the last painted column, and the first painted row (null: none). */
function paintedBox(c: HTMLCanvasElement, rows: number): [number, number, number] | null {
  if (rows <= 0) return null;
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, rows).data;
  let x0 = c.width;
  let x1 = -1;
  let y0 = -1;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] < 128) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y0 < 0) y0 = y;
    }
  return x1 < 0 ? null : [x0, x1 + 1, y0];
}

function norm(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** The facade's average colour, a step darker: the colour of the side walls. */
function sideColour(c: HTMLCanvasElement, faceY: number): THREE.Color {
  const ctx = c.getContext('2d')!;
  const h = Math.max(1, c.height - faceY);
  const d = ctx.getImageData(0, faceY, c.width, h).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < d.length; i += 16) {
    if (d[i + 3] < 128) continue;
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
    n++;
  }
  if (!n) return new THREE.Color(P.concrete);
  const col = new THREE.Color().setRGB((r / n / 255) * 0.78, (g / n / 255) * 0.74, (b / n / 255) * 0.8, THREE.SRGBColorSpace);
  return col;
}

// ---------------------------------------------------------------- cut-out props

class CutoutView {
  readonly group = new THREE.Group();
  readonly skin: Skin;
  readonly mat: THREE.MeshLambertMaterial;
  private readonly caster: THREE.Mesh | null = null;
  private readonly fgCasters: THREE.Mesh[] = [];
  private readonly fg: { part: PropPart; mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; tex: THREE.CanvasTexture; last: HTMLCanvasElement | null; fade: number }[] = [];
  readonly spot: LightSpot | null;
  /** Centre of the standing part (for the shadow test). */
  readonly at: V3;
  /** The standing part: x0, x1, bottom, top, z (units), for the see-through test. */
  readonly rect: [number, number, number, number, number] | null;
  /** 1 = solid; less while it stands in front of the party (the 2D x-ray). */
  private xray = 1;

  /**
   * `merged`: where a prop that is always there puts its shadow planes (one
   * shared mesh for all of them, CasterSet); null: its own planes (a prop
   * that comes and goes with the story keeps its own, hidden with it).
   */
  constructor(
    readonly p: PropInst,
    env: PropEnv,
    merged: CasterSpec[] | null,
  ) {
    const a = p.art;
    const first = a.img(env);
    const merge = merged && !p.obj.cond ? merged : null;
    // a margin for what over() and glow() paint outside the image (banners on the pillars)
    const pad = a.over || a.glow ? PAD : 0;
    const iw = (first?.width ?? a.w) + pad * 2;
    const ih = (first?.height ?? a.h) + pad * 2;
    this.skin = new Skin(a, iw, ih, pad);
    this.skin.refresh(env, 0);
    const left = p.x + a.ox - pad;
    const top = p.y + a.oy - pad;
    const foot = p.y + a.foot;
    const q = new Quads();
    const stand = first ? cutout(q, iw, ih, left, top, foot) : null;
    this.mat = litMaterial(this.skin.tex, this.skin.glowTex ? { emissive: 0xffffff, emissiveMap: this.skin.glowTex, emissiveIntensity: 0 } : {});
    if (!q.empty) {
      const mesh = new THREE.Mesh(q.geometry(), this.mat);
      this.group.add(mesh);
    }
    const cx = (left + iw / 2) * PX;
    this.at = [cx, stand ? (stand[0] + stand[1]) / 2 : 0.1, foot * PX];
    // (what is painted of it, banners on the margin included)
    const box = stand ? paintedBox(this.skin.c, Math.max(0, Math.min(ih, foot - top))) : null;
    this.rect = stand && box ? [(left + box[0]) * PX, (left + box[1]) * PX, Math.max(0, stand[0]), (foot - top - box[2]) * PX * SV, foot * PX] : null;
    // the long shadow: the standing part turned to face the sun
    if (stand && stand[1] - stand[0] >= 10 * PX * SV) {
      const rf = Math.max(0, Math.min(ih, foot - top));
      if (merge) merge.push({ src: this.skin.c, sw: iw, sh: rf, cx, z: foot * PX, yb: stand[0], yt: stand[1], w: iw * PX });
      else {
        const cq = new Quads();
        vquad(cq, -iw * PX * 0.5, iw * PX * 0.5, stand[0], stand[1], 0, uvOf(iw, ih, 0, 0, iw, rf));
        this.caster = new THREE.Mesh(cq.geometry(), casterMaterial(this.skin.tex));
        this.caster.position.set(cx, 0, foot * PX);
        this.caster.castShadow = true;
        this.group.add(this.caster);
      }
    }
    for (const part of a.fg ?? []) {
      const img = part.img(env);
      if (!img) continue;
      const tex = pixelTexture(img);
      const pq = new Quads();
      cutout(pq, img.width, img.height, p.x + part.ox, p.y + part.oy, foot);
      const mat = litMaterial(tex);
      const mesh = new THREE.Mesh(pq.geometry(), mat);
      this.group.add(mesh);
      // canopies cast their shadow too (turned to the sun like the trunk)
      const prf = Math.max(0, Math.min(img.height, foot - (p.y + part.oy)));
      const pcx = (p.x + part.ox + img.width / 2) * PX;
      const pyt = (foot - (p.y + part.oy)) * PX * SV;
      if (prf >= 8 && merge) merge.push({ src: img, sw: img.width, sh: prf, cx: pcx, z: foot * PX, yb: pyt - prf * PX * SV, yt: pyt, w: img.width * PX });
      else if (prf >= 8) {
        const cq = new Quads();
        const yt = pyt;
        vquad(cq, -img.width * PX * 0.5, img.width * PX * 0.5, yt - prf * PX * SV, yt, 0, uvOf(img.width, img.height, 0, 0, img.width, prf));
        const c = new THREE.Mesh(cq.geometry(), casterMaterial(tex));
        c.position.set(pcx, 0, foot * PX);
        c.castShadow = true;
        this.group.add(c);
        this.fgCasters.push(c);
      }
      this.fg.push({ part, mesh, mat, tex, last: img, fade: 1 });
    }
    this.spot = a.glow && stand ? { x: cx, y: stand[0] + (stand[1] - stand[0]) * 0.6, z: foot * PX + 0.4, p } : null;
  }

  update(f: FieldScene, t: number, sunYaw: number, lit: number, seers: { x: number; y: number }[], near: boolean, hides: (r: [number, number, number, number, number]) => boolean): void {
    this.group.visible = this.p.present;
    if (this.caster) this.caster.rotation.y = sunYaw;
    for (const c of this.fgCasters) c.rotation.y = sunYaw;
    if (!this.p.present || !near) return;
    const env = f.propEnv(this.p);
    this.skin.refresh(env, t);
    if (this.skin.glowTex) this.mat.emissiveIntensity = 1.8 * lit;
    // standing in front of Minato (or the follower): see-through, as the 2D x-ray
    const tgt = this.rect && hides(this.rect) ? 0.25 : 1;
    this.xray += Math.sign(tgt - this.xray) * Math.min(Math.abs(tgt - this.xray), 16.7 / 150);
    const tr = this.xray < 0.999;
    if (this.mat.transparent !== tr) {
      this.mat.transparent = tr;
      this.mat.depthWrite = !tr;
      this.mat.alphaTest = tr ? 0.02 : 0.5;
      this.mat.needsUpdate = true;
    }
    this.mat.opacity = this.xray;
    for (const fp of this.fg) {
      const img = fp.part.img(env);
      if (img && img !== fp.last) {
        fp.tex.image = img;
        fp.tex.needsUpdate = true;
        fp.last = img;
      }
      // canopies thin out over the party (as in 2D)
      const fr = fp.part.fade;
      if (fr) {
        const p = this.p;
        const under = seers.some((s) => s.x >= p.x + fr.x && s.x < p.x + fr.x + fr.w && s.y - 8 >= p.y + fr.y && s.y - 8 < p.y + fr.y + fr.h);
        const tgt = under ? Math.max(fr.alpha, 0.35) : 1;
        fp.fade += Math.sign(tgt - fp.fade) * Math.min(Math.abs(tgt - fp.fade), 16.7 / 200);
        const tr = fp.fade < 0.999;
        if (fp.mat.transparent !== tr) {
          fp.mat.transparent = tr;
          fp.mat.depthWrite = !tr;
          fp.mat.alphaTest = tr ? 0.02 : 0.5;
          fp.mat.needsUpdate = true;
        }
        fp.mat.opacity = fp.fade;
      }
    }
  }

  setShade(k: number): void {
    this.mat.color.setScalar(k);
  }

  dispose(): void {
    this.skin.dispose();
    for (const fp of this.fg) {
      fp.tex.dispose();
      fp.mat.dispose();
    }
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (o.material !== this.mat && !(this.fg.some((fp) => fp.mat === o.material))) (o.material as THREE.Material).dispose();
      }
    });
    this.mat.dispose();
  }
}

// ---------------------------------------------------------------- the whole map

export class TownWorld {
  readonly group = new THREE.Group();
  readonly buildings: BuildingView[] = [];
  readonly cutouts: CutoutView[] = [];
  readonly spots: LightSpot[] = [];
  readonly boxes: Box[] = [];
  private groundTex: THREE.CanvasTexture | null = null;
  private groundKey = '';
  private groundCanvas: HTMLCanvasElement | null = null;
  private groundMesh: THREE.Mesh | null = null;
  private structTex: THREE.CanvasTexture | null = null;
  private shadeKey = '';
  /** The shadow planes of every prop that is always there, gathered while building (CasterSet). */
  private readonly casterSpecs: CasterSpec[] = [];
  private casters: CasterSet | null = null;

  constructor(readonly f: FieldScene) {
    const m = f.map;
    // the world outside the map
    const outside = new THREE.Mesh(
      new THREE.PlaneGeometry(m.w + 120, m.h + 120).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(m.def.outside ?? P.night) }),
    );
    outside.position.set(m.w / 2, -0.06, m.h / 2);
    outside.receiveShadow = true;
    this.group.add(outside);
    this.buildGround();
    this.buildStructures();
    this.buildWires();
    for (const p of f.props) {
      const a = p.art;
      if (a.flat) continue;
      const env = f.propEnv(p);
      if (a.box) {
        const b = new BuildingView(p, env);
        this.buildings.push(b);
        this.boxes.push(b.box);
        this.group.add(b.group);
        if (b.spot) this.spots.push(b.spot);
      } else {
        const c = new CutoutView(p, env, this.casterSpecs);
        this.cutouts.push(c);
        this.group.add(c.group);
        if (c.spot) this.spots.push(c.spot);
      }
    }
    if (this.casterSpecs.length) {
      this.casters = new CasterSet(this.casterSpecs);
      this.group.add(this.casters.mesh);
    }
  }

  /** The ground texture: the baked ground plus the flat decals that are there now. */
  private buildGround(): void {
    const f = this.f;
    const m = f.map;
    const key = f.props.map((p) => (p.art.flat && p.present ? '1' : '0')).join('');
    if (key === this.groundKey && this.groundTex) return;
    this.groundKey = key;
    const W = m.w * 16;
    const H = m.h * 16;
    if (!this.groundCanvas) [this.groundCanvas] = canvas(W, H);
    const c = this.groundCanvas;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const n = 256;
    for (let cy = 0; cy * n < H; cy++) for (let cx = 0; cx * n < W; cx++) ctx.drawImage(f.ground.chunk(cx, cy), cx * n, cy * n);
    const g = new Gfx(ctx, W, H);
    for (const p of f.props) {
      if (!p.art.flat || !p.present) continue;
      const env = f.propEnv(p);
      const img = p.art.img(env);
      if (img) ctx.drawImage(img, Math.round(p.x + p.art.ox), Math.round(p.y + p.art.oy));
      if (p.art.over) {
        ctx.save();
        p.art.over(g, p.x, p.y, env);
        ctx.restore();
      }
    }
    if (!this.groundTex) {
      this.groundTex = pixelTexture(c);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: this.groundTex }));
      mesh.position.set(m.w / 2, 0, m.h / 2);
      mesh.receiveShadow = true;
      this.groundMesh = mesh;
      this.group.add(mesh);
    } else this.groundTex.needsUpdate = true;
  }

  /** Walls, hedges, fences and rails of the ASCII layer: one atlas, one mesh. */
  private buildStructures(): void {
    const f = this.f;
    if (!f.structures.length) return;
    // pack every distinct cell picture into an atlas (shelves 1024 wide)
    const at = new Map<HTMLCanvasElement, [number, number]>();
    let x = 0;
    let y = 0;
    let row = 0;
    const AW = 1024;
    for (const s of f.structures) {
      const img = s.art.img;
      if (at.has(img)) continue;
      if (x + img.width > AW) {
        x = 0;
        y += row + 1;
        row = 0;
      }
      at.set(img, [x, y]);
      x += img.width + 1;
      row = Math.max(row, img.height);
    }
    const AH = y + row + 1;
    const [c, ctx] = canvas(AW, AH);
    for (const [img, [ix, iy]] of at) ctx.drawImage(img, ix, iy);
    this.structTex = pixelTexture(c);
    const q = new Quads();
    for (const s of f.structures) {
      const img = s.art.img;
      const [ix, iy] = at.get(img)!;
      const left = s.tx * 16 + s.art.ox;
      const top = s.ty * 16 + s.art.oy;
      const foot = s.foot;
      const iw = img.width;
      const ih = img.height;
      const rf = Math.max(0, Math.min(ih, foot - top));
      const x0 = left * PX;
      const x1 = (left + iw) * PX;
      if (rf > 0) vquad(q, x0, x1, (foot - top - rf) * PX * SV, (foot - top) * PX * SV, foot * PX, uvOf(AW, AH, ix, iy, ix + iw, iy + rf));
      if (rf < ih) fquad(q, x0, x1, foot * PX, (top + ih) * PX, 0.012, uvOf(AW, AH, ix, iy + rf, ix + iw, iy + ih));
    }
    const mesh = new THREE.Mesh(q.geometry(), litMaterial(this.structTex));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  /**
   * The overhead wires between the utility poles (MapDef.wires, art/props/wires):
   * the high wire from the crossarm and the low cable, sagging, as thin lines
   * (one draw call). The music staff span (fushigi_03) keeps its five lines.
   */
  private buildWires(): void {
    const lines = this.f.map.def.wires as WireLine[] | undefined;
    if (!lines?.length) return;
    const pos: number[] = [];
    const foot = (p: [number, number]): [number, number] => {
      const [x, y] = poleFoot(p[0], p[1]);
      return [x * PX, y * PX];
    };
    const span = (a: [number, number], b: [number, number], ha: number, hb: number, sag: number) => {
      const n = 14;
      let prev: V3 | null = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const pt: V3 = [a[0] + (b[0] - a[0]) * t, ha + (hb - ha) * t - sag * 4 * t * (1 - t), a[1] + (b[1] - a[1]) * t];
        if (prev) pos.push(...prev, ...pt);
        prev = pt;
      }
    };
    const H_ARM = POLE.arm * PX * SV;
    const H_LOW = POLE.low * PX * SV;
    for (const l of lines) {
      if (l.to) {
        const a = foot(l.pts[0]);
        span(a, [l.to[0] * PX, l.to[1] * PX], H_LOW, 2.6, 0.25);
        continue;
      }
      for (let i = 0; i + 1 < l.pts.length; i++) {
        const a = foot(l.pts[i]);
        const b = foot(l.pts[i + 1]);
        const sag = Math.min(10, 5 + (Math.hypot(b[0] - a[0], b[1] - a[1]) * 16) / 40) * PX * SV;
        if (l.staff) {
          for (let k = 0; k < 5; k++) span(a, b, H_LOW + k * 3 * PX * SV, H_LOW + k * 3 * PX * SV, 4 * PX * SV);
          continue;
        }
        if (!l.thin) span(a, b, H_ARM, H_ARM, sag);
        span(a, b, H_LOW, H_LOW, sag * 1.2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color('#3a2b5c'), transparent: true, opacity: 0.7 });
    this.group.add(new THREE.LineSegments(g, mat));
  }

  /** Is the point (world units) in the shadow of a building, for a sun from `dir` (towards the sun)? */
  inShadow(p: V3, dir: THREE.Vector3): boolean {
    for (const b of this.boxes) if (rayHitsBox(p, dir, b)) return true;
    return false;
  }

  private frame = 0;

  /** Per frame: pictures near (tx, tz) are kept up to date (the far ones keep their last picture). */
  update(t: number, sunYaw: number, sunDir: THREE.Vector3, lit: number, tx: number, tz: number, hides: (r: [number, number, number, number, number]) => boolean): void {
    const f = this.f;
    if (this.frame++ % 30 === 0) this.buildGround();
    const near = (x: number, z: number) => Math.abs(x - tx) < NEAR_X && Math.abs(z - tz) < NEAR_Z;
    for (const b of this.buildings) b.update(f, t, lit, near(b.cx, b.cz));
    const seers = [f.player, ...(f.follower ? [f.follower] : [])].map((a) => ({ x: a.x + a.ox, y: a.y }));
    for (const c of this.cutouts) c.update(f, t, sunYaw, lit, seers, near(c.at[0], c.at[2]), hides);
    this.casters?.turn(sunYaw);
    // cut-outs don't take the shadow map (their sun-facing shadow plane would
    // shade half of them): the ones standing in a building's shadow are tinted
    const key = sunDir.toArray().map((v) => v.toFixed(2)).join(',');
    if (key !== this.shadeKey) {
      this.shadeKey = key;
      for (const c of this.cutouts) c.setShade(this.inShadow(c.at, sunDir) ? SHADE : 1);
    }
  }

  dispose(): void {
    for (const b of this.buildings) b.dispose();
    for (const c of this.cutouts) c.dispose();
    this.casters?.dispose();
    this.groundTex?.dispose();
    this.structTex?.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh && !this.buildings.some((b) => b.group === o.parent) && !this.cutouts.some((c) => c.group === o.parent)) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}

/** One prop's shadow plane, before it goes into the shared CasterSet. */
export interface CasterSpec {
  /** The picture; its rows 0..sh (the standing part), sw wide. */
  src: HTMLCanvasElement;
  sw: number;
  sh: number;
  /** Turning axis (units) and the plane's heights and width. */
  cx: number;
  z: number;
  yb: number;
  yt: number;
  w: number;
}

/**
 * The shadow-only planes of every prop that is always there, in one mesh
 * over one atlas of their standing parts (their first picture: a swaying
 * banner's shadow stays still). Two draw calls in all instead of two per
 * prop. Turned to the sun again only when the sun moves (a stage change).
 */
class CasterSet {
  readonly mesh: THREE.Mesh;
  private readonly tex: THREE.CanvasTexture;
  private yaw = NaN;

  constructor(private readonly specs: CasterSpec[]) {
    const AW = 2048;
    const at: [number, number][] = [];
    let x = 0;
    let y = 0;
    let row = 0;
    for (const s of specs) {
      if (x + s.sw > AW) {
        x = 0;
        y += row + 1;
        row = 0;
      }
      at.push([x, y]);
      x += s.sw + 1;
      row = Math.max(row, s.sh);
    }
    const AH = y + row + 1;
    const [c, ctx] = canvas(AW, AH);
    specs.forEach((s, i) => ctx.drawImage(s.src, 0, 0, s.sw, s.sh, at[i][0], at[i][1], s.sw, s.sh));
    this.tex = pixelTexture(c);
    const q = new Quads();
    specs.forEach((s, i) => {
      const [ax, ay] = at[i];
      vquad(q, 0, 0, s.yb, s.yt, 0, uvOf(AW, AH, ax, ay, ax + s.sw, ay + s.sh));
    });
    this.mesh = new THREE.Mesh(q.geometry(), casterMaterial(this.tex));
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
  }

  /** Each plane faces the sun round its own axis (yaw as Object3D.rotation.y). */
  turn(yaw: number): void {
    if (Math.abs(yaw - this.yaw) < 1e-3) return;
    this.yaw = yaw;
    const pos = this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const nor = this.mesh.geometry.getAttribute('normal') as THREE.BufferAttribute;
    const cs = Math.cos(yaw);
    const sn = Math.sin(yaw);
    this.specs.forEach((s, i) => {
      const h = s.w / 2;
      // corners a, b, c, d = left-bottom, right-bottom, right-top, left-top
      const lx = [-h, h, h, -h];
      for (let k = 0; k < 4; k++) {
        const v = i * 4 + k;
        pos.setXYZ(v, s.cx + lx[k] * cs, k < 2 ? s.yb : s.yt, s.z - lx[k] * sn);
        nor.setXYZ(v, sn, 0, cs);
      }
    });
    pos.needsUpdate = true;
    nor.needsUpdate = true;
    this.mesh.geometry.computeBoundingSphere();
  }

  dispose(): void {
    this.tex.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** The box round the camera's target (units) inside which pictures stay live. */
const NEAR_X = 22;
const NEAR_Z = 16;

/** Brightness of a cut-out or a character in a building's shadow. */
export const SHADE = 0.62;

/** Slab test: does the ray from p towards `dir` hit the box (above the ground)? */
export function rayHitsBox(p: V3, dir: THREE.Vector3, b: Box): boolean {
  let t0 = 0.05;
  let t1 = 60;
  const o = [p[0], p[1], p[2]];
  const d = [dir.x, dir.y, dir.z];
  const lo = [b.x0, 0, b.z0];
  const hi = [b.x1, b.y1, b.z1];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo[i] || o[i] > hi[i]) return false;
      continue;
    }
    let a = (lo[i] - o[i]) / d[i];
    let c = (hi[i] - o[i]) / d[i];
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return false;
  }
  return true;
}
