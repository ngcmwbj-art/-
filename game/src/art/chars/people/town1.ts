// Town NPCs (1): 乾 (laundry), 鶴見巡査, サエ, 女子高生.

import { flat, mat, type Fig, type Mats } from '../fig';
import { legs, sitLegs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { hangArms, head, sideArm, sideSwing, upper, type HeadT } from '../kit';

const base = {
  eye: flat('#2A1C28'),
  shine: flat('#FFF6D8'),
  blush: flat('#F6A48E'),
  mouth: flat('#B86A5A'),
};

const skinLight = mat('#FFD9B8', { shade: '#EBB08E', light: '#FFEBD8', dark: '#C98A6A', rim: '#FFC08E' });
const skinMid = mat('#F7CFAE', { shade: '#E0A882', light: '#FFE4CC', dark: '#B87A5E', rim: '#FFBC8A' });
const blackHair = mat('#2E2226', { shade: '#20171C', dark: '#150E14', light: '#4E3C3E', spec: '#6E5656', rim: '#8A4A3A' });

// =============================================================================
// 乾 (npc_inui): 20s, slim. Round glasses, messy black hair, stretched grey
// tee, khaki half pants, sandals, a paperback. Sits on the laundromat bench:
// reads → turns a page → looks up at dryer No.3 (4s loop). Extras: sit, look_up.

const INUI: Mats = {
  ...base,
  skin: skinLight,
  hair: blackHair,
  tee: mat('#9AA0A8', { shade: '#747A88', light: '#BCC2C8', dark: '#4E5262', rim: '#D8B8A0' }),
  pants: mat('#A8742A', { shade: '#7A5424', light: '#C89A52', dark: '#4A3218', rim: '#E8A060' }),
  sandal: mat('#6B4A3A', { shade: '#4A3228', light: '#8E6A52' }),
  frame: flat('#4A4E5E'),
  lens: flat('#DCEEF4'),
  book: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFF6D8', dark: '#9E978C' }),
  page: flat('#D8C8A0'),
};

const INUI_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [2, 0, [
    '..h.hH.h.h..',
    '.hHKHhhhhhd.',
    'hHhhhhhhhhdd',
    'hhhdhhhdhhdd',
    'hd.h..h.d.dd',
    'h..........d',
    'h..........d',
  ]],
  eyesD: { x: 6, d: 3, y: 5, h: 1 },
  mouthD: [7, 7, 2],
  neckD: [7, 9, 2],
  hairU: [2, 0, ['..h.hH.h.h..', '.hHKHhhhhhd.', 'hHhhhhhhhhdd', 'hhhhhhhhhhdd', 'hhhhhhhhhhdd', 'hhhhhhhhhddd', '.hhdhhdhhdd.', '..h..h..d...']],
  napeU: [5, 7, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [2, 0, ['...h.hh.h...', '..#########.', '.##########d', '###d.#######', '.#...#######', '.....######d', '......####d.', '.......##...']],
  eyeL: { x: 4, y: 5, h: 1 },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 2],
};

function glasses(f: Fig, p: Pose, hy: number) {
  const ey = hy + 5 + (p.lookUp ? -1 : 0);
  f.part('frame', { flat: true, rim: false });
  if (p.view === 'down') {
    f.px(5, ey).px(7, ey).px(8, ey).px(10, ey).px(6, ey - 1).px(9, ey - 1).px(6, ey + 1).px(9, ey + 1);
    f.part('lens', { flat: true, rim: false });
    f.px(5, ey + 1).px(10, ey + 1);
  } else if (p.view === 'left') {
    const x = 4 + (p.lookUp ? -1 : 0);
    f.px(x - 1, ey).px(x + 1, ey).px(x, ey - 1).px(x, ey + 1).px(x + 2, ey).px(x + 3, ey);
    f.part('lens', { flat: true, rim: false });
    f.px(x - 1, ey + 1);
  } else {
    f.px(3, ey).px(12, ey);
  }
}

const INUI_LEGS: LegSpec = { cx: 8, hip: 19, foot: 22, w: 2, gap: 2, mat: 'skin', shoe: 'sandal', shoeLen: 3 };

function inuiDraw(f: Fig, p: Pose) {
  const seated = p.mode === 'idle' || p.act === 'sit' || p.act === 'read' || p.act === 'flip' || p.act === 'look' || (p.lookUp && p.mode === 'extra' && p.act === 'sit');
  const drop = seated ? 3 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const act = p.act;
  const reading = seated && (act === 'read' || act === 'flip' || act === '' || act === 'sit' || act === 'look');
  if (p.view === 'down' || p.view === 'up') {
    if (seated) sitLegs(f, p, { ...INUI_LEGS, mat: 'pants' }, 19);
    else legs(f, p, INUI_LEGS);
    if (!seated) {
      f.part('pants', { shade: 'rb', light: '' });
      f.rect(4, 17 + b, 8, 2);
      f.erase(7, 18 + b, 2, 1);
    }
    // stretched tee (collar sags on one side)
    f.part('tee', { shade: 'rb', light: 't' });
    f.hl(4, 11, 11 + u);
    f.rect(3, 12 + u, 10, 2);
    f.rect(4, 14 + u, 8, 16 + b - (14 + u) + 1);
    if (p.view === 'down') {
      f.part('skin', { shade: '', light: '' });
      f.px(7, 11 + u).px(8, 11 + u).px(8, 12 + u);
      f.part('tee', { flat: true });
      f.t(-2).px(6, 11 + u).px(9, 12 + u).t(null);
    }
    if (reading && p.view === 'down') {
      f.part('skin', { shade: '', light: '' });
      f.px(4, 16 + u).px(11, 16 + u);
      f.part('tee', { shade: 'rb', light: 't' });
      f.rect(2, 12 + u, 2, 3).rect(12, 12 + u, 2, 3);
      f.part('skin', { shade: '', light: '' });
      f.px(3, 15 + u).px(12, 15 + u);
      if (act !== 'look') {
        f.part('book', { shade: 'rb', light: 't' });
        f.rect(5, 14 + u, 6, 3);
        f.part('page', { flat: true, rim: false });
        f.hl(5, 10, 14 + u);
        if (act === 'flip') f.px(9, 13 + u).px(10, 13 + u);
      } else {
        f.part('book', { shade: 'rb', light: 't' });
        f.rect(5, 15 + u, 6, 2);
      }
    } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: [{ mat: 'tee', n: 2 }, { mat: 'skin' }] }, u);
    // from behind (he sits facing dryer No.3), reading = head bowed 1px
    const hy = 2 + u + (p.view === 'up' && reading && act !== 'look' ? 1 : 0);
    const pp = reading && act !== 'look' && p.view === 'down' ? { ...p, blink: true } : p;
    head(f, pp, INUI_HEAD, hy);
    if (act === 'look' && p.view === 'down') {
      f.part('skin', { shade: '', light: '' });
      f.px(6, hy + 5).px(9, hy + 5);
      f.part('eye', { flat: true, rim: false });
      f.px(7, hy + 5).px(10, hy + 5);
    }
    glasses(f, p, hy);
    return;
  }
  // side
  const sw = seated ? 0 : sideSwing(p);
  if (!seated) sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'tee', n: 2 }, { mat: 'skin' }], -1);
  if (seated) sitLegs(f, p, { ...INUI_LEGS, mat: 'pants' }, 19);
  else {
    legs(f, p, INUI_LEGS);
    f.part('pants', { shade: 'rb', light: '' });
    f.rect(6, 17 + b, 5, 2);
  }
  f.part('tee', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 16 + b - (12 + u) + 1 + (seated ? 1 : 0));
  f.part('tee', { shade: 'rb', light: 'tl' });
  f.rect(7, 12 + u, 3, 2);
  if (reading) {
    f.part('skin', { shade: '', light: '' });
    f.t(0).line(7, 14 + u, 5, 15 + u).t(null);
    if (act !== 'look') {
      f.part('book', { shade: 'rb', light: 't' });
      f.rect(2, 13 + u, 3, 4);
      f.part('page', { flat: true, rim: false });
      f.vl(4, 13 + u, 16 + u);
    }
  } else sideArm(f, 8, 14 + u, 2, sw, [{ mat: 'skin' }]);
  const hy = 2 + u;
  head(f, reading && act !== 'look' ? { ...p, blink: true } : p, INUI_HEAD, hy);
  glasses(f, p, hy);
}

const INUI_IDLE: IdleKey[] = [
  ...rep([{ act: 'read', breath: 0 }, { act: 'read', breath: 0 }, { act: 'read', breath: 1 }, { act: 'read', breath: 1 }], 2),
  { act: 'flip' }, { act: 'flip' }, { act: 'read' }, { act: 'read' },
  { act: 'look' }, { act: 'look' }, { act: 'look', blink: true }, { act: 'look' },
];

registerChar('npc_inui', () =>
  buildSprite({
    id: 'npc_inui',
    mats: INUI,
    draw: inuiDraw,
    idle: { down: INUI_IDLE, left: INUI_IDLE, right: INUI_IDLE, up: INUI_IDLE },
    extras: {
      sit: { dirs: 'all' },
      look_up: { dirs: 'all', p: { lookUp: true, act: 'sit' } },
      look_up_stand: { dirs: ['down'], p: { lookUp: true } },
    },
    poses: { sit: 'idle' },
  }),
);

// =============================================================================
// 鶴見巡査 (npc_tsurumi): late 20s, navy uniform and cap with a 1px gold badge,
// white gloves, right hand always at his brow in a salute, straight back,
// flashlight on the belt. Idle: holds the salute, sways 1px each second,
// sometimes flips his notebook with the left hand.

const TSURU: Mats = {
  ...base,
  skin: skinMid,
  hair: blackHair,
  uni: mat('#2F4A8A', { shade: '#223668', light: '#4766A8', dark: '#162048', rim: '#8A7AA0' }),
  cap: mat('#2A4280', { shade: '#1E305E', light: '#40609E', dark: '#141E40', rim: '#8A7AA0' }),
  visor: mat('#1E1E2A', { shade: '#141420', light: '#4A4A5E', spec: '#7A7A90' }),
  badge: flat('#FFD23F'),
  glove: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF' }),
  belt: flat('#2A2A34'),
  buckle: flat('#D9A441'),
  shoe: mat('#2A2630', { shade: '#1A1820', light: '#4A4652', spec: '#6A6676' }),
  torch: mat('#3A3F48', { shade: '#262A34', light: '#6B7186' }),
  lensY: flat('#FFE7A3'),
  note: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF' }),
  brow: flat('#2E2226'),
};

const TSURU_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 3, ['#........#', 'd........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  mouthD: [7, 7, 2],
  neckD: [7, 9, 2],
  hairU: [3, 3, ['hhhhhhhhhd', 'hhhhhhhhdd', '.hhhhhhdd.']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [7, 3, ['####', '.###', '..#.']],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 2],
};

function policeCap(f: Fig, view: string, y: number) {
  f.part('cap', { shade: 'rb', light: 't' });
  if (view === 'left') {
    f.rows(3, y, ['..######..', '.########.', '##########', '.#########']);
    f.part('visor', { shade: '', light: '' });
    f.t(0).hl(1, 5, y + 4).t(2).px(2, y + 4).t(null);
    f.part('badge', { flat: true, rim: false });
    f.px(4, y + 2);
  } else {
    f.rows(3, y, ['.########.', '##########', '##########', '.########.']);
    f.part('cap', { flat: true });
    f.t(-2).hl(4, 11, y + 3).t(null);
    if (view === 'down') {
      f.part('visor', { shade: '', light: '' });
      f.t(0).hl(4, 11, y + 4).t(2).px(5, y + 4).px(6, y + 4).t(null);
      f.part('badge', { flat: true, rim: false });
      f.px(7, y + 1).px(8, y + 1);
    }
  }
}

const TSURU_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'uni', shoe: 'shoe', shoeLen: 3 };

function tsuruDraw(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const note = p.act === 'note';
  const hy = 2 + u;
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, TSURU_LEGS);
    f.part('uni', { shade: 'rb', light: 't' });
    f.hl(4, 11, 11 + u);
    f.rect(3, 12 + u, 10, 17 + b - (12 + u) + 1);
    f.part('uni', { flat: true });
    if (p.view === 'down') f.t(-2).vl(8, 12 + u, 15 + b).t(-1).px(5, 13 + u).px(10, 13 + u).t(null);
    f.part('belt', { flat: true, rim: false });
    f.hl(3, 12, 16 + b);
    if (p.view === 'down') {
      f.part('buckle', { flat: true, rim: false });
      f.px(8, 16 + b);
      f.part('torch', { shade: 'r', light: 'l' });
      f.rect(11, 16 + b, 2, 3);
      f.part('lensY', { flat: true, rim: false });
      f.px(11, 19 + b);
      f.part('shine', { flat: true, rim: false });
      f.px(7, 12 + u).px(9, 12 + u);
    }
    const arm: Seg[] = [{ mat: 'uni', n: 3 }, { mat: 'glove' }];
    if (p.view === 'down') {
      // salute: right arm (viewer-left) out and up to the brim
      f.part('uni', { shade: 'rb', light: 't' });
      f.rows(1, 9 + u, ['..#', '.##', '##.', '##.']);
      f.part('glove', { shade: 'rb', light: 't' });
      f.rect(3, 6 + u, 2, 2).px(2, 8 + u);
      if (note) {
        f.part('uni', { shade: 'rb', light: 't', shift: -1 });
        f.rect(12, 12 + u, 2, 3);
        f.part('glove', { shade: 'r', light: '' });
        f.px(11, 15 + u);
        f.part('note', { shade: 'rb', light: 't' });
        f.rect(10, 13 + u, 3, 3);
        f.part('eye', { flat: true, rim: false });
        f.hl(10, 11, 14 + u);
        if (p.ph) f.part('note', { flat: true }).px(12, 12 + u);
      } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: arm }, u, 'R');
    } else {
      // from behind: salute elbow sticks out on his right (viewer-right)
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: arm }, u, 'L');
      f.part('uni', { shade: 'rb', light: 't', shift: -1 });
      f.rows(12, 9 + u, ['#..', '##.', '.##', '.##']);
    }
    head(f, note && p.view === 'down' ? { ...p } : p, TSURU_HEAD, hy);
    policeCap(f, p.view, hy - 1 + (p.lookUp ? -1 : 0));
    if (p.view === 'down') {
      // glove over the brim, on top of the cap
      f.part('glove', { shade: 'rb', light: 't' });
      f.rect(3, 5 + u + (p.lookUp ? -1 : 0), 2, 2);
    }
    return;
  }
  // side: salute hand in front of the brim
  const sw = sideSwing(p);
  sideArm(f, 9, 12 + u, 5, -sw, [{ mat: 'uni', n: 3 }, { mat: 'glove' }], -1);
  legs(f, p, TSURU_LEGS);
  f.part('uni', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 17 + b - (12 + u) + 1);
  f.part('belt', { flat: true, rim: false });
  f.hl(5, 10, 16 + b);
  f.part('torch', { shade: 'r', light: '' });
  f.rect(10, 16 + b, 2, 3);
  head(f, p, TSURU_HEAD, hy);
  policeCap(f, 'left', hy - 1 + (p.lookUp ? -1 : 0));
  f.part('uni', { shade: 'rb', light: 'tl' });
  f.rows(5, 8 + u, ['...##', '..##.', '.##..', '.##..', '..##.']);
  f.part('glove', { shade: 'rb', light: 't' });
  f.rect(4, 5 + u + (p.lookUp ? -1 : 0), 2, 2).px(5, 7 + u);
}

const TSURU_IDLE: IdleKey[] = [
  { breath: 0 }, { breath: 0 }, { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 1 }, { breath: 1 },
  { breath: 0 }, { breath: 0, blink: true }, { breath: 0 }, { breath: 0 },
  { act: 'note', ph: 0 }, { act: 'note', ph: 1 }, { act: 'note', ph: 0 }, { act: 'note', ph: 1 },
];

registerChar('npc_tsurumi', () =>
  buildSprite({
    id: 'npc_tsurumi',
    mats: TSURU,
    draw: tsuruDraw,
    idle: { down: TSURU_IDLE, left: breathingIdle(), right: breathingIdle(), up: breathingIdle() },
    extras: { note: { dirs: ['down'], p: { ph: 1 } }, surprised: { dirs: ['down'] } },
  }),
);

// =============================================================================
// サエ (npc_sae): Minato's classmate. Straw hat with a red ribbon, shoulder-
// length black hair, white tee, pale-blue overall shorts, white sneakers, a
// big sketchbook, pencil behind her ear. Idle: sketches (2 frames) → looks up
// at the sunset. Extras: sketch, look_up.

const SAE: Mats = {
  ...base,
  skin: skinLight,
  hair: blackHair,
  straw: mat('#F6D98A', { shade: '#D9A441', light: '#FFF0B8', dark: '#A8742A', rim: '#FFE0A0' }),
  ribbon: mat('#E84E3C', { shade: '#B8302A', light: '#FF7A5A' }),
  tee: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C', rim: '#FFDCB4' }),
  overall: mat('#7FD1E8', { shade: '#58A8C8', light: '#AEE6F4', dark: '#3A7A9A', rim: '#D8D0A8' }),
  sneaker: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF', dark: '#8E887E' }),
  sole: flat('#E84E3C'),
  sketch: mat('#D84A3C', { shade: '#A8302A', light: '#F07A5A', dark: '#6A1A1A' }),
  paper: flat('#FBF3DC'),
  pencil: flat('#FFD23F'),
  lead: flat('#3A3F48'),
};

const SAE_HEAD: HeadT = {
  faceD: [3, 4, ['.########.', '##########', '##########', '##########', '.########.', '..######..']],
  hairD: [2, 3, [
    '.hhhhhhhhhh.',
    'hhhdhhhhdhhd',
    'hd.h....h.dd',
    'h..........d',
    'h..........d',
    'hd........dd',
    '.d........d.',
  ]],
  eyesD: { x: 5, d: 5, y: 6, h: 2, shine: true },
  mouthD: [8, 8, 1],
  blushD: [4, 11, 8],
  neckD: [7, 10, 2],
  hairU: [2, 3, ['.hhhhhhhhhh.', 'hhhhhhhhhhhd', 'hhhhhhhhhhdd', 'hhhhhhhhhhdd', 'hhhhhhhhhhdd', 'hhhhhhhhhddd', '.hhdhhdhhdd.']],
  faceL: [2, 4, ['.#####....', '######....', '######....', '#######...', '.#####....', '..###.....']],
  hairL: [2, 3, ['.#########..', '##d.#######d', '#...#######d', '.....######d', '......#####d', '......####d.', '.......##d..']],
  eyeL: { x: 4, y: 6, h: 2, shine: true },
  earL: [8, 6],
  mouthL: [3, 8],
  blushL: [5, 8],
  neckL: [5, 10, 2],
};

function strawHat(f: Fig, view: string, y: number) {
  f.part('straw', { shade: 'rb', light: 't' });
  if (view === 'left') {
    f.rows(1, y, ['.....######...', '....########..', '...##########.', '##############', '.############.']);
    f.part('ribbon', { shade: 'r', light: '' });
    f.hl(4, 11, y + 2);
    f.px(12, y + 2).px(13, y + 3);
  } else {
    f.rows(1, y, ['....######....', '...########...', '..##########..', '##############', '.############.']);
    f.part('ribbon', { shade: 'r', light: '' });
    f.hl(3, 12, y + 2);
    if (view === 'up') f.px(7, y + 3).px(8, y + 3).px(7, y + 4).px(9, y + 4);
  }
  // weave texture
  f.part('straw', { flat: true });
  f.t(-1).px(4, y + 1).px(10, y + 1).px(3, y + 3).px(7, y + 4).px(12, y + 3).t(null);
}

const SAE_LEGS: LegSpec = { cx: 8, hip: 20, foot: 22, w: 2, gap: 2, mat: 'skin', low: { mat: 'tee', h: 0 }, shoe: 'sneaker', shoeLen: 3 };

function saeDraw(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const act = p.act;
  const hy = 2 + u;
  const looking = act === 'look';
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, SAE_LEGS);
    f.part('sole', { flat: true, rim: false });
    f.px(5, 22).px(10, 22);
    // overall shorts
    f.part('overall', { shade: 'rb', light: '' });
    f.rect(4, 16 + b, 8, 4);
    f.erase(7, 19 + b, 2, 1);
    f.part('tee', { shade: 'rb', light: 't' });
    f.hl(4, 11, 12 + u);
    f.rect(3, 13 + u, 10, 2);
    f.rect(4, 15 + u, 8, 16 + b - (15 + u));
    // bib + straps
    f.part('overall', { shade: 'rb', light: 't' });
    if (p.view === 'down') f.rect(5, 14 + u, 6, 16 + b - (14 + u) + 1).px(5, 13 + u).px(10, 13 + u).px(5, 12 + u).px(10, 12 + u);
    else f.px(5, 12 + u).px(6, 13 + u).px(10, 12 + u).px(9, 13 + u).px(7, 14 + u).px(8, 14 + u);
    const seg: Seg[] = [{ mat: 'tee', n: 2 }, { mat: 'skin' }];
    if ((act === 'sketch' || looking) && p.view === 'down') {
      f.part('tee', { shade: 'rb', light: 't' });
      f.rect(2, 13 + u, 2, 2).rect(12, 13 + u, 2, 2);
      f.part('sketch', { shade: 'rb', light: 't' });
      f.rect(4, 14 + u, 8, 4);
      f.part('paper', { flat: true, rim: false });
      f.rect(5, 14 + u, 6, 2);
      f.part('eye', { flat: true, rim: false });
      f.px(6, 15 + u).px(7, 14 + u).px(8, 15 + u);
      f.part('skin', { shade: '', light: '' });
      f.px(3, 16 + u).px(12, 15 + u - (act === 'sketch' ? p.ph : 0));
      f.part('pencil', { flat: true, rim: false });
      f.px(11, 14 + u - (act === 'sketch' ? p.ph : 0));
    } else {
      hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 17, segs: seg }, u, p.view === 'down' ? 'L' : 'both');
      if (p.view === 'down') {
        // sketchbook tucked under her left arm (viewer right)
        f.part('sketch', { shade: 'rb', light: 't' });
        f.rect(11, 14 + u, 4, 6);
        f.part('paper', { flat: true, rim: false });
        f.vl(11, 14 + u, 19 + u);
        f.part('skin', { shade: '', light: '', shift: -1 });
        f.px(12, 17 + u);
      }
    }
    const pp = act === 'sketch' ? { ...p, blink: true } : looking ? { ...p, lookUp: true } : p;
    head(f, pp, SAE_HEAD, hy);
    if (p.view === 'down') {
      f.part('pencil', { flat: true, rim: false });
      f.px(13, hy + 6);
    }
    strawHat(f, p.view, hy - 2 + (pp.lookUp ? -1 : 0));
    return;
  }
  const sw = sideSwing(p);
  sideArm(f, 9, 13 + u, 4, -sw, [{ mat: 'tee', n: 2 }, { mat: 'skin' }], -1);
  legs(f, p, SAE_LEGS);
  f.part('overall', { shade: 'rb', light: '' });
  f.rect(6, 16 + b, 5, 4);
  f.part('tee', { shade: 'rb', light: 't' });
  f.hl(6, 10, 12 + u);
  f.rect(5, 13 + u, 6, 16 + b - (13 + u));
  f.part('overall', { shade: 'r', light: '' });
  f.rect(5, 14 + u, 2, 16 + b - (14 + u)).px(6, 13 + u);
  if (act === 'sketch') {
    // sketchbook open on her forearm, pencil scratching (she faces the sun)
    f.part('sketch', { shade: 'rb', light: 't' });
    f.rect(1, 16 + u, 5, 1);
    f.part('paper', { flat: true, rim: false });
    f.rect(1, 15 + u, 5, 1);
    f.part('tee', { shade: 'rb', light: 'tl' });
    f.rect(7, 13 + u, 3, 2);
    f.part('skin', { shade: '', light: '' });
    f.t(0).line(7, 15 + u, 5, 16 + u).px(3 + p.ph, 14 + u).t(null);
    f.part('pencil', { flat: true, rim: false });
    f.px(2 + p.ph, 13 + u);
  } else {
    // sketchbook held against the chest
    f.part('sketch', { shade: 'rb', light: 't' });
    f.rect(3, 13 + u, 2, 6);
    f.part('paper', { flat: true, rim: false });
    f.vl(4, 13 + u, 18 + u);
    f.part('tee', { shade: 'rb', light: 'tl' });
    f.rect(7, 13 + u, 3, 2);
    f.part('skin', { shade: '', light: '' });
    f.t(0).line(7, 15 + u, 5, 16 + u).t(null);
  }
  const pp = looking ? { ...p, lookUp: true } : act === 'sketch' ? { ...p, blink: true } : p;
  head(f, pp, SAE_HEAD, hy);
  f.part('pencil', { flat: true, rim: false });
  f.px(9, hy + 5);
  strawHat(f, 'left', hy - 2 + (pp.lookUp ? -1 : 0));
}

const SAE_IDLE: IdleKey[] = [
  ...rep([{ act: 'sketch', ph: 0 }, { act: 'sketch', ph: 1 }], 5),
  { act: 'look' }, { act: 'look' }, { act: 'look' }, { act: 'look', blink: true }, { act: 'look' }, { act: 'look' },
];

registerChar('npc_sae', () =>
  buildSprite({
    id: 'npc_sae',
    mats: SAE,
    draw: saeDraw,
    idle: { down: SAE_IDLE, left: SAE_IDLE, right: SAE_IDLE, up: breathingIdle() },
    extras: { sketch: { dirs: ['down', 'left', 'right'], p: { ph: 1 } }, surprised: { dirs: ['down'] }, happy: { dirs: ['down'] } },
    anims: { sketch: { frames: [{ ph: 0 }, { ph: 1 }], ms: 250 } },
    poses: { sketch: 'idle' },
  }),
);

// =============================================================================
// 女子高生 (npc_jk): navy sailor uniform with a white scarf, pleated skirt,
// black bob, loafers, school bag on the shoulder. Her phone screen glows
// cyan and lights her face from below. Idle: phone → glances at the crossing.

const JK: Mats = {
  ...base,
  skin: mat('#FCD6B6', { shade: '#E4AE8C', light: '#FFE8D4', dark: '#BC8468', rim: '#FFC090' }),
  lit: flat('#BCD8D4'),
  lit2: flat('#DCD8C8'),
  hair: mat('#241C24', { shade: '#181218', dark: '#0E0A10', light: '#443A48', spec: '#6A5E70', rim: '#7A4A4A' }),
  sailor: mat('#2F4A8A', { shade: '#223668', light: '#4766A8', dark: '#162048', rim: '#8A7AA0' }),
  collar: flat('#F4F1E8'),
  scarf: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF' }),
  skirt: mat('#2A3E78', { shade: '#1E2E5C', light: '#3E5898', dark: '#141E40', rim: '#7A6A9A' }),
  sock: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF' }),
  loafer: mat('#2A2226', { shade: '#1A1418', light: '#4A3E44', spec: '#6A5E66' }),
  bag: mat('#3A3F48', { shade: '#262A34', light: '#5A6270', dark: '#16181E' }),
  phone: flat('#3A3F48'),
  screen: flat('#5CE1FF'),
};

const JK_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, [
    '..HHhhhh..',
    '.HKHhhhhd.',
    'HHhhhhhhhd',
    'Hhhhhhhhhd',
    'hh......dd',
    'h........d',
    'h........d',
    'hd......dd',
  ]],
  eyesD: { x: 6, d: 3, y: 5, h: 2 },
  mouthD: [7, 7, 2],
  blushD: [5, 10, 7],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['..HHhhhh..', '.HKHhhhhd.', 'HHhhhhhhhd', 'Hhhhhhhhhd', 'hhhhhhhhdd', 'hhhhhhhhdd', 'hhhhhhhhdd', 'hdhhdhhddd']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 0, ['..######..', '.########d', '##########', '###d######', '#....#####', '.....#####', '.....#####', '.....#dd#d']],
  eyeL: { x: 4, y: 5, h: 2 },
  mouthL: [3, 7],
  blushL: [5, 7],
  neckL: [5, 9, 2],
};

const JK_LEGS: LegSpec = { cx: 8, hip: 18, foot: 22, w: 2, gap: 2, mat: 'skin', low: { mat: 'sock', h: 1 }, shoe: 'loafer', shoeLen: 3 };

function jkDraw(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const act = p.act;
  const phone = act === 'phone' || (p.mode === 'extra' && act === '');
  const hy = 2 + u;
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, JK_LEGS);
    // pleated skirt
    f.part('skirt', { shade: 'rb', light: '' });
    f.rect(4, 15 + b, 8, 3);
    f.hl(3, 12, 18 + b);
    f.part('skirt', { flat: true });
    f.t(-1).px(5, 17 + b).px(7, 17 + b).px(9, 17 + b).px(11, 17 + b).px(4, 18 + b).px(6, 18 + b).px(8, 18 + b).px(10, 18 + b).t(null);
    // top
    f.part('sailor', { shade: 'rb', light: 't' });
    f.hl(4, 11, 11 + u);
    f.rect(3, 12 + u, 10, 15 + b - (12 + u));
    if (p.view === 'down') {
      f.part('collar', { flat: true, rim: false });
      f.px(4, 12 + u).px(11, 12 + u);
      f.part('skin', { shade: '', light: '' });
      f.px(7, 11 + u).px(8, 11 + u);
      f.part('scarf', { shade: 'r', light: '' });
      f.px(6, 12 + u).px(7, 12 + u).px(8, 12 + u).px(9, 12 + u).px(7, 13 + u).px(8, 13 + u).px(7, 14 + u);
    } else {
      // square sailor collar on the back with white piping
      f.part('sailor', { flat: true });
      f.t(1).rect(4, 11 + u, 8, 3).t(null);
      f.part('collar', { flat: true, rim: false });
      f.hl(4, 11, 14 + u).vl(4, 11 + u, 14 + u).vl(11, 11 + u, 14 + u);
    }
    // bag strap across the body and the bag at her right hip (viewer left)
    const seg: Seg[] = [{ mat: 'sailor', n: 3 }, { mat: 'skin' }];
    if (phone && p.view === 'down') {
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u, 'L');
      f.part('sailor', { shade: 'rb', light: 't', shift: -1 });
      f.rect(11, 12 + u, 2, 2);
      f.part('skin', { shade: '', light: '', shift: -1 });
      f.px(10, 14 + u).px(9, 14 + u);
      f.part('phone', { flat: true, rim: false });
      f.rect(8, 13 + u, 2, 2);
      f.part('screen', { flat: true, rim: false });
      f.px(8, 13 + u);
    } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u);
    if (p.view === 'down') {
      f.part('bag', { shade: 'r', light: '' });
      f.px(10, 11 + u);
      f.rect(1, 15 + u, 3, 3);
    } else {
      f.part('bag', { shade: 'r', light: '' });
      f.px(5, 11 + u);
      f.rect(12, 15 + u, 3, 3);
    }
    const pp = phone && p.view === 'down' && !p.lookUp ? { ...p, blink: true } : p;
    head(f, pp, JK_HEAD, hy);
    if (phone && p.view === 'down' && !p.lookUp) {
      // screen light on the chin and cheeks
      // cold screen light on the underside of the chin (#7FD1E8 blended into skin)
      f.part('lit', { flat: true, rim: false });
      f.px(7, hy + 8).px(8, hy + 8);
      f.part('lit2', { flat: true, rim: false });
      f.px(6, hy + 8).px(9, hy + 8);
    }
    return;
  }
  const sw = sideSwing(p);
  sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'sailor', n: 3 }, { mat: 'skin' }], -1);
  legs(f, p, JK_LEGS);
  f.part('skirt', { shade: 'rb', light: '' });
  f.rect(5, 15 + b, 6, 3);
  f.hl(4, 11, 18 + b);
  f.part('skirt', { flat: true });
  f.t(-1).px(6, 18 + b).px(8, 18 + b).px(10, 18 + b).t(null);
  f.part('sailor', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 15 + b - (12 + u));
  f.part('collar', { flat: true, rim: false });
  f.vl(10, 11 + u, 13 + u);
  f.part('scarf', { shade: 'r', light: '' });
  f.px(5, 12 + u).px(4, 13 + u);
  f.part('bag', { shade: 'r', light: '' });
  f.rect(10, 14 + u, 3, 4);
  if (phone) {
    f.part('skin', { shade: '', light: '' });
    f.t(0).line(7, 14 + u, 5, 13 + u).t(null);
    f.part('phone', { flat: true, rim: false });
    f.rect(3, 12 + u, 2, 2);
    f.part('screen', { flat: true, rim: false });
    f.px(4, 12 + u);
  } else {
    f.part('sailor', { shade: 'rb', light: 'tl' });
    f.rect(7, 12 + u, 3, 2);
    sideArm(f, 8, 14 + u, 2, sw, [{ mat: 'skin' }]);
  }
  head(f, phone && !p.lookUp ? { ...p, blink: true } : p, JK_HEAD, hy);
  if (phone && !p.lookUp) {
    f.part('lit', { flat: true, rim: false });
    f.px(3, hy + 8).px(4, hy + 8);
  }
}

const JK_IDLE: IdleKey[] = [
  ...rep([{ act: 'phone', breath: 0 }, { act: 'phone', breath: 0 }, { act: 'phone', breath: 1 }, { act: 'phone', breath: 1 }], 3),
  { breath: 0 }, { breath: 0 }, { breath: 0, blink: true }, { breath: 0 },
];

registerChar('npc_jk', () =>
  buildSprite({
    id: 'npc_jk',
    mats: JK,
    draw: jkDraw,
    idle: { down: JK_IDLE, left: JK_IDLE, right: JK_IDLE, up: breathingIdle() },
    extras: { phone: { dirs: ['down', 'left', 'right'] }, surprised: { dirs: ['down'] } },
  }),
);
