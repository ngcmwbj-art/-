// The three models of the towns in the old aquarium's diorama room (62 4.12・
// 7.4): each town's own map, drawn small — every tile's ground in its colour,
// what is built on it as little roofs, the water blue — so the model is the
// map the player walked (2D; the HD-2D stands the same picture on its table).
// 夕鳴町's model has マフィ屋 in the ginza's south-west corner: a 3×3 shop with
// its shutter down and a muffin sign. It exists only here (62 7.4: never in the
// real ginza). The little dolls are the people Minato talked to (60 S17): dots
// of their clothes' colours, the scenario says who each one is.

import { mix, PixelCanvas } from '../../engine/pixel';
import { ihash } from '../tiles/noise';
import { loadMap, cellAt, groundAt } from '../../world/maps';

type Town = 'yunari' | 'hoshi' | 'umi';
const MAP_OF: Record<Town, string> = { yunari: 'map_town', hoshi: 'map_hoshimidai', umi: 'map_umizoi' };

/** A ground's colour on the model (a modeller's paint: flat, a step brighter than the real thing). */
function groundCol(g: string, town: Town): string {
  if (/umi|minato|water|canal/.test(g)) return town === 'umi' ? '#3A7EA8' : '#4A7A9A';
  if (/paddy/.test(g)) return town === 'hoshi' ? '#5A8A4A' : '#7AA05A';
  if (/sand|nagisa/.test(g)) return '#EAD8B0';
  if (/grass|weeds|reeds|kusa|mikan|hedge|green|field|ta_|hata|yama|sugi|mori/.test(g)) return town === 'hoshi' ? '#4A7A42' : '#6A9A4A';
  if (/dirt|lot|aze|gravel|path|michi/.test(g)) return '#A8946A';
  if (/iwa|rock/.test(g)) return '#7A766C';
  if (/rail|ballast/.test(g)) return '#6B6A66';
  if (/void|none/.test(g)) return '#2A2A34';
  return '#9A9AA0';
}

/** Roof colours of the models' houses (hand-painted, a few). */
const ROOFS: Record<Town, string[]> = {
  yunari: ['#8A5A4A', '#6B7186', '#A8742A', '#5A6A7A'],
  hoshi: ['#5A5A6A', '#7A5A4A', '#6A7A6A'],
  umi: ['#C8C4B8', '#3A7EA8', '#A8452E', '#E8E4D8'],
};

/** The dolls' colours (the clothes of the people of each town; the scenario names them). */
const DOLLS: Record<Town, string[]> = {
  yunari: ['#E84E3C', '#F4F1E8', '#2F4A8A', '#E8C83A', '#5A6B2A', '#8A2E22', '#3A7EA8', '#C8A06A'],
  hoshi: ['#E84E3C', '#5A6B2A', '#F4F1E8', '#8A7A4A', '#2F4A8A', '#C8452E'],
  umi: ['#F4F1E8', '#2F3A5A', '#E84E3C', '#C8452E', '#7FD1E8', '#E8C83A', '#8E95A6'],
};

const cache = new Map<string, PixelCanvas>();
const spotCache = new Map<string, [number, number][]>();

/** Where the model's dolls stand (px in the w × h model): on walkable ground, spread by a hash; 10 of them. */
export function dollSpots(town: Town, w: number, h: number): [number, number][] {
  const key = `${town}:${w}x${h}`;
  const hit = spotCache.get(key);
  if (hit) return hit;
  const out: [number, number][] = [];
  const m = loadMap(MAP_OF[town]);
  if (m) {
    const s = Math.min(w / m.w, h / m.h);
    const x0 = Math.floor((w - Math.round(m.w * s)) / 2);
    const y0 = Math.floor((h - Math.round(m.h * s)) / 2);
    for (let k = 0; out.length < 10 && k < 600; k++) {
      const tx = ihash(k, 1, 7303 + town.length) % m.w;
      const ty = ihash(k, 2, 7305 + town.length) % m.h;
      if (cellAt(m, tx, ty).solid) continue;
      const x = x0 + Math.round(tx * s);
      const y = y0 + Math.round(ty * s);
      if (x < 1 || y < 3 || x > w - 2 || y > h - 1) continue;
      if (out.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 4)) continue;
      out.push([x, y]);
    }
  }
  spotCache.set(key, out);
  return out;
}

/** The model of `town` fitted to w × h px (top-down, a modeller's 1/8). */
export function dioramaTown(town: Town, w: number, h: number): PixelCanvas {
  const key = `${town}:${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit.clone();
  const p = new PixelCanvas(w, h);
  const m = loadMap(MAP_OF[town]);
  if (!m) {
    p.fill('#3A3A4A');
    return p;
  }
  // the map fitted to the table (aspect kept, the rest is the table's green felt)
  const s = Math.min(w / m.w, h / m.h);
  const ow = Math.round(m.w * s);
  const oh = Math.round(m.h * s);
  const x0 = Math.floor((w - ow) / 2);
  const y0 = Math.floor((h - oh) / 2);
  p.fill('#2E3A2E');
  const roofs = ROOFS[town];
  for (let y = 0; y < oh; y++)
    for (let x = 0; x < ow; x++) {
      const tx = Math.min(m.w - 1, Math.floor(x / s));
      const ty = Math.min(m.h - 1, Math.floor(y / s));
      const cell = cellAt(m, tx, ty);
      const tag = cell.tag ?? '';
      let c = groundCol(String(groundAt(m, tx, ty)), town);
      if (tag === 'water' || tag === 'paddy') c = groundCol(tag, town);
      else if (cell.solid && /facade|roof|wall|prop|counter/.test(tag)) {
        c = roofs[ihash(tx >> 2, ty >> 2, 7301) % roofs.length];
        // the roof's lit north edge (the lamp is over the middle of the model)
        if (!cellAt(m, tx, ty - 1).solid) c = mix(c, '#FFFFFF', 0.25);
      } else if (cell.solid && /trunk|hedge/.test(tag)) c = '#3A6A3A';
      p.set(x0 + x, y0 + y, c);
    }
  // the model's edge: a painted base board
  p.strokeRect(x0 - 1, y0 - 1, ow + 2, oh + 2, '#4A3A2E');
  // the dolls (3 px people, a head and a coloured body), spread over the walkable ground
  const dolls = DOLLS[town];
  dollSpots(town, w, h).forEach(([x, y], i) => {
    p.set(x, y - 2, '#E8C8A0');
    p.set(x, y - 1, dolls[i % dolls.length]);
    p.set(x, y, dolls[i % dolls.length]);
  });
  if (town === 'yunari') {
    // マフィ屋: the ginza's south-west corner of the model (3×3, the shutter down, a muffin sign)
    const mx = x0 + Math.round(ow * 0.08);
    const my = y0 + oh - 5;
    p.rect(mx, my, 4, 4, '#9AA0A8');
    p.hline(mx, mx + 3, my + 2, '#7A8088');
    p.set(mx + 1, my - 1, '#C8945A');
    p.set(mx + 2, my - 1, '#E8C8A0');
  }
  if (town === 'umi') {
    // this very house on the cape, with a speck of a black stamp on its roof
    const ax = x0 + Math.round(ow * 0.92);
    const ay = y0 + Math.round(oh * 0.68);
    p.rect(ax - 2, ay - 2, 5, 4, '#E8E4D8');
    p.hline(ax - 2, ax + 2, ay, '#3A7EA8');
    p.set(ax, ay - 2, '#0B0B14');
  }
  cache.set(key, p.clone());
  return p;
}
