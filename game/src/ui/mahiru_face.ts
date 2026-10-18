// 真昼の 顔（03_ch3_index、events/ch3/mahiru.ts）の 写真の 顔：人の 絵（charSprite）に、正午の 光と
// ふたで 返した 光を かさねた 小さな 絵。大写し「のぞき窓」と みました帳③の すみ『正午の 3まい』で 使う
// （帳面から events を import しない ために ui に 置く）。

import { makeCanvas } from '../engine/pixel';
import { flag } from '../game/state';
import { charSprite, hasChar, poseFrame } from '../art/chars/registry';

const cache = new Map<string, HTMLCanvasElement>();

/**
 * One person's face at noon with the lid's light (`level` 0 low: only the throat lit, 1 just right, 2 too high:
 * screwed-up eyes in the glare; -1 no lid: the brim's and the brows' black shadows). The sprite as it is, the
 * light laid over it (source-atop). `br`: ウミ after her sea — wet hair, the shell bracelet.
 */
export function mhPortrait(id: string, level: number, br = false, pose?: string): HTMLCanvasElement | null {
  const key = `${id}|${level}|${br ? 1 : 0}|${pose ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!hasChar(id)) return null;
  const s = charSprite(id);
  const src = pose ? poseFrame(s, pose, 'down') : s.walk.down[0];
  const [c, g] = makeCanvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  const h = src.height;
  const band = (y0: number, y1: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(0, Math.round(h * y0), src.width, Math.max(1, Math.round(h * (y1 - y0))));
  };
  if (level < 0) {
    band(0, 0.42, 'rgba(24,16,40,0.6)');
  } else if (level === 0) {
    band(0, 0.4, 'rgba(24,16,40,0.62)');
    band(0.4, 0.58, 'rgba(255,248,226,0.34)');
  } else if (level === 1) {
    band(0, 0.22, 'rgba(24,16,40,0.12)');
    band(0.22, 0.6, 'rgba(255,248,226,0.16)');
  } else {
    // (too high: the glare washes the face out, the eyes screwed up against it — the line under it says so)
    band(0, 0.62, 'rgba(255,252,240,0.34)');
  }
  g.globalCompositeOperation = 'source-over';
  if (br) {
    // wet hair (drips) and the shell bracelet on the wrist
    g.fillStyle = 'rgba(120,190,230,0.9)';
    for (const [x, y] of [[0.3, 0.16], [0.62, 0.14], [0.5, 0.2]] as const) g.fillRect(Math.round(src.width * x), Math.round(h * y), 1, 2);
    g.fillStyle = '#F4D8D0';
    g.fillRect(Math.round(src.width * 0.12), Math.round(h * 0.6), 3, 1);
    g.fillStyle = '#E8A8A0';
    g.fillRect(Math.round(src.width * 0.12) + 1, Math.round(h * 0.6), 1, 1);
  }
  cache.set(key, c);
  return c;
}

/** The photo kept of a person (0 not taken, 1 just right, 2 only the throat, 3 squinting; 'four' 1 = taken). */
export function mhShot(who: 'kaito' | 'teru' | 'umi' | 'four'): number {
  return flag(`flag_mh_${who}`);
}
