// 朝の 前の 色（第2章。げむきか 10/17 の 案5、2026-10-17 依頼主の 採用。02_ch2_index #104）。
// 文は data/text/hoshi_asairo.ts、みました帳の ページは ui/menu/book_asairo.ts、サトイモ・クモの 巣・稲の 玉の 絵は
// art/props/asairo_art.ts、置き場所は data/maps/hoshi_village.ts（サトイモ (21–23,32)・稲 (22,12)・クモの 巣 (41,31)）と
// hoshi_rooms.ts（3号ハウスの トマト (7,14)）、イーゼルの 墨の 差分は hoshi_rooms2.ts と art/props/hoshi_room_c.ts。
//
//   段階1〜2（トマトの 灯り）。「第2章から」でも 全部 遊べる。グソっ君が いなくても 進む（グソっ君の 台詞は 抜く）。
//   ・ソワカの 家の 描きかけの 絵 obj_hr_sawako_easel か 札の 下書き obj_hr_sawako_fuda を 2回 調べる（flag_as_look）
//     → 無人販売所の 横の ソワカに 話す → 1 赤く ならない 札・2 露の 墨 → 大事なもの『ソワカの 絵皿』（flag_as_start）。
//   ・露あつめ（大写し「葉の 上の 玉」AsPanel）：サトイモ obj_as_satoimo・稲 obj_as_ine（トマじいが そばに いれば
//     その 台詞）・クモの 巣 obj_as_kumo。どの 順でも（flag_as_tsuyu_<k>）。こぼすと flag_as_kobore。
//   ・3つ そろって ソワカに 話す → ソワカの 家の イーゼルの 前で 4 朝の 前の 色・5 青い とまと → 6 朱肉 +2、
//     絵皿を 返す、みました帳②の すみ（flag_as_done）。イーゼルの 絵に うすい 墨（flag_as_hake）。
//   ・かくし：3号ハウスの トマトの 葉の 先の 玉 obj_as_tomato（flag_as_tsuyu_tomato）→ 4 の あとに 1つ。
//   ・すんだ あと：絵の 文の 差分、無人販売所の 札に 1行、ソワカに 1回。
//   ・クリア後の 夜（段階は h1）：ソワカと トマじいは クリア後の 会話が 包むので、asairo_pg.ts が その 上から 先に 呼ぶ。
//     「でも、朝が 来ない。」の 1ページは 第2章の 夜だけ。
//
// QA：__game.cmd.asairo(step, auto, stage)、asState()、asText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { despawn, registerScript, spawn, walk } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_asairo';
import { AS_UI } from '../../data/text/hoshi_asairo';
import { addMp, F, getKeyItem, giveKey } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn } from './common';

export const AF = {
  look: 'flag_as_look',
  start: 'flag_as_start',
  satoimo: 'flag_as_tsuyu_satoimo',
  ine: 'flag_as_tsuyu_ine',
  kumo: 'flag_as_tsuyu_kumo',
  tomato: 'flag_as_tsuyu_tomato',
  kobore: 'flag_as_kobore',
  rule: 'flag_as_rule',
  ruleKumo: 'flag_as_rule_kumo',
  ineTome: 'flag_as_ine_tome',
  hake: 'flag_as_hake',
  done: 'flag_as_done',
  sawakoAfter: 'flag_as_sawako_after',
  wait: 'flag_as_wait',
} as const;

type Kind = 'satoimo' | 'ine' | 'kumo' | 'tomato';
const MAIN: Kind[] = ['satoimo', 'ine', 'kumo'];
const SAWAKO_HOUSE = 'map_hoshi_sawako';

function kanenariHere(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

/** その 人の 段を 抜く（グソっ君が いない、トマじいが いない）。 */
function drop(text: string, id: string): string {
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@' + id))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = kanenariHere() ? text : drop(text, 'npc_kanenari');
  if (!t.trim()) return 0;
  return yield* runMsg(t);
}

/** 寄り道が 開いている：段階1〜2、トマトの 灯り（クリア後の 夜も：lanternOn は ch2Open を 見る）。 */
function open(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn();
}

function got(k: Kind): boolean {
  return flag(AF[k]) > 0;
}
function count(): number {
  return MAIN.filter(got).length;
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

// ================================================================ 大写し「葉の 上の 玉」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（名前・かたむき・ボタン）。 */
const RX = SX + 210;
const KEYS_Y = 72;
/** 葉の 付け根と 長さ。 */
const PIV_X = SX + 34;
const PIV_Y = SY + 44;
const LEN = 150;

interface Phys {
  /** 玉の 出る 所（葉の 長さの 割合）。 */
  p0: number;
  /** 重さ（かたむきの 加速）・まさつ・割れる 速さ。 */
  g: number;
  fric: number;
  vmax: number;
}
const PHYS: Record<Exclude<Kind, 'kumo'>, Phys> = {
  satoimo: { p0: 0.35, g: 0.9, fric: 0.6, vmax: 0.55 },
  ine: { p0: 0.82, g: 0.9, fric: 1.4, vmax: 0.3 },
  tomato: { p0: 0.6, g: 0.9, fric: 0.9, vmax: 0.42 },
};
/** クモの 巣：はじく 強さの ちょうど いい 幅。 */
const KUMO_OK: [number, number] = [0.38, 0.7];

export class AsPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  active = false;
  result: 'ok' | 'ng' | 'weak' | 'strong' | 'cancel' | null = null;
  kind: Kind;
  /** かたむき -1〜1（右が 葉の 先へ 下がる）。 */
  tilt = 0;
  /** 玉の 位置（0 付け根 〜 1 先）と 速さ。 */
  pos = 0;
  vel = 0;
  /** 落ちて いる 玉（0〜1）、割れた 玉の しぶき（ms）、絵皿に たまった 数。 */
  fall = -1;
  splash = 0;
  inDish = 0;
  /** クモの 巣：ためて いる 強さ、はじいた 糸の ゆれ。 */
  power = 0;
  charging = false;
  twang = 0;
  /** 光が もどるまで（ms）。 */
  wait = 0;
  autoT = 0;
  /** 窓が 開く 間の ずれ（px）。 */
  shift = 0;
  private ePress = false;
  private eCancel = false;

  constructor(kind: Kind) {
    this.kind = kind;
    this.reset();
  }

  reset(): void {
    this.tilt = 0;
    this.vel = 0;
    this.fall = -1;
    this.power = 0;
    this.charging = false;
    if (this.kind !== 'kumo') this.pos = PHYS[this.kind].p0;
  }

  clearInput(): void {
    this.ePress = false;
    this.eCancel = false;
  }

  /** 葉の 角度（ラジアン）。 */
  angle(): number {
    const base = this.kind === 'ine' ? 0.12 : this.kind === 'tomato' ? 0.08 : 0;
    return base + this.tilt * 0.6;
  }

  /** 葉の 上の 点（割合 t）。 */
  at(t: number): [number, number] {
    const a = this.angle();
    return [PIV_X + Math.cos(a) * LEN * t, PIV_Y + this.shift + Math.sin(a) * LEN * t];
  }

  /** 絵皿の 中心。 */
  dish(): [number, number] {
    const [tx] = this.at(1);
    return [Math.round(tx), SY + this.shift + CH - 14];
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.splash > 0) this.splash = Math.max(0, this.splash - dt);
    if (this.twang > 0) this.twang = Math.max(0, this.twang - dt);
    if (input.pressed('confirm')) this.ePress = true;
    if (input.pressed('cancel')) this.eCancel = true;
    if (!this.active || this.result) return;
    if (this.wait > 0) {
      this.wait = Math.max(0, this.wait - dt);
      return;
    }
    if (this.eCancel) {
      this.eCancel = false;
      this.result = 'cancel';
      return;
    }
    const s = dt / 1000;
    if (this.kind === 'kumo') {
      this.updKumo(s, input);
      return;
    }
    // the drop falling off the tip into the dish
    if (this.fall >= 0) {
      this.fall = Math.min(1, this.fall + s * 2.4);
      if (this.fall >= 1) {
        this.inDish++;
        se('se_h_watercup', { vol: 0.6 });
        this.result = 'ok';
      }
      return;
    }
    let dir = 0;
    if (this.auto) {
      this.autoT += dt;
      const want = this.kind === 'ine' ? 0.45 : 0.4;
      dir = this.tilt < want - 0.05 ? 1 : this.tilt > want + 0.05 ? -1 : 0;
    } else {
      if (input.down('right')) dir = 1;
      else if (input.down('left')) dir = -1;
    }
    if (dir) this.tilt = Math.max(-1, Math.min(1, this.tilt + dir * s * 0.9));
    else this.tilt += (0 - this.tilt) * Math.min(1, s * 0.6);
    const ph = PHYS[this.kind];
    this.vel += (Math.sin(this.angle()) * ph.g - this.vel * ph.fric) * s;
    this.pos += this.vel * s;
    if (this.pos < 0.08) {
      this.pos = 0.08;
      this.vel = Math.max(0, this.vel);
    }
    if (Math.abs(this.vel) > ph.vmax) {
      this.splash = 600;
      se('se_h_watercup', { vol: 0.4, pitch: 1.6 });
      this.result = 'ng';
      return;
    }
    if (this.pos >= 1) {
      this.pos = 1;
      this.fall = 0;
    }
  }

  private updKumo(s: number, input: Input): void {
    const held = this.auto ? this.power < 0.52 : input.down('confirm');
    if (held) {
      this.charging = true;
      this.power = Math.min(1, this.power + s * 0.8);
      this.ePress = false;
      return;
    }
    if (!this.charging) return;
    // released: the thread is plucked
    this.charging = false;
    this.twang = 500;
    const pw = this.power;
    this.power = 0;
    if (pw < KUMO_OK[0]) {
      se('se_cursor', { vol: 0.3 });
      this.result = 'weak';
    } else if (pw > KUMO_OK[1]) {
      this.splash = 700;
      se('se_h_watercup', { vol: 0.4, pitch: 1.6 });
      this.result = 'strong';
    } else {
      this.inDish++;
      se('se_h_watercup', { vol: 0.6 });
      this.result = 'ok';
    }
  }

  /** 葉の 太さ（px、割合 t の 所）。 */
  leafW(t: number): number {
    const k = this.kind;
    if (k === 'satoimo') return 22 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04)), 0.6);
    if (k === 'tomato') return 8 * Math.sin(Math.PI * t) + (Math.floor(t * 9) % 2 ? 1 : 0);
    return 2.2 * (1 - t) + 0.8;
  }

  private drawLeaf(g: Gfx): void {
    const k = this.kind;
    const [c, cl, cd] = k === 'ine' ? ['#6A9A3A', '#8ABA5A', '#3E6A2A'] : k === 'tomato' ? ['#4A7A3A', '#6A9A4A', '#2A4A2A'] : ['#3E6A3A', '#5E8E4A', '#24442A'];
    // the stalk down to the ground from the root of the leaf
    g.rect(PIV_X - 2, PIV_Y + this.shift, 3, SY + CH - PIV_Y, k === 'ine' ? '#5A8A3A' : '#6A8A4A');
    for (let i = 0; i <= LEN; i++) {
      const t = i / LEN;
      const w = this.leafW(t);
      const [x, y] = this.at(t);
      const xx = Math.round(x);
      const top = Math.round(y - w * 0.6);
      const h = Math.max(1, Math.round(w));
      g.rect(xx, top, 1, h, c);
      g.px(xx, top, cl);
      g.px(xx, top + h - 1, cd);
      // the leaf's middle vein
      if (k !== 'ine' && i % 2 === 0) g.px(xx, Math.round(y), cd);
    }
  }

  private drawDish(g: Gfx): void {
    const [dx, dy] = this.dish();
    // the white plate held under the tip (グソっ君's claws, or しゅん's hands)
    g.rect(dx - 15, dy + 2, 30, 3, '#1E1822');
    g.rect(dx - 14, dy - 1, 28, 4, '#E8E4DC');
    g.rect(dx - 12, dy - 2, 24, 1, '#F8F4EC');
    g.rect(dx - 13, dy + 2, 26, 1, '#4A6AB0');
    // the dew gathered in it (a little pool that grows)
    const n = this.inDish + count();
    if (n > 0) g.rect(dx - Math.min(10, 2 + n * 3), dy - 1, Math.min(20, 4 + n * 6), 1, '#BDEFFA');
  }

  private drawDrop(g: Gfx, x: number, y: number, r: number): void {
    g.circle(x, y, r, '#BDEFFA');
    g.circle(x, y, Math.max(1, r - 1), '#E8F4FA');
    g.px(x - 1, y - 1, '#FFFFFF');
    // the lantern's orange in the drop
    g.px(x + 1, y + 1, '#F2894B');
  }

  private drawKumo(g: Gfx, oy: number): void {
    const cx = SX + 104;
    const cy = oy + 46;
    const c = '#C8CCD8';
    // the posts of the fire tower on both sides
    g.rect(SX + 18, oy, 5, CH, '#5A4A3A');
    g.rect(SX + 192, oy, 5, CH, '#5A4A3A');
    const sway = this.twang > 0 ? Math.sin(this.t / 25) * (this.twang / 500) * 3 : 0;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const ex = cx + Math.cos(a) * 80;
      const ey = cy + Math.sin(a) * 40;
      g.line(cx, cy, Math.round(ex + (k === 3 ? sway : 0)), Math.round(ey), c);
    }
    for (const r of [14, 28, 42, 56, 70]) {
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * Math.PI * 2;
        g.px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.5), c);
      }
    }
    // the necklace of dew along the plucked thread (3)
    const left = this.splash > 0 || this.wait > 0 ? 0 : 5;
    const a = (3 / 10) * Math.PI * 2;
    for (let i = 1; i <= left; i++) {
      const x = Math.round(cx + Math.cos(a) * 13 * i + sway * (i / 5));
      const y = Math.round(cy + Math.sin(a) * 6.5 * i);
      this.drawDrop(g, x, y, 2);
    }
    // the sleeping spider at the hub
    g.rect(cx - 1, cy - 1, 3, 3, '#2A2440');
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
        // the night before the dawn, the lantern's warm light on the leaf
        g.rect(SX, oy, RX - SX - 4, CH, '#151A2C');
        g.rect(SX, oy + CH - 18, RX - SX - 4, 18, '#1E2418');
        // (a soft pool: rings of low alpha, the lantern held up beside the leaf)
        for (let r = 70; r > 0; r -= 10) g.alpha(0.035, () => g.circle(SX + 120, oy + 30, r, '#F28A3A'));
        for (const [sx, sy] of [[12, 6], [60, 12], [140, 4], [190, 10]] as const) g.px(SX + sx, oy + sy, '#C8CCE0');
        this.shift = dy;
        g.clip(SX, oy, RX - SX - 4, CH, () => {
          if (this.kind === 'kumo') this.drawKumo(g, oy);
          else this.leafAndDrop(g);
          this.drawDish(g);
        });
        // the right column
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        g.text(AS_UI.names[this.kind], RX, oy + 4, { color: '#F4ECD8' });
        const label = this.kind === 'kumo' ? AS_UI.power : AS_UI.tilt;
        g.text(label, RX, oy + 26, { color: UI.bg2 });
        const bw = SX + CW - RX - 8;
        g.rect(RX, oy + 44, bw, 6, '#1A1626');
        if (this.kind === 'kumo') {
          g.rect(RX + Math.round(bw * KUMO_OK[0]), oy + 44, Math.round(bw * (KUMO_OK[1] - KUMO_OK[0])), 6, '#4A5A3A');
          g.rect(RX, oy + 45, Math.round(bw * this.power), 4, '#FFE7A3');
        } else {
          const mid = RX + Math.round(bw / 2);
          g.rect(mid, oy + 43, 1, 8, '#7A6A58');
          const x = mid + Math.round((bw / 2 - 2) * this.tilt);
          g.rect(Math.min(mid, x), oy + 45, Math.abs(x - mid) + 1, 4, Math.abs(this.vel) > PHYS[this.kind].vmax * 0.8 ? '#E84E3C' : '#FFE7A3');
        }
        if (this.active) (this.kind === 'kumo' ? AS_UI.keysKumo : AS_UI.keys).forEach((l, i) => g.text(l, RX, oy + KEYS_Y + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(AS_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, AS_UI.place, { seed: 65 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private leafAndDrop(g: Gfx): void {
    {
      this.drawLeaf(g);
      if (this.wait > 0 || this.splash > 0) {
        if (this.splash > 0) {
          const [x, y] = this.at(Math.min(1, this.pos));
          const s = 1 - this.splash / 600;
          for (let i = 0; i < 6; i++) g.px(Math.round(x + Math.cos(i) * 6 * s), Math.round(y - 3 + Math.sin(i * 1.7) * 4 * s + s * 6), '#BDEFFA');
        }
      } else if (this.fall >= 0) {
        const [x0, y0] = this.at(1);
        const [, ddy] = this.dish();
        const y = y0 + (ddy - 4 - y0) * this.fall * this.fall;
        this.drawDrop(g, Math.round(x0), Math.round(y), this.kind === 'ine' ? 2 : 3);
      } else {
        const [x, y] = this.at(this.pos);
        const r = this.kind === 'satoimo' ? 4 : this.kind === 'tomato' ? 2 : 2;
        // (on a satoimo leaf the drop sits up on the leaf: it does not wet it)
        const lift = Math.round(this.leafW(this.pos) * 0.6) + r - (this.kind === 'satoimo' ? 1 : 0);
        this.drawDrop(g, Math.round(x), Math.round(y - lift), r);
      }
    }
  }
}

function* openPanel(p: AsPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: AsPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

function* talk(p: AsPanel, text: string): Co {
  yield* say(text);
  p.clearInput();
}

function* waitResult(p: AsPanel): Co<string> {
  p.clearInput();
  p.result = null;
  while (!p.result) yield null;
  return p.result;
}

let qaAuto = false;

/** 1か所の 露（true = 絵皿に 落ちた）。 */
function* tsuyuPanel(kind: Kind): Co<boolean> {
  const p = new AsPanel(kind);
  p.auto = qaAuto;
  p.inDish = 0;
  let ok = false;
  try {
    yield* openPanel(p);
    const kumo = kind === 'kumo';
    const rf = kumo ? AF.ruleKumo : AF.rule;
    if (!flag(rf)) {
      setFlag(rf, 1);
      yield* talk(p, kumo ? T.AS_RULE_KUMO : T.AS_RULE);
    }
    for (;;) {
      p.active = true;
      const r = yield* waitResult(p);
      p.active = false;
      if (r === 'cancel') return false;
      if (r === 'ok') {
        yield 400;
        yield* talk(p, T.AS_DROP_OK);
        ok = true;
        break;
      }
      setFlag(AF.kobore, flag(AF.kobore) + 1);
      yield 400;
      yield* talk(p, r === 'weak' ? T.AS_KUMO_WEAK : r === 'strong' ? T.AS_KUMO_STRONG : T.AS_DROP_NG);
      // the light comes back on the leaf a little later
      p.reset();
      if (r !== 'weak') p.wait = 900;
    }
    yield 300;
  } finally {
    yield* closePanel(p);
  }
  return ok;
}

// ================================================================ 台本

/** トマじいが 地図に いる（稲の そば）。 */
function tomeHere(): boolean {
  const a = field()?.actorById('npc_hoshi_tome');
  return !!a && a.visible !== false && Math.abs(a.tileX - 22) <= 3 && Math.abs(a.tileY - 11) <= 2;
}

function* collect(kind: Kind): Co {
  se('se_examine');
  if (got(kind)) {
    yield* say(T.AS_GOT_ALREADY);
    return;
  }
  if (kind === 'satoimo') yield* say(T.AS_SATO_A);
  else if (kind === 'ine') {
    yield* say(T.AS_INE_A);
    if (!flag(AF.ineTome)) {
      setFlag(AF.ineTome, 1);
      yield* say(tomeHere() ? T.AS_INE_TOME : T.AS_INE_SOLO);
    }
  } else if (kind === 'kumo') yield* say(T.AS_KUMO_A);
  else yield* say(T.AS_TOMATO_A);
  const ok = yield* tsuyuPanel(kind);
  if (!ok) {
    yield* say(T.AS_STOP);
    return;
  }
  setFlag(AF[kind], 1);
  if (kind === 'tomato') {
    yield* say(T.AS_TOMATO_GOT);
    return;
  }
  se('se_item', { vol: 0.5 });
  const n = count();
  yield* runMsg(T.asCount(n));
  if (n >= 3) yield* say(T.AS_ALL3);
}

/** 露の 場所（絵皿を 持つ 前は 今の 文）。 */
function* spot(kind: Exclude<Kind, 'tomato'>): Co {
  if (!open() || !flag(AF.start) || flag(AF.done)) {
    se('se_examine');
    if (kind === 'satoimo') {
      yield* say(T.AS_SATO_PLAIN);
      if (!lanternOn() || hStage() === 0) yield* say(T.AS_DARK);
    } else yield* say(kind === 'ine' ? T.AS_INE_PLAIN : T.AS_KUMO_PLAIN);
    return;
  }
  yield* collect(kind);
}
registerScript('obj_as_satoimo', function* (): Co {
  yield* spot('satoimo');
});
registerScript('obj_as_ine', function* (): Co {
  yield* spot('ine');
});
registerScript('obj_as_kumo', function* (): Co {
  yield* spot('kumo');
});
registerScript('obj_as_tomato', function* (): Co {
  if (!open() || !flag(AF.start) || flag(AF.done)) return;
  yield* collect('tomato');
});

/** 1・2（ソワカに 話す）。 */
function* sumi(): Co {
  yield* say(T.AS_SUMI_A);
  if (!pgOn()) yield* say(T.AS_SUMI_KONAI);
  yield* say(T.AS_SUMI_A2);
  yield* say(T.AS_SUMI_B);
  setFlag(AF.start, 1);
  yield* getKeyItem('item_as_ezara', T.AS_GET_EZARA);
  if (kanenariHere()) yield* say(T.AS_EZARA_KN);
  yield* say(T.AS_SUMI_HINT);
}

/** 4〜6：ソワカの 家の イーゼルの 前。 */
function* scene(): Co {
  yield* say(T.AS_SCENE_GO);
  yield* game.fadeOut(400, '#0B0B14');
  se('se_door_glass');
  const f = F();
  f.loadMap(SAWAKO_HOUSE, 6, 4, 'left');
  f.syncFollower(true);
  const sw = spawn('as_sawako', 5, 4, { sprite: 'npc_hoshi_sawako', dir: 'up', ghost: true });
  sw.data.scripted = true;
  f.snapCamera();
  yield* game.fadeIn(400);
  yield 400;
  yield* say(T.AS_SCENE_A);
  if (got('tomato')) yield* say(T.AS_SCENE_TOMATO);
  se('se_pen_write', { vol: 0.5 });
  yield 500;
  setFlag(AF.hake, 1);
  yield* say(T.AS_SCENE_B);
  sw.dir = 'right';
  yield 300;
  se('se_pen_write', { vol: 0.4 });
  yield* say(T.AS_SCENE_C);
  // 6 ごほうび：絵皿は ソワカへ
  removeItem('item_as_ezara');
  setFlag(AF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.AS_REWARD);
  // she goes back out to her stool by the stand
  yield* walk('as_sawako', [[5, 5], [3, 5], [3, 7], [2, 7]], { speed: 2.4 });
  se('se_door_glass', { vol: 0.5 });
  despawn('as_sawako');
}

/** ソワカの 用（した とき true）。クリア後の 夜は asairo_pg.ts が クリア後の 会話の 上から 呼ぶ。 */
export function* asSawako(): Co<boolean> {
  if (!open()) return false;
  if (!flag(AF.start)) {
    if (flag(AF.look) < 2) return false;
    yield* sumi();
    return true;
  }
  if (!flag(AF.done)) {
    if (count() >= 3) {
      yield* scene();
      return true;
    }
    // (once while the dew is gathered: after that her other talk and the other errands go first)
    if (flag(AF.wait)) return false;
    setFlag(AF.wait, 1);
    yield* say(T.AS_SAWAKO_WAIT);
    return true;
  }
  if (!flag(AF.sawakoAfter)) {
    setFlag(AF.sawakoAfter, 1);
    yield* say(T.AS_SAWAKO_AFTER);
    return true;
  }
  return false;
}

wrap('npc_hoshi_sawako', function* (_ctx, orig): Co {
  if (!(yield* asSawako())) yield* orig();
});

/** ソワカの 家の 絵と 札の 下書き：2回 見る（今の 文の あと）。すんだ あとの 絵は 墨の 差分。 */
for (const id of ['obj_hr_sawako_easel', 'obj_hr_sawako_fuda'])
  wrap(id, function* (_ctx, orig): Co {
    if (id === 'obj_hr_sawako_easel' && flag(AF.hake)) {
      se('se_examine');
      yield* runMsg(T.AS_EASEL_AFTER);
      return;
    }
    yield* orig();
    if (open() && !flag(AF.start)) setFlag(AF.look, flag(AF.look) + 1);
  });

/** 無人販売所：すんだ あと、札の 1行。 */
wrap('obj_hoshi_mujin', function* (_ctx, orig): Co {
  yield* orig();
  if (flag(AF.done)) yield* say(T.AS_MUJIN_AFTER);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.asairo(step = 'look', auto = false, stage = 'h1')（'h1' トマトの 灯り・'h2' よびごえ）
 *   'look'    ソワカの 家の 絵の 前（2回 調べる → 外の ソワカ）
 *   'sawako'  2回 見た あと、ソワカの 前 (23,38) 北向き（話すと 1・2）
 *   'satoimo' 絵皿を 持って、サトイモの 前 (20,32) 東向き
 *   'ine'     稲の 玉の 前 (22,11) 下向き（トマじいの となり）
 *   'kumo'    クモの 巣の 前 (41,32) 上向き
 *   'tomato'  3号ハウスの トマトの 前 (6,14) 東向き
 *   'scene'   3つ そろって、ソワカの 前（話すと 4〜6）
 *   'after'   すんだ あと、ソワカの 家の 絵の 前
 */
if (import.meta.env.DEV) {
  registerDebug('asairo', (step = 'look', auto = false, stg = 'h1') => {
    if (stg === 'h2') cmd().jump?.('ch2:hill', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(AF)) setFlag(id, 0);
    qaAuto = !!auto;
    while (state.inventory.includes('item_as_ezara')) removeItem('item_as_ezara');
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    const V = 'map_hoshimidai';
    if (step === 'look') return go(SAWAKO_HOUSE, 5, 4, 'up');
    setFlag(AF.look, 2);
    if (step === 'sawako') return go(V, 23, 38, 'up');
    setFlag(AF.start, 1);
    giveKey('item_as_ezara');
    if (step === 'satoimo') return go(V, 20, 32, 'right');
    if (step === 'ine') return go(V, 22, 11, 'down');
    if (step === 'kumo') return go(V, 41, 32, 'up');
    if (step === 'tomato') return go('map_hoshi_house', 6, 14, 'right');
    for (const k of MAIN) setFlag(AF[k], 1);
    if (step === 'scene') return go(V, 23, 38, 'up');
    setFlag(AF.hake, 1);
    setFlag(AF.done, 1);
    removeItem('item_as_ezara');
    return go(SAWAKO_HOUSE, 5, 4, 'up');
  });

  registerDebug('asState', () => {
    const p = game.ui.widgets.find((w) => w instanceof AsPanel) as AsPanel | undefined;
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(AF)) flags[k] = flag(id);
    return {
      flags,
      n: count(),
      items: state.inventory.filter((i) => i.startsWith('item_as_')),
      panel: p ? { kind: p.kind, tilt: +p.tilt.toFixed(2), pos: +p.pos.toFixed(2), vel: +p.vel.toFixed(2), power: +p.power.toFixed(2), active: p.active, result: p.result } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panel's words in their room. */
export function asTextCheck(): { pages: number; bad: string[] } {
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
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('as', T.AS_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...AS_UI.keys, ...AS_UI.keysKumo, AS_UI.tilt, AS_UI.power, ...Object.values(AS_UI.names)]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  if (KEYS_Y + AS_UI.keys.length * 16 > CH) bad.push(`keys: bottom ${KEYS_Y + AS_UI.keys.length * 16} > ${CH}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('asText', () => asTextCheck());
