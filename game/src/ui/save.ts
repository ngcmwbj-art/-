// Saving (10_narrative 5.22 / 12.4, 30_level_art 10.9): お地蔵さん and the
// bench on the mall's 2F. While 「……セーブしますか？」 is asked, a notebook
// card shows what will be written down (and the previous record, if any);
// when it's written, a little 朱 seal 「ほぞん」 is stamped in the bottom right.
//
//   yield* saveMenu('jizo')   // evt_save_jizo, full text included
//   yield* saveMenu('bench')  // evt_save_bench: rest (full heal) first
//   const ok = yield* saveWithStamp();   // just save, with the stamp

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { Particles } from '../engine/particles';
import { ease } from '../engine/tween';
import { flag, saveGame, setFlag, state } from '../game/state';
import { sfx } from '../audio';
import { roundSeal } from '../battle/art/stamps';
import { ask, say } from './dialog';
import { drawDigits } from './digits';
import { placeNameFor } from './hud';
import { bookCounts } from './menu/book';
import { registerScript } from '../world/scripts';
import { drawTape, drawWindow, textW, UI } from './window';

const SAVE_KEY = 'yugure-rpg-save-v1';

interface SaveInfo {
  place: string;
  time: string;
  level: number;
  fushigi: number;
}

function fmtTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor(ms / 1000) % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function infoNow(): SaveInfo {
  return {
    place: placeNameFor(state.map, state.x, state.y, ''),
    time: fmtTime(state.playTimeMs),
    level: state.party[0]?.level ?? 1,
    fushigi: bookCounts().fushigi,
  };
}

/** What's in the existing save (read-only peek at the save slot). */
function infoSaved(): SaveInfo | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { map?: string; x?: number; y?: number; playTimeMs?: number; party?: { level: number }[]; flags?: Record<string, number> };
    let f = 0;
    for (let i = 1; i <= 12; i++) if (s.flags?.[`flag_fushigi_${String(i).padStart(2, '0')}`]) f++;
    return { place: placeNameFor(s.map ?? '', s.x ?? 0, s.y ?? 0, ''), time: fmtTime(s.playTimeMs ?? 0), level: s.party?.[0]?.level ?? 1, fushigi: f };
  } catch {
    return null;
  }
}

/** The card shown while asking (top centre). */
class SaveCard implements Widget {
  modal = false;
  done = false;
  private t = 0;
  private closing = -1;
  private readonly now = infoNow();
  private readonly prev = infoSaved();
  constructor() {}

  close(): void {
    this.closing = 0;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.closing >= 0) {
      this.closing += dt;
      if (this.closing > 120) this.done = true;
    }
  }

  draw(g: Gfx): void {
    const k = this.closing >= 0 ? 1 - this.closing / 120 : Math.min(1, this.t / 140);
    const w = 236;
    const h = this.prev ? 80 : 46;
    const x = Math.round(192 - w / 2);
    const y = 10 + Math.round((1 - ease.cubicOut(Math.min(1, k))) * -8);
    drawWindow(g, x, y + 4, w, h, UI, k, { curl: false });
    g.alpha(k, () => {
      drawTape(g, x + w - 58, y - 2, 50, 16, 'きろく', { color: '#F6D98A', seed: 14 });
      const row = (label: string, i: SaveInfo, yy: number, dim: boolean) => {
        const col = dim ? UI.textDim : UI.text;
        g.text(label, x + 10, yy, { color: dim ? UI.textDim : UI.pencil });
        g.text(i.place, x + 10 + textW(label) + 8, yy, { color: col });
        const stats = `LV${i.level}  ${i.time}`;
        drawDigits(g, stats, x + w - 10, yy + 5, { color: col, align: 'right' });
      };
      const yy = y + 4;
      row('いま', this.now, yy + 7, false);
      g.text('ふしぎ', x + 10, yy + 26, { color: UI.pencil });
      drawDigits(g, `${this.now.fushigi}/12`, x + 10 + textW('ふしぎ') + 5, yy + 31, { color: UI.accent });
      if (this.prev) {
        g.rect(x + 8, yy + 46, w - 16, 1, UI.bg2);
        row('まえ', this.prev, yy + 52, true);
      }
    });
  }
}

/**
 * The 「ほぞん」 seal stamped in the bottom-right corner — drawn as an overlay,
 * so it lands on top of the dialog paper like a real stamp.
 */
class SaveStamp implements Widget {
  modal = false;
  done = false;
  private t = 0;
  private parts = new Particles();
  private readonly img = roundSeal('ほぞん', 32);
  private readonly overlay = (g: Gfx) => this.paint(g);
  private static readonly X = 352;
  private static readonly Y = 184;
  constructor() {
    this.parts.burst(SaveStamp.X, SaveStamp.Y, { count: 7, speed: [30, 90], life: [200, 420], colors: ['#E23B2E', '#B8241E'], gravity: 200, drag: 3, shape: 'sq', size: [1, 2] });
    game.overlays.push(this.overlay);
  }
  update(dt: number): void {
    this.t += dt;
    this.parts.update(dt);
    if (this.t > 1700) {
      this.done = true;
      const i = game.overlays.indexOf(this.overlay);
      if (i >= 0) game.overlays.splice(i, 1);
    }
  }
  draw(): void {
    /* see paint() */
  }
  private paint(g: Gfx): void {
    if (this.done) return;
    const t = this.t;
    const s = t < 70 ? 1.35 - 0.35 * (t / 70) : 1;
    const a = t > 1350 ? Math.max(0, 1 - (t - 1350) / 350) : 1;
    const w = Math.round(this.img.width * s);
    g.alpha(a * 0.95, () => g.ctx.drawImage(this.img, Math.round(SaveStamp.X - w / 2), Math.round(SaveStamp.Y - w / 2), w, w));
    this.parts.draw(g);
  }
}

/** Save now, stamp 「ほぞん」, return whether it worked. */
export function* saveWithStamp(): Co<boolean> {
  const ok = saveGame();
  if (ok) {
    setFlag('flag_saved', 1);
    // write again so the flag is in the file
    saveGame();
    sfx('se_save');
    game.ui.push(new SaveStamp());
    yield 160;
  } else sfx('se_buzzer');
  return ok;
}

/** Ask 「……セーブしますか？」 with the record card; saves on する. */
export function* saveConfirm(voice: 'narr' | 'sys' = 'narr'): Co<boolean> {
  const card = new SaveCard();
  game.ui.push(card);
  const i = yield* ask('……セーブしますか？', ['する', 'しない'], { voice, cancel: 1 });
  card.close();
  return i === 0;
}

/**
 * The whole save scene of 5.22.
 *  'jizo'  — お地蔵さん (area_higurashi)
 *  'bench' — the rest bench on the mall's 2F (full heal first)
 */
export function* saveMenu(kind: 'jizo' | 'bench' = 'jizo'): Co<boolean> {
  if (kind === 'jizo') {
    yield* say('よだれかけに はなまるの 刺しゅう。', { voice: 'narr' });
    const yes = yield* saveConfirm('narr');
    if (!yes) {
      yield* say('お地蔵さんは、なにも 言わない。', { voice: 'narr' });
      return false;
    }
    sfx('se_stamp', { vol: 0.6 });
    const ok = yield* saveWithStamp();
    yield* say(ok ? 'お地蔵さんに 手を あわせた。\n今日の ことを、覚えて もらった。' : 'セーブ できなかった。', { voice: ok ? 'narr' : 'sys' });
    return ok;
  }
  yield* say(['休憩ベンチ。\n『ご自由に おかけください』。', 'すわると、体が かるくなった。'], { voice: 'narr' });
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = m.maxMp;
  }
  sfx('se_heal');
  yield* say('HPと 朱肉が 回復した。', { voice: 'sys' });
  const yes = yield* saveConfirm('sys');
  if (!yes) return false;
  const ok = yield* saveWithStamp();
  yield* say(ok ? 'セーブした。' : 'セーブ できなかった。', { voice: 'sys' });
  return ok;
}

export function hasSaved(): boolean {
  return flag('flag_saved') > 0;
}

// Default save points (evt_save_jizo / evt_save_bench, 10_narrative 5.22). The
// scenario module registers after the UI and may replace them.
registerScript('evt_save_jizo', function* () {
  sfx('se_examine');
  yield* saveMenu('jizo');
});
registerScript('evt_save_bench', function* () {
  sfx('se_examine');
  yield* saveMenu('bench');
});
