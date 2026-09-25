// ふくじんづけ (npc_hoshi_gon, 52 10.4): マサルさん's dog, a male papillon.
// 14×12, 8px at the shoulder — a size smaller than the town's shiba コタロウ.
// The silhouette is the ears: two big upright triangles spread like a
// butterfly's wings, their outer edges feathered with long fringe (white
// and tan 1px tufts). White coat with tan patches (#A8742A / #7A5424):
// the face and ears tan with a white blaze from the brow down the muzzle,
// two patches on the body, white chest (a 2px frill) and legs; the plumed
// tail curls up over the back, white with a tan tip. Red collar, a tiny
// gold tag. Eyes are dots, no mouth line (like the other animals).
//
// Held poses (all direction-aware, breathing): 'lie' (belly down on the
// barn floor; one eye opens now and then, the ears stay up), 'sit' (the
// head and ears turn after the lantern, left–right), 'stand_n' (facing
// north, the ears pricked). Anims: 'bark' (2 frames, the fringe flicks),
// 'wag', 'ear' (one ear twitches). extra look_up / look_hill.

import { flat, mat, type Fig, type Mats } from './fig';
import { buildSprite, rep, type IdleKey, type Pose } from './rig';
import { registerChar } from './registry';
import { paintRows, type Legend } from './kit';

const DOG: Mats = {
  white: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  tan: mat('#A8742A', { shade: '#7A5424', light: '#C8A06A', dark: '#5A3A2A' }),
  nose: flat('#2A2440'),
  eye: flat('#2A2440'),
  collar: flat('#E84E3C'),
  tag: flat('#D9A441'),
  inner: flat('#E8A08C'),
  mouth: flat('#8A2E3A'),
};

const L: Legend = {
  H: ['white', 1], W: ['white', 0], w: ['white', -1], v: ['white', -2],
  T: ['tan', 1], B: ['tan', 0], b: ['tan', -1], D: ['tan', -2],
  n: ['nose', 0], e: ['eye', 0], c: ['collar', 0], g: ['tag', 0], p: ['inner', 0], m: ['mouth', 0],
};
const ORDER = ['white', 'tan', 'inner', 'collar', 'tag', 'nose', 'eye', 'mouth'];

function paint(f: Fig, x: number, y: number, rows: string[]) {
  paintRows(f, x, y, rows, L, ORDER);
}

// ---- side (facing left) -----------------------------------------------------------
//
// The head at the left with the far ear behind the near one, both swept up
// and back; the tail's plume arches over the rump.

const SIDE_HEAD = [
  '......ww..',
  '.....bBw..',
  '....bBBBw.',
  '....BBpBw.',
  '..bBBBBbw.',
  '.BBeBBBb..',
  'WWWWBBb...',
  'nWWww.....',
];
const SIDE_HEAD_UP = [
  '....ww....',
  '...bBw....',
  '..bBBBw...',
  '..BBpBw...',
  'WbBBBbw...',
  'nWeBBBb...',
  '.WWBBb....',
  '..wwb.....',
];
const SIDE_HEAD_BARK = [
  '.....ww...',
  '....bBw...',
  '...bBBBw..',
  '...BBpBw..',
  '.bBBBBbw..',
  'BBeBBBb...',
  'WWWWBBb...',
  'nmmww.....',
];
const SIDE_HEAD_SHUT = SIDE_HEAD.map((r, i) => (i === 5 ? '.BBbBBBb..' : r));
// body (rows 5..8 of the frame), tail plume over the back
const SIDE_BODY = [
  '.....HWWBBWWH.',
  '....HWWBbbWWWw',
  '.....WWWWWWWw.',
  '.....wWWWWwww.',
];
const SIDE_TAIL = [
  '..HH.',
  '.HWWH',
  'HWWww',
  'WWw.B',
  'Ww...',
];

function side(f: Fig, p: Pose) {
  const act = p.act;
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const by = p.mode === 'walk' && st % 2 ? -1 : 0;
  const wag = act === 'wag' ? p.ph : 0;
  if (act === 'lie' || act === 'lie_eye') {
    // stretched out on the floor, the head up, the ears still up
    paint(f, 3, 7, ['..HWWBBWWHH.', '.WWWWBbbWWWw', 'wwWWWWWWWwwv']);
    paint(f, 11, 4, ['.HH', 'HWW', 'WWw']);
    paint(f, 0, 10, ['WWW.........', ]);
    paint(f, 0, 2, act === 'lie_eye' ? SIDE_HEAD : SIDE_HEAD_SHUT);
    paint(f, 5, 9, ['cc']);
    return;
  }
  const sit = act === 'sit' || act === 'sit_l' || act === 'sit_r';
  if (sit) {
    // haunches down, forelegs straight, the tail curled round beside him
    paint(f, 4, 5, ['..HWBBWW..', '.HWWBbbWW.', '.WWWWWWWWw', '..WWWWWwww', '..Ww..wwv.', '..W...ww..']);
    paint(f, 10, 2, ['.HH.', 'HWWH', 'WWww']);
    paint(f, 5, 11, ['ww...']);
    paint(f, 0, 0, p.blink ? SIDE_HEAD_SHUT : SIDE_HEAD);
    paint(f, 5, 7, ['cc', '.g']);
    return;
  }
  // legs: the far pair a step darker, 1px thin; a lifted paw per step
  const lf = st === 1 ? -1 : st === 3 ? 1 : 0;
  f.part('white', { shade: '', light: '', shift: -1 });
  f.rect(5 - lf, 9 + by, 1, 2 - by).rect(11 + lf, 9 + by, 1, 2 - by);
  f.part('white', { shade: 'r', light: '' });
  f.rect(4 + lf, 9 + by, 1, 2 - by).rect(10 - lf, 9 + by, 1, 2 - by);
  paint(f, 0, 5 + by, SIDE_BODY);
  paint(f, 9 + wag, 1 + by, SIDE_TAIL);
  const head = p.lookUp ? SIDE_HEAD_UP : act === 'bark' && p.ph ? SIDE_HEAD_BARK : p.blink ? SIDE_HEAD_SHUT : SIDE_HEAD;
  paint(f, 0, by, head);
  // the collar and its tag under the jaw
  paint(f, 5, 7 + by, ['cc', '.g']);
}

// ---- front ------------------------------------------------------------------------
//
// Head and ears make the butterfly: each ear a 5×5 triangle leaning out,
// fringe tufts on its outer edge; the white blaze down the middle.

const FRONT_HEAD = [
  'w...........w.',
  'Hb.........bw.',
  'TBb.......BBw.',
  '.TBBp...pBBb..',
  '.TTBBBWBBBbb..',
  '..TBBBWBBBb...',
  '...BeBWBeBb...',
  '...BBWWWBb....',
  '....wWnWw.....',
];
const FRONT_HEAD_UP = [
  'w...........w.',
  'Hb.........bw.',
  'TBb.......BBw.',
  '.TBBp...pBBb..',
  '.TTBBeWBeBbb..',
  '..TBBWWWBb....',
  '...BBWnWBb....',
  '....wWWWw.....',
];
const FRONT_HEAD_TURN = [
  // head turned to follow the light (the far ear narrower)
  'w..........w..',
  'Hb........bw..',
  'TBb......BBw..',
  '.TBBp..pBBb...',
  '.TTBBWBBBbb...',
  '..TBeWBeBb....',
  '..BBWWWBb.....',
  '..nWWWw.......',
];

function front(f: Fig, p: Pose) {
  const act = p.act;
  const back = p.view === 'up';
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const by = p.mode === 'walk' && st % 2 ? -1 : 0;
  const l = st === 1 ? 1 : 0;
  const r = st === 3 ? 1 : 0;
  const lie = act === 'lie' || act === 'lie_eye';
  const sit = act === 'sit' || act === 'sit_l' || act === 'sit_r';
  if (back) {
    // from behind: rump, the tail plume on it, the ears over the head
    f.part('white', { shade: 'r', light: '' });
    f.rect(4, 9, 1, 2 - l).rect(9, 9, 1, 2 - r);
    paint(f, 3, 4 + by, ['.HWBBWw.', 'HWBbbBWw', 'WWBbbWWw', 'WWWWWWww', '.wWWWww.']);
    paint(f, 4, 3 + by, ['.HHWW.', 'HWWWwH', '.WWww.']);
    const hy = (p.lookUp ? 1 : 0) + by + (p.act === 'look_hill' ? -1 : 0);
    const ear = act === 'ear' ? 1 : 0;
    paint(f, 0, -1 + hy, ['w...........w.', 'Hb.........bw.', 'TBb.......BBw' + (ear ? 'w' : '.'), '.TBBB...BBBb..', '.TTBBBBBBBbb..', '..TBBBBBBBb...', '...cccccgc....']);
    return;
  }
  if (lie) {
    // lying on the blanket facing us: paws forward, the body behind
    paint(f, 2, 7, ['.HWWBBWWWw.', 'HWWWBbWWWww', 'WWWWWWWWwwv']);
    paint(f, 3, 10, ['WW...WW...']);
    const eye = act === 'lie_eye';
    const head = FRONT_HEAD.map((r, i) => (i === 6 ? (eye ? '...BeBWBbBb...' : '...BbBWBbBb...') : r));
    paint(f, 0, 0, head);
    paint(f, 5, 8, ['ccgc']);
    return;
  }
  if (sit) {
    // sitting: forelegs straight, haunches wide either side
    paint(f, 2, 6, ['.HWWWWWWw.', 'HWWWWWWWww', 'WWBWWWWBww', 'wW.WWww.wv', '...W..w...', '..ww..ww..']);
    const turn = act === 'sit_l' || act === 'sit_r';
    const head = turn ? FRONT_HEAD_TURN : FRONT_HEAD;
    if (act === 'sit_r') {
      // mirror the turned head to the other side
      paint(f, 0, -1, head.map((r) => r.split('').reverse().join('')));
    } else paint(f, act === 'sit_l' ? 0 : 0, -1, head);
    paint(f, 5, 7, ['ccgc']);
    return;
  }
  // standing / walking: four thin legs, the chest frill between the forelegs
  f.part('white', { shade: 'r', light: '', shift: -1 });
  f.rect(3, 9 + by, 1, 2 - by - r).rect(10, 9 + by, 1, 2 - by - l);
  f.part('white', { shade: 'r', light: '' });
  f.rect(5, 9, 1, 2 - l).rect(8, 9, 1, 2 - r);
  paint(f, 2, 5 + by, ['.HWWWWWWw.', 'HWWBWWWBww', 'WWWWWWWWww', '.wWWwwWww.']);
  // tail plume peeking over the back behind the head
  paint(f, 9, 2 + by, ['.HH', 'HWW', 'WWw']);
  const head = p.lookUp ? FRONT_HEAD_UP : FRONT_HEAD;
  paint(f, 0, -2 + by - (act === 'bark' && p.ph ? 1 : 0), head);
  if (p.blink && !p.lookUp) paint(f, 4, 4 + by, ['b...b']);
  if (act === 'bark' && p.ph) paint(f, 6, 6 + by, ['m']);
  if (act === 'ear') paint(f, 11, -2 + by, ['.w', 'bw']);
  paint(f, 5, 7 + by, ['ccgc']);
}

function draw(f: Fig, p: Pose) {
  if (p.view === 'left') side(f, p);
  else front(f, p);
}

// lie: breathing, now and then one eye opens (h0)
const LIE: IdleKey[] = [
  ...rep([{ act: 'lie', breath: 0 }, { act: 'lie', breath: 0 }, { act: 'lie', breath: 1 }, { act: 'lie', breath: 1 }], 3),
  { act: 'lie_eye' }, { act: 'lie_eye' }, { act: 'lie_eye' }, { act: 'lie' },
  ...rep([{ act: 'lie', breath: 0 }, { act: 'lie', breath: 1 }], 2),
];
// sit: the head follows the light left and right (h1)
const SIT: IdleKey[] = [
  { act: 'sit' }, { act: 'sit' }, { act: 'sit_l' }, { act: 'sit_l' }, { act: 'sit_l' }, { act: 'sit' },
  { act: 'sit', blink: true }, { act: 'sit_r' }, { act: 'sit_r' }, { act: 'sit_r' }, { act: 'sit' }, { act: 'sit' },
];
const STAND: IdleKey[] = [{}, {}, { breath: 1 }, { breath: 1 }, { act: 'ear' }, {}, { breath: 1 }, { blink: true }, {}, { act: 'wag', ph: 1 }, { act: 'wag', ph: 0 }, { act: 'wag', ph: 1 }];

registerChar('npc_hoshi_gon', () =>
  buildSprite({
    id: 'npc_hoshi_gon',
    w: 14,
    h: 12,
    mats: DOG,
    draw,
    walkFrameMs: 100,
    walkBob: [0, 0, 0, 0],
    idle: { down: STAND, up: STAND, left: STAND, right: STAND },
    idleFrameMs: 220,
    extras: {
      lie: { dirs: 'all', p: { act: 'lie' } },
      sit: { dirs: 'all', p: { act: 'sit' } },
      stand_n: { dirs: 'all', p: { act: 'look_hill' } },
      bark: { dirs: ['down', 'left', 'right'], p: { ph: 1 } },
    },
    anims: {
      bark: { frames: [{ ph: 1 }, { ph: 0 }, { ph: 1 }, { ph: 0 }], ms: [140, 120, 140, 300], loop: false, dirs: ['down', 'left', 'right'] },
      wag: { frames: [{ ph: 0 }, { ph: 1 }], ms: 120, dirs: ['down', 'left', 'right', 'up'] },
      ear: { frames: [{ act: 'ear' }, { act: '' }], ms: [160, 400], loop: false, dirs: ['down', 'up'] },
    },
    poses: {
      lie: { down: LIE, left: LIE, right: LIE, up: LIE },
      sit: { down: SIT, left: SIT, right: SIT, up: STAND },
      stand_n: { up: rep([{ act: 'look_hill' }, { act: 'look_hill', breath: 1 }], 3), down: STAND, left: STAND, right: STAND },
      look_hill: { up: rep([{ act: 'look_hill' }, { act: 'look_hill', breath: 1 }], 3), down: STAND, left: STAND, right: STAND },
    },
    shadow: 10,
    keep: ['#A8742A', '#7A5424'],
  }),
);
