// Chapter 3's dark (62 1.7・8.5): the old aquarium's deep-sea room (all of it)
// and the store room through S22's night. The dark itself is chapter 2's
// (lantern.ts: MapDef.dark, the dithered edge, darkCond); only the lights
// change. No tomato: しゅん's stamp case glows 朱 at his chest — a small warm
// red pool (radius 40px: his feet and a tile round him), the brightest colour
// in the black house — and グソっ君's eyes throw a fan of #FFE7A3 ahead of
// him (lantern.ts fanImage, テツヤ's headlight's shape). Why his eyes shine is
// never said (60).

import { makeCanvas } from '../engine/pixel';
import type { Actor } from './actor';
import type { FieldScene } from './field';
import { fanImage } from './lantern';
import { isCh3Map } from './maps';

/** The stamp case's light: radius (px) and its three rings' colours and strengths (mixed into the light map). */
const HANKO_R = 40;
const HANKO_RINGS: [number, string, number][] = [
  [10, '#FFE0D0', 0.8],
  [24, '#F0907A', 0.55],
  [40, '#E23B2E', 0.35],
];

let hankoImg: HTMLCanvasElement | null = null;
/** The case's pool: three rings, a 2px checker across each border (the tomato's way of drawing). */
function hankoPool(): HTMLCanvasElement {
  if (hankoImg) return hankoImg;
  const size = HANKO_R * 2 + 1;
  const [c, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - HANKO_R, y - HANKO_R);
      let zone = -1;
      for (let k = 0; k < 3; k++) {
        const b = HANKO_RINGS[k][0];
        if (dist < b - 1) {
          zone = k;
          break;
        }
        if (dist < b + 1) {
          zone = (x + y) & 1 ? k : k + 1;
          break;
        }
      }
      if (zone < 0 || zone > 2) continue;
      const [, col, a] = HANKO_RINGS[zone];
      const v = parseInt(col.slice(1), 16);
      const i = (y * size + x) * 4;
      d[i] = (v >> 16) & 255;
      d[i + 1] = (v >> 8) & 255;
      d[i + 2] = v & 255;
      d[i + 3] = Math.round(a * 255);
    }
  ctx.putImageData(img, 0, 0);
  hankoImg = c;
  return c;
}

/** Is chapter 3's dark on here now? */
export function c3DarkHere(f: FieldScene): boolean {
  return isCh3Map(f.map.def) && f.light.hasDark;
}

/** グソっ君 on this map (the follower, or a scripted actor of his). */
function gusokkun(f: FieldScene): Actor | null {
  if (f.follower?.visible) return f.follower;
  for (const a of f.actors) if (a.visible && a.spriteId.startsWith('kanenari')) return a;
  return null;
}

const DIR_ANGLE: Record<string, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

/**
 * Paint the case's red pool (mixed) and グソっ君's eyes (added) into the light
 * map `lx` (screen space, camera at cx, cy), after the dark is in it.
 */
export function paintC3Lights(f: FieldScene, lx: CanvasRenderingContext2D, cx: number, cy: number): void {
  if (!c3DarkHere(f)) return;
  const k = Math.min(1, f.light.darkK());
  lx.save();
  const p = f.player;
  if (p.visible) {
    // the case hangs at his chest; the pool breathes 1px with the tomato's 0.8 Hz
    const img = hankoPool();
    const R = HANKO_R;
    const sx = Math.round(p.x - cx) - R;
    const sy = Math.round(p.y - 10 - cy) - R;
    lx.globalCompositeOperation = 'source-over';
    lx.globalAlpha = k;
    lx.drawImage(img, sx, sy);
  }
  // the eyes only in the deep-sea room (and the sea, which has no dark): forward of where he faces
  const g = f.map.id === 'map_c3_aq_shinkai' ? gusokkun(f) : null;
  if (g) {
    const ang = DIR_ANGLE[g.dir] ?? 0;
    const fan = fanImage(ang);
    const hx = g.x + Math.cos(ang) * 6;
    const hy = g.y - 8 + Math.sin(ang) * 3;
    lx.globalCompositeOperation = 'lighter';
    lx.globalAlpha = 0.8 * k;
    lx.drawImage(fan, Math.round(hx - cx - (fan.width - 1) / 2), Math.round(hy - cy - (fan.height - 1) / 2));
  }
  lx.restore();
}
