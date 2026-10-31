// map_c3_funaba — 船揚げ場（2026-10-31 依頼主の 採用：げむきか 10/31 の 案1「お昼の あとで、こする」、03_ch3_index）。
// 28×14、画面 1枚半ほど。海ぞいの町の 港の 倉庫の 東の 路地、岩の 切れ目の 坂 (52,21)（door_c3_funaba、
// events/ch3/funaba.ts。段階1〜2 だけ）から だけ 来る。西の はしの 坂の 下 (1,4) に 着く。ほかに 出口は ない
// （北は 低い がけと やぶ、東は 岩、南は 海）。
//
//      0123456789012345678901234567
//   0  HHHHHHHHHHHHHHHHHHHHHHHHHHHH   やぶ
//   1  KKSSSSKKKKKKKKKKKKKKKKKKKKKK   低い がけ、巻き上げ機の 小屋 (2–5,1–3)（中には 入らない。戸の 前 (3,4) から 調べる）
//   2  KKSSSScccccccccccccccccccccK
//   3  KKSSSScccccccccccccccccccccK
//   4  KcccccccccccccccccccccccTcccK   坂の 下 (0,4)→ 港へ、着く 所 (1,4)。塗料の 台 (23,4)
//   5  KcccccccccFFFFFFFFFFcccccccK   ゴロウの 船（10–19,5–8。台車の 上。人は 船に 乗らない）
//   6  KcccccccccFFFFFFFFFFccccoccK   軍手と ヘラの 箱 (24,6)
//   7  KcccccccccFFFFFFFFFFcccccccK
//   8  KcccccccccFFFFFFFFFFoccccocK   台車の わきの 紙 (20,8)、ホースと バケツ (25,8)
//   9  KccccccccccRccccccRccccccccK   船の 腹の わき（ここから 北を 向いて 船底を 調べる）。レール (11・18)
//  10  KzzzzzzzzzzRzzzzzzRzzzzzzzzK   水ぎわ（ぬれた コンクリ）
//  11  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~   海（段階1 は 鏡の 水面。レールは 海の 中へ）
//
// 人：子ども 3人（段階1、〔funa〕の あと）。段階2 は ゴロウ（こすって いなければ 1人で こすっている／〔ぬる〕の あいだ）。
// 敵は 置かない。台本は events/ch3/funaba.ts、文は data/text/c3_funaba.ts、絵は art/props/funaba_art.ts。

import '../../art/props/funaba_art';
import { registerMap } from '../../world/maps';
import type { MapDef, MapObj } from '../../world/types';
import { cg } from './umizoi';

export const FUNABA = 'map_c3_funaba';
export const FUNABA_W = 28;
export const FUNABA_H = 14;

export const FUNABA_ROWS = [
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHH', // 0
  'KKSSSSKKKKKKKKKKKKKKKKKKKKKK', // 1
  'KKSSSScccccccccccccccccccccK', // 2
  'KKSSSScccccccccccccccccccccK', // 3
  'KccccccccccccccccccccccTcccK', // 4
  'KcccccccccFFFFFFFFFFcccccccK', // 5
  'KcccccccccFFFFFFFFFFccccoccK', // 6
  'KcccccccccFFFFFFFFFFcccccccK', // 7
  'KcccccccccFFFFFFFFFFoccccocK', // 8
  'KccccccccccRccccccRccccccccK', // 9
  'KzzzzzzzzzzRzzzzzzRzzzzzzzzK', // 10
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 11
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 12
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 13
];

/** 船（左上の マス と 大きさ）。 */
export const FB_FUNA = { x: 10, y: 5, w: 10, h: 4 };
/** 船底を 調べる 列（船の 腹の わきの 地面）。 */
export const FB_WAKI_Y = 9;
/** レールの 列。 */
export const FB_REIRU_X = [11, 18];
/** 着く 所（坂の 下）。 */
export const FB_TSUKU: [number, number] = [1, 4];

const OBJECTS: MapObj[] = [
  // the two tracks down into the sea (under the boat too: the boat stands on them)
  ...FB_REIRU_X.map((x) => ({ t: 'prop', prop: 'prop_fb_reiru', x, y: 5, opts: { n: 9 } }) as unknown as MapObj),
  { t: 'prop', prop: 'prop_fb_funa', x: FB_FUNA.x, y: FB_FUNA.y + FB_FUNA.h - 1 } as unknown as MapObj,
  { t: 'prop', prop: 'prop_fb_koya', x: 2, y: 3 } as unknown as MapObj,
  { t: 'prop', prop: 'prop_fb_dai', x: 23, y: 4 } as unknown as MapObj,
  { t: 'prop', prop: 'prop_fb_hako', x: 24, y: 6 } as unknown as MapObj,
  { t: 'prop', prop: 'prop_fb_baketsu', x: 25, y: 8 } as unknown as MapObj,
  { t: 'prop', prop: 'prop_fb_kami', x: 20, y: 8 } as unknown as MapObj,
  // the slope up to the harbour (west end)
  { t: 'door', id: 'door_c3_funaba_back', x: 0, y: 4, to: 'map_umizoi', tx: 51, ty: 21, dir: 'left', se: 'se_step_stone' } as unknown as MapObj,
  // (the things to examine, obj_fb_*, the children and ゴロウ: events/ch3/funaba.ts)
];

const DEF: MapDef = {
  id: FUNABA,
  name: '船揚げ場',
  kind: 'outdoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: FUNABA_ROWS,
  legend: {
    H: { ground: cg('c3_kusa'), solid: true, tag: 'hedge' },
    K: { ground: cg('c3_iwa'), solid: true, tag: 'hedge' },
    // the shed, the boat on its cradle, the table / the box / the bucket / the paper's post
    S: { ground: cg('c3_quay'), solid: true, tag: 'prop' },
    F: { ground: cg('c3_quay'), solid: true, tag: 'prop' },
    T: { ground: cg('c3_quay'), solid: true, tag: 'prop' },
    o: { ground: cg('c3_quay'), solid: true, tag: 'prop' },
    // the slipway's concrete, the rails, the wet edge
    c: { ground: cg('c3_quay'), step: 'se_step_stone' },
    R: { ground: cg('c3_quay'), step: 'se_step_wood' },
    z: { ground: cg('c3_quay'), step: 'se_step_wet' },
    '~': { ground: cg('c3_umi'), solid: true, tag: 'water' },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  space: 'minato',
  outside: '#2A5A82',
  zones: [{ id: 'area_c3_funaba', name: '船揚げ場', x: 0, y: 0, w: FUNABA_W, h: FUNABA_H }],
  structMats: [
    { x: 0, y: 0, w: FUNABA_W, h: FUNABA_H, mat: 'zoki', ch: 'H' },
    { x: 0, y: 0, w: FUNABA_W, h: FUNABA_H, mat: 'c3_iwa', ch: 'K' },
  ],
  onEnter: ['evt_fb_enter'],
  bgm: { 1: 'bgm_umi_noon', 2: 'bgm_umi_noon' },
  amb: { 1: ['amb_c3_umi'], 2: ['amb_c3_umi'] },
};

// 12:00 (8月31日)：日は 南の 高い 所（町と 同じ。影は 北へ 短く。62 8.3・8.4）
Object.defineProperty(DEF, 'shadowVec', { value: [0, -1] as [number, number], enumerable: true });

registerMap(DEF);
