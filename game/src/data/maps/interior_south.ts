// 南の列（川べり通りの北側）の建物と公園のトイレの部屋（30_level_art 4.13〜4.19、
// テキストは 10_narrative 7.20・6.23、02_ch2_index #59。2026-09-28 依頼主の指示）。
//
//   map_chizu        ちずの家（bld_mizumaki (9,25)、扉 (11,30)）
//   map_madam        なんばるわんの家（bld_madam (19,26)、扉 (22,30)）
//   map_photo        夕鳴写真館（bld_photo (30,26)、扉 (33–34,31)）
//   map_sk_storage   商店会の倉庫（bld_shutter v1 (35,26)、くぐり戸 (38,31)）
//   map_sk_rest      ひと休み処（bld_shutter v2 (39,26)、ガラスの戸 (42,31)）
//   map_sk_bait      閉店した つりえさ屋（bld_shutter v3 (46,26)、通用口 (46,31)）
//   map_park_toilet  公園のトイレ（bld_toilet (1,1)、男子の入口 (1,3)）
//
// どの部屋も1画面に収まる小ささで、店の部屋（interiors.ts）と同じ作り：
// 固定カメラ、殻の絵（art/props/int_south*.ts）が外の町ごと描く。扉の条件は
// 今の店と同じく付けない（夜はエンディングの自動進行だけ）。

import '../../art/props/int_south';
import { registerDebug } from '../../debug';
import { measure } from '../../engine/font';
import { flag, setFlag } from '../../game/state';
import { field } from '../../world/field';
import { cellAt, loadMap, registerMap } from '../../world/maps';
import { runMsg } from '../../world/msg';
import { registerScript } from '../../world/scripts';
import { sfx } from '../../audio';
import { pickStage } from '../../world/maps';
import type { DoorObj, MapObj, TileSpec } from '../../world/types';
import { SBANNER, SBANNER_FLIP, SENTER, SOBJ, SREWARD, SREWARD_AFTER, STALK, southTexts } from './interior_south_text';

const WALLS: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  o: { ground: 'auto', solid: true, tag: 'prop' },
  S: { ground: 'auto', solid: true, counter: true, tag: 'counter' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
};
/** 家：板の間・畳・土間（小林家と同じ地面）。 */
const HOME_LEGEND: Record<string, TileSpec> = {
  ...WALLS,
  '.': { ground: 'wood_bare' },
  t: { ground: 'tatami', step: 'se_step_tatami' },
  g: { ground: 'genkan' },
};
/** 洋間（なんばるわんの家）。 */
const WEST_LEGEND: Record<string, TileSpec> = { ...WALLS, '.': { ground: 'wood' } };
/** 店の板の床（写真館・ひと休み処）。 */
const WOOD_LEGEND: Record<string, TileSpec> = { ...WALLS, '.': { ground: 'shopwood' } };
/** タイル・コンクリートの床（倉庫・つりえさ屋・トイレ）。 */
const TILE_LEGEND: Record<string, TileSpec> = { ...WALLS, '.': { ground: 'tile_floor' } };

const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text: SOBJ[id], ...extra }) as MapObj;
const PR = (prop: string, x: number, y: number, opts?: Record<string, unknown>): MapObj =>
  ({ t: 'prop', prop, x, y, ...(opts ? { opts } : {}) }) as MapObj;
/** 調べると見つかる物（1回だけ。10 3.6 の flag_hidden_*）。 */
const FIND = (id: string, x: number, y: number, reward: { item?: string; money?: number; flag: string }, extra: Record<string, unknown> = {}): MapObj =>
  ({ t: 'obj', id, x, y, text: SREWARD[id], reward: { ...reward, after: SREWARD_AFTER[id] }, ...extra }) as MapObj;
const BACK = (id: string, x: number, y: number, tx: number, ty: number, se?: string | string[]): MapObj =>
  ({ t: 'door', id, x, y, to: 'map_town', tx, ty, dir: 'down', ...(se ? { se } : {}) }) as MapObj;

/** 家の BGM・店の BGM（40 4.2）。 */
const HOME_BGM = { 0: 'bgm_home', 1: 'bgm_home', 2: 'bgm_home' };
const SHOP_BGM = { 0: 'bgm_shop', 1: 'bgm_shop', 2: 'bgm_shop' };

// ================================================================ ちずの家（10×7）

export const ROWS_CHIZU = [
  '#WWWWWWWW#',
  '#WWWWWWWW#',
  '#oo.oo..o#',
  '#tott....#',
  '#tSSt..oo#',
  '#tttt..gg#',
  '########D#',
];

registerMap({
  id: 'map_chizu',
  name: 'ちずの家',
  kind: 'indoor',
  rows: ROWS_CHIZU,
  legend: HOME_LEGEND,
  camera: 'fixed',
  space: 'room',
  theme: 'home',
  light: 'top',
  bgm: HOME_BGM,
  // 扇風機（段階1からは首ふりが止まる。40 8 amb_fan）
  amb: { 0: ['amb_fan'], 1: ['amb_fan'], 2: ['amb_fan'] },
  objects: [
    PR('in_cz_shell', 0, 0),
    PR('in_cz_rubber', 1, 2),
    PR('in_cz_tansu', 2, 2),
    PR('in_cz_radio', 4, 2),
    PR('in_cz_fan', 8, 2),
    PR('in_cz_clock', 6, 1),
    PR('in_cz_zabuton', 2, 3),
    PR('in_cz_table', 2, 4),
    PR('in_cz_boots', 7, 4),
    PR('in_cz_shoebox', 8, 4),
    PR('prop_ceiling_light', 5, 4, { ly: -38, cord: 10 }),
    // examine
    O('obj_cz_calendar', 3, 1, { face: 'up' }),
    O('obj_cz_clock', 6, 1, { face: 'up' }),
    O('obj_cz_award', 7, 1, { face: 'up' }),
    O('obj_cz_rubber', 1, 2),
    O('obj_cz_tansu', 2, 2),
    O('obj_cz_radio', 4, 2),
    O('obj_cz_vase', 5, 2),
    O('obj_cz_fan', 8, 2),
    O('obj_cz_table', 3, 4),
    O('obj_cz_boots', 7, 4),
    FIND('obj_cz_candy', 8, 4, { item: 'item_hakka_ame', flag: 'flag_hidden_chizu' }),
    {
      t: 'npc', id: 'npc_chizu_haha', x: 2, y: 3, dir: 'down', talk: STALK.npc_chizu_haha, pose: 'sit',
      move: { kind: 'stand' },
    },
    BACK('door_town_chizu', 8, 6, 11, 31, 'se_door'),
  ],
});

// ================================================================ なんばるわんの家（9×7）

export const ROWS_MADAM = [
  '#WWWWWWW#',
  '#WWWWWWW#',
  '#oo.oo.o#',
  '#.....o.#',
  '#.oo....#',
  '#o.....o#',
  '######D##',
];

registerMap({
  id: 'map_madam',
  name: 'なんばるわんの家',
  kind: 'indoor',
  rows: ROWS_MADAM,
  legend: WEST_LEGEND,
  camera: 'fixed',
  space: 'room',
  theme: 'home',
  light: 'top',
  bgm: HOME_BGM,
  // テレビ（段階1は同じ原稿のくり返し、段階2はテスト信号。40 8 amb_tv）
  amb: { 0: ['amb_tv'], 1: ['amb_tv'], 2: ['amb_tv'] },
  objects: [
    PR('in_md_shell', 0, 0),
    PR('in_md_trophy', 1, 2),
    PR('in_md_tv', 4, 2),
    PR('in_md_runner', 7, 2),
    PR('in_md_chair', 6, 3),
    PR('in_md_table', 2, 4),
    PR('in_md_parasol', 1, 5),
    PR('in_md_dogbed', 7, 5),
    // examine
    O('obj_md_photo', 3, 1, { face: 'up' }),
    FIND('obj_md_trophy', 1, 2, { item: 'item_ramune', flag: 'flag_hidden_madam' }, { w: 2 }),
    O('obj_md_tv', 4, 2, { w: 2 }),
    O('obj_md_runner', 7, 2),
    O('obj_md_table', 2, 4, { w: 2 }),
    O('obj_md_parasol', 1, 5),
    O('obj_md_dogbed', 7, 5),
    {
      t: 'npc', id: 'npc_kazuo', x: 6, y: 3, dir: 'down', talk: STALK.npc_kazuo, pose: 'sit',
      move: { kind: 'stand' }, off: [0, -2],
    },
    BACK('door_town_madam', 6, 6, 22, 31, 'se_door'),
  ],
});

// ================================================================ 夕鳴写真館（10×7）

export const ROWS_PHOTO = [
  '#WWWWWWWW#',
  '#WWWWWWWW#',
  '#ooo...oo#',
  '#.o..oo..#',
  '#........#',
  '#oo....o.#',
  '######D###',
];

registerMap({
  id: 'map_photo',
  name: '夕鳴写真館',
  kind: 'indoor',
  rows: ROWS_PHOTO,
  legend: WOOD_LEGEND,
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  bgm: SHOP_BGM,
  // 壁の時計（ひのやと同じく、段階1からは鳴らない）
  amb: { 0: ['amb_clock_tick'], 1: [], 2: [] },
  objects: [
    PR('in_ph_shell', 0, 0),
    PR('in_ph_clock', 4, 1),
    PR('in_ph_backdrop', 1, 2),
    PR('in_ph_umbrella', 7, 2),
    PR('in_ph_frames', 8, 2),
    PR('in_ph_chair', 2, 3),
    PR('in_ph_camera', 5, 3),
    PR('in_ph_window', 1, 5),
    PR('in_ph_753', 7, 5),
    // examine
    O('obj_ph_clock', 4, 1, { face: 'up' }),
    O('obj_ph_darkroom', 5, 1, { face: 'up' }),
    O('obj_ph_backdrop', 1, 2, { w: 3 }),
    O('obj_ph_umbrella', 7, 2),
    O('obj_ph_frames', 8, 2),
    O('obj_ph_chair', 2, 3),
    O('obj_ph_camera', 5, 3),
    O('obj_ph_window', 1, 5, { w: 2 }),
    FIND('obj_ph_753', 7, 5, { item: 'item_chitose_ame', flag: 'flag_hidden_photo' }),
    {
      t: 'npc', id: 'npc_photo_master', x: 6, y: 3, dir: 'down', talk: STALK.npc_photo_master,
      move: { kind: 'look', dirs: ['down', 'left', 'down', 'up'], every: [2500, 5000] },
    },
    BACK('door_town_photo', 6, 6, 33, 32, ['se_door_glass', 'se_shop_bell']),
  ],
});

// ================================================================ 商店会の倉庫（9×7）

export const ROWS_SK_STORAGE = [
  '#WWWWWWW#',
  '#WWWWWWW#',
  '#oo.ooo.#',
  '#.......#',
  '#.oo..o.#',
  '#o......#',
  '####D####',
];

registerMap({
  id: 'map_sk_storage',
  name: '商店会の倉庫',
  kind: 'indoor',
  rows: ROWS_SK_STORAGE,
  legend: TILE_LEGEND,
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  onEnter: ['south_enter'],
  bgm: SHOP_BGM,
  amb: { 0: [], 1: [], 2: [] },
  objects: [
    PR('in_sk_shell', 0, 0),
    PR('in_sk_rail', 1, 2),
    PR('in_sk_lantern', 4, 2),
    PR('in_sk_mikoshi', 2, 4),
    PR('in_sk_taiko', 6, 4),
    PR('in_sk_box', 1, 5),
    // examine
    { t: 'obj', id: 'obj_sk_banner', x: 3, y: 1, face: 'up', text: SBANNER } as MapObj,
    O('obj_sk_price', 7, 1, { face: 'up' }),
    O('obj_sk_rail', 1, 2, { w: 2 }),
    O('obj_sk_lantern', 4, 2, { w: 3 }),
    O('obj_sk_mikoshi', 2, 4, { w: 2 }),
    O('obj_sk_taiko', 6, 4),
    FIND('obj_sk_box', 1, 5, { item: 'item_kinakobou', flag: 'flag_hidden_storage' }),
    BACK('door_town_sk_storage', 4, 6, 38, 32, 'se_door'),
  ],
});

// ================================================================ ひと休み処（9×7）

export const ROWS_SK_REST = [
  '#WWWWWWW#',
  '#WWWWWWW#',
  '#oo...oo#',
  '#.......#',
  '#..oo...#',
  '#ooo....#',
  '######D##',
];

registerMap({
  id: 'map_sk_rest',
  name: 'ひと休み処',
  kind: 'indoor',
  rows: ROWS_SK_REST,
  legend: WOOD_LEGEND,
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  bgm: SHOP_BGM,
  // 麦茶の冷蔵庫（段階1で止まる。40 8 amb_fridge）
  amb: { 0: ['amb_fridge'], 1: [], 2: [] },
  objects: [
    PR('in_sr_shell', 0, 0),
    PR('in_sr_clock', 5, 1),
    PR('in_sr_books', 1, 2),
    PR('in_sr_fridge', 6, 2),
    PR('in_sr_note', 7, 2),
    PR('in_sr_bench', 3, 4),
    PR('in_sr_tabako', 1, 5),
    // examine
    O('obj_sr_board', 4, 1, { face: 'up' }),
    O('obj_sr_books', 1, 2, { w: 2 }),
    O('obj_sr_fridge', 6, 2),
    O('obj_sr_note', 7, 2),
    O('obj_sr_bench', 3, 4, { w: 2 }),
    FIND('obj_sr_tabako', 1, 5, { money: 10, flag: 'flag_hidden_rest' }, { w: 3 }),
    BACK('door_town_sk_rest', 6, 6, 42, 32, 'se_door_glass'),
  ],
});

// ================================================================ 閉店した つりえさ屋（9×7）

export const ROWS_SK_BAIT = [
  '#WWWWWWW#',
  '#WWWWWWW#',
  '#oo.oo.o#',
  '#.......#',
  '#.....oo#',
  '#.......#',
  '#D#######',
];

registerMap({
  id: 'map_sk_bait',
  name: 'つりえさ屋（閉店）',
  kind: 'indoor',
  rows: ROWS_SK_BAIT,
  legend: TILE_LEGEND,
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  onEnter: ['south_enter'],
  bgm: SHOP_BGM,
  amb: { 0: [], 1: [], 2: [] },
  objects: [
    PR('in_sb_shell', 0, 0),
    PR('in_sb_fish', 6, 0),
    // おぴぃの ザリ拓（魚拓の となり。記録ができてから。02 #66、10 7.21）
    { t: 'prop', prop: 'prop_zari_taku', x: 7, y: 0, cond: { flag: 'flag_zari_best' } } as MapObj,
    PR('in_sb_case', 1, 2),
    PR('in_sb_rods', 4, 2),
    PR('in_sb_tank', 7, 2),
    PR('in_sb_register', 6, 4),
    // examine
    O('obj_sb_calendar', 3, 1, { face: 'up' }),
    O('obj_sb_gyotaku', 6, 1, { face: 'up' }),
    FIND('obj_sb_case', 1, 2, { money: 30, flag: 'flag_hidden_bait' }, { w: 2 }),
    O('obj_sb_rods', 4, 2, { w: 2 }),
    O('obj_sb_tank', 7, 2),
    O('obj_sb_register', 6, 4, { w: 2 }),
    O('obj_sb_gap', 2, 6, { w: 7, face: 'down' }),
    BACK('door_town_sk_bait', 1, 6, 46, 32, 'se_door'),
  ],
});

// ================================================================ 公園のトイレ（8×6）

export const ROWS_PARK_TOILET = [
  '#WWWWWW#',
  '#WWWWWW#',
  '#oo....#',
  '#......#',
  '#o...o.#',
  '##D#####',
];

registerMap({
  id: 'map_park_toilet',
  name: '公園のトイレ',
  kind: 'indoor',
  rows: ROWS_PARK_TOILET,
  legend: TILE_LEGEND,
  camera: 'fixed',
  space: 'room',
  theme: 'shop',
  light: 'top',
  // 公園のまま：町の曲が続く（同じ ID は鳴らしなおさない）。換気扇のうなりは段階1で止まる
  bgm: { 0: 'bgm_town_s0', 1: 'bgm_town_s1', 2: 'bgm_town_s2' },
  amb: { 0: ['amb_fridge'], 1: [], 2: [] },
  objects: [
    PR('in_wc_shell', 0, 0),
    PR('in_wc_fan', 3, 1),
    PR('in_wc_sink', 1, 2),
    PR('in_wc_umbrella', 1, 4),
    PR('in_wc_locker', 5, 4),
    // examine
    O('obj_wc_fan', 3, 1, { face: 'up' }),
    O('obj_wc_stall', 4, 1, { w: 3, face: 'up' }),
    FIND('obj_wc_sink', 1, 2, { money: 10, flag: 'flag_hidden_toilet' }, { w: 2 }),
    O('obj_wc_umbrella', 1, 4),
    O('obj_wc_locker', 5, 4),
    BACK('door_town_toilet', 2, 5, 1, 4),
  ],
});

// ================================================================ scripts

/** 人のいない部屋に はじめて入ったとき、入るわけを1ページ（倉庫・つりえさ屋）。 */
registerScript('south_enter', function* () {
  const f = field();
  const id = f?.map.id ?? '';
  const key = `flag_seen_${id}`;
  if (!SENTER[id] || flag(key)) return;
  setFlag(key, 1);
  yield 250;
  yield* runMsg(SENTER[id]);
});

/** 倉庫の垂れ幕（夏まつり）：グソっ君が仲間なら、ひとこと（まつりを 知らない）。 */
registerScript('obj_sk_banner', function* () {
  sfx('se_examine');
  yield* runMsg(flag('flag_kanenari_joined') ? `${SBANNER}\n${SBANNER_FLIP}` : SBANNER);
});

// ================================================================ debug / QA

export const SOUTH_MAPS = ['map_chizu', 'map_madam', 'map_photo', 'map_sk_storage', 'map_sk_rest', 'map_sk_bait', 'map_park_toilet'];

/** 部屋の入口の前（部屋の中）。__game.cmd.south('photo', 2) */
const SPOTS: Record<string, [string, number, number]> = {
  chizu: ['map_chizu', 8, 5],
  madam: ['map_madam', 6, 5],
  photo: ['map_photo', 6, 5],
  storage: ['map_sk_storage', 4, 5],
  rest: ['map_sk_rest', 6, 5],
  bait: ['map_sk_bait', 1, 5],
  toilet: ['map_park_toilet', 2, 4],
};

registerDebug('south', (name?: string, stage?: number) => {
  const s = name ? SPOTS[name] ?? SPOTS[name.replace(/^map_(sk_)?/, '')] : undefined;
  if (!s) return Object.keys(SPOTS);
  const cmd = (window as unknown as { __game: { cmd: Record<string, (...a: unknown[]) => unknown> } }).__game.cmd;
  if (stage !== undefined) cmd.stage?.(stage);
  return cmd.warp?.(s[0], s[1], s[2], 'up');
});

/**
 * QA: every door of these rooms and the town doors that lead into them —
 * the target registered, the arrival tile walkable, a way back that lands
 * in front of the same door. __game.cmd.southDoors()
 */
registerDebug('southDoors', () => {
  const out: string[] = [];
  let ok = 0;
  const town = loadMap('map_town');
  if (!town) return 'map_town missing';
  for (const o of town.objects) {
    if (o.t !== 'door') continue;
    const d = o as DoorObj;
    if (!SOUTH_MAPS.includes(d.to)) continue;
    const room = loadMap(d.to);
    if (!room) {
      out.push(`${d.id}: ${d.to} missing`);
      continue;
    }
    if (cellAt(room, d.tx, d.ty).solid) out.push(`${d.id}: arrival (${d.tx},${d.ty}) in ${d.to} is solid`);
    const back = room.objects.find((q) => q.t === 'door' && (q as DoorObj).to === 'map_town') as DoorObj | undefined;
    if (!back) {
      out.push(`${d.to}: no door back`);
      continue;
    }
    const tc = cellAt(town, back.tx, back.ty);
    if (tc.solid) out.push(`${back.id}: town arrival (${back.tx},${back.ty}) is solid`);
    // the town arrival must be the tile in front of (one of) the town door's cells
    const w = d.w ?? 1;
    if (!(back.ty === d.y + 1 && back.tx >= d.x && back.tx < d.x + w)) out.push(`${back.id}: lands at (${back.tx},${back.ty}), not in front of ${d.id} (${d.x},${d.y})`);
    // the room door's own cell: the arrival stands right above it
    if (!(d.tx === back.x && d.ty === back.y - 1)) out.push(`${d.id}: arrives at (${d.tx},${d.ty}), not in front of ${back.id} (${back.x},${back.y})`);
    if (!out.length) ok++;
  }
  for (const id of SOUTH_MAPS) if (!town.objects.some((o) => o.t === 'door' && (o as DoorObj).to === id)) out.push(`${id}: no door from the town`);
  return { ok, problems: out };
});

/** QA: every page of these rooms — at most 3 lines, each at most 336 px (10 1.1). __game.cmd.southText() */
export function southTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  for (const [name, src] of southTexts()) {
    let lines: string[] = [];
    const flush = () => {
      if (!lines.length) return;
      pages++;
      if (lines.length > 3) bad.push(`${name}: ${lines.length} lines: ${lines.join('／')}`);
      lines = [];
    };
    for (const raw of src.split('\n')) {
      const t = raw.trim();
      if (!t || t.startsWith('>')) continue;
      if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || /^\[.*\]$/.test(t)) {
        flush();
        continue;
      }
      const w = measure(t.replace(/\{[^}]*\}/g, ''));
      if (w > 336) bad.push(`${name}: ${w}px: ${t}`);
      lines.push(t);
    }
    flush();
  }
  // name tags: 6 characters at most (10 1.5)
  for (const n of ['ちずの母', 'かずお', '写真館の主人']) if ([...n].length > 6) bad.push(`name tag ${n}`);
  return { pages, bad };
}
registerDebug('southText', () => southTextCheck());

/** QA: the finds of these rooms and whether each is taken. __game.cmd.southFinds() */
registerDebug('southFinds', () => {
  const rows: string[] = [];
  let money = 0;
  for (const id of SOUTH_MAPS) {
    const m = loadMap(id);
    for (const o of m?.objects ?? []) {
      if (o.t !== 'obj' || !('reward' in o) || !o.reward) continue;
      const r = o.reward;
      money += r.money ?? 0;
      rows.push(`${id} ${o.id}: ${r.item ?? `${r.money}円`} ${flag(r.flag) ? '(taken)' : ''}`);
    }
  }
  return { money, rows };
});

void pickStage;
