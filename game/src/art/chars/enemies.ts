// Field symbols of the seven enemies (20_systems_battle 14.2 motions,
// 30_level_art 9.5 sizes). Each exaggerates one feature so it reads at 1x.
//
//  enemy_hato_kakaricho 16×16  chest-out pigeon + red-striped tie. peck / trot
//  enemy_semi_final     24×18  upside-down cicada, twitching legs. hop cycle
//  enemy_cone_vocal     16×24  slit eyes + spinning beacon (3-frame cycle). sing
//  enemy_wasuregasa     16×30  translucent furled umbrella, broken rib. hop
//  enemy_ojigi_jihanki  24×40  bows 0/30/60/90°, LED 17:00, dragged cord
//  enemy_soujirou       24×12  robot vacuum, blinking blue LEDs, sock in the bin
//  enemy_momisugi       24×32  massage chair, remote cord sways / beckons

import { flat, mat, type Fig, type Mats } from './fig';
import { buildSprite, rep, type IdleKey, type Pose } from './rig';
import { registerChar } from './registry';
import { C } from './palette';

// =============================================================================
// ハト係長

const HATO: Mats = {
  body: mat('#8E95A6', { shade: '#6B7186', light: '#B8BECC', dark: '#4A4F63', rim: '#F2A888' }),
  head: mat('#7A8194', { shade: '#5E6478', light: '#A0A8B8', dark: '#4A4F63', rim: '#E89878' }),
  wing: mat('#6B7186', { shade: '#555A6E', light: '#8E95A6', dark: '#3A3E50' }),
  bar: flat('#3A3F48'),
  neckA: flat('#4FA37A'),
  neckB: flat('#8A5FB0'),
  beak: flat('#E9C9A0'),
  cere: flat('#F4F1E8'),
  eye: flat('#F2E24B'),
  pupil: flat('#2A2440'),
  foot: mat('#E07A6A', { shade: '#B85A4A', light: '#F09A8A' }),
  tie: mat('#2F4A8A', { shade: '#24386A', light: '#4766A8' }),
  stripe: flat('#E84E3C'),
  badge: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFF6D8' }),
  photo: flat('#9AA0A8'),
  lanyard: flat('#4AA8E0'),
  watch: flat('#D9A441'),
};

function hatoSide(f: Fig, p: Pose) {
  const st = p.mode === 'walk' || p.mode === 'run' ? p.step % 4 : 0;
  const act = p.act;
  const peck = act === 'peck' ? p.ph : 0;
  const puff = act === 'meeting' ? 1 : 0;
  const lean = p.run ? 1 : 0;
  const hx = (st === 1 ? -1 : st === 3 ? 1 : 0) - (peck ? 2 : 0) - lean - (act === 'meeting' ? p.ph % 2 : 0);
  const hy = (peck ? 5 : 0) + (p.lookUp ? -1 : 0) + lean;
  // feet
  f.part('foot', { shade: 'r', light: '' });
  const fa = st === 1 ? -1 : st === 3 ? 1 : 0;
  f.vl(7 + fa, 13, 14).px(6 + fa, 14).vl(10 - fa, 13, 14).px(9 - fa, 14);
  // tail
  f.part('wing', { shade: 'rb', light: '' });
  f.rows(11, 9, ['.##', '###', '.###', '..##']);
  // body: upright, chest out
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(3 - puff, 5, ['...#####...', '..########.', '.#########.', '##########.', '##########.', '.#########.', '..#######..', '...#####...']);
  // folded wing
  f.part('wing', { shade: 'rb', light: 't' });
  f.rows(8, 7, ['####', '#####', '#####', '.###']);
  f.part('bar', { flat: true, rim: false });
  f.px(10, 8).px(11, 8).px(11, 10).px(12, 10);
  // neck sheen
  const alt = p.tick % 2 === 1 || st % 2 === 1;
  f.part(alt ? 'neckB' : 'neckA', { flat: true, rim: false });
  f.hl(5, 7, 5);
  f.part(alt ? 'neckA' : 'neckB', { flat: true, rim: false });
  f.px(5, 6).px(6, 6);
  // necktie on the chest (red diagonal stripes)
  f.part('tie', { shade: 'r', light: '' });
  f.rows(3 - puff, 6, ['.##', '##.', '##.', '.#.']);
  f.part('stripe', { flat: true, rim: false });
  f.px(4 - puff, 6).px(3 - puff, 8);
  // staff badge on the lanyard
  f.part('lanyard', { flat: true, rim: false });
  f.px(6, 7);
  f.part('badge', { shade: 'b', light: '' });
  f.rect(5, 8, 2, 3);
  f.part('photo', { flat: true, rim: false });
  f.px(5, 9);
  // head
  f.part('head', { shade: 'rb', light: 't' });
  f.rows(3 + hx, 0 + hy, ['.###.', '#####', '#####', '.###.']);
  f.part('beak', { flat: true, rim: false });
  f.px(2 + hx, 2 + hy).px(1 + hx, 2 + hy);
  f.part('cere', { flat: true, rim: false });
  f.px(3 + hx, 1 + hy);
  f.part('eye', { flat: true, rim: false });
  f.px(4 + hx, 1 + hy).px(5 + hx, 1 + hy);
  f.part('pupil', { flat: true, rim: false });
  if (!p.blink) f.px(4 + hx, 1 + hy);
  if (act === 'watch') {
    f.part('watch', { flat: true, rim: false });
    f.px(8, 9);
  }
}

function hatoFront(f: Fig, p: Pose) {
  const st = p.mode === 'walk' || p.mode === 'run' ? p.step % 4 : 0;
  const back = p.view === 'up';
  const peck = p.act === 'peck' ? p.ph : 0;
  const hy = (peck ? 4 : 0) + (p.lookUp ? -1 : 0) + (st % 2 ? 1 : 0);
  f.part('foot', { shade: 'r', light: '' });
  f.vl(6, 13 - (st === 1 ? 1 : 0), 14).vl(9, 13 - (st === 3 ? 1 : 0), 14).px(5, 14).px(10, 14);
  f.part('wing', { shade: 'rb', light: '' });
  if (back) f.rows(6, 12, ['####', '.##.']);
  f.part('body', { shade: 'rb', light: 't' });
  f.rows(3, 4, ['..######..', '.########.', '##########', '##########', '##########', '##########', '.########.', '..######..', '...####...']);
  if (back) {
    f.part('wing', { shade: 'rb', light: 't' });
    f.rows(3, 6, ['.##....##.', '###....###', '###....###', '.##....##.']);
    f.part('bar', { flat: true, rim: false });
    f.px(4, 8).px(11, 8);
    // tie knot seen from behind: collar band
    f.part('tie', { flat: true, rim: false });
    f.hl(6, 9, 4);
  } else {
    const alt = p.tick % 2 === 1 || st % 2 === 1;
    f.part(alt ? 'neckB' : 'neckA', { flat: true, rim: false });
    f.hl(5, 10, 4);
    f.part(alt ? 'neckA' : 'neckB', { flat: true, rim: false });
    f.px(5, 5).px(10, 5);
    // tie down the chest
    f.part('tie', { shade: 'r', light: '' });
    f.rows(6, 5, ['####', '.##.', '.##.', '.##.', '.##.', '..#.']);
    f.part('stripe', { flat: true, rim: false });
    f.px(7, 7).px(8, 8).px(7, 9).px(8, 10);
    // badge on the side
    f.part('lanyard', { flat: true, rim: false });
    f.px(10, 5).px(11, 6);
    f.part('badge', { shade: 'b', light: '' });
    f.rect(10, 7, 2, 3);
    f.part('photo', { flat: true, rim: false });
    f.px(10, 8);
  }
  f.part('head', { shade: 'rb', light: 't' });
  f.rows(5, 0 + hy, ['.####.', '######', '######', '.####.']);
  if (!back) {
    // yellow eyes on the sides of the head, pupils looking at you
    f.part('eye', { flat: true, rim: false });
    f.px(5, 1 + hy).px(10, 1 + hy);
    f.part('pupil', { flat: true, rim: false });
    if (!p.blink) f.px(6, 1 + hy).px(9, 1 + hy);
    f.part('beak', { flat: true, rim: false });
    f.px(7, 3 + hy).px(8, 3 + hy);
    f.part('cere', { flat: true, rim: false });
    f.px(7, 2 + hy).px(8, 2 + hy);
  }
}

registerChar('enemy_hato_kakaricho', () =>
  buildSprite({
    id: 'enemy_hato_kakaricho',
    h: 16,
    mats: HATO,
    draw: (f, p) => (p.view === 'left' ? hatoSide(f, p) : hatoFront(f, p)),
    walkFrameMs: 120,
    walkBob: [0, 0, 0, 0],
    run: true,
    runFrameMs: 80,
    runBob: [0, -1, 0, -1],
    idle: [{ act: 'peck', ph: 0 }, { act: 'peck', ph: 1 }, { act: 'peck', ph: 0 }, { act: 'peck', ph: 1 }, {}, { blink: true }, { act: 'peck', ph: 0 }, { act: 'peck', ph: 1 }],
    idleFrameMs: 300,
    extras: {
      peck: { dirs: 'all', p: { ph: 1 } },
      meeting: { dirs: ['left', 'right'] },
      watch: { dirs: ['left', 'right'] },
    },
    anims: {
      peck: { frames: [{ ph: 0 }, { ph: 1 }], ms: 300, dir: 'left' },
      meeting: { frames: [{ ph: 0 }, { ph: 1 }], ms: 100, dir: 'left' },
    },
    shadow: 10,
  }),
);

// =============================================================================
// セミファイナル: a giant cicada lying on its back, head to the west. Six legs
// point up and twitch. Walk = the hop (crouch → up → peak → land).

const SEMI: Mats = {
  belly: mat('#C9A36A', { shade: '#A8834A', light: '#E8C88A', dark: '#8A6A3A', rim: '#FFC880' }),
  seg: flat('#A8834A'),
  thorax: mat('#5A3A22', { shade: '#3E2616', light: '#7A5A3A', dark: '#2A1A12' }),
  eye: mat('#2A1A12', { shade: '#1A100A', light: '#6A5A4A' }),
  glint: flat('#F4F1E8'),
  wing: mat('#9A7A52', { shade: '#7A5A3A', light: '#BC9C6C', dark: '#4A3220', rim: '#E8B070' }),
  vein: flat('#5A3E26'),
  leg: flat('#2A1A12'),
  joint: flat('#7A5A3A'),
};

function semi(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const air = walking ? [0, 3, 5, 1][st] : p.act === 'hop' ? 4 : 0;
  const flail = walking && st > 0;
  const flutter = walking && (st === 1 || st === 2);
  const tw = p.act === 'twitch' ? p.ph : 0;
  const y = 6 - air; // top row of the upper wing
  // broad veined wings flaring out on both sides of the body
  f.part('wing', { shade: 'rb', light: 't' });
  const wUp = flutter ? ['.......########.......', '....#############.....', '..##################..'] : ['......###########.....', '....##############....', '..#################...'];
  f.rows(2, y, wUp);
  f.rows(2, y + 7, flutter ? ['..##################..', '....#############.....', '.......########.......'] : ['..#################...', '....##############....', '......###########.....']);
  f.part('vein', { flat: true, rim: false });
  for (const vx of [9, 13, 17]) f.px(vx, y + 1).px(vx + 1, y + 2).px(vx, y + 8).px(vx + 1, y + 7);
  f.px(20, y + 2).px(20, y + 7);
  // dark spots near the wing tips (アブラゼミ)
  f.px(18, y + 1).px(18, y + 8);
  // body: head + thorax (left), segmented belly (right)
  f.part('thorax', { shade: 'rb', light: 't' });
  f.rows(2, y + 3, ['.#####', '######', '######', '.#####']);
  f.part('belly', { shade: 'rb', light: 't' });
  f.rows(8, y + 3, ['###########.', '#############', '#############', '###########.']);
  f.part('seg', { flat: true, rim: false });
  for (let x = 10; x <= 18; x += 2) f.vl(x, y + 4, y + 5);
  // compound eyes, one on each side of the head
  f.part('eye', { shade: 'r', light: '' });
  f.rect(1, y + 3, 2, 1).rect(1, y + 6, 2, 1);
  f.part('glint', { flat: true, rim: false });
  f.px(1, y + 3).px(1, y + 6);
  // six legs clawing at the sky over the thorax
  const legs: [number, number, number, number][] = [
    [4, y + 3, 3, y + 1], [6, y + 3, 6, y + 1], [8, y + 3, 9, y + 1],
    [4, y + 6, 3, y + 8], [6, y + 6, 6, y + 8], [8, y + 6, 9, y + 8],
  ];
  legs.forEach(([x0, y0, x1, y1], i) => {
    const wig = flail ? ((i + st) % 2 ? 1 : -1) : tw && i === 1 ? 1 : 0;
    f.part('leg', { flat: true, rim: false });
    f.line(x0, y0, x1 + wig, y1);
    f.part('joint', { flat: true, rim: false });
    f.px(x1 + wig, y1);
  });
}

registerChar('enemy_semi_final', () =>
  buildSprite({
    id: 'enemy_semi_final',
    w: 24,
    h: 18,
    mats: SEMI,
    draw: semi,
    walkFrameMs: 110,
    walkBob: [0, 0, 0, 0],
    idle: [{}, {}, {}, {}, { act: 'twitch', ph: 1 }, {}, {}, {}, {}, {}, { act: 'twitch', ph: 1 }, {}],
    idleFrameMs: 120,
    extras: { twitch: { dirs: ['down'], p: { ph: 1 } }, hop: { dirs: ['down'] } },
    views: { up: 'down', left: 'down', right: 'down' },
    shadow: 18,
  }),
);

// =============================================================================
// コーン・ボーカル: an orange cone with reflective-band slit eyes and a yellow
// beacon on its head (the light spot cycles in 3 frames). Hops along; sings.

const CONE: Mats = {
  cone: mat('#F07A2A', { shade: '#C85A1A', light: '#FFA25A', dark: '#8A3A10', rim: '#FFD0A0' }),
  band: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9E978C' }),
  base: mat('#3A3A44', { shade: '#26262E', light: '#5A5A66', dark: '#16161C' }),
  mud: flat('#8A5A3A'),
  tape: flat('#3A3F48'),
  eye: flat('#2A2440'),
  reflect: flat('#5CE1FF'),
  hole: flat('#2A2440'),
  lamp: mat('#FFD23F', { shade: '#D9A441', light: '#FFF6D8', dark: '#A8742A' }),
  lampHi: flat('#FFF6D8'),
};

function cone(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const hop = walking && st % 2 ? -1 : 0;
  const sway = p.mode === 'idle' ? [0, 1, 0, -1][p.tick % 4] : walking ? [0, -1, 0, 1][st] : 0;
  const sing = p.act === 'sing';
  const back = p.view === 'up';
  const side = p.view === 'left';
  const y = hop;
  // base plate
  f.part('base', { shade: 'rb', light: 't' });
  f.rect(1, 20 + y, 14, 2);
  f.part('base', { flat: true });
  f.t(1).hl(1, 3, 20 + y).t(null);
  // cone body with a per-row shear (sway, stronger toward the tip)
  const rows: [number, number][] = [];
  for (let j = 0; j < 15; j++) {
    const yy = 5 + j;
    const half = 2 + Math.round(j * 0.36);
    rows.push([yy, half]);
  }
  f.part('cone', { shade: 'rb', light: 'l' });
  for (const [yy, half] of rows) {
    const sh = Math.round((sway * (19 - yy)) / 14) + (sing ? (yy < 10 ? 1 : 0) : 0);
    f.hl(8 - half + sh, 7 + half + sh, yy + y);
  }
  // white bands
  f.part('band', { shade: 'r', light: '' });
  for (const [yy, half] of rows) {
    if (!((yy >= 9 && yy <= 10) || (yy >= 14 && yy <= 15))) continue;
    const sh = Math.round((sway * (19 - yy)) / 14) + (sing ? (yy < 10 ? 1 : 0) : 0);
    f.hl(8 - half + sh, 7 + half + sh, yy + y);
  }
  // dirt + tape patch on the lower half
  f.part('mud', { flat: true, rim: false });
  f.px(4, 18 + y).px(11, 17 + y).px(9, 19 + y);
  f.part('tape', { flat: true, rim: false });
  f.px(10, 12 + y).px(11, 12 + y);
  // slit eyes on the upper band (+ reflective glint)
  const sh9 = Math.round((sway * 10) / 14) + (sing ? 1 : 0);
  if (!back) {
    f.part('eye', { flat: true, rim: false });
    if (side) f.hl(4 + sh9, 5 + sh9, 9 + y);
    else if (!p.blink) f.hl(5 + sh9, 6 + sh9, 9 + y).hl(9 + sh9, 10 + sh9, 9 + y);
    else f.px(5 + sh9, 9 + y).px(10 + sh9, 9 + y);
    f.part('reflect', { flat: true, rim: false });
    if (!side) f.px(6 + sh9, 10 + y).px(9 + sh9, 10 + y);
    else f.px(5 + sh9, 10 + y);
  }
  // mouth = the hole at the tip (opens when singing)
  const shTop = Math.round((sway * 14) / 14) + (sing ? 1 : 0);
  f.part('hole', { flat: true, rim: false });
  if (sing) f.rect(7 + shTop, 5 + y, 2, 2);
  else f.hl(7 + shTop, 8 + shTop, 5 + y);
  // beacon: dome with a rotating light spot
  f.part('lamp', { shade: 'rb', light: '' });
  f.rows(5 + shTop, 1 + y + (p.lookUp ? -1 : 0), ['.####.', '######', '######']);
  const spot = (p.tick + st) % 3;
  f.part('lampHi', { flat: true, rim: false, ol: false });
  f.rect(6 + shTop + spot * 1, 2 + y + (p.lookUp ? -1 : 0), 2, 1);
  f.after((pc) => {
    // soft glow fan (drawn after lighting, no outline)
    const cx = 8 + shTop + (spot - 1) * 3;
    for (let i = -1; i <= 1; i++) if (pc.alpha(cx + i, y) === 0) pc.set(cx + i, y, '#FFE7A366');
  });
}

registerChar('enemy_cone_vocal', () =>
  buildSprite({
    id: 'enemy_cone_vocal',
    mats: CONE,
    draw: cone,
    walkFrameMs: 150,
    walkBob: [0, 0, 0, 0],
    idle: rep([{}, {}, {}, {}], 3),
    idleFrameMs: 120,
    extras: { sing: { dirs: 'all' } },
    anims: { sing: { frames: [{ act: 'sing', tick: 0 }, { act: 'sing', tick: 1 }, { act: 'sing', tick: 2 }], ms: 120 } },
    shadow: 14,
  }),
);

// =============================================================================
// ワスレガサ: a furled clear-vinyl umbrella standing on its tip. The J handle
// droops like a tilted head; the name sticker ("?") reads as a face. The
// membrane is translucent (ground shows through); one rib is broken. Hops.

const KASA: Mats = {
  film: mat('#CFE3EA99', { shade: '#9AB8C4AA', light: '#EAF6FACC', dark: '#6E98A8CC', spec: '#FFFFFFEE', rim: '#FFE0C0BB', ol: '#4A6A7A' }),
  fold: flat('#9AB8C4CC'),
  hi: flat('#FFFFFFDD'),
  rib: mat('#9AA3AD', { shade: '#6B7186', light: '#C0C6CC' }),
  shaft: mat('#C0C6CC', { shade: '#9AA0A8', light: '#E8ECF0' }),
  tip: flat('#6B7186'),
  handle: mat('#3A2B24', { shade: '#261C18', light: '#6A4B3A', dark: '#1A120E' }),
  sticker: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFF6D8' }),
  q: flat('#E23B2E'),
  strap: flat('#F4F1E8CC'),
  snap: flat('#C0C6CC'),
};

function kasa(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  // squash & stretch hop: land (squash), rise (stretch), air, fall
  const air = walking ? [0, 1, 3, 2][st] : 0;
  const squash = walking && st === 0 ? 1 : 0;
  const stretch = walking && st === 1 ? 1 : 0;
  const tilt = p.mode === 'idle' ? [0, 0, 1, 1][p.tick % 4] : 0;
  const open = p.act === 'open';
  const hug = p.act === 'hug';
  const y0 = 32 - air;
  const top = 12 - air + squash - stretch;
  // tip + ferrule
  f.part('tip', { flat: true, rim: false });
  f.px(8, y0).px(8, y0 - 1);
  // furled canopy (translucent)
  f.part('film', { shade: 'r', light: 'l' });
  const h = y0 - 2 - top;
  for (let j = 0; j <= h; j++) {
    const t = j / h;
    const w = open ? Math.round(1 + (1 - t) * 6.5) : Math.round(1 + Math.sin(Math.PI * Math.min(1, t * 1.25)) * (3 + squash));
    f.hl(8 - w, 8 + w - 1, y0 - 2 - j);
  }
  // fold lines + highlights
  f.part('fold', { flat: true, rim: false });
  for (let j = 3; j < h - 2; j += 2) f.px(8 + (j % 4 === 1 ? 1 : 0), y0 - 2 - j);
  f.part('hi', { flat: true, rim: false, ol: false });
  f.vl(6, y0 - 10, y0 - 6).vl(6, y0 - 16, y0 - 13);
  // strap with snap around the middle
  const my = y0 - 2 - Math.round(h * 0.45);
  f.part('strap', { flat: true, rim: false });
  f.hl(5, 11, my);
  f.px(12, my + 1 + (p.tick % 2)).px(13, my + 2);
  f.part('snap', { flat: true, rim: false });
  f.px(11, my);
  // broken rib poking out on the right, in two segments
  f.part('rib', { shade: 'r', light: '' });
  f.px(11, my - 4).px(12, my - 5).px(13, my - 5).px(14, my - 6);
  // rib tips gathered under the handle
  f.part('rib', { flat: true, rim: false });
  f.px(7, top + 1).px(9, top + 1).px(6, top + 2).px(10, top + 2);
  // shaft + J handle drooping to the left (the "head")
  f.part('shaft', { shade: 'r', light: '' });
  f.vl(8, top - 2, top);
  f.part('handle', { shade: 'rb', light: 't' });
  const hx = hug ? -1 : tilt;
  const lu = p.lookUp ? -1 : 0;
  // 2px-thick J hook: straight grip up from the shaft, curling over to the
  // left and hanging down like a tilted head
  f.rows(3 + hx, top - 9 + lu, [
    '..#####.',
    '.##...##',
    '##.....#',
    '##.....#',
    '##......',
    '.#......',
  ]);
  f.rect(8 + hx, top - 6, 2, 5);
  // name sticker on the grip, with the red "?"
  f.part('sticker', { shade: 'b', light: '' });
  f.rect(7 + hx, top - 5, 4, 4);
  f.part('q', { flat: true, rim: false });
  f.px(8 + hx, top - 5).px(9 + hx, top - 5).px(9 + hx, top - 4).px(8 + hx, top - 3).px(8 + hx, top - 2);
  if (p.view === 'up') {
    // from behind: sticker hidden
    f.part('handle', { shade: 'rb', light: 't' });
    f.rect(7 + hx, top - 5, 4, 4);
  }
}

registerChar('enemy_wasuregasa', () =>
  buildSprite({
    id: 'enemy_wasuregasa',
    h: 34,
    mats: KASA,
    draw: kasa,
    walkFrameMs: 130,
    walkBob: [0, 0, 0, 0],
    idle: rep([{}, {}, {}, {}], 2),
    idleFrameMs: 200,
    extras: { open: { dirs: ['down'] }, hug: { dirs: ['down'] } },
    views: { left: 'down', right: 'down' },
    shadow: 10,
  }),
);

// =============================================================================
// おじぎ自販機: red machine, header logo, LED "17:00", a window of cans that are
// all "hot", buttons, a dispenser mouth, a sunburnt power cord dragging off to
// the right. Bow frames 0/30/60/90°: the roof turns toward the camera while
// the front foreshortens. Idle: compressor hum, LED flicker, flap twitch.

export const VEND_MATS: Mats = {
  body: mat('#C8313A', { shade: '#8E1F2A', light: '#E84E3C', dark: '#4A1420', spec: '#FF6A4D', rim: '#FF6A4D' }),
  side: mat('#E84E3C', { shade: '#C8313A', light: '#FF6A4D', dark: '#8E1F2A', rim: '#FF8A6A' }),
  roof: mat('#D9404A', { shade: '#A82A36', light: '#F06070', dark: '#6A1A22' }),
  vent: flat('#6A1A22'),
  dust: flat('#9A8A8A'),
  header: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFF6D8' }),
  logo: flat('#E84E3C'),
  led: flat('#1A2A20'),
  ledOn: flat('#7CFF9A'),
  ledOff: flat('#2A5A3A'),
  glass: flat('#3A2B3A'),
  glassHi: flat('#6A5A6A'),
  can: mat('#E84E3C', { shade: '#B8302A', light: '#FF9A8A' }),
  canW: flat('#F4F1E8'),
  cold: flat('#9AB8C4'),
  x: flat('#E23B2E'),
  btn: flat('#F4F1E8'),
  lamp: flat('#E84E3C'),
  slot: mat('#3A3F48', { shade: '#262A34', light: '#6B7186' }),
  mouth: flat('#1A1420'),
  flap: mat('#3A3F48', { shade: '#262A34', light: '#6B7186' }),
  rust: flat('#8E5A3A'),
  cord: mat('#C8B8A8', { shade: '#A89888', light: '#E0D4C8' }),
  plug: mat('#9AA0A8', { shade: '#6B7186', light: '#C0C6CC' }),
};

/** Upright front of the machine inside [x0..x0+21] from y0 (38 rows). */
function vendFront(f: Fig, x0: number, y0: number, o: { ledOn: boolean; flicker: boolean; flap: number; hum: number }) {
  const x = x0 + o.hum;
  // left side panel (lit)
  f.part('side', { shade: '', light: '' });
  f.rect(x, y0 + 1, 3, 37);
  f.part('side', { flat: true });
  f.t(1).vl(x, y0 + 1, y0 + 37).t(null);
  // front
  f.part('body', { shade: 'r', light: 't' });
  f.rect(x + 3, y0, 19, 38);
  // header strip with the wave logo + LED
  f.part('header', { shade: 'b', light: '' });
  f.rect(x + 4, y0 + 1, 12, 4);
  f.part('logo', { flat: true, rim: false });
  f.px(x + 5, y0 + 3).px(x + 6, y0 + 2).px(x + 7, y0 + 3).px(x + 8, y0 + 2).px(x + 9, y0 + 3).px(x + 10, y0 + 2).px(x + 11, y0 + 3);
  f.part('led', { flat: true, rim: false });
  f.rect(x + 16, y0 + 1, 5, 4);
  f.part(o.ledOn && !o.flicker ? 'ledOn' : 'ledOff', { flat: true, rim: false });
  // "17:00" at micro scale: 1 | 7 : 0 0
  f.vl(x + 16, y0 + 2, y0 + 3).px(x + 17, y0 + 2).px(x + 17, y0 + 3).px(x + 19, y0 + 2).px(x + 19, y0 + 3).px(x + 20, y0 + 2).px(x + 20, y0 + 3);
  f.part(o.ledOn ? 'ledOn' : 'ledOff', { flat: true, rim: false });
  f.px(x + 18, y0 + 2);
  // display window with two rows of (all hot) cans
  f.part('glass', { flat: true, rim: false });
  f.rect(x + 4, y0 + 6, 17, 11);
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 5; c++) {
      const cx = x + 5 + c * 3;
      const cy = y0 + 7 + r * 5;
      f.part('can', { shade: 'r', light: 'l' });
      f.rect(cx, cy, 2, 3);
      f.part('canW', { flat: true, rim: false });
      f.hl(cx, cx + 1, cy + 1);
    }
  // the one sunburnt "cold" sticker, crossed out
  f.part('cold', { flat: true, rim: false });
  f.rect(x + 17, y0 + 12, 2, 3);
  f.part('x', { flat: true, rim: false });
  f.px(x + 17, y0 + 12).px(x + 18, y0 + 13).px(x + 17, y0 + 14);
  // "hot" red strips under each row
  f.part('logo', { flat: true, rim: false });
  f.hl(x + 5, x + 19, y0 + 10).hl(x + 5, x + 19, y0 + 15);
  // glass reflection band
  f.part('glassHi', { flat: true, rim: false, ol: false });
  f.px(x + 6, y0 + 16).px(x + 7, y0 + 15).px(x + 9, y0 + 13).px(x + 10, y0 + 12).px(x + 12, y0 + 10).px(x + 13, y0 + 9).px(x + 15, y0 + 7);
  // buttons (lamps all lit)
  for (let c = 0; c < 5; c++) {
    f.part('btn', { flat: true, rim: false });
    f.px(x + 5 + c * 3, y0 + 18);
    f.part('lamp', { flat: true, rim: false });
    f.px(x + 6 + c * 3, y0 + 18);
  }
  // coin slot, bill slot, return lever
  f.part('slot', { shade: 'r', light: 't' });
  f.rect(x + 16, y0 + 21, 3, 4);
  f.rect(x + 5, y0 + 22, 6, 2);
  f.part('btn', { flat: true, rim: false });
  f.px(x + 17, y0 + 22);
  // dispenser mouth + flap
  f.part('mouth', { flat: true, rim: false });
  f.rect(x + 6, y0 + 28, 12, 4);
  f.part('flap', { shade: 'b', light: 't' });
  f.rect(x + 6, y0 + 28 + o.flap, 12, 2 - o.flap);
  // kick plate + rust
  f.part('body', { flat: true });
  f.t(-1).rect(x + 3, y0 + 34, 19, 4).t(null);
  f.part('rust', { flat: true, rim: false });
  f.px(x + 5, y0 + 36).px(x + 12, y0 + 35).px(x + 19, y0 + 36);
}

function cord(f: Fig, x: number, y: number) {
  f.part('cord', { shade: 'b', light: '' });
  f.px(x, y).px(x + 1, y + 1).px(x + 1, y + 2).px(x + 1, y + 3);
  f.part('plug', { shade: 'r', light: 't' });
  f.rect(x + 1, y + 4, 1, 1);
}

function vend(f: Fig, p: Pose) {
  const deg = p.act === 'bow' ? p.ph : p.act === 'bow_30' ? 1 : p.act === 'bow_60' ? 2 : p.act === 'bow_90' ? 3 : 0;
  const hum = p.mode === 'idle' && p.tick % 2 === 1 ? 1 : 0;
  const flicker = p.mode === 'idle' && p.tick % 7 === 5;
  const flap = p.mode === 'idle' && p.tick % 5 === 2 ? 1 : 0;
  const ledOn = p.act !== 'off';
  if (deg === 0) {
    vendFront(f, 0, 2, { ledOn, flicker, flap, hum });
    cord(f, 22, 34);
    return;
  }
  // bowing: roof comes toward the camera, the front shortens
  const roofH = [0, 4, 10, 16][deg];
  const frontH = [38, 30, 20, 8][deg];
  const topY = 40 - frontH - roofH;
  // roof with vents and dust
  f.part('roof', { shade: 'r', light: 't' });
  f.rect(3, topY, 19, roofH);
  f.part('side', { shade: '', light: '' });
  f.rect(0, topY + 1, 3, roofH + frontH - 1);
  f.part('vent', { flat: true, rim: false });
  for (let j = 1; j < roofH - 1; j += 2) f.hl(6, 18, topY + j);
  if (deg === 3) {
    f.part('dust', { flat: true, rim: false });
    f.px(5, topY + 2).px(12, topY + 5).px(19, topY + 9).px(9, topY + 12);
  }
  // compressed front: header strip + window + mouth squeezed
  const fy = topY + roofH;
  f.part('body', { shade: 'r', light: '' });
  f.rect(3, fy, 19, frontH);
  f.part('header', { shade: 'b', light: '' });
  f.rect(4, fy, 12, Math.max(1, Math.round(frontH / 10)));
  f.part('led', { flat: true, rim: false });
  f.rect(16, fy, 5, Math.max(1, Math.round(frontH / 10)));
  f.part('ledOn', { flat: true, rim: false });
  f.hl(16, 20, fy);
  if (frontH > 8) {
    f.part('glass', { flat: true, rim: false });
    f.rect(4, fy + Math.round(frontH * 0.15), 17, Math.round(frontH * 0.28));
    f.part('can', { shade: '', light: '' });
    for (let c = 0; c < 5; c++) f.rect(5 + c * 3, fy + Math.round(frontH * 0.18), 2, Math.max(1, Math.round(frontH * 0.08)));
  }
  f.part('mouth', { flat: true, rim: false });
  f.rect(6, fy + Math.round(frontH * 0.72), 12, Math.max(1, Math.round(frontH * 0.1)));
  cord(f, 22, 34);
}

registerChar('enemy_ojigi_jihanki', () =>
  buildSprite({
    id: 'enemy_ojigi_jihanki',
    w: 24,
    h: 40,
    mats: VEND_MATS,
    draw: vend,
    walkFrames: 1,
    idle: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { act: 'bow', ph: 1 }, { act: 'bow', ph: 2 }, { act: 'bow', ph: 2 }, { act: 'bow', ph: 1 }],
    idleFrameMs: 200,
    extras: {
      bow_30: { dirs: ['down'] },
      bow_60: { dirs: ['down'] },
      bow_90: { dirs: ['down'] },
    },
    anims: {
      bow: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 3 }, { ph: 3 }, { ph: 2 }, { ph: 1 }, { ph: 0 }], ms: [100, 90, 90, 500, 200, 90, 90, 200], loop: false },
    },
    views: { up: 'down', left: 'down', right: 'down' },
    shadow: 22,
  }),
);

// =============================================================================
// ソウジロウ: robot vacuum seen from above-front. Blue LED eyes blink, the side
// brush spins (4 frames), a lone sock sits in the clear dust bin.

const SOUJI: Mats = {
  top: mat('#C8CDD4', { shade: '#9AA0A8', light: '#E8ECF0', dark: '#6B7186', rim: '#F4D8C0' }),
  band: mat('#9AA0A8', { shade: '#6B7186', light: '#B8BEC6', dark: '#4A4F63' }),
  bumper: mat('#3A3F48', { shade: '#262A34', light: '#5A5F68' }),
  led: flat('#5CE1FF'),
  ledHalo: flat('#2F4A8A'),
  button: flat('#4AA8E0'),
  bin: flat('#B8C0C8B3'),
  dust: flat('#6B7186'),
  sock: flat('#F4F1E8'),
  sockR: flat('#E84E3C'),
  brush: flat('#3A3F48'),
};

function souji(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const jit = walking ? [0, 1, 0, -1][st] : p.mode === 'idle' ? [0, 1, 0, -1][p.tick % 4] : 0;
  const blink = p.mode === 'idle' ? p.tick % 5 === 4 : walking ? st === 3 : false;
  const view = p.view;
  const x = 1 + (view === 'left' ? jit : 0);
  const y = view !== 'left' ? (jit > 0 ? 1 : 0) : 0;
  // side band + bumper
  f.part('band', { shade: 'r', light: '' });
  f.rows(x, 5 + y, ['.####################.', '######################', '.####################.']);
  // top disc
  f.part('top', { shade: 'r', light: 't' });
  f.rows(x, 1 + y, ['....##############....', '.####################.', '######################', '######################', '.####################.', '....##############....']);
  f.part('top', { flat: true, rim: false, ol: false });
  f.t(1).hl(x + 5, x + 10, 2 + y).px(x + 3, 3 + y).t(null);
  // bumper toward the facing direction
  f.part('bumper', { shade: 'b', light: 't' });
  if (view === 'down') f.hl(x + 3, x + 18, 7 + y).hl(x + 1, x + 20, 6 + y);
  else if (view === 'left') f.vl(x, 3 + y, 6 + y).vl(x + 1, 5 + y, 7 + y);
  // LED eyes (front), center button, bin (back)
  if (view !== 'up') {
    const ex = view === 'left' ? x + 3 : x + 8;
    const ey = view === 'left' ? 3 + y : 4 + y;
    f.part('ledHalo', { flat: true, rim: false });
    if (view === 'left') f.px(ex - 1, ey).px(ex - 1, ey + 1);
    else f.px(ex - 1, ey).px(ex + 6, ey);
    f.part(blink ? 'ledHalo' : 'led', { flat: true, rim: false });
    if (view === 'left') f.px(ex, ey).px(ex, ey + 1);
    else f.hl(ex, ex + 1, ey).hl(ex + 4, ex + 5, ey);
  }
  f.part('button', { flat: true, rim: false });
  f.hl(x + 10, x + 11, 3 + y);
  // dust bin (translucent) with the lone sock
  const bx = view === 'left' ? x + 13 : x + 7;
  const by = view === 'up' ? 3 + y : 1 + y;
  f.part('bin', { flat: true, rim: false, ol: false });
  f.rect(bx, by, 7, 2);
  f.part('dust', { flat: true, rim: false, ol: false });
  f.px(bx + 1, by + 1).px(bx + 5, by + 1);
  f.part('sock', { flat: true, rim: false, ol: false });
  f.px(bx + 3, by).px(bx + 3, by + 1).px(bx + 4, by + 1);
  f.part('sockR', { flat: true, rim: false, ol: false });
  f.px(bx + 5, by + 1).px(bx + 3, by);
  // side brush (front-left), spinning
  const b = (p.tick + st) % 4;
  f.part('brush', { flat: true, rim: false });
  const bxy = view === 'down' ? [x + 1, 7 + y] : view === 'left' ? [x - 1, 6 + y] : [x + 1, 1 + y];
  const spokes = [[[-1, 0], [1, 0]], [[-1, -1], [1, 1]], [[0, -1], [0, 1]], [[1, -1], [-1, 1]]][b];
  for (const [dx, dy] of spokes) f.px(bxy[0] + 1 + dx, bxy[1] + dy);
}

registerChar('enemy_soujirou', () =>
  buildSprite({
    id: 'enemy_soujirou',
    w: 24,
    h: 12,
    mats: SOUJI,
    draw: souji,
    walkFrameMs: 60,
    walkBob: [0, 0, 0, 0],
    idle: rep([{}, {}, {}, {}, {}], 2),
    idleFrameMs: 120,
    extras: {},
    shadow: 20,
  }),
);

// =============================================================================
// モミスギ: leather massage chair (from the front, a touch from the left).
// Button dimples on the headrest look like sleepy eyes; rollers peek through
// the back seams and move; the remote dangles on a coiled cord like a tail.
// 'beckon' = the cord curls to beckon.

export const CHAIR_MATS: Mats = {
  leather: mat('#5A2E2A', { shade: '#3A1A18', light: '#8A4A3E', dark: '#2A1418', spec: '#AE6A5A', rim: '#F2894B' }),
  pad: mat('#6A3A34', { shade: '#4A2622', light: '#8E5448', dark: '#2A1418' }),
  seam: flat('#2A1418'),
  stitch: flat('#7A3E36'),
  roller: mat('#D9C8B0', { shade: '#A89880', light: '#F4E6D8' }),
  dimple: flat('#3A1A18'),
  chrome: mat('#C0C6CC', { shade: '#6B7186', light: '#F4F1E8', dark: '#4A4F63' }),
  foam: flat('#F6D98A'),
  tag: mat('#F6D98A', { shade: '#D9A441', light: '#FFF0B8' }),
  cordC: flat('#2A2440'),
  remote: mat('#E8E4D8', { shade: '#C4BCB0', light: '#FAF6EC' }),
  bR: flat('#E84E3C'),
  bG: flat('#5FA85A'),
  bB: flat('#4AA8E0'),
  sign: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFF6D8' }),
  signT: flat('#E23B2E'),
  string: flat('#9AA0A8'),
};

export function chair(f: Fig, p: Pose, restored = false) {
  const roll = p.mode === 'idle' && !restored ? p.tick % 8 : 0;
  const rollY = [0, 1, 2, 3, 4, 3, 2, 1][roll];
  const breathe = p.mode === 'idle' && !restored && p.tick % 8 >= 4 ? 1 : 0;
  const sway = restored ? 0 : p.act === 'beckon' ? 3 + (p.ph % 3) : p.mode === 'idle' ? p.tick % 3 : 0;
  // chrome base + legs
  f.part('chrome', { shade: 'r', light: 't' });
  f.rect(4, 29, 16, 2).rect(5, 27, 2, 2).rect(17, 27, 2, 2);
  // leg massager (front)
  f.part('leather', { shade: 'rb', light: 't' });
  f.rect(6, 21, 12, 6);
  f.part('seam', { flat: true, rim: false });
  f.vl(9, 22, 25).vl(14, 22, 25);
  // seat
  f.part('leather', { shade: 'rb', light: 't' });
  f.rect(3, 18, 18, 4);
  f.part('stitch', { flat: true, rim: false });
  for (let x = 4; x < 20; x += 2) f.px(x, 19);
  // backrest
  f.part('leather', { shade: 'rb', light: 'tl' });
  f.rect(5, 7 + breathe, 14, 11 - breathe);
  // seams with rollers peeking through
  f.part('seam', { flat: true, rim: false });
  f.vl(9, 8 + breathe, 16).vl(14, 8 + breathe, 16);
  f.part('roller', { shade: 'r', light: 't' });
  f.rect(9, 9 + rollY, 1, 2).rect(14, 13 - rollY, 1, 2);
  // crack showing the yellow foam
  f.part('foam', { flat: true, rim: false });
  f.px(7, 12).px(7, 13);
  // headrest with sleepy button "eyes"
  f.part('leather', { shade: 'rb', light: 't' });
  f.rows(6, 1 + breathe, ['.##########.', '############', '############', '############', '.##########.']);
  f.part('dimple', { flat: true, rim: false });
  if (restored) f.px(8, 3 + breathe).px(9, 4 + breathe).px(10, 3 + breathe).px(13, 3 + breathe).px(14, 4 + breathe).px(15, 3 + breathe);
  else f.hl(8, 10, 3 + breathe).hl(13, 15, 3 + breathe);
  // armrests with air pads
  f.part('leather', { shade: 'rb', light: 't' });
  f.rect(1, 12, 4, 9).rect(19, 12, 4, 9);
  f.part('pad', { shade: 'r', light: 't' });
  f.rect(2, 13, 2, 6).rect(20, 13, 2, 6);
  // "お試し" tag on the left armrest
  f.part('tag', { shade: 'b', light: '' });
  f.rect(1, 15, 3, 2);
  // remote on a coiled cord from the right armrest, swaying like a tail
  f.part('cordC', { flat: true, rim: false });
  const cordPts: [number, number][] = restored
    ? [[22, 21], [22, 22], [23, 23]]
    : [[22, 21], [23, 22], [22, 23], [23, 24], [22 + (sway % 3 === 1 ? 1 : 0), 25]];
  for (const [x, y] of cordPts) f.px(x, y);
  if (!restored) {
    const rx = 20 + [0, 1, 0, -1, 1, 2][sway];
    const ry = sway >= 3 ? 22 - (sway - 3) : 26;
    f.part('remote', { shade: 'r', light: 't' });
    f.rect(rx, ry, 2, 4);
    f.part('bR', { flat: true, rim: false });
    f.px(rx, ry + 1);
    f.part('bG', { flat: true, rim: false });
    f.px(rx + 1, ry + 1);
    f.part('bB', { flat: true, rim: false });
    f.px(rx, ry + 2);
  } else {
    // remote tidied onto the armrest
    f.part('remote', { shade: 'r', light: 't' });
    f.rect(20, 10, 3, 2);
  }
  if (restored) {
    // 「お試し中止」 sign hanging from the headrest on a string
    f.part('string', { flat: true, rim: false });
    f.px(9, 6).px(15, 6);
    f.part('sign', { shade: 'rb', light: 't' });
    f.rect(8, 7, 9, 6);
    f.part('signT', { flat: true, rim: false });
    f.hl(9, 15, 8).px(10, 10).px(11, 10).px(13, 10).px(14, 10).px(12, 11);
  }
}

registerChar('enemy_momisugi', () =>
  buildSprite({
    id: 'enemy_momisugi',
    w: 24,
    h: 32,
    mats: CHAIR_MATS,
    draw: (f, p) => chair(f, p),
    walkFrames: 1,
    idle: rep([{}, {}, {}, {}, {}, {}, {}, {}], 1),
    idleFrameMs: 150,
    extras: { beckon: { dirs: ['down'], p: { ph: 1 } } },
    anims: { beckon: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 1 }], ms: 160 } },
    views: { up: 'down', left: 'down', right: 'down' },
    shadow: 22,
  }),
);

void C;
