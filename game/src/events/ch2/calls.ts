// evt_ch2_calls (50 3.13, 52 13.1, 53 7.4): the 防災無線 on the hill calls
// the names of the ones who left, one at a time, all night — every 45 s in
// stage 0, 30 s in stage 1, 15 s in stage 2. Outdoors a small bubble at the
// top of the screen types the line (the voice comes from the hill's speaker;
// on the hill's plaza the bubble sits over the pole's horns); indoors it is
// sound only. The timer stops while a battle, an event or a menu is up and
// goes on from where it was.
//
//   stage 0/1: se_h_pa_open → 0.35 s → 「……ナナミちゃん。」 → 0.4 s → se_h_pa_close
//   stage 2  : the line stays open (amb_h_pa_hum); 「こちらは、防災 星見台です。」
//              and the names in turn; each line answered by the valley's echo.

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { drawText } from '../../engine/font';
import { makeCanvas } from '../../engine/pixel';
import { W } from '../../engine/screen';
import { ease } from '../../engine/tween';
import { flag, setFlag } from '../../game/state';
import { duckMusic, sfx, textBlip } from '../../audio';
import { field } from '../../world/field';
import { registerScript } from '../../world/api';
import { registerWorldFx } from '../../world/fx';
import { registerDebug } from '../../debug';
import { UI } from '../../ui/window';
import { CALL_HEAD, CALL_NAMES, callLine } from '../../data/text/hoshi_npcs';
import { ambVol, hasUi, paEcho, ui } from './compat';
import { hStage } from './common';

// ---------------------------------------------------------------- when

const INTERVAL = [45000, 30000, 15000];
const OUTDOOR = new Set(['map_hoshimidai', 'map_hoshi_hill']);
const INDOOR = new Set(['map_hoshi_house', 'map_hoshi_barn', 'map_hoshi_school']);

const timer = { ms: 0, busy: false, lastAt: -1e9, held: false };

/** The calls sound at all (after the arrival, until the boss scene takes the line). */
export function callsLive(): boolean {
  return flag('flag_ch2_arrived') > 0 && flag('flag_ch2_boss_beaten') === 0 && hStage() <= 2 && !timer.held;
}

/** Hold the timer (evt_ch2_boss_intro: the speaker has one thing left to say). */
export function holdCalls(on: boolean): void {
  timer.held = on;
  if (on) timer.ms = 0;
}

/** Restart the count (a call was just made in a scene). */
export function resetCallTimer(): void {
  timer.ms = 0;
  timer.lastAt = game.time;
}

export function callInterval(): number {
  return INTERVAL[Math.max(0, Math.min(2, hStage()))];
}

registerWorldFx({
  map: '',
  update(f, dt) {
    const m = f.map.id;
    if (!OUTDOOR.has(m) && !INDOOR.has(m)) return;
    if (!callsLive() || timer.busy) return;
    // counts only while Minato can walk: no event, menu, battle or fade
    if (!f.controllable || game.top !== f || game.ui.modal || game.fadeAlpha > 0.05) return;
    timer.ms += dt;
    if (timer.ms >= callInterval()) {
      timer.ms = 0;
      game.scripts.run(playCall());
    }
  },
});

// ---------------------------------------------------------------- what

/** The next line to call (and move the count on). Stage 2 alternates the station's name with the names. */
function nextLine(stage: number): { text: string; head: boolean } {
  if (stage >= 2) {
    const alt = flag('flag_ch2_call_alt');
    setFlag('flag_ch2_call_alt', alt ? 0 : 1);
    if (!alt) return { text: CALL_HEAD, head: true };
  }
  const n = flag('flag_ch2_call_n');
  setFlag('flag_ch2_call_n', n + 1);
  return { text: callLine(CALL_NAMES[n % CALL_NAMES.length]), head: false };
}

/**
 * One call. `force` plays it whatever the timer says (evt_ch2_arrive's first
 * 「……ナナミちゃん。」). Resolves when the line has been said.
 */
export function* playCall(force = false): Co {
  const f = field();
  if (!f) return;
  if (!force && (!callsLive() || timer.busy)) return;
  timer.busy = true;
  try {
    const stage = hStage();
    const indoor = INDOOR.has(f.map.id);
    const open = stage < 2;
    const { text } = nextLine(stage);
    // a far call: the song and the beds make a little room (−4 dB / −2 dB)
    duckMusic(0.63, 3.2);
    if (open) {
      sfx('se_h_pa_open', indoor ? { vol: 0.35 } : undefined);
      yield 350;
    }
    yield* typeCall(text, indoor);
    if (open) {
      yield 400;
      sfx('se_h_pa_close', indoor ? { vol: 0.35 } : undefined);
    } else paEcho(0.6, 2.0);
  } finally {
    timer.busy = false;
    timer.ms = 0;
    timer.lastAt = game.time;
  }
}

/** The line: the UI's bubble when it has one (fx_h_call_bubble), else ours; indoors only the voice. */
function* typeCall(text: string, indoor: boolean): Co {
  const cps = 12;
  if (!indoor && hasUi('showCallBubble')) {
    ui('showCallBubble', text);
    for (const ch of text) {
      if (ch.trim()) textBlip('broadcast', ch);
      yield 1000 / cps;
    }
    yield 600;
    return;
  }
  if (indoor) {
    // the voice through the walls, no bubble
    for (const ch of text) {
      if (ch.trim()) textBlip('broadcast', ch);
      yield 1000 / cps;
    }
    return;
  }
  const b = new CallBubble(text, cps);
  game.ui.push(b);
  yield () => b.typed;
}

// ---------------------------------------------------------------- the bubble (52 13.1, fx_h_call_bubble)

let HORN: HTMLCanvasElement | null = null;
/** The little loudspeaker horn (7×7, #C8CDD4) left of the words. */
function horn(): HTMLCanvasElement {
  if (HORN) return HORN;
  const rows = ['.....oo', '...ooho', '.oohhho', 'ohhhhho', '.oohhho', '...ooho', '.....oo'];
  const [c, ctx] = makeCanvas(7, 7);
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === 'o' ? '#6B7186' : y < 3 ? '#E8ECF0' : '#C8CDD4';
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  HORN = c;
  return c;
}

/**
 * A window-less bubble at the top middle (192,14), its tail pointing UP (the
 * voice comes from the mountain); pops in over 0.12 s, the words type in with
 * the broadcast voice, stays 2.4 s, fades out over 0.3 s. On the hill's
 * plaza it hangs 16 px over the pole's horns instead.
 */
class CallBubble implements Widget {
  modal = false;
  done = false;
  typed = false;
  private t = 0;
  private shown = 0;
  private acc = 0;
  private holdT = 0;
  private img: HTMLCanvasElement;
  private chars: string[];

  constructor(
    private text: string,
    private cps: number,
  ) {
    this.chars = [...text];
    this.img = this.frame();
  }

  /** The empty bubble: horn + room for the whole line, tail on top. */
  private frame(): HTMLCanvasElement {
    const tw = this.chars.reduce((a, ch) => a + (ch.charCodeAt(0) < 0x80 ? (ch === ' ' ? 4 : 8) : 16), 0);
    const w = tw + 22;
    const h = 18;
    const [c, ctx] = makeCanvas(w, h + 4);
    const r = (x: number, y: number, ww: number, hh: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, ww, hh);
    };
    const top = 4;
    // shadow, frame with cut corners, paper, the light top line
    r(2, top + 2, w - 2, h - 1, 'rgba(11,11,20,0.35)');
    r(1, top, w - 2, h, UI.border);
    r(0, top + 1, w, h - 2, UI.border);
    r(1, top + 1, w - 2, h - 2, UI.bg);
    r(1, top + 1, w - 2, 1, '#FFFBEE');
    // the tail, pointing up at the middle
    const tx = Math.floor(w / 2);
    r(tx - 2, top, 5, 1, UI.bg);
    r(tx - 3, top, 1, 1, UI.border);
    r(tx + 3, top, 1, 1, UI.border);
    r(tx - 1, top - 1, 3, 1, UI.bg);
    r(tx - 2, top - 1, 1, 1, UI.border);
    r(tx + 2, top - 1, 1, 1, UI.border);
    r(tx, top - 2, 1, 1, UI.bg);
    r(tx - 1, top - 2, 1, 1, UI.border);
    r(tx + 1, top - 2, 1, 1, UI.border);
    r(tx, top - 3, 1, 1, UI.border);
    ctx.drawImage(horn(), 4, top + 5);
    return c;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.t < 120) return;
    if (this.shown < this.chars.length) {
      this.acc += (dt / 1000) * this.cps;
      while (this.acc >= 1 && this.shown < this.chars.length) {
        this.acc -= 1;
        const ch = this.chars[this.shown++];
        if (ch.trim()) textBlip('broadcast', ch);
      }
      return;
    }
    this.typed = true;
    this.holdT += dt;
    if (this.holdT > 2400 + 300) this.done = true;
  }

  /** Where the tail's tip points (screen px). */
  private anchor(): [number, number] {
    const f = field();
    // the hill's plaza: over the pole's horns (15–16, 2–3), 16 px above them
    if (f && f.map.id === 'map_hoshi_hill' && f.player.tileY <= 7) {
      return [Math.round(16 * 16 - f.camX), Math.max(6, Math.round(2 * 16 - 16 - 30 - f.camY + 16))];
    }
    return [W / 2, 10];
  }

  draw(g: Gfx): void {
    const f = field();
    if (!f || game.top !== f) return;
    const k = Math.min(1, this.t / 120);
    const s = 1.2 - 0.2 * ease.cubicOut(k);
    const out = this.holdT > 2400 ? 1 - Math.min(1, (this.holdT - 2400) / 300) : 1;
    const a = Math.min(1, k * 2) * out;
    if (a <= 0) return;
    const [ax, ay] = this.anchor();
    const img = this.img;
    const w = Math.round(img.width * s);
    const h = Math.round(img.height * s);
    const x = Math.round(ax - w / 2);
    const y = Math.round(ay);
    g.alpha(a, () => g.ctx.drawImage(img, x, y, w, h));
    if (k < 1) return;
    // the words typed so far (16 px font, pencil ink)
    const shown = this.chars.slice(0, this.shown).join('');
    g.alpha(a, () => drawText(g.ctx, shown, x + 14, y + 5, { color: UI.text }));
  }
}

// ---------------------------------------------------------------- hooks

/**
 * The script id the world's timer (02 6.2) may run instead of ours: one call.
 * A call that comes too soon after the last one is dropped, so the two
 * timers never double the pace.
 */
registerScript('evt_ch2_calls', function* (): Co {
  if (game.time - timer.lastAt < callInterval() * 0.6) return;
  yield* playCall();
});

/** Stage 2's line stays open: the hum, a little louder near the mountain (world scales it by place). */
export function openLineHum(on: boolean): void {
  ambVol('amb_h_pa_hum', on ? 1 : 0, 1.5);
}

registerDebug('call2', () => {
  const f = field();
  if (!f) return 'no field';
  game.scripts.run(playCall(true));
  return `call (stage ${hStage()}, next name #${flag('flag_ch2_call_n') % CALL_NAMES.length})`;
});
