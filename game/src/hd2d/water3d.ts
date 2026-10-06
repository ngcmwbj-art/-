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
import { charAt, groundAt, isCh2Map } from '../world/maps';
import { fushigiDone } from '../world/fushigi';
import { eraseDark } from '../world/lantern';
import { hash2, Rng, valueNoise } from '../engine/rng';
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
    /** Its material (default: lit like the ground, alpha-tested). */
    material?: (tex: THREE.CanvasTexture) => THREE.Material,
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
    this.mesh = new THREE.Mesh(q.geometry(), material ? material(this.tex) : litMaterial(this.tex));
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

/**
 * 星見台's finds on the ground that only the tomato light shows (litOnly
 * flat props: the child's footprints on the old lane, 52 7.2): drawn as the
 * 2D draws them — inside the inner two rings of the lantern (r × 0.6) only,
 * nothing without it — on a sheet over their tiles, redrawn as the light
 * moves (null: no such finds here).
 */
export function litDecals(f: FieldScene, heightAt: (x: number, z: number) => number): LiveSheet | null {
  const finds = f.props.filter((p) => p.art.flat && p.obj.litOnly);
  if (!finds.length) return null;
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  for (const p of finds) {
    const a = p.art;
    x0 = Math.min(x0, Math.floor((p.x + a.ox) / 16));
    y0 = Math.min(y0, Math.floor((p.y + a.oy) / 16));
    x1 = Math.max(x1, Math.ceil((p.x + a.ox + a.w) / 16));
    y1 = Math.max(y1, Math.ceil((p.y + a.oy + a.h) / 16));
  }
  const tiles: Tile[] = [];
  for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) tiles.push({ tx, ty, sx: tx, sy: ty });
  const X0 = x0 * 16;
  const Y0 = y0 * 16;
  const W = (x1 - x0) * 16;
  const H = (y1 - y0) * 16;
  let key = '';
  let gfx: Gfx | null = null;
  const draw = (ctx: CanvasRenderingContext2D) => {
    const l = f.light.lantern;
    const k = l ? `${l.x},${l.y},${l.r},${finds.map((p) => +p.present).join('')}` : '';
    if (k === key) return;
    key = k;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    if (l) {
      ctx.beginPath();
      ctx.arc(l.x - X0, l.y - Y0, l.r * 0.6, 0, Math.PI * 2);
      ctx.clip();
      gfx ??= new Gfx(ctx, W, H);
      for (const p of finds) {
        if (!p.present) continue;
        const e = f.propEnv(p);
        const img = p.art.img(e);
        if (img) ctx.drawImage(img, Math.round(p.x + p.art.ox - X0), Math.round(p.y + p.art.oy - Y0));
        p.art.over?.(gfx, p.x - X0, p.y - Y0, e);
      }
    }
    ctx.restore();
  };
  return new LiveSheet(X0, Y0, W, H, tiles, heightAt, 0.014, 0, draw);
}

// ---------------------------------------------------------------- 星見台: the night sky in the water (52 8.7)

/** 星見台's open water (render.ts WATERY): the canal, the stream, the terraced paddies, the wallow. */
const WATERY = new Set(['h_canal', 'h_stream', 'h_tanada', 'h_nuta', 'water', 'paddy']);
/** The 2D's frame (its sky is screen space; here it is laid on the ground, tile after tile of it). */
const FW = 384;
const FH = 216;

let skyTile: { c: HTMLCanvasElement; twinkles: [number, number, number][] } | null = null;

/**
 * render.ts buildSky(): the milky way (a soft dithered band from the top
 * left to the bottom right) and 30 steady stars over a 384 × 216 frame, ten
 * more that twinkle (drawn per redraw) — the same seed, the same sky.
 */
function skyFrame(): { c: HTMLCanvasElement; twinkles: [number, number, number][] } {
  if (skyTile) return skyTile;
  const [c, x] = canvas(FW, FH);
  const rng = new Rng(20260925);
  const len = Math.hypot(FW, FH);
  const nx = -FH / len;
  const ny = FW / len;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < FH; y++)
    for (let xx = 0; xx < FW; xx++) {
      const along = (xx * ny - y * nx) / len;
      const off = (valueNoise(along * 6, 0.5, 44) - 0.5) * 18;
      const d = Math.abs(xx * nx + y * ny - off);
      if (d > 34) continue;
      const k = 1 - d / 34;
      const soft = k * k * (0.55 + 0.45 * valueNoise(xx / 23, y / 23, 45));
      if (soft * 16 > BAYER[(y & 3) * 4 + (xx & 3)] + 0.5) {
        const cloud = valueNoise(xx / 9, y / 9, 31) * (0.6 + 0.4 * valueNoise(xx / 31, y / 31, 32));
        x.fillStyle = cloud > 0.5 && k > 0.45 ? '#3A2B5C' : '#2A2440';
        x.fillRect(xx, y, 1, 1);
      }
      if (k > 0.3 && hash2(xx, y, 9) < 0.012 * k) {
        x.fillStyle = 'rgba(122,90,160,0.5)';
        x.fillRect(xx, y, 1, 1);
      }
    }
  const twinkles: [number, number, number][] = [];
  for (let i = 0; i < 40; i++) {
    const sx = rng.int(2, FW - 3);
    const sy = rng.int(2, FH - 3);
    if (i < 10) {
      twinkles.push([sx, sy, rng.range(500, 2000)]);
      continue;
    }
    x.fillStyle = '#FFF6D8';
    x.fillRect(sx, sy, 1, 1);
    if (i % 7 === 0) {
      x.fillStyle = 'rgba(255,246,216,0.35)';
      x.fillRect(sx - 1, sy, 1, 1);
      x.fillRect(sx + 1, sy, 1, 1);
      x.fillRect(sx, sy - 1, 1, 1);
      x.fillRect(sx, sy + 1, 1, 1);
    }
  }
  skyTile = { c, twinkles };
  return skyTile;
}

/**
 * 星見台's water at night (render.ts drawSkyInWater, 52 8.7): the stars and
 * the milky way mirrored in the canal, the stream and the terraced paddies,
 * the ripples running with the water, the canal and the stream a step off
 * black; fushigi_ch2_03 — the canal's stars drifting east, slipping away
 * from the rest — and fushigi_ch2_05 — the 5th terrace's western paddy
 * holding an evening sky. The 2D lays this over its graded frame (screen);
 * here it is a sheet over the water tiles added onto the picture, not
 * darkened by the night's map (cut_night.ts), and nothing of it shows out of
 * the dark. The 2D's sky is screen space; here its frame lies on the
 * ground, tile after tile (the reflection stays with the water).
 */
export function skyWater(f: FieldScene, mg: Margin, heightAt: (x: number, z: number) => number, light: boolean): LiveSheet | null {
  const m = f.map;
  if (!isCh2Map(m.def) || m.def.kind === 'indoor') return null;
  const wetH = (tx: number, ty: number) => WATERY.has(String(groundAt(m, tx, ty)));
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1;
  let y1 = -1;
  for (let ty = 0; ty < m.h; ty++)
    for (let tx = 0; tx < m.w; tx++)
      if (wetH(tx, ty)) {
        x0 = Math.min(x0, tx);
        y0 = Math.min(y0, ty);
        x1 = Math.max(x1, tx);
        y1 = Math.max(y1, ty);
      }
  if (x1 < 0) return null;
  const tiles: Tile[] = [];
  for (let ty = -mg.n; ty < m.h + mg.s; ty++)
    for (let tx = -mg.x; tx < m.w + mg.x; tx++) {
      const cx = Math.max(0, Math.min(m.w - 1, tx));
      const cy = Math.max(0, Math.min(m.h - 1, ty));
      if (!wetH(cx, cy)) continue;
      // (past the edges the edge tile's water runs on: the stream north, the canal east)
      tiles.push({ tx, ty, sx: cx, sy: cy });
    }
  const W = (x1 - x0 + 1) * 16;
  const H = (y1 - y0 + 1) * 16;
  const X0 = x0 * 16;
  const Y0 = y0 * 16;
  // the water pixels of the ground (the bake's navy)
  const [mask, mctx] = canvas(W, H);
  const navy = rgba32(P.navy);
  for (let cy = Math.floor(Y0 / 256); cy * 256 < Y0 + H; cy++)
    for (let cx = Math.floor(X0 / 256); cx * 256 < X0 + W; cx++) mctx.drawImage(f.ground.chunk(cx, cy), cx * 256 - X0, cy * 256 - Y0);
  const md = mctx.getImageData(0, 0, W, H);
  const u32 = new Uint32Array(md.data.buffer);
  for (let i = 0; i < u32.length; i++) u32[i] = u32[i] === navy ? 0xffffffff : 0;
  mctx.putImageData(md, 0, 0);
  const sky = skyFrame();
  const village = m.id === 'map_hoshimidai';
  const rect = (x: number, y: number, w: number, h: number): [number, number, number, number] => [x * 16 - X0, y * 16 - Y0, w * 16, h * 16];
  let pat: CanvasPattern | null = null;
  const draw = (ctx: CanvasRenderingContext2D, t: number, vis: [number, number, number, number]) => {
    const gd = f.grade;
    ctx.save();
    ctx.beginPath();
    ctx.rect(vis[0], vis[1], vis[2], vis[3]);
    ctx.clip();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(vis[0], vis[1], vis[2], vis[3]);
    // the sky's frame, tile after tile from the world's origin
    const frame = (dx: number, rx: number, ry: number, rw: number, rh: number) => {
      pat ??= ctx.createPattern(sky.c, 'repeat');
      if (!pat) return;
      ctx.save();
      ctx.translate(-X0 + dx, -Y0);
      ctx.fillStyle = pat;
      ctx.fillRect(rx + X0 - dx, ry + Y0, rw, rh);
      ctx.restore();
    };
    const starK = Math.max(gd.milky, gd.stars);
    if (starK > 0.01) {
      ctx.globalAlpha = starK;
      frame(0, vis[0], vis[1], vis[2], vis[3]);
      ctx.globalAlpha = 1;
      // the ten that twinkle (in h2 three in ten are gone), in each frame tile in sight
      for (let ky = Math.floor((Y0 + vis[1]) / FH); ky * FH < Y0 + vis[1] + vis[3]; ky++)
        for (let kx = Math.floor((X0 + vis[0]) / FW); kx * FW < X0 + vis[0] + vis[2]; kx++)
          sky.twinkles.forEach(([sx, sy, per], i) => {
            if (hash2(i, 3, 17) > gd.stars) return;
            const on = Math.floor((t + i * 311) / per) % 3 !== 0;
            ctx.fillStyle = on ? '#FFF6D8' : '#9AA0A8';
            ctx.fillRect(kx * FW + sx - X0, ky * FH + sy - Y0, 1, 1);
          });
    }
    // fushigi_ch2_03: in the canal only, the mirrored stars drift east (6px/s)
    if (village && !fushigiDone('fushigi_ch2_03')) {
      const c = rect(13, 20, 47, 2);
      ctx.clearRect(c[0], c[1], c[2], c[3]);
      if (starK > 0.01) {
        ctx.globalAlpha = starK;
        frame(Math.floor((t / 1000) * 6) % FW, c[0], c[1], c[2], c[3]);
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    // the canal and the stream hold a little of the dawn's light, a step off black
    if (village && gd.night > 0.3) {
      ctx.globalAlpha = Math.min(1, gd.night) * 0.6;
      ctx.fillStyle = '#34416A';
      for (const c of [rect(13, 20, 47, 2), rect(13, 0, 1, 38)]) ctx.fillRect(c[0], c[1], c[2], c[3]);
      ctx.globalAlpha = 1;
    }
    // ripples: short 1px glints flowing with the water (the canal east 6px/s,
    // the stream south 10px/s; still water shivers between two places)
    {
      const s = t / 1000;
      const shiver = Math.floor(t / 67) % 2;
      ctx.globalAlpha = gd.night > 0.5 ? 0.8 : 0.35;
      ctx.fillStyle = gd.night > 0.5 ? '#3A2B5C' : '#FFF6D8';
      const tx0 = Math.floor((X0 + vis[0]) / 16);
      const ty0 = Math.floor((Y0 + vis[1]) / 16);
      const tx1 = Math.floor((X0 + vis[0] + vis[2]) / 16);
      const ty1 = Math.floor((Y0 + vis[1] + vis[3]) / 16);
      for (let ty = Math.max(0, ty0); ty <= Math.min(m.h - 1, ty1); ty++)
        for (let tx = Math.max(0, tx0); tx <= Math.min(m.w - 1, tx1); tx++) {
          const g = String(groundAt(m, tx, ty));
          if (!WATERY.has(g)) continue;
          const flowX = g === 'h_canal' || g === 'water' ? 6 : 0;
          const flowY = g === 'h_stream' ? 10 : 0;
          for (let k = 0; k < 3; k++) {
            const h = hash2(tx * 3 + k, ty, 91);
            const len = 2 + Math.floor(h * 3);
            const lx = (((Math.floor(h * 97) + s * flowX + (flowX || flowY ? 0 : shiver * (k % 2 ? 1 : -1))) % 16) + 16) % 16;
            const ly = (((Math.floor(hash2(tx, ty * 3 + k, 92) * 16) + s * flowY) % 16) + 16) % 16;
            ctx.fillRect(Math.floor(tx * 16 + lx - X0), Math.floor(ty * 16 + ly - Y0), len, 1);
          }
        }
      ctx.globalAlpha = 1;
    }
    // fushigi_ch2_05: the 5th terrace's western paddy holds an evening sky (after: the night, its bottom warmer)
    if (village) {
      const r = rect(14, 15, 5, 2);
      const done = fushigiDone('fushigi_ch2_05');
      const gr = ctx.createLinearGradient(0, r[1], 0, r[1] + r[3]);
      if (!done) {
        gr.addColorStop(0, '#F2894B');
        gr.addColorStop(1, '#D9728A');
      } else {
        gr.addColorStop(0, 'rgba(58,43,92,0)');
        gr.addColorStop(1, 'rgba(58,43,92,1)');
      }
      ctx.globalCompositeOperation = done ? 'lighter' : 'source-over';
      ctx.globalAlpha = done ? 0.6 : 0.85;
      ctx.fillStyle = gr;
      ctx.fillRect(r[0], r[1], r[2], r[3]);
      if (!done) {
        ctx.fillStyle = '#FFE7A3';
        ctx.fillRect(r[0], r[1] + Math.floor(r[3] / 2), r[2], 1);
      }
      ctx.globalAlpha = 1;
    }
    // on the water pixels only, and nothing of it out of the dark (a little more than half gone there)
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, vis[0], vis[1], vis[2], vis[3], vis[0], vis[1], vis[2], vis[3]);
    eraseDark(ctx, f, X0, Y0, W, H);
    ctx.restore();
  };
  // added onto the picture, as the 2D screens it over its graded frame (cut_night.ts leaves it alone)
  const material = (tex: THREE.CanvasTexture) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    mat.userData.noNight = true;
    return mat;
  };
  return new LiveSheet(X0, Y0, W, H, tiles, heightAt, 0.016, light ? 200 : 100, draw, material);
}

/**
 * 星見台's flat lights (a flat prop with a glow(): the stars born at the
 * spring that drift down the stream, prop_h_sawa_stars — 「光の層なので暗が
 * りでも見える」): the 2D screens them over its graded frame; here each is a
 * sheet over its tiles, redrawn a few times a second and added onto the
 * picture (not darkened by the night's map). Chapter 2's maps only (chapter
 * 1 keeps its look).
 */
export function flatGlows(f: FieldScene, heightAt: (x: number, z: number) => number, light: boolean): LiveSheet[] {
  if (!isCh2Map(f.map.def)) return [];
  const out: LiveSheet[] = [];
  for (const p of f.props) {
    const a = p.art;
    if (!a.flat || !a.glow) continue;
    const x0 = Math.floor((p.x + a.ox) / 16);
    const y0 = Math.floor((p.y + a.oy) / 16);
    const x1 = Math.ceil((p.x + a.ox + a.w) / 16);
    const y1 = Math.ceil((p.y + a.oy + a.h) / 16);
    const tiles: Tile[] = [];
    for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) tiles.push({ tx, ty, sx: tx, sy: ty });
    if (!tiles.length) continue;
    const X0 = x0 * 16;
    const Y0 = y0 * 16;
    const W = (x1 - x0) * 16;
    const H = (y1 - y0) * 16;
    let gfx: Gfx | null = null;
    const draw = (ctx: CanvasRenderingContext2D, _t: number, vis: [number, number, number, number]) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(vis[0], vis[1], vis[2], vis[3]);
      ctx.clip();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(vis[0], vis[1], vis[2], vis[3]);
      if (p.present) {
        gfx ??= new Gfx(ctx, W, H);
        a.glow!(gfx, p.x - X0, p.y - Y0, f.propEnv(p));
      }
      ctx.restore();
    };
    const material = (tex: THREE.CanvasTexture) => {
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      mat.userData.noNight = true;
      return mat;
    };
    out.push(new LiveSheet(X0, Y0, W, H, tiles, heightAt, 0.018, light ? 100 : 50, draw, material));
  }
  return out;
}

export type { LiveSheet };
export { PX };
