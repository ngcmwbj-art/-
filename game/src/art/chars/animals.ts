// Animals & the cow statue: npc_hato (+ generic pigeons), npc_sparrow,
// npc_crow, npc_cat_sauce / npc_cat_mike (+ extra coats), npc_cow_statue.
// Every one of them has 'look_up' for the 17:00 moment.

import { flat, mat, type Fig, type Mats } from './fig';
import { buildSprite, rep, type IdleKey, type Pose } from './rig';
import { registerChar } from './registry';

// =============================================================================
// Pigeons. npc_hato is the Ginza pigeon with a business card at its feet
// (becomes ハト係長 at stage 1). Walk = head-bob strut. Idle: pecks; every 8s
// drops a card and nods ('bow'). Canvas 16×14.

interface PigeonCoat {
  body: string;
  shade: string;
  light: string;
  head: string;
  bar: string;
  neckA: string;
  neckB: string;
}

const COAT_BLUE: PigeonCoat = { body: '#8E95A6', shade: '#6B7186', light: '#B8BECC', head: '#7A8194', bar: '#3A3F48', neckA: '#4FA37A', neckB: '#8A5FB0' };
const COAT_CHECK: PigeonCoat = { body: '#7E8496', shade: '#5E6376', light: '#A8AEBC', head: '#6A7084', bar: '#4A4E5E', neckA: '#5FB08A', neckB: '#9A6AB8' };
const COAT_ASH: PigeonCoat = { body: '#B4A8A0', shade: '#8E8278', light: '#D4CAC0', head: '#A09088', bar: '#7A5E52', neckA: '#8AAE7A', neckB: '#B08AA8' };

function pigeonMats(c: PigeonCoat): Mats {
  return {
    body: mat(c.body, { shade: c.shade, light: c.light, dark: '#4A4F63', rim: '#E8A888' }),
    head: mat(c.head, { shade: c.shade, light: c.light, dark: '#4A4F63', rim: '#E0A080' }),
    wing: mat(c.shade, { shade: '#555A6E', light: c.body, dark: '#3A3E50' }),
    bar: flat(c.bar),
    neckA: flat(c.neckA),
    neckB: flat(c.neckB),
    beak: flat('#E9C9A0'),
    cere: flat('#F4F1E8'),
    eye: flat('#F2E24B'),
    pupil: flat('#2A2440'),
    foot: mat('#E07A6A', { shade: '#B85A4A', light: '#F09A8A' }),
    card: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFFFFF' }),
    cardL: flat('#2F4A8A'),
  };
}

function pigeonSide(f: Fig, p: Pose, card: boolean) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const act = p.act;
  const peck = act === 'peck' ? p.ph : 0;
  const bow = act === 'bow' ? p.ph : 0;
  const up = p.lookUp;
  // head position: strut bobs the head forward/back
  const hx = (p.mode === 'walk' ? [0, -1, 0, 1][st] : 0) - (peck ? 2 : 0) - (bow ? 1 : 0);
  const hy = (peck ? 4 : 0) + (bow ? 2 : 0) + (up ? -1 : 0);
  // feet
  f.part('foot', { shade: 'r', light: '' });
  const fa = st === 1 ? -1 : st === 3 ? 1 : 0;
  f.px(6 + fa, 11).px(6 + fa, 12).px(5 + fa, 12).px(9 - fa, 11).px(9 - fa, 12).px(8 - fa, 12);
  // tail + body
  f.part('wing', { shade: 'rb', light: '' });
  f.rows(9, 7, ['...##', '..####', '.####.']);
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(3, 6, ['..#####...', '.########.', '##########', '.#########', '..######..']);
  // folded wing with two dark bars
  f.part('wing', { shade: 'rb', light: 't' });
  f.rows(6, 7, ['#####.', '.#####', '..###.']);
  f.part('bar', { flat: true, rim: false });
  f.px(8, 8).px(9, 8).px(9, 9).px(10, 9);
  // neck sheen (alternates when idle for the iridescence)
  const alt = (p.tick + st) % 2 === 1;
  f.part(alt ? 'neckB' : 'neckA', { flat: true, rim: false });
  f.px(4 + Math.max(hx, -1), 6).px(5, 6);
  f.part(alt ? 'neckA' : 'neckB', { flat: true, rim: false });
  f.px(4, 7);
  // head
  f.part('head', { shade: 'rb', light: 't' });
  f.rows(2 + hx, 2 + hy, ['.###.', '#####', '#####', '.###.']);
  f.part('beak', { flat: true, rim: false });
  f.px(1 + hx, 4 + hy - (up ? 1 : 0)).px(0 + hx, 4 + hy - (up ? 1 : 0));
  f.part('cere', { flat: true, rim: false });
  f.px(2 + hx, 3 + hy);
  f.part('eye', { flat: true, rim: false });
  f.px(3 + hx, 3 + hy);
  f.part('pupil', { flat: true, rim: false });
  if (!p.blink) f.px(3 + hx, 3 + hy + (up ? -0 : 0));
  f.part('eye', { flat: true, rim: false });
  if (!p.blink) f.px(4 + hx, 3 + hy);
  if (card || act === 'bow') {
    f.part('card', { shade: 'b', light: '' });
    f.rect(1, 11 + (bow === 2 ? 0 : 0), 3, 2);
    f.part('cardL', { flat: true, rim: false });
    f.px(2, 11);
  }
}

function pigeonFront(f: Fig, p: Pose, card: boolean) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const back = p.view === 'up';
  const peck = p.act === 'peck' ? p.ph : 0;
  const up = p.lookUp;
  const hy = (peck ? 3 : 0) + (up ? -1 : 0) + (p.mode === 'walk' && st % 2 ? 1 : 0);
  f.part('foot', { shade: 'r', light: '' });
  f.px(6, 11 + (st === 1 ? -1 : 0)).px(6, 12).px(9, 11 + (st === 3 ? -1 : 0)).px(9, 12).px(5, 12).px(10, 12);
  if (back) {
    f.part('wing', { shade: 'rb', light: '' });
    f.rows(6, 10, ['####', '.##.']);
  }
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(4, 5, ['..####..', '.######.', '########', '########', '.######.', '..####..']);
  if (back) {
    f.part('wing', { shade: 'rb', light: 't' });
    f.rows(4, 6, ['.##..##.', '###..###', '.##..##.']);
    f.part('bar', { flat: true, rim: false });
    f.px(5, 8).px(10, 8);
  } else {
    const alt = p.tick % 2 === 1;
    f.part(alt ? 'neckB' : 'neckA', { flat: true, rim: false });
    f.hl(6, 9, 5);
    f.part(alt ? 'neckA' : 'neckB', { flat: true, rim: false });
    f.px(6, 6).px(9, 6);
  }
  f.part('head', { shade: 'rb', light: 't' });
  f.rows(5, 1 + hy, ['.####.', '######', '######', '.####.']);
  if (!back) {
    f.part('eye', { flat: true, rim: false });
    f.px(5, 2 + hy).px(10, 2 + hy);
    f.part('pupil', { flat: true, rim: false });
    if (!p.blink) f.px(5, 2 + hy).px(10, 2 + hy);
    f.part('beak', { flat: true, rim: false });
    f.px(7, 4 + hy - (up ? 1 : 0)).px(8, 4 + hy - (up ? 1 : 0));
    f.part('cere', { flat: true, rim: false });
    f.px(7, 3 + hy).px(8, 3 + hy);
  }
  if (card) {
    f.part('card', { shade: 'b', light: '' });
    f.rect(11, 11, 3, 2);
    f.part('cardL', { flat: true, rim: false });
    f.px(12, 11);
  }
}

function pigeonSprite(id: string, coat: PigeonCoat, card: boolean, restored = false) {
  const IDLE: IdleKey[] = restored
    ? rep([{ act: 'peck', ph: 0 }, { act: 'peck', ph: 1 }, { act: 'peck', ph: 0 }, {}, {}, { blink: true }], 2)
    : [
        ...rep([{ act: 'peck', ph: 0 }, { act: 'peck', ph: 1 }, {}, {}], 7),
        { act: 'bow', ph: 0 }, { act: 'bow', ph: 1 }, { act: 'bow', ph: 2 }, { act: 'bow', ph: 0 },
      ];
  return buildSprite({
    id,
    h: 14,
    mats: pigeonMats(coat),
    draw: (f, p) => (p.view === 'left' ? pigeonSide(f, p, card) : pigeonFront(f, p, card)),
    walkFrameMs: 110,
    walkBob: [0, 0, 0, 0],
    idle: IDLE,
    idleFrameMs: 280,
    extras: { peck: { dirs: ['down', 'left', 'right'], p: { ph: 1 } } },
    anims: {
      peck: { frames: [{ ph: 0 }, { ph: 1 }], ms: 300, dir: 'left' },
      bow: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 0 }], ms: [200, 250, 250, 300], loop: false, dir: 'left' },
    },
    shadow: 8,
  });
}

registerChar('npc_hato', () => pigeonSprite('npc_hato', COAT_BLUE, true));
registerChar('npc_pigeon', () => pigeonSprite('npc_pigeon', COAT_BLUE, false));
registerChar('npc_pigeon_b', () => pigeonSprite('npc_pigeon_b', COAT_CHECK, false));
registerChar('npc_pigeon_c', () => pigeonSprite('npc_pigeon_c', COAT_ASH, false));
registerChar('restored_enemy_hato_kakaricho', () => pigeonSprite('restored_enemy_hato_kakaricho', COAT_BLUE, true, true));

// =============================================================================
// スズメ (npc_sparrow): tiny wire sparrow, 10×9. Brown cap, white cheek with a
// black spot, black bib, streaked back. Idle: hops / looks around; 'sing'
// (beak open) for the five-line-staff fushigi. Variants a/b face differently.

const SPARROW: Mats = {
  cap: mat('#8A5A3A', { shade: '#6A4228', light: '#AE7A52' }),
  back: mat('#A8784A', { shade: '#7A5430', light: '#C8A06A', dark: '#4A3018', rim: '#FFC080' }),
  streak: flat('#4A3018'),
  cheek: flat('#F4F1E8'),
  spot: flat('#2A2440'),
  belly: mat('#E8DCC8', { shade: '#C8B89E', light: '#FFF6E8' }),
  beak: flat('#4A3A3A'),
  beakO: flat('#E8B070'),
  eye: flat('#1A1420'),
  foot: flat('#C89A7A'),
};

function sparrow(f: Fig, p: Pose) {
  const hop = p.act === 'hop' ? 1 : 0;
  const sing = p.act === 'sing' ? p.ph : 0;
  const turn = p.act === 'turn';
  const up = p.lookUp ? 1 : 0;
  const y = -hop;
  if (p.view === 'left') {
    f.part('foot', { flat: true, rim: false });
    if (!hop) f.px(4, 8).px(6, 8);
    f.part('back', { shade: 'rb', light: 't' });
    f.rows(3, 3 + y, ['.####.', '######', '#######', '.####..']);
    f.part('back', { shade: 'rb', light: '' });
    f.px(9, 5 + y).px(9, 4 + y);
    f.part('belly', { shade: 'b', light: '' });
    f.rect(3, 6 + y, 3, 1).px(4, 5 + y);
    f.part('streak', { flat: true, rim: false });
    f.px(6, 4 + y).px(8, 5 + y);
    f.part('cap', { shade: 'r', light: 't' });
    f.rows(1, 1 + y - up, ['.###', '####', '####']);
    f.part('cheek', { flat: true, rim: false });
    f.px(2, 3 + y - up).px(3, 3 + y - up);
    f.part('spot', { flat: true, rim: false });
    f.px(3, 3 + y - up).px(2, 4 + y).px(3, 4 + y);
    f.part('eye', { flat: true, rim: false });
    if (!p.blink) f.px(2, 2 + y - up);
    f.part(sing ? 'beakO' : 'beak', { flat: true, rim: false });
    f.px(0, 2 + y - up * 2);
    if (sing) f.px(0, 3 + y - up);
    return;
  }
  // front / back
  const back = p.view === 'up';
  f.part('foot', { flat: true, rim: false });
  if (!hop) f.px(4, 8).px(6, 8);
  f.part(back ? 'back' : 'belly', { shade: 'rb', light: 't' });
  f.rows(2, 3 + y, ['.#####.', '#######', '#######', '.#####.']);
  if (!back) {
    f.part('spot', { flat: true, rim: false });
    f.px(4, 4 + y).px(5, 4 + y);
  } else {
    f.part('streak', { flat: true, rim: false });
    f.px(3, 4 + y).px(6, 5 + y).px(5, 7 + y);
  }
  f.part('cap', { shade: 'r', light: 't' });
  f.rows(2 + (turn ? 1 : 0), 0 + y - up, ['.#####.', '#######', '#######']);
  if (!back) {
    f.part('cheek', { flat: true, rim: false });
    f.px(2 + (turn ? 1 : 0), 2 + y - up).px(8 + (turn ? 1 : 0), 2 + y - up);
    f.part('eye', { flat: true, rim: false });
    if (!p.blink) f.px(4 + (turn ? 1 : 0), 1 + y - up).px(6 + (turn ? 1 : 0), 1 + y - up);
    f.part(sing ? 'beakO' : 'beak', { flat: true, rim: false });
    f.px(5 + (turn ? 1 : 0), 2 + y - up);
  }
}

function sparrowSprite(id: string, offset: number) {
  const IDLE: IdleKey[] = [{}, {}, { act: 'turn' }, { act: 'turn' }, {}, { act: 'hop' }, {}, { blink: true }, { act: 'sing', ph: 1 }, { act: 'sing', ph: 0 }, { act: 'sing', ph: 1 }, {}];
  const idle = [...IDLE.slice(offset), ...IDLE.slice(0, offset)];
  return buildSprite({
    id,
    w: 10,
    h: 10,
    mats: SPARROW,
    draw: sparrow,
    walkFrames: 4,
    walkBob: [0, 0, 0, 0],
    walkFrameMs: 90,
    idle,
    idleFrameMs: 240,
    extras: { sing: { dirs: ['down', 'left', 'right'], p: { ph: 1 } }, hop: { dirs: ['down', 'left', 'right'] } },
    anims: { sing: { frames: [{ ph: 1 }, { ph: 0 }], ms: 160 } },
    shadow: 0,
  });
}

registerChar('npc_sparrow', () => sparrowSprite('npc_sparrow', 0));
registerChar('npc_sparrow_b', () => sparrowSprite('npc_sparrow_b', 5));

// =============================================================================
// カラス (npc_crow): violet-black with a sheen, heavy bill, stands on one leg
// on top of a pole. Idle: tilts its head (2 frames), sometimes preens.
// Canvas 16×16.

const CROW: Mats = {
  body: mat('#2A2440', { shade: '#1B1733', light: '#4A3A6E', dark: '#0B0B14', spec: '#7A6AA0', rim: '#8A5A7A', ol: '#0B0B14' }),
  gloss: flat('#5A4A86'),
  bill: mat('#1E1A2A', { shade: '#141020', light: '#4A4458', spec: '#6A6478' }),
  eye: flat('#E8E4D8'),
  pupil: flat('#0B0B14'),
  foot: flat('#2A2440'),
};

function crow(f: Fig, p: Pose) {
  const tilt = p.act === 'tilt' ? p.ph : 0;
  const preen = p.act === 'preen';
  const up = p.lookUp;
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const hopY = p.mode === 'walk' && st % 2 ? -1 : 0;
  if (p.view === 'left') {
    f.part('foot', { flat: true, rim: false });
    f.vl(8, 13 + hopY, 14);
    if (p.mode === 'walk') f.vl(9, 13 + hopY, 14);
    f.px(7, 14);
    f.part('body', { shade: 'rb', light: 't' });
    f.rows(4, 5 + hopY, ['..######...', '.#########.', '###########', '###########', '.##########', '..#######..', '....####...']);
    // tail
    f.part('body', { shade: 'rb', light: '' });
    f.rows(12, 9 + hopY, ['###', '.##', '..#']);
    f.part('gloss', { flat: true, rim: false });
    f.px(7, 7 + hopY).px(8, 7 + hopY).px(9, 8 + hopY);
    // head
    const hx = preen ? 3 : 0;
    const hy = preen ? 3 : up ? -2 : 0;
    f.part('body', { shade: 'rb', light: 't' });
    f.rows(3 + hx, 1 + hy + hopY + (tilt ? 1 : 0), ['.####.', '######', '######', '.####.']);
    if (!preen) {
      f.part('bill', { shade: 'b', light: 't' });
      f.rows(0 + hx, 2 + hy + hopY + (tilt ? 1 : 0) - (up ? 1 : 0), ['####', '.###']);
      f.part('eye', { flat: true, rim: false });
      f.px(5 + hx, 2 + hy + hopY + (tilt ? 1 : 0));
      f.part('pupil', { flat: true, rim: false });
      if (!p.blink) f.px(5 + hx, 2 + hy + hopY + (tilt ? 1 : 0));
    }
    return;
  }
  const back = p.view === 'up';
  f.part('foot', { flat: true, rim: false });
  f.vl(7, 13, 14).vl(8, 13, 14);
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(4, 5 + hopY, ['.######.', '########', '########', '########', '.######.', '..####..', '...##...']);
  f.part('gloss', { flat: true, rim: false });
  f.px(5, 6 + hopY).px(5, 7 + hopY);
  const hy = up ? -1 : 0;
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(5 + (tilt ? 1 : 0), 1 + hy + hopY, ['.####.', '######', '######', '.####.']);
  if (!back) {
    // heavy bill pointing at the viewer, a glint in each eye
    f.part('bill', { shade: 'b', light: 't' });
    f.rows(6 + (tilt ? 1 : 0), 3 + hy + hopY - (up ? 1 : 0), ['.##.', '####', '.##.']);
    f.part('eye', { flat: true, rim: false });
    if (!p.blink) f.px(6 + (tilt ? 1 : 0), 2 + hy + hopY).px(9 + (tilt ? 1 : 0), 2 + hy + hopY);
  }
}

registerChar('npc_crow', () =>
  buildSprite({
    id: 'npc_crow',
    h: 16,
    mats: CROW,
    draw: crow,
    walkBob: [0, 0, 0, 0],
    idle: [{}, {}, {}, { act: 'tilt', ph: 1 }, { act: 'tilt', ph: 1 }, { act: 'tilt', ph: 1 }, {}, {}, { blink: true }, {}, { act: 'preen' }, { act: 'preen' }, {}, {}],
    idleFrameMs: 300,
    extras: { tilt: { dirs: ['down', 'left', 'right'], p: { ph: 1 } }, preen: { dirs: ['left', 'right'] } },
    shadow: 8,
  }),
);

// =============================================================================
// Cats. npc_cat_sauce: chubby orange tabby on the block wall, white front
// paws, eyes narrowed, collar with a tiny name tag. Idle: tail sway, yawns.
// npc_cat_mike: calico with a bell, curled asleep (breathing, ear twitch);
// 'sit' = awake, gazing up at the photo. Extra coats for scenery:
// npc_cat_kuro (black), npc_cat_hachi (black & white), npc_cat_shiro (white).

interface CatCoat {
  base: string;
  shade: string;
  light: string;
  stripe?: string;
  patch?: string;
  patch2?: string;
  paws: string;
  eye: string;
  collar?: string;
  bell?: boolean;
  squint?: boolean;
  fat?: boolean;
}

function catMats(c: CatCoat): Mats {
  return {
    fur: mat(c.base, { shade: c.shade, light: c.light, rim: '#FFC080' }),
    stripe: flat(c.stripe ?? c.shade),
    patch: mat(c.patch ?? c.base, { shade: c.shade, light: c.light }),
    patch2: mat(c.patch2 ?? c.base, { shade: c.shade, light: c.light }),
    paw: mat(c.paws, { shade: '#C8C2B4', light: '#FFFFFF' }),
    eye: flat(c.eye),
    pupil: flat('#1A1420'),
    nose: flat('#E88A8A'),
    inner: flat('#E8A0A0'),
    collar: flat(c.collar ?? '#E84E3C'),
    tag: flat('#FFD23F'),
  };
}

function catSide(f: Fig, p: Pose, c: CatCoat) {
  const st = p.mode === 'walk' ? p.step % 4 : 0;
  const act = p.act;
  const up = p.lookUp;
  const yawn = act === 'yawn';
  const tail = act === 'tail' ? p.ph : p.mode === 'walk' ? st % 2 : 0;
  const fat = c.fat ? 1 : 0;
  // legs
  const la = st === 1 ? -1 : st === 3 ? 1 : 0;
  f.part('fur', { shade: 'r', light: '', shift: -1 });
  f.vl(5 - la, 10, 12).vl(12 + la, 10, 12);
  f.part('paw', { shade: 'r', light: '' });
  f.vl(4 + la, 10, 12);
  f.part('fur', { shade: 'r', light: '' });
  f.vl(11 - la, 10, 12);
  // body
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(4, 6 - fat, fat ? ['.#########.', '###########', '###########', '###########', '.#########.'] : ['.########.', '##########', '##########', '.########.']);
  if (c.stripe) {
    f.part('stripe', { flat: true, rim: false });
    f.px(7, 6 - fat).px(10, 6 - fat).px(8, 7 - fat).px(11, 7 - fat).px(13, 8);
  }
  if (c.patch) {
    f.part('patch', { shade: 'rb', light: '' });
    f.rect(8, 6 - fat, 3, 2);
  }
  if (c.patch2) {
    f.part('patch2', { shade: 'rb', light: '' });
    f.rect(11, 7 - fat, 2, 2);
  }
  // tail curving up
  f.part('fur', { shade: 'rb', light: 't' });
  if (tail) f.px(14, 7).px(15, 6).px(15, 5).px(14, 4);
  else f.px(14, 7).px(15, 6).px(15, 5).px(15, 4);
  if (c.stripe) f.part('stripe', { flat: true }).px(15, 5);
  // head
  const hy = up ? -2 : 0;
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(1, 3 + hy - fat, ['#..#.', '#####', '######', '######', '.####.']);
  f.part('inner', { flat: true, rim: false });
  f.px(1, 4 + hy - fat);
  if (c.patch) {
    f.part('patch', { shade: 'r', light: '' });
    f.px(4, 4 + hy - fat).px(5, 5 + hy - fat).px(4, 5 + hy - fat);
  }
  f.part('paw', { flat: true, rim: false });
  f.px(1, 7 + hy - fat).px(2, 7 + hy - fat);
  f.part('eye', { flat: true, rim: false });
  if (p.blink || c.squint || yawn) f.px(2, 5 + hy - fat).px(3, 5 + hy - fat);
  else f.px(2, 5 + hy - fat).px(2, 4 + hy - fat);
  f.part('nose', { flat: true, rim: false });
  f.px(0, 6 + hy - fat);
  if (yawn) {
    f.part('inner', { flat: true, rim: false });
    f.px(1, 7 + hy - fat).px(2, 7 + hy - fat);
  }
  f.part('collar', { flat: true, rim: false });
  f.vl(4, 7 - fat, 8 - fat);
  if (c.bell) f.part('tag', { flat: true, rim: false }).px(3, 9 - fat);
  else if (c.collar) f.part('tag', { flat: true, rim: false }).px(4, 9 - fat);
}

/** Sitting cat, front/back (also the 'sit' extra). */
function catSit(f: Fig, p: Pose, c: CatCoat) {
  const back = p.view === 'up';
  const up = p.lookUp;
  const act = p.act;
  const tail = act === 'tail' ? p.ph : 0;
  const fat = c.fat ? 1 : 0;
  // tail wrapped round the feet
  f.part('fur', { shade: 'rb', light: 't' });
  if (!back) f.rows(8, 11, tail ? ['.####', '###..'] : ['####.', '.###.']);
  else f.rows(7, 5, tail ? ['..#', '.#.', '#..', '#..', '.#.', '..#'] : ['.#.', '.#.', '#..', '#..', '.#.', '.#.']);
  // body (pear)
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(4 - fat, 6, fat ? ['..######..', '.########.', '##########', '##########', '##########', '.########.', '.########.'] : ['..####..', '.######.', '.######.', '########', '########', '.######.', '.######.']);
  if (!back) {
    const st = p.mode === 'walk' ? p.step % 4 : 0;
    f.part('paw', { shade: 'b', light: '' });
    f.rect(6, 11 - (st === 1 ? 1 : 0), 1, 2).rect(9, 11 - (st === 3 ? 1 : 0), 1, 2);
    f.rect(7, 8, 2, 3);
  }
  if (c.stripe) {
    f.part('stripe', { flat: true, rim: false });
    if (back) f.px(6, 7).px(9, 7).px(6, 9).px(9, 9).px(7, 11);
    else f.px(5 - fat, 9).px(10 + fat, 9);
  }
  if (c.patch) {
    f.part('patch', { shade: 'rb', light: '' });
    f.rect(back ? 5 : 9, 7, 2, 3);
  }
  if (c.patch2) {
    f.part('patch2', { shade: 'rb', light: '' });
    f.rect(back ? 9 : 5, 9, 2, 2);
  }
  // head
  const hy = up ? -1 : 0;
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(4, 0 + hy, ['#......#', '##....##', '########', '########', '########', '.######.']);
  f.part('inner', { flat: true, rim: false });
  if (!back) f.px(5, 1 + hy).px(10, 1 + hy);
  if (c.patch) {
    f.part('patch', { shade: 'r', light: 't' });
    f.rect(8, 1 + hy, 3, 3).px(4, 1 + hy);
  }
  if (c.patch2) {
    f.part('patch2', { shade: 'r', light: 't' });
    f.rect(4, 2 + hy, 2, 2);
  }
  if (c.stripe && !back) {
    f.part('stripe', { flat: true, rim: false });
    f.px(7, 2 + hy).px(8, 2 + hy).px(7, 3 + hy);
  }
  if (!back) {
    f.part('eye', { flat: true, rim: false });
    const ey = 3 + hy - (up ? 1 : 0);
    if (p.blink || (c.squint && !up)) f.hl(5, 6, ey + 1).hl(9, 10, ey + 1);
    else {
      f.rect(5, ey, 2, 2).rect(9, ey, 2, 2);
      f.part('pupil', { flat: true, rim: false });
      f.px(6, ey + (up ? 0 : 1)).px(10, ey + (up ? 0 : 1));
    }
    f.part('nose', { flat: true, rim: false });
    f.px(7, 4 + hy).px(8, 4 + hy);
    if (act === 'yawn') {
      f.part('inner', { flat: true, rim: false });
      f.rect(7, 5 + hy, 2, 1);
    }
    f.part('collar', { flat: true, rim: false });
    f.hl(5, 10, 6 + hy);
    f.part('tag', { flat: true, rim: false });
    f.px(8, 7 + hy);
  }
}

/** Curled up asleep (calico's base). */
function catCurl(f: Fig, p: Pose, c: CatCoat) {
  const br = p.breath;
  const ear = p.act === 'twitch';
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(2, 6 - br, ['...########...', '.############.', '##############', '##############', '.############.']);
  // tail around the front
  f.part('fur', { shade: 'rb', light: 't' });
  f.hl(4, 12, 11);
  f.px(13, 10);
  if (c.patch) {
    f.part('patch', { shade: 'rb', light: 't' });
    f.rect(8, 6 - br, 4, 3);
    f.rect(12, 8 - br, 2, 2);
  }
  if (c.patch2) {
    f.part('patch2', { shade: 'rb', light: 't' });
    f.rect(5, 7 - br, 3, 2);
  }
  if (c.stripe) {
    f.part('stripe', { flat: true, rim: false });
    f.px(6, 6 - br).px(9, 6 - br).px(12, 7 - br).px(7, 11).px(10, 11);
  }
  // head tucked on the left, eyes shut
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(1, 6, ['#..#.', '#####', '#####', '.###.']);
  if (ear) f.px(0, 5);
  if (c.patch2) {
    f.part('patch2', { shade: 'r', light: '' });
    f.px(3, 7).px(4, 7);
  }
  f.part('eye', { flat: true, rim: false });
  f.hl(2, 3, 8);
  f.part('paw', { flat: true, rim: false });
  f.px(4, 9).px(5, 9);
  if (c.bell) {
    f.part('tag', { flat: true, rim: false });
    f.px(5, 10);
  }
}

function catSprite(id: string, c: CatCoat, base: 'sit' | 'curl') {
  const draw = (f: Fig, p: Pose) => {
    if (p.act === 'curl' || (base === 'curl' && p.mode === 'idle')) return catCurl(f, p, c);
    if (p.view === 'left') return catSide(f, p, c);
    return catSit(f, p, c);
  };
  const curlIdle: IdleKey[] = [
    { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 },
    { breath: 0, act: 'twitch' }, { breath: 0 }, { breath: 1 }, { breath: 1 },
  ];
  const sitIdle: IdleKey[] = [
    { act: 'tail', ph: 0 }, { act: 'tail', ph: 0 }, { act: 'tail', ph: 1 }, { act: 'tail', ph: 1 },
    { act: 'tail', ph: 0 }, { act: 'tail', ph: 0, blink: true }, { act: 'tail', ph: 1 }, { act: 'tail', ph: 1 },
    { act: 'yawn' }, { act: 'yawn' }, { act: 'yawn' }, { act: 'tail', ph: 0 },
  ];
  return buildSprite({
    id,
    h: 14,
    mats: catMats(c),
    draw,
    walkFrameMs: 120,
    walkBob: [0, 0, 0, 0],
    idle: base === 'curl' ? curlIdle : sitIdle,
    idleFrameMs: 300,
    extras: {
      sit: { dirs: 'all' },
      look_up: { dirs: 'all', p: { lookUp: true, act: 'sit' } },
      curl: { dirs: ['down'] },
      yawn: { dirs: ['down', 'left', 'right'] },
    },
    anims: { tail: { frames: [{ ph: 0 }, { ph: 1 }], ms: 400 } },
    shadow: 10,
  });
}

const SAUCE: CatCoat = { base: '#D9A441', shade: '#A8742A', light: '#F0C470', stripe: '#A8742A', paws: '#F4F1E8', eye: '#8AC060', squint: true, fat: true, collar: '#2F4A8A' };
const MIKE: CatCoat = { base: '#F4F1E8', shade: '#CFC8BC', light: '#FFFFFF', patch: '#D9A441', patch2: '#3A2B24', paws: '#F4F1E8', eye: '#C8B040', bell: true };
const KURO: CatCoat = { base: '#2E2838', shade: '#1E1A28', light: '#4A4258', paws: '#2E2838', eye: '#E8C840', collar: '#E84E3C' };
const HACHI: CatCoat = { base: '#F4F1E8', shade: '#CFC8BC', light: '#FFFFFF', patch: '#2E2838', paws: '#F4F1E8', eye: '#9AC870' };
const SHIRO: CatCoat = { base: '#F4F1E8', shade: '#CFC8BC', light: '#FFFFFF', patch2: '#9AA0A8', paws: '#F4F1E8', eye: '#6AAAD8', collar: '#E0567A' };

registerChar('npc_cat_sauce', () => catSprite('npc_cat_sauce', SAUCE, 'sit'));
registerChar('npc_cat_mike', () => catSprite('npc_cat_mike', MIKE, 'curl'));
registerChar('npc_cat_kuro', () => catSprite('npc_cat_kuro', KURO, 'sit'));
registerChar('npc_cat_hachi', () => catSprite('npc_cat_hachi', HACHI, 'curl'));
registerChar('npc_cat_shiro', () => catSprite('npc_cat_shiro', SHIRO, 'sit'));

// =============================================================================
// 牛の置物 (npc_cow_statue): the butcher's FRP cow — white with black patches,
// glossy highlights, red sash, smiling wink, one front hoof raised, on a small
// base. Static; 'look_up' tilts the head to the sky (stays that way in
// stages 1–2). Canvas 20×26.

const COW: Mats = {
  white: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFFFFF', dark: '#9E978C', spec: '#FFFFFF', rim: '#FFDCB4' }),
  black: mat('#2E2838', { shade: '#1E1A28', light: '#4A4258', spec: '#8A8298' }),
  snout: mat('#F0A0A8', { shade: '#D07888', light: '#FFC8D0' }),
  horn: mat('#F6D98A', { shade: '#D9A441', light: '#FFF0B8' }),
  hoof: flat('#4A3A3A'),
  sash: mat('#E84E3C', { shade: '#B8302A', light: '#FF7A5A' }),
  text: flat('#FBF3DC'),
  eye: flat('#2A2440'),
  base: mat('#9AA0A8', { shade: '#6B7186', light: '#C8CDD4', dark: '#4A4F63' }),
  gloss: flat('#FFFFFF'),
};

function cow(f: Fig, p: Pose) {
  const up = p.lookUp;
  // base plinth
  f.part('base', { shade: 'rb', light: 't' });
  f.rect(3, 22, 14, 2);
  // legs (standing on hind legs, like a shop mascot)
  f.part('white', { shade: 'rb', light: 't' });
  f.rect(6, 18, 3, 4).rect(11, 18, 3, 4);
  f.part('hoof', { flat: true, rim: false });
  f.hl(6, 8, 21).hl(11, 13, 21);
  // body
  f.part('white', { shade: 'rb', light: 't' });
  f.rows(4, 10, ['..########..', '.##########.', '############', '############', '############', '############', '.##########.', '..########..']);
  f.part('black', { shade: 'rb', light: 't' });
  f.rows(11, 11, ['###', '####', '.##']);
  f.rows(5, 15, ['##', '###']);
  // sash
  f.part('sash', { shade: 'b', light: '' });
  for (let i = 0; i < 8; i++) f.px(14 - i, 10 + i).px(13 - i, 10 + i);
  f.part('text', { flat: true, rim: false });
  f.px(12, 12).px(10, 14).px(8, 16);
  // raised front hoof (viewer left) + resting one
  f.part('white', { shade: 'rb', light: 't' });
  f.rows(1, 7, ['.##', '###', '###', '.##']);
  f.px(3, 10).px(4, 11);
  f.part('hoof', { flat: true, rim: false });
  f.hl(2, 3, 6);
  f.part('white', { shade: 'rb', light: 't' });
  f.rect(15, 12, 2, 4);
  f.part('hoof', { flat: true, rim: false });
  f.hl(15, 16, 16);
  // head
  const hy = up ? -2 : 0;
  f.part('horn', { shade: 'r', light: 't' });
  f.px(5, 1 + hy).px(6, 2 + hy).px(14, 1 + hy).px(13, 2 + hy);
  f.part('white', { shade: 'rb', light: 't' });
  f.rows(4, 2 + hy, ['.##########.', '############', '############', '############', '.##########.']);
  // ears
  f.part('black', { shade: 'r', light: '' });
  f.px(3, 3 + hy).px(2, 4 + hy).px(16, 3 + hy).px(17, 4 + hy);
  f.part('black', { shade: 'rb', light: 't' });
  f.rect(11, 2 + hy, 3, 2);
  // snout
  f.part('snout', { shade: 'rb', light: 't' });
  f.rows(6, 6 + hy - (up ? 1 : 0), ['.######.', '########', '.######.']);
  f.part('eye', { flat: true, rim: false });
  f.px(8, 7 + hy - (up ? 1 : 0)).px(11, 7 + hy - (up ? 1 : 0));
  // eyes: left open, right winking
  f.part('eye', { flat: true, rim: false });
  if (up) f.px(7, 2 + hy).px(12, 2 + hy);
  else {
    f.rect(7, 3 + hy, 1, 2);
    f.hl(11, 13, 4 + hy);
  }
  // FRP gloss
  f.part('gloss', { flat: true, rim: false, ol: false });
  f.px(6, 3 + hy).px(6, 11).px(7, 11).px(5, 12);
}

registerChar('npc_cow_statue', () =>
  buildSprite({
    id: 'npc_cow_statue',
    w: 20,
    h: 26,
    mats: COW,
    draw: cow,
    walkFrames: 1,
    idle: [{}],
    extras: { look_up: { dirs: 'all', p: { lookUp: true } } },
    views: { up: 'down', left: 'down', right: 'down' },
    shadow: 14,
  }),
);
