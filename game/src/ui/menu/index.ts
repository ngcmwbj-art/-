// Field menu (00_concept 15, 30_level_art 10.7, 10_narrative 12.3–12.4): an
// open notebook slides in from the right over the dimmed world; index tabs
// on its right edge lead to もちもの／ハンコ／つよさ／みました帳／せってい.
// Opened with C/Tab or X in the field (hud.ts watches the keys), from the
// title (settings only) and from scripts (openMenu()).

import type { Co } from '../../engine/co';
import { Runner } from '../../engine/co';
import { game, type Scene } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { W, H } from '../../engine/screen';
import { ease } from '../../engine/tween';
import { state } from '../../game/state';
import { sfx } from '../../audio';
import { drawClockPlate, setMenuOpener, uiHud } from '../hud';
import { UI } from '../window';
import { drawMoney, drawSpread, drawTabs, TABS } from './notebook';
import type { MenuCtx, MenuPage } from './types';
import { ItemsPage } from './items';
import { HankoPage } from './hanko';
import { StatsPage } from './stats';
import { BookPage } from './book';
import { SettingsPage } from './settingsPage';

const OPEN_MS = 160;
const CLOSE_MS = 130;

export class MenuScene implements Scene, MenuCtx {
  transparent = true;
  done = false;
  t = 0;
  focus = false;
  dx = 0;
  alpha = 1;
  private tab = 0;
  private openT = 0;
  private closeT = -1;
  private switchT = 999;
  private runner = new Runner();
  private after: (() => Co) | null = null;
  private purseT = 999;
  private pages: Record<string, MenuPage>;
  private order: string[];

  constructor(readonly titleMode = false, startTab = 'items') {
    this.pages = {
      items: new ItemsPage(),
      hanko: new HankoPage(),
      stats: new StatsPage(),
      book: new BookPage(),
      settings: new SettingsPage(),
    };
    this.order = titleMode ? ['settings'] : TABS.map((t) => t.id);
    this.tab = Math.max(0, this.order.indexOf(startTab));
    if (titleMode) this.focus = true;
  }

  private get pageId(): string {
    return this.order[this.tab];
  }

  private get page(): MenuPage {
    return this.pages[this.pageId];
  }

  enter(): void {
    sfx('se_menu_open');
    this.page.show?.(this);
    if (this.focus) this.page.enter(this);
  }

  run(co: Co): void {
    this.runner.run(co);
  }

  goTab(id: string): void {
    const i = this.order.indexOf(id);
    if (i < 0) return;
    this.tab = i;
    this.switchT = 0;
    sfx('se_page');
    this.page.show?.(this);
    this.focus = this.page.enter(this);
  }

  close(after?: () => Co): void {
    if (this.closeT >= 0) return;
    this.after = after ?? null;
    this.closeT = 0;
    sfx('se_menu_close');
  }

  purse(): void {
    this.purseT = 0;
  }

  update(dt: number): void {
    this.t += dt;
    this.purseT += dt;
    this.switchT += dt;
    this.runner.update(dt);
    if (this.closeT >= 0) {
      this.closeT += dt;
      const k = Math.min(1, this.closeT / CLOSE_MS);
      this.dx = Math.round(ease.cubicIn(k) * 60);
      this.alpha = 1 - k;
      if (k >= 1 && !this.done) {
        this.done = true;
        const i = game.scenes.indexOf(this);
        if (i === game.scenes.length - 1) game.pop();
        else if (i >= 0) game.scenes.splice(i, 1);
        const a = this.after;
        if (a) game.scripts.run(a());
      }
      return;
    }
    this.openT += dt;
    const k = Math.min(1, this.openT / OPEN_MS);
    this.dx = Math.round((1 - ease.cubicOut(k)) * 60);
    this.alpha = Math.min(1, k * 1.6);
    if (k < 1 || this.runner.busy || game.ui.modal) return;
    const input = game.input;
    if (!this.focus) {
      const n = this.order.length;
      if (input.repeat('down') && n > 1) this.switchTab((this.tab + 1) % n);
      else if (input.repeat('up') && n > 1) this.switchTab((this.tab + n - 1) % n);
      else if (input.pressed('confirm') || input.pressed('left')) {
        if (this.page.enter(this)) {
          this.focus = true;
          sfx('se_confirm');
        } else sfx('se_buzzer');
      } else if (input.pressed('cancel') || input.pressed('menu')) this.close();
      return;
    }
    if (input.pressed('menu') && !this.titleMode) {
      this.close();
      return;
    }
    if (!this.page.update(this, dt, input)) {
      if (this.titleMode) this.close();
      else this.focus = false;
    }
  }

  private switchTab(i: number): void {
    this.tab = i;
    this.switchT = 0;
    sfx('se_page');
    this.page.show?.(this);
  }

  draw(g: Gfx): void {
    // dim the world (#1B1733 α40%)
    const dim = this.closeT >= 0 ? 1 - Math.min(1, this.closeT / CLOSE_MS) : Math.min(1, this.openT / OPEN_MS);
    if (!this.titleMode) g.rect(0, 0, W, H, UI.night, 0.4 * dim);
    else g.rect(0, 0, W, H, UI.night, 0.55 * dim);
    const a = this.alpha;
    drawTabs(g, this.tab, this.dx, a, this.t, !this.focus, this.titleMode ? 'settings' : undefined);
    const pk0 = Math.min(1, this.switchT / 120);
    if (this.page.drawBehind) g.alpha(a * pk0, () => g.translated(this.dx, 0, () => this.page.drawBehind!(g, this)));
    drawSpread(g, this.dx, a);
    // page content (a quick fade when the tab changes)
    const pk = Math.min(1, this.switchT / 120);
    g.alpha(a * pk, () => g.translated(this.dx + Math.round((1 - pk) * 3), 0, () => this.page.draw(g, this)));
    if (!this.titleMode) {
      drawMoney(g, state.money, this.dx, a, this.purseT);
      // the clock plate slides in from the top while the menu is open
      const ck = Math.min(1, this.openT / 300);
      const cy = Math.round(-26 + ease.cubicOut(ck) * 30) - (this.closeT >= 0 ? Math.round(Math.min(1, this.closeT / CLOSE_MS) * 30) : 0);
      drawClockPlate(g, 324, cy, uiHud.clockView());
    }
  }
}

let current: MenuScene | null = null;

/** Open the field menu (no-op if already open). */
export function openMenu(tab = 'items'): MenuScene | null {
  if (current && !current.done) return null;
  current = new MenuScene(false, tab);
  uiHud.clearNotes();
  game.push(current);
  return current;
}

/** Open the menu and wait until it is closed (scripts). */
export function* runMenu(tab = 'items'): Co {
  const m = openMenu(tab);
  if (m) yield () => m.done;
}

/** Settings only (title screen). */
export function* runSettings(): Co {
  const m = new MenuScene(true, 'settings');
  game.push(m);
  yield () => m.done;
}

export function menuOpen(): boolean {
  return !!current && !current.done;
}

setMenuOpener(() => {
  openMenu();
});
