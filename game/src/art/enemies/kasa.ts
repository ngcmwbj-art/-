// ワスレガサ (48×72): a forgotten clear vinyl umbrella hopping on its tip,
// hooked handle bowed like a head, a "？" name sticker for a face (11.4).
// The canopy is drawn translucent so the background shows through.

import { PixelCanvas } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, rimLeft } from './lib';

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
  // J hook: goes up from (x, y), arcs over and down to the left
  const pts: [number, number][] = [];
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI * (i / 20);
    pts.push([x - 5 + Math.cos(a) * 5 * (flip ? -1 : 1), y - Math.sin(a) * 6]);
  }
  for (const [px, py] of pts) {
    p.set(Math.round(px), Math.round(py), HANDLE[1]);
    p.set(Math.round(px), Math.round(py) + 1, HANDLE[1]);
    p.set(Math.round(px) + 1, Math.round(py), HANDLE[0]);
  }
  for (const [px, py] of pts.slice(2, 12)) p.set(Math.round(px), Math.round(py), HANDLE[3]);
  // hook tip
  const [tx, ty] = pts[pts.length - 1];
  p.rect(Math.round(tx) - 1, Math.round(ty), 2, 3, HANDLE[1]);
  p.set(Math.round(tx) - 1, Math.round(ty) + 2, HANDLE[2]);
}

function build(o: KasaPose): PixelCanvas {
  if (o.open) return buildOpen(o);
  const p = new PixelCanvas(W, H);
  const X = (v: number) => v + OX;
  const Y = (v: number) => v + OY;
  const lift = o.lift ?? 0;
  const sq = o.squash ?? 0;
  const lean = o.lean ?? 0;
  const tipY = 71 - lift;
  const topY = 21 - lift + sq;
  const cx = 24;
  const shift = (y: number) => Math.round(lean * (1 - (y - topY + 20) / (tipY - topY + 20)));
  // shaft (visible through the film)
  for (let y = 6 - lift + sq; y <= tipY; y++) {
    p.set(X(cx + shift(y)), Y(y), SHAFT);
    p.set(X(cx + 1 + shift(y)), Y(y), SHAFT_D);
  }
  // closed canopy: spindle from topY to tipY
  const hw = (y: number) => {
    const k = (y - topY) / (tipY - 4 - topY);
    if (k < 0 || k > 1) return -1;
    const base = o.neat ? 8 : 12;
    return Math.max(1, base * Math.sin(Math.min(1, k * 1.15) * Math.PI * 0.95) + (o.hug ? 6 * Math.sin(k * Math.PI) : 0));
  };
  for (let y = topY; y <= tipY - 4; y++) {
    const w = hw(y);
    if (w < 0) continue;
    const sx = shift(y);
    for (let x = Math.round(cx - w); x <= Math.round(cx + w + (o.neat ? 0 : Math.sin(y * 0.4))); x++) {
      const u = (x - (cx - w)) / (2 * w);
      let c = u < 0.2 ? FILM_L : u < 0.7 ? FILM : FILM_D;
      // folds
      if (!o.neat && Math.abs(Math.sin((x - cx) * 0.9 + y * 0.05)) < 0.12) c = FOLD;
      p.set(X(x + sx), Y(y), c);
    }
    // left vertical highlights (2 lines)
    if (y > topY + 3 && y < tipY - 8) {
      p.set(X(Math.round(cx - w * 0.55) + sx), Y(y), '#FFFFFF');
      if (y % 3 !== 0) p.set(X(Math.round(cx - w * 0.3) + sx), Y(y), '#FFFFFFCC');
    }
  }
  // rib tips peeking at the gathered end
  for (let i = 0; i < 6; i++) {
    const x = cx - 6 + i * 2.4;
    p.set(X(Math.round(x) + shift(topY)), Y(topY - 1), RIB);
    p.set(X(Math.round(x) + shift(topY)), Y(topY), RIB_D);
  }
  // the broken rib pokes out in two segments
  if (!o.neat) {
    const by = topY + 14;
    const bx = cx + Math.round(hw(by)) + shift(by);
    p.line(X(bx - 2), Y(by), X(bx + 4), Y(by + 3), RIB);
    p.line(X(bx + 4), Y(by + 3), X(bx + 7), Y(by + 1), RIB);
    p.set(X(bx + 4), Y(by + 4), RIB_D);
    p.set(X(bx + 7), Y(by + 2), RIB_D);
  }
  // strap around the middle (flutters)
  const sy = topY + 20;
  const sw = Math.round(hw(sy));
  for (let x = cx - sw; x <= cx + sw; x++) {
    p.set(X(x + shift(sy)), Y(sy), '#F4F1E8CC');
    p.set(X(x + shift(sy)), Y(sy + 1), '#E0DDD4CC');
  }
  p.set(X(cx + sw - 2 + shift(sy)), Y(sy), '#C0C6CC');
  if (!o.neat) {
    const flap = o.band ?? 0;
    for (let i = 0; i < 6; i++) p.set(X(cx + sw + 1 + i + shift(sy)), Y(sy + Math.round(Math.sin(i * 0.9 + flap) * 1.5)), '#F4F1E8CC');
  } else p.set(X(cx + sw - 1 + shift(sy)), Y(sy + 1), '#C0C6CC');
  // ferrule tip
  p.rect(X(cx + shift(tipY)), Y(tipY - 3), 2, 4, '#3A3F48');
  p.set(X(cx + shift(tipY)), Y(tipY - 3), '#6B7186');
  // J handle on top, bowed forward like a head
  const hy = 7 - lift + sq;
  handleJ(p, X(cx + 1 + shift(hy) + (o.tilt ?? 0)), Y(hy), false);
  // name sticker "？" (the face)
  const nx = X(cx - 8 + shift(hy) + (o.tilt ?? 0));
  const ny = Y(hy - 2);
  p.rect(nx, ny, 6, 5, '#F4F1E8');
  p.hline(nx, nx + 5, ny + 4, '#C8C2B4');
  p.set(nx + 2, ny + 1, '#E23B2E');
  p.set(nx + 3, ny + 1, '#E23B2E');
  p.set(nx + 3, ny + 2, '#E23B2E');
  p.set(nx + 2, ny + 3, '#E23B2E');
  if (o.wrinkle) for (let i = 0; i < 4; i++) p.line(X(cx - 6 + i * 3), Y(topY + 10 + i * 5), X(cx - 2 + i * 3), Y(topY + 13 + i * 5), '#FFFFFF');
  if (o.burst) for (let i = 0; i < 8; i++) p.line(X(cx), Y(topY + 20), X(cx + Math.round(Math.cos(i * 0.8) * 16)), Y(topY + 20 + Math.round(Math.sin(i * 0.8) * 16)), '#FFFFFF');
  p.outline('#4A5A66');
  // outer ink outline only around the solid parts (handle, ferrule)
  const m = Mask.fromCanvas(p);
  void m;
  rimLeft(p, K.rim, 0.3);
  return p;
}

/** Opened (晴れてるのにひらく): 48×28 dome, 8 panels, radial ribs, scalloped rim. */
function buildOpen(o: KasaPose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (v: number) => v + OX;
  const Y = (v: number) => v + OY;
  const lift = o.lift ?? 0;
  const cx = 24;
  const top = 18 - lift;
  const rim = 44 - lift;
  // dome
  for (let y = top; y <= rim + 2; y++) {
    const k = Math.min(1, (y - top) / (rim - top));
    const w = 24 * Math.sqrt(Math.max(0, 1 - (1 - k) * (1 - k)));
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const ang = Math.atan2(y - rim, x - cx);
      const seg = ((ang + Math.PI) / Math.PI) * 8;
      const u = seg - Math.floor(seg);
      // scalloped rim: each panel dips between ribs
      const dip = y > rim - 2 + Math.round(Math.sin(u * Math.PI) * 2.5);
      if (dip && y > rim - 3) continue;
      let c = x < cx - w * 0.4 ? FILM_L : x < cx + w * 0.3 ? FILM : FILM_D;
      if (Math.floor(seg) === 5 && y > top + 8) c = FILM_D; // the dented panel
      p.set(X(x), Y(y), c);
    }
  }
  // radial ribs
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    for (let r = 2; r < 25; r++) {
      const x = cx + Math.cos(a) * r;
      const y = rim + Math.sin(a) * r * ((rim - top) / 24);
      p.set(X(Math.round(x)), Y(Math.round(y)), i === 5 && r > 12 ? RIB_D : RIB);
    }
    // droplet on the rim tip
    const tx = cx + Math.cos(a) * 24;
    const ty = rim + Math.sin(a) * (rim - top);
    p.set(X(Math.round(tx)), Y(Math.round(ty) + 1), '#FFFFFF');
  }
  p.set(X(cx), Y(top - 1), '#3A3F48');
  p.set(X(cx), Y(top - 2), '#3A3F48');
  // shaft down to the J handle
  for (let y = rim; y < 64 - lift; y++) {
    p.set(X(cx), Y(y), SHAFT);
    p.set(X(cx + 1), Y(y), SHAFT_D);
  }
  const hy = 70 - lift;
  // hook at the bottom (curls to the left)
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI;
    const x = cx - 3 + Math.cos(a) * 4;
    const y = hy - 6 + Math.sin(a) * 5;
    p.set(X(Math.round(x)), Y(Math.round(y)), HANDLE[1]);
    p.set(X(Math.round(x)), Y(Math.round(y) + 1), HANDLE[0]);
  }
  p.rect(X(cx), Y(64 - lift), 2, 2, HANDLE[1]);
  const nx = X(cx - 9);
  const ny = Y(hy - 6);
  p.rect(nx, ny, 5, 4, '#F4F1E8');
  p.set(nx + 2, ny + 1, '#E23B2E');
  p.set(nx + 2, ny + 3, '#E23B2E');
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
