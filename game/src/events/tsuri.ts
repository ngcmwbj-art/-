// ザリガニ釣り「ザリガニは 可」（02_ch2_index #66、10_narrative 7.21、30_level_art 3.13・10.12、
// 40_audio 9.x se_tsuri_*）。おぴぃ（src/events/tamotsu.ts）が 道具を 貸して、
// となりで 見ている。1回 20〜40秒、何度でも。
//
//   画面：フィールドの上に 重ねる 小窓（水口の 断面の 絵。src/art/props/tsuri_art.ts）。
//     しっぽの 先が 水口 (20,41) を さす。カメラは しゅんと おぴぃを 右下に。
//   流れ：場所えらび（← →、決定で 下ろす。もどるで やめる）→ ポチャン、糸が はる
//     → 待つ（ザリガニが 出てきて、ツン……ツン と味見。ここで押すと「早い！」で 逃げる）
//     → ぐいっ（はさんで 横へ 引く。「長押し！」。2.6秒 押さないと 持ってかれる）
//     → 長押しで そーっと 引き上げる：押している間 糸の はり（輪のゲージ）が あがり、
//       ザリガニが 上がる。赤い所（速すぎ）に 入ると「はなす！」、はさむ力が へって、
//       0で「ぽとん」。指を はなすと はりが 下がり、ザリガニは 底へ 戻っていく。
//       水面の 手前ほど 赤い所が 広い。大きいのは 暴れて、はりが はねる。
//     → 水面に 来たら おぴぃの たも網。
//   段階1：時間が 止まっている。3つの 場所に ザリガニが はさみを 開いたまま 止まっていて、
//     するめは その はさみに 落ちる。暴れない、戻らない、はなさない（必ず 取れる）。
//     落ちる 水も、泡も、ゴミも 止まっている。
//   段階2：糸も 水も 北東（右）へ 寄る。土管の ぬしが 出やすい。
//   操作：決定（長押し）と、場所えらびだけ 方向キー。タッチは 絵を 押しても けってい。
//   iPad の全画面（★2026-09-30）：操作ボタンは 下の角に 固定。小窓は その上、ゲージと
//   言葉は 左下の 十字キーの 右（engine/safezones.ts）。言葉と ゲージは brief。
//
// 軽さ：背景は段階ごとに1枚（焼いて とっておく）。毎フレーム 描くのは 小さい物だけ。

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import type { Input } from '../engine/input';
import { markText } from '../engine/textzones';
import { buttonZones, freeSpan } from '../engine/safezones';
import { PixelCanvas } from '../engine/pixel';
import { touchControlsOn } from '../engine/touch';
import { animate, ease } from '../engine/tween';
import { Cues, cueSize } from '../battle/ui/cue';
import { field } from '../world/field';
import { sfx } from '../audio';
import { drawTape, drawWindow, outlinedText, UI } from '../ui/window';
import {
  FLOOR_Y,
  INLET,
  PX_PER_CM,
  SCN_H,
  SCN_W,
  SPOTS,
  SPOT_ORDER,
  WATER_Y,
  baitImg,
  bootImg,
  canImg,
  crayHang,
  crayfish,
  rulerImg,
  sceneBg,
  traceImg,
  type CatchKind,
  type CrayImg,
  type Spot,
} from '../art/props/tsuri_art';
import { SPOT_NAME, TSURI_UI } from '../data/text/tamotsu';

export type { Spot, CatchKind };
type Cray = 'kozari' | 'zari' | 'makka' | 'nushi';

// ---------------------------------------------------------------- 置き場所（画面の px）

/** 小窓（ウィンドウ）と、その中の 断面の絵。 */
const PX = 24;
const PY = 4;
const PW = SCN_W + 8;
const PH = SCN_H + 8;
const SX = PX + 4;
const SY = PY + 4;
/** 糸の はりの 輪（ハンコの ゲージと 同じ 描きかた）。小窓の 左下。 */
const GX = 40;
/** The row a crayfish's feet stand on (the top of the mud). */
const STAND_Y = FLOOR_Y + 1;
const GY = 176;
const GR = 26;
/**
 * The gauge's centre x: the bottom-left corner, or (iPad held sideways, the
 * D-pad fixed in that corner: engine/safezones.ts) just right of the D-pad.
 */
function gaugeX(): number {
  return buttonZones() ? Math.max(GX, freeSpan(GY - GR - 6, GY + GR + 8).x0 + GR + 6) : GX;
}

// ---------------------------------------------------------------- 釣れる物

interface KindSpec {
  /** 体長の はんい（cm）。 */
  cm: [number, number];
  /** 指を はなしたとき 底へ 戻る 速さ（深さ／秒）。 */
  back: number;
  /** 糸の はりが これを 越えると 速すぎ（赤い所の はじまり）。 */
  danger: number;
  /** 速すぎの間、はさむ力が へる 速さ（／秒）。 */
  drain: number;
  /** 暴れる 見こみ（1.8秒に1回の くじ）。 */
  thrash: number;
  /** 底を 歩く 速さ（px／秒）。 */
  walk: number;
}
const KIND: Record<CatchKind, KindSpec> = {
  kozari: { cm: [4, 6], back: 0.035, danger: 0.93, drain: 1.3, thrash: 0, walk: 18 },
  zari: { cm: [7, 9], back: 0.06, danger: 0.86, drain: 1.6, thrash: 0.25, walk: 15 },
  makka: { cm: [10, 12], back: 0.09, danger: 0.8, drain: 1.9, thrash: 0.5, walk: 12 },
  nushi: { cm: [13, 13], back: 0.12, danger: 0.74, drain: 2.2, thrash: 0.8, walk: 9 },
  // 草の 根に 引っかかった 長靴：暴れない、はなさない、重い
  boot: { cm: [0, 0], back: 0.02, danger: 2, drain: 0, thrash: 0, walk: 0 },
  // 空き缶の 中の 小さいの：缶の ぶん 重い
  can: { cm: [3, 5], back: 0.045, danger: 0.9, drain: 1.4, thrash: 0, walk: 14 },
};

/** 場所ごとの 出かた（段階0・2）。長靴は 1回だけ（おぴぃの）。ぬしは 段階2で 出やすい。 */
function weights(spot: Spot, stage: number, bootFound: boolean): [CatchKind, number][] {
  if (spot === 'kusa') return [['kozari', 55], ['zari', 28], ['makka', 5], ['boot', bootFound ? 0 : 12]];
  if (spot === 'ishi') return [['kozari', 25], ['zari', 45], ['makka', 25], ['can', 5]];
  return [['kozari', 10], ['zari', 30], ['makka', 38], ['can', 14], ['nushi', stage === 2 ? 22 : 8]];
}

/** 段階1は 場所ごとに 止まっている ザリガニが 決まっている。 */
const STILL_KIND: Record<Spot, Cray> = { kusa: 'kozari', ishi: 'zari', dokan: 'makka' };

export function rollCatch(spot: Spot, stage: number, o: { bootFound: boolean; dokanDry: number; first: boolean }): CatchKind {
  if (stage === 1) return STILL_KIND[spot];
  // the very first one: a middle-sized one (easy to see), held gently (its spec is eased in playRound)
  if (o.first) return 'zari';
  // the ぬし shows itself at last to someone who keeps trying the pipe
  if (spot === 'dokan' && o.dokanDry >= 7) return 'nushi';
  const w = weights(spot, stage, o.bootFound);
  let total = 0;
  for (const [, n] of w) total += n;
  let r = Math.random() * total;
  for (const [k, n] of w) {
    if ((r -= n) < 0) return k;
  }
  return 'kozari';
}

function rollCm(kind: CatchKind): number {
  const [a, b] = KIND[kind].cm;
  return a + Math.floor(Math.random() * (b - a + 1));
}

// ---------------------------------------------------------------- 小窓

type Phase = 'pick' | 'drop' | 'wait' | 'bite' | 'pull' | 'scoop' | 'card' | 'release' | 'end';

interface Word {
  text: string;
  x: number;
  y: number;
  t: number;
  ms: number;
  color: string;
}

interface CardState {
  kind: CatchKind;
  cm: number;
  /** 0 ザリガニと定規 → 1 数字 → 2 線で消して 盛った数字 → 3 なぞった あと。 */
  step: number;
  /** 盛った（認定の）cm。 */
  cert: number;
  /** 定規を 出さない（ぬし・長靴・缶の 1枚目）。 */
  noRuler?: boolean;
  /** ザリ拓：なぞった線と、ラベル。 */
  label?: string;
  t: number;
}

/** 水の中の ゴミ（ゆっくり 流れる。段階1は 止まる）。 */
interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: string;
}

export class TsuriPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  /** 開く（0..1）。 */
  open = 0;
  phase: Phase = 'pick';
  spot: Spot = 'kusa';
  /** 記録（おぴぃ 認定の いちばん大きい cm）。0 = なし。 */
  record = 0;

  // ---- input (captured by update, taken by the round)
  private eConfirm = false;
  private eCancel = false;
  private eLeft = false;
  private eRight = false;
  hold = false;
  /** QA: the round plays itself (drops at once, holds with a good rhythm). */
  auto = false;
  /** Called as the net goes in and when it has come out (the field shows おぴぃ holding it out). */
  onNet: ((on: boolean) => void) | null = null;

  // ---- the line and the bait (scene px)
  rodX = SPOTS.kusa.x;
  baitX = SPOTS.kusa.x;
  baitY = 20;
  baitOn = true;
  /** The line hangs slack (the bait is gone). */
  slack = false;
  /** 糸が 1回 ぴくっと する（ツン）。 */
  jiggle = 0;

  // ---- the crayfish (its claw tip at (cx, cy), scene px)
  kind: CatchKind = 'kozari';
  cm = 5;
  crayOn = false;
  crayX = 0;
  crayY = 0;
  /** -1 = 左向き（絵のまま）、1 = 右向き。 */
  face: -1 | 1 = -1;
  crayPose: 'walk' | 'grab' | 'hang' | 'flee' = 'walk';
  crayOpen = 0;
  crayA = 1;
  legT = 0;
  /** 底で 止まっている 段階1の ザリガニ（場所ごと）。 */
  still: Partial<Record<Spot, { kind: Cray; cm: number }>> = {};

  // ---- the pull
  tension = 0;
  grip = 1;
  depth = 0;
  danger = 0.9;
  gauge = 0;
  shake = 0;

  // ---- the net (0 = out of sight, 1 = under the catch at the surface, 2 = lifted out)
  net = 0;
  netX = 0;

  card: CardState | null = null;
  cues = new Cues();
  words: Word[] = [];
  motes: Mote[] = [];
  bubbles: { x: number; y: number; v: number }[] = [];
  splash: { x: number; t: number }[] = [];
  /** アメンボ（水面）。 */
  strider = { x: 212, vx: 0, t: 0 };
  /** 場所の しるし（ひげが のぞく、泡、土管の 目）。 */
  tellT = 0;

  constructor(readonly stage: number) {
    for (let i = 0; i < 12; i++)
      this.motes.push({
        x: Math.random() * SCN_W,
        y: WATER_Y + 4 + Math.random() * (FLOOR_Y - WATER_Y - 8),
        vx: 2 + Math.random() * 3,
        vy: (Math.random() - 0.5) * 0.6,
        c: i % 3 === 0 ? '#9BCB6B' : i % 3 === 1 ? '#C8A06A' : '#E8E4D8',
      });
    for (let i = 0; i < 5; i++) this.bubbles.push({ x: INLET[0] - 5 + Math.random() * 10, y: WATER_Y + 6 + Math.random() * 30, v: 10 + Math.random() * 8 });
  }

  /** Motion is frozen in stage 1 (the world stopped at 17:00). */
  get still1(): boolean {
    return this.stage === 1;
  }

  take(k: 'confirm' | 'cancel' | 'left' | 'right'): boolean {
    const key = k === 'confirm' ? 'eConfirm' : k === 'cancel' ? 'eCancel' : k === 'left' ? 'eLeft' : 'eRight';
    const v = this[key];
    this[key] = false;
    return v;
  }
  clearInput(): void {
    this.eConfirm = this.eCancel = this.eLeft = this.eRight = false;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (input.pressed('confirm')) this.eConfirm = true;
    if (input.pressed('cancel')) this.eCancel = true;
    if (input.repeat('left')) this.eLeft = true;
    if (input.repeat('right')) this.eRight = true;
    this.hold = input.down('confirm');
    this.cues.update(dt);
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    this.splash = this.splash.filter((s) => (s.t += dt) < 420);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt / 90);
    if (this.jiggle > 0) this.jiggle = Math.max(0, this.jiggle - dt);
    if (this.card) this.card.t += dt;
    const s = dt / 1000;
    if (!this.still1) {
      const ne = this.stage === 2;
      for (const m of this.motes) {
        m.x += (m.vx + (ne ? 2 : 0)) * s;
        m.y += (m.vy - (ne ? 1.2 : 0)) * s;
        if (m.x > SCN_W) m.x -= SCN_W;
        if (m.y < WATER_Y + 3) m.y = FLOOR_Y - 4;
        if (m.y > FLOOR_Y - 3) m.y = WATER_Y + 4;
      }
      for (const b of this.bubbles) {
        b.y -= b.v * s;
        b.x += (ne ? 4 : 0) * s + Math.sin((this.t + b.v * 100) / 160) * 0.1;
        if (b.y < WATER_Y + 2) {
          b.y = WATER_Y + 18 + Math.random() * 20;
          b.x = INLET[0] - 5 + Math.random() * 10;
        }
      }
      // the water strider: glides now and then, rests
      const st = this.strider;
      st.t -= dt;
      if (st.t <= 0) {
        st.vx = st.vx ? 0 : (Math.random() < 0.5 ? -1 : 1) * (24 + Math.random() * 20);
        st.t = st.vx ? 260 + Math.random() * 200 : 900 + Math.random() * 1800;
      }
      st.x += st.vx * s;
      st.vx *= Math.pow(0.02, s);
      if (st.x < 176) st.vx = Math.abs(st.vx) + 4;
      if (st.x > 292) st.vx = -Math.abs(st.vx) - 4;
      this.tellT += dt;
      this.legT += dt;
    }
  }

  word(text: string, x: number, y: number, color = UI.bg, ms = 700): void {
    this.words.push({ text, x, y, t: 0, ms, color });
  }

  // ---------------------------------------------------------------- drawing

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    const sx = SX + (this.shake > 0 ? Math.round(Math.sin(this.t / 16) * this.shake) : 0);
    const sy = SY + dy;
    // the touch controls keep off the window (it is where the game is)
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      g.clip(SX, sy, SCN_W, SCN_H, () => {
        if (this.card) this.drawCard(g, SX, sy);
        else this.drawScene(g, sx, sy);
      });
      // the tail of the close-up, pointing down at the inlet
      this.drawTail(g, PY + dy + PH);
      // the name of the place on a strip of tape (and ◀ ▶ while choosing)
      if (!this.card) {
        const name = SPOT_NAME[this.spot];
        const tw = g.measure(name) + 16;
        const tx = SX + 8;
        drawTape(g, tx, PY + dy - 5, tw, 16, name, { seed: 3 });
        markText(tx, PY + dy - 5, tw, 16);
        if (this.phase === 'pick') {
          const bob = Math.floor(this.t / 280) % 2;
          this.arrow(g, tx - 7 - bob, PY + dy + 3, -1);
          this.arrow(g, tx + tw + 3 + bob, PY + dy + 3, 1);
        }
        if (this.record > 0 && this.phase === 'pick') {
          const rt = `${TSURI_UI.record} ${this.record}cm`;
          const rw = g.measure(rt) + 14;
          drawTape(g, SX + SCN_W - rw - 6, PY + dy - 5, rw, 16, rt, { seed: 5, color: '#F6D98A' });
          markText(SX + SCN_W - rw - 6, PY + dy - 5, rw, 16);
        }
      }
    });
    if (this.gauge > 0) this.drawGauge(g);
    for (const w of this.words) {
      const p = w.t / w.ms;
      const yy = Math.round(sy + w.y - p * 6);
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, sx + w.x, yy, { color: w.color, outline: UI.border, align: 'center', alpha: al });
      markText(sx + w.x - 30, yy, 60, 16, true);
    }
    this.cues.draw(g, this.t);
  }

  private arrow(g: Gfx, x: number, y: number, dir: -1 | 1): void {
    for (let i = 0; i < 4; i++) {
      const xx = dir < 0 ? x + i : x + 3 - i;
      g.rect(xx, y + 4 - i, 1, 1 + i * 2, UI.pencil);
    }
  }

  private drawTail(g: Gfx, bottom: number): void {
    const [tx] = inletScreen();
    const x = Math.max(PX + 12, Math.min(PX + PW - 12, tx));
    for (let i = 0; i < 5; i++) {
      g.rect(x - 4 + i, bottom - 1 + i, 9 - i * 2, 1, UI.border);
      if (i < 4) g.rect(x - 3 + i, bottom - 2 + i, 7 - i * 2, 1, UI.bg);
    }
  }

  private drawScene(g: Gfx, ox: number, oy: number): void {
    g.img(sceneBg(this.stage), ox, oy);
    const frozen = this.still1;
    const ne = this.stage === 2;
    const t = this.t;
    // ---- the water falling from the inlet pipe into the pool (stage 1: stopped mid-fall)
    const [ix, iy] = INLET;
    const ft = frozen ? 820 : t;
    for (let y = iy + 4; y < WATER_Y; y++) {
      const k = (y - iy - 4) / (WATER_Y - iy - 4);
      const bend = ne ? Math.round(k * k * 7) : Math.round(k * k * 2);
      const x0 = ix - 3 + bend;
      const w = 4 + Math.round(k * 2);
      g.rect(ox + x0, oy + y, w, 1, '#A8D8E0', 0.55);
      if (((y * 3 + Math.floor(ft / 50)) % 5) < 2) g.rect(ox + x0 + 1 + ((y + Math.floor(ft / 90)) % 2), oy + y, 1, 1, '#FFF6D8', 0.9);
    }
    // the splash where it lands, the white water under it
    const lx = ix + (ne ? 6 : 1);
    for (let i = -5; i <= 5; i++) {
      const up = frozen ? (i * i) % 3 : Math.round(Math.abs(Math.sin((t / 90 + i) * 1.7)) * 2);
      g.rect(ox + lx + i, oy + WATER_Y - up, 1, 1 + up, '#FFF6D8', 0.65);
    }
    g.rect(ox + lx - 7, oy + WATER_Y + 1, 15, 2, '#E8F4F0', 0.35);
    // bubbles under the fall
    for (const b of this.bubbles) g.rect(ox + Math.round(b.x), oy + Math.round(b.y), 1, 1, '#E8F4F0', 0.8);
    // surface glints drifting (frozen in stage 1)
    for (let i = 0; i < 14; i++) {
      const x = (i * 53 + (frozen ? 0 : Math.floor(t / 70) * (i % 2 ? 1 : -1))) % SCN_W;
      const xx = x < 0 ? x + SCN_W : x;
      if (xx < 100 && i % 3) continue; // the grass shades the left
      g.rect(ox + xx, oy + WATER_Y + 1 + (i % 3), 3 + (i % 2), 1, '#FFF6D8', 0.5);
    }
    // rings where something went in or came out
    for (const sp of this.splash) {
      const k = sp.t / 420;
      const r = Math.round(3 + k * 12);
      const al = 0.8 * (1 - k);
      g.rect(ox + sp.x - r, oy + WATER_Y, 3, 1, '#FFF6D8', al);
      g.rect(ox + sp.x + r - 2, oy + WATER_Y, 3, 1, '#FFF6D8', al);
      if (k < 0.4) for (let i = -2; i <= 2; i++) g.rect(ox + sp.x + i * 2, oy + WATER_Y - 2 - Math.round((1 - Math.abs(i) / 3) * 5 * Math.sin(k * 7.8)), 1, 1, '#FFF6D8', 0.9);
    }
    // motes in the water
    for (const m of this.motes) g.rect(ox + Math.round(m.x), oy + Math.round(m.y), 1, 1, m.c, 0.55);
    // the water strider on the surface: its body and the four dimples of its feet
    {
      const st = this.strider;
      const x = Math.round(st.x);
      g.rect(ox + x, oy + WATER_Y - 1, 3, 1, '#3A2B24');
      for (const [dx, dd] of [[-3, 0], [5, 0], [-2, 1], [4, 1]]) g.rect(ox + x + dx, oy + WATER_Y + dd, 1, 1, '#FFF6D8', 0.8);
    }
    // ---- the tell of each place while nothing is on the line
    if (this.phase === 'pick' || this.phase === 'drop') this.drawTells(g, ox, oy);
    // ---- the stage-1 crayfish standing still at each place, claws open
    if (frozen) {
      for (const sp of SPOT_ORDER) {
        const st = this.still[sp];
        if (!st) continue;
        if (this.crayOn && sp === this.spot && this.phase !== 'pick') continue;
        const geo = SPOTS[sp];
        const f = geo.side < 0 ? 1 : -1;
        this.drawCrayAt(g, ox, oy, st.kind, st.cm, 'walk', f, tipX(sp, f), STAND_Y, 1, 1, 1);
      }
    }
    // ---- the can or the boot lying on the bottom before they come up
    // ---- the crayfish
    if (this.crayOn) this.drawCray(g, ox, oy);
    // ---- the line and the bait
    this.drawLine(g, ox, oy);
    // ---- the net (たも網)
    if (this.net > 0) this.drawNet(g, ox, oy);
  }

  private drawTells(g: Gfx, ox: number, oy: number): void {
    if (this.still1) return;
    const t = this.tellT;
    // 草の下: now and then two feelers poke out of the burrow
    const [bx, by] = SPOTS.kusa.home;
    const c1 = t % 3400;
    if (c1 < 1100) {
      const out = Math.min(3, Math.floor(c1 / 120));
      for (let i = 0; i < 4 + out; i++) {
        g.rect(ox + bx + 3 + i, oy + by - 1 - Math.floor(i / 2) - (Math.floor(t / 180) % 2), 1, 1, '#5E4A30');
        g.rect(ox + bx + 2 + i, oy + by + 1 - Math.floor(i / 3), 1, 1, '#86703E');
      }
    }
    // 石の陰: a string of small bubbles from under the stones
    const [sx, sy] = SPOTS.ishi.home;
    for (let i = 0; i < 3; i++) {
      const p = ((t + i * 700) % 2100) / 2100;
      g.rect(ox + sx - 4 + i * 3 + Math.round(Math.sin(p * 9) * 1), oy + Math.round(sy - 4 - p * 40), 1, 1, '#E8F4F0', 0.8 * (1 - p));
    }
    // 土管の口: two small eyes shine in the dark now and then (stage 2: long feelers wave out)
    const [dx, dy] = SPOTS.dokan.home;
    const c3 = t % 4200;
    if (c3 > 2600 && c3 < 3600) {
      g.rect(ox + dx - 3, oy + dy, 1, 1, '#E8603C');
      g.rect(ox + dx + 2, oy + dy, 1, 1, '#E8603C');
    }
    if (this.stage === 2) {
      const w = Math.floor(t / 240) % 2;
      for (let i = 0; i < 9; i++) g.rect(ox + dx - 2 - i, oy + dy - 2 - Math.floor((i * i) / 12) - (i > 5 ? w : 0), 1, 1, '#5E1E2A');
    }
  }

  /** A crayfish at the claw tip (tx, ty) (scene px). */
  private drawCrayAt(g: Gfx, ox: number, oy: number, kind: Cray, cm: number, pose: 'walk' | 'grab' | 'hang' | 'flee', face: -1 | 1, tx: number, ty: number, open: number, alpha: number, leg: number, extra?: (img: CrayImg, x: number, y: number) => void): void {
    const cp = { leg, open, curl: pose === 'flee', ant: Math.floor(this.legT / 300) % 2 };
    const im = pose === 'hang' ? crayHang(kind, cm, cp) : crayfish(kind, cm, cp);
    let x: number;
    let y: number;
    const flip = pose !== 'hang' && face > 0;
    if (pose === 'hang') {
      x = tx - im.tip[0];
      y = ty - im.tip[1];
    } else {
      // stand on the floor: the claw tip at tx, the feet on ty
      x = flip ? tx - (im.img.width - 1 - im.tip[0]) : tx - im.tip[0];
      y = ty - im.ay;
    }
    g.img(im.img, ox + x, oy + y, { flipX: flip, alpha: alpha < 1 ? alpha : undefined });
    extra?.(im, ox + x, oy + y);
  }

  private drawCray(g: Gfx, ox: number, oy: number): void {
    const kind = this.kind;
    if (kind === 'boot') {
      // the boot comes up hanging from the snagged line
      if (this.crayPose === 'hang') g.img(bootImg(), ox + Math.round(this.crayX) - 12, oy + Math.round(this.crayY) - 2);
      else g.img(bootImg(), ox + Math.round(this.crayX) - 14, oy + FLOOR_Y - 17);
      return;
    }
    const cray: Cray = kind === 'can' ? 'kozari' : (kind as Cray);
    const leg = this.crayPose === 'walk' || this.crayPose === 'hang' ? Math.floor(this.legT / (this.crayPose === 'hang' ? 140 : 180)) % 2 : 0;
    const frozenLeg = this.still1 ? 1 : leg;
    this.drawCrayAt(g, ox, oy, cray, this.cm, this.crayPose, this.face, Math.round(this.crayX), Math.round(this.crayY), this.crayOpen, this.crayA, frozenLeg, (im, x, y) => {
      if (kind !== 'can') return;
      // its home: the can, hanging from its tail (or lying round it on the bottom)
      if (this.crayPose === 'hang') g.img(canImg(), x + Math.round(im.img.width / 2) - 7, y + im.img.height - 6, { flipY: false });
    });
    if (kind === 'can' && this.crayPose !== 'hang') {
      const geo = SPOTS[this.spot];
      g.img(canImg(), ox + geo.home[0] - 7, oy + FLOOR_Y - 9);
    }
  }

  private drawLine(g: Gfx, ox: number, oy: number): void {
    const x0 = Math.round(this.rodX + (this.stage === 2 ? 4 : 0));
    const y0 = 7;
    // the rod: a split chopstick (割りばし) reaching in from above the window
    for (let i = 0; i <= 22; i++) {
      const x = x0 + 1 + Math.round(i * 0.9);
      const y = y0 - Math.round(i * 0.45);
      g.rect(ox + x, oy + y, 2, 1, i < 2 ? '#E8C890' : '#C8A06A');
      g.rect(ox + x, oy + y + 1, 2, 1, '#8A5A3A');
    }
    const jig = this.jiggle > 0 ? (Math.floor(this.jiggle / 40) % 2 ? 1 : -1) : 0;
    const bx = Math.round(this.baitX) + jig;
    const by = Math.round(this.baitY);
    if (this.slack) {
      // an empty line swinging up out of the water
      for (let y = y0; y < Math.min(by, WATER_Y + 20); y++) g.rect(ox + x0 + Math.round(Math.sin((y + this.t / 60) / 5) * 1.5), oy + y, 1, 1, '#F4F1E8', y > WATER_Y ? 0.35 : 0.7);
      return;
    }
    // the たこ糸: a straight line from the rod tip to the knot on the bait
    const ex = bx + 2;
    const ey = by - 2;
    const n = Math.max(1, ey - y0);
    for (let y = y0; y <= ey; y++) {
      const x = Math.round(x0 + ((ex - x0) * (y - y0)) / n);
      g.rect(ox + x, oy + y, 1, 1, '#F4F1E8', y > WATER_Y ? 0.45 : 0.85);
    }
    if (this.baitOn) g.img(baitImg(), ox + bx - 1, oy + by - 2);
  }

  private drawNet(g: Gfx, ox: number, oy: number): void {
    // the handle comes in from the upper right; the hoop at (netX, ny)
    const k = Math.min(1, this.net);
    const up = Math.max(0, this.net - 1);
    const hx = Math.round(this.netX);
    const ny = Math.round(WATER_Y + 4 - up * 60 - (1 - k) * 40);
    const x0 = SCN_W + 4;
    const y0 = ny - 50;
    const pole = '#C8A06A';
    for (let i = 0; i <= 60; i++) {
      const x = Math.round(x0 + ((hx + 12 - x0) * i) / 60);
      const y = Math.round(y0 + ((ny - y0) * i) / 60);
      g.rect(ox + x, oy + y, 1, 2, i % 9 === 0 ? '#8A5A3A' : pole);
    }
    // the hoop (seen a little from above) and the mesh bag hanging under it
    for (let a = 0; a < 32; a++) {
      const th = (a / 32) * Math.PI * 2;
      g.rect(ox + Math.round(hx + Math.cos(th) * 12), oy + Math.round(ny + Math.sin(th) * 3), 1, 1, '#6B7186');
    }
    for (let yy = 1; yy < 12; yy++) {
      const half = Math.round(11 * Math.sqrt(1 - yy / 12));
      for (let xx = -half; xx <= half; xx += 2) g.rect(ox + hx + xx + (yy % 2), oy + ny + yy, 1, 1, '#E8E4D8', 0.6);
    }
  }

  // ---------------------------------------------------------------- the card (計る・ザリ拓)

  private drawCard(g: Gfx, ox: number, oy: number): void {
    const c = this.card!;
    // おぴぃ's notebook page: paper and its grid
    g.rect(ox, oy, SCN_W, SCN_H, UI.bg);
    for (let x = 6; x < SCN_W; x += 12) g.rect(ox + x, oy, 1, SCN_H, UI.bg2);
    for (let y = 6; y < SCN_H; y += 12) g.rect(ox, oy + y, SCN_W, 1, UI.bg2);
    g.rect(ox + 22, oy, 1, SCN_H, UI.margin, 0.45);
    const S = 3;
    const ruler = rulerImg();
    const rx = ox + 46;
    const ry = oy + 74;
    if (c.kind === 'boot') {
      const b = bootImg();
      g.img(b, ox + SCN_W / 2 - (b.width * S) / 2, oy + 20, { scale: S });
      // a drip under it
      const d = Math.floor(c.t / 160) % 6;
      g.rect(ox + SCN_W / 2 - 6, oy + 20 + b.height * S + d * 2, 2, 3, '#7FD1E8');
      return;
    }
    if (c.kind === 'can' && c.noRuler) {
      const im = canImg();
      g.img(im, ox + SCN_W / 2 - (im.width * S) / 2, oy + 38, { scale: S });
      return;
    }
    const cray: Cray = c.kind === 'can' ? 'kozari' : (c.kind as Cray);
    if (!c.noRuler) g.img(ruler, rx, ry, { scale: S });
    // numbers under every 5cm
    if (!c.noRuler) for (const n of [0, 5, 10, 15, 20]) g.text(String(n), rx + (2 + n * PX_PER_CM) * S + 1, ry + ruler.height * S + 1, { color: UI.pencil, align: 'center' });
    // the crayfish laid on the ruler, its forehead at 0 (claws and feelers out in front)
    const im = crayfish(cray, c.cm, { leg: 0, open: 0 });
    const cx = c.noRuler ? ox + Math.round(SCN_W / 2 - (im.img.width * S) / 2) : rx + 2 * S - im.ax * S;
    const cy = c.noRuler ? oy + Math.round(SCN_H / 2 - (im.img.height * S) / 2) + 4 : ry - 1 - im.ay * S;
    if (c.step >= 3) {
      // the traced line stays on the page; the crayfish has gone back to the water
      const tr = traceImg(cray, c.cm);
      g.img(tr.img, cx, cy, { scale: S });
      if (c.label) {
        g.text(c.label, ox + SCN_W - 20, oy + 16, { color: UI.pencil, align: 'right' });
        g.text('（おぴぃ 認定）', ox + SCN_W - 20, oy + 34, { color: UI.pencil, align: 'right' });
        // the vermilion 認 of her seal
        const sx = ox + SCN_W - 44;
        const sy = oy + 54;
        g.rect(sx, sy, 20, 20, UI.accent);
        g.rect(sx + 2, sy + 2, 16, 16, UI.bg);
        g.text('認', sx + 2, sy + 2, { color: UI.accent });
        markText(ox + SCN_W - 150, oy + 16, 132, 60);
      }
      return;
    }
    g.img(im.img, cx, cy, { scale: S });
    if (c.noRuler) return;
    // the length on the ruler: a pencil tick at the tail
    const tailX = rx + (2 + c.cm * PX_PER_CM) * S;
    if (c.step >= 1) {
      g.rect(tailX, ry - 6, 1, ruler.height * S + 8, UI.accent);
      const txt = `${c.cm}cm`;
      const nx = ox + SCN_W - 60;
      g.text(txt, nx, oy + 14, { color: UI.pencil, align: 'center' });
      markText(nx - 30, oy + 14, 60, 36);
      if (c.step >= 2 && c.cert !== c.cm) {
        // struck out, and the certified number written next to it in red
        const w = g.measure(txt);
        const k = Math.min(1, c.t / 220);
        g.rect(nx - w / 2 - 2, oy + 21, Math.round((w + 4) * k), 1, UI.accent);
        g.rect(nx - w / 2 - 2, oy + 22, Math.round((w + 4) * k), 1, UI.accentDark);
        if (c.t > 260) g.text(`${c.cert}cm`, nx + 4, oy + 34, { color: UI.accent, align: 'center' });
      } else if (c.step >= 2) {
        // not bumped up: a red ring round the honest number
        const k = Math.min(1, c.t / 300);
        for (let a = 0; a < 110 * k; a++) {
          const th = -Math.PI / 2 + (a / 110) * Math.PI * 2.1;
          g.rect(Math.round(nx + Math.cos(th) * 24), Math.round(oy + 21 + Math.sin(th) * 11), 1, 1, UI.accent);
        }
      }
    }
  }

  // ---------------------------------------------------------------- the gauge (糸の はり)

  private drawGauge(g: Gfx): void {
    const a = Math.min(1, this.gauge);
    const cx = gaugeX();
    const cy = GY + Math.round((1 - a) * 30);
    const R = GR;
    const ctx = g.ctx;
    const zone = Math.max(0, Math.min(1, this.danger));
    const inZone = this.tension > zone;
    markText(cx - R - 6, cy - R - 6, R * 2 + 12, R * 2 + 12, true);
    g.alpha(a, () => {
      // the paper disc behind (the claw inside tells how hard it holds)
      g.circle(cx, cy, R - 4, UI.bg);
      const steps = 150;
      for (let i = 0; i < steps; i++) {
        const p = i / steps;
        const th = -Math.PI / 2 + p * Math.PI * 2;
        const inK = p >= zone;
        for (let w = 0; w < 4; w++) {
          const r = R - 2 + w;
          let col = '#E8D9B5';
          if (inK && Math.floor(i / 3) % 2 === 0) col = '#B8241E';
          if (p <= this.tension) col = inK ? '#FF6A4D' : '#E23B2E';
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(cx + Math.cos(th) * r), Math.round(cy + Math.sin(th) * r), 1, 1);
        }
      }
      g.ring(cx, cy, R + 2, UI.border);
      g.ring(cx, cy, R - 3, UI.border);
      if (inZone && Math.floor(this.t / 90) % 2 === 0) g.ring(cx, cy, R + 2, '#FFF6D8');
      // the marker where the red begins (none in stage 1: it never lets go)
      if (this.danger <= 1) {
        const am = -Math.PI / 2 + zone * Math.PI * 2;
        const mx = Math.round(cx + Math.cos(am) * (R + 5));
        const my = Math.round(cy + Math.sin(am) * (R + 5));
        g.rect(mx - 2, my - 1, 5, 1, UI.accentDark);
        g.rect(mx - 1, my, 3, 1, UI.accentDark);
        g.px(mx, my + 1, UI.accentDark);
      }
      // the claw: shut tight at full grip, opening as it tires (and trembling when it is about to let go)
      const open = Math.max(0, Math.min(4, Math.round((1 - this.grip) * 4.4)));
      const sh = this.grip < 0.45 ? (Math.floor(this.t / 50) % 2 ? 1 : 0) : 0;
      g.img(gripIcon(this.kind, open), cx - 11 + sh, cy - 8);
    });
  }
}

const gripCache = new Map<string, HTMLCanvasElement>();
/** The claw in the gauge (22×16): a pincer pointing right, `open` 0 (shut) … 4 (wide). */
function gripIcon(kind: CatchKind, open: number): HTMLCanvasElement {
  const key = `${kind}:${open}`;
  const hit = gripCache.get(key);
  if (hit) return hit;
  const [B, Lt, D] = clawCol(kind);
  const p = new PixelCanvas(22, 16);
  // the palm: a fat oval on the left
  p.ellipse(7, 9, 6, 4, B);
  p.hline(3, 10, 5, Lt);
  p.hline(4, 9, 6, Lt);
  // the upper finger (moves) and the lower one (fixed), tips meeting at the right when shut
  for (let i = 0; i < 9; i++) {
    const k = i / 8;
    const up = Math.round(open * 1.4 * k);
    const t1 = Math.round(1 - k);
    p.rect(12 + i, 6 - up, 1, 2 + t1, i < 4 ? Lt : B);
    p.rect(12 + i, 10 + Math.round(open * 0.4 * k), 1, 2 + t1, D);
  }
  // the bumps on its back
  p.set(5, 6, '#F6D98A');
  p.set(8, 5, '#F6D98A');
  p.outline(UI.border);
  const c = p.toCanvas();
  gripCache.set(key, c);
  return c;
}

function clawCol(kind: CatchKind): [string, string, string] {
  if (kind === 'makka') return ['#E23B2E', '#FF6A4D', '#B8241E'];
  if (kind === 'nushi') return ['#8A2E3A', '#B04A5A', '#5E1E2A'];
  if (kind === 'zari') return ['#A84A34', '#C8643A', '#7A3024'];
  if (kind === 'boot') return ['#4E5E54', '#6B7A70', '#2E3A34'];
  return ['#86703E', '#B09A5E', '#5E4A30'];
}

// ---------------------------------------------------------------- where the inlet is on the screen

/** Where the inlet (20,41) is on the screen: the window's tail points at it. */
function inletScreen(): [number, number] {
  const f = field();
  if (!f) return [280, 172];
  const [x, y] = f.worldToScreen(20 * 16 + 8, 41 * 16 + 4);
  return [x, y];
}

/** Where a crayfish's claw tip touches the bait resting at a place (the bait spans x−2..x+2). */
function tipX(spot: Spot, face: -1 | 1): number {
  const x = SPOTS[spot].x;
  return face > 0 ? x - 3 : x + 3;
}

// ---------------------------------------------------------------- open / close

export function* openPanel(stage: number, record: number): Co<TsuriPanel> {
  const p = new TsuriPanel(stage);
  p.record = record;
  if (stage === 1) for (const sp of SPOT_ORDER) p.still[sp] = { kind: STILL_KIND[sp], cm: rollCm(STILL_KIND[sp]) };
  game.ui.push(p);
  sfx('se_tsuri_open');
  yield* animate(200, (k) => (p.open = k), ease.linear);
  p.open = 1;
  p.clearInput();
  return p;
}

export function* closePanel(p: TsuriPanel): Co {
  p.cues.clear();
  p.gauge = 0;
  yield* animate(160, (k) => (p.open = 1 - k), ease.linear);
  p.done = true;
  game.ui.remove(p);
}

// ---------------------------------------------------------------- one round

export type Outcome = 'caught' | 'early' | 'lost' | 'drop' | 'quit';
export interface RoundResult {
  outcome: Outcome;
  spot: Spot;
  kind: CatchKind;
  cm: number;
}

export interface RoundOpts {
  /** The very first round: an easy one. */
  first: boolean;
  bootFound: boolean;
  /** Rounds at the pipe since the ぬし was last seen (it shows at the 8th). */
  dokanDry: number;
  /** QA: force what comes. */
  force?: { kind?: CatchKind; cm?: number; spot?: Spot; outcome?: Outcome };
}

const HOLD_CUE = (p: TsuriPanel, phase: 'wait' | 'hold' | 'zone') => {
  const text = phase === 'zone' ? TSURI_UI.release : TSURI_UI.hold;
  const { h } = cueSize(text);
  p.cues.set('hold', text, {
    x: gaugeX() + GR + 8,
    y: GY - Math.round(h / 2),
    align: 'left',
    tone: phase === 'zone' ? 'go' : 'hold',
    mode: phase === 'wait' ? 'beat' : phase === 'zone' ? 'flash' : 'still',
    button: phase === 'zone' ? 'はなす！' : '長押し',
  });
};

/** The rod over the place: the bait dangles above the water, swinging a little. */
function hangBait(p: TsuriPanel): void {
  const x = SPOTS[p.spot].x;
  p.rodX += (x - p.rodX) * 0.35;
  if (Math.abs(p.rodX - x) < 0.5) p.rodX = x;
  const sw = p.still1 ? 0 : Math.sin(p.t / 380) * 1.5;
  p.baitX = p.rodX + sw - 2;
  p.baitY = 18 + (p.still1 ? 0 : Math.round(Math.sin(p.t / 520)));
}

export function* playRound(p: TsuriPanel, o: RoundOpts): Co<RoundResult> {
  const stage = p.stage;
  p.phase = 'pick';
  p.card = null;
  p.baitOn = true;
  p.slack = false;
  p.crayOn = false;
  p.tension = 0;
  p.grip = 1;
  p.depth = 0;
  p.net = 0;
  if (o.force?.spot) p.spot = o.force.spot;
  p.clearInput();
  // ---- pick the place
  let autoWait = 700;
  for (;;) {
    hangBait(p);
    if (p.auto) {
      if ((autoWait -= 16.7) <= 0) break;
      yield null;
      continue;
    }
    if (p.take('cancel')) return { outcome: 'quit', spot: p.spot, kind: 'kozari', cm: 0 };
    const i = SPOT_ORDER.indexOf(p.spot);
    if (p.take('left') && i > 0) {
      p.spot = SPOT_ORDER[i - 1];
      sfx('se_cursor');
    }
    if (p.take('right') && i < SPOT_ORDER.length - 1) {
      p.spot = SPOT_ORDER[i + 1];
      sfx('se_cursor');
    }
    if (p.take('confirm')) break;
    yield null;
  }
  const spot = p.spot;
  const geo = SPOTS[spot];
  const kind: CatchKind = o.force?.kind ?? (stage === 1 ? p.still[spot]!.kind : rollCatch(spot, stage, o));
  const cm = o.force?.cm ?? (stage === 1 ? p.still[spot]!.cm : rollCm(kind));
  p.kind = kind;
  p.cm = cm;
  // the first round ever is forgiving: a wide green, a slow slip, no thrashing
  const spec: KindSpec = o.first ? { ...KIND[kind], danger: 0.95, drain: 1.1, thrash: 0, back: 0.04 } : KIND[kind];
  // ---- drop: ポチャン, it sinks, the line goes taut
  p.phase = 'drop';
  p.rodX = geo.x;
  p.baitX = geo.x - 2;
  sfx('se_tsuri_cast');
  const y0 = p.baitY;
  yield* animate(200, (k) => (p.baitY = y0 + (WATER_Y - y0) * k), ease.quadIn);
  sfx('se_tsuri_pochan');
  p.splash.push({ x: geo.x, t: 0 });
  p.word('ポチャン', geo.x, WATER_Y - 22, UI.bg, 600);
  const rest = FLOOR_Y - 2;
  yield* animate(p.still1 ? 420 : 560, (k) => (p.baitY = WATER_Y + (rest - WATER_Y) * k), ease.quadOut);
  p.baitY = rest;
  sfx('se_tsuri_line');
  p.clearInput();

  // where the crayfish's claw tip starts and its facing (it comes from its home)
  const side = geo.side;
  const face: -1 | 1 = side < 0 ? 1 : -1;
  p.face = face;
  const atBaitX = tipX(spot, face);
  const early = (): RoundResult | null => {
    if (!p.take('confirm')) return null;
    return { outcome: 'early', spot, kind, cm };
  };

  // ---- stage 1: the crayfish stands still with its claws open; the bait falls into them
  if (p.still1) {
    p.crayOn = true;
    p.crayPose = 'walk';
    p.crayOpen = 1;
    p.crayX = atBaitX;
    p.crayY = STAND_Y;
    p.crayA = 1;
    yield 260;
  } else if (kind === 'boot') {
    // ---- the boot: the bait drifts into the grass roots and the line snags
    p.phase = 'wait';
    p.crayOn = true;
    p.crayPose = 'walk';
    p.crayX = geo.x - 18;
    p.crayY = FLOOR_Y;
    const w = 900 + Math.random() * 1000;
    for (let t = 0; t < w; t += 16.7) {
      if (!p.auto) {
        const e = early();
        if (e) return { ...e, outcome: 'early' };
      }
      yield null;
    }
    yield* animate(500, (k) => (p.baitX = geo.x - 2 - k * 12), ease.quadInOut);
  } else {
    // ---- stage 0/2: it comes out of its home and walks to the bait
    p.phase = 'wait';
    const [hx] = geo.home;
    p.crayOn = true;
    p.crayPose = 'walk';
    p.crayOpen = 0;
    p.crayA = 0;
    p.crayX = hx + side * -2;
    p.crayY = STAND_Y;
    let w = (o.first ? 500 : 600 + Math.random() * 1100) + (kind === 'nushi' ? 500 : 0);
    if (kind === 'nushi') {
      // a big bubble from the pipe first
      sfx('se_tsuri_nushi');
      p.shake = 1;
    }
    for (let t = 0; t < w; t += 16.7) {
      if (!p.auto) {
        const e = early();
        if (e) return yield* fleeFrom(p, e);
      }
      yield null;
    }
    // walk out (fades in over the first steps)
    const dist = Math.abs(atBaitX - p.crayX);
    const ms = (dist / spec.walk) * 1000;
    const x0 = p.crayX;
    for (let t = 0; t < ms; t += 16.7) {
      const k = t / ms;
      p.crayX = x0 + (atBaitX - x0) * k;
      p.crayA = Math.min(1, k * 4);
      if (!p.auto) {
        const e = early();
        if (e) return yield* fleeFrom(p, e);
      }
      yield null;
    }
    p.crayX = atBaitX;
    p.crayA = 1;
    // feints: ツン……ツン (a taste), claws open and close on the bait
    const feints = o.first ? 1 : [0, 1, 1, 2][Math.floor(Math.random() * 4)];
    for (let f = 0; f < feints; f++) {
      const gap = 420 + Math.random() * 520;
      for (let t = 0; t < gap; t += 16.7) {
        if (!p.auto) {
          const e = early();
          if (e) return yield* fleeFrom(p, e);
        }
        yield null;
      }
      p.crayOpen = 1;
      yield 90;
      p.crayOpen = 0;
      p.jiggle = 240;
      p.baitX += face * -1;
      sfx('se_tsuri_tsun');
      p.word(TSURI_UI.tsun, geo.x + 10, WATER_Y - 16, UI.bg, 650);
      for (let t = 0; t < 220; t += 16.7) {
        if (!p.auto) {
          const e = early();
          if (e) return yield* fleeFrom(p, e);
        }
        yield null;
      }
      p.baitX -= face * -1;
    }
    const last = 300 + Math.random() * 500;
    for (let t = 0; t < last; t += 16.7) {
      if (!p.auto) {
        const e = early();
        if (e) return yield* fleeFrom(p, e);
      }
      yield null;
    }
    p.crayOpen = 1;
    yield 70;
  }

  // ---- ぐいっ: it grabs and pulls sideways toward its home
  p.phase = 'bite';
  p.crayOpen = 0;
  p.crayPose = kind === 'boot' ? 'walk' : 'grab';
  if (!p.still1) {
    const yank = kind === 'boot' ? 0 : side * 6;
    const bx0 = p.baitX;
    const cx0 = p.crayX;
    yield* animate(110, (k) => {
      p.baitX = bx0 + yank * k;
      p.crayX = cx0 + yank * k;
    }, ease.quadOut);
    p.shake = 2;
    p.jiggle = 200;
    sfx(kind === 'boot' ? 'se_tsuri_snag' : 'se_tsuri_gui');
    p.word(kind === 'boot' ? 'ぐぐっ' : TSURI_UI.gui, geo.x + side * -14, WATER_Y - 16, UI.bg, 800);
  } else {
    sfx('se_tsuri_line', { pitch: 0.8 });
  }
  p.clearInput();
  HOLD_CUE(p, 'wait');
  // the gauge comes up; wait for a fresh press while it drags the bait home
  p.tension = 0;
  p.grip = 1;
  p.depth = 0;
  p.danger = p.still1 ? 1.01 : spec.danger - (stage === 2 ? 0.03 : 0);
  yield* animate(160, (k) => (p.gauge = k), ease.backOut);
  const homeX = geo.home[0] - side * 4;
  const window = p.still1 ? Infinity : 2600;
  let started = false;
  for (let t = 0; t < window; t += 16.7) {
    if (p.auto ? t > 350 : p.take('confirm')) {
      started = true;
      break;
    }
    if (!p.still1 && kind !== 'boot') {
      const dx = ((homeX - p.baitX) * 16.7) / Math.max(1, window - t);
      p.baitX += dx;
      p.crayX += dx;
    }
    yield null;
  }
  if (!started) {
    // 持ってかれた: it drags the bait into its home
    p.cues.drop('hold', 'off');
    yield* animate(200, (k) => (p.gauge = 1 - k));
    yield* dragHome(p, homeX);
    return { outcome: 'lost', spot, kind, cm };
  }

  // ---- the pull (hold to raise; too fast and it lets go; let go and it goes back down)
  p.phase = 'pull';
  p.crayPose = 'hang';
  p.crayOpen = 0;
  const pull = sfxPoll();
  let thrashT = 900 + Math.random() * 900;
  let bottomT = 0;
  let lastZone = false;
  let autoHeld = true;
  const back = p.still1 ? 0 : spec.back * (stage === 2 ? 1.15 : 1);
  const rise = kind === 'boot' ? 0.26 : 0.45;
  const bottom = FLOOR_Y - 2;
  const top = WATER_Y - 8;
  let result: Outcome | null = null;
  for (;;) {
    const dt = 16.7 / 1000;
    let holding: boolean;
    if (p.auto) {
      // a good rhythm: let go just before the red, press again when it has eased
      if (autoHeld && p.tension > p.danger - 0.06) autoHeld = false;
      else if (!autoHeld && p.tension < p.danger - 0.38) autoHeld = true;
      holding = autoHeld;
    } else holding = p.hold;
    p.tension = holding ? Math.min(1, p.tension + 0.6 * dt) : Math.max(0, p.tension - 1.6 * dt);
    p.depth += holding ? (p.tension * rise - back * 0.4) * dt : -back * dt;
    p.depth = Math.max(0, Math.min(1, p.depth));
    // the red widens near the surface (out of the water is where they let go);
    // stage 1: it holds on and never lets go — no red at all
    p.danger = p.still1 ? 1.01 : spec.danger - (stage === 2 ? 0.03 : 0) - Math.max(0, p.depth - 0.7) * 0.5;
    const zone = p.tension > p.danger;
    if (zone && !p.still1) {
      p.grip -= spec.drain * dt;
      if (!lastZone) sfx('se_tsuri_slip');
    } else p.grip = Math.min(1, p.grip + 0.35 * dt);
    lastZone = zone;
    p.crayOpen = p.grip < 0.35 && Math.floor(p.t / 70) % 2 ? 1 : 0;
    HOLD_CUE(p, zone ? 'zone' : 'hold');
    // thrashing (the big ones): the line jumps
    if (!p.still1 && spec.thrash > 0) {
      thrashT -= 16.7;
      if (thrashT <= 0) {
        thrashT = 1400 + Math.random() * 1200;
        if (Math.random() < spec.thrash) {
          p.tension = Math.min(1, p.tension + 0.14 + Math.random() * 0.06);
          if (kind === 'nushi') p.depth = Math.max(0, p.depth - 0.03);
          p.shake = 1.5;
          p.jiggle = 180;
          sfx('se_tsuri_thrash');
        }
      }
    }
    // the sound of the line: a creak that rises with the pull
    if (holding) pull(p.tension, zone);
    // where the bait (and the crayfish under it) is
    const drift = stage === 2 ? p.depth * 8 : 0;
    const sway = p.still1 ? 0 : Math.sin(p.t / 170) * (1 + p.tension * 1.5);
    p.rodX = geo.x;
    p.baitX = geo.x - 2 + drift + sway;
    p.baitY = bottom + (top - bottom) * p.depth;
    p.crayX = p.baitX + 2;
    p.crayY = p.baitY + 2;
    if (p.grip <= 0) {
      result = 'drop';
      break;
    }
    if (p.depth <= 0.001 && !holding) {
      bottomT += 16.7;
      if (bottomT > 2500 && !p.still1) {
        result = 'lost';
        break;
      }
    } else bottomT = 0;
    if (p.depth >= 1) {
      result = 'caught';
      break;
    }
    if (o.force?.outcome === 'drop' && p.depth > 0.5) {
      result = 'drop';
      break;
    }
    yield null;
  }
  p.cues.drop('hold', result === 'caught' ? 'go' : 'off');
  yield* animate(180, (k) => (p.gauge = 1 - k));
  p.gauge = 0;
  if (result === 'drop') {
    // ぽとん: it lets go and falls back, then backs off home
    sfx('se_tsuri_poton');
    p.word(TSURI_UI.poton, p.crayX, Math.min(WATER_Y - 14, p.crayY - 16), UI.bg, 800);
    p.crayPose = 'flee';
    const fy = p.crayY;
    yield* animate(380, (k) => (p.crayY = fy + (STAND_Y - fy) * k), ease.quadIn);
    p.crayPose = 'walk';
    yield* backHome(p, homeX);
    return { outcome: 'drop', spot, kind, cm };
  }
  if (result === 'lost') {
    p.crayPose = 'grab';
    p.crayY = STAND_Y;
    yield* dragHome(p, homeX);
    return { outcome: 'lost', spot, kind, cm };
  }
  // ---- たも網: おぴぃ scoops it at the surface
  p.phase = 'scoop';
  p.netX = SCN_W + 20;
  p.onNet?.(true);
  sfx('se_tsuri_net');
  const nx0 = p.netX;
  yield* animate(360, (k) => {
    p.net = k;
    p.netX = nx0 + (p.baitX + 1 - nx0) * k;
  }, ease.quadOut);
  p.net = 1;
  sfx('se_tsuri_agari');
  p.splash.push({ x: p.baitX, t: 0 });
  const cy0 = p.crayY;
  const by0 = p.baitY;
  yield* animate(420, (k) => {
    p.net = 1 + k;
    p.crayY = cy0 - k * 60;
    p.baitY = by0 - k * 60;
  }, ease.quadIn);
  p.crayOn = false;
  p.net = 0;
  p.onNet?.(false);
  return { outcome: 'caught', spot, kind, cm };
}

/** 早い！: it flips its tail and shoots back home. */
function* fleeGen(p: TsuriPanel): Co {
  const geo = SPOTS[p.spot];
  p.cues.set('early', TSURI_UI.early, { x: SX + SCN_W / 2, y: SY + 20, align: 'center', tone: 'off', mode: 'still' });
  sfx('se_tsuri_hayai');
  p.crayPose = 'flee';
  const x0 = p.crayX;
  const hx = geo.home[0];
  yield* animate(260, (k) => {
    p.crayX = x0 + (hx - x0) * k;
    p.crayA = 1 - k * 0.8;
  }, ease.quadOut);
  p.crayOn = false;
  yield 450;
  p.cues.drop('early', 'off');
}
function fleeFrom(p: TsuriPanel, r: RoundResult): Co<RoundResult> {
  return (function* () {
    if (p.crayOn && p.crayA > 0.2) yield* fleeGen(p);
    else {
      p.cues.set('early', TSURI_UI.early, { x: SX + SCN_W / 2, y: SY + 20, align: 'center', tone: 'off', mode: 'still' });
      sfx('se_tsuri_hayai');
      p.crayOn = false;
      yield 600;
      p.cues.drop('early', 'off');
    }
    return r;
  })();
}

/** It drags the bait into its home; the empty line swings up. */
function* dragHome(p: TsuriPanel, homeX: number): Co {
  const bx0 = p.baitX;
  const cx0 = p.crayX;
  sfx('se_tsuri_gui', { pitch: 0.85, vol: 0.7 });
  yield* animate(420, (k) => {
    p.baitX = bx0 + (homeX - bx0) * k;
    p.crayX = cx0 + (homeX - bx0) * k;
    p.crayA = 1 - k;
  }, ease.quadIn);
  p.crayOn = false;
  p.baitOn = false;
  p.slack = true;
  sfx('se_tsuri_line', { pitch: 0.7, vol: 0.6 });
  yield 500;
}

/** Backing off home, tail first (after it let go). */
function* backHome(p: TsuriPanel, homeX: number): Co {
  const x0 = p.crayX;
  yield* animate(700, (k) => {
    p.crayX = x0 + (homeX - x0) * k;
    p.crayA = 1 - Math.max(0, k - 0.6) / 0.4;
  }, ease.quadInOut);
  p.crayOn = false;
}

/** The creak of the line while it is pulled: a short grain every ~80 ms (like the hanko's charge). */
function sfxPoll(): (t: number, zone: boolean) => void {
  let next = 0;
  return (t, zone) => {
    const now = game.time;
    if (now < next) return;
    next = now + 82;
    sfx('se_tsuri_reel', { pitch: 1 + 0.6 * t, vol: zone ? 1.1 : 0.9 });
  };
}

// ---------------------------------------------------------------- after the catch: the card, the release

/** The catch on おぴぃ's page: on the ruler (or not), then the number, the stroke, the certified one. */
export function* cardShow(p: TsuriPanel, kind: CatchKind, cm: number, o: { noRuler?: boolean } = {}): Co {
  p.phase = 'card';
  p.card = { kind, cm, cert: cm, step: 0, t: 0, noRuler: o.noRuler };
  sfx('se_tsuri_card');
  yield 380;
}

/** おぴぃ measures: the pencil number. */
export function* cardMeasure(p: TsuriPanel): Co {
  if (!p.card) return;
  sfx('se_pen_write');
  p.card.step = 1;
  p.card.t = 0;
  yield 420;
}

/** The bump (盛り): the number struck out and the new one in red (or a ring round an honest one). */
export function* cardMori(p: TsuriPanel, cert: number): Co {
  if (!p.card) return;
  p.card.cert = cert;
  p.card.step = 2;
  p.card.t = 0;
  sfx('se_pen_write', { pitch: 1.15 });
  yield 520;
}

/** ザリ拓: the crayfish goes, the traced line and the label stay. */
export function* cardTrace(p: TsuriPanel, cert: number): Co {
  if (!p.card) return;
  sfx('se_pen_write', { pitch: 0.9 });
  p.card.step = 3;
  p.card.t = 0;
  p.card.label = `しゅん ${cert}cm`;
  yield 500;
}

/** Back to the water: the crayfish is let go and walks home tail first, the するめ in its claws. */
export function* releaseAnim(p: TsuriPanel, spot: Spot, kind: CatchKind, cm: number, o: { nushi?: boolean } = {}): Co {
  p.card = null;
  p.phase = 'release';
  if (kind === 'boot') return;
  const geo = SPOTS[o.nushi ? 'dokan' : spot];
  p.spot = o.nushi ? 'dokan' : spot;
  p.kind = kind === 'can' ? 'kozari' : kind;
  p.cm = cm;
  p.baitOn = false;
  p.slack = true;
  p.rodX = geo.x;
  p.crayOn = true;
  p.crayPose = 'hang';
  p.crayA = 1;
  p.crayX = geo.x;
  p.crayY = WATER_Y - 14;
  sfx('se_tsuri_release');
  const y0 = p.crayY;
  yield* animate(520, (k) => (p.crayY = y0 + (FLOOR_Y - 12 - y0) * k), ease.quadOut);
  p.splash.push({ x: geo.x, t: 0 });
  p.crayPose = 'walk';
  p.crayY = STAND_Y;
  p.face = geo.side < 0 ? 1 : -1;
  yield 260;
  yield* backHome(p, geo.home[0]);
}

// ---------------------------------------------------------------- the camera and the guide

/** The field's camera during the game: the two of them low on the right, under the window. */
export function tsuriCamera(): { x: number; y: number } {
  // world px of the camera centre: (20,40) at screen ≈ (280, 168)
  return { x: 20 * 16 + 8 - 280 + 192, y: 44 * 16 };
}

/** The control guide (the first round): keycaps on a keyboard, けってい on a touch screen. */
export function tsuriGuideRows(): [string[], string][] {
  const ok = touchControlsOn() ? 'けってい' : 'Z';
  return [
    [['left', 'right'], TSURI_UI.pick],
    [[ok], TSURI_UI.drop],
  ];
}

// ---------------------------------------------------------------- QA: the art at a glance

import { registerDebug } from '../debug';

/** QA: every crayfish (sizes × poses), the boot, the can, the ruler — `scale`× as a PNG data URL. */
registerDebug('tsuriSheet', (scale = 4) => {
  const kinds: [Cray, number][] = [['kozari', 4], ['kozari', 6], ['zari', 7], ['zari', 9], ['makka', 10], ['makka', 12], ['nushi', 13]];
  const cell = 64;
  const cv = document.createElement('canvas');
  cv.width = cell * 5 * scale;
  cv.height = cell * kinds.length * scale * 0.7;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#5E8C7A';
  ctx.fillRect(0, 0, cv.width, cv.height);
  kinds.forEach(([k, cm], j) => {
    const imgs = [
      crayfish(k, cm, { leg: 0, open: 0 }).img,
      crayfish(k, cm, { leg: 1, open: 1, ant: 1 }).img,
      crayfish(k, cm, { leg: 0, open: 0, curl: true }).img,
      crayHang(k, cm, { leg: 0, open: 0 }).img,
      traceImg(k, cm).img,
    ];
    imgs.forEach((im, i) => ctx.drawImage(im, (i * cell + 4) * scale, (j * cell * 0.7 + 4) * scale, im.width * scale, im.height * scale));
  });
  const extra = [bootImg(), canImg(), rulerImg(), baitImg()];
  let x = 4;
  for (const im of extra) {
    ctx.drawImage(im, x * scale, (cell * kinds.length * 0.7 - 30) * scale, im.width * scale, im.height * scale);
    x += im.width + 8;
  }
  return cv.toDataURL();
});

/** QA: the window's state now (null when it is not up). */
registerDebug('tsuriState', () => {
  const p = game.ui.widgets.find((w) => w instanceof TsuriPanel) as TsuriPanel | undefined;
  if (!p) return null;
  return { phase: p.phase, spot: p.spot, kind: p.kind, cm: p.cm, tension: +p.tension.toFixed(2), danger: +p.danger.toFixed(2), grip: +p.grip.toFixed(2), depth: +p.depth.toFixed(2), cues: p.cues.peek(), card: p.card?.step ?? null };
});
