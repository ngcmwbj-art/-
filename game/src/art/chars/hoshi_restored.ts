// What the chapter 2 enemies were before they got cross (52 11.1): left where
// they were beaten, as quiet things of the village.
//
//  restored_enemy_sune_tomato       a green tomato (8×8) hanging on its plant
//                                   by the 5th truss, turned up 1px.
//  restored_enemy_sune_tomato_pair  the same truss with its two tomatoes.
//  restored_enemy_henoheno_kacho    the scarecrow in the old suit (16×32), a
//                                   plain face. Facings: down = to its field
//                                   (h0–h1), right = turning, up = its back,
//                                   looking at the hill (h2; the world turns it).
//  restored_enemy_biribiri_ban      one straight section of the fence, its
//                                   sign the right way round.
//  restored_enemy_mujin_hanbaiin    the cash box on the stall (12×10) with a
//                                   handwritten 「ありがとう ございます」 slip.
//  restored_enemy_tetsuya           the tiller parked by the mountain path,
//                                   its headlight dark (#9AA0A8 glass), the
//                                   「タケ」 sticker half peeled.
//  restored_enemy_chototsu          nothing (the boar leaves only its
//                                   footprints, levels' decal_h_inoshishi_ashiato):
//                                   an empty sprite so no stand-in is drawn.

import { flat, mat, type Fig, type Mats } from './fig';
import { buildSprite, type Pose } from './rig';
import { registerChar } from './registry';

// ---- the green tomato on its plant ------------------------------------------------------

const PLANT: Mats = {
  stalk: mat('#3F7A3A', { shade: '#2E6B4A', light: '#5FA85A' }),
  leaf: mat('#3FA66B', { shade: '#2E6B4A', light: '#5FA85A', dark: '#1E4A34' }),
  fruit: mat('#5FA85A', { shade: '#2E6B4A', light: '#9BCB6B', dark: '#1E4A34' }),
  calyx: flat('#3FA66B'),
  string: flat('#E8E4D8'),
};

function greenTomato(f: Fig, x: number, y: number) {
  f.part('fruit', { shade: 'rb', light: 't', inner: false });
  f.rows(x, y, ['.####.', '######', '######', '######', '######', '.####.']);
  f.part('fruit', { flat: true });
  f.t(1).px(x + 1, y + 1).px(x + 2, y + 1).t(null);
  f.part('calyx', { flat: true, rim: false });
  f.px(x + 2, y - 1).px(x + 3, y - 1).px(x + 1, y).px(x + 4, y);
}

function plantDraw(pair: boolean) {
  return (f: Fig, p: Pose) => {
    const sway = p.ph;
    // the stake and the vine tied to it with the white string
    f.part('stalk', { shade: 'r', light: 'l' });
    f.vl(7, 0, 15);
    f.part('string', { flat: true, rim: false });
    f.px(7, 3).px(8, 3).px(7, 10);
    // leaves
    f.part('leaf', { shade: 'rb', light: 't' });
    f.rows(1, 1, ['..###.', '######', '.####.', '..#...']);
    f.rows(9, 5, ['.###..', '######', '.####.', '...#..']);
    f.rows(2, 11, ['.##...', '####..', '.###..']);
    // the truss: a short stem out to the fruit
    f.part('stalk', { shade: '', light: '' });
    f.line(8, 7, 10, 8);
    if (pair) {
      f.line(7, 7, 4, 8);
      greenTomato(f, 0, 9 + sway);
    }
    greenTomato(f, pair ? 9 : 8, 9 + (pair ? 0 : sway));
  };
}

for (const [id, pair] of [['restored_enemy_sune_tomato', false], ['restored_enemy_sune_tomato_pair', true]] as const)
  registerChar(id, () =>
    buildSprite({
      id,
      w: 16,
      h: 16,
      mats: PLANT,
      draw: plantDraw(pair),
      walkFrames: 1,
      views: { up: 'down', left: 'down', right: 'down' },
      // still night: no wind; the fruit only settles now and then
      idle: [{}, {}, {}, {}, {}, {}, {}, { act: 'x', ph: 0 }],
      idleFrameMs: 500,
      shadow: 0,
    }),
  );

// ---- the scarecrow in the suit ---------------------------------------------------------

const CROW: Mats = {
  bamboo: mat('#C8B87A', { shade: '#8A7A4A', light: '#E8D8A0', dark: '#5A4A32' }),
  hat: mat('#E8C878', { shade: '#B89848', light: '#F6E0A0', dark: '#8A6A2A' }),
  ribbon: flat('#8A2E3A'),
  cloth: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9AA0A8' }),
  ink: flat('#2A2440'),
  suit: mat('#6B5A4A', { shade: '#4A3A2A', light: '#8A7A6A', dark: '#3A2616' }),
  shirt: flat('#E8E4D8'),
  tie: flat('#8A5A3A'),
  straw: mat('#E8C878', { shade: '#B89848', light: '#F6E0A0' }),
};

function crowDraw(f: Fig, p: Pose) {
  const back = p.view === 'up';
  const side = p.view === 'left';
  f.part('bamboo', { shade: 'r', light: 'l' });
  f.vl(8, 20, 31);
  f.part('bamboo', { flat: true });
  f.t(-1).px(8, 24).px(8, 28).t(null);
  if (side) {
    f.part('suit', { shade: 'rb', light: 't' });
    f.rect(5, 11, 6, 10);
    f.part('cloth', { shade: 'rb', light: 't' });
    f.rect(5, 4, 6, 7);
    f.part('ink', { flat: true, rim: false });
    f.px(5, 7).px(6, 8).px(5, 9);
    f.part('hat', { shade: 'rb', light: 't' });
    f.rows(3, 1, ['...####...', '..######..', '##########']);
    f.part('ribbon', { flat: true, rim: false });
    f.hl(5, 10, 3);
    return;
  }
  // the old suit (faded to brown: the second one, 52 11.2) on the crossbar
  f.part('suit', { shade: 'rb', light: 't' });
  f.rect(3, 11, 10, 10);
  f.rect(0, 12, 16, 3);
  if (!back) {
    f.part('shirt', { flat: true, rim: false });
    f.px(7, 11).px(8, 11).px(7, 12).px(8, 12);
    f.part('tie', { flat: true, rim: false });
    f.vl(8, 12, 15);
  }
  f.part('straw', { flat: true });
  f.t(1).px(0, 15).t(0).px(1, 15).t(1).px(15, 15).t(0).px(14, 15).t(null);
  f.part('cloth', { shade: 'rb', light: 't' });
  f.rows(3, 3, ['.########.', '##########', '##########', '##########', '##########', '##########', '##########', '.########.']);
  if (!back) {
    // a plain, calm face in faded ink
    f.part('ink', { flat: true, rim: false });
    f.px(5, 6).px(10, 6).hl(6, 9, 9);
  } else {
    f.part('cloth', { flat: true });
    f.t(-1).px(8, 9).px(7, 10).px(9, 10).t(null);
  }
  f.part('hat', { shade: 'rb', light: 't' });
  f.rows(2, 0, ['...######...', '..########..', '############']);
  f.part('ribbon', { flat: true, rim: false });
  f.hl(4, 11, 2);
}

registerChar('restored_enemy_henoheno_kacho', () =>
  buildSprite({ id: 'restored_enemy_henoheno_kacho', w: 16, h: 32, mats: CROW, draw: crowDraw, walkFrames: 1, idle: [{}], shadow: 6 }),
);

// ---- one straight section of the fence --------------------------------------------------

const FENCE: Mats = {
  post: mat('#E8E4D8', { shade: '#9AA0A8', light: '#F4F1E8', dark: '#6B7186' }),
  cap: flat('#2A2440'),
  wire: flat('#C8CDD4'),
  sign: mat('#FFD23F', { shade: '#D9A441', light: '#FFE7A3' }),
  frame: flat('#2A2440'),
};

registerChar('restored_enemy_biribiri_ban', () =>
  buildSprite({
    id: 'restored_enemy_biribiri_ban',
    w: 32,
    h: 16,
    mats: FENCE,
    draw: (f) => {
      f.part('post', { shade: 'r', light: 'l' });
      f.rect(3, 3, 2, 12).rect(27, 3, 2, 12);
      f.part('cap', { flat: true, rim: false });
      f.hl(3, 4, 2).hl(27, 28, 2);
      f.part('wire', { flat: true, rim: false });
      for (const y of [5, 8, 11]) f.hl(5, 26, y);
      // the sign hung straight, its writing the right way up (no face now)
      f.part('frame', { flat: true, rim: false });
      f.rect(11, 6, 10, 6);
      f.part('sign', { shade: 'rb', light: 't' });
      f.rect(12, 7, 8, 4);
      f.part('frame', { flat: true, rim: false });
      f.hl(13, 18, 8).hl(13, 16, 10);
    },
    walkFrames: 1,
    idle: [{}],
    shadow: 0,
  }),
);

// ---- the stall's cash box ------------------------------------------------------------------

const BOX: Mats = {
  wood: mat('#C8A06A', { shade: '#8A6A3A', light: '#E8D0A0', dark: '#5A4A2A' }),
  grain: flat('#A8804A'),
  metal: flat('#3A3F48'),
  paper: flat('#F4F1E8'),
  ink: flat('#2A2440'),
  slot: flat('#2A2440'),
};

registerChar('restored_enemy_mujin_hanbaiin', () =>
  buildSprite({
    id: 'restored_enemy_mujin_hanbaiin',
    w: 16,
    h: 12,
    mats: BOX,
    draw: (f) => {
      f.part('wood', { shade: 'rb', light: 't' });
      f.rect(2, 1, 12, 10);
      f.part('grain', { flat: true, rim: false });
      f.hl(3, 12, 5).hl(4, 11, 8);
      f.part('metal', { flat: true, rim: false });
      f.px(2, 1).px(13, 1).px(2, 10).px(13, 10);
      f.part('slot', { flat: true, rim: false });
      f.hl(6, 9, 2);
      // 「ありがとう ございます」 in pencil on a white slip
      f.part('paper', { flat: true, rim: false });
      f.rect(4, 4, 8, 5);
      f.part('ink', { flat: true, rim: false });
      f.hl(5, 10, 5).hl(5, 9, 7);
    },
    walkFrames: 1,
    idle: [{}],
    shadow: 0,
  }),
);

// ---- the parked tiller -------------------------------------------------------------------------

const TILLER: Mats = {
  body: mat('#3A7A8A', { shade: '#2A5A6A', light: '#5A9AA8', dark: '#1E4450' }),
  rust: flat('#A8742A'),
  fin: flat('#6B7186'),
  glass: flat('#9AA0A8'),
  rimM: flat('#C8CDD4'),
  pipe: mat('#6B7186', { shade: '#3A3F48', light: '#9AA0A8' }),
  grip: flat('#2A2440'),
  tine: mat('#9AA0A8', { shade: '#6B7186', light: '#C8CDD4' }),
  tire: mat('#2A2440', { shade: '#1B1733', light: '#3A3F48' }),
  sticker: flat('#F4F1E8'),
  soil: flat('#4A3A2A'),
};

function parkedTiller(f: Fig) {
  f.part('tire', { shade: 'rb', light: 't' });
  f.ell(9, 20, 3, 3);
  f.part('pipe', { shade: 'r', light: 't' });
  f.line(18, 10, 29, 4).line(18, 12, 30, 6);
  f.part('grip', { flat: true, rim: false });
  f.hl(28, 30, 4).hl(29, 31, 6);
  // the sticker peeling off: one corner lifted
  f.part('sticker', { flat: true, rim: false });
  f.px(24, 7).px(25, 7).px(26, 5);
  f.part('tine', { shade: 'rb', light: 't' });
  f.rows(19, 17, ['.#..#.', '######', '.#..#.']);
  f.part('soil', { flat: true, rim: false });
  f.px(21, 19).px(23, 16);
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(3, 9, ['...##########...', '..############..', '.##############.', '################', '################', '.##############.', '...##########...']);
  f.part('fin', { flat: true, rim: false });
  for (let x = 8; x <= 14; x += 2) f.vl(x, 11, 13);
  f.part('rust', { flat: true, rim: false });
  f.px(5, 13).px(16, 11).px(12, 15).px(6, 11);
  f.part('pipe', { shade: 'r', light: 't' });
  f.vl(16, 6, 9);
  // the headlight dark now: grey glass in its rim
  f.part('rimM', { flat: true, rim: false });
  f.rows(3, 14, ['.###.', '#...#', '#...#', '#...#', '.###.']);
  f.part('glass', { flat: true, rim: false });
  f.rect(4, 15, 3, 3);
}

registerChar('restored_enemy_tetsuya', () =>
  buildSprite({
    id: 'restored_enemy_tetsuya',
    w: 32,
    h: 24,
    mats: TILLER,
    draw: (f) => parkedTiller(f),
    walkFrames: 1,
    views: { up: 'left', down: 'left', right: 'left' },
    idle: [{}],
    shadow: 26,
    keep: ['#3A7A8A', '#2A5A6A', '#5A9AA8', '#1E4450'],
  }),
);

// ---- the boar leaves nothing but footprints -------------------------------------------------

registerChar('restored_enemy_chototsu', () =>
  buildSprite({ id: 'restored_enemy_chototsu', w: 16, h: 8, mats: {}, draw: () => {}, walkFrames: 1, idle: [{}], shadow: 0 }),
);
