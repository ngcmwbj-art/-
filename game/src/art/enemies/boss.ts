// オムカエマチ (160×128): a giant child-shaped shadow sitting hugging its knees,
// made of forgotten things — school cap, lost-child tags for eyes, odd gloves,
// umbrellas, a water bottle, one indoor shoe (13.8). Parts are separate layers
// so they can glow, break and fly away; the shadow's outline wobbles per row.

import type { Gfx } from '../../engine/gfx';
import { makeCanvas, PixelCanvas } from '../../engine/pixel';
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
  const body = new PixelCanvas(160, 128);
  const m = new Mask(160, 128)
    .ellipse(80, 34, 27, 26) // head
    .ellipse(80, 76, 52, 38) // torso behind the knees
    .ellipse(58, 78, 21, 24) // left knee
    .ellipse(102, 78, 21, 24) // right knee
    .ellipse(80, 112, 50, 12) // seat / feet
    .rect(34, 60, 92, 50);
  shade(body, m, SHADOW, { base: 0.52, k: 0.65, bevel: 6, dither: 0.4 });
  // knee separation line and inner folds
  for (let y = 60; y < 100; y++) body.set(80 + Math.round(Math.sin(y * 0.2)), y, SHADOW[1]);
  // sunset rim light along the upper-left edges (α50%)
  m.each((x, y) => {
    if (!m.in(x, y - 1) || (!m.in(x - 1, y) && y < 90)) body.set(x, y, '#9A5A6A');
    else if (!m.in(x, y - 2) && x < 90) body.set(x, y, SHADOW[5]);
  });
  // floor shadow in the last rows (behind the status panels)
  for (let y = 122; y < 128; y++) for (let x = 20; x < 140; x++) if (!m.in(x, y) && hash2(x, y, 2) < 0.8) body.set(x, y, '#2A2440');
  body.outline(K.outline);
  const bodyC = body.toCanvas();
  const [glowC, gctx] = makeCanvas(160, 128);
  gctx.drawImage(bodyC, 0, 0);
  gctx.globalCompositeOperation = 'source-atop';
  gctx.fillStyle = '#FFD23F';
  gctx.globalAlpha = 0.35;
  gctx.fillRect(0, 0, 160, 128);

  // ---- parts --------------------------------------------------------------------------
  const cap = layer(68, 30, 46, 2, (p) => {
    const dome = new Mask(68, 30).ellipse(34, 16, 30, 15).and(new Mask(68, 30).rect(0, 0, 68, 21));
    shade(p, dome, ['#8A6A10', '#C8A020', '#E0BC30', '#F5D33B', '#FFE98A'], { mode: 'sphere', cx: 30, cy: 10, rx: 34, ry: 18, base: 0.6, k: 0.7 });
    // brim sticking out front-left
    const brim = new Mask(68, 30).ellipse(28, 22, 28, 4.5).and(new Mask(68, 30).rect(0, 19, 68, 11));
    shade(p, brim, ['#8A6A10', '#C8A020', '#E0BC30', '#F5D33B'], { base: 0.55, bevel: 2 });
    p.hline(4, 50, 20, '#8A6A10');
    // blank name field on the front (3×8)
    p.rect(30, 8, 8, 4, '#F4F1E8');
    p.hline(30, 37, 11, '#C8C2B4');
    // stitching lines
    for (let x = 12; x < 58; x += 3) p.set(x, 14 + Math.round(Math.sin(x * 0.12) * 2), '#C8A020');
    p.set(34, 1, '#C8A020');
    p.set(34, 2, '#FFE98A');
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
  const gloveL = layer(20, 18, 50, 76, (p) => {
    const g = new Mask(20, 18).ellipse(10, 9, 9, 7.5);
    shade(p, g, ['#801A12', '#B8241E', '#E84E3C', '#FF7A62'], { mode: 'sphere', base: 0.6 });
    for (let i = 0; i < 3; i++) p.line(12 + i * 2, 4, 12 + i * 2, 10, '#B8241E');
    p.hline(2, 8, 15, '#F4F1E8');
  });
  const gloveR = layer(20, 18, 90, 76, (p) => {
    const g = new Mask(20, 18).ellipse(10, 9, 9, 7.5);
    shade(p, g, ['#2F7AB0', '#4AA8E0', '#7FD1E8', '#B0E8F4'], { mode: 'sphere', base: 0.6 });
    for (let i = 0; i < 3; i++) p.line(4 + i * 2, 4, 4 + i * 2, 10, '#4AA8E0');
    p.hline(11, 17, 15, '#F4F1E8');
  });
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
  const bag = layer(28, 26, 66, 52, (p) => {
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

function glowOutline(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, color: string): void {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    ctx.save();
    ctx.drawImage(tinted(img, color), x + dx, y + dy);
    ctx.restore();
  }
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

registerEnemyArt('boss_omukaemachi', (): EnemyArt => {
  const b = buildAll();
  for (const L of [...Object.values(b.parts), b.gloveL, b.gloveR, b.recorder, b.bag, b.trinkets, b.fan]) (L.c as HTMLCanvasElement & { _id?: number })._id = idSeq++;
  const [comp, ctx] = makeCanvas(W, H);
  const [shape, sctx] = makeCanvas(W, H);
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
      // shadow body: each row offset by a sine (outline wobble)
      const src = v.pose === 'chimeglow' || v.pose === 'chime' ? b.bodyGlow : b.body;
      for (let y = 0; y < 128; y++) {
        const dx = still ? 0 : Math.round(amp * Math.sin(2 * Math.PI * (y / 40 + gt / 1600)));
        const yy = y + (y < 56 ? breathe + lookup : breathe);
        ctx.drawImage(src, 0, y, 160, 1, OX + dx, OY + yy, 160, 1);
      }
      const put = (L: { c: HTMLCanvasElement; x: number; y: number }, dx = 0, dy = 0) => ctx.drawImage(L.c, OX + L.x + dx, OY + L.y + dy);
      if (!f.gone_recorder) put(b.recorder, 0, breathe + lookup);
      put(b.trinkets, 0, 0);
      if (!f.gone_bag) put(b.bag, 0, breathe);
      if (!f.broken_umbrella && !f.gone_umbrella) put(b.parts.umbrella, 0, breathe);
      if (!f.broken_bottle && !f.gone_bottle) {
        if (v.pose === 'drink') ctx.drawImage(b.parts.bottle.c, OX + b.parts.bottle.x - 6, OY + b.parts.bottle.y - 10);
        else put(b.parts.bottle, 0, breathe);
      }
      // gloves clasping the knees (fingers squeeze now and then)
      const squeeze = !still && gt % 3000 < 160 ? 1 : 0;
      if (!f.gone_glove) {
        if (v.pose !== 'armL') put(b.gloveL, squeeze, breathe);
        if (v.pose !== 'armR') put(b.gloveR, -squeeze, breathe);
      }
      if (!f.broken_shoe && !f.gone_shoe && v.pose !== 'kick') put(b.parts.shoe);
      // head items
      if (!f.broken_cap && !f.gone_cap) put(b.parts.cap, 0, breathe + lookup);
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
      // glowing parts: 1px outline alternating 2Hz + a "？" sticky
      for (const [key, pid] of [['cap', 'cap'], ['umbrella', 'umbrella'], ['bottle', 'bottle'], ['shoe', 'shoe']] as [string, string][]) {
        if (!f['glow_' + pid] || f['broken_' + pid]) continue;
        const L = b.parts[key];
        const col = Math.floor(gt / 250) % 2 ? '#FFE7A3' : '#FF6A4D';
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        glowOutline(ctx, L.c, OX + L.x, OY + L.y + (key === 'cap' ? breathe : 0), col);
        ctx.restore();
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
      // "？" stickies above glowing parts
      for (const key of ['cap', 'umbrella', 'bottle', 'shoe']) {
        if (!v.flags['glow_' + key] || v.flags['broken_' + key]) continue;
        const L = buildAll().parts[key];
        const sx = x + OX + L.x + Math.round(L.c.width / 2) - 5;
        const sy = y + OY + L.y - 12 + (Math.floor(v.gt / 300) % 2);
        g.rect(sx, sy, 11, 11, '#D9A441');
        g.rect(sx + 1, sy + 1, 9, 9, '#F6D98A');
        g.px(sx + 4, sy + 3, '#2A2440');
        g.px(sx + 5, sy + 2, '#2A2440');
        g.px(sx + 6, sy + 3, '#2A2440');
        g.px(sx + 6, sy + 4, '#2A2440');
        g.px(sx + 5, sy + 5, '#2A2440');
        g.px(sx + 5, sy + 7, '#2A2440');
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
