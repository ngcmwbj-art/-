// 「ダンゴムシ ちゃうで」の 報告書（02_ch2_index #93、30_level_art 10.8）：手配書の 似顔絵。
//
//   ワイスタ巡査が 聞き込みの たびに 描き足す 似顔絵（32×40）。はじめは 通報の『大きな 虫』の
//   えんぴつの 下がき（だ円の 体、節、細い 足 6本、点の 目、「？」）。証言 1つごとに 1段 変に なる
//   （どの 順でも 同じ 絵に なるよう、層の 順は 決めて ある）：
//     しんご   たんかん  … 体が まるい オレンジ（皮の つぶつぶ、てっぺんに 葉）
//     くま吉   がんもどき … ふちが こんがり（こげ茶の ふち、黒ごまと にんじんの つぶ）
//     かずゆき 中煎りの 豆 … まん中に コーヒー豆の みぞ
//     ひより   すなの 作品 … 下の ほうに 砂の つぶ、てっぺんに 砂山の 旗
//     ゆう     時計の バンド … 銀の 帯 3本と バックル
//     郵便屋さん 小包   … 赤白の ひもが 十字、上で ちょうちょ結び
//     ともき   シークレット … 上 半分に カプセルの ドーム、合わせ目、きらり
//     中学生   よろいの 獣 … おでこに お札、まわりに むらさきの ぎざぎざ
//   ぜんぶ「優」：本物 そっくり（グソっ君の 立ち絵を 水色の 地に。額縁は 壁の ほう）。
//
//   交番の 壁（町の 地図の 左の はし、map_koban (2,0)）に 'in_kb_tehai'：flag_hk_start から、
//   今の 似顔絵を 半分の 大きさで 紙に 貼る（flat。HD-2D でも 部屋の 絵に 入る）。飾った あとは 木の 額。

import { PixelCanvas, makeCanvas } from '../../engine/pixel';
import { charSprite } from '../chars/registry';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

export const NIGAOE_W = 32;
export const NIGAOE_H = 40;

/** 層の 順（どの 順に 聞いても 同じ 絵）。 */
export const NIGAOE_LAYERS = ['tankan', 'ganmo', 'mame', 'suna', 'band', 'himo', 'capsule', 'fuin'] as const;

const C = {
  paper: '#F4F1E8',
  paperDk: '#E2DCCB',
  pencil: '#4A3A6E',
  pencilLt: '#8C82A8',
  orange: '#F2994A',
  orangeDk: '#D2712A',
  orangeLt: '#FFC07A',
  leaf: '#4E9A3A',
  leafDk: '#2F6A2A',
  fry: '#B8742A',
  fryDk: '#7A4A1E',
  sesame: '#2A2440',
  carrot: '#E8662A',
  bean: '#5A341C',
  sand: '#E8C890',
  sandDk: '#C8A06A',
  silver: '#C8CCD4',
  silverDk: '#8A90A0',
  silverLt: '#F4F6FA',
  red: '#E23B2E',
  white: '#FFFFFF',
  glass: '#BFE6F2',
  aura: '#8A5FB0',
  auraLt: '#C8A8E8',
  ofuda: '#F6E9C8',
  sky: '#CFE8F2',
  skyDk: '#A8D2E4',
};

const CX = 16;
const CY = 23;
const RX = 10;
const RY = 12;

const inBody = (x: number, y: number, rx = RX, ry = RY): boolean => ((x + 0.5 - CX) / rx) ** 2 + ((y + 0.5 - CY) / ry) ** 2 <= 1;

function base(p: PixelCanvas, fill: string | null): void {
  if (fill) for (let y = 0; y < NIGAOE_H; y++) for (let x = 0; x < NIGAOE_W; x++) if (inBody(x, y)) p.set(x, y, fill);
}

function outline(p: PixelCanvas, c: string): void {
  for (let y = 0; y < NIGAOE_H; y++)
    for (let x = 0; x < NIGAOE_W; x++) {
      if (!inBody(x, y)) continue;
      if (!inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y - 1) || !inBody(x, y + 1)) p.set(x, y, c);
    }
}

/** 似顔絵（32×40）。`layers` は 聞いた 証言の 層、`real` で 本物 そっくり。 */
export function nigaoeImg(layers: readonly string[], real = false): HTMLCanvasElement {
  const key = real ? 'real' : NIGAOE_LAYERS.filter((l) => layers.includes(l)).join(',');
  const hit = cache.get(key);
  if (hit) return hit;
  const img = real ? drawReal() : drawSketch(new Set(layers));
  cache.set(key, img);
  return img;
}
const cache = new Map<string, HTMLCanvasElement>();

function drawSketch(L: Set<string>): HTMLCanvasElement {
  const p = new PixelCanvas(NIGAOE_W, NIGAOE_H);
  p.fill(C.paper);
  // むらさきの ぎざぎざ（いちばん うしろ）
  if (L.has('fuin')) {
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      const r = a % 2 ? 1.25 : 1.45;
      const x = Math.round(CX + Math.cos(t) * RX * r);
      const y = Math.round(CY + Math.sin(t) * RY * r * 0.92);
      p.line(Math.round(CX + Math.cos(t) * RX * 1.05), Math.round(CY + Math.sin(t) * RY * 1.0), x, y, a % 2 ? C.auraLt : C.aura);
    }
  }
  // 体の 色
  const fill = L.has('tankan') ? C.orange : L.has('mame') ? '#A8693A' : L.has('ganmo') ? '#E8C07A' : null;
  base(p, fill);
  if (L.has('tankan')) {
    // 皮の つぶつぶと 光
    for (let y = 0; y < NIGAOE_H; y++)
      for (let x = 0; x < NIGAOE_W; x++) if (inBody(x, y, RX - 1, RY - 1) && (x * 7 + y * 13) % 11 === 0) p.set(x, y, C.orangeDk);
    p.set(CX - 5, CY - 7, C.orangeLt);
    p.set(CX - 4, CY - 8, C.orangeLt);
    p.set(CX - 6, CY - 6, C.orangeLt);
    if (L.has('mame')) for (let y = CY - 4; y <= CY + 8; y++) for (let x = CX - 3; x <= CX + 3; x++) if (inBody(x, y) && (x + y) % 2) p.set(x, y, '#C8803A');
  }
  if (L.has('ganmo')) {
    // こんがりの ふち 2px と、黒ごま・にんじん
    for (let y = 0; y < NIGAOE_H; y++)
      for (let x = 0; x < NIGAOE_W; x++) {
        if (!inBody(x, y)) continue;
        if (!inBody(x, y, RX - 2, RY - 2)) p.set(x, y, (x + y) % 3 ? C.fry : C.fryDk);
      }
    for (const [x, y] of [[12, 18], [19, 21], [14, 27], [21, 28], [17, 15]]) p.set(x, y, C.sesame);
    for (const [x, y] of [[15, 20], [20, 25], [12, 24]]) p.set(x, y, C.carrot);
  }
  if (L.has('suna')) {
    // 下の ほうに 砂の つぶ
    for (let y = CY + 3; y < NIGAOE_H; y++)
      for (let x = 0; x < NIGAOE_W; x++) if (inBody(x, y) && (x * 5 + y * 3) % 4 === 0) p.set(x, y, (x + y) % 3 ? C.sand : C.sandDk);
    // 砂山の 小さな 旗（左上に 立てて ある）
    p.vline(9, 6, 13, C.pencil);
    p.rect(10, 6, 4, 3, C.red);
    p.set(13, 8, C.paper);
  }
  // 節（3本）と 輪郭
  for (const dy of [-5, 0, 5]) {
    for (let x = CX - RX + 1; x <= CX + RX - 1; x++) {
      const y = CY + dy + Math.round(((x - CX) / RX) ** 2 * 2);
      if (inBody(x, y, RX - 1, RY - 1)) p.set(x, y, L.has('tankan') ? C.orangeDk : C.pencilLt);
    }
  }
  if (L.has('mame')) {
    // コーヒー豆の みぞ（まん中を ゆるい S）
    for (let y = CY - RY + 2; y <= CY + RY - 2; y++) {
      const x = CX + Math.round(Math.sin(((y - CY) / RY) * 3) * 1.4);
      p.set(x, y, C.bean);
      if (Math.abs(y - CY) < 7) p.set(x + 1, y, C.bean);
    }
  }
  if (L.has('band')) {
    // 銀の 帯 3本（節を つなぐ）と バックル
    for (const by of [CY - 6, CY, CY + 6]) {
      for (let x = 0; x < NIGAOE_W; x++) {
        if (!inBody(x, by)) continue;
        p.set(x, by, x % 3 === 0 ? C.silverDk : C.silver);
        if (inBody(x, by + 1)) p.set(x, by + 1, x % 3 === 0 ? C.silverDk : C.silverLt);
      }
    }
    p.rect(CX + RX - 3, CY - 1, 3, 4, C.silverDk);
    p.set(CX + RX - 2, CY, C.silverLt);
    p.set(CX + RX - 2, CY + 1, C.silverLt);
  }
  // 細い 足 6本（通報の 下がき）
  for (const [y, k] of [[CY - 4, 0], [CY + 1, 1], [CY + 6, 2]] as const) {
    const lx = CX - RX;
    const rx = CX + RX - 1;
    p.line(lx, y, lx - 3, y + 2 - k, C.pencil);
    p.line(rx, y, rx + 3, y + 2 - k, C.pencil);
  }
  outline(p, L.has('ganmo') ? C.fryDk : C.pencil);
  if (L.has('tankan')) {
    // てっぺんの 葉と へた
    p.set(CX, CY - RY - 1, C.leafDk);
    p.rect(CX + 1, CY - RY - 3, 3, 2, C.leaf);
    p.set(CX + 4, CY - RY - 3, C.leafDk);
  }
  if (L.has('himo')) {
    // 赤白の ひも：十字と ちょうちょ結び
    for (let y = CY - RY - 1; y <= CY + RY; y++) if (inBody(CX, y) || y === CY - RY - 1) p.set(CX + 2, y, y % 2 ? C.red : C.white);
    for (let x = CX - RX; x <= CX + RX; x++) if (inBody(x, CY + 2)) p.set(x, CY + 2, x % 2 ? C.red : C.white);
    p.rect(CX - 1, CY - RY - 3, 2, 2, C.red);
    p.rect(CX + 4, CY - RY - 3, 2, 2, C.red);
    p.set(CX + 2, CY - RY - 2, C.white);
    p.set(CX + 2, CY - RY - 1, C.red);
  }
  // 目（下がきの 点）
  p.set(CX - 3, CY - 7, C.pencil);
  p.set(CX + 3, CY - 7, C.pencil);
  if (L.has('fuin')) {
    // おでこの お札（赤い うずまき）
    p.rect(CX - 2, CY - RY + 1, 5, 9, C.ofuda);
    p.strokeRect(CX - 2, CY - RY + 1, 5, 9, C.sandDk);
    p.vline(CX, CY - RY + 2, CY - RY + 8, C.red);
    p.set(CX - 1, CY - RY + 4, C.red);
    p.set(CX + 1, CY - RY + 6, C.red);
    // 目が 鋭い（つり目）
    p.set(CX - 4, CY - 8, C.pencil);
    p.set(CX + 4, CY - 8, C.pencil);
  }
  if (L.has('capsule')) {
    // カプセルの ドーム（上 半分）と 合わせ目
    for (let y = CY - RY - 4; y <= CY; y++)
      for (let x = CX - RX - 2; x <= CX + RX + 2; x++) {
        const inD = ((x + 0.5 - CX) / (RX + 2)) ** 2 + ((y + 0.5 - CY) / (RY + 4)) ** 2 <= 1;
        const inD2 = ((x + 0.5 - CX) / (RX + 1)) ** 2 + ((y + 0.5 - CY) / (RY + 3)) ** 2 <= 1;
        if (inD && !inD2) p.set(x, y, C.skyDk);
      }
    p.hline(CX - RX - 2, CX + RX + 2, CY, C.skyDk);
    p.hline(CX - RX - 2, CX + RX + 2, CY + 1, C.silverDk);
    p.vline(CX - 6, CY - 12, CY - 9, C.white);
    p.vline(CX - 7, CY - 10, CY - 8, C.white);
    // きらり
    for (const [x, y] of [[CX + 9, 5], [CX + 10, 4], [CX + 10, 6], [CX + 11, 5], [CX + 10, 5]]) p.set(x, y, '#FFE7A3');
  }
  if (!L.size) {
    // 「？」（えんぴつ）
    p.art(['.##.', '#..#', '...#', '..#.', '..#.', '....', '..#.'], { '#': C.pencilLt }, 25, 3);
  }
  return p.toCanvas();
}

function drawReal(): HTMLCanvasElement {
  const p = new PixelCanvas(NIGAOE_W, NIGAOE_H);
  p.fill(C.sky);
  for (let y = 26; y < NIGAOE_H; y++) for (let x = 0; x < NIGAOE_W; x++) if ((x + y) % 2 === 0 || y > 30) p.set(x, y, C.skyDk);
  const c = p.toCanvas();
  // グソっ君の 立ち絵（下向き）を まん中に
  const s = charSprite('kanenari');
  const fr = s.walk.down[0];
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(fr, Math.round((NIGAOE_W - fr.width) / 2), Math.max(0, NIGAOE_H - 4 - fr.height));
  return c;
}

// ================================================================ 交番の 壁：手配書

/** 壁に 貼った 似顔絵の 紙（似顔絵を 半分に）。 */
function tehai(layers: readonly string[], real: boolean): HTMLCanvasElement {
  const key = `${real ? 'real' : NIGAOE_LAYERS.filter((l) => layers.includes(l)).join(',')}`;
  const hit = wallCache.get(key);
  if (hit) return hit;
  const W = real ? 22 : 20;
  const H = real ? 26 : 24;
  const [c, g] = makeCanvas(W, H);
  g.imageSmoothingEnabled = false;
  if (real) {
    // 木の 額
    g.fillStyle = '#8A5A3A';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#C8A06A';
    g.fillRect(1, 1, W - 2, H - 2);
    g.fillStyle = '#5A3A2A';
    g.fillRect(2, 2, W - 4, H - 4);
  } else {
    g.fillStyle = '#C8C2B4';
    g.fillRect(1, 1, W - 1, H - 1);
    g.fillStyle = C.paper;
    g.fillRect(0, 0, W - 1, H - 1);
    // 見出しの 帯（赤）
    g.fillStyle = C.red;
    g.fillRect(1, 1, W - 3, 2);
  }
  const img = nigaoeImg(layers, real);
  // 半分に（最近傍）
  const ix = real ? 3 : 2;
  const iy = real ? 3 : 4;
  g.drawImage(img, 0, 0, NIGAOE_W, NIGAOE_H, ix, iy, NIGAOE_W / 2, NIGAOE_H / 2);
  if (!real) {
    // テープ
    g.fillStyle = 'rgba(247,194,122,0.9)';
    g.fillRect(W / 2 - 3, 0, 6, 2);
  }
  wallCache.set(key, c);
  return c;
}
const wallCache = new Map<string, HTMLCanvasElement>();

/** 今の 似顔絵の 層（証言の フラグから）。 */
export function nigaoeLayers(flag: (id: string) => number): string[] {
  const out: string[] = [];
  for (const [k, l] of WITNESS_LAYER) if (flag(`flag_hk_w_${k}`) > 0) out.push(l);
  return out;
}
const WITNESS_LAYER: [string, string][] = [
  ['shingo', 'tankan'],
  ['tomoki', 'capsule'],
  ['hiyori', 'suna'],
  ['yubin', 'himo'],
  ['chugaku', 'fuin'],
  ['kuma', 'ganmo'],
  ['yuu', 'band'],
  ['kazuyuki', 'mame'],
];

registerProp('in_kb_tehai', () => {
  return {
    ox: 4,
    oy: 2,
    w: 22,
    h: 26,
    foot: 0,
    flat: true,
    img: (env: PropEnv) => {
      if (!env.flag('flag_hk_start')) return null;
      const real = env.flag('flag_hk_kazari') > 0;
      return tehai(nigaoeLayers((id) => env.flag(id)), real);
    },
  } as PropArt;
});
