// 「ダンゴムシ ちゃうで」の 報告書（02_ch2_index #93、10_narrative 6.28、30_level_art 10.8）：
// 報告書の カード。
//
//   2ページ（もちものの『報告書の 写し』では ←→ で めくる）：
//   ① 報告書：左に 手配書の 似顔絵（証言ごとに 変に なる。art/props/hokokusho.ts）、右に 欄 5つ
//      （正体・大きさ・足の 数・好物・帰る 所）。うまった 欄に 値と 巡査の「確」印、評価の ハンコ
//      （優・良・可）。正体が わからない あいだは「？」と 消した 線の 数（通報の 1本＋証言）。
//      いちばん下に「つぎ：…」の 1行（data/text/hokokusho.ts nextLine）。
//   ② 証言カード：8人（顔、まちがえた 答えに 朱の 線。聞いて いない 人は どこに いるか）と 手がかり。
//
//   会話の あいだは 画面の 上（ダイアログの 上。H − 68 より 上）に 出す（modal でない）。
//   2D・HD-2D とも UI の 上に 描くので 同じに 見える。数字は 5×7 の 字（ui/digits.ts）。

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import type { Input } from '../engine/input';
import { W } from '../engine/screen';
import { ease } from '../engine/tween';
import { markText, markTextScreen } from '../engine/textzones';
import { sfx } from '../audio';
import { flag } from '../game/state';
import { charSprite } from '../art/chars/registry';
import { nigaoeImg, nigaoeLayers, NIGAOE_H, NIGAOE_W } from '../art/props/hokokusho';
import { drawDigits } from './digits';
import { drawWindow, UI } from './window';
import {
  GRADE_CH,
  HK,
  HK_CARD,
  HK_FIELDS,
  HK_TSUHO,
  HK_WITNESSES,
  fieldValue,
  filled,
  grade,
  heard,
  heardCount,
  nextLine,
  type FieldKey,
  type WitnessKey,
} from '../data/text/hokokusho';

export const CARD = { x: 16, y: 4, w: 352, h: 131 } as const;

const ROW_H = 18;

/** 朱の 丸い 印（字 1つ）。 */
export function drawSeal(g: Gfx, cx: number, cy: number, ch: string, a = 1, color: string = UI.accent): void {
  g.alpha(a, () => {
    g.ring(cx, cy, 9, color);
    g.ring(cx, cy, 8, color);
    g.text(ch, cx - 8, cy - 8, { color });
  });
}

/** 評価の 角印（朱の 地に 白い 字）。 */
export function drawGrade(g: Gfx, x: number, y: number, n: number, a = 1, scale = 1): void {
  if (n <= 0) return;
  const s = 18 * scale;
  const ox = Math.round(x - (s - 18) / 2);
  const oy = Math.round(y - (s - 18) / 2);
  g.alpha(a, () => {
    g.rect(ox, oy, s, s, n >= 3 ? UI.accent : n === 2 ? '#D9772E' : '#9A7A9A');
    g.rect(ox + 1, oy + 1, s - 2, 1, '#FFFFFF', 0.25);
    g.text(GRADE_CH[n], ox + Math.round((s - 16) / 2), oy + Math.round((s - 16) / 2) - 1, { color: UI.white });
  });
}

/** 「105cm」「14本」：頭の 数字は 5×7 の 字、あとは ふつうの 字。 */
export function drawValue(g: Gfx, s: string, x: number, y: number, color: string = UI.text): number {
  const m = /^(\d+)(.*)$/.exec(s);
  if (!m) return g.text(s, x, y, { color });
  const w = drawDigits(g, m[1], x, y + 5, { color, scale: 1 });
  return w + 2 + g.text(m[2], x + w + 2, y, { color });
}

/** 線の 数（通報の 1本＋聞いた 証言）を 4本＋斜め 1本の かたまりで。 */
function drawTally(g: Gfx, x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const grp = Math.floor(i / 5);
    const k = i % 5;
    const gx = x + grp * 14;
    if (k < 4) g.rect(gx + k * 3, y, 1, 9, UI.accent);
    else g.line(gx - 1, y + 7, gx + 11, y + 1, UI.accent);
  }
}

/** 犬の 足あと（コタロウ。写しの 右上の すみ）。 */
function drawPaw(g: Gfx, x: number, y: number, a = 1): void {
  g.alpha(a, () => {
    const c = '#7A5A3A';
    g.rect(x + 2, y + 4, 4, 3, c);
    g.rect(x + 3, y + 7, 2, 1, c);
    g.rect(x, y + 1, 2, 2, c);
    g.rect(x + 3, y, 2, 2, c);
    g.rect(x + 6, y + 1, 2, 2, c);
  });
}

/** 顔（立ち絵の 上の ほう）。 */
function drawFace(g: Gfx, npc: string, x: number, y: number, dim: boolean): void {
  let fr: HTMLCanvasElement | undefined;
  try {
    fr = charSprite(npc).walk.down[0];
  } catch {
    fr = undefined;
  }
  if (!fr) return;
  const sw = Math.min(fr.width, 18);
  const sx = Math.max(0, Math.floor((fr.width - sw) / 2));
  g.img(fr, x + Math.floor((18 - sw) / 2), y, { sx, sy: 0, sw, sh: Math.min(fr.height, 18), alpha: dim ? 0.35 : 1 });
}

export interface CardAnim {
  /** 証言を 足した ところ：その 行の 線を 引き、似顔絵を 前の 層から かえる */
  witness?: WitnessKey;
  /** 欄が うまった ところ（確印と 評価が ぽん） */
  field?: FieldKey;
}

/**
 * The report card. `modal` (from もちもの): ← → turn the page, Z / X close.
 * Otherwise it stays up over the field while the words run, and the script
 * closes it.
 */
export class ReportCard implements Widget {
  modal: boolean;
  done = false;
  page: 0 | 1;
  private t = 0;
  private out = -1;
  private animT = 0;
  private turnT = 999;
  /** 評価の ハンコを 何個 見せるか（閉じる ときの 1つずつ。-1 は ぜんぶ） */
  stamps = -1;
  private stampT: number[] = [];
  /** 似顔絵を 本物に 描き直す（0..1） */
  real = -1;
  /** 本物 そっくりの 似顔絵を いつも */
  private kazari: boolean;
  private prevLayers: string[] | null = null;
  anim: CardAnim = {};
  constructor(o: { page?: 0 | 1; modal?: boolean; anim?: CardAnim } = {}) {
    this.modal = !!o.modal;
    this.page = o.page ?? 0;
    this.anim = o.anim ?? {};
    this.kazari = flag(HK.kazari) > 0;
    if (this.anim.witness) {
      // the picture as it was before this testimony
      const cur = nigaoeLayers(flag);
      const w = HK_WITNESSES.find((x) => x.key === this.anim.witness);
      this.prevLayers = cur.filter((l) => l !== w?.layer);
    }
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    this.animT += dt;
    this.turnT += dt;
    for (let i = 0; i < this.stampT.length; i++) this.stampT[i] += dt;
    if (this.out >= 0) {
      this.out += dt;
      if (this.out >= 180) this.done = true;
      return;
    }
    if (!this.modal || this.t < 150) return;
    if (input.pressed('left') || input.pressed('right')) {
      this.page = this.page === 0 ? 1 : 0;
      this.turnT = 0;
      this.anim = {};
      sfx('se_page');
    } else if (input.pressed('confirm') || input.pressed('cancel') || input.pressed('menu')) {
      sfx('se_cancel');
      this.close();
    }
  }

  close(): void {
    if (this.out < 0) this.out = 0;
  }

  /** 閉じる ときの ハンコ：次の 1つ。 */
  stampNext(): void {
    if (this.stamps < 0) this.stamps = 0;
    this.stampT[this.stamps] = 0;
    this.stamps++;
  }

  /** 描き直し（0..1 を 外から すすめる）。 */
  setReal(k: number): void {
    this.real = k;
    if (k >= 1) this.kazari = true;
  }

  showPage(p: 0 | 1, anim: CardAnim = {}): void {
    if (this.page !== p) this.turnT = 0;
    this.page = p;
    this.anim = anim;
    this.animT = 0;
  }

  draw(g: Gfx): void {
    const k = Math.min(1, this.t / 220);
    const a = this.out >= 0 ? Math.max(0, 1 - this.out / 180) : ease.quadOut(k);
    if (a <= 0) return;
    const { x, w, h } = CARD;
    const y = CARD.y + Math.round((1 - ease.backOut(k)) * 8);
    if (this.modal) markTextScreen();
    else markText(x, CARD.y, w, h);
    drawWindow(g, x, y, w, h, UI, a, { curl: false });
    if (a < 0.6) return;
    const turn = Math.min(1, this.turnT / 160);
    g.alpha(turn, () => {
      if (this.page === 0) this.drawReport(g, x, y);
      else this.drawWitnesses(g, x, y);
    });
    // page tabs (top right): ① 報告書 ② 証言カード
    const tabs = [HK_CARD.page1, HK_CARD.page2];
    let tx = x + w - 10;
    for (let i = tabs.length - 1; i >= 0; i--) {
      const tw = g.measure(tabs[i]) + 8;
      tx -= tw;
      const on = this.page === i;
      if (on) g.rect(tx, y + 3, tw, 17, UI.marker);
      g.text(tabs[i], tx + 4, y + 4, { color: on ? UI.text : UI.textDim });
      tx -= 4;
    }
    if (this.modal) {
      // ←→ のしるし（左右の まん中）
      const my = y + Math.round(h / 2);
      for (let i = 0; i < 4; i++) {
        g.rect(x + 4 + i, my - i, 1, i * 2 + 1, UI.pencil);
        g.rect(x + w - 5 - i, my - i, 1, i * 2 + 1, UI.pencil);
      }
    }
  }

  private drawReport(g: Gfx, x: number, y: number): void {
    g.text(HK_CARD.title, x + 12, y + 4, { color: UI.text });
    // 証言 n/8（見出しの 右）
    const n = heardCount();
    const sx = x + 12 + g.measure(HK_CARD.title) + 8;
    g.text(HK_CARD.witness, sx, y + 4, { color: UI.pencil });
    drawDigits(g, `${n}/8`, sx + g.measure(HK_CARD.witness) + 3, y + 9, { color: n >= 8 ? UI.accent : UI.pencil });
    // ---- 似顔絵（手配書）
    const px = x + 12;
    const py = y + 24;
    g.rect(px - 2, py - 2, NIGAOE_W * 2 + 4, NIGAOE_H * 2 + 4, '#C8C2B4');
    g.rect(px - 1, py - 1, NIGAOE_W * 2 + 2, NIGAOE_H * 2 + 2, UI.white);
    const layers = nigaoeLayers(flag);
    if (this.kazari && this.real < 0) g.img(nigaoeImg([], true), px, py, { scale: 2 });
    else {
      const fade = this.anim.witness && this.prevLayers ? Math.min(1, Math.max(0, (this.animT - 250) / 600)) : 1;
      if (fade < 1 && this.prevLayers) g.img(nigaoeImg(this.prevLayers), px, py, { scale: 2 });
      g.img(nigaoeImg(layers), px, py, { scale: 2, alpha: fade });
      if (this.real >= 0) {
        // 上から 描き直す
        const rh = Math.round(NIGAOE_H * 2 * Math.min(1, this.real));
        if (rh > 0) g.clip(px, py, NIGAOE_W * 2, rh, () => g.img(nigaoeImg([], true), px, py, { scale: 2 }));
        if (this.real < 1) g.rect(px, py + rh, NIGAOE_W * 2, 1, UI.pencil);
      }
    }
    if (flag(HK.kotaro)) drawPaw(g, px + NIGAOE_W * 2 - 6, py - 5, 0.9);
    // ---- 欄 5つ
    const lx = px + NIGAOE_W * 2 + 10;
    const vx = lx + 66;
    const cx = x + CARD.w - 46;
    HK_FIELDS.forEach((f, i) => {
      const ry = y + 22 + i * ROW_H;
      g.text(f.label, lx, ry, { color: UI.pencil });
      for (let dx = lx; dx < x + CARD.w - 12; dx += 2) g.rect(dx, ry + 17, 1, 1, UI.bg2);
      const v = fieldValue(f.key);
      const isNew = this.anim.field === f.key;
      const nk = isNew ? Math.min(1, this.animT / 300) : 1;
      if (v) g.alpha(nk, () => drawValue(g, v, vx, ry));
      else if (f.key === 'shotai') {
        g.text('？', vx, ry, { color: UI.textDim });
        drawTally(g, vx + 20, ry + 4, 1 + heardCount());
      } else g.text('？', vx, ry, { color: UI.textDim });
      if (!filled(f.key)) return;
      // 確印（うまった とき）と 評価
      const sk = isNew ? Math.min(1, Math.max(0, (this.animT - 300) / 160)) : 1;
      if (sk > 0) drawSeal(g, cx + 9, ry + 8, HK_CARD.kakunin, sk);
      const shown = this.stamps < 0 || i < this.stamps;
      if (!shown) return;
      const st = this.stampT[i];
      const gk = st !== undefined ? Math.min(1, st / 140) : isNew ? Math.min(1, Math.max(0, (this.animT - 450) / 160)) : 1;
      const sc = st !== undefined && st < 140 ? 1 + (1 - st / 140) * 0.6 : 1;
      drawGrade(g, cx + 22, ry - 1, grade(f.key), gk, sc);
    });
    // ---- つぎ
    const nl = nextLine();
    if (nl) g.text(nl, x + 12, y + CARD.h - 20, { color: UI.accent });
  }

  private drawWitnesses(g: Gfx, x: number, y: number): void {
    g.text(HK_CARD.cards, x + 12, y + 4, { color: UI.text });
    const n = heardCount();
    drawDigits(g, `${n}/8`, x + 12 + g.measure(HK_CARD.cards) + 8, y + 9, { color: n >= 8 ? UI.accent : UI.pencil });
    const cw = 164;
    HK_WITNESSES.forEach((wt, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = x + 12 + col * (cw + 4);
      const cy = y + 22 + row * 22;
      const got = heard(wt.key);
      g.rect(cx, cy, cw, 21, got ? UI.cream : UI.paperWarm);
      g.rect(cx, cy + 20, cw, 1, UI.bg2);
      drawFace(g, wt.npc, cx + 1, cy + 1, !got);
      const tx = cx + 22;
      if (got) {
        const tw = g.text(wt.ans, tx, cy + 2, { color: UI.text });
        const isNew = this.anim.witness === wt.key;
        const k = isNew ? Math.min(1, Math.max(0, (this.animT - 200) / 380)) : 1;
        if (k > 0) g.rect(tx - 1, cy + 10, Math.round((tw + 2) * k), 1, UI.accent);
        if (k > 0) g.rect(tx - 1, cy + 11, Math.round((tw + 2) * k), 1, UI.accentDark, 0.5);
      } else g.text(`${wt.where}？`, tx, cy + 2, { color: UI.textDim });
    });
    // 手がかり（消して いない もの）
    const clues: string[] = [];
    if (heard('hiyori')) clues.push('よろい');
    if (heard('kazuyuki')) clues.push('海の におい');
    if (filled('legs')) clues.push('足が 14本');
    const line = `${HK_CARD.hint}：${clues.length ? clues.join('・') : '……'}`;
    g.text(line, x + 12, y + CARD.h - 20, { color: clues.length ? UI.accent : UI.textDim });
    // 通報の 1行（右下、はじめから 消して ある）
    const tw = g.measure(HK_TSUHO);
    const tx = x + CARD.w - 14 - tw;
    if (tx > x + 12 + g.measure(line) + 8) {
      g.text(HK_TSUHO, tx, y + CARD.h - 20, { color: UI.textDim });
      g.rect(tx - 1, y + CARD.h - 12, tw + 2, 1, UI.accent);
    }
  }
}

/** 会話の あいだ 上に 出して おく カード（script が close する）。 */
export function showCard(o: { page?: 0 | 1; anim?: CardAnim } = {}): ReportCard {
  return game.ui.push(new ReportCard(o));
}

/** もちものから：めくって 見る（閉じるまで 待つ）。 */
export function* viewCard(): Co {
  const c = game.ui.push(new ReportCard({ modal: true }));
  yield () => c.done;
}

/** 手配書を 大きく（壁の 似顔絵を しらべた とき・「だれやねん」の とき）。 */
export class NigaoeCard implements Widget {
  modal = false;
  done = false;
  private t = 0;
  private out = -1;
  /** 本物の グソっ君を となりに */
  side = false;
  private sideT = 0;
  constructor(private real: boolean) {}
  update(dt: number): void {
    this.t += dt;
    if (this.side) this.sideT += dt;
    if (this.out >= 0) {
      this.out += dt;
      if (this.out >= 180) this.done = true;
    }
  }
  close(): void {
    if (this.out < 0) this.out = 0;
  }
  draw(g: Gfx): void {
    const k = Math.min(1, this.t / 220);
    const a = this.out >= 0 ? Math.max(0, 1 - this.out / 180) : ease.quadOut(k);
    if (a <= 0) return;
    const sideW = this.side ? 86 : 0;
    const w = NIGAOE_W * 3 + 24 + sideW;
    const h = NIGAOE_H * 3 + 26;
    const x = Math.round(W / 2 - w / 2);
    const y = 6 + Math.round((1 - ease.backOut(k)) * 8);
    markText(x, 6, w, h);
    drawWindow(g, x, y, w, h, UI, a, { curl: false });
    if (a < 0.6) return;
    const px = x + 12;
    const py = y + 14;
    g.rect(px - 2, py - 2, NIGAOE_W * 3 + 4, NIGAOE_H * 3 + 4, '#C8C2B4');
    g.img(nigaoeImg(nigaoeLayers(flag), this.real), px, py, { scale: 3 });
    g.rect(px, py - 9, NIGAOE_W * 3, 5, this.real ? '#C8A06A' : UI.accent);
    if (this.side) {
      // 本物（右）
      const sk = Math.min(1, this.sideT / 260);
      const fr = charSprite('kanenari').walk.down[0];
      const bx = px + NIGAOE_W * 3 + 18;
      g.alpha(sk, () => {
        g.rect(bx, py, 72, NIGAOE_H * 3, '#CFE8F2');
        g.img(fr, bx + Math.round((72 - fr.width * 3) / 2), py + NIGAOE_H * 3 - 6 - fr.height * 3, { scale: 3 });
        g.text('本物', bx + 20, py + 2, { color: UI.pencil });
      });
    }
  }
}
