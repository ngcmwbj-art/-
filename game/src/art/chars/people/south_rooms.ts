// 南の列の部屋の人（02 #59、10_narrative 6.23・7.20、30_level_art 4.13〜4.19）:
//   npc_photo_master  写真館の主人 — 70代。紺のベレー帽、白い横の髪と白い口ひげ、
//                     丸めがね、白いシャツに茶色のベスト、首から古いカメラ。立ち姿。
//   npc_kazuo         かずお（なんばるわんの夫）— 60代。グレーの七三の短髪、めがね、
//                     うすい緑のポロシャツ、ベージュのズボン。ひじかけいすで新聞。
//   npc_chizu_haha    ちずの母 — 80代。白髪のおだんご、えんじ色のカーディガン、
//                     紺のスカート。座布団に正座して、さやいんげんの すじを とる。
// 光は左上、左の縁にリムライト、外周の輪郭は rig の決まりどおり。全員 look_up を持つ。

import { flat, mat, type Fig, type Mats } from '../fig';
import { SKIN_LIGHT, SKIN_MID } from '../mats';
import { legs, sitLegs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { hangArms, hatLift, head, sideArm, sideSwing, upper, type HeadT } from '../kit';

const base = {
  eye: flat('#2A1C28'),
  shine: flat('#FFF6D8'),
  blush: flat('#F6A48E'),
  mouth: flat('#B86A5A'),
};

const WHITE_HAIR = mat('#E8E4D8', { shade: '#BDB6AC', light: '#FFFFFF', dark: '#8E887E', rim: '#FFD8B0' });

/**
 * Glasses (16px style): the rims beside and between the eyes on the eye
 * row, in a light frame colour, so they read as glasses and not as a band.
 */
function glasses(f: Fig, p: Pose, hy: number, ex: number, d: number, ey: number, sx: number) {
  if (p.lookUp) return;
  f.part('glass', { flat: true, rim: false, ol: false });
  const y = hy + ey;
  if (p.view === 'down') {
    f.px(ex - 1, y).px(ex + 1, y).px(ex + d - 1, y).px(ex + d + 1, y);
    f.px(ex, y - 1).px(ex + d, y - 1);
  } else if (p.view === 'left') f.px(sx - 1, y).px(sx + 1, y).px(sx, y - 1);
}

// =============================================================================
// 写真館の主人 (npc_photo_master)

const PM: Mats = {
  ...base,
  skin: SKIN_LIGHT,
  hair: WHITE_HAIR,
  beret: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B1733', rim: '#8A9AD0' }),
  shirt: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C', rim: '#FFDCB4' }),
  vest: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A', dark: '#3A2B24', rim: '#C8845A' }),
  pants: mat('#5A5060', { shade: '#443C4A', light: '#766C7E' }),
  shoe: mat('#5A3A2A', { shade: '#3A2B24', light: '#8A5A3A' }),
  cam: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
  lens: flat('#C0C6CC'),
  strap: flat('#2A2440'),
  glass: flat('#C8A06A'),
  stache: flat('#F4F1E8'),
  brow: flat('#E8E4D8'),
};

const PM_HEAD: HeadT = {
  faceD: [4, 2, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 2, ['h........d', 'hh......dd', 'h........d']],
  upD: { fringe: 'none' },
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -2, mat: 'brow', w: 1 } },
  neckD: [7, 8, 2],
  hairU: [3, 2, ['hhhhhhhhhh', 'hhhhhhhhdd', '.hhhhhhdd.']],
  napeU: [5, 5, ['######', '.####.']],
  faceL: [3, 2, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [4, 2, ['...hhhh.', '...hhhhd', '....hhd.']],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -2, mat: 'brow', w: 1 } },
  earL: [8, 4],
  mouthL: [3, 7],
  neckL: [5, 8, 2],
};

const PM_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', shoe: 'shoe', shoeLen: 3 };

function beret(f: Fig, view: string, y: number) {
  f.part('beret', { shade: 'rb', light: 't' });
  if (view === 'left') {
    f.rows(3, y, ['..#####...', '.########.', '#########.']);
    f.px(6, y - 1);
  } else {
    f.rows(3, y, ['..######..', '.########.', '##########']);
    f.px(8, y - 1);
  }
}

function pmDraw(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const hy = 3 + u;
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, PM_LEGS);
    f.part('shirt', { shade: 'rb', light: 't' });
    f.hl(4, 11, 11 + u);
    f.rect(3, 12 + u, 10, 17 + b - (12 + u));
    f.part('vest', { shade: 'rb', light: 't' });
    if (p.view === 'down') {
      f.rect(3, 12 + u, 3, 17 + b - (12 + u));
      f.rect(10, 12 + u, 3, 17 + b - (12 + u));
      f.part('vest', { flat: true });
      f.t(-1).px(5, 14 + u).px(5, 16 + u).t(null);
      // the camera strap round the neck, the camera at the belly
      f.part('strap', { flat: true, rim: false, ol: false });
      f.px(6, 12 + u).px(9, 12 + u).px(6, 13 + u).px(9, 13 + u);
      f.part('cam', { shade: 'rb', light: 't' });
      f.rect(5, 14 + u, 6, 3);
      f.part('lens', { flat: true, rim: false });
      f.px(7, 15 + u).px(8, 15 + u);
    } else f.rect(3, 12 + u, 10, 17 + b - (12 + u));
    const seg: Seg[] = [{ mat: 'shirt', n: 3 }, { mat: 'skin' }];
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u);
    head(f, p, PM_HEAD, hy);
    if (p.view === 'down' && !p.lookUp) {
      f.part('stache', { flat: true, rim: false });
      f.hl(6, 9, hy + 7);
    }
    glasses(f, p, hy, 6, 3, 5, 4);
    beret(f, p.view, hy - 2 + hatLift(p));
    return;
  }
  const sw = sideSwing(p);
  sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'shirt', n: 3 }, { mat: 'skin' }], -1);
  legs(f, p, PM_LEGS);
  f.part('vest', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 17 + b - (12 + u));
  f.part('cam', { shade: 'rb', light: 't' });
  f.rect(3, 14 + u, 3, 3);
  f.part('strap', { flat: true, rim: false, ol: false });
  f.line(5, 13 + u, 7, 11 + u);
  sideArm(f, 8, 12 + u, 4, sw, [{ mat: 'shirt', n: 3 }, { mat: 'skin' }]);
  head(f, p, PM_HEAD, hy);
  if (!p.lookUp) {
    f.part('stache', { flat: true, rim: false });
    f.px(3, hy + 7).px(4, hy + 7);
  }
  glasses(f, p, hy, 6, 3, 5, 4);
  beret(f, 'left', hy - 2 + (p.lookUp ? -1 : 0));
}

registerChar('npc_photo_master', () =>
  buildSprite({
    id: 'npc_photo_master',
    mats: PM,
    draw: pmDraw,
    walkFrameMs: 180,
    idle: breathingIdle(16, [5, 13]),
    idleFrameMs: 250,
    extras: { look_up: { dirs: 'all', p: { lookUp: true } }, surprised: { dirs: ['down'] } },
  }),
);

// =============================================================================
// かずお (npc_kazuo): seated in the armchair with the newspaper on his knees

const KZ: Mats = {
  ...base,
  skin: SKIN_MID,
  hair: mat('#9AA0A8', { shade: '#747A88', light: '#BCC2C8', dark: '#4E5262', rim: '#E0B8A0' }),
  shirt: mat('#9BCB6B', { shade: '#5FA85A', light: '#C9E08A', dark: '#2E6B4A', rim: '#F0E0A0' }),
  pants: mat('#C8A06A', { shade: '#A8742A', light: '#E8C890', dark: '#8A5A3A' }),
  shoe: mat('#5A3A2A', { shade: '#3A2B24', light: '#8A5A3A' }),
  paper: mat('#FBF3DC', { shade: '#E8D9B5', light: '#FFFFFF', dark: '#C8C2B4' }),
  ink: flat('#9AA0A8'),
  glass: flat('#6B7186'),
  brow: flat('#747A88'),
};

const KZ_HEAD: HeadT = {
  faceD: [4, 2, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, ['..hhHHhh..', '.hhHhhhhhd', 'hhhhhh.hdd', 'hd......dd']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  mouthD: [7, 7, 2],
  neckD: [7, 8, 2],
  hairU: [3, 0, ['..hhHHhh..', '.hhHhhhhhd', 'hhhhhhhhdd', 'hhhhhhhhdd', '.hhhhhhdd.']],
  napeU: [5, 5, ['######', '.####.']],
  faceL: [3, 2, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 0, ['..#####...', '.#######d.', '##..####dd', '.....###dd', '......##d.']],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  earL: [8, 4],
  mouthL: [3, 7],
  neckL: [5, 8, 2],
};

const KZ_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', shoe: 'shoe', shoeLen: 3 };

function kzDraw(f: Fig, p: Pose) {
  const seated = p.mode !== 'walk' || p.act === 'sit' || p.act === 'read';
  const drop = seated ? 3 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const hy = 3 + u;
  const flip = p.act === 'read' && p.ph === 1;
  if (p.view === 'down' || p.view === 'up') {
    if (seated) sitLegs(f, p, KZ_LEGS, 18);
    else legs(f, p, KZ_LEGS);
    f.part('shirt', { shade: 'rb', light: 't' });
    f.hl(4, 11, 11 + u);
    f.rect(3, 12 + u, 10, 17 + b - (12 + u) + (seated ? 0 : 1));
    if (p.view === 'down') {
      f.part('shirt', { flat: true });
      f.t(1).px(7, 11 + u).px(8, 11 + u).t(null);
      f.part('shirt', { flat: true });
      f.t(-1).px(8, 13 + u).t(null);
    }
    const seg: Seg[] = [{ mat: 'shirt', n: 2 }, { mat: 'skin' }];
    if (seated && p.view === 'down') {
      // the newspaper open on his knees, held at both sides
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 15, segs: seg }, u);
      f.part('paper', { shade: 'rb', light: 't' });
      f.rect(3, 15 + u, 10, 4);
      if (flip) f.rect(8, 13 + u, 5, 2);
      f.part('ink', { flat: true, rim: false, ol: false });
      f.hl(4, 7, 16 + u).hl(9, 11, 16 + u).hl(4, 6, 17 + u).hl(9, 12, 17 + u);
    } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u);
    head(f, p, KZ_HEAD, hy);
    glasses(f, p, hy, 6, 3, 5, 4);
    return;
  }
  const sw = seated ? 0 : sideSwing(p);
  if (!seated) sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'shirt', n: 2 }, { mat: 'skin' }], -1);
  if (seated) sitLegs(f, p, KZ_LEGS, 18);
  else legs(f, p, KZ_LEGS);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 17 + b - (12 + u) + (seated ? 0 : 1));
  if (seated) {
    f.part('paper', { shade: 'rb', light: 't' });
    f.rect(2, 14 + u, 5, 4);
    f.part('skin', { shade: '', light: '' });
    f.px(6, 15 + u);
  } else sideArm(f, 8, 12 + u, 4, sw, [{ mat: 'shirt', n: 2 }, { mat: 'skin' }]);
  head(f, p, KZ_HEAD, hy);
  glasses(f, p, hy, 6, 3, 5, 4);
}

const KZ_IDLE: IdleKey[] = [...rep([{ act: 'read', breath: 0 }, { act: 'read', breath: 0 }, { act: 'read', breath: 1 }, { act: 'read', breath: 1 }], 4), { act: 'read', ph: 1 }, { act: 'read', ph: 1 }, { act: 'read', blink: true }, { act: 'read' }];

registerChar('npc_kazuo', () =>
  buildSprite({
    id: 'npc_kazuo',
    mats: KZ,
    draw: kzDraw,
    walkFrameMs: 180,
    idle: { down: KZ_IDLE, left: KZ_IDLE, right: KZ_IDLE, up: rep([{ act: 'sit', breath: 0 }, { act: 'sit', breath: 1 }], 4) },
    idleFrameMs: 260,
    extras: { sit: { dirs: 'all' }, look_up: { dirs: 'all', p: { lookUp: true, act: 'sit' } } },
    poses: { sit: 'idle' },
  }),
);

// =============================================================================
// ちずの母 (npc_chizu_haha): kneeling (正座) on the cushion, stringing green beans

const CH: Mats = {
  ...base,
  skin: SKIN_MID,
  hair: WHITE_HAIR,
  cardi: mat('#B04A7A', { shade: '#8A2E3A', light: '#D9728A', dark: '#5E1E2A', rim: '#F6A48E' }),
  blouse: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C' }),
  skirt: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B1733' }),
  shoe: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE' }),
  bean: flat('#5FA85A'),
  beanLt: flat('#9BCB6B'),
  brow: flat('#BDB6AC'),
};

const CH_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 1, ['..hHHhhh..', '.hHhhhhhhd', 'hhh....hdd', 'hd......dd']],
  eyesD: { x: 6, d: 3, y: 6, h: 1, closed: true, brow: { dy: -1, mat: 'brow', w: 1 } },
  mouthD: [7, 8, 2],
  blushD: [5, 10, 7],
  neckD: [7, 9, 2],
  hairU: [3, 1, ['..hHHhhh..', '.hHhhhhhhd', 'hhhhhhhhdd', 'hhhhhhhhdd', '.hhhhhhdd.']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 1, ['..#####...', '.#######d.', '##..####dd', '.....###dd', '......##d.']],
  eyeL: { x: 4, y: 6, h: 1, closed: true, brow: { dy: -1, mat: 'brow', w: 1 } },
  earL: [8, 5],
  mouthL: [3, 8],
  blushL: [5, 7],
  neckL: [5, 9, 2],
};

const CH_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'skirt', shoe: 'shoe', shoeLen: 2 };

/** The bun on the crown (follows the head). */
function bun(f: Fig, view: string, y: number) {
  f.part('hair', { shade: 'rb', light: 't' });
  if (view === 'left') f.rows(7, y - 1, ['.##', '###', '.#.']);
  else f.rows(7, y - 2, ['.##.', '####', '.##.']);
}

function chDraw(f: Fig, p: Pose) {
  const kneel = p.mode !== 'walk';
  const drop = kneel ? 5 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const hy = 2 + u;
  const ph = p.act === 'bean' ? p.ph : 0;
  if (p.view === 'down' || p.view === 'up') {
    if (kneel) {
      // kneeling: the skirt spread on the cushion, no legs showing
      f.part('skirt', { shade: 'rb', light: 't' });
      f.rect(2, 18 + (b - drop), 12, 4);
      f.hl(3, 12, 22);
    } else legs(f, p, CH_LEGS);
    f.part('blouse', { shade: 'rb', light: 't' });
    f.hl(5, 10, 11 + u);
    f.part('cardi', { shade: 'rb', light: 't' });
    f.rect(3, 12 + u, 10, 17 + b - (12 + u) + (kneel ? 1 : 0));
    if (p.view === 'down') {
      f.part('blouse', { shade: '', light: '' });
      f.vl(7, 12 + u, 14 + u).vl(8, 12 + u, 14 + u);
      if (kneel) {
        // both hands at the lap, a bean between them (ph: the string pulled)
        f.part('cardi', { shade: 'rb', light: 't' });
        f.rect(2, 13 + u, 2, 4).rect(12, 13 + u, 2, 4);
        f.part('skin', { shade: '', light: '' });
        f.px(5, 17 + u).px(10, 17 + u);
        f.part('bean', { flat: true, rim: false });
        f.hl(6, 9, 17 + u);
        f.part('beanLt', { flat: true, rim: false, ol: false });
        f.px(ph ? 10 : 9, ph ? 16 + u : 17 + u);
      } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: [{ mat: 'cardi', n: 3 }, { mat: 'skin' }] }, u);
    } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: [{ mat: 'cardi', n: 3 }, { mat: 'skin' }] }, u);
    head(f, p, CH_HEAD, hy);
    bun(f, p.view, hy + (p.lookUp ? 1 : 0));
    return;
  }
  if (kneel) {
    f.part('skirt', { shade: 'rb', light: 't' });
    f.rect(3, 18 + (b - drop), 9, 4);
    f.hl(2, 11, 22);
  } else legs(f, p, CH_LEGS);
  f.part('cardi', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 17 + b - (12 + u) + (kneel ? 1 : 0));
  if (kneel) {
    f.part('skin', { shade: '', light: '' });
    f.px(4, 16 + u);
    f.part('bean', { flat: true, rim: false });
    f.hl(2, 4, 17 + u);
  } else sideArm(f, 8, 12 + u, 4, sideSwing(p), [{ mat: 'cardi', n: 3 }, { mat: 'skin' }]);
  head(f, p, CH_HEAD, hy);
  bun(f, 'left', hy);
}

const CH_IDLE: IdleKey[] = [
  ...rep([{ act: 'bean', ph: 0, breath: 0 }, { act: 'bean', ph: 0, breath: 0 }, { act: 'bean', ph: 1, breath: 1 }, { act: 'bean', ph: 1, breath: 1 }], 3),
  { act: 'bean', breath: 0 }, { act: 'bean', breath: 0, blink: true }, { act: 'bean' }, { act: 'bean' },
];

registerChar('npc_chizu_haha', () =>
  buildSprite({
    id: 'npc_chizu_haha',
    mats: CH,
    draw: chDraw,
    walkFrameMs: 200,
    idle: { down: CH_IDLE, left: CH_IDLE, right: CH_IDLE, up: rep([{ act: 'sit', breath: 0 }, { act: 'sit', breath: 1 }], 4) },
    idleFrameMs: 280,
    extras: { sit: { dirs: 'all' }, look_up: { dirs: 'all', p: { lookUp: true, act: 'sit' } } },
    poses: { sit: 'idle' },
  }),
);
