// Action-based input: keyboard + gamepad + (optional) touch buttons feed the
// same set of logical actions. Query with down / pressed / released / repeat.

export type Action = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'menu' | 'dash';

const ACTIONS: Action[] = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'menu', 'dash'];

const KEYMAP: Record<string, Action> = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'confirm', Enter: 'confirm', Space: 'confirm', NumpadEnter: 'confirm',
  KeyX: 'cancel', Escape: 'cancel', Backspace: 'cancel',
  KeyC: 'menu', Tab: 'menu',
  ShiftLeft: 'dash', ShiftRight: 'dash',
};

const REPEAT_DELAY = 280;
const REPEAT_RATE = 75;

export class Input {
  private keys = new Set<Action>();
  private virt = new Set<Action>();
  /** Went down since the last update: a tap shorter than a frame still counts once. */
  private latch = new Set<Action>();
  private cur: Record<Action, boolean> = blank();
  private prev: Record<Action, boolean> = blank();
  private held: Record<Action, number> = blankNum();
  private rep: Record<Action, boolean> = blank();
  /** When true, scenes below a modal UI widget see no input this frame. */
  consumed = false;
  /** Set on the first user gesture (used to unlock audio). */
  onFirstGesture: (() => void) | null = null;
  anyKeyThisFrame = false;
  private anyKey = false;

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (a) {
        e.preventDefault();
        this.keys.add(a);
        if (!e.repeat) this.latch.add(a);
      }
      this.anyKey = true;
      this.gesture();
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) {
        e.preventDefault();
        this.keys.delete(a);
      }
    });
    window.addEventListener('blur', () => this.keys.clear());
    target.addEventListener('pointerdown', () => this.gesture());
  }

  private gesture(): void {
    if (this.onFirstGesture) {
      const f = this.onFirstGesture;
      this.onFirstGesture = null;
      f();
    }
  }

  /** Virtual buttons (touch overlay) call this. */
  setVirtual(a: Action, on: boolean): void {
    if (on) {
      this.virt.add(a);
      this.latch.add(a);
    } else this.virt.delete(a);
    if (on) this.gesture();
  }

  update(dtMs: number): void {
    this.consumed = false;
    this.anyKeyThisFrame = this.anyKey;
    this.anyKey = false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const padState = blank();
    for (const p of pads) {
      if (!p) continue;
      const b = (i: number) => !!p.buttons[i]?.pressed;
      const ax = p.axes[0] ?? 0;
      const ay = p.axes[1] ?? 0;
      if (b(12) || ay < -0.5) padState.up = true;
      if (b(13) || ay > 0.5) padState.down = true;
      if (b(14) || ax < -0.5) padState.left = true;
      if (b(15) || ax > 0.5) padState.right = true;
      if (b(0)) padState.confirm = true;
      if (b(1)) padState.cancel = true;
      if (b(2) || b(3) || b(9)) padState.menu = true;
      if (b(5) || b(7)) padState.dash = true;
    }
    for (const a of ACTIONS) {
      this.prev[a] = this.cur[a];
      this.cur[a] = this.keys.has(a) || this.virt.has(a) || this.latch.has(a) || padState[a];
      if (this.cur[a] && !this.prev[a]) this.anyKeyThisFrame = true;
      this.rep[a] = false;
      if (this.cur[a]) {
        const before = this.held[a];
        this.held[a] += dtMs;
        if (before === 0) this.rep[a] = true;
        else if (this.held[a] >= REPEAT_DELAY) {
          const n0 = Math.floor((before - REPEAT_DELAY) / REPEAT_RATE);
          const n1 = Math.floor((this.held[a] - REPEAT_DELAY) / REPEAT_RATE);
          if (before < REPEAT_DELAY || n1 > n0) this.rep[a] = true;
        }
      } else {
        this.held[a] = 0;
      }
    }
    this.latch.clear();
  }

  /** Mark all input as eaten for the rest of this frame (modal UI). */
  consume(): void {
    this.consumed = true;
  }

  down(a: Action): boolean {
    return !this.consumed && this.cur[a];
  }
  pressed(a: Action): boolean {
    return !this.consumed && this.cur[a] && !this.prev[a];
  }
  released(a: Action): boolean {
    return !this.consumed && !this.cur[a] && this.prev[a];
  }
  /** True on first press and then at a key-repeat cadence while held (menus). */
  repeat(a: Action): boolean {
    return !this.consumed && this.rep[a];
  }
  /** Raw access that ignores `consumed` (used by the UI layer itself). */
  rawPressed(a: Action): boolean {
    return this.cur[a] && !this.prev[a];
  }
  rawDown(a: Action): boolean {
    return this.cur[a];
  }
  rawRepeat(a: Action): boolean {
    return this.rep[a];
  }
  /** Direction vector from held arrows (not normalized). */
  axis(raw = false): { x: number; y: number } {
    const d = raw ? (a: Action) => this.cur[a] : (a: Action) => this.down(a);
    return { x: (d('right') ? 1 : 0) - (d('left') ? 1 : 0), y: (d('down') ? 1 : 0) - (d('up') ? 1 : 0) };
  }
  clearAll(): void {
    this.keys.clear();
    this.virt.clear();
    for (const a of ACTIONS) {
      this.cur[a] = false;
      this.prev[a] = false;
      this.held[a] = 0;
    }
  }
}

function blank(): Record<Action, boolean> {
  return { up: false, down: false, left: false, right: false, confirm: false, cancel: false, menu: false, dash: false };
}
function blankNum(): Record<Action, number> {
  return { up: 0, down: 0, left: 0, right: 0, confirm: 0, cancel: 0, menu: 0, dash: 0 };
}
