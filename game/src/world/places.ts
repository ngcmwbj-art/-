// Special places with their own per-frame effects (30_level_art 3.9 / 7.6 /
// 8.4, 10_narrative 8): the curve mirror (fushigi_01), the cat's lagging
// shadow (fushigi_02), the sparrows on the five-line staff (fushigi_03), the
// stray carts (fushigi_09), red dragonflies, dust in the arcade light, the
// night train and a few timed ambient sounds.

import type { Co } from '../engine/co';
import type { Gfx } from '../engine/gfx';
import { W, H } from '../engine/screen';
import { flag } from '../game/state';
import { charSprite, idleFrame, poseFrame, walkFrame } from '../art/chars';
import { setPropHook } from '../art/props/pkit';
import { fontTextSmall } from '../art/props/text';
import { PixelCanvas } from '../engine/pixel';
import { CART_FRAMES } from '../art/props/parking';
import { lowPoint, staffPoint } from '../art/props/wires';
import { P } from '../art/tiles/palette';
import { ihash } from '../art/tiles/noise';
import { Actor } from './actor';
import { addFushigiSpots, field, type FieldScene } from './field';
import { registerWorldFx } from './fx';
import { fushigiDone, onFushigiPressed } from './fushigi';
import { initNpc, stepToward, type NpcWorld } from './npc';
import * as snd from './audio';

// ---------------------------------------------------------------- fushigi_01: the curve mirror

interface Snap {
  x: number;
  y: number;
  img: HTMLCanvasElement;
}
const hist: Snap[] = [];
let stillT = 0;

const MIRROR_CENTER: [number, number] = [17 * 16, 28 * 16 + 8];
const MIRROR_SCALE = 0.25;

setPropHook('mirror', (g, mx, my, env) => {
  const f = field();
  if (!f || f.map.id !== 'map_town') return;
  const ctx = g.ctx;
  const r = 5;
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx + 0.5, my + 0.5, r + 0.4, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  // the street behind the viewer, mirrored left-right, 1/4 size
  const [wx, wy] = MIRROR_CENTER;
  const span = (r * 2 + 2) / MIRROR_SCALE;
  const sx0 = wx - span / 2;
  const sy0 = wy - span / 2;
  ctx.translate(mx + 0.5, my - r - 1);
  ctx.scale(-MIRROR_SCALE, MIRROR_SCALE);
  const CH = 256;
  for (let ky = Math.floor(sy0 / CH); ky <= Math.floor((sy0 + span) / CH); ky++)
    for (let kx = Math.floor(sx0 / CH); kx <= Math.floor((sx0 + span) / CH); kx++) {
      if (kx < 0 || ky < 0) continue;
      const chunk = f.ground.chunk(kx, ky);
      ctx.drawImage(chunk, kx * CH - wx, ky * CH - sy0);
    }
  // actors: the player 0.4s late (no delay once stamped), others as they are
  const delay = fushigiDone('fushigi_01') ? 0 : 24;
  const snap = hist.length > delay ? hist[hist.length - 1 - delay] : hist[0];
  const draw = (img: HTMLCanvasElement, ax: number, ay: number) => {
    ctx.drawImage(img, Math.round(ax - wx - img.width / 2), Math.round(ay - sy0 - img.height));
  };
  for (const a of f.actors) {
    if (!a.visible || Math.abs(a.x - wx) > span || Math.abs(a.y - wy) > span) continue;
    if (a.kind === 'sym' || a.data.cart) continue;
    draw(a.frame(), a.x, a.y + a.oy);
  }
  if (snap) {
    let img = snap.img;
    // standing still: 0.4s later he looks smug in the mirror
    if (!delay || stillT > 400) {
      const spr = charSprite('minato');
      if (stillT > 400 && (spr.extra?.smug || spr.extraDir?.smug)) img = poseFrame(spr, 'smug', 'down');
    }
    draw(img, snap.x, snap.y);
  }
  ctx.restore();
  // sky tint on the glass (top of the mirror) and the 2s glint
  g.rect(mx - r + 1, my - r + 1, r * 2 - 1, 2, P.aqua, 0.35);
  if (Math.floor(env.t / 2000) % 2 === 0 && env.t % 2000 < 120) g.rect(mx - 2, my - 3, 1, 1, P.glint);
});

// ---------------------------------------------------------------- per-map state

interface Sparrow {
  line: number;
  t: number;
  hop: number;
  spr: string;
}
interface Fly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
}

let lastMap = '';
let sparrowT = 0;
let hopIdx = -1;
let hopClock = 0;
let furinT = 8000;
let flickerT = 3000;
const flies: Fly[] = [];
const catHist: HTMLCanvasElement[] = [];
let carts: Actor[] = [];
let cartsHome = false;

const STAFF_A: [number, number] = [3, 23];
const STAFF_B: [number, number] = [13, 23];
/** Nine sparrows on the staff: [wire 0..4 (top→bottom), t along the span]. */
const NOTES: [number, number][] = [
  [4, 0.12], [3, 0.2], [2, 0.29], [1, 0.38], [1, 0.47], [4, 0.58], [3, 0.66], [2, 0.75], [0, 0.86],
];
const NOTES_B: [number, number][] = [
  [0, 0.12], [1, 0.2], [2, 0.29], [3, 0.38], [2, 0.47], [3, 0.58], [1, 0.66], [0, 0.75], [1, 0.86],
];

function resetMap(f: FieldScene): void {
  lastMap = f.map.id;
  catHist.length = 0;
  hist.length = 0;
  flies.length = 0;
  for (const c of carts) f.removeActor(c);
  carts = [];
  if (f.map.id === 'map_town') {
    for (let i = 0; i < 5; i++) {
      const hx = ihash(i, 1, 3101);
      flies.push({ x: (8 + (hx % 44)) * 16, y: (33 + (hx >>> 8) % 6) * 16, vx: 0, vy: 0, ph: (hx % 100) / 16 });
    }
  }
}

function spawnCarts(f: FieldScene): void {
  const starts: [number, number][] = [
    [39, 9],
    [47, 12],
    [53, 9],
  ];
  carts = starts.map(([x, y], i) => {
    const a = new Actor(`cart_${i + 1}`, 'npc', 'npc_cart', x * 16 + 8, y * 16 + 16);
    a.bw = 12;
    a.bh = 8;
    a.shadowH = 0;
    a.solid = true;
    initNpc(a, { t: 'npc', id: `cart_${i + 1}`, x, y, fushigi: 'fushigi_09', noTurn: true, move: { kind: 'stand' } });
    a.data.cart = true;
    a.data.phase = i * 1.7;
    a.drawFn = (g, sx, sy) => {
      const k = a.moving ? Math.floor(f.t / 150) % 2 : 0;
      g.img(CART_FRAMES[k].toCanvas(), sx - 8, sy - 16);
    };
    f.addActor(a);
    return a;
  });
  cartsHome = fushigiDone('fushigi_09');
  if (cartsHome) parkCarts();
}

function parkCarts(): void {
  carts.forEach((c, i) => {
    c.x = 53 * 16 + 8 + i * 3;
    c.y = 6 * 16 + 15 - i;
    c.solid = false;
    c.path = [];
    c.moving = false;
  });
}

onFushigiPressed((id) => {
  if (id !== 'fushigi_09') return;
  const f = field();
  if (!f) return;
  // line up and roll into the corral (2s)
  carts.forEach((c, i) => {
    c.data.scripted = true;
    c.pathSpeed = 3 * 16;
    c.path = [
      [50 * 16 + 8 - i * 14, 8 * 16 + 8],
      [53 * 16 + 8 + i * 3, 6 * 16 + 15 - i],
    ];
  });
  cartsHome = true;
  snd.se('se_cart_rattle');
});

addFushigiSpots((f) => {
  if (f.map.id !== 'map_town') return [];
  const out: { id: string; x: number; y: number }[] = [];
  if (flag('flag_stage') >= 1) {
    const [x, y] = staffPoint(STAFF_A, STAFF_B, 2, 0.5);
    out.push({ id: 'fushigi_03', x, y });
  }
  if (carts[0]) out.push({ id: 'fushigi_09', x: carts[0].x, y: carts[0].y - 8 });
  return out;
});

function updateCarts(f: FieldScene, dt: number): void {
  const want = f.map.id === 'map_town' && flag('flag_stage') === 2;
  if (!want) {
    if (carts.length) {
      for (const c of carts) f.removeActor(c);
      carts = [];
    }
    return;
  }
  if (!carts.length) spawnCarts(f);
  if (cartsHome) {
    if (carts.every((c) => !c.path.length)) parkCarts();
    for (const c of carts) if (c.path.length) f.followPath(c, dt);
    return;
  }
  const nw: NpcWorld = { t: f.t, free: (a, x, y) => f.free(a, x, y), actorById: (id) => f.actorById(id), motion: 1 };
  for (const c of carts) {
    if (c.data.scripted || f.talking === c) continue;
    let tgt = c.data.tgt as [number, number] | undefined;
    const wait = (c.data.wait as number | undefined) ?? 0;
    if (wait > 0) {
      c.data.wait = wait - dt;
      c.moving = false;
      continue;
    }
    if (!tgt) {
      // wander inside x36–56, y8–13; sometimes drift towards the player and stop
      const p = f.player;
      const near = Math.hypot(p.x - c.x, p.y - c.y) < 80 && Math.random() < 0.35;
      const tx = near ? p.x + (Math.random() - 0.5) * 40 : (36 + Math.random() * 20) * 16 + 8;
      const ty = near ? p.y + (Math.random() - 0.5) * 24 : (8 + Math.random() * 5) * 16 + 16;
      tgt = [Math.max(36 * 16 + 8, Math.min(56 * 16 + 8, tx)), Math.max(8 * 16 + 16, Math.min(13 * 16 + 16, ty))];
      c.data.tgt = tgt;
    }
    const arrived = stepToward(c, tgt[0], tgt[1], 0.9 * 16, dt, nw, false);
    if (arrived || (!c.moving && Math.random() < 0.02)) {
      delete c.data.tgt;
      c.data.wait = 600 + Math.random() * 1800;
      if (Math.hypot(f.player.x - c.x, f.player.y - c.y) < 120 && Math.random() < 0.3) snd.se('se_cart_rattle', { vol: 0.6 });
    }
  }
}

// ---------------------------------------------------------------- update & draw

registerWorldFx({
  map: '',
  update(f, dt) {
    if (f.map.id !== lastMap) resetMap(f);
    const stage = flag('flag_stage');
    // mirror history (player frames)
    if (f.map.id === 'map_town') {
      const p = f.player;
      hist.push({ x: p.x, y: p.y, img: p.frame() });
      if (hist.length > 40) hist.shift();
      stillT = p.moving ? 0 : stillT + dt;
    }
    // cat shadow lag (fushigi_02): 30 frames behind from stage 1 until stamped
    const cat = f.actors.find((a) => a.id === 'npc_cat_sauce');
    if (cat) {
      catHist.push(cat.frame());
      if (catHist.length > 32) catHist.shift();
      cat.data.shadowFrame = stage >= 1 && !fushigiDone('fushigi_02') && catHist.length > 30 ? catHist[catHist.length - 31] : undefined;
    }
    // sparrows sing every 8s (stage 1+) when the player is near the upper road
    if (f.map.id === 'map_town' && stage >= 1 && stage < 3) {
      sparrowT -= dt;
      const d = Math.hypot(f.player.x - 8 * 16, f.player.y - 22 * 16);
      if (sparrowT <= 0) {
        sparrowT = 8000;
        hopIdx = 0;
        hopClock = 0;
        if (d < 14 * 16) snd.se(fushigiDone('fushigi_03') ? 'se_sparrow_b' : 'se_sparrow_a', { vol: Math.max(0.2, 1 - d / (14 * 16)) });
      }
      if (hopIdx >= 0) {
        hopClock += dt;
        if (hopClock > 220) {
          hopClock = 0;
          hopIdx++;
          if (hopIdx >= 9) hopIdx = -1;
        }
      }
    }
    // the wind chime in the 1F living room (stage 0, every 8–20s)
    if (f.map.id === 'map_home_1f' && stage === 0) {
      furinT -= dt;
      if (furinT <= 0) {
        furinT = 8000 + Math.random() * 12000;
        snd.se('se_furin', { vol: 0.6 });
      }
    }
    // stage-2 street lamps flicker: sync the ambience
    if (f.map.id === 'map_town' && stage === 2) {
      flickerT -= dt;
      if (flickerT <= 0) {
        flickerT = 2000 + Math.random() * 4000;
        snd.ambientEvent('amb_s2_town', 'flicker', Math.random() * 1.6 - 0.8);
      }
    }
    // red dragonflies over the canal
    for (const fl of flies) {
      if (stage === 1) continue; // hang in the air
      fl.ph += dt / 1000;
      const ne = stage === 2;
      fl.vx = ne ? 10 : Math.sin(fl.ph * 1.3) * 14;
      fl.vy = ne ? -6 : Math.cos(fl.ph * 0.9) * 6;
      fl.x += (fl.vx * dt) / 1000;
      fl.y += (fl.vy * dt) / 1000;
      if (fl.x > 58 * 16) fl.x = 2 * 16;
      if (fl.y < 30 * 16) fl.y = 40 * 16;
      if (fl.y > 41 * 16) fl.y = 32 * 16;
    }
    updateCarts(f, dt);
  },
  draw(f, g, cx, cy, layer) {
    if (f.map.id !== 'map_town') return;
    const stage = flag('flag_stage');
    if (layer === 'fg') {
      drawSparrows(f, g, cx, cy, stage);
      drawFlies(g, cx, cy, f.t, stage);
    }
    if (layer === 'fg' && stage < 3) drawDust(g, cx, cy, f.mt, stage);
    if (layer === 'fg' && stage >= 1 && stage < 3 && !fushigiDone('fushigi_04')) drawMaido(f, g, cx, cy);
    if (layer === 'fg' && train.active) drawTrain(g, cx, cy);
  },
});

function drawSparrows(f: FieldScene, g: Gfx, cx: number, cy: number, stage: number): void {
  const spr = charSprite('prop_sparrow');
  if (stage >= 1 && stage < 3) {
    const notes = fushigiDone('fushigi_03') ? NOTES_B : NOTES;
    for (let i = 0; i < notes.length; i++) {
      const [k, t] = notes[i];
      const [x, y] = staffPoint(STAFF_A, STAFF_B, k, t);
      const hop = hopIdx === i ? 1 : 0;
      const singing = hopIdx === i;
      const img = singing && spr.extra?.sing ? poseFrame(spr, 'sing', 'left') : idleFrame(spr, i % 2 ? 'left' : 'right', f.t + i * 330);
      g.img(img, Math.round(x - cx - img.width / 2), Math.round(y - cy - img.height + 1 - hop));
    }
    return;
  }
  // ordinary sparrows on the canal-side cable (stage 0 / night)
  const line: [number, number][] = [
    [6, 35],
    [22, 35],
  ];
  for (let i = 0; i < 3; i++) {
    const t = 0.3 + i * 0.13;
    const [x, y] = lowPoint(line[0], line[1], t);
    const hopping = Math.floor((f.t + i * 900) / 2600) % 3 === 0;
    const img = idleFrame(spr, i % 2 ? 'left' : 'right', f.t + i * 470);
    g.img(img, Math.round(x - cx - img.width / 2 + (hopping ? 1 : 0)), Math.round(y - cy - img.height + 1 - (hopping ? 1 : 0)));
  }
}

function drawFlies(g: Gfx, cx: number, cy: number, t: number, stage: number): void {
  if (stage === 3) return;
  for (const fl of flies) {
    const x = Math.round(fl.x - cx);
    const y = Math.round(fl.y - cy - 20);
    if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
    const flap = stage === 1 ? 0 : Math.floor(t / 60) % 2;
    g.rect(x, y, 3, 1, P.sunDeep);
    g.rect(x + 1, y - 1 + flap, 1, 1, P.glint);
    g.rect(x - 1, y - 1 + flap, 1, 1, P.glint);
  }
}

/** fx_dust: motes in the arcade's light stripes (frozen in stage 1). */
function drawDust(g: Gfx, cx: number, cy: number, mt: number, stage: number): void {
  const x0 = 23 * 16;
  const y0 = 20 * 16;
  const w = 33 * 16;
  const h = 6 * 16;
  if (x0 - cx > W || y0 - cy > H || x0 + w - cx < 0 || y0 + h - cy < 0) return;
  const tt = mt / 1000;
  for (let i = 0; i < 40; i++) {
    const hh = ihash(i, 7, 3201);
    let x = x0 + (hh % w) + Math.sin(tt * 0.4 + i) * 10;
    let y = y0 + ((hh >>> 10) % h) + ((tt * 3 + i * 7) % h);
    if (y > y0 + h) y -= h;
    if (stage === 2) x += (tt * 4) % 16;
    const sx = Math.round(x - cx);
    const sy = Math.round(y - cy);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
    // only inside the light bands (＼ stripes, period 24)
    const u = (((stage === 2 ? sx + sy * 2 : sx - sy * 2) % 24) + 24) % 24;
    if (u > 10) continue;
    g.rect(sx, sy, 1, 1, P.horizon, 0.7);
  }
}

// ---------------------------------------------------------------- fushigi_04: 「まいど！」 over まめ吉

let MAIDO: HTMLCanvasElement | null = null;
function maidoBalloon(): HTMLCanvasElement {
  if (MAIDO) return MAIDO;
  const p = new PixelCanvas(40, 16);
  p.rect(1, 1, 38, 11, P.white);
  p.strokeRect(0, 0, 40, 13, P.ink);
  p.set(0, 0, 'transparent');
  p.set(39, 0, 'transparent');
  p.set(0, 12, 'transparent');
  p.set(39, 12, 'transparent');
  // tail
  p.set(17, 13, P.ink);
  p.set(18, 13, P.white);
  p.set(19, 13, P.ink);
  p.set(18, 14, P.ink);
  p.hline(18, 18, 12, P.white);
  fontTextSmall(p, 'まいど！', 3, 2, P.verm, 1);
  MAIDO = p.toCanvas();
  return MAIDO;
}

function drawMaido(f: FieldScene, g: Gfx, cx: number, cy: number): void {
  const a = f.actors.find((x) => x.id === 'npc_mamekichi');
  if (!a || !a.visible) return;
  const t = f.t % 2400;
  if (t > 1700) return;
  const img = maidoBalloon();
  const pop = t < 80 ? 1 : 0;
  g.img(img, Math.round(a.x + a.ox - img.width / 2 - cx), Math.round(a.y + a.oy - 24 - img.height - 2 - cy - pop));
}

// ---------------------------------------------------------------- the night train (8.6)

const train = { active: false, t: 0 };

function drawTrain(g: Gfx, cx: number, cy: number): void {
  // four unlit cars, 160px long, travelling north → south along x=60, over 2.0s
  const len = 160;
  const y = -len + (train.t / 2000) * (44 * 16 + len * 2);
  const x = 60 * 16 + 1 - cx;
  const top = Math.round(y - cy);
  for (let c = 0; c < 4; c++) {
    const cyy = top + c * 40;
    g.rect(x, cyy, 14, 38, P.charcoal);
    g.rect(x + 1, cyy + 1, 12, 36, P.nightShade);
    g.rect(x + 1, cyy + 1, 2, 36, P.shade);
    for (let k = 0; k < 4; k++) g.rect(x + 3, cyy + 4 + k * 8, 8, 5, P.night);
    g.rect(x, cyy + 38, 14, 2, P.ink);
  }
  // the head (south end) and its destination sign 「星見台」
  const hy = top + 4 * 40;
  g.rect(x, hy - 2, 14, 6, P.charcoal);
  g.rect(x + 2, hy - 1, 10, 3, P.night);
  g.text('星見台', x + 7, hy + 6, { color: P.horizon, align: 'center', outline: P.night });
}

/** Run the unlit night train across the crossing (ending cut 6). */
export function* trainPass(): Co {
  const f = field();
  if (!f) return;
  snd.se('se_train_pass');
  train.active = true;
  const t0 = f.t;
  train.t = 0;
  while (train.t < 2000) {
    yield null;
    train.t = f.t - t0;
  }
  train.active = false;
}

export { hist as mirrorHistory };
