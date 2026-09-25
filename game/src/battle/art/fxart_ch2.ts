// Effect sprites for the chapter-2 battles (51 8〜10章, 14章): the silver
// 100円 coin (no real coin design), the pushed cucumber, clods of earth and
// mud, the fence's lightning, straw, the name tag the boss throws, the lit
// train window, steam, the glare icon, the tomato in the net and the tags.

import { PixelCanvas } from '../../engine/pixel';

const P: Record<string, string> = {
  k: '#2A2440',
  K: '#0B0B14',
  w: '#F4F1E8',
  W: '#FFFFFF',
  H: '#FFF6D8',
  s: '#C8C2B4',
  S: '#8E95A6',
  g: '#9AA0A8',
  G: '#6B7186',
  c: '#3F7A3A',
  C: '#5FA85A',
  j: '#9BCB6B',
  J: '#E8F4D8',
  d: '#6B5A4A',
  D: '#4A3A2A',
  e: '#8A6A4A',
  y: '#FFD23F',
  Y: '#FFE7A3',
  n: '#7CFF9A',
  o: '#F2894B',
  O: '#F7C27A',
  r: '#E84E3C',
  R: '#B8241E',
  l: '#FF6A4D',
  t: '#F6D98A',
  b: '#5A3A22',
  B: '#3A2616',
  h: '#E8C878',
  i: '#B89848',
  m: '#3FA66B',
  M: '#2E6B4A',
  p: '#E8D8B0',
  q: '#D8B888',
  Q: '#C8A06A',
  a: '#F4D2B0',
  A: '#D8A888',
};

const cache = new Map<string, HTMLCanvasElement>();
function spr(key: string, rows: string[], outline?: string): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    const p = PixelCanvas.fromArt(rows, P);
    if (outline) {
      const q = new PixelCanvas(p.w + 2, p.h + 2);
      q.blit(p, 1, 1);
      q.outline(outline);
      c = q.toCanvas();
    } else c = p.toCanvas();
    cache.set(key, c);
  }
  return c;
}

/**
 * The silver 100円 coin in four spin frames (face, three-quarter, edge,
 * three-quarter back). A plain ring and "100" dots only — no real design.
 */
export function silverCoin(frame: number): HTMLCanvasElement {
  const f = ((frame % 4) + 4) % 4;
  const rows = [
    ['..kkkkk..', '.kwwwssk.', 'kwHsssssk', 'kwsSwwSsk', 'kwsw.wSsk', 'kssSwwSSk', 'ksssssSSk', '.kSSSSSk.', '..kkkkk..'],
    ['...kkk...', '..kwwsk..', '.kwHssSk.', '.kwSwSSk.', '.kwwSwSk.', '.kssSSSk.', '.ksssSSk.', '..kSSSk..', '...kkk...'],
    ['....k....', '...kHk...', '...kwk...', '...kwk...', '...ksk...', '...ksk...', '...kSk...', '...kSk...', '....k....'],
    ['...kkk...', '..kswwk..', '.kSsswwk.', '.kSSwSwk.', '.kSwSwwk.', '.kSSSssk.', '.kSSsssk.', '..kSSSk..', '...kkk...'],
  ][f];
  return spr('silver' + f, rows, '#FFF6D8');
}

/** The cucumber ムジン販売員 pushes at you (bumpy green, a paler tip). */
export const cucumber = (): HTMLCanvasElement =>
  spr('cucumber', [
    '....kkkk.........',
    '..kkcCCCkkkk.....',
    '.kcCjCCjCCCCkkk..',
    'kcCCCjCCCjCCCCjk.',
    'kcjCCCCjCCCCjCCCk',
    '.kccCccCcccCccCck',
    '..kkcccccccccckk.',
    '....kkkkkkkkkk...',
  ]);

/** Clods of earth (2 sizes) with a lit top edge. */
export const clodS = (): HTMLCanvasElement => spr('clodS', ['.kk.', 'kedk', 'kddk', '.kk.']);
export const clodL = (): HTMLCanvasElement => spr('clodL', ['.kkk.', 'keedk', 'kdddk', 'kdDDk', '.kkk.']);
/** A clod with a blade of grass stuck to it (ロータリー). */
export const clodGrass = (): HTMLCanvasElement => spr('clodG', ['..C..', '.kCk.', 'kedCk', 'kdddk', '.kkk.']);

/** A splash of mud (ヌタうち). */
export const mudDrop = (i: number): HTMLCanvasElement =>
  i % 2 ? spr('mud1', ['.k.', 'kdk', 'kDk', '.k.']) : spr('mud0', ['.kk', 'kdk', 'kk.']);

/** Straw bits (被弾 of the scarecrow, the ボケD straw). */
export const straw = (i: number): HTMLCanvasElement => (i % 2 ? spr('straw1', ['hh.', '.ih']) : spr('straw0', ['h.', 'ih', '.h']));

/** The name tag (10×6) the boss throws; also the flowing tags of bg_h_boss. */
export const nameTag = (): HTMLCanvasElement =>
  spr('nametag', ['kkkkkkkkkkkk', 'kwwwwwwwwwwk', 'kwggggggwwwk', 'kwwwwwwwwwwk', 'kwgggggwwrwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk']);

/** A lit train window (6×4) sliding out of the east ラッパ. */
export const trainWindow = (): HTMLCanvasElement => spr('trainwin', ['kkkkkkkk', 'ktttttYk', 'kttYtttk', 'kttttttk', 'kOOOOOOk', 'kkkkkkkk']);

/** 8×8 boar head (the one チョトツ glares at): dark bristles, one white tusk. */
export const boarIcon = (): HTMLCanvasElement =>
  spr('boarIcon', ['...bb.b.', '..bbbbbB', '.bbbbbbB', 'dbbWbbbB', 'dddbbbB.', 'd.WbbB..', '.Wd.B...', '........'], '#FFF6D8');

/** The raised-hand icon of へんじ中 (10×10: glove #F4D2B0, a vermilion dot). */
export const henjiHand = (): HTMLCanvasElement =>
  spr('henji', [
    '..k.k.k...',
    '.kakakak..',
    '.kakakakk.',
    '.kaaaaakak',
    '.kaaaaaaAk',
    '.kaaaaaAk.',
    '..kaaaAk..',
    '..kaaarAk.',
    '..kaaaAk..',
    '...kkkk...',
  ]);

/** The lightning bolt (8×10) that jolts a member's panel (ビリビリ番の感電). */
export const bolt = (): HTMLCanvasElement =>
  spr('bolt', ['....kkk.', '...kyHk.', '..kyHk..', '.kyHkkk.', 'kyHHHyk.', 'kkkyHk..', '..kyk...', '.kyk....', '.kk.....', 'k.......'], undefined);

/**
 * The tomato in the net's hoop (12×12, 52 13.3): red with a leaf-green
 * calyx, a cream gloss and the はなまる star mark on its bottom. `state`:
 * 'ready' (bright), 'lit' (glowing orange), 'charge' (dull red-brown).
 */
export function tomatoIcon(state: 'ready' | 'lit' | 'charge'): HTMLCanvasElement {
  const base = [
    '....kmMk....',
    '..kkMmmMkk..',
    '.kRRkjrrRRk.',
    '.klllHrrrrk.',
    'klllHrrrrrrk',
    'kllrrrrrrrrk',
    'klrrrrrrrrRk',
    'klrwrrrrrwRk',
    '.krrwrrrwRk.',
    '..krrwwwRk..',
    '...krrwRk...',
    '....kkkk....',
  ];
  const pal: Record<string, string> =
    state === 'lit'
      ? { r: '#F2894B', R: '#C8643A', l: '#F7C27A', H: '#FFF6D8', w: '#FFE7A3' }
      : state === 'charge'
        ? { r: '#8A3A2A', R: '#5A2418', l: '#A8503A', H: '#C88A6A', w: '#B0705A' }
        : { r: '#E84E3C', R: '#B8241E', l: '#FF6A4D', H: '#FFF6D8', w: '#F4F1E8' };
  const key = 'tomato:' + state;
  let c = cache.get(key);
  if (!c) {
    const p = PixelCanvas.fromArt(base, { ...P, ...pal });
    c = p.toCanvas();
    cache.set(key, c);
  }
  return c;
}

/**
 * Minato's net held up with the glowing tomato in its hoop (for the raise
 * and the marker over the panel): 16 wide, `h` tall (the pole below).
 */
export function tomatoNet(h = 40, glow = true): HTMLCanvasElement {
  const key = `tnet:${h}:${glow}`;
  let c = cache.get(key);
  if (c) return c;
  const p = new PixelCanvas(20, h);
  // pole (2px, lit left edge)
  for (let y = 18; y < h; y++) {
    p.set(9, y, '#E8C890');
    p.set(10, y, '#9A7448');
  }
  // the net bag hanging from the hoop, tomato inside
  const t = PixelCanvas.fromArt(
    [
      '....kmMk....',
      '..kkMmmMkk..',
      '.kRRkjrrRRk.',
      '.klllHrrrrk.',
      'klllHrrrrrrk',
      'kllrrrrrrrrk',
      'klrrrrrrrrRk',
      'klrwrrrrrwRk',
      '.krrwrrrwRk.',
      '..krrwwwRk..',
      '...krrwRk...',
      '....kkkk....',
    ],
    glow ? { ...P, r: '#F2894B', R: '#E8603C', l: '#FFB878', H: '#FFF6D8', w: '#FFE7A3' } : { ...P, r: '#E84E3C', R: '#B8241E', l: '#FF6A4D', H: '#FFF6D8', w: '#F4F1E8' },
  );
  p.blit(t, 4, 5);
  // hoop ring (ellipse seen a little from below) and its mesh
  for (let a = 0; a < 48; a++) {
    const an = (a / 48) * Math.PI * 2;
    const x = Math.round(10 + Math.cos(an) * 8.5);
    const y = Math.round(10 + Math.sin(an) * 8.5);
    p.set(x, y, a % 12 === 3 ? '#FFFFFF' : '#F4F1E8');
  }
  for (let y = 3; y < 18; y++)
    for (let x = 2; x < 19; x++) {
      if ((x - 10) ** 2 + (y - 10) ** 2 > 60) continue;
      if ((x + y) % 3 === 0 && p.alpha(x, y) && (x + y * 2) % 2 === 0) p.set(x, y, '#E8E4D8');
    }
  p.outline('#2A2440');
  c = p.toCanvas();
  cache.set(key, c);
  return c;
}

/** Steam line puff (3×7, drawn with alpha by the caller). */
export const steamLine = (i: number): HTMLCanvasElement =>
  i % 2 ? spr('steam1', ['.w.', 'w..', '.w.', '..w', '.w.', 'w..', '.w.']) : spr('steam0', ['.w.', '..w', '.w.', 'w..', '.w.', '..w', '.w.']);

/** The small grey fret cloud of a sulking tomato (6×5, #9AA0A8). */
export const moyamoya = (): HTMLCanvasElement => spr('moya', ['.gg.g.', 'gSggSg', 'g.g.gg', '.gSgg.', '..g...'].map((r) => r.replace(/S/g, 'G')));

/** Headlight fan tip sparkle / CD cross glint (7×7). */
export const crossGlint = (): HTMLCanvasElement =>
  spr('xglint', ['...H...', '...H...', '..HWH..', 'HHWWWHH', '..HWH..', '...H...', '...H...']);

/** A bolt (2×2 + outline) flying off the tiller when hit. */
export const boltNut = (): HTMLCanvasElement => spr('nut', ['kk', 'wg']);
