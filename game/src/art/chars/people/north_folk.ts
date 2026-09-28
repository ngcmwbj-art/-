// The people of the north row's rooms (02_ch2_index #58, 10_narrative 6.22,
// 30_level_art 9.3). One small builder: legs (standing, or kneeling on the
// tatami), a torso in the top's material, an apron / a vest over it, hanging
// arms with the sleeves, and a head template per person; glasses, a
// moustache and a bow tie are drawn over the face.
//
//   npc_yuzu    ゆず（しんごの妻）50代。栗色のボブに橙のヘアピン、若草の
//               ブラウスにみかん色のエプロン。ちゃぶ台の横に正座、みかんをむく
//   npc_fudeno  ふでの先生（書道）80代。白髪のおだんご、藍の作務衣、
//               細い老眼鏡。机の奥に正座、筆を運ぶ
//   npc_kinu    きぬ（くま吉の妻）40代。黒髪をひっつめて白い三角巾、
//               白い上っぱりに紺の前かけ、黒い長靴。手をふいている
//   npc_tokio   ときお（時計店）70代。はげ頭に白い横髪、丸めがね、
//               白いシャツに茶のアームカバー、灰のベスト。ルーペをのぞく
//   npc_master  マスター（喫茶）60代。なでつけた灰色の髪と口ひげ、白い
//               シャツに黒いベストと蝶ネクタイ。カップをみがく
//   npc_okami   おかみ（酒店）60代。黒髪のおだんごに藍の手ぬぐい、
//               からし色のシャツに酒蔵の紺の前かけ。腕まくり、腰に手
//
// All 16×24 (the idle acts stay inside), with look_up.

import { flat, mat, type Fig, type Mats } from '../fig';
import { SKIN_LIGHT, SKIN_MID } from '../mats';
import { legs, type LegSpec, type Seg } from '../body';
import { buildSprite, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { hangArms, head, sideArm, sideSwing, upper, type HeadT } from '../kit';

const base = {
  eye: flat('#2A1C28'),
  shine: flat('#FFF6D8'),
  blush: flat('#F6A48E'),
  mouth: flat('#B86A5A'),
};

// ---------------------------------------------------------------- heads

/** Women: a rounded bob (ゆず). */
const HEAD_BOB: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, ['..hHhhhh..', '.HKhhhhhd.', 'hHhhhhhhhd', 'hhhh..hhhd', 'hh......dd', 'hh......dd', '.h......d.']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  mouthD: [7, 7, 2],
  blushD: [5, 10, 6],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['..hHhhhh..', '.HKhhhhhd.', 'hHhhhhhhhd', 'hhhhhhhhhd', 'hhhhhhhhdd', 'hhhhhhhhdd', '.hhhhhhdd.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [2, 0, ['...hHhhh...', '..hHhhhhdd.', '.hhhhhhhhdd', '.hh.hhhhhdd', '.....hhhhdd', '.....hhhhd.', '......hhd..']],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 6],
  neckL: [5, 9, 2],
};

/** A bun on the crown (ふでの先生, white; おかみ, black). */
const HEAD_BUN: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, ['...hHhd...', '..HKhhhd..', '.hHhhhhhd.', 'hhhhhhhhhd', 'hh......dd', 'h........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  mouthD: [7, 7, 2],
  blushD: [5, 10, 6],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['...hHhd...', '..HKhhhd..', '.hHhhhhhd.', 'hhhhhhhhhd', 'hhhhhhhhdd', '.hhhhhhdd.']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 0, ['.....hHh..', '...hHhhhd.', '..hhhhhhhd', '.hhhhhhhhd', '.hh..hhhdd', '......hhd.']],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 6],
  neckL: [5, 9, 2],
};

/** Hair pulled back under a white head scarf (きぬ): the scarf is drawn over it. */
const HEAD_SCARF: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 1, ['..hhhhhh..', '.hhhhhhhd.', 'hh......dd', 'h........d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  mouthD: [7, 7, 2],
  blushD: [5, 10, 6],
  neckD: [7, 9, 2],
  hairU: [3, 1, ['..hhhhhh..', '.hhhhhhhd.', 'hhhhhhhhdd', '.hhhhhhdd.', '...hhdd...']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 1, ['...hhhhh..', '..hhhhhhd.', '.hh..hhhdd', '.....hhhd.', '......hd..']],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 6],
  neckL: [5, 9, 2],
};

/** Bald crown, white hair round the sides (ときお). The crown is face. */
const HEAD_BALD: HeadT = {
  faceD: [4, 1, ['..####..', '.######.', '########', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 3, ['h........d', 'hh......dd', 'h........d']],
  upD: { fringe: 'none' },
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  mouthD: [7, 8, 2],
  neckD: [7, 9, 2],
  hairU: [3, 3, ['hhhhhhhhhd', 'hhhhhhhhdd', '.hhhhhhdd.']],
  napeU: [4, 1, ['..####..', '.######.']],
  faceL: [3, 1, ['..###...', '.#####..', '######..', '######..', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 3, ['.....hhhd.', '.....hhhdd', '......hhd.']],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  earL: [8, 5],
  mouthL: [3, 8],
  neckL: [5, 9, 2],
};

/** Hair combed straight back (マスター). */
const HEAD_BACK: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, ['..hHhhhh..', '.HKHhhhhd.', 'HHhhhhhhdd', 'Hh......dd', 'h........d']],
  eyesD: { x: 6, d: 3, y: 6, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  mouthD: [7, 8, 2],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['..hHhhhh..', '.HKHhhhhd.', 'HHhhhhhhdd', 'Hhhhhhhhdd', 'hhhhhhhhhd', '.hhhhhhd..']],
  napeU: [5, 6, ['######', '.####.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 0, ['..######..', '.#######dd', '##########', '###..#####', '......####', '.......##d']],
  eyeL: { x: 4, y: 6, h: 1, brow: { dy: -1, mat: 'brow', w: 2 } },
  earL: [8, 5],
  mouthL: [3, 8],
  neckL: [5, 9, 2],
};

// ---------------------------------------------------------------- the builder

interface Look {
  id: string;
  mats: Mats;
  head: HeadT;
  /** Head top row (standing). */
  hy: number;
  legs: LegSpec;
  /** Kneels (正座) whenever not walking. */
  kneel?: boolean;
  /** Sleeve length on the arm (segments of 'top' before the skin). */
  sleeve: number;
  /** Arm covers (ときお): the forearm in this material. */
  cuff?: string;
  apron?: 'bib' | 'waist';
  vest?: boolean;
  bowtie?: boolean;
  glasses?: 'round' | 'thin';
  moustache?: boolean;
  scarf?: boolean;
  headband?: boolean;
  hairpin?: boolean;
  /** Draws what the idle act holds (front view, after the arms). */
  act?: (f: Fig, p: Pose, u: number) => boolean;
  idle: IdleKey[];
}

function drawFolk(L: Look, f: Fig, p: Pose): void {
  const act = p.act;
  const seated = !!L.kneel && p.mode !== 'walk' && p.mode !== 'run';
  const drop = seated ? 5 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const hy = L.hy + u;
  const seg: Seg[] = L.cuff ? [{ mat: 'top', n: L.sleeve }, { mat: L.cuff, n: 2 }, { mat: 'skin' }] : [{ mat: 'top', n: L.sleeve }, { mat: 'skin' }];
  if (p.view === 'down' || p.view === 'up') {
    if (seated) {
      // the knees folded under: a low, wide mound of the lower clothes
      f.part(L.legs.mat, { shade: 'rb', light: 't' });
      f.rect(3, 19, 10, 3);
      f.hl(4, 11, 22);
      f.part(L.legs.shoe, { shade: '', light: '' });
      if (p.view === 'up') f.hl(5, 10, 22);
    } else legs(f, p, L.legs);
    f.part('top', { shade: 'rb', light: 't' });
    f.hl(4, 11, 11 + u);
    f.rect(3, 12 + u, 10, 17 + b - (12 + u) + (seated ? 1 : 0));
    if (p.view === 'down') {
      if (L.vest) {
        f.part('vest', { shade: 'rb', light: 't' });
        f.rect(3, 12 + u, 3, 17 + b - (12 + u));
        f.rect(10, 12 + u, 3, 17 + b - (12 + u));
        f.px(6, 16 + u).px(9, 16 + u);
      }
      if (L.apron === 'bib') {
        f.part('apron', { shade: 'rb', light: 't' });
        f.rect(5, 13 + u, 6, 19 + b - (13 + u));
        f.rect(4, 16 + b, 8, seated ? 3 : 4);
        f.part('strap', { flat: true, rim: false });
        f.px(5, 12 + u).px(10, 12 + u);
      } else if (L.apron === 'waist') {
        f.part('apron', { shade: 'rb', light: 't' });
        f.rect(4, 16 + b, 8, seated ? 3 : 5);
        f.part('strap', { flat: true, rim: false });
        f.hl(3, 12, 16 + b);
      }
      if (L.bowtie) {
        f.part('tie', { flat: true, rim: false });
        f.px(6, 12 + u).px(9, 12 + u).px(7, 12 + u).px(8, 12 + u);
        f.part('tieK', { flat: true, rim: false });
        f.px(7, 12 + u).px(8, 12 + u);
      }
    } else if (L.apron) {
      // the apron's ties at the back
      f.part('strap', { flat: true, rim: false });
      f.hl(4, 11, 16 + b);
      f.px(7, 17 + b).px(8, 17 + b).px(6, 18 + b).px(9, 18 + b);
    }
    let held = false;
    if (p.view === 'down' && L.act) held = L.act(f, p, u);
    if (!held) {
      if (seated) {
        // hands resting on the knees
        hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: seg }, u);
      } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u);
    }
    head(f, p, L.head, hy);
    extrasFront(L, f, p, hy);
    return;
  }
  // side (left; right is mirrored)
  const sw = seated ? 0 : sideSwing(p);
  if (!seated) sideArm(f, 9, 12 + u, 4, -sw, seg, -1);
  if (seated) {
    // folded legs: the thigh forward along the floor, the heel under the seat
    f.part(L.legs.mat, { shade: 'rb', light: 't' });
    f.rect(4, 19, 8, 3);
    f.hl(5, 11, 22);
    f.part(L.legs.shoe, { shade: '', light: '' });
    f.px(11, 22).px(12, 22);
  } else legs(f, p, L.legs);
  f.part('top', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 17 + b - (12 + u) + (seated ? 1 : 0));
  if (L.vest) {
    f.part('vest', { shade: 'rb', light: 't' });
    f.rect(6, 12 + u, 5, 17 + b - (12 + u));
  }
  if (L.apron) {
    f.part('apron', { shade: 'rb', light: 't' });
    f.rect(4, (L.apron === 'bib' ? 13 + u : 16 + b), 2, L.apron === 'bib' ? 19 + b - (13 + u) : seated ? 3 : 5);
    f.part('strap', { flat: true, rim: false });
    f.hl(6, 10, 16 + b);
  }
  head(f, p, L.head, hy);
  extrasSide(L, f, p, hy);
  f.part('top', { shade: 'rb', light: 'tl' });
  f.rect(7, 12 + u, 3, 2);
  if (seated) {
    // forearm along the thigh, the hand on the knee
    f.part(L.cuff ?? 'skin', { shade: 'r', light: '' });
    f.line(8, 14 + u, 6, 17 + u);
    f.part('skin', { shade: '', light: '' });
    f.px(5, 18 + u).px(6, 18 + u);
  } else {
    const hx = 8 - sw;
    const hb = 16 + u + (p.lookUp ? 1 : 0) - (sw ? 1 : 0);
    f.part(L.cuff ?? 'skin', { shade: 'r', light: '' });
    f.t(0).line(8, 14 + u, hx, hb - 1).t(null);
    f.part('skin', { shade: '', light: '' });
    f.px(hx, hb);
  }
}

/** Glasses, moustache, head scarf / band, hairpin — front and back. */
function extrasFront(L: Look, f: Fig, p: Pose, hy: number): void {
  const up = p.lookUp;
  if (p.view === 'down') {
    const ey = hy + L.head.eyesD.y + (up ? -2 : 0);
    if (L.glasses && !up) {
      f.part('glass', { flat: true, rim: false });
      if (L.glasses === 'round') f.px(5, ey).px(7, ey).px(8, ey).px(10, ey).px(6, ey + 1).px(9, ey + 1);
      else f.hl(5, 10, ey + 1);
      f.part('lens', { flat: true, rim: false });
      f.px(6, ey - (L.glasses === 'round' ? 1 : 0)).px(9, ey - (L.glasses === 'round' ? 1 : 0));
    }
    if (L.moustache && !up) {
      f.part('stache', { flat: true, rim: false });
      f.hl(6, 9, hy + (L.head.mouthD?.[1] ?? 8) - 1);
      f.px(5, hy + (L.head.mouthD?.[1] ?? 8));
      f.px(10, hy + (L.head.mouthD?.[1] ?? 8));
    }
  }
  if (L.scarf) {
    // white triangle scarf over the crown, the knot at the nape
    f.part('scarf', { shade: 'rb', light: 't' });
    if (p.view === 'down') {
      f.hl(5, 10, hy - 1 + (up ? 1 : 0));
      f.hl(4, 11, hy + (up ? 1 : 0));
      f.hl(3, 12, hy + 1 + (up ? 1 : 0));
      f.hl(3, 12, hy + 2);
    } else {
      f.hl(5, 10, hy - 1);
      f.hl(4, 11, hy);
      f.hl(3, 12, hy + 1);
      f.hl(4, 11, hy + 2);
      f.rows(6, hy + 3, ['.##.', '#..#']);
    }
  }
  if (L.headband) {
    f.part('band', { shade: 'r', light: '' });
    f.hl(3, 12, hy + 2 + (up && p.view === 'down' ? -1 : 0));
    f.part('bandDot', { flat: true, rim: false });
    for (let x = 4; x <= 11; x += 3) f.px(x, hy + 2 + (up && p.view === 'down' ? -1 : 0));
    if (p.view === 'up') f.rows(11, hy + 3, ['##', '.#']);
  }
  if (L.hairpin && p.view === 'down') {
    f.part('pin', { flat: true, rim: false });
    f.px(10, hy + 2).px(11, hy + 2);
  }
}

function extrasSide(L: Look, f: Fig, p: Pose, hy: number): void {
  const up = p.lookUp;
  if (L.glasses && !up) {
    f.part('glass', { flat: true, rim: false });
    f.hl(3, 7, hy + L.head.eyeL.y + (L.glasses === 'thin' ? 1 : 0));
    f.part('lens', { flat: true, rim: false });
    f.px(3, hy + L.head.eyeL.y - (L.glasses === 'round' ? 1 : 0));
  }
  if (L.moustache && !up) {
    f.part('stache', { flat: true, rim: false });
    f.hl(2, 4, hy + (L.head.mouthL?.[1] ?? 8) - 1);
  }
  if (L.scarf) {
    f.part('scarf', { shade: 'rb', light: 't' });
    f.hl(5, 10, hy - 1);
    f.hl(3, 11, hy);
    f.hl(3, 12, hy + 1);
    f.rows(11, hy + 2, ['##', '.#']);
  }
  if (L.headband) {
    f.part('band', { shade: 'r', light: '' });
    f.hl(3, 12, hy + 2);
    f.rows(12, hy + 3, ['#', '#']);
  }
  if (L.hairpin) {
    f.part('pin', { flat: true, rim: false });
    f.px(8, hy + 2);
  }
}

function folk(L: Look): void {
  registerChar(L.id, () =>
    buildSprite({
      id: L.id,
      mats: L.mats,
      draw: (f, p) => drawFolk(L, f, p),
      walkFrameMs: 170,
      idle: { down: L.idle, left: L.idle, right: L.idle, up: rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], 4) },
      extras: {
        sit: { dirs: 'all' },
        look_up: { dirs: 'all', p: { lookUp: true } },
      },
      poses: { sit: 'idle' },
      shadow: 11,
    }),
  );
}

const breathe = (n: number): IdleKey[] => rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }], n);

// ---------------------------------------------------------------- ゆず（しんごの妻）

folk({
  id: 'npc_yuzu',
  mats: {
    ...base,
    skin: SKIN_LIGHT,
    hair: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A', dark: '#3A2B2A', rim: '#C8845A' }),
    brow: flat('#5A3A2A'),
    top: mat('#C9E08A', { shade: '#9BCB6B', light: '#E4F0B8', dark: '#5FA85A', rim: '#F0E0A0' }),
    apron: mat('#F2894B', { shade: '#C8643A', light: '#F7C27A', dark: '#8A3A2A', rim: '#FFD8A0' }),
    strap: flat('#C8643A'),
    pants: mat('#6B7186', { shade: '#4E5262', light: '#8A90A0' }),
    sock: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF' }),
    pin: flat('#F2894B'),
    peel: flat('#F2894B'),
    mikan: mat('#F2894B', { shade: '#C8643A', light: '#F7C27A' }),
  },
  head: HEAD_BOB,
  hy: 2,
  legs: { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', shoe: 'sock', shoeLen: 3 },
  kneel: true,
  sleeve: 2,
  apron: 'bib',
  hairpin: true,
  // peeling a mikan in her lap (2 frames), then eating a segment
  act(f, p, u) {
    if (p.act !== 'peel' && p.act !== 'eat') return false;
    const seg: Seg[] = [{ mat: 'top', n: 2 }, { mat: 'skin' }];
    if (p.act === 'eat') {
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: seg }, u, 'R');
      f.part('skin', { shade: '', light: '' });
      f.line(12, 13 + u, 9, 12 + u).px(8, 11 + u);
      f.part('peel', { flat: true, rim: false });
      f.px(8, 10 + u);
      return true;
    }
    f.part('skin', { shade: 'b', light: '' });
    f.line(3, 13 + u, 6, 16 + u).line(12, 13 + u, 9, 16 + u);
    f.part('mikan', { shade: 'rb', light: 't' });
    f.rect(7, 15 + u, 2, 2);
    f.part('peel', { flat: true, rim: false });
    f.px(p.ph ? 6 : 9, 17 + u);
    f.part('skin', { shade: '', light: '' });
    f.px(6, 16 + u).px(9, 16 + u);
    return true;
  },
  idle: [...rep([{ act: 'peel', ph: 0 }, { act: 'peel', ph: 1 }], 4), { act: 'eat' }, { act: 'eat' }, { act: 'eat', blink: true }, ...breathe(1)],
});

// ---------------------------------------------------------------- ふでの先生（書道教室）

folk({
  id: 'npc_fudeno',
  mats: {
    ...base,
    skin: SKIN_MID,
    hair: mat('#E8E4D8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9E978C', rim: '#FFE0B8' }),
    brow: flat('#C8C2B4'),
    top: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B1733', rim: '#8A7AB0' }),
    pants: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B1733' }),
    sock: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF' }),
    glass: flat('#A8742A'),
    lens: flat('#E8E4D8'),
    brush: flat('#3A2B24'),
    brushTip: flat('#2A2440'),
    handle: flat('#C8A06A'),
  },
  head: HEAD_BUN,
  hy: 2,
  legs: { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', shoe: 'sock', shoeLen: 3 },
  kneel: true,
  sleeve: 3,
  glasses: 'thin',
  // the brush: held upright, then a stroke across (ph 0..2)
  act(f, p, u) {
    if (p.act !== 'write') return false;
    const seg: Seg[] = [{ mat: 'top', n: 3 }, { mat: 'skin' }];
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 17, segs: seg }, u, 'L');
    const hx = [10, 8, 6][p.ph] ?? 10;
    f.part('top', { shade: 'rb', light: 't', shift: -1 });
    f.line(12, 13 + u, hx + 2, 16 + u);
    f.part('skin', { shade: '', light: '' });
    f.px(hx + 1, 17 + u);
    f.part('handle', { flat: true, rim: false });
    f.vl(hx + 1, 13 + u, 16 + u);
    f.part('brushTip', { flat: true, rim: false });
    f.px(hx + 1, 18 + u);
    return true;
  },
  idle: [...breathe(1), { act: 'write', ph: 0 }, { act: 'write', ph: 0 }, { act: 'write', ph: 1 }, { act: 'write', ph: 2 }, { act: 'write', ph: 2 }, ...breathe(1), { breath: 0, blink: true }],
});

// ---------------------------------------------------------------- きぬ（くま吉の妻）

folk({
  id: 'npc_kinu',
  mats: {
    ...base,
    skin: SKIN_LIGHT,
    hair: mat('#2B1E1A', { shade: '#2A2440', light: '#5A3A2A', dark: '#1B1733' }),
    brow: flat('#2B1E1A'),
    top: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF', dark: '#9AA0A8', rim: '#FFE0B8' }),
    apron: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B1733', rim: '#8A7AB0' }),
    strap: flat('#243A72'),
    scarf: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF', dark: '#9AA0A8' }),
    pants: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
    boot: mat('#2A2440', { shade: '#1B1733', light: '#3A3F48', spec: '#6B7186' }),
    towel: mat('#7FD1E8', { shade: '#4AA8E0', light: '#BDEFFA' }),
  },
  head: HEAD_SCARF,
  hy: 2,
  legs: { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', low: { mat: 'boot', h: 3 }, shoe: 'boot', shoeLen: 3 },
  sleeve: 3,
  apron: 'bib',
  scarf: true,
  // wiping her hands on a towel
  act(f, p, u) {
    if (p.act !== 'wipe') return false;
    f.part('skin', { shade: 'b', light: '' });
    f.line(3, 13 + u, 6, 16 + u).line(12, 13 + u, 9, 16 + u);
    f.part('towel', { shade: 'rb', light: 't' });
    f.rect(6 + (p.ph ? 1 : 0), 15 + u, 4, 3);
    f.part('skin', { shade: '', light: '' });
    f.px(6, 16 + u).px(9 + (p.ph ? 1 : 0), 16 + u);
    return true;
  },
  idle: [...breathe(2), { act: 'wipe', ph: 0 }, { act: 'wipe', ph: 1 }, { act: 'wipe', ph: 0 }, { act: 'wipe', ph: 1 }, { breath: 0, blink: true }, ...breathe(1)],
});

// ---------------------------------------------------------------- ときお（時計店）

folk({
  id: 'npc_tokio',
  mats: {
    ...base,
    skin: SKIN_MID,
    hair: mat('#E8E4D8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9E978C', rim: '#FFE0B8' }),
    brow: flat('#C8C2B4'),
    top: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF', dark: '#9AA0A8', rim: '#FFE0B8' }),
    vest: mat('#6B7186', { shade: '#4E5262', light: '#8A90A0', dark: '#2A2440', rim: '#B89A9A' }),
    cuffM: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A' }),
    slacks: mat('#5A3A2A', { shade: '#3A2B2A', light: '#8A5A3A' }),
    shoe: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
    glass: flat('#3A3F48'),
    lens: flat('#BDEFFA'),
    loupe: flat('#2A2440'),
    loupeG: flat('#7FD1E8'),
    watch: flat('#D9A441'),
  },
  head: HEAD_BALD,
  hy: 2,
  legs: { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'slacks', shoe: 'shoe', shoeLen: 3 },
  sleeve: 2,
  cuff: 'cuffM',
  vest: true,
  glasses: 'round',
  // a pocket watch held up to the eye loupe
  act(f, p, u) {
    if (p.act !== 'loupe') return false;
    const seg: Seg[] = [{ mat: 'top', n: 2 }, { mat: 'cuffM', n: 2 }, { mat: 'skin' }];
    hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u, 'L');
    f.part('cuffM', { shade: 'rb', light: 't', shift: -1 });
    f.line(12, 13 + u, 10, 14 + u);
    f.part('skin', { shade: '', light: '' });
    f.px(9, 14 + u).px(9, 13 + u);
    f.part('watch', { flat: true, rim: false });
    f.px(8, 13 + u + (p.ph ? 0 : 1));
    return true;
  },
  idle: [...breathe(2), { act: 'loupe', ph: 0 }, { act: 'loupe', ph: 0 }, { act: 'loupe', ph: 1 }, { act: 'loupe', ph: 1 }, { act: 'loupe', ph: 0, blink: true }, ...breathe(1)],
});

// ---------------------------------------------------------------- マスター（喫茶 夕顔）

folk({
  id: 'npc_master',
  mats: {
    ...base,
    skin: SKIN_MID,
    hair: mat('#6B7186', { shade: '#4E5262', light: '#9AA0A8', dark: '#2A2440', rim: '#C8B8B0' }),
    brow: flat('#3A3F48'),
    top: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF', dark: '#9AA0A8', rim: '#FFE0B8' }),
    vest: mat('#2A2440', { shade: '#1B1733', light: '#4A3A6E', dark: '#0B0B14', rim: '#7A5AA0' }),
    tie: flat('#8A2E3A'),
    tieK: flat('#5E1E2A'),
    slacks: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
    shoe: mat('#2A2440', { shade: '#1B1733', light: '#3A3F48', spec: '#9AA0A8' }),
    stache: flat('#4E5262'),
    cup: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFFFFF' }),
    cloth: flat('#E8D9B5'),
  },
  head: HEAD_BACK,
  hy: 2,
  legs: { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'slacks', shoe: 'shoe', shoeLen: 3 },
  sleeve: 3,
  vest: true,
  bowtie: true,
  moustache: true,
  // polishing a cup (the cloth goes round)
  act(f, p, u) {
    if (p.act !== 'polish') return false;
    f.part('top', { shade: 'b', light: '' });
    f.line(3, 13 + u, 6, 16 + u).line(12, 13 + u, 9, 16 + u);
    f.part('cup', { shade: 'rb', light: 't' });
    f.rect(7, 14 + u, 3, 3);
    f.part('cloth', { flat: true, rim: false });
    f.rect(p.ph ? 9 : 6, 15 + u, 2, 2);
    f.part('skin', { shade: '', light: '' });
    f.px(6, 16 + u).px(10, 16 + u);
    return true;
  },
  idle: [...rep([{ act: 'polish', ph: 0 }, { act: 'polish', ph: 1 }], 4), ...breathe(1), { breath: 0, blink: true }, { breath: 0 }],
});

// ---------------------------------------------------------------- おかみ（山吹酒店）

folk({
  id: 'npc_okami',
  mats: {
    ...base,
    skin: SKIN_MID,
    hair: mat('#2B1E1A', { shade: '#2A2440', light: '#5A3A2A', dark: '#1B1733' }),
    brow: flat('#2B1E1A'),
    top: mat('#D9A441', { shade: '#A8742A', light: '#F6D98A', dark: '#8A5A3A', rim: '#FFE0A0' }),
    apron: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE', dark: '#1B1733', rim: '#8A7AB0' }),
    strap: flat('#F4F1E8'),
    band: mat('#2F4A8A', { shade: '#243A72', light: '#4A6AAE' }),
    bandDot: flat('#F4F1E8'),
    pants: mat('#3A3F48', { shade: '#2A2440', light: '#6B7186' }),
    sandal: mat('#8A5A3A', { shade: '#5A3A2A', light: '#A8742A' }),
  },
  head: HEAD_BUN,
  hy: 2,
  legs: { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', shoe: 'sandal', shoeLen: 3 },
  sleeve: 1,
  apron: 'waist',
  headband: true,
  // hands on her hips, then a laugh (a bob)
  act(f, p, u) {
    if (p.act !== 'hips') return false;
    f.part('top', { shade: 'rb', light: 't' });
    f.px(2, 13 + u).px(13, 13 + u);
    f.part('skin', { shade: 'b', light: '' });
    f.line(2, 14 + u, 3, 16 + u).line(13, 14 + u, 12, 16 + u);
    f.px(4, 16 + u).px(11, 16 + u);
    return true;
  },
  idle: [...rep([{ act: 'hips' }], 4), ...breathe(1), { act: 'hips', breath: 1 }, { act: 'hips', breath: 1, blink: true }, { act: 'hips' }, ...breathe(1)],
});
