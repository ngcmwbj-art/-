// Footstep sounds by ground (40_audio.md 9.3).
import type { Actor } from './actor';
import type { FieldScene } from './field';
import { cellAt, groundAt } from './maps';
import type { Ground } from './types';
import * as snd from './audio';

const STEP: Partial<Record<Ground, string>> = {
  asphalt: 'se_step_asphalt',
  gutter: 'se_step_asphalt',
  crosswalk: 'se_step_asphalt',
  lot: 'se_step_asphalt',
  sidewalk: 'se_step_stone',
  plaza: 'se_step_stone',
  bridge: 'se_step_stone',
  genkan: 'se_step_stone',
  arcade: 'se_step_tile',
  tile_floor: 'se_step_tile',
  mall: 'se_step_tile',
  grass: 'se_step_grass',
  weeds: 'se_step_grass',
  hedge: 'se_step_grass',
  reeds: 'se_step_grass',
  dirt: 'se_step_dirt',
  sand: 'se_step_sand',
  gravel: 'se_step_gravel',
  ballast: 'se_step_gravel',
  wood: 'se_step_wood',
  shopwood: 'se_step_wood',
  wood_bare: 'se_step_wood_bare',
  engawa: 'se_step_wood_bare',
  tatami: 'se_step_tatami',
  kitchen: 'se_step_wood_bare',
};

/** Manhole covers (decal_manhole, 30_level_art 6.3). */
export const MANHOLES: [number, number][] = [
  [15, 33],
  [33, 33],
  [49, 33],
  [19, 23],
  [44, 10],
];

let alt = 0;
export function footstepFor(f: FieldScene, a: Actor, running: boolean): void {
  const tx = Math.floor(a.x / 16);
  const ty = Math.floor((a.y - 2) / 16);
  const cell = cellAt(f.map, tx, ty);
  const g = groundAt(f.map, tx, ty);
  let id = cell.step ?? STEP[g] ?? 'se_step_asphalt';
  let pitch = 1;
  let vol = 1;
  if (f.map.id === 'map_town' && MANHOLES.some(([mx, my]) => mx === tx && my === ty)) id = 'se_step_metal';
  if (g === 'kitchen') {
    pitch = 0.9;
    vol = 0.8;
  }
  if (running) {
    vol *= 1.3;
    pitch *= 1.06;
  }
  alt = 1 - alt;
  snd.se(id, { pitch: pitch * (0.98 + Math.random() * 0.04), vol: vol * (0.88 + Math.random() * 0.24), pan: alt ? 0.05 : -0.05 });
  if (f.follower && f.follower.moving) {
    setTimeout(() => snd.se('se_step_kanenari', { vol: 0.7 }), running ? 60 : 90);
  }
}
