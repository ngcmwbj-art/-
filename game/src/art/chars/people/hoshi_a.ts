// 星見台 villagers (1): ペロリ, マサルさん (52 10.3, 50 3.8–3.9).
//
// Both are drawn in the adult proportions (30 7.7: head 9px, 23–24px tall)
// with straight backs (52 10.0). The night is made by the field's grading;
// these are the day colours, and the night rim toward the tomato lantern is
// added at run time (nightlight.ts: litRim).

import { flat, mat, type Fig, type Mats, type RowMap } from '../fig';
import { PixelCanvas } from '../../../engine/pixel';
import { legs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { hangArms as hangArms0, hatLift, head, sideArm as sideArm0, sideSwing, upper, type ArmsDef, type HeadT } from '../kit';
import { BASE2, followFlag, HAIR_GREY, lookHill, SKIN_DEEP, SKIN_FARM, WAVE_ANIM, waveArm } from './hoshi_kit';
import { flag } from '../../../game/state';

// ---- the see-off wave: the dispatchers set WAVE, the arm helpers below obey it ----------

let WAVE: { ph: number; sleeve: string; hand: string; cuff?: string } | null = null;

function hangArms(f: Fig, p: Pose, a: ArmsDef, u: number, which: 'both' | 'L' | 'R' = 'both'): void {
  if (WAVE && p.view !== 'left') {
    if (which !== 'R') hangArms0(f, p, a, u, 'L');
    waveArm(f, p.view === 'up' ? 'up' : 'down', a.rx, a.sy + u - 1, WAVE);
    return;
  }
  hangArms0(f, p, a, u, which);
}

function sideArm(f: Fig, sx: number, sy: number, len: number, sw: number, segs: Seg[], shift = 0, w = 1): void {
  if (WAVE && shift === 0) {
    waveArm(f, 'left', sx, sy, WAVE);
    return;
  }
  sideArm0(f, sx, sy, len, sw, segs, shift, w);
}

/** Draw `p` through `fn`; for act 'wave' the near / viewer-right arm is raised instead. */
function waving(fn: (f: Fig, p: Pose) => void, sleeve: string, cuff?: string): (f: Fig, p: Pose) => void {
  return (f, p) => {
    if (p.act !== 'wave') return fn(f, p);
    WAVE = { ph: p.ph, sleeve, hand: 'skin', cuff };
    try {
      fn(f, { ...p, act: '' });
    } finally {
      WAVE = null;
    }
  };
}

// =============================================================================
// ペロリ (npc_hoshi_mitsu): 56, slim and tall (24), the village's youngest.
// A wide-brimmed straw fedora with a black band, a trimmed grey moustache,
// narrowed eyes (he cannot see well at night), grey hair combed back, an
// indigo work shirt with the sleeves rolled twice, a red bandana, off-white
// work trousers, white boots, the pruning-shear holster on his hip. Back
// straight (dandy, never stooped). Sits on a harvest crate with his legs
// crossed (18 tall). Idle (seated): tips the brim up with a finger → rolls
// a green tomato on his palm to read its colour. Extras: stand, give, crank,
// look_hill, look_up.

const MITSU: Mats = {
  ...BASE2,
  skin: SKIN_FARM,
  hair: HAIR_GREY,
  brow: flat('#9AA0A8'),
  stache: mat('#C8C2B4', { shade: '#9AA0A8', light: '#E8E4D8', dark: '#6B7186' }),
  hat: mat('#E8D9B5', { shade: '#C8A06A', light: '#FBF3DC', dark: '#A8742A' }),
  band: flat('#2A2440'),
  shirt: mat('#3A4A7A', { shade: '#2A3458', light: '#5A6A9A', dark: '#1B1733' }),
  cuff: mat('#5A6A9A', { shade: '#3A4A7A', light: '#7A8AB4', dark: '#2A3458' }),
  kerchief: mat('#E84E3C', { shade: '#B8302A', light: '#FF6A4D', dark: '#8A2E3A' }),
  pants: mat('#E8E4D8', { shade: '#C8C2B4', light: '#F4F1E8', dark: '#9AA0A8' }),
  boot: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#6B7186' }),
  holster: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A' }),
  steel: flat('#9AA0A8'),
  tomato: mat('#5FA85A', { shade: '#3FA66B', light: '#9BCB6B', dark: '#2E6B4A' }),
  bag: mat('#E8D9B5', { shade: '#C8A06A', light: '#FBF3DC', dark: '#A8742A' }),
  crank: flat('#6B7186'),
};
const MITSU_KEEP = ['#3A4A7A', '#2A3458', '#5A6A9A', '#D9A07A', '#B87A5A', '#7A8AB4'];

const MITSU_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  // only the combed-back sides show under the brim
  hairD: [3, 3, ['#........#', 'd........d', 'd........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, closed: true },
  upD: { fringe: 'none', openEyes: true, whites: false },
  neckD: [7, 9, 2],
  hairU: [3, 3, ['hhhhhhhhhh', 'hdhhhdhhhd', 'dhhhhhhhdd', '.ddhhhhdd.']],
  napeU: [5, 7, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [7, 3, ['####', '.###', '..##']],
  eyeL: { x: 4, y: 5, h: 1, closed: true },
  earL: [8, 5],
  neckL: [5, 9, 2],
};

/**
 * The straw fedora, `y` = the head-template top (the crown rises 2px above
 * it, the band sits on hy+1 with the brim's far edge, the near brim on hy+2
 * shading the forehead). `tip` = the brim pushed up by a finger.
 */
function fedora(f: Fig, view: 'down' | 'up' | 'left', y: number, tip = false) {
  const M: RowMap = { '=': ['band', 0], h: [null, 0], H: [null, 1], d: [null, -1], D: [null, -2] };
  f.part('hat', { flat: true });
  if (view === 'left') {
    // crown pinched toward the front (screen left), a snap brim dipping in front
    f.rows(5, y - 2, ['..hHHhd', '.hHhhhhd', '.hhhhhhd'], M);
    f.rows(2, y + 1, ['dhh=======hd'], M);
    f.rows(1, y + 2, ['HHhhhhhhhhhhd'], M);
    if (tip) f.rows(0, y + 1, ['H'], M);
    else f.rows(0, y + 3, ['dd'], M);
    // weave stitches
    f.t(-1).px(8, y - 1).px(10, y).t(null);
    return;
  }
  const front = view === 'down';
  f.rows(4, y - 2, ['.hHHdhd.', 'hHhhhhhd', 'hhhhhhdd'], M);
  if (front) f.t(-2).px(8, y - 2).t(null);
  f.rows(1, y + 1, ['dhh========hhd'], M);
  f.rows(1, y + 2 - (tip && front ? 1 : 0), [front ? 'HHhhhhhhhhhhhd' : 'hhhhhhhhhhhhhd'], M);
  // weave stitches on the brim
  f.t(-1).px(3, y + 2).px(12, y + 2).px(6, y - 1).t(null);
}

/** White rubber boots: a grey cuff line where the trousers tuck in. */
function bootCuffs(f: Fig, p: Pose, L: LegSpec) {
  const st = p.mode === 'walk' || p.mode === 'run' ? p.step % 4 : 0;
  const top = L.foot - (L.low?.h ?? 2);
  f.part(L.low?.mat ?? L.shoe, { flat: true, rim: false });
  if (p.view === 'down' || p.view === 'up') {
    const w = L.w ?? 2;
    const gap = L.gap ?? 2;
    const lx = L.cx - Math.ceil(gap / 2) - w;
    const rx = L.cx + Math.floor(gap / 2);
    f.t(-2).hl(lx, lx + w - 1, top - (st === 1 ? 1 : 0)).hl(rx, rx + w - 1, top - (st === 3 ? 1 : 0)).t(null);
  } else if (st === 0) f.t(-2).hl(L.cx - 1, L.cx - 1 + (L.w ?? 2) - 1, top).t(null);
}

const MITSU_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', low: { mat: 'boot', h: 3 }, shoe: 'boot', shoeLen: 3 };
const MITSU_ARM: Seg[] = [{ mat: 'shirt', n: 2 }, { mat: 'cuff', n: 1 }, { mat: 'skin' }];

/** Is this frame a seated one (on the harvest crate)? */
function mitsuSeated(p: Pose): boolean {
  return p.act === 'sit' || p.act === 'sit_hat' || p.act === 'sit_tomato' || p.act === 'sit_hill';
}

function mitsuTorsoFront(f: Fig, p: Pose, u: number, bot: number, back: boolean) {
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(4, 11, 11 + u);
  f.rect(4, 12 + u, 8, bot - (12 + u) + 1);
  f.part('shirt', { flat: true });
  if (!back) {
    // placket and two pocket flaps
    f.t(-1).vl(8, 13 + u, bot).t(null);
    f.t(1).hl(5, 6, 13 + u).hl(9, 10, 13 + u).t(null);
  } else {
    // the yoke seam across the shoulder blades
    f.t(-1).hl(5, 10, 13 + u).t(null);
  }
  // the bandana: knotted at the throat, its point down the chest (the band only from behind)
  f.part('kerchief', { flat: true });
  f.t(0).hl(6, 9, 11 + u).t(null);
  if (!back) f.t(1).px(7, 12 + u).t(-1).px(8, 12 + u).t(0).px(7, 13 + u).t(null);
  else f.t(-1).px(7, 12 + u).px(8, 12 + u).t(null);
}

function mitsuHolster(f: Fig, x: number, y: number) {
  f.part('holster', { shade: 'r', light: 't' });
  f.rect(x, y, 2, 3);
  f.part('steel', { flat: true, rim: false });
  f.px(x, y - 1).px(x + 1, y - 1);
}

/** A small green tomato on his palm (2×2 #5FA85A), rolled between two spots. */
function greenTomato(f: Fig, x: number, y: number) {
  f.part('tomato', { flat: true, rim: false });
  f.t(1).px(x, y).t(0).px(x + 1, y).px(x, y + 1).t(-1).px(x + 1, y + 1).t(null);
}

function mitsuFront(f: Fig, p: Pose) {
  const seated = mitsuSeated(p);
  const drop = seated ? 3 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const act = p.act;
  const hy = 2 + u;
  if (seated) {
    // legs crossed at the knee: the far shin straight down, the near leg over it
    f.part('pants', { shade: 'rb', light: 't', shift: -1 });
    f.rect(8, 21, 2, 1);
    f.part('boot', { shade: 'r', light: '', shift: -1 });
    f.rect(8, 22, 3, 1);
    f.part('pants', { shade: 'rb', light: 't' });
    f.rect(4, 19, 8, 2);
    f.rows(3, 20, ['###.....', '.##.....']);
    f.part('boot', { shade: 'rb', light: 't' });
    f.rows(2, 21, ['.##', '##.']);
    f.part('pants', { flat: true });
    f.t(-1).hl(5, 10, 20).t(null);
  } else {
    legs(f, p, MITSU_LEGS);
    bootCuffs(f, p, MITSU_LEGS);
    f.part('pants', { shade: 'rb', light: '' });
    f.rect(4, 16 + b, 8, 2);
    f.erase(7, 17 + b, 2, 1);
  }
  mitsuTorsoFront(f, p, u, 16 + b, false);
  mitsuHolster(f, 3, 16 + b);
  if (act === 'give') {
    // both hands out with a paper bag of tomatoes
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(3, 12 + u, 2, 3).rect(11, 12 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(4, 15 + u, 2, 1).rect(10, 15 + u, 2, 1);
    f.part('bag', { shade: 'rb', light: 't' });
    f.rows(5, 13 + u, ['######', '######', '######', '.####.']);
    f.part('bag', { flat: true });
    f.t(-1).hl(5, 10, 13 + u).t(null);
    f.part('#E84E3C', { flat: true, rim: false });
    f.px(7, 12 + u).px(8, 12 + u);
  } else if (act === 'crank') {
    // turning the film roll-up handle (ending): the handle circles
    const k = p.ph % 2;
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: MITSU_ARM }, u, 'L');
    f.part('shirt', { shade: 'rb', light: 't', shift: -1 });
    f.rect(12, 12 + u, 2, 2);
    f.part('skin', { shade: 'rb', light: 't', shift: -1 });
    f.rect(13, (k ? 13 : 15) + u, 2, 2);
    f.part('crank', { flat: true, rim: false });
    f.vl(14, 15 + u, 17 + u);
  } else if (seated) {
    // hands on the knee; one lifts to the brim / holds the tomato up
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(3, 12 + u, 1, 4).rect(12, 12 + u, 1, 4);
    f.part('skin', { shade: 'rb', light: 't' });
    if (act === 'sit_hat') {
      f.rect(11, 16 + u, 2, 2);
      f.part('cuff', { shade: 'rb', light: 't' });
      f.px(2, 12 + u).px(2, 11 + u);
      f.part('skin', { shade: 'rb', light: 't' });
      f.rect(2, 9 + u, 2, 2).px(3, 8 + u);
    } else if (act === 'sit_tomato') {
      f.rect(4, 16 + u, 2, 2).rect(9, 16 + u, 3, 1);
      greenTomato(f, p.ph ? 10 : 9, 14 + u);
    } else f.rect(4, 17 + u, 2, 1).rect(10, 17 + u, 2, 1);
  } else {
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: MITSU_ARM }, u);
  }
  head(f, p, MITSU_HEAD, hy);
  if (!p.lookUp) f.retone(4, hy + 3, -1, 8, 1);
  // the trimmed moustache (3px, tapered)
  if (!p.lookUp) {
    f.part('stache', { flat: true, rim: false });
    f.t(-1).px(6, hy + 7).t(0).px(7, hy + 7).px(8, hy + 7).t(-1).px(9, hy + 7).t(null);
  } else {
    f.part('stache', { flat: true, rim: false });
    f.t(0).hl(7, 8, hy + 5).t(null);
  }
  fedora(f, 'down', hy + hatLift(p), act === 'sit_hat');
}

function mitsuBack(f: Fig, p: Pose) {
  const seated = mitsuSeated(p);
  const drop = seated ? 3 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const hy = 2 + u - (p.act === 'look_hill' || p.act === 'sit_hill' ? 1 : 0);
  if (seated) {
    // from behind: the crate hides the seat; boots show either side
    f.part('pants', { shade: 'rb', light: '' });
    f.rect(4, 19, 8, 2);
    f.part('boot', { shade: 'r', light: '', shift: -1 });
    f.rect(3, 21, 2, 2).rect(11, 22, 2, 1);
  } else {
    legs(f, p, MITSU_LEGS);
    bootCuffs(f, p, MITSU_LEGS);
    f.part('pants', { shade: 'rb', light: '' });
    f.rect(4, 16 + b, 8, 2);
    f.erase(7, 17 + b, 2, 1);
  }
  mitsuTorsoFront(f, p, u, 16 + b, true);
  mitsuHolster(f, 11, 16 + b);
  hangArms(f, { ...p, mode: seated ? 'extra' : p.mode }, { lx: 3, rx: 12, sy: 12, hy: seated ? 16 : 17, segs: MITSU_ARM }, u);
  head(f, p, MITSU_HEAD, hy);
  fedora(f, 'up', hy + hatLift(p));
}

function mitsuSide(f: Fig, p: Pose) {
  const seated = mitsuSeated(p);
  const drop = seated ? 3 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const act = p.act;
  const sw = sideSwing(p);
  // look_hill from the side: the head tipped back to the hill behind his shoulder
  const lp = act === 'sit_hill' || act === 'look_hill' ? { ...p, lookUp: true } : p;
  const hy = 2 + u;
  if (!seated) sideArm(f, 9, 12 + u, 4, -sw, MITSU_ARM, -1);
  if (seated) {
    // far leg: thigh forward, shin down to the ground
    f.part('pants', { shade: 'rb', light: '', shift: -1 });
    f.rect(4, 19, 6, 2);
    f.rect(4, 21, 2, 1);
    f.part('boot', { shade: 'r', light: '', shift: -1 });
    f.rect(3, 22, 3, 1);
    // near leg crossed over it: thigh a row higher, shin hanging forward
    f.part('pants', { shade: 'rb', light: 't' });
    f.rect(3, 18, 8, 2);
    f.rows(1, 19, ['##', '##']);
    f.part('boot', { shade: 'rb', light: 't' });
    f.rows(0, 21, ['##.', '###']);
  } else {
    legs(f, p, MITSU_LEGS);
    bootCuffs(f, p, MITSU_LEGS);
    f.part('pants', { shade: 'rb', light: '' });
    f.rect(5, 16 + b, 6, 2);
  }
  // torso
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 16 + b - (12 + u) + 1);
  f.part('shirt', { flat: true });
  f.t(1).px(6, 13 + u).t(null);
  f.part('kerchief', { flat: true });
  f.t(0).hl(5, 7, 11 + u).t(1).px(5, 12 + u).t(-1).px(6, 12 + u).t(null);
  mitsuHolster(f, 10, 16 + b);
  if (act === 'give') {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(6, 12 + u, 3, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.hl(3, 5, 14 + u);
    f.part('bag', { shade: 'rb', light: 't' });
    f.rows(0, 11 + u, ['####', '####', '####', '.##.']);
  } else if (act === 'crank') {
    // the film roll-up handle at the house's side, turned round and round
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(5, 12 + u, 3, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(2, (p.ph ? 12 : 14) + u, 2, 2);
    f.part('crank', { flat: true, rim: false });
    f.vl(1, 13 + u, 16 + u);
  } else if (seated) {
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(6, 12 + u, 3, 3);
    f.part('cuff', { shade: 'rb', light: 't' });
    f.px(5, 15 + u);
    f.part('skin', { shade: 'rb', light: 't' });
    if (act === 'sit_hat') {
      f.px(5, 11 + u).px(4, 10 + u).rect(3, 8 + u, 2, 2);
    } else if (act === 'sit_tomato') {
      f.rect(3, 15 + u, 2, 1);
      greenTomato(f, p.ph ? 2 : 3, 13 + u);
    } else f.rect(3, 16 + u, 2, 1);
  } else {
    f.part('shirt', { shade: 'rb', light: 'tl' });
    f.rect(7, 12 + u, 3, 2);
    sideArm(f, 8, 14 + u, 2, sw, [{ mat: 'cuff', n: 1 }, { mat: 'skin' }]);
  }
  head(f, lp, MITSU_HEAD, hy);
  if (!lp.lookUp) f.retone(3, hy + 3, -1, 5, 1);
  if (!lp.lookUp) {
    f.part('stache', { flat: true, rim: false });
    f.t(0).px(3, hy + 7).t(-1).px(4, hy + 7).t(null);
  } else {
    f.part('stache', { flat: true, rim: false });
    f.t(0).px(2, hy + 5).t(null);
  }
  fedora(f, 'left', hy + (lp.lookUp ? -1 : 0), act === 'sit_hat');
}

function mitsuDraw(f: Fig, p: Pose) {
  if (p.view === 'down') mitsuFront(f, p);
  else if (p.view === 'up') mitsuBack(f, p);
  else mitsuSide(f, p);
}

// seated wait (≈6s): breathing → the brim up a finger → the tomato turned on his palm
const MITSU_SIT: IdleKey[] = [
  ...rep([{ act: 'sit', breath: 0 }, { act: 'sit', breath: 0 }, { act: 'sit', breath: 1 }, { act: 'sit', breath: 1 }], 2),
  { act: 'sit', breath: 0, blink: true },
  { act: 'sit_hat' }, { act: 'sit_hat' }, { act: 'sit_hat', breath: 1 }, { act: 'sit_hat', breath: 1 },
  { act: 'sit' },
  ...rep([{ act: 'sit_tomato', ph: 0 }, { act: 'sit_tomato', ph: 0 }, { act: 'sit_tomato', ph: 1 }, { act: 'sit_tomato', ph: 1 }], 3),
  { act: 'sit', blink: true }, { act: 'sit' },
];
const MITSU_SIT_BACK: IdleKey[] = rep([{ act: 'sit', breath: 0 }, { act: 'sit', breath: 0 }, { act: 'sit', breath: 1 }, { act: 'sit', breath: 1 }], 4);

registerChar('npc_hoshi_mitsu', () =>
  buildSprite({
    id: 'npc_hoshi_mitsu',
    mats: MITSU,
    draw: waving(mitsuDraw, 'shirt', 'cuff'),
    walkFrameMs: 150,
    idle: { down: breathingIdle(16, [11]), up: breathingIdle(), left: breathingIdle(16, [6]), right: breathingIdle(16, [6]) },
    idleFrameMs: 250,
    extras: {
      stand: { dirs: 'all', p: { bob: 1 } },
      give: { dirs: ['down', 'left', 'right'] },
      crank: { dirs: ['down', 'left', 'right'] },
      sit: { dirs: 'all', p: { act: 'sit' } },
    },
    anims: {
      crank: { frames: [{ ph: 0 }, { ph: 1 }], ms: 220, dirs: ['down', 'left', 'right'] },
      wave: WAVE_ANIM,
    },
    poses: {
      sit: { down: MITSU_SIT, left: MITSU_SIT, right: MITSU_SIT, up: MITSU_SIT_BACK },
      look_hill: lookHill({ up: 'sit_hill', side: 'sit_hill', down: MITSU_SIT }),
    },
    shadow: 10,
    keep: MITSU_KEEP,
  }),
);

// =============================================================================
// マサルさん (npc_hoshi_gen): 64, broad (shoulders 12), a shaven head with one
// 1px shine (#E8B894; the night rim lights it orange next to the lantern),
// thick brows, a navy boiler suit with mud on the knees, white boots, a towel
// round his neck, the work cap stuffed in his back pocket. Strong forearms.
// At h0 he shakes the flat flashlight (its 1px bulb is lit by the world's
// genFlash once a second, at the feet +(±6, −11)) and listens toward the
// barn. Extras: lean (elbows on the pen rail), write (the rounds book), point,
// give (the scoop), sit_bag (on a feed bag, towel to the face), feed (pushing
// the feed cart), look_up, look_hill.

const GEN: Mats = {
  ...BASE2,
  skin: SKIN_DEEP,
  gloss: flat('#E8B894'),
  brow: flat('#3A2A20'),
  suit: mat('#2F4A8A', { shade: '#223668', light: '#4766A8', dark: '#162048' }),
  mud: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A' }),
  boot: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  towel: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  cap: mat('#6B7186', { shade: '#4A5068', light: '#8E95A6' }),
  torch: mat('#9AA0A8', { shade: '#6B7186', light: '#C8CDD4', dark: '#3A3F48' }),
  lens: flat('#C8C2B4'),
  book: mat('#2F4A8A', { shade: '#223668', light: '#4766A8' }),
  paper: flat('#F4F1E8'),
  pencil: flat('#FFD23F'),
  scoop: mat('#9AA0A8', { shade: '#6B7186', light: '#C8CDD4' }),
  handle: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A' }),
  sack: mat('#E8D9B5', { shade: '#C8A06A', light: '#FBF3DC', dark: '#A8742A' }),
  stripe: flat('#3FA66B'),
};
const GEN_KEEP = ['#C98A6A', '#A86A4E', '#E8B894', '#3A2A20', '#223668', '#162048', '#4766A8'];

const GEN_HEAD: HeadT = {
  skinMat: 'skin',
  hairMat: 'skin',
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  // the shaven dome is skin: a clean round outline lit from the upper left
  hairD: [4, 0, ['..HHhh..', '.HHhhhhd', 'Hhhhhhhd'], { H: [null, 1], h: [null, 0], d: [null, -1] }],
  hairDUp: [4, 0, ['..HHhh..', '.HHhhhhd'], { H: [null, 1], h: [null, 0], d: [null, -1] }],
  upD: { fringe: 'none', lift: 1 },
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -2, mat: 'brow', w: 2 } },
  mouthD: [7, 7, 2],
  neckD: [6, 9, 4],
  hairU: [4, 0, ['..HHhh..', '.HHhhhhd', 'Hhhhhhhd', 'hhhhhhhd', 'hhhhhhdd', 'hhhhhhdd', '.hhhhhd.', '..hhdd..'], { H: [null, 1], h: [null, 0], d: [null, -1] }],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [4, 0, ['..HHhh..', '.HHhhhhd', 'Hhhhhhhd', '....hhhd', '....hhdd', '....hhd.', '.....d..'], { H: [null, 1], h: [null, 0], d: [null, -1] }],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -2, mat: 'brow', w: 2 } },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 3],
};

const GEN_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 3, gap: 2, mat: 'suit', low: { mat: 'boot', h: 3 }, shoe: 'boot', shoeLen: 4 };
const GEN_ARM: Seg[] = [{ mat: 'suit', n: 2 }, { mat: 'skin' }];

/** The 1px shine on the crown (front / side / back). */
function genGloss(f: Fig, x: number, y: number) {
  f.part('gloss', { flat: true, rim: false });
  f.px(x, y);
}

function genTowelFront(f: Fig, u: number, back: boolean) {
  f.part('towel', { flat: true });
  f.t(0).hl(5, 10, 11 + u).t(-1).hl(6, 9, 12 + u).t(null);
  if (back) return;
  // the ends hang down his chest
  f.t(1).vl(5, 12 + u, 14 + u).t(0).vl(10, 12 + u, 13 + u).t(-1).px(10, 14 + u).t(null);
}

function genBody(f: Fig, p: Pose, u: number, b: number, back: boolean) {
  f.part('suit', { shade: 'rb', light: 't' });
  f.hl(3, 12, 11 + u);
  f.rect(2, 12 + u, 12, 17 + b - (12 + u));
  f.part('suit', { flat: true });
  if (!back) {
    // zip, chest pocket, the pen in it
    f.t(-2).vl(8, 13 + u, 16 + b).t(null);
    f.t(-1).hl(3, 5, 13 + u).vl(3, 14 + u, 15 + u).t(null);
  } else {
    f.t(-1).hl(4, 11, 14 + u).t(null);
  }
  // belt line
  f.t(-1).hl(3, 12, 16 + b).t(null);
}

function genLegs(f: Fig, p: Pose, b: number) {
  legs(f, p, GEN_LEGS);
  // mud on both knees
  if (p.view !== 'up') {
    f.part('mud', { flat: true, rim: false });
    const st = p.mode === 'walk' || p.mode === 'run' ? p.step % 4 : 0;
    if (p.view === 'down') f.t(0).hl(4, 5, 19 - (st === 1 ? 1 : 0)).hl(10, 11, 19 - (st === 3 ? 1 : 0)).t(-1).px(5, 20 - (st === 1 ? 1 : 0)).t(null);
    else f.t(0).px(7, 19).px(8, 19).t(null);
  }
  void b;
}

/** The flat flashlight held out (h0): lens at the feet +(6, −11) = frame (14, 13) when facing down. */
function genTorchFront(f: Fig, u: number, shake: number) {
  f.part('suit', { shade: 'rb', light: 't', shift: -1 });
  f.rect(12, 12 + u, 2, 2);
  f.part('skin', { shade: 'rb', light: 't', shift: -1 });
  f.rect(12, 14 + u + shake, 2, 2);
  f.part('torch', { shade: 'b', light: 't' });
  f.hl(12, 13, 13 + shake);
  f.part('lens', { flat: true, rim: false });
  f.px(14, 13 + shake);
}

function genFront(f: Fig, p: Pose) {
  const act = p.act;
  const sit = act === 'sit_bag';
  const drop = sit ? 5 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const hy = 2 + u;
  if (sit) {
    // on a feed bag (#E8D9B5, green band): knees apart, boots planted
    f.part('sack', { shade: 'rb', light: 't' });
    f.rows(2, 19, ['############', '############', '.##########.']);
    f.part('stripe', { flat: true, rim: false });
    f.hl(3, 12, 20);
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(2, 18, 5, 2).rect(9, 18, 5, 2);
    f.part('suit', { shade: 'r', light: '' });
    f.rect(2, 20, 3, 1).rect(11, 20, 3, 1);
    f.part('boot', { shade: 'r', light: '' });
    f.rect(1, 21, 4, 2).rect(11, 21, 4, 2);
  } else genLegs(f, p, b);
  genBody(f, p, u, b, false);
  const torch = act === 'flash';
  if (act === 'point') {
    // arm out to his right (viewer-left), finger to the dark
    hangArms(f, p, { lx: 2, rx: 13, sy: 12, hy: 17, segs: GEN_ARM, w: 1 }, u, 'R');
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(0, 12 + u, 2, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(0, 11 + u, 1, 1).px(0, 10 + u);
  } else if (act === 'write') {
    // the rounds book on his forearm, pencil in hand
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(1, 12 + u, 2, 3).rect(13, 12 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(3, 15 + u, 2, 2).rect(11, 14 + u, 2, 2);
    f.part('book', { shade: 'rb', light: 't' });
    f.rect(4, 13 + u, 6, 3);
    f.part('paper', { flat: true, rim: false });
    f.hl(5, 9, 14 + u);
    f.part('pencil', { flat: true, rim: false });
    f.px(10 + (p.ph ? 0 : -1), 13 + u).px(11, 12 + u);
  } else if (act === 'give') {
    // the scoop held out to Minato, both hands on the handle
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(2, 12 + u, 2, 3).rect(12, 12 + u, 2, 3);
    f.part('handle', { shade: 'r', light: 't' });
    f.vl(8, 10 + u, 16 + u);
    f.part('scoop', { shade: 'rb', light: 't' });
    f.rows(6, 16 + u, ['#####', '#####', '.###.']);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(4, 14 + u, 3, 2).rect(9, 12 + u, 3, 2);
  } else if (act === 'feed') {
    // pushing the feed cart: both fists forward and low on its handle
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(2, 12 + u, 2, 4).rect(12, 12 + u, 2, 4);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(3, 16 + u, 3, 2).rect(10, 16 + u, 3, 2);
  } else if (sit) {
    // towel to his face with both hands
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(2, 12 + u, 2, 2).rect(12, 12 + u, 2, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(3, 14 + u, 2, 1).rect(11, 14 + u, 2, 1);
  } else if (torch) {
    hangArms(f, p, { lx: 2, rx: 13, sy: 12, hy: 17, segs: GEN_ARM }, u, 'L');
    genTorchFront(f, u, p.ph);
  } else if (act === 'listen') {
    // a hand cupped behind his ear, turned to the barn; the torch hangs in the other
    hangArms(f, p, { lx: 2, rx: 13, sy: 12, hy: 17, segs: GEN_ARM }, u, 'R');
    f.part('torch', { shade: 'b', light: 't' });
    f.vl(13, 18 + u, 19 + u);
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(1, 11 + u, 2, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.px(1, 10 + u).rect(1, hy + 5, 2, 3);
  } else hangArms(f, p, { lx: 2, rx: 13, sy: 12, hy: 17, segs: GEN_ARM }, u);
  genTowelFront(f, u, false);
  head(f, p, GEN_HEAD, hy);
  genGloss(f, 6, hy + (p.lookUp ? 2 : 1));
  if (sit) {
    // the towel held up over the lower face
    f.part('towel', { shade: 'rb', light: 't' });
    f.rows(4, hy + 7, ['########', '.######.']);
  }
}

function genBack(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const hy = 2 + u - (p.act === 'look_hill' ? 1 : 0);
  genLegs(f, p, b);
  genBody(f, p, u, b, true);
  // the work cap in the back pocket (no logo)
  f.part('cap', { shade: 'rb', light: 't' });
  f.rows(9, 15 + b, ['###', '##.']);
  hangArms(f, p, { lx: 2, rx: 13, sy: 12, hy: 17, segs: GEN_ARM }, u);
  genTowelFront(f, u, true);
  head(f, p, GEN_HEAD, hy);
  genGloss(f, 6, hy + (p.lookUp ? 2 : 1));
}

function genSide(f: Fig, p: Pose) {
  const act = p.act;
  const lean = act === 'lean';
  const u = upper(p) + (lean ? 1 : 0);
  const b = p.bob;
  const sw = sideSwing(p);
  const hy = 2 + u + (lean ? 1 : 0);
  const hx = lean ? -1 : 0;
  if (!lean && act !== 'point' && act !== 'give' && act !== 'feed') sideArm(f, 9, 12 + u, 4, -sw, GEN_ARM, -1, 2);
  genLegs(f, p, b);
  f.part('suit', { shade: 'rb', light: 't' });
  f.hl(5 + hx, 10, 11 + u);
  f.rect(4 + hx, 12 + u, 8 - hx, 17 + b - (12 + u));
  f.part('suit', { flat: true });
  f.t(-1).hl(4, 11, 16 + b).t(null);
  // cap in the back pocket
  f.part('cap', { shade: 'r', light: 't' });
  f.px(11, 15 + b).px(11, 16 + b);
  f.part('towel', { flat: true });
  f.t(0).hl(4 + hx, 8 + hx, 11 + u).t(1).px(4 + hx, 12 + u).px(4 + hx, 13 + u).t(null);
  if (lean) {
    // elbows on the pen rail, forearms crossed on it, shoulders forward
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(3, 12 + u, 4, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(0, 13 + u, 4, 2);
  } else if (act === 'point') {
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(3, 12 + u, 4, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(0, 12 + u, 3, 2).px(0, 11 + u);
  } else if (act === 'give') {
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(4, 12 + u, 3, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(2, 13 + u, 2, 2);
    f.part('handle', { shade: 'r', light: 't' });
    f.line(3, 12 + u, 0, 15 + u);
    f.part('scoop', { shade: 'rb', light: 't' });
    f.rows(0, 15 + u, ['##', '##']);
  } else if (act === 'feed') {
    // both fists on the feed cart's handle, low in front; a step of the push
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(3, 13 + u, 4, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(1 - p.ph, 15 + u, 3, 2);
  } else if (act === 'flash') {
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(5, 12 + u, 3, 2);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(3, 13 + u + p.ph, 2, 2);
    f.part('torch', { shade: 'b', light: 't' });
    f.hl(3, 4, 13 + p.ph);
    f.part('lens', { flat: true, rim: false });
    f.px(2, 13 + p.ph);
  } else {
    f.part('suit', { shade: 'rb', light: 'tl' });
    f.rect(6, 12 + u, 3, 2);
    sideArm(f, 7, 14 + u, 2, sw, [{ mat: 'skin' }], 0, 2);
  }
  head(f, p, GEN_HEAD, hy, hx);
  genGloss(f, 6 + hx, hy + (p.lookUp ? 2 : 1));
}

function genDraw(f: Fig, p: Pose) {
  if (p.view === 'down') genFront(f, p);
  else if (p.view === 'up') genBack(f, p);
  else genSide(f, p);
}

// h0: shakes the dead flashlight twice, then listens toward the barn (≈5s)
const GEN_IDLE: IdleKey[] = [
  { act: 'flash', ph: 0 }, { act: 'flash', ph: 1 }, { act: 'flash', ph: 0 }, { act: 'flash', ph: 1 }, { act: 'flash', ph: 0 },
  { act: 'flash', ph: 0, breath: 1 }, { act: 'flash', ph: 0, breath: 1 }, { act: 'flash', ph: 0, blink: true },
  { act: 'flash', ph: 1 }, { act: 'flash', ph: 0 }, { act: 'flash', ph: 1 }, { act: 'flash', ph: 0 },
  { act: 'listen' }, { act: 'listen' }, { act: 'listen', breath: 1 }, { act: 'listen', breath: 1 }, { act: 'listen' }, { act: 'listen', blink: true },
  { act: 'flash', ph: 0 }, { act: 'flash', ph: 0, breath: 1 },
];
const LEAN: IdleKey[] = [
  ...rep([{ act: 'lean', breath: 0 }, { act: 'lean', breath: 0 }, { act: 'lean', breath: 1 }, { act: 'lean', breath: 1 }], 3),
  { act: 'lean', blink: true }, { act: 'lean' }, { act: 'lean', breath: 1 }, { act: 'lean', breath: 1 },
];

/**
 * The feed cart in front of him (side views of 'feed', the ending's cut 2a):
 * a steel box on small wheels with the morning's feed heaped in it and a
 * towel on the handle, composited on a 34px frame (the feet stay centred).
 */
function withCart(frame: HTMLCanvasElement, right: boolean, ph: number): HTMLCanvasElement {
  const W = 34;
  const cart = new PixelCanvas(W, frame.height);
  const b = frame.height - 24;
  const X = (x: number) => (right ? W - 1 - x : x) - (right ? 0 : 0);
  const px = (x: number, y: number, c: string) => cart.set(X(x - ph), y + b, c);
  for (let x = 1; x <= 8; x++) for (let y = 15; y <= 19; y++) px(x, y, x === 8 ? '#6B7186' : '#9AA0A8');
  for (let x = 1; x <= 8; x++) px(x, 15, '#C8CDD4');
  for (let x = 1; x <= 8; x++) px(x, 19, '#6B7186');
  for (let x = 2; x <= 7; x++) px(x, 14, x % 3 === 0 ? '#C8A06A' : '#E8D9B5');
  px(3, 13, '#E8D9B5');
  px(5, 13, '#E8D9B5');
  for (const x of [2, 7]) {
    px(x, 20, '#3A3F48');
    px(x, 21, '#2A2440');
    px(x + 1, 21, '#2A2440');
    px(x, 22, '#2A2440');
  }
  // the handle up to his fists, the towel hanging from it
  px(9, 15, '#6B7186');
  px(10, 14, '#6B7186');
  px(11, 14, '#6B7186');
  px(10, 15, '#E8E4D8');
  px(10, 16, '#E8E4D8');
  cart.outline('#2A2440');
  const c = cart.toCanvas();
  c.getContext('2d')!.drawImage(frame, (W - frame.width) >> 1, 0);
  return c;
}

function genSprite(id: string, idleDown: IdleKey[]) {
  const s = genSpriteRaw(id, idleDown);
  for (const d of ['left', 'right'] as const) {
    const a = s.animsDir?.feed?.[d];
    if (a) s.animsDir!.feed![d] = { ...a, frames: a.frames.map((fr, i) => withCart(fr, d === 'right', i % 2)) };
    const e = s.extraDir?.feed?.[d];
    if (e) s.extraDir!.feed![d] = withCart(e, d === 'right', 0);
  }
  return s;
}

function genSpriteRaw(id: string, idleDown: IdleKey[]) {
  return buildSprite({
    id,
    mats: GEN,
    draw: waving(genDraw, 'suit'),
    walkFrameMs: 150,
    idle: { down: idleDown, up: breathingIdle(), left: breathingIdle(16, [5]), right: breathingIdle(16, [5]) },
    idleFrameMs: 250,
    extras: {
      lean: { dirs: ['left', 'right'] },
      point: { dirs: ['down', 'left', 'right'] },
      give: { dirs: ['down', 'left', 'right'] },
      write: { dirs: ['down'] },
      feed: { dirs: ['down', 'left', 'right'] },
      sit_bag: { dirs: ['down'] },
      flash: { dirs: ['down', 'left', 'right'] },
    },
    anims: {
      write: { frames: [{ ph: 0 }, { ph: 1 }], ms: 200 },
      feed: { frames: [{ ph: 0 }, { ph: 1 }], ms: 260, dirs: ['down', 'left', 'right'] },
      wave: WAVE_ANIM,
    },
    poses: {
      lean: { left: LEAN, right: LEAN, down: breathingIdle(), up: breathingIdle() },
      look_hill: lookHill(),
      sit_bag: { down: rep([{ act: 'sit_bag', breath: 0 }, { act: 'sit_bag', breath: 1 }], 4) },
    },
    shadow: 12,
    keep: GEN_KEEP,
  });
}

// the flashlight shaking is the h0 picture (evt_ch2_gen_stop): after it he
// only breathes and listens now and then, the dead torch in his pocket
const GEN_IDLE_AFTER: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 3),
  { act: 'listen' }, { act: 'listen' }, { act: 'listen', breath: 1 }, { act: 'listen', blink: true },
  { breath: 0 }, { breath: 1 },
];
registerChar('npc_hoshi_gen', () => genSprite('npc_hoshi_gen', GEN_IDLE));
registerChar('npc_hoshi_gen_after', () => genSprite('npc_hoshi_gen_after', GEN_IDLE_AFTER));
followFlag('npc_hoshi_gen', () => (flag('flag_ch2_met_gen') ? 'npc_hoshi_gen_after' : 'npc_hoshi_gen'));
