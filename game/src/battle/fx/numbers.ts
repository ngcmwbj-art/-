// Hand-drawn damage digits (8×12, big 12×18) and the pop → arc → hold → fade
// number animation (20_systems_battle.md 16.4).

import type { Gfx } from '../../engine/gfx';
import { makeCanvas } from '../../engine/pixel';
import { ease } from '../../engine/tween';
import { C } from '../ui/note';

/**
 * Normal digits: 7×11 core with 2px strokes (the sprite is 11×15 with the
 * vermilion edge and the ink outline). 16.4 asks for "8×12" digits; drawn
 * with 1px strokes they read as a red price tag, so the strokes are doubled.
 */
const SMALL: string[][] = [
  ['..###..', '.##.##.', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.##.##.', '..###..'],
  ['...##..', '..###..', '.####..', '...##..', '...##..', '...##..', '...##..', '...##..', '...##..', '...##..', '.######'],
  ['.#####.', '##...##', '.....##', '.....##', '....##.', '...##..', '..##...', '.##....', '##.....', '##.....', '#######'],
  ['.#####.', '##...##', '.....##', '.....##', '..####.', '.....##', '.....##', '.....##', '.....##', '##...##', '.#####.'],
  ['....##.', '...###.', '..####.', '.##.##.', '##..##.', '##..##.', '#######', '#######', '....##.', '....##.', '....##.'],
  ['#######', '##.....', '##.....', '######.', '.....##', '.....##', '.....##', '.....##', '.....##', '##...##', '.#####.'],
  ['..####.', '.##....', '##.....', '##.....', '######.', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  ['#######', '#######', '.....##', '....##.', '....##.', '...##..', '...##..', '..##...', '..##...', '..##...', '..##...'],
  ['.#####.', '##...##', '##...##', '##...##', '.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  ['.#####.', '##...##', '##...##', '##...##', '##...##', '.######', '.....##', '.....##', '.....##', '....##.', '.####..'],
];

const BIG: string[][] = [
  ['..####..', '.##..##.', '##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '##...##.', '.##.##..', '..###...'],
  ['...##...', '..###...', '.####...', '...##...', '...##...', '...##...', '...##...', '...##...', '...##...', '...##...', '...##...', '...##...', '..####..', '.######.'],
  ['..####..', '.##..##.', '##....##', '......##', '......##', '.....##.', '....##..', '...##...', '..##....', '.##.....', '##......', '##......', '########', '.#######'],
  ['.#####..', '##...##.', '......##', '......##', '.....##.', '..####..', '..#####.', '......##', '......##', '......##', '......##', '##...##.', '.#####..', '..###...'],
  ['.....##.', '....###.', '...####.', '..##.##.', '.##..##.', '##...##.', '##...##.', '########', '########', '.....##.', '.....##.', '.....##.', '.....##.', '.....##.'],
  ['.#######', '.##.....', '.##.....', '##......', '######..', '##...##.', '......##', '......##', '......##', '......##', '##....##', '##...##.', '.#####..', '..###...'],
  ['...####.', '..##....', '.##.....', '##......', '##......', '######..', '##...##.', '##....##', '##....##', '##....##', '##....##', '.##..##.', '..####..', '...##...'],
  ['########', '######.#', '.....##.', '.....##.', '....##..', '....##..', '...##...', '...##...', '..##....', '..##....', '..##....', '.##.....', '.##.....', '.##.....'],
  ['..####..', '.##..##.', '##....##', '##....##', '.##..##.', '..####..', '.##..##.', '##....##', '##....##', '##....##', '##....##', '.##..##.', '..####..', '...##...'],
  ['..####..', '.##..##.', '##....##', '##....##', '##....##', '.##..###', '..######', '......##', '......##', '.....##.', '.....##.', '....##..', '.###....', '.##.....'],
];

export type NumKind = 'dmg' | 'dmg2' | 'heal' | 'mp' | 'zero' | 'crit';

interface Palette {
  core: string;
  hi?: string;
  edge: string;
  outer: string;
}

const PAL: Record<NumKind, Palette> = {
  dmg: { core: C.white, edge: C.shu, outer: C.ink },
  // the second hit of a 2段 strike: inverted (vermilion digits, white edge),
  // so the two numbers never read as one
  dmg2: { core: C.shu, hi: C.shuLight, edge: C.white, outer: C.ink },
  crit: { core: C.flash, edge: C.shu, outer: C.ink },
  heal: { core: C.green, hi: C.greenLight, edge: C.greenDark, outer: C.white },
  mp: { core: C.shu, hi: C.shuLight, edge: C.shuDark, outer: C.white },
  zero: { core: C.gray, edge: C.grayDark, outer: C.ink },
};

const glyphCache = new Map<string, HTMLCanvasElement>();

function buildGlyph(d: number, big: boolean, pal: Palette): HTMLCanvasElement {
  const rows = (big ? BIG : SMALL)[d];
  const cw = rows[0].length;
  const ch = rows.length;
  // big digits (くっきり, 100てん) are drawn bold: every stroke one pixel wider
  const bold = big;
  const W = cw + 4 + (bold ? 1 : 0);
  const H = ch + 4;
  const grid = new Uint8Array(W * H); // 0 none, 1 core, 2 edge, 3 outer
  for (let y = 0; y < ch; y++)
    for (let x = 0; x <= cw; x++)
      if (rows[y][x] === '#' || (bold && x > 0 && rows[y][x - 1] === '#')) grid[(y + 2) * W + x + 2] = 1;
  const dilate = (from: number, to: number) => {
    const src = grid.slice();
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (src[y * W + x]) continue;
        let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            const v = src[yy * W + xx];
            if (v && v <= from) {
              hit = true;
              break;
            }
          }
        if (hit) grid[y * W + x] = to;
      }
  };
  dilate(1, 2);
  dilate(2, 3);
  const [c, ctx] = makeCanvas(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = grid[y * W + x];
      if (!v) continue;
      let col = v === 1 ? pal.core : v === 2 ? pal.edge : pal.outer;
      // highlight the top pixel of each core column
      if (v === 1 && pal.hi && grid[(y - 1) * W + x] !== 1) col = pal.hi;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  return c;
}

function glyph(d: number, big: boolean, kind: NumKind): HTMLCanvasElement {
  const key = `${d}:${big}:${kind}`;
  let c = glyphCache.get(key);
  if (!c) {
    c = buildGlyph(d, big, PAL[kind]);
    glyphCache.set(key, c);
  }
  return c;
}

// ---- tiny icons next to numbers ------------------------------------------

let miniHana: HTMLCanvasElement | null = null;
/** Small hanamaru (8×8) shown next to heal numbers. */
export function miniHanamaru(): HTMLCanvasElement {
  if (miniHana) return miniHana;
  const [c, ctx] = makeCanvas(9, 9);
  const px = (x: number, y: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  // petals (outer ring) and spiral
  const ring = ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'];
  const spiral = ['.......', '..##...', '.#..#..', '.#.##..', '..#....', '.......', '.......'];
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 7; x++) {
      if (ring[y][x] === '#') px(x + 1, y + 1, C.shu);
      if (spiral[y][x] === '#') px(x + 1, y + 1, C.shu);
    }
  // white rim for legibility
  const img = ctx.getImageData(0, 0, 9, 9);
  const out = document.createElement('canvas');
  out.width = 9;
  out.height = 9;
  const o = out.getContext('2d')!;
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 9; x++) {
      const a = img.data[(y * 9 + x) * 4 + 3];
      if (a) continue;
      let near = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < 9 && yy < 9 && img.data[(yy * 9 + xx) * 4 + 3]) near = true;
      }
      if (near) {
        o.fillStyle = C.white;
        o.fillRect(x, y, 1, 1);
      }
    }
  o.drawImage(c, 0, 0);
  miniHana = out;
  return out;
}

let miniPot: HTMLCanvasElement | null = null;
/** Small ink pot (7×8) for 朱肉 recovery numbers. */
export function miniInkPot(): HTMLCanvasElement {
  if (miniPot) return miniPot;
  const rows = ['..www..', '.wkkkw.', 'wkkkkkw', 'wkrlrkw', 'wkrrrkw', 'wkrrrkw', 'wkkkkkw', '.wwwww.'];
  const [c, ctx] = makeCanvas(7, 8);
  const pal: Record<string, string> = { w: C.white, k: C.ink, r: C.shu, l: C.shuLight };
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      const col = pal[ch];
      if (!col) return;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  miniPot = c;
  return c;
}

/**
 * Compose a number string into one canvas. Every digit keeps its own
 * vermilion edge and ink outline (no shared plate behind the number); digits
 * overlap by their outline, the left one on top, and every other digit sits
 * 1px lower — a hand-written bounce.
 */
export function numberCanvas(n: number, kind: NumKind, big = false): HTMLCanvasElement {
  const s = String(Math.max(0, Math.round(n)));
  const g0 = glyph(0, big, kind);
  const gw = g0.width;
  const gh = g0.height;
  const adv = gw - 2;
  const extra = kind === 'heal' ? 9 : kind === 'mp' ? 8 : 0;
  const w = adv * (s.length - 1) + gw + extra;
  const h = gh + 1;
  const [c, ctx] = makeCanvas(w, h);
  for (let i = s.length - 1; i >= 0; i--) ctx.drawImage(glyph(+s[i], big, kind), i * adv, (s.length - 1 - i) % 2);
  if (kind === 'heal') ctx.drawImage(miniHanamaru(), w - 9, Math.round(gh / 2) - 4);
  if (kind === 'mp') ctx.drawImage(miniInkPot(), w - 7, Math.round(gh / 2) - 4);
  return c;
}

export interface NumRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Rest rectangle of a number drawn bottom-centred at (x, y). */
export function numberRest(x: number, y: number, w: number, h: number, rise: number, drift = 6): NumRect {
  const cx = x + drift;
  return { x0: Math.round(cx - w / 2), y0: Math.round(y - rise - h), x1: Math.round(cx + w / 2), y1: Math.round(y - rise) };
}

export interface NumOpts {
  kind?: NumKind;
  big?: boolean;
  /** Rise height (16 above enemies, 12 above panels). */
  rise?: number;
  /** Pop scale multiplier (0.8 for halved tsukkomi damage). */
  pop?: number;
  delay?: number;
  /** Sideways drift while rising (16.4: +6; party numbers lean away from the "!"). */
  drift?: number;
  /**
   * A soft dark plate under the digits (enemy numbers): the vermilion edge
   * melts into a red enemy or the red band of a background without it.
   */
  backing?: boolean;
  /**
   * An opaque ink plate with rounded corners instead (QA round 2): over a
   * busy red-and-cream enemy (the vending machine's can rows) the soft
   * plate still let the digits camouflage.
   */
  plate?: boolean;
}

const plateCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
/** Rounded ink plate (2px larger than the number all round) with a 1px violet rim. */
function plateFor(img: HTMLCanvasElement): HTMLCanvasElement {
  let p = plateCache.get(img);
  if (p) return p;
  const w = img.width + 4;
  const h = img.height + 2;
  const [c, ctx] = makeCanvas(w, h);
  ctx.fillStyle = '#5B4A7A';
  ctx.fillRect(2, 0, w - 4, h);
  ctx.fillRect(1, 1, w - 2, h - 2);
  ctx.fillRect(0, 2, w, h - 4);
  ctx.fillStyle = '#1B1733';
  ctx.fillRect(2, 1, w - 4, h - 2);
  ctx.fillRect(1, 2, w - 2, h - 4);
  p = c;
  plateCache.set(img, p);
  return p;
}

const backingCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
/** The number's silhouette grown by 2px in #1B1733 (drawn at α≈0.5 under it). */
function backingFor(img: HTMLCanvasElement): HTMLCanvasElement {
  let b = backingCache.get(img);
  if (b) return b;
  const [c, ctx] = makeCanvas(img.width + 4, img.height + 4);
  const [sil, sctx] = makeCanvas(img.width, img.height);
  sctx.drawImage(img, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = '#1B1733';
  sctx.fillRect(0, 0, img.width, img.height);
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) ctx.drawImage(sil, 2 + dx, 2 + dy);
  b = c;
  backingCache.set(img, b);
  return b;
}

/** One floating number: pop (80ms) → arc up (250ms) → hold (400ms) → fade (200ms). */
export class DamageNumber {
  t = 0;
  done = false;
  readonly img: HTMLCanvasElement;
  readonly kind: NumKind;
  private rise: number;
  private pop: number;
  private delay: number;
  private drift: number;
  private backing: boolean;
  private plate: boolean;

  constructor(
    public x: number,
    public y: number,
    n: number,
    o: NumOpts = {},
  ) {
    this.kind = o.kind ?? 'dmg';
    this.img = numberCanvas(n, this.kind, o.big);
    this.rise = o.rise ?? 16;
    this.pop = o.pop ?? 1;
    this.delay = o.delay ?? 0;
    this.drift = o.drift ?? 6;
    this.backing = !!o.backing;
    this.plate = !!o.plate;
  }

  /** A shorter rise (the next number of a multi-hit pops almost in place). */
  setRise(px: number): void {
    this.rise = px;
    this.drift = Math.min(this.drift, 2);
  }

  /** Where the number comes to rest (after the rise and the 6px drift). */
  restRect(): NumRect {
    return numberRest(this.x, this.y, this.img.width, this.img.height, this.kind === 'zero' ? -4 : this.rise, this.kind === 'zero' ? 0 : this.drift);
  }

  /** Total on-screen time (ms), including the delay. */
  get life(): number {
    return 930 + this.delay;
  }

  update(dt: number): void {
    if (this.delay > 0) {
      this.delay -= dt;
      return;
    }
    this.t += dt;
    if (this.t >= 930) this.done = true;
  }

  draw(g: Gfx): void {
    if (this.delay > 0 || this.done) return;
    const t = this.t;
    let sx = 1;
    let sy = 1;
    let dx = 0;
    let dy = 0;
    let a = 1;
    if (this.kind === 'zero') {
      // droops 4px and fades (しょんぼり)
      if (t < 80) {
        const p = t / 80;
        sx = sy = 1.3 - 0.3 * p;
      }
      dy = t < 200 ? 0 : Math.min(4, ((t - 200) / 400) * 4);
      a = t < 600 ? 1 : Math.max(0, 1 - (t - 600) / 330);
    } else {
      if (t < 80) {
        const p = t / 80;
        // 1.6 → 0.9 → 1.0 horizontally, 0.7 → 1.1 → 1.0 vertically
        if (p < 0.6) {
          const q = p / 0.6;
          sx = 1.6 + (0.9 - 1.6) * q;
          sy = 0.7 + (1.1 - 0.7) * q;
        } else {
          const q = (p - 0.6) / 0.4;
          sx = 0.9 + 0.1 * q;
          sy = 1.1 - 0.1 * q;
        }
      } else if (t < 330) {
        const p = (t - 80) / 250;
        dy = -this.rise * ease.quadOut(p);
        dx = this.drift * p;
      } else {
        dy = -this.rise;
        dx = this.drift;
      }
      if (t > 730) a = Math.max(0, 1 - (t - 730) / 200);
      sx *= this.pop;
      sy *= this.pop;
    }
    const w = this.img.width * sx;
    const h = this.img.height * sy;
    const ctx = g.ctx;
    const prev = ctx.globalAlpha;
    const X = Math.round(this.x + dx - w / 2);
    const Y = Math.round(this.y + dy - h);
    if (this.plate) {
      const b = plateFor(this.img);
      const kx = w / this.img.width;
      const ky = h / this.img.height;
      ctx.globalAlpha = prev * a * 0.94;
      ctx.drawImage(b, Math.round(X - 2 * kx), Math.round(Y - 1 * ky), Math.round(b.width * kx), Math.round(b.height * ky));
    } else if (this.backing) {
      const b = backingFor(this.img);
      const kx = w / this.img.width;
      const ky = h / this.img.height;
      ctx.globalAlpha = prev * a * 0.5;
      ctx.drawImage(b, Math.round(X - 2 * kx), Math.round(Y - 2 * ky), Math.round(b.width * kx), Math.round(b.height * ky));
    }
    ctx.globalAlpha = prev * a;
    ctx.drawImage(this.img, X, Y, Math.round(w), Math.round(h));
    ctx.globalAlpha = prev;
  }
}
