// Night preview for the character gallery (chapter 2, 52 8.3–8.5): the
// sprites are drawn on a day-coloured village ground, multiplied by the
// pal_h0 night colour with the tomato lantern's light pool (three mixed
// steps with checkered seams), then the glow layer (charGlow) and the night
// rim toward the lantern (litRim) go on top — the same order the field uses.
// A lantern-carrying Minato walks the rows so every sprite passes through
// the light. Pages: 'night cast', 'night foes', 'night cows' (+ a barn pen).

import type { Gfx } from '../../engine/gfx';
import { makeCanvas, mix, PixelCanvas } from '../../engine/pixel';
import { valueNoise } from '../../engine/rng';
import type { Dir } from '../../game/state';
import { charSprite, hasChar, idleFrame, walkFrame, type CharSprite } from './registry';
import { charGlow, lanternOf, litRim } from './nightlight';
import { tinyText, tinyWidth } from './tinyfont';

export interface Placed {
  img: HTMLCanvasElement;
  /** Top-left in page (world) pixels. */
  x: number;
  y: number;
  /** Receives the night rim (false: the lantern carrier itself). */
  rim?: boolean;
}

export interface NightItem {
  w: number;
  h: number;
  label: string;
  /** Frames at time t, positioned relative to the item's top-left. */
  frames: (t: number) => Placed[];
  /** Optional ground art under the item (relative to its top-left). */
  under?: (p: PixelCanvas, x: number, y: number) => void;
}

const BASE = '#5C5A94';
const R0 = 72;

// ---- ground ---------------------------------------------------------------

let groundC: HTMLCanvasElement | null = null;
function ground(): HTMLCanvasElement {
  if (groundC) return groundC;
  const p = new PixelCanvas(384, 216);
  for (let y = 0; y < 216; y++)
    for (let x = 0; x < 384; x++) {
      const n = valueNoise(x / 9, y / 7, 5) * 0.7 + valueNoise(x / 2.5, y / 2.2, 11) * 0.3;
      const grass = valueNoise(x / 40, y / 30, 3) > 0.62;
      let c = grass ? '#5FA85A' : '#C8A06A';
      if (n < 0.32) c = grass ? '#3FA66B' : '#A8742A';
      else if (n > 0.76) c = grass ? '#9BCB6B' : '#E8D9B5';
      p.set(x, y, c);
    }
  groundC = p.toCanvas();
  return groundC;
}

// ---- light map ------------------------------------------------------------

const poolCache = new Map<number, HTMLCanvasElement>();

/** The lantern's pool (outside a dark area: 70 / 47 / 23 %), R px, over the night base. */
function pool(R: number): HTMLCanvasElement {
  let c = poolCache.get(R);
  if (c) return c;
  const S = R * 2 + 2;
  const p = new PixelCanvas(S, S);
  const steps: [string, number][] = [
    ['#FFE7C0', 0.7],
    ['#F7B070', 0.47],
    ['#F2894B', 0.23],
  ];
  const col = steps.map(([cc, k]) => mix(BASE, cc, k));
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x + 0.5 - S / 2, y + 0.5 - S / 2);
      if (d > R) continue;
      const k = d / R;
      // seams between the steps: 2px checker (light.ts `step`)
      const chk = ((x >> 1) + (y >> 1)) & 1;
      let band = k < 0.3 ? 0 : k < 0.6 ? 1 : 2;
      if (Math.abs(k - 0.3) * R < 2 && chk) band = k < 0.3 ? 1 : 0;
      else if (Math.abs(k - 0.6) * R < 2 && chk) band = k < 0.6 ? 2 : 1;
      else if (R - d < 2 && chk) continue;
      p.set(x, y, col[band]);
    }
  c = p.toCanvas();
  poolCache.set(R, c);
  return c;
}

// ---- items ----------------------------------------------------------------

function spriteItem(id: string, dir: Dir = 'down', label?: string): NightItem | null {
  if (!hasChar(id)) return null;
  const s = charSprite(id);
  const w = Math.max(s.w, ...s.walk[dir].map((c) => c.width)) + 4;
  const h = Math.max(s.h, ...(s.idle?.[dir] ?? s.walk[dir]).map((c) => c.height)) + 2;
  return {
    w,
    h,
    label: label ?? id.replace(/^npc_hoshi_/, '').replace(/^prop_h_/, '').replace(/^restored_enemy_/, 'r:').replace(/^enemy_/, ''),
    frames: (t) => {
      const img = idleFrame(s, dir, t + (id.length * 431) % 3000);
      return [{ img, x: Math.round(w / 2 - img.width / 2), y: h - img.height }];
    },
  };
}

function animItem(id: string, name: string, dir: Dir = 'down'): NightItem | null {
  if (!hasChar(id)) return null;
  const s = charSprite(id);
  const a = s.animsDir?.[name]?.[dir] ?? s.anims?.[name];
  const frames = a ? a.frames : [s.extraDir?.[name]?.[dir] ?? s.extra?.[name] ?? s.walk[dir][0]];
  const w = Math.max(...frames.map((c) => c.width)) + 4;
  const h = Math.max(...frames.map((c) => c.height)) + 2;
  const ms = a ? (typeof a.ms === 'number' ? a.ms * frames.length : a.ms.reduce((x, v) => x + v, 0)) : 1;
  return {
    w,
    h,
    label: `${id.replace(/^npc_hoshi_|^prop_h_|^minato_|^npc_/, '')}~${name}`,
    frames: (t) => {
      let img = frames[0];
      if (a) {
        let tt = t % (ms + 600);
        if (typeof a.ms === 'number') img = frames[Math.min(frames.length - 1, Math.floor(tt / a.ms))];
        else {
          let i = 0;
          while (i < frames.length - 1 && tt >= a.ms[i]) tt -= a.ms[i++];
          img = frames[i];
        }
      }
      return [{ img, x: Math.round(w / 2 - img.width / 2), y: h - img.height }];
    },
  };
}

const CH2_PEOPLE = [
  'minato_lantern', 'kanenari', 'npc_hoshi_mitsu', 'npc_hoshi_gen', 'npc_hoshi_fumi', 'npc_hoshi_kucho',
  'npc_hoshi_yoshie', 'npc_hoshi_tome', 'npc_hoshi_sawako', 'npc_hoshi_busdriver', 'npc_hoshi_traindriver',
  'npc_hoshi_gon', 'prop_h_napper_masa', 'prop_h_napper_kiyo', 'prop_h_napper_take',
];

export function nightCast(): NightItem[] {
  const out: NightItem[] = [];
  for (const id of CH2_PEOPLE) {
    const it = spriteItem(id);
    if (it) out.push(it);
  }
  for (const [id, name] of [
    ['minato_lantern', 'hold_up'], ['minato_lantern', 'lantern_set'], ['minato_ch2', 'yawn'], ['minato_lantern', 'look_hill'],
    ['kanenari', 'hold_net'], ['kanenari', 'bow_small'],
  ] as const) {
    const it = animItem(id, name);
    if (it) out.push(it);
  }
  return out;
}

export function nightFoes(): NightItem[] {
  const ids = [
    'enemy_sune_tomato', 'enemy_sune_tomato_pair', 'enemy_henoheno_kacho', 'enemy_biribiri_ban', 'enemy_chototsu',
    'enemy_mujin_hanbaiin', 'enemy_tetsuya', 'restored_enemy_sune_tomato', 'restored_enemy_sune_tomato_pair',
    'restored_enemy_henoheno_kacho', 'restored_enemy_biribiri_ban', 'restored_enemy_chototsu',
    'restored_enemy_mujin_hanbaiin', 'restored_enemy_tetsuya',
  ];
  const out: NightItem[] = [];
  for (const id of ids) {
    const it = spriteItem(id, id.startsWith('enemy_') && id !== 'enemy_sune_tomato' ? 'left' : 'down');
    if (it) out.push(it);
  }
  return out;
}

/** Extra items a module adds to the cows page (the pen preview lives with the cattle). */
const cowItems: (() => NightItem[])[] = [];
export function addCowPreview(fn: () => NightItem[]): void {
  cowItems.push(fn);
}

export function nightCows(): NightItem[] {
  const out: NightItem[] = [];
  for (const fn of cowItems) out.push(...fn());
  return out;
}

// ---- the page ------------------------------------------------------------

let pageC: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
let lightC: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;

interface Laid {
  item: NightItem;
  x: number;
  y: number;
  cw: number;
}

export function drawNight(g: Gfx, items: NightItem[], o: { zoom: number; scroll: number; t: number; title: string; still: boolean }): void {
  const z = o.zoom;
  const W = Math.ceil(384 / z);
  const H = Math.ceil(216 / z);
  if (!pageC) pageC = makeCanvas(384, 216);
  if (!lightC) lightC = makeCanvas(384, 216);
  const [pc, px] = pageC;
  const [lc, lx] = lightC;
  pc.width = W;
  pc.height = H;
  lc.width = W;
  lc.height = H;
  px.imageSmoothingEnabled = false;
  lx.imageSmoothingEnabled = false;
  // layout
  const rows: { items: Laid[]; h: number; y: number }[] = [];
  let cur: { items: Laid[]; h: number; y: number } = { items: [], h: 0, y: 0 };
  let x = 4;
  for (const it of items) {
    const cw = Math.max(it.w, Math.ceil(tinyWidth(it.label) / z)) + 4;
    if (x + cw > W - 2 && cur.items.length) {
      rows.push(cur);
      cur = { items: [], h: 0, y: 0 };
      x = 4;
    }
    cur.items.push({ item: it, x, y: 0, cw });
    cur.h = Math.max(cur.h, it.h + Math.ceil(8 / z));
    x += cw;
  }
  if (cur.items.length) rows.push(cur);
  const scroll = Math.min(o.scroll, Math.max(0, rows.length - 1));
  let y = Math.ceil(14 / z);
  const shown = rows.slice(scroll);
  for (const r of shown) {
    r.y = y;
    y += r.h + 4;
  }
  // ground + items
  px.globalCompositeOperation = 'source-over';
  px.globalAlpha = 1;
  px.drawImage(ground(), 0, 0);
  const placed: Placed[] = [];
  for (const r of shown) {
    if (r.y > H) break;
    for (const L of r.items) {
      const ox = L.x + Math.floor((L.cw - 4 - L.item.w) / 2);
      if (L.item.under) {
        const pp = new PixelCanvas(W, H);
        L.item.under(pp, ox, r.y);
        px.drawImage(pp.toCanvas(), 0, 0);
      }
      for (const f of L.item.frames(o.t)) {
        const q = { img: f.img, x: ox + f.x, y: r.y + f.y, rim: f.rim !== false };
        // a soft round shadow under each sprite (#0B0B14 α40%, 70% of its width)
        const sw = Math.round(f.img.width * 0.7);
        px.fillStyle = 'rgba(11,11,20,0.4)';
        px.beginPath();
        px.ellipse(q.x + f.img.width / 2, q.y + f.img.height - 1, sw / 2, 2, 0, 0, Math.PI * 2);
        px.fill();
        px.drawImage(f.img, q.x, q.y);
        placed.push(q);
      }
    }
  }
  // the lantern carrier sweeps the visible rows
  const carrier = charSprite('minato_lantern');
  const period = 9000;
  const k = (o.t % period) / period;
  const tri = k < 0.5 ? k * 2 : 2 - k * 2;
  const rowIdx = Math.floor(o.t / period) % Math.max(1, Math.min(shown.length, 3));
  const row = shown[rowIdx];
  const dir: Dir = k < 0.5 ? 'right' : 'left';
  const feetX = Math.round(8 + tri * (W - 16));
  const feetY = row ? Math.min(H - 2, row.y + row.h + 2) : Math.round(H / 2);
  const img = o.still ? idleFrame(carrier, 'down', o.t) : walkFrame(carrier, dir, o.t);
  const cx0 = o.still ? Math.round(W / 2) : feetX;
  const cy0 = o.still ? Math.round(H * 0.6) : feetY;
  px.drawImage(img, cx0 - Math.floor(img.width / 2), cy0 - img.height);
  const lan = lanternOf(img) ?? { dx: -4, dy: -6, scale: 1 };
  const R = Math.round((R0 + 3.2 * Math.sin((2 * Math.PI * 0.8 * o.t) / 1000)) * lan.scale);
  const lcx = Math.round(cx0 + lan.dx);
  const lcy = Math.round(cy0 + lan.dy);
  // light map: the night multiply colour with the lantern's pool mixed in
  lx.globalCompositeOperation = 'source-over';
  lx.fillStyle = BASE;
  lx.fillRect(0, 0, W, H);
  const P = pool(R);
  lx.drawImage(P, lcx - P.width / 2, lcy - P.height / 2);
  px.globalCompositeOperation = 'multiply';
  px.drawImage(lc, 0, 0);
  px.globalCompositeOperation = 'source-over';
  // night rim on the lantern side, then the glow layer
  for (const q of placed) {
    if (!q.rim) continue;
    const fx = q.x + q.img.width / 2;
    const fy = q.y + q.img.height;
    const d = Math.hypot(fx - lcx, fy - lcy);
    if (d > R) continue;
    const rim = litRim(q.img, lcx - fx, lcy - (q.y + q.img.height / 2));
    if (rim) {
      px.globalAlpha = Math.max(0.35, 1 - (d / R) * 0.8);
      px.drawImage(rim, q.x, q.y);
      px.globalAlpha = 1;
    }
  }
  for (const q of [...placed, { img, x: cx0 - Math.floor(img.width / 2), y: cy0 - img.height }]) {
    const gl = charGlow(q.img);
    if (gl) px.drawImage(gl.img, q.x + gl.dx, q.y + gl.dy);
  }
  g.ctx.imageSmoothingEnabled = false;
  g.ctx.drawImage(pc, 0, 0, W * z, H * z);
  // labels (not graded)
  for (const r of shown) {
    if (r.y > H) break;
    for (const L of r.items) {
      const lw = tinyWidth(L.item.label);
      tinyText(g, L.item.label, Math.round((L.x + (L.cw - 4) / 2) * z - lw / 2), Math.round((r.y + L.item.h) * z) + 1, '#C8C2B4');
    }
  }
  g.rect(0, 0, 384, 11, '#2A2440', 0.85);
  const more = rows.length > 1 ? ` row ${scroll + 1}/${rows.length}` : '';
  tinyText(g, `${o.title}  z${z} pal_h0 + lantern R${R}${o.still ? ' still' : ''}${more}`, 4, 3, '#FBF3DC');
  const keys = 'z still  c zoom  up/dn row';
  tinyText(g, keys, 384 - tinyWidth(keys) - 4, 3, '#C8C2B4');
}

/** Frames of a sprite for a custom preview item. */
export function idleOf(s: CharSprite, dir: Dir, t: number): HTMLCanvasElement {
  return idleFrame(s, dir, t);
}
