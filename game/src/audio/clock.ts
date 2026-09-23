// The audio clock: one 25 ms timer drives every look-ahead scheduler
// (songs, ambience, loops) and ctx-time callbacks. It never relies on
// requestAnimationFrame, so music keeps time while the game is paused.

import { liveGraph } from './engine';

export interface Task {
  pump(until: number): void;
}

export const LOOKAHEAD = 0.12;
const tasks = new Set<Task>();
const timed: { t: number; fn: () => void }[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

export function addTask(t: Task): void {
  tasks.add(t);
  // schedule right away so the first notes are not late
  const g = liveGraph();
  if (g) t.pump(g.ctx.currentTime + LOOKAHEAD);
}

export function removeTask(t: Task): void {
  tasks.delete(t);
}

/** Run fn when the live AudioContext reaches time t (±25 ms). */
export function atTime(t: number, fn: () => void): void {
  timed.push({ t, fn });
  timed.sort((a, b) => a.t - b.t);
}

export function tick(): void {
  const g = liveGraph();
  if (!g) return;
  const now = g.ctx.currentTime;
  const until = now + LOOKAHEAD;
  for (const t of [...tasks]) {
    try {
      t.pump(until);
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

export function startClock(): void {
  if (timer) return;
  timer = setInterval(tick, 25);
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', () => {
      const g = liveGraph();
      if (!g) return;
      const c = g.ctx as AudioContext;
      if (document.hidden) void c.suspend();
      else void c.resume();
    });
}
