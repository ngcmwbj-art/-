// Load-time check (QA round 1): is a character standing where something drawn
// in front of it hides it? For each NPC / enemy symbol / restored object its
// sprite (or a 16×24 frame) at its feet is tested against the opaque pixels of what is
// always drawn over it there: non-flat props and wall cells whose depth-sort
// foot is further south, and every foreground part (canopies, arcade roof,
// overhead signs). Over half of the frame hidden → reported (DEV console, and
// __game.cmd.occlusion() for QA). Wandering symbols are checked over their
// whole roaming area.

import { makeCanvas } from '../engine/pixel';
import type { Actor } from './actor';
import type { FieldScene } from './field';
import type { NpcObj, SymbolObj } from './types';
import { cellAt } from './maps';

const FW = 16;
const FH = 24;

const maskCache = new WeakMap<HTMLCanvasElement, Uint8Array>();
let scratch: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
function opaque(c: HTMLCanvasElement): Uint8Array {
  let m = maskCache.get(c);
  if (m) return m;
  // read through one scratch canvas made for readbacks
  scratch ??= makeCanvas(64, 64, { willReadFrequently: true });
  const [sc, sx] = scratch;
  if (sc.width < c.width || sc.height < c.height) {
    sc.width = Math.max(sc.width, c.width);
    sc.height = Math.max(sc.height, c.height);
  }
  sx.clearRect(0, 0, c.width, c.height);
  sx.drawImage(c, 0, 0);
  const d = sx.getImageData(0, 0, c.width, c.height).data;
  m = new Uint8Array(c.width * c.height);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  maskCache.set(c, m);
  return m;
}

/**
 * Fraction (0..1) of a character standing with its feet at (fx, fy) that is
 * always drawn over: of its sprite's opaque pixels when `sprite` is given
 * (small birds and cats), else of a 16×24 frame.
 */
export function coverage(f: FieldScene, fx: number, fy: number, sprite?: HTMLCanvasElement): { frac: number; by: string[] } {
  const SW = sprite?.width ?? FW;
  const SH = sprite?.height ?? FH;
  const x0 = Math.round(fx - SW / 2);
  const y0 = Math.round(fy - SH);
  const cov = new Uint8Array(SW * SH);
  const own = sprite ? opaque(sprite) : null;
  const by = new Set<string>();
  const stamp = (img: HTMLCanvasElement | null | undefined, ix: number, iy: number, name: string) => {
    if (!img) return;
    ix = Math.round(ix);
    iy = Math.round(iy);
    if (ix >= x0 + SW || iy >= y0 + SH || ix + img.width <= x0 || iy + img.height <= y0) return;
    const m = opaque(img);
    let hit = false;
    for (let y = Math.max(y0, iy); y < Math.min(y0 + SH, iy + img.height); y++)
      for (let x = Math.max(x0, ix); x < Math.min(x0 + SW, ix + img.width); x++)
        if (m[(y - iy) * img.width + (x - ix)] && (!own || own[(y - y0) * SW + (x - x0)])) {
          cov[(y - y0) * SW + (x - x0)] = 1;
          hit = true;
        }
    if (hit) by.add(name);
  };
  for (const p of f.props) {
    if (!p.present) continue;
    const a = p.art;
    const id = p.obj.t === 'prop' ? p.obj.prop : (p.obj.prop ?? p.obj.id);
    const env = f.propEnv(p);
    if (!a.flat && p.y + a.foot > fy) stamp(a.img(env), p.x + a.ox, p.y + a.oy, `${id}@${p.x / 16},${p.y / 16}`);
    for (const part of a.fg ?? []) stamp(part.img(env), p.x + part.ox, p.y + part.oy, `${id}@${p.x / 16},${p.y / 16} (fg)`);
  }
  for (const s of f.structures) if (s.foot > fy) stamp(s.art.img, s.tx * 16 + s.art.ox, s.ty * 16 + s.art.oy, `wall@${s.tx},${s.ty}`);
  let n = 0;
  for (const v of cov) n += v;
  let total = cov.length;
  if (own) {
    total = 0;
    for (const v of own) total += v;
  }
  return { frac: n / Math.max(1, total), by: [...by] };
}

export interface OcclusionReport {
  id: string;
  at: [number, number];
  frac: number;
  by: string[];
}

/** Every present NPC / symbol / restored object over half hidden (symbols: anywhere in their roaming area). */
export function checkOcclusion(f: FieldScene, limit = 0.5): OcclusionReport[] {
  const out: OcclusionReport[] = [];
  const test = (a: Actor, fx: number, fy: number) => {
    const c = coverage(f, fx, fy, a.frame());
    if (c.frac > limit) out.push({ id: a.id, at: [Math.floor(fx / 16), Math.floor((fy - 1) / 16)], frac: Math.round(c.frac * 100) / 100, by: c.by });
  };
  for (const a of f.actors) {
    if (!a.visible || a.drawFn) continue;
    // actors meant to be half inside something (the shadow man, perched birds) opt out with ghost + a y offset
    const def = a.data.def as NpcObj | undefined;
    if (a.kind === 'npc' && def?.ghost && (a.oy < -6 || def.shadow === 0)) continue;
    // someone sitting on a bench is meant to be half behind its front, a
    // shopkeeper behind the counter or the showcase
    if (a.kind === 'npc' && def?.pose === 'sit') continue;
    if (a.kind === 'npc' && cellAt(f.map, a.tileX, a.tileY + 1).counter) continue;
    if (a.kind === 'sym') {
      const o = (a.data.sym as { obj: SymbolObj; home: [number, number] } | undefined)?.obj;
      const home = (a.data.sym as { home: [number, number] } | undefined)?.home ?? [a.x, a.y];
      const r = o?.move === 'umbrella' || o?.move === 'hato' ? Math.max(1, o.radius ?? (o.move === 'hato' ? 1 : 3)) : 0;
      let worst: OcclusionReport | null = null;
      let tiles = 0;
      let hidden = 0;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const fx = home[0] + dx * 16;
          const fy = home[1] + dy * 16;
          if (Math.hypot(dx, dy) > r + 0.01) continue;
          // the home is where it is drawn, walkable or not (QA round 2: a
          // symbol perched on an unwalkable tile was never checked at all);
          // the rest of a roaming area only where it can go
          if ((dx || dy) && !f.free(a, fx, fy, true)) continue;
          tiles++;
          const c = coverage(f, fx + a.ox, fy + a.oy, a.frame());
          if (c.frac > limit) {
            hidden++;
            if (!worst || c.frac > worst.frac) worst = { id: a.id, at: [Math.floor(fx / 16), Math.floor((fy - 1) / 16)], frac: Math.round(c.frac * 100) / 100, by: c.by };
          }
        }
      // a roamer may pass behind a tree now and then; a quarter of its area is too much
      if (worst && (r === 0 || hidden / Math.max(1, tiles) > 0.25)) out.push({ ...worst, id: `${a.id} (${hidden}/${tiles} tiles)` });
      continue;
    }
    test(a, a.x + a.ox, a.y + a.oy);
  }
  return out;
}
