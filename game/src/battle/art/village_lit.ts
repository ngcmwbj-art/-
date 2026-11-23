// cut_h_village_lit (52 12.1, 51 10.8): the finale's picture — from the
// plaza on 星見の丘 the whole village below, lit by the tomato Kanenari-kun
// holds up at the bottom of the frame. No villagers are drawn (50 10.15):
// buildings, fields and lights only. Looking south, so east (the barn) is on
// the left, west (the greenhouses) on the right; the nearest things — the
// terraced paddies whose scarecrows now face the hill — are at the bottom.
//
// The battle uses the UI team's picture when one is registered with
// registerBattleCut('cut_h_village_lit'); this is the battle's own.
//
// Built once: the scene is painted as albedo, then multiplied into a night
// version (pal_h2) and a tomato-lit version; the lit one is masked by a fan
// of light from the net and drawn over the night one. Per frame only the
// breathing of the light, the stars, the cue highlights and the net move.

import type { Gfx } from '../../engine/gfx';
import { BAYER4, makeCanvas, PixelCanvas, toRgb } from '../../engine/pixel';
import { hash2, Rng } from '../../engine/rng';

const W = 384;
const H = 216;

/** The net (the light's source) in the picture. */
const SRC_X = 192;
const SRC_Y = 206;

interface Built {
  night: HTMLCanvasElement;
  lit: HTMLCanvasElement;
  fg: HTMLCanvasElement;
  zones: Record<string, [number, number, number, number]>;
  stars: { x: number; y: number; c: string; ph: number }[];
}

let built: Built | null = null;

const NIGHT_MUL = toRgb('#605C96');
const LIT_MUL = toRgb('#FFC890');
const WARM = toRgb('#F2894B');

function mulPix(v: number, m: [number, number, number], add: [number, number, number] | null, k: number): number {
  const r = v & 255;
  const g = (v >>> 8) & 255;
  const b = (v >>> 16) & 255;
  let R = (r * m[0]) / 255;
  let G = (g * m[1]) / 255;
  let B = (b * m[2]) / 255;
  if (add) {
    R = R + (add[0] - R) * k;
    G = G + (add[1] - G) * k;
    B = B + (add[2] - B) * k;
  }
  return ((255 << 24) | (Math.min(255, B) << 16) | (Math.min(255, G) << 8) | Math.min(255, R)) >>> 0;
}

// ---- the scene -----------------------------------------------------------------------------

function paintSky(p: PixelCanvas, stars: Built['stars']): void {
  const top = toRgb('#0B0B14');
  const bot = toRgb('#1B1733');
  for (let y = 0; y < 104; y++) {
    const k = Math.min(1, y / 96);
    for (let x = 0; x < W; x++) {
      const d = (BAYER4[y & 3][x & 3] + 0.5) / 16 - 0.5;
      const kk = Math.max(0, Math.min(1, k + d * 0.12));
      const r = top[0] + (bot[0] - top[0]) * kk;
      const g = top[1] + (bot[1] - top[1]) * kk;
      const b = top[2] + (bot[2] - top[2]) * kk;
      p.set(x, y, ((255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0);
    }
  }
  // the Milky Way, upper left → lower right: a soft band of #3A2B5C with #7A5AA0 grains
  for (let y = 0; y < 90; y++)
    for (let x = 0; x < W; x++) {
      const along = (x - 20) * 0.28 - y;
      const d = Math.abs(along + 8) / 22;
      if (d > 1) continue;
      const n = hash2(x >> 1, y >> 1, 41) * 0.6 + hash2(x, y, 42) * 0.4;
      const dens = (1 - d) * (0.55 + 0.45 * Math.sin(x / 23 + y / 11));
      if (BAYER4[y & 3][x & 3] < dens * 9) p.set(x, y, '#241C3E');
      if (n > 0.9 - dens * 0.14) p.set(x, y, dens > 0.55 ? '#7A5AA0' : '#3A2B5C');
    }
  // stars (twinkled at draw time); the morning star sits low in the east (left)
  const r = new Rng(9);
  while (stars.length < 60) {
    const x = r.int(2, W - 3);
    const y = r.int(2, 66);
    if (Math.abs(x - 28) < 6 && Math.abs(y - 64) < 6) continue;
    stars.push({ x, y, c: stars.length % 6 === 0 ? '#C8C2B4' : '#FFF6D8', ph: r.range(0, 6.28) });
  }
}

/** Three ridges (farther = paler), and Yunari's glow behind the west ridge. */
function paintRidges(p: PixelCanvas): void {
  // Yunari town's light seeping over the mountains to the west (right)
  for (let y = 50; y < 96; y++)
    for (let x = 250; x < W; x++) {
      const dx = (x - 336) / 70;
      const dy = (y - 84) / 22;
      const d = dx * dx + dy * dy;
      if (d < 1 && BAYER4[y & 3][x & 3] < (1 - d) * 11) p.set(x, y, '#3A2B5C');
    }
  const r1 = (x: number) => 70 + 5 * Math.sin(x / 37 + 1) + 3 * Math.sin(x / 13) - 4 * Math.exp(-(((x - 150) / 60) ** 2));
  const r2 = (x: number) => 80 + 6 * Math.sin(x / 45 + 2.2) + 2 * Math.sin(x / 9 + 1) - 6 * Math.exp(-(((x - 300) / 40) ** 2));
  const r3 = (x: number) => 92 + 4 * Math.sin(x / 31 + 0.5) + 1.5 * Math.sin(x / 7);
  for (let x = 0; x < W; x++) {
    // keep the east's low sky clear around the morning star
    const a = Math.round(x < 44 ? Math.max(r1(x), 68 + (44 - x) * 0.05) : r1(x));
    for (let y = a; y < 104; y++) p.set(x, y, y === a ? '#3A3456' : '#2A2440');
    const b = Math.round(r2(x));
    for (let y = b; y < 104; y++) p.set(x, y, y === b ? '#2A2440' : '#221C38');
    const c = Math.round(r3(x));
    for (let y = c; y < 104; y++) p.set(x, y, y === c ? '#221C38' : '#1B1733');
  }
  // cedars along the nearest ridge
  for (let x = 4; x < W; x += 5 + (hash2(x, 3, 5) * 5) | 0) {
    const base = Math.round(r3(x));
    const h = 4 + Math.round(hash2(x, 4, 6) * 5);
    for (let i = 0; i < h; i++) {
      const hw = Math.floor((i / h) * 2.2);
      p.hline(x - hw, x + hw, base - h + i, '#171329');
    }
  }
  // the town's lights, six specks just over the west ridge
  for (const [x, y] of [[318, 84], [326, 86], [331, 83], [340, 85], [347, 87], [356, 84]] as [number, number][]) {
    const top = Math.round(r2(x));
    p.set(x, Math.min(y, top - 1), '#F6D98A');
  }
}

/** The valley (albedo; lit and night versions are made from it). */
function paintValley(a: PixelCanvas, rim: PixelCanvas, emi: PixelCanvas, zones: Built['zones']): void {
  // ground: far fields to near terraces, a little lighter toward us
  for (let y = 94; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = hash2(x >> 2, y >> 1, 3);
      const near = (y - 94) / 122;
      let c = n < 0.5 ? '#3F7A3A' : '#4A8A44';
      if (y < 104) c = n < 0.5 ? '#2E5A34' : '#355F38';
      if (hash2(x, y, 7) < 0.05 + near * 0.04) c = '#5FA85A';
      a.set(x, y, c);
    }
  // the prefectural road across the far valley, the platform and the rails
  const roadY = (x: number) => Math.round(106 + 2 * Math.sin(x / 70));
  for (let x = 0; x < W; x++) {
    const y = roadY(x);
    a.hline(x, x, y, '#6B7186');
    a.set(x, y + 1, '#565B6E');
    if (x % 9 < 4 && x > 60 && x < 330) a.set(x, y, '#C8C2B4');
  }
  // station platform (far, centre-right) and rails
  a.rect(104, 99, 176, 3, '#9AA0A8');
  a.hline(104, 279, 99, '#C8C2B4');
  a.hline(96, 290, 97, '#565B6E');
  for (let x = 96; x < 290; x += 3) a.set(x, 96, '#8A6A4A');
  emi.set(150, 98, '#F6D98A');
  emi.set(236, 98, '#F6D98A');
  zones.station = [100, 94, 190, 10];
  // the village bus at the turnaround (a dark green band, windows dark)
  a.rect(148, 102, 14, 5, '#E8E4D8');
  a.hline(148, 161, 105, '#3F7A3A');
  a.hline(149, 160, 103, '#4A5A6A');
  a.set(149, 107, '#2A2440');
  a.set(159, 107, '#2A2440');
  rim.hline(148, 161, 102, '#F7C27A');

  // ---- east plateau: 石黒牛舎 (left), on a stone wall ----
  const bx = 34;
  const by = 118;
  // stone wall under the plateau
  for (let y = by + 18; y < by + 26; y++)
    for (let x = bx - 10; x < bx + 78; x++) a.set(x, y, (x + (y & 1) * 3) % 6 === 0 || y % 3 === 0 ? '#6B6A74' : '#9AA0A8');
  // the barn: long low body, a gable roof with the monitor (越屋根) on top
  a.rect(bx, by + 6, 66, 12, '#C8C2B4');
  for (let x = bx; x < bx + 66; x += 6) a.vline(x, by + 6, by + 17, '#A8A294');
  a.poly([[bx - 3, by + 7], [bx + 69, by + 7], [bx + 60, by], [bx + 6, by]], '#8E95A6');
  a.hline(bx + 6, bx + 60, by, '#C8CDD4');
  a.rect(bx + 16, by - 4, 34, 4, '#8E95A6');
  a.hline(bx + 16, bx + 49, by - 4, '#C8CDD4');
  for (let x = bx + 18; x < bx + 48; x += 4) a.set(x, by - 2, '#4A4F58');
  // wall fans (three dark discs) and the open end
  for (const fx of [bx + 8, bx + 30, bx + 52]) {
    a.circle(fx + 3, by + 11, 2, '#4A4F58');
    a.set(fx + 3, by + 11, '#9AA0A8');
  }
  a.rect(bx + 62, by + 9, 4, 9, '#2A2440');
  // 「牛舎に、明かり。」: the lights inside show through the monitor and the end door
  for (let x = bx + 18; x < bx + 48; x += 4) emi.set(x, by - 2, '#F6D98A');
  emi.rect(bx + 63, by + 10, 2, 7, '#F2894B');
  emi.set(bx + 64, by + 12, '#FFE7A3');
  rim.hline(bx - 3, bx + 69, by + 7, '#F2894B');
  rim.hline(bx + 16, bx + 49, by - 4, '#F7C27A');
  rim.hline(bx, bx + 65, by + 17, '#F2894B');
  // the old farm road from the barn up toward us
  for (let y = by + 26; y < 196; y++) {
    const x = Math.round(bx + 70 + (y - by - 26) * 0.55);
    a.hline(x - 2, x + 2, y, (y & 3) ? '#8A6A4A' : '#A8742A');
  }
  zones.barn = [bx - 4, by - 6, 76, 34];

  // ---- the settlement: houses, and the old branch school in the middle ----
  const house = (x: number, y: number, w: number, roof: string, lit: boolean) => {
    a.rect(x, y + 4, w, 6, '#E8E4D8');
    a.poly([[x - 2, y + 5], [x + w + 2, y + 5], [x + w - 2, y], [x + 2, y]], roof);
    a.hline(x + 2, x + w - 3, y, '#C8CDD4');
    a.rect(x + Math.round(w / 2) - 1, y + 6, 2, 4, '#5E574E');
    if (lit) emi.rect(x + 2, y + 6, 3, 2, '#F6D98A');
    rim.hline(x - 2, x + w + 1, y + 5, '#F2894B');
    rim.hline(x, x + w - 1, y + 9, '#F7C27A');
  };
  house(118, 114, 16, '#6B7186', false);
  house(142, 118, 14, '#8A4A3A', false);
  house(252, 116, 18, '#6B7186', false);
  house(276, 112, 14, '#8E867A', false);
  house(128, 128, 18, '#6B7186', true);
  house(262, 128, 16, '#8A4A3A', false);
  // the school (集会所): a long single-storey wooden building, its windows warm
  const sx = 170;
  const sy = 116;
  a.rect(sx, sy + 6, 62, 12, '#A8804A');
  for (let x = sx; x < sx + 62; x += 3) a.vline(x, sy + 6, sy + 17, '#8A6A3A');
  a.poly([[sx - 3, sy + 7], [sx + 65, sy + 7], [sx + 58, sy], [sx + 4, sy]], '#6B7186');
  a.hline(sx + 4, sx + 57, sy, '#C8CDD4');
  // the little bell tower at the west end
  a.rect(sx + 50, sy - 7, 6, 7, '#A8804A');
  a.poly([[sx + 48, sy - 6], [sx + 58, sy - 6], [sx + 53, sy - 11]], '#6B7186');
  for (let i = 0; i < 8; i++) {
    const wx = sx + 3 + i * 7;
    a.rect(wx, sy + 9, 5, 5, '#2A2440');
    emi.rect(wx, sy + 9, 5, 5, i === 1 || i === 2 ? '#FFE7A3' : '#F6D98A');
    emi.vline(wx + 2, sy + 9, sy + 13, '#C8904A');
  }
  rim.hline(sx - 3, sx + 64, sy + 7, '#F2894B');
  rim.hline(sx, sx + 61, sy + 17, '#F7C27A');
  // the schoolyard below it (pale earth) with the memorial stone
  for (let y = sy + 19; y < sy + 30; y++) a.hline(sx - 4 + (y - sy - 19), sx + 66 - (y - sy - 19), y, (hash2(y, 1, 9) < 0.3) ? '#C8A06A' : '#B8905A');
  a.rect(sx + 8, sy + 22, 2, 4, '#9AA0A8');
  zones.school = [sx - 6, sy - 12, 74, 44];

  // ---- the canal (用水路), catching the light ----
  const canalY = (x: number) => Math.round(150 + 3 * Math.sin(x / 60 + 0.6));
  for (let x = 0; x < W; x++) {
    const y = canalY(x);
    a.hline(x, x, y, '#1B1733');
    a.set(x, y + 1, '#8E867A');
    // reflection of the light: warmer the nearer to the centre
    if (Math.abs(x - SRC_X) < 150 && (x + (x >> 3)) % 3 !== 0) rim.set(x, y, Math.abs(x - SRC_X) < 60 ? '#FFE7A3' : '#F2894B');
  }

  // ---- west slope: 3 greenhouses (right), film glowing orange ----
  for (let i = 0; i < 3; i++) {
    const gx = 300 + i * 26;
    const gy = 118 + i * 4;
    const gw = 20;
    const gh = 22;
    for (let y = 0; y < gh; y++) {
      const hw = Math.round(Math.sqrt(Math.max(0, 1 - ((y - gh) / gh) ** 2)) * gw * 0.5);
      for (let x = -hw; x <= hw; x++) {
        const hoop = (y % 5 === 0);
        a.set(gx + x, gy + gh - 8 + Math.round(y * 0.36) - 8, hoop ? '#C8CDD4' : '#E8ECF0');
      }
    }
    // the film glows from within where the light gets through (3号 brightest)
    for (let y = gy - 4; y < gy + 14; y++)
      for (let x = gx - 9; x <= gx + 9; x++)
        if (a.alpha(x, y) && (x + y) % 2 === 0) rim.set(x, y, i === 2 ? '#F7C27A' : '#F2894B');
    rim.hline(gx - 9, gx + 9, gy + 13, '#FFE7A3');
  }
  zones.house = [286, 104, 90, 42];

  // ---- the terraces (棚田) near us, their water reflecting stars and the light ----
  for (let t = 0; t < 5; t++) {
    const y0 = 160 + t * 8;
    for (let x = 150; x < W; x++) {
      const curve = Math.round(3 * Math.sin((x - 150) / 40 + t));
      const yy = y0 + curve;
      a.hline(x, x, yy, '#3F5A3A');
      a.set(x, yy + 1, '#6B5A4A');
      for (let k = 2; k < 7; k++) a.set(x, yy + k, hash2(x, yy + k, 12) < 0.04 ? '#F4F1E8' : k < 4 ? '#2A3A5A' : '#3A4A6A');
      if ((x + t * 7) % 4 === 0) a.set(x, yy - 1, '#C9E08A');
      if ((x - SRC_X) ** 2 < 170 ** 2 && (x + yy) % 4 === 0) rim.set(x, yy + 3, '#F2894B');
    }
  }
  // scarecrows, now facing the hill (us)
  for (const [x, y] of [[214, 168], [262, 176], [318, 164]] as [number, number][]) {
    a.vline(x, y, y + 8, '#C8B87A');
    a.hline(x - 3, x + 3, y + 3, '#C8B87A');
    a.rect(x - 2, y - 3, 5, 4, '#F4F1E8');
    a.set(x - 1, y - 2, '#2A2440');
    a.set(x + 1, y - 2, '#2A2440');
    a.hline(x - 1, x + 1, y, '#2A2440');
    a.hline(x - 3, x + 3, y - 4, '#E8C878');
    rim.set(x - 3, y - 4, '#FFE7A3');
    rim.vline(x - 2, y - 3, y, '#F7C27A');
  }
  zones.tanada = [150, 152, 234, 44];
  // the overgrown field on the left, dark with kudzu
  for (let y = 150; y < 200; y++)
    for (let x = 0; x < 150 - (y - 150) * 0.2; x++) if (hash2(x >> 1, y >> 1, 21) < 0.5) a.set(x, y, hash2(x, y, 22) < 0.1 ? '#8A4A6A' : '#2E5A34');
}

function paintForeground(f: PixelCanvas): void {
  // the plaza's edge: grass and a wooden rail in silhouette
  for (let x = 0; x < W; x++) {
    const top = 198 + Math.round(3 * Math.sin(x / 17) + 2 * Math.sin(x / 5.3));
    for (let y = top; y < H; y++) f.set(x, y, '#0B0B14');
    if (hash2(x, 1, 30) < 0.35) {
      const h = 2 + Math.round(hash2(x, 2, 31) * 6);
      f.vline(x, top - h, top, '#0B0B14');
    }
  }
  // the rail: posts and two bars
  for (const px of [18, 70, 122, 262, 314, 366]) f.rect(px, 186, 3, 30, '#0B0B14');
  f.rect(0, 189, 150, 2, '#0B0B14');
  f.rect(236, 189, 148, 2, '#0B0B14');
  f.rect(0, 199, 150, 2, '#0B0B14');
  f.rect(236, 199, 148, 2, '#0B0B14');
}

function build(): Built {
  const stars: Built['stars'] = [];
  const zones: Built['zones'] = {};
  const sky = new PixelCanvas(W, H);
  const alb = new PixelCanvas(W, H);
  const rim = new PixelCanvas(W, H);
  const emi = new PixelCanvas(W, H);
  const fgp = new PixelCanvas(W, H);
  paintSky(sky, stars);
  paintRidges(sky);
  paintValley(alb, rim, emi, zones);
  paintForeground(fgp);
  // night: the sky, the valley × pal_h2, the lights
  const [night, nctx] = makeCanvas(W, H);
  const [lit, lctx] = makeCanvas(W, H);
  const nImg = nctx.createImageData(W, H);
  const lImg = lctx.createImageData(W, H);
  const n32 = new Uint32Array(nImg.data.buffer);
  const l32 = new Uint32Array(lImg.data.buffer);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const av = alb.data[i];
      const sv = sky.data[i];
      let nv = sv;
      if (av >>> 24) nv = mulPix(av, NIGHT_MUL, null, 0);
      const ev = emi.data[i];
      if (ev >>> 24) nv = ev;
      n32[i] = nv || 0xff140b0b;
      // the fan of light from the net (bottom centre): strongest near, soft rim, up to α45%
      if (!(av >>> 24)) continue;
      const dx = (x - SRC_X) / 250;
      const dy = (SRC_Y - y) / 130;
      const d = Math.sqrt(dx * dx + dy * dy);
      let L = Math.max(0, 1 - d);
      L = L * L * (3 - 2 * L);
      if (y < 100) L *= Math.max(0, (y - 92) / 8);
      if (L <= 0.02) continue;
      const k = Math.min(1, L * 1.25);
      const steps = 8;
      const q = Math.floor(k * steps + ((BAYER4[y & 3][x & 3] + 0.5) / 16 - 0.5)) / steps;
      if (q <= 0) continue;
      const rv = rim.data[i];
      let lv = rv >>> 24 ? rv : mulPix(av, LIT_MUL, WARM, 0.14);
      if (ev >>> 24) lv = ev;
      const al = Math.round(255 * 0.45 * Math.min(1, q) * (rv >>> 24 ? 1.8 : 1));
      l32[i] = ((Math.min(255, al) << 24) | (lv & 0xffffff)) >>> 0;
    }
  nctx.putImageData(nImg, 0, 0);
  lctx.putImageData(lImg, 0, 0);
  return { night, lit, fg: fgp.toCanvas(), zones, stars };
}

/** Which zones light up with which line (「牛舎に、明かり。」 → barn; 「ハウス。集会所。棚田。」). */
const CUE_ZONES: Record<number, string[]> = { 1: ['barn'], 2: ['house', 'school', 'tanada'] };

const cueSeen = new Map<number, number>();
let lastT = -1;

/**
 * Draw the picture at `t` ms since it appeared; `cue` = index of the line
 * being read (its buildings flash one step brighter for 0.3s, in turn).
 */
export function drawVillageLit(g: Gfx, t: number, cue: number): void {
  built ??= build();
  const b = built;
  if (t < lastT) cueSeen.clear();
  lastT = t;
  if (!cueSeen.has(cue)) cueSeen.set(cue, t);
  const ctx = g.ctx;
  ctx.drawImage(b.night, 0, 0);
  // stars twinkle (the morning star does not)
  for (const s of b.stars) {
    const tw = 0.5 + 0.5 * Math.sin(t / 700 + s.ph * 3);
    if (tw < 0.2) continue;
    g.alpha(0.5 + 0.5 * tw, () => g.px(s.x, s.y, s.c));
  }
  g.rect(28, 64, 2, 2, '#FFF6D8');
  // the light arrives front to back over the cross-fade (0.8s), then breathes (0.8Hz, ±4%)
  const reveal = Math.min(1, t / 800);
  const breath = 1 + 0.04 * Math.sin((t / 1000) * Math.PI * 2 * 0.8);
  const edge = Math.round(H - reveal * (H - 88));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, edge, W, H - edge);
  ctx.clip();
  ctx.globalAlpha = Math.min(1, 0.92 * breath);
  ctx.drawImage(b.lit, 0, 0);
  ctx.restore();
  // this line's buildings flash one step brighter (0.3s each, in turn)
  const list = CUE_ZONES[cue];
  const t0 = cueSeen.get(cue) ?? t;
  if (list) {
    list.forEach((z, i) => {
      const dt = t - t0 - i * 350;
      if (dt < 0 || dt > 300) return;
      const r = b.zones[z];
      if (!r) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * (1 - dt / 300);
      ctx.drawImage(b.lit, r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3]);
      ctx.restore();
    });
  }
  // the warm air over it all, from the net
  const grad = ctx.createRadialGradient(SRC_X, SRC_Y, 4, SRC_X, SRC_Y, 230);
  grad.addColorStop(0, `rgba(255,231,163,${0.3 * breath})`);
  grad.addColorStop(0.35, `rgba(242,137,75,${0.12 * breath})`);
  grad.addColorStop(1, 'rgba(242,137,75,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 88, W, H - 88);
  ctx.restore();
  ctx.drawImage(b.fg, 0, 0);
  // the pole's tip and the glowing net at the bottom centre
  g.rect(191, 202, 2, 14, '#0B0B14');
  const pulse = 0.85 + 0.15 * Math.sin((t / 1000) * Math.PI * 2 * 0.8);
  g.alpha(0.35 * pulse, () => g.circle(SRC_X, 198, 9, '#F2894B'));
  g.alpha(0.6 * pulse, () => g.circle(SRC_X, 198, 5, '#FFE7A3'));
  g.circle(SRC_X, 198, 3, '#E84E3C');
  g.rect(SRC_X - 1, 196, 2, 1, '#FFF6D8');
  g.px(SRC_X, 194, '#3FA66B');
  for (let i = -4; i <= 4; i += 2) g.px(SRC_X + i, 198 + (Math.abs(i) >> 1), '#F4F1E8');
}
