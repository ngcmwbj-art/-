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
