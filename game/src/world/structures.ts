// Walls / hedges / fences / guardrails from the ASCII layer, drawn as
// y-sorted cell sprites (so characters behind a wall are hidden correctly).
import { structureCell, type CellArt } from '../art/tiles/structures';
import { cellAt, charAt, type LoadedMap } from './maps';

export interface Structure {
  tx: number;
  ty: number;
  art: CellArt;
  /** Depth-sort y (world px). */
  foot: number;
}

const DEFAULT_MAT: Record<string, [string, string]> = {
  wall: ['wall', 'block'],
  hedge: ['hedge', 'tsuge'],
  fence: ['fence', 'mesh'],
  guardrail: ['guardrail', 'rail'],
};

export function buildStructures(m: LoadedMap): Structure[] {
  const out: Structure[] = [];
  const mats = m.def.structMats ?? [];
  for (let ty = 0; ty < m.h; ty++)
    for (let tx = 0; tx < m.w; tx++) {
      const c = cellAt(m, tx, ty);
      const tag = c.tag ?? '';
      if (!DEFAULT_MAT[tag]) continue;
      const ch = charAt(m, tx, ty);
      let [kind, mat] = DEFAULT_MAT[tag];
      for (const z of mats) if (tx >= z.x && ty >= z.y && tx < z.x + z.w && ty < z.y + z.h && (!z.ch || z.ch === ch)) mat = z.mat;
      const same = (x: number, y: number) => charAt(m, x, y) === ch;
      const mask = { n: same(tx, ty - 1), s: same(tx, ty + 1), e: same(tx + 1, ty), w: same(tx - 1, ty) };
      const art = structureCell(kind, mat, tx, ty, mask);
      out.push({ tx, ty, art, foot: ty * 16 + 16 });
    }
  return out;
}
