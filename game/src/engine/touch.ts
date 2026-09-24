// On-screen touch controls for phones and tablets (DOM overlay).
//
//  - A cross-shaped D-pad (十字キー): slide the thumb over it; 8 directions.
//  - 「けってい」(confirm), 「もどる」(cancel), 「ダッシュ」(toggle: stays on
//    until tapped again) and 「メニュー」.
//  - Tapping the game picture itself counts as けってい (advancing text).
//
// Layout adapts to the device: the game picture gives up part of the screen
// so the controls sit beside it (phone, landscape) or below it (phone and
// tablet, portrait; tablet landscape), and only falls back to translucent
// controls over the picture when reserving space would shrink it too much.

import type { Action, Input } from './input';
import { H, W, type Screen } from './screen';

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
  transition:transform 50ms,box-shadow 50ms,background 80ms}
.tc-btn.down{transform:translateY(3px);box-shadow:0 1px 0 ${INK}}
.tc-a{background:${SHU};color:${PAPER}}
.tc-a.down{background:#B8241E}
.tc-b.down,.tc-m.down{background:${TAPE}}
.tc-d.on{background:${TAPE}}
.tc-d .lamp{display:inline-block;width:.55em;height:.55em;border-radius:50%;border:2px solid ${INK};margin-right:.35em;background:${PAPER}}
.tc-d.on .lamp{background:${SHU}}
.tc.overlay .tc-pad,.tc.overlay .tc-btn{opacity:.62}
.tc.overlay .tc-pad:active,.tc.overlay .tc-btn.down{opacity:.9}
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

export function installTouch(input: Input, screen?: Screen): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = div('tc', document.body);
  const pad = div('tc-pad', root);
  pad.appendChild(buildDpad());
  const btnA = div('tc-btn tc-a', root, 'けってい');
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
    capture(pad, e.pointerId);
    padMove(e);
  });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId === padId) padMove(e);
  });
  const endPad = (e: PointerEvent) => {
    if (e.pointerId !== padId) return;
    padId = null;
    setDirs(new Set());
  };
  pad.addEventListener('pointerup', endPad);
  pad.addEventListener('pointercancel', endPad);

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

  // Tapping the picture = けってい (advance text, talk).
  const canvas = document.getElementById('screen');
  canvas?.addEventListener('pointerdown', (e) => {
    if (!active || e.pointerType === 'mouse') return;
    input.setVirtual('confirm', true);
    const release = () => input.setVirtual('confirm', false);
    window.setTimeout(release, 90);
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
  type Plan = { mode: Mode; scale: number };

  /** Largest D-pad that fits in a box (with メニュー above it when asked). */
  const padFit = (b: Box, M: number, pillH: number, withPill: boolean) =>
    Math.min(b.w - 2 * M, b.h - 2 * M - (withPill ? pillH + M : 0));
  /** Largest けってい button that fits in a box (with ダッシュ above it when asked). */
  const btnFit = (b: Box, M: number, pillH: number, withPill: boolean) =>
    Math.min((b.w - 2 * M) / 1.95, (b.h - 2 * M - (withPill ? pillH + M : 0)) / 1.26);

  const layout = () => {
    if (!screen) return;
    const body = document.body;
    if (!active) {
      screen.reserveW = screen.reserveH = 0;
      screen.resize();
      body.style.alignItems = '';
      body.style.paddingTop = '';
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const portrait = vh > vw;
    const S0 = clamp(Math.min(vw, vh) * (portrait ? 0.42 : 0.34), 120, 200); // wanted D-pad size
    const M = clamp(S0 * 0.12, 12, 24); // margin
    const safeB = portrait ? 22 : 8; // home indicator
    const pill = { w: clamp(S0 * 0.62, 84, 124), h: clamp(S0 * 0.24, 34, 46) };
    const bw0 = clamp(S0 * 0.6, 70, 116); // wanted けってい size
    const minS = Math.max(104, S0 * 0.66);
    const minBw = Math.max(60, bw0 * 0.66);

    // Pick the biggest whole-pixel game scale that still leaves room for the
    // controls beside or below the picture; overlay only as a last resort.
    const over = Math.max(1, Math.floor(Math.min((vw * dpr) / W, (vh * dpr) / H)));
    const sideBoxes = (gw: number): [Box, Box] => {
      const sw = (vw - gw) / 2;
      return [
        { x: 0, y: 0, w: sw, h: vh - safeB },
        { x: vw - sw, y: 0, w: sw, h: vh - safeB },
      ];
    };
    const bottomBoxes = (gh: number): [Box, Box] => {
      const top = gh + 8;
      const h = vh - top - safeB;
      return [
        { x: 0, y: top, w: vw / 2, h },
        { x: vw / 2, y: top, w: vw / 2, h },
      ];
    };
    let plan: Plan = { mode: 'overlay', scale: over };
    for (let s = over; s >= 1 && s >= over * 0.66; s--) {
      const gw = (W * s) / dpr;
      const gh = (H * s) / dpr;
      if (gh > vh || gw > vw) continue;
      if (!portrait) {
        const [l, r] = sideBoxes(gw);
        if (padFit(l, M, pill.h, true) >= minS && btnFit(r, M, pill.h, true) >= minBw) {
          plan = { mode: 'side', scale: s };
          break;
        }
      }
      const [l, r] = bottomBoxes(gh);
      if (padFit(l, M, pill.h, false) >= minS && btnFit(r, M, pill.h, false) >= minBw) {
        plan = { mode: 'bottom', scale: s };
        break;
      }
    }
    const mode = plan.mode;
    root.classList.toggle('overlay', mode === 'overlay');
    const gw = (W * plan.scale) / dpr;
    const gh = (H * plan.scale) / dpr;
    // (half a pixel of slack so rounding never costs a whole scale step)
    screen.reserveW = mode === 'side' ? vw - gw - 0.5 : 0;
    screen.reserveH = mode === 'bottom' ? vh - gh - 0.5 : 0;
    screen.resize();
    body.style.boxSizing = 'border-box';

    // the two areas the clusters live in: left (D-pad, メニュー), right (buttons, ダッシュ)
    let L: Box, R: Box;
    if (mode === 'side') [L, R] = sideBoxes(gw);
    else if (mode === 'bottom') [L, R] = bottomBoxes(gh);
    else {
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
    const fitFont = (f: number, w: number, chars: number) => Math.min(f, (w - 10) / (chars * 1.08));

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
    root.classList.add('on');
    layout();
  };
  let queued = 0;
  const relayout = () => {
    cancelAnimationFrame(queued);
    queued = requestAnimationFrame(() => layout());
  };
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
