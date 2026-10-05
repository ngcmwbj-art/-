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
}

/** The roof's drop to the ground (units): two storeys of the mall and a parapet. */
export const ROOF_DROP = 7.5;

export const PLACES: Record<string, PlaceDef> = {
  map_town: { water: true },
  map_school: {
    // the pool's water lies lower than its deck
    steps: { w: -6 },
    // past the east edge the pool ends two tiles on (its deck, then the mesh)
    outside: (tx, ty, edge) => (tx >= 28 && edge === 'w' ? (tx < 30 ? 'w' : 'P') : edge),
  },
  map_school_kotei: {
    // the sand pit a step below the ground, inside its wooden frame
    steps: { s: -2 },
  },
  map_aze: { water: true },
  map_seki: {
    water: true,
    // the river (and the fish pass) well below its banks; the bridge's deck a step up
    steps: { v: -8, f: -8, b: 2, r: 2 },
    // north of the bridge and west of the map the river goes on (the bridge
    // itself goes on west, rows 0–3, to となり町)
    outside: (tx, ty, edge) => {
      if (tx <= 8 && ty < 0) return 'v';
      if (tx < 0 && ty >= 4) return 'v';
      if (ty >= 16 && tx <= 8) return 'v';
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
