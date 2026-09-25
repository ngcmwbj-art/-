// map_hoshimidai — 星見台 (52_ch2_level_art 3章). 60×48 tiles, the section
// through a mountain village: from the south the siding and the platform,
// the station square and the turning circle, the prefectural road, the
// houses and the old branch school, the irrigation canal, the terraced
// paddies (west) and the electric fence (east), the abandoned fields (dark)
// and the way into the hill. The greenhouses stand on the west slope, the
// Ishiguro barn on the east terrace above its dry-stone wall.
//
// Rows are 52 3.1 verbatim, except that the stream (x13) is written `s` so it
// can be drawn as a stream rather than the canal (`w`), and the mouth of the
// hill path (48–49,0) `P` (a door with no building round it).

import { registerMap } from '../../world/maps';
import type { MapDef, MapObj, TileSpec } from '../../world/types';
import { hg, htalk, htext, narrowFirst, O, O2, PR } from './hoshi_common';

const ROWS = [
  'HHHHHHHHHHHHHsHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHPPHHHHHHHHHH', // 0
  'HHHHHHHHHHHHHsEEEEEEEEEEEEEEEEEEEEEEEKKKKKKK:::o::::::KKKKKK', // 1
  'HHHHHHHHHHHHHsaaaaannaaaaaaaaaaaaaaaEKKKKKKK::::::::::KKKKKK', // 2
  'HHHHHHHHHHHHHs~~~~~nn~~~~~~~~~~~~~~~EkuuuuuuuuuuuuuuuuuuuuKK', // 3
  'HHHHHHHHHHHHHs~~~~~nn~~~~~~~~~~~~~~~EkuuuuuuuuuuuuuuuuuuuuKK', // 4
  'HHHHHHHHHHHHHsaaaaannaaaaaaaaaaaaaaaEkuuuuuuuuuuuuuuuuuuuuKK', // 5
  'HHHHHHHHHHHHHs~~~~~nn~~~~~~~~~~~~~~~Ekkkkkkkkkkk::kokkkkkkkk', // 6
  'HHHHHHHHHHHHHs~~~~~nn~~~~~~~~~~~~~~~Ekokkkkkkkkk::kkkkkkkokk', // 7
  'HHHHHHHHHHHHHsaaaaannaaaaaaaaaaaaaaaEkkkkkkkkkkk::kkKKKKkkkk', // 8
  'HHHHHHHHHHHHHs~~~~~nn~~~~~~~~~~~~~~~Ekkkkkkkkkkk::kkKKKKkkkk', // 9
  'HHHHHHHHHHHHHs~~~~~nn~~~~~~~~~~~~~~~Ekkkkkkkokkk::kkKKKKkkkk', // 10
  'HHHHHHHHHHHHHsaaaaannaaaaaaaaaaaaaaaEkkkkkkkkkkk::kkkkkkmmmk', // 11
  'HHHHHHHHHHHHHs~~~~~nn~~~~~~~~~~~~~OOEkkKKKKkkkok::kkkkkkmmmk', // 12
  'HHHHHHHHHHHHHs~~~~~nn~~~~~~~~~~~~~OOEkkKKKKkkkkk::kkkkoKKKKK', // 13
  'HHHHHHHHHHHHHsaaaaannaaaaaaaaaaaaaaaEkkKKKKkkkkk::kKKkkKKKKK', // 14
  'HHHHHHHHHHHHHs~~~~~nn~~~~~~~~~~~~~~~EkkKKKKkkkkk::kKKkkKKKKK', // 15
  'HHHHHHHHHHHHHs~~~~~nn~~~~~~~~~~~~~~~EkoKKKKkkkkk::kKKkkKKKKK', // 16
  'HHHHHHHHHHHHHsaaaaannaaaaaaaaaaaaaaaEkkkkkkkkkkk::kkkkkKKKKK', // 17
  'HHHHHHHHHHHHHs~~~~~nn~~~~~~~~~~~~~~~EEEEEEEEEEEEGGEEEEEEEEEE', // 18
  'FFFFFFFFFFFFFs~~~~~nn~~~~~~~~~~~~~~~HHHHHHHHHHHo::::::::::::', // 19
  '::::::::::::owwwwww==wwwwwwwwwwwwwwwwwwwwwwwwwww==wwwwwwwwww', // 20
  ':VVV:VVV:VVV:wwwwww==wwwwwwwwwwwwwwwwwwwwwwwwwww==wwwwwwwwww', // 21
  ':VVV:VVV:VVV:s:::::::^^^^^^^^^^^^^^^^^^::^^^^^B,::oooooooo,,', // 22
  ':VVV:VVV:VVV:s^^^^^::^^^^^^^^^^^^^^^^^^::^^^^^B,::,,,,,,,,,,', // 23
  ':VVV:VVV:VVV:s^^^^^::^^^^^^^^^^^^^^^^^^::^^^^^B,::^^^^^^^^^^', // 24
  ':VVV:VVV:VVV:sWWWWW::^^^^^^^^^^^^^^^^^^::WWWWWB,::^^^^^^^^^^', // 25
  ':VVV:VVV:VVV:sWWWWW::WWWWWWWWWWWWWWWWWW::WWWWWB,::^^^^^^^^^^', // 26
  ':VVV:VVV:VVV:s,,,,,::WWWWWDWWWWWWWWWWWW::,,,,,B,::^^^^^^^^^^', // 27
  ':VVV:VVV:VVV:s^^^^^::ooot..totttto^^^^^::"""o"B,::^^^^^^^^^^', // 28
  ':vvv:vvv:vvv:s^^^^^::tttt..ttttttt^^^^^::"""""B,::^^^^^^^^^^', // 29
  ':vDv:vvv:vvv:sWWWWW::ottT..tttoootWWWWW::oooooB,::WWWWWWWWWW', // 30
  ':::::::::::::sWWWWW::HHHH..HHHHHHHWWWWWo:oooooB,::WDWWWWWWWW', // 31
  'o::::o::::o::s:::::::::::..:::::::::::::::::::Bcccccccccoooc', // 32
  ':::::::::::::s^^^^^::^^^^..^^^^^,,^^^^^::^^^^^Bcccccccccoooc', // 33
  ':::::::::::::s^^^^^::^^^^..^^^^^,,^^^^^::^^^^^Bccccccccccccc', // 34
  ':::::::o:::::sWWWWW::WWWW..WWWWW,,WWWWW::WWWWWB:::::::::::::', // 35
  ':::::::::::::sWWWWW::WWWW..WWWWW,,WWWWW::WWWWWBY::::::::::::', // 36
  '::::::::::::Ys",,o"Y,SSoo..o,,,,Y,,,,,,Y,,,,,,B:::::::::::::', // 37
  '.............=................................::::::::::::::', // 38
  '.............=................................::::::::::::::', // 39
  ',^^^^^^^^""""HHWWWWWWW%o%%%%o%%%%%%%%%%%%%%%%%B^^^^^::^^^^^^', // 40
  ',^^^^^^^^""""HHWSSSSSW%%%%%%%%%%%%%oooo%%%ooo%B^^^^^::^^^^^^', // 41
  ',WWWWWWWWooooHHW-----W%%%%%%%%%%%%%oooo%%%ooo%BWWWWW::WWWWWW', // 42
  ',WWWWWWWWooooHHWWW-WWW%%%%%%%%%%%%o%%%%%%%%%%%BWWWWW::WWWWWW', // 43
  ',::::::::::::::-------o-------o---%%oo%%%%%%%oB:::::::,,,,,,', // 44
  ',::::::::::::::-------------------%%%%%%%%%%%%B:::::::,,,,,,', // 45
  'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRoHHHHHHHHHHHHHHHHHHHHHHHHH', // 46
  'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH', // 47
];

const LEGEND: Record<string, TileSpec> = {
  // walkable
  '.': { ground: hg('h_road'), step: 'se_step_asphalt' },
  ':': { ground: 'dirt' },
  ',': { ground: 'grass' },
  '"': { ground: 'weeds' },
  a: { ground: hg('h_aze'), step: 'se_step_grass' },
  n: { ground: hg('h_ishidan'), step: 'se_step_stone' },
  '%': { ground: 'gravel' },
  '-': { ground: hg('h_platform'), step: 'se_step_stone' },
  '=': { ground: 'bridge', step: 'se_step_stone' },
  t: { ground: hg('h_kotei'), step: 'se_step_dirt' },
  c: { ground: hg('h_concrete'), step: 'se_step_stone' },
  k: { ground: hg('h_houki'), step: 'se_step_grass' },
  u: { ground: hg('h_tilled'), step: 'se_step_dirt' },
  m: { ground: hg('h_nuta'), step: 'se_step_dirt' },
  // solid
  H: { ground: 'grass', solid: true, tag: 'hedge' },
  // buildings stand on plain dirt (never 'auto': the canal and the paddies would spread under them)
  '^': { ground: 'dirt', solid: true, tag: 'roof' },
  W: { ground: 'dirt', solid: true, tag: 'facade' },
  D: { ground: 'dirt', solid: true, door: true, tag: 'facade' },
  P: { ground: 'dirt', solid: true, door: true },
  B: { ground: 'grass', solid: true, tag: 'wall' },
  F: { ground: 'grass', solid: true, tag: 'fence' },
  E: { ground: 'grass', solid: true, tag: 'fence' },
  G: { ground: 'dirt', solid: true, tag: 'egate' },
  V: { ground: 'dirt', solid: true, tag: 'roof' },
  v: { ground: 'dirt', solid: true, tag: 'facade' },
  T: { ground: 'auto', solid: true, tag: 'trunk' },
  Y: { ground: 'auto', solid: true, tag: 'pole' },
  o: { ground: 'auto', solid: true, tag: 'prop' },
  /** a prop standing among the paddies (the tool shed): on the ridge's earth */
  O: { ground: hg('h_aze'), solid: true, tag: 'prop' },
  S: { ground: 'auto', solid: true, counter: true, tag: 'counter' },
  w: { ground: hg('h_canal'), solid: true, tag: 'water' },
  s: { ground: hg('h_stream'), solid: true, tag: 'water' },
  '~': { ground: hg('h_tanada'), solid: true, tag: 'paddy' },
  K: { ground: hg('h_houki'), solid: true, tag: 'hedge' },
  R: { ground: hg('h_rail'), solid: true },
};

const s0 = { stage: 0 };
const s1 = { stage: 1 };
const s2 = { stage: 2 };
const s01 = { stage: '0-1' };
const s12 = { stage: '1-2' };
const s1p = { stage: '1+' };
const s02 = { stage: '0-2' };

/** Kakashi of 52 7.3: tile, dress, and the tile the text is read from. */
const KAKASHI: [number, number, string][] = [
  [16, 3, 'tshirt'],
  [30, 6, 'mino'],
  [17, 9, 'happi'],
  [29, 12, 'jersey'],
  [25, 15, 'apron'],
  [15, 18, 'shirt'],
];

/** The delivery stands (52 3.5): [spot number, tile]; 4 is エー夫人 in the meeting hall (no stand). */
const DELI: [number, number, number][] = [
  [1, 43, 36],
  [2, 37, 36],
  [3, 42, 26],
  [5, 17, 31],
];

const OBJECTS: MapObj[] = [
  // ======================================================== buildings (52 3.3, 7.1)
  PR('prop_h_bld_fumi', 14, 23),
  PR('prop_h_bld_school', 21, 22),
  PR('prop_h_bld_gym', 33, 22),
  PR('prop_h_bld_minka2', 41, 22),
  PR('prop_h_bld_minka1', 14, 28),
  PR('prop_h_bld_soko', 34, 28),
  PR('prop_h_bld_akiya', 14, 33),
  PR('prop_h_bld_sawako', 21, 33),
  PR('prop_h_bld_shoten', 27, 33),
  PR('prop_h_bld_kucho', 34, 33),
  PR('prop_h_bld_minka3', 41, 33),
  PR('prop_h_bld_kominka', 1, 40),
  PR('prop_h_bld_taihisha', 47, 40),
  PR('prop_h_bld_gen', 54, 40),
  PR('prop_h_bld_barn', 50, 24),
  PR('prop_h_shouboya', 43, 30),
  PR('prop_h_machiai', 15, 40),
  PR('prop_h_machiai_front', 15, 43),
  PR('prop_h_senpuki', 17, 42),
  PR('prop_h_vinyl', 1, 21, { n: 3 }),
  PR('prop_h_vinyl', 5, 21, { n: 2 }),
  PR('prop_h_vinyl', 9, 21, { n: 1 }),
  PR('prop_h_wara_shed', 50, 22),

  // ======================================================== doors (52 1.4)
  { t: 'door', id: 'door_hoshi_school', x: 26, y: 27, to: 'map_hoshi_school', tx: 5, ty: 10, dir: 'up', se: 'se_door' },
  {
    t: 'door', id: 'door_hoshi_house', x: 2, y: 30, to: 'map_hoshi_house', tx: 4, ty: 16, dir: 'up', se: 'se_h_vinyl_door',
    cond: { flag: 'flag_ch2_met_mitsu' },
  },
  { t: 'door', id: 'door_hoshi_barn', x: 51, y: 31, to: 'map_hoshi_barn', tx: 2, ty: 10, dir: 'up', se: 'se_door_heavy', cond: { flag: 'flag_ch2_met_gen' } },
  { t: 'door', id: 'door_hoshi_hill', x: 48, y: 0, to: 'map_hoshi_hill', tx: 11, ty: 18, dir: 'up', cond: { flag: 'flag_ch2_tetsuya_beaten' } },
  { t: 'door', id: 'door_hoshi_hill_e', x: 49, y: 0, to: 'map_hoshi_hill', tx: 12, ty: 18, dir: 'up', cond: { flag: 'flag_ch2_tetsuya_beaten' } },
  // the doors while they are shut: examining them (and the scripts say why)
  O('door_hoshi_house_closed', 2, 30, { face: 'up', cond: { notFlag: 'flag_ch2_met_mitsu' }, text: htalk('npc_hoshi_mitsu')?.h0_0 }),
  O('door_hoshi_barn_closed', 51, 31, { face: 'up', cond: { notFlag: 'flag_ch2_met_gen' } }),

  // ======================================================== 駅と駅前 (area_hoshi_station, 52 3.5)
  O('obj_hoshi_ekimeihyo', 22, 44, { prop: 'prop_h_ekimeihyo' }),
  O('obj_hoshi_kurumadome', 34, 46, { prop: 'prop_h_kurumadome' }),
  O('obj_hoshi_ekinote', 18, 41, { face: 'up', fushigi: 'fushigi_ch2_01', prop: 'prop_h_ekinote' }),
  O('obj_hoshi_machiai_bench', 16, 41, { w: 2, face: 'up' }),
  PR('prop_h_machiai_bench', 16, 41),
  O('obj_hoshi_jikokuhyo_eki', 20, 40, { face: 'up' }),
  O('obj_hoshi_tsubame', 15, 43, { face: 'up' }),
  O('obj_hoshi_senpuki', 17, 42, { flat: true }),
  O('obj_hoshi_bus', 35, 41, { w: 4, h: 2, prop: 'prop_h_bus' }),
  O('obj_hoshi_mujin', 21, 37, { face: 'up', prop: 'prop_h_mujin' }),
  O('obj_hoshi_nasu', 22, 37, { face: 'up' }),
  O('obj_hoshi_michishirube', 28, 40, { prop: 'prop_h_michishirube' }),
  O('obj_hoshi_bus_jikokuhyo', 34, 43, { fushigi: 'fushigi_ch2_02', prop: 'prop_h_busstop' }),
  O('obj_hoshi_jihanki', 23, 40, { prop: 'obj_hoshi_jihanki' }),
  O('obj_hoshi_kippu', 31, 44, { flat: true, prop: 'prop_h_kippu_box' }),
  PR('prop_h_platform_lamp', 30, 44),
  PR('prop_h_busstop_bench', 36, 44),
  O('obj_hoshi_rail', 0, 46, { w: 34, face: 'down' }),
  { t: 'trig', id: 'trig_ch2_edge_rail', x: 15, y: 45, w: 19, h: 1, on: 'bump', text: htext('obj_hoshi_rail') as string },
  { t: 'trig', id: 'trig_ch2_edge_road', x: 0, y: 38, w: 1, h: 2, on: 'bump', text: htext('obj_hoshi_edge_road') as string },
  O('obj_hoshi_edge_road', 0, 38, { h: 2, face: 'left' }),

  // ======================================================== 集落 (area_hoshi_shuraku)
  O('obj_hoshi_dosojin', 24, 37, { prop: 'prop_h_dosojin' }),
  O('obj_hoshi_school_sign', 25, 27, { face: 'up' }),
  O('obj_hoshi_school_clock', 27, 27, { face: 'up' }),
  O('obj_hoshi_kinenhi', 21, 30, { prop: 'prop_h_kinenhi' }),
  O('obj_hoshi_hyakuyobako', 33, 28, { prop: 'prop_h_hyakuyobako' }),
  O('obj_hoshi_tetsubou', 30, 30, { w: 3, face: 'down', prop: 'prop_h_tetsubou' }),
  O('obj_hoshi_sakura', 24, 30, { prop: 'prop_h_sakura' }),
  O('obj_hoshi_monohoshi', 21, 28, { w: 3, face: 'up', prop: 'prop_h_monohoshi' }),
  O('obj_hoshi_zou', 28, 28, { prop: 'prop_h_zou' }),
  O('obj_hoshi_taiikukan', 38, 27, { face: 'left' }),
  O('obj_hoshi_fumi_house', 16, 26, { face: 'up' }),
  O('obj_hoshi_akiya_a', 15, 36, { face: 'up' }),
  O('obj_hoshi_yuubinuke', 17, 37, { fushigi: 'fushigi_ch2_04', prop: 'prop_h_yuubinuke' }),
  O('obj_hoshi_akiya_b', 36, 31, { face: 'up' }),
  O('obj_hoshi_soko_box', 39, 31, {
    prop: 'prop_h_soko_box',
    reward: { item: 'item_kairan_shuniku', flag: 'flag_ch2_hidden_soko' },
  }),
  O('obj_hoshi_kucho_house', 35, 36, { face: 'up' }),
  O('obj_hoshi_sawako_house', 21, 35, { face: 'right' }),
  O('obj_hoshi_urie', 29, 36, { face: 'up' }),
  O('obj_hoshi_boukatou', 32, 37, { prop: 'prop_h_pole', opts: { lamp: true, ad: 'boukatou' } }),
  O('obj_hoshi_post', 27, 37, { prop: 'prop_h_post' }),
  O('obj_hoshi_denchu', 39, 37, { prop: 'prop_h_pole', opts: { ad: 'inoshishi' } }),
  O('obj_hoshi_hinomi', 41, 30, { w: 2, h: 2, prop: 'prop_h_hinomi' }),
  O('obj_hoshi_yousui', 40, 21, { face: 'up' }),
  O('obj_hoshi_nagareboshi', 16, 21, { face: 'up', fushigi: 'fushigi_ch2_03' }),
  PR('prop_h_pole', 12, 37, { ad: 'fumoto' }),
  PR('prop_h_pole', 19, 37, { ad: 'inoshishi_s' }),
  PR('prop_h_pole', 47, 36, { trans: true }),
  PR('prop_h_marui_isu', 23, 37),
  // the little abandoned plot east of the school and its scarecrow (52 3.6)
  O2('obj_hoshi_kakashi', 8, 44, 28, { prop: 'prop_kakashi', opts: { v: 'kappa', tilt: 1 } }),
  // 軒下の物 (52 7.4): each house its own set
  PR('prop_h_eave', 17, 27, { set: 'fumi' }),
  PR('prop_h_eave', 41, 27, { set: 'minka2' }),
  PR('prop_h_eave', 14, 32, { set: 'minka1' }),
  PR('prop_h_eave', 38, 37, { set: 'kucho' }),
  PR('prop_h_eave', 44, 37, { set: 'minka3' }),
  PR('prop_h_eave', 57, 44, { set: 'gen' }),

  // ======================================================== 西の斜面 (area_hoshi_west)
  O('obj_hoshi_house1', 10, 30, { face: 'up' }),
  O('obj_hoshi_house2', 6, 30, { face: 'up' }),
  O('obj_hoshi_house3_out', 3, 30, { face: 'up' }),
  O('obj_hoshi_container', 0, 32, { prop: 'obj_hoshi_container' }),
  O('obj_hoshi_danball', 5, 32, { prop: 'obj_hoshi_danball' }),
  O('obj_hoshi_taihi_bag', 10, 32, { prop: 'obj_hoshi_taihi_bag' }),
  O('obj_hoshi_tank', 12, 20, { prop: 'obj_hoshi_tank' }),
  O('obj_hoshi_net', 4, 19, { face: 'up' }),
  O('obj_hoshi_engawa', 6, 43, { face: 'up', reward: { item: 'item_umeboshi', flag: 'flag_ch2_hidden_engawa' } }),
  O('obj_hoshi_kamado', 2, 43, { face: 'up', litOnly: true }),
  PR('prop_h_container_seat', 3, 32),
  PR('prop_h_shichu_taba', 7, 35),
  PR('prop_h_bunsui', 13, 20),
  PR('prop_h_hatake', 9, 42),
  O2('obj_hoshi_kakashi', 7, 10, 42, { face: 'down', prop: 'prop_kakashi', opts: { v: 'kappougi' } }),
  PR('prop_h_pump', 0, 36, {}, { solid: [0, 0, 1, 1] }),
  PR('prop_h_kamado', 2, 43, {}, { litOnly: true }),

  // ======================================================== 棚田 (area_hoshi_tanada)
  O('obj_hoshi_tanada_yuyake', 14, 15, { w: 5, face: 'down', fushigi: 'fushigi_ch2_05' }),
  ...KAKASHI.map(([x, y, v], i) =>
    i === 0
      ? O('obj_hoshi_kakashi', x, y, { face: 'down', prop: 'prop_kakashi', opts: { v } })
      : O2('obj_hoshi_kakashi', i, x, y, { face: 'down', prop: 'prop_kakashi', opts: { v } }),
  ),
  O('obj_hoshi_minakuchi', 22, 12, { face: 'down', prop: 'prop_h_minakuchi' }),
  O('obj_hoshi_koya', 34, 13, { w: 2, face: 'up' }),
  PR('prop_h_koya', 34, 12),
  O('obj_hoshi_ishidan', 19, 8, { w: 2, flat: true }),
  O('obj_hoshi_ine', 14, 3, { w: 5, h: 17, face: 'down' }),
  O2('obj_hoshi_ine', 1, 21, 3, { w: 15, h: 17, face: 'down' }),
  PR('prop_h_canal_steps', 24, 21),
  PR('prop_h_canal_steps', 33, 21, { v: 1 }),
  PR('prop_h_intake', 13, 2),

  // ======================================================== 東の台地・電気柵 (area_hoshi_east / fence)
  O('obj_hoshi_barn_out', 56, 31, { face: 'up', cond: s0 }),
  O('obj_hoshi_barn_sign', 52, 31, { face: 'up' }),
  O('obj_hoshi_warairoll', 50, 22, { w: 8, face: 'up' }),
  O('obj_hoshi_keitora', 56, 32, { w: 3, h: 2, prop: 'prop_h_keitora', cond: s01 }),
  PR('prop_h_feed_pallet', 56, 32, {}, { cond: s2 }),
  O('obj_hoshi_taihisha', 47, 42, { w: 5, h: 2, face: 'up' }),
  O('obj_hoshi_gen_house', 56, 43, { face: 'up' }),
  O('obj_hoshi_gate', 48, 18, { w: 2, face: 'up', prop: 'prop_h_egate' }),
  O('obj_hoshi_fence_sign', 54, 18, { face: 'up', prop: 'prop_h_fence_sign' }),
  O2('obj_hoshi_fence_sign', 1, 36, 11, { face: 'right', prop: 'prop_h_fence_sign', opts: { side: 'v' } }),
  O2('obj_hoshi_fence_sign', 2, 40, 18, { face: 'down', prop: 'prop_h_fence_sign' }),
  O('obj_hoshi_dengen', 47, 19, { prop: 'obj_hoshi_dengen' }),
  O('obj_hoshi_shoukai', 51, 32, { flat: true }),
  PR('prop_h_ichirinsha', 55, 35),
  PR('prop_h_blanket', 53, 33),
  PR('prop_h_hose_reel', 59, 32, {}, { solid: [0, 0, 1, 1] }),
  PR('prop_h_nuta_tree', 59, 11, {}, { solid: [0, 0, 1, 1] }),

  // ======================================================== 耕作放棄地・山道の入口 (dark)
  O('obj_hoshi_houki_sign', 46, 12, { prop: 'obj_hoshi_houki_sign' }),
  O('obj_hoshi_yamaguchi_sign', 47, 1, { prop: 'obj_hoshi_yamaguchi_sign' }),
  O('obj_hoshi_nuta', 56, 11, { w: 3, h: 2, flat: true }),
  ...[7, 9, 11, 13, 15].map((y, i) =>
    (i === 0 ? O('obj_hoshi_footprints', 48, y, {}) : O2('obj_hoshi_footprints', i, 48, y, {})) as MapObj,
  ).map((o, i) => ({ ...(o as object), w: 2, h: i === 4 ? 1 : 2, flat: true, litOnly: true, prop: 'decal_h_kodomo_ashiato', opts: { n: i } }) as unknown as MapObj),
  O('obj_hoshi_kuzu', 37, 1, { w: 7, h: 2 }),
  O2('obj_hoshi_kuzu', 1, 54, 1, { w: 6, h: 2 }),
  O2('obj_hoshi_kuzu', 2, 58, 3, { w: 2, h: 3 }),
  O2('obj_hoshi_kuzu', 3, 52, 8, { w: 4, h: 3 }),
  O2('obj_hoshi_kuzu', 4, 39, 12, { w: 4, h: 5 }),
  O2('obj_hoshi_kuzu', 5, 51, 14, { w: 2, h: 3 }),
  O2('obj_hoshi_kuzu', 6, 55, 13, { w: 5, h: 5 }),
  PR('prop_h_susuki', 38, 7),
  PR('prop_h_old_shichu', 51, 6),
  PR('prop_h_susuki', 57, 7, { v: 1 }),
  PR('prop_h_old_shichu', 44, 10, { v: 1 }),
  PR('prop_h_susuki', 54, 13, { v: 2 }),
  PR('prop_h_old_shichu', 38, 16, { v: 2 }),
  PR('prop_h_goldenrod', 40, 6),
  PR('prop_h_goldenrod', 45, 15, { v: 1 }),
  PR('prop_h_goldenrod', 53, 11, { v: 2 }),
  PR('prop_h_goldenrod', 43, 4, { v: 3 }),
  PR('prop_h_kuchita_koya', 43, 16),
  PR('prop_h_sugi_edge', 47, 0),
  PR('prop_h_sugi_edge', 50, 0, { v: 1 }),
  // よびごえ: the kei truck at the mouth of the hill path, lights on (52 2.2, 8.6)
  PR('prop_h_keitora_parked', 50, 2, {}, { cond: s2, solid: [0, 0, 2, 2] }),
  // the footprints left by the boars that went home (restored_enemy_chototsu)
  PR('decal_h_inoshishi_ashiato', 8, 19, { len: 5, dir: 'n' }, { cond: { taken: 'sym_hoshi_01' } }),
  PR('decal_h_inoshishi_ashiato', 57, 6, { len: 6, dir: 'ne' }, { cond: { taken: 'sym_hoshi_05' } }),

  // ======================================================== NPCs (52 3.4)
  { t: 'npc', id: 'npc_hoshi_mitsu', x: 3, y: 32, dir: 'right', pose: 'sit', off: [0, -2], talk: htalk('npc_hoshi_mitsu'), cond: s01 },
  { t: 'npc', id: 'npc_hoshi_mitsu', x: 3, y: 32, dir: 'right', pose: 'look_hill', off: [0, -2], talk: htalk('npc_hoshi_mitsu'), cond: s2 },
  {
    t: 'npc', id: 'npc_hoshi_gen', x: 51, y: 32, dir: 'down', talk: htalk('npc_hoshi_gen'),
    cond: { stage: '0-1', notFlag: 'flag_ch2_gate_open' },
  },
  { t: 'npc', id: 'npc_hoshi_gen', x: 50, y: 19, dir: 'left', talk: htalk('npc_hoshi_gen'), cond: s2 },
  { t: 'npc', id: 'npc_hoshi_fumi', x: 47, y: 2, dir: 'down', talk: htalk('npc_hoshi_fumi'), cond: s2 },
  { t: 'npc', id: 'npc_hoshi_tome', x: 21, y: 11, dir: 'down', talk: htalk('npc_hoshi_tome'), cond: s01 },
  { t: 'npc', id: 'npc_hoshi_tome', x: 21, y: 11, dir: 'up', pose: 'look_hill', talk: htalk('npc_hoshi_tome'), cond: s2 },
  { t: 'npc', id: 'npc_hoshi_sawako', x: 23, y: 37, dir: 'down', pose: 'sit', off: [0, -2], talk: htalk('npc_hoshi_sawako'), noTurn: false },
  { t: 'npc', id: 'npc_hoshi_busdriver', x: 36, y: 40, dir: 'down', pose: 'lean', talk: htalk('npc_hoshi_busdriver'), cond: s01 },
  { t: 'npc', id: 'npc_hoshi_busdriver', x: 36, y: 40, dir: 'up', pose: 'look_hill', talk: htalk('npc_hoshi_busdriver'), cond: s2 },
  { t: 'npc', id: 'npc_hoshi_gon', x: 53, y: 33, dir: 'down', pose: 'lie', animal: true, noTurn: true, talk: htalk('npc_hoshi_gon'), cond: s0 },
  { t: 'npc', id: 'npc_hoshi_gon', x: 53, y: 33, dir: 'down', pose: 'sit', animal: true, talk: htalk('npc_hoshi_gon'), cond: s1 },
  { t: 'npc', id: 'npc_hoshi_gon', x: 53, y: 33, dir: 'up', pose: 'stand_n', animal: true, talk: htalk('npc_hoshi_gon'), cond: s2 },

  // ======================================================== ツガオ便 at the turning circle (52 3.4–3.6, 50 3.14–3.16・10.20)
  PR('prop_tsugao_truck', 42, 41),
  PR('prop_pokosha_bike', 45, 44),
  O('obj_hoshi_tsugao_truck', 43, 41, { w: 2, h: 2 }),
  O('obj_hoshi_pokosha_bike', 45, 44),
  // ツガオさん asleep in the driver's seat (his picture is the truck's): spoken to through the window from (41,42) or (42,43)
  { t: 'obj', id: 'npc_tsugao', x: 42, y: 42, script: 'npc_tsugao', cond: s02 } as MapObj,
  { t: 'npc', id: 'npc_hirosuke', x: 43, y: 43, dir: 'up', talk: htalk('npc_hirosuke'), cond: s02 },
  // ポコシャさん (ぴーちゃん on his left shoulder) behind the truck; while the delivery runs he walks in the line instead
  { t: 'npc', id: 'npc_pokosha', x: 45, y: 42, dir: 'left', talk: htalk('npc_pokosha'), cond: { stage: '0-1', notFlag: 'flag_ch2_delivery_on' } },
  { t: 'npc', id: 'npc_pokosha', x: 45, y: 42, dir: 'up', pose: 'look_hill', talk: htalk('npc_pokosha'), cond: s2 },
  // the delivery stands (52 3.5): the stand always, its slip and note only in the lantern while the delivery runs, the vegetables once left
  ...DELI.flatMap(([n, x, y]) => {
    const spot = `spot_h_deli_0${n}`;
    return [
      PR('prop_h_deli_dai', x, y, { n }),
      PR('prop_h_deli_note', x, y, { n }, { litOnly: true, cond: { flag: 'flag_ch2_delivery_on', notFlag: 'flag_' + spot } }),
      PR('prop_h_deli_bag', x, y, { n }, { cond: { flag: 'flag_ch2_delivery' } }),
      PR('prop_h_deli_bag', x, y, { n }, { cond: { flag: 'flag_' + spot, notFlag: 'flag_ch2_delivery' } }),
      O(spot, x, y, { face: 'up', litOnly: true, priority: 1, cond: { flag: 'flag_ch2_delivery_on', notFlag: 'flag_' + spot } }),
    ];
  }),

  // ======================================================== enemy symbols (52 1.5 / 51 11)
  { t: 'sym', id: 'sym_hoshi_01', enemies: ['enemy_chototsu'], x: 8, y: 23, dir: 'down', move: 'boar', cond: s1p, restoreAt: [8, 23] },
  { t: 'sym', id: 'sym_hoshi_02', enemies: ['enemy_mujin_hanbaiin'], x: 21, y: 37, dir: 'down', move: 'mujin', to: [21, 38], cond: s1p, restoreAt: [21, 37], restoreOff: [0, -4] },
  {
    t: 'sym', id: 'sym_hoshi_03', enemies: ['enemy_henoheno_kacho'], x: 16, y: 5, dir: 'down', move: 'kakashi', to: [18, 5],
    span: { x: 14, y: 5, w: 5, h: 1 }, cond: s1p, restoreAt: [17, 6],
  },
  {
    t: 'sym', id: 'sym_hoshi_04', enemies: ['enemy_biribiri_ban'], x: 37, y: 6, dir: 'down', move: 'fence', to: [37, 16],
    span: { x: 37, y: 6, w: 2, h: 11 }, cond: s1p, restoreAt: [36, 11],
  },
  { t: 'sym', id: 'sym_hoshi_05', enemies: ['enemy_chototsu'], x: 57, y: 11, dir: 'left', move: 'boar', cond: s1p, restoreAt: [57, 11] },
  { t: 'sym', id: 'sym_hoshi_06', enemies: ['enemy_henoheno_kacho'], x: 41, y: 9, dir: 'down', move: 'kakashi_stand', cond: s1p, restoreAt: [41, 9] },
  {
    t: 'sym', id: 'sym_hoshi_07', enemies: ['enemy_tetsuya'], x: 39, y: 4, dir: 'right', move: 'tetsuya', to: [56, 4],
    cond: { stage: 1, notFlag: 'flag_ch2_tetsuya_beaten' }, script: 'evt_ch2_tetsuya', restoreAt: [45, 2], music: 'bgm_midboss',
  },

  // ======================================================== event triggers (52 1.6)
  { t: 'trig', id: 'trig_ch2_mitsu', x: 0, y: 31, w: 6, h: 3, script: 'evt_ch2_mitsu', cond: { flag: 'flag_ch2_yoriai', notFlag: 'flag_ch2_met_mitsu' } },
  { t: 'trig', id: 'trig_ch2_house_exit', x: 2, y: 31, w: 1, h: 1, cond: { flag: 'flag_ch2_got_tomato', notFlag: 'flag_ch2_house_exit' } },
  { t: 'trig', id: 'trig_ch2_gen_stop', x: 46, y: 36, w: 4, h: 4, script: 'evt_ch2_gen_stop', cond: { flag: 'flag_ch2_got_tomato', notFlag: 'flag_ch2_met_gen' } },
  { t: 'trig', id: 'trig_ch2_houki', x: 37, y: 3, w: 23, h: 15, script: 'evt_ch2_houki', cond: { notFlag: 'flag_ch2_houki_enter' } },
  { t: 'trig', id: 'trig_ch2_tetsuya', x: 38, y: 6, w: 20, h: 2, script: 'evt_ch2_tetsuya', cond: { flag: 'flag_ch2_gate_open', notFlag: 'flag_ch2_tetsuya_beaten' } },
  // the delivery (50 10.20): back at the truck with all five done; the edges of the round (asks to stop)
  { t: 'trig', id: 'trig_ch2_deli_return', x: 39, y: 40, w: 7, h: 6, script: 'trig_ch2_deli_return', cond: { flag: 'flag_ch2_delivery_on' } },
  { t: 'trig', id: 'trig_ch2_deli_edge', x: 13, y: 38, w: 1, h: 2, script: 'trig_ch2_deli_edge', cond: { flag: 'flag_ch2_delivery_on' } },
  { t: 'trig', id: 'trig_ch2_deli_edge_e', x: 46, y: 38, w: 1, h: 2, script: 'trig_ch2_deli_edge', cond: { flag: 'flag_ch2_delivery_on' } },
  { t: 'trig', id: 'trig_ch2_deli_edge_n', x: 19, y: 21, w: 2, h: 1, script: 'trig_ch2_deli_edge', cond: { flag: 'flag_ch2_delivery_on' } },
];

export const HOSHIMIDAI: MapDef = {
  id: 'map_hoshimidai',
  name: '星見台',
  kind: 'outdoor',
  chapter: 2,
  stageFlag: 'flag_ch2_stage',
  rows: ROWS,
  legend: LEGEND,
  objects: OBJECTS,
  camera: 'follow',
  // coming out of 3号 puts Minato on (2,31) itself (a trigger doesn't fire on the tile you arrive on)
  onEnter: ['trig_ch2_house_exit'],
  variant: 'outdoor',
  pa: 'yama',
  space: 'yama',
  outside: '#0B0B14',
  bgm: { 0: 'bgm_hoshi_night', 1: 'bgm_hoshi_night', 2: 'bgm_hoshi_night' },
  amb: {
    0: ['amb_h_insects', 'amb_h_wind', 'amb_h_mizu', 'amb_h_tanada', 'amb_h_kusa', 'amb_h_fence', 'amb_h_barn_out'],
    1: ['amb_h_insects', 'amb_h_wind', 'amb_h_mizu', 'amb_h_tanada', 'amb_h_kusa', 'amb_h_fence', 'amb_h_barn_out', 'amb_h_yama', 'amb_h_boukatou', 'amb_h_tetsuya'],
    2: ['amb_h_insects', 'amb_h_wind', 'amb_h_mizu', 'amb_h_tanada', 'amb_h_kusa', 'amb_h_fence', 'amb_h_barn_out', 'amb_h_yama', 'amb_h_boukatou', 'amb_h_pa_hum'],
  },
  dark: [{ x: 37, y: 0, w: 23, h: 18 }],
  zones: narrowFirst([
    { id: 'area_hoshi_station', name: '星見台駅', x: 14, y: 40, w: 32, h: 8 },
    { id: 'area_hoshi_kendo', name: '県道', x: 0, y: 38, w: 47, h: 2 },
    { id: 'area_hoshi_shuraku', name: '集落', x: 14, y: 22, w: 32, h: 16 },
    { id: 'area_hoshi_west', name: '西の斜面', x: 0, y: 19, w: 13, h: 27 },
    { id: 'area_hoshi_stream', name: '沢', x: 13, y: 0, w: 1, h: 40 },
    { id: 'area_hoshi_tanada', name: '棚田', x: 14, y: 1, w: 22, h: 19, wind: 'ine' },
    { id: 'area_hoshi_canal', name: '用水路', x: 13, y: 20, w: 47, h: 2 },
    { id: 'area_hoshi_east', name: '東の台地', x: 46, y: 22, w: 14, h: 24 },
    { id: 'area_hoshi_fence', name: '電気柵', x: 36, y: 18, w: 24, h: 2 },
    { id: 'area_hoshi_fence', name: '電気柵', x: 36, y: 1, w: 1, h: 18 },
    { id: 'area_hoshi_houki', name: '耕作放棄地', x: 37, y: 3, w: 23, h: 15, wind: 'susuki' },
    { id: 'area_hoshi_yamaguchi', name: '山道の入口', x: 37, y: 0, w: 23, h: 3, wind: 'susuki' },
  ]),
  structMats: [
    // woods: cedar on the north mountain, cedar then bamboo down the west
    // slope, round-crowned mixed woods east and south (52 7.1)
    { x: 0, y: 0, w: 60, h: 1, mat: 'sugi', ch: 'H' },
    { x: 0, y: 1, w: 13, h: 9, mat: 'sugi', ch: 'H' },
    { x: 0, y: 10, w: 13, h: 10, mat: 'take', ch: 'H' },
    { x: 36, y: 19, w: 11, h: 1, mat: 'zoki', ch: 'H' },
    { x: 13, y: 40, w: 2, h: 4, mat: 'zoki', ch: 'H' },
    { x: 35, y: 46, w: 25, h: 1, mat: 'zoki', ch: 'H' },
    { x: 0, y: 47, w: 60, h: 1, mat: 'yabu', ch: 'H' },
    { x: 21, y: 31, w: 13, h: 1, mat: 'tsutsuji', ch: 'H' },
    { x: 37, y: 0, w: 23, h: 18, mat: 'kuzu', ch: 'K' },
    { x: 0, y: 19, w: 13, h: 1, mat: 'juugai', ch: 'F' },
    { x: 14, y: 1, w: 46, h: 18, mat: 'efence', ch: 'E' },
    { x: 46, y: 22, w: 1, h: 24, mat: 'ishigaki', ch: 'B' },
  ],
  groundDecals: [
    { k: 'h_manhole', x: 25, y: 33, v: 1 } as never,
    { k: 'h_manhole', x: 8, y: 38 } as never,
    // 軽トラのわだち: the farm lane north from the barn, the back lanes, the yards
    { k: 'h_ruts', x: 48, y: 19, w: 2, h: 1, dir: 'v' } as never,
    { k: 'h_ruts', x: 48, y: 22, w: 2, h: 10, dir: 'v' } as never,
    { k: 'h_ruts', x: 48, y: 6, w: 2, h: 12, dir: 'v', v: 1 } as never,
    { k: 'h_ruts', x: 0, y: 20, w: 12, h: 1, dir: 'h' } as never,
    { k: 'h_ruts', x: 47, y: 35, w: 13, h: 1, dir: 'h', v: 2 } as never,
    { k: 'h_ruts', x: 52, y: 40, w: 2, h: 6, dir: 'v', v: 3 } as never,
    { k: 'h_straw', x: 50, y: 23, w: 8, h: 1 } as never,
    { k: 'h_straw', x: 54, y: 32, w: 5, h: 3, v: 1 } as never,
    { k: 'h_straw', x: 47, y: 33, w: 3, h: 2, v: 2 } as never,
    { k: 'h_stain', x: 50, y: 32, w: 3, h: 2 } as never,
    { k: 'h_shoukai', x: 50, y: 32, w: 3 } as never,
    { k: 'h_chalk', x: 21, y: 28, w: 13, h: 3 } as never,
    { k: 'h_tirearc', x: 34, y: 40, w: 5, h: 5 } as never,
    { k: 'h_sand', x: 44, y: 38, w: 3, h: 2 } as never,
    { k: 'h_leaves', x: 14, y: 27, w: 5 } as never,
    { k: 'h_leaves', x: 41, y: 27, w: 5 } as never,
    { k: 'h_leaves', x: 34, y: 37, w: 5 } as never,
    { k: 'h_leaves', x: 1, y: 44, w: 8 } as never,
    { k: 'h_grassedge', x: 36, y: 17, w: 1 } as never,
  ],
  wires: [
    { pts: [[12, 37], [19, 37], [32, 37], [39, 37], [47, 36]] },
    { pts: [[47, 36]], to: [50 * 16 + 2, 29 * 16 + 4] },
    { pts: [[32, 37]], to: [32 * 16 + 12, 26 * 16 + 2] },
    { pts: [[12, 37]], to: [11 * 16 + 10, 29 * 16 + 6] },
  ],
};

registerMap(HOSHIMIDAI);
