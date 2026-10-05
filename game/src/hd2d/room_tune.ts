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
};
