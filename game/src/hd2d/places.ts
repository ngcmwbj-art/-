// HD-2D (2026-10-05 依頼主「街全体に広げる作業して」, 02 #85): what the
// outdoor places of chapter 1 other than the town need in 3D — the school's
// back yard (map_school) and its ground (map_school_kotei), the diversion
// past the paddy path (map_aze), the weir (map_seki) and the mall's roof
// (map_mall_roof). The town (map_town) keeps the defaults.
//
//  - steps: the ground's height by map character (px; in place of town.ts
//    STEP by ground kind): the river under the weir, the pool's water, the
//    sand pit sunk a little;
//  - outside: which map character a tile past the edges stands for (the
//    default: the nearest edge tile's, as the ground's bake does) — the river
//    goes on north and south under the bridge, the pool ends past the east
//    edge, the roof drops to the town below;
//  - water: the canal / paddy sheet of the 2D (water3d.ts) is laid over the
//    water tiles, live;
//  - drop: the roof is high up: everything past its parapets lies this far
//    down (units), the town (outskirts.ts below());
//  - sky: a backdrop of the evening sky far beyond the north edge (seen over
//    the roof's north fence);
//  - nightSky / fall / floor (chapter 2, 2026-10-06): 星見台's two hilltops
//    (星見の丘, the little hill behind the school) — past their fences and
//    north of their cedars the land falls away (`fall` units: the woods there
//    stand on the slope, only their tops show), the floor under everything
//    that far down, and far off the night sky over the mountains, the town's
//    lights west of them (「西の 山の 向こうに、町の 明かり」), the morning
//    star low in the east (outskirts.ts nightSkyBackdrop).

/** One place's settings (all optional). */
export interface PlaceDef {
  steps?: Record<string, number>;
  outside?: (tx: number, ty: number, edge: string) => string;
  water?: boolean;
  drop?: number;
  sky?: boolean;
  /** Its MapDef.shadowVec (stage 2) turns the 3D shadows by as much as it turns the 2D ones from the evening's (view.ts placeSun). */
  shadowSwing?: boolean;
  /** The night sky far beyond the north edge (outskirts.ts nightSkyBackdrop). */
  nightSky?: boolean;
  /** How far down the floor under everything lies (units; default 1, or `drop`). */
  floor?: number;
  /** 海ぞいの町: the sea's waves once it moves (c3sea3d.ts). */
  c3sea?: boolean;
  /**
   * The ground's height (px of a picture's rows) by tile, where it is not
   * one per map character (海ぞいの町's hill, its stairs): undefined → `steps`
   * / the ground kind. Tiles past the edges ask for the nearest edge tile.
   */
  stepAt?: (tx: number, ty: number, ch: string) => number | undefined;
  /** The camera rises and falls with the ground under Minato (a hill of several tiles). */
  camLift?: boolean;
}

/** The ground's step (px of a picture's rows) for a fall of `u` units. */
const fallPx = (u: number): number => -u / (Math.tan((40 * Math.PI) / 180) / 16);
/** 星見台's hilltops: how far the land falls away past their fences (units). */
const HILL_FALL = 4.5;
/**
 * A hilltop of w tiles (fences at x 0 and w − 1 from row 1 to `plateau`,
 * cedars along row 0): past the fences and two rows north of the cedars the
 * slope (map char '\u0002', HILL_FALL down).
 */
const hilltop = (w: number, plateau: number): PlaceDef => ({
  steps: { '\u0002': fallPx(HILL_FALL) },
  outside: (tx, ty, edge) => (ty < -2 || ((tx < 0 || tx >= w) && ty <= plateau) ? '\u0002' : edge),
  floor: HILL_FALL + 1,
  nightSky: true,
});

/**
 * The roof's drop to the ground (units): the mall's ground floor as the town
 * stands it up (bld_mall, F = 5 tiles × SV), its blank upper wall and the
 * parapet — high enough that the town below reads small.
 */
export const ROOF_DROP = 10;

/**
 * 海ぞいの町's hill (62 8.9 の3): the hill (y ≤ 9: the open ground, the siren
 * tower's plaza, the mikan terraces, the pines) 3 tiles over the harbour road;
 * the round-stone wall (y 10, `B`) stands up its face (walls.ts); the three
 * flights of steps (`n`, x12–13・34–35・56–57) come down a step a row to the
 * road; the pines east of the houses keep the hill's height down to the cape.
 */
export const UMIZOI_HILL = 48;
function umizoiStep(tx: number, ty: number, ch: string): number | undefined {
  if (ty <= 9) return UMIZOI_HILL;
  if (ty > 15) return undefined;
  if (ch === 'n') return Math.round(UMIZOI_HILL - ((ty - 9) * UMIZOI_HILL) / 7);
  if (ty === 10 && ch === 'H') return UMIZOI_HILL;
  return undefined;
}

export const PLACES: Record<string, PlaceDef> = {
  map_town: { water: true },
  map_school: {
    shadowSwing: true,
    // the pool's water lies lower than its deck
    steps: { w: -6 },
    // past the east edge the pool ends two tiles on (its deck, then the
    // mesh), then the grass of the school's east garden
    outside: (tx, ty, edge) => {
      if (tx < 28 || ty < 3 || ty > 9) return edge;
      if (tx < 30) return edge;
      return tx === 30 && ty >= 4 ? 'P' : ',';
    },
  },
  map_school_kotei: {
    shadowSwing: true,
    // the sand pit a step below the ground, inside its wooden frame
    steps: { s: -2 },
  },
  map_aze: { water: true },
  map_seki: {
    water: true,
    // the river (and the fish pass) well below its banks; the bridge's deck a step up
    steps: { v: -8, f: -8, b: 2, r: 2 },
    // the river goes on north and south, 13 tiles wide (x −4..8); past it
    // the west bank; the bridge (rows 0–3) goes on west over it to となり町
    outside: (tx, ty, edge) => {
      if (ty >= 0 && ty <= 3) return edge;
      if (tx < -4) return ',';
      if (tx <= 8 && (ty < 0 || ty >= 16 || tx < 0)) return 'v';
      return edge;
    },
  },
  map_mall_roof: {
    // the north view (rows 0–1) and everything past the parapets: the drop
    steps: { W: -ROOF_DROP / (Math.tan((40 * Math.PI) / 180) / 16) },
    outside: () => 'W',
    drop: ROOF_DROP,
    sky: true,
  },
  // 星見台 (chapter 2): the village's canal and paddies keep the 2D's own water (water3d.ts skyWater)
  map_hoshi_hill: hilltop(24, 8),
  map_hoshi_urayama: hilltop(24, 7),
  // 裏の とうもろこし畑（02_ch2_index #106）：畑の まわりは 草地（東の 林は 林の まま 続く）
  map_hoshi_ura_hata: { outside: () => ',' },
  // 海ぞいの町 (chapter 3, 62 8.9): the harbour and the sea lie lower than the
  // quay (8 px: the quay's and the breakwater's faces stand over the water);
  // the boats float on it. Past the south edge the sea goes on (the edge rows).
  map_umizoi: { steps: { w: -8, '~': -8, b: -8 }, c3sea: true, stepAt: umizoiStep, camLift: true },
  // 海の 中 (62 4.7): the rocks stand up from the floor; past the edges, rock
  map_c3_umi: { steps: { R: 14 }, outside: () => 'R' },
  // 沖の ブイの 下（海の 水で 寄せる、03_ch3_index 28）：まわりは 岩、南の はしの 段（d）は 砂より 低い
  map_c3_umi_oki: { steps: { R: 14, d: -12 }, outside: (_tx, ty) => (ty >= 11 ? 'd' : 'R') },
  // 岬の 磯（本日は、開館です）：潮だまりと 海は 岩場より 低い。南の はしの 先は 海が 続く、北は 崖
  map_c3_iso: { steps: { '~': -8, p: -5 }, c3sea: true, outside: (_tx, ty, edge) => (ty >= 10 ? '~' : ty < 2 ? 'K' : edge) },
  // 岬（旧水族館の 正面、2026-10-20）：海は 崖の 下。南の はしの 先は 海が 続く、北は 松林、西は 町へ 続く 道
  map_c3_misaki: { steps: { '~': -8 }, c3sea: true, outside: (_tx, ty, edge) => (ty >= 18 ? '~' : ty < 2 ? 'H' : edge) },
  // 小石の 浜（低う、平たく、03_ch3_index）：海は 浜より 低い。南の はしの 先は 海が 続く、北は やぶ、東西は 岩
  map_c3_koishi: { steps: { '~': -8 }, c3sea: true, outside: (tx, ty, edge) => (ty >= 8 ? '~' : ty < 1 ? 'H' : tx < 0 || tx > 23 ? 'K' : edge) },
};

export function placeOf(mapId: string): PlaceDef {
  return PLACES[mapId] ?? {};
}
