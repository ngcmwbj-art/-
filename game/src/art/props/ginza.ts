// 夕鳴銀座の小物 (30_level_art 6.5 銀座 / 8.2 / 8.3): the welcome arch,
// arcade pillars with lanterns and nobori flags, gacha machines, vending
// machines, the clock-shop window, the family photo, the police lamp...

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas, mix } from '../../engine/pixel';
import { charSprite, idleFrame } from '../chars';
import { P } from '../tiles/palette';
import { ihash } from '../tiles/noise';
import { castRight, cylinder, dk, finish, glassPane, lt, maskOf, shadeRect } from './kit';
import { flat, floatOffset, mkFrames, stand, standAnim } from './pkit';
import { registerProp } from './registry';
import { drawLight, halo, LIGHT, poolEllipse } from './light';
import { fontText, fontTextSmall, handGlyph, led, printLines, scribble, tiny } from './text';
import type { PropArt, PropEnv } from './types';

const pc = (w: number, h: number) => new PixelCanvas(w, h);

// ---------------------------------------------------------------- lanterns (提灯)

function lantern(p: PixelCanvas, x: number, y: number, glyph: string | null, dim = false): void {
  // 10×14 red & white paper lantern
  p.rect(x + 3, y, 4, 2, P.charcoal);
  p.ellipse(x + 5, y + 7, 5, 5.5, dim ? P.vermShade : P.red);
  for (let j = y + 3; j < y + 13; j += 3) p.hline(x + 1, x + 9, j, dim ? P.maroon : P.vermShade);
  p.ellipse(x + 3.5, y + 5.5, 1.5, 2.5, dim ? P.red : P.vermLt);
  p.rect(x + 3, y + 12, 4, 2, P.charcoal);
  if (glyph === '銀') handGlyph(p, '銀', x + 2, y + 4, dim ? P.maroon : P.nightShade);
  else if (glyph) p.rect(x + 4, y + 5, 3, 4, P.white);
}

const LANTERN = mkFrames(2, 12, 16, (p, k) => lantern(p, 1 + (k === 1 ? 1 : 0), 1, null), (p) => finish(p, { soft: true, rim: false }));

// ---------------------------------------------------------------- 歓迎アーチ obj_arch_sign (23,21) + south post (23,26)

function pipePost(h: number): PixelCanvas {
  const p = pc(8, h);
  cylinder(p, 2, 0, 4, h, P.asphalt);
  for (let y = 4; y < h; y += 11) p.hline(1, 6, y, P.steel);
  for (let y = 0; y < h; y++) if (ihash(3, y, 2201) % 7 === 0) p.set(4, y, P.brassOld); // rust
  p.rect(0, h - 3, 8, 3, P.charcoal);
  p.hline(0, 7, h - 3, P.asphalt);
  finish(p, { soft: true });
  return p;
}

let ARCH_BOARD: HTMLCanvasElement | null = null;
/** Welcome-arch board (80×30): 「ようこそ」 small, 「夕鳴銀座」 at full size (readable), a newer 「へ」. */
const ARCH_W = 80;
const ARCH_H = 30;
function archBoard(): HTMLCanvasElement {
  if (ARCH_BOARD) return ARCH_BOARD;
  const p = pc(ARCH_W, ARCH_H);
  // steel frame with bulbs, board facing the screen
  p.rect(1, 1, ARCH_W - 2, ARCH_H - 4, P.steel);
  p.rect(3, 3, ARCH_W - 6, ARCH_H - 8, P.white);
  p.hline(3, ARCH_W - 4, 3, P.glint);
  fontTextSmall(p, 'ようこそ', 6, 4, P.verm, 1);
  fontText(p, '夕鳴銀座', 5, 11, P.navy, { shadow: P.concrete });
  // 「へ」 painted newer (brighter white patch)
  p.rect(69, 13, 8, 9, P.glint);
  fontTextSmall(p, 'へ', 69, 14, P.navy, 1);
  printLines(p, 42, 6, 24, 1, P.concrete, 3);
  for (let x = 3; x < ARCH_W - 2; x += 5) {
    p.set(x, 1, P.goldPale);
    p.set(x, ARCH_H - 4, P.goldPale);
  }
  p.hline(0, ARCH_W - 1, ARCH_H - 3, P.charcoal);
  p.hline(0, ARCH_W - 1, ARCH_H - 2, P.asphalt);
  // hangers
  p.vline(14, ARCH_H - 2, ARCH_H - 1, P.steel);
  p.vline(ARCH_W - 14, ARCH_H - 2, ARCH_H - 1, P.steel);
  finish(p, { soft: true });
  ARCH_BOARD = p.toCanvas();
  return ARCH_BOARD;
}

registerProp('obj_arch_sign', () => {
  const post = pipePost(60).toCanvas();
  const beamH = 5 * 16;
  const beam = (() => {
    const p = pc(4, beamH + 2);
    p.vline(1, 0, beamH + 1, P.steel);
    p.vline(2, 0, beamH + 1, P.asphalt);
    for (let y = 6; y < beamH; y += 10) p.hline(0, 3, y, P.charcoal);
    return p.toCanvas();
  })();
  const topY = 16 - 60; // post top relative to the tile
  const boardY = topY + 26;
  const LY = boardY + ARCH_H - 1; // lanterns hang under the board
  const a = stand(post, { cx: 8, shadow: 60, contact: 6 });
  a.fg = [
    { ox: 6, oy: topY, img: () => beam },
    { ox: 8 - ARCH_W / 2, oy: boardY, img: () => archBoard() },
    {
      ox: 8 - 28,
      oy: LY,
      img: (env: PropEnv) => LANTERN_ARCH[env.stage === 1 ? 0 : env.stage >= 2 ? 0 : Math.floor(env.mt / 800) % 2],
    },
    {
      ox: 8 + 16,
      oy: LY,
      img: (env: PropEnv) => LANTERN_ARCH2[env.stage === 1 ? 0 : env.stage >= 2 ? 0 : Math.floor(env.mt / 800 + 0.5) % 2],
    },
  ];
  a.glowFg = true;
  a.light = (g, x, y, env) => {
    const n = env.grade.night;
    if (n > 0.05) drawLight(g, poolEllipse(44, 18, LIGHT.lamp), x + 8, y + 12, 0.5 * n);
  };
  a.glow = (g, x, y, env) => {
    const n = env.grade.night;
    // stage 2: only the 銀 lantern glows; night: all + bulbs
    if (env.stage === 2) glowBlob(g, x + 8 - 28 + 6, y + LY + 8, 10, 0.35);
    if (n > 0.05) {
      glowBlob(g, x + 8 - 28 + 6, y + LY + 8, 12, 0.45 * n);
      glowBlob(g, x + 8 + 16 + 6, y + LY + 8, 12, 0.45 * n);
      const ctx = g.ctx;
      ctx.save();
      ctx.globalAlpha = n;
      ctx.fillStyle = P.horizon;
      for (let k = 3; k < ARCH_W - 2; k += 5) {
        ctx.fillRect(Math.round(x + 8 - ARCH_W / 2 + k), Math.round(y + boardY + 1), 1, 1);
        ctx.fillRect(Math.round(x + 8 - ARCH_W / 2 + k), Math.round(y + boardY + ARCH_H - 4), 1, 1);
      }
      ctx.restore();
    }
  };
  return a;
});

const LANTERN_ARCH = mkFrames(2, 14, 16, (p, k) => lantern(p, 2 + (k ? 1 : 0), 1, '銀', true), (p) => finish(p, { soft: true, rim: false }));
const LANTERN_ARCH2 = mkFrames(2, 14, 16, (p, k) => lantern(p, 2 - (k ? 1 : 0), 1, 'x'), (p) => finish(p, { soft: true, rim: false }));

registerProp('prop_arch_post', () => stand(pipePost(60).toCanvas(), { cx: 8, shadow: 60, contact: 6 }));

function glowBlob(g: Gfx, x: number, y: number, r: number, a: number): void {
  const ctx = g.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const grd = ctx.createRadialGradient(x, y, 1, x, y, r);
  grd.addColorStop(0, `rgba(255,231,163,${a})`);
  grd.addColorStop(0.5, `rgba(242,137,75,${a * 0.5})`);
  grd.addColorStop(1, 'rgba(242,137,75,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// ---------------------------------------------------------------- アーケードの柱 + のぼり旗

const BANNERS: Record<string, { bg: string; fg: string; text: string }> = {
  matsuri: { bg: P.red, fg: P.white, text: '夏まつり' },
  dagashi: { bg: P.gold, fg: P.verm, text: '駄菓子' },
  tofu: { bg: P.navy, fg: P.white, text: 'とうふ' },
  clock: { bg: P.leafDeep, fg: P.white, text: '時計修理' },
  korokke: { bg: P.white, fg: P.red, text: 'コロッケ' },
};

function nobori(kind: string, k: number): PixelCanvas {
  // 14×38 flag on a pole; k: 0..3 flutter, 4 = leaning north-east (stage 2)
  const b = BANNERS[kind] ?? BANNERS.matsuri;
  const p = pc(16, 40);
  p.vline(1, 0, 39, P.steel);
  p.set(1, 0, P.glint);
  p.hline(1, 13, 2, P.steel);
  const text = pc(12, 34);
  text.rect(0, 0, 12, 34, b.bg);
  text.vline(0, 0, 33, lt(b.bg));
  text.vline(11, 0, 33, dk(b.bg));
  // vertical text (4 glyphs at 8px: the flag is short enough to sit beside a 2.5-tile pillar)
  let yy = 1;
  for (const ch of b.text) {
    fontTextSmall(text, ch, 2, yy, b.fg, 1);
    yy += 8;
  }
  // chichi (loops) on the pole side
  for (let j = 2; j < 34; j += 6) text.set(0, j, P.white);
  for (let j = 0; j < 34; j++) {
    const wave = k === 4 ? (j > 17 ? 1 : 0) : Math.round(Math.sin(j / 5 + k * 1.6) * (j / 34) * 1.6);
    const lift = k === 4 ? -Math.floor(j / 12) : 0;
    for (let i = 0; i < 12; i++) {
      const v = text.get(i, j);
      if (!(v >>> 24)) continue;
      p.set(2 + i + wave, 3 + j + lift, v);
    }
  }
  finish(p, { soft: true });
  return p;
}

const NOBORI_CACHE = new Map<string, HTMLCanvasElement[]>();
function noboriFrames(kind: string): HTMLCanvasElement[] {
  let f = NOBORI_CACHE.get(kind);
  if (!f) {
    f = [0, 1, 2, 3, 4].map((k) => nobori(kind, k).toCanvas());
    NOBORI_CACHE.set(kind, f);
  }
  return f;
}

/** Pillar height (px): 2.5 tiles, so its top stays south of the y22 shop fronts. */
const PILLAR_H = 42;

registerProp('prop_arcade_pillar', (opts) => {
  const kind = String(opts.banner ?? 'matsuri');
  const H = PILLAR_H;
  // image: lantern bracket on the west (x 0..11), the column (x 10..19)
  const p = pc(22, H);
  const c0 = 10;
  // steel H-column with a riveted capital
  p.rect(c0 + 2, 0, 6, H, P.asphalt);
  p.vline(c0 + 2, 0, H - 1, P.steel);
  p.vline(c0 + 3, 0, H - 1, P.concrete);
  p.vline(c0 + 7, 0, H - 1, P.charcoal);
  for (let y = 0; y < H; y++) if (ihash(5, y, 2211) % 9 === 0) p.set(c0 + 5, y, P.brassOld);
  p.rect(c0 + 1, H - 4, 8, 4, P.charcoal);
  p.hline(c0 + 1, c0 + 8, H - 4, P.asphalt);
  p.rect(c0, 0, 10, 3, P.steel);
  p.hline(c0, c0 + 9, 0, P.concreteLt);
  // lantern bracket at mid height (the lantern itself sways in over())
  p.hline(c0 - 5, c0 + 1, 13, P.steel);
  p.hline(c0 - 5, c0 + 1, 14, P.charcoal);
  p.set(c0 - 5, 15, P.charcoal);
  finish(p, { soft: true });
  const img = p.toCanvas();
  const flags = noboriFrames(kind);
  const a = stand(img, { cx: 8, shadow: H, contact: 8 });
  // the column (image x c0..c0+9) sits on x 3..12 of the tile; the bracket reaches west
  a.ox = 8 - (c0 + 5);
  const topY = 16 - H;
  a.over = (g, x, y, env) => {
    const f = env.stage === 1 ? 1 : env.stage === 2 ? 4 : Math.floor((env.mt + env.seed * 640) / 160) % 4;
    g.img(flags[f], x + 13, y + topY + 2);
    const lf = LANTERN[env.stage === 1 ? 0 : env.stage === 2 ? 1 : Math.floor((env.mt + env.seed * 900) / 900) % 2];
    g.img(lf, x + a.ox + c0 - 11, y + topY + 14);
  };
  a.xray = 0;
  a.glow = (g, x, y, env) => {
    if (env.grade.night > 0.05) glowBlob(g, x + a.ox + c0 - 5, y + topY + 22, 12, 0.45 * env.grade.night);
  };
  a.light = (g, x, y, env) => {
    // the paper lantern's warm pool on the tiles below it
    const n = env.grade.night;
    if (n > 0.05) drawLight(g, poolEllipse(26, 13, LIGHT.lamp), x + a.ox + c0 - 5, y + 8, 0.55 * n);
  };
  return a;
});

// ---------------------------------------------------------------- プランター / 玄関マット / 紋章

registerProp('prop_planter', () => {
  const p = pc(16, 16);
  p.rect(1, 8, 14, 7, P.skin4);
  p.hline(1, 14, 8, P.skin3);
  p.hline(1, 14, 14, P.wood);
  p.vline(14, 9, 14, P.wood);
  for (let k = 0; k < 5; k++) {
    const x = 2 + k * 3;
    p.rect(x, 4 + (k % 2), 2, 4, P.leafDeep);
    p.rect(x - 1 + (k % 2), 2 + (k % 2), 3, 3, k % 2 ? P.sun : P.gold);
    p.set(x + (k % 2), 3 + (k % 2), P.sunDeep);
  }
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 14 });
});

registerProp('prop_shop_mats', () => {
  // entrance mats: butcher (27,22) and candy shop (32,22)
  const p = pc(16 * 10, 12);
  const mat = (x: number, c: string, c2: string) => {
    p.rect(x, 1, 14, 9, c);
    p.strokeRect(x, 1, 14, 9, c2);
    for (let i = x + 2; i < x + 12; i += 2) p.vline(i, 3, 7, c2);
  };
  mat(3 * 16 + 1, P.maroon, P.vermShade);
  mat(8 * 16 + 1, P.leafShade, P.leafDeep);
  return flat(p.toCanvas(), 0, 0);
});

registerProp('decal_emblem', () => {
  // (QA round 1) the shopping street's floor medallion, legible at a glance:
  // a cream mosaic disc a step lighter than the floor tiles and low in
  // saturation, a double ring (brass, then a dotted wood ring) and the 銀 of
  // 夕鳴銀座 laid in dark tesserae in the middle, grout lines between the stones
  const p = pc(30, 30);
  const c0 = 15;
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 30; x++) {
      const d = Math.hypot(x + 0.5 - c0, y + 0.5 - c0);
      if (d > 14.6) continue;
      let c: string = P.paperGrid;
      if (d > 13.4) c = P.woodLt; // outer rim
      else if (d > 12.2) c = P.brass; // brass ring
      else if (d > 11.2) c = P.paperGrid;
      else if (d > 10.2) c = (Math.round(Math.atan2(y - c0, x - c0) * 9) & 1) ? P.woodLt : P.paperGrid; // dotted ring
      else c = P.paper;
      // mosaic grout: a faint 3px grid inside the disc
      if (d <= 10.2 && (x % 3 === 0 || y % 3 === 0) && ihash(x, y, 2231) % 3 === 0) c = P.paperGrid;
      p.set(x, y, c);
    }
  // the glyph, with a soft shadow step so it reads as inlaid stone
  handGlyph(p, '銀', 10, 10, P.woodDark, P.woodLt);
  // wear: a few lighter polished stones where feet go
  for (let k = 0; k < 10; k++) {
    const hh = ihash(k, 9, 2233);
    const x = 5 + (hh % 20);
    const y = 5 + ((hh >>> 8) % 20);
    if (Math.hypot(x - c0, y - c0) < 10 && p.alpha(x, y)) p.set(x, y, P.white);
  }
  return flat(p.toCanvas(), -7, -7);
});

// ---------------------------------------------------------------- ガチャ台 obj_gacha_ginza (30–31,22)

function gachaMachine(p: PixelCanvas, x: number, body: string, seed: number): void {
  // 14×26: dome with capsules on a coloured body
  p.rect(x, 12, 14, 13, body);
  p.vline(x, 12, 24, lt(body));
  p.vline(x + 13, 12, 24, dk(body));
  p.hline(x, x + 13, 24, dk(body, 2));
  p.rect(x + 1, 1, 12, 11, P.white);
  p.rect(x + 2, 2, 10, 9, P.shadeDeep);
  const cols = [P.red, P.gold, P.blue, P.leafYoung, P.peach, P.aqua];
  for (let k = 0; k < 9; k++) {
    const cx = x + 3 + (k % 3) * 3 + ((k >> 2) & 1);
    const cy = 4 + Math.floor(k / 3) * 2 + 2;
    p.set(cx, cy, cols[(k + seed) % cols.length]);
    p.set(cx + 1, cy, P.white);
  }
  p.set(x + 3, 2, P.glint);
  p.set(x + 3, 3, P.glint);
  // handle and coin slot
  p.ellipse(x + 7, 17, 2.5, 2.5, P.concreteLt);
  p.hline(x + 5, x + 9, 17, P.steel);
  p.rect(x + 10, 15, 2, 3, P.charcoal);
  p.rect(x + 4, 21, 6, 2, P.ink);
  p.rect(x + 2, 13, 10, 1, P.white);
  printLines(p, x + 2, 13, 10, 1, P.ink, seed);
}

registerProp('obj_gacha_ginza', () => {
  const p = pc(32, 28);
  gachaMachine(p, 1, P.verm, 1);
  gachaMachine(p, 17, P.blue, 4);
  finish(p, { soft: true });
  const glass = maskOf(32, 28, (x, y) => (x >= 3 && x <= 12 && y >= 2 && y <= 10) || (x >= 19 && x <= 28 && y >= 2 && y <= 10));
  return stand(p.toCanvas(), { cx: 16, shadow: 26, contact: 28, extra: { glass } });
});

registerProp('obj_meishi_ground', () => {
  const p = pc(8, 6);
  p.rect(1, 1, 6, 4, P.white);
  p.hline(2, 5, 2, P.steel);
  p.hline(2, 4, 3, P.concrete);
  p.hline(1, 6, 4, P.concreteLt);
  return flat(p.toCanvas(), 4, 6);
});

// ---------------------------------------------------------------- 防火バケツ obj_fire_bucket

const BUCKET = mkFrames(2, 14, 14, (p, k) => {
  p.poly([[1, 3], [13, 3], [11, 13], [3, 13]], P.red);
  p.line(1, 3, 3, 13, P.vermLt);
  p.line(13, 3, 11, 13, P.vermShade);
  p.hline(1, 13, 3, P.vermLt);
  p.ellipse(7, 3.5, 5.5, 1.5, P.navy);
  // goldfish (2 frames)
  p.set(k ? 8 : 5, 3, P.sun);
  p.set(k ? 9 : 6, 3, P.sunDeep);
  p.set(k ? 4 : 9, 4, P.sun);
  // 防火
  p.rect(5, 6, 4, 5, P.white);
  p.set(6, 7, P.verm);
  p.set(7, 9, P.verm);
  p.hline(3, 11, 13, P.maroon);
}, (p) => finish(p, { soft: true }));

registerProp('obj_fire_bucket', () => standAnim(BUCKET, (env) => Math.floor(env.t / 500) % 2, { shadow: 12 }));

// ---------------------------------------------------------------- 豆腐の水槽 obj_tofu_tank (on the counter)

const TANK = mkFrames(3, 20, 12, (p, k) => {
  p.rect(0, 2, 20, 10, P.steel);
  p.rect(1, 3, 18, 7, P.aqua);
  p.hline(1, 18, 3, P.white);
  for (let n = 0; n < 4; n++) {
    p.rect(2 + n * 4, 6, 3, 3, P.white);
    p.set(2 + n * 4, 6, P.glint);
  }
  // shimmer
  const sx = [3, 9, 14][k];
  p.hline(sx, sx + 2, 4, P.glint);
  p.hline(1, 18, 10, P.asphalt);
  p.hline(0, 19, 11, P.charcoal);
});

registerProp('obj_tofu_tank', () => {
  const a = standAnim(TANK, (env) => Math.floor(env.t / 300) % 3, { cx: 8, base: 7, foot: 17, shadow: 0, contact: 0 });
  a.ox = -10;
  a.oy = -5;
  return a;
});

// ---------------------------------------------------------------- 特売ワゴン obj_wagon

registerProp('obj_wagon', () => {
  const p = pc(28, 20);
  p.rect(1, 6, 26, 9, P.steel);
  for (let x = 1; x < 27; x += 2) p.vline(x, 7, 14, P.concreteLt);
  p.hline(1, 26, 6, P.white);
  // goods: uchiwa fans, rolled sudare, mosquito coils
  for (const [x, c] of [[3, P.aqua], [7, P.peach], [11, P.gold]] as [number, string][]) {
    p.ellipse(x + 1, 3, 2, 2.5, c);
    p.vline(x + 1, 5, 7, P.woodLt);
  }
  p.rect(14, 2, 9, 3, P.goldPale);
  for (let x = 14; x < 23; x += 2) p.set(x, 3, P.brass);
  p.rect(22, 3, 4, 4, P.leafDeep);
  p.ring(24, 5, 1.5, 1.5, P.leafShade);
  // price card
  p.rect(9, 9, 10, 5, P.gold);
  tiny(p, '100', 10, 9, P.verm);
  // wheels
  for (const x of [3, 23]) p.rect(x, 15, 3, 3, P.charcoal);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 12, shadow: 18, contact: 24 });
});

// ---------------------------------------------------------------- 時計店のウィンドウ obj_clock_shop (8.2)

function hand(p: PixelCanvas, cx: number, cy: number, len: number, ang: number, col: string): void {
  const x1 = Math.round(cx + Math.sin(ang) * len);
  const y1 = Math.round(cy - Math.cos(ang) * len);
  p.line(Math.round(cx), Math.round(cy), x1, y1, col);
}
function clockAngles(h: number, m: number): [number, number] {
  return [((h % 12) + m / 60) * (Math.PI / 6), m * (Math.PI / 30)];
}

/** Paint the 7 clocks for a stage variant (v: 0/1/2/3 night, sub: animation phase). */
function clockWindow(stage: number, sub: number): PixelCanvas {
  const p = pc(48, 24);
  // dark velvet backdrop with a shelf
  p.rect(0, 0, 48, 24, P.nightShade);
  p.rect(0, 16, 48, 8, P.maroon);
  p.hline(0, 47, 16, P.sunShade);
  const t = stage === 0 ? null : stage === 3 ? [17, 1] : [17, 0];
  // 1: round wall clock (12px)
  {
    const [h, m] = t ?? [16, 44];
    p.ellipse(6, 6, 5.5, 5.5, P.brassOld);
    p.ellipse(6, 6, 4.5, 4.5, P.white);
    const [ah, am] = clockAngles(h, m);
    hand(p, 6, 6, 2.5, ah, P.ink);
    hand(p, 6, 6, 3.5, am, P.ink);
    if (stage === 2 && sub === 1) p.set(9, 3, P.verm); // second hand ticking back
    else p.set(stage === 0 ? 6 + sub : 8, stage === 0 ? 2 : 3, P.verm);
  }
  // 2: cuckoo clock
  {
    p.poly([[12, 5], [17, 0], [22, 5]], P.woodDark);
    p.rect(13, 5, 9, 9, P.wood);
    p.rect(16, 6, 3, 3, stage === 1 ? P.woodDark : P.night);
    if (stage === 2) {
      p.rect(16, 6, 1, 3, P.woodDark);
      p.set(18, 6, P.white); // the bird peeking north-east
    }
    if (stage === 3 && sub === 1) {
      p.set(17, 7, P.white);
      p.set(18, 7, P.gold);
    }
    p.ellipse(17.5, 11.5, 2.2, 2.2, P.paper);
    p.set(17, 11, P.ink);
    p.vline(15, 14, 18, P.brass);
    p.vline(20, 14, 20, P.brass);
  }
  // 3: digital clock (#5CE1FF), 3×5 digits
  {
    p.rect(21, 3, 19, 8, P.ink);
    p.hline(21, 39, 3, P.charcoal);
    const txt = stage === 0 ? '1655' : stage === 2 && sub === 1 ? '1659' : stage === 3 ? '1701' : '1700';
    const xs = [22, 26, 32, 36];
    for (let i = 0; i < 4; i++) tiny(p, txt[i], xs[i], 5, P.glow);
    const colonOn = stage === 0 ? sub === 0 : true;
    if (colonOn) {
      p.set(30, 6, P.glow);
      p.set(30, 8, P.glow);
    }
  }
  // 4: pendulum clock (22px tall)
  {
    p.rect(41, 1, 7, 22, P.woodDark);
    p.rect(42, 2, 5, 5, P.paper);
    p.set(44, 3, P.ink);
    p.set(45, 4, P.ink);
    p.rect(42, 9, 5, 12, P.night);
    const sw = stage === 0 || stage === 3 ? (sub ? 1 : -1) : stage === 2 ? 2 : 1;
    p.line(44, 9, 44 + sw, 17, P.brass);
    p.ellipse(44 + sw, 18, 1.5, 1.5, P.gold);
  }
  // 5: alarm clock with two bells
  {
    const buzz = stage === 2 && sub === 1 ? 1 : 0;
    p.ellipse(5 + buzz, 20, 3.5, 3.5, P.red);
    p.ellipse(5 + buzz, 20, 2.5, 2.5, P.white);
    p.set(3 + buzz, 16, P.brass);
    p.set(7 + buzz, 16, P.brass);
    const [ah, am] = clockAngles(...(t ?? [16, 58]) as [number, number]);
    hand(p, 5 + buzz, 20, 1.5, ah, P.ink);
    hand(p, 5 + buzz, 20, 2.2, am, P.ink);
  }
  // 6: pocket watch on a stand
  {
    p.vline(14, 19, 23, P.brassOld);
    p.hline(12, 16, 23, P.brassOld);
    p.ellipse(14, 19, 3, 3, P.brass);
    p.ellipse(14, 19, 2.2, 2.2, P.paper);
    const [ah, am] = clockAngles(...(t ?? [16, 31]) as [number, number]);
    hand(p, 14, 19, 1.4, ah, P.ink);
    hand(p, 14, 19, 2, am, P.ink);
  }
  // 7: cat clock, eyes and tail
  {
    p.rect(21, 17, 8, 7, P.ink);
    p.set(21, 16, P.ink);
    p.set(28, 16, P.ink);
    const look = stage === 1 ? 1 : stage === 2 ? 2 : sub ? 1 : -1;
    p.set(23, 19, P.white);
    p.set(26, 19, P.white);
    const ex = look === 2 ? 1 : look;
    const ey = look === 2 ? -1 : 0;
    p.set(23 + Math.max(0, ex), 19 + ey, P.ink);
    p.set(26 + Math.max(0, ex), 19 + ey, P.ink);
    const tail = stage === 1 ? 1 : stage === 2 ? 2 : sub ? 1 : -1;
    p.vline(25 + (tail === 2 ? 1 : tail), 22, 23, P.charcoal);
  }
  // price tags & glass frame
  p.rect(31, 18, 5, 3, P.paper);
  p.rect(9, 13, 3, 2, P.paper);
  if (stage !== 3) {
    // yellowed glass tint at the edges
    p.vline(0, 0, 23, P.brassOld);
  }
  return p;
}

function tinyDigit(p: PixelCanvas, d: string, x: number, y: number, c: string): void {
  // 2×5 condensed digits
  const G: Record<string, string> = {
    '0': '1111111111', '1': '0101010101', '5': '1110111011', '6': '1010111111', '7': '1101010101', '9': '1111110101',
  };
  const g = G[d] ?? G['0'];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 2; i++) if (g[j * 2 + i] === '1') p.set(x + i, y + j, c);
}

registerProp('obj_clock_shop', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (stage: number, sub: number) => {
    const k = stage + ':' + sub;
    let c = cache.get(k);
    if (!c) {
      c = clockWindow(stage, sub).toCanvas();
      cache.set(k, c);
    }
    return c;
  };
  const glass = maskOf(48, 24, (x, y) => (x + y * 2) % 23 < 3);
  return {
    ox: -12,
    oy: -10,
    w: 48,
    h: 24,
    foot: 17,
    img: (env: PropEnv) => {
      const s = Math.min(3, Math.floor(env.stage));
      const sub = s === 1 ? 0 : s === 2 ? (Math.floor(env.t / 1300) % 5 === 0 ? 1 : 0) : Math.floor(env.t / 500) % 2;
      return get(s, sub);
    },
    glass,
  };
});

// ---------------------------------------------------------------- 写真館の家族写真 obj_photo_window (8.3)

/**
 * The 32×24 family photo for a stage (0, 1, 2, 3 = ending). Exported so the
 * ending can show it 3× (96×72).
 */
export function photoImage(stage: number): HTMLCanvasElement {
  const key = Math.max(0, Math.min(3, Math.floor(stage)));
  let c = PHOTO_CACHE.get(key);
  if (c) return c;
  const p = pc(32, 24);
  // studio backdrop: mottled blue dither, wooden floor
  for (let y = 0; y < 19; y++)
    for (let x = 0; x < 32; x++) p.set(x, y, (ihash(x >> 1, y >> 1, 2301) % 3 === 0) !== ((x + y) % 2 === 0) ? P.blue : P.aqua);
  p.rect(0, 19, 32, 5, P.woodLt);
  p.hline(0, 31, 19, P.goldPale);
  const face = (x: number, y: number, front: boolean, smile: boolean, bigEyes = false) => {
    p.rect(x, y, 4, 4, P.skin2);
    p.set(x, y, P.skin1);
    if (front) {
      p.set(x + 1, y + 1, P.ink);
      p.set(x + 2 + (bigEyes ? 0 : 1), y + 1, P.ink);
      if (bigEyes) {
        p.set(x + 1, y + 2, P.ink);
        p.set(x + 3, y + 1, P.ink);
      }
    } else {
      p.set(x, y + 1, P.ink);
      p.set(x + 2, y + 1, P.ink);
    }
    if (smile) {
      p.set(x + 1, y + 3, P.maroon);
      p.set(x + 2, y + 3, P.maroon);
      p.set(x, y + 2, P.maroon);
      p.set(x + 3, y + 2, P.maroon);
    } else p.hline(x + 1, x + 2, y + 3, P.maroon);
  };
  const smile = key === 3;
  // father (20px, navy suit, glasses)
  p.rect(4, 5, 5, 3, P.charcoal);
  face(4, 7, false, smile);
  p.hline(4, 8, 8, P.ink);
  p.rect(3, 11, 7, 12, P.navy);
  p.vline(6, 11, 16, P.white);
  p.set(6, 12, P.red);
  // mother (19px, dress #B04A7A, a pearl)
  p.rect(11, 6, 5, 4, P.woodDark);
  face(11, 8, false, smile);
  p.rect(10, 12, 7, 11, P.sunShade);
  p.set(13, 12, P.white);
  // sister (14px, #F7C27A dress, red ribbon)
  p.rect(18, 10, 5, 3, P.woodDark);
  p.set(22, 10, P.red);
  p.set(23, 10, P.red);
  face(18, 12, key === 3, smile);
  p.rect(17, 16, 7, 7, P.sky);
  // sister's hand: towards the brother
  p.rect(24, 17, 2, 1, P.skin2);
  // brother (12px, white shirt, navy shorts)
  if (key === 2) {
    // cut out: paper white with a jagged scissor edge
    for (let y = 11; y < 23; y++)
      for (let x = 25; x < 31; x++) {
        const inside = (y < 15 ? x >= 26 && x <= 29 : x >= 25 && x <= 30) && !(y >= 21 && x === 27);
        if (!inside) continue;
        const edge = !(y < 15 ? x > 26 && x < 29 : x > 25 && x < 30) || y === 11 || y === 22;
        p.set(x, y, edge ? ((x + y) % 2 ? P.paperGrid : P.paper) : P.paper);
      }
  } else {
    p.rect(26, 11, 4, 2, P.woodDark);
    if (key === 3) {
      p.rect(25, 10, 6, 2, P.gold); // yellow school cap
      p.hline(25, 31, 12, P.brass);
    }
    face(26, 12, key >= 1, smile, key === 1);
    p.rect(25, 16, 6, 3, P.white);
    p.rect(25, 19, 6, 2, P.navy);
    p.vline(26, 21, 22, P.skin2);
    p.vline(29, 21, 22, P.skin2);
    if (key === 3) p.rect(24, 17, 2, 1, P.skin1); // holding hands
  }
  // aged photo: yellowing + dark fuzz in the corners (not in the ending)
  if (key !== 3) {
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 32; x++) {
        const v = p.get(x, y);
        if (!(v >>> 24)) continue;
        const cx = Math.min(x, 31 - x);
        const cy = Math.min(y, 23 - y);
        if (cx + cy < 4 && (x + y) % 2 === 0) p.set(x, y, P.wood);
      }
  }
  const out = pc(32, 24);
  out.blit(p, 0, 0);
  c = out.toCanvas();
  if (key !== 3) {
    const ctx = c.getContext('2d')!;
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = P.goldPale;
    ctx.fillRect(0, 0, 32, 24);
  }
  PHOTO_CACHE.set(key, c);
  return c;
}
const PHOTO_CACHE = new Map<number, HTMLCanvasElement>();

registerProp('obj_photo_window', () => {
  // frame 34×34 (photo 32×24 + frame + the little tag)
  const frame = pc(36, 34);
  frame.rect(0, 0, 36, 34, P.wood);
  frame.strokeRect(0, 0, 36, 34, P.woodDark);
  frame.strokeRect(1, 1, 34, 26, P.brass);
  frame.hline(1, 34, 1, P.goldPale);
  frame.rect(4, 28, 28, 5, P.paper);
  printLines(frame, 6, 30, 24, 1, P.wood, 3);
  frame.rect(2, 2, 32, 24, 'transparent');
  const fimg = frame.toCanvas();
  const glass = maskOf(36, 34, (x, y) => x >= 2 && x < 34 && y >= 2 && y < 26 && (x + y * 2) % 19 < 3);
  const cache = new Map<number, HTMLCanvasElement>();
  const composed = (stage: number) => {
    let c = cache.get(stage);
    if (!c) {
      const cv = document.createElement('canvas');
      cv.width = 36;
      cv.height = 34;
      const ctx = cv.getContext('2d')!;
      ctx.drawImage(photoImage(stage), 2, 2);
      ctx.drawImage(fimg, 0, 0);
      c = cv;
      cache.set(stage, c);
    }
    return c;
  };
  return {
    ox: -2,
    oy: -19,
    w: 36,
    h: 34,
    foot: 17,
    img: (env: PropEnv) => composed(Math.min(3, Math.floor(env.stage))),
    glass,
    over: (g: Gfx, x: number, y: number, env: PropEnv) => {
      // fx_chromatic in stage 2: 1px red/blue split, 100ms every 2s
      if (env.stage !== 2 || Math.floor(env.t / 100) % 20 !== 0) return;
      const img = photoImage(2);
      g.img(img, x - 2 + 2 - 1, y - 19 + 2, { alpha: 0.35, tint: P.red, tintAmount: 1 });
      g.img(img, x - 2 + 2 + 1, y - 19 + 2, { alpha: 0.35, tint: P.blue, tintAmount: 1 });
    },
  };
});

// ---------------------------------------------------------------- ランドリーの窓 obj_laundry_window

const DRYERS = mkFrames(4, 28, 24, (p, k) => {
  p.rect(0, 0, 28, 24, P.nightShade);
  // row of three dryers; #3 keeps spinning
  for (let n = 0; n < 3; n++) {
    const x = 1 + n * 9;
    p.rect(x, 3, 8, 18, P.concreteLt);
    p.hline(x, x + 7, 3, P.white);
    p.vline(x + 7, 4, 20, P.steel);
    p.ellipse(x + 4, 10, 3.2, 3.2, P.charcoal);
    p.ring(x + 4, 10, 3.4, 3.4, P.steel);
    tiny(p, String(n + 1), x + 1, 15, P.blue);
    if (n === 2) {
      // tumbling laundry (4 frames, 120ms)
      const pts = [[2, 9], [4, 8], [5, 10], [3, 11]];
      const [dx, dy] = pts[k];
      p.set(x + dx, dy, P.peach);
      p.set(x + dx + 1, dy, P.aqua);
      p.set(x + 4 - (dx - 3), 18 - dy, P.white);
      p.set(x + 3, 16, P.glow); // running lamp
    }
  }
  p.hline(0, 27, 22, P.shadeDeep);
});

registerProp('obj_laundry_window', () => {
  const glass = maskOf(28, 24, () => true);
  return {
    ox: -13,
    oy: -11,
    w: 28,
    h: 24,
    foot: 17,
    img: (env: PropEnv) => DRYERS[Math.floor(env.t / 120) % 4],
    glass,
  };
});

// ---------------------------------------------------------------- 自販機

function vendingBody(body: string, samples: string[], led17: boolean): PixelCanvas {
  const p = pc(18, 34);
  p.rect(1, 1, 16, 31, body);
  p.vline(1, 1, 31, lt(body));
  p.vline(16, 2, 31, dk(body));
  p.hline(1, 16, 1, lt(body));
  // display window with sample cans
  p.rect(3, 3, 12, 12, P.white);
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < 4; k++) {
      const c = samples[(k + r * 2) % samples.length];
      const x = 4 + k * 3;
      const y = 4 + r * 6;
      p.rect(x, y, 2, 4, c);
      p.set(x, y, lt(c));
      p.set(x + 1, y + 1, P.white);
      // price buttons (lit)
      p.set(x, y + 5, P.glow);
    }
  // coin area
  p.rect(12, 17, 3, 6, P.steel);
  p.set(13, 18, P.charcoal);
  // LED
  p.rect(3, 17, 8, 5, P.ink);
  if (led17) led(p, '17', 3, 17, P.red);
  // outlet
  p.rect(3, 25, 12, 5, P.charcoal);
  p.hline(3, 14, 25, P.ink);
  p.rect(1, 32, 16, 2, P.asphalt);
  finish(p, { soft: true });
  return p;
}

const VEND_RED = [false, true].map((bow) => {
  const p = vendingBody(P.verm, [P.red, P.vermLt, P.red, P.crimson], true);
  if (!bow) return p.toCanvas();
  // stage 1: bows by 1px (upper half shifted down)
  const q = pc(18, 34);
  for (let y = 0; y < 34; y++) for (let x = 0; x < 18; x++) {
    const sy = y < 16 ? y - 1 : y;
    const v = p.get(x, sy);
    if (v >>> 24) q.set(x, y, v);
  }
  return q.toCanvas();
});

registerProp('obj_vending_ginza', () => {
  const glass = maskOf(18, 34, (x, y) => x >= 3 && x <= 14 && y >= 3 && y <= 14 && (x + y) % 5 < 2);
  const a = stand(VEND_RED[0], { shadow: 32, contact: 14, extra: { glass } });
  a.img = (env) => VEND_RED[env.stage === 1 ? 1 : 0];
  a.glow = (g, x, y, env) => {
    // LED 17:00, button lights (2 frames, 900ms)
    const ctx = g.ctx;
    ctx.save();
    ctx.globalAlpha = 0.9;
    const bx = x + a.ox;
    const by = y + a.oy + (env.stage === 1 ? 1 : 0);
    const on = Math.floor(env.t / 900) % 2;
    ctx.fillStyle = P.glow;
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) if ((k + r + on) % 2 === 0) ctx.fillRect(Math.round(bx + 4 + k * 3), Math.round(by + 9 + r * 6), 1, 1);
    ctx.fillStyle = P.vermLt;
    ctx.fillRect(Math.round(bx + 4), Math.round(by + 18), 6, 3);
    ctx.globalAlpha = 0.12 + 0.3 * env.grade.night;
    ctx.fillStyle = P.glint;
    ctx.fillRect(Math.round(bx + 3), Math.round(by + 3), 12, 12);
    ctx.restore();
  };
  return a;
});

registerProp('obj_vending_normal', () => {
  const img = vendingBody(P.white, [P.blue, P.red, P.leafYoung, P.gold], false).toCanvas();
  const glass = maskOf(18, 34, (x, y) => x >= 3 && x <= 14 && y >= 3 && y <= 14 && (x + y) % 5 < 2);
  const a = stand(img, { shadow: 32, contact: 14, extra: { glass } });
  a.glow = (g, x, y, env) => {
    const on = Math.floor(env.t / 900) % 2;
    g.rect(x + a.ox + 4 + on * 3, y + a.oy + 9, 1, 1, P.glow);
    if (env.grade.night > 0.05) g.rect(x + a.ox + 3, y + a.oy + 3, 12, 12, P.glint, 0.35 * env.grade.night);
  };
  return a;
});

registerProp('obj_vending_trace', () => {
  // sun-bleached rectangle, the outlet, the start of the cord's drag marks
  const p = pc(20, 18);
  p.rect(2, 2, 16, 12, P.concrete);
  p.strokeRect(2, 2, 16, 12, P.concreteLt);
  for (let x = 3; x < 17; x += 3) p.set(x, 8, P.steel);
  p.rect(14, 0, 4, 3, P.white);
  p.set(15, 1, P.charcoal);
  p.set(16, 1, P.charcoal);
  return flat(p.toCanvas(), -2, 0);
});

// ---------------------------------------------------------------- 自販機のコードの跡 decal_cord_trace (stage 2)

registerProp('decal_cord_trace', (opts) => {
  // from (55,22) west along the arcade to the gate (44,21), north to (44,15),
  // then north-east across the lot to the mall door (50,6)
  const x0 = 43 * 16;
  const y0 = 6 * 16;
  const w = 14 * 16;
  const h = 17 * 16;
  const p = pc(w, h);
  const col = opts.faded ? mix(P.asphalt, P.steel, 0.35) : mix(P.asphalt, P.charcoal, 0.55);
  const pts: [number, number][] = [
    [55 * 16 + 8, 22 * 16 + 10],
    [44 * 16 + 8, 22 * 16 + 6],
    [44 * 16 + 7, 15 * 16 + 8],
    [46 * 16, 11 * 16],
    [50 * 16 + 8, 6 * 16 + 10],
  ];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = ax + (bx - ax) * t + Math.sin(k / 9) * 1.2;
      const y = ay + (by - ay) * t + Math.cos(k / 11) * 1.2;
      if (ihash(k, i, 2401) % 7 === 0) continue;
      p.set(Math.round(x - x0), Math.round(y - y0), col);
      p.set(Math.round(x - x0 + 3), Math.round(y - y0 + 1), col);
    }
  }
  return flat(p.toCanvas(), x0, y0);
});

// ---------------------------------------------------------------- ベンチ / 掲示板 / ポスト

registerProp('obj_ginza_bench', () => {
  const p = pc(34, 20);
  // backrest with the 夕鳴信用金庫 ad
  p.rect(1, 1, 32, 8, P.leafDeep);
  p.strokeRect(1, 1, 32, 8, P.leafShade);
  p.hline(2, 31, 2, P.leaf);
  // the ad of the local credit union, in bold kana that stay legible at half size
  fontTextSmall(p, 'しんきん', 2, 0, P.white, 1, { spacing: -1 });
  // seat
  p.rect(1, 10, 32, 4, P.woodLt);
  p.hline(1, 32, 10, P.goldPale);
  p.hline(1, 32, 13, P.wood);
  for (const x of [3, 29]) p.rect(x, 14, 2, 5, P.asphalt);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 16, shadow: 16, contact: 28 });
});

const BOARD = mkFrames(2, 34, 28, (p, k) => {
  p.vline(3, 20, 27, P.asphalt);
  p.vline(30, 20, 27, P.asphalt);
  p.rect(1, 1, 32, 20, P.woodLt);
  p.strokeRect(1, 1, 32, 20, P.woodDark);
  p.rect(1, 0, 32, 2, P.leafDeep);
  // four posters: retirement ceremony (kanenari), bon odori, lost cat, radio calisthenics
  const post = (x: number, y: number, bg: string, art: (px: number, py: number) => void) => {
    p.rect(x, y, 7, 8, bg);
    art(x, y);
    p.set(x + 3, y, P.red);
  };
  post(3, 4, P.gold, (x, y) => {
    p.ellipse(x + 3, y + 3, 2, 2, P.brass); // the bell (Kanenari)
    p.set(x + 3, y + 5, P.sun);
    printLines(p, x + 1, y + 6, 5, 1, P.verm, 1);
  });
  post(11, 4, P.navy, (x, y) => {
    p.set(x + 2, y + 2, P.peach);
    p.set(x + 4, y + 3, P.gold);
    printLines(p, x + 1, y + 5, 5, 2, P.white, 2);
  });
  post(19, 4, P.white, (x, y) => {
    p.rect(x + 1, y + 1, 5, 3, P.brass);
    printLines(p, x + 1, y + 5, 5, 2, P.asphalt, 3);
  });
  post(26, 4, P.aqua, (x, y) => {
    p.set(x + 3, y + 2, P.white);
    p.vline(x + 3, y + 3, y + 5, P.white);
    printLines(p, x + 1, y + 6, 5, 1, P.navy, 4);
  });
  // peeling corner flutters (2 frames)
  if (k) {
    p.set(9, 11, P.goldPale);
    p.set(10, 12, P.gold);
  } else p.set(9, 12, P.goldPale);
  p.rect(4, 14, 26, 5, P.paper);
  printLines(p, 5, 15, 24, 2, P.shade, 9);
}, (p) => finish(p, { soft: true }));

registerProp('obj_poster_board', () => standAnim(BOARD, (env) => (env.stage === 1 ? 0 : Math.floor((env.mt + 300) / 700) % 2), { cx: 16, shadow: 26, contact: 28 }));

const POSTBOX = [false, true].map((fat) => {
  const w = fat ? 16 : 14;
  const p = pc(w + 2, 26);
  const x = 1;
  cylinder(p, x, 5, w, 16, P.verm);
  p.ellipse(x + w / 2, 5, w / 2, 3, P.red);
  p.ellipse(x + w / 2 - 1, 4.5, w / 2 - 2, 1.5, P.vermLt);
  p.rect(x + 3, 9, w - 6, 2, P.ink);
  p.rect(x + 3, 13, w - 6, 4, P.white);
  printLines(p, x + 4, 14, w - 8, 2, P.verm, 3);
  p.rect(x + 2, 21, w - 4, 4, P.charcoal);
  p.hline(x + 2, x + w - 3, 21, P.asphalt);
  if (fat) {
    p.set(x + 2, 11, P.white); // a letter peeking out
    p.set(x + 3, 11, P.white);
  }
  finish(p, { soft: true });
  return p.toCanvas();
});

registerProp('obj_postbox', () => {
  const a = stand(POSTBOX[0], { shadow: 24, contact: 12 });
  a.img = (env) => POSTBOX[env.stage === 2 ? 1 : 0];
  return a;
});

registerProp('prop_postman_bike', () => {
  const p = pc(28, 22);
  // red scooter with a rear box
  p.ellipse(6, 17, 4, 4, P.charcoal);
  p.ellipse(22, 17, 4, 4, P.charcoal);
  p.set(6, 17, P.steel);
  p.set(22, 17, P.steel);
  p.rect(7, 10, 14, 5, P.red);
  p.hline(7, 20, 10, P.vermLt);
  p.rect(1, 5, 9, 7, P.verm);
  p.hline(1, 9, 5, P.vermLt);
  p.rect(3, 7, 5, 2, P.white);
  p.vline(20, 4, 12, P.steel);
  p.hline(18, 23, 4, P.charcoal);
  p.rect(12, 8, 6, 2, P.charcoal);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 12, shadow: 18, contact: 24 });
});

// ---------------------------------------------------------------- 喫茶の立て看板 / ビールケース / 段ボール

registerProp('obj_cafe_board', () => {
  const p = pc(16, 22);
  p.line(3, 21, 5, 1, P.wood);
  p.line(12, 21, 10, 1, P.woodDark);
  p.rect(3, 2, 10, 16, P.leafShade);
  p.strokeRect(3, 2, 10, 16, P.wood);
  // chalk: white and yellow
  printLines(p, 5, 5, 6, 3, P.white, 3);
  p.ellipse(8, 13, 2, 1.5, P.white); // coffee cup
  p.set(10, 13, P.white);
  p.hline(5, 10, 16, P.gold);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 20 });
});

registerProp('obj_beer_crate', () => {
  const p = pc(18, 28);
  for (let k = 0; k < 3; k++) {
    const y = 18 - k * 8;
    p.rect(1, y, 16, 9, P.gold);
    p.hline(1, 16, y, P.goldPale);
    p.vline(16, y + 1, y + 8, P.brassOld);
    p.rect(3, y + 3, 12, 3, P.brassOld);
    for (let x = 4; x < 14; x += 3) p.set(x, y + 1, P.brass);
    if (k === 2) for (let x = 3; x < 15; x += 3) p.rect(x, y - 2, 2, 3, P.leafShade); // bottles
  }
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 26 });
});

registerProp('obj_danball', () => {
  const p = pc(20, 16);
  p.rect(1, 5, 17, 10, P.woodLt);
  p.hline(1, 17, 5, P.goldPale);
  p.vline(17, 6, 14, P.brassOld);
  p.rect(3, 1, 12, 5, P.woodLt);
  p.hline(3, 14, 1, P.goldPale);
  p.vline(9, 5, 14, P.brass);
  p.rect(3, 8, 5, 3, P.white);
  p.set(4, 9, P.verm);
  p.set(6, 9, P.verm);
  tiny(p, '!', 12, 8, P.verm);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 14 });
});

// ---------------------------------------------------------------- 猫の抜け道のポリバケツ + 黒猫

registerProp('obj_catalley_bucket', () => {
  const p = pc(14, 18);
  cylinder(p, 1, 3, 12, 14, P.blue);
  p.ellipse(7, 3, 6, 2, P.aqua);
  p.hline(1, 12, 5, P.navy);
  p.rect(5, 1, 4, 2, P.navy);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 16 });
});

registerProp('prop_cat_kuro', () => {
  // the black cat loafing on the polybucket (character sprite, idle loop)
  const spr = charSprite('prop_cat_kuro');
  return {
    ox: 8 - Math.floor(spr.w / 2),
    oy: 16 - 16 - spr.h + 3,
    w: spr.w,
    h: spr.h,
    foot: 16.5,
    img: (env: PropEnv) => {
      if (spr.anims?.tail && env.stage !== 1) {
        const a = spr.anims.tail;
        const i = Math.floor(env.t / 400) % a.frames.length;
        return Math.floor(env.t / 2400) % 2 ? a.frames[i] : idleFrame(spr, 'left', env.t);
      }
      return idleFrame(spr, 'left', env.t);
    },
  } as PropArt;
});

// ---------------------------------------------------------------- 交番の赤色灯 / 白い自転車

registerProp('obj_koban_lamp', () => {
  const p = pc(12, 16);
  p.rect(4, 12, 4, 4, P.steel);
  p.ellipse(6, 7, 5, 5.5, P.red);
  p.ellipse(4.5, 5.5, 2, 2.5, P.vermLt);
  p.hline(2, 10, 12, P.maroon);
  p.rect(2, 1, 8, 2, P.steel);
  finish(p, { soft: true, rim: false });
  const img = p.toCanvas();
  return {
    ox: 2,
    oy: -31,
    w: 12,
    h: 16,
    foot: 17,
    img: () => img,
    glow: (g: Gfx, x: number, y: number, env: PropEnv) => {
      // slow breathing (2s; slower in stage 1)
      const period = env.stage === 1 ? 4200 : 2000;
      const v = 0.5 + 0.5 * Math.sin((env.t / period) * Math.PI * 2);
      const a = (0.35 + 0.4 * env.grade.night) * v;
      const ctx = g.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const cx = x + 2 + 6;
      const cy = y - 31 + 7;
      const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, 16);
      grd.addColorStop(0, `rgba(255,106,77,${a})`);
      grd.addColorStop(1, 'rgba(226,59,46,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(cx - 16, cy - 16, 32, 32);
      ctx.restore();
    },
  };
});

registerProp('obj_koban_bicycle', () => {
  const p = pc(26, 18);
  // white police bicycle with a rear box
  const y = 3;
  p.ring(5, y + 10, 4, 4, P.charcoal);
  p.ring(20, y + 10, 4, 4, P.charcoal);
  p.line(5, y + 10, 10, y + 5, P.white);
  p.line(10, y + 5, 18, y + 5, P.white);
  p.line(10, y + 5, 12, y + 10, P.concreteLt);
  p.line(12, y + 10, 18, y + 5, P.white);
  p.line(18, y + 5, 20, y + 10, P.concreteLt);
  p.hline(8, 11, y + 3, P.charcoal);
  p.vline(18, y + 1, y + 5, P.steel);
  p.hline(17, 21, y + 1, P.charcoal);
  p.rect(1, y + 1, 6, 5, P.white);
  p.strokeRect(1, y + 1, 6, 5, P.steel);
  p.set(3, y + 3, P.navy);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 14, contact: 18 });
});

