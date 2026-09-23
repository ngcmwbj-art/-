// カネナリくん: the town's retired mascot suit. Brass bell head (the upper
// 12px) with dot eyes and cheeks, the clapper visible in the bell's mouth, a
// fluffy sunset-orange body with a dithered outline, a white "PR大使" sash
// (three red ticks) and a slightly open zipper on the back (pitch dark inside).
// Waddle walk with a 2px bounce; the bell sways a little and the clapper
// swings the other way. Canvas 16×26 (2px of headroom for the bounce).

import { flat, mat, type Fig, type Mats } from '../fig';
import { buildSprite, rep, type IdleKey, type Pose, type SpriteSpec } from '../rig';
import { charSprite, registerChar } from '../registry';
import { C } from '../palette';

export const KANENARI_MATS: Mats = {
  brass: mat('#D9A441', { shade: '#A8742A', light: '#F6D98A', spec: '#FFF6D8', dark: '#7A5424', rim: '#FFC46A', ol: '#4A2E22' }),
  brassD: mat('#B8843A', { shade: '#8A5E24', light: '#E0B45A', dark: '#5A3A1A', rim: '#F0A860', ol: '#4A2E22' }),
  bellIn: flat('#2E1C16'),
  clapper: mat('#9A6A2A', { shade: '#6A4A1A', light: '#C89A4A', dark: '#4A3010' }),
  fur: mat('#F2894B', { shade: '#C8643A', light: '#F7A86A', spec: '#FFC890', dark: '#A04E2E', rim: '#FFB878', ol: '#5A2A2E', soft: true }),
  furD: mat('#C8643A', { shade: '#9A4A2A', light: '#E07848', dark: '#7A3A24', ol: '#4A2428' }),
  sash: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFFFFF', dark: '#B8AC98' }),
  red: flat('#E84E3C'),
  zip: flat('#C0C6CC'),
  zipD: flat('#8A909A'),
  void: flat(C.ink),
  eye: flat('#2A1E1A'),
  cheek: flat('#F08A7A'),
  board: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFFFFF', dark: '#A89C88' }),
  boardE: flat('#C8BCA8'),
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
  const x0 = 1;
  // hanging loop
  f.part('brassD', { shade: 'r', light: 't' });
  f.rows(x0 + 5 + sway, y0, ['.##.', '#..#']);
  // dome
  f.part('brass', { shade: '', light: '' });
  for (let j = 0; j < DOME.length; j++) {
    const sh = j < 2 ? sway : 0;
    f.rows(x0 + sh, y0 + 2 + j, [DOME[j]]);
  }
  // metallic form shading (explicit; mirrored side views keep it symmetric enough)
  const L = face === 'back' ? 0 : 0;
  const d = (x: number, y: number, t: number) => f.retone(x0 + x, y0 + 2 + y, t);
  // right side falloff
  for (let j = 0; j < DOME.length; j++) {
    const r = DOME[j].lastIndexOf('#');
    const sh = j < 2 ? sway : 0;
    d(r + sh, j, -1);
    if (j >= 2) d(r - 1 + sh, j, j >= 4 ? -1 : 0);
    if (j >= 4) d(r - 2 + sh, j, 0);
  }
  // vertical highlight band on the left + spec
  for (let j = 1; j < DOME.length; j++) {
    const l = DOME[j].indexOf('#');
    const sh = j < 2 ? sway : 0;
    d(l + 1 + sh + L, j, 1);
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
    const ey = y0 + (p.lookUp ? 5 : 6);
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

/** Fluffy body (soft dithered outline comes from the material). */
function body(f: Fig, y: number, rx = 5.5, shift = 0) {
  f.part('fur', { shade: 'rb', light: 't', shift });
  f.ell(8, y + 4.5, rx, 4.6);
  // soft fur highlight on the upper-left of the tummy
  f.retone(4, y + 3, 1).retone(5, y + 2, 1);
}

function sashFront(f: Fig, y: number) {
  f.part('sash', { shade: '', light: '' });
  const pts: [number, number][] = [];
  for (let i = 0; i < 7; i++) pts.push([11 - i, y + i], [12 - i, y + i]);
  for (const [x, yy] of pts) f.t(x === 11 - (yy - y) ? 0 : -1).px(x, yy);
  f.t(null);
  f.part('red', { flat: true, rim: false });
  f.px(10, y + 1).px(8, y + 3).px(6, y + 5);
}

function feet(f: Fig, p: Pose, side = false) {
  f.part('furD', { shade: 'rb', light: 't' });
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const y = H - 3;
  if (!side) {
    const l = st === 1 ? 1 : 0;
    const r = st === 3 ? 1 : 0;
    f.rows(4, y - l, ['.##', '###']);
    f.rows(9, y - r, ['##.', '###']);
  } else {
    const a = st === 1 ? -1 : st === 3 ? 1 : 0;
    f.part('furD', { shade: 'rb', light: 't', shift: -1 });
    f.rows(7 - a, y, ['.##', '###']);
    f.part('furD', { shade: 'rb', light: 't' });
    f.rows(5 + a, y, ['.##', '###']);
  }
}

function mitten(f: Fig, x: number, y: number, shift: number) {
  f.part('fur', { shade: 'rb', light: 't', shift });
  f.rows(x, y, ['##', '##']);
}

function front(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const u = p.bob - p.breath;
  const act = p.act;
  const sway = walking ? (st === 1 ? -1 : st === 3 ? 1 : 0) : act === 'wave' ? (p.ph % 2 ? 1 : 0) : 0;
  const by = TOP + u + (act === 'hurt' ? 1 : 0);
  const bodyY = 14 + Math.max(u, -1);
  feet(f, p);
  // far-side arms behind the body when raised
  body(f, bodyY);
  sashFront(f, bodyY + 1);
  const ay = bodyY + 4;
  if (act === 'pose') {
    mitten(f, 0, ay - 4, 0);
    mitten(f, 14, ay - 4, -1);
    f.part('fur', { shade: 'rb', light: 't' });
    f.px(2, ay - 3).px(13, ay - 3);
  } else if (act === 'wave') {
    mitten(f, 2, ay, 0);
    mitten(f, 13 + (p.ph % 2), ay - 5, -1);
    f.part('fur', { shade: 'rb', light: '', shift: -1 });
    f.px(13, ay - 3).px(13, ay - 2);
  } else if (act === 'point') {
    mitten(f, 2, ay, 0);
    f.part('fur', { shade: 'rb', light: 't', shift: -1 });
    f.px(13, ay - 1).px(14, ay - 2).px(14, ay - 3);
    f.rect(14, ay - 5, 2, 2);
  } else if (act === 'flip') {
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
  } else if (act === 'surprised') {
    mitten(f, 0, ay - 3, 0);
    mitten(f, 14, ay - 3, -1);
  } else {
    const swing = walking ? (st === 1 ? 1 : st === 3 ? -1 : 0) : 0;
    mitten(f, 1, ay + swing, 0);
    mitten(f, 13, ay - swing, -1);
  }
  bell(f, by, sway, 'front', p);
  if (act === 'glow') {
    f.after((pc) => {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          if (pc.alpha(x, y) !== 0) continue;
          const n = [pc.alpha(x - 1, y), pc.alpha(x + 1, y), pc.alpha(x, y - 1), pc.alpha(x, y + 1)].some((a) => a > 0);
          if (n) pc.set(x, y, (x + y) % 2 ? '#FFE7A3CC' : '#FFF6D8EE');
        }
    });
  }
}

function back(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const u = p.bob - p.breath;
  const sway = walking ? (st === 1 ? 1 : st === 3 ? -1 : 0) : 0;
  const by = TOP + u;
  const bodyY = 14 + Math.max(u, -1);
  feet(f, p);
  const swing = walking ? (st === 1 ? -1 : st === 3 ? 1 : 0) : 0;
  mitten(f, 1, bodyY + 4 + swing, -1);
  mitten(f, 13, bodyY + 4 - swing, -1);
  body(f, bodyY, 5.5, 0);
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
  const sway = walking ? (st === 1 ? -1 : st === 3 ? 1 : 0) : 0;
  const by = TOP + u + (act === 'hurt' ? 1 : 0);
  const bodyY = 14 + Math.max(u, -1);
  const swing = walking ? (st === 1 ? 1 : st === 3 ? -1 : 0) : 0;
  mitten(f, 9 + swing, bodyY + 4, -1);
  feet(f, p, true);
  body(f, bodyY, 5);
  // zipper along the back (right edge), a sliver of dark at the top
  f.part('zip', { flat: true, rim: false });
  f.vl(12, bodyY + 2, bodyY + 6);
  f.part('void', { flat: true, rim: false });
  f.px(12, bodyY + 2).px(12, bodyY + 3);
  // sash over the near shoulder
  f.part('sash', { shade: '', light: '' });
  for (let i = 0; i < 5; i++) f.t(0).px(6 + i, bodyY + 1 + i).t(-1).px(5 + i, bodyY + 1 + i);
  f.t(null);
  f.part('red', { flat: true, rim: false });
  f.px(7, bodyY + 2).px(9, bodyY + 4);
  // near arm
  if (act === 'point' || act === 'wave') {
    f.part('fur', { shade: 'rb', light: 't' });
    f.px(5, bodyY + 3).px(4, bodyY + 2);
    mitten(f, 2, bodyY - (act === 'wave' ? 1 + (p.ph % 2) : 1), 0);
  } else if (act === 'flip') {
    f.part('board', { shade: 'rb', light: 'tl' });
    f.rect(0, bodyY - 1, 4, 8);
    f.part('boardE', { flat: true, rim: false });
    f.vl(3, bodyY - 1, bodyY + 6);
    mitten(f, 3, bodyY + 2, 0);
  } else mitten(f, 6 - swing, bodyY + 4, 0);
  bell(f, by, sway, 'side', p);
}

function bowPose(f: Fig, p: Pose) {
  // deep bow toward the viewer: the bell tips forward, we see its crown
  const d = p.ph;
  feet(f, p);
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

function draw(f: Fig, p: Pose) {
  if (p.act === 'bow') return bowPose(f, p);
  if (p.act === 'zipper') return back(f, p);
  if (p.view === 'down') front(f, p);
  else if (p.view === 'up') back(f, p);
  else side(f, p);
}

// idle: soft bounce-breathing; now and then waves at nobody in particular
const IDLE: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 3),
  { act: 'wave', ph: 0 }, { act: 'wave', ph: 1 }, { act: 'wave', ph: 0 }, { act: 'wave', ph: 1 },
  { breath: 0, blink: true }, { breath: 0 }, { breath: 1 }, { breath: 1 },
];

export const KANENARI_SPEC: SpriteSpec = {
  id: 'kanenari',
  h: H,
  mats: KANENARI_MATS,
  draw,
  walkFrameMs: 150,
  walkBob: [0, -2, 0, -2],
  idle: { down: IDLE, left: IDLE, right: IDLE, up: rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 4) },
  extras: {
    flip: { dirs: 'all' },
    pose: { dirs: ['down'] },
    point: { dirs: ['down', 'left', 'right'] },
    wave: { dirs: ['down', 'left', 'right'] },
    surprised: { dirs: ['down'], p: { bob: -1 } },
    hurt: { dirs: ['down'] },
    happy: { dirs: ['down'] },
    glow: { dirs: ['down'] },
    zipper: { dirs: ['up'] },
  },
  anims: {
    bow: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 1 }, { ph: 0 }], ms: [120, 500, 120, 120], loop: false },
    wave: { frames: [{ ph: 0 }, { ph: 1 }], ms: 200 },
    glow: { frames: [{ act: 'glow' }, { act: '' }, { act: 'glow' }, { act: '' }], ms: [260, 200, 260, 400], loop: false },
    pose: { frames: [{ act: '' }, { act: 'pose', bob: -2 }, { act: 'pose' }], ms: [80, 120, 600], loop: false },
  },
  shadow: 12,
};

registerChar('kanenari', () => buildSprite(KANENARI_SPEC));
registerChar('npc_kanenari', () => ({ ...charSprite('kanenari'), id: 'npc_kanenari' }));
