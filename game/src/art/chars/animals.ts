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
  // the business-card bow: a nod (1px) then a deep bow (the head drops 3px
  // over the chest and the body dips 1px); from behind the tail tips up
  const bow = p.act === 'bow' ? p.ph : 0;
  const dip = bow === 2 ? 1 : 0;
  const up = p.lookUp;
  const hy = (peck ? 3 : 0) + (bow === 1 ? 1 : bow === 2 ? 3 : 0) + (up ? -1 : 0) + (p.mode === 'walk' && st % 2 ? 1 : 0);
  f.part('foot', { shade: 'r', light: '' });
  f.px(6, 11 + (st === 1 ? -1 : 0)).px(6, 12).px(9, 11 + (st === 3 ? -1 : 0)).px(9, 12).px(5, 12).px(10, 12);
  if (back) {
    f.part('wing', { shade: 'rb', light: '' });
    f.rows(6, 10 - (bow ? 1 : 0), ['####', '.##.']);
  }
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(4, 5 + dip, ['..####..', '.######.', '########', '########', '.######.', '..####..'].slice(0, 6 - dip));
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
  // The head is turned a little to the viewer's left (a pigeon never looks
  // straight at you): one eye on the far side of the beak, the beak off
  // centre. Two eyes side by side read as an owl at 1x.
  // Looking up: the neck stretches (head 2px higher, the iridescent throat
  // shows) and the beak points at the sky.
  const hx = back ? 5 : 4;
  f.part('head', { shade: 'rb', light: 't' });
  f.rows(hx, 1 + hy, ['.####.', '######', '######', '.####.']);
  if (up) {
    // the stretched neck: a bare iridescent throat between head and chest
    f.part(p.tick % 2 ? 'neckB' : 'neckA', { flat: true, rim: false });
    f.hl(6, 9, 4);
  }
  if (!back) {
    f.part('cere', { flat: true, rim: false });
    f.px(5, 2 + hy);
    f.part('eye', { flat: true, rim: false });
    f.px(7, 2 + hy);
    f.part('pupil', { flat: true, rim: false });
    if (!p.blink) f.px(6, 2 + hy);
    f.part('beak', { flat: true, rim: false });
    if (up) f.px(4, 1 + hy).px(3, 0 + hy + 1);
    else f.px(4, 3 + hy).px(3, 4 + hy);
  }
  if (card || bow) {
    // the card at its feet (offered with the bow)
    const cx = bow && !card ? 1 : 11;
    f.part('card', { shade: 'b', light: '' });
    f.rect(cx, 11, 3, 2);
    f.part('cardL', { flat: true, rim: false });
    f.px(cx + 1, 11);
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
      bow: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 0 }], ms: [200, 250, 250, 300], loop: false, dir: 'left', dirs: 'all' },
    },
    poses: { peck: 'idle' },
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
  // violet-black lifted a step off the outline colour, with a #5B4A7A sheen
  // so it still reads on dark (night / stage 2) ground
  body: mat('#302A48', { shade: '#221C38', light: '#5B4A7A', dark: '#141024', spec: '#8A7AB0', rim: '#8A5A7A', ol: '#0B0B14' }),
  gloss: flat('#6E5E9E'),
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
    // violet sheen along the folded wing (2px+ runs so it survives dark palettes)
    f.part('gloss', { flat: true, rim: false });
    f.hl(6, 9, 7 + hopY).hl(8, 10, 8 + hopY).px(5, 6 + hopY).px(6, 6 + hopY);
    // head
    const hx = preen ? 3 : 0;
    const hy = preen ? 3 : up ? -2 : 0;
    f.part('body', { shade: 'rb', light: 't' });
    f.rows(3 + hx, 1 + hy + hopY + (tilt ? 1 : 0), ['.####.', '######', '######', '.####.']);
    if (!preen) {
      f.part('bill', { shade: 'b', light: 't' });
      f.rows(0 + hx, 2 + hy + hopY + (tilt ? 1 : 0) - (up ? 1 : 0), ['####', '.###']);
      // dark eye with a bright glint in front of it
      const ey = 2 + hy + hopY + (tilt ? 1 : 0);
      f.part('pupil', { flat: true, rim: false });
      f.px(5 + hx, ey);
      f.part('eye', { flat: true, rim: false });
      if (!p.blink) f.px(4 + hx, ey);
      f.part('gloss', { flat: true, rim: false });
      f.hl(5 + hx, 6 + hx, 1 + hy + hopY + (tilt ? 1 : 0));
    }
    return;
  }
  const back = p.view === 'up';
  f.part('foot', { flat: true, rim: false });
  f.vl(7, 13, 14).vl(8, 13, 14);
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(4, 5 + hopY, ['.######.', '########', '########', '########', '.######.', '..####..', '...##...']);
  f.part('gloss', { flat: true, rim: false });
  f.px(5, 6 + hopY).px(5, 7 + hopY).px(6, 6 + hopY).px(10, 7 + hopY).px(10, 8 + hopY);
  if (up) {
    // looking up: the neck stretches (a glossy throat under the head) and the
    // heavy bill points at the sky — from behind its tip pokes over the head
    f.part('gloss', { flat: true, rim: false });
    f.hl(6, 9, 4);
    f.part('body', { shade: 'rb', light: 't' });
    f.rows(5, 1, ['.####.', '######', '.####.']);
    f.part('bill', { shade: 'r', light: 't' });
    if (back) f.rows(7, 0, ['##']);
    else {
      f.rows(7, 0, ['##', '##']);
      f.part('eye', { flat: true, rim: false });
      if (!p.blink) f.px(6, 3).px(9, 3);
    }
    return;
  }
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(5 + (tilt ? 1 : 0), 1 + hopY, ['.####.', '######', '######', '.####.']);
  if (!back) {
    // heavy bill pointing at the viewer, a glint in each eye
    f.part('bill', { shade: 'b', light: 't' });
    f.rows(6 + (tilt ? 1 : 0), 3 + hopY, ['.##.', '####', '.##.']);
    f.part('eye', { flat: true, rim: false });
    if (!p.blink) f.px(6 + (tilt ? 1 : 0), 2 + hopY).px(9 + (tilt ? 1 : 0), 2 + hopY);
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
    // patches get their own hue-shifted ramps (not the base coat's)
    patch: c.patch ? mat(c.patch, { rim: '#FFC080' }) : mat(c.base, { shade: c.shade, light: c.light }),
    patch2: c.patch2 ? mat(c.patch2, { rim: '#C8845A' }) : mat(c.base, { shade: c.shade, light: c.light }),
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
  if (p.blink || c.squint || yawn) {
    // narrow, content eye: a dark lid line, not a coloured bar
    f.part('pupil', { flat: true, rim: false });
    f.px(2, 5 + hy - fat).px(3, 4 + hy - fat);
  } else {
    f.part('eye', { flat: true, rim: false });
    f.px(2, 5 + hy - fat).px(2, 4 + hy - fat);
  }
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
  // exhale: the back and head settle 1px (breath arrives as −1)
  const br = back && p.breath < 0 ? 1 : 0;
  // tail wrapped round the feet
  f.part('fur', { shade: 'rb', light: 't' });
  if (!back) f.rows(8, 11, tail ? ['.####', '###..'] : ['####.', '.###.']);
  // body (pear)
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(4 - fat, 6 + br, (fat ? ['..######..', '.########.', '##########', '##########', '##########', '.########.', '.########.'] : ['..####..', '.######.', '.######.', '########', '########', '.######.', '.######.']).slice(0, 7 - br));
  if (back) {
    // seen from behind the tail lies along the ground and flicks its tip
    f.part('fur', { shade: 'rb', light: 't', sepAll: true });
    f.rows(8, 11, tail ? ['....##', '.####.', '###...'] : ['......', '.#####', '###...']);
    if (c.stripe) f.part('stripe', { flat: true }).px(10, 12).px(12, 12 - tail);
  }
  if (!back) {
    const st = p.mode === 'walk' ? p.step % 4 : 0;
    f.part('paw', { shade: 'b', light: '' });
    f.rect(6, 11 - (st === 1 ? 1 : 0), 1, 2).rect(9, 11 - (st === 3 ? 1 : 0), 1, 2);
    f.rect(7, 8, 2, 3);
  }
  if (c.stripe) {
    // tabby stripes: three bands across the back, 2px dashes on the flanks
    f.part('stripe', { flat: true, rim: false });
    if (back) f.hl(5 - fat, 10 + fat, 7 + br).hl(4 - fat, 11 + fat, 9).hl(5, 10, 11);
    else f.hl(4 - fat, 5 - fat, 8).hl(10 + fat, 11 + fat, 8).hl(4 - fat, 5 - fat, 10).hl(10 + fat, 11 + fat, 10);
  }
  if (c.patch) {
    f.part('patch', { shade: 'rb', light: '' });
    f.rect(back ? 5 : 9, 7, 2, 3);
  }
  if (c.patch2) {
    f.part('patch2', { shade: 'rb', light: '' });
    f.rect(back ? 9 : 5, 9, 2, 2);
  }
  if (up && !back) return catLookUpFront(f, c);
  // head (from behind, the ears swivel toward a sound on the yawn beat).
  // Looking up from behind: the back of the head drops over the neck and
  // the ears fold back toward us.
  const hy = (up ? 1 : 0) + br;
  const swivel = back && act === 'yawn';
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(4, 0 + hy, up ? ['.#....#.', '##....##', '########', '########', '########', '.######.'] : [swivel ? '.......#' : '#......#', swivel ? '#.....##' : '##....##', '########', '########', '########', '.######.']);
  if (swivel) f.px(3, 1 + hy);
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
    // squinting tabby: content, narrow eyes as dark lids (not a colored bar)
    if (p.blink || (c.squint && !up)) {
      f.part('pupil', { flat: true, rim: false });
      f.px(5, ey).px(6, ey + 1).px(9, ey + 1).px(10, ey);
    }
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

/**
 * Sitting cat seen from the front, gazing straight up (17:00): the face
 * foreshortens under the ears, the eyes ride to the top of the head, the
 * nose points up and the pale throat stretches between chin and collar.
 */
function catLookUpFront(f: Fig, c: CatCoat) {
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(4, 0, ['#......#', '##....##', '########', '########', '.######.']);
  f.part('inner', { flat: true, rim: false });
  f.px(5, 1).px(10, 1);
  if (c.patch) {
    f.part('patch', { shade: 'r', light: 't' });
    f.rect(8, 2, 3, 2).px(4, 1);
  }
  if (c.patch2) {
    f.part('patch2', { shade: 'r', light: 't' });
    f.rect(4, 2, 2, 2);
  }
  // the throat, stretched: a pale bib between the chin and the collar
  f.part('paw', { shade: 'r', light: '' });
  f.rows(6, 5, ['####', '.##.']);
  f.part('eye', { flat: true, rim: false });
  f.hl(5, 6, 2).hl(9, 10, 2);
  f.part('pupil', { flat: true, rim: false });
  f.px(6, 2).px(10, 2);
  // nose tipped up, the chin line under it
  f.part('nose', { flat: true, rim: false });
  f.px(7, 3).px(8, 3);
  f.part('fur', { flat: true });
  f.t(-2).px(7, 4).px(8, 4).t(null);
  f.part('collar', { flat: true, rim: false });
  f.hl(5, 10, 7);
  f.part('tag', { flat: true, rim: false });
  f.px(8, 8);
}

/**
 * Curled up asleep (calico's base), 16×14: a round mound with the head
 * tucked on the left — two ear triangles, a closed-eye line, pink nose —
 * front paws under the chin and the tail wrapped round the front with a
 * dark tip by the nose. Patches are 2px+ clumps. 1px breathing lifts the
 * back; the ear twitches now and then.
 */
function catCurl(f: Fig, p: Pose, c: CatCoat) {
  const br = p.breath < 0 ? 0 : p.breath !== 0 ? 1 : 0;
  const lift = p.breath === 0 ? 0 : 1; // the back rises on the inhale
  const ear = p.act === 'twitch';
  const pa = c.patch ? 'patch' : 'fur';
  const pb = c.patch2 ? 'patch2' : 'fur';
  void br;
  // body mound (behind the head); the back rises 1px on the inhale
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(4, 5 - lift, ['..######....', '.#########..', '###########.', '############', '############', '############', '.##########.'].slice(0, 7 + lift));
  f.rect(4, 11, 11, 1);
  // calico clumps on the back
  f.part(pa, { shade: 'rb', light: 't' });
  f.rows(7, 5 - lift, ['.####', '######', '.####']);
  f.part(pb, { shade: 'rb', light: 't' });
  f.rows(12, 8 - lift, ['##', '###', '.#']);
  if (c.stripe) {
    f.part('stripe', { flat: true, rim: false });
    f.px(7, 6 - lift).px(10, 6 - lift).px(13, 8 - lift);
  }
  // tail wrapped round the front, dark tip by the nose
  f.part(pa, { shade: 'rb', light: 't', sepAll: true });
  f.hl(5, 13, 12).hl(3, 5, 11);
  f.px(14, 11);
  f.part(pb, { flat: true, rim: false });
  f.px(2, 11).px(3, 11);
  // head tucked on the left, resting on the paws
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(0, 5, [ear ? '.#...#' : '.#..#.', '##.##.', '######', '######', '######', '.####.']);
  f.part('inner', { flat: true, rim: false });
  if (!ear) f.px(1, 6).px(4, 6);
  // head patches (one ear dark, one ginger)
  f.part(pb, { shade: 'r', light: '' });
  f.px(0, 6).px(1, 5).px(0, 7);
  f.part(pa, { shade: 'r', light: '' });
  f.px(4, 5).px(4, 6).px(5, 7);
  // closed eyes: two short dark lines
  f.part('pupil', { flat: true, rim: false });
  f.px(1, 8).px(2, 8).px(4, 8);
  f.part('nose', { flat: true, rim: false });
  f.px(3, 9);
  // front paws under the chin
  f.part('paw', { shade: 'b', light: '' });
  f.hl(1, 4, 10);
  if (c.bell) {
    f.part('tag', { flat: true, rim: false });
    f.px(5, 10);
  }
}

function catSprite(id: string, c: CatCoat, base: 'sit' | 'curl') {
  const draw = (f: Fig, p: Pose) => {
    if (p.act === 'curl' || p.act === 'twitch' || (base === 'curl' && p.mode === 'idle')) return catCurl(f, p, c);
    if (p.view === 'left') return catSide(f, p, c);
    return catSit(f, p, c);
  };
  const curlIdle: IdleKey[] = [
    { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 }, { breath: 0 }, { breath: 0 }, { breath: 1 }, { breath: 1 },
    { breath: 0, act: 'twitch' }, { breath: 0 }, { breath: 1 }, { breath: 1 },
  ];
  const sleepIdle: IdleKey[] = curlIdle.map((k) => ({ ...k, act: k.act ?? 'curl' }));
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
    anims: { tail: { frames: [{ ph: 0 }, { ph: 1 }], ms: 400, dirs: ['down', 'left', 'right'] } },
    // curled up asleep (1px breathing, an ear twitch now and then)
    poses: { sleep: { down: sleepIdle, left: sleepIdle, right: sleepIdle, up: sleepIdle } },
    shadow: 10,
  });
}

const SAUCE: CatCoat = { base: '#D9A441', shade: '#A8742A', light: '#F0C470', stripe: '#A8742A', paws: '#F4F1E8', eye: '#8AC060', squint: true, fat: true, collar: '#2F4A8A' };
const MIKE: CatCoat = { base: '#F4F1E8', shade: '#CFC8BC', light: '#FFFFFF', patch: '#D9A441', patch2: '#3A2B24', paws: '#F4F1E8', eye: '#C8B040', bell: true };
const KURO: CatCoat = { base: '#302A48', shade: '#221C38', light: '#5B4A7A', paws: '#3A3252', eye: '#FFD23F', collar: '#E84E3C' };
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

// =============================================================================
// prop_sparrow: the tiny wire sparrow of fushigi_03 (body 5×4, 30_level_art
// 9.4). Canvas 8×7, feet on the bottom row (hang it on the wire line).
// Idle: turns its head, hops 1px; 'sing' opens the beak.

const SPR: Mats = {
  cap: mat('#8A5A3A', { shade: '#6A4228', light: '#AE7A52', rim: '#FFB070' }),
  back: mat('#A8784A', { shade: '#7A5430', light: '#C8A06A', rim: '#FFC080' }),
  belly: flat('#E8DCC8'),
  cheek: flat('#F4F1E8'),
  beak: flat('#4A3A3A'),
  beakO: flat('#E8B070'),
  eye: flat('#1A1420'),
  foot: flat('#8A6A5A'),
};

function tinySparrow(f: Fig, p: Pose) {
  const hop = p.act === 'hop' ? 1 : 0;
  const sing = p.act === 'sing' && p.ph === 1;
  const turn = p.act === 'turn';
  const up = p.lookUp ? 1 : 0;
  const y = 1 - hop;
  f.part('foot', { flat: true, rim: false, ol: false });
  if (!hop) f.px(3, 6).px(5, 6);
  if (p.view === 'left') {
    f.part('back', { shade: 'rb', light: 't' });
    f.rows(2, y + 2, ['####.', '#####']);
    f.part('belly', { flat: true, rim: false });
    f.px(2, y + 3).px(3, y + 3);
    f.part('cap', { shade: 'r', light: 't' });
    f.rows(1, y + 1 - up, ['##', '##']);
    f.part('cheek', { flat: true, rim: false });
    f.px(1, y + 2 - up);
    f.part('eye', { flat: true, rim: false });
    if (!p.blink) f.px(1, y + 1 - up);
    f.part(sing ? 'beakO' : 'beak', { flat: true, rim: false });
    f.px(0, y + 1 - up * 2);
    if (sing) f.px(0, y + 2 - up);
    return;
  }
  f.part(p.view === 'up' ? 'back' : 'belly', { shade: 'rb', light: 't' });
  f.rows(2, y + 2, ['####', '####']);
  f.part('cap', { shade: 'r', light: 't' });
  f.rows(2 + (turn ? 1 : 0), y + 1 - up, ['###.'.slice(0, 3), '###']);
  if (p.view !== 'up') {
    f.part('cheek', { flat: true, rim: false });
    f.px(2 + (turn ? 1 : 0), y + 2 - up);
    f.part(sing ? 'beakO' : 'beak', { flat: true, rim: false });
    f.px(3 + (turn ? 1 : 0), y + 2 - up);
  }
}

registerChar('prop_sparrow', () =>
  buildSprite({
    id: 'prop_sparrow',
    w: 8,
    h: 7,
    mats: SPR,
    draw: tinySparrow,
    walkBob: [0, 0, 0, 0],
    walkFrameMs: 90,
    idle: [{}, {}, { act: 'turn' }, { act: 'turn' }, {}, { act: 'hop' }, {}, { blink: true }, {}, {}],
    idleFrameMs: 260,
    extras: { sing: { dirs: ['down', 'left', 'right'], p: { ph: 1 } }, hop: { dirs: ['down', 'left', 'right'] } },
    anims: { sing: { frames: [{ ph: 1 }, { ph: 0 }], ms: 150, dir: 'left' } },
    shadow: 0,
  }),
);

// =============================================================================
// prop_cat_kuro: the black cat loafing on the polybucket by the cat alley
// (12×10 body). Violet sheen, gold eye. Tail flicks (2 frames).

const KURO_M: Mats = {
  fur: mat('#302A48', { shade: '#221C38', light: '#5B4A7A', dark: '#141024', spec: '#8A7AB0', rim: '#8A5A7A', ol: '#0B0B14' }),
  gloss: flat('#6E5E9E'),
  eye: flat('#FFD23F'),
  nose: flat('#8A5A7A'),
};

function kuro(f: Fig, p: Pose) {
  const tail = p.act === 'tail' ? p.ph : p.mode === 'idle' ? p.tick % 2 : 0;
  const up = p.lookUp ? 1 : 0;
  // loaf body
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(3, 5, ['.########.', '##########', '##########', '.########.']);
  // tail curling down the side / flicking up
  f.part('fur', { shade: 'rb', light: '' });
  if (tail) f.px(13, 6).px(14, 5).px(14, 4);
  else f.px(13, 7).px(14, 8).px(14, 9);
  // violet sheen along the back
  f.part('gloss', { flat: true, rim: false });
  f.hl(5, 8, 6).hl(9, 10, 5);
  // head
  f.part('fur', { shade: 'rb', light: 't' });
  f.rows(1, 2 - up, ['#..#.', '#####', '#####', '.###.']);
  f.part('gloss', { flat: true, rim: false });
  f.px(3, 3 - up).px(4, 3 - up);
  f.part('eye', { flat: true, rim: false });
  if (!p.blink) f.px(2, 4 - up).px(4, 4 - up);
  f.part('nose', { flat: true, rim: false });
  f.px(1, 5 - up);
}

registerChar('prop_cat_kuro', () =>
  buildSprite({
    id: 'prop_cat_kuro',
    w: 16,
    h: 11,
    mats: KURO_M,
    draw: kuro,
    walkFrames: 1,
    idle: [{}, {}, {}, { blink: true }, {}, {}, {}, {}],
    idleFrameMs: 400,
    extras: { tail: { dirs: ['left', 'right'], p: { ph: 1 } } },
    anims: { tail: { frames: [{ ph: 0 }, { ph: 1 }], ms: 400, dir: 'left' } },
    views: { down: 'left', up: 'left' },
    shadow: 10,
  }),
);
