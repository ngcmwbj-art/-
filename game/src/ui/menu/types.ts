import type { Co } from '../../engine/co';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';

/** What a menu page can ask of the menu. */
export interface MenuCtx {
  t: number;
  /** The page has the input focus (the cursor is inside it). */
  focus: boolean;
  /** Slide offset / fade of the whole notebook. */
  dx: number;
  alpha: number;
  /** Opened from the title (settings only; no field behind). */
  titleMode: boolean;
  /** Run a flow (messages, choices) — page input pauses until it ends. */
  run(co: Co): void;
  /** Switch to another tab and give it the focus. */
  goTab(id: string): void;
  /** Close the menu, then run `after` on the global script runner. */
  close(after?: () => Co): void;
  /** Pop the purse open (money changed). */
  purse(): void;
}

export interface MenuPage {
  /** The cursor enters the page. Return false if there is nothing to select. */
  enter(m: MenuCtx): boolean;
  /** Input while focused. Return false to hand the focus back to the tabs. */
  update(m: MenuCtx, dt: number, input: Input): boolean;
  draw(g: Gfx, m: MenuCtx): void;
  /** Drawn before the notebook (tabs sticking out from behind its edge). */
  drawBehind?(g: Gfx, m: MenuCtx): void;
  /** The tab became visible (reset scroll, etc.). */
  show?(m: MenuCtx): void;
}
