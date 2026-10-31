// クリア後の壁の時計の読み口（05_postgame 3.2）。部屋の壁の時計（`int_*` で
// `flag_clock` を読む絵）が、クリア後は `flag_pg_min` の時刻を指す。
// 絵（src/art/props）から読むので、ほかのモジュールを import しない。
//
//   const pg = pgWallTime(env); if (pg) return pg;   // int_north_kit.ts stageTime() などの頭で

/** flag_pg_min が無いとき（読み込みの前）：5:10（world/postgame.ts PG_START_MIN と同じ）。 */
const START_MIN = 5 * 60 + 10;

/**
 * クリア後の壁の時計：[時（0〜11）, 分, 秒]。クリア後でなければ null
 * （いつもの章の時刻のまま）。絵の env の flag と t（ms）だけを読む。
 */
export function pgWallTime(env: { flag(k: string): number; t: number }): [number, number, number] | null {
  if (!(env.flag('flag_ch3_clear') > 0)) return null;
  const v = env.flag('flag_pg_min');
  const min = v > 0 ? (v - 1) % 1440 : START_MIN;
  return [Math.floor(min / 60) % 12, min % 60, Math.floor(env.t / 1000) % 60];
}
