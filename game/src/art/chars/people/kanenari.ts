// グソっ君 (id 'kanenari', ★2026-09-29 依頼主の指示で カネナリくん→グソっ君。IDは据え置き):
// a round giant isopod (オオグソクムシ) who walks on his hind legs. Grey-violet
// armour of seven thick chest plates (the steps read best from behind), a
// fan tail (uropods) that hangs behind him like a little cape, big black
// compound eyes like sunglasses with one white glint each, two long feelers
// that bob when he walks and two short ones between them. The front pair of
// legs are his arms (no claws); the small legs sit folded in front of his
// tummy and now and then wiggle (わしゃっ). He shows how he feels with the
// glint, the feelers, the tilt of his body and a touch of pink on his cheeks.
// Canvas 20×26 (art in the 16px box at +2); the feelers rise into the headroom.

import { flat, mat, type Fig, type Mats } from '../fig';
import { buildSprite, rep, type IdleKey, type Pose, type SpriteSpec } from '../rig';
import { charSprite, registerChar, type CharSprite } from '../registry';
import { PixelCanvas } from '../../../engine/pixel';

// 30_level_art 9.2 (グソっ君): shell #9A92AE, blue-violet shade, lavender light
export const KANENARI_KEEP = ['#9A92AE', '#6E6890', '#C6BEDA'];
export const KANENARI_MATS: Mats = {
  shell: mat('#9A92AE', { shade: '#6E6890', light: '#C6BEDA', dark: '#4A3A6E' }),
  // the fan tail and far limbs, one step back
  shellD: mat('#6E6890', { shade: '#4A3A6E', light: '#9A92AE', dark: '#3A2B5C' }),
  belly: mat('#C6BEDA', { shade: '#9A92AE', light: '#E8E4D8', dark: '#6E6890' }),
  leg: mat('#C6BEDA', { shade: '#9A92AE', light: '#E8E4D8', dark: '#6E6890' }),
  ant: flat('#4A3A6E'),
  antL: flat('#6E6890'),
  eye: flat('#2A2440'),
  eyeS: flat('#4A3A6E'),
  glint: flat('#FFF6D8'),
  flash: flat('#FFE7A3'),
  cheek: flat('#F08A7A'),
  mouth: flat('#2A2440'),
  // the yakisoba pack: clear lid over a white tray, sauced noodles, a red band
  lid: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  noodle: mat('#C8A06A', { shade: '#8A5A3A', light: '#F6D98A', dark: '#5A3A2A' }),
  band: flat('#E84E3C'),
  nori: flat('#5FA85A'),
};

const H = 26;
/** Frames are 20px wide; art is authored in the 16px box at +2. */
const OX = 2;

// ---- feelers ---------------------------------------------------------------------------

type Ant = 'normal' | 'up' | 'droop' | 'back' | 'happy' | 'fwd' | 'perk' | 'lean';

/** Left feeler, relative to its root (x → right, y → down); the right one is mirrored. */
const ANT: Record<Ant, [number, number][]> = {
  normal: [[0, -1], [-1, -2], [-2, -3], [-3, -4], [-4, -4], [-5, -3]],
  // ピーン: straight up
  up: [[0, -1], [0, -2], [0, -3], [-1, -4], [-1, -5], [-1, -6]],
  perk: [[0, -1], [-1, -2], [-1, -3], [-2, -4], [-3, -4]],
  droop: [[0, -1], [-1, -2], [-2, -2], [-3, -2], [-4, -1], [-5, 0], [-6, 1]],
  // the head tipped back: swept back over the crown
  back: [[0, -1], [-1, -2], [-1, -3], [-2, -3]],
  happy: [[0, -1], [-1, -2], [-2, -3], [-3, -4], [-4, -4], [-5, -3]],
  // bowing: pointing down past the face
  fwd: [[0, -1], [-1, -1], [-2, -1]],
  lean: [[1, -1], [1, -2], [2, -3], [3, -3], [4, -2]],
};

/**
 * One long feeler from its root (x, y). `dir` −1 = the left one (bends out
 * to the left), +1 = the right one (mirrored). `sway` moves its outer half
 * up (−) or down (+); `far` = the feeler on the far side (a step lighter).
 */
function feelerAt(f: Fig, x: number, y: number, mode: Ant, dir: -1 | 1, sway = 0, far = false) {
  const pts = ANT[mode];
  f.part(far ? 'antL' : 'ant', { flat: true, rim: false, ol: false });
  pts.forEach(([dx, dy], i) => {
    const s = i >= pts.length - 2 ? sway : 0;
    f.px(x + (dir < 0 ? dx : -dx), y + dy + s);
  });
}

// ---- the head --------------------------------------------------------------------------

type Eyes = 'open' | 'blink' | 'hurt' | 'happy' | 'flash' | 'wide' | 'soft' | 'sad' | 'down' | 'up' | 'none';

interface HeadO {
  eyes: Eyes;
  ant: Ant;
  sway?: number;
  cheek?: number;
  mouth?: 'smile' | 'o' | 'munch' | '';
  /** Short feelers perked (+1) or flat (0). */
  shortUp?: boolean;
}

/** One compound eye, 4×4, its top-left at (x, y). */
function eyeFront(f: Fig, x: number, y: number, e: Eyes, glintLeft: boolean) {
  f.part('eye', { flat: true, rim: false });
  if (e === 'hurt') {
    // squeezed: > < (the left eye is the '>')
    const rows = glintLeft ? ['##..', '..##', '##..'] : ['..##', '##..', '..##'];
    f.rows(x, y + 1, rows);
    return;
  }
  if (e === 'happy') {
    // smiling: ^ ^
    f.rows(x, y + 1, ['.##.', '#..#']);
    return;
  }
  if (e === 'sad' || e === 'soft') {
    // the upper edge droops (a lid of shell), the eye rests low
    f.hl(x, x + 3, y + 2).hl(x + 1, x + 2, y + 3).px(x + (glintLeft ? 3 : 0), y + 1).px(x + (glintLeft ? 2 : 1), y + 1);
    f.part('eyeS', { flat: true, rim: false });
    f.px(x + 1, y + 3).px(x + 2, y + 3);
    f.part('glint', { flat: true, rim: false });
    if (e === 'soft') f.px(x + 1, y + 2);
    else f.px(x + (glintLeft ? 1 : 2), y + 3);
    return;
  }
  f.px(x + 1, y).px(x + 2, y);
  f.hl(x, x + 3, y + 1).hl(x, x + 3, y + 2);
  f.part('eyeS', { flat: true, rim: false });
  f.px(x + 1, y + 3).px(x + 2, y + 3);
  if (e === 'blink' || e === 'none') return;
  f.part(e === 'flash' ? 'flash' : 'glint', { flat: true, rim: false });
  const gx = x + 1;
  if (e === 'flash' || e === 'wide') f.rect(gx, y + (e === 'wide' ? 0 : 1), 2, 2).px(x + 3, y + 2);
  else if (e === 'up') f.px(gx, y);
  else if (e === 'down') f.px(gx, y + 2);
  else f.px(gx, y + 1);
}

/**
 * Head from the front, top row at y: an 12×8 dome (x2..13), eyes in its
 * lower half like a pair of sunglasses, the short feelers between the long
 * ones. `tip`: the head tipped forward (+, we see more crown) or back (−).
 */
function headFront(f: Fig, y: number, o: HeadO, tip = 0) {
  // long feelers behind the dome
  const ay = y + (tip > 0 ? 1 : 0);
  feelerAt(f, 5, ay, o.ant, -1, o.sway ?? 0);
  // (leaning: both feelers point the same way, to the right)
  feelerAt(f, 10, ay, o.ant === 'lean' ? 'normal' : o.ant, 1, o.sway ?? 0);
  f.part('shell', { shade: 'rb', light: 't' });
  f.ell(8, y + 4, 6, 4.2);
  // the crown's lit band and the dark far side
  f.retone(5, y + 1, 1).retone(4, y + 2, 1).retone(6, y + 1, 1);
  // the head plate's rim over the eyes (a brow line of the shell)
  const ey = y + 3 + tip;
  if (tip < 0) {
    // looking up: the eyes ride up, the chin shows
    eyeFront(f, 3, ey - 1, o.eyes, true);
    eyeFront(f, 9, ey - 1, o.eyes, true);
  } else if (tip >= 2) {
    // a deep bow: only the tops of the eyes show under the crown
    f.part('eye', { flat: true, rim: false });
    f.hl(4, 5, y + 6).hl(10, 11, y + 6).hl(3, 6, y + 7).hl(9, 12, y + 7);
  } else {
    eyeFront(f, 3, ey, o.eyes, true);
    eyeFront(f, 9, ey, o.eyes, o.eyes !== 'hurt');
  }
  // short feelers: a little V on the brow
  f.part('ant', { flat: true, rim: false, ol: false });
  if (tip < 2) {
    const sy = y + (tip > 0 ? 1 : 0);
    if (o.shortUp) f.px(7, sy - 1).px(7, sy - 2).px(6, sy - 3).px(8, sy - 1).px(8, sy - 2).px(9, sy - 3);
    else f.px(7, sy - 1).px(6, sy - 2).px(8, sy - 1).px(9, sy - 2);
  }
  if (o.cheek && tip < 2) {
    f.part('cheek', { flat: true, rim: false });
    const cy = ey + (tip < 0 ? 2 : 3);
    f.px(3, cy).px(12, cy);
    if (o.cheek > 1) f.px(2, cy).px(13, cy);
  }
  if (o.mouth && tip < 2) {
    f.part('mouth', { flat: true, rim: false });
    const my = y + 7 + (tip < 0 ? 0 : 0);
    if (o.mouth === 'smile') {
      // (no line for a smile: the eyes and cheeks carry it)
    } else if (o.mouth === 'o') f.px(7, my).px(8, my).px(7, my - 1).px(8, my - 1);
    else if (o.mouth === 'munch') f.px(7, my).px(8, my - 1);
  }
}

/** Head from the side (facing left), top row at y: the eye near the front. */
function headSide(f: Fig, y: number, o: HeadO, tip = 0) {
  // the far long feeler first, a step lighter, then the near one
  const fy = y + (tip > 0 ? 1 : 0);
  feelerAt(f, 6, fy, sideAnt(o.ant), -1, o.sway ?? 0, true);
  f.part('shell', { shade: 'rb', light: 't' });
  f.ell(7.5, y + 4, 5.5, 4.2);
  f.retone(5, y + 1, 1).retone(4, y + 2, 1);
  const ey = y + 3 + tip;
  const e = o.eyes;
  const ex = 2;
  if (tip >= 2) {
    f.part('eye', { flat: true, rim: false });
    f.hl(ex, ex + 2, y + 7);
  } else if (e === 'hurt') {
    f.part('eye', { flat: true, rim: false });
    f.hl(ex, ex + 2, ey + 2).px(ex + 1, ey + 3);
  } else if (e === 'happy') {
    f.part('eye', { flat: true, rim: false });
    f.px(ex, ey + 2).px(ex + 1, ey + 1).px(ex + 2, ey + 2);
    f.part('glint', { flat: true, rim: false });
    f.px(ex + 1, ey + 1);
  } else if (e === 'sad' || e === 'soft') {
    f.part('eye', { flat: true, rim: false });
    f.hl(ex, ex + 2, ey + 2).px(ex + 2, ey + 1);
    f.part('eyeS', { flat: true, rim: false });
    f.px(ex + 1, ey + 3);
    f.part('glint', { flat: true, rim: false });
    f.px(ex + (e === 'soft' ? 1 : 0), e === 'soft' ? ey + 2 : ey + 3);
  } else {
    const dy = tip < 0 ? -1 : 0;
    f.part('eye', { flat: true, rim: false });
    f.px(ex + 1, ey + dy).px(ex + 2, ey + dy).hl(ex, ex + 2, ey + 1 + dy).hl(ex, ex + 2, ey + 2 + dy);
    f.part('eyeS', { flat: true, rim: false });
    f.px(ex + 1, ey + 3 + dy);
    if (e !== 'blink' && e !== 'none') {
      f.part(e === 'flash' ? 'flash' : 'glint', { flat: true, rim: false });
      if (e === 'flash' || e === 'wide') f.rect(ex, ey + dy, 2, 2);
      else f.px(ex, ey + 1 + dy + (e === 'down' ? 1 : e === 'up' ? -1 : 0));
    }
  }
  // the near long feeler and the short one, from the front of the head
  feelerAt(f, 4, fy, sideAnt(o.ant), -1, o.sway ?? 0);
  if (tip < 2) {
    f.part('ant', { flat: true, rim: false, ol: false });
    if (o.shortUp) f.px(2, fy).px(1, fy - 1);
    else f.px(2, fy + 1).px(1, fy + 1);
  }
  if (o.cheek && tip < 2) {
    f.part('cheek', { flat: true, rim: false });
    f.px(ex + 1, ey + 4 + (tip < 0 ? -1 : 0));
    if (o.cheek > 1) f.px(ex + 2, ey + 4 + (tip < 0 ? -1 : 0));
  }
  if (o.mouth && tip < 2) {
    f.part('mouth', { flat: true, rim: false });
    const my = y + 7;
    if (o.mouth === 'o') f.px(2, my).px(2, my - 1);
    else f.px(2, my);
  }
}

/** Side feelers lean forward (the face is on the left). */
function sideAnt(a: Ant): Ant {
  return a;
}

/** Head from behind: the smooth head plate, the eyes just showing at its sides. */
function headBack(f: Fig, y: number, o: HeadO, tip = 0) {
  f.part('shell', { shade: 'rb', light: 't' });
  f.ell(8, y + 4, 6, 4.2);
  f.retone(5, y + 1, 1).retone(4, y + 2, 1).retone(4, y + 3, 1).retone(6, y + 1, 1);
  // feelers in front of the head (they come out of its face)
  const a = o.ant === 'back' ? 'normal' : o.ant;
  feelerAt(f, 5, y + (tip > 0 ? 1 : 0), a, -1, o.sway ?? 0);
  feelerAt(f, 10, y + (tip > 0 ? 1 : 0), a, 1, o.sway ?? 0);
}

// ---- body -------------------------------------------------------------------------------

/**
 * Front: the pale underside with the small legs folded over it in three
 * pairs, framed by the edges of the armour (every plate a step on the side).
 * `washa` wiggles the folded legs (0/1/2).
 */
function bodyFront(f: Fig, y: number, washa = 0, squash = 0) {
  f.part('shell', { shade: 'rb', light: 't', inner: false });
  f.ell(8, y + 5.5 + squash * 0.5, 6 + squash * 0.3, 5.8 - squash * 0.5);
  // the armour's edges wrap round both sides: a step at every plate
  for (const r of [2, 4, 6, 8]) {
    const yy = y + r + (r > 4 ? squash : 0);
    for (const x of [2, 3, 4]) if (f.filled(x, yy)) f.retone(x, yy, -1);
    for (const x of [11, 12, 13]) if (f.filled(x, yy)) f.retone(x, yy, x === 13 ? -2 : -1);
  }
  // the pale underside
  f.part('belly', { shade: 'rb', light: 'tl', inner: false });
  f.ell(8, y + 6 + squash * 0.5, 2.9, 4.4 - squash * 0.5);
  // the small legs, folded in three pairs along its edges (わしゃっ: they wiggle)
  f.part('leg', { flat: true, rim: false, ol: false });
  for (const [i, r] of [[0, 3], [1, 5], [2, 7]] as const) {
    const yy = y + r + (i > 0 ? squash : 0);
    const w = washa && (i + washa) % 2 === 0 ? -1 : 0;
    f.t(-1).px(5, yy + w).px(6, yy + 1 + w).px(10, yy - w).px(9, yy + 1 - w);
  }
  f.t(null);
}

/** Back: seven chest plates stepping down, lit from the left, each end a small point. */
function bodyBack(f: Fig, y: number, squash = 0) {
  platesBack(f, y, squash);
}

/**
 * The armour from behind (rows y−2 … y+10, over the lower half of the head):
 * seven chest plates, each one a lit band and a dark lower edge that dips
 * in the middle (the back is round), the ends of every edge poking out 1px
 * (the saw-tooth sides of the real thing).
 */
function platesBack(f: Fig, y: number, squash = 0) {
  const top = y - 2;
  const rows: [number, number][] = [[4, 11], [3, 12], [2, 13], [2, 13], [2, 13], [2, 13], [2, 13], [2, 13], [2, 13], [2, 13], [2, 13], [3, 12], [4, 11]];
  f.part('shell', { shade: '', light: '', inner: false });
  for (let r = 0; r < rows.length; r++) {
    const [x0, x1] = rows[r];
    const yy = top + r + (r > 6 ? squash : 0);
    for (let x = x0; x <= x1; x++) {
      const sideCol = x <= 4 || x >= 11;
      const rr = r + (sideCol ? 1 : 0);
      const edge = rr >= 2 && rr % 2 === 0 && rr <= 12;
      let t: number;
      if (edge) t = x >= 11 ? -2 : -1;
      else if (x <= 5) t = 1;
      else if (x >= 12) t = -1;
      else t = 0;
      f.t(t).px(x, yy);
    }
    // the saw-tooth: every plate's edge pokes out at both sides
    const rr = r + 1;
    if (x0 === 2 && rr % 2 === 0) f.t(-1).px(1, yy).t(-2).px(14, yy);
  }
  f.t(null);
}

/** Side (facing left): the pale front on the left, the plates along the curved back on the right. */
function bodySide(f: Fig, y: number, washa = 0, squash = 0) {
  f.part('shell', { shade: 'rb', light: 't', inner: false });
  f.ell(8, y + 5.5 + squash * 0.5, 5.6, 5.8 - squash * 0.5);
  // plate steps along the back
  const tops = [0, 1.5, 3, 4.5, 6, 7.5, 9].map((v) => Math.round(v + (v > 4 ? squash : 0)));
  for (let k = 0; k < tops.length - 1; k++) {
    const low = y + tops[k + 1] - 1;
    for (let x = 9; x <= 14; x++) if (f.filled(x, low)) f.retone(x, low, -1);
    // each plate's rear point
    if (k > 0 && k < 6) {
      const ex = [...Array(16).keys()].reverse().find((x) => f.filled(x, low));
      if (ex !== undefined && ex < 15) f.t(-1).px(ex + 1, low).t(null);
    }
  }
  f.part('belly', { shade: 'rb', light: 'tl', inner: false });
  f.ell(5.2, y + 6 + squash * 0.5, 2.8, 4.6 - squash * 0.5);
  f.part('leg', { flat: true, rim: false, ol: false });
  for (const [i, r] of [[0, 3], [1, 5], [2, 7]] as const) {
    const yy = y + r + (i > 0 ? squash : 0);
    const w = washa && (i + washa) % 2 === 0 ? -1 : 0;
    f.t(-1).px(5, yy + w).px(4, yy + w).t(-2).px(3, yy + w);
  }
  f.t(null);
}

// ---- tail fan, legs, arms --------------------------------------------------------------

/** The fan tail behind him, seen from the front: two flaps flaring out under the body. */
function fanFront(f: Fig, y: number, sw = 0) {
  f.part('shellD', { shade: 'rb', light: 't' });
  f.poly([[4, y + 6], [1 + sw, 23.2], [2 + sw, 24.6], [5.5, 23.6]]);
  f.poly([[12, y + 6], [15 + sw, 23.2], [14 + sw, 24.6], [10.5, 23.6]]);
  // the middle plate reaches the ground between the legs
  f.poly([[6.5, y + 9], [9.5, y + 9], [8.6, 24.6], [7.4, 24.6]]);
}

/**
 * Fan tail from behind, under the last plate: the tail plate (a rounded
 * point with a ridge) between the two paddles, which flare out like the
 * hem of a cape. `sw` sways the hem.
 */
const FAN_BACK = [
  '....hHhooood....',
  '..pphHhooood=pp.',
  '.ppppHhoood=pppp',
  'pppp.hhoo=d.pppp',
  'p.p...hd=....p.p',
];
function fanBack(f: Fig, y: number, sw = 0) {
  f.part('shellD', { shade: '', light: '', inner: false });
  FAN_BACK.forEach((row, j) => {
    f.rows(j >= 2 ? sw : 0, y + 10 + j, [row.replace(/[hHod=]/g, '.')], { p: [null, 0] });
  });
  f.part('shell', { shade: '', light: '', inner: false, sepAll: true });
  FAN_BACK.forEach((row, j) => {
    f.rows(0, y + 10 + j, [row.replace(/p/g, '.')], { h: [null, 0], H: [null, 1], o: [null, 0], d: [null, -1], '=': [null, -2] });
  });
}

/** Fan tail from the side: a cape hanging behind (right), flaring at the hem. */
function fanSide(f: Fig, y: number, sw = 0) {
  f.part('shellD', { shade: 'rb', light: 't' });
  f.poly([[10, y + 5], [14.5, y + 9], [15.6 + sw, 23.6], [12.5 + sw, 24.6], [9.5, 22]]);
}

/** Feet and the hind legs that carry him. Front/back: both; side: near and far. */
function legs(f: Fig, p: Pose, by: number, view: 'front' | 'side', crouch = 0) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const y = H - 2;
  const hip = by + 10;
  if (view === 'front') {
    const l = st === 1 ? 1 : 0;
    const r = st === 3 ? 1 : 0;
    const spread = crouch ? 1 : 0;
    f.part('leg', { shade: 'rb', light: 't' });
    if (y - l > hip) f.rect(5 - spread, hip, 2, y - l - hip);
    f.rows(4 - spread * 2, y - l, ['.##', '###']);
    f.part('leg', { shade: 'rb', light: 't', shift: -1 });
    if (y - r > hip) f.rect(9 + spread, hip, 2, y - r - hip);
    f.rows(9 + spread * 2, y - r, ['##.', '###']);
  } else {
    const a = st === 1 ? -1 : st === 3 ? 1 : 0;
    f.part('leg', { shade: 'rb', light: 't', shift: -1 });
    if (y > hip) f.rect(8 - a, hip, 2, y - hip);
    f.rows(7 - a, y, ['.##', '###']);
    f.part('leg', { shade: 'rb', light: 't' });
    if (y > hip) f.rect(6 + a, hip, 2, y - hip);
    f.rows(5 + a, y, ['.##', '###']);
  }
}

/**
 * A thin arm (the first pair of legs) from the shoulder (x0, y0) to a small
 * round hand whose top-left is (hx, hy). Where it lies over his body, the
 * body round it takes a dark line (an outline inside the silhouette), so a
 * pale arm reads over the pale tummy too.
 */
function arm(f: Fig, x0: number, y0: number, hx: number, hy: number, shift = 0) {
  const ex = hx + (hx < x0 ? 1 : 0);
  const ey = hy + (hy < y0 ? 1 : 0);
  // the pixels the arm will cover (drawing offset applied by px/filled)
  const pts: [number, number][] = [];
  {
    let xa = Math.round(x0), ya = Math.round(y0);
    const xb = Math.round(ex), yb = Math.round(ey);
    const dx = Math.abs(xb - xa), dy = -Math.abs(yb - ya);
    const sx = xa < xb ? 1 : -1, sy = ya < yb ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 64; n++) {
      pts.push([xa, ya]);
      if (xa === xb && ya === yb) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; xa += sx; }
      if (e2 <= dx) { err += dx; ya += sy; }
    }
  }
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) pts.push([hx + i, hy + j]);
  const mine = new Set(pts.map(([x, y]) => x * 100 + y));
  for (const [x, y] of pts)
    for (const [nx, ny] of [[x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1]] as [number, number][])
      if (!mine.has(nx * 100 + ny) && f.filled(nx, ny) && !(nx === x0 && ny === y0)) f.retone(nx, ny, -2);
  f.part('leg', { shade: 'rb', light: 't', shift });
  for (const [x, y] of pts) f.px(x, y);
}

/** The yakisoba pack held in both hands (8×4), top-left at (x, y). */
function pack(f: Fig, x: number, y: number, open = false) {
  f.part('noodle', { shade: 'rb', light: 't' });
  f.rect(x, y + 1, 8, 3);
  f.part('nori', { flat: true, rim: false });
  f.px(x + 2, y + 1).px(x + 5, y + 2);
  f.part('band', { flat: true, rim: false });
  if (open) f.px(x + 6, y + 1);
  else f.vl(x + 4, y + 1, y + 3);
  f.part('lid', { flat: true, rim: false });
  if (!open) f.hl(x, x + 7, y);
  f.hl(x, x + 7, y + 4);
}

// ---- views --------------------------------------------------------------------------------

interface Look {
  head: HeadO;
  tip: number;
}

/** Face and feelers for an act (front / side views). */
function lookOf(p: Pose, walking: boolean): Look {
  const st = p.step % 4;
  const act = p.act;
  const blink = p.blink ? (p.blinkClosed ? 'none' : 'blink') : 'open';
  const sway = walking ? (st === 1 || st === 3 ? 1 : 0) : p.breath ? 1 : 0;
  const base: HeadO = { eyes: blink, ant: 'normal', sway, cheek: 1 };
  if (p.lookUp) return { head: { ...base, eyes: 'up', ant: 'back', sway: 0 }, tip: -1 };
  switch (act) {
    case 'surprised':
      return { head: { eyes: 'wide', ant: 'up', cheek: 1, shortUp: true, mouth: 'o' }, tip: 0 };
    case 'shock':
    case 'shock_pack':
      return { head: { eyes: 'flash', ant: 'up', cheek: 2, shortUp: true, mouth: 'o' }, tip: 0 };
    case 'hurt':
      return { head: { eyes: 'hurt', ant: 'droop', cheek: 0 }, tip: 1 };
    case 'happy':
      return { head: { eyes: 'happy', ant: 'happy', cheek: 2, shortUp: true, mouth: 'smile' }, tip: 0 };
    case 'glow':
      return { head: { eyes: p.ph === 1 ? 'flash' : 'wide', ant: 'perk', cheek: 1, shortUp: true }, tip: 0 };
    case 'fallen':
      return { head: { eyes: 'sad', ant: 'droop', cheek: 0 }, tip: 0 };
    case 'eat':
      return { head: { eyes: p.ph ? 'happy' : 'down', ant: 'perk', cheek: p.ph ? 2 : 1, mouth: p.ph ? 'munch' : '' }, tip: p.ph ? 0 : 1 };
    case 'crouch_hand':
      return { head: { eyes: 'soft', ant: 'normal', cheek: 1 }, tip: 1 };
    case 'handshake':
      return { head: { eyes: 'happy', ant: 'perk', cheek: 2, shortUp: true }, tip: 0 };
    case 'pose':
      return { head: { eyes: p.ph === 1 ? 'wide' : 'happy', ant: 'up', cheek: 2, shortUp: true, mouth: 'smile' }, tip: 0 };
    case 'wave':
      return { head: { ...base, eyes: 'open', ant: 'perk', sway: 0, shortUp: true, mouth: 'smile' }, tip: 0 };
    case 'point':
      return { head: { ...base, eyes: 'up', ant: 'perk', sway: 0, shortUp: true }, tip: 0 };
    case 'flip':
      return { head: { ...base, eyes: p.ph === 1 ? 'happy' : 'open', ant: p.ph === 1 ? 'happy' : 'perk', sway: 0, shortUp: true, mouth: p.ph === 1 ? 'smile' : 'o' }, tip: 0 };
    case 'flip_hold':
      return { head: { ...base, eyes: 'open', ant: 'normal', sway: 0, mouth: 'smile' }, tip: 0 };
    case 'hold':
    case 'hold_net':
      return { head: { ...base, eyes: 'open', ant: 'perk', sway: 0, shortUp: true, mouth: 'smile' }, tip: 0 };
    case 'bow_small':
    case 'bow30':
      return { head: { ...base, eyes: 'down', ant: 'fwd', sway: 0 }, tip: 1 };
    case 'washa':
      return { head: { ...base, eyes: 'down', sway: p.ph ? 1 : 0 }, tip: 0 };
    default:
      return { head: base, tip: 0 };
  }
}

function front(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const u = p.bob - p.breath;
  const act = p.act;
  const lk = lookOf(p, walking);
  const crouch = act === 'crouch_hand' ? 3 : 0;
  const low = act === 'hurt' ? 1 : 0;
  const by = 10 + u + crouch + low;
  const hy = 3 + u + crouch + low + (act === 'bow_small' || act === 'bow30' ? 1 : 0);
  const fsw = walking ? (st === 1 ? -1 : st === 3 ? 1 : 0) : 0;
  fanFront(f, by, fsw);
  legs(f, p, by - crouch, 'front', crouch);
  if (crouch) {
    // knees out: the thighs show beside the tummy
    f.part('leg', { shade: 'rb', light: 't' });
    f.rect(3, by + 9, 2, 2).rect(11, by + 9, 2, 2);
  }
  const washa = act === 'washa' ? 1 + (p.ph % 2) : 0;
  bodyFront(f, by, washa, low);
  headFront(f, hy, lk.head, lk.tip);
  // arms (after the head: raised hands pass in front of it)
  const sy = by + 3;
  const L = (hx: number, hy2: number) => arm(f, 2, sy, hx, hy2);
  const R = (hx: number, hy2: number) => arm(f, 13, sy, hx, hy2, -1);
  const swing = walking ? (st === 1 ? 1 : st === 3 ? -1 : 0) : 0;
  const hangL = () => L(-1, sy + 3 + swing);
  const hangR = () => R(15, sy + 3 - swing);
  switch (act) {
    case 'pose': {
      const up = p.ph === 1 ? 1 : 0;
      L(-2, sy - 5 - up);
      R(16, sy - 5 - up);
      break;
    }
    case 'wave': {
      hangL();
      const hand: [number, number][] = [[15, sy - 5], [16, sy - 7], [16, sy - 3]];
      R(hand[p.ph % 3][0], hand[p.ph % 3][1]);
      break;
    }
    case 'point':
      // pointing north-east (the mall)
      hangL();
      R(16, sy - 6);
      break;
    case 'flip': {
      // talking with one hand up (なあ、聞いてや); ph1 tips it forward, ph2 up again
      hangL();
      const hand: [number, number][] = [[15, sy - 4], [15, sy - 1], [15, sy - 5]];
      R(hand[p.ph % 3][0], hand[p.ph % 3][1]);
      break;
    }
    case 'flip_hold':
      // explaining: both hands up in front of the tummy
      L(3, sy + 1);
      R(10, sy);
      break;
    case 'hold':
    case 'shock_pack':
      pack(f, 4, sy + 2);
      L(2, sy + 3);
      R(12, sy + 3);
      break;
    case 'eat':
      if (p.ph) {
        // the pack up at his mouth, a noodle hanging
        pack(f, 4, sy - 2, true);
        L(2, sy - 1);
        R(12, sy - 1);
        f.part('noodle', { flat: true, rim: false });
        f.t(0).px(7, hy + 8).t(null);
      } else {
        pack(f, 4, sy + 2, true);
        L(2, sy + 3);
        R(12, sy + 3);
      }
      break;
    case 'surprised':
    case 'shock':
      L(-2, sy - 3);
      R(16, sy - 3);
      break;
    case 'happy':
      L(-2, sy - 1);
      R(16, sy - 1);
      break;
    case 'hold_net':
      // both hands up on the pole at his right (the pole is composited: withNet)
      hangL();
      R(14, sy);
      arm(f, 13, sy - 1, 14, sy - 5, 0);
      break;
    case 'crouch_hand':
      // squatting, one hand held out low toward whoever he came for
      hangL();
      R(16, sy + 2);
      break;
    case 'handshake':
      hangL();
      R(16, sy + 1);
      break;
    default:
      hangL();
      hangR();
  }
  if (act === 'shock' || act === 'shock_pack' || (act === 'glow' && p.ph === 1)) flashLines(f, hy, act === 'glow');
}

/** Three short rays off each side of the head (the ぱっ of the flash). No outline. */
function flashLines(f: Fig, hy: number, soft: boolean) {
  f.after((pc) => {
    const c = soft ? '#FFE7A3' : '#FFF6D8';
    const y = hy + 5;
    for (const [x, yy] of [[OX - 1, y - 3], [OX - 2, y - 4], [OX - 1, y + 1], [OX - 2, y + 1], [OX + 16, y - 3], [OX + 17, y - 4], [OX + 16, y + 1], [OX + 17, y + 1]] as [number, number][]) {
      if (!(pc.get(x, yy) >>> 24)) pc.set(x, yy, c);
    }
  });
}

function back(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const u = p.bob - p.breath;
  const act = p.act;
  const crouch = act === 'crouch_hand' ? 3 : 0;
  const by = 10 + u + crouch;
  const hy = 3 + u + crouch + (p.lookUp ? 1 : 0);
  const fsw = walking ? (st === 1 ? 1 : st === 3 ? -1 : 0) : 0;
  const swing = walking ? (st === 1 ? -1 : st === 3 ? 1 : 0) : 0;
  legs(f, p, by - crouch, 'front', crouch);
  const sy = by + 2;
  const banzai = act === 'zipper';
  // arms behind the shell hang at his sides
  if (!banzai) {
    if (act === 'crouch_hand') {
      arm(f, 2, sy + 1, 0, sy + 4, -1);
      arm(f, 13, sy + 1, 14, sy + 5, -1);
    } else {
      arm(f, 2, sy + 1, -1, sy + 4 + swing, -1);
      arm(f, 13, sy + 1, 15, sy + 4 - swing, -1);
    }
  }
  const sway = walking ? (st === 1 || st === 3 ? 1 : 0) : p.breath ? 1 : 0;
  headBack(f, hy, { eyes: 'open', ant: banzai ? 'up' : p.lookUp ? 'back' : 'normal', sway }, p.lookUp ? -1 : 0);
  bodyBack(f, by);
  fanBack(f, by, fsw);
  if (banzai) {
    // ばんざい: both arms straight up
    arm(f, 2, sy, -1, sy - 8);
    arm(f, 13, sy, 15, sy - 8, -1);
  }
}

function side(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const u = p.bob - p.breath;
  const act = p.act;
  const lk = lookOf(p, walking);
  const crouch = act === 'crouch_hand' ? 3 : 0;
  const low = act === 'hurt' ? 1 : 0;
  const by = 10 + u + crouch + low;
  const hy = 3 + u + crouch + low + (act === 'bow_small' ? 1 : 0);
  const hx = act === 'bow_small' || act === 'crouch_hand' ? -1 : 0;
  const fsw = walking ? (st === 1 ? 1 : st === 3 ? -1 : 0) : 0;
  const swing = walking ? (st === 1 ? 1 : st === 3 ? -1 : 0) : 0;
  const sy = by + 3;
  // far arm peeks out behind the back on the swing
  arm(f, 10, sy, 11 + swing, sy + 3, -1);
  fanSide(f, by, fsw);
  legs(f, p, by - crouch, 'side', crouch);
  const washa = act === 'washa' ? 1 + (p.ph % 2) : 0;
  bodySide(f, by, washa, low);
  f.offset(OX + hx, f.oy);
  headSide(f, hy, lk.head, lk.tip);
  f.offset(OX, f.oy);
  // the near arm
  const A = (x: number, y: number) => arm(f, 4, sy, x, y);
  switch (act) {
    case 'wave': {
      const hand: [number, number][] = [[0, sy - 6], [-1, sy - 7], [-1, sy - 3]];
      A(hand[p.ph % 3][0], hand[p.ph % 3][1]);
      break;
    }
    case 'point':
      A(-1, sy - 5);
      break;
    case 'flip':
      A(0, sy - 4);
      break;
    case 'flip_hold':
      A(-1, sy);
      break;
    case 'hold':
    case 'shock_pack':
      pack(f, -2, sy + 1);
      A(0, sy + 2);
      break;
    case 'eat':
      if (p.ph) {
        pack(f, -2, sy - 2, true);
        A(0, sy - 1);
        f.part('noodle', { flat: true, rim: false });
        f.t(0).px(1, hy + 8).t(null);
      } else {
        pack(f, -2, sy + 1, true);
        A(0, sy + 2);
      }
      break;
    case 'hold_net':
      A(0, sy);
      arm(f, 4, sy - 1, 0, sy - 5);
      break;
    case 'surprised':
    case 'shock':
      A(0, sy - 4);
      break;
    case 'happy':
      A(0, sy - 2);
      break;
    case 'crouch_hand':
      // squatting, the hand held out low in front
      A(-2, sy + 2);
      break;
    case 'handshake':
      A(-2, sy);
      break;
    case 'pose':
      A(0, sy - 7);
      break;
    default:
      A(2 - swing, sy + 3);
  }
  if (act === 'shock' || act === 'shock_pack') flashLines(f, hy, false);
}

/**
 * Lying on his back (belly up, 20×12 in the frame's bottom rows): the head
 * on the left, the tail fan on the right, the little legs up in the air
 * paddling slowly (ph 0/1). Hungry, not hurt.
 */
function fallen(f: Fig, p: Pose) {
  f.offset(0, 0);
  const ph = p.ph % 2;
  const g = H - 1;
  // the tail fan on the ground at the right
  f.part('shellD', { shade: 'rb', light: 't' });
  f.poly([[14.5, g - 4.5], [19.6, g - 5.5 + ph], [19.6, g + 0.6], [14.5, g + 0.6]]);
  // the armoured hull underneath, rocking a little
  f.part('shell', { shade: 'rb', light: 't', inner: false });
  f.ell(10.5, g - 2.4, 6.6, 2.9);
  for (const x of [7, 9, 11, 13, 15]) for (let y = g - 1; y <= g; y++) if (f.filled(x, y)) f.retone(x, y, -1);
  // the pale belly turned up to the sky
  f.part('belly', { shade: 'rb', light: 'tl', inner: false });
  f.ell(10.5, g - 4.4, 5.8, 1.9);
  // the little legs up in the air, paddling slowly (two sets take turns)
  f.part('leg', { shade: 'rb', light: 't' });
  [8, 10.5, 13, 15].forEach((x, i) => {
    const up = (i + ph) % 2 === 0 ? 2 : 1;
    f.vl(Math.round(x), g - 6 - up, g - 6);
  });
  // the head at the left end, face up, one big eye looking at the sky
  f.part('shell', { shade: 'rb', light: 't' });
  f.ell(4.2, g - 3, 3.8, 3.3);
  f.retone(7, g - 4, -2).retone(8, g - 3, -2).retone(8, g - 2, -2);
  f.part('eye', { flat: true, rim: false });
  f.rows(2, g - 5, ['.##', '###', '##.']);
  f.part('eyeS', { flat: true, rim: false });
  f.px(2, g - 2);
  f.part('glint', { flat: true, rim: false });
  f.px(3, g - 5 + ph);
  f.part('cheek', { flat: true, rim: false });
  f.px(5, g - 2);
  // the arms flopped up over the chest
  f.part('leg', { shade: 'rb', light: 't' });
  f.px(6, g - 6).px(6, g - 7).px(5 + ph, g - 8);
  // the feelers, limp on the ground
  f.part('ant', { flat: true, rim: false, ol: false });
  f.px(1, g - 6).px(0, g - 5).px(0, g - 4).px(0, g - 3);
  f.px(2, g - 7).px(1, g - 8).px(0, g - 8 + ph);
}

/** Deep bow toward the viewer: the head tips right down, the chest plates show above it. */
function bowPose(f: Fig, p: Pose) {
  const d = p.ph;
  fanFront(f, 10);
  legs(f, p, 10, 'front');
  f.part('shell', { shade: 'rb', light: 't', inner: false });
  f.ell(8, 15.5, 6, 5.8);
  platesBack(f, 10 + d);
  arm(f, 3, 12, 2, 16);
  arm(f, 12, 12, 13, 16, -1);
  // the head, low and tipped: crown, the tops of the eyes, feelers pointing down
  const hy = 7 + d * 2;
  headFront(f, hy, { eyes: 'down', ant: 'fwd' }, 2);
}

function draw(f: Fig, p: Pose) {
  // the pose hops: the whole figure leaves the ground for one frame
  f.offset(OX, p.act === 'pose' && p.ph === 1 ? -2 : 0);
  if (p.act === 'fallen') return fallen(f, p);
  if (p.act === 'bow' || p.act === 'bow_deep') return bowPose(f, p);
  if (p.act === 'zipper') return back(f, p);
  if (p.view === 'down') front(f, p);
  else if (p.view === 'up') back(f, p);
  else side(f, p);
}

// idle: breathing, the feelers bob; now and then the little legs wiggle
// (わしゃっ) and he waves at nobody in particular
const IDLE: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 2),
  { act: 'washa', ph: 0 }, { act: 'washa', ph: 1 }, { act: 'washa', ph: 0 }, { act: 'washa', ph: 1 },
  { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1, blink: true },
  { act: 'wave', ph: 0 }, { act: 'wave', ph: 1 }, { act: 'wave', ph: 2 }, { act: 'wave', ph: 1 },
  { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 },
];
const IDLE_UP: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 3),
  { act: 'washa', ph: 0 }, { act: 'washa', ph: 1 }, { breath: 0 }, { breath: 1 },
];

export const KANENARI_SPEC: SpriteSpec = {
  id: 'kanenari',
  w: 20,
  h: H,
  mats: KANENARI_MATS,
  draw,
  walkFrameMs: 150,
  walkBob: [0, -1, 0, -1],
  idle: { down: IDLE, left: IDLE, right: IDLE, up: IDLE_UP },
  extras: {
    // the names the events use (カネナリくん's), redrawn as グソっ君's gestures:
    // flip = one hand up, talking; flip_hold = explaining with both hands
    flip: { dirs: ['down'] },
    flip_hold: { dirs: ['down', 'left', 'right'] },
    hold: { dirs: ['down', 'left', 'right'] },
    pose: { dirs: ['down'], p: { ph: 2 } },
    point: { dirs: ['down', 'left', 'right'] },
    wave: { dirs: ['down', 'left', 'right'] },
    surprised: { dirs: ['down', 'left', 'right'], p: { bob: -1 } },
    hurt: { dirs: ['down', 'left', 'right'] },
    happy: { dirs: ['down', 'left', 'right'] },
    glow: { dirs: ['down'] },
    // zipper = ばんざい from behind
    zipper: { dirs: ['up'] },
    // chapter 2 (52 10.2): the net held up like a flag, the small bow to the sunrise
    hold_net: { dirs: ['down', 'left', 'right'] },
    bow_small: { dirs: ['down', 'left', 'right'] },
    // グソっ君 (04_gusokkun_plan 7)
    fallen: { dirs: 'all' },
    eat: { dirs: ['down', 'left', 'right'] },
    shock: { dirs: ['down', 'left', 'right'], p: { bob: -1 } },
    shock_pack: { dirs: ['down', 'left', 'right'], p: { bob: -1 } },
    crouch_hand: { dirs: 'all' },
    handshake: { dirs: ['down', 'left', 'right'] },
  },
  anims: {
    bow_small: { frames: [{ act: '' }, { act: 'bow_small' }, { act: 'bow_small' }, { act: '' }], ms: [120, 700, 300, 200], loop: false, dirs: ['down', 'left', 'right'] },
    // stand → 30° → deep → 90° held → back up through the same beats
    bow: {
      frames: [{ act: '' }, { act: 'bow30' }, { ph: 0 }, { ph: 1 }, { ph: 0 }, { act: 'bow30' }, { act: '' }],
      ms: [80, 90, 100, 520, 100, 90, 120],
      loop: false,
    },
    wave: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 1 }], ms: 150, dirs: ['down', 'left', 'right'] },
    // 複眼がきらっと光る: two flashes of the glint (the flash frames add rays)
    glow: {
      frames: [{ act: 'glow' }, { act: 'glow', ph: 1 }, { act: 'glow' }, { act: 'glow', ph: 1 }, { act: 'glow' }, { act: '' }],
      ms: [120, 180, 260, 180, 300, 300],
      loop: false,
    },
    // crouch (anticipation) → hop with the arms flung up → land, arms up
    pose: { frames: [{ act: '', bob: 1 }, { act: 'pose', ph: 1, bob: -1 }, { act: 'pose', ph: 2 }], ms: [90, 130, 600], loop: false },
    // talking with a hand: up (flip) → 'flip_turn' turns it over and back
    flip: { frames: [{ act: 'flip_hold' }, { act: 'flip' }], ms: [110, 400], loop: false },
    flip_turn: { frames: [{ act: 'flip' }, { act: 'flip', ph: 1 }, { act: 'flip', ph: 2 }], ms: [120, 180, 600], loop: false },
    // lying on his back, the little legs paddling slowly
    fallen: { frames: [{ ph: 0 }, { ph: 1 }], ms: 520, dirs: 'all' },
    // eating from the pack: hold → up to the mouth (munch)
    eat: { frames: [{ ph: 0 }, { ph: 1 }], ms: [420, 420], dirs: ['down', 'left', 'right'] },
    washa: { frames: [{ ph: 0 }, { ph: 1 }], ms: 90, dirs: ['down', 'left', 'right', 'up'] },
  },
  shadow: 12,
  keep: KANENARI_KEEP,
};

/**
 * Where a flip board (24×16) would sit over the raised hand, relative to
 * the feet (kept for callers that still draw one: gallery / battle). グソっ君
 * talks with his mouth now; the 'flip' extra is the hand-up gesture only.
 */
export const FLIP_ANCHOR = { dx: -12, dy: -39 };

/**
 * hold_net (52 10.2): the pole of Minato's net run up through his hands at
 * his right, the net 16px above his feelers. The frame grows 18px taller
 * (feet still at the bottom centre). `x` = the pole's column, `lowY` = the
 * lower hand's row and `hiY` the upper hand's (frame coordinates).
 */
function withNet(frame: HTMLCanvasElement, x: number, lowY: number, hiY: number): HTMLCanvasElement {
  const up = 18;
  const p = new PixelCanvas(frame.width, frame.height + up);
  const top = 2;
  const hx = x - 3;
  p.art(
    ['..OOOO..', '.OhHHhO.', 'OhnnNnhO', 'OhnNnNhO', 'OhNnNNhO', '.OhhhdO.', '..OOOO..'],
    { O: '#5A3A2A', h: '#C8A06A', H: '#F6D98A', d: '#A8742A', n: '#F4F1E8', N: '#C8C2B4' },
    hx - 1,
    top - 1,
  );
  for (let y = top + 6; y <= lowY + up + 2; y++) {
    p.set(x, y, '#C8A06A');
    p.set(x - 1, y, y % 3 === 0 ? '#F6D98A' : '#5A3A2A');
    p.set(x + 1, y, '#5A3A2A');
  }
  const c = p.toCanvas();
  const g = c.getContext('2d')!;
  g.drawImage(frame, 0, up);
  // above his upper hand the pole passes in front of him again
  g.fillStyle = '#C8A06A';
  g.fillRect(x, top + 6, 1, hiY + up - (top + 6));
  g.fillStyle = '#5A3A2A';
  g.fillRect(x + 1, top + 6, 1, hiY + up - (top + 6));
  return c;
}

function buildKanenari(): CharSprite {
  const s = buildSprite(KANENARI_SPEC);
  // frames were cropped to the headroom they use: declared row 0 is at `sh`
  const hn = s.extraDir!.hold_net!;
  const sh = hn.down!.height - H;
  const down = withNet(hn.down!, OX + 14, sh + 12 + 1, sh + 12 - 5);
  const left = withNet(hn.left!, OX + 1, sh + 12, sh + 12 - 5);
  const right = withNet(hn.right!, hn.right!.width - 1 - (OX + 1), sh + 12, sh + 12 - 5);
  s.extraDir!.hold_net = { down, left, right, up: down };
  s.extra!.hold_net = down;
  // the raw gesture for callers that composite a board of their own
  s.extra!.flip_raw = s.extra!.flip;
  return s;
}

registerChar('kanenari', buildKanenari);
registerChar('npc_kanenari', () => ({ ...charSprite('kanenari'), id: 'npc_kanenari' }));
