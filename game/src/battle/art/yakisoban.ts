// ヤキソバン（61 5.9・5.10・16.2・16.3）の 戦闘の 絵：
//  後ろ姿 48×56   店の 前の 像と 同じ 姿。頭は ソース焼きそばの 山盛り（麺・ソースの ディザ・青のり・
//                 てっぺんに 紅しょうが）、緑の ふろしきの マント、白い シャツに 赤い たすき、紺の ズボン、
//                 両手に 本物の 鉄の ヘラ（像で 塗らなかった 所なので いちばん 本物らしく）
//  ふり向いた 正面  ノリツッコミと 勝利だけ：ソワカが 描いた 黒い 大きな 口ひげ
//  顔 32×32       枠の 写真（館の 青い 光の 地に、麺の 山と 口ひげ）
//  わざの 絵       鉄板・ヘラ・山（枠の CT。各 10×8 前後）、コマンドの ヘラ・わざ・ツッコむ（16×16）
// こわく 見せない・けがを しない：被弾は 麺が 1本 ほつれる だけ、へばると 像の ポーズで 固まって
// つやが 消える（灰色に しない）。

import { PixelCanvas } from '../../engine/pixel';
import { registerPortrait } from '../../art/chars/registry';
import { CMD_ICONS, STATUS_ICON_ROWS } from './icons';
import { setTrioArt } from '../ui/panels';

const OL = '#2A2440';
const NOODLE = ['#B8904A', '#D8B060', '#E8C878', '#F4DC98'];
const SAUCE = '#8A5A2A';
const NORI = '#3F7A3A';
const BENI = '#E0567A';
const CAPE = ['#2A5A34', '#3F8A4A', '#5AA45E'];
const SHIRT = ['#C8C2B4', '#F4F1E8'];
const TASUKI = ['#A8302A', '#C8402E', '#D86A5A'];
const PANTS = ['#1E2840', '#2F3A5A'];
const STEEL = ['#4A4A55', '#8E95A6', '#C8CDD4', '#E8ECF0'];
const WOOD = '#8A5A3A';
const SKIN = ['#C8987A', '#E8B890'];

/** The noodle heap of the head (cx, top y, half width, height), lit from above. */
function heap(p: PixelCanvas, cx: number, y0: number, rw: number, h: number, seed: number, gloss = true): void {
  for (let y = 0; y < h; y++) {
    const k = y / Math.max(1, h - 1);
    const w = Math.round(rw * (0.45 + 0.55 * Math.sin(Math.min(1, k * 1.25) * Math.PI * 0.5)));
    for (let x = -w; x <= w; x++) {
      const wave = (x * 3 + y * 5 + seed) % 7;
      let c = NOODLE[1];
      if (wave < 2) c = NOODLE[0];
      else if (wave < 5) c = NOODLE[2];
      else if (gloss && y < h * 0.4) c = NOODLE[3];
      // the sauce's dither, deeper toward the bottom
      if ((x + y * 2 + seed) % 5 === 0 && k > 0.35) c = SAUCE;
      p.set(cx + x, y0 + y, c);
    }
  }
  // 青のり, and the 紅しょうが on the top
  for (let i = 0; i < 7; i++) p.set(cx - rw + 2 + ((i * 5 + seed) % (rw * 2 - 2)), y0 + 3 + ((i * 3) % Math.max(2, h - 4)), NORI);
  p.rect(cx - 1, y0 - 1, 3, 2, BENI);
  p.set(cx, y0 - 2, '#F08AA0');
}

/** A real iron spatula: the blade (worn dark at the edge), the wooden grip. */
function spatula(p: PixelCanvas, x: number, y: number, up: boolean, gloss: boolean): void {
  if (up) {
    p.rect(x, y, 5, 6, STEEL[1]);
    p.hline(x, x + 4, y, gloss ? STEEL[3] : STEEL[2]);
    p.vline(x, y, y + 5, STEEL[2]);
    p.hline(x, x + 4, y + 5, STEEL[0]);
    p.vline(x + 2, y + 6, y + 11, WOOD);
  } else {
    p.vline(x + 2, y, y + 5, WOOD);
    p.rect(x, y + 6, 5, 6, STEEL[1]);
    p.hline(x, x + 4, y + 6, gloss ? STEEL[3] : STEEL[2]);
    p.hline(x, x + 4, y + 11, STEEL[0]);
  }
}

export type YakiFrame = 'idle' | 'idle2' | 'step' | 'swing' | 'hit' | 'ko' | 'front' | 'pose';

const backCache = new Map<string, HTMLCanvasElement>();

/** ヤキソバンの 後ろ姿（48×56。足元が 下の 端）。'front'／'pose' は ふり向いた 正面（口ひげ）。 */
export function yakisobanBack(frame: YakiFrame = 'idle'): HTMLCanvasElement {
  const hit = backCache.get(frame);
  if (hit) return hit;
  const p = new PixelCanvas(48, 56);
  const gloss = frame !== 'ko';
  const front = frame === 'front' || frame === 'pose';
  const breath = frame === 'idle2' ? 1 : 0;
  const lean = frame === 'step' ? -2 : frame === 'swing' ? -3 : 0;
  const cx = 24 + lean;
  // legs: feet shoulder-wide, planted (the stance at the shop's griddle)
  p.rect(cx - 8, 44, 6, 12, PANTS[1]);
  p.rect(cx + 2, 44, 6, 12, PANTS[1]);
  p.vline(cx - 8, 44, 55, PANTS[0]);
  p.vline(cx + 7, 44, 55, PANTS[0]);
  p.rect(cx - 9, 54, 7, 2, '#2A2440');
  p.rect(cx + 2, 54, 7, 2, '#2A2440');
  // body: white shirt, the red sash across
  const by = 24 + breath;
  p.rect(cx - 10, by, 20, 21, SHIRT[1]);
  for (let y = by; y < by + 21; y++) p.set(cx + 9, y, SHIRT[0]);
  for (let i = 0; i < 22; i++) {
    const x = cx - 10 + i;
    const y = by + Math.round(i * 0.9);
    if (y < by + 21) {
      p.set(x, y, TASUKI[1]);
      p.set(x, y + 1, TASUKI[0]);
      if (i % 6 === 2) p.set(x, y, TASUKI[2]);
    }
  }
  if (!front) {
    // the green furoshiki cape over the back (the knot at the nape)
    for (let y = by - 2; y < by + 20; y++) {
      const w = 9 + Math.round((y - by) * 0.18);
      for (let x = -w; x <= w; x++) {
        let c = CAPE[1];
        if (x <= -w + 1) c = CAPE[0];
        else if (y < by + 1) c = CAPE[2];
        if ((x * 7 + y * 3) % 11 === 0) c = CAPE[0];
        p.set(cx + x, y, c);
      }
    }
    p.rect(cx - 3, by - 3, 6, 3, CAPE[0]);
    p.set(cx - 4, by - 2, CAPE[1]);
    p.set(cx + 3, by - 2, CAPE[1]);
  } else {
    // facing us: the face under the heap, the big black moustache Sowaka drew
    p.rect(cx - 6, by - 8, 12, 9, SKIN[1]);
    p.vline(cx + 5, by - 8, by, SKIN[0]);
    p.set(cx - 3, by - 6, OL);
    p.set(cx + 2, by - 6, OL);
    p.rect(cx - 7, by - 3, 14, 2, '#0B0B14');
    p.set(cx - 8, by - 2, '#0B0B14');
    p.set(cx + 7, by - 2, '#0B0B14');
    p.set(cx - 8, by - 4, '#0B0B14');
    p.set(cx + 7, by - 4, '#0B0B14');
    // the cape's two corners over the shoulders
    p.rect(cx - 11, by, 3, 8, CAPE[1]);
    p.rect(cx + 8, by, 3, 8, CAPE[0]);
  }
  // the noodle heap: the head (no face from behind), a strand at each temple
  heap(p, cx, 4 + breath, 10, 18, 3, gloss);
  if (!front) {
    p.vline(cx - 10, 16 + breath, 21 + breath, NOODLE[2]);
    p.vline(cx + 10, 16 + breath, 21 + breath, NOODLE[1]);
  }
  // hit: one strand frays loose and springs back
  if (frame === 'hit') {
    p.line(cx + 8, 8, cx + 14, 2, NOODLE[2]);
    p.set(cx + 15, 1, NOODLE[3]);
  }
  // arms and the two spatulas
  if (frame === 'swing') {
    // the spatulas sweep up (turning the noodles over)
    p.rect(cx - 15, by - 4, 4, 10, SHIRT[1]);
    p.rect(cx + 11, by - 4, 4, 10, SHIRT[0]);
    spatula(p, cx - 16, by - 16, true, gloss);
    spatula(p, cx + 11, by - 16, true, gloss);
  } else if (frame === 'pose') {
    // the statue's pose: one spatula up, one across the chest
    p.rect(cx + 11, by - 6, 4, 12, SHIRT[0]);
    spatula(p, cx + 11, by - 18, true, gloss);
    p.rect(cx - 14, by + 4, 4, 8, SHIRT[1]);
    spatula(p, cx - 15, by + 10, false, gloss);
  } else {
    p.rect(cx - 14, by + 2, 4, 12, SHIRT[1]);
    p.rect(cx + 10, by + 2, 4, 12, SHIRT[0]);
    spatula(p, cx - 15, by + 12, false, gloss);
    spatula(p, cx + 9, by + 12, false, gloss);
  }
  p.outline(OL);
  // 館の 光: the tank's blue from the back, a rim on the top and the sides
  if (gloss) {
    const src = p.data.slice();
    const on = (x: number, y: number) => x >= 0 && y >= 0 && x < 48 && y < 56 && src[y * 48 + x] >>> 24 !== 0;
    for (let y = 0; y < 56; y++)
      for (let x = 0; x < 48; x++) {
        if (!on(x, y) || src[y * 48 + x] === src[0]) continue;
        if (!on(x, y - 1) && y < 30) p.set(x, y, '#9FD8EC');
      }
  }
  const c = p.toCanvas();
  backCache.set(frame, c);
  return c;
}

// ---- the panel photo (32×32) ------------------------------------------------------------

const MOOD_SKY: Record<string, [string, string]> = {
  normal: ['#2E4A6A', '#1E2A3A'],
  happy: ['#F7C27A', '#F2894B'],
  tsukkomi: ['#FFE7A3', '#F7C27A'],
  hurt: ['#5A4A7A', '#3A2E54'],
  surprised: ['#9FC8E0', '#5A8AB0'],
  ko: ['#6A6478', '#4A4458'],
};

function yakiFace(mood: string): HTMLCanvasElement {
  const p = new PixelCanvas(32, 32);
  const [top, bot] = MOOD_SKY[mood] ?? MOOD_SKY.normal;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.set(x, y, (x + y) % 2 === 0 && y > 14 ? bot : y < 16 ? top : bot);
  const ko = mood === 'ko';
  // shoulders: the green cape, the red sash
  p.rect(4, 26, 24, 6, CAPE[1]);
  p.rect(13, 26, 6, 6, SHIRT[1]);
  p.line(14, 26, 19, 31, TASUKI[1]);
  // the face
  p.ellipse(16, 20, 7, 7, SKIN[1]);
  p.vline(22, 16, 24, SKIN[0]);
  // eyes (narrow, a little shy), the moustache Sowaka drew
  const eyeY = 18;
  if (mood === 'happy' || ko) {
    p.hline(12, 13, eyeY, OL);
    p.hline(18, 19, eyeY, OL);
  } else if (mood === 'surprised') {
    p.rect(12, eyeY - 1, 2, 2, OL);
    p.rect(18, eyeY - 1, 2, 2, OL);
  } else {
    p.set(13, eyeY, OL);
    p.set(19, eyeY, OL);
  }
  p.rect(10, 22, 12, 2, '#0B0B14');
  p.set(9, 23, '#0B0B14');
  p.set(22, 23, '#0B0B14');
  p.set(9, 21, '#0B0B14');
  p.set(22, 21, '#0B0B14');
  if (mood === 'tsukkomi' || mood === 'surprised') p.rect(15, 25, 3, 2, '#7A2A2A');
  // the heap on the head
  heap(p, 16, 2, 10, 11, 1, !ko);
  p.vline(6, 11, 16, NOODLE[2]);
  p.vline(26, 11, 16, NOODLE[1]);
  if (mood === 'hurt') p.line(22, 4, 28, 0, NOODLE[2]);
  p.outline(OL);
  // the frame line so it sits on the paper
  p.hline(0, 31, 31, '#1E2A3A');
  p.vline(31, 0, 31, '#1E2A3A');
  return p.toCanvas();
}

const faceCache = new Map<string, HTMLCanvasElement>();
export function yakisobanFace(mood: string): HTMLCanvasElement {
  const k = MOOD_SKY[mood] ? mood : 'normal';
  let c = faceCache.get(k);
  if (!c) {
    c = yakiFace(k);
    faceCache.set(k, c);
  }
  return c;
}

registerPortrait('yakisoban', (mood) => yakisobanFace(mood));

// ---- CT pictures on the panel (61 5.10) -------------------------------------------------

let ctIcons: HTMLCanvasElement[] | null = null;
export function yakiCtIcons(): HTMLCanvasElement[] {
  if (ctIcons) return ctIcons;
  // 鉄板 (10×8)
  const t = new PixelCanvas(10, 8);
  t.rect(0, 4, 10, 3, '#3A3F48');
  t.hline(0, 9, 4, '#9AA0A8');
  t.set(3, 5, '#6B7186');
  t.set(7, 5, '#6B7186');
  t.vline(2, 0, 2, '#F4F1E8');
  t.vline(5, 1, 3, '#F4F1E8');
  t.vline(8, 0, 2, '#F4F1E8');
  t.outline(OL);
  // ヘラ〈こそげる〉 (8×10)
  const h = new PixelCanvas(8, 10);
  h.rect(1, 0, 5, 5, STEEL[1]);
  h.hline(1, 5, 0, STEEL[3]);
  h.hline(1, 5, 4, STEEL[0]);
  h.vline(3, 5, 9, WOOD);
  h.outline(OL);
  // 山〈大盛り〉 (10×8)
  const y = new PixelCanvas(10, 8);
  y.rect(0, 6, 10, 2, '#F4F1E8');
  for (let r = 0; r < 5; r++) y.hline(4 - r, 5 + r, 1 + r, r % 2 ? NOODLE[1] : NOODLE[2]);
  y.set(5, 0, BENI);
  y.set(3, 3, NORI);
  y.outline(OL);
  ctIcons = [t.toCanvas(), h.toCanvas(), y.toCanvas()];
  return ctIcons;
}

setTrioArt(yakiCtIcons, yakisobanFace);

// ---- command icons (16×16) and the state icon -------------------------------------------

CMD_ICONS.hera = [
  '................',
  '..........kkkkk.',
  '.........kgHHHgk',
  '.........kgggggk',
  '.........kgggggk',
  '.........kGGGGGk',
  '..........kkhkk.',
  '..........khk...',
  '.........khk....',
  '........khk.....',
  '.......khk......',
  '......khk.......',
  '.....khk........',
  '....kbk.........',
  '....kk..........',
  '................',
];
CMD_ICONS.waza = [
  '....w...w...w...',
  '...w...w...w....',
  '....w...w...w...',
  '...w...w...w....',
  '................',
  '..kkkkkkkkkkkk..',
  '.kGGgGGGGgGGGGk.',
  'kGGGGGGGGGGGGGGk',
  'kxxxxxxxxxxxxxxk',
  '.kkkkkkkkkkkkkk.',
  '..kk........kk..',
  '..kk........kk..',
  '................',
  '................',
  '................',
  '................',
];
CMD_ICONS.tsukkomu = [
  '..kkkkkkkkkkkk..',
  '.kWWWWWWWWWWWWk.',
  'kWWWWWWrrWWWWWWk',
  'kWWWWWWrrWWWWWWk',
  'kWWWWWWrrWWWWWWk',
  'kWWWWWWrrWWWWWWk',
  'kWWWWWWWWWWWWWWk',
  'kWWWWWWrrWWWWWWk',
  '.kWWWWWWWWWWWWk.',
  '..kkkkWWkkkkkk..',
  '.....kWk........',
  '....kWk.........',
  '....kk..........',
  '................',
  '................',
  '................',
];
// 足が 動かない (61 8.1): グソっ君の 足に 細い 青の 線が 2本（ふるえ）
STATUS_ICON_ROWS.status_c3_ashi = [
  '.c......c.',
  '..c....c..',
  '...kkkk...',
  '..kLLLLk..',
  '..kLQQLk..',
  '..kLQQLk..',
  '.kLLkkLLk.',
  '.kQk..kQk.',
  '.kk....kk.',
  '..........',
];
