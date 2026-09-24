// Kit: helpers shared by the NPC sprites — template heads (with generic
// blink / look-up / mouth handling), hanging arms with walk swing, and small
// prop helpers. Every NPC composes these with its own unique details.

import type { Fig, PartOpts, RowMap } from './fig';
import { armTo, swing, type Seg } from './body';
import type { Pose } from './rig';

/** A template: [x, y (relative to the head top), rows, optional letter map]. */
export type Tpl = [number, number, string[], RowMap?];

export function stamp(f: Fig, mat: string, t: Tpl, dx: number, dy: number, o: PartOpts = {}): void {
  f.part(mat, o);
  f.rows(t[0] + dx, t[1] + dy, t[2], t[3] ?? {});
}

export const HAIRMAP: RowMap = { H: [null, 1], K: [null, 2], d: [null, -1], D: [null, -2], h: [null, 0] };

export interface EyeSpec {
  /** Front: viewer-left eye x, distance to the right eye, top row. */
  x: number;
  d: number;
  y: number;
  /** Eye height (1 or 2). */
  h?: number;
  /** White catch-light on the top pixel (kids). */
  shine?: boolean;
  /** Eyebrow row offset above the eye (adults, -2 typical), with material. */
  brow?: { dy: number; mat: string; w?: number };
  mat?: string;
  /** Eyes drawn as closed arcs (smiling / squinting people). */
  closed?: boolean;
}

export interface SideEyeSpec {
  x: number;
  y: number;
  h?: number;
  shine?: boolean;
  brow?: { dy: number; mat: string; w?: number };
  closed?: boolean;
}

export interface HeadT {
  hairMat?: string;
  skinMat?: string;
  faceD: Tpl;
  hairD: Tpl;
  /** Optional different front hair for look_up (default: derived from hairD). */
  hairDUp?: Tpl;
  /** Tuning of the front look_up (see lookUpFront). */
  upD?: {
    /** Rows the eyes rise (default 2). */
    lift?: number;
    /** Row of the fringe (default: right above the raised eyes). */
    fringeRow?: number;
    /** Rows the chin sinks into the collar (default 1). */
    drop?: number;
    /** 'none' = no hair across the brow (hats, bald heads). */
    fringe?: 'none';
    /** Row of the open mouth (default: one row below the eyes). */
    mouthRow?: number;
    /** Open narrow eyes when looking up. */
    openEyes?: boolean;
    /** false = no eye whites under the rolled-up pupils. */
    whites?: boolean;
  };
  eyesD: EyeSpec;
  mouthD?: [number, number, number];
  blushD?: [number, number, number];
  hairU: Tpl;
  napeU?: Tpl;
  faceL: Tpl;
  hairL: Tpl;
  eyeL: SideEyeSpec;
  earL?: [number, number];
  mouthL?: [number, number];
  blushL?: [number, number];
  /** Hair/face part options. */
  hairOpts?: PartOpts;
  /** Neck (look-up) rows under the chin: [x, y, w]. */
  neckD?: [number, number, number];
  neckL?: [number, number, number];
}

export type Expr = 'normal' | 'surprised' | 'hurt' | 'happy' | 'up';

/** Expression from the pose. */
export function exprOf(p: Pose): Expr {
  if (p.lookUp) return 'up';
  if (p.act === 'surprised') return 'surprised';
  if (p.act === 'hurt') return 'hurt';
  if (p.act === 'happy' || p.act === 'proud') return 'happy';
  return 'normal';
}

function drawEyesFront(f: Fig, p: Pose, e: EyeSpec, dy: number, ex: Expr) {
  const h = e.h ?? 2;
  const y = e.y + dy + (ex === 'up' ? -1 : 0);
  const mat = e.mat ?? 'eye';
  if (e.brow && ex !== 'up') {
    f.part(e.brow.mat, { flat: true, rim: false });
    const w = e.brow.w ?? 2;
    const by = y + e.brow.dy + (ex === 'surprised' ? -1 : 0);
    const tilt = ex === 'hurt' ? 1 : 0;
    f.hl(e.x - (w - 1), e.x, by + tilt).hl(e.x + e.d, e.x + e.d + w - 1, by + tilt);
    if (tilt) f.px(e.x - (w - 1), by).px(e.x + e.d + w - 1, by);
  }
  f.part(mat, { flat: true, rim: false });
  if (ex === 'hurt') {
    f.px(e.x - 1, y).px(e.x, y + 1).px(e.x + e.d + 1, y).px(e.x + e.d, y + 1);
    return;
  }
  if (ex === 'happy' && h >= 2) {
    const yy = y + h - 1;
    f.px(e.x - 1, yy).px(e.x, yy - 1).px(e.x + e.d, yy - 1).px(e.x + e.d + 1, yy);
    return;
  }
  if (p.blinkClosed) {
    // fully closed: a short lid line (outer corner down a touch)
    const yy = y + h - 1;
    f.px(e.x, yy).px(e.x - 1, yy).px(e.x + e.d, yy).px(e.x + e.d + 1, yy);
    return;
  }
  if (p.blink || e.closed) {
    // half-closed / narrow eyes: the lower pixel(s) only; old people get 2×1
    const yy = y + h - 1;
    if (e.closed) f.hl(e.x - 1, e.x, yy).hl(e.x + e.d, e.x + e.d + 1, yy);
    else f.px(e.x, yy).px(e.x + e.d, yy);
    return;
  }
  f.rect(e.x, y, 1, h).rect(e.x + e.d, y, 1, h);
  if (ex === 'surprised' && h === 1) f.px(e.x, y - 1).px(e.x + e.d, y - 1);
  // no catch-lights at 16px (30_level_art 7.7)
}

function drawEyeSide(f: Fig, p: Pose, e: SideEyeSpec, dx: number, dy: number, ex: Expr) {
  const h = e.h ?? 2;
  const x = e.x + dx;
  const y = e.y + dy;
  if (e.brow && ex !== 'up') {
    f.part(e.brow.mat, { flat: true, rim: false });
    const w = e.brow.w ?? 2;
    f.hl(x - (w - 1) + 1, x + 1, y + e.brow.dy + (ex === 'surprised' ? -1 : 0));
  }
  f.part('eye', { flat: true, rim: false });
  if (ex === 'hurt') {
    f.px(x, y).px(x + 1, y + 1);
    return;
  }
  if (p.blinkClosed) {
    f.px(x, y + h - 1).px(x + 1, y + h - 1);
    return;
  }
  if (p.blink || e.closed || ex === 'happy') {
    if (e.closed) f.hl(x, x + 1, y + h - 1);
    else f.px(x, y + h - 1);
    return;
  }
  f.rect(x, y, 1, h);
}

/**
 * Draw a templated head for the pose's view at head-top row `y`.
 * Returns nothing; hats/glasses are drawn by the caller afterwards.
 */
export function head(f: Fig, p: Pose, T: HeadT, y: number, xOff = 0): void {
  const hair = T.hairMat ?? 'hair';
  const skin = T.skinMat ?? 'skin';
  const ex = exprOf(p);
  const up = ex === 'up';
  const ho = T.hairOpts ?? { shade: '', light: '' };
  if (p.view === 'down' && up) {
    lookUpFront(f, p, T, y, xOff);
  } else if (p.view === 'down') {
    stamp(f, skin, T.faceD, xOff, y, { shade: 'rb', light: '' });
    stamp(f, hair, T.hairD, xOff, y, ho);
    drawEyesFront(f, p, { ...T.eyesD, x: T.eyesD.x + xOff }, y, ex);
    if (T.blushD) {
      f.part('blush', { flat: true, rim: false });
      f.px(T.blushD[0] + xOff, T.blushD[2] + y).px(T.blushD[1] + xOff, T.blushD[2] + y);
    }
    if (T.mouthD) {
      const [mx, my, mw] = T.mouthD;
      f.part('mouth', { flat: true, rim: false });
      if (ex === 'surprised') f.rect(mx + xOff + (mw === 1 ? -1 : 0), my + y, 2, 1);
      else if (ex === 'hurt') f.hl(mx + xOff - 1, mx + xOff + mw, my + y);
      else f.rect(mx + xOff, my + y, mw, 1);
    }
  } else if (p.view === 'up') {
    if (up) lookUpBack(f, T, y, xOff);
    else {
      if (T.napeU) stamp(f, skin, T.napeU, xOff, y, { shade: 'r', light: '' });
      stamp(f, hair, T.hairU, xOff, y, ho);
    }
  } else if (up) {
    lookUpSide(f, p, T, y, xOff);
  } else {
    stamp(f, skin, T.faceL, xOff, y, { shade: 'b', light: '' });
    stamp(f, hair, T.hairL, xOff, y, { shade: 'rb', light: 't', ...(T.hairOpts ?? {}) });
    if (T.earL) {
      f.part(skin, { shade: '', light: '' });
      f.t(-1).px(T.earL[0] + xOff, T.earL[1] + y).t(null);
    }
    drawEyeSide(f, p, T.eyeL, xOff, y, ex);
    if (T.blushL) {
      f.part('blush', { flat: true, rim: false });
      f.px(T.blushL[0] + xOff, T.blushL[1] + y);
    }
    if (T.mouthL && (ex === 'surprised' || ex === 'hurt')) {
      f.part('mouth', { flat: true, rim: false });
      f.px(T.mouthL[0] + xOff, T.mouthL[1] + y);
    }
  }
}

// ---- look_up (17:00) -----------------------------------------------------------
//
// The key moment of the game: everybody on screen stares straight up at the
// sky at once. It has to read at 1x, so it is a change of shape and value,
// not of a pixel or two:
//  - front: the face turns up toward the (elevated) camera. The hair cap
//    shrinks to the crown plus a thin fringe, the face fills the head from
//    the fringe down, lit by the sky; the eyes ride up right under the
//    fringe, the mouth hangs open, the underside of the jaw is in shade and
//    the chin sinks 1px into the collar (the nape shortens, 9.0);
//  - side: the whole head tips back (a shear ≈ 25° rotation about the
//    neck): nose and chin point up-forward, the back of the head drops onto
//    the nape, and the throat shows under the jaw;
//  - back: the back of the head sinks onto the shoulders, the nape
//    disappears and the ears / jaw corners show at both sides.

/** Cells of a row template: absolute (x, y) and the letter. */
export function tplCells(t: Tpl, dx = 0, dy = 0): { x: number; y: number; ch: string }[] {
  const out: { x: number; y: number; ch: string }[] = [];
  t[2].forEach((r, j) => {
    for (let i = 0; i < r.length; i++) if (r[i] !== '.' && r[i] !== ' ') out.push({ x: t[0] + i + dx, y: t[1] + j + dy, ch: r[i] });
  });
  return out;
}

/** Rebuild a template from cells (same letter map). */
export function cellsTpl(cells: { x: number; y: number; ch: string }[], map?: RowMap): Tpl {
  if (!cells.length) return [0, 0, [], map];
  const x0 = Math.min(...cells.map((c) => c.x));
  const y0 = Math.min(...cells.map((c) => c.y));
  const w = Math.max(...cells.map((c) => c.x)) - x0 + 1;
  const h = Math.max(...cells.map((c) => c.y)) - y0 + 1;
  const g: string[][] = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const c of cells) g[c.y - y0][c.x - x0] = c.ch;
  return [x0, y0, g.map((r) => r.join('')), map];
}

const rnd = (v: number) => Math.floor(v + 0.5);

/** Tip a side-view point back about the neck pivot (cx, cy). */
export function tilt(x: number, y: number, cx: number, cy: number, kx = 0.2, ky = 0.4): [number, number] {
  const X = x + rnd((cy - y) * kx);
  return [X, y + rnd((X - cx) * ky)];
}

export function tiltTpl(t: Tpl, cx: number, cy: number): Tpl {
  return cellsTpl(
    tplCells(t).map((c) => {
      const [x, y] = tilt(c.x, c.y, cx, cy);
      return { x, y, ch: c.ch };
    }),
    t[3],
  );
}

function lookUpFront(f: Fig, p: Pose, T: HeadT, y: number, xOff: number): void {
  const hair = T.hairMat ?? 'hair';
  const skin = T.skinMat ?? 'skin';
  const ho = T.hairOpts ?? { shade: '', light: '' };
  const U = T.upD ?? {};
  const [fx, fy, frows] = T.faceD;
  const [, , hrows, hmap] = T.hairD;
  // face column extents (template coordinates)
  let fl = 99;
  let fr = -1;
  for (const r of frows) {
    const a = r.indexOf('#');
    if (a < 0) continue;
    fl = Math.min(fl, fx + a);
    fr = Math.max(fr, fx + r.lastIndexOf('#'));
  }
  const eh = T.eyesD.h ?? 2;
  const lift = U.lift ?? 2;
  const eyU = T.eyesD.y - lift;
  // the fringe sits right above the raised eyes
  const fringeRow = U.fringeRow ?? eyU - 1;
  const drop = U.drop ?? 1;
  const chin = fy + frows.length - 1 + drop;
  // face: from the fringe down to the (sunk) chin; the template's rounded
  // lower rows stay at the bottom, full-width rows fill the top
  const widest = frows.reduce((a, r) => (r.replace(/\./g, '').length > a.replace(/\./g, '').length ? r : a), frows[0]);
  const faceRows: string[] = [];
  for (let r = fringeRow; r <= chin; r++) {
    const k = r - (chin - frows.length + 1);
    faceRows.push(k >= 0 ? frows[k] : widest);
  }
  f.part(skin, { shade: 'rb', light: '' });
  f.rows(fx + xOff, fringeRow + y, faceRows);
  // sky light on the upturned face, shade under the jaw
  const n = faceRows.length;
  for (let j = 0; j < n; j++) {
    const r = faceRows[j];
    const a = r.indexOf('#');
    const b = r.lastIndexOf('#');
    if (a < 0) continue;
    const Y = fringeRow + y + j;
    if (j >= n - 2) f.retone(fx + xOff + a, Y, -1, b - a + 1, 1);
    else if (j <= 2 && b - a >= 3) f.retone(fx + xOff + a + 1, Y, 1, b - a - 2, 1);
  }
  // hair: the cap above the fringe, a fringe with the brow showing through,
  // and the side locks (only where they frame the face)
  const cap: { x: number; y: number; ch: string }[] = [];
  const cells = T.hairDUp ? [] : tplCells(T.hairD);
  if (T.hairDUp) stamp(f, hair, T.hairDUp, xOff, y, ho);
  for (const c of cells) {
    if (c.y < fringeRow) cap.push(c);
    else if (c.y === fringeRow) {
      const inner = c.x > fl && c.x < fr;
      if (U.fringe === 'none' && inner) continue;
      if (inner && (c.x - fl) % 3 !== 0) continue;
      cap.push({ ...c, ch: inner ? 'd' : c.ch });
    } else if (c.y <= chin - 2 && (c.x < fl || c.x > fr)) cap.push(c);
  }
  if (cap.length) stamp(f, hair, cellsTpl(cap, hmap), xOff, y, ho);
  void hrows;
  // eyes right under the fringe, no brows (raised out of sight)
  const E = { ...T.eyesD, x: T.eyesD.x + xOff, y: eyU, brow: undefined, closed: T.eyesD.closed && !U.openEyes };
  drawEyesFront(f, p, E, y, 'normal');
  if (!E.closed && U.whites !== false) {
    // pupils rolled up: the white of the eye shows under each one
    f.part('#F4F1E8', { flat: true, rim: false });
    const wy = eyU + y + eh - (eh >= 2 ? 1 : 0);
    f.px(E.x, wy).px(E.x + E.d, wy);
  }
  // the mouth hangs open
  if (T.mouthD) {
    const [mx, , mw] = T.mouthD;
    const my = U.mouthRow ?? eyU + eh + 1;
    f.part('mouth', { flat: true, rim: false });
    f.rect(mx + xOff + (mw >= 2 ? Math.floor((mw - 1) / 2) : 0), my + y, 1, 2);
  }
}

/** Side-view look_up pivot of a templated head: the back of the jaw. */
export function sidePivot(T: HeadT): [number, number] {
  const [fx, fy, frows] = T.faceL;
  let fr = -1;
  for (const r of frows) fr = Math.max(fr, r.lastIndexOf('#'));
  return [fx + fr, fy + frows.length - 1];
}

/**
 * Where a point drawn on a templated head (x, row k below the head top)
 * goes in a look_up frame of view `view` — for hats, bands, glasses and
 * ponytails drawn by the caller. Front: unchanged; back: the head sinks 1px;
 * side: tipped back with the head.
 */
export function upPt(T: HeadT, p: Pose, x: number, k: number): [number, number] {
  if (!p.lookUp) return [x, k];
  if (p.view === 'up') return [x, k + 1];
  if (p.view === 'down') return [x, k];
  const [cx, cy] = sidePivot(T);
  return tilt(x, k, cx, cy);
}

function lookUpSide(f: Fig, p: Pose, T: HeadT, y: number, xOff: number): void {
  const hair = T.hairMat ?? 'hair';
  const skin = T.skinMat ?? 'skin';
  // pivot: the back of the jaw, where the head sits on the neck
  const [cx, cy] = sidePivot(T);
  // throat under the raised jaw (drawn first; the face covers its top)
  if (T.neckL) {
    const [nx, ny, nw] = T.neckL;
    f.part(skin, { shade: '', light: '' });
    f.t(-1).rect(nx + xOff - 1, ny + y - 2, nw + 1, 3).t(null);
  }
  stamp(f, skin, tiltTpl(T.faceL, cx, cy), xOff, y, { shade: 'b', light: '' });
  stamp(f, hair, tiltTpl(T.hairL, cx, cy), xOff, y, { shade: 'rb', light: 't', ...(T.hairOpts ?? {}) });
  if (T.earL) {
    const [ex, ey] = tilt(T.earL[0], T.earL[1], cx, cy);
    f.part(skin, { shade: '', light: '' });
    f.t(-1).px(ex + xOff, ey + y).t(null);
  }
  const e = T.eyeL;
  const [ex, ey] = tilt(e.x, e.y, cx, cy);
  drawEyeSide(f, p, { ...e, x: ex, y: ey, brow: undefined, closed: e.closed }, xOff, y, 'normal');
  if (T.mouthL) {
    const [mx, my] = tilt(T.mouthL[0], T.mouthL[1], cx, cy);
    f.part('mouth', { flat: true, rim: false });
    f.px(mx + xOff, my + y);
  }
}

function lookUpBack(f: Fig, T: HeadT, y: number, xOff: number): void {
  const hair = T.hairMat ?? 'hair';
  const skin = T.skinMat ?? 'skin';
  const ho = T.hairOpts ?? { shade: '', light: '' };
  const [hx, hy, rows, map] = T.hairU;
  // hair extents at the widest row (ears sit just outside, mid-height)
  let wl = 99;
  let wr = -1;
  let wy = 0;
  rows.forEach((r, j) => {
    const a = r.search(/[^.]/);
    if (a < 0) return;
    const b = r.length - 1 - [...r].reverse().findIndex((c) => c !== '.');
    if (b - a > wr - wl) {
      wl = a;
      wr = b;
      wy = j;
    }
  });
  const earY = hy + Math.max(wy + 1, Math.floor(rows.length / 2)) + 1;
  f.part(skin, { shade: '', light: '' });
  f.t(-1).rect(hx + wl - 1 + xOff, earY + y, 1, 2).rect(hx + wr + 1 + xOff, earY + y, 1, 2).t(null);
  // the crown tips away and the back of the head sinks over the nape
  stamp(f, hair, [hx, hy + 1, rows.slice(1), map], xOff, y + 1, ho);
}

// ---- arms ---------------------------------------------------------------

export interface ArmsDef {
  /** Front/back: viewer-left arm column and viewer-right arm column. */
  lx: number;
  rx: number;
  /** Shoulder row (standing) and hand row. */
  sy: number;
  hy: number;
  segs: Seg[];
  w?: number;
  /** Side view: shoulder x and forward reach per swing unit. */
  sx?: number;
  /** Hand size: 2 (default, 2×2 block) or 1 (small children). */
  hand?: 1 | 2;
}

/**
 * Two hanging arms (front/back views) with the walk swing. Hands end in a
 * 2×2 block of the last segment's material, widening outward (7.7).
 */
export function hangArms(f: Fig, p: Pose, a: ArmsDef, u: number, which: 'both' | 'L' | 'R' = 'both'): void {
  const back = p.view === 'up';
  const sl = swing(p, -1) * (back ? -1 : 1);
  const sr = swing(p, 1) * (back ? -1 : 1);
  const w = a.w ?? 1;
  const hand = a.segs[a.segs.length - 1].mat;
  // look_up: the arms go slack — hands 1px lower and tucked in to the body
  const lu = p.lookUp ? 1 : 0;
  if (which !== 'R') {
    armTo(f, { sx: a.lx, sy: a.sy + u, hx: 0, hy: 0, segs: a.segs, w, side: 1, shift: back ? -1 : 0 }, a.lx + lu, a.hy + u + sl + lu);
    if (a.hand !== 1) {
      f.part(hand, { shade: 'rb', light: 't', shift: back ? -1 : 0 });
      f.rect(a.lx - 1 + lu, a.hy + u + sl - 1 + lu, 2, 2);
    }
  }
  if (which !== 'L') {
    armTo(f, { sx: a.rx, sy: a.sy + u, hx: 0, hy: 0, segs: a.segs, w, side: -1, shift: -1 }, a.rx - lu, a.hy + u + sr + lu);
    if (a.hand !== 1) {
      f.part(hand, { shade: 'rb', light: 't', shift: -1 });
      f.rect(a.rx - lu, a.hy + u + sr - 1 + lu, 2, 2);
    }
  }
}

/** Side-view swing offset (-1..1, doubled when running). */
export function sideSwing(p: Pose): number {
  if (p.mode !== 'walk' && p.mode !== 'run') return 0;
  return [0, 1, 0, -1][p.step % 4] * (p.run ? 2 : 1);
}

/** A side arm hanging from (sx,sy) to the hand; swing>0 = forward (left). */
export function sideArm(f: Fig, sx: number, sy: number, len: number, sw: number, segs: Seg[], shift = 0, w = 1): void {
  const hx = sx - sw;
  const hy = sy + len - (sw ? 1 : 0);
  armTo(f, { sx, sy, hx: 0, hy: 0, segs, w, side: 1, shift }, hx, hy, sw ? [sx - Math.sign(sw), sy + Math.ceil(len / 2)] : undefined);
}

/**
 * Vertical offset of a hat / cap for look_up: front and side lift with the
 * head (-1); from behind the hat tips back and drops with the back of the
 * head (+1).
 */
export function hatLift(p: Pose): number {
  if (!p.lookUp) return 0;
  return p.view === 'up' ? 1 : -1;
}

/** Upper-body offset for the pose (bob + breathing). */
export function upper(p: Pose): number {
  return p.bob - p.breath;
}

// ---- hand-placed row art --------------------------------------------------

/** Letter → [material, tone] (null = leave the pixel empty). */
export type Legend = Record<string, [string, number] | null>;

/**
 * Paint hand-placed row art (every pixel's material and tone chosen by
 * hand, as for small figures whose shapes the automatic shading cannot
 * carry). One flat part per material, created in `order`; the outline and
 * the sunset rim still come from the renderer.
 */
export function paintRows(f: Fig, x: number, y: number, rows: string[], legend: Legend, order: string[], o: PartOpts = {}): void {
  for (const m of order) {
    let started = false;
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const L = legend[r[i]];
        if (!L || L[0] !== m) continue;
        if (!started) {
          f.part(m, { flat: true, ...o });
          started = true;
        }
        f.t(L[1]).px(x + i, y + j);
      }
    }
  }
  f.t(null);
}
