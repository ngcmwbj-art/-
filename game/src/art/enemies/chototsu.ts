// チョトツ (56×40, 51 8.4): a wild boar down from the mountain, the village
// fields taken for its own. Low and thick-set, a stiff mane of bristles with
// pale tips along the hump, the long tapering snout ending in its disc and
// two nostrils, one small white tusk, a little dark eye catching the
// lantern, a small ear that twitches, short legs on split hooves, a thin tail
// with a tuft — and dried mud caked over its flanks. Head to the left, into
// the lantern's light (51 8.0).
//
// Poses: idle (breath, nose, tail), charge (前足で地面をかく 3f × 120ms),
// dash (the gallop), dig, wallow (on its back), hurt (bristles up), rest
// (lying down), run (山へ帰る: the gallop facing right — flags.faceRight).

import { PixelCanvas } from '../../engine/pixel';
import { hash2, valueNoise } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { Mask, mixU32 } from './lib';
import { INK, nightFinish, nshade } from './night';

const W = 72;
const H = 54;
const OX = 8;
const OY = 10;

const HAIR = ['#1A0E08', '#2A1A10', '#3A2616', '#4A301C', '#5A3A22', '#6E4A2E', '#8A5A3A'];
const SNOUT = ['#4A3028', '#6A4A3A', '#8A5A4A', '#A87A64'];

interface Pose {
  /** Leg frame: 'stand' | 'paw0..2' | 'run0..3' | 'lie' | 'up0..1'. */
  legs: string;
  /** Head lowered (dig / charge), px. */
  headDown?: number;
  /** Body bob (px, + = down). */
  bob?: number;
  /** Nose twitch 0/1. */
  nose?: number;
  /** Tail swing −1..1. */
  tail?: number;
  ear?: number;
  eye?: 'open' | 'shut' | 'glint';
  /** Bristles raised (hurt / charge). */
  bristle?: number;
  /** Mud thicker (ヌタうち). */
  mud?: number;
  /** On its back (wallow). */
  belly?: boolean;
}

function build(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const bob = o.bob ?? 0;
  const X = (v: number) => Math.round(v + OX);
  const Y = (v: number) => Math.round(v + OY + bob);
  if (o.belly) return buildBelly(o);
  const lie = o.legs === 'lie';
  const drop = lie ? 6 : 0;
  const hd = (o.headDown ?? 0) + (lie ? 2 : 0);
  // ---- legs (behind the body first: far side a shade darker) ----
  const legs = legFrames(o.legs);
  for (const [lx, ly, len, far] of legs) {
    // a thick haunch tapering to a thin shank
    const ex2 = lx + (len[0] ?? 0);
    const ey2 = ly + drop + len[1];
    const m = new Mask(W, H).line(X(lx), Y(ly + drop - 2), X((lx + ex2) / 2), Y((ly + drop + ey2) / 2), 2.4).line(X((lx + ex2) / 2), Y((ly + drop + ey2) / 2), X(ex2), Y(ey2 - 1), 1.1);
    nshade(p, m, HAIR, { base: far ? 0.28 : 0.46, k: 0.5 });
    // split hoof
    const hx = X(lx + (len[0] ?? 0));
    const hy = Y(ly + drop + len[1]);
    p.rect(hx - 1, hy, 3, 2, '#2A1A10');
    p.set(hx, hy + 1, '#0B0B14');
    if (!far) p.set(hx - 1, hy, '#6B5A4A');
  }
  // ---- body: a hump at the shoulders, falling away to the rump ----
  const body = new Mask(W, H);
  for (let x = 14; x <= 52; x++) {
    const u = (x - 14) / 38;
    const top = 11 + Math.round(5 * u * u) - Math.round(3 * Math.sin(u * Math.PI * 0.9)) + drop;
    const bot = 31 - Math.round(3 * Math.pow(Math.abs(u - 0.45) * 2, 2)) + drop;
    for (let y = top; y <= bot; y++) body.set(X(x), Y(y));
  }
  // ---- head: a wedge to the left, the snout tapering down to the disc ----
  const head = new Mask(W, H);
  for (let x = 2; x <= 20; x++) {
    const u = (20 - x) / 18;
    const top = 12 + Math.round(8 * u) + hd + drop;
    const bot = 29 - Math.round(3 * u) + hd * (1 - u * 0.3) + drop;
    for (let y = top; y <= bot; y++) head.set(X(x), Y(y));
  }
  const all = body.clone().or(head);
  nshade(p, all, HAIR, { mode: 'bevel', bevel: 5, base: 0.5, k: 0.75, dither: 0.5 });
  // the snout's bare skin and its disc
  const snout = new Mask(W, H);
  for (let x = 2; x <= 9; x++) {
    const u = (9 - x) / 7;
    const top = 20 + Math.round(1 * u) + hd + drop;
    const bot = 27 - Math.round(2 * u) + hd + drop;
    for (let y = top; y <= bot; y++) snout.set(X(x), Y(y));
  }
  nshade(p, snout, SNOUT, { base: 0.55, k: 0.5 });
  const dx = X(2 - (o.nose ?? 0));
  const dy = Y(21 + hd + drop);
  p.rect(dx - 1, dy, 2, 5, '#6A4A3A');
  p.vline(dx - 1, dy, dy + 4, '#8A5A4A');
  p.set(dx, dy + 1, '#2A1A10');
  p.set(dx, dy + 3, '#2A1A10');
  // the tusk: small, white, curving up out of the lip
  const tx = X(8);
  const ty = Y(26 + hd + drop);
  p.set(tx, ty, '#F4F1E8');
  p.set(tx, ty - 1, '#F4F1E8');
  p.set(tx - 1, ty - 2, '#FFFFFF');
  p.set(tx + 1, ty, '#C8C2B4');
  // the eye, small and dark, the lantern in it
  const ex = X(12);
  const ey = Y(16 + Math.round(hd * 0.6) + drop);
  if (o.eye === 'shut') p.hline(ex - 1, ex + 1, ey + 1, '#0B0B14');
  else {
    p.rect(ex - 1, ey, 2, 2, '#1A0E08');
    p.set(ex - 1, ey, o.eye === 'glint' ? '#FFF6D8' : '#F7C27A');
    if (o.eye === 'glint') {
      p.set(ex - 2, ey, '#FFE7A3');
      p.set(ex, ey - 1, '#FFE7A3');
    }
  }
  // the ear: a small triangle that twitches
  const ear = o.ear ?? 0;
  const eax = X(18);
  const eay = Y(12 + hd + drop);
  const earRows = ear ? ['.#..', '##..', '###.'] : ['..#.', '.##.', '###.'];
  earRows.forEach((row, yy) => [...row].forEach((v, xx) => v === '#' && p.set(eax + xx, eay - 3 + yy, yy === 0 ? '#6E4A2E' : '#4A301C')));
  // the mane: bristles along the top of the hump, pale-tipped, raised when it bristles
  const br = o.bristle ?? 0;
  for (let x = 17; x <= 46; x++) {
    if (hash2(x, 1, 23) < 0.35) continue;
    const u = (x - 14) / 38;
    const top = 11 + Math.round(5 * u * u) - Math.round(3 * Math.sin(u * Math.PI * 0.9)) + drop;
    // longest over the shoulders, slanting back toward the tail (upright when raised)
    const h = Math.max(1, Math.round((x < 32 ? 3 : 2) * (1 - Math.abs(u - 0.35)) + br + hash2(x, 2, 23) * 1.4));
    for (let k = 1; k <= h; k++) {
      const lean = br ? 0 : Math.floor(k / 2);
      const tip = k === h && hash2(x, 3, 23) < 0.6;
      p.set(X(x + lean), Y(top - k), tip ? '#8A5A3A' : k === 1 ? '#2A1A10' : '#3A2616');
    }
  }
  // dried mud: flanks, legs, one clump on the back
  const mud = o.mud ?? 0;
  all.each((x, y) => {
    const lx = x - OX;
    const ly = y - OY - bob - drop;
    const n = valueNoise(lx / 5, ly / 3.5, 17) + (ly - 18) * 0.035;
    if (lx > 14 && n > 0.86 - mud * 0.18) {
      const v = p.data[y * W + x];
      p.set(x, y, mixU32(v, n > 0.95 ? '#8A7A5A' : '#6B5A4A', 0.5 + mud * 0.2));
    } else if (lx > 22 && hash2(lx, ly, 18) < 0.02 + mud * 0.04) p.set(x, y, '#6B5A4A');
  });
  p.rect(X(36), Y(12 + drop), 4, 2, '#6B5A4A');
  p.set(X(37), Y(12 + drop), '#8A7A5A');
  // tail with a tuft, swinging
  const tsw = o.tail ?? 0;
  const tlx = X(52);
  const tly = Y(16 + drop);
  p.line(tlx, tly, tlx + 3, tly + 4 + tsw, '#3A2616');
  p.rect(tlx + 3, tly + 4 + tsw, 2, 3, '#2A1A10');
  p.set(tlx + 4, tly + 6 + tsw, '#5A3A22');
  nightFinish(p, 0.55, 0.4, (x, y) => Math.abs(x - ex) <= 2 && Math.abs(y - ey) <= 2);
  return p;
}

/** Legs: [x, y, [dx, len], far]. Near legs drawn after the far ones. */
function legFrames(f: string): [number, number, [number, number], boolean][] {
  const base: Record<string, [number, number, [number, number], boolean][]> = {
    stand: [[15, 28, [0, 9], true], [47, 28, [-1, 9], true], [21, 29, [-1, 8], false], [41, 29, [0, 8], false]],
    paw0: [[15, 28, [0, 9], true], [47, 28, [-1, 9], true], [21, 29, [-4, 6], false], [41, 29, [0, 8], false]],
    paw1: [[15, 28, [0, 9], true], [47, 28, [-1, 9], true], [21, 29, [-2, 7], false], [41, 29, [0, 8], false]],
    paw2: [[15, 28, [0, 9], true], [47, 28, [-1, 9], true], [21, 29, [1, 8], false], [41, 29, [0, 8], false]],
    run0: [[15, 28, [-5, 7], true], [47, 28, [5, 7], true], [21, 29, [4, 7], false], [41, 29, [-4, 7], false]],
    run1: [[15, 28, [-2, 8], true], [47, 28, [2, 8], true], [21, 29, [1, 8], false], [41, 29, [-1, 8], false]],
    run2: [[15, 28, [4, 7], true], [47, 28, [-4, 7], true], [21, 29, [-5, 7], false], [41, 29, [5, 7], false]],
    run3: [[15, 28, [1, 8], true], [47, 28, [-1, 8], true], [21, 29, [-2, 8], false], [41, 29, [2, 8], false]],
    lie: [[16, 30, [-4, 3], true], [45, 30, [4, 3], true], [19, 31, [-5, 2], false], [42, 31, [5, 2], false]],
  };
  return base[f] ?? base.stand;
}

/** ヌタうち: rolled onto its back in the mud, legs kicking at the sky (2 frames). */
function buildBelly(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => Math.round(v + OX);
  const Y = (v: number) => Math.round(v + OY);
  const k = o.legs === 'up1' ? 1 : 0;
  // legs up first
  for (const [lx, dxl] of [[18, -2], [24, 2], [38, -2], [44, 2]] as [number, number][]) {
    const m = new Mask(W, H).line(X(lx), Y(22), X(lx + dxl * (k ? -1 : 1)), Y(12), 1.6);
    nshade(p, m, HAIR, { base: 0.45 });
    p.rect(X(lx + dxl * (k ? -1 : 1)) - 1, Y(10), 3, 2, '#2A1A10');
  }
  const body = new Mask(W, H).ellipse(X(31), Y(28), 19, 8);
  const head = new Mask(W, H).ellipse(X(10), Y(30), 8, 5);
  const all = body.or(head);
  nshade(p, all, HAIR, { mode: 'bevel', base: 0.5, k: 0.7 });
  // the paler belly turned up, caked in fresh mud
  all.each((x, y) => {
    if (y < Y(27) && hash2(x, y, 5) < 0.55) p.set(x, y, hash2(x, y, 6) < 0.5 ? '#6B5A4A' : '#8A7A5A');
  });
  p.rect(X(2), Y(29), 3, 4, '#6A4A3A');
  p.set(X(3), Y(30), '#2A1A10');
  p.set(X(6), Y(27), '#F4F1E8');
  p.hline(X(9), X(11), Y(28), '#0B0B14');
  nightFinish(p, 0.5, 0.4);
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
/** No object is left: the hoofprints heading for the woods (drawn by the battle). A print pair for the gallery. */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(24, 8);
  for (let i = 0; i < 3; i++) {
    const x = i * 8;
    const y = i % 2 ? 1 : 3;
    p.rect(x, y, 2, 4, '#3A2616');
    p.rect(x + 3, y, 2, 4, '#3A2616');
    p.hline(x - 1 < 0 ? 0 : x - 1, x + 5, y + 4, '#6B5A4A');
  }
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_chototsu', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const flipC = new Map<string, HTMLCanvasElement>();
  const get = (o: Pose, flip = false): HTMLCanvasElement => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
    }
    if (!flip) return c;
    let f = flipC.get(key);
    if (!f) {
      f = document.createElement('canvas');
      f.width = c.width;
      f.height = c.height;
      const ctx = f.getContext('2d')!;
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(c, 0, 0);
      flipC.set(key, f);
    }
    return f;
  };
  return {
    id: 'enemy_chototsu',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      const mud = (f.defUp ?? 0) >= 1 ? 1 : 0;
      if (v.pose === 'run' || f.faceRight) return get({ legs: `run${loop(v.t, 60, 4)}`, bob: loop(v.t, 60, 2), eye: 'open', tail: 1, mud }, true);
      if (v.pose === 'hurt') {
        const k = Math.min(2, Math.floor(v.t / 80));
        return get({ legs: 'stand', bob: [2, 1, 0][k], bristle: [2, 1, 0][k], eye: 'shut', ear: 1, mud });
      }
      if (f.kyuukei || v.pose === 'rest') return get({ legs: 'lie', eye: 'shut', ear: 1, bob: loop(v.gt, 900, 2), tail: 0, mud });
      if (v.pose === 'wallow' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_cho_nuta')) {
        return get({ legs: `up${loop(v.t, 140, 2)}`, belly: true, mud: 1 });
      }
      if (v.pose === 'dash' || v.pose === 'bend' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_cho_totsu')) {
        return get({ legs: `run${loop(v.t, 55, 4)}`, bob: loop(v.t, 55, 2), headDown: 2, eye: 'glint', bristle: 1, tail: -1, mud }, v.pose === 'bend' && v.t > 60);
      }
      if (v.pose === 'dig' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_cho_horu')) {
        const k = loop(v.t, 100, 2);
        return get({ legs: 'stand', headDown: 4 + k, nose: k, eye: 'open', mud, tail: k ? 1 : -1 });
      }
      if (v.pose === 'charge' || f.tame || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_cho_tame')) {
        // 前足で地面をかく (3f × 120ms); the eye catches the light every so often
        const k = loop(v.pose === 'charge' || v.pose === 'windup' ? v.t : v.gt, 120, 3);
        return get({ legs: `paw${k}`, headDown: 2, bristle: 1, eye: (v.gt % 900) < 100 ? 'glint' : 'open', tail: k - 1, mud });
      }
      if (v.pose === 'refuse') return get({ legs: 'stand', nose: loop(v.t, 100, 2), eye: 'shut', ear: loop(v.t, 100, 2), mud });
      if (v.pose === 'idleact') return get({ legs: 'stand', headDown: 3, nose: loop(v.t, 90, 2), eye: 'open', mud, tail: 1 });
      // idle: a 1px breath, the nose twitching (2f), the tail swishing, an ear flick now and then
      const br = loop(v.gt, 450, 2);
      return get({ legs: 'stand', bob: br, nose: loop(v.gt, 220, 2) && v.gt % 1800 < 700 ? 1 : 0, tail: [-1, 0, 1, 0][loop(v.gt, 200, 4)], ear: v.gt % 2600 < 150 ? 1 : 0, eye: 'open', mud });
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'charge', t: 0 },
      { pose: 'dash', t: 30 },
      { pose: 'dig', t: 0 },
      { pose: 'wallow', t: 0 },
      { pose: 'hurt', t: 0 },
      { pose: 'rest', flags: { kyuukei: 1 } },
      { pose: 'run', t: 0 },
    ],
  };
});
