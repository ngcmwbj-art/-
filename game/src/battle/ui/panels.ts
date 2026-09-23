// Status panels (15.7), kire tab (15.8), command window (15.5), skill/item
// list (15.9), boss chime sticky (15.6) and the みました info card (15.9).

import type { Gfx } from '../../engine/gfx';
import { drawText } from '../../engine/font';
import { portrait } from '../../art/chars';
import { hanamaruFrame, roundSeal } from '../art/stamps';
import {
  arrowIcon, attrIcon, balloonIcon, bellIcon, bowIcon, buffIcon, checkStamp, cmdIcon, inkPot, kireIcon, scrollArrow, statusIcon,
} from '../art/icons';
import type { PartyUnit } from '../model';
import { C, cursorStamp, drawBar, drawNote, tapeCanvas, tapeCorner } from './note';

export const PANEL_POS: Record<string, [number, number]> = { minato: [104, 150], kanenari: [244, 150] };
export const TAG: Record<string, [number, number, number]> = { minato: [134, 141, 56], kanenari: [274, 141, 106] };

export interface PanelCtx {
  t: number;
  kanenariJoined: boolean;
  alpha: number;
}

function hpColor(rate: number): string {
  return rate > 0.5 ? C.green : rate >= 0.25 ? C.gold2 : C.shu;
}

/** Current face mood for a unit. */
export function moodOf(u: PartyUnit, now: number): string {
  if (!u.alive) return 'ko';
  if (u.moodOverride && u.moodOverride.until > now) return u.moodOverride.mood;
  if (u.moodHold) return u.moodHold;
  if (u.hpRate <= 0.25) return 'hurt';
  return 'normal';
}

export function panelOffset(u: PartyUnit): { dx: number; dy: number } {
  let dx = 0;
  if (u.shakeT > 0) {
    const k = u.shakeT / 167;
    dx = Math.round(Math.sin(u.shakeT * 0.35) * u.shakeAmp * k * k);
  }
  let dy = -Math.round(u.lift) + Math.round(u.drop);
  if (u.bounceT > 0) dy -= Math.round(Math.abs(Math.sin((u.bounceT / 250) * Math.PI)) * 2);
  if (u.squishT > 0) dy += Math.round(Math.sin((1 - u.squishT / 160) * Math.PI) * 2);
  return { dx, dy };
}

export function drawPanel(g: Gfx, u: PartyUnit, pc: PanelCtx): void {
  const [bx, by] = PANEL_POS[u.id] ?? [104, 150];
  const { dx, dy } = panelOffset(u);
  const x = bx + dx;
  const y = by + dy;
  const now = pc.t;
  const heba = !u.alive;
  let border = C.ink;
  if (u.acting) border = C.shu;
  if (u.flashT > 0 && Math.floor((267 - u.flashT) / 67) % 2 === 0) border = C.shu;
  const bw = u.guard ? 3 : 2;
  drawNote(g, x, y, 136, 62, { border, borderW: bw, paper: heba ? C.grid : C.paper }, pc.alpha);
  g.alpha(pc.alpha, () => {
    // face with tape photo corners
    const mood = moodOf(u, now);
    const face = portrait(u.id, mood);
    const fx = x + 4;
    const fy = y + 6;
    if (face) {
      g.ctx.drawImage(face, 0, 0, face.width, face.height, fx, fy, 32, 32);
    } else {
      g.rect(fx, fy, 32, 32, heba ? '#D8C8A4' : '#F4E6C8');
      g.frame(fx, fy, 32, 32, C.grid);
      g.text(u.name[0], fx + 16, fy + 8, { color: C.ink, align: 'center' });
    }
    g.img(tapeCorner(), fx - 1, fy - 1);
    g.img(tapeCorner(), fx + 29, fy + 29);
    if (u.hanamaruMark) g.img(hanamaruFrame(12, 1, false, 1), fx + 22, fy - 3);
    // HP
    const tx = x + 42;
    g.text('HP', tx, y + 6, { color: C.ink });
    const hpStr = `${Math.round(u.hpShown)}/${u.m.maxHp}`;
    g.text(hpStr, x + 130, y + 6, { color: heba ? C.shuDark : u.hpRate <= 0.25 ? C.shuDark : C.ink, align: 'right' });
    const rate = Math.max(0, Math.min(1, u.m.hp / u.m.maxHp));
    const trail = Math.max(0, Math.min(1, u.hpTrail / u.m.maxHp));
    let fill = hpColor(rate);
    if (u.hpGrowT > 0) fill = C.greenLight;
    drawBar(g, tx, y + 25, 88, 5, rate, fill, C.grid, trail, C.white);
    if (u.m.maxMp > 0) {
      g.img(inkPot(), tx, y + 34);
      g.text(`${Math.round(u.mpShown)}/${u.m.maxMp}`, x + 130, y + 32, { color: C.ink, align: 'right' });
      drawBar(g, tx, y + 51, 88, 3, u.m.mp / u.m.maxMp, C.shu, C.grid);
    } else if (u.id === 'kanenari') {
      // PR cool-downs
      const slot = (ix: number, icon: HTMLCanvasElement, skill: string) => {
        g.img(icon, ix, y + 34);
        const ct = u.ct[skill] ?? 0;
        if (ct > 0) g.text(String(ct), ix + 13, y + 32, { color: C.gray });
        else g.img(checkStamp(), ix + 13, y + 36);
      };
      slot(tx, balloonIcon(), 'skill_fuusen');
      if (u.m.skills.includes('skill_goaisatsu')) slot(tx + 46, bowIcon(), 'skill_goaisatsu');
    }
    // status icons (3 × 2)
    const icons: HTMLCanvasElement[] = [];
    const pops: number[] = [];
    for (const id of ['status_konran', 'status_nemuri', 'status_tsukamare', 'status_toosenbo', 'status_mamoru']) {
      if (id === 'status_mamoru' ? u.guard : u.has(id)) {
        const ic = statusIcon(id);
        if (ic) {
          icons.push(ic);
          const p = u.statusPop.find((s) => s.id === id);
          pops.push(p ? p.t : 0);
        }
      }
    }
    for (const k of ['atk', 'def', 'hit'] as const) {
      const st = u.stages[k];
      if (st.lv !== 0) {
        icons.push(buffIcon(k, st.lv > 0));
        pops.push(0);
      }
    }
    icons.slice(0, 6).forEach((ic, i) => {
      const ix = x + 4 + (i % 3) * 11;
      const iy = y + 40 + Math.floor(i / 3) * 10;
      const pt = pops[i];
      if (pt > 0) {
        const s = 1 + 0.4 * (pt / 200);
        const w = ic.width * s;
        const h = ic.height * s;
        g.ctx.drawImage(ic, Math.round(ix + ic.width / 2 - w / 2), Math.round(iy + ic.height / 2 - h / 2), Math.round(w), Math.round(h));
      } else g.img(ic, ix, iy);
    });
    if (u.away) {
      g.rect(x + 2, y + 2, 132, 58, '#9AA0A8', 0.55);
      g.img(roundSeal('るす', 30), x + 70, y + 16);
    }
  });
  // name tag (masking tape)
  const [tx0, ty0, tw] = TAG[u.id] ?? [x + 30, y - 9, 56];
  g.img(tapeCanvas(tw, 18, u.name, C.tape, u.id === 'minato' ? 2 : 4), tx0 + dx, ty0 + dy, pc.alpha < 1 ? { alpha: pc.alpha } : {});
}

/** Kire tab with three "!" icons. `pops[i]` = remaining pop time (ms). */
export function drawKire(g: Gfx, kire: number, pops: number[], t: number, alpha: number): void {
  g.img(tapeCanvas(44, 18, '', C.tape, 6), 220, 138, alpha < 1 ? { alpha } : {});
  const pulse = kire >= 3 && Math.floor(t / 500) % 2 === 0;
  for (let i = 0; i < 3; i++) {
    const lit = i < kire;
    const ic = kireIcon(lit, lit && pulse);
    const x = 224 + i * 13;
    const p = pops[i] ?? 0;
    if (p > 0) {
      const s = 1 + 0.6 * (p / 100);
      const w = ic.width * s;
      const h = ic.height * s;
      g.ctx.drawImage(ic, Math.round(x + 5 - w / 2), Math.round(147 - h / 2), Math.round(w), Math.round(h));
    } else g.img(ic, x, 140, alpha < 1 ? { alpha } : {});
  }
}

export interface CmdView {
  icons: { id: string; name: string; sub?: string; dim?: boolean }[];
  index: number;
  pressed: boolean;
  noriTab: boolean;
  onTab: boolean;
  tutorialPulse?: string;
}

export function drawCommand(g: Gfx, v: CmdView, t: number, alpha: number): void {
  drawNote(g, 4, 150, 96, 62, {}, alpha);
  const n = v.icons.length;
  const xs = n >= 5 ? [10, 27, 44, 61, 78] : n === 4 ? [18, 35, 52, 69] : n === 1 ? [44] : [27, 44, 61].slice(0, n);
  g.alpha(alpha, () => {
    v.icons.forEach((ic, i) => {
      const sel = i === v.index && !v.onTab;
      const x = xs[i] ?? 10 + i * 17;
      const y = 156 - (sel ? 2 : 0);
      if (sel) {
        g.alpha(0.25, () => g.circle(x + 8, y + 8, 10, C.shu));
      }
      const pulse = v.tutorialPulse === ic.id && Math.floor(t / 250) % 2 === 0;
      if (pulse) g.alpha(0.5, () => g.circle(x + 8, y + 8, 10, C.shuLight));
      g.img(cmdIcon(ic.id), x, y, ic.dim ? { alpha: 0.4 } : {});
    });
    if (!v.onTab && v.icons[v.index]) {
      const cur = v.icons[v.index];
      const x = xs[v.index] ?? 10;
      const bob = Math.round(Math.sin(t / 130) * 1) + (v.pressed ? 1 : 0);
      g.img(cursorStamp(v.pressed), x + 4, 144 + bob);
      g.text(cur.name, 10, 176, { color: cur.dim ? C.gray : C.ink });
      if (cur.sub) {
        if (cur.sub.startsWith('ink:')) {
          g.img(inkPot(), 10, 195);
          g.text(cur.sub.slice(4), 23, 193, { color: C.ink });
        } else g.text(cur.sub, 10, 193, { color: C.ink });
      }
      if (n > 1) {
        g.img(arrowIcon(false), 80, 181);
        g.img(arrowIcon(true), 88, 181);
      }
    }
  });
  if (v.noriTab) {
    const pulse = 0.5 + 0.5 * Math.sin((t / 1000) * Math.PI * 2);
    const edge = pulse > 0.5 ? C.shuLight : C.shu;
    g.rect(4, 131, 96, 18, C.ink);
    g.rect(5, 132, 94, 16, edge);
    g.rect(6, 133, 92, 14, C.shu);
    g.rect(6, 133, 92, 1, C.shuLight);
    g.text('ノリツッコミ', 52, 132, { color: C.white, align: 'center' });
    if (v.onTab) {
      const bob = Math.round(Math.sin(t / 130));
      g.img(cursorStamp(v.pressed), 0, 128 + bob);
      g.img(cursorStamp(v.pressed), 96, 128 + bob);
    }
  }
}

export interface ListRow {
  name: string;
  right?: string;
  rightIcon?: 'ink' | 'ct';
  dim?: boolean;
  divider?: boolean;
}

export function drawList(g: Gfx, rows: ListRow[], index: number, scroll: number, t: number, pressed: boolean): void {
  drawNote(g, 4, 58, 200, 88);
  for (let i = 0; i < 4; i++) {
    const r = rows[scroll + i];
    if (!r) break;
    const y = 64 + i * 18;
    if (r.divider) g.rect(12, y - 2, 184, 1, C.gray);
    g.text(r.name, 22, y, { color: r.dim ? C.gray : C.ink });
    if (r.right) {
      const w = g.measure(r.right);
      g.text(r.right, 196, y, { color: r.dim ? C.gray : C.ink, align: 'right' });
      if (r.rightIcon === 'ink') g.img(inkPot(), 196 - w - 12, y + 3);
    }
    if (scroll + i === index) {
      const bob = Math.round(Math.sin(t / 130)) + (pressed ? 1 : 0);
      g.img(cursorStamp(pressed), 10, y + 3 + bob);
    }
  }
  if (scroll > 0) g.img(scrollArrow(true), 193, 60);
  if (scroll + 4 < rows.length) g.img(scrollArrow(false), 193, 140);
}

/** Boss chime counter sticky: 4 bells. `lit` count, `pop` per-bell ms. */
export function drawChimeSticky(g: Gfx, y: number, lit: number, pops: number[], t: number, gold = false): void {
  // yellow sticky hanging under the message band
  g.rect(302, y + 2, 76, 20, C.shadow, 0.45);
  g.rect(300, y, 76, 20, C.stickyEdge);
  g.rect(301, y + 1, 74, 18, C.sticky);
  g.img(tapeCanvas(18, 6, '', C.tape, 8), 329, y - 3);
  const xs = [305, 322, 339, 356];
  for (let i = 0; i < 4; i++) {
    const on = i < lit;
    const ic = bellIcon(on || gold);
    const p = pops[i] ?? 0;
    const x = xs[i];
    const yy = y + 2;
    if (on && p > 0) {
      const s = 1 + 0.6 * (p / 150);
      const w = ic.width * s;
      const h = ic.height * s;
      g.ctx.drawImage(ic, Math.round(x + 7 - w / 2), Math.round(yy + 8 - h / 2), Math.round(w), Math.round(h));
      // sound arcs
      g.px(x - 2, yy + 3, C.gold);
      g.px(x - 3, yy + 5, C.gold);
      g.px(x + 16, yy + 3, C.gold);
      g.px(x + 17, yy + 5, C.gold);
    } else g.img(ic, x, yy);
    if ((on || gold) && Math.floor(t / 400) % 2 === 0) g.alpha(0.35, () => g.ring(x + 7, yy + 8, 9, C.goldLight));
  }
}

export interface CardData {
  short: string;
  weak: ('da' | 'han' | 'wara')[];
  resist: ('da' | 'han' | 'wara')[];
  seen: number;
  total: number;
  hpRate: number;
  hidden?: boolean;
}

/** みました info card, `slide` 0..1 (1 = in place). */
export function drawInfoCard(g: Gfx, d: CardData, slide: number): void {
  const x = Math.round(216 + (1 - slide) * 170);
  const y = 50;
  drawNote(g, x, y, 160, 96);
  g.img(tapeCanvas(64, 16, 'みました', C.tape, 12), x + 48, y - 8);
  g.text(d.short, x + 10, 56 + 2, { color: C.ink });
  g.text('弱点', x + 10, 74 + 2, { color: C.shuDark });
  const icons = (list: typeof d.weak, yy: number) => {
    if (!list.length) g.text('なし', x + 48, yy, { color: C.gray });
    list.forEach((a, i) => g.img(attrIcon(a), x + 48 + i * 12, yy + 4));
  };
  icons(d.weak, 76);
  g.text('耐性', x + 10, 92 + 2, { color: C.navy });
  icons(d.resist, 94);
  drawText(g.ctx, `ツッコミ ${d.seen}/${d.total}`, x + 10, 110 + 2, { color: C.ink });
  if (!d.hidden) drawBar(g, x + 20, y + 80, 120, 4, d.hpRate, C.shu, C.grid, 0);
}
