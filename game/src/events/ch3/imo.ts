// 急かすと、甘うならん（第3章の クリア前、段階3。げむきか 10/25 の 案3、2026-10-25 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_imo.ts、絵は art/props/imo_art.ts（焼き芋の 機械・新聞紙の 包み）、
// みました帳の ページは ui/menu/book_imo.ts。S21 の 1ページは souko.ts（flag_im_done の とき）。
//
//   S17 の あと（flag_ch3_diorama_done）から S19 の 決着の 前（flag_ch3_esa_done）まで、水槽の うらの 搬入口に
//   ヒロスケが いる 間（aq_ura.ts の hiroHere と 同じ 窓）。クリア後と S19 から 先は 足さない。
//   ・ヒロスケ（aqura_hiro / 台車 obj_aqura_daisha）：1回 話した あと（今の 台本。flag_im_talk）、もう 1回 話すと〔imo〕
//     （flag_im_start）。真水の 話を 聞いていなくても 2回目で 起きる。
//   ・焼き芋の 機械 obj_c3_ura_imoki（搬入口の わき (18–19,2)、(18,3)・(19,3) から 北向き）。調べると 地の文だけ。
//   ・大写し「焼き芋の 窓」ImoPanel：待つ 遊び。できるのは ←→ つまみ（「強」は ヒロスケが 止める。失敗に しない）、
//     ヒロスケの「……今じゃ。」の あと けってい（返す）、最後に けってい（竹串）。待つ ページは けっていで 1ページずつ。
//     待つ 間に 芋の 皮の 色と 湯気が 少しずつ 変わる。
//   ・すんだ あと（flag_im_done）：台車の 上に 新聞紙の 包み、機械は「ほんのり あたたかい」、S21 に 1ページ。
//   ・かくし：真水の 話（flag_aqura_hiro）→ 2 の あと 1行。「強」3回 → グソっ君と ヒロスケ（flag_im_kyou3）。
//     第2章の 野菜の 配達（flag_ch2_delivery）→ 4 の あと 1行。
//
// QA：__game.cmd.imo(step, auto)、imState()、imText()

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
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import type { Howto } from '../../ui/closeup';
import { skipIntro } from '../../ui/closeup';
import * as T from '../../data/text/c3_imo';
import { IM_UI } from '../../data/text/c3_imo';
import { addMp, grace } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, inCh3, say3 } from './common';

export const IMF = {
  talk: 'flag_im_talk',
  start: 'flag_im_start',
  cook: 'flag_im_cook',
  kyou: 'flag_im_kyou',
  kyou3: 'flag_im_kyou3',
  done: 'flag_im_done',
} as const;

const URA = 'map_c3_aq_ura';
const HIRO = 'aqura_hiro';

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function dropKn(text: string): string {
  if (knWith()) return text;
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = dropKn(text);
  if (!t.trim()) return -1;
  return yield* say3(t);
}

/** ヒロスケが 搬入口に いる 間（aq_ura.ts の hiroHere と 同じ：段階3、S17 の あと 〜 S19 の 決着の 前、S20 の 前）。 */
export function imOpen(): boolean {
  return (
    inCh3() &&
    !pgOn() &&
    flag('flag_ch3_stage') === 3 &&
    flag('flag_ch3_aq_enter') > 0 &&
    !flag('flag_ch3_tsugao1') &&
    !flag('flag_ch3_clear') &&
    flag('flag_ch3_diorama_done') > 0 &&
    !flag('flag_ch3_esa_done') &&
    field()?.map.id === URA
  );
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

// ================================================================ 地図の 物

addToMap(URA, [
  // the little sweet-potato machine by the loading door (18–19,2), on the floor that was bare
  { t: 'prop', id: 'prop_im_imoki_at', prop: 'prop_im_imoki', x: 18, y: 2, solid: [0, 0, 2, 1] } as unknown as MapObj,
  { t: 'obj', id: 'obj_c3_ura_imoki', x: 18, y: 2, w: 2, face: 'up', script: 'obj_c3_ura_imoki' } as unknown as MapObj,
  // the third one, wrapped in newspaper on the cart (after 〔imo〕, while ヒロスケ is there)
  { t: 'prop', id: 'prop_im_tsutsumi_at', prop: 'prop_im_tsutsumi', x: 22, y: 2, cond: { when: () => flag(IMF.done) > 0 && !flag('flag_ch3_esa_done') } } as unknown as MapObj,
]);

// ================================================================ 大写し「焼き芋の 窓」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 214;
const STEP_Y = 48;
const KEYS_Y = 96;

type Phase = 'idle' | 'wait' | 'kaesu' | 'kushi' | 'end';

/** 1色を もう 1色へ（0〜1）。 */
function lerpCol(a: string, b: string, k: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * Math.max(0, Math.min(1, k)));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

export class ImoPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** やり方の カード（ui/closeup.ts。はじめての 1回）。 */
  howto: Howto = IM_UI.howto;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：auto の とき「強」に 3回 回す。 */
  autoKyou = false;
  phase: Phase = 'idle';
  /** 焼け具合（0 生 〜 1 焼けた）。待つ 間だけ 進む。 */
  cook = 0;
  /** 返した（皮の 焼け目が 入れかわる）。 */
  flipped = false;
  /** 竹串が 刺さった。 */
  stabbed = false;
  /** 右の 列の 段（0 待つ・1 返す・2 串・3 すんだ）。 */
  step = 0;
  /** つまみ（0 弱・1 中・2 強）と、絵の つまみ（なめらかに 追う）。 */
  knob = 0;
  knobShown = 0;
  /** 「強」に した 回数と、まだ 台本が 見ていない「強」。 */
  kyouN = 0;
  kyouEvt = false;
  /** 「強」から もどる 間（ms）。 */
  private back = 0;
  private flipAnim = 0;
  private autoT = 0;
  /** けってい（返す・刺す）。 */
  hit = false;

  update(dt: number, input: Input): void {
    this.t += dt;
    this.flipAnim = Math.max(0, this.flipAnim - dt);
    this.knobShown += (this.knob - this.knobShown) * Math.min(1, dt / (this.back > 0 ? 160 : 90));
    if (this.back > 0) {
      this.back -= dt;
      if (this.back <= 0) this.knob = 0;
    }
    if (this.phase === 'idle' || this.phase === 'end') return;
    let l = false;
    let r = false;
    let ok = false;
    if (this.auto) {
      this.autoT += dt;
      const tick = Math.floor(this.autoT / 300) !== Math.floor((this.autoT - dt) / 300);
      if (tick) {
        if (this.phase === 'wait' && this.autoKyou && this.kyouN < 3 && !this.kyouEvt && this.back <= 0) r = true;
        else if (this.phase === 'kaesu' || this.phase === 'kushi') ok = true;
      }
    } else {
      l = input.pressed('left');
      r = input.pressed('right');
      ok = input.pressed('confirm');
    }
    if (this.phase === 'wait' && this.back <= 0 && !this.kyouEvt) {
      if (r && this.knob < 2) {
        this.knob++;
        se('se_cursor', { vol: 0.35, pitch: 0.8 + this.knob * 0.15 });
        if (this.knob === 2) {
          // 「強」：ヒロスケが 止める（失敗に しない。つまみは「弱」に もどる）
          this.kyouN++;
          this.kyouEvt = true;
          this.back = 520;
        }
      } else if (l && this.knob > 0) {
        this.knob--;
        se('se_cursor', { vol: 0.3, pitch: 0.8 + this.knob * 0.15 });
      }
    }
    if ((this.phase === 'kaesu' || this.phase === 'kushi') && ok) this.hit = true;
  }

  /** 返す 絵。 */
  flip(): void {
    this.flipped = !this.flipped;
    this.flipAnim = 360;
  }

  /** 芋 1本（cx,cy：まん中。両はしが 細い 紡錘形。焼け目は 返すと 入れかわる）。 */
  private imo(g: Gfx, cx: number, cy: number, i: number): void {
    const c = this.cook;
    const lift = this.flipAnim > 0 ? Math.round(Math.sin(((360 - this.flipAnim) / 360) * Math.PI) * 6) : 0;
    const y0 = cy - lift;
    // raw: a bright purple-red skin; cooked: deep, dark red, browned where it lay on the stones
    const skin = lerpCol('#9A2E58', '#5E1A2C', c);
    const skinLt = lerpCol('#C2507A', '#8A3444', c);
    const skinDk = lerpCol('#6A1E40', '#3A0E18', c);
    const rx = 27 - (i % 2) * 3;
    const ry = 10 - (i % 2);
    const bend = i === 1 ? -1 : 1;
    for (let x = -rx; x <= rx; x++) {
      const u = x / rx;
      const hh = Math.max(1, Math.round(ry * Math.pow(Math.max(0, 1 - u * u), 0.75)));
      const yc = y0 + Math.round(bend * u * u * 3);
      g.rect(cx + x, yc - hh, 1, hh * 2, skin);
      g.rect(cx + x, yc - hh, 1, Math.max(1, Math.round(hh * 0.5)), skinLt);
      g.rect(cx + x, yc + hh - 2, 1, 2, skinDk);
    }
    // the root ends
    g.rect(cx - rx - 4, y0 + bend * 3, 5, 1, '#6A4A3A');
    g.rect(cx + rx, y0 + bend * 3 - 1, 4, 1, '#6A4A3A');
    // the browned patches: more as it cooks, on the side that faced the stones (the flip swaps them)
    const side = this.flipped ? 1 : 0;
    const n = Math.floor(c * 10);
    for (let k = 0; k < n; k++) {
      const s = (k * 37 + i * 11 + side * 5) % 29;
      const bx = cx - rx + 6 + ((s * 7) % (rx * 2 - 12));
      const by = y0 - 4 + ((s * 5) % 9);
      g.rect(bx, by, 4 + (k % 2), 2, lerpCol('#4A1222', '#20080C', c), 0.85);
    }
    // the shine on top, then the honey seeping out where the skin parts (at the end)
    g.rect(cx - 10, y0 - ry + 2, 14, 1, '#F8DCE4', 0.45 - 0.15 * c);
    if (c > 0.8) {
      const a = Math.min(1, (c - 0.8) / 0.2);
      for (const ox of [-rx + 7, rx - 9]) {
        g.rect(cx + ox, y0 + 3, 3, 4, '#E89A2A', a);
        g.px(cx + ox + 1, y0 + 3, '#FFE0A0');
      }
      g.rect(cx - 4, y0 - 3, 8, 1, '#F4B850', 0.7 * a);
    }
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
        const SW = RX - SX - 4;
        g.clip(SX, oy, SW, CH, () => this.drawScene(g, SX, oy, SW));
        this.drawSide(g, oy);
      });
      const tw = g.measure(IM_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, IM_UI.place, { seed: 79 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, x0: number, oy: number, w: number): void {
    // the machine's steel round the little window
    g.rect(x0, oy, w, CH, '#7A7E86');
    g.rect(x0, oy, w, 3, '#9A9EA6');
    // the window: the inside, warm with the heat (a little redder while the knob is up)
    const heat = 0.55 + 0.25 * this.cook + 0.25 * (this.knobShown / 2);
    const wx = x0 + 8;
    const wy = oy + 8;
    const ww = w - 16;
    const wh = CH - 16;
    g.rect(wx - 2, wy - 2, ww + 4, wh + 4, '#3A3E46');
    g.rect(wx, wy, ww, wh, lerpCol('#3A2420', '#8A3E1E', heat));
    g.alpha(0.25 + 0.2 * heat, () => g.rect(wx, wy + wh - 30, ww, 30, '#F29A3A'));
    // the electric heater along the top (no flame in the old aquarium): it glows more with the knob up
    const hot = lerpCol('#7A3A2A', '#FF7A3A', 0.4 + 0.3 * (this.knobShown / 2) + 0.1 * Math.sin(this.t / 400));
    g.rect(wx + 4, wy + 5, ww - 8, 2, hot);
    for (let i = 0; i < ww - 8; i += 6) g.rect(wx + 4 + i, wy + 7, 3, 1, hot);
    g.alpha(0.12 + 0.12 * (this.knobShown / 2), () => g.rect(wx, wy, ww, 18, '#F28A3A'));
    // the stones in the drawer (lit from below, orange on their tops)
    for (let i = 0; i < 26; i++) {
      const sx = wx + 4 + ((i * 23) % (ww - 8));
      const sy = wy + wh - 12 + ((i * 7) % 8);
      const r = 3 + (i % 3);
      g.circle(sx, sy, r, i % 2 ? '#6A6058' : '#7A6E64');
      g.rect(sx - 1, sy - r + 1, 2, 1, lerpCol('#A89888', '#FFC078', heat));
    }
    // three sweet potatoes on the stones
    for (let i = 0; i < 3; i++) this.imo(g, wx + 34 + i * 62, wy + wh - 24 - (i % 2) * 2, i);
    // the steam: more and whiter the longer it waits (it never boils over)
    const n = 3 + Math.floor(this.cook * 9);
    for (let i = 0; i < n; i++) {
      const u = (this.t / 2200 + i / n) % 1;
      const sx = wx + 22 + ((i * 53) % (ww - 44)) + Math.round(Math.sin(this.t / 520 + i * 1.7) * (3 + u * 6));
      const sy = wy + wh - 34 - Math.round(u * (wh - 40));
      const r = 3 + Math.round(u * 4);
      const a = (0.18 + 0.4 * this.cook) * Math.sin(Math.min(1, u * 1.2) * Math.PI);
      g.alpha(Math.max(0, a), () => {
        g.circle(sx, sy, r, '#F4F0E8');
        g.circle(sx + 1, sy - 1, Math.max(1, r - 2), '#FFFFFF');
      });
    }
    // the glass's shine
    g.rect(wx + 6, wy + 2, ww - 12, 1, '#F4F6F8', 0.35);
    g.rect(wx + 4, wy + 4, 1, wh - 20, '#F4F6F8', 0.25);
    // the bamboo skewer, going into the middle one
    if (this.phase === 'kushi' || this.stabbed) {
      const mx = wx + 34 + 62;
      // its tip: above the potato, then down into it
      const tip = this.stabbed ? wy + wh - 22 : wy + wh - 42 + Math.round(Math.sin(this.t / 300) * 2);
      g.rect(mx, tip - 40, 2, 40, '#D8C080');
      g.rect(mx, tip - 40, 2, 3, '#B89850');
      g.px(mx, tip, '#E8D8A0');
    }
  }

  private drawSide(g: Gfx, oy: number): void {
    const x = RX - 4;
    const w = SX + CW - RX + 4;
    g.rect(x, oy, w, CH, '#2A2236');
    // the knob: its name, a dial (the pointer where it is turned), then 弱 中 強 in a row
    g.text(IM_UI.knobLabel, RX, oy + 4, { color: '#F4ECD8' });
    const cx = RX + 9;
    const cy = oy + 33;
    g.circle(cx, cy, 10, '#4A4E58');
    g.circle(cx, cy, 8, '#8A8E98');
    const ang = (-150 + this.knobShown * 60) * (Math.PI / 180);
    for (let r = 0; r < 8; r++) g.px(cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r), '#2A2236');
    IM_UI.knob.forEach((l, i) => {
      const on = this.knob === i && !(i === 2 && this.back > 0);
      const col = i === 2 ? (this.back > 0 ? '#F07060' : '#B89090') : on ? '#FFE7A3' : '#8A84A0';
      g.text(l, RX + 26 + i * 26, oy + 26, { color: col });
    });
    // the steps: 待つ → 返す → 串
    const ph = this.step;
    IM_UI.steps.forEach((s, i) => {
      g.text(s, RX, oy + STEP_Y + i * 16, { color: i === ph ? '#FFE7A3' : i < ph ? '#6A6480' : '#C8C0D8' });
    });
    const key = this.phase === 'wait' ? IM_UI.keys.wait : this.phase === 'kaesu' ? IM_UI.keys.kaesu : this.phase === 'kushi' ? IM_UI.keys.kushi : '';
    if (key) g.text(key, RX, oy + KEYS_Y, { color: '#FFE7A3' });
    markText(x, oy, w, CH);
  }
}

function* openPanel(p: ImoPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: ImoPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaKyou = false;
/** 待つ 1回の 長さ（ms）。QA の auto は 短く。 */
const waitMs = (): number => (qaAuto ? 900 : 3600);

/** 待つ（cook を to まで）。「強」は その つど ヒロスケが 止める。 */
function* waitCook(p: ImoPanel, to: number): Co {
  p.phase = 'wait';
  const from = p.cook;
  const ms = waitMs();
  let el = 0;
  let last = game.time;
  while (el < ms) {
    yield null;
    const now = game.time;
    const d = Math.min(100, Math.max(0, now - last));
    last = now;
    if (p.kyouEvt) {
      p.phase = 'idle';
      setFlag(IMF.kyou, p.kyouN);
      se('se_emote', { vol: 0.4 });
      if (p.kyouN === 1) yield* say3(T.IM_KYOU);
      else yield 520;
      if (p.kyouN >= 3 && !flag(IMF.kyou3)) {
        setFlag(IMF.kyou3, 1);
        yield* say(T.IM_KYOU3);
      }
      p.kyouEvt = false;
      p.phase = 'wait';
      last = game.time;
      continue;
    }
    el += d;
    p.cook = from + (to - from) * Math.min(1, el / ms);
  }
  p.cook = to;
  p.phase = 'idle';
}

/** けっていを 待つ（返す・刺す）。 */
function* waitHit(p: ImoPanel, ph: 'kaesu' | 'kushi'): Co {
  p.hit = false;
  p.phase = ph;
  while (!p.hit) yield null;
  p.hit = false;
  p.phase = 'idle';
}

/** 1〜6。 */
function* imo(): Co {
  setFlag(IMF.start, 1);
  const f = field();
  const h = f?.actorById(HIRO);
  if (h) {
    h.data.scripted = true;
    h.dir = 'left';
  }
  try {
    // もどるで やめた あと（改善会議 10-26 の 3）：「すぐ やる」なら 前置きを とばして 焼き始めから
    const skip = yield* skipIntro(IM_UI.howto.id);
    if (!skip) yield* say(T.IM_A);
    const p = new ImoPanel();
    p.auto = qaAuto;
    p.autoKyou = qaKyou;
    try {
      yield* openPanel(p);
      setFlag(IMF.cook, 1);
      se('se_examine', { vol: 0.4 });
      if (!skip) {
        yield* say3(T.IM_NARABE);
        yield* say(T.IM_B);
        if (flag('flag_aqura_hiro')) yield* say3(T.IM_MAMIZU);
      }
      // 3 待つ → 1ページ → 待つ →「今じゃ」返す → 待つ → 3ページ → 待つ → 串
      yield* waitCook(p, 0.3);
      yield* say3(T.IM_MATSU_1);
      yield* waitCook(p, 0.5);
      yield* say3(T.IM_IMA);
      p.step = 1;
      yield* waitHit(p, 'kaesu');
      p.flip();
      se('se_c3_kosogeru', { vol: 0.25, pitch: 1.2 });
      yield 380;
      yield* say3(T.IM_KAESU);
      p.step = 0;
      yield* waitCook(p, 0.75);
      yield* say(T.IM_MATSU_2);
      yield* waitCook(p, 1);
      yield* say3(T.IM_KUSHI);
      p.step = 2;
      yield* waitHit(p, 'kushi');
      p.stabbed = true;
      se('se_kotei_snip', { vol: 0.3, pitch: 0.7 });
      yield 400;
      p.step = 3;
      yield* say3(T.IM_SUTTO);
      p.phase = 'end';
      yield 300;
      // 4 3本
      yield* say(T.IM_SANBON);
    } finally {
      yield* closePanel(p);
      setFlag(IMF.cook, 0);
    }
    setFlag(IMF.done, 1);
    f?.refreshPresence?.();
    se('se_page', { vol: 0.4 });
    yield* say(T.IM_OITOKU);
    if (flag('flag_ch2_delivery')) yield* say3(T.IM_MURA);
    // 5 待ったぶんだけ
    if (h) h.dir = f!.player.x < h.x ? 'left' : 'down';
    yield* say(T.IM_C);
    if (h) h.dir = 'up';
    // 6 ごほうび
    addMp(2);
    se('se_item');
    yield* say3(T.IM_REWARD);
  } finally {
    if (h) {
      h.dir = 'up';
      delete h.data.scripted;
    }
    grace();
  }
}

/** ヒロスケ（話す・台車）：1回 話した あとの 2回目に〔imo〕。それ 以外は 今の 台本。 */
function* hiroImo(orig: () => Co): Co {
  if (!imOpen() || flag(IMF.done)) {
    yield* orig();
    return;
  }
  // (もどるで やめた あとは、話しかけ直すと 最初から)
  if (!flag(IMF.talk) && !flag(IMF.start)) {
    yield* orig();
    if (imOpen()) setFlag(IMF.talk, 1);
    return;
  }
  yield* imo();
}

wrap(HIRO, function* (_ctx, orig): Co {
  yield* hiroImo(orig);
});

wrap('obj_aqura_t', function* (ctx, orig): Co {
  if (ctx.source === 'obj_aqura_daisha' && imOpen()) {
    yield* hiroImo(orig);
    return;
  }
  yield* orig();
});

/** 焼き芋の 機械。 */
registerScript('obj_c3_ura_imoki', function* (): Co {
  se('se_examine');
  yield* say3(flag(IMF.done) ? T.IM_IMOKI_AFTER : T.IM_IMOKI);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.imo(step = 'hiro', auto = false)（段階3、S17 の あと、水槽の うら）
 *   'hiro0'  1回目（今の 台本）から、搬入口の ヒロスケの 前 (21,3) 上向き
 *   'hiro'   1回 話した あと、ヒロスケの 前（話すと〔imo〕）
 *   'kyou'   auto で「強」に 3回、かくし 3つ（真水の 話・配達）も 立てて ヒロスケの 前
 *   'imoki'  機械の 前 (18,3) 上向き（すむ 前）
 *   'after'  すんだ あと、機械の 前
 */
if (import.meta.env.DEV) {
  registerDebug('imo', (step = 'hiro', auto = false) => {
    cmd().aqura?.('hiro');
    for (const id of Object.values(IMF)) setFlag(id, 0);
    setFlag('flag_aqura_hiro', 0);
    setFlag('flag_ch2_delivery', 0);
    qaAuto = !!auto || step === 'kyou';
    qaKyou = step === 'kyou';
    const go = (x: number, y: number, d: string) => cmd().warp?.(URA, x, y, d);
    if (step === 'hiro0') return go(21, 3, 'up');
    setFlag(IMF.talk, 1);
    if (step === 'kyou') {
      setFlag('flag_aqura_hiro', 1);
      setFlag('flag_ch2_delivery', 1);
    }
    if (step === 'hiro' || step === 'kyou') return go(21, 3, 'up');
    if (step === 'imoki') return go(18, 3, 'up');
    setFlag(IMF.start, 1);
    setFlag(IMF.done, 1);
    return go(18, 3, 'up');
  });

  registerDebug('imState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(IMF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof ImoPanel) as ImoPanel | undefined;
    return { flags, open: imOpen(), map: field()?.map.id, panel: p ? { phase: p.phase, cook: Math.round(p.cook * 100) / 100, knob: p.knob, kyouN: p.kyouN, flipped: p.flipped, stabbed: p.stabbed } : null };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼 nor 「まだ」; no clock time; the names without さん in the narration. */
export function imTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '焼き芋 食うか', 'ども！', 'わはは', 'まだ', '飼育係', '係長', '1つだけ', 'えさ', '℃', '酵素', 'おかわり', 'もう 1杯', 'さすが 師匠'];
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
      for (const raw of v.split('\n')) {
        const t = raw.trim();
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || !t) {
          flush();
          if (t.startsWith('@')) who = t.slice(1);
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        if (/\d+:\d\d/.test(plain) || /\d+時/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('im', T.IM_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...Object.values(IM_UI.keys), IM_UI.knobLabel]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  if (26 + 52 + measure(IM_UI.knob[2]) > col) bad.push('右の 列: 弱 中 強 が はみ出す');
  if (STEP_Y + 16 * IM_UI.steps.length > KEYS_Y) bad.push('右の 列: 段が 操作の 行に かかる');
  if (KEYS_Y + 14 > CH) bad.push(`keys: bottom ${KEYS_Y + 14} > ${CH}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('imText', () => imTextCheck());
