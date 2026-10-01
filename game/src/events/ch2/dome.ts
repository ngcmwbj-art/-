// 朝の ほうだけ 光る 星（第2章・段階2の 寄り道。げむきか 10/1 の 3、02_ch2_index #77、
// 50 3.7・9.8・10.25、52 4.7・7.7、53 8.17・12.20）。
//
//   〔dome〕   まつ先生 (47,2)：段階2で はじめて 話すと 天文台の 鍵（npcs.ts が 先に 聞く）
//   丘の 扉 (4,5) → map_hoshi_dome（はじめて 入ったとき evt_dome_enter）
//   望遠鏡     カバーを とる → タクミの 観望会カードが 落ちる（大写し）→ 星ごとに：
//              スリットが 閉じている／ドームが 向いていない／ふた → 接眼レンズ
//   ハンドル   『スリット』決定の 連打で 開ける（見上げる 画面）。
//              『ドーム』←→で 回す。カードの つぎの 星が スリットに 入ると「カチッ」と 止まる
//   接眼レンズ 上下左右 さかさまの 像：十字キーで 微動ハンドル（押した ほうへ 光が 動く＝
//              ふつうの 画面の 逆。まん中の 輪へ）→ ←→で ピント → 決定で 見る。
//              ①金星（半分）②オリオン座の 星雲（鳥、4つの 星、星が にげない）
//              ③すばる（いっぱい → グソっ君の 目では もっと）。見るたびに カードの 欄を 書く
//   〔kanbo〕  3つ 書いた カードを まつ先生に：赤ペンの はなまる、カードは タクミへ、朱肉 +2、
//              金平糖（観望会の ごほうび）。エンディングの カット3で さんかどに 封筒（ending.ts の cue）
//
// 画面は どれも 全画面の 部品（Widget）。毎フレームの 合成は スリットの 帯（56×176）か 視野の 円
// （161×161）だけ。絵は src/art/props/dome_art.ts（部屋）・dome_sky_art.ts（空・視野・カード）。
// iPad の 横（ボタンが 下の 角に 固定）：方位の 帯は freeSpan の 中だけ、札と 字は markText、
// カードは markTextScreen（字の 画面）。タッチは 十字キーと けってい。
//
// QA：__game.cmd.dome(step, o)、domeAuto()、domeState()、domeText()、domeSheet()、jump('ch2:dome')、
// tools/playthrough.mjs --chapter 2 --side dome。

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { makeCanvas } from '../../engine/pixel';
import { W } from '../../engine/screen';
import { markText, markTextScreen } from '../../engine/textzones';
import { freeSpan, hitsButtons } from '../../engine/safezones';
import { touchControlsOn } from '../../engine/touch';
import { animate, ease } from '../../engine/tween';
import { measure } from '../../engine/font';
import { Cues } from '../../battle/ui/cue';
import { sfx } from '../../audio';
import { flag, hasItem, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript } from '../../world/scripts';
import { field } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { runMsg } from '../../world/msg';
import { lanternOf } from '../../art/chars/nightlight';
import { drawTape, UI } from '../../ui/window';
import { keyGuide } from '../stage';
import { addMp, F, getKeyItem, giveKey } from '../lib';
import { puff } from '../fx';
import { hStage, poseIf, unpose } from './common';
import { scopeSheet } from '../../art/props/dome_art';
import {
  barrel,
  BLUR_LEVELS,
  compoundEye,
  EYE,
  eyePatch,
  fieldMask,
  halfMoon,
  hanamaruStroke,
  HOR,
  LOOK,
  lookFrame,
  PAN_W,
  panX,
  panY,
  PATCH,
  PXD,
  skyPanorama,
  SLIT_W,
  targetAltAz,
} from '../../art/props/dome_sky_art';
import * as T from '../../data/text/hoshi_dome';

// ---------------------------------------------------------------- flags (50 11.8)

export const DF = {
  /** 〔dome〕を 聞いて 鍵を もらった。 */
  key: 'flag_dome_key',
  /** はじめて 中に 入った（evt_dome_enter）。 */
  enter: 'flag_dome_enter',
  /** カバーを とった（カードが 落ちた）。 */
  cover: 'flag_dome_cover',
  /** スリットが 開いた。 */
  slit: 'flag_dome_slit',
  /** ドームの 向き（方位、度。0 = まだ 南）。 */
  az: 'flag_dome_az',
  /** 望遠鏡の ふたを とった。 */
  cap: 'flag_dome_cap',
  /** 望遠鏡が 向いている 星（0 北の 空に しまってある、1〜3）。 */
  aim: 'flag_dome_aim',
  /** 見て、カードに 書いた 数（0〜3）。 */
  n: 'flag_kanbo_n',
  /** グソっ君の「逆やん！」（1回）。 */
  gyaku: 'flag_dome_gyaku',
  /** 「さかさま らしい」（はじめて まん中に 入ったとき 1回）。 */
  sakasama: 'flag_dome_sakasama',
  /** すばるを 目で 数えた。 */
  count: 'flag_dome_count',
  /** まつ先生に カードを 見せた（はなまる、朱肉 +2。エンディングで さんかどに）。 */
  report: 'flag_kanbo_report',
  /** 〔kanbo〕の あとの 1回。 */
  after: 'flag_kanbo_after',
  /** 鍵の ない 扉で グソっ君の ひとこと（1回）。 */
  hint: 'flag_dome_hint',
  /** 鍵を もらったあとの まつ先生の 1回（〔dome_2〕）。 */
  wait: 'flag_dome_wait',
  /** スリットが 閉じているとき グソっ君（1回）。 */
  shutKane: 'flag_dome_shut_kane',
  /** 赤い ライトの 箱で グソっ君（1回）。 */
  lightKane: 'flag_dome_light_kane',
};

const ITEM_KEY = 'item_dome_key';
const ITEM_CARD = 'item_kanbo_card';
const ITEM_CARD_DONE = 'item_kanbo_card_done';

/** The azimuth the dome faces now (180 = parked to the south). */
function azNow(): number {
  const v = flag(DF.az);
  return v > 0 ? v : 180;
}

/** The target's azimuth and altitude (degrees). */
function tgt(n: 1 | 2 | 3): { az: number; alt: number } {
  const [alt, az] = targetAltAz(n);
  return { az, alt };
}

const angDiff = (a: number, b: number) => ((a - b + 540) % 360) - 180;

/** Is the slit on target n? */
function domeOn(n: 1 | 2 | 3): boolean {
  return Math.abs(angDiff(azNow(), tgt(n).az)) < 2.5;
}

let qaAuto = false;
const FRAME = 1000 / 60;

// ---------------------------------------------------------------- the look-up screen (the slit and the dome)

type SkyMode = 'slit' | 'rot';

export class DomeSkyPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  mode: SkyMode;
  az: number;
  /** 0 shut … 1 open */
  shutter: number;
  crankA = 0;
  /** the card's next star (rot), or 0 */
  target: 0 | 1 | 2 | 3;
  stopped = false;
  moving = 0;
  shake = 0;
  cues = new Cues();
  auto = false;
  canMove = false;
  /** the name tag beside the star once the dome stops on it (ms shown) */
  tagT = -1;
  /** dust falling in the slit while it turns */
  dust: { x: number; y: number; v: number }[] = [];
  private ePress = false;
  private eCancel = false;
  private l = false;
  private r = false;

  constructor(mode: SkyMode, target: 0 | 1 | 2 | 3) {
    this.mode = mode;
    this.target = target;
    this.az = azNow();
    this.shutter = flag(DF.slit) ? 1 : 0;
  }

  take(): boolean {
    const v = this.ePress;
    this.ePress = false;
    return v;
  }
  takeCancel(): boolean {
    const v = this.eCancel;
    this.eCancel = false;
    return v;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (input.pressed('confirm')) this.ePress = true;
    if (input.pressed('cancel')) this.eCancel = true;
    this.l = input.down('left');
    this.r = input.down('right');
    this.cues.update(dt);
    if (this.tagT >= 0) this.tagT += dt;
    this.shake = Math.max(0, this.shake - dt);
    for (const d of this.dust) d.y += (d.v * dt) / 1000;
    this.dust = this.dust.filter((d) => d.y < HOR);
    if (this.mode === 'rot' && this.canMove && !this.stopped) {
      let v = (this.r ? 1 : 0) - (this.l ? 1 : 0);
      if (this.auto && this.target) v = Math.sign(angDiff(tgt(this.target as 1 | 2 | 3).az, this.az)) || 1;
      this.moving = v;
      if (v) {
        const prev = this.az;
        this.az = (this.az + (v * 40 * dt) / 1000 + 360) % 360;
        this.crankA += (v * dt) / 120;
        this.shake = 60;
        if (Math.random() < dt / 90) this.dust.push({ x: LOOK.slitX + 4 + Math.random() * (SLIT_W - 8), y: 0, v: 40 + Math.random() * 50 });
        // the card's star comes into the middle of the slit: a click, it stops
        if (this.target) {
          const ta = tgt(this.target as 1 | 2 | 3).az;
          const d0 = angDiff(ta, prev);
          const d1 = angDiff(ta, this.az);
          if (Math.abs(d1) < 0.8 || (Math.sign(d0) !== Math.sign(d1) && Math.abs(d0) < 10)) {
            this.az = ta;
            this.stopped = true;
            this.moving = 0;
            this.tagT = 0;
          }
        }
      }
    } else this.moving = 0;
  }

  draw(g: Gfx): void {
    const sh = this.shake > 0 ? (Math.floor(this.t / 40) % 2 ? 1 : 0) : 0;
    g.rect(0, 0, W, 216, '#05050A');
    // the sky in the slit (the panorama's start repeats at its end)
    const pan = skyPanorama();
    let sx = panX(this.az) - SLIT_W / 2;
    if (sx < 0) sx += PAN_W;
    g.ctx.drawImage(pan, sx, 0, SLIT_W, HOR + 1, LOOK.slitX, sh, SLIT_W, HOR + 1);
    // the shutter: plates over the slit from the top down to where it has opened to
    if (this.shutter < 1) {
      const bot = Math.round(HOR * (1 - this.shutter));
      g.rect(LOOK.slitX, 0, SLIT_W, bot, '#4A505C');
      for (let y = bot - 1; y >= 0; y -= 9) g.rect(LOOK.slitX, y, SLIT_W, 1, '#2E3440');
      g.rect(LOOK.slitX, bot - 1, SLIT_W, 1, '#7A808C');
      g.rect(LOOK.slitX + 2, 0, 1, bot, '#5E6470');
    }
    for (const d of this.dust) g.rect(Math.round(d.x), Math.round(d.y), 1, 1, '#8A8EA6', 0.7);
    g.img(lookFrame(), 0, sh);
    // the star's name tag once the dome stops on it
    if (this.target && this.tagT >= 0) {
      const tg = tgt(this.target as 1 | 2 | 3);
      const x = 192 + Math.round(angDiff(tg.az, this.az) * PXD);
      const y = panY(tg.alt);
      const name = T.DOME_WORD.star[this.target - 1];
      const a = Math.min(1, this.tagT / 200);
      const tw = measure(name) + 14;
      const tx = Math.min(W - tw - 6, x + 14);
      const ty = Math.max(4, y - 9);
      g.alpha(a, () => {
        g.rect(x + 4, y, tx - x - 4, 1, '#F6D98A');
        drawTape(g, tx, ty, tw, 16, name, { seed: 5 });
      });
      markText(tx, ty, tw, 16, true);
    }
    this.drawStrip(g);
    if (this.mode === 'slit') this.drawCrank(g);
    // the card's star, top left
    if (this.mode === 'rot' && this.target) {
      const text = T.DOME_WORD.tape(this.target);
      const tw = measure(text) + 16;
      drawTape(g, 8, 6, tw, 16, text, { seed: 3 });
      markText(8, 6, tw, 16);
    }
    this.cues.draw(g, this.t);
  }

  /** The bearings painted round the drum under the ring: N E S W every 90°, ticks every 10°, the card's star. */
  private drawStrip(g: Gfx): void {
    const y0 = LOOK.stripY;
    const { x0, x1 } = freeSpan(y0, y0 + 22, 8, W - 8);
    const k = 1.6; // px per degree
    g.ctx.save();
    g.ctx.beginPath();
    g.ctx.rect(x0, y0 - 2, x1 - x0, 26);
    g.ctx.clip();
    for (let d = -150; d <= 150; d += 10) {
      const a = Math.round((this.az + d) / 10) * 10;
      const x = Math.round(192 + angDiff(a, this.az) * k);
      const big = a % 90 === 0;
      g.rect(x, y0, 1, big ? 5 : 3, big ? UI.border : '#5E6278');
      if (big) {
        const label = T.DOME_WORD.dir[(((a / 90) % 4) + 4) % 4];
        g.text(label, x - 8, y0 + 5, { color: a % 360 === 0 ? '#B8241E' : UI.border });
      }
    }
    // the card's next star on the band
    if (this.target) {
      const x = Math.round(192 + angDiff(tgt(this.target as 1 | 2 | 3).az, this.az) * k);
      if (x > x0 + 4 && x < x1 - 4) {
        g.rect(x - 2, y0 + 1, 5, 1, '#E23B2E');
        g.rect(x - 1, y0, 3, 3, '#E23B2E');
        g.rect(x, y0 - 1, 1, 5, '#E23B2E');
      }
    }
    g.ctx.restore();
    // where the slit faces: the red mark in the middle
    g.rect(191, y0 - 3, 3, 2, '#E23B2E');
    g.rect(192, y0 - 1, 1, 2, '#E23B2E');
    markText(x0, y0, x1 - x0, 22);
  }

  /** The crank, up on the left (the hand's turning shows each press). */
  private drawCrank(g: Gfx): void {
    const cx = 70;
    const cy = 64;
    g.circle(cx, cy, 15, '#3A3F48');
    g.circle(cx, cy, 13, '#6B7186');
    g.circle(cx, cy, 4, '#9AA0A8');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.crankA;
      g.rect(Math.round(cx + Math.cos(a) * 14), Math.round(cy + Math.sin(a) * 14), 2, 2, '#3A3F48');
    }
    const a = this.crankA * 1.0;
    const hx = Math.round(cx + Math.cos(a) * 11);
    const hy = Math.round(cy + Math.sin(a) * 11);
    g.line(cx, cy, hx, hy, '#2A2440');
    g.rect(hx - 2, hy - 2, 5, 5, '#C8A06A');
    g.rect(hx - 2, hy - 2, 5, 1, '#DCC08A');
    // the chain going up from it to the slit
    for (let y = cy - 16; y > 4; y -= 3) g.rect(cx + 6 + Math.round((cy - y) * 0.9), y, 2, 2, (y >> 1) % 2 ? '#9AA0A8' : '#3A3F48');
  }
}

/** The slit: press repeatedly (10 years of rust: the first presses only squeak). */
function* slitSession(p: DomeSkyPanel): Co {
  p.cues.set('mash', T.DOME_WORD.mash, { x: 70, y: 86, align: 'center', tone: 'hold', mode: 'beat', scale: 1, button: '連打！' });
  let presses = 0;
  let autoT = 0;
  while (p.shutter < 1) {
    let hit = p.take();
    if (p.auto) {
      autoT += FRAME;
      if (autoT > 110) {
        autoT = 0;
        hit = true;
      }
    }
    if (hit) {
      presses++;
      p.crankA += Math.PI / 4;
      sfx('se_dome_crank');
      if (presses <= 3) {
        sfx('se_dome_rust', { pitch: 1 + presses * 0.05 });
        p.shutter = Math.min(1, p.shutter + 0.02);
        p.cues.set('word', T.DOME_WORD.gi, { x: 70, y: 22, align: 'center', tone: 'off', mode: 'still', scale: 1 });
      } else {
        sfx('se_dome_shutter');
        p.shutter = Math.min(1, p.shutter + 1 / 11);
        p.shake = 80;
        if (presses === 4) p.cues.set('word', T.DOME_WORD.goro, { x: 70, y: 22, align: 'center', tone: 'go', mode: 'still', scale: 1 });
      }
    }
    yield null;
  }
  p.cues.drop('mash', 'go');
  p.cues.drop('word');
  setFlag(DF.slit, 1);
  if (!flag(DF.az)) setFlag(DF.az, 180);
  yield 500;
}

/** The dome: ←→ turns it until the card's star is in the slit (X leaves it where it is). */
function* rotSession(p: DomeSkyPanel): Co<boolean> {
  p.canMove = true;
  let lastSnd = 0;
  for (;;) {
    if (p.moving && game.time - lastSnd > 280) {
      lastSnd = game.time;
      sfx('se_dome_rotate');
    }
    if (p.stopped) break;
    if (p.takeCancel() && !p.auto) {
      p.canMove = false;
      setFlag(DF.az, Math.round(p.az) || 360);
      return false;
    }
    yield null;
  }
  p.canMove = false;
  sfx('se_dome_stop');
  p.shake = 0;
  setFlag(DF.az, Math.round(p.az * 10) / 10 || 360);
  setFlag(DF.az, Math.round(p.az) || 360);
  p.az = azNow();
  yield 450;
  return true;
}

/** The look-up screen: open with a fade, run, close. */
function* skySession(mode: SkyMode, target: 0 | 1 | 2 | 3): Co<boolean> {
  const p = new DomeSkyPanel(mode, target);
  p.auto = qaAuto;
  yield* game.fadeOut(220);
  game.ui.push(p);
  yield* game.fadeIn(260);
  let ok = true;
  try {
    if (mode === 'slit') {
      if (!p.auto) keyGuide([[[touchControlsOn() ? 'けってい' : 'Z'], T.DOME_WORD.mash]], 4500, 8);
      yield* slitSession(p);
      yield* runMsg(T.SLIT_OPEN);
    } else {
      if (!p.auto)
        keyGuide(
          [
            [['left', 'right'], T.DOME_WORD.rot],
            [[touchControlsOn() ? 'もどる' : 'X'], T.DOME_WORD.back],
          ],
          4500,
          8,
        );
      ok = yield* rotSession(p);
      if (ok && target) {
        yield* runMsg(T.ROT_STOP[target as 1 | 2 | 3]);
        if (target === 3 && !flag(DF.count)) {
          setFlag(DF.count, 1);
          yield* runMsg(T.ROT_COUNT);
        }
      }
    }
    yield* game.fadeOut(220);
  } finally {
    p.cues.clear();
    p.done = true;
    game.ui.remove(p);
  }
  yield* game.fadeIn(260);
  return ok;
}

// ---------------------------------------------------------------- the eyepiece

type EyePhase = 'aim' | 'focus' | 'seen' | 'kane';

const START: Record<1 | 2 | 3, [number, number]> = { 1: [50, -32], 2: [-46, 30], 3: [36, 40] };
const BEST: Record<1 | 2 | 3, number> = { 1: 0.42, 2: -0.38, 3: 0.46 };

export class DomeEyePanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  n: 1 | 2 | 3;
  phase: EyePhase = 'aim';
  ox: number;
  oy: number;
  focus = 0;
  best: number;
  canMove = false;
  centeredT = 0;
  cues = new Cues();
  auto = false;
  /** the press that pushed the light away from the middle (for 「逆やん！」) */
  pushFrom = -1;
  away = false;
  private ePress = false;
  private keys = { u: false, d: false, l: false, r: false };
  private work: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
  private handleT = 0;
  private lastLevel = -1;

  constructor(n: 1 | 2 | 3) {
    this.n = n;
    [this.ox, this.oy] = START[n];
    this.best = BEST[n];
    // the focus starts out of the way, by a different amount each star
    this.focus = n === 2 ? 0.25 : -0.1;
  }

  take(): boolean {
    const v = this.ePress;
    this.ePress = false;
    return v;
  }

  dist(): number {
    return Math.hypot(this.ox, this.oy);
  }

  /** Blur level 0 (sharp) … 5. */
  level(): number {
    const d = Math.abs(this.focus - this.best);
    if (d < 0.06) return 0;
    return Math.min(BLUR_LEVELS - 1, 1 + Math.floor((d - 0.06) / 0.09));
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (input.pressed('confirm')) this.ePress = true;
    this.keys = { u: input.down('up'), d: input.down('down'), l: input.down('left'), r: input.down('right') };
    this.cues.update(dt);
    if (!this.canMove) return;
    if (this.phase === 'aim') {
      let vx = (this.keys.r ? 1 : 0) - (this.keys.l ? 1 : 0);
      let vy = (this.keys.d ? 1 : 0) - (this.keys.u ? 1 : 0);
      if (this.auto) {
        // QA: the light straight to the middle (the image follows the press: 上下左右 さかさま)
        vx = Math.abs(this.ox) > 1 ? -Math.sign(this.ox) : 0;
        vy = Math.abs(this.oy) > 1 ? -Math.sign(this.oy) : 0;
      }
      const any = vx !== 0 || vy !== 0;
      if (any) {
        const before = this.dist();
        // 上下左右 さかさま: turning the handle one way moves the image the same way across the field
        // (with a plain view it would drift the other way): the light goes where it is pushed
        this.ox = Math.max(-110, Math.min(110, this.ox + (vx * 34 * dt) / 1000));
        this.oy = Math.max(-110, Math.min(110, this.oy + (vy * 34 * dt) / 1000));
        if (this.pushFrom < 0) this.pushFrom = before;
        if (this.dist() > this.pushFrom + 10) this.away = true;
        this.handleT += dt;
        if (this.handleT > 90) {
          this.handleT = 0;
          sfx('se_dome_handle');
        }
      } else this.pushFrom = -1;
      if (this.dist() < 6) this.centeredT += dt;
      else this.centeredT = 0;
    } else if (this.phase === 'focus') {
      let v = (this.keys.r ? 1 : 0) - (this.keys.l ? 1 : 0);
      if (this.auto) v = Math.abs(this.best - this.focus) > 0.02 ? Math.sign(this.best - this.focus) : 0;
      if (v) {
        this.focus = Math.max(-1, Math.min(1, this.focus + (v * 0.5 * dt) / 1000));
        this.handleT += dt;
        if (this.handleT > 110) {
          this.handleT = 0;
          sfx('se_dome_focus');
        }
      }
      const lv = this.level();
      if (lv === 0 && this.lastLevel !== 0) sfx('se_dome_sharp');
      this.lastLevel = lv;
    }
  }

  draw(g: Gfx): void {
    if (this.phase === 'kane') {
      g.img(compoundEye(), 0, 0);
      return;
    }
    g.rect(0, 0, W, 216, '#05050A');
    const S = EYE.r * 2 + 1;
    this.work ??= makeCanvas(S, S);
    const [c, ctx] = this.work;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, S, S);
    const img = eyePatch(this.n)[this.level()];
    ctx.drawImage(img, Math.round(EYE.r + this.ox - PATCH / 2), Math.round(EYE.r + this.oy - PATCH / 2));
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(fieldMask(), 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    g.img(c, EYE.cx - EYE.r, EYE.cy - EYE.r);
    g.img(barrel(), 0, 0);
    // the middle (a guide for the game, not in the glass): a faint broken ring while aiming
    if (this.phase === 'aim') {
      const on = this.dist() < 6;
      for (let i = 0; i < 16; i += 2) {
        const a = (i / 16) * Math.PI * 2 + this.t * 0.0006;
        g.rect(Math.round(EYE.cx + Math.cos(a) * 11), Math.round(EYE.cy + Math.sin(a) * 11), 1, 1, on ? '#F6D98A' : '#5E6278');
      }
    }
    const text = T.DOME_WORD.tape(this.n);
    const tw = measure(text) + 16;
    drawTape(g, 8, 6, tw, 16, text, { seed: 3 });
    markText(8, 6, tw, 16);
    this.cues.draw(g, this.t);
  }
}

/**
 * Where the eyepiece's words go: right of the field at its middle height
 * (clear of the key guide at the bottom left and the tape at the top left);
 * on an iPad held sideways, higher if the right-hand buttons reach up there.
 */
function cueAt(): { x: number; y: number; align: 'left' } {
  const x = EYE.cx + EYE.r + 10;
  let y = EYE.cy - 8;
  if (hitsButtons(x, y, 110, 20)) y = 40;
  return { x, y, align: 'left' };
}

/** The eyepiece: aim (the handles), focus, look. Then what is seen, and グソっ君's eye for the Pleiades. */
function* eyeSession(n: 1 | 2 | 3): Co {
  const p = new DomeEyePanel(n);
  p.auto = qaAuto;
  yield* game.fadeOut(220);
  game.ui.push(p);
  yield* game.fadeIn(300);
  try {
    // ---- aim
    if (!p.auto) keyGuide([[['up', 'down', 'left', 'right'], T.DOME_WORD.aim]], 4800, 8);
    p.canMove = true;
    while (p.centeredT < 380) {
      if (p.away && !flag(DF.gyaku)) {
        setFlag(DF.gyaku, 1);
        p.canMove = false;
        yield 150;
        yield* runMsg(T.EYE_GYAKU);
        p.canMove = true;
        p.pushFrom = -1;
      }
      yield null;
    }
    p.canMove = false;
    yield* animate(220, (k) => {
      p.ox *= 1 - k;
      p.oy *= 1 - k;
    });
    p.ox = 0;
    p.oy = 0;
    p.cues.set('center', T.DOME_WORD.center, { ...cueAt(), tone: 'go', mode: 'still', scale: 1 });
    yield 500;
    p.cues.drop('center');
    if (!flag(DF.sakasama)) {
      setFlag(DF.sakasama, 1);
      yield* runMsg(T.EYE_SAKASAMA);
    }
    // ---- focus
    p.phase = 'focus';
    if (!p.auto) keyGuide([[['left', 'right'], T.DOME_WORD.focus], [[touchControlsOn() ? 'けってい' : 'Z'], T.DOME_WORD.look]], 4800, 8);
    p.take();
    p.canMove = true;
    let sharpT = 0;
    for (;;) {
      const sharp = p.level() === 0;
      if (sharp) p.cues.set('look', T.DOME_WORD.sharp, { ...cueAt(), tone: 'go', mode: 'beat', scale: 1, button: '見る！' });
      else p.cues.drop('look');
      if (p.auto) {
        if (sharp) sharpT += FRAME;
        if (sharpT > 300) break;
      } else if (p.take() && sharp) break;
      yield null;
    }
    p.canMove = false;
    p.cues.drop('look', 'go');
    p.phase = 'seen';
    yield 600;
    // ---- what is seen
    if (n === 1) yield* runMsg(T.SEE_VENUS);
    else if (n === 2) {
      yield* runMsg(T.SEE_ORION);
      yield* runMsg(T.SEE_ORION_KANE);
    } else {
      yield* runMsg(T.SEE_SUBARU);
      // グソっ君 looks: his eye, the field many times over
      yield* game.fadeOut(160, '#05050A');
      p.phase = 'kane';
      sfx('se_dome_eye');
      yield* game.fadeIn(200);
      yield 500;
      yield* runMsg(T.SEE_SUBARU_KANE);
      yield* game.fadeOut(160, '#05050A');
      p.phase = 'seen';
      yield* game.fadeIn(200);
    }
    yield* game.fadeOut(220);
  } finally {
    p.cues.clear();
    p.done = true;
    game.ui.remove(p);
  }
  yield* game.fadeIn(260);
}

// ---------------------------------------------------------------- the card (観望会 カード)

const CARD = { x: 16, y: 2, w: 352, h: 212 };
const INK = '#2A2440';
const OLD_PENCIL = '#8A8498';
const PENCIL = '#4A4460';
const RED = '#E23B2E';

interface CardOpts {
  /** answers already written */
  answers: number;
  /** write answer n now (char by char) */
  write?: 1 | 2 | 3;
  /** グソっ君's 『もっと』 beside the third answer: shown / written now */
  motto?: 'shown' | 'write';
  /** まつ先生's hanamaru: shown / drawn now */
  hana?: 'shown' | 'draw';
  /** wait for the button before closing (otherwise a short beat after the writing) */
  waitClose?: boolean;
}

export class KanboCardPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  o: CardOpts;
  /** characters of the answer being written */
  chars = 0;
  /** 0..1 of the motto / the hanamaru being drawn */
  motto = 0;
  hana = 0;
  inK = 0;
  private ePress = false;
  private stroke = hanamaruStroke(19);

  constructor(o: CardOpts) {
    this.o = o;
    if (o.motto === 'shown') this.motto = 1;
    if (o.hana === 'shown') this.hana = 1;
  }

  take(): boolean {
    const v = this.ePress;
    this.ePress = false;
    return v;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    this.inK = Math.min(1, this.inK + dt / 200);
    if (input.pressed('confirm')) this.ePress = true;
  }

  draw(g: Gfx): void {
    markTextScreen();
    g.rect(0, 0, W, 216, '#0B0B14', 0.72 * this.inK);
    const rise = Math.round((1 - ease.cubicOut(this.inK)) * 8);
    const x = CARD.x;
    const y = CARD.y + rise;
    g.alpha(this.inK, () => {
      // the card: cream paper, a soft shadow, a little curl at the corner
      g.rect(x + 3, y + 3, CARD.w, CARD.h, '#000000', 0.35);
      g.rect(x, y, CARD.w, CARD.h, '#FBF3DC');
      g.rect(x, y, CARD.w, 1, '#FFFFFF');
      g.rect(x + CARD.w - 1, y, 1, CARD.h, '#E8D9B5');
      g.rect(x, y + CARD.h - 1, CARD.w, 1, '#D8C8A0');
      g.rect(x + 1, y + 1, 1, CARD.h - 2, '#FFFFFF');
      // the print
      const L = (i: number) => y + 6 + i * 20;
      g.text(T.CARD.title, x + 12, L(0), { color: INK });
      g.text(T.CARD.nameLabel, x + 214, L(0), { color: INK });
      g.text(T.CARD.name, x + 270, L(0), { color: OLD_PENCIL });
      g.rect(x + 266, L(0) + 16, 64, 1, '#C8BCA0');
      // タクミ's little cloud by his name (the cloudy morning)
      this.cloud(g, x + 334, L(0) + 4);
      g.text(T.CARD.sub, x + 12, L(1), { color: INK });
      for (let i = 0; i < 3; i++) {
        const qy = y + 46 + i * 40;
        g.text(T.CARD.q[i], x + 12, qy, { color: INK });
        // the answer's box: a dotted line to write on
        for (let k = x + 28; k < x + CARD.w - 16; k += 3) g.rect(k, qy + 35, 1, 1, '#C8BCA0');
        this.answer(g, (i + 1) as 1 | 2 | 3, x + 28, qy + 18);
      }
      g.text(T.CARD.foot, x + 12, y + 166, { color: INK });
      g.text(T.CARD.teacher, x + 12, y + 188, { color: RED });
      // まつ先生's hanamaru, beside his note
      if (this.hana > 0) {
        const n = Math.floor(this.stroke.length * this.hana);
        const hx = x + 296;
        const hy = y + 182;
        for (let i = 0; i < n; i++) {
          const [px, py] = this.stroke[i];
          g.rect(hx + px, hy + py, 2, 2, RED);
        }
      }
    });
  }

  private cloud(g: Gfx, x: number, y: number): void {
    const pts = [
      [0, 4], [1, 2], [3, 1], [5, 0], [7, 1], [8, 2], [10, 2], [11, 4], [10, 6], [1, 6], [3, 6], [5, 6], [7, 6], [9, 6],
    ];
    for (const [dx, dy] of pts) g.rect(x + dx, y + dy, 1, 1, OLD_PENCIL);
  }

  private answer(g: Gfx, n: 1 | 2 | 3, x: number, y: number): void {
    const written = n <= this.o.answers;
    const now = this.o.write === n;
    if (!written && !now) return;
    let tx = x;
    if (n === 1) {
      if (written || this.chars > 0) g.img(halfMoon(), x, y + 2);
      tx = x + 20;
    }
    const s = T.CARD.a[n - 1];
    const shown = written ? s : [...s].slice(0, Math.max(0, this.chars - (n === 1 ? 1 : 0))).join('');
    g.text(shown, tx, y, { color: PENCIL });
    if (n === 3 && this.motto > 0) {
      // グソっ君's 『もっと』: wobbly, a lighter lead, a char at a time
      const m = [...T.CARD.motto];
      const k = Math.ceil(m.length * this.motto);
      let mx = tx + measure(s) + 10;
      for (let i = 0; i < k; i++) {
        const wob = [1, -1, 2][i % 3];
        g.text(m[i], mx, y + wob, { color: '#6A6484' });
        mx += measure(m[i]) + 1;
      }
    }
  }
}

/** Show the card: an answer written, グソっ君's word, the hanamaru drawn; then it goes. */
function* showCard(o: CardOpts): Co {
  const p = new KanboCardPanel(o);
  game.ui.push(p);
  sfx('se_dome_card');
  try {
    yield 360;
    if (o.write) {
      const s = T.CARD.a[o.write - 1];
      const total = [...s].length + (o.write === 1 ? 1 : 0);
      for (let i = 1; i <= total; i++) {
        p.chars = i;
        if (i % 2 === 1) sfx('se_pen_write', { vol: 0.6 });
        yield 110;
      }
      p.o.answers = Math.max(p.o.answers, o.write);
      p.o.write = undefined;
      yield 300;
    }
    if (o.motto === 'write') {
      for (let i = 1; i <= 3; i++) {
        p.motto = i / 3;
        sfx('se_wakime_legs', { vol: 0.5 });
        yield 260;
      }
      yield 300;
    }
    if (o.hana === 'draw') {
      sfx('se_pen_write');
      yield* animate(1300, (k) => (p.hana = k), ease.linear);
      p.hana = 1;
      sfx('se_stamp_light', { vol: 0.5 });
      yield 500;
    }
    if (o.waitClose && !qaAuto) {
      p.take();
      yield () => p.take();
    } else yield 700;
    yield* animate(160, (k) => (p.inK = 1 - k));
  } finally {
    p.done = true;
    game.ui.remove(p);
  }
}

// ---------------------------------------------------------------- the scripts

/** まつ先生 (npcs.ts asks here first at stage 2): 〔dome〕, 〔kanbo〕, the after line, the reminder. True when one was said. */
export function* domeAtFumi(): Co<boolean> {
  if (hStage() !== 2 || flag('flag_ch2_boss_beaten')) return false;
  if (!flag(DF.key)) {
    setFlag(DF.key, 1);
    if (!flag(DF.az)) setFlag(DF.az, 180);
    yield* runMsg(T.DOME_KEY);
    yield* getKeyItem(ITEM_KEY, T.DOME_KEY_GET);
    yield* runMsg(T.DOME_KEY_KANE);
    return true;
  }
  if (flag(DF.n) >= 3 && !flag(DF.report)) {
    yield* kanboReport();
    return true;
  }
  if (flag(DF.report) && !flag(DF.after)) {
    setFlag(DF.after, 1);
    yield* runMsg(T.KANBO_AFTER);
    return true;
  }
  if (!flag(DF.report) && !flag(DF.wait)) {
    setFlag(DF.wait, 1);
    yield* runMsg(T.DOME_FUMI_WAIT);
    return true;
  }
  return false;
}

/** 〔kanbo〕: the card shown, the red pen's hanamaru, the card kept for タクミ, 朱肉 +2, the konpeito. */
function* kanboReport(): Co {
  const f = field();
  const p = f?.player;
  yield* runMsg(T.KANBO_REPORT_A);
  if (p) poseIf(p, 'give');
  yield 300;
  yield* showCard({ answers: 3, motto: 'shown', waitClose: true });
  if (p) unpose(p);
  yield* runMsg(T.KANBO_REPORT_B);
  // the red pen from his breast pocket: the hanamaru beside 『つぎの 晴れた 朝に。』
  yield* showCard({ answers: 3, motto: 'shown', hana: 'draw' });
  setFlag(DF.report, 1);
  removeItem(ITEM_CARD_DONE);
  removeItem(ITEM_CARD);
  yield* runMsg(T.KANBO_REPORT_C);
  addMp(2);
  sfx('se_item');
  yield* runMsg(T.KANBO_REWARD);
  yield* runMsg(flag('flag_ch2_find_fumi_konpeito') ? T.KANBO_KONPEITO_FOUND : T.KANBO_KONPEITO_TELL);
}

// ---- 星見の丘：扉と 小窓

registerScript('obj_hoshi_dome', function* (ctx): Co {
  if (flag(DF.key) && !flag('flag_ch2_boss_beaten')) {
    // with the key: straight in (as pushing into the door does)
    sfx('se_examine');
    yield* runMsg(T.DOME_DOOR_OPEN);
    // (warpCo runs the room's enter scripts itself: evt_dome_enter)
    yield* F().warpCo('map_hoshi_dome', 6, 8, 'up', ['se_dome_unlock', 'se_dome_door'], 'map_hoshi_hill');
    return;
  }
  yield* ctx.runDefault();
  if (hStage() === 2 && !flag('flag_ch2_boss_beaten') && !flag(DF.hint)) {
    setFlag(DF.hint, 1);
    yield* runMsg(T.DOME_DOOR_HINT);
  }
});

registerScript('obj_hr_dome_mado', function* (ctx): Co {
  if (flag(DF.cover)) {
    sfx('se_examine');
    yield* runMsg(T.DOME_MADO_OPEN);
    return;
  }
  yield* ctx.runDefault();
});

// ---- 天文台の中

registerScript('evt_dome_enter', function* (): Co {
  if (flag(DF.enter)) return;
  setFlag(DF.enter, 1);
  yield 300;
  yield* runMsg(T.DOME_ENTER);
});

registerScript('obj_dome_scope', function* (): Co {
  sfx('se_examine');
  if (!flag(DF.cover)) {
    const c = yield* runMsg(T.SCOPE_COVER);
    if (c !== 0) return;
    setFlag(DF.cover, 1);
    sfx('se_dome_cover');
    puff(6 * 16, 3 * 16 + 8, '#ECE8DC');
    puff(5 * 16, 3 * 16, '#ECE8DC');
    puff(7 * 16, 4 * 16, '#ECE8DC');
    yield* runMsg(T.SCOPE_COVER_OFF);
    // タクミ's card, out of the cover's folds
    yield* showCard({ answers: 0, waitClose: true });
    yield* runMsg(T.SCOPE_CARD);
    yield* getKeyItem(ITEM_CARD, T.SCOPE_CARD_GET);
    yield* runMsg(T.SCOPE_CARD_KANE);
    return;
  }
  const done = flag(DF.n);
  if (done >= 3) {
    yield* runMsg(T.SCOPE_DONE);
    return;
  }
  const n = (done + 1) as 1 | 2 | 3;
  if (!flag(DF.slit)) {
    yield* runMsg(T.SCOPE_SHUT);
    if (!flag(DF.shutKane)) {
      setFlag(DF.shutKane, 1);
      yield* runMsg(T.SCOPE_SHUT_KANE);
    }
    return;
  }
  if (!domeOn(n)) {
    yield* runMsg(n === 1 ? T.SCOPE_WRONG_1 : T.SCOPE_WRONG);
    return;
  }
  if (!flag(DF.cap)) {
    const c = yield* runMsg(T.SCOPE_CAP);
    if (c === 1) yield* runMsg(T.SCOPE_CAP_PEEK);
    sfx('se_dome_cap');
    setFlag(DF.cap, 1);
    yield* runMsg(T.SCOPE_CAP_OFF);
  }
  setFlag(DF.aim, n);
  yield* runMsg(T.SCOPE_AIM[n]);
  yield* eyeSession(n);
  // the card: this star's answer (and グソっ君's 『もっと』 for the Pleiades)
  yield* showCard({ answers: n - 1, write: n, motto: n === 3 ? 'write' : undefined });
  setFlag(DF.n, n);
  if (n === 1) yield* runMsg(T.SEE_VENUS_KANE);
  if (n === 3) {
    yield* runMsg(T.SEE_SUBARU_MOTTO);
    removeItem(ITEM_CARD);
    giveKey(ITEM_CARD_DONE);
    yield* runMsg(T.ALL_DONE);
  } else yield* runMsg(T.NEXT_KANE[n as 1 | 2]);
});

registerScript('obj_dome_crank_slit', function* (): Co {
  sfx('se_examine');
  if (flag(DF.slit)) {
    yield* runMsg(T.CRANK_SLIT_DONE);
    return;
  }
  const c = yield* runMsg(T.CRANK_SLIT);
  if (c !== 0) return;
  yield* skySession('slit', 0);
});

registerScript('obj_dome_crank_rot', function* (): Co {
  sfx('se_examine');
  if (!flag(DF.slit)) {
    yield* runMsg(T.CRANK_ROT_SHUT);
    return;
  }
  const done = flag(DF.n);
  if (done >= 3) {
    yield* runMsg(T.CRANK_ROT_DONE);
    return;
  }
  const c = yield* runMsg(T.CRANK_ROT);
  if (c !== 0) return;
  const n = (done + 1) as 1 | 2 | 3;
  // the card's next star (none until the card is found: then the dome only turns)
  yield* skySession('rot', flag(DF.cover) ? n : 0);
});

registerScript('obj_dome_note', function* (): Co {
  sfx('se_examine');
  if (flag('flag_seen_obj_dome_note')) {
    yield* runMsg(T.NOTE_AGAIN);
    return;
  }
  setFlag('flag_seen_obj_dome_note', 1);
  yield* runMsg(T.NOTE);
});

registerScript('obj_dome_hayami', function* (): Co {
  sfx('se_examine');
  yield* runMsg(T.HAYAMI);
});

registerScript('obj_dome_light', function* (): Co {
  sfx('se_examine');
  yield* runMsg(T.LIGHTBOX);
  if (!flag(DF.lightKane)) {
    setFlag(DF.lightKane, 1);
    yield* runMsg(T.LIGHTBOX_KANE);
  }
});

registerScript('obj_dome_isu', function* (): Co {
  sfx('se_examine');
  yield* runMsg(T.CHAIRS);
});

registerScript('obj_dome_photo', function* (): Co {
  sfx('se_examine');
  yield* runMsg(T.PHOTO);
});

/**
 * グソっ君 in the small round room often stands right beside Minato, and a
 * press meant for what is in front (the telescope, a crank) reaches him
 * first (the field asks the actors before the objects). In this room the
 * thing in front wins: its script runs; facing nothing, his ordinary line.
 */
registerScript('kanenari_map_hoshi_dome', function* (ctx): Co {
  const f = field();
  if (f) {
    const [tx, ty] = f.facingTile();
    const o = f.objectAt(tx, ty, f.player.dir);
    const fn = o ? getScript(o.script ?? o.id) : undefined;
    if (o && fn) {
      yield* fn({ ...ctx, source: o.id, runDefault: function* () {} });
      return;
    }
  }
  yield* ctx.runDefault();
});

// ---------------------------------------------------------------- the ending (カット3, ending.ts)

/**
 * カット3 の 転回場, before anything is said: the key goes back quietly; with
 * the card shown to まつ先生 he stands beside さんかど, east of him under the
 * bus's back (38,43), instead of (29,42).
 */
export function kanboEndSetup(fumi: { x: number; y: number; dir: string } | null | undefined): void {
  removeItem(ITEM_KEY);
  removeItem(ITEM_CARD);
  removeItem(ITEM_CARD_DONE);
  if (!flag(DF.report) || !fumi) return;
  fumi.x = 38 * 16 + 8;
  fumi.y = 43 * 16 + 16;
  fumi.dir = 'left';
}

/** The cue after 「はっち先生に、よろしく。」: the envelope for タクミ handed to さんかど (only with the card shown). */
export function* kanboAtBus(): Co {
  if (!flag(DF.report)) return;
  const f = field();
  const fumi = f?.actorById('end_npc_hoshi_fumi');
  const sankado = f?.actorById('end_npc_hoshi_busdriver');
  if (fumi) {
    fumi.dir = 'left';
    poseIf(fumi, 'give');
  }
  if (sankado) sankado.dir = 'right';
  yield 250;
  sfx('se_dome_card');
  if (sankado) sankado.hop(1, 140);
  yield 250;
  yield* runMsg(T.KANBO_END);
  if (fumi) unpose(fumi);
  if (sankado) sankado.dir = 'left';
}

// ---------------------------------------------------------------- the room's little life: dust in the light, a moth

const moth = { a: 0, t: 0 };
const motes = Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, r: 10 + ((i * 7) % 30), s: 0.2 + ((i * 13) % 10) / 30, y: (i * 11) % 24 }));

registerWorldFx({
  map: 'map_hoshi_dome',
  update(_f, dt) {
    moth.t += dt;
    moth.a += dt * 0.0042;
  },
  draw(f, g, cx, cy, layer) {
    if (layer !== 'glow') return;
    const p = f.player;
    if (!p.visible) return;
    let lx = p.x;
    let ly = p.y - 16;
    const li = lanternOf(p.frame());
    if (li) {
      lx = p.x + li.dx;
      ly = p.y + li.dy;
    }
    const sx = Math.round(lx - cx);
    const sy = Math.round(ly - cy);
    // the dust drifting in the lantern's light (10 years of it, stirred up)
    for (const m of motes) {
      const a = m.a + moth.t * 0.0003 * m.s;
      const x = sx + Math.round(Math.cos(a) * m.r);
      const y = sy + Math.round(Math.sin(a * 1.3) * 10) - ((Math.floor(moth.t * 0.01 * m.s) + m.y) % 30) + 12;
      g.rect(x, y, 1, 1, '#FFE7C0', 0.35 + 0.25 * Math.sin(moth.t * 0.003 + m.a));
    }
    // the moth circling the light, two wing frames
    const mx = sx + Math.round(Math.cos(moth.a) * 13);
    const my = sy - 6 + Math.round(Math.sin(moth.a * 2) * 5);
    const up = Math.floor(moth.t / 70) % 2 === 0;
    g.rect(mx, my, 1, 2, '#8A6A50');
    g.rect(mx - 2, my + (up ? -1 : 0), 2, up ? 2 : 1, '#E8D8B0', 0.85);
    g.rect(mx + 1, my + (up ? -1 : 0), 2, up ? 2 : 1, '#E8D8B0', 0.85);
  },
});

// ---------------------------------------------------------------- QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/** Flags up to (not including) star n: the card found, the slit open, the dome on star n, the cap off. */
function setUpTo(n: 1 | 2 | 3, onTarget = true): void {
  setFlag(DF.key, 1);
  setFlag(DF.enter, 1);
  setFlag(DF.cover, 1);
  setFlag(DF.slit, 1);
  setFlag(DF.cap, 1);
  setFlag(DF.gyaku, 1);
  setFlag(DF.sakasama, 1);
  setFlag(DF.n, n - 1);
  setFlag(DF.aim, n - 1);
  setFlag(DF.az, onTarget ? Math.round(tgt(n).az) : 180);
  giveKey(ITEM_KEY);
  giveKey(ITEM_CARD);
}

/**
 * QA: __game.cmd.dome(step = 'in', o)
 *   'key'     stage 2, in front of まつ先生 (47,3): the next talk is 〔dome〕
 *   'door'    the key: on the hill in front of the door (4,6)
 *   'in'      the key: inside at the door (6,8) (o.enter: the first-entry lines too)
 *   'cover'   inside below the telescope (5,6), the cover still on
 *   'slit'    the card found: at the slit's crank (1,3); o.play opens the screen
 *   'rot'     the slit open: at the dome's crank (1,5); o.n = the card's star 1–3; o.play
 *   'eye'     everything ready for star o.n (1–3): below the telescope; o.play starts the eyepiece (o.fresh: as the first time)
 *   'sky'     the look-up screen alone (o.mode 'slit' | 'rot', o.n)
 *   'card'    the card alone (o.n answers written, o.hana, o.motto)
 *   'report'  all three seen: in front of まつ先生 (the next talk is 〔kanbo〕)
 *   'end'     reported: the ending's cut 3 (the envelope for タクミ); o.cut 1: the hill at dawn (the slit open)
 *   'reset'   the flags back to nothing
 * o.auto: the minigames play themselves.
 */
registerDebug('dome', (step = 'in', o: { n?: number; play?: boolean; auto?: boolean; mode?: SkyMode; hana?: boolean; motto?: boolean; enter?: boolean; fresh?: boolean; cut?: number } = {}) => {
  const all = Object.values(DF);
  if (step === 'reset') {
    for (const f of all) setFlag(f, 0);
    setFlag('flag_seen_obj_dome_note', 0);
    for (const id of [ITEM_KEY, ITEM_CARD, ITEM_CARD_DONE]) removeItem(id);
    return 'dome: reset';
  }
  qaAuto = !!o.auto;
  const n = Math.max(1, Math.min(3, Number(o.n ?? 1))) as 1 | 2 | 3;
  const answers = Math.max(0, Math.min(3, Number(o.n ?? 0)));
  if (step === 'sky' || step === 'card') {
    field()?.startScript(
      (function* (): Co {
        yield 200;
        if (step === 'sky') yield* skySession(o.mode ?? 'rot', o.mode === 'slit' ? 0 : n);
        else yield* showCard({ answers, hana: o.hana ? 'shown' : undefined, motto: o.motto ? 'shown' : undefined, waitClose: true });
      })(),
    );
    return `dome: ${step}`;
  }
  // stage 2 in front of まつ先生 (CHAIN2 'dome'); the hill's own first lines are not what is looked at here
  cmd().jump?.('ch2:dome', true);
  for (const f of all) setFlag(f, 0);
  setFlag('flag_ch2_hill_enter', 1);
  setFlag('flag_ch2_hill_top', 1);
  if (step === 'key') {
    cmd().warp?.('map_hoshimidai', 47, 3, 'up');
    return 'dome: talk to まつ先生 (Z)';
  }
  setFlag(DF.key, 1);
  setFlag(DF.az, 180);
  giveKey(ITEM_KEY);
  if (step === 'door') {
    cmd().warp?.('map_hoshi_hill', 4, 6, 'up');
    return 'dome: push up into the door';
  }
  if (step === 'in' || step === 'cover') {
    if (!o.enter) setFlag(DF.enter, 1);
    if (step === 'in') cmd().warp?.('map_hoshi_dome', 6, 8, 'up');
    else cmd().warp?.('map_hoshi_dome', 5, 6, 'up');
    return `dome: ${step}`;
  }
  if (step === 'slit') {
    setFlag(DF.enter, 1);
    setFlag(DF.cover, 1);
    giveKey(ITEM_CARD);
    cmd().warp?.('map_hoshi_dome', 1, 3, 'left');
    if (o.play) field()?.startScript((function* (): Co { yield 400; yield* skySession('slit', 0); })());
    return 'dome: the slit (Z)';
  }
  if (step === 'rot') {
    setUpTo(n, false);
    cmd().warp?.('map_hoshi_dome', 1, 5, 'left');
    if (o.play) field()?.startScript((function* (): Co { yield 400; yield* skySession('rot', n); })());
    return `dome: turn to star ${n}`;
  }
  if (step === 'eye') {
    setUpTo(n, true);
    // o.fresh: as the first time (「逆やん！」 and 「さかさま らしい」 still to come)
    if (o.fresh) {
      setFlag(DF.gyaku, 0);
      setFlag(DF.sakasama, 0);
    }
    cmd().warp?.('map_hoshi_dome', 5, 6, 'up');
    if (o.play)
      field()?.startScript(
        (function* (): Co {
          yield 400;
          setFlag(DF.aim, n);
          yield* eyeSession(n);
        })(),
      );
    return `dome: the eyepiece, star ${n}`;
  }
  setUpTo(3, true);
  setFlag(DF.n, 3);
  setFlag(DF.aim, 3);
  removeItem(ITEM_CARD);
  giveKey(ITEM_CARD_DONE);
  if (step === 'report') {
    cmd().warp?.('map_hoshimidai', 47, 3, 'up');
    return 'dome: talk to まつ先生 (Z) — 〔kanbo〕';
  }
  setFlag(DF.report, 1);
  removeItem(ITEM_CARD_DONE);
  if (step === 'after') {
    cmd().warp?.('map_hoshimidai', 47, 3, 'up');
    return 'dome: reported';
  }
  if (step === 'end') {
    // keep the flags through the ending's jump
    const keep = Object.fromEntries(all.map((f) => [f, flag(f)]));
    const cut = Number(o.cut ?? 3);
    cmd().endcut2?.(cut);
    for (const [f, v] of Object.entries(keep)) setFlag(f, v);
    return `dome: cut ${cut}`;
  }
  return `dome: unknown step ${step}`;
});

/** QA (tools/playthrough.mjs --side dome): the next minigames play themselves (until domeAuto(false)). */
registerDebug('domeAuto', (on = true) => {
  qaAuto = !!on;
  return `dome auto ${qaAuto}`;
});

/** QA: the screens' state now (null when none is up). */
registerDebug('domeState', () => {
  const ws = game.ui.widgets;
  const sky = ws.find((w) => w instanceof DomeSkyPanel) as DomeSkyPanel | undefined;
  const eye = ws.find((w) => w instanceof DomeEyePanel) as DomeEyePanel | undefined;
  const card = ws.find((w) => w instanceof KanboCardPanel) as KanboCardPanel | undefined;
  return {
    flags: Object.fromEntries(Object.entries(DF).map(([k, f]) => [k, flag(f)])),
    items: [ITEM_KEY, ITEM_CARD, ITEM_CARD_DONE].filter((id) => hasItem(id)),
    sky: sky ? { mode: sky.mode, az: Math.round(sky.az), shutter: +sky.shutter.toFixed(2), target: sky.target, stopped: sky.stopped } : null,
    eye: eye ? { n: eye.n, phase: eye.phase, ox: Math.round(eye.ox), oy: Math.round(eye.oy), focus: +eye.focus.toFixed(2), level: eye.level() } : null,
    card: card ? { answers: card.o.answers, hana: card.hana } : null,
    targets: ([1, 2, 3] as const).map((k) => ({ n: k, ...tgt(k) })),
  };
});

/** QA: the telescope's pictures (cover, cap, open × aims) as a PNG data URL. */
registerDebug('domeSheet', (scale = 2) => scopeSheet(Number(scale)).toDataURL());

/**
 * QA (wrapCheck asks it too): the pages (3 lines × 336 px), the words on the
 * screens (one line, inside their places) and the card's lines (inside the card).
 */
export function domeTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const lineW = (l: string) => measure(l.replace(/\{[^}]*\}/g, ''));
  for (const [name, src] of Object.entries(T.DOME_PAGES)) {
    let lines: string[] = [];
    const flush = () => {
      if (!lines.length) return;
      pages++;
      if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
      for (const l of lines) if (lineW(l) > 336) bad.push(`${name}: ${lineW(l)}px: ${l}`);
      lines = [];
    };
    for (const raw of src.split('\n')) {
      const t = raw.trim();
      if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!')) {
        flush();
        continue;
      }
      if (t) lines.push(raw);
    }
    flush();
  }
  const words: [string, string, number][] = [
    ['aim', T.DOME_WORD.aim, 200],
    ['focus', T.DOME_WORD.focus, 200],
    ['look', T.DOME_WORD.look, 200],
    ['center', T.DOME_WORD.center, 240],
    ['mash', T.DOME_WORD.mash, 120],
    ['rot', T.DOME_WORD.rot, 200],
    ['back', T.DOME_WORD.back, 200],
    ['sharp', T.DOME_WORD.sharp, 120],
    ['gi', T.DOME_WORD.gi, 120],
    ['goro', T.DOME_WORD.goro, 120],
  ];
  for (const n of [1, 2, 3] as const) words.push([`tape${n}`, T.DOME_WORD.tape(n), 260]);
  for (const s of T.DOME_WORD.star) words.push([`star ${s}`, s, 200]);
  for (const [name, text, max] of words) {
    pages++;
    const w = measure(text);
    if (w > max || text.includes('\n')) bad.push(`word ${name}: ${w}px > ${max}: ${text}`);
  }
  // the card: every printed line within the card (352 − 24), the answers from their indent
  const card: [string, string, number][] = [
    ['title+name', T.CARD.title, 190],
    ['sub', T.CARD.sub, 328],
    ['foot', T.CARD.foot, 328],
    ['teacher', T.CARD.teacher, 270],
  ];
  T.CARD.q.forEach((q, i) => card.push([`q${i + 1}`, q, 328]));
  card.push(['a1', T.CARD.a[0], 352 - 48 - 16]);
  card.push(['a2', T.CARD.a[1], 352 - 28 - 16]);
  card.push(['a3+motto', T.CARD.a[2] + '　' + T.CARD.motto, 352 - 28 - 16]);
  for (const [name, text, max] of card) {
    pages++;
    const w = measure(text);
    if (w > max) bad.push(`card ${name}: ${w}px > ${max}: ${text}`);
  }
  return { pages, bad };
}
registerDebug('domeText', () => domeTextCheck());
