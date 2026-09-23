// Water surfaces (canal, paddy fields): the stage sky reflected in screen
// space (7.3), 4-frame ripple cycle, sparkles, drifting leaves, fish shadows,
// the stage-2 "night patch", and rice plants in the paddies.

import type { Grade } from '../../world/lighting';
import { css } from '../../world/lighting';
import { groundAt, type LoadedMap } from '../../world/maps';
import { H, W } from '../../engine/screen';
import { ihash } from './noise';
import { P } from './palette';

export interface WaterCtx {
  ctx: CanvasRenderingContext2D;
  /** World px of the chunk's top-left. */
  worldX: number;
  worldY: number;
  camX: number;
  camY: number;
  w: number;
  h: number;
  grade: Grade;
  t: number;
  /** Motion clock (reflection freezes in stage 1; water keeps flowing on t). */
  mt: number;
  stage: number;
  map: LoadedMap;
  /** Visible part of the chunk (local px); drawing is limited to it. */
  vis?: [number, number, number, number];
}

function mixc(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function drawWater(w: WaterCtx): void {
  const { ctx, grade } = w;
  // sky gradient in screen coordinates: local y → screen y = worldY + ly - camY
  const sy0 = w.worldY - w.camY;
  const g = ctx.createLinearGradient(0, -sy0, 0, H - sy0);
  const deep = mixc(grade.skyBot, [58, 43, 92], 0.25);
  g.addColorStop(0, css(grade.skyTop));
  g.addColorStop(0.62, css(grade.skyBot));
  g.addColorStop(1, css(deep));
  ctx.fillStyle = g;
  const [rx, ry, rw, rh] = w.vis ?? [0, 0, w.w, w.h];
  ctx.fillRect(rx, ry, rw, rh);

  // horizon line of stage 2 (#FFE7A3 thin)
  if (grade.horizonA > 0.01) {
    const hy = Math.round(H * 0.7 - sy0);
    if (hy >= 0 && hy < w.h) {
      ctx.fillStyle = css(grade.horizon, grade.horizonA * 0.8);
      ctx.fillRect(0, hy, w.w, 1);
    }
  }

  // shade under the north bank (the retaining wall's shadow) and its dark reflection
  {
    const sh = ctx.createLinearGradient(0, 36 * 16 + 5 - w.worldY, 0, 36 * 16 + 14 - w.worldY);
    sh.addColorStop(0, 'rgba(42,36,64,0.5)');
    sh.addColorStop(1, 'rgba(42,36,64,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 36 * 16 + 5 - w.worldY, w.w, 10);
    // guardrail posts reflected upside-down (α30%)
    ctx.fillStyle = 'rgba(244,241,232,0.3)';
    for (let x = 0; x < w.w; x++) {
      const wx = w.worldX + x;
      if (((wx % 32) + 32) % 32 === 3) ctx.fillRect(x, 36 * 16 + 6 - w.worldY, 2, 7);
    }
    ctx.fillRect(0, 36 * 16 + 11 - w.worldY, w.w, 1);
  }
  const flowT = w.t; // water always flows
  // visible rows of this chunk only
  const vy0 = Math.max(ry, w.camY - w.worldY - 2);
  const vy1 = Math.min(ry + rh, w.camY + H - w.worldY + 2);
  // wave bands: alternating lighter / darker rows drifting with the current
  for (let y = vy0; y < vy1; y++) {
    const wy = w.worldY + y;
    const v = Math.sin(wy * 0.8 + flowT / 420) + Math.sin(wy * 0.33 - flowT / 900) * 0.6;
    if (v > 0.9) {
      ctx.fillStyle = 'rgba(255,231,163,0.16)';
      ctx.fillRect(0, y, w.w, 1);
    } else if (v < -0.9) {
      ctx.fillStyle = 'rgba(58,43,92,0.14)';
      ctx.fillRect(0, y, w.w, 1);
    }
  }
  const frame = Math.floor(flowT / 200) % 4;
  // ripple stripes: darker 1px lines every 4 rows, offset per frame; lighter highlight lines
  ctx.fillStyle = 'rgba(58,43,92,0.32)';
  for (let y = (frame % 4) + Math.floor(vy0 / 4) * 4; y < vy1; y += 4) {
    const wy = w.worldY + y;
    for (let x = 0; x < w.w; x += 16) {
      const wx = w.worldX + x;
      const hsh = ihash(wx >> 4, wy >> 2, 5);
      const len = 5 + (hsh % 8);
      const off = ((hsh >>> 4) % 10) + ((flowT / 160) % 16);
      ctx.fillRect(Math.floor(x + (off % 16)), y, len, 1);
    }
  }
  ctx.fillStyle = 'rgba(255,246,216,0.5)';
  for (let y = ((frame + 2) % 4) + Math.floor(vy0 / 4) * 4; y < vy1; y += 4) {
    const wy = w.worldY + y;
    for (let x = 0; x < w.w; x += 16) {
      const wx = w.worldX + x;
      const hsh = ihash(wx >> 4, wy >> 2, 9);
      if (hsh % 3) continue;
      const len = 2 + (hsh % 4);
      const off = ((hsh >>> 5) % 12) + ((flowT / 120) % 16);
      ctx.fillRect(Math.floor(x + (off % 16)), y, len, 1);
    }
  }
  // sun glitter: short bright dashes, denser towards the western (left) edge
  // of the screen where the low sun is; frozen reflection in stage 1
  if (grade.night < 0.5) {
    const gt = Math.floor((w.stage === 1 ? 0 : w.mt) / 180);
    for (let y = vy0; y < vy1; y += 2) {
      const wy = w.worldY + y;
      for (let k = 0; k < 10; k++) {
        const hh = ihash(k, wy + gt * 7, 71);
        const sx = hh % W;
        const dens = 1 - sx / W;
        if ((hh >>> 10) % 100 > 15 + dens * 60) continue;
        const lx = sx + w.camX - w.worldX;
        if (lx < rx - 4 || lx > rx + rw) continue;
        const len = 2 + ((hh >>> 16) % 4);
        ctx.fillStyle = (hh >>> 20) % 3 ? 'rgba(255,231,163,0.7)' : 'rgba(255,246,216,0.9)';
        ctx.fillRect(lx, y, len, 1);
      }
    }
  }
  // sparkles: random 1px glints that blink
  ctx.fillStyle = P.glint;
  for (let i = 0; i < 24; i++) {
    const hh = ihash(i, Math.floor(flowT / 350) + (w.worldX >> 8) * 31, 13 + (w.worldY >> 8));
    const x = hh % w.w;
    const y = (hh >>> 9) % w.h;
    if ((hh >>> 20) % 3 === 0) ctx.fillRect(x, y, 1, 1);
  }

  // canal extras: drifting leaves (east, 6px/s) and a fish shadow now and then
  const leafSpan = 1024;
  for (let i = 0; i < 6; i++) {
    const baseX = (i * 173 + (flowT / 1000) * 6) % leafSpan;
    const wy = 36 * 16 + 4 + ((i * 37) % 24);
    const wx = baseX;
    const lx = Math.floor(wx - w.worldX);
    const ly = Math.floor(wy - w.worldY);
    if (lx < -4 || ly < -4 || lx > w.w || ly > w.h) continue;
    ctx.fillStyle = i % 3 === 0 ? P.goldPale : P.leaf;
    ctx.fillRect(lx, ly, 2, 1);
    ctx.fillRect(lx + 1, ly + 1, 1, 1);
    ctx.fillStyle = P.leafShade;
    ctx.fillRect(lx + 2, ly + 1, 1, 1);
  }
  {
    const cyc = (flowT / 1000) % 11;
    if (cyc < 3) {
      const fx = 22 * 16 + cyc * 20 - w.worldX;
      const fy = 36 * 16 + 18 - w.worldY;
      ctx.fillStyle = 'rgba(42,36,64,0.35)';
      ctx.fillRect(Math.floor(fx), fy, 5, 2);
      ctx.fillRect(Math.floor(fx) - 2, fy - 1 + (Math.floor(flowT / 150) % 2), 2, 1);
      ctx.fillRect(Math.floor(fx) - 2, fy + 2 - (Math.floor(flowT / 150) % 2), 2, 1);
    }
  }

  // stage 2: a patch of night sky drifting west in the canal and the paddy (fx_night_patch)
  if (w.stage === 2 || grade.toMall > 0.5) {
    const drift = ((w.t / 1000) * 3) % 200;
    for (const [bx, by] of [
      [40 * 16 - drift, 36 * 16 + 6],
      [31.5 * 16 - drift * 0.3, 41 * 16 + 6],
    ]) {
      const lx = Math.floor(bx - w.worldX);
      const ly = Math.floor(by - w.worldY);
      if (lx < -30 || ly < -12 || lx > w.w + 30 || ly > w.h + 12) continue;
      ctx.fillStyle = css([27, 23, 51], 0.92);
      for (let yy = -5; yy <= 5; yy++) {
        const half = Math.round(12 * Math.sqrt(Math.max(0, 1 - (yy / 5.4) ** 2)));
        ctx.fillRect(lx - half, ly + yy, half * 2, 1);
      }
      ctx.fillStyle = css([58, 43, 92], 0.9);
      for (let yy = -5; yy <= 5; yy += 10) ctx.fillRect(lx - 6, ly + yy, 12, 1);
      ctx.fillStyle = P.glint;
      ctx.fillRect(lx + 4, ly - 2, 1, 1);
    }
  }

  // paddies: rows of rice over the reflection
  drawPaddies(w);
}

// Rice clumps for one tile, baked once per lean (0 = upright, -1 = bent by the wind).
const riceTiles = new Map<string, HTMLCanvasElement>();
function riceTile(variant: number, lean: number): HTMLCanvasElement {
  const key = variant + ':' + lean;
  let c = riceTiles.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  // rows of rice every 4px (2px of leaves + tips), a 1px strip of water between
  for (let row = 0; row < 4; row++) {
    const ry = row * 4 + 1;
    for (let x = 0; x < 16; x++) {
      const h = ihash(x, row + variant * 5, 97);
      const clump = (x + row + variant) % 3 !== 2;
      ctx.fillStyle = clump ? (h % 4 === 0 ? P.leafShade : P.leafDeep) : P.leafShade;
      ctx.fillRect(x, ry + 1, 1, 2);
      if (!clump) continue;
      const l = h % 3 === 0 ? 0 : lean;
      ctx.fillStyle = h % 5 === 0 ? P.leafLt : P.leaf;
      ctx.fillRect(x + l, ry, 1, 1);
      if (h % 7 === 0) {
        ctx.fillStyle = P.goldPale;
        ctx.fillRect(x + l, ry - 1 < 0 ? 0 : ry - 1, 1, 1);
      }
    }
  }
  riceTiles.set(key, c);
  return c;
}

function drawPaddies(w: WaterCtx): void {
  const { ctx, map } = w;
  const [rx, ry, rw, rh] = w.vis ?? [0, 0, w.w, w.h];
  const tx0 = Math.floor((w.worldX + rx) / 16);
  const ty0 = Math.floor((w.worldY + ry) / 16);
  const tx1 = Math.floor((w.worldX + rx + rw - 1) / 16);
  const ty1 = Math.floor((w.worldY + ry + rh - 1) / 16);
  const motion = w.grade.motion;
  // wind wave: moves east→west across the field (stops in stage 1)
  const waveT = w.mt / 1000;
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      if (groundAt(map, tx, ty) !== 'paddy') continue;
      const phase = Math.sin(waveT * 1.6 + (tx * 16) / 22 + ty * 1.4);
      const lean = motion > 0.05 && phase > 0.6 ? -1 : 0;
      ctx.drawImage(riceTile(ihash(tx, ty, 93) % 4, lean), tx * 16 - w.worldX, ty * 16 - w.worldY);
    }
}
