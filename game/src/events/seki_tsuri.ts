// テナガエビ釣り「待つ 釣り」（02_ch2_index #81、10_narrative 7.24、30_level_art 3.16・10.12）。
// 対岸の ザリガニ釣り（src/events/tsuri.ts）の 小窓と 同じ 作り：同じ 位置・大きさの ノートの 窓、
// 同じ 糸の はりの 輪、同じ たも網と 計る 紙。ちがうのは 背景（堰の 下の 淵）と 生き物と、
// 釣り方（ザリガニの「ぐいっ」の 逆の「待つ」）。おぴぃ（src/events/mizube.ts）が となりで 見ている。
//
//   流れ：場所えらび（← →、決定で 下ろす。もどるで やめる）→ ポチャン、浮きが 立つ
//     → 待つ（エビが 出てきて、ツン……ツン と さわる。ここで 押すと「早い！」）
//     → すーっ（えさを 抱えて すみかへ 歩く。浮きが 横へ。ここで 押すと「運んでる！」）
//     → ぴた（すき間で 食べはじめ）。浮きの 上に 点が 3つ、1つずつ 灯る（灯りきる 前に
//       押すと「早い！」）→ 3つ 灯ったら「長押し」。押さないと「ごちそうさま」（えさだけ 取られる）
//     → 長押しで そーっと 上げる：ザリガニと 同じ 糸の はりの 輪。テナガエビは はなしやすい
//       （赤い 所が 広め）→ 水面で おぴぃの たも網。
//   段階1：時間が 止まっている。エビは えさを 抱えたまま 止まっていて、点は はじめから 3つ 灯り、
//     はなさない（必ず 取れる）。落ちる 水も 泡も 止まる。
//   段階2：浮きが 北東（右）へ 流れる。流木の 陰の 片手の 大将が 出やすい。
//   『おぴぃの浮き』（ザリガニの ぬしの ごほうび）を 持っていれば、それを 使う（小さく、
//     横へ 動くのが 見やすい：すーっ の 間 浮きの 横に 小さな 波の すじ）。

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
import { drawTape, drawWindow, UI } from '../ui/window';
import { rulerImg } from '../art/props/tsuri_art';
import {
  SCN_H,
  SCN_W,
  SK_FALL,
  SK_FLOOR_Y,
  SK_ORDER,
  SK_PX_PER_CM,
  SK_SPOTS,
  SK_WATER_Y,
  akamushiImg,
  armCm,
  dotImg,
  floatImg,
  goby,
  gobyHang,
  sekiBg,
  shrimp,
  shrimpHang,
  type SekiKind,
  type SekiSpot,
  type ShrimpImg,
} from '../art/props/seki_tsuri_art';
import { SEKI_SPOT_NAME, SEKI_UI } from '../data/text/mizube';

export type { SekiKind, SekiSpot };

// ---------------------------------------------------------------- 置き場所（画面の px。tsuri.ts と 同じ）

const PX = 24;
const PY = 4;
const PW = SCN_W + 8;
const PH = SCN_H + 8;
const SX = PX + 4;
const SY = PY + 4;
const GX = 40;
const GY = 176;
const GR = 26;
const WY = SK_WATER_Y;
const FY = SK_FLOOR_Y;
const STAND_Y = FY + 1;

function gaugeX(): number {
  return buttonZones() ? Math.max(GX, freeSpan(GY - GR - 6, GY + GR + 8).x0 + GR + 6) : GX;
}

// ---------------------------------------------------------------- 釣れる物

interface KindSpec {
  cm: [number, number];
  back: number;
  danger: number;
  drain: number;
  thrash: number;
  walk: number;
}
const KIND: Record<SekiKind, KindSpec> = {
  mesu: { cm: [5, 7], back: 0.04, danger: 0.86, drain: 1.6, thrash: 0.1, walk: 16 },
  osu: { cm: [7, 9], back: 0.06, danger: 0.8, drain: 1.9, thrash: 0.3, walk: 13 },
  tamago: { cm: [6, 7], back: 0.04, danger: 0.88, drain: 1.4, thrash: 0, walk: 12 },
  taisho: { cm: [9, 9], back: 0.1, danger: 0.72, drain: 2.2, thrash: 0.7, walk: 9 },
  goby: { cm: [4, 6], back: 0.05, danger: 0.84, drain: 1.6, thrash: 0.4, walk: 22 },
};

function weights(spot: SekiSpot, stage: number): [SekiKind, number][] {
  if (spot === 'sukima') return [['mesu', 58], ['goby', 30], ['osu', 12]];
  if (spot === 'awa') return [['osu', 64], ['mesu', 20], ['goby', 16]];
  return [['tamago', stage === 0 ? 34 : 0], ['mesu', 26], ['osu', 22], ['taisho', stage === 2 ? 26 : 6]];
}

const STILL_KIND: Record<SekiSpot, SekiKind> = { sukima: 'mesu', awa: 'osu', ryuboku: 'mesu' };

export function rollSeki(spot: SekiSpot, stage: number, o: { first: boolean; dry: number }): SekiKind {
  if (stage === 1) return STILL_KIND[spot];
  if (o.first) return spot === 'awa' ? 'osu' : 'mesu';
  // the 大将 shows itself to someone who keeps trying the log (the 9th)
  if (spot === 'ryuboku' && o.dry >= 8) return 'taisho';
  const w = weights(spot, stage);
  let total = 0;
  for (const [, n] of w) total += n;
  let r = Math.random() * total;
  for (const [k, n] of w) if ((r -= n) < 0) return k;
  return 'mesu';
}

function rollCm(kind: SekiKind): number {
  const [a, b] = KIND[kind].cm;
  return a + Math.floor(Math.random() * (b - a + 1));
}

/** The length of a cheliped (cm) for the 盛り: オス long, メス short. */
export function sekiArm(kind: SekiKind, cm: number): number {
  return kind === 'goby' ? 0 : armCm(kind, cm);
}

// ---------------------------------------------------------------- 小窓

type Phase = 'pick' | 'drop' | 'wait' | 'carry' | 'eat' | 'pull' | 'scoop' | 'card' | 'release' | 'end';

interface Word {
  text: string;
  x: number;
  y: number;
  t: number;
  ms: number;
}

interface CardState {
  kind: SekiKind;
  cm: number;
  step: number;
  cert: number;
  noRuler?: boolean;
  t: number;
}

export class SekiPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  phase: Phase = 'pick';
  spot: SekiSpot = 'sukima';
  /** いちばん 大きい 認定の cm（テナガエビ）。0 = なし。 */
  record = 0;
  /** おぴぃの 浮きを 使う。 */
  opiFloat = false;

  private eConfirm = false;
  private eCancel = false;
  private eLeft = false;
  private eRight = false;
  hold = false;
  auto = false;
  onNet: ((on: boolean) => void) | null = null;

  // ---- the float, the line, the bait (scene px)
  floatX = SK_SPOTS.sukima.x;
  floatDip = 0;
  floatOn = false;
  floatUp = 0;
  baitX = SK_SPOTS.sukima.x;
  baitY = 20;
  baitOn = true;
  slack = false;
  /** すーっ：浮きの 横の 波の すじ。 */
  wake = 0;
  wakeDir: -1 | 1 = 1;
  /** 点（0..3 灯った 数、-1 = 出ていない）。 */
  dots = -1;

  // ---- the creature
  kind: SekiKind = 'mesu';
  cm = 6;
  crOn = false;
  crX = 0;
  crY = 0;
  face: -1 | 1 = -1;
  crPose: 'walk' | 'carry' | 'hang' | 'flee' = 'walk';
  crA = 1;
  legT = 0;
  still: Partial<Record<SekiSpot, { kind: SekiKind; cm: number }>> = {};

  // ---- the pull
  tension = 0;
  grip = 1;
  depth = 0;
  danger = 0.9;
  gauge = 0;
  shake = 0;

  net = 0;
  netX = 0;

  card: CardState | null = null;
  cues = new Cues();
  words: Word[] = [];
  motes: { x: number; y: number; vx: number; vy: number; c: string }[] = [];
  bubbles: { x: number; y: number; v: number }[] = [];
  splash: { x: number; t: number }[] = [];
  /** 浮きの まわりの 輪（ツン）。 */
  rings: { x: number; t: number }[] = [];

  constructor(readonly stage: number) {
    for (let i = 0; i < 12; i++)
      this.motes.push({
        x: Math.random() * SCN_W,
        y: WY + 4 + Math.random() * (FY - WY - 8),
        vx: 3 + Math.random() * 3,
        vy: (Math.random() - 0.5) * 0.6,
        c: i % 3 === 0 ? '#9BCB6B' : i % 3 === 1 ? '#C8A06A' : '#E8E4D8',
      });
    for (let i = 0; i < 14; i++) this.bubbles.push({ x: 8 + Math.random() * 100, y: WY + 4 + Math.random() * 44, v: 8 + Math.random() * 10 });
  }

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
    this.rings = this.rings.filter((s) => (s.t += dt) < 600);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt / 90);
    if (this.floatDip > 0) this.floatDip = Math.max(0, this.floatDip - dt);
    if (this.wake > 0) this.wake = Math.max(0, this.wake - dt);
    if (this.card) this.card.t += dt;
    if (this.still1) return;
    const s = dt / 1000;
    const ne = this.stage === 2;
    for (const m of this.motes) {
      // the current runs downstream (to the right, away from the weir); stage 2 lifts to the north-east
      m.x += (m.vx + (ne ? 3 : 0)) * s;
      m.y += (m.vy - (ne ? 1.4 : 0)) * s;
      if (m.x > SCN_W) m.x -= SCN_W;
      if (m.y < WY + 3) m.y = FY - 4;
      if (m.y > FY - 3) m.y = WY + 4;
    }
    for (const b of this.bubbles) {
      b.y -= b.v * s;
      b.x += (ne ? 6 : 2) * s;
      if (b.y < WY + 2) {
        b.y = WY + 20 + Math.random() * 30;
        b.x = 8 + Math.random() * 90;
      }
    }
    this.legT += dt;
  }

  word(text: string, x: number, y: number, ms = 700): void {
    this.words.push({ text, x, y, t: 0, ms });
  }

  // ---------------------------------------------------------------- drawing

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    const sx = SX + (this.shake > 0 ? Math.round(Math.sin(this.t / 16) * this.shake) : 0);
    const sy = SY + dy;
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      g.clip(SX, sy, SCN_W, SCN_H, () => {
        if (this.card) this.drawCard(g, SX, sy);
        else this.drawScene(g, sx, sy);
      });
      this.drawTail(g, PY + dy + PH);
      if (!this.card) {
        const name = SEKI_SPOT_NAME[this.spot];
        const tw = g.measure(name) + 16;
        const tx = SX + 8;
        drawTape(g, tx, PY + dy - 5, tw, 16, name, { seed: 4 });
        markText(tx, PY + dy - 5, tw, 16);
        if (this.phase === 'pick') {
          const bob = Math.floor(this.t / 280) % 2;
          this.arrow(g, tx - 7 - bob, PY + dy + 3, -1);
          this.arrow(g, tx + tw + 3 + bob, PY + dy + 3, 1);
        }
        if (this.record > 0 && this.phase === 'pick') {
          const rt = `${SEKI_UI.record} ${this.record}cm`;
          const rw = g.measure(rt) + 14;
          drawTape(g, SX + SCN_W - rw - 6, PY + dy - 5, rw, 16, rt, { seed: 6, color: '#F6D98A' });
          markText(SX + SCN_W - rw - 6, PY + dy - 5, rw, 16);
        }
      }
    });
    if (this.gauge > 0) this.drawGauge(g);
    for (const w of this.words) {
      const p = w.t / w.ms;
      const yy = Math.round(sy + w.y - p * 6);
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, sx + w.x, yy, { color: UI.bg, outline: UI.border, align: 'center', alpha: al });
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
    const [tx] = pointScreen();
    const x = Math.max(PX + 12, Math.min(PX + PW - 12, tx));
    for (let i = 0; i < 5; i++) {
      g.rect(x - 4 + i, bottom - 1 + i, 9 - i * 2, 1, UI.border);
      if (i < 4) g.rect(x - 3 + i, bottom - 2 + i, 7 - i * 2, 1, UI.bg);
    }
  }

  private drawScene(g: Gfx, ox: number, oy: number): void {
    g.img(sekiBg(this.stage), ox, oy);
    const frozen = this.still1;
    const ne = this.stage === 2;
    const t = this.t;
    // ---- the falling water of the weir: streaks running down (stage 1: held, as a white plate)
    const { x0, x1, crest } = SK_FALL;
    const fallH = WY - crest - 2;
    for (let x = x0 + 1; x <= x1; x += 3) {
      // a bright dash 3–5px long running down each lane, at its own speed
      const sp = 0.05 + ((x * 7) % 5) * 0.012;
      const ph = frozen ? ((x * 13) % 17) / 17 : ((t * sp) / fallH + ((x * 13) % 17) / 17) % 1;
      const y = crest + 2 + Math.floor(ph * fallH);
      const len = 3 + (x % 3);
      const bend = ne ? Math.round(((y - crest) / (WY - crest)) * 3) : 0;
      g.rect(ox + x + bend, oy + y, 1, Math.min(len, WY - y), '#FFF6D8', 0.85);
    }
    // the white water where it lands, thrown up
    for (let i = x0; i <= x1; i += 3) {
      const up = frozen ? ((i * 5) % 3) + 1 : Math.round(Math.abs(Math.sin((t / 110 + i) * 1.3)) * 3);
      g.rect(ox + i + (ne ? 2 : 0), oy + WY - up, 1, up, '#FFF6D8', 0.7);
    }
    for (const b of this.bubbles) g.rect(ox + Math.round(b.x), oy + Math.round(b.y), 1, 1, '#E8F4F0', 0.85);
    // surface glints
    for (let i = 0; i < 14; i++) {
      const x = (i * 47 + (frozen ? 0 : Math.floor(t / 80) * (i % 2 ? 1 : -1))) % SCN_W;
      const xx = x < 0 ? x + SCN_W : x;
      if (xx < x1 + 10) continue;
      g.rect(ox + xx, oy + WY + 1 + (i % 3), 3 + (i % 2), 1, '#FFF6D8', 0.45);
    }
    for (const sp of this.splash) {
      const k = sp.t / 420;
      const r = Math.round(3 + k * 10);
      const al = 0.8 * (1 - k);
      g.rect(ox + sp.x - r, oy + WY, 3, 1, '#FFF6D8', al);
      g.rect(ox + sp.x + r - 2, oy + WY, 3, 1, '#FFF6D8', al);
    }
    for (const rg of this.rings) {
      const k = rg.t / 600;
      const r = Math.round(2 + k * 6);
      g.rect(ox + rg.x - r, oy + WY, 2, 1, '#FFF6D8', 0.7 * (1 - k));
      g.rect(ox + rg.x + r - 1, oy + WY, 2, 1, '#FFF6D8', 0.7 * (1 - k));
    }
    for (const m of this.motes) g.rect(ox + Math.round(m.x), oy + Math.round(m.y), 1, 1, m.c, 0.5);
    // ---- the tells of each place (nothing on the line)
    if (this.phase === 'pick' || this.phase === 'drop') this.drawTells(g, ox, oy);
    // ---- stage 1: a shrimp holding still at each place
    if (frozen) {
      for (const sp of SK_ORDER) {
        const st = this.still[sp];
        if (!st || (this.crOn && sp === this.spot && this.phase !== 'pick')) continue;
        const geo = SK_SPOTS[sp];
        const f: -1 | 1 = geo.side < 0 ? 1 : -1;
        this.drawCreature(g, ox, oy, st.kind, st.cm, 'walk', f, geo.x + (f > 0 ? -3 : 3), STAND_Y, 1, 0);
      }
    }
    if (this.crOn) this.drawCreature(g, ox, oy, this.kind, this.cm, this.crPose, this.face, Math.round(this.crX), Math.round(this.crY), this.crA, Math.floor(this.legT / 180) % 2);
    this.drawLine(g, ox, oy);
    if (this.dots >= 0) this.drawDots(g, ox, oy);
    if (this.net > 0) this.drawNet(g, ox, oy);
  }

  private drawTells(g: Gfx, ox: number, oy: number): void {
    if (this.still1) return;
    const t = this.t;
    // the gap: two long feelers waving out now and then
    const [hx, hy] = SK_SPOTS.sukima.home;
    const c1 = t % 3800;
    if (c1 < 1400) {
      const w = Math.floor(t / 200) % 2;
      for (let i = 0; i < 10; i++) g.px(ox + hx - 4 - i, oy + hy - 2 - Math.floor((i * i) / 14) - (i > 6 ? w : 0), '#6E6048');
    }
    // the foam: a long claw tip showing from the boulders
    const [ax, ay] = SK_SPOTS.awa.home;
    const c2 = (t + 1600) % 4400;
    if (c2 < 1200) for (let i = 0; i < 5; i++) g.px(ox + ax + 5 + i, oy + ay - 1 - (i > 2 ? 1 : 0), '#3E4250');
    // the log: two eyes in its shade (stage 2: a very long arm reaches out)
    const [rx, ry] = SK_SPOTS.ryuboku.home;
    const c3 = t % 5000;
    if (c3 > 2800 && c3 < 3900) {
      g.px(ox + rx - 2, oy + ry - 1, '#E8E4D8');
      g.px(ox + rx + 1, oy + ry - 1, '#E8E4D8');
    }
    if (this.stage === 2) {
      const w = Math.floor(t / 260) % 2;
      for (let i = 0; i < 16; i++) g.px(ox + rx - 6 - i, oy + ry + 1 - (i > 10 ? w : 0), '#34364A');
    }
  }

  private drawCreature(g: Gfx, ox: number, oy: number, kind: SekiKind, cm: number, pose: 'walk' | 'carry' | 'hang' | 'flee', face: -1 | 1, tx: number, ty: number, alpha: number, leg: number): void {
    let im: ShrimpImg;
    const ant = Math.floor(this.legT / 320) % 2;
    if (kind === 'goby') im = pose === 'hang' ? gobyHang(cm, leg) : goby(cm, { leg, curl: pose === 'flee' });
    else im = pose === 'hang' ? shrimpHang(kind, cm, { leg, ant }) : shrimp(kind, cm, { leg, ant, carry: pose === 'carry', curl: pose === 'flee' });
    const flip = pose !== 'hang' && face > 0;
    let x: number;
    let y: number;
    if (pose === 'hang') {
      x = tx - im.tip[0];
      y = ty - im.tip[1];
    } else {
      x = flip ? tx - (im.img.width - 1 - im.tip[0]) : tx - im.tip[0];
      y = ty - im.ay;
    }
    g.img(im.img, ox + x, oy + y, { flipX: flip, alpha: alpha < 1 ? alpha : undefined });
  }

  /** The float on the surface, the line up out of the window, the faint line down to the bait. */
  private drawLine(g: Gfx, ox: number, oy: number): void {
    const fl = floatImg(this.opiFloat);
    const fx = Math.round(this.floatX);
    const bob = this.still1 || !this.floatOn ? 0 : Math.round(Math.sin(this.t / 420));
    const fy = WY - Math.round(fl.height * 0.55) + bob + (this.floatDip > 0 ? 2 : 0) - Math.round(this.floatUp);
    // the line from the rod (out of the window, up) to the float's top
    const rx = fx - 18 + (this.stage === 2 ? 4 : 0);
    for (let y = 0; y < fy; y++) {
      const x = Math.round(rx + ((fx - rx) * y) / Math.max(1, fy));
      g.px(ox + x, oy + y, '#F4F1E8');
    }
    if (!this.floatOn) return;
    if (this.slack) {
      g.img(fl, ox + fx - Math.floor(fl.width / 2), oy + fy);
      return;
    }
    // the faint line under the water down to the bait
    const bx = Math.round(this.baitX);
    const by = Math.round(this.baitY);
    const top = fy + fl.height;
    const n = Math.max(1, by - top);
    for (let y = top; y < by; y++) {
      const x = Math.round(fx + ((bx - fx) * (y - top)) / n);
      if ((y & 1) === 0) g.px(ox + x, oy + y, '#E8E4D8');
    }
    if (this.baitOn) g.img(akamushiImg(), ox + bx - 2, oy + by - 2);
    // the wake beside the float as it walks (すーっ)
    if (this.wake > 0) {
      const d = -this.wakeDir;
      for (let i = 1; i < 5; i++) g.px(ox + fx + d * (2 + i * 2), oy + WY + (i % 2), '#FFF6D8');
    }
    g.img(fl, ox + fx - Math.floor(fl.width / 2), oy + fy);
  }

  private drawDots(g: Gfx, ox: number, oy: number): void {
    const fx = Math.round(this.floatX);
    const y = WY - 22;
    for (let i = 0; i < 3; i++) {
      const lit = i < this.dots;
      const img = dotImg(lit);
      const x = fx - 13 + i * 9;
      g.img(img, ox + x, oy + y);
    }
    markText(ox + fx - 16, oy + y - 2, 32, 12, true);
  }

  private drawNet(g: Gfx, ox: number, oy: number): void {
    const k = Math.min(1, this.net);
    const up = Math.max(0, this.net - 1);
    const hx = Math.round(this.netX);
    const ny = Math.round(WY + 4 - up * 60 - (1 - k) * 40);
    const x0 = SCN_W + 4;
    const y0 = ny - 50;
    for (let i = 0; i <= 60; i++) {
      const x = Math.round(x0 + ((hx + 12 - x0) * i) / 60);
      const y = Math.round(y0 + ((ny - y0) * i) / 60);
      g.rect(ox + x, oy + y, 1, 2, i % 9 === 0 ? '#8A5A3A' : '#C8A06A');
    }
    for (let a = 0; a < 32; a++) {
      const th = (a / 32) * Math.PI * 2;
      g.rect(ox + Math.round(hx + Math.cos(th) * 12), oy + Math.round(ny + Math.sin(th) * 3), 1, 1, '#6B7186');
    }
    for (let yy = 1; yy < 12; yy++) {
      const half = Math.round(11 * Math.sqrt(1 - yy / 12));
      for (let xx = -half; xx <= half; xx += 2) g.rect(ox + hx + xx + (yy % 2), oy + ny + yy, 1, 1, '#E8E4D8', 0.6);
    }
  }

  // ---------------------------------------------------------------- the card (計る)

  private drawCard(g: Gfx, ox: number, oy: number): void {
    const c = this.card!;
    g.rect(ox, oy, SCN_W, SCN_H, UI.bg);
    for (let x = 6; x < SCN_W; x += 12) g.rect(ox + x, oy, 1, SCN_H, UI.bg2);
    for (let y = 6; y < SCN_H; y += 12) g.rect(ox, oy + y, SCN_W, 1, UI.bg2);
    g.rect(ox + 22, oy, 1, SCN_H, UI.margin, 0.45);
    const S = 3;
    const im = c.kind === 'goby' ? goby(c.cm, { leg: 0 }) : shrimp(c.kind, c.cm, { leg: 0 });
    if (c.noRuler) {
      // (the ones that are not measured: in the middle of the page, as big as fits)
      const sc = Math.max(1, Math.min(S, Math.floor((SCN_W - 40) / im.img.width), Math.floor((SCN_H - 16) / im.img.height)));
      g.img(im.img, ox + Math.round(SCN_W / 2 - (im.img.width * sc) / 2), oy + Math.round(SCN_H / 2 - (im.img.height * sc) / 2) + 2, { scale: sc });
      return;
    }
    const ruler = rulerImg();
    // the ruler right of the arms; the shrimp's forehead at 0, its long arms out in front of it
    const arm = im.ax;
    const rx = ox + Math.max(30, Math.min(SCN_W - ruler.width * S - 8, 26 + arm * S - 2 * S));
    const ry = oy + 74;
    g.img(ruler, rx, ry, { scale: S });
    for (const n of [0, 5, 10, 15, 20]) g.text(String(n), rx + (2 + n * SK_PX_PER_CM) * S + 1, ry + ruler.height * S + 1, { color: UI.pencil, align: 'center' });
    const cx = rx + 2 * S - im.ax * S;
    const cy = ry - 1 - im.ay * S;
    g.img(im.img, cx, cy, { scale: S });
    if (c.step < 1) return;
    const tailX = rx + (2 + c.cm * SK_PX_PER_CM) * S;
    g.rect(tailX, ry - 6, 1, ruler.height * S + 8, UI.accent);
    const txt = `${c.cm}cm`;
    const nx = ox + SCN_W - 52;
    g.text(txt, nx, oy + 10, { color: UI.pencil, align: 'center' });
    markText(nx - 30, oy + 10, 60, 36);
    if (c.step >= 2 && c.cert !== c.cm) {
      const w = g.measure(txt);
      const k = Math.min(1, c.t / 220);
      g.rect(nx - w / 2 - 2, oy + 17, Math.round((w + 4) * k), 1, UI.accent);
      g.rect(nx - w / 2 - 2, oy + 18, Math.round((w + 4) * k), 1, UI.accentDark);
      if (c.t > 260) g.text(`${c.cert}cm`, nx + 4, oy + 30, { color: UI.accent, align: 'center' });
    } else if (c.step >= 2) {
      const k = Math.min(1, c.t / 300);
      for (let a = 0; a < 110 * k; a++) {
        const th = -Math.PI / 2 + (a / 110) * Math.PI * 2.1;
        g.rect(Math.round(nx + Math.cos(th) * 24), Math.round(oy + 17 + Math.sin(th) * 11), 1, 1, UI.accent);
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
      if (this.danger <= 1) {
        const am = -Math.PI / 2 + zone * Math.PI * 2;
        const mx = Math.round(cx + Math.cos(am) * (R + 5));
        const my = Math.round(cy + Math.sin(am) * (R + 5));
        g.rect(mx - 2, my - 1, 5, 1, UI.accentDark);
        g.rect(mx - 1, my, 3, 1, UI.accentDark);
        g.px(mx, my + 1, UI.accentDark);
      }
      const open = Math.max(0, Math.min(4, Math.round((1 - this.grip) * 4.4)));
      const sh = this.grip < 0.45 ? (Math.floor(this.t / 50) % 2 ? 1 : 0) : 0;
      g.img(chelaIcon(this.kind, open), cx - 11 + sh, cy - 6);
    });
  }
}

const chelaCache = new Map<string, HTMLCanvasElement>();
/** The slender claw of a テナガエビ in the gauge (22×12): `open` 0 (shut) … 4 (wide). ヨシノボリ: its mouth. */
function chelaIcon(kind: SekiKind, open: number): HTMLCanvasElement {
  const key = `${kind}:${open}`;
  const hit = chelaCache.get(key);
  if (hit) return hit;
  const p = new PixelCanvas(22, 12);
  const [B, Lt, D] = kind === 'osu' || kind === 'taisho' ? ['#5E6274', '#8A8EA0', '#3E4250'] : kind === 'goby' ? ['#7A6A4A', '#9A8A62', '#4A3E2A'] : ['#8A7A5A', '#B8A880', '#5E5240'];
  if (kind === 'goby') {
    // a goby's head, its mouth opening
    p.ellipse(9, 6, 8, 4, B);
    p.hline(3, 14, 3, Lt);
    p.set(6, 4, '#2A2440');
    for (let i = 0; i < 4; i++) p.set(17 + Math.min(i, 2), 5 - Math.round(open * 0.5), D);
    p.hline(15, 19, 7 + Math.round(open * 0.3), D);
  } else {
    // the long thin arm from the left, the two slender fingers at the right
    p.hline(0, 12, 6, B);
    p.hline(0, 12, 5, Lt);
    p.hline(0, 12, 7, D);
    p.rect(12, 4, 3, 5, B);
    for (let i = 0; i < 7; i++) {
      const k = i / 6;
      p.set(15 + i, 4 - Math.round(open * 0.9 * k), i < 3 ? Lt : B);
      p.set(15 + i, 8 + Math.round(open * 0.3 * k), D);
    }
  }
  p.outline(UI.border);
  const c = p.toCanvas();
  chelaCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- where the window points

/** Where the deep pool in front of Minato is on the screen (the window's tail points at it). */
function pointScreen(): [number, number] {
  const f = field();
  if (!f) return [140, 180];
  const p = f.player;
  const [x, y] = f.worldToScreen(p.x - 22, p.y - 6);
  return [x, y];
}

function homeX(spot: SekiSpot): number {
  const geo = SK_SPOTS[spot];
  return geo.home[0] - geo.side * 4;
}

// ---------------------------------------------------------------- open / close

export function* openSeki(stage: number, record: number, opiFloat: boolean): Co<SekiPanel> {
  const p = new SekiPanel(stage);
  p.record = record;
  p.opiFloat = opiFloat;
  if (stage === 1) for (const sp of SK_ORDER) p.still[sp] = { kind: STILL_KIND[sp], cm: rollCm(STILL_KIND[sp]) };
  game.ui.push(p);
  sfx('se_tsuri_open');
  yield* animate(200, (k) => (p.open = k), ease.linear);
  p.open = 1;
  p.clearInput();
  return p;
}

export function* closeSeki(p: SekiPanel): Co {
  p.cues.clear();
  p.gauge = 0;
  yield* animate(160, (k) => (p.open = 1 - k), ease.linear);
  p.done = true;
  game.ui.remove(p);
}

// ---------------------------------------------------------------- one round

export type SekiOutcome = 'caught' | 'early' | 'carry' | 'lost' | 'drop' | 'quit';
export interface SekiResult {
  outcome: SekiOutcome;
  spot: SekiSpot;
  kind: SekiKind;
  cm: number;
}
export interface SekiOpts {
  first: boolean;
  /** Rounds at the log since the 大将 was last seen (it shows at the 9th). */
  dry: number;
  force?: { kind?: SekiKind; cm?: number; spot?: SekiSpot; outcome?: SekiOutcome };
}

const HOLD_CUE = (p: SekiPanel, phase: 'wait' | 'hold' | 'zone') => {
  const text = phase === 'zone' ? SEKI_UI.release : SEKI_UI.hold;
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

/** The float drifts over its place (stage 2: drawn off to the north-east, the right). */
function idleFloat(p: SekiPanel): void {
  const x = SK_SPOTS[p.spot].x;
  if (p.phase === 'pick') {
    p.floatX += (x - p.floatX) * 0.35;
    if (Math.abs(p.floatX - x) < 0.5) p.floatX = x;
    p.baitX = p.floatX;
  }
}

/** Wait `ms`; a press in it ends the wait early with the given outcome (null: waited it out). */
function* waitPress(p: SekiPanel, ms: number, each?: (t: number) => void): Co<boolean> {
  for (let t = 0; t < ms; t += 16.7) {
    each?.(t);
    if (!p.auto && p.take('confirm')) return true;
    yield null;
  }
  return false;
}

export function* playSeki(p: SekiPanel, o: SekiOpts): Co<SekiResult> {
  const stage = p.stage;
  p.phase = 'pick';
  p.card = null;
  p.baitOn = true;
  p.slack = false;
  p.crOn = false;
  p.tension = 0;
  p.grip = 1;
  p.depth = 0;
  p.net = 0;
  p.dots = -1;
  p.floatOn = false;
  p.floatUp = 0;
  if (o.force?.spot) p.spot = o.force.spot;
  p.clearInput();
  // ---- pick the place
  let autoWait = 700;
  for (;;) {
    idleFloat(p);
    p.baitY = 20;
    if (p.auto) {
      if ((autoWait -= 16.7) <= 0) break;
      yield null;
      continue;
    }
    if (p.take('cancel')) return { outcome: 'quit', spot: p.spot, kind: 'mesu', cm: 0 };
    const i = SK_ORDER.indexOf(p.spot);
    if (p.take('left') && i > 0) {
      p.spot = SK_ORDER[i - 1];
      sfx('se_cursor');
    }
    if (p.take('right') && i < SK_ORDER.length - 1) {
      p.spot = SK_ORDER[i + 1];
      sfx('se_cursor');
    }
    if (p.take('confirm')) break;
    yield null;
  }
  const spot = p.spot;
  const geo = SK_SPOTS[spot];
  const kind: SekiKind = o.force?.kind ?? (stage === 1 ? p.still[spot]!.kind : rollSeki(spot, stage, o));
  const cm = o.force?.cm ?? (stage === 1 ? p.still[spot]!.cm : rollCm(kind));
  p.kind = kind;
  p.cm = cm;
  const spec: KindSpec = o.first ? { ...KIND[kind], danger: 0.95, drain: 1.1, thrash: 0, back: 0.035 } : KIND[kind];
  // ---- drop: the float lands, the red worms sink on their little hook
  p.phase = 'drop';
  p.floatX = geo.x;
  p.baitX = geo.x;
  sfx('se_tsuri_cast');
  p.floatOn = true;
  p.floatUp = 14;
  yield* animate(180, (k) => (p.floatUp = 14 * (1 - k)), ease.quadIn);
  p.floatUp = 0;
  sfx('se_tsuri_pochan', { pitch: 1.15 });
  p.splash.push({ x: geo.x, t: 0 });
  p.word('ポチャン', geo.x, WY - 24, 600);
  const rest = FY - 3;
  p.baitY = WY + 4;
  yield* animate(p.still1 ? 420 : 620, (k) => (p.baitY = WY + 4 + (rest - WY - 4) * k), ease.quadOut);
  p.baitY = rest;
  p.clearInput();
  const side = geo.side;
  const face: -1 | 1 = side < 0 ? 1 : -1;
  p.face = face;
  const tipAt = geo.x + (face > 0 ? -2 : 2);
  const fled = (outcome: SekiOutcome): Co<SekiResult> =>
    (function* () {
      yield* fleeAnim(p, outcome);
      return { outcome, spot, kind, cm };
    })();

  if (p.still1) {
    // ---- stage 1: it holds still with the worms already in its claws; the dots are lit
    p.crOn = true;
    p.crPose = 'carry';
    p.crX = tipAt;
    p.crY = STAND_Y;
    p.crA = 1;
    p.dots = 3;
    yield 300;
  } else {
    // ---- out of its home, to the bait (a press here: 早い)
    p.phase = 'wait';
    const [hx] = geo.home;
    p.crOn = true;
    p.crPose = 'walk';
    p.crA = 0;
    p.crX = hx;
    p.crY = STAND_Y;
    let w = (o.first ? 500 : 700 + Math.random() * 1200) + (kind === 'taisho' ? 600 : 0);
    const drift = stage === 2 ? 0.02 : 0;
    if (kind === 'taisho') {
      sfx('se_tsuri_nushi', { pitch: 1.2 });
      p.shake = 1;
    }
    if (yield* waitPress(p, w, () => (p.floatX += drift))) return yield* fled('early');
    const x0 = p.crX;
    const dist = Math.abs(tipAt - x0);
    const ms = (dist / spec.walk) * 1000;
    if (
      yield* waitPress(p, ms, (t) => {
        const k = t / ms;
        p.crX = x0 + (tipAt - x0) * k;
        p.crA = Math.min(1, k * 4);
        p.floatX += drift;
      })
    )
      return yield* fled('early');
    p.crX = tipAt;
    p.crA = 1;
    // ツン……ツン：it touches the worms; the float dips
    const touches = o.first ? 2 : 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < touches; i++) {
      if (yield* waitPress(p, 380 + Math.random() * 520)) return yield* fled('early');
      p.floatDip = 200;
      p.rings.push({ x: Math.round(p.floatX), t: 0 });
      sfx('se_tsuri_tsun', { pitch: 1.1 });
      p.word(SEKI_UI.tsun, Math.round(p.floatX) + 12, WY - 18, 650);
      if (yield* waitPress(p, 220)) return yield* fled('early');
    }
    if (yield* waitPress(p, 300 + Math.random() * 400)) return yield* fled('early');
    // すーっ：it takes the worms in its claws and walks home with them; the float slides sideways
    p.phase = 'carry';
    p.crPose = 'carry';
    sfx('se_tsuri_line', { pitch: 0.9, vol: 0.7 });
    p.word(SEKI_UI.suu, Math.round(p.floatX) + side * 16, WY - 18, 900);
    const carryMs = (o.first ? 1300 : 1100 + Math.random() * 1000) * (kind === 'taisho' ? 1.4 : 1);
    const hxEnd = homeX(spot);
    const cx0 = p.crX;
    const bx0 = p.baitX;
    const fx0 = p.floatX;
    const dx = (hxEnd - cx0) * 0.75;
    p.wakeDir = side;
    if (
      yield* waitPress(p, carryMs, (t) => {
        const k = ease.sineInOut(t / carryMs);
        p.crX = cx0 + dx * k;
        p.baitX = bx0 + dx * k;
        p.floatX = fx0 + dx * k + (stage === 2 ? t / 200 : 0);
        p.wake = 120;
      })
    )
      return yield* fled('carry');
    // ぴた：it stops in the gap and starts to eat; three dots light one by one
    p.phase = 'eat';
    p.word(SEKI_UI.stop, Math.round(p.floatX), WY - 30, 700);
    sfx('se_tsuri_tsun', { pitch: 0.7, vol: 0.7 });
    p.dots = 0;
    for (let i = 0; i < 3; i++) {
      if (yield* waitPress(p, o.first ? 700 : 600 + Math.random() * 350)) {
        p.dots = -1;
        return yield* fled('early');
      }
      p.dots = i + 1;
      sfx('se_cursor', { pitch: 1.2 + i * 0.15, vol: 0.6 });
    }
  }

  // ---- 長押し：up it comes, gently
  p.clearInput();
  HOLD_CUE(p, 'wait');
  p.tension = 0;
  p.grip = 1;
  p.depth = 0;
  p.danger = p.still1 ? 1.01 : spec.danger - (stage === 2 ? 0.03 : 0);
  yield* animate(160, (k) => (p.gauge = k), ease.backOut);
  const window = p.still1 ? Infinity : 2600;
  let started = false;
  for (let t = 0; t < window; t += 16.7) {
    if (p.auto ? t > 350 : p.take('confirm') || (p.hold && t > 120)) {
      started = true;
      break;
    }
    yield null;
  }
  if (!started) {
    // ごちそうさま：the worms are eaten, the hook comes up bare
    p.cues.drop('hold', 'off');
    p.dots = -1;
    yield* animate(200, (k) => (p.gauge = 1 - k));
    p.word(SEKI_UI.lost, Math.round(p.floatX), WY - 24, 900);
    p.baitOn = false;
    yield* backHome(p, homeX(spot));
    return { outcome: 'lost', spot, kind, cm };
  }
  p.phase = 'pull';
  p.dots = -1;
  p.crPose = 'hang';
  let thrashT = 900 + Math.random() * 900;
  let lastZone = false;
  let autoHeld = true;
  let bottomT = 0;
  const back = p.still1 ? 0 : spec.back * (stage === 2 ? 1.15 : 1);
  const bottom = FY - 3;
  const top = WY - 8;
  let result: SekiOutcome | null = null;
  const bx = p.baitX;
  const fxs = p.floatX;
  let creak = 0;
  for (;;) {
    const dt = 16.7 / 1000;
    let holding: boolean;
    if (p.auto) {
      if (autoHeld && p.tension > p.danger - 0.06) autoHeld = false;
      else if (!autoHeld && p.tension < p.danger - 0.38) autoHeld = true;
      holding = autoHeld;
    } else holding = p.hold;
    p.tension = holding ? Math.min(1, p.tension + 0.55 * dt) : Math.max(0, p.tension - 1.6 * dt);
    p.depth += holding ? (p.tension * 0.45 - back * 0.4) * dt : -back * dt;
    p.depth = Math.max(0, Math.min(1, p.depth));
    p.danger = p.still1 ? 1.01 : spec.danger - (stage === 2 ? 0.03 : 0) - Math.max(0, p.depth - 0.7) * 0.5;
    const zone = p.tension > p.danger;
    if (zone && !p.still1) {
      p.grip -= spec.drain * dt;
      if (!lastZone) sfx('se_tsuri_slip');
    } else p.grip = Math.min(1, p.grip + 0.35 * dt);
    lastZone = zone;
    HOLD_CUE(p, zone ? 'zone' : 'hold');
    if (!p.still1 && spec.thrash > 0) {
      thrashT -= 16.7;
      if (thrashT <= 0) {
        thrashT = 1400 + Math.random() * 1200;
        if (Math.random() < spec.thrash) {
          p.tension = Math.min(1, p.tension + 0.12 + Math.random() * 0.06);
          p.shake = 1.2;
          sfx('se_tsuri_thrash', { pitch: 1.2 });
        }
      }
    }
    if (holding && (creak -= 16.7) <= 0) {
      creak = 82;
      sfx('se_tsuri_reel', { pitch: 1.15 + 0.6 * p.tension, vol: zone ? 1 : 0.8 });
    }
    const drift = stage === 2 ? p.depth * 8 : 0;
    const sway = p.still1 ? 0 : Math.sin(p.t / 190) * (1 + p.tension);
    p.baitX = bx + drift + sway;
    p.baitY = bottom + (top - bottom) * p.depth;
    p.floatX = fxs + drift * 0.5;
    p.floatUp = Math.max(0, (p.depth - 0.8) * 30);
    p.crX = p.baitX;
    p.crY = p.baitY + 2;
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
    sfx('se_tsuri_poton', { pitch: 1.2 });
    p.word(SEKI_UI.poton, Math.round(p.crX), Math.min(WY - 14, Math.round(p.crY) - 16), 800);
    p.crPose = 'flee';
    const fy0 = p.crY;
    yield* animate(380, (k) => (p.crY = fy0 + (STAND_Y - fy0) * k), ease.quadIn);
    p.crPose = 'walk';
    yield* backHome(p, homeX(spot));
    return { outcome: 'drop', spot, kind, cm };
  }
  if (result === 'lost') {
    p.baitOn = false;
    p.crPose = 'walk';
    p.crY = STAND_Y;
    yield* backHome(p, homeX(spot));
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
  p.splash.push({ x: Math.round(p.baitX), t: 0 });
  const cy0 = p.crY;
  const by0 = p.baitY;
  yield* animate(420, (k) => {
    p.net = 1 + k;
    p.crY = cy0 - k * 60;
    p.baitY = by0 - k * 60;
  }, ease.quadIn);
  p.crOn = false;
  p.net = 0;
  p.floatOn = false;
  p.onNet?.(false);
  return { outcome: 'caught', spot, kind, cm };
}

/** 早い／運んでる：it lets go of the worms and darts back home, tail first. */
function* fleeAnim(p: SekiPanel, outcome: SekiOutcome): Co {
  const text = outcome === 'carry' ? SEKI_UI.carry : SEKI_UI.early;
  p.cues.set('early', text, { x: SX + SCN_W / 2, y: SY + 20, align: 'center', tone: 'off', mode: 'still' });
  sfx('se_tsuri_hayai', { pitch: 1.1 });
  p.dots = -1;
  if (p.crOn && p.crA > 0.2) {
    p.crPose = 'flee';
    const x0 = p.crX;
    const hx = homeX(p.spot);
    yield* animate(260, (k) => {
      p.crX = x0 + (hx - x0) * k;
      p.crA = 1 - k * 0.8;
    }, ease.quadOut);
  }
  p.crOn = false;
  yield 500;
  p.cues.drop('early', 'off');
}

function* backHome(p: SekiPanel, hx: number): Co {
  const x0 = p.crX;
  p.crPose = 'walk';
  yield* animate(700, (k) => {
    p.crX = x0 + (hx - x0) * k;
    p.crA = 1 - Math.max(0, k - 0.6) / 0.4;
  }, ease.quadInOut);
  p.crOn = false;
}

// ---------------------------------------------------------------- after the catch

export function* sekiCard(p: SekiPanel, kind: SekiKind, cm: number, o: { noRuler?: boolean } = {}): Co {
  p.phase = 'card';
  p.card = { kind, cm, cert: cm, step: 0, t: 0, noRuler: o.noRuler };
  sfx('se_tsuri_card');
  yield 380;
}

export function* sekiMeasure(p: SekiPanel): Co {
  if (!p.card) return;
  sfx('se_pen_write');
  p.card.step = 1;
  p.card.t = 0;
  yield 420;
}

export function* sekiMori(p: SekiPanel, cert: number): Co {
  if (!p.card) return;
  p.card.cert = cert;
  p.card.step = 2;
  p.card.t = 0;
  sfx('se_pen_write', { pitch: 1.15 });
  yield 520;
}

/** Back to the water: it is let go at its place and goes home. */
export function* sekiRelease(p: SekiPanel, spot: SekiSpot, kind: SekiKind, cm: number): Co {
  p.card = null;
  p.phase = 'release';
  const geo = SK_SPOTS[spot];
  p.spot = spot;
  p.kind = kind;
  p.cm = cm;
  p.baitOn = false;
  p.floatOn = false;
  p.crOn = true;
  p.crPose = 'hang';
  p.crA = 1;
  p.crX = geo.x;
  p.crY = WY - 10;
  sfx('se_tsuri_release');
  const y0 = p.crY;
  yield* animate(520, (k) => (p.crY = y0 + (FY - 10 - y0) * k), ease.quadOut);
  p.splash.push({ x: geo.x, t: 0 });
  p.crPose = 'walk';
  p.crY = STAND_Y;
  p.face = geo.side < 0 ? 1 : -1;
  yield 260;
  yield* backHome(p, homeX(spot));
}

// ---------------------------------------------------------------- camera and guide

/** The camera: Minato (9,11) and おぴぃ low under the window. */
export function sekiCamera(): { x: number; y: number } {
  return { x: 192, y: 122 };
}

export function sekiGuideRows(): [string[], string][] {
  const ok = touchControlsOn() ? 'けってい' : 'Z';
  return [
    [['left', 'right'], 'ばしょ'],
    [[ok], '下ろす・待って 長押し'],
  ];
}

// ---------------------------------------------------------------- QA

import { registerDebug } from '../debug';

registerDebug('sekiSheet', (scale = 4) => {
  const kinds: ['mesu' | 'osu' | 'tamago' | 'taisho', number][] = [['mesu', 5], ['mesu', 7], ['osu', 7], ['osu', 9], ['tamago', 6], ['taisho', 9]];
  const cell = 90;
  const cv = document.createElement('canvas');
  cv.width = cell * 4 * scale;
  cv.height = cell * (kinds.length + 1) * scale * 0.6;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#4E7E72';
  ctx.fillRect(0, 0, cv.width, cv.height);
  kinds.forEach(([k, cm], j) => {
    const imgs = [shrimp(k, cm, { leg: 0 }).img, shrimp(k, cm, { leg: 1, carry: true, ant: 1 }).img, shrimp(k, cm, { leg: 0, curl: true }).img, shrimpHang(k, cm, { leg: 0 }).img];
    imgs.forEach((im, i) => ctx.drawImage(im, (i * cell + 4) * scale, (j * cell * 0.6 + 4) * scale, im.width * scale, im.height * scale));
  });
  [goby(4, { leg: 0 }).img, goby(6, { leg: 1 }).img, gobyHang(5, 0).img, floatImg(false), floatImg(true), akamushiImg()].forEach((im, i) =>
    ctx.drawImage(im, (i * 40 + 4) * scale, (kinds.length * cell * 0.6 + 4) * scale, im.width * scale, im.height * scale),
  );
  return cv.toDataURL();
});

registerDebug('sekiState', () => {
  const p = game.ui.widgets.find((w) => w instanceof SekiPanel) as SekiPanel | undefined;
  if (!p) return null;
  return { phase: p.phase, spot: p.spot, kind: p.kind, cm: p.cm, dots: p.dots, tension: +p.tension.toFixed(2), danger: +p.danger.toFixed(2), grip: +p.grip.toFixed(2), depth: +p.depth.toFixed(2), cues: p.cues.peek(), card: p.card?.step ?? null };
});
