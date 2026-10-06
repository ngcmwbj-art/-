// HD-2D rooms (room.ts): the few per-room touches. The windows of the back
// wall are found in the shells' glass map (home, 地図屋, マダム, the park's
// toilet); the ones painted without glass are listed here (world px of the
// panes: x0, y0, x1, y1). Chapter 2's rooms (2026-10-06) add what a farmer
// or the story needs there: the barn's low block wall and its tubes hung
// over the aisle, the observatory's cranks, the greenhouses' wires, the
// cattle and the tomato vines as pictures.

import type { RoomTune } from './room';
import type { PropSolid } from './tune';

export const ROOM_TUNE: Record<string, RoomTune> = {
  // しんごの家: the small window between the calendar and the price list (the evening in its panes)
  map_shingo: { windows: [{ x0: 82, y0: 9, x1: 94, y1: 25 }] },
  // 石黒牛舎 (chapter 2): the block wall between the anteroom and the pens
  // (x4, north and south of the feed aisle) is waist-high — the 2D shows its
  // top — not a wall to the ceiling
  map_hoshi_barn: {
    low: [
      { x0: 4, y0: 2, x1: 4, y1: 5, h: 12 },
      { x0: 4, y0: 7, x1: 4, y1: 10, h: 12 },
    ],
  },
  // 村営天文台 (chapter 2): the two hand cranks the story turns are painted
  // on the west wall's strip (art/props/dome_art.ts crank(): (10, 56) スリット,
  // (10, 88) ドーム): they stand there, the side walls kept low so they show
  map_hoshi_dome: { sideH: 4, stand: [crank(10, 56), crank(10, 88)] },
};

/** One of the observatory's hand cranks (dome_art.ts crank() at x, y): its rect and its pixels — the plate, the bracket, the wheel, the handle. */
function crank(cx: number, cy: number): NonNullable<RoomTune['stand']>[number] {
  return {
    x0: cx - 5,
    y0: cy - 15,
    x1: cx + 9,
    y1: cy + 8,
    keep: (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      return (
        (dx >= -4 && dx <= 6 && dy >= -14 && dy <= -8) || // the plate
        (dx >= -4 && dx <= 4 && dy >= -7 && dy <= 7) || // the bracket
        dx * dx + dy * dy <= 42 || // the wheel
        (dx >= 0 && dx <= 7 && dy >= Math.floor(dx * 0.8) - 1 && dy <= 6) // the handle and its grip
      );
    },
  };
}

/** A band of a hung thing's fg picture (rows y0..y1, prop px) and the foot line it hangs over (prop px). */
export interface HangBand {
  y0: number;
  y1: number;
  foot: number;
}

/**
 * Things hung from a room's ceiling that the 2D paints in one picture over
 * where they hang (a flat prop with fg parts, anchored at the map's corner):
 * each band of the picture stands over its own foot line (room.ts hung).
 * Else they would stand at the anchor — the map's top edge — or lie.
 */
export const HANG: Record<string, HangBand[]> = {
  // 石黒牛舎: the six fluorescent fittings over the feed aisle (their rows
  // 64–75, art/props/hoshi_room_b.ts) hang over its north half, the dead one
  // over 南5's back half (rows 122–137) — about 26 px up, under the ceiling
  prop_h_barn_lights: [
    { y0: 60, y1: 80, foot: 98 },
    { y0: 118, y1: 140, foot: 156 },
  ],
};

/**
 * Things in the air that run along the room, not across it (a flat prop
 * with fg parts): their picture lies flat this many px up, as far south as
 * it is up — on screen where the 2D paints it, in 3D a line in the air
 * (room.ts aloft). The greenhouses' overhead wires run north–south over the
 * rows at the plants' tops (40 px, art/props/hoshi_room_a.ts).
 */
export const ALOFT: Record<string, number> = {
  prop_h_house_wire: 40,
};

/**
 * How a prop of a room stands up where the town's table (tune.ts SOLID)
 * says nothing (added to it when the rooms load, room.ts). The cattle are
 * pictures, as every creature in HD-2D (2026-10-06: pushed back into slabs
 * the barn's black cattle read as blocks).
 */
export const ROOM_SOLID: Record<string, PropSolid> = {
  prop_h_cow: { kind: 'flat' },
  // the greenhouses' tomatoes: vines tied up their strings, as slender as the
  // 2D paints them (pushed back they swelled into hedges)
  prop_h_tomato: { kind: 'flat' },
  // チクタク堂の 額の 写真（02 #88）：カウンターに 立てた 薄い 額（厚い 箱に しない）
  prop_tokei7_photo: { kind: 'slab', depth: 2 },
};

/**
 * Things that lie more than they stand: the ¾ picture's rows above the
 * front lie flat on top, the front's rows (this many px) stand (room.ts
 * LyingView). Stood up whole they read as a board on end.
 */
export const LIE: Record<string, number> = {
  // 小林家 2F: しゅん's bed (the frame's front 6 px, the headboard lies with the blanket)
  obj_bed: 6,
  // the tables (2026-10-06, 02 #85): the top with what is on it lies, the
  // rim and the legs (or the pedestal) stand. The chairs drawn with a table
  // (喫茶, フードコート) go with it; a low table's cushions too.
  obj_chabudai: 4, // 小林家 1F: low, among its zabuton
  in_sg_table: 5, // しんごの家
  in_sd_desk: 6, // 書道教室: the low desks
  in_sd_long: 6,
  in_ck_table: 10, // 時計屋: the table of clocks
  in_cf_table: 7, // 喫茶: on its pedestal, a chair either side
  in_cz_table: 5, // 地図屋
  in_md_table: 6, // マダム: the round table on its foot
  in_ld_table: 11, // コインランドリー: the folding table, a shelf under it
  mall_food_table: 10, // フードコート: the near chairs stand with the pedestal
  in_sr_bench: 6, // 休憩所: the plain bench
  in_md_dogbed: 3, // マダム: the dog's round bed
};
