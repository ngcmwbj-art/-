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
//    the roof's north fence).

/** One place's settings (all optional). */
export interface PlaceDef {
  steps?: Record<string, number>;
  outside?: (tx: number, ty: number, edge: string) => string;
  water?: boolean;
  drop?: number;
  sky?: boolean;
  /** Its MapDef.shadowVec (stage 2) turns the 3D shadows by as much as it turns the 2D ones from the evening's (view.ts placeSun). */
  shadowSwing?: boolean;
}

/**
 * The roof's drop to the ground (units): the mall's ground floor as the town
 * stands it up (bld_mall, F = 5 tiles × SV), its blank upper wall and the
 * parapet — high enough that the town below reads small.
 */
export const ROOF_DROP = 10;

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
};

export function placeOf(mapId: string): PlaceDef {
  return PLACES[mapId] ?? {};
}
