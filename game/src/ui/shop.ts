// Shops (30_level_art 10.8, 10_narrative 12.1). `yield* openShop('shop_hinoya')`
// from a script: a notebook panel slides down over the shop — hand-written
// price cards on the left (each one pinned a pixel off, so they look placed
// by hand), the chosen sweet on the right with how many are in the bag, and
// the がま口 with the money at the top right; buying snaps the purse open.
// The keeper's lines (purchase, not enough money, bag full, leaving) come
// from the shop definition; ひのや is built in.

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { H, W } from '../engine/screen';
import { ease } from '../engine/tween';
import { addItem, countItem, flag, setFlag, state } from '../game/state';
import { getItem, isKeyItem } from '../data/battle';
import { sfx } from '../audio';
import { ask, say } from './dialog';
import { digitsWidth, drawDigits } from './digits';
import { itemIcon24, purseIcon } from './icons';
import { bagCount, BAG_MAX } from './menu/items';
import { uiHud } from './hud';
import { drawCursor, drawMarker, drawTape, drawWindow, pencilLine, phraseWrap, rectA, tapeImg, textW, UI } from './window';

export interface ShopKeeper {
  name: string;
  voice: string;
}

export interface ShopDef {
  id: string;
  /** Title on the panel (「駄菓子 ひのや」). */
  title: string;
  keeper: ShopKeeper;
  /** Goods on sale right now (item ids). */
  goods: () => string[];
  /** Price override (default: the item's price). */
  price?: (id: string) => number;
  /** Lines (pages) after a purchase; `n` = purchases so far (1 = first). */
  onBuy?: (id: string, n: number) => string[] | null;
  noMoney?: string[];
  bagFull?: string[];
  /** Lines when the player leaves. */
  bye?: () => string[] | null;
}

const shops = new Map<string, ShopDef>();

export function registerShop(def: ShopDef): void {
  shops.set(def.id, def);
}

export function getShop(id: string): ShopDef | undefined {
  return shops.get(id);
}

// ---- 駄菓子 ひのや (10_narrative 12.1) ---------------------------------------------------------

registerShop({
  id: 'shop_hinoya',
  title: '駄菓子 ひのや',
  keeper: { name: 'おばあ', voice: 'obaa' },
  goods: () => {
    const g = ['item_ramune', 'item_kinakobou', 'item_fugashi', 'item_hakka_ame'];
    if (flag('flag_got_hanko')) g.push('item_stamp_pad');
    return g;
  },
  onBuy: (id, n) => {
    if (id === 'item_kinakobou' && !flag('flag_shop_kinako')) {
      setFlag('flag_shop_kinako', 1);
      return ['きなこぼうの あたり、\nまた 出たよ。今日 3本目。', '……あたり、入れて\nないんだけどねえ。'];
    }
    if (id === 'item_stamp_pad' && !flag('flag_shop_stamp')) {
      setFlag('flag_shop_stamp', 1);
      return ['スタンプ台かい。{w=300}\nちゃんと 押す 気に なったね。'];
    }
    if (n <= 1) return ['まいど。{w=300}\n……まめ吉のが うつったね。'];
    return n % 2 === 0 ? ['はいよ。'] : ['毎度 ありがとね。'];
  },
  noMoney: ['足りないね。{w=300}\nツケは、肉屋の 専売特許だよ。'],
  bagFull: ['もちものが いっぱいだよ。{w=300}\nポケットは 2つしか ないだろ。'],
  bye: () => {
    const s = flag('flag_stage');
    if (s === 0) return ['チャイムが 鳴ったら 帰るんだよ。'];
    if (s === 1) return ['気を つけて おいき。'];
    return ['……ちゃんと 帰って おいでよ。'];
  },
});

// ---- the shop screen -----------------------------------------------------------------------

const PANEL = { x: 8, y: 6, w: W - 16, h: 138 };
const CARD_X = PANEL.x + 12;
const CARD_Y = PANEL.y + 30;
const CARD_W = 172;
const CARD_H = 19;
/** Hand-placed look: each card sits a pixel off (no rotation). */
const JITTER: [number, number][] = [
  [0, 0],
  [2, 1],
  [-1, 0],
  [1, -1],
  [3, 0],
  [0, 1],
  [2, -1],
];

class ShopScene implements Scene {
  transparent = true;
  done = false;
  /** The goodbye has been said too. */
  finished = false;
  private t = 0;
  private openT = 0;
  private closeT = -1;
  private sel = 0;
  private moveT = 999;
  private busy = false;
  private purseT = 999;
  private goods: string[];
  private leaving = false;

  constructor(private def: ShopDef) {
    this.goods = def.goods();
  }

  enter(): void {
    sfx('se_menu_open');
  }

  private price(id: string): number {
    return this.def.price?.(id) ?? getItem(id)?.price ?? 0;
  }

  update(dt: number): void {
    this.t += dt;
    this.moveT += dt;
    this.purseT += dt;
    if (this.closeT >= 0) {
      this.closeT += dt;
      if (this.closeT >= 140 && !this.done) {
        this.done = true;
        const i = game.scenes.indexOf(this);
        if (i === game.scenes.length - 1) game.pop();
        else if (i >= 0) game.scenes.splice(i, 1);
      }
      return;
    }
    this.openT += dt;
    if (this.openT < 160 || this.busy || game.ui.modal) return;
    const input = game.input;
    const n = this.goods.length;
    if (n && input.repeat('down')) this.move(1, n);
    else if (n && input.repeat('up')) this.move(-1, n);
    if (input.pressed('confirm') && n) this.buy();
    else if (input.pressed('cancel') || input.pressed('menu')) this.leave();
  }

  private move(d: number, n: number): void {
    this.sel = (this.sel + d + n) % n;
    this.moveT = 0;
    sfx('se_cursor');
  }

  private run(co: Co): void {
    this.busy = true;
    const self = this;
    game.scripts.run(
      (function* () {
        yield* co;
        self.busy = false;
      })(),
    );
  }

  private buy(): void {
    const id = this.goods[this.sel];
    const it = getItem(id);
    if (!it) return;
    const price = this.price(id);
    sfx('se_confirm');
    const self = this;
    const def = this.def;
    this.run(
      (function* (): Co {
        const i = yield* ask(`${it.name}を 買う？（${price}円）`, ['買う', 'やめる'], { voice: 'sys', cancel: 1 });
        if (i !== 0) return;
        if (state.money < price) {
          sfx('se_buzzer');
          if (def.noMoney) yield* say(def.noMoney, { name: def.keeper.name, voice: def.keeper.voice });
          return;
        }
        if (!isKeyItem(id) && bagCount() >= BAG_MAX) {
          sfx('se_buzzer');
          if (def.bagFull) yield* say(def.bagFull, { name: def.keeper.name, voice: def.keeper.voice });
          return;
        }
        state.money -= price;
        addItem(id);
        setFlag('flag_bought', flag('flag_bought') + 1);
        self.purseT = 0;
        sfx('se_coin');
        sfx('se_shop_buy');
        const lines = def.onBuy?.(id, flag('flag_bought'));
        if (lines && lines.length) yield* say(lines, { name: def.keeper.name, voice: def.keeper.voice });
      })(),
    );
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    sfx('se_cancel');
    const self = this;
    const def = this.def;
    this.run(
      (function* (): Co {
        self.closeT = 0;
        sfx('se_menu_close');
        yield 150;
        const bye = def.bye?.();
        if (bye && bye.length) yield* say(bye, { name: def.keeper.name, voice: def.keeper.voice });
        self.finished = true;
      })(),
    );
  }

  draw(g: Gfx): void {
    const openK = Math.min(1, this.openT / 160);
    const k = this.closeT >= 0 ? 1 - Math.min(1, this.closeT / 140) : openK;
    const e = ease.cubicOut(k);
    g.rect(0, 0, W, H, UI.night, 0.35 * k);
    const dy = Math.round((1 - e) * -16);
    g.alpha(k, () => g.translated(0, dy, () => this.drawPanel(g)));
  }

  private drawPanel(g: Gfx): void {
    const P = PANEL;
    drawWindow(g, P.x, P.y, P.w, P.h, UI, 1, { curl: true });
    // the shop's name on a strip of tape, like a sign
    drawTape(g, P.x + 10, P.y + 6, textW(this.def.title) + 18, 18, this.def.title, { color: '#F6D98A', seed: 7 });
    // purse and money at the top right
    const open = this.purseT < 70;
    const money = `${state.money}円`;
    const mx = P.x + P.w - 12;
    const mw = digitsWidth(money);
    drawDigits(g, money, mx, P.y + 12, { color: UI.text, align: 'right' });
    g.img(purseIcon(open), mx - mw - 20, P.y + 6 - (open ? 1 : 0));
    // price cards
    const n = this.goods.length;
    if (!n) g.text('きょうは 売りきれ。', CARD_X + 6, CARD_Y + 8, { color: UI.textDim });
    this.goods.forEach((id, i) => {
      const it = getItem(id);
      if (!it) return;
      const [jx, jy] = JITTER[i % JITTER.length];
      const sel = i === this.sel;
      const x = CARD_X + jx + (sel ? 4 : 0);
      const y = CARD_Y + i * (CARD_H + 2) + jy - (sel ? 1 : 0);
      rectA(g, x + 2, y + 2, CARD_W, CARD_H, UI.night, 0.25);
      g.rect(x, y, CARD_W, CARD_H, UI.border);
      g.rect(x + 1, y + 1, CARD_W - 2, CARD_H - 2, UI.flipPaper);
      // a pin of masking tape on the left end
      g.img(tapeImgSmall(i), x - 3, y + 5);
      if (sel) drawMarker(g, x + 8, y + 3, textW(it.name) + 4, 14, Math.min(1, this.moveT / 70));
      g.text(it.name, x + 10, y + 2, { color: UI.text });
      drawDigits(g, `${this.price(id)}円`, x + CARD_W - 6, y + 7, { color: UI.accent, align: 'right' });
      if (sel) drawCursor(g, x - 14, y + 1, this.t);
    });
    // the chosen one
    const id = this.goods[this.sel];
    const it = id ? getItem(id) : null;
    const rx = P.x + 200;
    let ry = P.y + 32;
    if (it) {
      rectA(g, rx + 2, ry + 2, 30, 30, UI.night, 0.35);
      g.rect(rx, ry, 30, 30, UI.stickyEdge);
      g.rect(rx + 1, ry + 1, 28, 28, UI.tape);
      g.img(itemIcon24(id), rx + 3, ry + 3);
      g.text(it.name, rx + 38, ry, { color: UI.accent });
      pencilLine(g, rx + 38, ry + 16, textW(it.name) + 2, 1, UI.accentDark, 4);
      g.text('もっている', rx + 38, ry + 18, { color: UI.pencil });
      drawDigits(g, String(countItem(id)), rx + 38 + textW('もっている') + 5, ry + 23, { color: UI.text });
      ry += 38;
      const w = P.x + P.w - 12 - rx;
      const lines = phraseWrap(it.desc[0], w);
      lines.slice(0, 2).forEach((l, i) => g.text(l, rx, ry + i * 17, { color: UI.text }));
      ry += Math.min(2, lines.length) * 17 + 3;
      const eff = phraseWrap(it.desc[1], w);
      eff.slice(0, 2).forEach((l, i) => g.text(l, rx, ry + i * 17, { color: UI.pencil }));
    }
    // how full the bag is (left of the purse)
    const bag = `${bagCount()}/${BAG_MAX}`;
    const bx = mx - mw - 30;
    drawDigits(g, bag, bx, P.y + 12, { color: UI.pencil, align: 'right' });
    g.text('もちもの', bx - digitsWidth(bag) - 4 - textW('もちもの'), P.y + 7, { color: UI.pencil });
  }
}

function tapeImgSmall(i: number): HTMLCanvasElement {
  return tapeImg(8, 8, UI.tape, 50 + i);
}

/** Open a shop and wait until the player leaves it. */
export function* openShop(id = 'shop_hinoya'): Co {
  const def = shops.get(id);
  if (!def) {
    if (import.meta.env.DEV) console.warn(`[ui] unknown shop ${id}`);
    return;
  }
  const s = new ShopScene(def);
  uiHud.clearNotes();
  game.push(s);
  // the keeper's goodbye runs after the panel has closed
  yield () => s.done && s.finished;
}
