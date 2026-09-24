// Shops (30_level_art 10.8, 10_narrative 12.1). `yield* openShop('shop_hinoya')`
// from a script: a notebook panel slides down over the shop — hand-written
// price cards on the left (each one pinned a pixel off, so they look placed
// by hand), the chosen sweet on the right (name, icon, how many are in the
// bag, the price), the がま口 with the money at the top right — and under it
// the 説明欄 in the dialog window's place: flavour on line 1, effect on
// line 2 (10_narrative 10.1). The keeper's lines appear in that same place.
//
// Buying: 決定 on a card opens the confirmation in the 説明欄 —
// 「ラムネを 買う？」, the quantity (←→) with the total, and 買う／やめる
// (↑↓) with the cursor resting on やめる, so mashing 決定 through the keeper's
// lines can't chain purchases. After a purchase the list ignores input for a
// moment. A shop sells at most `shopLimit(id)` of a thing per visit.

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { H, W } from '../engine/screen';
import { ease } from '../engine/tween';
import { addItem, countItem, flag, setFlag, state } from '../game/state';
import { getItem, isKeyItem, shopLimit } from '../data/battle';
import { sfx } from '../audio';
import { dialogVisible, say } from './dialog';
import { digitsWidth, drawDigits, drawNumerals, numeralsWidth } from './digits';
import { itemIcon24, purseIcon } from './icons';
import { bagCount, BAG_MAX } from './menu/items';
import { uiHud } from './hud';
import { drawCursor, drawMarker, drawTape, drawWindow, dottedVLine, pencilLine, phraseWrap, rectA, tapeImg, textW, UI } from './window';

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
  /** Most sold per visit (default: the item's `shopLimit`). */
  limit?: (id: string) => number;
  /**
   * After a purchase (`n` = purchases so far, 1 = first): the keeper's lines
   * (pages), or a script for something more than a line.
   */
  onBuy?: (id: string, n: number) => string[] | Co | null;
  noMoney?: string[];
  bagFull?: string[];
  /** Lines when something has sold out for this visit. */
  soldOut?: string[];
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
    // the first きなこぼう: one stick in the bag really is an あたり (her line
    // is about that stick), so it only happens when there is room for it
    if (id === 'item_kinakobou' && !flag('flag_shop_kinako') && addItem('item_kinakobou')) {
      setFlag('flag_shop_kinako', 1);
      return kinakoAtari();
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

/** 〔きなこぼうを初めて買ったとき〕: an あたり in the bag, and おばあ never put one in. */
function* kinakoAtari(): Co {
  sfx('se_item');
  yield* say('1本だけ、棒の 先が 赤い。{w=300}\n……あたり！ きなこぼうを\nもう1本 もらった。', { voice: 'sys' });
  yield* say(['きなこぼうの あたり、\nまた 出たよ。今日 3本目。', '……あたり、入れて\nないんだけどねえ。'], { name: 'おばあ', voice: 'obaa' });
}

// ---- the shop screen -----------------------------------------------------------------------

const PANEL = { x: 8, y: 6, w: W - 16, h: 138 };
/** The 説明欄: exactly where the dialog window opens (10.4), so the keeper's lines replace it. */
const DESC = { x: 8, y: H - 68, w: W - 16, h: 64, textX: 26 };
const CARD_X = PANEL.x + 12;
const CARD_Y = PANEL.y + 30;
const CARD_W = 172;
const CARD_H = 19;
/** Right column. */
const RX = PANEL.x + 200;
const RW = PANEL.x + PANEL.w - 12 - RX;
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
/** Most of one thing bought in one go. */
const QTY_MAX = 9;
/** After a purchase (or a refusal) the list ignores 決定 this long. */
const LOCK_MS = 300;

interface Confirm {
  id: string;
  qty: number;
  /** 0 = 買う, 1 = やめる (the default). */
  index: number;
  t: number;
  moveT: number;
  qtyT: number;
  qtyDir: number;
  pressT: number;
}

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
  private lockT = 0;
  private refuseT = 999;
  private goods: string[];
  private leaving = false;
  private confirm: Confirm | null = null;
  /** Bought during this visit, by id (for the per-visit limit). */
  private boughtNow = new Map<string, number>();

  constructor(private def: ShopDef) {
    this.goods = def.goods();
  }

  enter(): void {
    sfx('se_menu_open');
  }

  private price(id: string): number {
    return this.def.price?.(id) ?? getItem(id)?.price ?? 0;
  }

  /** How many more of `id` this visit (Infinity = no limit). */
  private left(id: string): number {
    const lim = this.def.limit?.(id) ?? shopLimit(id);
    return Math.max(0, lim - (this.boughtNow.get(id) ?? 0));
  }

  /** Largest sensible quantity: what the purse, the bag and the shop allow (at least 1). */
  private maxQty(id: string): number {
    const price = this.price(id);
    const money = price > 0 ? Math.floor(state.money / price) : QTY_MAX;
    const bag = isKeyItem(id) ? QTY_MAX : BAG_MAX - bagCount();
    return Math.max(1, Math.min(QTY_MAX, money, bag, this.left(id)));
  }

  update(dt: number): void {
    this.t += dt;
    this.moveT += dt;
    this.purseT += dt;
    this.refuseT += dt;
    if (this.lockT > 0) this.lockT -= dt;
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
    if (this.confirm) {
      this.updateConfirm(dt);
      return;
    }
    const n = this.goods.length;
    if (n && input.repeat('down')) this.move(1, n);
    else if (n && input.repeat('up')) this.move(-1, n);
    if (this.lockT > 0) return;
    if (input.pressed('confirm') && n) this.pick();
    else if (input.pressed('cancel') || input.pressed('menu')) this.leave();
  }

  private move(d: number, n: number): void {
    this.sel = (this.sel + d + n) % n;
    this.moveT = 0;
    sfx('se_cursor');
  }

  private pick(): void {
    const id = this.goods[this.sel];
    if (!id || !getItem(id)) return;
    if (this.left(id) <= 0) {
      sfx('se_buzzer');
      this.refuseT = 0;
      const lines = this.def.soldOut;
      if (lines?.length) this.run(say(lines, { name: this.def.keeper.name, voice: this.def.keeper.voice }));
      return;
    }
    sfx('se_confirm');
    this.confirm = { id, qty: 1, index: 1, t: 0, moveT: 999, qtyT: 999, qtyDir: 0, pressT: -1 };
  }

  private updateConfirm(dt: number): void {
    const c = this.confirm!;
    c.t += dt;
    c.moveT += dt;
    c.qtyT += dt;
    if (c.pressT >= 0) {
      c.pressT += dt;
      if (c.pressT >= 110) {
        this.confirm = null;
        if (c.index === 0) this.buy(c.id, c.qty);
        else this.lockT = LOCK_MS;
      }
      return;
    }
    if (c.t < 120) return;
    const input = game.input;
    if (input.repeat('up') || input.repeat('down')) {
      c.index = 1 - c.index;
      c.moveT = 0;
      sfx('se_cursor');
    }
    const max = this.maxQty(c.id);
    const d = input.repeat('right') ? 1 : input.repeat('left') ? -1 : 0;
    if (d) {
      const q = Math.max(1, Math.min(max, c.qty + d));
      if (q !== c.qty) {
        c.qty = q;
        c.qtyT = 0;
        c.qtyDir = d;
        sfx('se_count');
      } else {
        // at the end of the range: the arrow twitches
        c.qtyT = 0;
        c.qtyDir = 0;
        sfx('se_cursor', { pitch: 0.7, vol: 0.6 });
      }
    }
    if (input.pressed('confirm')) {
      sfx(c.index === 0 ? 'se_confirm' : 'se_cancel');
      c.pressT = 0;
    } else if (input.pressed('cancel')) {
      sfx('se_cancel');
      this.confirm = null;
      this.lockT = LOCK_MS;
    }
  }

  private run(co: Co): void {
    this.busy = true;
    const self = this;
    game.scripts.run(
      (function* () {
        yield* co;
        self.busy = false;
        self.lockT = LOCK_MS;
      })(),
    );
  }

  private buy(id: string, qty: number): void {
    const price = this.price(id);
    const def = this.def;
    const self = this;
    const keeper = { name: def.keeper.name, voice: def.keeper.voice };
    this.run(
      (function* (): Co {
        if (state.money < price * qty) {
          sfx('se_buzzer');
          if (def.noMoney) yield* say(def.noMoney, keeper);
          return;
        }
        if (!isKeyItem(id) && bagCount() + qty > BAG_MAX) {
          sfx('se_buzzer');
          if (def.bagFull) yield* say(def.bagFull, keeper);
          return;
        }
        state.money -= price * qty;
        for (let i = 0; i < qty; i++) addItem(id);
        self.boughtNow.set(id, (self.boughtNow.get(id) ?? 0) + qty);
        setFlag('flag_bought', flag('flag_bought') + 1);
        self.purseT = 0;
        sfx('se_coin');
        sfx('se_shop_buy');
        yield 180;
        const after = def.onBuy?.(id, flag('flag_bought'));
        if (Array.isArray(after)) {
          if (after.length) yield* say(after, keeper);
        } else if (after) yield* after;
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
    // the 説明欄 rises from below; the keeper's window opens over it while she talks
    g.alpha(k, () => g.translated(0, Math.round((1 - e) * 10), () => this.drawDesc(g)));
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
    // how full the bag is (left of the purse)
    const bag = `${bagCount()}/${BAG_MAX}`;
    const bx = mx - mw - 30;
    drawDigits(g, bag, bx, P.y + 12, { color: UI.pencil, align: 'right' });
    g.text('もちもの', bx - digitsWidth(bag) - 4 - textW('もちもの'), P.y + 7, { color: UI.pencil });
    // price cards
    const n = this.goods.length;
    if (!n) g.text('きょうは 売りきれ。', CARD_X + 6, CARD_Y + 8, { color: UI.textDim });
    this.goods.forEach((id, i) => {
      const it = getItem(id);
      if (!it) return;
      const [jx, jy] = JITTER[i % JITTER.length];
      const sel = i === this.sel;
      const out = this.left(id) <= 0;
      const wob = sel && this.refuseT < 240 ? Math.round(Math.sin(this.refuseT / 24) * 2 * (1 - this.refuseT / 240)) : 0;
      const x = CARD_X + jx + (sel ? 4 : 0) + wob;
      const y = CARD_Y + i * (CARD_H + 2) + jy - (sel ? 1 : 0);
      rectA(g, x + 2, y + 2, CARD_W, CARD_H, UI.night, 0.25);
      g.rect(x, y, CARD_W, CARD_H, UI.border);
      g.rect(x + 1, y + 1, CARD_W - 2, CARD_H - 2, out ? '#E9E4D6' : UI.flipPaper);
      // a pin of masking tape on the left end
      g.img(tapeImgSmall(i), x - 3, y + 5);
      const focus = !this.confirm || this.confirm.id === id;
      if (sel) drawMarker(g, x + 8, y + 3, textW(it.name) + 4, 14, Math.min(1, this.moveT / 70), focus ? UI.marker : '#EFE4C6');
      g.text(it.name, x + 10, y + 2, { color: out ? UI.textDim : UI.text });
      if (out) {
        // sold out for this visit: the price is crossed off and 「うりきれ」 pencilled in
        const pw = digitsWidth(`${this.price(id)}円`);
        const px = x + CARD_W - 6 - pw;
        drawDigits(g, `${this.price(id)}円`, x + CARD_W - 6, y + 7, { color: UI.textDim, align: 'right' });
        g.rect(px - 1, y + 10, pw + 2, 1, UI.accent);
        const sw = textW('うりきれ');
        if (10 + textW(it.name) + 8 + sw + pw + 8 <= CARD_W) g.text('うりきれ', px - 6 - sw, y + 2, { color: UI.accent });
      } else drawDigits(g, `${this.price(id)}円`, x + CARD_W - 6, y + 7, { color: UI.accent, align: 'right' });
      if (sel && !this.confirm) drawCursor(g, x - 14, y + 1, this.t);
    });
    this.drawChosen(g);
  }

  /** Right column: the chosen sweet — name, icon, kind, how many in the bag, price. */
  private drawChosen(g: Gfx): void {
    const id = this.goods[this.sel];
    const it = id ? getItem(id) : null;
    if (!id || !it) return;
    const x = RX;
    let y = PANEL.y + 29;
    // name in 朱 with a pencil underline; squeezed a pixel a letter if it would pass the frame
    const nw = textW(it.name);
    const sp = nw <= RW ? 0 : nw - [...it.name].length <= RW ? -1 : -2;
    const drawnW = g.text(it.name, x, y, { color: UI.accent, spacing: sp });
    pencilLine(g, x, y + 17, Math.min(RW, drawnW + 2), 1, UI.accentDark, 4);
    y += 24;
    // the icon on a sticky card, the kind and the count beside it
    rectA(g, x + 2, y + 2, 30, 30, UI.night, 0.35);
    g.rect(x, y, 30, 30, UI.stickyEdge);
    g.rect(x + 1, y + 1, 28, 28, UI.tape);
    g.rect(x + 1, y + 1, 28, 1, '#FBD9A0');
    g.img(itemIcon24(id), x + 3, y + 3);
    const kind = isKeyItem(id) ? 'だいじなもの' : it.cure ? 'くすり' : it.mp ? 'ハンコ用' : 'たべもの';
    g.text(kind, x + 38, y - 1, { color: UI.pencil });
    g.text('もっている', x + 38, y + 15, { color: UI.text });
    drawNumerals(g, String(countItem(id)), x + 38 + textW('もっている') + 5, y + 15, { color: UI.accent });
    y += 38;
    // price, and how many are left for this visit
    g.text('ねだん', x, y, { color: UI.pencil });
    const pv = String(this.price(id));
    const px = x + textW('ねだん') + 6;
    drawNumerals(g, pv, px, y, { color: UI.accent });
    g.text('円', px + numeralsWidth(pv) + 2, y, { color: UI.accent });
    const left = this.left(id);
    if (Number.isFinite(left)) {
      const s = left > 0 ? 'きょうは あと' : 'きょうは うりきれ';
      g.text(s, x, y + 19, { color: left > 0 ? UI.pencil : UI.textDim });
      if (left > 0) {
        const lx = x + textW(s) + 5;
        drawNumerals(g, String(left), lx, y + 19, { color: UI.text });
        g.text('こ', lx + numeralsWidth(String(left)) + 2, y + 19, { color: UI.pencil });
      }
    }
  }

  /** The 説明欄 (or the purchase confirmation) in the dialog window's place. */
  private drawDesc(g: Gfx): void {
    const D = DESC;
    drawWindow(g, D.x, D.y, D.w, D.h, UI, 1, { margin: 14, curl: false });
    if (dialogVisible()) return;
    const c = this.confirm;
    if (c) {
      this.drawConfirm(g, c);
      return;
    }
    const id = this.goods[this.sel];
    const it = id ? getItem(id) : null;
    if (!it) return;
    const w = D.w - (D.textX - D.x) - 12;
    const flavor = phraseWrap(it.desc[0], w);
    const eff = it.desc[1] ? phraseWrap(it.desc[1], w) : [];
    // 1 line of flavour + 1 of effect normally; longer texts get 2 + 1
    const fl = flavor.slice(0, Math.max(1, 3 - eff.length));
    let y = D.y + 8;
    for (const l of fl) {
      g.text(l, D.textX, y, { color: UI.text });
      y += 18;
    }
    for (const l of eff.slice(0, 3 - fl.length)) {
      g.text(l, D.textX + 2, y, { color: UI.pencil });
      y += 18;
    }
  }

  private drawConfirm(g: Gfx, c: Confirm): void {
    const D = DESC;
    const it = getItem(c.id)!;
    const price = this.price(c.id);
    const k = Math.min(1, c.t / 120);
    g.alpha(k, () => {
      // 「ラムネを 買う？」 (the item name in 朱, 10.4 @sys)
      let x = D.textX;
      const y1 = D.y + 8;
      x += g.text(it.name, x, y1, { color: UI.accent });
      g.text('を 買う？', x, y1, { color: UI.sys });
      // quantity: ◀ 2こ ▶  and the total
      const y2 = D.y + 32;
      const max = this.maxQty(c.id);
      g.text('かず', D.textX, y2, { color: UI.pencil });
      const ax = D.textX + textW('かず') + 8;
      const nudge = c.qtyT < 90 ? Math.round(2 * (1 - c.qtyT / 90)) : 0;
      arrow(g, ax - (c.qtyDir < 0 ? nudge : 0), y2 + 3, -1, c.qty > 1);
      const qs = String(c.qty);
      const qx = ax + 11;
      const qw = numeralsWidth(qs) + 2 + 16;
      drawNumerals(g, qs, qx, y2, { color: UI.text });
      g.text('こ', qx + numeralsWidth(qs) + 2, y2, { color: UI.text });
      pencilLine(g, qx - 1, y2 + 17, qw + 2, 1, UI.pencil, 11);
      arrow(g, qx + qw + 6 + (c.qtyDir > 0 ? nudge : 0), y2 + 3, 1, c.qty < max);
      const tx = D.textX + 116;
      g.text('ごうけい', tx, y2, { color: UI.pencil });
      const total = String(price * c.qty);
      const vx = tx + textW('ごうけい') + 6;
      const short = state.money < price * c.qty;
      drawNumerals(g, total, vx, y2, { color: short ? UI.textDim : UI.accent });
      g.text('円', vx + numeralsWidth(total) + 2, y2, { color: short ? UI.textDim : UI.accent });
      // 買う／やめる, right of a dotted rule
      const ox = D.x + D.w - 84;
      dottedVLine(g, ox - 10, D.y + 8, D.y + D.h - 9, UI.bg2, 2);
      ['買う', 'やめる'].forEach((s, i) => {
        const ry = D.y + 11 + i * 20;
        const sel = i === c.index;
        if (sel) drawMarker(g, ox + 12, ry + 1, textW(s) + 5, 15, Math.min(1, c.moveT / 70));
        g.text(s, ox + 14, ry, { color: UI.text });
        if (sel) drawCursor(g, ox, ry, this.t, c.pressT);
      });
    });
  }
}

/** Ink triangle (5×9) for the quantity; pale when it can't go further. */
function arrow(g: Gfx, x: number, y: number, dir: number, on: boolean): void {
  const col = on ? UI.text : '#CFC6AE';
  for (let i = 0; i < 5; i++) {
    const cx = dir > 0 ? x + i : x + 4 - i;
    g.rect(cx, y + i, 1, 9 - i * 2, col);
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
