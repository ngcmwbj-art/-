// ツガオの 戦闘の 絵（61 12.5・14.7。第4期に 描き直し）：初戦（長いすに すわった まま。56×96）と
// 決戦（立った 姿。64×112）は 同じ 人。ダブルの スーツ（炭色、細い ストライプ、3段の 陰）、白い シャツ、
// 黒い ネクタイ、ごま塩の 角刈り、太い 眉（端が 少し 下がる＝疲れた 顔。こわく しない）、細い 目、
// まっすぐ 結んだ 口、ほうれい線。左の 手首に 止まった 金の 腕時計。右手に 黒い 判。
// 決戦の 目は よぶの たびに 少しずつ 開く（params.eye 0〜4。④の あとは 眠そうな 目＝休める 顔）。
// 光は 館の 決まり（61 9.0）：奥（上）から 水槽の 青、縁に 1px、体の 正面は 暗く 沈む。

import { PixelCanvas } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { madaStamp } from './noon';

const INK = '#2A2440';
const SUIT = ['#16131F', '#1E1A30', '#2A2440', '#3A3F48', '#4E5566'];
const STRIPE = '#353247';
const SKIN = ['#9A6A54', '#B8846A', '#D8A888', '#E8C0A0'];
const HAIR = ['#24222C', '#3A3A44', '#6B6B78', '#9A9AA6'];
const SHIRT = ['#C8C2B4', '#E8E4D8', '#F8F4EA'];
const TIE = ['#0B0B14', '#1B1733'];
const GOLD = ['#A8742A', '#D9A441', '#FFD23F'];

/** The tank's blue rim on the top and side edges, then the ink outline (as c3_aq.ts). */
function aqFinish(p: PixelCanvas, amt = 0.5): void {
  const W = p.w;
  const H = p.h;
  const src = p.data.slice();
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] >>> 24 !== 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      if (!on(x, y - 1) || (y < H * 0.55 && (!on(x - 1, y) || !on(x + 1, y)))) {
        const v = src[y * W + x];
        const r = v & 255;
        const g = (v >>> 8) & 255;
        const b = (v >>> 16) & 255;
        const mx = (a: number, c: number) => Math.round(a + (c - a) * amt);
        p.set(x, y, `#${[mx(r, 0x6f), mx(g, 0xc3), mx(b, 0xe0)].map((n) => n.toString(16).padStart(2, '0')).join('')}`);
      }
    }
  p.outline(INK);
}

function cached<T>(build: (o: T) => PixelCanvas, max = 160): (o: T) => HTMLCanvasElement {
  const cache = new Map<string, HTMLCanvasElement>();
  return (o: T) => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
      if (cache.size > max) cache.delete(cache.keys().next().value!);
    }
    return c;
  };
}

interface Head {
  /** 0 a line … 4 open (61 14.7). */
  eye: number;
  closed: boolean;
  yawn: number;
  cap: boolean;
  bubble: number;
  /** 1px face turn (watching the people one by one). */
  look: number;
}

/** The head, centred on cx, its top at y0 (20×24 + the ears). */
function head(p: PixelCanvas, cx: number, y0: number, o: Head): void {
  const L = cx - 10;
  const R = cx + 9;
  // ears
  p.rect(L - 1, y0 + 10, 2, 5, SKIN[1]);
  p.rect(R, y0 + 10, 2, 5, SKIN[0]);
  // the face: square jaw (only the corners cut)
  p.rect(L + 1, y0 + 5, 18, 19, SKIN[2]);
  p.hline(L + 2, R - 2, y0 + 24, SKIN[1]);
  p.set(L + 1, y0 + 23, SKIN[1]);
  p.set(R - 1, y0 + 23, SKIN[1]);
  // the shade on his right cheek and under the jaw (the front is darker in the hall)
  p.rect(R - 3, y0 + 7, 2, 16, SKIN[1]);
  p.hline(L + 3, R - 3, y0 + 23, SKIN[1]);
  p.set(L + 2, y0 + 8, SKIN[3]);
  p.set(L + 2, y0 + 9, SKIN[3]);
  // 角刈り: flat top, short sides, salt and pepper
  p.rect(L + 1, y0, 18, 6, HAIR[1]);
  p.hline(L + 2, R - 2, y0, HAIR[3]);
  p.hline(L + 1, R - 1, y0 + 1, HAIR[2]);
  for (let x = L + 2; x < R - 1; x += 3) p.set(x, y0 + 3, HAIR[2]);
  for (let x = L + 3; x < R - 1; x += 4) p.set(x, y0 + 4, HAIR[3]);
  p.rect(L, y0 + 3, 2, 9, HAIR[1]);
  p.rect(R - 1, y0 + 3, 2, 9, HAIR[0]);
  p.set(L, y0 + 6, HAIR[2]);
  p.set(R, y0 + 7, HAIR[2]);
  const lx = o.look;
  // thick brows, the outer ends a little down (tired, not scary)
  const by = y0 + 9;
  p.rect(L + 3 + lx, by, 5, 2, HAIR[0]);
  p.rect(R - 7 + lx, by, 5, 2, HAIR[0]);
  p.set(L + 2 + lx, by + 2, HAIR[0]);
  p.set(R - 2 + lx, by + 2, HAIR[0]);
  // eyes
  const ey = y0 + 13;
  const eyeL = L + 4 + lx;
  const eyeR = R - 6 + lx;
  if (o.closed || o.yawn > 1) {
    // closed: a soft curve down
    p.hline(eyeL, eyeL + 3, ey, INK);
    p.hline(eyeR, eyeR + 3, ey, INK);
    p.set(eyeL, ey - 1, SKIN[1]);
    p.set(eyeR + 3, ey - 1, SKIN[1]);
  } else if (o.eye <= 1) {
    // the narrow sleepy eyes: a line, the lid over it
    p.hline(eyeL, eyeL + 3, ey, INK);
    p.hline(eyeR, eyeR + 3, ey, INK);
    p.hline(eyeL, eyeL + 3, ey - 1, SKIN[1]);
    p.hline(eyeR, eyeR + 3, ey - 1, SKIN[1]);
    if (o.eye === 1) {
      p.set(eyeL + 2, ey, '#4A3A30');
      p.set(eyeR + 1, ey, '#4A3A30');
    }
  } else {
    // open a little more with each call: white, the dark eye, the lid
    const h = o.eye >= 4 ? 3 : 2;
    p.rect(eyeL, ey - h + 1, 4, h, SHIRT[2]);
    p.rect(eyeR, ey - h + 1, 4, h, SHIRT[2]);
    p.rect(eyeL + 1 + (lx > 0 ? 1 : 0), ey - h + 1, 2, h, '#3A2A24');
    p.rect(eyeR + 1 + (lx > 0 ? 1 : 0), ey - h + 1, 2, h, '#3A2A24');
    p.hline(eyeL, eyeL + 3, ey - h, INK);
    p.hline(eyeR, eyeR + 3, ey - h, INK);
    if (o.eye >= 3) {
      p.set(eyeL + 1, ey - h + 1, '#FFFFFF');
      p.set(eyeR + 1, ey - h + 1, '#FFFFFF');
    }
  }
  // nose (the shade on its right side), the lines from the nose to the mouth
  p.vline(cx + lx, ey + 1, ey + 5, SKIN[1]);
  p.set(cx - 1 + lx, ey + 6, SKIN[0]);
  p.set(cx + 1 + lx, ey + 6, SKIN[0]);
  p.vline(L + 5, ey + 5, ey + 8, SKIN[1]);
  p.vline(R - 5, ey + 5, ey + 8, SKIN[1]);
  // the mouth: a straight line (the yawn opens it)
  if (o.yawn > 0) {
    p.rect(cx - 2 + lx, ey + 7, 5, 1 + o.yawn * 2, '#5A2A2A');
    p.hline(cx - 2 + lx, cx + 2 + lx, ey + 7, '#7A4A3A');
  } else p.hline(cx - 3 + lx, cx + 3 + lx, ey + 8, '#6A3E32');
  // the night cap (white, navy dots, a pompom drooping to the right)
  if (o.cap) {
    p.rect(L, y0 - 2, 20, 7, '#F4F1E8');
    p.hline(L, R, y0 + 4, '#C8C2B4');
    p.poly([[L + 4, y0 - 2], [R, y0 - 2], [R + 8, y0 + 6], [R + 6, y0 + 7]], '#F4F1E8');
    for (const [dx, dy] of [[3, 0], [9, 2], [14, -1], [18, 3], [22, 5]]) p.set(L + dx, y0 + dy, '#2F4A8A');
    p.rect(R + 6, y0 + 6, 4, 4, '#F4F1E8');
    p.set(R + 7, y0 + 7, '#2F4A8A');
  }
  // the bubble at his nose
  if (o.bubble > 0) {
    const r = 1 + o.bubble;
    p.ring(cx + 4 + r, ey + 5, r, r, '#DFF4FA');
    p.set(cx + 3 + r, ey + 4, '#FFFFFF');
  }
}

/** The suit's body (shoulders at y0, 44 wide, the hem at y0+46), with the shirt, tie and buttons. */
function body(p: PixelCanvas, cx: number, y0: number, breath: number, stripes = true): void {
  const top = y0 - breath;
  // shoulders slope, chest, waist in a little, the hem
  for (let y = top; y < y0 + 46; y++) {
    const k = y - top;
    let hw = k < 3 ? 17 + k * 2 : 22;
    if (y > y0 + 26 && y < y0 + 38) hw = 20;
    if (y >= y0 + 38) hw = 21;
    for (let x = -hw; x < hw; x++) {
      let c = SUIT[2];
      if (x >= hw - 6) c = SUIT[1];
      if (x >= hw - 2) c = SUIT[0];
      if (x < -hw + 3) c = SUIT[3];
      if (k < 2) c = SUIT[3];
      if (stripes && (x + 40) % 4 === 0 && k > 2 && c === SUIT[2]) c = STRIPE;
      p.set(cx + x, y, c);
    }
  }
  // the shirt's V and the black tie
  for (let y = 0; y < 15; y++) {
    const w = Math.max(0, 6 - Math.floor(y * 0.42));
    p.hline(cx - w, cx + w - 1, top + y, SHIRT[1]);
  }
  p.hline(cx - 5, cx + 4, top, SHIRT[2]);
  p.rect(cx - 2, top + 1, 3, 2, TIE[0]);
  p.rect(cx - 1, top + 3, 2, 14, TIE[1]);
  p.set(cx - 1, top + 5, '#2A2440');
  // the lapels (lighter edge), the double-breasted crossing
  p.line(cx - 7, top, cx - 2, top + 18, SUIT[3]);
  p.line(cx + 6, top, cx + 1, top + 18, SUIT[3]);
  p.line(cx - 8, top + 1, cx - 3, top + 19, SUIT[1]);
  p.line(cx + 7, top + 1, cx + 2, top + 19, SUIT[0]);
  p.vline(cx + 2, top + 19, y0 + 46, SUIT[0]);
  // the buttons (two rows of two), the pocket square, the pocket flaps
  for (const [dx, dy] of [[-5, 22], [6, 22], [-5, 30], [6, 30]]) {
    p.set(cx + dx, y0 + dy, '#8E95A6');
    p.set(cx + dx, y0 + dy + 1, '#4A4A55');
  }
  p.rect(cx + 10, top + 9, 4, 2, SHIRT[2]);
  p.hline(cx - 18, cx - 10, y0 + 34, SUIT[1]);
  p.hline(cx + 9, cx + 17, y0 + 34, SUIT[0]);
}

type Arm = 'hang' | 'hip' | 'up' | 'throw' | 'front' | 'book' | 'open';

/** One arm from the shoulder (sx, sy); `side` −1 his right (screen left), +1 his left. */
function arm(p: PixelCanvas, sx: number, sy: number, side: -1 | 1, a: Arm, watch: boolean, seal: boolean): void {
  const sleeve = side < 0 ? SUIT[2] : SUIT[1];
  const sleeveD = side < 0 ? SUIT[1] : SUIT[0];
  const hand = (x: number, y: number) => {
    p.rect(x, y, 6, 6, SKIN[2]);
    p.vline(x + (side < 0 ? 5 : 0), y, y + 5, SKIN[1]);
    p.hline(x, x + 5, y + 5, SKIN[1]);
  };
  const cuff = (x: number, y: number) => p.hline(x, x + 5, y, SHIRT[1]);
  const holdSeal = (x: number, y: number, up: boolean) => {
    if (!seal) return;
    // the black seal: a wooden-dark grip and the black face 「まだ」
    if (up) {
      p.rect(x + 1, y - 4, 4, 4, '#3A2B24');
      p.rect(x - 1, y - 9, 8, 5, '#1B1733');
      p.hline(x - 1, x + 6, y - 9, '#4A4A55');
    } else {
      p.rect(x + 1, y + 6, 4, 3, '#3A2B24');
      p.rect(x - 1, y + 9, 8, 5, '#1B1733');
      p.hline(x - 1, x + 6, y + 13, '#4A4A55');
    }
  };
  switch (a) {
    case 'hang':
    case 'open': {
      const x = side < 0 ? sx - 6 : sx;
      p.rect(x, sy, 7, 30, sleeve);
      p.hline(x, x + 6, sy, SUIT[3]);
      p.vline(side < 0 ? x + 6 : x + 6, sy, sy + 29, sleeveD);
      cuff(x, sy + 30);
      hand(x, sy + 31);
      if (a === 'open') {
        p.set(x + 1, sy + 37, SKIN[2]);
        p.set(x + 4, sy + 37, SKIN[2]);
      }
      holdSeal(x, sy + 31, false);
      if (watch) {
        p.hline(x, x + 5, sy + 29, GOLD[1]);
        p.set(x + 2, sy + 29, GOLD[2]);
      }
      break;
    }
    case 'hip': {
      // the elbow out, the fist on the hip: upper arm down and out, forearm back in
      const x = side < 0 ? sx - 7 : sx;
      for (let i = 0; i < 16; i++) p.hline(x + Math.round(side * i * 0.25), x + Math.round(side * i * 0.25) + 6, sy + i, i < 2 ? SUIT[3] : sleeve);
      for (let i = 0; i < 10; i++) {
        const xx = x + side * 4 - Math.round(side * i * 0.7);
        p.hline(xx, xx + 6, sy + 16 + i, sleeveD);
      }
      const hx = x - side * 3;
      cuff(hx, sy + 25);
      p.rect(hx, sy + 26, 6, 5, SKIN[2]);
      p.hline(hx, hx + 5, sy + 30, SKIN[1]);
      if (watch) p.hline(hx, hx + 5, sy + 25, GOLD[1]);
      break;
    }
    case 'up': {
      // raised high with the seal (『まだ』's wind-up)
      const x = side < 0 ? sx - 7 : sx + 1;
      p.rect(x, sy - 22, 7, 24, sleeve);
      p.vline(side < 0 ? x : x + 6, sy - 22, sy + 1, sleeveD);
      cuff(x, sy - 23);
      hand(x, sy - 29);
      holdSeal(x, sy - 29, true);
      break;
    }
    case 'throw': {
      // reaching out and down toward the panels (he never touches: the seal flies)
      const x = side < 0 ? sx - 14 : sx + 6;
      p.rect(side < 0 ? sx - 7 : sx, sy, 7, 12, sleeve);
      p.rect(x, sy + 10, 14, 7, sleeve);
      cuff(side < 0 ? x : x + 13, sy + 10);
      hand(side < 0 ? x - 5 : x + 13, sy + 11);
      break;
    }
    case 'front': {
      // both hands before him at the waist (holding the board)
      const x = side < 0 ? sx - 6 : sx;
      p.rect(x, sy, 7, 18, sleeve);
      p.rect(side < 0 ? x + 3 : x - 6, sy + 16, 10, 7, sleeveD);
      hand(side < 0 ? x + 11 : x - 11, sy + 17);
      if (watch) p.vline(side < 0 ? x + 12 : x - 7, sy + 17, sy + 22, GOLD[1]);
      break;
    }
    case 'book': {
      // the old passbook opened at his chest
      const x = side < 0 ? sx - 6 : sx;
      p.rect(x, sy, 7, 14, sleeve);
      p.rect(side < 0 ? x + 3 : x - 5, sy + 12, 9, 6, sleeveD);
      hand(side < 0 ? x + 10 : x - 10, sy + 11);
      break;
    }
  }
}

// ---- 決戦（立った 姿） ----------------------------------------------------------------------------

interface Stand extends Head {
  breath: number;
  right: Arm;
  left: Arm;
  seal: boolean;
  watch: boolean;
  book: boolean;
  /** the shake of being hit. */
  hurt: number;
}

const SW = 72;
const SH = 120;
const SOX = 4;
const SOY = 4;

function buildStand(o: Stand): PixelCanvas {
  const p = new PixelCanvas(SW, SH);
  const cx = 32 + SOX + o.hurt;
  const oy = SOY;
  // legs: the trousers (a crease), the shoes
  p.rect(cx - 14, oy + 78, 12, 30, SUIT[2]);
  p.rect(cx + 2, oy + 78, 12, 30, SUIT[1]);
  p.vline(cx - 8, oy + 80, oy + 106, SUIT[3]);
  p.vline(cx + 8, oy + 80, oy + 106, SUIT[2]);
  p.vline(cx - 1, oy + 78, oy + 107, SUIT[0]);
  p.rect(cx - 16, oy + 107, 15, 5, '#0B0B14');
  p.rect(cx + 1, oy + 107, 15, 5, '#0B0B14');
  p.hline(cx - 14, cx - 6, oy + 107, '#3A3F48');
  p.hline(cx + 3, cx + 11, oy + 107, '#3A3F48');
  body(p, cx, oy + 32, o.breath);
  // arms
  arm(p, cx - 21, oy + 33 - o.breath, -1, o.right, false, o.seal);
  arm(p, cx + 21, oy + 33 - o.breath, 1, o.left, o.watch, false);
  if (o.book) {
    p.rect(cx - 5, oy + 46, 10, 8, '#8A2E3A');
    p.rect(cx - 4, oy + 47, 8, 6, '#F4F1E8');
    p.vline(cx, oy + 47, oy + 52, '#C8C2B4');
    p.hline(cx - 3, cx - 1, oy + 49, '#4A6AB0');
    p.hline(cx + 1, cx + 3, oy + 50, '#4A6AB0');
  }
  // the neck and the head
  p.rect(cx - 4, oy + 26 - o.breath, 8, 6, SKIN[1]);
  head(p, cx, oy + 4 - o.breath, o);
  aqFinish(p, 0.45);
  // the tank's light on his shoulders: two blue patches (the pose's own; the sway is in the frame)
  return p;
}

registerEnemyArt('boss_tsugao', (): EnemyArt => {
  const get = cached(buildStand);
  let restored: HTMLCanvasElement | null = null;
  return {
    id: 'boss_tsugao',
    w: SW,
    h: SH,
    ox: SOX,
    oy: SOY,
    frame(v: EnemyView): HTMLCanvasElement {
      const pr = v.params ?? {};
      const eye = pr.eye ?? v.flags.eye ?? 0;
      // watching the people one by one: his face turns a pixel at a time
      const look = v.pose === 'watch' ? (loop(v.gt, 700, 3) - 1) : 0;
      const base: Stand = {
        breath: loop(v.gt, 500, 2), eye: eye >= 4 && v.pose === 'drop' ? 1 : eye, closed: false, yawn: 0, cap: false, bubble: 0, look,
        right: 'hang', left: 'hip', seal: true, watch: Math.floor(v.gt / 3000) % 2 === 0, book: false, hurt: 0,
      };
      // the second part: the board in front of him, both hands on it
      if (pr.board || v.pose === 'board' || v.pose === 'watch') Object.assign(base, { right: 'front', left: 'front', seal: false });
      switch (v.pose) {
        case 'stamp_up':
        case 'windup':
          return get({ ...base, right: 'up' });
        case 'stamp_throw':
        case 'attack':
          return get({ ...base, right: 'throw', seal: false });
        case 'denpyo':
          return get({ ...base, right: 'open', left: 'open', seal: false });
        case 'chokin':
          return get({ ...base, right: 'book', left: 'book', seal: false, book: true });
        case 'cap':
          return get({ ...base, cap: true, closed: v.t > 300 });
        case 'neru':
        case 'rest':
          return get({ ...base, cap: true, closed: true, bubble: loop(v.gt, 450, 3) });
        case 'hurt':
          return get({ ...base, hurt: v.t < 80 ? 1 : 0 });
        case 'drop':
          return get({ ...base, right: 'open', left: 'open', seal: false, eye: 1 });
      }
      return get(base);
    },
    restored(): HTMLCanvasElement {
      if (restored) return restored;
      restored = new PixelCanvas(4, 4).toCanvas();
      return restored;
    },
    gallery: [{ pose: 'idle' }, { pose: 'stamp_up' }, { pose: 'stamp_throw' }, { pose: 'chokin' }, { pose: 'neru' }, { pose: 'board', flags: { eye: 3 } }, { pose: 'drop', flags: { eye: 4 } }],
  };
});

// ---- 初戦（長いすに すわった まま） -----------------------------------------------------------------

interface Seated extends Head {
  breath: number;
  hand: number;
  watch: boolean;
  lean: boolean;
}

const GW = 64;
const GH = 104;
const GOX = 4;
const GOY = 4;

function buildSeated(o: Seated): PixelCanvas {
  const p = new PixelCanvas(GW, GH);
  const cx = 28 + GOX;
  const oy = GOY + (o.lean ? 2 : 0);
  // the bench (the front edge, its legs)
  p.rect(cx - 28, oy + 70, 56, 5, '#6B5A4A');
  p.hline(cx - 28, cx + 27, oy + 70, '#8A7A6A');
  p.hline(cx - 28, cx + 27, oy + 74, '#4A3A2E');
  p.rect(cx - 24, oy + 75, 4, 20, '#4A3A2E');
  p.rect(cx + 20, oy + 75, 4, 20, '#4A3A2E');
  // the thighs forward, shins down, the shoes
  p.rect(cx - 14, oy + 64, 12, 9, SUIT[2]);
  p.rect(cx + 2, oy + 64, 12, 9, SUIT[1]);
  p.rect(cx - 13, oy + 73, 10, 18, SUIT[2]);
  p.rect(cx + 3, oy + 73, 10, 18, SUIT[1]);
  p.vline(cx - 8, oy + 74, oy + 90, SUIT[3]);
  p.rect(cx - 15, oy + 90, 13, 4, '#0B0B14');
  p.rect(cx + 2, oy + 90, 13, 4, '#0B0B14');
  body(p, cx, oy + 30, o.breath);
  // the cold yakisoba pack on his knees (the shop's wrapping)
  p.rect(cx - 8, oy + 61, 16, 5, '#F4F1E8');
  p.rect(cx - 7, oy + 62, 14, 2, '#C8A060');
  p.set(cx + 2, oy + 62, '#E0567A');
  p.hline(cx - 8, cx + 7, oy + 66, '#C8C2B4');
  // the right hand on the knee with the black seal (up when he taunts), the left with the stopped watch
  arm(p, cx - 21, oy + 31 - o.breath, -1, o.hand ? 'up' : 'hang', false, true);
  arm(p, cx + 21, oy + 31 - o.breath, 1, 'hang', o.watch, false);
  p.rect(cx - 4, oy + 24 - o.breath, 8, 6, SKIN[1]);
  head(p, cx, oy + 2 - o.breath, o);
  aqFinish(p, 0.45);
  return p;
}

registerEnemyArt('boss_tsugao_1', (): EnemyArt => {
  const get = cached(buildSeated);
  let restored: HTMLCanvasElement | null = null;
  return {
    id: 'boss_tsugao_1',
    w: GW,
    h: GH,
    ox: GOX,
    oy: GOY,
    frame(v: EnemyView): HTMLCanvasElement {
      const breath = loop(v.gt, 600, 2);
      const watch = Math.floor(v.gt / 4000) !== Math.floor((v.gt - 400) / 4000);
      const base: Seated = { breath, watch, hand: 0, yawn: 0, lean: false, eye: 0, closed: false, cap: false, bubble: 0, look: 0 };
      if (v.pose === 'aori') return get({ ...base, hand: v.t < 200 ? 0 : v.t < 900 ? 1 : 0 });
      if (v.pose === 'yawn') return get({ ...base, yawn: Math.min(3, 1 + Math.floor(v.t / 200)) });
      if (v.pose === 'lean') return get({ ...base, lean: true, closed: true });
      return get(base);
    },
    restored(): HTMLCanvasElement {
      if (restored) return restored;
      restored = new PixelCanvas(4, 4).toCanvas();
      return restored;
    },
    gallery: [{ pose: 'idle' }, { pose: 'aori', t: 300 }, { pose: 'yawn', t: 600 }],
  };
});

void madaStamp;
