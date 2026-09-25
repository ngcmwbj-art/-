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
//   prop_h_cow_front  20×20  at the feed rail facing the aisle (north pens):
//                            the head goes down and up at the feed; the chores'
//                            `reach` cow stretches its neck 2px toward feed it
//                            cannot reach and holds, bobbing 1px every 2 s.
//   prop_h_cow_back   20×20  the same seen from behind (south pens): the round
//                            rump, the tail, the ear tips with their tags.
//
// opts: { right, white ('belly' | 'leg' | 'face' | 'belly_leg'), phase 0..1,
// sync, n, reach (a spot_h_* id) }. Anchored like a standing prop: the
// middle of the cow's feet on the tile's bottom centre (levels adds dx/dy).
//
// Coat: almost black (#2B2A30, light #45434C, one line of sheen #6E6A78 on
// the back, deepest #1B1733); a small white on 1 cow in 5, never a big
// patch (not a Holstein). Yellow tags in both ears. No expression (the eye
// is a dot, no mouth line), no horns, no nose ring, no halter (50 2.2).
// At dawn (h3) the lying cows get up, hind end first (4 frames), and stand.
// In the dark they only show inside the lantern's light (levels: litOnly);
// the night rim on the lit side is the world's (litRim on ≤32px props).

import { PixelCanvas } from '../../engine/pixel';
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

/** One frame of a cow (cached): pose, frame name, white kinds ('belly_leg'), facing right. */
export function cowFrame(pose: string, frame: string, white = '', right = false): HTMLCanvasElement {
  const key = `${pose}|${frame}|${white}|${right ? 1 : 0}`;
  let c = cache.get(key);
  if (c) return c;
  const rows = COW_FRAMES[pose][frame] ?? COW_FRAMES[pose].base;
  const w = rows[0].length;
  // lying frames sit at the bottom of the standing cow's 21 rows, so a cow
  // getting up at dawn keeps its feet on the straw
  const h = w === 32 ? 21 : rows.length;
  const top = h - rows.length;
  const grid = rows.map((r) => r.split(''));
  for (const kind of white.split('_').filter(Boolean)) {
    const add = COW_WHITE[pose]?.[kind]?.[frame] ?? COW_WHITE[pose]?.[kind]?.base ?? [];
    for (const [x, y, ch] of add) if (grid[y]) grid[y][x] = ch;
  }
  const p = new PixelCanvas(w, h);
  for (let y = top; y < h; y++)
    for (let x = 0; x < w; x++) {
      const col = grid[y - top] ? PAL[grid[y - top][x]] : undefined;
      if (col) p.set(right ? w - 1 - x : x, y, col);
    }
  c = p.toCanvas();
  cache.set(key, c);
  return c;
}

/** Where the ear tags are in a frame (for the glint), in frame px. */
const tagCache = new Map<string, [number, number][]>();
function tagsOf(pose: string, frame: string, right: boolean): [number, number][] {
  const key = `${pose}|${frame}|${right ? 1 : 0}`;
  let t = tagCache.get(key);
  if (t) return t;
  const rows = COW_FRAMES[pose][frame] ?? COW_FRAMES[pose].base;
  const w = rows[0].length;
  const top = (w === 32 ? 21 : rows.length) - rows.length;
  t = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === 'Y' && t!.push([right ? w - 1 - x : x, y + top])));
  tagCache.set(key, t);
  return t;
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

const SIZE: Record<CowPose, [number, number]> = { side: [32, 21], lie: [32, 21], sleep: [32, 21], front: [20, 20], back: [20, 20] };
const CONTACT: Record<CowPose, number> = { side: 24, lie: 26, sleep: 26, front: 16, back: 16 };

/** Is it morning in the barn (h3)? */
function morning(env: PropEnv): boolean {
  return (env.hstage ?? -1) >= 3;
}

// The barn's tubes (the world's roomLights, ending cut 2a): the lying cows get
// up when the lights come on. Looked up lazily — the world imports the art.
let roomLitFn: ((mapId: string) => number | null) | null = null;
void import('../../world/hoshi').then((m) => (roomLitFn = m.roomLit)).catch(() => {});

/** Is the barn still dark for the cows (night, or the tubes not on yet at 5:00)? */
function barnDark(env: PropEnv): boolean {
  const lit = roomLitFn ? roomLitFn('map_hoshi_barn') : null;
  if (lit !== null) return lit <= 0;
  return !morning(env);
}

function cowArt(pose: CowPose, opts: Record<string, unknown>): PropArt {
  const right = !!opts.right;
  const white = String(opts.white ?? '');
  const phase = Number(opts.phase ?? 0);
  const sync = !!opts.sync;
  const reach = String(opts.reach ?? '');
  const seed = Number(opts.n ?? 0) * 0.37 + phase;
  const [w, h] = SIZE[pose];
  // the dawn: a lying cow gets up once, hind end first
  let lastT = -1;
  let sawNight = false;
  let riseAt = -1;
  const lying = pose === 'lie' || pose === 'sleep';

  const frameAt = (env: PropEnv): [string, string] => {
    const t = env.t;
    if (t < lastT) {
      // a new visit: the barn is set up again
      sawNight = false;
      riseAt = -1;
    }
    lastT = t;
    if (lying) {
      if (barnDark(env)) sawNight = true;
      else if (riseAt < 0) riseAt = sawNight ? t + 400 + ((seed * 1000) % 1400) : -2;
      if (riseAt === -2 || (riseAt >= 0 && t >= riseAt)) {
        const k = riseAt === -2 ? 9 : Math.floor((t - riseAt) / 220);
        if (k === 0) return [pose, 'base'];
        if (k === 1) return ['rise', 'r1'];
        if (k === 2) return ['rise', 'r2'];
        return ['side', standFrame(t)];
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
        return ['back', 'base'];
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

  const ox = 8 - Math.floor(w / 2);
  const oy = 16 - h;
  return {
    ox,
    oy,
    w,
    h,
    foot: 15,
    img(env: PropEnv) {
      const [p, f] = frameAt(env);
      // the standing frames after the dawn are taller: keep the feet on the ground
      return cowFrame(p, f, p === 'rise' ? '' : white, right);
    },
    // the ear tags catch the tomato's light (1px, brighter while the ear flicks)
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      if (morning(env)) return;
      const L = env.lantern;
      const r = L ? L.r : 72;
      const near = env.near;
      if (near > r + 4) return;
      const [p, f] = frameAt(env);
      const img = cowFrame(p, f, '', right);
      const fx = x + 8 - Math.floor(img.width / 2);
      const fy = y + 16 - img.height;
      const k = Math.min(1, (r + 4 - near) / 28) * (env.lit ?? 1);
      if (k <= 0.05) return;
      const flick = f === 'ear';
      for (const [tx, ty] of tagsOf(p, f, right)) {
        g.rect(fx + tx, fy + ty, 1, 1, '#FFE7A3', Math.min(1, (flick ? 1 : 0.7) * k));
        if (flick) g.rect(fx + tx - 1, fy + ty, 3, 1, '#FFD23F', 0.25 * k);
      }
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
