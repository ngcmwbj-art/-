// 浮いて、待つ（第3章の クリア前、段階2。げむきか 10-31 の 案4、2026-10-31 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_ukimachi.ts、みました帳の ページは ui/menu/book_ukimachi.ts。新しい 地図・新しい 人は ない。
//
//   段階2（12:01）、S13 の あと（flag_ch3_got_gochisou）から S14 の 前まで（flag_ch3_truck_trap が 立ったら 起きない）。
//   ・監視台の 下の カイト npc_c3_kanshiin (57,28)：いつもの〔c2〕の あと、もう1回 話すと〔uku〕（flag_uk_start）。
//     同じ カイトの 寄り道「穴は、だれかの ごちそうさま」（tsumeta.ts。グソっ君が いる とき、〔c2〕の すぐ あとに 始まる）と
//     重ならない よう、グソっ君が いる ときは あちらが 済んで から（flag_tm_done）。「！」も その あと だけ。
//   ・ウミと 子ども 3人が 港の 岸壁の 見えない 所から 浜へ 走って きて、カイトの 東に ならぶ（暗転なし。防波堤から だと
//     10秒 かかるので、tsumeta と 同じく 岸壁から）。済んだら 防波堤の もとの 所へ 走って もどる（台本に しない）。
//   ・大写し「背浮き」UkiPanel：すう（けってい）→ あご（↑。指で 遊ぶ 人の ため けっていでも）→ ぬく（何も 押さずに
//     待つ。力の ゲージが 少しずつ 下がって 0 で 済む。押すと ゲージが もどるだけで 失敗に しない。はじめの 1回だけ
//     カイトの 1行）。字の 合図「すう・あご・ぬく」は 左上、「そのまま」は 大きく。音は 使わない（押した ときの 小さな 音だけ）。
//     もどるで やめると 台本は 止まり、子どもたちは もどる（済んだ 段は 残る。カイトに 話すと 前置き なしの 1ページ から）。
//   ・グソっ君の お手本：大写しの 海の 絵（あおむけで 泳ぐ グソっ君。潜りの 地図は 使わない）。グソっ君が いない ときは とばす。
//   ・かくし：来る人の ワイスタ巡査（flag_ch3_kita_npc_tsurumi）／潜りの 落とし物 4つ（flag_ch3_moguri_*）／ぬく を 一度も
//     押さずに 済ませる（flag_uk_jouzu）。どれも 1回。
//   ・段階1：S09 の あと（flag_ch3_umi_done）、監視台の 上の カイトに〔c2〕の あと もう1回 話すと 前ぶれ（1回。flag_uk_mae）。
//   ・S14 から 先と クリア後は 足さない。止まった 正午の 決まりと ぶつけない（旗を 下ろした あとの 12:01 の 浜だけ）。
//
// QA：__game.cmd.ukimachi(step, auto)、ukState()、ukText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { glyphImage, measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, setFollowerVisible, walk } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import type { Actor } from '../../world/actor';
import { faceToward } from '../../world/interact';
import { actorAnchor, addMarkSource } from '../../world/marks';
import { pgOn } from '../../world/postgame';
import { drawTape, drawWindow, UI } from '../../ui/window';
import { closeupWide, isCloseupQuit, skipIntro, type Howto } from '../../ui/closeup';
import * as T from '../../data/text/c3_ukimachi';
import { UK_ORDER, UK_UI, type UkStep } from '../../data/text/c3_ukimachi';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { c3Stage, inCh3, kita, say3 } from './common';

export const UF = {
  /** 〔c2〕を 聞いた（グソっ君が いない ときの 1回目。いる ときは flag_tm_heard）。 */
  heard: 'flag_uk_heard',
  start: 'flag_uk_start',
  /** 段階1 の 前ぶれ：1＝〔c2〕の あと、2＝前ぶれを 聞いた。 */
  mae: 'flag_uk_mae',
  jouzu: 'flag_uk_jouzu',
  junsa: 'flag_uk_junsa',
  moguri: 'flag_uk_moguri',
  done: 'flag_uk_done',
} as const;

export const stepF = (s: UkStep): string => `flag_uk_${s}`;

const UMIZOI = 'map_umizoi';
const KAITO = 'npc_c3_kanshiin';
const UMI = 'npc_c3_mago';
const KIDS = ['npc_c3_kid_a', 'npc_c3_kid_b', 'npc_c3_kid_c'] as const;
/** 来る 人（ウミと 子ども 3人）と、ならぶ 所（カイトの 東、砂浜の まん中。tsumeta の 貝がら (59,29) を よける）。 */
const LINE: [string, number, number][] = [
  [UMI, 60, 28],
  ['npc_c3_kid_a', 61, 28],
  ['npc_c3_kid_b', 62, 28],
  ['npc_c3_kid_c', 63, 28],
];
/** 走り だす 所（港の 岸壁。浜の 入口の 西の 見えない あたり）と、もどる ときの 曲がり角（防波堤の もと）。 */
const FROM_Y = 25;
const FROM_X = [42, 43, 44, 45];
const WAY: [number, number] = [44, 25];

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 遊べる：段階2、S13 の あと、S14 の 前。 */
export function ukOpen(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 2 && flag('flag_ch3_got_gochisou') > 0 && !flag('flag_ch3_truck_trap');
}

/** 同じ カイトの「穴」（tsumeta）が 先：グソっ君が いる ときは あちらが 済んでから。 */
function tmFirst(): boolean {
  if (flag('flag_tm_done')) return false;
  if (flag('flag_tm_start')) return true;
  return knWith();
}

/** 〔c2〕は もう 聞いた。 */
function heardC2(): boolean {
  return flag(UF.heard) > 0 || flag('flag_tm_heard') > 0;
}

/** 〔uku〕を 言いだせる（「！」）。 */
function ukReady(): boolean {
  return ukOpen() && !flag(UF.done) && !tmFirst();
}

export function ukCount(): number {
  return UK_ORDER.filter((s) => flag(stepF(s))).length;
}

function allMoguri(): boolean {
  return ['ka', 'shikake', 'bracelet', 'megane'].every((id) => flag(`flag_ch3_moguri_${id}`) > 0);
}

/** 話す 人の いない 行を 抜く（グソっ君）。 */
function trim(text: string): string {
  if (knWith()) return text;
  return text
    .split(/\n(?=@)/)
    .filter((p) => !p.startsWith('@npc_kanenari'))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = trim(text);
  if (!t.trim()) return -1;
  return yield* say3(t);
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

// カイトの 頭の 上の「！」（〔c2〕の あと もう1回 話す 所。見のがし 対策）
addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !ukReady()) return null;
  // (before the usual 〔c2〕 without グソっ君: the 「！」 waits for the second talk)
  if (!heardC2() && !flag(UF.start)) return null;
  const a = f.actorById(KAITO);
  return a && a.visible ? actorAnchor(a) : null;
});

// ================================================================ 大写し「背浮き」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（数と キー）。 */
const RX = SX + 206;
const SW = RX - SX - 4;
/** 会話の あと、押した ことに なるまで（ms）。会話を 送った 指の 押しを 数えない。 */
const ARM_MS = 450;
/** ぬく：ゲージが 1 → 0 に なるまで（ms。ひろい なら 短く）。 */
const NUKU_MS = 4200;
/** 押して しまった とき、ゲージが もどる 量。 */
const BUMP = 0.45;
/** しゅんの 体の まん中（場面の 中。oy から）。 */
const BODY_Y = 60;
const GAUGE_W = 120;

const SAND = '#E4D2A8';
const SAND_DK = '#CDB98C';
const SAND_LT = '#F2E6C8';
const INK = '#4A3A2E';
const SKIN = '#FFD9B8';
const SKIN_D = '#E0A882';
const HAIR = '#2B1E1A';
const TEE = '#3FA66B';
const TEE_L = '#6CC48A';
const SHORTS = '#2F4A8A';
const SANDAL = '#E84E3C';
const WATER = '#8EC8E0';

type Mode = 'seuki' | 'umi';

export class UkiPanel implements Widget {
  modal = true;
  closeup = true;
  howto: Howto = T.UK_HOWTO;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  mode: Mode;
  /** 今の 段（台本が 進める）。 */
  step: UkStep = 'suu';
  /** 押せる あいだ（会話の あいだは false）。 */
  active = false;
  /** すう・あご：押した（台本が 読む）。 */
  hit = false;
  /** ぬく：力の ゲージ（1 → 0）。 */
  gauge = 1;
  /** ぬく：押して しまった 回数（台本が 読む：はじめの 1回で カイトの 1行）。 */
  presses = 0;
  /** 押した ときの「ゆっくり」の 字（ms）。 */
  private bumpT = 0;
  /** 胸・あご の 動き（0..1）。 */
  private breath = 0;
  private chin = 0;
  private armT = 0;
  private wasActive = false;
  private autoT = 0;

  constructor(mode: Mode) {
    this.mode = mode;
    // the sea picture under the words: nothing to play, nothing to quit
    if (mode === 'umi') this.closeup = false;
  }

  /** もどるで やめられるのは、押す（待つ）あいだ（会話の あいだは パネルの 物）。 */
  quittable(): boolean {
    return this.mode === 'seuki' && this.active;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.bumpT > 0) this.bumpT = Math.max(0, this.bumpT - dt);
    if (flag(stepF('suu'))) this.breath = Math.min(1, this.breath + dt / 500);
    if (flag(stepF('ago'))) this.chin = Math.min(1, this.chin + dt / 400);
    if (this.active !== this.wasActive) {
      this.wasActive = this.active;
      this.armT = 0;
    }
    if (this.mode !== 'seuki' || !this.active) return;
    this.armT += dt;
    const armed = this.armT > ARM_MS;
    if (this.step === 'nuku') {
      // any key pressed (or the picture tapped) puts the strength back; nothing fails
      const any = armed && !this.auto && (['confirm', 'up', 'down', 'left', 'right'] as const).some((a) => input.pressed(a));
      if (any) {
        this.presses++;
        this.gauge = Math.min(1, this.gauge + BUMP);
        this.bumpT = 1200;
        se('se_cursor', { vol: 0.25, pitch: 0.8 });
      } else {
        this.gauge = Math.max(0, this.gauge - (dt / NUKU_MS) * closeupWide());
      }
      return;
    }
    let ok = false;
    if (this.auto) {
      this.autoT += dt;
      ok = this.autoT > 500;
    } else if (armed) {
      // あご: ↑ (and けってい too, for a finger that only taps the picture)
      ok = input.pressed('confirm') || (this.step === 'ago' && input.pressed('up'));
    }
    if (ok) {
      this.autoT = 0;
      this.hit = true;
      se('se_examine', { vol: 0.35, pitch: this.step === 'suu' ? 1.1 : 1.25 });
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
        g.clip(SX, oy, SW, CH, () => (this.mode === 'umi' ? this.drawUmi(g, oy) : this.drawSeuki(g, oy)));
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        this.drawSide(g, oy);
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const label = this.mode === 'umi' ? UK_UI.umi : UK_UI.place;
      const tw = g.measure(label) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, label, { seed: 31 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  // ---------------------------------------------------------------- 背浮き：砂の 上の しゅんを 上から

  private drawSeuki(g: Gfx, oy: number): void {
    g.rect(SX, oy, SW, CH, SAND);
    for (let i = 0; i < 90; i++) g.rect(SX + ((i * 47) % SW), oy + ((i * 29) % CH), 1, 1, i % 3 ? SAND_DK : SAND_LT);
    const cx = SX + Math.round(SW / 2) + 6;
    const cy = oy + BODY_Y;
    // "up to the ears in water" (pretend): a dotted ring round the body once the chin is up
    if (this.chin > 0) {
      g.alpha(0.55 * this.chin, () => {
        for (let i = 0; i < 64; i++) {
          if (i % 2) continue;
          const an = (i / 64) * Math.PI * 2 + this.t / 2400;
          g.rect(cx - 4 + Math.round(Math.cos(an) * 66), cy + Math.round(Math.sin(an) * 34), 2, 1, WATER);
        }
      });
    }
    const relax = this.step === 'nuku' || flag(stepF('nuku')) ? 1 - this.gauge : 0;
    lying(g, cx, cy, this.breath, this.chin, relax, this.t);
    // the strain: short strokes beside the hands and feet while the strength is still in
    const strain = this.step === 'nuku' ? this.gauge : flag(stepF('nuku')) ? 0 : 1;
    if (strain > 0.15 && (this.step === 'nuku' || !flag(stepF('nuku')))) {
      const w = Math.floor(this.t / 200) % 2;
      g.alpha(Math.min(1, strain), () => {
        for (const [x, y] of [
          [cx - 2, cy - 34],
          [cx - 2, cy + 30],
          [cx + 58, cy - 16],
          [cx + 58, cy + 12],
        ] as [number, number][]) {
          g.rect(x - 3, y - 2 + w, 3, 1, INK);
          g.rect(x + 3, y + 1 - w, 3, 1, INK);
        }
      });
    }
    this.drawCues(g, oy);
    if (this.step === 'nuku' && !flag(stepF('nuku'))) this.drawNuku(g, oy);
  }

  /** 左上の 字の 合図（すう・あご・ぬく）。済んだ 段に ○、今の 段は 大きく。 */
  private drawCues(g: Gfx, oy: number): void {
    let x = SX + 4;
    UK_ORDER.forEach((s) => {
      const now = s === this.step && !flag(stepF(s));
      const did = flag(stepF(s)) > 0;
      const l = UK_UI.cue[s];
      if (now) {
        const w = bigW(l) + 8;
        g.rect(x, oy + 3, w, 28, '#FBF6EA');
        g.frame(x, oy + 3, w, 28, INK);
        bigText(g, l, x + 4, oy + 5, INK);
        x += w + 4;
      } else {
        const w = g.measure(l) + 6;
        g.rect(x, oy + 7, w, 15, did ? '#FBF6EA' : '#E8DCC0');
        g.text(l, x + 3, oy + 7, { color: did ? INK : '#9A8A70' });
        if (did) g.ring(x + w - 1, oy + 7, 4, '#C8402E');
        x += w + 4;
      }
    });
  }

  /** ぬく：大きな「そのまま」と、下の 力の ゲージ。 */
  private drawNuku(g: Gfx, oy: number): void {
    const l = UK_UI.sonomama;
    const w = bigW(l);
    const x = SX + SW - w - 6;
    // a slow breath of its own (it says: don't move)
    const a = 0.75 + 0.25 * Math.sin(this.t / 600);
    g.alpha(a, () => {
      g.rect(x - 3, oy + 4, w + 6, 27, '#FBF6EA');
      bigText(g, l, x, oy + 6, '#C8402E');
    });
    const gx = SX + Math.round((SW - GAUGE_W) / 2) + 8;
    const gy = oy + CH - 13;
    const lw = g.measure(UK_UI.gauge);
    g.rect(gx - lw - 7, gy - 3, lw + 4, 14, '#FBF6EA');
    g.text(UK_UI.gauge, gx - lw - 5, gy - 3, { color: INK });
    g.rect(gx - 1, gy - 1, GAUGE_W + 2, 10, INK);
    g.rect(gx, gy, GAUGE_W, 8, '#F4ECD8');
    const fw = Math.round(GAUGE_W * this.gauge);
    g.rect(gx, gy, fw, 8, this.bumpT > 0 ? '#E8743A' : '#D89A4A');
    // ticks every quarter (a shape to read it by, not only a colour)
    for (let i = 1; i < 4; i++) g.rect(gx + Math.round((GAUGE_W * i) / 4), gy, 1, 8, '#B8A888');
    if (this.bumpT > 0) {
      const yw = g.measure(UK_UI.yukkuri);
      g.rect(gx + GAUGE_W + 4, gy - 3, yw + 4, 14, '#FBF6EA');
      g.text(UK_UI.yukkuri, gx + GAUGE_W + 6, gy - 3, { color: '#C8402E' });
    }
  }

  // ---------------------------------------------------------------- 海：あおむけで 泳ぐ グソっ君

  private drawUmi(g: Gfx, oy: number): void {
    for (let y = 0; y < CH; y++) g.rect(SX, oy + y, SW, 1, y < 18 ? '#BFE4F0' : y < 60 ? '#6AB4D4' : '#4A94B8');
    // the surface: waves moving again (12:01)
    for (let x = SX; x < SX + SW; x += 2) g.rect(x, oy + 17 + Math.round(Math.sin(x / 11 + this.t / 380) * 1.5), 2, 1, '#F4FAFC');
    for (let i = 0; i < 14; i++) {
      const x = SX + ((i * 53 + Math.floor(this.t / 30)) % SW);
      g.rect(x, oy + 30 + ((i * 37) % 70), 4, 1, '#9AD0E4');
    }
    // グソっ君 swimming right to left, belly up: the legs on top paddling
    const span = SW + 80;
    const px = SX + SW + 40 - ((this.t / 22) % span);
    const py = oy + 52 + Math.round(Math.sin(this.t / 500) * 3);
    gusoBellyUp(g, Math.round(px), py, this.t);
  }

  private drawSide(g: Gfx, oy: number): void {
    if (this.mode === 'umi') return;
    g.text(UK_UI.count(ukCount()), RX, oy + 2, { color: '#F4ECD8' });
    if (!this.active) return;
    UK_UI.keys[this.step].forEach((l, i) => g.text(l, RX, oy + 64 + i * 15, { color: i === 0 ? '#FFE7A3' : '#C8C0D8' }));
  }
}

/** 2倍の 字の 幅。 */
function bigW(s: string): number {
  return measure(s) * 2;
}

/** 2倍の 字（1字ずつ 拡大して 置く。影を 1px）。 */
function bigText(g: Gfx, s: string, x: number, y: number, color: string): void {
  let cx = x;
  for (const ch of s) {
    const w = measure(ch) * 2;
    if (ch !== ' ' && ch !== '　') {
      g.img(glyphImage(ch, '#E8DCC0'), cx + 1, y + 1, { scale: 2 });
      g.img(glyphImage(ch, color), cx, y, { scale: 2 });
    }
    cx += w;
  }
}

/**
 * 砂の 上で あおむけの しゅん（上から。頭は 左、足は 右、手足を 少し 開く）。breath 胸の ふくらみ、chin あごを
 * 上げた（顔が 上を 向き、あごの 線が 見える）、relax 力が ぬける（手足が 開いて、指が ひらく）。
 */
function lying(g: Gfx, cx: number, cy: number, breath: number, chin: number, relax: number, t: number): void {
  const hx = cx - 46;
  const spread = Math.round(4 + relax * 6);
  // shadow
  g.alpha(0.18, () => {
    g.rect(hx - 8, cy - 8 + 2, 112, 18, '#6A5A40');
  });
  // legs (shorts, then skin, sandals at the feet)
  for (const s of [-1, 1]) {
    const fy = cy + s * (5 + spread);
    g.line(cx + 22, cy + s * 4, cx + 50, fy, SKIN_D);
    g.line(cx + 22, cy + s * 4 + 1, cx + 50, fy + 1, SKIN);
    g.line(cx + 22, cy + s * 4 + 2, cx + 50, fy + 2, SKIN);
    g.rect(cx + 50, fy - 2, 6, 5, SANDAL);
  }
  g.rect(cx + 12, cy - 8, 14, 16, SHORTS);
  // arms out to the sides (more open as the strength goes)
  for (const s of [-1, 1]) {
    const ex = cx - 14 + Math.round(relax * 4);
    const ey = cy + s * (24 + spread);
    g.line(cx - 22, cy + s * 9, ex, ey, SKIN_D);
    g.line(cx - 21, cy + s * 9, ex + 1, ey, SKIN);
    g.line(cx - 20, cy + s * 9, ex + 2, ey, SKIN);
    // the hand: a fist while tense, open fingers when loose
    if (relax > 0.6) {
      for (let f = -1; f <= 1; f++) g.rect(ex + f * 2, ey + s * 2, 1, 3, SKIN_D);
    }
    g.circle(ex + 1, ey, 2, SKIN);
  }
  // the body (tee): the chest swells with the breath
  const bw = 34;
  const bh = 9 + Math.round(breath * 3 + Math.sin(t / 700) * breath * 1);
  g.rect(cx - 24, cy - bh, bw, bh * 2, TEE);
  g.rect(cx - 24, cy - bh, bw, 2, TEE_L);
  g.rect(cx - 18, cy - 3, 8, 6, '#F4F1E8');
  // the head: face up; with the chin up, the face tips back (the top of the head towards the left)
  const tilt = Math.round(chin * 3);
  g.circle(hx, cy, 10, HAIR);
  g.circle(hx + 3 - tilt, cy, 8, SKIN);
  g.rect(hx - 6 - tilt, cy - 7, 4, 14, HAIR);
  // eyes (closed lines once relaxed), the mouth
  const ex = hx + 2 - tilt;
  if (relax > 0.6) {
    g.rect(ex, cy - 4, 1, 2, INK);
    g.rect(ex, cy + 3, 1, 2, INK);
  } else {
    g.rect(ex, cy - 4, 2, 2, INK);
    g.rect(ex, cy + 3, 2, 2, INK);
  }
  g.rect(hx + 7 - tilt, cy - 1, 1, 3, '#C8604A');
  // the chin line once raised
  if (chin > 0) g.alpha(chin, () => g.rect(hx + 10 - tilt, cy - 3, 1, 7, SKIN_D));
}

/** あおむけで 泳ぐ グソっ君（横から。上が おなか：うすい 色に 足が 7対、下が 背中の よろい）。左へ 進む。 */
function gusoBellyUp(g: Gfx, x: number, y: number, t: number): void {
  const back = '#8E8AA0';
  const backD = '#6A6680';
  const belly = '#EADCC4';
  // the armoured back (below) with its plates
  for (let i = 0; i < 9; i++) {
    const px = x - 22 + i * 5;
    const h = 8 - Math.round(Math.abs(i - 4) * 0.8);
    g.rect(px, y, 5, h, i % 2 ? back : backD);
  }
  // the belly (above), pale
  g.rect(x - 22, y - 4, 45, 5, belly);
  // the legs paddling in a wave down the body (front to back)
  for (let i = 0; i < 7; i++) {
    const lx = x - 18 + i * 6;
    const ph = Math.sin(t / 120 - i * 0.9);
    const ly = y - 7 - Math.round(ph * 2);
    g.line(lx, y - 4, lx + Math.round(ph * 2), ly, backD);
  }
  // head at the front (left), feelers trailing, tail fan at the back
  g.rect(x - 27, y - 2, 6, 6, backD);
  g.rect(x - 26, y - 1, 2, 2, '#F4F4F4');
  g.line(x - 27, y - 2, x - 36, y - 8, backD);
  g.line(x - 27, y - 1, x - 37, y + 2, backD);
  g.rect(x + 23, y - 3, 5, 8, backD);
  g.rect(x + 28, y - 2, 2, 6, back);
  // a few bubbles up behind
  const b = Math.floor(t / 300) % 3;
  g.ring(x + 30, y - 10 - b * 3, 1, '#F4FAFC');
  g.ring(x + 34, y - 18 + b * 2, 1, '#F4FAFC');
}

function* openPanel(p: UkiPanel): Co {
  game.ui.push(p);
  se('se_examine', { vol: 0.4, pitch: 0.9 });
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: UkiPanel): Co {
  if (p.done) return;
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;

// ================================================================ ウミと 子どもたち（港の 岸壁から 浜へ）

/** 来た 人（もとの 所に もどすため）。 */
let came: { a: Actor; x: number; y: number }[] = [];

function lined(): boolean {
  const f = field();
  return !!f && LINE.every(([id, x, y]) => {
    const a = f.actorById(id);
    return !a || !a.visible || (a.tileX === x && a.tileY === y);
  });
}

/** 岸壁から 走って きて、浜に ならぶ（着くまで 待つ。長くても 6秒）。 */
function* kidsCome(): Co {
  const f = field();
  if (!f || lined()) return;
  const busy = new Set<string>();
  for (const a of [f.player, f.follower]) if (a && a.visible) busy.add(`${a.tileX},${a.tileY}`);
  let left = 0;
  LINE.forEach(([id, x, y], i) => {
    const a = f.actorById(id);
    if (!a || !a.visible) return;
    if (busy.has(`${x},${y}`)) return;
    if (!came.some((c) => c.a === a)) came.push({ a, x: a.x, y: a.y });
    a.data.scripted = true;
    a.x = FROM_X[i] * 16 + 8;
    a.y = FROM_Y * 16 + 16;
    left++;
    game.scripts.run(
      (function* (): Co {
        yield* walk(id, [[x, FROM_Y], [x, y]], { speed: 5 });
        a.dir = 'left';
        left--;
      })(),
    );
  });
  for (let t = 0; left > 0 && t < 6000; t += 100) yield 100;
}

/** 防波堤の もとの 所へ（岸壁を 通って、走って もどる）。台本に しない（しゅんを 止めない）。 */
function kidsBack(): void {
  const f = field();
  const list = came;
  came = [];
  if (!f) return;
  const px = (x: number, y: number): [number, number] => [x * 16 + 8, y * 16 + 16];
  for (const c of list) {
    if (!f.actors.includes(c.a)) continue;
    const a = c.a;
    a.pathSpeed = 4 * 16;
    a.path.push(px(a.tileX, WAY[1]), px(WAY[0], WAY[1]), [WAY[0] * 16 + 8, c.y], [c.x, c.y]);
  }
}

function faceKaito(): void {
  const f = field();
  const k = f?.actorById(KAITO);
  if (!f || !k) return;
  faceToward(f.player, k);
  faceToward(k, f.player);
}

// ================================================================ 台本

/** 3 大写し「背浮き」（済んだ 段は とばす）。true＝3つ 済んだ。 */
function* seuki(): Co<boolean> {
  const p = new UkiPanel('seuki');
  p.auto = qaAuto;
  let quiet = true;
  try {
    yield* openPanel(p);
    for (const s of UK_ORDER) {
      if (flag(stepF(s))) continue;
      p.step = s;
      if (s === 'nuku') {
        yield* say(T.UK_NUKU_HAJIME);
        p.gauge = 1;
        p.presses = 0;
        let told = false;
        p.active = true;
        while (p.gauge > 0) {
          if (p.presses > 0 && !told) {
            told = true;
            p.active = false;
            yield* say(T.UK_OSHITA);
            p.active = true;
          }
          yield null;
        }
        p.active = false;
        if (p.presses > 0) quiet = false;
        setFlag(stepF(s), 1);
        yield 400;
        yield* say(T.UK_NUKU);
      } else {
        p.hit = false;
        p.active = true;
        while (!p.hit) yield null;
        p.active = false;
        setFlag(stepF(s), 1);
        yield 350;
        yield* say(s === 'suu' ? T.UK_SUU : T.UK_AGO);
      }
    }
    if (quiet && !flag(UF.jouzu)) {
      setFlag(UF.jouzu, 1);
      yield* say(T.UK_JOUZU);
    }
  } finally {
    yield* closePanel(p);
  }
  return ukCount() >= 3;
}

/** 5 お手本（グソっ君が いる とき。大写しの 海の 絵）。 */
function* otehon(): Co {
  if (!knWith()) return;
  yield* say3(T.UK_OTEHON);
  setFollowerVisible(false);
  const p = new UkiPanel('umi');
  try {
    yield* openPanel(p);
    yield 600;
    yield* say3(T.UK_UMI);
  } finally {
    yield* closePanel(p);
    setFollowerVisible(true);
  }
  yield 200;
  yield* say3(T.UK_MODORI);
  if (allMoguri() && !flag(UF.moguri)) {
    setFlag(UF.moguri, 1);
    yield* say3(T.UK_MOGURI);
  }
}

/** 〔uku〕の はじめから（resume＝練習の 途中で やめた あと）。 */
function* uku(resume: boolean): Co {
  const f = field();
  if (!resume) {
    setFlag(UF.start, 1);
    yield* say3(T.UK_A);
    yield* kidsCome();
    yield* say3(T.UK_KITA);
    faceKaito();
    yield* say(T.UK_B);
  } else {
    yield* kidsCome();
    faceKaito();
    if (yield* skipIntro(T.UK_HOWTO.id)) {
      // すぐ やる：前置き なし
    } else {
      yield* say(T.UK_B);
    }
  }
  if (f) f.player.dir = 'up';
  let ok = false;
  try {
    ok = yield* seuki();
  } catch (e) {
    if (isCloseupQuit(e)) kidsBack();
    throw e;
  }
  if (!ok) return;
  yield* say3(T.UK_KODOMO);
  if (kita('npc_tsurumi') && !flag(UF.junsa)) {
    setFlag(UF.junsa, 1);
    yield* say3(T.UK_JUNSA);
  }
  yield* otehon();
  yield* say(T.UK_UMI_KOWAI);
  setFlag(UF.done, 1);
  addMp(2);
  se('se_item');
  yield* say3(T.UK_REWARD);
  kidsBack();
  field()?.refreshPresence();
}

/** 1 監視台の 下の カイト（段階2）／段階1 の 前ぶれ。 */
wrap(KAITO, function* (_ctx, orig): Co {
  if (onMap(UMIZOI) && ukOpen() && !flag(UF.done) && !tmFirst()) {
    if (flag(UF.start)) {
      yield* say3(T.UK_WAIT);
      yield* uku(true);
      return;
    }
    if (!heardC2()) {
      yield* orig();
      setFlag(UF.heard, 1);
      return;
    }
    yield* uku(false);
    return;
  }
  // 段階1：S09 の あと、〔c2〕の あと もう1回（1回）
  if (onMap(UMIZOI) && inCh3() && !pgOn() && c3Stage() === 1 && flag('flag_ch3_umi_done') > 0 && flag(UF.mae) < 2) {
    if (!flag(UF.mae)) {
      yield* orig();
      setFlag(UF.mae, 1);
      return;
    }
    setFlag(UF.mae, 2);
    yield* say3(T.UK_MAE);
    return;
  }
  yield* orig();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.ukimachi(step = 'start', auto = false, extra = false)（第3章の 段階2、S13 の あと）
 *   'start'   穴（tsumeta）は 済み、監視台の 下の カイト (57,28) の 前 (57,29) 上向き（「！」。話すと〔uku〕）
 *   'notm'    穴が まだ（グソっ君が いる：話すと あちらが 始まる。「！」は あちらの 物）
 *   'resume'  練習の 途中で やめた 形（すう 済み、yame_seuki）。話すと「すぐ やる／はじめから」
 *   'done'    済んだ あと
 *   'mae'     段階1、S09 の あと、監視台の 上の カイトの 前（〔c2〕→ もう1回 で 前ぶれ）
 *   extra = true で ワイスタ巡査が 来て いて、潜りの 落とし物 4つ（かくし 2つ）
 */
if (import.meta.env.DEV) {
  registerDebug('ukimachi', (step = 'start', auto = false, extra = false) => {
    for (const id of Object.values(UF)) setFlag(id, 0);
    for (const s of UK_ORDER) setFlag(stepF(s), 0);
    qaAuto = !!auto;
    const go = (x: number, y: number, d: string) => {
      cmd().warp?.(UMIZOI, x, y, d);
      field()?.refreshPresence();
    };
    if (step === 'mae') {
      cmd().jump?.('ch3:umizoi', true);
      setFlag('flag_ch3_stage', 1);
      setFlag('flag_ch3_umi_done', 1);
      return go(57, 28, 'up');
    }
    cmd().jump?.('ch3:trap', true);
    setFlag('flag_ch3_stage', 2);
    setFlag('flag_ch3_kita_npc_tsurumi', extra ? 1 : 0);
    for (const id of ['ka', 'shikake', 'bracelet', 'megane']) setFlag(`flag_ch3_moguri_${id}`, extra ? 1 : flag(`flag_ch3_moguri_${id}`));
    const tm = step !== 'notm';
    for (const id of ['flag_tm_heard', 'flag_tm_start', 'flag_tm_done']) setFlag(id, tm ? 1 : 0);
    if (step === 'resume') {
      setFlag(UF.start, 1);
      setFlag(stepF('suu'), 1);
      cmd().yameSet?.(T.UK_HOWTO.id);
    }
    if (step === 'done') setFlag(UF.done, 1);
    return go(57, 29, 'up');
  });

  registerDebug('ukState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(UF)) flags[k] = flag(id);
    for (const s of UK_ORDER) flags[s] = flag(stepF(s));
    const p = game.ui.widgets.find((w) => w instanceof UkiPanel) as UkiPanel | undefined;
    const f = field();
    return {
      flags,
      open: ukOpen(),
      ready: ukReady(),
      tmFirst: tmFirst(),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
      line: LINE.map(([id]) => {
        const a = f?.actorById(id);
        return a ? [id, a.tileX, a.tileY] : [id, null];
      }),
      panel: p ? { mode: p.mode, step: p.step, active: p.active, gauge: Math.round(p.gauge * 100) / 100, presses: p.presses } : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; no 天丼; no clock time; no さん in the narration. */
export function ukTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', '暗くて しめった', '干しすぎ', 'ダンゴムシ', 'しなさい', 'オオグソクムシ', '%'];
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
        if (t.startsWith('@') || t === '/' || !t) {
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
  walkT('uk', T.UK_TEXTS);
  // the right column: every label fits between RX and the panel's inner edge
  const col = SX + CW - RX - 2;
  const labels = [UK_UI.count(3), ...Object.values(UK_UI.keys).flat()];
  for (const l of labels) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  // the cues (one big) and そのまま keep apart in the scene's top row
  const cues = Math.max(...UK_ORDER.map((s) => bigW(UK_UI.cue[s]) + 8 + UK_ORDER.filter((o) => o !== s).reduce((n, o) => n + measure(UK_UI.cue[o]) + 6, 0) + 8));
  if (4 + cues + 10 + bigW(UK_UI.sonomama) + 6 > SW) bad.push(`合図と そのまま: 重なる ${cues} + ${bigW(UK_UI.sonomama)} > ${SW}`);
  const gx = Math.round((SW - GAUGE_W) / 2) + 8;
  if (gx + GAUGE_W + 6 + measure(UK_UI.yukkuri) + 4 > SW) bad.push('ゆっくり: はみ出す');
  if (gx - measure(UK_UI.gauge) - 7 < 0) bad.push('力: はみ出す');
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('ukText', () => ukTextCheck());
