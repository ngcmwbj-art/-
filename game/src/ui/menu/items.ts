// もちもの (30_level_art 10.7, 10_narrative 10 / 12.4): the bag on the left
// page (consumables, then だいじなもの under a dotted rule), the chosen
// thing on the right page (a sticky card with its icon at 2×, name in 朱,
// flavour text, effect in pencil). 決定 opens a sticky note with
// つかう／わたす／すてる: つかう = ミナト uses it, わたす = hand it to
// カネナリくん (it disappears into his zipper, 10.1).

import type { Co } from '../../engine/co';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { flag, state } from '../../game/state';
import { getItem, isKeyItem, useItemInField, canUseItemInField } from '../../data/battle';
import { sfx } from '../../audio';
import { say } from '../dialog';
import { drawDigits, drawNumerals } from '../digits';
import { itemIcon12, itemIcon24 } from '../icons';
import { dottedLine, drawCursor, drawMarker, pencilLine, phraseWrap as wrap, rectA, textW, UI } from '../window';
import { drawHeader, drawScroll, FOLD, LP, Popup, RP, SP, type PopupOpt } from './notebook';
import type { MenuCtx, MenuPage } from './types';

export const BAG_MAX = 14;

interface Row {
  id: string;
  n: number;
  key: boolean;
}

/** Consumables grouped by id (first-seen order), then key items. */
export function bagRows(): { items: Row[]; keys: Row[] } {
  const items: Row[] = [];
  const keys: Row[] = [];
  for (const id of state.inventory) {
    const key = isKeyItem(id);
    const list = key ? keys : items;
    const r = list.find((x) => x.id === id);
    if (r) r.n++;
    else list.push({ id, n: 1, key });
  }
  return { items, keys };
}

export function bagCount(): number {
  return state.inventory.filter((id) => !isKeyItem(id)).length;
}

/** おつかいメモ, line 2: what Minato scribbled last (10_narrative 10.3). */
export function memoProgress(): string {
  const table: [string, string][] = [
    ['flag_errand', '→ 肉のマルヤマ（坂を 上って 右）'],
    ['flag_met_maruyama', '→ 揚げたては 5時の チャイムの あと'],
    ['flag_chime_stopped', '→ チャイムが 止まった？'],
    ['flag_got_hanko', '→ 公園？ 鐘の 頭の 人'],
    ['flag_broadcast', '→ モール 迷子センター（北東）'],
    ['flag_mall_entered', '→ 迷子センターは 2F。カギ？'],
    ['flag_got_maigo_key', '→ 2Fの 迷子センターへ'],
    ['flag_boss_beaten', '→ 肉屋！'],
  ];
  let s = '';
  for (const [f, t] of table) if (flag(f)) s = t;
  return s;
}

type Slot = { kind: 'row'; row: Row } | { kind: 'sep' };

const VISIBLE = 8;
const ROW_H = 18;
const LIST_Y = SP.y + 28;

export class ItemsPage implements MenuPage {
  private sel = 0;
  private scroll = 0;
  private moveT = 999;
  private popup: Popup | null = null;
  private popupFor: Row | null = null;
  private mode: 'list' | 'action' | 'confirm' = 'list';

  private slots(): Slot[] {
    const { items, keys } = bagRows();
    const out: Slot[] = items.map((row) => ({ kind: 'row', row }));
    if (keys.length) {
      out.push({ kind: 'sep' });
      for (const row of keys) out.push({ kind: 'row', row });
    }
    return out;
  }

  show(): void {
    this.scroll = 0;
    this.sel = 0;
    this.fix(this.slots());
  }

  enter(): boolean {
    const s = this.slots();
    if (!s.some((x) => x.kind === 'row')) return false;
    this.fix(s);
    this.mode = 'list';
    return true;
  }

  private fix(s: Slot[]): void {
    if (!s.length) {
      this.sel = 0;
      return;
    }
    this.sel = Math.max(0, Math.min(s.length - 1, this.sel));
    if (s[this.sel]?.kind === 'sep') this.sel = Math.min(s.length - 1, this.sel + 1);
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + VISIBLE) this.scroll = this.sel - VISIBLE + 1;
    this.scroll = Math.max(0, Math.min(Math.max(0, s.length - VISIBLE), this.scroll));
  }

  private current(): Row | null {
    const s = this.slots()[this.sel];
    return s && s.kind === 'row' ? s.row : null;
  }

  update(m: MenuCtx, dt: number, input: Input): boolean {
    this.moveT += dt;
    if (this.popup) {
      const r = this.popup.update(dt, input);
      if (r === null) return true;
      const row = this.popupFor!;
      if (this.mode === 'action') {
        this.popup = null;
        if (r < 0) return true;
        this.act(m, row, r);
      } else if (this.mode === 'confirm') {
        this.popup = null;
        this.mode = 'list';
        if (r === 0) {
          const name = getItem(row.id)!.name;
          const i = state.inventory.indexOf(row.id);
          if (i >= 0) state.inventory.splice(i, 1);
          sfx('se_cancel', { pitch: 0.8 });
          m.run(say(`${name}を すてた。`, { voice: 'sys' }));
          this.fix(this.slots());
        }
      }
      return true;
    }
    const s = this.slots();
    if (!s.some((x) => x.kind === 'row')) return false;
    if (input.repeat('down')) this.move(s, 1);
    else if (input.repeat('up')) this.move(s, -1);
    if (input.pressed('cancel')) {
      sfx('se_cancel');
      return false;
    }
    if (input.pressed('confirm')) {
      const row = this.current();
      if (!row) return true;
      sfx('se_confirm');
      const kan = state.party.some((p) => p.id === 'kanenari');
      const opts = [
        { label: 'つかう' },
        { label: 'わたす', disabled: row.key || !kan },
        { label: 'すてる', disabled: row.key },
      ];
      this.popup = this.popupAtRow(opts, '', { minW: 76 });
      this.popupFor = row;
      this.mode = 'action';
    }
    return true;
  }

  /**
   * A sticky note on the list page, just under the chosen row (or above it
   * near the bottom): the description on the right page stays readable.
   */
  private popupAtRow(opts: PopupOpt[], title: string, o: { minW?: number; index?: number }): Popup {
    const rowY = LIST_Y + (this.sel - this.scroll) * ROW_H;
    const p = new Popup(opts, LP.x + 26, rowY + ROW_H, title, o);
    const bottom = SP.y + SP.h - 4;
    if (p.y + p.h > bottom) p.y = rowY - p.h - 2;
    p.y = Math.max(SP.y + 4, p.y);
    // keep it on the left page (a long title may reach the fold at most)
    p.x = Math.max(SP.x + 6, Math.min(p.x, FOLD + 6 - p.w));
    return p;
  }

  private move(s: Slot[], d: number): void {
    let i = this.sel;
    for (let k = 0; k < s.length; k++) {
      i = (i + d + s.length) % s.length;
      if (s[i].kind === 'row') break;
    }
    if (i !== this.sel) {
      this.sel = i;
      this.moveT = 0;
      sfx('se_cursor');
      this.fix(s);
    }
  }

  private act(m: MenuCtx, row: Row, action: number): void {
    const it = getItem(row.id);
    if (!it) return;
    if (action === 2) {
      // すてる
      if (row.key) {
        m.run(say('これは すてられない。', { voice: 'sys' }));
        return;
      }
      this.mode = 'confirm';
      // 「$itemを すてる？」 (12.4); a long name goes on its own line so the note stays on the list page
      const q = `${it.name}を すてる？`;
      const title = textW(q) + 16 <= FOLD - SP.x - 6 ? q : `${it.name}を\nすてる？`;
      this.popup = this.popupAtRow([{ label: 'すてる' }, { label: 'やめる' }], title, { index: 1 });
      this.popupFor = row;
      return;
    }
    this.mode = 'list';
    if (row.key) {
      if (action === 0) this.useKey(m, row.id);
      return;
    }
    const target = action === 1 ? 'kanenari' : 'minato';
    m.run(this.useCo(row.id, target));
  }

  private useKey(m: MenuCtx, id: string): void {
    if (id === 'item_hanko_case') m.goTab('hanko');
    else if (id === 'item_mimashita_cho') m.goTab('book');
    else if (id === 'item_otsukai_memo') {
      const p = memoProgress();
      m.run(say(['コロッケ 4つ。ソースは べつ。' + (p ? '\n' + p : '')], { voice: 'narr' }));
    } else m.run(say('今は 使う ときじゃない。', { voice: 'sys' }));
  }

  private *useCo(id: string, target: string): Co {
    const it = getItem(id)!;
    const who = state.party.find((p) => p.id === target);
    if (!who || !canUseItemInField(id, target)) {
      sfx('se_buzzer');
      return;
    }
    // heals on a full member: don't waste them (a capsule is a surprise, so it can be opened)
    const healOnly = (it.heal || it.healRate) && it.special !== 'capsule' && !it.cure && !it.mp;
    const full = it.target === 'allies' ? state.party.every((p) => p.hp >= p.maxHp) : who.hp >= who.maxHp;
    if (healOnly && full) {
      sfx('se_buzzer');
      yield* say(it.target === 'allies' ? 'みんな もう 元気いっぱいだ。' : `${who.name}の HPは もう いっぱいだ。`, { voice: 'sys' });
      return;
    }
    if (id === 'item_stamp_pad' && who.maxMp > 0 && who.mp >= who.maxMp) {
      sfx('se_buzzer');
      yield* say('朱肉は もう たっぷりだ。', { voice: 'sys' });
      return;
    }
    // 「HPが 0 回復した。」 reads badly: say that it was already full
    const pages = useItemInField(id, target).map((p) => p.replace(/^(.+)の HPが 0 回復した。$/m, '$1の HPは もう いっぱいだ。'));
    if (!pages.length) return;
    const healed = pages.some((p) => p.includes('回復') || p.includes('すっきり'));
    if (target === 'kanenari') sfx('se_zipper', { vol: 0.8 });
    if (healed) sfx('se_heal');
    yield* say(pages, { voice: 'sys' });
    this.fix(this.slots());
  }

  // ---- drawing ----------------------------------------------------------------------

  draw(g: Gfx, m: MenuCtx): void {
    const s = this.slots();
    drawHeader(g, 'もちもの', LP.x, SP.y + 6, '#F7C27A', 1, 2);
    // capacity, like a tally in the corner: 5/14
    drawDigits(g, `${bagCount()}/${BAG_MAX}`, FOLD - 12, SP.y + 12, { color: UI.pencil, align: 'right' });
    if (!s.length) {
      g.text('なにも ない。', LP.x + 8, LIST_Y + 20, { color: UI.textDim });
    }
    for (let i = 0; i < VISIBLE; i++) {
      const k = this.scroll + i;
      const sl = s[k];
      if (!sl) break;
      const y = LIST_Y + i * ROW_H;
      if (sl.kind === 'sep') {
        dottedLine(g, LP.x - 4, y + 9, FOLD - 12, UI.pencil, 3);
        const lw = textW('だいじなもの') + 8;
        g.rect(LP.x + 18, y + 1, lw, 16, UI.bg);
        g.text('だいじなもの', LP.x + 22, y + 1, { color: UI.pencil });
        continue;
      }
      const row = sl.row;
      const it = getItem(row.id);
      const sel = k === this.sel;
      const name = it?.name ?? row.id;
      if (sel) drawMarker(g, LP.x + 12, y + 1, textW(name) + 4, 15, m.focus && !this.popup ? Math.min(1, this.moveT / 70) : 1, m.focus ? UI.marker : '#EFE4C6');
      g.img(itemIcon12(row.id), LP.x - 3, y + 2);
      if (row.n > 1) {
        // how many, pencilled on the icon's corner
        drawDigits(g, String(Math.min(99, row.n)), LP.x + 11, y + 9, { color: UI.accent, outline: UI.bg, align: 'right' });
      }
      g.text(name, LP.x + 14, y, { color: UI.text });
      if (sel && m.focus) drawCursor(g, SP.x + 1, y, m.t);
    }
    if (this.scroll > 0) drawScroll(g, FOLD - 18, LIST_Y - 5, true, m.t);
    if (this.scroll + VISIBLE < s.length) drawScroll(g, FOLD - 18, LIST_Y + VISIBLE * ROW_H + 2, false, m.t);
    this.drawDetail(g, m);
    this.popup?.draw(g);
  }

  private drawDetail(g: Gfx, m: MenuCtx): void {
    const row = this.current();
    if (!row) {
      wrap('ポケットは からっぽ。', RP.w - 4).forEach((l, i) => g.text(l, RP.x + 4, SP.y + 40 + i * 17, { color: UI.textDim }));
      return;
    }
    const it = getItem(row.id);
    if (!it) return;
    const x = RP.x;
    let y = SP.y + 8;
    // sticky card with the icon at 2×
    rectA(g, x + 2, y + 2, 30, 30, UI.night, 0.35);
    g.rect(x, y, 30, 30, UI.stickyEdge);
    g.rect(x + 1, y + 1, 28, 28, UI.tape);
    g.rect(x + 1, y + 1, 28, 1, '#FBD9A0');
    g.img(itemIcon24(row.id), x + 3, y + 3);
    // kind + how many
    const kind = row.key ? 'だいじなもの' : it.cure ? 'くすり' : it.mp ? 'ハンコ用' : 'たべもの';
    g.text(kind, x + 36, y - 1, { color: UI.pencil });
    if (!row.key) {
      g.text('もっている', x + 36, y + 15, { color: UI.text });
      drawNumerals(g, `${row.n}`, x + 36 + textW('もっている') + 5, y + 15, { color: UI.accent });
    }
    // name in 朱 with a pencil underline
    y += 36;
    g.text(it.name, x, y, { color: UI.accent });
    pencilLine(g, x, y + 16, textW(it.name) + 2, 1, UI.accentDark, row.id.length);
    y += 22;
    // flavour text
    // a key item's two lines are one text; the second starts a new line, as written (10.2)
    const flavor = row.id === 'item_otsukai_memo' ? 'コロッケ 4つ。ソースは べつ。' : it.desc[0] + (row.key && it.desc[1] ? '\n' + it.desc[1] : '');
    const lines = wrap(flavor, RP.w - 2);
    for (const l of lines.slice(0, 4)) {
      g.text(l, x, y, { color: UI.text });
      y += 17;
    }
    // effect / progress in pencil
    const eff = row.id === 'item_otsukai_memo' ? memoProgress() : row.key ? '' : it.desc[1];
    if (eff) {
      y += 3;
      const el = wrap(eff, RP.w - 6);
      el.slice(0, 3).forEach((l, i) => {
        // Minato's own hand: every other letter bobs a pixel (10.3 少し斜めの字)
        if (row.id === 'item_otsukai_memo') {
          let cx = x + 2;
          [...l].forEach((ch, j) => {
            cx += g.text(ch, cx, y + i * 17 - (j % 3 === 1 ? 1 : 0), { color: UI.pencil });
          });
        } else g.text(l, x + 2, y + i * 17, { color: UI.pencil });
      });
    }
  }
}
