// Town NPCs (3): 日傘の人 + コタロウ, おじいさん, 水まきの人, 影の人.

import { flat, mat, type Fig, type Mats } from '../fig';
import { HAIR_BLACK, SKIN_LIGHT, SKIN_MID, SKIN_TAN } from '../mats';
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

// =============================================================================
// 日傘の人 (npc_madam): 60s. White lace parasol (twirls, 3 frames), lilac
// blouse, white trousers, short grey hair, a red leash to コタロウ.
// Canvas 20×28 so the parasol can overhang; feet at the bottom centre.

const MADAM: Mats = {
  ...base,
  skin: SKIN_LIGHT,
  hair: mat('#9AA0A8', { shade: '#747A88', light: '#BCC2C8', dark: '#4E5262', spec: '#DCE0E4', rim: '#E0B8A0' }),
  blouse: mat('#B8A0D0', { shade: '#8E78AE', light: '#D4C2E4', dark: '#5E4E7A', rim: '#F0B8B0' }),
  pants: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C', rim: '#FFDCB4' }),
  shoe: mat('#C8A07A', { shade: '#9A7A5A', light: '#E0C09A' }),
  lace: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFFFFF', dark: '#A89C88', rim: '#FFE0B8', ol: '#6A5E6A' }),
  rib: flat('#C8BCA8'),
  shaft: flat('#C0C6CC'),
  handle: flat('#A8742A'),
  leash: flat('#E84E3C'),
  brow: flat('#747A88'),
};

const MADAM_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [3, 0, ['..HHhhhh..', '.HKHhhhhd.', 'HHhhhhhhdd', 'Hhhd..dhdd', 'hd......dd', 'hd......d.']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  mouthD: [7, 7, 2],
  blushD: [5, 10, 6],
  neckD: [7, 9, 2],
  hairU: [3, 0, ['..HHhhhh..', '.HKHhhhhd.', 'HHhhhhhhdd', 'Hhhhhhhhdd', 'hhhhhhhhdd', 'hhhhhhhhdd', '.hdhhdhhd.']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [3, 0, ['..######..', '.########d', '##########', '#dd.######', '.....#####', '.....####d', '......##d.']],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 6],
  neckL: [5, 9, 2],
};

const MADAM_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', shoe: 'shoe', shoeLen: 3 };

/** Lace parasol canopy. ph = twirl phase (0..2). */
function parasol(f: Fig, view: string, ph: number, cx: number, y: number) {
  f.offset(0, 0);
  f.part('lace', { shade: 'rb', light: 'tl' });
  const rows = view === 'up'
    ? ['.....########.....', '...############...', '..##############..', '.################.', '##################', '#.##.##.##.##.##.#']
    : ['......######......', '...############...', '.################.', '##################', '##################', '#.##.##.##.##.##.#'];
  const x0 = cx - 9;
  for (let j = 0; j < rows.length; j++) {
    let r = rows[j];
    if (j === rows.length - 1) r = r.slice(ph) + r.slice(0, ph);
    f.rows(x0, y + j, [r]);
  }
  // ribs rotate with the twirl
  f.part('rib', { flat: true, rim: false });
  const ribs = [[2, 6, 11, 15], [3, 7, 12, 16], [1, 5, 10, 14]][ph % 3];
  for (const rx of ribs) f.px(x0 + rx, y + 3).px(x0 + rx + (rx < 9 ? -1 : 1), y + 4);
  // lace holes along the scallops
  f.part('lace', { flat: true });
  for (let x = 1 + (ph % 2); x < 17; x += 3) f.t(-1).px(x0 + x, y + 4);
  f.t(null);
  // finial
  f.part('shaft', { flat: true, rim: false });
  f.px(cx - 1, y - 1).px(cx, y - 1);
}

function madamDraw(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const ph = p.mode === 'idle' ? p.tick % 3 : p.mode === 'walk' ? p.step % 3 : 0;
  const hy = 2 + u;
  f.offset(2, 4);
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, MADAM_LEGS);
    f.part('blouse', { shade: 'rb', light: 't' });
    f.hl(4, 11, 11 + u);
    f.rect(3, 12 + u, 10, 17 + b - (12 + u));
    f.part('blouse', { flat: true });
    if (p.view === 'down') f.t(1).px(7, 11 + u).px(8, 11 + u).t(-1).px(7, 12 + u).px(8, 12 + u).t(null);
    const seg: Seg[] = [{ mat: 'blouse', n: 3 }, { mat: 'skin' }];
    if (p.view === 'down') {
      // her right hand (viewer-left) holds the parasol at the chest; left holds the leash
      f.part('blouse', { shade: 'rb', light: 't' });
      f.rect(2, 12 + u, 2, 3);
      f.part('skin', { shade: '', light: '' });
      f.px(4, 15 + u).px(5, 15 + u);
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u, 'R');
      f.part('leash', { flat: true, rim: false, ol: false });
      f.px(13, 17 + u).px(14, 18 + u).px(15, 19 + u).px(16, 20 + u).px(17, 21 + u);
      f.part('shaft', { flat: true, rim: false });
      f.vl(5, 7 + u, 14 + u);
      f.part('handle', { flat: true, rim: false });
      f.px(5, 16 + u).px(6, 17 + u);
    } else {
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u);
      f.part('leash', { flat: true, rim: false, ol: false });
      f.px(2, 17 + u).px(1, 18 + u).px(0, 19 + u);
    }
    head(f, p, MADAM_HEAD, hy);
    parasol(f, p.view, ph, p.view === 'down' ? 9 : 10, 0 + u + (p.lookUp ? -1 : 0) + (p.view === 'up' ? 2 : 0));
    return;
  }
  const sw = sideSwing(p);
  sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'blouse', n: 3 }, { mat: 'skin' }], -1);
  legs(f, p, MADAM_LEGS);
  f.part('blouse', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 17 + b - (12 + u));
  f.part('blouse', { shade: 'rb', light: 'tl' });
  f.rect(7, 12 + u, 3, 2);
  f.part('skin', { shade: '', light: '' });
  f.t(0).line(7, 14 + u, 5, 15 + u).t(null);
  f.part('shaft', { flat: true, rim: false });
  f.line(5, 14 + u, 9, 5 + u);
  f.part('handle', { flat: true, rim: false });
  f.px(5, 16 + u).px(4, 17 + u);
  f.part('leash', { flat: true, rim: false, ol: false });
  f.px(4, 15 + u).px(4, 16 + u).px(3, 17 + u).px(3, 18 + u).px(2, 19 + u).px(2, 20 + u).px(1, 21 + u);
  head(f, p, MADAM_HEAD, hy);
  parasol(f, 'left', ph, 12, u + (p.lookUp ? 0 : 0));
}

registerChar('npc_madam', () =>
  buildSprite({
    id: 'npc_madam',
    w: 20,
    h: 28,
    mats: MADAM,
    draw: madamDraw,
    walkFrameMs: 160,
    idle: rep([{ breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 0 }, { breath: 0, blink: true }], 2),
    idleFrameMs: 200,
    extras: { surprised: { dirs: ['down'] } },
    shadow: 14,
  }),
);

// =============================================================================
// コタロウ (npc_kotaro): small shiba. Golden red-brown with a white muzzle,
// chest and "eyebrows", curled tail, red collar. Idle: wags (2 frames) and
// sniffs the ground. look_up: nose to the sky. Canvas 16×14.

const DOG: Mats = {
  fur: mat('#D9A441', { shade: '#A8742A', light: '#F0C470', dark: '#6E4A1E', rim: '#FFC47A', ol: '#4A3020' }),
  white: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFFFFF', dark: '#A89C88', ol: '#5A4A3A' }),
  nose: flat('#2A2440'),
  eye: flat('#2A1C28'),
  collar: flat('#E84E3C'),
  ear: flat('#F0A080'),
};

function dogSide(f: Fig, p: Pose) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const act = p.act;
  const sniff = act === 'sniff';
  const up = p.lookUp;
  const wag = act === 'wag' ? p.ph : p.mode === 'walk' ? p.step % 2 : 0;
  const by = p.mode === 'walk' && st % 2 ? -1 : 0;
  // legs (far pair shaded)
  const lf = st === 1 ? -1 : st === 3 ? 1 : 0;
  f.part('fur', { shade: 'r', light: '', shift: -1 });
  f.rect(5 - lf, 10 + by, 1, 3 - by).rect(11 + lf, 10 + by, 1, 3 - by);
  f.part('fur', { shade: 'r', light: '' });
  f.rect(4 + lf, 10 + by, 1, 3 - by).rect(10 - lf, 10 + by, 1, 3 - by);
  f.part('white', { flat: true });
  f.px(4 + lf, 12).px(10 - lf, 12);
  // body
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(4, 6 + by, ['.#########', '##########', '##########', '.########.']);
  f.part('white', { shade: 'b', light: '' });
  f.rect(5, 9 + by, 5, 1);
  // curled tail over the back
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(12 + (wag ? 1 : 0), 3 + by, ['.##', '#.#', '##.']);
  f.part('white', { flat: true });
  f.px(13 + (wag ? 1 : 0), 4 + by);
  // head
  const hy = (sniff ? 3 : up ? -2 : 0) + by;
  const hx = sniff ? -1 : 0;
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(1 + hx, 3 + hy, ['.#.#..', '######', '######', '#####.']);
  f.part('ear', { flat: true, rim: false });
  f.px(2 + hx, 3 + hy);
  f.part('white', { shade: 'b', light: '' });
  f.rows(0 + hx, 6 + hy, ['####..', '.###..']);
  f.px(3 + hx, 4 + hy);
  f.part('nose', { flat: true, rim: false });
  f.px(0 + hx, 6 + hy - (up ? 1 : 0));
  f.part('eye', { flat: true, rim: false });
  if (!p.blink) f.px(2 + hx, 5 + hy);
  f.part('collar', { flat: true, rim: false });
  f.vl(5, 6 + by, 8 + by);
}

// Front / back: a four-legged dog, not a box on two legs — the near pair of
// legs in full tone, the far pair 1px wider and a step darker, the body short
// and wide, the curled tail peeking over the back behind the head.
function dogFront(f: Fig, p: Pose) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const sniff = p.act === 'sniff';
  const up = p.lookUp;
  const by = p.mode === 'walk' && st % 2 ? -1 : 0;
  const back = p.view === 'up';
  const wag = p.act === 'wag' ? p.ph : p.mode === 'walk' ? st % 2 : 0;
  const l = st === 1 ? 1 : 0;
  const r = st === 3 ? 1 : 0;
  // far legs (hind legs from the front, forelegs from behind): wider apart, darker
  f.part('fur', { shade: 'r', light: '', shift: -1 });
  f.rect(3, 10 + by, 1, 3 - by - r).rect(12, 10 + by, 1, 3 - by - l);
  f.part('white', { flat: true, shift: -1 });
  f.px(3, 12 - r).px(12, 12 - l);
  // body: short and wide, haunches out to the far legs
  f.part('fur', { shade: 'rb', light: 't', shift: back ? 0 : -1 });
  f.rows(3, 6 + by, ['.########.', '##########', '##########', '##########', '.########.']);
  if (back) {
    // from behind: the rump in front, the curled tail on it; the ears
    // swivel now and then; breathing lifts the back 1px
    const br = p.breath < 0 ? 1 : 0;
    f.part('fur', { shade: 'r', light: '' });
    f.rect(5, 10, 2, 3 - l).rect(9, 10, 2, 3 - r);
    f.part('white', { flat: true });
    f.hl(5, 6, 12 - l).hl(9, 10, 12 - r);
    const ear = p.act === 'ear';
    const hy = (up ? 1 : 0) + by + br;
    f.part('fur', { shade: 'rb', light: 't' });
    f.rows(4, 1 + hy, [up ? '.#....#.' : ear ? '.......#' : '#......#', ear && !up ? '#.....##' : '##....##', '########', '########']);
    if (up) {
      // nose to the sky: the muzzle tip shows over the back of the head
      f.part('white', { flat: true });
      f.px(7, 1 + hy).px(8, 1 + hy);
    }
    f.part('collar', { flat: true, rim: false });
    f.hl(5, 10, 5 + hy);
    f.part('fur', { shade: 'rb', light: 't', sep: true });
    f.rows(6 + (p.act === 'wag' ? p.ph : 0), 6 + by, ['.##.', '#..#', '#.##', '.##.']);
    f.part('white', { flat: true });
    f.px(7 + (p.act === 'wag' ? p.ph : 0), 7 + by).px(8 + (p.act === 'wag' ? p.ph : 0), 7 + by);
    return;
  }
  // curled tail peeking over the back, behind the head
  f.part('fur', { shade: 'rb', light: 't', shift: -1 });
  f.rows(11 + wag, 3 + by, ['.##', '#.#', '##.']);
  f.part('white', { flat: true, shift: -1 });
  f.px(12 + wag, 4 + by);
  // forelegs in front
  f.part('fur', { shade: 'r', light: '' });
  f.rect(5, 10, 2, 3 - l).rect(9, 10, 2, 3 - r);
  f.part('white', { flat: true });
  f.hl(5, 6, 12 - l).hl(9, 10, 12 - r);
  // white chest between the forelegs
  f.part('white', { shade: 'b', light: '' });
  f.rect(6, 8 + by, 4, 3);
  const hy = (sniff ? 3 : up ? -1 : 0) + by;
  if (up) {
    // stretched neck: the white throat shows under the raised chin
    f.part('white', { shade: 'r', light: '' });
    f.rect(6, 6 + by, 4, 2);
  }
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(4, 1 + hy, up ? ['#......#', '##....##', '########', '########', '.######.'] : ['#......#', '##....##', '########', '########', '########', '.######.']);
  f.part('ear', { flat: true, rim: false });
  f.px(4, 2 + hy).px(11, 2 + hy);
  f.part('white', { shade: 'b', light: '' });
  if (up) f.rows(5, 4 + hy, ['.####.', '######']);
  else f.rows(5, 5 + hy, ['.####.', '######', '.####.']);
  f.px(5, 3 + hy).px(10, 3 + hy);
  f.part('eye', { flat: true, rim: false });
  if (!p.blink) f.px(6, (up ? 3 : 4) + hy).px(9, (up ? 3 : 4) + hy);
  f.part('nose', { flat: true, rim: false });
  f.px(7, (up ? 4 : 5) + hy).px(8, (up ? 4 : 5) + hy);
  f.part('collar', { flat: true, rim: false });
  f.hl(6, 9, 8 + by + (sniff ? 0 : 0));
}

registerChar('npc_kotaro', () =>
  buildSprite({
    id: 'npc_kotaro',
    h: 14,
    mats: DOG,
    draw: (f, p) => (p.view === 'left' ? dogSide(f, p) : dogFront(f, p)),
    walkFrameMs: 110,
    walkBob: [0, 0, 0, 0],
    idle: {
      left: [...rep([{ act: 'wag', ph: 0 }, { act: 'wag', ph: 1 }], 4), { act: 'sniff' }, { act: 'sniff' }, { act: 'sniff', blink: true }, { act: 'sniff' }, { act: 'wag', ph: 0 }, { act: 'wag', ph: 1 }],
      right: [...rep([{ act: 'wag', ph: 0 }, { act: 'wag', ph: 1 }], 4), { act: 'sniff' }, { act: 'sniff' }, { act: 'sniff', blink: true }, { act: 'sniff' }, { act: 'wag', ph: 0 }, { act: 'wag', ph: 1 }],
      down: [{}, {}, {}, { blink: true }, {}, {}, { act: 'sniff' }, { act: 'sniff' }],
      up: [
        ...rep([{ act: 'wag', ph: 0 }, { act: 'wag', ph: 1 }], 3),
        { breath: 1 }, { breath: 1 }, { act: 'ear' }, { act: 'ear' }, {}, { breath: 1 },
        ...rep([{ act: 'wag', ph: 0 }, { act: 'wag', ph: 1 }], 2),
      ],
    },
    idleFrameMs: 180,
    extras: { sniff: { dirs: ['down', 'left', 'right'] } },
    anims: { wag: { frames: [{ ph: 0 }, { ph: 1 }], ms: 130, dir: 'left' } },
    shadow: 12,
  }),
);

// =============================================================================
// おじいさん (npc_ojii): 70s. Short white hair, thick white brows, white
// running shirt, steteko, a towel round the neck, a navy uchiwa. Sits on the
// bench at the shogi board. Idle: fans (2 frames) → now and then moves a
// piece (pachi). Extras: sit, move, look_up.

const OJII: Mats = {
  ...base,
  skin: SKIN_MID,
  hair: mat('#E8E4D8', { shade: '#BDB6AC', light: '#FFFFFF', dark: '#8E887E', rim: '#FFD8B0' }),
  shirt: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C', rim: '#FFDCB4' }),
  steteko: mat('#E8E4D8', { shade: '#C4BCB0', light: '#FAF6EC', dark: '#9A9088', rim: '#FFD6A8' }),
  geta: mat('#A8784A', { shade: '#7A5430', light: '#C8A06A' }),
  towel: mat('#9FC8E0', { shade: '#78A0C0', light: '#C8E4F0' }),
  fan: mat('#2F4A8A', { shade: '#223668', light: '#4766A8' }),
  fanH: flat('#D9A441'),
  piece: flat('#F0D8A0'),
  brow: flat('#F4F1E8'),
};

const OJII_HEAD: HeadT = {
  faceD: [4, 2, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [4, 0, ['.HHhhhh.', 'Hhhhhhhd', 'h......d']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, closed: true, brow: { dy: -1, mat: 'brow', w: 2 } },
  mouthD: [7, 7, 2],
  neckD: [7, 8, 2],
  hairU: [4, 0, ['.HHhhhh.', 'Hhhhhhhd', 'hhhhhhhd', '.hhhhhd.']],
  napeU: [5, 4, ['######', '.####.']],
  faceL: [3, 2, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [4, 0, ['.#####..', '######d.', '...####.']],
  eyeL: { x: 4, y: 5, h: 1, closed: true, brow: { dy: -1, mat: 'brow', w: 2 } },
  earL: [8, 4],
  mouthL: [3, 7],
  neckL: [5, 8, 2],
};

const OJII_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'steteko', low: { mat: 'skin', h: 1 }, shoe: 'geta', shoeLen: 3 };

function ojiiDraw(f: Fig, p: Pose) {
  const act = p.act;
  const seated = p.mode === 'idle' || act === 'sit' || act === 'fan' || act === 'move';
  const drop = seated ? 3 : 0;
  const u = upper(p) + drop;
  const b = p.bob + drop;
  const hy = 3 + u;
  if (p.view === 'down' || p.view === 'up') {
    if (seated) sitLegs(f, p, OJII_LEGS, 18);
    else legs(f, p, OJII_LEGS);
    // running shirt: straps + bare shoulders
    f.part('shirt', { shade: 'rb', light: 't' });
    f.rect(4, 12 + u, 8, 17 + b - (12 + u) + (seated ? 0 : 1));
    f.part('skin', { shade: 'r', light: '' });
    if (p.view === 'down') f.px(6, 12 + u).px(7, 12 + u).px(8, 12 + u).px(9, 12 + u);
    f.part('towel', { shade: 'b', light: '' });
    f.hl(5, 10, 11 + u);
    if (p.view === 'down') f.px(5, 12 + u).px(5, 13 + u).px(10, 12 + u);
    const seg: Seg[] = [{ mat: 'skin' }];
    if (act === 'fan' && p.view === 'down') {
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u, 'R');
      f.part('skin', { shade: '', light: '' });
      f.t(0).line(3, 12 + u, 3, 14 + u).t(null);
      const fy = p.ph ? 10 : 11;
      f.part('fanH', { flat: true, rim: false });
      f.px(3, 14 + u).px(3, 13 + u);
      f.part('fan', { shade: 'rb', light: 't' });
      f.rows(1, fy + u - 1, ['.###.', '#####', '#####', '.###.']);
    } else if (act === 'move' && p.view === 'down') {
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u, 'L');
      f.part('skin', { shade: '', light: '', shift: -1 });
      f.t(0).line(12, 12 + u, 10, 17 + u).t(null);
      f.part('piece', { flat: true, rim: false });
      f.px(10, 18 + u - p.ph);
    } else hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u);
    head(f, p, OJII_HEAD, hy);
    return;
  }
  const sw = seated ? 0 : sideSwing(p);
  if (!seated) sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'skin' }], -1);
  if (seated) sitLegs(f, p, OJII_LEGS, 18);
  else legs(f, p, OJII_LEGS);
  f.part('shirt', { shade: 'rb', light: 't' });
  f.rect(5, 12 + u, 6, 17 + b - (12 + u) + (seated ? 0 : 1));
  f.part('towel', { shade: 'b', light: '' });
  f.hl(5, 9, 11 + u);
  if (act === 'fan') {
    f.part('skin', { shade: '', light: '' });
    f.t(0).line(8, 12 + u, 6, 14 + u).t(null);
    f.part('fan', { shade: 'rb', light: 't' });
    f.rows(3 + p.ph, 9 + u, ['.##', '###', '###', '.##']);
  } else sideArm(f, 8, 12 + u, 4, sw, [{ mat: 'skin' }]);
  head(f, p, OJII_HEAD, hy);
}

const OJII_IDLE: IdleKey[] = [
  ...rep([{ act: 'fan', ph: 0 }, { act: 'fan', ph: 1 }], 6),
  { act: 'move', ph: 0 }, { act: 'move', ph: 1 }, { act: 'sit', blink: true }, { act: 'sit' },
];

registerChar('npc_ojii', () =>
  buildSprite({
    id: 'npc_ojii',
    mats: OJII,
    draw: ojiiDraw,
    walkFrameMs: 180,
    idle: { down: OJII_IDLE, left: OJII_IDLE, right: OJII_IDLE, up: rep([{ act: 'sit', breath: 0 }, { act: 'sit', breath: 1 }], 4) },
    extras: {
      sit: { dirs: 'all' },
      look_up: { dirs: 'all', p: { lookUp: true, act: 'sit' } },
      move: { dirs: ['down'], p: { ph: 1 } },
    },
    anims: { fan: { frames: [{ ph: 0 }, { ph: 1 }], ms: 250 } },
    poses: { sit: 'idle' },
  }),
);

// =============================================================================
// 水まきの人 (npc_mizumaki): 50s. Brown permed hair, white sun visor, floral
// apron, pink rubber boots, a green hose. Idle: waters the road — the water
// arch animates (3 frames) and swings left / right. 'spray_frozen' is the
// stage-1 still arch. Canvas 40×24 (person in the middle, arch to the sides).

const MIZU: Mats = {
  ...base,
  skin: SKIN_MID,
  hair: mat('#6B4A3A', { shade: '#4E3428', light: '#8E6A52', dark: '#34221A', spec: '#AE8A6A', rim: '#C8704A' }),
  visor: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C' }),
  top: mat('#B8C4D0', { shade: '#909CAE', light: '#D8E0E8', dark: '#5E6A7E', rim: '#E8C0A8' }),
  apron: mat('#E0567A', { shade: '#B03A5E', light: '#F07A9A', dark: '#7A2240', rim: '#FF9A8A' }),
  flower: flat('#F4F1E8'),
  pants: mat('#5A5060', { shade: '#443C4A', light: '#766C7E' }),
  boot: mat('#D9728A', { shade: '#B04A6A', light: '#F0A0B0', dark: '#7A2E48' }),
  hose: mat('#5FA85A', { shade: '#3E7A40', light: '#8ECC7A', dark: '#2A5A2E' }),
  nozzle: flat('#E8D060'),
  brow: flat('#4E3428'),
};

const MIZU_HEAD: HeadT = {
  faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
  hairD: [2, 0, ['..hHhHhhdh..', '.HhKhHhhdhd.', 'hHhHhhhhhdhd', 'hhd......dhd', 'hd........dd', '.h........d.']],
  eyesD: { x: 6, d: 3, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  mouthD: [7, 7, 2],
  blushD: [5, 10, 6],
  neckD: [7, 9, 2],
  hairU: [2, 0, ['..hHhHhhdh..', '.HhKhHhhdhd.', 'hHhHhhhhhdhd', 'hhdhhdhhdhdd', 'hdhhdhhdhhdd', '.hdhhdhhdhd.', '..h.d..d.h..']],
  faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
  hairL: [2, 0, ['...hHhHhh...', '..hHhhhhdhd.', '.hhhhhhhhhdd', '.hd.hhhhdhdd', '.....hhdhhdd', '.....dhdhhd.', '......dhhd..']],
  eyeL: { x: 4, y: 5, h: 1, brow: { dy: -1, mat: 'brow', w: 1 } },
  earL: [8, 5],
  mouthL: [3, 7],
  blushL: [5, 6],
  neckL: [5, 9, 2],
};

function visor(f: Fig, view: string, y: number) {
  f.part('visor', { shade: 'b', light: '' });
  if (view === 'down') {
    f.hl(3, 12, y + 2);
    f.part('visor', { shade: 'rb', light: 't' });
    f.rect(4, y + 3, 8, 1);
  } else if (view === 'up') f.hl(3, 12, y + 2);
  else {
    f.hl(3, 12, y + 2);
    f.part('visor', { shade: 'rb', light: 't' });
    f.hl(1, 4, y + 3);
  }
}

const MIZU_LEGS: LegSpec = { cx: 8, hip: 17, foot: 22, w: 2, gap: 2, mat: 'pants', low: { mat: 'boot', h: 2 }, shoe: 'boot', shoeLen: 3 };

/** Water arch from the nozzle. dir -1 = to the left, +1 = right. ph 0..2 animates the droplets. */
function water(f: Fig, x0: number, y0: number, dir: number, ph: number, frozen: boolean, mirror: boolean) {
  f.offset(0, 0);
  f.after((pc) => {
    const set = (x: number, y: number, c: string) => pc.set(mirror ? pc.w - 1 - x : x, y, c);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = x0 + dir * Math.round(t * 16);
      const y = Math.round(y0 - 5 * Math.sin(Math.PI * t * 0.9) + t * t * 9);
      pts.push([x, y]);
    }
    pts.forEach(([x, y], i) => {
      // solid stream near the nozzle, breaking into droplets further out
      const solid = i < 9;
      const on = frozen || solid ? true : (i + ph) % 3 !== 0;
      if (!on) return;
      // design 9.3: grains of #7FD1E8 and #F4F1E8 (a glint travels along
      // the stream), the underside of the solid stream one step deeper
      const hi = (i + ph * 2) % 5 === 0;
      set(x, y, hi ? '#F4F1E8' : '#7FD1E8');
      if (solid || frozen) set(x, y + 1, '#4AA8E0');
    });
    const [ex, ey] = pts[pts.length - 1];
    // splash + wet patch where it lands (the patch is the one see-through bit)
    const sp = frozen ? 1 : ph;
    set(ex - 1, ey - 1 - (sp === 1 ? 1 : 0), '#F4F1E8');
    set(ex + 1, ey - 1 - (sp === 2 ? 1 : 0), '#7FD1E8');
    set(ex, ey - 2 - (sp === 0 ? 1 : 0), '#F4F1E8');
    for (let i = -2; i <= 2; i++) set(ex + i, ey + 1, '#4AA8E055');
  });
}

function mizuDraw(f: Fig, p: Pose) {
  const u = upper(p);
  const b = p.bob;
  const act = p.act;
  const spraying = act === 'spray' || act === 'spray_frozen';
  const hy = 2 + u;
  f.offset(12, 0);
  if (p.view === 'down' || p.view === 'up') {
    legs(f, p, MIZU_LEGS);
    f.part('top', { shade: 'rb', light: 't' });
    f.hl(4, 11, 11 + u);
    f.rect(3, 12 + u, 10, 17 + b - (12 + u));
    f.part('apron', { shade: 'rb', light: 't' });
    if (p.view === 'down') {
      f.rect(5, 13 + u, 6, 19 + b - (13 + u));
      f.rect(4, 16 + b, 8, 4);
      f.part('flower', { flat: true, rim: false });
      f.px(6, 14 + u).px(9, 15 + u).px(5, 17 + b).px(8, 18 + b).px(10, 17 + b).px(6, 19 + b);
    } else {
      f.hl(3, 12, 16 + b);
      f.rows(6, 15 + b, ['#..#', '.##.']);
    }
    const seg: Seg[] = [{ mat: 'top', n: 3 }, { mat: 'skin' }];
    if (spraying && p.view === 'down') {
      const dir = p.ph >= 3 ? 1 : -1;
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u, dir < 0 ? 'R' : 'L');
      const hx = dir < 0 ? 2 : 13;
      f.part('top', { shade: 'rb', light: 't' });
      f.rect(dir < 0 ? 2 : 12, 12 + u, 2, 2);
      f.part('skin', { shade: '', light: '' });
      f.px(hx, 14 + u);
      f.part('nozzle', { flat: true, rim: false });
      f.px(hx + dir, 14 + u);
      // hose from the hand down and away behind her
      f.part('hose', { shade: 'r', light: '' });
      f.px(hx, 15 + u).px(hx, 16 + u).px(hx - dir, 17 + u);
      f.line(hx - dir, 18 + u, 7, 22);
      f.line(7, 22, -12 * dir + 8, 22);
      water(f, 12 + hx + dir * 2, 14 + u, dir, p.ph % 3, act === 'spray_frozen', false);
      f.offset(12, 0);
    } else {
      hangArms(f, p, { lx: 3, rx: 12, sy: 12, hy: 16, segs: seg }, u);
      if (p.view === 'down') {
        f.part('hose', { shade: 'r', light: '' });
        f.px(13, 17 + u).line(13, 18 + u, 15, 22);
        f.part('nozzle', { flat: true, rim: false });
        f.px(13, 16 + u);
      }
    }
    head(f, p, MIZU_HEAD, hy);
    visor(f, p.view, hy - 1 + hatLift(p));
    return;
  }
  const sw = sideSwing(p);
  sideArm(f, 9, 12 + u, 4, -sw, [{ mat: 'top', n: 3 }, { mat: 'skin' }], -1);
  legs(f, p, MIZU_LEGS);
  f.part('top', { shade: 'rb', light: 't' });
  f.hl(6, 10, 11 + u);
  f.rect(5, 12 + u, 6, 17 + b - (12 + u));
  f.part('apron', { shade: 'r', light: '' });
  f.rect(4, 13 + u, 2, 19 + b - (13 + u));
  f.part('flower', { flat: true, rim: false });
  f.px(4, 15 + u).px(5, 18 + b);
  f.part('top', { shade: 'rb', light: 'tl' });
  f.rect(7, 12 + u, 3, 2);
  if (spraying) {
    f.part('skin', { shade: '', light: '' });
    f.t(0).line(7, 14 + u, 4, 14 + u).t(null);
    f.part('nozzle', { flat: true, rim: false });
    f.px(3, 14 + u);
    f.part('hose', { shade: 'r', light: '' });
    f.line(5, 15 + u, 9, 22).line(9, 22, 20, 22);
    water(f, 12 + 2, 14 + u, -1, p.ph % 3, act === 'spray_frozen', p.mirror);
    f.offset(12, 0);
  } else sideArm(f, 8, 14 + u, 2, sw, [{ mat: 'skin' }]);
  head(f, p, MIZU_HEAD, hy);
  visor(f, 'left', hy - 1 + (p.lookUp ? -1 : 0));
}

const MIZU_IDLE: IdleKey[] = [
  ...rep([{ act: 'spray', ph: 0 }, { act: 'spray', ph: 1 }, { act: 'spray', ph: 2 }], 3),
  ...rep([{ act: 'spray', ph: 3 }, { act: 'spray', ph: 4 }, { act: 'spray', ph: 5 }], 3),
];

registerChar('npc_mizumaki', () =>
  buildSprite({
    id: 'npc_mizumaki',
    w: 40,
    mats: MIZU,
    draw: mizuDraw,
    idle: { down: MIZU_IDLE, left: rep([{ act: 'spray', ph: 0 }, { act: 'spray', ph: 1 }, { act: 'spray', ph: 2 }], 4), right: rep([{ act: 'spray', ph: 0 }, { act: 'spray', ph: 1 }, { act: 'spray', ph: 2 }], 4), up: breathingIdle() },
    idleFrameMs: 120,
    extras: {
      spray_frozen: { dirs: ['down', 'left', 'right'], p: { ph: 2 } },
      surprised: { dirs: ['down'] },
    },
    anims: { spray: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }], ms: 120 } },
  }),
);

// =============================================================================
// 影の人 (npc_shadow_man): no body, only the cast shadow (#3A2B5C, 70%) of a
// salaryman sitting on the bench (30_level_art 9.3, 10_narrative 6.16). The
// shadow lies on the surfaces it falls on: head and shoulders across the
// backrest slats, the lap on the seat, a darker 1px fold where it bends over
// the seat's front edge, then the legs and the square briefcase stretched
// across the ground, skewed toward the lower right (ESE) — the one shadow in
// stage 2 that never turns to the north-east. The necktie reads between the
// lapel gaps and the case through its handle hole (negative shapes).
// Idle: the flat arm swings up to the face to check the wristwatch → a sigh
// (the upper body sinks 1px toward the seat). Canvas 32×18 over the bench at
// (8,6): x = world − 120, y = world − 94 (backrest rows 1–8, seat 9–12,
// ground 13–17). No outline and no sunset rim — but so that it reads as
// someone you can talk to and not a stain on the bench, the part lying on
// the backrest has a faint violet edge light on its upper-left edge, and
// two tired pale eyes that blink, look down at the watch and shut on the
// sigh ('notice' opens them wide).

const SH_BODY = '#3A2B5CB3';
const SH_DARK = '#2A2440DD';
const SH_EDGE = '#7A5AA0B3';
const SH_EYE = '#F4E6A8';

// Cell map of the shadow: '#' body, '=' darker (tie, the fold over the seat
// edge, the case's lid seam, the watch), '.' nothing. Flat shapes only, no
// dither — the figure must read from its outline alone.
const SHADOW_UPPER = [
  // x: 0123456789012345678901234567890
  '...........###..................', // 0 head (side-parted crown)
  '..........#####.................', // 1
  '..........#####.................', // 2
  '..........#####.................', // 3
  '...........###..................', // 4 chin
  '...........###..................', // 5 neck
  '.........##.=.##................', // 6 sloped shoulders, collar V, tie knot
  '.......####.=.####..............', // 7
  '.......##.##=##.##..............', // 8 arms apart from the jacket
  '.......##.#===#.##..............', // 9 the tie's blade widens
];
const SHADOW_ARMS_WATCH = [
  '................................', // the head bows 1px toward the wrist
  '...........###..................',
  '..........#####.................',
  '..........#####=................', // the watch face held up by the chin
  '..........######................', // forearm raised across to it
  '...........###.##...............',
  '.........##.=.##.#..............', // elbow out past the shoulder
  '.......####.=.####..............',
  '.......##.##=##.................',
  '.......##.#===#.................',
];
const SHADOW_LOWER = [
  '.......###########..........###.', // 10 lap on the seat; case handle
  '.......###########.........#...#', // 11
  '........===========........#...#', // 12 fold over the seat's front edge (1px right)
  '.........##...##..........######', // 13 shins, stretched ESE; the case
  '..........##...##.........======', // 14 lid seam
  '...........##...##........######', // 15
  '............##...##.......######', // 16
  '............####.####......#####', // 17 shoes
];

function shadowMan(f: Fig, p: Pose) {
  const act = p.act;
  const sink = act === 'sigh' ? 1 : 0;
  const watch = act === 'watch';
  f.after((pc) => {
    const put = (rows: string[], y0: number, x0 = 0) =>
      rows.forEach((r, j) => {
        for (let i = 0; i < r.length; i++) {
          const ch = r[i];
          if (ch === '.') continue;
          const x = x0 + i;
          const y = y0 + j;
          if (x < 0 || y < 0 || x >= pc.w || y >= pc.h) continue;
          pc.set(x, y, ch === '=' ? SH_DARK : SH_BODY);
        }
      });
    // the upper body lies on the backrest and sinks 1px with the sigh; the
    // lap, the fold and everything on the ground stay put
    const upper = watch ? SHADOW_ARMS_WATCH : SHADOW_UPPER;
    put(upper, sink);
    put(SHADOW_LOWER, 10);
    // faint edge light along the upper-left edge of the head and shoulders
    const at = (x: number, y: number) => y >= 0 && x >= 0 && pc.alpha(x, y) > 0;
    // (outer edge only: the first pixel of each row from the left and of
    // each column from the top, so the tie and lapel gaps stay flat)
    const rows = 9 + sink;
    const edge: [number, number][] = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < 20; x++)
        if (at(x, y)) {
          edge.push([x, y]);
          break;
        }
    for (let x = 0; x < 20; x++)
      for (let y = 0; y < rows; y++)
        if (at(x, y)) {
          edge.push([x, y]);
          break;
        }
    for (const [x, y] of edge) pc.set(x, y, SH_EDGE);
    // the eyes: blink, look down at the wrist, shut on the sigh
    if (act === 'sigh' || p.blink) return;
    const ey = (watch ? 3 : p.lookUp ? 1 : 2) + sink;
    const ex = watch ? 12 : 11;
    pc.set(ex, ey, SH_EYE);
    pc.set(ex + 2, ey, SH_EYE);
    if (act === 'notice') {
      pc.set(ex, ey - 1, SH_EYE);
      pc.set(ex + 2, ey - 1, SH_EYE);
    }
  });
}

registerChar('npc_shadow_man', () =>
  buildSprite({
    id: 'npc_shadow_man',
    w: 32,
    h: 18,
    mats: {},
    draw: shadowMan,
    walkFrames: 1,
    idle: [{}, {}, {}, { blink: true }, {}, {}, { act: 'watch' }, { act: 'watch' }, { act: 'watch' }, { act: 'watch' }, { act: 'sigh' }, { act: 'sigh' }, { act: 'sigh' }, {}, { blink: true }, {}],
    idleFrameMs: 300,
    extras: { look_up: { dirs: ['down'] }, watch: { dirs: ['down'] }, sigh: { dirs: ['down'] }, notice: { dirs: ['down'] } },
    render: { outline: 'none' },
    shadow: 0,
  }),
);
