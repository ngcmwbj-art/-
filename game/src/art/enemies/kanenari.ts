// グソっ君 (id 'kanenari' / 'enemy_kanenari', ★2026-09-29 依頼主の指示で
// カネナリくん→グソっ君。IDは据え置き): a round giant isopod standing on his hind
// legs. Front battle sprite 56×68 (ノリツッコミ cut-ins, the join battle's
// poses) and the 44×52 back view for the cut-ins where we see him from
// behind (こうらタックル, おてつだい, the bosses): seven thick chest plates,
// the fan tail hanging behind him like a cape.

import { BAYER4, PixelCanvas } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, rimLeft, shade } from './lib';

// dark → light
const SHELL = ['#2A2440', '#3A2B5C', '#4A3A6E', '#6E6890', '#857E9E', '#9A92AE', '#B0A8C4', '#C6BEDA'];
const BELLY = ['#6E6890', '#8A83A2', '#9A92AE', '#B0A8C4', '#C6BEDA', '#D8D2E6', '#E8E4F0'];
const LEG = ['#6E6890', '#9A92AE', '#B0A8C4', '#C6BEDA', '#E8E4F0'];
const EYE = '#1B1733';
const EYE2 = '#2A2440';
const EYE_S = '#4A3A6E';
const GLINT = '#FFF6D8';
const CHEEK = '#F08A7A';
const CHEEK_L = '#F7B0A0';
const W = 56;
const H = 68;
const OX = 4;
const OY = 4;

type ArmPos = 'down' | 'up' | 'out' | 'wave1' | 'wave2' | 'mic' | 'point' | 'hold' | 'cross' | 'present' | 'clap';
type Eyes = 'open' | 'happy' | 'wide' | 'flash' | 'hurt' | 'soft';
type Ant = 'normal' | 'up' | 'mic' | 'droop' | 'swayL' | 'swayR';

interface FrontPose {
  sway?: number;
  /** Head tipped toward the camera (bow) 0..2. */
  bow?: number;
  armL?: ArmPos;
  armR?: ArmPos;
  /** ボケD: standing on one leg (the other tucked up), 0 = both feet. */
  oneLeg?: number;
  /** ボケD: a heap of rice straw on his head. */
  straw?: boolean;
  squash?: number;
  glow?: number;
  eyes?: Eyes;
  ant?: Ant;
  /** The small legs on his tummy: folded, or out clapping (0/1). */
  clap?: number;
  /** Seen from behind (a spin). */
  turned?: boolean;
}

// ---- pieces -------------------------------------------------------------------------------

/** Horizontal half-width of an ellipse mask row (for plate lines that follow the curve). */
function rowSpan(m: Mask, y: number): [number, number] | null {
  let a = -1;
  let b = -1;
  for (let x = 0; x < m.w; x++)
    if (m.in(x, y)) {
      if (a < 0) a = x;
      b = x;
    }
  return a < 0 ? null : [a, b];
}

/**
 * Plate edges on an armour mask: at each row in `edges` a dark line that
 * dips `dip` px in the middle (the round back), a shadow under it, a lit row
 * over it on the lit (left) side; the ends of every edge poke out as small
 * points (the saw-tooth sides). `only` keeps the lines to the sides (front
 * view: the plates wrap round beside the pale tummy).
 */
function plates(p: PixelCanvas, m: Mask, edges: number[], dip: number, only?: Mask, points = true): void {
  const bb = m.bbox();
  const cx = bb.x + bb.w / 2;
  const rx = bb.w / 2;
  for (const e of edges) {
    const span = rowSpan(m, e);
    if (!span) continue;
    for (let x = span[0]; x <= span[1]; x++) {
      const k = (x + 0.5 - cx) / rx;
      const d = Math.round(dip * (1 - k * k));
      const y = e + d;
      if (!m.in(x, y) || (only && only.in(x, y))) continue;
      p.set(x, y, k > 0.55 ? SHELL[1] : SHELL[2]);
      if (m.in(x, y + 1) && !(only && only.in(x, y + 1))) p.set(x, y + 1, k > 0.3 ? SHELL[3] : SHELL[4]);
      if (m.in(x, y - 1) && !(only && only.in(x, y - 1)) && k < 0.1) p.set(x, y - 1, k < -0.5 ? SHELL[7] : SHELL[6]);
    }
    if (points) {
      // the plate's side points
      p.set(span[0] - 1, e, SHELL[3]);
      p.set(span[0] - 1, e - 1, SHELL[5]);
      p.set(span[1] + 1, e, SHELL[1]);
      p.set(span[1] + 1, e - 1, SHELL[2]);
    }
  }
}

/** One compound eye: a big dark oval, the glassy sheen low, the glint high on the left. */
function eye(p: PixelCanvas, cx: number, cy: number, e: Eyes, right: boolean): void {
  if (e === 'happy') {
    // ^ : the eye bends into a smiling arc
    const m = new Mask(p.w, p.h);
    m.curve(cx - 6, cy + 2, cx, cy - 6, cx + 6, cy + 2, 1.3);
    m.each((x, y) => p.set(x, y, EYE));
    return;
  }
  if (e === 'hurt') {
    // > <
    const m = new Mask(p.w, p.h);
    const s = right ? -1 : 1;
    m.line(cx - 5 * s, cy - 4, cx + 3 * s, cy, 1.1).line(cx + 3 * s, cy, cx - 5 * s, cy + 4, 1.1);
    m.each((x, y) => p.set(x, y, EYE));
    return;
  }
  const soft = e === 'soft';
  const m = new Mask(p.w, p.h).ellipse(cx, cy, 6, soft ? 4.2 : 5.6);
  if (soft) m.sub(new Mask(p.w, p.h).rect(cx - 8, cy - 8, 16, 5));
  m.each((x, y) => {
    const v = (y + 0.5 - cy) / 5.6;
    let c = EYE;
    if (v > 0.35) c = (x + y) % 2 === 0 ? EYE_S : EYE2;
    if (v > 0.65) c = EYE_S;
    p.set(x, y, c);
  });
  if (e === 'flash' || e === 'wide') {
    const gc = e === 'flash' ? '#FFE7A3' : GLINT;
    p.rect(cx - 4, cy - 4, 4, 3, gc);
    p.rect(cx - 3, cy - 5, 2, 1, gc);
    p.rect(cx + 2, cy + 1, 2, 2, gc);
    if (e === 'flash') p.rect(cx - 3, cy - 3, 2, 1, '#FFFFFF');
  } else if (soft) {
    p.rect(cx - 3, cy - 2, 2, 2, GLINT);
  } else {
    p.rect(cx - 4, cy - 3, 3, 2, GLINT);
    p.set(cx - 3, cy - 4, GLINT);
    p.set(cx + 2, cy + 2, GLINT);
  }
}

/** A long feeler: a two-pixel stroke along a curve (antenna segments as lighter dots). */
function feeler(p: PixelCanvas, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, far = false): void {
  const m = new Mask(p.w, p.h).curve(x0, y0, cx, cy, x1, y1, 0.9);
  m.each((x, y) => p.set(x, y, far ? SHELL[3] : SHELL[2]));
  // the lit upper-left edge of the stroke and a joint every few px
  const n = 14;
  for (let i = 1; i < n; i += 3) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    p.set(Math.floor(x), Math.floor(y), far ? SHELL[4] : SHELL[4]);
  }
}

function hand(p: PixelCanvas, x: number, y: number): void {
  const m = new Mask(p.w, p.h).ellipse(x, y, 3, 3);
  shade(p, m, LEG, { mode: 'sphere', base: 0.62 });
  p.set(Math.round(x - 1), Math.round(y - 2), LEG[4]);
}

/** The small legs folded on the tummy (three pairs showing), or out and clapping. */
function smallLegs(p: PixelCanvas, cx: number, top: number, clap: number | undefined): void {
  for (let i = 0; i < 4; i++) {
    const y = top + i * 4;
    for (const s of [-1, 1]) {
      const m = new Mask(p.w, p.h);
      if (clap === undefined) {
        // folded: a short leg lying across the edge of the tummy, tip inward
        m.line(cx + s * 8, y, cx + s * 4, y + 1.5, 1);
      } else if (clap) {
        // clapping, apart: the legs swing out past the tummy
        m.line(cx + s * 7, y + 1, cx + s * 13, y - 2, 1);
      } else {
        // clapping, together: the tips meet in the middle
        m.line(cx + s * 8, y + 1, cx + s * 1, y, 1);
      }
      // a dark line under each leg, then the leg
      m.shifted(0, 1).sub(m).each((x, yy) => p.set(x, yy, clap === undefined ? BELLY[1] : SHELL[2]));
      shade(p, m, LEG, { base: 0.66, k: 0.4 });
    }
  }
}

// ---- front ---------------------------------------------------------------------------------

function buildFront(o: FrontPose): PixelCanvas {
  const p = buildFrontRaw(o);
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.5);
  return p;
}

/** The front body without its outline (props get added before outlining). */
function buildFrontRaw(o: FrontPose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => v + OX;
  const Y = (v: number) => v + OY;
  const sway = o.sway ?? 0;
  const sq = o.squash ?? 0;
  const bx = 24 + sway * 0.5;
  // the fan tail behind him, flaring out beside his legs
  {
    const m = new Mask(W, H);
    m.poly([[X(12), Y(44)], [X(2), Y(58)], [X(4), Y(61)], [X(14), Y(59)]]);
    m.poly([[X(36), Y(44)], [X(46), Y(58)], [X(44), Y(61)], [X(34), Y(59)]]);
    m.poly([[X(20), Y(50)], [X(28), Y(50)], [X(26), Y(61)], [X(22), Y(61)]]);
    shade(p, m, SHELL.slice(1, 6), { base: 0.45, k: 0.5 });
    // the fringe of the paddles
    for (const x of [3, 5, 43, 45]) p.set(X(x), Y(60), SHELL[2]);
  }
  // hind legs and feet (on one leg, the left one is tucked up)
  for (const fx of [17, 31]) {
    const lift = o.oneLeg && fx === 17 ? 5 + o.oneLeg : 0;
    const leg = new Mask(W, H).line(X(fx), Y(50 + sq), X(fx + (lift ? 3 : 0)), Y(58 - lift), 2.4);
    shade(p, leg, LEG, { base: 0.55 });
    const f = new Mask(W, H).ellipse(X(fx + (lift ? 3 : fx < 24 ? -1 : 1)), Y(59.5 - lift), 5, 2.6);
    shade(p, f, LEG, { mode: 'sphere', base: 0.5 });
  }
  // body: the armour round the pale tummy
  const body = new Mask(W, H).ellipse(X(bx), Y(41 + sq), 16.5, 12.5 - sq);
  shade(p, body, SHELL, { mode: 'sphere', base: 0.58, k: 0.62, dither: 0.5 });
  const belly = new Mask(W, H).ellipse(X(bx - 0.5), Y(42.5 + sq), 9.5, 10.5 - sq).and(body);
  if (o.turned) {
    plates(p, body, [31, 35, 39, 43, 47, 51].map((v) => Y(v + sq)), 2);
  } else {
    plates(p, body, [32, 36, 40, 44, 48].map((v) => Y(v + sq)), 1, belly);
    shade(p, belly, BELLY, { mode: 'sphere', base: 0.6, k: 0.55, dither: 0.4 });
    // the underside's segment lines
    for (const v of [37, 41, 45, 49]) {
      const y = Y(v + sq);
      const span = rowSpan(belly, y);
      if (span) for (let x = span[0] + 2; x <= span[1] - 2; x++) p.set(x, y, x < X(bx) - 2 ? BELLY[2] : BELLY[1]);
    }
    smallLegs(p, X(bx - 0.5), Y(35 + sq), o.clap);
  }
  // arms
  const armPos = (side: -1 | 1, a: ArmPos | undefined): [number, number] => {
    const sx = bx + side * 15;
    switch (a) {
      case 'up':
        return [sx + side * 4, 10];
      case 'out':
        return [sx + side * 7, 34];
      case 'wave1':
        return [sx + side * 5, 20];
      case 'wave2':
        return [sx + side * 8, 23];
      case 'mic':
        return [bx - 6, 34];
      case 'point':
        return [sx + side * 7, 24];
      case 'hold':
        return [bx - side * 4, 37];
      case 'present':
        return [sx + side * 8, 30];
      case 'clap':
        return [bx + side * 3, 29];
      case 'cross':
        // straight out to the side at the shoulder, like a scarecrow's crossbar
        return [sx + side * 10, 33];
      default:
        return [sx + side * 3, 45];
    }
  };
  const arms: [number, number][] = [];
  for (const side of [-1, 1] as const) {
    const [ax, ay] = armPos(side, side < 0 ? o.armL : o.armR);
    const arm = new Mask(W, H).line(X(bx + side * 13), Y(36 + sq), X(ax), Y(ay), 1.6);
    shade(p, arm, LEG, { base: 0.6 });
    arms.push([X(ax), Y(ay)]);
  }
  // head: a wide dome, the big eyes low in it like a pair of sunglasses
  const bow = o.bow ?? 0;
  const hx = X(24 + sway);
  const hy = Y(18 + sq + bow * 2);
  const ant = o.ant ?? 'normal';
  const top = hy - 12;
  // long feelers from the top of the head
  if (!o.straw) {
    const l: Record<Ant, [number, number, number, number]> = {
      normal: [hx - 14, top - 10, hx - 22, top - 2],
      up: [hx - 8, top - 16, hx - 11, top - 20],
      mic: [hx - 7, top + 12, hx - 2, hy + 9],
      droop: [hx - 16, top - 3, hx - 23, top + 10],
      swayL: [hx - 16, top - 8, hx - 24, top - 5],
      swayR: [hx - 12, top - 11, hx - 19, top - 3],
    };
    const [c1x, c1y, e1x, e1y] = l[ant];
    if (ant !== 'mic') feeler(p, hx - 5, top + 2, c1x, c1y, e1x, e1y);
    const r = ant === 'mic' ? l.normal : l[ant === 'swayL' ? 'swayR' : ant === 'swayR' ? 'swayL' : ant];
    feeler(p, hx + 5, top + 2, 2 * hx - r[0], r[1], 2 * hx - r[2], r[3]);
  }
  const head = new Mask(W, H).ellipse(hx, hy, 18.5, 12.8);
  shade(p, head, SHELL, { mode: 'sphere', base: 0.6, k: 0.62, dither: 0.5 });
  // the head plate's rim: a soft line over the brow
  for (let x = hx - 13; x <= hx + 13; x++) {
    const y = hy - 5 - Math.round(3 * (1 - ((x - hx) / 14) ** 2));
    if (head.in(x, y) && !o.turned && bow < 2) p.set(x, y, x < hx - 4 ? SHELL[5] : SHELL[4]);
  }
  if (!o.turned) {
    const e = o.eyes ?? 'open';
    const ey = hy + 2 + bow;
    eye(p, hx - 9, ey, e, false);
    eye(p, hx + 9, ey, e, true);
    // cheeks
    for (const s of [-1, 1]) {
      p.rect(hx + s * 12 - 2, ey + 6, 4, 2, CHEEK);
      p.set(hx + s * 12 - 2, ey + 6, CHEEK_L);
    }
    // short feelers: a little V on the brow
    if (!o.straw) {
      const up = ant === 'up' ? 2 : 0;
      for (const s of [-1, 1]) {
        const m = new Mask(W, H).line(hx + s * 2, top + 3, hx + s * 5, top - 3 - up, 0.8);
        m.each((x, y) => p.set(x, y, SHELL[2]));
      }
    }
    if (o.glow) {
      // the eyes light up: a pale bloom round each glint
      for (const s of [-1, 1]) {
        const g = new Mask(W, H).ellipse(hx + s * 9 - 2, ey - 2, 4, 3);
        g.each((x, y) => {
          if (BAYER4[y & 3][x & 3] < 6 * (o.glow ?? 1)) p.set(x, y, '#FFE7A3');
        });
      }
    }
  } else {
    // from behind: the head plate's lit crown
    for (let x = hx - 10; x <= hx - 2; x++) p.set(x, hy - 9, SHELL[7]);
  }
  if (ant === 'mic' && !o.straw) {
    // the left feeler bent forward and down in front of his face: its tip
    // hangs at his mouth like a microphone (the tip itself: singFrame)
    const m = new Mask(W, H).curve(hx - 5, top + 2, hx - 10, top + 12, hx - 5, hy + 8, 0.5);
    m.each((x, y) => p.set(x, y, SHELL[1]));
  }
  // hands last (they go over the head when raised)
  for (const [ax, ay] of arms) hand(p, ax, ay);
  if (o.straw) strawHeap(p, hx, hy - 17);
  return p;
}

/**
 * ボケD's straw (51 14.13): a 24×16 heap of rice straw flopped over the top
 * of his head — gold stalks (#E8C878) in a dither, darker bundles (#B89848)
 * inside, stray stalks hanging over the brim on both sides.
 */
function strawHeap(p: PixelCanvas, cx: number, top: number): void {
  const m = new Mask(p.w, p.h);
  for (let y = 0; y < 11; y++) {
    const hw = Math.round(5 + Math.sqrt(y / 10) * 8);
    m.rect(cx - hw, top + y, hw * 2 + 1, 1);
  }
  m.each((x, y) => {
    const v = (x * 3 + y * 5) % 7;
    const inner = y - top > 3 && Math.abs(x - cx) < 8;
    p.set(x, y, inner && BAYER4[y & 3][x & 3] > 9 ? '#B89848' : v === 0 ? '#F6D98A' : v < 3 ? '#D8B868' : '#E8C878');
  });
  for (const [dx, len, lean] of [[-13, 7, -1], [-11, 9, 0], [-7, 5, 0], [10, 8, 1], [12, 6, 1], [4, 4, 0]] as [number, number, number][]) {
    for (let i = 0; i < len; i++) p.set(cx + dx + Math.round((i / len) * lean * 2), top + 9 + i, i % 3 === 2 ? '#B89848' : '#E8C878');
  }
  // his two feelers poke out through the straw
  for (const s of [-1, 1]) for (let i = 1; i <= 5; i++) p.set(cx + s * (3 + Math.floor(i / 2)), top - i, SHELL[2]);
  for (const [dx, h] of [[-5, 3], [0, 4], [2, 3], [7, 2]] as [number, number][]) for (let i = 1; i <= h; i++) p.set(cx + dx + (i > 2 ? 1 : 0), top - i, '#E8C878');
  p.hline(cx - 4, cx + 1, top + 1, '#FFF6D8');
}

// ---- back view (44×52: the cut-ins from behind) ----------------------------------------------

const BW = 44;
const BH = 52;

function buildBack(frame: string): PixelCanvas {
  const p = new PixelCanvas(BW, BH);
  const ox = 2;
  const oy = 2;
  let bow = 0;
  let squash = 0;
  let armR: 'down' | 'up' | 'hit' = 'down';
  let hold = false;
  let lean = 0;
  let step = 0;
  let banzai = false;
  switch (frame) {
    case 'hold':
      hold = true;
      break;
    case 'step':
      squash = 2;
      step = 1;
      break;
    case 'run':
      lean = 2;
      step = 2;
      break;
    case 'slam':
      // こうらタックル: head tucked, the armour first
      lean = 3;
      squash = 1;
      bow = 2;
      break;
    case 'ring':
      lean = -1;
      break;
    case 'hit':
      armR = 'hit';
      break;
    case 'raise':
      armR = 'up';
      break;
    case 'banzai':
      banzai = true;
      break;
    case 'bow1':
      bow = 1;
      break;
    case 'bow2':
      bow = 2;
      break;
    case 'bow3':
      bow = 3;
      break;
    case 'walk1':
      step = 1;
      break;
    case 'walk2':
      step = 2;
      break;
  }
  const X = (v: number) => v + ox;
  const Y = (v: number) => v + oy;
  // feet (soles and heels from behind), under the fan
  const fo = step === 1 ? 1 : step === 2 ? -1 : 0;
  for (const [fx, d] of [[13, fo], [27, -fo]] as [number, number][]) {
    const f = new Mask(BW, BH).ellipse(X(fx), Y(46 - Math.max(0, d)), 4.2, 2.4);
    shade(p, f, LEG, { base: 0.45 });
  }
  const cx = X(20 + lean * 0.5);
  // arms at his sides (behind the armour's edge)
  if (!hold && !banzai) {
    const armL = new Mask(BW, BH).line(X(6 + lean), Y(28 + squash), X(2 + lean), Y(36), 1.5);
    shade(p, armL, LEG, { base: 0.5 });
    hand(p, X(2 + lean), Y(37));
    if (armR === 'down') {
      const a = new Mask(BW, BH).line(X(34 + lean), Y(28 + squash), X(38 + lean), Y(36), 1.5);
      shade(p, a, LEG, { base: 0.4 });
      hand(p, X(38 + lean), Y(37));
    }
  }
  // the head: its crown over the first plate, feelers up and out
  const htop = Y(2 + bow * 3 + squash);
  const head = new Mask(BW, BH).ellipse(X(20 + lean), htop + 9, 13.5, 9.5);
  const aL = bow >= 2 ? [cx - 8, htop + 4, cx - 12, htop + 10] : [cx - 12, htop - 7, cx - 19, htop - 1];
  feeler(p, cx - 4 + lean * 0.5, htop + 3, aL[0], aL[1], aL[2], aL[3]);
  feeler(p, cx + 4 + lean * 0.5, htop + 3, 2 * cx - aL[0] + lean, aL[1], 2 * cx - aL[2] + lean, aL[3]);
  shade(p, head, SHELL, { mode: 'sphere', base: 0.6, k: 0.6, dither: 0.5 });
  // the armour: seven chest plates
  const body = new Mask(BW, BH).ellipse(cx, Y(29 + squash * 0.5), 16, 14 - squash * 0.5);
  shade(p, body, SHELL, { mode: 'sphere', base: 0.6, k: 0.6, dither: 0.5 });
  plates(p, body, [18, 21.5, 25, 28.5, 32, 35.5, 39].map((v) => Math.round(Y(v + squash * 0.6))), 2);
  // the fan tail: the tail plate between two paddles, hanging like a cape
  {
    const pad = new Mask(BW, BH);
    pad.poly([[cx - 7, Y(38)], [cx - 17 - fo, Y(46)], [cx - 13 - fo, Y(49)], [cx - 4, Y(44)]]);
    pad.poly([[cx + 7, Y(38)], [cx + 17 - fo, Y(46)], [cx + 13 - fo, Y(49)], [cx + 4, Y(44)]]);
    shade(p, pad, SHELL.slice(1, 7), { base: 0.5, k: 0.5 });
    // the fringe along the paddles' hems
    for (let i = 0; i < 4; i++) {
      p.set(cx - 16 - fo + i, Y(47 + (i % 2)), SHELL[2]);
      p.set(cx + 13 - fo + i, Y(47 + (i % 2)), SHELL[1]);
    }
    const tail = new Mask(BW, BH).poly([[cx - 8, Y(37)], [cx + 8, Y(37)], [cx + 6, Y(44)], [cx, Y(49)], [cx - 6, Y(44)]]);
    shade(p, tail, SHELL, { base: 0.62, k: 0.6 });
    for (let y = Y(39); y < Y(48); y++) if (tail.in(cx, y)) p.set(cx, y, SHELL[3]);
    for (let y = Y(39); y < Y(45); y++) if (tail.in(cx - 3, y)) p.set(cx - 3, y, SHELL[6]);
    // its spiny rim
    for (const [dx, dy] of [[-5, 45], [5, 45], [-3, 47], [3, 47]] as [number, number][]) p.set(cx + dx, Y(dy), SHELL[2]);
  }
  if (frame === 'ring') {
    p.set(cx + 18, Y(10), '#FFF6D8');
    p.set(cx + 19, Y(12), '#FFF6D8');
  }
  if (armR === 'hit' || armR === 'up') {
    const hy = armR === 'hit' ? 6 : 10;
    const a = new Mask(BW, BH).line(X(33 + lean), Y(26), X(36), Y(hy + 4), 1.5);
    shade(p, a, LEG, { base: 0.5 });
    hand(p, X(36), Y(hy + 3));
  }
  if (banzai) {
    for (const s of [-1, 1]) {
      const a = new Mask(BW, BH).line(cx + s * 13, Y(26), cx + s * 17, Y(9), 1.5);
      shade(p, a, LEG, { base: 0.5 });
      hand(p, cx + s * 17, Y(8));
    }
  }
  if (hold) {
    // both arms up at the right of his head to the pole (x≈35): the left one
    // reaches round in front of him (only its hand shows), the right one is
    // up beside his head; the hands go over the pole the battle draws behind him
    const aR = new Mask(BW, BH).line(X(33), Y(28), X(33), Y(17), 1.5);
    shade(p, aR, LEG, { base: 0.5 });
    hand(p, X(32), Y(8));
    hand(p, X(33), Y(16));
  }
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.5);
  return p;
}

const backCache = new Map<string, HTMLCanvasElement>();
/** Back view (for the cut-ins from behind). Frames: idle step run slam ring hit raise hold banzai bow1-3 walk1-2. */
export function kanenariBack(frame: string): HTMLCanvasElement {
  let c = backCache.get(frame);
  if (!c) {
    c = buildBack(frame).toCanvas();
    backCache.set(frame, c);
  }
  return c;
}

const frontCache = new Map<string, HTMLCanvasElement>();
function front(key: string, o: FrontPose): HTMLCanvasElement {
  let c = frontCache.get(key);
  if (!c) {
    c = buildFront(o).toCanvas();
    frontCache.set(key, c);
  }
  return c;
}

/**
 * Front sprite for the ノリツッコミ boke (16.10), 56 wide; the 'flag' frames
 * are padded (FLAG_PAD) and share the same foot line, so callers anchor on
 * the bottom centre.
 * - 'sing': one long feeler bent down in front of his face for a microphone,
 *   held in his hand, the other arm out / up, swaying (2 frames);
 * - 'flag': (ボケB) clapping with all his little legs — they swing out and in,
 *   パチパチ marks round him (4 frames);
 * - 'flip': (ボケC) the boke gesture — one hand out, presenting himself, head
 *   tilted (2 frames of bob; the battle may still hold a board over his tummy);
 * - 'kime': the landing pose (arms up, happy) held for 2 frames on arrival;
 * - 'kakashi': (ボケD) rice straw on his head, arms out as the crossbar, on one leg.
 */
export function kanenariFront(pose: string, t: number): HTMLCanvasElement {
  if (pose === 'sing') return singFrame(loop(t, 190, 2));
  if (pose === 'flag') return clapFrame(loop(t, 110, 4));
  if (pose === 'flip') {
    const f = loop(t, 280, 2);
    return front(`flip${f}`, { armL: 'down', armR: 'present', sway: f ? 1 : 0, squash: f, eyes: 'happy', ant: f ? 'swayR' : 'swayL' });
  }
  if (pose === 'kime') return front('kime', { armL: 'up', armR: 'up', eyes: 'happy', squash: 1, ant: 'up' });
  if (pose === 'kakashi') {
    const f = loop(t, 240, 2);
    return front(`kakashi${f}`, { armL: 'cross', armR: 'cross', straw: true, oneLeg: 1 + f, sway: f ? 1 : -1, squash: 0, eyes: 'open' });
  }
  return front('idle0', {});
}

/** Extra pixels the flag (clap) frames add on the left / top / right of the 56×68 body canvas. */
export const FLAG_PAD = { x: 8, y: 8, w: 8 };

/** Where the microphone (the tip of his feeler) is on the 'sing' frames, from the canvas' top-left. */
export const MIC_AT: [number, number] = [OX + 19, OY + 28];

function singFrame(f: number): HTMLCanvasElement {
  const key = 'singm' + f;
  let c = frontCache.get(key);
  if (c) return c;
  const p = buildFrontRaw({ armL: 'mic', armR: f ? 'up' : 'out', sway: f ? 1 : -1, eyes: 'happy', ant: 'mic' });
  // the feeler's tip, curled into a little ball in his hand: the "microphone"
  const mx = MIC_AT[0] + (f ? 1 : -1);
  const my = MIC_AT[1];
  p.art(['.kkkk.', 'kWWssk', 'kWsssk', 'ksssgk', 'kssggk', '.kkkk.'], { k: K.outline, W: '#E8E4F0', s: SHELL[6], g: SHELL[4] }, mx - 3, my - 3);
  c = (() => {
    p.outline(K.outline);
    rimLeft(p, K.rim, 0.5);
    return p.toCanvas();
  })();
  frontCache.set(key, c);
  return c;
}

/**
 * ボケB: clapping with all his legs. The little legs swing out (1, 3) and in
 * (0, 2) while the arms clap over his head; short white パチパチ marks pop
 * beside him on every "in".
 */
function clapFrame(f: number): HTMLCanvasElement {
  const key = 'clap' + f;
  let c = frontCache.get(key);
  if (c) return c;
  const open = f % 2;
  const base = buildFrontRaw({ armL: open ? 'up' : 'clap', armR: open ? 'up' : 'clap', sway: [-1, 0, 1, 0][f], eyes: 'happy', clap: open, ant: f < 2 ? 'swayL' : 'swayR', squash: open ? 0 : 1 });
  base.outline(K.outline);
  rimLeft(base, K.rim, 0.5);
  const PW = W + FLAG_PAD.w + FLAG_PAD.x;
  const PH = H + FLAG_PAD.y;
  const p = new PixelCanvas(PW, PH);
  p.blit(base, FLAG_PAD.x, FLAG_PAD.y);
  if (!open) {
    // パチパチ: three short strokes off each side, and over the hands
    const cy = FLAG_PAD.y + OY + 40;
    for (const s of [-1, 1]) {
      const x0 = FLAG_PAD.x + OX + 24 + s * 26;
      for (const [dx, dy] of [[0, -6], [2 * s, -2], [0, 3]] as [number, number][]) {
        p.set(x0 + dx, cy + dy, '#FFF6D8');
        p.set(x0 + dx + s, cy + dy, '#FFF6D8');
      }
    }
    const hy = FLAG_PAD.y + OY + 12;
    for (const [dx, dy] of [[-3, -2], [0, -4], [3, -2]] as [number, number][]) p.set(FLAG_PAD.x + OX + 24 + dx, hy + dy, '#FFF6D8');
  }
  c = p.toCanvas();
  frontCache.set(key, c);
  return c;
}

let restoredC: HTMLCanvasElement | null = null;

registerEnemyArt('enemy_kanenari', (): EnemyArt => ({
  id: 'enemy_kanenari',
  w: W,
  h: H,
  ox: OX,
  oy: OY,
  frame(v: EnemyView): HTMLCanvasElement {
    const sway = [0, 1, 0, -1][loop(v.gt, 220, 4)];
    const ant: Ant = (['normal', 'swayL', 'normal', 'swayR'] as Ant[])[loop(v.gt, 220, 4)];
    switch (v.pose) {
      case 'windup':
      case 'attack': {
        if (v.skill === 'skill_kn_fuusen') return front(`fuu${v.t > 300 ? 1 : 0}`, { armL: v.t > 300 ? 'up' : 'out', armR: 'out', eyes: 'happy', ant });
        if (v.skill === 'skill_kn_goaisatsu') return front(`bow${v.t > 200 ? 2 : 1}`, { bow: v.t > 200 ? 2 : 1, armL: 'down', armR: 'down', squash: 1, eyes: 'soft', ant: 'droop' });
        const kind = (v.params?.pose ?? 0) % 3;
        if (kind === 0) return front('pose0', { armL: 'up', armR: 'up', eyes: 'happy', ant: 'up' });
        if (kind === 1) return front('pose1', { armL: 'out', armR: 'point', eyes: 'wide', ant: 'up' });
        const spin = loop(v.t, 90, 4);
        return spin === 2 ? front('spin', { turned: true, armL: 'out', armR: 'out' }) : front(`posesp${spin}`, { armL: 'out', armR: 'out', sway: spin - 1, eyes: 'wide' });
      }
      case 'fan': {
        const f = loop(v.t, 100, 2);
        return front(`fan${f}`, { armL: 'up', armR: 'up', eyes: 'happy', squash: f ? 1 : 0, ant: 'up' });
      }
      case 'seen':
        return front(`seen${loop(v.gt, 300, 2)}`, { eyes: 'happy', glow: 1, armL: 'down', armR: 'down' });
      case 'hurt':
        return front('hurt', { squash: 1, eyes: 'hurt', ant: 'droop' });
      default: {
        // now and then he waves at nobody
        const cyc = v.gt % 5200;
        if (cyc > 3600 && cyc < 4400) {
          const w = loop(cyc, 110, 4);
          return front(`wave${w}${sway}`, { armR: w % 2 ? 'wave1' : 'wave2', sway, ant });
        }
        return front(`idle${sway}${ant}`, { sway, ant });
      }
    }
  },
  restored() {
    if (!restoredC) restoredC = kanenariBack('idle');
    return restoredC;
  },
  gallery: [
    { pose: 'idle' },
    { pose: 'windup', skill: 'skill_kn_fuusen', t: 400 },
    { pose: 'windup', skill: 'skill_kn_goaisatsu', t: 300 },
    { pose: 'windup', skill: 'skill_kn_pose', t: 0 },
    { pose: 'fan' },
    { pose: 'seen' },
    { pose: 'hurt' },
  ],
}));
