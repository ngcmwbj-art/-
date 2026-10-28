// 前から 寝る（第2章。げむきか 10/20 の 案4、2026-10-20 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_neru.ts、絵は art/props/neru_art.ts（ぬれた おがくず・フォークと ネコ車・おがくずの 山・
// 寝に いく 牛）、みました帳の ページは ui/menu/book_neru.ts。牛舎 map_hoshi_barn の 南4（x14–16, y8–10）。
//
//   h1〜h2（ゲートが 開いて 牛舎に 入れる 間。クリア後の 夜は 足さない：ボスの 前の 夜の 寄り道で、
//   エンディング 2a の 牛に つながるので）。トマトの 灯りが いる。
//   ・1 南4の 飼槽 obj_hoshi_minami4（(14–16,7)、給餌通路から 南向き）：ここだけ 起立（flag_nr_kiritsu）。
//   ・2 マサル（h1 は 給餌通路の 東の 端、h2 は ゲートの 横）に 話すと〔yuka〕（flag_nr_start）。h2 は マサルが
//     牛舎に もどる（給餌通路の (20,6)。すむまで）。
//   ・3 前室の フォークと ネコ車 obj_hoshi_fork（(1,7)、(2,7) から 西向き）→ flag_nr_fork。南4で 大写し
//     「牛房の 床」YukaPanel（かき出す：↑↓ 灯りの 高さ、←→ 場所、けってい「ここ」。ぬれた 所 4つ＝うしろ 3・
//     水飲み場の まわり 1。flag_nr_wet の ビット、flag_nr_kaki）→ ネコ車（flag_nr_load 1 ぬれた）→ 堆肥舎
//     obj_hoshi_taihisha（flag_nr_load 0、flag_nr_sute）→ おがくずの 山 obj_hoshi_ogakuzu_yama（flag_nr_load 2）→
//     南4で しく（←→ 寄せる、けってい「これで よし」。まん中に 山が 残ると「……平らに。」flag_nr_taira 1/2）。
//     画面の 下の 帯に、いま 押す ボタンと 何を するかを 毎回 出す（NrBand・パネルの 中）。
//   ・4 おじぎ（牛が 1頭ずつ 前の ひざから 寝る。NR_COWS）→ flag_nr_neta → 南4の 牛は 寝た 絵（prop_h_cow 'lie'。
//     夜明け〈エンディング 2a〉に うしろから ゆっくり 立つ：riseMs）。5 寝るか 寝んか → 6 ごほうび（flag_nr_done）。
//   ・かくし：おてつだい（flag_ch2_barn_work）→ マサル「エサ、水、床。」（flag_nr_work）。耳の あいさつ
//     （flag_mimi_awase）→ ふくじんづけが ネコ車の おがくずに 転がる（flag_nr_fuku）。ふしぎ08 を 押している →
//     グソっ君「南4も、自分の 拍子で」（flag_nr_hansuu）。
//   ・とちゅうで やめても：フラグで 続きから（大写しを 閉じても、ぬれた 所の ビットは 残る）。
//
// QA：__game.cmd.neru(step, stage, auto)、nrState()、nrText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { freeSpan } from '../../engine/safezones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { fxAt, registerWorldFx } from '../../world/fx';
import { getMapDef, registerMap } from '../../world/maps';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, textW, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_neru';
import { NR_UI } from '../../data/text/hoshi_neru';
import { drawBarrow, NR_COW_GAP, NR_COWS } from '../../art/props/neru_art';
import { addMp, sendAway } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn, npc } from './common';
import { choresOn } from './barn';
import { HOWTO } from '../../data/text/howto';
import { skipIntro } from '../../ui/closeup';
import { widenInt } from '../../ui/closeup_wide';

export const NF = {
  kiritsu: 'flag_nr_kiritsu',
  start: 'flag_nr_start',
  fork: 'flag_nr_fork',
  wet: 'flag_nr_wet',
  mizu: 'flag_nr_mizu',
  kaki: 'flag_nr_kaki',
  load: 'flag_nr_load',
  sute: 'flag_nr_sute',
  taira: 'flag_nr_taira',
  neta: 'flag_nr_neta',
  done: 'flag_nr_done',
  after: 'flag_nr_after',
  work: 'flag_nr_work',
  fuku: 'flag_nr_fuku',
  hansuu: 'flag_nr_hansuu',
} as const;

const BARN = 'map_hoshi_barn';
const VILLAGE = 'map_hoshimidai';
const GEN = 'npc_hoshi_gen';

function kanenariHere(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function dropKn(text: string): string {
  if (kanenariHere()) return text;
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = dropKn(text);
  if (!t.trim()) return -1;
  return yield* runMsg(t);
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 寄り道が 開いている：h1〜h2、ゲートが 開いた あと、トマトの 灯り（クリア後の 夜は 足さない）。 */
export function nrOpen(): boolean {
  const s = hStage();
  return !pgOn() && s >= 1 && s <= 2 && flag('flag_ch2_gate_open') > 0 && !flag('flag_ch2_boss_beaten') && lanternOn();
}

/** マサルが 牛舎で 待っている（h2 の〔yuka〕の あと、すむまで）。 */
function genInBarn(): boolean {
  return nrOpen() && hStage() === 2 && flag(NF.start) > 0 && !flag(NF.done);
}

function wetN(): number {
  const b = flag(NF.wet);
  return [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => b & (1 << i)).length;
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

/** 南4の 寝る 所（52 4.3 の 牛房 C の 寝姿の 置き方。白い 腹は 2頭目）。 */
const LIE: [number, number, boolean, string][] = [
  [16, 24, false, ''],
  [32, 34, true, 'belly'],
  [18, 46, true, ''],
];
const PEN = [14, 8] as const;

function lieAt(dx: number, dy: number): { tx: number; ty: number; ox: number; oy: number } {
  const px = PEN[0] * 16 + dx;
  const py = PEN[1] * 16 + dy;
  const tx = Math.floor(px / 16);
  const ty = Math.floor((py - 1) / 16);
  return { tx, ty, ox: px - tx * 16, oy: py - ty * 16 };
}

{
  const def = getMapDef(BARN);
  if (def) {
    // 南4's standing cows (at the rail, seen from behind): until the new sawdust is in
    for (const o of def.objects) {
      const p = o as { t: string; prop?: string; x: number; y: number; opts?: Record<string, unknown>; cond?: Record<string, unknown> };
      if (p.t === 'prop' && p.prop === 'prop_h_cow' && p.y === 9 && p.x >= 14 && p.x <= 16 && p.opts?.pose === 'back') p.cond = { ...(p.cond ?? {}), notFlag: 'flag_nr_taira' };
    }
    registerMap(def);
  }
}

const NPC = (o: Record<string, unknown>): MapObj => ({ t: 'npc', ...o }) as unknown as MapObj;
const wetBit = (i: number) => () => nrOpen() && !(flag(NF.wet) & (1 << i)) && !flag(NF.kaki);
const barnObjs: MapObj[] = [
  // the wet sawdust: the pen's back half (south), and round the water cup on its west post
  { t: 'prop', prop: 'prop_nr_wet', x: 14, y: 10, opts: { v: 0 }, cond: { when: () => nrOpen() && !flag(NF.kaki) } },
  { t: 'prop', prop: 'prop_nr_wet', x: 14, y: 8, opts: { v: 1 }, cond: { when: wetBit(0) } },
  // the fork and the wheelbarrow by the feed cart (gone while they are out)
  { t: 'prop', prop: 'prop_nr_fork', x: 1, y: 7, cond: { when: () => !(flag(NF.fork) && !flag(NF.done)) } },
  { t: 'obj', id: 'obj_hoshi_fork', x: 1, y: 7, face: 'left', script: 'obj_hoshi_fork' },
  // 南4's trough, examined from the feed aisle facing south (before the cows' own examine)
  { t: 'obj', id: 'obj_hoshi_minami4', x: 14, y: 7, w: 3, face: 'down', priority: 2, script: 'obj_hoshi_minami4', cond: { when: () => nrOpen() || flag(NF.done) > 0 } },
  // h2: マサル back in the barn from the gate until it is done
  NPC({ id: 'nr_gen', sprite: GEN, x: 20, y: 6, dir: 'left', pose: 'lean', script: GEN, cond: { when: genInBarn } }),
  // the three going to lie down (after the new sawdust, until they have), then lying (the dawn gets them up, hind end first)
  ...LIE.map(([dx, dy, right, white], k) => {
    const a = lieAt(dx, dy);
    return { t: 'prop', prop: 'prop_nr_cow', x: a.tx, y: a.ty, opts: { k, right, white, dx: a.ox, dy: a.oy }, cond: { flag: NF.taira, notFlag: NF.neta } } as unknown as MapObj;
  }),
  ...LIE.map(([dx, dy, right, white], k) => {
    const a = lieAt(dx, dy);
    return { t: 'prop', prop: 'prop_h_cow', x: a.tx, y: a.ty, opts: { pose: 'lie', right, white, dx: a.ox, dy: a.oy, phase: 0.2 + k * 0.3, n: 27 + k, aisle: 'up', riseMs: 520 }, cond: { flag: NF.neta } } as unknown as MapObj;
  }),
];
{
  const def = getMapDef(BARN);
  if (def) {
    const have = new Set(def.objects.map((o) => o.id).filter(Boolean));
    // (the cows go in just after the other cows, before the rail: drawn among them)
    const rail = def.objects.findIndex((o) => (o as { prop?: string }).prop === 'prop_h_barn_rail');
    const add = barnObjs.filter((o) => !o.id || !have.has(o.id));
    def.objects.splice(rail >= 0 ? rail : def.objects.length, 0, ...add);
    registerMap(def);
  }
}

{
  const def = getMapDef(VILLAGE);
  if (def) {
    // マサル at the gate (h2) stays in the barn while 南4 is being done
    for (const o of def.objects) {
      const n = o as { t: string; id?: string; x: number; y: number; cond?: Record<string, unknown> };
      if (n.t === 'npc' && n.id === GEN && n.x === 50 && n.y === 19) {
        const prev = n.cond ?? {};
        const when = prev.when as (() => boolean) | undefined;
        n.cond = { ...prev, when: () => (!when || when()) && !genInBarn() };
      }
    }
    def.objects.push(
      { t: 'prop', prop: 'prop_nr_yama', x: 50, y: 22 } as unknown as MapObj,
      { t: 'obj', id: 'obj_hoshi_ogakuzu_yama', x: 50, y: 22, face: 'up', priority: 2, script: 'obj_hoshi_ogakuzu_yama' } as unknown as MapObj,
    );
    registerMap(def);
  }
}

// ================================================================ 画面の 下の 帯（いま 押す ボタンと、何を するか）

function bandAt(g: Gfx, text: string, a = 1): void {
  const w = textW(text) + 20;
  const h = 20;
  const y = 216 - h - 4;
  const span = freeSpan(y, y + h);
  const x = Math.max(span.x0 + 2, Math.min(span.x1 - w - 2, Math.round((384 - w) / 2)));
  markText(x, y, w, h, true);
  g.rect(x, y, w, h, '#1A1626', 0.88 * a);
  g.rect(x, y, w, 1, '#FFE7A3', 0.6 * a);
  g.text(text, x + 10, y + 4, { color: '#FFE7A3', alpha: a });
}

/** 運ぶ 間の 帯（会話や 大写しが 出ている 間は 隠れる）。 */
class NrBand implements Widget {
  modal = false;
  done = false;
  update(): void {
    if (!onMap(BARN) && !onMap(VILLAGE)) return;
  }
  text(): string {
    if (!nrOpen() || flag(NF.done)) return '';
    const load = flag(NF.load);
    if (load === 1) return NR_UI.bandSute;
    if (flag(NF.sute) && load === 0 && !flag(NF.taira)) return NR_UI.bandYama;
    if (load === 2) return NR_UI.bandBack;
    return '';
  }
  draw(g: Gfx): void {
    const t = this.text();
    if (!t || !field()?.controllable) return;
    bandAt(g, t);
  }
}
const band = new NrBand();
let bandUp = false;
registerWorldFx({
  map: '',
  update() {
    const want = nrOpen() && flag(NF.load) + flag(NF.sute) > 0 && !flag(NF.taira);
    if (want && !bandUp) {
      game.ui.push(band);
      bandUp = true;
    } else if (!want && bandUp) {
      game.ui.remove(band);
      bandUp = false;
    }
  },
});

// ================================================================ 大写し「牛房の 床」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 226;
/** 場所：上の 列（柵の 側。いちばん 左が 水飲み場の まわり）と 下の 列（牛房の うしろ）。ぬれた 所。 */
const SPOTS: { c: number; r: number; wet: boolean }[] = [
  { c: 0, r: 0, wet: true },
  { c: 1, r: 0, wet: false },
  { c: 2, r: 0, wet: false },
  { c: 3, r: 0, wet: false },
  { c: 3, r: 1, wet: true },
  { c: 2, r: 1, wet: true },
  { c: 1, r: 1, wet: true },
  { c: 0, r: 1, wet: false },
];
/** 灯りの 高さ（0 低い 〜 3 高い）。1 より 高いと ぬれた 所が 見えない。 */
const LOW_OK = 1;
const COLS = 5;

export class YukaPanel implements Widget {
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（改善会議 10-25 の1、ui/closeup.ts）。 */
  howto = HOWTO.neru;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：しく で いちど まん中を 残して「これで よし」。 */
  autoBumpy = false;
  active = false;
  mode: 'kaki' | 'shiku';
  /** 灯りの 高さ（0〜3）。 */
  light = 3;
  cur = 0;
  /** かき出して いる（ms）。 */
  scoop = 0;
  /** しく：列ごとの おがくずの 高さ。 */
  piles = [0, 1, 4, 1, 0];
  pick: 'here' | 'ok' | 'cancel' | null = null;
  private autoT = 0;
  private wasActive = false;
  private armT = 0;
  private autoTried = false;

  constructor(mode: 'kaki' | 'shiku') {
    this.mode = mode;
    this.cur = mode === 'shiku' ? 2 : 0;
  }

  flat(): boolean {
    // ひろい：高い 所と 低い 所の 差 1→2 まで よし（改善会議 10-28 の5）
    return Math.max(...this.piles) - Math.min(...this.piles) <= widenInt(1);
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.scoop > 0) this.scoop = Math.max(0, this.scoop - dt);
    // (the key that closed the last window must not also pick here: a moment's grace after it opens)
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
    }
    if (this.active) this.armT += dt;
    if (!this.active || this.pick || this.armT < 150) return;
    let lr = 0;
    let ud = 0;
    let ok = false;
    if (this.auto) {
      this.autoT += dt;
      if (this.autoT < 420) return;
      this.autoT = 0;
      if (this.mode === 'kaki') {
        if (this.light > LOW_OK) ud = 1;
        else {
          const goal = SPOTS.findIndex((s, i) => s.wet && !(flag(NF.wet) & (1 << i)));
          if (goal < 0) return;
          if (goal !== this.cur) lr = goal > this.cur ? 1 : -1;
          else ok = true;
        }
      } else {
        if (this.autoBumpy && !this.autoTried) {
          this.autoTried = true;
          ok = true;
        } else if (this.flat()) ok = true;
        else {
          // push from the highest toward the lowest
          const hi = this.piles.indexOf(Math.max(...this.piles));
          if (this.cur !== hi) {
            this.cur = hi;
            return;
          }
          // (toward the lowest strip: it settles)
          const lo = this.piles.indexOf(Math.min(...this.piles));
          lr = lo < hi ? -1 : 1;
        }
      }
    } else {
      lr = (input.pressed('right') ? 1 : 0) - (input.pressed('left') ? 1 : 0);
      ud = (input.pressed('down') ? 1 : 0) - (input.pressed('up') ? 1 : 0);
      ok = input.pressed('confirm');
      if (input.pressed('cancel')) {
        this.pick = 'cancel';
        return;
      }
    }
    if (this.mode === 'kaki') {
      if (ud) {
        const n = Math.max(0, Math.min(3, this.light - ud));
        if (n !== this.light) {
          this.light = n;
          se('se_cursor', { vol: 0.3, pitch: 0.8 + n * 0.1 });
        }
      }
      if (lr) {
        this.cur = (this.cur + lr + SPOTS.length) % SPOTS.length;
        se('se_cursor', { vol: 0.3 });
      }
      if (ok) this.pick = 'here';
    } else {
      if (lr) {
        // push one scoop from where the fork is to the side named, and follow it
        const to = this.cur + lr;
        if (to >= 0 && to < COLS && this.piles[this.cur] > 0) {
          this.piles[this.cur]--;
          this.piles[to]++;
          this.cur = to;
          se('se_c3_kosogeru', { vol: 0.2, pitch: 1.4 });
        } else if (to >= 0 && to < COLS) {
          this.cur = to;
          se('se_cursor', { vol: 0.3 });
        }
      }
      if (ok) this.pick = 'ok';
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
        // the pen seen from the aisle, a little from above: the rail on top, the sawdust floor, the cows at the rail (dark shapes)
        const fx = SX + 12;
        const fy = oy + 22;
        const fw = 196;
        const fh = 84;
        g.rect(SX, oy, RX - SX - 4, CH, '#2A2830');
        // the floor under the tomato's light: the lower the lantern, the plainer the wet shows
        const low = (3 - this.light) / 3;
        g.rect(fx, fy, fw, fh, this.mode === 'shiku' ? '#C8B48C' : mix3('#B8A880', '#D8C8A0', low));
        for (let i = 0; i < 160; i++) {
          const x = fx + ((i * 53) % fw);
          const y = fy + ((i * 29) % fh);
          g.px(x, y, (i % 3 === 0 ? '#F0E4C4' : '#A8946C'));
        }
        const cw = fw / 4;
        const rh = fh / 2;
        if (this.mode === 'kaki') {
          SPOTS.forEach((s, i) => {
            const x = fx + s.c * cw;
            const y = fy + s.r * rh;
            const gone = flag(NF.wet) & (1 << i);
            if (s.wet && !gone) {
              const d = 0.15 + 0.75 * low;
              g.alpha(d, () => {
                g.rect(x + 8, y + 8, cw - 16, rh - 16, '#5A4428');
                g.rect(x + 12, y + 5, cw - 24, rh - 10, '#5A4428');
              });
            }
            // scraped out down to the concrete (grey, a little damp), waiting for the new sawdust
            if (gone) g.alpha(0.8, () => g.rect(x + 10, y + 8, cw - 20, rh - 16, '#A8A8A0'));
          });
          // the water cup on the west post (front left)
          g.rect(fx - 6, fy - 6, 12, 10, '#9AA0A8');
          g.rect(fx - 4, fy - 4, 8, 4, '#4AA8E0');
          // the tomato's light pool (smaller and brighter as it comes down)
          const r = 40 + this.light * 22;
          for (let rr = r; rr > 0; rr -= 10) g.alpha(0.04 + 0.03 * low, () => g.circle(fx + fw / 2, fy + fh / 2, rr, '#F28A3A'));
          // the place pointed at
          if (this.active || this.scoop > 0) {
            const s = SPOTS[this.cur];
            const x = fx + s.c * cw;
            const y = fy + s.r * rh;
            g.rect(x + 2, y + 2, cw - 4, 1, '#FFE7A3');
            g.rect(x + 2, y + rh - 3, cw - 4, 1, '#FFE7A3');
            g.rect(x + 2, y + 2, 1, rh - 4, '#FFE7A3');
            g.rect(x + cw - 3, y + 2, 1, rh - 4, '#FFE7A3');
            // マサル's fork going in
            if (this.scoop > 0) {
              const u = Math.sin((1 - this.scoop / 500) * Math.PI);
              g.line(x + cw / 2 + 20, y - 20 - u * 6, x + cw / 2, y + rh / 2 - u * 6, '#B08A5A');
              for (const ddx of [-3, -1, 1, 3]) g.line(x + cw / 2 + ddx, y + rh / 2 - u * 6, x + cw / 2 + ddx, y + rh / 2 + 4 - u * 6, '#9AA0A8');
            }
          }
        } else {
          // the new sawdust in heaps across the pen (5 strips)
          const sw = fw / COLS;
          this.piles.forEach((n, i) => {
            const x = fx + i * sw;
            for (let j = 0; j < n; j++) {
              const hh = 6 + j * 7;
              g.rect(x + 4, fy + fh / 2 - hh / 2, sw - 8, hh, j === n - 1 ? '#F4ECD4' : '#E8DCC0');
            }
          });
          if (this.active) {
            const x = fx + this.cur * sw;
            g.line(x + sw / 2 + 16, fy + 4, x + sw / 2, fy + fh / 2, '#B08A5A');
            for (const ddx of [-3, -1, 1, 3]) g.line(x + sw / 2 + ddx, fy + fh / 2, x + sw / 2 + ddx, fy + fh / 2 + 5, '#9AA0A8');
          }
        }
        // the rail along the top (the pen's aisle side), the cows' dark rumps beyond it at the rail
        g.rect(SX, oy + 10, RX - SX - 4, 3, '#9AA0A8');
        g.rect(SX, oy + 15, RX - SX - 4, 2, '#7A808A');
        for (const x of [60, 110, 160]) {
          g.circle(SX + x, oy + 6, 9, '#2B2A30');
          g.rect(SX + x - 9, oy, 18, 6, '#2B2A30');
        }
        // the right column: the lantern's height, the count, the keys
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        if (this.mode === 'kaki') {
          g.text(NR_UI.light, RX, oy + 4, { color: '#F4ECD8' });
          for (let i = 0; i < 4; i++) g.rect(RX + 34, oy + 18 - i * 4, 14, 3, i <= this.light ? '#F28A3A' : '#1A1626');
          let n = 0;
          SPOTS.forEach((s, i) => s.wet && flag(NF.wet) & (1 << i) && n++);
          g.text(`${n}/4`, RX, oy + 28, { color: n >= 4 ? '#FFE7A3' : '#F4ECD8' });
        } else {
          g.text(this.flat() ? '◎' : '△', RX, oy + 4, { color: '#F4ECD8' });
        }
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(NR_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, NR_UI.place, { seed: 79 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
    // the band at the bottom: what to press now, and what it does
    if (this.active && this.open >= 1) bandAt(g, this.mode === 'kaki' ? NR_UI.bandKaki : NR_UI.bandShiku);
  }
}

/** A colour between two (#rrggbb), u 0..1. */
function mix3(a: string, b: string, u: number): string {
  const p = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * u));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function* openPanel(p: YukaPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: YukaPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaBumpy = false;

/** 3 かき出す。true：4つ ぜんぶ。 */
function* kakidasu(): Co<boolean> {
  // もどるで やめた あと（改善会議 10-26 の 3）：「すぐ やる」なら マサルの 前置きを とばす
  const skip = yield* skipIntro(HOWTO.neru.id);
  const p = new YukaPanel('kaki');
  p.auto = qaAuto;
  let all = false;
  try {
    yield* openPanel(p);
    if (!skip) yield* say(T.NR_KAKI_START);
    for (;;) {
      if (wetN() >= 4) {
        all = true;
        break;
      }
      p.pick = null;
      p.active = true;
      while (!p.pick) yield null;
      p.active = false;
      if (p.pick === 'cancel') break;
      const s = SPOTS[p.cur];
      if (p.light > LOW_OK) {
        yield* runMsg(T.NR_TAKAI);
        continue;
      }
      if (!s.wet) {
        yield* runMsg(T.NR_KAWAITA);
        continue;
      }
      if (flag(NF.wet) & (1 << p.cur)) continue;
      p.scoop = 500;
      se('se_c3_kosogeru', { vol: 0.3, pitch: 0.8 });
      yield 500;
      setFlag(NF.wet, flag(NF.wet) | (1 << p.cur));
      se('se_item', { vol: 0.35 });
      yield* runMsg(T.nrKaki(wetN()));
      if (p.cur === 0 && !flag(NF.mizu)) {
        setFlag(NF.mizu, 1);
        yield* runMsg(T.NR_KAKI_MIZU);
      }
    }
  } finally {
    yield* closePanel(p);
  }
  return all;
}

/** 3 しく。true：平らに しけた。 */
function* shiku(): Co<boolean> {
  const p = new YukaPanel('shiku');
  p.auto = qaAuto;
  p.autoBumpy = qaBumpy;
  let ok = false;
  try {
    yield* openPanel(p);
    yield* say(T.NR_SHIKU_START);
    for (;;) {
      p.pick = null;
      p.active = true;
      while (!p.pick) yield null;
      p.active = false;
      if (p.pick === 'cancel') break;
      if (!p.flat()) {
        if (!flag(NF.taira)) setFlag('flag_nr_bumpy', 1);
        yield* runMsg(T.NR_TAIRA);
        continue;
      }
      ok = true;
      yield 300;
      yield* runMsg(T.NR_SHIKU_END);
      break;
    }
  } finally {
    yield* closePanel(p);
  }
  return ok;
}

// ================================================================ 台本

/** 4〜6：牛が 前から 寝る、寝るか 寝んか、ごほうび。 */
function* ojigi(): Co {
  // the window goes up: 南4 is under the bottom one
  forceBoxPos('top');
  try {
    yield* ojigiScene();
  } finally {
    forceBoxPos(null);
  }
}

function* ojigiScene(): Co {
  NR_COWS.t = 0;
  yield 600;
  yield* runMsg(T.NR_OJIGI_A);
  // the first one folds its front knees, then lets its hind end down
  while (NR_COWS.t < 520 * 2 + 200) yield null;
  yield* runMsg(T.NR_OJIGI_B);
  while (NR_COWS.t < 520 * 3 + 300) yield null;
  yield* say(T.NR_OJIGI_C);
  while (NR_COWS.t < NR_COW_GAP * 2 + 520 * 3 + 300) yield null;
  yield* runMsg(T.NR_OJIGI_D);
  setFlag(NF.neta, 1);
  NR_COWS.t = -1;
  if (flag('flag_fushigi_ch2_08') && !flag(NF.hansuu) && kanenariHere()) {
    setFlag(NF.hansuu, 1);
    yield* say(T.NR_HANSUU);
  }
  yield* say(kanenariHere() ? T.NR_NERUKA : T.NR_NERUKA_SOLO);
  if (flag('flag_ch2_barn_work') && !flag(NF.work)) {
    setFlag(NF.work, 1);
    yield* runMsg(T.NR_WORK);
  }
  setFlag(NF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.NR_REWARD);
}

registerWorldFx({
  map: BARN,
  update(_f, dt) {
    if (NR_COWS.t >= 0) NR_COWS.t += dt;
  },
});

/** 南4の 飼槽。 */
registerScript('obj_hoshi_minami4', function* (ctx: ScriptCtx): Co {
  se('se_examine');
  if (flag(NF.done) || flag(NF.neta)) {
    yield* runMsg(T.NR_AFTER);
    return;
  }
  if (!nrOpen() || choresOn()) {
    yield* ctx.runDefault();
    return;
  }
  if (!flag(NF.start)) {
    if (!flag(NF.kiritsu)) {
      setFlag(NF.kiritsu, 1);
      yield* say(T.NR_KIRITSU);
    } else yield* runMsg(T.NR_KIRITSU_AGAIN);
    return;
  }
  if (!flag(NF.fork)) {
    yield* runMsg(T.NR_GEN_FORK);
    return;
  }
  if (!flag(NF.kaki)) {
    const all = yield* kakidasu();
    if (!all) {
      yield* runMsg(T.NR_STOP);
      return;
    }
    setFlag(NF.kaki, 1);
    setFlag(NF.load, 1);
    yield* say(T.NR_KAKI_END);
    return;
  }
  const load = flag(NF.load);
  if (load === 1) {
    yield* runMsg(T.NR_GEN_SUTE);
    return;
  }
  if (load !== 2) {
    yield* runMsg(T.NR_GEN_YAMA);
    return;
  }
  // 3 しく（耳の あいさつが すんでいれば、ふくじんづけが 先に 転がる）
  if (flag('flag_mimi_awase') && !flag(NF.fuku)) {
    setFlag(NF.fuku, 1);
    yield* runMsg(T.NR_FUKU);
  }
  const ok = yield* shiku();
  if (!ok) {
    yield* runMsg(T.NR_STOP);
    return;
  }
  setFlag(NF.load, 0);
  setFlag(NF.taira, flag('flag_nr_bumpy') ? 2 : 1);
  yield* ojigi();
});

/** 前室の フォークと ネコ車。 */
registerScript('obj_hoshi_fork', function* (): Co {
  se('se_examine');
  if (!nrOpen() || !flag(NF.start) || flag(NF.done)) {
    yield* runMsg(T.NR_FORK_BEFORE);
    return;
  }
  if (flag(NF.fork)) {
    yield* runMsg(T.NR_FORK_OUT);
    return;
  }
  setFlag(NF.fork, 1);
  se('se_item', { vol: 0.5 });
  yield* say(T.NR_FORK);
});

/** 稲わらの 屋根の 下の おがくずの 山。 */
registerScript('obj_hoshi_ogakuzu_yama', function* (ctx: ScriptCtx): Co {
  se('se_examine');
  if (!nrOpen() || !flag(NF.kaki) || flag(NF.taira)) {
    if (flag(NF.done) || nrOpen()) yield* runMsg(T.NR_YAMA);
    else yield* ctx.runDefault();
    return;
  }
  const load = flag(NF.load);
  if (load === 1) {
    yield* say(T.NR_YAMA_SAKI);
    return;
  }
  if (load === 2) {
    yield* runMsg(T.NR_YAMA);
    return;
  }
  setFlag(NF.load, 2);
  se('se_c3_kosogeru', { vol: 0.3, pitch: 1.2 });
  yield* say(T.NR_TSUMU);
});

/** 堆肥舎（ぬれた おがくずを あける。ほかの ときは 今の 文）。 */
wrap('obj_hoshi_taihisha', function* (_ctx, orig): Co {
  if (nrOpen() && flag(NF.load) === 1) {
    se('se_c3_kosogeru', { vol: 0.3, pitch: 0.7 });
    setFlag(NF.load, 0);
    setFlag(NF.sute, 1);
    yield* say(T.NR_SUTE);
    return;
  }
  yield* orig();
});

/** マサル（h1 牛舎・h2 ゲートの 横／牛舎）。 */
wrap(GEN, function* (_ctx, orig): Co {
  if (!nrOpen() || choresOn()) {
    yield* orig();
    return;
  }
  if (flag(NF.done)) {
    if (!flag(NF.after) && onMap(BARN)) {
      setFlag(NF.after, 1);
      yield* runMsg(T.NR_GEN_AFTER);
      return;
    }
    yield* orig();
    return;
  }
  if (!flag(NF.start)) {
    if (!flag(NF.kiritsu)) {
      yield* orig();
      return;
    }
    setFlag(NF.start, 1);
    yield* say(T.NR_YUKA);
    if (hStage() === 2 && onMap(VILLAGE)) {
      yield* runMsg(T.NR_YUKA_H2);
      // he goes back down to the barn (from now on at the east end of its feed aisle, until it is done)
      const g = npc(GEN);
      if (g) sendAway(g, [[49, 19], [49, 20], [49, 21]], 2.5, 150, true);
    }
    return;
  }
  if (!flag(NF.fork)) {
    yield* runMsg(T.NR_GEN_FORK);
    return;
  }
  if (!flag(NF.kaki)) {
    yield* runMsg(T.NR_GEN_GO);
    return;
  }
  if (flag(NF.load) === 2) {
    yield* runMsg(T.NR_GEN_SHIKU);
    return;
  }
  yield* runMsg(flag(NF.sute) ? T.NR_GEN_YAMA : T.NR_GEN_SUTE);
});

// ---- ネコ車（グソっ君が 押す。運ぶ 間だけ）

registerWorldFx({
  map: '',
  anchored: true,
  draw(f, g, cx, cy, layer) {
    if (layer !== 'top') return;
    if (!nrOpen() || !flag(NF.fork) || flag(NF.taira)) return;
    if (f.map.id !== BARN && f.map.id !== VILLAGE) return;
    const fo = f.follower;
    if (!fo?.visible) return;
    const right = fo.dir === 'right' || (fo.dir !== 'left' && f.player.x >= fo.x);
    const ax = fo.x + (right ? 6 : -6);
    const [x, y] = fxAt(f, ax, fo.y, cx, cy, fo.y);
    drawBarrow(g, x, y, right, flag(NF.load));
  },
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.neru(step = 'minami4', stage = 'h1', auto = false)（ゲートが 開いた あと）
 *   'minami4'  南4の 飼槽の 前 (15,6) 下向き（ここだけ 起立）
 *   'gen'      起立を 見た あと、マサルの 前（h1 牛舎 (19,6) 右向き／h2 ゲートの 横 (49,19) 右向き）
 *   'fork'     〔yuka〕の あと、前室の フォークの 前 (2,7) 左向き
 *   'kaki'     フォークを 持って、南4の 前（大写し）
 *   'sute'     かき出した あと、堆肥舎の 前 (49,44) 上向き
 *   'yama'     あけた あと、おがくずの 山の 前 (50,23) 上向き
 *   'shiku'    積んだ あと、南4の 前（しく → 寝る）。'bumpy' は auto で いちど 山を 残す
 *   'after'    すんだ あと、南4の 前
 */
if (import.meta.env.DEV) {
  registerDebug('neru', (step = 'minami4', stg = 'h1', auto = false) => {
    if (stg === 'h2') cmd().jump?.('ch2:hill', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(NF)) setFlag(id, 0);
    setFlag('flag_nr_bumpy', 0);
    NR_COWS.t = -1;
    qaAuto = !!auto || step === 'bumpy';
    qaBumpy = step === 'bumpy';
    setFlag('flag_ch2_gate_open', 1);
    setFlag('flag_ch2_gate_wait', 0);
    const h2 = hStage() === 2;
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    const atM4 = () => go(BARN, 15, 6, 'down');
    if (step === 'minami4') return atM4();
    setFlag(NF.kiritsu, 1);
    if (step === 'gen') return h2 ? go(VILLAGE, 49, 19, 'right') : go(BARN, 19, 6, 'right');
    setFlag(NF.start, 1);
    if (step === 'fork') return go(BARN, 2, 7, 'left');
    setFlag(NF.fork, 1);
    if (step === 'kaki') return atM4();
    setFlag(NF.wet, 0b1110001);
    setFlag(NF.mizu, 1);
    setFlag(NF.kaki, 1);
    setFlag(NF.load, 1);
    if (step === 'sute') return go(VILLAGE, 49, 44, 'up');
    setFlag(NF.load, 0);
    setFlag(NF.sute, 1);
    if (step === 'yama') return go(VILLAGE, 50, 23, 'up');
    setFlag(NF.load, 2);
    if (step === 'shiku' || step === 'bumpy') return atM4();
    setFlag(NF.load, 0);
    setFlag(NF.taira, 1);
    setFlag(NF.neta, 1);
    setFlag(NF.done, 1);
    return atM4();
  });

  registerDebug('nrState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(NF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof YukaPanel) as YukaPanel | undefined;
    const f = field();
    return {
      flags,
      wet: wetN(),
      open: nrOpen(),
      stage: hStage(),
      cows: NR_COWS.t,
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { mode: p.mode, light: p.light, cur: p.cur, piles: p.piles.join(','), active: p.active } : null,
      band: bandUp ? band.text() : '',
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no clock time; none of chapter 2's banned words; the names without さん in the narration. */
export function nrTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'まだ', 'いただきます', '3人', '12人', '1日2本', '海', '水族館', 'らっきょ', '具足', 'ほどよいなぁ'];
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
        if (/\d+:\d\d/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('nr', T.NR_TEXTS);
  // the bands fit the screen (384 px less the gutters), the right column its words
  for (const b of [NR_UI.bandKaki, NR_UI.bandShiku, NR_UI.bandSute, NR_UI.bandYama, NR_UI.bandBack]) if (measure(b) + 20 > 384 - 16) bad.push(`帯: ${measure(b)}px: ${b}`);
  if (measure(NR_UI.light) + 50 > SX + CW - RX) bad.push('右の 列: 灯り');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('nrText', () => nrTextCheck());
