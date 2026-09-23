// Portraits (32×32) for the battle status frames and dialog.
//   portrait('minato' | 'kanenari', mood)  mood ∈ MOODS
//   portrait('npc_mother' | 'npc_obaa' | 'npc_maruyama', 'normal' | 'happy' | 'surprised')
// Each is an opaque little "photo": a sunset backdrop whose tint follows the
// mood (hurt → dusky violet, ko → faded), the bust lit from the left with a
// broken sunset rim and the same outline rules as the field sprites.

import { PixelCanvas, mix } from '../../engine/pixel';
import { Fig, flat, mat, type Mats } from './fig';
import { registerPortrait } from './registry';
import { C } from './palette';

export const MOODS = ['normal', 'hurt', 'tsukkomi', 'happy', 'surprised', 'ko'];

const S = 32;

// ---- backdrop -------------------------------------------------------------

interface Sky {
  top: string;
  bot: string;
  sun?: string;
}

const SKY: Record<string, Sky> = {
  normal: { top: '#F7C27A', bot: '#F2894B', sun: '#FFE7A3' },
  hurt: { top: '#9A7AB0', bot: '#D9728A' },
  tsukkomi: { top: '#FFE7A3', bot: '#F7C27A' },
  happy: { top: '#FFE7A3', bot: '#F7A86A', sun: '#FFF6D8' },
  surprised: { top: '#D9E4F0', bot: '#9FC8E0' },
  ko: { top: '#8A849E', bot: '#5B4A7A' },
};

function backdrop(p: PixelCanvas, sky: Sky, mood: string) {
  for (let y = 0; y < S; y++) {
    const t = y / (S - 1);
    for (let x = 0; x < S; x++) {
      // 4×4 ordered dither between two bands for a soft vertical gradient
      const band = t * 4;
      const k = Math.floor(band);
      const f = band - k;
      const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]][y & 3][x & 3] / 16;
      const tt = Math.min(1, (k + (f > bayer ? 1 : 0)) / 4);
      p.set(x, y, mix(sky.top, sky.bot, tt));
    }
  }
  if (sky.sun) {
    // the low sun at the left edge (light source)
    p.ellipse(2, 22, 6, 6, mix(sky.sun, sky.bot, 0.25));
    p.ellipse(1.5, 22, 4, 4, sky.sun);
  }
  if (mood === 'tsukkomi') {
    // speed lines from the right
    for (let y = 3; y < S; y += 5) for (let x = 20 + (y % 3); x < S; x++) if ((x + y) % 7 < 4) p.set(x, y, '#FFF6D8');
  }
  if (mood === 'happy') {
    const petals: [number, number][] = [[3, 4], [27, 6], [25, 2], [5, 27], [28, 26], [22, 5]];
    for (const [x, y] of petals) {
      p.set(x, y, '#FF6A4D');
      p.set(x + 1, y, '#FFB0A0');
    }
  }
  if (mood === 'surprised') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      for (let r = 12; r < 18; r++) p.set(Math.round(16 + Math.cos(a) * r), Math.round(14 + Math.sin(a) * r), '#FFF6D8');
    }
  }
}

/** Compose: backdrop, then the figure (with its own outline) on top. */
function compose(mood: string, fig: Fig, sky?: Sky): HTMLCanvasElement {
  const out = new PixelCanvas(S, S);
  backdrop(out, sky ?? SKY[mood] ?? SKY.normal, mood);
  const fg = fig.render();
  out.blit(fg, 0, 0);
  // photo border shading: 1px darker frame line so it sits on the paper
  for (let i = 0; i < S; i++) {
    out.set(i, S - 1, mix(rgbaHex(out, i, S - 1), C.ol, 0.35));
    out.set(S - 1, i, mix(rgbaHex(out, S - 1, i), C.ol, 0.35));
  }
  return out.toCanvas();
}

function rgbaHex(p: PixelCanvas, x: number, y: number): string {
  const v = p.get(x, y);
  const r = v & 255;
  const g = (v >>> 8) & 255;
  const b = (v >>> 16) & 255;
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

// ---- Minato ----------------------------------------------------------------

const MIN: Mats = {
  skin: mat('#FFD9B8', { shade: '#EBB08E', light: '#FFEBD8', dark: '#C98A6A', rim: '#FFC08E' }),
  skinP: mat('#EED2C0', { shade: '#D0AE9A', light: '#FFE6D6', dark: '#A88878', rim: '#F4C4A8' }),
  hair: mat('#3A2824', { shade: '#291B20', dark: '#1A1118', light: '#5E4034', spec: '#8C6048', rim: '#A05A3C' }),
  shirt: mat('#3FA66B', { shade: '#2E7A52', light: '#6CC48A', dark: '#245A44', rim: '#A8C870' }),
  string: flat('#4AA8E0'),
  key: flat('#FFD23F'),
  eye: flat('#2A2440'),
  white: flat('#FFF6D8'),
  iris: flat('#4A3434'),
  brow: flat('#2A1E22'),
  mouthIn: flat('#8A3A3A'),
  tongue: flat('#E8706A'),
  teeth: flat('#FFF6D8'),
  blush: flat('#F79A84'),
  hana: flat('#E23B2E'),
  sweat: mat('#9FD8F0', { shade: '#6FB4D8', light: '#E8F8FF' }),
  hoop: mat('#B89A6A', { shade: '#8A6A3A', light: '#E0C890' }),
  net: flat('#F4F1E8'),
  hand: mat('#FFD9B8', { shade: '#EBB08E', light: '#FFEBD8', dark: '#C98A6A' }),
};

// Minato's head, hand-placed. Hair letters carry explicit tones (the portrait
// is never mirrored): H/K light, h base, d/D shade.
const MIN_FACE = [
  //        1111111111222222222233
  //234567890123456789012345678901
  '.......########.........', // y9  (x from 7)
  '.....############.......',
  '....##############......',
  '...################.....',
  '...################.....',
  '...################.....',
  '...################.....',
  '...################.....',
  '...################.....',
  '...################.....',
  '...################.....',
  '....##############......',
  '.....############.......',
  '......##########........',
  '........######..........',
  '..........##............',
];

const MIN_HAIR = [
  //0         1         2         3
  //01234567890123456789012345678901
  '..............HHhhhhh...........', // y2
  '...........HHHKKhhhhhhhd........',
  '.........HHHKKHhhhhhhhhhhd..dd..',
  '........HHKHhhhhhhhhhhhhhhdddd..',
  '.......HHHhhhhhhhhhhhhhhhhhhdd..',
  '......HHhhhhhhhhhhhhhhhhhhhhhd..',
  '.....HHhhhhhhhhhhhhhhhhhhhhhhd..',
  '....hHhhhhhhhhhhhhhhhhhhhhhhhdd.',
  '...hhhhhhhhhdhhhhhhhdhhhhhhhhhd.',
  '..dhhhhhhhhd.dhhhhdd..dhhhhhhdd.',
  '...hhhhhhhd...dhhd.....dhhhhhd..',
  '....hhhhdd.....dd.......dhhhd...',
  '....hhhd.................dhhd...',
  '....hhd...................dhd...',
  '....hd.....................hd...',
  '....hd.....................hd...',
  '....d.......................d...',
];

function minato(mood: string): HTMLCanvasElement {
  const f = new Fig(S, S, MIN);
  const ko = mood === 'ko';
  const skin = ko ? 'skinP' : 'skin';
  // net hoop peeking behind the head (top-left)
  f.part('hoop', { shade: 'rb', light: 't' });
  f.rows(0, 1, ['.####.', '#....#', '#....#', '#....#', '.####.']);
  f.part('net', { flat: true, rim: false, ol: false });
  f.px(1, 2).px(3, 2).px(2, 3).px(4, 3).px(1, 4).px(3, 4);
  f.part('hoop', { shade: 'r', light: '' });
  f.px(6, 6).px(7, 7);
  // shoulders + tee
  f.part('shirt', { shade: 'rb', light: 't' });
  f.poly([[1, 32], [3, 28], [9, 25.5], [23, 25.5], [29, 28], [31, 32]]);
  f.part('shirt', { flat: true });
  f.t(-2).hl(12, 19, 26).t(-1).px(8, 30).px(24, 30).px(9, 29).t(null);
  f.part('string', { flat: true, rim: false });
  f.px(12, 27).px(13, 28).px(19, 27).px(18, 28).px(14, 29).px(17, 29);
  f.part('key', { flat: true, rim: false });
  f.px(15, 30).px(16, 30).px(15, 31);
  // neck
  f.part(skin, { shade: 'r', light: '' });
  f.rect(12, 23, 8, 4);
  f.part(skin, { flat: true });
  f.t(-1).hl(12, 19, 23).hl(13, 18, 24).t(null);
  // ears
  f.part(skin, { shade: 'rb', light: '' });
  f.rect(4, 14, 3, 5).rect(25, 14, 3, 5);
  f.part(skin, { flat: true });
  f.t(-1).px(5, 16).px(5, 17).px(26, 16).px(26, 17).t(null);
  // face
  f.part(skin, { shade: 'rb', light: '' });
  const spans: [number, number][] = [[12, 19], [10, 21], [8, 23], [7, 24], [7, 24], [7, 24], [7, 24], [7, 24], [7, 24], [7, 24], [7, 24], [8, 23], [9, 22], [10, 21], [12, 19]];
  spans.forEach(([a, b], j) => f.hl(a, b, 9 + j));
  // soft jaw shading + cheek light
  f.part(skin, { flat: true });
  f.t(-1).px(23, 20).px(22, 21).px(21, 22).px(19, 23).t(1).px(8, 13).px(8, 14).px(9, 12).t(null);
  void MIN_FACE;
  // hair
  f.part('hair', { shade: '', light: '' });
  f.rows(0, 2, MIN_HAIR);
  // ahoge (1px wide, 3 tall, bends)
  const ah = ko ? [[20, 1], [21, 1], [22, 0]] : mood === 'surprised' ? [[18, 0], [18, 1], [18, 2]] : [[19, 0], [18, 1], [18, 2]];
  f.part('hair', { flat: true, rim: false });
  f.t(0);
  for (const [x, y] of ah) f.px(x, y);
  f.t(null);
  face(f, mood, 0);
  return compose(mood, f);
}

function eyePair(f: Fig, draw: (x: number, mirror: boolean) => void, tilt: number) {
  draw(9 + tilt, false);
  draw(20 + tilt, true);
}

function face(f: Fig, mood: string, tilt: number) {
  const ey = 16;
  const eye = (m: string) => f.part(m, { flat: true, rim: false });
  switch (mood) {
    case 'hurt': {
      // squeezed "> <" eyes, a sweat bead, gritted mouth
      eyePair(f, (x, m) => {
        eye('eye');
        if (!m) f.px(x, ey - 1).px(x + 1, ey).px(x + 2, ey + 1).px(x + 1, ey + 2).px(x, ey + 3);
        else f.px(x + 2, ey - 1).px(x + 1, ey).px(x, ey + 1).px(x + 1, ey + 2).px(x + 2, ey + 3);
      }, tilt);
      eye('brow');
      f.hl(9 + tilt, 12 + tilt, 11).px(12 + tilt, 12).hl(19 + tilt, 22 + tilt, 11).px(19 + tilt, 12);
      eye('mouthIn');
      f.hl(13 + tilt, 18 + tilt, 21).hl(14 + tilt, 17 + tilt, 22);
      eye('teeth');
      f.hl(14 + tilt, 17 + tilt, 21);
      f.part('sweat', { shade: 'r', light: 't' });
      f.rows(24, 10, ['.#.', '###', '###', '.#.']);
      break;
    }
    case 'tsukkomi': {
      // sharp eyes (narrow, strong brows angled in), big shouting mouth
      eyePair(f, (x) => {
        eye('eye');
        f.hl(x, x + 2, ey).hl(x, x + 2, ey + 1);
        eye('white');
        f.px(x + (x < 16 ? 2 : 0), ey + 1);
      }, tilt);
      eye('brow');
      f.px(9 + tilt, 11).px(10 + tilt, 11).px(11 + tilt, 12).px(12 + tilt, 13);
      f.px(22 + tilt, 11).px(21 + tilt, 11).px(20 + tilt, 12).px(19 + tilt, 13);
      eye('mouthIn');
      f.rows(12 + tilt, 19, ['.######.', '########', '########', '.######.']);
      eye('teeth');
      f.hl(13 + tilt, 18 + tilt, 19);
      eye('tongue');
      f.hl(14 + tilt, 17 + tilt, 21);
      // the chopping hand ("ツッコミ") entering from the right
      f.part('hand', { shade: 'rb', light: 't' });
      f.rows(25, 18, ['..####', '.#####', '######', '#####.', '####..']);
      f.part('shirt', { shade: 'rb', light: 't' });
      f.rect(29, 23, 3, 4);
      break;
    }
    case 'happy': {
      // closed smiling arcs, open smile, vermilion hanamaru blush
      eyePair(f, (x) => {
        eye('eye');
        f.px(x, ey + 1).px(x + 1, ey).px(x + 2, ey + 1);
      }, tilt);
      eye('mouthIn');
      f.rows(13 + tilt, 19, ['######', '.####.', '..##..']);
      eye('tongue');
      f.hl(15 + tilt, 16 + tilt, 21);
      // hanamaru swirl blush on both cheeks
      for (const cx of [9 + tilt, 21 + tilt]) {
        eye('hana');
        f.px(cx, 18).px(cx + 1, 18).px(cx + 2, 19).px(cx + 1, 20).px(cx, 20).px(cx, 19);
        eye('blush');
        f.px(cx - 1, 18).px(cx + 3, 19).px(cx + 1, 19);
      }
      break;
    }
    case 'surprised': {
      // round wide eyes with tiny pupils, "o" mouth, sweat
      eyePair(f, (x) => {
        eye('white');
        f.rows(x, ey - 1, ['.#.', '###', '###', '###', '.#.']);
        eye('eye');
        f.px(x + 1, ey + 1).px(x - 1 + 0, ey).px(x + 3, ey);
        f.px(x, ey - 2).px(x + 1, ey - 2).px(x + 2, ey - 2);
      }, tilt);
      eye('brow');
      f.hl(9 + tilt, 12 + tilt, 10).hl(19 + tilt, 22 + tilt, 10);
      eye('mouthIn');
      f.rows(14 + tilt, 19, ['.##.', '####', '####', '.##.']);
      f.part('sweat', { shade: 'r', light: 't' });
      f.rows(25, 9, ['.#.', '###', '.#.']);
      break;
    }
    case 'ko': {
      // swirly eyes, wobbly mouth
      eyePair(f, (x) => {
        eye('eye');
        f.px(x, ey).px(x + 1, ey - 1).px(x + 2, ey).px(x + 2, ey + 1).px(x + 1, ey + 2).px(x, ey + 1).px(x + 1, ey);
      }, tilt);
      eye('mouthIn');
      f.px(13 + tilt, 21).px(14 + tilt, 20).px(15 + tilt, 21).px(16 + tilt, 20).px(17 + tilt, 21).px(18 + tilt, 20);
      break;
    }
    default: {
      // calm, a little deadpan: 2×3 eyes with a catch-light, small mouth
      eyePair(f, (x) => {
        eye('eye');
        f.rect(x, ey - 1, 2, 3).px(x + 2, ey);
        eye('white');
        f.px(x, ey - 1);
      }, tilt);
      eye('brow');
      f.hl(9 + tilt, 12 + tilt, 12).hl(19 + tilt, 22 + tilt, 12);
      eye('mouthIn');
      f.hl(15 + tilt, 17 + tilt, 21);
      eye('blush');
      f.hl(8 + tilt, 9 + tilt, 19).hl(22 + tilt, 23 + tilt, 19);
    }
  }
}

registerPortrait('minato', (mood) => minato(MOODS.includes(mood) ? mood : 'normal'));

// ---- Kanenari ----------------------------------------------------------------
// He cannot speak, so the moods lean on the bell and a tiny flip board.

const KAN: Mats = {
  brass: mat('#D9A441', { shade: '#A8742A', light: '#F6D98A', spec: '#FFF6D8', dark: '#7A5424', rim: '#FFC46A', ol: '#4A2E22' }),
  brassK: mat('#B8A07A', { shade: '#8A7858', light: '#D8C8A8', dark: '#5A4A38', rim: '#D8B890', ol: '#3A2E26' }),
  brassD: mat('#B8843A', { shade: '#8A5E24', light: '#E0B45A', dark: '#5A3A1A', ol: '#4A2E22' }),
  inside: flat('#2E1C16'),
  clapper: mat('#9A6A2A', { shade: '#6A4A1A', light: '#C89A4A', dark: '#4A3010' }),
  fur: mat('#F2894B', { shade: '#C8643A', light: '#F7A86A', dark: '#A04E2E', rim: '#FFB878', ol: '#5A2A2E', soft: true }),
  sash: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFF6D8' }),
  red: flat('#E84E3C'),
  eye: flat('#2A1E1A'),
  white: flat('#FFF6D8'),
  cheek: flat('#F08A7A'),
  board: mat('#F4F1E8', { shade: '#D8CCB8', light: '#FFF6D8', dark: '#A89C88' }),
  ink: flat('#2A2440'),
  inkR: flat('#E23B2E'),
  crack: flat('#6A4A1A'),
  sweat: mat('#9FD8F0', { shade: '#6FB4D8', light: '#E8F8FF' }),
  glow: flat('#FFF6D8'),
};

function kanenari(mood: string): HTMLCanvasElement {
  const f = new Fig(S, S, KAN);
  const ko = mood === 'ko';
  const tip = ko ? 2 : mood === 'hurt' ? 1 : 0;
  const brass = ko ? 'brassK' : 'brass';
  // fluffy shoulders + sash
  f.part('fur', { shade: 'rb', light: 't' });
  f.ell(16, 32, 13, 7);
  f.part('sash', { shade: 'b', light: '' });
  for (let i = 0; i < 8; i++) f.px(8 + i, 26 + i).px(9 + i, 26 + i).px(10 + i, 26 + i);
  f.part('red', { flat: true, rim: false });
  f.px(10, 28).px(13, 31);
  // bell (tips over when hurt / ko)
  const bx = 16 + tip;
  f.part('brassD', { shade: 'r', light: 't' });
  f.rows(bx - 2, 0, ['.##.', '#..#']);
  f.part(brass, { shade: '', light: '' });
  const prof = [3, 5, 6, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 11, 12, 13, 14];
  prof.forEach((hw, j) => {
    const sh = Math.round((tip * (prof.length - j)) / prof.length);
    f.hl(bx - hw + sh, bx + hw - 1 + sh, 2 + j);
  });
  // metallic shading: light band left, falloff right
  prof.forEach((hw, j) => {
    const sh = Math.round((tip * (prof.length - j)) / prof.length);
    const y = 2 + j;
    f.retone(bx - hw + sh + 1, y, 1).retone(bx - hw + sh + 2, y, j > 2 ? 1 : 0);
    f.retone(bx + hw - 1 + sh, y, -2).retone(bx + hw - 2 + sh, y, -1).retone(bx + hw - 3 + sh, y, -1);
  });
  f.retone(bx - 4, 5, 2).retone(bx - 5, 6, 2).retone(bx - 5, 7, 2);
  f.part('brassD', { shade: 'r', light: 't' });
  f.hl(bx - 14, bx + 13, 21);
  f.part('inside', { flat: true, rim: false });
  f.hl(bx - 12, bx + 11, 22);
  f.part('clapper', { shade: 'r', light: 'l' });
  const cl = mood === 'surprised' ? 3 : ko ? -2 : 0;
  f.rect(bx - 2 + cl, 22, 4, 3);
  if (mood === 'hurt') {
    f.part('crack', { flat: true, rim: false });
    f.px(bx + 6, 6).px(bx + 5, 7).px(bx + 6, 8).px(bx + 5, 9);
  }
  // face
  const ey = 12;
  const E = (x: number, y: number, w: number, h: number) => f.part('eye', { flat: true, rim: false }).rect(x, y, w, h);
  const ex1 = bx - 6;
  const ex2 = bx + 4;
  switch (mood) {
    case 'hurt':
      f.part('eye', { flat: true, rim: false });
      f.px(ex1, ey).px(ex1 + 1, ey + 1).px(ex1, ey + 2).px(ex2 + 1, ey).px(ex2, ey + 1).px(ex2 + 1, ey + 2);
      f.part('sweat', { shade: 'r', light: 't' });
      f.rows(bx + 9, 8, ['.#.', '###', '.#.']);
      break;
    case 'happy':
      f.part('eye', { flat: true, rim: false });
      f.px(ex1 - 1, ey + 1).px(ex1, ey).px(ex1 + 1, ey + 1).px(ex2 - 1, ey + 1).px(ex2, ey).px(ex2 + 1, ey + 1);
      f.part('glow', { flat: true, rim: false, ol: false });
      f.px(bx - 9, 4).px(bx + 9, 3).px(bx + 10, 4).px(bx + 9, 5).px(bx + 8, 4);
      break;
    case 'surprised':
      f.part('white', { flat: true, rim: false });
      f.rect(ex1 - 1, ey - 1, 4, 4).rect(ex2 - 1, ey - 1, 4, 4);
      E(ex1, ey, 2, 2);
      E(ex2, ey, 2, 2);
      break;
    case 'ko':
      f.part('eye', { flat: true, rim: false });
      f.px(ex1, ey).px(ex1 + 2, ey).px(ex1 + 1, ey + 1).px(ex1, ey + 2).px(ex1 + 2, ey + 2);
      f.px(ex2, ey).px(ex2 + 2, ey).px(ex2 + 1, ey + 1).px(ex2, ey + 2).px(ex2 + 2, ey + 2);
      break;
    case 'tsukkomi':
      E(ex1, ey, 2, 3);
      E(ex2, ey, 2, 3);
      f.part('eye', { flat: true, rim: false });
      f.px(ex1 - 1, ey - 2).px(ex1, ey - 2).px(ex1 + 1, ey - 1).px(ex2 + 2, ey - 2).px(ex2 + 1, ey - 2).px(ex2, ey - 1);
      break;
    default:
      E(ex1, ey, 2, 3);
      E(ex2, ey, 2, 3);
  }
  f.part('cheek', { flat: true, rim: false });
  if (!ko) f.hl(ex1 - 2, ex1 - 1, ey + 4).hl(ex2 + 2, ex2 + 3, ey + 4);
  // the little flip board says what he can't
  const board = (x: number, y: number, draw: () => void) => {
    f.part('board', { shade: 'rb', light: 'tl' });
    f.rect(x, y, 11, 8);
    draw();
    f.part('fur', { shade: 'rb', light: 't' });
    f.rect(x - 1, y + 5, 2, 3).rect(x + 10, y + 5, 2, 3);
  };
  if (mood === 'tsukkomi')
    board(19, 21, () => {
      f.part('ink', { flat: true, rim: false });
      f.vl(24, 22, 25).px(24, 27).px(23, 22).px(25, 22);
      f.part('inkR', { flat: true, rim: false });
      f.px(21, 23).px(27, 23).px(21, 26).px(27, 26);
    });
  else if (mood === 'surprised')
    board(20, 22, () => {
      f.part('ink', { flat: true, rim: false });
      f.vl(22, 23, 25).px(22, 27).rows(25, 23, ['##.', '..#', '.#.', '...', '.#.']);
    });
  else if (mood === 'happy')
    board(20, 22, () => {
      f.part('inkR', { flat: true, rim: false });
      f.rows(22, 23, ['.##.##.', '#######', '.#####.', '..###..', '...#...']);
    });
  else if (mood === 'hurt')
    board(20, 23, () => {
      f.part('ink', { flat: true, rim: false });
      f.px(22, 27).px(25, 27).px(28, 27);
    });
  return compose(mood, f);
}

registerPortrait('kanenari', (mood) => kanenari(MOODS.includes(mood) ? mood : 'normal'));

// ---- NPC faces for dialog (normal / happy / surprised) ----------------------

interface NpcFace {
  mats: Mats;
  draw: (f: Fig, mood: string) => void;
  sky: Sky;
}

function npcPortrait(id: string, d: NpcFace) {
  registerPortrait(id, (mood) => {
    const m = ['normal', 'happy', 'surprised'].includes(mood) ? mood : 'normal';
    const f = new Fig(S, S, d.mats);
    d.draw(f, m);
    return compose(m, f, m === 'normal' ? d.sky : undefined);
  });
}

function simpleEyes(f: Fig, mood: string, xl: number, xr: number, y: number, h = 2) {
  f.part('eye', { flat: true, rim: false });
  if (mood === 'happy') {
    f.px(xl - 1, y + 1).px(xl, y).px(xl + 1, y + 1);
    f.px(xr - 1, y + 1).px(xr, y).px(xr + 1, y + 1);
  } else if (mood === 'surprised') {
    f.part('white', { flat: true, rim: false });
    f.rect(xl - 1, y - 1, 3, h + 2).rect(xr - 1, y - 1, 3, h + 2);
    f.part('eye', { flat: true, rim: false });
    f.px(xl, y).px(xr, y);
  } else {
    f.rect(xl, y, 2, h).rect(xr, y, 2, h);
  }
}

// 母: ponytail, mustard apron straps
npcPortrait('npc_mother', {
  sky: { top: '#FFE7C8', bot: '#F7C27A' },
  mats: {
    skin: mat('#F7CFAE', { shade: '#E0A882', light: '#FFE4CC', dark: '#B87A5E', rim: '#FFBC8A' }),
    hair: mat('#3A2622', { shade: '#291A1C', dark: '#1A1016', light: '#5A3C32', spec: '#7E5646', rim: '#9A5438' }),
    blouse: mat('#E8E4D8', { shade: '#C4BCB0', light: '#FAF6EC', dark: '#9A9088', rim: '#FFD6A8' }),
    apron: mat('#F7C27A', { shade: '#D9974A', light: '#FFDCA0', dark: '#A8702E' }),
    band: flat('#B8302A'),
    eye: flat('#2A2440'),
    white: flat('#FFF6D8'),
    brow: flat('#4A322C'),
    mouth: flat('#2A2440'),
    lip: flat('#C0705E'),
    blush: flat('#F4A08C'),
  },
  draw: (f, mood) => {
    f.part('blouse', { shade: 'rb', light: 't' });
    f.poly([[2, 32], [5, 26], [11, 24], [21, 24], [27, 26], [30, 32]]);
    f.part('apron', { shade: 'rb', light: 't' });
    f.poly([[10, 32], [11, 27], [21, 27], [22, 32]]);
    f.rect(9, 24, 2, 4).rect(21, 24, 2, 4);
    f.part('skin', { shade: 'r', light: '' });
    f.rect(13, 21, 6, 4);
    // ponytail behind (right)
    f.part('hair', { shade: 'rb', light: 't' });
    f.ell(25, 16, 3, 5);
    f.part('band', { flat: true, rim: false });
    f.px(24, 11).px(25, 11);
    f.part('skin', { shade: 'rb', light: 't' });
    f.ell(16, 15, 8.5, 8.8);
    f.poly([[9, 19], [23, 19], [19, 24], [13, 24]]);
    f.part('hair', { shade: 'rb', light: 't' });
    f.ell(16, 9, 10, 6.5);
    f.poly([[6, 9], [9, 9], [8, 17], [6, 15]]);
    f.poly([[23, 9], [26, 9], [26, 15], [24, 17]]);
    // side-swept fringe with a part
    f.poly([[7, 10], [15, 9], [9, 13]]);
    f.part('hair', { flat: true });
    f.t(1).px(11, 5).px(10, 6).px(9, 7).px(12, 5).t(2).px(11, 6).t(null);
    simpleEyes(f, mood, 11, 19, 15);
    f.part('brow', { flat: true, rim: false });
    f.hl(10, 12, 12).hl(19, 21, 12);
    f.part('lip', { flat: true, rim: false });
    if (mood === 'surprised') f.rect(15, 20, 2, 2);
    else if (mood === 'happy') f.hl(14, 18, 20).hl(15, 17, 21);
    else f.hl(14, 17, 20);
    f.part('blush', { flat: true, rim: false });
    f.hl(9, 10, 18).hl(21, 22, 18);
  },
});

// おばあ: white bun, kappougi, glasses on a gold chain
npcPortrait('npc_obaa', {
  sky: { top: '#FFE7C8', bot: '#E8C890' },
  mats: {
    skin: mat('#F2C8A8', { shade: '#D8A688', light: '#FFE0C8', dark: '#A87A62', rim: '#FFBC90' }),
    hair: mat('#E8E4D8', { shade: '#B8B0A6', light: '#FFF6D8', dark: '#8E887E', rim: '#FFD8B0' }),
    smock: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFF6D8', dark: '#9E978C', rim: '#FFDCB4' }),
    chain: flat('#D9A441'),
    glass: flat('#9AA0A8'),
    pen: flat('#E23B2E'),
    eye: flat('#2A2440'),
    white: flat('#FFF6D8'),
    line: flat('#C8927A'),
    lip: flat('#B06A5A'),
    blush: flat('#F4A08C'),
  },
  draw: (f, mood) => {
    f.part('smock', { shade: 'rb', light: 't' });
    f.poly([[2, 32], [5, 27], [11, 25], [21, 25], [27, 27], [30, 32]]);
    f.part('smock', { flat: true });
    f.t(-1).px(15, 26).px(16, 27).px(15, 28).t(null);
    f.part('pen', { flat: true, rim: false });
    f.vl(22, 27, 29);
    f.part('chain', { flat: true, rim: false });
    f.px(11, 26).px(12, 27).px(13, 28).px(20, 26).px(19, 27).px(18, 28);
    f.part('glass', { flat: true, rim: false });
    f.rect(13, 29, 3, 2).rect(17, 29, 3, 2);
    f.part('skin', { shade: 'r', light: '' });
    f.rect(13, 22, 6, 4);
    f.part('skin', { shade: 'rb', light: 't' });
    f.ell(16, 16, 8.5, 8.5);
    f.poly([[9, 20], [23, 20], [19, 25], [13, 25]]);
    f.part('hair', { shade: 'rb', light: 't' });
    f.ell(16, 3, 4, 3);
    f.ell(16, 10, 9.5, 5.5);
    f.poly([[6, 10], [9, 10], [8, 17], [6, 16]]);
    f.poly([[23, 10], [26, 10], [26, 16], [24, 17]]);
    f.part('hair', { flat: true });
    f.t(-1).hl(13, 18, 5).px(16, 2).t(null);
    // kind narrow eyes + smile lines
    f.part('eye', { flat: true, rim: false });
    if (mood === 'surprised') f.rect(11, 15, 2, 2).rect(19, 15, 2, 2);
    else if (mood === 'happy') f.px(10, 16).px(11, 15).px(12, 15).px(13, 16).px(18, 16).px(19, 15).px(20, 15).px(21, 16);
    else f.hl(11, 13, 16).hl(19, 21, 16);
    f.part('line', { flat: true, rim: false });
    f.px(9, 17).px(22, 17).px(13, 19).px(19, 19);
    f.part('lip', { flat: true, rim: false });
    if (mood === 'surprised') f.rect(15, 21, 2, 1);
    else f.hl(14, 17, 21).px(13, 20).px(18, 20);
    f.part('blush', { flat: true, rim: false });
    f.hl(9, 10, 19).hl(21, 22, 19);
  },
});

// 丸山: tall cook hat, thick brows, towel
npcPortrait('npc_maruyama', {
  sky: { top: '#FFD8B0', bot: '#E8603C' },
  mats: {
    skin: mat('#E0A882', { shade: '#C4876A', light: '#F2BE98', dark: '#9A5E48', rim: '#FFB080' }),
    hair: mat('#2B1E1A', { shade: '#1E1418', light: '#4A3430', rim: '#7A4430' }),
    hat: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFF6D8', dark: '#A8A096', rim: '#FFE0B8' }),
    coat: mat('#EDEAE0', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9A9488', rim: '#FFD8B0' }),
    apron: mat('#E84E3C', { shade: '#B8302A', light: '#FF7A5A', dark: '#7A1A22' }),
    towel: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFF6D8' }),
    eye: flat('#2A2440'),
    white: flat('#FFF6D8'),
    brow: flat('#2B1E1A'),
    nose: flat('#C4876A'),
    lip: flat('#8A4A3A'),
  },
  draw: (f, mood) => {
    f.part('coat', { shade: 'rb', light: 't' });
    f.poly([[0, 32], [3, 26], [10, 24], [22, 24], [29, 26], [32, 32]]);
    f.part('apron', { shade: 'rb', light: 't' });
    f.poly([[9, 32], [10, 28], [22, 28], [23, 32]]);
    f.part('skin', { shade: 'r', light: '' });
    f.rect(12, 21, 8, 4);
    f.part('towel', { shade: 'b', light: '' });
    f.poly([[9, 24], [23, 24], [21, 27], [11, 27]]);
    f.part('skin', { shade: 'rb', light: 't' });
    f.ell(16, 16.5, 9.5, 8);
    f.poly([[8, 19], [24, 19], [20, 24], [12, 24]]);
    f.part('hair', { shade: 'r', light: '' });
    f.rect(6, 10, 3, 5).rect(23, 10, 3, 5);
    // tall toque
    f.part('hat', { shade: 'rb', light: 't' });
    f.rect(8, 6, 16, 5);
    f.ell(16, 4, 9, 4.5);
    f.part('hat', { flat: true });
    f.t(-1).vl(12, 3, 9).vl(16, 2, 9).vl(20, 3, 9).t(-2).hl(8, 23, 10).t(null);
    // thick brows (2px)
    f.part('brow', { flat: true, rim: false });
    const lift = mood === 'surprised' ? -1 : 0;
    f.rect(9, 12 + lift, 5, 2).rect(18, 12 + lift, 5, 2);
    simpleEyes(f, mood, 11, 19, 15, 1);
    f.part('nose', { flat: true, rim: false });
    f.px(15, 18).px(16, 18);
    f.part('lip', { flat: true, rim: false });
    if (mood === 'happy') f.hl(12, 19, 20).hl(13, 18, 21);
    else if (mood === 'surprised') f.rect(15, 20, 2, 2);
    else f.hl(13, 18, 21);
  },
});
