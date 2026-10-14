// 分校の 鉄棒と『懸垂、1回』（第2章・章を またぐ。げむきか 10/11 の 案5、2026-10-13 依頼主の 採用。
// 厳選の 直し：第1章で 懸垂に 挑んだ 人だけ。02_ch2_index #100、50 10.33）。文は data/text/hoshi_tetsubou.ts、
// みました帳の ページは ui/menu/book_tetsubou.ts。
//
//   第1章で 公園の 鉄棒に 挑んだ（flag_kensui_try）、段階0〜1、グソっ君が いっしょ：
//   ・校庭の 鉄棒 obj_hoshi_tetsubou (30,30) を 2回 調べる → グソっ君（flag_tetsu_hint）。
//   ・集会所の まつ先生〔tetsu〕（flag_tetsu_talk。その 人の 物語が 先）：30年の 日課、「0回。……いい 記録
//     ですね。」→ 先に 鉄棒へ（flag_tetsu_away：集会所の 席が 空いて、鉄棒の 横 (33,30) に 立つ。二人十五脚の
//     flag_kotei_away と 同じ 作り。data/maps/hoshi_rooms.ts・hoshi_village.ts）。
//   ・鉄棒 → 大写し「鉄棒」（TetsuPanel）：①ぶら下がる（けってい を おしたまま。「はく」で おしなおすと 長もち。
//     とおで 合格 flag_tetsu_p1、はたちで 朱肉 +1 flag_tetsu_hatachi）→ グソっ君の さかさま（先生が とおまで
//     数えるのを 見とどけると flag_tetsu_kane_too）→ ②肩を 下げる（「下」で 3回 続けて flag_tetsu_p2）→
//     ③1回（肩 → 息 → 長おし。ゲージが 切れたら やりなおし、そのたび 少し 長く）。もどる で やめられる
//     （すんだ 練習は 残る）。
//   ・1回（flag_tetsu_done）→ はなまるを 持っている 人は 書き足し（flag_tetsu_hanamaru：大事なものの 説明、
//     ui/menu/items.ts）→ 先生は 集会所へ → 朱肉 +2、みました帳②の すみ『鉄棒』。
//   ・そのあと：鉄棒の 文が かわり「ぶら下がる」（ひとりで。記録は かわらない）、2回目の 懸垂は「あしたの
//     しゅんに まかせた」。集会所の まつ先生に 1回（flag_tetsu_fumi_after）。段階0（灯りなし）は グソっ君の 1行。
//
// この ファイルは ch2/index.ts で 堆肥（taihi）の あと、店番（tenban）より 前に import する：あとから 包む
// ほかの 寄り道の 用（耳の あいさつの まつ先生〔mimi〕など）が 先に 出る。
//
// QA：__game.cmd.tetsu(step, auto)、tetsuState()、tetsuText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { makeCanvas } from '../../engine/pixel';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, hasItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { charSprite, poseFrame } from '../../art/chars';
import { HANG_GRIP_ROW, HANG_H } from '../../art/chars/people/minato';
import { drawTape, drawWindow, phraseWrap, UI } from '../../ui/window';
import { RP } from '../../ui/menu/notebook';
import * as T from '../../data/text/hoshi_tetsubou';
import { HANG_MAX, HANG_PASS, KATA_N, KAZU } from '../../data/text/hoshi_tetsubou';
import { addMp, sendAway } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { ch2Open, hStage, lanternOn, routeTiles } from './common';
import { DF } from './dome';

export const TF = {
  /** 鉄棒を 2回 調べた あとの グソっ君。 */
  hint: 'flag_tetsu_hint',
  /** まつ先生〔tetsu〕（30年の 日課）。 */
  talk: 'flag_tetsu_talk',
  /** 先生が 鉄棒の 横に いる（集会所の 席が 空く）。 */
  away: 'flag_tetsu_away',
  /** 段階0、灯りなしの グソっ君（1回）。 */
  dark: 'flag_tetsu_dark',
  /** 練習の 札：ぶら下がる・肩を 下げる。 */
  p1: 'flag_tetsu_p1',
  p2: 'flag_tetsu_p2',
  /** グソっ君の さかさま（見た）と、とおまで 見とどけた。 */
  kane: 'flag_tetsu_kane',
  kaneToo: 'flag_tetsu_kane_too',
  /** はたちまで（朱肉 +1）。 */
  hatachi: 'flag_tetsu_hatachi',
  /** 1回（朱肉 +2、ページ）。 */
  done: 'flag_tetsu_done',
  /** はなまる『懸垂挑戦！』に『1回 星見台』。 */
  hanamaru: 'flag_tetsu_hanamaru',
  /** 集会所の まつ先生（すんだ あと 1回）。 */
  fumiAfter: 'flag_tetsu_fumi_after',
} as const;

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 第1章で 公園の 鉄棒に 挑んだ 人だけ、夜の あいだ、グソっ君と いっしょ。 */
function eligible(): boolean {
  return flag('flag_kensui_try') > 0 && ch2Open() && kanenariHere();
}

/** まつ先生が 集会所か 鉄棒に いる 段階（段階2 は 山道の 入口）。 */
function fumiNear(): boolean {
  return hStage() <= 1 && ch2Open();
}

/** その 人の 物語が 先（mimi.ts の storyFirst('fumi') と 同じ 見方）。 */
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

function* say(text: string): Co<number> {
  return yield* runMsg(text);
}

// ================================================================ 大写し

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 列（練習の 札と ボタン）。 */
const RX = SX + 218;
/** いちばん 低い 段の 線（画面の y）と、その 左右。 */
const BAR_Y = SY + 30;
const BAR_X0 = SX + 34;
const BAR_X1 = SX + 206;
/** 地面。 */
const GROUND_Y = SY + 92;
/** しゅん（2倍）・グソっ君・まつ先生の まん中。 */
const SHUN_X = SX + 62;
const KANE_X = SX + 112;
const FUMI_X = SX + 172;
/** 肩の 印の 目盛り。 */
const KATA_X = SX + 24;
const KATA_Y0 = BAR_Y + 14;
const KATA_Y1 = BAR_Y + 52;
/** ゲージ。 */
const GAUGE_X = SX + 76;
const GAUGE_W = 120;
const GAUGE_Y = GROUND_Y + 6;

/** 息の 波：すう → はく（ms ずつ）。 */
const BREATH_MS = 1600;
/** 数える 間。 */
const COUNT_MS = 800;
/** ぶら下がりの 減り方（1秒）と、はいた あいだの もどり。 */
const DRAIN = 0.14;
const DRAIN_HAKU = -0.06;
/** はなして いて いい 間（押しなおし）。 */
const REGRIP_MS = 350;
/** 肩の 印の 1往復。 */
const KATA_MS = 1400;
/** 1回：息の 波（短い）、引く 長さ、ゲージ。 */
const IKI_MS = 1200;
const PULL_MS = 1600;
const PULL_DRAIN = 0.3;
const PULL_BASE = 0.45;
const PULL_RETRY = 0.08;
const PULL_BONUS = 0.06;

type Mode = 'idle' | 'hang' | 'solo' | 'watch' | 'kata' | 'ikkai';
type Shun = 'stand' | 'hang' | 'pull' | 'over';
export type HangResult = 'cancel' | 'fall' | 'done' | 'max';

/** グソっ君の 立ち絵を さかさまに（足の かぎで ぶら下がる）。 */
let kaneFlip: HTMLCanvasElement | null = null;
function kaneUpside(): HTMLCanvasElement {
  if (kaneFlip) return kaneFlip;
  const src = charSprite('kanenari').walk.down[0];
  const [c, x] = makeCanvas(src.width, src.height);
  x.translate(0, src.height);
  x.scale(1, -1);
  x.drawImage(src, 0, 0);
  kaneFlip = c;
  return c;
}

export class TetsuPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  mode: Mode = 'idle';
  shun: Shun = 'stand';
  /** しゅんの 体が 上がった 量（絵の px、2倍の 前）。 */
  lift = 0;
  /** 先生が 横に いる（ひとりの ときは いない）。 */
  fumi = true;
  /** グソっ君が さかさまに ぶら下がっている。 */
  kane = false;
  dark = false;
  auto = false;
  // ---- ぶら下がる
  hanging = false;
  grip = 1;
  count = 0;
  cntT = 0;
  breathT = 0;
  breathed = -1;
  relT = 0;
  result: string | null = null;
  // ---- 肩・1回
  kataT = 0;
  streak = 0;
  coolT = 0;
  step: 'kata' | 'iki' | 'hiku' = 'kata';
  ikiT = 0;
  pull = 0;
  retries = 0;
  bonus = false;
  /** 練習の 札（済んだ 物）。 */
  passed = [false, false, false];
  words: { text: string; x: number; y: number; t: number; ms: number; color?: string }[] = [];
  private ePress = false;
  private eCancel = false;

  take(): boolean {
    const v = this.ePress;
    this.ePress = false;
    return v;
  }
  clearInput(): void {
    this.ePress = false;
    this.eCancel = false;
  }
  word(text: string, x: number, y: number, ms = 800, color?: string): void {
    this.words.push({ text, x, y, t: 0, ms, color });
  }

  /** 肩の 印：0 = 上、1 = 下。 */
  kataPos(): number {
    return (1 - Math.cos((this.kataT / KATA_MS) * Math.PI * 2)) / 2;
  }
  /** いま「はく」か（ぶら下がる：BREATH_MS ずつ、1回：IKI_MS ずつ）。 */
  haku(): boolean {
    if (this.mode === 'ikkai') return this.ikiT % (IKI_MS * 2) >= IKI_MS;
    return this.breathT % (BREATH_MS * 2) >= BREATH_MS;
  }
  breathK(): number {
    const ms = this.mode === 'ikkai' ? IKI_MS : BREATH_MS;
    const t = this.mode === 'ikkai' ? this.ikiT : this.breathT;
    return (t % ms) / ms;
  }

  /** ぶら下がりを はじめる 前の 状態に。 */
  resetHang(): void {
    this.hanging = false;
    this.grip = 1;
    this.count = 0;
    this.cntT = 0;
    this.breathT = 0;
    this.breathed = -1;
    this.relT = 0;
    this.result = null;
    this.shun = 'stand';
    this.lift = 0;
  }
  resetIkkai(): void {
    this.step = 'kata';
    this.kataT = 0;
    this.ikiT = 0;
    this.pull = 0;
    this.bonus = false;
    this.result = null;
    this.grip = 1;
    this.shun = 'hang';
    this.lift = 0;
    this.coolT = 0;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    this.words = this.words.filter((w) => (w.t += dt) < w.ms);
    if (input.pressed('confirm')) this.ePress = true;
    if (input.pressed('cancel')) this.eCancel = true;
    if (this.coolT > 0) this.coolT = Math.max(0, this.coolT - dt);
    if (this.result) return;
    if (this.mode === 'hang' || this.mode === 'solo') this.updHang(dt, input);
    else if (this.mode === 'watch') this.updWatch(dt);
    else if (this.mode === 'kata') this.updKata(dt);
    else if (this.mode === 'ikkai') this.updIkkai(dt, input);
  }

  private cancelled(): boolean {
    const v = this.eCancel;
    this.eCancel = false;
    return v;
  }

  // ---- ①ぶら下がる（ひとりの ときも）
  private updHang(dt: number, input: Input): void {
    if (!this.hanging) {
      if (this.cancelled()) {
        this.result = 'cancel';
        return;
      }
      if (this.take() || (this.auto && this.t > 400)) {
        this.hanging = true;
        this.grip = 1;
        this.shun = 'hang';
        se('se_step_metal', { pitch: 1.5, vol: 0.6 });
      }
      return;
    }
    this.breathT += dt;
    const cyc = Math.floor(this.breathT / (BREATH_MS * 2));
    const haku = this.haku();
    // QA：はく の はじめに いちど はなして 押しなおす
    const down = this.auto ? !(haku && this.breathK() > 0.05 && this.breathK() < 0.12) : input.down('confirm');
    if (!down) this.relT += dt;
    else {
      if (this.relT > 0 && this.relT <= REGRIP_MS && haku && this.breathed !== cyc) {
        this.breathed = cyc;
        this.word(T.TETSU_UI.hai, SHUN_X - SX + 26, BAR_Y - SY + 6, 700, '#BDEFFA');
        se('se_cursor', { pitch: 0.7, vol: 0.3 });
      }
      this.relT = 0;
    }
    const good = haku && this.breathed === cyc;
    this.grip = Math.min(1, this.grip - (dt / 1000) * (good ? DRAIN_HAKU : DRAIN));
    this.cntT += dt;
    if (this.cntT >= COUNT_MS) {
      this.cntT -= COUNT_MS;
      this.count++;
      se('se_cursor', { pitch: this.count === HANG_PASS || this.count === HANG_MAX ? 1.3 : 1.0, vol: 0.25 });
      if (this.count === HANG_PASS) this.passed[0] = true;
      if (this.count >= HANG_MAX) {
        this.result = 'max';
        return;
      }
    }
    if (this.grip <= 0 || this.relT > REGRIP_MS) {
      this.grip = Math.max(0, this.grip);
      this.result = this.count >= HANG_PASS ? 'done' : 'fall';
    }
  }

  // ---- グソっ君の さかさま（先生が 数える。押すと おりる）
  private updWatch(dt: number): void {
    this.cntT += dt;
    if (this.take() || this.cancelled()) {
      this.result = 'stop';
      return;
    }
    if (this.cntT >= COUNT_MS) {
      this.cntT -= COUNT_MS;
      this.count++;
      se('se_cursor', { pitch: 1.0, vol: 0.25 });
      if (this.count >= HANG_PASS) this.result = 'too';
    }
  }

  // ---- ②肩を 下げる
  private updKata(dt: number): void {
    this.kataT += dt;
    if (this.cancelled()) {
      this.result = 'cancel';
      return;
    }
    const pos = this.kataPos();
    const press = this.auto ? pos > 0.97 && this.coolT <= 0 : this.take();
    if (!press || this.coolT > 0) return;
    this.coolT = 300;
    const wx = SHUN_X - SX + 30;
    if (pos >= 0.78) {
      this.streak++;
      this.lift = this.streak * 2;
      this.shun = 'pull';
      this.word(T.TETSU_UI.up, wx, BAR_Y - SY + 10, 700, '#FFE7A3');
      se('se_step_metal', { pitch: 1.2 + this.streak * 0.1, vol: 0.5 });
      if (this.streak >= KATA_N) this.result = 'pass';
    } else {
      this.streak = 0;
      this.lift = 0;
      this.shun = 'hang';
      this.word(T.TETSU_UI.miss, wx, BAR_Y - SY + 10, 700, UI.bg2);
      se('se_cursor', { pitch: 0.6, vol: 0.4 });
    }
  }

  // ---- ③1回：肩 → 息 → 長おし
  private updIkkai(dt: number, input: Input): void {
    if (this.step !== 'hiku' && this.cancelled()) {
      this.result = 'cancel';
      return;
    }
    const wx = SHUN_X - SX + 30;
    if (this.step === 'kata') {
      this.kataT += dt;
      const pos = this.kataPos();
      const press = this.auto ? pos > 0.98 : this.take();
      if (!press) return;
      if (pos >= 0.78) {
        this.bonus = pos >= 0.94;
        this.step = 'iki';
        this.ikiT = 0;
        this.lift = 2;
        this.shun = 'pull';
        this.word(T.TETSU_UI.good, wx, BAR_Y - SY + 10, 600, '#FFE7A3');
        se('se_step_metal', { pitch: 1.3, vol: 0.5 });
      } else this.fail();
      return;
    }
    if (this.step === 'iki') {
      this.ikiT += dt;
      const press = this.auto ? this.haku() && this.breathK() > 0.1 : this.take();
      if (!press) return;
      if (!this.haku()) {
        this.fail();
        return;
      }
      this.word(T.TETSU_UI.hai, wx, BAR_Y - SY + 10, 600, '#BDEFFA');
      this.step = 'hiku';
      this.pull = 0;
      this.grip = Math.min(1, PULL_BASE + PULL_RETRY * this.retries + (this.bonus ? PULL_BONUS : 0));
      return;
    }
    // hiku：押したまま
    const down = this.auto || input.down('confirm');
    if (!down) {
      this.fail();
      return;
    }
    this.pull = Math.min(1, this.pull + dt / PULL_MS);
    this.grip -= (dt / 1000) * PULL_DRAIN;
    this.lift = 2 + Math.round(this.pull * 10);
    if (this.pull >= 1) {
      this.shun = 'over';
      this.lift = 12;
      this.passed[2] = true;
      this.result = 'pass';
      se('se_step_metal', { pitch: 1.6, vol: 0.7 });
      return;
    }
    if (this.grip <= 0) {
      this.grip = 0;
      this.fail();
    }
  }

  private fail(): void {
    this.result = 'fail';
    se('se_cursor', { pitch: 0.55, vol: 0.45 });
  }

  // ================================================================ 絵

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      g.clip(SX, SY + dy, CW, CH, () => {
        this.drawScene(g, dy);
        this.drawSide(g, dy);
      });
      const name = T.TETSU_UI.place;
      const tw = g.measure(name) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, name, { seed: 61 });
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

  /** 夜の 校庭：3段の 鉄棒（手前が いちばん 低い 段）、しゅん、グソっ君、まつ先生。 */
  private drawScene(g: Gfx, dy: number): void {
    const by = BAR_Y + dy;
    const gy = GROUND_Y + dy;
    g.rect(SX, SY + dy, RX - SX - 4, CH, this.dark ? '#141826' : '#1E2440');
    // a few stars
    for (let i = 0; i < 9; i++) g.rect(SX + 8 + ((i * 53) % 190), SY + dy + 3 + ((i * 29) % 20), 1, 1, '#C8D0F0');
    // the two higher steps behind, to the right (dim)
    const back = this.dark ? '#3A3E50' : '#5A6074';
    g.rect(BAR_X1 - 70, by - 22, 2, gy - by + 22, back);
    g.rect(BAR_X1 - 40, by - 14, 2, gy - by + 14, back);
    g.rect(BAR_X1 - 70, by - 22, 70, 2, back);
    g.rect(BAR_X1 - 110, by - 14, 70, 2, back);
    // the ground (the school yard)
    g.rect(SX, gy, RX - SX - 4, CH, this.dark ? '#2A2420' : '#4A3E32');
    g.rect(SX, gy, RX - SX - 4, 1, this.dark ? '#3A3228' : '#6A5844');
    // the lowest bar: posts and the rail, the rust worn off in hand shapes
    const post = this.dark ? '#4A4E5E' : '#7A8094';
    g.rect(BAR_X0, by - 2, 3, gy - by + 2, post);
    g.rect(BAR_X1 - 3, by - 2, 3, gy - by + 2, post);
    g.rect(BAR_X0, by, BAR_X1 - BAR_X0, 3, this.dark ? '#6A6058' : '#A0907A');
    g.rect(BAR_X0, by + 2, BAR_X1 - BAR_X0, 1, this.dark ? '#4A4038' : '#7A6A58');
    if (!this.dark) {
      // まつ先生's two big hands (left of the middle), and しゅん's two small ones after the 1回
      const metal = '#C8CCD8';
      for (const hx of [SHUN_X - 24, SHUN_X - 14]) g.rect(hx, by, 7, 2, metal);
      if (flag(TF.done) || this.shun === 'over') for (const hx of [SHUN_X - 7, SHUN_X + 3]) g.rect(hx, by, 4, 2, metal);
      if (flag(TF.kane) || this.kane) for (let i = 0; i < 6; i++) g.rect(KANE_X - 6 + i * 2 + (i % 2), by + (i % 2), 1, 1, metal);
    }
    // the lantern's warm light round しゅん (h1)
    if (!this.dark) g.alpha(0.1, () => g.circle(SHUN_X, by + 20, 46, '#FFB070'));
    this.drawShun(g, by, gy);
    if (this.kane) {
      const img = kaneUpside();
      g.img(img, KANE_X - img.width, by + 2, { scale: 2 });
    }
    if (this.fumi) {
      const f = charSprite('npc_hoshi_fumi');
      const img = f.walk.left[0];
      g.img(img, FUMI_X - img.width, gy - img.height * 2 + 2, { scale: 2 });
    }
    // the count (her voice; しゅん's own when alone)
    if ((this.mode === 'hang' || this.mode === 'solo' || this.mode === 'watch') && this.count > 0 && (this.hanging || this.mode === 'watch' || this.result)) {
      const word = KAZU[Math.min(this.count, HANG_MAX) - 1];
      const cx = this.fumi ? FUMI_X - 4 : SHUN_X + 44;
      const cy = SY + dy + 2;
      const w = measure(word) + 10;
      g.rect(cx - w / 2, cy, w, 18, '#F4EEDC');
      g.frame(cx - w / 2, cy, w, 18, '#3A3040');
      g.text(word, cx, cy + 1, { color: this.count >= HANG_PASS ? '#C8402E' : '#3A3040', align: 'center' });
    }
    if (this.dark) g.rect(SX, SY + dy, RX - SX - 4, CH, '#000010', 0.25);
    this.drawMeters(g, by, gy);
  }

  /** しゅん：minato_hang を 2倍で。体を 上げる ときは 手の 列だけ 鉄棒に 残す。 */
  private drawShun(g: Gfx, by: number, gy: number): void {
    if (this.shun === 'stand') {
      const img = charSprite('minato').walk.down[0];
      g.img(img, SHUN_X - img.width, gy - img.height * 2 + 2, { scale: 2 });
      return;
    }
    const s = charSprite('minato_hang');
    const shake = this.mode === 'ikkai' && this.step === 'hiku' && Math.floor(this.t / 90) % 2 === 0;
    const img = poseFrame(s, this.shun === 'hang' ? 'hang' : shake ? 'shake' : 'pull');
    const grip = (img.height - HANG_H + HANG_GRIP_ROW) * 2;
    const x0 = SHUN_X - img.width;
    const y0 = by - grip + 1;
    const L = this.lift * 2;
    if (!L) {
      g.img(img, x0, y0, { scale: 2 });
      return;
    }
    // the body raised; the hand columns of the raised picture only below the bar, the hands on it
    const w2 = img.width * 2;
    g.clip(x0 + 6, y0 - L, w2 - 12, img.height * 2, () => g.img(img, x0, y0 - L, { scale: 2 }));
    for (const cx of [x0, x0 + w2 - 6]) {
      g.clip(cx, by + 3, 6, img.height * 2, () => g.img(img, x0, y0 - L, { scale: 2 }));
      g.clip(cx, y0, 6, grip + 3, () => g.img(img, x0, y0, { scale: 2 }));
    }
  }

  /** ゲージ・肩の 印・息の 印。 */
  private drawMeters(g: Gfx, by: number, gy: number): void {
    const m = this.mode;
    const showGrip = ((m === 'hang' || m === 'solo') && this.hanging) || (m === 'ikkai' && this.step === 'hiku');
    if (m === 'hang' || m === 'solo' || m === 'ikkai') {
      const y = GAUGE_Y + (gy - GROUND_Y);
      g.text(T.TETSU_UI.grip, SX + 4, y - 3, { color: UI.bg });
      g.rect(GAUGE_X, y, GAUGE_W, 8, '#2A2236');
      g.frame(GAUGE_X - 1, y - 1, GAUGE_W + 2, 10, UI.bg2);
      const v = showGrip ? Math.max(0, this.grip) : m === 'ikkai' ? 0 : 1;
      const col = v < 0.25 ? '#D9483A' : v < 0.5 ? '#F2B84B' : '#9BCB6B';
      g.rect(GAUGE_X, y, Math.round(GAUGE_W * Math.min(1, v)), 8, col);
      if (m === 'ikkai' && this.step === 'hiku') {
        // how far up: a mark on the gauge's top
        const px = GAUGE_X + Math.round(GAUGE_W * this.pull);
        g.rect(px, y - 3, 1, 3, '#FFE7A3');
      }
    }
    // the breath (すう／はく)
    if (((m === 'hang' || m === 'solo') && this.hanging) || (m === 'ikkai' && this.step === 'iki')) {
      const haku = this.haku();
      const x = SHUN_X + 22;
      const y = by + 18;
      g.rect(x, y, 36, 18, haku ? '#3A5A78' : '#2A2236');
      g.frame(x, y, 36, 18, haku ? '#BDEFFA' : UI.bg2);
      g.text(haku ? T.TETSU_UI.haku : T.TETSU_UI.suu, x + 18, y + 1, { color: haku ? '#FFFFFF' : UI.bg2, align: 'center' });
      g.rect(x + 2, y + 15, Math.round(32 * this.breathK()), 1, haku ? '#BDEFFA' : UI.bg2);
    }
    // the shoulder (上／下)
    if (m === 'kata' || (m === 'ikkai' && this.step === 'kata')) {
      g.text(T.TETSU_UI.kataUp, KATA_X - 18, KATA_Y0 - 8, { color: UI.bg2 });
      g.text(T.TETSU_UI.kataDown, KATA_X - 18, KATA_Y1 - 8, { color: '#FFE7A3' });
      g.rect(KATA_X, KATA_Y0, 2, KATA_Y1 - KATA_Y0, UI.bg2);
      const zone = Math.round((KATA_Y1 - KATA_Y0) * 0.78);
      g.rect(KATA_X - 2, KATA_Y0 + zone, 6, KATA_Y1 - KATA_Y0 - zone, '#FFE7A3', 0.5);
      const y = KATA_Y0 + Math.round((KATA_Y1 - KATA_Y0) * this.kataPos());
      g.rect(KATA_X - 3, y - 2, 8, 4, '#FFB070');
      g.frame(KATA_X - 4, y - 3, 10, 6, '#3A3040');
      if (m === 'kata') for (let i = 0; i < KATA_N; i++) g.rect(KATA_X - 16 + i * 6, KATA_Y1 + 10, 4, 4, i < this.streak ? '#FFB070' : '#4A4458');
    }
  }

  /** 右の 列：練習の 札と ボタン。 */
  private drawSide(g: Gfx, dy: number): void {
    const oy = SY + dy;
    g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
    T.TETSU_UI.fuda.forEach((name, i) => {
      const y = oy + 6 + i * 22;
      const cur = !this.passed[i] && this.passed.slice(0, i).every((x) => x);
      g.rect(RX, y, 106, 18, this.passed[i] ? '#F4EEDC' : '#C8C0B0');
      g.text(name, RX + 6, y + 1, { color: '#3A3040' });
      if (cur) g.frame(RX - 1, y - 1, 108, 20, '#FFE7A3');
      if (this.passed[i]) {
        g.ring(RX + 100, y + 9, 5, '#D9483A');
        g.ring(RX + 100, y + 9, 4, '#D9483A');
      }
    });
    const keys = this.mode === 'kata' ? T.TETSU_UI.keysKata : this.mode === 'ikkai' ? T.TETSU_UI.keysIkkai : this.mode === 'watch' ? T.TETSU_UI.keysWatch : T.TETSU_UI.keysHang;
    if (this.mode !== 'idle') {
      g.text(keys[0], RX, oy + 74, { color: '#FFE7A3' });
      if (keys[1]) g.text(keys[1], RX, oy + 90, { color: '#FFE7A3' });
    }
    markText(RX - 4, oy, SX + CW - RX + 4, CH);
  }
}

// ================================================================ 練習

let qaAuto = false;

function* openPanel(p: TetsuPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: TetsuPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

function* talk(p: TetsuPanel, text: string): Co {
  const was = p.mode;
  p.mode = 'idle';
  yield* say(text);
  p.mode = was;
  p.clearInput();
}

function* waitResult(p: TetsuPanel): Co<string> {
  p.clearInput();
  while (!p.result) yield null;
  return p.result;
}

/** ぶら下がる 1回ぶん（落ちるか、やめるか、とお／はたち）。 */
function* hangOnce(p: TetsuPanel, mode: 'hang' | 'solo'): Co<HangResult> {
  p.resetHang();
  p.shun = 'stand';
  p.mode = mode;
  const r = (yield* waitResult(p)) as HangResult;
  p.mode = 'idle';
  if (r !== 'cancel') {
    // down to the ground
    yield 300;
    se('se_step_dirt', { vol: 0.8 });
    p.shun = 'stand';
    p.hanging = false;
    yield 300;
  }
  return r;
}

/** 大写しの 練習（段階0〜1、先生が 鉄棒の 横）。すべて すめば true。 */
export function* lesson(): Co<boolean> {
  yield* say(T.TETSU_START);
  const p = new TetsuPanel();
  p.auto = qaAuto;
  p.dark = !lanternOn();
  p.passed = [flag(TF.p1) > 0, flag(TF.p2) > 0, false];
  let ok = false;
  try {
    yield* openPanel(p);
    if (p.dark && !flag(TF.dark)) {
      setFlag(TF.dark, 1);
      yield* talk(p, T.TETSU_DARK);
    }
    // ①ぶら下がる
    if (!flag(TF.p1)) {
      yield* talk(p, T.HANG_RULE);
      let falls = 0;
      for (;;) {
        const r = yield* hangOnce(p, 'hang');
        if (r === 'cancel') return false;
        if (r === 'fall') {
          yield* talk(p, falls++ ? T.HANG_FALL_AGAIN : T.HANG_FALL);
          continue;
        }
        setFlag(TF.p1, 1);
        p.passed[0] = true;
        yield* talk(p, T.HANG_PASS_TEXT);
        if (r === 'max' && !flag(TF.hatachi)) {
          setFlag(TF.hatachi, 1);
          yield* talk(p, T.HANG_HATACHI);
          addMp(1);
          se('se_item');
          yield* talk(p, T.HANG_HATACHI_REWARD);
        }
        break;
      }
    }
    // グソっ君の さかさま（1回）
    if (!flag(TF.kane)) {
      p.shun = 'stand';
      p.kane = true;
      se('se_step_metal', { pitch: 1.8, vol: 0.5 });
      yield* talk(p, T.KANE_SAKASA);
      p.count = 0;
      p.cntT = 0;
      p.result = null;
      p.mode = 'watch';
      const r = yield* waitResult(p);
      p.mode = 'idle';
      setFlag(TF.kane, 1);
      if (r === 'too') {
        setFlag(TF.kaneToo, 1);
        yield 300;
        yield* talk(p, T.KANE_TOO);
      } else yield* talk(p, T.KANE_STOP);
      p.kane = false;
      p.count = 0;
      se('se_step_dirt', { pitch: 1.4, vol: 0.5 });
    }
    // ②肩を 下げる
    if (!flag(TF.p2)) {
      p.shun = 'hang';
      yield* talk(p, T.KATA_RULE);
      p.streak = 0;
      p.kataT = 0;
      p.result = null;
      p.mode = 'kata';
      const r = yield* waitResult(p);
      p.mode = 'idle';
      if (r === 'cancel') return false;
      setFlag(TF.p2, 1);
      p.passed[1] = true;
      yield* talk(p, T.KATA_FIRST);
      p.lift = 0;
      p.shun = 'stand';
      yield* talk(p, T.KATA_PASS);
    }
    // ③1回
    p.shun = 'hang';
    yield* talk(p, T.IKKAI_RULE);
    for (;;) {
      p.resetIkkai();
      p.mode = 'ikkai';
      const r = yield* waitResult(p);
      p.mode = 'idle';
      if (r === 'cancel') return false;
      if (r === 'pass') break;
      p.retries++;
      p.lift = 0;
      p.shun = 'hang';
      yield 250;
      yield* talk(p, T.IKKAI_FAIL);
      if (p.retries === 2) yield* talk(p, T.IKKAI_FAIL_FUMI);
    }
    setFlag(TF.done, 1);
    p.word(T.TETSU_UI.over, SHUN_X - SX + 48, 14, 1400, '#FFE7A3');
    yield 900;
    yield* talk(p, T.IKKAI_DONE);
    ok = true;
  } finally {
    yield* closePanel(p);
  }
  return ok;
}

/** 1回の あと：はなまるの 書き足し、先生は 集会所へ、朱肉 +2。 */
function* afterIkkai(): Co {
  if (hasItem('item_hanamaru_kensui')) {
    yield* say(T.HANAMARU);
    se('se_pen_write');
    yield 300;
    setFlag(TF.hanamaru, 1);
    yield* say(T.HANAMARU_2);
    se('se_page', { pitch: 1.2, vol: 0.6 });
    yield* say(T.HANAMARU_SYS);
  }
  yield* say(T.TETSU_BYE);
  setFlag(TF.away, 0);
  const f = field();
  const a = f?.actorById('npc_hoshi_fumi');
  if (f && a) {
    const route = routeTiles(a.tileX, a.tileY, 26, 28) ?? [[26, 28]];
    sendAway(a, route, 2.2, 200);
  }
  addMp(2);
  se('se_item');
  yield* say(T.TETSU_REWARD);
}

/** ひとりで ぶら下がる（すんだ あと。記録は かわらない）。 */
function* solo(): Co {
  yield* say(T.SOLO_RULE);
  const p = new TetsuPanel();
  p.auto = qaAuto;
  p.fumi = false;
  p.dark = !lanternOn() && hStage() <= 2;
  p.passed = [true, true, true];
  let n = 0;
  try {
    yield* openPanel(p);
    const r = yield* hangOnce(p, 'solo');
    n = r === 'cancel' ? -1 : p.count;
  } finally {
    yield* closePanel(p);
  }
  if (n >= 0) yield* say(T.SOLO_END(n));
}

// ================================================================ 鉄棒と まつ先生

wrap('obj_hoshi_tetsubou', function* (_ctx, orig): Co {
  if (flag(TF.done)) {
    se('se_examine');
    const i = yield* say(T.TETSU_AFTER);
    if (i === 0) yield* solo();
    else if (i === 1) yield* say(T.TETSU_NIKAIME);
    return;
  }
  if (flag(TF.away) && fumiNear() && eligible()) {
    se('se_examine');
    if (yield* lesson()) yield* afterIkkai();
    return;
  }
  const seen = flag('flag_seen_obj_hoshi_tetsubou') > 0;
  yield* orig();
  if (seen && !flag(TF.hint) && fumiNear() && eligible()) {
    setFlag(TF.hint, 1);
    yield* say(T.TETSU_HINT);
  }
});

wrap('npc_hoshi_fumi', function* (_ctx, orig): Co {
  if (onMap('map_hoshimidai') && flag(TF.away) && fumiNear()) {
    yield* say(T.TETSU_WAIT);
    return;
  }
  if (onMap('map_hoshi_school') && fumiNear() && !fumiStoryFirst()) {
    if (flag(TF.hint) && !flag(TF.talk) && eligible()) {
      setFlag(TF.talk, 1);
      yield* say(T.TETSU_NIKKA);
      yield* say(T.TETSU_NIKKA_2);
      setFlag(TF.away, 1);
      const f = field();
      const a = f?.actorById('npc_hoshi_fumi');
      if (f && a) {
        // to the tile in front of the hall's door (the door itself is solid): she goes out there
        const route = routeTiles(a.tileX, a.tileY, 5, 11);
        if (route && route.length > 1) sendAway(a, route.slice(0, -1), 2.2, 200);
        else f.removeActor(a);
      }
      return;
    }
    if (flag(TF.done) && !flag(TF.fumiAfter)) {
      setFlag(TF.fumiAfter, 1);
      yield* say(T.TETSU_FUMI_AFTER);
      return;
    }
  }
  yield* orig();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.tetsu(step = 'hint', auto = false)（段階1、トマトの 灯り。'h0' だけ 段階0）
 *   'hint'    鉄棒を 1回 見た あと、鉄棒の 前 (31,29) 南向き（調べると グソっ君）
 *   'talk'    グソっ君の あと、集会所の まつ先生の 前（〔tetsu〕）
 *   'lesson'  先生が 鉄棒の 横、鉄棒の 前（調べると 大写し。auto：自動）
 *   'kane'    ①が すんだ あと（グソっ君の さかさまから）
 *   'kata'    ①と グソっ君が すんだ あと（②から）
 *   'ikkai'   ②まで すんだ あと（③から）
 *   'after'   すんだ あと（はなまるも）、鉄棒の 前
 *   'fumi'    すんだ あと、集会所の まつ先生の 前（1回の 台詞）
 *   'h0'      段階0（灯りなし）、先生が 鉄棒の 横
 * 第1章の 懸垂（flag_kensui_try）と はなまる『懸垂挑戦！』は つけて おく（'nohana'：はなまる なし の lesson）。
 */
if (import.meta.env.DEV) {
  registerDebug('tetsu', (step = 'hint', auto = false) => {
    const h0 = step === 'h0';
    if (h0) cmd().jump?.('ch2:mitsu', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(TF)) setFlag(id, 0);
    setFlag('flag_kensui_try', 1);
    setFlag('flag_got_hanamaru_kensui', step === 'nohana' ? 0 : 1);
    const inv = state.inventory;
    const has = inv.includes('item_hanamaru_kensui');
    if (step === 'nohana' && has) inv.splice(inv.indexOf('item_hanamaru_kensui'), 1);
    if (step !== 'nohana' && !has) inv.push('item_hanamaru_kensui');
    // まつ先生の 物語（寄り合い・天文台の 鍵）は すんだ ことに
    setFlag('flag_ch2_yoriai', 1);
    if (!h0) setFlag(DF.key, 1);
    qaAuto = !!auto;
    const bar = () => cmd().warp?.('map_hoshimidai', 31, 29, 'down');
    const school = () => cmd().warp?.('map_hoshi_school', 9, 4, 'up');
    setFlag('flag_seen_obj_hoshi_tetsubou', 1);
    if (step === 'hint') return bar();
    setFlag(TF.hint, 1);
    if (step === 'talk') return school();
    setFlag(TF.talk, 1);
    setFlag(TF.away, 1);
    if (step === 'lesson' || step === 'nohana' || h0) return bar();
    setFlag(TF.p1, 1);
    if (step === 'kane') return bar();
    setFlag(TF.kane, 1);
    if (step === 'kata') return bar();
    setFlag(TF.p2, 1);
    if (step === 'ikkai') return bar();
    setFlag(TF.away, 0);
    setFlag(TF.done, 1);
    setFlag(TF.hanamaru, 1);
    setFlag(TF.kaneToo, 1);
    setFlag(TF.hatachi, 1);
    if (step === 'fumi') return school();
    return bar();
  });

  registerDebug('tetsuState', () => {
    const p = game.ui.widgets.find((w) => w instanceof TetsuPanel) as TetsuPanel | undefined;
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(TF)) flags[k] = flag(id);
    const a = field()?.actorById('npc_hoshi_fumi');
    return {
      flags,
      fumi: a ? { map: field()?.map.id, x: a.x, y: a.y, path: a.path?.length ?? 0 } : null,
      panel: p
        ? { mode: p.mode, shun: p.shun, hanging: p.hanging, grip: Math.round(p.grip * 100) / 100, count: p.count, step: p.step, streak: p.streak, retries: p.retries, result: p.result, passed: p.passed }
        : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the close-up's words in their room. */
export function tetsuTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足様', '平和', '17', '3人'];
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
  walkT('tetsu', T.TETSU_TEXTS);
  // the tags (88 px, the text from +11), the keys (to the panel's edge), the count bubble, the gauge's label
  for (const f of T.TETSU_UI.fuda) if (6 + measure(f) > 94) bad.push(`札: ${measure(f)}px: ${f}`);
  const col = SX + CW - RX - 2;
  for (const l of [...T.TETSU_UI.keysHang, ...T.TETSU_UI.keysKata, ...T.TETSU_UI.keysIkkai, ...T.TETSU_UI.keysWatch]) if (measure(l) > col) bad.push(`keys: ${measure(l)}px > ${col}: ${l}`);
  for (const k of KAZU) if (FUMI_X - 4 + (measure(k) + 10) / 2 > RX - 4) bad.push(`かず: ${k}`);
  if (SX + 4 + measure(T.TETSU_UI.grip) > GAUGE_X - 2) bad.push(`grip label: ${measure(T.TETSU_UI.grip)}px`);
  // the hanamaru's two lines in the bag: one text, wrapped as the item page does (at most 4 lines)
  const desc = phraseWrap(T.HANAMARU_DESC[0] + '\n' + T.HANAMARU_DESC[1], RP.w - 2, { glue: true });
  if (desc.length > 4) bad.push(`はなまる: ${desc.length} lines: ${desc.join('／')}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('tetsuText', () => tetsuTextCheck());
