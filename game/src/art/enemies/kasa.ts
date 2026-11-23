// ワスレガサ (48×72): a forgotten clear vinyl umbrella hopping on its tip,
// hooked handle bowed like a head, a "？" name sticker for a face (11.4).
// The canopy is drawn translucent so the background shows through.

import { PixelCanvas } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, rimLeft } from './lib';

const W = 60;
const H = 84;
const OX = 6;
const OY = 8;

const FILM = '#CFE3EA99';
const FILM_L = '#E4F2F6AA';
const FILM_D = '#A9C6D299';
const FOLD = '#9AB8C4CC';
const RIB = '#9AA3AD';
const RIB_D = '#6B7186';
const SHAFT = '#C0C6CC';
const SHAFT_D = '#9AA0A8';
const HANDLE = ['#2A1E18', '#3A2B24', '#5A4032', '#6A4B3A'];

interface KasaPose {
  lean?: number;
  squash?: number;
  lift?: number;
  band?: number;
  open?: boolean;
  hug?: boolean;
  wrinkle?: boolean;
  neat?: boolean;
  burst?: boolean;
  tilt?: number;
}

function handleJ(p: PixelCanvas, x: number, y: number, flip: boolean): void {
  // J hook: goes up from (x, y), arcs over and down to the left — 3px thick
  // brown plastic, lit along the top of the curve, dark underneath
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI * (i / 24);
    pts.push([x - 5 + Math.cos(a) * 5 * (flip ? -1 : 1), y - Math.sin(a) * 6]);
  }
  for (const [px, py] of pts) {
    const X0 = Math.round(px);
    const Y0 = Math.round(py);
    p.set(X0, Y0, HANDLE[1]);
    p.set(X0, Y0 + 1, HANDLE[1]);
    p.set(X0 + 1, Y0 + 1, HANDLE[0]);
    p.set(X0 + 1, Y0, HANDLE[0]);
  }
  for (const [px, py] of pts.slice(3, 15)) p.set(Math.round(px), Math.round(py), HANDLE[3]);
  for (const [px, py] of pts.slice(6, 11)) p.set(Math.round(px), Math.round(py) - 1, '#8A6A54');
  // hook tip with a worn end cap
  const [tx, ty] = pts[pts.length - 1];
  p.rect(Math.round(tx) - 1, Math.round(ty), 3, 3, HANDLE[1]);
  p.set(Math.round(tx) - 1, Math.round(ty) + 2, HANDLE[2]);
  p.set(Math.round(tx), Math.round(ty) + 3, HANDLE[0]);
}

function build(o: KasaPose): PixelCanvas {
  if (o.open) return buildOpen(o);
  const p = new PixelCanvas(W, H);
  const X = (v: number) => Math.round(v + OX);
  const Y = (v: number) => Math.round(v + OY);
  const lift = o.lift ?? 0;
  const sq = o.squash ?? 0;
  const lean = o.lean ?? 0;
  const tipY = 71 - lift;
  const topY = 20 - lift + sq;
  const cx = 24;
  const shift = (y: number) => Math.round(lean * (1 - (y - topY + 20) / (tipY - topY + 20)));
  // half-width of the loosely furled canopy (widest a third of the way down)
  const hw = (y: number) => {
    const k = (y - topY) / (tipY - 5 - topY);
    if (k < 0 || k > 1) return -1;
    const base = o.neat ? 7 : 12;
    const bulge = Math.sin(Math.min(1, k * 1.12) * Math.PI * 0.94);
    return Math.max(1, base * bulge + (o.hug ? 7 * Math.sin(k * Math.PI) : 0) + (o.neat ? 0 : Math.sin(y * 0.7) * 0.6));
  };
  // shaft seen through the film
  for (let y = 6 - lift + sq; y <= tipY; y++) {
    p.set(X(cx + shift(y)), Y(y), SHAFT);
    p.set(X(cx + 1 + shift(y)), Y(y), SHAFT_D);
  }
  // ---- the vinyl film: pleats (crease + lit edge), ribs showing through ----
  const folds = o.neat ? [-0.5, 0, 0.5] : [-0.62, -0.18, 0.3, 0.72];
  for (let y = topY; y <= tipY - 5; y++) {
    const w = hw(y);
    if (w < 0) continue;
    const sx = shift(y);
    const k = (y - topY) / (tipY - 5 - topY);
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const u = (x - cx) / Math.max(1, w); // −1 left … 1 right
      let c = u < -0.55 ? FILM_L : u < 0.4 ? FILM : FILM_D;
      for (const f of folds) {
        const d = u - f;
        if (Math.abs(d) < 0.5 / Math.max(2, w)) c = FOLD;
        else if (d > 0 && d < 1.3 / Math.max(2, w) && u < 0.6) c = '#EAF6FACC';
      }
      // ribs under the film, converging on the tip
      for (const r of [-0.4, 0.08, 0.52]) if (Math.abs(u - r * (1 - k * 0.3)) < 0.45 / Math.max(2, w) && c === FILM) c = '#B4C6D0B8';
      p.set(X(x + sx), Y(y), c);
    }
    // two crisp vertical highlights on the lit side
    if (y > topY + 4 && y < tipY - 10) {
      p.set(X(Math.round(cx - w * 0.72) + sx), Y(y), '#FFFFFF');
      if (y % 4 !== 0) p.set(X(Math.round(cx - w * 0.46) + sx), Y(y), '#FFFFFFD0');
    }
  }
  // raindrops still clinging to the film
  if (!o.neat)
    for (const [dx, dy] of [[-6, 12], [5, 20], [-2, 31], [7, 36], [-8, 26]] as [number, number][]) {
      const y = topY + dy;
      const w = hw(y);
      if (w < 0 || Math.abs(dx) > w - 1) continue;
      p.set(X(cx + dx + shift(y)), Y(y), '#FFFFFF');
      p.set(X(cx + dx + shift(y)), Y(y + 1), '#8FB0BEE0');
    }
  // hem: the gathered edge, the rib tips (little dark caps) peeking out
  for (let i = 0; i < 5; i++) {
    const x = Math.round(cx - 6 + i * 3) + shift(topY);
    p.set(X(x), Y(topY - 1), '#3A3F48');
    p.set(X(x + 1), Y(topY), '#E4F2F6AA');
  }
  // the broken rib pokes out in two joints, a flap of film torn with it
  if (!o.neat) {
    const by = topY + 15;
    const bx = cx + Math.round(hw(by)) + shift(by);
    p.line(X(bx - 2), Y(by), X(bx + 4), Y(by + 3), RIB);
    p.line(X(bx + 4), Y(by + 3), X(bx + 8), Y(by), RIB);
    p.set(X(bx + 4), Y(by + 4), RIB_D);
    p.set(X(bx + 8), Y(by + 1), RIB_D);
    p.set(X(bx + 9), Y(by - 1), '#3A3F48');
    p.set(X(bx + 1), Y(by + 3), '#E4F2F6AA');
    p.set(X(bx + 2), Y(by + 4), '#CFE3EA99');
  }
  // ---- the strap: semi-opaque white band, a snap, the loose end flutters ----
  const sy = topY + 21;
  const sw = Math.round(hw(sy));
  for (let x = cx - sw; x <= cx + sw; x++) {
    p.set(X(x + shift(sy)), Y(sy), '#F4F1E8D8');
    p.set(X(x + shift(sy)), Y(sy + 1), '#DCD8CCD0');
  }
  p.rect(X(cx + sw - 3 + shift(sy)), Y(sy), 2, 2, '#C0C6CC');
  p.set(X(cx + sw - 3 + shift(sy)), Y(sy), '#FFFFFF');
  if (!o.neat) {
    const flap = o.band ?? 0;
    for (let i = 0; i < 7; i++) {
      const yy = sy + Math.round(Math.sin(i * 0.9 + flap) * 1.6);
      p.set(X(cx + sw + 1 + i + shift(sy)), Y(yy), '#F4F1E8D8');
      if (i < 6) p.set(X(cx + sw + 1 + i + shift(sy)), Y(yy + 1), '#DCD8CCC0');
    }
  } else p.set(X(cx + sw - 1 + shift(sy)), Y(sy + 1), '#C0C6CC');
  // ferrule tip (metal)
  p.rect(X(cx + shift(tipY)), Y(tipY - 4), 2, 5, '#4A4F58');
  p.set(X(cx + shift(tipY)), Y(tipY - 4), '#9AA0A8');
  p.set(X(cx + shift(tipY)), Y(tipY - 3), '#C0C6CC');
  // ---- J handle on top, bowed forward like a head ----
  const hy = 7 - lift + sq;
  const hx = X(cx + 1 + shift(hy) + (o.tilt ?? 0));
  handleJ(p, hx, Y(hy), false);
  // the name sticker (the face): white with a red "？", a little curled
  const nx = X(cx - 9 + shift(hy) + (o.tilt ?? 0));
  const ny = Y(hy - 2);
  p.rect(nx, ny, 7, 6, '#F4F1E8');
  p.hline(nx, nx + 6, ny + 5, '#C8C2B4');
  p.set(nx + 6, ny, '#C8C2B4');
  for (const [dx, dy] of [[2, 1], [3, 1], [4, 2], [3, 3], [3, 4]] as [number, number][]) p.set(nx + dx, ny + dy, '#E23B2E');
  p.set(nx + 1, ny + 1, '#FFFFFF');
  if (o.wrinkle) for (let i = 0; i < 4; i++) p.line(X(cx - 6 + i * 3), Y(topY + 10 + i * 5), X(cx - 2 + i * 3), Y(topY + 13 + i * 5), '#FFFFFF');
  if (o.burst) for (let i = 0; i < 8; i++) p.line(X(cx), Y(topY + 20), X(cx + Math.round(Math.cos(i * 0.8) * 16)), Y(topY + 20 + Math.round(Math.sin(i * 0.8) * 16)), '#FFFFFF');
  p.outline('#4A5A66');
  rimLeft(p, K.rim, 0.3);
  return p;
}

/**
 * Opened (晴れてるのにひらく): a 48×28 dome of 8 vinyl panels (alternately
 * lit), ribs running to little tip caps, a scalloped hem beaded with
 * water, one panel dented where the rib broke; the shaft runs down to the
 * J handle (and the "？" face) at the bottom.
 */
function buildOpen(o: KasaPose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => Math.round(v + OX);
  const Y = (v: number) => Math.round(v + OY);
  const lift = o.lift ?? 0;
  const cx = 24;
  const top = 16 - lift;
  const rim = 44 - lift;
  const hgt = rim - top;
  // shaft and handle first (behind the rim)
  for (let y = rim - 4; y < 64 - lift; y++) {
    p.set(X(cx), Y(y), SHAFT);
    p.set(X(cx + 1), Y(y), SHAFT_D);
  }
  const hy = 70 - lift;
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI;
    const x = cx - 3 + Math.cos(a) * 4;
    const y = hy - 6 + Math.sin(a) * 5;
    p.set(X(x), Y(y), HANDLE[1]);
    p.set(X(x), Y(y) + 1, HANDLE[0]);
    p.set(X(x) + 1, Y(y) + 1, HANDLE[0]);
    if (i > 4 && i < 12) p.set(X(x), Y(y), HANDLE[3]);
  }
  p.rect(X(cx), Y(63 - lift), 2, 3, HANDLE[1]);
  const nx = X(cx - 11);
  const ny = Y(hy - 7);
  p.rect(nx, ny, 6, 5, '#F4F1E8');
  p.hline(nx, nx + 5, ny + 4, '#C8C2B4');
  for (const [dx, dy] of [[2, 1], [3, 1], [3, 2], [2, 3]] as [number, number][]) p.set(nx + dx, ny + dy, '#E23B2E');
  // the dome: 8 panels between meridians (rib i reaches the rim at azimuth iπ/8)
  const meridian = (x: number, y: number) => {
    const k = Math.max(0.001, Math.min(1, (y - top) / hgt));
    const sn = Math.sin(Math.acos(1 - k));
    const c = Math.max(-1, Math.min(1, -(x - cx) / (24 * Math.max(0.05, sn))));
    return Math.acos(c) / Math.PI; // 0 left edge … 1 right edge
  };
  for (let y = top; y <= rim + 2; y++) {
    const k = Math.min(1, (y - top) / hgt);
    const w = 24 * Math.sqrt(Math.max(0, 1 - (1 - k) * (1 - k)));
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const m = meridian(x, y) * 8;
      const pi = Math.min(7, Math.floor(m));
      const u = m - Math.floor(m);
      // scalloped hem: each panel's edge sags between two rib tips
      const edge = rim - 2 + Math.round(Math.sin(u * Math.PI) * 2.5);
      if (y > edge) continue;
      const lit = (x - cx) / 24;
      let c = pi % 2 === 0 ? (lit < -0.3 ? '#E8F4F8B0' : lit < 0.3 ? '#D4E8EEA8' : '#BCD6E0A8') : lit < -0.3 ? '#D0E4EBA8' : lit < 0.3 ? '#BAD4DEA8' : '#A4C2CEA8';
      if (pi === 5) c = '#9EBCC8B0'; // the dented panel
      if (y === edge) c = '#EAF6FAC8';
      p.set(X(x), Y(y), c);
    }
  }
  // dent crease on the broken panel
  for (let i = 0; i < 7; i++) p.set(X(cx + 8 + i), Y(top + 13 + Math.round(i * 0.9)), '#7E9EAC');
  // ribs along the meridians to their tip caps (the broken one sags)
  for (let i = 0; i <= 8; i++) {
    const phi = (i / 8) * Math.PI;
    let lastX = cx;
    let lastY = top;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const sa = Math.sin((t * Math.PI) / 2);
      const x = cx - 24 * Math.cos(phi) * sa;
      const bend = i === 5 && t > 0.6 ? (t - 0.6) * 5 : 0;
      const y = top + hgt * (1 - Math.cos((t * Math.PI) / 2)) + bend;
      p.set(X(x), Y(y), i === 5 && t > 0.6 ? RIB_D : RIB);
      lastX = x;
      lastY = y;
    }
    // tip cap + a hanging droplet
    p.set(X(lastX), Y(lastY + 1), '#3A3F48');
    if (i % 2 === 1) {
      p.set(X(lastX), Y(lastY + 3), '#FFFFFF');
      p.set(X(lastX), Y(lastY + 4), '#8FB0BE');
    }
  }
  // highlights on the lit panels, beads of water
  for (let y = top + 4; y < rim - 6; y++) {
    const k = (y - top) / hgt;
    const w = 24 * Math.sqrt(Math.max(0, 1 - (1 - k) * (1 - k)));
    if (y % 3 !== 0) p.set(X(cx - w * 0.62), Y(y), '#FFFFFF');
  }
  for (const [dx, dy] of [[-12, 14], [5, 9], [-4, 20], [14, 18], [-18, 24]] as [number, number][]) p.set(X(cx + dx), Y(top + dy), '#FFFFFF');
  // the finial on top
  p.rect(X(cx - 1), Y(top - 4), 2, 3, '#4A4F58');
  p.set(X(cx - 1), Y(top - 4), '#9AA0A8');
  p.outline('#4A5A66');
  rimLeft(p, K.rim, 0.3);
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(10, 20);
  for (let y = 4; y < 17; y++) {
    const w = 2.5 * Math.sin(((y - 4) / 13) * Math.PI);
    for (let x = Math.round(5 - w); x <= Math.round(5 + w); x++) p.set(x, y, x < 5 ? '#E4F2F6' : '#B9D2DC');
  }
  p.vline(5, 1, 18, '#C0C6CC');
  p.set(4, 0, '#3A2B24');
  p.set(3, 1, '#3A2B24');
  p.set(3, 2, '#3A2B24');
  p.hline(3, 7, 10, '#F4F1E8');
  p.outline('#4A5A66');
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_wasuregasa', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (key: string, o: KasaPose) => {
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
    }
    return c;
  };
  const HOP: KasaPose[] = [
    { squash: 2, lift: 0 },
    { squash: 0, lift: 1 },
    { squash: -1, lift: 4 },
    { squash: 0, lift: 1 },
  ];
  return {
    id: 'enemy_wasuregasa',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const band = loop(v.gt, 130, 4);
      const opened = !!v.flags.hiraki || v.pose === 'open';
      if (v.pose === 'hurt') return opened ? get('ohurt', { open: true }) : get('hurt', { wrinkle: true, squash: 1 });
      if (v.pose === 'defeat') return get('neat', { neat: true });
      if (v.skill === 'skill_kasa_hiraku' && (v.pose === 'windup' || v.pose === 'attack')) {
        if (v.pose === 'attack') return get('burst', { burst: true });
        return get(`hop${loop(v.t, 90, 4)}`, { ...HOP[loop(v.t, 90, 4)], band });
      }
      if (v.skill === 'skill_kasa_dakitsuki') {
        if (v.pose === 'attack') return get('hug', { hug: true, lean: -3 });
        return get('lean', { lean: -4, tilt: -1, band });
      }
      if (opened) {
        const f = loop(v.gt, 130, 4);
        return get(`open${f}`, { open: true, lift: [0, 1, 3, 1][f] });
      }
      const f = loop(v.gt, 130, 4);
      return get(`idle${f}${band}`, { ...HOP[f], band, tilt: f === 2 ? 1 : 0 });
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'windup', skill: 'skill_kasa_dakitsuki' },
      { pose: 'attack', skill: 'skill_kasa_dakitsuki' },
      { pose: 'attack', skill: 'skill_kasa_hiraku' },
      { pose: 'open' },
      { pose: 'hurt' },
      { pose: 'defeat' },
    ],
  };
});
