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

export const MIN: Mats = {
  skin: mat('#FFD9B8', { shade: '#EBB08E', light: '#FFEBD8', dark: '#C98A6A', rim: '#FFC08E' }),
  skinP: mat('#EED2C0', { shade: '#D0AE9A', light: '#FFE6D6', dark: '#A88878', rim: '#F4C4A8' }),
  // 30_level_art 9.1 colours: hair #2B1E1A / #5A3A2A, tee #3FA66B / #2E6B4A / #6CC48A
  hair: mat('#2B1E1A', { shade: '#1B1733', dark: '#1B1733', light: '#5A3A2A', spec: '#8A5A3A' }),
  shirt: mat('#3FA66B', { shade: '#2E6B4A', light: '#6CC48A', dark: '#245A44' }),
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
        // lower rim of the wide-open eye (skin crease) so the white pops
        f.part('skin', { flat: true, rim: false });
        f.t(-2).px(x - 1, ey + 1).px(x + 3, ey + 1).px(x, ey + 3).px(x + 2, ey + 3).t(null);
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

// ---- グソっ君 (id 'kanenari', ★2026-09-29 依頼主の指示で カネナリくん→グソっ君。IDは据え置き。
// ★2026-10-08 依頼主の手本の絵に合わせて 描き直し) --------
// A close-up of the round ochre isopod: the white headband over his brow,
// two big round black eyes with a white glint, pink cheeks, the little ear
// plates at the sides of his head, the two long tusks hanging from under his
// nose over the striped tummy, the side plates at his shoulders. He shows
// how he feels with his eyes, the ear plates, the tilt of his head and the
// pink of his cheeks. Besides MOODS he has 'shock' (衝撃: the eyes flash,
// the ear plates fly up), 'gentle' (やさしい) and 'sad' (しんみり);
// 'yasashii' / 'shinmiri' are accepted as their names too.

export const KAN_MOODS = [...MOODS, 'shock', 'gentle', 'sad'];
const KAN_ALIAS: Record<string, string> = { yasashii: 'gentle', shinmiri: 'sad', shogeki: 'shock' };

const KAN: Mats = {
  shell: mat('#D49A5C', { shade: '#A8693A', light: '#EBBF86', dark: '#5A3A2A', rim: '#EBBF86' }),
  shellK: mat('#B49A86', { shade: '#8E7A6E', light: '#CDB8A6', dark: '#5A4A44', rim: '#CDB8A6' }),
  plate: mat('#A8693A', { shade: '#8A5A3A', light: '#D49A5C', dark: '#5A3A2A' }),
  plateK: mat('#8E7A6E', { shade: '#6E5E58', light: '#B49A86', dark: '#4A3E3A' }),
  belly: mat('#EBBF86', { shade: '#D49A5C', light: '#F0CB98', dark: '#8A5A3A' }),
  bellyK: mat('#CDB8A6', { shade: '#B49A86', light: '#DCCBBC', dark: '#6E5E58' }),
  leg: mat('#EBBF86', { shade: '#D49A5C', light: '#F0CB98', dark: '#5A3A2A' }),
  tusk: mat('#F0CB98', { shade: '#D49A5C', light: '#FBF3DC', dark: '#5A3A2A' }),
  band: mat('#FBF3DC', { shade: '#E8D9B5', light: '#FFF6D8', dark: '#C8B494' }),
  eye: flat('#1B1733'),
  eyeS: flat('#3A2B24'),
  white: flat('#FFF6D8'),
  flash: flat('#FFE7A3'),
  cheek: flat('#F08A7A'),
  cheekL: flat('#F7B0A0'),
  mouth: flat('#2A2440'),
  sweat: mat('#9FD8F0', { shade: '#6FB4D8', light: '#E8F8FF' }),
  glow: flat('#FFF6D8'),
};

const SKY_KAN: Record<string, Sky> = {
  shock: { top: '#FFF6D8', bot: '#9FC8E0' },
  gentle: { top: '#FFE7A3', bot: '#F7C27A', sun: '#FFF6D8' },
  sad: { top: '#7A6A9E', bot: '#C88A96' },
};

/** A pincer hand (two fingers up) with its arm from (x0, y0). */
function kanHand(f: Fig, x0: number, y0: number, hx: number, hy: number) {
  f.part('leg', { shade: 'rb', light: 't' });
  f.line(x0, y0, hx, hy + 2).line(x0 + 1, y0, hx + 1, hy + 2);
  f.rows(hx - 1, hy - 1, ['#.#', '#.#', '###', '.##']);
}

/** A tusk from under the nose: a pale 1–2px stroke, a shadow on its right, a pointed tip. */
function kanTusk(f: Fig, pts: [number, number][]) {
  for (const [x, y] of pts) if (f.filled(x + 1, y) && !pts.some(([a, b]) => a === x + 1 && b === y)) f.retone(x + 1, y, -2);
  f.part('tusk', { flat: true, rim: false, ol: false });
  pts.forEach(([x, y], i) => f.t(i === pts.length - 1 ? -1 : i < 3 ? 1 : 0).px(x, y));
  f.t(null);
}

function kanenari(mood: string): HTMLCanvasElement {
  const f = new Fig(S, S, KAN);
  const ko = mood === 'ko';
  const shell = ko ? 'shellK' : 'shell';
  // the head tips: hurt / ko / sad lean it, gentle tilts it kindly
  const tilt = ko ? 2 : mood === 'hurt' ? 1 : mood === 'gentle' ? -1 : 0;
  const drop = ko ? 2 : mood === 'sad' ? 1 : mood === 'shock' || mood === 'surprised' ? -1 : 0;
  const hx = 16 + tilt;
  const hy = 12 + drop;
  // shoulders: the side plates poking out, the body, the striped tummy
  f.part(ko ? 'plateK' : 'plate', { flat: true, inner: false });
  for (const y of [24, 27, 30]) f.t(0).hl(1, 5, y).hl(26, 30, y).t(-1).hl(0, 5, y + 1).hl(26, 31, y + 1);
  f.t(null);
  f.part(shell, { shade: 'rb', light: 't', inner: false });
  f.ell(16, 33, 13, 10);
  f.part(ko ? 'bellyK' : 'belly', { shade: 'rb', light: 'tl', inner: false });
  f.ell(16, 34, 8.5, 9);
  for (const y of [27, 30]) for (let x = 6; x <= 26; x++) if (f.filled(x, y)) f.retone(x, y, -1);
  // the ear plates (up in shock and surprise, drooping when he is down)
  const up = mood === 'shock' || mood === 'surprised';
  const droop = ko || mood === 'hurt' || mood === 'sad';
  f.part(ko ? 'plateK' : 'plate', { shade: 'rb', light: 't' });
  for (const s of [-1, 1]) {
    const x = hx + s * 11;
    const rows = up ? ['.##', '###', '##.', '#..'] : droop ? ['##.', '###', '.##', '.##', '..#'] : ['.##.', '####', '.###', '..##'];
    const flip = (r: string) => (s < 0 ? [...r].reverse().join('') : r);
    f.rows(s < 0 ? x - rows[0].length + 1 : x, hy + (up ? -2 : 0), rows.map(flip));
  }
  // the head: a big round bun
  f.part(shell, { shade: 'rb', light: 't' });
  f.ell(hx, hy, 11.5, 9.8);
  f.retone(hx - 7, hy - 6, 1).retone(hx - 8, hy - 5, 1).retone(hx - 6, hy - 7, 1).retone(hx - 5, hy - 7, 1);
  // the headband over the brow, lower at the left
  f.part('band', { flat: true, rim: false });
  for (let x = hx - 13; x <= hx + 13; x++) {
    const top = hy - 7 + Math.round((hx - x) * 0.07);
    for (let j = 0; j < 4; j++)
      if (f.filled(x, top + j)) f.t(x > hx + 7 ? (j ? -1 : 0) : j === 0 ? 1 : j < 3 ? 0 : -1).px(x, top + j);
    if (f.filled(x, top + 4)) f.retone(x, top + 4, -1);
  }
  f.t(null);
  // eyes: two big round black eyes
  const ey = hy + 1;
  const ex = [hx - 6, hx + 5];
  const ROUND = ['.###.', '#####', '#####', '#####', '.###.'];
  const round = (cx: number, cut = 0, rows = ROUND) => {
    f.part('eye', { flat: true, rim: false });
    f.rows(cx - 2, ey - 2, rows.map((r, j) => (j < cut ? '.....' : r)));
    if (rows !== ROUND) return;
    f.part('eyeS', { flat: true, rim: false });
    f.hl(cx - 1, cx + 1, ey + 2).px(cx - 2, ey + 1);
  };
  switch (mood) {
    case 'hurt':
      f.part('eye', { flat: true, rim: false });
      f.rows(ex[0] - 2, ey - 2, ['#....', '.##..', '...##', '.##..', '#....']);
      f.rows(ex[1] - 2, ey - 2, ['....#', '..##.', '##...', '..##.', '....#']);
      f.part('sweat', { shade: 'r', light: 't' });
      f.rows(hx + 9, hy - 9, ['.#.', '###', '###', '.#.']);
      break;
    case 'ko':
      f.part('eye', { flat: true, rim: false });
      for (const cx of ex) f.rows(cx - 2, ey - 2, ['#...#', '.#.#.', '..#..', '.#.#.', '#...#']);
      break;
    case 'happy':
      f.part('eye', { flat: true, rim: false });
      for (const cx of ex) f.rows(cx - 2, ey - 1, ['.###.', '#...#', '#...#']);
      break;
    case 'tsukkomi':
      // sharp: the top of each eye cut on a slant, a bright glint, the mouth open wide
      for (const [i, cx] of ex.entries()) {
        round(cx);
        f.part(shell, { flat: true });
        f.t(0);
        if (i === 0) f.hl(cx - 2, cx, ey - 2).px(cx - 2, ey - 1);
        else f.hl(cx, cx + 2, ey - 2).px(cx + 2, ey - 1);
        f.t(null);
        f.part('white', { flat: true, rim: false });
        f.px(cx, ey - 1).px(cx + 1, ey - 1);
      }
      f.part('mouth', { flat: true, rim: false });
      f.rows(hx - 2, hy + 6, ['####', '####', '.##.']);
      break;
    case 'surprised':
      for (const cx of ex) {
        round(cx);
        f.part('white', { flat: true, rim: false });
        f.rect(cx, ey - 2, 2, 2).px(cx - 1, ey + 1);
      }
      f.part('mouth', { flat: true, rim: false });
      f.rect(hx - 1, hy + 6, 2, 2);
      break;
    case 'shock':
      // な、なんやこれ……！: the eyes flash, rays off them
      for (const cx of ex) {
        round(cx);
        f.part('flash', { flat: true, rim: false });
        f.rect(cx - 1, ey - 1, 3, 3);
        f.part('white', { flat: true, rim: false });
        f.rect(cx, ey - 2, 2, 2);
      }
      f.part('mouth', { flat: true, rim: false });
      f.rows(hx - 1, hy + 6, ['##', '##', '##']);
      break;
    case 'gentle':
      // a soft smile: the eyes curve up underneath (にこっ), a small warm glint
      for (const cx of ex) {
        round(cx, 1, ['.....', '.###.', '#####', '##.##', '#...#']);
        f.part('white', { flat: true, rim: false });
        f.px(cx + 1, ey - 1);
      }
      break;
    case 'sad':
      // しんみり: a lid of shell over the top of each eye, drooping outward; the glint sinks
      for (const [i, cx] of ex.entries()) {
        round(cx, 2);
        f.part(shell, { flat: true });
        f.t(-1);
        if (i === 0) f.hl(cx - 2, cx - 1, ey).px(cx - 2, ey + 1);
        else f.hl(cx + 1, cx + 2, ey).px(cx + 2, ey + 1);
        f.t(null);
        f.part('white', { flat: true, rim: false });
        f.px(cx, ey + 1);
      }
      break;
    default:
      for (const cx of ex) {
        round(cx);
        f.part('white', { flat: true, rim: false });
        f.rect(cx, ey - 2, 2, 2);
      }
  }
  // the little nose line between the eyes
  f.retone(hx - 2, hy + 4, -1).retone(hx - 1, hy + 3, -1).retone(hx, hy + 3, -1).retone(hx + 1, hy + 4, -1);
  // the tusks, hanging over the tummy
  const ty = hy + 5;
  kanTusk(f, [[hx - 2, ty], [hx - 2, ty + 1], [hx - 3, ty + 2], [hx - 3, ty + 3], [hx - 3, ty + 4], [hx - 3, ty + 5], [hx - 4, ty + 6], [hx - 4, ty + 7], [hx - 4, ty + 8], [hx - 4, ty + 9]]);
  kanTusk(f, [[hx + 2, ty], [hx + 2, ty + 1], [hx + 3, ty + 2], [hx + 3, ty + 3], [hx + 3, ty + 4], [hx + 3, ty + 5], [hx + 3, ty + 6], [hx + 4, ty + 7], [hx + 4, ty + 8], [hx + 4, ty + 9]]);
  // cheeks
  if (!ko && mood !== 'sad') {
    f.part('cheek', { flat: true, rim: false });
    const cy = ey + 4;
    f.hl(ex[0] - 3, ex[0] - 1, cy).hl(ex[1] + 1, ex[1] + 3, cy);
    if (mood === 'happy' || mood === 'gentle' || mood === 'shock') {
      f.part('cheekL', { flat: true, rim: false });
      f.px(ex[0] - 4, cy).px(ex[1] + 4, cy);
    }
  }
  // a pincer hand: raised for the tsukkomi (なんでやねん), at his cheek in shock
  if (mood === 'tsukkomi') kanHand(f, 27, 31, 28, 21);
  else if (mood === 'shock') kanHand(f, 3, 31, 3, 22);
  else if (mood === 'gentle') kanHand(f, 25, 31, 24, 26);
  if (mood === 'happy') {
    f.part('glow', { flat: true, rim: false, ol: false });
    f.px(4, 4).px(27, 3).px(28, 4).px(27, 5).px(26, 4);
  }
  const sky = SKY_KAN[mood];
  const out = compose(mood === 'shock' ? 'surprised' : sky ? 'normal' : mood, f, sky);
  if (mood === 'shock') {
    // ぱっ: short rays off the eyes
    const g = out.getContext('2d')!;
    g.fillStyle = '#FFF6D8';
    for (const [x, y, w, h] of [[1, 12, 3, 1], [2, 9, 2, 1], [28, 12, 3, 1], [28, 9, 2, 1]] as [number, number, number, number][]) g.fillRect(x, y, w, h);
  }
  return out;
}

registerPortrait('kanenari', (mood) => kanenari(KAN_MOODS.includes(mood) ? mood : KAN_ALIAS[mood] ?? 'normal'));

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

/** Adult face on the shared layout (eyes y14–15, mouth y19–20). */
function adultFace(f: Fig, skin: string, wide = 0) {
  f.part(skin, { shade: 'r', light: '' });
  f.rect(13, 21, 6, 5);
  f.part(skin, { flat: true });
  f.t(-1).hl(13, 18, 21).hl(14, 17, 22).t(null);
  // ears
  f.part(skin, { shade: 'rb', light: '' });
  f.rect(7 - wide, 13, 2, 4).rect(23 + wide, 13, 2, 4);
  // face
  f.part(skin, { shade: 'rb', light: '' });
  const spans: [number, number][] = [[12, 19], [10, 21], [9, 22], [9, 22], [9, 22], [9, 22], [9, 22], [9, 22], [9, 22], [9, 22], [9, 22], [10, 21], [11, 20], [12, 19], [13, 18]];
  spans.forEach(([a, b], j) => f.hl(a - wide, b + wide, 8 + j));
  f.part(skin, { flat: true });
  f.t(-1).px(22 + wide, 18).px(21 + wide, 19).px(20 + wide, 20).px(19 + wide, 21).t(1).px(10 - wide, 11).px(10 - wide, 12).t(null);
}

function adultEyes(f: Fig, mood: string, narrow = false) {
  f.part('eye', { flat: true, rim: false });
  if (mood === 'happy') {
    f.px(11, 15).px(12, 14).px(13, 15).px(18, 15).px(19, 14).px(20, 15);
  } else if (mood === 'surprised') {
    f.part('white', { flat: true, rim: false });
    f.rect(11, 13, 3, 3).rect(18, 13, 3, 3);
    f.part('eye', { flat: true, rim: false });
    f.px(12, 14).px(19, 14).hl(11, 13, 12).hl(18, 20, 12);
  } else if (narrow) {
    f.hl(11, 13, 15).hl(18, 20, 15);
  } else {
    f.rect(11, 14, 2, 2).rect(19, 14, 2, 2);
    f.part('white', { flat: true, rim: false });
    f.px(11, 14).px(19, 14);
  }
}

// 母: hair pulled back into one ponytail (red band), ivory blouse, mustard apron
npcPortrait('npc_mother', {
  sky: { top: '#FFE7C8', bot: '#F7C27A' },
  mats: {
    skin: mat('#F7CFAE', { shade: '#E0A882', light: '#FFE4CC', dark: '#B87A5E', rim: '#FFBC8A' }),
    hair: mat('#2B1E1A', { shade: '#1B1733', dark: '#1B1733', light: '#5A3A2A', spec: '#8A5A3A' }),
    blouse: mat('#E8E4D8', { shade: '#C4BCB0', light: '#FAF6EC', dark: '#9A9088', rim: '#FFD6A8' }),
    apron: mat('#F7C27A', { shade: '#D9974A', light: '#FFDCA0', dark: '#A8702E' }),
    band: flat('#B8302A'),
    eye: flat('#2A2440'),
    white: flat('#FFF6D8'),
    brow: flat('#4A322C'),
    lip: flat('#C0705E'),
    lipD: flat('#8A3A3A'),
    blush: flat('#F4A08C'),
  },
  draw: (f, mood) => {
    // ponytail behind the head (her left, screen right)
    f.part('hair', { shade: 'rb', light: 't' });
    f.rows(22, 9, ['..##.', '.####', '#####', '#####', '.####', '.###.', '..##.', '..#..']);
    f.part('band', { flat: true, rim: false });
    f.px(23, 10).px(24, 10);
    // shoulders: blouse + apron bib and straps
    f.part('blouse', { shade: 'rb', light: 't' });
    f.poly([[1, 32], [3, 27.5], [10, 25], [22, 25], [29, 27.5], [31, 32]]);
    f.part('apron', { shade: 'rb', light: 't' });
    f.poly([[9, 32], [10, 28], [22, 28], [23, 32]]);
    f.rect(8, 25, 2, 4).rect(22, 25, 2, 4);
    adultFace(f, 'skin');
    // hair: smooth cap, side part on the viewer's left, pulled back behind the ears
    f.part('hair', { shade: '', light: '' });
    f.rows(7, 3, [
      '.....HHhhhhd......',
      '...HHKKHhhhhhd....',
      '..HKKHhhhhhhhhd...',
      '.HHHhhhhhhhhhhhd..',
      '.HHhhhhdhhhhhhhdd.',
      'HHhhhd...dhhhhhhd.',
      'Hhhd.......dhhhhd.',
      'hhd..........dhhd.',
      'hd............dhd.',
      'hd.............hd.',
      'd..............d..',
    ]);
    adultEyes(f, mood);
    f.part('brow', { flat: true, rim: false });
    if (mood !== 'surprised') f.hl(10, 13, 12).hl(18, 21, 12);
    else f.hl(10, 13, 11).hl(18, 21, 11);
    f.part('lip', { flat: true, rim: false });
    if (mood === 'surprised') {
      f.part('lipD', { flat: true, rim: false });
      f.rect(15, 19, 2, 2);
    } else if (mood === 'happy') {
      f.part('lipD', { flat: true, rim: false });
      f.hl(14, 17, 19);
      f.part('lip', { flat: true, rim: false });
      f.hl(15, 16, 20);
    } else f.hl(14, 17, 19);
    f.part('blush', { flat: true, rim: false });
    f.hl(10, 11, 17).hl(20, 21, 17);
  },
});

// おばあ: white bun, kind narrow eyes, kappougi, glasses on a gold chain
npcPortrait('npc_obaa', {
  sky: { top: '#FFE7C8', bot: '#E8C890' },
  mats: {
    skin: mat('#F2C8A8', { shade: '#D8A688', light: '#FFE0C8', dark: '#A87A62', rim: '#FFBC90' }),
    hair: mat('#E8E4D8', { shade: '#B8B0A6', light: '#FFF6D8', dark: '#8E887E', spec: '#FFF6D8', rim: '#FFD8B0' }),
    smock: mat('#F4F1E8', { shade: '#CFC8BC', light: '#FFF6D8', dark: '#9E978C', rim: '#FFDCB4' }),
    chain: flat('#D9A441'),
    glass: flat('#9AA0A8'),
    lens: flat('#E8F4F8'),
    pen: flat('#E23B2E'),
    eye: flat('#2A2440'),
    white: flat('#FFF6D8'),
    line: flat('#C8927A'),
    lip: flat('#B06A5A'),
    blush: flat('#F4A08C'),
  },
  draw: (f, mood) => {
    f.part('smock', { shade: 'rb', light: 't' });
    f.poly([[1, 32], [3, 28], [10, 25.5], [22, 25.5], [29, 28], [31, 32]]);
    f.part('smock', { flat: true });
    f.t(-1).px(15, 26).px(16, 27).px(15, 28).px(16, 29).t(null);
    f.part('pen', { flat: true, rim: false });
    f.vl(23, 27, 29);
    f.part('chain', { flat: true, rim: false });
    f.px(11, 26).px(12, 27).px(12, 28).px(20, 26).px(19, 27).px(19, 28);
    f.part('glass', { flat: true, rim: false });
    f.rows(11, 29, ['###..###', '#l#..#l#', '###..###'], { l: 'lens' });
    f.hl(14, 16, 30);
    adultFace(f, 'skin');
    // soft white hair with a bun on top
    f.part('hair', { shade: 'rb', light: 't' });
    f.ell(16, 3.5, 4, 3);
    f.part('hair', { shade: '', light: '' });
    f.rows(7, 5, [
      '....HHHhhhhh......',
      '..HHKHhhhhhhhd....',
      '.HKHhhhhhhhhhhd...',
      '.HHhhhdhhhhdhhhd..',
      'HHhhd........dhhd.',
      'Hhd............dd.',
      'hd..............d.',
      'd...............d.',
    ]);
    f.part('hair', { flat: true });
    f.t(-1).px(15, 5).px(16, 4).t(null);
    // kind narrow eyes and laugh lines
    adultEyes(f, mood, true);
    // wrinkles as short strokes in the skin-shadow colour (no scattered
    // single pixels): crow's feet fanning from the eye corners, laugh lines
    // from the nose to the mouth corners, one soft line across the forehead
    f.part('line', { flat: true, rim: false });
    f.px(10, 14).px(9, 13).px(21, 14).px(22, 13);
    f.px(13, 17).px(12, 18).px(18, 17).px(19, 18);
    f.hl(13, 18, 10);
    f.part('lip', { flat: true, rim: false });
    if (mood === 'surprised') f.rect(15, 19, 2, 1);
    else f.hl(14, 17, 20).px(13, 19).px(18, 19);
    f.part('blush', { flat: true, rim: false });
    f.hl(10, 11, 17).hl(20, 21, 17);
  },
});

// たかし: tall toque, thick brows, tanned wide face, towel round the neck
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
    stubble: flat('#C49070'),
  },
  draw: (f, mood) => {
    f.part('coat', { shade: 'rb', light: 't' });
    f.poly([[0, 32], [1, 27], [8, 24.5], [24, 24.5], [31, 27], [32, 32]]);
    f.part('apron', { shade: 'rb', light: 't' });
    f.poly([[8, 32], [9, 28], [23, 28], [24, 32]]);
    adultFace(f, 'skin', 1);
    f.part('towel', { shade: 'b', light: '' });
    f.poly([[8, 24], [24, 24], [22, 27.5], [10, 27.5]]);
    f.part('towel', { flat: true });
    f.t(-1).px(12, 26).px(20, 26).t(null);
    // short sideburns under the toque
    f.part('hair', { shade: 'r', light: '' });
    f.rect(8, 9, 2, 5).rect(22, 9, 2, 5);
    // tall toque: pleated band + puffed crown
    f.part('hat', { shade: 'rb', light: 't' });
    f.rect(8, 6, 16, 4);
    f.ell(16, 3.5, 10, 4);
    f.part('hat', { flat: true });
    f.t(-1).vl(11, 6, 9).vl(14, 6, 9).vl(17, 6, 9).vl(20, 6, 9).px(12, 2).px(19, 2).px(16, 4).t(-2).hl(8, 23, 9).t(null);
    // thick 2px brows
    f.part('brow', { flat: true, rim: false });
    const lift = mood === 'surprised' ? -1 : 0;
    f.rect(9, 11 + lift, 5, 2).rect(18, 11 + lift, 5, 2);
    // small serious eyes
    f.part('eye', { flat: true, rim: false });
    if (mood === 'happy') f.px(10, 15).px(11, 14).px(12, 15).px(19, 15).px(20, 14).px(21, 15);
    else if (mood === 'surprised') {
      f.part('white', { flat: true, rim: false });
      f.rect(10, 13, 3, 3).rect(19, 13, 3, 3);
      f.part('eye', { flat: true, rim: false });
      f.px(11, 14).px(20, 14);
    } else f.rect(11, 14, 2, 1).rect(19, 14, 2, 1);
    f.part('nose', { flat: true, rim: false });
    f.px(15, 17).px(16, 17);
    f.part('stubble', { flat: true, rim: false });
    for (const x of [11, 13, 18, 20]) f.px(x, 20);
    f.part('lip', { flat: true, rim: false });
    if (mood === 'happy') f.hl(12, 19, 19).hl(13, 18, 20);
    else if (mood === 'surprised') f.rect(15, 19, 2, 2);
    else f.hl(13, 18, 19);
  },
});
