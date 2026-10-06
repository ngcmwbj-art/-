// HD-2D rooms (room.ts): the few per-room touches. The windows of the back
// wall are found in the shells' glass map (home, 地図屋, マダム, the park's
// toilet); the ones painted without glass are listed here (world px of the
// panes: x0, y0, x1, y1).

import type { RoomTune } from './room';

export const ROOM_TUNE: Record<string, RoomTune> = {
  // しんごの家: the small window between the calendar and the price list (the evening in its panes)
  map_shingo: { windows: [{ x0: 82, y0: 9, x1: 94, y1: 25 }] },
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
