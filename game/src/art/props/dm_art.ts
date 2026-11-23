// 荷台から 見た 村（げむきか 10/29 の 案3、03_ch3_index、events/ch3/diorama3.ts）の、ジオラマの 模型の 上の 小さな 物。
// 模型（art/props/c3_aq_diorama.ts の dioramaTown）は 地図を 縮めた 絵なので、地図の マスから 模型の 上の 点を 出して、
// その 上に 描く（prop_c3_aq_diorama の over と glow から 呼ぶ。art/props/c3_aq.ts）。
//   ・星見台：牛舎の 牛の 人形（直す 前は うしろが 下がった 形、直した あとは 前が 下がった 形）と、山道の 入口の
//     耕うん機（直す 前は 黄色い 鍵の 点、直した あとは 白い 紐の 点）。
//   ・海ぞいの 町：防波堤の 灯台の 豆電球（直す 前は 光る。glow の 層。直すと 消える）。
// 模型は 小さいので、見分けるのは 大写し「模型の 寄り」の 中（会議 10-29）。ここは 模型の 上の 目じるし だけ。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { loadMap } from '../../world/maps';
import { screenPool } from './ishell';

type Town = 'yunari' | 'hoshi' | 'umi';
const MAP_OF: Record<Town, string> = { yunari: 'map_town', hoshi: 'map_hoshimidai', umi: 'map_umizoi' };

/** 地図の マス (tx,ty) の まん中が、w × h の 模型の どこに 来るか（dioramaTown と 同じ 縮め方）。 */
export function dmModelPt(town: Town, w: number, h: number, tx: number, ty: number): [number, number] | null {
  const m = loadMap(MAP_OF[town]);
  if (!m) return null;
  const s = Math.min(w / m.w, h / m.h);
  const ow = Math.round(m.w * s);
  const oh = Math.round(m.h * s);
  const x0 = Math.floor((w - ow) / 2);
  const y0 = Math.floor((h - oh) / 2);
  return [x0 + Math.round((tx + 0.5) * s), y0 + Math.round((ty + 0.5) * s)];
}

/** 模型の 上の 物の マス（今の 地図で 確かめた）。 */
export const DM_AT = {
  /** 星見台の 牛舎（prop_h_bld_barn (50,24) の 中ほど）。 */
  ushi: [54, 27] as [number, number],
  /** 星見台の 山道の 入口（テツヤの 思いだした 姿 (45,2)）。 */
  kagi: [45, 2] as [number, number],
  /** 海ぞいの 町の 防波堤の 灯台（prop_c3_toudai (7,28) の 上）。 */
  toudai: [8, 26] as [number, number],
};

/** 遊ぶ 前の 形（flag が 立てば 直した 形）。 */
const fixed = (k: 'ushi' | 'himo' | 'kagi' | 'toudai'): boolean => flag(`flag_dm_${k}`) > 0;
/** 第3章の 段階3 の 模型だけ（クリア後・ほかの 章の 模型は 前の まま）。 */
const live = (): boolean => flag('flag_ch3_stage') === 3 && !flag('flag_ch3_clear');

/**
 * 模型の 上の 牛と 耕うん機（over。x, y は prop の 錨、模型は 絵の (3, 4) から w × h）。
 * 牛：黒い 3×2 の 体に 頭。直す 前は うしろが 1 下がり、直すと 前が 1 下がる。
 */
export function dmModelOver(town: Town, g: Gfx, x: number, y: number, w: number, h: number): void {
  if (town !== 'hoshi' || !live()) return;
  const ox = x + 3;
  const oy = y + 2;
  const u = dmModelPt(town, w, h, DM_AT.ushi[0], DM_AT.ushi[1]);
  if (u) {
    const [cx, cy] = [ox + u[0], oy + u[1]];
    const ok = fixed('ushi');
    // the body (black, a wagyu-cross's), the head to the left; the low end is the end that has folded
    g.rect(cx - 1, cy - 1, 3, 1, '#2A2420');
    g.rect(cx - 1, cy, 3, 1, '#3A322C');
    g.px(cx - 2, ok ? cy : cy - 1, '#2A2420');
    g.px(cx + 2, ok ? cy - 1 : cy, '#2A2420');
  }
  const k = dmModelPt(town, w, h, DM_AT.kagi[0], DM_AT.kagi[1]);
  if (k) {
    const [cx, cy] = [ox + k[0], oy + k[1]];
    // the tiller: a red engine, its handles behind; a yellow speck of a key, or the white cord's handle
    g.rect(cx - 1, cy, 2, 2, '#C8452E');
    g.px(cx + 1, cy - 1, '#6A6A72');
    if (fixed('himo')) g.px(cx - 2, cy, '#F4F1E8');
    else if (!fixed('kagi')) g.px(cx, cy - 1, '#F4D040');
  }
}

/** 海ぞいの 町の 灯台の 豆電球（glow。直すまで 光る）。 */
export function dmModelGlow(town: Town, g: Gfx, x: number, y: number, w: number, h: number, t: number): void {
  if (town !== 'umi' || !live() || fixed('toudai')) return;
  const p = dmModelPt(town, w, h, DM_AT.toudai[0], DM_AT.toudai[1]);
  if (!p) return;
  const cx = x + 3 + p[0];
  const cy = y + 2 + p[1];
  const a = 0.75 + 0.2 * Math.sin(t / 300);
  g.rect(cx, cy - 1, 2, 2, '#FFF2A0', a);
  screenPool(g, cx + 1, cy, 5, 4, '#FFE27A', 0.5 * a);
}
