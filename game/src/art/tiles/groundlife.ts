// Animated ground details drawn over the baked chunks: swaying weed tufts
// (3 frames, 450ms, phase by position, a wind wave every 12s; frozen in
// stage 1, leaning north-east in stage 2), grass tufts with flowers, ant
// trails on dirt.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { H, W } from '../../engine/screen';
import type { Grade } from '../../world/lighting';
import type { LoadedMap } from '../../world/maps';
import type { GroundSource } from './ground';
import { ihash } from './noise';
import { P } from './palette';

type Tuft = HTMLCanvasElement[]; // [left, mid, right, ne]

function makeTuft(kind: 'weed' | 'weedTall' | 'grass' | 'foxtail' | 'flower', seed: number): Tuft {
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < 4; f++) {
    const lean = f === 0 ? -1 : f === 1 ? 0 : f === 2 ? 1 : 2;
    const p = new PixelCanvas(12, 14);
    const blades = kind === 'grass' ? 3 : kind === 'flower' ? 2 : 5;
    const hgt = kind === 'weedTall' ? 11 : kind === 'weed' ? 8 : kind === 'foxtail' ? 11 : kind === 'flower' ? 7 : 5;
    for (let b = 0; b < blades; b++) {
      const bx = 3 + ((b * 5 + seed * 3) % 6);
      const bh = hgt - ((b * 7 + seed) % 3);
      for (let y = 0; y < bh; y++) {
        const t = y / bh; // 0 at base
        const off = Math.round(lean * t * t * 2 + (b % 2 ? t * 0.8 : -t * 0.6));
        const px = bx + off;
        const py = 13 - y;
        const col = y > bh - 3 ? P.leafYoung : y > bh / 2 ? P.leaf : P.leafDeep;
        p.set(px, py, col);
        if (y < 2) p.set(px + 1, py, P.leafShade);
      }
      if (kind === 'foxtail' && b % 2 === 0) {
        const tx = bx + Math.round(lean * 2);
        p.set(tx, 13 - bh, P.goldPale);
        p.set(tx, 12 - bh, P.goldPale);
        p.set(tx + 1, 13 - bh, P.brass);
      }
      if (kind === 'flower' && b === 0) {
        const tx = bx + Math.round(lean * 1.5);
        const c = seed % 3 === 0 ? P.white : seed % 3 === 1 ? P.gold : P.peach;
        p.set(tx, 13 - bh, c);
        p.set(tx - 1, 14 - bh, c);
        p.set(tx + 1, 14 - bh, c);
        p.set(tx, 14 - bh, P.gold);
      }
    }
    frames.push(p.toCanvas());
  }
  return frames;
}

let TUFTS: Record<string, Tuft[]> | null = null;
function tufts(): Record<string, Tuft[]> {
  if (!TUFTS) {
    TUFTS = {
      weed: [0, 1, 2].map((s) => makeTuft('weed', s)),
      weedTall: [0, 1].map((s) => makeTuft('weedTall', s)),
      grass: [0, 1, 2].map((s) => makeTuft('grass', s)),
      foxtail: [0, 1].map((s) => makeTuft('foxtail', s)),
      flower: [0, 1, 2].map((s) => makeTuft('flower', s)),
    };
  }
  return TUFTS;
}

export function drawGroundLife(g: Gfx, map: LoadedMap, src: GroundSource, cx: number, cy: number, mt: number, grade: Grade): void {
  const T = tufts();
  const tx0 = Math.max(0, Math.floor(cx / 16) - 1);
  const ty0 = Math.max(0, Math.floor(cy / 16) - 1);
  const tx1 = Math.min(map.w - 1, Math.floor((cx + W) / 16) + 1);
  const ty1 = Math.min(map.h - 1, Math.floor((cy + H) / 16) + 1);
  const ne = grade.toMall > 0.5;
  const frozen = grade.motion < 0.05;
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      const gr = src.ground(tx, ty);
      const h = ihash(tx, ty, 777);
      let list: Tuft[] | null = null;
      let count = 0;
      if (gr === 'weeds') {
        list = h % 4 === 0 ? T.foxtail : h % 3 === 0 ? T.weedTall : T.weed;
        count = 2 + (h % 2);
      } else if (gr === 'grass') {
        if (h % 100 < 14) {
          list = h % 5 === 0 ? T.flower : T.grass;
          count = 1;
        }
      } else if (gr === 'gravel' || gr === 'dirt') {
        if (h % 100 < 5) {
          list = T.weed;
          count = 1;
        }
      } else if (gr === 'lot' || gr === 'asphalt') {
        // weeds from cracks along the parking lot
        if (map.id === 'map_town' && gr === 'lot' && h % 100 < 4) {
          list = T.grass;
          count = 1;
        }
      }
      if (!list) continue;
      for (let i = 0; i < count; i++) {
        const hh = ihash(tx * 3 + i, ty, 779);
        const tuft = list[hh % list.length];
        const ox = (hh >>> 4) % 10 - 2;
        const oy = (hh >>> 9) % 8 - 2;
        let frame: number;
        if (ne) frame = ((hh >>> 13) % 5 === 0 && Math.floor(mt / 700 + (hh & 7)) % 3 === 0) ? 2 : 3;
        else if (frozen) frame = (hh >>> 13) % 3;
        else {
          const phase = (hh & 1023) / 1023;
          const base = Math.floor(mt / 450 + phase * 3) % 3;
          // wind wave passing east→west every 12s
          const wave = ((mt / 1000) % 12) * 90;
          const wx = map.w * 16 - wave;
          const near = Math.abs(tx * 16 - wx) < 40;
          frame = near ? 0 : [0, 1, 2, 1][base % 4] ?? 1;
        }
        g.img(tuft[frame], tx * 16 + ox - cx, ty * 16 + oy - cy);
      }
    }
}
