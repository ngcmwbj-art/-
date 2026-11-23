// セキトメ (80×48, 51 8.7、02 #65): 沢の上の、子どもが積んだプールのせき。丸い石を
// 3段に積み、いちばん上の大きな石が顔（小さな目2つ、提灯の光が映る）。赤い水泳帽
// （白い線）をかぶり、黄色い笛を首からさげた監視員。右の石に割りばしの札
// 『遊泳は 5時まで』（青と赤のマーカーの線）。石のすきまから水が細く漏れる。
// 光は第2章の決まり：提灯が左下から（橙のリム）、星あかりが上から。
//
// ポーズ：idle（漏れる水、笛がゆれる）、whistle（笛を吹く。ラウンドの終わりの
// 「閉場 1分前です」も）、splash（水がせきをこえる）、lift / stack（石を1つ積む）、
// hurt、rest（閉場：目を閉じ、札が裏返って『本日の 営業は 終了』、水が止まる）、
// restart。まもりの段階（defUp）ぶん、上に小石が積まれる。

import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { Mask } from './lib';
import { INK, nightFinish, nshade } from './night';

const W = 100;
const H = 72;
const OX = 10;
const OY = 16;

const STONE = ['#3A3F48', '#6B7186', '#9AA0A8', '#C8C2B4', '#E8E4D8'];
const STONE_DK = ['#2A2440', '#3A3F48', '#6B7186', '#9AA0A8', '#C8C2B4'];
const CAP = ['#8A2E3A', '#B8241E', '#E84E3C', '#FF6A4D'];

interface Pose {
  /** Leak phase (0..2), or -1: the water stopped (closed). */
  leak: number;
  eyes: 'open' | 'shut' | 'wide' | 'squeeze';
  /** The whistle: 'hang' (on its string), 'blow' (up at the mouth). */
  whistle: 'hang' | 'blow';
  /** The sign: 'front' 『遊泳は 5時まで』, 'back' 『本日の 営業は 終了』. */
  sign: 'front' | 'back';
  /** Extra pebbles piled on top (まもり steps). */
  pile: number;
  /** A stone being lifted over the top (px above its place), or -1. */
  lift: number;
  /** Water surging over the top (splash). */
  surge?: number;
  /** Horizontal jolt (hurt), head tilt back (blow). */
  jolt?: number;
  tilt?: number;
}

function stoneAt(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number, ramp: string[], seed: number, moss = false): void {
  const m = new Mask(W, H).ellipse(cx, cy, rx, ry);
  nshade(p, m, ramp, { mode: 'sphere', base: 0.58, k: 0.5, dither: 0.3 });
  // grain and a crack or two
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (!m.in(x, y)) continue;
      const h = hash2(x, y, seed);
      if (h < 0.05) p.set(x, y, ramp[1]);
      if (moss && y < cy - ry * 0.45 && h > 0.45) p.set(x, y, h > 0.8 ? '#9BCB6B' : '#5FA85A');
    }
}

function build(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const j = o.jolt ?? 0;
  const X = (v: number) => Math.round(v + OX + j);
  const Y = (v: number) => Math.round(v + OY);
  // ---- the bottom row (six stones) and the middle row (five) ----
  const bottom: [number, number, number][] = [[6, 40, 7], [19, 41, 7], [32, 40, 7], [46, 41, 7], [59, 40, 7], [72, 41, 7]];
  bottom.forEach(([x, y, r], i) => stoneAt(p, X(x), Y(y), r, 6, i % 2 ? STONE_DK : STONE, 1501 + i, i === 2));
  const middle: [number, number, number][] = [[12, 31, 7], [25, 30, 7], [55, 30, 7], [68, 31, 7]];
  middle.forEach(([x, y, r], i) => stoneAt(p, X(x), Y(y), r, 6, i % 2 ? STONE : STONE_DK, 1511 + i, i === 3));
  // the two shoulder stones of the top row
  stoneAt(p, X(18), Y(22), 6, 5, STONE, 1521, true);
  stoneAt(p, X(62), Y(22), 6, 5, STONE_DK, 1523);
  // ---- the head: the big round stone ----
  const tilt = o.tilt ?? 0;
  const hx = X(40);
  const hy = Y(18 - tilt);
  stoneAt(p, hx, hy, 15, 12, STONE, 1525);
  // the red swim cap (a white stripe across, the ear flaps)
  const cap = new Mask(W, H);
  for (let y = hy - 13; y <= hy - 3; y++)
    for (let x = hx - 14; x <= hx + 14; x++) {
      const dx = (x + 0.5 - hx) / 14.5;
      const dy = (y + 0.5 - (hy - 3)) / 10.5;
      if (dx * dx + dy * dy <= 1) cap.set(x, y);
    }
  nshade(p, cap, CAP, { mode: 'sphere', base: 0.6, k: 0.45 });
  for (let x = hx - 13; x <= hx + 13; x++) if (cap.in(x, hy - 7)) p.set(x, hy - 7, x < hx ? '#F4F1E8' : '#E8E4D8');
  // the face: two small eyes with the lantern in them, under the cap
  const ey = hy + 1;
  for (const ex of [hx - 6, hx + 5]) {
    if (o.eyes === 'shut') p.hline(ex - 1, ex + 1, ey + 1, INK);
    else if (o.eyes === 'squeeze') {
      p.set(ex - 1, ey, INK);
      p.set(ex, ey + 1, INK);
      p.set(ex + 1, ey, INK);
    } else if (o.eyes === 'wide') {
      p.rect(ex - 1, ey - 1, 3, 3, INK);
      p.set(ex, ey, '#F4F1E8');
    } else {
      p.rect(ex, ey, 2, 2, INK);
      p.set(ex, ey, '#F7C27A');
    }
  }
  // the whistle on its white string
  if (o.whistle === 'blow') {
    // up at its "mouth" between the eyes and the chin, the string slack
    p.line(hx - 4, hy + 6, hx - 1, hy + 4, '#F4F1E8');
    p.rect(hx - 1, hy + 4, 5, 3, '#FFD23F');
    p.hline(hx - 1, hx + 3, hy + 4, '#FFE7A3');
    p.set(hx + 4, hy + 5, '#A8742A');
  } else {
    p.line(hx - 5, hy + 7, hx - 1, hy + 11, '#F4F1E8');
    p.line(hx + 5, hy + 7, hx + 2, hy + 11, '#F4F1E8');
    p.rect(hx - 1, hy + 11, 4, 3, '#FFD23F');
    p.hline(hx - 1, hx + 2, hy + 11, '#FFE7A3');
    p.set(hx + 3, hy + 12, '#A8742A');
  }
  // pebbles piled on its right shoulder (one per まもり step)
  for (let i = 0; i < o.pile; i++) stoneAt(p, X(62 + (i % 2 ? -2 : 1)), Y(14 - i * 5), 4, 3, i % 2 ? STONE_DK : STONE, 1531 + i);
  if (o.lift >= 0) stoneAt(p, X(62), Y(14 - o.pile * 5 - o.lift), 4, 3, STONE, 1541);
  // ---- the sign on its chopstick, stuck in the right end stones ----
  const sx = X(74);
  const sy = Y(6);
  p.vline(sx + 5, sy + 10, Y(36), '#E8D8B0');
  p.vline(sx + 6, sy + 10, Y(36), '#C8B890');
  const card = new Mask(W, H).rect(sx - 4, sy, 18, 11);
  nshade(p, card, ['#A8804A', '#C8A06A', '#D8B888', '#E8CCA0'], { base: o.sign === 'back' ? 0.45 : 0.62, k: 0.35 });
  if (o.sign === 'front') {
    // 『遊泳は』 blue, 『5時まで』 red (marker strokes, doubled)
    for (let i = 0; i < 12; i++) if (i % 4 !== 3) p.set(sx - 2 + i, sy + 3, '#2F7AB0');
    for (let i = 0; i < 12; i++) if (i % 4 !== 3) p.set(sx - 2 + i, sy + 7, '#E23B2E');
    p.set(sx + 11, sy + 3, '#2F7AB0');
  } else {
    // the back: 『本日の 営業は 終了』 in pencil grey, a big 〆 in red
    for (let i = 0; i < 12; i++) if (i % 3 !== 2) p.set(sx - 2 + i, sy + 3, '#6B7186');
    for (let i = 0; i < 8; i++) if (i % 3 !== 2) p.set(sx - 2 + i, sy + 6, '#6B7186');
    p.line(sx + 7, sy + 5, sx + 11, sy + 9, '#E23B2E');
    p.line(sx + 11, sy + 5, sx + 7, sy + 9, '#E23B2E');
  }
  // ---- the water ----
  if (o.leak >= 0) {
    // leaking through the gaps between the bottom stones (3 frames)
    for (const [gx, i] of [[13, 0], [26, 1], [39, 2], [53, 3], [66, 4]] as [number, number][])
      for (let yy = Y(36) + ((o.leak + i) % 3); yy < Y(48); yy += 3) p.set(X(gx), yy, (yy + i) % 2 ? '#F4F1E8' : '#7FD1E8');
  }
  if (o.surge) {
    // the pool slops over the top in a white arc
    const k = o.surge;
    for (let x = 4; x < 76; x++) {
      const yy = Y(14 - Math.round(Math.sin((x / 76) * Math.PI) * (4 + k * 3)));
      if (hash2(x, k, 1551) < 0.75) p.set(X(x), yy, '#F4F1E8');
      if (hash2(x, k + 3, 1553) < 0.5) p.set(X(x), yy + 1, '#7FD1E8');
    }
  }
  nightFinish(p, 0.5, 0.4, (x, y) => (x >= hx - 8 && x <= hx + 8 && y >= ey - 1 && y <= ey + 2) || (x >= sx - 4 && x <= sx + 13 && y >= sy && y <= sy + 10));
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
/** Undone: four stepping stones in a row, the stream between them (32×14). */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(34, 14);
  p.rect(0, 6, 34, 6, '#2F4A8A');
  for (let x = 0; x < 34; x += 3) p.set(x, 8 + (x % 2), '#7FD1E8');
  for (const cx of [4, 12, 21, 29]) {
    p.ellipse(cx, 7, 4, 3, '#9AA0A8');
    p.hline(cx - 2, cx + 1, 5, '#E8E4D8');
    p.hline(cx - 3, cx + 3, 9, '#6B7186');
  }
  p.outline(INK);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_sekitome', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (o: Pose): HTMLCanvasElement => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
      if (cache.size > 240) cache.delete(cache.keys().next().value!);
    }
    return c;
  };
  return {
    id: 'enemy_sekitome',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      const pile = Math.max(0, Math.min(2, f.defUp ?? 0));
      const leak = loop(v.gt, 160, 3);
      if (f.kyuukei || v.pose === 'rest') return get({ leak: -1, eyes: 'shut', whistle: 'hang', sign: 'back', pile: 0, lift: -1 });
      if (v.pose === 'hurt') {
        const k = Math.min(2, Math.floor(v.t / 60));
        return get({ leak, eyes: 'wide', whistle: 'hang', sign: 'front', pile, lift: -1, jolt: [2, -1, 0][k] });
      }
      if (v.pose === 'restart') return get({ leak, eyes: v.t < 200 ? 'shut' : 'open', whistle: v.t < 300 ? 'hang' : 'blow', sign: v.t < 150 ? 'back' : 'front', pile, lift: -1 });
      if (v.pose === 'whistle' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_seki_fue')) {
        const k = loop(v.t, 90, 2);
        return get({ leak, eyes: 'squeeze', whistle: 'blow', sign: 'front', pile, lift: -1, tilt: k });
      }
      if (v.pose === 'splash' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_seki_shibuki')) {
        return get({ leak, eyes: 'squeeze', whistle: 'hang', sign: 'front', pile, lift: -1, surge: 1 + loop(v.t, 80, 2) });
      }
      if (v.pose === 'lift' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_seki_mansui')) {
        return get({ leak, eyes: 'open', whistle: 'hang', sign: 'front', pile, lift: 3 + loop(v.t, 120, 2) });
      }
      if (v.pose === 'stack') return get({ leak, eyes: 'open', whistle: 'hang', sign: 'front', pile: Math.min(2, pile + 1), lift: -1 });
      if (v.pose === 'refuse') return get({ leak, eyes: 'shut', whistle: 'hang', sign: 'front', pile, lift: -1, jolt: loop(v.t, 100, 2) ? -1 : 1 });
      // idle / 監視中: the leaks, the whistle swinging a pixel, a blink now and then
      const blink = v.gt % 3200 < 140;
      return get({ leak, eyes: blink ? 'shut' : 'open', whistle: 'hang', sign: 'front', pile, lift: -1 });
    },
    over(g, x, y, v: EnemyView): void {
      // 閉場: a thin wisp of steam off the cap (a rest, like テツヤ's)
      if (!v.flags.kyuukei && v.pose !== 'rest') return;
      const ex = x + OX + 40;
      const ey = y + OY + 2;
      for (let i = 0; i < 3; i++) {
        const ph = (v.gt / 1400 + i / 3) % 1;
        g.alpha(0.4 * (1 - ph), () => g.rect(Math.round(ex - 6 + i * 6 + Math.sin(ph * 9 + i) * 2), Math.round(ey - ph * 18), 1, 3, '#F4F1E8'));
      }
    },
    restored,
    gallery: [
      { pose: 'idle', flags: { tetsuya: 1 } },
      { pose: 'whistle', t: 0 },
      { pose: 'splash', t: 0 },
      { pose: 'lift', t: 0 },
      { pose: 'stack', t: 0, flags: { defUp: 1 } },
      { pose: 'hurt', t: 0 },
      { pose: 'rest', flags: { kyuukei: 1 } },
    ],
  };
});
