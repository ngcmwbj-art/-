// 丸山 (npc_maruyama): big man in his 50s. White cook hat, thick brows, tanned
// skin, white coat with rolled sleeves, red apron, white towel round the neck.
// Idle: arms folded → every 4s peeks at the fryer (to his right).
// Extras: look_up, fry (ending), peek.

import { flat, mat, type Fig, type Mats } from '../fig';
import { legs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { hangArms, head, sideArm, sideSwing, upper, type HeadT } from '../kit';

const M: Mats = {
  eye: flat('#2A1C28'),
  shine: flat('#FFF6D8'),
  blush: flat('#E89478'),
  skin: mat('#E0A882', { shade: '#C4876A', light: '#F2BE98', dark: '#9A5E48', rim: '#FFB080' }),
  hair: mat('#2B1E1A', { shade: '#1E1418', light: '#4A3430', dark: '#140E12', rim: '#7A4430' }),
  hat: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#A8A096', rim: '#FFE0B8' }),
  coat: mat('#EDEAE0', { shade: '#C8C2B4', light: '#FFFFFF', dark: '#9A9488', rim: '#FFD8B0' }),
  apron: mat('#E84E3C', { shade: '#B8302A', light: '#FF7A5A', dark: '#7A1A22', rim: '#FF9A6A' }),
  pants: mat('#3A3F48', { shade: '#2A2C38', light: '#555C68', dark: '#1C1D28' }),
  boot: mat('#E8E4D8', { shade: '#B8B2A6', light: '#FFFFFF', dark: '#8A857C' }),
  brow: flat('#2B1E1A'),
  nose: flat('#C4876A'),
  mouth: flat('#8A4A3A'),
  stick: flat('#D9A441'),
  oil: flat('#F6D98A'),
};

const HEAD: HeadT = {
  faceD: [3, 1, ['.########.', '##########', '##########', '##########', '##########', '.########.', '..######..']],
  hairD: [3, 1, ['#........#', 'd........d']],
  eyesD: { x: 5, d: 5, y: 3, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  mouthD: [7, 5, 2],
  neckD: [6, 8, 4],
  hairU: [3, 0, ['hhhhhhhhhd', 'hhhhhhhhhd', 'hhhhhhhhdd', '.hhhhhhdd.']],
  napeU: [4, 4, ['########', '.######.', '..####..']],
  faceL: [2, 1, ['.#######..', '########..', '#########.', '########..', '########..', '.######...', '..####....']],
  hairL: [7, 1, ['#####', '.####', '..###', '...#.']],
  eyeL: { x: 4, y: 3, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  earL: [8, 3],
  mouthL: [3, 5],
  neckL: [5, 8, 3],
};

/** Tall toque: a puffed crown over a pleated band. */
function cookHat(f: Fig, y: number, view: string) {
  f.part('hat', { shade: 'rb', light: 't' });
  f.rows(3, y, view === 'left'
    ? ['..#######.', '.#########', '##########', '..######..', '..######..']
    : ['.########.', '##########', '##########', '..######..', '..######..']);
  f.part('hat', { flat: true });
  // puff creases + pleated band
  f.t(-1).px(6, y + 1).px(9, y + 1).px(5, y + 2).px(8, y + 2).px(11, y + 2);
  f.t(-1).px(6, y + 3).px(8, y + 3).px(10, y + 3).t(-2).hl(5, 10, y + 4).t(null);
}

const LEGS: LegSpec = { cx: 8, hip: 19, foot: 22, w: 3, gap: 2, mat: 'pants', low: { mat: 'boot', h: 1 }, shoe: 'boot', shoeLen: 4 };
const ARM: Seg[] = [{ mat: 'coat', n: 2 }, { mat: 'skin' }];

function towel(f: Fig, u: number, view: string) {
  f.part('hat', { shade: 'b', light: '' });
  if (view === 'down') f.hl(5, 10, 12 + u).px(5, 13 + u).px(10, 13 + u).px(10, 14 + u);
  else if (view === 'up') f.hl(4, 11, 12 + u);
  else f.hl(5, 9, 12 + u).px(5, 13 + u);
}

function front(f: Fig, p: Pose) {
  f.offset(2, 0);
  const u = upper(p);
  const act = p.act;
  const b = p.bob;
  legs(f, p, LEGS);
  // coat: 14px shoulders (the biggest frame in town)
  f.part('coat', { shade: 'rb', light: 't' });
  f.hl(2, 13, 12 + u);
  f.rect(1, 13 + u, 14, 19 + b - (13 + u));
  f.part('apron', { shade: 'rb', light: 't' });
  f.rect(4, 14 + u, 8, 20 + b - (14 + u));
  f.rect(3, 17 + b, 10, 3);
  f.part('apron', { flat: true });
  f.t(-1).vl(8, 17 + b, 19 + b).px(5, 19 + b).t(null);
  const folded = (act === '' || act === 'peek') && p.mode !== 'walk';
  if (folded) {
    // arms folded: rolled-up sleeves, thick forearms stacked across the chest
    f.part('coat', { shade: 'rb', light: 't' });
    f.rect(0, 13 + u, 2, 3).rect(14, 13 + u, 2, 3);
    f.part('coat', { flat: true });
    f.t(1).px(0, 15 + u).t(-1).px(15, 15 + u).t(null);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(1, 15 + u, 13, 2);
    f.part('skin', { shade: 'b', light: '', shift: -1 });
    f.rect(3, 16 + u, 11, 1).px(14, 15 + u).px(14, 16 + u);
  } else if (act === 'fry') {
    f.part('coat', { shade: 'rb', light: 't' });
    f.rect(0, 13 + u, 2, 3).rect(14, 13 + u, 2, 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(2, 16 + u, 3, 2).rect(11, 16 + u, 3, 2);
    f.part('stick', { flat: true, rim: false });
    f.line(5, 17 + u, 7, 21).line(10, 17 + u, 8, 21);
    f.part('oil', { flat: true, rim: false });
    f.px(7, 22).px(8, 21);
  } else hangArms(f, p, { lx: 0, rx: 15, sy: 13, hy: 18, segs: ARM }, u);
  towel(f, u, 'down');
  const hy = 4 + u;
  head(f, p, HEAD, hy);
  // nose shadow
  f.part('nose', { flat: true, rim: false });
  if (!p.lookUp) f.px(8, hy + 4);
  if (act === 'peek') {
    f.part('skin', { shade: '', light: '' });
    f.px(5, hy + 3).px(10, hy + 3);
    f.part('eye', { flat: true, rim: false });
    f.px(6, hy + 3).px(11, hy + 3);
  }
  cookHat(f, u + (p.lookUp ? -1 : 0), 'down');
}

function back(f: Fig, p: Pose) {
  f.offset(2, 0);
  const u = upper(p);
  const b = p.bob;
  legs(f, p, LEGS);
  f.part('coat', { shade: 'rb', light: 't' });
  f.hl(2, 13, 12 + u);
  f.rect(1, 13 + u, 14, 19 + b - (13 + u));
  f.part('apron', { shade: 'b', light: '' });
  f.hl(1, 14, 17 + b);
  f.rows(6, 16 + b, ['#..#', '.##.', '#..#']);
  f.part('apron', { flat: true });
  f.t(-1).vl(8, 13 + u, 16 + b).t(null);
  hangArms(f, p, { lx: 0, rx: 15, sy: 13, hy: 18, segs: ARM }, u);
  towel(f, u, 'up');
  head(f, p, HEAD, 4 + u);
  cookHat(f, u, 'up');
}

function side(f: Fig, p: Pose) {
  f.offset(2, 0);
  const u = upper(p);
  const b = p.bob;
  const sw = sideSwing(p);
  const act = p.act;
  const folded = (act === '' || act === 'peek') && p.mode !== 'walk';
  sideArm(f, 9, 13 + u, 5, -sw, [{ mat: 'coat', n: 3 }, { mat: 'skin' }], -1, 2);
  legs(f, p, { ...LEGS, cx: 9 });
  // big body, belly out front
  f.part('coat', { shade: 'rb', light: 't' });
  f.hl(5, 11, 12 + u);
  f.rect(4, 13 + u, 8, 19 + b - (13 + u));
  f.px(3, 16 + u).px(3, 17 + u);
  f.part('apron', { shade: 'rb', light: '' });
  f.vl(3, 15 + u, 19 + b).vl(4, 14 + u, 19 + b).rect(3, 17 + b, 2, 3);
  f.part('apron', { flat: true });
  f.px(12, 17 + b).px(13, 18 + b);
  f.part('coat', { shade: 'rb', light: 'tl' });
  f.rect(7, 13 + u, 3, 3);
  if (folded) {
    f.part('skin', { shade: 'b', light: 't' });
    f.rect(3, 15 + u, 6, 2);
  } else if (act === 'fry') {
    f.part('skin', { shade: 'b', light: 't' });
    f.rect(3, 16 + u, 5, 2);
    f.part('stick', { flat: true, rim: false });
    f.line(2, 16 + u, 0, 21);
  } else sideArm(f, 8, 16 + u, 2, sw, [{ mat: 'skin' }], 0, 2);
  towel(f, u, 'left');
  head(f, p, HEAD, 4 + u);
  cookHat(f, u + (p.lookUp ? -1 : 0), 'left');
}

const IDLE: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 3),
  { breath: 0 }, { breath: 0, blink: true }, { act: 'peek' }, { act: 'peek' },
];

registerChar('npc_maruyama', () =>
  buildSprite({
    id: 'npc_maruyama',
    w: 20,
    mats: M,
    draw: (f, p) => (p.view === 'down' ? front(f, p) : p.view === 'up' ? back(f, p) : side(f, p)),
    idle: { down: IDLE, left: IDLE, right: IDLE, up: breathingIdle() },
    extras: { fry: { dirs: ['down', 'left', 'right'] }, peek: { dirs: ['down'] }, surprised: { dirs: ['down'] } },
    shadow: 12,
  }),
);
