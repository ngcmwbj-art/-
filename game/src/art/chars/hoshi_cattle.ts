// The F1 fattening steers of 石黒牛舎 (52 10.4 ★, 4.3; 50 2.2).
//
// Registered as props (the barn map places them through levels'
// prop_h_cow, which forwards to prop_h_cow_<pose> when it exists):
//
//   prop_h_cow_side   32×21  standing side-on (the head to the left, mirrored
//                            for `right`): chews its cud now and then, flicks
//                            an ear every 4–8 s (the tag catches the lantern),
//                            swishes its tail every 8–12 s (3 frames).
//   prop_h_cow_lie    32×15  lying down, head up, chewing the cud (the jaw
//                            2 frames × 600 ms; the four of 北3 in step until
//                            ふしぎ08 is stamped).
//   prop_h_cow_sleep  32×15  lying with the head turned back along the flank.
//   prop_h_cow_front  20×38  at the feed rail facing the aisle (north pens): the
//                            feet on row 19 (the anchor), the neck reaching down
//                            past them under both of the rail's pipes, the ears
//                            and tags just below the lower one, the muzzle in
//                            the trough; the head goes down and up at the feed; the
//                            chores' `reach` cow stretches its neck 2px toward
//                            feed it cannot reach and holds, bobbing 1px every 2 s.
//   prop_h_cow_back   20×32  the same seen from behind (south pens): the round
//                            rump with the tail, the lit back, the neck going up
//                            under the rail's upper pipe (drawn across it here,
//                            the rail itself is behind the cow) to the poll and
//                            the ears with their tags in the trough.
//
// opts: { right, white ('belly' | 'leg' | 'face' | 'belly_leg'), phase 0..1,
// sync, n, reach (a spot_h_* id) }. Anchored like a standing prop: the
// middle of the cow's feet on the tile's bottom centre (levels adds dx/dy).
//
// Coat: almost black (#2B2A30, light #45434C, one line of sheen #6E6A78 on
// the back, deepest #1B1733); a small white on 1 cow in 5, never a big
// patch (not a Holstein). Yellow tags in both ears. No expression (the eye
// is a dot, no mouth line), no horns, no nose ring, no halter (50 2.2).
// At dawn (h3) the lying cows get up, hind end first (r1, r2), and turn to
// face the aisle where the morning feed is coming (the north pens' cows turn
// to face it — `stand`, 20×26 — the south pens' show their rumps with the
// heads up toward it — `rear`, the back view without the rail), each on its
// own beat a moment after the morning shows, on any visit. Facing the aisle
// they take a 20px footprint where a side-on cow takes 32, so four up in one
// pen stand side by side instead of piled on each other (the review's
// 2a / h3 cows). The pen side comes from `n` (the levels' order: 30 cows, 3 to a pen,
// the first 15 in the north pens) unless levels pass `aisle` ('down' | 'up').
// The barn is lit at night (2026-09-26): the shapes read under the tubes; the
// tomato's light only adds the warm glint of the tags and the sheen of the
// back near it (what shows in the one dim pen, 南5). The night rim on the lit
// side is the world's (litRim on ≤32px props).

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import type { Gfx } from '../../engine/gfx';
import { registerProp } from '../props/registry';
import type { PropArt, PropEnv } from '../props/types';
import { COW_FRAMES, COW_WHITE } from './hoshi_cattle_data';

const PAL: Record<string, string> = {
  O: '#1B1733',
  k: '#2B2A30',
  l: '#45434C',
  s: '#6E6A78',
  K: '#1B1733',
  e: '#0B0B14',
  n: '#3A3F48',
  N: '#9AA0A8',
  Y: '#FFD23F',
  y: '#D9A441',
  h: '#3A3F48',
  W: '#E8E4D8',
  w: '#C8C2B4',
};

export type CowPose = 'side' | 'lie' | 'sleep' | 'front' | 'back';
export const COW_POSES: CowPose[] = ['side', 'lie', 'sleep', 'front', 'back'];

const cache = new Map<string, HTMLCanvasElement>();

/** Frame height: the side and lying views share the standing cow's 21 rows (feet on the bottom). */
function frameH(pose: string, rows: string[]): number {
  return rows[0].length === 32 ? 21 : rows.length;
}
/** The frames' source pose: `rear` (up at dawn in a south pen) is the back view without the rail. */
const SRC: Record<string, string> = { rear: 'back' };
const srcOf = (pose: string): string => SRC[pose] ?? pose;

/**
 * The rail's upper pipe (prop_h_barn_rail, side 's': concreteLt over steel)
 * crosses the neck of a cow feeding at the south rail: the rail is drawn
 * behind the cows there, so the pipe is laid over the neck here (rows 8–9
 * with the feet at dy 20 in the pen, 52 4.3). The north rail is drawn in
 * front of its cows by the levels' prop.
 */
const BACK_PIPE: [number, string][] = [
  [8, P.concreteLt],
  [9, P.steel],
];

/** One frame of a cow (cached): pose, frame name, white kinds ('belly_leg'), facing right. */
export function cowFrame(pose: string, frame: string, white = '', right = false): HTMLCanvasElement {
  const key = `${pose}|${frame}|${white}|${right ? 1 : 0}`;
  let c = cache.get(key);
  if (c) return c;
  const src = srcOf(pose);
  const rows = COW_FRAMES[src][frame] ?? COW_FRAMES[src].base;
  const w = rows[0].length;
  // lying frames sit at the bottom of the standing cow's 21 rows, so a cow
  // getting up at dawn keeps its feet on the straw
  const h = frameH(src, rows);
  const top = h - rows.length;
  const grid = rows.map((r) => r.split(''));
  for (const kind of white.split('_').filter(Boolean)) {
    const add = COW_WHITE[src]?.[kind]?.[frame] ?? COW_WHITE[src]?.[kind]?.base ?? [];
    for (const [x, y, ch] of add) if (grid[y]) grid[y][x] = ch;
  }
  const p = new PixelCanvas(w, h);
  for (let y = top; y < h; y++)
    for (let x = 0; x < w; x++) {
      const col = grid[y - top] ? PAL[grid[y - top][x]] : undefined;
      if (col) p.set(right ? w - 1 - x : x, y, col);
    }
  if (pose === 'back')
    for (const [y, col] of BACK_PIPE)
      for (let x = 0; x < w; x++) if (grid[y] && PAL[grid[y][x]]) p.set(x, y, col);
  c = p.toCanvas();
  cache.set(key, c);
  return c;
}

/** Where the pixels of some letters are in a frame (the tags' glint, the sheen), in frame px. */
const pxCache = new Map<string, [number, number][]>();
function pixelsOf(pose: string, frame: string, right: boolean, letters: string): [number, number][] {
  const key = `${pose}|${frame}|${right ? 1 : 0}|${letters}`;
  let t = pxCache.get(key);
  if (t) return t;
  const src = srcOf(pose);
  const rows = COW_FRAMES[src][frame] ?? COW_FRAMES[src].base;
  const w = rows[0].length;
  const top = frameH(src, rows) - rows.length;
  const out: [number, number][] = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => letters.includes(ch) && out.push([right ? w - 1 - x : x, y + top])));
  pxCache.set(key, out);
  return out;
}

/** The chores (50 10.19): open from the gate until the chores are done (levels' spotPending). */
function spotPending(env: PropEnv, spot: string): boolean {
  if (!spot) return false;
  const open = env.flag('flag_ch2_gate_open') > 0 && !env.flag('flag_ch2_tetsuya_beaten') && !env.flag('flag_ch2_barn_work');
  return open && !env.flag('flag_' + spot);
}

/** A per-cow pseudo-random schedule: is an event of `len` ms on at t, one every `lo`–`hi` ms? */
function every(t: number, lo: number, hi: number, len: number, seed: number): number {
  // fixed slots of length hi; inside each, the event falls at a seeded offset
  const slot = Math.floor(t / hi);
  const r = Math.abs(Math.sin((slot + 1) * 12.9898 + seed * 78.233)) % 1;
  const at = slot * hi + r * (hi - lo);
  const d = t - at;
  return d >= 0 && d < len ? d : -1;
}

const SIZE: Record<CowPose, [number, number]> = { side: [32, 21], lie: [32, 21], sleep: [32, 21], front: [20, 38], back: [20, 32] };
/** The row under the feet (the anchor line): the front view's head reaches down past its feet. */
const FEET: Record<CowPose, number> = { side: 21, lie: 21, sleep: 21, front: 20, back: 32 };
const CONTACT: Record<CowPose, number> = { side: 24, lie: 26, sleep: 26, front: 16, back: 16 };

/** Is it morning in the barn (h3)? */
function morning(env: PropEnv): boolean {
  return (env.hstage ?? -1) >= 3;
}

// The room's tubes as the events switch them (the world's roomLights): if
// the events turn them off for a cut, the cows wait for them to come back on.
// Looked up lazily — the world imports the art.
let roomLitFn: ((mapId: string) => number | null) | null = null;
void import('../../world/hoshi').then((m) => (roomLitFn = m.roomLit)).catch(() => {});

/** Do the lying cows keep lying? All night; in the morning only while the events hold the lights off. */
function stillNight(env: PropEnv): boolean {
  if (!morning(env)) return true;
  const lit = roomLitFn ? roomLitFn('map_hoshi_barn') : null;
  return lit !== null && lit <= 0;
}

/**
 * A lying cow's frames through the dawn (lying, getting up, turned to the
 * aisle) on one 32×32 canvas, each frame bottom-centred on it, so the feet
 * stay on the straw whatever the pose's size. Returns the canvas and where
 * the frame sits on it.
 */
const placedCache = new Map<string, HTMLCanvasElement>();
function placedAt(pose: string, frame: string): [number, number] {
  const src = srcOf(pose);
  const rows = COW_FRAMES[src][frame] ?? COW_FRAMES[src].base;
  return [(32 - rows[0].length) >> 1, 32 - frameH(src, rows)];
}
function placed(pose: string, frame: string, white: string, right: boolean): HTMLCanvasElement {
  const key = `${pose}|${frame}|${white}|${right ? 1 : 0}`;
  let c = placedCache.get(key);
  if (c) return c;
  const img = cowFrame(pose, frame, white, right);
  const [x, y] = placedAt(pose, frame);
  c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  c.getContext('2d')!.drawImage(img, x, y);
  placedCache.set(key, c);
  return c;
}

function cowArt(pose: CowPose, opts: Record<string, unknown>): PropArt {
  const right = !!opts.right;
  const white = String(opts.white ?? '');
  const phase = Number(opts.phase ?? 0);
  const sync = !!opts.sync;
  const reach = String(opts.reach ?? '');
  const seed = Number(opts.n ?? 0) * 0.37 + phase;
  const [w, h] = SIZE[pose];
  // the dawn: a lying cow gets up once, hind end first, a moment after the
  // morning shows (each cow on its own beat)
  let lastT = -1;
  let riseAt = -1;
  const lying = pose === 'lie' || pose === 'sleep';
  // which way the aisle (and the morning feed) is from this cow's pen
  const nIdx = opts.n === undefined ? -1 : Number(opts.n);
  const aisle = String(opts.aisle ?? (nIdx >= 15 ? 'up' : nIdx >= 0 ? 'down' : ''));

  const frameAt = (env: PropEnv): [string, string] => {
    const t = env.t;
    if (t < lastT) riseAt = -1; // a new visit: the barn is set up again
    lastT = t;
    if (lying) {
      if (stillNight(env)) riseAt = -1;
      else if (riseAt < 0) riseAt = t + 500 + ((seed * 1000) % 1400);
      if (riseAt >= 0 && t >= riseAt) {
        const k = Math.floor((t - riseAt) / 220);
        if (k === 0) return [pose, 'base'];
        if (k === 1) return ['rise', 'r1'];
        if (k === 2) return ['rise', 'r2'];
        if (k < 5 || !aisle) return ['side', standFrame(t)];
        return aisle === 'up' ? ['rear', rearFrame(t)] : ['stand', faceFrame(t)];
      }
    }
    const ph = sync && !env.flag('flag_fushigi_ch2_08') ? 0 : phase;
    switch (pose) {
      case 'lie': {
        if (every(t, 4000, 8000, 110, seed) >= 0) return ['lie', 'ear'];
        return ['lie', Math.floor((t + ph * 1200) / 600) % 2 ? 'chew' : 'base'];
      }
      case 'sleep':
        return ['sleep', every(t, 5000, 9000, 110, seed) >= 0 ? 'ear' : 'base'];
      case 'side':
        return ['side', standFrame(t)];
      case 'front': {
        if (spotPending(env, reach)) return ['front', Math.floor(t / 2000) % 2 ? 'reach_up' : 'reach'];
        if (every(t, 4000, 8000, 110, seed) >= 0) return ['front', 'ear'];
        return ['front', Math.floor((t + ph * 1400) / 700) % 2 ? 'eat' : 'base'];
      }
      case 'back': {
        if (spotPending(env, reach)) return ['back', Math.floor(t / 2000) % 2 ? 'reach_up' : 'reach'];
        const sw = every(t, 8000, 12000, 450, seed + 3);
        if (sw >= 0) return ['back', sw < 150 ? 'tail1' : sw < 300 ? 'tail2' : 'tail1'];
        if (every(t, 4000, 8000, 110, seed) >= 0) return ['back', 'ear'];
        return ['back', Math.floor((t + ph * 1400) / 700) % 2 ? 'eat' : 'base'];
      }
    }
    return [pose, 'base'];
  };

  // standing: the tail every 8–12 s, an ear every 4–8 s, chewing half the time
  function standFrame(t: number): string {
    const sw = every(t, 8000, 12000, 450, seed + 3);
    if (sw >= 0) return sw < 150 ? 'tail1' : sw < 300 ? 'tail2' : 'tail1';
    if (every(t, 4000, 8000, 110, seed) >= 0) return 'ear';
    const chewing = Math.floor((t + seed * 20000) / 16000) % 2 === 0;
    return chewing && Math.floor((t + phase * 1200) / 600) % 2 ? 'chew' : 'base';
  }

  // up at dawn and turned to the aisle: the rump toward us (south pens), the
  // face toward us chewing now and then (north pens); an ear, the tail
  function rearFrame(t: number): string {
    const sw = every(t, 8000, 12000, 450, seed + 3);
    if (sw >= 0) return sw < 150 ? 'tail1' : sw < 300 ? 'tail2' : 'tail1';
    return every(t, 4000, 8000, 110, seed) >= 0 ? 'ear' : 'base';
  }
  function faceFrame(t: number): string {
    if (every(t, 4000, 8000, 110, seed) >= 0) return 'ear';
    return Math.floor((t + phase * 1200) / 600) % 2 && Math.floor((t + seed * 20000) / 16000) % 2 === 0 ? 'chew' : 'base';
  }

  // a lying cow's frames share one 32×32 canvas (see placed())
  const W = lying ? 32 : w;
  const H = lying ? 32 : h;
  const ox = 8 - Math.floor(W / 2);
  const oy = 16 - (lying ? 32 : FEET[pose]);
  return {
    ox,
    oy,
    w: W,
    h: H,
    foot: 15,
    img(env: PropEnv) {
      const [p, f] = frameAt(env);
      const wh = p === 'rise' ? '' : white;
      return lying ? placed(p, f, wh, right) : cowFrame(p, f, wh, right);
    },
    // the tomato's light (52 10.4 光): the ear tags glint (brighter while the
    // ear flicks), the sheen along the back and the lit top of the coat warm
    // up near it. The barn is lit (2026-09-26), so this is what shows in the
    // one dim pen (南5) and only as a warm touch elsewhere.
    glow(this: PropArt, g: Gfx, x: number, y: number, env: PropEnv) {
      if (morning(env) || !env.lantern) return;
      const r = env.lantern.r;
      const near = env.near;
      if (near > r + 8) return;
      const k = Math.min(1, (r + 8 - near) / 36);
      if (k <= 0.05) return;
      const [p, f] = frameAt(env);
      // the image is drawn at the (levels-shifted) ox/oy of the art the renderer holds
      const [px, py] = lying ? placedAt(p, f) : [0, 0];
      const fx = x + this.ox + px;
      const fy = y + this.oy + py;
      const flick = f === 'ear';
      for (const [tx, ty] of pixelsOf(p, f, right, 'Y')) {
        g.rect(fx + tx, fy + ty, 1, 1, '#FFE7A3', Math.min(1, (flick ? 1 : 0.75) * k));
        if (flick) g.rect(fx + tx - 1, fy + ty, 3, 1, '#FFD23F', 0.25 * k);
      }
      for (const [tx, ty] of pixelsOf(p, f, right, 's')) g.rect(fx + tx, fy + ty, 1, 1, '#F7C27A', 0.42 * k);
      for (const [tx, ty] of pixelsOf(p, f, right, 'l')) g.rect(fx + tx, fy + ty, 1, 1, '#F2894B', 0.16 * k);
    },
    contact: CONTACT[pose],
    contactX: 8,
  } as PropArt;
}

for (const pose of COW_POSES) registerProp('prop_h_cow_' + pose, (opts) => cowArt(pose, opts));

// ---- the gallery's night cows page (?scene=chars, 'night cows') ------------------------------

import { addCowPreview, type NightItem } from './gallery_night';

addCowPreview(() => {
  const items: NightItem[] = [];
  const env = (t: number, pending: string): PropEnv =>
    ({
      t,
      stage: 3,
      grade: { night: 1 },
      motion: 1,
      mt: t,
      flag: (id: string) => (id === 'flag_ch2_gate_open' ? 1 : id === 'flag_' + pending ? 0 : 0),
      seed: 0,
      near: 0,
      px: 0,
      py: 0,
      hstage: 1,
    }) as unknown as PropEnv;
  const list: [CowPose, string, boolean, string][] = [
    ['side', '', false, ''], ['side', 'belly_leg', true, ''], ['lie', '', false, ''], ['lie', 'face', true, ''],
    ['sleep', '', false, ''], ['front', '', false, ''], ['front', 'face', false, 'spot_h_esa_01'], ['back', 'belly', false, ''], ['back', '', false, 'spot_h_esa_04'],
  ];
  list.forEach(([pose, white, right, reach], i) => {
    const art = cowArt(pose, { right, white, phase: i / list.length, n: i, reach });
    items.push({
      w: art.w + 4,
      h: art.h + 2,
      label: `${pose}${white ? ' ' + white : ''}${reach ? ' reach' : ''}`,
      frames: (t) => {
        const img = art.img(env(t, reach));
        return img ? [{ img, x: 2, y: 2 + art.h - img.height }] : [];
      },
    });
  });
  return items;
});
