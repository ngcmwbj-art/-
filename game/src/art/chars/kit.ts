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
  /** Optional different front hair when looking up (default: hairD one row up). */
  hairDUp?: Tpl;
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
  if (p.view === 'down') {
    if (up && T.neckD) {
      f.part(skin, { shade: 'r', light: '' });
      f.rect(T.neckD[0] + xOff, T.neckD[1] + y, T.neckD[2], 1);
    }
    stamp(f, skin, T.faceD, xOff, y, { shade: 'rb', light: '' });
    if (up && T.hairDUp) stamp(f, hair, T.hairDUp, xOff, y, ho);
    else stamp(f, hair, T.hairD, xOff, y - (up ? 1 : 0), ho);
    drawEyesFront(f, p, { ...T.eyesD, x: T.eyesD.x + xOff }, y, ex);
    if (T.blushD && !up) {
      f.part('blush', { flat: true, rim: false });
      f.px(T.blushD[0] + xOff, T.blushD[2] + y).px(T.blushD[1] + xOff, T.blushD[2] + y);
    }
    if (T.mouthD) {
      const [mx, my, mw] = T.mouthD;
      f.part('mouth', { flat: true, rim: false });
      if (ex === 'surprised' || ex === 'up') f.rect(mx + xOff + (mw === 1 ? -1 : 0), my + y - (up ? 1 : 0), 2, 1);
      else if (ex === 'hurt') f.hl(mx + xOff - 1, mx + xOff + mw, my + y);
      else f.rect(mx + xOff, my + y, mw, 1);
    }
  } else if (p.view === 'up') {
    if (T.napeU) stamp(f, skin, T.napeU, xOff, y, { shade: 'r', light: '' });
    stamp(f, hair, T.hairU, xOff, y, ho);
  } else {
    const dx = up ? -1 : 0;
    if (up && T.neckL) {
      f.part(skin, { shade: '', light: '' });
      f.rect(T.neckL[0] + xOff, T.neckL[1] + y, T.neckL[2], 1);
    }
    stamp(f, skin, T.faceL, xOff + dx, y - (up ? 1 : 0), { shade: 'b', light: '' });
    stamp(f, hair, T.hairL, xOff, y - (up ? 1 : 0), { shade: 'rb', light: 't', ...(T.hairOpts ?? {}) });
    if (T.earL) {
      f.part(skin, { shade: '', light: '' });
      f.t(-1).px(T.earL[0] + xOff, T.earL[1] + y - (up ? 1 : 0)).t(null);
    }
    drawEyeSide(f, p, T.eyeL, xOff + dx, y - (up ? 2 : 0), ex);
    if (T.blushL && !up) {
      f.part('blush', { flat: true, rim: false });
      f.px(T.blushL[0] + xOff, T.blushL[1] + y);
    }
    if (T.mouthL && (ex === 'surprised' || ex === 'up' || ex === 'hurt')) {
      f.part('mouth', { flat: true, rim: false });
      f.px(T.mouthL[0] + xOff + dx, T.mouthL[1] + y - (up ? 2 : 0));
    }
  }
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
  if (which !== 'R') {
    armTo(f, { sx: a.lx, sy: a.sy + u, hx: 0, hy: 0, segs: a.segs, w, side: 1, shift: back ? -1 : 0 }, a.lx, a.hy + u + sl);
    if (a.hand !== 1) {
      f.part(hand, { shade: 'rb', light: 't', shift: back ? -1 : 0 });
      f.rect(a.lx - 1, a.hy + u + sl - 1, 2, 2);
    }
  }
  if (which !== 'L') {
    armTo(f, { sx: a.rx, sy: a.sy + u, hx: 0, hy: 0, segs: a.segs, w, side: -1, shift: -1 }, a.rx, a.hy + u + sr);
    if (a.hand !== 1) {
      f.part(hand, { shade: 'rb', light: 't', shift: -1 });
      f.rect(a.rx, a.hy + u + sr - 1, 2, 2);
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

/** Upper-body offset for the pose (bob + breathing). */
export function upper(p: Pose): number {
  return p.bob - p.breath;
}
