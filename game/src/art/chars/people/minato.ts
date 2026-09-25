// ミナト（主人公, 11）: bed-head with one ahoge, an oversized green tee with a
// mystery-fish print, navy shorts, red beach sandals, a house key on a blue
// string and a bug net stuck in the back of his collar (the hoop pokes out
// top-left of his head in the front view — his silhouette signature).

import { flat, mat, type Fig, type Mats, type RowMap } from '../fig';
import { armTo, legs, swing, type ArmSpec, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, type Pose, type SpriteSpec } from '../rig';
import { charSprite, registerChar, registerCharSync, type CharAnim, type CharSprite } from '../registry';
import { flag, type Dir } from '../../../game/state';
import { tilt, tiltTpl, type Tpl } from '../kit';

// Colors follow the reference sprite of 30_level_art 9.1 (hair #2B1E1A /
// #5A3A2A, tee #6CC48A / #3FA66B / #2E6B4A, skin #FFD9B8 / #E0A882 ...).
export const MINATO_MATS: Mats = {
  skin: mat('#FFD9B8', { shade: '#E0A882', light: '#FFD9B8', dark: '#C98A6A' }),
  hair: mat('#2B1E1A', { shade: '#2B1E1A', dark: '#2A2440', light: '#5A3A2A', spec: '#8A5A3A' }),
  shirt: mat('#3FA66B', { shade: '#2E6B4A', light: '#6CC48A', dark: '#245A44' }),
  print: flat('#F4F1E8'),
  printD: flat('#2E6B4A'),
  shorts: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B1733' }),
  sandal: mat('#E84E3C', { shade: '#B8241E', light: '#FF6A4D', dark: '#8A2E3A' }),
  string: flat('#4AA8E0'),
  key: flat('#FFD23F'),
  keyD: flat('#D9A441'),
  pole: mat('#C8A06A', { shade: '#A8742A', light: '#F6D98A', dark: '#8A5A3A' }),
  hoop: mat('#C8A06A', { shade: '#A8742A', light: '#F6D98A' }),
  net: flat('#F4F1E8', { ol: '#5A3A2A' }),
  netD: flat('#C8C2B4', { ol: '#5A3A2A' }),
  eye: flat('#2A2440'),
  shine: flat('#FFF6D8'),
  mouth: flat('#2A2440'),
  blush: flat('#F2B894'),
  package: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8' }),
  kraft: mat('#E8D9B5', { shade: '#C8A06A', light: '#FBF3DC', dark: '#8A5A3A' }),
  tape: flat('#E84E3C'),
  hanko: mat('#E23B2E', { shade: '#B8241E', light: '#FF6A4D' }),
  hand: mat('#FFD9B8', { shade: '#E0A882', light: '#FFD9B8', dark: '#C98A6A' }),
  wood: mat('#D9A441', { shade: '#A8742A', light: '#F6D98A' }),
  // chapter 2: the hanamaru tomato in the net (52 10.1)
  lanO: flat('#8A2E3A'),
  lanG: flat('#FFE7A3'),
  lanGd: flat('#F7C27A'),
  lanT: flat('#E84E3C'),
  lanS: flat('#FFF6D8'),
  tomato: mat('#E84E3C', { shade: '#B8241E', light: '#FF6A4D', dark: '#8A2E3A' }),
  tomatoS: flat('#FFF6D8'),
  calyx: flat('#3FA66B'),
};

/**
 * What hangs in the bug net (chapter 2, 52 10.1): 'empty' (chapter 1),
 * 'lantern' (the hanamaru tomato, lit — its 5×5 is recorded for the glow
 * layer), 'dim' (the tomato just put in, not lit yet: lantern_set) and
 * 'none' (Kanenari is holding the net). Set by the draw wrappers below.
 */
export type NetMode = 'empty' | 'lantern' | 'dim' | 'none';
let NET: NetMode = 'empty';

/** 5×5 lantern: the tomato in the net, lit from inside (52 10.1). */
const LAN5 = ['.OOO.', 'OgGgO', 'OGTtO', 'OgTTO', '.OOO.'];
/** From behind the net looks bigger over his head (the same picture at 7×6). */
const LAN7 = ['..OOO..', '.OgGgO.', 'OGgTtgO', 'OgTTTGO', '.OgTgO.', '..OOO..'];
const LAN_LIT: Record<string, [string, string]> = {
  O: ['lanO', '#8A2E3A'],
  g: ['lanG', '#FFE7A3'],
  G: ['lanGd', '#F7C27A'],
  T: ['lanT', '#E84E3C'],
  t: ['lanS', '#FFF6D8'],
};
/** The tomato in the net before it lights (lantern_set): cane hoop, mesh, a red fruit. */
const LAN_DIM: Record<string, [string, string]> = {
  O: ['hoop', ''],
  g: ['net', ''],
  G: ['netD', ''],
  T: ['lanT', ''],
  t: ['lanS', ''],
};

/**
 * The lantern at (x, y) (top-left). Lit: every pixel goes on the glow layer
 * too, with a 12×12 soft light (#FFE7A3 → #F2894B, α60%) around it, and the
 * light pool is anchored under the net ((cx, 18) on the 16×24 grid).
 */
function lanternNet(f: Fig, x: number, y: number, big: boolean, lit: boolean, poolY = 18, scale = 1) {
  const rows = big ? LAN7 : LAN5;
  const map = lit ? LAN_LIT : LAN_DIM;
  for (const ch of ['O', 'g', 'G', 'T', 't']) {
    const [m, glow] = map[ch];
    const isHoop = m === 'hoop';
    f.part(m, isHoop ? { shade: 'rb', light: 't', ol: false } : { flat: true, rim: false, ol: false });
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        if (r[i] !== ch) continue;
        f.px(x + i, y + j);
        if (glow) f.glowPx(x + i, y + j, glow);
      }
    });
  }
  const w = rows[0].length;
  const h = rows.length;
  const cx = x + (w - 1) / 2;
  const cy = y + (h - 1) / 2;
  if (lit) {
    f.halo(cx, cy, 6, '#FFE7A3', '#F2894B', 0.6);
    f.lanternAt(Math.round(cx), poolY, scale);
  }
}

/**
 * The net lags the body by one walk frame (it hangs from the pole): it is
 * drawn at the previous frame's bob, 1px behind on the stride.
 */
function netLag(p: Pose): [number, number] {
  if (p.mode !== 'walk' && p.mode !== 'run') return [0, 0];
  const bobs = [0, -1, 0, -1];
  const st = p.step % 4;
  const prev = bobs[(st + 3) % 4];
  return [[0, 1, 0, -1][st], prev - bobs[st]];
}

const HAIR: RowMap = { H: ['hair', 1], K: ['hair', 2], d: ['hair', -1], D: ['hair', -2], h: ['hair', 0] };
const SKIN: RowMap = { s: ['skin', 0], S: ['skin', -1], L: ['skin', 1] };

const LEGS: LegSpec = { cx: 8, hip: 20, foot: 22, w: 2, gap: 2, mat: 'skin', shoe: 'sandal', shoeLen: 3 };
const FOREARM: Seg[] = [{ mat: 'skin' }];

/**
 * Bug-net hoop: a 6×5 oval of cane-coloured wire (lit top-left, shaded
 * bottom-right by the renderer) around a dithered mesh that sags a little
 * darker toward the bottom, so at 1x it reads as a round net and not as a
 * checkered square. (x, y) is the ring's top-left. `narrow` = the hoop seen
 * edge-on from the side (4×5).
 */
function netHoop(f: Fig, x: number, y: number, narrow = false, big = false, lag: [number, number] = [0, 0]) {
  if (NET === 'none') return;
  if (NET === 'lantern' || NET === 'dim') {
    // the tomato's weight rounds the net out into a 5×5 pouch (the empty
    // hoop of 30 9.1 is 5×4); seen edge-on (side) the pouch is still round,
    // so every view uses the same 5×5 (7×6 from behind, 52 10.1)
    const lx = narrow ? x : x - 1;
    lanternNet(f, lx + lag[0], y + lag[1], big, NET === 'lantern');
    return;
  }
  f.part('hoop', { shade: 'rb', light: 't' });
  if (narrow) f.rows(x, y, ['.##.', '#..#', '#..#', '#..#', '.##.']);
  else f.rows(x, y, ['.####.', '#....#', '#....#', '#....#', '.####.']);
  f.part('net', { flat: true, rim: false, ol: false });
  if (narrow) f.rows(x + 1, y + 1, ['nN', 'Nn', 'nN'], { n: 'net', N: 'netD' });
  else f.rows(x + 1, y + 1, ['nnNn', 'nNnN', 'NnNN'], { n: 'net', N: 'netD' });
}

function ahoge(f: Fig, x: number, y: number, sway: number) {
  f.part('hair', { flat: true, rim: false });
  f.t(0).px(x, y + 1).t(1).px(x + sway, y).t(null);
}

// ---- heads ------------------------------------------------------------------

function headFront(f: Fig, p: Pose, y: number) {
  const up = p.lookUp;
  if (up) return headFrontUp(f, p, y);
  f.part('skin', { shade: 'rb', light: '' });
  f.rows(3, y + 4, [
    '.########.',
    '##########',
    '##########',
    '##########',
    '.########.',
    '..######..',
  ]);
  // hair (explicit form shading; front view is never mirrored)
  f.part('hair', { shade: '', light: '' });
  f.rows(1, y, [
    '.....HHhhh....',
    '...HKKHhhhhd..',
    '..HKHhhhhhhhd.',
    '.HHhhhhhhhhhdd',
    'hHhhhdhhhhhhdd',
    '.hhd.hhd.hhdd.',
    '.hd...d...dhd.',
    '.h.........hd.',
  ], HAIR);
  // eyes
  const ey = y + 7;
  f.part('eye', { flat: true, rim: false });
  if (p.act === 'hurt') {
    f.px(4, ey).px(5, ey + 1).px(11, ey).px(10, ey + 1);
  } else if (p.blinkClosed) {
    f.hl(4, 5, ey + 1).hl(10, 11, ey + 1);
  } else if (p.blink || p.act === 'smug') {
    // half-closed (smug = self-satisfied narrow eyes)
    f.px(5, ey + 1).px(10, ey + 1);
    if (p.act === 'smug') f.px(4, ey + 1).px(11, ey + 1);
  } else if (p.act === 'surprised') {
    // wide eyes (2×2), not the usual 1×2
    f.rect(4, ey, 2, 2).rect(10, ey, 2, 2);
  } else {
    f.rect(5, ey, 1, 2).rect(10, ey, 1, 2);
  }
  // blush + mouth
  f.part('blush', { flat: true, rim: false });
  f.px(4, ey + 2).px(11, ey + 2);
  f.part('mouth', { flat: true, rim: false });
  if (p.act === 'surprised') f.px(8, y + 9);
  else if (p.act === 'hurt') f.rect(7, y + 9, 2, 1);
  else if (p.act === 'smug') f.px(8, y + 9).px(9, y + 8);
  else f.px(8, y + 9);
}

/**
 * 17:00 look_up, front (see kit.ts lookUpFront): the face turns up to the
 * sky — less crown, a thin fringe, the whole face under it lit by the sky,
 * pupils rolled up under the fringe (eye whites below), the mouth hanging
 * open, the jaw's underside in shade and the chin sunk into the collar.
 */
function headFrontUp(f: Fig, p: Pose, y: number) {
  f.part('skin', { shade: 'rb', light: '' });
  f.rows(3, y + 4, [
    '#LLLLLLLL#',
    '#LLLLLLLL#',
    '##########',
    '##########',
    '.########.',
    '.SSSSSSSS.',
    '..SSSSSS..',
  ], SKIN);
  f.part('hair', { shade: '', light: '' });
  f.rows(1, y, [
    '.....HHhhh....',
    '...HKKHhhhhd..',
    '..HKHhhhhhhhd.',
    '.HHhhhhhhhhhdd',
    'hHd.h..h..hhdd',
    '.h.........hd.',
    '.h.........hd.',
    '.d.........dd.',
  ], HAIR);
  f.part('eye', { flat: true, rim: false });
  f.px(5, y + 5).px(10, y + 5);
  f.part('#F4F1E8', { flat: true, rim: false });
  f.px(5, y + 6).px(10, y + 6);
  f.part('mouth', { flat: true, rim: false });
  f.rect(8, y + 8, 1, 2);
  void p;
}

function headBack(f: Fig, p: Pose, y: number) {
  // looking up from behind: the back of the head sinks over the nape and
  // the ears show at both sides
  const up = p.lookUp;
  f.part('skin', { shade: 'rb', light: '' });
  if (!up) f.rect(5, y + 8, 6, 2);
  else f.t(-1).rect(0, y + 6, 1, 2).rect(15, y + 6, 1, 2).t(null);
  f.part('hair', { shade: '', light: '' });
  const rows = [
    '.....HHhhh....',
    '...HKKHhhhhd..',
    '..HKHhhhhhhhd.',
    '.HHhhhdhhhhhdd',
    'hHhhhhhdhhhhdd',
    '.Hhhhhhhhhhhd.',
    '.hhhhhhhhhhhd.',
    '.hhhhhhhhhhdd.',
    '..hdhhdhhdhd..',
    '...d..d..d....',
  ];
  if (up) f.rows(1, y + 2, rows.slice(1), HAIR);
  else f.rows(1, y, rows, HAIR);
}

const SIDE_FACE = [
  '.####.....',
  '######....',
  '######....',
  '#######...',
  '.#####....',
  '..###.....',
];
const SIDE_HAIR = [
  '.....#####....',
  '...########...',
  '..##########..',
  '.###########-.',
  '##-##########.',
  '.#..-########.',
  '......#######.',
  '.......######.',
  '........###...',
];

function headSide(f: Fig, p: Pose, y: number) {
  const up = p.lookUp;
  // look_up: the head tips back about the neck (kit.ts tilt)
  const cx = 7;
  const cy = 9;
  const T = (t: Tpl): Tpl => (up ? tiltTpl(t, cx, cy) : t);
  const P = (x: number, yy: number): [number, number] => (up ? tilt(x, yy, cx, cy) : [x, yy]);
  if (up) {
    // throat under the raised jaw
    f.part('skin', { shade: '', light: '' });
    f.t(-1).rect(4, y + 8, 4, 3).t(null);
  }
  f.part('skin', { shade: 'b', light: '' });
  const face = T([2, 4, SIDE_FACE]);
  f.rows(face[0], y + face[1], face[2]);
  f.part('hair', { shade: 'rb', light: 't' });
  const hair = T([1, 0, SIDE_HAIR]);
  f.rows(hair[0], y + hair[1], hair[2]);
  // ear
  const [ex0, ey0] = P(8, 6);
  const [ex1, ey1] = P(8, 7);
  f.part('skin', { shade: '', light: '' });
  f.t(-1).px(ex0, y + ey0).t(0).px(ex1, y + ey1).t(null);
  // eye
  f.part('eye', { flat: true, rim: false });
  const [ex, ey] = P(4, 6);
  if (up) {
    f.px(ex, y + ey);
    f.part('#F4F1E8', { flat: true, rim: false });
    f.px(ex, y + ey + 1);
  } else if (p.blinkClosed) f.hl(ex, ex + 1, y + ey + 1);
  else if (p.blink || p.act === 'smug') f.px(ex, y + ey + 1);
  else if (p.act === 'hurt') f.px(ex, y + ey + 1).px(ex + 1, y + ey);
  else f.rect(ex, y + ey, 1, 2);
  f.part('blush', { flat: true, rim: false });
  if (!up) f.px(5, y + 8);
  f.part('mouth', { flat: true, rim: false });
  if (up) {
    const [mx, my] = P(3, 9);
    f.px(mx, y + my);
  } else if (p.act === 'surprised' || p.act === 'hurt') f.px(3, y + 9);
}

// ---- torso ------------------------------------------------------------------

/** Oversized tee incl. short wide sleeves. top = collar row, hem = last row. */
function teeFront(f: Fig, p: Pose, top: number, hem: number, back: boolean) {
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(4, 11, top);
  f.rect(2, top + 1, 12, 2);
  f.rect(3, top + 3, 10, hem - top - 2);
  // sleeve openings: darker underside
  f.t(-1).px(2, top + 2).px(13, top + 2).t(null);
  if (!back) {
    f.part('skin', { shade: 'r', light: '' });
    f.px(7, top).px(8, top);
    f.part('shirt', { flat: true });
    f.t(-2).px(6, top).px(9, top).t(null);
  } else {
    f.t(-1).hl(6, 9, top).t(null);
  }
  // loose folds of the big tee
  f.part('shirt', { flat: true });
  f.t(-1).px(4, hem - 1).px(10, hem - 1).px(10, hem - 2).t(null);
  if (p.run) {
    const s = p.step % 2;
    f.part('shirt', { shade: 'rb', light: '' });
    f.px(2 + (s ? 0 : 1), hem).px(13 - (s ? 1 : 0), hem);
  }
  if (!back) {
    // key on a blue string (V from the collar), key at the sternum
    f.part('string', { flat: true, rim: false });
    f.px(6, top + 1).px(9, top + 1).px(7, top + 2).px(8, top + 2);
    f.part('key', { flat: true, rim: false });
    f.px(7, top + 3);
    f.part('keyD', { flat: true, rim: false });
    f.px(8, top + 3);
    // mystery fish print (3×2 with a tail notch) on the lower right
    f.part('print', { flat: true, rim: false });
    f.px(9, hem - 2).px(10, hem - 2).px(9, hem - 1).px(10, hem - 1).px(11, hem - 2);
    f.part('printD', { flat: true, rim: false });
    f.px(9, hem - 2);
  }
}

function shortsFront(f: Fig, y: number) {
  f.part('shorts', { shade: 'rb', light: '' });
  f.rect(4, y, 8, 2);
  f.erase(7, y + 1, 2, 1);
  f.t(-1).px(7, y).px(8, y).t(null);
}

// ---- views ------------------------------------------------------------------

function front(f: Fig, p: Pose) {
  const b = p.bob;
  const u = b - p.breath;
  const act = p.act;
  // surprised: the head jerks up 1px
  const headY = 2 + u + (act === 'hurt' ? 1 : act === 'surprised' ? -1 : 0);
  if (NET !== 'none') {
    f.part('pole', { shade: 'r', light: '' });
    f.px(4, 5 + u);
  }
  netHoop(f, 1, 0 + u, false, false, netLag(p));
  legs(f, p, LEGS);
  shortsFront(f, 18 + b);
  const armL: ArmSpec = { sx: 2, sy: 15 + u, hx: 0, hy: 2, segs: FOREARM };
  const armR: ArmSpec = { sx: 13, sy: 15 + u, hx: 0, hy: 2, segs: FOREARM, shift: -1 };
  if (act === 'hold_up' || act === 'hold_item') {
    teeFront(f, p, 12 + u, 17 + b, false);
    armTo(f, armL, 3, 4, [1, 10 + u]);
    armTo(f, armR, 12, 4, [14, 10 + u]);
  } else if (act === 'surprised') {
    teeFront(f, p, 12 + u, 17 + b, false);
    armTo(f, armL, 1, 10 + u, [2, 13 + u]);
    armTo(f, armR, 14, 10 + u, [13, 13 + u]);
  } else if (act === 'give' || act === 'stamp') {
    teeFront(f, p, 12 + u, 17 + b, false);
    armTo(f, armL, 5, 16 + u, [3, 15 + u]);
    armTo(f, armR, 10, 16 + u, [12, 15 + u]);
    if (act === 'give') {
      f.part('package', { shade: 'rb', light: 't' });
      f.rect(5, 14 + u, 6, 3);
      f.part('tape', { flat: true, rim: false });
      f.vl(8, 14 + u, 16 + u);
    } else {
      f.part('wood', { shade: 'r', light: 't' });
      f.rect(7, 13 + u, 2, 3);
      f.part('hanko', { shade: 'r', light: '' });
      f.rect(7, 16 + u, 2, 1);
    }
  } else if (act === 'hurt') {
    teeFront(f, p, 12 + u, 17 + b, false);
    armTo(f, armL, 4, 17 + u);
    armTo(f, armR, 11, 17 + u);
  } else if (act === 'net_front') {
    // lantern_set: both hands forward on the net's pole (hands drawn by lanternSet)
    teeFront(f, p, 12 + u, 17 + b, false);
    armTo(f, armL, 5, 16 + u, [3, 15 + u]);
    armTo(f, armR, 10, 16 + u, [12, 15 + u]);
  } else if (act === 'raise') {
    // hold_up with the lantern: the pole stands up at the viewer's right;
    // the near hand (his left) grips it high beside the head, the other
    // crosses the chest to hold it lower
    teeFront(f, p, 12 + u, 17 + b, false);
    armTo(f, armL, 11, 12 + u, [6, 16 + u]);
    armTo(f, armR, 13, 3 + u, [15, 9 + u]);
  } else if (act === 'yawn') {
    // a big yawn (ending, at home): 0 = arms stretched up and out, 1 = one
    // hand over the open mouth
    teeFront(f, p, 12 + u, 17 + b, false);
    if (p.ph === 0) {
      armTo(f, armL, 1, 8 + u, [1, 13 + u]);
      armTo(f, armR, 14, 8 + u, [14, 13 + u]);
    } else {
      armTo(f, armL, 2, 17 + u);
      armTo(f, armR, 10, 11 + u, [12, 14 + u]);
    }
  } else if (act === 'hold') {
    // the warm korokke parcel held against his tummy with both hands
    teeFront(f, p, 12 + u, 17 + b, false);
    armTo(f, armL, 4, 16 + u, [2, 15 + u]);
    armTo(f, armR, 11, 16 + u, [13, 15 + u]);
    f.part('kraft', { shade: 'rb', light: 't' });
    f.rect(4, 14 + u, 8, 3);
    f.part('tape', { flat: true, rim: false });
    f.vl(8, 14 + u, 16 + u).hl(4, 11, 15 + u);
    f.part('hand', { shade: 'rb', light: '' });
    f.px(4, 16 + u).px(11, 16 + u);
  } else {
    teeFront(f, p, 12 + u, 17 + b, false);
    // look_up: arms go slack, hands 1px lower and in against the tee
    const lu = p.lookUp ? 1 : 0;
    armTo(f, armL, 2 + lu, 17 + u + lu + swing(p, -1));
    armTo(f, armR, 13 - lu, 17 + u + lu + swing(p, 1));
  }
  if (act === 'bow') {
    // a polite bow: the head dips 2px, eyes shut, ahoge flops forward
    headFront(f, { ...p, blink: true, blinkClosed: true }, headY + 2);
    ahoge(f, 9, headY, 1);
    return;
  }
  if (act === 'yawn') {
    // eyes squeezed shut, mouth wide open (the head tips back a touch)
    const hy = headY - (p.ph === 0 ? 1 : 0);
    headFront(f, { ...p, blink: true, blinkClosed: true, act: '' }, hy);
    f.part('mouth', { flat: true, rim: false });
    if (p.ph === 0) f.rect(7, hy + 8, 2, 2);
    else f.rect(7, hy + 9, 2, 1);
    ahoge(f, 9, hy - 2, 1);
    if (p.ph === 1) {
      // the hand over the mouth
      f.part('hand', { shade: 'rb', light: 't' });
      f.rect(9, hy + 8, 2, 2);
    }
    return;
  }
  headFront(f, p, headY);
  const sway = p.mode === 'idle' ? (p.tick % 4 < 2 ? 0 : 1) : p.mode === 'walk' ? (p.step % 2 ? 1 : 0) : p.run ? 1 : 0;
  ahoge(f, 9, headY - 2, sway);
  if (act === 'hold_up' || act === 'hold_item') {
    // item get: the thing held high above his head
    f.part('kraft', { shade: 'rb', light: 't' });
    f.rect(5, 0, 6, 3);
    f.part('tape', { flat: true, rim: false });
    f.vl(8, 0, 2);
    f.part('hand', { shade: 'rb', light: 't' });
    f.rect(3, 2, 2, 2).rect(11, 2, 2, 2);
  }
}

function back(f: Fig, p: Pose) {
  const b = p.bob;
  const u = b - p.breath;
  // look_hill (chapter 2): facing north toward the hill, the head up 1px
  const headY = 2 + u - (p.act === 'look_hill' ? 1 : 0);
  legs(f, p, LEGS);
  shortsFront(f, 18 + b);
  teeFront(f, p, 12 + u, 17 + b, true);
  const armL: ArmSpec = { sx: 2, sy: 15 + u, hx: 0, hy: 2, segs: FOREARM, shift: -1 };
  const armR: ArmSpec = { sx: 13, sy: 15 + u, hx: 0, hy: 2, segs: FOREARM, shift: -1 };
  const lu = p.lookUp ? 1 : 0;
  armTo(f, armL, 2 + lu, 17 + u + lu - swing(p, -1));
  armTo(f, armR, 13 - lu, 17 + u + lu - swing(p, 1));
  headBack(f, p, headY);
  const sway = p.mode === 'idle' ? (p.tick % 4 < 2 ? 0 : -1) : p.mode === 'walk' ? (p.step % 2 ? -1 : 0) : 0;
  ahoge(f, 6, headY - 2 + (p.lookUp ? 2 : 0), sway);
  // key string: 1px at the nape
  f.part('string', { flat: true, rim: false });
  f.px(9, 11 + u);
  // bug net stuck in the back of the tee: the pole crosses his back
  // diagonally and the hoop sticks out top-left, same as from the front
  if (NET !== 'none') {
    f.part('pole', { shade: '', light: '' });
    f.t(0).line(4, 4 + u, 10, 15 + u).t(-1).px(10, 16 + u).t(null);
    f.retone(6, 7 + u, 1).retone(8, 11 + u, 1);
  }
  netHoop(f, 1, 0 + u, false, true, netLag(p));
  if (p.act === 'hold') {
    // package edges peeking out at his sides
    f.part('kraft', { shade: 'rb', light: 't' });
    f.rect(1, 15 + u, 1, 2).rect(14, 15 + u, 1, 2);
  }
}

function side(f: Fig, p: Pose) {
  const b = p.bob;
  const u = b - p.breath;
  const act = p.act;
  const lean = p.run ? -1 : 0;
  const headY = 2 + u + (act === 'hurt' ? 1 : 0);
  // net along the back, hoop above-right
  if (NET !== 'none') {
    f.part('pole', { shade: 'r', light: '' });
    f.line(10 + lean, 14 + u, 12 + lean, 4 + u);
  }
  const lag = netLag(p);
  netHoop(f, 11 + lean, 0 + u, true, false, [-lag[0], lag[1]]);
  const sw = p.mode === 'walk' || p.mode === 'run' ? [0, 1, 0, -1][p.step % 4] * (p.run ? 2 : 1) : 0;
  // far arm
  armTo(f, { sx: 8 + lean, sy: 15 + u, hx: 0, hy: 2, segs: FOREARM, shift: -1 }, 8 + lean - sw, 17 + u - (sw ? 1 : 0));
  legs(f, p, { ...LEGS, cx: 8 });
  f.part('shorts', { shade: 'rb', light: '' });
  f.rect(6, 18 + b, 5, 2);
  // tee: narrow shoulders, loose flare toward the hem
  f.part('shirt', { shade: 'rb', light: 't' });
  f.rows(3 + lean, 12 + u, [
    '..#####..',
    '.#######.',
    '.#######.',
    '.########',
    '#########',
  ]);
  for (let yy = 17 + u; yy <= 17 + b; yy++) f.hl(3 + lean, 11 + lean, yy);
  f.part('shirt', { flat: true });
  f.t(-2).px(5 + lean, 12 + u).t(-1).px(10 + lean, 16 + b).px(10 + lean, 17 + b).px(4 + lean, 17 + b).t(null);
  if (p.run) {
    f.part('shirt', { shade: 'rb', light: '' });
    f.px(12, 16 + b).px(12, 17 + b).px(13, 17 + b - (p.step % 2));
  }
  f.part('string', { flat: true, rim: false });
  f.px(5 + lean, 13 + u);
  f.part('key', { flat: true, rim: false });
  f.px(4 + lean, 14 + u);
  // near arm: sleeve cap + forearm
  const slv = (x: number, yy: number) => {
    f.part('shirt', { shade: 'rb', light: 'tl' });
    f.rows(x, yy, ['.##.', '####', '####']);
    f.part('shirt', { flat: true });
    f.t(-2).hl(x, x + 3, yy + 3).t(null);
  };
  if (act === 'give' || act === 'stamp') {
    slv(6 + lean, 12 + u);
    armTo(f, { sx: 6, sy: 15 + u, hx: 0, hy: 0, segs: FOREARM }, 3, 15 + u);
    if (act === 'give') {
      f.part('package', { shade: 'rb', light: 't' });
      f.rect(0, 13 + u, 4, 3);
      f.part('tape', { flat: true, rim: false });
      f.vl(2, 13 + u, 15 + u);
    } else {
      f.part('wood', { shade: 'r', light: 't' });
      f.rect(1, 14 + u, 2, 2);
      f.part('hanko', {});
      f.vl(0, 14 + u, 15 + u);
    }
  } else if (act === 'surprised') {
    slv(6, 11 + u);
    armTo(f, { sx: 6, sy: 13 + u, hx: 0, hy: 0, segs: FOREARM }, 4, 10 + u);
  } else if (act === 'raise') {
    // the near arm straight forward to the pole at chest height (the far
    // hand grips it higher, drawn by raiseNet)
    slv(6 + lean, 12 + u);
    armTo(f, { sx: 6, sy: 14 + u, hx: 0, hy: 0, segs: FOREARM }, 2, 13 + u);
  } else if (act === 'yawn') {
    slv(6, 11 + u);
    armTo(f, { sx: 6, sy: 13 + u, hx: 0, hy: 0, segs: FOREARM }, p.ph === 0 ? 5 : 3, p.ph === 0 ? 6 + u : 10 + u);
  } else if (act === 'hold') {
    slv(6 + lean, 12 + u);
    armTo(f, { sx: 7, sy: 15 + u, hx: 0, hy: 0, segs: FOREARM }, 4, 16 + u);
    f.part('kraft', { shade: 'rb', light: 't' });
    f.rect(1 + lean, 14 + u, 4, 3);
    f.part('tape', { flat: true, rim: false });
    f.vl(3 + lean, 14 + u, 16 + u);
  } else {
    const ax = 6 + lean - (sw > 0 ? 1 : sw < 0 ? -1 : 0);
    slv(ax, 12 + u);
    f.part('skin', { shade: '', light: '' });
    const hx = 7 + lean - sw * 2;
    f.t(0).line(ax + 1 + (sw > 0 ? 0 : 1), 16 + u, hx, 17 + u + (sw ? 0 : 1)).t(null);
  }
  if (act === 'yawn') {
    headSide(f, { ...p, blink: true, blinkClosed: true }, headY - (p.ph === 0 ? 1 : 0));
    f.part('mouth', { flat: true, rim: false });
    f.rect(2, headY + 9 - (p.ph === 0 ? 1 : 0), 2, p.ph === 0 ? 2 : 1);
  } else headSide(f, p, headY);
  const sway = p.mode === 'idle' ? (p.tick % 4 < 2 ? 0 : 1) : p.mode === 'walk' ? (p.step % 2 ? 1 : 0) : 1;
  if (p.lookUp) {
    const [ax, ay] = tilt(8, -1, 7, 9);
    ahoge(f, ax + lean, headY + ay - 1, sway);
  } else ahoge(f, 8 + lean, headY - 2, sway);
  // the net's pole, stuck down the back of his collar, runs diagonally past
  // the back of his head up to the hoop (30_level_art 9.1: seen from the
  // side the pole shows on the back side, not a hoop floating by his head)
  if (NET === 'none') return;
  f.part('pole', { flat: true, rim: false });
  f.t(0).line(10 + lean, 13 + u, 13 + lean, 5 + u).t(null);
  f.part('pole', { flat: true, rim: false });
  f.t(1).px(12 + lean, 8 + u).t(null);
}

/** Slumped over a desk (opening). 'up' = seen from behind. */
function sleepPose(f: Fig, p: Pose) {
  const y = p.ph ? 1 : 0;
  if (p.view === 'up') {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(3, 12 + y, 10, 7 - y);
    f.rect(2, 10 + y, 12, 3);
    f.part('skin', { shade: 'rb', light: '' });
    f.rect(1, 10 + y, 2, 2).rect(13, 10 + y, 2, 2);
    f.part('hair', { shade: '', light: '' });
    f.rows(2, 4 + y, [
      '...HHhhh....',
      '.HKKHhhhhd..',
      'HKHhhhhhhhd.',
      'HhhhhdhhhhdD',
      '.hhhhhhhhhd.',
      '..hdhhdhdd..',
    ], HAIR);
    ahoge(f, 8, 2 + y, 1);
    f.part('pole', { shade: '', light: '' });
    f.t(0).line(4, 5 + y, 10, 14).t(null);
    netHoop(f, 1, 1 + y);
    f.part('shorts', { shade: 'rb', light: '' });
    f.rect(4, 19, 8, 2);
    f.part('skin', { shade: 'r', light: '' });
    f.rect(5, 21, 2, 1).rect(9, 21, 2, 1);
    f.part('sandal', {});
    f.rect(5, 22, 2, 1).rect(9, 22, 2, 1);
    return;
  }
  // front: face buried in his folded arms on the desk (the desk itself is a
  // world prop) — only the crown of his head, the hunched shoulders and the
  // folded arms show; the whole upper body rises 1px with each breath
  f.part('shorts', { shade: 'rb', light: '' });
  f.rect(4, 19, 8, 2);
  f.part('skin', { shade: 'r', light: '' });
  f.rect(5, 21, 2, 1).rect(9, 21, 2, 1);
  f.part('sandal', {});
  f.rect(5, 22, 2, 1).rect(9, 22, 2, 1);
  // hunched back and shoulders around the bowed head
  f.part('shirt', { shade: 'rb', light: 't' });
  f.rows(2, 11 + y, ['..########..', '.##########.', '############', '############']);
  f.rect(3, 15 + y, 10, 4 - y);
  // the crown of the bowed head (no face)
  f.part('hair', { shade: '', light: '' });
  f.rows(3, 7 + y, [
    '...HHhh...',
    '.HKKHhhhd.',
    'HKHhhhhhhd',
    'HhhhhdhhdD',
    'hhdhhhhhdd',
    '.hhhhhhdd.',
  ], HAIR);
  ahoge(f, 7, 5 + y, 1);
  netHoop(f, 1, 3 + y);
  f.part('pole', { shade: '', light: '' });
  f.px(4, 7 + y).px(4, 8 + y);
  // folded arms under the head: sleeves at the sides, two forearms crossed
  f.part('shirt', { shade: 'rb', light: 't' });
  f.rect(0, 13 + y, 3, 3).rect(13, 13 + y, 3, 3);
  f.part('skin', { shade: 'b', light: 't', sepAll: true });
  f.hl(3, 12, 14 + y);
  f.part('skin', { shade: 'b', light: '', shift: -1 });
  f.hl(2, 13, 15 + y);
  f.part('shirt', { flat: true });
  f.t(-2).px(0, 15 + y).px(15, 15 + y).t(null);
}

function draw(f: Fig, p: Pose) {
  // 16×26 canvas: the art is authored on the 16×24 grid and sits on the
  // bottom rows; the 2 extra rows keep the hoop and the ahoge on the canvas
  // while he bobs.
  f.offset(0, 2);
  if (p.act === 'sleep') return sleepPose(f, p);
  if (p.act === 'lantern_set') return lanternSet(f, p);
  if (p.view === 'down') front(f, p);
  else if (p.view === 'up') back(f, p);
  else side(f, p);
}

export const MINATO_SPEC: SpriteSpec = {
  id: 'minato',
  h: 26,
  mats: MINATO_MATS,
  draw,
  run: true,
  idle: breathingIdle(16, [13]),
  extras: {
    surprised: { dirs: 'all', p: { bob: -1 } },
    hurt: { dirs: 'all' },
    give: { dirs: 'all' },
    stamp: { dirs: 'all' },
    hold: { dirs: 'all' },
    hold_up: { dirs: ['down'] },
    smug: { dirs: ['down', 'left', 'right'] },
    bow: { dirs: ['down'] },
    sleep: { dirs: ['up', 'down'] },
  },
  anims: {
    sleep: { frames: [{ ph: 0 }, { ph: 1 }], ms: 900, dir: 'up' },
    wake: { frames: [{ act: 'sleep', ph: 0 }, { act: 'surprised', bob: -1 }, { act: '' }], ms: [300, 350, 200], loop: false, dir: 'up' },
  },
  shadow: 10,
};

registerChar('minato', () => buildSprite(MINATO_SPEC));

// Ending: walking to the crossing with the korokke parcel in both hands.
registerChar('minato_hold', () =>
  buildSprite({
    ...MINATO_SPEC,
    id: 'minato_hold',
    run: false,
    draw: (f, p) => draw(f, { ...p, act: p.act === '' || p.act === 'look_up' ? 'hold' : p.act }),
    extras: { give: { dirs: 'all' } },
    anims: {},
  }),
);

// =============================================================================
// Chapter 2 (52 10.1): the tomato lantern and the new extras.
//
//  minato_ch2      the bug net as in chapter 1, plus the chapter 2 extras
//                  (yawn, look_hill, lantern_set, hold_item)
//  minato_lantern  the hanamaru tomato in the net: a 5×5 lantern (7×6 from
//                  behind) that lags the body by one walk frame; its pixels
//                  and a 12×12 soft light are on the glow layer (charGlow),
//                  and every frame carries its light-pool anchor (lanternOf:
//                  under the net, ≈(−4, −6) from the feet). 'hold_up' raises
//                  the net 12px above his head (anchor 12px up, radius ×1.2).
//  minato_nonet    no net at all (Kanenari is holding it: ending cut 1)
//
// 'minato' itself turns into minato_ch2 / minato_lantern while chapter 2 is
// on (flag_ch2_started; the lantern from flag_ch2_got_tomato until
// flag_ch2_boss_beaten), in place, so the field and every other caller keep
// using charSprite('minato').

/** Frames drawn with the net in mode `m` (the module-level NET is restored after). */
function withNet(m: NetMode, fn: (f: Fig, p: Pose) => void): (f: Fig, p: Pose) => void {
  return (f, p) => {
    const keep = NET;
    NET = m;
    try {
      fn(f, p);
    } finally {
      NET = keep;
    }
  };
}

/**
 * lantern_set (evt_ch2_light, 1.2s, 4 frames): the net comes round to the
 * front → the tomato goes in → the pole goes back over his shoulder → the
 * net lights up.
 */
function lanternSet(f: Fig, p: Pose) {
  const ph = p.ph;
  const u = p.bob - p.breath;
  const keep = NET;
  if (ph >= 2) {
    NET = ph === 2 ? 'dim' : 'lantern';
    front(f, { ...p, act: '' });
    NET = keep;
    // the moment it lights: a brighter, wider flash around the net
    if (ph === 3) f.halo(3, 3 + u, 11, '#FFF6D8', '#F2894B', 0.85);
    return;
  }
  NET = 'none';
  front(f, { ...p, act: 'net_front' });
  // the pole held across his front, the hoop out at his left
  f.part('pole', { shade: 'r', light: 't' });
  f.line(5, 14 + u, 15, 19 + u);
  NET = ph === 0 ? 'empty' : 'dim';
  netHoop(f, 0, 9 + u);
  NET = keep;
  // hands over the pole
  f.part('hand', { shade: 'rb', light: 't' });
  f.rect(5, 15 + u, 2, 2).rect(10, 17 + u, 2, 2);
  if (ph === 1) {
    // the free hand pushes the tomato down into the mesh
    f.part('hand', { shade: 'rb', light: 't' });
    f.rect(4, 9 + u, 2, 2);
  }
}

/**
 * hold_up with the lantern (the barn, the hill): the pole held up with both
 * hands, the net 12px higher than on his back. Drawn on a 16×38 canvas
 * (offset 14) so the raised net fits. Runs inside withNet(), which restores
 * the net mode afterwards.
 */
function raiseNet(f: Fig, p: Pose) {
  f.offset(0, 14);
  // the net is up on the pole now, not on his back
  NET = 'none';
  const u = p.bob - p.breath;
  const lag = netLag(p);
  const RAISE = 12;
  const pool = 18 - RAISE;
  if (p.view === 'down') {
    front(f, { ...p, act: 'raise' });
    f.part('pole', { shade: 'r', light: 't' });
    f.vl(12, -6 + u, 16 + u);
    f.part('hand', { shade: 'rb', light: 't' });
    f.rect(11, 11 + u, 2, 2).rect(12, 2 + u, 2, 2);
    lanternNet(f, 10 + lag[0], -11 + u + lag[1], false, true, pool, 1.2);
    return;
  }
  if (p.view === 'up') {
    back(f, p);
    // from behind: the raised arm and the pole at the viewer's left
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(1, 11 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't', shift: -1 });
    f.vl(1, 4 + u, 10 + u);
    f.part('pole', { shade: 'r', light: 't' });
    f.vl(3, -6 + u, 15 + u);
    f.part('hand', { shade: 'rb', light: 't', shift: -1 });
    f.rect(2, 2 + u, 2, 2).rect(4, 12 + u, 1, 2);
    lanternNet(f, 0 - lag[0], -12 + u + lag[1], true, true, pool, 1.2);
    return;
  }
  // side: the pole upright in front of him
  side(f, { ...p, act: 'raise' });
  f.part('pole', { shade: 'r', light: 't' });
  f.vl(1, -6 + u, 17 + u);
  f.part('hand', { shade: 'rb', light: 't' });
  f.rect(0, 12 + u, 2, 2);
  f.part('hand', { shade: 'rb', light: 't', shift: -1 });
  f.rect(0, 3 + u, 2, 2);
  lanternNet(f, -1 - lag[0], -11 + u + lag[1], false, true, pool, 1.2);
}

/** The chapter 2 extras every Minato variant carries. */
const CH2_EXTRAS: SpriteSpec['extras'] = {
  surprised: { dirs: 'all', p: { bob: -1 } },
  hurt: { dirs: 'all' },
  give: { dirs: 'all' },
  stamp: { dirs: 'all' },
  hold: { dirs: 'all' },
  hold_item: { dirs: ['down'] },
  smug: { dirs: ['down', 'left', 'right'] },
  bow: { dirs: ['down'] },
  yawn: { dirs: ['down', 'left', 'right'] },
};

const CH2_ANIMS: SpriteSpec['anims'] = {
  wake: { frames: [{ act: 'sleep', ph: 0 }, { act: 'surprised', bob: -1 }, { act: '' }], ms: [300, 350, 200], loop: false, dir: 'up' },
  yawn: { frames: [{ ph: 0 }, { ph: 0 }, { ph: 1 }, { ph: 1 }], ms: [260, 420, 260, 300], loop: false, dirs: ['down', 'left', 'right'] },
  // the north-facing wait of stage 2 (h2): breathing, head up 1px
  look_hill: { frames: [{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], ms: 250, dir: 'up' },
  lantern_set: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 3 }], ms: [300, 300, 300, 300], loop: false },
};

function variantSpec(id: string, m: NetMode): SpriteSpec {
  return {
    ...MINATO_SPEC,
    id,
    draw: withNet(m, draw),
    extras: {
      ...CH2_EXTRAS,
      // the item-get pose (the package over his head) keeps its name where
      // hold_up is not the raised lantern
      ...(m === 'lantern' ? {} : { hold_up: { dirs: ['down'] } }),
      sleep: { dirs: ['up', 'down'] },
    },
    anims: { ...CH2_ANIMS, sleep: { frames: [{ ph: 0 }, { ph: 1 }], ms: 900, dir: 'up' } },
    keep: ['#FFF6D8', '#FFE7A3'],
  };
}

function buildVariant(id: string, m: NetMode): CharSprite {
  const s = buildSprite(variantSpec(id, m));
  if (m === 'lantern') {
    // hold_up: the net raised, on a taller canvas (feet still at the bottom)
    const hs = buildSprite({
      ...MINATO_SPEC,
      id: id + ':raise',
      h: 38,
      run: false,
      draw: withNet('lantern', (f, p) => raiseNet(f, { ...p, act: p.act === 'hold_up' ? '' : p.act })),
      extras: { hold_up: { dirs: 'all' } },
      anims: {},
      keep: ['#FFF6D8', '#FFE7A3'],
    });
    s.extra!.hold_up = hs.extraDir!.hold_up!.down!;
    s.extraDir!.hold_up = hs.extraDir!.hold_up!;
    // held up and breathing (actor.pose = 'hold_up')
    const loop: Partial<Record<Dir, CharAnim>> = {};
    for (const d of ['down', 'up', 'left', 'right'] as Dir[]) loop[d] = { frames: hs.idle![d], ms: hs.idleFrameMs ?? 60 };
    s.animsDir!.hold_up = loop;
    s.anims!.hold_up = loop.down!;
  }
  return s;
}

registerChar('minato_ch2', () => buildVariant('minato_ch2', 'empty'));
registerChar('minato_lantern', () => buildVariant('minato_lantern', 'lantern'));
registerChar('minato_nonet', () => buildVariant('minato_nonet', 'none'));

// ---- 'minato' follows the story -------------------------------------------------

const FIELDS = ['walk', 'idle', 'run', 'extra', 'extraDir', 'anims', 'animsDir', 'keep'] as const;
type Fields = Pick<CharSprite, (typeof FIELDS)[number]>;
let own: Fields | null = null;
let shown = '';

/** Which Minato the story calls for right now (chapter 1 → 'minato'). */
export function minatoVariant(): 'minato' | 'minato_ch2' | 'minato_lantern' {
  if (!flag('flag_ch2_started')) return 'minato';
  if (flag('flag_ch2_got_tomato') && !flag('flag_ch2_boss_beaten')) return 'minato_lantern';
  return 'minato_ch2';
}

registerCharSync(() => {
  const want = minatoVariant();
  if (want === shown) return;
  if (!shown && want === 'minato') {
    shown = want;
    return;
  }
  const base = charSprite('minato');
  if (!own) {
    own = {} as Fields;
    for (const k of FIELDS) (own as Record<string, unknown>)[k] = base[k];
  }
  const src: Fields = want === 'minato' ? own : charSprite(want);
  for (const k of FIELDS) (base as unknown as Record<string, unknown>)[k] = src[k];
  shown = want;
});
