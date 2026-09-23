// Trees (30_level_art 6.6): trunk in the depth-sorted layer, canopy in the
// foreground (fades to 60% while the player is under it), dappled canopy
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

/** Canopy mass from clumps; returns frames [calm, sway, NE-lean]. */
function canopy(
  w: number,
  h: number,
  clumps: Clump[],
  pal: LeafPal,
  seed: number,
  opts: { flowers?: string; fruit?: string; needle?: boolean; fan?: boolean } = {},
): { frames: PixelCanvas[]; sparkle: [number, number][] } {
  const mk = (sway: number, lean: number): PixelCanvas => {
    const p = new PixelCanvas(w, h);
    const inside = new Float32Array(w * h).fill(-1);
    // clump membership: nearest clump (normalised distance)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let best = 9;
        let bi = -1;
        for (let i = 0; i < clumps.length; i++) {
          const c = clumps[i];
          const off = (sway && c.y < h * 0.45 ? sway : 0) + (lean ? Math.round(lean * (1 - c.y / h)) : 0);
          const dx = (x + 0.5 - c.x - off) / c.r;
          const dy = (y + 0.5 - c.y) / (c.r * 0.9);
          const d = dx * dx + dy * dy;
          if (d < best) {
            best = d;
            bi = i;
          }
        }
        if (best <= 1) inside[y * w + x] = bi + best * 0.999;
      }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = inside[y * w + x];
        if (v < 0) continue;
        const i = Math.floor(v);
        const c = clumps[i];
        const off = (sway && c.y < h * 0.45 ? sway : 0) + (lean ? Math.round(lean * (1 - c.y / h)) : 0);
        const dx = (x + 0.5 - c.x - off) / c.r;
        const dy = (y + 0.5 - c.y) / (c.r * 0.9);
        // light from the upper-left: per-clump shading + whole-mass gradient
        const lit = -dx * 0.6 - dy * 0.8 + (1 - y / h) * 0.6 - (x / w) * 0.35;
        let col = lit > 0.75 ? pal.lt : lit > 0.05 ? pal.mid : lit > -0.6 ? pal.dk : pal.deep;
        // leaf texture: small 2px clusters
        const hh = ihash(x >> 1, y >> 1, seed);
        if (hh % 7 === 0) col = lit > 0.3 ? pal.lt : pal.mid;
        else if (hh % 11 === 0) col = lit > 0.2 ? pal.mid : pal.deep;
        if (opts.needle && (x + y * 2) % 5 === 0) col = lit > 0 ? pal.mid : pal.deep;
        if (opts.fan && hh % 13 === 0 && lit > -0.2) col = pal.spec ?? pal.lt;
        p.set(x, y, col);
      }
    // clump rims: a lit pixel row at the upper-left edge of each clump
    for (let y = 1; y < h; y++)
      for (let x = 1; x < w; x++) {
        const v = inside[y * w + x];
        if (v < 0) continue;
        const up = inside[(y - 1) * w + x];
        const left = inside[y * w + x - 1];
        if ((up >= 0 && Math.floor(up) !== Math.floor(v) && Math.floor(up) < Math.floor(v)) || up < 0) {
          const c = clumps[Math.floor(v)];
          if (x < c.x + c.r * 0.3) p.set(x, y, pal.lt);
        }
        if (left < 0 && y % 3 !== 2) p.set(x, y, P.sun); // rim light
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
  const bark = kind === 'sarusuberi' ? P.woodLt : kind === 'cherry' ? P.woodDark : kind === 'matsu' ? P.wood : P.wood;
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
  const shadowH = s.lift + ch / 2;
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
        fade: { x: cox + 4, y: coy + 4, w: cw - 8, h: ch + (footY - s.lift - ch / 2 - coy) + 6, alpha: 0.6 },
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
      // trunk shadow
      const bx = x + footX;
      const by = y + footY;
      const th = s.trunkH;
      ctx.beginPath();
      ctx.moveTo(bx - s.trunkW / 2, by);
      ctx.lineTo(bx + s.trunkW / 2, by);
      ctx.lineTo(bx + s.trunkW / 2 + dir[0] * len * th, by + dir[1] * len * th);
      ctx.lineTo(bx - s.trunkW / 2 + dir[0] * len * th, by + dir[1] * len * th);
      ctx.closePath();
      ctx.fill();
      // canopy blob, flattened onto the ground
      const sx = bx + dir[0] * len * shadowH;
      const sy = by + dir[1] * len * shadowH - 2;
      const rx = cw * 0.46;
      const ry = ch * 0.3;
      ctx.beginPath();
      ctx.ellipse(Math.round(sx), Math.round(sy), rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // dapples (木漏れ日): punch holes, gently twinkling (frozen in stage 1)
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const tt = env.stage === 1 ? 0 : Math.floor(env.mt / 900);
      for (let k = 0; k < 7; k++) {
        const hh = ihash(k, seed, 1907);
        if ((hh + tt * (k + 1)) % 4 === 0) continue;
        const ax = sx + ((hh % 100) / 100 - 0.5) * rx * 1.4;
        const ay = sy + (((hh >>> 8) % 100) / 100 - 0.5) * ry * 1.2;
        const r = 1.5 + ((hh >>> 16) % 3) * 0.6;
        ctx.beginPath();
        ctx.ellipse(Math.round(ax), Math.round(ay), r + 0.8, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };
}

for (const id of Object.keys(SPECS)) {
  registerProp(id, (opts) => treeArt(id, Number(opts.v ?? 0)));
}
// aliases used by the design book
registerProp('prop_cherry_tree', (opts) => treeArt('tree_cherry', Number(opts.v ?? 0)));
registerProp('prop_persimmon', () => treeArt('tree_persimmon', 0));
registerProp('prop_tree_zelkova_s', () => treeArt('tree_hanamizuki', 1));
