// Special places with their own per-frame effects (30_level_art 3.9 / 7.6 /
// 8.4, 10_narrative 8): the curve mirror (fushigi_01), the cat's lagging
// shadow (fushigi_02), the sparrows on the five-line staff (fushigi_03), the
// stray carts (fushigi_09), red dragonflies, dust in the arcade light, the
// night train and a few timed ambient sounds.

import type { Co } from '../engine/co';
import type { Gfx } from '../engine/gfx';
import { game } from '../engine/game';
import { W, H } from '../engine/screen';
import { flag } from '../game/state';
import { charSprite, idleFrame, poseFrame, walkFrame } from '../art/chars';
import { setPropHook } from '../art/props/pkit';
import { fontSmallWidth, fontTextSmall, handGlyph, handText } from '../art/props/text';
import { registerDebug } from '../debug';
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

/** Default view of the mirror: the corner south-west of it (3.9). */
const MIRROR_CENTER: [number, number] = [17 * 16, 28 * 16 + 8];
/** Foot of the mirror post (world px). */
const MIRROR_POST: [number, number] = [17 * 16 + 8, 27 * 16 + 16];
/** Mirror scale: 1/2 (the reflection of Minato is ~8×12px, his smug face readable). */
const MIRROR_SCALE = 0.5;
/** Smoothed centre of what the mirror shows (follows the player when near). */
const viewC: [number, number] = [MIRROR_CENTER[0], MIRROR_CENTER[1]];
/** Close-up inset (UI layer) visibility 0..1. */
let insetA = 0;
let mirrorScreen: [number, number] | null = null;

/** The delayed reflection of the player (0.4s late until the fushigi is stamped). */
function playerSnap(): { img: HTMLCanvasElement; x: number; y: number } | null {
  const delay = fushigiDone('fushigi_01') ? 0 : 24;
  const snap = hist.length > delay ? hist[hist.length - 1 - delay] : hist[0];
  if (!snap) return null;
  let img = snap.img;
  // standing still: 0.4s later he looks smug in the mirror
  if (stillT > 400) {
    const spr = charSprite('minato');
    if (spr.extra?.smug || spr.extraDir?.smug) img = poseFrame(spr, 'smug', 'down');
  }
  return { img, x: snap.x, y: snap.y };
}

/**
 * Draw what the mirror sees inside a circle of radius r at screen (sx, sy):
 * the ground, props and people around `c` (world), mirrored left-right.
 */
function mirrorView(g: Gfx, f: FieldScene, sx: number, sy: number, r: number, scale: number, c: [number, number]): void {
  const ctx = g.ctx;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx + 0.5, sy + 0.5, r + 0.4, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = P.shadeDeep;
  ctx.fillRect(sx - r - 1, sy - r - 1, r * 2 + 3, r * 2 + 3);
  ctx.imageSmoothingEnabled = false;
  ctx.translate(sx + 0.5, sy + 0.5);
  ctx.scale(-scale, scale);
  const half = (r + 2) / scale;
  const [wx, wy] = c;
  const CH = 256;
  for (let ky = Math.floor((wy - half) / CH); ky <= Math.floor((wy + half) / CH); ky++)
    for (let kx = Math.floor((wx - half) / CH); kx <= Math.floor((wx + half) / CH); kx++) {
      if (kx < 0 || ky < 0 || kx * CH >= f.map.w * 16 || ky * CH >= f.map.h * 16) continue;
      ctx.drawImage(f.ground.chunk(kx, ky), Math.round(kx * CH - wx), Math.round(ky * CH - wy));
    }
  // props and people near the view, back to front
  const items: { foot: number; draw: () => void }[] = [];
  for (const p of f.props) {
    const a = p.art;
    if (!p.present || a.flat || (p.obj.t === 'prop' && p.obj.prop === 'prop_curve_mirror')) continue; // not the mirror itself
    if (p.x + a.ox + a.w < wx - half || p.x + a.ox > wx + half || p.y + a.oy > wy + half + 8 || p.y + a.foot < wy - half) continue;
    const img = a.img(f.propEnv(p));
    if (img) items.push({ foot: p.y + a.foot, draw: () => ctx.drawImage(img, Math.round(p.x + a.ox - wx), Math.round(p.y + a.oy - wy)) });
  }
  for (const a of f.actors) {
    if (!a.visible || a.kind === 'sym' || a.data.cart || Math.abs(a.x - wx) > half + 12 || Math.abs(a.y - wy) > half + 24) continue;
    const img = a.frame();
    items.push({ foot: a.y, draw: () => ctx.drawImage(img, Math.round(a.x + a.ox - wx - img.width / 2), Math.round(a.y + a.oy - wy - img.height)) });
  }
  const snap = playerSnap();
  if (snap) items.push({ foot: snap.y, draw: () => ctx.drawImage(snap.img, Math.round(snap.x - wx - snap.img.width / 2), Math.round(snap.y - wy - snap.img.height)) });
  items.sort((a, b) => a.foot - b.foot);
  for (const it of items) it.draw();
  ctx.restore();
  // convex-glass tint: sky colour at the top, darker at the rim
  const gr = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.4, r * 0.2, sx, sy, r + 1);
  gr.addColorStop(0, 'rgba(127,209,232,0.0)');
  gr.addColorStop(0.75, 'rgba(127,209,232,0.12)');
  gr.addColorStop(1, 'rgba(42,36,64,0.35)');
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx + 0.5, sy + 0.5, r + 0.4, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = gr;
  ctx.fillRect(sx - r - 1, sy - r - 1, r * 2 + 3, r * 2 + 3);
  ctx.restore();
}

setPropHook('mirror', (g, mx, my, env) => {
  const f = field();
  if (!f || f.map.id !== 'map_town') return;
  mirrorScreen = [mx, my];
  mirrorView(g, f, mx, my, 7, MIRROR_SCALE, viewC);
  // the 2s glint
  if (Math.floor(env.t / 2000) % 2 === 0 && env.t % 2000 < 120) g.rect(mx - 3, my - 4, 1, 1, P.glint);
});

function updateMirror(f: FieldScene, dt: number): void {
  const p = f.player;
  hist.push({ x: p.x, y: p.y, img: p.frame() });
  if (hist.length > 40) hist.shift();
  stillT = p.moving ? 0 : stillT + dt;
  const d = Math.hypot(p.x - MIRROR_POST[0], p.y - MIRROR_POST[1]) / 16;
  const tgt: [number, number] = d < 6 ? [p.x, p.y - 10] : MIRROR_CENTER;
  const k = Math.min(1, dt / 120);
  viewC[0] += (tgt[0] - viewC[0]) * k;
  viewC[1] += (tgt[1] - viewC[1]) * k;
  // close-up when examining it, or standing still within 2 tiles (0.2s pop)
  const show = d <= 2.5 && (stillT > 300 || game.scripts.busy);
  insetA = Math.max(0, Math.min(1, insetA + (show ? 1 : -1) * (dt / 200)));
}

function drawMirrorInset(f: FieldScene, g: Gfx): void {
  if (insetA <= 0 || !mirrorScreen) return;
  const e = 1 - (1 - insetA) * (1 - insetA);
  const R = Math.round(22 * (0.6 + 0.4 * e));
  const [mx, my] = mirrorScreen;
  const sx = Math.max(R + 6, Math.min(W - R - 6, mx + 40));
  const sy = Math.max(R + 6, Math.min(H - R - 6, my - 18));
  const ctx = g.ctx;
  ctx.save();
  ctx.globalAlpha = insetA;
  // a thin stem back to the real mirror
  g.line(mx + 6, my, sx - R, sy + 4, P.sunDeep);
  // rim: ink outline, orange ring, lit arc
  g.circle(sx, sy, R + 3, P.ink);
  g.circle(sx, sy, R + 2, P.sunDeep);
  g.circle(sx, sy, R + 1, P.sun);
  const p = f.player;
  mirrorView(g, f, sx, sy, R, 1, [p.x, p.y - 12]);
  ctx.globalAlpha = insetA;
  g.rect(sx - R + 5, sy - R + 6, 4, 1, P.glint);
  g.rect(sx - R + 4, sy - R + 7, 1, 3, P.glint);
  ctx.restore();
}

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
    // mirror history (player frames), view centre and close-up
    if (f.map.id === 'map_town') updateMirror(f, dt);
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
    if (layer === 'top') drawMirrorInset(f, g);
    if (layer === 'ground') mirrorScreen = null;
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
      const sx = Math.round(x - cx - img.width / 2);
      const sy = Math.round(y) - cy - img.height + 1 - hop;
      g.img(img, sx, sy);
      if (singing) {
        // the singing bird hops with a white 1px twinkle (so the eye finds the staff)
        const k = Math.floor(hopClock / 70) % 3;
        g.rect(sx + 3 + (k === 1 ? 1 : 0), sy - 2 - k, 1, 1, P.glint);
        if (k === 2) g.rect(sx + 6, sy - 1, 1, 1, P.white);
      }
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
  // half-size kana (bold) + a hand-set ！ (the scaled font lost its dot)
  const tw = fontSmallWidth('まいど') + 4;
  const w = tw + 7;
  const p = new PixelCanvas(w, 17);
  p.rect(1, 1, w - 2, 11, P.white);
  p.hline(2, w - 3, 1, P.glint);
  p.strokeRect(0, 0, w, 13, P.ink);
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, 12], [w - 1, 12]]) p.set(x, y, 'transparent');
  p.hline(2, w - 3, 11, P.concreteLt);
  // tail
  const tx = Math.floor(w / 2) - 1;
  p.set(tx - 1, 13, P.ink);
  p.hline(tx, tx + 1, 13, P.white);
  p.set(tx + 2, 13, P.ink);
  p.set(tx, 14, P.ink);
  p.set(tx + 1, 14, P.ink);
  p.hline(tx, tx + 1, 12, P.white);
  fontTextSmall(p, 'まいど', 3, 2, P.verm, 1);
  handGlyph(p, 'excl', 3 + tw - 2, 3, P.verm);
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

const train = { active: false, t: 0, y0: 0, v: 0 };
/**
 * Train geometry (review round 2): 4 unlit commuter cars on the x60 track,
 * the body 28px wide — 5–6px over the rails on each side (rails 15px apart)
 * — and 112px long per car.
 */
const TRAIN_W = 28;
const CAR_L = 112;
const GAP = 5;
const NOSE = 10;
const TRAIN_L = NOSE + 4 * CAR_L + 3 * GAP;
const TRAIN_MS = 2800;

let TRAIN_IMG: HTMLCanvasElement[] | null = null;
/** The whole train seen from above, lead car (southbound) at the bottom; 2 frames of the sign's backlight. */
function trainImages(): HTMLCanvasElement[] {
  if (TRAIN_IMG) return TRAIN_IMG;
  const mk = (frame: number): HTMLCanvasElement => {
    const w = TRAIN_W + 2;
    const h = TRAIN_L + 2;
    const p = new PixelCanvas(w, h);
    const x0 = 1;
    const R0 = x0 + 5; // roof edges
    const R1 = x0 + TRAIN_W - 6;
    const mid = x0 + Math.floor(TRAIN_W / 2);
    for (let c = 0; c < 4; c++) {
      // car c = 0 is the last (north) car; the lead car is c = 3
      const y0 = 1 + c * (CAR_L + GAP);
      const y1 = y0 + CAR_L - 1;
      // body sides: the upper walls show as a strip with the window band
      p.rect(x0, y0, TRAIN_W, CAR_L, P.steel);
      p.vline(x0, y0, y1, P.concrete);
      p.vline(x0 + TRAIN_W - 1, y0, y1, P.asphalt);
      // three door pairs per side, windows between them (dark, unlit)
      const doors = [0.17, 0.5, 0.83].map((f) => y0 + Math.round(CAR_L * f));
      for (const side of [x0 + 1, x0 + TRAIN_W - 4]) {
        for (let wy = y0 + 4; wy < y1 - 4; wy += 1) {
          const nearDoor = doors.some((d) => Math.abs(wy - d) <= 5);
          if (nearDoor) continue;
          const seg = (wy - y0) % 9;
          if (seg < 7) p.hline(side, side + 2, wy, seg === 0 ? P.shade : P.night);
        }
        for (const d of doors) {
          p.rect(side, d - 4, 3, 9, P.asphalt);
          p.hline(side, side + 2, d, P.charcoal);
          p.set(side + (side === x0 + 1 ? 0 : 2), d - 3, P.concrete);
        }
      }
      // roof: pale, gutters each side, seams every 8px, a centre walkway line
      p.rect(R0, y0 + 1, R1 - R0 + 1, CAR_L - 2, P.concrete);
      p.vline(R0, y0 + 1, y1 - 1, P.concreteLt);
      p.vline(R1, y0 + 1, y1 - 1, P.steel);
      p.vline(R0 - 1, y0, y1, P.charcoal);
      p.vline(R1 + 1, y0, y1, P.charcoal);
      for (let yy = y0 + 4; yy < y1 - 1; yy += 8) p.hline(R0 + 1, R1 - 1, yy, P.concreteLt);
      p.vline(mid, y0 + 2, y1 - 2, P.concreteLt);
      // roof units: an air conditioner on every car, a pantograph on cars 1 and 3
      const acs = c % 2 ? [y0 + 74] : [y0 + 22, y0 + 74];
      for (const ac of acs) {
        p.rect(R0 + 3, ac, R1 - R0 - 5, 14, P.concreteLt);
        p.strokeRect(R0 + 3, ac, R1 - R0 - 5, 14, P.steel);
        p.hline(R0 + 4, R1 - 3, ac + 1, P.white);
        for (let k = 0; k < 4; k++) p.hline(R0 + 5, R1 - 4, ac + 4 + k * 2, P.steel);
        p.hline(R0 + 3, R1 - 2, ac + 14, P.asphalt);
      }
      if (c % 2) {
        const py = y0 + 22;
        p.rect(mid - 6, py, 12, 2, P.charcoal); // base frame
        p.rect(mid - 6, py + 16, 12, 2, P.charcoal);
        p.line(mid - 5, py + 2, mid, py + 8, P.asphalt);
        p.line(mid + 5, py + 2, mid, py + 8, P.asphalt);
        p.line(mid - 5, py + 15, mid, py + 9, P.asphalt);
        p.line(mid + 5, py + 15, mid, py + 9, P.asphalt);
        p.hline(mid - 9, mid + 9, py + 8, P.steel); // the shoe
        p.hline(mid - 9, mid + 9, py + 9, P.charcoal);
        // insulators
        p.set(mid - 6, py - 1, P.white);
        p.set(mid + 5, py - 1, P.white);
      }
      // coupling bellows to the next car
      if (c < 3) {
        p.rect(x0 + 7, y1 + 1, TRAIN_W - 14, GAP, P.charcoal);
        for (let k = 0; k < GAP; k += 2) p.hline(x0 + 7, x0 + TRAIN_W - 8, y1 + 1 + k, P.ink);
      }
      // car ends: a darker line
      p.hline(x0, x0 + TRAIN_W - 1, y0, P.asphalt);
      p.hline(x0, x0 + TRAIN_W - 1, y1, P.charcoal);
    }
    // the lead car's front face (south end, facing the viewer)
    const fy = 1 + 4 * CAR_L + 3 * GAP;
    const fx = 1;
    p.rect(fx, fy, TRAIN_W, NOSE, P.asphalt);
    p.hline(fx, fx + TRAIN_W - 1, fy, P.steel);
    // windscreen (two dark panes), unlit headlights, the coupler
    p.rect(fx + 2, fy + 2, 10, 5, P.night);
    p.rect(fx + TRAIN_W - 12, fy + 2, 10, 5, P.night);
    p.set(fx + 3, fy + 3, P.shade);
    p.set(fx + TRAIN_W - 11, fy + 3, P.shade);
    p.rect(fx + 2, fy + 8, 2, 1, P.charcoal);
    p.rect(fx + TRAIN_W - 4, fy + 8, 2, 1, P.charcoal);
    p.rect(mid - 2, fy + NOSE - 2, 4, 2, P.ink);
    // outline
    p.strokeRect(0, 0, w, h, P.ink);
    // destination sign 「星見台」 over the windscreen — hand-set glyphs, the backlight flickers (2 frames)
    const sw = 24;
    const sx = fx + Math.floor((TRAIN_W - sw) / 2);
    const sy = fy - 10;
    p.rect(sx - 1, sy - 1, sw + 2, 11, P.ink);
    p.rect(sx, sy, sw, 9, frame ? P.nightShade : P.night);
    handText(p, '星見台', sx + 1, sy + 1, frame ? P.glint : P.horizon, { spacing: 1 });
    return p.toCanvas();
  };
  TRAIN_IMG = [mk(0), mk(1)];
  return TRAIN_IMG;
}

function drawTrain(g: Gfx, cx: number, cy: number): void {
  const imgs = trainImages();
  const img = imgs[Math.floor(train.t / 90) % 2];
  // head at y0 + v·t, travelling south along x = 60 (the ballast bed x 59–61)
  const headY = train.y0 + train.v * train.t;
  const x = 60 * 16 + 8 - Math.ceil(img.width / 2) - cx;
  const y = Math.round(headY - img.height - cy);
  // a soft shadow on the ballast (east side) and the train
  g.rect(x + img.width, y + 4, 4, img.height - 8, P.night, 0.35);
  g.img(img, x, y);
}

/** Run the unlit night train across the crossing (ending cut 6): on screen 2.8s. */
export function* trainPass(): Co {
  const f = field();
  if (!f) return;
  snd.se('se_train_pass');
  train.active = true;
  // enter just above the screen, leave once the last car has passed the bottom edge
  train.y0 = f.camY - 8;
  train.v = (H + 16 + TRAIN_L) / TRAIN_MS;
  const t0 = f.t;
  train.t = 0;
  while (train.t < TRAIN_MS) {
    yield null;
    train.t = f.t - t0;
  }
  train.active = false;
}

registerDebug('train', () => {
  const f = field();
  if (!f) return 'no field';
  f.startScript(trainPass());
  return 'train';
});

export { hist as mirrorHistory };
