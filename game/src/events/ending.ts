// ★ evt_ending (10_narrative 5.20, 00_concept 13, 40_audio 13.5): about a
// minute. The chime rings all eight notes → 肉のマルヤマ → the family photo →
// home → the weather on TV → the crossing at night, 「……おいしい。」 → the
// night sky → the notebook → the title.

import type { Co } from '../engine/co';
import { all } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { PixelCanvas } from '../engine/pixel';
import { W, H } from '../engine/screen';
import { animate, ease } from '../engine/tween';
import { hash2 } from '../engine/rng';
import { drawText } from '../engine/font';
import { flag, setFlag, state } from '../game/state';
import { playBgm, playChimeMotif, setSpace, sfx, stopAllAmbient, stopAmbient, stopBgm, playAmbient } from '../audio';
import { actor, face, msg, place, registerScript, setClock, setClockText, setFollowerVisible, spawn, trainPass } from '../world/api';
import type { Actor } from '../world/actor';
import type { FieldScene } from '../world/field';
import { playEndingNotebook, playNightSkyCut } from '../ui/api';
import { ditherIn, ditherOut } from '../ui/transition';
import { uiHud } from '../ui/hud';
import { registerWorldFx } from '../world/fx';
import { CHUNK } from '../world/ground_cache';
import * as T from '../data/text/events';
import { F, holdBgm, holdCamera, releaseCamera, tileRoute, walkTo } from './lib';
import { bellGlow, ring, sparkle, voiceLine } from './fx';
import { BASKET_RIM, dinnerSet, fryBasket, paperBag, photoClose } from './art';
import { cinema, cinemaOff, forceBoxPos, quietItem, zoomIn, zoomOut, zoomPan, zoomScale, type ZoomView } from './stage';

// ---------------------------------------------------------------- helpers

/** Load a map for a cut (no door, no enter scripts), the player at (x, y). */
function cutTo(map: string, x: number, y: number, dir: 'up' | 'down' | 'left' | 'right'): void {
  const f = F();
  f.loadMap(map, x, y, dir);
  f.syncFollower(true);
  // no item cards carried over from the previous cut
  uiHud.clearNotes();
}

function* fadeTo(ms: number, color = '#0B0B14'): Co {
  yield* game.fadeOut(ms, color);
}

/**
 * The HUD draws its hanko plate whenever the case is owned and the HUD is
 * up; cut 1 wants the clock plate alone. (The HUD has no separate switch for
 * the hanko: the case's flag is lifted for the length of the shot.)
 */
let hankoFlag = 0;
function hudHankoHidden(on: boolean): void {
  if (on) {
    if (!hankoFlag) hankoFlag = flag('flag_got_hanko') || 0;
    setFlag('flag_got_hanko', 0);
  } else if (hankoFlag) {
    setFlag('flag_got_hanko', hankoFlag);
    hankoFlag = 0;
  }
}

/**
 * A pause between the ending's shots. Pressing Z (or holding it) hurries
 * it along — three times as fast for a moment — so a player who has seen
 * the ending can move through it; the chime, the dialogs and the first
 * voice keep their own time.
 */
function* beat(ms: number): Co {
  let left = ms;
  let hurryUntil = 0;
  let last = game.time;
  while (left > 0) {
    yield null;
    const dt = game.time - last;
    last = game.time;
    if (game.input.pressed('confirm') || game.input.down('confirm')) hurryUntil = game.time + 350;
    left -= dt * (game.time < hurryUntil ? 3 : 1);
  }
}

// ---------------------------------------------------------------- cut 3: the photograph, close up (96×72 at 1×)

class PhotoCloseup implements Widget {
  modal = false;
  done = false;
  t = 0;
  k = 0;
  private frame: HTMLCanvasElement;
  constructor() {
    // a wooden frame with a brass edge around the 96×72 print, and the little tag
    const p = new PixelCanvas(110, 86);
    p.rect(0, 0, 110, 86, '#8A5A3A');
    p.strokeRect(0, 0, 110, 86, '#5A3A22');
    p.hline(1, 108, 1, '#C08A38');
    p.vline(1, 1, 84, '#C08A38');
    p.strokeRect(5, 5, 100, 76, '#D9A441');
    p.hline(6, 104, 5, '#F6D98A');
    for (let x = 2; x < 108; x += 3) if (hash2(x, 0, 7) < 0.5) p.set(x, 3, '#6A4A2A');
    p.rect(7, 7, 96, 72, 'transparent');
    this.frame = p.toCanvas();
    this.plate = studioPlate();
  }
  private plate: HTMLCanvasElement;
  update(dt: number): void {
    this.t += dt;
  }
  draw(g: Gfx): void {
    if (this.k <= 0) return;
    const k = this.k;
    g.rect(0, 0, W, H, '#0B0B14', 0.45 * k);
    const x = Math.round(W / 2 - 55);
    const y = 14 + Math.round((1 - ease.cubicOut(k)) * 6);
    g.alpha(k, () => {
      g.rect(x + 3, y + 3, 110, 86, '#0B0B14', 0.5);
      g.img(photoClose(), x + 7, y + 7);
      g.img(this.frame, x, y);
      // the studio's brass plate under the frame
      g.img(this.plate, x + Math.round((110 - this.plate.width) / 2), y + 88);
      // a glint running across the glass
      const gl = ((this.t / 1800) % 1) * 140 - 20;
      g.clip(x + 7, y + 7, 96, 72, () => {
        for (let i = 0; i < 3; i++) g.alpha(0.25, () => g.line(Math.round(x + gl + i), y + 7, Math.round(x + gl + i - 30), y + 79, '#FFF6D8'));
      });
    });
  }
}

/** A small engraved brass plate: 「夕鳴写真館」 (the studio's own name, as on its enamel sign). */
function studioPlate(): HTMLCanvasElement {
  const text = '夕鳴写真館';
  const tw = [...text].length * 16;
  const w = tw + 14;
  const h = 20;
  const p = new PixelCanvas(w, h);
  p.rect(0, 0, w, h, '#A8742A');
  p.rect(1, 1, w - 2, h - 2, '#D9A441');
  p.hline(1, w - 2, 1, '#F6D98A');
  p.vline(1, 1, h - 2, '#F0C860');
  p.hline(1, w - 2, h - 2, '#A8742A');
  // brushed brass: a few faint streaks
  for (let x = 3; x < w - 3; x++) if (hash2(x, 2, 17) < 0.18) p.set(x, 3 + Math.floor(hash2(x, 3, 17) * (h - 6)), '#E8B850');
  // two screws
  for (const sx of [3, w - 4]) {
    p.set(sx, 9, '#6A4A2A');
    p.set(sx, 10, '#8A5A3A');
  }
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) p.set(x, y, 'transparent');
  const c = p.toCanvas();
  const ctx = c.getContext('2d')!;
  // engraved: a light edge under dark letters
  drawText(ctx, text, 7 + 1, 2 + 1, { color: '#F6D98A' });
  drawText(ctx, text, 7, 2, { color: '#4A2E14' });
  return c;
}

// ---------------------------------------------------------------- cut 5: the weather forecast

class TvCloseup implements Widget {
  modal = false;
  done = false;
  t = 0;
  k = 0;
  private screen: HTMLCanvasElement;
  constructor() {
    this.screen = buildWeather();
  }
  update(dt: number): void {
    this.t += dt;
  }
  draw(g: Gfx): void {
    if (this.k <= 0) return;
    const k = this.k;
    const x = Math.round(W / 2 - 96);
    const y = 8 + Math.round((1 - ease.cubicOut(k)) * 6);
    g.alpha(k, () => {
      // the set: a dark bezel, the speaker grille, the station's little logo
      g.rect(x + 3, y + 3, 192, 124, '#0B0B14', 0.5);
      g.rect(x, y, 192, 124, '#2A2440');
      g.rect(x + 1, y + 1, 190, 1, '#4A3A6E');
      g.rect(x + 6, y + 6, 180, 104, '#1B1733');
      g.img(this.screen, x + 8, y + 8);
      // scanline shimmer
      const sy = Math.floor((this.t / 14) % 100);
      g.rect(x + 8, y + 8 + sy, 176, 1, '#FFFFFF', 0.07);
      for (let i = 0; i < 12; i++) g.rect(x + 150 + i * 3, y + 115, 2, 4, '#3A2B5C');
      g.rect(x + 12, y + 115, 3, 3, (Math.floor(this.t / 700) % 2 ? '#E23B2E' : '#8E1F2A'));
      // the forecast's icons move a little: the sun breathes, the star twinkles
      const pulse = Math.floor(this.t / 400) % 2;
      g.rect(x + 8 + 47, y + 8 + 36 - pulse, 1, 1, '#FFF6D8');
      if (Math.floor(this.t / 300) % 3 === 0) g.rect(x + 8 + 146, y + 8 + 30, 1, 1, '#FFFFFF');
    });
  }
}

/** 176×100: 「あすの てんき」 — 夕鳴町 晴れ（ところにより 夕方）, 星見台 夜. */
function buildWeather(): HTMLCanvasElement {
  const p = new PixelCanvas(176, 100);
  // sea
  for (let y = 0; y < 100; y++)
    for (let x = 0; x < 176; x++) p.set(x, y, (x + y) % 2 === 0 && hash2(x >> 2, y >> 2, 3) < 0.4 ? '#5CE1FF' : '#4AA8E0');
  // land: a long coast running west–east
  for (let x = 0; x < 176; x++) {
    const top = 34 + Math.round(Math.sin(x / 19) * 5 + Math.sin(x / 7) * 2);
    const bot = 82 + Math.round(Math.sin(x / 23 + 1) * 6);
    for (let y = top; y < bot; y++) p.set(x, y, y === top ? '#9BCB6B' : hash2(x, y, 5) < 0.08 ? '#3FA66B' : '#5FA85A');
    p.set(x, bot, '#2E6B4A');
  }
  // 星見台 (east): still night — a dark patch with stars
  for (let y = 30; y < 90; y++)
    for (let x = 126; x < 176; x++) {
      const d = Math.hypot((x - 154) / 30, (y - 58) / 30);
      if (d < 1 && p.get(x, y) >>> 24) {
        const land = hash2(x, y, 9) < 0.5;
        if (d < 0.8 || hash2(x, y, 11) < 1 - (d - 0.8) * 5) p.set(x, y, land ? '#2A2440' : '#3A2B5C');
      }
    }
  for (const [sx, sy] of [[138, 44], [160, 50], [150, 70], [168, 40], [132, 62]]) p.set(sx, sy, '#FFF6D8');
  // the title band
  p.rect(0, 0, 176, 17, '#2F4A8A');
  p.hline(0, 175, 17, '#FFD23F');
  // 夕鳴町: the sun, and next to it a little sunset (ところにより 夕方)
  const sun = (cx: number, cy: number) => {
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      p.set(Math.round(cx + Math.cos(ang) * 8), Math.round(cy + Math.sin(ang) * 8), '#FFD23F');
      p.set(Math.round(cx + Math.cos(ang) * 9), Math.round(cy + Math.sin(ang) * 9), '#FFD23F');
    }
    p.ellipse(cx, cy, 5.5, 5.5, '#F2894B');
    p.ellipse(cx - 1, cy - 1, 3.5, 3.5, '#FFD23F');
    p.set(cx - 2, cy - 3, '#FFF6D8');
  };
  sun(46, 44);
  // the sunset: half a red sun on a line, orange sky above
  p.rect(62, 44, 20, 1, '#B04A7A');
  for (let y = 0; y < 6; y++) for (let x = -7; x <= 7; x++) if (x * x + y * y * 3 < 49) p.set(72 + x, 43 - y, y < 2 ? '#E8603C' : '#F2894B');
  p.hline(62, 81, 45, '#F7C27A');
  // a dot for the town
  p.rect(45, 58, 3, 3, '#E23B2E');
  p.set(45, 58, '#FF6A4D');
  // 星見台: a crescent moon
  p.ellipse(152, 40, 6, 6, '#FFF6D8');
  p.ellipse(155, 38, 5, 5, '#2A2440');
  p.rect(153, 58, 3, 3, '#FFD23F');
  p.outline('#1B1733');
  const c = p.toCanvas();
  const ctx = c.getContext('2d')!;
  // labels in the game font (white with a dark edge)
  const lbl = (s: string, x: number, y: number, col = '#FFFFFF') => {
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (ox || oy) drawTxt(ctx, s, x + ox, y + oy, '#1B1733');
    drawTxt(ctx, s, x, y, col);
  };
  lbl('あすの てんき', 5, 1, '#FFFFFF');
  lbl('夕鳴町', 22, 64);
  lbl('星見台', 128, 64, '#FFE7A3');
  lbl('晴れ', 30, 80, '#FFD23F');
  return c;
}

function drawTxt(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string): void {
  drawText(ctx, s, x, y, { color });
}

// ---------------------------------------------------------------- cut 5: dinner on the chabudai

/**
 * The dinner goes on the chabudai's top. It is an actor sorted one pixel in
 * front of the table (its foot is read from the table prop, so the table can
 * never be drawn over it), drawn up on the table's top.
 */
function spawnDinner(): void {
  const f = F();
  const tbl = f.props.find((p) => (p.obj as { id?: string }).id === 'obj_chabudai' || (p.obj as { prop?: string }).prop === 'obj_chabudai');
  // the chabudai art: 34×22, the round top centred at (17, 10)
  const topX = tbl ? tbl.x + tbl.art.ox + 17 : 160;
  const topY = tbl ? tbl.y + tbl.art.oy + 10 : 72;
  const foot = tbl ? tbl.y + tbl.art.foot : 83;
  const a = spawn('ending_dinner', 9, 4, { sprite: 'kanenari', ghost: true });
  a.x = topX;
  a.y = foot + 1;
  a.shadowH = 0;
  a.data.scripted = true;
  const img = dinnerSet();
  a.drawFn = (g, x, y) => {
    const cy = y - (a.y - topY);
    const left = x - 13;
    const top = cy - 9;
    g.img(img, left, top);
    // steam off the croquettes
    const t = F().t;
    for (let i = 0; i < 3; i++) {
      const k = (t / 900 + i / 3) % 1;
      const sx = left + 6 + i * 3 + Math.round(Math.sin(t / 300 + i) * 1);
      g.alpha(0.55 * (1 - k), () => g.rect(sx, Math.round(top + 4 - k * 10), 1, 2, '#FFF6D8'));
    }
  };
}

// ---------------------------------------------------------------- cut 2: the fryer, the bag

/**
 * 肉のマルヤマ at 17:01: the oil boiling round a basket of croquettes, the
 * basket lifted out and hung to drain (drips, a burst of steam, a warm
 * bloom), 丸山 rim-lit by the bulb over the fryer, and the bag of
 * croquettes lifted from behind the showcase onto the counter.
 */
interface Bubble {
  x: number;
  y: number;
  t: number;
  life: number;
}
interface Puff {
  x: number;
  y: number;
  t: number;
  life: number;
  drift: number;
  big: boolean;
}
interface Drip {
  x: number;
  y: number;
  vy: number;
}
const fry = {
  on: false,
  t: 0,
  /** Frying hard (1) → settled (0): bubble and steam rates. */
  heat: 1,
  /** How far the basket is out of the oil (px, 0 = in). */
  lift: 0,
  /** 丸山 has hold of the handle. */
  handle: true,
  /** The bloom when the basket comes out (ms left). */
  bloom: 0,
  bubbles: [] as Bubble[],
  puffs: [] as Puff[],
  drips: [] as Drip[],
  dripT: 0,
  bag: null as null | { t: number; from: [number, number]; to: [number, number] },
};

/** The fryer's oil well (world px): [left, top, right, bottom], read from the prop. */
function fryerWell(f: FieldScene): [number, number, number, number] {
  const pr = f.props.find((p) => (p.obj as { prop?: string }).prop === 'in_mr_fryer');
  // in_mr_fryer: 32×24, the oil well at x 3–28, y 6–10 (the first row is its back rim)
  const x0 = pr ? pr.x + pr.art.ox : 32;
  const y0 = pr ? pr.y + pr.art.oy : 24;
  return [x0 + 3, y0 + 7, x0 + 28, y0 + 10];
}

/** The oil well's centre (world px). */
function fryerOil(f: FieldScene): [number, number] {
  const [l, t, r, b] = fryerWell(f);
  return [Math.round((l + r) / 2), Math.round((t + b) / 2)];
}

/** The basket's top-left (world px) at the current lift: in the left half of the well, its rim low in the oil. */
function basketAt(f: FieldScene): [number, number] {
  const [l, , , b] = fryerWell(f);
  return [l + 3, b - 1 - BASKET_RIM - Math.round(fry.lift)];
}

/** Top of the showcase (world px): what stands behind it is hidden below this line. */
function caseTop(f: FieldScene): number {
  const pr = f.props.find((p) => (p.obj as { prop?: string }).prop === 'in_mr_showcase');
  return pr ? pr.y + pr.art.oy : 52;
}

/** The ledge between the showcase's glass and its front panel: where the bag is put down. */
function counterLedge(f: FieldScene): number {
  return caseTop(f) + 15;
}

function fryReset(): void {
  fry.on = false;
  fry.bag = null;
  fry.bubbles.length = 0;
  fry.puffs.length = 0;
  fry.drips.length = 0;
}

registerWorldFx({
  map: 'map_maruyama',
  update(f, dt) {
    if (fry.on && !game.scripts.busy) fryReset();
    if (!fry.on) return;
    fry.t += dt;
    if (fry.bag) fry.bag.t += dt;
    fry.bloom = Math.max(0, fry.bloom - dt);
    const [l, t, r, b] = fryerWell(f);
    // the oil: bubbles all over while it fries, a few once the basket is out
    const rate = 4 + 30 * fry.heat;
    let n = Math.floor((fry.t * rate) / 1000) - Math.floor(((fry.t - dt) * rate) / 1000);
    while (n-- > 0) {
      const k = Math.random();
      fry.bubbles.push({ x: l + 1 + Math.floor(k * (r - l - 1)), y: t + Math.floor(Math.random() * (b - t + 1)), t: 0, life: 260 + Math.random() * 300 });
    }
    for (const bb of fry.bubbles) bb.t += dt;
    fry.bubbles = fry.bubbles.filter((bb) => bb.t < bb.life);
    // steam: off the oil while it fries; off the croquettes once they are out
    const [bx, by] = basketAt(f);
    const out = fry.lift > 4;
    const srate = out ? 5 + 9 * fry.heat : 3 + 7 * fry.heat;
    let m = Math.floor((fry.t * srate) / 1000) - Math.floor(((fry.t - dt) * srate) / 1000);
    while (m-- > 0) {
      const sx = out ? bx + 2 + Math.random() * 14 : l + 2 + Math.random() * (r - l - 4);
      const sy = out ? by + 1 : t;
      fry.puffs.push({ x: sx, y: sy, t: 0, life: 1300 + Math.random() * 900, drift: Math.random() * 2 - 1, big: false });
    }
    for (const pf of fry.puffs) pf.t += dt;
    fry.puffs = fry.puffs.filter((pf) => pf.t < pf.life);
    // drips off the lifted basket, back into the oil (each one a little splash)
    if (out) {
      fry.dripT -= dt;
      if (fry.dripT <= 0) {
        fry.drips.push({ x: bx + 2 + Math.floor(Math.random() * 14), y: by + 9, vy: 0.02 });
        fry.dripT = 90 + (1 - fry.heat) * 520 + Math.random() * 160;
      }
    }
    for (const d of fry.drips) {
      d.vy += 0.0009 * dt;
      d.y += d.vy * dt;
      if (d.y >= t + 1) {
        d.y = 1e9;
        fry.bubbles.push({ x: Math.round(d.x), y: t + 1, t: 120, life: 380 });
      }
    }
    fry.drips = fry.drips.filter((d) => d.y < 1e8);
  },
  draw(f, g, cx, cy, layer) {
    if (!fry.on) return;
    const [l, t, r] = fryerWell(f);
    if (layer === 'sorted') {
      // the bag, lifted from behind the showcase and put on the counter
      const bag = fry.bag;
      if (bag) {
        const img = paperBag();
        const T_RISE = 260;
        const T_ARC = 380;
        const [fx0, fy0] = bag.from;
        const [tx, ty] = bag.to;
        let x: number;
        let y: number;
        let behind = false;
        if (bag.t < T_RISE) {
          const k = ease.cubicOut(bag.t / T_RISE);
          x = fx0;
          y = fy0 + (1 - k) * (img.height + 4);
          behind = true;
        } else {
          const k = Math.min(1, (bag.t - T_RISE) / T_ARC);
          const e = ease.sineInOut(k);
          x = fx0 + (tx - fx0) * e;
          y = fy0 + (ty - fy0) * e - Math.sin(Math.PI * k) * 7;
          behind = k < 0.2;
        }
        // a little squash as it lands
        const land = bag.t - T_RISE - T_ARC;
        const sq = land > 0 && land < 120 ? 1 : 0;
        const ix = Math.round(x - img.width / 2 - cx);
        const iy = Math.round(y - img.height - cy) + sq;
        const draw = () => {
          if (land > 0) g.alpha(0.45, () => g.rect(ix + 1, iy + img.height - 1 - sq, img.width - 1, 2, '#1B1733'));
          g.img(img, ix, iy);
        };
        if (behind) g.clip(0, 0, W, caseTop(f) - cy, draw);
        else draw();
      }
    } else if (layer === 'glow') {
      // (the glow layer comes after the room's night grading: what the bulb
      // over the fryer lights — the oil, the croquettes, the steam — keeps
      // its warmth instead of sinking into the dark)
      // the basket: in the oil only its rim and the croquettes' tops show
      // through the surface; lifted, it comes up whole. Below the well's
      // front edge it is hidden.
      const [, , , wb] = fryerWell(f);
      const img = fryBasket();
      const [bx, by] = basketAt(f);
      const sub = Math.min(1, fry.lift / 5);
      g.clip(l - 1 - cx, 0, r - l + 3, wb + 1 - cy, () => g.img(img, bx - cx, by - cy, { alpha: 0.62 + 0.38 * sub }));
      const m = actor('npc_maruyama');
      if (fry.handle && m) {
        // the handle, down to 丸山's hands (it goes behind his head)
        const hx = bx + 12;
        const top = by + BASKET_RIM;
        const end = Math.max(top + 2, Math.min(m.y - 22, top + 14));
        g.rect(hx - cx, top - cy, 1, end - top, '#4A4F63');
        g.rect(hx + 1 - cx, top - cy, 1, end - top, '#9AA0A8');
      } else if (fry.lift > 4) {
        // hung on the rail at the back to drain: two short hooks
        for (const hx of [bx + 2, bx + 15]) g.rect(hx - cx, by - 3 - cy, 1, 3 + BASKET_RIM, '#6B7186');
      }
      // the oil boiling: bubbles swell, catch the light, pop
      for (const bb of fry.bubbles) {
        const k = bb.t / bb.life;
        const x = Math.round(bb.x - cx);
        const y = Math.round(bb.y - cy);
        if (k < 0.4) g.alpha(0.8, () => g.rect(x, y, 1, 1, '#F6D98A'));
        else if (k < 0.85) {
          g.rect(x, y, 2, 1, '#FFF6D8');
          g.alpha(0.7, () => g.rect(x, y + 1, 2, 1, '#A8742A'));
        } else g.rect(x + (bb.x & 1), y - 1, 1, 1, '#FFFFFF');
      }
      for (const d of fry.drips) {
        // a drop of oil: a bright head, a golden tail
        g.rect(Math.round(d.x - cx), Math.round(d.y - cy) + 1, 1, 1, '#FFE7A3');
        g.alpha(0.8, () => g.rect(Math.round(d.x - cx), Math.round(d.y - cy), 1, 1, '#D9A441'));
      }
      // steam, lit by the bulb: soft puffs rising, swelling and curling
      for (const pf of fry.puffs) {
        const k = pf.t / pf.life;
        const x = Math.round(pf.x + pf.drift * k * 6 + Math.sin(pf.t / 380 + pf.x) * (1 + k * 2) - cx);
        const y = Math.round(pf.y - 2 - k * (pf.big ? 32 : 28) - cy);
        const a = Math.sin(Math.PI * Math.min(1, k * 1.3)) * (pf.big ? 0.7 : 0.55);
        const s = k < 0.25 ? 1 : k < 0.6 ? 2 : 3;
        g.alpha(a, () => {
          g.rect(x, y, s, s, '#FFF6D8');
          if (s > 1) g.rect(x - 1, y + 1, 1, s - 1, '#E8D9B5');
        });
      }
      // the bloom off the golden croquettes as they come out
      if (fry.bloom > 0) {
        const [bx, by] = basketAt(f);
        const a = Math.sin((Math.PI * fry.bloom) / 600);
        const ctx = g.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const [rr, al, col] of [[10, 0.1, '#D9A441'], [7, 0.14, '#FFD23F'], [4, 0.2, '#FFE7A3']] as const) {
          ctx.globalAlpha = al * a;
          g.circle(Math.round(bx + 9 - cx), Math.round(by + 2 - cy), rr, col);
        }
        ctx.restore();
      }
      // 丸山 in the bulb's light: a warm rim along his top edges
      if (m && m.visible) {
        const img = m.frame();
        const [ix, iy] = m.drawPos(img);
        const bulb = bulbPos(f);
        const side = bulb ? Math.sign(Math.round(bulb[0] - m.x) / 6) : 0;
        const rim = rimOf(img, side);
        g.clip(0, 0, W, caseTop(f) - cy, () => g.alpha(0.7, () => g.img(rim, ix - cx, iy - cy)));
      }
    }
  },
});

/** The bulb hanging nearest the fryer (world px of its glass), if any. */
function bulbPos(f: FieldScene): [number, number] | null {
  const [ox] = fryerOil(f);
  let best: [number, number] | null = null;
  for (const p of f.props) {
    if ((p.obj as { prop?: string }).prop !== 'in_mr_bulb') continue;
    const x = p.x + p.art.ox + 3;
    const y = p.y + p.art.oy + 26;
    if (!best || Math.abs(x - ox) < Math.abs(best[0] - ox)) best = [x, y];
  }
  return best;
}

const RIMS = new WeakMap<HTMLCanvasElement, Map<number, HTMLCanvasElement>>();
/**
 * The pixels of a sprite frame that face a light above it (and to one
 * side, -1 left / 1 right / 0 straight above), in a warm bulb colour:
 * every opaque pixel with an empty pixel above it (or beside it, light-side).
 */
function rimOf(img: HTMLCanvasElement, side: number): HTMLCanvasElement {
  let per = RIMS.get(img);
  if (!per) RIMS.set(img, (per = new Map()));
  const hit = per.get(side);
  if (hit) return hit;
  const w = img.width;
  const h = img.height;
  const src = img.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 40;
  const p = new PixelCanvas(w, h);
  // the crown: the topmost pixel of each column (a second, softer one under it)
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      if (!on(x, y)) continue;
      p.set(x, y, '#FFE7A3');
      if (on(x, y + 1) && x > 0 && x < w - 1 && on(x - 1, y) && on(x + 1, y)) p.set(x, y + 1, '#E8B870');
      break;
    }
  // the side towards the light: the outermost pixel of each row, upper half only
  if (side !== 0)
    for (let y = 0; y < Math.floor(h / 2); y++) {
      const xs = side < 0 ? [...Array(w).keys()] : [...Array(w).keys()].reverse();
      for (const x of xs) {
        if (!on(x, y)) continue;
        p.set(x, y, '#F6C27A');
        break;
      }
    }
  const c = p.toCanvas();
  per.set(side, c);
  return c;
}

// ---------------------------------------------------------------- the ending

/**
 * Wait for a note of the chime (its callback), or for when it is due: with
 * no sound (no audio output, a suspended context) the notes never call back,
 * and the ending must go on regardless.
 */
function* chimeNote(f: FieldScene, heard: () => boolean, t0: number, dueMs: number): Co {
  yield () => heard() || f.t - t0 > dueMs + 400;
}

function* cut1Chime(): Co {
  const f = F();
  // out of the white: the two come out of the half-open automatic door
  // no place-name banner over the first shot: the HUD stays down until they are out
  setFlag('flag_hud_hidden', 1);
  cutTo('map_town', 50, 5, 'down');
  stopAmbient('amb_night_insects', 0);
  stopAmbient('amb_kawabe', 0);
  const rest = actor('restored:sym_town_07');
  if (rest) {
    rest.x = 51 * 16 + 8;
    rest.y = 6 * 16 + 16;
  }
  setClockText('17:00', false);
  setSpace('outdoor');
  holdCamera();
  f.camX = Math.max(0, Math.min(f.map.w * 16 - W, 50 * 16 + 8 - W / 2));
  f.camY = Math.max(0, Math.min(f.map.h * 16 - H, 8 * 16 - H / 2));
  f.camOverride = { x: f.camX + W / 2, y: f.camY + H / 2 };
  // close on the two of them (2×): the doors behind, the lot's first lamp
  // at the edge; the whole lot opens up when they look at the sky
  const z = yield* zoomIn(50 * 16, 7 * 16 - 2, 0);
  sfx('se_auto_door');
  game.scripts.run(game.fadeIn(800));
  // カネナリくん comes round to stand beside him (not stacked up behind
  // him): the two side by side under the chime — walking out together
  const k0 = f.follower;
  yield* all(
    walkTo('player', 50, 7, { speed: 2.4, face: 'down' }),
    (function* (): Co {
      if (!k0) return;
      k0.data.scripted = true;
      yield 250;
      const route = tileRoute([k0.tileX, k0.tileY], [49, 7], [[50, 7]], 4);
      if (route && route.length) {
        k0.path = route.map(([x, y]) => [x * 16 + 8, y * 16 + 16] as [number, number]);
        k0.pathSpeed = 2.6 * 16;
        yield () => k0.path.length === 0;
      }
      k0.moving = false;
      k0.dir = 'down';
    })(),
  );
  // the HUD's pending place name is dropped while it is hidden (it waits for the fade)
  yield () => game.fadeAlpha < 0.05;
  yield* beat(150);
  // the clock plate slides in, still 17:00 — only the clock: the HUD hanko
  // (a control, not part of the picture) stays out of the shot
  hudHankoHidden(true);
  setFlag('flag_hud_hidden', 0);
  yield* beat(300);
  // the chime: G4 A4 C5 E5 — and, for the first time, D5 C5 A4 C5
  let fifth = false;
  let last = false;
  const t0 = f.t;
  void playChimeMotif({
    notes: 8,
    gap: 0.45,
    lastHold: 2.0,
    onNote: (i) => {
      if (i === 4) fifth = true;
      if (i === 7) last = true;
    },
  });
  yield* chimeNote(f, () => fifth, t0, 4 * 450);
  // from the fifth note the sky turns to night in 3 s; the insects come in
  f.setStage(3, 3000);
  playAmbient('amb_night_insects', { fade: 3, vol: 0.8 });
  playAmbient('amb_kawabe', { fade: 3 });
  yield* chimeNote(f, () => last, t0, 7 * 450);
  yield* beat(650);
  // the stopped clock moves on: 17:00 → 17:01, with its flip (40_audio 13.5)
  setClock(4);
  yield* beat(450);
  // one higurashi, then the ending song
  sfx('se_higurashi_call');
  yield* beat(350);
  playBgm('bgm_ending', { fade: 1.0 });
  // they look up at the sky; the camera draws back to the lit lot
  const p = f.player;
  p.tempPose = 'look_up';
  const k = f.follower;
  if (k) {
    k.data.scripted = true;
    k.dir = 'down';
    k.tempPose = 'look_up';
  }
  yield* beat(200);
  yield* zoomOut(z, 1000);
  yield* beat(150);
  p.tempPose = null;
  if (k) {
    k.tempPose = null;
    delete k.data.scripted;
  }
}

function* cut2Meat(): Co {
  const f = F();
  // the frying is heard before the picture changes
  sfx('se_fry');
  yield* fadeTo(300);
  // no place-name banners and no clock in the cuts that follow
  setFlag('flag_hud_hidden', 1);
  hudHankoHidden(false);
  cutTo('map_maruyama', 4, 5, 'up');
  setSpace('room');
  // カネナリくん at the counter beside Minato (the bag goes down on his other side)
  const k = f.follower;
  if (k) {
    k.data.scripted = true;
    k.path = [];
    k.moving = false;
    k.x = 3 * 16 + 8;
    k.y = 5 * 16 + 16;
    k.dir = 'up';
  }
  // 丸山 at the fryer, his back to us, the basket down in the boiling oil
  const m = actor('npc_maruyama');
  if (m) {
    m.data.scripted = true;
    place('npc_maruyama', 3, 3, 'up');
    m.pose = null;
  }
  fryReset();
  fry.on = true;
  fry.t = 0;
  fry.heat = 1;
  fry.lift = 0;
  fry.handle = true;
  // 2× on the shop's back: the fryer, 丸山, the counter and the two of them
  const [ox, oy] = fryerOil(f);
  const z = yield* zoomIn(ox + 10, oy + 16, 0);
  forceBoxPos('bottom');
  yield* game.fadeIn(300);
  sfx('se_fry', { vol: 0.6 });
  yield* beat(350);
  // 揚がった: the basket comes up out of the oil — a hiss, a burst of steam,
  // the golden croquettes catching the bulb — and is hung up to drain
  sfx('se_fry', { vol: 0.9, pitch: 1.25 });
  fry.bloom = 600;
  const [bx0] = basketAt(f);
  const [, ot] = fryerWell(f);
  for (let i = 0; i < 9; i++) fry.puffs.push({ x: bx0 + 1 + ((i * 5) % 16), y: ot, t: i * 30, life: 1300 + i * 60, drift: (i % 3) - 1, big: true });
  if (m) m.hop(1, 160);
  // and the camera pushes in (3×) on the basket and 丸山
  game.scripts.run(zoomScale(z, 3, 480));
  game.scripts.run(zoomPan(z, ox + 6, oy + 10, 480));
  yield* animate(360, (k) => (fry.lift = 9 * k), ease.cubicOut);
  fry.lift = 9;
  yield* animate(380, (k) => (fry.heat = 1 - 0.8 * k));
  fry.handle = false;
  sfx('se_drip', { vol: 0.35 });
  yield* beat(160);
  // he turns round to the counter
  if (m) {
    face('npc_maruyama', 'player');
    m.hop(2, 180);
  }
  yield* beat(200);
  yield* msg(T.END_MEAT_A);
  // back to 2× for the counter; the bag is lifted from behind the showcase
  // in front of him, over onto the counter in front of Minato
  yield* all(zoomScale(z, 2, 380), zoomPan(z, ox + 12, oy + 22, 380));
  const p = f.player;
  const mx = m ? m.x : 3 * 16 + 8;
  fry.bag = { t: 0, from: [mx + 10, caseTop(f)], to: [p.x + 6, counterLedge(f)] };
  sfx('se_paper_open', { vol: 0.35, pitch: 1.3 });
  // (it lands at 640 ms: the bag's sound on the landing)
  yield 640;
  sfx('se_paper_bag');
  yield 200;
  // paid (his line said the price), and the bag is Minato's: the item
  // jingle over the picture, no window (the ending keeps one line per beat)
  if (state.money >= 320) {
    state.money -= 320;
    sfx('se_coin');
    yield 200;
  } else {
    yield* msg(T.END_MEAT_TSUKE);
    setFlag('flag_tsuke', 1);
  }
  forceBoxPos(null);
  yield* quietItem('item_korokke');
  playBgm('bgm_jingle_item');
  yield* beat(550);
  fry.bag = null;
  yield* zoomOut(z, 400);
  if (k) delete k.data.scripted;
  yield* beat(200);
}

function* cut3Photo(): Co {
  const f = F();
  yield* fadeTo(300);
  cutTo('map_town', 31, 33, 'up');
  setSpace('outdoor');
  // the camera on the show window
  holdCamera();
  f.camX = Math.max(0, Math.min(f.map.w * 16 - W, 30 * 16 + 16 - W / 2));
  f.camY = Math.max(0, Math.min(f.map.h * 16 - H, 29 * 16 + 8 - H / 2));
  f.camOverride = { x: f.camX + W / 2, y: f.camY + H / 2 };
  // the three-coloured cat, asleep under the window
  const cat = spawn('ending_cat', 30, 32, { sprite: 'npc_cat_mike', dir: 'up', ghost: true });
  cat.data.scripted = true;
  cat.pose = 'sleep';
  yield* game.fadeIn(300);
  const w = new PhotoCloseup();
  game.ui.push(w);
  yield* animate(400, (p) => (w.k = p), ease.quadOut);
  yield* beat(250);
  // it wakes, looks up at the photograph, and flicks its tail once — no sound but the insects
  cat.pose = null;
  cat.tempPose = 'look_up';
  yield* beat(400);
  cat.tempPose = null;
  cat.playAnim('tail');
  yield* beat(550);
  cat.anim = null;
  cat.tempPose = 'look_up';
  yield* beat(250);
  yield* animate(300, (p) => (w.k = 1 - p));
  w.done = true;
}

function* cut4Home(): Co {
  const f = F();
  yield* fadeTo(300);
  // カネナリくん waits at the gate; he doesn't come in
  setFollowerVisible(false);
  cutTo('map_home_1f', 2, 7, 'up');
  setSpace('room');
  sfx('se_door');
  const mom = actor('npc_mother');
  if (mom) {
    mom.data.scripted = true;
    mom.pose = 'chop';
  }
  yield* game.fadeIn(300);
  yield* walkTo('player', 2, 5, { speed: 3, face: 'up' });
  if (mom) {
    mom.pose = null;
    mom.tempPose = 'turn';
    yield 160;
    mom.tempPose = null;
    face('npc_mother', 'player');
  }
  // close on the two of them (2×), as for every first talk indoors
  const p = f.player;
  const who = mom ?? p;
  homeZoom = yield* zoomIn(Math.round((p.x + who.x) / 2), Math.round(Math.max(p.y, who.y)) - 12, 300);
  yield* msg(T.END_HOME);
}

/** Cut 4's close-up, let go when cut 5 fades in. */
let homeZoom: ZoomView | null = null;

function* cut5Tv(): Co {
  yield* fadeTo(300);
  if (homeZoom) homeZoom.done = true;
  homeZoom = null;
  // dinner: the two at either side of the chabudai, the TV on behind it
  place('player', 8, 4, 'right');
  const mom = actor('npc_mother');
  if (mom) {
    place('npc_mother', 11, 4, 'left');
    mom.pose = null;
    mom.data.scripted = true;
  }
  spawnDinner();
  // a 2× shot of the table, the TV at the top of the frame: centred on the
  // TV so the frame stays inside the house (the room ends two tiles right of
  // the table)
  const z = yield* zoomIn(9 * 16, 4 * 16 + 4, 0);
  yield* game.fadeIn(300);
  yield* beat(250);
  const w = new TvCloseup();
  game.ui.push(w);
  yield* animate(300, (p) => (w.k = p), ease.quadOut);
  yield* beat(150);
  yield* msg(T.END_TV);
  yield* animate(250, (p) => (w.k = 1 - p));
  w.done = true;
  if (mom) face('npc_mother', 'player');
  yield* beat(150);
  yield* msg(T.END_TV_MOTHER);
  yield* beat(200);
  yield* fadeTo(400);
  z.done = true;
}

/** The close-up of the crossing (cut 6), kept until the night sky covers it. */
let crossingZoom: ZoomView | null = null;
/** World centre of that close-up: the rails (x 968) right of centre, the road's middle row. */
const CROSS_VIEW: [number, number] = [59 * 16, 22 * 16 + 8];

/**
 * The ground a few tiles past the town's east edge (cut 6 only): the last
 * column — grass, and the road going on east over the crossing — laid again.
 */
const eastEdge = { on: false };
registerWorldFx({
  map: 'map_town',
  update() {
    if (eastEdge.on && !game.scripts.busy) eastEdge.on = false;
  },
  draw(f, g, cx, cy, layer) {
    if (layer !== 'ground' || !eastEdge.on) return;
    const mw = f.map.w * 16;
    if (cx + W <= mw) return;
    const srcX = mw - 16;
    const chunkX = Math.floor(srcX / CHUNK);
    const lx = srcX - chunkX * CHUNK;
    const y0 = Math.max(0, Math.floor(cy / CHUNK));
    const y1 = Math.min(Math.ceil((f.map.h * 16) / CHUNK) - 1, Math.floor((cy + H) / CHUNK));
    for (let ty = y0; ty <= y1; ty++) {
      const c = f.ground.chunk(chunkX, ty);
      for (let k = 0; k < 4 && mw + k * 16 - cx < W; k++) g.ctx.drawImage(c, lx, 0, 16, c.height, mw + k * 16 - cx, ty * CHUNK - cy, 16, c.height);
    }
  },
});

function* cut6Crossing(): Co {
  const f = F();
  // a 0.4 s blackout: the night song, the night space
  stopBgm(0.4);
  yield* fadeTo(400);
  playBgm('bgm_night', { fade: 1.5 });
  setSpace('night');
  setFollowerVisible(false);
  cutTo('map_town', 51, 22, 'right');
  stopAmbient('amb_kawabe', 0.5);
  // 「踏切を正面に」: a 2× close-up, the crossing just right of the middle,
  // the two on the road left of it, their feet well above the window. The
  // crossing is two tiles from the town's east edge, so the frame looks a
  // tile past it: that ground is laid on for this cut (eastEdge).
  eastEdge.on = true;
  const [vx, vy] = CROSS_VIEW;
  holdCamera();
  f.camX = vx - W / 2;
  f.camY = Math.max(0, Math.min(f.map.h * 16 - H, vy - H / 2));
  f.camOverride = { x: f.camX + W / 2, y: f.camY + H / 2 };
  crossingZoom = yield* zoomIn(vx, vy, 0);
  const p = f.player;
  p.visible = false;
  // カネナリくん, waiting in front of the crossing — seen once the train has gone
  const k: Actor = spawn('ending_kanenari', 57, 22, { sprite: 'kanenari', dir: 'left', ghost: true });
  k.data.scripted = true;
  k.alpha = 0;
  yield* game.fadeIn(400);
  yield* beat(300);
  // the barrier that stayed down all day goes up
  setFlag('flag_crossing_open', 1);
  sfx('se_crossing_up');
  yield* beat(600);
  // an unlit train, north to south; its sign says 星見台
  yield* all(
    trainPass(),
    (function* (): Co {
      yield 1400;
      yield* animate(700, (q) => (k.alpha = q));
    })(),
  );
  k.alpha = 1;
  yield* beat(200);
  // Minato comes in from the left with the paper bag
  p.visible = true;
  p.x = 52 * 16 + 8;
  p.y = 22 * 16 + 16;
  yield* walkTo('player', 56, 22, { speed: 2.6, face: 'right' });
  face('ending_kanenari', 'player');
  yield* beat(250);
  // the extra one, held out and taken (no window: the picture says it)
  p.tempPose = 'give';
  yield* beat(450);
  sfx('se_paper_bag');
  p.tempPose = null;
  k.tempPose = 'hold';
  yield* beat(650);
  // he turns his back, opens the zip — dark inside — and puts it in
  k.dir = 'up';
  k.tempPose = 'zipper';
  sfx('se_zipper');
  yield* beat(650);
  k.tempPose = null;
  k.dir = 'left';
  // 1.5 s: only the insects — and the camera closes in on the two of them
  // (2× → 3×), the frame narrowing
  game.scripts.run(cinema(true, 1200));
  if (crossingZoom) {
    const cz = crossingZoom;
    yield* all(zoomScale(cz, 3, 1300), zoomPan(cz, Math.round((p.x + k.x) / 2), p.y - 14, 1300));
  } else yield 1300;
  yield* beat(250);
  // the first voice: no window, no name tag — only the words, slowly
  yield* voiceLine(T.END_VOICE_TEXT, { y: 170, cps: 5, hold: 1300 });
  yield* beat(400);
  // the bell rings once, by itself
  sfx('se_bell_kanenari_short');
  k.playAnim('glow');
  bellGlow(k.x, k.y - 20, 900);
  ring(k.x, k.y - 20, '#FFE7A3', 700);
  sparkle(k.x + 3, k.y - 26, 600);
  yield* beat(800);
  k.anim = null;
}

/** QA / the night sky: drop the crossing close-up. */
function endCrossingZoom(): void {
  if (homeZoom) homeZoom.done = true;
  homeZoom = null;
  hudHankoHidden(false);
  if (crossingZoom) crossingZoom.done = true;
  crossingZoom = null;
  eastEdge.on = false;
  cinemaOff();
}

export function* evtEnding(): Co {
  const f = F();
  setFlag('flag_boss_beaten', 1);
  setFlag('flag_boss_phase', 0);
  holdBgm(true);
  setFlag('flag_hud_hidden', 0);
  setFollowerVisible(true);
  // stage 3 for the world's contents; the colours stay stage 2 until the fifth note
  setFlag('flag_stage', 3);
  if (game.fadeAlpha < 1) {
    game.fadeColor = '#FFF6D8';
    game.fadeAlpha = 1;
  }
  stopAllAmbient(0.5);
  yield* beat(200);
  yield* cut1Chime();
  yield* cut2Meat();
  yield* cut3Photo();
  yield* cut4Home();
  yield* cut5Tv();
  yield* cut6Crossing();
  // the night sky (cut_night_sky): the star over 星見台 stops twinkling
  yield* playNightSkyCut({ hold: 700 });
  endCrossingZoom();
  // the notebook: 「夕鳴町 みました帳 ①」, the case, 「つづく」. The ending's
  // song and night bed are let go here, before the title — the title is the
  // last to start an ambience (its evening), nothing of ours stops it later
  releaseCamera();
  let closed = false;
  yield* all(
    (function* (): Co {
      yield* playEndingNotebook({ toTitle: false });
      closed = true;
    })(),
    (function* (): Co {
      const t0 = performance.now();
      yield () => closed || performance.now() - t0 > 6600;
      stopBgm(1.5);
      yield () => closed || performance.now() - t0 > 8400;
      stopAllAmbient(1.0);
    })(),
  );
  stopBgm(0.4);
  stopAllAmbient(0.4);
  holdBgm(false);
  setFlag('flag_hud_hidden', 0);
  // → the title (as the notebook would have done), after our sounds are gone
  yield* ditherOut(1, '#0B0B14');
  yield* beat(300);
  const { TitleScene } = (yield import('../ui/title')) as typeof import('../ui/title');
  game.replaceAll(new TitleScene(true));
  yield* ditherIn(900);
}

/** QA: play one cut of the ending from a prepared state (1–6). */
export const ENDING_CUTS: Record<number, () => Co> = {
  1: cut1Chime,
  2: cut2Meat,
  3: cut3Photo,
  4: cut4Home,
  5: cut5Tv,
  6: function* (): Co {
    yield* cut6Crossing();
    yield 1500;
    endCrossingZoom();
  },
};

registerScript('evt_ending', function* (): Co {
  if (flag('flag_clear') && !flag('flag_boss_beaten')) return;
  yield* evtEnding();
});
