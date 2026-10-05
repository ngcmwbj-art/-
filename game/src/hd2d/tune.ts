// HD-2D prototype: hand touches for the buildings of 夕鳴銀座 (map_town). Every
// building is stood up automatically from its 2D art (town.ts): the facade
// rows become the front wall, the roof rows lie on the box, the strip above
// the roof stands at its back edge. What the 2D art draws *on* the roof but
// that really stands up from it (a signboard on the eave, a chimney, the
// clock on its pole) is listed here as pieces cut out of the same picture.
//
// Coordinates are the building image's pixels (registerBuilding: `top` px,
// then R roof rows, then F facade rows; faceY = top + R·16).

export interface Piece {
  /** The rectangle of the building image to stand up. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** The image row it stands on (default: the facade's top = the roof's front edge). */
  base?: number;
  /** Only these shapes of the rectangle are kept: [x, y, w, h] or [cx, cy, r] (image px). */
  keep?: ([number, number, number, number] | [number, number, number])[];
}

export interface BldTune {
  pieces?: Piece[];
  /** The strip above the roof: false = not stood up (its things are pieces). */
  top?: boolean;
  /** Roof slope (tiles): the back edge this much higher than the front. */
  rise?: number;
}

export const TUNE: Record<string, BldTune> = {
  // 駄菓子 ひのや: the wooden ひのや board stands on the tiled eave; an old tiled roof slopes
  bld_hinoya: { pieces: [{ x: 11, y: 33, w: 59, h: 17 }], rise: 0.9 },
  // 豆腐 くま吉: the blue 豆くま吉 board over the shop front, the tin chimney behind it
  bld_tofu: {
    pieces: [
      { x: 0, y: 40, w: 64, h: 16, base: 62 },
      { x: 44, y: 2, w: 7, h: 27, base: 29 },
    ],
    top: false,
    rise: 0.5,
  },
  // 時計店: the round clock on its pole, standing on the flat roof near the front
  bld_clock: {
    pieces: [{ x: 11, y: 0, w: 22, h: 46, base: 46, keep: [[21.5, 11, 9.8], [20, 18, 3, 28]] }],
    top: false,
  },
  // 夕鳴写真館 (south row, seen from behind): its tiled roof
  bld_photo: { rise: 0.6 },
  bld_sake: { rise: 0.4 },
};

// ---------------------------------------------------------------- props in 3D (round 2)

/**
 * How a prop that is not a building stands up (props3d.ts):
 *  - slab: its painted pixels pushed back `depth` px (the voxel look; a box
 *    for a rectangle picture: vending machines, mailboxes, crates);
 *  - pole: the shaft an 8-sided column, the rest (arms, signs, lamps)
 *    pushed back `depth` px;
 *  - tree: the trunk a column, the crown crossed boards (tree_* ids);
 *  - flat: a standing picture as before (creatures, things lying flat).
 */
export interface PropSolid {
  kind: 'slab' | 'pole' | 'tree' | 'flat';
  /** px */
  depth?: number;
}

const slab = (depth: number): PropSolid => ({ kind: 'slab', depth });
const pole = (depth = 3): PropSolid => ({ kind: 'pole', depth });
const FLAT: PropSolid = { kind: 'flat' };

export const SOLID: Record<string, PropSolid> = {
  // creatures stay billboards (HD-2D: people and animals are pictures)
  prop_cat_kuro: FLAT,
  prop_heron: FLAT,
  obj_pigeons: FLAT,
  // things lying on the ground or on a wall
  prop_cat_hole_moss: FLAT,
  obj_early_leaf: FLAT,
  obj_semi_shell: FLAT,
  obj_shrubs: FLAT,
  prop_kitsune_sara: FLAT,
  obj_akikan: FLAT,
  obj_balloon_husk: FLAT,
  obj_block_hole: FLAT,
  obj_minato_nameplate: FLAT,
  obj_foxtail: FLAT,
  // the parking lot's west chain runs north–south (drawn lying)
  prop_chain: FLAT,
  // poles, lamp posts, sign posts
  prop_utility_pole: pole(3),
  prop_park_lamp: pole(3),
  prop_lot_lamp: pole(3),
  obj_speaker_pole: pole(3),
  prop_arch_post: pole(3),
  obj_arch_sign: pole(3),
  prop_lot_nobori: pole(2),
  prop_curve_mirror: pole(2),
  obj_bus_stop: pole(3),
  obj_tomare_sign: pole(2),
  obj_scarecrow: pole(3),
  prop_propane: pole(6),
  // boxes
  obj_vending_ginza: slab(12),
  obj_vending_normal: slab(12),
  prop_garbage_station: slab(12),
  obj_doghouse: slab(12),
  obj_wagon: slab(12),
  obj_hokora: slab(12),
  obj_kaba: slab(12),
  obj_gacha_ginza: slab(10),
  obj_outdoor_unit: slab(10),
  obj_danball: slab(10),
  obj_beer_crate: slab(10),
  obj_hoshimi_yasai: slab(10),
  prop_planter: slab(10),
  obj_tires: slab(10),
  obj_postbox: slab(8),
  obj_jizo: slab(8),
  obj_pay_machine: slab(8),
  obj_drinking_fountain: slab(8),
  obj_fire_bucket: slab(8),
  obj_backyard_cooler: slab(8),
  obj_catalley_bucket: slab(8),
  obj_tofu_tank: slab(8),
  obj_ojigi_restored: slab(8),
  prop_water_gate: slab(6),
  obj_covered_car: slab(18),
  prop_clocktower: slab(14),
  prop_arcade_pillar: slab(8),
  prop_rail_bridge: slab(8),
  // benches, pots, plants
  obj_ginza_bench: slab(8),
  obj_park_bench: slab(8),
  prop_park_bench: slab(8),
  prop_engawa_bench: slab(8),
  obj_pots_1: slab(8),
  obj_pots_2: slab(8),
  obj_pots_3: slab(8),
  prop_pots_row: slab(8),
  prop_bonsai: slab(8),
  obj_asagao: slab(6),
  prop_veg_patch: slab(8),
  obj_clock_shop: slab(6),
  obj_cafe_board: slab(6),
  obj_car_stop: slab(6),
  obj_minato_mailbox: slab(6),
  obj_neighbor_mailbox: slab(5),
  // thin things: bikes, signs, frames, fences, shop windows
  prop_mama_bike: slab(3),
  prop_postman_bike: slab(3),
  obj_rusty_bike: slab(3),
  obj_kids_bike: slab(3),
  obj_koban_bicycle: slab(3),
  obj_signpost: slab(3),
  obj_akichi_sign: slab(3),
  obj_akichi_hoshimono: slab(3),
  prop_laundry_pole: slab(3),
  obj_rules_sign: slab(3),
  obj_park_board: slab(4),
  obj_poster_board: slab(4),
  obj_swing: slab(3),
  obj_tetsubo: slab(3),
  prop_wisteria: slab(3),
  obj_bike_rack: slab(3),
  obj_cart_corral: slab(4),
  prop_torii: slab(4),
  prop_crossing_gate: slab(3),
  obj_photo_window: slab(2),
  obj_laundry_window: slab(2),
  obj_koban_lamp: slab(3),
  obj_barricade: slab(4),
  obj_broken_guide: slab(4),
  prop_sch_uramon: slab(3),
  obj_bridge: slab(3),
};

/** The solid of a prop: the table, else trees by id, else a slab as deep as a third of its smaller side. */
export function solidOf(id: string, w: number, standH: number): Required<PropSolid> {
  const s = SOLID[id];
  if (s) return { kind: s.kind, depth: s.depth ?? 0 };
  if (id.startsWith('tree_') || id === 'prop_cherry_tree' || id === 'prop_persimmon' || id === 'prop_tree_zelkova_s') return { kind: 'tree', depth: 3 };
  if (standH < 6) return { kind: 'flat', depth: 0 };
  return { kind: 'slab', depth: Math.max(2, Math.min(8, Math.round(Math.min(w, standH) * 0.3))) };
}

// ---------------------------------------------------------------- solids in each other's way (round 3)

/**
 * A prop moved a few px in 3D where it went into another solid (found by
 * overlap.ts, __game.cmd.hd2dOverlaps()), keyed by `id@x,y` (its tile):
 *  - z: its body stands this many px further south (+) or north (−), on
 *    the ground (on screen ¾ of that lower / higher);
 *  - fgView: its fg parts (a tree's crown, a board hung on a post) come
 *    this many px towards the camera along its line of sight — as many px
 *    south and up — so they show in the same place as before, in front of
 *    what they were buried in (as the 2D draws them over it).
 */
export interface PropNudge {
  z?: number;
  fgView?: number;
}

/** QA: false stands everything where its picture says (before/after, __game.cmd.hd2dNudge(false)). */
export const nudging = { on: true };

export const NUDGE: Record<string, PropNudge> = {
  // 2026-10-05 依頼主「ようこその看板も建物に入り込んでる」: its board (an fg
  // part, at the post's foot line) stood 1 px behind 百瀬's facade
  'obj_arch_sign@23,21': { fgView: 3 },
  // the keyaki beside 百瀬: the lower right of its crown was inside the
  // building (the 2D draws the crown over the facade's corner)
  'tree_keyaki@22,20': { fgView: 9 },
  // 2026-10-05 依頼主「とうふの旗と看板がぶつかって見づらい」: the poster board
  // stood on the same line as the tofu pillar, whose banner is pushed back
  // 8 px with it: the board in front of the banner, as the 2D draws it
  'obj_poster_board@40,25': { z: 2 },
  // the same at the 夏祭 pillar: the bucket in front of its banner (and
  // still behind the black cat sitting in front of it)
  'obj_catalley_bucket@28,25': { z: 1 },
  // ひぐらし坂: the doghouse's roof over the end of the pots (one plane before)
  'obj_doghouse@21,31': { z: 2 },
  // the bike leaning on the wall, in front of the mailbox's corner
  'prop_mama_bike@6,31': { z: 1 },
  // the lot's chain in front of the mesh fence it hangs from
  'prop_chain@43,15': { z: 1 },
  // the wisteria's trellis over the bench under it
  'prop_wisteria@6,6': { fgView: 1 },
  // 川べり: the willow's hanging crown in front of the guardrail (the 2D
  // draws the branches over the rail)
  'tree_yanagi@52,35': { fgView: 3 },
};
