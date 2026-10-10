// 夜振りの ドジョウ（第2章。2026-10-05 依頼主の採用：げむきかの 改1「水辺の 図鑑」、もとは 10-04 の
// 案5。02_ch2_index #81、50_ch2_story 10.27、52_ch2_level_art 7.9）。
//
//   ・トマじい（npc_hoshi_tome を 包む）：トマトの 灯りを 持って 話すと〔yoburi〕（1回）。それから
//     はじめて すくって 放した あとに〔report〕＋〔mori〕、カワニナ・用水路の ぬしを 知らせると 1回ずつ。
//   ・農具小屋の たも網（obj_hr_koya_tamo）：〔yoburi〕の あとで 借りる（グソっ君との かけ合い）。
//   ・用水路の 南の 岸 (14–15,21)・(17–18,21) を 北向きに 調べる（obj_hoshi_yoburi）→ 夜振りの 小窓。
//     ← → で 灯りの 輪を 動かす。ドジョウは 泥の 上で ひげと 目が 光る。ときどき 水面へ のぼって
//     「ぱくっ」と 空気を 吸い、もどる とき おしりから 泡（泡の 所に いる）。輪の まん中に
//     入れると まぶしくて 泥に もぐる。輪の はしに 入れたまま 決定で、グソっ君が 下から すくう。
//     3びきで ひと区切り（数えて 放す）。何度でも。h2 は 防災無線の 呼び声の たびに 泥に もぐる。
//   ・『みずべ』②の 欄（グソっ君）、沢ガニ（沢の上 3びき）、駅ノートの しゅんの 1行（②を ぜんぶ）。
//   ・①②を ぜんぶ うめた 人：エンディングの カット4bで、とまたろうが 肩に たも網『マル』を かつぐ
//     （絵だけ。秒数・台詞は かえない）。
//
// QA：__game.cmd.yoburi(step)  'tome'（トマじいの 前）/'tamo'（小屋の たも網の 前）/'go'（用水路の 岸、
//      たも網つき）/'play'（すぐ 小窓）、yoburiState()、yoburiSheet(scale)、yoburiText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { markText } from '../../engine/textzones';
import { touchControlsOn } from '../../engine/touch';
import { animate, ease } from '../../engine/tween';
import { Cues } from '../../battle/ui/cue';
import { flag, hasItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, registerWorldFx } from '../../world/api';
import { field } from '../../world/field';
import { getScript } from '../../world/scripts';
import { playCall } from '../../world/hoshi';
import { sfx } from '../../audio';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { CALL_NAMES, callLine } from '../../data/text/hoshi_npcs';
import {
  SCN_H,
  SCN_W,
  YB_FLOOR_Y,
  YB_INLET,
  YB_PX_PER_CM,
  YB_SPOTS,
  YB_WATER_Y,
  creature,
  handleRuler,
  lanternImg,
  spotAt,
  yoburiBg,
  type YoburiKind,
} from '../../art/props/yoburi_art';
import { floatImg } from '../../art/props/seki_tsuri_art';
import { MIZUBE_CH2_TEXTS, SAWAGANI, YOBURI, YOBURI_EKINOTE, YOBURI_SPOT, YOBURI_SPOT_NAME, YOBURI_TAMO, YOBURI_TOME, YOBURI_UI } from '../../data/text/mizube_ch2';
import { zukanComplete, zukanCount, zukanRecord, zukanSee, ZUKAN } from '../../data/text/mizube_book';
import { F, panBack, panTo, walkTo } from '../lib';
import { forceBoxPos, keyGuide } from '../stage';
import { hStage, lanternOn, say } from './common';
import { ekinoteHooks } from './ekinote';
import { mizubeTextCheck } from '../mizube_check';

export const YB = {
  /** トマじいの〔yoburi〕を 聞いた。 */
  ask: 'flag_yoburi_ask',
  /** たも網を 借りた。 */
  tamo: 'flag_yoburi_tamo',
  /** 夜振りを した 回数（1回＝3びきまで）。 */
  rounds: 'flag_yoburi_rounds',
  /** すくった 数（全部）。 */
  count: 'flag_yoburi_count',
  /** すくう 合図を した 回数（用水路の ぬしは 8回 すくえば 出る）。 */
  scoops: 'flag_yoburi_scoops',
  first: 'flag_yoburi_first',
  awa: 'flag_yoburi_awa',
  dive: 'flag_yoburi_dive',
  ooki: 'flag_yoburi_ooki',
  yago: 'flag_yoburi_yago',
  kawanina: 'flag_yoburi_kawanina',
  nushi: 'flag_yoburi_nushi',
  /** トマじいへの 知らせ（すくって 放した／カワニナ／ぬし）。 */
  report: 'flag_yoburi_report',
  reportKawanina: 'flag_yoburi_report_kawanina',
  reportNushi: 'flag_yoburi_report_nushi',
  measured: 'flag_yoburi_measured',
  howto: 'flag_yoburi_howto',
  /** ②の『みずべ』。 */
  book2: 'flag_mizube_book2',
  /** 沢ガニ（沢の上の 3びき：いつもの 1ぴき a b）。 */
  kani0: 'flag_yoburi_kani_0',
  kaniA: 'flag_yoburi_kani_a',
  kaniB: 'flag_yoburi_kani_b',
  /** 駅ノートに 書きたした（②の 表紙の シール）。 */
  ekinote: 'flag_yoburi_ekinote_done',
} as const;

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

// ---------------------------------------------------------------- 置き場所（tsuri.ts と 同じ 窓）

const PX = 24;
const PY = 4;
const PW = SCN_W + 8;
const PH = SCN_H + 8;
const SX = PX + 4;
const SY = PY + 4;
const WY = YB_WATER_Y;
const FY = YB_FLOOR_Y;
/** 灯りの 輪：半径と、まぶしい まん中。 */
const R = 30;
const RC = 9;
const RING_Y = FY - 6;

// ---------------------------------------------------------------- 生き物

type CrState = 'hide' | 'out' | 'up' | 'dive' | 'caught';

interface Cr {
  kind: YoburiKind;
  cm: number;
  x: number;
  /** 腹が つく 行（泥の 上、カワニナは 石垣の 上）。 */
  y: number;
  /** 泳いでいる ときの 高さ（0 = 底、1 = 水面）。 */
  up: number;
  state: CrState;
  t: number;
  face: -1 | 1;
}

const RANGE: Record<YoburiKind, [number, number]> = {
  dojou: [10, 13],
  chibi: [4, 6],
  ooki: [15, 18],
  yago: [4, 5],
  kawanina: [2, 3],
  dojou_nushi: [20, 20],
};
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const rollCm = (k: YoburiKind) => {
  const [a, b] = RANGE[k];
  return a + Math.floor(Math.random() * (b - a + 1));
};

/** 用水路の ぬしが 出る：8回 すくったら（第1章の おぴぃの 浮きが あれば 4回）。 */
function nushiReady(): boolean {
  return flag(YB.scoops) >= (hasItem('item_tamotsu_uki') ? 4 : 8);
}

function spawn(): Cr[] {
  const out: Cr[] = [];
  const mk = (kind: YoburiKind, x0: number, x1: number, y = FY): Cr => ({
    kind,
    cm: rollCm(kind),
    x: Math.round(rnd(x0, x1)),
    y,
    up: 0,
    state: 'hide',
    t: rnd(600, 2600),
    face: Math.random() < 0.5 ? -1 : 1,
  });
  // 橋の 西の 泥だまり
  out.push(mk('dojou', 14, 54), mk('dojou', 60, 104), mk('chibi', 30, 96));
  // 水口の 下
  out.push(mk(Math.random() < 0.55 ? 'ooki' : 'dojou', 124, 170), mk('yago', 172, 206));
  // 石垣の すき間：カワニナ（石の 上）、ぬし（すき間の 奥）
  out.push({ ...mk('kawanina', 230, 300), y: 66 + Math.round(rnd(0, 20)), state: 'out', t: 1e9 });
  if (nushiReady()) out.push({ ...mk('dojou_nushi', 262, 290), face: -1 });
  return out;
}

// ---------------------------------------------------------------- 小窓

interface CardState {
  kind: YoburiKind;
  cm: number;
  step: number;
  t: number;
  noRuler?: boolean;
}

export class YoburiPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  phase: 'look' | 'scoop' | 'card' | 'release' | 'end' = 'look';
  ringX = 60;
  crs: Cr[] = [];
  /** この 回に すくった（バケツの 中）。 */
  bucket: { kind: YoburiKind; cm: number }[] = [];
  /** 泡。 */
  bubbles: { x: number; y: number; v: number; life: number }[] = [];
  puffs: { x: number; y: number; t: number }[] = [];
  words: { text: string; x: number; y: number; t: number; ms: number }[] = [];
  cues = new Cues();
  /** たも網（下から）：x と 0..1（上がる）。 */
  net = 0;
  netX = 0;
  netHold: Cr | null = null;
  card: CardState | null = null;
  /** h2：次の 呼び声まで（ms）。呼んでいる 間は callOn > 0。 */
  callT = 7000;
  callOn = 0;
  auto = false;
  /** 第1章の おぴぃの 浮きを 持っている（用水路の ぬしの 上に 浮かべる）。 */
  uki = hasItem('item_tamotsu_uki');
  /** はじめて 泡を 見た（グソっ君の ひとことを 待つ）。 */
  sawBubble = false;
  dived = false;

  private eConfirm = false;
  private eCancel = false;
  private holdL = false;
  private holdR = false;

  constructor(readonly stage: number) {}

  take(k: 'confirm' | 'cancel'): boolean {
    const key = k === 'confirm' ? 'eConfirm' : 'eCancel';
    const v = this[key];
    this[key] = false;
    return v;
  }
  clearInput(): void {
    this.eConfirm = this.eCancel = false;
  }

  /** Is this one in the light (and where: 'edge' can be scooped, 'core' is too bright)? */
  lit(c: Cr): 'core' | 'edge' | null {
    const d = Math.abs(c.x - this.ringX);
    if (c.kind === 'kawanina') return d < R ? 'edge' : null;
    if (d < RC) return 'core';
    return d < R ? 'edge' : null;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (input.pressed('confirm')) this.eConfirm = true;
    if (input.pressed('cancel')) this.eCancel = true;
    this.holdL = input.down('left');
    this.holdR = input.down('right');
    this.cues.update(dt);
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    this.puffs = this.puffs.filter((p) => (p.t += dt) < 500);
    if (this.card) this.card.t += dt;
    const s = dt / 1000;
    for (const b of this.bubbles) {
      b.y -= b.v * s;
      b.x += Math.sin((this.t + b.v * 37) / 140) * 0.15 + (this.stage === 2 ? 3 * s : 0);
      b.life -= dt;
    }
    this.bubbles = this.bubbles.filter((b) => b.y > WY + 1 && b.life > 0);
    if (this.phase !== 'look') return;
    // ---- the lantern moves along the bank (← →)
    if (!this.auto) {
      const v = 80 * s;
      if (this.holdL) this.ringX = Math.max(12, this.ringX - v);
      if (this.holdR) this.ringX = Math.min(SCN_W - 14, this.ringX + v);
    }
    // ---- h2: the loudspeaker calls now and then; while it calls they all go into the mud
    if (this.stage >= 2) {
      if (this.callOn > 0) this.callOn -= dt;
      else if ((this.callT -= dt) <= 0) {
        this.callT = rnd(9000, 12000);
        this.callOn = 3200;
        const name = CALL_NAMES[Math.floor(Math.random() * CALL_NAMES.length)];
        game.scripts.run(playCall(callLine(name), { stage: 2, indoor: true }));
        for (const c of this.crs) if (c.state === 'hide' || c.state === 'out' || c.state === 'up') this.dive(c, 3400, true);
      }
    }
    // ---- each one's little life: in the mud with its head out → out on the mud → up for air → back
    for (const c of this.crs) {
      if (c.state === 'caught') continue;
      c.t -= dt;
      if (c.kind === 'kawanina') continue;
      // too bright: into the mud
      if ((c.state === 'hide' || c.state === 'out') && this.lit(c) === 'core') {
        this.dive(c, rnd(2800, 4200));
        continue;
      }
      if (c.state === 'up') {
        // up to the surface for a gulp, then back down, bubbles from its vent
        const per = 1600;
        const k = 1 - c.t / per;
        c.up = k < 0.5 ? Math.sin(k * Math.PI) : Math.sin(k * Math.PI);
        if (c.t <= per / 2 && c.t + dt > per / 2) {
          this.word(YOBURI_UI.paku, c.x, WY - 8, 600);
          sfx('se_yoburi_paku');
        }
        if (k > 0.55 && Math.random() < dt / 120) this.bubbles.push({ x: c.x + c.face * 10, y: FY - c.up * (FY - WY - 6) - 2, v: rnd(10, 16), life: 4000 });
        if (c.t <= 0) {
          c.up = 0;
          c.state = 'out';
          c.t = rnd(2000, 4200);
          for (let i = 0; i < 3; i++) this.bubbles.push({ x: c.x + c.face * 9 + rnd(-1, 1), y: FY - 3, v: rnd(9, 15), life: 4000 });
          sfx('se_yoburi_awa', { vol: Math.abs(c.x - this.ringX) < R * 2 ? 1 : 0.5 });
          if (Math.abs(c.x - this.ringX) < R * 1.8) this.sawBubble = true;
        }
        continue;
      }
      if (c.t > 0) continue;
      if (c.state === 'dive') {
        c.state = 'hide';
        c.t = rnd(1800, 3600);
      } else if (c.state === 'hide') {
        c.state = 'out';
        c.t = rnd(2400, 4800);
      } else if (c.state === 'out') {
        // the loaches go up for air now and then (the ヤゴ and the ぬし stay down)
        if ((c.kind === 'dojou' || c.kind === 'chibi' || c.kind === 'ooki') && Math.random() < 0.55 && this.callOn <= 0) {
          c.state = 'up';
          c.t = 1600;
        } else {
          c.state = 'hide';
          c.t = rnd(2000, 4000);
        }
        // a slow turn and a little shuffle along the mud
        c.face = Math.random() < 0.5 ? -1 : 1;
        const [x0, x1] = YB_SPOTS[spotAt(c.x)];
        c.x = Math.max(x0 + 8, Math.min(x1 - 8, c.x + Math.round(rnd(-10, 10))));
      }
    }
  }

  dive(c: Cr, ms: number, quiet = false): void {
    c.state = 'dive';
    c.up = 0;
    c.t = ms;
    this.puffs.push({ x: c.x, y: FY - 1, t: 0 });
    if (!quiet) {
      sfx('se_yoburi_dive');
      this.word(YOBURI_UI.dive, c.x, FY - 16, 600);
      this.dived = true;
    }
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
    const sy = SY + dy;
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      g.clip(SX, sy, SCN_W, SCN_H, () => {
        if (this.card) this.drawCard(g, SX, sy);
        else this.drawScene(g, SX, sy);
      });
      this.drawTail(g, PY + dy + PH);
      if (!this.card) {
        const name = YOBURI_SPOT_NAME[spotAt(this.ringX)];
        const tw = g.measure(name) + 16;
        drawTape(g, SX + 8, PY + dy - 5, tw, 16, name, { seed: 7 });
        markText(SX + 8, PY + dy - 5, tw, 16);
        // the bucket: how many this time (3 makes a round)
        const bt = `${this.bucket.length}/3${YOBURI_UI.count}`;
        const bw = g.measure(bt) + 14;
        drawTape(g, SX + SCN_W - bw - 6, PY + dy - 5, bw, 16, bt, { seed: 8, color: '#F6D98A' });
        markText(SX + SCN_W - bw - 6, PY + dy - 5, bw, 16);
      }
    });
    for (const w of this.words) {
      const p = w.t / w.ms;
      const yy = Math.round(sy + w.y - p * 6);
      const al = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.text(w.text, SX + w.x, yy, { color: UI.bg, outline: UI.border, align: 'center', alpha: al });
      markText(SX + w.x - 30, yy, 60, 16, true);
    }
    this.cues.draw(g, this.t);
  }

  private drawTail(g: Gfx, bottom: number): void {
    const f = field();
    const tx = f ? f.worldToScreen(f.player.x, f.player.y - 24)[0] : 200;
    const x = Math.max(PX + 12, Math.min(PX + PW - 12, tx));
    for (let i = 0; i < 5; i++) {
      g.rect(x - 4 + i, bottom - 1 + i, 9 - i * 2, 1, UI.border);
      if (i < 4) g.rect(x - 3 + i, bottom - 2 + i, 7 - i * 2, 1, UI.bg);
    }
  }

  private drawScene(g: Gfx, ox: number, oy: number): void {
    const dark = yoburiBg(this.stage, false);
    const lit = yoburiBg(this.stage, true);
    g.img(dark, ox, oy);
    const t = this.t;
    // the water falling from the inlet (a thin white thread, always)
    const [ix, iy] = YB_INLET;
    for (let y = iy + 4; y < WY; y++) if ((y + Math.floor(t / 60)) % 3) g.px(ox + ix - 1 + (y % 2), oy + y, '#C8D8E8');
    // ---- the light: the lit picture inside the ring, row by row (crisp edges), a warm core
    const rx = Math.round(this.ringX);
    const breathe = Math.round(Math.sin(t / 200) * 1.2);
    const rr = R + breathe;
    const ctx = g.ctx;
    for (let d = -rr; d <= rr; d++) {
      const yy = RING_Y + d;
      if (yy < WY - 18 || yy >= SCN_H) continue;
      const half = Math.floor(Math.sqrt(rr * rr - d * d) * 1.25);
      const x0 = Math.max(0, rx - half);
      const x1 = Math.min(SCN_W, rx + half);
      if (x1 <= x0) continue;
      ctx.drawImage(lit, x0, yy, x1 - x0, 1, ox + x0, oy + yy, x1 - x0, 1);
    }
    // the light's edge (three steps of warm colour, dithered) and the dazzling core
    for (let a = 0; a < 96; a++) {
      const th = (a / 96) * Math.PI * 2;
      const ex = Math.round(rx + Math.cos(th) * rr * 1.25);
      const ey = Math.round(RING_Y + Math.sin(th) * rr);
      if (ey < WY - 18 || ey >= SCN_H) continue;
      if (a % 2) g.px(ox + ex, oy + ey, '#F2894B');
    }
    g.alpha(0.35 + 0.1 * Math.sin(t / 160), () => {
      for (let d = -RC; d <= RC; d++) {
        const half = Math.floor(Math.sqrt(RC * RC - d * d) * 1.2);
        g.rect(ox + rx - half, oy + RING_Y + d, half * 2 + 1, 1, '#FFE7C0');
      }
    });
    // the lantern itself over the water, and its light going down
    const ly = 4;
    g.img(lanternImg(), ox + rx - 8, oy + ly);
    g.alpha(0.12, () => {
      for (let y = ly + 14; y < RING_Y - rr + 6; y++) {
        const w = Math.round(4 + ((y - ly) / (RING_Y - ly)) * rr * 1.6);
        g.rect(ox + rx - w, oy + y, w * 2, 1, '#FFB070');
      }
    });
    // ---- the creatures (in the light: whole; out of it: nothing but their bubbles)
    for (const c of this.crs) this.drawCr(g, ox, oy, c);
    // chapter 1's おぴぃの浮き (with Shun): floating over the ぬし's gap, shaken by its bubbles
    if (this.uki)
      for (const c of this.crs) {
        if (c.kind !== 'dojou_nushi' || c.state === 'caught') continue;
        const fl = floatImg(true);
        const shake = c.state === 'dive' ? 0 : Math.round(Math.sin(t / 90) * (c.state === 'out' ? 1.5 : 0.8));
        g.img(fl, ox + c.x - 2 + shake, oy + WY - 5 + (Math.floor(t / 400) % 2));
      }
    for (const b of this.bubbles) g.px(ox + Math.round(b.x), oy + Math.round(b.y), Math.abs(b.x - rx) < rr * 1.25 ? '#FFF6D8' : '#8E9AB8');
    for (const p of this.puffs) {
      const k = p.t / 500;
      for (let i = -3; i <= 3; i++) g.px(ox + p.x + i * 2, oy + p.y - Math.round(Math.sin(k * Math.PI) * (3 - Math.abs(i) * 0.6)), '#6E5A44');
    }
    // ---- the net from below (グソっ君)
    if (this.net > 0) this.drawNet(g, ox, oy);
    // h2 while the loudspeaker calls: a small horn at the top, its sound rings
    if (this.callOn > 0) {
      const hx = SCN_W - 22;
      g.rect(ox + hx, oy + 12, 4, 3, '#C8C2B4');
      g.rect(ox + hx + 4, oy + 10, 2, 7, '#C8C2B4');
      for (let i = 0; i < 3; i++) if (Math.floor(t / 180 + i) % 3 === 0) g.rect(ox + hx + 8 + i * 3, oy + 11 - i, 1, 5 + i * 2, '#FFE7A3');
    }
  }

  private drawCr(g: Gfx, ox: number, oy: number, c: Cr): void {
    if (c.state === 'caught') return;
    if (this.netHold === c) return;
    const where = this.lit(c);
    const wig = Math.floor((this.t + c.x * 13) / 220) % 2;
    if (c.kind === 'kawanina') {
      if (!where) return;
      const im = creature('kawanina', c.cm, 0);
      g.img(im.img, ox + c.x - 5, oy + c.y - im.ay);
      return;
    }
    if (c.state === 'dive') return;
    const im = creature(c.kind, c.cm, wig);
    const flip = c.face > 0;
    const yUp = Math.round(c.up * (FY - WY - 8));
    const x = flip ? c.x - (im.img.width - 1 - im.ax) : c.x - im.ax;
    if (c.state === 'up') {
      // swimming up: drawn wherever it is (it passes through the light or the dark)
      if (!where && Math.abs(c.x - this.ringX) > R * 1.3) return;
      g.img(im.img, ox + x, oy + c.y - im.ay - yUp, { flipX: flip });
      return;
    }
    if (!where) return;
    if (c.state === 'hide') {
      // in the mud: only the head — the eye shines, the whiskers show
      const ex = flip ? c.x + im.ax - im.eye[0] : c.x - im.ax + im.eye[0];
      const eyY = oy + FY - 2;
      g.px(ox + ex, eyY, '#FFF6D8');
      const d = flip ? 1 : -1;
      for (let i = 1; i <= 3; i++) {
        g.px(ox + ex + d * (1 + i), eyY + 1 + (i % 2), '#C8B080');
      }
      if (c.kind === 'yago') g.px(ox + ex - d, eyY, '#FFF6D8');
      return;
    }
    // out on the mud
    g.img(im.img, ox + x, oy + c.y - im.ay, { flipX: flip });
    const ex = flip ? c.x + im.ax - im.eye[0] : c.x - im.ax + im.eye[0];
    g.px(ox + ex, oy + c.y - im.ay + im.eye[1], '#FFF6D8');
  }

  private drawNet(g: Gfx, ox: number, oy: number): void {
    // a short-handled net coming up from under the bank (グソっ君 holds it from below)
    const k = Math.min(1, this.net);
    const up = Math.max(0, this.net - 1);
    const hx = Math.round(this.netX);
    const ny = Math.round(SCN_H + 10 - k * (SCN_H + 10 - FY + 8) - up * 70);
    for (let i = 0; i < 40; i++) g.rect(ox + hx + 14 + Math.round(i * 0.3), oy + ny + 4 + i, 1, 1, '#C8A06A');
    for (let a = 0; a < 28; a++) {
      const th = (a / 28) * Math.PI * 2;
      g.px(ox + Math.round(hx + Math.cos(th) * 11), oy + Math.round(ny + Math.sin(th) * 3), '#6B7186');
    }
    for (let yy = 1; yy < 9; yy++) {
      const half = Math.round(10 * Math.sqrt(1 - yy / 9));
      for (let xx = -half; xx <= half; xx += 2) g.rect(ox + hx + xx + (yy % 2), oy + ny - yy, 1, 1, '#E8E4D8', 0.55);
    }
    if (this.netHold) {
      const im = creature(this.netHold.kind, this.netHold.cm, Math.floor(this.t / 120) % 2);
      g.img(im.img, ox + hx - Math.round(im.img.width / 2), oy + ny - im.img.height - 1);
    }
  }

  // ---------------------------------------------------------------- the card (マルの 目盛り)

  private drawCard(g: Gfx, ox: number, oy: number): void {
    const c = this.card!;
    g.rect(ox, oy, SCN_W, SCN_H, UI.bg);
    for (let x = 6; x < SCN_W; x += 12) g.rect(ox + x, oy, 1, SCN_H, UI.bg2);
    for (let y = 6; y < SCN_H; y += 12) g.rect(ox, oy + y, SCN_W, 1, UI.bg2);
    g.rect(ox + 22, oy, 1, SCN_H, UI.margin, 0.45);
    const S = 3;
    const im = creature(c.kind, c.cm, 0);
    if (c.noRuler) {
      const sc = Math.max(1, Math.min(S, Math.floor((SCN_W - 40) / im.img.width)));
      g.img(im.img, ox + Math.round(SCN_W / 2 - (im.img.width * sc) / 2), oy + Math.round(SCN_H / 2 - (im.img.height * sc) / 2), { scale: sc });
      return;
    }
    const ruler = handleRuler();
    const rx = ox + 40;
    const ry = oy + 72;
    g.img(ruler, rx, ry, { scale: S });
    for (const n of [0, 5, 10, 15, 20]) g.text(String(n), rx + (2 + n * YB_PX_PER_CM) * S + 1, ry + ruler.height * S + 1, { color: UI.pencil, align: 'center' });
    const cx = rx + 2 * S - im.ax * S;
    const cy = ry - im.ay * S - 2;
    g.img(im.img, cx, cy, { scale: S });
    if (c.step < 1) return;
    const tailX = rx + (2 + c.cm * YB_PX_PER_CM) * S;
    g.rect(tailX, ry - 6, 1, ruler.height * S + 8, UI.accent);
    const txt = `${c.cm}cm`;
    const nx = ox + SCN_W - 52;
    g.text(txt, nx, oy + 10, { color: UI.pencil, align: 'center' });
    markText(nx - 30, oy + 10, 60, 18);
    // (no bump here: an honest ring round it — トマじいは 盛らない)
    const k = Math.min(1, c.t / 300);
    for (let a = 0; a < 110 * k; a++) {
      const th = -Math.PI / 2 + (a / 110) * Math.PI * 2.1;
      g.rect(Math.round(nx + Math.cos(th) * 24), Math.round(oy + 17 + Math.sin(th) * 11), 1, 1, UI.accent);
    }
  }
}

// ---------------------------------------------------------------- one round

export interface YoburiScoop {
  quit: boolean;
  caught: { kind: YoburiKind; cm: number } | null;
}

export function* openYoburi(stage: number): Co<YoburiPanel> {
  const p = new YoburiPanel(stage);
  game.ui.push(p);
  sfx('se_tsuri_open');
  yield* animate(200, (k) => (p.open = k), ease.linear);
  p.open = 1;
  p.clearInput();
  return p;
}

/**
 * Light the water until one is scooped (its card shown) or the cancel key. The water
 * (p.crs) and the bucket carry over between scoops of a round. Firsts (the bubbles,
 * the dazzle) come up as they happen; the light waits for them.
 */
export function* scoop(p: YoburiPanel, onFirst: (key: 'awa' | 'dive') => Co): Co<YoburiScoop> {
  p.phase = 'look';
  p.card = null;
  p.clearInput();
  let autoT = 0;
  for (;;) {
    if (p.sawBubble && !flag(YB.awa)) {
      setFlag(YB.awa, 1);
      yield* onFirst('awa');
      p.clearInput();
    }
    if (p.dived && !flag(YB.dive)) {
      setFlag(YB.dive, 1);
      yield* onFirst('dive');
      p.clearInput();
    }
    if (!p.auto && p.take('cancel')) return { quit: true, caught: null };
    let go = false;
    if (p.auto) {
      // QA: walk the light to the nearest one on the mud, stop with it at the edge, scoop
      autoT += 16.7;
      const tgt = p.crs.filter((c) => c.state === 'out' || c.state === 'hide').sort((a, b) => Math.abs(a.x - p.ringX) - Math.abs(b.x - p.ringX))[0];
      if (tgt) {
        const want = tgt.x + (tgt.x > p.ringX ? -R + 8 : R - 8);
        p.ringX += Math.sign(want - p.ringX) * Math.min(Math.abs(want - p.ringX), 1.4);
        go = autoT > 900 && Math.abs(want - p.ringX) < 2 && p.lit(tgt) === 'edge';
      }
      if (autoT > 20000) return { quit: true, caught: null };
    } else go = p.take('confirm');
    if (!go) {
      yield null;
      continue;
    }
    autoT = 0;
    setFlag(YB.scoops, flag(YB.scoops) + 1);
    // the one to scoop: lit at the edge, on the mud (the nearest to the light's middle)
    const cand = p.crs
      .filter((c) => (c.state === 'out' || c.state === 'hide') && p.lit(c) === 'edge')
      .sort((a, b) => Math.abs(a.x - p.ringX) - Math.abs(b.x - p.ringX))[0];
    p.phase = 'scoop';
    p.netX = cand ? cand.x : p.ringX;
    sfx('se_yoburi_net');
    yield* animate(320, (k) => (p.net = k), ease.quadOut);
    if (!cand) {
      // スカ：mud only; the ones near it dive
      p.word(YOBURI_UI.miss, p.ringX, FY - 18, 700);
      for (const c of p.crs) if ((c.state === 'out' || c.state === 'hide') && Math.abs(c.x - p.ringX) < R + 12) p.dive(c, rnd(2500, 4000), true);
      p.puffs.push({ x: Math.round(p.ringX), y: FY - 1, t: 0 });
      yield* animate(260, (k) => (p.net = 1 - k), ease.quadIn);
      p.net = 0;
      p.phase = 'look';
      if (!flag('flag_yoburi_miss') && kanenariHere()) {
        setFlag('flag_yoburi_miss', 1);
        yield* say(YOBURI.miss);
      }
      p.clearInput();
      continue;
    }
    // lifted out from under, held in the net
    p.netHold = cand;
    sfx('se_tsuri_agari', { pitch: 0.9 });
    p.word(YOBURI_UI.scoop, cand.x, FY - 20, 700);
    yield* animate(460, (k) => (p.net = 1 + k), ease.quadIn);
    p.net = 0;
    cand.state = 'caught';
    p.netHold = null;
    p.bucket.push({ kind: cand.kind, cm: cand.cm });
    // on the handle's marks
    p.phase = 'card';
    p.card = { kind: cand.kind, cm: cand.cm, step: 0, t: 0, noRuler: cand.kind === 'dojou_nushi' };
    sfx('se_tsuri_card');
    yield 420;
    if (cand.kind !== 'dojou_nushi') {
      p.card.step = 1;
      p.card.t = 0;
      sfx('se_pen_write');
      yield 650;
    }
    return { quit: false, caught: { kind: cand.kind, cm: cand.cm } };
  }
}

// ---------------------------------------------------------------- the session

/** After each scoop: the card's words, the notebook. */
function* afterCatch(p: YoburiPanel, kind: YoburiKind, cm: number): Co {
  const kane = kanenariHere();
  setFlag(YB.count, flag(YB.count) + 1);
  if (!flag(YB.first)) {
    setFlag(YB.first, 1);
    if (kane) yield* say(YOBURI.first);
    // ②の『みずべ』
    if (!flag(YB.book2)) {
      setFlag(YB.book2, 1);
      if (kane) yield* say(flag('flag_mizube_book') ? YOBURI.book_ch1 : YOBURI.book_new);
      sfx('se_pen_write');
      yield* say(YOBURI.book_sys);
    }
  }
  if (kind === 'ooki' && !flag(YB.ooki)) {
    setFlag(YB.ooki, 1);
    yield* say(kane ? YOBURI.ooki : YOBURI.ooki.split('@npc_kanenari')[0]);
  }
  if (kind === 'yago' && !flag(YB.yago)) {
    setFlag(YB.yago, 1);
    yield* say(kane ? YOBURI.yago : YOBURI.yago.split('@npc_kanenari')[0]);
  }
  if (kind === 'kawanina' && !flag(YB.kawanina)) {
    setFlag(YB.kawanina, 1);
    yield* say(YOBURI.kawanina);
  }
  if (kind === 'dojou_nushi') {
    yield* say(flag(YB.nushi) ? YOBURI.nushi_again : YOBURI.nushi);
    setFlag(YB.nushi, 1);
    zukanSee('dojou_nushi');
  } else {
    zukanRecord(kind, cm);
    setFlag(YB.measured, 1);
  }
  yield* noteNew(kind);
}

/** 『みずべ』②に はじめて 書いた 種の 知らせ。 */
function* noteNew(id: string): Co {
  if (!flag(YB.book2) || flag(`flag_zukan_${id}_noted`)) return;
  setFlag(`flag_zukan_${id}_noted`, 1);
  const e = ZUKAN.find((z) => z.id === id);
  if (!e) return;
  const [n, all] = zukanCount(2);
  yield* say(`@sys
『みずべ』②に 書きこんだ。
（${e.name}　${n}/${all}）`);
}

let qaAuto = false;

function* yoburiSession(): Co {
  const f = F();
  const p = f.player;
  const s = hStage();
  if (p.tileY !== 22 || p.tileX < 14 || p.tileX > 18) yield* walkTo('player', 15, 22, { face: 'up' });
  p.dir = 'up';
  forceBoxPos('bottom');
  yield* panTo((p.x + 40 - 8) / 16, (22 * 16 + 8 - 62 - 8) / 16, 500);
  const panel = yield* openYoburi(s);
  panel.auto = qaAuto;
  panel.ringX = 60;
  if (!flag(YB.howto)) {
    setFlag(YB.howto, 1);
    if (kanenariHere()) yield* say(YOBURI_SPOT.howto);
    panel.clearInput();
    if (!qaAuto) keyGuide(yoburiGuideRows(), 4200, 8);
  }
  const onFirst = function* (key: 'awa' | 'dive'): Co {
    if (!kanenariHere()) return;
    yield* say(key === 'awa' ? YOBURI.awa : YOBURI.dive);
  };
  try {
    for (;;) {
      setFlag(YB.rounds, flag(YB.rounds) + 1);
      panel.crs = spawn();
      panel.bucket = [];
      let quit = false;
      // three scoops make a round: each one's words, then the light goes on
      while (panel.bucket.length < 3) {
        const r = yield* scoop(panel, onFirst);
        if (r.quit || !r.caught) {
          quit = true;
          break;
        }
        yield* afterCatch(panel, r.caught.kind, r.caught.cm);
        panel.card = null;
        panel.phase = 'look';
        panel.clearInput();
        if (qaAuto) break;
      }
      if (panel.bucket.length) {
        // count them, let them go
        panel.phase = 'release';
        yield* say(YOBURI.count);
        sfx('se_tsuri_release');
        for (const c of panel.crs)
          if (c.state === 'caught') {
            c.state = 'dive';
            c.t = 600;
            panel.puffs.push({ x: c.x, y: FY - 1, t: 0 });
          }
        yield 500;
        const n = flag('flag_yoburi_release');
        setFlag('flag_yoburi_release', n + 1);
        if (kanenariHere()) yield* say(n ? YOBURI.release_2[n % YOBURI.release_2.length] : YOBURI.release);
      }
      if (qaAuto || quit) break;
      const i = yield* say(YOBURI_SPOT.again);
      if (i !== 0) break;
    }
  } finally {
    if (!panel.done) {
      panel.cues.clear();
      panel.done = true;
      game.ui.remove(panel);
    }
  }
  yield* panBack(500);
  forceBoxPos(null);
}

export function yoburiGuideRows(): [string[], string][] {
  const ok = touchControlsOn() ? 'けってい' : 'Z';
  return [
    [['left', 'right'], '灯りを 動かす'],
    [[ok], YOBURI_UI.hint],
  ];
}

// ================================================================ トマじい（npc_hoshi_tome を 包む）

/**
 * Is one of his other lines due first? The story's (課長の 話、沢の 頼みと 待ち、名前の 石、マルの 伝言 —
 * sawa.ts の 順) and the other errands' (バケツの 稲・二百十日・70年の 色紙): the night fishing waits
 * for the next talk.
 */
function tomeStoryFirst(): boolean {
  if (state.taken['sym_hoshi_03'] && state.taken['sym_hoshi_06'] && !flag('flag_seen_npc_hoshi_tome_kacho_done')) return true;
  if (flag('flag_ch2_sawa_wait')) return true;
  if (hasItem('item_namae_ishi') && !flag('flag_ch2_sawa_ishi')) return true;
  if (!flag('flag_ch2_maru_told') && (flag('flag_maru_dengon') || flag('flag_met_maru')) && (flag('flag_seen_npc_hoshi_tome_h0_2') || hStage() >= 1)) return true;
  if (hStage() >= 1 && hStage() <= 2 && flag('flag_ch2_got_otsukare') && !flag('flag_ch2_sawa_open')) return true;
  if (flag('flag_toban_seal') && !flag('flag_ch2_toban_tome')) return true;
  if (flag('flag_nihyaku_hyou') && !flag('flag_nihyaku_tome') && !flag('flag_nihyaku_done')) return true;
  if (hasItem('item_shikishi') && !flag('flag_shikishi_tome')) return true;
  return false;
}

/** His side of it, before his usual lines: 〔yoburi〕, then the reports (each once). True when one was said. */
function* tomeYoburi(): Co<boolean> {
  const s = hStage();
  if (s < 1 || s > 2 || !lanternOn() || tomeStoryFirst()) return false;
  if (!flag(YB.ask)) {
    setFlag(YB.ask, 1);
    yield* say(YOBURI_TOME.ask);
    return true;
  }
  if (flag(YB.count) > 0 && !flag(YB.report)) {
    setFlag(YB.report, 1);
    yield* say(YOBURI_TOME.report);
    if (flag(YB.measured)) yield* say(YOBURI_TOME.mori);
    return true;
  }
  if (flag(YB.kawanina) && !flag(YB.reportKawanina)) {
    setFlag(YB.reportKawanina, 1);
    yield* say(YOBURI_TOME.kawanina);
    return true;
  }
  if (flag(YB.nushi) && !flag(YB.reportNushi)) {
    setFlag(YB.reportNushi, 1);
    yield* say(YOBURI_TOME.nushi);
    // グソっ君 heard おぴぃ say it at the crayfish ぬし in chapter 1
    if (kanenariHere() && flag('flag_mizube_nushi_kane')) yield* say(YOBURI_TOME.nushi_kane);
    return true;
  }
  return false;
}

{
  const orig = getScript('npc_hoshi_tome');
  registerScript('npc_hoshi_tome', function* (ctx): Co {
    // (the story's lines and the other errands' come first: tomeStoryFirst)
    if (yield* tomeYoburi()) return;
    if (orig) yield* orig(ctx);
    else yield* ctx.runDefault();
  });
}

// ================================================================ 農具小屋の たも網

registerScript('obj_hr_koya_tamo', function* (): Co {
  sfx('se_examine');
  if (flag(YB.tamo)) {
    yield* say(YOBURI_TAMO.after);
    return;
  }
  if (!flag(YB.ask)) {
    yield* say(YOBURI_TAMO.look);
    return;
  }
  yield* say(YOBURI_TAMO.take);
  if (kanenariHere()) yield* say(YOBURI_TAMO.kane);
  setFlag(YB.tamo, 1);
  sfx('se_item');
  yield* say(YOBURI_TAMO.got);
});

// ================================================================ 用水路の 岸（夜振り）

registerScript('obj_hoshi_yoburi', function* (): Co {
  sfx('se_examine');
  const s = hStage();
  if (!lanternOn() || s < 1 || s > 2) {
    yield* say(YOBURI_SPOT.dark);
    return;
  }
  if (!flag(YB.tamo)) {
    yield* say(YOBURI_SPOT.look);
    return;
  }
  const i = yield* say(YOBURI_SPOT.ask);
  if (i === 0) yield* yoburiSession();
});

// ================================================================ 沢ガニ（沢の上の 3びき）

function* kaniSeen(key: string, text?: string): Co {
  if (text) yield* say(text);
  if (flag(key)) return;
  setFlag(key, 1);
  if (flag(YB.kani0) && flag(YB.kaniA) && flag(YB.kaniB)) {
    yield* say(SAWAGANI.three);
    zukanSee('sawagani');
    yield* noteNew('sawagani');
  }
}

{
  const orig = getScript('obj_sawa_kani');
  registerScript('obj_sawa_kani', function* (ctx): Co {
    if (orig) yield* orig(ctx);
    else yield* ctx.runDefault();
    yield* kaniSeen(YB.kani0);
  });
}
registerScript('obj_sawa_kani_a', function* (): Co {
  sfx('se_examine');
  yield* kaniSeen(YB.kaniA, SAWAGANI.a);
});
registerScript('obj_sawa_kani_b', function* (): Co {
  sfx('se_examine');
  yield* kaniSeen(YB.kaniB, SAWAGANI.b);
});

// ================================================================ 駅ノートの 7月の ページ（②を ぜんぶ うめた あと）

/** The hooks events/ch2/ekinote.ts asks at the July page. */
export const yoburiEkinote = {
  /** The choice instead of the usual 「めくる」 when Shun may write his line. */
  choice(): string | null {
    return flag(YB.book2) && zukanComplete(2) && !flag(YB.ekinote) ? YOBURI_EKINOTE.choice : null;
  },
  *write(): Co {
    setFlag(YB.ekinote, 1);
    sfx('se_pen_write');
    yield* say(YOBURI_EKINOTE.write);
    const m = state.party.find((x) => x.id === 'minato');
    if (m) m.mp = Math.min(m.maxMp, m.mp + 2);
    sfx('se_item');
    yield* say(YOBURI_EKINOTE.reward);
  },
  /** After he wrote: one more page under the July page. */
  extra(): string | null {
    return flag(YB.ekinote) ? YOBURI_EKINOTE.after : null;
  },
};

ekinoteHooks.choice = () => yoburiEkinote.choice();
ekinoteHooks.write = () => yoburiEkinote.write();
ekinoteHooks.extra = () => yoburiEkinote.extra();

// ================================================================ エンディング カット4b（①②を ぜんぶ）

/**
 * The turning circle in the morning (events/ch2/ending.ts cut4bReunion): those who filled both
 * notebooks' 『みずべ』 see とまたろう waiting with マル's net 『マル』 on his shoulder; as the two
 * go north she looks at its handle and smiles a little (only the picture: the cut's pages and
 * its length do not change).
 */
export function yoburiEndingOn(): boolean {
  return zukanComplete(1) && zukanComplete(2) && flag('flag_mizube_book') > 0 && flag(YB.book2) > 0;
}

registerWorldFx({
  map: 'map_hoshimidai',
  draw(f, g, cx, cy, layer) {
    if (layer !== 'fg' || !yoburiEndingOn()) return;
    const tome = f.actorById('end_npc_hoshi_tome');
    if (!tome || !tome.visible) return;
    // (only at the turning circle: カット4b. The other cuts put him elsewhere)
    if (tome.tileX < 30 || tome.tileX > 36 || tome.tileY < 37 || tome.tileY > 45) return;
    const x = Math.round(tome.x) - cx;
    const y = Math.round(tome.y) - cy;
    // the net on his shoulder: the short handle from the shoulder slanting up and back over his
    // head (clear of the straw hat), the bamboo hoop and the white bag hanging from it
    const d = tome.dir === 'left' ? -1 : 1;
    const back = -d;
    const sx = x + 3 * d;
    const sy = y - 13;
    for (let i = 0; i < 22; i++) {
      const hx = sx + Math.round(back * i * 0.45);
      const hy = sy - i;
      g.px(hx, hy, '#5A3A2A');
      g.px(hx + 1, hy, i % 5 === 0 ? '#5A3A2A' : '#C8A06A');
    }
    const tx = sx + Math.round(back * 22 * 0.45) + back * 3;
    const ty = sy - 24;
    for (let a = 0; a < 24; a++) {
      const th = (a / 24) * Math.PI * 2;
      g.px(tx + Math.round(Math.cos(th) * 6), ty + Math.round(Math.sin(th) * 2.5), a % 3 ? '#C8A06A' : '#8A5A3A');
    }
    for (let yy = 2; yy < 9; yy++) {
      const half = Math.round(5 * Math.sqrt(1 - yy / 9));
      for (let xx = -half; xx <= half; xx += 2) g.px(tx + xx + (yy % 2) + back, ty + yy, '#F4F1E8');
    }
    // マル, walking behind him, looks at the handle: a small smile mark over her head, once
    const maru = f.actorById('end_npc_maru');
    if (maru && maru.visible && maru.moving && tome.moving && maru.y > tome.y) {
      const mx = Math.round(maru.x) - cx;
      const my = Math.round(maru.y) - cy - 30;
      const k = Math.floor(f.t / 400) % 3;
      if (k < 2) {
        g.px(mx - 2, my, '#F2894B');
        g.px(mx - 1, my + 1, '#F2894B');
        g.px(mx, my + 1, '#F2894B');
        g.px(mx + 1, my + 1, '#F2894B');
        g.px(mx + 2, my, '#F2894B');
      }
    }
  },
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.yoburi(step = 'go', stage = 1)
 *   'tome'  棚田の トマじいの 前（灯りつき）    'tamo'  農具小屋の たも網の 前（〔yoburi〕を 聞いた ことに）
 *   'go'    用水路の 南の 岸 (15,22) 北向き（たも網つき）  'play'  'go' から すぐ 小窓（auto: 自動で 遊ぶ）
 */
registerDebug('yoburi', (step = 'go', st = 1, auto = false) => {
  cmd().jump?.(st >= 2 ? 'ch2:hill' : 'ch2:gen', true);
  if (st >= 2) setFlag('flag_ch2_stage', 2);
  if (step === 'tome') return cmd().warp?.('map_hoshimidai', 21, 12, 'up');
  setFlag(YB.ask, 1);
  if (step === 'tamo') return cmd().warp?.('map_hoshi_koya', 2, 3, 'left');
  setFlag(YB.tamo, 1);
  const r = cmd().warp?.('map_hoshimidai', 15, 22, 'up');
  if (step === 'play') {
    qaAuto = !!auto;
    setTimeout(() => {
      const f = field();
      f?.startScript(
        (function* (): Co {
          try {
            yield* yoburiSession();
          } finally {
            qaAuto = false;
          }
        })(),
      );
    }, 400);
  }
  return r;
});

registerDebug('yoburiState', () => {
  const p = game.ui.widgets.find((w) => w instanceof YoburiPanel) as YoburiPanel | undefined;
  if (!p) return null;
  return {
    phase: p.phase,
    ringX: Math.round(p.ringX),
    spot: spotAt(p.ringX),
    bucket: p.bucket.map((b) => `${b.kind}:${b.cm}`),
    crs: p.crs.map((c) => `${c.kind}@${c.x}:${c.state}${p.lit(c) ? '*' + p.lit(c) : ''}`),
    call: p.callOn > 0,
  };
});

registerDebug('yoburiSheet', (scale = 4) => {
  const items: HTMLCanvasElement[] = [
    creature('dojou', 10, 0).img, creature('dojou', 13, 1).img, creature('chibi', 5, 0).img, creature('ooki', 18, 0).img,
    creature('dojou_nushi', 20, 1).img, creature('yago', 4, 0).img, creature('kawanina', 3, 0).img, lanternImg(), handleRuler(),
  ];
  const cv = document.createElement('canvas');
  cv.width = 360 * scale;
  cv.height = (items.length * 14 + 20) * scale;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2E4A44';
  ctx.fillRect(0, 0, cv.width, cv.height);
  items.forEach((im, i) => ctx.drawImage(im, 4 * scale, (4 + i * 14) * scale, im.width * scale, im.height * scale));
  ctx.drawImage(yoburiBg(1, true), 60 * scale, 4 * scale, 164 * scale, 58 * scale);
  ctx.drawImage(yoburiBg(1, false), 60 * scale, 66 * scale, 164 * scale, 58 * scale);
  return cv.toDataURL();
});

registerDebug('yoburiText', () => {
  const notes: Record<string, string> = {};
  for (const e of ZUKAN.filter((z) => z.vol === 2)) notes[e.id] = `@sys\n『みずべ』②に 書きこんだ。\n（${e.name}　7/7）`;
  return mizubeTextCheck({ ...MIZUBE_CH2_TEXTS, notes }, false);
});

/** QA: is the ending's net on (both notebooks full), and is とまたろう there now (カット4b)? */
registerDebug('yoburiEnd', () => {
  const f = field();
  const tome = f?.actorById('end_npc_hoshi_tome');
  return { on: yoburiEndingOn(), z1: zukanCount(1), z2: zukanCount(2), tome: tome ? [tome.tileX, tome.tileY, tome.visible, tome.dir] : null };
});
