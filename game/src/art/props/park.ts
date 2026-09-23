// 夕鳴公園 (30_level_art 6.5 公園 / 8.4): the stopped clock tower, the hippo
// slide, swings, wisteria trellis, benches, fountain, disaster-radio pole,
// signs, the girl's sand dike, pigeons, floating litter in stage 2.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas, mix } from '../../engine/pixel';
import { charSprite, idleFrame, poseFrame } from '../chars';
import { P } from '../tiles/palette';
import { ihash } from '../tiles/noise';
import { castRight, cylinder, dk, finish, lt, maskOf, outline } from './kit';
import { flat, floatOffset, mkFrames, stand, standAnim } from './pkit';
import { registerProp } from './registry';
import { poleLampState } from './street';
import { fontTextSmall, printLines, tiny } from './text';
import type { PropArt, PropEnv } from './types';

const pc = (w: number, h: number) => new PixelCanvas(w, h);

// ---------------------------------------------------------------- 時計塔 prop_clocktower (15–16, 6–7)

function towerBase(): PixelCanvas {
  const W = 34;
  const H = 92;
  const p = pc(W, H);
  const cx = 17;
  // stone pedestal (2 tiles wide, 20px tall)
  p.rect(1, H - 20, 32, 19, P.concrete);
  for (let y = H - 20; y < H - 1; y++)
    for (let x = 1; x < 33; x++) {
      const row = Math.floor((y - (H - 20)) / 5);
      const off = row % 2 ? 4 : 0;
      if ((x + off) % 8 === 0 || (y - (H - 20)) % 5 === 4) p.set(x, y, P.steel);
      else if ((x + off) % 8 === 1) p.set(x, y, P.concreteLt);
    }
  p.hline(1, 32, H - 20, P.white);
  p.hline(1, 32, H - 2, P.asphalt);
  // plaque (obj_clocktower_base)
  p.rect(10, H - 15, 14, 8, P.brass);
  p.strokeRect(10, H - 15, 14, 8, P.brassOld);
  printLines(p, 12, H - 13, 10, 3, P.brassOld, 5);
  // shaft: white, fluted
  const top = 26;
  for (let y = top; y < H - 20; y++) {
    const half = 7;
    for (let x = cx - half; x < cx + half; x++) {
      const u = (x - (cx - half)) / (half * 2 - 1);
      let c: string = u < 0.15 ? P.glint : u < 0.35 ? P.white : u > 0.8 ? P.concrete : P.white;
      if ((x - cx + half) % 4 === 3 && u > 0.2) c = P.concreteLt;
      p.set(x, y, c);
    }
  }
  // clock box
  p.rect(cx - 11, top - 16, 22, 22, P.white);
  p.hline(cx - 11, cx + 10, top - 16, P.glint);
  p.vline(cx - 11, top - 16, top + 5, P.glint);
  p.vline(cx + 10, top - 15, top + 5, P.concrete);
  p.hline(cx - 11, cx + 10, top + 5, P.steel);
  // roof: blue-green hipped cap + finial
  p.poly([[cx - 13, top - 15], [cx, top - 28], [cx + 13, top - 15]], P.leafDeep);
  p.line(cx - 13, top - 15, cx, top - 28, P.aqua);
  p.line(cx, top - 28, cx + 13, top - 15, P.leafShade);
  for (let y = top - 26; y < top - 15; y += 3) p.hline(cx - 10 + (top - 15 - y) - 2, cx + 10 - (top - 15 - y) + 2, y, P.leafShade);
  p.hline(cx - 13, cx + 13, top - 15, P.leafShade);
  p.vline(cx, top - 32, top - 28, P.brass);
  p.set(cx, top - 33, P.gold);
  // face (dia 18)
  p.ellipse(cx - 0.5, top - 5.5, 9, 9, P.brassOld);
  p.ellipse(cx - 0.5, top - 5.5, 8, 8, P.paper);
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    p.set(Math.round(cx - 0.5 + Math.sin(a) * 6.5), Math.round(top - 5.5 - Math.cos(a) * 6.5), k % 3 === 0 ? P.ink : P.steel);
  }
  finish(p, { soft: true });
  return p;
}

let TOWER: PixelCanvas | null = null;
registerProp('prop_clocktower', () => {
  TOWER ??= towerBase();
  const img = TOWER.toCanvas();
  const top = 26;
  const cx = 17;
  // anchor: (15,7), 2 tiles wide
  const a = stand(img, { cx: 16, base: 16, shadow: 88, contact: 30 });
  const fx = a.ox + cx - 0.5;
  const fy = a.oy + top - 5.5;
  a.over = (g, x, y, env) => {
    // hands: 16:5x running (stage 0), 17:00 stopped (1, 2), 17:01 (night)
    let h: number;
    let m: number;
    let sec: number;
    if (env.stage === 0) {
      const tt = env.t / 1000;
      m = 52 + ((tt / 60) % 8);
      h = 16;
      sec = tt % 60;
    } else if (env.stage === 3) {
      h = 17;
      m = 1 + ((env.t / 60000) % 58);
      sec = (env.t / 1000) % 60;
    } else {
      h = 17;
      m = 0;
      sec = env.stage === 2 && Math.floor(env.t / 1000) % 7 === 0 ? 59 : 0;
    }
    const ctx = g.ctx;
    const X = Math.round(x + fx);
    const Y = Math.round(y + fy);
    const line = (len: number, ang: number, col: string) => {
      ctx.fillStyle = col;
      const steps = Math.ceil(len);
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * len;
        ctx.fillRect(Math.round(X + Math.sin(ang) * t), Math.round(Y - Math.cos(ang) * t), 1, 1);
      }
    };
    line(3.5, (((h % 12) + m / 60) * Math.PI) / 6, P.ink);
    line(5.5, (m * Math.PI) / 30, P.ink);
    line(6, (Math.floor(sec) * Math.PI) / 30, P.verm);
    ctx.fillStyle = P.brass;
    ctx.fillRect(X, Y, 1, 1);
  };
  return a;
});

// ---------------------------------------------------------------- カバのすべり台 obj_kaba (4–6, 9–10)

const KABA = [false, true].map((ne) => {
  // a light-blue hippo slide: back with the ladder at the north, big head
  // facing the viewer, the open mouth is where the slide comes out
  const p = pc(50, 38);
  // body (rounded back), lit from the upper left
  p.ellipse(25, 13, 19, 11, P.blue);
  p.ellipse(23, 12, 17, 10, P.aqua);
  p.ellipse(19, 9, 9, 5, P.glint);
  p.ellipse(20, 10, 9, 5, P.aqua);
  // ladder rails and rungs on the back
  p.vline(21, 1, 10, P.steel);
  p.vline(29, 1, 10, P.steel);
  for (let k = 0; k < 4; k++) p.hline(22, 28, 2 + k * 2, k % 2 ? P.concrete : P.white);
  // stubby legs
  for (const x of [8, 38]) {
    p.rect(x, 18, 5, 6, P.blue);
    p.hline(x, x + 4, 23, P.navy);
  }
  // head (wide snout) facing the screen
  p.ellipse(25, 24, 15, 9, P.aqua);
  p.ellipse(21, 21, 7, 3, P.glint);
  p.ellipse(25, 22, 15, 9, P.aqua);
  for (let y = 22; y < 33; y++) for (let x = 30; x < 41; x++) if (p.alpha(x, y) && (x + y) % 2 === 0) p.set(x, y, P.blue);
  // open mouth = slide exit, the pink tongue is the slide
  p.ellipse(25, 29, 10, 5, P.maroon);
  p.ellipse(25, 31, 8, 4, P.peach);
  p.ellipse(24, 31, 5, 2, P.crimson);
  p.rect(18, 34, 15, 3, P.peach); // slide lip on the ground
  p.hline(18, 32, 34, P.glint);
  // teeth
  p.rect(19, 25, 2, 2, P.white);
  p.rect(30, 25, 2, 2, P.white);
  // nostrils
  p.set(21, 20, P.navy);
  p.set(29, 20, P.navy);
  // eyes on top of the head (stage 2: looking north-east), little ears
  for (const ex of [17, 33]) {
    p.ellipse(ex, 15, 3, 2.5, P.white);
    p.set(ex + (ne ? 1 : 0), 15 - (ne ? 1 : 0), P.ink);
    p.set(ex + 1 + (ne ? 1 : 0), 15 - (ne ? 1 : 0), P.ink);
    p.ellipse(ex + (ex < 25 ? -4 : 4), 12, 2, 1.5, P.blue);
    p.set(ex + (ex < 25 ? -4 : 4), 12, P.peach);
  }
  finish(p, { soft: true });
  return p.toCanvas();
});

registerProp('obj_kaba', () => {
  const a = stand(KABA[0], { cx: 24, base: 32, shadow: 30, contact: 40 });
  a.img = (env) => KABA[env.stage === 2 ? 1 : 0];
  return a;
});

// ---------------------------------------------------------------- ブランコ obj_swing (7–10, 3)

let SWING_FRAME: HTMLCanvasElement | null = null;
function swingFrame(): HTMLCanvasElement {
  if (SWING_FRAME) return SWING_FRAME;
  const p = pc(66, 44);
  // two A-frame legs (red), top bar
  for (const x of [3, 61]) {
    p.line(x - 2, 43, x, 2, P.red);
    p.line(x + 2, 43, x, 2, P.vermShade);
    p.line(x - 1, 43, x + 1, 2, P.vermLt);
  }
  p.hline(1, 64, 2, P.vermLt);
  p.hline(1, 64, 3, P.red);
  p.hline(1, 64, 4, P.vermShade);
  finish(p, { soft: true });
  SWING_FRAME = p.toCanvas();
  return SWING_FRAME;
}

function seat(g: Gfx, x: number, topY: number, len: number, dx: number): void {
  const ctx = g.ctx;
  ctx.fillStyle = P.steel;
  for (let k = 0; k < len; k++) {
    const t = k / len;
    ctx.fillRect(Math.round(x + dx * t), topY + k, 1, 1);
    ctx.fillRect(Math.round(x + 9 + dx * t), topY + k, 1, 1);
  }
  ctx.fillStyle = P.woodLt;
  ctx.fillRect(Math.round(x + dx - 1), topY + len, 12, 2);
  ctx.fillStyle = P.wood;
  ctx.fillRect(Math.round(x + dx - 1), topY + len + 2, 12, 1);
}

registerProp('obj_swing', () => {
  const img = swingFrame();
  const a: PropArt = {
    ox: 0,
    oy: 16 - 44,
    w: 66,
    h: 44,
    foot: 15,
    img: () => img,
    shadow: 40,
    contact: 0,
    over(g, x, y, env) {
      const top = y + 16 - 44 + 5;
      // stage 0: gentle swing; 1: stuck on the diagonal; 2: leaning NE
      const s0 = Math.sin(env.t / 700 + env.seed * 6);
      const d1 = env.stage === 0 ? Math.round(s0 * 2) : env.stage === 1 ? 3 : 4;
      const d2 = env.stage === 0 ? Math.round(Math.sin(env.t / 820 + 2) * 1) : env.stage === 1 ? -2 : 4;
      const len1 = env.stage === 1 ? 26 : env.stage === 2 ? 25 : 28 - Math.abs(d1);
      const len2 = env.stage === 1 ? 27 : env.stage === 2 ? 25 : 28 - Math.abs(d2);
      seat(g, x + 12, top, len1, d1);
      seat(g, x + 40, top, len2, d2);
    },
  };
  return a;
});

// ---------------------------------------------------------------- 鉄棒 obj_tetsubo (21–23, 3)

registerProp('obj_tetsubo', () => {
  const p = pc(50, 30);
  const posts = [2, 17, 32, 47];
  const hs = [18, 22, 26];
  for (let k = 0; k < 3; k++) {
    const bx0 = posts[k];
    const bx1 = posts[k + 1];
    const by = 29 - hs[k];
    p.hline(bx0, bx1, by, P.concreteLt);
    p.hline(bx0, bx1, by + 1, P.steel);
  }
  for (const [i, x] of posts.entries()) {
    const h = hs[Math.min(2, i)];
    p.vline(x, 29 - Math.max(h, hs[Math.max(0, i - 1)]), 29, P.navy);
    p.vline(x + 1, 29 - Math.max(h, hs[Math.max(0, i - 1)]), 29, P.nightShade);
    p.set(x, 29 - Math.max(h, hs[Math.max(0, i - 1)]), P.blue);
  }
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 24, shadow: 26, contact: 0 });
});

// ---------------------------------------------------------------- 藤棚 prop_wisteria (6–9, 6) + ベンチ

registerProp('prop_wisteria', () => {
  const posts = pc(66, 34);
  for (const x of [4, 60]) {
    posts.rect(x, 2, 3, 32, P.wood);
    posts.vline(x, 2, 33, P.woodLt);
    posts.vline(x + 2, 2, 33, P.woodDark);
  }
  finish(posts, { soft: true });
  // trellis roof with summer leaves (foreground)
  const roof = [0, 1].map((k) => {
    const p = pc(74, 30);
    for (let x = 2; x < 72; x += 6) p.vline(x, 4, 24, P.woodDark);
    for (let y = 6; y < 26; y += 6) p.hline(1, 72, y, P.wood);
    for (let n = 0; n < 60; n++) {
      const h = ihash(n, k, 2501);
      const cx = 3 + (h % 68);
      const cy = 3 + ((h >>> 8) % 22);
      p.ellipse(cx, cy, 3.5, 2.5, (h >>> 16) % 3 === 0 ? P.leafYoung : P.leaf);
      p.set(cx - 1, cy - 1, P.leafLt);
      p.set(cx + 2, cy + 1, P.leafDeep);
    }
    // a few hanging vines
    for (let n = 0; n < 7; n++) {
      const vx = 6 + n * 10 + (k ? 1 : 0);
      p.vline(vx, 24, 27 + (n % 3), P.leafDeep);
    }
    outline(p, { soft: true });
    return p.toCanvas();
  });
  const img = posts.toCanvas();
  // the trellis shadow: the leaf clusters' shape (not a box), 2px dithered
  // edge, sun dapples punched through (2 twinkle phases, frozen in stage 1)
  const shade = [0, 1].map((k) => {
    const sw = 78;
    const sh = 30;
    const cov = new Float32Array(sw * sh);
    for (let n = 0; n < 60; n++) {
      const hh = ihash(n, 0, 2501);
      const cx = 5 + (hh % 68);
      const cy = 3 + ((hh >>> 8) % 22);
      for (let y = -4; y <= 4; y++)
        for (let x = -5; x <= 5; x++) {
          const e = (x / 4.6) ** 2 + (y / 3.4) ** 2;
          const xx = cx + x;
          const yy = cy + y;
          if (xx < 0 || yy < 0 || xx >= sw || yy >= sh) continue;
          cov[yy * sw + xx] = Math.max(cov[yy * sw + xx], e <= 0.55 ? 2 : e <= 1 ? 1 : 0);
        }
    }
    const sp = pc(sw, sh);
    for (let y = 0; y < sh; y++)
      for (let x = 0; x < sw; x++) {
        const c = cov[y * sw + x];
        if (c === 2 || (c === 1 && ((x + y) & 1) === 0)) sp.set(x, y, '#000000');
      }
    // dapples: 3–5px round holes
    for (let d = 0; d < 9; d++) {
      const hh = ihash(d, k, 2503);
      const cx = 6 + (hh % 64);
      const cy = 4 + ((hh >>> 8) % 20);
      const r = 1.2 + ((hh >>> 16) % 3) * 0.5;
      for (let y = -3; y <= 3; y++)
        for (let x = -3; x <= 3; x++) if ((x / (r + 0.6)) ** 2 + (y / r) ** 2 <= 1) sp.set(cx + x, cy + y, 'transparent');
    }
    return sp.toCanvas();
  });
  return {
    ox: 0,
    oy: 16 - 34,
    w: 66,
    h: 34,
    foot: 15,
    img: () => img,
    shadow: 30,
    contact: 0,
    fg: [
      {
        ox: -4,
        oy: 16 - 34 - 12,
        img: (env: PropEnv) => roof[env.stage === 1 ? 0 : Math.floor(env.mt / 800) % 2],
        fade: { x: -4, y: -30, w: 74, h: 44, alpha: 0.6 },
      },
    ],
    shadowFn(ctx, x, y, dir, len, env) {
      if (len <= 0.01) return;
      const h = 30;
      // posts
      for (const px of [5, 61]) {
        const bx = x + px;
        const by = y + 15;
        ctx.beginPath();
        ctx.moveTo(bx - 1, by);
        ctx.lineTo(bx + 2, by);
        ctx.lineTo(bx + 2 + dir[0] * len * h, by + dir[1] * len * h);
        ctx.lineTo(bx - 1 + dir[0] * len * h, by + dir[1] * len * h);
        ctx.closePath();
        ctx.fill();
      }
      // the leafy roof, thrown with the sun
      const k = env.stage === 1 ? 0 : Math.floor(env.mt / 900) % 2;
      ctx.drawImage(shade[k], Math.round(x - 6 + dir[0] * len * h), Math.round(y - 12 + dir[1] * len * h));
    },
  };
});

function benchImg(w: number, back = true): PixelCanvas {
  const p = pc(w, 18);
  if (back) {
    p.rect(1, 1, w - 2, 4, P.woodLt);
    p.hline(1, w - 2, 1, P.goldPale);
    p.hline(1, w - 2, 4, P.wood);
    p.rect(1, 6, w - 2, 3, P.woodLt);
    p.hline(1, w - 2, 8, P.wood);
  }
  p.rect(1, 9, w - 2, 4, P.woodLt);
  p.hline(1, w - 2, 9, P.goldPale);
  p.hline(1, w - 2, 12, P.wood);
  for (const x of [3, w - 5]) p.rect(x, 13, 2, 4, P.charcoal);
  finish(p, { soft: true });
  return p;
}

registerProp('obj_park_bench', () => stand(benchImg(32).toCanvas(), { cx: 16, shadow: 14, contact: 26 }));
registerProp('prop_park_bench', () => stand(benchImg(32).toCanvas(), { cx: 16, shadow: 14, contact: 26 }));

registerProp('obj_early_leaf', () => {
  const p = pc(6, 5);
  p.set(1, 2, P.brass);
  p.set(2, 1, P.gold);
  p.set(2, 2, P.brass);
  p.set(3, 2, P.brassOld);
  p.set(3, 3, P.brassOld);
  p.set(4, 3, P.wood);
  const img = p.toCanvas();
  // floats in stage 2 (fx_float)
  return { ox: 6, oy: 8, w: 6, h: 5, foot: 12, ...floaty(img, 6, 8) } as PropArt;
});

/** Stage-2 float (fx_float): the prop bobs 1–2px, its contact shadow shrinks. */
function floaty(img: HTMLCanvasElement, ox: number, oy: number): Partial<PropArt> {
  return {
    img: (env: PropEnv) => (env.stage === 2 ? null : img),
    over(g, x, y, env) {
      if (env.stage !== 2) return;
      const dy = floatOffset(env, 2);
      g.rect(x + ox + 1, y + oy + img.height, img.width - 2, 1, P.ink, 0.25);
      g.img(img, x + ox, y + oy + dy);
    },
  };
}

// ---------------------------------------------------------------- 砂場

registerProp('prop_sandbox_frame', () => {
  // timber curb (3px: lit top, inner face, outer face) around the sand
  // (x21–24, y8–10), with mounds, holes and footprints in the sand
  const w = 4 * 16 + 6;
  const h = 3 * 16 + 6;
  const p = pc(w, h);
  const T = 3; // beam width
  // sand life: mounds (lit NW, shaded SE), holes, footprints, a lost spade
  const sandLt = P.white;
  const sandDk = mix(P.paperGrid, P.woodLt, 0.8);
  const mound = (cx: number, cy: number, r: number) => {
    for (let y = -r; y <= r; y++)
      for (let x = -r - 1; x <= r + 1; x++) {
        const e = (x / (r + 1)) ** 2 + (y / r) ** 2;
        if (e > 1) continue;
        const c = x + y < -r * 0.4 ? sandLt : x + y > r * 0.5 ? sandDk : null;
        if (c) p.set(cx + x, cy + y, c);
      }
    // shadow on the sand, east of the mound
    for (let y = -r + 1; y <= r; y++) p.set(cx + r + 2, cy + y, sandDk);
  };
  const hole = (cx: number, cy: number) => {
    p.ellipse(cx, cy, 3, 2, P.woodLt);
    p.ellipse(cx - 0.5, cy - 0.5, 2, 1.2, P.brassOld);
    p.hline(cx - 2, cx + 2, cy + 2, sandLt);
    p.set(cx + 3, cy + 1, sandLt);
  };
  const foot = (x: number, y: number) => {
    p.rect(x, y, 2, 3, sandDk);
    p.set(x, y + 3, sandDk);
    p.rect(x + 3, y + 2, 2, 3, sandDk);
    p.set(x + 4, y + 5, sandDk);
  };
  mound(14, 16, 4);
  mound(22, 13, 2);
  hole(46, 20);
  hole(12, 38);
  for (let k = 0; k < 4; k++) foot(30 + k * 6, 30 + (k % 2) * 3);
  foot(52, 40);
  // a small green spade stuck in the mound
  p.line(15, 9, 17, 13, P.woodDark);
  p.rect(13, 7, 3, 3, P.leafDeep);
  p.set(13, 7, P.leafYoung);
  // the curb: west & north beams show their lit top, the inner faces show
  // below/right of them; the south & east beams show their outer faces
  for (let x = 0; x < w; x++) {
    for (let t = 0; t < T; t++) {
      p.set(x, t, t === 0 ? P.goldPale : P.woodLt); // north beam top
      p.set(x, h - T - 2 + t, t === 0 ? P.goldPale : P.woodLt); // south beam top
    }
    p.set(x, T, P.wood); // north beam inner face (seen from the south)
    p.set(x, T + 1, P.woodDark);
    p.set(x, h - 2, P.wood); // south beam outer face
    p.set(x, h - 1, P.ink);
  }
  for (let y = 0; y < h - 1; y++) {
    for (let t = 0; t < T; t++) {
      p.set(t, y, t === 0 ? P.goldPale : P.woodLt); // west beam top
      p.set(w - T + t, y, t === T - 1 ? P.wood : P.woodLt); // east beam top
    }
    if (y > T + 1 && y < h - T - 2) {
      // the west beam's shadow on the sand (sun from the west)
      p.set(T, y, sandDk);
      p.set(T + 1, y, (y & 1) ? sandDk : P.paperGrid);
    }
    p.set(w - 1, y, P.woodDark);
  }
  // board joints and corner posts
  for (let x = 16; x < w - 4; x += 17) {
    p.vline(x, 0, T - 1, P.wood);
    p.vline(x + 3, h - T - 2, h - 3, P.wood);
  }
  for (const [x, y] of [[0, 0], [w - 4, 0], [0, h - 5], [w - 4, h - 5]] as [number, number][]) {
    p.rect(x, y, 4, 4, P.wood);
    p.hline(x, x + 3, y, P.woodLt);
    p.set(x, y, P.goldPale);
  }
  return flat(p.toCanvas(), -3, -3);
});

registerProp('obj_sandbox', () => {
  // fushigi_07「夕日の堤防」: a sand dike 5px high facing the sunset (west),
  // a moat behind it holding sky, a red bucket and a yellow shovel
  const p = pc(32, 22);
  const top0 = P.white;
  const face = mix(P.paperGrid, P.woodLt, 0.7);
  const faceDk = P.woodLt;
  const shadow = mix(P.woodLt, P.brassOld, 0.5);
  // moat (north of the dike) → glass, with a damp rim
  for (let x = 4; x < 26; x++) {
    p.set(x, 4, faceDk);
    p.set(x, 5, P.navy);
    p.set(x, 6, P.navy);
  }
  for (let x = 3; x < 27; x++) {
    const hgt = 5 + Math.round(Math.sin(x / 2.6) * 0.8);
    const top = 13 - hgt;
    // ridge (lit top), south face in two bands, foot shadow on the sand (east/south)
    p.set(x, top, top0);
    p.set(x, top + 1, P.paper);
    for (let y = top + 2; y < 13; y++) p.set(x, y, y < top + 4 ? face : faceDk);
    p.set(x, 13, shadow);
    p.set(x + 1, 14, shadow);
  }
  // west end lit, east end in shade
  p.vline(2, 9, 12, P.paper);
  p.vline(27, 9, 13, shadow);
  // a little castle bump with a flag stick
  p.rect(13, 2, 4, 4, top0);
  p.vline(16, 3, 5, face);
  p.set(15, 1, P.woodDark);
  p.set(15, 0, P.woodDark);
  p.set(16, 0, P.verm);
  p.set(17, 0, P.verm);
  // bucket (red) and shovel (yellow)
  p.rect(27, 5, 5, 6, P.red);
  p.hline(27, 31, 5, P.vermLt);
  p.hline(27, 31, 10, P.vermShade);
  p.vline(31, 6, 10, P.vermShade);
  p.set(26, 4, P.steel);
  p.hline(27, 31, 11, shadow);
  p.line(0, 19, 5, 16, P.gold);
  p.rect(0, 19, 2, 2, P.brass);
  const img = p.toCanvas();
  const glass = maskOf(32, 22, (x, y) => (y === 5 || y === 6) && x >= 4 && x < 26);
  return flat(img, -19, -1, { glass });
});

// ---------------------------------------------------------------- 水飲み場 obj_drinking_fountain

const FOUNTAIN = mkFrames(5, 18, 30, (p, k) => {
  // stone pillar with an upward tap; frame 4 = water bent north-east (stage 2)
  p.rect(5, 12, 8, 17, P.concrete);
  p.vline(5, 12, 28, P.concreteLt);
  p.vline(12, 12, 28, P.steel);
  for (let y = 15; y < 28; y += 4) p.hline(6, 11, y, P.concreteLt);
  p.rect(3, 9, 12, 4, P.concreteLt);
  p.hline(3, 14, 9, P.white);
  p.hline(3, 14, 12, P.steel);
  p.rect(8, 7, 2, 2, P.steel);
  p.set(8, 7, P.glint);
  // the water jet (goes UP): 4 frames
  const col = [P.aqua, P.glint];
  if (k < 4) {
    const hgt = 4 + (k % 2);
    for (let j = 0; j < hgt; j++) p.set(8 + (j > 3 && k === 2 ? 1 : 0), 6 - j, col[(j + k) % 2]);
    p.set(7, 7 - hgt + (k % 2), P.aqua);
    p.set(10, 8 - (k === 3 ? 1 : 0), P.aqua);
  } else {
    for (let j = 0; j < 5; j++) p.set(8 + j, 6 - Math.floor(j * 0.8), col[j % 2]);
  }
  p.rect(4, 28, 10, 2, P.steel);
}, (p) => finish(p, { soft: true }));

registerProp('obj_drinking_fountain', () =>
  standAnim(FOUNTAIN, (env) => (env.stage === 2 ? 4 : Math.floor(env.t / 150) % 4), { shadow: 26 }),
);

// ---------------------------------------------------------------- 防災無線スピーカー柱 obj_speaker_pole (27,3)

registerProp('obj_speaker_pole', () => {
  // 60px tall so the horns, the solar panel and the beacon stay inside the
  // map (the camera stops at y=0; the pole stands on row 3)
  const W = 30;
  const H = 60;
  const p = pc(W, H);
  const cx = 15;
  cylinder(p, cx - 2, 14, 5, H - 14, P.concrete);
  for (let y = 32; y < H; y += 9) p.hline(cx - 2, cx + 2, y, P.steel);
  // cable conduit down the pole
  p.vline(cx + 3, 28, H - 2, P.steel);
  // horn speakers (4) around the top
  const horn = (x: number, y: number, flip: boolean) => {
    const d = flip ? -1 : 1;
    p.rect(x, y, 6, 5, P.concreteLt);
    p.vline(x + (flip ? 0 : 5), y - 1, y + 5, P.white);
    p.vline(x + (flip ? 5 : 0), y + 1, y + 3, P.steel);
    p.set(x + (flip ? -1 : 6), y + 2, P.steel);
    void d;
  };
  horn(cx - 12, 16, true);
  horn(cx + 5, 16, false);
  horn(cx - 12, 23, true);
  horn(cx + 5, 23, false);
  // solar panel on top
  p.poly([[cx - 10, 10], [cx + 8, 6], [cx + 10, 11], [cx - 8, 15]], P.navy);
  p.line(cx - 10, 10, cx + 8, 6, P.blue);
  p.line(cx - 1, 8, cx + 1, 13, P.nightShade);
  p.vline(cx, 11, 15, P.steel);
  // control box
  p.rect(cx - 5, 36, 10, 11, P.concreteLt);
  p.hline(cx - 5, cx + 4, 36, P.white);
  p.hline(cx - 5, cx + 4, 46, P.steel);
  tiny(p, 'SOS', cx - 5, 39, P.verm);
  castRight(p, cx - 5, 36, 10, 11, 2);
  // red rotating light
  p.rect(cx - 2, 1, 5, 4, P.verm);
  p.set(cx - 1, 1, P.vermLt);
  p.hline(cx - 3, cx + 3, 5, P.steel);
  finish(p, { soft: true });
  const img = p.toCanvas();
  const glass = maskOf(W, H, (x, y) => y >= 6 && y <= 15 && p.get(x, y) === p.get(cx - 5, 11) && x < cx + 9);
  const a = stand(img, { cx: 8, base: 16, shadow: 58, contact: 8, extra: { glass } });
  a.xray = 0.5;
  a.glow = (g, x, y, env) => {
    // rotating beacon during the broadcast (flag_broadcast_on)
    if (!env.flag('flag_broadcast_on')) return;
    const ph = Math.floor(env.t / 120) % 4;
    const bx = x + a.ox + cx;
    const by = y + a.oy + 3;
    g.rect(bx - 2 + ph, by - 2, 2, 4, P.vermLt, 0.9);
    const ctx = g.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const grd = ctx.createRadialGradient(bx, by, 1, bx, by, 14);
    grd.addColorStop(0, 'rgba(255,106,77,0.6)');
    grd.addColorStop(1, 'rgba(226,59,46,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(bx - 14, by - 14, 28, 28);
    ctx.restore();
  };
  return a;
});

// ---------------------------------------------------------------- 看板

registerProp('obj_rules_sign', () => {
  const p = pc(18, 28);
  p.vline(8, 14, 27, P.steel);
  p.vline(9, 14, 27, P.asphalt);
  p.rect(1, 1, 16, 16, P.white);
  p.strokeRect(1, 1, 16, 16, P.leafDeep);
  // four prohibitions: ball, bike, fireworks, dog
  const icon = (x: number, y: number, c: string) => {
    p.ring(x + 3, y + 3, 3, 3, P.verm);
    p.set(x + 3, y + 3, c);
    p.set(x + 2, y + 3, c);
    p.line(x + 1, y + 5, x + 5, y + 1, P.verm);
  };
  icon(2, 2, P.blue);
  icon(9, 2, P.charcoal);
  icon(2, 9, P.sunDeep);
  icon(9, 9, P.wood);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 26 });
});

registerProp('obj_park_board', () => {
  const p = pc(34, 28);
  for (const x of [4, 29]) p.vline(x, 18, 27, P.woodDark);
  p.rect(1, 1, 32, 18, P.wood);
  p.rect(3, 3, 28, 14, P.paper);
  // painted park map
  p.rect(4, 4, 26, 12, P.leafYoung);
  p.rect(13, 6, 8, 6, P.concreteLt); // plaza
  p.set(16, 8, P.white); // clock tower
  p.rect(22, 9, 4, 3, P.goldPale); // sandbox
  p.rect(5, 5, 4, 3, P.white); // toilet
  p.ellipse(7, 12, 2, 1.5, P.aqua); // hippo
  p.vline(17, 12, 15, P.woodLt); // path
  p.set(18, 14, P.verm); // you are here
  p.set(18, 13, P.verm);
  fontTextSmall(p, '公園', 22, 3, P.leafShade, 2);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 16, shadow: 26, contact: 26 });
});

// ---------------------------------------------------------------- 子ども自転車 / 空き缶 / 鳩

const KIDS_BIKE = [true, false].map((bottle) => {
  const p = pc(24, 16);
  const y = 2;
  p.ring(5, y + 9, 3.5, 3.5, P.charcoal);
  p.ring(18, y + 9, 3.5, 3.5, P.charcoal);
  p.line(5, y + 9, 9, y + 5, P.aqua);
  p.line(9, y + 5, 16, y + 5, P.aqua);
  p.line(9, y + 5, 11, y + 9, P.blue);
  p.line(11, y + 9, 16, y + 5, P.aqua);
  p.line(16, y + 5, 18, y + 9, P.blue);
  p.hline(7, 10, y + 3, P.charcoal);
  p.vline(16, y + 1, y + 5, P.steel);
  p.hline(15, 18, y + 1, P.charcoal);
  p.rect(17, y - 1, 5, 4, P.steel);
  for (let x = 17; x < 22; x += 2) p.vline(x, y - 1, y + 2, P.concreteLt);
  if (bottle) {
    p.rect(19, y - 2, 2, 3, P.blue);
    p.set(19, y - 2, P.aqua);
  }
  finish(p, { soft: true });
  return p.toCanvas();
});

registerProp('obj_kids_bike', () => {
  const a = stand(KIDS_BIKE[0], { shadow: 12, contact: 16 });
  a.img = (env) => KIDS_BIKE[env.stage === 2 ? 1 : 0];
  return a;
});

registerProp('obj_akikan', () => {
  const p = pc(8, 8);
  p.rect(2, 1, 4, 6, P.red);
  p.vline(2, 1, 6, P.vermLt);
  p.vline(5, 1, 6, P.vermShade);
  p.hline(2, 5, 1, P.concreteLt);
  p.set(3, 3, P.white);
  p.set(4, 4, P.white);
  const img = p.toCanvas();
  return { ox: 4, oy: 6, w: 8, h: 8, foot: 13, ...floaty(img, 4, 6) } as PropArt;
});

registerProp('obj_pigeons', () => {
  // five pigeons squabbling over crumbs (character sprites)
  const ids = ['npc_pigeon', 'npc_pigeon_b', 'npc_pigeon_c', 'npc_pigeon', 'npc_pigeon_b'];
  const spots: [number, number, 'left' | 'right'][] = [
    [-6, 4, 'right'],
    [6, 2, 'left'],
    [14, 8, 'left'],
    [-2, 12, 'right'],
    [22, 3, 'left'],
  ];
  return {
    ox: -12,
    oy: -8,
    w: 48,
    h: 28,
    foot: 12,
    img: () => null,
    over(g, x, y, env) {
      for (let i = 0; i < 5; i++) {
        const spr = charSprite(ids[i]);
        const [dx, dy, dir] = spots[i];
        let img: HTMLCanvasElement;
        if (env.stage === 1) img = spr.extra?.look_up || spr.extraDir?.look_up ? poseFrame(spr, 'look_up', dir) : idleFrame(spr, dir, 0);
        else if (env.stage === 2) img = idleFrame(spr, 'right', 0);
        else {
          const peck = spr.anims?.peck;
          img = peck ? peck.frames[Math.floor((env.t + i * 377) / 260) % peck.frames.length] : idleFrame(spr, dir, env.t + i * 500);
          if (dir === 'left' && peck) img = idleFrame(spr, dir, env.t + i * 500);
        }
        g.img(img, x + dx + 8 - Math.floor(img.width / 2), y + dy + 12 - img.height);
      }
      // crumbs
      g.rect(x + 4, y + 13, 1, 1, P.goldPale);
      g.rect(x + 9, y + 11, 1, 1, P.goldPale);
      g.rect(x + 12, y + 15, 1, 1, P.brass);
    },
  } as PropArt;
});

// ---------------------------------------------------------------- 公園灯 prop_park_lamp

registerProp('prop_park_lamp', () => {
  const p = pc(12, 44);
  cylinder(p, 4, 8, 4, 35, P.leafShade);
  p.rect(3, 40, 6, 3, P.charcoal);
  // round globe with a small cap
  p.ellipse(6, 5, 4, 4, P.white);
  p.ellipse(5, 4, 2, 2, P.glint);
  p.rect(3, 0, 6, 2, P.leafShade);
  p.hline(2, 9, 1, P.leafDeep);
  finish(p, { soft: true });
  const a = stand(p.toCanvas(), { shadow: 42, contact: 6 });
  a.glow = (g, x, y, env) => {
    const on = poleLampState(env);
    if (on <= 0) return;
    const gx = x + 8;
    const gy = y + a.oy + 5;
    const ctx = g.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = on;
    const grd = ctx.createRadialGradient(gx, gy, 1, gx, gy, 10);
    grd.addColorStop(0, 'rgba(255,246,216,0.9)');
    grd.addColorStop(1, 'rgba(255,231,163,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(gx - 10, gy - 10, 20, 20);
    const gr2 = ctx.createRadialGradient(gx, y + 18, 2, gx, y + 18, 36);
    gr2.addColorStop(0, 'rgba(255,231,163,0.35)');
    gr2.addColorStop(1, 'rgba(255,231,163,0)');
    ctx.fillStyle = gr2;
    ctx.fillRect(gx - 36, y - 10, 72, 56);
    ctx.restore();
  };
  return a;
});

export { floaty, benchImg };

// ---------------------------------------------------------------- small finds: the cicada shell, the lost sandal

registerProp('obj_semi_shell', () => {
  // a cicada shell clinging to the crape-myrtle trunk (3×4)
  const p = pc(6, 6);
  p.rect(2, 1, 3, 4, P.brass);
  p.set(2, 1, P.goldPale);
  p.set(4, 4, P.brassOld);
  p.set(1, 2, P.brassOld);
  p.set(5, 3, P.brassOld);
  const img = p.toCanvas();
  return { ox: 6, oy: 0, w: 6, h: 6, foot: 16, img: () => img } as PropArt;
});

registerProp('obj_shrubs', () => {
  // one red sandal half hidden in the hedge
  const p = pc(8, 5);
  p.rect(1, 1, 6, 3, P.red);
  p.hline(1, 6, 1, P.vermLt);
  p.set(3, 2, P.white);
  const img = p.toCanvas();
  return { ox: 10, oy: 6, w: 8, h: 5, foot: 17, img: () => img } as PropArt;
});
