// おぴぃ（npc_tamotsu。10_narrative 6.25、30_level_art 9.3、02_ch2_index #66）：閉店した
// つりえさ屋の元店主、40代の女性（★2026-09-29 依頼主の指示で たもつ→おぴぃ。IDは 据え置き）。
//
//  - 見分けの鍵：伏せた 水色の バケツ（石段の えさバケツと 同じ）に 座り、
//    となりに 竹の柄の たも網を 立てかけている。色のあせた 紺の キャップ（店の
//    白い しるし）の うしろから、1つに 結んだ 髪（赤い ゴム）を 出す。からし色の
//    Tシャツに、色のあせた 藍の 店の 前掛け（白い しるし、腰ひもは うしろで ちょう結び）、
//    こげ茶の 作業ズボン、黒っぽい 緑の 長靴（去年 なくした 片方と 同じ 型）。
//  - こげ茶の 髪（前髪は 片方へ 流す、横の 髪は あごまで）、日焼けした 顔、ぱっちりした 目。
//    白髪・しわ・ひげは なし。
//  - キャンバス 24×28：人は 16×24 の座標で描いて (4,4) ずらす。足もと（下の
//    まん中）が アクターの 位置。たも網は 右（向こう）に はみ出す。
//
// 待機（座ったまま、4方向）：息をする → ときどき 水口を のぞきこむ（'peer'、頭が
// 1px 前へ下がる）→ まばたき。結んだ 髪が 息に あわせて 少し ゆれる。
// extras：look_up（17:00）、'scoop'（たも網を 前へ）。

import { flat, mat, type Fig, type Mats } from '../fig';
import { sitLegs, type LegSpec } from '../body';
import { buildSprite, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { HAIRMAP, head, upPt, upper, type HeadT } from '../kit';
import { SKIN_TAN } from '../mats';
import { BASE2 } from './hoshi_kit';

const TM: Mats = {
  ...BASE2,
  skin: SKIN_TAN,
  hair: mat('#5A3A2A', { shade: '#2B1E1A', light: '#8A5A3A', dark: '#1B1733' }),
  lash: flat('#2A2440'),
  lip: flat('#8A2E3A'),
  band: flat('#E84E3C'),
  cap: mat('#3A5A8A', { shade: '#2F4A8A', light: '#5A7AB0', dark: '#223668' }),
  capLogo: flat('#E8E4D8'),
  shirt: mat('#D9A441', { shade: '#A8742A', light: '#F6D98A', dark: '#8A5A3A' }),
  apron: mat('#4E6696', { shade: '#3A4C78', light: '#6E86B4', dark: '#26305A' }),
  apronMark: flat('#E8E4D8'),
  pants: mat('#5A4636', { shade: '#443428', light: '#76604C', dark: '#2E2218' }),
  boot: mat('#2E3A34', { shade: '#1E2622', light: '#4E5E54', dark: '#1B1733' }),
  bucket: mat('#7FD1E8', { shade: '#4AA8E0', light: '#BDEFFA', dark: '#2F7AB0' }),
  pole: mat('#C8A06A', { shade: '#A8742A', light: '#E8C890', dark: '#8A5A3A' }),
  node: flat('#8A5A3A'),
  hoop: flat('#9AA0A8'),
  mesh: flat('#E8E4D8'),
};

const HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  // the fringe swept to one side under the brim, the side hair down to the jaw
  hairD: [3, 3, ['hHhhhh...d', 'hh.......d', 'h........d', 'h........d', 'h........d', 'd.........'], HAIRMAP],
  eyesD: { x: 6, d: 3, y: 5, h: 2 },
  mouthD: [7, 7, 2],
  neckD: [7, 9, 2],
  hairU: [3, 3, ['hhhhhhhhhd', 'hhhhhhhhhd', '.hhhhhhhd.', '..hhhhdd..']],
  napeU: [5, 7, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  // a lock in front of the ear, the hair behind it gathered back toward the tie
  hairL: [6, 3, ['hhhhhd', '.h.hhd', '...hhd', '...hd.']],
  eyeL: { x: 4, y: 5, h: 2 },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 2],
  upD: { fringe: 'none', whites: false },
  hairOpts: { shade: '', light: '' },
};

/**
 * The small touches of her face over the template head (plain expression, eyes
 * open): the outer lashes and the colour of her lips. `x` shifts with a lean.
 */
function faceMarks(f: Fig, p: Pose, hy: number, x = 0): void {
  if (p.lookUp || p.act === 'surprised' || p.act === 'hurt') return;
  const open = !p.blink && !p.blinkClosed;
  if (p.view === 'down') {
    if (open) {
      f.part('lash', { flat: true, rim: false });
      f.px(5 + x, hy + 5).px(10 + x, hy + 5);
    }
    f.part('lip', { flat: true, rim: false });
    f.px(7 + x, hy + 7).px(8 + x, hy + 7);
  } else if (p.view === 'left' && open) {
    f.part('lash', { flat: true, rim: false });
    f.px(5 + x, hy + 4);
  }
}

/** Seated on the upturned bucket: the thighs on its bottom, the shins down in front (boots). */
const LEGS: LegSpec = { cx: 8, hip: 17, foot: 23, w: 2, gap: 4, mat: 'pants', low: { mat: 'boot', h: 3 }, shoe: 'boot', shoeLen: 3 };

/** The faded cap of the shop: a round crown, the brim forward (a white mark on the front). */
function cap(f: Fig, view: 'down' | 'up' | 'left', hy: number): void {
  f.part('cap', { shade: 'rb', light: 't' });
  if (view === 'left') {
    f.rows(4, hy, ['..HHhhd.', '.Hhhhhhd', 'Hhhhhhhd']);
    f.rows(0, hy + 3, ['ddddddhh']);
    f.part('cap', { flat: true });
    f.t(-1).hl(0, 4, hy + 3).t(null);
    return;
  }
  f.rows(3, hy, ['..HHhhhd..', '.HHhhhhhd.', 'Hhhhhhhhhd']);
  if (view === 'down') {
    f.part('cap', { flat: true });
    f.t(-2).hl(4, 11, hy + 3).t(null);
    f.part('capLogo', { flat: true, rim: false });
    f.px(8, hy + 1);
  } else {
    // the adjuster strap at the back, the tail of hair through the gap above it
    f.part('cap', { flat: true });
    f.t(-1).hl(5, 6, hy + 3).hl(9, 10, hy + 3).t(null);
  }
}

/**
 * The tail of hair tied at the back (a red band where it leaves the cap).
 * `sw` sways its tip 1px with the breath.
 */
function tail(f: Fig, p: Pose, view: 'up' | 'left', hy: number, sw: number): void {
  const P = (x: number, k: number): [number, number] => {
    const [X, K] = upPt(HEAD, p, x, k);
    return [X, K + hy];
  };
  if (view === 'up') {
    // down the back of her head (a lit strand on the darker hair) and on over the collar
    f.part('hair', { shade: '', light: '' });
    for (let k = 3; k <= 9; k++) {
      f.t(k <= 6 ? 1 : 0).px(...P(7, k));
      f.t(k <= 6 ? 0 : -1).px(...P(8, k));
    }
    f.t(0).px(...P(7 + sw, 10)).t(null);
    f.part('band', { flat: true, rim: false });
    f.px(...P(7, 2)).px(...P(8, 2));
    return;
  }
  // from the tie at the back of the cap it hangs straight down (also when she looks up)
  const [bx, by] = P(12, 2);
  f.part('hair', { shade: 'rb', light: 't' });
  f.px(bx, by + 1).px(bx + 1, by + 1);
  for (let k = 2; k <= 4; k++) f.px(bx + 1, by + k);
  f.px(bx + 1 + sw, by + 5).px(bx + 1 + sw, by + 6);
  f.part('band', { flat: true, rim: false });
  f.px(bx, by);
}

/** The upturned bucket (aqua, like the bait bucket on the north bank's steps). */
function bucket(f: Fig, view: 'down' | 'up' | 'left'): void {
  f.part('bucket', { shade: 'rb', light: 'tl' });
  if (view === 'left') {
    f.rows(5, 18, ['.#######.', '#########', '#########', '#########', '#########', 'HHHHHHHHH']);
  } else {
    f.rows(2, 18, ['..########..', '.##########.', '.##########.', '############', '############', 'HHHHHHHHHHHH']);
  }
}

/** The たも網 leaning beside her (to the viewer's right), a bamboo handle with its nodes. */
function net(f: Fig, view: 'down' | 'up' | 'left', scoop: boolean): void {
  const ox = f.ox;
  const oy = f.oy;
  f.offset(0, 0);
  if (scoop) {
    // held out in front, low over the water
    f.part('pole', { flat: true, rim: false, ol: false });
    f.line(18, 18, 10, 24);
    f.part('hoop', { flat: true });
    f.rows(2, 23, ['.#######.', '#.......#', '.#######.']);
    f.part('mesh', { flat: true, rim: false });
    f.hl(4, 8, 26);
    f.offset(ox, oy);
    return;
  }
  const back = view === 'up';
  // the bamboo handle: 1px, its nodes darker (no outline: a thin stick, not a fence post)
  f.part('pole', { flat: true, rim: false, ol: false, shift: back ? -1 : 0 });
  f.line(21, 27, 19, 5);
  f.part('node', { flat: true, rim: false, ol: false });
  f.px(21, 26).px(20, 20).px(20, 13);
  // the hoop (a steel ring seen a little from above) and the bag of mesh hanging from it
  f.part('hoop', { flat: true, rim: false });
  f.rows(14, 1, ['.######.', '#......#', '.######.']);
  f.part('mesh', { flat: true, rim: false, ol: false });
  f.rows(15, 4, ['#.#.#.', '.#.#..', '..#...']);
  f.offset(ox, oy);
}

/** Head-top row (the cap sits a row above): she sits up straight, the chin clear of the shoulders. */
const HY = 3;

function isPeer(p: Pose): boolean {
  return p.act === 'peer';
}

/** The tail's sway: the breath moves its tip. */
function swayOf(p: Pose): number {
  return p.breath ? 1 : 0;
}

/** The shop's apron over the lap (front): the waist band, the cloth down past the knees, the white mark. */
function apronFront(f: Fig): void {
  f.part('apron', { shade: 'rb', light: 't' });
  f.rect(4, 16, 8, 4);
  f.hl(5, 10, 20);
  f.t(-1).hl(4, 11, 16).t(null);
  f.part('apronMark', { flat: true, rim: false });
  f.px(7, 18).px(8, 18).px(8, 19);
}

function front(f: Fig, p: Pose): void {
  const u = upper(p) + (isPeer(p) ? 1 : 0);
  const hy = HY + u;
  const scoop = p.act === 'scoop';
  net(f, 'down', scoop);
  bucket(f, 'down');
  sitLegs(f, p, LEGS, 16);
  // the mustard T-shirt
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 10, 12 + u);
  f.rect(4, 13 + u, 8, 16 - (13 + u));
  apronFront(f);
  if (scoop) {
    // the handle crosses her lap to the hoop low over the water (in front of the apron)
    const [ox, oy] = [f.ox, f.oy];
    f.offset(0, 0);
    f.part('pole', { flat: true, rim: false, ol: false });
    f.line(18, 18, 10, 24);
    f.offset(ox, oy);
  }
  // short sleeves, the tanned forearms resting on the lap (or the net held out)
  f.part('shirt', { shade: 'rb', light: 't' });
  f.px(3, 13 + u).px(12, 13 + u);
  f.part('skin', { shade: 'rb', light: 't' });
  if (scoop) {
    f.rect(3, 14 + u, 1, 2).rect(12, 14 + u, 1, 2);
    f.rect(9, 17, 2, 1).rect(12, 16, 2, 1);
  } else {
    f.rect(3, 14 + u, 1, 2).rect(12, 14 + u, 1, 2);
    f.rect(4, 16, 2, 1).rect(10, 16, 2, 1);
  }
  head(f, p, HEAD, hy);
  faceMarks(f, p, hy);
  // the end of the tied hair shows past her neck on one side
  if (!p.lookUp) {
    f.part('hair', { shade: 'r', light: '' });
    f.px(13, hy + 7).px(13, hy + 8).px(12, hy + 9);
  }
  cap(f, 'down', hy - 1 + (p.lookUp ? -1 : 0));
}

function back(f: Fig, p: Pose): void {
  const u = upper(p);
  const hy = HY + u;
  bucket(f, 'up');
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 16, 8, 2);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 10, 12 + u);
  f.rect(4, 13 + u, 8, 16 - (13 + u) + 1);
  // the apron's waist string round the back, tied in a bow
  f.part('apron', { flat: true });
  f.t(-1).hl(4, 11, 16).t(null);
  f.t(0).px(6, 15).px(9, 15).px(6, 17).px(9, 17).t(null);
  f.t(-1).px(7, 16).px(8, 16).t(null);
  f.part('shirt', { shade: 'rb', light: 't', shift: -1 });
  f.px(3, 13 + u).px(12, 13 + u);
  f.part('skin', { shade: 'rb', light: 't', shift: -1 });
  f.rect(3, 14 + u, 1, 2).rect(12, 14 + u, 1, 2);
  head(f, p, HEAD, hy);
  cap(f, 'up', hy - 1 + (p.lookUp ? 1 : 0));
  tail(f, p, 'up', hy, swayOf(p));
  net(f, 'up', false);
}

function side(f: Fig, p: Pose): void {
  const u = upper(p) + (isPeer(p) ? 1 : 0);
  const lean = isPeer(p) ? 1 : 0;
  const hy = HY + u;
  net(f, 'left', false);
  bucket(f, 'left');
  sitLegs(f, p, { ...LEGS, cx: 9 }, 16);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(7 - lean, 10 - lean, 12 + u);
  f.rect(6 - lean, 13 + u, 5, 16 - (13 + u) + 1);
  // the apron: the band at the waist, the cloth over the thighs and down past the knee
  f.part('apron', { shade: 'rb', light: 't' });
  f.hl(4, 10, 16).hl(3, 9, 17).rect(3, 18, 2, 2);
  f.t(-1).hl(5, 10, 16).t(null);
  f.part('apronMark', { flat: true, rim: false });
  f.px(6, 17);
  // the near arm down to the knee
  f.part('shirt', { shade: 'rb', light: 'tl' });
  f.px(8 - lean, 13 + u);
  f.part('skin', { shade: 'rb', light: 't' });
  f.line(8 - lean, 14 + u, 5, 16);
  head(f, p, HEAD, hy, -lean);
  faceMarks(f, p, hy, -lean);
  f.offset(f.ox - lean, f.oy);
  cap(f, 'left', hy - 1 + (p.lookUp ? -1 : 0));
  tail(f, p, 'left', hy, swayOf(p));
  f.offset(f.ox + lean, f.oy);
}

function draw(f: Fig, p: Pose): void {
  f.offset(4, 4);
  if (p.view === 'down') front(f, p);
  else if (p.view === 'up') back(f, p);
  else side(f, p);
}

// seated, breathing; now and then she leans to look into the inlet (≈6 s)
const IDLE: IdleKey[] = [
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 3),
  { breath: 0, blink: true },
  { act: 'peer' }, { act: 'peer' }, { act: 'peer' }, { act: 'peer', blink: true }, { act: 'peer' }, { act: 'peer' },
  ...rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 2),
  { breath: 0, blink: true },
];

registerChar('npc_tamotsu', () =>
  buildSprite({
    id: 'npc_tamotsu',
    w: 24,
    h: 28,
    mats: TM,
    draw,
    walkFrameMs: 200,
    idle: { down: IDLE, up: rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 4), left: IDLE, right: IDLE },
    idleFrameMs: 260,
    extras: {
      look_up: { dirs: 'all', p: { lookUp: true } },
      scoop: { dirs: ['down'] },
      peer: { dirs: ['down', 'left', 'right'] },
    },
    poses: { sit: 'idle' },
    shadow: 18,
    keep: ['#7FD1E8', '#4E6696', '#D9A441'],
  }),
);
