// みました帳の「やり残し」のページ（05_postgame 9章・10.4）：①②③ のあとの4つ目のふせん（朱）。
// flag_pg_yarinokoshi（グソっ君の合流）まで出さない。データは data/text/yarinokoshi.ts（E）。
//
// 左のページ：章ごとの見出し（① 夕鳴町／② 星見台／③ 海ぞいの町）と行。済んだ行は名前と
// 朱のはなまる、まだの行は「…………」と窓の時間帯の印（今の時刻で窓が開いている行は明るい）。
// 章の行の下に「ふしぎ n/12」。いちばん下に「やり残し あと n」（0 で「ぜんぶ はなまる！」）。
// 右のページ：選んだ行のヒント2行（時間帯と場所、だれと）。合計の行では章ごとの数、
// シークレットエンディングを見たあとは「もう一度 見る」（決定）。
// iPad 横：左のページの行は listDx でボタンをよけ、右のページの字は pageText で詰める。

import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { flag } from '../../game/state';
import { sfx } from '../../audio';
import { hanamaruFrame, ovalStamp } from '../../battle/art/stamps';
import { pgBand, pgOn } from '../../world/postgame';
import { yrFushigi, yrLeft, yrWindowOpen, YR_ROWS, type YrRow } from '../../data/text/yarinokoshi';
import { drawDigits } from '../digits';
import { pgBandIcon } from '../pg_clock';
import { secretReplayFn, secretSeen } from '../pg_secret';
import { dottedLine, drawCursor, drawMarker, fitWrap, pencilLine, phraseWrap as wrap, textW, UI } from '../window';
import { clearRight, drawHeader, drawScroll, FOLD, listCursorX, listDx, LP, pageText, RP, SP } from './notebook';
import type { MenuCtx } from './types';

/** ふせんの名前（上のタブにも出る）。 */
export const YR_TAB = 'やり残し';
/** ふせんとページの朱。 */
export const YR_FLAG = '#F08A6E';
export const YR_FLAG_DARK = '#B8241E';

const TOWN = ['夕鳴町', '星見台', '海ぞいの町'];
/** 一覧の行（見出し・ふしぎの数は選べない）。 */
type Item = { kind: 'head'; ch: 1 | 2 | 3 } | { kind: 'row'; row: YrRow } | { kind: 'fushigi'; ch: 1 | 2 | 3 };

const ROW_H = 18;
const LIST_Y = SP.y + 30;
/** 一覧に見える行の数（その下に合計の行）。 */
const VISIBLE = 7;
const TOTAL_Y = LIST_Y + VISIBLE * ROW_H + 2;
/** 印・はなまるの列（左のページの番号の所）。 */
const ICON_X = LP.x - 1;
const LABEL_X = LP.x + 14;

/** ページが出ているか：クリア後で、グソっ君と合流して開いた。 */
export function hasYarinokoshi(): boolean {
  return pgOn() && flag('flag_pg_yarinokoshi') > 0;
}

function items(): Item[] {
  const out: Item[] = [];
  for (const ch of [1, 2, 3] as const) {
    out.push({ kind: 'head', ch });
    for (const row of YR_ROWS) if (row.ch === ch) out.push({ kind: 'row', row });
    out.push({ kind: 'fushigi', ch });
  }
  return out;
}

/** ふしぎも ぜんぶ押して、行も ぜんぶ済んだ。 */
function allDone(): boolean {
  return yrLeft() === 0 && ([1, 2, 3] as const).every((ch) => {
    const [a, b] = yrFushigi(ch);
    return a >= b;
  });
}

/** 名前の行（左のページの幅に。2行まで、iPad 横は少し詰める）。 */
function labelLines(name: string, w: number): string[] {
  return wrap(name, w).slice(0, 2);
}

export class YarinokoshiBook {
  private readonly list = items();
  /** 選んでいる行（list の添字）。-1 = 合計の行。 */
  private sel = this.list.findIndex((it) => it.kind === 'row');
  private scroll = 0;
  private moveT = 999;
  private openT = 999;

  /** ふせんを開いた（ページがめくれて入る）。 */
  opened(): void {
    this.openT = 0;
  }

  private labelW(): number {
    return FOLD - 4 - LABEL_X - listDx(ICON_X);
  }

  private linesOf(it: Item): number {
    if (it.kind !== 'row' || !it.row.done()) return 1;
    return labelLines(it.row.name, this.labelW()).length;
  }

  private selectable(): number[] {
    const idx: number[] = [];
    this.list.forEach((it, i) => it.kind === 'row' && idx.push(i));
    idx.push(-1);
    return idx;
  }

  private move(d: number): void {
    const s = this.selectable();
    const i = s.indexOf(this.sel);
    this.sel = s[(i + d + s.length) % s.length];
    this.moveT = 0;
    sfx('se_cursor');
  }

  /** 選んだ行（と、その章の見出し・下のふしぎの数）が見えるように。 */
  private fixScroll(): void {
    if (this.sel < 0) return;
    let lo = this.sel;
    if (this.list[lo - 1]?.kind === 'head') lo--;
    let hi = this.sel;
    if (this.list[hi + 1]?.kind === 'fushigi') hi++;
    if (this.scroll > lo) this.scroll = lo;
    const lines = (a: number, b: number) => this.list.slice(a, b + 1).reduce((n, it) => n + this.linesOf(it), 0);
    while (this.scroll < lo && lines(this.scroll, hi) > VISIBLE) this.scroll++;
  }

  /** 入力。false でふせんの外へ（とり消し）。 */
  update(m: MenuCtx, dt: number, input: Input): boolean {
    this.moveT += dt;
    this.openT += dt;
    if (input.repeat('down')) this.move(1);
    else if (input.repeat('up')) this.move(-1);
    else if (input.pressed('confirm') && this.sel === -1) {
      // シークレットエンディングを見たあと：合計の行から もう一度（10.4）
      const fn = secretReplayFn();
      if (fn && secretSeen() && flag('flag_pg_secret') >= 3) {
        sfx('se_confirm');
        m.close(fn);
      } else sfx('se_buzzer');
    }
    this.fixScroll();
    if (input.pressed('cancel')) {
      sfx('se_cancel');
      return false;
    }
    return true;
  }

  draw(g: Gfx, m: MenuCtx): void {
    const k = Math.min(1, this.openT / 120);
    // 見出し：朱のマステに「やり残し」、右に済んだ数
    drawHeader(g, YR_TAB, LP.x, SP.y + 6, YR_FLAG, 1, 31);
    const done = YR_ROWS.length - yrLeft();
    drawDigits(g, `${done}/${YR_ROWS.length}`, FOLD - 6, SP.y + 12, { color: UI.pencil, align: 'right' });
    g.alpha(k, () => {
      this.drawList(g, m);
      this.drawTotal(g, m);
      this.drawDetail(g);
    });
  }

  private drawList(g: Gfx, m: MenuCtx): void {
    const band = pgBand();
    const dx = listDx(ICON_X);
    const lw = this.labelW();
    let line = 0;
    let i = this.scroll;
    for (; i < this.list.length; i++) {
      const it = this.list[i];
      const n = this.linesOf(it);
      if (line + n > VISIBLE) break;
      const y = LIST_Y + line * ROW_H;
      const sel = i === this.sel;
      const mk = m.focus ? Math.min(1, this.moveT / 70) : 1;
      const mc = m.focus ? UI.marker : '#EFE4C6';
      if (it.kind === 'head') {
        // ① 夕鳴町：章の色の小さな線を下に
        const hx = LP.x + 2 + dx;
        g.text(`${'①②③'[it.ch - 1]} ${TOWN[it.ch - 1]}`, hx, y, { color: UI.text });
        pencilLine(g, hx, y + 16, Math.min(lw + 10, textW(`① ${TOWN[it.ch - 1]}`) + 6), 1, UI.pencil, 40 + it.ch);
      } else if (it.kind === 'fushigi') {
        const [a, b] = yrFushigi(it.ch);
        const s = `${a}/${b}`;
        const fx = LABEL_X + dx + 8;
        g.text('ふしぎ', fx, y, { color: UI.pencil });
        drawDigits(g, s, fx + textW('ふしぎ') + 6, y + 5, { color: a >= b ? UI.accent : UI.pencil });
        if (a >= b) g.img(hanamaruFrame(12, 1, false, 1), fx + textW('ふしぎ') + 10 + s.length * 6, y + 2);
      } else {
        const r = it.row;
        const lx = LABEL_X + dx;
        if (r.done()) {
          // 済んだ：朱のはなまると名前
          g.img(hanamaruFrame(12, 1, false, 1), ICON_X + dx - 1, y + 2);
          labelLines(r.name, lw).forEach((l, j) => {
            const x = lx + (j ? 8 : 0);
            let sp = 0;
            while (sp > -2 && measure(l, sp) > lw - (j ? 8 : 0)) sp--;
            if (sel) drawMarker(g, x - 2, y + j * ROW_H + 1, measure(l, sp) + 4, 15, mk, mc);
            g.text(l, x, y + j * ROW_H, { color: UI.text, spacing: sp });
          });
        } else {
          // まだ：窓の時間帯の印（今あいている窓は明るい）と「…………」
          const open = yrWindowOpen(r, band);
          g.img(pgBandIcon(r.band, !open), ICON_X + dx, y + 4);
          if (sel) drawMarker(g, lx - 2, y + 1, 70, 15, mk, mc);
          dottedLine(g, lx, y + 12, lx + 64, UI.textDim, 3);
        }
        if (sel && m.focus) drawCursor(g, listCursorX(ICON_X), y, m.t);
      }
      line += n;
    }
    if (this.scroll > 0) drawScroll(g, FOLD - 18, LIST_Y - 7, true, m.t);
    if (i < this.list.length) drawScroll(g, FOLD - 18, LIST_Y + VISIBLE * ROW_H - 4, false, m.t);
  }

  /** いちばん下の合計の行：「やり残し あと n」／「ぜんぶ はなまる！」。 */
  private drawTotal(g: Gfx, m: MenuCtx): void {
    const dx = listDx(ICON_X);
    const y = TOTAL_Y;
    const x = LABEL_X + dx;
    g.rect(LP.x + dx, y - 3, FOLD - 8 - LP.x - dx, 1, UI.bg2);
    const sel = this.sel === -1;
    const all = allDone();
    const left = yrLeft();
    const text = all ? 'ぜんぶ はなまる！' : left > 0 ? 'やり残し あと' : 'ふしぎ あと';
    const w = textW(text);
    if (sel) drawMarker(g, x - 2, y + 1, w + (all ? 4 : 30), 15, m.focus ? Math.min(1, this.moveT / 70) : 1, m.focus ? UI.marker : '#EFE4C6');
    let sp = 0;
    while (sp > -2 && x + measure(text, sp) > FOLD - 6) sp--;
    g.text(text, x, y, { color: all ? UI.accent : UI.text, spacing: sp });
    if (!all) {
      const n = left > 0 ? left : ([1, 2, 3] as const).reduce((a, ch) => a + yrFushigi(ch)[1] - yrFushigi(ch)[0], 0);
      drawDigits(g, String(n), x + measure(text, sp) + 5, y + 5, { color: UI.accent });
    }
    if (sel && m.focus) drawCursor(g, listCursorX(ICON_X), y, m.t);
    // シークレットエンディングを見たあと：「ぜんぶ はなまる」の朱の判（10.4）
    if (all && secretSeen()) {
      const seal = ovalStamp('ぜんぶ はなまる', 60, 22, 0.1, 44);
      // 右のページの上のすみ（本文は SP.y+28 から）
      const sy = SP.y + 3;
      g.img(seal, Math.min(SP.x + SP.w - 14 - seal.width, clearRight(999, sy, sy + seal.height) + 1 - seal.width), sy, { alpha: 0.92 });
    }
  }

  /** 右のページ：ヒント（または合計）。 */
  private drawDetail(g: Gfx): void {
    const x = RP.x;
    let y = SP.y + 28;
    const w = RP.w;
    if (this.sel === -1) return this.drawSummary(g, x, y, w);
    const it = this.list[this.sel];
    if (!it || it.kind !== 'row') return;
    const r = it.row;
    const done = r.done();
    // 1行目：名前（まだの行は「…………」）
    if (done) {
      const tl = fitWrap(r.name, w).slice(0, 2);
      tl.forEach((l, j) => pageText(g, l.text, x, y + j * 17, { color: UI.text, spacing: l.spacing }));
      y += tl.length * 17 + 1;
    } else {
      dottedLine(g, x, y + 12, x + w - 30, UI.textDim, 3);
      y += 18;
    }
    pencilLine(g, x, y, w - 6, 1, UI.pencil, this.sel);
    y += 6;
    // 窓の時間帯の印と、ヒント2行（時間帯と場所、だれと）
    const open = yrWindowOpen(r, pgBand());
    g.img(pgBandIcon(r.band, !open && !done), x, y + 5);
    for (const h of r.hint) {
      const hl = fitWrap(h, w - 12).slice(0, 2);
      hl.forEach((l) => {
        pageText(g, l.text, x + 12, y, { color: UI.pencil, spacing: l.spacing });
        y += 17;
      });
      y += 2;
    }
    // 済んだ行：先生の朱のはなまる
    if (done) {
      const hm = hanamaruFrame(30, 1, false, 2);
      const hy = SP.y + SP.h - 12 - hm.height;
      g.img(hm, Math.min(SP.x + SP.w - 14 - hm.width, clearRight(999, hy, hy + hm.height) + 1 - hm.width), hy, { alpha: 0.95 });
    }
  }

  /** 合計の行の右のページ：章ごとの数（済んだ行／行）、見たあとは もう一度 見る口。 */
  private drawSummary(g: Gfx, x: number, y: number, w: number): void {
    for (const ch of [1, 2, 3] as const) {
      const rows = YR_ROWS.filter((r) => r.ch === ch);
      const d = rows.filter((r) => r.done()).length;
      const [fa, fb] = yrFushigi(ch);
      g.text(`${'①②③'[ch - 1]} ${TOWN[ch - 1]}`, x, y, { color: UI.text });
      drawDigits(g, `${d}/${rows.length}`, clearRight(x + w - 4, y, y + 16), y + 5, { color: d >= rows.length ? UI.accent : UI.pencil, align: 'right' });
      y += 17;
      g.text('ふしぎ', x + 12, y, { color: UI.pencil });
      drawDigits(g, `${fa}/${fb}`, clearRight(x + w - 4, y, y + 16), y + 5, { color: fa >= fb ? UI.accent : UI.pencil, align: 'right' });
      y += 21;
    }
    if (allDone() && secretSeen() && secretReplayFn() && flag('flag_pg_secret') >= 3) {
      pencilLine(g, x, y - 2, w - 6, 1, UI.pencil, 77);
      pageText(g, '40年ぶりの 休み', x, y + 2, { color: UI.text });
      pageText(g, 'けっていで もう一度。', x + 4, y + 20, { color: UI.pencil });
    }
  }
}
