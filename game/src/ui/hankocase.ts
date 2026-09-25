// The wooden hanko case (30_level_art 10.7, 20_systems_battle 18.5): 192×104,
// wood #A8742A (light #D9A441, shade #6A4A2A), red velvet lining, 10 slots
// (5×2, 32×32, 4px apart). Owned stamps lie in their slots on a little paper
// sample card with their imprint in 朱; empty slots show a faint dotted
// outline; the おやすみなさい slot shows its outline only after the ending.
// 第2章 (51 5.4, 52 13.4): おつかれさま fills the 7th slot, おやすみなさい the
// 6th (its outline since chapter 1) and いただきます shows as an outline in the
// 8th once chapter 2 is cleared. Used by the menu (ハンコ), the learn scene
// and the ending notebooks.

import type { Gfx } from '../engine/gfx';
import { makeCanvas, PixelCanvas } from '../engine/pixel';
import { hash2 } from '../engine/rng';
import { hanamaruFrame, ovalStamp, pekeMark } from '../battle/art/stamps';
import { flag } from '../game/state';
import { rectA, UI } from './window';

export const CASE_W = 192;
export const CASE_H = 104;
/**
 * Slot order (5×2, 51 5.4 HANKO_CASE_ORDER). Index 5 is the おやすみなさい
 * slot (an outline from chapter 1's ending), 6 おつかれさま, 7 the いただきます
 * outline (after chapter 2), 8–9 empty.
 */
export const CASE_SLOTS: (string | null)[] = [
  'skill_mimashita',
  'skill_peke',
  'skill_hanamaru',
  'skill_yarinaoshi',
  'skill_okaerinasai',
  'skill_oyasuminasai',
  'skill_otsukaresama',
  'skill_itadakimasu',
  null,
  null,
];

/** Slots that show a breathing outline before they are filled: おやすみなさい, いただきます. */
export function outlineShown(id: string | null, clear: boolean): boolean {
  if (id === 'skill_oyasuminasai') return clear || !!flag('flag_clear');
  if (id === 'skill_itadakimasu') return !!flag('flag_ch2_clear');
  return false;
}

export function slotXY(i: number): [number, number] {
  return [8 + (i % 5) * 36, 12 + Math.floor(i / 5) * 40];
}

let bodyC: HTMLCanvasElement | null = null;
let lidC: HTMLCanvasElement | null = null;

const WOOD = ['#6A4A2A', '#8A5A2A', '#A8742A', '#C08A38', '#D9A441'];

function woodFill(p: PixelCanvas, w: number, h: number, seed: number): void {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const grain = Math.sin(y * 0.9 + Math.sin(x * 0.07 + seed) * 3 + hash2(x >> 3, y >> 1, seed) * 1.2);
      let v = 0.55 + grain * 0.12 - (x / w) * 0.18 - (y / h) * 0.1;
      if (y < 2 || x < 2) v += 0.25;
      if (y > h - 3 || x > w - 3) v -= 0.25;
      p.set(x, y, WOOD[Math.max(0, Math.min(4, Math.floor(v * 5)))]);
    }
}

/** Case body with velvet and the 10 recessed slots. */
export function caseBody(): HTMLCanvasElement {
  if (bodyC) return bodyC;
  const W = CASE_W;
  const H = CASE_H;
  const p = new PixelCanvas(W, H);
  woodFill(p, W, H, 4);
  const vel = ['#4A1620', '#6A1E28', '#8A2E3A', '#A8404C'];
  for (let y = 5; y < H - 5; y++)
    for (let x = 5; x < W - 5; x++) {
      const n = hash2(x, y, 9);
      const v = 0.55 - ((x - 5) / (W - 10)) * 0.15 + (n - 0.5) * 0.2;
      p.set(x, y, vel[Math.max(0, Math.min(3, Math.floor(v * 4)))]);
    }
  p.hline(5, W - 6, 5, '#3A0E16');
  p.vline(5, 5, H - 6, '#3A0E16');
  p.hline(5, W - 6, H - 6, '#C08A38');
  p.vline(W - 6, 5, H - 6, '#C08A38');
  for (let k = 0; k < 10; k++) {
    const [sx, sy] = slotXY(k);
    p.rect(sx, sy, 32, 32, '#5A1822');
    p.hline(sx, sx + 31, sy, '#3A0E16');
    p.vline(sx, sy, sy + 31, '#3A0E16');
    p.hline(sx + 1, sx + 31, sy + 31, '#A8404C');
    p.vline(sx + 31, sy + 1, sy + 31, '#A8404C');
    for (let y = sy + 2; y < sy + 30; y++) for (let x = sx + 2; x < sx + 30; x++) if (hash2(x, y, 2) < 0.08) p.set(x, y, '#6A2230');
  }
  brassPlate(p, W / 2 - 24, H - 18);
  p.strokeRect(0, 0, W, H, UI.border);
  p.set(0, 0, 'transparent');
  p.set(W - 1, 0, 'transparent');
  p.set(0, H - 1, 'transparent');
  p.set(W - 1, H - 1, 'transparent');
  bodyC = p.toCanvas();
  return bodyC;
}

/**
 * The brass plate under the slots (48×11): chamfered corners, a bevel lit
 * from the top left, brushed grain, a slotted screw at each end and the
 * case's bell crest engraved in the middle between two engraved rules — cut
 * lines are dark on their upper edge and catch the light on the lower one.
 */
function brassPlate(p: PixelCanvas, x0: number, y0: number): void {
  const w = 48;
  const h = 11;
  const RIM = '#6A4A1A';
  const DARK = '#8A5A2A';
  const MID = '#C08A38';
  const BODY = '#D9A441';
  const LIGHT = '#F6D98A';
  const SHINE = '#FFF1C4';
  // a shadow on the velvet, down and right
  p.hline(x0 + 2, x0 + w, y0 + h, '#3A0E16');
  p.vline(x0 + w, y0 + 2, y0 + h - 1, '#3A0E16');
  // the plate, corners cut at 45°
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const cut = Math.min(x, w - 1 - x) + Math.min(y, h - 1 - y);
      if (cut < 1) continue;
      let c = BODY;
      if (cut === 1) c = RIM;
      else if (y === 1 || x === 1 || (cut === 2 && (x < w / 2 ? y < h / 2 : y < 2))) c = LIGHT;
      else if (y === h - 2 || x === w - 2) c = DARK;
      else if (hash2(x >> 2, y, 19) < 0.22) c = MID; // brushed grain, in short strokes
      p.set(x0 + x, y0 + y, c);
    }
  // a glint along the top bevel, near the left
  p.hline(x0 + 4, x0 + 9, y0 + 1, SHINE);
  // slotted screws: a lit dome, the slot cut across it
  for (const sx of [x0 + 3, x0 + w - 6]) {
    const sy = y0 + 4;
    p.set(sx + 1, sy, LIGHT);
    p.set(sx, sy + 1, LIGHT);
    p.set(sx + 1, sy + 1, MID);
    p.set(sx + 2, sy + 1, DARK);
    p.set(sx + 1, sy + 2, DARK);
    p.set(sx, sy + 2, RIM);
    p.set(sx + 2, sy, RIM);
  }
  // the engraved bell crest (as inlaid on the lid), centred
  const bell = ['..#..', '.###.', '.###.', '.###.', '#####', '..#..'];
  const bx = x0 + Math.floor(w / 2) - 2;
  const by = y0 + 2;
  bell.forEach((row, y) =>
    [...row].forEach((v, x) => {
      if (v !== '#') return;
      p.set(bx + x, by + y, DARK);
      // the cut's lower lip catches the light
      if (bell[y + 1]?.[x] !== '#') p.set(bx + x, by + y + 1, LIGHT);
    }),
  );
  // engraved rules either side of the crest
  for (const [a, b] of [
    [x0 + 9, bx - 3],
    [bx + 8, x0 + w - 10],
  ]) {
    p.hline(a, b, y0 + 5, DARK);
    p.hline(a, b, y0 + 6, LIGHT);
  }
}

/** The closed lid (brass clasp, bell crest inlay). */
export function caseLid(): HTMLCanvasElement {
  if (lidC) return lidC;
  const W = CASE_W;
  const H = CASE_H;
  const p = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const grain = Math.sin(y * 0.8 + Math.sin(x * 0.05 + 1) * 4 + hash2(x >> 3, y >> 1, 7));
      let v = 0.6 + grain * 0.12 - (x / W) * 0.2 - (y / H) * 0.12;
      const inset = x > 10 && x < W - 10 && y > 10 && y < H - 10;
      if (inset && (x === 11 || y === 11)) v -= 0.25;
      if (inset && (x === W - 11 || y === H - 11)) v += 0.2;
      p.set(x, y, WOOD[Math.max(0, Math.min(4, Math.floor(v * 5)))]);
    }
  p.rect(W / 2 - 8, H - 12, 16, 10, '#A8742A');
  p.rect(W / 2 - 7, H - 11, 14, 8, '#D9A441');
  p.hline(W / 2 - 6, W / 2 + 5, H - 10, '#F6D98A');
  p.rect(W / 2 - 2, H - 8, 4, 3, '#6A4A1A');
  p.ellipse(W / 2, H / 2 - 6, 12, 12, '#8A5A2A');
  p.ellipse(W / 2, H / 2 - 6, 10, 10, '#C08A38');
  p.poly([[W / 2 - 6, H / 2], [W / 2 + 6, H / 2], [W / 2 + 4, H / 2 - 12], [W / 2 - 4, H / 2 - 12]], '#D9A441');
  p.rect(W / 2 - 1, H / 2 + 1, 2, 2, '#D9A441');
  p.strokeRect(0, 0, W, H, UI.border);
  p.set(0, 0, 'transparent');
  p.set(W - 1, 0, 'transparent');
  p.set(0, H - 1, 'transparent');
  p.set(W - 1, H - 1, 'transparent');
  lidC = p.toCanvas();
  return lidC;
}

let undoC: HTMLCanvasElement | null = null;
/** やりなおし: a red-pen arrow turning back on itself. */
function undoImprint(): HTMLCanvasElement {
  if (undoC) return undoC;
  const p = new PixelCanvas(22, 22);
  for (let i = 0; i < 90; i++) {
    const a = -Math.PI / 2 - (i / 90) * Math.PI * 1.65;
    const x = Math.round(11 + Math.cos(a) * 7.5);
    const y = Math.round(11 + Math.sin(a) * 7.5);
    p.set(x, y, UI.accent);
    p.set(x + 1, y, UI.accent);
  }
  // arrow head at the start (pointing clockwise = backwards)
  p.poly([[10, 0], [16, 3.5], [10, 7]], UI.accent);
  for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) if (p.alpha(x, y) && hash2(x, y, 6) < 0.06) p.set(x, y, 'transparent');
  undoC = p.toCanvas();
  return undoC;
}

/**
 * Hand-drawn 7×8 kana for the square seals (the 16px font scaled down that
 * far turns to mush, and a one-row oval of 「おかえり」 is 36px wide: too
 * big for its 32px slot).
 */
const KANA7: Record<string, string[]> = {
  お: ['.#...#.', '####..#', '.#.....', '.####..', '##...#.', '#.#...#', '#.#...#', '.#..##.'],
  か: ['.#.....', '.#...#.', '#####.#', '.#..#.#', '.#..#..', '.#..#..', '#...#..', '#..##..'],
  え: ['..###..', '.......', '######.', '....#..', '...#...', '..###..', '.#..#..', '#...###'],
  り: ['.#..#..', '.#...#.', '.#...#.', '.#...#.', '.##..#.', '.....#.', '....#..', '..##...'],
  や: ['..#....', '..#.##.', '#####.#', '.#....#', '.#.###.', '..#....', '..#....', '...#...'],
  す: ['....#..', '#######', '....#..', '..###..', '..#.#..', '..###..', '....#..', '..##...'],
  み: ['.####..', '....#..', '...#..#', '..#####', '.#.#..#', '#..#..#', '#.#...#', '.#...#.'],
};

let otsuC: HTMLCanvasElement | null = null;
/**
 * おつかれさま (52 13.4): the oval 「おつかれ」 (24×16) with three thin threads
 * of steam rising off it in 朱, like the steam off a cup of tea.
 */
function otsukareImprint(): HTMLCanvasElement {
  if (otsuC) return otsuC;
  const [c, ctx] = makeCanvas(24, 22);
  ctx.drawImage(ovalStamp('おつかれ', 24, 16, 0.06, 6), 0, 6);
  ctx.fillStyle = UI.accent;
  for (const [x0, ph] of [[7, 0], [12, 1.4], [17, 2.6]] as [number, number][])
    for (let y = 0; y < 6; y++) if (y !== 2 || x0 !== 12) ctx.fillRect(Math.round(x0 + Math.sin(y * 1.3 + ph) * 1.2), y, 1, 1);
  otsuC = c;
  return c;
}

let oyaC: HTMLCanvasElement | null = null;
/** おやすみなさい (52 13.4): the square 「おやすみ」 with five 1px stars round it. */
function oyasumiImprint(): HTMLCanvasElement {
  if (oyaC) return oyaC;
  const [c, ctx] = makeCanvas(26, 26);
  ctx.drawImage(squareSeal('おやすみ', 8), 1, 1);
  ctx.fillStyle = UI.accent;
  for (const [x, y] of [[8, 0], [17, 0], [0, 13], [25, 13], [13, 25]] as [number, number][]) ctx.fillRect(x, y, 1, 1);
  oyaC = c;
  return c;
}

let itaC: HTMLCanvasElement | null = null;
/** いただきます (52 13.4): only a round outline (22px) with lines too faint to read. */
function itadakiOutline(): HTMLCanvasElement {
  if (itaC) return itaC;
  const p = new PixelCanvas(22, 22);
  for (let a = 0; a < 96; a++) {
    const an = (a / 96) * Math.PI * 2;
    p.set(Math.round(11 + Math.cos(an) * 10), Math.round(11 + Math.sin(an) * 10), UI.accent);
    if (a % 3) p.set(Math.round(11 + Math.cos(an) * 9), Math.round(11 + Math.sin(an) * 9), UI.accent);
  }
  // strokes of two characters, blurred beyond reading
  for (const [x, y, w] of [[6, 7, 4], [12, 7, 4], [7, 10, 3], [13, 10, 3], [6, 13, 10], [8, 15, 6]] as [number, number, number][])
    for (let i = 0; i < w; i++) if (hash2(x + i, y, 4) < 0.7) p.set(x + i, y, UI.accent);
  itaC = p.toCanvas();
  return itaC;
}

const squareCache = new Map<string, HTMLCanvasElement>();
/**
 * A square 認め印 (24×24): a 2px rounded frame and four kana in two rows
 * (「おか／えり」), a little worn. Fits the 25px sample card with room to spare.
 */
function squareSeal(text: string, seed: number): HTMLCanvasElement {
  let c = squareCache.get(text);
  if (c) return c;
  const N = 24;
  const p = new PixelCanvas(N, N);
  const shu = UI.accent;
  const dark = UI.accentDark;
  // frame
  p.rect(1, 0, N - 2, 2, shu);
  p.rect(1, N - 2, N - 2, 2, shu);
  p.rect(0, 1, 2, N - 2, shu);
  p.rect(N - 2, 1, 2, N - 2, shu);
  p.set(2, 2, shu);
  p.set(N - 3, 2, shu);
  p.set(2, N - 3, shu);
  p.set(N - 3, N - 3, shu);
  // the kana, two by two
  const ch = [...text];
  ch.forEach((k, i) => {
    const rows = KANA7[k];
    if (!rows) return;
    const ox = 5 + (i % 2) * 8;
    const oy = 4 + Math.floor(i / 2) * 9;
    rows.forEach((row, y) => [...row].forEach((v, x) => v === '#' && p.set(ox + x, oy + y, shu)));
  });
  // ink tone and かすれ: the lower right presses a little darker, a few specks miss
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (!p.alpha(x, y)) continue;
      const n = hash2(x, y, seed * 13);
      if (n < 0.05) p.set(x, y, 'transparent');
      else if (x + y > N + 6 && n > 0.7) p.set(x, y, dark);
    }
  c = p.toCanvas();
  squareCache.set(text, c);
  return c;
}

/** The imprint of a stamp (朱), sized to sit on a 26×26 sample card. */
export function imprintFor(id: string): HTMLCanvasElement | null {
  switch (id) {
    case 'skill_mimashita':
      return ovalStamp('みました', 24, 16, 0.06, 3);
    case 'skill_peke':
      return pekeMark(20, 1);
    case 'skill_hanamaru':
      return hanamaruFrame(22, 1, false, 2);
    case 'skill_yarinaoshi':
      return undoImprint();
    case 'skill_okaerinasai':
      return squareSeal('おかえり', 5);
    case 'skill_oyasuminasai':
      return oyasumiImprint();
    case 'skill_otsukaresama':
      return otsukareImprint();
    case 'skill_itadakimasu':
      return itadakiOutline();
  }
  return null;
}

let cardC: HTMLCanvasElement | null = null;
/** Paper sample card lying in a slot (26×26, a little shadow on the velvet). */
function sampleCard(): HTMLCanvasElement {
  if (cardC) return cardC;
  const [c, ctx] = makeCanvas(28, 28);
  ctx.fillStyle = '#3A0E16';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(2, 2, 26, 26);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#E8D9B5';
  ctx.fillRect(0, 0, 26, 26);
  ctx.fillStyle = UI.bg;
  ctx.fillRect(0, 0, 25, 25);
  ctx.fillStyle = '#FFFBEE';
  ctx.fillRect(0, 0, 25, 1);
  cardC = c;
  return c;
}

export interface CaseView {
  owned: (id: string) => boolean;
  /** Show the おやすみなさい outline (after the ending). */
  clear: boolean;
  t: number;
  /** Selected slot (menu cursor), -1 none. */
  sel?: number;
  /** Per-slot rise-in progress (the ending / learn): slot → 0..1. */
  appear?: (i: number) => number;
}

/** Draw the open case with its contents at (x, y). */
export function drawCase(g: Gfx, x: number, y: number, v: CaseView): void {
  rectA(g, x + 3, y + 3, CASE_W, CASE_H, UI.night, 0.4);
  g.img(caseBody(), x, y);
  for (let i = 0; i < 10; i++) {
    const [sx, sy] = slotXY(i);
    const id = CASE_SLOTS[i];
    const ax = x + sx;
    const ay = y + sy;
    const own = !!id && id !== 'skill_itadakimasu' && v.owned(id);
    if (own) {
      const k = v.appear ? v.appear(i) : 1;
      if (k <= 0) continue;
      g.alpha(Math.min(1, k * 1.5), () => {
        g.img(sampleCard(), ax + 3, ay + 3);
        const imp = imprintFor(id!);
        if (imp) {
          const s = 1.3 - 0.3 * Math.min(1, k);
          const w = Math.round(imp.width * s);
          const h = Math.round(imp.height * s);
          g.ctx.drawImage(imp, Math.round(ax + 3 + 12.5 - w / 2), Math.round(ay + 3 + 12.5 - h / 2), w, h);
        }
      });
    } else if (outlineShown(id, v.clear)) {
      // the outline only, breathing slowly (α25%, 1 s)
      const a = 0.18 + 0.1 * (0.5 + 0.5 * Math.sin((v.t / 1000) * Math.PI * 2));
      g.alpha(a, () => {
        const imp = imprintFor(id!);
        if (imp) g.img(imp, ax + 3 + Math.round((25 - imp.width) / 2), ay + 3 + Math.round((25 - imp.height) / 2));
      });
      dottedRect(g, ax + 3, ay + 3, 26, 26, '#E8D9B5', 0.45);
    } else {
      dottedRect(g, ax + 4, ay + 4, 24, 24, '#C86A74', 0.55);
    }
    if (v.sel === i) {
      // the chosen slot glows vermilion
      const pulse = 0.55 + 0.35 * Math.sin(v.t / 160);
      g.alpha(pulse, () => {
        g.frame(ax - 1, ay - 1, 34, 34, UI.accentLight);
        g.frame(ax - 2, ay - 2, 36, 36, UI.accent);
      });
    }
  }
}

function dottedRect(g: Gfx, x: number, y: number, w: number, h: number, color: string, a: number): void {
  g.alpha(a, () => {
    for (let i = 0; i < w; i += 2) {
      g.px(x + i, y, color);
      g.px(x + i, y + h - 1, color);
    }
    for (let j = 0; j < h; j += 2) {
      g.px(x, y + j, color);
      g.px(x + w - 1, y + j, color);
    }
  });
}
