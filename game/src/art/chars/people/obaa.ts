import { flat, mat, type Fig, type Mats } from '../fig';
import { legs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { HAIRMAP, hangArms, head, sideArm, sideSwing, upper, type HeadT } from '../kit';

const common = {
  eye: flat('#2A1C28'),
  shine: flat('#FFF6D8'),
  blush: flat('#F4A08C'),
};

// おばあ (npc_obaa): small, slightly stooped. White bun, white kappougi, deep
// red monpe, reading glasses on a gold chain, red pen in the chest pocket.
// Idle: breathes on her grading stamp (ha—) → glasses on, reads the ledger.
// Extras: look_up, stamp, read.

const OBAA: Mats = {
  ...common,
  skin: mat('#F2C8A8', { shade: '#D8A688', light: '#FFE0C8', dark: '#A87A62', rim: '#FFBC90' }),
  hair: mat('#E8E4D8', { shade: '#C4BCB8', light: '#FFF6D8', dark: '#948A98', spec: '#FFF6D8', rim: '#FFD8B0', ol: '#5E5470' }),
  smock: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C', rim: '#FFDCB4' }),
  monpe: mat('#8A2E3A', { shade: '#64202E', light: '#AE4A52', dark: '#44141E', rim: '#C8604A' }),
  zori: mat('#6B4A3A', { shade: '#4A3228', light: '#8E6A52' }),
  chain: flat('#D9A441'),
  glass: flat('#C0C6CC'),
  lens: flat('#E8F4F8'),
  pen: flat('#E23B2E'),
  pin: flat('#8A5A3A'),
  mouth: flat('#B06A5A'),
  stamp: mat('#D9A441', { shade: '#A8742A', light: '#F6D98A' }),
  ink: flat('#E23B2E'),
  book: mat('#E8D9B5', { shade: '#C8B894', light: '#FBF3DC' }),
  breath: flat('#FFFFFFAA'),
};

const OBAA_HEAD: HeadT = {
  faceD: [4, 2, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, [
    '..HHhhhh..',
    '.HKhhhhhd.',
    'HHhhhhhhdd',
    'Hd......dd',
    'h........d',
  ], HAIRMAP],
  eyesD: { x: 6, d: 3, y: 4, h: 2, closed: true },
  mouthD: [7, 6, 2],
  blushD: [5, 10, 5],
  neckD: [7, 8, 2],
  hairU: [3, 0, ['..HHhhhh..', '.HKhhhhhd.', 'HHhhhhhhdd', 'Hhhhhhhhdd', 'hhhhhhhhdd', '.hhhhhhdd.']],
  napeU: [5, 5, ['######', '.####.']],
  faceL: [3, 2, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 0, ['..######..', '.#########', '##########', '#-..######', '.....#####', '......###.']],
  eyeL: { x: 4, y: 4, h: 2, closed: true },
  earL: [8, 4],
  mouthL: [3, 6],
  blushL: [5, 5],
  neckL: [5, 8, 2],
};

/**
 * The white bun (おだんご). Front/side: drawn before the head so the hair
 * overlaps it and a dark separation line rings its base; back: drawn over
 * the hair with its own contact shadow.
 */
function bun(f: Fig, x: number, y: number, view: 'front' | 'back' | 'side') {
  const shape = view === 'side' ? ['.###.', '#####', '#####', '.###.'] : ['.####.', '######', '######', '.####.'];
  f.part('hair', { shade: 'rb', light: 't', sep: view !== 'back' });
  f.rows(x, y, shape);
  f.retone(x + 1, y + 1, 2).retone(x + 2, y, 1).retone(x + 1, y + 2, 1);
  if (view === 'back') {
    f.part('hair', { flat: true, rim: false, ol: false });
    f.t(-2).hl(x + 1, x + shape[0].length - 2, y + 4).t(-1).px(x, y + 3).px(x + shape[0].length - 1, y + 3).t(null);
    // hairpin through the knot
    f.part('pin', { flat: true, rim: false });
    f.px(x - 1, y + 2).px(x + 6, y + 1);
  } else if (view === 'front') {
    f.part('pin', { flat: true, rim: false });
    f.px(x + 6, y + 1);
  }
}

const OBAA_LEGS: LegSpec = { cx: 8, hip: 20, foot: 22, w: 2, gap: 2, mat: 'monpe', shoe: 'zori', shoeLen: 3 };

function obaaFront(f: Fig, p: Pose) {
  const u = upper(p);
  const act = p.act;
  legs(f, p, OBAA_LEGS);
  // monpe: baggy above the gathered ankles
  f.part('monpe', { shade: 'rb', light: '' });
  f.rect(4, 18 + p.bob, 8, 3);
  f.erase(7, 20 + p.bob, 2, 1);
  // kappougi (smock) with long sleeves
  f.part('smock', { shade: 'rb', light: 't' });
  f.hl(4, 11, 12 + u);
  f.rect(3, 13 + u, 10, 18 + p.bob - (13 + u) + 1);
  f.part('smock', { flat: true });
  f.t(-1).px(7, 12 + u).px(8, 13 + u).t(-1).px(5, 18 + p.bob).px(10, 18 + p.bob).t(null);
  // chest pocket + red pen
  f.part('smock', { flat: true });
  f.t(-1).hl(9, 11, 15 + u).t(null);
  f.part('pen', { flat: true, rim: false });
  f.px(10, 14 + u);
  // glasses on the chain (unless worn)
  const reading = act === 'read';
  if (!reading) {
    f.part('chain', { flat: true, rim: false });
    f.px(5, 13 + u).px(10, 13 + u).px(6, 14 + u).px(9, 14 + u);
    f.part('glass', { flat: true, rim: false });
    f.px(7, 15 + u).px(8, 15 + u);
  }
  const sleeve: Seg[] = [{ mat: 'smock', n: 4 }, { mat: 'skin' }];
  if (act === 'breathe' || act === 'read' || act === 'stamp') {
    f.part('smock', { shade: 'rb', light: 't' });
    f.rect(2, 13 + u, 2, 3).rect(12, 13 + u, 2, 3);
    if (act === 'breathe') {
      f.part('skin', { shade: '', light: '' });
      f.rect(6, 12 + u, 4, 1);
      f.part('stamp', { shade: 'r', light: 't' });
      f.rect(7, 10 + u, 2, 2);
      f.part('ink', { flat: true, rim: false });
      f.hl(7, 8, 9 + u);
      if (p.ph === 1) f.after((pc) => { pc.set(6, 9 + u, '#FFFFFFAA'); pc.set(9, 8 + u, '#FFFFFF99'); pc.set(10, 7 + u, '#FFFFFF66'); });
    } else if (act === 'read') {
      f.part('book', { shade: 'rb', light: 't' });
      f.rect(4, 14 + u, 8, 3);
      f.part('book', { flat: true });
      f.t(-2).vl(8, 14 + u, 16 + u).t(null);
      f.part('skin', { shade: '', light: '' });
      f.px(4, 16 + u).px(11, 16 + u);
    } else {
      f.part('skin', { shade: '', light: '' });
      f.rect(6, 16 + u, 4, 1);
      f.part('stamp', { shade: 'r', light: 't' });
      f.rect(7, 16 + u + p.ph, 2, 2);
      f.part('ink', { flat: true, rim: false });
      f.hl(7, 8, 18 + u + p.ph);
    }
  } else {
    hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 17, segs: sleeve }, u);
  }
  const hy = 4 + u;
  bun(f, 5, hy - 3 - (p.lookUp ? 1 : 0), 'front');
  head(f, p, OBAA_HEAD, hy);
  if (reading) {
    f.part('glass', { flat: true, rim: false });
    f.rect(5, hy + 4, 3, 1).rect(8, hy + 4, 3, 1);
    f.part('lens', { flat: true, rim: false });
    f.px(6, hy + 5).px(9, hy + 5);
    f.part('glass', { flat: true, rim: false });
    f.px(5, hy + 5).px(7, hy + 5).px(8, hy + 5).px(10, hy + 5);
  }
}

function obaaBack(f: Fig, p: Pose) {
  const u = upper(p);
  legs(f, p, OBAA_LEGS);
  f.part('monpe', { shade: 'rb', light: '' });
  f.rect(4, 18 + p.bob, 8, 3);
  f.erase(7, 20 + p.bob, 2, 1);
  f.part('smock', { shade: 'rb', light: 't' });
  f.hl(4, 11, 12 + u);
  f.rect(3, 13 + u, 10, 18 + p.bob - (13 + u) + 1);
  // kappougi ties at the back
  f.part('smock', { flat: true });
  f.t(-1).px(7, 14 + u).px(8, 14 + u).px(7, 17 + p.bob).px(8, 17 + p.bob).t(-2).px(7, 15 + u).px(8, 16 + u).t(null);
  hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 17, segs: [{ mat: 'smock', n: 4 }, { mat: 'skin' }] }, u);
  const hy = 4 + u;
  head(f, p, OBAA_HEAD, hy);
  bun(f, 5, hy - 2, 'back');
}

function obaaSide(f: Fig, p: Pose) {
  const u = upper(p);
  const sw = sideSwing(p);
  const act = p.act;
  sideArm(f, 9, 13 + u, 4, -sw, [{ mat: 'smock', n: 3 }, { mat: 'skin' }], -1);
  legs(f, p, OBAA_LEGS);
  f.part('monpe', { shade: 'rb', light: '' });
  f.rect(5, 18 + p.bob, 6, 3);
  // stooped back: the smock humps a little behind the shoulders
  f.part('smock', { shade: 'rb', light: 't' });
  f.hl(6, 10, 12 + u);
  f.rect(5, 13 + u, 7, 18 + p.bob - (13 + u) + 1);
  f.px(12, 13 + u).px(12, 14 + u);
  f.part('pen', { flat: true, rim: false });
  f.px(6, 14 + u);
  if (act === 'stamp' || act === 'breathe' || act === 'read') {
    f.part('smock', { shade: 'rb', light: 'tl' });
    f.rect(6, 13 + u, 3, 3);
    f.part('skin', { shade: '', light: '' });
    f.px(4, 15 + u).px(3, 15 + u);
    f.part('stamp', { shade: 'r', light: 't' });
    f.rect(2, 14 + u + (act === 'stamp' ? p.ph : 0), 2, 2);
  } else {
    f.part('smock', { shade: 'rb', light: 'tl' });
    f.rect(6, 13 + u, 3, 3);
    sideArm(f, 7, 16 + u, 1, sw, [{ mat: 'skin' }]);
  }
  f.part('chain', { flat: true, rim: false });
  f.px(5, 13 + u).px(5, 14 + u);
  f.part('glass', { flat: true, rim: false });
  f.px(4, 15 + u);
  // head pokes forward (stoop)
  const hy = 4 + u;
  bun(f, 8, hy - 2 - (p.lookUp ? 1 : 0), 'side');
  head(f, p, OBAA_HEAD, hy, -1);
}

const OBAA_IDLE: IdleKey[] = [
  { act: 'breathe', ph: 0 }, { act: 'breathe', ph: 1 }, { act: 'breathe', ph: 1 }, { act: 'breathe', ph: 0 }, { act: 'breathe', ph: 1 }, { act: 'breathe', ph: 1 },
  { breath: 0 }, { breath: 0, blink: true },
  ...rep([{ act: 'read', breath: 0 }, { act: 'read', breath: 0 }, { act: 'read', breath: 1 }, { act: 'read', breath: 1 }], 3),
];

registerChar('npc_obaa', () =>
  buildSprite({
    id: 'npc_obaa',
    mats: OBAA,
    draw: (f, p) => (p.view === 'down' ? obaaFront(f, p) : p.view === 'up' ? obaaBack(f, p) : obaaSide(f, p)),
    walkFrameMs: 170,
    idle: { down: OBAA_IDLE, left: breathingIdle(), right: breathingIdle(), up: breathingIdle() },
    extras: {
      stamp: { dirs: ['down', 'left', 'right'] },
      read: { dirs: ['down'] },
      breathe: { dirs: ['down'] },
      happy: { dirs: ['down'] },
    },
    anims: {
      stamp: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 1 }, { ph: 0 }], ms: [150, 90, 300, 150], loop: false },
      breathe: { frames: [{ ph: 0 }, { ph: 1 }], ms: 400 },
    },
  }),
);

