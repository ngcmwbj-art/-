// カネナリくん: the town's retired mascot suit. Brass bell head (the upper
// 12px) with dot eyes and cheeks, the clapper visible in the bell's mouth, a
// fluffy sunset-orange body with a dithered outline, a white "PR大使" sash
// (three red ticks) and a slightly open zipper on the back (pitch dark inside).
// Waddle walk with a 2px bounce; the bell sways a little and the clapper
// swings the other way. Canvas 16×26 (2px of headroom for the bounce).

import { flat, mat, type Fig, type Mats } from '../fig';
import { buildSprite, rep, type IdleKey, type Pose, type SpriteSpec } from '../rig';
import { charSprite, registerChar, type CharSprite } from '../registry';
import { C } from '../palette';
import { flipBoard, flipBoardEdge } from '../flip';
import { glowRing, GLOW_CENTER_DY } from '../glow';

// Colors follow the reference sprite of 30_level_art 9.2.
export const KANENARI_MATS: Mats = {
  brass: mat('#D9A441', { shade: '#A8742A', light: '#F6D98A', spec: '#FFF6D8', dark: '#8A5A3A', ol: '#5A3A2A' }),
  brassD: mat('#A8742A', { shade: '#8A5A3A', light: '#D9A441', dark: '#5A3A2A', ol: '#5A3A2A' }),
  brassG: mat('#F6D98A', { shade: '#D9A441', light: '#FFF6D8', spec: '#FFF6D8', dark: '#A8742A', ol: '#5A3A2A' }),
  bellIn: flat(C.ink),
  clapper: mat('#A8742A', { shade: '#8A5A3A', light: '#D9A441', dark: '#5A3A2A' }),
  fur: mat('#F2894B', { shade: '#C8643A', light: '#F7C27A', dark: '#A04E2E', orim: '#F7C27A', ol: '#2A2440', soft: true }),
  // arms and mittens: the same fur with a clean outline (only the body's
  // edge is dithered fluff — dithered arms read as chains)
  furA: mat('#F2894B', { shade: '#C8643A', light: '#F7C27A', dark: '#A04E2E', orim: '#F7C27A', ol: '#2A2440' }),
  furD: mat('#C8643A', { shade: '#A04E2E', light: '#F2894B', dark: '#8A2E3A', ol: '#2A2440' }),
  sash: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  red: flat('#E84E3C'),
  zip: flat('#C0C6CC'),
  zipD: flat('#9AA0A8'),
  void: flat(C.ink),
  eye: flat('#2A1E1A'),
  cheek: flat('#F08A7A'),
  board: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  kraft: mat('#E8D9B5', { shade: '#C8A06A', light: '#FBF3DC', dark: '#8A5A3A' }),
  boardE: flat('#C8C2B4'),
  ink: flat('#2A2440'),
};

const H = 26;
/** Standing y of the loop's top row. */
const TOP = 2;

const DOME = [
  '....######....',
  '...########...',
  '..##########..',
  '..##########..',
  '..##########..',
  '..##########..',
  '.############.',
  '.############.',
];

/**
 * Bell head. y0 = top of the loop. sway: -1/0/1 shears the dome top.
 * face: 'front' | 'side' | 'back'.
 */
function bell(f: Fig, y0: number, sway: number, face: 'front' | 'side' | 'back', p: Pose) {
  if (p.lookUp && face !== 'back') return bellTilted(f, y0, face, p);
  const x0 = 1;
  // hanging loop
  f.part('brassD', { shade: 'r', light: 't' });
  f.rows(x0 + 5 + sway, y0, ['.##.', '#..#']);
  // dome (one step brighter while it glows)
  f.part(p.act === 'glow' ? 'brassG' : 'brass', { shade: '', light: '' });
  for (let j = 0; j < DOME.length; j++) {
    const sh = j < 2 ? sway : 0;
    f.rows(x0 + sh, y0 + 2 + j, [DOME[j]]);
  }
  // metallic form shading (explicit; mirrored side views keep it symmetric enough)
  const L = face === 'back' ? 0 : 0;
  const d = (x: number, y: number, t: number) => f.retone(x0 + x, y0 + 2 + y, t);
  // right side falloff: a deep 3-step shadow so the bell keeps its value
  // range on dark (stage 2 / grey-scale) ground
  for (let j = 0; j < DOME.length; j++) {
    const r = DOME[j].lastIndexOf('#');
    const sh = j < 2 ? sway : 0;
    d(r + sh, j, j >= 2 ? -2 : -1);
    if (j >= 2) d(r - 1 + sh, j, -1);
    if (j >= 4) d(r - 2 + sh, j, -1);
  }
  // vertical highlight band on the left (2px from the third row) + spec
  for (let j = 1; j < DOME.length; j++) {
    const l = DOME[j].indexOf('#');
    const sh = j < 2 ? sway : 0;
    d(l + 1 + sh + L, j, 1);
    if (j >= 3) d(l + 2 + sh + L, j, j >= 5 ? 1 : 2);
  }
  d(5 + sway, 0, 1);
  f.retone(x0 + 4 + sway, y0 + 3, 2).retone(x0 + 3 + sway, y0 + 4, 2).retone(x0 + 3, y0 + 5, 1);
  // lip
  f.part('brassD', { shade: 'r', light: 't' });
  f.hl(x0, x0 + 13, y0 + 10);
  // mouth + clapper (swings against the sway)
  f.part('bellIn', { flat: true, rim: false });
  f.hl(x0 + 2, x0 + 11, y0 + 11);
  f.part('clapper', { shade: 'r', light: 'l' });
  const cx = x0 + 6 - sway;
  f.rect(cx, y0 + 11, 2, 2);
  // face
  if (face === 'front') {
    const ey = y0 + (p.lookUp ? 5 : 6) + (p.act === 'bow30' ? 2 : 0);
    f.part('eye', { flat: true, rim: false });
    if (p.act === 'hurt') f.px(x0 + 3, ey).px(x0 + 4, ey + 1).px(x0 + 10, ey).px(x0 + 9, ey + 1);
    else if (p.blink) f.px(x0 + 4, ey + 1).px(x0 + 9, ey + 1);
    else if (p.act === 'happy') f.px(x0 + 3, ey + 1).px(x0 + 4, ey).px(x0 + 5, ey + 1).px(x0 + 8, ey + 1).px(x0 + 9, ey).px(x0 + 10, ey + 1);
    else f.rect(x0 + 4, ey, 1, 2).rect(x0 + 9, ey, 1, 2);
    f.part('cheek', { flat: true, rim: false });
    f.px(x0 + 3, ey + 2).px(x0 + 10, ey + 2);
  } else if (face === 'side') {
    const ey = y0 + (p.lookUp ? 5 : 6);
    f.part('eye', { flat: true, rim: false });
    if (p.blink) f.px(x0 + 3, ey + 1);
    else f.rect(x0 + 3, ey, 1, 2);
    f.part('cheek', { flat: true, rim: false });
    f.px(x0 + 2, ey + 2);
  }
}

// Bell tipped back to look at the sky (17:00): the dome foreshortens, the
// mouth turns toward us as an ellipse — lip ring, dark inside, the clapper
// hanging in it — and the dot eyes ride up near the top edge.
const DOME_UP = [
  '....######....',
  '..##########..',
  '.############.',
  '.############.',
  '##############',
  '##############',
];
// The mouth only shows as a thin dark crescent between the far lip (in
// shade) and the near lip (lit): a wide dark band read as sunglasses at 1x
// (review), so the face stays on the dome.
const MOUTH_UP = [
  'dddddddddddddd',
  '.oooiiiiiiooo.',
  '..++++++++++-.',
];

function bellTilted(f: Fig, y0: number, face: 'front' | 'side', p: Pose) {
  const x0 = 1;
  const y = y0 + 1; // the tilt sinks the crown a little
  // hanging loop, seen from the front edge-on now
  f.part('brassD', { shade: 'r', light: 't' });
  f.rows(x0 + 5, y, ['.##.']);
  f.part(p.act === 'glow' ? 'brassG' : 'brass', { shade: '', light: '' });
  f.rows(x0, y + 1, DOME_UP);
  // form shading: dark right flank, lit left band and a spec on the crown
  for (let j = 0; j < DOME_UP.length; j++) {
    const l = DOME_UP[j].indexOf('#');
    const r = DOME_UP[j].lastIndexOf('#');
    f.retone(x0 + r, y + 1 + j, -1).retone(x0 + r - 1, y + 1 + j, j >= 2 ? -1 : 0);
    f.retone(x0 + l + 1, y + 1 + j, 1);
  }
  f.retone(x0 + 4, y + 2, 2).retone(x0 + 3, y + 3, 2);
  // the mouth, now facing us: far lip in shade, the dark inside, near lip lit
  f.part('brass', { shade: '', light: '' });
  f.rows(x0, y + 7, MOUTH_UP, { d: ['brassD', 0], i: null, o: [null, -1], '+': [null, 1], '-': [null, -1] });
  f.part('bellIn', { flat: true, rim: false });
  f.rows(x0, y + 7, MOUTH_UP.map((r) => r.replace(/[do+-]/g, '.')), { i: 'bellIn' });
  // (no clapper nub in the crescent: split in two, the dark reads as a pair
  // of squinting eyes / sunglasses; one unbroken dash reads as the open
  // mouth of a face turned up to the sky)
  // face in the upper half of the dome, eyes up at the sky
  const ey = y + 2;
  f.part('eye', { flat: true, rim: false });
  if (face === 'front') {
    if (p.blink) f.px(x0 + 4, ey + 1).px(x0 + 9, ey + 1);
    else f.rect(x0 + 4, ey, 1, 2).rect(x0 + 9, ey, 1, 2);
    f.part('cheek', { flat: true, rim: false });
    f.px(x0 + 3, ey + 2).px(x0 + 10, ey + 2);
  } else {
    if (p.blink) f.px(x0 + 3, ey + 1);
    else f.rect(x0 + 3, ey, 1, 2);
    f.part('cheek', { flat: true, rim: false });
    f.px(x0 + 2, ey + 2);
  }
}

/**
 * Fluffy body (soft dithered outline comes from the material). Only its own
 * silhouette is shaded: mittens and the sash in front of it do not ring it
 * with shade pixels (that ring read as orange noise at 1x).
 */
function body(f: Fig, y: number, rx = 5.5, shift = 0, squash = 0, side = false) {
  f.part('fur', { shade: 'rb', light: 't', shift, inner: false });
  f.ell(8, y + 4.5 + squash * 0.5, rx + squash * 0.3, 4.6 - squash * 0.5);
  // soft fur highlight on the upper-left of the tummy (front only: from the
  // side the lit top edge and the left fill column already carry it)
  if (!side) f.retone(4, y + 3, 1).retone(5, y + 2, 1);
}

/** White sash from his left shoulder (screen-left) down to the right hip. */
function sashFront(f: Fig, y: number) {
  f.part('sash', { shade: '', light: '' });
  for (let i = 0; i < 7; i++) f.t(0).px(4 + i, y + i).t(-1).px(5 + i, y + i);
  f.t(null);
  f.part('red', { flat: true, rim: false });
  f.px(5, y + 1).px(7, y + 3).px(9, y + 5);
}

/**
 * Side view (facing left): the sash comes over the near shoulder and runs
 * down across the chest toward the front — a solid diagonal band, white on
 * its lit upper edge with a 1px shade on the lower one, two red ticks on the
 * shade edge (like the front view). Clipped to the body so it never pokes
 * out of the fur.
 */
function sashSide(f: Fig, y: number) {
  const band: [number, number, number][] = [];
  for (let j = 0; j < 6; j++) {
    const x = 10 - j;
    band.push([x, y + 1 + j, 0], [x + 1, y + 1 + j, -1]);
  }
  const inside = band.filter(([x, yy]) => f.filled(x, yy));
  f.part('sash', { shade: '', light: '' });
  for (const [x, yy, t] of inside) f.t(t).px(x, yy);
  f.t(null);
  f.part('red', { flat: true, rim: false });
  for (const [x, yy, t] of inside) if (t < 0 && (yy === y + 2 || yy === y + 5)) f.px(x, yy);
}

/**
 * Feet, and on the 2px bounce the short legs that carry him: the stubs run
 * from under the fur down to the feet, so the body can leave the ground
 * without a gap. Front: both feet orange (the viewer-right one a step
 * darker). Side: the near foot orange, the far one the fur's shade.
 */
function feet(f: Fig, p: Pose, bodyY: number, side = false) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const y = H - 3;
  const hip = bodyY + 7;
  if (!side) {
    const l = st === 1 ? 1 : 0;
    const r = st === 3 ? 1 : 0;
    f.part('furA', { shade: 'rb', light: 't' });
    if (y - l > hip) f.rect(5, hip, 2, y - l - hip);
    f.rows(4, y - l, ['.##', '###']);
    f.part('furA', { shade: 'rb', light: 't', shift: -1 });
    if (y - r > hip) f.rect(9, hip, 2, y - r - hip);
    f.rows(9, y - r, ['##.', '###']);
  } else {
    const a = st === 1 ? -1 : st === 3 ? 1 : 0;
    f.part('furD', { shade: 'rb', light: 't' });
    if (y > hip) f.rect(8 - a, hip, 2, y - hip);
    f.rows(7 - a, y, ['.##', '###']);
    f.part('furA', { shade: 'rb', light: 't' });
    if (y > hip) f.rect(6 + a, hip, 2, y - hip);
    f.rows(5 + a, y, ['.##', '###']);
  }
}

function mitten(f: Fig, x: number, y: number, shift: number) {
  f.part('furA', { shade: 'rb', light: 't', shift });
  f.rows(x, y, ['##', '##']);
}

/**
 * A mitten held against the fur: the fur under and behind it (away from the
 * sun: right and below on screen) takes a 1px shade so the arm separates
 * from the body without an outline ring. `mirror`: the frame will be
 * flipped, so "right" is drawn on the left.
 */
function mittenOnBody(f: Fig, x: number, y: number, mirror: boolean) {
  mitten(f, x, y, 0);
  const sx = mirror ? x - 1 : x + 2;
  for (const [px, py] of [[sx, y], [sx, y + 1], [x, y + 2], [x + 1, y + 2]] as [number, number][])
    if (f.filled(px, py)) f.retone(px, py, -1);
}

function front(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const u = p.bob - p.breath;
  const act = p.act;
  // waving rocks the bell against the arm (3-beat arc: in, up, out)
  const sway = walking ? (st === 1 ? -1 : st === 3 ? 1 : 0) : act === 'wave' ? [0, -1, 0][p.ph % 3] : 0;
  // bow30: the first beat of the bow — the bell tips forward a notch
  const by = TOP + u + (act === 'hurt' || act === 'bow30' ? 1 : 0) + (p.lookUp ? 1 : 0);
  // the whole body rides the 2px waddle bounce (9.2); the legs stretch
  const bodyY = 14 + u;
  feet(f, p, bodyY);
  body(f, bodyY, 5.5, 0, p.lookUp ? 1 : 0);
  sashFront(f, bodyY + 1);
  const ay = bodyY + 4;
  if (act === 'pose') {
    // PR pose: both arms flung out wide, well past the body (20px frame)
    const up = p.ph === 1 ? 1 : 0;
    f.part('furA', { shade: 'rb', light: 't' });
    f.rect(1, bodyY + 1 - up, 2, 2).rect(-1, bodyY - up, 2, 2);
    mitten(f, -2, bodyY - 2 - up, 0);
    f.part('furA', { shade: 'rb', light: 't', shift: -1 });
    f.rect(13, bodyY + 1 - up, 2, 2).rect(15, bodyY - up, 2, 2);
    mitten(f, 16, bodyY - 2 - up, -1);
  } else if (act === 'wave') {
    // one arm raised high beside the bell, sweeping a 3-frame arc above the
    // rim (as readable as 'point'); the other hangs
    mitten(f, 2, ay, 0);
    const ph = p.ph % 3;
    const arms: [number, number][][] = [
      [[13, bodyY + 1], [14, bodyY], [14, bodyY - 1], [15, bodyY - 2], [15, bodyY - 3]],
      [[13, bodyY + 1], [14, bodyY], [15, bodyY - 1], [15, bodyY - 2], [16, bodyY - 3], [16, bodyY - 4], [16, bodyY - 5]],
      [[13, bodyY + 1], [14, bodyY], [15, bodyY - 1], [16, bodyY - 1]],
    ];
    f.part('furA', { shade: 'rb', light: '', shift: -1 });
    for (const [x, y] of arms[ph]) f.px(x, y);
    const mits: [number, number][] = [[15, bodyY - 5], [16, bodyY - 7], [16, bodyY - 3]];
    const m = mits[ph];
    mitten(f, m[0], m[1], -1);
  } else if (act === 'point') {
    // pointing north-east (the mall): the raised arm is drawn after the bell
    mitten(f, 1, ay, 0);
  } else if (act === 'flip') {
    // both arms up to hold the 24×16 board over his head (board drawn by
    // the caller with flipBoard(), see FLIP_ANCHOR)
    // both arms straight up, 2px of flat fur all the way to the mittens
    // (no rim flicker down a 1px arm: it read as a chain)
    f.part('furA', { shade: 'rb', light: 't', rim: false });
    f.rect(1, bodyY + 1, 2, 3).rect(0, bodyY - 10, 2, 12);
    f.part('furA', { shade: 'rb', light: 't', shift: -1, rim: false });
    f.rect(13, bodyY + 1, 2, 3).rect(14, bodyY - 10, 2, 12);
    mitten(f, 0, bodyY - 12, 0);
    mitten(f, 14, bodyY - 12, -1);
  } else if (act === 'flip_hold') {
    mitten(f, 2, ay - 2, 0);
    mitten(f, 12, ay - 2, -1);
    f.part('board', { shade: 'rb', light: 'tl' });
    f.rect(2, bodyY - 1, 12, 8);
    f.part('boardE', { flat: true, rim: false });
    f.hl(3, 13, bodyY + 6);
    f.part('ink', { flat: true, rim: false });
    f.hl(4, 8, bodyY + 1).px(10, bodyY + 1).px(11, bodyY + 1).hl(4, 11, bodyY + 3).hl(5, 9, bodyY + 5);
    mitten(f, 1, bodyY + 1, 0);
    mitten(f, 13, bodyY + 1, -1);
  } else if (act === 'hold') {
    // receiving the korokke parcel in both mittens (ending)
    f.part('kraft', { shade: 'rb', light: 't' });
    f.rect(4, bodyY + 2, 8, 3);
    f.part('red', { flat: true, rim: false });
    f.vl(8, bodyY + 2, bodyY + 4);
    mitten(f, 2, bodyY + 3, 0);
    mitten(f, 12, bodyY + 3, -1);
  } else if (act === 'surprised') {
    mitten(f, 0, ay - 3, 0);
    mitten(f, 14, ay - 3, -1);
  } else {
    const swing = walking ? (st === 1 ? 1 : st === 3 ? -1 : 0) : 0;
    mitten(f, 1, ay + swing, 0);
    mitten(f, 13, ay - swing, -1);
  }
  bell(f, by, sway, 'front', p);
  if (act === 'point') {
    f.part('furA', { shade: 'rb', light: 't', sep: true });
    f.rect(12, bodyY, 2, 2).rect(13, bodyY - 2, 2, 2).rect(14, bodyY - 4, 2, 2);
    f.part('furD', { shade: 'r', light: 't' });
    f.px(15, bodyY - 5).px(15, bodyY - 6);
  }
  if (act === 'glow' && p.ph === 1) {
    // the flash itself: a 1px halo hugging the bell for one beat (the
    // pulsing rings that travel outward are composited in buildKanenari /
    // drawn from glowRing())
    f.after((pc) => {
      const top = Math.min(by + 13, pc.h);
      const W = pc.w;
      const src = pc.data.slice();
      for (let y = 0; y < top; y++)
        for (let x = 0; x < W; x++) {
          if (src[y * W + x] >>> 24) continue;
          const n = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => nx >= 0 && ny >= 0 && nx < W && ny < top && src[ny * W + nx] >>> 24);
          if (n) pc.set(x, y, '#FFE7A3');
        }
    });
  }
}

function back(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const u = p.bob - p.breath;
  const sway = walking ? (st === 1 ? 1 : st === 3 ? -1 : 0) : 0;
  // looking up from behind: the bell tips back toward us (its crown rises
  // and the lip drops out of sight into the fur)
  const by = TOP + u + (p.lookUp ? -1 : 0);
  const bodyY = 14 + u;
  feet(f, p, bodyY);
  const swing = walking ? (st === 1 ? -1 : st === 3 ? 1 : 0) : 0;
  mitten(f, 1, bodyY + 4 + swing, -1);
  mitten(f, 13, bodyY + 4 - swing, -1);
  body(f, bodyY, 5.5, 0, p.lookUp ? 1 : 0);
  // sash crossing the back (the other diagonal)
  f.part('sash', { shade: '', light: '' });
  for (let i = 0; i < 3; i++) f.t(0).px(4 + i, bodyY + 1 + i).t(-1).px(3 + i, bodyY + 1 + i);
  for (let i = 4; i < 7; i++) f.t(0).px(4 + i, bodyY + 1 + i).t(-1).px(3 + i, bodyY + 1 + i);
  f.t(null);
  // zipper: slightly open at the top, pitch dark inside
  const open = p.act === 'zipper' ? 3 : 1;
  f.part('zip', { flat: true, rim: false });
  f.vl(8, bodyY + 1, bodyY + 7);
  f.part('void', { flat: true, rim: false });
  f.vl(8, bodyY + 1, bodyY + open);
  if (open > 1) f.px(7, bodyY + 2).px(9, bodyY + 2).px(7, bodyY + 3).px(9, bodyY + 3);
  f.part('zipD', { flat: true, rim: false });
  f.px(8, bodyY + open + 1);
  if (p.act === 'zipper') {
    // arm reaching back to the zipper, holding the package
    mitten(f, 10, bodyY + 3, 0);
    f.part('board', { shade: 'rb', light: 't' });
    f.rect(9, bodyY, 3, 2);
  }
  bell(f, by, sway, 'back', p);
}

function side(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const u = p.bob - p.breath;
  const act = p.act;
  const sway = walking ? (st === 1 ? -1 : st === 3 ? 1 : 0) : act === 'wave' ? [0, 1, 0][p.ph % 3] : 0;
  const by = TOP + u + (act === 'hurt' ? 1 : 0) + (p.lookUp ? 1 : 0);
  const bodyY = 14 + u;
  const swing = walking ? (st === 1 ? 1 : st === 3 ? -1 : 0) : 0;
  // far arm: just its mitten peeking out behind the back on the swing
  mitten(f, 10 + swing, bodyY + 5, -1);
  feet(f, p, bodyY, true);
  body(f, bodyY, 5, 0, p.lookUp ? 1 : 0, true);
  // zipper: a single pull-tab pixel on the back seam, one in from the edge
  // (clear of the rim column when mirrored)
  f.part('zip', { flat: true, rim: false });
  f.px(11, bodyY + 4);
  sashSide(f, bodyY);
  // near arm
  if (act === 'wave') {
    // the near arm up in front of the bell, sweeping an arc past its rim
    const ph = p.ph % 3;
    f.part('furA', { shade: 'rb', light: 't' });
    f.px(5, bodyY + 3).px(4, bodyY + 2).px(3, bodyY + 1).px(2, bodyY);
    const m: [number, number] = [[0, bodyY - 3], [-1, bodyY - 5], [-2, bodyY - 2]][ph] as [number, number];
    if (ph === 1) f.px(1, bodyY - 1).px(0, bodyY - 2);
    else f.px(1, bodyY - 1);
    mitten(f, m[0], m[1], 0);
  } else if (act === 'point') {
    f.part('furA', { shade: 'rb', light: 't' });
    f.px(5, bodyY + 3).px(4, bodyY + 2);
    mitten(f, 2, bodyY - 1, 0);
  } else if (act === 'flip' || act === 'flip_hold') {
    f.part('board', { shade: 'rb', light: 'tl' });
    f.rect(0, bodyY - 1, 4, 8);
    f.part('boardE', { flat: true, rim: false });
    f.vl(3, bodyY - 1, bodyY + 6);
    mitten(f, 3, bodyY + 2, 0);
  } else mittenOnBody(f, 7 - swing, bodyY + 5, p.mirror);
  bell(f, by, sway, 'side', p);
}

function bowPose(f: Fig, p: Pose) {
  // deep bow toward the viewer: the bell tips forward, we see its crown
  const d = p.ph;
  feet(f, p, 15);
  body(f, 15);
  mitten(f, 2, 19, 0);
  mitten(f, 12, 19, -1);
  const y = 6 + d * 2;
  f.part('brass', { shade: 'rb', light: 'tl' });
  f.rows(1, y, [
    '...########...',
    '.############.',
    '##############',
    '##############',
    '##############',
    '.############.',
    '...########...',
  ]);
  f.part('brassD', { shade: 'r', light: 't' });
  f.rows(6, y + 2, ['.##.', '#..#', '.##.']);
  f.part('brass', { flat: true, rim: false, ol: false });
  f.t(2).px(4, y + 1).px(3, y + 2).t(null);
  f.part('brassD', { shade: '', light: '' });
  f.hl(2, 13, y + 7);
  f.part('eye', { flat: true, rim: false });
  f.px(5, y + 6).px(10, y + 6);
  f.part('cheek', { flat: true, rim: false });
  f.px(4, y + 6).px(11, y + 6);
}

/** Frames are 20px wide (the arms of wave / pose reach past the bell); art is authored in the 16px box at +2. */
const OX = 2;

function draw(f: Fig, p: Pose) {
  // the PR pose hops: the whole figure leaves the ground for one frame
  f.offset(OX, p.act === 'pose' && p.ph === 1 ? -2 : 0);
  if (p.act === 'bow') return bowPose(f, p);
  if (p.act === 'zipper') return back(f, p);
  if (p.view === 'down') front(f, p);
  else if (p.view === 'up') back(f, p);
  else side(f, p);
}

// idle: soft bounce-breathing; now and then waves at nobody in particular
const IDLE: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 3),
  { act: 'wave', ph: 0 }, { act: 'wave', ph: 1 }, { act: 'wave', ph: 2 }, { act: 'wave', ph: 1 },
  { act: 'wave', ph: 0 }, { act: 'wave', ph: 1 }, { act: 'wave', ph: 2 }, { act: 'wave', ph: 1 },
  { breath: 0, blink: true }, { breath: 0 }, { breath: 1 }, { breath: 1 },
];

export const KANENARI_SPEC: SpriteSpec = {
  id: 'kanenari',
  w: 20,
  h: H,
  mats: KANENARI_MATS,
  draw,
  walkFrameMs: 150,
  walkBob: [0, -2, 0, -2],
  idle: { down: IDLE, left: IDLE, right: IDLE, up: rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 4) },
  extras: {
    flip: { dirs: ['down'] },
    flip_hold: { dirs: ['down', 'left', 'right'] },
    hold: { dirs: ['down'] },
    pose: { dirs: ['down'], p: { ph: 2 } },
    point: { dirs: ['down', 'left', 'right'] },
    wave: { dirs: ['down', 'left', 'right'] },
    surprised: { dirs: ['down'], p: { bob: -1 } },
    hurt: { dirs: ['down'] },
    happy: { dirs: ['down'] },
    glow: { dirs: ['down'] },
    zipper: { dirs: ['up'] },
  },
  anims: {
    // stand → 30° → deep → 90° held → back up through the same beats
    bow: {
      frames: [{ act: '' }, { act: 'bow30' }, { ph: 0 }, { ph: 1 }, { ph: 0 }, { act: 'bow30' }, { act: '' }],
      ms: [80, 90, 100, 520, 100, 90, 120],
      loop: false,
    },
    wave: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 1 }], ms: 150, dirs: ['down', 'left', 'right'] },
    // replaced in buildKanenari with the ring composited in (frames 0/1 are the sources)
    glow: { frames: [{ act: 'glow' }, { act: 'glow', ph: 1 }], ms: 120, loop: false },
    // crouch (anticipation) → hop with the arms flung up → land, arms wide
    pose: { frames: [{ act: '', bob: 1 }, { act: 'pose', ph: 1, bob: -1 }, { act: 'pose', ph: 2 }], ms: [90, 130, 600], loop: false },
  },
  shadow: 12,
};

/**
 * Where to draw flipBoard() (24×16) over the raw arms-up pose 'flip_raw',
 * relative to the actor's feet (anchor): board top-left = (x + dx, y + dy).
 * The raised mittens sit just under the board's bottom corners. The 'flip'
 * extra already has the board composited in (24×39 frame).
 */
export const FLIP_ANCHOR = { dx: -12, dy: -39 };

/**
 * The 'flip' frames with the board composited in (24×39, feet at the bottom
 * centre like every frame), so the field can show the pose as-is. Battle / UI
 * code that wants its own board can use the raw arms-up pose 'flip_raw' and
 * draw at FLIP_ANCHOR.
 */
function withBoard(raw: HTMLCanvasElement, board: HTMLCanvasElement | null, drop = 0): HTMLCanvasElement {
  const W = 24;
  const Hh = -FLIP_ANCHOR.dy;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = Hh;
  const g = c.getContext('2d')!;
  g.drawImage(raw, (W - raw.width) >> 1, Hh - raw.height);
  if (board) g.drawImage(board, 0, drop + ((16 - board.height) >> 1));
  return c;
}

/**
 * Kanenari's frame with a glow ring composited around the bell (32 wide, 8px
 * taller). The ring goes behind the figure so it never paints over the bell
 * or its outline (the flash frame's halo hugs the bell instead).
 */
function withRing(frame: HTMLCanvasElement, ring: HTMLCanvasElement | null): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = Math.max(H, frame.height) + 8;
  const g = c.getContext('2d')!;
  if (ring) g.drawImage(ring, 0, c.height + GLOW_CENTER_DY - 16);
  g.drawImage(frame, (32 - frame.width) >> 1, c.height - frame.height);
  return c;
}

function buildKanenari(): CharSprite {
  const s = buildSprite(KANENARI_SPEC);
  // 鐘が光る (30_level_art 9.2): brass one step brighter, a flash halo, and
  // a #FFE7A3 ring that pulses outward twice (radius 8 → 14) and fades
  const lit = s.extra!.glow;
  const flash = s.anims!.glow.frames[1];
  const plain = s.walk.down[0];
  s.anims!.glow = {
    frames: [
      withRing(flash, glowRing(0)),
      withRing(lit, glowRing(1)),
      withRing(lit, glowRing(2)),
      withRing(lit, glowRing(3)),
      withRing(flash, glowRing(4)),
      withRing(lit, glowRing(5)),
      withRing(lit, glowRing(6)),
      withRing(lit, glowRing(7)),
      withRing(plain, null),
    ],
    ms: [110, 110, 120, 140, 110, 110, 120, 160, 300],
    loop: false,
  };
  const raw = s.extra!.flip;
  const up = withBoard(raw, flipBoard(0));
  s.extra!.flip_raw = raw;
  s.extra!.flip = up;
  s.anims!.flip = { frames: [s.extra!.flip_hold, up], ms: [110, 400], loop: false };
  // turning the board over to show the next line (se_flip)
  s.anims!.flip_turn = {
    frames: [up, withBoard(raw, flipBoardEdge()), withBoard(raw, flipBoard(1))],
    ms: [120, 90, 600],
    loop: false,
  };
  return s;
}

registerChar('kanenari', buildKanenari);
registerChar('npc_kanenari', () => ({ ...charSprite('kanenari'), id: 'npc_kanenari' }));
