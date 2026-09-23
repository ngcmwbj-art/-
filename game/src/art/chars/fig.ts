// Fig: a material-aware pixel buffer used to author every character sprite.
//
// Art is drawn as flat "parts" (head, hair, torso, arm, ...) that carry a
// material. render() then lights the figure consistently for the whole game:
//   - form shading from each part's own edges (right/bottom edges darker,
//     top-left edge lighter) so the west sun always lights the left side,
//     even for mirrored (right-facing) frames,
//   - selective inner lines where a part overlaps another of the same color,
//   - a 1px sunset rim on the left silhouette edge,
//   - a colored outer outline (dark, tinted toward the adjacent material).
// Explicit tones set while drawing override the automatic shading.

import { PixelCanvas, rgba32 } from '../../engine/pixel';
import { C, ramp, rimOf, outlineOf, type Ramp, type RampOpts } from './palette';

export interface Mat {
  ramp: Ramp;
  rim: string;
  ol: string;
  /** No automatic shading (explicit tones still apply). */
  flat: boolean;
  norim: boolean;
}

export interface MatOpts extends RampOpts {
  rim?: string;
  ol?: string;
  flat?: boolean;
  norim?: boolean;
}

/** Create a material from a base color (hue-shifted ramp) or an explicit ramp. */
export function mat(base: string | Ramp, o: MatOpts = {}): Mat {
  const r: Ramp = typeof base === 'string' ? ramp(base, o) : base;
  return {
    ramp: r,
    rim: o.rim ?? rimOf(r[2], r[3]),
    ol: o.ol ?? outlineOf(r[0]),
    flat: !!o.flat,
    norim: !!o.norim,
  };
}

/** A single flat color material (details: eyes, prints, buttons). */
export function flat(c: string, o: { rim?: string; ol?: string; norim?: boolean } = {}): Mat {
  return { ramp: [c, c, c, c, c], rim: o.rim ?? c, ol: o.ol ?? C.ol, flat: true, norim: o.norim ?? true };
}

export type Mats = Record<string, Mat>;

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
}

const AUTO = 99;

export type RowMap = Record<string, string | [string | null, number | null] | null>;

export interface RenderOpts {
  /** 'color' (default) = tinted selective outline, 'plain' = #2A2440 everywhere, 'none'. */
  outline?: 'color' | 'plain' | 'none';
  /** Draw diagonal outline corners too (heavier look for big sprites). */
  heavy?: boolean;
}

export class Fig {
  readonly w: number;
  readonly h: number;
  readonly pid: Int16Array;
  readonly mid: Int16Array;
  readonly tone: Int8Array;
  private parts: Part[] = [{ z: -1, shade: '', light: '', shift: 0, sep: false, sepAll: false, flat: true, rim: false, ol: false }];
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

  constructor(w: number, h: number, mats: Mats) {
    this.w = w;
    this.h = h;
    this.pid = new Int16Array(w * h);
    this.mid = new Int16Array(w * h);
    this.tone = new Int8Array(w * h).fill(AUTO);
    for (const k of Object.keys(mats)) this.addMat(k, mats[k]);
  }

  addMat(name: string, m: Mat): number {
    const i = this.matList.length;
    this.matList.push(m);
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
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  px(x: number, y: number): this {
    x = Math.round(x + this.ox);
    y = Math.round(y + this.oy);
    if (!this.inside(x, y)) return this;
    const i = y * this.w + x;
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
   * (auto tone), '+' light, '-' shade, '=' dark, '*' spec, 'o' base (explicit),
   * 'x' erase. `map` adds letters → material name or [material|null, tone|null].
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
          case '+': this.curTone = 1; break;
          case '-': this.curTone = -1; break;
          case '=': this.curTone = -2; break;
          case '*': this.curTone = 2; break;
          case 'o': this.curTone = 0; break;
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
        const k = Y * this.w + X;
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
        const k = Y * this.w + X;
        if (this.pid[k]) this.tone[k] = tone;
      }
    return this;
  }

  /** Is the pixel covered by any part? */
  filled(x: number, y: number): boolean {
    x = Math.round(x + this.ox);
    y = Math.round(y + this.oy);
    return this.inside(x, y) && this.pid[y * this.w + x] !== 0;
  }

  /** Mirror horizontally (used to make right-facing frames from left ones). */
  flip(): this {
    const W = this.w;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < W >> 1; x++) {
        const a = y * W + x;
        const b = y * W + (W - 1 - x);
        let t = this.pid[a]; this.pid[a] = this.pid[b]; this.pid[b] = t;
        t = this.mid[a]; this.mid[a] = this.mid[b]; this.mid[b] = t;
        t = this.tone[a]; this.tone[a] = this.tone[b]; this.tone[b] = t;
      }
    return this;
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
    const H = this.h;
    const pid = this.pid;
    const out = new PixelCanvas(W, H);
    for (const f of this.pre) f(out);
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
            const R = pidAt(x + 1, y) !== p;
            const L = pidAt(x - 1, y) !== p;
            const T = pidAt(x, y - 1) !== p;
            const B = pidAt(x, y + 1) !== p;
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
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (src[i] >>> 24 !== 0 && pid[i]) continue;
          if (src[i] >>> 24 !== 0) continue;
          // priority: below (ground contact), right, above, left
          let n = olAt(x, y - 1);
          const below = n;
          if (n < 0) n = olAt(x - 1, y);
          if (n < 0) n = olAt(x, y + 1);
          if (n < 0) n = olAt(x + 1, y);
          if (n < 0 && o.heavy) {
            n = olAt(x - 1, y - 1);
            if (n < 0) n = olAt(x + 1, y - 1);
            if (n < 0) n = olAt(x - 1, y + 1);
            if (n < 0) n = olAt(x + 1, y + 1);
          }
          if (n < 0) continue;
          if (mode === 'plain' || below >= 0) out.data[i] = plain;
          else out.data[i] = rgba32(this.matList[this.mid[n]].ol);
        }
    }
    for (const f of this.post) f(out);
    return out;
  }
}
