// 赤子 泣いても（第2章。げむきか 10/17 の 案4、2026-10-17 依頼主の 採用。02_ch2_index #105）。
// 文は data/text/hoshi_hagama.ts、みました帳の ページは ui/menu/book_hagama.ts。かまど・水がめ・囲炉裏は 今の
// ペロの 家（data/maps/hoshi_rooms2.ts の kominka）の まま。
//
//   段階1〜2（トマトの 灯り）。「第2章から」でも 全部 遊べる。グソっ君が いなくても 進む（グソっ君の 台詞は 抜く。
//   火吹き竹は しゅんが 吹く）。
//   ・ペロの 家の かまど obj_hr_kominka_kamado を 2回 調べる（flag_hg_look。2回目に グソっ君の 1行）
//     → 3号ハウスの 前の ペロに 話す → 2 ペロの 頼み → 土間へ（ペロは イベントの 歩き。終わると 外へ）。
//   ・3 その場で 米を 研ぐ → 水加減（大写し「羽釜の 中」MizuPanel：手首の しわまで）→ 半時間ほど つけて 待つ
//     （依頼主 2026-10-17：米は 長く 水に つけない。研いだら 半時間ほど）→ 火種（火ばさみと 薪は ペロ）。
//   ・4 はじめ ちょろちょろ（大写し「かまど」HiPanel）：① ちょろちょろ ② ぱっぱ（足す・吹く）③ ジュウジュウ
//     ふいたら 引く ④ パチパチで わら ⑤ 蒸らし（何も 押さない）。
//   ・5 おこげ・6 ごほうび：おにぎり 3つ（item_hg_onigiri）、朱肉 +2、みました帳②の すみ（flag_hg_done）。
//     炊きあがり（かため・ちょうど・やわらかめ）と おこげ（なし・うすい・きつね色・こげ）の いちばん よかった 物が
//     ページに 残る（flag_hg_best_kama・flag_hg_best_okoge）。
//   ・かくし：縁側の 梅干しを 取っていれば 塩むすび。きつね色 → ツガオ便の 分（item_hg_bin）を 転回場の
//     ヒロスケへ（第2章の 表の 顔。ツガオは 寝たまま。1回）。
//   ・2回目から：かまどを 調べて から ペロに 話すと「もう 1回、炊くかい」。
//   ・クリア後の 夜（段階は h1）：ペロは クリア後の 会話が 包むので、hagama_pg.ts が その 上から 先に 呼ぶ。
//     朝が 来ないの 台詞は 第2章の 夜だけ。
//
// QA：__game.cmd.hagama(step, auto, stage)、hgState()、hgText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { addItem, flag, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { despawn, registerScript, spawn, walk } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { drawTape, drawWindow, UI } from '../../ui/window';
import * as T from '../../data/text/hoshi_hagama';
import { HG_UI } from '../../data/text/hoshi_hagama';
import { addMp, F, getKeyItem } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from './compat';
import { hStage, lanternOn } from './common';

export const HF = {
  look: 'flag_hg_look',
  start: 'flag_hg_start',
  done: 'flag_hg_done',
  n: 'flag_hg_n',
  bestKama: 'flag_hg_best_kama',
  bestOkoge: 'flag_hg_best_okoge',
  bin: 'flag_hg_bin',
  binDone: 'flag_hg_bin_done',
  shio: 'flag_hg_shio',
  again: 'flag_hg_again',
  peroAfter: 'flag_hg_pero_after',
  shinSaid: 'flag_hg_shin_said',
  fukiSaid: 'flag_hg_fuki_said',
} as const;

const KOMINKA = 'map_hoshi_kominka';
type Kama = 'kata' | 'chodo' | 'yawa';
type Okoge = 'nashi' | 'usui' | 'kitsune' | 'koge';
const { KAMA_RANK, OKOGE_RANK } = T;

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
  if (!t.trim()) return 0;
  return yield* runMsg(t);
}

function onMap(id: string): boolean {
  return field()?.map.id === id;
}

/** 寄り道が 開いている：段階1〜2、トマトの 灯り（クリア後の 夜も）。 */
function open(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn();
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

// ================================================================ 大写しの 共通

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
const RX = SX + 210;
const KEYS_Y = 60;

abstract class HgPanel implements Widget {
  modal = true;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  active = false;
  result: string | null = null;
  protected ePress = false;
  protected eCancel = false;
  abstract place: string;
  abstract keys(): string[];
  abstract drawScene(g: Gfx, oy: number): void;
  abstract drawSide(g: Gfx, oy: number): void;
  abstract step(dt: number, input: Input): void;

  clearInput(): void {
    this.ePress = false;
    this.eCancel = false;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (input.pressed('confirm')) this.ePress = true;
    if (input.pressed('cancel')) this.eCancel = true;
    if (!this.active || this.result) return;
    if (this.eCancel) {
      this.eCancel = false;
      this.result = 'cancel';
      return;
    }
    this.step(dt, input);
  }

  draw(g: Gfx): void {
    if (this.open <= 0) return;
    const k = ease.cubicOut(Math.min(1, this.open));
    const a = Math.min(1, this.open * 1.4);
    const dy = Math.round((1 - k) * -10);
    markText(PX, PY, PW, PH);
    drawWindow(g, PX, PY + dy, PW, PH, UI, a, { curl: false });
    g.alpha(a, () => {
      g.clip(SX, SY + dy, CW, CH, () => {
        const oy = SY + dy;
        g.clip(SX, oy, RX - SX - 4, CH, () => this.drawScene(g, oy));
        g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
        this.drawSide(g, oy);
        if (this.active) this.keys().forEach((l, i) => g.text(l, RX, oy + KEYS_Y + i * 16, { color: '#FFE7A3' }));
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(this.place) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, this.place, { seed: 66 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }
}

/** 羽釜（黒い 鉄の 釜。つば と 木の ふた）。cx は 中心、top は ふちの 高さ、bot は 底。 */
function drawKama(g: Gfx, cx: number, top: number, bot: number, cut: boolean): void {
  const half = (y: number) => Math.round(54 - ((y - top) / (bot - top)) ** 2 * 18);
  for (let y = top; y <= bot; y++) {
    const h = half(y);
    g.rect(cx - h, y, h * 2, 1, '#2A2A32');
    if (!cut) g.px(cx - h + 3, y, '#4A4A56');
  }
  // the flange (つば) round its middle
  const ty = top + 12;
  g.rect(cx - 64, ty, 128, 4, '#3A3A44');
  g.rect(cx - 64, ty, 128, 1, '#5A5A66');
  if (cut) {
    // the inside, cut away (the dark of the iron inside)
    for (let y = top + 4; y <= bot - 4; y++) {
      const h = half(y) - 4;
      g.rect(cx - h, y, h * 2, 1, '#151418');
    }
  }
}

// ================================================================ 水加減（大写し「羽釜の 中」）

const MZ_CX = SX + 104;
const MZ_TOP = 22;
const MZ_BOT = 104;
/** 米の 上の 面（窓の 上から）、手首の しわの 高さ（米の 上から px）。 */
const RICE_TOP = 78;
const WRIST = 10;

export class MizuPanel extends HgPanel {
  place = HG_UI.placeMizu;
  /** 米の 上の 水の 高さ（px）。 */
  lv = 0;
  pour = 0;
  scoop = 0;
  autoT = 0;

  keys(): string[] {
    return HG_UI.keysMizu;
  }

  step(dt: number, input: Input): void {
    const s = dt / 1000;
    let dir = 0;
    if (this.auto) {
      this.autoT += dt;
      dir = this.lv < WRIST - 0.5 ? 1 : this.lv > WRIST + 0.5 ? -1 : 0;
      if (!dir && this.autoT > 400) this.result = 'kime';
    } else {
      if (input.down('right')) dir = 1;
      else if (input.down('left')) dir = -1;
      if (this.ePress) {
        this.ePress = false;
        this.result = 'kime';
        return;
      }
    }
    this.pour = dir > 0 ? Math.min(1, this.pour + s * 5) : Math.max(0, this.pour - s * 5);
    this.scoop = dir < 0 ? Math.min(1, this.scoop + s * 5) : Math.max(0, this.scoop - s * 5);
    if (dir) {
      this.lv = Math.max(0, Math.min(30, this.lv + dir * s * 7));
      if (Math.floor(this.t / 260) !== Math.floor((this.t - dt) / 260)) se('se_h_yunomi_pour', { vol: 0.25, pitch: dir > 0 ? 1 : 0.8 });
    }
  }

  /** 決めた 水の 判定。 */
  judge(): Kama | 'ooi' | 'sukunai' {
    const d = this.lv - WRIST;
    if (d > 6) return 'ooi';
    if (d < -6) return 'sukunai';
    if (d > 2) return 'yawa';
    if (d < -2) return 'kata';
    return 'chodo';
  }

  drawScene(g: Gfx, oy: number): void {
    // the earthen floor's dark, the lamp's warmth
    g.rect(SX, oy, RX - SX - 4, CH, '#2A2018');
    for (let r = 60; r > 0; r -= 10) g.alpha(0.03, () => g.circle(MZ_CX, oy + 40, r, '#FFB070'));
    drawKama(g, MZ_CX, oy + MZ_TOP, oy + MZ_BOT, true);
    const rt = oy + RICE_TOP;
    const half = (y: number) => Math.round(54 - ((y - oy - MZ_TOP) / (MZ_BOT - MZ_TOP)) ** 2 * 18) - 4;
    // the rice
    for (let y = rt; y <= oy + MZ_BOT - 4; y++) {
      const h = half(y);
      g.rect(MZ_CX - h, y, h * 2, 1, '#E8E4D8');
      for (let x = MZ_CX - h + ((y * 3) % 5); x < MZ_CX + h; x += 5) g.px(x, y, '#C8C2B4');
    }
    // the water: over the rice up to its level
    const wl = Math.round(rt - this.lv);
    g.alpha(0.42, () => {
      for (let y = wl; y <= oy + MZ_BOT - 4; y++) {
        const h = half(y);
        g.rect(MZ_CX - h, y, h * 2, 1, '#4A8AC8');
      }
    });
    // しゅん's hand flat on the rice (the fingers to the left), the wrist, the arm up out over the rim;
    // under the water the skin goes a little blue
    const hx0 = MZ_CX - 28;
    const hx1 = MZ_CX + 12;
    const skinAt = (y: number) => (y >= wl ? '#C8B8B0' : '#F2C8A0');
    const skinDk = '#B88A6A';
    for (let y = rt - 6; y < rt; y++) g.rect(hx0, y, hx1 - hx0, 1, skinAt(y));
    for (let k = 0; k < 4; k++) g.rect(hx0 - 9, rt - 5 + k + (k > 1 ? 1 : 0), 9, 1, skinAt(rt - 5 + k));
    g.rect(hx0 - 9, rt - 1, hx1 - hx0 + 9, 1, skinDk);
    for (let i = 0; i < 46; i++) {
      const top = rt - 7 - Math.round(i * 1.15);
      for (let y = top; y < top + 7; y++) g.rect(hx1 + i, y, 1, 1, skinAt(y));
    }
    // the wrist's crease (where the water should reach)
    const wy = rt - WRIST;
    g.rect(hx1 + 3, wy, 7, 1, '#A85A3A');
    g.rect(hx1 + 4, wy + 1, 5, 1, skinDk);
    if (this.lv > 0) {
      const h = half(wl);
      g.rect(MZ_CX - h, wl, h * 2, 1, '#BDEFFA');
    }
    // the mark of the crease out to the side (a dotted line and its name)
    for (let x = MZ_CX + 56; x < RX - 8; x += 3) g.px(x, wy, '#FFE7A3');
    // the ladle: pouring (→) or scooping (←) at the upper left
    const lx = MZ_CX - 62;
    const ly = oy + 8 + Math.round(this.pour * 4 - this.scoop * 2);
    g.rect(lx, ly, 10, 6, '#C8A06A');
    g.rect(lx + 1, ly + 1, 8, 4, '#8A6444');
    g.line(lx + 10, ly + 1, lx + 30, ly - 4, '#8A6444');
    if (this.pour > 0.3) for (let y = ly + 6; y < wl; y += 2) g.px(lx + 3 + ((y >> 1) % 2), y, '#BDEFFA');
  }

  drawSide(g: Gfx, oy: number): void {
    g.text(HG_UI.wrist, RX, oy + 4, { color: '#F4ECD8' });
    // a little gauge: the crease line and the water
    const gx = RX;
    const gy = oy + 24;
    g.rect(gx, gy, 8, 30, '#1A1626');
    const wy = gy + 30 - Math.round((WRIST / 30) * 30);
    g.rect(gx - 2, wy, 12, 1, '#FFE7A3');
    const h = Math.round((this.lv / 30) * 30);
    g.rect(gx + 1, gy + 30 - h, 6, h, '#4A8AC8');
  }
}

// ================================================================ はじめ ちょろちょろ（大写し「かまど」）

type Dan = 0 | 1 | 2 | 3 | 4;
type Pend = 'shin' | 'pappa' | 'juju' | 'kobore' | 'pachi' | 'wara' | 'waraLate' | 'waraNone' | 'murashi' | 'murashiNg';

export class HiPanel extends HgPanel {
  place = HG_UI.placeHi;
  dan: Dan = 0;
  /** 火の 大きさ 0〜3（吹くと しばらく +1）。 */
  fire = 1;
  boost = 0;
  /** 段の 中の 時間・熱。 */
  tm = 0;
  heat = 0;
  kobT = 0;
  burst = 0;
  shin = false;
  kobore = false;
  okoge: Okoge = 'nashi';
  /** 台本に 1行 言って もらう 待ち。 */
  pending: Pend | null = null;
  puff = 0;
  autoT = 0;
  private said = new Set<string>();

  keys(): string[] {
    return this.dan === 4 ? HG_UI.keysMurashi : HG_UI.keysHi;
  }

  /** 見える 火（0〜4）。 */
  flame(): number {
    if (this.burst > 0) return 4;
    return Math.min(4, this.fire + (this.boost > 0 && this.fire > 0 ? 1 : 0));
  }

  oto(): string {
    if (this.dan === 0) return 'choro';
    if (this.dan === 1) return this.heat > 2500 ? 'gutsu' : 'choro';
    if (this.dan === 2) return 'juju';
    if (this.dan === 3) return 'pachi';
    return 'shin';
  }

  private once(p: Pend): void {
    if (this.said.has(p)) return;
    this.said.add(p);
    this.pending = p;
  }

  step(dt: number, input: Input): void {
    if (this.pending) return;
    if (this.boost > 0) this.boost = Math.max(0, this.boost - dt);
    if (this.puff > 0) this.puff = Math.max(0, this.puff - dt);
    let add = false;
    let pull = false;
    let blow = false;
    if (this.auto) {
      this.autoT += dt;
      if (this.autoT > 350) {
        this.autoT = 0;
        if (this.dan === 1 && this.fire < 3) add = true;
        else if (this.dan === 1 && this.boost <= 0) blow = true;
        else if (this.dan === 2 && this.fire > 1) pull = true;
        else if (this.dan === 3 && this.tm > 600) add = true;
      }
    } else {
      add = input.repeat('right');
      pull = input.repeat('left');
      blow = this.ePress;
      this.ePress = false;
    }
    if (this.dan === 4) {
      // 赤子 泣いても ふた 取るな：何か 押すと ふたが 浮く
      if (add || pull || blow || input.pressed('up') || input.pressed('down')) {
        se('se_h_yunomi', { vol: 0.5, pitch: 0.6 });
        this.tm = 0;
        this.pending = 'murashiNg';
        return;
      }
      this.tm += dt;
      if (this.tm >= 6000) this.result = 'done';
      return;
    }
    if (this.dan === 3) {
      if (this.burst > 0) {
        this.burst = Math.max(0, this.burst - dt);
        if (this.burst === 0) {
          this.fire = 0;
          this.pending = this.okoge === 'koge' ? 'waraLate' : 'wara';
          this.next(4);
        }
        return;
      }
      this.tm += dt;
      if (add) {
        // わらを ひとにぎり
        se('se_c3_hajiku', { vol: 0.5 });
        this.burst = 1000;
        this.okoge = this.tm <= 3000 ? (this.kobore ? 'usui' : 'kitsune') : 'koge';
        return;
      }
      if (this.tm > 4500) {
        this.okoge = 'nashi';
        this.fire = 0;
        this.pending = 'waraNone';
        this.next(4);
      }
      return;
    }
    if (add && this.fire < 3) {
      this.fire++;
      se('se_h_deli_put', { vol: 0.35 });
    }
    if (pull && this.fire > 0) {
      this.fire--;
      se('se_h_deli_put', { vol: 0.3, pitch: 0.8 });
    }
    if (blow && this.fire > 0) {
      this.boost = 1500;
      this.puff = 600;
      se('se_h_yunomi_pour', { vol: 0.3, pitch: 1.4 });
    }
    const fl = this.flame();
    if (this.dan === 0) {
      if (fl >= 3 && !this.shin) {
        this.shin = true;
        this.once('shin');
        return;
      }
      if (fl >= 1) this.tm += dt;
      if (this.tm >= 5000) {
        this.next(1);
        this.pending = 'pappa';
      }
    } else if (this.dan === 1) {
      if (fl >= 3) this.heat += dt * (fl >= 4 ? 2 : 1);
      if (this.heat >= 5000) {
        this.next(2);
        se('se_c3_teppan', { vol: 0.4 });
        this.pending = 'juju';
      }
    } else if (this.dan === 2) {
      if (fl >= 2) {
        this.kobT += dt;
        if (this.kobT > 3000 && !this.kobore) {
          this.kobore = true;
          this.pending = 'kobore';
          return;
        }
      } else this.tm += dt;
      if (this.tm >= 5000) {
        this.next(3);
        this.pending = 'pachi';
      }
    }
  }

  private next(d: Dan): void {
    this.dan = d;
    this.tm = 0;
  }

  drawScene(g: Gfx, oy: number): void {
    const cx = SX + 104;
    // the earthen kitchen in the dark, the fire's light on everything
    g.rect(SX, oy, RX - SX - 4, CH, '#1E1612');
    const fl = this.flame();
    for (let r = 20 + fl * 14; r > 0; r -= 10) g.alpha(0.04 + fl * 0.01, () => g.circle(cx, oy + 88, r, '#FF8A3A'));
    // the kamado: clay, its mouth, the hagama on top
    g.rect(cx - 70, oy + 58, 140, 54, '#8A5A3A');
    g.rect(cx - 70, oy + 58, 140, 2, '#A8724A');
    for (let k = 0; k < 6; k++) g.rect(cx - 66 + k * 24, oy + 70 + (k % 2) * 14, 16, 1, '#6A4228');
    // the mouth (an arch) and the fire inside
    g.rect(cx - 22, oy + 80, 44, 32, '#0E0A08');
    g.circle(cx, oy + 80, 22, '#0E0A08');
    const fh = [0, 8, 14, 22, 30][fl];
    for (let i = 0; i < 9; i++) {
      const x = cx - 18 + i * 4.5;
      const h = Math.max(0, Math.round(fh * (0.6 + 0.4 * Math.sin(this.t / 90 + i * 1.3))));
      if (h <= 0) continue;
      g.rect(Math.round(x), oy + 110 - h, 3, h, '#E8482A');
      g.rect(Math.round(x) + 1, oy + 110 - Math.round(h * 0.7), 1, Math.round(h * 0.7), '#FFB040');
      if (fl >= 3) g.px(Math.round(x) + 1, oy + 110 - h, '#FFE7A3');
    }
    // the embers and the sticks
    g.rect(cx - 18, oy + 108, 36, 3, fl > 0 ? '#C8402A' : '#3A2418');
    for (let k = 0; k < Math.min(3, this.fire); k++) g.rect(cx - 16 + k * 5, oy + 106 - k, 26, 2, '#6A4A2A');
    // the hagama, the wooden lid
    drawKama(g, cx, oy + 30, oy + 60, false);
    g.rect(cx - 50, oy + 22, 100, 8, '#B8864A');
    g.rect(cx - 50, oy + 22, 100, 1, '#D8A86A');
    g.rect(cx - 8, oy + 18, 16, 4, '#8A6444');
    // steam from the lid's gap, foam at ジュウジュウ
    const steam = this.dan === 1 ? Math.min(1, this.heat / 5000) : this.dan === 2 ? 1 : this.dan === 3 ? 0.5 : this.dan === 4 ? 0.2 : 0.1;
    for (let i = 0; i < Math.round(steam * 6); i++) {
      const sx = cx - 46 + ((i * 17 + Math.floor(this.t / 140)) % 92);
      const sy = oy + 20 - ((this.t / 30 + i * 9) % 18);
      g.alpha(0.35, () => g.rect(Math.round(sx), Math.round(sy), 2, 2, '#E8E4DC'));
    }
    if (this.dan === 2 && this.fire >= 2) {
      for (let i = 0; i < 10; i++) g.circle(cx - 48 + i * 10, oy + 30 + Math.round(Math.sin(this.t / 120 + i)), 2, '#F4F1E8');
    }
    if (this.puff > 0) for (let i = 0; i < 5; i++) g.px(cx - 30 + i * 3, oy + 96 - i, '#FFE7A3');
    // the pot's sound, big
    const word = HG_UI.oto[this.oto()];
    const shake = this.dan === 2 || this.dan === 3 ? Math.round(Math.sin(this.t / 40)) : 0;
    g.text(word, SX + 112 + shake, oy + 3, { color: this.dan === 4 ? '#8A84A0' : '#FFE7A3', outline: '#1E1612' });
  }

  drawSide(g: Gfx, oy: number): void {
    g.text(HG_UI.dan[this.dan], RX, oy + 4, { color: '#F4ECD8' });
    // the fire's size (four pips)
    for (let k = 0; k < 4; k++) g.rect(RX + k * 12, oy + 28, 9, 9, k < this.flame() ? '#E8482A' : '#1A1626');
    // the five steps done so far
    for (let k = 0; k < 5; k++) g.rect(RX + k * 10, oy + 44, 7, 4, k < this.dan ? '#FFE7A3' : k === this.dan ? '#C8B070' : '#1A1626');
  }
}

function* openPanel(p: HgPanel): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: HgPanel): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

function* talk(p: HgPanel, text: string): Co {
  yield* say(text);
  p.clearInput();
}

let qaAuto = false;

/** 水加減：決めた 炊きあがりの 見こみ（やめたら null）。 */
function* mizuPanel(first: boolean): Co<Kama | null> {
  const p = new MizuPanel();
  p.auto = qaAuto;
  p.lv = 0;
  try {
    yield* openPanel(p);
    if (first) yield* talk(p, T.HG_MIZU_A);
    yield* talk(p, T.HG_MIZU_RULE);
    for (;;) {
      p.clearInput();
      p.result = null;
      p.active = true;
      while (!p.result) yield null;
      p.active = false;
      if (p.result === 'cancel') return null;
      const j = p.judge();
      se('se_examine', { vol: 0.5 });
      if (j === 'ooi') yield* talk(p, T.HG_MIZU_OOI);
      else if (j === 'sukunai') yield* talk(p, T.HG_MIZU_SUKUNAI);
      else {
        yield* talk(p, T.HG_MIZU_KIME[j]);
        return j;
      }
    }
  } finally {
    yield* closePanel(p);
  }
}

const PEND_TEXT: Record<Pend, () => string | null> = {
  shin: () => T.HG_SHIN,
  pappa: () => T.HG_PAPPA,
  juju: () => T.HG_JUJU,
  kobore: () => T.HG_KOBORE,
  pachi: () => T.HG_PACHI,
  wara: () => T.HG_WARA,
  waraLate: () => `${T.HG_WARA}\n${T.HG_WARA_LATE}`,
  waraNone: () => T.HG_WARA_NONE,
  murashi: () => T.HG_MURASHI,
  murashiNg: () => T.HG_MURASHI_NG,
};

/** かまど：おこげと 芯（やめたら null）。 */
function* hiPanel(first: boolean): Co<{ okoge: Okoge; shin: boolean } | null> {
  const p = new HiPanel();
  p.auto = qaAuto;
  try {
    yield* openPanel(p);
    yield* talk(p, T.HG_HI_RULE);
    yield* talk(p, T.HG_UTA);
    for (;;) {
      p.clearInput();
      p.result = null;
      p.active = true;
      while (!p.result && !p.pending) yield null;
      p.active = false;
      if (p.result === 'cancel') return null;
      if (p.result === 'done') break;
      const pend = p.pending!;
      p.pending = null;
      yield 250;
      const t = PEND_TEXT[pend]();
      if (t) yield* talk(p, t);
      if (pend === 'pappa' && first && !flag(HF.fukiSaid)) {
        setFlag(HF.fukiSaid, 1);
        yield* talk(p, T.HG_FUKIDAKE);
      }
      if (pend === 'wara' || pend === 'waraLate' || pend === 'waraNone') yield* talk(p, T.HG_MURASHI);
    }
    yield 400;
    return { okoge: p.okoge, shin: p.shin };
  } finally {
    yield* closePanel(p);
  }
}

// ================================================================ 台本

function peroSprite(): string {
  return flag('flag_hunting_on') ? 'npc_hoshi_mitsu_hunting' : 'npc_hoshi_mitsu';
}

/** 研ぐ → 水加減 → つけて 待つ → 火種 → かまど（やめたら null）。 */
function* cook(first: boolean): Co<{ kama: Kama; okoge: Okoge } | null> {
  yield* say(first ? T.HG_TOGU : T.HG_TOGU2);
  const water = yield* mizuPanel(first);
  if (!water) return null;
  // 半時間ほど 水に つけて 待つ（短い 場面）
  if (first) yield* say(T.HG_HITASU);
  yield* game.fadeOut(500, '#0B0B14');
  yield 600;
  yield* game.fadeIn(500);
  yield* say(first ? T.HG_MATSU : T.HG_MATSU2);
  if (first) yield* say(T.HG_HIDANE);
  se('se_c3_hajiku', { vol: 0.3 });
  const hi = yield* hiPanel(first);
  if (!hi) return null;
  // 芯（はじめから 強かった）：1段 かため
  let kama: Kama = water;
  if (hi.shin) kama = kama === 'yawa' ? 'chodo' : 'kata';
  return { kama, okoge: hi.okoge };
}

/** 5・6：おこげの 場面と ごほうび。 */
function* okogeScene(r: { kama: Kama; okoge: Okoge }, first: boolean): Co {
  se('se_h_yunomi', { vol: 0.6, pitch: 0.7 });
  yield* say(T.HG_OKOGE_A);
  yield* say(T.HG_KAMA[r.kama]);
  yield* say(T.HG_OKOGE[r.okoge]);
  if (first) {
    if (r.okoge !== 'nashi') yield* say(T.HG_KURIKO);
    yield* say(T.HG_HITORI);
    const umeTaken = flag('flag_ch2_hidden_engawa') > 0;
    if (umeTaken) setFlag(HF.shio, 1);
    yield* say(umeTaken ? T.HG_SHIO : T.HG_UME);
    yield* say(T.HG_KIME);
  }
  // the best of the times cooked, on the page
  const better = KAMA_RANK[r.kama] > flag(HF.bestKama) || OKOGE_RANK[r.okoge] > flag(HF.bestOkoge);
  setFlag(HF.bestKama, Math.max(flag(HF.bestKama), KAMA_RANK[r.kama]));
  setFlag(HF.bestOkoge, Math.max(flag(HF.bestOkoge), OKOGE_RANK[r.okoge]));
  setFlag(HF.n, flag(HF.n) + 1);
  if (first) {
    for (let i = 0; i < 3; i++) addItem('item_hg_onigiri');
    setFlag(HF.done, 1);
    addMp(2);
    se('se_item');
    yield* runMsg(T.HG_REWARD);
  } else if (better) {
    se('se_page');
    yield* runMsg(T.HG_BEST);
  }
  // かくし：きつね色の おこげ → ツガオ便の 分（1回）
  if (r.okoge === 'kitsune' && !flag(HF.bin)) {
    setFlag(HF.bin, 1);
    yield* say(T.HG_BIN);
    yield* getKeyItem('item_hg_bin', T.HG_GET_BIN, false);
  }
}

/** 2 ペロの 頼み → 土間へ → 炊く。 */
function* hagama(first: boolean): Co {
  if (first) {
    yield* say(T.HG_TANOMI_A);
    if (!pgOn()) yield* say(T.HG_TANOMI_KONAI);
    yield* say(T.HG_TANOMI_B);
  } else yield* say(T.HG_AGAIN_YES);
  yield* game.fadeOut(400, '#0B0B14');
  se('se_door');
  const f = F();
  f.loadMap(KOMINKA, 2, 3, 'up');
  f.syncFollower(true);
  const pe = spawn('hg_pero', 3, 3, { sprite: peroSprite(), dir: 'left', ghost: true });
  pe.data.scripted = true;
  f.snapCamera();
  yield* game.fadeIn(400);
  yield 300;
  setFlag(HF.start, 1);
  const r = yield* cook(first);
  if (!r) {
    yield* say(T.HG_STOP);
    // (stopped: one more look at the kamado, then ask him again; till then his other talk goes on)
    if (first) setFlag(HF.look, 1);
  } else yield* okogeScene(r, first);
  // he goes back out to his greenhouse
  yield* walk('hg_pero', [[3, 8], [2, 8]], { speed: 2.4 });
  se('se_door', { vol: 0.5 });
  despawn('hg_pero');
}

/** ペロの 用（した とき true）。クリア後の 夜は hagama_pg.ts が クリア後の 会話の 上から 呼ぶ。 */
export function* hgPero(): Co<boolean> {
  if (!open() || onMap(KOMINKA)) return false;
  if (!flag(HF.done)) {
    if (flag(HF.look) < 2) return false;
    yield* hagama(true);
    return true;
  }
  if (!flag(HF.peroAfter)) {
    setFlag(HF.peroAfter, 1);
    yield* say(T.HG_PERO_AFTER);
    return true;
  }
  if (flag(HF.again)) {
    setFlag(HF.again, 0);
    const i = yield* say(T.HG_AGAIN_ASK);
    if (i === 0) yield* hagama(false);
    else yield* say(T.HG_AGAIN_NO);
    return true;
  }
  return false;
}

wrap('npc_hoshi_mitsu', function* (_ctx, orig): Co {
  if (!(yield* hgPero())) yield* orig();
});

/** かまど：2回 見る（今の 文の あと）。すんだ あとは もう 1回 炊ける 印。 */
export function* hgKamadoAfter(): Co {
  if (!open()) return;
  if (flag(HF.done)) {
    setFlag(HF.again, 1);
    return;
  }
  const n = flag(HF.look) + 1;
  setFlag(HF.look, Math.min(2, n));
  if (n === 2 && !pgOn() && !flag(HF.start)) yield* say(T.HG_KAMI_KN);
}
wrap('obj_hr_kominka_kamado', function* (_ctx, orig): Co {
  yield* orig();
  // (クリア後は クリア後の 文が 今の 文の かわりに 出て、ここへ 来ない：hagama_pg.ts が その あとに 呼ぶ)
  yield* hgKamadoAfter();
});

/** 転回場の ヒロスケ：ツガオ便の 分（1回）。 */
wrap('npc_hirosuke', function* (_ctx, orig): Co {
  if (onMap('map_hoshimidai') && state.inventory.includes('item_hg_bin') && !flag(HF.binDone)) {
    yield* say(T.HG_BIN_HIRO);
    removeItem('item_hg_bin');
    setFlag(HF.binDone, 1);
    return;
  }
  yield* orig();
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.hagama(step = 'look', auto = false, stage = 'h1')（'h1' トマトの 灯り・'h2' よびごえ）
 *   'look'    ペロの 家の かまどの 前 (2,3) 上向き（2回 調べる）
 *   'pero'    2回 見た あと、3号ハウスの 前の ペロの 前 (4,32) 西向き（話すと 2〜6）
 *   'again'   すんだ あと、もう 1回の 印（かまどを 見た）を つけて、ペロの 前
 *   'hiro'    便の 分を 持って、転回場の ヒロスケの 前 (43,44) 上向き
 */
if (import.meta.env.DEV) {
  registerDebug('hagama', (step = 'look', auto = false, stg = 'h1') => {
    if (stg === 'h2') cmd().jump?.('ch2:hill', true);
    else cmd().jump?.('ch2:houki', true);
    for (const id of Object.values(HF)) setFlag(id, 0);
    qaAuto = !!auto;
    for (const it of ['item_hg_bin', 'item_hg_onigiri']) while (state.inventory.includes(it)) removeItem(it);
    const go = (m: string, x: number, y: number, d: string) => cmd().warp?.(m, x, y, d);
    if (step === 'look') return go(KOMINKA, 2, 3, 'up');
    setFlag(HF.look, 2);
    if (step === 'pero') return go('map_hoshimidai', 4, 32, 'left');
    setFlag(HF.start, 1);
    setFlag(HF.done, 1);
    setFlag(HF.peroAfter, 1);
    setFlag(HF.bestKama, 2);
    setFlag(HF.bestOkoge, 2);
    if (step === 'again') {
      setFlag(HF.again, 1);
      return go('map_hoshimidai', 4, 32, 'left');
    }
    setFlag(HF.bin, 1);
    addItem('item_hg_bin');
    return go('map_hoshimidai', 43, 44, 'up');
  });

  registerDebug('hgWhy', () => ({ open: open(), stage: hStage(), lantern: lanternOn(), kominka: onMap(KOMINKA), script: String(getScript('npc_hoshi_mitsu')).slice(0, 200) }));

  registerDebug('hgState', () => {
    const w = game.ui.widgets.find((x) => x instanceof HgPanel) as HgPanel | undefined;
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(HF)) flags[k] = flag(id);
    let panel: Record<string, unknown> | null = null;
    if (w instanceof MizuPanel) panel = { kind: 'mizu', lv: +w.lv.toFixed(1), active: w.active, result: w.result };
    else if (w instanceof HiPanel) panel = { kind: 'hi', dan: w.dan, fire: w.fire, flame: w.flame(), tm: Math.round(w.tm), heat: Math.round(w.heat), okoge: w.okoge, shin: w.shin, kobore: w.kobore, pending: w.pending, active: w.active, result: w.result };
    return { flags, items: state.inventory.filter((i) => i.startsWith('item_hg_')), panel };
  });
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines; the panels' words in their room. */
export function hgTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足様', '平和', '17', '3人', '海ぞい', '水族館', 'いただきます', 'ほどよい', '焼き芋 食うか', '寝る 前に'];
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
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('hg', T.HG_TEXTS);
  const col = SX + CW - RX - 2;
  for (const l of [...HG_UI.keysMizu, ...HG_UI.keysHi, ...HG_UI.keysMurashi, ...HG_UI.dan, HG_UI.wrist]) if (measure(l) > col) bad.push(`右の 列: ${measure(l)}px > ${col}: ${l}`);
  for (const l of Object.values(HG_UI.oto)) if (measure(l) > RX - SX - 16) bad.push(`音: ${measure(l)}px: ${l}`);
  if (KEYS_Y + 3 * 16 > CH) bad.push(`keys: bottom ${KEYS_Y + 3 * 16} > ${CH}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('hgText', () => hgTextCheck());
