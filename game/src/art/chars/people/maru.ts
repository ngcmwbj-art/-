// マル (npc_maru, 10_narrative 6.24 / 50_ch2_story 3.2・10.16 / 30_level_art 9.x /
// 52 10.3): トマじい（とまたろう）の妻、89歳。村の12人の1人で、いまは町の娘の
// ところから星見台へ帰る途中。小柄（帽子の上から足まで19px）で、背すじは
// のびている（52 10.0：年寄りは品よく、大げさに腰を曲げない）。
//
//  - 見分けの鍵：うす紫の布の日よけ帽（ふちがぐるりと下がる、白いリボン）と、
//    えんじの手押し車（シルバーカー）。おばあ（白い割烹着・白いおだんご・赤い
//    もんぺ）と一目で分かれるよう、服は紺の絣（白い点）のブラウスに、こげ茶の
//    もんぺ、灰色の靴。顔は日焼けした丸顔、細い目、ほほに赤み。
//  - 手押し車はいつもいっしょ（絵の一部）。えんじの布のかご（小さな花の柄）、
//    銀の枠、黒い握り、4つの小さな車輪。歩くときは前に押し、座るときは
//    かごのふたに腰かけて、握りは背中のうしろ。
//  - キャンバス 32×26：人は16×24の座標で描いて (8,2) ずらす。横向きでは
//    手押し車が前（左）に出る。足もとがアクターの位置（下のまん中）。
//
// 待機（立ち）：手押し車に手をかけて息をする → 行き先の方を見る。
// 'sit'（持続のポーズ、4方向）：かごに腰かけて息をする → 腕時計を見る
// （'sit_watch'）。extras：'give'（白い袋〈たかしの焼きそば〉をさし出す、
// 下と横）、'bow'（小さく会釈、下と横）、look_up。

import { flat, mat, type Fig, type Mats, type RowMap } from '../fig';
import { legs, sitLegs, type LegSpec } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { head, upper, type HeadT } from '../kit';
import { BASE2, HAIR_GREY, SKIN_FARM } from './hoshi_kit';

const T: RowMap = { h: [null, 0], H: [null, 1], d: [null, -1], D: [null, -2], K: [null, 2] };

const MARU: Mats = {
  ...BASE2,
  skin: SKIN_FARM,
  hair: HAIR_GREY,
  blush: flat('#E8A08C'),
  hat: mat('#A890C8', { shade: '#7E6AA0', light: '#C8B8E0', dark: '#584878' }),
  ribbon: flat('#F4F1E8'),
  blouse: mat('#2F4A8A', { shade: '#223668', light: '#4766A8', dark: '#162048' }),
  kasuri: flat('#C8CDD4'),
  monpe: mat('#6A5A4A', { shade: '#4A3E32', light: '#8A7A66', dark: '#34281E' }),
  shoe: mat('#6B7186', { shade: '#4A5068', light: '#8E95A6', dark: '#3A3F48' }),
  bag: mat('#8A2E3A', { shade: '#5A1E2A', light: '#B04A5A', dark: '#3A1420' }),
  print: flat('#F59AB0'),
  frame: mat('#C8CDD4', { shade: '#9AA0A8', light: '#E8E4D8', dark: '#6B7186' }),
  grip: flat('#3A3F48'),
  wheel: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
  sack: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8' }),
  peach: flat('#E0567A'),
};

const HEAD: HeadT = {
  // a small round face under the hat brim; the grey perm curls out at the sides
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 3, ['hh......hh', 'hd......dh', '.d......d.']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, closed: true },
  mouthD: [7, 7, 2],
  blushD: [5, 10, 6],
  neckD: [7, 9, 2],
  hairU: [3, 2, ['hhhhhhhhhh', 'hhhhhhhhhh', 'hhhhhhhhhd', '.dhhhhhhd.']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.#####..', '######..', '#######.', '######..', '.#####..', '..###...']],
  hairL: [7, 3, ['hhhd', 'hhhd', '.hhd']],
  eyeL: { x: 4, y: 5, h: 1, closed: true },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 7],
  neckL: [5, 9, 2],
  upD: { fringe: 'none', openEyes: true },
  hairOpts: { shade: '', light: '' },
};

/** The lavender sun hat: a round crown, a white ribbon, the soft brim drooping all round. */
function hat(f: Fig, view: 'down' | 'up' | 'left', hy: number): void {
  f.part('hat', { flat: true });
  if (view === 'left') {
    f.rows(4, hy - 1, ['..HHhh..', '.HHhhhhd', 'Hhhhhhhd'], T);
    // the brim: long in front (left), shorter behind
    f.rows(0, hy + 2, ['.Hhhhhhhhhhhd', 'd..........dd'], T);
    f.part('ribbon', { flat: true, rim: false });
    f.hl(5, 11, hy + 1);
    f.px(12, hy + 2);
    return;
  }
  f.rows(4, hy - 1, ['..HHhh..', '.HHhhhhd', 'Hhhhhhhd'], T);
  f.rows(2, hy + 2, ['HHhhhhhhhhhd', 'd..........d'], T);
  f.part('ribbon', { flat: true, rim: false });
  f.hl(4, 11, hy + 1);
  // from behind: the ribbon's two tails
  if (view === 'up') f.px(9, hy + 2).px(10, hy + 3);
}

/** The kasuri blouse's white specks over a rect (a sparse diagonal pattern). */
function kasuri(f: Fig, x0: number, x1: number, y0: number, y1: number): void {
  f.part('kasuri', { flat: true, rim: false });
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x * 3 + y * 2) % 7 === 0) f.px(x, y);
}

const LEGS: LegSpec = { cx: 8, hip: 20, foot: 22, w: 2, gap: 2, mat: 'monpe', low: { mat: 'monpe', h: 1 }, shoe: 'shoe', shoeLen: 3 };

// ---- the walker (シルバーカー) ----------------------------------------------------------

/** Four small wheels: two at (x0, y) and (x1, y), 2×2. */
function wheels(f: Fig, xs: number[], y: number, shift = 0): void {
  f.part('wheel', { shade: 'rb', light: 't', shift });
  for (const x of xs) f.rect(x, y, 2, 2);
}

/** The bag of the walker seen from the front (w×h at (x, y)), its lid a lighter row, sprigs of pink. */
function bagFront(f: Fig, x: number, y: number, w: number, h: number): void {
  f.part('bag', { shade: 'rb', light: 't' });
  f.rect(x, y, w, h);
  f.part('bag', { flat: true });
  f.t(1).hl(x, x + w - 1, y).t(null);
  f.t(-1).hl(x + 1, x + w - 2, y + 1).t(null);
  f.part('print', { flat: true, rim: false });
  for (let j = 2; j < h - 1; j += 2) for (let i = 1 + (j / 2) % 2; i < w - 1; i += 3) f.px(x + i, y + j);
}

/** Front view, pushing it toward us: the bar at y 16, the bag in front of her legs. */
function cartFront(f: Fig): void {
  f.part('frame', { shade: 'r', light: '' });
  f.vl(3, 16, 21).vl(12, 16, 21);
  bagFront(f, 3, 17, 10, 5);
  f.part('frame', { shade: '', light: 't' });
  f.hl(3, 12, 16);
  f.part('grip', { flat: true });
  f.hl(4, 5, 16).hl(10, 11, 16);
  wheels(f, [2, 12], 21);
}

/** Back view, the walker ahead of her (behind her in the picture): the bag's edges and the far wheels. */
function cartBack(f: Fig): void {
  bagFront(f, 2, 14, 12, 5);
  wheels(f, [1, 13], 18, -1);
  f.part('frame', { shade: 'r', light: '', shift: -1 });
  f.vl(2, 17, 21).vl(13, 17, 21);
  f.hl(2, 13, 15);
  f.part('grip', { flat: true });
  f.hl(2, 3, 15).hl(12, 13, 15);
  wheels(f, [1, 13], 21, -1);
}

/** Side view facing left, the walker ahead: the bag at x −8..−1, the handle rising back to the grip at (1, 13). */
function cartSide(f: Fig): void {
  // far wheels and frame first
  wheels(f, [-7, -2], 20, -1);
  f.part('bag', { shade: 'rb', light: 't' });
  f.rect(-8, 15, 8, 5);
  f.part('bag', { flat: true });
  f.t(1).hl(-8, -1, 15).t(null);
  f.part('print', { flat: true, rim: false });
  f.px(-6, 17).px(-3, 17).px(-5, 19).px(-2, 19);
  f.part('frame', { shade: 'r', light: '' });
  f.line(-1, 20, -1, 16);
  f.line(-1, 16, 1, 13);
  f.vl(-8, 19, 21);
  f.part('grip', { flat: true });
  f.hl(1, 2, 13);
  wheels(f, [-9, -3], 21);
}

/** Seated, front: the bag under her, the frame's two posts up behind her back to the bar at y 16. */
function cartSitFront(f: Fig): void {
  f.part('frame', { shade: 'r', light: '', shift: -1 });
  f.vl(2, 15, 21).vl(13, 15, 21);
  f.part('grip', { flat: true });
  f.px(2, 15).px(13, 15);
  bagFront(f, 3, 19, 10, 3);
  wheels(f, [2, 12], 21);
}

/** Seated, back: the bar and its posts are nearest to us, over her back. */
function cartSitBackUnder(f: Fig): void {
  bagFront(f, 3, 19, 10, 3);
  wheels(f, [2, 12], 21, -1);
}
function cartSitBackOver(f: Fig): void {
  f.part('frame', { shade: 'r', light: 't' });
  f.vl(2, 16, 21).vl(13, 16, 21);
  f.hl(2, 13, 16);
  f.part('grip', { flat: true });
  f.hl(2, 3, 16).hl(12, 13, 16);
}

/** Seated, side (facing left): the bag under her at x 3..12, the handle behind her (right). */
function cartSitSide(f: Fig): void {
  wheels(f, [4, 10], 21, -1);
  f.part('frame', { shade: 'r', light: '' });
  f.line(12, 19, 14, 14);
  f.part('grip', { flat: true });
  f.hl(14, 15, 14);
  f.part('bag', { shade: 'rb', light: 't' });
  f.rect(3, 18, 10, 4);
  f.part('bag', { flat: true });
  f.t(1).hl(3, 12, 18).t(null);
  f.part('print', { flat: true, rim: false });
  f.px(5, 20).px(8, 20).px(11, 20);
  wheels(f, [3, 11], 21);
}

// ---- the white bag of たかし's yakisoba (give) ----------------------------------------------

function sack(f: Fig, x: number, y: number): void {
  f.part('sack', { shade: 'rb', light: 't' });
  f.rows(x, y, ['.#.#.', '#####', '#####', '#####']);
  f.part('peach', { flat: true, rim: false });
  f.px(x + 2, y + 2);
}

// ---- the figure ------------------------------------------------------------------------------

/** A copy of the pose with another act (never reads p.tick: the idle frames stay shared). */
function withAct(p: Pose, act: string, lookUp = p.lookUp): Pose {
  return {
    view: p.view, dir: p.dir, mirror: p.mirror, step: p.step, run: p.run, bob: p.bob, breath: p.breath,
    blink: p.blink, blinkClosed: p.blinkClosed, lookUp, act, ph: p.ph, tick: 0, mode: p.mode,
  };
}

function isSit(p: Pose): boolean {
  return p.act === 'sit' || p.act === 'sit_watch' || p.act === 'sit_look';
}

function frontStand(f: Fig, p: Pose): void {
  const u = upper(p);
  const b = p.bob;
  const hy = 5 + u;
  const give = p.act === 'give';
  const bow = p.act === 'bow' ? 1 : 0;
  legs(f, p, LEGS);
  f.part('monpe', { shade: 'rb', light: '' });
  f.rect(4, 18 + b, 8, 2);
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(5, 10, 14 + u + bow);
  f.rect(4, 15 + u + bow, 8, 18 + b - (15 + u + bow));
  kasuri(f, 4, 11, 15 + u + bow, 17 + b);
  // arms forward to the bar (the hands stay on the grips while she bobs)
  f.part('blouse', { shade: 'rb', light: 't' });
  f.vl(3, 15 + u + bow, 15).vl(12, 15 + u + bow, 15);
  cartFront(f);
  f.part('skin', { shade: 'rb', light: 't' });
  if (give) {
    // one hand off the bar holding out the white bag
    f.rect(4, 16, 2, 1);
    sack(f, 9, 13);
    f.rect(9, 15, 2, 1);
  } else f.rect(4, 16, 2, 1).rect(10, 16, 2, 1);
  head(f, p, HEAD, hy + bow);
  if (!p.lookUp) f.retone(5, hy + bow + 3, -1, 6, 1); // the brim's shade on her brow
  hat(f, 'down', hy + bow);
}

function backStand(f: Fig, p: Pose): void {
  const u = upper(p);
  const b = p.bob;
  const hy = 5 + u;
  cartBack(f);
  legs(f, p, LEGS);
  f.part('monpe', { shade: 'rb', light: '' });
  f.rect(4, 18 + b, 8, 2);
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(5, 10, 14 + u);
  f.rect(4, 15 + u, 8, 18 + b - (15 + u));
  kasuri(f, 4, 11, 15 + u, 17 + b);
  // elbows out to the grips at her sides
  f.part('blouse', { shade: 'rb', light: 't', shift: -1 });
  f.px(3, 15 + u).px(12, 15 + u);
  f.part('skin', { shade: 'rb', light: 't', shift: -1 });
  f.px(3, 16).px(12, 16);
  head(f, p, HEAD, hy);
  hat(f, 'up', hy);
}

function sideStand(f: Fig, p: Pose): void {
  const u = upper(p);
  const b = p.bob;
  const bow = p.act === 'bow' ? 1 : 0;
  const give = p.act === 'give';
  // she leans a little into the walker when she walks
  const lean = p.mode === 'walk' ? 1 : 0;
  const hy = 5 + u + bow;
  cartSide(f);
  legs(f, p, { ...LEGS, cx: 8 });
  f.part('monpe', { shade: 'rb', light: '' });
  f.rect(5, 18 + b, 6, 2);
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(6 - lean, 9 - lean, 14 + u + bow);
  f.rect(5 - lean, 15 + u + bow, 6, 18 + b - (15 + u + bow));
  kasuri(f, 5 - lean, 10 - lean, 15 + u + bow, 17 + b);
  // the near arm out to the grip (or holding out the bag)
  f.part('blouse', { shade: 'rb', light: 'tl' });
  if (give) {
    f.hl(3, 6, 15 + u + bow);
    sack(f, -1, 13 + u + bow);
    f.part('skin', { shade: 'rb', light: 't' });
    f.px(2, 15 + u + bow);
  } else {
    f.line(6 - lean, 15 + u + bow, 3, 14);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(1, 13, 2, 1);
  }
  head(f, p, HEAD, hy - lean);
  if (!p.lookUp) f.retone(3, hy - lean + 3, -1, 5, 1);
  hat(f, 'left', hy - lean);
}

function frontSit(f: Fig, p: Pose): void {
  const u = upper(p);
  const hy = 7 + u;
  const watch = p.act === 'sit_watch';
  cartSitFront(f);
  sitLegs(f, p, LEGS, 19);
  f.part('monpe', { shade: 'rb', light: '' });
  f.rect(4, 18, 8, 2);
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(5, 10, 16 + u);
  f.rect(4, 17 + u, 8, 18 - (17 + u) + 1);
  kasuri(f, 4, 11, 17 + u, 18);
  // hands folded on her lap — or the left wrist up to the eyes: the watch
  f.part('blouse', { shade: 'rb', light: 't' });
  f.vl(3, 17 + u, 18).vl(12, 17 + u, 18);
  f.part('skin', { shade: 'rb', light: 't' });
  if (watch) {
    f.rect(5, 19, 2, 1);
    f.part('blouse', { shade: 'rb', light: 't' });
    f.px(11, 16 + u).px(11, 15 + u);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(9, 14 + u, 2, 1);
    f.part('grip', { flat: true, rim: false });
    f.px(10, 15 + u);
  } else f.rect(5, 19, 2, 1).rect(9, 19, 2, 1);
  head(f, watch ? withAct(p, '') : p, HEAD, hy);
  if (!p.lookUp) f.retone(5, hy + 3, -1, 6, 1);
  hat(f, 'down', hy);
}

function backSit(f: Fig, p: Pose): void {
  const u = upper(p);
  const hy = 7 + u;
  cartSitBackUnder(f);
  f.part('monpe', { shade: 'rb', light: '' });
  f.rect(4, 18, 8, 3);
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(5, 10, 16 + u);
  f.rect(4, 17 + u, 8, 18 - (17 + u) + 1);
  kasuri(f, 4, 11, 17 + u, 18);
  f.part('blouse', { shade: 'rb', light: 't', shift: -1 });
  f.vl(3, 17 + u, 18).vl(12, 17 + u, 18);
  head(f, p, HEAD, hy);
  hat(f, 'up', hy);
  cartSitBackOver(f);
}

function sideSit(f: Fig, p: Pose): void {
  const u = upper(p);
  const hy = 7 + u;
  const look = p.act === 'sit_look';
  cartSitSide(f);
  sitLegs(f, p, { ...LEGS, cx: 9 }, 18);
  f.part('monpe', { shade: 'rb', light: '' });
  f.rect(6, 17, 5, 2);
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(7, 9, 16 + u);
  f.rect(6, 17 + u, 5, 17 - (17 + u) + 1);
  kasuri(f, 6, 10, 16 + u, 17);
  f.part('blouse', { shade: 'rb', light: 'tl' });
  f.line(7, 17 + u, 5, 18);
  f.part('skin', { shade: 'rb', light: 't' });
  f.rect(3, 18, 2, 1);
  const hp = look ? withAct(p, 'sit_look', false) : p;
  head(f, hp, HEAD, hy + (look ? -1 : 0), 1);
  if (!p.lookUp) f.retone(4, hy + 3 + (look ? -1 : 0), -1, 5, 1);
  f.offset(f.ox + 1, f.oy);
  hat(f, 'left', hy + (look ? -1 : 0));
  f.offset(f.ox - 1, f.oy);
}

function maruDraw(f: Fig, p: Pose): void {
  f.offset(8, 2);
  const sit = isSit(p);
  if (p.view === 'down') (sit ? frontSit : frontStand)(f, p);
  else if (p.view === 'up') (sit ? backSit : backStand)(f, p);
  else (sit ? sideSit : sideStand)(f, p);
}

// standing with the walker: breathes, now and then looks up the road (≈4 s)
const STAND_IDLE: IdleKey[] = [...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 3), { breath: 0, blink: true }, { breath: 0 }, { breath: 1 }, { breath: 1 }];
// seated on it: breathes, blinks, and every so often looks at her wristwatch (≈7 s)
const SIT_FRONT: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 3),
  { breath: 0, blink: true },
  { act: 'sit_watch', breath: 0 }, { act: 'sit_watch', breath: 0 }, { act: 'sit_watch', breath: 0 }, { act: 'sit_watch', breath: 0, blink: true },
  { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 },
  { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 0, blink: true },
];
// side: now and then she leans to look down the lane for the bus
const SIT_SIDE: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 2),
  { act: 'sit_look' }, { act: 'sit_look' }, { act: 'sit_look' }, { act: 'sit_look', blink: true }, { act: 'sit_look' },
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 3),
  { breath: 0, blink: true },
];

registerChar('npc_maru', () =>
  buildSprite({
    id: 'npc_maru',
    w: 32,
    h: 26,
    mats: MARU,
    draw: maruDraw,
    // a small, careful step behind the walker
    walkFrameMs: 200,
    idle: { down: STAND_IDLE, up: breathingIdle(), left: STAND_IDLE, right: STAND_IDLE },
    extras: {
      give: { dirs: ['down', 'left', 'right'] },
      bow: { dirs: ['down', 'left', 'right'] },
    },
    poses: {
      sit: { down: SIT_FRONT, up: breathingIdle().map((k) => ({ ...k, act: 'sit' })), left: SIT_SIDE, right: SIT_SIDE },
    },
    shadow: 18,
    keep: ['#A890C8', '#8A2E3A', '#F59AB0'],
  }),
);
