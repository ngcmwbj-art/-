// おじぎ自販機 (64×88, bow frames up to 80×96): the vending machine that
// bows too deeply. Cans are its teeth, the dispenser flap its mouth, the
// LED stuck at "17:00" (11.5). Bow angles 0/30/60/90° are pre-drawn.

import type { Gfx } from '../../engine/gfx';
import { makeCanvas, PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, rimLeft } from './lib';

const W = 96;
const H = 108;
const OX = 16;
const OY = 20;
const FW = 64; // front incl. 6px side
const FH = 88;

const RED = '#C8313A';
const RED_D = '#8E1F2A';
const RED_DD = '#4A1420';
const SIDE = '#E84E3C';
const SIDE_R = '#FF6A4D';

interface FaceOpts {
  mouth: number; // 0 closed … 1 open
  cracks: number;
  shiftRow: boolean;
  sunburn: boolean;
}

/** The upright machine front (64×88) with all its details. */
function front(o: FaceOpts): PixelCanvas {
  const p = new PixelCanvas(FW, FH);
  // body
  for (let y = 0; y < FH; y++)
    for (let x = 0; x < FW; x++) {
      let c = RED;
      if (x < 6) c = x === 0 ? SIDE_R : x < 3 ? SIDE : '#D8434A';
      else if (x >= 60) c = RED_D;
      else if (x === 59 || y === FH - 1) c = '#A8262F';
      if (x >= 6 && x < 60 && hash2(x, y, 5) < 0.02) c = '#B82C34';
      p.set(x, y, c);
    }
  // right side sun-faded
  if (o.sunburn) for (let y = 10; y < FH; y++) for (let x = 61; x < 64; x++) if (hash2(x, y, 7) < 0.4) p.set(x, y, '#D8606A');
  // inner outline between side and front
  p.vline(6, 0, FH - 1, RED_DD);
  // header (white panel with a red wave logo)
  p.rect(7, 1, 52, 11, '#F4F1E8');
  p.hline(7, 58, 11, '#C8C2B4');
  p.strokeRect(7, 1, 52, 11, RED_D);
  for (let x = 10; x < 38; x++) {
    const y = 6 + Math.round(Math.sin(x * 0.42) * 2);
    p.set(x, y, '#E84E3C');
    p.set(x, y + 1, '#E84E3C');
    if (x % 2) p.set(x, y - 1, '#FF7A62');
  }
  // LED housing (digits are drawn live in over())
  p.rect(41, 3, 16, 7, '#1A2A20');
  p.strokeRect(40, 2, 18, 9, '#2A3A30');
  // display window
  const wx = 7;
  const wy = 14;
  p.rect(wx, wy, 52, 30, '#3A2B3A');
  p.strokeRect(wx - 1, wy - 1, 54, 32, RED_DD);
  for (let row = 0; row < 2; row++) {
    const cy = wy + 2 + row * 14 + (o.shiftRow && row === 1 ? 1 : 0);
    for (let i = 0; i < 6; i++) {
      const cx = wx + 2 + i * 8 + (o.shiftRow && row === 0 ? 1 : 0);
      // can: rim, body, white band, highlight
      p.hline(cx, cx + 5, cy, '#C0C6CC');
      p.hline(cx + 1, cx + 4, cy - 1, '#E0E4E8');
      p.rect(cx, cy + 1, 6, 9, '#E84E3C');
      p.vline(cx, cy + 1, cy + 9, '#FF9A8A');
      p.vline(cx + 5, cy + 1, cy + 9, '#B83A2A');
      p.rect(cx, cy + 4, 6, 2, '#F4F1E8');
      p.set(cx + 5, cy + 4, '#C8C2B4');
      p.set(cx + 5, cy + 5, '#C8C2B4');
      if (row === 0 && i === 5) {
        // sun-bleached "つめた〜い" sticker crossed out in vermilion
        p.rect(cx, cy + 1, 6, 9, '#9AB8C4');
        p.rect(cx, cy + 4, 6, 2, '#C8D8E0');
        p.line(cx, cy + 2, cx + 5, cy + 8, '#E23B2E');
        p.line(cx + 5, cy + 2, cx, cy + 8, '#E23B2E');
      }
    }
    // "あったか〜い" strip under each row
    const sy = cy + 10;
    p.rect(wx, sy, 52, 2, '#E84E3C');
    for (let x = wx + 2; x < wx + 50; x += 3) p.set(x, sy, '#F4F1E8');
  }
  // glass reflection (diagonal band, 25%)
  for (let y = wy; y < wy + 30; y++)
    for (let d = 0; d < 6; d++) {
      const x = wx + 30 - (y - wy) + d;
      if (x >= wx && x < wx + 52) {
        const v = p.get(x, y);
        const r = v & 255;
        const g = (v >>> 8) & 255;
        const b = (v >>> 16) & 255;
        const m = (c: number) => Math.round(c + (255 - c) * 0.25).toString(16).padStart(2, '0');
        p.set(x, y, `#${m(r)}${m(g)}${m(b)}`);
      }
    }
  // cracks in the glass (HP 66% / 33%)
  if (o.cracks >= 1) {
    p.line(wx + 40, wy + 2, wx + 34, wy + 12, '#F4F1E8');
    p.line(wx + 34, wy + 12, wx + 37, wy + 20, '#F4F1E8');
    p.line(wx + 34, wy + 12, wx + 28, wy + 15, '#F4F1E8');
  }
  if (o.cracks >= 2) {
    p.line(wx + 8, wy + 26, wx + 16, wy + 18, '#F4F1E8');
    p.line(wx + 16, wy + 18, wx + 22, wy + 21, '#F4F1E8');
    p.line(wx + 16, wy + 18, wx + 15, wy + 10, '#F4F1E8');
  }
  // buttons (3×3 white with red lamp) below the window
  for (let i = 0; i < 6; i++) {
    const bx = wx + 3 + i * 8;
    const by = 47;
    p.rect(bx, by, 3, 3, '#F4F1E8');
    p.set(bx + 1, by + 1, '#E84E3C');
    p.set(bx + 2, by + 2, '#C8C2B4');
  }
  // coin slot, return lever, bill slot
  p.rect(49, 52, 5, 8, '#3A3F48');
  p.strokeRect(48, 51, 7, 10, '#C0C6CC');
  p.vline(51, 53, 58, '#0B0B14');
  p.rect(38, 54, 8, 3, '#C0C6CC');
  p.rect(39, 55, 6, 1, '#3A3F48');
  p.rect(12, 53, 14, 5, '#3A3F48');
  p.hline(12, 25, 53, '#6B7186');
  p.rect(28, 53, 4, 2, '#C0C6CC');
  // dispenser (the mouth) 40×12
  const my = 64;
  p.rect(12, my, 40, 12, '#1A1420');
  p.strokeRect(11, my - 1, 42, 14, RED_DD);
  const flapH = Math.round(10 * (1 - o.mouth));
  if (flapH > 0) {
    p.rect(12, my, 40, flapH, '#3A3F48');
    p.hline(12, 51, my, '#6B7186');
    p.hline(12, 51, my + flapH - 1, '#2A2E36');
    p.set(30, my + Math.floor(flapH / 2), '#6B7186');
    p.set(31, my + Math.floor(flapH / 2), '#6B7186');
  }
  // kick plate + rust
  p.rect(7, 79, 52, 8, '#A8262F');
  for (let x = 7; x < 59; x++) if (hash2(x, 3, 11) < 0.25) p.set(x, 79 + Math.floor(hash2(x, 5, 3) * 8), '#8E5A3A');
  p.hline(7, 58, 79, RED_DD);
  return p;
}

/** Full sprite at a bow angle: 0 / 30 / 60 / 90 (front squashes, the roof shows). */
function build(angle: number, o: FaceOpts & { straight?: boolean }): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const f = front(o);
  const frontScale = angle === 0 ? 1 : angle === 30 ? 0.84 : angle === 60 ? 0.55 : 0.2;
  const topH = angle === 0 ? 0 : angle === 30 ? 10 : angle === 60 ? 24 : 44;
  const grow = angle === 90 ? 8 : angle === 60 ? 5 : angle === 30 ? 2 : 0;
  const fh = Math.round(FH * frontScale);
  const baseY = OY + FH; // feet
  const fy = baseY - fh;
  // front face, vertically foreshortened (nearest neighbour)
  for (let y = 0; y < fh; y++) {
    const sy = Math.min(FH - 1, Math.floor((y / fh) * FH));
    const k = y / Math.max(1, fh);
    const extra = Math.round(grow * (1 - k));
    for (let x = -extra; x < FW + extra; x++) {
      const sx = Math.max(0, Math.min(FW - 1, Math.round(((x + extra) / (FW + extra * 2)) * FW)));
      const v = f.get(sx, sy);
      if (v >>> 24) p.set(OX + x, fy + y, v);
    }
  }
  // roof (天板) above, widening toward the camera
  for (let y = 0; y < topH; y++) {
    const k = y / Math.max(1, topH);
    const half = FW / 2 + grow * 1.2 * (1 - k) + grow;
    const cx = OX + FW / 2;
    for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) {
      let c = '#D9404A';
      const u = (x - (cx - half)) / (half * 2);
      if (u < 0.08) c = '#F06A70';
      if (u > 0.9) c = '#A8262F';
      // vents
      if (y % 6 === 3 && u > 0.25 && u < 0.75) c = '#8E1F2A';
      if (angle === 90 && hash2(x, y, 4) < 0.05) c = '#9A8A8A';
      p.set(x, fy - topH + y, c);
    }
  }
  // power cord dragging off to the right
  const cordY = baseY - 30;
  for (let x = OX + FW; x < W - 2; x++) {
    const y = cordY + Math.round(((x - OX - FW) / (W - OX - FW)) * 26 + Math.sin(x * 0.5) * 0.6);
    p.set(x, y, '#C8B8A8');
    p.set(x, y + 1, '#A89888');
  }
  p.rect(W - 4, baseY - 4, 3, 3, '#9AA0A8');
  p.set(W - 4, baseY - 4, '#C0C6CC');
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.4);
  return p;
}

// ---- LED digits (3×5) ----------------------------------------------------------------------

const DIG: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '..#', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
};

function drawLed(g: Gfx, x: number, y: number, text: string, on: string, ghost = true): void {
  let cx = x;
  for (const ch of text) {
    if (ch === ':') {
      g.px(cx, y + 1, on);
      g.px(cx, y + 3, on);
      cx += 2;
      continue;
    }
    const rows = DIG[ch] ?? DIG['8'];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 3; c++) {
        if (rows[r][c] === '#') g.px(cx + c, y + r, on);
        else if (ghost) g.px(cx + c, y + r, '#2A5A3A');
      }
    cx += 4;
  }
}

let restoredC: HTMLCanvasElement | null = null;
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(14, 22);
  p.rect(0, 0, 14, 22, RED);
  p.rect(0, 0, 2, 22, SIDE);
  p.rect(2, 1, 11, 3, '#F4F1E8');
  p.rect(3, 5, 9, 7, '#3A2B3A');
  for (let i = 0; i < 3; i++) p.rect(4 + i * 3, 6, 2, 5, '#E84E3C');
  p.rect(4, 15, 7, 3, '#1A1420');
  p.hline(4, 10, 15, '#3A3F48');
  p.outline(K.outline);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_ojigi_jihanki', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (angle: number, mouth: number, cracks: number, shiftRow: boolean) => {
    const key = `${angle}:${mouth}:${cracks}:${shiftRow}`;
    let c = cache.get(key);
    if (!c) {
      c = build(angle, { mouth, cracks, shiftRow, sunburn: true }).toCanvas();
      cache.set(key, c);
    }
    return c;
  };
  const angleOf = (v: EnemyView): number => {
    if (v.pose === 'charge' || v.flags.tame) return 60;
    if (v.pose === 'windup' && v.skill === 'skill_ojigi_charge') return v.t < 250 ? 30 : 60;
    if (v.pose === 'rise') return 0;
    if (v.pose === 'attack' && v.skill === 'skill_ojigi_press') return 90;
    if (v.pose === 'talk' || (v.pose === 'windup' && v.skill === 'skill_ojigi_arigatou')) return 30;
    return 0;
  };
  // 1px hum shiver variants
  const hum = new Map<string, HTMLCanvasElement>();
  const shifted = (key: string, src: HTMLCanvasElement, dx: number) => {
    if (!dx) return src;
    const k = key + ':' + dx;
    let c = hum.get(k);
    if (!c) {
      const [cv, ctx] = makeCanvas(src.width, src.height);
      ctx.drawImage(src, dx, 0);
      c = cv;
      hum.set(k, c);
    }
    return c;
  };
  return {
    id: 'enemy_ojigi_jihanki',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const cracks = v.hpRate <= 0.33 ? 2 : v.hpRate <= 0.66 ? 1 : 0;
      const angle = angleOf(v);
      let mouth = 0;
      if (v.pose === 'attack' && v.skill === 'skill_ojigi_otsuri') mouth = 1;
      if (v.pose === 'windup' && v.skill === 'skill_ojigi_otsuri') mouth = v.t > 200 ? 0.5 : 0;
      if (v.pose === 'talk' || v.pose === 'defeat') mouth = loop(v.t, 120, 2) ? 1 : 0.4;
      if (v.pose === 'idle' || v.pose === 'idleact') {
        // the flap twitches now and then
        const cyc = v.gt % 3400;
        if (cyc > 3000 && cyc < 3120) mouth = 0.2;
      }
      const hurt = v.pose === 'hurt';
      const mq = Math.round(mouth * 5) / 5;
      const c = get(angle, mq, cracks, hurt);
      const key = `${angle}:${mq}:${cracks}:${hurt}`;
      // compressor hum: 1px shiver every other idle frame; 溜め: constant shiver
      const f = loop(v.gt, 250, 4);
      if (angle === 60 && (v.flags.tame || v.pose === 'charge')) return shifted(key, c, loop(v.gt, 33, 2) ? 1 : -1);
      if ((v.pose === 'idle' || v.pose === 'idleact') && f % 2 === 1) return shifted(key, c, 1);
      return c;
    },
    over(g: Gfx, x: number, y: number, v: EnemyView): void {
      const angle = angleOf(v);
      if (angle > 30) return;
      const sc = angle === 0 ? 1 : 0.84;
      const baseY = y + OY + FH;
      const fh = Math.round(FH * sc);
      const ly = baseY - fh + Math.round(4 * sc);
      const lx = x + OX + 42;
      let text = '17:00';
      let col = '#7CFF9A';
      const r = v.params?.roulette ?? 0;
      if (v.skill === 'skill_ojigi_roulette' && (v.pose === 'windup' || v.pose === 'roulette') && !r) {
        const n = Math.floor(v.t / 33);
        text = [0, 1, 2, 3].map((i) => String(Math.floor(hash2(n, i, 7) * 10))).join('');
      } else if (r === 2) {
        text = '7777';
        col = Math.floor(v.t / 120) % 2 ? '#7CFF9A' : '#F4F1E8';
      } else if (r === 1) text = '7776';
      // occasional flicker (colon never blinks: time has stopped)
      if (r === 0 && v.gt % 4700 < 60) return;
      if (text.length === 4) drawLed(g, lx - 1, ly, text, col);
      else drawLed(g, lx, ly, text, col);
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'windup', skill: 'skill_ojigi_arigatou' },
      { pose: 'charge' },
      { pose: 'attack', skill: 'skill_ojigi_press' },
      { pose: 'attack', skill: 'skill_ojigi_otsuri' },
      { pose: 'hurt' },
    ],
  };
});
