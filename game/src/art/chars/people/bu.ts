// ぶーさんの本体 (npc_bu_body; ★2026-09-30 げむきか9/30の5「減らない コーヒー」、
// 02 #71、10_narrative 6.16・6.27、30_level_art 9.3): the tired salaryman whose
// shadow is doing the overtime on the park bench. He is drawn to match his
// shadow (town3.ts, npc_shadow_man): the side-parted crown, the sloped
// shoulders, the necktie and the square briefcase with its handle. A grey suit
// jacket left open over a white shirt, the navy tie loosened (the knot pulled
// a pixel down, the collar open), charcoal trousers, black shoes; narrow tired
// eyes with a shadow under them. No long shadow of his own (the NPC is placed
// with shadow: 0): it is on the bench.
//
//   standing / walking : the case in his right hand (viewer-left in front)
//   'sit' (held pose)  : on a chair or a bench, the case by his feet
//     front  — looks at his wristwatch → a sigh (as his shadow does)
//     side   — reads the newspaper → turns a page → a sigh (the café's window seat)
//     back   — breathes
//   look_up
//
// Canvas 20×24: the 16px figure is drawn 2px in, so the case fits beside it.

import { flat, mat, type Fig, type Mats } from '../fig';
import { SKIN_LIGHT } from '../mats';
import { legs, sitLegs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { hangArms, head, sideArm, sideSwing, upper, type HeadT } from '../kit';

const BU: Mats = {
  eye: flat('#2A1C28'),
  shine: flat('#FFF6D8'),
  mouth: flat('#B86A5A'),
  skin: SKIN_LIGHT,
  tired: flat('#E0A882'),
  hair: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186', dark: '#1B1733', rim: '#A89AA8' }),
  brow: flat('#2A2440'),
  shirt: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF', dark: '#9AA0A8', rim: '#FFE0B8' }),
  jacket: mat('#6B7186', { shade: '#4E5262', light: '#8A90A0', dark: '#3A3F48', rim: '#C8A8A0' }),
  slacks: mat('#4E5262', { shade: '#3A3F48', light: '#6B7186', dark: '#2A2440' }),
  shoe: mat('#2A2440', { shade: '#1B1733', light: '#3A3F48', spec: '#9AA0A8' }),
  tie: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B1733' }),
  case: mat('#5A3A2A', { shade: '#3A2B2A', light: '#8A5A3A', dark: '#2B1E1A', rim: '#C8845A' }),
  handle: flat('#3A2B2A'),
  clasp: flat('#D9A441'),
  paper: mat('#E8E4D8', { shade: '#C8C2B4', light: '#F4F1E8' }),
  print: flat('#9AA0A8'),
  watch: flat('#D9A441'),
};

/** Side-parted hair (the part on his left, the fringe swept across), tired narrow eyes. */
const HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, ['..hhhhHh..', '.hhhhhK.h.', 'hhhhhhhhhd', 'hhhh...hdd', 'h........d']],
  eyesD: { x: 6, d: 3, y: 6, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  mouthD: [7, 8, 2],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['..hhhhHh..', '.hhhhhK.h.', 'hhhhhhhhhd', 'hhhhhhhhdd', 'hhhhhhhhhd', '.hhhhhhd..']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 0, ['..hhhhh...', '.hhhhhhhd.', 'hhhhhhhhhd', 'hh..hhhhdd', '.....hhhdd', '......hhd.']],
  eyeL: { x: 4, y: 6, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  earL: [8, 5],
  mouthL: [3, 8],
  neckL: [5, 9, 2],
};

const LEGS: LegSpec = { cx: 8, hip: 18, foot: 22, w: 2, gap: 2, mat: 'slacks', shoe: 'shoe', shoeLen: 3 };
const SLEEVE: Seg[] = [{ mat: 'jacket', n: 3 }, { mat: 'shirt', n: 1 }, { mat: 'skin' }];

const SEATED = new Set(['sit', 'watch', 'sigh', 'paper', 'page']);

/** The briefcase: a square box, a handle on top, a brass clasp (x, y = its top-left). */
function briefcase(f: Fig, x: number, y: number): void {
  f.part('handle', { flat: true, rim: false });
  f.hl(x + 1, x + 3, y).px(x + 1, y + 1).px(x + 3, y + 1);
  f.part('case', { shade: 'rb', light: 't' });
  f.rect(x, y + 1, 5, 4);
  f.part('clasp', { flat: true, rim: false, ol: false });
  f.px(x + 2, y + 2);
}

/** Tired eyes: a shadow under them (front). */
function tiredFront(f: Fig, p: Pose, hy: number): void {
  if (p.lookUp) return;
  f.part('tired', { flat: true, rim: false, ol: false });
  f.px(6, hy + 7).px(9, hy + 7);
}

function front(f: Fig, p: Pose): void {
  const act = p.act;
  const seated = SEATED.has(act);
  const sigh = act === 'sigh' ? 1 : 0;
  const drop = seated ? 3 : 0;
  const u = upper(p) + drop + sigh;
  const b = p.bob + drop;
  const hy = 2 + u;
  if (seated) {
    // the case stands by his left foot (viewer-right), against the seat
    if (p.view === 'down') briefcase(f, 13, 17);
    sitLegs(f, p, LEGS, 19);
  } else legs(f, p, LEGS);
  // the shirt, then the open jacket over it (its hem a row lower; seated, down to the lap)
  const bottom = seated ? 18 : 17 + b;
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(4, 11, 11 + u);
  f.rect(3, 12 + u, 10, bottom - (12 + u) + 1);
  f.part('jacket', { shade: 'rb', light: 't' });
  if (p.view === 'down') {
    f.rect(3, 12 + u, 3, bottom - (12 + u) + 2);
    f.rect(10, 12 + u, 3, bottom - (12 + u) + 2);
    // the lapels come in to a V at the chest
    f.px(6, 15 + u).px(9, 15 + u).px(6, 16 + u).px(9, 16 + u);
    // the loosened tie: an open collar, the knot a pixel low, the blade down the shirt
    f.part('skin', { shade: '', light: '' });
    f.px(7, 11 + u).px(8, 11 + u);
    f.part('tie', { shade: 'r', light: '' });
    f.px(7, 12 + u).px(8, 12 + u).px(7, 13 + u).px(7, 14 + u).px(8, 14 + u).px(7, 15 + u).px(8, 15 + u).px(8, 16 + u);
  } else {
    f.rect(3, 12 + u, 10, bottom - (12 + u) + 2);
    // the back seam and the vent
    f.t(-1).vl(8, 13 + u, bottom + 1).t(null);
    f.part('shirt', { flat: true, rim: false });
    f.hl(6, 9, 11 + u);
  }
  // arms
  if (p.view === 'down' && act === 'watch') {
    // the left wrist up before the chest, the right hand on it: the watch
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: SLEEVE }, u, 'L');
    f.part('jacket', { shade: 'rb', light: 't', shift: -1 });
    f.px(12, 13 + u).px(11, 14 + u);
    f.part('shirt', { flat: true });
    f.px(10, 14 + u);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(8, 14 + u, 2, 1);
    f.part('watch', { flat: true, rim: false });
    f.px(9, 13 + u);
  } else if (seated) {
    // hands resting on the thighs
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: SLEEVE }, u);
  } else {
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: SLEEVE }, u);
    // walking or standing: the case in his right hand (viewer-left in front, far side behind)
    const sw = p.mode === 'walk' || p.mode === 'run' ? [0, 1, 0, -1][p.step % 4] : 0;
    if (p.view === 'down') briefcase(f, 0, 17 + u + (sw > 0 ? 1 : sw < 0 ? -1 : 0));
    else briefcase(f, 11, 17 + u - (sw > 0 ? 1 : sw < 0 ? -1 : 0));
  }
  head(f, p, HEAD, hy);
  if (p.view === 'down') {
    tiredFront(f, p, hy);
    // a sigh shuts his eyes
    if (sigh && !p.lookUp) {
      f.part('skin', { shade: '', light: '' });
      f.px(6, hy + 6).px(9, hy + 6);
      f.part('eye', { flat: true, rim: false });
      f.px(5, hy + 6).px(10, hy + 6);
    }
  }
}

function side(f: Fig, p: Pose): void {
  const act = p.act;
  const seated = SEATED.has(act);
  const sigh = act === 'sigh' ? 1 : 0;
  const drop = seated ? 3 : 0;
  const u = upper(p) + drop + sigh;
  const b = p.bob + drop;
  const hy = 2 + u;
  const sw = seated ? 0 : sideSwing(p);
  if (seated) briefcase(f, 11, 17);
  if (!seated) sideArm(f, 9, 12 + u, 5, -sw, SLEEVE, -1);
  if (seated) sitLegs(f, p, { ...LEGS, cx: 9 }, 19);
  else legs(f, p, LEGS);
  // shirt front (1px), the tie on it, the jacket from the chest back
  const bottom = seated ? 18 : 17 + b;
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(6, 9, 11 + u);
  f.rect(5, 12 + u, 6, bottom - (12 + u) + 1);
  f.part('jacket', { shade: 'rb', light: 't' });
  f.rect(6, 12 + u, 5, bottom - (12 + u) + 2);
  f.part('tie', { flat: true, rim: false });
  f.px(5, 13 + u).px(5, 14 + u).px(5, 15 + u);
  head(f, p, HEAD, hy);
  if (!p.lookUp) {
    f.part('tired', { flat: true, rim: false, ol: false });
    f.px(4, hy + 7);
  }
  if (sigh && !p.lookUp) {
    f.part('skin', { shade: '', light: '' });
    f.px(4, hy + 6);
    f.part('eye', { flat: true, rim: false });
    f.px(3, hy + 6).px(4, hy + 7);
  }
  if (seated && (act === 'paper' || act === 'page' || act === 'sigh')) {
    // the newspaper held up before him, a little below the eyes (it stays up through a sigh)
    const turn = act === 'page' ? 1 : 0;
    f.part('paper', { shade: 'rb', light: 't' });
    f.rect(0, 10 + u, 4, 7);
    f.part('print', { flat: true, rim: false, ol: false });
    for (let y = 12; y <= 15; y += 2) f.hl(1, 2, y + u);
    if (turn) {
      // the page turning over: its corner up past the top
      f.part('paper', { flat: true });
      f.px(1, 9 + u).px(2, 9 + u).px(2, 8 + u);
    }
    f.part('jacket', { shade: 'b', light: '' });
    f.line(7, 13 + u, 5, 14 + u);
    f.part('skin', { shade: '', light: '' });
    f.px(4, 13 + u).px(4, 14 + u);
    return;
  }
  if (seated) {
    // the near arm down to the knee
    f.part('jacket', { shade: 'r', light: '' });
    f.line(8, 13 + u, 7, 16 + u);
    f.part('shirt', { flat: true });
    f.px(6, 17 + u);
    f.part('skin', { shade: '', light: '' });
    f.px(5, 17 + u).px(5, 18 + u);
    return;
  }
  // the near arm, the case in its hand
  sideArm(f, 8, 12 + u, 5, sw, SLEEVE);
  const hx = 8 - sw;
  briefcase(f, hx - 2, 17 + u + (sw ? 0 : 1));
}

function buDraw(f: Fig, p: Pose): void {
  f.offset(2, 0);
  if (p.view === 'left') side(f, p);
  else front(f, p);
}

const STAND_IDLE: IdleKey[] = breathingIdle();
// seated, facing the viewer: breathes, looks at his watch, sighs (≈6 s)
const SIT_FRONT: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 3),
  { act: 'watch' }, { act: 'watch' }, { act: 'watch' }, { act: 'watch', blink: true }, { act: 'watch' },
  { act: 'sigh' }, { act: 'sigh' }, { act: 'sigh' },
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 2),
  { breath: 0, blink: true },
];
// seated in profile: reads the newspaper, turns a page, a sigh now and then
const SIT_SIDE: IdleKey[] = [
  ...rep([{ act: 'paper', breath: 0 }, { act: 'paper', breath: 0 }, { act: 'paper', breath: 1 }, { act: 'paper', breath: 1 }], 3),
  { act: 'paper', blink: true },
  { act: 'page' }, { act: 'page' },
  ...rep([{ act: 'paper', breath: 0 }, { act: 'paper', breath: 0 }, { act: 'paper', breath: 1 }, { act: 'paper', breath: 1 }], 2),
  { act: 'sigh' }, { act: 'sigh' }, { act: 'sigh' },
  { act: 'paper' }, { act: 'paper', blink: true },
];

registerChar('npc_bu_body', () =>
  buildSprite({
    id: 'npc_bu_body',
    w: 20,
    h: 24,
    mats: BU,
    draw: buDraw,
    walkFrameMs: 170,
    idle: STAND_IDLE,
    idleFrameMs: 250,
    extras: {
      sit: { dirs: 'all' },
      watch: { dirs: ['down'] },
      sigh: { dirs: ['down', 'left', 'right'] },
      paper: { dirs: ['left', 'right'] },
    },
    poses: {
      sit: { down: SIT_FRONT, up: breathingIdle().map((k) => ({ ...k, act: 'sit' })), left: SIT_SIDE, right: SIT_SIDE },
    },
    shadow: 0,
    keep: ['#2F4A8A', '#5A3A2A'],
  }),
);
