// Chapter 2 field symbols (52 11.1, 51 8–9, 11.2): each exaggerates one
// feature so it reads at 1x in the lantern's light, in the battle art's
// colours (52 11.2).
//
//  enemy_sune_tomato       16×16  a green tomato with its star calyx tilted
//                                 like a crown; 'sulk' (held) = its smooth
//                                 back turned, a 「ぷいっ」 every 2 s, a glance
//                                 over the shoulder from the side; 'roll'
//                                 (4 frames) rolling at you.
//  enemy_sune_tomato_pair  24×16  two on one truss, both backs turned.
//  enemy_henoheno_kacho    16×32  the scarecrow in a suit: a cloth face with
//                                 へのへのもへじ in ink (redrawn a stroke at a
//                                 time every 3 s), straw at the cuffs, a CD
//                                 on the crossbar glinting through a rainbow;
//                                 walks by hopping on its one leg.
//  enemy_biribiri_ban      32×16  an electric fence section walking on its
//                                 posts, the yellow sign its face (two dot
//                                 eyes); a spark runs the wire every second.
//  enemy_chototsu          28×16  a wild boar: long snout, the bristle ridge
//                                 up its back, tusks. Held poses 'dig' (the
//                                 dirt flies 2px), 'wallow', 'paw', 'charge'
//                                 (4-frame gallop), 'snort' (white breath).
//  enemy_mujin_hanbaiin    16×20  the stall's cedar money box on thin legs,
//                                 a cardboard price card on chopsticks out of
//                                 its coin slot, flipping between two lines
//                                 of writing every 3 s; walks by hopping.
//  enemy_tetsuya           32×24  a teal walking tiller, one round headlight
//                                 (lit on the glow layer; the world draws its
//                                 beam from the feet +(±11, −8)), the rotary
//                                 tines turning behind, the engine shaking
//                                 it 1px (80 ms); 'charge' revs it.

import { flat, mat, type Fig, type Mats } from './fig';
import { buildSprite, rep, type IdleKey, type Pose } from './rig';
import { registerChar } from './registry';
import { paintRows, type Legend } from './kit';

// =============================================================================
// スネトマト

const TOMATO: Mats = {
  fruit: mat('#5FA85A', { shade: '#2E6B4A', light: '#9BCB6B', dark: '#1E4A34' }),
  calyx: mat('#3FA66B', { shade: '#2E6B4A', light: '#5FA85A', dark: '#1E4A34' }),
  stem: flat('#3F7A3A'),
  string: flat('#E8E4D8'),
  star: flat('#E8F4D8'),
  eye: flat('#1E4A34'),
  mouth: flat('#1E4A34'),
  blush: flat('#F2894B'),
};
const TL: Legend = {
  H: ['fruit', 1], F: ['fruit', 0], f: ['fruit', -1], D: ['fruit', -2],
  C: ['calyx', 1], c: ['calyx', 0], k: ['calyx', -1],
  s: ['stem', 0], w: ['string', 0], x: ['star', 0], e: ['eye', 0], m: ['mouth', 0], b: ['blush', 0],
};
const TORDER = ['fruit', 'calyx', 'stem', 'string', 'star', 'eye', 'mouth', 'blush'];

// the round fruit, lit on the upper left; rows 0..10 of a 13-wide body
const FRUIT = [
  '...HHHFFF....',
  '.HHHFFFFFFf..',
  '.HHFFFFFFFff.',
  'HHFFFFFFFFFff',
  'HFFFFFFFFFFff',
  'FFFFFFFFFFFff',
  'FFFFFFFFFFfff',
  'fFFFFFFFFFffD',
  '.fFFFFFFFffD.',
  '..ffFFFfffD..',
  '....fffDD....',
];
// the star calyx tilted 2px to the right like a crown, the stem and the frayed tie
const CALYX = [
  '.....s.w...',
  '.....s..w..',
  '..c.cCc....',
  '.kcCCCCck..',
  '...kcCck.c.',
  '....k.k....',
];

function tomato(f: Fig, x: number, y: number, view: 'down' | 'up' | 'left', o: { pout?: boolean; turn?: number; roll?: number; blush?: boolean } = {}) {
  paintRows(f, x, y + 4, FRUIT, TL, ['fruit']);
  if (o.roll !== undefined) {
    // rolling: the calyx goes round the fruit
    const pos = [[4, 0], [8, 4], [4, 9], [0, 4]][o.roll % 4];
    paintRows(f, x + pos[0], y + pos[1] + 1, ['.cCc.', 'kCCCk', '.kck.'], TL, ['calyx']);
    return;
  }
  paintRows(f, x + 2 + (o.turn ?? 0), y, CALYX, TL, ['calyx', 'stem', 'string']);
  if (view === 'up') {
    // the smooth back and the pale star at the blossom end, low on it
    paintRows(f, x + 5, y + 11, ['.x.', 'x.x', '.x.'], TL, ['star']);
    return;
  }
  if (view === 'down') {
    // a pout: eyes turned down, the mouth pushed out
    paintRows(f, x + 3, y + 8, ['e...e', '.....', '..m..', '.mmm.'], TL, ['eye', 'mouth']);
    if (o.blush) paintRows(f, x + 2, y + 9, ['b.....b'], TL, ['blush']);
    return;
  }
  // side: the eye glancing back over the shoulder, the pouting lip
  paintRows(f, x + 2, y + 8, ['e...', '....', 'm...', 'mm..'], TL, ['eye', 'mouth']);
}

function suneDraw(f: Fig, p: Pose) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const hop = st === 1 || st === 3 ? -1 : 0;
  const act = p.act;
  if (act === 'roll') return tomato(f, 1, 1, 'down', { roll: p.ph });
  // sulking: the back turned whichever way; from the side a glance back
  const sulk = act === 'sulk';
  const flick = sulk && p.ph === 1;
  const view = sulk ? (p.view === 'left' ? 'left' : 'up') : p.view;
  tomato(f, 1 + (flick ? 1 : 0), 1 + hop - (flick ? 1 : 0), view, { turn: flick ? 1 : 0 });
}

const SULK: IdleKey[] = [...rep([{ act: 'sulk', ph: 0 }], 7), { act: 'sulk', ph: 1 }];

registerChar('enemy_sune_tomato', () =>
  buildSprite({
    id: 'enemy_sune_tomato',
    w: 16,
    h: 16,
    mats: TOMATO,
    draw: suneDraw,
    walkFrameMs: 120,
    walkBob: [0, 0, 0, 0],
    idle: rep([{}, {}, {}, {}, { breath: 1 }, { breath: 1 }], 1),
    idleFrameMs: 250,
    anims: { roll: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 3 }], ms: 90, dirs: 'all' } },
    poses: { sulk: SULK },
    shadow: 12,
    keep: ['#E8F4D8', '#3F7A3A', '#1E4A34'],
  }),
);

registerChar('enemy_sune_tomato_pair', () =>
  buildSprite({
    id: 'enemy_sune_tomato_pair',
    w: 24,
    h: 16,
    mats: TOMATO,
    draw: (f, p) => {
      const st = p.mode === 'walk' ? p.step % 4 : 0;
      const hop = st === 1 ? -1 : 0;
      const hop2 = st === 3 ? -1 : 0;
      const flick = p.act === 'sulk' && p.ph === 1;
      if (p.act === 'roll') {
        tomato(f, 0, 2, 'down', { roll: p.ph });
        tomato(f, 11, 2, 'down', { roll: (p.ph + 2) % 4 });
        return;
      }
      const v = p.act === 'sulk' ? (p.view === 'left' ? 'left' : 'up') : p.view;
      // one truss: the two stems meet in a single green stalk between them
      f.part('stem', { flat: true, rim: false });
      f.line(6, 1, 11, -1).line(17, 1, 12, -1);
      tomato(f, 0, 2 + hop - (flick ? 1 : 0), v, {});
      tomato(f, 11, 2 + hop2, v, { turn: flick ? 1 : 0 });
    },
    walkFrameMs: 120,
    walkBob: [0, 0, 0, 0],
    idle: rep([{}, {}, {}, {}, { breath: 1 }, { breath: 1 }], 1),
    anims: { roll: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 3 }], ms: 90, dirs: 'all' } },
    poses: { sulk: [...rep([{ act: 'sulk', ph: 0 }], 6), { act: 'sulk', ph: 1 }, { act: 'sulk', ph: 0 }, { act: 'sulk', ph: 1 }] },
    shadow: 20,
    keep: ['#E8F4D8', '#3F7A3A', '#1E4A34'],
  }),
);

// =============================================================================
// ヘノヘノ課長

const KACHO: Mats = {
  bamboo: mat('#C8B87A', { shade: '#8A7A4A', light: '#E8D8A0', dark: '#5A4A32' }),
  hat: mat('#E8C878', { shade: '#B89848', light: '#F6E0A0', dark: '#8A6A2A' }),
  ribbon: flat('#8A2E3A'),
  cloth: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  ink: flat('#2A2440'),
  suit: mat('#2F3A5A', { shade: '#1E2640', light: '#4A5A7A', dark: '#141A30' }),
  shirt: flat('#E8E4D8'),
  tie: flat('#8A5A3A'),
  straw: mat('#E8C878', { shade: '#B89848', light: '#F6E0A0' }),
  tag: flat('#F4F1E8'),
  cd: flat('#C8CDD4'),
  cd1: flat('#E0567A'),
  cd2: flat('#FFD23F'),
  cd3: flat('#5FA85A'),
  cd4: flat('#4AA8E0'),
};

/** へのへのもへじ drawn stroke by stroke: n = strokes shown (0..6). */
function henoheno(f: Fig, x: number, y: number, n: number) {
  f.part('ink', { flat: true, rim: false });
  // へ (left brow)
  if (n > 0) f.px(x, y + 1).px(x + 1, y).px(x + 2, y + 1);
  // へ (right brow)
  if (n > 1) f.px(x + 5, y + 1).px(x + 6, y).px(x + 7, y + 1);
  // の (eyes)
  if (n > 2) f.px(x + 1, y + 3).px(x + 2, y + 2).px(x + 2, y + 3);
  if (n > 3) f.px(x + 5, y + 3).px(x + 6, y + 2).px(x + 6, y + 3);
  // も (nose)
  if (n > 4) f.px(x + 4, y + 3).px(x + 4, y + 4).px(x + 3, y + 4);
  // じ (mouth)
  if (n > 5) f.px(x + 2, y + 6).px(x + 3, y + 7).px(x + 4, y + 7).px(x + 5, y + 6);
}

function kachoDraw(f: Fig, p: Pose) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  // one leg: it hops — crouch (the pole bows) then the jump
  const hop = st === 1 ? 1 : st === 2 ? -2 : st === 3 ? -1 : 0;
  const y0 = hop;
  const side = p.view === 'left';
  const back = p.view === 'up';
  // the pole (one bamboo leg), bowed on the crouch
  f.part('bamboo', { shade: 'r', light: 'l' });
  if (st === 1) f.vl(8, 22 + y0, 28).px(7, 29).px(7, 30);
  else f.vl(8, 21 + y0, 30 + Math.min(0, hop));
  f.part('bamboo', { flat: true });
  f.t(-1).px(8, 25 + y0).px(8, 28 + y0).t(null);
  if (side) {
    // edge-on: the crossbar a stub, the suit thin
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(5, 11 + y0, 6, 11);
    f.part('straw', { flat: true });
    f.t(0).px(4, 13 + y0).px(4, 15 + y0).t(null);
    f.part('cloth', { shade: 'rb', light: 't' });
    f.rect(5, 4 + y0, 6, 7);
    henoheno(f, 3, 5 + y0, 6);
    f.part('hat', { shade: 'rb', light: 't' });
    f.rows(3, 1 + y0, ['...####...', '..######..', '##########']);
    f.part('ribbon', { flat: true, rim: false });
    f.hl(5, 10, 3 + y0);
    return;
  }
  // the suit on the crossbar: arms straight out, straw from the cuffs
  f.part('suit', { shade: 'rb', light: 't' });
  f.rect(3, 11 + y0, 10, 10);
  f.rect(0, 12 + y0, 16, 3);
  f.part('suit', { flat: true });
  f.t(1).px(2, 13 + y0).t(1).px(13, 13 + y0).t(null); // the worn elbows
  if (!back) {
    f.part('shirt', { flat: true, rim: false });
    f.px(7, 11 + y0).px(8, 11 + y0).px(7, 12 + y0).px(8, 12 + y0);
    f.part('tie', { flat: true, rim: false });
    f.vl(8, 12 + y0, 15 + y0).px(7, 13 + y0);
    f.part('tag', { flat: true, rim: false });
    f.hl(4, 6, 14 + y0);
    f.part('ink', { flat: true, rim: false });
    f.px(4, 15 + y0).px(6, 15 + y0);
  }
  f.part('straw', { flat: true });
  f.t(1).px(0, 15 + y0).t(0).px(1, 15 + y0).px(0, 16 + y0).t(1).px(15, 15 + y0).t(0).px(14, 15 + y0).px(15, 16 + y0).t(null);
  // the CD on a string from the crossbar, turning through the rainbow
  f.part('cd', { flat: true, rim: false });
  f.px(14, 17 + y0).px(15, 18 + y0).px(13, 18 + y0).px(14, 19 + y0);
  f.part((['cd1', 'cd2', 'cd3', 'cd4'] as const)[(p.tick + (p.step ?? 0)) % 4], { flat: true, rim: false });
  f.px(14, 18 + y0);
  // the cloth face (the back of the cloth from behind) and the straw hat
  f.part('cloth', { shade: 'rb', light: 't' });
  f.rows(3, 3 + y0, ['.########.', '##########', '##########', '##########', '##########', '##########', '##########', '.########.']);
  if (!back) henoheno(f, 4, 4 + y0, p.act === 'draw' ? p.ph : 6);
  else {
    f.part('cloth', { flat: true });
    f.t(-1).px(8, 9 + y0).px(7, 10 + y0).px(9, 10 + y0).t(null); // the knot
  }
  f.part('hat', { shade: 'rb', light: 't' });
  f.rows(2, 0 + y0, ['...######...', '..########..', 'HHHhhhhhhhdd'.replace(/[Hhd]/g, '#')]);
  f.part('ribbon', { flat: true, rim: false });
  f.hl(4, 11, 2 + y0);
}

// every 3 s one stroke of the face is inked again (the face "redrawn")
const KACHO_IDLE: IdleKey[] = [
  ...rep([{ act: 'draw', ph: 6 }], 8),
  { act: 'draw', ph: 0 }, { act: 'draw', ph: 1 }, { act: 'draw', ph: 2 }, { act: 'draw', ph: 3 }, { act: 'draw', ph: 4 }, { act: 'draw', ph: 5 },
  { act: 'draw', ph: 6 }, { act: 'draw', ph: 6 },
];

registerChar('enemy_henoheno_kacho', () =>
  buildSprite({
    id: 'enemy_henoheno_kacho',
    w: 16,
    h: 32,
    mats: KACHO,
    draw: kachoDraw,
    walkFrameMs: 160,
    walkBob: [0, 0, 0, 0],
    idle: { down: KACHO_IDLE, up: rep([{}, {}, {}, {}], 2), left: rep([{}, {}, {}, {}], 2), right: rep([{}, {}, {}, {}], 2) },
    idleFrameMs: 190,
    shadow: 8,
    keep: ['#C8B87A', '#E8C878', '#B89848', '#2F3A5A', '#1E2640', '#4A5A7A', '#141A30'],
  }),
);

// =============================================================================
// ビリビリ番

const FENCE: Mats = {
  post: mat('#E8E4D8', { shade: '#9AA0A8', light: '#F4F1E8', dark: '#6B7186' }),
  capM: flat('#2A2440'),
  wire: flat('#C8CDD4'),
  sign: mat('#FFD23F', { shade: '#D9A441', light: '#FFE7A3', dark: '#A8742A' }),
  frame: flat('#2A2440'),
  eye: flat('#2A2440'),
  signBack: mat('#9AA0A8', { shade: '#6B7186', light: '#C8CDD4' }),
  spark: flat('#FFF6D8'),
  ground: flat('#9AA0A8'),
};

function fenceDraw(f: Fig, p: Pose) {
  const st = p.mode === 'walk' ? p.step % 2 : 0;
  const side = p.view === 'left';
  const back = p.view === 'up';
  // the spark runs the wire left to right once a second (idle ticks of 250 ms)
  const k = p.mode === 'idle' ? p.tick % 4 : p.step % 4;
  if (side) {
    // edge-on: the two posts one behind the other, the sign a thin plate
    f.part('post', { shade: 'r', light: 'l', shift: -1 });
    f.rect(17, 4, 2, 11 - st);
    f.part('post', { shade: 'r', light: 'l' });
    f.rect(14, 3, 2, 12 - (1 - st));
    f.part('capM', { flat: true, rim: false });
    f.hl(14, 15, 2).hl(17, 18, 3);
    f.part('wire', { flat: true, rim: false });
    f.hl(13, 19, 6).hl(13, 19, 9);
    f.part('sign', { shade: 'r', light: '' });
    f.rect(12, 5, 2, 6);
    return;
  }
  // posts (legs): they step alternately
  f.part('post', { shade: 'r', light: 'l' });
  f.rect(3, 3 - st, 2, 12);
  f.rect(27, 3 - (1 - st), 2, 12);
  f.part('capM', { flat: true, rim: false });
  f.hl(3, 4, 2 - st).hl(27, 28, 2 - (1 - st));
  // insulators and the three wires
  f.part('wire', { flat: true, rim: false });
  for (const y of [5, 8, 11]) f.hl(5, 26, y);
  f.part('capM', { flat: true, rim: false });
  for (const y of [5, 8, 11]) f.px(5, y).px(26, y);
  // the spark on the top wire
  f.part('spark', { flat: true, rim: false });
  const sx = 6 + k * 5;
  f.px(sx, 5).px(sx + 1, 5);
  f.glowPx(sx, 5, '#FFF6D8').glowPx(sx + 1, 5, '#FFF6D8');
  // the yellow sign: its face
  if (back) {
    f.part('signBack', { shade: 'rb', light: 't' });
    f.rect(10, 4, 12, 8);
  } else {
    f.part('frame', { flat: true, rim: false });
    f.rect(10, 4, 12, 8);
    f.part('sign', { shade: 'rb', light: 't' });
    f.rect(11, 5, 10, 6);
    f.part('eye', { flat: true, rim: false });
    const blink = p.blink ? 1 : 0;
    f.rect(13, 6 + blink, 2, 2 - blink).rect(17, 6 + blink, 2, 2 - blink);
    f.part('frame', { flat: true, rim: false });
    f.hl(13, 18, 9).hl(14, 17, 10);
  }
}

registerChar('enemy_biribiri_ban', () =>
  buildSprite({
    id: 'enemy_biribiri_ban',
    w: 32,
    h: 16,
    mats: FENCE,
    draw: fenceDraw,
    walkFrameMs: 200,
    walkBob: [0, 0, 0, 0],
    idle: [{}, {}, {}, {}, {}, {}, {}, { blink: true }],
    idleFrameMs: 250,
    shadow: 28,
    keep: ['#C8CDD4'],
  }),
);

// =============================================================================
// チョトツ (the boar)

const BOAR: Mats = {
  hair: mat('#5A3A22', { shade: '#3A2616', light: '#8A5A3A', dark: '#241810' }),
  snout: mat('#8A5A4A', { shade: '#5A3A2A', light: '#A87A6A' }),
  nose: flat('#3A2616'),
  tusk: flat('#F4F1E8'),
  eye: flat('#1A0E08'),
  glint: flat('#F7C27A'),
  hoof: flat('#241810'),
  mud: mat('#6B5A4A', { shade: '#4A3A2A', light: '#8A7A6A' }),
  breath: flat('#E8E4D8'),
  dirt: flat('#8A5A3A'),
};
const BL: Legend = {
  H: ['hair', 1], h: ['hair', 0], d: ['hair', -1], D: ['hair', -2],
  S: ['snout', 1], s: ['snout', 0], z: ['snout', -1], n: ['nose', 0], t: ['tusk', 0], e: ['eye', 0], g: ['glint', 0],
  m: ['mud', 0], M: ['mud', -1], o: ['hoof', 0],
};
const BORDER = ['hair', 'mud', 'snout', 'nose', 'tusk', 'eye', 'glint', 'hoof'];

// side (facing left): the bristle ridge up the back, the long snout, a heavy front
const BOAR_BODY = [
  '.......H.H.H.H..............',
  '......HhHhHhHhHh............',
  '....HHhhhhhhhhhhhhhhd.......',
  '...HhhhhhhhhhhhhhhhhhhhD....',
  '..Hhhhhhhhhhhhhhhhhhhhhhd.d.',
  '..hhhhhhhhhhhhhhhhhhhhhhdd..',
  '.hhhhhhhhhhhhhhhhhhhhhhhdd..',
  '.dhhhhhhhhhhhhhhhhhhhhhddd..',
  '..ddhhhhhhhhhhhhhhhhhhddd...',
  '....dddddhhhhhhhhhhdddd.....',
];
const BOAR_HEAD = [
  '..Hhhh..',
  '.hhhhhd.',
  'Hhehhhhd',
  'ssshhhhd',
  'nSsshhdd',
  'nzsthhd.',
  '..t.dd..',
];

function boarSide(f: Fig, p: Pose) {
  const act = p.act;
  const run = act === 'charge' || p.mode === 'run';
  const st = run ? (act === 'charge' ? p.ph : p.step % 4) : p.mode === 'walk' ? p.step % 4 : 0;
  const bob = run ? [0, -1, 0, 1][st] : 0;
  const low = act === 'dig' || act === 'paw' ? 2 : 0;
  if (act === 'wallow') {
    // rolled over in the wallow: belly up, the bristle ridge in the mud,
    // the four legs kicking in the air, mud caked on its flank
    const k = p.ph;
    f.part('hair', { shade: 'r', light: 'l' });
    for (const [x, kk] of [[7, k], [10, 1 - k], [18, 1 - k], [21, k]] as const) f.rect(x, 2 + kk, 2, 4 - kk);
    f.part('hoof', { flat: true, rim: false });
    for (const [x, kk] of [[7, k], [10, 1 - k], [18, 1 - k], [21, k]] as const) f.hl(x, x + 1, 1 + kk);
    paintRows(f, 1, 5, [...BOAR_BODY].reverse().slice(0, 9), BL, BORDER);
    paintRows(f, 4, 7, ['..m...mm....m..', '.mMm..mmm..mMm.'], BL, ['mud']);
    // the head thrown back at the left, snout up, the wallow's water splashing
    paintRows(f, 0, 6, ['n...', 'Ss..', 'shhh', 'thhd', '.hd.'], BL, BORDER);
    f.part('mud', { flat: true, rim: false });
    f.px(2 + k, 14).px(25 - k, 14).px(13, 15);
    return;
  }
  // legs: short and quick
  const legX = [[7, 9], [18, 20]];
  const lift = (i: number) => (run ? [[0, 2], [2, 0], [1, 1], [0, 0]][st][i] : p.mode === 'walk' ? [[0, 0], [1, 0], [0, 0], [0, 1]][st][i] : 0);
  f.part('hair', { shade: 'r', light: '', shift: -1 });
  f.rect(legX[0][1], 11 + bob, 2, 4 - lift(1)).rect(legX[1][1], 11 + bob, 2, 4 - lift(0));
  f.part('hoof', { flat: true, rim: false });
  f.hl(legX[0][1], legX[0][1] + 1, 15 - lift(1)).hl(legX[1][1], legX[1][1] + 1, 15 - lift(0));
  const pawK = act === 'paw' ? p.ph : 0;
  f.part('hair', { shade: 'r', light: '' });
  f.rect(legX[0][0], 11 + bob, 2, 4 - lift(0) - pawK * 2).rect(legX[1][0], 11 + bob, 2, 4 - lift(1));
  f.part('hoof', { flat: true, rim: false });
  f.hl(legX[0][0], legX[0][0] + 1, 15 - lift(0) - pawK * 2).hl(legX[1][0], legX[1][0] + 1, 15 - lift(1));
  paintRows(f, 0, 2 + bob, BOAR_BODY, BL, BORDER);
  // the tail flicks
  paintRows(f, 25, 5 + bob + (p.tick % 4 === 1 ? 1 : 0), ['d', '.d'], BL, ['hair']);
  paintRows(f, 0, 4 + bob + low, BOAR_HEAD, BL, BORDER);
  // the eye's glint
  paintRows(f, 3, 6 + bob + low, ['g'], BL, ['glint']);
  if (act === 'dig') {
    // the snout in the dirt, the soil flying up behind
    f.part('dirt', { flat: true, rim: false, ol: false });
    const k = p.ph;
    f.px(4 + k, 9 - k * 2).px(7, 8 - k).px(2 - k, 10 - k);
  }
  if (act === 'snort' || (run && st === 0)) {
    // white breath puffs from the nose
    f.part('breath', { flat: true, rim: false, ol: false });
    const k = p.ph % 2;
    f.px(0, 7 + bob - k).px(1, 6 + bob - k * 2);
  }
}

function boarFront(f: Fig, p: Pose) {
  const back = p.view === 'up';
  const run = p.act === 'charge';
  const st = run ? p.ph : p.mode === 'walk' ? p.step % 4 : 0;
  const bob = run ? [0, -1, 0, 1][st] : 0;
  // head-on: a wedge of bristles, the snout disc and tusks at the front
  f.part('hair', { shade: 'r', light: '', shift: -1 });
  f.rect(8, 11 + bob, 2, 4 - (st === 1 ? 1 : 0)).rect(18, 11 + bob, 2, 4 - (st === 3 ? 1 : 0));
  f.part('hair', { shade: 'rb', light: 't' });
  f.rows(6, 1 + bob, ['...H.H.H.H....', '..HhhhhhhhhhH.', '.hhhhhhhhhhhhd', 'hhhhhhhhhhhhhd', 'hhhhhhhhhhhhdd', 'hhhhhhhhhhhhdd', 'dhhhhhhhhhhhdd', '.dhhhhhhhhhdd.', '..ddhhhhhhdd..', '....dddddd....']);
  f.part('hoof', { flat: true, rim: false });
  f.hl(8, 9, 15).hl(18, 19, 15);
  if (back) {
    f.part('hair', { flat: true });
    f.t(-2).vl(13, 3 + bob, 9 + bob).t(null);
    paintRows(f, 12, 9 + bob, ['.d.', 'd.d'], BL, ['hair']);
    return;
  }
  paintRows(f, 9, 5 + bob, ['.e......e.', '..........', '...SSSs...', '..SsnnsS..', 't.zsssz..t', 't..zzz...t'], BL, BORDER);
  if (p.act === 'snort') {
    f.part('breath', { flat: true, rim: false, ol: false });
    f.px(12, 12 + bob - p.ph).px(15, 12 + bob - p.ph);
  }
}

function boarDraw(f: Fig, p: Pose) {
  if (p.view === 'left') boarSide(f, p);
  else boarFront(f, p);
}

registerChar('enemy_chototsu', () =>
  buildSprite({
    id: 'enemy_chototsu',
    w: 28,
    h: 16,
    mats: BOAR,
    draw: boarDraw,
    walkFrameMs: 110,
    walkBob: [0, 0, 0, 0],
    run: true,
    runFrameMs: 70,
    runBob: [0, 0, 0, 0],
    idle: [{}, {}, {}, { blink: true }, {}, {}, {}, {}],
    idleFrameMs: 250,
    anims: {
      charge: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 3 }], ms: 70, dirs: 'all' },
    },
    poses: {
      dig: rep([{ act: 'dig', ph: 0 }, { act: 'dig', ph: 1 }], 3),
      wallow: rep([{ act: 'wallow', ph: 0 }, { act: 'wallow', ph: 0 }, { act: 'wallow', ph: 1 }, { act: 'wallow', ph: 1 }], 2),
      paw: rep([{ act: 'paw', ph: 1 }, { act: 'paw', ph: 0 }], 3),
      snort: rep([{ act: 'snort', ph: 0 }, { act: 'snort', ph: 1 }, { act: 'snort', ph: 0 }, {}], 2),
    },
    shadow: 22,
    keep: ['#5A3A22', '#3A2616', '#241810', '#8A5A4A', '#A87A6A', '#1A0E08', '#6B5A4A', '#4A3A2A', '#8A7A6A'],
  }),
);

// =============================================================================
// ムジン販売員

const MUJIN: Mats = {
  wood: mat('#C8A06A', { shade: '#8A6A3A', light: '#E8D0A0', dark: '#5A4A2A' }),
  grain: flat('#A8804A'),
  metal: flat('#3A3F48'),
  paper: flat('#F4F1E8'),
  ink: flat('#2A2440'),
  card: mat('#D8B888', { shade: '#C8A06A', light: '#E8D0A0' }),
  stick: flat('#E8D8B0'),
  slot: flat('#2A2440'),
  coin: flat('#C8C2B4'),
  leg: flat('#8A6A3A'),
};

function mujinDraw(f: Fig, p: Pose) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const hop = st === 1 ? -2 : st === 2 ? -1 : 0;
  const sign = p.act === 'rest' ? 1 : 0;
  const side = p.view === 'left';
  const back = p.view === 'up';
  // thin legs (tucked while in the air)
  f.part('leg', { flat: true });
  if (hop < 0) f.vl(6, 16 + hop, 17 + hop).vl(10, 16 + hop, 17 + hop);
  else f.vl(6, 16, 19).vl(10, 16, 19).px(5, 19).px(11, 19);
  // the cedar box
  f.part('wood', { shade: 'rb', light: 't' });
  const w = side ? 8 : 12;
  const x0 = side ? 4 : 2;
  f.rect(x0, 7 + hop, w, 9);
  f.part('grain', { flat: true, rim: false });
  f.hl(x0 + 1, x0 + w - 2, 10 + hop).hl(x0 + 2, x0 + w - 3, 13 + hop);
  f.part('metal', { flat: true, rim: false });
  f.px(x0, 7 + hop).px(x0 + w - 1, 7 + hop).px(x0, 15 + hop).px(x0 + w - 1, 15 + hop);
  if (!side && !back) {
    // the coin slot, the handwritten paper (two lines), a silver coin going in
    f.part('slot', { flat: true, rim: false });
    f.hl(6, 9, 8 + hop);
    f.part('paper', { flat: true, rim: false });
    f.rect(4, 10 + hop, 8, 4);
    f.part('ink', { flat: true, rim: false });
    f.hl(5, 10, 11 + hop).hl(5, 8, 12 + hop);
  }
  // the price card on its chopsticks, out of the slot; flips between two lines
  f.part('stick', { flat: true, rim: false });
  f.vl(7, 3 + hop, 7 + hop).vl(9, 3 + hop, 7 + hop);
  f.part('card', { shade: 'rb', light: 't' });
  f.rect(4, -1 + hop, 9, 5);
  f.part('ink', { flat: true, rim: false });
  if (sign) f.hl(5, 11, 0 + hop).hl(5, 8, 2 + hop);
  else f.hl(5, 9, 1 + hop).px(11, 1 + hop).hl(6, 10, 2 + hop);
}

registerChar('enemy_mujin_hanbaiin', () =>
  buildSprite({
    id: 'enemy_mujin_hanbaiin',
    w: 16,
    h: 20,
    mats: MUJIN,
    draw: mujinDraw,
    walkFrameMs: 120,
    walkBob: [0, 0, 0, 0],
    // 「いらっしゃいませ」 ↔ 「ただいま 休憩中」 every 3 s
    idle: [...rep([{}], 12), ...rep([{ act: 'rest' }], 12)],
    idleFrameMs: 250,
    shadow: 12,
    keep: ['#D8B888', '#E8D8B0', '#A8804A', '#8A6A3A'],
  }),
);

// =============================================================================
// 耕うん機テツヤ

const TILLER: Mats = {
  body: mat('#3A7A8A', { shade: '#2A5A6A', light: '#5A9AA8', dark: '#1E4450' }),
  rust: flat('#A8742A'),
  fin: flat('#6B7186'),
  lens: flat('#FFE7A3'),
  lensCore: flat('#FFF6D8'),
  rimM: flat('#C8CDD4'),
  pipe: mat('#6B7186', { shade: '#3A3F48', light: '#9AA0A8' }),
  grip: flat('#2A2440'),
  tine: mat('#9AA0A8', { shade: '#6B7186', light: '#C8CDD4' }),
  tire: mat('#2A2440', { shade: '#1B1733', light: '#3A3F48' }),
  sticker: flat('#F4F1E8'),
  soil: flat('#4A3A2A'),
  smoke: flat('#9AA0A8'),
};

function tillerDraw(f: Fig, p: Pose) {
  const shake = p.mode === 'walk' || p.mode === 'idle' || p.act === 'charge' ? [0, -1, 0, 0][(p.tick + p.step) % 4] : 0;
  const rev = p.act === 'charge' ? [0, -2, 0, -1][p.ph % 4] : 0;
  const y = shake + rev;
  const tk = (p.tick + p.step + (p.act === 'charge' ? p.ph : 0)) % 3;
  if (p.view === 'left') {
    // side, facing left: the headlight in front (the world lights it at feet −11, −8)
    // wheels
    f.part('tire', { shade: 'rb', light: 't' });
    f.ell(9, 20, 3, 3);
    f.part('tire', { flat: true });
    f.t(-1).px(9 + (tk === 1 ? 1 : 0), 20 - (tk === 2 ? 1 : 0)).t(null);
    // the handles running back and up
    f.part('pipe', { shade: 'r', light: 't' });
    f.line(18, 10 + y, 29, 3 + y).line(18, 12 + y, 30, 5 + y);
    f.part('grip', { flat: true, rim: false });
    f.hl(28, 30, 3 + y).hl(29, 31, 5 + y);
    // the sticker 「タケ」 peeling on the handle
    f.part('sticker', { flat: true, rim: false });
    f.px(24, 7 + y).px(25, 6 + y);
    // the rotary tines behind, turning, clods of soil on them
    f.part('tine', { shade: 'rb', light: 't' });
    const tines = [
      ['.#..#.', '######', '.#..#.'],
      ['#..#..', '######', '..#..#'],
      ['..#..#', '######', '#..#..'],
    ][tk];
    f.rows(19, 17 + y, tines);
    f.part('soil', { flat: true, rim: false });
    f.px(20 + tk, 16 + y).px(24 - tk, 20 + y);
    // the engine body
    f.part('body', { shade: 'rb', light: 't' });
    f.rows(3, 9 + y, ['...##########...', '..############..', '.##############.', '################', '################', '.##############.', '...##########...']);
    f.part('fin', { flat: true, rim: false });
    for (let x = 8; x <= 14; x += 2) f.vl(x, 11 + y, 13 + y);
    f.part('rust', { flat: true, rim: false });
    f.px(5, 13 + y).px(16, 11 + y).px(12, 15 + y);
    // exhaust stack and a puff
    f.part('pipe', { shade: 'r', light: 't' });
    f.vl(16, 6 + y, 9 + y);
    f.part('smoke', { flat: true, rim: false, ol: false });
    f.px(16 + (tk % 2), 4 + y - tk).px(17, 3 + y - tk);
    // the round headlight: rim, lens, the bright core (glow layer)
    f.part('rimM', { flat: true, rim: false });
    f.rows(3, 14 + y, ['.###.', '#...#', '#...#', '#...#', '.###.']);
    f.part('lens', { flat: true, rim: false });
    f.rect(4, 15 + y, 3, 3);
    f.part('lensCore', { flat: true, rim: false });
    f.px(5, 16 + y);
    for (let yy = 15; yy <= 17; yy++) for (let xx = 4; xx <= 6; xx++) f.glowPx(xx, yy + y, xx === 5 && yy === 16 ? '#FFF6D8' : '#FFE7A3');
    return;
  }
  // front / back: the lamp in the middle (front), the tines and handles (back)
  const back = p.view === 'up';
  f.part('tire', { shade: 'rb', light: 't' });
  f.rect(6, 17, 4, 6).rect(22, 17, 4, 6);
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(8, 9 + y, ['..############..', '.##############.', '################', '################', '################', '.##############.']);
  f.part('fin', { flat: true, rim: false });
  for (let x = 11; x <= 20; x += 3) f.vl(x, 11 + y, 13 + y);
  f.part('pipe', { shade: 'r', light: 't' });
  f.vl(10, back ? 2 + y : 5 + y, 9 + y).vl(21, back ? 2 + y : 5 + y, 9 + y);
  f.part('grip', { flat: true, rim: false });
  f.hl(9, 11, back ? 1 + y : 4 + y).hl(20, 22, back ? 1 + y : 4 + y);
  if (back) {
    f.part('tine', { shade: 'rb', light: 't' });
    f.rows(10, 16 + y, [['#.#.#.#.#.#.', '############'], ['.#.#.#.#.#.#', '############'], ['#..#..#..#..', '############']][tk]);
    return;
  }
  f.part('rimM', { flat: true, rim: false });
  f.rows(13, 14 + y, ['.####.', '#....#', '#....#', '#....#', '.####.']);
  f.part('lens', { flat: true, rim: false });
  f.rect(14, 15 + y, 4, 3);
  f.part('lensCore', { flat: true, rim: false });
  f.px(15, 16 + y).px(16, 16 + y);
  for (let yy = 15; yy <= 17; yy++) for (let xx = 14; xx <= 17; xx++) f.glowPx(xx, yy + y, yy === 16 && (xx === 15 || xx === 16) ? '#FFF6D8' : '#FFE7A3');
}

registerChar('enemy_tetsuya', () =>
  buildSprite({
    id: 'enemy_tetsuya',
    w: 32,
    h: 24,
    mats: TILLER,
    draw: tillerDraw,
    walkFrameMs: 80,
    walkBob: [0, 0, 0, 0],
    walkFrames: 4,
    // the engine never stops: a 1px shake every 80 ms, the tines turning
    idle: [{}, {}, {}, {}, {}, {}],
    idleFrameMs: 80,
    anims: { charge: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 3 }], ms: 80, dirs: 'all' } },
    shadow: 26,
    keep: ['#3A7A8A', '#2A5A6A', '#5A9AA8', '#1E4450'],
  }),
);

export {};
