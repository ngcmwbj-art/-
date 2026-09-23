// コーン・ボーカル (40×56): a traffic cone that thinks it's a megaphone —
// reflective stripes as sleepy eyes, a spinning beacon, rubber base (11.3).

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, ditherMask, rimLeft } from './lib';

const W = 52;
const H = 66;
const OX = 6;
const OY = 8;

const ORANGE = { rim: '#FFD0A0', hi: '#FFA25A', base: '#F07A2A', mid: '#DC6A22', shade: '#C85A1A', deep: '#9A4412' };
const WHITE = { hi: '#FFFFFF', base: '#F4F1E8', shade: '#C8C2B4', deep: '#A8A294' };

interface ConePose {
  /** Per-row horizontal shear at the top (px). */
  shear?: number;
  /** Lean back (singing). */
  lean?: number;
  mouth?: 'closed' | 'open' | 'wide';
  beacon?: number;
  sign?: boolean;
  squash?: number;
  shine?: number;
  eyes?: 'open' | 'x' | 'closed';
  fallen?: boolean;
}

function build(o: ConePose): PixelCanvas {
  if (o.fallen) return buildFallen();
  const p = new PixelCanvas(W, H);
  const X = (v: number) => v + OX;
  const Y = (v: number) => v + OY;
  const shear = (o.shear ?? 0) + (o.lean ?? 0);
  const top = 7 + (o.squash ?? 0);
  const bottom = 48;
  const cx = 20;
  // rubber base (36×8)
  for (let y = 48; y < 56; y++)
    for (let x = 2; x < 38; x++) {
      let c = y < 51 ? '#5A5A66' : '#3A3A44';
      if (y === 48) c = '#6E6E7A';
      if (x < 4) c = y < 51 ? '#7A7A86' : '#4A4A56';
      if (x > 35) c = '#2E2E38';
      if (hash2(x, y, 3) < 0.06) c = '#8A5A3A';
      p.set(X(x), Y(y), c);
    }
  // black tape patch on the base
  p.rect(X(26), Y(51), 6, 3, '#3A3F48');
  p.hline(X(26), X(31), Y(51), '#4A4F58');
  // the cone body, row by row (width 8 → 30)
  const rowShift = (y: number) => Math.round(shear * (1 - (y - top) / (bottom - top)));
  const stripe = (y: number) => (y >= 18 && y <= 24) || (y >= 30 && y <= 36);
  for (let y = top; y < bottom; y++) {
    const k = (y - top) / (bottom - top);
    const hw = 4 + 11 * k;
    const sx = rowShift(y);
    const x0 = Math.round(cx - hw) + sx;
    const x1 = Math.round(cx + hw) + sx;
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0); // 0 left → 1 right
      const white = stripe(y);
      let c: string;
      if (white) c = u < 0.12 ? WHITE.hi : u < 0.62 ? WHITE.base : u < 0.85 ? WHITE.shade : WHITE.deep;
      else c = u < 0.08 ? ORANGE.rim : u < 0.22 ? ORANGE.hi : u < 0.6 ? ORANGE.base : u < 0.8 ? ORANGE.mid : u < 0.93 ? ORANGE.shade : ORANGE.deep;
      // dither the band edges on the shaded side
      if (!white && u > 0.55 && u < 0.62 && ((x + y) & 1)) c = ORANGE.mid;
      if (!white && y > 38 && hash2(x, y, 9) < 0.05) c = '#8A5A3A';
      p.set(X(x), Y(y), c);
    }
    if (stripe(y) && (y === 18 || y === 30)) {
      // the stripe's top edge catches light
      for (let x = x0 + 1; x < x1 - 2; x++) if (x < x0 + (x1 - x0) * 0.6) p.set(X(x), Y(y), WHITE.hi);
    }
  }
  // slow diagonal gloss sliding over the white bands
  const sh = (o.shine ?? 0) % 40;
  for (let y = 18; y <= 36; y++) {
    if (!stripe(y)) continue;
    const gx = cx - 14 + sh - (y - 18) + rowShift(y);
    for (let d = 0; d < 2; d++) if (p.get(X(gx + d), Y(y)) >>> 24) p.set(X(gx + d), Y(y), '#FFFFFF');
  }
  // eyes on the upper band: thin 5×1 slits + a reflective glint below
  const ey = 21;
  const es = rowShift(ey);
  for (const ex of [cx - 7, cx + 3]) {
    if (o.eyes === 'x') {
      p.set(X(ex + 1 + es), Y(ey - 1), K.outline);
      p.set(X(ex + 2 + es), Y(ey), K.outline);
      p.set(X(ex + 3 + es), Y(ey - 1), K.outline);
      p.set(X(ex + 1 + es), Y(ey + 1), K.outline);
      p.set(X(ex + 3 + es), Y(ey + 1), K.outline);
    } else {
      p.hline(X(ex + es), X(ex + 4 + es), Y(ey), o.eyes === 'closed' ? '#6B6B78' : K.outline);
      if (o.eyes !== 'closed') p.hline(X(ex + 1 + es), X(ex + 3 + es), Y(ey + 1), '#5CE1FF');
    }
  }
  // mouth: the hole at the tip
  const mx = cx + rowShift(top);
  const mw = o.mouth === 'wide' ? 4 : o.mouth === 'open' ? 3 : 3;
  const mh = o.mouth === 'wide' ? 4 : o.mouth === 'open' ? 3 : 2;
  const mouth = new Mask(W, H).ellipse(X(mx), Y(top + 1), mw, mh / 2 + 0.3);
  mouth.each((x, y) => p.set(x, y, '#2A2440'));
  if (o.mouth !== 'closed') p.set(X(mx - 1), Y(top + 1), '#5A2A2A');
  // beacon on a little bracket above the tip
  const bx = mx;
  const byy = top - 7;
  p.rect(X(bx - 1), Y(byy + 5), 3, 3, '#3A3A44');
  const dome = new Mask(W, H).ellipse(X(bx), Y(byy + 3), 5, 3.8);
  dome.and(new Mask(W, H).rect(0, 0, W, Y(byy + 5)));
  const spin = (o.beacon ?? 0) % 3;
  dome.each((x, y) => {
    const u = (x - X(bx - 5)) / 10;
    let c = u < 0.3 ? '#FFE98A' : u < 0.75 ? '#FFD23F' : '#D9A441';
    const seg = Math.floor(u * 3);
    if (seg === spin) c = '#FFF6D8';
    p.set(x, y, c);
  });
  p.hline(X(bx - 5), X(bx + 5), Y(byy + 5), '#A8742A');
  // no-entry sign held up from behind
  if (o.sign) {
    const sx = X(34 + rowShift(20));
    const sy = Y(6);
    const disc = new Mask(W, H).ellipse(sx, sy + 7, 7, 7);
    disc.each((x, y) => p.set(x, y, x < sx - 3 ? '#FF6A4D' : '#E84E3C'));
    p.rect(sx - 5, sy + 6, 10, 3, '#F4F1E8');
    p.rect(sx - 1, sy + 14, 2, 10, '#9AA0A8');
  }
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.35);
  return p;
}

function buildFallen(): PixelCanvas {
  const p = new PixelCanvas(W, H);
  // lying on its side: a cone pointing left on the ground
  for (let x = 6; x < 46; x++) {
    const k = (x - 6) / 40;
    const hh = 4 + 10 * k;
    for (let y = Math.round(50 - hh); y <= Math.round(50 + Math.min(4, hh)); y++) {
      const v = (y - (50 - hh)) / (hh + 4);
      const white = (x > 18 && x < 24) || (x > 30 && x < 36);
      p.set(x, y, white ? (v < 0.3 ? '#FFFFFF' : v < 0.7 ? '#F4F1E8' : '#C8C2B4') : v < 0.25 ? '#FFA25A' : v < 0.65 ? '#F07A2A' : '#C85A1A');
    }
  }
  p.rect(46, 40, 5, 16, '#3A3A44');
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
      const shine = Math.floor(v.gt / 80) % 40;
      if (v.pose === 'hurt') return get('hurt', { squash: 2, eyes: 'x', beacon });
      if (v.pose === 'defeat') return get('fallen', { fallen: true });
      const sk = v.skill;
      if ((v.pose === 'windup' || v.pose === 'attack') && sk === 'skill_cone_nessho') {
        const f = loop(v.t, 110, 2);
        return get(`sing${f}${beacon}`, { lean: 3, mouth: f ? 'wide' : 'open', beacon, eyes: 'closed' });
      }
      if ((v.pose === 'windup' || v.pose === 'attack') && sk === 'skill_cone_tsukodome') return get(`sign${loop(v.t, 40, 3)}`, { sign: true, beacon: loop(v.t, 40, 3), mouth: 'open' });
      if (v.pose === 'windup' || v.pose === 'attack' || v.pose === 'idleact') return get(`hop${beacon}`, { mouth: 'open', beacon, shear: 1 });
      const f = loop(v.gt, 150, 4);
      const shear = [0, 1, 0, -1][f];
      return get(`idle${f}${beacon}${shine}`, { shear, beacon, shine });
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
      { pose: 'windup', skill: 'skill_cone_konkon' },
      { pose: 'hurt' },
      { pose: 'defeat' },
    ],
  };
});

void ditherMask;
void Mask;
