// はく 前に、ふる（第2章。げむきか 10/21 の 案4、2026-10-21 依頼主の 採用。02_ch2_index #111）。
// 文は data/text/hoshi_kutsu.ts、みました帳の ページは ui/menu/book_kutsu.ts、長靴と 杭の 絵は art/props/kutsu_art.ts、
// 置き場所は data/maps/hoshi_village.ts。
//
//   段階0〜2（クリア後の 夜は 足さない：寄り合いの 夜の 長靴の 話なので）。グソっ君が いなくても 進む（台詞は 抜く）。
//   ・トマじい（棚田の 4段目の 畦 (21,11)）：段階0 は〔h0_1〕の あと、段階1〜2 は〔h1_1〕〔h1_2〕〔h2_1〕の どれかの
//     あと、もう 1回 話すと〔kutsu〕（1 ぽとん：トマじいが 長靴を ふる → アマガエル、2 たまげる）flag_ku_start。
//     ごはん 一粒、花 一つ（hana.ts）の 用が あれば そちらが 先。段階0 は ここまで（昇降口の 外は 暗い）。
//   ・長靴 6足 obj_hoshi_nagagutsu（分校の 昇降口の 外、像の 東 (29,28)。(29,29) から 北向き）：トマトの 灯り
//     （段階1〜2）で 大写し「長靴」KuPanel。6足から 選んで（どの 順でも）逆さに して ←→か けってい で ふる。
//     1足ごとに 出方が ちがう（会議の 注文：同じ 手順の くり返しに しない）：
//       区長 コオロギ（ころん）・ぴょん夫人 アマガエル（はりつく → もう 1回）・まつ先生 からっぽ・
//       タケじい ナメクジ（ふっても 出ない → 何も 押さずに 待つ。急かすと 角を ひっこめる。やめても よい）・
//       シゲじい カマドウマ（跳んで ひとりで 草へ）・スギばあ 小さな クモ（糸で 下りる）。
//     1足目だけ 3回、2足目から 2回で 出る。のせる 文も 2回目から 短く。ふった 足は 地図の 絵で まっすぐ そろう。
//   ・出てきた 物は 手の ひらに（flag_ku_te）→ 校庭の すみの 草 obj_hoshi_kutsu_kusa（(27,30) の 下草。手に いる 間
//     だけ。(27,29) から 南向き など）で 1つずつ 草へ（flag_ku_kaeshi）。6足目の あと グソっ君の 番。
//   ・6足 ふって 手が 空いたら トマじい → 4 帰したれ（帰した 数で 1行）→ 5 朱肉 +2、みました帳②の すみ（flag_ku_done）。
//   ・かくし：農具小屋の 杭（prop_h_kutsu_kui (34,13)、(34,14) から 北向き）を 見た → 4 で トマじいと グソっ君。
//     寝言しりとり（flag_ch2_negoto_n）→ スギばあの 長靴の あと 寝言。捕まえない 自由研究（flag_ch2_mushi_done）→
//     はじめて 草へ 帰した とき グソっ君。どれも 1回。
//   ・エンディングの カット2d の あと（済んでいれば）、朝の 昇降口の 外の そろった 長靴を 1こま（台詞なし、ending.ts）。
//
// QA：__game.cmd.kutsu(step, auto)、kuState()、kuText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { freeSpan } from '../../engine/safezones';
import { animate, ease } from '../../engine/tween';
import { flag, hasItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field, type FieldScene } from '../../world/field';
import { fxAt, registerWorldFx } from '../../world/fx';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { drawTape, drawWindow, textW, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_kutsu';
import { KU_BOOTS, KU_MON_ORDER, KU_MONS, KU_UI, type KuMonKey } from '../../data/text/hoshi_kutsu';
import { KU_BOOT_COLOR, KU_FURU_FLAG } from '../../art/props/kutsu_art';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { ch2Open, hStage, lanternOn, npc } from './common';
import { hnTome } from './hana';

export const KF = {
  start: 'flag_ku_start',
  wait: 'flag_ku_wait',
  rule: 'flag_ku_rule',
  /** ふった 足（ビット、KU_BOOTS の 順）。 */
  furu: KU_FURU_FLAG,
  /** 出てきた 生き物（ビット、KU_MON_ORDER の 順）。 */
  deta: 'flag_ku_deta',
  /** 手の ひらに いる 生き物（ビット）。 */
  te: 'flag_ku_te',
  /** 草へ 帰した 生き物（ビット。カマドウマは ひとりで 草へ）。 */
  kaeshi: 'flag_ku_kaeshi',
  teFirst: 'flag_ku_te_first',
  matsu: 'flag_ku_matsu_rule',
  seku: 'flag_ku_seku',
  knBan: 'flag_ku_kn_ban',
  negoto: 'flag_ku_negoto',
  jiyuu: 'flag_ku_jiyuu',
  seenKui: 'flag_ku_seen_kui',
  kui: 'flag_ku_kui',
  done: 'flag_ku_done',
  after: 'flag_ku_tome_after',
} as const;

const monBit = (k: KuMonKey) => 1 << KU_MON_ORDER.indexOf(k);
const bits = (n: number) => {
  let c = 0;
  for (let v = n; v; v >>= 1) c += v & 1;
  return c;
};

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

/** 寄り道の 時：第2章の 夜（段階0〜2）、クリア後の 夜は 足さない。 */
export function kuOpen(): boolean {
  const s = hStage();
  return s >= 0 && s <= 2 && ch2Open() && !pgOn();
}

/** 長靴が ふれる：段階1〜2、トマトの 灯り。 */
function kuLit(): boolean {
  const s = hStage();
  return kuOpen() && s >= 1 && lanternOn();
}

/** 1足 すんだ（ふった、中の 物が 出た）。 */
function bootDone(i: number): boolean {
  const b = KU_BOOTS[i];
  if (!(flag(KF.furu) & (1 << i))) return false;
  return !b.mon || (flag(KF.deta) & monBit(b.mon)) > 0;
}
export function kuShaken(): number {
  return bits(flag(KF.furu) & 63);
}
export function kuReturned(): number {
  return bits(flag(KF.kaeshi) & 31);
}
function allDone(): boolean {
  return KU_BOOTS.every((_, i) => bootDone(i));
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

// ================================================================ 大写し「長靴」

const PX = 8;
const PY = 4;
const PW = 368;
const PH = 136;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（ふる 間）。 */
const RX = SX + 216;

/** 逆さの 長靴（1マス：上から 底・足・足首・筒・ふち）。[y, x0, x1, 'c'|'d'|'l'|'s'] */
const BOOT_ROWS: [number, number, number, string][] = [
  [0, -5, 8, 's'],
  [1, -5, 8, 'c'],
  [2, -5, 8, 'c'],
  [3, -5, 5, 'c'],
  [4, -5, 4, 'c'],
  ...Array.from({ length: 15 }, (_, k) => [5 + k, -5, 4, 'c'] as [number, number, number, string]),
  [20, -6, 5, 'l'],
];
const BOOT_H = 21;

function bootColor(i: number, kind: string): string {
  const c = KU_BOOT_COLOR[i];
  if (kind === 's') return '#141418';
  if (kind === 'l') return shade(c, 0.3);
  return c;
}
/** 明るく（t>0）・暗く（t<0）。 */
function shade(c: string, t: number): string {
  const n = parseInt(c.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t))));
  const r = f((n >> 16) & 255);
  const gg = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (gg << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * 長靴 1足の 片方（大写し）。cx：筒の まん中、top：底（逆さ）または 口（立てた とき）の y、s：1マスの 大きさ。
 * swing：ふりの かたむき（底を 持って、口の ほうが ゆれる）。up：逆さ（口が 下）。
 */
function drawBoot(g: Gfx, i: number, cx: number, top: number, s: number, up: boolean, swing = 0, alpha = 1): void {
  g.alpha(alpha, () => {
    for (const [y, x0, x1, kind] of BOOT_ROWS) {
      const ry = up ? y : BOOT_H - 1 - y;
      const off = up ? Math.round(swing * y * 0.9) : 0;
      const c = bootColor(i, kind);
      g.rect(cx + x0 * s + off, top + ry * s, (x1 - x0 + 1) * s, s, c);
      // the light down the left side of the shaft, the shadow down the right
      if (kind === 'c') {
        g.rect(cx + x0 * s + off, top + ry * s, s, s, shade(KU_BOOT_COLOR[i], 0.22));
        g.rect(cx + (Math.min(x1, 4) - 1) * s + off, top + ry * s, s * 2, s, shade(KU_BOOT_COLOR[i], -0.35));
      }
    }
  });
}

/** 生き物の 小さな 絵（大写しの 中。x,y：足もとの まん中、s：大きさ）。 */
function drawMon(g: Gfx, k: KuMonKey, x: number, y: number, s: number, t: number): void {
  const R = (dx: number, dy: number, w: number, h: number, c: string) => g.rect(x + dx * s, y + dy * s, w * s, h * s, c);
  if (k === 'kaeru') {
    R(-4, -4, 8, 4, '#5AA23A');
    R(-3, -5, 6, 1, '#6CB84A');
    R(-4, -6, 2, 2, '#6CB84A');
    R(2, -6, 2, 2, '#6CB84A');
    g.px(x - 3 * s, y - 6 * s, '#141418');
    g.px(x + 3 * s, y - 6 * s, '#141418');
    R(-5, -1, 2, 1, '#4A8A30');
    R(3, -1, 2, 1, '#4A8A30');
    R(-3, -2, 6, 1, '#E8E0B0');
  } else if (k === 'enma') {
    R(-5, -3, 9, 3, '#3A2618');
    R(-5, -3, 3, 3, '#24160C');
    g.px(x - 4 * s, y - 3 * s, '#E8D8B0');
    g.line(x - 5 * s, y - 3 * s, x - 9 * s, y - 7 * s, '#5A4030');
    g.line(x - 5 * s, y - 3 * s, x - 8 * s, y - 8 * s, '#5A4030');
    R(3, -2, 3, 1, '#5A4030');
    R(5, -1, 2, 1, '#5A4030');
  } else if (k === 'kama') {
    // the hunched back, the long hind legs, the very long feelers
    R(-4, -4, 8, 3, '#8A6A44');
    R(-3, -5, 6, 1, '#A8865A');
    g.line(x + 3 * s, y - 2 * s, x + 7 * s, y - 6 * s, '#7A5A38');
    g.line(x + 7 * s, y - 6 * s, x + 8 * s, y, '#7A5A38');
    g.line(x - 4 * s, y - 4 * s, x - 10 * s, y - 9 * s, '#A8865A');
    g.line(x - 4 * s, y - 3 * s, x - 11 * s, y - 6 * s, '#A8865A');
    R(-3, -1, 1, 1, '#7A5A38');
    R(0, -1, 1, 1, '#7A5A38');
  } else if (k === 'name') {
    const wob = Math.round(Math.sin(t / 300));
    R(-5, -2, 10 + wob, 2, '#8A7A68');
    R(-4, -3, 7, 1, '#A8987E');
    g.line(x - 5 * s, y - 2 * s, x - 7 * s, y - 5 * s, '#8A7A68');
    g.line(x - 4 * s, y - 2 * s, x - 5 * s, y - 5 * s, '#8A7A68');
    g.px(x - 7 * s, y - 5 * s, '#3A3028');
    g.px(x - 5 * s, y - 5 * s, '#3A3028');
  } else if (k === 'kumo') {
    R(-1, -3, 3, 3, '#7A6A5A');
    R(-1, -4, 2, 1, '#9A8A76');
    for (const d of [-1, 1]) {
      g.line(x + d * s, y - 2 * s, x + d * 4 * s, y - 4 * s, '#7A6A5A');
      g.line(x + d * s, y - 1 * s, x + d * 4 * s, y, '#7A6A5A');
    }
  }
}

type MonAnim = { k: KuMonKey; mode: 'fall' | 'stuck' | 'jump' | 'thread' | 'crawl'; t0: number };

function bandAt(g: Gfx, text: string): void {
  const w = textW(text) + 20;
  const h = 20;
  const y = 216 - h - 4;
  const span = freeSpan(y, y + h);
  const x = Math.max(span.x0 + 2, Math.min(span.x1 - w - 2, Math.round((384 - w) / 2)));
  markText(x, y, w, h, true);
  g.rect(x, y, w, h, '#1A1626', 0.88);
  g.rect(x, y, w, 1, '#FFE7A3', 0.6);
  g.text(text, x + 10, y + 4, { color: '#FFE7A3' });
}

export class KuPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：待つ 間に 1回 ふる（急かす）。 */
  autoHaste = false;
  /** QA：待つ 間に やめる（1回目）。 */
  autoYame = false;
  active = false;
  phase: 'pick' | 'furu' | 'matsu' = 'pick';
  cur = 0;
  sel = -1;
  pick: 'ok' | 'cancel' | null = null;
  shakes = 0;
  /** ふりの かたむき（-1〜1）と、ふっている 時間。 */
  swing = 0;
  private swingT = 0;
  private swingDir = 1;
  /** 待つ（ナメクジ）：0〜1、急かした。 */
  slug = 0;
  hurried = false;
  mon: MonAnim | null = null;
  /** 出てきた 物の 名札を 出す。 */
  label: string | null = null;
  private autoT = 0;
  private wasActive = false;
  private armT = 0;
  private hasted = false;
  private yamed = false;

  /** 選べる 足（すんでいない）。 */
  choices(): number[] {
    return KU_BOOTS.map((_, i) => i).filter((i) => !bootDone(i));
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.swingT > 0) {
      this.swingT = Math.max(0, this.swingT - dt);
      this.swing = this.swingDir * Math.sin((this.swingT / 220) * Math.PI);
    } else this.swing *= Math.pow(0.01, dt / 1000);
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
    }
    if (this.active) this.armT += dt;
    if (!this.active || this.pick || this.armT < 150) return;
    let lr = 0;
    let ok = false;
    let cancel = false;
    if (this.auto) {
      this.autoT += dt;
      if (this.phase === 'matsu') {
        if (this.autoYame && !this.yamed && this.autoT > 600) {
          this.yamed = true;
          cancel = true;
        } else if (this.autoHaste && !this.hasted && this.autoT > 500) {
          this.hasted = true;
          ok = true;
        }
      } else if (this.autoT >= (this.phase === 'pick' ? 420 : 300)) {
        this.autoT = 0;
        if (this.phase === 'pick') {
          const c = this.choices();
          if (c.length && c[0] !== this.cur) lr = 1;
          else ok = true;
        } else ok = true;
      }
    } else {
      lr = (input.pressed('right') ? 1 : 0) - (input.pressed('left') ? 1 : 0);
      ok = input.pressed('confirm');
      cancel = input.pressed('cancel');
    }
    if (cancel) {
      this.pick = 'cancel';
      return;
    }
    if (this.phase === 'pick') {
      const c = this.choices();
      if (lr && c.length) {
        const at = c.indexOf(this.cur);
        this.cur = c[at < 0 ? 0 : (at + lr + c.length) % c.length];
        se('se_cursor', { vol: 0.3 });
      }
      if (ok && c.includes(this.cur)) this.pick = 'ok';
      return;
    }
    // ふる・急かす（←→ も けってい も 1回 ふる。ゆれて いる 間の 押しは 数えない）
    if ((lr || ok) && this.swingT <= 60) {
      this.swingDir = lr ? lr : -this.swingDir;
      this.swingT = 220;
      se('se_h_kutsu_furu', { vol: 0.5, pitch: this.swingDir > 0 ? 1.05 : 0.95 });
      if (this.phase === 'furu') this.shakes++;
      else {
        this.slug = Math.max(0, this.slug - 0.35);
        this.hurried = true;
      }
    }
    if (this.phase === 'matsu' && !(lr || ok)) this.slug = Math.min(1, this.slug + dt / 3000);
  }

  private drawPick(g: Gfx, oy: number): void {
    const c = this.choices();
    KU_BOOTS.forEach((_, i) => {
      const cx = SX + 32 + i * 59;
      const sel = this.active && i === this.cur;
      const lift = sel ? 3 : 0;
      const done = !c.includes(i);
      // a pair: the right one a little behind
      drawBoot(g, i, cx + 10, oy + CH - 72 - lift, 2, false, 0, done ? 0.4 : 1);
      drawBoot(g, i, cx - 6, oy + CH - 70 - lift, 2, false, 0, done ? 0.4 : 1);
      if (sel) {
        for (let k = 0; k < 4; k++) g.rect(cx + 2 - 3 + k, oy + CH - 84 + k - lift, 7 - k * 2, 1, '#FFE7A3');
      }
    });
    const i = this.cur;
    if (this.active && i >= 0) {
      const name = KU_UI.boot(KU_BOOTS[i].owner);
      const w = g.measure(name) + 16;
      const x = Math.max(SX + 4, Math.min(SX + CW - w - 4, SX + 34 + i * 59 - w / 2));
      g.rect(x, oy + CH - 22, w, 16, '#2A2236');
      g.text(name, x + 8, oy + CH - 20, { color: '#F4ECD8' });
    }
  }

  private drawFuru(g: Gfx, oy: number): void {
    const i = this.sel;
    const cx = SX + 112;
    const top = oy + 6;
    const s = 4;
    const ground = oy + CH - 10;
    // the tomato's light from below on the ground, under the mouth
    for (let r = 46; r > 0; r -= 8) g.alpha(0.06, () => g.circle(cx, ground + 2, r, '#F28A3A'));
    g.rect(SX, ground, RX - SX - 4, CH - (ground - oy), '#2A241E');
    g.rect(SX, ground, RX - SX - 4, 1, '#4A3E30');
    for (let k = 0; k < 9; k++) g.px(SX + 10 + k * 23, ground + 4 + (k % 3) * 3, '#5A6A3A');
    if (i < 0) return;
    // the hands at the sole (しゅん's)
    const sw = this.swing * 0.6;
    drawBoot(g, i, cx, top, s, true, sw);
    g.rect(cx - 5 * s - 8, top + 1, 9, 11, '#F2C8A0');
    g.rect(cx - 5 * s - 8, top + 1, 2, 11, '#C89A7A');
    g.rect(cx + 9 * s - 1, top + 1, 9, 11, '#F2C8A0');
    g.rect(cx + 9 * s + 6, top + 1, 2, 11, '#C89A7A');
    // the mouth: dark, and the light going in from below
    const mo = Math.round(sw * 20 * 0.9);
    const my = top + BOOT_H * s;
    g.rect(cx - 5 * s + mo, my, 10 * s, 3, '#0E0C10');
    g.rect(cx - 4 * s + mo, my, 8 * s, 1, '#5A3A22');
    // the one that comes out
    const m = this.mon;
    if (m) {
      const dt = this.t - m.t0;
      const mx = cx + mo;
      if (m.mode === 'stuck') {
        drawMon(g, m.k, mx - 6, my - 4 + Math.round(Math.sin(this.t / 400)), 3, this.t);
      } else if (m.mode === 'fall') {
        const k = Math.min(1, dt / 380);
        drawMon(g, m.k, mx, Math.round(my + (ground - my) * k * k), 3, this.t);
      } else if (m.mode === 'crawl') {
        // inside the shaft, coming down slowly to the mouth (then dropping softly)
        const k = this.slug;
        if (k < 1) drawMon(g, m.k, mx + 2, Math.round(my - 26 + 26 * k), 3, this.t);
        else drawMon(g, m.k, mx, Math.round(my + (ground - my) * Math.min(1, dt / 700)), 3, this.t);
      } else if (m.mode === 'thread') {
        const k = Math.min(1, dt / 1400);
        const y = Math.round(my + (ground - 6 - my) * k);
        g.line(mx, my, mx, y - 4, '#D8D8E0');
        drawMon(g, m.k, mx, y, 3, this.t);
      } else if (m.mode === 'jump') {
        const k = Math.min(1, dt / 700);
        const x = mx + Math.round(k * 220);
        const y = Math.round(my + (ground - my) * k - Math.sin(k * Math.PI) * 60);
        if (k < 1) drawMon(g, m.k, x, y, 3, this.t);
      }
    }
    // the right column: whose boot, how many, what came out
    g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
    g.text(KU_UI.boot(KU_BOOTS[i].owner), RX, oy + 6, { color: '#F4ECD8' });
    g.text(KU_UI.count(kuShaken()), RX, oy + 30, { color: '#C8C0D8' });
    g.text(KU_UI.mons(bits(flag(KF.deta))), RX, oy + 48, { color: '#C8C0D8' });
    if (this.label) {
      g.rect(RX - 2, oy + 74, SX + CW - RX - 2, 20, '#3A3046');
      g.text(this.label, RX + 2, oy + 78, { color: '#FFE7A3' });
    }
    // the shakes (one dot each) while shaking
    if (this.phase === 'furu' && this.active) for (let k = 0; k < Math.min(6, this.shakes); k++) g.circle(RX + 4 + k * 10, oy + 106, 2, '#E8C878');
    if (this.phase === 'matsu') {
      g.rect(RX, oy + 104, 100, 5, '#1A1626');
      g.rect(RX + 1, oy + 105, Math.round(98 * this.slug), 3, '#A8987E');
    }
    markText(RX - 4, oy, SX + CW - RX + 4, CH);
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
        // the night under the eave of the school, the tomato's warm light
        g.rect(SX, oy, CW, CH, '#141820');
        g.rect(SX, oy, CW, 3, '#0B0B14');
        if (this.phase === 'pick') {
          for (let r = 120; r > 0; r -= 20) g.alpha(0.035, () => g.circle(SX + CW / 2, oy + CH - 20, r, '#F28A3A'));
          g.rect(SX, oy + CH - 30, CW, 30, '#2A241E');
          g.rect(SX, oy + CH - 30, CW, 1, '#4A3E30');
          this.drawPick(g, oy);
          g.text(KU_UI.count(kuShaken()), SX + CW - 64, oy + 6, { color: '#C8C0D8' });
        } else this.drawFuru(g, oy);
      });
      const tw = g.measure(KU_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, KU_UI.place, { seed: 93 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
    if (this.active && this.open >= 1) bandAt(g, this.phase === 'pick' ? KU_UI.bandPick : this.phase === 'matsu' ? KU_UI.bandMatsu : KU_UI.bandFuru);
  }
}

function* openPanel(p: KuPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: KuPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
let qaHaste = false;
let qaYame = false;

function* waitPick(p: KuPanel): Co<'ok' | 'cancel'> {
  p.pick = null;
  p.active = true;
  while (!p.pick) yield null;
  p.active = false;
  return p.pick;
}

/** n 回 ふる（やめた とき false）。 */
function* shake(p: KuPanel, n: number): Co<boolean> {
  p.shakes = 0;
  p.pick = null;
  p.active = true;
  while (p.shakes < n && !p.pick) yield null;
  p.active = false;
  const ok = p.pick !== 'cancel';
  p.pick = null;
  yield 260;
  return ok;
}

/** 手の ひらに のせる。 */
function* carry(k: KuMonKey): Co {
  setFlag(KF.te, flag(KF.te) | monBit(k));
  const first = !flag(KF.teFirst);
  setFlag(KF.teFirst, 1);
  yield* runMsg(T.kuTe(KU_MONS[k].word, first, kanenariHere()));
}

function* out(p: KuPanel, k: KuMonKey, mode: MonAnim['mode'], ms: number): Co {
  p.mon = { k, mode, t0: p.t };
  yield ms;
  p.label = KU_MONS[k].name;
  setFlag(KF.deta, flag(KF.deta) | monBit(k));
}

/** 1足（すんだ とき true）。 */
function* oneBoot(p: KuPanel, i: number): Co<boolean> {
  const b = KU_BOOTS[i];
  p.sel = i;
  p.phase = 'furu';
  p.mon = null;
  p.label = null;
  const retry = (flag(KF.furu) & (1 << i)) > 0;
  if (!retry) {
    // the first boot of all takes three shakes, the others two
    if (!(yield* shake(p, kuShaken() === 0 ? 3 : 2))) return false;
    setFlag(KF.furu, flag(KF.furu) | (1 << i));
  }
  if (b.key === 'kucho') {
    se('se_h_kutsu_poton', { vol: 0.5, pitch: 1.2 });
    yield* out(p, 'enma', 'fall', 450);
    yield* say(T.KU_OUT.kucho);
    yield* carry('enma');
  } else if (b.key === 'yoshie') {
    p.mon = { k: 'kaeru', mode: 'stuck', t0: p.t };
    se('se_h_kutsu_peta', { vol: 0.4 });
    yield* runMsg(T.KU_OUT.yoshie);
    if (!(yield* shake(p, 1))) {
      // (shaken once more next time: it is still stuck)
      setFlag(KF.furu, flag(KF.furu) & ~(1 << i));
      return false;
    }
    se('se_h_kutsu_poton', { vol: 0.5 });
    yield* out(p, 'kaeru', 'fall', 450);
    yield* say(T.KU_KAERU_OCHI);
    yield* carry('kaeru');
  } else if (b.key === 'fumi') {
    p.label = KU_UI.karappo;
    yield 200;
    yield* say(T.KU_OUT.fumi);
  } else if (b.key === 'take') {
    p.mon = { k: 'name', mode: 'crawl', t0: p.t };
    p.slug = 0;
    if (!retry) yield* runMsg(T.KU_OUT.take);
    if (!flag(KF.matsu)) {
      setFlag(KF.matsu, 1);
      yield* runMsg(T.KU_MATSU);
    }
    p.phase = 'matsu';
    p.hurried = false;
    p.pick = null;
    p.active = true;
    while (p.slug < 1 && !p.pick) {
      if (p.hurried && !flag(KF.seku)) {
        setFlag(KF.seku, 1);
        p.active = false;
        yield* runMsg(T.KU_SEKU);
        p.active = true;
      }
      p.hurried = false;
      yield null;
    }
    p.active = false;
    const yame = p.pick === 'cancel';
    p.pick = null;
    if (yame) {
      yield* runMsg(T.KU_NAME_YAME);
      return false;
    }
    p.mon.t0 = p.t;
    se('se_h_kutsu_poton', { vol: 0.25, pitch: 0.7 });
    yield 720;
    p.label = KU_MONS.name.name;
    setFlag(KF.deta, flag(KF.deta) | monBit('name'));
    yield* say(T.KU_NAME_DETA);
    yield* carry('name');
  } else if (b.key === 'shige') {
    se('se_h_kutsu_pyon', { vol: 0.6 });
    yield* out(p, 'kama', 'jump', 720);
    // it goes to the grass by itself
    setFlag(KF.kaeshi, flag(KF.kaeshi) | monBit('kama'));
    yield* say(T.KU_OUT.shige);
  } else if (b.key === 'sugi') {
    yield* out(p, 'kumo', 'thread', 1450);
    yield* runMsg(T.KU_OUT.sugi);
    yield* carry('kumo');
    if (flag('flag_ch2_negoto_n') && !flag(KF.negoto)) {
      setFlag(KF.negoto, 1);
      yield 300;
      yield* runMsg(T.KU_NEGOTO);
    }
  }
  return true;
}

/** 3 逆さに して、ふる。 */
function* furuGame(): Co {
  const p = new KuPanel();
  p.auto = qaAuto;
  p.autoHaste = qaHaste;
  p.autoYame = qaYame;
  try {
    yield* openPanel(p);
    p.cur = p.choices()[0] ?? 0;
    if (!flag(KF.rule)) {
      setFlag(KF.rule, 1);
      yield* runMsg(T.KU_RULE);
    }
    for (;;) {
      p.phase = 'pick';
      p.sel = -1;
      const c = p.choices();
      if (!c.length) break;
      if (!c.includes(p.cur)) p.cur = c[0];
      if ((yield* waitPick(p)) === 'cancel') break;
      se('se_h_kutsu_furu', { vol: 0.4, pitch: 0.8 });
      yield* oneBoot(p, p.cur);
      p.mon = null;
      p.label = null;
      // グソっ君の 番：6足目の あと（1回）
      if (kuShaken() === 6 && !flag(KF.knBan) && kanenariHere()) {
        setFlag(KF.knBan, 1);
        p.phase = 'pick';
        p.cur = 0;
        yield 300;
        yield* runMsg(T.KU_KN_BAN);
      }
    }
  } finally {
    yield* closePanel(p);
  }
  if (kuShaken() === 6 && flag(KF.te)) yield* runMsg(T.KU_KUSA_HINT);
}

// ================================================================ トマじい：1 ぽとん（長靴を ふる 動き）

/** トマじいの 足もとの カエル（ぽとん → 田の 水の ほうへ ぴょん）。 */
const frog = { on: false, x: 0, y: 0, t: 0 };

registerWorldFx({
  map: 'map_hoshimidai',
  anchored: true,
  update(_f: FieldScene, dt: number) {
    if (frog.on) frog.t += dt;
  },
  draw(f: FieldScene, g: Gfx, cx: number, cy: number, layer) {
    if (!frog.on || layer !== 'fg') return;
    const t = frog.t;
    // drop (0–300), sit (–1300), three hops to the west (the paddy)
    let x = frog.x;
    let h = 0;
    if (t < 300) h = Math.round((1 - t / 300) * 10);
    else if (t > 1300) {
      const k = Math.min(3, (t - 1300) / 380);
      x -= Math.round(k * 9);
      h = Math.round(Math.abs(Math.sin(k * Math.PI)) * 5);
      if (k >= 3) return;
    }
    const [sx, sy] = fxAt(f, x, frog.y, cx, cy);
    g.rect(sx - 2, sy - 3 - h, 5, 3, '#5AA23A');
    g.px(sx - 2, sy - 4 - h, '#6CB84A');
    g.px(sx + 2, sy - 4 - h, '#6CB84A');
  },
});

function* tomeFuru(): Co {
  const a = npc('npc_hoshi_tome');
  yield* runMsg(T.KU_A0);
  if (a) {
    for (let k = 0; k < 4; k++) {
      a.ox = k % 2 ? -1 : 1;
      se('se_h_kutsu_furu', { vol: 0.4, pitch: 0.9 + k * 0.05 });
      yield 160;
    }
    a.ox = 0;
    frog.on = true;
    frog.t = 0;
    frog.x = a.x + 6;
    frog.y = a.y + 2;
  }
  se('se_h_kutsu_poton', { vol: 0.5 });
  yield 500;
}

// ================================================================ トマじいの 用

/** 話の 用が 先に ある（課長の 話、名前の 石、マルの 伝言。hana.ts と 同じ）。 */
function storyFirst(): boolean {
  if (state.taken['sym_hoshi_03'] && state.taken['sym_hoshi_06'] && !flag('flag_seen_npc_hoshi_tome_kacho_done')) return true;
  if (hasItem('item_namae_ishi') && !flag('flag_ch2_sawa_ishi')) return true;
  return !flag('flag_ch2_maru_told') && (flag('flag_maru_dengon') > 0 || flag('flag_met_maru') > 0);
}

function heardTome(): boolean {
  if (hStage() === 0) return flag('flag_seen_npc_hoshi_tome_h0_1') > 0;
  return ['h1_1', 'h1_2', 'h2_1'].some((k) => flag(`flag_seen_npc_hoshi_tome_${k}`) > 0);
}

/** 4 帰したれ → 5 ごほうび。 */
function* kaeshitare(): Co {
  const kn = kanenariHere();
  yield* say(T.KU_D_A);
  const words = KU_MON_ORDER.filter((k) => flag(KF.kaeshi) & monBit(k)).map((k) => KU_MONS[k].word);
  if (words.length) yield* runMsg(T.kuNames(words, kn));
  yield* say(kuReturned() >= 5 ? T.KU_D_ALL : T.KU_D_NETORU);
  if (flag(KF.seenKui) && !flag(KF.kui)) {
    setFlag(KF.kui, 1);
    yield* say(T.KU_D_KUI);
  }
  yield* say(kn ? T.KU_D_KIME : T.KU_D_KIME_SOLO);
  setFlag(KF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.KU_REWARD);
}

/** トマじいの 用（した とき true）。 */
export function* kuTome(): Co<boolean> {
  if (!kuOpen() || !onMap('map_hoshimidai') || storyFirst()) return false;
  if (!flag(KF.start)) {
    if (!heardTome()) return false;
    if (hStage() >= 1 && !lanternOn()) return false;
    setFlag(KF.start, 1);
    yield* tomeFuru();
    yield* say(T.KU_A);
    frog.on = false;
    yield* say(T.KU_B);
    return true;
  }
  if (!flag(KF.done)) {
    if (!kuLit()) return false;
    if (kuShaken() >= 6 && !flag(KF.te)) {
      yield* kaeshitare();
      return true;
    }
    if (kuShaken() >= 6) {
      yield* say(T.KU_TE);
      return true;
    }
    if (flag(KF.wait)) return false;
    setFlag(KF.wait, 1);
    yield* say(T.KU_WAIT);
    return true;
  }
  if (!flag(KF.after)) {
    setFlag(KF.after, 1);
    yield* say(T.KU_TOME_AFTER);
    return true;
  }
  return false;
}

wrap('npc_hoshi_tome', function* (_ctx, orig): Co {
  // ごはん 一粒、花 一つ（hana.ts）の 用が 先（その 用が ない とき、hana の 包みは 何も しない）
  if (kuOpen() && (yield* hnTome())) return;
  if (yield* kuTome()) return;
  yield* orig();
});

// ================================================================ 長靴・草・杭

registerScript('obj_hoshi_nagagutsu', function* (): Co {
  se('se_examine');
  if (flag(KF.done) || hStage() >= 3) {
    yield* runMsg(T.KU_SOROE);
    return;
  }
  if (!kuLit()) {
    yield* runMsg(T.KU_KURAI);
    return;
  }
  if (!flag(KF.start)) {
    yield* runMsg(T.KU_BEFORE);
    return;
  }
  if (allDone()) {
    yield* runMsg(T.KU_SOROE);
    return;
  }
  yield* furuGame();
});

registerScript('obj_hoshi_kutsu_kusa', function* (): Co {
  const te = flag(KF.te);
  if (!te) {
    se('se_examine');
    return;
  }
  for (const k of KU_MON_ORDER) {
    if (!(te & monBit(k))) continue;
    se('se_h_kutsu_kusa', { vol: 0.5 });
    setFlag(KF.te, flag(KF.te) & ~monBit(k));
    setFlag(KF.kaeshi, flag(KF.kaeshi) | monBit(k));
    yield* runMsg(T.kuKaesu(KU_MONS[k].word));
    if (flag('flag_ch2_mushi_done') && !flag(KF.jiyuu) && kanenariHere()) {
      setFlag(KF.jiyuu, 1);
      yield* say(T.KU_JIYUU);
    }
  }
  field()?.refreshPresence();
});

registerScript('obj_h_kutsu_kui', function* (): Co {
  se('se_examine');
  setFlag(KF.seenKui, 1);
  yield* runMsg(T.KU_KUI);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.kutsu(step = 'tome', auto = false)（h1 トマトの 灯り。'h0' だけ 段階0）
 *   'tome'   〔h1_1〕を 聞いた あと、トマじいの 前 (21,12) 上向き（話すと〔kutsu〕）
 *   'h0'     段階0、〔h0_1〕を 聞いた あと、トマじいの 前（〔kutsu〕の 1・2 だけ）
 *   'kutsu'  はじめた あと、長靴の 前 (29,29) 上向き（auto：選んで ふる。'haste' は 待つ 間に 急かす、'yame' は 1回 やめる）
 *   'kusa'   6足 ふった あと（手の ひらに 4つ）、草の 前 (27,29) 下向き
 *   'back'   ぜんぶ 帰した あと、トマじいの 前（4 → 5）。'back4' は ナメクジを 待たなかった 形
 *   'kui'    農具小屋の 杭の 前 (34,14) 上向き
 *   'after'  すんだ あと、トマじいの 前
 *   'soroe'  すんだ あと、長靴の 前
 */
if (import.meta.env.DEV) {
  registerDebug('kutsu', (step = 'tome', auto = false) => {
    if (step === 'h0') cmd().jump?.('ch2:', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(KF)) setFlag(id, 0);
    frog.on = false;
    qaAuto = !!auto || step === 'haste' || step === 'yame';
    qaHaste = step === 'haste';
    qaYame = step === 'yame';
    // the hidden lines' conditions (all three)
    setFlag('flag_ch2_negoto_n', 1);
    setFlag('flag_ch2_mushi_done', 1);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'h0') {
      setFlag('flag_seen_npc_hoshi_tome_h0_1', 1);
      setFlag('flag_hn_h0', 1);
      return go('map_hoshimidai', 21, 12, 'up');
    }
    setFlag('flag_seen_npc_hoshi_tome_h1_1', 1);
    // ごはん 一粒、花 一つ は すんだ ことに（トマじいの 用が 重ならない）
    setFlag('flag_hn_start', 1);
    setFlag('flag_hn_done', 1);
    setFlag('flag_hn_tome_after', 1);
    if (step === 'tome') return go('map_hoshimidai', 21, 12, 'up');
    if (step === 'kui') return go('map_hoshimidai', 34, 14, 'up');
    setFlag(KF.start, 1);
    setFlag(KF.wait, 1);
    if (step === 'kutsu' || step === 'haste' || step === 'yame') return go('map_hoshimidai', 29, 29, 'up');
    setFlag(KF.rule, 1);
    setFlag(KF.teFirst, 1);
    setFlag(KF.matsu, 1);
    setFlag(KF.knBan, 1);
    setFlag(KF.negoto, 1);
    setFlag(KF.furu, 63);
    const four = step === 'back4';
    const all = KU_MON_ORDER.reduce((n, k) => n | monBit(k), 0);
    const deta = four ? all & ~monBit('name') : all;
    setFlag(KF.deta, deta);
    if (step === 'kusa') {
      setFlag(KF.te, deta & ~monBit('kama'));
      setFlag(KF.kaeshi, monBit('kama'));
      return go('map_hoshimidai', 27, 29, 'down');
    }
    setFlag(KF.kaeshi, deta);
    setFlag(KF.seenKui, 1);
    setFlag(KF.jiyuu, 1);
    if (step === 'back' || step === 'back4') return go('map_hoshimidai', 21, 12, 'up');
    setFlag(KF.kui, 1);
    setFlag(KF.done, 1);
    if (step === 'soroe') return go('map_hoshimidai', 29, 29, 'up');
    return go('map_hoshimidai', 21, 12, 'up');
  });

  registerDebug('kuState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(KF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof KuPanel) as KuPanel | undefined;
    const f = field();
    return {
      flags,
      open: kuOpen(),
      lit: kuLit(),
      shaken: kuShaken(),
      returned: kuReturned(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { phase: p.phase, cur: p.cur, sel: p.sel, shakes: p.shakes, slug: +p.slug.toFixed(2), mon: p.mon?.k ?? null, active: p.active } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no clock time; none of chapter 2's banned words; the names without さん in the narration. */
export function kuTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'まだ', 'いただきます', '3人', '12人', '1日2本', 'おまけの 1つ', '海', '水族館', '具足', 'ほどよい', 'らっきょ', '焼き芋', 'さすが 師匠', '寝る〜', 'トマトは 作っとらん', 'おかわり', '干しすぎ', 'ダンゴムシ'];
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
          if (!t.startsWith('!')) flush();
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
  walkT('ku', T.KU_TEXTS);
  // the panel's labels and the band
  const col = SX + CW - RX - 4;
  for (const b of KU_BOOTS) {
    if (measure(KU_UI.boot(b.owner)) > col) bad.push(`右の 列: ${KU_UI.boot(b.owner)}`);
    if (measure(KU_UI.boot(b.owner)) + 16 > CW - 8) bad.push(`札: ${KU_UI.boot(b.owner)}`);
  }
  for (const k of KU_MON_ORDER) if (measure(KU_MONS[k].name) + 4 > col) bad.push(`名札: ${KU_MONS[k].name}`);
  for (const l of [KU_UI.count(6), KU_UI.mons(5), KU_UI.karappo]) if (measure(l) > col) bad.push(`右の 列: ${l}`);
  for (const b of [KU_UI.bandPick, KU_UI.bandFuru, KU_UI.bandMatsu]) if (measure(b) + 20 > 384 - 16) bad.push(`帯: ${measure(b)}px: ${b}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('kuText', () => kuTextCheck());
