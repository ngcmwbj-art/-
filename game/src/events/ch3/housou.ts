// 終わりの 音は、下がる（第3章の クリア前、段階3。げむきか 10-26 の 案3、2026-10-26 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_housou.ts、新しい 地図は data/maps/c3_housou.ts（放送室 map_c3_aq_hoso）、絵は art/props/housou_art.ts、
// 音は audio/sfx_housou.ts、みました帳の ページは ui/menu/book_housou.ts。案から 直した 所は 文の ファイルの 頭。
//
//   S15 の あと（flag_ch3_aq_enter）から S20 で ホールに 入るまで（flag_ch3_tsugao1）。寄らなくても 本筋は 進む。
//   ・入口と券売所の 北の 壁の 小さな 戸 (5,1)（丸窓 (3)・(6) の 間。回廊の 戸 (10,1)・スピーカー (12,1) から 離した、
//     壁と 同じ 色の 目立たない 戸）：1回目 札と ジー と いう 音（flag_hs_pre）、2回目で 開く（flag_hs_to、flag_hs_start）→
//     戸を 調べて（または 押して）暗転で 放送室 (4,5)。
//   ・入口の 天井の スピーカー：今の 文の あと、戸を まだ 開けて いなければ グソっ君（1回、flag_hs_spk）→ 戸に「！」。
//     すんだ あとは「……しずかだ。」に 替わる。
//   ・放送室：入って すぐ（1回）赤い ランプと 貼り紙。テープの 機械（閉館の ご案内、10年前の ハキコの 声）→
//     チャイムの 箱の 大写し「チャイム」（ChimePanel）：上り → グソっ君の 迷子の お知らせ → 下り → つまみで 電源を 切る
//     （flag_hs_off：ランプが 消え、部屋が 一段 暗く、ジー が 止まる）→ 朱肉 +2・帳面③の すみ（flag_hs_done）。
//     大写しは もどるで やめられる（すんだ ところは flag に 残り、調べ直すと 続きから）。
//   ・テープの 棚：背の 字を 1本ずつ（3本、flag_hs_tana）。機械の『閉館の ご案内』と 合わせて ○/4。
//   ・S18 の 館内放送（trig_ch3_shinkai_pa を 包む）・S25 の 館内放送（minna.ts が hsPaBefore / hsPaAfter を 呼ぶ）：
//     すんで いれば 前に 上り 4音・あとに 下り 4音（音だけ。台本の 文は 変えない）。S18 の あと グソっ君「……下がったな。」（1回）。
//   ・かくし：屋上の 手すりから ハキコを 見て いる（flag_oj_talk）→ 6 の あと グソっ君 1行。迷子の お知らせの 途中で
//     ボタンを 押す → 「押すな！」（1回、音は 鳴らない）。S25 の 回廊で 来た ハキコ「……チャイム、下がって おりましたね。」。
//   ・S20 から 先・クリア後：戸は 閉まった まま（「戸の 向こうは、しずかだ。」）。
//
// QA：__game.cmd.housou(step, auto)、hsState()、hsText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { SPEAKERS } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { addMarkSource } from '../../world/marks';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { skipIntro, type Howto } from '../../ui/closeup';
import * as T from '../../data/text/c3_housou';
import { HS_UI } from '../../data/text/c3_housou';
import { SHINKAI_PA } from '../../data/text/c3_story3';
import { S25_HITOKOTO } from '../../data/text/c3_story4';
import { fillNames } from '../../data/text/c3_names';
import { HOSO, HS_CHIME, HS_DESK, HS_HARIGAMI, HS_ISU, HS_TANA } from '../../data/maps/c3_housou';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { au, se } from '../ch2/compat';
import { addToMap, inCh3, say3 } from './common';

export const HF = {
  pre: 'flag_hs_pre',
  spk: 'flag_hs_spk',
  to: 'flag_hs_to',
  start: 'flag_hs_start',
  inn: 'flag_hs_in',
  tape: 'flag_hs_tape',
  /** テープの 棚の 背の 字（読んだ 本数 0〜3）。 */
  tana: 'flag_hs_tana',
  rule: 'flag_hs_rule',
  up: 'flag_hs_up',
  maigo: 'flag_hs_maigo',
  osuna: 'flag_hs_osuna',
  down: 'flag_hs_down',
  off: 'flag_hs_off',
  okujou: 'flag_hs_okujou',
  done: 'flag_hs_done',
  s18: 'flag_hs_s18',
} as const;

const IRIGUCHI = 'map_c3_aq_iriguchi';
/** 入口の 北の 壁の 戸と、その 前。 */
const TO: [number, number] = [5, 1];
const TO_MAE: [number, number] = [5, 2];
/** 放送室の 着く 所（南の 戸の 上）。 */
const IN_AT: [number, number] = [4, 5];
/** チャイムの 箱の 4つの ボタンの 音の 高さ（左から。0 低い 〜 3 高い）：高さの 順に 並べない。 */
export const HS_BTN = [2, 0, 3, 1];

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

/** グソっ君の いない 行を 抜く。 */
function trim(text: string): string {
  if (knWith()) return text;
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = trim(text);
  if (!t.trim()) return -1;
  return yield* say3(t);
}

function wrap(id: string, fn: (ctx: ScriptCtx, orig: () => Co) => Co): void {
  const prev = getScript(id);
  registerScript(id, function* (ctx): Co {
    const orig = function* (): Co {
      if (prev) yield* prev(ctx);
      else yield* ctx.runDefault();
    };
    yield* fn(ctx, orig);
  });
}

/** 放送室に 入れる 間：段階3、S15 の あと、S20 の 前（クリア後は 閉まった まま）。 */
export function hsOpen(): boolean {
  return inCh3() && !pgOn() && flag('flag_ch3_stage') === 3 && flag('flag_ch3_aq_enter') > 0 && !flag('flag_ch3_tsugao1') && !flag('flag_ch3_clear');
}

/** 済ませた（電源を 切って ごほうびまで）。 */
export function hsDone(): boolean {
  return flag(HF.done) > 0;
}

const openDoor = () => hsOpen() && flag(HF.to) > 0;

// ================================================================ 地図の 物

addToMap(IRIGUCHI, [
  // the small door in the north wall (between the portholes (3) and (6)), painted flat on the wall
  { t: 'prop', prop: 'prop_hs_to', x: TO[0], y: 0, cond: { when: () => inCh3() || pgOn() } } as unknown as MapObj,
  { t: 'door', id: 'door_c3_aq_hoso', x: TO[0], y: TO[1], to: HOSO, tx: IN_AT[0], ty: IN_AT[1], dir: 'up', se: 'se_door', cond: { when: openDoor } } as unknown as MapObj,
  { t: 'obj', id: 'obj_hs_to', x: TO[0], y: TO[1], face: 'up', script: 'obj_hs_to', cond: { when: () => inCh3() || pgOn() } } as unknown as MapObj,
]);

const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj => ({ t: 'obj', id, x, y, script: id, ...extra }) as unknown as MapObj;
addToMap(HOSO, [
  O('obj_hs_harigami', HS_HARIGAMI[0], HS_HARIGAMI[1], { face: 'up' }),
  O('obj_hs_mic', HS_DESK[0], HS_DESK[1]),
  O('obj_hs_tsumami', HS_DESK[0] + 1, HS_DESK[1]),
  O('obj_hs_tape', HS_DESK[0] + 2, HS_DESK[1], { w: 2 }),
  O('obj_hs_chime', HS_CHIME[0], HS_CHIME[1]),
  O('obj_hs_tana', HS_TANA[0], HS_TANA[1], { w: 2, h: 2 }),
  O('obj_hs_isu', HS_ISU[0], HS_ISU[1]),
]);

// ================================================================ 見のがさない しるし

addMarkSource((f) => {
  if (f.map.id !== IRIGUCHI || !hsOpen() || !flag(HF.spk) || flag(HF.inn)) return null;
  const foot = (TO[1] + 1) * 16;
  return { x: TO[0] * 16 + 8, y: foot - 30, foot };
});

// ================================================================ 大写し「チャイム」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 欄（めあて・押した 順の 点）。 */
const RX = SX + 214;
/** ボタンの 並び（左の はし、間かく、幅）。 */
const BX0 = SX + 18;
const BGAP = 48;
const BW = 30;

const BOX = '#B8B4A8';
const BOX_DK = '#8A867A';
const INK = '#2A2440';
const BTN = ['#E8743A', '#D9A441', '#3FA66B', '#4A7AB8'];
/** 段の 色（低い → 高い）。 */
const STEP = '#FFE7A3';

type Goal = 'up' | 'down';
type Phase = 'idle' | 'select' | 'mic' | 'pause';

export class ChimePanel implements Widget {
  modal = true;
  /** 大写し：もどるで やめる（ui/closeup.ts）。 */
  closeup = true;
  /** はじめの カード（ui/closeup.ts、改善会議 10-25 の1）。 */
  howto: Howto = T.HS_HOWTO;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  phase: Phase = 'idle';
  goal: Goal = 'up';
  /** 選んで いる ボタン（左から 0〜3）。 */
  cur = 1;
  /** 押した 音の 高さ（0〜3）の 並び。 */
  seq: number[] = [];
  /** 押した ボタンと その 時刻（押しこむ 絵）。 */
  private pressK = -1;
  private pressT = 0;
  /** pause の 間に けってい を 押した。 */
  pushed = false;
  private armT = 0;

  update(dt: number, input: Input): void {
    this.t += dt;
    const waiting = this.phase === 'select' && this.seq.length < 4;
    if (!waiting && this.phase !== 'pause') {
      this.armT = 0;
      return;
    }
    this.armT += dt;
    if (this.armT < 150) return;
    if (this.phase === 'pause') {
      if (!this.auto && input.pressed('confirm')) {
        this.pushed = true;
        this.press(this.cur, false);
      }
      return;
    }
    if (this.auto) {
      if (this.armT < 380) return;
      this.armT = 150;
      const want = this.goal === 'up' ? this.seq.length : 3 - this.seq.length;
      const k = HS_BTN.indexOf(want);
      if (this.cur !== k) {
        this.cur += k > this.cur ? 1 : -1;
        return;
      }
      this.press(k, true);
      return;
    }
    if (input.pressed('left')) {
      this.cur = (this.cur + 3) % 4;
      se('se_cursor', { vol: 0.5 });
    } else if (input.pressed('right')) {
      this.cur = (this.cur + 1) % 4;
      se('se_cursor', { vol: 0.5 });
    } else if (input.pressed('confirm')) this.press(this.cur, true);
  }

  /** ボタン k を 押す（sound：鳴らす。pause の 間は 鳴らない）。 */
  press(k: number, sound: boolean): void {
    this.pressK = k;
    this.pressT = this.t;
    if (!sound) return;
    se(`se_hs_btn_${HS_BTN[k]}`);
    this.seq.push(HS_BTN[k]);
  }

  /** 4つ 押すまで 待つ（押した 高さの 並びを 返す）。 */
  *play(goal: Goal): Co<number[]> {
    this.goal = goal;
    this.seq = [];
    this.phase = 'select';
    while (this.seq.length < 4) yield null;
    this.phase = 'idle';
    yield 650;
    return this.seq.slice();
  }

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      const oy = SY + dy;
      g.clip(SX, oy, CW, CH, () => {
        g.clip(SX, oy, RX - SX - 4, CH, () => this.drawBox(g, oy));
        this.drawSide(g, oy);
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(HS_UI.title) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, HS_UI.title, { seed: 73 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  /** 左：チャイムの 箱（横から 見た 寄り）、4つの ボタンと、下に 高さの 段と 字。 */
  private drawBox(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    g.rect(SX, oy, W, CH, '#2E343C');
    // the box's face
    g.rect(SX + 6, oy + 14, W - 12, 78, BOX_DK);
    g.rect(SX + 8, oy + 16, W - 16, 74, BOX);
    g.rect(SX + 8, oy + 16, W - 16, 1, '#D8D4C8');
    const mic = this.phase === 'mic' || this.phase === 'pause';
    for (let i = 0; i < 4; i++) {
      const h = HS_BTN[i];
      const bx = BX0 + i * BGAP;
      const pressed = this.pressK === i && this.t - this.pressT < 220;
      const by = oy + 24 + (pressed ? 3 : 0);
      // the button: a round cap on a dark ring
      g.rect(bx - 1, oy + 23, BW + 2, 18, '#5A564C');
      g.rect(bx, by, BW, 14, mic ? '#8A867A' : BTN[i]);
      g.rect(bx + 2, by + 1, BW - 4, 2, '#FFFFFF', mic ? 0.15 : 0.45);
      // its steps under it: 1 to 4, rising (how high the note), and the word for the lowest and highest
      const sy = oy + 58;
      for (let s = 0; s <= h; s++) g.rect(bx + 2 + s * 7, sy - s * 5, 6, 6 + s * 5, mic ? '#6A665C' : STEP);
      g.rect(bx + 1, sy + 6, BW - 2, 1, INK);
      if (h === 0 || h === 3) g.text(h === 0 ? HS_UI.low : HS_UI.high, bx + 1, oy + 67, { color: INK });
      // the cursor
      if (this.phase === 'select' && i === this.cur && Math.floor(this.t / 300) % 2 === 0) {
        g.rect(bx + BW / 2 - 3, oy + 16, 7, 2, '#E23B2E');
        g.rect(bx + BW / 2 - 1, oy + 18, 3, 2, '#E23B2E');
      }
      if (this.phase === 'select' && i === this.cur) g.frame(bx - 2, oy + 22, BW + 4, 20, '#E23B2E');
      // a note flying up from the pressed one (the sound seen)
      if (this.pressK === i && this.t - this.pressT < 700 && !mic) {
        const u = (this.t - this.pressT) / 700;
        const nx = bx + BW / 2 + Math.round(u * 6);
        const ny = oy + 20 - Math.round(u * 16) - h * 2;
        g.rect(nx, ny, 3, 3, BTN[i], 1 - u);
        g.rect(nx + 2, ny - 7, 1, 7, BTN[i], 1 - u);
      }
    }
    if (mic) {
      const t = HS_UI.mic;
      const w = g.measure(t) + 10;
      g.rect(SX + W - w - 8, oy, w, 14, '#C8452E', 0.9);
      g.text(t, SX + W - w - 3, oy, { color: '#F4F1E8' });
    } else if (this.phase === 'select') g.text(HS_UI.keys, SX + 8, oy + CH - 18, { color: '#FFE7A3' });
  }

  /** 右：めあて（上り・下り と 字）、めあての 薄い 点、押した 順の 点（上がる・下がるが 目で 分かる）。 */
  private drawSide(g: Gfx, oy: number): void {
    g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
    const up = this.goal === 'up';
    g.text(up ? HS_UI.up : HS_UI.down, RX, oy + 2, { color: '#F4ECD8' });
    g.text(up ? HS_UI.upHint : HS_UI.downHint, RX, oy + 20, { color: '#8A84A0' });
    // the little graph: four columns, a dot per note at its height
    const gx = RX + 6;
    const gy = oy + 92;
    const col = (i: number) => gx + i * 22;
    const row = (h: number) => gy - h * 12;
    g.rect(gx - 4, gy + 6, 4 * 22 - 2, 1, '#5A5470');
    for (let i = 0; i < 4; i++) {
      const h = up ? i : 3 - i;
      g.rect(col(i), row(h), 6, 6, '#5A5470');
    }
    const s = this.seq;
    for (let i = 0; i < s.length; i++) {
      if (i > 0) g.line(col(i - 1) + 3, row(s[i - 1]) + 3, col(i) + 3, row(s[i]) + 3, '#FFE7A3');
    }
    for (let i = 0; i < s.length; i++) g.rect(col(i), row(s[i]), 6, 6, BTN[HS_BTN.indexOf(s[i])]);
  }
}

function* openPanel(p: Widget & { open: number }): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: Widget & { open: number; done: boolean }): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

const isUp = (s: number[]) => s.join() === '0,1,2,3';
const isDown = (s: number[]) => s.join() === '3,2,1,0';

let qaAuto = false;

/** 3〜5 チャイム：上り → 迷子の お知らせ → 下り。すんだ 所は flag に 残る（もどるで やめたら 続きから）。 */
function* chimeGame(): Co {
  const p = new ChimePanel();
  p.auto = qaAuto;
  try {
    yield* openPanel(p);
    if (!flag(HF.rule)) {
      setFlag(HF.rule, 1);
      yield* say3(T.HS_RULE);
    }
    if (!flag(HF.up)) {
      for (;;) {
        const s = yield* p.play('up');
        if (isUp(s)) break;
        yield* say(T.HS_UP_NG);
      }
      setFlag(HF.up, 1);
      yield* say(T.HS_UP_OK);
    }
    if (!flag(HF.maigo) && knWith()) {
      // 4 迷子の お知らせ（館じゅうの スピーカーへ）
      p.phase = 'mic';
      se('se_c3_aq_pa_open', { vol: 0.5 });
      yield 300;
      yield* say3(T.HS_MAIGO_1);
      // the pause before 「……わいや。」: しゅん's hand is free
      p.phase = 'pause';
      p.pushed = false;
      const t0 = p.t;
      while (p.t - t0 < 1800 && !p.pushed) yield null;
      p.phase = 'mic';
      if (p.pushed && !flag(HF.osuna)) {
        setFlag(HF.osuna, 1);
        yield* say3(T.HS_OSUNA);
      }
      yield* say3(T.HS_MAIGO_2);
      se('se_h_pa_close', { vol: 0.5 });
      setFlag(HF.maigo, 1);
      p.phase = 'idle';
      yield 300;
    }
    if (!flag(HF.down)) {
      yield* say(T.HS_DOWN_A);
      for (;;) {
        const s = yield* p.play('down');
        if (isDown(s)) break;
        yield* say(isUp(s) ? T.HS_DOWN_UP : T.HS_DOWN_NG);
      }
      setFlag(HF.down, 1);
      yield* say(T.HS_DOWN_OK);
    }
  } finally {
    yield* closePanel(p);
  }
}

// ================================================================ 台本

/** 入口の 戸（調べる。開いて いれば 暗転で 入る）。 */
registerScript('obj_hs_to', function* (): Co {
  const f = field();
  if (!f) return;
  if (openDoor()) {
    yield* f.warpCo(HOSO, IN_AT[0], IN_AT[1], 'up', 'se_door', IRIGUCHI);
    return;
  }
  se('se_examine');
  if (!hsOpen()) {
    yield* say3(T.HS_TO_SHIZUKA);
    return;
  }
  if (!flag(HF.pre)) {
    setFlag(HF.pre, 1);
    yield* say3(T.HS_TO_1);
    return;
  }
  se('se_door', { vol: 0.6 });
  yield* say3(T.HS_TO_OPEN);
  setFlag(HF.to, 1);
  setFlag(HF.start, 1);
  yield* f.warpCo(HOSO, IN_AT[0], IN_AT[1], 'up', 'se_door', IRIGUCHI);
});

/** 入口の 天井の スピーカー（aq.ts の 文の あとに）。 */
wrap('obj_c3_aq_speaker', function* (_ctx, orig): Co {
  if (inCh3() && hsDone()) {
    se('se_examine');
    yield* say3(T.HS_SPEAKER_DONE);
    return;
  }
  yield* orig();
  if (hsOpen() && !flag(HF.to) && !flag(HF.spk) && knWith()) {
    setFlag(HF.spk, 1);
    yield* say(T.HS_SPEAKER_KN);
  }
});

/** 1 ジー（入って すぐ、1回）。 */
registerScript('evt_hs_enter', function* (): Co {
  if (!inCh3() || flag(HF.inn) || !hsOpen()) return;
  setFlag(HF.inn, 1);
  yield 300;
  yield* say(T.HS_IN);
});

registerScript('obj_hs_harigami', function* (): Co {
  se('se_examine');
  yield* say3(T.HS_HARIGAMI);
});

/** 2 閉館の ご案内。 */
registerScript('obj_hs_tape', function* (): Co {
  se('se_examine');
  if (flag(HF.tape) || !hsOpen()) {
    yield* say3(T.HS_TAPE_AGAIN);
    return;
  }
  yield* say(T.HS_TAPE_A);
  yield* say3(T.HS_TAPE_PLAY);
  se('se_cursor', { vol: 0.6 });
  yield 400;
  se('se_c3_aq_pa_open', { vol: 0.5 });
  yield 300;
  yield* say3(T.HS_TAPE_VOICE);
  se('se_hs_kachi');
  setFlag(HF.tape, 1);
  yield 300;
  yield* say(T.HS_TAPE_B);
});

registerScript('obj_hs_tana', function* (): Co {
  se('se_examine');
  const n = flag(HF.tana);
  if (n >= T.HS_TANA.length) {
    yield* say3(T.HS_TANA_ALL);
    return;
  }
  setFlag(HF.tana, n + 1);
  yield* say3(T.HS_TANA[n]);
});

/** 3〜5 チャイムの 箱。 */
registerScript('obj_hs_chime', function* (): Co {
  se('se_examine');
  if (flag(HF.off)) {
    yield* say3(T.HS_CHIME_OFF);
    return;
  }
  if (flag(HF.down)) {
    yield* say3(T.HS_CHIME_SUMI);
    return;
  }
  if (!flag(HF.tape) || !hsOpen()) {
    yield* say3(T.HS_CHIME_MAE);
    return;
  }
  // (もどるで やめた あとは「すぐ やる／はじめから 聞く」：ui/closeup.ts の skipIntro、改善会議 10-26 の 3)
  if (!flag(HF.up) && !(yield* skipIntro(T.HS_HOWTO.id))) yield* say(T.HS_CHIME_A);
  yield* chimeGame();
});

/** 6 ジー が 止まる → 7 ごほうび。 */
registerScript('obj_hs_tsumami', function* (): Co {
  se('se_examine');
  if (flag(HF.off)) {
    yield* say3(T.HS_TSUMAMI_OFF);
    return;
  }
  if (!flag(HF.down) || !hsOpen()) {
    yield* say3(T.HS_TSUMAMI_MAE);
    if (flag(HF.tape) && knWith()) yield* say(T.HS_TSUMAMI_KN);
    return;
  }
  se('se_hs_off');
  setFlag(HF.off, 1);
  au('stopAmbient', 'amb_fluorescent', 1.2);
  yield* say3(T.HS_OFF);
  yield* say(T.HS_OFF_KN);
  if (flag('flag_oj_talk') && knWith() && !flag(HF.okujou)) {
    setFlag(HF.okujou, 1);
    yield* say(T.HS_OKUJOU_KN);
  }
  setFlag(HF.done, 1);
  addMp(2);
  se('se_item');
  yield* say3(T.HS_REWARD);
});

registerScript('obj_hs_mic', function* (): Co {
  se('se_examine');
  yield* say3(T.HS_MIC);
});
registerScript('obj_hs_isu', function* (): Co {
  se('se_examine');
  yield* say3(T.HS_ISU);
});

// ================================================================ S18・S25 の 館内放送の チャイム（音だけ）

/** S25（minna.ts）：放送の 前。済ませて いれば 上り 4音、ほかは 今の チャイム。 */
export function* hsPaBefore(): Co {
  if (hsDone()) {
    se('se_hs_pa_up');
    yield 1500;
    return;
  }
  se('se_c3_aq_pa_chime');
  yield 900;
}

/** S25（minna.ts）：放送の あと。済ませて いれば 下り 4音。 */
export function* hsPaAfter(): Co {
  if (!hsDone()) return;
  yield 300;
  se('se_hs_pa_down');
  yield 1700;
}

/** S18（aq.ts の 深海の 展示室の 放送）：済ませて いれば チャイムを 上り・下りに、あとに グソっ君 1行。 */
wrap('trig_ch3_shinkai_pa', function* (_ctx, orig): Co {
  if (!hsDone() || !inCh3() || flag('flag_c3_shinkai_pa')) {
    yield* orig();
    return;
  }
  setFlag('flag_c3_shinkai_pa', 1);
  yield* hsPaBefore();
  se('se_c3_aq_pa_open');
  yield 300;
  yield* say3(SHINKAI_PA);
  se('se_h_pa_close');
  yield* hsPaAfter();
  if (knWith() && !flag(HF.s18)) {
    setFlag(HF.s18, 1);
    yield* say(T.HS_S18_KN);
  }
});

// S25：回廊を 通る ハキコ（来た 人の 中に いる とき）の 吹き出し。済ませた ときだけ（表の 一覧には 出さない）
Object.defineProperty(S25_HITOKOTO, 'npc_c3_uketsuke', {
  get: () => (hsDone() ? T.HS_S25_HAKIKO : undefined),
  enumerable: false,
  configurable: true,
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.housou(step = 'to', auto = false)（auto：大写しを 自動で 押す）
 *   'to'     段階3、S15 の あと、入口の 北の 戸の 前 (5,2) 上向き（1回目 → 2回目で 開く）
 *   'spk'    同じ、スピーカーの 下 (12,2) 上向き
 *   'in'     戸が 開いた あと、放送室の 南の 戸の 上 (4,5)（入った ときの 1回）
 *   'tape'   入った あと、テープの 機械の 前 (4,3) 上向き
 *   'chime'  テープの あと、チャイムの 箱の 前 (6,3) 上向き
 *   'down'   上りと 迷子の お知らせの あと、(6,3) 上向き
 *   'off'    下りの あと、つまみの 前 (3,3) 上向き
 *   'done'   すんだ あと、入口の スピーカーの 下 (12,2) 上向き
 *   's18'    すんだ あと、深海の 展示室の 放送の 手前（S18 の 放送は まだ）
 *   'late'   S20 の あと、入口の 戸の 前（閉まった まま）
 */
if (import.meta.env.DEV) {
  registerDebug('housou', (step = 'to', auto = false) => {
    qaAuto = !!auto;
    cmd().jump?.('ch3:kairo', true);
    for (const id of Object.values(HF)) setFlag(id, 0);
    setFlag('flag_ch3_stage', 3);
    setFlag('flag_ch3_aq_enter', 1);
    setFlag('flag_ch3_tsugao1', 0);
    const go = (m: string, x: number, y: number, d: string) => {
      setTimeout(() => cmd().warp?.(m, x, y, d), 700);
      return cmd().warp?.(m, x, y, d);
    };
    if (step === 'to') return go(IRIGUCHI, TO_MAE[0], TO_MAE[1], 'up');
    if (step === 'spk') return go(IRIGUCHI, 12, 2, 'up');
    if (step === 'late') {
      setFlag('flag_ch3_tsugao1', 1);
      return go(IRIGUCHI, TO_MAE[0], TO_MAE[1], 'up');
    }
    setFlag(HF.pre, 1);
    setFlag(HF.to, 1);
    setFlag(HF.start, 1);
    if (step === 'in') return go(HOSO, IN_AT[0], IN_AT[1], 'up');
    setFlag(HF.inn, 1);
    if (step === 'tape') return go(HOSO, 4, 3, 'up');
    setFlag(HF.tape, 1);
    if (step === 'chime') return go(HOSO, 6, 3, 'up');
    setFlag(HF.rule, 1);
    setFlag(HF.up, 1);
    setFlag(HF.maigo, 1);
    if (step === 'down') return go(HOSO, 6, 3, 'up');
    setFlag(HF.down, 1);
    if (step === 'off') return go(HOSO, 3, 3, 'up');
    setFlag(HF.off, 1);
    setFlag(HF.done, 1);
    setFlag(HF.tana, 3);
    if (step === 's18') {
      setFlag('flag_c3_shinkai_pa', 0);
      return go('map_c3_aq_shinkai', 3, 5, 'up');
    }
    return go(IRIGUCHI, 12, 2, 'up');
  });

  registerDebug('hsState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(HF)) flags[k] = flag(id);
    const f = field();
    const p = game.ui.widgets.find((w) => w instanceof ChimePanel) as ChimePanel | undefined;
    return {
      flags,
      open: hsOpen(),
      door: openDoor(),
      panel: p ? { phase: p.phase, goal: p.goal, cur: p.cur, seq: p.seq.slice(), pushed: p.pushed } : null,
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px (names filled in); no 天丼; no clock time; no さん in the narration. */
export function hsTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '本日も、休館', 'おかわり、あるよ', 'もう 1杯', '暗くて しめった', 'いただき', '牛は、しゃべらん', '焼き芋 食うか', '蛍の光'];
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) return;
      let lines: string[] = [];
      let who = '';
      const flush = () => {
        if (!lines.length) return;
        pages++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
        lines = [];
      };
      for (const raw of fillNames(v).split('\n')) {
        const t = raw.trim();
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || !t) {
          flush();
          if (t.startsWith('@')) {
            who = t.slice(1);
            if (!SPEAKERS[who] && who !== 'narr' && who !== 'sys' && !who.includes(':')) bad.push(`${name}: speaker ${who}`);
          }
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        if (/\d+:\d\d/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('hs', T.HS_TEXTS);
  // the close-up's words: the right column, the keys under the box, the low / high under the steps
  const room = SX + CW - RX - 2;
  for (const l of [HS_UI.up, HS_UI.down, HS_UI.upHint, HS_UI.downHint]) if (measure(l) > room) bad.push(`ui: ${l}: ${measure(l)}px > ${room}`);
  if (measure(HS_UI.keys) > RX - SX - 16) bad.push(`ui keys: ${measure(HS_UI.keys)}px > ${RX - SX - 16}`);
  for (const l of [HS_UI.low, HS_UI.high]) if (measure(l) > BGAP - 2) bad.push(`ui: ${l}: ${measure(l)}px`);
  // the S25 bubble: each half short
  for (const part of T.HS_S25_HAKIKO.split('／')) if (measure(part) > 200) bad.push(`S25: ${part}: ${measure(part)}px`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('hsText', () => hsTextCheck());
