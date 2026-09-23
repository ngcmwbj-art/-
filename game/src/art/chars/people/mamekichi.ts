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

// まめ吉 (npc_mamekichi): 30s, twisted white/navy headband, white tee, navy
// apron with white beans, black rubber boots, tofu scoop in hand.
// Idle: scoops tofu from the tank → a quick "まいど！" bow. Extras: bow.

const MAME: Mats = {
  ...common,
  skin: mat('#F2B894', { shade: '#D9977A', light: '#FFD2B0', dark: '#A8705A', rim: '#FFB080' }),
  hair: mat('#2B2024', { shade: '#1E161C', light: '#4A3A3E', rim: '#7A4A3A' }),
  band: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF' }),
  bandN: flat('#2F4A8A'),
  tee: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C', rim: '#FFDCB4' }),
  apron: mat('#2F4A8A', { shade: '#223668', light: '#4766A8', dark: '#162048', rim: '#7A6A9A' }),
  bean: flat('#E8E4D8'),
  boot: mat('#3A3F48', { shade: '#262A34', light: '#5A6270', dark: '#16181E', spec: '#8A94A4' }),
  handle: flat('#C8A06A'),
  mesh: flat('#C0C6CC'),
  tofu: mat('#FBF7EC', { shade: '#DCD6C6', light: '#FFFFFF' }),
  brow: flat('#2B2024'),
  mouth: flat('#8A3A3A'),
};

const MAME_HEAD: HeadT = {
  faceD: [3, 2, ['.########.', '##########', '##########', '##########', '.########.', '..######..']],
  hairD: [3, 0, ['..HHhhhh..', '.HKhhhhhd.', 'Hhhhhhhhhd']],
  eyesD: { x: 5, d: 5, y: 4, h: 2, brow: { dy: -1, mat: 'brow', w: 2 } },
  mouthD: [7, 6, 2],
  neckD: [6, 8, 4],
  hairU: [3, 0, ['..HHhhhh..', '.HKhhhhhd.', 'Hhhhhhhhhd', 'hhhhhhhhhd', 'hhhhhhhhdd', '.hdhhdhhd.']],
  napeU: [4, 5, ['########', '.######.']],
  faceL: [2, 2, ['.######...', '#######...', '########..', '#######...', '.######...', '..####....']],
  hairL: [3, 0, ['..######..', '.#########', '#########-', '.....#####', '......####', '.......##.']],
  eyeL: { x: 4, y: 4, h: 2, brow: { dy: -1, mat: 'brow', w: 2 } },
  earL: [8, 4],
  mouthL: [2, 6],
  neckL: [5, 8, 2],
};

function hachimaki(f: Fig, p: Pose, y: number) {
  const up = p.lookUp ? -1 : 0;
  f.part('band', { shade: 'b', light: '' });
  if (p.view === 'down') {
    f.hl(3, 12, y + 2 + up);
    f.part('bandN', { flat: true, rim: false });
    for (let x = 4; x <= 12; x += 3) f.px(x, y + 2 + up);
  } else if (p.view === 'up') {
    f.hl(3, 12, y + 2);
    f.part('bandN', { flat: true, rim: false });
    for (let x = 4; x <= 12; x += 3) f.px(x, y + 2);
    // knot + tails at the back
    f.part('band', { shade: 'r', light: '' });
    f.rect(7, y + 1, 2, 2).px(6, y + 3).px(9, y + 3).px(5, y + 4).px(10, y + 4);
  } else {
    f.hl(2, 12, y + 2 + up);
    f.part('bandN', { flat: true, rim: false });
    f.px(4, y + 2 + up).px(7, y + 2 + up).px(10, y + 2 + up);
    f.part('band', { shade: 'r', light: '' });
    f.px(13, y + 2 + up).px(13, y + 3 + up).px(14, y + 4 + up);
  }
}

const MAME_LEGS: LegSpec = { cx: 8, hip: 19, foot: 22, w: 2, gap: 2, mat: 'boot', shoe: 'boot', shoeLen: 3 };

function beans(f: Fig, pts: [number, number][]) {
  f.part('bean', { flat: true, rim: false });
  for (const [x, y] of pts) f.px(x, y);
}

function mameFront(f: Fig, p: Pose) {
  const act = p.act;
  const bow = act === 'bow' ? 1 + p.ph : 0;
  const u = upper(p) + (bow ? 1 : 0);
  legs(f, p, MAME_LEGS);
  f.part('tee', { shade: 'rb', light: 't' });
  f.hl(4, 11, 11 + u);
  f.rect(3, 12 + u, 10, 2);
  f.rect(4, 14 + u, 8, 18 + p.bob - (14 + u) + 1);
  f.part('apron', { shade: 'rb', light: 't' });
  f.rect(5, 13 + u, 6, 19 + p.bob - (13 + u) + 1);
  f.rect(4, 16 + p.bob, 8, 4);
  beans(f, [[6, 14 + u], [9, 15 + u], [5, 17 + p.bob], [8, 18 + p.bob], [10, 17 + p.bob]]);
  const seg: Seg[] = [{ mat: 'tee', n: 1 }, { mat: 'skin' }];
  if (act === 'scoop') {
    hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 16, segs: seg }, u, 'L');
    const hy = [16, 18, 15][p.ph];
    f.part('skin', { shade: '', light: '', shift: -1 });
    f.t(0).line(12, 14 + u, 12, hy + u - 1).t(null);
    f.part('handle', { flat: true, rim: false });
    f.vl(13, hy - 3 + u, hy + u);
    f.part('mesh', { flat: true, rim: false });
    f.rect(12, hy + 1 + u, 3, 1);
    if (p.ph === 2) {
      f.part('tofu', { shade: 'rb', light: 't' });
      f.rect(12, hy - 1 + u, 3, 2);
    }
  } else {
    hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 16, segs: seg }, u);
    f.part('handle', { flat: true, rim: false });
    f.vl(13, 13 + u, 16 + u);
    f.part('mesh', { shade: '', light: '' });
    f.rect(13, 17 + u, 2, 2);
  }
  const hy = 2 + u + (bow ? 1 : 0);
  if (bow) {
    // bowing: we see more of the top of the head, face tucked
    f.part('skin', { shade: 'rb', light: '' });
    f.rect(4, hy + 4, 8, 3).rect(5, hy + 7, 6, 1);
    f.part('hair', { shade: '', light: '' });
    f.rows(3, hy - 1, ['..HHhhhh..', '.HKhhhhhd.', 'Hhhhhhhhhd', 'hhhhhhhhhd'], HAIRMAP);
    hachimaki(f, { ...p, view: 'down' }, hy + 1);
    f.part('eye', { flat: true, rim: false });
    f.px(5, hy + 5).px(10, hy + 5);
    f.part('mouth', { flat: true, rim: false });
    f.rect(7, hy + 6 + (p.ph ? 1 : 0), 2, 1);
    return;
  }
  head(f, p, MAME_HEAD, hy);
  hachimaki(f, p, hy);
  if (p.mode === 'idle' || act === 'scoop') {
    f.part('mouth', { flat: true, rim: false });
    f.rect(7, hy + 6, 2, 1);
  }
}

function mameBack(f: Fig, p: Pose) {
  const u = upper(p);
  legs(f, p, MAME_LEGS);
  f.part('tee', { shade: 'rb', light: 't' });
  f.hl(4, 11, 11 + u);
  f.rect(3, 12 + u, 10, 2);
  f.rect(4, 14 + u, 8, 18 + p.bob - (14 + u) + 1);
  f.part('apron', { shade: 'b', light: '' });
  f.hl(4, 11, 16 + p.bob);
  f.px(5, 12 + u).px(10, 12 + u).px(6, 13 + u).px(9, 13 + u);
  f.rows(6, 15 + p.bob, ['#..#', '.##.']);
  hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 16, segs: [{ mat: 'tee', n: 1 }, { mat: 'skin' }] }, u);
  head(f, p, MAME_HEAD, 2 + u);
  hachimaki(f, p, 2 + u);
}

function mameSide(f: Fig, p: Pose) {
  const u = upper(p);
  const sw = sideSwing(p);
  sideArm(f, 9, 13 + u, 3, -sw, [{ mat: 'tee', n: 1 }, { mat: 'skin' }], -1);
  legs(f, p, MAME_LEGS);
  f.part('tee', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 18 + p.bob - (12 + u) + 1);
  f.part('apron', { shade: 'r', light: '' });
  f.rect(4, 13 + u, 2, 19 + p.bob - (13 + u) + 1);
  f.px(11, 16 + p.bob);
  beans(f, [[5, 15 + u], [4, 18 + p.bob]]);
  f.part('tee', { shade: 'rb', light: 'tl' });
  f.rect(7, 12 + u, 3, 2);
  sideArm(f, 8, 14 + u, 2, sw, [{ mat: 'skin' }]);
  f.part('handle', { flat: true, rim: false });
  f.line(8 - sw, 15 + u, 6 - sw, 19 + u);
  f.part('mesh', { flat: true, rim: false });
  f.rect(5 - sw, 19 + u, 2, 2);
  head(f, p, MAME_HEAD, 2 + u);
  hachimaki(f, p, 2 + u);
}

const MAME_IDLE: IdleKey[] = [
  { act: 'scoop', ph: 0 }, { act: 'scoop', ph: 1 }, { act: 'scoop', ph: 1 }, { act: 'scoop', ph: 2 }, { act: 'scoop', ph: 2 },
  { act: 'bow', ph: 0 }, { act: 'bow', ph: 1 }, { act: 'bow', ph: 0 },
  { breath: 0 }, { breath: 1, blink: true }, { breath: 1 },
];

registerChar('npc_mamekichi', () =>
  buildSprite({
    id: 'npc_mamekichi',
    mats: MAME,
    draw: (f, p) => (p.view === 'down' ? mameFront(f, p) : p.view === 'up' ? mameBack(f, p) : mameSide(f, p)),
    idle: { down: MAME_IDLE, left: breathingIdle(), right: breathingIdle(), up: breathingIdle() },
    extras: { scoop: { dirs: ['down'], p: { ph: 2 } }, surprised: { dirs: ['down'] } },
    anims: {
      bow: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 0 }, { act: '' }], ms: [90, 260, 90, 360] },
      scoop: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }], ms: [250, 300, 400] },
    },
  }),
);
