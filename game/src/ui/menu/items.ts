// もちもの (30_level_art 10.7, 10_narrative 10 / 12.4): the bag on the left
// page (consumables, then だいじなもの under a dotted rule), the chosen
// thing on the right page (a sticky card with its icon at 2×, name in 朱,
// flavour text, effect in pencil). 決定 opens a sticky note with
// つかう／わたす／すてる: つかう = しゅん uses it himself, わたす = hand it
// to a companion, picked on a second note that shows each one's HP (グソっ君
// eats it and says what he thinks, 10.1). A use that would do
// nothing — a heal at full HP, a cure with nothing to cure — is refused
// and the item kept.

import type { Co } from '../../engine/co';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { flag, setFlag, state } from '../../game/state';
import { getItem, isKeyItem, ITEM_TEXT, useItemInField, canUseItemInField, yakiimoFirst } from '../../data/battle';
import { sfx } from '../../audio';
import { say } from '../dialog';
import { drawDigits, drawNumerals } from '../digits';
import { itemIcon12, itemIcon24, setOmakeCheck } from '../icons';
import { KAIRAN_MAP_LINE1, KAIRAN_MAP_LINES } from '../../data/text/hoshi_events';
import { dottedLine, drawCursor, drawMarker, fitWrap, pencilLine, phraseWrap as wrap, rectA, textW, UI } from '../window';
import { clearSpacing, drawHeader, drawScroll, FOLD, hpColor, listCursorX, listDx, LP, pageText, Popup, RP, SP, type PopupOpt } from './notebook';
import type { MenuCtx, MenuPage } from './types';
import { UKI_DESC_LINE } from '../../data/text/mizube';

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
    ['flag_errand', '→ 焼きそばのたかし（坂を 上って 右）'],
    ['flag_met_maruyama', '→ 焼くのは 5時の チャイムの あと'],
    ['flag_chime_stopped', '→ チャイムが 止まった？'],
    ['flag_got_hanko', '→ 公園？ でっかい 虫'],
    ['flag_broadcast', '→ モール 迷子センター（北東）'],
    ['flag_mall_entered', '→ 迷子センターは 2F。カギ？'],
    ['flag_got_maigo_key', '→ 2Fの 迷子センターへ'],
    ['flag_boss_beaten', '→ たかし！'],
    // chapter 2 carries the memo on: the errand was done (50_ch2_story 1.5)
    ['flag_clear', '→ おつかい 完了。'],
  ];
  let s = '';
  for (const [f, t] of table) if (flag(f)) s = t;
  return s;
}

/** 回覧板の地図, line 2: the 区長's map, and where to go next (50_ch2_story 7.1). */
export function kairanProgress(): string {
  let s = '';
  for (const [f, t] of KAIRAN_MAP_LINES) if (flag(f)) s = t;
  return s;
}

/** Key items whose second line is a note in Minato's hand that follows the story. */
function progressOf(id: string): string | null {
  if (id === 'item_otsukai_memo') return memoProgress();
  if (id === 'item_kairan_map') return kairanProgress();
  return null;
}

/** The first line of such a note (fixed). */
function progressHead(id: string): string | null {
  if (id === 'item_otsukai_memo') return '焼きそば 4つ。青のりは べつ。';
  if (id === 'item_kairan_map') return KAIRAN_MAP_LINE1;
  return null;
}

/** After chapter 2 one of the four tomatoes is left: the one for おばあ (50 7.1). */
function omake(id: string): boolean {
  return id === 'item_tomato_omiyage' && flag('flag_ch2_clear') > 0;
}
setOmakeCheck(() => flag('flag_ch2_clear') > 0);

/** The name shown for an item (the tomatoes are 「トマト（おまけ）」 after chapter 2). */
export function itemName(id: string): string {
  if (omake(id)) return 'トマト（おまけ）';
  return getItem(id)?.name ?? id;
}

/** The two lines shown for an item. */
export function itemDesc(id: string): [string, string] {
  if (omake(id)) return ['あした、ひのやの おばあちゃんに', '持っていく 分。'];
  const it = getItem(id);
  // おぴぃの浮き：堰の 片手の 大将に 会ったら 2行目が かわる（水辺の 図鑑、02 #81）
  if (id === 'item_tamotsu_uki' && flag('flag_mizube_uki_line')) return [it?.desc[0] ?? '', UKI_DESC_LINE];
  return [it?.desc[0] ?? '', it?.desc[1] ?? ''];
}

/**
 * はなまるトマト glows: a 1px #FFE7A3 ring round its icon swells and fades
 * every 2 s (52_ch2_level_art 13.3). `cx, cy` is the icon's centre.
 */
export function drawGlowRing(g: Gfx, id: string, cx: number, cy: number, r: number, t: number): void {
  if (id !== 'item_hanamaru_tomato') return;
  const k = (t % 2000) / 2000;
  const a = k < 0.5 ? k * 2 : (1 - k) * 2;
  if (a > 0.05) g.alpha(0.35 + 0.55 * a, () => g.ring(cx, cy, r + Math.round(a), '#FFE7A3'));
}

type Slot = { kind: 'row'; row: Row } | { kind: 'sep' };

/** Lines of the list on the left page (a long name may take two). */
const VISIBLE = 8;
const ROW_H = 18;
const LIST_Y = SP.y + 28;

/** How wide a list row's name may be: from where it starts (an iPad held sideways: moved in, listDx) to the fold. */
export function itemNameRoom(): number {
  return FOLD - 4 - (LP.x + listDx() + 14);
}

/** A line of a name set up to 2px a letter tighter to fit `room` (null: it doesn't). */
function squeeze(text: string, room: number): { text: string; spacing: number } | null {
  const w = textW(text);
  const n = [...text].length;
  if (w <= room) return { text, spacing: 0 };
  if (w - n <= room) return { text, spacing: -1 };
  if (w - 2 * n <= room) return { text, spacing: -2 };
  return null;
}

/**
 * A row's name as the list writes it: one line — a long one (きゅうりの一本漬け)
 * set a pixel or two tighter so it stays on its page — or, when even that is
 * too wide (the narrower list of an iPad held sideways, a 10-letter name),
 * two lines: broken after 「の」 or a closing bracket where it can be
 * (きゅうりの／一本漬け), else by phrase.
 */
export function itemNameLines(name: string, room = itemNameRoom()): { text: string; spacing: number }[] {
  const one = squeeze(name, room);
  if (one) return [one];
  const ch = [...name];
  let best: { text: string; spacing: number }[] | null = null;
  let bestD = Infinity;
  for (let i = 1; i < ch.length; i++) {
    if (!/[の』」）]/.test(ch[i - 1]) && !/[『「（]/.test(ch[i])) continue;
    const a = squeeze(ch.slice(0, i).join(''), room);
    const b = squeeze(ch.slice(i).join(''), room - 8);
    const d = Math.abs(ch.length / 2 - i);
    if (a && b && d < bestD) {
      best = [a, b];
      bestD = d;
    }
  }
  if (best) return best;
  return fitWrap(name, room)
    .slice(0, 2)
    .map((l, j) => squeeze(l.text, room - (j ? 8 : 0)) ?? l);
}

function slotLines(sl: Slot): number {
  return sl.kind === 'sep' ? 1 : itemNameLines(itemName(sl.row.id)).length;
}

export class ItemsPage implements MenuPage {
  private sel = 0;
  private scroll = 0;
  private moveT = 999;
  private popup: Popup | null = null;
  private popupFor: Row | null = null;
  private mode: 'list' | 'action' | 'target' | 'confirm' = 'list';
  /** Member ids offered on the わたす note, in its order. */
  private targets: string[] = [];

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
    // keep the chosen row (all its lines) inside the VISIBLE lines, and the window full at the end
    const n = s.map(slotLines);
    const lines = (a: number, b: number) => n.slice(a, b + 1).reduce((t, v) => t + v, 0);
    this.scroll = Math.max(0, Math.min(this.scroll, s.length - 1));
    if (this.sel < this.scroll) this.scroll = this.sel;
    while (this.scroll < this.sel && lines(this.scroll, this.sel) > VISIBLE) this.scroll++;
    while (this.scroll > 0 && lines(this.scroll - 1, s.length - 1) <= VISIBLE) this.scroll--;
  }

  /** The chosen row's top (on the page) and height. */
  private rowAt(): { y: number; h: number } {
    const s = this.slots();
    let line = 0;
    for (let k = this.scroll; k < this.sel && k < s.length; k++) line += slotLines(s[k]);
    return { y: LIST_Y + line * ROW_H, h: (s[this.sel] ? slotLines(s[this.sel]) : 1) * ROW_H };
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
      } else if (this.mode === 'target') {
        this.popup = null;
        if (r < 0) {
          // back to the first note, on わたす
          this.openActions(row, 1);
          return true;
        }
        this.mode = 'list';
        const id = this.targets[r];
        if (id) m.run(this.useCo(row.id, id));
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
      this.openActions(row, 0);
    }
    return true;
  }

  /** Companions a thing can be handed to (everyone but しゅん). */
  private companions(): string[] {
    const me = state.party[0]?.id;
    return state.party.filter((p) => p.id !== me).map((p) => p.id);
  }

  private openActions(row: Row, index: number): void {
    const opts = [
      { label: 'つかう' },
      { label: 'わたす', disabled: row.key || !this.companions().length },
      { label: 'すてる', disabled: row.key },
    ];
    this.popup = this.popupAtRow(opts, '', { minW: 76, index });
    this.popupFor = row;
    this.mode = 'action';
  }

  /** わたす: 「だれに わたす？」 with each companion's HP, so it's clear who needs it. */
  private openTargets(row: Row): void {
    this.targets = this.companions();
    const opts: PopupOpt[] = this.targets.map((id) => {
      const mb = state.party.find((p) => p.id === id)!;
      const rate = mb.maxHp > 0 ? mb.hp / mb.maxHp : 0;
      return { label: mb.name, sub: `${mb.hp}/${mb.maxHp}`, bar: { rate, color: hpColor(rate) } };
    });
    this.popup = this.popupAtRow(opts, 'だれに わたす？', { minW: 104 });
    this.popupFor = row;
    this.mode = 'target';
  }

  /**
   * A sticky note on the list page, just under the chosen row (or above it
   * near the bottom): the description on the right page stays readable.
   */
  private popupAtRow(opts: PopupOpt[], title: string, o: { minW?: number; index?: number }): Popup {
    const { y: rowY, h: rowH } = this.rowAt();
    const p = new Popup(opts, LP.x + 26 + listDx(), rowY + rowH, title, o);
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
    if (action === 1) {
      this.openTargets(row);
      return;
    }
    m.run(this.useCo(row.id, state.party[0]?.id ?? 'minato'));
  }

  private useKey(m: MenuCtx, id: string): void {
    if (id === 'item_hanko_case') m.goTab('hanko');
    else if (id === 'item_mimashita_cho') m.goTab('book');
    else if (progressHead(id)) {
      const p = progressOf(id);
      m.run(say([progressHead(id) + (p ? '\n' + p : '')], { voice: 'narr' }));
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
    // a cure with nothing to cure (ハッカあめ with no こんらん／ねむり): keep it
    const cureOnly = !!it.cure?.length && !it.heal && !it.healRate && !it.mp && it.special !== 'capsule';
    if (cureOnly && !it.cure!.some((s) => who.status[s])) {
      sfx('se_buzzer');
      yield* say('いまは 使っても しかたない。', { voice: 'sys' });
      return;
    }
    // 「HPが 0 回復した。」 reads badly: say that it was already full
    const pages = useItemInField(id, target).map((p) => p.replace(/^(.+)の HPが 0 回復した。$/m, '$1の HPは もう いっぱいだ。'));
    if (!pages.length) return;
    const healed = pages.some((p) => p.includes('回復') || p.includes('すっきり'));
    if (healed) sfx('se_heal');
    yield* say(pages, { voice: 'sys' });
    // グソっ君 says what he thinks of it (★2026-09-29: no zipper, he eats it);
    // the first 焼き芋 after one was bought at the 無人販売所: his own word, once
    // (and a bite of it when しゅん ate it, 02 #74)
    const first = yakiimoFirst(id);
    if (first && target !== 'kanenari') yield* say(first.share, { voice: 'sys' });
    const says = first ? first.pages : target === 'kanenari' ? ITEM_TEXT[id]?.kanenariSays : undefined;
    if (says?.length) yield* say(says, { name: 'グソっ君', voice: 'gusokkun' });
    // (his word on it was heard: グソっ君の はじめて帳 has its page, 02 #89)
    if (says?.length && target === 'kanenari') setFlag(`flag_kn_says_${id}`, 1);
    this.fix(this.slots());
  }

  // ---- drawing ----------------------------------------------------------------------

  draw(g: Gfx, m: MenuCtx): void {
    const s = this.slots();
    drawHeader(g, 'もちもの', LP.x, SP.y + 6, '#F7C27A', 1, 2);
    // capacity, like a tally in the corner: 5/14
    drawDigits(g, `${bagCount()}/${BAG_MAX}`, FOLD - 12, SP.y + 12, { color: UI.pencil, align: 'right' });
    // (an iPad held sideways: the whole list a little further in)
    const lx = LP.x + listDx();
    if (!s.length) {
      g.text('なにも ない。', lx + 8, LIST_Y + 20, { color: UI.textDim });
    }
    let line = 0;
    let k = this.scroll;
    for (; k < s.length; k++) {
      const sl = s[k];
      const n = slotLines(sl);
      if (line + n > VISIBLE) break;
      const y = LIST_Y + line * ROW_H;
      line += n;
      if (sl.kind === 'sep') {
        dottedLine(g, lx - 4, y + 9, FOLD - 12, UI.pencil, 3);
        const lw = textW('だいじなもの') + 8;
        g.rect(lx + 18, y + 1, lw, 16, UI.bg);
        g.text('だいじなもの', lx + 22, y + 1, { color: UI.pencil });
        continue;
      }
      const row = sl.row;
      const it = getItem(row.id);
      const sel = k === this.sel;
      const name = it ? itemName(row.id) : row.id;
      const nl = itemNameLines(name);
      if (sel)
        nl.forEach((l, j) =>
          drawMarker(g, lx + 12 + (j ? 8 : 0), y + j * ROW_H + 1, Math.min(textW(l.text), FOLD - 4 - (lx + 14 + (j ? 8 : 0))) + 4, 15, m.focus && !this.popup ? Math.min(1, this.moveT / 70) : 1, m.focus ? UI.marker : '#EFE4C6'),
        );
      // (moved in, listDx: the hanko cursor stands where the chosen row's icon is)
      const onIcon = sel && m.focus && lx > LP.x;
      if (!onIcon) {
        drawGlowRing(g, row.id, lx + 3, y + 8, 8, m.t);
        g.img(itemIcon12(row.id), lx - 3, y + 2);
        if (row.n > 1) {
          // how many, pencilled on the icon's corner
          drawDigits(g, String(Math.min(99, row.n)), lx + 11, y + 9, { color: UI.accent, outline: UI.bg, align: 'right' });
        }
      }
      // a long name (きゅうりの一本漬け) is set a pixel or two tighter so it stays on its page
      // (or runs on to a 2nd line, tucked in a little like the みました帳's index)
      nl.forEach((l, j) => g.text(l.text, lx + 14 + (j ? 8 : 0), y + j * ROW_H, { color: UI.text, spacing: l.spacing }));
      if (sel && m.focus) drawCursor(g, listCursorX(), y, m.t);
    }
    if (this.scroll > 0) drawScroll(g, FOLD - 18, LIST_Y - 5, true, m.t);
    if (k < s.length) drawScroll(g, FOLD - 18, LIST_Y + VISIBLE * ROW_H + 2, false, m.t);
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
    drawGlowRing(g, row.id, x + 15, y + 15, 13, m.t);
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
    const nm = itemName(row.id);
    // a long name (『あした』宛ての手紙) is set a pixel or two tighter, like the list, to stay on the page
    const nmRoom = RP.w + 4;
    const nmW = textW(nm);
    const nmSp = nmW <= nmRoom ? 0 : nmW - [...nm].length <= nmRoom ? -1 : -2;
    g.text(nm, x, y, { color: UI.accent, spacing: nmSp });
    pencilLine(g, x, y + 16, nmW + nmSp * [...nm].length + 2, 1, UI.accentDark, row.id.length);
    y += 22;
    // flavour text
    // a key item's two lines are one text; the second starts a new line, as written (10.2)
    const desc = itemDesc(row.id);
    const flavor = progressHead(row.id) ?? desc[0] + (row.key && desc[1] ? '\n' + desc[1] : '');
    const lines = wrap(flavor, RP.w - 2, { glue: true });
    for (const l of lines.slice(0, 4)) {
      // (beside an iPad's touch button: a little tighter, pageText)
      pageText(g, l, x, y, { color: UI.text });
      y += 17;
    }
    // effect / progress in pencil
    const prog = progressOf(row.id);
    const eff = prog !== null ? prog : row.key ? '' : desc[1];
    if (eff) {
      y += 3;
      const el = wrap(eff, RP.w - 6, { glue: true });
      el.slice(0, 3).forEach((l, i) => {
        // Minato's own hand: every other letter bobs a pixel (10.3 少し斜めの字)
        if (prog !== null) {
          let cx = x + 2;
          const sp = clearSpacing(l, cx, y + i * 17);
          [...l].forEach((ch, j) => {
            cx += g.text(ch, cx, y + i * 17 - (j % 3 === 1 ? 1 : 0), { color: UI.pencil }) + sp;
          });
        } else pageText(g, l, x + 2, y + i * 17, { color: UI.pencil });
      });
    }
  }
}
