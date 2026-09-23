// Fig: a material-aware pixel buffer used to author every character sprite.
//
// Art is drawn as flat "parts" (head, hair, torso, arm, ...) that carry a
// material. render() then lights the figure consistently for the whole game:
//   - form shading from each part's own edges (right/bottom edges darker,
//     top-left edge lighter) so the west sun always lights the left side,
//     even for mirrored (right-facing) frames,
//   - selective inner lines where a part overlaps another of the same color,
//   - a warm tint on the lit left fill pixel, and the 1px sunset rim itself
//     in the outline column on the screen-left edge (every 2nd–3rd row,
//     30_level_art 7.5 / 9.1),
//   - a colored outer outline (dark, tinted toward the adjacent material).
// Flat details painted on a part (eyes, prints, stripes) do not count as
// that part's edge, so they are not ringed with shade pixels.
// Explicit tones set while drawing override the automatic shading.

import { PixelCanvas, rgba32 } from '../../engine/pixel';
import { C, ramp, rimOf, outerRimOf, outlineOf, snapMaster, isMaster, RIM_MARK, RIM_MARK_HI, type Ramp, type RampOpts } from './palette';

export interface Mat {
  ramp: Ramp;
  /** Inner warm tint of the lit left fill pixel. */
  rim: string;
  /** Sunset rim that replaces the left outline pixel ('' = none). */
  orim: string;
  ol: string;
  /** No automatic shading (explicit tones still apply). */
  flat: boolean;
  norim: boolean;
  /** Dithered (soft, fluffy) outer outline. */
  soft: boolean;
  /** The outline color was chosen explicitly (else: the darkest tone). */
  olSet?: boolean;
}

export interface MatOpts extends RampOpts {
  rim?: string;
  /** Outer rim color (in the outline column); '' disables it. */
  orim?: string;
  ol?: string;
  flat?: boolean;
  norim?: boolean;
  soft?: boolean;
}

/** Create a material from a base color (hue-shifted ramp) or an explicit ramp. */
export function mat(base: string | Ramp, o: MatOpts = {}): Mat {
  const r: Ramp = typeof base === 'string' ? ramp(base, o) : base;
  return {
    ramp: r,
    rim: o.rim ?? rimOf(r[2], r[3]),
    orim: o.orim === '' || o.norim ? '' : o.orim !== undefined ? RIM_MARK_HI : outerRimOf(r[2]),
    ol: o.ol ?? outlineOf(r[0]),
    flat: !!o.flat,
    norim: !!o.norim,
    soft: !!o.soft,
    olSet: o.ol !== undefined,
  };
}

/** A single flat color material (details: eyes, prints, buttons). */
export function flat(c: string, o: { rim?: string; orim?: string; ol?: string; norim?: boolean } = {}): Mat {
  const norim = o.norim ?? true;
  return { ramp: [c, c, c, c, c], rim: o.rim ?? c, orim: o.orim ?? (norim ? '' : outerRimOf(c)), ol: o.ol ?? C.ol, flat: true, norim, soft: false, olSet: true };
}

export type Mats = Record<string, Mat>;

// Palette law (30_level_art 7.2 / 7.5): no pure white (#FFF6D8 is the
// brightest), no pure black (#0B0B14), eyes and mouths are #2A2440. Every
// material is four tones at most (darkest, shade, base, light): a highlight
// fifth tone survives only when it is a master color (brass glints); tones
// within a hair of a master color become that color; the lit left fill
// pixel is the light tone and the colored outline is the darkest tone, so a
// material adds no hidden in-between colors. The sunset rim in the outline
// column is written as a marker that quant.ts paints per stage.
const REMAP: Record<string, string> = { '#ffffff': '#FFF6D8', '#000000': '#0B0B14', '#2a1c28': '#2A2440' };
function lawColor(c: string): string {
  const k = c.toLowerCase();
  const base = k.slice(0, 7);
  const r = REMAP[base];
  return snapMaster(r ? r + c.slice(7) : c, 5);
}
function lawful(name: string, m: Mat): Mat {
  if (name === 'mouth') return flat(C.ol);
  const r = m.ramp.map(lawColor) as Ramp;
  if (!m.flat && r[4] !== r[3] && !isMaster(r[4]) && r[4].length <= 7) r[4] = r[3];
  return {
    ...m,
    ramp: r,
    rim: m.flat ? lawColor(m.rim) : r[3],
    orim: m.orim ? (m.orim === RIM_MARK ? RIM_MARK : RIM_MARK_HI) : '',
    ol: m.olSet ? lawColor(m.ol) : r[0],
  };
}

/** Outer rim rows: every 2nd–3rd row of a part (rows 0, 2, 5, 7, 10 ...). */
function outerRimOn(y: number, top: number): boolean {
  const k = (((y - top) % 5) + 5) % 5;
  return k === 0 || k === 2;
}

export interface PartOpts {
  /** Edge sides that get shaded: r=right, b=bottom, l=left, t=top. Default 'rb'. */
  shade?: string;
  /** Lit edges: t=top edge (left half), l=left edge (upper half), T/L=whole edge. Default 't'. */
  light?: string;
  /** Tone offset for the whole part (far arm = -1). */
  shift?: number;
  /** Dark separation line where a part in front of this one has the same material. Default false. */
  sep?: boolean;
  /** Separation line against every part in front, whatever its material. */
  sepAll?: boolean;
  /** No automatic shading. */
  flat?: boolean;
  /** Sunset rim on the left silhouette edge. Default true. */
  rim?: boolean;
  /** Contributes to the outer outline. Default true. */
  ol?: boolean;
  /**
   * Parts drawn in front of this one count as its edges (a shade ring where
   * an arm crosses the torso). Default true; false = only the part's own
   * silhouette is shaded (soft round bodies, where that ring reads as noise).
   */
  inner?: boolean;
}

interface Part {
  z: number;
  shade: string;
  light: string;
  shift: number;
  sep: boolean;
  sepAll: boolean;
  flat: boolean;
  rim: boolean;
  ol: boolean;
  inner: boolean;
}

const AUTO = 99;

export type RowMap = Record<string, string | [string | null, number | null] | null>;

export interface RenderOpts {
  /** 'color' (default) = tinted selective outline, 'plain' = #2A2440 everywhere, 'none'. */
  outline?: 'color' | 'plain' | 'none';
  /** Draw diagonal outline corners too (heavier look for big sprites). */
  heavy?: boolean;
}

/**
 * PixelCanvas view handed to after()/before() callbacks: frame coordinates
 * (row 0 = the top of the declared canvas, `data` starts there), while
 * set/get/alpha also reach the headroom rows above it (y < 0).
 */
class PadView extends PixelCanvas {
  private readonly full: PixelCanvas;
  private readonly pad: number;
  constructor(full: PixelCanvas, pad: number, h: number) {
    super(full.w, 0);
    this.full = full;
    this.pad = pad;
    (this as { h: number }).h = h;
    (this as { data: Uint32Array }).data = full.data.subarray(pad * full.w);
  }
  inside(x: number, y: number): boolean {
    return x >= 0 && y >= -this.pad && x < this.w && y < this.h;
  }
  set(x: number, y: number, c: string | number): void {
    x |= 0;
    y |= 0;
    if (!this.inside(x, y)) return;
    this.full.data[(y + this.pad) * this.w + x] = typeof c === 'number' ? c : rgba32(c);
  }
  get(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return this.full.data[((y | 0) + this.pad) * this.w + (x | 0)];
  }
}

export class Fig {
  readonly w: number;
  /** Declared height (frame coordinates run 0..h-1; the feet sit on row h-1). */
  readonly h: number;
  /**
   * Headroom rows above row 0 (y = -pad .. -1). Poses that rise above the
   * declared canvas (walk bob, look_up, hops) draw there instead of being
   * cut off; buildSprite() crops unused headroom away afterwards.
   */
  readonly pad: number;
  /** Internal buffer height (h + pad). */
  readonly H: number;
  readonly pid: Int16Array;
  readonly mid: Int16Array;
  readonly tone: Int8Array;
  private parts: Part[] = [{ z: -1, shade: '', light: '', shift: 0, sep: false, sepAll: false, flat: true, rim: false, ol: false, inner: false }];
  private matList: Mat[] = [];
  private matIndex = new Map<string, number>();
  private cur = 0;
  private curMat = 0;
  private curTone = AUTO;
  /** Drawing offset (lets a pose shift a group of parts, e.g. body bob). */
  ox = 0;
  oy = 0;
  private post: ((p: PixelCanvas) => void)[] = [];
  private pre: ((p: PixelCanvas) => void)[] = [];

  constructor(w: number, h: number, mats: Mats, pad = 0) {
    this.w = w;
    this.h = h;
    this.pad = pad;
    this.H = h + pad;
    this.pid = new Int16Array(w * this.H);
    this.mid = new Int16Array(w * this.H);
    this.tone = new Int8Array(w * this.H).fill(AUTO);
    for (const k of Object.keys(mats)) this.addMat(k, mats[k]);
  }

  addMat(name: string, m: Mat): number {
    const i = this.matList.length;
    this.matList.push(lawful(name, m));
    this.matIndex.set(name, i);
    return i;
  }

  private matId(name: string): number {
    let i = this.matIndex.get(name);
    if (i === undefined) {
      if (!name.startsWith('#')) throw new Error(`unknown material ${name}`);
      i = this.addMat(name, flat(name));
    }
    return i;
  }

  has(name: string): boolean {
    return this.matIndex.has(name);
  }

  /** Material index of a registered material (-1 if missing). */
  idOf(name: string): number {
    return this.matIndex.get(name) ?? -1;
  }

  /** Begin a new part (drawn in front of everything so far). */
  part(m: string, o: PartOpts = {}): this {
    this.parts.push({
      z: this.parts.length,
      shade: o.shade ?? 'rb',
      light: o.light ?? 't',
      shift: o.shift ?? 0,
      sep: o.sep ?? false,
      sepAll: !!o.sepAll,
      flat: !!o.flat,
      rim: o.rim ?? true,
      ol: o.ol ?? true,
      inner: o.inner ?? true,
    });
    this.cur = this.parts.length - 1;
    this.curMat = this.matId(m);
    this.curTone = AUTO;
    return this;
  }

  /** Switch material within the current part. */
  m(name: string): this {
    this.curMat = this.matId(name);
    return this;
  }

  /** Explicit tone for following draws (null = automatic). */
  t(tone: number | null): this {
    this.curTone = tone === null ? AUTO : tone;
    return this;
  }

  offset(x: number, y: number): this {
    this.ox = x;
    this.oy = y;
    return this;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= -this.pad && x < this.w && y < this.h;
  }

  /** Buffer index of frame pixel (x, y). */
  private at(x: number, y: number): number {
    return (y + this.pad) * this.w + x;
  }

  px(x: number, y: number): this {
    x = Math.round(x + this.ox);
    y = Math.round(y + this.oy);
    if (!this.inside(x, y)) return this;
    const i = this.at(x, y);
    this.pid[i] = this.cur;
    this.mid[i] = this.curMat;
    this.tone[i] = this.curTone;
    return this;
  }

  rect(x: number, y: number, w: number, h: number): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j);
    return this;
  }

  hl(x0: number, x1: number, y: number): this {
    if (x1 < x0) [x0, x1] = [x1, x0];
    for (let x = x0; x <= x1; x++) this.px(x, y);
    return this;
  }

  vl(x: number, y0: number, y1: number): this {
    if (y1 < y0) [y0, y1] = [y1, y0];
    for (let y = y0; y <= y1; y++) this.px(x, y);
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number): this {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 512; n++) {
      this.px(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Filled ellipse (pixel-center sampling). */
  ell(cx: number, cy: number, rx: number, ry: number): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y);
      }
    return this;
  }

  /** Filled polygon (even-odd, pixel-center sampling). */
  poly(pts: [number, number][]): this {
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.px(x, y);
    }
    return this;
  }

  /**
   * Stamp rows of characters. Built-ins: '.'/' ' skip, '#' current material
   * (auto tone), '+'/'H' light, '-'/'d' shade, '='/'D' dark, '*'/'K' spec,
   * 'o'/'h' base (explicit), 'x' erase. `map` adds letters → material name or
   * [material|null, tone|null] (map entries win over built-ins).
   */
  rows(x: number, y: number, rows: string[], map: RowMap = {}): this {
    const saveMat = this.curMat;
    const saveTone = this.curTone;
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === '.' || ch === ' ') continue;
        this.curMat = saveMat;
        this.curTone = saveTone;
        if (ch in map) {
          const v = map[ch];
          if (v === null) continue;
          if (typeof v === 'string') this.curMat = this.matId(v);
          else {
            if (v[0] !== null) this.curMat = this.matId(v[0]);
            this.curTone = v[1] === null ? AUTO : v[1];
          }
          this.px(x + i, y + j);
          continue;
        }
        switch (ch) {
          case '#': break;
          case '+': case 'H': this.curTone = 1; break;
          case '-': case 'd': this.curTone = -1; break;
          case '=': case 'D': this.curTone = -2; break;
          case '*': case 'K': this.curTone = 2; break;
          case 'o': case 'h': this.curTone = 0; break;
          case 'x': this.erase(x + i, y + j); continue;
          default: continue;
        }
        this.px(x + i, y + j);
      }
    }
    this.curMat = saveMat;
    this.curTone = saveTone;
    return this;
  }

  erase(x: number, y: number, w = 1, h = 1): this {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const X = Math.round(x + i + this.ox);
        const Y = Math.round(y + j + this.oy);
        if (!this.inside(X, Y)) continue;
        const k = this.at(X, Y);
        this.pid[k] = 0;
        this.tone[k] = AUTO;
      }
    return this;
  }

  /** Change the tone of already-drawn pixels (keeps part/material). */
  retone(x: number, y: number, tone: number, w = 1, h = 1): this {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const X = Math.round(x + i + this.ox);
        const Y = Math.round(y + j + this.oy);
        if (!this.inside(X, Y)) continue;
        const k = this.at(X, Y);
        if (this.pid[k]) this.tone[k] = tone;
      }
    return this;
  }

  /** Is the pixel covered by any part? */
  filled(x: number, y: number): boolean {
    x = Math.round(x + this.ox);
    y = Math.round(y + this.oy);
    return this.inside(x, y) && this.pid[this.at(x, y)] !== 0;
  }

  /**
   * Mirror horizontally (used to make right-facing frames from left ones).
   * Shapes and painted details (seams, zippers, stripes) mirror with the
   * figure, but the light must not (30_level_art 7.5): the sun stays in the
   * west. Automatic shading is computed after the flip anyway; explicit
   * tones that model light — highlight toward one side of a part, shade
   * toward the other — are re-oriented afterwards (see relight()).
   */
  flip(): this {
    const W = this.w;
    for (let y = 0; y < this.H; y++)
      for (let x = 0; x < W >> 1; x++) {
        const a = y * W + x;
        const b = y * W + (W - 1 - x);
        let t = this.pid[a]; this.pid[a] = this.pid[b]; this.pid[b] = t;
        t = this.mid[a]; this.mid[a] = this.mid[b]; this.mid[b] = t;
        t = this.tone[a]; this.tone[a] = this.tone[b]; this.tone[b] = t;
      }
    this.relight();
    return this;
  }

  /**
   * After a flip: every part whose explicit edge tones are lit from the
   * right (light tones in the right-hand edge band of its rows, shade tones
   * in the left-hand one) gets those edge bands mirrored back within each of
   * its rows, so the highlight returns to the screen-left edge and the shade
   * to the right. Interior tones (a shadow under a mitten, a fold, a seam)
   * mirror with the shape and are left alone, and parts whose tones do not
   * lean that way keep them where they are.
   */
  private relight(): void {
    const W = this.w;
    const n = this.parts.length;
    const EDGE = 3;
    const score = new Float64Array(n);
    const count = new Int32Array(n);
    const extent = (y: number, p: number): [number, number] => {
      let l = -1;
      let r = -1;
      for (let x = 0; x < W; x++)
        if (this.pid[y * W + x] === p) {
          if (l < 0) l = x;
          r = x;
        }
      return [l, r];
    };
    const edge = (k: number, l: number, r: number) => k - l < EDGE || r - k < EDGE;
    for (let y = 0; y < this.H; y++) {
      const seen = new Set<number>();
      for (let x = 0; x < W; x++) {
        const p = this.pid[y * W + x];
        if (!p || seen.has(p)) continue;
        seen.add(p);
        const [l, r] = extent(y, p);
        if (r - l < 1) continue;
        const mid = (l + r) / 2;
        const half = (r - l) / 2;
        for (let k = l; k <= r; k++) {
          const j = y * W + k;
          const t = this.tone[j];
          if (this.pid[j] !== p || t === AUTO || t === 0 || this.matList[this.mid[j]].flat || !edge(k, l, r)) continue;
          score[p] += (t * (k - mid)) / half;
          count[p]++;
        }
      }
    }
    for (let p = 1; p < n; p++) {
      if (count[p] < 2 || score[p] <= 0.25) continue;
      for (let y = 0; y < this.H; y++) {
        const [l, r] = extent(y, p);
        if (l < 0) continue;
        const src: number[] = [];
        for (let k = l; k <= r; k++) src.push(this.tone[y * W + k]);
        for (let k = l; k <= r; k++) {
          const j = y * W + k;
          if (this.pid[j] !== p || !edge(k, l, r)) continue;
          const from = l + r - k;
          this.tone[j] = this.pid[y * W + from] === p ? src[from - l] : AUTO;
        }
      }
    }
  }

  /** Callback on the finished PixelCanvas (glows, translucent effects, no outline). */
  after(fn: (p: PixelCanvas) => void): this {
    this.post.push(fn);
    return this;
  }

  /** Callback drawn under the figure before outlining (rarely needed). */
  before(fn: (p: PixelCanvas) => void): this {
    this.pre.push(fn);
    return this;
  }

  render(o: RenderOpts = {}): PixelCanvas {
    const W = this.w;
    const H = this.H;
    const pid = this.pid;
    const out = new PixelCanvas(W, H);
    const view = this.pad ? new PadView(out, this.pad, this.h) : out;
    for (const f of this.pre) f(view);
    const pidAt = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : pid[y * W + x]);

    // horizontal / vertical run extents per pixel (for "left half" / "upper half" tests)
    const runL = new Int16Array(W * H);
    const runR = new Int16Array(W * H);
    const runT = new Int16Array(W * H);
    const runB = new Int16Array(W * H);
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const p = pid[y * W + x];
        let e = x;
        while (e + 1 < W && pid[y * W + e + 1] === p) e++;
        for (let k = x; k <= e; k++) { runL[y * W + k] = x; runR[y * W + k] = e; }
        x = e + 1;
      }
    }
    for (let x = 0; x < W; x++) {
      let y = 0;
      while (y < H) {
        const p = pid[y * W + x];
        let e = y;
        while (e + 1 < H && pid[(e + 1) * W + x] === p) e++;
        for (let k = y; k <= e; k++) { runT[k * W + x] = y; runB[k * W + x] = e; }
        y = e + 1;
      }
    }

    // top row of every part (keeps the broken rim pattern stable while bobbing)
    const partTop = new Int16Array(this.parts.length).fill(9999);
    for (let i = 0; i < W * H; i++) if (pid[i]) partTop[pid[i]] = Math.min(partTop[pid[i]], (i / W) | 0);

    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const p = pid[i];
        if (!p) continue;
        const part = this.parts[p];
        const m = this.matList[this.mid[i]];
        let tone = this.tone[i];
        if (tone === AUTO) {
          tone = 0;
          if (!part.flat && !m.flat) {
            // an edge is where this part ends — not where a flat detail
            // (eye, mouth, print, stripe) is painted on top of it; those
            // would otherwise ring every feature with shade pixels
            const edge = (xx: number, yy: number) => {
              const q = pidAt(xx, yy);
              if (q === p) return false;
              if (q && this.parts[q].z > part.z && (!part.inner || this.parts[q].flat || this.matList[this.mid[yy * W + xx]].flat)) return false;
              return true;
            };
            const R = edge(x + 1, y);
            const L = edge(x - 1, y);
            const T = edge(x, y - 1);
            const B = edge(x, y + 1);
            const sh = part.shade;
            const li = part.light;
            if ((R && sh.includes('r')) || (B && sh.includes('b')) || (L && sh.includes('l')) || (T && sh.includes('t'))) tone = -1;
            else {
              const len = runR[i] - runL[i] + 1;
              const hgt = runB[i] - runT[i] + 1;
              if (T && li.includes('T')) tone = 1;
              else if (T && li.includes('t') && x - runL[i] < Math.max(1, Math.ceil(len * 0.5))) tone = 1;
              else if (L && li.includes('L')) tone = 1;
              else if (L && li.includes('l') && y - runT[i] < Math.max(1, Math.ceil(hgt * 0.5))) tone = 1;
            }
            tone += part.shift;
            // separation lines against parts in front
            if (part.sep || part.sepAll) {
              const n = [pidAt(x + 1, y), pidAt(x - 1, y), pidAt(x, y + 1), pidAt(x, y - 1)];
              const nm = [
                x + 1 < W ? this.mid[i + 1] : -1,
                x > 0 ? this.mid[i - 1] : -1,
                y + 1 < H ? this.mid[i + W] : -1,
                y > 0 ? this.mid[i - W] : -1,
              ];
              for (let k = 0; k < 4; k++) {
                const q = n[k];
                if (!q || q === p) continue;
                if (this.parts[q].z <= part.z) continue;
                if (part.sepAll || this.matList[nm[k]] === m) {
                  tone = -2;
                  break;
                }
              }
            }
          }
          tone = Math.max(-2, Math.min(2, tone));
        }
        let col = m.ramp[tone + 2];
        // the lit left fill column is continuous (a broken light/base
        // alternation read as a checker on trousers and sleeves); the
        // outline-column rim below is the one that breaks every 2–3 rows
        if (part.rim && !m.norim && pidAt(x - 1, y) === 0 && tone > -2) col = m.rim;
        out.set(x, y, col);
      }

    // outer outline
    const mode = o.outline ?? 'color';
    if (mode !== 'none') {
      const src = out.data.slice();
      const olAt = (x: number, y: number): number => {
        if (x < 0 || y < 0 || x >= W || y >= H) return -1;
        const p = pid[y * W + x];
        if (!p || !this.parts[p].ol) return -1;
        if (src[y * W + x] >>> 24 === 0) return -1;
        return y * W + x;
      };
      const plain = rgba32(C.ol);
      // outer sunset rim: the outline pixel on the lit (screen-left) side of
      // the silhouette becomes the rim color every 2–3 rows; never more
      // than two rim rows in a row along one edge
      const rimAt = new Uint8Array(W * H);
      const outerRim = (x: number, y: number): number => {
        if (mode !== 'color' || x + 1 >= W) return 0;
        if (pidAt(x - 1, y) !== 0) return 0;
        const j = y * W + x + 1;
        const q = pid[j];
        if (!q || src[j] >>> 24 === 0) return 0;
        const part = this.parts[q];
        const m = this.matList[this.mid[j]];
        if (!part.rim || !part.ol || m.norim || !m.orim) return 0;
        if (!outerRimOn(y, partTop[q])) return 0;
        const run = (yy: number) => yy >= 0 && (rimAt[yy * W + x] || (x > 0 && rimAt[yy * W + x - 1]) || (x + 1 < W && rimAt[yy * W + x + 1]));
        if (run(y - 1) && run(y - 2)) return 0;
        rimAt[y * W + x] = 1;
        return rgba32(m.orim);
      };
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (src[i] >>> 24 !== 0 && pid[i]) continue;
          if (src[i] >>> 24 !== 0) continue;
          const rc = outerRim(x, y);
          if (rc) {
            out.data[i] = rc;
            continue;
          }
          // bottom and right edges: #2A2440; top and left: the fill's darkest (colored)
          const up = olAt(x, y - 1);
          const lf = olAt(x - 1, y);
          const dn = olAt(x, y + 1);
          const rt = olAt(x + 1, y);
          let n = up >= 0 ? up : lf >= 0 ? lf : dn >= 0 ? dn : rt;
          const plainSide = up >= 0 || lf >= 0;
          if (n < 0 && o.heavy) {
            n = olAt(x - 1, y - 1);
            if (n < 0) n = olAt(x + 1, y - 1);
            if (n < 0) n = olAt(x - 1, y + 1);
            if (n < 0) n = olAt(x + 1, y + 1);
          }
          if (n < 0) continue;
          const nm = this.matList[this.mid[n]];
          if (nm.soft && (x + y) % 2 === 0) out.data[i] = rgba32(nm.ramp[0]);
          else if (mode === 'plain' || plainSide) out.data[i] = plain;
          else out.data[i] = rgba32(nm.ol);
        }
    }
    for (const f of this.post) f(view);
    return out;
  }
}
