// オムカエマチ (160×128): a giant child-shaped shadow sitting hugging its knees,
// made of forgotten things — school cap, lost-child tags for eyes, odd gloves,
// umbrellas, a water bottle, one indoor shoe (13.8). Parts are separate layers
// so they can glow, break and fly away; the shadow's outline wobbles per row.

import type { Gfx } from '../../engine/gfx';
import { BAYER4, makeCanvas, PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, ditherMask, rimLeft, shade } from './lib';

const W = 168;
const H = 136;
const OX = 4;
const OY = 4;

const SHADOW = ['#1B1733', '#2A2440', '#33285A', '#3A2B5C', '#4A3A6E', '#5B4A7A'];

interface Layer {
  c: HTMLCanvasElement;
  x: number;
  y: number;
}

let built: {
  body: HTMLCanvasElement;
  bodyGlow: HTMLCanvasElement;
  front: HTMLCanvasElement;
  frontGlow: HTMLCanvasElement;
  parts: Record<string, Layer>;
  gloveL: Layer;
  gloveR: Layer;
  tag: HTMLCanvasElement;
  tagBack: HTMLCanvasElement;
  recorder: Layer;
  bag: Layer;
  trinkets: Layer;
  fan: Layer;
} | null = null;

function layer(w: number, h: number, x: number, y: number, draw: (p: PixelCanvas) => void, outline = true): Layer {
  const p = new PixelCanvas(w, h);
  draw(p);
  if (outline) p.outline(K.outline);
  return { c: p.toCanvas(), x, y };
}

function buildAll(): NonNullable<typeof built> {
  if (built) return built;
  // ---- the shadow body ------------------------------------------------------------
  // Two layers so the knees and the arms wrapped around them sit in front of
  // the torso (体育座り, seen from the front): back = head, neck, shoulders,
  // torso and seat; front = raised knees, shins, feet and the hugging arms.
  const back = new PixelCanvas(160, 128);
  const bm = new Mask(160, 128)
    .ellipse(80, 34, 24, 23) // head
    .ellipse(57, 37, 4, 5) // ears
    .ellipse(103, 37, 4, 5)
    .rect(71, 52, 18, 8) // neck
    .poly([[36, 78], [42, 63], [58, 55], [102, 55], [118, 63], [124, 78], [126, 106], [34, 106]]) // shoulders & torso
    .ellipse(80, 110, 50, 12); // seat
  shade(back, bm, SHADOW, { base: 0.5, k: 0.6, bevel: 7, dither: 0.45 });
  // the hat's elastic chin cord, slack under the chin
  const cord = new Mask(160, 128).curve(58, 26, 62, 60, 80, 59).curve(80, 59, 98, 60, 102, 26);
  cord.each((x, y) => {
    if (bm.in(x, y)) back.set(x, y, (x + y) % 3 === 0 ? '#9AA0A8' : '#C8C2B4');
  });
  // shoulder blades / collar folds and the dim lap between the knees
  back.line(66, 58, 76, 62, SHADOW[1]);
  back.line(94, 58, 84, 62, SHADOW[1]);
  for (let y = 62; y < 100; y++) back.set(80 + Math.round(Math.sin(y * 0.3)), y, SHADOW[0]);
  const fm = new Mask(160, 128)
    .ellipse(62, 72, 16, 12) // knees
    .ellipse(98, 72, 16, 12)
    .poly([[47, 72], [77, 72], [76, 108], [52, 108]]) // shins
    .poly([[83, 72], [113, 72], [108, 108], [84, 108]])
    .ellipse(64, 112, 14, 6) // feet
    .ellipse(96, 112, 14, 6)
    .line(47, 60, 38, 86, 6.5) // upper arms down the outside of the knees
    .line(113, 60, 122, 86, 6.5)
    .line(38, 88, 68, 93, 5.5) // forearms wrapped across the shins
    .line(122, 88, 92, 93, 5.5);
  // the gap between the two shins
  for (let y = 74; y < 110; y++) {
    fm.set(80, y, 0);
    if (y > 96) fm.set(79, y, 0);
  }
  const front = new PixelCanvas(160, 128);
  shade(front, fm, SHADOW, { base: 0.57, k: 0.62, bevel: 5, dither: 0.45 });
  // the arms read as separate volumes over the knees and shins
  const arms = new Mask(160, 128).line(47, 60, 38, 86, 6.5).line(113, 60, 122, 86, 6.5).line(38, 88, 68, 93, 5.5).line(122, 88, 92, 93, 5.5);
  shade(front, arms, SHADOW, { base: 0.66, k: 0.7, bevel: 3, dither: 0.4 });
  arms.each((x, y) => {
    // dark contour where an arm lies over the legs, a lit top edge
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as [number, number][]) {
      if (!arms.in(x + dx, y + dy) && fm.in(x + dx, y + dy)) {
        if (dy < 0) front.set(x, y, SHADOW[5]);
        else front.set(x + dx, y + dy, SHADOW[0]);
      }
    }
  });
  // sleeve cuffs where the hands come out
  for (let yy = 88; yy <= 98; yy++) {
    if (arms.in(66, yy)) front.set(66, yy, SHADOW[1]);
    if (arms.in(94, yy)) front.set(94, yy, SHADOW[1]);
  }
  // knee caps catch a little light; the shins turn away
  for (const kx of [58, 94]) {
    front.set(kx, 65, SHADOW[5]);
    front.set(kx + 1, 65, SHADOW[5]);
    front.set(kx - 1, 66, SHADOW[5]);
  }
  // cast shadow of the knees/arms onto the torso (down-right)
  fm.each((x, y) => {
    for (const [dx, dy] of [[1, 1], [2, 1], [1, 2]] as [number, number][]) {
      const X = x + dx;
      const Y = y + dy;
      if (!fm.in(X, Y) && bm.in(X, Y)) back.set(X, Y, SHADOW[0]);
    }
  });
  // front edge: dark contour on the shadow side, a thin lit edge on the light side
  fm.each((x, y) => {
    const outR = !fm.in(x + 1, y);
    const outB = !fm.in(x, y + 1);
    const outL = !fm.in(x - 1, y);
    const outT = !fm.in(x, y - 1);
    if ((outR || outB) && bm.in(x + 1, y + 1)) front.set(x, y, SHADOW[0]);
    else if ((outL || outT) && bm.in(x - 1, y - 1)) front.set(x, y, SHADOW[5]);
  });
  // half-buried forgotten things (texture): crayon, marble, hair tie, badge, pin
  const buried = (x: number, y: number, rows: string[], pal: Record<string, string>, target: PixelCanvas, sink: Mask) => {
    target.art(rows, pal, x, y);
    for (let j = 0; j < rows.length; j++)
      for (let i = 0; i < rows[j].length; i++) {
        const X = x + i;
        const Y = y + j;
        // the lower half sinks into the shadow
        if (sink.in(X, Y) && j >= rows.length / 2 && BAYER4[Y & 3][X & 3] < 9) target.set(X, Y, SHADOW[2]);
      }
  };
  buried(46, 101, ['.rrrrrw', 'RRRRRrw', '.RRRRR.'], { r: '#E84E3C', R: '#B8241E', w: '#F4F1E8' }, front, fm);
  buried(111, 98, ['.bb.', 'bBwb', 'bBBb', '.bb.'], { b: '#4AA8E0', B: '#2F4A8A', w: '#FFFFFF' }, front, fm);
  buried(53, 104, ['.pp.', 'p..p', 'p..p', '.pp.'], { p: '#E0567A' }, back, bm);
  buried(101, 76, ['wwwww', 'wrrrw', 'wwwww'], { w: '#F4F1E8', r: '#E23B2E' }, front, fm);
  buried(70, 60, ['c.....', '.cccc.', 'c....c'], { c: '#C0C6CC' }, back, bm);
  buried(118, 72, ['y.', 'yy', '.Y'], { y: '#FFD23F', Y: '#D9A441' }, back, bm);
  buried(40, 70, ['gg', 'gG', 'Gg'], { g: '#9BCB6B', G: '#5FA85A' }, back, bm);
  // sunset rim light on the upper edges (#F2894B at ~50% over the shadow)
  const both = bm.clone().or(fm);
  const rim = (pc: PixelCanvas, m: Mask) =>
    m.each((x, y) => {
      const lit = x < 110 ? 1 : 0.5;
      if (!both.in(x, y - 1) || (!both.in(x - 1, y) && y < 96)) pc.set(x, y, lit === 1 ? '#B06470' : '#8A5270');
      else if ((!both.in(x, y - 2) || !both.in(x - 2, y)) && x < 100 && y < 96) pc.set(x, y, '#6E4A78');
    });
  rim(back, bm);
  rim(front, fm);
  // floor shadow in the last rows (hidden behind the status panels)
  for (let y = 120; y < 128; y++) for (let x = 20; x < 140; x++) if (!both.in(x, y) && hash2(x, y, 2) < 0.8 - (y - 120) * 0.08) back.set(x, y, '#2A2440');
  back.outline(K.outline);
  front.outline(K.outline);
  // chime glow (13.8 "胴が黄色く光る"): a light inside the chest — strongest
  // on the gym bag at the torso's centre, fading out before the head and the
  // knees, so the shadow body keeps its colour
  const glowOf = (c: HTMLCanvasElement): HTMLCanvasElement => {
    const [gc, gx] = makeCanvas(160, 128);
    gx.drawImage(c, 0, 0);
    gx.globalCompositeOperation = 'source-atop';
    const gr = gx.createRadialGradient(80, 74, 4, 80, 74, 38);
    gr.addColorStop(0, 'rgba(255,210,63,0.55)');
    gr.addColorStop(0.55, 'rgba(255,210,63,0.3)');
    gr.addColorStop(1, 'rgba(255,210,63,0)');
    gx.fillStyle = gr;
    gx.fillRect(0, 0, 160, 128);
    return gc;
  };
  const bodyC = back.toCanvas();
  const frontC = front.toCanvas();
  const glowC = glowOf(bodyC);
  const frontGlowC = glowOf(frontC);

  // ---- parts --------------------------------------------------------------------------
  // the yellow school hat (通学帽): round crown, a full soft brim, a ribbon
  // band, the blank name field, and the elastic chin cord hanging down
  const cap = layer(68, 30, 46, 2, (p) => {
    const Y = ['#8A6A10', '#C8A020', '#E0BC30', '#F5D33B', '#FFE98A'];
    const brim = new Mask(68, 30).ellipse(34, 20, 32, 6.5);
    shade(p, brim, Y, { base: 0.5, k: 0.6, bevel: 2, dither: 0.3 });
    // underside of the brim in shadow along the bottom edge
    brim.each((x, y) => {
      if (!brim.in(x, y + 1)) p.set(x, y, '#8A6A10');
      else if (!brim.in(x, y + 2) && y > 20) p.set(x, y, '#C8A020');
    });
    const crown = new Mask(68, 30).ellipse(34, 15, 21, 13).and(new Mask(68, 30).rect(0, 0, 68, 20));
    shade(p, crown, Y, { mode: 'sphere', cx: 30, cy: 9, rx: 24, ry: 15, base: 0.62, k: 0.75, dither: 0.35 });
    // ribbon band round the crown
    for (let x = 13; x <= 55; x++) {
      const yy = 17 - Math.round(Math.abs(x - 34) / 14);
      if (crown.in(x, yy)) {
        p.set(x, yy, '#D9A441');
        if (crown.in(x, yy - 1)) p.set(x, yy - 1, x < 34 ? '#E8B850' : '#C8902A');
      }
    }
    // crown seams
    p.line(34, 3, 34, 15, '#E0BC30');
    p.line(24, 5, 22, 15, '#E0BC30');
    p.line(44, 5, 46, 15, '#C8A020');
    p.set(34, 2, '#C8A020');
    p.set(34, 3, '#FFE98A');
    // blank name field on the front (3×8)
    p.rect(30, 8, 8, 4, '#F4F1E8');
    p.hline(30, 37, 11, '#C8C2B4');
    p.set(30, 8, '#FFFFFF');
    // sheen on the brim's lit side
    for (let x = 6; x < 20; x += 2) p.set(x, 18, '#FFE98A');
  });
  const umbrella = layer(46, 76, 2, 32, (p) => {
    // 3 clear umbrellas + 1 navy kid's umbrella fanning out from behind the shoulder
    const rods: [number, number, number, number, string, string][] = [
      [36, 60, 6, 6, '#CFE3EAB3', '#9AB8C4'],
      [38, 62, 4, 22, '#CFE3EAB3', '#9AB8C4'],
      [40, 64, 10, 40, '#2F4A8A', '#24386A'],
      [40, 66, 18, 62, '#CFE3EAB3', '#9AB8C4'],
    ];
    for (const [x0, y0, x1, y1, fill, edge] of rods) {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const nx = (x1 - x0) / len;
      const ny = (y1 - y0) / len;
      const u = new Mask(46, 76);
      for (let i = 0; i <= len; i++) {
        const w = 1 + 4 * Math.sin((i / len) * Math.PI * 0.95);
        u.ellipse(x0 + nx * i, y0 + ny * i, w, w);
      }
      u.each((x, y) => p.set(x, y, fill));
      u.each((x, y) => {
        if (!u.in(x + 1, y) || !u.in(x, y + 1)) p.set(x, y, edge);
      });
      // ferrule at the tip
      p.set(Math.round(x1), Math.round(y1), '#3A3F48');
      p.set(Math.round(x1 - nx), Math.round(y1 - ny), '#6B7186');
    }
    // J handles poking out at the bottom
    for (const hx of [34, 38, 42]) {
      p.line(hx, 62, hx, 70, '#3A2B24');
      p.line(hx, 70, hx - 3, 72, '#3A2B24');
      p.set(hx - 3, 71, '#6A4B3A');
    }
  });
  const bottle = layer(24, 44, 114, 56, (p) => {
    const b = new Mask(24, 44).rect(4, 8, 14, 32).ellipse(11, 40, 7, 3).ellipse(11, 8, 7, 3);
    shade(p, b, ['#1E3060', '#2F4A8A', '#3A78B0', '#4AA8E0', '#7FC8F0'], { mode: 'cyl', cx: 10, rx: 8, base: 0.6, k: 0.7 });
    p.rect(6, 2, 10, 6, '#F4F1E8');
    p.hline(6, 15, 2, '#FFFFFF');
    p.vline(15, 2, 7, '#C8C2B4');
    // shoulder strap
    p.line(8, 2, 2, 0, '#F4F1E8');
    // a smeared name label (unreadable)
    p.rect(6, 20, 10, 6, '#F4F1E8');
    for (let x = 7; x < 15; x += 2) p.set(x, 22 + (x % 3 === 0 ? 1 : 0), '#9AB8C4');
  });
  const shoe = layer(38, 22, 59, 99, (p) => {
    const s = new Mask(38, 22).ellipse(19, 12, 17, 7).rect(4, 12, 30, 6);
    shade(p, s, ['#A8A294', '#C8C2B4', '#E8E4D8', '#F4F1E8', '#FFFFFF'], { base: 0.6, bevel: 3 });
    // blue toe cap
    const toe = new Mask(38, 22).ellipse(6, 13, 6, 5).and(s);
    toe.each((x, y) => p.set(x, y, x < 4 ? '#3A5A9A' : '#2F4A8A'));
    // sole, heel with class/number and a faded name
    p.hline(3, 34, 18, '#9AA0A8');
    p.hline(3, 34, 19, '#6B7186');
    p.rect(27, 9, 6, 4, '#E8E4D8');
    p.set(28, 10, '#9AB8C4');
    p.set(30, 11, '#9AB8C4');
    // opening
    const op = new Mask(38, 22).ellipse(22, 8, 8, 3);
    op.each((x, y) => p.set(x, y, '#5B4A7A'));
  });
  // gloves clasped over the shins (the hands of the hug): mittens seen from
  // the back of the hand, fingers curling toward the middle, a ribbed cuff
  const glove = (x: number, y: number, red: boolean) =>
    layer(20, 18, x, y, (p) => {
      const flip = !red;
      const X = (v: number) => (flip ? 19 - v : v);
      const ramp = red ? ['#801A12', '#B8241E', '#E84E3C', '#FF7A62', '#FFA08A'] : ['#24386A', '#2F7AB0', '#4AA8E0', '#7FD1E8', '#B0E8F4'];
      const g = new Mask(20, 18).ellipse(X(10), 9, 7, 6.5);
      for (let i = 0; i < 4; i++) g.ellipse(X(16), 4.5 + i * 3, 2.4, 1.8);
      g.ellipse(X(9), 3, 3, 2.2); // thumb over the top
      shade(p, g, ramp, { mode: 'sphere', cx: X(10), cy: 8, rx: 9, ry: 8, base: 0.58, k: 0.75, dither: 0.3 });
      // finger creases
      for (let i = 1; i < 4; i++) p.line(X(14), 3 + i * 3, X(17), 3 + i * 3, ramp[1]);
      p.line(X(7), 4, X(11), 5, ramp[1]);
      // knitted texture: a few stitches
      for (let yy = 7; yy < 14; yy += 2) for (let xx = 6; xx < 13; xx += 3) p.set(X(xx + (yy % 4 === 1 ? 1 : 0)), yy, ramp[2]);
      // ribbed cuff on the outer side
      const cuff = new Mask(20, 18).rect(X(1) - (flip ? 3 : 0), 5, 4, 9);
      cuff.each((xx, yy) => p.set(xx, yy, (xx + (flip ? 1 : 0)) % 2 ? '#F4F1E8' : '#C8C2B4'));
    });
  const gloveL = glove(57, 82, true);
  const gloveR = glove(83, 82, false);
  const recorder = layer(20, 40, 116, 8, (p) => {
    for (let i = 0; i < 34; i++) {
      const x = 16 - i * 0.35;
      const y = 2 + i;
      p.set(Math.round(x), y, '#F6D98A');
      p.set(Math.round(x) + 1, y, '#D9B460');
      p.set(Math.round(x) - 1, y, '#FFF0B8');
      if (i % 5 === 2 && i < 26) p.set(Math.round(x), y, '#A8742A');
    }
    p.rect(14, 0, 4, 3, '#F6D98A');
  });
  const bag = layer(28, 26, 66, 49, (p) => {
    const b = new Mask(28, 26).poly([[4, 4], [24, 4], [26, 24], [2, 24]]);
    shade(p, b, ['#A8A294', '#C8C2B4', '#E8E4D8', '#F4F1E8'], { base: 0.62, bevel: 3 });
    // drawstring
    p.hline(4, 24, 5, '#9AA0A8');
    p.line(8, 5, 6, 0, '#E0567A');
    p.line(20, 5, 22, 0, '#E0567A');
    // empty name box
    p.strokeRect(8, 11, 12, 7, '#9AA0A8');
  });
  const trinkets = layer(160, 128, 0, 0, (p) => {
    // lunch bag (checkered), keychain, safety pin half-buried in the shadow
    for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) p.set(36 + x, 100 + y, ((x >> 1) + (y >> 1)) % 2 ? '#E84E3C' : '#F4F1E8');
    p.hline(38, 43, 99, '#F4F1E8');
    p.set(124, 104, '#C0C6CC');
    p.set(125, 105, '#C0C6CC');
    p.rect(126, 106, 4, 3, '#FFD23F');
    p.line(108, 112, 116, 110, '#C0C6CC');
    p.set(116, 109, '#9AA0A8');
  }, false);
  const fan = layer(90, 60, 35, 50, (p) => {
    // umbrellas fanned open in front of the body (まだ来ない / 傘)
    for (let i = 0; i < 4; i++) {
      const cx = 18 + i * 18;
      const col = i === 2 ? '#2F4A8A' : '#CFE3EACC';
      const d = new Mask(90, 60).ellipse(cx, 30, 18, 14).and(new Mask(90, 60).rect(0, 0, 90, 32));
      d.each((x, y) => p.set(x, y, col));
      for (let k = 0; k < 5; k++) {
        const a = Math.PI + (k / 4) * Math.PI;
        p.line(cx, 30, cx + Math.round(Math.cos(a) * 17), 30 + Math.round(Math.sin(a) * 13), i === 2 ? '#24386A' : '#9AA3AD');
      }
      p.vline(cx, 30, 44, '#C0C6CC');
    }
  });
  // lost-child tag (eye) 16×12
  const tagP = new PixelCanvas(18, 16);
  tagP.rect(1, 3, 16, 12, '#F4F1E8');
  tagP.strokeRect(1, 3, 16, 12, '#E23B2E');
  tagP.rect(2, 4, 14, 1, '#FFFFFF');
  tagP.set(4, 5, '#9AA0A8');
  tagP.line(4, 0, 4, 3, '#C8C2B4');
  tagP.outline(K.outline);
  const tagBackP = new PixelCanvas(18, 16);
  tagBackP.rect(1, 3, 16, 12, '#E8E4D8');
  tagBackP.hline(3, 14, 8, '#C8C2B4');
  tagBackP.line(4, 0, 4, 3, '#C8C2B4');
  tagBackP.outline(K.outline);
  built = {
    body: bodyC,
    bodyGlow: glowC,
    front: frontC,
    frontGlow: frontGlowC,
    parts: { cap, umbrella, bottle, shoe },
    gloveL,
    gloveR,
    tag: tagP.toCanvas(),
    tagBack: tagBackP.toCanvas(),
    recorder,
    bag,
    trinkets,
    fan,
  };
  void ditherMask;
  return built;
}

const PART_KEYS: Record<string, string> = {
  boss_omukaemachi_cap: 'cap',
  boss_omukaemachi_umbrella: 'umbrella',
  boss_omukaemachi_bottle: 'bottle',
  boss_omukaemachi_shoe: 'shoe',
};

const bloomCache = new Map<HTMLCanvasElement, HTMLCanvasElement>();
/**
 * Soft light pooled around a glowing part (迷子のお知らせ): an ellipse 10px
 * wider than the part on every side, in three stepped bands of pale gold
 * (dense core → thin rim), laid additively so the part seems to give off light.
 */
function bloomOf(c: HTMLCanvasElement): HTMLCanvasElement {
  let b = bloomCache.get(c);
  if (b) return b;
  const pad = 10;
  const w = c.width + pad * 2;
  const h = c.height + pad * 2;
  const p = new PixelCanvas(w, h);
  const rx = w / 2;
  const ry = h / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - rx) / rx;
      const dy = (y + 0.5 - ry) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      // stepped falloff with a 2×2 ordered dither on the band edges
      const k = d < 0.62 ? 3 : d < 0.82 ? 2 : 1;
      const edge = d > 0.9 || (d > 0.78 && d < 0.82) || (d > 0.58 && d < 0.62);
      if (edge && (x + y) % 2) continue;
      p.set(x, y, k === 3 ? '#FFE7A3aa' : k === 2 ? '#FFD23F66' : '#FFD23F33');
    }
  b = p.toCanvas();
  bloomCache.set(c, b);
  return b;
}

/**
 * Glow halo of a part (13.4 status_hikari): its silhouette grown by 3px in
 * three rings — #FFF6D8 hugging the part, #FFE7A3, then #FFD23F — drawn under
 * the part so the light spills over the shadow body and the sky alike.
 */
const haloCache = new Map<HTMLCanvasElement, HTMLCanvasElement>();
function haloOf(c: HTMLCanvasElement): HTMLCanvasElement {
  let h = haloCache.get(c);
  if (h) return h;
  const w = c.width + 6;
  const hh = c.height + 6;
  const src = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < c.width && y < c.height && src[(y * c.width + x) * 4 + 3] > 40;
  const p = new PixelCanvas(w, hh);
  const cols = ['#FFF6D8', '#FFE7A3', '#FFD23F'];
  for (let y = 0; y < hh; y++)
    for (let x = 0; x < w; x++) {
      const sx = x - 3;
      const sy = y - 3;
      if (inside(sx, sy)) {
        p.set(x, y, '#FFF6D8');
        continue;
      }
      let best = 9;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          if (!inside(sx + dx, sy + dy)) continue;
          const d = Math.max(Math.abs(dx), Math.abs(dy)) + (Math.abs(dx) + Math.abs(dy) > 4 ? 1 : 0);
          if (d < best) best = d;
        }
      if (best <= 3) p.set(x, y, cols[best - 1]);
    }
  h = p.toCanvas();
  haloCache.set(c, h);
  return h;
}

/**
 * Selection outline (target choice): the part's silhouette ringed with 1px of
 * #FFF6D8 and 1px of ink outside it, so it reads on the shadow body and on
 * the bright sunset alike.
 */
const selCache = new Map<HTMLCanvasElement, HTMLCanvasElement>();
function selectionOf(c: HTMLCanvasElement): HTMLCanvasElement {
  let h = selCache.get(c);
  if (h) return h;
  const [cv, ctx] = makeCanvas(c.width + 4, c.height + 4);
  ringInto(ctx, c, 2, 2);
  h = cv;
  selCache.set(c, h);
  return h;
}

/**
 * Paint a light + ink double ring around `c` (drawn at ox, oy) into ctx.
 * `live` = c changes every frame (the composed body): tint it fresh.
 */
const liveTint: HTMLCanvasElement[] = [];
function tintNow(c: HTMLCanvasElement, color: string, slot: number): HTMLCanvasElement {
  let t = liveTint[slot];
  if (!t) t = liveTint[slot] = makeCanvas(c.width, c.height)[0];
  if (t.width !== c.width || t.height !== c.height) {
    t.width = c.width;
    t.height = c.height;
  }
  const x = t.getContext('2d')!;
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, t.width, t.height);
  x.drawImage(c, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, t.width, t.height);
  x.globalCompositeOperation = 'source-over';
  return t;
}
function ringInto(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, ox: number, oy: number, live = false): void {
  const ink = live ? tintNow(c, '#2A2440', 0) : tinted(c, '#2A2440');
  const light = live ? tintNow(c, '#FFF6D8', 1) : tinted(c, '#FFF6D8');
  ctx.save();
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.drawImage(ink, ox + dx, oy + dy);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(light, ox + dx, oy + dy);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(c, ox, oy);
  ctx.restore();
}

const tintCache = new Map<string, HTMLCanvasElement>();
function tinted(img: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const key = color + ':' + img.width + 'x' + img.height + ':' + (img as HTMLCanvasElement & { _id?: number })._id;
  let c = tintCache.get(key);
  if (!c) {
    const [cv, ctx] = makeCanvas(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, img.width, img.height);
    c = cv;
    tintCache.set(key, c);
  }
  return c;
}
let idSeq = 1;

/** Smoothstep between (time, value) keys. */
function keyed(t: number, keys: [number, number][]): number {
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const p = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * p * p * (3 - 2 * p);
    }
  }
  return keys[keys.length - 1][1];
}

let qSticky: HTMLCanvasElement | null = null;
/** The "？" sticky over a glowing part: a 16×17 yellow note with a strip of tape. */
function questionSticky(): HTMLCanvasElement {
  if (qSticky) return qSticky;
  const p = PixelCanvas.fromArt(
    [
      '.....tttttt.....',
      'eeeeettttttteeee',
      'eyyyyyyyyyyyyyye',
      'eyyyyykkkkyyyyye',
      'eyyyykkyykkyyyye',
      'eyyyykkyykkyyyye',
      'eyyyyyyyykkyyyye',
      'eyyyyyyykkyyyyye',
      'eyyyyyykkyyyyyye',
      'eyyyyyykkyyyyyye',
      'eyyyyyyyyyyyyyye',
      'eyyyyyykkyyyyyye',
      'eyyyyyykkyyyyyYe',
      'eyyyyyyyyyyyyYYe',
      'eeeeeeeeeeeeeeee',
      '.ssssssssssssss.',
    ],
    { e: '#D9A441', y: '#F6D98A', Y: '#E9C46E', k: '#2A2440', t: '#AFD6E6', s: '#5B4A7A' },
  );
  qSticky = p.toCanvas();
  return qSticky;
}

registerEnemyArt('boss_omukaemachi', (): EnemyArt => {
  const b = buildAll();
  for (const L of [...Object.values(b.parts), b.gloveL, b.gloveR, b.recorder, b.bag, b.trinkets, b.fan]) (L.c as HTMLCanvasElement & { _id?: number })._id = idSeq++;
  const [comp, ctx] = makeCanvas(W, H);
  const [shape, sctx] = makeCanvas(W, H);
  const [selC, selCtx] = makeCanvas(W + 4, H + 4);
  let hurtUntil = -1;
  let lastPose = '';
  const art: EnemyArt & { partImage(id: string): HTMLCanvasElement | null } = {
    id: 'boss_omukaemachi',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    dynamic: true,
    partImage(id: string) {
      const k = PART_KEYS[id];
      return k ? b.parts[k].c : null;
    },
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      const gt = v.gt;
      if (v.pose === 'hurt' && lastPose !== 'hurt') hurtUntil = gt + 200;
      lastPose = v.pose;
      const still = !!f.final;
      const amp = gt < hurtUntil ? 4 : f.phase >= 2 ? 3 : 2;
      const breathe = still ? 0 : loop(gt, 800, 2);
      const lookup = v.pose === 'lookup' || v.pose === 'cap' ? -2 : 0;
      ctx.clearRect(0, 0, W, H);
      const put = (L: { c: HTMLCanvasElement; x: number; y: number }, dx = 0, dy = 0) => ctx.drawImage(L.c, OX + L.x + dx, OY + L.y + dy);
      const glowing = v.pose === 'chimeglow' || v.pose === 'chime';
      // a glowing part (迷子のお知らせ) pulses at 1Hz and pops 1.0→1.15→1.0
      // for the first 300ms, under a 3px halo of light
      const glowPut = (key: string, L: Layer, dx = 0, dy = 0) => {
        const on = f['glow_' + key] && !f['broken_' + key];
        if (!on) {
          put(L, dx, dy);
          return;
        }
        const k = gt - (v.params?.['glowAt_' + key] ?? -9999);
        // 1.0 → 1.2 → 0.96 → 1.0 over 360ms, then a steady 1Hz breath
        const pop = k >= 0 && k < 360 ? keyed(k, [[0, 1], [150, 1.2], [270, 0.96], [360, 1]]) : 1;
        const pulse = k >= 0 && k < 360 ? 1 : 0.75 + 0.2 * Math.sin((gt / 1000) * Math.PI * 2);
        const halo = haloOf(L.c);
        const cx = OX + L.x + dx + L.c.width / 2;
        const cy = OY + L.y + dy + L.c.height / 2;
        const hw = halo.width * pop;
        const hh = halo.height * pop;
        // the pool of light around it breathes with the halo
        const bl = bloomOf(L.c);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35 + 0.45 * ((pulse - 0.55) / 0.4);
        ctx.drawImage(bl, Math.round(cx - (bl.width * pop) / 2), Math.round(cy - (bl.height * pop) / 2), Math.round(bl.width * pop), Math.round(bl.height * pop));
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = pulse;
        ctx.drawImage(halo, Math.round(cx - hw / 2), Math.round(cy - hh / 2), Math.round(hw), Math.round(hh));
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = pulse * 0.35;
        ctx.drawImage(halo, Math.round(cx - hw / 2), Math.round(cy - hh / 2), Math.round(hw), Math.round(hh));
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        const w = L.c.width * pop;
        const h = L.c.height * pop;
        ctx.drawImage(L.c, Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
      };
      // behind the body: the recorder sticking out of the back, the umbrella bundle
      if (!f.gone_recorder) put(b.recorder, 0, breathe + lookup);
      if (!f.broken_umbrella && !f.gone_umbrella) glowPut('umbrella', b.parts.umbrella, 0, breathe);
      // shadow body: each row offset by a sine (outline wobble)
      const rows = (src: HTMLCanvasElement) => {
        for (let y = 0; y < 128; y++) {
          const dx = still ? 0 : Math.round(amp * Math.sin(2 * Math.PI * (y / 40 + gt / 1600)));
          const yy = y + (y < 56 ? breathe + lookup : breathe);
          ctx.drawImage(src, 0, y, 160, 1, OX + dx, OY + yy, 160, 1);
        }
      };
      rows(glowing ? b.bodyGlow : b.body);
      if (!f.gone_bag) put(b.bag, 0, breathe);
      rows(glowing ? b.frontGlow : b.front);
      put(b.trinkets, 0, 0);
      if (!f.broken_bottle && !f.gone_bottle) {
        if (v.pose === 'drink') ctx.drawImage(b.parts.bottle.c, OX + b.parts.bottle.x - 6, OY + b.parts.bottle.y - 10);
        else glowPut('bottle', b.parts.bottle, 0, breathe);
      }
      // gloves clasping the shins (fingers squeeze now and then)
      const squeeze = !still && gt % 3000 < 160 ? 1 : 0;
      if (!f.gone_glove) {
        if (v.pose !== 'armL') put(b.gloveL, squeeze, breathe);
        if (v.pose !== 'armR') put(b.gloveR, -squeeze, breathe);
      }
      if (!f.broken_shoe && !f.gone_shoe && v.pose !== 'kick') glowPut('shoe', b.parts.shoe);
      // head items
      if (!f.broken_cap && !f.gone_cap) glowPut('cap', b.parts.cap, 0, breathe + lookup);
      // eyes: two lost-child tags; pupils follow a target; tags flip as a blink
      const blink = !still && (gt % 4200 < 90 || !!f.eyesClosed);
      if (!f.gone_tag) {
        for (const [ex, ey] of [[58, 30], [86, 30]] as [number, number][]) {
          const tag = blink ? b.tagBack : b.tag;
          ctx.drawImage(tag, OX + ex, OY + ey + breathe + lookup);
          if (!blink) {
            const px = Math.round(((v.params?.pupil ?? 0) as number) * 3 + Math.sin(gt / 1300) * 2);
            const small = f.phase >= 2;
            ctx.fillStyle = '#2A2440';
            const sz = small ? 2 : 3;
            ctx.fillRect(OX + ex + 8 + px - (small ? 0 : 1), OY + ey + 8 + breathe + lookup - (small ? 0 : 1) + (lookup ? -1 : 0), sz, sz);
          }
        }
      }
      if (v.pose === 'umbrella' && !f.broken_umbrella) put(b.fan);
      // target selection (2Hz blink): the chosen part — or, for the body,
      // the whole shadow — ringed in light and ink
      const hl = v.params?.hl ?? 0;
      if (hl && Math.floor(gt / 250) % 2 === 0) {
        const key = ['', 'cap', 'umbrella', 'bottle', 'shoe'][hl];
        if (key && b.parts[key]) {
          const L = b.parts[key];
          const dy = key === 'cap' ? breathe + lookup : key === 'shoe' ? 0 : breathe;
          ctx.drawImage(selectionOf(L.c), OX + L.x - 2, OY + L.y + dy - 2);
        } else if (hl === 5) {
          selCtx.clearRect(0, 0, W + 4, H + 4);
          ringInto(selCtx, comp, 2, 2, true);
          ctx.drawImage(selC, -2, -2);
        }
      }
      // silhouette during the entrance
      const sil = v.params?.silhouette ?? 0;
      if (sil > 0) {
        sctx.clearRect(0, 0, W, H);
        sctx.globalCompositeOperation = 'source-over';
        sctx.drawImage(comp, 0, 0);
        sctx.globalCompositeOperation = 'source-in';
        sctx.fillStyle = '#1B1733';
        sctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = sil;
        ctx.drawImage(shape, 0, 0);
        ctx.globalAlpha = 1;
      }
      return comp;
    },
    over(g: Gfx, x: number, y: number, v: EnemyView): void {
      // "？" stickies above glowing parts (16px, bobbing 2px at 1Hz)
      for (const key of ['cap', 'umbrella', 'bottle', 'shoe']) {
        if (!v.flags['glow_' + key] || v.flags['broken_' + key]) continue;
        const L = buildAll().parts[key];
        const img = questionSticky();
        let sx = x + OX + L.x + Math.round(L.c.width / 2) - Math.round(img.width / 2);
        const bob = Math.round(Math.sin((v.gt / 1000) * Math.PI * 2) * 2);
        let sy = y + OY + L.y - img.height - 3;
        // no room over it (the cap sits right under the 1-line band): the
        // sticky goes on the right of the part instead
        if (sy < 33) {
          sx = x + OX + L.x + L.c.width + 3;
          sy = Math.max(33, y + OY + L.y + 2);
        }
        g.img(img, sx, sy + bob);
      }
    },
    restored(): HTMLCanvasElement {
      return b.parts.cap.c;
    },
    gallery: [
      { pose: 'idle' },
      { pose: 'idle', flags: { glow_bottle: 1, phase: 2 } },
      { pose: 'umbrella' },
    ],
  };
  return art;
});

void rimLeft;
