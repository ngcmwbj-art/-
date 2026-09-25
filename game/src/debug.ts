// QA / debug hooks exposed on window.__game. Used by the Playwright
// playtest scripts in tools/ to jump to states and capture exact frames.
// Other modules register extra commands with registerDebug().

import { game } from './engine/game';

type Cmd = (...args: never[]) => unknown;
const commands: Record<string, Cmd> = {};

export function registerDebug(name: string, fn: Cmd): void {
  commands[name] = fn;
}

export function installDebug(): void {
  const api = {
    game,
    /** Freeze the rAF simulation (drawing continues). */
    pause: () => (game.paused = true),
    resume: () => (game.paused = false),
    /** Advance exactly `ms` of simulation (use while paused). */
    advance: (ms: number) => game.advance(ms),
    scenes: () => game.scenes.map((s) => s.constructor.name),
    cmd: commands,
  };
  (window as unknown as { __game: typeof api }).__game = api;
}
