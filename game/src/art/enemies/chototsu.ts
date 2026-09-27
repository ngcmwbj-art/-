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
  const drop = lie ? 7 : 0;
  const hd = (o.headDown ?? 0) + (lie ? 2 : 0);
  // the head tips down about the neck (x20): the snout drops the most
  const tip = (x: number, y: number): [number, number] => [X(x), Y(y + drop + (x < 20 ? (hd * (20 - x)) / 18 : 0))];
  // ---- legs (far side first, a shade darker): a thick forearm / hock,
  // a thinner shank, the split hoof with its dewclaw ----
  const legs = legFrames(o.legs);
  for (const [lx, ly, [ldx, len], far, front] of legs) {
    const top = ly + drop;
    const kx = lx + ldx * 0.45;
    const ky = top + len * 0.5;
    const ex2 = lx + ldx;
    const ey2 = top + len;
    const m = new Mask(W, H)
      .line(X(lx), Y(top - 3), X(kx), Y(ky), front ? 2.6 : 2.3)
      .line(X(kx), Y(ky), X(ex2), Y(ey2 - 1), front ? 1.6 : 1.45);
    nshade(p, m, HAIR, { base: far ? 0.24 : 0.44, k: 0.5 });
    const hx = X(ex2);
    const hy = Y(ey2);
    // two toes and the cleft between them, a dewclaw behind
    p.rect(hx - 1, hy, 3, 2, far ? '#1A0E08' : '#2A1A10');
    p.set(hx, hy + 1, '#0B0B14');
    p.set(hx, hy, far ? '#2A1A10' : '#4A3A2A');
    p.set(hx + 2, hy - 1, '#1A0E08');
    if (!far) p.set(hx - 1, hy, '#6B5A4A');
  }
  // ---- body: the deep chest and the hump of the shoulders, the back
  // falling away to a small rump (a boar is all front) ----
  const body = new Mask(W, H).poly(
    (
      [
        [15, 11], [19, 6], [25, 6], [32, 9], [40, 12], [46, 14], [50, 17], [51, 21], [50, 25], [48, 28],
        [44, 28], [38, 30], [30, 31], [22, 31], [17, 31], [14, 28],
      ] as [number, number][]
    ).map(([x, y]) => [X(x), Y(y + drop)] as [number, number]),
  );
  // ---- head: a long wedge, the forehead running straight down into the
  // snout, the jaw heavy under the eye ----
  const head = new Mask(W, H).poly(
    (
      [
        [22, 7], [16, 9], [10, 13], [5, 18], [1, 20], [0, 22], [0, 25], [2, 27], [7, 28], [12, 30], [18, 31], [22, 28],
      ] as [number, number][]
    ).map(([x, y]) => tip(x, y)),
  );
  const all = body.clone().or(head);
  nshade(p, all, HAIR, { mode: 'bevel', bevel: 5, base: 0.5, k: 0.75, dither: 0.5 });
  // the belly and the chest's underside in shadow (the far legs show under it)
  all.each((x, y) => {
    const ly = y - OY - bob - drop;
    const lx = x - OX;
    if (lx > 16 && lx < 46 && !all.in(x, y + 2) && ly > 25) p.set(x, y, mixU32(p.data[y * W + x], '#0B0B14', 0.35));
  });
  // the snout's bare skin, tapering to the disc
  const snout = new Mask(W, H).poly(([[0, 21], [6, 19], [8, 21], [8, 27], [2, 27], [0, 25]] as [number, number][]).map(([x, y]) => tip(x, y)));
  nshade(p, snout, SNOUT, { base: 0.55, k: 0.5 });
  const [dx, dy] = tip(-(o.nose ?? 0), 21);
  p.rect(dx, dy, 2, 5, '#6A4A3A');
  p.vline(dx, dy, dy + 4, '#A87A64');
  p.set(dx + 1, dy + 1, '#2A1A10');
  p.set(dx + 1, dy + 3, '#2A1A10');
  // the mouth line and the tusk curling up out of the lip
  const [mx, my] = tip(3, 26);
  p.hline(mx, mx + 6, my, '#1A0E08');
  const [tx, ty] = tip(7, 26);
  p.set(tx, ty, '#F4F1E8');
  p.set(tx, ty - 1, '#FFFFFF');
  p.set(tx - 1, ty - 2, '#F4F1E8');
  p.set(tx + 1, ty, '#C8C2B4');
  // the eye, small and dark under a heavy brow, the lantern in it
  const [ex, ey] = tip(12, 16);
  p.hline(ex - 2, ex + 1, ey - 1, '#1A0E08');
  if (o.eye === 'shut') p.hline(ex - 1, ex + 1, ey + 1, '#0B0B14');
  else {
    p.rect(ex - 1, ey, 2, 2, '#1A0E08');
    p.set(ex - 1, ey, o.eye === 'glint' ? '#FFF6D8' : '#F7C27A');
    if (o.eye === 'glint') {
      p.set(ex - 2, ey, '#FFE7A3');
      p.set(ex, ey - 1, '#FFE7A3');
    }
  }
  // the ear: a pointed leaf laid back, twitching
  const ear = o.ear ?? 0;
  const [eax, eay] = tip(17, 8);
  const earRows = ear ? ['..##', '.###', '###.'] : ['...#', '..##', '.###', '###.'];
  earRows.forEach((row, yy) => [...row].forEach((v, xx) => v === '#' && p.set(eax + xx - 1, eay - earRows.length + 1 + yy, yy === 0 ? '#6E4A2E' : xx === 0 ? '#2A1A10' : '#4A301C')));
  // the mane: stiff bristles from behind the ears along the hump, longest
  // over the shoulders, pale-tipped; raised straight up when it bristles
  const br = o.bristle ?? 0;
  const backTop = (x: number): number => {
    if (x <= 19) return 6 + Math.round((19 - x) * 0.75);
    if (x <= 25) return 6;
    if (x <= 32) return 6 + Math.round(((x - 25) * 3) / 7);
    return 9 + Math.round(((x - 32) * 3) / 8);
  };
  for (let x = 13; x <= 42; x++) {
    if (hash2(x, 1, 23) < 0.3) continue;
    const top = backTop(x) + drop;
    const u = (x - 13) / 29;
    const h = Math.max(1, Math.round(4 * (1 - Math.abs(u - 0.3) * 1.3) + br + hash2(x, 2, 23) * 1.2));
    for (let k = 1; k <= h; k++) {
      const lean = br ? 0 : Math.floor(k / 2);
      const tipPx = k === h && hash2(x, 3, 23) < 0.65;
      p.set(X(x + lean), Y(top - k + (x < 20 ? (hd * (20 - x)) / 18 : 0)), tipPx ? '#8A6A4A' : k === 1 ? '#2A1A10' : '#3A2616');
    }
  }
  // dried mud: flanks, legs, one clump on the back
  const mud = o.mud ?? 0;
  all.each((x, y) => {
    const lx = x - OX;
    const ly = y - OY - bob - drop;
    const n = valueNoise(lx / 5, ly / 3.5, 17) + (ly - 18) * 0.035;
    if (lx > 20 && n > 0.86 - mud * 0.18) {
      const v = p.data[y * W + x];
      p.set(x, y, mixU32(v, n > 0.95 ? '#8A7A5A' : '#6B5A4A', 0.5 + mud * 0.2));
    } else if (lx > 24 && hash2(lx, ly, 18) < 0.02 + mud * 0.04) p.set(x, y, '#6B5A4A');
  });
  p.rect(X(36), Y(12 + drop), 4, 2, '#6B5A4A');
  p.set(X(37), Y(12 + drop), '#8A7A5A');
  // the thin tail with its tuft, swinging
  const tsw = o.tail ?? 0;
  const tlx = X(50);
  const tly = Y(17 + drop);
  p.line(tlx, tly, tlx + 2, tly + 5 + tsw, '#3A2616');
  p.rect(tlx + 2, tly + 5 + tsw, 2, 3, '#2A1A10');
  p.set(tlx + 3, tly + 7 + tsw, '#5A3A22');
  // the lantern (low, front left) only reaches the head, the chest and the
  // legs' fronts: the back and the rump are lit by the stars alone
  nightFinish(
    p,
    0.55,
    0.45,
    (x, y) => Math.abs(x - ex) <= 2 && Math.abs(y - ey) <= 2,
    (x, y) => {
      const lx = x - OX;
      const ly = y - OY - bob - drop;
      return lx < 26 ? ly > 12 : lx < 40 ? ly > 26 : false;
    },
  );
  return p;
}

/** Legs: [x, y, [dx, len], far, front]. Near legs drawn after the far ones. */
function legFrames(f: string): [number, number, [number, number], boolean, boolean][] {
  const base: Record<string, [number, number, [number, number], boolean, boolean][]> = {
    stand: [[18, 28, [0, 10], true, true], [46, 26, [1, 12], true, false], [23, 29, [-1, 9], false, true], [42, 27, [0, 11], false, false]],
    paw0: [[18, 28, [0, 10], true, true], [46, 26, [1, 12], true, false], [23, 29, [-5, 6], false, true], [42, 27, [0, 11], false, false]],
    paw1: [[18, 28, [0, 10], true, true], [46, 26, [1, 12], true, false], [23, 29, [-3, 8], false, true], [42, 27, [0, 11], false, false]],
    paw2: [[18, 28, [0, 10], true, true], [46, 26, [1, 12], true, false], [23, 29, [1, 9], false, true], [42, 27, [0, 11], false, false]],
    run0: [[18, 28, [-5, 8], true, true], [46, 26, [6, 10], true, false], [23, 29, [4, 8], false, true], [42, 27, [-4, 10], false, false]],
    run1: [[18, 28, [-2, 9], true, true], [46, 26, [2, 11], true, false], [23, 29, [1, 9], false, true], [42, 27, [-1, 11], false, false]],
    run2: [[18, 28, [4, 8], true, true], [46, 26, [-4, 10], true, false], [23, 29, [-5, 8], false, true], [42, 27, [6, 10], false, false]],
    run3: [[18, 28, [1, 9], true, true], [46, 26, [-1, 11], true, false], [23, 29, [-2, 9], false, true], [42, 27, [2, 11], false, false]],
    lie: [[18, 30, [-4, 3], true, true], [45, 28, [4, 4], true, false], [22, 31, [-5, 2], false, true], [41, 29, [5, 3], false, false]],
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
