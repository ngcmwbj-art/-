// Passers-by (town traffic, 30_level_art 3.4 / world route 'passerby'):
//   npc_walker_shufu     買い物帰りの人 — border tee, mustard skirt, a hair bun,
//                        a sky-blue eco bag with a leek sticking out
//   npc_walker_salaryman 帰りの会社員 — white short-sleeved shirt, loosened
//                        tie, grey slacks, a brown briefcase; checks his watch
//   npc_walker_bike      自転車の高校生 — summer uniform on a navy city bike
//                        with a front basket, enamel sports bag on his back;
//                        pedalling cycle (24px wide), stops with a foot down
//   npc_walker_kid       走る子ども — blue cap, yellow tee, a red balloon on a
//                        string that trails behind him; the walk cycle is a run
//
// They walk the town's routes in stage 0, stop dead mid-stride at 17:00
// (stage 1 holds the walk frame they were in), and in stage 2 only their long
// shadows walk on — so every one of them has a silhouette of its own (the
// leek, the briefcase, the wheels, the balloon on its string).

import { flat, mat, type Fig, type Mats } from '../fig';
import { HAIR_BLACK, SKIN_LIGHT, SKIN_MID } from '../mats';
import { legs, limb, path, polyPath, swing, type LegSpec, type Pt, type Seg } from '../body';
import { buildSprite, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { hangArms, hatLift, head, sideArm, sideSwing, upPt, upper, type HeadT, type Tpl } from '../kit';

const base = {
  eye: flat('#2A1C28'),
  shine: flat('#FFF6D8'),
  blush: flat('#F6A48E'),
  mouth: flat('#B86A5A'),
};

const WHITE_SHIRT = mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8', rim: '#FFE0B8' });

/** Hand-bottom row of a hanging arm, as hangArms() places it. */
function handRow(p: Pose, hy: number, u: number, side: -1 | 1): number {
  const back = p.view === 'up';
  const s = swing(p, side) * (back ? -1 : 1);
  return hy + u + s + (p.lookUp ? 1 : 0);
}

/** Stamp a head-relative template through upPt() (buns, cap panels) so it follows look_up. */
function stampUp(f: Fig, T: HeadT, p: Pose, mat: string, t: Tpl, hy: number, o: Parameters<Fig['part']>[1] = {}) {
  f.part(mat, o);
  t[2].forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '.' || ch === ' ') continue;
      const [x, k] = upPt(T, p, t[0] + i, t[1] + j);
      const tone = ch === 'H' ? 1 : ch === 'd' ? -1 : ch === 'D' ? -2 : ch === 'h' ? 0 : null;
      f.t(tone).px(x, hy + k);
    }
  });
  f.t(null);
}

// =============================================================================
// 買い物帰りの人 (npc_walker_shufu): 30s. Chestnut hair in a bun with a red
// scrunchie, a navy-and-white border tee with a boat neck, a long mustard
// skirt that swings as she walks, brown flat sandals. Her right hand carries
// a sky-blue eco bag (a small red logo) with a leek poking out of
// it. Idle: glances down at the receipt in her other hand.
// Canvas 18×24 (the bag hangs outside her hip).

const SHUFU: Mats = {
  ...base,
  skin: SKIN_MID,
  hair: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A', dark: '#2A2440', rim: '#C8845A' }),
  scrunchie: mat('#E84E3C', { shade: '#B8241E', light: '#FF6A4D' }),
  top: WHITE_SHIRT,
  stripe: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B1733' }),
  skirt: mat('#D9A441', { shade: '#A8742A', light: '#F6D98A', dark: '#8A5A3A', rim: '#F6D98A' }),
  sandal: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A' }),
  bag: mat('#7FD1E8', { shade: '#4AA8E0', light: '#B8E8F4', dark: '#2F7AB0' }),
  logo: flat('#E23B2E'),
  leek: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  leekG: mat('#5FA85A', { shade: '#2E6B4A', light: '#9BCB6B', dark: '#2E6B4A' }),
  leekL: flat('#C9E08A'),
  receipt: flat('#FBF3DC'),
};

const SHUFU_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, ['..HHhhhh..', '.HKHhhhhd.', 'HHhhhhhhdd', 'Hhhd.hhhdd', 'hd......dd', 'd........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 2 },
  mouthD: [7, 7, 2],
  blushD: [5, 10, 7],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['..HHhhhh..', '.HKHhhhhd.', 'HHhhhhhhdd', 'Hhhhhhhhdd', 'hhhhhhhhdd', '.hhhhhhdd.', '..dhhhdd..']],
  napeU: [5, 7, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 0, ['..######..', '.########d', '##########', '#dd.######', '.....#####', '......###d', '.......#d.']],
  eyeL: { x: 4, y: 5, h: 2 },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 7],
  neckL: [5, 9, 2],
};

/** Bun (and scrunchie) per view, head-relative. */
const BUN: Record<'down' | 'up' | 'left', { bun: Tpl; band: Tpl }> = {
  down: { bun: [6, -2, ['.Hh.', 'Hhhd']], band: [6, 0, ['.##.']] },
  up: { bun: [6, 1, ['.Hh.', 'Hhhd', 'hhdd', '.dd.']], band: [6, 5, ['.##.']] },
  left: { bun: [11, 0, ['.Hh', 'Hhd', 'hdd']], band: [10, 1, ['#', '#']] },
};

const SHUFU_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'skin', shoe: 'sandal', shoeLen: 3 };

/** The eco bag hanging from a hand whose bottom row is hb; x0 = bag's left column. leekDir: -1 up-left, 0 up, 1 up-right. */
function ecoBag(f: Fig, x0: number, hb: number, leekDir: number, hx: number) {
  // leek first (the bag's mouth covers its foot)
  const lx = x0 + (leekDir > 0 ? 3 : 1);
  const top: Pt = [lx + leekDir * 3, hb - 4 - Math.abs(leekDir)];
  f.part('leek', { shade: 'r', light: '' });
  f.t(0).line(lx, hb + 1, top[0], top[1] + 1).t(null);
  f.part('leekL', { flat: true, rim: false });
  f.px(top[0], top[1]);
  f.part('leekG', { shade: 'rb', light: 't' });
  // leaves fanning out of the top
  f.px(top[0], top[1] - 1).px(top[0] - 1, top[1] - 2).px(top[0] + 1, top[1] - 2).px(top[0] - 1, top[1] - 1);
  f.t(-1).px(top[0] + 1, top[1] - 3).t(null);
  // handles up to the hand
  f.part('bag', { shade: '', light: '' });
  f.t(-1).px(hx, hb + 1).px(hx + 1, hb + 1).t(null);
  // the bag: 4×4, the mouth a shade darker, a red logo
  f.part('bag', { shade: 'rb', light: 'tl' });
  f.rect(x0, hb + 2, 4, 3);
  f.hl(x0, x0 + 3, hb + 5);
  f.t(-1).hl(x0 + 1, x0 + 2, hb + 2).t(null);
  f.part('logo', { flat: true, rim: false });
  f.px(x0 + 1, hb + 3);
}

function shufuSkirtFront(f: Fig, p: Pose, b: number) {
  const moving = p.mode === 'walk' || p.mode === 'run';
  const sw = moving ? [0, -1, 0, 1][p.step % 4] * (p.view === 'up' ? -1 : 1) : 0;
  f.part('skirt', { shade: 'rb', light: 't' });
  f.rect(4, 16 + b, 8, 2);
  f.rect(3 + (sw < 0 ? -1 : 0), 18 + b, 10, 1);
  f.rect(3 + sw, 19, 10, 2);
  // two soft folds
  f.part('skirt', { flat: true });
  f.t(-1).vl(6 + sw, 18 + b, 20).vl(10 + sw, 18 + b, 20).t(null);
}

function shufuTopFront(f: Fig, p: Pose, u: number, b: number) {
  f.part('top', { shade: 'rb', light: 't' });
  f.hl(4, 11, 11 + u);
  f.rect(3, 12 + u, 10, 16 + b - (12 + u));
  f.m('stripe');
  f.hl(3, 12, 13 + u).hl(3, 12, 15 + u);
  f.m('top');
  if (p.view === 'down') {
    // wide boat neck
    f.part('skin', { shade: '', light: '' });
    f.hl(6, 9, 11 + u);
  }
}

function shufuDraw(f: Fig, p: Pose) {
  f.offset(1, 0);
  const u = upper(p);
  const b = p.bob;
  const hy = 2 + u;
  const receipt = p.act === 'receipt' && !p.lookUp;
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, SHUFU_LEGS);
    shufuSkirtFront(f, p, b);
    shufuTopFront(f, p, u, b);
    const seg: Seg[] = [{ mat: 'top', n: 2 }, { mat: 'skin' }];
    const bagSide = p.view === 'down' ? -1 : 1;
    if (receipt && p.view === 'down') {
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u, 'L');
      // left forearm raised to the chest, a receipt in her fingers
      f.part('top', { shade: 'rb', light: 't', shift: -1 });
      f.rect(12, 12 + u, 2, 2);
      f.part('skin', { shade: '', light: '', shift: -1 });
      f.px(12, 14 + u).px(11, 14 + u).px(10, 14 + u);
      f.part('receipt', { flat: true, rim: false });
      f.rect(9, 12 + u, 2, 2).px(9, 14 + u);
    } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u);
    const hb = handRow(p, 16, u, bagSide);
    if (bagSide < 0) ecoBag(f, 0, hb, 0, 2);
    else ecoBag(f, 12, hb, 0, 12);
    head(f, receipt ? { ...p, blink: true } : p, SHUFU_HEAD, hy);
    const v = p.view === 'down' ? BUN.down : BUN.up;
    stampUp(f, SHUFU_HEAD, p, 'hair', v.bun, hy, { shade: '', light: '' });
    stampUp(f, SHUFU_HEAD, p, 'scrunchie', v.band, hy, { shade: 'r', light: 't' });
    return;
  }
  const sw = sideSwing(p);
  const moving = p.mode === 'walk' || p.mode === 'run';
  sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'top', n: 2 }, { mat: 'skin' }], -1);
  legs(f, p, SHUFU_LEGS);
  // skirt: flares toward the hem, the hem trails the stride
  const hs = moving ? [0, 1, 0, -1][p.step % 4] : 0;
  f.part('skirt', { shade: 'rb', light: 't' });
  f.rect(5, 16 + b, 6, 2);
  f.rect(4, 18 + b, 8, 1);
  f.rect(4 + hs, 19, 8, 2);
  f.part('skirt', { flat: true });
  f.t(-1).vl(7 + hs, 18 + b, 20).t(null);
  // top
  f.part('top', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 16 + b - (12 + u));
  f.m('stripe');
  f.hl(5, 10, 13 + u).hl(5, 10, 15 + u);
  f.m('top');
  head(f, receipt ? { ...p, blink: true } : p, SHUFU_HEAD, hy);
  stampUp(f, SHUFU_HEAD, p, 'hair', BUN.left.bun, hy, { shade: '', light: '' });
  stampUp(f, SHUFU_HEAD, p, 'scrunchie', BUN.left.band, hy, { shade: 'r', light: '' });
  if (receipt) {
    // the far hand holds the receipt up in front of her
    f.part('skin', { shade: '', light: '', shift: -1 });
    f.px(5, 14 + u).px(4, 14 + u);
    f.part('receipt', { flat: true, rim: false });
    f.rect(2, 12 + u, 2, 2).px(3, 14 + u);
  }
  // near arm: sleeve, forearm, the bag; the leek leans back past her shoulder
  f.part('top', { shade: 'rb', light: 'tl' });
  f.rect(7, 12 + u, 3, 2);
  f.m('stripe');
  f.hl(7, 9, 13 + u);
  const hx = 8 - sw;
  const hb = 16 + u + (p.lookUp ? 1 : 0) - (sw ? 1 : 0);
  f.part('skin', { shade: 'r', light: '' });
  f.t(0).line(8, 14 + u, hx, hb).t(null);
  ecoBag(f, hx - 2, hb, 1, hx - 1);
}

const SHUFU_IDLE: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 2),
  { act: 'receipt', breath: 0 }, { act: 'receipt', breath: 0 }, { act: 'receipt', breath: 1 }, { act: 'receipt', breath: 1 },
  { act: 'receipt', breath: 0 }, { act: 'receipt', breath: 0 },
  { breath: 0, blink: true }, { breath: 0 }, { breath: 1 }, { breath: 1 },
];

registerChar('npc_walker_shufu', () =>
  buildSprite({
    id: 'npc_walker_shufu',
    w: 18,
    mats: SHUFU,
    draw: shufuDraw,
    walkFrameMs: 150,
    idle: { down: SHUFU_IDLE, left: SHUFU_IDLE, right: SHUFU_IDLE, up: rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 4) },
    extras: { receipt: { dirs: ['down', 'left', 'right'] } },
    shadow: 11,
  }),
);

// =============================================================================
// 帰りの会社員 (npc_walker_salaryman): 40s, on his way home from the
// station. Neat black side parting going grey at the temples, heavy brows,
// a white short-sleeved shirt with the collar open and a loosened maroon tie,
// grey slacks, black shoes, a brown leather briefcase with a brass clasp swinging in
// his right hand. Idle: raises his wrist and checks his watch (it is almost
// five), then sighs. Canvas 18×24.

const SAL: Mats = {
  ...base,
  skin: SKIN_MID,
  hair: HAIR_BLACK,
  grey: flat('#9AA0A8'),
  brow: flat('#2B1E1A'),
  shirt: WHITE_SHIRT,
  tie: mat('#8A2E3A', { shade: '#5E1E2E', light: '#B8241E', dark: '#3E1424' }),
  slacks: mat('#6B7186', { shade: '#4E5262', light: '#8A90A0', dark: '#2A2440', rim: '#B89A9A' }),
  belt: flat('#3A2B2A'),
  shoe: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186', spec: '#9AA0A8' }),
  case: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A', dark: '#3A2B2A', spec: '#C8A06A' }),
  clasp: flat('#FFD23F'),
  watch: flat('#C8C2B4'),
  dial: flat('#FFF6D8'),
};

const SAL_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, ['..HHhhhh..', '.HKHhhhhd.', 'HHhhhhhhdd', 'Hh..hhhhdd', 'g.....hhdg', 'g........g'], { g: ['grey', null] }],
  eyesD: { x: 6, d: 3, y: 6, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  mouthD: [7, 8, 2],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['..HHhhhh..', '.HKHhhhhd.', 'HHhhhhhhdd', 'Hhhhhhhhdd', 'ghhhhhhhdg', '.ghhhhhg..'], { g: ['grey', null] }],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 0, ['..######..', '.########d', '##########', '####.#####', '.....g####', '......g##d'], { g: ['grey', null] }],
  eyeL: { x: 4, y: 6, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  earL: [8, 5],
  mouthL: [3, 8],
  neckL: [5, 9, 2],
};

const SAL_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'slacks', shoe: 'shoe', shoeLen: 3 };

/** Briefcase (5×4 from the front / back, 6×4 from the side) hanging from a hand whose bottom row is hb. */
function briefcase(f: Fig, x0: number, hb: number, w: number) {
  f.part('case', { shade: 'rb', light: 'tl' });
  f.rect(x0, hb + 1, w, 4);
  f.t(-1).hl(x0, x0 + w - 1, hb + 4).t(null);
  f.part('clasp', { flat: true, rim: false });
  f.px(x0 + Math.floor(w / 2), hb + 2);
}

function salDraw(f: Fig, p: Pose) {
  f.offset(1, 0);
  const watch = p.act === 'watch' && !p.lookUp;
  const u = upper(p);
  const b = p.bob;
  const hy = 2 + u;
  const look = watch ? { ...p, blink: true } : p;
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, SAL_LEGS);
    f.part('slacks', { shade: 'rb', light: '' });
    f.rect(4, 16 + b, 8, 2);
    f.part('shirt', { shade: 'rb', light: 't' });
    f.hl(4, 11, 11 + u);
    f.rect(3, 12 + u, 10, 16 + b - (12 + u));
    f.part('belt', { flat: true, rim: false });
    f.hl(4, 11, 16 + b);
    if (p.view === 'down') {
      // open collar, a loosened tie hanging a little off-centre
      f.part('shirt', { flat: true });
      f.t(-1).px(6, 11 + u).px(9, 11 + u).t(null);
      f.part('skin', { shade: '', light: '' });
      f.px(7, 11 + u).px(8, 11 + u);
      f.part('tie', { shade: 'r', light: '' });
      f.px(7, 12 + u).px(8, 12 + u).vl(8, 13 + u, 15 + u).px(7, 15 + u);
      f.part('shirt', { flat: true });
      f.t(-1).vl(6, 13 + u, 15 + b).t(null);
    } else {
      // the back yoke seam and a crease where the shirt tucks in
      f.part('shirt', { flat: true });
      f.t(-1).px(5, 12 + u).px(10, 12 + u).px(6, 15 + b).px(9, 15 + b).t(null);
    }
    const seg: Seg[] = [{ mat: 'shirt', n: 2 }, { mat: 'skin' }];
    const caseSide = p.view === 'down' ? -1 : 1;
    if (watch && p.view === 'down') {
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u, 'L');
      // left forearm raised across the chest, the watch face toward him
      f.part('shirt', { shade: 'rb', light: 't', shift: -1 });
      f.rect(12, 12 + u, 2, 2);
      f.part('skin', { shade: 'b', light: '', shift: -1 });
      f.px(12, 14 + u).hl(9, 11, 13 + u).px(12, 13 + u);
      f.part('watch', { flat: true, rim: false });
      f.px(11, 13 + u);
      f.part('dial', { flat: true, rim: false });
      f.px(10, 13 + u);
    } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u);
    const hb = handRow(p, 16, u, caseSide);
    if (caseSide < 0) briefcase(f, 0, hb, 5);
    else briefcase(f, 11, hb, 5);
    head(f, look, SAL_HEAD, hy + (watch ? 1 : 0));
    return;
  }
  const sw = sideSwing(p);
  if (!watch) sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'shirt', n: 2 }, { mat: 'skin' }], -1);
  legs(f, p, SAL_LEGS);
  f.part('slacks', { shade: 'rb', light: '' });
  f.rect(5, 16 + b, 6, 2);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 16 + b - (12 + u));
  f.part('belt', { flat: true, rim: false });
  f.hl(5, 10, 16 + b);
  // the tie's end flaps out in front of the chest
  f.part('tie', { shade: '', light: '' });
  f.px(5, 12 + u).px(4, 13 + u + (p.mode === 'walk' && p.step % 2 ? 1 : 0));
  head(f, look, SAL_HEAD, hy + (watch ? 1 : 0));
  if (watch) {
    // far forearm raised in front of the chest, wrist toward his eyes
    f.part('skin', { shade: 'b', light: '', shift: -1 });
    f.hl(3, 5, 13 + u).px(2, 12 + u);
    f.part('watch', { flat: true, rim: false });
    f.px(4, 13 + u);
    f.part('dial', { flat: true, rim: false });
    f.px(4, 12 + u);
  }
  f.part('shirt', { shade: 'rb', light: 'tl' });
  f.rect(7, 12 + u, 3, 2);
  const hx = 8 - sw;
  const hb = 16 + u + (p.lookUp ? 1 : 0) - (sw ? 1 : 0);
  f.part('skin', { shade: 'r', light: '' });
  f.t(0).line(8, 14 + u, hx, hb).t(null);
  briefcase(f, hx - 3, hb, 6);
}

const SAL_IDLE: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 2),
  { act: 'watch' }, { act: 'watch' }, { act: 'watch' }, { act: 'watch' }, { act: 'watch' }, { act: 'watch' },
  // a long sigh after
  { breath: 1 }, { breath: 1 }, { breath: 1 }, { breath: 0 }, { breath: 0, blink: true }, { breath: 0 },
];

registerChar('npc_walker_salaryman', () =>
  buildSprite({
    id: 'npc_walker_salaryman',
    w: 18,
    mats: SAL,
    draw: salDraw,
    walkFrameMs: 145,
    idle: { down: SAL_IDLE, left: SAL_IDLE, right: SAL_IDLE, up: rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 4) },
    extras: { watch: { dirs: ['down', 'left', 'right'] } },
    shadow: 11,
  }),
);

// =============================================================================
// 自転車の高校生 (npc_walker_bike): a high-school boy in the summer uniform
// (white short-sleeved shirt, grey trousers, white sneakers), spiky
// black hair, a blue enamel sports bag on his back, riding a navy city bike
// (step-through frame, chain case, wire basket, rear carrier with a red
// reflector, lamp on the fork). Walk = pedalling: the crank turns a quarter
// per frame and the spokes flicker. Idle: stopped with one foot down,
// wiping the sweat off his forehead. Canvas 24×28 (wheels 9px).

const BIKE: Mats = {
  ...base,
  skin: SKIN_MID,
  hair: HAIR_BLACK,
  shirt: WHITE_SHIRT,
  pants: mat('#6B7186', { shade: '#4E5262', light: '#8A90A0', dark: '#2A2440', rim: '#B89A9A' }),
  sneaker: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  bag: mat('#4AA8E0', { shade: '#2F7AB0', light: '#7FD1E8', dark: '#2F4A8A' }),
  bagline: flat('#F4F1E8'),
  strap: flat('#2F4A8A'),
  frame: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B1733' }),
  steel: mat('#C8C2B4', { shade: '#9AA0A8', light: '#E8E4D8', dark: '#6B7186' }),
  tire: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186', dark: '#1B1733' }),
  grip: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
  lamp: flat('#FFE7A3'),
  refl: flat('#E23B2E'),
};

const BIKE_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, ['.H..hH.h..', '.HKHhhhhd.', 'HHhhhhhhdd', 'HHhHhhhddd', 'hh......dd', 'hd......dd', 'h........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 2 },
  mouthD: [7, 7, 2],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['.H..hH.h..', '.HKHhhhhd.', 'HHhhhhhhdd', 'Hhhhhhhhdd', 'hhhhhhhhdd', '.hdhhdhhd.']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [2, 0, ['...#..#.#..', '..########d', '.##########', '####d######', '....#######', '.....######', '.......#dd.']],
  eyeL: { x: 4, y: 5, h: 2 },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 2],
};

/** Ground row of the bike canvas (tyres touch it). */
const GR = 26;
/** Bottom bracket (crank axle), side view. */
const BB: Pt = [11, 23];
/** Near pedal per pedalling frame (facing left: the top of the crank moves forward). */
const PEDAL: Pt[] = [[9, 23], [11, 25], [13, 23], [11, 21]];
const HIP: Pt = [14, 16];

/** Knee of a two-bone leg from hip to foot, bent forward (−x). */
function knee(h: Pt, ft: Pt, l1: number, l2: number): Pt {
  const dx = ft[0] - h[0];
  const dy = ft[1] - h[1];
  const d = Math.max(0.01, Math.hypot(dx, dy));
  if (d >= l1 + l2 - 0.05) return [Math.round(h[0] + (dx * l1) / d), Math.round(h[1] + (dy * l1) / d)];
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = h[0] + (dx * a) / d;
  const my = h[1] + (dy * a) / d;
  const k1: Pt = [mx + (-dy / d) * hh, my + (dx / d) * hh];
  const k2: Pt = [mx - (-dy / d) * hh, my - (dx / d) * hh];
  const k = k1[0] < k2[0] ? k1 : k2;
  return [Math.round(k[0]), Math.round(k[1])];
}

/** Side-view wheel (9×9), painted under the figure: tyre (lit top-left), hub, spokes. */
const WHEEL = ['...ttT...', '.tt...TT.', '.t.....T.', 't.......T', 't...H...T', 'T.......T', '.T.....T.', '.TT...TT.', '...TTT...'];
const WHEEL_COL: Record<string, string> = { T: '#3A3F48', t: '#6B7186', H: '#9AA0A8' };
/** Spokes: '+' and '×' alternate as the wheel turns (hub-relative 3px arms). */
const SPOKES: Pt[][] = [
  [[4, 2], [4, 3], [4, 5], [4, 6], [2, 4], [3, 4], [5, 4], [6, 4]],
  [[3, 3], [2, 2], [5, 5], [6, 6], [5, 3], [6, 2], [3, 5], [2, 6]],
];

function wheels(f: Fig, p: Pose, phase: number) {
  const W = 24;
  f.before((pc) => {
    for (const cx of [1, 13]) {
      const x0 = p.mirror ? W - 9 - cx : cx;
      SPOKES[phase].forEach(([i, j], k) => pc.set(x0 + i, GR - 8 + j, k % 2 ? '#9AA0A8' : '#C8C2B4'));
      WHEEL.forEach((r, j) => {
        for (let i = 0; i < 9; i++) {
          const c = WHEEL_COL[r[i]];
          if (c) pc.set(x0 + i, GR - 8 + j, c);
        }
      });
    }
  });
}

function crank(f: Fig, ped: Pt, shift: number) {
  f.part('steel', { flat: true, rim: false, ol: false });
  f.t(-1 + shift).line(BB[0], BB[1], ped[0], ped[1]).t(null);
  f.part('grip', { flat: true, rim: false, ol: false });
  f.t(shift).hl(ped[0] - 1, ped[0] + 1, ped[1] + 1).t(null);
}

/** Seated leg from the hip to the foot (pedal or ground), shoe pointing forward. */
function bikeLeg(f: Fig, foot: Pt, shift: number) {
  const k = knee(HIP, foot, 5, 5.5);
  f.part('pants', { shade: 'rb', light: 't', shift });
  for (const [x, y] of path(HIP[0], HIP[1], k[0], k[1])) f.px(x, y).px(x + 1, y);
  for (const [x, y] of path(k[0], k[1], foot[0], foot[1] - 1)) f.px(x, y).px(x + 1, y);
  f.part('sneaker', { shade: 'b', light: 't', shift });
  f.hl(foot[0] - 1, foot[0] + 1, foot[1]);
}

function bikeSide(f: Fig, p: Pose) {
  const moving = p.mode === 'walk' || p.mode === 'run';
  const stop = p.mode === 'idle' || p.act === 'wipe';
  const st = moving ? p.step % 4 : stop ? 1 : 0;
  const near = PEDAL[st];
  const far = PEDAL[(st + 2) % 4];
  const u = -p.breath;
  const lean = stop ? 0 : 1;
  wheels(f, p, st % 2);
  // far side: pedal, leg and arm, a step darker
  crank(f, far, -1);
  bikeLeg(f, far, -1);
  limbTo(f, [10 + lean, 11 + u], [8, 12], [{ mat: 'shirt', n: 1 }, { mat: 'skin' }], -1);
  // frame: thin navy tubes, no outline (they read on the ground by themselves)
  f.part('frame', { flat: true, rim: false, ol: false });
  f.t(0).line(7, 15, 5, 22); // fork
  f.t(1).vl(7, 13, 15); // head tube
  f.t(0);
  for (const [x, y] of polyPath([[7, 16], [8, 18], [10, 21], [11, 22]])) f.px(x, y); // step-through down tube
  f.line(11, 22, 13, 17); // seat tube
  f.t(-1).line(13, 18, 17, 22).line(12, 23, 17, 22).t(null); // seat / chain stays
  // chainring on the crank axle
  f.part('steel', { flat: true, rim: false, ol: false });
  f.t(-1).px(10, 23).px(12, 23).px(11, 22).px(11, 24).t(1).px(BB[0], BB[1]).t(null);
  // rear carrier (a little rack over the wheel) + reflector
  f.part('steel', { shade: 'rb', light: 't' });
  f.hl(16, 20, 16);
  f.part('steel', { flat: true, rim: false, ol: false });
  f.t(-1).px(20, 17).t(null);
  f.part('refl', { flat: true, rim: false });
  f.px(21, 17);
  // saddle nose
  f.part('grip', { shade: 'rb', light: 't' });
  f.hl(12, 15, 16);
  // wire basket on the front, a lamp under it, the handlebar
  f.part('steel', { flat: true });
  f.t(1).hl(1, 6, 14).t(0).vl(1, 15, 16).vl(3, 15, 16).vl(5, 15, 16).t(-2).vl(2, 15, 16).vl(4, 15, 16).vl(6, 15, 16).t(-1).hl(2, 5, 17).t(null);
  f.part('lamp', { flat: true, rim: false });
  f.px(6, 18);
  f.part('steel', { flat: true, rim: false, ol: false });
  f.t(0).px(7, 12).px(8, 12).t(null);
  // rider: trousers on the saddle, torso leaning into the bars, bag on the back
  f.part('pants', { shade: 'rb', light: 't' });
  f.rect(12, 14 + u, 4, 2).hl(12, 15, 16);
  f.part('shirt', { shade: 'r', light: 'tl' });
  f.rows(9 + lean, 10 + u, ['####..', '#####.', '.#####', '..####', '...###']);
  f.part('bag', { shade: 'rb', light: 't' });
  f.rows(14 + lean, 11 + u, ['##.', '###', '###']);
  f.part('bagline', { flat: true, rim: false });
  f.px(15 + lean, 12 + u);
  f.part('strap', { flat: true, rim: false });
  f.px(12 + lean, 10 + u).px(11 + lean, 11 + u).px(10 + lean, 12 + u);
  // near leg and pedal
  if (stop) bikeLeg(f, [12, GR], 0);
  else {
    crank(f, near, 0);
    bikeLeg(f, near, 0);
  }
  head(f, p, BIKE_HEAD, 1 + u, 2 + lean);
  // near arm to the grip (or wiping his forehead)
  const sh: Pt = [11 + lean, 11 + u];
  if (p.act === 'wipe' && !p.lookUp) {
    limbTo(f, sh, [7, 7 + u], [{ mat: 'shirt', n: 2 }, { mat: 'skin' }]);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(5, 5 + u, 2, 2);
  } else {
    f.part('grip', { shade: 'rb', light: 't' });
    f.px(9, 13);
    limbTo(f, sh, [9, 12], [{ mat: 'shirt', n: 2 }, { mat: 'skin' }]);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(8, 12, 2, 2);
  }
}

function limbTo(f: Fig, a: Pt, b: Pt, segs: Seg[], shift = 0) {
  f.part(segs[0].mat, { shade: 'rb', light: 't', shift });
  limb(f, path(a[0], a[1], b[0], b[1]), segs, 1, 1);
}

/** Pedal rows (viewer-left, viewer-right) per frame in the front / back views. */
const PED_FRONT: [number, number][] = [[23, 23], [25, 21], [23, 23], [21, 25]];

/**
 * Front / back leg: the knee pokes out beside the basket (higher when the
 * pedal is up), the shin slants in to the pedal next to the wheel. `side`
 * -1 = viewer-left leg. down = foot on the ground, off the pedal.
 */
function frontLeg(f: Fig, side: -1 | 1, pedalRow: number, shift: number, down = false) {
  const kx = side < 0 ? 6 : 16;
  const fx = side < 0 ? 8 : 14;
  f.part('pants', { shade: 'rb', light: 't', shift });
  if (down) {
    const gx = side < 0 ? 4 : 18;
    f.rect(kx, 15, 2, 2);
    for (const [x, y] of path(kx, 17, gx, GR - 1)) f.px(x, y).px(x + 1, y);
    f.part('sneaker', { shade: 'b', light: 't', shift });
    f.hl(gx - (side < 0 ? 1 : 0), gx + 1 + (side < 0 ? 0 : 1), GR);
    return;
  }
  const kr = pedalRow - 8;
  f.rect(kx, 14, 2, Math.max(1, kr - 13));
  for (const [x, y] of path(kx, kr, fx, pedalRow - 1)) f.px(x, y).px(x + 1, y);
  f.t(1).px(kx + (side < 0 ? 0 : 1), kr).t(null);
  f.part('sneaker', { shade: 'b', light: 't', shift });
  f.hl(fx - (side < 0 ? 1 : 0), fx + 1 + (side < 0 ? 0 : 1), pedalRow);
}

function bikeFront(f: Fig, p: Pose) {
  const moving = p.mode === 'walk' || p.mode === 'run';
  const stop = p.mode === 'idle' || p.act === 'wipe';
  const st = moving ? p.step % 4 : 0;
  const [pl, pr] = PED_FRONT[st];
  const u = -p.breath;
  const wipe = p.act === 'wipe' && !p.lookUp;
  // rider behind the bars
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(8, 15, 10 + u);
  f.rect(7, 11 + u, 10, 3);
  f.part('strap', { flat: true, rim: false });
  f.px(9, 10 + u).px(10, 11 + u).px(11, 12 + u).px(12, 13 + u);
  f.part('skin', { shade: '', light: '' });
  f.px(11, 10 + u).px(12, 10 + u);
  head(f, p, BIKE_HEAD, 1 + u, 4);
  // legs either side of the front wheel
  frontLeg(f, -1, pl, 0, stop);
  frontLeg(f, 1, pr, -1);
  // handlebar with black grips, swept back to either side of him
  f.part('steel', { shade: 'b', light: 't' });
  f.hl(6, 17, 14);
  f.part('grip', { shade: 'rb', light: 't' });
  f.hl(4, 5, 14).hl(18, 19, 14);
  // arms angled down to the grips
  if (wipe) {
    // right hand off the grip, wiping his brow
    limbTo(f, [7, 11 + u], [7, 7 + u], [{ mat: 'shirt', n: 1 }, { mat: 'skin' }]);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(7, 5 + u, 2, 2);
  } else {
    limbTo(f, [7, 11 + u], [5, 13], [{ mat: 'shirt', n: 1 }, { mat: 'skin' }]);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(4, 13, 2, 2);
  }
  limbTo(f, [16, 11 + u], [18, 13], [{ mat: 'shirt', n: 1 }, { mat: 'skin' }], -1);
  f.part('skin', { shade: 'rb', light: 't', shift: -1 });
  f.rect(18, 13, 2, 2);
  // wire basket seen from above: back rim, the dark inside with a folded
  // towel, the front rim, then the mesh of the front wall
  f.part('steel', { flat: true });
  f.t(0).hl(8, 15, 12).t(1).px(8, 13).t(-1).px(15, 13);
  f.t(-2).hl(9, 14, 13);
  f.t(1).hl(8, 11, 14).t(0).hl(12, 15, 14);
  for (let x = 8; x <= 15; x++) f.t(x % 2 ? -2 : x < 12 ? 0 : -1).vl(x, 15, 16);
  f.t(null);
  f.part('bagline', { flat: true, rim: false, ol: false });
  f.hl(10, 11, 13);
  // lamp, fork, mudguard, the front wheel end-on
  f.part('lamp', { flat: true, rim: false });
  f.hl(11, 12, 16);
  f.part('frame', { flat: true, rim: false, ol: false });
  f.t(0).vl(10, 17, 21).t(-1).vl(13, 17, 21).t(null);
  f.part('tire', { shade: 'r', light: 't' });
  f.rect(11, 18, 2, GR - 18 + 1);
  f.part('steel', { flat: true, rim: false });
  f.t(1).hl(10, 13, 17).t(0).px(10, 18).px(13, 18).t(null);
  f.part('frame', { flat: true, rim: false, ol: false });
  f.t(1).px(11, 22).t(0).px(12, 22).t(null);
}

function bikeBack(f: Fig, p: Pose) {
  const moving = p.mode === 'walk' || p.mode === 'run';
  const stop = p.mode === 'idle' || p.act === 'wipe';
  const st = moving ? p.step % 4 : 0;
  const [pr, pl] = PED_FRONT[st];
  const u = -p.breath;
  // handlebar ends and hands (in front of him)
  f.part('grip', { shade: 'rb', light: 't', shift: -1 });
  f.hl(4, 5, 14).hl(18, 19, 14);
  limbTo(f, [7, 11 + u], [5, 13], [{ mat: 'shirt', n: 1 }, { mat: 'skin' }], -1);
  limbTo(f, [16, 11 + u], [18, 13], [{ mat: 'shirt', n: 1 }, { mat: 'skin' }], -1);
  f.part('skin', { shade: 'rb', light: 't', shift: -1 });
  f.rect(4, 13, 2, 1).rect(18, 13, 2, 1);
  // legs
  frontLeg(f, -1, pl, -1, stop);
  frontLeg(f, 1, pr, -1);
  // back, seat, the sports bag
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(8, 15, 10 + u);
  f.rect(7, 11 + u, 10, 4 - u);
  f.part('pants', { shade: 'rb', light: 't' });
  f.rect(8, 15, 8, 2);
  f.part('bag', { shade: 'rb', light: 't' });
  f.rows(9, 11 + u, ['.####.', '######', '######', '.####.']);
  f.part('bagline', { flat: true, rim: false });
  f.hl(10, 13, 13 + u);
  f.part('strap', { flat: true, rim: false });
  f.px(9, 10 + u).px(14, 10 + u);
  head(f, p, BIKE_HEAD, 1 + u, 4);
  // carrier, mudguard, reflector, the rear wheel end-on
  f.part('tire', { shade: 'r', light: 't' });
  f.rect(11, 18, 2, GR - 18 + 1);
  f.part('steel', { shade: 'rb', light: 't' });
  f.rect(8, 16, 8, 1);
  f.t(-1).px(9, 17).px(14, 17).t(null);
  f.part('steel', { flat: true, rim: false });
  f.t(1).hl(10, 13, 18).t(null);
  f.part('refl', { flat: true, rim: false });
  f.hl(11, 12, 19);
}

function bikeDraw(f: Fig, p: Pose) {
  if (p.view === 'left') bikeSide(f, p);
  else if (p.view === 'down') bikeFront(f, p);
  else bikeBack(f, p);
}

const BIKE_IDLE: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 2),
  { act: 'wipe', breath: 0 }, { act: 'wipe', breath: 0 }, { act: 'wipe', breath: 1 }, { act: 'wipe', breath: 1 },
  { breath: 0 }, { breath: 0, blink: true }, { breath: 1 }, { breath: 1 },
];

registerChar('npc_walker_bike', () =>
  buildSprite({
    id: 'npc_walker_bike',
    w: 24,
    h: 28,
    mats: BIKE,
    draw: bikeDraw,
    walkFrameMs: 110,
    walkBob: [0, 0, 0, 0],
    idle: { down: BIKE_IDLE, left: BIKE_IDLE, right: BIKE_IDLE, up: rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 4) },
    extras: { wipe: { dirs: ['down', 'left', 'right'] } },
    shadow: 16,
  }),
);

// =============================================================================
// 走る子ども (npc_walker_kid): a first-grader tearing round the park. Blue
// cap, spiky black hair under it, a yellow tee with a red star, denim
// shorts, white sneakers, and a red balloon on a string that trails behind
// him and bobs a beat late. The walk cycle is a run (arms pumping, 2px
// strides). Idle: gets his breath back and tugs the balloon down.
// Canvas 18×24.

const KID: Mats = {
  ...base,
  skin: SKIN_LIGHT,
  hair: HAIR_BLACK,
  cap: mat('#4AA8E0', { shade: '#2F7AB0', light: '#7FD1E8', dark: '#2F4A8A' }),
  brim: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B1733' }),
  capMark: flat('#F4F1E8'),
  tee: mat('#FFD23F', { shade: '#D9A441', light: '#FFE7A3', dark: '#A8742A', rim: '#FFE7A3' }),
  star: flat('#E84E3C'),
  shorts: mat('#4A6AAE', { shade: '#2F4A8A', light: '#7A9AD0', dark: '#243A72' }),
  sock: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8' }),
  sneaker: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  balloon: mat('#E84E3C', { shade: '#B8241E', light: '#FF6A4D', dark: '#8A2E3A', spec: '#FFF6D8' }),
  string: flat('#F4F1E8'),
};

const KID_HEAD: HeadT = {
  faceD: [3, 3, ['.########.', '##########', '##########', '##########', '.########.', '..######..']],
  hairD: [3, 2, ['hh......dd', 'hd......dd', 'd........d']],
  upD: { fringe: 'none' },
  eyesD: { x: 5, d: 5, y: 5, h: 2 },
  mouthD: [7, 7, 2],
  blushD: [4, 11, 7],
  neckD: [7, 9, 2],
  hairU: [3, 2, ['hhhhhhhhdd', 'hhhhhhhhdd', '.dhhhhhdd.']],
  napeU: [4, 5, ['########', '.######.']],
  faceL: [2, 2, ['.#####....', '######....', '######....', '#######...', '#######...', '.#####....', '..###.....']],
  hairL: [3, 2, ['....######', '.....#####', '......##d.']],
  eyeL: { x: 4, y: 5, h: 2 },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 7],
  neckL: [5, 9, 2],
};

const KID_LEGS: LegSpec = { cx: 8, hip: 19, foot: 22, w: 2, gap: 2, mat: 'skin', low: { mat: 'sock', h: 1 }, shoe: 'sneaker', shoeLen: 3 };

function kidCap(f: Fig, p: Pose, hy: number) {
  const y = hy + hatLift(p);
  if (p.view === 'down') {
    f.part('cap', { shade: 'rb', light: 'tl' });
    f.rows(3, y - 1, ['..######..', '.########.', '##########', '##########']);
    f.part('capMark', { flat: true, rim: false });
    f.px(7, y).px(8, y);
    f.part('brim', { shade: 'rb', light: 't' });
    f.rows(3, y + 3, ['.########.']);
    if (p.lookUp) f.t(-1).hl(4, 11, y + 3).t(null);
    return;
  }
  if (p.view === 'up') {
    f.part('cap', { shade: 'rb', light: 'tl' });
    f.rows(3, y - 1, ['..######..', '.########.', '##########', '####..####']);
    f.part('capMark', { flat: true, rim: false });
    f.px(7, y + 2).px(8, y + 2);
    return;
  }
  f.part('cap', { shade: 'rb', light: 'tl' });
  f.rows(2, y - 1, ['...######.', '..########', '.#########', '##########']);
  f.part('brim', { shade: 'rb', light: 't' });
  f.hl(0, 3, y + 3 - (p.lookUp ? 1 : 0));
}

/** Red balloon (5×6 with the knot), top-left at (x, y). */
function balloon(f: Fig, x: number, y: number) {
  f.part('balloon', { shade: 'rb', light: 'tl' });
  f.rows(x, y, ['.###.', '#####', '#####', '#####', '.###.']);
  f.t(2).px(x + 1, y + 1).t(null);
  f.part('balloon', { flat: true, rim: false });
  f.t(-1).px(x + 2, y + 5).t(null);
}

function kidDraw(f: Fig, p: Pose) {
  f.offset(1, 0);
  const run = p.mode === 'walk' || p.mode === 'run';
  const q: Pose = run ? { ...p, run: true } : p;
  const u = upper(q);
  const b = q.bob;
  const hy = 4 + u;
  const tug = p.act === 'tug' && !p.lookUp;
  // the balloon floats a beat behind the body
  const lag = run ? [1, 0, 0, 1][p.step % 4] : p.mode === 'idle' ? (p.tick % 8 < 4 ? 0 : 1) : 0;
  if (p.view === 'down' || p.view === 'up') {
    legs(f, q, KID_LEGS);
    f.part('shorts', { shade: 'rb', light: '' });
    f.rect(4, 17 + b, 8, 2);
    f.erase(7, 18 + b, 2, 1);
    f.part('tee', { shade: 'rb', light: 't' });
    f.rect(4, 13 + u, 8, 17 + b - (13 + u));
    f.rect(3, 13 + u, 1, 2).rect(12, 13 + u, 1, 2);
    if (p.view === 'down') {
      f.part('skin', { shade: '', light: '' });
      f.px(7, 13 + u).px(8, 13 + u);
      f.part('star', { flat: true, rim: false });
      f.px(8, 14 + u).hl(7, 9, 15 + u).px(7, 16 + u).px(9, 16 + u);
    }
    const seg: Seg[] = [{ mat: 'tee', n: 1 }, { mat: 'skin' }];
    hangArms(f, q, { lx: 3, rx: 12, sy: 13, hy: 16, segs: seg }, u);
    // balloon string in his right hand: viewer-left from the front, viewer-right from behind
    const side = p.view === 'down' ? -1 : 1;
    const hx = side < 0 ? 2 : 13;
    const hb = handRow(q, 16, u, side) + (tug ? 1 : 0);
    const bx = side < 0 ? 0 : 11;
    const by = -4 + lag + (tug ? 1 : 0);
    head(f, p, KID_HEAD, hy);
    kidCap(f, p, hy);
    f.part('string', { flat: true, rim: false, ol: false });
    f.line(bx + 2, by + 6, hx, hb - 2);
    balloon(f, bx, by);
    return;
  }
  // side view (facing left), leaning into the run
  const lean = run ? -1 : 0;
  const sw = sideSwing(q);
  sideArm(f, 9 + lean, 13 + u, 3, -sw, [{ mat: 'tee', n: 1 }, { mat: 'skin' }], -1);
  legs(f, q, KID_LEGS);
  f.part('shorts', { shade: 'rb', light: '' });
  f.rect(6, 17 + b, 5, 2);
  f.part('tee', { shade: 'rb', light: 't' });
  f.rect(5 + lean, 13 + u, 6, 17 + b - (13 + u));
  f.part('star', { flat: true, rim: false });
  f.px(5 + lean, 15 + u);
  head(f, p, KID_HEAD, hy, lean);
  f.offset(1 + lean, 0);
  kidCap(f, p, hy);
  f.offset(1, 0);
  f.part('tee', { shade: 'rb', light: 'tl' });
  f.rect(7 + lean, 13 + u, 3, 2);
  const hx = 8 + lean - sw;
  const hb = 15 + u + (sw ? 0 : 1) + (tug ? 1 : 0);
  f.part('skin', { shade: 'r', light: '' });
  f.t(0).line(8 + lean, 15 + u, hx, hb).t(null);
  f.part('skin', { shade: 'rb', light: 't' });
  f.rect(hx - 1, hb - 1, 2, 2);
  // the balloon trails behind him on its string
  const bx = run ? 11 : 10;
  const by = (run ? -2 : -4) + lag + (tug ? 1 : 0);
  f.part('string', { flat: true, rim: false, ol: false });
  f.line(bx + 2, by + 6, hx, hb - 1);
  balloon(f, bx, by);
}

const KID_IDLE: IdleKey[] = [
  // quick breaths after the run
  ...rep([{ breath: 0 }, { breath: 1 }], 3),
  { act: 'tug', breath: 0 }, { act: 'tug', breath: 1 }, { breath: 0 }, { act: 'tug', breath: 1 },
  { breath: 0, blink: true }, { breath: 1 },
];

registerChar('npc_walker_kid', () =>
  buildSprite({
    id: 'npc_walker_kid',
    w: 18,
    mats: KID,
    draw: kidDraw,
    walkFrameMs: 95,
    idle: KID_IDLE,
    idleFrameMs: 180,
    extras: { tug: { dirs: ['down', 'left', 'right'] } },
    shadow: 9,
  }),
);
