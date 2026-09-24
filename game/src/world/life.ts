// Small life in the town that isn't anyone's route (QA round 3):
//   - stage 0, the closed mall's lot: a flock of sparrows pecking about,
//     flushing when Minato comes close and landing again somewhere else on
//     the lot (and now and then moving on by themselves); a shopping bag
//     tumbling across in the evening wind with a little dust behind it.
//     The mall front and the lot were the stillest screens of stage 0.
//     (No trains: the crossing has been down all day and no train comes —
//     10_narrative, the girl at the crossing.)
//   - night: stars mirrored in the paddies (30_level_art 8.4), drawn above
//     the night grade so they stay points of light.

import type { Gfx } from '../engine/gfx';
import { flag } from '../game/state';
import { bagFrames, sparrowFrame, type SparrowPose } from '../art/props/lot_life';
import { paddyStars } from '../art/tiles/water';
import { P } from '../art/tiles/palette';
import * as snd from './audio';
import type { FieldScene } from './field';
import { registerWorldFx } from './fx';

const T = 16;
/** The lot's open asphalt (world px): where birds land and the bag blows. */
const LOT = { x0: 36 * T, x1: 57 * T, y0: 8 * T, y1: 15 * T };
/** Landing places on the lot, clear of the cars, lamps and the tree (tile centres). */
const SPOTS: [number, number][] = [
  [46, 9],
  [48, 12],
  [42, 11],
  [54, 13],
  [49, 8],
];

interface Bird {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  left: boolean;
  pose: SparrowPose;
  timer: number;
  hop: number;
}

type FlockMode = 'ground' | 'fly' | 'away' | 'land';

const flock = {
  mode: 'away' as FlockMode,
  timer: 1500,
  birds: [] as Bird[],
  spot: 0,
  /** Time on the ground before moving on by themselves. */
  stay: 0,
};

const bag = { on: false, x: 0, y: 0, z: 0, t: 0, fade: 1, next: 6000 };
interface Dust {
  x: number;
  y: number;
  z: number;
  t: number;
  life: number;
}
let dust: Dust[] = [];
let lastMap = '';

function alive(f: FieldScene): boolean {
  return f.map.id === 'map_town' && flag('flag_stage') === 0 && f.grade.night < 0.5 && f.grade.motion > 0.5;
}

function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function spotPx(i: number): [number, number] {
  const [tx, ty] = SPOTS[i];
  return [tx * T + 8, ty * T + 12];
}

function farFrom(f: FieldScene, x: number, y: number, d: number): boolean {
  return Math.hypot(f.player.x - x, f.player.y - y) > d;
}

/** Bring the flock in to spot `i` from off to one side, gliding down. */
function land(f: FieldScene, i: number): void {
  const [sx, sy] = spotPx(i);
  flock.spot = i;
  flock.mode = 'land';
  flock.stay = rnd(25000, 45000);
  const fromLeft = Math.random() < 0.5;
  flock.birds = [];
  const n = 3 + Math.floor(Math.random() * 3);
  for (let k = 0; k < n; k++) {
    const tx = sx + rnd(-14, 14);
    const ty = sy + rnd(-6, 6);
    const x = tx + (fromLeft ? -1 : 1) * rnd(110, 150);
    const z = rnd(60, 80);
    const dur = rnd(1.1, 1.6);
    flock.birds.push({
      x,
      y: ty,
      z,
      vx: (tx - x) / dur,
      vy: 0,
      vz: -z / dur,
      left: !fromLeft,
      pose: 'flyA',
      timer: rnd(0, 300),
      hop: 0,
    });
  }
  void f;
}

function flush(f: FieldScene): void {
  flock.mode = 'fly';
  flock.timer = 2200;
  const [sx, sy] = spotPx(flock.spot);
  const away = f.player.x < sx ? 1 : -1;
  for (const b of flock.birds) {
    b.vx = away * rnd(70, 110);
    b.vy = rnd(-30, -10);
    b.vz = rnd(40, 70);
    b.left = away < 0;
    b.timer = rnd(0, 160);
  }
  snd.seAt('se_sparrow_a', sx, sy, { vol: 0.5, pitch: 1.15 });
}

function updateFlock(f: FieldScene, dt: number): void {
  const s = dt / 1000;
  flock.timer -= dt;
  const t = f.t;
  if (flock.mode === 'away') {
    flock.birds = [];
    if (flock.timer <= 0) {
      // somewhere Minato isn't
      const cands = SPOTS.map((_, i) => i).filter((i) => farFrom(f, ...spotPx(i), 72));
      if (cands.length) land(f, cands[Math.floor(Math.random() * cands.length)]);
      else flock.timer = 3000;
    }
    return;
  }
  if (flock.mode === 'land') {
    let down = true;
    for (const b of flock.birds) {
      if (b.timer > 0) {
        b.timer -= dt;
        down = false;
        continue;
      }
      if (b.z > 0) {
        b.x += b.vx * s;
        b.z = Math.max(0, b.z + b.vz * s);
        b.pose = Math.floor(t / 70) % 2 ? 'flyA' : 'flyB';
        down = false;
      } else {
        b.pose = 'stand';
        b.timer = rnd(200, 900);
      }
    }
    if (down) {
      flock.mode = 'ground';
      for (const b of flock.birds) b.timer = rnd(200, 900);
    }
    return;
  }
  if (flock.mode === 'fly') {
    for (const b of flock.birds) {
      if (b.timer > 0) {
        b.timer -= dt;
        b.pose = 'hop';
        continue;
      }
      b.x += b.vx * s;
      b.y += b.vy * s;
      b.z += b.vz * s;
      b.pose = Math.floor(t / 60) % 2 ? 'flyA' : 'flyB';
    }
    if (flock.timer <= 0) {
      flock.mode = 'away';
      flock.timer = rnd(9000, 18000);
    }
    return;
  }
  // on the ground: peck, hop about, keep an eye on the boy
  const [sx, sy] = spotPx(flock.spot);
  if (!farFrom(f, sx, sy, 50) || flock.birds.some((b) => !farFrom(f, b.x, b.y, 30))) {
    flush(f);
    return;
  }
  flock.stay -= dt;
  if (flock.stay <= 0) {
    // moving on by themselves: a short flight to another spot on the lot
    flush(f);
    flock.timer = 900;
    return;
  }
  for (const b of flock.birds) {
    if (b.hop > 0) {
      b.hop -= dt;
      b.x += b.vx * s;
      b.y += b.vy * s;
      b.z = Math.sin((1 - b.hop / 140) * Math.PI) * 2;
      if (b.hop <= 0) {
        b.z = 0;
        b.pose = 'stand';
      }
      continue;
    }
    b.timer -= dt;
    if (b.timer > 0) continue;
    if (Math.random() < 0.6) {
      b.pose = b.pose === 'peck' ? 'stand' : 'peck';
      b.timer = b.pose === 'peck' ? rnd(180, 320) : rnd(300, 1100);
    } else {
      // a hop, staying round the spot
      let dx = rnd(-6, 6);
      const dy = rnd(-3, 3);
      if (Math.abs(b.x + dx - sx) > 18) dx = -dx;
      b.left = dx < 0;
      b.vx = dx / 0.14;
      b.vy = (Math.abs(b.y + dy - sy) > 8 ? -dy : dy) / 0.14;
      b.hop = 140;
      b.pose = 'hop';
      b.timer = rnd(250, 900);
    }
  }
}

function gust(t: number): number {
  return 0.55 + 0.45 * Math.sin(t / 2300) * Math.sin(t / 5100 + 1.3);
}

function updateBag(f: FieldScene, dt: number): void {
  const s = dt / 1000;
  if (!bag.on) {
    bag.next -= dt;
    if (bag.next <= 0) {
      bag.on = true;
      bag.x = LOT.x0 - 8;
      // along the open row in front of the mall (clear of the cars, the sign, the machine)
      bag.y = rnd(LOT.y0 + 8, LOT.y0 + 14);
      bag.t = 0;
      bag.fade = 1;
    }
    return;
  }
  bag.t += dt;
  const g = gust(f.t);
  // skittering in the gusts, lying still for a moment in the lulls
  const v = g > 0.35 ? 18 + g * 34 : 0;
  bag.x += v * s;
  bag.y += Math.sin(bag.t / 900) * 6 * s;
  bag.y = Math.max(LOT.y0 + 5, Math.min(LOT.y0 + 16, bag.y));
  bag.z = v > 0 ? Math.abs(Math.sin(bag.t / 260)) * (3 + g * 5) : Math.max(0, bag.z - 20 * s);
  if (v > 30 && Math.random() < 0.08)
    dust.push({ x: bag.x - 4 + rnd(-2, 2), y: bag.y + rnd(-1, 1), z: 0, t: 0, life: rnd(500, 900) });
  // caught by the fence at the east end, then pulled off it and gone
  if (bag.x > LOT.x1 - 12) {
    bag.x = LOT.x1 - 12;
    bag.fade -= s / 3;
    if (bag.fade <= 0) {
      bag.on = false;
      bag.next = rnd(14000, 24000);
    }
  }
}

function updateDust(f: FieldScene, dt: number): void {
  const s = dt / 1000;
  // a puff of grit off the lot now and then, in the gusts
  if (gust(f.t) > 0.85 && Math.random() < 0.03) {
    const x = rnd(LOT.x0 + 16, LOT.x1 - 24);
    const y = rnd(LOT.y0 + 16, LOT.y1 - 8);
    for (let k = 0; k < 5; k++) dust.push({ x: x + rnd(-4, 4), y: y + rnd(-2, 2), z: rnd(0, 2), t: 0, life: rnd(600, 1100) });
  }
  for (const d of dust) {
    d.t += dt;
    d.x += 26 * s;
    d.z += 5 * s;
  }
  dust = dust.filter((d) => d.t < d.life);
}

function drawLot(f: FieldScene, g: Gfx, cx: number, cy: number): void {
  const inView = (x: number, y: number) => x > cx - 24 && x < cx + 384 + 24 && y > cy - 24 && y < cy + 216 + 48;
  for (const d of dust) {
    if (!inView(d.x, d.y)) continue;
    const a = 0.45 * (1 - d.t / d.life);
    g.rect(Math.round(d.x - cx), Math.round(d.y - d.z - cy), 2, 1, P.woodLt, a);
    g.rect(Math.round(d.x - cx) + 1, Math.round(d.y - d.z - cy) - 1, 1, 1, P.paperGrid, a * 0.8);
  }
  if (bag.on && inView(bag.x, bag.y)) {
    const fr = bagFrames();
    const img = fr[bag.z > 0.5 ? Math.floor(bag.x / 9) % 3 : 2];
    const x = Math.round(bag.x - cx - 6);
    const y = Math.round(bag.y - cy);
    g.rect(x + 3, y - 1, 7, 2, P.ink, 0.22 * bag.fade);
    g.img(img, x, Math.round(y - 10 - bag.z), { alpha: bag.fade });
  }
  for (const b of flock.birds) {
    if (!inView(b.x, b.y)) continue;
    const x = Math.round(b.x - cx);
    const y = Math.round(b.y - cy);
    // the shadow stays on the ground, smaller the higher the bird
    const sw = b.z > 20 ? 2 : b.z > 6 ? 3 : 4;
    g.rect(x - Math.floor(sw / 2), y, sw, 1, P.ink, b.z > 40 ? 0.12 : 0.28);
    g.img(sparrowFrame(b.pose, b.left), x - 5, Math.round(y - 7 - b.z));
  }
}

function drawStars(f: FieldScene, g: Gfx, cx: number, cy: number): void {
  const n = f.grade.night;
  if (n < 0.5 || f.map.id !== 'map_town') return;
  const t = f.t;
  for (const [x, y, seed] of paddyStars(f.map)) {
    if (x < cx || x >= cx + 384 || y < cy || y >= cy + 216) continue;
    const tw = 0.6 + 0.4 * Math.sin(t / (520 + (seed % 400)) + seed);
    const a = Math.min(1, (n - 0.5) * 2) * tw;
    const col = seed % 3 ? P.glint : P.horizon;
    g.rect(x - cx, y - cy, 1, 1, col, a);
    // the brightest ones sparkle into a little cross at the top of their twinkle
    if (seed % 5 === 0 && tw > 0.9) {
      g.rect(x - cx - 1, y - cy, 1, 1, col, a * 0.4);
      g.rect(x - cx + 1, y - cy, 1, 1, col, a * 0.4);
    }
  }
}

registerWorldFx({
  map: '',
  update(f, dt) {
    if (lastMap !== f.map.id) {
      lastMap = f.map.id;
      flock.mode = 'away';
      flock.timer = 1200;
      flock.birds = [];
      bag.on = false;
      bag.next = rnd(3000, 8000);
      dust = [];
    }
    if (!alive(f)) {
      flock.birds = [];
      flock.mode = 'away';
      bag.on = false;
      dust = [];
      return;
    }
    updateFlock(f, dt);
    updateBag(f, dt);
    updateDust(f, dt);
  },
  draw(f, g, cx, cy, layer) {
    if (layer === 'sorted' && alive(f)) drawLot(f, g, cx, cy);
    if (layer === 'glow') drawStars(f, g, cx, cy);
  },
});
