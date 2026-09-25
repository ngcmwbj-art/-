// ツガオ便 (52 10.3–10.4, 50 3.14–3.16): ツガオさん, ヒロスケさん, ポコシャさん
// and ぴーちゃん. Kept free of the chapter's `h` because chapter 3 uses them
// too. Nothing about them may look frightening (52 10.0): eyes are thin
// lines or the plain black shape of sunglasses, mouths a 1px line (or the
// upturned smile of ヒロスケさん), backs straight and shoulders relaxed; no
// scars, tattoos, chains, blades or badges. Each wears one olive (#5A6B2A)
// thing — the cap, the apron, the vest, the hen's scarf — so the eye that
// notices sees they belong together.
//
//  npc_tsugao        16×24 (big: shoulders 12, a deep chest). Extras:
//                    cap_swap (3 frames), give, bow_small, sleep (the
//                    nightcap, standing asleep), look_hill, look_up.
//  npc_tsugao_cab    12×9: his head and shoulders in the kei truck's cab
//                    window (asleep in the spotted nightcap, the pompom
//                    swaying with each breath every 4 s; 'awake' in the
//                    work cap, anim 'bow_small', 'give' a hand out).
//  npc_hirosuke      16×24 (long and slim). Idle facing the truck bed: sorts
//                    the crates, humming (1px sway) → strokes his beard.
//                    Extras: wave, laugh, yakiimo (the steam is a glow-free
//                    1px wisp), aori, carry_box, look_hill, look_up.
//  npc_pokosha       16×24 (the widest: shoulders 13, 3px arms), ぴーちゃん
//                    on his left shoulder — asleep at stage 0 (she wakes to
//                    the tomato's light), awake after. Idle: lifts three
//                    crates one-handed → strokes the hen → half hides behind
//                    her. Extras: hide, blush (ears red), shh, give, carry,
//                    carry2, look_hill, look_up.
//  npc_pokosha_carry the same with a yellow crate on his right shoulder in
//                    every frame (walk and idle): the delivery's follower.
//  npc_piichan       10×10: the hen on her own (hop, peck, tilt, flap,
//                    sleep, bob).

import { flag } from '../../../game/state';
import { flat, mat, type Fig, type Mats, type RowMap } from '../fig';
import { legs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose, type SpriteSpec } from '../rig';
import { registerChar } from '../registry';
import { hangArms, hatLift, head, sideArm, sideSwing, upper, type HeadT } from '../kit';
import { BASE2, crate, CRATE, followFlag, lookHill, SKIN_DEEP, SKIN_FARM, stage } from './hoshi_kit';

const T: RowMap = { h: [null, 0], H: [null, 1], d: [null, -1], D: [null, -2], K: [null, 2] };
const OLIVE = mat('#5A6B2A', { shade: '#3A4A1A', light: '#7A8B3A', dark: '#2A3414' });
const OLIVE_KEEP = ['#5A6B2A', '#3A4A1A', '#7A8B3A', '#2A3414'];

// =============================================================================
// ツガオさん

const TSUGAO: Mats = {
  ...BASE2,
  skin: SKIN_DEEP,
  hair: mat('#1B1733', { shade: '#0B0B14', light: '#3A3F48' }),
  brow: flat('#1B1733'),
  cap: OLIVE,
  jumper: mat('#8A7A4A', { shade: '#5A4A32', light: '#A8986A', dark: '#3A3020' }),
  pants: mat('#6B7186', { shade: '#4A5068', light: '#8E95A6', dark: '#3A3F48' }),
  tabi: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186', dark: '#1B1733' }),
  board: mat('#C8A06A', { shade: '#A8742A', light: '#E8D9B5' }),
  paper: flat('#F4F1E8'),
  marker: flat('#1B1733'),
  watch: flat('#D9A441'),
  ink: flat('#0B0B14'),
  night: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  dot: flat('#2F4A8A'),
};
const TSUGAO_KEEP = [...OLIVE_KEEP, '#8A7A4A', '#5A4A32', '#A8986A', '#3A3020', '#C98A6A', '#A86A4E'];

const TSUGAO_HEAD: HeadT = {
  // a square jaw, the crew-cut sideburns under the cap
  faceD: [4, 3, ['.######.', '########', '########', '########', '########', '.######.']],
  hairD: [3, 3, ['#........#', '#........#', 'd........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, closed: true, brow: { dy: -2, mat: 'brow', w: 2 } },
  mouthD: [7, 7, 2],
  neckD: [6, 9, 4],
  upD: { fringe: 'none', openEyes: true, whites: false },
  hairU: [3, 3, ['hhhhhhhhhh', 'hhhhhhhhhd', 'dhhhhhhhdd', '.dddddddd.']],
  napeU: [5, 7, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '#####...', '.###....']],
  hairL: [7, 3, ['####', '.###', '..##']],
  eyeL: { x: 4, y: 5, h: 1, closed: true, brow: { dy: -2, mat: 'brow', w: 2 } },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 3],
};

/** The olive work cap (no logo): `y` = head top. */
function workCap(f: Fig, view: 'down' | 'up' | 'left', y: number) {
  f.part('cap', { flat: true });
  if (view === 'left') {
    f.rows(4, y - 1, ['..HHhhh.', '.Hhhhhhhd', 'Hhhhhhhhd', 'hhhhhhhdd'], T);
    f.rows(0, y + 2, ['DDdd'], T);
    return;
  }
  f.rows(3, y - 1, ['..HHhhhh..', '.Hhhhhhhhd', 'Hhhhhhhhhd', 'hhhhhhhhdd'], T);
  if (view === 'down') f.rows(3, y + 3, ['.DDddddDD.'], T);
  else f.t(-1).hl(4, 11, y + 2).t(null);
}

/** The spotted nightcap (white, navy spots, a pompom at the tip drooping to one side). */
function nightcap(f: Fig, view: 'down' | 'up' | 'left', y: number, sway = 0) {
  f.part('night', { flat: true });
  if (view === 'left') {
    f.rows(4, y - 1, ['..HHhh...', '.Hhhhhhd.', 'Hhhhhhhhd', 'hhhhhhhdd'], T);
    f.rows(10, y - 2 + sway, ['hh', '.hd'], T);
    f.part('night', { flat: true });
    f.rows(12, y + sway, ['HH', 'hd'], T);
  } else {
    f.rows(3, y - 1, ['..HHhhhh..', '.Hhhhhhhhd', 'Hhhhhhhhhd', 'hhhhhhhhdd'], T);
    f.rows(10, y - 3 + sway, ['.hh', 'hhd'], T);
    f.rows(12, y - 2 + sway, ['HH', 'hd'], T);
  }
  f.part('dot', { flat: true, rim: false });
  f.px(5, y).px(9, y + 1).px(7, y + 2).px(11, y);
}

const TSUGAO_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 3, gap: 2, mat: 'pants', low: { mat: 'tabi', h: 3 }, shoe: 'tabi', shoeLen: 4 };
const TSUGAO_ARM: Seg[] = [{ mat: 'jumper', n: 4 }, { mat: 'skin' }];

function tsugaoHands(f: Fig, x: number, y: number) {
  // the ink on three fingertips
  f.part('ink', { flat: true, rim: false });
  f.px(x, y + 1);
}

function tsugaoFront(f: Fig, p: Pose) {
  const act = p.act;
  const bow = act === 'bow_small' ? 1 : 0;
  const u = upper(p) + bow;
  const b = p.bob;
  const hy = 1 + u;
  legs(f, p, TSUGAO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(3, 16 + b, 10, 2);
  f.erase(7, 17 + b, 2, 1);
  // the jumper: a deep chest, straight shoulders
  f.part('jumper', { shade: 'rb', light: 't' });
  f.hl(3, 12, 10 + u);
  f.rect(2, 11 + u, 12, 17 + b - (11 + u));
  f.part('jumper', { flat: true });
  f.t(-2).vl(8, 11 + u, 16 + b).t(1).hl(3, 5, 11 + u).t(-1).hl(3, 12, 16 + b).t(null);
  // chest pockets with flaps
  f.t(-1).hl(4, 6, 12 + u).hl(10, 12, 12 + u).t(null);
  // the slip clipboard and the black marker at his hip
  f.part('board', { shade: 'rb', light: 't' });
  f.rect(11, 15 + b, 3, 4);
  f.part('paper', { flat: true, rim: false });
  f.rect(11, 16 + b, 2, 2);
  f.part('marker', { flat: true, rim: false });
  f.vl(10, 15 + b, 17 + b);
  if (act === 'give') {
    f.part('jumper', { shade: 'rb', light: 't' });
    f.rect(1, 11 + u, 2, 3).rect(13, 11 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(5, 14 + u, 3, 2).rect(9, 14 + u, 2, 2);
    tsugaoHands(f, 5, 14 + u);
  } else if (act === 'cap_swap' || act === 'bow_small') {
    hangArms(f, p, { lx: 2, rx: 13, sy: 11, hy: 16, segs: TSUGAO_ARM, w: 1 }, u, 'L');
    // his right hand at the brim (viewer-left)
    f.part('jumper', { shade: 'rb', light: 't' });
    f.rect(1, 9 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(2, hy + (act === 'cap_swap' && p.ph === 1 ? -2 : 1), 2, 2);
  } else {
    hangArms(f, p, { lx: 2, rx: 13, sy: 11, hy: 16, segs: TSUGAO_ARM, w: 1 }, u);
    // the old gold watch on his left wrist (viewer-right)
    f.part('watch', { flat: true, rim: false });
    f.px(13, 15 + u + (p.mode === 'walk' ? [0, 1, 0, -1][p.step % 4] : 0));
  }
  const sleeping = act === 'sleep';
  head(f, sleeping ? { ...p, blink: true, blinkClosed: true } : p, TSUGAO_HEAD, hy);
  const capMode = act === 'sleep' || (act === 'cap_swap' && p.ph === 2) ? 'night' : act === 'cap_swap' && p.ph === 1 ? 'none' : 'cap';
  if (capMode === 'cap') workCap(f, 'down', hy + hatLift(p));
  else if (capMode === 'night') nightcap(f, 'down', hy + hatLift(p), p.breath ? 1 : 0);
  else {
    // cap off: the crew cut, square and flat on top
    f.part('hair', { shade: 'rb', light: 't' });
    f.rows(3, hy, ['.########.', '##########', '##########']);
    f.part('cap', { shade: 'rb', light: 't' });
    f.rows(0, hy - 3, ['.####.', '######', '.DDDD.'], T);
  }
}

function tsugaoBack(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const hy = 1 + u - (p.act === 'look_hill' ? 1 : 0);
  legs(f, p, TSUGAO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(3, 16 + b, 10, 2);
  f.part('jumper', { shade: 'rb', light: 't' });
  f.hl(3, 12, 10 + u);
  f.rect(2, 11 + u, 12, 17 + b - (11 + u));
  f.part('jumper', { flat: true });
  f.t(-1).hl(3, 12, 16 + b).hl(4, 11, 13 + u).t(null);
  f.part('board', { shade: 'rb', light: 't' });
  f.rect(2, 15 + b, 3, 4);
  hangArms(f, p, { lx: 2, rx: 13, sy: 11, hy: 16, segs: TSUGAO_ARM }, u);
  head(f, p, TSUGAO_HEAD, hy);
  if (p.act === 'sleep') nightcap(f, 'up', hy + hatLift(p));
  else workCap(f, 'up', hy + hatLift(p));
}

function tsugaoSide(f: Fig, p: Pose) {
  const act = p.act;
  const u = upper(p) + (act === 'bow_small' ? 1 : 0);
  const b = p.bob;
  const sw = sideSwing(p);
  const hy = 1 + u;
  const hx = act === 'bow_small' ? -1 : 0;
  const lp = act === 'look_hill' ? { ...p, lookUp: true } : p;
  sideArm(f, 10, 11 + u, 4, -sw, TSUGAO_ARM, -1, 2);
  legs(f, p, TSUGAO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 16 + b, 8, 2);
  f.part('jumper', { shade: 'rb', light: 't' });
  f.hl(5, 10, 10 + u);
  f.rect(3, 11 + u, 9, 17 + b - (11 + u));
  f.part('jumper', { flat: true });
  f.t(-1).hl(3, 11, 16 + b).t(null);
  f.part('board', { shade: 'rb', light: 't' });
  f.rect(10, 15 + b, 2, 4);
  if (act === 'give') {
    f.part('jumper', { shade: 'rb', light: 't' });
    f.rect(3, 12 + u, 5, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(0, 12 + u, 3, 2);
    tsugaoHands(f, 0, 12 + u);
  } else if (act === 'bow_small') {
    f.part('jumper', { shade: 'rb', light: 't' });
    f.rect(5, 9 + u, 2, 4);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(3, hy + 1, 2, 2);
  } else {
    f.part('jumper', { shade: 'rb', light: 'tl' });
    f.rect(6, 11 + u, 4, 2);
    sideArm(f, 7, 13 + u, 3, sw, [{ mat: 'jumper', n: 1 }, { mat: 'skin' }], 0, 2);
  }
  head(f, lp, TSUGAO_HEAD, hy, hx);
  f.offset(hx, 0);
  if (act === 'sleep') nightcap(f, 'left', hy + (lp.lookUp ? -1 : 0));
  else workCap(f, 'left', hy + (lp.lookUp ? -1 : 0));
  f.offset(0, 0);
}

function tsugaoDraw(f: Fig, p: Pose) {
  if (p.view === 'down') tsugaoFront(f, p);
  else if (p.view === 'up') tsugaoBack(f, p);
  else tsugaoSide(f, p);
}

registerChar('npc_tsugao', () =>
  buildSprite({
    id: 'npc_tsugao',
    mats: TSUGAO,
    draw: tsugaoDraw,
    walkFrameMs: 185,
    // slow breathing, a long blink (always sleepy)
    idle: rep([{ breath: 0 }, { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 1 }, { breath: 0 }, { breath: 0, blink: true }], 2),
    idleFrameMs: 300,
    extras: {
      give: { dirs: ['down', 'left', 'right'] },
      bow_small: { dirs: ['down', 'left', 'right'] },
      sleep: { dirs: ['down', 'up', 'left', 'right'] },
      cap_swap: { dirs: ['down'], p: { ph: 1 } },
    },
    anims: {
      cap_swap: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }], ms: [220, 260, 400], loop: false },
      bow_small: { frames: [{ act: '' }, { act: 'bow_small' }, { act: 'bow_small' }, { act: '' }], ms: [120, 500, 200, 200], loop: false, dirs: ['down', 'left', 'right'] },
    },
    poses: {
      look_hill: lookHill(),
      sleep: rep([{ act: 'sleep', breath: 0 }, { act: 'sleep', breath: 0 }, { act: 'sleep', breath: 0 }, { act: 'sleep', breath: 0 }, { act: 'sleep', breath: 0 }, { act: 'sleep', breath: 0 }, { act: 'sleep', breath: 1 }, { act: 'sleep', breath: 1 }, { act: 'sleep', breath: 1 }, { act: 'sleep', breath: 1 }, { act: 'sleep', breath: 1 }, { act: 'sleep', breath: 1 }, { act: 'sleep', breath: 1 }], 1),
    },
    shadow: 12,
    keep: TSUGAO_KEEP,
  }),
);

// ---- ツガオさん in the cab window (12×9, the window is 8×6 on the truck) ----------

function tsugaoCabDraw(f: Fig, p: Pose) {
  const awake = p.act === 'awake' || p.act === 'bow_small' || p.act === 'give';
  // asleep, the head tips 1px toward the door (screen left); a breath every 4 s
  const tip = awake ? 0 : 1;
  const b = p.breath ? 1 : 0;
  const hy = -1 + (awake ? 0 : 1) + (p.act === 'bow_small' ? 1 : 0);
  // shoulders (the jumper) at the window's lower edge
  f.part('jumper', { shade: 'rb', light: 't' });
  f.rows(0, 6 + b, ['.##########.', '############']);
  f.part('jumper', { flat: true });
  f.t(-2).vl(6, 7 + b, 8).t(null);
  if (p.act === 'give') {
    f.part('jumper', { shade: 'rb', light: 't' });
    f.rect(0, 5, 3, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(0, 4, 2, 1);
  }
  // face: the square jaw, the sideburns, eyes shut (or sleepy lines awake)
  f.part('skin', { shade: 'rb', light: '' });
  f.rows(3 - tip, hy + 3, ['.######.', '########', '########', '.######.']);
  f.part('hair', { flat: true });
  f.t(0).px(2 - tip, hy + 3).px(2 - tip, hy + 4).px(9 - tip, hy + 3).px(9 - tip, hy + 4).t(null);
  f.part('brow', { flat: true, rim: false });
  f.hl(4 - tip, 5 - tip, hy + 3).hl(7 - tip, 8 - tip, hy + 3);
  f.part('eye', { flat: true, rim: false });
  f.hl(4 - tip, 5 - tip, hy + 4).hl(7 - tip, 8 - tip, hy + 4);
  f.part('mouth', { flat: true, rim: false });
  f.hl(5 - tip, 6 - tip, hy + 6);
  if (awake) workCapCab(f, hy);
  else {
    f.offset(-tip, 0);
    f.part('night', { flat: true });
    f.rows(2, hy, ['..HHhhhh..', '.Hhhhhhhhd', 'Hhhhhhhhhd'], T);
    // the tip flops over with the pompom, swaying 1px with the breath
    f.rows(10, hy + b, ['hd', '.d'], T);
    f.rows(10, hy + 2 + b, ['HH', 'hd'], T);
    f.part('dot', { flat: true, rim: false });
    f.px(4, hy + 1).px(8, hy + 1).px(6, hy + 2);
    f.offset(0, 0);
  }
}

function workCapCab(f: Fig, hy: number) {
  f.part('cap', { flat: true });
  f.rows(2, hy, ['..HHhhhh..', '.Hhhhhhhhd', 'Hhhhhhhhhd'], T);
  f.rows(2, hy + 3, ['.DDddddDD.'], T);
}

registerChar('npc_tsugao_cab', () =>
  buildSprite({
    id: 'npc_tsugao_cab',
    w: 12,
    h: 9,
    mats: TSUGAO,
    draw: tsugaoCabDraw,
    views: { up: 'down', left: 'down', right: 'down' },
    walkFrames: 1,
    // asleep: one breath every 4 s (the pompom sways with it)
    idle: [...rep([{ breath: 0 }], 12), { breath: 1 }, { breath: 1 }, { breath: 1 }, { breath: 1 }],
    idleFrameMs: 250,
    extras: { awake: { dirs: ['down'] }, give: { dirs: ['down'] } },
    anims: {
      bow_small: { frames: [{ act: 'awake' }, { act: 'bow_small' }, { act: 'bow_small' }, { act: 'awake' }], ms: [150, 450, 150, 300], loop: false },
    },
    poses: { awake: rep([{ act: 'awake', breath: 0 }, { act: 'awake', breath: 0 }, { act: 'awake', breath: 0 }, { act: 'awake', breath: 1 }], 3) },
    shadow: 0,
    keep: TSUGAO_KEEP,
    render: { outline: 'color' },
  }),
);

// =============================================================================
// ヒロスケさん

const HIRO: Mats = {
  ...BASE2,
  skin: SKIN_FARM,
  gloss: flat('#F4D0B0'),
  beard: mat('#3A2A20', { shade: '#2A1E1A', light: '#5A3A2A', dark: '#1B1733' }),
  grey: flat('#9AA0A8'),
  band: flat('#E84E3C'),
  shades: flat('#1B1733'),
  shadesHi: flat('#6B7186'),
  shirt: mat('#E8E4D8', { shade: '#C8C2B4', light: '#F4F1E8', dark: '#9AA0A8' }),
  apron: OLIVE,
  pants: mat('#6B7186', { shade: '#4A5068', light: '#8E95A6', dark: '#3A3F48' }),
  shoe: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
  glove: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8' }),
  paper: mat('#C8C2B4', { shade: '#9AA0A8', light: '#E8E4D8' }),
  foil: flat('#C8CDD4'),
  steam: flat('#F4F1E8'),
  crate: CRATE,
};
const HIRO_KEEP = [...OLIVE_KEEP, '#D9A07A', '#B87A5A', '#F4D0B0', '#3A2A20', '#2A1E1A'];

const HIRO_HEAD: HeadT = {
  hairMat: 'skin',
  // the shaven head, lit on the upper left (its 1px shine drawn after)
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [4, 0, ['..HHhh..', '.HHhhhhd', 'Hhhhhhhd'], T],
  hairDUp: [4, 0, ['..HHhh..', '.HHhhhhd'], T],
  upD: { fringe: 'none', lift: 1, whites: false },
  eyesD: { x: 6, d: 3, y: 5, h: 1 },
  neckD: [7, 9, 2],
  hairU: [4, 0, ['..HHhh..', '.HHhhhhd', 'Hhhhhhhd', 'hhhhhhhd', 'hhhhhhdd', 'hhhhhhdd', '.hhhhhd.', '..hhdd..'], T],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [4, 0, ['..HHhh..', '.HHhhhhd', 'Hhhhhhhd', '....hhhd', '....hhdd', '....hhd.', '.....d..'], T],
  eyeL: { x: 4, y: 5, h: 1 },
  earL: [8, 5],
  neckL: [5, 9, 2],
  hairOpts: { shade: '', light: '' },
};

/** Square black sunglasses (3×2 each), a 1px glint on the upper left of each lens. */
function hiroShades(f: Fig, view: 'down' | 'left', hy: number, lu: boolean) {
  const y = hy + 4 + (lu ? -1 : 0);
  f.part('shades', { flat: true, rim: false });
  if (view === 'left') {
    f.rect(3, y, 3, 2).hl(6, 8, y);
    f.part('shadesHi', { flat: true, rim: false });
    f.px(3, y);
    return;
  }
  f.rect(5, y, 3, 2).rect(8, y, 3, 2);
  f.part('shadesHi', { flat: true, rim: false });
  f.px(5, y).px(8, y);
}

/** The long beard from the chin to the chest, gathered by a red rubber band; `sway` 0/1. */
function hiroBeard(f: Fig, view: 'down' | 'left', hy: number, sway: number, lu: boolean) {
  const y = hy + 8 + (lu ? -1 : 0);
  f.part('beard', { flat: true });
  if (view === 'left') {
    f.rows(2, y, ['Hhh', 'Hhd', 'hhd', '.hd', '.hd'], T);
    f.rows(2 + sway, y + 5, ['hd', '.d'], T);
    f.part('band', { flat: true, rim: false });
    f.px(3 + sway, y + 5);
    return;
  }
  // it grows from the chin (the light top row), 4px wide, tapering to the band
  f.rows(6, y, ['HHhd', 'Hhhd', 'Hhhd', '.hhd', '.hd.'], T);
  f.rows(6 + sway, y + 5, ['.hd', '.hd', '..d'], T);
  f.part('grey', { flat: true, rim: false });
  f.px(7, y + 2).px(8, y + 4);
  f.part('band', { flat: true, rim: false });
  f.hl(7 + sway, 8 + sway, y + 6);
}

/** The upturned smile (always): corners up, 4px across. */
function hiroSmile(f: Fig, hy: number, open: boolean) {
  f.part('mouth', { flat: true, rim: false });
  f.px(6, hy + 6).hl(7, 8, hy + 7).px(9, hy + 6);
  if (open) f.part('#8A2E3A', { flat: true, rim: false }).hl(7, 8, hy + 6);
}

const HIRO_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', shoe: 'shoe', shoeLen: 3 };
const HIRO_ARM: Seg[] = [{ mat: 'shirt', n: 4 }, { mat: 'glove' }];

/** The newspaper-and-foil bundle (a yakiimo), held out in both hands. */
function yakiimo(f: Fig, x: number, y: number, steam: number) {
  f.part('paper', { shade: 'rb', light: 't' });
  f.rows(x, y, ['.####.', '######', '.####.']);
  f.part('foil', { flat: true, rim: false });
  f.px(x + 2, y).px(x + 3, y);
  f.part('steam', { flat: true, rim: false, ol: false });
  f.px(x + 2 + steam, y - 2).px(x + 3 - steam, y - 3);
}

function hiroFront(f: Fig, p: Pose) {
  const act = p.act;
  const laugh = act === 'laugh' ? [0, -1, 0][p.ph] : 0;
  const sway = act === 'hum' ? [0, 1, 0, -1][p.ph % 4] : 0;
  const u = upper(p) + laugh;
  const b = p.bob;
  const hy = 1 + u;
  f.offset(sway, 0);
  legs(f, p, HIRO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 16 + b, 8, 2);
  f.erase(7, 17 + b, 2, 1);
  // shirt, chest out a little; the olive apron over it
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 10, 10 + u);
  f.rect(4, 11 + u, 8, 17 + b - (11 + u));
  f.part('apron', { shade: 'rb', light: 't' });
  f.rect(5, 13 + u, 6, 19 + b - (13 + u));
  f.part('apron', { flat: true });
  f.t(-1).hl(5, 10, 13 + u).t(null);
  // the pocket with the bundle in it
  f.part('paper', { shade: 'r', light: 't' });
  f.rect(8, 15 + b, 2, 2);
  if (act === 'wave') {
    hangArms(f, p, { lx: 3, rx: 12, sy: 11, hy: 16, segs: HIRO_ARM }, u, 'L');
    f.part('shirt', { shade: 'rb', light: 't', shift: -1 });
    f.rect(12, 9 + u, 2, 3).rect(13, 6 + u, 2, 3);
    f.part('glove', { shade: 'rb', light: 't', shift: -1 });
    f.rect(13 + p.ph, 4 + u, 2, 2);
  } else if (act === 'yakiimo') {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(3, 11 + u, 2, 3).rect(11, 11 + u, 2, 3);
    f.part('glove', { shade: 'rb', light: 't' });
    f.rect(4, 14 + u, 2, 2).rect(10, 14 + u, 2, 2);
    yakiimo(f, 5, 13 + u, p.ph);
  } else if (act === 'stroke') {
    hangArms(f, p, { lx: 3, rx: 12, sy: 11, hy: 16, segs: HIRO_ARM }, u, 'R');
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(3, 11 + u, 2, 3);
    f.part('glove', { shade: 'rb', light: 't' });
    f.rect(5, 12 + u + p.ph, 2, 2);
  } else if (act === 'carry_box' || act === 'aori') {
    // a crate held against his chest / the tailgate lifted in both hands
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(3, 11 + u, 2, 3).rect(11, 11 + u, 2, 3);
    if (act === 'carry_box') crate(f, 4, 13 + u, 8, 4);
    else {
      f.part('#6B7186', { shade: 'rb', light: 't' });
      f.rect(2, 14 + u - p.ph, 12, 2);
    }
    f.part('glove', { shade: 'rb', light: 't' });
    f.rect(3, 14 + u, 2, 2).rect(11, 14 + u, 2, 2);
  } else hangArms(f, p, { lx: 3, rx: 12, sy: 11, hy: 16, segs: HIRO_ARM }, u);
  head(f, p, HIRO_HEAD, hy);
  f.part('gloss', { flat: true, rim: false });
  f.px(6, hy + (p.lookUp ? 2 : 1));
  const lu = p.lookUp;
  hiroShades(f, 'down', hy, lu);
  hiroSmile(f, hy + (lu ? -1 : 0), act === 'laugh' || act === 'wave');
  const bs = act === 'stroke' ? p.ph : act === 'laugh' ? (p.ph === 1 ? 1 : 0) : 0;
  hiroBeard(f, 'down', hy, bs, lu);
  if (act === 'stroke') {
    f.part('glove', { shade: 'rb', light: 't' });
    f.rect(5, hy + 10 + p.ph, 2, 2);
  }
  f.offset(0, 0);
}

function hiroBack(f: Fig, p: Pose) {
  const act = p.act;
  const sway = act === 'hum' || act === 'sort' ? [0, 1, 0, -1][p.ph % 4] : 0;
  const u = upper(p);
  const b = p.bob;
  const hy = 1 + u - (act === 'look_hill' ? 1 : 0);
  f.offset(sway, 0);
  legs(f, p, HIRO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 16 + b, 8, 2);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 10, 10 + u);
  f.rect(4, 11 + u, 8, 17 + b - (11 + u));
  // the apron's ties crossed at his back
  f.part('apron', { flat: true });
  f.t(0).hl(4, 11, 15 + b).t(-1).px(7, 16 + b).px(8, 17 + b).px(6, 17 + b).t(null);
  if (act === 'sort') {
    // reaching up onto the truck bed, moving a crate
    f.part('shirt', { shade: 'rb', light: 't', shift: -1 });
    f.rect(2, 8 + u, 2, 4).rect(12, 8 + u, 2, 4);
    f.part('glove', { shade: 'rb', light: 't', shift: -1 });
    f.rect(2 + (p.ph % 2), 6 + u, 2, 2).rect(12 + (p.ph % 2), 6 + u, 2, 2);
  } else hangArms(f, p, { lx: 3, rx: 12, sy: 11, hy: 16, segs: HIRO_ARM }, u);
  head(f, p, HIRO_HEAD, hy);
  f.part('gloss', { flat: true, rim: false });
  f.px(6, hy + (p.lookUp ? 2 : 1));
  // the sunglasses' temples, the beard showing either side of the neck
  f.part('shades', { flat: true, rim: false });
  f.px(4, hy + 4 + (p.lookUp ? 1 : 0)).px(11, hy + 4 + (p.lookUp ? 1 : 0));
  f.offset(0, 0);
}

function hiroSide(f: Fig, p: Pose) {
  const act = p.act;
  const u = upper(p) + (act === 'laugh' ? [0, -1, 0][p.ph] : 0);
  const b = p.bob;
  const sw = sideSwing(p);
  const hy = 1 + u;
  const lp = act === 'look_hill' ? { ...p, lookUp: true } : p;
  sideArm(f, 9, 11 + u, 4, -sw, HIRO_ARM, -1);
  legs(f, p, HIRO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(5, 16 + b, 6, 2);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 9, 10 + u);
  f.rect(4, 11 + u, 6, 17 + b - (11 + u));
  f.part('apron', { shade: 'r', light: '' });
  f.rect(3, 13 + u, 2, 19 + b - (13 + u));
  if (act === 'yakiimo') {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(4, 11 + u, 3, 2);
    f.part('glove', { shade: 'rb', light: 't' });
    f.rect(2, 13 + u, 2, 2);
    yakiimo(f, -2, 12 + u, p.ph);
  } else if (act === 'wave') {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(6, 8 + u, 2, 4);
    f.part('glove', { shade: 'rb', light: 't' });
    f.rect(5 + p.ph, 6 + u, 2, 2);
  } else {
    f.part('shirt', { shade: 'rb', light: 'tl' });
    f.rect(6, 11 + u, 3, 2);
    sideArm(f, 7, 13 + u, 3, sw, [{ mat: 'shirt', n: 1 }, { mat: 'glove' }]);
  }
  head(f, lp, HIRO_HEAD, hy);
  f.part('gloss', { flat: true, rim: false });
  f.px(6, hy + (lp.lookUp ? 2 : 1));
  hiroShades(f, 'left', hy, !!lp.lookUp);
  f.part('mouth', { flat: true, rim: false });
  f.px(3, hy + 7 + (lp.lookUp ? -1 : 0)).px(4, hy + 6 + (lp.lookUp ? -1 : 0));
  hiroBeard(f, 'left', hy, act === 'laugh' && p.ph === 1 ? 1 : 0, !!lp.lookUp);
}

function hiroDraw(f: Fig, p: Pose) {
  if (p.view === 'down') hiroFront(f, p);
  else if (p.view === 'up') hiroBack(f, p);
  else hiroSide(f, p);
}

// facing the truck bed: sorts the crates humming (a 1px sway) → strokes his beard
const HIRO_UP: IdleKey[] = [
  ...rep([{ act: 'sort', ph: 0 }, { act: 'sort', ph: 1 }, { act: 'sort', ph: 2 }, { act: 'sort', ph: 3 }], 4),
  { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 0, blink: true },
];
const HIRO_DOWN: IdleKey[] = [
  ...rep([{ act: 'hum', ph: 0 }, { act: 'hum', ph: 1 }, { act: 'hum', ph: 2 }, { act: 'hum', ph: 3 }], 3),
  { act: 'stroke', ph: 0 }, { act: 'stroke', ph: 1 }, { act: 'stroke', ph: 0 }, { act: 'stroke', ph: 1 }, { act: 'stroke', ph: 0 },
  { breath: 0, blink: true }, { breath: 1 }, { breath: 1 },
];

registerChar('npc_hirosuke', () =>
  buildSprite({
    id: 'npc_hirosuke',
    mats: HIRO,
    draw: hiroDraw,
    walkFrameMs: 140,
    idle: { up: HIRO_UP, down: HIRO_DOWN, left: breathingIdle(16, [9]), right: breathingIdle(16, [9]) },
    idleFrameMs: 250,
    extras: {
      wave: { dirs: ['down', 'left', 'right'] },
      laugh: { dirs: ['down', 'left', 'right'] },
      yakiimo: { dirs: ['down', 'left', 'right'] },
      aori: { dirs: ['down'] },
      carry_box: { dirs: ['down'] },
    },
    anims: {
      wave: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 0 }, { ph: 1 }, { ph: 0 }], ms: [180, 180, 180, 180, 400], loop: false, dirs: ['down', 'left', 'right'] },
      laugh: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 1 }, { ph: 0 }, { ph: 1 }, { ph: 2 }], ms: 120, loop: false, dirs: ['down', 'left', 'right'] },
      yakiimo: { frames: [{ ph: 0 }, { ph: 1 }], ms: 400, dirs: ['down', 'left', 'right'] },
      aori: { frames: [{ ph: 0 }, { ph: 1 }], ms: 300, loop: false },
    },
    poses: { look_hill: lookHill() },
    shadow: 10,
    keep: HIRO_KEEP,
  }),
);

// =============================================================================
// ポコシャさん and ぴーちゃん

const POKO: Mats = {
  ...BASE2,
  skin: SKIN_DEEP,
  muscle: flat('#8A5A3A'),
  // a close crop reads lighter than long black hair: the scalp shows through on top
  hair: mat('#2A2440', { shade: '#1B1733', light: '#3A3F48', dark: '#0B0B14' }),
  crop: flat('#3A3F48'),
  shades: flat('#1B1733'),
  silver: flat('#C8CDD4'),
  ear: flat('#E84E3C'),
  tank: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  vest: OLIVE,
  pocket: flat('#3A4A1A'),
  pants: mat('#8A7A4A', { shade: '#5A4A32', light: '#A8986A', dark: '#3A3020' }),
  boot: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186', dark: '#1B1733' }),
  crate: CRATE,
  hen: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  comb: flat('#E84E3C'),
  beak: flat('#FFD23F'),
  henEye: flat('#0B0B14'),
  scarf: flat('#5A6B2A'),
};
const POKO_KEEP = [...OLIVE_KEEP, '#8A7A4A', '#5A4A32', '#A8986A', '#3A3020', '#C98A6A', '#A86A4E'];

const POKO_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  // a short crop: close to the head, the clipper fade at the temples
  hairD: [4, 0, ['..HHhh..', '.HHhhhhd', 'Hhhhhhhd'], T],
  eyesD: { x: 6, d: 3, y: 5, h: 1 },
  neckD: [6, 9, 4],
  upD: { fringe: 'none', lift: 1, whites: false },
  hairU: [4, 0, ['..HHhh..', '.HHhhhhd', 'Hhhhhhhd', 'hhhhhhhd', 'dhhhhhdd', '.dddddd.'], T],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [4, 0, ['..HHhh..', '.HHhhhhd', 'Hhhhhhhd', '....hhhd', '.....hdd'], T],
  eyeL: { x: 4, y: 5, h: 1 },
  earL: [8, 5],
  neckL: [5, 9, 3],
};

/** Sunglasses with the outer corners swept up 1px, a silver rim on top of each lens. */
function pokoShades(f: Fig, view: 'down' | 'left', hy: number, lu: boolean) {
  const y = hy + 5 + (lu ? -1 : 0);
  f.part('shades', { flat: true, rim: false });
  if (view === 'left') {
    f.hl(2, 4, y).px(5, y - 1).hl(6, 8, y - 1);
    f.part('silver', { flat: true, rim: false });
    f.px(3, y - 1);
    return;
  }
  f.hl(4, 6, y).hl(9, 11, y).px(4, y - 1).px(11, y - 1).hl(7, 8, y);
  f.part('silver', { flat: true, rim: false });
  f.px(5, y - 1).px(10, y - 1);
}

/** The clipper fade at his temples (front / side). */
function pokoCrop(f: Fig, view: 'down' | 'left', hy: number) {
  f.part('crop', { flat: true, rim: false });
  if (view === 'left') f.px(9, hy + 3).px(10, hy + 3).px(10, hy + 4);
  else f.px(4, hy + 3).px(11, hy + 3);
}

/**
 * ぴーちゃん on the shoulder (6×6 at (x, y), facing viewer-left when `m`
 * is false). `pose`: 'sleep' (head tucked in), 'sit', 'tilt', 'flap' (wings
 * up), 'bob' (head forward 1px).
 */
function henSmall(f: Fig, x: number, y: number, pose: string, m = false) {
  const X = (dx: number) => (m ? x + 5 - dx : x + dx);
  f.part('hen', { shade: 'rb', light: 't' });
  if (pose === 'sleep') {
    // a round white ball, the head tucked into the wing
    for (const [dx, dy, w] of [[1, 2, 4], [0, 3, 6], [0, 4, 6], [1, 5, 4]] as const) for (let i = 0; i < w; i++) f.px(X(dx + i), y + dy);
    f.part('comb', { flat: true, rim: false });
    f.px(X(1), y + 2).px(X(2), y + 1);
    f.part('scarf', { flat: true, rim: false });
    f.px(X(1), y + 3);
    return;
  }
  const hx = pose === 'bob' ? -1 : 0;
  const hy2 = pose === 'tilt' ? 1 : 0;
  // body
  for (const [dx, dy, w] of [[2, 2, 3], [1, 3, 5], [1, 4, 5], [2, 5, 3]] as const) for (let i = 0; i < w; i++) f.px(X(dx + i), y + dy);
  // tail up behind
  f.px(X(5), y + 1).px(X(5), y + 2);
  if (pose === 'flap') {
    f.part('hen', { shade: 'r', light: 't' });
    f.px(X(2), y).px(X(3), y - 1).px(X(4), y).px(X(0), y + 2);
  }
  // head
  f.part('hen', { shade: 'rb', light: 't' });
  f.px(X(1 + hx), y + 1 + hy2).px(X(2 + hx), y + 1 + hy2).px(X(1 + hx), y + 2 + hy2);
  f.part('comb', { flat: true, rim: false });
  f.px(X(1 + hx), y + hy2).px(X(2 + hx), y + hy2);
  f.px(X(0 + hx), y + 3 + hy2);
  f.part('beak', { flat: true, rim: false });
  f.px(X(0 + hx), y + 2 + hy2);
  f.part('henEye', { flat: true, rim: false });
  f.px(X(1 + hx), y + 1 + hy2);
  f.part('scarf', { flat: true, rim: false });
  f.px(X(2 + hx), y + 3);
}

const POKO_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 3, gap: 1, mat: 'pants', low: { mat: 'boot', h: 2 }, shoe: 'boot', shoeLen: 4 };
const POKO_ARM: Seg[] = [{ mat: 'skin' }];

/** Where the hen sits and how, for this frame. */
function henPose(p: Pose): string {
  if (p.act === 'hide2' || p.act === 'flap') return 'flap';
  const asleep = (p as Pose & { henAsleep?: boolean }).henAsleep;
  if (asleep) return 'sleep';
  if (p.act === 'bob' || p.mode === 'walk') return p.mode === 'walk' ? (p.step % 2 ? 'bob' : 'sit') : 'bob';
  if (p.act === 'tilt') return 'tilt';
  return 'sit';
}

/** A thick 3px arm hanging from the shoulder (front / back), with the walk swing. */
function pokoArm(f: Fig, p: Pose, x: number, sy: number, side: 1 | -1, u: number, shift = 0) {
  const st = p.mode === 'walk' || p.mode === 'run' ? p.step % 4 : 0;
  const sw = st === 1 ? side : st === 3 ? -side : 0;
  f.part('skin', { shade: 'rb', light: 't', shift });
  f.rect(x, sy + u, 3, 3);
  f.rect(x + (side < 0 ? 0 : 0), sy + 3 + u, 3, 3 + sw);
  f.part('muscle', { flat: true, rim: false });
  f.px(x + (side > 0 ? 2 : 0), sy + 1 + u);
  f.part('skin', { shade: 'rb', light: 't', shift });
  f.rect(x, sy + 6 + u + sw, 3, 2);
}

function pokoTorso(f: Fig, u: number, b: number, back: boolean) {
  // the tank top, and the olive work vest full of pockets over it; shoulders
  // hunched in 1px (shy)
  f.part('tank', { shade: 'rb', light: 't' });
  f.hl(5, 10, 10 + u);
  f.rect(3, 11 + u, 10, 17 + b - (11 + u));
  f.part('vest', { shade: 'rb', light: 't' });
  if (back) f.rect(3, 11 + u, 10, 17 + b - (11 + u));
  else {
    f.rows(3, 11 + u, ['####..####', '####..####', '#####.####', '##########']);
    f.rect(3, 15 + u, 10, 17 + b - (15 + u));
    f.part('pocket', { flat: true, rim: false });
    f.hl(3, 5, 13 + u).hl(10, 12, 13 + u).hl(4, 6, 15 + b).hl(9, 11, 15 + b);
  }
}

type PokoPose = Pose & { henAsleep?: boolean; carrying?: number };

function pokoFront(f: Fig, p: PokoPose) {
  const act = p.act;
  const u = upper(p);
  const b = p.bob;
  const hy = 2 + u;
  const carry = p.carrying ?? (act === 'carry' ? 1 : act === 'carry2' ? 2 : 0);
  legs(f, p, POKO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(3, 16 + b, 10, 2);
  f.erase(7, 17 + b, 2, 1);
  pokoTorso(f, u, b, false);
  // arms: 3px, the far one a step darker
  if (act === 'lift') {
    // three crates stacked on one hand, held up at shoulder height (viewer-left)
    const k = p.ph;
    pokoArm(f, p, 12, 11, 1, u, -1);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(0, 9 + u - k, 3, 5);
    crate(f, 0, 5 + u - k * 2, 5, 2);
    crate(f, 0, 3 + u - k * 2, 5, 2);
    crate(f, 0, 1 + u - k * 2, 5, 2);
  } else if (act === 'stroke') {
    pokoArm(f, p, 0, 11, -1, u);
    f.part('skin', { shade: 'rb', light: 't', shift: -1 });
    f.rect(12, 11 + u, 3, 3);
    f.rect(11, 9 + u + p.ph, 2, 2);
  } else if (act === 'shh') {
    pokoArm(f, p, 12, 11, 1, u, -1);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(1, 11 + u, 3, 3).rect(3, 10 + u, 2, 2);
    f.px(7, hy + 7).px(7, hy + 6);
  } else if (act === 'give') {
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(1, 11 + u, 3, 3).rect(12, 11 + u, 3, 3);
    f.rect(4, 14 + u, 3, 2).rect(9, 14 + u, 3, 2);
    f.part('#E8D9B5', { shade: 'rb', light: 't' });
    f.rows(5, 12 + u, ['######', '######', '.####.']);
    f.part('#5FA85A', { flat: true, rim: false });
    f.px(7, 11 + u).px(8, 11 + u);
  } else if (act === 'hide' || act === 'hide2') {
    // one hand up by his face, half hiding behind the hen (she is lifted a little)
    pokoArm(f, p, 0, 11, -1, u);
    f.part('skin', { shade: 'rb', light: 't', shift: -1 });
    f.rect(12, 10 + u, 3, 3);
  } else {
    pokoArm(f, p, 0, 11, -1, u);
    pokoArm(f, p, 12, 11, 1, u, -1);
  }
  // shy: the head a little down
  const hdy = act === 'hide' || act === 'hide2' ? 1 : 0;
  head(f, p, POKO_HEAD, hy + hdy);
  if (!p.lookUp) pokoCrop(f, 'down', hy + hdy);
  pokoShades(f, 'down', hy + hdy, p.lookUp);
  f.part('mouth', { flat: true, rim: false });
  f.px(7, hy + hdy + 7 + (p.lookUp ? -1 : 0));
  // the ears (red after 「さすが 師匠！」)
  if (act === 'blush' || act === 'hide2') {
    f.part('ear', { flat: true, rim: false });
    f.px(3, hy + hdy + 5).px(12, hy + hdy + 5);
  }
  // carried crates on the shoulders
  if (carry >= 1) {
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(1, 9 + u, 3, 2);
    crate(f, 0, 5 + u, 6, 4);
  }
  if (carry >= 2) crate(f, 10, 5 + u, 6, 4, -1);
  // ぴーちゃん on his left shoulder (viewer-right)
  if (carry < 2) {
    const hide = act === 'hide' || act === 'hide2';
    henSmall(f, hide ? 10 : 11, (hide ? 4 : 5) + u, henPose(p), true);
  }
}

function pokoBack(f: Fig, p: PokoPose) {
  const u = upper(p);
  const b = p.bob;
  const hy = 2 + u - (p.act === 'look_hill' ? 1 : 0);
  const carry = p.carrying ?? (p.act === 'carry' ? 1 : p.act === 'carry2' ? 2 : 0);
  legs(f, p, POKO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(3, 16 + b, 10, 2);
  pokoTorso(f, u, b, true);
  f.part('pocket', { flat: true, rim: false });
  f.hl(5, 10, 13 + u);
  pokoArm(f, p, 0, 11, -1, u, -1);
  pokoArm(f, p, 12, 11, 1, u, -1);
  head(f, p, POKO_HEAD, hy);
  f.part('crop', { flat: true, rim: false });
  f.hl(5, 10, hy + 5 + (p.lookUp ? 1 : 0));
  if (carry >= 1) crate(f, 10, 5 + u, 6, 4);
  if (carry >= 2) crate(f, 0, 5 + u, 6, 4, -1);
  // the hen on his left shoulder (viewer-left from behind)
  if (carry < 2) henSmall(f, -1, 5 + u, henPose(p), false);
}

function pokoSide(f: Fig, p: PokoPose) {
  const act = p.act;
  const u = upper(p);
  const b = p.bob;
  const sw = sideSwing(p);
  const hy = 2 + u;
  const lp = act === 'look_hill' ? { ...p, lookUp: true } : p;
  const carry = p.carrying ?? (act === 'carry' ? 1 : act === 'carry2' ? 2 : 0);
  // far arm
  f.part('skin', { shade: 'rb', light: 't', shift: -1 });
  f.rect(10 + sw, 12 + u, 2, 6);
  legs(f, p, POKO_LEGS);
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 16 + b, 8, 2);
  f.part('tank', { shade: 'rb', light: 't' });
  f.hl(5, 9, 10 + u);
  f.rect(4, 11 + u, 7, 17 + b - (11 + u));
  f.part('vest', { shade: 'rb', light: 't' });
  f.rect(4, 12 + u, 7, 17 + b - (12 + u));
  f.part('pocket', { flat: true, rim: false });
  f.hl(4, 6, 14 + u);
  // near arm, thick
  if (act === 'shh') {
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(5, 11 + u, 3, 3).rect(3, hy + 6, 2, 3);
  } else if (carry >= 1) {
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(5, 10 + u, 3, 3).rect(5, 7 + u, 2, 3);
    crate(f, 3, 3 + u, 8, 4);
  } else {
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(6 - sw, 11 + u, 3, 5);
    f.rect(6 - sw * 2, 16 + u, 3, 2);
    f.part('muscle', { flat: true, rim: false });
    f.px(8 - sw, 12 + u);
  }
  head(f, lp, POKO_HEAD, hy + (act === 'hide' ? 1 : 0));
  if (!lp.lookUp) pokoCrop(f, 'left', hy + (act === 'hide' ? 1 : 0));
  pokoShades(f, 'left', hy + (act === 'hide' ? 1 : 0), !!lp.lookUp);
  if (act === 'blush' || act === 'hide2') {
    f.part('ear', { flat: true, rim: false });
    f.px(8, hy + 5);
  }
  // his left shoulder is the far one facing left: she sits up on it, behind his head
  if (carry < 1) henSmall(f, 9, 6 + u, henPose(p), false);
}

function pokoDraw(f: Fig, p: Pose) {
  // an 18px canvas (the hen sits out on his shoulder): the figure is centred 1px in
  f.offset(1, 0);
  if (p.view === 'down') pokoFront(f, p);
  else if (p.view === 'up') pokoBack(f, p);
  else pokoSide(f, p);
}

// lifts three crates one-handed → strokes the hen → half hides behind her (≈8s)
const POKO_IDLE: IdleKey[] = [
  { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 },
  { act: 'lift', ph: 0 }, { act: 'lift', ph: 1 }, { act: 'lift', ph: 1 }, { act: 'lift', ph: 1 }, { act: 'lift', ph: 0 },
  { breath: 0, blink: true }, { breath: 0 }, { act: 'tilt' }, { act: 'tilt' },
  { act: 'stroke', ph: 0 }, { act: 'stroke', ph: 1 }, { act: 'stroke', ph: 0 }, { act: 'stroke', ph: 1 }, { act: 'stroke', ph: 0 },
  { act: 'bob' }, { act: 'bob' }, { breath: 1 }, { breath: 1 },
  { act: 'hide' }, { act: 'hide' }, { act: 'hide' }, { breath: 0 }, { breath: 0, blink: true }, { breath: 1 },
];
const POKO_SIDE: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 2), { act: 'tilt' }, { act: 'tilt' }, { breath: 0, blink: true },
  { act: 'bob' }, { act: 'bob' }, { breath: 0 }, { breath: 1 }, { breath: 1 },
];

function pokoSpec(id: string, asleep: boolean, carrying: number): SpriteSpec {
  return {
    id,
    w: 18,
    mats: POKO,
    draw: (f, p) => pokoDraw(f, Object.assign(p, { henAsleep: asleep, carrying: carrying || undefined })),
    walkFrameMs: 150,
    idle: carrying
      ? breathingIdle(16, [9])
      : { down: asleep ? POKO_IDLE.map((k) => (k.act === 'tilt' || k.act === 'bob' ? { breath: 0 } : k)) : POKO_IDLE, up: breathingIdle(), left: POKO_SIDE, right: POKO_SIDE },
    idleFrameMs: 250,
    extras: {
      hide: { dirs: ['down', 'left', 'right'] },
      blush: { dirs: ['down', 'left', 'right'] },
      shh: { dirs: ['down', 'left', 'right'] },
      give: { dirs: ['down'] },
      carry2: { dirs: ['down', 'up'] },
      ...(carrying ? { carry: { dirs: 'all' as const } } : {}),
    },
    anims: {
      // 「さすが 師匠！」: the hen claps her wings, his ears redden for 2 s
      blush: { frames: [{ act: 'hide2' }, { act: 'blush' }, { act: 'hide2' }, { act: 'blush' }, { act: 'blush' }, { act: '' }], ms: [150, 150, 150, 300, 1250, 200], loop: false, dirs: ['down', 'left', 'right'] },
      hide: { frames: [{ act: '' }, { act: 'hide' }], ms: [120, 400], loop: false, dirs: ['down', 'left', 'right'] },
    },
    poses: { look_hill: lookHill() },
    shadow: 13,
    keep: POKO_KEEP,
  };
}

registerChar('npc_pokosha', () => buildSprite(pokoSpec('npc_pokosha', false, 0)));
registerChar('npc_pokosha_asleep', () => buildSprite(pokoSpec('npc_pokosha_asleep', true, 0)));
registerChar('npc_pokosha_carry', () => buildSprite(pokoSpec('npc_pokosha_carry', false, 1)));
// ニワトリは暗いと眠る: at stage 0 she sleeps on his shoulder; the tomato's light wakes her
followFlag('npc_pokosha', () => (stage() < 1 && !flagOn('flag_ch2_got_tomato') ? 'npc_pokosha_asleep' : 'npc_pokosha'));

function flagOn(id: string): boolean {
  return !!flag(id);
}

// ---- ぴーちゃん on her own (10×10) ---------------------------------------------

const HEN: Mats = {
  hen: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  comb: flat('#E84E3C'),
  beak: flat('#FFD23F'),
  feet: flat('#FFD23F'),
  henEye: flat('#0B0B14'),
  scarf: flat('#5A6B2A'),
};

function henDraw(f: Fig, p: Pose) {
  const act = p.act;
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const hop = st === 1 || st === 3 ? -1 : 0;
  if (p.view === 'left') {
    const peck = act === 'peck' ? p.ph : 0;
    const flap = act === 'flap' ? p.ph : 0;
    const tilt = act === 'tilt' ? 1 : 0;
    // feet
    f.part('feet', { flat: true, rim: false });
    if (act !== 'sleep') f.px(4, 9).px(6 - (st === 1 ? 1 : 0), 9).px(3, 9);
    f.offset(0, hop);
    // body and the raised tail
    f.part('hen', { shade: 'rb', light: 't' });
    if (act === 'sleep') {
      f.rows(1, 4, ['..####..', '.######.', '########', '.######.', '..####..'].map((r) => r));
      f.part('comb', { flat: true, rim: false });
      f.px(3, 4).px(4, 3);
      f.part('scarf', { flat: true, rim: false });
      f.px(3, 5);
      return;
    }
    f.rows(2, 4, ['...####.', '.#######', '########', '.######.', '..####..']);
    f.rows(8, 2, ['.#', '##']);
    if (flap) {
      f.part('hen', { shade: 'r', light: 't' });
      f.rows(3, 1 + (flap === 2 ? 1 : 0), flap === 1 ? ['.###.', '#####', '..#..'] : ['##..#', '.###.']);
    } else {
      f.part('hen', { flat: true });
      f.t(-1).hl(5, 8, 6).px(8, 5).t(null);
    }
    // head and neck
    const hx = peck ? -1 : 0;
    const hy = peck ? 3 : tilt;
    f.part('hen', { shade: 'rb', light: 't' });
    f.rows(1 + hx, 1 + hy, ['.##.', '###.', '.##.']);
    f.part('comb', { flat: true, rim: false });
    f.hl(2 + hx, 3 + hx, hy).px(1 + hx, 3 + hy);
    f.part('beak', { flat: true, rim: false });
    f.px(0 + hx, 2 + hy);
    f.part('henEye', { flat: true, rim: false });
    if (!p.blink) f.px(2 + hx, 2 + hy);
    f.part('scarf', { flat: true, rim: false });
    f.hl(2 + hx, 3 + hx, 4 + hy - (peck ? 1 : 0));
    return;
  }
  // front / back: round, the comb on top, feet below
  f.part('feet', { flat: true, rim: false });
  if (act !== 'sleep') f.px(3, 9).px(6, 9);
  f.offset(0, hop);
  f.part('hen', { shade: 'rb', light: 't' });
  if (act === 'sleep') {
    f.rows(1, 4, ['..####..', '.######.', '########', '.######.', '..####..']);
    f.part('comb', { flat: true, rim: false });
    f.px(4, 4);
    return;
  }
  f.rows(1, 4, ['.######.', '########', '########', '.######.', '..####..']);
  if (act === 'flap') {
    f.part('hen', { shade: 'r', light: 't' });
    f.rows(0, 2 + (p.ph === 2 ? 1 : 0), ['#......#', '##....##', '.#....#.']);
  }
  f.part('hen', { shade: 'rb', light: 't' });
  f.rows(3, 1 + (act === 'peck' ? p.ph * 2 : 0), ['.##.', '####', '####']);
  const hy = act === 'peck' ? p.ph * 2 : 0;
  f.part('comb', { flat: true, rim: false });
  f.hl(4, 5, hy + 0);
  if (p.view === 'down') {
    f.part('henEye', { flat: true, rim: false });
    if (!p.blink) f.px(3, 2 + hy).px(6, 2 + hy);
    f.part('beak', { flat: true, rim: false });
    f.hl(4, 5, 3 + hy);
    f.part('comb', { flat: true, rim: false });
    f.px(5, 4 + hy);
  }
  f.part('scarf', { flat: true, rim: false });
  f.hl(3, 6, 4 + hy);
}

registerChar('npc_piichan', () =>
  buildSprite({
    id: 'npc_piichan',
    w: 10,
    h: 10,
    mats: HEN,
    draw: henDraw,
    walkFrameMs: 110,
    walkBob: [0, 0, 0, 0],
    // tilts her head, pecks three times (every 12 s on his shoulder: here a wait loop)
    idle: {
      left: [{}, {}, { act: 'tilt' }, { act: 'tilt' }, {}, { blink: true }, { act: 'peck', ph: 1 }, { act: 'peck', ph: 0 }, { act: 'peck', ph: 1 }, { act: 'peck', ph: 0 }, { act: 'peck', ph: 1 }, {}, {}, {}],
      right: [{}, {}, { act: 'tilt' }, { act: 'tilt' }, {}, { blink: true }, { act: 'peck', ph: 1 }, { act: 'peck', ph: 0 }, { act: 'peck', ph: 1 }, { act: 'peck', ph: 0 }, { act: 'peck', ph: 1 }, {}, {}, {}],
      down: [{}, {}, {}, { blink: true }, { act: 'peck', ph: 1 }, {}, { act: 'peck', ph: 1 }, {}, {}, {}],
      up: [{}, {}, {}, {}, { act: 'peck', ph: 1 }, {}, {}, {}],
    },
    idleFrameMs: 200,
    extras: {
      sleep: { dirs: 'all' },
      tilt: { dirs: ['left', 'right'] },
      wake: { dirs: ['down', 'left', 'right'] },
    },
    anims: {
      peck: { frames: [{ ph: 1 }, { ph: 0 }, { ph: 1 }, { ph: 0 }, { ph: 1 }, { ph: 0 }], ms: 140, loop: false, dirs: ['down', 'left', 'right'] },
      flap: { frames: [{ ph: 1 }, { ph: 2 }, { ph: 1 }, { ph: 0 }], ms: [120, 120, 120, 200], loop: false, dirs: ['down', 'left', 'right'] },
      bob: { frames: [{ act: '' }, { act: 'peck', ph: 0 }, { act: 'tilt' }, { act: '' }], ms: 180, dirs: ['left', 'right'], dir: 'left' },
    },
    shadow: 6,
    keep: ['#5A6B2A'],
  }),
);
