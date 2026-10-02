// Generator-based coroutines for cutscenes, event scripts and battle timelines.
//
//   function* intro(): Co {
//     yield 500;                 // wait 500 ms
//     yield null;                // wait one frame
//     yield () => box.closed;    // wait until predicate is true
//     const r = yield* choose([...]);  // run a sub-coroutine and get its return value
//     yield someOtherCo();       // same as yield* but also fine
//     yield promise;             // wait for a promise, receives its value
//   }
//   runner.run(intro());

export type Yieldable = number | null | undefined | void | (() => boolean) | Co | Promise<unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Co<R = any> = Generator<Yieldable, R, any>;

interface Frame {
  gen: Co;
}

export class Task {
  private stack: Frame[];
  private waitMs = 0;
  private waitFn: (() => boolean) | null = null;
  private waitPromise: { done: boolean; value: unknown } | null = null;
  private sendValue: unknown = undefined;
  done = false;
  result: unknown = undefined;
  cancelled = false;

  constructor(gen: Co) {
    this.stack = [{ gen }];
  }

  cancel(): void {
    this.cancelled = true;
    this.done = true;
  }

  /** Advance this task by dt milliseconds. */
  step(dt: number): void {
    if (this.done) return;
    if (this.waitMs > 0) {
      this.waitMs -= dt;
      if (this.waitMs > 0) return;
      this.waitMs = 0;
    }
    if (this.waitFn) {
      if (!this.waitFn()) return;
      this.waitFn = null;
    }
    if (this.waitPromise) {
      if (!this.waitPromise.done) return;
      this.sendValue = this.waitPromise.value;
      this.waitPromise = null;
    }
    // Resume generators until something actually waits.
    for (let guard = 0; guard < 10000; guard++) {
      const top = this.stack[this.stack.length - 1];
      const r = top.gen.next(this.sendValue);
      this.sendValue = undefined;
      if (r.done) {
        this.stack.pop();
        if (this.stack.length === 0) {
          this.done = true;
          this.result = r.value;
          return;
        }
        this.sendValue = r.value;
        continue;
      }
      const y = r.value;
      if (y === null || y === undefined) return; // one frame
      if (typeof y === 'number') {
        if (y <= 0) return;
        this.waitMs = y;
        return;
      }
      if (typeof y === 'function') {
        if ((y as () => boolean)()) continue;
        this.waitFn = y as () => boolean;
        return;
      }
      if (y instanceof Promise) {
        const w = { done: false, value: undefined as unknown };
        y.then((v) => {
          w.done = true;
          w.value = v;
        });
        this.waitPromise = w;
        return;
      }
      if (typeof (y as Co).next === 'function') {
        this.stack.push({ gen: y as Co });
        continue;
      }
      return;
    }
  }
}

export class Runner {
  tasks: Task[] = [];
  paused = false;

  run(gen: Co): Task {
    const t = new Task(gen);
    this.tasks.push(t);
    // Start immediately so the first segment runs this frame.
    t.step(0);
    if (t.done) this.tasks.splice(this.tasks.indexOf(t), 1);
    return t;
  }

  update(dt: number): void {
    if (this.paused) return;
    // Copy: tasks may spawn tasks.
    const list = this.tasks.slice();
    for (const t of list) t.step(dt);
    this.tasks = this.tasks.filter((t) => !t.done);
  }

  get busy(): boolean {
    return this.tasks.length > 0;
  }

  clear(): void {
    for (const t of this.tasks) t.cancel();
    this.tasks = [];
  }
}

/** Run several coroutines concurrently; finish when all have finished. */
export function* all(...cos: Co[]): Co {
  const tasks = cos.map((c) => new Task(c));
  for (const t of tasks) t.step(0);
  while (tasks.some((t) => !t.done)) {
    yield null;
    for (const t of tasks) t.step(FRAME_MS);
  }
  return tasks.map((t) => t.result);
}

/** Fixed timestep used by the game loop (ms). */
export const FRAME_MS = 1000 / 60;

/** Wait helper for readability: `yield* wait(200)`. */
export function* wait(ms: number): Co {
  yield ms;
}

/** Wait until predicate is true. */
export function* until(fn: () => boolean): Co {
  yield fn;
}
