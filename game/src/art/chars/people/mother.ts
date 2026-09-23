// 母 (npc_mother): late 30s. Dark hair pulled back in one ponytail, ivory
// short-sleeved blouse, mustard apron (a red oven mitt peeks out of the
// pocket), long navy skirt, slippers, cooking chopsticks in her right hand.
// Idle (facing the counter, left): chops cabbage — knife up / down every
// 0.25s. Extras: look_up, turn (glances back over her shoulder).

import { flat, mat, type Fig, type Mats } from '../fig';
import { legs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose, type SpriteSpec } from '../rig';
import { registerChar } from '../registry';
import { HAIRMAP, hangArms, head, sideArm, sideSwing, upper, type HeadT } from '../kit';

const M: Mats = {
  skin: mat('#F7CFAE', { shade: '#E0A882', light: '#FFE4CC', dark: '#B87A5E', rim: '#FFBC8A' }),
  hair: mat('#3A2622', { shade: '#291A1C', dark: '#1A1016', light: '#5A3C32', spec: '#7E5646', rim: '#9A5438' }),
  blouse: mat('#E8E4D8', { shade: '#C4BCB0', light: '#FAF6EC', dark: '#9A9088', rim: '#FFD6A8' }),
  apron: mat('#F7C27A', { shade: '#D9974A', light: '#FFDCA0', dark: '#A8702E', rim: '#FFD08A' }),
  apronD: flat('#C8883C'),
  mitt: mat('#E8603C', { shade: '#B8402A', light: '#FF8A5A' }),
  skirt: mat('#3A3F48', { shade: '#2A2C38', light: '#555C68', dark: '#1C1D28', rim: '#7A5A60' }),
  slipper: mat('#D9728A', { shade: '#B04A6A', light: '#F0A0B0' }),
  eye: flat('#2A1C28'),
  brow: flat('#4A322C'),
  mouth: flat('#C06A5A'),
  blush: flat('#F4A08C'),
  shine: flat('#FFF6D8'),
  stick: flat('#D9A441'),
  blade: mat('#C0C6CC', { shade: '#8A909A', light: '#F4F1E8' }),
  handle: flat('#6A4A2A'),
  band: flat('#B8302A'),
};

const HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, [
    '...HHhh...',
    '.HKHhhhhd.',
    'HHhhhhhhdd',
    'Hhh-....dd',
    'hd......dd',
    'h........d',
  ], HAIRMAP],
  eyesD: { x: 6, d: 3, y: 5, h: 2, brow: { dy: -1, mat: 'brow', w: 1 } },
  mouthD: [7, 7, 2],
  blushD: [5, 10, 7],
  neckD: [7, 9, 2],
  hairU: [3, 0, [
    '...HHhh...',
    '.HKHhhhhd.',
    'HHhhhhhhdd',
    'Hhhhhhhhdd',
    'hhhhhhhhdd',
    'hhhh==hhdd',
    '.hhhhhhdd.',
    '..hhhhdd..',
  ], { ...HAIRMAP, '=': ['band', null] }],
  napeU: [5, 7, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 0, [
    '...####...',
    '.########.',
    '##########',
    '#-..######',
    '.....#####',
    '......###.',
  ]],
  eyeL: { x: 4, y: 5, h: 2, brow: { dy: -1, mat: 'brow', w: 1 } },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 7],
  neckL: [5, 9, 2],
};

const LEGS: LegSpec = { cx: 8, hip: 21, foot: 22, w: 2, gap: 2, mat: 'skirt', shoe: 'slipper', shoeLen: 3 };
const SLEEVE: Seg[] = [{ mat: 'blouse', n: 2 }, { mat: 'skin' }];

function ponytailSide(f: Fig, y: number, sw: number) {
  f.part('hair', { shade: 'rb', light: 't' });
  f.px(12, y + 3).px(13, y + 4).px(13, y + 5).px(13 + sw, y + 6).px(12, y + 4);
  f.part('band', { flat: true, rim: false });
  f.px(12, y + 3);
}

function skirtFront(f: Fig, p: Pose, top: number) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const flare = st === 1 ? -1 : st === 3 ? 1 : 0;
  f.part('skirt', { shade: 'rb', light: '' });
  for (let y = top; y <= 21; y++) {
    const t = (y - top) / (21 - top);
    const w = t > 0.6 ? 1 : 0;
    f.hl(4 - w + (y === 21 ? flare : 0), 11 + w + (y === 21 ? flare : 0), y);
  }
  f.t(-1).vl(8, top + 2, 21).t(null);
}

function front(f: Fig, p: Pose) {
  const u = upper(p);
  const hy = 2 + u;
  legs(f, p, LEGS);
  skirtFront(f, p, 16 + p.bob);
  // blouse
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(4, 11, 11 + u);
  f.rect(3, 12 + u, 10, 2);
  f.rect(4, 14 + u, 8, 16 + p.bob - (14 + u) + 1);
  // apron bib + skirt panel
  f.part('apron', { shade: 'rb', light: 't' });
  f.rect(5, 12 + u, 6, 16 + p.bob - (12 + u) + 1);
  f.rect(4, 16 + p.bob, 8, 5);
  f.part('apronD', { flat: true, rim: false });
  f.hl(4, 11, 16 + p.bob);
  f.hl(6, 9, 18 + p.bob);
  f.part('mitt', { shade: 'r', light: 't' });
  f.px(9, 17 + p.bob).px(10, 17 + p.bob);
  // arms + chopsticks
  hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 16, segs: SLEEVE }, u);
  if (p.act !== 'look_up') {
    f.part('stick', { flat: true, rim: false });
    f.px(2, 16 + u).px(2, 17 + u).px(1, 18 + u);
  }
  head(f, p, HEAD, hy);
}

function back(f: Fig, p: Pose) {
  const u = upper(p);
  legs(f, p, LEGS);
  skirtFront(f, p, 16 + p.bob);
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(4, 11, 11 + u);
  f.rect(3, 12 + u, 10, 2);
  f.rect(4, 14 + u, 8, 16 + p.bob - (14 + u) + 1);
  // apron straps crossing + bow at the waist
  f.part('apron', { shade: 'rb', light: 't' });
  f.px(5, 12 + u).px(6, 13 + u).px(10, 12 + u).px(9, 13 + u);
  f.hl(4, 11, 16 + p.bob);
  f.rows(6, 15 + p.bob, ['#..#', '.##.', '#..#']);
  if (p.act === 'chop') {
    // at the cutting board (facing north): the knife arm pumps up and down
    hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 16, segs: SLEEVE }, u, 'L');
    const up = p.ph === 0;
    f.part('blouse', { shade: 'rb', light: 't', shift: -1 });
    f.rect(12, 12 + u, 2, 2);
    f.part('skin', { shade: 'r', light: '', shift: -1 });
    if (up) f.px(13, 14 + u).px(12, 14 + u).px(11, 13 + u);
    else f.px(13, 14 + u).px(13, 15 + u).px(12, 16 + u);
    f.part('blade', { flat: true, rim: false });
    if (up) f.px(10, 12 + u);
  } else hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 16, segs: SLEEVE }, u);
  if (p.act === 'turn') {
    // glancing back over her shoulder: profile on the back view
    head(f, { ...p, view: 'left' }, HEAD, 2 + u);
    ponytailSide(f, 2 + u, 0);
    return;
  }
  head(f, p, HEAD, 2 + u);
  // ponytail hanging down the back of the head; it swings a beat behind
  const sw = p.mode === 'idle' ? (p.tick % 4 < 2 ? 0 : 1) : p.mode === 'walk' ? [0, 1, 0, -1][p.step % 4] : 0;
  f.part('hair', { shade: 'r', light: '' });
  f.rect(7, 8 + u, 2, 2);
  f.px(7 + sw, 10 + u).px(8 + sw, 10 + u).px(7 + sw, 11 + u);
}

function side(f: Fig, p: Pose) {
  const u = upper(p);
  const act = p.act;
  const sw = sideSwing(p);
  if (act !== 'chop') sideArm(f, 8, 13 + u, 3, -sw, SLEEVE, -1);
  legs(f, p, { ...LEGS });
  // skirt
  f.part('skirt', { shade: 'rb', light: '' });
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  for (let y = 16 + p.bob; y <= 21; y++) f.hl(5 - (y > 18 ? 1 : 0) - (y === 21 && st === 1 ? 1 : 0), 10 + (y > 19 ? 1 : 0), y);
  // blouse + apron front
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 16 + p.bob - (12 + u) + 1);
  f.part('apron', { shade: 'r', light: '' });
  f.vl(5, 13 + u, 20);
  f.vl(4, 17 + p.bob, 20);
  f.part('apronD', { flat: true, rim: false });
  f.hl(5, 10, 16 + p.bob);
  f.part('apron', { flat: true, rim: false });
  f.px(11, 16 + p.bob).px(12, 16 + p.bob).px(12, 17 + p.bob);
  const hy = 2 + u;
  if (act === 'chop') {
    // near arm raised holding the knife over the cutting board
    const up = p.ph === 0;
    f.part('blouse', { shade: 'rb', light: 't' });
    f.rect(7, 12 + u, 3, 2);
    f.part('skin', { shade: '', light: '' });
    f.t(0).line(7, 14 + u, 4, up ? 13 + u : 15 + u).t(null);
    f.part('handle', { flat: true, rim: false });
    f.px(3, up ? 13 + u : 15 + u);
    f.part('blade', { shade: 'r', light: 'l' });
    if (up) f.vl(2, 11 + u, 13 + u);
    else f.hl(0, 2, 16 + u);
    // far hand steadies the cabbage
    f.part('skin', { shade: '', light: '', shift: -1 });
    f.px(3, 17 + u);
  } else {
    f.part('blouse', { shade: 'rb', light: 'tl' });
    f.rect(7, 12 + u, 3, 2);
    sideArm(f, 8, 14 + u, 2, sw, [{ mat: 'skin' }]);
  }
  if (act === 'turn') {
    head(f, { ...p, view: 'down' }, HEAD, hy, 0);
    f.part('hair', { shade: 'r', light: '' });
    f.px(13, hy + 4).px(13, hy + 5);
    return;
  }
  head(f, p, HEAD, hy);
  ponytailSide(f, hy, p.mode === 'walk' && p.step % 2 ? 1 : 0);
}

function draw(f: Fig, p: Pose) {
  if (p.view === 'down') front(f, p);
  else if (p.view === 'up') back(f, p);
  else side(f, p);
}

const CHOP: IdleKey[] = [
  ...rep([{ act: 'chop', ph: 0 }, { act: 'chop', ph: 1 }], 6),
  { act: 'chop', ph: 0, blink: true }, { act: 'chop', ph: 1 }, { act: 'chop', ph: 0 }, { act: 'chop', ph: 1 },
];

registerChar('npc_mother', () =>
  buildSprite({
    id: 'npc_mother',
    mats: M,
    draw,
    idle: { left: CHOP, right: CHOP, down: breathingIdle(16, [9]), up: CHOP },
    extras: {
      turn: { dirs: ['up', 'left', 'right'] },
      chop: { dirs: ['up', 'left', 'right'] },
      surprised: { dirs: ['down'] },
    },
    anims: {
      chop: { frames: [{ ph: 0 }, { ph: 1 }], ms: 250, dir: 'up' },
    },
  } satisfies SpriteSpec),
);
