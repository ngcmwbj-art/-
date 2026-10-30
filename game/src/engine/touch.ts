// On-screen touch controls for phones and tablets (DOM overlay).
//
//  - A cross-shaped D-pad (十字キー): slide the thumb over it; 8 directions.
//  - 「けってい」(confirm), 「もどる」(cancel), 「ダッシュ」(toggle: stays on
//    until tapped again) and 「メニュー」.
//  - Tapping the game picture itself counts as けってい (advancing text).
//    In a close-up game (大写し: a Widget with closeup, the battle's timing
//    words) the black round the picture counts too, held or tapped
//    (改善会議 2026-10-24 の 1): a small 「どこでも タッチ」 in a corner and a
//    soft 「とん」. Walking around it stays the picture only; もどる is never
//    widened.
//
// Layout adapts to the device. The picture is scaled smoothly (not only in
// whole steps) to the biggest size that leaves the controls beside it (phone,
// landscape) or below it (portrait; an upright tablet). A tablet held
// sideways plays full screen: the picture fills the window and translucent
// controls float over its bottom corners (also any window too cramped for
// either layout). There they stay fixed in the corners whatever text comes
// (2026-09-30, the client: 「ボタンは移動させない」): the text keeps off
// them instead — they are published in game px (engine/safezones.ts) and
// the dialog window narrows, the battle lays out its panels between them,
// and so on — a text screen (the menu, a shop) as well (2026-10-01).
// Brief words fade out the controls in their way (textzones.ts).
//
// An upright phone / tablet (改善会議 2026-10-29 の3): when the band between
// the picture and the controls has room, the next goal (つぎの目当て, the
// same line as the 手帳's tape: ui/menu/goal.ts gives it with setTouchGoal)
// sits there in one line, in the buttons' ink on their paper. Only while
// Minato walks about (not in a talk, a close-up, a battle or a menu); never
// sideways (the 手帳 has it).

import type { Action, Input } from './input';
import { H, W, type Screen } from './screen';
import { setButtonZones, type Zone } from './safezones';
import { onTextZones, uiBands } from './textzones';
import { viewOnly } from './viewonly';

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
.tc-hint{position:absolute;left:50%;bottom:calc(100% + .5em);display:none;padding:.3em .55em .25em;
  background:${PAPER};color:${SHU};border:3px solid ${INK};border-radius:.4em;box-shadow:0 3px 0 ${INK};
  font-size:.82em;white-space:nowrap;pointer-events:none;transform:translateX(-50%);animation:tcBeat .56s ease-in-out infinite alternate}
.tc-hint.on{display:block}
.tc-hint.go{background:#FFD23F;color:${INK};animation-duration:.18s}
.tc-any{position:absolute;display:none;padding:.2em .5em .15em;font-family:GameFont,"Hiragino Sans","Noto Sans JP",sans-serif;
  font-size:12px;line-height:1;letter-spacing:.06em;white-space:nowrap;color:${PAPER};background:rgba(42,36,64,.72);
  border:2px solid rgba(251,243,220,.55);border-radius:.4em;pointer-events:none;opacity:.9;transition:opacity .4s}
.tc-any.on{display:block}
.tc-any.dim{opacity:.45}
.tc-goal{position:absolute;display:none;align-items:center;gap:.45em;max-width:calc(100% - 24px);padding:.32em .7em .26em;
  font-family:GameFont,"Hiragino Sans","Noto Sans JP",sans-serif;line-height:1;letter-spacing:.04em;white-space:nowrap;overflow:hidden;
  color:${INK};background:${PAPER};border:2px solid ${INK};border-radius:.4em;box-shadow:0 2px 0 ${INK};pointer-events:none;
  transform:translateX(-50%);opacity:0;transition:opacity .2s}
.tc-goal.on{display:flex}
.tc-goal.show{opacity:1}
.tc-goal .flag{flex:none;width:.5em;height:.95em;border-left:2px solid ${INK};position:relative}
.tc-goal .flag::after{content:"";position:absolute;left:0;top:0;width:.45em;height:.4em;background:${SHU}}
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
let closeupShown: () => boolean = () => false;
let anywhereTap: (() => void) | null = null;

let layoutInfo: () => { active: boolean; sideways: boolean; scale: number | null; fit: string } = () => ({
  active: false,
  sideways: false,
  scale: null,
  fit: '',
});
/** QA: the touch layout's state (a sideways tablet: full screen, the controls fixed). */
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

/**
 * Tell the controls when a close-up game (大写し) is up: then a touch on the
 * black round the picture is けってい too (held: held). `tap` plays the soft
 * sound of such a touch.
 */
export function setCloseupShown(fn: () => boolean, tap?: () => void): void {
  closeupShown = fn;
  anywhereTap = tap ?? null;
}

/** A close-up's touch pick (ui/closeup.ts, 改善会議 2026-10-30 の1): game px → what the tap does. */
export type PickTapResult = 'pass' | 'eat' | 'confirm';
let canvasPick: ((x: number, y: number) => PickTapResult) | null = null;
let pickBusy: () => boolean = () => false;
/**
 * 指で さわって 選ぶ（改善会議 2026-10-30 の1）: `tap` is asked first with a touch on the picture
 * (game px): 'pass' = けってい as before, 'eat' = nothing more (the cursor moved), 'confirm' =
 * けってい. `busy`: a close-up is choosing now — a touch off the picture is not けってい then
 * (and the 「どこでも タッチ」 word steps aside). A mouse click on the picture asks `tap` too.
 */
export function setCanvasPick(tap: (x: number, y: number) => PickTapResult, busy: () => boolean): void {
  canvasPick = tap;
  pickBusy = busy;
}

let goalSource: () => string | null = () => null;
/**
 * The next goal's line for the band under the picture (an upright phone /
 * tablet), or null when it should not be shown (a talk, a close-up, a
 * battle, a menu, the title). Asked a few times a second.
 */
export function setTouchGoal(fn: () => string | null): void {
  goalSource = fn;
}

let goalInfo: () => { slot: boolean; on: boolean; text: string; box: number[] | null } = () => ({ slot: false, on: false, text: '', box: null });
/** QA: the goal line under the picture (is there room, is it up, its words, its box in CSS px). */
export function touchGoalInfo(): ReturnType<typeof goalInfo> {
  return goalInfo();
}

let anyInfo: () => { closeup: boolean; label: boolean; taps: number } = () => ({ closeup: false, label: false, taps: 0 });
/** QA: is the 「どこでも タッチ」 mode on, its word shown, and how many touches off the picture it took. */
export function touchAnywhereInfo(): ReturnType<typeof anyInfo> {
  return anyInfo();
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
  const anyEl = div('tc-any', root, 'どこでも タッチ');
  const goalEl = div('tc-goal', root);
  div('flag', goalEl);
  const goalTx = document.createElement('span');
  goalEl.appendChild(goalTx);
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
  };
  pad.addEventListener('pointerup', endPad);
  pad.addEventListener('pointercancel', endPad);
  /** The pad moved away under the thumb (the picture changed size): let go, don't read a new direction. */
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
    syncCloseup();
    syncGoal();
    const away = !backShown();
    if (away === backAway) return;
    backAway = away;
    btnB.classList.toggle('away', away);
  }, 80);

  // ---- the next goal in the band under the picture (upright) ------------------
  /** The band's top and bottom (CSS px): the controls' top edge; set by layout, null = no band. */
  let goalBand: { bottom: number; font: number } | null = null;
  let goalShown = '';
  let goalWant = '';
  let goalTick = 0;
  let goalSwapT = 0;
  const goalNow = (): string => {
    try {
      return goalSource() ?? '';
    } catch {
      return '';
    }
  };
  /** Room under the picture (the picture's own place, read now) for one line: [top, height] or null. */
  const goalRoom = (): [number, number] | null => {
    const c = canvas?.getBoundingClientRect();
    if (!goalBand || !c || !c.height) return null;
    const top = c.bottom + 6;
    const h = goalBand.bottom - 6 - top;
    return h >= goalBand.font * 1.6 + 8 ? [top, h] : null;
  };
  const syncGoal = (force = false) => {
    const room = goalRoom();
    // the words a few times a second (a new scene / a new goal swaps them)
    if (force || ++goalTick >= 4) {
      goalTick = 0;
      goalWant = room && !closeup && !viewOnly.on ? goalNow() : '';
    }
    const want = room ? goalWant : '';
    if (room) {
      const st = goalEl.style;
      const fs = goalBand!.font;
      st.fontSize = `${fs}px`;
      st.left = '50%';
      st.top = `${Math.round(room[0] + (room[1] - (fs * 1.6 + 4)) / 2)}px`;
    }
    if (want === goalShown) return;
    window.clearTimeout(goalSwapT);
    if (!want) {
      goalShown = '';
      goalEl.classList.remove('show');
      goalSwapT = window.setTimeout(() => goalEl.classList.remove('on'), 220);
      return;
    }
    const swap = () => {
      goalShown = want;
      goalTx.textContent = want;
      goalEl.classList.add('on');
      requestAnimationFrame(() => goalEl.classList.add('show'));
    };
    // (one line to the next: out, then in with the new words)
    if (goalShown && goalEl.classList.contains('show')) {
      goalEl.classList.remove('show');
      goalShown = want;
      goalSwapT = window.setTimeout(swap, 200);
    } else swap();
  };

  // ---- a close-up game: the whole window is けってい ----------------------------
  // (the picture already is, below; here the black round it)
  let closeup = false;
  let anyTaps = 0;
  let dimT = 0;
  const closeupNow = () => {
    try {
      return (closeupShown() || !!hintBtn?.classList.contains('hint')) && !pickBusy();
    } catch {
      return false;
    }
  };
  /** The word goes in the widest black margin (above the picture, else beside it), at its right. */
  const placeAny = () => {
    const c = canvas?.getBoundingClientRect();
    const vw = window.innerWidth;
    const st = anyEl.style;
    st.left = st.right = st.top = st.bottom = '';
    if (!c) {
      st.right = '8px';
      st.top = '6px';
      return;
    }
    const top = c.top;
    const right = vw - c.right;
    if (top >= 22) {
      st.right = `${Math.max(8, Math.round(right + 4))}px`;
      st.top = `${Math.round(Math.max(4, (top - 18) / 2))}px`;
    } else if (right >= 104) {
      st.right = `${Math.round((right - 96) / 2)}px`;
      st.top = `${Math.round(c.top + 6)}px`;
    } else {
      // no black margin to speak of: the picture's top right corner, faint
      st.right = `${Math.round(right + 6)}px`;
      st.top = `${Math.round(c.top + 6)}px`;
    }
  };
  const syncCloseup = () => {
    const on = active && closeupNow();
    if (on === closeup) return;
    closeup = on;
    window.clearTimeout(dimT);
    anyEl.classList.remove('dim');
    if (on) {
      placeAny();
      // a moment at full strength, then faint (it stays while the game is up)
      dimT = window.setTimeout(() => anyEl.classList.add('dim'), 4000);
    }
    anyEl.classList.toggle('on', on);
  };
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (!active || e.pointerType === 'mouse') return;
      const t = e.target as Element | null;
      if (t === canvas || (t instanceof Element && t.closest('.tc-btn,.tc-pad'))) return;
      // the dialog window put away to look at the picture (改善会議 2026-10-28 の3): a touch
      // anywhere brings it back (けってい; the dialog takes it as 「戻す」 only), so it never seems stuck
      if (viewOnly.on) {
        e.preventDefault();
        holdConfirm(e.pointerId, window);
        return;
      }
      syncCloseup();
      if (!closeup) return;
      e.preventDefault();
      anyTaps++;
      holdConfirm(e.pointerId, window);
      buzz();
      try {
        anywhereTap?.();
      } catch {
        /* no sound */
      }
    },
    { passive: false },
  );

  // Tapping the picture = けってい (advance text, talk). Holding it holds
  // けってい too (the battle's 「長押し！」 works on the picture as well as on
  // the button); a quick tap still lasts at least 90ms. Two fingers (the
  // picture and the black round it) hold it until both have let go.
  const canvas = document.getElementById('screen');
  const holding = new Set<number>();
  const holdConfirm = (id: number, on: EventTarget) => {
    holding.add(id);
    input.setVirtual('confirm', true);
    const t0 = performance.now();
    const up = (ev: Event) => {
      if ((ev as PointerEvent).pointerId !== id) return;
      on.removeEventListener('pointerup', up);
      on.removeEventListener('pointercancel', up);
      const left = Math.max(0, 90 - (performance.now() - t0));
      window.setTimeout(() => {
        holding.delete(id);
        if (!holding.size) input.setVirtual('confirm', false);
      }, left);
    };
    on.addEventListener('pointerup', up);
    on.addEventListener('pointercancel', up);
  };
  /** A close-up's touch pick first (改善会議 2026-10-30 の1): where on the picture, in game px. */
  const pickTap = (e: PointerEvent): PickTapResult => {
    const c = canvas?.getBoundingClientRect();
    if (!canvasPick || !c || !c.width || !c.height) return 'pass';
    try {
      return canvasPick(((e.clientX - c.left) * W) / c.width, ((e.clientY - c.top) * H) / c.height);
    } catch {
      return 'pass';
    }
  };
  canvas?.addEventListener('pointerdown', (e) => {
    const mouse = e.pointerType === 'mouse';
    if (mouse ? e.button !== 0 : !active) return;
    const r = pickTap(e);
    // (a mouse: only a click on what a close-up offers — anywhere else it does nothing, as before)
    if (mouse) {
      if (r === 'confirm') holdConfirm(e.pointerId, canvas);
      return;
    }
    capture(canvas, e.pointerId);
    if (r !== 'eat') holdConfirm(e.pointerId, canvas);
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

  // A tablet held sideways (full screen; the text keeps off the controls).
  let sideways = false;
  /** How the controls stand (QA): 'fixed'. */
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
  const AIR = 4; // kept clear round each control (its shadow too) for the text, CSS px
  /**
   * The fixed spots leave the middle of the picture to the text: the left
   * cluster ends by x48 and the right one starts at x328 (game px), so a
   * dialog window between them keeps a line of 15–16 letters and the
   * battle's two status panels fit side by side. The controls are sized to
   * that (never below a phone's size, never above the old corner size).
   */
  const FREE_L = 48;
  const FREE_R = 328;
  const S_MIN = 112;
  const BW_MIN = 64;
  const meets = (a: Box, rs: Box[]) => rs.some((r) => a.x < r.x + r.w && a.x + a.w > r.x && a.y < r.y + r.h && a.y + a.h > r.y);
  /** What a spot must keep clear: its box, the shadow under it, the gold ring of a hint, and air. */
  const keepClear = (p: Spot): Box => {
    const e = AIR + (p.ring ?? 0);
    return { x: p.x - e, y: p.y - e, w: p.w + 2 * e, h: p.h + (p.sh ?? SHADOW) + 2 * e };
  };

  /**
   * Full screen on a tablet held sideways. The controls are fixed in the
   * bottom corners — the D-pad with メニュー above it, けってい / もどる in a
   * thumb arc with ダッシュ above — and stay there whatever text comes (the
   * text keeps off them: engine/safezones.ts, published here). Brief words
   * (the battle's 「長押し！」…) fade out the controls in their way while
   * they are up. A text screen (the menu, a shop) is no exception
   * (2026-10-01, the client: 「メニューと無人販売所を開くと画面が小さくなる
   * のを直して」): it lays its contents out round them too.
   */
  const layoutSideways = (vw: number, vh: number, dpr: number, S0: number, M: number, pill: { w: number; h: number }, bw0: number, safeB: number, glide: boolean) => {
    const body = document.body;
    const zones = uiBands();
    const y0 = vh * 0.42;
    const half: Box = { x: 0, y: y0, w: vw / 2, h: vh - y0 - safeB };
    // the old corner sizes: the most the fixed controls get
    const S1 = Math.max(96, Math.min(S0 * 0.85, padFit(half, M, pill.h, true)));
    const bw1 = Math.max(58, Math.min(bw0 * 0.85, btnFit(half, M, pill.h, true)));
    const font = clamp(S0 * 0.85 * 0.11, 13, 20);
    const pillAt = (s: number) => {
      const w = Math.max(80, pill.w * s);
      return { w, h: Math.max(30, pill.h * s), font: fitFont(font * 0.9 * Math.max(0.8, s), w - 12, 5) };
    };
    // the word tag of けってい (setButtonHint: 「長押し」「はなす！」) at font
    // .82em of the button's, beating up to 1.1×: above the button
    const hintAt = (A: Spot): Spot => {
      const hf = (A.font ?? font) * 0.82;
      const w = (hf * 5.3 + 6) * 1.1;
      const h = (hf * 1.55 + 9) * 1.1;
      return { x: A.x + A.w / 2 - w / 2, y: A.y - hf * 0.5 - h, w, h, ghost: true, sh: 0 };
    };
    const frame = (sc: number) => {
      const w = (W * sc) / dpr;
      const h = (H * sc) / dpr;
      return { x: (vw - w) / 2, y: (vh - h) / 2, k: w / W };
    };
    const onScreen = (rs: readonly Box[], f: { x: number; y: number; k: number }) =>
      rs.map((r) => ({ x: f.x + r.x * f.k, y: f.y + r.y * f.k, w: r.w * f.k, h: r.h * f.k }));

    const sc = scaleFor(fitW(vw, vh), dpr);
    // the fixed spots (the same for every screen, a text screen too)
    const f = frame(sc);
    const m = clamp(M * 0.65, 12, 16); // from the window's edges
    const yb = vh - safeB - m; // the clusters' bottom edge
    const gap = clamp(M * 0.45, 8, 12);
    const S = clamp(FREE_L * f.k - AIR + f.x - m, S_MIN, S1);
    const bw = clamp((vw - m - f.x - FREE_R * f.k - AIR) / 1.95, BW_MIN, bw1);
    const bs = bw * 0.84;
    const p = pillAt(1);
    const pw = Math.min(p.w, S - 4);
    const xr = vw - m;
    const left = xr - bw * 1.95;
    const aX = left + bw * 0.95;
    const aY = yb - bw * 1.26;
    const A: Spot = { x: aX, y: aY, w: bw, h: bw, font: fitFont(font, bw, 4), ring: 6 };
    const plan: Cluster = {
      pad: { x: m, y: yb - S, w: S, h: S, sh: Math.max(SHADOW, S * 0.04) },
      M: { x: m + (S - pw) / 2, y: yb - S - gap - p.h, w: pw, h: p.h, font: fitFont(p.font, pw - 12, 5) },
      A,
      B: { x: left, y: aY + bw * 0.42, w: bs, h: bs, font: fitFont(font * 0.92, bs, 3) },
      D: { x: xr - p.w, y: aY - gap - p.h, ...p },
      H: hintAt(A),
    };

    root.classList.toggle('glide', glide);
    root.classList.add('overlay');
    root.classList.remove('hl');
    if (sc !== screen!.fixedScale) {
      screen!.fixedScale = sc;
      screen!.resize();
      screen!.present();
    }
    body.style.boxSizing = 'border-box';
    body.style.alignItems = 'center';
    body.style.paddingTop = '';
    const was = pad.style.cssText;
    const els: Record<string, HTMLElement> = { pad, M: btnM, A: btnA, B: btnB, D: btnD };
    // brief words: whatever is in their way fades out while they are up
    const brief = onScreen(zones.brief, f);
    for (const [k, p] of Object.entries(plan)) {
      const el = els[k];
      if (!el) continue;
      place(el, p.x, p.y, p.w, p.h, p.font);
      el.classList.toggle('veil', meets(keepClear(p), brief));
    }
    if (pad.style.cssText !== was) releasePad();
    // where they are, for the text to keep off (game px)
    const g = (b: Box): Zone => ({ x: (b.x - f.x) / f.k, y: (b.y - f.y) / f.k, w: b.w / f.k, h: b.h / f.k });
    const round = (z: Zone): Zone => {
      const x = Math.floor(z.x * 10) / 10;
      const y = Math.floor(z.y * 10) / 10;
      return { x, y, w: Math.ceil((z.x + z.w - x) * 10) / 10, h: Math.ceil((z.y + z.h - y) * 10) / 10 };
    };
    const box = (ks: string[]) => {
      const bs = ks.map((k) => round(g(keepClear(plan[k]))));
      const x = Math.min(...bs.map((b) => b.x));
      const y = Math.min(...bs.map((b) => b.y));
      return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
    };
    setButtonZones({ parts: Object.values(plan).map((p) => round(g(keepClear(p)))), left: box(['pad', 'M']), right: box(['A', 'B', 'D', 'H']) });
    lastFit = 'fixed';
  };

  const layout = (glide = false) => {
    if (!screen) return;
    const body = document.body;
    goalBand = null;
    if (!active) {
      setButtonZones(null);
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
    setButtonZones(null);
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
    let padY = L.y + L.h - S - M;

    // ---- right: けってい / もどる in a thumb arc
    const cw = bw * 1.95;
    const left = mode === 'side' ? R.x + (R.w - cw) / 2 : R.x + R.w - cw - M * 1.4;
    const aX = left + bw * 0.95;
    let aY = R.y + R.h - M - bw * 1.26;
    // Upright phone / tablet: lift the controls off the very bottom edge into
    // the empty band under the picture, where the thumbs rest more easily
    // (2026-10-19, the client:「ボタン達が下すぎてちょっとやりずらい」).
    if (mode === 'bottom' && portrait) {
      const top0 = Math.min(padY, aY, midPills ? padY : padY - pill.h - M, midPills ? aY : aY - pill.h - M);
      const room = top0 - M - L.y;
      const lift = Math.round(Math.max(0, Math.min(room * 0.6, vh * 0.1)));
      padY -= lift;
      aY -= lift;
    }
    place(pad, padX, padY, S, S);
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
      // (upright: the band under the picture down to the controls' top, the lift included)
      if (portrait) goalBand = { bottom: ctrlTop, font: clamp(Math.round(vw * 0.04), 14, 22) };
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
  // Brief words came or went (told at the end of the frame that drew them,
  // before it is shown): the veils follow at once when they come, and a
  // moment after they have gone (between two lines, a page turn). Other
  // text — a text screen too — moves nothing.
  let calmT = 0;
  let lastKey = '';
  onTextZones(() => {
    if (!active || !sideways) return;
    const z = uiBands();
    const key = z.brief.map((r) => `${r.x},${r.y},${r.w},${r.h}`).join(' ');
    if (key === lastKey) return;
    lastKey = key;
    window.clearTimeout(calmT);
    if (z.brief.length) layout(true);
    else calmT = window.setTimeout(() => layout(true), 220);
  });
  goalInfo = () => {
    const r = goalEl.getBoundingClientRect();
    const on = goalEl.classList.contains('on');
    return {
      slot: !!goalRoom(),
      on,
      text: on ? (goalTx.textContent ?? '') : '',
      box: on ? [r.left, r.top, r.width, r.height].map((v) => Math.round(v)) : null,
    };
  };
  anyInfo = () => ({ closeup, label: anyEl.classList.contains('on'), taps: anyTaps });
  layoutInfo = () => ({ active, sideways, scale: screen?.fixedScale ?? null, fit: sideways ? lastFit : '' });
  window.addEventListener('resize', relayout);
  window.addEventListener('resize', () => closeup && placeAny());
  window.addEventListener('resize', () => requestAnimationFrame(() => active && syncGoal(true)));
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
