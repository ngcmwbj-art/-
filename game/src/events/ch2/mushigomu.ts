// 上へ 降る 雪（第2章。げむきか 10/15 の 案2、2026-10-15 依頼主の 採用。02_ch2_index #101）。
// 文は data/text/hoshi_mushigomu.ts、みました帳の ページは ui/menu/book_mushigomu.ts、絵は art/props/mushigomu_art.ts。
//
//   段階0〜1（まつ先生が 集会所に いる 間）、配達の 外：
//   ・転回場の ポコシャの 自転車 obj_hoshi_pokosha_bike を 調べる（または ポコシャに 話す）→ 1 ぺしゃんこ（flag_mg_start）。
//   ・集会所の まつ先生（その 人の 物語が 先）→ 2 箱を 貸す（item_mg_hako、flag_mg_box）。
//   ・自転車を もう一度 → 分校の 前へ 押していく（flag_mg_school：ポコシャ・まつ先生・自転車が 分校の 前。
//     転回場の ポコシャと 集会所の まつ先生は いない。data/maps/hoshi_village.ts・hoshi_rooms.ts）。
//   ・空気入れ obj_mg_kuukiire (27,28) → 大写し「空気入れ」（flag_mg_pump）。入れすぎ（ポコシャ）を 数える flag_mg_over。
//   ・たらい obj_mg_tarai (24,28)：段階0 は 暗くて 見えない。段階1 → 大写し「たらい」：←→ で 回す → 口から 泡
//     （flag_mg_found）。つけかえる 前に 8つの 向きを 全部 水に 入れたら はなまる（flag_mg_isshuu）。
//   ・旧商店の レジの 下の 引き出し → 虫ゴム（flag_mg_new）→ たらい：つけかえ → 空気 → 1周（泡なし）
//     → 名場面 → 転回場へ もどる → ポコシャが 1周 → 朱肉 +2、item_mg_furui、ページ（flag_mg_done）。
//   ・そのあと：自転車置き場 obj_mg_oki (30–31,28) の 2台（もと・アスカ）を 同じ 手順で（flag_mg_kid_moto・
//     flag_mg_kid_asuka）。集会所の まつ先生に 1台ずつ（flag_mg_fumi_moto・_asuka・_kids）。段階2 は 放送の 1行。
//
// QA：__game.cmd.mg(step, auto)、mgState()、mgText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, removeItem, setFlag, state, type Dir } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_mushigomu';
import { MG_UI } from '../../data/text/hoshi_mushigomu';
import { addMp, getKeyItem, giveKey } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { ch2Open, hStage, lanternOn } from './common';
import { DF } from './dome';
import { deliveryOn, deliveryOpen } from './tsugao';

export const MF = {
  start: 'flag_mg_start',
  box: 'flag_mg_box',
  school: 'flag_mg_school',
  pump: 'flag_mg_pump',
  leak: 'flag_mg_leak',
  over: 'flag_mg_over',
  found: 'flag_mg_found',
  isshuu: 'flag_mg_isshuu',
  newg: 'flag_mg_new',
  kae: 'flag_mg_kae',
  done: 'flag_mg_done',
  fumiAfter: 'flag_mg_fumi_after',
  pokoAfter: 'flag_mg_poko_after',
  moto: 'flag_mg_kid_moto',
  asuka: 'flag_mg_kid_asuka',
  fumiMoto: 'flag_mg_fumi_moto',
  fumiAsuka: 'flag_mg_fumi_asuka',
  fumiKids: 'flag_mg_fumi_kids',
} as const;

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
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

/** まつ先生が 集会所に いる 段階（段階2 は 山道の 入口）。 */
function open(): boolean {
  return hStage() <= 1 && ch2Open();
}

/** その 人の 物語が 先（tetsubou.ts の fumiStoryFirst と 同じ 見方）。 */
function fumiStoryFirst(): boolean {
  if (!flag('flag_ch2_yoriai')) return true;
  if (flag('flag_ch2_sawa_seki') && !flag('flag_seen_npc_hoshi_fumi_sawa')) return true;
  const s = hStage();
  const dome = lanternOn() && s >= 1 && s <= 2 && ch2Open();
  if (dome && (!flag(DF.key) || (flag(DF.n) >= 3 && !flag(DF.report)) || (flag(DF.report) > 0 && !flag(DF.after)))) return true;
  return false;
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

/** しゅんを その マスに 置きなおす（暗い 間に）。 */
function place(f: NonNullable<ReturnType<typeof field>>, x: number, y: number, d: Dir): void {
  f.player.x = x * 16 + 8;
  f.player.y = y * 16 + 16;
  f.player.dir = d;
  f.syncFollower(true);
}

function refresh(): void {
  const f = field();
  f?.refreshPresence();
}

// ================================================================ 大写し（共通の 枠）

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列。 */
const RX = SX + 218;

abstract class Panel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  result: string | null = null;
  words: { text: string; x: number; y: number; t: number; ms: number; color?: string }[] = [];
  protected ePress = false;
  protected eCancel = false;
  abstract place: string;

  take(): boolean {
    const v = this.ePress;
    this.ePress = false;
    return v;
  }
  cancelled(): boolean {
    const v = this.eCancel;
    this.eCancel = false;
    return v;
  }
  clearInput(): void {
    this.ePress = false;
    this.eCancel = false;
  }
  word(text: string, x: number, y: number, ms = 800, color?: string): void {
    this.words.push({ text, x, y, t: 0, ms, color });
  }
  update(dt: number, input: Input): void {
    this.t += dt;
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    if (input.pressed('confirm')) this.ePress = true;
    if (input.pressed('cancel')) this.eCancel = true;
    this.tick(dt, input);
  }
  abstract tick(dt: number, input: Input): void;
  abstract scene(g: Gfx, dy: number): void;
  abstract keys(): string[];
  side(_g: Gfx, _oy: number): void {}

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      g.clip(SX, SY + dy, CW, CH, () => {
        this.scene(g, dy);
        const oy = SY + dy;
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        this.side(g, oy);
        const ks = this.keys();
        ks.forEach((l, i) => g.text(l, RX, oy + 74 + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(this.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, this.place, { seed: 63 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
    for (const w of this.words) {
      const p = w.t / w.ms;
      const yy = Math.round(SY + w.y - p * 6);
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, SX + w.x, yy, { color: w.color ?? UI.bg, outline: UI.border, align: 'center', alpha: al });
      markText(SX + w.x - 32, yy, 64, 16, true);
    }
  }
}

function* openPanel(p: Panel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: Panel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

function* talk(p: Panel, text: string): Co {
  yield* say(text);
  p.clearInput();
}

function* waitResult(p: Panel): Co<string> {
  p.clearInput();
  p.result = null;
  while (!p.result) yield null;
  return p.result;
}

// ---------------------------------------------------------------- タイヤの 絵（両方の 大写しで 使う）

const TIRE = '#2A2630';
const TIRE_LT = '#4A4652';
const RIM = '#B8BCC8';
const SPOKE = '#8C909C';

/** タイヤを 横から：中心 (cx, cy)、半径 r、回った 角 a（ラジアン）。valve：口の 向き（a からの 角）。 */
function drawTire(g: Gfx, cx: number, cy: number, r: number, a: number, flat: number, valveAt: number | null, small = false): [number, number] | null {
  // the tyre, squashed at the bottom when soft
  const squash = Math.round(flat * 4);
  g.circle(cx, cy + squash / 2, r, TIRE);
  g.circle(cx, cy, r - 2, TIRE_LT);
  g.circle(cx, cy, r - 5, TIRE);
  // the tread marks going round
  const n = small ? 12 : 18;
  for (let i = 0; i < n; i++) {
    const t = a + (i / n) * Math.PI * 2;
    g.rect(Math.round(cx + Math.cos(t) * (r - 1)), Math.round(cy + Math.sin(t) * (r - 1)), 1, 1, '#5A5662');
  }
  // the rim and the spokes
  g.ring(cx, cy, r - 6, RIM);
  g.ring(cx, cy, r - 7, '#8A8E9A');
  const ns = small ? 12 : 18;
  for (let i = 0; i < ns; i++) {
    const t = a + (i / ns) * Math.PI * 2;
    g.line(cx, cy, Math.round(cx + Math.cos(t) * (r - 7)), Math.round(cy + Math.sin(t) * (r - 7)), SPOKE);
  }
  g.circle(cx, cy, 3, RIM);
  g.circle(cx, cy, 1, '#5A5E6A');
  if (valveAt === null) return null;
  // the valve: a little brass stem pointing in from the rim
  const t = a + valveAt;
  const vx = Math.round(cx + Math.cos(t) * (r - 8));
  const vy = Math.round(cy + Math.sin(t) * (r - 8));
  const ix = Math.round(cx + Math.cos(t) * (r - 14));
  const iy = Math.round(cy + Math.sin(t) * (r - 14));
  g.line(vx, vy, ix, iy, '#C8A040');
  g.rect(ix - 1, iy - 1, 3, 3, '#E8C060');
  return [vx, vy];
}

// ================================================================ 大写し「たらい」

/** 8つの 向き。口は 向き VALVE。 */
const SECT = 8;
const VALVE = 5;
const T_CX = SX + 104;
const T_CY = SY + 48;
const T_R = 38;
const WATER_Y = SY + 74;

type TMode = 'idle' | 'search' | 'kae' | 'check';

export class TaraiPanel extends Panel {
  place = MG_UI.placeTarai;
  mode: TMode = 'idle';
  /** 今の 向き（小数。下に 来ている 向き）と、向かう 先。 */
  ang = 0;
  target = 0;
  visited = new Set<number>();
  fixed = false;
  small = false;
  dark = false;
  kaeStep = 0;
  settleT = 0;
  bubbleT = 0;
  bubbles: { x: number; y: number; r: number }[] = [];
  noneSaid = false;
  autoT = 0;

  /** 今 水に 入っている 向き（0〜7）。 */
  down(): number {
    return ((Math.round(this.ang) % SECT) + SECT) % SECT;
  }
  settled(): boolean {
    return Math.abs(this.ang - this.target) < 0.02;
  }
  /** 口が 水の 中で、泡が 出ている。 */
  leaking(): boolean {
    return !this.fixed && this.down() === VALVE && this.settled() && !this.dark;
  }

  tick(dt: number, input: Input): void {
    // the tyre turns to its target
    const d = this.target - this.ang;
    const step = (dt / 1000) * 4;
    this.ang = Math.abs(d) <= step ? this.target : this.ang + Math.sign(d) * step;
    if (this.settled() && (this.mode === 'search' || this.mode === 'check')) this.visited.add(this.down());
    // bubbles from the valve, rising to the water's top
    this.bubbleT += dt;
    if (this.leaking() && this.bubbleT > 280) {
      this.bubbleT = 0;
      // (the valve is down, in the water: straight under the hub)
      const vx = T_CX;
      this.bubbles.push({ x: vx + (Math.random() < 0.5 ? 0 : 1), y: T_CY + T_R - 8, r: 1 + (Math.random() < 0.4 ? 1 : 0) });
      se('se_yoburi_awa', { vol: 0.25, pitch: 1.2 + Math.random() * 0.3 });
    }
    for (const b of this.bubbles) b.y -= dt * 0.012;
    this.bubbles = this.bubbles.filter((b) => b.y > WATER_Y - 1);
    if (this.result) return;
    if (this.mode === 'search') this.tickSearch(dt, input);
    else if (this.mode === 'check') this.tickCheck(dt);
    else if (this.mode === 'kae') this.tickKae();
  }

  private tickSearch(dt: number, input: Input): void {
    if (this.cancelled()) {
      this.result = 'cancel';
      return;
    }
    if (this.settled()) {
      let turn = 0;
      if (this.auto) {
        this.autoT += dt;
        // (round once — the hidden 1周 — then stop with the valve down)
        if (this.autoT > 350 && !(this.visited.size >= SECT && this.down() === VALVE)) {
          this.autoT = 0;
          turn = 1;
        }
      } else if (input.repeat('right')) turn = 1;
      else if (input.repeat('left')) turn = -1;
      if (turn) {
        this.target += turn;
        this.settleT = 0;
        se('se_h_splash', { vol: 0.25, pitch: 1.3 });
        return;
      }
      this.settleT += dt;
      // (the auto mode goes all the way round first: the hidden 1周)
      if (this.leaking() && this.settleT > 1100 && (!this.auto || this.visited.size >= SECT)) this.result = 'found';
      if (!this.leaking() && this.settleT > 900 && !this.noneSaid && this.visited.size >= 2) this.result = 'none';
    }
  }

  private tickCheck(dt: number): void {
    this.autoT += dt;
    if (this.settled() && this.autoT > 380) {
      this.autoT = 0;
      if (this.target >= SECT) {
        this.result = 'clear';
        return;
      }
      this.target += 1;
      se('se_h_splash', { vol: 0.2, pitch: 1.3 });
    }
  }

  private tickKae(): void {
    const press = this.auto ? this.t % 500 < 20 : this.take();
    if (!press) return;
    this.kaeStep++;
    se(this.kaeStep === 3 ? 'se_step_metal' : 'se_cursor', { vol: 0.5, pitch: 1.2 });
    if (this.kaeStep >= 3) this.result = 'kae';
  }

  scene(g: Gfx, dy: number): void {
    const oy = dy;
    // the night by the school's door: the tap's light
    g.rect(SX, SY + oy, RX - SX - 4, CH, this.dark ? '#161A28' : '#283048');
    g.alpha(this.dark ? 0.03 : 0.12, () => g.circle(SX + 104, SY + oy + 40, 70, '#FFB070'));
    // the tap on its post (left)
    g.rect(SX + 18, SY + oy + 30, 4, 70, '#6A6E7A');
    g.rect(SX + 18, SY + oy + 30, 18, 4, '#8A8E9A');
    g.rect(SX + 34, SY + oy + 34, 3, 5, '#8A8E9A');
    // the tub (behind the tyre's lower half), the water
    const wy = WATER_Y + oy;
    const tubL = SX + 44;
    const tubR = SX + 166;
    g.rect(tubL - 2, wy - 6, tubR - tubL + 4, 3, '#A8ACB4');
    g.rect(tubL, wy - 3, tubR - tubL, 34, '#7A808C');
    // the tyre, turned by ang (the sector down is in the water)
    const a = (-this.ang * Math.PI * 2) / SECT;
    const valveAt = (VALVE * Math.PI * 2) / SECT + Math.PI / 2;
    drawTire(g, T_CX, T_CY + oy, this.small ? T_R - 6 : T_R, a, 0, valveAt, this.small);
    // the water over the tyre's bottom (see-through), its line
    g.rect(tubL, wy, tubR - tubL, 28, '#3A6A8A', 0.55);
    g.rect(tubL, wy, tubR - tubL, 1, '#BDEFFA');
    for (let i = 0; i < 6; i++) g.rect(tubL + 8 + ((i * 23 + Math.floor(this.t / 300) * 3) % (tubR - tubL - 16)), wy + 4 + (i % 3) * 6, 4, 1, '#6A9AB8');
    g.rect(tubL - 2, wy + 25, tubR - tubL + 4, 3, '#A8ACB4');
    // the bubbles, rising straight up from the valve (and the word)
    for (const b of this.bubbles) {
      g.ring(b.x, Math.round(b.y) + oy, b.r + 1, '#DDF6FF');
      g.px(b.x, Math.round(b.y) + oy - 1, '#FFFFFF');
    }
    if (this.leaking() && Math.floor(this.t / 600) % 2 === 0) g.text(MG_UI.awa, T_CX + 16, wy - 22, { color: '#DDF6FF', outline: UI.border });
    if (this.dark) g.rect(SX, SY + oy, RX - SX - 4, CH, '#000010', 0.45);
  }

  side(g: Gfx, oy: number): void {
    // 8 dots: the ways the tyre has been in the water
    g.text('1周', RX, oy + 4, { color: UI.bg2 });
    for (let i = 0; i < SECT; i++) {
      const x = RX + 30 + i * 9;
      const on = this.visited.has(i);
      g.circle(x, oy + 12, 3, on ? '#BDEFFA' : '#4A4458');
    }
    if (this.mode === 'kae' || this.kaeStep > 0 || this.fixed) {
      // the valve, close: the old rubber (cracked) out, the new one on, the nut
      const bx = RX + 8;
      const by = oy + 28;
      g.rect(bx, by, 90, 40, '#1E1A2A');
      g.frame(bx, by, 90, 40, UI.bg2);
      g.rect(bx + 10, by + 8, 6, 26, '#C8A040');
      g.rect(bx + 9, by + 8, 8, 4, '#E8C060');
      if (this.kaeStep >= 2 || this.fixed) {
        g.rect(bx + 11, by + 14, 4, 14, '#202020');
        g.rect(bx + 11, by + 14, 1, 14, '#606060');
      } else if (this.kaeStep === 0) {
        g.rect(bx + 11, by + 14, 4, 14, '#5A3E30');
        for (const yy of [17, 21, 25]) g.rect(bx + 12, by + yy, 2, 1, '#C8A080');
      }
      if (this.kaeStep >= 1) {
        // the old one, lying aside: three cracks
        g.rect(bx + 40, by + 18, 18, 4, '#5A3E30');
        for (const xx of [44, 49, 54]) g.rect(bx + xx, by + 19, 1, 2, '#C8A080');
      }
      if (this.kaeStep >= 3 || this.fixed) g.rect(bx + 8, by + 30, 10, 4, '#A8ACB4');
      // the next step's word (ぬく → かぶせる → しめる)
      if (this.mode === 'kae' && this.kaeStep < 3) g.text(MG_UI.kae[this.kaeStep], bx + 32, by + 22, { color: '#FFE7A3' });
    }
  }

  keys(): string[] {
    if (this.mode === 'search') return MG_UI.keysTarai;
    if (this.mode === 'kae') return MG_UI.keysKae;
    return [];
  }
}

// ================================================================ 大写し「空気入れ」

/** かたさ：ちょうどの 間（GOOD_LO〜GOOD_HI）、入れすぎ（OVER より 上）。 */
const GOOD_LO = 0.62;
const GOOD_HI = 0.86;
const PUMP_STEP = 0.1;

export class PumpPanel extends Panel {
  place = MG_UI.placePump;
  v = 0.08;
  pushT = 0;
  overs = 0;
  active = false;
  autoT = 0;

  zone(): 'low' | 'good' | 'over' {
    return this.v < GOOD_LO ? 'low' : this.v <= GOOD_HI ? 'good' : 'over';
  }

  tick(dt: number): void {
    if (this.pushT > 0) this.pushT = Math.max(0, this.pushT - dt);
    if (this.result || !this.active) return;
    if (this.cancelled() || (this.auto && this.zone() === 'good' && this.v > 0.7)) {
      this.result = this.zone() === 'good' ? 'good' : 'low';
      return;
    }
    let press = this.take();
    if (this.auto) {
      this.autoT += dt;
      press = this.autoT > 260;
      if (press) this.autoT = 0;
    }
    if (!press) return;
    this.pushT = 220;
    this.v = Math.min(1.05, this.v + PUMP_STEP);
    se('se_c3_pump', { vol: 0.55, pitch: 0.9 + this.v * 0.3 });
    if (this.v > GOOD_HI + 0.04) this.result = 'over';
  }

  scene(g: Gfx, dy: number): void {
    const oy = SY + dy;
    g.rect(SX, oy, RX - SX - 4, CH, '#283048');
    g.alpha(0.1, () => g.circle(SX + 110, oy + 40, 70, '#FFB070'));
    g.rect(SX, oy + 96, RX - SX - 4, CH - 96, '#4A3E32');
    // the floor pump: the barrel, the handle going down when pushed
    const px = SX + 40;
    const k = this.pushT > 0 ? Math.sin((1 - this.pushT / 220) * Math.PI) : 0;
    const hy = oy + 24 + Math.round(k * 18);
    g.rect(px - 10, oy + 92, 24, 4, '#3A3A44');
    g.rect(px, oy + 40, 6, 54, '#C83A2E');
    g.rect(px, oy + 40, 2, 54, '#E86A5A');
    g.rect(px + 2, hy, 2, oy + 42 - hy, '#C8CCD8');
    g.rect(px - 10, hy - 3, 26, 4, '#2A2A30');
    // the hose to the valve
    const tcx = SX + 140;
    const tcy = oy + 54;
    const r = 36;
    const flat = Math.max(0, 1 - this.v / GOOD_LO);
    const vp = drawTire(g, tcx, tcy, r, -0.3, flat, Math.PI * 0.85);
    if (vp) {
      g.line(px + 3, oy + 92, px + 30, oy + 100, '#2A2A30');
      g.line(px + 30, oy + 100, vp[0], vp[1], '#2A2A30');
    }
    // the ground under the tyre: the squash shows the softness
    g.rect(tcx - r - 4, tcy + r + Math.round(flat * 4), 2 * r + 8, 2, '#6A5844');
  }

  side(g: Gfx, oy: number): void {
    // the gauge: soft → just right → too hard (bottom to top)
    const x = RX + 8;
    const y0 = oy + 8;
    const h = 60;
    g.text(MG_UI.katasa, x + 20, y0 - 2, { color: UI.bg2 });
    g.rect(x, y0, 12, h, '#4A4458');
    const yv = (v: number) => y0 + h - Math.round(h * Math.min(1, v));
    g.rect(x, yv(GOOD_HI), 12, yv(GOOD_LO) - yv(GOOD_HI), '#9BCB6B', 0.6);
    g.rect(x, y0, 12, yv(GOOD_HI) - y0, '#D9483A', 0.5);
    g.rect(x - 3, yv(this.v) - 1, 18, 3, '#FFE7A3');
    g.frame(x - 1, y0 - 1, 14, h + 2, UI.bg2);
    const z = this.zone();
    const word = z === 'low' ? MG_UI.low : z === 'good' ? MG_UI.good : MG_UI.over;
    g.text(word, x + 20, yv(this.v) - 8, { color: z === 'good' ? '#9BCB6B' : z === 'over' ? '#FF8A7A' : UI.bg2 });
  }

  keys(): string[] {
    return this.active ? MG_UI.keysPump : [];
  }
}

// ================================================================ 遊び

let qaAuto = false;

/** 空気を 入れる（大写し）：'good' か 'low'（やめた）。入れすぎの たびに ポコシャ（数える）。 */
function* pumpOnce(withRule: boolean): Co<'good' | 'low'> {
  const p = new PumpPanel();
  p.auto = qaAuto;
  let r: string = 'low';
  try {
    yield* openPanel(p);
    if (withRule) yield* talk(p, T.MG_PUMP_RULE);
    for (;;) {
      p.active = true;
      r = yield* waitResult(p);
      p.active = false;
      if (r !== 'over') break;
      p.overs++;
      setFlag(MF.over, flag(MF.over) + 1);
      yield* talk(p, T.MG_PUMP_OVER);
      se('se_c3_pump', { vol: 0.3, pitch: 1.6 });
      p.v = 0.74;
      yield* talk(p, T.MG_PUMP_OVER_NUKU);
    }
    if (r === 'good') {
      se('se_step_metal', { pitch: 1.4, vol: 0.4 });
      yield* talk(p, T.MG_PUMP_GOOD);
    }
  } finally {
    yield* closePanel(p);
  }
  return r === 'good' ? 'good' : 'low';
}

/** たらい：泡を さがす（'found'・'cancel'）。 */
function* searchValve(small: boolean): Co<'found' | 'cancel'> {
  const p = new TaraiPanel();
  p.auto = qaAuto;
  p.small = small;
  p.dark = !lanternOn();
  let r = 'cancel';
  try {
    yield* openPanel(p);
    if (!small) yield* talk(p, T.MG_TARAI_RULE);
    p.mode = 'search';
    for (;;) {
      r = yield* waitResult(p);
      if (r === 'none') {
        p.noneSaid = true;
        p.mode = 'idle';
        if (!small) yield* talk(p, T.MG_TARAI_NONE);
        p.mode = 'search';
        continue;
      }
      break;
    }
    p.mode = 'idle';
    if (r === 'found') {
      // the bubbles go on a moment
      yield 1200;
      if (!small) {
        if (p.visited.size >= SECT && !flag(MF.isshuu)) {
          setFlag(MF.isshuu, 1);
          se('se_hanamaru');
        }
        yield* talk(p, kanenariHere() ? T.MG_TARAI_AWA : T.MG_TARAI_AWA_SOLO);
        if (flag(MF.isshuu) && p.visited.size >= SECT) yield* talk(p, T.MG_TARAI_ISSHUU);
      }
    }
  } finally {
    yield* closePanel(p);
  }
  return r === 'found' ? 'found' : 'cancel';
}

/** たらい：つけかえ（3回）→ 空気 → 1周（泡なし）。 */
function* swapAndCheck(small: boolean): Co<boolean> {
  const p = new TaraiPanel();
  p.auto = qaAuto;
  p.small = small;
  p.target = VALVE;
  p.ang = VALVE;
  p.visited = new Set([VALVE]);
  let ok = false;
  try {
    yield* openPanel(p);
    if (!small) yield* talk(p, T.MG_KAE_RULE);
    p.mode = 'kae';
    const r = yield* waitResult(p);
    p.mode = 'idle';
    if (r !== 'kae') return false;
    p.fixed = true;
    yield 300;
    yield* talk(p, T.MG_KAE_DONE);
  } finally {
    yield* closePanel(p);
  }
  if (!small) yield* say(T.MG_PUMP_AGAIN);
  // (the small ones: the pump without the rules, once just right)
  for (;;) {
    const r = yield* pumpOnce(false);
    if (r === 'good') break;
    if (small) return false;
    yield* say(T.MG_PUMP_LOW);
  }
  const c = new TaraiPanel();
  c.auto = qaAuto;
  c.small = small;
  c.fixed = true;
  c.kaeStep = 3;
  try {
    yield* openPanel(c);
    c.mode = 'check';
    yield* waitResult(c);
    c.mode = 'idle';
    yield 300;
    yield* talk(c, small ? T.MG_KID_FIXED : T.MG_TARAI_CLEAR);
    ok = true;
  } finally {
    yield* closePanel(c);
  }
  return ok;
}

// ================================================================ 台本

/** 1 ぺしゃんこ。 */
function* peshanko(): Co {
  setFlag(MF.start, 1);
  yield* say(T.MG_PESHANKO);
}

/** 3 分校の 前へ。 */
function* pushToSchool(): Co {
  yield* say(T.MG_PUSH);
  yield* game.fadeOut(400, '#0B0B14');
  se('se_step_dirt', { vol: 0.6 });
  setFlag(MF.school, 1);
  refresh();
  const f = field();
  if (f && onMap('map_hoshimidai')) {
    place(f, 25, 29, 'up');
  }
  yield 400;
  yield* game.fadeIn(500);
}

/** 6 の あと：転回場へ もどる → ポコシャが 1周 → ごほうび。 */
function* finale(): Co {
  yield* say(T.MG_DONE);
  yield* game.fadeOut(500, '#0B0B14');
  setFlag(MF.school, 0);
  setFlag(MF.done, 1);
  refresh();
  const f = field();
  if (f && onMap('map_hoshimidai')) {
    place(f, 44, 45, 'up');
  }
  se('se_h_charin', { vol: 0.6 });
  yield 600;
  yield* game.fadeIn(600);
  yield* say(T.MG_RIDE);
  if (flag(MF.over) >= 3) yield* say(T.MG_RIDE_FUUSEN);
  yield* say(T.MG_RIDE_TSUGAO);
  giveKey('item_mg_furui');
  addMp(2);
  se('se_item');
  yield* runMsg(T.MG_REWARD);
}

/** 自転車（転回場）。 */
wrap('obj_hoshi_pokosha_bike', function* (_ctx, orig): Co {
  if (flag(MF.done)) {
    se('se_examine');
    yield* runMsg(T.MG_BIKE_AFTER);
    return;
  }
  if (!open() || deliveryOn()) {
    yield* orig();
    return;
  }
  if (!flag(MF.start)) {
    se('se_examine');
    yield* peshanko();
    return;
  }
  if (flag(MF.box) && !flag(MF.school)) {
    se('se_examine');
    yield* pushToSchool();
    return;
  }
  se('se_examine');
  yield* runMsg(T.MG_PESHANKO_AGAIN);
});

/** ポコシャの 用（した とき true）。クリア後の 夜は mushigomu_pg.ts が クリア後の 会話の 上から 呼ぶ。 */
export function* mgPokosha(): Co<boolean> {
  if (open() && onMap('map_hoshimidai') && !deliveryOn() && !deliveryOpen() && flag('flag_seen_npc_pokosha_h0_1')) {
    if (!flag(MF.start)) {
      yield* peshanko();
      return true;
    }
    if (!flag(MF.done)) {
      yield* say(T.MG_POKOSHA_WAIT);
      return true;
    }
  }
  if (flag(MF.done) && !flag(MF.pokoAfter) && onMap('map_hoshimidai') && !deliveryOn() && !deliveryOpen()) {
    setFlag(MF.pokoAfter, 1);
    yield* say(T.MG_POKOSHA_AFTER);
    return true;
  }
  return false;
}

wrap('npc_pokosha', function* (_ctx, orig): Co {
  if (!(yield* mgPokosha())) yield* orig();
});

registerScript('mg_pokosha', function* (): Co {
  yield* say(T.MG_POKOSHA_SCHOOL);
});

/** まつ先生の 用（した とき true）。クリア後の 夜は mushigomu_pg.ts が クリア後の 会話の 上から 呼ぶ。 */
export function* mgFumi(): Co<boolean> {
  // at the school's door, while the bike is there
  if (onMap('map_hoshimidai') && flag(MF.school) && open()) {
    yield* say(T.MG_FUMI_WATCH);
    return true;
  }
  if (onMap('map_hoshi_school') && open() && !fumiStoryFirst()) {
    if (flag(MF.start) && !flag(MF.box)) {
      yield* say(T.MG_FUMI_BOX);
      setFlag(MF.box, 1);
      yield* getKeyItem('item_mg_hako', T.MG_GET_BOX);
      yield* say(T.MG_FUMI_BOX_2);
      return true;
    }
    if (flag(MF.box) && !flag(MF.school) && !flag(MF.done)) {
      yield* say(T.MG_FUMI_GO);
      return true;
    }
  }
  if (onMap('map_hoshi_school') && flag(MF.done)) {
    if (!flag(MF.fumiAfter)) {
      setFlag(MF.fumiAfter, 1);
      yield* say(T.MG_FUMI_AFTER);
      return true;
    }
    if (flag(MF.moto) && !flag(MF.fumiMoto)) {
      setFlag(MF.fumiMoto, 1);
      yield* say(T.MG_FUMI_MOTO);
      if (flag(MF.asuka) && flag(MF.fumiAsuka) && !flag(MF.fumiKids)) {
        setFlag(MF.fumiKids, 1);
        yield* say(T.MG_FUMI_KIDS);
      }
      return true;
    }
    if (flag(MF.asuka) && !flag(MF.fumiAsuka)) {
      setFlag(MF.fumiAsuka, 1);
      yield* say(T.MG_FUMI_ASUKA);
      if (flag(MF.moto) && flag(MF.fumiMoto) && !flag(MF.fumiKids)) {
        setFlag(MF.fumiKids, 1);
        yield* say(T.MG_FUMI_KIDS);
      }
      return true;
    }
  }
  return false;
}

wrap('npc_hoshi_fumi', function* (_ctx, orig): Co {
  if (!(yield* mgFumi())) yield* orig();
});

/** 分校の 前の 自転車。 */
registerScript('obj_mg_bike_school', function* (): Co {
  se('se_examine');
  yield* runMsg(T.MG_BIKE_SCHOOL);
});

/** 空気入れ。 */
registerScript('obj_mg_kuukiire', function* (): Co {
  se('se_examine');
  if (!flag(MF.school) || flag(MF.done)) {
    yield* runMsg(KUUKIIRE_TEXT);
    return;
  }
  if (flag(MF.found) && !flag(MF.kae)) {
    // the air goes out again through the old rubber: the tub first
    yield* say(flag(MF.newg) ? T.MG_KAE_RULE : T.MG_NEED_NEW);
    return;
  }
  const r = yield* pumpOnce(!flag(MF.pump));
  if (r !== 'good') {
    yield* say(T.MG_PUMP_LOW);
    return;
  }
  if (!flag(MF.pump)) {
    setFlag(MF.pump, 1);
    yield 300;
    yield* say(T.MG_LEAK);
    if (flag('flag_roof_handshake') && kanenariHere()) yield* say(T.MG_LEAK_FUUSEN);
    if (!lanternOn()) yield* say(T.MG_DARK);
  }
});

const KUUKIIRE_TEXT = `@narr
分校の 空気入れ。{w=300}
赤い 筒に、
『自転車 用』の 札。`;

const TARAI_TEXT = `@narr
外の 水道と、たらい。{w=300}
水が 張ってある。`;

/** たらい。 */
registerScript('obj_mg_tarai', function* (): Co {
  se('se_examine');
  if (!flag(MF.school) || flag(MF.done)) {
    yield* runMsg(TARAI_TEXT);
    return;
  }
  if (!flag(MF.pump)) {
    yield* runMsg(TARAI_TEXT);
    yield* say(T.MG_TARAI_FIRST);
    return;
  }
  if (!lanternOn()) {
    yield* say(T.MG_DARK);
    return;
  }
  if (!flag(MF.found)) {
    const r = yield* searchValve(false);
    if (r !== 'found') return;
    setFlag(MF.found, 1);
    yield* say(T.MG_MUSHI);
    return;
  }
  if (!flag(MF.newg)) {
    yield* say(T.MG_NEED_NEW);
    return;
  }
  if (!flag(MF.kae)) {
    if (yield* swapAndCheck(false)) {
      setFlag(MF.kae, 1);
      yield* finale();
    }
  }
});

/** 旧商店の レジ：虫ゴムを さがしている ときの 引き出し。 */
wrap('obj_hr_shoten_register', function* (_ctx, orig): Co {
  if (flag(MF.found) && !flag(MF.newg)) {
    se('se_examine');
    yield* runMsg(T.MG_SHOTEN_GET);
    setFlag(MF.newg, 1);
    se('se_item');
    yield* runMsg(T.MG_SHOTEN_GOT);
    return;
  }
  yield* orig();
  // (the small bikes' rubbers come from the same box: it stays in the drawer)
  if (flag(MF.newg)) yield* runMsg(T.MG_SHOTEN_AFTER);
});

/** 自転車置き場の 2台。 */
registerScript('obj_mg_oki', function* (): Co {
  se('se_examine');
  if (!flag(MF.done)) {
    yield* runMsg(hStage() >= 2 ? T.MG_OKI_H2 : T.MG_OKI_BEFORE);
    return;
  }
  if (hStage() >= 2 && !pgNight()) {
    yield* runMsg(flag(MF.moto) && flag(MF.asuka) ? T.MG_OKI_DONE : T.MG_OKI_H2);
    return;
  }
  const m = !flag(MF.moto);
  const a = !flag(MF.asuka);
  if (!m && !a) {
    yield* runMsg(T.MG_OKI_DONE);
    return;
  }
  const i = yield* runMsg(m && a ? T.MG_OKI_ASK : m ? T.MG_OKI_ASK_MOTO : T.MG_OKI_ASK_ASUKA);
  let which: 'moto' | 'asuka' | null = null;
  if (m && a) which = i === 0 ? 'moto' : i === 1 ? 'asuka' : null;
  else if (i === 0) which = m ? 'moto' : 'asuka';
  if (!which) return;
  if (!lanternOn()) {
    yield* say(T.MG_DARK);
    return;
  }
  const r = yield* searchValve(true);
  if (r !== 'found') return;
  if (yield* swapAndCheck(true)) {
    setFlag(which === 'moto' ? MF.moto : MF.asuka, 1);
    refresh();
  }
});

/** クリア後の 夜（段階は h1 のまま。common の ch2Open が 開ける）。 */
function pgNight(): boolean {
  return ch2Open() && flag('flag_ch2_boss_beaten') > 0;
}

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.mg(step = 'bike', auto = false)（段階1、トマトの 灯り。'h0' だけ 段階0）
 *   'bike'    転回場の 自転車の 前（調べると 1）
 *   'fumi'    1 の あと、集会所の まつ先生の 前（2）
 *   'push'    箱の あと、自転車の 前（押して 分校へ）
 *   'pump'    分校の 前、空気入れの 前
 *   'tarai'   空気の あと、たらいの 前（大写し）
 *   'shoten'  泡の あと、旧商店の レジの 前
 *   'kae'     虫ゴムの あと、たらいの 前（つけかえ〜名場面〜1周）
 *   'oki'     すんだ あと、自転車置き場の 前
 *   'h0'      段階0、空気入れの 前（たらいは 暗い）
 */
if (import.meta.env.DEV) {
  registerDebug('mg', (step = 'bike', auto = false) => {
    const h0 = step === 'h0';
    if (h0) cmd().jump?.('ch2:mitsu', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(MF)) setFlag(id, 0);
    setFlag('flag_ch2_yoriai', 1);
    setFlag('flag_seen_npc_pokosha_h0_1', 1);
    if (!h0) setFlag(DF.key, 1);
    qaAuto = !!auto;
    const inv = state.inventory;
    for (const it of ['item_mg_hako', 'item_mg_furui']) if (inv.includes(it)) removeItem(it);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'bike') return go('map_hoshimidai', 45, 45, 'up');
    setFlag(MF.start, 1);
    if (step === 'fumi') return go('map_hoshi_school', 9, 4, 'up');
    setFlag(MF.box, 1);
    giveKey('item_mg_hako');
    if (step === 'push') return go('map_hoshimidai', 45, 45, 'up');
    setFlag(MF.school, 1);
    if (step === 'pump' || h0) return go('map_hoshimidai', 27, 29, 'up');
    setFlag(MF.pump, 1);
    if (step === 'tarai') return go('map_hoshimidai', 24, 29, 'up');
    setFlag(MF.found, 1);
    if (step === 'shoten') return go('map_hoshi_shoten', 8, 4, 'up');
    setFlag(MF.newg, 1);
    if (step === 'kae') return go('map_hoshimidai', 24, 29, 'up');
    setFlag(MF.kae, 1);
    setFlag(MF.school, 0);
    setFlag(MF.done, 1);
    giveKey('item_mg_furui');
    return go('map_hoshimidai', 30, 29, 'up');
  });

  registerDebug('mgState', () => {
    const p = game.ui.widgets.find((w) => w instanceof TaraiPanel || w instanceof PumpPanel) as Panel | undefined;
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(MF)) flags[k] = flag(id);
    return {
      flags,
      items: state.inventory.filter((i) => i.startsWith('item_mg_')),
      panel: p ? { kind: p.constructor.name, result: p.result, ...(p instanceof TaraiPanel ? { mode: p.mode, ang: p.ang, visited: [...p.visited] } : { v: (p as PumpPanel).v }) } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panels' words in their room. */
export function mgTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足様', '平和', '17', '3人', '海ぞい', '水族館'];
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) return;
      let lines: string[] = [];
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
          if (t.startsWith('?')) for (const o of t.slice(1).split('|')) if (measure(o.trim()) > 300) bad.push(`${name}: choice ${measure(o.trim())}px: ${o}`);
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('mg', { ...T.MG_TEXTS, KUUKIIRE_TEXT, TARAI_TEXT });
  const col = SX + CW - RX - 2;
  for (const l of [...MG_UI.keysPump, ...MG_UI.keysTarai, ...MG_UI.keysKae]) if (measure(l) > col) bad.push(`keys: ${measure(l)}px > ${col}: ${l}`);
  for (const l of [MG_UI.low, MG_UI.good, MG_UI.over]) if (RX + 28 + measure(l) > SX + CW - 2) bad.push(`かたさ: ${l}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('mgText', () => mgTextCheck());
