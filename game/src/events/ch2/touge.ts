// 雲の 下にも、郵便受け（第2章。げむきか 10/29 の 案5、2026-10-29 依頼主の 採用。02_ch2_index）。
// 文は data/text/hoshi_touge.ts、新しい 地図は data/maps/hoshi_touge.ts（map_hoshi_touge「峠の カーブ」、24×12、
// 横に 約1.5画面）、絵は art/props/touge_art.ts、みました帳の ページは ui/menu/book_touge.ts。
//
//   段階1〜2（トマトの 灯り）。段階0・段階3・クリア後の 夜は 足さない（県道の 西の はしは 今の 文の まま）。
//   グソっ君が いなくても 進む（グソっ君の 台詞は 抜く。道の 順の まちがいは 地の文）。
//   ・転回場の さんかど（バスの うしろ (39,41)）：今の 段階の いつもの 会話を ひととおり（h1_2・h2_2）聞いた あと、
//     もう 1回 話すと〔kumo〕（flag_ks2_told、大事なもの『さんかどの 手紙 3通』item_ks2_tegami）。頭の 上に「！」。
//   ・県道の 西の はし（村の (0,38–39)、trig_ch2_edge_road）：〔kumo〕の あとの 段階1〜2 だけ、ぶつかると 暗転で 峠の
//     カーブ (22,5) へ（道の 続き。人が 絵の 中へ 歩いて 入る 形では ない）。それ以外は 今の 文の まま
//     （第2章の 通しテストは〔kumo〕を 聞かないので、道の 判定は 変わらない）。
//   ・峠の カーブ：入ると すぐ 2 山の 上の 海（1回）。ガードレールの 見晴らし (16–19,9) を 調べると 大写し「雲の 海」
//     KumoPanel：雲の 海と、雲から 出た 3つの 目印（高台の お寺の 屋根・丘の 神社の 大杉・尾根の 鉄塔の 頭）、峠から
//     雲の 下へ 下りる 県道の 線（雲の 下の 所は 点線、目印の 横で 雲から 出る 所は 太い 線）。
//     ① 行き先：手紙を 1通ずつ（えんぴつの メモ）、←→ で 島を 選んで けってい。ちがっても 失敗に しない（何度でも）。
//     ② 道の 順：峠から 県道の 線を たどって、通る 順に 島を 1つずつ。ちがうと グソっ君「坂を 2回 のぼるで」（何度でも）。
//     もどる で やめても、きまった 行き先・順は 残る（続きから）。
//   ・物 5つ（カーブミラー・標柱・反射板・ガードレール・見晴らし）。西の はしは「この 先は、朝の バスで。」。
//   ・さんかどに 話す → 4 道の 順 → 5 雲の 下にも → ごほうび（flag_ks2_done、朱肉 +2、ページ。手紙は 返す）。
//     かくし：1回も まちがえない（flag_ks2_miss 0）・『あした』宛ての 手紙（flag_ch2_tegami）・カーブミラー（グソっ君）。
//
// QA：__game.cmd.touge(step, stage, auto, miss)、ksState()、ksText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { addItem, flag, hasItem, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { actorAnchor, addMarkSource } from '../../world/marks';
import { drawTape, drawWindow, UI } from '../../ui/window';
import type { Howto } from '../../ui/closeup';
import * as T from '../../data/text/hoshi_touge';
import { KS_MEMO, KS_UI } from '../../data/text/hoshi_touge';
import { HOSHI_OBJ } from '../../data/text/hoshi_objects';
import { KS_IN_AT, TOUGE } from '../../data/maps/hoshi_touge';
import { KS_KUMO } from '../../art/props/touge_art';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { ch2Open, hStage, lanternOn } from './common';

export const KF = {
  /** 寄り道の 始まり（〔kumo〕を 聞いた）。 */
  start: 'flag_ks2_start',
  told: 'flag_ks2_told',
  wait: 'flag_ks2_wait',
  wait2: 'flag_ks2_wait2',
  /** 〔kumo〕の あと、はじめて 県道の 西の はしに ぶつかった。 */
  edge: 'flag_ks2_edge',
  /** はじめて 峠の カーブに 入った（2 山の 上の 海）。 */
  first: 'flag_ks2_first',
  /** 調べた 物（ビット：1 カーブミラー・2 標柱・4 反射板・8 ガードレール・16 見晴らし）。 */
  mono: 'flag_ks2_mono',
  mirror: 'flag_ks2_mirror',
  /** 行き先が きまった 手紙（3つの ビット）。 */
  ate: 'flag_ks2_ate',
  /** 道の 順に 並べた 数（0〜3）。 */
  jun: 'flag_ks2_jun',
  /** まちがえた 数。 */
  miss: 'flag_ks2_miss',
  done: 'flag_ks2_done',
  kyoku: 'flag_ks2_kyoku',
  ashita: 'flag_ks2_ashita',
  after: 'flag_ks2_after',
} as const;

const VILLAGE = 'map_hoshimidai';
const SANKADO = 'npc_hoshi_busdriver';
const ITEM = 'item_ks2_tegami';
/** 手紙 i の 行き先の 島（0 お寺・1 大杉・2 鉄塔）。 */
export const KS_DEST = [2, 1, 0];
/** 県道を 峠から 下る ときに 通る 島の 順。 */
export const KS_ORDER = [0, 1, 2];

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

/** 寄り道が 開いている：段階1〜2、トマトの 灯り、クリアの 前。 */
export function ksOpen(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn() && !pgOn() && !flag('flag_ch2_boss_beaten');
}

const bits = (v: number, n: number): number => {
  let c = 0;
  for (let k = 0; k < n; k++) if (v & (1 << k)) c++;
  return c;
};
export const ksAteN = (): number => bits(flag(KF.ate), 3);
export const ksMonoN = (): number => bits(flag(KF.mono), 5);

function look(bit: number): void {
  setFlag(KF.mono, flag(KF.mono) | bit);
}

function wrap(id: string, fn: (ctx: ScriptCtx, orig: () => Co) => Co): void {
  const prev = getScript(id);
  registerScript(id, function* (ctx): Co {
    const orig = function* (): Co {
      if (prev) yield* prev(ctx);
      else if (ctx.runDefault) yield* ctx.runDefault();
    };
    yield* fn(ctx, orig);
  });
}

/** 今の 段階の いつもの 会話を ひととおり 聞いた（h1_2・h2_2）。 */
const heardAll = (): boolean => flag(`flag_seen_${SANKADO}_h${hStage()}_2`) > 0;

// ================================================================ 見のがさない しるし

addMarkSource((f) => {
  if (f.map.id !== VILLAGE || !ksOpen()) return null;
  const a = f.actorById(SANKADO);
  if (!a || !a.visible) return null;
  if (!flag(KF.told) && heardAll()) return actorAnchor(a);
  if (flag(KF.jun) >= 3 && !flag(KF.done)) return actorAnchor(a);
  return null;
});
addMarkSource((f) => {
  if (f.map.id !== VILLAGE || !ksOpen() || !flag(KF.told) || flag(KF.first)) return null;
  const foot = 39 * 16;
  return { x: 8, y: foot - 30, foot };
});
addMarkSource((f) => {
  if (f.map.id !== TOUGE || !ksOpen() || !hasItem(ITEM) || flag(KF.jun) >= 3) return null;
  const foot = 10 * 16;
  return { x: 18 * 16, y: foot - 30, foot };
});

// ================================================================ 大写し「雲の 海」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列。 */
const RX = SX + 208;
const SW = RX - SX - 4;
const KEYS_Y = 98;
/** 島の 位置（絵の 中、左上から。0 お寺〈近い〉・1 大杉・2 鉄塔〈遠い〉）と 大きさ。 */
const ISLE: { x: number; y: number; s: number }[] = [
  { x: 166, y: 80, s: 1.7 },
  { x: 50, y: 62, s: 1.3 },
  { x: 120, y: 50, s: 1 },
];
/** 県道：峠（手前 左下）→ 雲の ふち → 島 0 → 島 1 → 島 2 の 横 → 遠く。 */
const ROAD: [number, number][] = [
  [6, CH],
  [26, 100],
  [46, 92],
  [118, 86],
  [ISLE[0].x - 14, ISLE[0].y + 8],
  [ISLE[0].x + 6, ISLE[0].y + 10],
  [130, 70],
  [ISLE[1].x + 18, ISLE[1].y + 6],
  [ISLE[1].x - 4, ISLE[1].y + 8],
  [70, 46],
  [ISLE[2].x - 10, ISLE[2].y + 5],
  [ISLE[2].x + 8, ISLE[2].y + 6],
  [170, 36],
];
/** 県道が 雲から 出て 見える 区間（ROAD の 何番目から 何番目）：峠から 雲の ふちまで、島の 横 3つ。 */
const ROAD_SEEN: [number, number][] = [
  [0, 2],
  [4, 5],
  [7, 8],
  [10, 11],
];

type Phase = 'idle' | 'pick';

export class KumoPanel implements Widget {
  modal = true;
  /** 大写し（engine/touch.ts：絵の 外の タッチも けってい）。 */
  closeup = true;
  /** やり方の カード（ui/closeup.ts。はじめての 1回）。 */
  howto: Howto = KS_UI.howto;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  /** QA：auto で まちがえる 回数（はじめに）。 */
  autoMiss = 0;
  phase: Phase = 'idle';
  /** 'ate' 行き先・'jun' 道の 順。 */
  mode: 'ate' | 'jun' = 'ate';
  /** 今の 手紙（行き先の とき）。 */
  letter = 0;
  cur = 0;
  picked = -1;
  hit = false;
  /** 合った 島が 光る（0..1）。 */
  glow = 0;
  glowI = -1;
  private autoT = 0;

  /** 島 i が 今 選べる（行き先：まだ 手紙の ない 島、順：まだ 番号の ない 島）。 */
  free(i: number): boolean {
    if (i < 0 || i > 2) return false;
    if (this.mode === 'ate') return !KS_DEST.some((d, k) => d === i && flag(KF.ate) & (1 << k));
    return KS_ORDER.indexOf(i) >= flag(KF.jun);
  }

  /** 画面の 左から 右の 順（←→ の 動き）。 */
  private static readonly LR = [1, 2, 0];

  private step(d: number): void {
    const at = KumoPanel.LR.indexOf(this.cur);
    for (let n = 1; n < 3; n++) {
      const j = at + d * n;
      if (j < 0 || j > 2) return;
      const i = KumoPanel.LR[j];
      if (this.free(i)) {
        this.cur = i;
        se('se_cursor', { vol: 0.3 });
        return;
      }
    }
  }

  /** QA：auto の 正しい 答え。 */
  private want(): number {
    if (this.mode === 'ate') return KS_DEST[this.letter];
    return KS_ORDER[flag(KF.jun)] ?? 0;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.glowI >= 0) this.glow = Math.max(0, this.glow - dt / 900);
    if (this.phase !== 'pick') return;
    if (this.auto) {
      this.autoT += dt;
      if (Math.floor(this.autoT / 260) === Math.floor((this.autoT - dt) / 260)) return;
      let want = this.want();
      if (this.autoMiss > 0) {
        const wrong = [0, 1, 2].find((i) => i !== want && this.free(i));
        if (wrong !== undefined) want = wrong;
      }
      if (this.cur !== want) {
        const a = KumoPanel.LR.indexOf(this.cur);
        const b = KumoPanel.LR.indexOf(want);
        this.step(b > a ? 1 : -1);
        if (this.cur !== want && !this.free(this.cur)) this.cur = want;
      } else {
        if (this.autoMiss > 0 && want !== this.want()) this.autoMiss--;
        this.picked = this.cur;
        this.hit = true;
      }
      return;
    }
    if (input.pressed('left')) this.step(-1);
    else if (input.pressed('right')) this.step(1);
    else if (input.pressed('confirm')) {
      this.picked = this.cur;
      this.hit = true;
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
        g.clip(SX, oy, SW, CH, () => this.drawScene(g, oy));
        this.drawSide(g, oy);
      });
      const tw = g.measure(KS_UI.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, KS_UI.place, { seed: 113 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  private drawScene(g: Gfx, oy: number): void {
    const X = SX;
    // the sky before dawn (blue-black, a little paler low in the east), a few stars
    g.rect(X, oy, SW, CH, '#1E2440');
    g.rect(X, oy + 18, SW, 10, '#2A3050');
    g.alpha(0.35, () => g.circle(X + SW - 20, oy + 26, 30, '#4A4A6A'));
    for (let i = 0; i < 18; i++) g.px(X + ((i * 53) % SW), oy + 2 + ((i * 29) % 16), i % 4 ? '#C8D0F0' : '#FFF6D8');
    // the far ridges
    for (let x = 0; x < SW; x += 2) {
      const r = 24 + Math.round(4 * Math.sin(x / 23) + 2 * Math.sin(x / 7 + 1));
      g.rect(X + x, oy + r, 2, 40 - r, '#141228');
    }
    // the sea of cloud: soft rows of white, paler near (lower), the far edge against the ridges
    g.rect(X, oy + 32, SW, CH - 32, KS_KUMO[2]);
    for (let row = 0; row < 14; row++) {
      const y = oy + 32 + row * 6;
      const col = row < 3 ? KS_KUMO[3] : row < 7 ? KS_KUMO[2] : row < 11 ? KS_KUMO[1] : KS_KUMO[0];
      for (let x = 0; x < SW; x += 3) {
        const b = Math.round(2 * Math.sin(x / (9 + row) + row * 1.7 + this.t / 4000));
        g.rect(X + x, y + b, 3, 5, col);
      }
    }
    // the road: hidden under the cloud (faint dots), out of it beside each island (a bold line)
    for (let k = 0; k + 1 < ROAD.length; k++) {
      const [x0, y0] = ROAD[k];
      const [x1, y1] = ROAD[k + 1];
      const seen = ROAD_SEEN.some(([a, b]) => k >= a && k < b);
      const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / (seen ? 1 : 4)));
      for (let s = 0; s <= n; s++) {
        const x = X + Math.round(x0 + ((x1 - x0) * s) / n);
        const y = oy + Math.round(y0 + ((y1 - y0) * s) / n);
        if (seen) {
          // the road out of the cloud: a dark band with the warm line on it (bold: the thing to follow)
          g.rect(x - 2, y - 2, 5, 5, '#6A6478');
          g.rect(x - 1, y - 1, 3, 3, '#FFC860');
        } else if (s % 2 === 0) g.rect(x, y, 2, 2, '#7A84A8');
      }
    }
    // its name on a little board where it goes into the cloud
    const lw = measure(KS_UI.road) + 6;
    g.rect(X + 34, oy + 86, lw, 17, '#2A2440');
    g.frame(X + 34, oy + 86, lw, 17, '#FFC860');
    g.text(KS_UI.road, X + 37, oy + 87, { color: '#FFE7A3' });
    // the islands
    const jun = flag(KF.jun);
    for (let i = 0; i < 3; i++) this.drawIsle(g, i, X + ISLE[i].x, oy + ISLE[i].y, ISLE[i].s);
    // a letter on each island whose destination is known; its number once in the road's order
    for (let k = 0; k < 3; k++) {
      if (!(flag(KF.ate) & (1 << k))) continue;
      const i = KS_DEST[k];
      const ex = X + ISLE[i].x + Math.round(8 * ISLE[i].s);
      const ey = oy + ISLE[i].y - Math.round(18 * ISLE[i].s) - 4;
      g.rect(ex, ey, 9, 6, '#FBF3DC');
      g.frame(ex, ey, 9, 6, '#8A5A3A');
      g.line(ex, ey, ex + 4, ey + 3, '#8A5A3A');
      g.line(ex + 8, ey, ex + 4, ey + 3, '#8A5A3A');
      const n = KS_ORDER.indexOf(i);
      if (n < jun) {
        g.circle(ex - 4, ey + 2, 5, '#E23B2E');
        g.text(String(n + 1), ex - 7, ey - 5, { color: '#FFF6D8' });
      }
    }
    // the cursor: a little arrow over the island
    if (this.phase === 'pick') {
      const c = ISLE[this.cur];
      const x = X + c.x;
      const top = oy + c.y - Math.round(28 * c.s) - 10;
      const b = Math.round(Math.sin(this.t / 160) * 1.5);
      // a ring on the cloud round its foot, and a bigger arrow over it (dark-edged: it shows on the white cloud)
      g.alpha(0.7 + 0.3 * Math.sin(this.t / 200), () => g.ring(x, oy + c.y, Math.round(16 * c.s), '#FFC860'));
      g.rect(x - 5, top + b - 1, 11, 3, '#2A2440');
      g.rect(x - 4, top + b, 9, 2, '#FFE7A3');
      g.rect(x - 3, top + 2 + b, 7, 2, '#FFE7A3');
      g.rect(x - 2, top + 4 + b, 5, 2, '#FFE7A3');
      g.rect(x - 1, top + 6 + b, 3, 2, '#FFE7A3');
    }
    // the guardrail in front (dark, its top lit by the stars) and the tomato low at the left
    g.rect(X, oy + CH - 6, SW, 2, '#6A7088');
    g.rect(X, oy + CH - 4, SW, 1, '#3A3E50');
    for (let x = 10; x < SW; x += 26) g.rect(X + x, oy + CH - 6, 2, 6, '#3A3E50');
    g.circle(X + 12, oy + CH - 12, 4, '#E23B2E');
    g.rect(X + 11, oy + CH - 17, 2, 2, '#4E7A34');
  }

  /** 雲から 出た 目印（0 お寺の 屋根・1 大杉・2 鉄塔の 頭）。 */
  private drawIsle(g: Gfx, i: number, x: number, y: number, s: number): void {
    const glow = this.glowI === i ? this.glow : 0;
    const dark = glow > 0 ? '#5A5070' : '#2A2840';
    const lit = '#DCE4F4';
    const u = (v: number) => Math.round(v * s);
    if (i === 0) {
      g.rect(x - u(12), y - u(5), u(24), u(5), dark);
      g.rect(x - u(9), y - u(8), u(18), u(3), dark);
      g.rect(x - u(9), y - u(8), u(18), 1, lit);
      g.rect(x - u(14), y - u(2), 2, 2, dark);
      g.rect(x + u(14) - 2, y - u(2), 2, 2, dark);
      g.rect(x - u(9), y - u(11), 2, u(3), dark);
      g.rect(x + u(9) - 2, y - u(11), 2, u(3), dark);
    } else if (i === 1) {
      for (let k = 0; k < 6; k++) {
        const w = u(2 + k * 2.2);
        g.rect(x - (w >> 1), y - u(22) + u(k * 3.6), w, u(3.6) + 1, k % 2 ? dark : '#24304A');
      }
      g.px(x, y - u(22) - 1, lit);
    } else {
      // the pylon: two legs narrowing upward, X braces between them, three crossarms, the top's small arm
      const top = y - u(24);
      const L = (k: number) => x - Math.round(u(6) - (u(6) - 1) * k);
      const R = (k: number) => x + Math.round(u(6) - (u(6) - 1) * k);
      g.line(L(0), y, L(1), top, dark);
      g.line(R(0), y, R(1), top, dark);
      for (let k = 0; k < 4; k++) {
        const a = k / 4;
        const b = (k + 1) / 4;
        const ya = Math.round(y - (y - top) * a);
        const yb = Math.round(y - (y - top) * b);
        g.line(L(a), ya, R(b), yb, dark);
        g.line(R(a), ya, L(b), yb, dark);
      }
      for (const [k, a] of [[0.55, 9], [0.75, 10], [0.92, 8]] as const) {
        const yy = Math.round(y - (y - top) * k);
        g.rect(x - u(a), yy, u(a) * 2 + 1, 1, dark);
        g.rect(x - u(a), yy - 1, u(a) * 2 + 1, 1, lit);
        g.px(x - u(a), yy + 1, dark);
        g.px(x + u(a), yy + 1, dark);
      }
      g.rect(x, top - u(4), 1, u(4), dark);
      g.rect(x - u(3), top - u(3), u(3) * 2 + 1, 1, dark);
    }
    // the cloud lapping round its foot
    for (let k = -u(16); k <= u(16); k += 3) g.rect(x + k, y - 1 + (Math.abs(k) % 2), 4, 3, KS_KUMO[1]);
    if (glow > 0) g.alpha(glow * 0.5, () => g.ring(x, y - u(10), u(18), '#FFE7A3'));
  }

  /** 右の 列：今の 手紙の メモ（行き先）／道の 順の 数。 */
  private drawSide(g: Gfx, oy: number): void {
    const x = RX - 4;
    const w = SX + CW - RX + 4;
    g.rect(x, oy, w, CH, '#262238');
    if (this.mode === 'ate') {
      g.text(KS_UI.ateHead(ksAteN()), RX, oy + 3, { color: '#F4ECD8' });
      // the letter: an envelope, the faded address (lines), the pencil memo under it
      const ex = RX + 4;
      const ey = oy + 22;
      g.rect(ex, ey, w - 16, 30, '#FBF3DC');
      g.frame(ex, ey, w - 16, 30, '#8A5A3A');
      for (let k = 0; k < 3; k++) g.rect(ex + 8, ey + 7 + k * 6, 40 - k * 8, 1, '#B8AC98');
      g.text(KS_UI.letter(this.letter), ex + 54, ey + 4, { color: '#8A5A3A' });
      const memo = memoLines(KS_MEMO[this.letter]);
      memo.forEach((l, k) => g.text(l, RX, oy + 58 + k * 15, { color: '#C8D0F0' }));
    } else {
      g.text(KS_UI.junHead(flag(KF.jun)), RX, oy + 3, { color: '#F4ECD8' });
      // the three letters in the road's order (numbered as they are placed)
      for (let n = 0; n < 3; n++) {
        const ey = oy + 22 + n * 22;
        const done = n < flag(KF.jun);
        if (done) g.circle(RX + 6, ey + 7, 6, '#E23B2E');
        else g.ring(RX + 6, ey + 7, 6, '#8A84A0');
        g.text(String(n + 1), RX + 3, ey, { color: '#FFF6D8' });
        if (done) {
          g.rect(RX + 18, ey + 2, 14, 10, '#FBF3DC');
          g.frame(RX + 18, ey + 2, 14, 10, '#8A5A3A');
          g.text(KS_UI.shima[KS_ORDER[n]], RX + 38, ey, { color: '#C8D0F0' });
        }
      }
    }
    const key = this.phase === 'pick' ? (this.mode === 'ate' ? KS_UI.keys.ate : KS_UI.keys.jun) : '';
    if (key) g.text(key, RX, oy + KEYS_Y, { color: '#FFE7A3' });
    markText(x, oy, w, CH);
  }
}

/** えんぴつの メモ（『…』）を 右の 列に 入る 2行に（空白で 切る）。 */
export function memoLines(m: string): string[] {
  const col = SX + CW - RX - 2;
  const full = `『${m}』`;
  if (measure(full) <= col) return [full];
  // the most even cut at a space that fits
  const parts = m.split(' ');
  let best: string[] = [full];
  let bw = Infinity;
  for (let k = 1; k < parts.length; k++) {
    const a = `『${parts.slice(0, k).join(' ')}`;
    const b = `${parts.slice(k).join(' ')}』`;
    const w = Math.max(measure(a), measure(b));
    if (measure(a) <= col && measure(b) <= col && w < bw) {
      bw = w;
      best = [a, b];
    }
  }
  return best;
}

function* openPanel(p: KumoPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: KumoPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

function* waitPick(p: KumoPanel): Co<number> {
  p.hit = false;
  p.phase = 'pick';
  while (!p.hit) yield null;
  p.phase = 'idle';
  return p.picked;
}

function firstFree(p: KumoPanel): number {
  return [1, 2, 0].find((i) => p.free(i)) ?? 0;
}

let qaAuto = false;
let qaMiss = 0;

/** 3 大写し「雲の 海」。きまった 行き先・順は その場で flag に（やめても 残る）。 */
function* kumoGame(): Co {
  const p = new KumoPanel();
  p.auto = qaAuto;
  p.autoMiss = qaMiss;
  try {
    yield* openPanel(p);
    if (!flag(KF.ate) && !flag(KF.jun)) yield* say(T.KS_KUMO_HAJIME);
    // ① each letter's island
    for (let k = 0; k < 3; k++) {
      if (flag(KF.ate) & (1 << k)) continue;
      p.mode = 'ate';
      p.letter = k;
      p.cur = firstFree(p);
      yield* runMsg(T.ksMemoLine(k));
      for (;;) {
        const i = yield* waitPick(p);
        if (i === KS_DEST[k]) {
          setFlag(KF.ate, flag(KF.ate) | (1 << k));
          p.glowI = i;
          p.glow = 1;
          se('se_item', { vol: 0.4 });
          yield 300;
          yield* say(T.KS_ATE_OK[k]);
          if (k < 2) p.letter = k + 1;
          break;
        }
        setFlag(KF.miss, flag(KF.miss) + 1);
        se('se_cancel', { vol: 0.3 });
        yield* say(T.KS_ATE_NG);
      }
    }
    // ② the road's order, one island at a time from the pass down
    if (flag(KF.jun) === 0) {
      p.mode = 'jun';
      yield* say(T.KS_ATE_DONE);
    }
    p.mode = 'jun';
    while (flag(KF.jun) < 3) {
      p.cur = firstFree(p);
      const i = yield* waitPick(p);
      const n = flag(KF.jun);
      if (i === KS_ORDER[n]) {
        setFlag(KF.jun, n + 1);
        p.glowI = i;
        p.glow = 1;
        se('se_page', { vol: 0.5 });
        yield 300;
        if (n < 2) yield* say(T.KS_JUN_OK[n]);
        continue;
      }
      setFlag(KF.miss, flag(KF.miss) + 1);
      se('se_cancel', { vol: 0.3 });
      yield* say(kanenariHere() ? T.KS_JUN_NG : T.KS_JUN_NG_SOLO);
    }
    yield 300;
    yield* say(T.KS_JUN_DONE);
  } finally {
    yield* closePanel(p);
  }
  field()?.refreshPresence?.();
  yield* say(T.KS_JUN_DONE_KN);
}

// ================================================================ 台本：村

/** 県道の 西の はし（ぶつかる・調べる）：〔kumo〕の あとの 段階1〜2 だけ 峠の カーブへ。 */
function* edgeRoad(): Co {
  const f = field();
  if (!f) return;
  if (!ksOpen() || !flag(KF.told)) {
    yield* runMsg(HOSHI_OBJ.obj_hoshi_edge_road as string);
    return;
  }
  if (!flag(KF.edge)) {
    setFlag(KF.edge, 1);
    yield* say(T.KS_EDGE_GO);
  } else if (flag(KF.done)) yield* say(T.KS_EDGE_AFTER);
  yield* f.warpCo(TOUGE, KS_IN_AT[0], KS_IN_AT[1], 'left', 'se_step_asphalt', VILLAGE);
}
registerScript('trig_ch2_edge_road', edgeRoad);
registerScript('obj_hoshi_edge_road', edgeRoad);

/** 〔kumo〕。 */
function* start(): Co {
  setFlag(KF.start, 1);
  setFlag(KF.told, 1);
  yield* say(T.KS_START);
  se('se_item');
  addItem(ITEM);
  yield* runMsg(T.KS_GET);
}

/** 4 道の 順 → 5 雲の 下にも → ごほうび。 */
function* houkoku(): Co {
  yield* say(T.KS_HOUKOKU);
  if (!flag(KF.miss) && !flag(KF.kyoku)) {
    setFlag(KF.kyoku, 1);
    yield* say(T.KS_KYOKU);
  }
  if (flag('flag_ch2_tegami') && !flag(KF.ashita)) {
    setFlag(KF.ashita, 1);
    yield* say(T.KS_ASHITA);
  }
  yield* say(T.KS_KUMO_SHITA);
  removeItem(ITEM);
  setFlag(KF.done, 1);
  addMp(2);
  se('se_item');
  yield* runMsg(T.KS_REWARD);
}

wrap(SANKADO, function* (_ctx, orig): Co {
  const f = field();
  const ready = ksOpen() && f?.map.id === VILLAGE;
  if (ready && flag(KF.jun) >= 3 && !flag(KF.done)) {
    yield* houkoku();
    return;
  }
  if (ready && flag(KF.done) && !flag(KF.after)) {
    setFlag(KF.after, 1);
    yield* say(T.KS_AFTER);
    return;
  }
  if (ready && flag(KF.told) && !flag(KF.done)) {
    if (!flag(KF.first) && !flag(KF.wait)) {
      setFlag(KF.wait, 1);
      yield* say(T.KS_WAIT);
      return;
    }
    if (flag(KF.first) && !flag(KF.wait2)) {
      setFlag(KF.wait2, 1);
      yield* say(T.KS_WAIT2);
      return;
    }
  }
  // the stage's usual talk all heard (h1_2 / h2_2): the next talk is 〔kumo〕
  if (ready && !flag(KF.told) && heardAll()) {
    yield* start();
    return;
  }
  yield* orig();
});

// ================================================================ 台本：峠の カーブ

/** 2 山の 上の 海（入ると すぐ。1回）。 */
registerScript('evt_ks2_enter', function* (): Co {
  if (!ksOpen() || flag(KF.first)) return;
  yield 300;
  setFlag(KF.first, 1);
  yield* say(T.KS_ENTER);
});

registerScript('trig_ks2_west', function* (): Co {
  yield* say(kanenariHere() ? T.KS_WEST : T.KS_WEST_SOLO);
});

registerScript('trig_ks2_back', function* (): Co {
  const f = field();
  if (!f) return;
  yield* f.warpCo(VILLAGE, 1, 38, 'right', 'se_step_asphalt', TOUGE);
});

registerScript('obj_ks2_mirror', function* (): Co {
  se('se_examine');
  look(1);
  if (!flag(KF.mirror) && kanenariHere()) {
    setFlag(KF.mirror, 1);
    yield* say(T.KS_MIRROR_KN);
    return;
  }
  yield* say(T.KS_MIRROR);
});

registerScript('obj_ks2_hyochu', function* (): Co {
  se('se_examine');
  look(2);
  yield* say(T.KS_HYOCHU);
});

registerScript('obj_ks2_hansha', function* (): Co {
  se('se_examine');
  look(4);
  yield* say(T.KS_HANSHA);
});

registerScript('obj_ks2_guard', function* (): Co {
  se('se_examine');
  look(8);
  yield* say(T.KS_GUARD);
});

registerScript('obj_ks2_sugi', function* (): Co {
  se('se_examine');
  yield* say(T.KS_SUGI);
});

registerScript('obj_ks2_miharashi', function* (): Co {
  se('se_examine');
  look(16);
  if (!ksOpen() || !hasItem(ITEM)) {
    yield* say(flag(KF.done) ? T.KS_MIHARASHI_AFTER : T.KS_MIHARASHI);
    return;
  }
  if (flag(KF.jun) >= 3) {
    yield* say(T.KS_MIHARASHI_AFTER);
    return;
  }
  yield* kumoGame();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.touge(step = 'san', stage = 'h1', auto = false, miss = 0)
 *   'san'     いつもの 会話を ひととおり 聞いた あと、さんかどの 前 (39,40) 下向き（話すと〔kumo〕）
 *   'san0'    いつもの 会話の 前、さんかどの 前（h1_1・h1_2 → 3回目で〔kumo〕）
 *   'edge'    〔kumo〕の あと、県道の 西の はしの 3マス 手前 (3,38) 左向き（ぶつかると 峠の カーブ）
 *   'in'      〔kumo〕の あと、峠の カーブの 入口（入った ときの 会話は 起きる）
 *   'mi'      入った あと、見晴らしの 前 (17,10) 上向き（調べると 大写し）
 *   'mono'    入った あと、カーブミラーの 前 (12,12) 下向き
 *   'houkoku' 並べた あと、さんかどの 前
 *   'done'    すんだ あと、県道の 西の はしの 3マス 手前
 *   miss：auto の とき、はじめに まちがえる 回数
 */
if (import.meta.env.DEV) {
  registerDebug('touge', (step = 'san', stg = 'h1', auto = false, miss = 0) => {
    const want = stg === 'h2' ? 2 : 1;
    const inCh2 = (field()?.map.id ?? '').startsWith('map_hoshi');
    if (!inCh2 || hStage() !== want || flag('flag_ch2_boss_beaten')) cmd().jump?.(want === 2 ? 'ch2:hill' : 'ch2:houki', true);
    for (const id of Object.values(KF)) setFlag(id, 0);
    while (hasItem(ITEM)) removeItem(ITEM);
    qaAuto = !!auto;
    qaMiss = Number(miss) || 0;
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    const s = flag('flag_ch2_stage');
    const front: [string, number, number, string] = [VILLAGE, 39, 40, 'down'];
    if (step === 'san0') {
      setFlag(`flag_seen_${SANKADO}_h${s}`, 0);
      setFlag(`flag_seen_${SANKADO}_h${s}_1`, 0);
      setFlag(`flag_seen_${SANKADO}_h${s}_2`, 0);
      return go(...front);
    }
    setFlag(`flag_seen_${SANKADO}_h${s}`, 2);
    setFlag(`flag_seen_${SANKADO}_h${s}_1`, 1);
    setFlag(`flag_seen_${SANKADO}_h${s}_2`, 1);
    if (step === 'san') return go(...front);
    setFlag(KF.start, 1);
    setFlag(KF.told, 1);
    addItem(ITEM);
    if (step === 'edge') return go(VILLAGE, 3, 38, 'left');
    if (step === 'in') return go(TOUGE, KS_IN_AT[0], KS_IN_AT[1], 'left');
    setFlag(KF.edge, 1);
    setFlag(KF.first, 1);
    if (step === 'mi') return go(TOUGE, 17, 10, 'up');
    if (step === 'mono') return go(TOUGE, 12, 12, 'down');
    setFlag(KF.ate, 7);
    setFlag(KF.jun, 3);
    if (step === 'houkoku') return go(...front);
    setFlag(KF.done, 1);
    removeItem(ITEM);
    return go(VILLAGE, 3, 38, 'left');
  });

  registerDebug('ksAuto', (v: unknown = true, miss: unknown = 0) => {
    qaAuto = !!v;
    qaMiss = Number(miss) || 0;
    return qaAuto;
  });

  registerDebug('ksState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(KF)) flags[k] = flag(id);
    const p = game.ui.widgets.find((w) => w instanceof KumoPanel) as KumoPanel | undefined;
    const f = field();
    return {
      flags,
      open: ksOpen(),
      item: hasItem(ITEM),
      ate: ksAteN(),
      mono: ksMonoN(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      panel: p ? { mode: p.mode, letter: p.letter, cur: p.cur, phase: p.phase } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panel's words in their room. */
export function ksTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足', '平和', '3人', '水族館', 'いただきます', 'ほどよい', 'しゃべらん', 'おかわり', '焼き芋 食うか', 'ダンゴムシ', 'ツガオ', 'おはだっちょ', '火の見', 'アスカ', '6:12'];
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
        if (/\d+:\d\d/.test(plain) || /\d+時/.test(plain) || /\d+分/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.replace(/さんかど/g, '').includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('ks', T.KS_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of Object.values(KS_UI.keys)) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  if (measure(KS_UI.ateHead(3)) > col || measure(KS_UI.junHead(3)) > col) bad.push('右の 列: 見出しが はみ出す');
  for (const m of KS_MEMO) for (const l of memoLines(m)) if (measure(l) > col) bad.push(`メモ: ${measure(l)}px > ${col}: ${l}`);
  for (const s of KS_UI.shima) if (38 + measure(s) > SX + CW - RX) bad.push(`右の 列: ${s}`);
  if (KEYS_Y + 14 > CH) bad.push(`keys: bottom ${KEYS_Y + 14} > ${CH}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('ksText', () => ksTextCheck());
