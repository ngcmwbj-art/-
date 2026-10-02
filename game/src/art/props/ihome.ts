// The Shiomi house's rooms set into the town round the house (QA round 2:
// at 1× the 1F and 2F floated on a flat dark purple, a paler flat block for
// the walls). The room shell is laid over the town as it really is there —
// the town's ground and everything always standing on it (the garden's
// laundry pole and persimmon, the vegetable patch, the mailboxes, the
// neighbours' houses, the slope road) baked once at stage 0 — with the
// house's own eaves round the room: a narrow eave round the ground floor, the
// ground floor's tiled roof in a wide band round the upper floor, gutters
// and a downpipe. Evening shade darkens it all in flat steps towards the
// screen's edge (iexterior's shadeAndFade), and at run time exteriorOver()
// grades the outside like the street.

import { PixelCanvas } from '../../engine/pixel';
import { bakeGround } from '../tiles/ground';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { bakeTownProps, extMargins, roofPx, shadeAndFade, townGround, townThings, type Exterior } from './iexterior';

export interface TownAroundSpec {
  /** The map's ASCII rows ('#' cells are outside: the town shows there). */
  rows: string[];
  /** Town tile under the room's top-left cell. */
  at: [number, number];
  /** Town props (ids) not to bake: the house the room is inside. */
  skip: string[];
  /** Roof / eave round the room's walls (px): north, east, south, west. */
  eave: [number, number, number, number];
  /** Outer skin of the walls: lit, base, shade. */
  skin: [string, string, string];
  seed: number;
  /** Room tile x of a door in the south wall (the doorstep outside it), if any. */
  door?: number;
}

/**
 * Build the room shell set into the town round it. `room` / `glass` are the
 * shell canvases (map size); the result is larger by extMargins() every side.
 */
export function withTownAround(room: PixelCanvas, glass: PixelCanvas, s: TownAroundSpec): Exterior {
  const W = room.w;
  const H = room.h;
  const { l: L, r: R, t: T, b: B } = extMargins(W, H);
  const EW = W + L + R;
  const EH = H + T + B;
  const p = new PixelCanvas(EW, EH);
  // world px of the canvas's top-left on map_town
  const wx0 = s.at[0] * 16 - L;
  const wy0 = s.at[1] * 16 - T;
  // ---- 1. the town's ground (off the map's west edge: the neighbour's hedge)
  const tg = townGround();
  if (tg) p.blit(bakeGround(tg.src, wx0, wy0, EW, EH), 0, 0);
  else p.rect(0, 0, EW, EH, P.shade);
  // off the map's west edge: a clipped hedge along the boundary, the next
  // house's tiled roof beyond it (its ridge running north–south)
  const edge = -wx0;
  for (let y = 0; y < EH; y++)
    for (let x = 0; x < Math.min(EW, edge); x++) {
      const d = edge - x;
      let c: string;
      if (d <= 9) {
        // the hedge: leaf clumps in 3px cells, lit on the top-left, dark at the foot
        const k = ihash(Math.floor((x + wx0) / 3), Math.floor((y + wy0) / 3), s.seed);
        c = d === 9 ? P.leafShade : k % 5 === 0 ? P.leafYoung : k % 3 === 0 ? P.leafShade : P.leaf;
      } else if (d <= 12) c = d === 10 ? P.ink : P.nightShade;
      else c = x === edge - 34 ? P.steel : x === edge - 35 ? P.ink : roofPx('kawara', y, x, s.seed + 9);
      p.set(x, y, c);
    }
  // ---- 2. everything that always stands there, in the town's depth order
  const list = townThings({ skip: s.skip }, Math.floor(wy0 / 16) - 1, Math.floor(wx0 / 16) - 1, Math.ceil((wx0 + EW) / 16) + 1, Math.ceil((wy0 + EH) / 16) + 5);
  bakeTownProps(p, list, (tx) => tx * 16 - wx0, (ty) => ty * 16 - wy0, 0);
  // ---- 3. the house round the room: the outer faces of the walls (the
  // room's border cells are void but for their 4px sections), the skin, then
  // the eave / lower roof with its gutter and a downpipe
  const [n, e, so, w] = s.eave;
  const ix0 = L + 12;
  const iy0 = T;
  const ix1 = L + W - 12;
  const iy1 = T + H - 12;
  const ox0 = ix0 - 3 - w;
  const oy0 = iy0 - n;
  const ox1 = ix1 + 3 + e;
  const oy1 = iy1 + 3 + so;
  // a soft contact shadow of the eave on the ground (south and east)
  for (let y = oy0 + 3; y < oy1 + 3; y++)
    for (let x = ox0 + 3; x < ox1 + 3; x++) {
      if (x < ox1 && y < oy1) continue;
      if (x < 0 || y < 0 || x >= EW || y >= EH) continue;
      if ((x + y) % 2 === 0 || y >= oy1) p.set(x, y, mixInk(p.get(x, y)));
    }
  for (let y = oy0; y < oy1; y++)
    for (let x = ox0; x < ox1; x++) {
      const inner = x >= ix0 - 3 && x < ix1 + 3 && y >= iy0 && y < iy1 + 3;
      if (inner) {
        // the wall's skin, 3px round the sections
        const skin = x < ix0 ? (x === ix0 - 3 ? s.skin[0] : s.skin[1]) : x >= ix1 ? (x === ix1 + 2 ? s.skin[2] : s.skin[1]) : y >= iy1 ? (y === iy1 + 2 ? s.skin[2] : s.skin[1]) : null;
        if (skin) p.set(x, y, skin);
        continue;
      }
      let c = roofPx('kawara', x, y, s.seed);
      // the eave's edge: a lit tile row, the drip line, the dark outline
      const dOut = Math.min(x - ox0, ox1 - 1 - x, y - oy0, oy1 - 1 - y);
      if (dOut === 0) c = P.ink;
      else if (dOut === 1) c = y === oy1 - 2 ? P.steel : P.asphalt;
      // a ridge line half-way across the wide bands (the lower roof slopes away from the wall)
      p.set(x, y, c);
    }
  // hips: the lower roof's corners, a light seam to the eave's corner
  if (so > 12 || e > 12 || w > 12) {
    const seam = (x0: number, y0: number, dx: number, dy: number, len: number) => {
      for (let k = 0; k < len; k++) {
        const x = x0 + dx * k;
        const y = y0 + dy * k;
        if (x >= 0 && y >= 0 && x < EW && y < EH) {
          p.set(x, y, P.steel);
          p.set(x + dx, y, P.ink);
        }
      }
    };
    const len = Math.min(so, w, e);
    seam(ix0 - 3, iy1 + 3, -1, 1, len);
    seam(ix1 + 2, iy1 + 3, 1, 1, len);
  }
  // the gutter along the south eave, the downpipe at the south-east corner
  for (let x = ox0 + 1; x < ox1 - 1; x++) p.set(x, oy1, P.steel);
  for (let y = oy1; y < Math.min(EH, oy1 + 10); y++) {
    p.set(ox1 - 3, y, P.steel);
    p.set(ox1 - 2, y, P.asphalt);
  }
  // ---- 4. evening shade, darker in steps towards the screen's edge
  const doorCx = s.door !== undefined ? L + s.door * 16 + 8 : -9999;
  shadeAndFade(p, { cx: L + W / 2, cy: T + H / 2, doorCx, street: T + H - 9, W });
  // ---- 5. the room on top; a door gets its doorstep (the ground outside, a step)
  const outside = p.clone();
  // the room: its floor cells stay see-through (the map's own floor is drawn
  // under the shell), the void cells round it show the outside
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = room.get(x, y);
      const cell = [...(s.rows[Math.floor(y / 16)] ?? '')][Math.floor(x / 16)] ?? '#';
      if (v >>> 24) p.set(L + x, T + y, v);
      else if (cell !== '#') p.set(L + x, T + y, 0);
    }
  if (s.door !== undefined) {
    for (let y = T + H - 5; y < T + H; y++) for (let x = doorCx - 8; x < doorCx + 8; x++) p.set(x, y, outside.get(x, y));
    for (let x = doorCx - 9; x <= doorCx + 8; x++) {
      p.set(x, T + H - 5, x === doorCx - 9 ? P.steel : P.concreteLt);
      p.set(x, T + H - 4, x === doorCx - 9 || x === doorCx + 8 ? P.steel : P.concrete);
      p.set(x, T + H - 3, P.asphalt);
    }
  }
  const g2 = new PixelCanvas(EW, EH);
  g2.blit(glass, L, T);
  return { p, glass: g2, ox: -L, oy: -T, W, H, doorX: doorCx - L, streetY: H - 9 };
}

/** A pixel 45% of the way to the ink (the eave's shadow). */
function mixInk(v: number): number {
  if (!(v >>> 24)) return v;
  const k = 0.45;
  const r = Math.round((v & 255) * (1 - k) + 0x2a * k);
  const g = Math.round(((v >>> 8) & 255) * (1 - k) + 0x24 * k);
  const b = Math.round(((v >>> 16) & 255) * (1 - k) + 0x40 * k);
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
