// Town NPCs (2): 中学生, 郵便屋さん, ガチャの男の子, 砂場の女の子.

import { flat, mat, type Fig, type Mats } from '../fig';
import { HAIR_BLACK, SKIN_LIGHT, SKIN_MID, SKIN_TAN } from '../mats';
import { legs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { hangArms, hatLift, head, sideArm, sideSwing, upper, type HeadT } from '../kit';

const base = {
  eye: flat('#2A1C28'),
  shine: flat('#FFF6D8'),
  blush: flat('#F6A48E'),
  mouth: flat('#B86A5A'),
};
const skinLight = mat('#FFD9B8', { shade: '#EBB08E', light: '#FFEBD8', dark: '#C98A6A', rim: '#FFC08E' });
const skinTan = SKIN_MID;
const blackHair = HAIR_BLACK;

// =============================================================================
// 中学生 (npc_chugaku): black tracksuit with two white chest lines, a white
// bandage on his left hand, long bangs hiding his right eye, white sneakers,
// a stick in his right hand. Idle: clutches his left hand, hunched (2s) →
// straightens up with the stick at the ready (2s).

const CHU: Mats = {
  ...base,
  skin: skinLight,
  hair: blackHair,
  jersey: mat('#3A3F48', { shade: '#282C36', light: '#555C68', dark: '#16181E', spec: '#7A8290', rim: '#9A6A5A' }),
  line: flat('#F4F1E8'),
  bandage: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF' }),
  sneaker: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF', dark: '#8E887E' }),
  stick: mat('#A8784A', { shade: '#7A5430', light: '#C8A06A' }),
};

const CHU_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, [
    '..HHhhhh..',
    '.HKHhhhhd.',
    'HHhhhhhhdd',
    'HHHhhhhhdd',
    'hhhhhd..dd',
    'hhhhd....d',
    'hd.d.....d',
  ]],
  eyesD: { x: 9, d: 0, y: 5, h: 2, brow: { dy: -1, mat: 'hair', w: 1 } },
  mouthD: [7, 7, 2],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['..HHhhhh..', '.HKHhhhhd.', 'HHhhhhhhdd', 'Hhhhhhhhdd', 'hhhhhhhhdd', 'hhhhhhhhdd', '.hdhhdhhd.']],
  napeU: [5, 7, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [2, 0, ['...######..', '..########d', '.##########', '####d######', '.#hh.######', '...h..#####', '.......###.']],
  eyeL: { x: 4, y: 5, h: 2 },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 2],
};

const CHU_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'jersey', shoe: 'sneaker', shoeLen: 3 };

function chuDraw(f: Fig, p: Pose) {
  const act = p.act;
  const hunch = act === 'clutch' ? 1 : 0;
  const u = upper(p) + hunch;
  const b = p.bob;
  const hy = 2 + u;
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, CHU_LEGS);
    f.part('jersey', { shade: 'rb', light: 't' });
    f.hl(4, 11, 11 + u);
    f.rect(3, 12 + u, 10, 17 + b - (12 + u));
    if (p.view === 'down') {
      // zipper + two white lines on the chest
      f.part('jersey', { flat: true });
      f.t(1).vl(8, 11 + u, 16 + b).t(null);
      f.part('line', { flat: true, rim: false });
      f.vl(5, 12 + u, 15 + u).vl(10, 12 + u, 15 + u);
    } else {
      f.part('line', { flat: true, rim: false });
      f.vl(3, 12 + u, 16 + b).vl(12, 12 + u, 16 + b);
    }
    const seg: Seg[] = [{ mat: 'jersey', n: 3 }, { mat: 'skin' }];
    const band: Seg[] = [{ mat: 'jersey', n: 3 }, { mat: 'bandage' }];
    if (p.view === 'down') {
      if (act === 'clutch') {
        // right hand grips the bandaged left hand at the chest
        f.part('jersey', { shade: 'rb', light: 't' });
        f.rect(2, 12 + u, 2, 3).rect(12, 12 + u, 2, 3);
        f.part('bandage', { shade: 'rb', light: 't' });
        f.rect(8, 14 + u, 2, 2);
        f.part('skin', { shade: '', light: '' });
        f.rect(6, 14 + u, 2, 2);
      } else if (act === 'ready') {
        hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: band }, u, 'R');
        f.part('jersey', { shade: 'rb', light: 't' });
        f.rect(2, 12 + u, 2, 3);
        f.part('skin', { shade: '', light: '' });
        f.px(3, 15 + u);
        f.part('stick', { shade: 'r', light: '' });
        f.line(2, 16 + u, 5, 8 + u);
      } else {
        hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u, 'L');
        hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: band }, u, 'R');
        f.part('stick', { shade: 'r', light: '' });
        f.line(2, 17 + u, 1, 21 + u);
      }
    } else {
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: band }, u, 'L');
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u, 'R');
      f.part('stick', { shade: 'r', light: '' });
      f.line(13, 17 + u, 14, 21 + u);
    }
    head(f, act === 'clutch' ? { ...p, act: 'hurt' } : p, CHU_HEAD, hy);
    return;
  }
  const sw = sideSwing(p);
  sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'jersey', n: 3 }, { mat: 'skin' }], -1);
  legs(f, p, CHU_LEGS);
  f.part('jersey', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 17 + b - (12 + u));
  f.part('line', { flat: true, rim: false });
  f.vl(9, 12 + u, 15 + u);
  f.part('jersey', { shade: 'rb', light: 'tl' });
  f.rect(7, 12 + u, 3, 3);
  if (act === 'clutch') {
    f.part('bandage', { shade: 'rb', light: 't' });
    f.rect(5, 14 + u, 2, 2);
  } else {
    sideArm(f, 8, 15 + u, 1, sw, [{ mat: 'bandage' }]);
    f.part('stick', { shade: 'r', light: '' });
    if (act === 'ready') f.line(6, 15 + u, 2, 9 + u);
  }
  head(f, p, CHU_HEAD, hy);
}

const CHU_IDLE: IdleKey[] = [
  ...rep([{ act: 'clutch', breath: 0 }, { act: 'clutch', breath: 1 }], 4),
  ...rep([{ act: 'ready', breath: 0 }, { act: 'ready', breath: 0 }, { act: 'ready', breath: 1 }, { act: 'ready', breath: 1 }], 2),
];

registerChar('npc_chugaku', () =>
  buildSprite({
    id: 'npc_chugaku',
    mats: CHU,
    draw: chuDraw,
    idle: { down: CHU_IDLE, left: CHU_IDLE, right: CHU_IDLE, up: breathingIdle() },
    extras: { clutch: { dirs: ['down'] }, ready: { dirs: ['down', 'left', 'right'] }, surprised: { dirs: ['down'] } },
  }),
);

// =============================================================================
// 郵便屋さん (npc_postman): white helmet, pale-blue short-sleeved shirt, navy
// trousers, a shoulder mail bag with envelopes poking out. Idle: holds a
// letter up to the setting sun and tilts his head at the address.

const POST: Mats = {
  ...base,
  skin: skinTan,
  hair: blackHair,
  helmet: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C', spec: '#FFFFFF', rim: '#FFE0B8' }),
  strap: flat('#3A3F48'),
  shirt: mat('#7FD1E8', { shade: '#58A8C8', light: '#AEE6F4', dark: '#3A7A9A', rim: '#D8D0A8' }),
  pants: mat('#2F4A8A', { shade: '#223668', light: '#4766A8', dark: '#162048', rim: '#8A7AA0' }),
  shoe: mat('#2A2630', { shade: '#1A1820', light: '#4A4652' }),
  bag: mat('#8A5A3A', { shade: '#664228', light: '#AE7A52', dark: '#3E2616' }),
  letter: mat('#F4F1E8', { shade: '#D8CCB4', light: '#FFFFFF' }),
  lit: flat('#FFF6D8'),
  stampR: flat('#E23B2E'),
  brow: flat('#2E2226'),
};

const POST_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 3, ['h........d', 'd........d']],
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

function helmet(f: Fig, view: string, y: number, lu = false) {
  f.part('helmet', { shade: 'rb', light: 'tl' });
  if (view === 'left') f.rows(2, y, ['...######..', '..########.', '.##########', '###########', '.#.....####']);
  else f.rows(3, y, ['..######..', '.########.', '##########', '##########', '#........#']);
  f.part('helmet', { flat: true, rim: false });
  f.t(2).px(view === 'left' ? 5 : 5, y + 1).t(null);
  f.part('strap', { flat: true, rim: false });
  if (view === 'down') f.px(4, y + 5).px(11, y + 5).px(5, y + 8).px(10, y + 8);
  else if (view === 'left') f.px(8, y + 5).px(7, y + 7);
  if (lu && view === 'down') {
    // looking up: the rim of the helmet shows its shaded underside
    f.part('helmet', { flat: true, rim: false });
    f.t(-2).hl(4, 11, y + 4).t(null);
  }
}

const POST_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', shoe: 'shoe', shoeLen: 3 };

function postDraw(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const act = p.act;
  const hy = 2 + u;
  const peer = act === 'peer';
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, POST_LEGS);
    f.part('shirt', { shade: 'rb', light: 't' });
    f.hl(4, 11, 11 + u);
    f.rect(3, 12 + u, 10, 2);
    f.rect(4, 14 + u, 8, 17 + b - (14 + u));
    f.part('pants', { shade: 'b', light: '' });
    f.hl(4, 11, 16 + b);
    if (p.view === 'down') {
      f.part('shirt', { flat: true });
      f.t(-1).vl(8, 12 + u, 15 + b).t(null);
      // strap across the chest to the bag on his left hip (viewer right)
      f.part('bag', { shade: '', light: '' });
      f.t(-1).px(5, 11 + u).px(6, 12 + u).px(7, 13 + u).px(8, 14 + u).px(9, 15 + u).t(null);
      f.part('bag', { shade: 'rb', light: 't' });
      f.rect(10, 15 + u, 4, 4);
      f.part('letter', { shade: 'r', light: '' });
      f.px(11, 14 + u).px(12, 14 + u).px(12, 13 + u);
      f.part('stampR', { flat: true, rim: false });
      f.px(11, 14 + u);
    } else {
      f.part('bag', { shade: '', light: '' });
      f.t(-1).px(10, 11 + u).px(9, 12 + u).px(8, 13 + u).px(7, 14 + u).px(6, 15 + u).t(null);
      f.part('bag', { shade: 'rb', light: 't' });
      f.rect(2, 15 + u, 4, 4);
    }
    const seg: Seg[] = [{ mat: 'shirt', n: 2 }, { mat: 'skin' }];
    if (peer && p.view === 'down') {
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u, 'R');
      f.part('shirt', { shade: 'rb', light: 't' });
      f.rect(2, 12 + u, 2, 2);
      f.part('skin', { shade: '', light: '' });
      f.t(0).line(2, 14 + u, 2, 11 + u).t(null);
      f.part('letter', { flat: true, rim: false });
      f.rect(1, 8 + u, 3, 2);
      f.part('lit', { flat: true, rim: false });
      f.px(1, 8 + u);
    } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u);
    // head tilts toward the letter
    head(f, p, POST_HEAD, hy);
    if (peer && p.view === 'down') {
      f.part('skin', { shade: '', light: '' });
      f.px(9, hy + 5);
      f.part('eye', { flat: true, rim: false });
      f.px(5, hy + 5).px(8, hy + 5);
    }
    helmet(f, p.view, hy - 1 + hatLift(p), p.lookUp);
    return;
  }
  const sw = sideSwing(p);
  sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'shirt', n: 2 }, { mat: 'skin' }], -1);
  legs(f, p, POST_LEGS);
  f.part('bag', { shade: 'rb', light: 't' });
  f.rect(9, 14 + u, 4, 4);
  f.part('letter', { flat: true, rim: false });
  f.px(10, 13 + u).px(11, 13 + u);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 17 + b - (12 + u));
  f.part('pants', { shade: 'b', light: '' });
  f.hl(5, 10, 16 + b);
  f.part('bag', { shade: '', light: '' });
  f.t(-1).line(6, 11 + u, 9, 14 + u).t(null);
  f.part('shirt', { shade: 'rb', light: 'tl' });
  f.rect(7, 12 + u, 3, 2);
  if (peer) {
    f.part('skin', { shade: '', light: '' });
    f.t(0).line(7, 14 + u, 4, 10 + u).t(null);
    f.part('letter', { flat: true, rim: false });
    f.rect(2, 8 + u, 3, 2);
    f.part('lit', { flat: true, rim: false });
    f.px(2, 8 + u);
  } else sideArm(f, 8, 14 + u, 2, sw, [{ mat: 'skin' }]);
  head(f, peer ? { ...p, lookUp: true } : p, POST_HEAD, hy);
  helmet(f, 'left', hy - 1 + (p.lookUp || peer ? -1 : 0));
}

const POST_IDLE: IdleKey[] = [
  ...rep([{ act: 'peer', breath: 0 }, { act: 'peer', breath: 0 }, { act: 'peer', breath: 1 }, { act: 'peer', breath: 1 }], 3),
  { breath: 0 }, { breath: 0, blink: true }, { breath: 1 }, { breath: 1 },
];

registerChar('npc_postman', () =>
  buildSprite({
    id: 'npc_postman',
    mats: POST,
    draw: postDraw,
    idle: { down: POST_IDLE, left: POST_IDLE, right: POST_IDLE, up: breathingIdle() },
    extras: { peer: { dirs: ['down', 'left', 'right'] }, surprised: { dirs: ['down'] } },
  }),
);

// =============================================================================
// ガチャの男の子 (npc_gacha_boy): ~2nd grader. Buzz cut, a big plaster on
// his forehead, white tank top, orange shorts, blue sandals, an empty capsule.
// Idle: cranks the gacha handle (3 frames) → shakes the capsule at his ear.

const GACHA: Mats = {
  ...base,
  skin: SKIN_LIGHT,
  hair: mat('#5A4448', { shade: '#463438', light: '#6E585A', dark: '#2E2226', rim: '#9A6A52' }),
  plaster: flat('#F4F1E8'),
  pad: flat('#FBF3DC'),
  dot: flat('#C98A6A'),
  tank: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C', rim: '#FFDCB4' }),
  shorts: mat('#F2894B', { shade: '#C8643A', light: '#F7A86A', dark: '#8E3E24', rim: '#FFB070' }),
  sandal: mat('#4AA8E0', { shade: '#2F7AB0', light: '#7CC8F0' }),
  capT: mat('#E8F4F8', { shade: '#B8CCD4', light: '#FFFFFF' }),
  capB: mat('#E84E3C', { shade: '#B8302A', light: '#FF7A5A' }),
};

const GACHA_HEAD: HeadT = {
  faceD: [3, 3, ['.########.', '##########', '##########', '##########', '.########.', '..######..']],
  hairD: [3, 0, ['..hhhhhh..', '.hhHhhhhd.', 'hhHhhhhhdd', 'h........d']],
  eyesD: { x: 5, d: 5, y: 5, h: 2, shine: true },
  mouthD: [7, 7, 2],
  blushD: [4, 11, 7],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['..hhhhhh..', '.hhHhhhhd.', 'hhHhhhhhdd', 'hhhhhhhhdd', 'hhhhhhhhdd', '.dhhhhhdd.']],
  napeU: [4, 5, ['########', '.######.', '..####..']],
  faceL: [2, 2, ['.#####....', '######....', '######....', '#######...', '#######...', '.#####....', '..###.....']],
  hairL: [3, 0, ['..######..', '.#########', '##########', '....######', '.....#####', '......###.']],
  eyeL: { x: 4, y: 5, h: 2, shine: true },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 7],
  neckL: [5, 9, 2],
};

const GACHA_LEGS: LegSpec = { cx: 8, hip: 19, foot: 22, w: 2, gap: 2, mat: 'skin', shoe: 'sandal', shoeLen: 3 };

function capsule(f: Fig, x: number, y: number) {
  f.part('capT', { shade: 'r', light: 't' });
  f.rect(x, y, 2, 1);
  f.part('capB', { shade: 'r', light: '' });
  f.rect(x, y + 1, 2, 1);
}

function gachaDraw(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const act = p.act;
  const hy = 4 + u;
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, GACHA_LEGS);
    f.part('shorts', { shade: 'rb', light: '' });
    f.rect(4, 17 + b, 8, 2);
    f.erase(7, 18 + b, 2, 1);
    f.part('tank', { shade: 'rb', light: 't' });
    f.rect(4, 13 + u, 8, 17 + b - (13 + u));
    if (p.view === 'down') {
      f.part('skin', { shade: '', light: '' });
      f.px(6, 13 + u).px(7, 13 + u).px(8, 13 + u).px(9, 13 + u).px(7, 14 + u).px(8, 14 + u);
    }
    // bare shoulders + arms
    const seg: Seg[] = [{ mat: 'skin' }];
    if (act === 'crank' && p.view === 'down') {
      hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 16, segs: seg }, u, 'L');
      // the hand goes round with the handle: up → out → down (3 clear steps)
      const hx = [13, 14, 12][p.ph];
      const hyy = [12, 14, 16][p.ph];
      f.part('skin', { shade: '', light: '', shift: -1 });
      f.t(0).line(12, 13 + u, hx, hyy + u).t(null);
      f.part('skin', { shade: 'rb', light: 't', shift: -1 });
      f.rect(hx, hyy + u, 2, 2);
    } else if (act === 'crank' && p.view === 'up') {
      // facing the gacha machine: the right elbow goes round with the handle
      hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 16, segs: seg }, u, 'L');
      const ex = [13, 13, 12][p.ph];
      const ey = [14, 15, 16][p.ph];
      f.part('skin', { shade: 'r', light: '', shift: -1 });
      f.px(12, 13 + u).px(ex, ey + u).px(ex - 1, ey + u + (p.ph === 2 ? 0 : 1));
    } else if (act === 'shake' && p.view === 'down') {
      hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 16, segs: seg }, u, 'L');
      f.part('skin', { shade: '', light: '', shift: -1 });
      f.t(0).line(12, 13 + u, 13, 10 + u).t(null);
      capsule(f, 13 + (p.ph % 2), 8 + u);
    } else {
      hangArms(f, p, { lx: 3, rx: 12, sy: 13, hy: 16, segs: seg }, u);
      if (p.view === 'down') capsule(f, 1, 16 + u);
    }
    const pp = act === 'shake' ? { ...p, blink: true } : p;
    head(f, pp, GACHA_HEAD, hy);
    if (p.view === 'down') {
      // a big white plaster on the forehead (4×2) with the gauze dot in
      // the middle — white against skin so it reads at 1x
      const py = hy + 3 - (p.lookUp ? 2 : 0);
      f.part('plaster', { flat: true, rim: false });
      f.hl(6, 9, py).hl(6, 9, py + 1);
      f.part('dot', { flat: true, rim: false });
      f.px(8, py);
    }
    return;
  }
  const sw = sideSwing(p);
  sideArm(f, 9, 13 + u, 3, -sw, [{ mat: 'skin' }], -1);
  legs(f, p, GACHA_LEGS);
  f.part('shorts', { shade: 'rb', light: '' });
  f.rect(6, 17 + b, 5, 2);
  f.part('tank', { shade: 'rb', light: 't' });
  f.rect(5, 13 + u, 6, 17 + b - (13 + u));
  if (act === 'shake') {
    f.part('skin', { shade: '', light: '' });
    f.t(0).line(8, 14 + u, 9, 10 + u).t(null);
    capsule(f, 9 + (p.ph % 2), 8 + u);
  } else {
    sideArm(f, 8, 14 + u, 2, sw, [{ mat: 'skin' }]);
    if (act === 'crank') {
      f.part('skin', { shade: '', light: '' });
      f.px([5, 4, 5][p.ph], [15, 16, 17][p.ph] + u);
    }
  }
  head(f, p, GACHA_HEAD, hy);
  const py = hy + 3 - (p.lookUp ? 1 : 0);
  f.part('plaster', { flat: true, rim: false });
  f.hl(2, 4, py).hl(2, 4, py + 1);
  f.part('dot', { flat: true, rim: false });
  f.px(3, py);
}

const GACHA_IDLE: IdleKey[] = [
  ...rep([{ act: 'crank', ph: 0 }, { act: 'crank', ph: 1 }, { act: 'crank', ph: 2 }], 3),
  { act: 'shake', ph: 0 }, { act: 'shake', ph: 1 }, { act: 'shake', ph: 0 }, { act: 'shake', ph: 1 }, { act: 'shake', ph: 0 },
  { breath: 0 }, { breath: 0, blink: true },
];

registerChar('npc_gacha_boy', () =>
  buildSprite({
    id: 'npc_gacha_boy',
    mats: GACHA,
    draw: gachaDraw,
    idle: { down: GACHA_IDLE, left: GACHA_IDLE, right: GACHA_IDLE, up: rep([{ act: 'crank', ph: 0 }, { act: 'crank', ph: 1 }, { act: 'crank', ph: 2 }], 5) },
    extras: { shake: { dirs: ['down', 'left', 'right'] }, surprised: { dirs: ['down'] }, happy: { dirs: ['down'] } },
    anims: {
      crank: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }], ms: 160 },
      shake: { frames: [{ ph: 0 }, { ph: 1 }], ms: 110 },
    },
  }),
);

// =============================================================================
// 砂場の女の子 (npc_sand_girl): 5–6. White gym cap with the chin elastic,
// white gym shirt, deep-red shorts, a plaster on her knee, a blue shovel.
// Base pose: crouching in the sandbox. Idle: piles sand (2 frames) → looks at
// the western sun. Extras: crouch, proud (fushigi_07), look_up.

const SAND: Mats = {
  ...base,
  skin: skinLight,
  hair: blackHair,
  cap: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C', rim: '#FFDCB4' }),
  capR: flat('#E84E3C'),
  elastic: flat('#E8E4D8'),
  gym: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C', rim: '#FFDCB4' }),
  shorts: mat('#8A2E3A', { shade: '#64202E', light: '#AE4A52', dark: '#44141E', rim: '#C8604A' }),
  shoe: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF' }),
  plaster: flat('#F2D2A8'),
  shovel: mat('#4AA8E0', { shade: '#2F7AB0', light: '#7CC8F0', dark: '#1E4A70' }),
  sand: mat('#E8C890', { shade: '#C8A06A', light: '#F6E0B0' }),
  name: flat('#E8E4D8'),
};

const SAND_HEAD: HeadT = {
  faceD: [3, 4, ['.########.', '##########', '##########', '##########', '.########.', '..######..']],
  hairD: [2, 3, ['.hhhhhhhhhh.', 'hhdh.hh.hdhd', 'hd........dd', 'h..........d', 'hd........d.']],
  eyesD: { x: 5, d: 5, y: 6, h: 2, shine: true },
  mouthD: [8, 8, 1],
  blushD: [4, 11, 8],
  neckD: [7, 10, 2],
  hairU: [2, 3, ['.hhhhhhhhhh.', 'hhhhhhhhhhhd', 'hhhhhhhhhhdd', 'hhhhhhhhhhdd', '.hdhhhhhhdd.']],
  faceL: [2, 4, ['.#####....', '######....', '######....', '#######...', '.#####....', '..###.....']],
  hairL: [2, 3, ['.#########..', '##d.#######d', '#...#######d', '.....######d', '......####d.']],
  eyeL: { x: 4, y: 6, h: 2, shine: true },
  earL: [8, 6],
  mouthL: [3, 8],
  blushL: [5, 8],
  neckL: [5, 10, 2],
};

function gymCap(f: Fig, view: string, y: number, lu = false) {
  f.part('cap', { shade: 'rb', light: 't' });
  if (view === 'left') f.rows(2, y, ['..######....', '.#########..', '###########.', '############']);
  else f.rows(2, y, ['...######...', '.##########.', '############', '############']);
  f.part('capR', { flat: true, rim: false });
  if (view === 'up') f.hl(3, 12, y + 3);
  f.part('elastic', { flat: true, rim: false });
  if (view === 'down') f.px(3, y + 5).px(3, y + 6).px(12, y + 5).px(12, y + 6).px(4, y + 9).px(11, y + 9);
  else if (view === 'left') f.px(8, y + 5).px(7, y + 8);
  if (lu && view === 'down') {
    // looking up: the cap's red lining shows under the front edge
    f.part('capR', { flat: true, rim: false });
    f.hl(3, 12, y + 4);
  }
}

const SAND_LEGS: LegSpec = { cx: 8, hip: 20, foot: 22, w: 2, gap: 2, mat: 'skin', shoe: 'shoe', shoeLen: 2 };

function sandStand(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const proud = p.act === 'proud';
  const hy = 6 + u + (proud ? -1 : 0);
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, SAND_LEGS);
    if (p.view === 'down') {
      f.part('plaster', { flat: true, rim: false });
      f.px(5, 20);
    }
    f.part('shorts', { shade: 'rb', light: '' });
    f.rect(4, 18 + b, 8, 2);
    f.erase(7, 19 + b, 2, 1);
    f.part('gym', { shade: 'rb', light: 't' });
    f.hl(5, 10, 15 + u);
    f.rect(4, 16 + u, 8, 18 + b - (16 + u));
    if (p.view === 'down') {
      f.part('name', { flat: true, rim: false });
      f.rect(5, 17 + u, 2, 1);
      f.part('shorts', { flat: true, rim: false });
      f.px(5, 17 + u);
    }
    if (proud) {
      // hands on hips, chest out
      f.part('skin', { shade: 'r', light: '' });
      f.px(3, 16 + u).px(2, 17 + u).px(3, 18 + u).px(12, 16 + u).px(13, 17 + u).px(12, 18 + u);
      f.part('shovel', { shade: 'r', light: 't' });
      f.vl(13, 13 + u, 16 + u);
      f.rect(13, 11 + u, 2, 2);
    } else {
      hangArms(f, p, { lx: 3, rx: 12, sy: 16, hy: 18, segs: [{ mat: 'gym', n: 1 }, { mat: 'skin' }] }, u);
      if (p.view === 'down') {
        f.part('shovel', { shade: 'r', light: 't' });
        f.vl(13, 18 + u, 19 + u);
        f.rect(13, 20 + u, 2, 2);
      }
    }
    head(f, proud ? { ...p, act: 'happy' } : p, SAND_HEAD, hy);
    gymCap(f, p.view, hy + 1 + hatLift(p), p.lookUp);
    return;
  }
  const sw = sideSwing(p);
  sideArm(f, 9, 16 + u, 2, -sw, [{ mat: 'gym', n: 1 }, { mat: 'skin' }], -1);
  legs(f, p, SAND_LEGS);
  f.part('shorts', { shade: 'rb', light: '' });
  f.rect(6, 18 + b, 5, 2);
  f.part('gym', { shade: 'rb', light: 't' });
  f.rect(5, 15 + u, 6, 18 + b - (15 + u));
  sideArm(f, 8, 16 + u, 2, sw, [{ mat: 'gym', n: 1 }, { mat: 'skin' }]);
  f.part('shovel', { shade: 'r', light: 't' });
  f.vl(7 - sw, 19 + u, 20 + u);
  head(f, p, SAND_HEAD, hy);
  gymCap(f, 'left', hy + 1 + (p.lookUp ? -1 : 0));
}

/** Crouched in the sand: knees up, shovel in both hands. */
function sandCrouch(f: Fig, p: Pose) {
  const act = p.act;
  const dig = act === 'dig' ? p.ph : 0;
  const look = act === 'look';
  // exhale: head and cap sink 1px (breath arrives as −1)
  const hy = 9 + (p.breath < 0 ? 1 : 0);
  if (p.view === 'down' || p.view === 'up') {
    // feet + knees
    f.part('shoe', { shade: 'rb', light: 't' });
    f.rect(4, 22, 3, 1).rect(9, 22, 3, 1);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(4, 19, 3, 3).rect(9, 19, 3, 3);
    f.part('shorts', { shade: 'rb', light: '' });
    f.rect(5, 20, 6, 2);
    if (p.view === 'down') {
      f.part('plaster', { flat: true, rim: false });
      f.px(5, 19);
    }
    f.part('gym', { shade: 'rb', light: 't' });
    f.hl(5, 10, 17);
    f.rect(4, 18, 8, 2);
    if (p.view === 'down') {
      // arms reaching down with the shovel between the knees
      f.part('skin', { shade: '', light: '' });
      f.px(4, 19).px(11, 19).px(7, 20 - dig).px(8, 20 - dig);
      f.part('shovel', { shade: 'r', light: 't' });
      f.vl(8, 19 - dig, 20 - dig);
      f.rect(7, 21 - dig, 2, 1);
      f.part('sand', { shade: 'rb', light: 't' });
      f.rect(6, 22, 4, 1);
      if (dig) f.px(7, 21);
    } else {
      // from behind: elbows working the shovel in front of her, sand
      // flicking out past her left side on every scoop
      f.part('skin', { shade: '', light: '' });
      f.px(3, 18 + dig).px(12, 19 - dig);
      f.part('sand', { shade: 'rb', light: 't' });
      f.rect(5, 22, 6, 1);
      if (dig) f.px(2, 20).px(1, 19);
      else f.px(3, 21);
      f.part('shovel', { shade: 'r', light: 't' });
      if (dig) f.px(3, 20);
    }
    // looking west at the sun turns her head (seen from behind too)
    if (look && p.view === 'up') f.offset(-1, 0);
    head(f, look ? { ...p, lookUp: false } : p, SAND_HEAD, hy - 2);
    if (look && p.view === 'down') {
      f.part('skin', { shade: '', light: '' });
      f.px(10, hy + 4).px(10, hy + 5);
      f.part('eye', { flat: true, rim: false });
      f.rect(4, hy + 4, 1, 2);
    }
    gymCap(f, p.view, hy - 1 + hatLift(p), p.lookUp);
    f.offset(0, 0);
    return;
  }
  // side crouch (facing left)
  f.part('shoe', { shade: 'rb', light: 't' });
  f.rect(5, 22, 3, 1).rect(8, 22, 2, 1);
  f.part('skin', { shade: 'rb', light: 't' });
  f.rows(5, 18, ['###..', '####.', '.###.', '.##..']);
  f.part('shorts', { shade: 'rb', light: '' });
  f.rect(8, 19, 3, 3);
  f.part('gym', { shade: 'rb', light: 't' });
  f.rect(6, 16, 5, 4);
  f.part('skin', { shade: '', light: '' });
  f.t(0).line(6, 18, 4, 20 - dig).t(null);
  f.part('shovel', { shade: 'r', light: 't' });
  f.rect(2, 21 - dig, 2, 1);
  f.part('sand', { shade: 'rb', light: 't' });
  f.rect(1, 22, 4, 1);
  head(f, p, SAND_HEAD, hy - 2);
  gymCap(f, 'left', hy - 1 + (p.lookUp ? -1 : 0));
}

function sandDraw(f: Fig, p: Pose) {
  const crouch = p.mode === 'idle' || p.act === 'crouch' || p.act === 'dig' || p.act === 'look' || (p.mode === 'extra' && p.act === 'look_up');
  if (crouch) sandCrouch(f, p);
  else sandStand(f, p);
}

const SAND_IDLE: IdleKey[] = [
  ...rep([{ act: 'dig', ph: 0 }, { act: 'dig', ph: 1 }], 5),
  { act: 'look' }, { act: 'look' }, { act: 'look' }, { act: 'look', blink: true }, { act: 'look' }, { act: 'look' },
];

registerChar('npc_sand_girl', () =>
  buildSprite({
    id: 'npc_sand_girl',
    mats: SAND,
    draw: sandDraw,
    walkFrameMs: 120,
    idle: {
      down: SAND_IDLE,
      left: SAND_IDLE,
      right: SAND_IDLE,
      up: [
        ...rep([{ act: 'dig', ph: 0 }, { act: 'dig', ph: 1 }], 3),
        { act: 'dig', ph: 0, breath: 1 }, { act: 'dig', ph: 0, breath: 1 },
        { act: 'look' }, { act: 'look' }, { act: 'look', breath: 1 }, { act: 'look', breath: 1 },
        ...rep([{ act: 'dig', ph: 0 }, { act: 'dig', ph: 1 }], 2),
      ],
    },
    extras: {
      crouch: { dirs: 'all' },
      proud: { dirs: ['down'] },
      look_up_stand: { dirs: ['down'], p: { lookUp: true } },
    },
    anims: { dig: { frames: [{ ph: 0 }, { ph: 1 }], ms: 250, dirs: ['down', 'left', 'right'] } },
    poses: { crouch: 'idle' },
  }),
);
