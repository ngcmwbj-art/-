// HD-2D: the secret ending 「40年ぶりの 休み」 (05_postgame 10.2). Its cuts run on the field in the
// town and the light of the hour they show (world/pg_secret.ts PG_SECRET_CUTS: where and when), each
// with a lens here (through events/ending.ts's endingView.shot, as chapter 3's ending: cut_c3.ts).

import type { ShotDef } from './cut';

export const PG_SHOTS: Record<string, ShotDef> = {
  // ① before dawn on 星見台: the truck at the turning circle, マサル's cabbages going up into its bed
  pg_hoshi_yoake: { lens: { pitch: 32, fov: 26, dist: 23, lookN: 0.3, lift: 0.5 }, to: { pitch: 30, dist: 21.5 }, drift: 9000 },
  // ② the morning in 夕鳴町: たかしの 店's front, the crates handed down
  pg_ginza_asa: { lens: { pitch: 33, fov: 24, dist: 22, lookN: 0.3, lift: 0.6 }, to: { pitch: 31, dist: 20.5 }, drift: 9000 },
  // ③ noon at the harbour: ナミエ's shop, wide, the boats behind
  pg_minato_hiru: { lens: { pitch: 31, fov: 28, dist: 24, lookN: 0.2, lift: 0.5 }, to: { pitch: 29, dist: 22.5 }, drift: 9000 },
  // ④ the old aquarium's ticket window: エゴ's time cards, close
  pg_aq_iriguchi: { lens: { pitch: 36, fov: 22, dist: 20, lift: 0.7 }, to: { pitch: 34, dist: 18.5 }, drift: 8000 },
  // ⑤ the park's clock tower and the bench under it, low and close (the 1枚絵's composition, cut_pg.ts)
  pg_park: { lens: { pitch: 26, fov: 24, dist: 20, lookN: 0, lift: 0.9 }, to: { pitch: 24, dist: 18.5 }, drift: 14000 },
  pg_out: { lens: {} },
};
