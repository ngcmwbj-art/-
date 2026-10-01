// The rooms of 星見台 that can now be entered (02_ch2_index #61,
// 52_ch2_level_art 4.5, texts 50_ch2_story 9.9 / data/text/hoshi_rooms2.ts):
// every house, shed and greenhouse of the village map. Each room fits one
// screen (camera fixed), has its door in the south wall and leads back to
// the tile in front of its door outside.
//
//   map_hoshi_fumi      まつ先生の家            12×9  door (15–16,26)
//   map_hoshi_minka1    トマじいとマルの家      12×9  door (16,31)
//   map_hoshi_minka2    シゲじいとスギばあの家  12×9  door (43,26)
//   map_hoshi_minka3    タケじいの家            12×9  door (44,36)
//   map_hoshi_kucho     ほうき夫婦の家          14×9  door (35,36)
//   map_hoshi_sawako    ソワカの家              12×9  door (21,36) — the kitchen door off the west lane
//   map_hoshi_gen       マサルの家              14×9  door (57–58,43)
//   map_hoshi_kominka   ペロの家（古民家）      16×10 door (2,43) — the earthen kitchen's big door
//   map_hoshi_akiya     森本の家（空き家）      12×9  door (16,36)
//   map_hoshi_shoten    旧商店（売家）          12×9  door (30,36) — the shutter's pass door
//   map_hoshi_soko      区の倉庫                12×9  door (36,31)
//   map_hoshi_gym       体育館                  16×10 door (38,27) — the iron door off the east lane
//   map_hoshi_taihisha  堆肥舎                  10×7  door (49,43) — the middle bay
//   map_hoshi_koya      農具小屋（とまたろう）  8×7   door (34–35,13)
//   map_hoshi_shouboya  消防小屋                8×7   door (44,31)
//   map_hoshi_house1    1号ハウス               9×11  door (10,30)
//   map_hoshi_house2    2号ハウス（ハチ）       9×11  door (6,30)
//
// The people are at the gathering in the old school (or at their work
// outside): the rooms are empty but for マサル's mother asleep. Lights left
// on (lit rooms, #F2E6D0) or off (the night through the windows, a step
// lighter than the village's grade so that everything reads: 50 #50). Each
// room has one find (R2_FIND; 120円 and 11 small things in all, 51 6.4).
// Not rooms: the straw rolls' lean-to (the rolls fill its front: a find in
// the gap), the fallen shed in the abandoned fields (only its roof is left)
// and the observatory (shut, 観望会 休止中: a look through its little window).

import '../../art/props/hoshi_room_c';
import { registerMap } from '../../world/maps';
import type { Dir } from '../../game/state';
import type { DoorObj, MapDef, MapObj, TileSpec } from '../../world/types';
import type { WallDeco } from '../../art/props/hoshi_room_c';
import { hg, PR } from './hoshi_common';
import { R2_AFTER, R2_FIND, R2_OBJ } from '../text/hoshi_rooms2';
import { ROOM2_PLACE } from './hoshi_rooms2_names';

// ---------------------------------------------------------------- legend

const WALLS: Record<string, TileSpec> = {
  '#': { ground: 'void', solid: true, tag: 'void' },
  W: { ground: 'void', solid: true, tag: 'iwall' },
  D: { ground: 'void', solid: true, door: true, tag: 'door' },
};
/** Floors, and the same floor under a piece of furniture (solid). */
const FLOORS: Record<string, TileSpec> = {
  '.': { ground: 'wood', step: 'se_step_wood' },
  o: { ground: 'wood', solid: true, tag: 'prop' },
  t: { ground: 'tatami', step: 'se_step_tatami' },
  O: { ground: 'tatami', solid: true, tag: 'prop' },
  g: { ground: 'genkan', step: 'se_step_stone' },
  d: { ground: 'dirt', step: 'se_step_dirt' },
  x: { ground: 'dirt', solid: true, tag: 'prop' },
  c: { ground: hg('h_concrete'), step: 'se_step_stone' },
  X: { ground: hg('h_concrete'), solid: true, tag: 'prop' },
  k: { ground: 'kitchen', step: 'se_step_tile' },
  K: { ground: 'kitchen', solid: true, tag: 'prop' },
  w: { ground: hg('h_schoolwood'), step: 'se_step_wood_bare' },
  V: { ground: hg('h_schoolwood'), solid: true, tag: 'prop' },
  s: { ground: hg('h_sheet'), step: 'se_step_sheet' },
  Q: { ground: hg('h_sheet'), solid: true, tag: 'prop' },
  p: { ground: hg('h_mulch'), solid: true, tag: 'prop' },
};
const LEGEND = { ...WALLS, ...FLOORS };

// ---------------------------------------------------------------- object helpers

/** An examinable with its text from R2_OBJ (plain or stage keys). */
function X(id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj {
  const t = R2_OBJ[id];
  const text = typeof t === 'string' ? t : t ? stageText(t) : undefined;
  return { t: 'obj', id, x, y, text, ...extra } as unknown as MapObj;
}

/** The same text at a second place. */
function X2(id: string, n: number, x: number, y: number, extra: Record<string, unknown> = {}): MapObj {
  const o = X(id, x, y, extra) as unknown as Record<string, unknown>;
  o.id = `${id}_${n}`;
  return o as unknown as MapObj;
}

function stageText(t: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(t)) out[k === 'text' ? 'default' : k] = v;
  return out;
}

/** A find: the first look gives the item / money once (flag_ch2_find_<room>); later the after-text. */
function FIND(id: string, x: number, y: number, reward: { item?: string; money?: number }, extra: Record<string, unknown> = {}): MapObj {
  const after = R2_AFTER[id];
  return {
    t: 'obj',
    id,
    x,
    y,
    text: R2_FIND[id],
    reward: { ...reward, flag: 'flag_ch2_find_' + id.replace(/^obj_hr_/, ''), after: typeof after === 'string' ? after : after ? stageText(after) : undefined },
    ...extra,
  } as unknown as MapObj;
}

const U = { face: 'up' as Dir };

// ---------------------------------------------------------------- the rooms

export interface Room2 {
  key: string;
  map: string;
  name: string;
  rows: string[];
  wall: 'plaster' | 'board' | 'tin' | 'block' | 'gym' | 'film' | 'shop';
  door: 'hikido' | 'glass' | 'wood' | 'shutter' | 'film' | 'iron' | 'open';
  deco: WallDeco[];
  objects: MapObj[];
  /** the door outside (map_hoshimidai): its cell(s), where one stands in front of it, and which way one pushes into it */
  out: { x: number; y: number; w?: number; stand: [number, number]; dir: Dir; se: string };
  /** light left on (the bulb-colour room) or the night through the windows */
  lit: boolean;
  lightBase?: string;
  variant?: string;
  amb?: string[];
  ambVol?: Record<string, { vol: number; lp?: number }>;
  onEnter?: string[];
}

const LIT = '#F2E6D0';
/** Lights off: the night through the windows, readable everywhere (50 #50, the train is #7A78AA). */
const NIGHT_ROOM = '#9A96C4';
const INSECTS_IN = { amb_h_insects: { vol: 0.35, lp: 2000 } };
const INSECTS_SHED = { amb_h_insects: { vol: 0.55, lp: 3500 } };

export const ROOMS2: Room2[] = [
  // ============================================================ まつ先生の家
  {
    key: 'fumi',
    map: 'map_hoshi_fumi',
    name: 'まつ先生の家',
    rows: [
      '#WWWWWWWWWW#',
      '#WWWWWWWWWW#',
      '#oo..OOtttt#',
      '#....ttttOt#',
      '#....tttttt#',
      '#....ttOOtt#',
      '#....tttttO#',
      '#gg..ttttOO#',
      '##D#########',
    ],
    wall: 'plaster',
    door: 'hikido',
    deco: [
      { k: 'keys', x: 3 },
      { k: 'paper', x: 5, w: 2, v: 'long' },
      { k: 'window', x: 7, w: 2, hill: true },
      { k: 'calendar', x: 9 },
      { k: 'frame', x: 10, v: 'kansha' },
    ],
    objects: [
      PR('prop_hr_shelf', 1, 2, { v: 'stars' }),
      PR('prop_hr_clock', 4, 0),
      PR('prop_hr_workbench', 5, 2, { v: 'genko' }),
      PR('prop_hr_telescope', 9, 3),
      PR('prop_hr_chabudai', 7, 5, { items: 'tea,hayami' }),
      PR('prop_hr_tansu', 9, 7, { top: 'photo' }),
      PR('prop_hr_katori', 10, 4),
      PR('prop_hr_senpuki', 10, 6, { on: true }),
      PR('prop_hr_furin', 7, 0),
      PR('prop_hr_lamp', 7, 7, { dx: 8 }),
      X('obj_hr_fumi_hon', 1, 2),
      FIND('obj_hr_fumi_konpeito', 2, 2, { item: 'item_konpeito' }),
      X('obj_hr_fumi_kagi', 3, 1, U),
      X('obj_hr_fumi_tokei', 4, 1, U),
      X('obj_hr_fumi_genko', 5, 2, { w: 2 }),
      X('obj_hr_fumi_mado', 7, 1, { w: 2, ...U }),
      X('obj_hr_fumi_calendar', 9, 1, U),
      X('obj_hr_fumi_kansha', 10, 1, U),
      X('obj_hr_fumi_boen', 9, 3),
      X('obj_hr_fumi_chabudai', 7, 5, { w: 2 }),
      X('obj_hr_fumi_photo', 9, 7, { w: 2 }),
    ],
    out: { x: 15, y: 26, w: 2, stand: [15, 27], dir: 'up', se: 'se_door_glass' },
    lit: true,
  },
  // ============================================================ トマじいとマルの家（民家1）
  {
    key: 'minka1',
    map: 'map_hoshi_minka1',
    name: 'トマじいの家',
    rows: [
      '#WWWWWWWWWW#',
      '#WWWWWWWWWW#',
      '#KKKktOtOtt#',
      '#kkkktttttt#',
      '#Kkkktttttt#',
      '#kkkktOOttt#',
      '#kkkktttttt#',
      '#ggGkttOttt#',
      '##D#########',
    ],
    wall: 'plaster',
    door: 'hikido',
    deco: [
      { k: 'shelf', x: 2, w: 2 },
      { k: 'calendar', x: 4 },
      { k: 'hooks', x: 5, v: 'hanger' },
      { k: 'kamidana', x: 6 },
      { k: 'frame', x: 7, v: 'couple' },
      { k: 'window', x: 9, w: 2, hill: true },
    ],
    objects: [
      PR('prop_hr_fridge', 1, 2),
      PR('prop_hr_nagashi', 2, 2),
      PR('prop_hr_tv', 6, 2),
      PR('prop_hr_butsudan', 8, 2),
      PR('prop_hr_obj', 1, 4, { v: 'komebitsu' }),
      PR('prop_hr_chabudai', 6, 5, { items: 'tea' }),
      PR('prop_hr_obj', 3, 7, { v: 'kagu' }),
      PR('prop_hr_kingyo', 7, 7),
      PR('prop_hr_katori', 10, 5),
      PR('prop_hr_furin', 9, 0),
      PR('prop_hr_lamp', 6, 7, { dx: 8 }),
      X('obj_hr_mk1_reizouko', 1, 2),
      X('obj_hr_mk1_nagashi', 2, 2, { w: 2 }),
      X('obj_hr_mk1_calendar', 4, 1, U),
      X('obj_hr_mk1_hanger', 5, 1, U),
      X('obj_hr_mk1_tv', 6, 2),
      X('obj_hr_mk1_photo', 7, 1, U),
      X('obj_hr_mk1_butsudan', 8, 2),
      X('obj_hr_mk1_mado', 9, 1, { w: 2, ...U }),
      X('obj_hr_mk1_komebitsu', 1, 4),
      X('obj_hr_mk1_kingyo', 7, 7),
      FIND('obj_hr_mk1_kago', 3, 7, { item: 'item_kinakobou' }),
    ],
    out: { x: 16, y: 31, stand: [16, 32], dir: 'up', se: 'se_door_glass' },
    lit: true,
  },
  // ============================================================ シゲじいとスギばあの家（民家2）
  {
    key: 'minka2',
    map: 'map_hoshi_minka2',
    name: 'シゲじいとスギばあの家',
    rows: [
      '#WWWWWWWWWW#',
      '#WWWWWWWWWW#',
      '#OOtttttOtO#',
      '#tttttttttt#',
      '#tttttttttt#',
      '#ttttOOtttt#',
      '#Ottttttttt#',
      '#ggttttttOO#',
      '##D#########',
    ],
    wall: 'plaster',
    door: 'hikido',
    deco: [
      { k: 'chart', x: 3, w: 2, v: 'shiritori' },
      { k: 'frame', x: 5, v: 'couple' },
      { k: 'window', x: 6, w: 2, hill: true },
      { k: 'calendar', x: 9 },
      { k: 'kamidana', x: 10 },
    ],
    objects: [
      PR('prop_hr_shelf', 1, 2, { v: 'chadansu' }),
      PR('prop_hr_tv', 8, 2, { top: 'clocks' }),
      PR('prop_hr_futon2', 10, 2),
      PR('prop_hr_chabudai', 5, 5, { items: 'two' }),
      PR('prop_h_zabuton', 4, 5, { c: 1 }),
      PR('prop_h_zabuton', 7, 5, { c: 0 }),
      PR('prop_hr_tansu', 9, 7),
      PR('prop_hr_kingyo', 1, 6),
      PR('prop_hr_katori', 3, 6),
      PR('prop_hr_furin', 6, 0),
      PR('prop_hr_lamp', 5, 7, { kind: 'bulb', r: 60, dx: 8 }),
      FIND('obj_hr_mk2_chadansu', 1, 2, { item: 'item_hakka_ame' }, { w: 2 }),
      X('obj_hr_mk2_hyou', 3, 1, { w: 2, ...U }),
      X('obj_hr_mk2_photo', 5, 1, U),
      X('obj_hr_mk2_mado', 6, 1, { w: 2, ...U }),
      X('obj_hr_mk2_tokei', 8, 2),
      X('obj_hr_mk2_calendar', 9, 1, U),
      X('obj_hr_mk2_futon', 10, 2),
      X('obj_hr_mk2_chabudai', 5, 5, { w: 2 }),
      X('obj_hr_mk2_zabuton', 4, 5, { flat: true }),
      X('obj_hr_mk2_tansu', 9, 7, { w: 2 }),
    ],
    out: { x: 43, y: 26, stand: [43, 27], dir: 'up', se: 'se_door_glass' },
    lit: false,
    lightBase: '#B4A8C4',
  },
  // ============================================================ タケじいの家（民家3）
  {
    key: 'minka3',
    map: 'map_hoshi_minka3',
    name: 'タケじいの家',
    rows: [
      '#WWWWWWWWWW#',
      '#WWWWWWWWWW#',
      '#xxddttOtOO#',
      '#ddddtttttt#',
      '#ddddtttttt#',
      '#xdddttttOt#',
      '#ddddtttttt#',
      '#ddddttOOtt#',
      '##D#########',
    ],
    wall: 'plaster',
    door: 'wood',
    deco: [
      { k: 'hooks', x: 1, w: 2, v: 'tools' },
      { k: 'hooks', x: 3, v: 'hat' },
      { k: 'chart', x: 4, v: 'une' },
      { k: 'window', x: 5, w: 2, hill: true },
      { k: 'calendar', x: 8 },
    ],
    objects: [
      PR('prop_hr_workbench', 1, 2, { v: 'manual' }),
      PR('prop_hr_tv', 7, 2, { on: true }),
      PR('prop_hr_tansu', 9, 2),
      PR('prop_hr_obj', 1, 5, { v: 'bucket' }),
      PR('prop_hr_senpuki', 9, 5, { on: true }),
      PR('prop_hr_chabudai', 7, 7, { items: 'tea' }),
      PR('prop_hr_katori', 5, 6),
      PR('prop_hr_lamp', 7, 6),
      X('obj_hr_mk3_manual', 1, 2, { w: 2 }),
      X('obj_hr_mk3_boushi', 3, 1, U),
      X('obj_hr_mk3_une', 4, 1, U),
      X('obj_hr_mk3_mado', 5, 1, { w: 2, ...U }),
      X('obj_hr_mk3_tv', 7, 2),
      X('obj_hr_mk3_tansu', 9, 2, { w: 2 }),
      X('obj_hr_mk3_senpuki', 9, 5),
      X('obj_hr_mk3_chabudai', 7, 7, { w: 2 }),
      FIND('obj_hr_mk3_bucket', 1, 5, { item: 'item_ramune' }),
      // 喫茶 初日の出へ 送る 豆の 焙煎器と 麻袋（げむきか9/30の5、02 #71。art/props/cape_coffee.ts）
      PR('prop_hr_baisen', 1, 7),
      X('obj_hr_mk3_baisen', 1, 7, { solid: [0, 0, 1, 1] }),
    ],
    out: { x: 44, y: 36, stand: [44, 37], dir: 'up', se: 'se_door' },
    lit: true,
  },
  // ============================================================ ほうき夫婦の家
  {
    key: 'kucho',
    map: 'map_hoshi_kucho',
    name: 'ほうき家',
    rows: [
      '#WWWWWWWWWWWW#',
      '#WWWWWWWWWWWW#',
      '#oo..ttOOtOOt#',
      '#....tttttttt#',
      '#....tttttttt#',
      '#o...ttOOtttt#',
      '#....tttttttt#',
      '#gg..ttttttOt#',
      '##D###########',
    ],
    wall: 'plaster',
    door: 'hikido',
    deco: [
      { k: 'map', x: 3 },
      { k: 'calendar', x: 4 },
      { k: 'window', x: 5, w: 2, hill: true },
      { k: 'scroll', x: 8 },
      { k: 'frame', x: 9, v: 'wedding' },
      { k: 'kamidana', x: 10 },
      { k: 'paper', x: 12 },
    ],
    objects: [
      PR('prop_hr_shelf', 1, 2, { v: 'kairan' }),
      PR('prop_hr_workbench', 7, 2, { v: 'shikiji' }),
      PR('prop_hr_obj', 10, 2, { v: 'bonsai' }),
      PR('prop_hr_obj', 11, 2, { v: 'bonsai' }),
      PR('prop_hr_obj', 1, 5, { v: 'oke' }),
      PR('prop_hr_chabudai', 7, 5, { items: 'tea' }),
      PR('prop_hr_kingyo', 11, 7),
      PR('prop_hr_katori', 4, 6),
      PR('prop_hr_furin', 5, 0),
      PR('prop_hr_lamp', 7, 7, { dx: 8 }),
      X('obj_hr_kucho_kairan', 1, 2, { w: 2 }),
      X('obj_hr_kucho_chizu', 3, 1, U),
      X('obj_hr_kucho_calendar', 4, 1, U),
      X('obj_hr_kucho_mado', 5, 1, { w: 2, ...U }),
      X('obj_hr_kucho_shikiji', 7, 2),
      FIND('obj_hr_kucho_shuniku', 8, 2, { item: 'item_kairan_shuniku' }),
      X('obj_hr_kucho_yuki', 9, 1, U),
      X('obj_hr_kucho_bonsai', 10, 2, { w: 2 }),
      X('obj_hr_kucho_tsukemono', 1, 5),
      X('obj_hr_kucho_kingyo', 11, 7),
      // (ぴょん夫人's スズムシ case is out under the eaves by the road since 02 #80: hoshi_village.ts)
    ],
    out: { x: 35, y: 36, stand: [35, 37], dir: 'up', se: 'se_door_glass' },
    lit: true,
  },
  // ============================================================ ソワカの家
  {
    key: 'sawako',
    map: 'map_hoshi_sawako',
    name: 'ソワカの家',
    rows: [
      '#WWWWWWWWWW#',
      '#WWWWWWWWWW#',
      '#oo......oo#',
      '#....o.....#',
      '#..........#',
      '#.....oo...#',
      '#KKk......o#',
      '#kkk.......#',
      '##D#########',
    ],
    wall: 'board',
    door: 'glass',
    deco: [
      { k: 'window', x: 3, w: 2, hill: true },
      { k: 'sketches', x: 5, w: 2 },
      { k: 'onions', x: 7 },
      { k: 'calendar', x: 8 },
      { k: 'paper', x: 9, w: 2, v: 'long' },
    ],
    objects: [
      PR('prop_hr_shelf', 1, 2, { v: 'paint' }),
      PR('prop_hr_workbench', 9, 2, { v: 'fuda' }),
      PR('prop_hr_easel', 5, 3),
      PR('prop_hr_chabudai', 6, 5, { items: 'sketch' }),
      PR('prop_hr_nagashi', 1, 6),
      PR('prop_hr_senpuki', 10, 6, { on: true }),
      PR('prop_hr_katori', 8, 6),
      PR('prop_hr_furin', 3, 0),
      PR('prop_hr_lamp', 6, 7, { dx: 8 }),
      X('obj_hr_sawako_enogu', 1, 2, { w: 2 }),
      X('obj_hr_sawako_mado', 3, 1, { w: 2, ...U }),
      X('obj_hr_sawako_kabe', 5, 1, { w: 2, ...U }),
      X('obj_hr_sawako_tamanegi', 7, 1, U),
      X('obj_hr_sawako_easel', 5, 3),
      X('obj_hr_sawako_fuda', 9, 2, { w: 2 }),
      X('obj_hr_sawako_chabudai', 6, 5, { w: 2 }),
      FIND('obj_hr_sawako_ajimi', 1, 6, { item: 'item_kyuri_zuke' }, { w: 2 }),
    ],
    out: { x: 21, y: 36, stand: [20, 36], dir: 'right', se: 'se_door_glass' },
    lit: true,
  },
  // ============================================================ マサルの家
  {
    key: 'gen',
    map: 'map_hoshi_gen',
    name: 'マサルの家',
    rows: [
      '#WWWWWWWWWWWW#',
      '#WWWWWWWWWWWW#',
      '#oo..tttOttOO#',
      '#....tttttttt#',
      '#....ttttOttt#',
      '#....ttttOOtt#',
      '#....tttttttt#',
      '#gg..tttttttt#',
      '##D###########',
    ],
    wall: 'plaster',
    door: 'hikido',
    deco: [
      { k: 'hooks', x: 1, v: 'hat' },
      { k: 'calendar', x: 3, v: 'kyuji' },
      { k: 'chart', x: 4 },
      { k: 'window', x: 5, w: 2 },
      { k: 'frame', x: 7, v: 'work' },
      { k: 'post', x: 9 },
      { k: 'scroll', x: 10 },
    ],
    objects: [
      PR('prop_hr_workbench', 1, 2, { v: 'hikae' }),
      PR('prop_hr_butsudan', 8, 2, { lit: true }),
      PR('prop_hr_tansu', 11, 2, { top: 'radio' }),
      PR('prop_hr_futon', 9, 4),
      PR('prop_hr_obj', 10, 5, { v: 'andon' }),
      PR('prop_hr_obj', 3, 6, { v: 'dogbed' }),
      PR('prop_hr_katori', 6, 6),
      X('obj_hr_gen_hikae', 1, 2, { w: 2 }),
      X('obj_hr_gen_calendar', 3, 1, U),
      X('obj_hr_gen_mado', 5, 1, { w: 2, ...U }),
      X('obj_hr_gen_photo', 7, 1, U),
      X('obj_hr_gen_butsudan', 8, 2),
      X('obj_hr_gen_tansu', 11, 2, { w: 2 }),
      X('obj_hr_gen_haha', 9, 4, { h: 2 }),
      X('obj_hr_gen_andon', 10, 5),
      FIND('obj_hr_gen_hiroimono', 3, 6, { money: 10 }, { flat: true }),
    ],
    out: { x: 57, y: 43, w: 2, stand: [57, 44], dir: 'up', se: 'se_door_glass' },
    lit: false,
    lightBase: '#ACA2C2',
    amb: ['amb_h_insects', 'amb_h_barn_out'],
    ambVol: { ...INSECTS_IN, amb_h_barn_out: { vol: 0.3, lp: 1200 } },
  },
  // ============================================================ ペロの家（古民家）
  {
    key: 'kominka',
    map: 'map_hoshi_kominka',
    name: 'ペロの家',
    rows: [
      '#WWWWWWWWWWWWWW#',
      '#WWWWWWWWWWWWWW#',
      '#xxdxd....tttOt#',
      '#ddddd....ttttt#',
      '#ddddd.oo.ttttt#',
      '#xdddd.oo.tOOtt#',
      '#ddddd....ttttt#',
      '#ddddd....ttttt#',
      '#ddddd....ttttt#',
      '##D#############',
    ],
    wall: 'board',
    door: 'wood',
    deco: [
      { k: 'shelf', x: 1, w: 2 },
      { k: 'calendar', x: 3 },
      { k: 'post', x: 5 },
      { k: 'window', x: 6, w: 2, v: 'shoji' },
      { k: 'frame', x: 8, v: 'photo' },
      { k: 'post', x: 9 },
      { k: 'hooks', x: 10, w: 2, v: 'hats3' },
      { k: 'scroll', x: 12 },
      { k: 'kamidana', x: 14 },
    ],
    objects: [
      PR('prop_hr_kamado', 1, 2),
      PR('prop_hr_obj', 4, 2, { v: 'mizugame' }),
      PR('prop_hr_obj', 1, 5, { v: 'omake' }),
      PR('prop_hr_irori', 7, 4),
      PR('prop_hr_butsudan', 13, 2, { lit: true }),
      PR('prop_hr_chabudai', 11, 5, { items: 'letters' }),
      PR('prop_hr_katori', 9, 7),
      PR('prop_hr_lamp', 8, 8, { kind: 'bulb', r: 80, dx: 8 }),
      X('obj_hr_kominka_kamado', 1, 2, { w: 2 }),
      X('obj_hr_kominka_calendar', 3, 1, U),
      X('obj_hr_kominka_mizugame', 4, 2),
      X('obj_hr_kominka_mado', 6, 1, { w: 2, ...U }),
      X('obj_hr_kominka_kuriko', 8, 1, U),
      X('obj_hr_kominka_boushi', 10, 1, { w: 2, ...U }),
      X('obj_hr_kominka_butsudan', 13, 2),
      X('obj_hr_kominka_irori', 7, 4, { w: 2, h: 2 }),
      X('obj_hr_kominka_tegami', 11, 5, { w: 2 }),
      FIND('obj_hr_kominka_omake', 1, 5, { item: 'item_fugashi' }),
    ],
    out: { x: 2, y: 43, stand: [2, 44], dir: 'up', se: 'se_door' },
    lit: true,
    lightBase: '#E2D6C6',
  },
  // ============================================================ 森本の家（空き家A）
  {
    key: 'akiya',
    map: 'map_hoshi_akiya',
    name: '森本の家',
    rows: [
      '#WWWWWWWWWW#',
      '#WWWWWWWWWW#',
      '#OOtttttOOt#',
      '#tttttttttt#',
      '#tttttOtttt#',
      '#tttttttttt#',
      '#ttttttttOO#',
      '#ggtttttttt#',
      '##D#########',
    ],
    wall: 'plaster',
    door: 'wood',
    deco: [
      { k: 'window', x: 3, w: 2, v: 'amado' },
      { k: 'calendar', x: 5 },
      { k: 'paper', x: 6 },
      { k: 'post', x: 7 },
      { k: 'frame', x: 10, v: 'ghost' },
    ],
    objects: [
      PR('prop_hr_cloth', 1, 2),
      PR('prop_hr_cloth', 8, 2, { v: 'low' }),
      PR('prop_hr_pillar', 6, 4),
      PR('prop_hr_cloth', 9, 6, { v: 'low' }),
      PR('prop_hr_shaft', 3, 2, { w: 2, h: 4, shear: 0.3 }),
      PR('prop_hr_shaft', 4, 2, { w: 2, h: 3, shear: 0.35 }),
      PR('prop_hr_shaft', 2, 7, { w: 1, h: 1, shear: 0 }),
      X('obj_hr_akiya_nuno', 1, 2, { w: 2 }),
      X2('obj_hr_akiya_nuno', 1, 8, 2, { w: 2 }),
      X2('obj_hr_akiya_nuno', 2, 9, 6, { w: 2 }),
      X('obj_hr_akiya_amado', 3, 1, { w: 2, ...U }),
      X('obj_hr_akiya_calendar', 5, 1, U),
      X('obj_hr_akiya_memo', 6, 1, U),
      X('obj_hr_akiya_ato', 10, 1, U),
      X('obj_hr_akiya_hashira', 6, 4),
      FIND('obj_hr_akiya_yuka', 4, 6, { money: 10 }, { flat: true }),
    ],
    out: { x: 16, y: 36, stand: [16, 37], dir: 'up', se: 'se_door' },
    lit: false,
    lightBase: '#8E8ABA',
  },
  // ============================================================ 旧商店（売家）
  {
    key: 'shoten',
    map: 'map_hoshi_shoten',
    name: '旧商店',
    rows: [
      '#WWWWWWWWWW#',
      '#WWWWWWWWWW#',
      '#XXXXcccccc#',
      '#cccccccXXc#',
      '#cccXXccccc#',
      '#cccccccccc#',
      '#XXcccccccc#',
      '#cccccccccc#',
      '#####D######',
    ],
    wall: 'shop',
    door: 'shutter',
    deco: [
      { k: 'board', x: 5, w: 3 },
      { k: 'paper', x: 8, w: 2, v: 'long' },
      { k: 'calendar', x: 10 },
    ],
    objects: [
      PR('prop_hr_shelf', 1, 2, { v: 'empty' }),
      PR('prop_hr_shelf', 3, 2, { v: 'empty' }),
      PR('prop_hr_counter', 8, 3),
      PR('prop_hr_freezer', 4, 4),
      PR('prop_hr_boxes', 1, 6, { v: 'crate' }),
      PR('prop_hr_shaft', 5, 5, { w: 1, h: 3, shear: 0 }),
      // the night through the rust holes in the shutter's box, high on the south wall
      PR('prop_hr_shaft', 7, 4, { w: 1, h: 3, shear: -0.2 }),
      PR('prop_hr_shaft', 2, 3, { w: 1, h: 3, shear: -0.25 }),
      X('obj_hr_shoten_tana', 1, 2, { w: 4 }),
      X('obj_hr_shoten_menu', 5, 1, { w: 3, ...U }),
      X('obj_hr_shoten_harigami', 8, 1, { w: 2, ...U }),
      X('obj_hr_shoten_calendar', 10, 1, U),
      FIND('obj_hr_shoten_register', 8, 3, { money: 10 }),
      X('obj_hr_shoten_abacus', 9, 3),
      X('obj_hr_shoten_reitou', 4, 4, { w: 2 }),
      X('obj_hr_shoten_ramune', 1, 6, { w: 2 }),
    ],
    out: { x: 30, y: 36, stand: [30, 37], dir: 'up', se: 'se_door_small' },
    lit: false,
    lightBase: '#9490C0',
  },
  // ============================================================ 区の倉庫（空き家B）
  {
    key: 'soko',
    map: 'map_hoshi_soko',
    name: '区の倉庫',
    rows: [
      '#WWWWWWWWWW#',
      '#WWWWWWWWWW#',
      '#XXcXccXXcc#',
      '#cccccccccc#',
      '#ccccccccXc#',
      '#XXcccccccc#',
      '#ccccccXXcc#',
      '#cccccccccc#',
      '######D#####',
    ],
    wall: 'tin',
    door: 'wood',
    deco: [
      { k: 'paper', x: 3 },
      { k: 'window', x: 5, w: 2, v: 'amado' },
      { k: 'hooks', x: 9, w: 2, v: 'tools' },
    ],
    objects: [
      PR('prop_hr_boxes', 1, 2, { v: 'chochin' }),
      PR('prop_hr_obj', 4, 2, { v: 'taiko' }),
      PR('prop_hr_boxes', 7, 2, { v: 'tent' }),
      PR('prop_hr_obj', 9, 4, { v: 'kusakari' }),
      PR('prop_hr_boxes', 1, 5, { v: 'boards' }),
      PR('prop_hr_workbench', 7, 6),
      PR('prop_hr_lamp', 6, 7, { kind: 'bulb', on: false }),
      PR('prop_hr_shaft', 5, 2, { w: 2, h: 4, shear: 0.25 }),
      PR('prop_hr_shaft', 6, 2, { w: 1, h: 3, shear: 0.3 }),
      X('obj_hr_soko_chochin', 1, 2, { w: 2 }),
      X('obj_hr_soko_note', 3, 1, U),
      X('obj_hr_soko_taiko', 4, 2),
      X('obj_hr_soko_mado', 5, 1, { w: 2, ...U }),
      X('obj_hr_soko_tent', 7, 2, { w: 2 }),
      X('obj_hr_soko_dogu', 9, 1, { w: 2, ...U }),
      X('obj_hr_soko_kusakari', 9, 4),
      X('obj_hr_soko_yagura', 1, 5, { w: 2 }),
      FIND('obj_hr_soko_stamp', 7, 6, { item: 'item_stamp_pad' }, { w: 2 }),
    ],
    out: { x: 36, y: 31, stand: [36, 32], dir: 'up', se: 'se_door' },
    lit: false,
    lightBase: '#9490C0',
    amb: ['amb_h_insects'],
    ambVol: INSECTS_SHED,
  },
  // ============================================================ 体育館
  {
    key: 'gym',
    map: 'map_hoshi_gym',
    name: '分校の体育館',
    rows: [
      '#WWWWWWWWWWWWWW#',
      '#WWWWWWWWWWWWWW#',
      '#wwVVVVVVVVVVVV#',
      '#wwwwwwwwwwwwww#',
      '#wwwwwwwwwwwwww#',
      '#Vwwwwwwwwwwwww#',
      '#Vwwwwwwwwwwwww#',
      '#wwwwwwwwwwwwVw#',
      '#wwwwwwwwwwwwww#',
      '##############D#',
    ],
    wall: 'gym',
    door: 'iron',
    deco: [
      { k: 'hoop', x: 1 },
      { k: 'curtain', x: 3, w: 10 },
      { k: 'banner', x: 3, w: 10 },
      { k: 'window', x: 13, w: 2, v: 'high' },
      { k: 'exit', x: 13 },
    ],
    objects: [
      PR('prop_hr_stage', 3, 2),
      PR('prop_hr_shelf', 13, 2, { v: 'bichiku' }),
      PR('prop_hr_chairs', 1, 6),
      PR('prop_hr_ballcage', 13, 7),
      PR('prop_hr_shaft', 4, 3, { w: 2, h: 5, shear: 0.5 }),
      PR('prop_hr_shaft', 10, 3, { w: 2, h: 5, shear: 0.5 }),
      PR('prop_hr_shaft', 7, 3, { w: 2, h: 4, shear: 0.5 }),
      PR('prop_hr_glow', 13, 0, { x: 8, y: 8, rgb: '96,255,140', c: '#7CFF9A' }),
      X('obj_hr_gym_goal', 1, 1, U),
      FIND('obj_hr_gym_hikidashi', 3, 2, { item: 'item_shuzumi' }),
      X('obj_hr_gym_butai', 4, 2, { w: 5 }),
      X('obj_hr_gym_banner', 9, 2, { w: 4 }),
      X('obj_hr_gym_bichiku', 13, 2, { w: 2 }),
      X('obj_hr_gym_chairs', 1, 5, { h: 2 }),
      X('obj_hr_gym_ball', 13, 7),
      X('obj_hr_gym_yuka', 7, 6, { flat: true }),
    ],
    out: { x: 38, y: 27, stand: [39, 27], dir: 'left', se: 'se_door_heavy' },
    lit: false,
    lightBase: '#9894C4',
    variant: 'school',
    amb: ['amb_h_insects'],
    ambVol: { amb_h_insects: { vol: 0.3, lp: 1800 } },
  },
  // ============================================================ 堆肥舎
  {
    key: 'taihisha',
    map: 'map_hoshi_taihisha',
    name: '堆肥舎',
    rows: [
      '#WWWWWWWW#',
      '#WWWWWWWW#',
      '#XXXXcXXX#',
      '#XXXccXXX#',
      '#XXcccccc#',
      '#cccccccX#',
      '####D#####',
    ],
    wall: 'block',
    door: 'open',
    deco: [{ k: 'paper', x: 5 }],
    objects: [
      PR('prop_hr_heap', 1, 2),
      PR('prop_hr_heap', 6, 2),
      PR('prop_hr_obj', 4, 2, { v: 'fork' }),
      PR('prop_hr_boxes', 1, 4, { v: 'bags' }),
      PR('prop_hr_obj', 8, 5, { v: 'gunte' }),
      X('obj_hr_taihi_yama', 1, 2, { w: 3, h: 2 }),
      X('obj_hr_taihi_fork', 4, 2),
      X('obj_hr_taihi_harigami', 5, 1, U),
      X('obj_hr_taihi_ondo', 6, 2, { w: 3, h: 2 }),
      X('obj_hr_taihi_fukuro', 1, 4, { w: 2 }),
      FIND('obj_hr_taihi_gunte', 8, 5, { money: 10 }),
    ],
    out: { x: 49, y: 43, stand: [49, 44], dir: 'up', se: 'se_step_stone' },
    lit: false,
    lightBase: '#A09CC8',
    amb: ['amb_h_insects', 'amb_h_barn_out'],
    ambVol: { amb_h_insects: { vol: 0.7, lp: 6000 }, amb_h_barn_out: { vol: 0.45, lp: 2500 } },
  },
  // ============================================================ 農具小屋（とまたろう）
  {
    key: 'koya',
    map: 'map_hoshi_koya',
    name: 'とまたろうの小屋',
    rows: [
      '#WWWWWW#',
      '#WWWWWW#',
      '#dddxxd#',
      '#dddddd#',
      '#xddddx#',
      '#dddddd#',
      '###D####',
    ],
    wall: 'board',
    door: 'wood',
    deco: [
      { k: 'hooks', x: 1, w: 2, v: 'tools' },
      { k: 'chart', x: 3, v: 'mizu' },
      { k: 'window', x: 6, hill: true },
    ],
    objects: [
      PR('prop_hr_boxes', 4, 2, { v: 'boards' }),
      PR('prop_hr_obj', 1, 4, { v: 'suito' }),
      PR('prop_hr_obj', 6, 4, { v: 'kigae' }),
      PR('prop_hr_shaft', 6, 2, { w: 1, h: 3, shear: -0.3 }),
      PR('prop_hr_katori', 4, 4),
      X('obj_hr_koya_kama', 1, 1, { w: 2, ...U }),
      X('obj_hr_koya_hyou', 3, 1, U),
      X('obj_hr_koya_ita', 4, 2, { w: 2 }),
      X('obj_hr_koya_mado', 6, 1, U),
      X('obj_hr_koya_kigae', 6, 4),
      FIND('obj_hr_koya_suito', 1, 4, { item: 'item_umeboshi' }),
    ],
    out: { x: 34, y: 13, w: 2, stand: [34, 14], dir: 'up', se: 'se_door_small' },
    lit: false,
    lightBase: '#A09CC8',
    amb: ['amb_h_insects', 'amb_h_tanada'],
    ambVol: { amb_h_insects: { vol: 0.6, lp: 4000 }, amb_h_tanada: { vol: 0.35, lp: 2500 } },
  },
  // ============================================================ 消防小屋
  {
    key: 'shouboya',
    map: 'map_hoshi_shouboya',
    name: '消防小屋',
    rows: [
      '#WWWWWW#',
      '#WWWWWW#',
      '#ccccXc#',
      '#cXXXcc#',
      '#cXXXcX#',
      '#cccccc#',
      '###D####',
    ],
    wall: 'tin',
    door: 'shutter',
    deco: [
      { k: 'hooks', x: 1, w: 3, v: 'happi' },
      { k: 'chart', x: 4 },
      { k: 'hooks', x: 5, v: 'helmets' },
      { k: 'paper', x: 6 },
    ],
    objects: [
      PR('prop_hr_pump', 2, 4),
      PR('prop_hr_obj', 5, 2, { v: 'hosebox' }),
      PR('prop_hr_obj', 6, 4, { v: 'kyukyu' }),
      // the roll-up door's gap at its foot, and the pump's pilot lamp (blinking, as the 消防団 left it charging)
      PR('prop_hr_shaft', 3, 4, { w: 1, h: 2, shear: 0 }),
      PR('prop_hr_glow', 3, 3, { x: 8, y: 4, rgb: '255,70,52', c: '#FF6A4D', blink: 1400 }),
      X('obj_hr_shoubo_happi', 1, 1, { w: 3, ...U }),
      X('obj_hr_shoubo_toban', 4, 1, U),
      X('obj_hr_shoubo_hose', 5, 2),
      X('obj_hr_shoubo_youjin', 6, 1, U),
      X('obj_hr_shoubo_pump', 2, 3, { w: 3, h: 2 }),
      FIND('obj_hr_shoubo_kyukyu', 6, 4, { item: 'item_shippu' }),
    ],
    out: { x: 44, y: 31, stand: [44, 32], dir: 'up', se: 'se_shutter' },
    lit: false,
    lightBase: '#9C98C6',
    amb: ['amb_h_insects'],
    ambVol: INSECTS_SHED,
  },
  // ============================================================ 1号ハウス
  {
    key: 'house1',
    map: 'map_hoshi_house1',
    name: 'ペロの 1号ハウス',
    rows: [
      '#WWWWWWW#',
      '#WWWWWWW#',
      '#pspspsp#',
      '#pspspsp#',
      '#pspspsp#',
      '#pspspsp#',
      '#pspspsp#',
      '#pspspsp#',
      '#pspspsp#',
      '#ssssssQ#',
      '####D####',
    ],
    wall: 'film',
    door: 'film',
    deco: [
      { k: 'patch', x: 1, w: 2 },
      { k: 'fan', x: 4 },
      { k: 'paper', x: 6 },
      { k: 'patch', x: 5, w: 1 },
    ],
    objects: [
      ...plantRows(7, 11),
      PR('prop_hr_obj', 7, 9, { v: 'tape' }),
      PR('prop_hr_katori', 2, 9),
      X('obj_hr_h1_film', 2, 1, U),
      X('obj_hr_h1_fan', 4, 1, U),
      X('obj_hr_h1_fuda', 6, 1, U),
      X('obj_hr_h1_aotomato', 1, 2, { h: 7 }),
      X2('obj_hr_h1_aotomato', 1, 3, 2, { h: 7 }),
      X2('obj_hr_h1_aotomato', 2, 5, 2, { h: 7 }),
      X2('obj_hr_h1_aotomato', 3, 7, 2, { h: 7 }),
      X('obj_hr_h1_hoshi', 2, 9, { flat: true }),
      FIND('obj_hr_h1_tape', 7, 9, { money: 10 }),
    ],
    out: { x: 10, y: 30, stand: [10, 31], dir: 'up', se: 'se_h_vinyl_door' },
    lit: false,
    lightBase: '#9A98C8',
    amb: ['amb_h_insects'],
    ambVol: { amb_h_insects: { vol: 0.6, lp: 4000 } },
  },
  // ============================================================ 2号ハウス（ハチ）
  {
    key: 'house2',
    map: 'map_hoshi_house2',
    name: 'ペロの 2号ハウス',
    rows: [
      '#WWWWWWW#',
      '#WWWWWWW#',
      '#pspspsp#',
      '#pspspsp#',
      '#pspspsp#',
      '#pspspsp#',
      '#pspspsp#',
      '#pspspsp#',
      '#pspspsp#',
      '#Qssssss#',
      '####D####',
    ],
    wall: 'film',
    door: 'film',
    deco: [
      { k: 'paper', x: 2 },
      { k: 'fan', x: 4 },
      { k: 'paper', x: 6 },
    ],
    objects: [
      ...plantRows(7, 23),
      PR('prop_h_subako', 1, 9),
      PR('prop_hr_bee', 1, 9),
      X('obj_hr_h2_subako', 1, 9),
      X('obj_hr_h2_kami', 2, 1, U),
      X('obj_hr_h2_fan', 4, 1, U),
      X('obj_hr_h2_shimeta', 6, 1, U),
      X('obj_hr_h2_aotomato', 1, 2, { h: 7 }),
      X('obj_hr_h2_hana', 3, 2, { h: 7 }),
      X2('obj_hr_h2_hana', 1, 5, 2, { h: 7 }),
      X2('obj_hr_h2_aotomato', 1, 7, 2, { h: 7 }),
      FIND('obj_hr_h2_mat', 4, 9, { money: 10 }, { flat: true }),
    ],
    out: { x: 6, y: 30, stand: [6, 31], dir: 'up', se: 'se_h_vinyl_door' },
    lit: false,
    lightBase: '#9A98C8',
    amb: ['amb_h_insects', 'amb_h_hachi'],
    ambVol: { amb_h_insects: { vol: 0.6, lp: 4000 }, amb_h_hachi: { vol: 0.45 } },
    onEnter: ['evt_hr_house2_shime'],
  },
];

/** Four rows of `n` plants (x1, 3, 5, 7 from y2), each its own prop like the 3号 house's. */
function plantRows(n: number, seed: number): MapObj[] {
  const out: MapObj[] = [];
  for (const x of [1, 3, 5, 7]) for (let i = 0; i < n; i++) out.push(PR('prop_h_tomato', x, 2 + i, { i, n, seed: seed + x }));
  return out;
}

// ---------------------------------------------------------------- outside (map_hoshimidai)

/**
 * The shop's pass door (why one may go in), and the two finds of the
 * buildings that are not rooms: the straw rolls fill their lean-to's front
 * (the gap at the east end, from (58,22) facing west) and the fallen shed in
 * the abandoned fields is only its roof on the ground.
 */
export const ROOM2_OUTSIDE: MapObj[] = [
  X('obj_hr_shoten_kuguri', 30, 36, U),
  FIND('obj_hr_wara_sukima', 57, 22, { money: 10 }, { face: 'left' }),
  FIND('obj_hr_kuchita', 43, 16, { money: 50 }, { flat: true }),
];

// ---------------------------------------------------------------- registration

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** The doors of map_hoshimidai into the rooms (hoshi_village.ts adds them). */
export const ROOM2_VILLAGE_DOORS: DoorObj[] = [];
/** QA: where each room is entered (map, x, y). */
export const ROOM2_SPOTS: Record<string, [string, number, number]> = {};
export const ROOM2_MAPS: string[] = [];
/** map id → グソっ君's place key (his line once per room). */
export const ROOM2_KEYS: Record<string, string> = {};
export const ROOM2_NAMES: Record<string, string> = {};

for (const r of ROOMS2) {
  const H = r.rows.length;
  const dx = [...r.rows[H - 1]].indexOf('D');
  const exit: DoorObj = {
    t: 'door',
    id: `door_hoshi_${r.key}_out`,
    x: dx,
    y: H - 1,
    to: 'map_hoshimidai',
    tx: r.out.stand[0],
    ty: r.out.stand[1],
    dir: OPPOSITE[r.out.dir],
    se: r.out.se,
  };
  ROOM2_VILLAGE_DOORS.push({
    t: 'door',
    id: `door_hoshi_${r.key}`,
    x: r.out.x,
    y: r.out.y,
    ...(r.out.w ? { w: r.out.w } : {}),
    to: r.map,
    tx: dx,
    ty: H - 2,
    dir: 'up',
    se: r.out.se,
  });
  ROOM2_SPOTS[r.key] = [r.map, dx, H - 2];
  ROOM2_MAPS.push(r.map);
  ROOM2_KEYS[r.map] = `hoshi_r_${r.key}`;
  ROOM2_NAMES[r.map] = r.name;
  const night = 'bgm_hoshi_night';
  const amb = r.amb ?? ['amb_h_insects'];
  const def: MapDef = {
    id: r.map,
    name: ROOM2_PLACE[r.map] ?? r.name,
    kind: 'indoor',
    chapter: 2,
    stageFlag: 'flag_ch2_stage',
    rows: r.rows,
    legend: LEGEND,
    objects: [PR('prop_hr_shell', 0, 0, { map: r.map, wall: r.wall, door: r.door, deco: r.deco }), ...r.objects, exit],
    camera: 'fixed',
    variant: r.variant ?? 'house',
    space: 'room',
    outside: '#0B0B14',
    lightBase: r.lightBase ?? (r.lit ? LIT : NIGHT_ROOM),
    bgm: { 0: night, 1: night, 2: night },
    amb: { 0: amb, 1: amb, 2: amb },
    ambVol: r.ambVol ?? INSECTS_IN,
    ...(r.onEnter ? { onEnter: r.onEnter } : {}),
  } as MapDef;
  registerMap(def);
}
