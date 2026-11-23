// HD-2D: 海ぞいの町's sea once it moves (62 8.7・8.9; world/c3sea.ts). The
// still mirror is the ground's own picture; the waves, the harbour's ripples
// and the beach's wash are a layer of their own — here one live sheet over
// every water tile of the map and of its margins (the sea goes on south past
// the edge), redrawn a few times a second round the camera by the same
// painter the 2D uses. Nothing is drawn while the sea is still.

import type { FieldScene } from '../world/field';
import { paintSea, seaFace, seaKind } from '../world/c3sea';
import { LiveSheet } from './water3d';
import type { Margin } from './walls';

export function c3SeaSheet(f: FieldScene, mg: Margin, heightAt: (x: number, z: number) => number, light: boolean): LiveSheet | null {
  const m = f.map;
  const tiles: { tx: number; ty: number; sx: number; sy: number }[] = [];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let ty = -mg.n; ty < m.h + mg.s; ty++)
    for (let tx = -mg.x; tx < m.w + mg.x; tx++) {
      // (past the edges: the edge tile's water goes on)
      if (!seaKind(m, tx, ty)) continue;
      tiles.push({ tx, ty, sx: tx, sy: ty });
      x0 = Math.min(x0, tx);
      y0 = Math.min(y0, ty);
      x1 = Math.max(x1, tx);
      y1 = Math.max(y1, ty);
    }
  if (!tiles.length) return null;
  const X0 = x0 * 16;
  const Y0 = y0 * 16;
  const W = (x1 - x0 + 1) * 16;
  const H = (y1 - y0 + 1) * 16;
  const draw = (ctx: CanvasRenderingContext2D, t: number, vis: [number, number, number, number]) => {
    ctx.clearRect(vis[0], vis[1], vis[2], vis[3]);
    paintSea(ctx, X0, Y0, X0 + vis[0], Y0 + vis[1], vis[2], vis[3], t, (tx, ty) => seaKind(m, tx, ty), (tx, ty) => seaFace(m, tx, ty));
  };
  // (just over the water's own picture)
  return new LiveSheet(X0, Y0, W, H, tiles, heightAt, 0.015, light ? 200 : 110, draw);
}
