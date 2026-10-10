// 畦道の先の 円筒分水（map_aze, 24×14。30_level_art 3.14、02_ch2_index #67）と、
// 対岸の祠の きつねの小皿（map_town (7,38)。10_narrative 7.22）。
//
// 円筒分水（prop_bunsui）：水は地面の下の管を通って、まん中の 円筒（内筒）の底から
// 湧きあがり、円い 堰の 縁（クレスト）から ぐるりと 同じ 高さで あふれて、外の 輪へ
// 落ちる。外の輪は 仕切り板2枚で 6：4（夕鳴町 216°：となり町 144°）に分かれ、それぞれの
// 口から 水路へ 流れていく。上から見ると、まん中の 渦と あふれた泡の 花びらで はなまる。
// まわりは 亜鉛めっきの 金網の 柵（南に 錠のかかった 戸）で、子どもは 水に 近づけない。
//   段階0：湧いて あふれて 流れる（over() で 泡・波紋・落ちる水のすじ）。
//   段階1：あふれる 途中で 止まる（動きは env.mt が 止めるので そのまま。宙に しずく）。
//   段階2：水が 北東へ 寄る（北東の 縁だけ 厚く あふれ、南西の 縁は 乾いて、
//          となり町（西）の 水路が 細る）。
// 水路（prop_aze_suiro）、境の石のベンチ（prop_aze_bench）、トタンの物置（prop_aze_monooki）、
// 案内板（prop_aze_sign）、水口とせき板（prop_aze_mizuguchi）、点検口（prop_bunsui_futa）。
// 赤とんぼは world の fx（events/aze.ts）で 描く。
// 重い フレームごとの 全画面合成は しない：絵は 段階ごとに 1回 焼いて、動くのは 数十の 点だけ。

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { finish } from './kit';
import { flat, stand } from './pkit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const pc = (w: number, h: number) => new PixelCanvas(w, h);

// ================================================================ 円筒分水 prop_bunsui (9,4)

/** Canvas of the fence and the diversion: tiles x9–15, y4–10 plus the posts' height above. */
const BW = 112;
const BH = 126;
/** Canvas row of world y = 64 (the top of tile row 4). */
const OY = 14;
/** Centre of the diversion (canvas): world (200, 120). */
const CX = 56;
const GY = 70;
/** Outer ring (its rim), inner cylinder (its crest): radii and heights above the ground. */
const RO = { rx: 36, ry: 27, h: 6 };
const RI = { rx: 12, ry: 9, h: 12 };
/** Water level in the outer ring (above the ground). */
const HW = 2;
/** The partition plates: 6 (夕鳴町, east) : 4 (となり町, west) → ±108° from east. */
const PART_A = [(-108 * Math.PI) / 180, (108 * Math.PI) / 180];

/** Point on an ellipse (angle from east, y down). */
function ept(a: number, rx: number, ry: number, cx: number, cy: number): [number, number] {
  return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
}

/** Half height of an ellipse at column offset dx (0 outside). */
function ehalf(dx: number, rx: number, ry: number): number {
  const k = 1 - (dx / rx) ** 2;
  return k > 0 ? ry * Math.sqrt(k) : -1;
}

/** Is (x, y) inside the ellipse (pixel-centre sampling)? */
function inE(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (x + 0.5 - cx) / rx;
  const dy = (y + 0.5 - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Water colours (lit by the evening sky; the grade tints them per stage). */
const WDEEP = P.navy;
const WMID = P.blue;
const WMURK = P.leafShade;

/** A galvanised mesh fence panel along a horizontal run (base row y, 11px tall). */
function meshRun(p: PixelCanvas, x0: number, x1: number, y: number, gate?: [number, number]): void {
  const top = y - 11;
  for (let x = x0; x <= x1; x++) {
    for (let yy = top + 2; yy < y; yy++) {
      const d1 = (((x + yy) % 4) + 4) % 4 === 0;
      const d2 = (((x - yy) % 4) + 4) % 4 === 0;
      if (d1 || d2) p.set(x, yy, d1 && d2 ? P.concreteLt : P.steel);
    }
    p.set(x, top, P.white);
    p.set(x, top + 1, P.steel);
    p.set(x, y, P.asphalt);
  }
  // posts every 16px and at both ends
  const posts: number[] = [];
  for (let x = x0; x <= x1; x += 16) posts.push(x);
  if (posts[posts.length - 1] !== x1 - 1) posts.push(x1 - 1);
  for (const x of posts) {
    p.vline(x, top - 1, y, P.concreteLt);
    p.vline(x + 1, top - 1, y, P.asphalt);
    p.set(x, top - 1, P.white);
  }
  if (gate) {
    // the gate: a frame of round pipe, its own mesh, a hasp and a padlock
    const [g0, g1] = gate;
    p.vline(g0, top, y, P.white);
    p.vline(g0 + 1, top, y, P.steel);
    p.vline(g1, top, y, P.concreteLt);
    p.vline(g1 + 1, top, y, P.asphalt);
    p.hline(g0, g1, top + 1, P.concreteLt);
    p.hline(g0, g1, y - 2, P.steel);
    // the padlock on the latch, brass
    p.rect(g1 - 3, top + 5, 3, 3, P.brass);
    p.set(g1 - 3, top + 5, P.goldPale);
    p.set(g1 - 2, top + 4, P.steel);
    p.set(g1 - 1, top + 7, P.brassOld);
    // a small white plate with a red edge (『立入禁止』)
    p.rect(g0 + 4, top + 3, 7, 5, P.white);
    p.strokeRect(g0 + 4, top + 3, 7, 5, P.verm);
    p.hline(g0 + 6, g0 + 8, top + 5, P.vermShade);
  }
  // weeds creeping up the mesh (world-stable)
  for (let x = x0; x <= x1; x += 3) {
    const h = ihash(x, y, 6701);
    if (h % 3) continue;
    const hgt = 2 + (h >>> 3) % 4;
    for (let k = 0; k < hgt; k++) p.set(x + (k % 2), y - 1 - k, k === hgt - 1 ? P.leafYoung : P.leaf);
  }
}

/** A receding (north–south) fence run seen from above: a band of posts and one wire line. */
function sideRun(p: PixelCanvas, x: number, y0: number, y1: number): void {
  // the top wire and the mesh edge seen end-on
  for (let y = y0 - 11; y <= y1; y++) p.set(x, y, (y & 1) === 0 ? P.steel : P.concreteLt);
  p.vline(x + 1, y0 - 10, y1, P.asphalt);
  for (let y = y0; y <= y1; y += 16) {
    p.vline(x, y - 12, y, P.concreteLt);
    p.vline(x + 1, y - 12, y, P.asphalt);
    p.set(x, y - 12, P.white);
  }
}

/** The water of a small channel between y0..y1 (canvas), x0..x1. `thin` shows the dry bed (stage 2, west). */
function channelWater(p: PixelCanvas, x0: number, x1: number, y0: number, y1: number, thin: boolean): void {
  for (let x = x0; x <= x1; x++) {
    // the far wall's inner face, then the water, then the near lip
    p.set(x, y0, P.concreteLt);
    p.set(x, y0 + 1, P.concrete);
    p.set(x, y0 + 2, P.steel);
    for (let y = y0 + 3; y < y1; y++) {
      if (thin && y < y0 + 6) {
        // exposed wet concrete, a green line of moss where the water stood
        p.set(x, y, y === y0 + 5 ? P.leafShade : y === y0 + 3 ? P.steel : P.asphalt);
        continue;
      }
      const band = y - y0;
      let c: string = band < 5 ? WMID : band < 8 ? WDEEP : WMURK;
      if (((x * 3 + y * 5) % 11 === 0) && band > 3) c = P.aqua;
      p.set(x, y, c);
    }
    p.set(x, y1, P.white);
    p.set(x, y1 + 1, P.concrete);
  }
}

function bunsuiBase(lean: boolean): HTMLCanvasElement {
  const p = pc(BW, BH);
  const rimY = GY - RO.h;
  const crestY = GY - RI.h;
  const waterY = GY - HW;

  // ---- the north fence (the far side, behind everything) and the two side runs
  meshRun(p, 2, 109, OY + 2);
  sideRun(p, 2, OY + 2, BH - 3);
  sideRun(p, 108, OY + 2, BH - 3);

  // ---- the concrete apron round the ring (worn, with gravel in its cracks)
  for (let y = GY - 34; y <= GY + 34; y++)
    for (let x = CX - 46; x <= CX + 46; x++) {
      if (!inE(x, y, CX, GY + 1, 45, 33)) continue;
      const h = ihash(x, y, 6703);
      let c: string = P.concrete;
      if (h % 9 === 0) c = P.steel;
      else if (h % 13 === 0) c = P.concreteLt;
      if (!inE(x, y, CX, GY + 1, 42, 30)) c = h % 3 ? P.steel : P.asphalt; // its edge, sunk into the grass
      p.set(x, y, c);
    }
  // a crack or two in the apron, and grass in them
  p.line(CX - 40, GY + 8, CX - 30, GY + 20, P.steel);
  p.set(CX - 35, GY + 14, P.leaf);
  p.line(CX + 30, GY - 22, CX + 38, GY - 12, P.steel);

  // ---- the two channels leaving the ring (inside the fence; outside: prop_aze_suiro)
  const chY0 = GY - 6;
  const chY1 = GY + 5;
  channelWater(p, 0, CX - RO.rx + 1, chY0, chY1, lean);
  channelWater(p, CX + RO.rx - 1, BW - 1, chY0, chY1, false);

  // ---- the outer ring: its outer face (the south half shows), then the rim
  for (let x = CX - RO.rx; x <= CX + RO.rx; x++) {
    const dx = x + 0.5 - CX;
    const hh = ehalf(dx, RO.rx, RO.ry);
    if (hh < 0) continue;
    const yTop = Math.round(rimY + hh);
    const yBot = Math.round(GY + hh);
    const k = (x - (CX - RO.rx)) / (2 * RO.rx);
    for (let y = yTop; y <= yBot; y++) {
      let c: string = k < 0.22 ? P.concreteLt : k > 0.78 ? P.steel : P.concrete;
      if (y === yBot) c = P.asphalt;
      else if (y === yBot - 1) c = (x & 1) ? P.leafShade : P.steel; // damp moss at the foot
      else if ((y - yTop) === 3 && (x % 7) !== 0) c = k > 0.78 ? P.asphalt : P.steel; // a formwork seam
      p.set(x, y, c);
    }
  }
  // the rim (a 3px concrete band on top)
  p.ellipse(CX, rimY, RO.rx, RO.ry, P.concrete);
  for (let y = rimY - RO.ry - 1; y <= rimY + RO.ry + 1; y++)
    for (let x = CX - RO.rx - 1; x <= CX + RO.rx + 1; x++) {
      if (!inE(x, y, CX, rimY, RO.rx, RO.ry)) continue;
      // lit on the north-west rim, shaded on the south-east
      const a = Math.atan2(y + 0.5 - rimY, x + 0.5 - CX);
      if (!inE(x, y, CX, rimY, RO.rx - 1, RO.ry - 1)) p.set(x, y, a < -Math.PI / 2 || a > 2.6 ? P.white : a > 0.2 && a < 1.9 ? P.steel : P.concreteLt);
    }
  // ---- inside the ring: the far inner wall (above the water), the water
  const irx = RO.rx - 3;
  const iry = RO.ry - 2.5;
  for (let y = rimY - RO.ry; y <= rimY + RO.ry; y++)
    for (let x = CX - irx - 1; x <= CX + irx + 1; x++) {
      if (!inE(x, y, CX, rimY, irx, iry)) continue;
      // the ring's water surface is an ellipse (RO.h - HW) lower than the rim
      const wy = waterY;
      let lvl = 0;
      if (lean) {
        // stage 2: the water leans to the north-east: higher there, lower in the south-west
        const a = Math.atan2(y + 0.5 - wy, x + 0.5 - CX);
        lvl = Math.round(Math.cos(a + Math.PI / 4) * 1.6);
      }
      if (!inE(x, y + lvl, CX, wy, irx, iry)) {
        // the inner face of the far wall: dark wet concrete, a green line at the water
        const onLine = inE(x, y + 1 + lvl, CX, wy, irx, iry);
        p.set(x, y, onLine ? P.leafShade : (y & 1) ? P.asphalt : P.charcoal);
        continue;
      }
      // water: deeper toward the middle, the sky's glints in bands
      const d = ((x + 0.5 - CX) / irx) ** 2 + ((y + 0.5 - wy) / iry) ** 2;
      let c: string = d > 0.7 ? WMID : d > 0.35 ? WDEEP : WMURK;
      const h = ihash(x, y, 6707);
      if (h % 23 === 0) c = P.aqua;
      else if (h % 31 === 0 && y < wy) c = P.sky;
      p.set(x, y, c);
    }

  // ---- the outlets: a notch at the east (夕鳴町) and the west (となり町), water spilling out
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? CX - RO.rx - 1 : CX + RO.rx - 3;
    for (let x = x0; x < x0 + 5; x++)
      for (let y = GY - 4; y <= GY + 3; y++) {
        const edge = y === GY - 4 || y === GY + 3;
        const thin = side < 0 && lean;
        let c: string = edge ? P.asphalt : WMID;
        if (!edge && thin && y < GY) c = P.asphalt;
        if (!edge && ((x + y) % 3 === 0)) c = thin ? P.blue : P.aqua;
        p.set(x, y, c);
      }
  }

  // ---- the partition plates: from the cylinder to the outer wall (a lit top, a shaded face)
  for (const a of PART_A) {
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const rx = RI.rx + 2 + (irx - RI.rx - 2) * t;
      const ry = RI.ry + 1.5 + (iry - RI.ry - 1.5) * t;
      const [x, y] = ept(a, rx, ry, CX, rimY + 1);
      const X = Math.round(x);
      const Y = Math.round(y);
      p.set(X, Y + 1, P.steel);
      p.set(X, Y + 2, P.asphalt);
      p.set(X, Y, P.white);
      p.set(X + 1, Y, P.concreteLt);
    }
  }

  // ---- the inner cylinder: its outer face (south half), wet
  for (let x = CX - RI.rx; x <= CX + RI.rx; x++) {
    const hh = ehalf(x + 0.5 - CX, RI.rx, RI.ry);
    if (hh < 0) continue;
    const yTop = Math.round(crestY + hh);
    const yBot = Math.round(waterY + hh);
    const k = (x - (CX - RI.rx)) / (2 * RI.rx);
    for (let y = yTop; y <= yBot; y++) p.set(x, y, k < 0.25 ? P.concrete : k > 0.75 ? P.asphalt : P.steel);
  }
  // the crest (a thin concrete lip) and the water inside, domed where it wells up
  p.ellipse(CX, crestY, RI.rx, RI.ry, P.concreteLt);
  for (let y = crestY - RI.ry; y <= crestY + RI.ry; y++)
    for (let x = CX - RI.rx; x <= CX + RI.rx; x++) {
      if (!inE(x, y, CX, crestY, RI.rx - 1.2, RI.ry - 1)) continue;
      const d = ((x + 0.5 - CX) / (RI.rx - 1)) ** 2 + ((y + 0.5 - crestY) / (RI.ry - 1)) ** 2;
      p.set(x, y, d < 0.18 ? P.aqua : d < 0.55 ? WMID : WDEEP);
    }
  // the swirl of the upwelling: a spiral of light (the 「まる」 of the はなまる)
  for (let i = 0; i < 26; i++) {
    const a = i * 0.55;
    const r = 0.8 + i * 0.3;
    p.set(Math.round(CX + Math.cos(a) * r), Math.round(crestY + Math.sin(a) * r * 0.75), i % 3 ? P.aqua : P.glint);
  }

  // ---- the overflow: a sheet over the crest, all the way round, the same height everywhere
  // (stage 2: thick on the north-east, the south-west lip dry)
  for (let x = CX - RI.rx - 1; x <= CX + RI.rx + 1; x++) {
    const hh = ehalf(x + 0.5 - CX, RI.rx + 1, RI.ry + 1);
    if (hh < 0) continue;
    const yTop = Math.round(crestY + hh);
    const yBot = Math.round(waterY + hh);
    const west = x < CX - 3;
    for (let y = yTop; y <= yBot; y++) {
      if (lean && west) {
        // dry: only a trickle, the concrete shows
        if ((x + y) % 5 === 0) p.set(x, y, P.blue);
        continue;
      }
      const s = (x * 5 + y * 3) % 7;
      p.set(x, y, s === 0 ? P.white : s < 3 ? P.aqua : P.blue);
    }
    // the lip of the sheet over the crest edge
    p.set(x, yTop, lean && west ? P.concreteLt : P.glint);
  }
  // the north half's sheet shows as a bright rim round the far crest
  for (let x = CX - RI.rx; x <= CX + RI.rx; x++) {
    const hh = ehalf(x + 0.5 - CX, RI.rx, RI.ry);
    if (hh < 0) continue;
    const y = Math.round(crestY - hh);
    if (lean && x < CX + 2) continue;
    p.set(x, y - 1, P.aqua);
  }
  // the foam where the sheet lands: petals round the cylinder's foot (the 「はな」)
  const petals = 12;
  for (let k = 0; k < petals; k++) {
    const a = (k / petals) * Math.PI * 2 + 0.26;
    if (Math.sin(a) < -0.35) continue; // the far petals hide behind the cylinder
    // stage 2: big on the north-east, small (or gone) on the south-west
    const ne = Math.cos(a + Math.PI / 4);
    if (lean && ne < -0.3) continue;
    const r = lean ? (ne > 0.4 ? 3 : 2) : 2.4;
    const [px, py] = ept(a, RI.rx + 3.5, RI.ry + 3, CX, waterY);
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const q = (dx / r) ** 2 + (dy / (r * 0.7)) ** 2;
        if (q > 1) continue;
        p.set(Math.round(px + dx), Math.round(py + dy), q < 0.35 ? P.glint : P.white);
      }
  }

  // ---- the south fence (in front), with the locked gate west of the middle
  meshRun(p, 2, 109, BH - 3, [28, 44]);
  return p.toCanvas();
}

let bunsuiImgs: HTMLCanvasElement[] | null = null;
function bunsuiImg(stage: number): HTMLCanvasElement {
  bunsuiImgs ??= [bunsuiBase(false), bunsuiBase(true)];
  return bunsuiImgs[stage === 2 ? 1 : 0];
}

/**
 * The moving water, drawn over the baked diversion (world px of the anchor
 * tile). All on the motion clock, so stage 1 holds it wherever it was.
 */
function bunsuiOver(g: Gfx, x: number, y: number, env: PropEnv): void {
  const ox = x;
  const oy = y - OY;
  const lean = env.stage === 2;
  const mt = env.mt;
  const crestY = GY - RI.h;
  const waterY = GY - HW;
  // the boil: rings rising out of the middle and spreading to the crest
  const bx = CX + (lean ? 2 : 0);
  const by = crestY - (lean ? 1 : 0);
  for (let i = 0; i < 3; i++) {
    const ph = ((mt / 1400 + i / 3) % 1 + 1) % 1;
    const r = 1.5 + ph * (RI.rx - 3);
    const n = 10 + Math.round(ph * 10);
    const col = ph < 0.5 ? P.glint : P.aqua;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + i;
      g.px(ox + Math.round(bx + Math.cos(a) * r), oy + Math.round(by + Math.sin(a) * r * 0.72), col);
    }
  }
  // streaks running down the sheet (the south half), and a glint riding the crest
  for (let k = 0; k < 9; k++) {
    const sx = CX - RI.rx + 1 + Math.round((k / 8) * (2 * RI.rx - 2));
    if (lean && sx < CX - 3) continue;
    const hh = ehalf(sx + 0.5 - CX, RI.rx + 1, RI.ry + 1);
    if (hh < 0) continue;
    const yTop = crestY + hh;
    const len = waterY - crestY;
    const ph = ((mt / 520 + k * 0.37) % 1 + 1) % 1;
    g.px(ox + sx, oy + Math.round(yTop + ph * len), P.glint);
  }
  // the foam petals flicker
  const petals = 12;
  for (let k = 0; k < petals; k++) {
    const a = (k / petals) * Math.PI * 2 + 0.26;
    if (Math.sin(a) < -0.35) continue;
    if (lean && Math.cos(a + Math.PI / 4) < -0.3) continue;
    const on = Math.floor(mt / 180 + k * 1.7) % 3 === 0;
    if (!on) continue;
    const [px, py] = ept(a, RI.rx + 3.5 + ((k & 1) ? 1 : 0), RI.ry + 3, CX, waterY);
    g.px(ox + Math.round(px), oy + Math.round(py) - 2, P.glint);
  }
  // ripples in the ring, drifting out to the two outlets (fewer to the west in stage 2)
  const irx = RO.rx - 4;
  const iry = RO.ry - 3.5;
  for (let k = 0; k < 14; k++) {
    const a0 = (k / 14) * Math.PI * 2;
    const west = Math.cos(a0) < 0;
    if (lean && west && k % 3) continue;
    const ph = ((mt / 2600 + k * 0.29) % 1 + 1) % 1;
    const rr = 0.55 + ph * 0.4;
    // drift toward the nearer outlet (east or west)
    const target = west ? Math.PI : 0;
    const a = a0 + (target - a0) * ph * 0.25;
    const [px, py] = ept(a, irx * rr + 2, iry * rr + 1.5, CX, waterY);
    if (Math.sin(a) < 0 && py < waterY - iry * 0.6) continue;
    g.px(ox + Math.round(px), oy + Math.round(py), ph < 0.6 ? P.glint : P.aqua);
    g.px(ox + Math.round(px) + 1, oy + Math.round(py), P.aqua);
  }
  // the spill at the outlets
  for (const side of [-1, 1]) {
    if (lean && side < 0 && Math.floor(mt / 400) % 2) continue;
    const sx = side < 0 ? CX - RO.rx - 2 : CX + RO.rx + 1;
    const ph = Math.floor(mt / 140) % 3;
    g.px(ox + sx + side * ph, oy + GY - 1 + (ph === 1 ? 1 : 0), P.glint);
  }
  // stage 1: drops held in the air over the crest, like glass beads
  if (env.stage === 1) {
    const drops: [number, number][] = [[-9, -3], [-4, -5], [3, -4], [8, -3], [11, 1], [-12, 0], [0, 6], [6, 5]];
    for (const [dx, dy] of drops) {
      g.px(ox + CX + dx, oy + crestY + dy, P.glint);
      g.px(ox + CX + dx, oy + crestY + dy + 1, P.aqua);
    }
  }
}

registerProp('prop_bunsui', () => {
  const art: PropArt = {
    ox: 0,
    oy: -OY,
    w: BW,
    h: BH,
    // the south fence's foot (nobody walks inside): behind whoever stands south of it
    foot: 110,
    img: (env) => bunsuiImg(env.stage),
    over: bunsuiOver,
    shadow: 0,
    contact: 0,
  };
  return art;
});

// ================================================================ 水路 prop_aze_suiro (0,7), flat

/** The two concrete channels along row 7 and the slabs where the side paths cross them. */
function suiroImg(lean: boolean): HTMLCanvasElement {
  const W = 24 * 16;
  const p = pc(W, 16);
  const y0 = 2;
  const y1 = 13;
  // west (となり町): x0–8 (the slab at x8), east (夕鳴町): x16–23 (the slab at x16)
  channelWater(p, 0, 9 * 16 - 1, y0, y1, lean);
  channelWater(p, 15 * 16, W - 1, y0, y1, false);
  // the slabs over the channel where the ring path crosses it (x8 and x16)
  for (const sx of [8 * 16, 16 * 16]) {
    p.rect(sx, 0, 16, 16, P.concrete);
    p.hline(sx, sx + 15, 0, P.concreteLt);
    p.hline(sx, sx + 15, 1, P.white);
    p.hline(sx, sx + 15, 14, P.steel);
    p.hline(sx, sx + 15, 15, P.asphalt);
    p.vline(sx, 1, 14, P.concreteLt);
    p.vline(sx + 15, 1, 14, P.steel);
    // the dark mouths of the channel under the slab, left and right
    p.vline(sx - 1, y0 + 3, y1 - 1, P.nightShade);
    p.vline(sx + 16, y0 + 3, y1 - 1, P.nightShade);
    // scuffs and a sprig of grass in the joint
    for (let i = 0; i < 6; i++) {
      const h = ihash(sx, i, 6711);
      p.set(sx + 2 + (h % 12), 3 + ((h >>> 4) % 10), P.steel);
    }
    p.set(sx + 1, 13, P.leaf);
    p.set(sx + 14, 2, P.leafYoung);
  }
  return p.toCanvas();
}

let suiroImgs: HTMLCanvasElement[] | null = null;

registerProp('prop_aze_suiro', () =>
  flat(pc(1, 1).toCanvas(), 0, 0, {
    w: 24 * 16,
    h: 16,
    img: (env) => {
      suiroImgs ??= [suiroImg(false), suiroImg(true)];
      return suiroImgs[env.stage === 2 ? 1 : 0];
    },
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      // the current: bright dashes flowing west (となり町) and east (夕鳴町), away from the ring
      const mt = env.mt;
      const lean = env.stage === 2;
      for (let k = 0; k < 16; k++) {
        const west = k < 8;
        const len = west ? 8 * 16 : 7 * 16;
        const speed = west && lean ? 9000 : 5200;
        const ph = ((mt / speed + k * 0.137) % 1 + 1) % 1;
        const along = ph * len;
        const wx = west ? 8 * 16 - along : 17 * 16 + along;
        const wy = y + 7 + ((k * 3) % 4) + (west && lean ? 2 : 0);
        if (west && lean && k % 2) continue;
        g.px(x + Math.round(wx), wy, P.glint);
        g.px(x + Math.round(wx) + (west ? 1 : -1), wy, P.aqua);
      }
    },
  }),
);

// ================================================================ 境の石のベンチ prop_aze_bench (11,12)

/** Runtime state the pair's scenes drive (events/aze.ts): the cup is off the stone while someone drinks. */
export const azeRt = {
  /** The flask cap's cup is in someone's hand (not on the stone). */
  cupHeld: false,
};

/**
 * A plank bench three tiles long across the boundary stone: the stone (『境』
 * cut in its face, knee-high) stands on the line (world x 196–203) and the
 * seat straddles it, so it rises between the two backs. よね and とよぞう sit
 * back to back over it (their sprites: backs at x 195 and 204); the flask's
 * cap, the one cup they share, sits on top of the stone.
 */
function benchImg(cup: boolean): HTMLCanvasElement {
  const W = 52;
  const H = 20;
  const p = pc(W, H);
  const seatY = 14;
  // the stone (behind the plank): granite, lit on the west, a flat top
  const sx = 22;
  p.rect(sx, 9, 8, H - 9, P.concrete);
  p.vline(sx, 10, H - 1, P.concreteLt);
  p.vline(sx + 1, 10, H - 1, P.concreteLt);
  p.vline(sx + 6, 10, H - 1, P.steel);
  p.vline(sx + 7, 10, H - 1, P.asphalt);
  p.hline(sx, sx + 7, 9, P.white);
  p.hline(sx + 1, sx + 6, 10, P.concreteLt);
  // 『境』 cut in its face above the seat: a few dark strokes
  p.vline(sx + 2, 11, 13, P.asphalt);
  p.set(sx + 1, 12, P.asphalt);
  p.set(sx + 3, 12, P.asphalt);
  p.hline(sx + 4, sx + 5, 11, P.asphalt);
  p.hline(sx + 4, sx + 5, 13, P.asphalt);
  p.set(sx + 5, 12, P.asphalt);
  // lichen low on the face, under the seat
  p.set(sx + 5, 18, P.leafShade);
  p.set(sx + 2, 19, P.leafDeep);
  p.set(sx + 1, 17, P.steel);
  // legs: a pair of posts at each end
  for (const lx of [3, W - 6]) {
    p.rect(lx, seatY + 2, 3, H - seatY - 2, P.wood);
    p.vline(lx, seatY + 2, H - 1, P.woodLt);
    p.vline(lx + 2, seatY + 2, H - 1, P.woodDark);
  }
  // the seat plank (weathered cedar), notched round the stone: two lengths meeting on it
  for (const [x0, x1] of [[0, sx - 1], [sx + 8, W - 1]]) {
    p.rect(x0, seatY, x1 - x0 + 1, 3, P.woodLt);
    p.hline(x0, x1, seatY, P.goldPale);
    p.hline(x0, x1, seatY + 2, P.wood);
    p.set(x0 + 1, seatY + 1, P.steel);
    p.set(x1 - 1, seatY + 1, P.steel);
  }
  for (let x = 1; x < W - 1; x += 5) if (x < sx - 1 || x > sx + 8) p.set(x + (ihash(x, 1, 6713) % 2), seatY + 1, P.brassOld);
  if (cup) {
    // the flask's cap on the stone, tea in it
    p.rect(sx + 2, 6, 4, 3, P.crimson);
    p.hline(sx + 2, sx + 5, 6, P.peach);
    p.vline(sx + 5, 7, 8, P.sunShade);
    p.hline(sx + 3, sx + 4, 6, P.brass);
  }
  finish(p, { soft: true });
  return p.toCanvas();
}

let benchImgs: HTMLCanvasElement[] | null = null;

registerProp('prop_aze_bench', () => {
  benchImgs ??= [benchImg(false), benchImg(true)];
  const withCup = benchImgs[1];
  // anchored on (11,12): the stone's middle at world x 200, the seat's top at y 202
  const a = stand(withCup, { cx: 24, shadow: 12, contact: 44 });
  a.img = () => benchImgs![azeRt.cupHeld ? 0 : 1];
  a.shadowImg = () => benchImgs![0];
  return a;
});

// ================================================================ トタンの物置 prop_aze_monooki (6,2)

registerProp('prop_aze_monooki', () => {
  const W = 34;
  const H = 42;
  const p = pc(W, H);
  const wallTop = 14;
  const base = H - 2;
  // the walls: corrugated tin, faded green paint gone to rust in patches
  for (let x = 1; x < W - 1; x++)
    for (let y = wallTop; y < base; y++) {
      const rib = x % 3;
      const h = ihash(x, y, 6717);
      let c: string = rib === 0 ? P.leafYoung : rib === 1 ? P.leaf : P.leafDeep;
      if (h % 17 === 0 || (y > base - 6 && h % 3 === 0)) c = rib === 2 ? P.brassOld : P.wood; // rust
      if (x > W - 9) c = rib === 0 ? P.leaf : rib === 1 ? P.leafDeep : P.leafShade; // the east wall, in shade
      p.set(x, y, c);
    }
  // the door (a lighter sliding panel), its two padlocks on the hasp
  const dx0 = 7;
  const dx1 = 21;
  p.rect(dx0, wallTop + 6, dx1 - dx0, base - wallTop - 6, P.leafYoung);
  for (let x = dx0; x < dx1; x += 3) p.vline(x, wallTop + 6, base - 1, P.leaf);
  p.strokeRect(dx0, wallTop + 6, dx1 - dx0, base - wallTop - 6, P.leafShade);
  p.rect(dx1 - 3, wallTop + 16, 2, 5, P.steel);
  p.rect(dx1 - 5, wallTop + 18, 3, 3, P.brass);
  p.rect(dx1 - 1, wallTop + 18, 3, 3, P.steel);
  p.set(dx1 - 5, wallTop + 18, P.goldPale);
  p.set(dx1 - 1, wallTop + 18, P.concreteLt);
  // a paper label on the door (『水利組合』): white with two lines of grey
  p.rect(9, wallTop + 9, 9, 5, P.white);
  p.hline(10, 16, wallTop + 10, P.steel);
  p.hline(10, 14, wallTop + 12, P.steel);
  // the roof: one slope of tin, rusty at the eaves, a stone to hold it
  for (let y = 2; y < wallTop + 2; y++)
    for (let x = 0; x < W; x++) {
      const rib = x % 4;
      let c: string = rib === 0 ? P.concreteLt : rib === 3 ? P.steel : P.concrete;
      if (y > wallTop - 1) c = P.asphalt;
      else if (ihash(x, y, 6719) % 11 === 0 || (y > wallTop - 4 && x % 5 === 0)) c = P.brassOld;
      p.set(x, y, c);
    }
  p.hline(0, W - 1, 2, P.white);
  p.rect(22, 5, 4, 3, P.steel);
  p.hline(22, 25, 5, P.concreteLt);
  // leaning on the west wall: a spare せき板 and a shovel
  p.rect(1, wallTop + 8, 4, base - wallTop - 8, P.woodLt);
  p.vline(4, wallTop + 8, base - 1, P.wood);
  p.hline(1, 4, wallTop + 8, P.goldPale);
  p.vline(29, wallTop + 2, base - 5, P.woodLt);
  p.rect(28, base - 5, 3, 4, P.steel);
  p.set(28, base - 5, P.concreteLt);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 16, base: 32, shadow: 30, contact: 30 });
});

// ================================================================ 案内板 prop_aze_sign (14,10)

registerProp('prop_aze_sign', () => {
  const W = 20;
  const H = 22;
  const p = pc(W, H);
  // two posts, a white board with a blue title bar, lines of text, and a
  // handwritten line under them (a different pen)
  p.rect(3, 12, 2, 10, P.steel);
  p.rect(15, 12, 2, 10, P.steel);
  p.vline(3, 12, 21, P.concreteLt);
  p.vline(15, 12, 21, P.concreteLt);
  p.rect(1, 1, 18, 13, P.white);
  p.strokeRect(1, 1, 18, 13, P.steel);
  p.rect(2, 2, 16, 3, P.navy);
  p.hline(4, 15, 3, P.concreteLt);
  p.hline(3, 15, 6, P.asphalt);
  p.hline(3, 13, 8, P.asphalt);
  // the handwritten line: marker, a little crooked
  p.set(3, 11, P.vermShade);
  p.hline(4, 9, 10, P.vermShade);
  p.hline(10, 15, 11, P.vermShade);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 8, base: 17, shadow: 16, contact: 12, foot: 18 });
});

// ================================================================ 水口とせき板 prop_aze_mizuguchi

/** A notch in the paddy's corner under the channel, the board in its slot, water spilling in. dir 'n': the channel is north of it. */
registerProp('prop_aze_mizuguchi', (opts) => {
  const s = opts.dir === 's';
  const W = 16;
  const H = 16;
  const p = pc(W, H);
  // the concrete box of the inlet
  const by = s ? 8 : 0;
  p.rect(4, by, 8, 8, P.concrete);
  p.hline(4, 11, by, P.concreteLt);
  p.vline(11, by, by + 7, P.steel);
  // the slot and the board (せき板), a name in marker on it
  p.rect(5, by + 2, 6, 3, P.woodLt);
  p.hline(5, 10, by + 2, P.goldPale);
  p.hline(5, 10, by + 4, P.wood);
  p.hline(6, 9, by + 3, P.ink);
  // water over the board into the paddy
  const wy = s ? by - 1 : by + 8;
  p.hline(6, 9, wy, P.aqua);
  p.set(7, wy + (s ? -1 : 1), P.glint);
  p.set(8, wy + (s ? -2 : 2), P.aqua);
  return flat(p.toCanvas(), 0, 0, {
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      // the water falling over the board (thin in the west in stage 2)
      const k = Math.floor(env.mt / 160) % 3;
      if (opts.thin && env.stage === 2 && k) return;
      g.px(x + 6 + k, y + (s ? wy - 1 - k : wy + 1 + k), P.glint);
    },
  });
});

// ================================================================ 点検口 prop_bunsui_futa (15,3), flat

registerProp('prop_bunsui_futa', () => {
  const p = pc(16, 16);
  p.rect(3, 4, 10, 8, P.asphalt);
  p.strokeRect(3, 4, 10, 8, P.charcoal);
  for (let x = 4; x < 12; x += 2) p.vline(x, 5, 10, P.steel);
  p.hline(4, 11, 5, P.concrete);
  p.set(7, 8, P.concreteLt);
  p.set(8, 8, P.concreteLt);
  return flat(p.toCanvas(), 0, 0);
});

// ================================================================ きつねの小皿 prop_kitsune_sara (map_town 7,38)

/**
 * The little dish in front of the east fox of the hokora (10_narrative 7.22):
 * empty (its rim shining with old oil), or with the abura-age on it. Over it,
 * once the fox has eaten, both foxes' mouths shine; offered in stage 1 and
 * left, their mouths stay half open (flags from events/aze.ts).
 */
registerProp('prop_kitsune_sara', () => {
  const mk = (abura: boolean) => {
    const p = pc(10, 6);
    p.hline(1, 7, 3, P.white);
    p.hline(0, 8, 4, P.concreteLt);
    p.hline(1, 7, 5, P.concrete);
    p.set(2, 3, P.glint);
    p.set(6, 4, P.goldPale); // the oily rim
    if (abura) {
      p.rect(2, 1, 5, 3, P.brass);
      p.hline(2, 6, 1, P.goldPale);
      p.hline(2, 6, 3, P.brassOld);
      p.set(3, 2, P.goldPale);
      p.set(5, 2, P.brassOld);
    }
    return p.toCanvas();
  };
  const empty = mk(false);
  const full = mk(true);
  // the hokora (6,38) paints its east fox's pedestal at world x 116–123, y 620–621
  return {
    ox: 3,
    oy: 12,
    w: 10,
    h: 6,
    // just in front of the hokora (its foot is 17 into row 38)
    foot: 18,
    img: (env: PropEnv) => (env.flag('flag_abura_offered') && !env.flag('flag_abura_eaten') ? full : empty),
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      const eaten = env.flag('flag_abura_eaten') > 0;
      const frozen = !eaten && env.flag('flag_abura_frozen') > 0 && env.stage === 1;
      if (!eaten && !frozen) return;
      // the two foxes' muzzles (the hokora's art, anchor (112,608)): the west fox's at
      // world x 86–88, the east fox's at 119–121, both on y 613
      for (const [mx, side] of [[-25, 1], [8, -1]] as [number, number][]) {
        if (frozen) {
          // mouth half open, held there
          g.px(x + mx, y + 6, P.ink);
          g.px(x + mx + side, y + 6, P.nightShade);
        } else {
          // an oily gleam on the muzzle
          g.px(x + mx + side, y + 5, P.gold);
          g.px(x + mx, y + 5, P.glint);
          g.px(x + mx, y + 6, P.goldPale);
        }
      }
    },
    shadow: 0,
    contact: 0,
  } as PropArt;
});
