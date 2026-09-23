// 「もとにもどった物」: what each enemy turns back into (00_concept 6.7,
// 30_level_art 9.5). Left on the field where the symbol was beaten, and used
// 1:1 in battle by the defeat animation (charSprite('restored_<enemy_id>')).
// restored_enemy_hato_kakaricho (the pecking pigeon) lives in animals.ts.

import { flat, mat, type Fig, type Mats } from './fig';
import { buildSprite, type Pose } from './rig';
import { registerChar } from './registry';
import { CHAIR_MATS, VEND_MATS, chair, vendFront } from './enemies';

const STATIC = { up: 'down', left: 'down', right: 'down' } as const;

// =============================================================================
// セミ: clinging to a tree trunk, head up (8×8 body in a 12×10 canvas).
// anim 'fly': wings beating (the battle defeat flies it off-screen).

const CICADA: Mats = {
  body: mat('#5A3A22', { shade: '#3E2616', light: '#7A5A3A', dark: '#2A1A12', rim: '#FFB070' }),
  wing: mat('#7A5A3A', { shade: '#5A3E26', light: '#A88A5A', dark: '#3A2616' }),
  wingF: flat('#C8A87A99'),
  vein: flat('#3A2616'),
  eye: flat('#2A1A12'),
  glint: flat('#F4F1E8'),
  belly: flat('#C9A36A'),
};

function cicada(f: Fig, p: Pose) {
  if (p.act === 'fly') {
    const up = p.ph % 2 === 0;
    f.part('body', { shade: 'rb', light: 't' });
    f.rows(4, 3, ['.##.', '####', '####', '.##.']);
    f.part('eye', { flat: true, rim: false });
    f.px(4, 3).px(7, 3);
    f.part('wingF', { flat: true, rim: false });
    if (up) f.rows(0, 0, ['###......###', '.###....###.', '..##....##..']);
    else f.rows(0, 5, ['..##....##..', '.###....###.', '###......###']);
    return;
  }
  // on the trunk: seen from behind, head up, wings folded tent-like
  f.part('wing', { shade: 'r', light: 'l' });
  f.rows(3, 2, ['.####.', '######', '######', '######', '.####.', '..##..']);
  f.part('vein', { flat: true, rim: false });
  f.vl(5, 3, 6).vl(6, 3, 6).px(4, 4).px(7, 4);
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(4, 0, ['.##.', '####']);
  f.part('eye', { flat: true, rim: false });
  f.px(3, 1).px(8, 1);
  f.part('glint', { flat: true, rim: false });
  f.px(3, 1);
  // legs gripping the bark
  f.part('vein', { flat: true, rim: false });
  f.px(2, 3).px(9, 3).px(2, 6).px(9, 6);
}

registerChar('restored_enemy_semi_final', () =>
  buildSprite({
    id: 'restored_enemy_semi_final',
    w: 12,
    h: 10,
    mats: CICADA,
    draw: cicada,
    walkFrames: 1,
    idle: [{}],
    extras: { fly: { dirs: ['down'] } },
    anims: { fly: { frames: [{ ph: 0 }, { ph: 1 }], ms: 70 } },
    views: STATIC,
    shadow: 0,
  }),
);

// =============================================================================
// コーン: standing straight, face gone — just a (slightly scuffed) cone.

const CONE: Mats = {
  cone: mat('#F07A2A', { shade: '#C85A1A', light: '#FFA25A', dark: '#8A3A10', rim: '#FFD0A0' }),
  band: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9E978C' }),
  base: mat('#3A3A44', { shade: '#26262E', light: '#5A5A66', dark: '#16161C' }),
  mud: flat('#8A5A3A'),
  hole: flat('#2A2440'),
};

function plainCone(f: Fig) {
  f.part('base', { shade: 'rb', light: 't' });
  f.rect(1, 15, 12, 2);
  f.part('cone', { shade: 'rb', light: 'l' });
  for (let j = 0; j < 13; j++) {
    const half = 1 + Math.round(j * 0.36);
    f.hl(7 - half, 6 + half, 2 + j);
  }
  f.part('band', { shade: 'r', light: '' });
  for (let j = 0; j < 13; j++) {
    if (!(j === 5 || j === 6 || j === 9 || j === 10)) continue;
    const half = 1 + Math.round(j * 0.36);
    f.hl(7 - half, 6 + half, 2 + j);
  }
  f.part('hole', { flat: true, rim: false });
  f.hl(6, 7, 2);
  f.part('mud', { flat: true, rim: false });
  f.px(4, 14).px(9, 13);
}

registerChar('restored_enemy_cone_vocal', () =>
  buildSprite({
    id: 'restored_enemy_cone_vocal',
    w: 14,
    h: 18,
    mats: CONE,
    draw: (f) => plainCone(f),
    walkFrames: 1,
    idle: [{}],
    extras: {},
    views: STATIC,
    shadow: 10,
  }),
);

// =============================================================================
// ビニール傘: closed, band snapped shut, leaning against the wall (tip on the
// ground bottom-left, handle up-right). The "?" sticker is still on the handle.

const UMB: Mats = {
  film: mat('#CFE3EA99', { shade: '#9AB8C4AA', light: '#EAF6FACC', dark: '#6E98A8CC', rim: '#FFE0C0BB', ol: '#4A6A7A' }),
  hi: flat('#FFFFFFDD'),
  shaft: mat('#C0C6CC', { shade: '#9AA0A8', light: '#E8ECF0' }),
  tip: flat('#6B7186'),
  handle: mat('#8A5A3A', { shade: '#5A3A2A', light: '#AE7A52', dark: '#3A2618', spec: '#C8A06A' }),
  sticker: flat('#F4F1E8'),
  q: flat('#2A2440'),
  strap: flat('#F4F1E8'),
  snap: flat('#C0C6CC'),
};

function leaningUmbrella(f: Fig) {
  f.part('tip', { flat: true, rim: false });
  f.px(2, 23).px(3, 22);
  // furled canopy along the diagonal
  f.part('film', { shade: 'r', light: 'l' });
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const w = Math.round(1 + Math.sin(Math.PI * Math.min(1, t * 1.2)) * 2);
    const cx = 4 + Math.round(i * 0.55);
    const cy = 21 - i;
    f.hl(cx - w + 1, cx + w - 1, cy);
  }
  f.part('hi', { flat: true, rim: false, ol: false });
  f.px(5, 16).px(6, 14).px(7, 12);
  // snapped band
  f.part('strap', { flat: true, rim: false });
  f.hl(7, 10, 13);
  f.part('snap', { flat: true, rim: false });
  f.px(10, 13);
  // shaft + J handle (hooked over the top)
  f.part('shaft', { shade: 'r', light: '' });
  f.px(12, 5).px(12, 4);
  f.part('handle', { shade: 'rb', light: 't' });
  f.rows(10, 0, ['.###.', '##.##', '#...#', '#....']);
  f.vl(12, 2, 3);
  f.part('sticker', { flat: true, rim: false });
  f.rect(11, 2, 2, 2);
  f.part('q', { flat: true, rim: false });
  f.px(11, 2).px(12, 3);
}

registerChar('restored_enemy_wasuregasa', () =>
  buildSprite({
    id: 'restored_enemy_wasuregasa',
    w: 16,
    h: 24,
    mats: UMB,
    draw: (f) => leaningUmbrella(f),
    walkFrames: 1,
    idle: [{}],
    extras: {},
    views: STATIC,
    shadow: 8,
  }),
);

// =============================================================================
// 自販機: standing up straight again, LED dark (it said ありがとう once).

function uprightVend(f: Fig) {
  // (x0 = 2: room for the left outline and its sunset rim)
  vendFront(f, 2, 2, { ledOn: false, flicker: false, flap: 0, hum: 0, off: true });
  // cord coiled neatly at its foot
  f.part('cord', { shade: 'b', light: '' });
  f.px(24, 36).px(25, 37).px(24, 38).px(25, 39);
}

registerChar('restored_enemy_ojigi_jihanki', () =>
  buildSprite({
    id: 'restored_enemy_ojigi_jihanki',
    w: 26,
    h: 40,
    mats: VEND_MATS,
    draw: (f) => uprightVend(f),
    walkFrames: 1,
    idle: [{}],
    extras: {},
    views: STATIC,
    shadow: 22,
  }),
);

// =============================================================================
// 掃除機: back on its charging dock, a small green lamp lit.

const DOCK: Mats = {
  top: mat('#C8CDD4', { shade: '#9AA0A8', light: '#E8ECF0', dark: '#6B7186', rim: '#F4D8C0' }),
  band: mat('#9AA0A8', { shade: '#6B7186', light: '#B8BEC6', dark: '#4A4F63' }),
  bumper: mat('#3A3F48', { shade: '#262A34', light: '#5A5F68' }),
  dock: mat('#3A3F48', { shade: '#262A34', light: '#6B7186', dark: '#16181E' }),
  lamp: flat('#5FA85A'),
  lampHi: flat('#9BCB6B'),
  led: flat('#2F4A8A'),
  button: flat('#4AA8E0'),
  sock: flat('#F4F1E8'),
};

function docked(f: Fig, p: Pose) {
  const glow = p.mode === 'idle' && p.tick % 2 === 1;
  // dock behind (upright plate)
  f.part('dock', { shade: 'rb', light: 't' });
  f.rows(5, 0, ['.############.', '##############', '##############', '##############']);
  f.part(glow ? 'lampHi' : 'lamp', { flat: true, rim: false });
  f.px(11, 1).px(12, 1);
  // the vacuum parked in front
  f.part('band', { shade: 'r', light: '' });
  f.rows(1, 9, ['.####################.', '######################', '.####################.']);
  f.part('top', { shade: 'r', light: 't' });
  f.rows(1, 5, ['....##############....', '.####################.', '######################', '######################', '.####################.']);
  f.part('bumper', { shade: 'b', light: 't' });
  f.hl(4, 19, 11).hl(2, 21, 10);
  f.part('led', { flat: true, rim: false });
  f.hl(9, 10, 8).hl(13, 14, 8);
  f.part('button', { flat: true, rim: false });
  f.hl(11, 12, 7);
}

registerChar('restored_enemy_soujirou', () =>
  buildSprite({
    id: 'restored_enemy_soujirou',
    w: 24,
    h: 14,
    mats: DOCK,
    draw: docked,
    walkFrames: 1,
    idle: [{}, {}, {}, {}, {}, {}],
    idleFrameMs: 400,
    extras: {},
    views: STATIC,
    shadow: 20,
  }),
);

// =============================================================================
// マッサージチェア: 「お試し中止」 sign on the headrest, remote tidied away,
// rollers at rest — and it looks a little relieved.

registerChar('restored_enemy_momisugi', () =>
  buildSprite({
    id: 'restored_enemy_momisugi',
    w: 24,
    h: 32,
    mats: CHAIR_MATS,
    draw: (f, p) => chair(f, p, true),
    walkFrames: 1,
    idle: [{}],
    extras: {},
    views: STATIC,
    shadow: 22,
  }),
);
