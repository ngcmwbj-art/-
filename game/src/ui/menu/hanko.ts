// ハンコ (30_level_art 10.7, 10_narrative 11): the open wooden hanko case
// lying across the notebook, 10 slots (5×2). Choose a stamp to read about it;
// 決定 uses it in the field — はなまる heals (target on a sticky note),
// みました goes to the nearest unstamped 「ふしぎ」 (else "近くに、見るべき
// ものが ない。"), the others have nobody to be pressed on.

import type { Co } from '../../engine/co';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { flag, state } from '../../game/state';
import { canUseSkillInField, FIELD_TEXT, getSkill, useSkillInField } from '../../data/battle';
import { sfx } from '../../audio';
import { field } from '../../world/field';
import { fushigiActive, runFushigi } from '../../world/fushigi';
import { say } from '../dialog';
import { drawDigits } from '../digits';
import { CASE_SLOTS, CASE_W, drawCase, slotXY } from '../hankocase';
import { inkPotIcon } from '../icons';
import { drawCursor, pencilLine, phraseWrap as wrap, textW, UI } from '../window';
import { drawBar, drawHeader, hpColor, LP, Popup, RP, SP } from './notebook';
import type { MenuCtx, MenuPage } from './types';

const CX = SP.x + Math.round((SP.w - CASE_W) / 2);
const CY = SP.y + 28;

function minato() {
  return state.party.find((p) => p.id === 'minato');
}

export function ownsHanko(id: string): boolean {
  return !!minato()?.skills.includes(id);
}

/** The nearest active fushigi within 2 tiles of the player, if any. */
export function nearbyFushigi(): string | null {
  const f = field();
  if (!f) return null;
  for (const s of f.fushigiSpots()) {
    if (!fushigiActive(s.id)) continue;
    if (Math.hypot(f.player.x - s.x, f.player.y - 8 - s.y) <= 40) return s.id;
  }
  return null;
}

export class HankoPage implements MenuPage {
  private sel = 0;
  private popup: Popup | null = null;
  private moveT = 999;

  enter(): boolean {
    if (!flag('flag_got_hanko') && !ownsHanko('skill_mimashita')) return false;
    return true;
  }

  update(m: MenuCtx, dt: number, input: Input): boolean {
    this.moveT += dt;
    if (this.popup) {
      const r = this.popup.update(dt, input);
      if (r === null) return true;
      this.popup = null;
      if (r >= 0) {
        const target = state.party[r];
        if (target) m.run(this.hanamaruCo(target.id));
      }
      return true;
    }
    const col = this.sel % 5;
    const row = Math.floor(this.sel / 5);
    let n = this.sel;
    if (input.repeat('right')) n = row * 5 + ((col + 1) % 5);
    else if (input.repeat('left')) n = row * 5 + ((col + 4) % 5);
    else if (input.repeat('down') || input.repeat('up')) n = ((row + 1) % 2) * 5 + col;
    if (n !== this.sel) {
      this.sel = n;
      this.moveT = 0;
      sfx('se_cursor');
    }
    if (input.pressed('cancel')) {
      sfx('se_cancel');
      return false;
    }
    if (input.pressed('confirm')) this.use(m);
    return true;
  }

  private use(m: MenuCtx): void {
    const id = CASE_SLOTS[this.sel];
    if (!id || id === 'skill_oyasuminasai' || !ownsHanko(id)) {
      sfx('se_buzzer');
      return;
    }
    if (id === 'skill_hanamaru') {
      if (!canUseSkillInField(id, 'minato')) {
        sfx('se_buzzer');
        m.run(say(FIELD_TEXT.noInk, { voice: 'sys' }));
        return;
      }
      sfx('se_confirm');
      const opts = state.party.map((p) => ({ label: p.name, sub: `${p.hp}/${p.maxHp}`, bar: { rate: p.hp / p.maxHp, color: hpColor(p.hp / p.maxHp) } }));
      this.popup = new Popup(opts, RP.x + 20, SP.y + 40, 'だれに 押す？', { minW: 120 });
      return;
    }
    if (id === 'skill_mimashita') {
      const fid = nearbyFushigi();
      if (fid) {
        sfx('se_confirm');
        // straight to 「『みました』を 押しますか？」 (8.0) in the field
        m.close(() => fushigiCo(fid));
        return;
      }
      m.run(say(FIELD_TEXT.noFushigi, { voice: 'sys' }));
      return;
    }
    m.run(say(FIELD_TEXT.noTarget, { voice: 'sys' }));
  }

  private *hanamaruCo(targetId: string): Co {
    const t = state.party.find((p) => p.id === targetId);
    if (t && t.hp >= t.maxHp) {
      sfx('se_buzzer');
      yield* say(`${t.name}の HPは もう いっぱいだ。`, { voice: 'sys' });
      return;
    }
    sfx('se_stamp');
    sfx('se_hanamaru');
    const pages = useSkillInField('skill_hanamaru', 'minato', targetId).map((p) => p.replace(/^(.+)の HPが 0 回復した。$/m, '$1の HPは もう いっぱいだ。'));
    sfx('se_heal');
    yield* say(pages, { voice: 'sys' });
  }

  draw(g: Gfx, m: MenuCtx): void {
    drawHeader(g, 'ハンコケース', LP.x, SP.y + 6, '#E0567A', 1, 5);
    if (!flag('flag_got_hanko') && !ownsHanko('skill_mimashita')) {
      // before evt_hanko_given: only a pencil outline where the case will go
      g.alpha(0.35, () => {
        for (let i = 0; i < CASE_W; i += 3) {
          g.px(CX + i, CY, UI.pencil);
          g.px(CX + i, CY + 103, UI.pencil);
        }
        for (let j = 0; j < 104; j += 3) {
          g.px(CX, CY + j, UI.pencil);
          g.px(CX + CASE_W - 1, CY + j, UI.pencil);
        }
      });
      g.text('まだ、なにも ない。', CX + CASE_W / 2, CY + 44, { color: UI.textDim, align: 'center' });
      return;
    }
    // ink left (朱肉) at the top right
    const mi = minato();
    if (mi) {
      const x = SP.x + SP.w - 70;
      g.img(inkPotIcon(), x, SP.y + 7);
      drawDigits(g, `${mi.mp}/${mi.maxMp}`, x + 14, SP.y + 11, { color: UI.text });
      drawBar(g, x + 14, SP.y + 20, 44, 3, mi.maxMp ? mi.mp / mi.maxMp : 0, UI.accent);
    }
    const sel = m.focus ? this.sel : -1;
    drawCase(g, CX, CY, { owned: ownsHanko, clear: !!flag('flag_clear'), t: m.t, sel });
    if (m.focus && !this.popup) {
      const [sx, sy] = slotXY(this.sel);
      drawCursor(g, CX + sx + 12, CY + sy - 13, m.t);
    }
    // info under the case: name and cost on one row, the two lines of the
    // description below it, written across both pages like a caption
    const y0 = CY + 107;
    const infoW = SP.x + SP.w - 14 - LP.x;
    const id = m.focus ? CASE_SLOTS[this.sel] : null;
    if (!m.focus) {
      const lines = wrap('おばあの 採点ハンコ。押した モノを、認める 力が ある。', SP.w - 36);
      lines.forEach((l, i) => g.text(l, SP.x + 18, y0 + 6 + i * 17, { color: UI.pencil }));
    } else if (id && (id !== 'skill_oyasuminasai' ? ownsHanko(id) : !!flag('flag_clear'))) {
      const s = getSkill(id);
      const name = id === 'skill_oyasuminasai' ? '？？？' : s?.name ?? id;
      const nw = textW(name);
      g.text(name, LP.x, y0, { color: UI.accent });
      pencilLine(g, LP.x, y0 + 16, nw + 2, 1, UI.accentDark, 5);
      const cx = LP.x + nw + 12;
      if (s?.cost) {
        g.img(inkPotIcon(), cx, y0 + 2);
        g.text('朱肉', cx + 12, y0, { color: UI.text });
        drawDigits(g, String(s.cost), cx + 12 + textW('朱肉') + 4, y0 + 5, { color: UI.accent });
      } else if (id === 'skill_okaerinasai') {
        g.text('最後に 使う', cx, y0, { color: UI.pencil });
      }
      const desc = id === 'skill_oyasuminasai' ? ['（輪郭だけが、うっすら 見える）'] : s?.desc ?? [];
      const lines = desc.filter((l) => l).flatMap((l) => wrap(l, infoW));
      lines.slice(0, 2).forEach((l, i) => g.text(l, LP.x, y0 + 18 + i * 17, { color: UI.text }));
    } else {
      g.text('（空き）', LP.x, y0, { color: UI.textDim });
      g.text('まだ なにも 入っていない。', LP.x, y0 + 18, { color: UI.textDim });
    }
    this.popup?.draw(g);
  }
}

function* fushigiCo(id: string): Co {
  const f = field();
  if (!f) return;
  let done = false;
  f.startScript(
    (function* () {
      yield* runFushigi(id, '');
      done = true;
    })(),
  );
  yield () => done;
}
