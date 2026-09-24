// Trees (30_level_art 6.6): trunk in the depth-sorted layer, canopy in the
// foreground (fades to 32% while the party, a passer-by or a symbol is under it), dappled canopy
// shadow thrown with the sun (holes twinkle; frozen in stage 1).
// Every species has its own silhouette, palette and per-instance variation.

import { PixelCanvas, rgba32 } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { ihash, mulberry } from '../tiles/noise';
import { dk, lt, outline } from './kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

interface LeafPal {
  lt: string;
  mid: string;
  dk: string;
  deep: string;
  spec?: string;
}

const PAL: Record<string, LeafPal> = {
  keyaki: { lt: P.leafYoung, mid: P.leaf, dk: P.leafDeep, deep: P.leafShade, spec: P.leafLt },
  cherry: { lt: P.leaf, mid: P.leafDeep, dk: P.leafShade, deep: P.ink, spec: P.leafYoung },
  kusu: { lt: P.leafLt, mid: P.leafYoung, dk: P.leaf, deep: P.leafDeep, spec: P.glint },
  sarusuberi: { lt: P.leaf, mid: P.leafDeep, dk: P.leafShade, deep: P.ink, spec: P.leafYoung },
  ichou: { lt: P.leafLt, mid: P.leafYoung, dk: P.leaf, deep: P.leafDeep, spec: P.goldPale },
  matsu: { lt: P.leaf, mid: P.leafDeep, dk: P.leafShade, deep: P.ink, spec: P.leafYoung },
  persimmon: { lt: P.leafYoung, mid: P.leaf, dk: P.leafDeep, deep: P.leafShade, spec: P.leafLt },
  hanamizuki: { lt: P.leafYoung, mid: P.leaf, dk: P.leafDeep, deep: P.leafShade, spec: P.leafLt },
};

interface Clump {
  x: number;
  y: number;
  r: number;
}

/**
 * Canopy (review round 2): the mass comes from the big clumps, but what the
 * eye reads are leaf clusters (房) of 3–5px laid over it in a jittered grid,
 * top rows first so lower clusters overlap upper ones. Every cluster has a
 * lit upper-left, a body and a shaded lower-right, one tone apart, and its
 * base tone follows the light over the whole crown (upper-left bright,
 * lower-right and underside dark). Clusters at the rim poke out of the mass
 * so the silhouette is lumpy; the underside gets a dark band where the crown
 * shades itself and the trunk. No noise, no checker dither inside.
 * Returns frames [calm, sway, NE-lean].
 */
function canopy(
  w: number,
  h: number,
  clumps: Clump[],
  pal: LeafPal,
  seed: number,
  opts: { flowers?: string; fruit?: string; needle?: boolean; fan?: boolean } = {},
): { frames: PixelCanvas[]; sparkle: [number, number][] } {
  const tones = [pal.deep, pal.dk, pal.mid, pal.lt];
  const rnd0 = mulberry(seed + 31);
  // leaf clusters on a jittered 4px grid (shared by all frames)
  const cell = opts.needle ? 5 : 4;
  const leaves: { x: number; y: number; rx: number; ry: number; v: number }[] = [];
  for (let gy = -1; gy < h / cell + 1; gy++)
    for (let gx = -1; gx < w / cell + 1; gx++) {
      const jx = rnd0() * cell * 0.9;
      const jy = rnd0() * cell * 0.9;
      const r = 1.6 + rnd0() * 1.0;
      leaves.push({
        x: gx * cell + jx + (gy & 1 ? cell / 2 : 0),
        y: gy * cell + jy,
        rx: opts.needle ? r + 1.2 : r,
        ry: opts.needle ? r * 0.6 : r * 0.9,
        v: rnd0(),
      });
    }
  leaves.sort((p, q) => p.y - q.y);
  const mk = (sway: number, lean: number): PixelCanvas => {
    const p = new PixelCanvas(w, h);
    const offOf = (cy: number) => (sway && cy < h * 0.45 ? sway : 0) + (lean ? Math.round(lean * (1 - cy / h)) : 0);
    // 1. crown mass (distance to the nearest big clump) and its light value
    const inside = new Float32Array(w * h).fill(-1);
    const litv = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let best = 9;
        let bi = -1;
        for (let i = 0; i < clumps.length; i++) {
          const c = clumps[i];
          const dx = (x + 0.5 - c.x - offOf(c.y)) / c.r;
          const dy = (y + 0.5 - c.y) / (c.r * 0.9);
          const d = dx * dx + dy * dy;
          if (d < best) {
            best = d;
            bi = i;
          }
        }
        if (bi < 0) continue;
        const c = clumps[bi];
        const dx = (x + 0.5 - c.x - offOf(c.y)) / c.r;
        const dy = (y + 0.5 - c.y) / (c.r * 0.9);
        litv[y * w + x] = -dx * 0.45 - dy * 0.55 + (1 - y / h) * 0.9 - (x / w) * 0.55 - 0.1;
        if (best <= 1) inside[y * w + x] = best;
      }
    const tone = (x: number, y: number): number => {
      const xi = Math.max(0, Math.min(w - 1, Math.round(x)));
      const yi = Math.max(0, Math.min(h - 1, Math.round(y)));
      const L = litv[yi * w + xi];
      return L > 0.62 ? 3 : L > 0.12 ? 2 : L > -0.42 ? 1 : 0;
    };
    // 2. the shaded depth between clusters (one tone under the light value)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = inside[y * w + x];
        if (v < 0 || v > 0.82) continue;
        p.set(x, y, tones[Math.max(0, tone(x, y) - 1)]);
      }
    // 3. leaf clusters, top first
    const drawn = new Uint8Array(w * h);
    for (const lf of leaves) {
      const cx = lf.x + offOf(lf.y);
      const cy = lf.y;
      const xi = Math.round(cx);
      const yi = Math.round(cy);
      if (xi < 0 || yi < 0 || xi >= w || yi >= h) continue;
      const m = inside[yi * w + xi];
      if (m < 0 || m > 0.92) continue;
      const base = tone(cx, cy) - (lf.v < 0.18 ? 1 : 0);
      for (let y = Math.floor(cy - lf.ry - 1); y <= Math.ceil(cy + lf.ry + 1); y++)
        for (let x = Math.floor(cx - lf.rx - 1); x <= Math.ceil(cx + lf.rx + 1); x++) {
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const u = (x + 0.5 - cx) / lf.rx;
          const q = (y + 0.5 - cy) / lf.ry;
          const d = u * u + q * q;
          if (d > 1) continue;
          const diag = u + q;
          let t = base;
          if (diag < -0.55) t = base + 1;
          else if (diag > 0.75 || q > 0.7) t = base - 1;
          p.set(x, y, tones[Math.max(0, Math.min(3, t))]);
          drawn[y * w + x] = 1;
        }
      // a speck of spec highlight on the brightest clusters
      if (base >= 3 && pal.spec && lf.v > 0.72) p.set(Math.round(cx - lf.rx * 0.4), Math.round(cy - lf.ry * 0.5), pal.spec);
      if (opts.fan && base >= 2 && lf.v > 0.8) p.set(Math.round(cx), Math.round(cy - 1), pal.spec ?? pal.lt);
    }
    // 4. the underside: a dark band along the bottom of the crown
    for (let x = 0; x < w; x++) {
      let bot = -1;
      for (let y = h - 1; y >= 0; y--)
        if (p.alpha(x, y)) {
          bot = y;
          break;
        }
      if (bot < 0) continue;
      for (let k = 0; k < 3; k++) {
        const y = bot - k;
        if (!p.alpha(x, y)) break;
        if (k === 2 && (x + seed) % 3) continue;
        p.set(x, y, k === 0 ? pal.deep : pal.dk);
      }
    }
    // 5. warm rim light on the sun (west) side of each row, broken
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!p.alpha(x, y)) continue;
        if (y % 3 !== 2 && tone(x, y) >= 1) p.set(x, y, P.sun);
        break;
      }
    // flowers / fruit
    if (opts.flowers || opts.fruit) {
      const rnd = mulberry(seed + 7);
      for (let k = 0; k < (opts.flowers ? 14 : 7); k++) {
        const c = clumps[Math.floor(rnd() * clumps.length)];
        const fx = Math.round(c.x + (rnd() - 0.6) * c.r);
        const fy = Math.round(c.y + (rnd() - 0.6) * c.r);
        if (p.alpha(fx, fy) === 0) continue;
        if (opts.flowers) {
          p.set(fx, fy, opts.flowers);
          p.set(fx + 1, fy, opts.flowers);
          p.set(fx, fy + 1, dk(opts.flowers));
          p.set(fx - 1, fy + 1, lt(opts.flowers));
        } else {
          p.set(fx, fy, opts.fruit!);
          p.set(fx + 1, fy, dk(opts.fruit!));
          p.set(fx, fy + 1, dk(opts.fruit!));
          p.set(fx, fy - 1, P.leafShade);
          p.set(fx - 1, fy, lt(opts.fruit!));
        }
      }
    }
    void drawn;
    outline(p, { bottom: true, soft: true });
    return p;
  };
  const frames = [mk(0, 0), mk(1, 0), mk(0, 2)];
  // two sparkle spots (光の粒) on the lit upper-left
  const sp: [number, number][] = [];
  const rnd = mulberry(seed + 99);
  for (let k = 0; k < 40 && sp.length < 2; k++) {
    const x = Math.floor(w * (0.15 + rnd() * 0.4));
    const y = Math.floor(h * (0.1 + rnd() * 0.35));
    if (frames[0].alpha(x, y) && frames[0].alpha(x + 1, y + 1)) sp.push([x, y]);
  }
  return { frames, sparkle: sp };
}

/** Clumps in an ellipse, with a few bigger lobes at the rim. */
function clumpsFor(w: number, h: number, seed: number, count: number, rmin: number, rmax: number, shape: 'round' | 'vase' | 'cone' | 'pads' | 'spread'): Clump[] {
  const rnd = mulberry(seed);
  const out: Clump[] = [];
  const cx = w / 2;
  const cy = h / 2;
  for (let k = 0; k < count; k++) {
    const a = rnd() * Math.PI * 2;
    let rr = Math.sqrt(rnd());
    let x = cx + Math.cos(a) * rr * (w / 2 - rmax * 0.8);
    let y = cy + Math.sin(a) * rr * (h / 2 - rmax * 0.8);
    if (shape === 'vase') y = cy + Math.sin(a) * rr * (h / 2 - rmax) * 0.8 - (1 - Math.abs(Math.cos(a))) * 4;
    if (shape === 'cone') {
      const t = rnd();
      y = rmax + t * (h - rmax * 2);
      const half = (w / 2 - rmax * 0.6) * (0.3 + 0.7 * t);
      x = cx + (rnd() * 2 - 1) * half;
    }
    if (shape === 'pads') {
      const tier = Math.floor(rnd() * 4);
      y = rmax + tier * ((h - rmax * 2) / 3);
      x = cx + (rnd() * 2 - 1) * (w / 2 - rmax) * (0.55 + tier * 0.15);
      rr = 0;
    }
    if (shape === 'spread') y = cy + Math.sin(a) * rr * (h / 2 - rmax) * 0.7;
    out.push({ x, y, r: rmin + rnd() * (rmax - rmin) });
  }
  return out;
}

/** Trunk image (sorted layer). Options: a name tag tied round it, weeds at the foot. */
function trunk(kind: string, seed: number, h: number, wBase: number, deco: { tag?: boolean; weeds?: boolean } = {}): PixelCanvas {
  const w = wBase + 8;
  const p = new PixelCanvas(w, h);
  const cx = Math.floor(w / 2);
  const bark = kind === 'sarusuberi' ? P.woodLt : kind === 'cherry' || kind === 'willow' ? P.woodDark : kind === 'matsu' ? P.wood : P.wood;
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const half = Math.max(1, Math.round((wBase / 2) * (0.65 + 0.35 * t)));
    const sway = kind === 'matsu' ? Math.round(Math.sin(y / 5 + seed) * 1.5) : 0;
    for (let x = cx - half + sway; x < cx + half + sway; x++) {
      const u = (x - (cx - half + sway)) / (half * 2);
      let c = u < 0.25 ? lt(bark) : u > 0.7 ? dk(bark) : bark;
      if (kind === 'cherry' && y % 4 === 1) c = dk(bark); // horizontal lenticels
      if (kind !== 'sarusuberi' && ihash(x, y >> 1, seed) % 9 === 0) c = dk(bark);
      if (kind === 'keyaki' && u < 0.4 && ihash(x >> 1, y >> 2, seed + 3) % 4 === 0) c = P.leafDeep; // moss
      if (kind === 'sarusuberi' && ihash(x >> 1, y >> 2, seed) % 5 === 0) c = P.paperGrid;
      p.set(x, y, c);
    }
    // root flare
    if (y >= h - 3) {
      p.set(cx - half - 1 + sway, y, dk(bark));
      p.set(cx + half + sway, y, dk(bark, 2));
      if (y === h - 1) {
        p.set(cx - half - 2, y, dk(bark));
        p.set(cx + half + 1, y, dk(bark, 2));
      }
    }
  }
  // rim light on the left edge
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (p.alpha(x, y)) {
        if (y % 3 !== 2) p.set(x, y, P.sun);
        break;
      }
    }
  }
  outline(p, { bottom: false, soft: true });
  if (deco.tag) {
    // 樹名板: a white tag on a string round the trunk
    const ty = Math.floor(h * 0.45);
    const half = Math.max(1, Math.round((wBase / 2) * (0.65 + 0.35 * (ty / h))));
    p.hline(cx - half, cx + half - 1, ty, P.concreteLt);
    p.rect(cx - 1, ty + 1, 4, 5, P.white);
    p.hline(cx - 1, cx + 2, ty + 3, P.steel);
    p.vline(cx + 3, ty + 1, ty + 5, P.concrete);
  }
  if (deco.weeds) {
    // weeds at the foot, both sides of the root flare
    const tuft = (x: number, hgt: number) => {
      for (let j = 0; j < hgt; j++) {
        p.set(x, h - 1 - j, j > hgt - 2 ? P.leafYoung : P.leaf);
        if (j < hgt - 1) p.set(x + 1, h - 1 - j, P.leafDeep);
      }
      p.set(x - 1, h - 2, P.leafYoung);
    };
    tuft(1, 4);
    tuft(w - 3, 3);
    p.set(2, h - 5, P.goldPale);
  }
  return p;
}

/** Per-instance look of a species: shape, mirroring, size, decorations (6.1-6: no two alike in a row). */
interface TreeVar {
  shape?: TreeSpec['shape'];
  flip?: boolean;
  dw?: number;
  dh?: number;
  dlift?: number;
  dtrunk?: number;
  lean?: number;
  tag?: boolean;
  weeds?: boolean;
  branch?: number;
}
const CHERRY_VARS: TreeVar[] = [
  { shape: 'round', weeds: true, branch: -1 },
  { shape: 'spread', flip: true, dw: 10, dh: -8, dlift: -4, dtrunk: -3, tag: true },
  { shape: 'vase', dw: -8, dh: 6, dlift: 5, dtrunk: 4, weeds: true, branch: 1 },
  { shape: 'round', flip: true, dw: 2, lean: 6, dlift: 1, tag: true, branch: -1 },
];

interface TreeSpec {
  cw: number;
  ch: number;
  /** Canopy centre above the trunk foot (px). */
  lift: number;
  trunkH: number;
  trunkW: number;
  clumps: number;
  rmin: number;
  rmax: number;
  shape: 'round' | 'vase' | 'cone' | 'pads' | 'spread';
  pal: string;
  flowers?: string;
  fruit?: string;
  needle?: boolean;
  fan?: boolean;
}

const SPECS: Record<string, TreeSpec> = {
  tree_keyaki: { cw: 76, ch: 64, lift: 50, trunkH: 30, trunkW: 9, clumps: 34, rmin: 7, rmax: 12, shape: 'vase', pal: 'keyaki' },
  tree_persimmon: { cw: 48, ch: 42, lift: 34, trunkH: 20, trunkW: 5, clumps: 16, rmin: 6, rmax: 9, shape: 'round', pal: 'persimmon', fruit: P.leafYoung },
  tree_cherry: { cw: 64, ch: 50, lift: 36, trunkH: 20, trunkW: 6, clumps: 28, rmin: 7, rmax: 11, shape: 'round', pal: 'cherry' },
  tree_sakura: { cw: 64, ch: 52, lift: 38, trunkH: 22, trunkW: 7, clumps: 28, rmin: 7, rmax: 11, shape: 'round', pal: 'cherry' },
  tree_kusu: { cw: 56, ch: 54, lift: 40, trunkH: 22, trunkW: 7, clumps: 20, rmin: 8, rmax: 12, shape: 'round', pal: 'kusu' },
  tree_sarusuberi: { cw: 46, ch: 40, lift: 34, trunkH: 22, trunkW: 5, clumps: 16, rmin: 6, rmax: 9, shape: 'round', pal: 'sarusuberi', flowers: P.crimson },
  tree_ichou: { cw: 42, ch: 58, lift: 42, trunkH: 22, trunkW: 6, clumps: 20, rmin: 6, rmax: 9, shape: 'cone', pal: 'ichou', fan: true },
  tree_matsu: { cw: 52, ch: 42, lift: 34, trunkH: 24, trunkW: 6, clumps: 12, rmin: 6, rmax: 10, shape: 'pads', pal: 'matsu', needle: true },
  tree_hanamizuki: { cw: 36, ch: 32, lift: 30, trunkH: 20, trunkW: 3, clumps: 12, rmin: 5, rmax: 8, shape: 'round', pal: 'hanamizuki' },
};

function treeArt(id: string, v: number): PropArt {
  const s0 = SPECS[id];
  const tv: TreeVar = id === 'tree_cherry' ? CHERRY_VARS[v % CHERRY_VARS.length] : {};
  const s: TreeSpec = { ...s0, shape: tv.shape ?? s0.shape, lift: s0.lift + (tv.dlift ?? 0), trunkH: s0.trunkH + (tv.dtrunk ?? 0) };
  const seed = (ihash(v, id.length, 1901) % 10000) + v * 131;
  const cw = s.cw + (tv.dw ?? (v % 2) * 4);
  const ch = s.ch + (tv.dh ?? -(v % 3) * 2);
  let cl = clumpsFor(cw, ch, seed, s.clumps, s.rmin, s.rmax, s.shape);
  // mirrored silhouette (the light still comes from the left: shading is per pixel)
  if (tv.flip) cl = cl.map((c) => ({ ...c, x: cw - c.x }));
  const { frames, sparkle } = canopy(cw, ch, cl, PAL[s.pal], seed, { flowers: s.flowers, fruit: s.fruit, needle: s.needle, fan: s.fan });
  // a branch showing through the shaded lower leaves
  if (tv.branch) {
    const darkA = rgba32(PAL[s.pal].dk);
    const darkB = rgba32(PAL[s.pal].deep);
    const bx0 = Math.floor(cw / 2) + (tv.lean ? -tv.lean : 0);
    for (const f of frames) {
      for (let j = 0; j < 16; j++) {
        const x = Math.round(bx0 + tv.branch * j * 0.9);
        const y = ch - 3 - j;
        for (const xx of [x, x + 1]) {
          if (!f.alpha(xx, y)) continue;
          const px = f.get(xx, y);
          // only where the leaves are in shade, so it peeks through gaps
          if ((px === darkA || px === darkB) && ihash(xx, y, seed) % 3 !== 0) f.set(xx, y, j < 6 ? P.woodDark : P.wood);
        }
      }
    }
  }
  const fc = frames.map((f) => f.toCanvas());
  // trunk with a couple of branches reaching into the canopy
  const tr = trunk(s.pal, seed, s.trunkH, s.trunkW, { tag: tv.tag, weeds: tv.weeds });
  const tc = tr.toCanvas();
  const footX = 8;
  const footY = 15;
  const cox = footX - Math.floor(cw / 2) + (s.shape === 'spread' ? 2 : 0) + (tv.lean ?? 0);
  const coy = footY - s.lift - Math.floor(ch / 2);
  const sparkCanvas = (() => {
    const p = new PixelCanvas(2, 2);
    p.set(0, 0, P.glint);
    p.set(1, 0, P.horizon);
    p.set(0, 1, P.horizon);
    return p.toCanvas();
  })();
  const pickFrame = (env: PropEnv): HTMLCanvasElement => {
    if (env.stage === 1) return fc[0];
    if (env.stage === 2) return fc[2];
    return fc[Math.floor((env.mt + env.seed * 3000) / 700) % 2];
  };
  return {
    ox: footX - Math.floor(tc.width / 2),
    oy: footY - tc.height,
    w: tc.width,
    h: tc.height,
    foot: footY,
    img: () => tc,
    contact: s.trunkW + 6,
    contactX: footX,
    fg: [
      {
        ox: cox,
        oy: coy,
        img: pickFrame,
        fade: { x: cox + 4, y: coy + 4, w: cw - 8, h: ch + (footY - s.lift - ch / 2 - coy) + 6, alpha: 0.32 },
      },
      // 光の粒: two specks alternate every 700ms (frozen in stage 1)
      ...sparkle.map(([sx, sy], i) => ({
        ox: cox + sx,
        oy: coy + sy,
        img: (env: PropEnv) => {
          if (env.stage === 3) return null;
          const k = env.stage === 1 ? 0 : Math.floor((env.mt + env.seed * 1400) / 700) % 2;
          return k === i ? sparkCanvas : null;
        },
      })),
    ],
    shadowFn(ctx, x, y, dir, len, env) {
      if (len <= 0.01) return;
      // (QA round 2: stage 2 threw a dense flat ellipse several tiles off
      // the tree, a black hole with no tree to it) the shadow starts at the
      // trunk's foot and stretches along the light: the trunk sheared out,
      // then the crown's own leafy outline as a footprint on the ground
      // (depth 45% of its height, pulled out along the light by half the
      // stretch), with dapples; the crown's shift is capped at 40px
      const fx = Math.round(x + footX);
      const fy = Math.round(y + footY);
      const [dx, dy] = dir;
      const L = Math.min(len, CROWN_SHIFT / s.lift);
      // trunk: its silhouette sheared from the foot
      ctx.setTransform(1, 0, -L * dx, -L * dy, fx, fy);
      ctx.drawImage(treeSil(tc), footX - Math.floor(tc.width / 2) - footX, footY - tc.height - footY);
      // crown: centre at height hc, footprint K deep, stretched by s1 of the shear
      // (the crown's centre stands `lift` above the foot)
      const vc = -s.lift;
      const K = 0.45;
      const s1 = 0.5;
      const c = -dx * L * s1;
      const d = K - dy * L * s1;
      const e = fx - dx * L * vc * (1 - s1);
      const f = fy - vc * (dy * L * (1 - s1) + K);
      ctx.setTransform(1, 0, c, d, e, f);
      const img = pickFrame(env);
      ctx.globalAlpha = 0.82;
      ctx.drawImage(treeSil(img, true), cox - footX, coy - footY);
      ctx.globalAlpha = 1;
      // dapples (木漏れ日) that twinkle: punch a few more holes (frozen in stage 1)
      ctx.globalCompositeOperation = 'destination-out';
      const tt = env.stage === 1 ? 0 : Math.floor(env.mt / 900);
      for (let k = 0; k < 6; k++) {
        const hh = ihash(k, seed, 1907);
        if ((hh + tt * (k + 1)) % 3 === 0) continue;
        const ax = cox - footX + cw * (0.2 + ((hh % 100) / 100) * 0.6);
        const ay = coy - footY + ch * (0.25 + (((hh >>> 8) % 100) / 100) * 0.5);
        ctx.fillRect(Math.round(ax), Math.round(ay), 3, 3);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}

/** How far a tree's crown shadow may move off the trunk (px). */
const CROWN_SHIFT = 40;

const silCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
const silHolesCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
/** Black silhouette of a canvas; `holes`: with a sprinkle of 2×1 light gaps through the leaves. */
function treeSil(img: HTMLCanvasElement, holes = false): HTMLCanvasElement {
  const cache = holes ? silHolesCache : silCache;
  const hit = cache.get(img);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  if (holes) {
    ctx.globalCompositeOperation = 'destination-out';
    for (let y = 2; y < c.height - 2; y += 3)
      for (let x = 2; x < c.width - 2; x += 2) if (ihash(x, y, 1931) % 9 === 0) ctx.fillRect(x, y, 2, 1);
  }
  cache.set(img, c);
  return c;
}

for (const id of Object.keys(SPECS)) {
  registerProp(id, (opts) => treeArt(id, Number(opts.v ?? 0)));
}
// aliases used by the design book
registerProp('prop_cherry_tree', (opts) => treeArt('tree_cherry', Number(opts.v ?? 0)));
registerProp('prop_persimmon', () => treeArt('tree_persimmon', 0));
registerProp('prop_tree_zelkova_s', () => treeArt('tree_hanamizuki', 1));

// ---------------------------------------------------------------- 柳 (weeping willow)

/**
 * A weeping willow on the river road (QA round 3: the south band ran three
 * screens of the same cherries): a gnarled trunk leaning over the water, a
 * small dome of fine yellow-green leaves and a curtain of long strands hanging
 * almost to the ground, lit on the left, deeper inside. The strands swing
 * from their tips in the evening wind (4 frames), hang still in stage 1 and
 * stream to the north-east in stage 2. Canopy in the foreground like every
 * tree, thinning over whoever walks under it.
 */
function willowArt(): PropArt {
  const seed = 7331;
  const W = 74;
  const H = 62;
  const footX = 8;
  const footY = 15;
  const rnd = mulberry(seed);
  // bunches of strands hanging from arching branches: the back ones darker,
  // drawn first; the crown is the lumpy row of their tops (higher in the
  // middle), the hem ragged, gaps between bunches showing the trunk
  interface Bunch {
    x: number;
    top: number;
    n: number;
    len: number;
    back: boolean;
    ph: number;
  }
  const bunches: Bunch[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const back = pass === 0;
    for (let x = back ? 4 : 8; x < W - 6; x += back ? 9 : 11) {
      const u = (x - W / 2) / (W / 2);
      bunches.push({
        x: x + Math.round(rnd() * 3),
        top: Math.round(3 + Math.pow(Math.abs(u), 1.4) * 14 + rnd() * 3 + (back ? 0 : 5)),
        n: 3 + Math.floor(rnd() * 3),
        len: Math.round(30 + (1 - Math.abs(u)) * 16 + rnd() * 8 - (back ? 4 : 0)),
        back,
        ph: rnd() * 6,
      });
    }
  }
  const tones = [P.leafShade, P.leafDeep, P.leaf, P.leafYoung, P.leafLt];
  const mk = (k: number): PixelCanvas => {
    const p = new PixelCanvas(W, H);
    for (const b of bunches) {
      const u = (b.x - W / 2) / (W / 2);
      // light from the upper left: left bunches lit, the back ones a tone down
      const base = (u < -0.3 ? 3 : u < 0.35 ? 2 : 1) - (b.back ? 1 : 0);
      // the branch's arch: a little cap of leaves where the strands leave it
      for (let i = -4; i <= 4; i++) {
        const y = b.top - Math.round(Math.sqrt(Math.max(0, 16 - i * i)) * 0.5);
        const t = Math.max(0, Math.min(4, base + (i < 0 ? 1 : i > 2 ? -1 : 0)));
        p.set(b.x + i, y, tones[t]);
        p.set(b.x + i, y + 1, tones[Math.max(0, t - 1)]);
      }
      for (let sidx = 0; sidx < b.n; sidx++) {
        const sx0 = b.x - Math.floor(b.n / 2) * 2 + sidx * 2;
        const len = Math.min(H - b.top - 2, b.len - ((sidx * 7 + b.x) % 9));
        for (let j = 0; j < len; j++) {
          const q = j / Math.max(1, len);
          let dx = 0;
          let dy = 0;
          const sw = (kk: number) => Math.sin(kk * 1.57 + b.ph + sidx * 0.4) * q * q * 2.6 - q * 1.3;
          if (k <= 3) dx = Math.round(sw(k));
          else if (k === 4) dx = Math.round(sw(1));
          else {
            // stage 2: streaming north-east, the tips lifted
            dx = Math.round(q * q * 8);
            dy = -Math.round(q * q * 6);
          }
          // the strands splay out a little from the branch before they fall
          const splay = Math.round((sidx - (b.n - 1) / 2) * Math.min(1, j / 6) * 0.6);
          const x = sx0 + dx + splay;
          const y = b.top + 1 + j + dy;
          if (y < 0 || y >= H || x < 0 || x >= W) continue;
          if ((j + sidx * 3 + b.x) % (b.back ? 5 : 8) === 4) continue; // gaps between leaves (the back bunches thinner)
          let t = base + ((j + sidx) % 3 === 0 ? 1 : 0) - (q > 0.75 ? 1 : 0);
          if (sidx === b.n - 1) t -= 1; // the shaded side of the bunch
          t = Math.max(0, Math.min(4, t));
          p.set(x, y, tones[t]);
          if ((j + sidx) % 4 === 1 && q < 0.9) p.set(x + (sidx % 2 ? 1 : -1), y, tones[Math.max(0, t - 1)]);
        }
      }
    }
    // rim light on the crown's upper-left edge
    for (let x = 0; x < W * 0.5; x++)
      for (let y = 0; y < H; y++)
        if (p.alpha(x, y)) {
          if (x % 3 !== 2) p.set(x, y, P.sun);
          break;
        }
    outline(p, { bottom: false, soft: true });
    return p;
  };
  const fc = [0, 1, 2, 3, 4, 5].map((k) => mk(k).toCanvas());
  const tr = trunk('willow', seed, 26, 6, { weeds: true });
  // lean the trunk: shear its upper half 3px east
  const tc0 = tr.toCanvas();
  const tc = document.createElement('canvas');
  tc.width = tc0.width + 4;
  tc.height = tc0.height;
  const tx = tc.getContext('2d')!;
  for (let y = 0; y < tc0.height; y++) {
    const sh = Math.round(((tc0.height - y) / tc0.height) * 3);
    tx.drawImage(tc0, 0, y, tc0.width, 1, sh, y, tc0.width, 1);
  }
  const cox = footX - Math.floor(W / 2) + 3;
  const coy = footY - H + 2;
  const pick = (env: PropEnv): HTMLCanvasElement => {
    if (env.stage === 1) return fc[4];
    if (env.stage === 2) return fc[5];
    return fc[Math.floor((env.mt + env.seed * 2000) / 380) % 4];
  };
  return {
    ox: footX - Math.floor(tc0.width / 2),
    oy: footY - tc.height,
    w: tc.width,
    h: tc.height,
    foot: footY,
    img: () => tc,
    contact: 12,
    contactX: footX,
    fg: [
      {
        ox: cox,
        oy: coy,
        img: pick,
        fade: { x: cox + 4, y: coy + 6, w: W - 8, h: H - 8, alpha: 0.32 },
      },
    ],
    shadowFn(ctx, x, y, dir, len, env) {
      if (len <= 0.01) return;
      const fx = Math.round(x + footX);
      const fy = Math.round(y + footY);
      const [dx, dy] = dir;
      const L = Math.min(len, CROWN_SHIFT / 30);
      ctx.setTransform(1, 0, -L * dx, -L * dy, fx, fy);
      ctx.drawImage(treeSil(tc), -Math.floor(tc0.width / 2), -tc.height);
      // the curtain's footprint: thin and long, stretched with the light
      const K = 0.4;
      const s1 = 0.5;
      ctx.setTransform(1, 0, -dx * L * s1, K - dy * L * s1, fx + dx * L * 30 * (1 - s1), fy - -30 * (dy * L * (1 - s1) + K));
      ctx.globalAlpha = 0.7;
      ctx.drawImage(treeSil(pick(env), true), cox - footX, coy - footY);
      ctx.globalAlpha = 1;
    },
  };
}

registerProp('tree_yanagi', () => willowArt());
