// 夕鳴川の 堰（map_seki, 24×16。02_ch2_index #81「水辺の 図鑑」、30_level_art 3.16、
// 10_narrative 6.25〔seki〕・7.24）。川べり通りの 西の はしの 先：北の 橋（その西は となり町）の
// 下から、夕鳴川が 南へ 流れる。橋の すぐ 下の 堰で 水を ためて、東の 岸の 取水口と 水門から
// 用水路へ（町の 用水路に なる）。堰の 下は 深い 淵、東の 岸は 石積みの 護岸、その東に 河原と
// ヨシ原。
//
//   prop_seki_river    川（0–8, 4–15。平ら）：上の 淵（橋の 影、空の 色）、堰（コンクリの
//                      縁、落ちる 白い 水、泡）、魚道（東の はし、3段）、下の 淵、浅瀬の 石、
//                      石積みの 護岸（x8, 9–13）、河原の 水ぎわ（x8, 14–15）。段階ごとに 1枚 焼く。
//                      動く物（落ちる水の すじ、泡、流れ、魚道の しぶきと 小さな 魚）は over()。
//                      段階1：落ちる 水が 白い 板のように 止まり、しぶきが 宙に 並ぶ。
//                      段階2：落ちる 水と しぶきが 北東へ かたむく。
//   prop_seki_bridge_n / _s   橋の 欄干（北・南。南は 橋桁の 面と 川への 影）
//   prop_seki_suimon   取水口と 水門 (9,4–5)：コンクリの 枠、鉄の 扉、ハンドル、鎖と 南京錠 2つ、札
//   prop_seki_annai    案内板 (14,3)『夕鳴川 取水堰／この 水は、山の 村 星見台から』
//   prop_seki_ryousui  量水標 (7,6)：水の 中の 白い 柱、赤と 黒の 目盛り
//   prop_seki_ryuboku  流木 (13–14,12)、prop_seki_bucket 置き忘れの バケツ (11,14)
//   prop_seki_stones   河原の 丸い 石（平ら）
//   prop_seki_bucket_opi  おぴぃの 伏せた バケツは 人の 絵（art/chars/people/tamotsu.ts）
// ツバメの 渦と 赤とんぼは world の fx（events/mizube.ts）。

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas, mix } from '../../engine/pixel';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { finish } from './kit';
import { flat, stand } from './pkit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const pc = (w: number, h: number) => new PixelCanvas(w, h);

// ================================================================ 川 prop_seki_river (0,4)

/** The river's canvas: tiles x0–8, rows 4–15. */
export const RIVER = { w: 144, h: 192 };
/** Local rows (the canvas's y; world y = 64 + y). */
const CREST = 50; // the weir's crest (the top of the concrete step)
const FACE0 = 53; // the falling water from here …
const FACE1 = 61; // … to here
const FOAM1 = 72; // the white water under it ends
const BANK_X = 128; // the east bank (tile 8) begins
const FISH_Y0 = 30; // the fish pass (tile 8, rows 6–8)
const FISH_Y1 = 80;
const STONE_Y0 = 80; // the stone revetment (tile 8, rows 9–13)
const STONE_Y1 = 160;

/** Water colours. */
const W_DEEP = '#1E3A3A';
const W_MID = '#2E5652';
const W_TOP = '#4E7E72';
const W_SHALLOW = '#6E9A84';
const FOAM = '#E8F4F0';
const SPRAY = '#FFF6D8';

/** The sky the water mirrors, by stage (as the fishing window's, art/props/tsuri_art.ts). */
const SKY: Record<number, string> = { 0: '#F7C27A', 1: '#D9728A', 2: '#B87AA8', 3: '#3A2B5C' };

function hexOf(v: number): string {
  return '#' + [(v >>> 16) & 255, (v >>> 8) & 255, v & 255].map((n) => n.toString(16).padStart(2, '0')).join('');
}
function under(p: PixelCanvas, x: number, y: number): string {
  // PixelCanvas.get returns 0xAABBGGRR-ish packed rgba32; rebuild a hex
  const v = p.get(x, y);
  const r = v & 255;
  const g = (v >>> 8) & 255;
  const b = (v >>> 16) & 255;
  return hexOf((r << 16) | (g << 8) | b);
}

/** A rounded stone (lit from the upper left, the west sun) with a little moss on top. */
function stone(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number, seed: number, wet = 0): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const lit = dx + dy < -0.55;
      const dark = dx + dy > 0.6 || d > 0.82;
      let c: string = lit ? '#B8B4A8' : dark ? '#5E6462' : '#8E9290';
      if (h01(x, y, seed) > 0.88) c = mix(c, '#6E6A5E', 0.6);
      if (dy < -0.35 && h01(x, y, seed + 3) > 0.6) c = mix(c, P.leafShade, 0.55);
      if (wet) c = mix(c, W_DEEP, wet);
      p.set(x, y, c);
    }
}

function riverImg(stage: number): HTMLCanvasElement {
  const s = Math.max(0, Math.min(3, stage));
  const key = s;
  let c = riverCache.get(key);
  if (c) return c;
  c = buildRiver(s);
  riverCache.set(key, c);
  return c;
}
const riverCache = new Map<number, HTMLCanvasElement>();

function buildRiver(stage: number): HTMLCanvasElement {
  const { w: Wd, h: Ht } = RIVER;
  const p = pc(Wd, Ht);
  const sky = SKY[stage] ?? SKY[0];
  const lean = stage === 2;

  // ---- the water: the pool above the weir (calm, mirrors the sky), the deep pool under it,
  //      the shallows further down where the bed shows
  for (let y = 0; y < Ht; y++)
    for (let x = 0; x < BANK_X + 2; x++) {
      let c: string;
      if (y < CREST) {
        // the pool: darker under the bridge, the sky's colour in long calm bands nearer the weir
        const k = y / CREST;
        c = mix(W_DEEP, W_MID, Math.min(1, k * 1.4));
        const band = valueNoise(x / 40, y / 3.2, 8101) + k * 0.35;
        if (band > 0.82) c = mix(c, sky, 0.5);
        else if (band > 0.7) c = mix(c, sky, 0.28);
        if (y < 6) c = mix(c, P.night, 0.55 - y * 0.08);
      } else if (y < FOAM1) {
        c = W_TOP;
      } else {
        // under the weir: the deep pool (deepest by the stone bank), then the shallows
        const deep = Math.max(0, 1 - Math.abs(y - 112) / 48) * (0.55 + 0.45 * (x / BANK_X));
        const shallow = Math.max(0, (y - 140) / 50);
        c = mix(W_MID, W_DEEP, deep * 0.9);
        c = mix(c, W_SHALLOW, shallow * 0.75);
        const band = valueNoise(x / 34, y / 4, 8103);
        if (band > 0.78) c = mix(c, sky, 0.3 * (1 - deep));
        else if (band < 0.18) c = mix(c, W_DEEP, 0.35);
      }
      p.set(x, y, c);
    }
  // the bed in the shallows: rounded stones under the water (greenish, blurred by it)
  for (let i = 0; i < 26; i++) {
    const cx = 6 + h01(i, 1, 8105) * 118;
    const cy = 132 + h01(i, 2, 8105) * 58;
    const r = 2.5 + h01(i, 3, 8105) * 4;
    const k = Math.max(0.25, 0.75 - (cy - 132) / 120);
    for (let y = Math.floor(cy - r * 0.7); y <= cy + r * 0.7; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = ((x - cx) / r) ** 2 + ((y - cy) / (r * 0.7)) ** 2;
        if (d > 1 || x < 0 || x >= BANK_X) continue;
        const top = y < cy - r * 0.2;
        p.set(x, y, mix(top ? '#9AA48E' : '#6E7A68', under(p, x, y), k));
      }
  }
  // a few stones that break the surface in the shallows, a white rill round each
  for (const [cx, cy, r] of [[22, 168, 4], [70, 182, 5], [98, 150, 3.5], [44, 140, 3]] as [number, number, number][]) {
    stone(p, cx, cy, r, r * 0.75, 8107 + cx);
    for (let a = 0; a < 7; a++) p.set(Math.round(cx - r + a * ((2 * r) / 6)), Math.round(cy - r * 0.75 - 1), a % 2 ? FOAM : mix(FOAM, W_TOP, 0.4));
    // the water piles up on the upstream side, a V of ripples trails downstream
    for (let k = 1; k < 6; k++) {
      p.set(Math.round(cx - r - k * 0.6), Math.round(cy + r * 0.4 + k * 2), mix(FOAM, W_TOP, 0.55));
      p.set(Math.round(cx + r + k * 0.6), Math.round(cy + r * 0.4 + k * 2), mix(FOAM, W_TOP, 0.55));
    }
  }

  // ---- the weir: the concrete step across the river (its crest, the lit edge), the water over it
  for (let x = 0; x < BANK_X; x++) {
    // the thin sheet of water gliding over the crest catches the sky
    p.set(x, CREST - 2, mix(W_MID, sky, 0.45));
    p.set(x, CREST - 1, mix(P.concreteLt, sky, 0.35));
    p.set(x, CREST, mix(P.white, SPRAY, 0.5));
    p.set(x, CREST + 1, P.concrete);
    p.set(x, CREST + 2, mix(P.concrete, W_MID, 0.35));
    // the falling face: white water in vertical streaks (the over() moves them)
    for (let y = FACE0; y < FACE1; y++) {
      const k = (y - FACE0) / (FACE1 - FACE0);
      const streak = ihash(x, 0, 8109) % 5;
      let c = streak === 0 ? FOAM : streak === 1 ? mix(FOAM, P.aqua, 0.35) : mix(P.aqua, W_TOP, 0.25 + k * 0.2);
      if (stage === 1) c = streak < 3 ? mix(FOAM, P.white, 0.4) : mix(FOAM, P.aqua, 0.25); // a white plate
      p.set(x + (lean ? Math.round(k * 2) : 0), y, c);
    }
    // the foam where it lands: lumps of white, thinning downstream
    for (let y = FACE1; y < FOAM1 + 10; y++) {
      const k = (y - FACE1) / (FOAM1 + 10 - FACE1);
      const n = valueNoise(x / 4, y / 2.5, 8111);
      if (n > 0.3 + k * 0.6) p.set(x, y, n > 0.55 + k * 0.4 ? FOAM : mix(FOAM, W_TOP, 0.5));
    }
  }
  // the weir's west part runs on off the map (the となり町 side): its far end is not seen

  // ---- the fish pass (tile 8, rows 6–8): a narrow concrete channel down the east end, three steps
  const fx0 = BANK_X;
  const fx1 = Wd - 1;
  for (let y = FISH_Y0; y < FISH_Y1; y++) {
    for (let x = fx0; x <= fx1; x++) {
      const wall = x <= fx0 + 1 || x >= fx1 - 1;
      p.set(x, y, wall ? (x === fx0 || x === fx1 - 1 ? P.concreteLt : P.concrete) : mix(W_MID, sky, 0.12));
    }
  }
  for (let i = 0; i < 4; i++) {
    // each step's little weir (a lit concrete lip) and the white spill under it
    const y = FISH_Y0 + 8 + i * 12;
    if (y >= FISH_Y1 - 2) break;
    p.hline(fx0 + 2, fx1 - 2, y, P.concreteLt);
    p.hline(fx0 + 2, fx1 - 2, y + 1, P.concrete);
    for (let x = fx0 + 3; x <= fx1 - 3; x++) {
      p.set(x, y + 2, (x + i) % 3 ? FOAM : mix(FOAM, P.aqua, 0.4));
      if ((x + i) % 2) p.set(x, y + 3, mix(FOAM, W_MID, 0.5));
    }
  }
  // the pass's wall joins the bank: a shadow line on its west side
  for (let y = FISH_Y0; y < FISH_Y1; y++) p.set(fx0 - 1, y, mix(under(p, fx0 - 1, y), P.ink, 0.35));

  // ---- the stone revetment (tile 8, rows 9–13): pitched stones sloping into the deep pool,
  //      dry and pale at the top (east), wet and dark where the water laps (west)
  for (let y = STONE_Y0; y < STONE_Y1; y++)
    for (let x = BANK_X - 2; x < Wd; x++) p.set(x, y, '#3A403E');
  let row = 0;
  for (let y = STONE_Y0 + 1; y < STONE_Y1 - 2; y += 6) {
    let x = BANK_X - 1 + (row % 2 ? 3 : 0);
    while (x < Wd + 3) {
      const w = 6 + (ihash(x, y, 8113) % 4);
      const wet = Math.max(0, 1 - (x - BANK_X) / 6) * 0.55;
      stone(p, x + w / 2, y + 2.6, w / 2, 2.8, 8115 + x + y * 7, wet);
      x += w + 1;
    }
    row++;
  }
  // the waterline at the foot of the stones: a wet dark seam and a thin lap of foam
  for (let y = STONE_Y0; y < STONE_Y1; y++) {
    p.set(BANK_X - 3, y, mix(W_DEEP, P.ink, 0.4));
    if (h01(0, y, 8117) > 0.55) p.set(BANK_X - 4, y, mix(FOAM, W_DEEP, 0.45));
  }
  // dark gaps between the stones under the water line (where the shrimp live)
  for (let i = 0; i < 9; i++) {
    const y = STONE_Y0 + 6 + i * 8 + (ihash(i, 3, 8119) % 4);
    p.hline(BANK_X - 2, BANK_X + 1, y, P.void);
  }

  // ---- the gravel bank going into the water (tile 8, rows 14–15)
  for (let y = STONE_Y1; y < Ht; y++)
    for (let x = BANK_X - 6; x < Wd; x++) {
      const edge = BANK_X - 2 + Math.round(valueNoise(0, y / 6, 8121) * 6) - Math.round((y - STONE_Y1) * 0.08);
      if (x < edge) continue;
      const n = h01(x, y, 8123);
      let c: string = n > 0.7 ? '#B8B09A' : n > 0.4 ? '#9A9282' : '#7E786C';
      if (x < edge + 3) c = mix(c, W_DEEP, 0.5 - (x - edge) * 0.12);
      p.set(x, y, c);
    }
  // a few round pebbles on it
  for (let i = 0; i < 5; i++) stone(p, BANK_X + 4 + (i % 3) * 4, STONE_Y1 + 6 + i * 5, 2, 1.5, 8125 + i);

  return p.toCanvas();
}

/** Animated water over the baked river (world px of the anchor's top-left). */
function riverOver(g: Gfx, x: number, y: number, env: PropEnv): void {
  const mt = env.mt;
  const s = env.stage;
  const lean = s === 2;
  // the falling water: streaks running down the face (stage 1: still, as baked)
  if (s !== 1) {
    for (let i = 0; i < BANK_X; i += 3) {
      const ph = (mt / 70 + ihash(i, 1, 8131) % 9) % 9;
      const yy = FACE0 + Math.floor(ph);
      if (yy >= FACE1) continue;
      const dx = lean ? Math.round(((yy - FACE0) / (FACE1 - FACE0)) * 2) : 0;
      g.px(x + i + dx, y + yy, SPRAY);
    }
  }
  // the foam: lumps that boil and drift away (stage 2: up to the north-east; stage 1 held)
  for (let i = 0; i < 46; i++) {
    const h = ihash(i, 7, 8133);
    const life = 1400 + (h % 900);
    const t = (mt + (h % 5000)) % life;
    const k = t / life;
    let fx = (h % BANK_X) + (lean ? k * 10 : Math.sin(k * 6 + i) * 1.5);
    let fy = FACE1 + 1 + k * (lean ? 4 : 20) + ((h >>> 8) % 4);
    if (lean) fy -= k * 6;
    fx = Math.round(fx);
    fy = Math.round(fy);
    if (fx < 0 || fx >= BANK_X - 3) continue;
    g.px(x + fx, y + fy, k < 0.6 ? SPRAY : FOAM);
    if (h % 3 === 0 && k < 0.5) g.px(x + fx + 1, y + fy, FOAM);
  }
  // spray over the foot of the falls: drops thrown up (held in the air in stage 1)
  for (let i = 0; i < 14; i++) {
    const h = ihash(i, 9, 8135);
    const per = 700 + (h % 500);
    const t = s === 1 ? (h % per) : (mt + (h % 3000)) % per;
    const k = t / per;
    const hx = (h % (BANK_X - 6)) + 2 + (lean ? Math.round(k * 7) : 0);
    const hy = FACE1 - Math.round(Math.sin(k * Math.PI) * (4 + (h % 4)));
    g.px(x + hx, y + hy, SPRAY);
  }
  // the current under the weir: light dashes drifting downstream (south), slow in the pool
  if (s !== 1) {
    for (let i = 0; i < 34; i++) {
      const h = ihash(i, 11, 8137);
      const sp = 8 + (h % 9);
      const yy = FOAM1 + ((Math.floor((mt / 1000) * sp) + (h % 120)) % (RIVER.h - FOAM1));
      const xx = (h >>> 6) % (BANK_X - 8) + Math.round(Math.sin((yy + i) / 9) * 1.5);
      const len = 2 + (h % 3);
      g.rect(x + xx, y + yy, 1, len, SPRAY, 0.35);
    }
    // the pool above: a few slow ripples moving to the weir (and into the intake on the east)
    for (let i = 0; i < 10; i++) {
      const h = ihash(i, 13, 8139);
      const yy = 8 + ((Math.floor(mt / 260) + (h % 40)) % (CREST - 12));
      const xx = (h >>> 5) % (BANK_X - 10);
      const toIntake = xx > 96 && yy < 32;
      g.rect(x + xx + (toIntake ? Math.floor(mt / 300) % 4 : 0), y + yy, 3 + (h % 3), 1, SPRAY, 0.3);
    }
  }
  // the fish pass: the spills flicker; now and then a little fish leaps up one step
  const fx0 = BANK_X + 3;
  for (let i = 0; i < 4; i++) {
    const yy = FISH_Y0 + 8 + i * 12 + 2;
    if (yy >= FISH_Y1) break;
    for (let j = 0; j < 4; j++) {
      const xx = fx0 + ((j * 3 + Math.floor(mt / 90) + i) % 10);
      g.px(x + xx, y + yy + (j % 2), SPRAY);
    }
  }
  {
    const per = 5200;
    const t = s === 1 ? 2350 : mt % per;
    if (t > 2000 && t < 2700) {
      const k = (t - 2000) / 700;
      const step = Math.floor(mt / per) % 3;
      const fy = FISH_Y0 + 20 + step * 12 - Math.round(Math.sin(k * Math.PI) * 6) - Math.round(k * 10);
      const fx = fx0 + 4 + (lean ? Math.round(k * 2) : 0);
      g.rect(x + fx, y + fy, 3, 1, '#9AA0A8');
      g.px(x + fx + 1, y + fy, P.glint);
      g.px(x + fx - 1, y + fy + 1, '#6B7186');
    }
  }
  // the deep pool by the stones: now and then a ring where something rises
  if (s !== 1) {
    const t = mt % 4600;
    if (t < 900) {
      const k = t / 900;
      const r = Math.round(2 + k * 7);
      const cx = BANK_X - 14;
      const cy = 110;
      for (let a = 0; a < 12; a++) {
        const th = (a / 12) * Math.PI * 2;
        g.px(x + Math.round(cx + Math.cos(th) * r), y + Math.round(cy + Math.sin(th) * r * 0.45), SPRAY);
      }
    }
  }
}

registerProp('prop_seki_river', () => ({
  ox: 0,
  oy: 0,
  w: RIVER.w,
  h: RIVER.h,
  foot: 0,
  flat: true,
  img: (env: PropEnv) => riverImg(env.stage),
  over: riverOver,
}));

// ================================================================ 橋の 欄干 prop_seki_bridge_n (0,0) / _s (0,3)

/** A concrete parapet along the bridge (x0–8): posts every 16px, a lit top, a dark rail slot. */
function parapet(south: boolean): HTMLCanvasElement {
  const Wd = 144 + 4;
  const H = south ? 30 : 16;
  const p = pc(Wd, H);
  const top = south ? 4 : 2;
  const bottom = top + 11;
  for (let x = 0; x < Wd - 4; x++) {
    p.set(x, top, P.white);
    p.set(x, top + 1, P.concreteLt);
    for (let y = top + 2; y <= bottom; y++) {
      const post = x % 16 < 3;
      let c: string = post ? P.concreteLt : y < top + 4 || y > bottom - 2 ? P.concrete : P.steel;
      if (!post && y >= top + 4 && y <= bottom - 3 && x % 4 === 1) c = P.charcoal; // the open slots of the balustrade
      if (h01(x, y, 8141) > 0.94) c = mix(c, P.asphalt, 0.4);
      p.set(x, y, c);
    }
    p.set(x, bottom + 1, P.asphalt);
  }
  if (south) {
    // the girder's south face under the deck, and its shadow on the water
    for (let x = 0; x < Wd - 4; x++) {
      for (let y = bottom + 2; y < bottom + 9; y++) p.set(x, y, y === bottom + 2 ? P.concrete : mix(P.steel, P.charcoal, (y - bottom - 2) / 9));
      if (x % 48 === 40) for (let y = bottom + 2; y < bottom + 9; y++) p.set(x, y, P.charcoal); // a drain spout
    }
    for (let x = 0; x < Wd - 4; x++) for (let y = bottom + 9; y < H; y++) p.set(x, y, P.night);
  }
  // the end post at the east end (the bridge's name post)
  const ex = 144 - 6;
  p.rect(ex, 0, 7, bottom + 1, P.concreteLt);
  p.hline(ex, ex + 6, 0, P.white);
  p.vline(ex + 6, 1, bottom, P.steel);
  p.rect(ex + 2, 3, 3, 7, P.brass);
  p.vline(ex + 3, 4, 9, P.brassOld);
  finish(p, { soft: true });
  // (the shadow band on the water is drawn on top of the outline: soft and dark)
  if (south) {
    const q = p.toCanvas();
    const ctx = q.getContext('2d')!;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = P.night;
    ctx.fillRect(0, bottom + 9, 144, H - bottom - 9);
    return q;
  }
  return p.toCanvas();
}

registerProp('prop_seki_bridge_n', (): PropArt => {
  const img = parapet(false);
  return { ox: 0, oy: 0, w: img.width, h: img.height, foot: 15, img: () => img, shadow: 10 };
});
registerProp('prop_seki_bridge_s', (): PropArt => {
  const img = parapet(true);
  return { ox: 0, oy: -4, w: img.width, h: img.height, foot: 11, img: () => img };
});

// ================================================================ 取水口と 水門 prop_seki_suimon (9,4)

registerProp('prop_seki_suimon', (): PropArt => {
  const Wd = 22;
  const H = 46;
  const p = pc(Wd, H);
  // the concrete frame round the mouth (two piers, a beam over them), the river side lit
  const base = H - 2;
  p.rect(1, 12, 4, base - 12, P.concreteLt);
  p.rect(16, 12, 4, base - 12, P.concrete);
  p.vline(1, 12, base - 1, P.white);
  p.vline(19, 12, base - 1, P.steel);
  p.rect(0, 8, 21, 6, P.concreteLt);
  p.hline(0, 20, 8, P.white);
  p.hline(0, 20, 13, P.steel);
  // the steel gate between the piers: ribbed, rusty at the bottom, half raised
  p.rect(5, 14, 11, 18, '#6E7A84');
  for (let y = 16; y < 32; y += 3) p.hline(5, 15, y, '#4E5A64');
  for (let y = 26; y < 32; y++) for (let x = 5; x < 16; x++) if (h01(x, y, 8151) > 0.6) p.set(x, y, P.brassOld);
  // the water going in under it (dark), a white lip
  p.rect(5, 32, 11, base - 32, P.night);
  p.hline(5, 15, 32, P.aqua);
  p.hline(6, 14, 33, '#2E5652');
  // the rack with the hand wheel on the beam
  p.vline(10, 1, 8, P.asphalt);
  p.vline(11, 1, 8, P.charcoal);
  p.ring(10, 4, 5, 2, P.verm);
  p.ring(10, 4, 4, 1, P.vermShade);
  p.set(6, 4, P.vermLt);
  // the chain round the wheel and two padlocks (夕鳴町 and となり町 each hold a key)
  for (let i = 0; i < 6; i++) p.set(12 + (i % 2), 5 + i, P.steel);
  p.rect(12, 10, 3, 3, P.brass);
  p.set(12, 10, P.goldPale);
  p.rect(15, 9, 3, 3, P.steel);
  p.set(15, 9, P.concreteLt);
  // the plate on the pier: white with two grey lines (『夕鳴町・となり町 水利組合』)
  p.rect(1, 18, 4, 9, P.white);
  p.vline(2, 19, 25, P.steel);
  p.vline(3, 20, 24, P.asphalt);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 10, base: 32, shadow: 30, contact: 18 });
});

// ================================================================ 案内板 prop_seki_annai (14,3)

registerProp('prop_seki_annai', (): PropArt => {
  const Wd = 26;
  const H = 26;
  const p = pc(Wd, H);
  // two brown posts, a white board with a blue title band and a little map of the river
  p.rect(4, 14, 2, 12, P.wood);
  p.rect(20, 14, 2, 12, P.wood);
  p.vline(4, 14, 25, P.woodLt);
  p.vline(20, 14, 25, P.woodLt);
  p.rect(1, 1, 24, 15, P.white);
  p.strokeRect(1, 1, 24, 15, P.steel);
  p.rect(2, 2, 22, 3, P.navy);
  p.hline(4, 20, 3, P.concreteLt);
  // the map: the river (a blue line from the top), the weir (white bar), the canal going east
  p.vline(7, 6, 14, P.blue);
  p.vline(8, 6, 14, P.aqua);
  p.hline(5, 10, 10, P.white);
  p.hline(9, 22, 8, P.aqua);
  // a mountain in the corner, with a little village dot (星見台)
  p.set(18, 13, P.leaf);
  p.hline(17, 19, 14, P.leaf);
  p.hline(16, 20, 15, P.leafShade);
  p.set(18, 12, P.verm);
  p.hline(11, 15, 12, P.asphalt);
  p.hline(11, 14, 14, P.asphalt);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 8, base: 16, shadow: 18, contact: 14 });
});

// ================================================================ 量水標 prop_seki_ryousui (7,6)

registerProp('prop_seki_ryousui', (): PropArt => {
  const p = pc(8, 34);
  // a white post with red and black marks every few px, a number plate at the top
  p.rect(2, 2, 4, 30, P.white);
  p.vline(5, 2, 31, P.concrete);
  for (let y = 4; y < 31; y += 2) p.hline(2, y % 10 === 4 ? 5 : 3, y, y % 10 === 4 ? P.verm : P.ink);
  p.rect(1, 0, 6, 3, P.concreteLt);
  finish(p, { soft: true });
  const img = p.toCanvas();
  const a = stand(img, { cx: 8, base: 20, shadow: 0, contact: 0 });
  a.over = (g: Gfx, x: number, y: number, env: PropEnv) => {
    // the water ring round the post's foot (a little higher on the north-east side in stage 2)
    const k = env.stage === 1 ? 0 : Math.floor(env.mt / 300) % 2;
    g.rect(x + 3 - k, y + 19, 6 + k * 2, 1, SPRAY, 0.6);
    if (env.stage === 2) g.rect(x + 8, y + 18, 2, 1, SPRAY, 0.6);
  };
  return a;
});

// ================================================================ 流木 prop_seki_ryuboku (13,12)

registerProp('prop_seki_ryuboku', (): PropArt => {
  const Wd = 36;
  const H = 14;
  const p = pc(Wd, H);
  // a bleached trunk lying east–west, a broken branch up, the root end splayed (east)
  for (let x = 2; x < 30; x++) {
    const th = 4 + Math.round(Math.sin(x / 6) * 0.6);
    const y0 = 6;
    for (let y = y0; y < y0 + th; y++) {
      const k = (y - y0) / th;
      let c: string = k < 0.3 ? '#E8E0CC' : k < 0.7 ? '#C8BCA2' : '#8E8470';
      if (h01(x, y, 8161) > 0.86) c = '#A89A80';
      if ((x * 3 + y) % 11 === 0) c = mix(c, '#6E6458', 0.4); // the grain
      p.set(x, y, c);
    }
  }
  for (let i = 0; i < 5; i++) p.line(30, 7 + i, 34, 4 + i * 2, i % 2 ? '#C8BCA2' : '#8E8470');
  p.line(12, 6, 16, 1, '#C8BCA2');
  p.line(13, 6, 17, 1, '#8E8470');
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 16, base: 15, shadow: 6, contact: 30 });
});

// ================================================================ 置き忘れの バケツ prop_seki_bucket (11,14)

registerProp('prop_seki_bucket', (): PropArt => {
  const p = pc(12, 12);
  // a yellow plastic bucket, its handle down, water and a pebble inside
  p.rect(2, 3, 8, 8, P.gold);
  p.vline(2, 3, 10, P.goldPale);
  p.vline(9, 3, 10, P.brass);
  p.ellipse(6, 3, 4, 1.5, P.brass);
  p.hline(3, 8, 3, '#4E7E72');
  p.set(6, 3, P.steel);
  p.line(1, 4, 0, 8, P.steel);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 8, base: 14, shadow: 8, contact: 10 });
});

// ================================================================ 河原の 丸い 石 prop_seki_stones (平ら)

registerProp('prop_seki_stones', (opts): PropArt => {
  const Wd = Number(opts.w ?? 4) * 16;
  const H = Number(opts.h ?? 3) * 16;
  const seed = Number(opts.seed ?? 1);
  const p = pc(Wd, H);
  const n = Math.round((Wd * H) / 180);
  for (let i = 0; i < n; i++) {
    const cx = 3 + h01(i, 1, 8171 + seed) * (Wd - 6);
    const cy = 3 + h01(i, 2, 8171 + seed) * (H - 6);
    const r = 1.6 + h01(i, 3, 8171 + seed) * 2.6;
    // a soft shadow to the lower right, then the stone
    for (let y = Math.floor(cy - r * 0.6) + 1; y <= cy + r * 0.6 + 1; y++)
      for (let x = Math.floor(cx - r) + 1; x <= cx + r + 1; x++) {
        const d = ((x - cx - 1) / r) ** 2 + ((y - cy - 1) / (r * 0.7)) ** 2;
        if (d <= 1) p.set(x, y, '#6E6A5E');
      }
    stone(p, cx, cy, r, r * 0.7, 8173 + i + seed * 31);
  }
  return flat(p.toCanvas(), 0, 0);
});
