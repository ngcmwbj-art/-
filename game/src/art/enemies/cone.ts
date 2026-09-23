// コーン・ボーカル (40×56): a traffic cone that thinks it's a megaphone (11.3).
// Moulded orange plastic with a glossy vertical streak, scuffs, grit and a
// black tape repair; two retro-reflective bands (prism texture) whose upper
// one carries the sleepy slit eyes; the tip hole is its mouth; an amber
// beacon (fresnel lens, a bulb that goes round) on a black mount; a square
// rubber base with ribbed sides, corner holes and dried mud.

import type { Gfx } from '../../engine/gfx';
import { BAYER4, PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, rimLeft } from './lib';

const W = 52;
const H = 66;
const OX = 6;
const OY = 8;

/** Orange plastic, dark → light. */
const OR = ['#7E3410', '#9A4412', '#C85A1A', '#DC6A22', '#F07A2A', '#FF9A4E', '#FFB878', '#FFD0A0'];
/** Reflective sheeting, dark → light. */
const WH = ['#8E887C', '#A8A294', '#C8C2B4', '#E2DED2', '#F4F1E8', '#FFFFFF'];

interface ConePose {
  /** Per-row horizontal shear at the top (px). */
  shear?: number;
  /** Lean back (singing). */
  lean?: number;
  mouth?: 'closed' | 'open' | 'wide';
  beacon?: number;
  sign?: number;
  /** Squash: the tip is pushed down (px). */
  squash?: number;
  shine?: number;
  eyes?: 'open' | 'x' | 'closed' | 'wide';
  fallen?: boolean;
  /** Hop height (px, the whole cone lifts off the base shadow). */
  hop?: number;
}

const CX = 20;
const BOTTOM = 47;

function pick(ramp: string[], v: number, x: number, y: number): string {
  const t = (BAYER4[y & 3][x & 3] + 0.5) / 16 - 0.5;
  const i = Math.max(0, Math.min(ramp.length - 1, Math.floor(v * ramp.length + t * 0.38)));
  return ramp[i];
}

function build(o: ConePose): PixelCanvas {
  if (o.fallen) return buildFallen();
  const p = new PixelCanvas(W, H);
  const hop = o.hop ?? 0;
  const X = (v: number) => Math.round(v + OX);
  const Y = (v: number) => Math.round(v + OY - hop);
  const shear = (o.shear ?? 0) + (o.lean ?? 0);
  const top = 9 + (o.squash ?? 0);
  const rowShift = (y: number) => Math.round(shear * (1 - (y - top) / (BOTTOM - top)));
  const band = (y: number) => {
    const k = (y - top) / (BOTTOM - top);
    return (k >= 0.24 && k <= 0.4) || (k >= 0.56 && k <= 0.72);
  };
  const bandTop = (y: number) => band(y) && !band(y - 1);
  const bandBot = (y: number) => band(y) && !band(y + 1);

  // ---- rubber base (36×8): top face, ribbed front, corner holes, mud ----
  for (let y = BOTTOM; y < 56; y++) {
    const face = y < 50;
    const inset = face ? Math.round((50 - y) * 0.7) : 0;
    for (let x = 2 + inset; x < 38 - inset; x++) {
      const u = (x - 2) / 36;
      let c: string;
      if (face) c = u < 0.1 ? '#8A8A96' : u < 0.7 ? '#6E6E7A' : '#5A5A66';
      else c = u < 0.08 ? '#6A6A76' : u < 0.7 ? '#4A4A56' : '#34343E';
      if (!face && x % 3 === 0) c = u < 0.7 ? '#3A3A44' : '#2A2A34';
      if (!face && y === 50) c = '#7A7A86';
      if (y === 55) c = '#26262E';
      if (hash2(x, y, 3) < 0.07) c = '#8A5A3A';
      if (hash2(x, y, 5) < 0.03 && face) c = '#9A6A48';
      p.set(X(x), Y(y), c);
    }
  }
  // corner holes on the top face
  for (const hx of [5, 33]) {
    p.rect(X(hx), Y(BOTTOM + 1), 2, 1, '#26262E');
    p.set(X(hx), Y(BOTTOM + 2), '#3A3A44');
  }
  // the cone sits in the base's socket
  const shw = 15;
  p.hline(X(CX - shw - 1), X(CX + shw + 1), Y(BOTTOM), '#26262E');

  // ---- cone body, row by row (8 → 30 wide) ----
  for (let y = top; y < BOTTOM; y++) {
    const k = (y - top) / (BOTTOM - top);
    const hw = 4 + 11 * k;
    const sx = rowShift(y);
    const x0 = Math.round(CX - hw) + sx;
    const x1 = Math.round(CX + hw) + sx;
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0); // 0 left → 1 right
      const nx = u * 2 - 1;
      // cylinder light from the upper left, the cone tilts toward the light
      let lit = 0.58 - nx * 0.42 - nx * nx * 0.12;
      if (band(y)) {
        let c = pick(WH, Math.max(0, lit - 0.06), x, y);
        // retro-reflective prism texture
        if ((x + y * 2) % 5 === 0 && u > 0.1 && u < 0.8) c = u < 0.45 ? WH[5] : WH[3];
        if (bandTop(y) && u < 0.7) c = WH[5];
        if (bandBot(y)) c = u < 0.5 ? WH[2] : WH[1];
        p.set(X(x), Y(y), c);
        continue;
      }
      // glossy vertical streak (moulded plastic)
      if (Math.abs(u - 0.27) < 0.045) lit += 0.3;
      let c = pick(OR, lit, x, y);
      if (u < 0.05) c = OR[7];
      // scuffs, grit toward the bottom
      if (k > 0.78 && hash2(x, y, 9) < 0.05) c = '#8A5A3A';
      if (k > 0.5 && hash2(x >> 1, y, 13) < 0.025 && u > 0.2 && u < 0.7) c = OR[6];
      p.set(X(x), Y(y), c);
    }
  }
  // black tape repair, a diagonal strip low on the shaded side
  for (let i = 0; i < 7; i++) {
    const y = BOTTOM - 7 + Math.round(i * 0.4);
    const x = CX + 5 + i + rowShift(y);
    p.set(X(x), Y(y), '#3A3F48');
    p.set(X(x), Y(y + 1), '#2A2E36');
    if (i % 2 === 0) p.set(X(x), Y(y - 1), '#4A4F58');
  }
  // slow diagonal gloss sliding over the bands
  const sh = (o.shine ?? 0) % 44;
  for (let y = top; y < BOTTOM; y++) {
    if (!band(y) || bandBot(y)) continue;
    const gx = CX - 16 + sh - (y - top) * 0.6 + rowShift(y);
    for (let d = 0; d < 2; d++) if (p.alpha(X(gx + d), Y(y))) p.set(X(gx + d), Y(y), '#FFFFFF');
  }

  // ---- eyes on the upper band: 5×1 slits with a reflective glint ----
  let ey = top;
  while (ey < BOTTOM && !band(ey)) ey++;
  ey += 3;
  const es = rowShift(ey);
  for (const ex of [CX - 7, CX + 2]) {
    const x = X(ex + es);
    const y = Y(ey);
    if (o.eyes === 'x') {
      for (const [dx, dy] of [[0, -1], [1, 0], [2, 1], [2, -1], [0, 1]]) p.set(x + dx + 1, y + dy, K.outline);
    } else if (o.eyes === 'closed') {
      // happy singing arcs ^ ^
      p.set(x, y + 1, K.outline);
      p.hline(x + 1, x + 3, y, K.outline);
      p.set(x + 4, y + 1, K.outline);
    } else if (o.eyes === 'wide') {
      p.rect(x, y - 1, 5, 2, K.outline);
      p.set(x + 1, y - 1, '#FFFFFF');
      p.hline(x + 1, x + 3, y + 1, '#5CE1FF');
    } else {
      p.hline(x, x + 4, y, K.outline);
      p.hline(x + 1, x + 3, y + 1, '#5CE1FF');
    }
  }

  // ---- the tip hole = the mouth ----
  const mx = CX + rowShift(top);
  const mw = o.mouth === 'wide' ? 4.6 : o.mouth === 'open' ? 3.6 : 3;
  const mh = o.mouth === 'wide' ? 2.6 : o.mouth === 'open' ? 1.8 : 1.1;
  for (let y = -3; y <= 3; y++)
    for (let x = -5; x <= 5; x++) {
      if ((x * x) / (mw * mw) + (y * y) / (mh * mh) > 1) continue;
      const inner = o.mouth !== 'closed' && y > -mh + 1;
      p.set(X(mx + x), Y(top + 1 + y), inner ? (y > 0 ? '#7A2A2A' : '#4A1A22') : '#2A2440');
    }
  // the lip of the tip catches the light
  p.set(X(mx - Math.round(mw)), Y(top), OR[7]);

  // ---- beacon: black mount + amber fresnel dome, the bulb goes round ----
  const bx = mx;
  const byy = top - 9;
  p.rect(X(bx - 3), Y(byy + 7), 7, 2, '#3A3A44');
  p.hline(X(bx - 3), X(bx + 3), Y(byy + 7), '#5A5A66');
  p.set(X(bx + 2), Y(byy + 8), '#8A8A96');
  const spin = (o.beacon ?? 0) % 3;
  // translucent amber glass: dark rim, warm fill, the bulb inside goes round
  for (let y = 0; y < 7; y++)
    for (let x = -5; x <= 5; x++) {
      const dy = (6.5 - y) / 7;
      const d = (x * x) / 25 + dy * dy;
      if (d > 1) continue;
      let c = d > 0.62 ? (x < 0 ? '#E8B030' : '#C8902A') : x < -1 ? '#FFE98A' : '#FFD23F';
      p.set(X(bx + x), Y(byy + y), c);
    }
  const bulbX = [-3, 0, 3][spin];
  p.rect(X(bx + bulbX - 1), Y(byy + 2), 3, 3, '#FFF6D8');
  p.set(X(bx + bulbX), Y(byy + 3), '#FFFFFF');
  // glass reflection
  p.set(X(bx - 3), Y(byy + 1), '#FFFFFF');
  p.set(X(bx - 2), Y(byy + 1), '#FFFFFF');
  p.set(X(bx - 4), Y(byy + 2), '#FFF6D8');
  // when the bulb faces us the lamp flashes: short rays
  if (spin === 1) {
    for (const [dx, dy] of [[-8, 1], [-7, -2], [8, 1], [7, -2], [0, -3]] as [number, number][]) p.set(X(bx + dx), Y(byy + 3 + dy), '#FFE98A');
    p.set(X(bx - 9), Y(byy + 4), '#FFF6D8');
    p.set(X(bx + 9), Y(byy + 4), '#FFF6D8');
  }

  // ---- no-entry sign held up from behind (tsukodome) ----
  if (o.sign !== undefined) {
    const wob = [0, 1, 0, -1][o.sign % 4];
    const sx = X(35 + rowShift(20) + wob);
    const sy = Y(4);
    p.rect(sx - 1, sy + 14, 2, 18, '#9AA0A8');
    p.vline(sx - 1, sy + 14, sy + 31, '#C8CDD4');
    for (let y = -7; y <= 7; y++)
      for (let x = -7; x <= 7; x++) {
        const d = x * x + y * y;
        if (d > 49) continue;
        let c = x < -2 ? '#FF6A4D' : '#E84E3C';
        if (d > 36) c = '#B8241E';
        p.set(sx + x, sy + 7 + y, c);
      }
    p.rect(sx - 5, sy + 6, 11, 3, '#F4F1E8');
    p.hline(sx - 5, sx + 5, sy + 8, '#C8C2B4');
  }
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.3);
  return p;
}

function buildFallen(): PixelCanvas {
  const p = new PixelCanvas(W, H);
  // rolled onto its side: tip to the left, base standing up on the right
  for (let x = 6; x < 44; x++) {
    const k = (x - 6) / 38;
    const hh = 4 + 10 * k;
    for (let y = Math.round(50 - hh); y <= Math.round(50 + Math.min(4, hh * 0.4)); y++) {
      const v = (y - (50 - hh)) / (hh + 4);
      const white = (k >= 0.24 && k <= 0.4) || (k >= 0.56 && k <= 0.72);
      p.set(x, y, white ? (v < 0.3 ? '#FFFFFF' : v < 0.7 ? '#F4F1E8' : '#C8C2B4') : v < 0.2 ? '#FFB878' : v < 0.55 ? '#F07A2A' : v < 0.8 ? '#C85A1A' : '#9A4412');
    }
  }
  p.rect(44, 34, 6, 22, '#4A4A56');
  p.vline(44, 34, 55, '#6E6E7A');
  p.outline(K.outline);
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(12, 16);
  for (let y = 1; y < 13; y++) {
    const hw = 1 + (y / 12) * 4;
    for (let x = Math.round(6 - hw); x <= Math.round(6 + hw); x++) {
      const white = y === 5 || y === 6 || y === 9 || y === 10;
      p.set(x, y, white ? (x < 6 ? '#FFFFFF' : '#C8C2B4') : x < 5 ? '#FFA25A' : x < 8 ? '#F07A2A' : '#C85A1A');
    }
  }
  p.rect(0, 13, 12, 3, '#3A3A44');
  p.hline(0, 11, 13, '#5A5A66');
  p.outline(K.outline);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_cone_vocal', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (key: string, o: ConePose) => {
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
    }
    return c;
  };
  return {
    id: 'enemy_cone_vocal',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const beacon = loop(v.gt, 120, 3);
      const shine = Math.floor(v.gt / 80) % 44;
      if (v.pose === 'hurt') {
        // squashed down, then the rubbery wobble back up
        const f = Math.min(3, Math.floor(v.t / 60));
        return get(`hurt${f}`, { squash: [4, 2, 3, 1][f], shear: [0, 2, -2, 1][f], eyes: 'x', beacon });
      }
      if (v.pose === 'defeat') return get('fallen', { fallen: true });
      const sk = v.skill;
      if ((v.pose === 'windup' || v.pose === 'attack') && sk === 'skill_cone_nessho') {
        // throws its head back and belts it out
        const f = loop(v.t, 110, 2);
        return get(`sing${f}${beacon}`, { lean: v.pose === 'attack' ? 4 : 3, mouth: f ? 'wide' : 'open', beacon, eyes: 'closed', shine });
      }
      if ((v.pose === 'windup' || v.pose === 'attack') && sk === 'skill_cone_tsukodome') {
        const f = loop(v.t, 40, 4);
        return get(`sign${f}${loop(v.t, 40, 3)}`, { sign: f, beacon: loop(v.t, 40, 3), mouth: 'open', eyes: 'wide' });
      }
      if (v.pose === 'windup' || v.pose === 'attack' || v.pose === 'idleact') {
        // コーン・コン: two hops on the base (3px × 2)
        const t = v.t % 400;
        const hop = t < 200 ? Math.round(Math.sin((t / 200) * Math.PI) * 3) : Math.round(Math.sin(((t - 200) / 200) * Math.PI) * 3);
        return get(`hop${hop}${beacon}`, { mouth: 'open', beacon, hop, eyes: 'wide' });
      }
      const f = loop(v.gt, 150, 4);
      const shear = [0, 1, 0, -1][f];
      return get(`idle${f}${beacon}${shine}`, { shear, beacon, shine, mouth: f === 1 ? 'open' : 'closed' });
    },
    over(g: Gfx, x: number, y: number, v: EnemyView): void {
      // beacon light fan while acting
      if (v.pose !== 'windup' && v.pose !== 'attack') return;
      const bx = x + OX + 20;
      const by = y + OY + 3;
      const a = (v.t / 1000) * Math.PI * 2 * (v.skill === 'skill_cone_tsukodome' ? 2 : 1);
      g.alpha(0.35, () => {
        const ctx = g.ctx;
        ctx.fillStyle = '#FFE7A3';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.arc(bx, by, 60, a - 0.7, a + 0.7);
        ctx.closePath();
        ctx.fill();
      });
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'windup', skill: 'skill_cone_nessho' },
      { pose: 'windup', skill: 'skill_cone_tsukodome' },
      { pose: 'windup', skill: 'skill_cone_konkon', t: 100 },
      { pose: 'hurt', t: 0 },
      { pose: 'hurt', t: 130 },
      { pose: 'defeat' },
    ],
  };
});
