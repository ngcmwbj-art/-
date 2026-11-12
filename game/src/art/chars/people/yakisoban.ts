// ヤキソバン (npc_yakisoban, 62 10.3): たかし as the figure in front of his
// shop (npc_cow_statue) — the same shape, but a man: the heap of yakisoba on
// his head (the noodles, 青のり, a tuft of 紅しょうが on top), the green
// cloth cape of his boyhood, the moustache ソワカ painted on (brushed black,
// one side 1px longer), a white shirt with the red たすき crossed over it,
// navy trousers, and in his right hand the real iron spatula (steel, a 1px
// glint; the statue's was painted). たかし's face under it all: the thick
// brows, the serious eyes. Colours follow the battle's back view
// (battle/art/yakisoban.ts). Nothing threatening; the spatula is a cook's.
//
// Extras: kosogeru (the spatula scrapes forward, 3 frames; black flakes),
// teppan (both spatulas drum on a griddle, 2), nanori (the spatula held
// high: the statue's pose, at last explained), serve (a plate held out),
// hera_hide (the spatula up in front of his face: shy, 60 S23).

import { flat, mat, type Fig, type Mats } from '../fig';
import { HAIR_BLACK, SKIN_TAN } from '../mats';
import { legs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { hangArms, head, sideArm, sideSwing, upper, type HeadT } from '../kit';

const M: Mats = {
  eye: flat('#2A1C28'),
  shine: flat('#FFF6D8'),
  blush: flat('#E89478'),
  skin: SKIN_TAN,
  hair: HAIR_BLACK,
  brow: flat('#2B1E1A'),
  nose: flat('#C4876A'),
  mouth: flat('#8A4A3A'),
  noodle: mat('#D8B060', { shade: '#B8904A', light: '#F4DC98', dark: '#8A5A2A' }),
  sauce: flat('#8A5A2A'),
  nori: flat('#3F7A3A'),
  beni: flat('#E0567A'),
  cape: mat('#3F8A4A', { shade: '#2A5A34', light: '#5AA45E', dark: '#1E4228' }),
  shirt: mat('#EDEAE0', { shade: '#C8C2B4', light: '#FFFFFF', dark: '#9A9488' }),
  tasuki: mat('#C8402E', { shade: '#A8302A', light: '#D86A5A', dark: '#7A1A22' }),
  pants: mat('#2F3A5A', { shade: '#1E2840', light: '#4A5878', dark: '#141A2A' }),
  shoe: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
  // the moustache: a brush's black, a little dry at the ends
  stache: flat('#3A2B24'),
  stick: flat('#8A5A3A'),
  blade: mat('#8E95A6', { shade: '#4A4A55', light: '#E8ECF0' }),
  glint: flat('#FFFFFF'),
  flake: flat('#0B0B14'),
  plate: flat('#F4F1E8'),
};

const HEAD: HeadT = {
  faceD: [3, 1, ['.########.', '##########', '##########', '##########', '##########', '.########.', '..######..']],
  hairD: [3, 1, ['#........#', 'd........d']],
  eyesD: { x: 5, d: 5, y: 3, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  mouthD: [7, 6, 2],
  neckD: [6, 8, 4],
  hairU: [3, 0, ['hhhhhhhhhd', 'hhhhhhhhhd', 'hhhhhhhhdd', '.hhhhhhdd.']],
  napeU: [4, 4, ['########', '.######.', '..####..']],
  faceL: [2, 1, ['.#######..', '########..', '#########.', '########..', '########..', '.######...', '..####....']],
  hairL: [7, 1, ['#####', '.####', '..###', '...#.']],
  eyeL: { x: 4, y: 3, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  earL: [8, 3],
  mouthL: [3, 6],
  neckL: [5, 8, 3],
};

/** The heap of yakisoba on his head (the statue's shape): noodles lit from above, sauce, 青のり, 紅しょうが. */
function heap(f: Fig, y: number, view: 'down' | 'up' | 'left') {
  f.part('noodle', { shade: 'rb', light: 't' });
  f.rows(2, y, view === 'left'
    ? ['....####....', '..########..', '.##########.', '############', '.##########.']
    : view === 'up'
      ? ['....####....', '..########..', '.##########.', '############', '############', '############', '.##########.', '..########..']
      : ['....####....', '..########..', '.##########.', '############', '############']);
  // the strands: a few shaded loops
  f.part('noodle', { flat: true });
  f.t(-1).px(4, y + 2).px(7, y + 3).px(10, y + 2).px(5, y + 4).px(12, y + 3).t(1).px(6, y + 1).px(9, y + 2).t(null);
  f.part('sauce', { flat: true, rim: false });
  f.px(3, y + 4).px(8, y + 4).px(11, y + 4);
  f.part('nori', { flat: true, rim: false });
  f.px(5, y + 2).px(9, y + 1).px(11, y + 3).px(7, y + 4);
  if (view !== 'up') {
    f.part('beni', { flat: true, rim: false });
    f.px(7, y - 1).px(8, y - 1).px(8, y);
  }
}

/** The painted moustache (one side 1px longer). */
function stache(f: Fig, hy: number, view: 'down' | 'left') {
  f.part('stache', { flat: true, rim: false });
  if (view === 'down') f.hl(4, 7, hy + 5).hl(9, 13, hy + 5).px(4, hy + 6).px(13, hy + 6);
  else f.hl(2, 5, hy + 5).px(1, hy + 6);
}

/** The cape knotted under the chin (front: its two corners). */
function capeKnot(f: Fig, u: number) {
  f.part('cape', { shade: 'rb', light: 't' });
  f.rect(6, 11 + u, 4, 2);
  f.part('cape', { flat: true });
  f.t(-1).px(7, 12 + u).px(8, 12 + u).t(null);
}

/** The red たすき crossed over the white shirt. */
function tasuki(f: Fig, u: number, b: number, back: boolean) {
  f.part('tasuki', { shade: 'b', light: 't' });
  f.line(2, 13 + u, 13, 19 + b).line(13, 13 + u, 2, 19 + b);
  if (back) f.rect(7, 15 + u, 2, 2);
}

/** The real spatula in a hand at (x, y): blade `up` or hanging down. */
function spatula(f: Fig, x: number, y: number, up: boolean) {
  if (up) {
    f.part('stick', { flat: true, rim: false });
    f.vl(x + 1, y + 4, y + 7);
    f.part('blade', { shade: 'r', light: 't' });
    f.rect(x, y, 4, 4);
    f.part('glint', { flat: true, rim: false });
    f.px(x, y);
  } else {
    f.part('stick', { flat: true, rim: false });
    f.vl(x + 1, y, y + 2);
    f.part('blade', { shade: 'r', light: 't' });
    f.rect(x, y + 3, 4, 3);
    f.part('glint', { flat: true, rim: false });
    f.px(x + 3, y + 3);
  }
}

const LEGS: LegSpec = { cx: 8, hip: 19, foot: 22, w: 3, gap: 2, mat: 'pants', shoe: 'shoe', shoeLen: 4 };
const ARM: Seg[] = [{ mat: 'shirt', n: 3 }, { mat: 'skin' }];

function front(f: Fig, p: Pose) {
  f.offset(2, 0);
  const u = upper(p);
  const b = p.bob;
  const act = p.act;
  const sway = p.mode === 'walk' ? [0, 1, 0, -1][p.step % 4] : p.tick % 6 < 3 ? 0 : 1;
  legs(f, p, LEGS);
  // the cape's two edges showing beyond the shoulders, down to the knees (1px sway)
  f.part('cape', { shade: 'rb', light: 't' });
  f.rect(0, 13 + u, 2, 8 + b - u + Math.max(0, sway)).rect(14, 13 + u, 2, 8 + b - u + Math.max(0, -sway));
  // the shirt, the たすき
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(2, 13, 12 + u);
  f.rect(1, 13 + u, 14, 19 + b - (13 + u));
  tasuki(f, u, b, false);
  if (act === 'nanori') {
    // the statue's pose: the right arm (viewer-left) straight up, the spatula high; the left on the hip
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(0, 6 + u, 2, 8);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(0, 4 + u, 2, 2);
    spatula(f, -1, -2 + u, true);
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(14, 13 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(13, 16 + u, 2, 2);
  } else if (act === 'kosogeru') {
    // both hands forward on the spatula's grip, scraping down and out (ph 0..2)
    const k = p.ph;
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(5, 16 + u + k, 6, 2);
    spatula(f, 6, 18 + u + k, false);
    if (k === 2) {
      f.part('flake', { flat: true, rim: false });
      f.px(4, 25).px(12, 24).px(10, 26);
    }
  } else if (act === 'teppan') {
    // a spatula in each hand, drumming (ph 0 / 1: left up, right down)
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(1, 16 + u, 2, 2).rect(13, 16 + u, 2, 2);
    spatula(f, 0, (p.ph ? 13 : 17) + u, false);
    spatula(f, 12, (p.ph ? 17 : 13) + u, false);
  } else if (act === 'serve') {
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(4, 16 + u, 8, 2);
    f.part('plate', { flat: true });
    f.hl(3, 12, 15 + u);
    f.part('noodle', { flat: true });
    f.hl(5, 10, 14 + u).hl(6, 9, 13 + u);
  } else if (act === 'hera_hide') {
    hangArms(f, p, { lx: 0, rx: 15, sy: 13, hy: 18, segs: ARM }, u, 'L');
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(12, 12 + u, 2, 2);
  } else {
    hangArms(f, p, { lx: 0, rx: 15, sy: 13, hy: 18, segs: ARM }, u);
    // the spatula hanging from his right hand (viewer-left)
    spatula(f, -2, 18 + u + (p.mode === 'walk' ? [0, 1, 0, -1][p.step % 4] : 0), false);
  }
  capeKnot(f, u);
  const hy = 4 + u;
  head(f, p, HEAD, hy);
  f.part('nose', { flat: true, rim: false });
  if (!p.lookUp) f.px(8, hy + 4);
  stache(f, hy, 'down');
  heap(f, u - 1, 'down');
  if (act === 'hera_hide') {
    // the spatula's blade up over his face (he is shy of the name he just said)
    spatula(f, 6, 3 + u, true);
  }
}

function back(f: Fig, p: Pose) {
  f.offset(2, 0);
  const u = upper(p);
  const b = p.bob;
  const sway = p.mode === 'walk' ? [0, 1, 0, -1][p.step % 4] : 0;
  legs(f, p, LEGS);
  hangArms(f, p, { lx: 0, rx: 15, sy: 13, hy: 18, segs: ARM }, u);
  // the green cape over the whole back, a fold down its middle, its hem swinging
  f.part('cape', { shade: 'rb', light: 't' });
  f.hl(2, 13, 11 + u);
  f.rect(1, 12 + u, 14, 21 + b - (12 + u));
  f.hl(1 + Math.max(0, sway), 14 + Math.min(0, sway), 21 + b);
  f.part('cape', { flat: true });
  f.t(-1).vl(8, 13 + u, 20 + b).vl(4, 16 + u, 20 + b).vl(11, 16 + u, 20 + b).t(null);
  head(f, p, HEAD, 4 + u);
  heap(f, u - 1, 'up');
}

function side(f: Fig, p: Pose) {
  f.offset(2, 0);
  const u = upper(p);
  const b = p.bob;
  const sw = sideSwing(p);
  const act = p.act;
  const sway = p.mode === 'walk' ? [0, 1, 0, 1][p.step % 4] : 0;
  // the cape behind him (east, facing west), trailing as he walks
  f.part('cape', { shade: 'rb', light: 't' });
  f.rect(10, 12 + u, 3 + sway, 21 + b - (12 + u));
  f.px(13 + sway, 20 + b);
  sideArm(f, 9, 13 + u, 5, -sw, [{ mat: 'shirt', n: 3 }, { mat: 'skin' }], -1, 2);
  legs(f, p, { ...LEGS, cx: 8 });
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 10, 12 + u);
  f.rect(4, 13 + u, 7, 19 + b - (13 + u));
  f.part('tasuki', { shade: 'b', light: 't' });
  f.line(4, 13 + u, 10, 18 + b);
  if (act === 'kosogeru') {
    const k = p.ph;
    f.part('skin', { shade: 'b', light: 't' });
    f.rect(2, 16 + u + k, 4, 2);
    spatula(f, -1, 17 + u + k, false);
    if (k === 2) {
      f.part('flake', { flat: true, rim: false });
      f.px(0, 25).px(2, 24);
    }
  } else if (act === 'nanori') {
    f.part('skin', { shade: 'b', light: 't' });
    f.rect(6, 5 + u, 2, 7);
    spatula(f, 5, -1 + u, true);
  } else {
    sideArm(f, 7, 13 + u, 3, sw, [{ mat: 'shirt', n: 2 }, { mat: 'skin' }], 0, 2);
    spatula(f, 5 + Math.round(sw / 2), 19 + u, false);
  }
  head(f, p, HEAD, 4 + u);
  stache(f, 4 + u, 'left');
  heap(f, u - 1, 'left');
}

const IDLE: IdleKey[] = [...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 3), { breath: 0 }, { breath: 0, blink: true }];

registerChar('npc_yakisoban', () =>
  buildSprite({
    id: 'npc_yakisoban',
    w: 20,
    mats: M,
    draw: (f, p) => (p.view === 'down' ? front(f, p) : p.view === 'up' ? back(f, p) : side(f, p)),
    idle: { down: IDLE, left: IDLE, right: IDLE, up: breathingIdle() },
    idleFrameMs: 260,
    extras: {
      kosogeru: { dirs: ['down', 'left', 'right'], p: { ph: 2 } },
      teppan: { dirs: ['down'] },
      nanori: { dirs: ['down', 'left', 'right'] },
      serve: { dirs: ['down'] },
      hera_hide: { dirs: ['down'] },
    },
    anims: {
      kosogeru: { frames: [{ act: 'kosogeru', ph: 0 }, { act: 'kosogeru', ph: 1 }, { act: 'kosogeru', ph: 2 }], ms: [160, 120, 260], loop: false },
      teppan: { frames: [{ act: 'teppan', ph: 0 }, { act: 'teppan', ph: 1 }], ms: 140 },
    },
    shadow: 12,
    keep: ['#3F8A4A', '#C8402E', '#3A2B24', '#E0567A'],
  }),
);
