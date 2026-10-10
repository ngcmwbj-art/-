// map_hoshi_sawa — 沢の上「水の 元」(52_ch2_level_art 4.6、02 #65。2026-09-29 依頼主の
// 採用：げむきかの案3)。24×27、縦に約2画面の暗がり。棚田のいちばん上の電気柵の戸
// (map_hoshimidai (14,1)) から入り、南の端 (12,26) に出る。
//
//   下の画面（y13〜26）：杉林の点検道。沢は西（x9〜11）を下り、y19 で東へ曲がる
//     ところを飛び石 (12–13,19) でわたる。倒れた杉、点検道の杭、沢ガニ、
//     西へ少し入ったぬた場 (3–6,15–16) にチョトツ（任意）。
//   まん中（y11）：石を積んだせき「セキトメ」(14–17,11)。上 (14–18,8–10) に
//     水がたまったプール。西岸の道はここで行き止まり、せきの上をわたって東岸へ。
//     ほどくと石が飛び石になる（岸に名前の石が残る (18,12)）。
//   上の画面（y0〜10）：東岸の道を上って、いちばん上のわき水 (16–18,1–3)。
//     「水の 元」。水神の石のほこら (21,1)。
//
// 星：わき水の水面に星が1つずつ生まれて、沢を下っていく（props/hoshi_sawa の
// prop_h_sawa_stars。光の層なので暗がりでも見える）。セキトメの前は、星は
// プールにたまって回るだけで、せきの下へは流れない。

import { setDownhillOpen } from '../../art/tiles/hoshi_struct';
import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import { hg, PR } from './hoshi_common';
import { SAWA_OBJ } from '../text/maru';

const ROWS = [
  'HHHHHHHHHHHHHHHHHHHHHHHH', // 0
  'HHHHHHHHHHHHHHrrwww,,oHH', // 1  わき水 (16–18,1–3)、ほこら (21,1)
  'HHHHHHHHHHHHHHrrwww,,,HH', // 2
  'HHHHHHHHHHHHHHHrwww,,,HH', // 3
  'HHHHHHHHHHHHHHHHrsr,::HH', // 4
  'HHHHHHHHHHHHHHHHrsr,::HH', // 5
  'HHHHHHHHHHHHHHHrrsr,::HH', // 6
  'HHHHHHHHHHHHHHrrss,r::HH', // 7  ビーチサンダルの岩 (19,7)
  'HHHHHHHHHHHHHrwwwww,::HH', // 8  プール (14–18,8–10)
  'HHHHHHHHHHHHHrwwwww,::HH', // 9
  'HHHHHHHHHHHHrrwwwwwo::HH', // 10 札 (19,10)
  'HHHHHHHHHHHH::iiii,,::HH', // 11 セキトメ (14–17,11)
  'HHHHHHHHHHHH::ssrr,HHHHH', // 12 名前の石 (18,12)
  'HHHHHHHHHHHH::ssrHHHHHHH', // 13
  'HHHHHHHHHHH,::ssrHHHHHHH', // 14
  'HHHHmmm,,,,,::ssHHHHHHHH', // 15 ぬた場
  'HHHmmmm,,,,,::ssHHHHHHHH', // 16
  'HHHHHH,,,HHH::ssHHHHHHHH', // 17
  'HHHHHHHHHHHH::ssHHHHHHHH', // 18
  'HHHHHHHHHHssiissHHHHHHHH', // 19 飛び石 (12–13,19)
  'HHHHHHHHHHss::HHHHHHHHHH', // 20
  'HHHHHHHHHss,::,HHHHHHHHH', // 21
  'HHHHHHHHsso,::o,HHHHHHHH', // 22 倒れた杉の根 (10,22)、点検道の杭 (14,22)
  'HHHHHHHHss,,::,,HHHHHHHH', // 23
  'HHHHHHHHHss,::,HHHHHHHHH', // 24
  'HHHHHHHHHss,::HHHHHHHHHH', // 25
  'HHHHHHHHHssHDHHHHHHHHHHH', // 26 出口 (12,26)
];

// the wood falls away below every open tile (the stream's valley seen from above):
// its crowns never rise over the path, the water or the banks
setDownhillOpen((x, y) => {
  const c = ROWS[y]?.[x];
  return c !== undefined && c !== 'H';
}, 'sugi_sawa');

/** The water cells (s: running, w: still) for the stars' prop to glint on. */
const WATER: [number, number, number][] = [];
ROWS.forEach((row, y) => {
  for (let x = 0; x < row.length; x++) if (row[x] === 's' || row[x] === 'w' || row[x] === 'i') WATER.push([x, y, row[x] === 'w' ? 1 : 0]);
});

/** Boulders on every `r` cell (the variant from the position). */
const ROCKS: MapObj[] = [];
ROWS.forEach((row, y) => {
  for (let x = 0; x < row.length; x++) if (row[x] === 'r') ROCKS.push(PR('prop_h_sawa_iwa', x, y, { v: (x * 7 + y * 3) % 4, sandal: x === 19 && y === 7 }));
});

const SEKI = 'sym_hoshi_sawa_02';
const S12 = { stage: '1-2' };

/** An examinable object of the stream (its text: data/text/maru.ts; the scripts in events/ch2/sawa.ts). */
function O(id: keyof typeof SAWA_OBJ | 'obj_sawa_wakimizu' | 'obj_sawa_ishi', x: number, y: number, extra: Record<string, unknown> = {}): MapObj {
  const t = (SAWA_OBJ as Record<string, unknown>)[id];
  const text = typeof t === 'string' ? t : t && typeof t === 'object' ? (t as Record<string, string>).before : undefined;
  return { t: 'obj', id, x, y, ...(text ? { text } : {}), script: id, ...extra } as unknown as MapObj;
}

const OBJECTS: MapObj[] = [
  // ======================================================== the water, drawn over the ground
  // the stars born at the spring and drifting down (glow layer; before the dam they stay in the pool)
  PR('prop_h_sawa_stars', 0, 0, { water: WATER }),
  // before セキトメ is untangled the stream below the dam is thin: the stones of its bed show
  PR('prop_h_sawa_dry', 14, 12, {}, { cond: { notTaken: SEKI } }),
  // the stepping stones of the crossing (always) and, once the dam is undone, its stones in a row
  PR('prop_h_sawa_tobiishi', 12, 19, { v: 0 }),
  PR('prop_h_sawa_tobiishi', 13, 19, { v: 1 }),
  PR('prop_h_sawa_seki_ishi', 14, 11, {}, { cond: { taken: SEKI } }),
  // the spring (the water's source) and its little stone shrine
  PR('prop_h_wakimizu', 16, 1),
  PR('prop_h_sawa_hokora', 21, 1),
  // the pool's sign on its stake; the fallen cedar across the stream; the inspection path's stake
  PR('prop_h_sawa_fuda', 19, 10),
  PR('prop_h_sawa_taore', 6, 22),
  PR('prop_h_sawa_kui', 14, 22),
  // the name stone left on the bank once the dam is undone (until it is picked up)
  PR('prop_h_sawa_ishi', 18, 12, {}, { cond: { taken: SEKI, notFlag: 'flag_ch2_sawa_ishi_get' } }),
  // the wallow's mud and, once the boar has gone, its hoofprints to the mountain
  PR('decal_h_inoshishi_ashiato', 6, 15, { len: 4, dir: 'n' }, { cond: { taken: 'sym_hoshi_sawa_01' } }),
  ...ROCKS,

  // ======================================================== examine (52 4.6)
  // 下の画面
  O('obj_sawa_kui', 14, 22, { face: 'right' }),
  O('obj_sawa_sugi', 10, 22, { face: 'left' }),
  O('obj_sawa_tobiishi', 12, 19, { w: 2, flat: true }),
  O('obj_sawa_nagare', 14, 15, { w: 2, h: 4, face: 'right' }),
  O('obj_sawa_nuta', 3, 15, { w: 4, h: 2, flat: true }),
  // 上の画面
  O('obj_sawa_wakimizu', 16, 1, { w: 3, h: 3 }),
  O('obj_sawa_hokora', 21, 1),
  O('obj_sawa_pool', 14, 8, { w: 5, h: 3 }),
  O('obj_sawa_sandal', 19, 7, { face: 'left' }),
  O('obj_sawa_fuda', 19, 10),
  O('obj_sawa_iwa', 13, 10, { face: 'up' }),
  { ...O('obj_sawa_ishi', 18, 12, { flat: true }), cond: { taken: SEKI, notFlag: 'flag_ch2_sawa_ishi_get' } } as MapObj,

  // ======================================================== the stream crab (walks sideways on the west bank)
  {
    t: 'npc', id: 'npc_sawagani', x: 11, y: 22, dir: 'down', animal: true, ghost: true, script: 'obj_sawa_kani', shadow: 0,
    move: { kind: 'patrol', points: [[11, 21], [11, 24]], speed: 0.5, wait: 2600 },
  } as MapObj,
  // 灯りの 中だけの 沢ガニ 2ひき（水辺の 図鑑、02 #81）：いちばん下の 飛び石の 下と、わき水の そば
  { t: 'prop', prop: 'prop_yoburi_kani', x: 11, y: 20, litOnly: true } as MapObj,
  { t: 'obj', id: 'obj_sawa_kani_a', x: 11, y: 20, script: 'obj_sawa_kani_a', litOnly: true } as MapObj,
  { t: 'prop', prop: 'prop_yoburi_kani', x: 19, y: 1, opts: { red: true }, litOnly: true } as MapObj,
  { t: 'obj', id: 'obj_sawa_kani_b', x: 19, y: 1, script: 'obj_sawa_kani_b', solid: [0, 0, 1, 1], litOnly: true } as MapObj,

  // ======================================================== symbols (51 11.1)
  // the boar at the wallow (optional, as sym_hoshi_05 at the village's wallow)
  { t: 'sym', id: 'sym_hoshi_sawa_01', enemies: ['enemy_chototsu'], x: 5, y: 15, dir: 'right', move: 'boar', cond: S12, restoreAt: [5, 15] },
  // セキトメ: the children's pool dam across the stream (optional; its own scene then the battle)
  { t: 'sym', id: SEKI, enemies: ['enemy_sekitome'], x: 16, y: 11, dir: 'down', move: 'momisugi', cond: S12, script: 'evt_ch2_seki', restoreAt: [16, 11], restoreOff: [-8, 0] },

  // ======================================================== the way back to the village
  { t: 'door', id: 'door_hoshi_sawa_out', x: 12, y: 26, to: 'map_hoshimidai', tx: 14, ty: 1, dir: 'down', se: 'se_step_dirt' },
];

registerMap({
  id: 'map_hoshi_sawa',
  name: '沢の上',
  kind: 'outdoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: ROWS,
  legend: {
    H: { ground: 'grass', solid: true, tag: 'hedge' },
    ':': { ground: hg('h_yamamichi'), step: 'se_step_dirt' },
    ',': { ground: 'grass', step: 'se_step_grass' },
    m: { ground: hg('h_nuta'), step: 'se_step_dirt' },
    s: { ground: hg('h_sawa'), solid: true, tag: 'water' },
    w: { ground: hg('h_sawaike'), solid: true, tag: 'water' },
    // the stepping stones (and the dam's crest): water under them, stone under the feet
    i: { ground: hg('h_sawa'), step: 'se_step_stone' },
    r: { ground: hg('h_yamamichi'), solid: true, tag: 'prop' },
    o: { ground: hg('h_yamamichi'), solid: true, tag: 'prop' },
    D: { ground: hg('h_yamamichi'), solid: true, door: true },
  },
  objects: OBJECTS,
  camera: 'follow',
  variant: 'outdoor',
  pa: 'yama',
  space: 'yama',
  outside: '#0B0B14',
  // the whole stream is a dark (a step darker than the night, never black); the spring breathes a little light
  dark: [{ x: 0, y: 0, w: 24, h: 27 }],
  darkLights: [{ x: 17, y: 2, ox: 8, oy: 6, r: 44, amp: 3, k: 0.55 }],
  zones: [{ id: 'area_hoshi_sawa', name: '沢の上', x: 0, y: 0, w: 24, h: 27, wind: 'sugi' }],
  structMats: [{ x: 0, y: 0, w: 24, h: 27, mat: 'sugi_sawa', ch: 'H' }],
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  // 53 4.2（02 #65）：流用のみ。水の音と杉の葉ずれ、虫。夜のこわい音は足さない（53 1.7）
  amb: { 0: ['amb_h_insects', 'amb_h_mizu', 'amb_h_wind'], 1: ['amb_h_insects', 'amb_h_mizu', 'amb_h_wind'], 2: ['amb_h_insects', 'amb_h_mizu', 'amb_h_wind'] },
});
