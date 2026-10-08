// グソっ君 (id 'kanenari', ★2026-09-29 依頼主の指示で カネナリくん→グソっ君。IDは据え置き。
// ★2026-10-08 依頼主の手本の絵に合わせて 描き直し):
// a round, cuddly giant isopod (オオグソクムシ) who stands on two legs. All of
// him is a warm ochre with dark-brown lines: a white headband (はちまき) round
// his brow, big round black eyes with one white glint each, pink cheeks, and
// two long tusk-like mouthparts hanging from under his nose with pointed
// tips. Little ear-like plates stick out at the sides of his head (they show
// how he feels: out, perked up, or drooping). His chest and tummy are
// striped with segments; at both sides of his body the armour plates overlap
// like scales and poke out past his outline (they flutter: わしゃっ). Two
// segmented arms end in two-fingered pincers, two stout legs in three toes,
// and a striped fan tail hangs behind.
// Canvas 20×26 (art in the 16px box at +2).

import { flat, mat, type Fig, type Mats } from '../fig';
import { buildSprite, rep, type IdleKey, type Pose, type SpriteSpec } from '../rig';
import { charSprite, registerChar, type CharSprite } from '../registry';
import { PixelCanvas } from '../../../engine/pixel';

// 30_level_art 9.2 (グソっ君): ochre shell, burnt shade, dark-brown line
export const KANENARI_KEEP = ['#D49A5C', '#A8693A', '#EBBF86', '#F0CB98'];
export const KANENARI_MATS: Mats = {
  shell: mat('#D49A5C', { shade: '#A8693A', light: '#EBBF86', dark: '#5A3A2A', orim: 'hi' }),
  // the side plates, the fan tail and the far limbs, one step back
  shellD: mat('#A8693A', { shade: '#8A5A3A', light: '#D49A5C', dark: '#5A3A2A', orim: 'hi' }),
  belly: mat('#EBBF86', { shade: '#D49A5C', light: '#F0CB98', dark: '#8A5A3A' }),
  leg: mat('#D49A5C', { shade: '#A8693A', light: '#EBBF86', dark: '#5A3A2A', orim: 'hi' }),
  // the arms, a step paler than the shell so they read over it and the plates
  arm: mat('#EBBF86', { shade: '#D49A5C', light: '#F0CB98', dark: '#5A3A2A', orim: 'hi' }),
  tusk: mat('#F0CB98', { shade: '#D49A5C', light: '#FBF3DC', dark: '#5A3A2A' }),
  band: mat('#FBF3DC', { shade: '#E8D9B5', light: '#FFF6D8', dark: '#8A5A3A' }),
  eye: flat('#2A2440'),
  eyeS: flat('#5A3A2A'),
  glint: flat('#FFF6D8'),
  flash: flat('#FFE7A3'),
  cheek: flat('#F08A7A'),
  mouth: flat('#2A2440'),
  // the yakisoba pack: clear lid over a white tray, sauced noodles, a red band
  lid: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  noodle: mat('#C8A06A', { shade: '#8A5A3A', light: '#F6D98A', dark: '#5A3A2A' }),
  band2: flat('#E84E3C'),
  nori: flat('#5FA85A'),
};

const H = 26;
/** Frames are 20px wide; art is authored in the 16px box at +2. */
const OX = 2;

// ---- ear plates (they carry his mood, as the feelers did) ------------------------------

type Ant = 'normal' | 'up' | 'droop' | 'back' | 'happy' | 'fwd' | 'perk' | 'lean';

/** Left ear plate, relative to its root at the head's edge (x → right, y → down). */
const EAR: Record<'out' | 'up' | 'down', [number, number][]> = {
  out: [[-1, 0], [-1, 1], [-2, 1], [-2, 2]],
  up: [[-1, 0], [-1, -1], [-2, -1], [-2, -2]],
  down: [[-1, 0], [-1, 1], [-1, 2], [-2, 2]],
};
function earOf(a: Ant): 'out' | 'up' | 'down' {
  if (a === 'up' || a === 'perk' || a === 'happy') return 'up';
  if (a === 'droop' || a === 'fwd') return 'down';
  return 'out';
}

/** One ear plate from its root (x, y); `dir` −1 = sticks out to the left. */
function earAt(f: Fig, x: number, y: number, mode: Ant, dir: -1 | 1, sway = 0) {
  f.part('shellD', { shade: 'rb', light: 't' });
  EAR[earOf(mode)].forEach(([dx, dy], i) => f.px(x + (dir < 0 ? dx : -dx), y + dy + (i >= 3 ? sway : 0)));
}

// ---- the head --------------------------------------------------------------------------

type Eyes = 'open' | 'blink' | 'hurt' | 'happy' | 'flash' | 'wide' | 'soft' | 'sad' | 'down' | 'up' | 'none';

interface HeadO {
  eyes: Eyes;
  ant: Ant;
  sway?: number;
  cheek?: number;
  mouth?: 'smile' | 'o' | 'munch' | '';
  /** (kept for the callers: the headband's ends perk up a pixel) */
  shortUp?: boolean;
}

/** One big round eye, 3×3, its top-left at (x, y); the glint at the upper right. */
function eyeFront(f: Fig, x: number, y: number, e: Eyes, glintRight: boolean) {
  f.part('eye', { flat: true, rim: false });
  if (e === 'hurt') {
    const rows = glintRight ? ['#..', '.##', '#..'] : ['..#', '##.', '..#'];
    f.rows(x, y, rows);
    return;
  }
  if (e === 'happy') {
    f.rows(x, y + 1, ['.#.', '#.#']);
    return;
  }
  if (e === 'blink' || e === 'none') {
    f.hl(x, x + 2, y + 2);
    if (e === 'blink') f.px(x + 1, y + 1);
    return;
  }
  if (e === 'sad' || e === 'soft') {
    // a lid of shell over the top: the eye rests low
    f.hl(x, x + 2, y + 1).hl(x, x + 2, y + 2);
    f.part('eyeS', { flat: true, rim: false });
    f.px(x, y + 2).px(x + 2, y + 2);
    f.part('glint', { flat: true, rim: false });
    f.px(x + (e === 'soft' ? 1 : glintRight ? 2 : 0), y + (e === 'soft' ? 1 : 2));
    return;
  }
  f.rect(x, y, 3, 3);
  f.part('eyeS', { flat: true, rim: false });
  f.px(x, y + 2).px(x + 2, y + 2);
  f.part(e === 'flash' ? 'flash' : 'glint', { flat: true, rim: false });
  const gx = glintRight ? x + 1 : x + 1;
  if (e === 'flash' || e === 'wide') f.rect(x, y, 2, 2);
  else if (e === 'up') f.px(gx, y);
  else if (e === 'down') f.px(gx, y + 1);
  else f.px(gx, y);
}

/** The headband over the rows the head already covers (a stripe lower at the left). */
function bandOver(f: Fig, rowsAt: (x: number) => number, x0 = -2, x1 = 17) {
  f.part('band', { flat: true, rim: false });
  for (let x = x0; x <= x1; x++) {
    const r = rowsAt(x);
    if (r === -999) continue;
    for (const [dy, t] of [[0, 1], [1, 0]] as const)
      if (f.filled(x, r + dy)) f.t(x >= 12 ? (dy ? -1 : 0) : t).px(x, r + dy);
  }
  f.t(null);
}

/**
 * Head from the front, top row at y: a 13×10 bun of a head (x2..14) with the
 * headband over the brow, the big eyes under it, the cheeks and a little
 * nose line. The tusks are drawn by tusksFront (they hang over the chest).
 * `tip`: the head tipped forward (+, we see more crown) or back (−).
 */
function headFront(f: Fig, y: number, o: HeadO, tip = 0) {
  const ery = y + 5 + (tip > 0 ? 1 : 0);
  earAt(f, 2, ery, o.ant, -1, o.sway ?? 0);
  earAt(f, 13, ery, o.ant, 1, o.sway ?? 0);
  f.part('shell', { shade: 'rb', light: 't' });
  f.ell(7.5, y + 4.6, 6.4, 4.7);
  f.retone(4, y + 1, 1).retone(3, y + 2, 1);
  if (tip >= 2) {
    // a deep bow: the crown and the band; only the tops of the eyes show
    bandOver(f, (x) => y + 3 + (x <= 5 ? 1 : 0));
    f.part('eye', { flat: true, rim: false });
    f.hl(3, 5, y + 7).hl(10, 12, y + 7);
    return;
  }
  const lift = tip < 0 ? -1 : 0;
  bandOver(f, (x) => y + 1 + lift + (x <= 5 ? 1 : 0) + (tip > 0 ? 1 : 0));
  const ey = y + 4 + tip + lift;
  eyeFront(f, 3, ey, o.eyes, true);
  eyeFront(f, 10, ey, o.eyes, false);
  // the little nose line between the eyes
  f.retone(6, ey + 3, -1).retone(7, ey + 2, -1).retone(8, ey + 2, -1).retone(9, ey + 3, -1);
  if (o.cheek) {
    f.part('cheek', { flat: true, rim: false });
    f.px(2, ey + 3).px(13, ey + 3);
    if (o.cheek > 1) f.px(3, ey + 3).px(12, ey + 3);
  }
  if (o.mouth) {
    f.part('mouth', { flat: true, rim: false });
    const my = ey + 4;
    if (o.mouth === 'o') f.px(7, my).px(8, my).px(7, my + 1).px(8, my + 1);
    else if (o.mouth === 'munch') f.px(7, my).px(8, my);
  }
}

/** A tusk (the long mouthparts): a pale line with its shadow on the right. */
function tusk(f: Fig, pts: [number, number][], shift = 0) {
  const mine = new Set(pts.map(([x, y]) => x * 100 + y));
  for (const [x, y] of pts) if (!mine.has((x + 1) * 100 + y) && f.filled(x + 1, y)) f.retone(x + 1, y, -2);
  const [lx, ly] = pts[pts.length - 1];
  if (f.filled(lx, ly + 1)) f.retone(lx, ly + 1, -1);
  f.part('tusk', { flat: true, shift, rim: false, ol: false });
  pts.forEach(([x, y], i) => f.t(i === pts.length - 1 ? -1 : i === 0 ? 0 : 1).px(x, y));
  f.t(null);
}

/** Both tusks from under the nose, front view; `y` = the head's top row. */
function tusksFront(f: Fig, y: number, tip = 0, spread = 0) {
  const r = y + 8 + tip;
  const s = spread;
  tusk(f, [[6, r], [6, r + 1], [5 - s, r + 2], [5 - s, r + 3], [5 - s, r + 4], [5 - s, r + 5]]);
  tusk(f, [[9, r], [9, r + 1], [10 + s, r + 2], [10 + s, r + 3], [10 + s, r + 4], [10 + s, r + 5]]);
}

/** Head from the side (facing left), top row at y: the eye near the front. */
function headSide(f: Fig, y: number, o: HeadO, tip = 0) {
  earAt(f, 11, y + 5 + (tip > 0 ? 1 : 0), o.ant, 1, o.sway ?? 0);
  f.part('shell', { shade: 'rb', light: 't' });
  f.ell(7.5, y + 4.6, 5.9, 4.7);
  f.retone(5, y + 1, 1).retone(4, y + 2, 1);
  const lift = tip < 0 ? -1 : 0;
  bandOver(f, (x) => y + 1 + lift + (x <= 4 ? 1 : 0) + (tip > 0 ? 1 : 0));
  if (tip >= 2) {
    f.part('eye', { flat: true, rim: false });
    f.hl(2, 4, y + 7);
    return;
  }
  const ey = y + 4 + tip + lift;
  const e = o.eyes;
  const ex = 2;
  if (e === 'hurt') {
    f.part('eye', { flat: true, rim: false });
    f.rows(ex, ey, ['#..', '.##', '#..']);
  } else if (e === 'happy') {
    f.part('eye', { flat: true, rim: false });
    f.rows(ex, ey + 1, ['.#.', '#.#']);
  } else if (e === 'blink' || e === 'none') {
    f.part('eye', { flat: true, rim: false });
    f.hl(ex, ex + 2, ey + 2);
  } else if (e === 'sad' || e === 'soft') {
    f.part('eye', { flat: true, rim: false });
    f.hl(ex, ex + 2, ey + 1).hl(ex, ex + 2, ey + 2);
    f.part('glint', { flat: true, rim: false });
    f.px(ex + 1, ey + (e === 'soft' ? 1 : 2));
  } else {
    f.part('eye', { flat: true, rim: false });
    f.rect(ex, ey, 3, 3);
    f.part('eyeS', { flat: true, rim: false });
    f.px(ex + 2, ey + 2);
    f.part(e === 'flash' ? 'flash' : 'glint', { flat: true, rim: false });
    if (e === 'flash' || e === 'wide') f.rect(ex, ey, 2, 2);
    else f.px(ex + 1, ey + (e === 'down' ? 1 : 0));
  }
  if (o.cheek) {
    f.part('cheek', { flat: true, rim: false });
    f.px(ex + 2, ey + 3);
    if (o.cheek > 1) f.px(ex + 3, ey + 3);
  }
  if (o.mouth === 'o' || o.mouth === 'munch') {
    f.part('mouth', { flat: true, rim: false });
    f.px(1, ey + 4);
    if (o.mouth === 'o') f.px(1, ey + 5);
  }
}

/** Tusks from the side: the far one a step back, the near one in front. */
function tusksSide(f: Fig, y: number, tip = 0, dx = 0) {
  const r = y + 8 + tip;
  tusk(f, [[4 + dx, r], [4 + dx, r + 1], [3 + dx, r + 2], [3 + dx, r + 3], [3 + dx, r + 4]], -1);
  tusk(f, [[2 + dx, r], [2 + dx, r + 1], [1 + dx, r + 2], [1 + dx, r + 3], [1 + dx, r + 4], [1 + dx, r + 5]]);
}

/** Head from behind: the round head plate, the headband all the way round, the ear plates. */
function headBack(f: Fig, y: number, o: HeadO, tip = 0) {
  earAt(f, 2, y + 5, o.ant, -1, o.sway ?? 0);
  earAt(f, 13, y + 5, o.ant, 1, o.sway ?? 0);
  f.part('shell', { shade: 'rb', light: 't' });
  f.ell(7.5, y + 4.6, 6.4, 4.7);
  f.retone(4, y + 1, 1).retone(3, y + 2, 1).retone(3, y + 3, 1);
  bandOver(f, (x) => y + 2 + (tip < 0 ? -1 : 0) + (x >= 10 ? 1 : 0));
}

// ---- body -------------------------------------------------------------------------------

/**
 * The armour plates at his sides, overlapping like scales and poking out
 * past the body (drawn behind it). `side`: which sides show. `washa` makes
 * every other plate flick out a pixel (わしゃっ).
 */
function scales(f: Fig, y: number, side: 'both' | 'left' | 'right', washa = 0, squash = 0, n = 5) {
  f.part('shellD', { flat: true, inner: false });
  for (let k = 0; k < n; k++) {
    const py = y + k * 2 + (k > 1 ? squash : 0);
    const w = washa && (k + washa) % 2 === 0 ? 1 : 0;
    if (side !== 'right') f.t(0).hl(0, 1, py).t(-1).hl(-1 - w, 1, py + 1);
    if (side !== 'left') f.t(-1).hl(14, 15, py).t(-2).hl(14, 16 + w, py + 1);
  }
  f.t(null);
}

/** Letters of the body pictures → material and tone. */
const BODY_MAP = {
  s: ['shell', 0], L: ['shell', 1], d: ['shell', -1], D: ['shell', -2],
  b: ['belly', 0], H: ['belly', 1], h: ['belly', -1],
} as const;

/** The body from the front (x 1..14): the egg with the paler striped tummy. */
const BODY_FRONT = [
  '....ssssss....',
  '..Lssssssssd..',
  '.LsHbbbbbbbsd.',
  '.Lshhhhhhhhsd.',
  'LsHbbbbbbbbbsd',
  'Lshhhhhhhhhhsd',
  'Lsbbbbbbbbbbsd',
  'Lshhhhhhhhhhdd',
  '.sbbbbbbbbbbd.',
  '.dshhhhhhhhdd.',
  '..ddsssssddd..',
];

function stamp(f: Fig, x: number, y: number, rows: readonly string[], squash = 0, at = 4) {
  // squash: the rows from `at` down drop by that many (the top half stays)
  rows.forEach((row, j) => {
    const yy = y + j + (j >= at ? squash : 0);
    f.rows(x, yy, [row], BODY_MAP as unknown as Record<string, [string, number]>);
    if (squash && j === at - 1) for (let k = 1; k <= squash; k++) f.rows(x, y + j + k, [row], BODY_MAP as unknown as Record<string, [string, number]>);
  });
}

/**
 * Front: an egg of a body with the paler striped tummy (the segments), the
 * side plates poking out behind it. `washa` flutters the plates (0/1/2).
 */
function bodyFront(f: Fig, y: number, washa = 0, squash = 0) {
  scales(f, y + 2, 'both', washa, squash, 4);
  f.part('shell', { flat: true, inner: false });
  stamp(f, 1, y, BODY_FRONT, squash);
}

/** Back: the plates stepping down. */
function bodyBack(f: Fig, y: number, squash = 0) {
  scales(f, y - 1, 'both', 0, squash, 6);
  platesBack(f, y, squash);
}

/**
 * The armour from behind (rows y−2 … y+10, over the lower half of the head):
 * plates each a lit band and a dark lower edge that dips in the middle (the
 * back is round).
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
  }
  f.t(null);
}

/** The body from the side (x 1..15): the striped tummy in front, the plates down his side and back. */
const BODY_SIDE = [
  '....ssssss.....',
  '..Lssssssssd...',
  '.HbbLssssssdd..',
  '.hhhsdddddddd..',
  'HbbbLsssssssdd.',
  'hhhhsdddddddd..',
  'HbbbLsssssssdd.',
  'hhhhsdddddddd..',
  '.bbbssssssssd..',
  '.hhhsddddddd...',
  '..ddsssssdd....',
];

/** Side (facing left): the striped tummy on the left, the plates poking out down the back. */
function bodySide(f: Fig, y: number, washa = 0, squash = 0) {
  f.part('shellD', { flat: true, inner: false });
  for (let k = 0; k < 4; k++) {
    const py = y + 2 + k * 2 + (k > 1 ? squash : 0);
    const w = washa && (k + washa) % 2 === 0 ? 1 : 0;
    f.t(0).hl(12, 14, py).t(-1).hl(12, 15 + w, py + 1);
  }
  f.t(null);
  f.part('shell', { flat: true, inner: false });
  stamp(f, 1, y, BODY_SIDE, squash);
}

// ---- tail fan, legs, arms --------------------------------------------------------------

/** The striped fan tail behind him, seen from the front: flaps flaring out under the body. */
function fanFront(f: Fig, y: number, sw = 0) {
  f.part('shellD', { shade: 'rb', light: 't' });
  f.poly([[4, y + 7], [1 + sw, 23.2], [2 + sw, 24.6], [5.5, 23.6]]);
  f.poly([[11, y + 7], [14 + sw, 23.2], [13 + sw, 24.6], [9.5, 23.6]]);
  f.poly([[6, y + 9], [9, y + 9], [8.6, 24.6], [6.4, 24.6]]);
  // the ribs of the fan
  f.retone(2 + sw, 23, -1).retone(3 + sw, 22, -1).retone(13 + sw, 23, -2).retone(12 + sw, 22, -2);
}

/**
 * Fan tail from behind, under the last plate: the tail plate between the
 * two paddles, every one ribbed (the stripes of the fan). `sw` sways the hem.
 */
const FAN_BACK = [
  '....hHhooood....',
  '..pphHdoodod=pp.',
  '.pPpPHhdoodo=pPp',
  'pPpp.hdodo=d.pPp',
  'p.p...hd=....p.p',
];
function fanBack(f: Fig, y: number, sw = 0) {
  f.part('shellD', { shade: '', light: '', inner: false });
  FAN_BACK.forEach((row, j) => {
    f.rows(j >= 2 ? sw : 0, y + 10 + j, [row.replace(/[hHod=]/g, '.')], { p: [null, 0], P: [null, -1] });
  });
  f.part('shell', { shade: '', light: '', inner: false, sepAll: true });
  FAN_BACK.forEach((row, j) => {
    f.rows(0, y + 10 + j, [row.replace(/[pP]/g, '.')], { h: [null, 0], H: [null, 1], o: [null, 0], d: [null, -1], '=': [null, -2] });
  });
}

/** Fan tail from the side: hanging behind (right), flaring at the hem, ribbed. */
function fanSide(f: Fig, y: number, sw = 0) {
  f.part('shellD', { shade: 'rb', light: 't' });
  f.poly([[10, y + 5], [14.5, y + 9], [15.6 + sw, 23.6], [12.5 + sw, 24.6], [9.5, 22]]);
  f.retone(13 + sw, 22, -1).retone(13 + sw, 21, -1).retone(14 + sw, 23, -2).retone(12, 19, -1);
}

/** Stout segmented legs with three-toed feet. Front/back: both; side: near and far. */
function legs(f: Fig, p: Pose, by: number, view: 'front' | 'side', crouch = 0) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const y = H - 2;
  const hip = by + 9;
  // one leg: a 2px column (lit | shade) with a knee line, the foot 2 rows
  const leg = (x: number, foot: number, bot: number, shift: number, toesLeft: boolean) => {
    f.part('leg', { flat: true, shift });
    for (let yy = hip; yy < bot; yy++) {
      const knee = yy === Math.round((hip + bot) / 2);
      f.t(knee ? -1 : 1).px(x, yy).t(knee ? -2 : 0).px(x + 1, yy);
    }
    // the foot: a pad and three toes (the gaps fill with the outline)
    f.t(0).hl(x - (toesLeft ? 1 : 0), x + 1 + (toesLeft ? 0 : 1), bot);
    for (const k of [0, 2, 4]) f.t(-1).px(foot + k, bot + 1);
    f.t(null);
  };
  if (view === 'front') {
    const l = st === 1 ? 1 : 0;
    const r = st === 3 ? 1 : 0;
    const spread = crouch ? 1 : 0;
    leg(5 - spread, 2 - spread * 2, y - l, 0, true);
    leg(9 + spread, 9 + spread * 2, y - r, -1, false);
  } else {
    const a = st === 1 ? -1 : st === 3 ? 1 : 0;
    leg(8 - a, 6 - a, y, -1, true);
    leg(6 + a, 4 + a, y, 0, true);
  }
}

const ARM_MAP = { a: ['arm', 1], A: ['arm', 0], c: ['arm', -1], C: ['arm', -2], D: ['shell', -2] } as const;
/** The left arm hanging at his side (x −1..2 from the shoulder row): two segments and a pincer. */
const ARM_HANG = ['..aA', '.aAD', '.aAD', '.ccD', '.aAD', '.aA.', 'aAA.', 'a.A.'];
/** The near arm from the side (x 4..7). */
const ARM_SIDE = ['.aAD', '.aAD', '.ccD', '.aAD', '.aA.', 'aAA.', 'a.A.'];

/** A hanging arm: 'L'/'R' from the front or back, 'S' the near one from the side. */
function hangArm(f: Fig, which: 'L' | 'R' | 'S', y: number, swing = 0, shift = 0) {
  f.part('arm', { flat: true, shift });
  const map = ARM_MAP as unknown as Record<string, [string, number]>;
  if (which === 'S') {
    f.rows(4 + swing, y, ARM_SIDE.slice(0, 4), map);
    f.rows(4 + swing * 2, y + 4, ARM_SIDE.slice(4), map);
    return;
  }
  const rows = which === 'L' ? ARM_HANG : ARM_HANG.map((r) => [...r].reverse().join('').replace(/a/g, 'A').replace(/A(?=.)/, 'A'));
  const x = which === 'L' ? -1 : 13;
  f.rows(x, y, rows.slice(0, 5), map);
  f.rows(x + (which === 'L' ? -swing : swing) * 0, y + 5, rows.slice(5), map);
  void swing;
}

/** The two-fingered pincer at the end of an arm, pointing `d`, around (hx, hy). */
function clawPts(hx: number, hy: number, d: 'u' | 'd' | 'l' | 'r'): [number, number][] {
  const rows: Record<typeof d, [string[], number, number]> = {
    u: [['#.#', '###'], -1, -1],
    d: [['###', '#.#'], -1, 0],
    l: [['##', '.#', '##'], -1, -1],
    r: [['##', '#.', '##'], 0, -1],
  };
  const [rs, ox, oy] = rows[d];
  const out: [number, number][] = [];
  rs.forEach((row, j) => [...row].forEach((c, i) => c === '#' && out.push([hx + ox + i, hy + oy + j])));
  return out;
}

/**
 * A segmented arm from the shoulder (x0, y0) to a two-fingered pincer at
 * (hx, hy). The upper arm is 2px thick; the elbow is a darker segment line.
 * Where it lies over his body, the body round it takes a dark line, so the
 * arm reads over the tummy too.
 */
function arm(f: Fig, x0: number, y0: number, hx: number, hy: number, shift = 0) {
  const pts: [number, number][] = [];
  {
    let xa = Math.round(x0), ya = Math.round(y0);
    const xb = Math.round(hx), yb = Math.round(hy);
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
  const line = pts.length;
  // the upper arm a pixel thicker (toward his middle)
  const inward = x0 < 8 ? 1 : -1;
  const half = Math.max(1, Math.floor(line / 2));
  for (let i = 0; i < half; i++) pts.push([pts[i][0] + inward, pts[i][1]]);
  const ddx = hx - x0, ddy = hy - y0;
  const d: 'u' | 'd' | 'l' | 'r' = ddy < -2 && Math.abs(ddy) >= Math.abs(ddx) * 0.6 ? 'u' : Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? 'l' : 'r') : 'd';
  const claw = clawPts(hx, hy, d);
  const mine = new Set([...pts, ...claw].map(([x, y]) => x * 100 + y));
  for (const [x, y] of [...pts, ...claw])
    for (const [nx, ny] of [[x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1]] as [number, number][])
      if (!mine.has(nx * 100 + ny) && f.filled(nx, ny) && !(Math.abs(nx - x0) <= 1 && ny === y0)) f.retone(nx, ny, -2);
  f.part('arm', { flat: true, shift });
  pts.forEach(([x, y], i) => f.t(i < line ? 1 : 0).px(x, y));
  f.t(0);
  for (const [x, y] of claw) f.px(x, y);
  f.t(null);
  // the elbow
  if (line >= 4) {
    const [ex, ey] = pts[half];
    f.retone(ex, ey, -1);
  }
}

/** The yakisoba pack held in both hands (8×4), top-left at (x, y). */
function pack(f: Fig, x: number, y: number, open = false) {
  f.part('noodle', { shade: 'rb', light: 't' });
  f.rect(x, y + 1, 8, 3);
  f.part('nori', { flat: true, rim: false });
  f.px(x + 2, y + 1).px(x + 5, y + 2);
  f.part('band2', { flat: true, rim: false });
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
  const hy = 2 + u + crouch + low + (act === 'bow_small' || act === 'bow30' ? 1 : 0);
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
  if (lk.tip < 2) tusksFront(f, hy, Math.max(0, lk.tip), act === 'surprised' || act === 'shock' || act === 'shock_pack' ? 1 : 0);
  // arms (after the head: raised hands pass in front of it)
  const sy = by + 3;
  const L = (hx: number, hy2: number) => arm(f, 2, sy, hx, hy2);
  const R = (hx: number, hy2: number) => arm(f, 13, sy, hx, hy2, -1);
  const swing = walking ? (st === 1 ? 1 : st === 3 ? -1 : 0) : 0;
  const hangL = () => hangArm(f, 'L', by + 2 + (swing > 0 ? 1 : 0));
  const hangR = () => hangArm(f, 'R', by + 2 + (swing < 0 ? 1 : 0), 0, -1);
  switch (act) {
    case 'pose': {
      const up = p.ph === 1 ? 1 : 0;
      L(-1, sy - 8 - up);
      R(16, sy - 8 - up);
      break;
    }
    case 'wave': {
      hangL();
      const hand: [number, number][] = [[16, sy - 6], [16, sy - 8], [16, sy - 4]];
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
      L(-1, sy - 5);
      R(16, sy - 5);
      break;
    case 'happy':
      L(-1, sy - 3);
      R(16, sy - 3);
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
  const hy = 2 + u + crouch + (p.lookUp ? 1 : 0);
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
    }
  }
  const sway = walking ? (st === 1 || st === 3 ? 1 : 0) : p.breath ? 1 : 0;
  headBack(f, hy, { eyes: 'open', ant: banzai ? 'up' : p.lookUp ? 'back' : 'normal', sway }, p.lookUp ? -1 : 0);
  bodyBack(f, by);
  fanBack(f, by, fsw);
  if (!banzai && act !== 'crouch_hand') {
    hangArm(f, 'L', by + 2 + (swing > 0 ? 1 : 0), 0, -1);
    hangArm(f, 'R', by + 2 + (swing < 0 ? 1 : 0), 0, -1);
  }
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
  const hy = 2 + u + crouch + low + (act === 'bow_small' ? 1 : 0);
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
  if (lk.tip < 2) tusksSide(f, hy, Math.max(0, lk.tip));
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
      hangArm(f, 'S', by + 2, -swing);
  }
  if (act === 'shock' || act === 'shock_pack') flashLines(f, hy, false);
}

/**
 * Lying on his back (あおむけ), drawn as the front view: belly and face up to
 * the sky, the arms and the small legs out in the air, paddling slowly (ph
 * 0/1). buildKanenari() turns these frames a quarter round (head to the
 * right, lying on the ground). Hungry, not hurt.
 */
function fallen(f: Fig, p: Pose) {
  const ph = p.ph % 2;
  const by = 10;
  fanFront(f, by, ph ? 1 : 0);
  legs(f, { ...p, mode: 'extra' }, by, 'front');
  bodyFront(f, by);
  // the small legs out of the tummy's edges, taking turns
  f.part('leg', { shade: 'rb', light: 't' });
  for (const [i, r] of [[0, 3], [1, 5], [2, 7]] as const) {
    const up = (i + ph) % 2 === 0;
    f.hl(up ? 1 : 2, 3, by + r).hl(12, up ? 14 : 13, by + r);
  }
  headFront(f, 2, { eyes: ph ? 'open' : 'down', ant: 'droop', sway: ph }, 0);
  tusksFront(f, 2, 0, ph);
  const sy = by + 3;
  arm(f, 2, sy, -1, sy - 3 + ph);
  arm(f, 13, sy, 15, sy - 2 - ph, -1);
}

/**
 * A frame turned a quarter round clockwise (head to the right, the lit left
 * edge now on top), lying on the frame's bottom row.
 */
function lieDown(c: HTMLCanvasElement): HTMLCanvasElement {
  const w = c.width;
  const h = c.height;
  const src = c.getContext('2d')!.getImageData(0, 0, w, h);
  // rows of the turned picture = columns of the frame; drop the empty ones at the bottom
  const empty = (x: number) => ![...Array(h).keys()].some((y) => src.data[(y * w + x) * 4 + 3]);
  let hi = w - 1;
  while (hi > 0 && empty(hi)) hi--;
  const out = document.createElement('canvas');
  out.width = h;
  out.height = hi + 1;
  const g = out.getContext('2d')!;
  const dst = g.createImageData(out.width, out.height);
  for (let y = 0; y < h; y++)
    for (let x = 0; x <= hi; x++) {
      const i = (y * w + x) * 4;
      if (!src.data[i + 3]) continue;
      const j = (x * out.width + (h - 1 - y)) * 4;
      dst.data.set(src.data.subarray(i, i + 4), j);
    }
  g.putImageData(dst, 0, 0);
  return out;
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
  // あおむけ: the fallen frames are drawn standing and laid down here
  const turned = new Map<HTMLCanvasElement, HTMLCanvasElement>();
  const lie = (c: HTMLCanvasElement) => {
    let r = turned.get(c);
    if (!r) turned.set(c, (r = lieDown(c)));
    return r;
  };
  s.extra!.fallen = lie(s.extra!.fallen);
  const fd = s.extraDir!.fallen;
  if (fd) for (const d of Object.keys(fd) as (keyof typeof fd)[]) fd[d] = lie(fd[d]!);
  const fa = s.anims!.fallen;
  s.anims!.fallen = { ...fa, frames: fa.frames.map(lie) };
  const fad = s.animsDir?.fallen;
  if (fad) for (const d of Object.keys(fad) as (keyof typeof fad)[]) fad[d] = { ...fad[d]!, frames: fad[d]!.frames.map(lie) };
  return s;
}

registerChar('kanenari', buildKanenari);
registerChar('npc_kanenari', () => ({ ...charSprite('kanenari'), id: 'npc_kanenari' }));
