// たもつ（npc_tamotsu。10_narrative 6.25、30_level_art 9.3、02_ch2_index #66）：閉店した
// つりえさ屋の元店主、70代。たも網の たもつ。
//
//  - 見分けの鍵：伏せた 水色の バケツ（石段の えさバケツと 同じ）に 座り、
//    となりに 竹の柄の たも網を 立てかけている。色のあせた 紺の キャップ（店の
//    白い しるし）、カーキの 釣りベスト（ポケットが たくさん）、白い 肌着、
//    紺ねずの ズボン、ビーチサンダル（長靴の 片方は 去年 なくした）。
//  - 日焼けした 顔、白い 無精ひげ、細い目。背すじは のびている（年寄りは 品よく）。
//  - キャンバス 24×28：人は 16×24 の座標で描いて (4,4) ずらす。足もと（下の
//    まん中）が アクターの 位置。たも網は 右（向こう）に はみ出す。
//
// 待機（座ったまま、4方向）：息をする → ときどき 水口を のぞきこむ（'peer'、頭が
// 1px 前へ下がる）→ まばたき。extras：look_up（17:00）、'scoop'（たも網を 前へ）。

import { flat, mat, type Fig, type Mats, type RowMap } from '../fig';
import { sitLegs, type LegSpec } from '../body';
import { buildSprite, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { head, upper, type HeadT } from '../kit';
import { BASE2, HAIR_WHITE, SKIN_FARM } from './hoshi_kit';

const T: RowMap = { h: [null, 0], H: [null, 1], d: [null, -1], D: [null, -2], K: [null, 2] };

const TM: Mats = {
  ...BASE2,
  skin: SKIN_FARM,
  hair: HAIR_WHITE,
  stubble: flat('#C8C2B4'),
  cap: mat('#3A5A8A', { shade: '#2F4A8A', light: '#5A7AB0', dark: '#223668' }),
  capLogo: flat('#E8E4D8'),
  shirt: mat('#E8E4D8', { shade: '#C8C2B4', light: '#F4F1E8', dark: '#9AA0A8' }),
  vest: mat('#9A8A5A', { shade: '#74663E', light: '#BCAA78', dark: '#4A402A' }),
  pocket: flat('#74663E'),
  pants: mat('#4A5068', { shade: '#3A3F48', light: '#6B7186', dark: '#2A2440' }),
  sandal: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
  bucket: mat('#7FD1E8', { shade: '#4AA8E0', light: '#BDEFFA', dark: '#2F7AB0' }),
  pole: mat('#C8A06A', { shade: '#A8742A', light: '#E8C890', dark: '#8A5A3A' }),
  node: flat('#8A5A3A'),
  hoop: flat('#9AA0A8'),
  mesh: flat('#E8E4D8'),
};

const HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 4, ['#........#']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, closed: true, brow: { dy: -1, mat: 'hair', w: 2 } },
  mouthD: [7, 7, 2],
  neckD: [7, 9, 2],
  hairU: [3, 3, ['hhhhhhhhhh', 'hhhhhhhhhd', '.hhhhhhhd.']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [7, 3, ['####', '.##d']],
  eyeL: { x: 4, y: 5, h: 1, closed: true, brow: { dy: -1, mat: 'hair', w: 2 } },
  earL: [8, 5],
  mouthL: [3, 7],
  neckL: [5, 9, 2],
  upD: { fringe: 'none', openEyes: true, whites: false },
};

/** Seated on the upturned bucket: the thighs on its bottom, the shins down in front. */
const LEGS: LegSpec = { cx: 8, hip: 17, foot: 23, w: 2, gap: 4, mat: 'pants', low: { mat: 'skin', h: 1 }, shoe: 'sandal', shoeLen: 3 };

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
    // the adjuster strap at the back
    f.part('cap', { flat: true });
    f.t(-1).hl(6, 9, hy + 3).t(null);
    f.part('capLogo', { flat: true, rim: false });
    f.px(7, hy + 3);
  }
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

/** The たも網 leaning beside him (to the viewer's right), a bamboo handle with its nodes. */
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

function isPeer(p: Pose): boolean {
  return p.act === 'peer';
}

function front(f: Fig, p: Pose): void {
  const u = upper(p) + (isPeer(p) ? 1 : 0);
  const hy = 5 + u;
  const scoop = p.act === 'scoop';
  net(f, 'down', scoop);
  bucket(f, 'down');
  sitLegs(f, p, LEGS, 16);
  // the white undershirt, the khaki vest over it (open at the front)
  f.part('shirt', { shade: 'rb', light: 't' });
  f.hl(5, 10, 12 + u);
  f.rect(4, 13 + u, 8, 16 - (13 + u) + 1);
  f.part('vest', { shade: 'rb', light: 't' });
  f.rect(4, 13 + u, 3, 16 - (13 + u) + 1).rect(9, 13 + u, 3, 16 - (13 + u) + 1);
  f.px(5, 12 + u).px(10, 12 + u);
  f.part('pocket', { flat: true, rim: false });
  f.px(5, 14 + u).px(10, 14 + u).px(5, 16);
  // short sleeves, the tanned forearms resting on the knees (or the net held out)
  f.part('shirt', { shade: 'rb', light: 't' });
  f.px(3, 13 + u).px(12, 13 + u);
  f.part('skin', { shade: 'rb', light: 't' });
  if (scoop) {
    f.rect(3, 14 + u, 1, 2).rect(12, 14 + u, 1, 2);
    f.rect(9, 17, 2, 1).rect(12, 16, 2, 1);
  } else {
    f.rect(3, 14 + u, 1, 2).rect(12, 14 + u, 1, 2);
    f.rect(3, 16, 2, 1).rect(11, 16, 2, 1);
  }
  head(f, p, HEAD, hy);
  if (!p.lookUp) {
    f.part('stubble', { flat: true, rim: false });
    f.px(5, hy + 7).px(10, hy + 7).px(6, hy + 8).px(9, hy + 8);
    f.retone(5, hy + 3, -1, 6, 1); // the brim's shade on his brow
  }
  cap(f, 'down', hy - 1 + (p.lookUp ? -1 : 0));
}

function back(f: Fig, p: Pose): void {
  const u = upper(p);
  const hy = 5 + u;
  bucket(f, 'up');
  f.part('pants', { shade: 'rb', light: '' });
  f.rect(4, 16, 8, 2);
  f.part('vest', { shade: 'rb', light: 't' });
  f.hl(5, 10, 12 + u);
  f.rect(4, 13 + u, 8, 16 - (13 + u) + 1);
  f.part('pocket', { flat: true, rim: false });
  f.hl(5, 10, 15 + u); // the big game pocket across the back
  f.part('shirt', { shade: 'rb', light: 't', shift: -1 });
  f.px(3, 13 + u).px(12, 13 + u);
  f.part('skin', { shade: 'rb', light: 't', shift: -1 });
  f.rect(3, 14 + u, 1, 2).rect(12, 14 + u, 1, 2);
  head(f, p, HEAD, hy);
  cap(f, 'up', hy - 1 + (p.lookUp ? 1 : 0));
  net(f, 'up', false);
}

function side(f: Fig, p: Pose): void {
  const u = upper(p) + (isPeer(p) ? 1 : 0);
  const lean = isPeer(p) ? 1 : 0;
  const hy = 5 + u;
  net(f, 'left', false);
  bucket(f, 'left');
  sitLegs(f, p, { ...LEGS, cx: 9 }, 16);
  f.part('vest', { shade: 'rb', light: 't' });
  f.hl(7 - lean, 10 - lean, 12 + u);
  f.rect(6 - lean, 13 + u, 5, 16 - (13 + u) + 1);
  f.part('shirt', { flat: true });
  f.px(6 - lean, 12 + u);
  f.part('pocket', { flat: true, rim: false });
  f.px(7 - lean, 14 + u);
  // the near arm down to the knee
  f.part('shirt', { shade: 'rb', light: 'tl' });
  f.px(8 - lean, 13 + u);
  f.part('skin', { shade: 'rb', light: 't' });
  f.line(8 - lean, 14 + u, 5, 16);
  head(f, p, HEAD, hy, -lean);
  if (!p.lookUp) {
    f.part('stubble', { flat: true, rim: false });
    f.px(3 - lean, hy + 7).px(5 - lean, hy + 8);
    f.retone(3 - lean, hy + 3, -1, 5, 1);
  }
  f.offset(f.ox - lean, f.oy);
  cap(f, 'left', hy - 1 + (p.lookUp ? -1 : 0));
  f.offset(f.ox + lean, f.oy);
}

function draw(f: Fig, p: Pose): void {
  f.offset(4, 4);
  if (p.view === 'down') front(f, p);
  else if (p.view === 'up') back(f, p);
  else side(f, p);
}

// seated, breathing; now and then he leans to look into the inlet (≈6 s)
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
    keep: ['#7FD1E8', '#9A8A5A'],
  }),
);
