// ヒキヅナ (96×56、二人十五脚 02 #82、30_level_art 3.17): 運動会の 綱引きの 綱。麻の 太い 綱が 地面で
// 1回半 とぐろを 巻き、はしが 鎌首の ように 起きあがって 北東（右上）を 向く。はしは 白い テープで
// 巻きどめ（その上に 小さな 目が 2つ）、先は ほつれた 房。綱の まん中に 赤と 白の 中心の 布。
// 光は 第1章の 決まり（左上の 夕日、左の リム）。
//
// ポーズ：idle（はしが ゆっくり ゆれる）、windup（はしを 引いて ためる）、attack（はしが 前へ のびる）、
// hurt（びくっ、目が ×）、coil（とぐろを きつく 巻く。目を 閉じる）。

import { PixelCanvas } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, rimLeft } from './lib';

const W = 104;
const H = 68;
const OX = 4;
const OY = 6;

/** Hemp, dark → light. */
const HEMP = ['#3A2618', '#5A3A2A', '#8A5A3A', '#A8742A', '#C8A06A', '#E8C890', '#F6E0B0'];
const TAPE = ['#9AA0A8', '#C8C2B4', '#E8E4D8', '#F4F1E8', '#FFFFFF'];
const RED = ['#8A2E3A', '#B8241E', '#E23B2E', '#FF6A4D'];

interface Pose {
  /** The head end (logical px). */
  hx: number;
  hy: number;
  /** Coil tightness 0 (lying loose) .. 1 (とぐろ). */
  tight: number;
  eyes: 'open' | 'x' | 'shut' | 'wide';
  jolt?: number;
}

interface Pt {
  x: number;
  y: number;
  /** Arc length so far, the unit tangent, and whether this sample lies on the coil's far half. */
  s: number;
  tx: number;
  ty: number;
  back: boolean;
}

function path(o: Pose): Pt[] {
  const cx = 40 + OX + (o.jolt ?? 0);
  const cy = 42 + OY - o.tight * 3;
  const raw: { x: number; y: number; back: boolean }[] = [];
  // the coil: from the inner end outward, 1.5 turns, ending at its right side
  const n = 220;
  for (let i = 0; i <= n; i++) {
    const th = Math.PI + (i / n) * 3 * Math.PI;
    const r = (15 + (i / n) * 17) * (1 - o.tight * 0.18);
    raw.push({ x: cx + r * Math.cos(th), y: cy + r * 0.44 * Math.sin(th) - (o.tight * (n - i)) / n * 4, back: Math.sin(th) < 0 });
  }
  // the rise from the coil to the head (a cubic curve)
  const p0 = raw[raw.length - 1];
  const hx = o.hx + OX + (o.jolt ?? 0);
  const hy = o.hy + OY;
  const p1 = { x: p0.x + 10, y: p0.y - 1 };
  const p2 = { x: hx - 12, y: hy + 14 };
  for (let i = 1; i <= 80; i++) {
    const t = i / 80;
    const u = 1 - t;
    raw.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * hx,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * hy,
      back: false,
    });
  }
  const out: Pt[] = [];
  let s = 0;
  for (let i = 0; i < raw.length; i++) {
    const a = raw[Math.max(0, i - 1)];
    const b = raw[Math.min(raw.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    if (i > 0) s += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
    out.push({ x: raw[i].x, y: raw[i].y, s, tx: dx / l, ty: dy / l, back: raw[i].back });
  }
  return out;
}

const R = 5.2;

function stamp(p: PixelCanvas, q: Pt, total: number): void {
  const nx = -q.ty;
  const ny = q.tx;
  const mid = total * 0.48;
  const end = total;
  for (let dy = -6; dy <= 6; dy++)
    for (let dx = -6; dx <= 6; dx++) {
      const X = Math.round(q.x + dx);
      const Y = Math.round(q.y + dy);
      const ox = X - q.x;
      const oy = Y - q.y;
      const d = ox * nx + oy * ny;
      const along = ox * q.tx + oy * q.ty;
      if (d * d + along * along * 0.2 > R * R || Math.abs(d) > R) continue;
      let b = 0.6 - 0.32 * (oy / R) - 0.14 * (ox / R) - 0.3 * (d / R) ** 2;
      const s = q.s + along;
      // the lay of the strands: diagonal grooves
      const ph = (((s * 0.9 + d * 1.3) % 4.6) + 4.6) % 4.6;
      if (ph < 1.1) b -= 0.24;
      else if (ph > 3.9) b += 0.08;
      let ramp = HEMP;
      // the centre cloth (red, white, red)
      if (Math.abs(s - mid) < 4) ramp = Math.abs(s - mid) < 1.2 ? TAPE : RED;
      // the whipping near the end (white tape, two dark turns)
      if (s > end - 11 && s < end - 2) {
        ramp = TAPE;
        if (Math.abs(s - (end - 8)) < 0.6 || Math.abs(s - (end - 4)) < 0.6) b -= 0.3;
      }
      const k = Math.max(0, Math.min(ramp.length - 1, Math.round(b * (ramp.length - 1))));
      p.set(X, Y, ramp[k]);
    }
}

function build(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const pts = path(o);
  const total = pts[pts.length - 1].s;
  // the far half of the coil first, then the near half, then the rise to the head
  for (const q of pts) if (q.back) stamp(p, q, total);
  for (const q of pts) if (!q.back) stamp(p, q, total);
  // the centre cloth's two little tails hanging down
  const mid = pts.reduce((a, q) => (Math.abs(q.s - total * 0.48) < Math.abs(a.s - total * 0.48) ? q : a));
  for (let j = 0; j < 4; j++) {
    p.set(Math.round(mid.x) - 1, Math.round(mid.y) + 4 + j, j % 2 ? RED[1] : RED[2]);
    p.set(Math.round(mid.x) + 2, Math.round(mid.y) + 4 + j - (j > 2 ? 1 : 0), j % 2 ? '#E8E4D8' : '#F4F1E8');
  }
  // the frayed tassel past the end
  const e = pts[pts.length - 1];
  for (let k = -2; k <= 2; k++) {
    const bx = e.x + -e.ty * k * 1.4;
    const by = e.y + e.tx * k * 1.4;
    const len = 3 + ((k + 7) % 3);
    for (let i = 1; i <= len; i++) p.set(Math.round(bx + e.tx * i + (i > 2 ? k * 0.3 : 0)), Math.round(by + e.ty * i), i === len ? HEMP[3] : HEMP[5]);
  }
  // the eyes on the whipping, either side of the rope's middle line
  const at = pts.reduce((a, q) => (Math.abs(q.s - (total - 15)) < Math.abs(a.s - (total - 15)) ? q : a));
  const nx = -at.ty;
  const ny = at.tx;
  for (const sd of [-1, 1]) {
    const ex = Math.round(at.x + nx * 2.6 * sd) - 1;
    const ey = Math.round(at.y + ny * 2.6 * sd) - 1;
    if (o.eyes === 'shut') {
      p.set(ex, ey, K.outline);
      p.set(ex + 1, ey, K.outline);
    } else if (o.eyes === 'x') {
      p.set(ex, ey, K.outline);
      p.set(ex + 1, ey + 1, K.outline);
      p.set(ex + 1, ey, K.outline);
      p.set(ex, ey + 1, K.outline);
    } else {
      p.rect(ex, ey, 2, o.eyes === 'wide' ? 3 : 2, K.outline);
      p.set(ex, ey, '#FFFFFF');
    }
  }
  p.outline(K.outline);
  rimLeft(p);
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
/** Undone: the rope coiled up neat and low, its cloth on top (32×16). */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  restoredC = coilImage();
  return restoredC;
}

/** The coiled rope (also the field's restored object, art/chars/hikizuna.ts). */
export function coilImage(): HTMLCanvasElement {
  const p = new PixelCanvas(34, 18);
  for (let ring = 0; ring < 3; ring++) {
    const rx = 15 - ring * 4;
    const ry = 6 - ring * 1.5;
    const cy = 11 - ring * 2;
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      const x = 17 + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      const lit = Math.sin(a) < 0 ? 4 : 2;
      const k = ((Math.round(a * 30) % 5) + 5) % 5 === 0 ? lit - 1 : lit;
      p.set(Math.round(x), Math.round(y), HEMP[k]);
      p.set(Math.round(x), Math.round(y) + 1, HEMP[Math.max(0, k - 1)]);
    }
  }
  // the centre cloth on the top ring, the whipped end tucked in
  p.rect(15, 4, 2, 2, RED[2]);
  p.set(17, 4, '#F4F1E8');
  p.rect(18, 4, 2, 2, RED[2]);
  p.rect(23, 9, 3, 2, TAPE[3]);
  p.outline(K.outline);
  return p.toCanvas();
}

registerEnemyArt('enemy_hikizuna', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (o: Pose): HTMLCanvasElement => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
      if (cache.size > 120) cache.delete(cache.keys().next().value!);
    }
    return c;
  };
  const tight = (v: EnemyView) => Math.min(1, (v.flags.defUp ?? 0) * 0.4);
  return {
    id: 'enemy_hikizuna',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const tt = tight(v);
      if (v.pose === 'hurt') {
        const k = Math.min(2, Math.floor(v.t / 60));
        return get({ hx: 86, hy: 18, tight: tt, eyes: 'x', jolt: [2, -1, 0][k] });
      }
      if (v.pose === 'coil') return get({ hx: 70, hy: 30, tight: Math.min(1, tt + 0.4), eyes: 'shut' });
      if (v.pose === 'windup') {
        const k = loop(v.t, 90, 2);
        return get({ hx: 76 - k, hy: 8 + k, tight: tt, eyes: 'wide' });
      }
      if (v.pose === 'attack') return get({ hx: v.skill === 'skill_hiki_oesu' ? 88 : 66, hy: v.skill === 'skill_hiki_oesu' ? 12 : 30, tight: tt, eyes: 'wide' });
      // idle: the raised end sways slowly; a blink now and then
      const sw = [0, -1, -1, 0, 1, 1][loop(v.gt, 260, 6)];
      const blink = v.gt % 3400 < 140;
      return get({ hx: 84 + (sw > 0 ? 1 : 0), hy: 16 + sw, tight: tt, eyes: blink ? 'shut' : 'open' });
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'windup', t: 0, skill: 'skill_hiki_tsuna' },
      { pose: 'attack', t: 0, skill: 'skill_hiki_tsuna' },
      { pose: 'attack', t: 0, skill: 'skill_hiki_oesu' },
      { pose: 'coil', t: 0 },
      { pose: 'hurt', t: 0 },
    ],
  };
});
