// ええ 色の わけ（第2章。げむきか 10/16 やり直しの 案5、2026-10-16 依頼主の 採用。02_ch2_index #103）。
// 文は data/text/hoshi_iro.ts、みました帳の ページは ui/menu/book_iro.ts、びんと かめの 絵は art/props/hoshi_room_c.ts
// （prop_hr_obj の v 'myoga'・'umekame'）、置き場所は data/maps/hoshi_rooms2.ts（区長の 家）。
//
//   段階0〜2（寄り合いの あと）。「第2章から」でも 全部 遊べる。グソっ君が いなくても 進む（グソっ君の 台詞は 抜く）。
//   ・集会所の ぴょん夫人：お茶を 1回 飲んでから、次の お茶の あと → 1 紫の ナス（flag_ir_nasu）。
//     （グソっ君の はじめて帳〔漬物〕が その 回に 出る ときは 出さない：次の お茶で。あちらの 文は 変えない）
//   ・区長の 家の 漬物の おけ obj_hr_kucho_tsukemono (1,5)：今の 文の あと → 2 さびた 釘（item_ir_kugi、flag_ir_kugi）。
//     先に 額の 写真 obj_hr_kucho_yuki を 見ていれば グソっ君の 1行（flag_ir_yuki_seen）。
//   ・集会所の ハモ区長に 話す → 3 遺憾ながら → 4 色止め（flag_ir_ikan）→ 5 色あわせ（大写し「漬物の 色」）
//     → 6 さびた もん → 7 朱肉 +2、釘は おけへ（大事なものから 外す）、みました帳②の すみ（flag_ir_done）。
//     大写しを やめたら、ぴょん夫人か 区長に 話すと 続き。まちがいは flag_ir_miss（0 で そろえると『ええ 目』）。
//   ・かくし：段階2 に 6 まで すませる → ゆきの 釘（flag_ir_yuki_page。帳面に もう 1ページ）。
//     野菜の 配達で ぴょん夫人に きゅうりを 運んだ → 色あわせの あと 1ページ。
//   ・クリア後の 夜（段階は h1）：ぴょん夫人と 区長は クリア後の 会話が 包むので、iro_pg.ts が その 上から 先に 呼ぶ。
//
// QA：__game.cmd.iro(step, auto, stage)、irState()、irText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_iro';
import { IR_UI } from '../../data/text/hoshi_iro';
import { hajimeteDone } from '../../data/text/hajimete';
import { addMp, getKeyItem, giveKey } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { ch2Open, hStage, lanternOn } from './common';
import { DF } from './dome';

export const IF = {
  nasu: 'flag_ir_nasu',
  kugi: 'flag_ir_kugi',
  ikan: 'flag_ir_ikan',
  awase: 'flag_ir_awase',
  done: 'flag_ir_done',
  miss: 'flag_ir_miss',
  eeme: 'flag_ir_eeme',
  yukiSeen: 'flag_ir_yuki_seen',
  yukiPage: 'flag_ir_yuki_page',
  yoshieAfter: 'flag_ir_yoshie_after',
  kuchoAfter: 'flag_ir_kucho_after',
} as const;

const SCHOOL = 'map_hoshi_school';

function kanenariHere(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

/** グソっ君の いない ときは、その 人の 段を 抜く（台詞は ほかの 人だけで 進む）。 */
function dropKn(text: string): string {
  if (kanenariHere()) return text;
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = dropKn(text);
  if (!t.trim()) return 0;
  return yield* runMsg(t);
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 寄り道が 開いている：段階0〜2、寄り合いの あと（クリア後の 夜も：ch2Open）。 */
function open(): boolean {
  return hStage() <= 2 && ch2Open() && flag('flag_ch2_yoriai') > 0;
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

// ================================================================ 大写し「漬物の 色」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（札と ボタン）。 */
const RX = SX + 218;
/** 皿・欄の 幅と 中心。 */
const SLOT_W = 64;
const SLOT_H = 30;
const PLATE_X = [SX + 4 + SLOT_W / 2, SX + 4 + SLOT_W * 1.5 + 8, SX + 4 + SLOT_W * 2.5 + 16];
const PLATE_Y = SY + 30;
const SLOT_Y = SY + 48;
const NAME_Y = SY + 82;
const KEYS_Y = 62;
/** 札の 並び（右の 列の 上から）：赤じそ・さびた 釘・お酢。正しいのは 皿 i に 札 i。 */
const ORDER = [2, 0, 1];

/** 楕円（横長）を 1行ずつ。 */
function ell(g: Gfx, cx: number, cy: number, rx: number, ry: number, color: string, a = 1): void {
  for (let dy = -ry; dy <= ry; dy++) {
    const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    if (h > 0) g.rect(Math.round(cx - h), Math.round(cy + dy), h * 2, 1, color, a);
  }
}

/** 札の 絵（12×12 を k 倍）：0 さびた 釘、1 お酢の びん、2 赤じその 葉。 */
function cardIcon(g: Gfx, i: number, x: number, y: number, k = 1): void {
  const r = (dx: number, dy: number, w: number, h: number, c: string) => g.rect(x + dx * k, y + dy * k, w * k, h * k, c);
  if (i === 0) {
    r(1, 3, 2, 6, '#5A3424');
    r(3, 5, 8, 2, '#8A4A2A');
    r(11, 6, 1, 1, '#8A4A2A');
    r(5, 5, 1, 1, '#C86A3A');
    r(8, 6, 1, 1, '#C86A3A');
    r(3, 6, 2, 1, '#6A3A24');
  } else if (i === 1) {
    r(5, 0, 2, 2, '#C8A040');
    r(4, 2, 4, 2, '#E8E4D0');
    r(3, 4, 6, 8, '#E8E4D0');
    r(3, 6, 6, 3, '#D9483A');
    r(4, 9, 4, 2, '#F4F0E0');
  } else {
    r(2, 3, 8, 6, '#7A2A48');
    r(3, 2, 6, 1, '#7A2A48');
    r(3, 9, 6, 1, '#7A2A48');
    r(4, 1, 4, 1, '#9A3A5A');
    r(6, 2, 1, 8, '#C85A7A');
    r(6, 10, 1, 2, '#5A7A3A');
  }
}

export class AwasePanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  result: string | null = null;
  active = false;
  /** 右の 列の カーソル（ORDER の 何番目）。 */
  sel = 0;
  /** 今 札を 置く 皿。 */
  plate = 0;
  placed: boolean[] = [false, false, false];
  shakeT = 0;
  /** 段階1（トマトの 灯り）：ナスの 紫に 橙の ふち。 */
  orange = false;
  autoT = 0;
  private ePress = false;
  private eCancel = false;

  free(i: number): boolean {
    return !this.placed[ORDER[i]];
  }
  /** 次の 置ける 札へ（d = ±1）。 */
  step(d: number): void {
    for (let k = 1; k <= 3; k++) {
      const n = (this.sel + d * k + 9) % 3;
      if (this.free(n)) {
        this.sel = n;
        return;
      }
    }
  }
  firstFree(): void {
    if (!this.free(this.sel)) this.step(1);
  }
  /** 選んで いる 札（0 釘・1 お酢・2 赤じそ）。 */
  card(): number {
    return ORDER[this.sel];
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    if (input.pressed('confirm')) this.ePress = true;
    if (input.pressed('cancel')) this.eCancel = true;
    if (!this.active || this.result) return;
    if (this.eCancel) {
      this.eCancel = false;
      this.result = 'cancel';
      return;
    }
    if (this.auto) {
      this.autoT += dt;
      if (this.autoT < 320) return;
      this.autoT = 0;
      if (this.card() !== this.plate) {
        this.step(1);
        se('se_cursor', { vol: 0.4 });
      } else this.result = 'card';
      return;
    }
    if (input.repeat('up') || input.repeat('left')) {
      this.step(-1);
      se('se_cursor', { vol: 0.4 });
    } else if (input.repeat('down') || input.repeat('right')) {
      this.step(1);
      se('se_cursor', { vol: 0.4 });
    } else if (this.ePress) {
      this.ePress = false;
      this.result = 'card';
    }
  }

  clearInput(): void {
    this.ePress = false;
    this.eCancel = false;
  }

  private drawPlate(g: Gfx, i: number, cx: number, cy: number): void {
    // the little plate: white, a blue line round its rim
    ell(g, cx, cy + 2, 27, 9, '#1E1822', 0.5);
    ell(g, cx, cy, 26, 9, '#E8E4DC');
    ell(g, cx, cy, 22, 7, '#F8F4EC');
    ell(g, cx, cy, 18, 5, '#ECE6DA');
    if (i === 0) {
      // ナス：皮の 紫が 外に、切り口は 淡い 黄緑
      for (const [dx, dy] of [[-10, 0], [-3, -2], [4, 1], [11, -1]] as const) {
        if (this.orange) ell(g, cx + dx, cy + dy, 6, 4, '#F28A3A');
        ell(g, cx + dx, cy + dy, 5, 3, '#5E2A7A');
        ell(g, cx + dx, cy + dy, 3, 2, '#C8C890');
        g.px(cx + dx - 1, cy + dy - 2, '#8A5AA8');
      }
    } else if (i === 1) {
      // みょうが：うす桃色の つぼみ、すじが 濃い 桃色
      for (const [dx, dy] of [[-9, 0], [-1, -1], [8, 1]] as const) {
        ell(g, cx + dx, cy + dy, 3, 4, '#F59AB0');
        g.rect(cx + dx, cy + dy - 3, 1, 7, '#E0567A');
        g.px(cx + dx - 1, cy + dy - 3, '#FFD8E0');
      }
    } else {
      // 梅干し：赤い 丸、しわと 光
      for (const [dx, dy] of [[-8, 0], [1, -1], [9, 1]] as const) {
        g.circle(cx + dx, cy + dy, 4, '#B8242E');
        g.circle(cx + dx, cy + dy, 3, '#D83A3A');
        g.px(cx + dx - 1, cy + dy - 2, '#FFB0A0');
        g.px(cx + dx + 1, cy + dy + 1, '#8A1A24');
      }
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
      g.clip(SX, SY + dy, CW, CH, () => {
        const oy = SY + dy;
        // the table in the gathering room, the lamp's warm light
        g.rect(SX, oy, RX - SX - 4, CH, '#4A3A2E');
        g.rect(SX, oy, RX - SX - 4, 6, '#3A2C22');
        g.alpha(0.14, () => g.circle(SX + 106, oy + 30, 80, '#FFB070'));
        if (this.orange) g.alpha(0.1, () => g.circle(PLATE_X[0], oy + 26, 30, '#F28A3A'));
        for (let i = 0; i < 3; i++) {
          const cx = PLATE_X[i];
          this.drawPlate(g, i, cx, PLATE_Y + dy);
          // the card's place under the plate
          const sh = this.shakeT > 0 && i === this.plate ? Math.round(Math.sin(this.t / 30) * 2) : 0;
          const sx = cx - SLOT_W / 2 + sh;
          const sy = SLOT_Y + dy;
          const cur = this.active && i === this.plate && !this.placed[i];
          if (this.placed[i]) {
            g.rect(sx + 6, sy, SLOT_W - 12, SLOT_H, '#F4ECD8');
            g.frame(sx + 6, sy, SLOT_W - 12, SLOT_H, '#B8A888');
            cardIcon(g, i, Math.round(cx - 12), sy + 3, 2);
          } else {
            const c = cur ? (Math.floor(this.t / 400) % 2 ? '#FFE7A3' : '#C8B070') : '#7A6A58';
            for (let x = sx + 6; x < sx + SLOT_W - 6; x += 4) {
              g.rect(x, sy, 2, 1, c);
              g.rect(x, sy + SLOT_H - 1, 2, 1, c);
            }
            for (let y = sy; y < sy + SLOT_H; y += 4) {
              g.rect(sx + 6, y, 1, 2, c);
              g.rect(sx + SLOT_W - 7, y, 1, 2, c);
            }
            if (cur && this.shakeT <= 0) g.alpha(0.35, () => cardIcon(g, this.card(), Math.round(cx - 12), sy + 3, 2));
          }
          g.text(IR_UI.plates[i], cx, NAME_Y + dy, { color: this.placed[i] ? '#FFE7A3' : UI.bg2, align: 'center' });
        }
        // the right column: the three cards, then the keys
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        for (let n = 0; n < 3; n++) {
          const c = ORDER[n];
          const yy = oy + 4 + n * 18;
          const used = this.placed[c];
          if (this.active && n === this.sel && !used) g.rect(RX - 2, yy - 1, SX + CW - RX, 18, '#4A3E5A');
          g.alpha(used ? 0.3 : 1, () => {
            cardIcon(g, c, RX, yy + 2);
            g.text(IR_UI.cards[c], RX + 16, yy, { color: used ? UI.textDim : '#F4ECD8' });
          });
        }
        if (this.active) IR_UI.keys.forEach((l, i) => g.text(l, RX, oy + KEYS_Y + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(IR_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, IR_UI.place, { seed: 64 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }
}

function* openPanel(p: AwasePanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: AwasePanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

function* talk(p: AwasePanel, text: string): Co {
  yield* say(text);
  p.clearInput();
}

function* waitResult(p: AwasePanel): Co<string> {
  p.clearInput();
  p.result = null;
  while (!p.result) yield null;
  return p.result;
}

let qaAuto = false;

/** 5 色あわせ：3つ そろえたら true、やめたら false。 */
function* awasePanel(again: boolean): Co<boolean> {
  const p = new AwasePanel();
  p.auto = qaAuto;
  p.orange = lanternOn() && hStage() === 1;
  const say2 = [T.IR_AWASE_NASU, T.IR_AWASE_MYOGA, T.IR_AWASE_UME];
  let ok = false;
  try {
    yield* openPanel(p);
    yield* talk(p, again ? T.IR_AWASE_AGAIN : T.IR_AWASE_RULE);
    while (p.plate < 3) {
      p.firstFree();
      p.active = true;
      const r = yield* waitResult(p);
      p.active = false;
      if (r === 'cancel') return false;
      if (p.card() === p.plate) {
        p.placed[p.plate] = true;
        se('se_stamp_light', { vol: 0.6 });
        yield 300;
        yield* talk(p, say2[p.plate]);
        p.plate++;
      } else {
        p.shakeT = 360;
        se('se_cancel');
        setFlag(IF.miss, flag(IF.miss) + 1);
        yield 300;
        yield* talk(p, T.IR_AWASE_MISS);
      }
    }
    yield 500;
    ok = true;
  } finally {
    yield* closePanel(p);
  }
  return ok;
}

// ================================================================ 台本

/** 1 紫の ナス。 */
function* nasu(): Co {
  setFlag(IF.nasu, 1);
  se('se_h_yunomi', { vol: 0.5 });
  yield* say(T.IR_NASU_A);
  if (hStage() === 1 && lanternOn()) yield* say(T.IR_NASU_H1);
  yield* say(T.IR_NASU_B);
}

/** 5〜7（遺憾ながらの あと、または やめた 続き）。 */
function* awaseAndAfter(again: boolean): Co {
  const ok = yield* awasePanel(again);
  if (!ok) {
    yield* say(T.IR_AWASE_STOP);
    return;
  }
  setFlag(IF.awase, 1);
  if (!flag(IF.miss)) setFlag(IF.eeme, 1);
  if (flag('flag_ch2_delivery') > 0 || flag('flag_spot_h_deli_04') > 0) yield* say(T.IR_KYURI);
  // 6 さびた もん
  yield* say(T.IR_SABITA);
  if (hStage() === 2 && !pgOn()) {
    yield* say(T.IR_YUKI);
    setFlag(IF.yukiPage, 1);
  }
  // 7 ごほうび：釘は おけへ（大事なものから 外す）
  removeItem('item_ir_kugi');
  setFlag(IF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.IR_REWARD);
  if (flag(IF.yukiPage)) {
    se('se_page');
    yield* runMsg(T.IR_REWARD_YUKI);
  }
}

/** 3 遺憾ながら → 4 色止め → 5〜7。 */
function* ikan(): Co {
  yield* say(T.IR_IKAN);
  yield* say(T.IR_IRODOME);
  setFlag(IF.ikan, 1);
  yield* awaseAndAfter(false);
}

/** はじめて帳〔漬物〕が この お茶の あとに 出る（その 回は 紫の ナスを 出さない）。 */
function hajimeteFirst(): boolean {
  return kanenariHere() && !hajimeteDone('tsukemono') && !pgOn() && flag('flag_ch2_started') > 0 && hStage() <= 2;
}

/** ぴょん夫人の、お茶の 前の 用（色あわせの 続き）。クリア後の 夜は 紫の ナスも（iro_pg.ts）。 */
export function* irYoshieFirst(pg = false): Co<boolean> {
  if (!onMap(SCHOOL) || !open()) return false;
  if (flag(IF.ikan) && !flag(IF.awase)) {
    yield* awaseAndAfter(true);
    return true;
  }
  if (!pg) return false;
  if (!flag(IF.nasu)) {
    yield* nasu();
    return true;
  }
  if (flag(IF.done) && !flag(IF.yoshieAfter)) {
    setFlag(IF.yoshieAfter, 1);
    yield* say(T.IR_YOSHIE_AFTER);
    return true;
  }
  return false;
}

for (const id of ['npc_hoshi_yoshie', 'evt_ch2_rest_yoriai']) {
  wrap(id, function* (_ctx, orig): Co {
    if (yield* irYoshieFirst()) return;
    const before = flag('flag_ch2_rest_count');
    yield* orig();
    // (only after a tea: not the delivery's cucumbers, not before the gathering)
    if (flag('flag_ch2_rest_count') <= before || !onMap(SCHOOL) || !open()) return;
    if (!flag(IF.nasu)) {
      if (before >= 1 && !hajimeteFirst()) yield* nasu();
      return;
    }
    if (flag(IF.done) && !flag(IF.yoshieAfter)) {
      setFlag(IF.yoshieAfter, 1);
      yield* say(T.IR_YOSHIE_AFTER);
    }
  });
}

/** ハモ区長の 用（した とき true）。クリア後の 夜は iro_pg.ts が クリア後の 会話の 上から 呼ぶ。 */
export function* irKucho(): Co<boolean> {
  if (!onMap(SCHOOL) || !open()) return false;
  if (flag(IF.kugi) && !flag(IF.ikan)) {
    yield* ikan();
    return true;
  }
  if (flag(IF.ikan) && !flag(IF.awase)) {
    yield* awaseAndAfter(true);
    return true;
  }
  if (flag(IF.done) && !flag(IF.kuchoAfter)) {
    setFlag(IF.kuchoAfter, 1);
    yield* say(T.IR_KUCHO_AFTER);
    return true;
  }
  return false;
}

wrap('npc_hoshi_kucho', function* (_ctx, orig): Co {
  if (!(yield* irKucho())) yield* orig();
});

/** 区長の 家の 漬物の おけ。 */
wrap('obj_hr_kucho_tsukemono', function* (_ctx, orig): Co {
  if (flag(IF.done)) {
    se('se_examine');
    yield* runMsg(T.IR_OKE_AFTER);
    return;
  }
  yield* orig();
  if (!open()) return;
  if (flag(IF.kugi)) {
    yield* say(T.IR_OKE_WAIT);
    return;
  }
  if (!flag(IF.nasu)) return;
  // 2 さびた 釘
  se('se_h_yunomi', { vol: 0.4, pitch: 0.7 });
  yield* say(T.IR_OKE_KUGI);
  if (flag(IF.yukiSeen)) yield* say(T.IR_OKE_YUKI);
  yield* say(kanenariHere() ? T.IR_OKE_MOTTEKO : T.IR_OKE_SOLO);
  setFlag(IF.kugi, 1);
  yield* getKeyItem('item_ir_kugi', T.IR_GET_KUGI);
});

/** 額の 写真（花嫁の ゆき）：見た ことを 覚える。 */
wrap('obj_hr_kucho_yuki', function* (_ctx, orig): Co {
  yield* orig();
  setFlag(IF.yukiSeen, 1);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.iro(step = 'nasu', auto = false, stage = 'h1')（'h0' 寄り合いの あと・'h1' トマトの 灯り・'h2' よびごえ）
 *   'nasu'    お茶を 1回 飲んだ あと、集会所の ぴょん夫人の 前（話すと お茶 → 1）
 *   'oke'     1 の あと、区長の 家の 漬物の おけの 前（2）
 *   'kucho'   釘を 持って、集会所の ハモ区長の 前（3〜7。大写し）
 *   'awase'   4 の あと（大写しを やめた）、ハモ区長の 前（続き）
 *   'after'   すんだ あと、区長の 家の おけの 前
 */
if (import.meta.env.DEV) {
  registerDebug('iro', (step = 'nasu', auto = false, stg = 'h1') => {
    if (stg === 'h0') cmd().jump?.('ch2:mitsu', true);
    else if (stg === 'h2') cmd().jump?.('ch2:hill', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(IF)) setFlag(id, 0);
    setFlag('flag_ch2_yoriai', 1);
    setFlag('flag_ch2_rest_count', Math.max(1, flag('flag_ch2_rest_count')));
    setFlag('flag_hajimete_tsukemono', 1);
    // (まつ先生の 天文台の 鍵の 呼びかけは 先に すませて おく)
    if (stg !== 'h0') setFlag(DF.key, 1);
    qaAuto = !!auto;
    if (state.inventory.includes('item_ir_kugi')) removeItem('item_ir_kugi');
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'nasu') return go(SCHOOL, 3, 5, 'left');
    setFlag(IF.nasu, 1);
    if (step === 'oke') return go('map_hoshi_kucho', 1, 4, 'down');
    setFlag(IF.kugi, 1);
    giveKey('item_ir_kugi');
    if (step === 'kucho') return go(SCHOOL, 6, 4, 'up');
    setFlag(IF.ikan, 1);
    if (step === 'awase') return go(SCHOOL, 6, 4, 'up');
    setFlag(IF.awase, 1);
    setFlag(IF.done, 1);
    removeItem('item_ir_kugi');
    return go('map_hoshi_kucho', 1, 4, 'down');
  });

  registerDebug('irState', () => {
    const p = game.ui.widgets.find((w) => w instanceof AwasePanel) as AwasePanel | undefined;
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(IF)) flags[k] = flag(id);
    return {
      flags,
      items: state.inventory.filter((i) => i.startsWith('item_ir_')),
      panel: p ? { plate: p.plate, sel: p.sel, card: p.card(), placed: p.placed, active: p.active, result: p.result } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panel's words in their room. */
export function irTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足様', '平和', '17', '3人', '海ぞい', '水族館', 'いただきます'];
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
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('ir', T.IR_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of IR_UI.keys) if (measure(l) > col) bad.push(`keys: ${measure(l)}px > ${col}: ${l}`);
  for (const l of IR_UI.cards) if (16 + measure(l) > col) bad.push(`札: ${measure(l)}px: ${l}`);
  for (const l of IR_UI.plates) if (measure(l) > SLOT_W) bad.push(`皿: ${measure(l)}px > ${SLOT_W}: ${l}`);
  if (KEYS_Y + IR_UI.keys.length * 16 > CH) bad.push(`keys: bottom ${KEYS_Y + IR_UI.keys.length * 16} > ${CH}`);
  if (PLATE_X[2] + SLOT_W / 2 > RX - 4) bad.push(`皿: right ${PLATE_X[2] + SLOT_W / 2} > ${RX - 4}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('irText', () => irTextCheck());
