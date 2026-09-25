// 星見台 villagers (2): まつ先生, エー区長, エー夫人, トマじい, ソワカさん,
// さんかど (the mail carrier), the night train's driver (52 10.3, 50 3.3–3.11).
//
// Every one has a different build (30 9.0: never the same body in another
// colour): まつ先生 upright and narrow, エー区長 short and square, エー夫人
// small and round, トマじい tall and thin, ソワカさん plump and seated,
// さんかど long-legged. Elders are drawn with their dignity: slower idles,
// no exaggerated stoop (52 10.0).

import { flat, mat, type Fig, type Mats, type RowMap } from '../fig';
import { legs, sitLegs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { hangArms, hatLift, head, sideArm, sideSwing, upper, type HeadT } from '../kit';
import { BASE2, HAIR_GREY, HAIR_WHITE, lookHill, SKIN_FARM, SKIN_OLD } from './hoshi_kit';

const T: RowMap = { h: [null, 0], H: [null, 1], d: [null, -1], D: [null, -2], K: [null, 2] };

// =============================================================================
// まつ先生 (npc_hoshi_fumi): 67, the branch school's last teacher. Upright
// (the body a straight column), round gold-rimmed glasses filling the face
// (two 3×3 rings; a 1px glint on the left lens), short grey hair parted on
// the left, a white long-sleeved shirt under a navy vest, grey trousers, a
// red pen in the vest pocket, and the round star finder (6px, three navy
// stars) hanging on his chest. At the school window (facing north).
// Idle: turns the star finder → looks out → pushes his glasses up.
// Extras: point (the sky), glasses, look_hill, look_up.

const FUMI: Mats = {
  ...BASE2,
  skin: SKIN_OLD,
  hair: HAIR_GREY,
  shirt: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  vest: mat('#2F4A8A', { shade: '#223668', light: '#4766A8', dark: '#162048' }),
  pants: mat('#6B7186', { shade: '#4A5068', light: '#8E95A6', dark: '#3A3F48' }),
  shoe: mat('#5A3A2A', { shade: '#3A2616', light: '#8A5A3A' }),
  rim: flat('#D9A441'),
  glint: flat('#FFF6D8'),
  pen: flat('#E23B2E'),
  disc: mat('#F6D98A', { shade: '#D9A441', light: '#FFE7A3', dark: '#A8742A' }),
  star: flat('#2F4A8A'),
  cord: flat('#8A5A3A'),
};

const FUMI_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, ['..HHHhhh..', '.HHhhhhhdd', 'HhhDhhhhhd', 'hh.d....dd', 'h........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1 },
  mouthD: [7, 7, 2],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['..HHhhhh..', '.HHhhhhhdd', 'HhhhhhhhhD', 'hhhhhhhhdd', 'hhhhhhhddd', '.hhhhhhdd.']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 0, ['..HHhhh...', '.HHhhhhhd.', 'HhhhhhhhhD', 'h...hhhhdd', '.....hhhd.', '......hd..']],
  eyeL: { x: 4, y: 5, h: 1 },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 2],
  hairOpts: { shade: '', light: '' },
};
FUMI_HEAD.hairD[3] = T;
FUMI_HEAD.hairU[3] = T;
FUMI_HEAD.hairL[3] = T;

const FUMI_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', shoe: 'shoe', shoeLen: 3 };

/** Round gold glasses (front): a ring round each eye (rounded at 16px: a diamond), the bridge between. */
function fumiGlasses(f: Fig, p: Pose, hy: number) {
  const y = hy + 5 + (p.lookUp ? -2 : 0);
  f.part('rim', { flat: true, rim: false });
  for (const x of [6, 9]) f.px(x, y - 1).px(x - 1, y).px(x + 1, y).px(x, y + 1);
  f.px(8, y);
  f.part('glint', { flat: true, rim: false });
  f.px(5, y);
}

/** The star finder on his chest: a 6px disc with three navy stars (turned by `ph`). */
function starFinder(f: Fig, x: number, y: number, ph: number) {
  f.part('disc', { shade: 'rb', light: 't' });
  f.rows(x, y, ['.####.', '######', '######', '######', '.####.']);
  f.part('star', { flat: true, rim: false });
  if (ph) f.px(x + 2, y + 1).px(x + 4, y + 2).px(x + 1, y + 3);
  else f.px(x + 1, y + 1).px(x + 3, y + 1).px(x + 3, y + 3);
}

function fumiTorso(f: Fig, p: Pose, u: number, b: number, back: boolean) {
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 10, 11 + u);
  f.rect(4, 12 + u, 8, 17 + b - (12 + u));
  f.part('vest', { shade: 'rb', light: 't' });
  if (back) f.rect(4, 12 + u, 8, 16 + b - (12 + u) + 1);
  else {
    f.rows(4, 12 + u, ['###..###', '###..###', '####.###', '########']);
    f.rect(4, 16 + u, 8, 16 + b - (16 + u) + 1);
    f.part('pen', { flat: true, rim: false });
    f.px(10, 12 + u);
    f.part('cord', { flat: true, rim: false });
    f.px(6, 12 + u).px(9, 12 + u);
  }
}

function fumiFront(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const act = p.act;
  const hy = 2 + u;
  legs(f, p, FUMI_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 16 + b, 8, 2);
  f.erase(7, 17 + b, 2, 1);
  fumiTorso(f, p, u, b, false);
  const turning = act === 'finder';
  starFinder(f, 5, 13 + u, turning ? p.ph : 0);
  const ARM: Seg[] = [{ mat: 'shirt', n: 4 }, { mat: 'skin' }];
  if (turning) {
    // both hands on the rim of the disc
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(3, 12 + u, 1, 4).rect(12, 12 + u, 1, 4);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(3, 15 + u + p.ph, 2, 2).rect(11, 16 + u - p.ph, 2, 2);
  } else if (act === 'glasses') {
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: ARM }, u, 'R');
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(3, 12 + u, 2, 2).rect(4, 10 + u, 2, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(6, hy + 6, 2, 2);
  } else if (act === 'point') {
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: ARM }, u, 'L');
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(12, 9 + u, 2, 4).rect(13, 6 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(13, 4 + u, 2, 2).px(14, 3 + u);
  } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: ARM }, u);
  head(f, p, FUMI_HEAD, hy);
  fumiGlasses(f, p, hy + (act === 'glasses' ? -1 : 0));
}

function fumiBack(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const act = p.act;
  const hy = 2 + u - (act === 'look_hill' ? 1 : 0);
  legs(f, p, FUMI_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 16 + b, 8, 2);
  fumiTorso(f, p, u, b, true);
  const ARM: Seg[] = [{ mat: 'shirt', n: 4 }, { mat: 'skin' }];
  if (act === 'finder') {
    // at the window: elbows out a little, turning the disc in front of him
    f.part('shirt', { shade: 'rb', light: 't', shift: -1 });
    f.rect(2 + p.ph, 12 + u, 2, 4).rect(12 - p.ph, 12 + u, 2, 4);
  } else if (act === 'glasses') {
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: ARM }, u, 'L');
    f.part('shirt', { shade: 'rb', light: 't', shift: -1 });
    f.rect(12, 11 + u, 2, 2).rect(11, 9 + u, 2, 2);
  } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: ARM }, u);
  head(f, p, FUMI_HEAD, hy);
  // the temples of the glasses behind the ears
  f.part('rim', { flat: true, rim: false });
  f.px(3, hy + 5 + (p.lookUp ? 1 : 0)).px(12, hy + 5 + (p.lookUp ? 1 : 0));
}

function fumiSide(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const act = p.act;
  const sw = sideSwing(p);
  const hy = 2 + u;
  const lp = act === 'look_hill' ? { ...p, lookUp: true } : p;
  sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'shirt', n: 4 }, { mat: 'skin' }], -1);
  legs(f, p, FUMI_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(5, 16 + b, 6, 2);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(6, 9, 11 + u);
  f.part('vest', { shade: 'rb', light: 't' });
  f.rect(5, 12 + u, 6, 16 + b - (12 + u) + 1);
  f.part('shirt', { flat: true });
  f.t(0).px(5, 12 + u).t(null);
  // the star finder edge-on on his chest
  f.part('disc', { shade: 'r', light: 't' });
  f.rect(4, 13 + u, 2, 4);
  if (act === 'point') {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(6, 11 + u, 2, 2).rect(4, 8 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(3, 6 + u, 2, 2).px(2, 5 + u);
  } else {
    f.part('shirt', { shade: 'rb', light: 'tl' });
    f.rect(7, 12 + u, 3, 2);
    sideArm(f, 8, 14 + u, 2, sw, [{ mat: 'shirt', n: 1 }, { mat: 'skin' }]);
  }
  head(f, lp, FUMI_HEAD, hy);
  // round glasses in profile: one ring at the eye, the temple back to the ear
  const y = hy + 4 + (lp.lookUp ? -2 : 0);
  const x = lp.lookUp ? 3 : 3;
  f.part('rim', { flat: true, rim: false });
  f.hl(x, x + 2, y).px(x, y + 1).px(x + 2, y + 1).hl(x, x + 2, y + 2).hl(x + 3, x + 4, y + 1);
  f.part('glint', { flat: true, rim: false });
  f.px(x, y);
}

function fumiDraw(f: Fig, p: Pose) {
  if (p.view === 'down') fumiFront(f, p);
  else if (p.view === 'up') fumiBack(f, p);
  else fumiSide(f, p);
}

// turns the star finder → looks out (still) → pushes his glasses up (≈6s)
const FUMI_IDLE: IdleKey[] = [
  ...rep([{ act: 'finder', ph: 0 }, { act: 'finder', ph: 0 }, { act: 'finder', ph: 1 }, { act: 'finder', ph: 1 }], 2),
  { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 0, blink: true }, { breath: 0 }, { breath: 1 }, { breath: 1 },
  { act: 'glasses' }, { act: 'glasses' }, { act: 'glasses' }, { breath: 0 },
  { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 0, blink: true },
];

registerChar('npc_hoshi_fumi', () =>
  buildSprite({
    id: 'npc_hoshi_fumi',
    mats: FUMI,
    draw: fumiDraw,
    walkFrameMs: 160,
    idle: { down: FUMI_IDLE, up: FUMI_IDLE, left: breathingIdle(16, [9]), right: breathingIdle(16, [9]) },
    extras: {
      point: { dirs: ['down', 'left', 'right'] },
      glasses: { dirs: ['down', 'up'] },
      finder: { dirs: ['down', 'up'] },
    },
    anims: {
      glasses: { frames: [{ act: 'glasses' }, { act: 'glasses' }, { act: '' }], ms: [260, 200, 200], loop: false, dirs: ['down', 'up'] },
    },
    poses: { look_hill: lookHill() },
    shadow: 10,
  }),
);

// =============================================================================
// エー区長 (npc_hoshi_kucho): 79, short and square-set, thin white hair combed
// over a bald crown, square black-rimmed glasses (the other teacher has
// round gold ones), a white open-collar shirt, grey trousers, the green
// 区長 armband (two white lines) on his left arm, the blue circular board
// tucked under it. Idle: turns a page of the board → pushes his glasses up
// → clears his throat (a fist to the mouth). Extras: bow (the address bow,
// the upper body 3px forward), write, open_window (ending), look_hill.

const KUCHO: Mats = {
  ...BASE2,
  skin: SKIN_OLD,
  hair: HAIR_WHITE,
  shirt: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  pants: mat('#6B7186', { shade: '#4A5068', light: '#8E95A6', dark: '#3A3F48' }),
  shoe: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
  frame: flat('#2A2440'),
  band: mat('#3FA66B', { shade: '#2E6B4A', light: '#5FA85A' }),
  bandLine: flat('#F4F1E8'),
  board: mat('#4AA8E0', { shade: '#2F4A8A', light: '#7FD1E8', dark: '#223668' }),
  paper: flat('#F4F1E8'),
  clip: flat('#9AA0A8'),
};

const KUCHO_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  // bald on top (the dome is drawn first), white hair round the sides and back
  hairD: [3, 2, ['h........d', 'hH......hd', 'hd......dd', 'd........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1 },
  mouthD: [7, 7, 2],
  neckD: [7, 9, 2],
  hairU: [3, 2, ['hH......hd', 'hHhhhhhhhd', 'hhhhhhhhdd', '.hhhhhhdd.']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [7, 2, ['.hhd', 'hhhd', '.hdd', '..d.']],
  eyeL: { x: 4, y: 5, h: 1 },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 2],
  upD: { fringe: 'none' },
  hairOpts: { shade: '', light: '' },
};
KUCHO_HEAD.hairD[3] = T;
KUCHO_HEAD.hairU[3] = T;
KUCHO_HEAD.hairL[3] = T;

/** The bald crown (skin), lit on the upper left, under the horseshoe of white hair. */
function kuchoDome(f: Fig, view: 'down' | 'up' | 'left', hy: number) {
  f.part('skin', { flat: true });
  if (view === 'left') f.rows(3, hy, ['...HHhh...', '.HHhhhhhd.', 'Hhhhhhhhhd'], T);
  else f.rows(3, hy, ['...HHhh...', '.HHhhhhhd.', 'Hhhhhhhhhd'], T);
}

const KUCHO_LEGS: LegSpec = { cx: 8, hip: 18, foot: 22, w: 2, gap: 2, mat: 'pants', shoe: 'shoe', shoeLen: 3 };

function kuchoGlasses(f: Fig, p: Pose, hy: number) {
  const y = hy + 4 + (p.lookUp ? -2 : 0);
  f.part('frame', { flat: true, rim: false });
  // square black rims: the heavy top bars, the outer sides, a thin bridge
  f.hl(5, 7, y).hl(8, 10, y).px(5, y + 1).px(10, y + 1);
  f.part('#6B7186', { flat: true, rim: false });
  f.px(5, y + 2).px(10, y + 2);
}

function kuchoBoard(f: Fig, x: number, y: number, w: number, h: number, page = 0) {
  f.part('board', { shade: 'rb', light: 't' });
  f.rect(x, y, w, h);
  f.part('paper', { flat: true, rim: false });
  f.rect(x + 1, y + 1, w - 2, h - 2);
  f.part('clip', { flat: true, rim: false });
  f.hl(x + 1, x + w - 2, y);
  if (page) {
    f.part('paper', { flat: true, rim: false });
    f.px(x + w - 2, y - 1).px(x + w - 3, y - 1);
  }
}

function kuchoTorso(f: Fig, u: number, b: number, back: boolean) {
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(4, 11, 12 + u);
  f.rect(3, 13 + u, 10, 18 + b - (13 + u));
  f.part('shirt', { flat: true });
  if (!back) {
    // the open collar and the button line
    f.t(1).px(6, 12 + u).px(9, 12 + u).t(-1).vl(8, 14 + u, 17 + b).t(null);
  } else f.t(-1).hl(4, 11, 14 + u).t(null);
}

function kuchoFront(f: Fig, p: Pose) {
  const act = p.act;
  const bow = act === 'bow' ? 3 : 0;
  const u = upper(p) + bow;
  const b = p.bob;
  const hy = 3 + u;
  legs(f, p, KUCHO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(3, 17 + b, 10, 2);
  f.erase(7, 18 + b, 2, 1);
  kuchoTorso(f, u - bow + (bow ? 1 : 0), b, false);
  const ARM: Seg[] = [{ mat: 'shirt', n: 2 }, { mat: 'skin' }];
  // right arm (viewer-left)
  if (act === 'cough') {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(2, 13 + u, 2, 2).rect(3, 11 + u, 2, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(6, hy + 7, 2, 2);
  } else if (act === 'glasses') {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(2, 13 + u, 2, 2).rect(3, 11 + u, 2, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(5, hy + 5, 2, 2);
  } else if (act === 'write' || act === 'page') {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(2, 13 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(4, 15 + u + (act === 'write' ? p.ph : 0), 2, 2);
  } else if (act === 'open_window') {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(2, 10 + u, 2, 4);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(2, 8 + u, 2, 2);
  } else hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 18, segs: ARM }, u, 'L');
  // left arm (viewer-right): the armband, the board under it / held up
  if (act === 'write' || act === 'page') {
    kuchoBoard(f, 5, 14 + u, 7, 5, act === 'page' ? p.ph : 0);
    f.part('shirt', { shade: 'rb', light: 't', shift: -1 });
    f.rect(12, 13 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't', shift: -1 });
    f.rect(11, 17 + u, 2, 2);
  } else if (act === 'open_window') {
    f.part('shirt', { shade: 'rb', light: 't', shift: -1 });
    f.rect(12, 10 + u, 2, 4);
    f.part('skin', { shade: 'rb', light: 't', shift: -1 });
    f.rect(12, 8 + u, 2, 2);
  } else {
    kuchoBoard(f, 12, 14 + u, 3, 6);
    hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 18, segs: ARM }, u, 'R');
  }
  f.part('band', { shade: 'r', light: 't' });
  f.rect(12, 14 + u, 2, 2);
  f.part('bandLine', { flat: true, rim: false });
  f.px(12, 14 + u).px(13, 15 + u);
  kuchoDome(f, 'down', hy + hatLift(p));
  head(f, p, KUCHO_HEAD, hy);
  kuchoGlasses(f, p, hy);
}

function kuchoBack(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const hy = 3 + u - (p.act === 'look_hill' ? 1 : 0);
  legs(f, p, KUCHO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(3, 17 + b, 10, 2);
  kuchoTorso(f, u, b, true);
  hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 18, segs: [{ mat: 'shirt', n: 2 }, { mat: 'skin' }] }, u);
  // the armband on his left arm (viewer-left from behind), the board's edge
  f.part('band', { shade: 'r', light: 't' });
  f.rect(2, 14 + u, 2, 2);
  f.part('board', { shade: 'r', light: '' });
  f.rect(1, 15 + u, 1, 5);
  kuchoDome(f, 'up', hy + hatLift(p));
  head(f, p, KUCHO_HEAD, hy);
  f.part('frame', { flat: true, rim: false });
  f.px(3, hy + 5).px(12, hy + 5);
}

function kuchoSide(f: Fig, p: Pose) {
  const act = p.act;
  const bow = act === 'bow' ? 2 : 0;
  const u = upper(p);
  const b = p.bob;
  const sw = sideSwing(p);
  const hy = 3 + u + bow;
  const hx = -bow;
  const lp = act === 'look_hill' ? { ...p, lookUp: true } : p;
  sideArm(f, 9, 13 + u, 4, -sw, [{ mat: 'shirt', n: 2 }, { mat: 'skin' }], -1);
  legs(f, p, KUCHO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(5, 17 + b, 6, 2);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(6 + hx, 10, 12 + u + bow);
  f.rect(5 + Math.round(hx / 2), 13 + u, 6, 18 + b - (13 + u));
  f.part('shirt', { flat: true });
  f.t(1).px(5 + hx, 13 + u).t(null);
  // near arm (his left): armband and the board under it
  f.part('board', { shade: 'r', light: 't' });
  f.rect(8, 15 + u, 4, 4);
  f.part('shirt', { shade: 'rb', light: 'tl' });
  f.rect(7, 13 + u, 3, 2);
  f.part('band', { shade: 'r', light: 't' });
  f.rect(7, 15 + u, 2, 1);
  f.part('skin', { shade: 'rb', light: 't' });
  f.rect(7, 16 + u, 2, 2);
  f.part('bandLine', { flat: true, rim: false });
  f.px(8, 15 + u);
  f.offset(hx, 0);
  kuchoDome(f, 'left', hy + (lp.lookUp ? -1 : 0));
  f.offset(0, 0);
  head(f, lp, KUCHO_HEAD, hy, hx);
  const y = hy + 4 + (lp.lookUp ? -2 : 0);
  f.part('frame', { flat: true, rim: false });
  f.hl(3 + hx, 5 + hx, y).px(3 + hx, y + 1).px(5 + hx, y + 1).hl(6 + hx, 8 + hx, y);
}

function kuchoDraw(f: Fig, p: Pose) {
  if (p.view === 'down') kuchoFront(f, p);
  else if (p.view === 'up') kuchoBack(f, p);
  else kuchoSide(f, p);
}

// the board (turn a page) → glasses → a cough into his fist (≈7s)
const KUCHO_IDLE: IdleKey[] = [
  { act: 'page', ph: 0 }, { act: 'page', ph: 0 }, { act: 'page', ph: 1 }, { act: 'page', ph: 1 }, { act: 'page', ph: 0 }, { act: 'page', ph: 0, blink: true },
  { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 },
  { act: 'glasses' }, { act: 'glasses' }, { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 },
  { act: 'cough' }, { act: 'cough', breath: 1 }, { act: 'cough' }, { breath: 0 }, { breath: 0, blink: true }, { breath: 1 }, { breath: 1 }, { breath: 0 },
];

registerChar('npc_hoshi_kucho', () =>
  buildSprite({
    id: 'npc_hoshi_kucho',
    mats: KUCHO,
    draw: kuchoDraw,
    walkFrameMs: 170,
    idle: { down: KUCHO_IDLE, up: breathingIdle(), left: breathingIdle(16, [10]), right: breathingIdle(16, [10]) },
    extras: {
      bow: { dirs: ['down', 'left', 'right'] },
      write: { dirs: ['down'] },
      open_window: { dirs: ['down'] },
      glasses: { dirs: ['down'] },
      cough: { dirs: ['down'] },
    },
    anims: {
      bow: { frames: [{ act: '' }, { act: 'bow' }, { act: 'bow' }, { act: '' }], ms: [120, 700, 300, 200], loop: false, dirs: ['down', 'left', 'right'] },
      write: { frames: [{ ph: 0 }, { ph: 1 }], ms: 180 },
    },
    poses: { look_hill: lookHill() },
    shadow: 11,
  }),
);

// =============================================================================
// エー夫人 (npc_hoshi_yoshie): 74, small (21) and round-faced, a blue tenugui
// over her hair, a pink apron sprigged with white flowers over a cream
// blouse, the kettle in both hands. By the tea table (facing west).
// Idle: pours into a cup (the kettle tips, 2 frames) → straightens the
// pickles plate. Extras: pour, look_up, look_hill.

const YOSHIE: Mats = {
  ...BASE2,
  skin: SKIN_OLD,
  hair: HAIR_GREY,
  blush: flat('#E8A08C'),
  tenugui: mat('#4AA8E0', { shade: '#2F4A8A', light: '#7FD1E8', dark: '#223668' }),
  blouse: mat('#E8E4D8', { shade: '#C8C2B4', light: '#F4F1E8', dark: '#9AA0A8' }),
  apron: mat('#D9728A', { shade: '#B04A7A', light: '#E8A0B0', dark: '#8A2E3A' }),
  flower: flat('#F4F1E8'),
  skirt: mat('#6B7186', { shade: '#4A5068', light: '#8E95A6', dark: '#3A3F48' }),
  shoe: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A' }),
  kettle: mat('#9AA0A8', { shade: '#6B7186', light: '#C8CDD4', dark: '#3A3F48' }),
  handle: flat('#2A2440'),
  dish: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8' }),
  pickle: flat('#5FA85A'),
};

const YOSHIE_HEAD: HeadT = {
  // a round face, the tenugui covering the hair (drawn over it)
  faceD: [3, 3, ['.########.', '##########', '##########', '##########', '.########.', '..######..']],
  hairD: [3, 1, ['.hhhhhhhh.', 'hh......hh', 'h........h']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, closed: true },
  mouthD: [7, 7, 2],
  blushD: [4, 11, 6],
  neckD: [7, 9, 2],
  hairU: [3, 1, ['.hhhhhhhh.', 'hhhhhhhhhh', 'hhhhhhhhhd', '.hhhhhhhd.']],
  napeU: [5, 5, ['######', '.####.']],
  faceL: [3, 3, ['.#####..', '######..', '#######.', '######..', '.#####..', '..###...']],
  hairL: [6, 1, ['hhhh', 'hhhh', '.hhh', '..hd']],
  eyeL: { x: 4, y: 5, h: 1, closed: true },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 7],
  neckL: [5, 9, 2],
  upD: { fringe: 'none', openEyes: true },
  hairOpts: { shade: '', light: '' },
};

/** The tenugui tied over her hair (knot and tails at the back of the head). */
function tenugui(f: Fig, view: 'down' | 'up' | 'left', hy: number) {
  f.part('tenugui', { flat: true });
  if (view === 'left') {
    // round over the crown, down to the ear; the knot's tails behind
    f.rows(3, hy, ['...HHhhh..', '.HHhhhhhhd', '.Hhhhhhhhd', '..dhhhhhdd'], T);
    f.rows(11, hy + 3, ['hd', 'dd', '.d'], T);
    f.part('flower', { flat: true, rim: false });
    f.px(6, hy + 2).px(9, hy + 2);
    return;
  }
  f.rows(3, hy, ['..HHhhhh..', '.HHhhhhhhd', 'HHhhhhhhhd', 'dhhhhhhhhd'], T);
  if (view === 'down') {
    // the dye pattern: a row of little white dots
    f.part('flower', { flat: true, rim: false });
    f.px(5, hy + 2).px(8, hy + 2).px(11, hy + 2);
  } else {
    // from behind: the knot, its two tails hanging over the nape
    f.part('tenugui', { flat: true });
    f.rows(6, hy + 3, ['DhhD', 'd..d', 'd..d'], T);
  }
}

const YOSHIE_LEGS: LegSpec = { cx: 8, hip: 19, foot: 22, w: 2, gap: 2, mat: 'skirt', shoe: 'shoe', shoeLen: 3 };

function apronDots(f: Fig, x0: number, x1: number, y0: number, y1: number) {
  f.part('flower', { flat: true, rim: false });
  for (let y = y0; y <= y1; y += 2) for (let x = x0 + ((y - y0) / 2) % 2; x <= x1; x += 3) f.px(x, y);
}

function kettleFront(f: Fig, x: number, y: number, tip: number) {
  f.part('kettle', { shade: 'rb', light: 't' });
  f.rows(x, y + tip, ['.###.', '#####', '#####', '.###.']);
  f.part('handle', { flat: true, rim: false });
  f.hl(x + 1, x + 3, y - 1 + tip);
  f.part('kettle', { shade: 'r', light: '' });
  f.px(x + 5, y + 1 + tip * 2).px(x + 6, y + tip * 2);
}

function yoshieFront(f: Fig, p: Pose) {
  const act = p.act;
  const u = upper(p);
  const b = p.bob;
  const hy = 4 + u;
  legs(f, p, YOSHIE_LEGS);
  f.part('skirt', { shade: 'rb', light: '' });
  f.rect(4, 17 + b, 8, 3);
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(5, 10, 13 + u);
  f.rect(4, 14 + u, 8, 18 + b - (14 + u));
  f.part('apron', { shade: 'rb', light: 't' });
  f.rect(5, 14 + u, 6, 19 + b - (14 + u));
  f.rect(4, 17 + b, 8, 3);
  apronDots(f, 5, 10, 15 + u, 19 + b);
  if (act === 'plate') {
    f.part('blouse', { shade: 'rb', light: 't' });
    f.rect(3, 14 + u, 1, 3).rect(12, 14 + u, 1, 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(4, 17 + u, 2, 1).rect(10, 17 + u, 2, 1);
    f.part('dish', { shade: 'rb', light: 't' });
    f.rows(4, 16 + u, ['########', '.######.']);
    f.part('pickle', { flat: true, rim: false });
    f.px(6 + p.ph, 16 + u).px(8, 16 + u).px(9 - p.ph, 16 + u);
  } else if (act === 'look_up' || p.lookUp) {
    hangArms(f, p, { lx: 3, rx: 12, sy: 14, hy: 18, segs: [{ mat: 'blouse', n: 2 }, { mat: 'skin' }] }, u);
  } else {
    // both hands on the kettle in front of her
    f.part('blouse', { shade: 'rb', light: 't' });
    f.rect(3, 14 + u, 1, 3).rect(12, 14 + u, 1, 3);
    kettleFront(f, 5, 16 + u, act === 'pour' ? p.ph : 0);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(4, 17 + u, 2, 1).rect(10, 17 + u, 2, 1);
  }
  head(f, p, YOSHIE_HEAD, hy);
  tenugui(f, 'down', hy - 1 + hatLift(p));
}

function yoshieBack(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const hy = 4 + u - (p.act === 'look_hill' ? 1 : 0);
  legs(f, p, YOSHIE_LEGS);
  f.part('skirt', { shade: 'rb', light: '' });
  f.rect(4, 17 + b, 8, 3);
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(5, 10, 13 + u);
  f.rect(4, 14 + u, 8, 18 + b - (14 + u));
  // the apron's tie in a bow at her back
  f.part('apron', { flat: true });
  f.t(0).hl(4, 11, 17 + b).t(1).px(7, 16 + b).t(-1).px(8, 16 + b).px(7, 18 + b).t(null);
  hangArms(f, p, { lx: 3, rx: 12, sy: 14, hy: 17, segs: [{ mat: 'blouse', n: 2 }, { mat: 'skin' }] }, u);
  head(f, p, YOSHIE_HEAD, hy);
  tenugui(f, 'up', hy - 1 + hatLift(p));
}

function yoshieSide(f: Fig, p: Pose) {
  const act = p.act;
  const u = upper(p);
  const b = p.bob;
  const sw = sideSwing(p);
  const hy = 4 + u;
  const lp = act === 'look_hill' ? { ...p, lookUp: true } : p;
  const carry = act !== 'look_hill' && !p.lookUp && p.mode !== 'walk';
  if (!carry) sideArm(f, 9, 14 + u, 3, -sw, [{ mat: 'blouse', n: 1 }, { mat: 'skin' }], -1);
  legs(f, p, YOSHIE_LEGS);
  f.part('skirt', { shade: 'rb', light: '' });
  f.rect(5, 17 + b, 6, 3);
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(6, 9, 13 + u);
  f.rect(5, 14 + u, 6, 18 + b - (14 + u));
  f.part('apron', { shade: 'r', light: '' });
  f.vl(4, 15 + u, 19 + b);
  f.vl(5, 14 + u, 19 + b);
  f.part('apron', { flat: true });
  f.t(0).hl(6, 10, 17 + b).t(null);
  if (carry) {
    // the kettle held out in front, tipping to pour
    const tip = act === 'pour' ? p.ph : 0;
    f.part('blouse', { shade: 'rb', light: 't' });
    f.rect(6, 14 + u, 3, 2);
    f.part('kettle', { shade: 'rb', light: 't' });
    f.rows(0, 15 + u + tip, ['.###.', '#####', '#####', '.###.']);
    f.part('handle', { flat: true, rim: false });
    f.hl(1, 3, 14 + u + tip);
    f.part('kettle', { shade: 'r', light: '' });
    if (tip) f.px(0, 18 + u).px(0, 17 + u);
    else f.px(0, 16 + u);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(4, 16 + u, 2, 2);
  } else {
    f.part('blouse', { shade: 'rb', light: 'tl' });
    f.rect(7, 14 + u, 2, 2);
    sideArm(f, 8, 16 + u, 1, sw, [{ mat: 'skin' }]);
  }
  head(f, lp, YOSHIE_HEAD, hy);
  tenugui(f, 'left', hy - 1 + (lp.lookUp ? -1 : 0));
}

function yoshieDraw(f: Fig, p: Pose) {
  if (p.view === 'down') yoshieFront(f, p);
  else if (p.view === 'up') yoshieBack(f, p);
  else yoshieSide(f, p);
}

// pours a cup (the kettle tips twice) → straightens the pickles (≈6s)
const YOSHIE_POUR: IdleKey[] = [
  { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 },
  { act: 'pour', ph: 1 }, { act: 'pour', ph: 1 }, { act: 'pour', ph: 1 }, { act: 'pour', ph: 0 },
  { breath: 0, blink: true }, { breath: 0 }, { breath: 1 }, { breath: 1 },
  { act: 'pour', ph: 1 }, { act: 'pour', ph: 1 }, { act: 'pour', ph: 0 }, { breath: 0 },
  { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 0, blink: true },
];
const YOSHIE_FRONT: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 2),
  { act: 'plate', ph: 0 }, { act: 'plate', ph: 0 }, { act: 'plate', ph: 1 }, { act: 'plate', ph: 1 }, { act: 'plate', ph: 0, blink: true }, { act: 'plate', ph: 0 },
  { act: 'pour', ph: 1 }, { act: 'pour', ph: 1 }, { act: 'pour', ph: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 },
];

registerChar('npc_hoshi_yoshie', () =>
  buildSprite({
    id: 'npc_hoshi_yoshie',
    mats: YOSHIE,
    draw: yoshieDraw,
    walkFrameMs: 170,
    idle: { down: YOSHIE_FRONT, up: breathingIdle(), left: YOSHIE_POUR, right: YOSHIE_POUR },
    extras: {
      pour: { dirs: ['down', 'left', 'right'], p: { ph: 1 } },
      plate: { dirs: ['down'] },
    },
    anims: {
      pour: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 1 }, { ph: 1 }, { ph: 0 }], ms: [150, 300, 400, 300, 200], loop: false, dirs: ['down', 'left', 'right'] },
    },
    poses: { look_hill: lookHill() },
    shadow: 10,
    keep: ['#E8A0B0'],
  }),
);

// =============================================================================
// トマじい (npc_hoshi_tome): 88, the village's oldest farmer at work. Tall
// and lean (24), a high-crowned straw hat, a grey long-sleeved work shirt,
// a towel tucked in at the waist, dark rubber boots, the little wooden board
// of the paddy's water inlet in his hands. White stubble, narrow eyes. He
// stands straight (no exaggerated stoop). Idle: nudges the board → watches
// the water (head down 1px) → straightens his back (1px up). Extras:
// look_hill, look_up.

const TOME: Mats = {
  ...BASE2,
  skin: SKIN_FARM,
  hair: HAIR_WHITE,
  stubble: flat('#C8C2B4'),
  straw: mat('#F6D98A', { shade: '#D9A441', light: '#FFE7A3', dark: '#A8742A' }),
  strawBand: flat('#2E6B4A'),
  shirt: mat('#C8C2B4', { shade: '#9AA0A8', light: '#E8E4D8', dark: '#6B7186' }),
  pants: mat('#6B7186', { shade: '#4A5068', light: '#8E95A6', dark: '#3A3F48' }),
  boot: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186', dark: '#1B1733' }),
  towel: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8' }),
  board: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A' }),
};

const TOME_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 3, ['#........#', 'd........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, closed: true },
  mouthD: [7, 7, 2],
  neckD: [7, 9, 2],
  hairU: [3, 3, ['hhhhhhhhhh', 'hhhhhhhhhd', '.hhhhhhhd.']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [7, 3, ['####', '.##d']],
  eyeL: { x: 4, y: 5, h: 1, closed: true },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 2],
  upD: { fringe: 'none', openEyes: true, whites: false },
};

/** The tall straw hat (mugiwara): a high round crown, a green band, a round brim. */
function mugiwara(f: Fig, view: 'down' | 'up' | 'left', hy: number) {
  f.part('straw', { flat: true });
  if (view === 'left') {
    f.rows(5, hy - 3, ['.HHhhd.', 'HHhhhhd', 'Hhhhhhd', '=======', ], { ...T, '=': ['strawBand', 0] });
    f.rows(1, hy + 1, ['.Hhhhhhhhhhhd', 'Hhhhhhhhhhhhhd', '.ddd......ddd'], T);
    return;
  }
  f.rows(4, hy - 3, ['.HHhhhd.', 'HHhhhhhd', 'Hhhhhhdd', '========'], { ...T, '=': ['strawBand', 0] });
  f.rows(1, hy + 1, ['.Hhhhhhhhhhhd.', 'HHhhhhhhhhhhhd', view === 'down' ? '.dd........dd.' : '.dddddddddddd.'], T);
  // the weave: a few darker stitches
  f.t(-1).px(3, hy + 2).px(12, hy + 2).px(7, hy - 1).px(9, hy - 2).t(null);
}

const TOME_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', low: { mat: 'boot', h: 4 }, shoe: 'boot', shoeLen: 3 };

function tomeFront(f: Fig, p: Pose) {
  const act = p.act;
  const u = upper(p) + (act === 'watch' ? 1 : 0) - (act === 'stretch' ? 1 : 0);
  const b = p.bob;
  const hy = 2 + u;
  legs(f, p, TOME_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 16 + b, 8, 2);
  f.erase(7, 17 + b, 2, 1);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 10, 11 + u);
  f.rect(4, 12 + u, 8, 17 + b - (12 + u));
  f.part('shirt', { flat: true });
  f.t(-1).vl(8, 12 + u, 15 + b).t(null);
  // the towel tucked in at the waist
  f.part('towel', { shade: 'r', light: 't' });
  f.rect(10, 15 + b, 2, 4);
  const ARM: Seg[] = [{ mat: 'shirt', n: 4 }, { mat: 'skin' }];
  if (act === 'stretch') {
    // hands at the small of the back, elbows out
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(2, 12 + u, 2, 4).rect(12, 12 + u, 2, 4);
  } else if (p.mode === 'walk' || p.lookUp) {
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: ARM }, u);
  } else {
    // the inlet board held low in both hands
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(3, 12 + u, 1, 4).rect(12, 12 + u, 1, 4);
    f.part('board', { shade: 'rb', light: 't' });
    f.rect(5 + (act === 'nudge' ? p.ph : 0), 16 + u, 6, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(4, 16 + u, 2, 2).rect(10, 16 + u, 2, 2);
  }
  head(f, p, TOME_HEAD, hy);
  if (!p.lookUp) {
    f.part('stubble', { flat: true, rim: false });
    f.px(6, hy + 8).px(9, hy + 8).px(5, hy + 7).px(10, hy + 7);
  }
  mugiwara(f, 'down', hy + hatLift(p));
  if (!p.lookUp) f.retone(4, hy + 3, -1, 8, 1);
}

function tomeBack(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const hy = 2 + u - (p.act === 'look_hill' ? 1 : 0);
  legs(f, p, TOME_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 16 + b, 8, 2);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 10, 11 + u);
  f.rect(4, 12 + u, 8, 17 + b - (12 + u));
  f.part('towel', { shade: 'r', light: 't' });
  f.rect(4, 15 + b, 2, 4);
  hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: [{ mat: 'shirt', n: 4 }, { mat: 'skin' }] }, u);
  head(f, p, TOME_HEAD, hy);
  mugiwara(f, 'up', hy + hatLift(p));
}

function tomeSide(f: Fig, p: Pose) {
  const act = p.act;
  const u = upper(p) + (act === 'watch' ? 1 : 0) - (act === 'stretch' ? 1 : 0);
  const b = p.bob;
  const sw = sideSwing(p);
  const hy = 2 + u;
  const lp = act === 'look_hill' ? { ...p, lookUp: true } : p;
  sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'shirt', n: 4 }, { mat: 'skin' }], -1);
  legs(f, p, TOME_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(5, 16 + b, 6, 2);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(6, 9, 11 + u);
  f.rect(5, 12 + u, 5, 17 + b - (12 + u));
  f.part('towel', { shade: 'r', light: 't' });
  f.rect(9, 15 + b, 2, 4);
  if (p.mode === 'walk' || lp.lookUp) {
    f.part('shirt', { shade: 'rb', light: 'tl' });
    f.rect(6, 12 + u, 3, 2);
    sideArm(f, 7, 14 + u, 3, sw, [{ mat: 'shirt', n: 1 }, { mat: 'skin' }]);
  } else {
    f.part('shirt', { shade: 'rb', light: 'tl' });
    f.rect(5, 12 + u, 3, 3);
    f.part('board', { shade: 'rb', light: 't' });
    f.rect(1 - (act === 'nudge' ? p.ph : 0), 15 + u, 2, 5);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(3, 15 + u, 2, 2);
  }
  head(f, lp, TOME_HEAD, hy);
  mugiwara(f, 'left', hy + (lp.lookUp ? -1 : 0));
  if (!lp.lookUp) f.retone(3, hy + 3, -1, 5, 1);
}

function tomeDraw(f: Fig, p: Pose) {
  if (p.view === 'down') tomeFront(f, p);
  else if (p.view === 'up') tomeBack(f, p);
  else tomeSide(f, p);
}

// the board nudged → the water watched → the back straightened (≈7s)
const TOME_IDLE: IdleKey[] = [
  { act: 'nudge', ph: 0 }, { act: 'nudge', ph: 1 }, { act: 'nudge', ph: 1 }, { act: 'nudge', ph: 0 }, { act: 'nudge', ph: 0, blink: true },
  { act: 'watch' }, { act: 'watch' }, { act: 'watch' }, { act: 'watch', breath: 1 }, { act: 'watch', breath: 1 }, { act: 'watch' },
  { breath: 0 }, { breath: 0 },
  { act: 'stretch' }, { act: 'stretch' }, { act: 'stretch' }, { act: 'stretch', blink: true },
  { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 },
];

registerChar('npc_hoshi_tome', () =>
  buildSprite({
    id: 'npc_hoshi_tome',
    mats: TOME,
    draw: tomeDraw,
    walkFrameMs: 175,
    idle: { down: TOME_IDLE, up: breathingIdle(), left: TOME_IDLE, right: TOME_IDLE },
    extras: { stretch: { dirs: ['down', 'left', 'right'] }, watch: { dirs: ['down', 'left', 'right'] } },
    poses: { look_hill: lookHill() },
    shadow: 10,
  }),
);

// =============================================================================
// ソワカさん (npc_hoshi_sawako): 71, painter and keeper of the unmanned stall.
// Plump, seated on her round stool (16 tall): a wine-red beret (a pink
// light on its crown), grey bobbed hair, a cream smock with dots of paint
// (orange, green, blue), the small sketchbook (navy cover) on her knees and
// a brush in her right hand, its tip red. Idle: draws (the brush 2 frames)
// → holds the brush up at arm's length and closes one eye to measure the
// night → leans over to straighten the vegetable bags. Standing she is 20.

const SAWAKO: Mats = {
  ...BASE2,
  skin: SKIN_OLD,
  hair: HAIR_GREY,
  blush: flat('#E8A08C'),
  beret: mat('#8A2E3A', { shade: '#5A1E2A', light: '#B04A7A', dark: '#3A1420' }),
  smock: mat('#E8D9B5', { shade: '#C8A06A', light: '#FBF3DC', dark: '#A8742A' }),
  paint1: flat('#F2894B'),
  paint2: flat('#5FA85A'),
  paint3: flat('#4AA8E0'),
  skirt: mat('#5A3A2A', { shade: '#3A2616', light: '#8A5A3A' }),
  shoe: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
  book: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8' }),
  cover: mat('#2F4A8A', { shade: '#223668', light: '#4766A8' }),
  brush: flat('#C8A06A'),
  tip: flat('#E84E3C'),
  bag: mat('#E8D9B5', { shade: '#C8A06A', light: '#FBF3DC', dark: '#A8742A' }),
};

const SAWAKO_HEAD: HeadT = {
  faceD: [3, 3, ['.########.', '##########', '##########', '##########', '.########.', '..######..']],
  // a grey bob to the jaw
  hairD: [2, 1, ['..hhhhhhhh..', '.hh......hh.', 'hh........hd', 'hd........dd', 'hd........dd', '.d........d.']],
  eyesD: { x: 6, d: 3, y: 5, h: 1 },
  mouthD: [7, 7, 2],
  blushD: [4, 11, 6],
  neckD: [7, 9, 2],
  hairU: [2, 1, ['..hhhhhhhh..', '.hhhhhhhhhh.', 'hhhhhhhhhhhd', 'hhhhhhhhhhdd', 'hhhhhhhhhhdd', '.hhhhhhhhdd.', '..dddddddd..']],
  faceL: [3, 3, ['.#####..', '######..', '#######.', '######..', '.#####..', '..###...']],
  hairL: [4, 1, ['.hhhhhh...', 'hhh.hhhhh.', '....hhhhhd', '.....hhhhd', '.....hhhdd', '......hdd.']],
  eyeL: { x: 4, y: 5, h: 1 },
  earL: [9, 6],
  mouthL: [3, 7],
  blushL: [5, 7],
  neckL: [5, 9, 2],
  upD: { fringe: 'none' },
  hairOpts: { shade: '', light: '' },
};
SAWAKO_HEAD.hairD[3] = T;
SAWAKO_HEAD.hairU[3] = T;
SAWAKO_HEAD.hairL[3] = T;

/** The beret, tilted toward her right (screen left), a stalk on top. */
function beret(f: Fig, view: 'down' | 'up' | 'left', hy: number) {
  f.part('beret', { flat: true });
  if (view === 'left') {
    f.rows(2, hy - 1, ['...HHhhh..', '.HHhhhhhhd', 'Hhhhhhhhhd', '.dddddddd.'], T);
    f.rows(7, hy - 2, ['d'], T);
    return;
  }
  f.rows(2, hy - 1, ['..HHHhhh....', 'HHHhhhhhhhd.', 'Hhhhhhhhhhhd', '.dddddddddd.'], T);
  f.rows(7, hy - 2, ['d'], T);
}

function paintDots(f: Fig, pts: [number, number, string][]) {
  for (const [x, y, m] of pts) {
    f.part(m, { flat: true, rim: false });
    f.px(x, y);
  }
}

const SAWAKO_LEGS: LegSpec = { cx: 8, hip: 18, foot: 22, w: 2, gap: 2, mat: 'skirt', shoe: 'shoe', shoeLen: 3 };

function sawakoSeated(p: Pose): boolean {
  return p.act === 'sit' || p.act === 'draw' || p.act === 'measure' || p.act === 'bags' || p.act === 'sit_hill';
}

function sawakoFront(f: Fig, p: Pose) {
  const act = p.act;
  const seated = sawakoSeated(p);
  const drop = seated ? 4 : 0;
  const lean = act === 'bags' ? 2 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const hy = 3 + u;
  if (seated) sitLegs(f, p, SAWAKO_LEGS, 20);
  else legs(f, p, SAWAKO_LEGS);
  // the smock: wide and round, down over the lap
  f.part('smock', { shade: 'rb', light: 't' });
  f.hl(5, 10, 12 + u);
  f.hl(3, 12, 13 + u);
  f.rect(2, 14 + u, 12, 19 + b - (14 + u));
  f.part('smock', { flat: true });
  // the round collar, the placket, a patch pocket, the hem curving up at the sides
  f.t(1).hl(6, 9, 12 + u).t(-1).px(5, 13 + u).px(10, 13 + u).vl(8, 14 + u, 17 + b).t(null);
  f.t(-1).hl(9, 11, 16 + b).vl(9, 17 + b, 18 + b).vl(11, 17 + b, 18 + b).t(null);
  f.t(-1).hl(3, 12, 19 + b).t(null);
  f.erase(2, 19 + b, 1, 1);
  f.erase(13, 19 + b, 1, 1);
  paintDots(f, [[4, 15 + u, 'paint1'], [10, 14 + u, 'paint2'], [6, 18 + b, 'paint3'], [12, 16 + b, 'paint1'], [3, 17 + b, 'paint2']]);
  if (seated) {
    // the sketchbook on her knees
    f.part('cover', { shade: 'rb', light: 't' });
    f.rect(5, 17 + b, 6, 2);
    f.part('book', { shade: 'rb', light: 't' });
    f.rect(5, 16 + b, 6, 1);
    if (act === 'measure') {
      // the brush up at arm's length, one eye shut
      f.part('smock', { shade: 'rb', light: 't', shift: -1 });
      f.rect(12, 11 + u, 2, 3).rect(13, 8 + u, 2, 3);
      f.part('skin', { shade: 'rb', light: 't', shift: -1 });
      f.rect(13, 6 + u, 2, 2);
      f.part('brush', { flat: true, rim: false });
      f.vl(14, 2 + u, 5 + u);
      f.part('tip', { flat: true, rim: false });
      f.px(14, 1 + u);
      f.part('skin', { shade: 'rb', light: 't' });
      f.rect(3, 16 + b, 2, 2);
    } else if (act === 'bags') {
      f.part('smock', { shade: 'rb', light: 't' });
      f.rect(0, 14 + u, 3, 2);
      f.part('skin', { shade: 'rb', light: 't' });
      f.rect(0, 16 + u, 2, 2);
      f.part('bag', { shade: 'rb', light: 't' });
      f.rows(0, 18 + u - p.ph, ['###', '###']);
    } else {
      f.part('skin', { shade: 'rb', light: 't' });
      f.rect(3, 16 + b, 2, 2);
      // the brush moving over the page
      const k = act === 'draw' ? p.ph : 0;
      f.part('skin', { shade: 'rb', light: 't', shift: -1 });
      f.rect(10 - k, 15 + b, 2, 2);
      f.part('brush', { flat: true, rim: false });
      f.px(9 - k, 16 + b).px(8 - k, 17 + b);
      f.part('tip', { flat: true, rim: false });
      f.px(7 - k, 17 + b);
    }
  } else {
    hangArms(f, p, { lx: 2, rx: 13, sy: 14, hy: 18, segs: [{ mat: 'smock', n: 3 }, { mat: 'skin' }] }, u);
  }
  head(f, { ...p, blink: p.blink || act === 'measure' }, SAWAKO_HEAD, hy + lean);
  if (act === 'measure' && !p.blink) {
    // one eye open (the viewer-left), the other shut
    f.part('eye', { flat: true, rim: false });
    f.px(6, hy + 5);
  }
  beret(f, 'down', hy + lean + hatLift(p));
}

function sawakoBack(f: Fig, p: Pose) {
  const seated = sawakoSeated(p);
  const drop = seated ? 4 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const hy = 3 + u - (p.act === 'look_hill' || p.act === 'sit_hill' ? 1 : 0);
  if (seated) {
    f.part('shoe', { shade: 'r', light: '' });
    f.rect(4, 22, 2, 1).rect(10, 22, 2, 1);
  } else legs(f, p, SAWAKO_LEGS);
  f.part('smock', { shade: 'rb', light: 't' });
  f.hl(5, 10, 12 + u);
  f.hl(3, 12, 13 + u);
  f.rect(2, 14 + u, 12, 19 + b - (14 + u));
  paintDots(f, [[5, 16 + u, 'paint3'], [11, 18 + b, 'paint1']]);
  if (!seated) hangArms(f, p, { lx: 2, rx: 13, sy: 14, hy: 18, segs: [{ mat: 'smock', n: 3 }, { mat: 'skin' }] }, u);
  else {
    f.part('smock', { shade: 'rb', light: 't', shift: -1 });
    f.rect(1, 14 + u, 1, 4).rect(14, 14 + u, 1, 4);
  }
  head(f, p, SAWAKO_HEAD, hy);
  beret(f, 'up', hy + hatLift(p));
}

function sawakoSide(f: Fig, p: Pose) {
  const act = p.act;
  const seated = sawakoSeated(p);
  const drop = seated ? 4 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const sw = sideSwing(p);
  const hy = 3 + u;
  const lp = act === 'look_hill' || act === 'sit_hill' ? { ...p, lookUp: true } : p;
  if (seated) sitLegs(f, p, SAWAKO_LEGS, 20);
  else {
    sideArm(f, 10, 14 + u, 4, -sw, [{ mat: 'smock', n: 3 }, { mat: 'skin' }], -1);
    legs(f, p, SAWAKO_LEGS);
  }
  f.part('smock', { shade: 'rb', light: 't' });
  f.hl(6, 10, 12 + u);
  f.rect(4, 13 + u, 8, 19 + b - (13 + u));
  f.rect(3, 15 + u, 1, 19 + b - (15 + u));
  paintDots(f, [[5, 15 + u, 'paint1'], [9, 17 + b, 'paint2'], [4, 18 + b, 'paint3']]);
  if (seated) {
    f.part('cover', { shade: 'rb', light: 't' });
    f.rect(1, 17 + b, 4, 1);
    f.part('book', { shade: 'rb', light: 't' });
    f.rect(1, 16 + b, 4, 1);
    f.part('smock', { shade: 'rb', light: 't' });
    f.rect(5, 14 + u, 3, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    if (act === 'measure') {
      f.rect(2, 8 + u, 2, 2);
      f.part('smock', { shade: 'rb', light: 't' });
      f.rect(4, 10 + u, 2, 4);
      f.part('brush', { flat: true, rim: false });
      f.vl(2, 4 + u, 7 + u);
      f.part('tip', { flat: true, rim: false });
      f.px(2, 3 + u);
    } else {
      const k = act === 'draw' ? p.ph : 0;
      f.rect(3 - k, 15 + b, 2, 1);
      f.part('brush', { flat: true, rim: false });
      f.px(2 - k, 15 + b);
      f.part('tip', { flat: true, rim: false });
      f.px(1 - k, 16 + b);
    }
  } else {
    f.part('smock', { shade: 'rb', light: 'tl' });
    f.rect(6, 13 + u, 3, 3);
    sideArm(f, 7, 16 + u, 2, sw, [{ mat: 'skin' }]);
  }
  head(f, lp, SAWAKO_HEAD, hy);
  beret(f, 'left', hy + (lp.lookUp ? -1 : 0));
}

function sawakoDraw(f: Fig, p: Pose) {
  if (p.view === 'down') sawakoFront(f, p);
  else if (p.view === 'up') sawakoBack(f, p);
  else sawakoSide(f, p);
}

// seated: draws → measures the night with her brush → straightens the bags (≈8s)
const SAWAKO_SIT: IdleKey[] = [
  ...rep([{ act: 'draw', ph: 0 }, { act: 'draw', ph: 1 }], 5),
  { act: 'sit', blink: true }, { act: 'sit' },
  { act: 'measure' }, { act: 'measure' }, { act: 'measure' }, { act: 'measure' }, { act: 'measure' },
  { act: 'sit' }, { act: 'sit', breath: 1 }, { act: 'sit', breath: 1 },
  ...rep([{ act: 'draw', ph: 0 }, { act: 'draw', ph: 1 }], 3),
  { act: 'bags', ph: 0 }, { act: 'bags', ph: 1 }, { act: 'bags', ph: 1 }, { act: 'bags', ph: 0 },
  { act: 'sit' }, { act: 'sit', blink: true }, { act: 'sit', breath: 1 }, { act: 'sit', breath: 1 },
];
const SAWAKO_SIT_SIDE: IdleKey[] = SAWAKO_SIT.map((k) => (k.act === 'bags' ? { act: 'draw', ph: k.ph } : k));
const SAWAKO_SIT_BACK: IdleKey[] = rep([{ act: 'sit', breath: 0 }, { act: 'sit', breath: 0 }, { act: 'sit', breath: 1 }, { act: 'sit', breath: 1 }], 4);

registerChar('npc_hoshi_sawako', () =>
  buildSprite({
    id: 'npc_hoshi_sawako',
    mats: SAWAKO,
    draw: sawakoDraw,
    walkFrameMs: 175,
    idle: { down: breathingIdle(16, [9]), up: breathingIdle(), left: breathingIdle(16, [9]), right: breathingIdle(16, [9]) },
    extras: { sit: { dirs: 'all', p: { act: 'sit' } }, measure: { dirs: ['down', 'left', 'right'] } },
    poses: {
      sit: { down: SAWAKO_SIT, left: SAWAKO_SIT_SIDE, right: SAWAKO_SIT_SIDE, up: SAWAKO_SIT_BACK },
      look_hill: lookHill({ up: 'sit_hill', side: 'sit_hill', down: SAWAKO_SIT }),
    },
    shadow: 12,
    keep: ['#5A1E2A', '#3A1420'],
  }),
);

// =============================================================================
// さんかど (npc_hoshi_busdriver): 43, the mail carrier waiting for the morning
// bus. Tall and thin (24), a navy cap without a badge, a grey-blue short-
// sleeved shirt, navy trousers, a cloth pouch on his belt, a yellow pencil
// behind his ear. His canvas mail sack (string tie, a red tag) stands by
// his feet while he waits, over his shoulder when he walks (no helmet, no
// bike, no shoulder bag: not the town's postman). Pose 'lean' (against the
// bus): looks at his watch → at the sky → reties the sack's string.
// Extras: board (the sack shouldered), look_hill, look_up.

const DRIVER: Mats = {
  ...BASE2,
  skin: SKIN_FARM,
  hair: mat('#2B1E1A', { shade: '#1B1733', light: '#5A3A2A' }),
  cap: mat('#2F4A8A', { shade: '#223668', light: '#4766A8', dark: '#162048' }),
  visor: mat('#223668', { shade: '#162048', light: '#2F4A8A' }),
  shirt: mat('#7FA8C8', { shade: '#5A7EA0', light: '#A8C8E0', dark: '#3A5A7A' }),
  pants: mat('#2F4A8A', { shade: '#223668', light: '#4766A8', dark: '#162048' }),
  shoe: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
  pouch: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A' }),
  pencil: flat('#FFD23F'),
  watch: flat('#C8CDD4'),
  sack: mat('#C8C2B4', { shade: '#9AA0A8', light: '#E8E4D8', dark: '#6B7186' }),
  string: flat('#8A5A3A'),
  tag: flat('#E23B2E'),
};

const DRIVER_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 3, ['#........#', 'd........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -1, mat: 'hair', w: 1 } },
  mouthD: [7, 7, 2],
  neckD: [7, 9, 2],
  hairU: [3, 3, ['hhhhhhhhhd', 'hhhhhhhhdd', '.hhhhhhdd.']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [7, 3, ['####', '.###', '..#.']],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -1, mat: 'hair', w: 1 } },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 2],
};

function driverCap(f: Fig, view: 'down' | 'up' | 'left', y: number, lu = false) {
  f.part('cap', { shade: 'rb', light: 't' });
  if (view === 'left') {
    f.rows(4, y, ['.#####..', '########', '########']);
    f.part('visor', { shade: '', light: '' });
    f.t(0).hl(1, 4, y + 3).t(1).px(2, y + 3).t(null);
    return;
  }
  f.rows(4, y, ['.######.', '########', '########']);
  if (view === 'down') {
    f.part('visor', { shade: '', light: '' });
    f.t(0).hl(4, 11, y + 3).t(1).px(5, y + 3).px(6, y + 3).t(null);
    if (lu) f.t(-1).hl(4, 11, y + 4).t(null);
  } else {
    f.part('cap', { flat: true });
    f.t(-1).hl(6, 9, y + 2).t(null);
  }
}

/** The mail sack standing by his foot (7×8): canvas, string tie at the neck, a red tag. */
function mailSack(f: Fig, x: number, y: number, tieUp = 0) {
  f.part('sack', { shade: 'rb', light: 't' });
  f.rows(x, y, ['..##..', '.####.', '######', '######', '######', '######', '.####.']);
  f.part('string', { flat: true, rim: false });
  f.hl(x + 1, x + 4, y + 1 - tieUp);
  f.part('tag', { flat: true, rim: false });
  f.px(x + 4, y + 2).px(x + 4, y + 3);
}

const DRIVER_LEGS: LegSpec = { cx: 8, hip: 16, foot: 22, w: 2, gap: 2, mat: 'pants', shoe: 'shoe', shoeLen: 3 };

function driverFront(f: Fig, p: Pose) {
  const act = p.act;
  const tie = act === 'tie';
  const crouch = tie ? 3 : 0;
  const u = upper(p) + crouch;
  const b = p.bob + crouch;
  const hy = 1 + u;
  const lean = act === 'lean' || act === 'watch' || act === 'sky' || tie;
  if (tie) {
    // down on one knee by the sack
    f.part('pants', { shade: 'rb', light: 't' });
    f.rect(4, 18, 8, 2);
    f.part('pants', { shade: 'r', light: '', shift: -1 });
    f.rect(9, 20, 2, 2);
    f.part('shoe', { shade: 'r', light: '' });
    f.rect(4, 21, 3, 2).rect(9, 22, 3, 1);
  } else if (lean && p.mode !== 'walk') {
    // leaning back on the bus: one knee bent, that foot crossed in front
    f.part('pants', { shade: 'r', light: '', shift: -1 });
    f.rect(9, 16, 2, 6);
    f.part('shoe', { shade: 'r', light: '' });
    f.rect(9, 22, 3, 1);
    f.part('pants', { shade: 'r', light: '' });
    f.rect(5, 16, 2, 4);
    f.rows(5, 20, ['##.', '.##']);
    f.part('shoe', { shade: 'r', light: '' });
    f.rect(6, 22, 3, 1);
  } else legs(f, p, DRIVER_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 15 + b, 8, 2);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 10, 10 + u);
  f.rect(4, 11 + u, 8, 15 + b - (11 + u));
  f.part('shirt', { flat: true });
  f.t(-1).vl(8, 12 + u, 14 + b).t(1).px(5, 12 + u).t(null);
  f.part('pouch', { shade: 'rb', light: 't' });
  f.rect(10, 15 + b, 3, 2);
  const ARM: Seg[] = [{ mat: 'shirt', n: 2 }, { mat: 'skin' }];
  const walking = p.mode === 'walk' || act === 'board';
  if (walking) {
    // the sack over his left shoulder, held by the neck
    f.part('sack', { shade: 'rb', light: 't', shift: -1 });
    f.rows(11, 6 + u, ['.##..', '####.', '#####', '#####', '.###.']);
    f.part('tag', { flat: true, rim: false });
    f.px(14, 9 + u);
    hangArms(f, p, { lx: 3, rx: 12, sy: 11, hy: 16, segs: ARM }, u, 'L');
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(12, 9 + u, 2, 2);
  } else if (act === 'watch') {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(3, 11 + u, 2, 2).rect(12, 11 + u, 2, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(5, 13 + u, 3, 1).rect(9, 13 + u, 3, 1);
    f.part('watch', { flat: true, rim: false });
    f.px(10, 13 + u);
  } else if (tie) {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(11, 11 + u, 2, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(12, 13 + u + p.ph, 2, 2);
    f.rect(3, 13 + u, 2, 2);
  } else if (lean && !p.lookUp) {
    // arms folded
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(3, 11 + u, 2, 3).rect(11, 11 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.hl(5, 10, 13 + u).hl(5, 7, 14 + u);
  } else hangArms(f, p, { lx: 3, rx: 12, sy: 11, hy: 16, segs: ARM }, u);
  if (!walking) mailSack(f, tie ? 10 : 11, 16, tie ? p.ph : 0);
  const skyP = act === 'sky' ? { ...p, lookUp: true } : p;
  head(f, skyP, DRIVER_HEAD, hy);
  driverCap(f, 'down', hy - 1 + hatLift(skyP), skyP.lookUp);
  // the pencil behind his ear
  f.part('pencil', { flat: true, rim: false });
  f.px(12, hy + 4 + (skyP.lookUp ? -1 : 0));
}

function driverBack(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const hy = 1 + u - (p.act === 'look_hill' ? 1 : 0);
  legs(f, p, DRIVER_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 15 + b, 8, 2);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 10, 10 + u);
  f.rect(4, 11 + u, 8, 15 + b - (11 + u));
  f.part('pouch', { shade: 'rb', light: 't' });
  f.rect(3, 15 + b, 3, 2);
  hangArms(f, p, { lx: 3, rx: 12, sy: 11, hy: 16, segs: [{ mat: 'shirt', n: 2 }, { mat: 'skin' }] }, u, p.mode === 'walk' ? 'R' : 'both');
  if (p.mode === 'walk') {
    // the sack on his back over the left shoulder
    f.part('sack', { shade: 'rb', light: 't' });
    f.rows(1, 8 + u, ['.###.', '#####', '#####', '#####', '.###.']);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(2, 7 + u, 2, 2);
  }
  head(f, p, DRIVER_HEAD, hy);
  driverCap(f, 'up', hy - 1 + hatLift(p));
}

function driverSide(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const sw = sideSwing(p);
  const hy = 1 + u;
  const lp = p.act === 'look_hill' ? { ...p, lookUp: true } : p;
  const walking = p.mode === 'walk' || p.act === 'board';
  if (!walking) sideArm(f, 9, 11 + u, 4, -sw, [{ mat: 'shirt', n: 2 }, { mat: 'skin' }], -1);
  legs(f, p, DRIVER_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(5, 15 + b, 6, 2);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(6, 9, 10 + u);
  f.rect(5, 11 + u, 5, 15 + b - (11 + u));
  f.part('pouch', { shade: 'rb', light: 't' });
  f.rect(9, 15 + b, 2, 2);
  if (walking) {
    // the sack slung on his back
    f.part('sack', { shade: 'rb', light: 't', shift: -1 });
    f.rows(9, 9 + u, ['.###.', '#####', '#####', '#####', '.###.']);
    f.part('tag', { flat: true, rim: false });
    f.px(13, 11 + u);
    f.part('shirt', { shade: 'rb', light: 'tl' });
    f.rect(6, 11 + u, 3, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(8, 9 + u, 2, 2);
  } else {
    f.part('shirt', { shade: 'rb', light: 'tl' });
    f.rect(6, 11 + u, 3, 2);
    sideArm(f, 7, 13 + u, 3, sw, [{ mat: 'skin' }]);
    mailSack(f, 0, 16);
  }
  head(f, lp, DRIVER_HEAD, hy);
  driverCap(f, 'left', hy - 1 + (lp.lookUp ? -1 : 0));
  f.part('pencil', { flat: true, rim: false });
  f.px(9, hy + 4 + (lp.lookUp ? -1 : 0));
}

function driverDraw(f: Fig, p: Pose) {
  if (p.view === 'down') driverFront(f, p);
  else if (p.view === 'up') driverBack(f, p);
  else driverSide(f, p);
}

// leaning on the bus: the watch → the sky → the sack's string (≈8s)
const DRIVER_LEAN: IdleKey[] = [
  { act: 'lean' }, { act: 'lean' }, { act: 'lean', breath: 1 }, { act: 'lean', breath: 1 }, { act: 'lean', blink: true }, { act: 'lean' },
  { act: 'watch' }, { act: 'watch' }, { act: 'watch' }, { act: 'watch', breath: 1 },
  { act: 'lean' }, { act: 'lean', breath: 1 },
  { act: 'sky' }, { act: 'sky' }, { act: 'sky' }, { act: 'sky', breath: 1 }, { act: 'sky', breath: 1 },
  { act: 'lean' }, { act: 'lean' }, { act: 'lean', blink: true },
  { act: 'tie', ph: 0 }, { act: 'tie', ph: 1 }, { act: 'tie', ph: 0 }, { act: 'tie', ph: 1 }, { act: 'tie', ph: 0 },
  { act: 'lean' }, { act: 'lean', breath: 1 }, { act: 'lean', breath: 1 },
];

registerChar('npc_hoshi_busdriver', () =>
  buildSprite({
    id: 'npc_hoshi_busdriver',
    mats: DRIVER,
    draw: driverDraw,
    walkFrameMs: 150,
    idle: { down: DRIVER_LEAN, up: breathingIdle(), left: breathingIdle(16, [9]), right: breathingIdle(16, [9]) },
    extras: {
      lean: { dirs: ['down'] },
      board: { dirs: ['down', 'left', 'right'] },
      watch: { dirs: ['down'] },
    },
    poses: {
      lean: { down: DRIVER_LEAN, left: breathingIdle(16, [9]), right: breathingIdle(16, [9]), up: breathingIdle() },
      look_hill: lookHill(),
    },
    shadow: 10,
    keep: ['#7FA8C8', '#5A7EA0', '#A8C8E0', '#3A5A7A'],
  }),
);

// =============================================================================
// 運転士 (npc_hoshi_traindriver): the night train's driver, only ever seen
// from behind through the cab glass (face never drawn): the navy cap and
// uniform, seated, his left hand on the master controller; a 1px slanting
// glint of the glass crosses him. Every facing shows the same back view.

const TDRIVER: Mats = {
  ...BASE2,
  skin: SKIN_OLD,
  hair: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
  cap: mat('#2F4A8A', { shade: '#223668', light: '#4766A8', dark: '#162048' }),
  uni: mat('#2F4A8A', { shade: '#223668', light: '#4766A8', dark: '#162048' }),
  glove: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8' }),
  lever: mat('#6B7186', { shade: '#3A3F48', light: '#9AA0A8' }),
  glass: flat('#9AA0A8'),
};

function tdriverDraw(f: Fig, p: Pose) {
  const u = upper(p);
  const hy = 7 + u;
  // seated: the seat hides the legs; the back and shoulders fill the frame
  f.part('uni', { shade: 'rb', light: 't' });
  f.hl(4, 11, hy + 8);
  f.rect(3, hy + 9, 10, 22 - (hy + 9) + 1);
  f.part('uni', { flat: true });
  f.t(-1).vl(8, hy + 10, 22).hl(4, 11, hy + 12).t(null);
  // the left arm forward to the controller, a white glove on its handle
  f.part('uni', { shade: 'rb', light: 't', shift: -1 });
  f.rect(12, hy + 9, 2, 4);
  f.part('lever', { shade: 'r', light: 't' });
  f.rect(13, hy + 13, 3, 2);
  f.part('glove', { shade: 'rb', light: 't' });
  f.rect(13, hy + 12 + (p.act === 'notch' ? 1 : 0), 2, 1);
  // head from behind: the nape, the short dark hair, the cap
  f.part('skin', { shade: 'r', light: '' });
  f.rect(6, hy + 6, 4, 2);
  f.part('hair', { shade: 'rb', light: 't' });
  f.rows(4, hy + 2, ['########', '########', '########', '.######.']);
  f.part('skin', { shade: 'r', light: '' });
  f.px(4, hy + 4).px(11, hy + 4);
  f.part('cap', { shade: 'rb', light: 't' });
  f.rows(4, hy - 1, ['.######.', '########', '########', '########']);
  f.part('cap', { flat: true });
  f.t(-2).hl(4, 11, hy + 2).t(null);
  // the glass: one slanting glint across him
  f.part('glass', { flat: true, rim: false, ol: false });
  f.line(2, hy + 14, 7, hy + 9);
}

registerChar('npc_hoshi_traindriver', () =>
  buildSprite({
    id: 'npc_hoshi_traindriver',
    mats: TDRIVER,
    draw: tdriverDraw,
    views: { up: 'down', left: 'down', right: 'down' },
    walkFrames: 1,
    idle: [
      { breath: 0 }, { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 1 },
      { act: 'notch' }, { act: 'notch' }, { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 },
    ],
    idleFrameMs: 400,
    shadow: 0,
  }),
);
