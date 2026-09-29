// 畦道の先の 円筒分水の 2人（map_aze、10_narrative 6.26、30_level_art 9.3、02 #67）:
//   npc_yone     よね — 夕鳴町、70代の女性。水見の 格好：麦わら帽子（桃色の 帯）の 下に 桃色の
//                手ぬぐい（首の うしろへ たらす、白い 柄）、白髪、水色の ブラウスに 紺の 腕カバー、
//                紺ねずみの 作業ズボン、緑の ゴム長靴。水筒（ステンレス、赤い ふたが コップ）の 持ち主。
//   npc_toyozou  とよぞう — となり町、70代の男性。紺の 作業帽、首に 白い タオル、
//                カーキの 作業シャツ、こげ茶の ズボン、黒い ゴム長靴。日に焼けた 顔、
//                太い 白まゆと 無精ひげ。
// 2人は 境の石（prop_aze_bench）の 上の ベンチに 背中あわせで 座る。とよぞうは 西を、
// よねは 東を 向く（どちらも 横顔。noTurn）。石の 上に 水筒の ふたの コップ（ベンチの絵）。
// キャンバス 32×26：人は 16×24 の 座標で 描いて (8,2) ずらす（背中の うしろ、石の 上まで
// 手と 水筒が 届く ように）。
//
// 持続のポーズ（events/aze.ts が 段階と 水筒の 持ち主で 決める）：
//   'sit'   座って 息をする（ひざに 手）      'sit_t'  水筒を ひざに 立てて 持つ
// 動き（anims、左右）：
//   'pour'  水筒を 肩ごしに うしろへ かたむけて、石の 上の コップに 注ぐ（段階1は 'pour_hold'）
//   'sip'   うしろの 石の 上の コップを 取って 飲み、もどす（段階1は 'reach_hold'：手を のばした まま）
// look_up（17:00 の 見上げ）は ほかの 人と 同じ。

import { flat, mat, type Fig, type Mats } from '../fig';
import { SKIN_MID, SKIN_TAN } from '../mats';
import { sitLegs, type LegSpec } from '../body';
import { buildSprite, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { HAIRMAP, head, upper, type HeadT } from '../kit';

const T = HAIRMAP;

const base = {
  eye: flat('#2A2440'),
  mouth: flat('#2A2440'),
  // the stainless flask (its red cap is the cup: it sits on the stone, prop_aze_bench),
  // its open mouth / inner stopper, and the tea
  flask: mat('#C8CDD4', { shade: '#9AA0A8', light: '#E8E4D8', dark: '#6B7186' }),
  cap: flat('#3A3F48'),
  tea: flat('#D9A441'),
  teaLt: flat('#F6D98A'),
  cup: mat('#E8E4D8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
};

// ============================================================================ よね

const YONE: Mats = {
  ...base,
  skin: SKIN_MID,
  hair: mat('#B8B2AC', { shade: '#8E887E', light: '#D8D2CA', dark: '#6E685E' }),
  straw: mat('#E8C878', { shade: '#C8A050', light: '#F6E0A0', dark: '#8A6A34' }),
  band: flat('#E0567A'),
  towel: mat('#F0B4BE', { shade: '#D08A98', light: '#FFD8DE', dark: '#A8606E' }),
  dot: flat('#FFF6D8'),
  blouse: mat('#8CBCDC', { shade: '#6A96BA', light: '#B8DAEE', dark: '#4A6E96' }),
  sleeve: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B2750' }),
  pants: mat('#4E5670', { shade: '#3C4258', light: '#6A7290', dark: '#2A2E40' }),
  boot: mat('#5FA85A', { shade: '#3E7A40', light: '#8ECC7A', dark: '#2A5A2E' }),
  blush: flat('#F4A08C'),
  brow: flat('#8E887E'),
};

const YONE_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 3, ['h........h', 'd........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, closed: true, brow: { dy: -1, mat: 'brow', w: 1 } },
  mouthD: [7, 7, 2],
  blushD: [5, 10, 6],
  neckD: [7, 9, 2],
  hairU: [3, 2, ['hhhhhhhhhh', 'hhhhhhhhhd', '.hhhhhhhd.']],
  napeU: [5, 5, ['######', '.####.']],
  faceL: [3, 3, ['.#####..', '######..', '#######.', '######..', '.#####..', '..###...']],
  hairL: [7, 3, ['hd', 'hd']],
  eyeL: { x: 4, y: 5, h: 1, closed: true, brow: { dy: -1, mat: 'brow', w: 1 } },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 7],
  neckL: [5, 9, 2],
  upD: { fringe: 'none', openEyes: true },
  hairOpts: { shade: '', light: '' },
};

/**
 * The straw hat over a pink tenugui: the wide brim round the crown (a pink
 * band), the cloth under it hanging down over the nape against the sun
 * (white dots of its print). Grey hair shows at the temple.
 */
function strawHat(f: Fig, view: 'down' | 'up' | 'left', hy: number): void {
  if (view === 'left') {
    // the tenugui behind the ear, down to the collar
    f.part('towel', { shade: 'rb', light: 't' });
    f.rows(8, hy + 2, ['hhhd', '.hhd', '.hhd', '.hhd', '..hd'], T);
    f.part('dot', { flat: true, rim: false, ol: false });
    f.px(9, hy + 4).px(10, hy + 6);
    // the hat: crown, band, the brim out front and behind
    f.part('straw', { shade: 'rb', light: 't' });
    f.rows(4, hy - 1, ['.HHhhd', 'Hhhhhd'], T);
    f.rows(0, hy + 2, ['.Hhhhhhhhhhhd', 'dd.........dd'], T);
    f.part('band', { flat: true, rim: false });
    f.hl(4, 9, hy + 1);
    return;
  }
  f.part('towel', { shade: 'rb', light: 't' });
  if (view === 'down') f.rows(2, hy + 3, ['hh........hd', 'h..........d', 'h..........d', 'hd........dd']);
  else f.rows(2, hy + 3, ['hhhhhhhhhhhd', '.hhhhhhhhhd.', '.hhhhhhhhhd.', '..hhhhhhdd..']);
  f.part('dot', { flat: true, rim: false, ol: false });
  if (view === 'up') f.px(5, hy + 4).px(9, hy + 5).px(7, hy + 3);
  f.part('straw', { shade: 'rb', light: 't' });
  f.rows(4, hy - 1, ['.HHhhhhd', 'Hhhhhhhd'], T);
  f.rows(0, hy + 2, ['.Hhhhhhhhhhhhhd.', 'dd............dd'], T);
  f.part('band', { flat: true, rim: false });
  f.hl(4, 11, hy + 1);
}

// ============================================================================ とよぞう

const TOYO: Mats = {
  ...base,
  skin: SKIN_TAN,
  hair: mat('#BCC2C8', { shade: '#9AA0A8', light: '#E8E4D8', dark: '#747A88' }),
  capm: mat('#2F3F62', { shade: '#223050', light: '#4A5A80', dark: '#161F38' }),
  towel: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFF6D8', dark: '#9E978C' }),
  shirt: mat('#A8946A', { shade: '#86724E', light: '#C8B488', dark: '#5E4E34' }),
  pants: mat('#5A4636', { shade: '#443428', light: '#76604C', dark: '#2E2218' }),
  boot: mat('#3A3F48', { shade: '#2A2E36', light: '#5A606C', dark: '#1B1E24' }),
  brow: flat('#E8E4D8'),
  stubble: flat('#9E8878'),
};

const TOYO_HEAD: HeadT = {
  faceD: [4, 2, ['.######.', '########', '########', '########', '########', '.######.']],
  hairD: [3, 2, ['h........d', 'h........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  mouthD: [7, 7, 2],
  neckD: [7, 8, 2],
  hairU: [3, 2, ['hhhhhhhhhd', 'hhhhhhhhhd', '.hhhhhhhd.']],
  napeU: [5, 5, ['######', '.####.']],
  faceL: [3, 2, ['.#####..', '######..', '#######.', '######..', '######..', '.####...']],
  hairL: [7, 2, ['.hhd', 'hhhd', 'hhd.']],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 8, 2],
  upD: { fringe: 'none' },
};

/** The work cap: a round crown, the peak out over the brow. */
function workCap(f: Fig, view: 'down' | 'up' | 'left', hy: number): void {
  f.part('capm', { shade: 'rb', light: 't' });
  if (view === 'left') {
    f.rows(4, hy, ['.HHhhh..', 'Hhhhhhhd', 'hhhhhhhd'], T);
    f.rows(0, hy + 3, ['Hhhhhd'], T);
    return;
  }
  f.rows(3, hy, ['..HHhhhh..', '.Hhhhhhhhd', 'Hhhhhhhhhd'], T);
  if (view === 'down') f.rows(3, hy + 3, ['Hhhhhhhhhd']);
}

// ============================================================================ the seated figure (both)

interface Kind {
  head: HeadT;
  hat: (f: Fig, view: 'down' | 'up' | 'left', hy: number) => void;
  top: string;
  arm: string;
  woman: boolean;
}

const YK: Kind = { head: YONE_HEAD, hat: strawHat, top: 'blouse', arm: 'sleeve', woman: true };
const TK: Kind = { head: TOYO_HEAD, hat: workCap, top: 'shirt', arm: 'shirt', woman: false };

const LEGS: LegSpec = { cx: 9, hip: 17, foot: 23, w: 2, gap: 2, mat: 'pants', low: { mat: 'boot', h: 3 }, shoe: 'boot', shoeLen: 3 };

/** Seat row (the thighs' top): world 202 with the bench's plank. */
const SEAT = 18;

/**
 * The cup on the stone behind them (figure coords of either sitter, left view:
 * behind = +x): its rim on row 10, x 14–17 (world 198–201 over the stone).
 * The tea falls at x 16.
 */
const CUP = { x: 16, rim: 10 };

/** The flask: a stainless cylinder with a red cap, from its base (bx, by) up along (dx, dy) per step, n steps. */
function flask(f: Fig, pts: [number, number][], capAt: [number, number][]): void {
  f.part('flask', { shade: 'r', light: 't' });
  for (const [x, y] of pts) f.px(x, y);
  f.part('cap', { shade: 'r', light: 't' });
  for (const [x, y] of capAt) f.px(x, y);
}

/** The tea stream from the flask's mouth down into the cup on the stone. */
function stream(f: Fig, x: number, y0: number, y1: number): void {
  f.part('tea', { flat: true, rim: false });
  for (let y = y0; y <= y1; y++) f.px(x, y);
  f.part('teaLt', { flat: true, rim: false, ol: false });
  f.px(x, y0).px(x, y0 + 2);
}

function sideDraw(f: Fig, p: Pose, k: Kind): void {
  const u = upper(p);
  const hy = 5 + u;
  const act = p.act;
  const withFlask = act === 'sit_t';
  // legs, hips
  sitLegs(f, p, LEGS, SEAT);
  f.part('pants', { shade: 'rb', light: 't' });
  f.rect(6, SEAT - 1, 6, 2);
  // torso (the back at x 11): shoulders at hy + 8
  const sh = hy + 8;
  f.part(k.top, { shade: 'rb', light: 't' });
  f.hl(7, 10, sh);
  f.rect(6, sh + 1, 6, SEAT - (sh + 1));
  if (k.woman) {
    // the blouse's little print
    f.part('dot', { flat: true, rim: false, ol: false });
    f.px(7, sh + 2).px(10, sh + 3).px(8, sh + 5);
  } else {
    // the towel round the neck, its end hanging in front
    f.part('towel', { shade: 'rb', light: 't' });
    f.hl(6, 10, sh).px(5, sh + 1).px(5, sh + 2);
  }
  // ---- the arm (the near one): by the act
  const armMat = k.arm;
  if (act === 'pour' || act === 'pour_hold') {
    // up and back over the shoulder, the flask tipped down toward the cup on the stone
    const lift = act === 'pour' && p.ph === 0;
    f.part(armMat, { shade: 'rb', light: 't' });
    f.line(10, sh + 1, 12, sh - 2).line(12, sh - 2, 13, sh - 5);
    f.part('skin', { shade: 'rb', light: 't' });
    f.px(13, sh - 6).px(14, sh - 6);
    if (lift) {
      // lifting: the flask still upright in the raised hand
      flask(f, [[13, sh - 7], [14, sh - 7], [13, sh - 8], [14, sh - 8], [13, sh - 9], [14, sh - 9]], [[13, sh - 10], [14, sh - 10]]);
    } else {
      // tipped: the bottom up by the hat, the mouth down-back over the cup, the tea falling
      flask(f, [[12, sh - 10], [13, sh - 10], [13, sh - 9], [14, sh - 9], [14, sh - 8], [15, sh - 8]], [[15, sh - 7], [16, sh - 7]]);
      stream(f, CUP.x, sh - 6, CUP.rim - 1);
    }
  } else if (act === 'sip') {
    // ph 0: reach back to the cup on the stone; ph 1: the cup at the mouth
    if (p.ph === 0) {
      f.part(armMat, { shade: 'rb', light: 't' });
      f.line(9, sh + 1, 12, sh + 2).line(12, sh + 2, 13, sh);
      f.part('skin', { shade: 'rb', light: 't' });
      f.px(14, CUP.rim + 1).px(14, CUP.rim);
    } else {
      f.part(armMat, { shade: 'rb', light: 't' });
      f.line(8, sh + 1, 6, sh + 2).line(6, sh + 2, 4, sh);
      f.part('skin', { shade: 'rb', light: 't' });
      f.px(3, sh).px(3, sh - 1);
      f.part('cup', { shade: 'r', light: 't' });
      f.rect(1, hy + 6, 2, 3);
      f.part('tea', { flat: true, rim: false, ol: false });
      f.px(2, hy + 6);
    }
  } else if (act === 'reach_hold') {
    // stage 1: reaching back for the cup, the hand held open over it
    f.part(armMat, { shade: 'rb', light: 't' });
    f.line(9, sh + 1, 12, sh + 1).line(12, sh + 1, 13, sh - 1);
    f.part('skin', { shade: 'rb', light: 't' });
    f.px(14, CUP.rim - 1).px(15, CUP.rim - 2);
  } else {
    // resting: the forearm on the thigh, the hand on the knee (or round the flask)
    f.part(armMat, { shade: 'rb', light: 'tl' });
    f.line(8, sh + 1, 7, SEAT - 2).line(7, SEAT - 2, 5, SEAT - 1);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(3, SEAT - 1, 2, 1);
    if (withFlask) {
      // the flask stood on the thighs, held in front of the belly
      flask(f, [[5, SEAT - 2], [6, SEAT - 2], [5, SEAT - 3], [6, SEAT - 3], [5, SEAT - 4], [6, SEAT - 4]], [[5, SEAT - 5], [6, SEAT - 5]]);
      f.part('skin', { shade: 'rb', light: 't' });
      f.px(7, SEAT - 3);
    }
  }
  // ---- head and hat
  const hp = act === 'sip' && p.ph === 1 ? { ...p, act: 'happy' } : p;
  head(f, hp, k.head, hy);
  if (!k.woman && !p.lookUp) {
    // stubble along the jaw
    f.part('stubble', { flat: true, rim: false, ol: false });
    f.px(4, hy + 7).px(6, hy + 6).px(5, hy + 7);
  }
  k.hat(f, 'left', hy - (p.lookUp ? 1 : 0));
}

function frontDraw(f: Fig, p: Pose, k: Kind): void {
  const u = upper(p);
  const hy = 5 + u;
  const sh = hy + 8;
  sitLegs(f, p, LEGS, SEAT);
  f.part('pants', { shade: 'rb', light: 't' });
  f.rect(3, SEAT - 1, 10, 2);
  f.part(k.top, { shade: 'rb', light: 't' });
  f.hl(4, 11, sh);
  f.rect(3, sh + 1, 10, SEAT - (sh + 1));
  if (!k.woman) {
    f.part('towel', { shade: 'rb', light: 't' });
    f.hl(5, 10, sh).px(5, sh + 1).px(10, sh + 1).px(5, sh + 2);
  } else {
    f.part('dot', { flat: true, rim: false, ol: false });
    f.px(5, sh + 2).px(9, sh + 3).px(7, sh + 4);
  }
  // hands on the knees (or round the flask on the lap)
  f.part(k.arm, { shade: 'rb', light: 't' });
  f.vl(2, sh + 1, SEAT - 2).vl(13, sh + 1, SEAT - 2);
  f.part('skin', { shade: 'rb', light: 't' });
  f.rect(3, SEAT - 1, 2, 1).rect(11, SEAT - 1, 2, 1);
  if (p.act === 'sit_t') {
    f.part('flask', { shade: 'r', light: 't' });
    f.rect(7, SEAT - 4, 2, 3);
    f.part('cap', { shade: 'r', light: 't' });
    f.hl(7, 8, SEAT - 5);
  }
  head(f, p, k.head, hy);
  k.hat(f, 'down', hy - (p.lookUp ? 1 : 0));
}

function backDraw(f: Fig, p: Pose, k: Kind): void {
  const u = upper(p);
  const hy = 5 + u;
  const sh = hy + 8;
  f.part('pants', { shade: 'rb', light: 't' });
  f.rect(3, SEAT - 1, 10, 3);
  f.part(k.top, { shade: 'rb', light: 't' });
  f.hl(4, 11, sh);
  f.rect(3, sh + 1, 10, SEAT - (sh + 1));
  f.part(k.arm, { shade: 'rb', light: 't', shift: -1 });
  f.vl(2, sh + 1, SEAT - 2).vl(13, sh + 1, SEAT - 2);
  if (!k.woman) {
    f.part('towel', { shade: 'rb', light: 't' });
    f.hl(5, 10, sh);
  }
  head(f, p, k.head, hy);
  k.hat(f, 'up', hy + (p.lookUp ? 1 : 0));
}

function draw(k: Kind) {
  return (f: Fig, p: Pose) => {
    f.offset(8, 2);
    if (p.view === 'down') frontDraw(f, p, k);
    else if (p.view === 'up') backDraw(f, p, k);
    else sideDraw(f, p, k);
  };
}

// breathing, a blink, now and then a glance at the paddies (a turn of the head is too much at 16px:
// the chin lifts 1px — the breath)
const SIT: IdleKey[] = [...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 4), { breath: 0, blink: true }, { breath: 0 }, { breath: 1 }, { breath: 1 }];
const SIT_T: IdleKey[] = SIT.map((k) => ({ ...k, act: 'sit_t' }));

function spec(id: string, mats: Mats, k: Kind) {
  return buildSprite({
    id,
    w: 32,
    h: 26,
    mats,
    draw: draw(k),
    walkFrameMs: 200,
    idle: SIT,
    idleFrameMs: 260,
    extras: {
      pour_hold: { dirs: ['left', 'right'], p: { act: 'pour_hold' } },
      reach_hold: { dirs: ['left', 'right'], p: { act: 'reach_hold' } },
      sit_t: { dirs: 'all', p: { act: 'sit_t' } },
      look_up: { dirs: 'all', p: { lookUp: true } },
    },
    anims: {
      // raise (ph 0) → pour (ph 1) → raise → rest: 1.9 s
      pour: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 0 }], ms: [260, 1400, 240], loop: false, dir: 'left', dirs: ['left', 'right'] },
      // reach (ph 0) → drink (ph 1) → reach → rest: 1.9 s
      sip: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 0 }], ms: [300, 1300, 300], loop: false, dir: 'left', dirs: ['left', 'right'] },
    },
    poses: {
      sit: 'idle',
      sit_t: { left: SIT_T, right: SIT_T, down: SIT_T, up: SIT },
    },
    shadow: 12,
    keep: ['#F0B4BE', '#8CBCDC', '#2F3F62', '#A8946A', '#E0567A'],
  });
}

registerChar('npc_yone', () => spec('npc_yone', YONE, YK));
registerChar('npc_toyozou', () => spec('npc_toyozou', TOYO, TK));

/** The sip's timeline (ms): the cup leaves the stone between these (events/aze.ts hides it on the bench). */
export const SIP_HELD: [number, number] = [300, 1600];
/** The pour's timeline (ms): the whole anim. */
export const POUR_MS = 1900;
export const SIP_MS = 1900;
