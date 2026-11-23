// Keeps the sound alive on phones and tablets. An alarm, a phone call or a
// trip to another app stops the AudioContext ('interrupted' on iOS,
// 'suspended' elsewhere) and browsers never start it again on their own, so
// without this the rest of the session would stay silent.
//
//  - page hidden → suspend on purpose (music pauses while the player is away)
//  - page shown again / focus / pageshow → resume
//  - any tap, click or key while stopped → resume from inside the gesture
//    (iOS only lets a gesture restart audio), plus a one-sample silent buffer
//    that wakes the audio session up
//  - while the page is visible and the sound is still stopped, retry once a
//    second (an alarm dismissed without touching the page)
//
// A new AudioContext (2026-10-05, the client's iPad: back from another app
// the game stayed silent). iOS WebKit can leave a context that resume()
// cannot bring back: it stays 'interrupted', or says 'running' while its
// clock no longer moves (WebKit bugs 263627, 273511, 276016: "the only way
// to hear sounds again is to create a new instance"), or its clock runs at
// the speed of another sample rate after the output changed (bug 258864:
// distorted, wrong speed). A watchdog looks for those three while the page
// is visible, and then the context is replaced (engine.replaceLive): the
// music comes back in the new one from the bar it was in, with its params,
// room and pitch, the ambience beds at their levels, the volumes, the space
// and the PA as they were (music / ambience detachForRebuild). A new context
// may need a gesture on iOS: a stuck one is replaced from inside a tap.

import { shiftTimed } from './clock';
import { audioCtx, replaceLive } from './engine';
import * as amb from './ambience';
import * as music from './music';

let installed = false;
let everRan = false;

type Reason = 'stall' | 'rate' | 'stuck';

/** QA (audioState): what the watchdog measured and did. */
export const keepAliveStats = {
  /** Contexts replaced so far, and why (latest last). */
  rebuilds: 0,
  reasons: [] as string[],
  /** suspend → resume tried on a clock that stopped. */
  kicks: 0,
  /** The last measured clock speed (context seconds per wall second, over 4 s). */
  rate: 1,
  /** 1 s checks in a row with the clock standing still while 'running'. */
  stalled: 0,
  /** What the watchdog is waiting to fix ('' = nothing). */
  want: '' as '' | Reason,
};

const hooks: (() => void)[] = [];
/** Run after the context was replaced (index.ts re-applies volumes, space and PA). */
export function onRebuild(fn: () => void): void {
  hooks.push(fn);
}

/**
 * False while the system has stopped the sound. SFX and blips are skipped
 * then, so they don't all fire at once when the sound comes back.
 */
export function soundLive(): boolean {
  const c = audioCtx();
  if (!c) return false;
  return c.state === 'running' || !everRan;
}

function tryResume(kick: boolean): void {
  const c = audioCtx();
  if (!c || document.hidden || c.state === 'running' || c.state === 'closed') return;
  c.resume().catch(() => {
    /* not allowed yet: the next gesture or retry tries again */
  });
  if (!kick) return;
  try {
    const s = c.createBufferSource();
    s.buffer = c.createBuffer(1, 1, c.sampleRate);
    s.connect(c.destination);
    s.start();
  } catch {
    /* context not usable yet */
  }
}

// ---- the watchdog ----------------------------------------------------------------

/** The last 1 s sample of the clock (stall check). */
let probe: { wall: number; t: number } | null = null;
/** The start of the 4 s window the clock speed is measured over. */
let win: { wall: number; t: number } | null = null;
let rateBad = 0;
let kicked = false;
let want: Reason | null = null;
let wantSince = 0;
/** When a gesture first tried to resume a stopped context (0 = none since it last ran). */
let gestureTry = 0;
let gestureTimer = 0;
/** Wall times of recent replacements (at most 4 a minute). */
const recent: number[] = [];
/** Replacements for a wrong clock speed; after 2 the speed is taken as it is. */
let rateRebuilds = 0;

/** Hardware rates an output can switch to (a context's clock then runs at hw / ctx). */
const HW_RATES = [8000, 11025, 16000, 22050, 24000, 32000, 44100, 48000, 88200, 96000];

function resetProbe(): void {
  probe = null;
  win = null;
  rateBad = 0;
  keepAliveStats.stalled = 0;
}

function wish(r: Reason): void {
  if (want === r) return;
  want = r;
  wantSince = performance.now();
  keepAliveStats.want = r;
}
function clearWish(r?: Reason): void {
  if (r && want !== r) return;
  want = null;
  keepAliveStats.want = '';
}

function canRebuild(now: number): boolean {
  while (recent.length && now - recent[0] > 60_000) recent.shift();
  if (recent.length >= 4) return false;
  return !recent.length || now - recent[recent.length - 1] > 2500;
}

/** A clock speed that is another sample rate's (not a slow machine's under-runs, which wander). */
function foreignRate(r: number, sr: number): boolean {
  if (Math.abs(r - 1) < 0.03) return false;
  return HW_RATES.some((h) => h !== sr && Math.abs(r - h / sr) < (0.012 * h) / sr);
}

/** Once a second (and on the way back from hidden): is the clock moving, and at the right speed? */
function check(): void {
  const c = audioCtx();
  if (!c || c.state === 'closed') return;
  watch(c);
  if (document.hidden) {
    resetProbe();
    gestureTry = 0;
    return;
  }
  const now = performance.now();
  if (c.state !== 'running') {
    resetProbe();
    tryResume(false);
    // a tap already tried and it did not come back: the next tap starts a new context
    if (everRan && gestureTry && now - gestureTry > 900) wish('stuck');
    return;
  }
  gestureTry = 0;
  clearWish('stuck');
  const t = c.currentTime;
  if (probe && now - probe.wall > 500) {
    if (t - probe.t < ((now - probe.wall) / 1000) * 0.05) keepAliveStats.stalled++;
    else {
      keepAliveStats.stalled = 0;
      kicked = false;
      clearWish('stall');
    }
  }
  probe = { wall: now, t };
  if (keepAliveStats.stalled >= 2) {
    win = null;
    // first a suspend → resume (enough on some iOS versions); then a new context
    if (!kicked) {
      kicked = true;
      keepAliveStats.stalled = 0;
      keepAliveStats.kicks++;
      c.suspend()
        .then(() => (!document.hidden && c === audioCtx() ? c.resume() : undefined))
        .catch(() => {});
    } else wish('stall');
  } else if (!keepAliveStats.stalled) {
    if (!win) win = { wall: now, t };
    else if (now - win.wall >= 4000) {
      const r = (t - win.t) / ((now - win.wall) / 1000);
      keepAliveStats.rate = Math.round(r * 1000) / 1000;
      win = { wall: now, t };
      if (foreignRate(r, c.sampleRate)) {
        if (++rateBad >= 2 && rateRebuilds < 2) wish('rate');
      } else {
        rateBad = 0;
        clearWish('rate');
      }
    }
  }
  // a stopped clock: nothing is heard anyway, start over now (iOS may still
  // wait for a tap, which resumes the new context); the wrong speed: wait up
  // to 5 s for a tap, where a new context starts at once
  if (want === 'stall' || (want === 'rate' && now - wantSince > 5000)) {
    if (canRebuild(now)) rebuild(want);
  }
}

function onGesture(): void {
  const c = audioCtx();
  if (!c || document.hidden || c.state === 'closed') return;
  watch(c);
  const now = performance.now();
  if (want && canRebuild(now)) {
    rebuild(want);
    return;
  }
  if (c.state === 'running') {
    // 'running', but the clock has stood still since the last check
    if (keepAliveStats.stalled >= 1 && probe && c.currentTime - probe.t < 0.01 && canRebuild(now)) rebuild('stall');
    return;
  }
  tryResume(true);
  if (!everRan) return;
  if (!gestureTry) gestureTry = now;
  // WebKit carries a gesture into a timer of up to 1 s: if the context has
  // not come back by then, a new one made there may start straight away
  if (!gestureTimer)
    gestureTimer = window.setTimeout(() => {
      gestureTimer = 0;
      const c2 = audioCtx();
      if (c2 === c && !document.hidden && c.state !== 'running' && c.state !== 'closed' && canRebuild(performance.now())) rebuild('stuck');
    }, 800);
}

/** Replace the live context; the music, beds and settings carry on in the new one. */
function rebuild(reason: Reason): void {
  const old = audioCtx();
  if (!old) return;
  const oldT = old.currentTime;
  recent.push(performance.now());
  if (reason === 'rate') rateRebuilds++;
  clearWish();
  kicked = false;
  gestureTry = 0;
  resetProbe();
  const m = music.detachForRebuild();
  const a = amb.detachForRebuild();
  const g = replaceLive();
  if (g) {
    shiftTimed(g.ctx.currentTime - oldT);
    watch(g.ctx as AudioContext);
    for (const f of hooks)
      try {
        f();
      } catch (e) {
        console.warn('[audio] rebuild hook', e);
      }
  }
  // (no new context could be made: everything goes back into the old one)
  music.restoreAfterRebuild(m);
  amb.restoreAfterRebuild(a);
  keepAliveStats.rebuilds++;
  keepAliveStats.reasons.push(reason);
  // (for Safari's Web Inspector on a device)
  console.info(`[audio] new AudioContext (${reason}${g ? '' : ': none could be made'})`);
  if (keepAliveStats.reasons.length > 8) keepAliveStats.reasons.shift();
  tryResume(true);
}

/** QA: replace the context now, as the watchdog would. */
export function forceRebuild(): void {
  rebuild('stuck');
}

// ---------------------------------------------------------------------------------

let watched: AudioContext | null = null;
function watch(c: AudioContext): void {
  if (watched === c) return;
  watched = c;
  if (c.state === 'running') everRan = true;
  c.addEventListener('statechange', () => {
    if (c !== audioCtx()) return;
    if (c.state === 'running') everRan = true;
    resetProbe();
  });
}

export function installKeepAlive(): void {
  const c = audioCtx();
  if (installed || !c) return;
  installed = true;
  watch(c);
  document.addEventListener('visibilitychange', () => {
    const cc = audioCtx();
    if (!cc) return;
    resetProbe();
    // (a context the system already stopped is left to it: WebKit may bring
    // back an 'interrupted' one on its own, but not one the page suspended)
    if (document.hidden) {
      if (cc.state === 'running') cc.suspend().catch(() => {});
    } else tryResume(false);
  });
  window.addEventListener('pageshow', () => {
    resetProbe();
    tryResume(false);
  });
  window.addEventListener('focus', () => tryResume(false));
  for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'keydown', 'click'])
    window.addEventListener(ev, onGesture, { capture: true, passive: true });
  window.setInterval(check, 1000);
}
