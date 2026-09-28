// On-screen touch controls for phones and tablets (DOM overlay).
//
//  - A cross-shaped D-pad (十字キー): slide the thumb over it; 8 directions.
//  - 「けってい」(confirm), 「もどる」(cancel), 「ダッシュ」(toggle: stays on
//    until tapped again) and 「メニュー」.
//  - Tapping the game picture itself counts as けってい (advancing text).
//
// Layout adapts to the device. The picture is scaled smoothly (not only in
// whole steps) to the biggest size that leaves the controls beside it (phone,
// landscape) or below it (portrait; an upright tablet). A tablet held
// sideways plays full screen: the picture fills the window and translucent
// controls float over its bottom corners (also any window too cramped for
// either layout). There they keep off the text (engine/textzones.ts): over a
// dialog window they rise to just above it, in a battle they sit between the
// band and the panels (a little smaller when the gap is low), and on a text
// screen (the menu, a shop) — or when no gap is left — the picture shrinks a
// little and they stand beside it.

import type { Action, Input } from './input';
import { H, W, type Screen } from './screen';
import { onTextZones, uiBands } from './textzones';

const INK = '#2A2440';
const PAPER = '#FBF3DC';
const TAPE = '#F7C27A';
const SHU = '#E23B2E';

const CSS = `
.tc{position:fixed;inset:0;pointer-events:none;z-index:10;display:none;
  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
.tc.on{display:block}
.tc *{box-sizing:border-box}
.tc-pad{position:absolute;pointer-events:auto;touch-action:none}
.tc-pad svg{display:block;width:100%;height:100%;overflow:visible}
.tc-pad .arm{fill:${TAPE};opacity:0;transition:opacity 60ms}
.tc-pad .arm.down{opacity:1}
.tc-btn{position:absolute;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center;
  font-family:GameFont,"Hiragino Sans","Noto Sans JP",sans-serif;color:${INK};background:${PAPER};
  border:3px solid ${INK};box-shadow:0 4px 0 ${INK};border-radius:999px;line-height:1;letter-spacing:.04em;white-space:nowrap;
  transition:transform 50ms,box-shadow 50ms,background 80ms,opacity 120ms}
.tc .tc-btn.away{opacity:0!important;pointer-events:none;transform:scale(.8)}
.tc-btn.down{transform:translateY(3px);box-shadow:0 1px 0 ${INK}}
.tc-a{background:${SHU};color:${PAPER}}
.tc-a.down{background:#B8241E}
.tc-b.down,.tc-m.down{background:${TAPE}}
.tc-d.on{background:${TAPE}}
.tc-d .lamp{display:inline-block;width:.55em;height:.55em;border-radius:50%;border:2px solid ${INK};margin-right:.35em;background:${PAPER}}
.tc-d.on .lamp{background:${SHU}}
.tc.overlay .tc-pad,.tc.overlay .tc-btn{opacity:.55;transition:opacity .15s}
.tc.overlay .tc-pad.held,.tc.overlay .tc-btn.down{opacity:.9}
.tc.glide .tc-pad,.tc.glide .tc-btn{transition:opacity .15s,left .18s ease-out,top .18s ease-out,width .18s ease-out,height .18s ease-out,font-size .18s ease-out}
.tc.glide:not(.overlay) .tc-btn{transition:opacity .15s,left .18s ease-out,top .18s ease-out,width .18s ease-out,height .18s ease-out,font-size .18s ease-out,transform 50ms,box-shadow 50ms,background 80ms}
.tc .tc-pad.veil:not(.held),.tc .tc-btn.veil:not(.down){opacity:0!important}
.tc.hl .tc-hint{left:auto;right:calc(100% + .45em);bottom:auto;top:50%;transform:translateY(-50%);animation-name:tcBeatL}
@keyframes tcBeatL{from{transform:translateY(-50%) scale(1)}to{transform:translateY(-50%) scale(1.1)}}
#screen.tc-zoom{transition:width .2s ease-out,height .2s ease-out}
.tc-hint{position:absolute;left:50%;bottom:calc(100% + .5em);display:none;padding:.3em .55em .25em;
  background:${PAPER};color:${SHU};border:3px solid ${INK};border-radius:.4em;box-shadow:0 3px 0 ${INK};
  font-size:.82em;white-space:nowrap;pointer-events:none;transform:translateX(-50%);animation:tcBeat .56s ease-in-out infinite alternate}
.tc-hint.on{display:block}
.tc-hint.go{background:#FFD23F;color:${INK};animation-duration:.18s}
.tc-a.hint{outline:4px solid #FFD23F;outline-offset:2px;z-index:3}
.tc.overlay .tc-a.hint{opacity:.9}
@keyframes tcBeat{from{transform:translateX(-50%) scale(1)}to{transform:translateX(-50%) scale(1.1)}}
`;

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag: string, attrs: Record<string, string | number>, parent: Element): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent.appendChild(el);
  return el;
}

/** The cross-shaped D-pad: drop shadow, ink outline, paper face, lit arms, arrows. */
function buildDpad(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const cross = (parent: Element, inset: number, fill: string, rx: number) => {
    const w = 34 - 2 * inset;
    const l = 98 - 2 * inset;
    svgEl('rect', { x: 33 + inset, y: 1 + inset, width: w, height: l, rx, fill }, parent);
    svgEl('rect', { x: 1 + inset, y: 33 + inset, width: l, height: w, rx, fill }, parent);
  };
  cross(svgEl('g', { transform: 'translate(0,4)' }, svg), 0, INK, 7);
  cross(svg, 0, INK, 7);
  cross(svg, 3, PAPER, 5);
  const arms: [string, number, number, number, number][] = [
    ['up', 36, 4, 28, 31],
    ['down', 36, 65, 28, 31],
    ['left', 4, 36, 31, 28],
    ['right', 65, 36, 31, 28],
  ];
  for (const [a, x, y, width, height] of arms) svgEl('rect', { class: 'arm', 'data-a': a, x, y, width, height, rx: 5 }, svg);
  const ink = svgEl('g', { fill: INK }, svg);
  for (const d of ['M50 10 L59 22 L41 22 Z', 'M50 90 L59 78 L41 78 Z', 'M10 50 L22 41 L22 59 Z', 'M90 50 L78 41 L78 59 Z'])
    svgEl('path', { d }, ink);
  svgEl('circle', { cx: 50, cy: 50, r: 6, fill: 'none', stroke: INK, 'stroke-width': 2.5 }, ink);
  return svg;
}

function div(cls: string, parent: Element, text?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = cls;
  if (text) el.textContent = text;
  parent.appendChild(el);
  return el;
}

type Mode = 'side' | 'bottom' | 'overlay';

let backShown: () => boolean = () => true;

let layoutInfo: () => { active: boolean; sideways: boolean; sideCols: boolean; scale: number | null; fit: string } = () => ({
  active: false,
  sideways: false,
  sideCols: false,
  scale: null,
  fit: '',
});
/** QA: the touch layout's state (a sideways tablet; its picture shrunk beside the controls). */
export function touchLayoutInfo(): ReturnType<typeof layoutInfo> {
  return layoutInfo();
}

/** Is the on-screen pad up (a phone / tablet, or ?touch)? */
let touchShown = false;
export function touchControlsOn(): boolean {
  return touchShown;
}

let hintEl: HTMLDivElement | null = null;
let hintBtn: HTMLDivElement | null = null;
/**
 * A word on the けってい button (the battle's 「長押し」→「はなす！」): the
 * button gets a gold ring and a tag beside it says what to do with it.
 * `null` takes it away. `go` = the moment to press / let go (gold, quick).
 */
export function setButtonHint(text: string | null, go = false): void {
  if (!hintEl || !hintBtn) return;
  hintEl.classList.toggle('on', !!text);
  hintEl.classList.toggle('go', !!text && go);
  hintBtn.classList.toggle('hint', !!text);
  if (text && hintEl.textContent !== text) hintEl.textContent = text;
}

/**
 * Tell the controls when 「もどる」 has something to do. While Minato just
 * walks around it would only open the menu, the same as 「メニュー」, so it
 * steps aside there and comes back in menus, conversations and battles.
 */
export function setBackShown(fn: () => boolean): void {
  backShown = fn;
}

export function installTouch(input: Input, screen?: Screen): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = div('tc', document.body);
  const pad = div('tc-pad', root);
  pad.appendChild(buildDpad());
  const btnA = div('tc-btn tc-a', root, 'けってい');
  hintEl = div('tc-hint', btnA);
  hintBtn = btnA;
  const btnB = div('tc-btn tc-b', root, 'もどる');
  const btnD = div('tc-btn tc-d', root);
  div('lamp', btnD);
  btnD.append('ダッシュ');
  const btnM = div('tc-btn tc-m', root, 'メニュー');
  const arms = new Map<string, Element>();
  root.querySelectorAll('.arm').forEach((el) => arms.set((el as SVGElement).dataset.a ?? '', el));

  let active = false;
  const capture = (el: Element, id: number) => {
    try {
      el.setPointerCapture(id);
    } catch {
      /* pointer already gone */
    }
  };
  const buzz = () => {
    try {
      navigator.vibrate?.(8);
    } catch {
      /* not allowed */
    }
  };

  // ---- D-pad --------------------------------------------------------------
  let padId: number | null = null;
  /** The pad kept its place under a thumb when the text moved: lay out again once it lets go. */
  let padStay = false;
  let layoutSoon = () => {};
  const dirs: Action[] = ['up', 'down', 'left', 'right'];
  const held = new Set<Action>();
  const setDirs = (want: Set<Action>) => {
    for (const d of dirs) {
      const on = want.has(d);
      if (on !== held.has(d)) {
        input.setVirtual(d, on);
        arms.get(d)?.classList.toggle('down', on);
        if (on) held.add(d);
        else held.delete(d);
      }
    }
  };
  const padMove = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const want = new Set<Action>();
    if (Math.hypot(dx, dy) > 0.18) {
      // 8 sectors: a diagonal only when the thumb is clearly between two arms
      if (Math.abs(dx) > Math.abs(dy) * 0.45) want.add(dx < 0 ? 'left' : 'right');
      if (Math.abs(dy) > Math.abs(dx) * 0.45) want.add(dy < 0 ? 'up' : 'down');
    }
    const before = held.size;
    setDirs(want);
    if (want.size && !before) buzz();
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    padId = e.pointerId;
    pad.classList.add('held');
    capture(pad, e.pointerId);
    padMove(e);
  });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId === padId) padMove(e);
  });
  const endPad = (e: PointerEvent) => {
    if (e.pointerId !== padId) return;
    padId = null;
    pad.classList.remove('held');
    setDirs(new Set());
    // text came or went while the thumb was on the pad: now it may move
    if (padStay) {
      padStay = false;
      layoutSoon();
    }
  };
  pad.addEventListener('pointerup', endPad);
  pad.addEventListener('pointercancel', endPad);
  /** The pad moved away under the thumb (it made room for text): let go, don't read a new direction. */
  const releasePad = () => {
    if (padId === null) return;
    padId = null;
    pad.classList.remove('held');
    setDirs(new Set());
  };

  // ---- buttons --------------------------------------------------------------
  const bindHold = (el: HTMLElement, a: Action) => {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      capture(el, e.pointerId);
      el.classList.add('down');
      input.setVirtual(a, true);
      buzz();
    });
    const up = () => {
      el.classList.remove('down');
      input.setVirtual(a, false);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  bindHold(btnA, 'confirm');
  bindHold(btnB, 'cancel');
  bindHold(btnM, 'menu');

  // ダッシュ is a toggle: one tap to run, another to walk.
  let dashOn = false;
  btnD.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dashOn = !dashOn;
    btnD.classList.toggle('on', dashOn);
    input.setVirtual('dash', dashOn);
    buzz();
  });

  let backAway = false;
  window.setInterval(() => {
    if (!active) return;
    const away = !backShown();
    if (away === backAway) return;
    backAway = away;
    btnB.classList.toggle('away', away);
  }, 80);

  // Tapping the picture = けってい (advance text, talk). Holding it holds
  // けってい too (the battle's 「長押し！」 works on the picture as well as on
  // the button); a quick tap still lasts at least 90ms.
  const canvas = document.getElementById('screen');
  canvas?.addEventListener('pointerdown', (e) => {
    if (!active || e.pointerType === 'mouse') return;
    input.setVirtual('confirm', true);
    const id = e.pointerId;
    const t0 = performance.now();
    capture(canvas, id);
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      const left = Math.max(0, 90 - (performance.now() - t0));
      window.setTimeout(() => input.setVirtual('confirm', false), left);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  });

  // ---- layout -----------------------------------------------------------------
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const place = (el: HTMLElement, x: number, y: number, w: number, h: number, font?: number) => {
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
    el.style.width = `${Math.round(w)}px`;
    el.style.height = `${Math.round(h)}px`;
    if (font) el.style.fontSize = `${Math.round(font)}px`;
  };

  type Box = { x: number; y: number; w: number; h: number };

  /** Largest D-pad that fits in a box (with メニュー above it when asked). */
  const padFit = (b: Box, M: number, pillH: number, withPill: boolean) =>
    Math.min(b.w - 2 * M, b.h - 2 * M - (withPill ? pillH + M : 0));
  /** Largest けってい button that fits in a box (with ダッシュ above it when asked). */
  const btnFit = (b: Box, M: number, pillH: number, withPill: boolean) =>
    Math.min((b.w - 2 * M) / 1.95, (b.h - 2 * M - (withPill ? pillH + M : 0)) / 1.26);

  // A tablet held sideways (full screen; the controls keep off the text) and
  // whether its picture is shrunk with the controls beside it right now.
  let sideways = false;
  let sideCols = false;
  let zoomT = 0;
  /** The last spots placed (sideways), and how the clusters fitted (QA). */
  let lastPlan: Record<string, Box> | null = null;
  let lastFit = '';

  const fitW = (w: number, h: number) => Math.max(0, Math.min(w, (h * W) / H));
  const fitFont = (f: number, w: number, chars: number) => Math.min(f, (w - 10) / (chars * 1.08));
  /** Device px per game px for a picture `g` CSS px wide; a whole number when that costs under 3%. */
  const scaleFor = (g: number, dpr: number) => {
    let sc = Math.max(1, (g * dpr) / W);
    if ((sc - Math.floor(sc)) / sc < 0.03) sc = Math.floor(sc);
    return sc;
  };

  // ---- a tablet held sideways ------------------------------------------------------
  /** A control's spot; `ghost` = room kept clear without an element (the けってい word tag). */
  type Spot = Box & { font?: number; ghost?: boolean; sh?: number; ring?: number };
  type Cluster = Record<string, Spot>;
  const SHADOW = 5; // the ink shadow under a button, outside its box
  const AIR = 4; // between a control (and its shadow) and a text box, CSS px
  /**
   * Sizes (× the corner size) and pill placement (false: above, true: beside)
   * tried in order when a gap is low — only a little smaller: below 0.8 the
   * picture shrinks and the controls stand beside it instead.
   */
  const TRIES: [number, boolean][] = [
    [1, false],
    [0.9, false],
    [1, true],
    [0.9, true],
    [0.8, false],
    [0.8, true],
  ];
  const meets = (a: Box, rs: Box[]) => rs.some((r) => a.x < r.x + r.w && a.x + a.w > r.x && a.y < r.y + r.h && a.y + a.h > r.y);
  /** What a spot must keep clear (its box, the shadow under it, the gold ring of a hint, and air), moved down by dy. */
  const keepClear = (p: Spot, dy: number): Box => {
    const e = AIR + (p.ring ?? 0);
    return { x: p.x - e, y: dy + p.y - e, w: p.w + 2 * e, h: p.h + (p.sh ?? SHADOW) + 2 * e };
  };
  /**
   * The lowest bottom edge (≤ yMax) for a cluster of controls (parts' y are
   * relative to that edge) where no part meets a text box nor rises above
   * yMin; null when there is none.
   */
  const drop = (parts: Spot[], rs: Box[], yMin: number, yMax: number): number | null => {
    const cands = [yMax];
    // (whole px, rounded up the screen: a float hair must not make a spot that just fits fail)
    for (const r of rs) for (const p of parts) cands.push(Math.floor(r.y - AIR - (p.ring ?? 0) - (p.y + p.h + (p.sh ?? SHADOW)) - 1e-6));
    cands.sort((a, b) => b - a);
    for (const yb of cands) {
      if (yb > yMax) continue;
      if (parts.some((p) => yb + p.y - (p.ring ?? 0) < yMin)) return null;
      if (!parts.some((p) => meets(keepClear(p, yb), rs))) return yb;
    }
    return null;
  };

  /**
   * Full screen on a tablet held sideways. With no text on screen the
   * controls sit in the bottom corners as always. Text boxes (a dialog
   * window and its name tag, a choice, a battle's band and panels) push each
   * cluster up to just above them — the lowest spot that is clear, a little
   * smaller or with メニュー/ダッシュ beside rather than above when the gap is
   * low. A text screen (the menu, a shop), or text that leaves no gap, shrinks
   * the picture a little and stands the controls beside it. Brief words (the
   * battle's 「長押し！」…) move nothing: the controls in their way fade out
   * while they are up.
   */
  const layoutSideways = (vw: number, vh: number, dpr: number, S0: number, M: number, pill: { w: number; h: number }, bw0: number, safeB: number, glide: boolean) => {
    const body = document.body;
    const zones = uiBands();
    const yMax = vh - safeB - M;
    const yMin = 6;
    const y0 = vh * 0.42;
    const half: Box = { x: 0, y: y0, w: vw / 2, h: vh - y0 - safeB };
    const S1 = Math.max(96, Math.min(S0 * 0.85, padFit(half, M, pill.h, true)));
    const bw1 = Math.max(58, Math.min(bw0 * 0.85, btnFit(half, M, pill.h, true)));
    const font = clamp(S0 * 0.85 * 0.11, 13, 20);
    const pillAt = (s: number) => {
      const w = Math.max(80, pill.w * s);
      return { w, h: Math.max(30, pill.h * s), font: fitFont(font * 0.9 * Math.max(0.8, s), w - 12, 5) };
    };
    // the word tag of けってい (setButtonHint: 「長押し」「はなす！」) at font
    // .82em of the button's, beating up to 1.1×: above the button, or left of it
    const hintAt = (A: Spot, left: boolean): Spot => {
      const hf = (A.font ?? font) * 0.82;
      const w = (hf * 5.3 + 6) * 1.1;
      const h = (hf * 1.55 + 9) * 1.1;
      return left
        ? { x: A.x - hf * 0.45 - w, y: A.y + A.h / 2 - h / 2, w, h, ghost: true, sh: 0 }
        : { x: A.x + A.w / 2 - w / 2, y: A.y - hf * 0.5 - h, w, h, ghost: true, sh: 0 };
    };
    // D-pad with メニュー above (or beside) it, anchored at its bottom-left
    const leftAt = (s: number, beside: boolean, x: number): Cluster => {
      const S = S1 * s;
      const p = pillAt(s);
      const gap = M * s;
      return {
        pad: { x, y: -S, w: S, h: S, sh: Math.max(SHADOW, S * 0.04) },
        M: beside ? { x: x + S + gap, y: -S / 2 - p.h / 2, ...p } : { x: x + (S - p.w) / 2, y: -S - gap - p.h, ...p },
      };
    };
    // けってい / もどる in a thumb arc with ダッシュ above (or beside), anchored at its bottom-right
    const rightAt = (s: number, beside: boolean, xr: number): Cluster => {
      const bw = bw1 * s;
      const bs = bw * 0.84;
      const p = pillAt(s);
      const gap = M * s;
      const left = xr - bw * 1.95;
      const aX = left + bw * 0.95;
      const aY = -bw * 1.26;
      const f = font * Math.max(0.8, s);
      const A: Spot = { x: aX, y: aY, w: bw, h: bw, font: fitFont(f, bw, 4), ring: 6 };
      return {
        A,
        B: { x: left, y: aY + bw * 0.42, w: bs, h: bs, font: fitFont(f * 0.92, bs, 3) },
        D: beside ? { x: left - gap - p.w, y: aY / 2 - p.h / 2, ...p } : { x: aX + bw - p.w, y: aY - gap - p.h, ...p },
        H: hintAt(A, beside),
      };
    };
    const frame = (sc: number) => {
      const w = (W * sc) / dpr;
      const h = (H * sc) / dpr;
      return { x: (vw - w) / 2, y: (vh - h) / 2, k: w / W };
    };
    const onScreen = (rs: readonly Box[], f: { x: number; y: number; k: number }) =>
      rs.map((r) => ({ x: f.x + r.x * f.k, y: f.y + r.y * f.k, w: r.w * f.k, h: r.h * f.k }));

    let sc = scaleFor(fitW(vw, vh), dpr);
    let plan: Cluster | null = null;
    const fit: string[] = [];
    let hintLeft = false;
    if (!zones.full) {
      const rs = onScreen(zones.rects, frame(sc));
      const settle = (build: (s: number, beside: boolean) => Cluster): [Cluster, boolean] | null => {
        for (const [s, beside] of TRIES) {
          const c = build(s, beside);
          const parts = Object.values(c);
          const yb = drop(parts, rs, yMin, yMax);
          if (yb === null) continue;
          for (const p of parts) p.y += yb;
          fit.push(`${s}${beside ? ' beside' : ''}`);
          return [c, beside];
        }
        fit.push('-');
        return null;
      };
      const l = settle((s, beside) => leftAt(s, beside, M * 1.4));
      const r = settle((s, beside) => rightAt(s, beside, vw - M * 1.4));
      if (l && r) {
        const lRight = Math.max(...Object.values(l[0]).map((p) => p.x + p.w));
        const rLeft = Math.min(...Object.values(r[0]).map((p) => p.x));
        if (lRight + M < rLeft) {
          plan = { ...l[0], ...r[0] };
          hintLeft = r[1];
        }
      }
    }
    const cols = !plan;
    // the pad doesn't slide out from under a thumb walking on it (a place
    // name, a dialog starting mid-step: the thumb hides that spot anyway);
    // it moves when the thumb lets go
    if (plan && glide && padId !== null && !sideCols && lastPlan?.pad && lastPlan.M) {
      plan.pad = { ...lastPlan.pad, sh: plan.pad.sh };
      plan.M = { ...lastPlan.M, font: plan.M.font };
      padStay = true;
    }
    if (!plan) {
      // the picture a little smaller, the controls in the columns beside it:
      // the D-pad with メニュー above it on the left; けってい at the bottom
      // right, もどる above it and ダッシュ above that
      sc = scaleFor(fitW(vw - 2 * clamp(vw * 0.13, 118, 160), vh), dpr);
      const col = frame(sc).x;
      const m = clamp(col * 0.07, 8, 12);
      const cc = col - 2 * m;
      const S = Math.min(S1, cc);
      const p = pillAt(1);
      const pw = Math.min(p.w, cc);
      const gap = M * 0.8;
      const bw = Math.min(bw1, cc / 1.3);
      const bs = bw * 0.84;
      const aY = yMax - bw;
      const bY = aY - 8 - bs;
      plan = {
        pad: { x: (col - S) / 2, y: yMax - S, w: S, h: S },
        M: { x: (col - pw) / 2, y: yMax - S - gap - p.h, w: pw, h: p.h, font: fitFont(p.font, pw - 12, 5) },
        A: { x: vw - m - bw, y: aY, w: bw, h: bw, font: fitFont(font, bw, 4), ring: 6 },
        B: { x: vw - col + m, y: bY, w: bs, h: bs, font: fitFont(font * 0.92, bs, 3) },
        D: { x: vw - col + (col - pw) / 2, y: bY - gap - p.h, w: pw, h: p.h, font: fitFont(p.font, pw - 12, 5) },
      };
    }

    root.classList.toggle('glide', glide);
    root.classList.toggle('overlay', !cols);
    root.classList.toggle('hl', hintLeft);
    if (sc !== screen!.fixedScale) {
      // switching to / from a text screen: the picture eases to its new size
      const cv = screen!.display;
      window.clearTimeout(zoomT);
      cv.classList.toggle('tc-zoom', glide && cols !== sideCols);
      zoomT = window.setTimeout(() => cv.classList.remove('tc-zoom'), 260);
      screen!.fixedScale = sc;
      screen!.resize();
      screen!.present();
    }
    sideCols = cols;
    body.style.boxSizing = 'border-box';
    body.style.alignItems = 'center';
    body.style.paddingTop = '';
    const was = pad.style.cssText;
    const els: Record<string, HTMLElement> = { pad, M: btnM, A: btnA, B: btnB, D: btnD };
    // brief words: whatever is in their way fades out while they are up
    const brief = onScreen(zones.brief, frame(sc));
    for (const [k, p] of Object.entries(plan)) {
      const el = els[k];
      if (!el) continue;
      place(el, p.x, p.y, p.w, p.h, p.font);
      el.classList.toggle('veil', meets(keepClear(p, 0), brief));
    }
    if (pad.style.cssText !== was) releasePad();
    lastPlan = plan;
    lastFit = cols ? 'beside the picture' : `left ${fit[0]}, right ${fit[1]}`;
  };

  const layout = (glide = false) => {
    if (!screen) return;
    const body = document.body;
    if (!active) {
      screen.fixedScale = null;
      screen.resize();
      body.style.alignItems = '';
      body.style.paddingTop = '';
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const portrait = vh > vw;
    // a tablet by its own screen, not only the window: inside the Claude app an
    // iPad's page can be as low as ~540 CSS px (2026-09-28)
    const scr = window.screen;
    const tablet = Math.min(vw, vh) >= 600 || (!!scr && Math.min(scr.width, scr.height) >= 700);
    let S0 = clamp(Math.min(vw, vh) * (portrait ? 0.42 : 0.34), 120, 200); // wanted D-pad size
    const M = clamp(S0 * 0.12, 12, 24); // margin
    const safeB = portrait ? 22 : 8; // home indicator
    const pill = { w: clamp(S0 * 0.62, 84, 124), h: clamp(S0 * 0.24, 34, 46) };
    let bw0 = clamp(S0 * 0.6, 70, 116); // wanted けってい size
    // A tablet held sideways plays full screen: the picture as big as the
    // window allows, the translucent controls floating over its bottom
    // corners (2026-09-28, the client on an iPad: first the controls in the
    // middle hid the field, then the picture shrunk above a control band was
    // too small) — and off the text (「キーと文字がかぶるのは避けたい」).
    // Upright, the band below the picture is free anyway.
    sideways = tablet && !portrait;
    if (sideways) {
      layoutSideways(vw, vh, dpr, S0, M, pill, bw0, safeB, glide);
      return;
    }
    sideCols = false;
    root.classList.remove('glide', 'hl');
    for (const el of [pad, btnA, btnB, btnD, btnM]) el.classList.remove('veil');
    const minS = Math.max(104, S0 * 0.66);
    const minBw = Math.max(60, bw0 * 0.66);

    // How wide can the picture get with the controls beside it, below it, or
    // floating over it? (CSS px; the picture keeps its 16:9 shape)
    const midRoom = (S: number, bw: number) => vw - 2.8 * M - S - 1.95 * bw - 2 * M >= 2 * pill.w + M;
    const sideNeed = Math.max(minS, 1.95 * minBw) + 2 * M;
    const bandNeed = Math.max(minS, 1.26 * minBw) + 2 * M + 8 + safeB + (midRoom(minS, minBw) ? 0 : pill.h + M);
    const gSide = portrait ? 0 : fitW(vw - 2 * sideNeed, vh);
    const gBottom = fitW(vw, vh - bandNeed);
    const gFill = fitW(vw, vh);
    let mode: Mode = gSide >= gBottom ? 'side' : 'bottom';
    let g = Math.max(gSide, gBottom);
    // Elsewhere only a very cramped window floats the controls over the picture.
    if (g <= 0 || g < gFill * 0.55) {
      mode = 'overlay';
      g = gFill;
    } else if (mode === 'side' ? g < (vh * W) / H - 0.5 : g < vw - 0.5) {
      g *= 0.97; // the controls are what limits the picture: give them a little air
    }
    // device px per game px; a whole number when that costs under 3%
    const sc = scaleFor(g, dpr);
    screen.fixedScale = sc;
    screen.resize();
    const gw = (W * sc) / dpr;
    const gh = (H * sc) / dpr;
    root.classList.toggle('overlay', mode === 'overlay');
    body.style.boxSizing = 'border-box';

    // the two areas the clusters live in: left (D-pad, メニュー), right (buttons, ダッシュ)
    let L: Box, R: Box;
    if (mode === 'side') {
      const sw = (vw - gw) / 2;
      L = { x: 0, y: 0, w: sw, h: vh - safeB };
      R = { x: vw - sw, y: 0, w: sw, h: vh - safeB };
    } else if (mode === 'bottom') {
      const top = gh + 8;
      L = { x: 0, y: top, w: vw / 2, h: vh - top - safeB };
      R = { x: vw / 2, y: top, w: vw / 2, h: vh - top - safeB };
    } else if (tablet) {
      // (a cramped upright tablet) the D-pad in the bottom-left corner,
      // けってい/もどる in the bottom-right, メニュー/ダッシュ above them —
      // never the middle of the picture
      const y0 = vh * 0.42;
      L = { x: 0, y: y0, w: vw / 2, h: vh - y0 - safeB };
      R = { x: vw / 2, y: y0, w: vw / 2, h: vh - y0 - safeB };
      S0 *= 0.85;
      bw0 *= 0.85;
    } else {
      L = { x: 0, y: 0, w: vw / 2, h: vh - safeB };
      R = { x: vw / 2, y: 0, w: vw / 2, h: vh - safeB };
    }

    // In a wide bottom band メニュー and ダッシュ move to the free middle;
    // otherwise they sit above the D-pad and above けってい.
    let S = Math.max(96, Math.min(S0, padFit(L, M, pill.h, false)));
    let bw = Math.max(58, Math.min(bw0, btnFit(R, M, pill.h, false)));
    const midW = vw - 2 * M * 1.4 - S - bw * 1.95 - 2 * M;
    const midPills = mode === 'bottom' && midW >= 2 * pill.w + M;
    if (!midPills) {
      S = Math.max(96, Math.min(S0, padFit(L, M, pill.h, true)));
      bw = Math.max(58, Math.min(bw0, btnFit(R, M, pill.h, true)));
    }
    const font = clamp(S0 * 0.11, 13, 20);

    // ---- left: D-pad
    const padX = mode === 'side' ? L.x + (L.w - S) / 2 : L.x + M * 1.4;
    const padY = L.y + L.h - S - M;
    place(pad, padX, padY, S, S);

    // ---- right: けってい / もどる in a thumb arc
    const cw = bw * 1.95;
    const left = mode === 'side' ? R.x + (R.w - cw) / 2 : R.x + R.w - cw - M * 1.4;
    const aX = left + bw * 0.95;
    const aY = R.y + R.h - M - bw * 1.26;
    const bs = bw * 0.84;
    place(btnA, aX, aY, bw, bw, fitFont(font, bw, 4));
    place(btnB, left, aY + bw * 0.42, bs, bs, fitFont(font * 0.92, bs, 3));

    // ---- メニュー / ダッシュ
    const pf = fitFont(font * 0.9, pill.w - 12, 5);
    if (midPills) {
      const my = padY + (S - pill.h) / 2;
      const mx = (padX + S + left) / 2;
      place(btnM, mx - pill.w - M / 2, my, pill.w, pill.h, pf);
      place(btnD, mx + M / 2, my, pill.w, pill.h, pf);
    } else {
      place(btnM, padX + (S - pill.w) / 2, padY - pill.h - M, pill.w, pill.h, pf);
      place(btnD, aX + bw - pill.w, aY - pill.h - M, pill.w, pill.h, pf);
    }

    // Portrait: float the picture in the empty area above the controls instead
    // of pinning it to the top edge.
    if (mode === 'bottom') {
      const ctrlTop = Math.min(padY, aY, midPills ? padY : padY - pill.h - M, midPills ? aY : aY - pill.h - M);
      const free = ctrlTop - M - gh;
      body.style.alignItems = 'flex-start';
      body.style.paddingTop = `${Math.max(0, Math.round(free * (portrait ? 0.42 : 0.5)))}px`;
    } else {
      body.style.alignItems = 'center';
      body.style.paddingTop = '';
    }
  };

  const activate = () => {
    if (active) return;
    active = true;
    touchShown = true;
    root.classList.add('on');
    layout();
  };
  let queued = 0;
  const relayout = () => {
    cancelAnimationFrame(queued);
    queued = requestAnimationFrame(() => layout());
  };
  // Text came, moved or went (told at the end of the frame that drew it,
  // before it is shown): the controls glide out of its way at once, and back
  // only once it has stayed gone a moment (between two lines, a page turn).
  layoutSoon = () => {
    if (active && sideways) layout(true);
  };
  let calmT = 0;
  onTextZones(() => {
    if (!active || !sideways) return;
    window.clearTimeout(calmT);
    const z = uiBands();
    if (z.full || z.rects.length || z.brief.length) layout(true);
    else calmT = window.setTimeout(() => layout(true), 220);
  });
  layoutInfo = () => ({ active, sideways, sideCols, scale: screen?.fixedScale ?? null, fit: sideways ? lastFit : '' });
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', relayout);
  window.addEventListener('touchstart', activate, { once: true, passive: true });
  // iOS Safari pinch / double-tap zoom would fight the controls
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  const coarse = window.matchMedia?.('(pointer: coarse)').matches && !window.matchMedia?.('(pointer: fine)').matches;
  if (coarse || new URLSearchParams(location.search).has('touch')) activate();
}

/** True when a touch-first device is detected (used for gentler defaults). */
export function isTouchDevice(): boolean {
  return !!window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
}
