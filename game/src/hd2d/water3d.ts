// HD-2D (2026-10-05, the outdoor places, 02 #85): the water as the 2D draws
// it. Until now the 3D ground showed the water tiles in the ground bake's
// flat navy: the sky mirrored in the canal and the rice in the paddies are a
// layer of their own in 2D (art/tiles/water.ts drawWater), drawn each frame
// over the water pixels. Here that layer is drawn into one sheet — the water
// tiles of the map — a few times a second (normal 10, light 5), masked by
// the ground's water pixels, and laid over the water tiles of the 3D ground
// at their height. Past the map's edges the tiles of the edge band go on
// (three tiles: the rice's 6px rows and 4px tufts repeat without a seam).
//
// The same live sheet carries a flat prop that moves (the river under the
// weir, prop_seki_river): its picture with its over() drawn on it.

import * as THREE from 'three';
import { Gfx } from '../engine/gfx';
import { rgba32 } from '../engine/pixel';
import { drawWater, type Reflector, type WaterCtx } from '../art/tiles/water';
import { P } from '../art/tiles/palette';
import { flag } from '../game/state';
import type { FieldScene, PropInst } from '../world/field';
import { charAt, groundAt } from '../world/maps';
import { canvas, litMaterial, pixelTexture, PX, Quads } from './solid';
import type { Margin } from './walls';

/** A tile of the sheet: where it lies (map tile, may be past the edges) and the tile of the source it shows. */
interface Tile {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
}

/** What of a sheet is redrawn round the camera's target (tiles: across, north, south). */
const VIS_X = 21;
const VIS_N = 15;
const VIS_S = 10;

/** Tiles of the edge band repeated outward (rice rows every 6 px, tufts every 4: 48 px keeps both). */
const BAND = 3;

/** The tile a tile past the edges shows: one of the edge band's, keeping the 3-tile period. */
function bandTile(t: number, n: number): number {
  if (t < 0) return ((t % BAND) + BAND) % BAND;
  if (t >= n) return n - BAND + ((t - n) % BAND);
  return t;
}

/**
 * A picture redrawn every `every` ms (world px rect x0, y0, w × h) laid over
 * a set of tiles at their ground's height (+ `up`), as one mesh.
 */
class LiveSheet {
  readonly mesh: THREE.Mesh;
  readonly c: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private readonly tex: THREE.CanvasTexture;
  private last = -1e9;

  constructor(
    readonly x0: number,
    readonly y0: number,
    readonly w: number,
    readonly h: number,
    tiles: Tile[],
    heightAt: (x: number, z: number) => number,
    up: number,
    private readonly every: number,
    /** Redraw the picture's rect `vis` (canvas px: x, y, w, h). */
    private readonly draw: (ctx: CanvasRenderingContext2D, t: number, vis: [number, number, number, number]) => void,
  ) {
    [this.c, this.ctx] = canvas(w, h);
    this.tex = pixelTexture(this.c);
    const q = new Quads();
    const U = (px: number) => px / w;
    const V = (px: number) => 1 - px / h;
    // (runs along a row with the source running on too: one quad)
    tiles.sort((a, b) => a.ty - b.ty || a.tx - b.tx);
    for (let i = 0; i < tiles.length; ) {
      const a = tiles[i];
      const y = heightAt(a.tx + 0.5, a.ty + 0.5) + up;
      let j = i + 1;
      while (j < tiles.length && tiles[j].ty === a.ty && tiles[j].tx === a.tx + (j - i) && tiles[j].sx === a.sx + (j - i) && tiles[j].sy === a.sy && heightAt(tiles[j].tx + 0.5, a.ty + 0.5) + up === y) j++;
      const n = j - i;
      const sx = a.sx * 16 - x0;
      const sy = a.sy * 16 - y0;
      q.add([a.tx, y, a.ty + 1], [a.tx + n, y, a.ty + 1], [a.tx + n, y, a.ty], [a.tx, y, a.ty], [0, 1, 0], U(sx), V(sy + 16), U(sx + n * 16), V(sy));
      i = j;
    }
    this.mesh = new THREE.Mesh(q.geometry(), litMaterial(this.tex));
    this.mesh.receiveShadow = true;
    for (const a of tiles) {
      this.box[0] = Math.min(this.box[0], a.tx);
      this.box[1] = Math.min(this.box[1], a.ty);
      this.box[2] = Math.max(this.box[2], a.tx + 1);
      this.box[3] = Math.max(this.box[3], a.ty + 1);
    }
  }

  /** The tiles' extent (units): the sheet is redrawn only while the camera's target is near it. */
  private readonly box = [Infinity, Infinity, -Infinity, -Infinity];

  /** (tx, tz): the camera's target (units). */
  update(t: number, tx: number, tz: number): void {
    const [x0, z0, x1, z1] = this.box;
    if (tx < x0 - 26 || tx > x1 + 26 || tz < z0 - 20 || tz > z1 + 24) return;
    if (t - this.last < this.every && t >= this.last) return;
    this.last = t;
    const t0 = performance.now();
    // (only what the camera can see round its target: ±VIS_X tiles across, VIS_N north, VIS_S south)
    const vx0 = Math.max(0, Math.floor((tx - VIS_X) * 16 - this.x0));
    const vy0 = Math.max(0, Math.floor((tz - VIS_N) * 16 - this.y0));
    const vx1 = Math.min(this.w, Math.ceil((tx + VIS_X) * 16 - this.x0));
    const vy1 = Math.min(this.h, Math.ceil((tz + VIS_S) * 16 - this.y0));
    if (vx1 <= vx0 || vy1 <= vy0) return;
    this.draw(this.ctx, t, [vx0, vy0, vx1 - vx0, vy1 - vy0]);
    this.tex.needsUpdate = true;
    this.drawMs = performance.now() - t0;
  }

  /** How long the last redraw took (ms, QA: hd2dStats().build.water*). */
  drawMs = 0;

  dispose(): void {
    this.tex.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** Is the map tile (or the edge tile a tile past the edges stands for) water the 2D's water layer paints? */
function wet(f: FieldScene, tx: number, ty: number): boolean {
  const g = groundAt(f.map, tx, ty);
  return g === 'water' || g === 'paddy';
}

/** Tall things on a bank right above water (their reflections show in it): world/render.ts reflectors(), for the whole sheet. */
function reflectors(f: FieldScene): Reflector[] {
  const out: Reflector[] = [];
  for (const p of f.props) {
    if (!p.present || p.art.flat) continue;
    const a = p.art;
    if (!a.shadow && !a.shadowFn && a.h < 20) continue;
    const foot = p.y + a.foot;
    const ftx = Math.floor((p.x + (a.contactX ?? 8)) / 16);
    const fty = Math.floor(foot / 16);
    if (groundAt(f.map, ftx, fty + 1) !== 'water') continue;
    const e = f.propEnv(p);
    const parts: Reflector['parts'] = [];
    const img = (a.shadowImg ?? a.img)(e);
    if (img) parts.push({ img, x: p.x + a.ox, top: p.y + a.oy });
    for (const part of a.fg ?? []) {
      const pi = part.img(e);
      if (pi && pi.width > 4) parts.push({ img: pi, x: p.x + part.ox, top: p.y + part.oy });
    }
    if (!parts.length) continue;
    const id = p.obj.t === 'prop' ? p.obj.prop : (p.obj.prop ?? p.obj.id);
    const lamp = id === 'prop_utility_pole' && (p.obj.opts?.lamp ?? true) !== false ? { h: 46, a: 1 } : undefined;
    out.push({ parts, cx: p.x, foot, lamp });
  }
  return out;
}

/**
 * The 2D's water layer (canal, paddies) as a live sheet over the water tiles
 * of the map and of its margins (null: no such water).
 */
export function waterSheet(f: FieldScene, mg: Margin, heightAt: (x: number, z: number) => number, light: boolean): LiveSheet | null {
  const m = f.map;
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1;
  let y1 = -1;
  for (let ty = 0; ty < m.h; ty++)
    for (let tx = 0; tx < m.w; tx++)
      if (wet(f, tx, ty)) {
        x0 = Math.min(x0, tx);
        y0 = Math.min(y0, ty);
        x1 = Math.max(x1, tx);
        y1 = Math.max(y1, ty);
      }
  if (x1 < 0) return null;
  const tiles: Tile[] = [];
  for (let ty = -mg.n; ty < m.h + mg.s; ty++)
    for (let tx = -mg.x; tx < m.w + mg.x; tx++) {
      const inside = tx >= 0 && ty >= 0 && tx < m.w && ty < m.h;
      const cx = Math.max(0, Math.min(m.w - 1, tx));
      const cy = Math.max(0, Math.min(m.h - 1, ty));
      if (!wet(f, cx, cy)) continue;
      if (inside) {
        tiles.push({ tx, ty, sx: tx, sy: ty });
        continue;
      }
      // (past the edges: a tile of the edge band, or the edge tile itself where the band is not water)
      let sx = bandTile(tx, m.w);
      let sy = bandTile(ty, m.h);
      if (!wet(f, sx, sy)) [sx, sy] = [cx, cy];
      tiles.push({ tx, ty, sx, sy });
    }
  const W = (x1 - x0 + 1) * 16;
  const H = (y1 - y0 + 1) * 16;
  const X0 = x0 * 16;
  const Y0 = y0 * 16;
  // the water pixels of the ground (the bake's navy): the layer is kept to them
  const [mask, mctx] = canvas(W, H);
  const navy = rgba32(P.navy);
  for (let cy = Math.floor(Y0 / 256); cy * 256 < Y0 + H; cy++)
    for (let cx = Math.floor(X0 / 256); cx * 256 < X0 + W; cx++) mctx.drawImage(f.ground.chunk(cx, cy), cx * 256 - X0, cy * 256 - Y0);
  const md = mctx.getImageData(0, 0, W, H);
  const u32 = new Uint32Array(md.data.buffer);
  for (let i = 0; i < u32.length; i++) u32[i] = u32[i] === navy ? 0xffffffff : 0;
  mctx.putImageData(md, 0, 0);
  const refl = reflectors(f);
  const draw = (ctx: CanvasRenderingContext2D, t: number, vis: [number, number, number, number]) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(vis[0], vis[1], vis[2], vis[3]);
    ctx.clip();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(vis[0], vis[1], vis[2], vis[3]);
    const w: WaterCtx = {
      ctx,
      worldX: X0,
      worldY: Y0,
      camX: X0,
      camY: Y0 - 40,
      w: W,
      h: H,
      grade: f.grade,
      t,
      mt: f.mt,
      stage: flag('flag_stage'),
      map: m,
      vis,
      reflect: refl,
    };
    drawWater(w);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, vis[0], vis[1], vis[2], vis[3], vis[0], vis[1], vis[2], vis[3]);
    ctx.restore();
  };
  return new LiveSheet(X0, Y0, W, H, tiles, heightAt, 0.01, light ? 200 : 100, draw);
}

/**
 * A flat prop that moves (its over(): the river's current, the weir's
 * spray) as a live sheet over the tiles of map characters `chars` it covers,
 * and past the edges over the tiles `outside` says stand for them (the
 * source: the prop's own tile of the edge band).
 */
export function liveFlat(f: FieldScene, p: PropInst, chars: string, mg: Margin, outsideChar: (tx: number, ty: number) => string, heightAt: (x: number, z: number) => number, light: boolean): LiveSheet | null {
  const a = p.art;
  const x0 = p.x + a.ox;
  const y0 = p.y + a.oy;
  const env = f.propEnv(p);
  const first = a.img(env);
  if (!first) return null;
  const W = first.width;
  const H = first.height;
  // the prop's tiles
  const t0x = Math.ceil(x0 / 16);
  const t0y = Math.ceil(y0 / 16);
  const t1x = Math.floor((x0 + W) / 16);
  const t1y = Math.floor((y0 + H) / 16);
  const inProp = (tx: number, ty: number) => tx >= t0x && ty >= t0y && tx < t1x && ty < t1y;
  const m = f.map;
  const tiles: Tile[] = [];
  for (let ty = -mg.n; ty < m.h + mg.s; ty++)
    for (let tx = -mg.x; tx < m.w + mg.x; tx++) {
      const inside = tx >= 0 && ty >= 0 && tx < m.w && ty < m.h;
      const ch = inside ? charAt(m, tx, ty) : outsideChar(tx, ty);
      if (!chars.includes(ch)) continue;
      if (inside) {
        if (inProp(tx, ty)) tiles.push({ tx, ty, sx: tx, sy: ty });
        continue;
      }
      // past the edges: the prop's tiles of the band nearest (3 tiles, as the water)
      const sx = tx < t0x ? t0x + (((tx - t0x) % BAND) + BAND) % BAND : tx >= t1x ? t1x - BAND + ((tx - t1x) % BAND) : tx;
      const sy = ty < t0y ? t0y + (((ty - t0y) % BAND) + BAND) % BAND : ty >= t1y ? t1y - BAND + ((ty - t1y) % BAND) : ty;
      if (inProp(sx, sy)) tiles.push({ tx, ty, sx, sy });
    }
  if (!tiles.length) return null;
  const g = { gfx: null as Gfx | null };
  const draw = (ctx: CanvasRenderingContext2D) => {
    const e = f.propEnv(p);
    const img = a.img(e);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (img) ctx.drawImage(img, 0, 0);
    if (a.over) {
      g.gfx ??= new Gfx(ctx, W, H);
      a.over(g.gfx, -a.ox, -a.oy, e);
    }
    ctx.restore();
  };
  return new LiveSheet(x0, y0, W, H, tiles, heightAt, 0.012, light ? 200 : 100, draw);
}

export type { LiveSheet };
export { PX };
