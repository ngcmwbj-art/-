// map_c3_aq_okujou — 旧水族館の 屋上（2026-10-20 依頼主の 採用：げむきか 10/20 の 案3「掃除は 上から」、
// 03_ch3_index）。20×10、画面 1枚。入口と 券売所 map_c3_aq_iriguchi の 西の 壁 (0,4) の 鉄の 戸『屋上 ― 点検用』
// （door_c3_aq_okujou、events/ch3/okujou.ts。S15〜S20 の 間だけ 開く）から だけ 来る。らせん階段は 描かず、
// 入ると 屋上（灯台・サイレン塔と 同じ 作り、62 4.4・4.5）。ほかに 出口は ない（下へ 降りる はしごは ない）。
//
//      01234567890123456789
//   0  #WWWWWWWWWWWWWWWWWW#   北の 低い 胸壁（向こうは 空と 海）。(1,0–1) は 階段室
//   1  #Dffffffffffffffoof#   (1,1)：階段室の 戸（入口の (1,4) に もどる）、給水塔 (16–17,1–2)
//   3  #ffffffTTTTTfffffff#   大水槽の ホールの 上の 天窓 (7–11,3–5)（くもりガラス。乗れない）
//   6  #ffofffffffffffffff#   古い 室外機 (3,6)
//   8  #fhffffffffffffffhf#   排水口：南西 (2,8)（つまっている）、南東 (17,8)（通っている。くらべる 用）
//   9  #FFFFFFFFFFFFFFFFFF#   南の ふちの 手すり（(8–12,8) から 下を のぞくと ハキコ）
//
// 人は いない（ハキコは 下の 旧水族館の 前）。敵は 置かない。光は 真上の 日ざし（館の 中と 同じ 正午：
// world/umizoi.ts ch3GradeStage）。屋上の 外の 町と 海は 12:01 で 動く（雲・波の 光。絵の glow）。
// 止まった カモメは 手すりの 線より 内側、屋上の 上で 羽を 広げた まま 宙に（12,6）。
// 台本は events/ch3/okujou.ts、文は data/text/c3_okujou.ts、絵は art/props/okujou_art.ts。

import '../../art/props/okujou_art';
import { registerMap } from '../../world/maps';
import type { MapObj } from '../../world/types';

export const OKUJOU = 'map_c3_aq_okujou';

export const ROWS_OKUJOU = [
  '#WWWWWWWWWWWWWWWWWW#', // 0
  '#Dffffffffffffffoof#', // 1
  '#fffffffffffffffoof#', // 2
  '#ffffffTTTTTfffffff#', // 3
  '#ffffffTTTTTfffffff#', // 4
  '#ffffffTTTTTfffffff#', // 5
  '#ffofffffffffffffff#', // 6
  '#ffffffffffffffffff#', // 7
  '#fhffffffffffffffhf#', // 8
  '#FFFFFFFFFFFFFFFFFF#', // 9
];

const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}) }) as MapObj;

registerMap({
  id: OKUJOU,
  name: '旧水族館の 屋上',
  kind: 'indoor',
  chapter: 3,
  stageFlag: 'flag_ch3_stage',
  rows: ROWS_OKUJOU,
  legend: {
    '#': { ground: 'void', solid: true, tag: 'void' },
    W: { ground: 'void', solid: true, tag: 'iwall' },
    D: { ground: 'void', solid: true, door: true, tag: 'door' },
    f: { ground: 'tile_floor', step: 'se_step_stone' },
    h: { ground: 'tile_floor', step: 'se_step_metal' },
    o: { ground: 'tile_floor', solid: true, tag: 'prop' },
    T: { ground: 'tile_floor', solid: true, tag: 'prop' },
    F: { ground: 'tile_floor', solid: true, tag: 'prop' },
  },
  camera: 'fixed',
  space: 'room',
  light: 'top',
  outside: '#8EC0E0',
  objects: [
    PR('prop_c3_aq_okujou_shell', 0, 0),
    PR('prop_oj_tenmado', 7, 3),
    PR('prop_oj_haisui', 2, 8, { v: 'sw' }),
    PR('prop_oj_haisui', 17, 8, { v: 'se' }),
    PR('prop_oj_tank', 16, 2),
    PR('prop_oj_shitsugaiki', 3, 6),
    PR('prop_oj_saku', 1, 9),
    // (once it has flown in: events/ch3/okujou.ts evt_oj_enter)
    { t: 'prop', prop: 'prop_oj_kamome', x: 12, y: 6, opts: { h: 30 }, cond: { flag: 'flag_oj_in' } },
    { t: 'door', id: 'door_c3_aq_okujou_back', x: 1, y: 1, to: 'map_c3_aq_iriguchi', tx: 1, ty: 4, dir: 'up', se: 'se_door_heavy' },
    // (the things to examine, obj_oj_*, are the scenario's: events/ch3/okujou.ts)
  ] as MapObj[],
  onEnter: ['evt_oj_enter'],
});
