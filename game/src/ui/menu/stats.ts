// つよさ (30_level_art 10.7/10.9, 10_narrative 9.8 / 12.4): the 通知表.
// Left page: the photo (portrait taped in), class and name, level and
// experience, HP and 朱肉 bars. Right page: the ruled table of the six
// abilities written in pencil (no grade stamps here) and 「せんせいより」.
// ←→ (or ↑↓) switches between シュン and カネナリくん, whose tabs are
// sticky notes on the right page.

import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { state, type Member } from '../../game/state';
import { EXP_TABLE, expToNext, levelCap, REPORT } from '../../data/battle';
import { sfx } from '../../audio';
import { portrait } from '../../art/chars';
import { drawDigits, drawNumerals, numeralsWidth } from '../digits';
import { inkPotIcon } from '../icons';
import { drawTape, pencilLine, phraseWrap as wrap, tapeImg, textW, UI } from '../window';
import { drawBar, drawHeader, FOLD, hpColor, LP, RP, SP } from './notebook';
import type { MenuCtx, MenuPage } from './types';

/** Line pitch of the 通知表's ruled table. */
const ROW = 16;

const ROWS: [string, keyof Member][] = [
  ['HP', 'maxHp'],
  ['朱肉', 'maxMp'],
  ['ちから', 'atk'],
  ['まもり', 'def'],
  ['すばやさ', 'spd'],
  ['うん', 'luck'],
];

export class StatsPage implements MenuPage {
  private who = 0;
  private switchT = 999;

  enter(): boolean {
    return state.party.length > 0;
  }

  show(): void {
    this.who = Math.min(this.who, Math.max(0, state.party.length - 1));
  }

  update(_m: MenuCtx, dt: number, input: Input): boolean {
    this.switchT += dt;
    const n = state.party.length;
    if (n > 1 && (input.repeat('left') || input.repeat('right') || input.repeat('up') || input.repeat('down'))) {
      this.who = (this.who + 1) % n;
      this.switchT = 0;
      sfx('se_page');
    }
    if (input.pressed('cancel') || input.pressed('confirm')) {
      sfx('se_cancel');
      return false;
    }
    return true;
  }

  draw(g: Gfx, m: MenuCtx): void {
    const mem = state.party[this.who] ?? state.party[0];
    drawHeader(g, 'つよさ', LP.x, SP.y + 6, '#9BCB6B', 1, 7);
    g.text('つうちひょう', RP.x + 2, SP.y + 7, { color: UI.pencil });
    if (!mem) return;
    const k = Math.min(1, this.switchT / 140);
    g.alpha(k, () => {
      this.drawLeft(g, mem);
      this.drawRight(g, mem);
    });
  }

  drawBehind(g: Gfx, m: MenuCtx): void {
    // one sticky tab per member on the notebook's top edge
    let x = SP.x + 72;
    state.party.forEach((p, i) => {
      const sel = i === this.who;
      const label = p.id === 'kanenari' ? 'カネナリくん' : p.name;
      const w = textW(label) + 14;
      const y = SP.y - 18 - (sel ? 2 : 0);
      drawTape(g, x, y, w, 20, '', { color: sel ? '#D8F0B8' : '#D8CBA8', seed: 10 + i });
      g.text(label, x + 7, y + 1, { color: sel ? UI.text : UI.pencil });
      if (sel && m.focus && state.party.length > 1) g.rect(x + 2, y + 17, w - 4, 1, UI.accent);
      x += w + 2;
    });
  }

  private drawLeft(g: Gfx, mem: Member): void {
    const x = LP.x;
    const right = FOLD - 12;
    let y = SP.y + 28;
    // the photo, taped in with two corners of masking tape
    const face = portrait(mem.id, mem.hp <= 0 ? 'ko' : mem.hp / mem.maxHp <= 0.25 ? 'hurt' : 'normal');
    g.rect(x + 2, y + 2, 38, 38, UI.bg2);
    g.rect(x, y, 38, 38, UI.border);
    g.rect(x + 1, y + 1, 36, 36, UI.flipPaper);
    if (face) g.img(face, x + 3, y + 3);
    g.img(tapeImg(9, 5, UI.tape, 4), x - 3, y - 2);
    g.img(tapeImg(9, 5, UI.tape, 6), x + 32, y + 35);
    // name and level beside the photo
    const lx = x + 46;
    const l2 = REPORT.nameLine2[mem.id] ?? mem.name;
    g.text(l2, lx, y + 1, { color: UI.text });
    pencilLine(g, lx, y + 19, right - lx, 1, UI.border, 9);
    g.text('レベル', lx, y + 22, { color: UI.pencil });
    drawDigits(g, String(mem.level), lx + textW('レベル') + 6, y + 23, { color: UI.accent, scale: 2 });
    // class, on the card's ruled line
    y += 44;
    g.text(REPORT.nameLine1[mem.id] ?? '', x, y, { color: UI.text });
    g.rect(x, y + 17, right - x, 1, '#E3D3A8');
    // experience
    y += 22;
    g.text('けいけんち', x, y, { color: UI.text });
    drawNumerals(g, String(mem.exp), right, y, { color: UI.text, align: 'right' });
    const next = expToNext(mem);
    const lo = EXP_TABLE[mem.level] ?? 0;
    const hi = EXP_TABLE[Math.min(levelCap(), mem.level + 1)] ?? lo + 1;
    y += 17;
    if (next === null) g.text('もう いっぱい', x, y, { color: UI.accent });
    else {
      g.text('つぎまで', x, y, { color: UI.pencil });
      drawNumerals(g, String(next), right, y, { color: UI.pencil, align: 'right' });
    }
    drawBar(g, x, y + 18, right - x, 4, next === null ? 1 : (mem.exp - lo) / Math.max(1, hi - lo), '#9BCB6B');
    // HP and 朱肉 now
    y += 26;
    const hr = mem.maxHp ? mem.hp / mem.maxHp : 0;
    g.text('HP', x, y, { color: UI.text });
    const hpS = `${mem.hp}/${mem.maxHp}`;
    drawNumerals(g, hpS, right, y, { color: mem.hp <= 0 ? UI.accentDark : UI.text, align: 'right' });
    drawBar(g, x + 22, y + 6, right - x - 28 - numeralsWidth(hpS), 5, hr, hpColor(hr));
    y += 18;
    if (mem.maxMp > 0) {
      g.img(inkPotIcon(), x + 1, y + 2);
      const mpS = `${mem.mp}/${mem.maxMp}`;
      drawNumerals(g, mpS, right, y, { color: UI.text, align: 'right' });
      drawBar(g, x + 22, y + 7, right - x - 28 - numeralsWidth(hpS), 3, mem.mp / mem.maxMp, UI.accent);
    } else {
      g.img(inkPotIcon(), x + 1, y + 2, { alpha: 0.4 });
      g.text(REPORT.kanenariMp, x + 22, y, { color: UI.textDim });
    }
  }

  private drawRight(g: Gfx, mem: Member): void {
    const x = RP.x;
    const w = RP.w;
    let y = SP.y + 28;
    // ruled table with a double top rule
    g.rect(x, y - 2, w, 1, UI.border);
    g.rect(x, y, w, 1, UI.border);
    ROWS.forEach(([label, key], i) => {
      const ry = y + 3 + i * ROW;
      g.text(label, x + 2, ry, { color: UI.text });
      // vertical rule between label and value (not through a note that spans it)
      if (!(key === 'maxMp' && mem.maxMp <= 0)) g.rect(x + 70, ry - 2, 1, ROW + 1, '#E3D3A8');
      let v: string;
      if (key === 'maxHp') v = `${mem.maxHp}`;
      else if (key === 'maxMp') v = mem.maxMp > 0 ? `${mem.maxMp}` : '';
      else v = String(mem[key] as number);
      if (key === 'maxMp' && mem.maxMp <= 0) g.text('（記入なし）', x + w - 4 - textW('（記入なし）'), ry, { color: UI.textDim });
      else drawNumerals(g, v, x + w - 8, ry, { color: UI.pencil, align: 'right' });
      g.rect(x, ry + ROW - 1, w, 1, i === ROWS.length - 1 ? UI.border : '#E3D3A8');
    });
    y += 3 + ROWS.length * ROW + 4;
    // せんせいより
    const comment = REPORT.teacher[mem.id]?.[mem.level] ?? '';
    drawTape(g, x, y, textW(REPORT.fromTeacher) + 12, 16, REPORT.fromTeacher, { color: '#E8D9B5', seed: 12 });
    if (comment) {
      const lines = wrap(comment, w - 4);
      lines.slice(0, 2).forEach((l, i) => g.text(l, x + 2, y + 17 + i * 16, { color: UI.accent }));
    } else g.text('（まだ 空らん）', x + 2, y + 18, { color: UI.textDim });
  }
}
