// ミナト（主人公, 11）: bed-head with one ahoge, an oversized green tee with a
// mystery-fish print, navy shorts, red beach sandals, a house key on a blue
// string and a bug net stuck in the back of his collar (the hoop pokes out
// top-left of his head in the front view — his silhouette signature).

import { flat, mat, type Fig, type Mats, type RowMap } from '../fig';
import { armTo, legs, swing, type ArmSpec, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, type Pose, type SpriteSpec } from '../rig';
import { registerChar } from '../registry';

export const MINATO_MATS: Mats = {
  skin: mat('#FFD9B8', { shade: '#EBB08E', light: '#FFEBD8', dark: '#C98A6A', rim: '#FFC08E' }),
  hair: mat('#3A2824', { shade: '#291B20', dark: '#1A1118', light: '#5E4034', spec: '#8C6048', rim: '#A05A3C' }),
  shirt: mat('#3FA66B', { shade: '#2E7A52', light: '#6CC48A', dark: '#245A44', spec: '#A6DDB0', rim: '#A8C870' }),
  print: flat('#F4F1E8'),
  printD: flat('#2A5A48'),
  shorts: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1A2754', rim: '#7A6A9A' }),
  sandal: mat('#E84E3C', { shade: '#B8302A', light: '#FF7A5A', dark: '#7A1A22' }),
  string: flat('#4AA8E0'),
  key: flat('#FFD23F'),
  keyD: flat('#C8902A'),
  pole: mat('#C8A06A', { shade: '#A8742A', light: '#E8C890', dark: '#7A5424' }),
  hoop: mat('#B89A6A', { shade: '#8A6A3A', light: '#E0C890' }),
  net: flat('#F4F1E8'),
  eye: flat('#2A1C28'),
  shine: flat('#FFF6D8'),
  mouth: flat('#C87A64'),
  blush: flat('#F9A48A'),
  package: mat('#F4F1E8', { shade: '#D8CCB4', light: '#FFFFFF' }),
  kraft: mat('#E8C890', { shade: '#C8A06A', light: '#F6E0B0', dark: '#8A6A3A' }),
  tape: flat('#E84E3C'),
  hanko: mat('#E23B2E', { shade: '#B8241E', light: '#FF6A4D' }),
  hand: mat('#FFD9B8', { shade: '#EBB08E', light: '#FFE9D4', dark: '#C98A6A' }),
  wood: mat('#D9A441', { shade: '#A8742A', light: '#F6D98A' }),
};

const HAIR: RowMap = { H: ['hair', 1], K: ['hair', 2], d: ['hair', -1], D: ['hair', -2], h: ['hair', 0] };
const SKIN: RowMap = { s: ['skin', 0], S: ['skin', -1], L: ['skin', 1] };

const LEGS: LegSpec = { cx: 8, hip: 20, foot: 22, w: 2, gap: 2, mat: 'skin', shoe: 'sandal', shoeLen: 3 };
const FOREARM: Seg[] = [{ mat: 'skin' }];

/** Bug-net hoop, 4×4 (behind the head in front view). */
function netHoop(f: Fig, x: number, y: number) {
  f.part('hoop', { shade: 'rb', light: 't' });
  f.rows(x, y, ['.##.', '#..#', '#..#', '.##.']);
  f.part('net', { flat: true, rim: false, ol: false });
  f.px(x + 1, y + 1).px(x + 2, y + 2);
}

function ahoge(f: Fig, x: number, y: number, sway: number) {
  f.part('hair', { flat: true, rim: false });
  f.t(0).px(x, y + 1).t(1).px(x + sway, y).t(null);
}

// ---- heads ------------------------------------------------------------------

function headFront(f: Fig, p: Pose, y: number) {
  const up = p.lookUp;
  // face (+ neck when the head tilts back)
  f.part('skin', { shade: 'rb', light: '' });
  if (!up)
    f.rows(3, y + 4, [
      '.########.',
      '##########',
      '##########',
      '##########',
      '.########.',
      '..######..',
    ]);
  else
    f.rows(3, y + 3, [
      '.########.',
      '##########',
      '##########',
      '##########',
      '.########.',
      '..######..',
      '....##....',
    ]);
  // hair (explicit form shading; front view is never mirrored)
  f.part('hair', { shade: '', light: '' });
  if (!up)
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
  else
    f.rows(1, y - 1, [
      '.....HHhhh....',
      '...HKKHhhhhd..',
      '..HKHhhhhhhhd.',
      '.HHhhhhhhhhhdd',
      'hHhhdhhhdhhhdd',
      '.hd.......hdd.',
      '.h.........hd.',
    ], HAIR);
  // eyes
  const ey = y + (up ? 5 : 7);
  f.part('eye', { flat: true, rim: false });
  if (p.act === 'hurt') {
    f.px(4, ey).px(5, ey + 1).px(11, ey).px(10, ey + 1);
  } else if (p.blinkClosed) {
    f.hl(4, 5, ey + 1).hl(10, 11, ey + 1);
  } else if (p.blink || p.act === 'smug') {
    // half-closed (smug = self-satisfied narrow eyes)
    f.px(5, ey + 1).px(10, ey + 1);
    if (p.act === 'smug') f.px(4, ey + 1).px(11, ey + 1);
  } else {
    f.rect(5, ey, 1, 2).rect(10, ey, 1, 2);
  }
  // blush + mouth
  f.part('blush', { flat: true, rim: false });
  f.px(4, ey + 2).px(11, ey + 2);
  f.part('mouth', { flat: true, rim: false });
  if (up) f.rect(7, ey + 3, 2, 1);
  else if (p.act === 'surprised' || p.act === 'hurt') f.rect(7, y + 9, 2, 1);
  else if (p.act === 'smug') f.px(8, y + 9).px(9, y + 8);
  else f.px(8, y + 9);
}

function headBack(f: Fig, p: Pose, y: number) {
  f.part('skin', { shade: 'rb', light: '' });
  f.rect(5, y + 8, 6, 2);
  f.part('hair', { shade: '', light: '' });
  f.rows(1, y, [
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
  ], HAIR);
  void p;
}

function headSide(f: Fig, p: Pose, y: number) {
  const up = p.lookUp;
  f.part('skin', { shade: 'b', light: '' });
  if (!up)
    f.rows(2, y + 4, [
      '.####.....',
      '######....',
      '######....',
      '#######...',
      '.#####....',
      '..###.....',
    ]);
  else
    f.rows(1, y + 3, [
      '...###.....',
      '..#####....',
      '.######....',
      '#######....',
      '.#######...',
      '..#####....',
      '....##.....',
    ]);
  f.part('hair', { shade: 'rb', light: 't' });
  if (!up)
    f.rows(1, y, [
      '.....#####....',
      '...########...',
      '..##########..',
      '.###########-.',
      '##-##########.',
      '.#..-########.',
      '......#######.',
      '.......######.',
      '........###...',
    ]);
  else
    f.rows(1, y - 1, [
      '......#####...',
      '....########..',
      '...##########.',
      '..###########-',
      '.#-.#########.',
      '......#######.',
      '.......######.',
      '.......######.',
      '........###...',
    ]);
  // ear
  f.part('skin', { shade: '', light: '' });
  f.t(-1).px(8, y + (up ? 5 : 6)).t(0).px(8, y + (up ? 6 : 7)).t(null);
  // eye
  f.part('eye', { flat: true, rim: false });
  const ey = y + (up ? 4 : 6);
  const ex = up ? 3 : 4;
  if (p.blinkClosed) f.hl(ex, ex + 1, ey + 1);
  else if (p.blink || p.act === 'smug') f.px(ex, ey + 1);
  else if (p.act === 'hurt') f.px(ex, ey + 1).px(ex + 1, ey);
  else f.rect(ex, ey, 1, 2);
  f.part('blush', { flat: true, rim: false });
  if (!up) f.px(5, y + 8);
  f.part('mouth', { flat: true, rim: false });
  if (up) f.px(2, y + 7);
  else if (p.act === 'surprised' || p.act === 'hurt') f.px(3, y + 9);
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
  const headY = 2 + u + (act === 'hurt' ? 1 : 0);
  netHoop(f, 1, 0 + u);
  f.part('pole', { shade: 'r', light: '' });
  f.px(4, 4 + u);
  legs(f, p, LEGS);
  shortsFront(f, 18 + b);
  const armL: ArmSpec = { sx: 2, sy: 15 + u, hx: 0, hy: 2, segs: FOREARM };
  const armR: ArmSpec = { sx: 13, sy: 15 + u, hx: 0, hy: 2, segs: FOREARM, shift: -1 };
  if (act === 'hold_up') {
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
    armTo(f, armL, 2, 17 + u + swing(p, -1));
    armTo(f, armR, 13, 17 + u + swing(p, 1));
  }
  if (act === 'bow') {
    // a polite bow: the head dips 2px, eyes shut, ahoge flops forward
    headFront(f, { ...p, blink: true, blinkClosed: true }, headY + 2);
    ahoge(f, 6, headY + 1, -1);
    return;
  }
  headFront(f, p, headY);
  const sway = p.mode === 'idle' ? (p.tick % 4 < 2 ? 0 : 1) : p.mode === 'walk' ? (p.step % 2 ? 1 : 0) : p.run ? 1 : 0;
  ahoge(f, 7, headY - 2, sway);
  if (act === 'hold_up') {
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
  const headY = 2 + u;
  legs(f, p, LEGS);
  shortsFront(f, 18 + b);
  teeFront(f, p, 12 + u, 17 + b, true);
  const armL: ArmSpec = { sx: 2, sy: 15 + u, hx: 0, hy: 2, segs: FOREARM, shift: -1 };
  const armR: ArmSpec = { sx: 13, sy: 15 + u, hx: 0, hy: 2, segs: FOREARM, shift: -1 };
  armTo(f, armL, 2, 17 + u - swing(p, -1));
  armTo(f, armR, 13, 17 + u - swing(p, 1));
  headBack(f, p, headY);
  const sway = p.mode === 'idle' ? (p.tick % 4 < 2 ? 0 : -1) : p.mode === 'walk' ? (p.step % 2 ? -1 : 0) : 0;
  ahoge(f, 8, headY - 2, sway);
  // key string: 1px at the nape
  f.part('string', { flat: true, rim: false });
  f.px(9, 11 + u);
  // bug net stuck in the back of the tee: the pole crosses his back
  // diagonally and the hoop sticks out top-left, same as from the front
  f.part('pole', { shade: '', light: '' });
  f.t(0).line(4, 4 + u, 10, 15 + u).t(-1).px(10, 16 + u).t(null);
  f.retone(6, 7 + u, 1).retone(8, 11 + u, 1);
  netHoop(f, 1, 0 + u);
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
  f.part('pole', { shade: 'r', light: '' });
  f.line(10 + lean, 14 + u, 12 + lean, 4 + u);
  netHoop(f, 11 + lean, 0 + u);
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
  headSide(f, p, headY);
  const sway = p.mode === 'idle' ? (p.tick % 4 < 2 ? 0 : 1) : p.mode === 'walk' ? (p.step % 2 ? 1 : 0) : 1;
  ahoge(f, 8 + lean, headY - 2 - (p.lookUp ? 1 : 0), sway);
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
  f.part('shirt', { shade: 'rb', light: 't' });
  f.rect(3, 13 + y, 10, 6 - y);
  f.rect(2, 13, 12, 3);
  f.part('skin', { shade: 'rb', light: 't' });
  f.rect(4, 15, 8, 1);
  f.part('hair', { shade: '', light: '' });
  f.rows(2, 7 + y, [
    '...HHhhh....',
    '.HKKHhhhhd..',
    'HKHhhhhhhhd.',
    'HhhhhdhhhhdD',
    '.hhdhhdhhdd.',
  ], HAIR);
  ahoge(f, 7, 5 + y, 1);
  netHoop(f, 1, 4 + y);
  f.part('shorts', { shade: 'rb', light: '' });
  f.rect(4, 19, 8, 2);
  f.part('skin', { shade: 'r', light: '' });
  f.rect(5, 21, 2, 1).rect(9, 21, 2, 1);
  f.part('sandal', {});
  f.rect(5, 22, 2, 1).rect(9, 22, 2, 1);
}

function draw(f: Fig, p: Pose) {
  if (p.act === 'sleep') return sleepPose(f, p);
  if (p.view === 'down') front(f, p);
  else if (p.view === 'up') back(f, p);
  else side(f, p);
}

export const MINATO_SPEC: SpriteSpec = {
  id: 'minato',
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
