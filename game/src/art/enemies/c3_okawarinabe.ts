// オカワリナベ (64×56, 61 10.7・60 6.6): 食堂かもめの アルミの 寸胴鍋。胴に 40年ぶんの へこみ2つ、
// 左右の 取っ手。ふたは 少し 浮いて 斜め（開いているとき 6px、閉まると 0）、つまみに 黒い 判
// 「まだ」（閉まると 見えない）。ふたの すき間から 煮つけの 汁（汁の 深さが 中身＝HP）。湯気が
// 2本の 腕に なって お玉を 持つ（やわらかい 線、こわくしない）。顔は 描かない：取っ手と 湯気で
// 気分を 見せる。足もとに コンロの 青い 火（3フレームで ゆらぐ。閉まると 小さく）。
//
// ポーズ：idle（ふたが カタカタ 1px、汁に 泡）、scoop/attack（おかわり：お玉で すくう）、
// windup/attack（湯気：湯気が ふくらむ）、rattle（ふたが 3回 跳ねる）、closed（カタン：1px 沈む）、
// bubble（おかわりが 湧く）、hurt、rest、settle（ふたが きちんと 閉まり、湯気が 細く 1本、取っ手が 下がる）。

import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { BAYER4 } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { Mask } from './lib';
import { INK, madaStamp, noonFinish, sshade } from './noon';

const W = 84;
const H = 84;
const OX = 10;
const OY = 22;

const ALU = ['#6B7186', '#8E95A6', '#A8AEB8', '#C8CDD4', '#E0E4E8', '#F4F6F8'];
const SOUP = ['#5A3A1A', '#8A5A2A', '#A8723A', '#C8884A'];

interface Pose {
  /** Lid lift on the right (px): 6 open, 0 shut. */
  lid: number;
  /** Lid hop (rattle). */
  hop: number;
  /** Soup depth below the rim (0 full … 8 low). */
  depth: number;
  /** Steam: 0 a thread, 1 arms, 2 billowing. */
  steam: number;
  /** The ladle: 'up' (held high), 'dip' (in the pot), 'out' (held out to the front), 'none'. */
  ladle: 'up' | 'dip' | 'out' | 'none';
  /** Flame size 0..2 and its flicker frame. */
  flame: number;
  fk: number;
  /** Handles: 0 level, 1 raised (ears up), −1 down (settled). */
  ears: number;
  jolt: number;
  bubble: number;
  /** The steam's own sway frame. */
  sk: number;
}

function steamDot(p: PixelCanvas, x: number, y: number, a: number): void {
  // translucent steam: an ordered dither of #F4F1E8 over what is behind
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  if (BAYER4[y & 3][x & 3] < a * 16) p.set(x, y, '#F4F1E8');
}

function build(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => Math.round(v + OX + o.jolt);
  const Y = (v: number) => Math.round(v + OY);
  // ---- the burner and its blue flame ----
  p.rect(X(14), Y(51), 36, 3, '#4A4A55');
  p.hline(X(14), X(49), Y(51), '#6B7186');
  if (o.flame > 0) {
    for (let i = 0; i < 7; i++) {
      const fx = X(18 + i * 4);
      const h = (o.flame === 2 ? 3 : 2) + ((i + o.fk) % 3 === 0 ? 1 : 0);
      p.vline(fx, Y(50) - h + 1, Y(50), '#4A8AE0');
      p.set(fx, Y(50), '#DFF4FA');
    }
  }
  // ---- the pot ----
  const body = new Mask(W, H).rect(X(10), Y(19), 44, 31);
  sshade(p, body, ALU, { mode: 'cyl', base: 0.6, k: 0.5, dither: 0.35 });
  // used, cloudy patches
  body.each((x, y) => {
    if (hash2(x >> 1, y >> 1, 51) < 0.12) p.set(x, y, '#A8AEB8');
  });
  // two dents (40 years)
  for (const [dx, dy] of [[18, 30], [40, 38]] as [number, number][]) {
    p.hline(X(dx), X(dx + 4), Y(dy), '#8E95A6');
    p.hline(X(dx + 1), X(dx + 3), Y(dy + 1), '#C8CDD4');
  }
  // the bottom edge, darker
  p.hline(X(10), X(53), Y(49), '#6B7186');
  // handles (ears)
  const ey = Y(23 - o.ears);
  p.rect(X(4), ey, 6, 3, '#8E95A6');
  p.hline(X(4), X(9), ey, '#E0E4E8');
  p.rect(X(54), ey, 6, 3, '#8E95A6');
  p.hline(X(54), X(59), ey, '#E0E4E8');
  // the rim
  p.hline(X(9), X(54), Y(18), '#F4F6F8');
  p.hline(X(9), X(54), Y(19), '#C8CDD4');
  // ---- the soup seen in the gap (its depth = how much is left) ----
  if (o.lid > 0) {
    const sy = Y(19) + Math.min(3, Math.round(o.depth / 3));
    for (let x = X(13); x <= X(50); x++) p.set(x, sy, SOUP[1 + ((x + o.bubble) % 5 === 0 ? 2 : 0)]);
    if (o.depth >= 4) p.hline(X(12), X(51), Y(19), '#4A4A55');
    if (o.bubble) p.set(X(20 + (o.bubble * 7) % 24), sy - 1, '#C8884A');
  }
  // ---- the lid: tilted up on the right by `lid` px, a knob on top ----
  const lid = new Mask(W, H);
  const ly0 = Y(14 - o.hop);
  for (let x = 0; x <= 46; x++) {
    const lift = Math.round((x / 46) * o.lid);
    lid.rect(X(9 + x), ly0 + 1 - lift, 1, 4);
  }
  sshade(p, lid, ALU, { mode: 'bevel', bevel: 2, base: 0.7, k: 0.4 });
  const kx = X(31);
  const ky = ly0 - Math.round(o.lid / 2) - 2;
  p.rect(kx - 3, ky, 7, 3, '#4A4A55');
  p.hline(kx - 3, kx + 3, ky, '#8E95A6');
  // the black 「まだ」 on the knob (gone from sight once it is shut)
  if (o.lid > 0) madaStamp(p, kx + 1, ky - 3, 8, 6, 37);
  noonFinish(p, 0.5, 0.45);
  // (the steam goes on after the outline: soft, without an ink edge)
  // ---- steam: a thread, the two arms with the ladle, or billows ----
  const sx = o.sk;
  if (o.steam === 0) {
    for (let y = 0; y < 14; y++) steamDot(p, X(32 + Math.round(Math.sin(y * 0.6 + sx) * 1.5)), ly0 - 4 - y, 0.7 - y * 0.04);
  } else {
    // left arm: rising from the gap's left, curling out
    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      const x = X(14 - t * 10 + Math.sin(t * 4 + sx) * 1.5);
      const y = ly0 - 2 - t * 16;
      for (let k = -1; k <= 1; k++) steamDot(p, x + k, Math.round(y), 0.62);
    }
    // right arm: up from the gap's right, holding the ladle
    const reach = o.ladle === 'out' ? 1 : 0;
    const hx = o.ladle === 'dip' ? 44 : o.ladle === 'out' ? 54 : 58;
    const hy = o.ladle === 'dip' ? 6 : o.ladle === 'out' ? 0 : -6;
    for (let i = 0; i < 18; i++) {
      const t = i / 17;
      const x = X(48 + (hx - 48) * t + Math.sin(t * 4 + sx + 1) * 1.5);
      const y = Y(12) + (hy - 12 + reach * 4) * t - o.lid * (1 - t);
      for (let k = -1; k <= 1; k++) steamDot(p, x + k, Math.round(y), 0.62);
    }
    if (o.ladle !== 'none') {
      const lx = X(hx);
      const lyy = Y(hy);
      if (o.ladle === 'dip') {
        p.line(lx, lyy, lx - 8, lyy + 10, '#6B7186');
      } else {
        // the handle up, the bowl at its lower end (full of stew when held out)
        p.line(lx, lyy, lx - 2, lyy + 10, '#6B7186');
        p.rect(lx - 6, lyy + 10, 6, 3, '#9AA0A8');
        p.hline(lx - 6, lx - 1, lyy + 10, '#C8CDD4');
        if (o.ladle === 'out') p.hline(lx - 5, lx - 2, lyy + 10, '#8A5A2A');
      }
    }
    if (o.steam === 2) {
      for (let i = 0; i < 40; i++) {
        const a = hash2(i, 3, 59) * Math.PI;
        const r = 8 + hash2(i, 5, 59) * 18;
        steamDot(p, X(32 + Math.cos(a) * r * 1.4), Math.round(ly0 - 6 - Math.sin(a) * r), 0.55);
      }
    }
  }
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
/** Undone: the pot back on the stove, its lid shut (28×22). */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(28, 22);
  p.rect(3, 8, 22, 11, '#C8CDD4');
  p.vline(3, 8, 18, '#8E95A6');
  p.vline(24, 8, 18, '#8E95A6');
  p.hline(3, 24, 8, '#F4F6F8');
  p.rect(2, 5, 24, 3, '#A8AEB8');
  p.hline(2, 25, 5, '#F4F6F8');
  p.rect(12, 3, 4, 2, '#4A4A55');
  p.rect(0, 10, 3, 2, '#8E95A6');
  p.rect(25, 10, 3, 2, '#8E95A6');
  p.rect(5, 19, 18, 2, '#4A4A55');
  p.outline(INK);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_okawarinabe', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (o: Pose): HTMLCanvasElement => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
      if (cache.size > 260) cache.delete(cache.keys().next().value!);
    }
    return c;
  };
  return {
    id: 'enemy_okawarinabe',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      const open = !!f.futa;
      const depth = Math.max(0, Math.min(8, Math.round((1 - v.hpRate) * 10)));
      const fk = loop(v.gt, 140, 3);
      const sk = loop(v.gt, 300, 4);
      const base: Pose = { lid: open ? 6 : 0, hop: 0, depth, steam: 1, ladle: 'up', flame: open ? 2 : 1, fk, ears: 0, jolt: 0, bubble: 0, sk };
      if (f.settled || v.pose === 'settle') {
        // the lid shut properly, one thin thread of steam (then none), handles down, a small flame
        return get({ ...base, lid: 0, steam: v.t < 900 || f.settled ? 0 : 0, ladle: 'none', flame: 1, ears: -1, sk: f.settled ? 0 : sk });
      }
      if (f.kyuukei || v.pose === 'rest') return get({ ...base, steam: 0, ladle: 'none', flame: 1, ears: -1 });
      if (v.pose === 'hurt') {
        const j = Math.min(2, Math.floor(v.t / 70));
        return get({ ...base, jolt: [1, -1, 0][j], hop: j === 0 ? 1 : 0, bubble: 3 });
      }
      if (v.pose === 'rattle' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_okawari_futa')) {
        const k = loop(v.t, 110, 3);
        return get({ ...base, lid: 6, hop: [3, 0, 2][k], ears: 1, steam: 2 });
      }
      if (v.pose === 'closed') return get({ ...base, lid: 0, hop: v.t < 100 ? -1 : 0, steam: 0, ladle: 'none' });
      if (v.pose === 'bubble') return get({ ...base, bubble: 1 + loop(v.t, 90, 4), steam: 2 });
      if (v.pose === 'scoop' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_okawari_okawari')) {
        const out = v.pose === 'attack';
        return get({ ...base, lid: 6, ladle: out ? 'out' : v.t < 250 ? 'dip' : 'up', ears: 1 });
      }
      if ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_okawari_yuge') return get({ ...base, lid: 6, steam: 2, ears: 1 });
      // idle: the lid clatters a pixel (open), the soup bubbles
      const clatter = open && loop(v.gt, 250, 3) === 1 ? 1 : 0;
      return get({ ...base, hop: clatter, bubble: open ? loop(v.gt, 250, 3) : 0, steam: open ? 1 : 0, ladle: open ? 'up' : 'none' });
    },
    restored,
    gallery: [
      { pose: 'idle', flags: { futa: 1 } },
      { pose: 'rattle', t: 0, flags: { futa: 1 } },
      { pose: 'attack', skill: 'skill_okawari_okawari', flags: { futa: 1 } },
      { pose: 'attack', skill: 'skill_okawari_yuge', flags: { futa: 1 } },
      { pose: 'idle', flags: {} },
      { pose: 'hurt', t: 0, flags: { futa: 1 } },
      { pose: 'settle', t: 1000, flags: { settled: 1 } },
    ],
  };
});
