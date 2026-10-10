// The audio clock: one 25 ms tick drives every look-ahead scheduler (songs,
// ambience, loops) and ctx-time callbacks. It never relies on
// requestAnimationFrame, so music keeps time while the game is paused.
//
// The tick comes from a tiny Worker when possible: a worker timer is not
// clamped in background tabs and keeps its rhythm while the page thread is
// busy (the tick then runs as soon as the page thread frees up). Tasks
// schedule `lookahead` seconds ahead of ctx.currentTime (music: 0.3 s, enough
// to ride out a ~270 ms stall of the page thread; sequencer.ts corrects the
// already-scheduled notes when a param changes).

import { liveGraph } from './engine';

export interface Task {
  pump(until: number): void;
  /** Seconds ahead of the clock this task schedules (default LOOKAHEAD). */
  lookahead?: number;
}

/** Default look-ahead for ambience and loops. */
export const LOOKAHEAD = 0.2;
const tasks = new Set<Task>();
const timed: { t: number; fn: () => void }[] = [];
let started = false;

/** QA: tick health (live): the longest gap between two ticks, in ms. */
export const clockStats = { ticks: 0, worstGapMs: 0, source: 'none' as 'none' | 'worker' | 'interval' };
let lastTick = 0;

export function addTask(t: Task): void {
  tasks.add(t);
  // schedule right away so the first notes are not late
  const g = liveGraph();
  if (g) t.pump(g.ctx.currentTime + (t.lookahead ?? LOOKAHEAD));
}

export function removeTask(t: Task): void {
  tasks.delete(t);
}

/** Run fn when the live AudioContext reaches time t (±25 ms). */
export function atTime(t: number, fn: () => void): void {
  timed.push({ t, fn });
  timed.sort((a, b) => a.t - b.t);
}

/**
 * The live AudioContext was replaced (keepalive.ts): the new clock starts
 * near 0, so every waiting callback keeps the time it had left (a jingle's
 * end, the field song coming back after a battle, a chime's promise).
 */
export function shiftTimed(delta: number): void {
  for (const e of timed) e.t += delta;
}

export function tick(): void {
  const g = liveGraph();
  if (!g) return;
  const wall = performance.now();
  if (lastTick) clockStats.worstGapMs = Math.max(clockStats.worstGapMs, Math.round(wall - lastTick));
  lastTick = wall;
  clockStats.ticks++;
  const now = g.ctx.currentTime;
  for (const t of [...tasks]) {
    try {
      t.pump(now + (t.lookahead ?? LOOKAHEAD));
    } catch (e) {
      console.error('[audio] scheduler error', e);
      tasks.delete(t);
    }
  }
  while (timed.length && timed[0].t <= now + 0.012) {
    const e = timed.shift()!;
    try {
      e.fn();
    } catch (err) {
      console.error('[audio] timed callback error', err);
    }
  }
}

const WORKER_SRC = 'let h=0;onmessage=(e)=>{clearInterval(h);if(e.data>0)h=setInterval(()=>postMessage(0),e.data)};';

let worker: Worker | null = null;
let interval: ReturnType<typeof setInterval> | null = null;

function startTicker(): void {
  if (worker) {
    worker.postMessage(25);
    return;
  }
  try {
    if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
      const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      const w = new Worker(url);
      URL.revokeObjectURL(url);
      w.onmessage = tick;
      w.postMessage(25);
      worker = w;
      clockStats.source = 'worker';
      return;
    }
  } catch {
    /* CSP or no workers: fall back */
  }
  interval ??= setInterval(tick, 25);
  clockStats.source = 'interval';
}

/** No ticks while the page is hidden (2026-09-28): the sound is suspended then (keepalive.ts), there is nothing to schedule, and 40 wake-ups a second kept a phone's CPU from sleeping. */
function stopTicker(): void {
  worker?.postMessage(0);
  if (interval) clearInterval(interval);
  interval = null;
}

export function startClock(): void {
  if (started) return;
  started = true;
  startTicker();
  // (suspend / resume around a hidden page lives in keepalive.ts)
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', () => {
      lastTick = 0;
      if (document.hidden) stopTicker();
      else {
        startTicker();
        tick();
      }
    });
}
