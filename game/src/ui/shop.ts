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
// moment. A shop sells at most `shopLimit(id)` of a thing a day — the
// count is kept in the save (state.flags), so walking out and back in
// doesn't restock the shelf. A sold-out card gets the shop's 「売切」 seal
// and its price struck through.

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import { hash2 } from '../engine/rng';
import { H, W } from '../engine/screen';
import { ease } from '../engine/tween';
import { addItem, countItem, flag, setFlag, state } from '../game/state';
import { getItem, isKeyItem, shopLimit } from '../data/battle';
import { sfx } from '../audio';
import { dialogVisible, say } from './dialog';
import { digitsWidth, drawDigits, drawNumerals, numeralsWidth } from './digits';
import { itemIcon24, purseIcon } from './icons';
import { HOSHI_SPEAKERS, MUJIN_SHOP } from '../data/text/hoshi_npcs';
import { bagCount, BAG_MAX } from './menu/items';
import { uiHud } from './hud';
import { ctxText, rgb, drawCursor, drawMarker, drawTape, drawWindow, dottedVLine, pencilLine, phraseWrap, rectA, tapeImg, textW, UI } from './window';

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
  /** Most sold in the day (default: the item's `shopLimit`). */
  limit?: (id: string) => number;
  /**
   * After a purchase (`n` = purchases so far, 1 = first): the keeper's lines
   * (pages), or a script for something more than a line.
   */
  onBuy?: (id: string, n: number) => string[] | Co | null;
  noMoney?: string[];
  bagFull?: string[];
  /** Lines when something has sold out for the day. */
  soldOut?: string[];
  /** Lines when the player leaves. */
  bye?: () => string[] | null;
  /**
   * The limit is for one visit, not a day (無人販売所, 50_ch2_story 7.3):
   * walking up to the stall again restocks it.
   */
  perVisit?: boolean;
  /** The sound of paying (default: se_coin + se_shop_buy at the till). */
  buySfx?: () => void;
  /** The sign's tape colour (default: the yellow of ひのや's). */
  signColor?: string;
}

const shops = new Map<string, ShopDef>();

/** How many of `item` this shop has sold today (kept in the save). */
function soldKey(shop: string, item: string): string {
  return `flag_shop_sold_${shop}_${item}`;
}

export function soldToday(shop: string, item: string): number {
  return flag(soldKey(shop, item));
}

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
  soldOut: ['それは きょうは もう おしまい。{w=300}\n買いしめは なしだよ。'],
  bagFull: ['もちものが いっぱいだよ。{w=300}\nポケットは 2つしか ないだろ。'],
  bye: () => {
    const s = flag('flag_stage');
    if (s === 0) return ['チャイムが 鳴ったら 帰るんだよ。'];
    if (s === 1) return ['気を つけて おいき。'];
    return ['……ちゃんと 帰って おいでよ。'];
  },
});

// ---- 星見台 無人販売所 (50_ch2_story 7.3, 51 6.3) ------------------------------------------------
//
// The stall by the road: きゅうりの一本漬け, ゆでとうもろこし and 梅干し, 100円
// each, at most 3 / 1 / 2 in one visit (walk up again and it's full). The
// money goes into the wooden box (se_h_coin_box). サワコさん minds it — also
// while ムジン販売員 is out and about. The words are the scenario's
// (data/text/hoshi_npcs MUJIN_SHOP), so a rename there reaches the shop.

const SAWAKO = HOSHI_SPEAKERS.npc_hoshi_sawako ?? { name: 'サワコさん', voice: 'h_sawako' };

registerShop({
  id: 'shop_hoshi_mujin',
  title: MUJIN_SHOP.title,
  keeper: { name: SAWAKO.name, voice: SAWAKO.voice },
  goods: () => MUJIN_SHOP.goods.filter((id) => !!getItem(id)),
  price: () => MUJIN_SHOP.price,
  limit: (id) => MUJIN_SHOP.limits[id] ?? 3,
  perVisit: true,
  signColor: '#D8B888',
  buySfx: () => sfx('se_h_coin_box'),
  onBuy: (id) => {
    // the first ゆでとうもろこし has its own line; the first purchase ever
    // is the 「まいど」 she didn't mean to say; after that two lines in turn
    if (id === 'item_toumorokoshi' && !flag('flag_ch2_mujin_corn')) {
      setFlag('flag_ch2_mujin_corn', 1);
      return MUJIN_SHOP.corn;
    }
    if (!flag('flag_ch2_mujin_first')) {
      setFlag('flag_ch2_mujin_first', 1);
      return MUJIN_SHOP.first;
    }
    const n = flag('flag_ch2_mujin_n');
    setFlag('flag_ch2_mujin_n', n + 1);
    return MUJIN_SHOP.again[n % MUJIN_SHOP.again.length];
  },
  noMoney: MUJIN_SHOP.noMoney,
  bagFull: MUJIN_SHOP.bagFull,
  bye: () => MUJIN_SHOP.bye,
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

  constructor(private def: ShopDef) {
    this.goods = def.goods();
    // a stall that restocks on every visit: the shelf is full again
    if (def.perVisit) for (const id of this.goods) if (state.flags[soldKey(def.id, id)]) state.flags[soldKey(def.id, id)] = 0;
  }

  enter(): void {
    sfx('se_menu_open');
  }

  private price(id: string): number {
    return this.def.price?.(id) ?? getItem(id)?.price ?? 0;
  }

  /** How many more of `id` can be bought today (Infinity = no limit). */
  private left(id: string): number {
    const lim = this.def.limit?.(id) ?? shopLimit(id);
    return Math.max(0, lim - soldToday(this.def.id, id));
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
        const key = soldKey(def.id, id);
        setFlag(key, flag(key) + qty);
        setFlag('flag_bought', flag('flag_bought') + 1);
        self.purseT = 0;
        if (def.buySfx) def.buySfx();
        else {
          sfx('se_coin');
          sfx('se_shop_buy');
        }
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
    drawTape(g, P.x + 10, P.y + 6, textW(this.def.title) + 18, 18, this.def.title, { color: this.def.signColor ?? '#F6D98A', seed: 7 });
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
        // sold out for the day: the price is struck through and the shop's
        // 「売切」 seal is pressed beside it — the same on every card
        const pw = digitsWidth(`${this.price(id)}円`);
        const px = x + CARD_W - 6 - pw;
        drawDigits(g, `${this.price(id)}円`, x + CARD_W - 6, y + 7, { color: UI.textDim, align: 'right' });
        g.rect(px - 1, y + 10, pw + 2, 1, UI.accent);
        const seal = soldOutSeal();
        // a hand-pressed seal: each card's sits a pixel differently, and it
        // may overhang the card's edge (the ink goes where the hand put it)
        g.img(seal, px - 5 - seal.width + (i % 2), y - 1 + (i % 3 === 1 ? 1 : 0), { alpha: 0.92 });
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
      const visit = !!this.def.perVisit;
      const s = left > 0 ? (visit ? 'のこり' : 'きょうは あと') : visit ? 'うりきれ' : 'きょうは うりきれ';
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

let sealC: HTMLCanvasElement | null = null;
/**
 * The shop's 「売切」 seal (38×20): a rounded 朱 frame round two characters,
 * pressed a little unevenly — the left edge lighter, a few specks missing,
 * the lower right a shade darker where the hand leant.
 */
function soldOutSeal(): HTMLCanvasElement {
  if (sealC) return sealC;
  const w = 38;
  const h = 20;
  const [c, ctx] = makeCanvas(w, h, { willReadFrequently: true });
  ctx.fillStyle = UI.accent;
  ctx.fillRect(2, 0, w - 4, 1);
  ctx.fillRect(2, h - 1, w - 4, 1);
  ctx.fillRect(0, 2, 1, h - 4);
  ctx.fillRect(w - 1, 2, 1, h - 4);
  ctx.fillRect(1, 1, 1, 1);
  ctx.fillRect(w - 2, 1, 1, 1);
  ctx.fillRect(1, h - 2, 1, 1);
  ctx.fillRect(w - 2, h - 2, 1, 1);
  ctxText(ctx, '売切', 3, 2, UI.accent);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [dr, dg, db] = rgb(UI.accentDark);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!d[i + 3]) continue;
      const n = hash2(x, y, 31);
      // かすれ: specks the ink missed, more of them on the lighter left side
      if (n < 0.04 + (x < 6 ? 0.07 : 0)) d[i + 3] = 0;
      else if (x + y > w - 4 && n > 0.62) {
        d[i] = dr;
        d[i + 1] = dg;
        d[i + 2] = db;
      }
    }
  ctx.putImageData(img, 0, 0);
  sealC = c;
  return c;
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
