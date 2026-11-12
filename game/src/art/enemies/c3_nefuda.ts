// ネフダマヨイ (40×48, 61 9.1・60 6.1): 市場の 手書きの 木の 値札が 3枚、上・まん中（少し右）・
// 下（少し左）に ずれて 重なり、人の形に なった。いちばん上の 札に 墨の『ひゃく……』（かすれ）、
// その上に 点の 目2つと 小さな「……」の 口。まん中の 札に『円』の 半分、下の 札は 白紙で、右下に
// 黒い 判「まだ」。足は 先の 割れた 割り箸2本、腕は 竹串。値段が 決まると 上の 札が『100円』に
// 書きかわり、口が 横線に（きっぱり）。光は 真上の 正午（noon.ts）。
//
// ポーズ：idle（札3枚が 時間を ずらして 左右に 1px）、hyaku（上の 札が 2px 上がって 止まる）、
// windup/attack（値札はりかえ：下の 札が 裏返って 飛ぶ）、fan（まかり……：扇のように 開く）、
// hurt（ばらけかけて 戻る）、rest（札が 重なって 座る）、decided（『100円』）。

import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { Mask } from './lib';
import { INK, madaStamp, noonFinish, sshade } from './noon';

const W = 52;
const H = 60;
const OX = 6;
const OY = 8;

const WOOD = ['#8A6A3A', '#A88848', '#C8A868', '#D8B878', '#F2D8A0'];
const WOOD_BACK = ['#6A4A2A', '#8A6A3A', '#A88848', '#B89858', '#C8A868'];

interface Pose {
  /** Horizontal offsets of the three tags (sway). */
  dx: [number, number, number];
  /** Extra lift of the top tag. */
  lift: number;
  /** 'hyaku' | '100' — what the top tag says. */
  text: 'hyaku' | '100';
  /** The mouth: dots shown (0–3) or 'line'. */
  mouth: number | 'line';
  /** The bottom tag turned over (thrown). */
  flipped: boolean;
  /** Fanned open (まかり……). */
  fan: number;
  /** Sitting down (rest). */
  sit: boolean;
  eyes: 'open' | 'shut' | 'wide';
  jolt: number;
}

function tag(p: PixelCanvas, x: number, y: number, w: number, h: number, ramp: string[], seed: number, tilt = 0): Mask {
  const m = new Mask(W, H);
  const pts: [number, number][] = [
    [x + 1 + tilt, y],
    [x + w - 1 + tilt, y],
    [x + w, y + 1],
    [x + w - tilt, y + h - 1],
    [x + w - 1 - tilt, y + h],
    [x + 1 - tilt, y + h],
    [x, y + h - 1],
    [x + tilt, y + 1],
  ];
  m.poly(pts);
  sshade(p, m, ramp, { mode: 'bevel', bevel: 2, base: 0.62, k: 0.45, dither: 0.3 });
  // wood grain: faint horizontal streaks
  m.each((xx, yy) => {
    const h2 = hash2(xx >> 2, yy, seed);
    if (h2 < 0.16) p.set(xx, yy, ramp[1]);
  });
  return m;
}

function build(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => Math.round(v + OX + o.jolt);
  const Y = (v: number) => Math.round(v + OY);
  const sit = o.sit ? 6 : 0;
  // ---- the legs: two split chopsticks ----
  if (!o.sit) {
    const step = o.dx[2] > 0 ? 1 : 0;
    for (const [lx, up] of [[15, step], [24, 1 - step]] as [number, number][]) {
      p.vline(X(lx), Y(38 - up), Y(47 - up), '#E8D8B0');
      p.vline(X(lx + 1), Y(38 - up), Y(47 - up), '#B8A880');
      // the split at the tip
      p.set(X(lx - 1), Y(47 - up), '#E8D8B0');
      p.set(X(lx + 2), Y(47 - up), '#B8A880');
    }
  } else {
    // sat down, the chopstick legs thrown forward
    p.line(X(12), Y(44), X(4), Y(47), '#E8D8B0');
    p.line(X(28), Y(44), X(36), Y(47), '#E8D8B0');
  }
  // ---- the three tags ----
  const f = o.fan;
  const bottom = tag(p, X(7 + o.dx[2] - f * 3), Y(30 + sit), 18, 14, o.flipped ? WOOD_BACK : WOOD, 11, f ? -1 : 0);
  const mid = tag(p, X(14 + o.dx[1] + f * 3), Y(18 + sit), 18, 14, WOOD, 13, f ? 1 : 0);
  const top = tag(p, X(10 + o.dx[0]), Y(5 - o.lift + sit), 19, 15, WOOD, 17);
  void bottom;
  void mid;
  // ---- the bamboo skewer arms ----
  const ay = Y(24 + sit);
  if (f) {
    p.line(X(13), ay, X(3), ay - 6, '#8A7A4A');
    p.line(X(32), ay, X(42), ay - 6, '#8A7A4A');
  } else {
    p.line(X(13 + o.dx[1]), ay, X(6), ay + 6, '#8A7A4A');
    p.line(X(32 + o.dx[1]), ay, X(38), ay + 5, '#8A7A4A');
  }
  // ---- what the tags say ----
  const tx = X(12 + o.dx[0]);
  const ty = Y(15 - o.lift + sit);
  if (o.text === 'hyaku') {
    // 『ひゃく……』: worn brush strokes (dithered), then the trailing dots
    for (let i = 0; i < 9; i++) if (hash2(i, 1, 23) > 0.2) p.set(tx + i, ty, INK);
    for (let i = 0; i < 7; i++) if (hash2(i, 2, 23) > 0.3) p.set(tx + 1 + i, ty + 2, INK);
    p.set(tx + 3, ty + 1, INK);
    p.set(tx + 6, ty + 1, INK);
  } else {
    // 『100円』, clear and black
    p.vline(tx + 1, ty - 1, ty + 3, INK);
    p.rect(tx + 3, ty - 1, 3, 5, INK);
    p.rect(tx + 4, ty, 1, 3, '#D8B878');
    p.rect(tx + 7, ty - 1, 3, 5, INK);
    p.rect(tx + 8, ty, 1, 3, '#D8B878');
    p.rect(tx + 11, ty - 1, 4, 1, INK);
    p.vline(tx + 11, ty, ty + 3, INK);
    p.vline(tx + 14, ty, ty + 3, INK);
    p.hline(tx + 12, tx + 13, ty + 1, INK);
  }
  // half a 円 on the middle tag (only while the price is undecided)
  if (o.text === 'hyaku') {
    const mx = X(19 + o.dx[1] + f * 3);
    const my = Y(23 + sit);
    p.hline(mx, mx + 4, my, INK);
    p.vline(mx, my, my + 4, INK);
    p.set(mx + 2, my + 2, INK);
  }
  // ---- the face over the writing: two dot eyes with a 1px glint from above ----
  const ex = X(15 + o.dx[0]);
  const ey = Y(7 - o.lift + sit);
  for (const xx of [ex, ex + 8]) {
    if (o.eyes === 'shut') p.hline(xx, xx + 1, ey + 1, INK);
    else if (o.eyes === 'wide') {
      p.rect(xx - 1, ey - 1, 3, 3, INK);
      p.set(xx, ey - 1, '#FFF6D8');
    } else {
      p.rect(xx, ey, 2, 2, INK);
      p.set(xx, ey, '#FFF6D8');
    }
  }
  // the mouth: 「……」 or, decided, a firm line
  if (o.mouth === 'line') p.hline(ex + 3, ex + 6, ey + 3, INK);
  else for (let i = 0; i < o.mouth; i++) p.set(ex + 2 + i * 2, ey + 3, INK);
  // ---- the black 「まだ」 at the bottom tag's lower right ----
  madaStamp(p, X(20 + o.dx[2] - f * 3), Y(36 + sit), 8, 6, 31);
  noonFinish(p, 0.55, 0.45);
  void top;
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
/** Undone: the tag 『100円』 stuck in a fish box of crushed ice (32×18). */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(32, 20);
  // the polystyrene box
  p.rect(1, 10, 30, 9, '#F4F6F8');
  p.hline(1, 30, 10, '#FFFFFF');
  p.hline(1, 30, 18, '#C8CDD4');
  for (let x = 2; x < 30; x += 3) p.set(x, 13 + (x % 2), '#DDE4EA');
  // the ice
  for (let x = 3; x < 29; x++) if (hash2(x, 3, 41) < 0.6) p.set(x, 9, '#DFF4FA');
  // the tag, upright in it
  p.rect(11, 1, 10, 9, '#D8B878');
  p.hline(11, 20, 1, '#F2D8A0');
  p.hline(12, 19, 4, INK);
  p.hline(13, 18, 6, INK);
  p.outline(INK);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_nefuda', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (o: Pose): HTMLCanvasElement => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
      if (cache.size > 200) cache.delete(cache.keys().next().value!);
    }
    return c;
  };
  return {
    id: 'enemy_nefuda',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      const text: Pose['text'] = f.mayoi ? 'hyaku' : '100';
      const mouth: Pose['mouth'] = f.mayoi ? 3 : 'line';
      const k = loop(v.gt, 220, 3);
      const sway: [number, number, number] = [[0, 1, 0], [1, 0, -1], [0, -1, 0]][k] as [number, number, number];
      const base: Pose = { dx: sway, lift: 0, text, mouth, flipped: false, fan: 0, sit: false, eyes: 'open', jolt: 0 };
      if (f.kyuukei || v.pose === 'rest') return get({ ...base, dx: [0, 0, 0], sit: true, eyes: 'shut' });
      if (v.pose === 'hurt') {
        const j = Math.min(2, Math.floor(v.t / 70));
        return get({ ...base, dx: [[2, -2, 2], [-1, 1, -1], [0, 0, 0]][j] as [number, number, number], eyes: 'wide', jolt: [2, -1, 0][j] });
      }
      if (v.pose === 'decided') return get({ ...base, dx: [0, 0, 0], text: '100', mouth: 'line', eyes: v.t < 300 ? 'wide' : 'open' });
      if (v.pose === 'hyaku' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_nefuda_hyaku')) {
        // the top tag lifts 2px and stops; the dots of the mouth come one by one
        return get({ ...base, dx: [0, 0, 0], lift: 2, mouth: Math.min(3, 1 + Math.floor(v.t / 200)) });
      }
      if ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_nefuda_harikae') return get({ ...base, flipped: v.pose === 'attack' || loop(v.t, 120, 2) === 1, eyes: 'wide' });
      if (v.pose === 'fan' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_nefuda_makari')) return get({ ...base, dx: [0, 0, 0], fan: v.pose === 'fan' ? 1 : loop(v.t, 140, 2), mouth: 2 });
      if (v.pose === 'idleact') return get({ ...base, eyes: loop(v.t, 200, 2) ? 'shut' : 'open' });
      const blink = v.gt % 2900 < 120;
      return get({ ...base, eyes: blink ? 'shut' : 'open' });
    },
    restored,
    gallery: [
      { pose: 'idle', flags: { mayoi: 1 } },
      { pose: 'hyaku', t: 600, flags: { mayoi: 1 } },
      { pose: 'attack', skill: 'skill_nefuda_harikae', flags: { mayoi: 1 } },
      { pose: 'fan', flags: { mayoi: 1 } },
      { pose: 'decided', t: 400 },
      { pose: 'hurt', t: 0, flags: { mayoi: 1 } },
      { pose: 'rest', flags: { kyuukei: 1 } },
    ],
  };
});
