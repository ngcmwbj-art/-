// Field symbols of the seven enemies (20_systems_battle 14.2 motions,
// 30_level_art 9.5 sizes). Each exaggerates one feature so it reads at 1x.
//
//  enemy_hato_kakaricho 16×18  upright barrel chest, glasses, striped tie, ID
//                              card; 'peck' = a stiff office bow
//  enemy_semi_final     24×18  upside-down cicada, twitching legs; 'hop' splays
//  enemy_cone_vocal     16×24  slit eyes + beacon whose beam sweeps L/front/R;
//                              'sing' opens a mouth in the lower band
//  enemy_wasuregasa     18×30  half-open clear umbrella (ground shows through),
//                              one snapped rib, brown J hook, "?" name label
//  enemy_ojigi_jihanki  48×40  bows at the waist hinge (30/60/90°), LED 17:00,
//                              power cord dragged across the ground
//  enemy_soujirou       24×12  robot vacuum, blinking blue LEDs, sock in the bin
//  enemy_momisugi       24×32  massage chair, remote cord sways / beckons

import { flat, mat, type Fig, type Mats } from './fig';
import { buildSprite, rep, type IdleKey, type Pose } from './rig';
import { registerChar } from './registry';
import { C } from './palette';
import { mix } from '../../engine/pixel';

// =============================================================================
// ハト係長: the Ginza pigeon promoted to section chief. Everything the plain
// pigeon (npc_hato, 16×14, crouched) is not: bolt upright with a barrel
// chest 14px across, black office glasses across the eyes, a 2px navy tie
// with red stripes (from behind it is flung over the shoulder), and a staff
// ID card on a blue lanyard. Its 'peck' is a stiff office bow from the hips
// that keeps chest and tie in view (the tie dangles free at the bottom of
// the bow). Canvas 16×18.

const HATO: Mats = {
  body: mat('#9AA0B0', { shade: '#707690', light: '#C4CAD6', dark: '#4A4F63', rim: '#F2A888' }),
  breast: mat('#B4B8C4', { shade: '#8E94A6', light: '#D4D8E0', dark: '#5A5F72', rim: '#F4B898' }),
  head: mat('#7A8194', { shade: '#5E6478', light: '#A0A8B8', dark: '#4A4F63', rim: '#E89878' }),
  wing: mat('#6B7186', { shade: '#555A6E', light: '#8E95A6', dark: '#3A3E50' }),
  bar: flat('#3A3F48'),
  neckA: flat('#4FA37A'),
  neckB: flat('#8A5FB0'),
  beak: flat('#E9C9A0'),
  cere: flat('#F4F1E8'),
  eye: flat('#F2E24B'),
  pupil: flat('#2A2440'),
  glasses: flat('#2A2440'),
  lens: flat('#DCE8F0'),
  foot: mat('#E07A6A', { shade: '#B85A4A', light: '#F09A8A' }),
  tie: mat('#2F4A8A', { shade: '#24386A', light: '#4766A8', dark: '#1A2850' }),
  stripe: flat('#E84E3C'),
  badge: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFF6D8' }),
  photo: flat('#4AA8E0'),
  lanyard: flat('#4AA8E0'),
  watch: flat('#D9A441'),
};

/** A 2px tie with diagonal red stripes, rows y0..y1 at columns x, x+1. */
function hatoTie(f: Fig, x: number, y0: number, y1: number, tipDx = 0) {
  f.part('tie', { shade: 'r', light: 'l' });
  f.rect(x, y0, 2, 1); // knot
  for (let y = y0 + 1; y < y1; y++) f.px(x, y).px(x + 1, y);
  f.px(x + (tipDx > 0 ? 1 : 0), y1);
  f.part('stripe', { flat: true, rim: false });
  for (let y = y0 + 2; y < y1; y += 3) f.px(x + 1, y).px(x, y + 1);
}

function hatoFrontK(f: Fig, p: Pose) {
  const st = p.mode === 'walk' || p.mode === 'run' ? p.step % 4 : 0;
  const back = p.view === 'up';
  const bow = p.act === 'peck' ? p.ph : 0; // 0 upright, 1 bowed
  const puff = p.act === 'meeting' ? 1 : 0;
  const hb = st % 2 ? 1 : 0; // head bob while strutting
  const lu = p.lookUp ? -1 : 0;
  // feet (step lifts one)
  f.part('foot', { shade: 'r', light: '' });
  f.rows(4, 16 - (st === 1 ? 1 : 0), ['.##', '###']);
  f.rows(9, 16 - (st === 3 ? 1 : 0), ['##.', '###']);
  // body: barrel chest; bowing foreshortens the top of it
  const top = 6 + bow * 2 + p.breath * 0;
  f.part(back ? 'body' : 'breast', { shade: 'rb', light: 't' });
  const chest = ['...########...', '..##########..', '.############.', '##############', '##############', '##############', '.############.', '..##########..', '...########...'];
  chest.forEach((r, j) => {
    const y = top + j - (j < 3 ? 0 : bow ? Math.min(2, j - 2) * 0 : 0);
    if (y > 15) return;
    f.rows(1 - puff * (j >= 2 && j <= 6 ? 1 : 0), y, [puff && j >= 2 && j <= 6 ? '#' + r + '#' : r]);
  });
  // folded wings on the flanks (with the two dark bars)
  f.part('wing', { shade: 'rb', light: 't' });
  f.rows(0, top + 3, ['##', '##', '##', '.#']);
  f.rows(14, top + 3, ['##', '##', '##', '#.']);
  f.part('bar', { flat: true, rim: false });
  f.px(1, top + 4).px(14, top + 4);
  if (back) {
    // back: grey wings over the back, the tail, the lanyard strap round the
    // neck and the tie flung over the left shoulder, hanging down the back
    f.part('wing', { shade: 'rb', light: 't' });
    f.rows(3, top + 1, ['.###....###.', '#####..#####', '#####..#####', '.####..####.', '..##....##..']);
    f.part('bar', { flat: true, rim: false });
    f.px(4, top + 3).px(5, top + 3).px(10, top + 3).px(11, top + 3);
    f.part('wing', { shade: 'rb', light: '' });
    f.rows(6, top + 7, ['####', '.##.']);
    hatoTie(f, 3, top - 1, top + 5, 1);
  } else {
    // tie: hangs against the chest upright; on the bow it swings free and
    // dangles below the belly
    hatoTie(f, 7, top - 1, bow ? 16 : top + 7);
    // staff ID on a blue lanyard, clipped on the right of the chest
    f.part('lanyard', { flat: true, rim: false });
    f.px(10, top).px(11, top + 1);
    f.part('badge', { shade: 'b', light: '' });
    f.rect(11, top + 2, 2, 3);
    f.part('photo', { flat: true, rim: false });
    f.px(11, top + 3);
  }
  // iridescent neck (alternates for the sheen)
  const alt = p.tick % 2 === 1 || st % 2 === 1;
  f.part(alt ? 'neckB' : 'neckA', { flat: true, rim: false });
  f.hl(5, 6, top - 1).hl(9, 10, top - 1);
  // head: small, on top; bowing drops it onto the chest (we see its crown)
  const hy = (bow ? 4 : 0) + hb + lu;
  f.part('head', { shade: 'rb', light: 't' });
  f.rows(5, hy, ['.####.', '######', '######', '######', '.####.']);
  if (!back) {
    // office glasses: a dark frame bar across the eyes, sticking out a pixel
    f.part('glasses', { flat: true, rim: false });
    f.hl(4, 11, 2 + hy);
    f.part(p.blink ? 'glasses' : 'eye', { flat: true, rim: false });
    f.px(5, 2 + hy).px(10, 2 + hy);
    f.part('lens', { flat: true, rim: false, ol: false });
    if (!bow) f.px(6, 2 + hy).px(9, 2 + hy);
    if (!bow) {
      f.part('cere', { flat: true, rim: false });
      f.px(7, 3 + hy).px(8, 3 + hy);
      f.part('beak', { flat: true, rim: false });
      f.px(7, 4 + hy + lu * 0).px(8, 4 + hy);
    }
  } else {
    // the glasses' temples from behind
    f.part('glasses', { flat: true, rim: false });
    f.px(4, 2 + hy).px(11, 2 + hy);
  }
}

function hatoSideK(f: Fig, p: Pose) {
  const st = p.mode === 'walk' || p.mode === 'run' ? p.step % 4 : 0;
  const bow = p.act === 'peck' ? p.ph : 0;
  const puff = p.act === 'meeting' ? 1 : 0;
  const lean = p.run ? 1 : 0;
  const lu = p.lookUp ? -1 : 0;
  // feet
  f.part('foot', { shade: 'r', light: '' });
  const fa = st === 1 ? -1 : st === 3 ? 1 : 0;
  f.rows(6 + fa, 16, ['.#', '##']);
  f.rows(9 - fa, 16, ['.#', '##']);
  if (!bow) {
    // tail (behind), upright barrel body, chest bulging forward (left)
    f.part('wing', { shade: 'rb', light: '' });
    f.rows(11, 10, ['.##', '###', '.###', '..##']);
    f.part('breast', { shade: 'rb', light: 't' });
    f.rows(1 - puff - lean, 6, ['..#######..', '.#########.', '###########', '###########', '###########', '.##########', '..#########', '...######..', '....####...']);
    f.part('wing', { shade: 'rb', light: 't' });
    f.rows(6, 7, ['#####', '######', '######', '.#####', '..###']);
    f.part('bar', { flat: true, rim: false });
    f.px(8, 9).px(9, 9).px(9, 11).px(10, 11);
    // tie down the chest front; its tip swings clear of the belly
    hatoTie(f, 2 - puff - lean, 6, 14, 0);
    // ID card at the flank
    f.part('lanyard', { flat: true, rim: false });
    f.px(5, 6).px(5, 7);
    f.part('badge', { shade: 'b', light: '' });
    f.rect(5, 8, 2, 3);
    f.part('photo', { flat: true, rim: false });
    f.px(5, 9);
    const alt = p.tick % 2 === 1 || st % 2 === 1;
    f.part(alt ? 'neckB' : 'neckA', { flat: true, rim: false });
    f.hl(4, 6, 5);
    // head on top, glasses on
    const hx = (st === 1 ? -1 : st === 3 ? 1 : 0) - lean - (p.act === 'meeting' ? p.ph % 2 : 0);
    const hy = lu + lean;
    f.part('head', { shade: 'rb', light: 't' });
    f.rows(3 + hx, hy, ['.####.', '######', '######', '######', '.####.']);
    f.part('beak', { flat: true, rim: false });
    f.px(2 + hx, 3 + hy + lu).px(1 + hx, 3 + hy + lu);
    f.part('cere', { flat: true, rim: false });
    f.px(3 + hx, 2 + hy);
    f.part('glasses', { flat: true, rim: false });
    f.hl(4 + hx, 8 + hx, 1 + hy).px(4 + hx, 2 + hy).px(6 + hx, 2 + hy);
    f.part(p.blink ? 'glasses' : 'eye', { flat: true, rim: false });
    f.px(5 + hx, 2 + hy);
    if (p.act === 'watch') {
      // wing raised to read the wristwatch
      f.part('wing', { shade: 'rb', light: 't' });
      f.rows(3, 6, ['.####', '####.', '##...']);
      f.part('watch', { flat: true, rim: false });
      f.px(4, 6);
    }
  } else {
    // stiff bow from the hips (~40°): the chest tips forward over the feet,
    // the tail rises behind, the head reaches forward and down, and the tie
    // drops straight from the collar, dangling free
    f.part('wing', { shade: 'rb', light: '' });
    f.rows(10, 5, ['..##', '.###', '####', '###.']);
    f.part('breast', { shade: 'rb', light: 't' });
    f.poly([[3.5, 7.5], [7, 6], [11, 7.5], [12.5, 10.5], [11.5, 13.5], [8, 15], [5, 14], [3, 11]]);
    f.part('wing', { shade: 'rb', light: 't' });
    f.poly([[6.5, 7], [10.5, 7.5], [12, 10.5], [10.5, 12.5], [7.5, 11]]);
    f.part('bar', { flat: true, rim: false });
    f.px(9, 9).px(10, 9).px(10, 11).px(11, 11);
    // ID card swinging on its lanyard under the chest
    f.part('lanyard', { flat: true, rim: false });
    f.px(6, 11).px(6, 12);
    f.part('badge', { shade: 'b', light: '' });
    f.rect(6, 13, 2, 2);
    hatoTie(f, 3, 10, 16, 0);
    const alt = p.tick % 2 === 1;
    f.part(alt ? 'neckB' : 'neckA', { flat: true, rim: false });
    f.px(5, 7).px(5, 8).px(6, 8);
    f.part('head', { shade: 'rb', light: 't' });
    f.rows(0, 5, ['.####.', '######', '######', '.####.']);
    f.part('beak', { flat: true, rim: false });
    f.px(0, 9).px(1, 9);
    f.part('cere', { flat: true, rim: false });
    f.px(1, 8);
    f.part('glasses', { flat: true, rim: false });
    f.hl(1, 5, 6).px(1, 7).px(3, 7);
    f.part(p.blink ? 'glasses' : 'eye', { flat: true, rim: false });
    f.px(2, 7);
  }
}

// idle: stiff bows at the desk, a blink, a glance at the watch in between
const HATO_IDLE: IdleKey[] = [
  {}, {}, { act: 'peck', ph: 1 }, { act: 'peck', ph: 1 }, {}, {}, { blink: true }, {},
  {}, { act: 'peck', ph: 1 }, { act: 'peck', ph: 1 }, {}, { breath: 1 }, { breath: 1 }, {}, {},
];

registerChar('enemy_hato_kakaricho', () =>
  buildSprite({
    id: 'enemy_hato_kakaricho',
    h: 18,
    mats: HATO,
    draw: (f, p) => (p.view === 'left' ? hatoSideK(f, p) : hatoFrontK(f, p)),
    walkFrameMs: 120,
    walkBob: [0, 0, 0, 0],
    run: true,
    runFrameMs: 80,
    runBob: [0, -1, 0, -1],
    idle: HATO_IDLE,
    idleFrameMs: 300,
    extras: {
      peck: { dirs: 'all', p: { ph: 1 } },
      meeting: { dirs: ['left', 'right'] },
      watch: { dirs: ['left', 'right'] },
    },
    anims: {
      peck: { frames: [{ ph: 0 }, { ph: 1 }], ms: 300, dir: 'left', dirs: 'all' },
      meeting: { frames: [{ ph: 0 }, { ph: 1 }], ms: 100, dir: 'left', dirs: ['left', 'right'] },
    },
    // the field holds 'peck' while it waits: a loop of stiff bows
    poses: { peck: rep([{}, {}, { act: 'peck', ph: 1 }, { act: 'peck', ph: 1 }, { act: 'peck', ph: 1 }, {}, {}, { blink: true }, {}, {}], 1) },
    shadow: 12,
  }),
);

// =============================================================================
// セミファイナル: a giant アブラゼミ lying on its back, seen from the side, head
// to the west: pale ribbed belly up, the long veined wings flat on the ground
// sticking out past the tail, six thin legs in the air (they twitch). The
// classic "dead bug" silhouette reads at 1x. Walk = the hop (legs flailing,
// wings buzzing open).

const SEMI: Mats = {
  belly: mat('#C9A36A', { shade: '#A8834A', light: '#E8C88A', dark: '#7A5A32', rim: '#FFC880' }),
  seg: flat('#9A7442'),
  thorax: mat('#5A3A22', { shade: '#3E2616', light: '#7A5A3A', dark: '#2A1A12', rim: '#C07A48' }),
  head: mat('#4A3020', { shade: '#34200F', light: '#6A4A30', dark: '#22140A', rim: '#B87040' }),
  eye: mat('#2A1A12', { shade: '#1A100A', light: '#5A4A3A' }),
  glint: flat('#F4F1E8'),
  wing: mat('#7A5A3A', { shade: '#5E4228', light: '#9A7A52', dark: '#3A2616', rim: '#D89A60' }),
  wingHi: flat('#B4966A'),
  vein: flat('#3A2616'),
  leg: flat('#2A1A12'),
  legFar: flat('#5A4030'),
  claw: flat('#7A5A3A'),
};

function semi(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const hopping = walking || p.act === 'hop';
  // the walk cycle carries its own jump arc; the 'hop' pose does not (the
  // field lifts the actor itself while it hops)
  // the 'hop' pose lifts 2px inside the frame too (legs splayed, wings
  // flared) so it reads even before the field lifts the actor
  const air = walking ? [0, 3, 5, 2][st] : p.act === 'hop' ? 2 : 0;
  const tw = p.act === 'twitch' ? p.ph : 0;
  const buzz = hopping && (st === 1 || st === 2 || p.act === 'hop');
  const y = 1 - air; // everything shifts up while airborne
  // wings: flat on the ground under the body, poking out past the tail; when
  // buzzing (mid-hop) they flare open into a V
  f.part('wing', { shade: 'rb', light: 't' });
  if (buzz) {
    f.rows(7, 12 + y, ['..........#######', '......###########.', '...#############..', '..############....']);
    f.rows(7, 15 + y, ['...##########.....', '......########....']);
  } else {
    f.rows(5, 13 + y, ['.......##############.', '....#################.', '..##################..', '.....############.....']);
  }
  f.part('vein', { flat: true, rim: false });
  if (buzz) f.px(12, 13 + y).px(15, 13 + y).px(18, 13 + y).px(21, 12 + y).px(14, 16 + y).px(17, 16 + y);
  else f.px(13, 14 + y).px(16, 14 + y).px(19, 14 + y).px(22, 14 + y).px(21, 13 + y).px(12, 15 + y).px(17, 15 + y);
  f.part('wingHi', { flat: true, rim: false, ol: false });
  if (!buzz) f.hl(14, 17, 13 + y);
  // body: ribbed pale abdomen (right), dark thorax + head (left)
  f.part('belly', { shade: 'rb', light: 't' });
  f.rows(8, 9 + y, ['..#######...', '###########.', '############', '############', '############', '###########.', '.########...']);
  f.part('seg', { flat: true, rim: false });
  for (const sx of [11, 13, 15, 17]) f.vl(sx, 10 + y, 14 + y - (sx === 17 ? 1 : 0));
  f.part('thorax', { shade: 'rb', light: 't' });
  f.rows(3, 10 + y, ['.######', '#######', '#######', '#######', '.#####.']);
  f.part('head', { shade: 'rb', light: 't' });
  f.rows(1, 11 + y, ['.###', '####', '####', '.##.']);
  // big compound eye with a catch-light
  f.part('eye', { shade: 'r', light: '' });
  f.rect(1, 11 + y, 2, 2);
  f.part('glint', { flat: true, rim: false });
  f.px(1, 11 + y);
  // six legs in the air: far legs first (lighter), near legs on top
  const flail = hopping ? (walking ? st : p.ph + 1) % 2 : 0;
  const splay = p.act === 'hop' ? (p.ph === 0 ? 2 : 1) : 0;
  const k = (i: number) => (splay ? (i - 1) * splay : flail ? (i % 2 ? 1 : -1) : 0);
  const kick = (i: number) => (tw === 1 && i === 1 ? -2 : tw === 2 && i === 1 ? -1 : tw === 1 && i === 2 ? 1 : 0);
  const far: [number, number, number, number, number, number][] = [
    [5, 10, 5, 7, 4, 6],
    [7, 10, 8, 7, 7, 5],
    [9, 10, 11, 7, 12, 6],
  ];
  far.forEach(([x0, y0, x1, y1, x2, y2], i) => {
    f.part('legFar', { flat: true, rim: false, ol: false });
    f.line(x0 + 1, y0 + y, x1 + 1 + k(i + 1), y1 + y);
    f.line(x1 + 1 + k(i + 1), y1 + y, x2 + 1 + k(i + 1), y2 + y);
  });
  const near: [number, number, number, number, number, number][] = [
    [4, 10, 3, 7, 2, 5],
    [6, 10, 6, 6, 5, 4],
    [8, 10, 9, 6, 10, 4],
  ];
  near.forEach(([x0, y0, x1, y1, x2, y2], i) => {
    const dx = k(i) + kick(i);
    const dy = tw && i === 1 ? -tw + 1 : splay === 2 ? -1 : 0;
    f.part('leg', { flat: true, rim: false, ol: false });
    f.line(x0, y0 + y, x1 + dx, y1 + y + dy);
    f.line(x1 + dx, y1 + y + dy, x2 + dx, y2 + y + dy);
    f.part('claw', { flat: true, rim: false, ol: false });
    f.px(x2 + dx, y2 + y + dy);
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
    idle: [{}, {}, {}, {}, { act: 'twitch', ph: 1 }, { act: 'twitch', ph: 2 }, {}, {}, {}, {}, {}, {}, { act: 'twitch', ph: 1 }, {}, {}, {}],
    idleFrameMs: 120,
    extras: { twitch: { dirs: ['down'], p: { ph: 1 } }, hop: { dirs: ['down'] }, dead: { dirs: ['down'] } },
    anims: {
      // the legs kick once (world plays this now and then while it lies still)
      twitch: { frames: [{ ph: 1 }, { ph: 2 }, { ph: 1 }, { ph: 0 }], ms: [70, 70, 90, 120], loop: false },
      hop: { frames: [{ ph: 0 }, { ph: 1 }], ms: 60 },
    },
    // lying still, playing dead: only a rare, tiny leg tremor
    poses: { dead: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { act: 'twitch', ph: 2 }, {}] },
    views: { up: 'down', left: 'down', right: 'down' },
    shadow: 18,
  }),
);

// =============================================================================
// コーン・ボーカル: an orange cone with reflective-band slit eyes and a yellow
// beacon on its head (the light spot cycles in 3 frames). Hops along; sings.

const CONE: Mats = {
  cone: mat('#F07A2A', { shade: '#C85A1A', light: '#FFA25A', dark: '#8A3A10', rim: '#FFD0A0', orim: '#F7C27A' }),
  band: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9E978C' }),
  base: mat('#3A3A44', { shade: '#26262E', light: '#5A5A66', dark: '#16161C' }),
  mud: flat('#8A5A3A'),
  tape: flat('#3A3F48'),
  eye: flat('#2A2440'),
  reflect: flat('#5CE1FF'),
  hole: flat('#2A2440'),
  lamp: mat('#FFD23F', { shade: '#D9A441', light: '#FFF6D8', dark: '#A8742A' }),
  lampHi: flat('#FFF6D8'),
  sing: flat('#B8241E'),
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
  // the hole at the tip, and a singing mouth that opens in the lower
  // reflective band (3 shapes: O, wide, closing)
  const shTop = Math.round((sway * 14) / 14) + (sing ? 1 : 0);
  f.part('hole', { flat: true, rim: false });
  f.hl(7 + shTop, 8 + shTop, 5 + y);
  if (sing && !back) {
    const shM = Math.round((sway * 5) / 14);
    const mx = (side ? 5 : 7) + shM;
    const m = p.tick % 3;
    f.part('eye', { flat: true, rim: false });
    if (m === 0) f.rect(mx, 14 + y, 2, 2);
    else if (m === 1) f.hl(mx - 1, mx + 2, 14 + y).hl(mx, mx + 1, 15 + y).px(mx - 1, 15 + y).px(mx + 2, 15 + y);
    else f.hl(mx, mx + 1, 14 + y).px(mx, 15 + y).px(mx + 1, 15 + y);
    f.part('sing', { flat: true, rim: false });
    if (m === 1) f.hl(mx, mx + 1, 15 + y);
    else if (m === 0) f.px(mx + 1, 15 + y);
  }
  // beacon: dome with a rotating light spot
  f.part('lamp', { shade: 'rb', light: '' });
  f.rows(5 + shTop, 1 + y + (p.lookUp ? -1 : 0), ['.####.', '######', '######']);
  // rotating light: 3 frames, the lit side sweeps left → toward us → right
  const spot = (p.tick + st) % 3;
  const lu = p.lookUp ? -1 : 0;
  f.part('lampHi', { flat: true, rim: false, ol: false });
  f.rect(5 + shTop + spot * 2, 2 + y + lu, 2, 1);
  if (spot === 1) f.px(7 + shTop, 1 + y + lu).px(8 + shTop, 1 + y + lu);
  f.after((pc) => {
    // the beam (drawn after lighting, no outline): a fading wedge to the
    // side it points at, or a flare when it faces the camera
    const cx = 8 + shTop;
    const cy = 2 + y + lu;
    const put = (x: number, yy: number, a: string) => {
      if (x >= 0 && yy >= 0 && x < pc.w && yy < pc.h && pc.alpha(x, yy) === 0) pc.set(x, yy, '#FFE7A3' + a);
    };
    if (spot === 1) {
      put(cx - 4, cy, '88');
      put(cx + 3, cy, '88');
      put(cx - 1, cy - 2, 'AA');
      put(cx, cy - 2, 'AA');
      put(cx - 3, cy - 1, '55');
      put(cx + 2, cy - 1, '55');
    } else {
      const d = spot === 0 ? -1 : 1;
      const x0 = spot === 0 ? cx - 4 : cx + 3;
      for (let i = 0; i < 5; i++) {
        const a = ['CC', 'AA', '88', '66', '44'][i];
        put(x0 + d * i, cy, a);
        if (i >= 1) put(x0 + d * i, cy - 1, a);
        if (i >= 3) put(x0 + d * i, cy + 1, a);
      }
    }
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
// ワスレガサ: a forgotten clear-vinyl umbrella hopping on its J handle,
// looking for its owner. The canopy is half open: five opaque 1px ribs end
// in little tips under a 50% vinyl membrane (the ground shows through), and
// one rib is snapped and sticks out sideways past the canopy. Below the
// canopy the bare shaft carries the owner's name sticker — a white label
// with a "?" — and ends in a brown wooden J hook it bounces on.
// 'open' = fully open dome (晴れてるのにひらく), 'hug' = canopy folded shut
// around its target (持ち主さがし). 16×30 (28px figure + 2px of hop room).

const KASA: Mats = {
  film: mat('#CFE3EA70', { shade: '#9AB8C480', light: '#EAF6FA80', dark: '#6E98A8A0', spec: '#FFFFFFCC', ol: '#4A6A7A', norim: true }),
  filmD: flat('#8FB0C090'),
  hem: flat('#DDEEF4C0'),
  hi: flat('#FFFFFFCC'),
  rib: mat('#9AA3AD', { shade: '#6B7186', light: '#C0C6CC', dark: '#4A4F63' }),
  ribT: flat('#4A4F63'),
  shaft: mat('#C0C6CC', { shade: '#9AA0A8', light: '#E8ECF0', dark: '#6B7186' }),
  shaftIn: flat('#6B718699'),
  tip: mat('#6B7186', { shade: '#4A4F63', light: '#9AA0A8' }),
  handle: mat('#8A5A3A', { shade: '#5A3A2A', light: '#AE7A52', dark: '#3A2618', spec: '#C8A06A' }),
  sticker: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFF6D8' }),
  q: flat('#2A2440'),
};

/** Canopy half-width per row below the crown: half-open dome / fully open / folded. */
const KASA_DOME = [2, 3, 4, 5, 5, 6, 6, 6, 6];
const KASA_OPEN = [2, 4, 6, 7, 8, 8];
const KASA_HUG = [1, 1, 2, 2, 2, 2, 2, 2, 1];

function kasa(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const view = p.view;
  // squash & stretch: the walk carries its own small arc; the 'hop' anim is
  // squash/stretch in place (the field lifts the actor itself)
  const hopA = p.act === 'hop';
  const air = walking ? [0, 1, 2, 1][st] : 0;
  const squash = (walking && st === 0) || (hopA && p.ph === 0) ? 1 : 0;
  const stretch = (walking && st === 2) || (hopA && p.ph === 1) ? 1 : 0;
  const open = p.act === 'open';
  const hug = p.act === 'hug';
  // idle: the canopy rocks while it listens for its owner
  const rock = p.mode === 'idle' ? [0, 0, 1, 1, 0, 0, -1, -1][p.tick % 8] : walking ? [0, -1, 0, 1][st] : 0;
  const Y = 29 - air; // bottom of the hook (ground contact)
  const C0 = 9; // centre column (canvas 18 wide)
  // from behind the snapped rib is on the left and the sticker is hidden;
  // the hook opens toward the facing (front view: to the right)
  const back = view === 'up';
  const hookDir = view === 'left' || back ? -1 : 1;
  const bs = back ? -1 : 1; // side of the snapped rib

  // ---- J handle (brown wood) it bounces on
  f.part('handle', { shade: 'rb', light: 'tl' });
  const hx = C0 - 1;
  f.rect(hx, Y - 7, 2, 4);
  const hook = hookDir > 0 ? ['##..#.', '##..##', '###.##', '.####.'] : ['.#..##', '##..##', '##.###', '.####.'];
  f.rows(hookDir > 0 ? hx : hx - 4, Y - 3, hook);
  // ---- canopy geometry
  const prof = open ? KASA_OPEN : hug ? KASA_HUG : KASA_DOME;
  const n = prof.length; // rows from the crown to the hem (inclusive)
  const crown = Y - 25 + squash - stretch + (open ? 3 : 0) + (p.lookUp ? -1 : 0);
  const hemY = crown + n;
  const sh = (j: number) => Math.round((rock * (n - j)) / n); // rocking shear
  const hw = (j: number) => (j <= 0 ? 1 : prof[Math.min(n - 1, j - 1)] + (squash && j > n - 3 ? 1 : 0));
  const ribX = (fr: number, j: number) => C0 + sh(j) + Math.round(fr * hw(j));
  const snapJ = open ? 3 : 6; // the snapped rib's break (row below the crown)
  // ---- bare shaft between canopy and handle, with the name sticker
  f.part('shaft', { shade: 'r', light: '' });
  f.vl(C0, hemY + 1, Y - 8);
  if (!back) {
    f.part('sticker', { shade: 'rb', light: '' });
    f.rect(C0 - 1, Y - 12, 3, 5);
    f.part('q', { flat: true, rim: false });
    f.rows(C0 - 1, Y - 12, ['##.', '..#', '.#.', '...', '.#.']);
  }
  // ---- vinyl membrane (translucent, no outline of its own: ribs carry it)
  f.part('film', { flat: true, rim: false, ol: false });
  for (let j = 1; j <= n; j++) {
    const c = C0 + sh(j);
    const w = hw(j);
    for (let x = c - w; x <= c + w; x++) {
      const rel = (x - c) / w;
      // the limp panel beside the snapped rib sags instead of spanning
      if (!hug && rel * bs > 0.5 && j > snapJ) continue;
      f.t(rel < -0.35 ? 1 : rel > 0.4 ? -1 : 0).px(x, crown + j);
    }
  }
  if (!hug) {
    // limp panel: hangs straight down from the break, a row past the hem
    f.part('filmD', { flat: true, rim: false, ol: false });
    for (let j = snapJ + 1; j <= n + 2; j++) {
      const c = C0 + sh(Math.min(j, n));
      const inner = Math.round(0.5 * hw(Math.min(j, n))) + 1;
      const outer = Math.min(hw(snapJ) + (j > n ? -1 : 0), hw(Math.min(j, n)));
      for (let k = inner; k <= outer; k++) f.px(c + bs * k, crown + j);
    }
    // thicker vinyl hem between the rib tips
    f.part('hem', { flat: true, rim: false, ol: false });
    for (let x = C0 - hw(n) + sh(n); x <= C0 + hw(n) + sh(n); x++) {
      const rel = (x - C0 - sh(n)) / hw(n);
      if (rel * bs > 0.5) continue;
      f.px(x, crown + n);
    }
  }
  // the shaft seen through the vinyl
  f.part('shaftIn', { flat: true, rim: false, ol: false });
  for (let j = 2; j < n; j++) f.px(C0 + sh(j), crown + j);
  // ---- ribs: opaque 1px lines from the crown out to the hem
  const ribs = hug ? [-1, 1] : [-1, -0.5, 0.5, 1];
  for (const fr of ribs) {
    const snapped = !hug && fr === bs;
    f.part('rib', { shade: '', light: '', rim: fr * bs < 0 || (fr === -1 && !back) });
    for (let j = fr === -1 || fr === 1 ? 1 : 3; j <= n; j++) {
      if (snapped && j > snapJ) break;
      f.t(fr < 0 ? 1 : 0).px(ribX(fr, j), crown + j);
    }
    if (snapped) {
      // the outer half kinks outward and sticks out past the canopy
      const x0 = ribX(fr, snapJ);
      const y0 = crown + snapJ;
      f.t(-1).px(x0 + bs, y0).px(x0 + 2 * bs, y0 + 1).px(x0 + 3 * bs, y0 + 1);
      f.part('ribT', { flat: true, rim: false });
      f.px(x0 + 4 * bs, y0 + 2);
    } else if (!hug) {
      f.part('ribT', { flat: true, rim: false });
      f.px(ribX(fr, n), crown + n + 1);
    }
  }
  if (!hug) {
    f.part('ribT', { flat: true, rim: false });
    f.px(C0 + sh(n), crown + n + 1);
  }
  f.t(null);
  // vinyl glints (the only near-white pixels allowed: 7.2)
  f.part('hi', { flat: true, rim: false, ol: false });
  const g = (fr: number, j: number) => f.px(C0 + sh(j) + Math.round(fr * hw(j)), crown + j);
  if (hug) g(-0.5, 3), g(-0.5, 4);
  else g(-0.75, 3), g(-0.75, 4), g(-0.75, 6), g(-0.25, 2);
  // crown cap + ferrule tip
  f.part('tip', { shade: 'r', light: 't' });
  f.hl(C0 - 1 + sh(0), C0 + 1 + sh(0), crown);
  f.vl(C0 + sh(0), crown - 2, crown - 1);
}

registerChar('enemy_wasuregasa', () =>
  buildSprite({
    id: 'enemy_wasuregasa',
    w: 18,
    h: 30,
    mats: KASA,
    draw: kasa,
    walkFrameMs: 130,
    walkBob: [0, 0, 0, 0],
    idle: rep([{}, {}, {}, {}, {}, {}, {}, {}], 1),
    idleFrameMs: 200,
    extras: { open: { dirs: ['down'] }, hug: { dirs: ['down'] }, hop: { dirs: 'all', p: { ph: 1 } } },
    anims: { hop: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 0 }], ms: [60, 90, 120, 60], loop: false, dirs: 'all' } },
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
  ledOff: flat('#24402E'),
  ledDead: flat('#22302A'),
  ledRim: flat('#6A1A22'),
  glass: flat('#3A2B3A'),
  glassOff: flat('#2E2432'),
  canOff: mat('#B8463C', { shade: '#8E2E2A', light: '#D8786A' }),
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

// 3×5 LED digits (the "1" is 2 wide)
const LED_GLYPH: Record<string, string[]> = {
  '1': ['.#', '##', '.#', '.#', '.#'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  ':': ['.', '#', '.', '#', '.'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '8': ['###', '#.#', '###', '#.#', '###'],
};

/** "17:00" across the LED strip; unlit segments ghost faintly (8.8:88). */
function ledText(f: Fig, x: number, y: number, on: boolean, flicker: boolean) {
  let cx = x;
  for (const ch of '17:00') {
    const g = LED_GLYPH[ch];
    const ghost = LED_GLYPH[ch === ':' ? ':' : '8'];
    const w = g[0].length;
    f.part('ledOff', { flat: true, rim: false });
    if (ch !== '1') f.rows(cx, y, ghost);
    f.part(on && !(flicker && ch === '0') ? 'ledOn' : 'ledOff', { flat: true, rim: false });
    f.rows(cx, y, g);
    cx += w + 1;
  }
}

export interface VendOpts {
  ledOn: boolean;
  flicker: boolean;
  flap: number;
  hum: number;
  /** Switched off for good (restored): dark LED, unlit buttons, dim window. */
  off?: boolean;
}

/** Upright front of the machine inside [x0..x0+21] from y0 (38 rows). */
export function vendFront(f: Fig, x0: number, y0: number, o: VendOpts) {
  const x = x0 + o.hum;
  // left side panel (lit)
  f.part('side', { shade: '', light: '' });
  f.rect(x, y0 + 1, 3, 37);
  f.part('side', { flat: true });
  f.t(1).vl(x, y0 + 1, y0 + 37).t(null);
  // front
  f.part('body', { shade: 'r', light: 't' });
  f.rect(x + 3, y0, 19, 38);
  // LED strip across the top: "17:00", stuck at the moment the chime stopped
  f.part('led', { flat: true, rim: false });
  f.rect(x + 3, y0 + 1, 19, 7);
  if (!o.off) ledText(f, x + 5, y0 + 2, o.ledOn, o.flicker);
  else {
    f.part('ledDead', { flat: true, rim: false });
    f.hl(x + 5, x + 19, y0 + 4);
  }
  f.part('ledRim', { flat: true, rim: false });
  f.hl(x + 3, x + 21, y0 + 7);
  // display window with two rows of (all hot) cans
  f.part(o.off ? 'glassOff' : 'glass', { flat: true, rim: false });
  f.rect(x + 4, y0 + 9, 17, 10);
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 5; c++) {
      const cx = x + 5 + c * 3;
      const cy = y0 + 10 + r * 5;
      f.part(o.off ? 'canOff' : 'can', { shade: 'r', light: 'l' });
      f.rect(cx, cy, 2, 3);
      f.part('canW', { flat: true, rim: false });
      f.hl(cx, cx + 1, cy + 1);
    }
  // the one sunburnt "cold" sticker, crossed out
  f.part('cold', { flat: true, rim: false });
  f.rect(x + 17, y0 + 15, 2, 3);
  f.part('x', { flat: true, rim: false });
  f.px(x + 17, y0 + 15).px(x + 18, y0 + 16).px(x + 17, y0 + 17);
  // "hot" red strips under each row
  f.part(o.off ? 'canOff' : 'logo', { flat: true, rim: false });
  f.hl(x + 5, x + 19, y0 + 13).hl(x + 5, x + 19, y0 + 18);
  // glass reflection band
  f.part('glassHi', { flat: true, rim: false, ol: false });
  f.px(x + 6, y0 + 18).px(x + 7, y0 + 17).px(x + 9, y0 + 15).px(x + 10, y0 + 14).px(x + 12, y0 + 12).px(x + 13, y0 + 11).px(x + 15, y0 + 9);
  // buttons (lamps all lit)
  for (let c = 0; c < 5; c++) {
    f.part('btn', { flat: true, rim: false });
    f.px(x + 5 + c * 3, y0 + 20);
    f.part(o.off ? 'slot' : 'lamp', { flat: true, rim: false });
    f.px(x + 6 + c * 3, y0 + 20);
  }
  // coin slot, bill slot, return lever
  f.part('slot', { shade: 'r', light: 't' });
  f.rect(x + 16, y0 + 22, 3, 4);
  f.rect(x + 5, y0 + 23, 6, 2);
  f.part('btn', { flat: true, rim: false });
  f.px(x + 17, y0 + 23);
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

/** Machine origin inside the 48×40 symbol canvas (room for the fold and the cord). */
const VX = 13;
const VY = 2;
/** Waist hinge: rows above it (header, LED, window) fold toward the camera. */
const HINGE = VY + 19;

/**
 * The sunburnt power cord: out of the right side low down, to the ground,
 * then dragged 8–10px across it to the plug. `tug` (bow phase) pulls the
 * ground run into a wiggle.
 */
function vendCord(f: Fig, tug: number) {
  const x = VX + 22;
  f.part('cord', { shade: '', light: '' });
  f.t(0).px(x, VY + 27).px(x + 1, VY + 28);
  for (let y = VY + 29; y <= 37; y++) f.t(y % 3 === 0 ? -1 : 0).px(x + 1, y);
  // along the ground (rows 38–39): a lazy S that tightens while it bows
  const wig = [[0, 0, 1, 1, 1, 0, 0, 0, 1], [0, 1, 1, 0, 0, 0, 1, 1, 1], [0, 1, 0, 0, 1, 1, 1, 0, 1], [1, 1, 0, 0, 0, 1, 1, 1, 1]][tug & 3];
  for (let i = 0; i < wig.length; i++) f.t(i % 3 === 1 ? -1 : 0).px(x + 2 + i, 38 + wig[i]);
  f.part('plug', { shade: 'r', light: 't' });
  f.rect(x + 2 + wig.length, 38, 2, 2);
  f.t(null);
}

/** Front face of the upper half squashed to `h` rows (the LED always keeps its full 5px digits). */
function vendUpperFace(f: Fig, yTop: number, h: number, grow: number, o: VendOpts) {
  const x = VX + o.hum;
  const ext = (y: number) => Math.round(grow * (1 - (y - yTop) / h));
  for (let y = yTop; y < yTop + h; y++) {
    const e = ext(y);
    f.part('side', { shade: '', light: '' });
    f.t(0).hl(x - e, x + 2 - e, y).t(1).px(x - e, y);
    f.part('body', { flat: true });
    f.t(0).hl(x + 3 - e, x + 21 + e, y).t(-1).px(x + 21 + e, y);
  }
  f.t(null);
  // LED strip, full size: the one thing it wants you to read
  const e0 = ext(yTop + 3);
  f.part('led', { flat: true, rim: false });
  f.rect(x + 3 - e0, yTop + 1, 19 + e0 * 2, 7);
  ledText(f, x + 5, yTop + 2, o.ledOn, o.flicker);
  f.part('ledRim', { flat: true, rim: false });
  f.hl(x + 3 - e0, x + 21 + e0, yTop + 7);
  // the window of hot cans, squashed into what is left
  const wh = h - 10;
  if (wh >= 1) {
    const wy = yTop + 9;
    f.part('glass', { flat: true, rim: false });
    f.rect(x + 4, wy, 17, wh);
    for (let c = 0; c < 5; c++) {
      const cx = x + 5 + c * 3;
      f.part('can', { shade: 'r', light: 'l' });
      if (wh >= 5) {
        f.rect(cx, wy + 1, 2, Math.max(1, Math.round(wh * 0.3)));
        f.rect(cx, wy + Math.round(wh * 0.58), 2, Math.max(1, Math.round(wh * 0.3)));
      } else f.rect(cx, wy, 2, Math.max(1, wh - 1));
    }
    f.part('logo', { flat: true, rim: false });
    f.hl(x + 5, x + 19, wy + wh - 1);
  }
}

/** Roof (天板) of the folded upper half, rows [yTop, yTop+h), widening toward the camera. */
function vendRoof(f: Fig, yTop: number, h: number, grow: number, dusty: boolean) {
  const x = VX;
  for (let j = 0; j < h; j++) {
    const y = yTop + j;
    const e = Math.round(grow * (1 - j / Math.max(1, h)) + grow * 0.5);
    f.part('roof', { flat: true });
    f.t(0).hl(x + 1 - e, x + 20 + e, y);
    f.t(1).px(x + 1 - e, y).px(x + 2 - e, y);
    f.t(-1).px(x + 20 + e, y);
    if (j === 0) f.t(1).hl(x + 2 - e, x + 19 + e, y);
  }
  f.t(null);
  // vents across the roof (one every 3 rows) and a maker's plate
  f.part('vent', { flat: true, rim: false });
  for (let j = 2; j < h - 1; j += 3) f.hl(x + 6, x + 15, yTop + j);
  if (h >= 8) {
    f.part('header', { shade: 'b', light: '' });
    f.rect(x + 16, yTop + h - 4, 3, 2);
  }
  if (dusty) {
    f.part('dust', { flat: true, rim: false });
    f.px(x + 4, yTop + 3).px(x + 5, yTop + 3).px(x + 12, yTop + 6).px(x + 18, yTop + 9).px(x + 9, yTop + 10);
  }
}

function vend(f: Fig, p: Pose) {
  const deg = p.act === 'bow' ? p.ph : p.act === 'bow_30' ? 1 : p.act === 'bow_60' ? 2 : p.act === 'bow_90' ? 3 : 0;
  const hum = p.mode === 'idle' && p.tick % 2 === 1 ? 1 : 0;
  const flicker = p.mode === 'idle' && p.tick % 7 === 5;
  const flap = p.mode === 'idle' && p.tick % 5 === 2 ? 1 : 0;
  const ledOn = p.act !== 'off';
  const o: VendOpts = { ledOn, flicker, flap, hum: deg ? 0 : hum };
  vendFront(f, VX, VY, o);
  vendCord(f, deg ? deg : p.tick % 8 === 3 ? 1 : 0);
  if (deg === 0) return;
  // bowing: the lower cabinet (buttons, slots, mouth) stays put; everything
  // above the waist hinge folds toward the camera in three steps
  f.erase(0, 0, 48, HINGE);
  const grow = [0, 1, 2, 3][deg];
  if (deg < 3) {
    const faceH = [19, 16, 12][deg];
    const roofH = [0, 4, 9][deg];
    const faceTop = HINGE - faceH;
    vendRoof(f, faceTop - roofH, roofH, grow, false);
    vendUpperFace(f, faceTop, faceH, grow, o);
    // the crease at the waist: a dark fold line
    f.part('body', { flat: true });
    f.t(-2).hl(VX + 3, VX + 21, HINGE).t(null);
    f.part('side', { flat: true });
    f.t(-1).hl(VX, VX + 2, HINGE).t(null);
    return;
  }
  // fully folded (90°): the upper half now juts out toward the camera — we
  // see its dusty roof, overhanging the buttons. The LED faces the ground:
  // its lit segments peek out as a green edge under the overhang and the
  // glow washes down over the cabinet front.
  const OVER = 3;
  vendRoof(f, HINGE - 10, 11 + OVER, grow, true);
  f.part('led', { flat: true, rim: false });
  f.hl(VX + 2, VX + 21, HINGE + OVER + 1);
  f.part('ledOn', { flat: true, rim: false });
  for (const dx of [4, 5, 7, 8, 9, 12, 14, 15, 16, 18, 19, 20]) f.px(VX + dx, HINGE + OVER + 1);
  f.after((pc) => {
    const glow = [0.55, 0.35, 0.18];
    for (let k = 0; k < glow.length; k++) {
      const y = HINGE + OVER + 2 + k;
      for (let x = VX + 3; x <= VX + 21; x++) {
        const v = pc.data[y * pc.w + x];
        if (v >>> 24 === 0) continue;
        const hx = '#' + [v & 255, (v >>> 8) & 255, (v >>> 16) & 255].map((n) => n.toString(16).padStart(2, '0')).join('');
        pc.set(x, y, mix(hx, '#7CFF9A', glow[k]));
      }
    }
  });
}

registerChar('enemy_ojigi_jihanki', () =>
  buildSprite({
    id: 'enemy_ojigi_jihanki',
    w: 48,
    h: 40,
    mats: VEND_MATS,
    draw: vend,
    walkFrames: 1,
    idle: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { act: 'bow', ph: 1 }, { act: 'bow', ph: 1 }, { act: 'bow', ph: 1 }, {}],
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
  bin: flat('#7E8C9AD0'),
  binEdge: flat('#FFFFFFD8'),
  dust: flat('#6B7186'),
  bristle: flat('#5A5F68'),
  sock: flat('#F4F1E8'),
  sockR: flat('#E84E3C'),
  brush: flat('#3A3F48'),
};

function souji(f: Fig, p: Pose) {
  const walking = p.mode === 'walk';
  const st = p.step % 4;
  const tk = p.mode === 'idle' ? p.tick : st;
  const blink = p.mode === 'idle' ? p.tick % 6 >= 4 : walking ? st === 3 : false;
  const v = p.view;
  // a squat disc seen from above-front: the wall shows as a band under the lid
  const jx = walking && st % 2 ? 1 : 0; // motor judder while driving
  f.offset(jx, 0);
  // wall (cylinder side)
  f.part('band', { shade: 'r', light: '' });
  f.ell(12, 6.7, 11.5, 4.3);
  // bumper: the front half of the wall, dark rubber with a glint line
  f.part('bumper', { shade: 'r', light: '' });
  if (v === 'down') {
    f.ell(12, 6.9, 11.5, 4.1);
  } else if (v === 'left') {
    for (let y = 3; y <= 10; y++) for (let x = 0; x <= 9; x++) if (f.filled(x, y)) f.px(x, y);
  }
  // lid
  f.part('top', { shade: 'rb', light: 't' });
  f.ell(12, 4.6, 11.5, 4.1);
  // seam ring of the lid
  f.part('top', { flat: true, rim: false, ol: false });
  f.t(-1).hl(6, 17, 8).px(4, 7).px(19, 7).t(1).hl(7, 13, 1).px(5, 2).t(null);
  // clear dust bin (rear) with dust and the lone sock inside
  const bin = v === 'down' ? [8, 1] : v === 'up' ? [8, 4] : [13, 1];
  f.part('bin', { flat: true, rim: false, ol: false });
  f.rect(bin[0], bin[1], 8, 4);
  // the lone sock lying in the dust: an L (leg + foot) with a red cuff
  f.part('dust', { flat: true, rim: false, ol: false });
  f.px(bin[0] + 1, bin[1] + 3).px(bin[0] + 6, bin[1] + 3).px(bin[0] + 7, bin[1] + 3);
  f.part('sock', { flat: true, rim: false, ol: false });
  f.rect(bin[0] + 4, bin[1] + 1, 2, 2).hl(bin[0] + 2, bin[0] + 5, bin[1] + 3);
  f.part('sockR', { flat: true, rim: false, ol: false });
  f.hl(bin[0] + 4, bin[0] + 5, bin[1] + 1);
  // clear lid of the bin: bright rim + a glint
  f.part('binEdge', { flat: true, rim: false, ol: false });
  f.hl(bin[0], bin[0] + 7, bin[1]).px(bin[0], bin[1] + 1).px(bin[0], bin[1] + 2).px(bin[0] + 1, bin[1] + 1);
  // power button
  f.part('button', { flat: true, rim: false, ol: false });
  if (v !== 'up') f.px(v === 'left' ? 9 : 12, v === 'left' ? 5 : 5).px(v === 'left' ? 10 : 11, 5);
  // LED eyes on the front edge (blink)
  f.part(blink ? 'ledHalo' : 'led', { flat: true, rim: false, ol: false });
  if (v === 'down') f.hl(7, 8, 7).hl(15, 16, 7);
  else if (v === 'left') f.px(2, 5).px(2, 6).px(4, 7);
  if (!blink && v !== 'up')
    f.after((pc) => {
      const glow = '#5CE1FF55';
      const pts = v === 'down' ? [[6, 7], [9, 7], [14, 7], [17, 7]] : [[1, 5], [1, 6]];
      for (const [x, y] of pts) if (pc.alpha(x + jx, y) === 0) pc.set(x + jx, y, glow);
    });
  // side brush at the front-left corner, spinning
  const bxy: [number, number] = v === 'down' ? [3, 9] : v === 'left' ? [1, 9] : [3, 3];
  const spokes = [[[-1, 0], [1, 0], [0, 1]], [[-1, -1], [1, 0], [0, 1]], [[0, -1], [1, 1], [-1, 0]], [[1, -1], [-1, 1], [0, 1]]][tk % 4];
  f.part('brush', { flat: true, rim: false, ol: false });
  f.px(bxy[0], bxy[1]);
  f.part('bristle', { flat: true, rim: false, ol: false });
  for (const [dx, dy] of spokes) f.px(bxy[0] + dx, bxy[1] + dy);
  f.offset(0, 0);
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
  const sway = restored ? 0 : p.mode === 'idle' ? p.tick % 4 : 0;
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
  // remote on a coiled cord from the right armrest, swaying like a tail; when
  // beckoning, the cord rears up like an arm and the remote curls toward the
  // chair ("come, sit"), 3 poses
  if (restored) {
    f.part('cordC', { flat: true, rim: false, ol: false });
    f.px(22, 21).px(22, 22).px(23, 23);
    // remote tidied onto the armrest
    f.part('remote', { shade: 'r', light: 't' });
    f.rect(20, 10, 3, 2);
  } else if (p.act === 'beckon') {
    const ph = p.ph % 3;
    f.part('cordC', { flat: true, rim: false, ol: false });
    f.px(22, 13).px(23, 12).px(23, 11).px(22, 10).px(23, 9);
    f.part('remote', { shade: 'r', light: 't' });
    if (ph === 0) {
      f.rect(22, 4, 2, 5);
      f.part('bR', { flat: true, rim: false }).px(22, 5);
      f.part('bG', { flat: true, rim: false }).px(23, 5);
      f.part('bB', { flat: true, rim: false }).px(22, 6);
    } else if (ph === 1) {
      f.rows(20, 5, ['##..', '###.', '.###', '..##']);
      f.part('bR', { flat: true, rim: false }).px(21, 6);
      f.part('bG', { flat: true, rim: false }).px(22, 7);
    } else {
      f.rect(18, 7, 5, 2);
      f.px(23, 8);
      f.part('bR', { flat: true, rim: false }).px(19, 7);
      f.part('bG', { flat: true, rim: false }).px(20, 7);
      f.part('bB', { flat: true, rim: false }).px(21, 7);
    }
  } else {
    f.part('cordC', { flat: true, rim: false, ol: false });
    const swing = [0, 1, 0, -1][sway % 4];
    const cordPts: [number, number][] = [[22, 20], [23, 21], [22, 22], [23, 23], [22 + (swing > 0 ? 1 : 0), 24]];
    for (const [x, y] of cordPts) f.px(x, y);
    const rx = 21 + swing;
    const ry = 25;
    f.part('remote', { shade: 'r', light: 't' });
    f.rect(rx, ry, 2, 4);
    f.part('bR', { flat: true, rim: false }).px(rx, ry + 1);
    f.part('bG', { flat: true, rim: false }).px(rx + 1, ry + 1);
    f.part('bB', { flat: true, rim: false }).px(rx, ry + 2);
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
    anims: { beckon: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 2 }, { ph: 2 }, { ph: 1 }], ms: [220, 120, 260, 120, 140] } },
    views: { up: 'down', left: 'down', right: 'down' },
    shadow: 22,
  }),
);

void C;
