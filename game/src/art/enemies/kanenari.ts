// グソっ君 (id 'kanenari' / 'enemy_kanenari', ★2026-09-29 依頼主の指示で
// カネナリくん→グソっ君。IDは据え置き。★2026-10-08 依頼主の手本の絵に合わせて
// 描き直し): a round, cuddly giant isopod standing on two legs, all warm
// ochre with dark-brown lines. A white headband round his brow, big round
// black eyes with one white glint, pink cheeks, two long tusk-like
// mouthparts hanging from under his nose, little ear plates at the sides of
// his head, a striped (segmented) tummy, armour plates overlapping like
// scales at both sides of his body, segmented arms with two-fingered
// pincers, stout legs with three toes and a ribbed fan tail.
// Front battle sprite 56×68 (ノリツッコミ cut-ins, the join battle's poses)
// and the 44×52 back view for the cut-ins where we see him from behind
// (こうらタックル, おてつだい, the bosses).

import { BAYER4, PixelCanvas } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, rimLeft, shade } from './lib';

// dark → light (30_level_art 9.2: ochre #D49A5C, shade #A8693A, line #5A3A2A)
const SHELL = ['#5A3A2A', '#6B4226', '#8A5A3A', '#A8693A', '#BF8048', '#D49A5C', '#E0AC6E', '#EBBF86'];
const BELLY = ['#A8693A', '#BF8048', '#D49A5C', '#E0AC6E', '#EBBF86', '#F0CB98', '#F6DCB0'];
const LEG = ['#8A5A3A', '#BF8048', '#D49A5C', '#E0AC6E', '#EBBF86', '#F0CB98'];
const TUSK = ['#A8693A', '#D49A5C', '#E0AC6E', '#EBBF86', '#F0CB98', '#F6DCB0'];
const BAND = ['#C8B494', '#E8D9B5', '#FBF3DC', '#FFF6D8'];
const LINE = '#6B4226';
const EYE = '#1B1733';
const EYE2 = '#2A2440';
const EYE_S = '#3A2B24';
const GLINT = '#FFF6D8';
const CHEEK = '#F08A7A';
const CHEEK_L = '#F7B0A0';
const W = 56;
const H = 68;
const OX = 4;
const OY = 4;

type ArmPos = 'down' | 'up' | 'out' | 'wave1' | 'wave2' | 'mic' | 'point' | 'hold' | 'cross' | 'present' | 'clap';
type Eyes = 'open' | 'happy' | 'wide' | 'flash' | 'hurt' | 'soft';
/** The ear plates (they carry his mood): out, perked up, drooping; 'mic' = out (the sing pose). */
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
  /** The side plates: lying flat, or flared out (the clap: 0/1). */
  clap?: number;
  /** Seen from behind (a spin). */
  turned?: boolean;
}

// ---- pieces -------------------------------------------------------------------------------

/** Horizontal span of a mask row. */
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
 * Segment lines on a mask: at each row in `edges` a dark line that dips
 * `dip` px in the middle (the round body), a lit row under it on the left.
 * `only` keeps the lines inside that mask.
 */
function segLines(p: PixelCanvas, m: Mask, edges: number[], dip: number, dark: string, lit: string, inset = 1): void {
  const bb = m.bbox();
  const cx = bb.x + bb.w / 2;
  const rx = bb.w / 2;
  for (const e of edges) {
    const span = rowSpan(m, e);
    if (!span) continue;
    for (let x = span[0] + inset; x <= span[1] - inset; x++) {
      const k = (x + 0.5 - cx) / rx;
      const y = e + Math.round(dip * (1 - k * k));
      if (!m.in(x, y)) continue;
      p.set(x, y, dark);
      if (k < 0.2 && m.in(x, y + 1)) p.set(x, y + 1, lit);
    }
  }
}

/**
 * The armour plates at one side of his body, overlapping like scales and
 * poking out past its edge (drawn before the body, which covers their
 * roots). `side` −1 = left; `flare` spreads them out (the clap).
 */
function sideScales(p: PixelCanvas, edgeX: (y: number) => number, ys: number[], side: -1 | 1, flare = 0): void {
  for (let i = 0; i < ys.length; i++) {
    const y = ys[i];
    const ex = edgeX(y + 1);
    const out = 4 + (i === 0 || i === ys.length - 1 ? -1 : 0) + flare;
    const m = new Mask(p.w, p.h).poly([
      [ex - side * 4, y - 1],
      [ex + side * (out - 1), y],
      [ex + side * out, y + 3],
      [ex + side * (out - 2), y + 5],
      [ex - side * 4, y + 4],
    ]);
    shade(p, m, side < 0 ? SHELL.slice(2, 8) : SHELL.slice(1, 6), { base: 0.55, k: 0.5, dither: 0.3 });
    // its lower edge: a dark line (the next plate tucks under)
    m.each((x, yy) => {
      if (!m.in(x, yy + 1)) p.set(x, yy, SHELL[2]);
    });
  }
}

/** One big round eye: black, the sheen low, one white glint high on the right. */
function eye(p: PixelCanvas, cx: number, cy: number, e: Eyes, right: boolean): void {
  if (e === 'happy') {
    const m = new Mask(p.w, p.h);
    m.curve(cx - 5, cy + 2, cx, cy - 5, cx + 5, cy + 2, 1.2);
    m.each((x, y) => p.set(x, y, EYE));
    return;
  }
  if (e === 'hurt') {
    const m = new Mask(p.w, p.h);
    const s = right ? -1 : 1;
    m.line(cx - 4 * s, cy - 4, cx + 3 * s, cy, 1.1).line(cx + 3 * s, cy, cx - 4 * s, cy + 4, 1.1);
    m.each((x, y) => p.set(x, y, EYE));
    return;
  }
  const soft = e === 'soft';
  const m = new Mask(p.w, p.h).ellipse(cx, cy, 4.8, soft ? 3.8 : 5.2);
  if (soft) m.sub(new Mask(p.w, p.h).rect(cx - 8, cy - 8, 16, 5));
  // a thin brown rim round the eye (the ring in the picture)
  m.clone().shifted(0, 1).or(m.shifted(1, 0)).or(m.shifted(-1, 0)).sub(m).each((x, y) => p.set(x, y, SHELL[2]));
  m.each((x, y) => {
    const v = (y + 0.5 - cy) / 5.2;
    let c = EYE;
    if (v > 0.4) c = (x + y) % 2 === 0 ? EYE_S : EYE2;
    if (v > 0.7) c = EYE_S;
    p.set(x, y, c);
  });
  if (e === 'flash' || e === 'wide') {
    const gc = e === 'flash' ? '#FFE7A3' : GLINT;
    p.rect(cx, cy - 4, 3, 3, gc);
    p.rect(cx - 3, cy + 1, 2, 2, gc);
    if (e === 'flash') p.set(cx + 1, cy - 3, '#FFFFFF');
  } else if (soft) {
    p.rect(cx, cy - 1, 2, 2, GLINT);
  } else {
    p.rect(cx, cy - 3, 2, 2, GLINT);
    p.set(cx + 1, cy - 4, GLINT);
    p.set(cx - 2, cy + 2, '#6B7186');
  }
}

/** An ear plate at the side of the head (side −1 = left), its root at (x, y). */
function earPlate(p: PixelCanvas, x: number, y: number, side: -1 | 1, mood: Ant): void {
  const s = side;
  const pts: [number, number][] =
    mood === 'up'
      ? [[x, y - 1], [x + s * 5, y - 6], [x + s * 7, y - 4], [x + s * 4, y + 2], [x, y + 3]]
      : mood === 'droop'
        ? [[x, y - 1], [x + s * 4, y + 2], [x + s * 4, y + 9], [x + s * 1, y + 8], [x, y + 3]]
        : [[x, y - 2], [x + s * 5, y], [x + s * 6, y + 4], [x + s * 3, y + 6], [x, y + 4]];
  const m = new Mask(p.w, p.h).poly(pts);
  shade(p, m, s < 0 ? SHELL.slice(3, 8) : SHELL.slice(2, 7), { base: 0.55, k: 0.5 });
  // the plate's inner line
  new Mask(p.w, p.h).line(x + s, y + 1, (pts[2][0] + x) / 2, (pts[2][1] + y + 1) / 2, 0.5).and(m).each((xx, yy) => p.set(xx, yy, SHELL[3]));
}

/**
 * The headband over a head mask: a band ~5px deep across the brow, lower at
 * the left (`tilt` px per 10 px), lit cream with a shade at the right and
 * under its lower edge.
 */
function headband(p: PixelCanvas, head: Mask, cx: number, y0: number, tilt: number, depth = 5): void {
  const span = head.bbox();
  for (let x = span.x; x < span.x + span.w; x++) {
    const top = Math.round(y0 - ((x - cx) * tilt) / 10);
    const k = (x - cx) / (span.w / 2);
    for (let j = 0; j < depth; j++) {
      const y = top + j;
      if (!head.in(x, y)) continue;
      let c = j === 0 ? BAND[3] : j < depth - 1 ? BAND[2] : BAND[1];
      if (k > 0.55) c = j === 0 ? BAND[2] : BAND[1];
      if (k > 0.85) c = BAND[0];
      if (j === 2 && k < 0.6 && (x + 1) % 7 === 0) c = BAND[1];
      p.set(x, y, c);
    }
    if (head.in(x, top + depth)) p.set(x, top + depth, SHELL[3]);
  }
}

/** A long tusk from under his nose: a pale tapered stroke with a dark edge and segment rings. */
function tuskStroke(p: PixelCanvas, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number): void {
  const m = new Mask(p.w, p.h);
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    const r = 1.7 * (1 - t) + 0.45;
    m.ellipse(x, y, r, r);
  }
  m.clone().shifted(1, 0).or(m.shifted(-1, 0)).or(m.shifted(0, 1)).sub(m).each((x, y) => p.set(x, y, SHELL[1]));
  shade(p, m, TUSK, { mode: 'bevel', base: 0.58, k: 0.6, dither: 0.3 });
  // segment rings
  for (const t of [0.3, 0.55, 0.78]) {
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const y = Math.round((1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1);
    for (let dx = -2; dx <= 2; dx++) if (m.in(Math.round(x) + dx, y)) p.set(Math.round(x) + dx, y, TUSK[0]);
  }
}

/**
 * A pincer hand at (x, y): a round palm and two fingers pointing along
 * (dx, dy), with a gap between them.
 */
function hand(p: PixelCanvas, x: number, y: number, dx = 0, dy = 1): void {
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const palm = new Mask(p.w, p.h).ellipse(x, y, 2.6, 2.6);
  const fingers = new Mask(p.w, p.h);
  for (const a of [-0.5, 0.5]) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const fx = ux * c - uy * s;
    const fy = ux * s + uy * c;
    fingers.curve(x + fx * 1.5, y + fy * 1.5, x + fx * 4.5, y + fy * 4.5, x + ux * 5.6 + fx * 0.8, y + uy * 5.6 + fy * 0.8, 0.85);
  }
  const all = palm.or(fingers);
  // the gap between the fingers
  new Mask(p.w, p.h).line(x + ux * 3, y + uy * 3, x + ux * 6, y + uy * 6, 0.5).each((xx, yy) => all.set(xx, yy, 0));
  shade(p, all, LEG, { mode: 'bevel', base: 0.6, k: 0.6 });
  p.set(Math.round(x - 1), Math.round(y - 1), LEG[5]);
}

/** A segmented arm from the shoulder to the hand (elbow bent outward), with its pincer. */
function armStroke(p: PixelCanvas, sx: number, sy: number, ax: number, ay: number, side: -1 | 1, shadeBase = 0.6): void {
  const ex = (sx + ax) / 2 + side * 2.5;
  const ey = (sy + ay) / 2 + 1;
  const m = new Mask(p.w, p.h).line(sx, sy, ex, ey, 2.0).line(ex, ey, ax, ay, 1.7);
  m.clone().shifted(1, 0).or(m.shifted(-1, 0)).or(m.shifted(0, 1)).or(m.shifted(0, -1)).sub(m).each((x, y) => {
    if (p.get(x, y) >>> 24) p.set(x, y, SHELL[1]);
  });
  shade(p, m, LEG, { base: shadeBase });
  // the segment joints
  for (const [jx, jy] of [[ex, ey], [(sx + ex) / 2, (sy + ey) / 2], [(ex + ax) / 2, (ey + ay) / 2]] as [number, number][]) {
    for (let d = -2; d <= 2; d++) {
      const x = Math.round(jx + d * (ay - sy > 0 ? 1 : 0.3));
      const y = Math.round(jy + d * (ay - sy > 0 ? 0 : 0.9));
      if (m.in(x, y)) p.set(x, y, LEG[1]);
    }
  }
  hand(p, ax, ay, ax - ex, ay - ey);
}

/** A stout leg and a three-toed foot. `lift` raises the foot (one leg). */
function legFoot(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, toward: -1 | 1, base = 0.55): void {
  const leg = new Mask(p.w, p.h).line(x0, y0, x1, y1 - 1, 2.8);
  shade(p, leg, LEG, { base });
  const ky = Math.round((y0 + y1) / 2);
  for (let d = -3; d <= 3; d++) if (leg.in(Math.round((x0 + x1) / 2) + d, ky)) p.set(Math.round((x0 + x1) / 2) + d, ky, LEG[0]);
  const foot = new Mask(p.w, p.h).ellipse(x1 + toward, y1 + 0.5, 4.6, 2.4);
  // three toes
  for (const t of [-3.5, 0, 3.5]) foot.ellipse(x1 + toward + t, y1 + 2.2, 1.3, 1.3);
  shade(p, foot, LEG, { mode: 'sphere', base: base - 0.05 });
  for (const t of [-1.7, 1.7]) p.set(Math.round(x1 + toward + t), Math.round(y1 + 2.5), SHELL[1]);
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
  // the ribbed fan tail behind him, flaring out beside his legs
  {
    const m = new Mask(W, H);
    m.poly([[X(13), Y(46)], [X(4), Y(57)], [X(6), Y(61)], [X(15), Y(59)]]);
    m.poly([[X(35), Y(46)], [X(44), Y(57)], [X(42), Y(61)], [X(33), Y(59)]]);
    m.poly([[X(20), Y(51)], [X(28), Y(51)], [X(26.5), Y(61)], [X(21.5), Y(61)]]);
    shade(p, m, SHELL.slice(2, 7), { base: 0.45, k: 0.5 });
    // the ribs
    for (const [ax, ay, bx2, by2] of [[11, 49, 6, 58], [13, 51, 10, 59], [37, 49, 42, 58], [35, 51, 38, 59], [24, 53, 24, 60]] as [number, number, number, number][])
      new Mask(W, H).line(X(ax), Y(ay), X(bx2), Y(by2), 0.4).and(m).each((x, y) => p.set(x, y, SHELL[2]));
  }
  // legs and three-toed feet (on one leg, the left one is tucked up)
  for (const fx of [18, 30]) {
    const lift = o.oneLeg && fx === 18 ? 5 + o.oneLeg : 0;
    legFoot(p, X(fx), Y(49 + sq), X(fx + (lift ? 3 : 0)), Y(58 - lift), fx < 24 ? -1 : 1, fx < 24 ? 0.58 : 0.5);
  }
  // body: the egg, the side plates poking out behind it
  const body = new Mask(W, H).ellipse(X(bx), Y(41 + sq), 15.5, 12.5 - sq);
  const edge = (side: -1 | 1) => (y: number) => {
    const s = rowSpan(body, y);
    return s ? (side < 0 ? s[0] : s[1]) : X(bx) + side * 12;
  };
  const scaleYs = [31, 35.5, 40, 44.5, 49].map((v) => Math.round(Y(v + sq * (v > 40 ? 1 : 0.5))));
  if (!o.turned) {
    sideScales(p, edge(-1), scaleYs, -1, o.clap ?? 0);
    sideScales(p, edge(1), scaleYs, 1, o.clap ?? 0);
  } else {
    sideScales(p, edge(-1), scaleYs, -1);
    sideScales(p, edge(1), scaleYs, 1);
  }
  shade(p, body, SHELL, { mode: 'sphere', base: 0.6, k: 0.6, dither: 0.5 });
  if (o.turned) {
    segLines(p, body, [31, 35, 39, 43, 47, 51].map((v) => Y(v + sq)), 2, SHELL[2], SHELL[6], 0);
  } else {
    const belly = new Mask(W, H).ellipse(X(bx - 0.5), Y(42 + sq), 11, 11 - sq).and(body);
    shade(p, belly, BELLY, { mode: 'sphere', base: 0.62, k: 0.55, dither: 0.4 });
    // the segments across the tummy
    segLines(p, belly, [34, 38, 42, 46, 50].map((v) => Y(v + sq)), 1, BELLY[0], BELLY[5], 1);
  }
  // arms
  const armPos = (side: -1 | 1, a: ArmPos | undefined): [number, number] => {
    const sx = bx + side * 14;
    switch (a) {
      case 'up':
        return [sx + side * 4, 8];
      case 'out':
        return [sx + side * 8, 33];
      case 'wave1':
        return [sx + side * 5, 16];
      case 'wave2':
        return [sx + side * 8, 20];
      case 'mic':
        return [bx - 7, 33];
      case 'point':
        return [sx + side * 8, 22];
      case 'hold':
        return [bx - side * 4, 37];
      case 'present':
        return [sx + side * 8, 29];
      case 'clap':
        return [bx + side * 3, 2];
      case 'cross':
        // straight out to the side at the shoulder, like a scarecrow's crossbar
        return [sx + side * 10, 33];
      default:
        return [sx + side * 3, 46];
    }
  };
  const armsLate: (() => void)[] = [];
  for (const side of [-1, 1] as const) {
    const a = side < 0 ? o.armL : o.armR;
    const [ax, ay] = armPos(side, a);
    const raised = Y(ay) < Y(30);
    const draw = () => armStroke(p, X(bx + side * 12), Y(35 + sq), X(ax), Y(ay), side, side < 0 ? 0.62 : 0.52);
    // raised hands go over the head: draw those after it
    if (raised || a === 'mic') armsLate.push(draw);
    else draw();
  }
  // head: a big round bun, the band over the brow, the eyes under it
  const bow = o.bow ?? 0;
  const hx = X(24 + sway);
  const hy = Y(18 + sq + bow * 2);
  const ant = o.ant ?? 'normal';
  const mood: Ant = ant === 'swayL' || ant === 'swayR' || ant === 'mic' ? 'normal' : ant;
  const head = new Mask(W, H).ellipse(hx, hy, 17, 13);
  earPlate(p, hx - 15, hy + 2 + (ant === 'swayL' ? -1 : 0), -1, mood);
  earPlate(p, hx + 15, hy + 2 + (ant === 'swayR' ? -1 : 0), 1, mood);
  shade(p, head, SHELL, { mode: 'sphere', base: 0.62, k: 0.6, dither: 0.5 });
  if (!o.straw) headband(p, head, hx, hy - 9 + (o.turned ? 1 : 0) + bow, o.turned ? 0 : 2.2);
  if (!o.turned) {
    const e = o.eyes ?? 'open';
    const ey = hy + 1 + bow;
    eye(p, hx - 8, ey, e, false);
    eye(p, hx + 8, ey, e, true);
    // cheeks
    for (const s of [-1, 1]) {
      p.rect(hx + s * 12 - 2, ey + 5, 4, 2, CHEEK);
      p.set(hx + s * 12 - 2, ey + 5, CHEEK_L);
    }
    // the little nose (a soft bump line between the eyes)
    for (let x = hx - 4; x <= hx + 4; x++) p.set(x, ey + 5 - (Math.abs(x - hx) <= 1 ? 1 : 0), LINE);
    if (o.glow) {
      // the eyes light up: a pale bloom round each glint
      for (const s of [-1, 1]) {
        const g = new Mask(W, H).ellipse(hx + s * 8 + 1, ey - 2, 4, 3);
        g.each((x, y) => {
          if (BAYER4[y & 3][x & 3] < 6 * (o.glow ?? 1)) p.set(x, y, '#FFE7A3');
        });
      }
    }
    // the tusks hang over his chest (the left one curls up to his hand when he sings)
    if (ant === 'mic') {
      tuskStroke(p, hx - 3, ey + 7, hx - 6, ey + 14, MIC_AT[0] + (sway > 0 ? 1 : -1) + 1, MIC_AT[1] + 3);
    } else tuskStroke(p, hx - 3, ey + 7, hx - 7, ey + 14, hx - 6, ey + 22);
    tuskStroke(p, hx + 3, ey + 7, hx + 6, ey + 15, hx + 5, ey + 22);
  } else {
    // from behind: the head plate's lit crown
    for (let x = hx - 10; x <= hx - 2; x++) p.set(x, hy - 10, SHELL[7]);
  }
  for (const f of armsLate) f();
  if (o.straw) strawHeap(p, hx, hy - 17);
  return p;
}

/**
 * ボケD's straw (51 14.13): a 24×16 heap of rice straw flopped over the top
 * of his head — gold stalks (#E8C878) in a dither, darker bundles (#B89848)
 * inside, stray stalks hanging over the brim on both sides; the ends of his
 * headband peek out under it.
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
  for (const [dx, h] of [[-5, 3], [0, 4], [2, 3], [7, 2]] as [number, number][]) for (let i = 1; i <= h; i++) p.set(cx + dx + (i > 2 ? 1 : 0), top - i, '#E8C878');
  p.hline(cx - 4, cx + 1, top + 1, '#FFF6D8');
  // the headband under the brim
  for (let x = cx - 15; x <= cx - 13; x++) for (let y = top + 11; y <= top + 13; y++) p.set(x, y, y === top + 11 ? BAND[3] : BAND[2]);
  for (let x = cx + 13; x <= cx + 15; x++) for (let y = top + 9; y <= top + 11; y++) p.set(x, y, BAND[1]);
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
  // feet (heels from behind), under the fan
  const fo = step === 1 ? 1 : step === 2 ? -1 : 0;
  for (const [fx, d] of [[14, fo], [26, -fo]] as [number, number][]) {
    const lift = Math.max(0, d);
    legFoot(p, X(fx), Y(39), X(fx), Y(45 - lift), fx < 20 ? -1 : 1, 0.45);
  }
  const cx = X(20 + lean * 0.5);
  // the body and its plates
  const body = new Mask(BW, BH).ellipse(cx, Y(29 + squash * 0.5), 15, 14 - squash * 0.5);
  const edge = (side: -1 | 1) => (y: number) => {
    const s = rowSpan(body, y);
    return s ? (side < 0 ? s[0] : s[1]) : cx + side * 12;
  };
  const ys = [19, 23, 27, 31, 35].map((v) => Math.round(Y(v + squash * 0.5)));
  sideScales(p, edge(-1), ys, -1);
  sideScales(p, edge(1), ys, 1);
  // arms at his sides
  if (!hold && !banzai) {
    armStroke(p, X(7 + lean), Y(26 + squash), X(3 + lean), Y(36), -1, 0.5);
    if (armR === 'down') armStroke(p, X(33 + lean), Y(26 + squash), X(37 + lean), Y(36), 1, 0.42);
  }
  // the head: the crown over the first plate, the band all the way round, the ear plates
  const htop = Y(2 + bow * 3 + squash);
  const hcx = X(20 + lean);
  const head = new Mask(BW, BH).ellipse(hcx, htop + 10, 13, 10);
  if (bow < 2) {
    earPlate(p, hcx - 12, htop + 11, -1, 'normal');
    earPlate(p, hcx + 12, htop + 11, 1, 'normal');
  }
  shade(p, head, SHELL, { mode: 'sphere', base: 0.6, k: 0.6, dither: 0.5 });
  headband(p, head, hcx, htop + 5 + bow, 0, 4);
  shade(p, body, SHELL, { mode: 'sphere', base: 0.6, k: 0.6, dither: 0.5 });
  segLines(p, body, [18, 21.5, 25, 28.5, 32, 35.5, 39].map((v) => Math.round(Y(v + squash * 0.6))), 2, SHELL[2], SHELL[6], 0);
  // the ribbed fan tail between two paddles
  {
    const pad = new Mask(BW, BH);
    pad.poly([[cx - 7, Y(38)], [cx - 16 - fo, Y(45)], [cx - 13 - fo, Y(49)], [cx - 4, Y(44)]]);
    pad.poly([[cx + 7, Y(38)], [cx + 16 - fo, Y(45)], [cx + 13 - fo, Y(49)], [cx + 4, Y(44)]]);
    shade(p, pad, SHELL.slice(2, 7), { base: 0.5, k: 0.5 });
    const tail = new Mask(BW, BH).poly([[cx - 8, Y(37)], [cx + 8, Y(37)], [cx + 6, Y(44)], [cx, Y(49)], [cx - 6, Y(44)]]);
    shade(p, tail, SHELL, { base: 0.62, k: 0.6 });
    const ribs = pad.clone().or(tail);
    for (const dx of [-12, -8, -3, 3, 8, 12])
      new Mask(BW, BH).line(cx + dx * 0.4, Y(39), cx + dx - fo * (Math.abs(dx) > 6 ? 1 : 0), Y(48), 0.4).and(ribs).each((x, y) => p.set(x, y, SHELL[2]));
    for (let y = Y(39); y < Y(48); y++) if (tail.in(cx, y)) p.set(cx, y, SHELL[3]);
  }
  if (frame === 'ring') {
    p.set(cx + 18, Y(10), '#FFF6D8');
    p.set(cx + 19, Y(12), '#FFF6D8');
  }
  if (armR === 'hit' || armR === 'up') {
    const hy = armR === 'hit' ? 6 : 10;
    armStroke(p, X(33 + lean), Y(25), X(36), Y(hy + 3), 1, 0.5);
  }
  if (banzai) {
    for (const s of [-1, 1] as const) armStroke(p, cx + s * 12, Y(25), cx + s * 16, Y(8), s, 0.5);
  }
  if (hold) {
    // both arms up at the right of his head to the pole (x≈35): the left one
    // reaches round in front of him (only its hand shows), the right one is
    // up beside his head; the hands go over the pole the battle draws behind him
    armStroke(p, X(32), Y(27), X(33), Y(16), 1, 0.5);
    hand(p, X(32), Y(8), 0, -1);
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
 * - 'sing': the tip of his left tusk curled up into his pincer for a
 *   microphone, the other arm out / up, swaying (2 frames);
 * - 'flag': (ボケB) clapping over his head while the plates at his sides
 *   flare out and in, パチパチ marks round him (4 frames);
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

/** Where the microphone (the tip of his tusk) is on the 'sing' frames, from the canvas' top-left. */
export const MIC_AT: [number, number] = [OX + 19, OY + 28];

function singFrame(f: number): HTMLCanvasElement {
  const key = 'singm' + f;
  let c = frontCache.get(key);
  if (c) return c;
  const p = buildFrontRaw({ armL: 'mic', armR: f ? 'up' : 'out', sway: f ? 1 : -1, eyes: 'happy', ant: 'mic' });
  // the tusk's tip, curled into a little ball in his hand: the "microphone"
  const mx = MIC_AT[0] + (f ? 1 : -1);
  const my = MIC_AT[1];
  p.art(['.kkkk.', 'kWWssk', 'kWsssk', 'ksssgk', 'kssggk', '.kkkk.'], { k: K.outline, W: TUSK[5], s: TUSK[3], g: TUSK[1] }, mx - 3, my - 3);
  c = (() => {
    p.outline(K.outline);
    rimLeft(p, K.rim, 0.5);
    return p.toCanvas();
  })();
  frontCache.set(key, c);
  return c;
}

/**
 * ボケB: clapping. The side plates flare out (1, 3) and in (0, 2) while
 * the arms clap over his head; short white パチパチ marks pop
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
