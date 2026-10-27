// 目で、いちばん 長く（第3章の クリア前、段階3。げむきか 10-27 の 案3、2026-10-27 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_fureai.ts、新しい 地図は data/maps/c3_fureai.ts（ふれあいの 磯 map_c3_aq_fureai）、絵は art/props/fureai_art.ts、
// みました帳の ページは ui/menu/book_fureai.ts。案から 直した 所は 文の ファイルの 頭。
//
//   S16 の 回廊の あと（flag_ch3_kairo_done）から S20 で ホールに 入るまで（flag_ch3_tsugao1）。寄らなくても 本筋は 進む。
//   ・回廊の 南の 壁の 木の 戸 (33,6)（(33,5) から 下向き）：S16 の 間は 札『ふれあいの 磯 →』だけ。回廊の あと 調べると
//     開いて（flag_fr_to、flag_fr_start）暗転で ふれあいの 磯 (6,2)。開いた あとは 押しても 入れる。
//   ・ふれあいの 磯：入って すぐ（1回）水の ない 水槽（flag_fr_inn）。貼り紙『ふれあいの やくそく』（flag_fr_yaku）→
//     水槽で「生き物 役」：グソっ君が 岩の 上で まるく なる（flag_fr_in。隊列の グソっ君は 消え、水槽の 絵に 出る）。
//     手：手洗い場で「水で 洗う／石けんで 洗う」（flag_fr_te）。洗わずに 水槽 →「手、洗たか？」。
//     目と 指：水槽の 大写し「ふれあい」（FureaiPanel、←→で 触角・足・しっぽ・指）。見た 所は flag_fr_me（1・2・4）、
//     指で さわる（flag_fr_yubi）、持ち上げる（flag_fr_mochi：1回目だけ グソっ君の つっこみ。失敗に しない）。
//     3か所 見る 前に 指へ 行くと flag_fr_junban（かくしの はなまるが 出ない）。ぜんぶ すむと flag_fr_fureai →
//     貼り紙の すみに 光と「！」→ いちばん 下の 字（flag_fr_yomu）→ グソっ君が 出てきて 朱肉 +2・帳面③の すみ（flag_fr_done）。
//   ・水槽に いる 間に 北の 戸から 出ると、グソっ君は 回廊で 追いついて くる（「生き物 役、いったん 休憩や。」）。
//   ・やり込み：部屋の 物 ○/3（手おけ・蛇口・踏み台）。S19 の あと（flag_ch3_esa_done）に 貼り紙を 読むと「えさの 部屋の
//     札の 字と、同じや。」（1回、flag_fr_esa）。済んだ あとの 水槽は くぼみ（グソっ君「わいの 席や。」1回）。
//   ・かくし：下の 紙の 字（flag_sh_tsuzuri）→ 5 で「光で 読めたな。」。やくそくの 順の まま → はなまる（flag_fr_hana）。
//     持ち上げた 人だけ、帳面の グソっ君に 汗の 線。
//   ・S20 から 先・クリア後：戸は 閉まった まま（「戸の 向こうは、しずかだ。」）。
//
// QA：__game.cmd.fureai(step, auto)、frState()、frText()

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { measure } from '../../engine/font';
import { PixelCanvas } from '../../engine/pixel';
import { markText } from '../../engine/textzones';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { field } from '../../world/field';
import { SPEAKERS } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { addMarkSource } from '../../world/marks';
import type { MapObj } from '../../world/types';
import { drawTape, drawWindow, UI } from '../../ui/window';
import type { Howto } from '../../ui/closeup';
import * as T from '../../data/text/c3_fureai';
import { FR_UI } from '../../data/text/c3_fureai';
import { fillNames } from '../../data/text/c3_names';
import { FR_DOOR, FR_FUMIDAI, FR_HARIGAMI, FR_IN_AT, FR_JAGUCHI, FR_OKE, FR_SUISOU, FUREAI } from '../../data/maps/c3_fureai';
import { addMp } from '../lib';
import { forceBoxPos } from '../stage';
import { se } from '../ch2/compat';
import { addToMap, inCh3, say3 } from './common';

export const FF = {
  to: 'flag_fr_to',
  start: 'flag_fr_start',
  inn: 'flag_fr_inn',
  yaku: 'flag_fr_yaku',
  ikimono: 'flag_fr_ikimono',
  /** グソっ君が 水槽の 岩の 上に いる（今）。 */
  in: 'flag_fr_in',
  te: 'flag_fr_te',
  /** 見た 所（1 触角・2 足・4 しっぽの 扇）。 */
  me: 'flag_fr_me',
  yubi: 'flag_fr_yubi',
  mochi: 'flag_fr_mochi',
  /** 3か所 見る 前に 指へ 行った（はなまるが 出ない）。 */
  junban: 'flag_fr_junban',
  fureai: 'flag_fr_fureai',
  yomu: 'flag_fr_yomu',
  hana: 'flag_fr_hana',
  esa: 'flag_fr_esa',
  kubomi: 'flag_fr_kubomi',
  oke: 'flag_fr_oke',
  jag: 'flag_fr_jag',
  fumi: 'flag_fr_fumi',
  done: 'flag_fr_done',
} as const;

const KAIRO = 'map_c3_aq_kairo';
/** 回廊の 南の 壁の 戸と、その 前。 */
const TO: [number, number] = [33, 6];
const TO_MAE: [number, number] = [33, 5];

/** グソっ君が 一緒（水槽に いても）。 */
function knHere(): boolean {
  const f = field();
  if (!f?.follower || flag('flag_follower_hidden') || !flag('flag_kanenari_joined')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

/** グソっ君の いない 行を 抜く。 */
function trim(text: string): string {
  if (knHere()) return text;
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

/** ふれあいの 磯に 入れる 間：段階3、S16 の 回廊の あと、S20 の 前（クリア後は 閉まった まま）。 */
export function frOpen(): boolean {
  return inCh3() && !pgOn() && flag('flag_ch3_stage') === 3 && flag('flag_ch3_kairo_done') > 0 && !flag('flag_ch3_tsugao1') && !flag('flag_ch3_clear');
}

/** S16 の 間（回廊の 前）：札だけ。 */
function frFuda(): boolean {
  return inCh3() && !pgOn() && flag('flag_ch3_stage') === 3 && flag('flag_ch3_aq_enter') > 0 && !flag('flag_ch3_kairo_done');
}

export function frDone(): boolean {
  return flag(FF.done) > 0;
}

const openDoor = () => frOpen() && flag(FF.to) > 0;

const meN = () => [1, 2, 4].filter((b) => flag(FF.me) & b).length;
/** やくそく ○/3（手・指・水から 出さない＝ふれあいを 終えた）。 */
export function frYakuN(): number {
  return (flag(FF.te) ? 1 : 0) + (flag(FF.yubi) ? 1 : 0) + (flag(FF.fureai) ? 1 : 0);
}
export function frMeN(): number {
  return meN();
}
export function frMonoN(): number {
  return [FF.oke, FF.jag, FF.fumi].filter((f) => flag(f) > 0).length;
}

/** グソっ君を 水槽の 岩の 上へ（on）／水槽から 出す。隊列の 絵は 消し、水槽の 絵に 出す（fureai_art.ts）。 */
function knTank(on: boolean): void {
  setFlag(FF.in, on ? 1 : 0);
  const f = field();
  const kn = f?.follower;
  if (!f || !kn) return;
  kn.visible = !on;
  if (on) kn.data.scripted = true;
  else {
    delete kn.data.scripted;
    f.syncFollower(true);
  }
}

// ================================================================ 地図の 物

addToMap(KAIRO, [
  // the wooden door in the south wall (its notch and faded plate on the floor's edge)
  { t: 'prop', prop: 'prop_fr_kairo_to', x: TO_MAE[0], y: TO_MAE[1], cond: { when: () => inCh3() || pgOn() } } as unknown as MapObj,
  { t: 'door', id: 'door_c3_aq_fureai', x: TO[0], y: TO[1], to: FUREAI, tx: FR_IN_AT[0], ty: FR_IN_AT[1], dir: 'down', se: 'se_door', cond: { when: openDoor } } as unknown as MapObj,
  { t: 'obj', id: 'obj_fr_to', x: TO[0], y: TO[1], face: 'down', script: 'obj_fr_to', cond: { when: () => inCh3() || pgOn() } } as unknown as MapObj,
]);

const O = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MapObj => ({ t: 'obj', id, x, y, script: id, ...extra }) as unknown as MapObj;
addToMap(FUREAI, [
  // the way out (グソっ君 left in the pool catches up in the corridor: evt_fr_kairo)
  { t: 'door', id: 'door_c3_aq_fureai_out', x: FR_DOOR[0], y: FR_DOOR[1], to: KAIRO, tx: TO_MAE[0], ty: TO_MAE[1], dir: 'up', se: 'se_door' } as unknown as MapObj,
  O('obj_fr_harigami', FR_HARIGAMI[0], FR_HARIGAMI[1], { w: 2, face: 'up' }),
  O('obj_fr_suisou', FR_SUISOU[0], FR_SUISOU[1], { w: 6, h: 3 }),
  O('obj_fr_jaguchi', FR_JAGUCHI[0], FR_JAGUCHI[1]),
  O('obj_fr_fumidai', FR_FUMIDAI[0], FR_FUMIDAI[1]),
  O('obj_fr_oke', FR_OKE[0], FR_OKE[1]),
]);

// leaving while グソっ君 is in the pool: he scrambles out and catches up in the corridor (once a time)
addToMap(KAIRO, [], ['evt_fr_kairo']);
registerScript('evt_fr_kairo', function* (): Co {
  if (!flag(FF.in)) return;
  knTank(false);
  if (!inCh3() || !knHere()) return;
  yield 300;
  yield* say(T.FR_DERU);
});

// ================================================================ 見のがさない しるし

// the notice, once the three are done and its last line is not read yet (the light on its corner)
addMarkSource((f) => {
  if (f.map.id !== FUREAI || !frOpen() || !flag(FF.fureai) || flag(FF.yomu)) return null;
  const foot = (FR_HARIGAMI[1] + 1) * 16;
  return { x: FR_HARIGAMI[0] * 16 + 16, y: foot - 30, foot };
});

// ================================================================ 大写し「ふれあい」

const PX = 24;
const PY = 4;
const PW = 336;
const PH = 120;
const SX = PX + 4;
const SY = PY + 4;
const CW = PW - 8;
const CH = PH - 8;
/** 右の 欄（4つの 名前と 見た しるし）。 */
const RX = SX + 214;
/** 寄りの 絵の 大きさと、3か所の 印の 場所（絵の px）。 */
const IW = 204;
const IH = 92;
const SPOTS: [number, number][] = [
  [26, 18], // 触角の 先
  [104, 80], // 足
  [170, 46], // しっぽの 扇
];
/** 指（絵の 右上の 2本の 指の 印）。 */
const YUBI_AT: [number, number] = [190, 10];

let closeImg: HTMLCanvasElement | null = null;

/** 寄りの 絵：乾いた 岩の 上で まるく なった グソっ君（横から 少し 上の 寄り）。 */
function closeup(): HTMLCanvasElement {
  if (closeImg) return closeImg;
  const p = new PixelCanvas(IW, IH);
  // the dry basin and the rock, the white line where the water stood
  for (let y = 0; y < IH; y++)
    for (let x = 0; x < IW; x++) {
      let c = (x * 7 + y * 13) % 29 === 0 ? '#D8DCD4' : y > 70 ? '#8A9490' : '#A8B0AC';
      if (y > 62 && Math.abs(x - 104) < 92 - (y - 62) * 0.4) c = (x + y) % 5 === 0 ? '#6E6458' : '#5E564C';
      p.set(x, y, c);
    }
  for (let x = 0; x < IW; x += 2) p.set(x, 66, '#E8ECE4');
  const cx = 104;
  const cy = 46;
  // the legs under him: seven a side, the near row (14 in all: the near seven drawn, the far seven a shade back)
  for (let k = 0; k < 7; k++) {
    const lx = 66 + k * 12;
    p.line(lx + 3, cy + 18, lx + 1, cy + 30, '#8A5A3A');
    p.line(lx, cy + 18, lx - 3, cy + 31, '#5A3A2A');
    p.set(lx - 4, cy + 32, '#5A3A2A');
  }
  // the body: ochre, outlined, shaded below; the segments across
  p.ellipse(cx, cy, 58, 24, '#5A3A2A');
  p.ellipse(cx, cy, 56, 22, '#D49A5C');
  for (let y = cy + 6; y <= cy + 22; y++) for (let x = cx - 56; x <= cx + 56; x++) if (((x - cx) / 56) ** 2 + ((y - cy) / 22) ** 2 <= 1) p.set(x, y, y > cy + 15 ? '#8A5A3A' : '#A8693A');
  for (let k = -4; k <= 4; k++) {
    const sx = cx + k * 11;
    for (let y = cy - 21; y <= cy + 21; y++) if (((sx - cx) / 56) ** 2 + ((y - cy) / 22) ** 2 <= 0.95) p.set(sx, y, '#8A5A3A');
  }
  for (let x = cx - 40; x <= cx + 30; x++) p.set(x, cy - 18 + Math.round(((x - cx) / 56) ** 2 * 6), '#EBBF86');
  // the head end (west): the headband, a big eye with its glint, a cheek, the tusks
  p.rect(cx - 52, cy - 14, 4, 22, '#FBF3DC');
  p.vline(cx - 48, cy - 14, cy + 7, '#E8D9B5');
  p.ellipse(cx - 40, cy - 4, 5, 6, '#2A2440');
  p.rect(cx - 42, cy - 8, 2, 2, '#FFF6D8');
  p.ellipse(cx - 36, cy + 7, 3, 2, '#F08A7A');
  p.line(cx - 50, cy + 10, cx - 54, cy + 20, '#F0CB98');
  p.line(cx - 46, cy + 11, cx - 48, cy + 21, '#F0CB98');
  // the two long feelers, reaching out (west, up)
  p.line(cx - 54, cy - 8, 40, 22, '#5A3A2A');
  p.line(40, 22, 22, 16, '#5A3A2A');
  p.line(cx - 52, cy - 12, 46, 12, '#5A3A2A');
  p.line(46, 12, 30, 6, '#5A3A2A');
  // the tail end (east): a rounded shield with a small fan of plates either side, fringed (not a fish's tail)
  p.poly([[cx + 52, cy - 12], [cx + 64, cy - 8], [cx + 68, cy + 2], [cx + 64, cy + 12], [cx + 52, cy + 14]], '#5A3A2A');
  p.poly([[cx + 52, cy - 10], [cx + 63, cy - 7], [cx + 66, cy + 2], [cx + 62, cy + 10], [cx + 52, cy + 12]], '#D49A5C');
  p.line(cx + 54, cy + 1, cx + 63, cy + 1, '#A8693A');
  for (const [dy, len] of [[-10, 7], [11, 7]] as const) {
    p.poly([[cx + 56, cy + dy - 2], [cx + 56 + len, cy + dy - 3], [cx + 57 + len, cy + dy + 2], [cx + 56, cy + dy + 2]], '#A8693A');
    for (let k = 0; k < len; k += 2) p.set(cx + 57 + k, cy + dy + (dy < 0 ? -3 : 3), '#5A3A2A');
  }
  for (let y = cy - 6; y <= cy + 8; y += 2) p.set(cx + 67, y, '#5A3A2A');
  closeImg = p.toCanvas();
  return closeImg;
}

const RED = '#E23B2E';
const DIM = '#8A84A0';

type Phase = 'idle' | 'select';

export class FureaiPanel implements Widget {
  modal = true;
  /** 大写し：もどるで やめる（ui/closeup.ts）。 */
  closeup = true;
  /** はじめの カード（ui/closeup.ts、改善会議 10-25 の1）。 */
  howto: Howto = T.FR_HOWTO;
  done = false;
  t = 0;
  open = 0;
  auto = false;
  phase: Phase = 'idle';
  /** 選んで いる 所（0 触角・1 足・2 しっぽ・3 指）。 */
  cur = 0;
  picked = -1;
  private armT = 0;

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.phase !== 'select') {
      this.armT = 0;
      return;
    }
    this.armT += dt;
    if (this.armT < 150) return;
    if (this.auto) {
      if (this.armT < 420) return;
      this.armT = 150;
      const seen = flag(FF.me);
      const want = [0, 1, 2].find((k) => !(seen & (1 << k))) ?? 3;
      if (this.cur !== want) {
        this.cur += want > this.cur ? 1 : -1;
        return;
      }
      this.picked = want;
      return;
    }
    if (input.pressed('left')) {
      this.cur = (this.cur + 3) % 4;
      se('se_cursor', { vol: 0.5 });
    } else if (input.pressed('right')) {
      this.cur = (this.cur + 1) % 4;
      se('se_cursor', { vol: 0.5 });
    } else if (input.pressed('confirm')) {
      se('se_cursor', { vol: 0.7 });
      this.picked = this.cur;
    }
  }

  /** 1つ 選ぶまで 待つ（0〜3）。 */
  *pick(): Co<number> {
    this.picked = -1;
    this.phase = 'select';
    while (this.picked < 0) yield null;
    this.phase = 'idle';
    return this.picked;
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
        g.clip(SX, oy, RX - SX - 4, CH, () => this.drawPic(g, oy));
        this.drawSide(g, oy);
        markText(RX - 4, oy, SX + CW - RX + 4, CH);
      });
      const tw = g.measure(FR_UI.title) + 16;
      drawTape(g, SX + 8, PY + dy - 5, tw, 16, FR_UI.title, { seed: 79 });
      markText(SX + 8, PY + dy - 5, tw, 16);
    });
  }

  /** 左：寄りの 絵と、3か所の 印・指の 印。 */
  private drawPic(g: Gfx, oy: number): void {
    const W = RX - SX - 4;
    g.rect(SX, oy, W, CH, '#2E343C');
    const ix = SX + Math.round((W - IW) / 2);
    const iy = oy + 2;
    g.img(closeup(), ix, iy);
    // the noon light from above onto his back (a soft band)
    g.rect(ix + 80, iy, 40, IH - 30, '#FFF6D8', 0.08);
    const seen = flag(FF.me);
    const sel = this.phase === 'select';
    const blink = Math.floor(this.t / 300) % 2 === 0;
    SPOTS.forEach(([sx, sy], i) => {
      const x = ix + sx;
      const y = iy + sy;
      const on = sel && this.cur === i;
      if (seen & (1 << i)) g.rect(x - 1, y - 1, 3, 3, '#FFE7A3', 0.9);
      if (on) {
        g.frame(x - 6, y - 6, 13, 13, RED);
        if (blink) g.frame(x - 7, y - 7, 15, 15, RED);
      }
    });
    // the two fingers (the touch), top right
    const fx = ix + YUBI_AT[0];
    const fy = iy + YUBI_AT[1];
    const fc = flag(FF.yubi) ? '#FFE7A3' : '#F0D8C0';
    g.rect(fx - 4, fy - 6, 3, 9, fc);
    g.rect(fx, fy - 7, 3, 10, fc);
    g.rect(fx - 5, fy + 3, 9, 5, fc);
    if (sel && this.cur === 3) {
      g.frame(fx - 8, fy - 10, 15, 21, RED);
      if (blink) g.frame(fx - 9, fy - 11, 17, 23, RED);
    }
    if (sel) g.text(FR_UI.keys, SX + 6, oy + CH - 18, { color: '#FFE7A3' });
  }

  /** 右：4つの 名前（選んで いる 物は 赤い 点）、見た／さわった しるし。 */
  private drawSide(g: Gfx, oy: number): void {
    g.rect(RX - 4, oy, SX + CW - RX + 4, CH, '#2A2236');
    g.text(FR_UI.me, RX, oy + 2, { color: '#F4ECD8' });
    const seen = flag(FF.me);
    FR_UI.parts.forEach((name, i) => {
      const y = oy + 19 + i * 17 + (i === 3 ? 20 : 0);
      const done = i < 3 ? !!(seen & (1 << i)) : flag(FF.yubi) > 0;
      if (i === 3) g.text(FR_UI.yubi, RX, y - 18, { color: '#F4ECD8' });
      if (this.phase === 'select' && this.cur === i) g.rect(RX, y + 6, 4, 4, RED);
      g.text(name, RX + 8, y, { color: done ? '#FFE7A3' : DIM });
      if (done) g.text(i < 3 ? FR_UI.seen : FR_UI.touched, RX + 8 + g.measure(name) + 6, y, { color: '#7AC88A' });
    });
  }
}

function* openPanel(p: Widget & { open: number }): Co {
  game.ui.push(p);
  se('se_tsuri_open');
  yield* animate(200, (x) => (p.open = x), ease.linear);
  p.open = 1;
  forceBoxPos('bottom');
}

function* closePanel(p: Widget & { open: number; done: boolean }): Co {
  yield* animate(180, (x) => (p.open = 1 - x), ease.linear);
  p.done = true;
  game.ui.remove(p);
  forceBoxPos(null);
}

let qaAuto = false;
/** QA：指で「持ち上げる」を 1回 選ぶ（auto の とき）。 */
let qaMochi = false;

/** 4 目と 指。すんだ 所は flag に 残る（もどるで やめたら 続きから）。 */
function* fureaiGame(): Co {
  const p = new FureaiPanel();
  p.auto = qaAuto;
  try {
    yield* openPanel(p);
    for (;;) {
      const all = meN() >= 3;
      if (all && flag(FF.yubi)) break;
      const k = yield* p.pick();
      if (k < 3) {
        const bit = 1 << k;
        if (flag(FF.me) & bit) yield* say3(T.FR_ME_AGAIN);
        else {
          setFlag(FF.me, flag(FF.me) | bit);
          yield* say(T.FR_ME[k]);
        }
        continue;
      }
      // 指
      if (flag(FF.yubi)) {
        yield* say(T.FR_MADA_MIRU);
        continue;
      }
      if (!all) setFlag(FF.junban, 1);
      let ans: number;
      if (p.auto) {
        ans = qaMochi && !flag(FF.mochi) ? 1 : 0;
        yield* say3(T.FR_YUBI_ASK.replace(/\n\?.*$/, ''));
      } else ans = yield* say3(T.FR_YUBI_ASK);
      if (ans === 1) {
        if (!flag(FF.mochi)) {
          setFlag(FF.mochi, 1);
          yield* say(T.FR_MOCHI);
        } else yield* say(T.FR_MOCHI_AGAIN);
        continue;
      }
      se('se_c3_aq_glass', { vol: 0.5 });
      setFlag(FF.yubi, 1);
      yield* say(T.FR_YUBI);
      if (meN() < 3) yield* say(T.FR_MADA_MIRU);
    }
  } finally {
    yield* closePanel(p);
  }
  setFlag(FF.fureai, 1);
  yield* say(T.FR_FUREAI_END);
}

// ================================================================ 台本

/** 回廊の 南の 壁の 戸（調べる。開いて いれば 暗転で 入る）。 */
registerScript('obj_fr_to', function* (): Co {
  const f = field();
  if (!f) return;
  if (openDoor()) {
    yield* f.warpCo(FUREAI, FR_IN_AT[0], FR_IN_AT[1], 'down', 'se_door', KAIRO);
    return;
  }
  se('se_examine');
  if (frFuda()) {
    yield* say3(T.FR_TO_FUDA);
    return;
  }
  if (!frOpen()) {
    yield* say3(T.FR_TO_SHIZUKA);
    return;
  }
  se('se_door', { vol: 0.6 });
  yield* say3(T.FR_TO_OPEN);
  setFlag(FF.to, 1);
  setFlag(FF.start, 1);
  yield* f.warpCo(FUREAI, FR_IN_AT[0], FR_IN_AT[1], 'down', 'se_door', KAIRO);
});

/** 1 水の ない 磯（入って すぐ、1回）。グソっ君が 水槽に いる ままなら（セーブから）その 形に。 */
registerScript('evt_fr_enter', function* (): Co {
  if (!inCh3()) return;
  if (flag(FF.in)) {
    if (knHere() && frOpen()) knTank(true);
    else setFlag(FF.in, 0);
  }
  if (flag(FF.inn) || !frOpen()) return;
  setFlag(FF.inn, 1);
  yield 400;
  yield* say(T.FR_IN);
});

/** 2・5 貼り紙。 */
registerScript('obj_fr_harigami', function* (): Co {
  se('se_examine');
  if (!frOpen()) {
    yield* say3(flag(FF.yomu) ? T.FR_HARIGAMI_SUMI : T.FR_HARIGAMI_AGAIN);
    return;
  }
  if (flag(FF.yomu)) {
    yield* say3(T.FR_HARIGAMI_SUMI);
    yield* esaLine();
    return;
  }
  if (flag(FF.fureai)) {
    // 5 いちばん 下の 字
    yield* say3(T.FR_YOMU_A);
    setFlag(FF.yomu, 1);
    if (flag('flag_sh_tsuzuri') && knHere()) yield* say(T.FR_YOMU_SHITA);
    const b = trim(T.FR_YOMU_B);
    const [talk, ...narr] = b.split(/\n(?=@narr)/);
    if (talk.trim()) yield* say3(talk);
    if (flag(FF.in)) {
      se('se_c3_aq_glass', { vol: 0.4 });
      knTank(false);
      yield 200;
      if (narr.length) yield* say3(narr.join('\n'));
    }
    if (!flag(FF.junban) && !flag(FF.hana)) {
      setFlag(FF.hana, 1);
      yield 300;
      yield* say3(T.FR_HANAMARU);
    }
    yield* esaLine();
    setFlag(FF.done, 1);
    addMp(2);
    se('se_item');
    yield* say3(T.FR_REWARD);
    return;
  }
  if (!flag(FF.yaku)) {
    setFlag(FF.yaku, 1);
    yield* say3(T.FR_HARIGAMI);
  } else yield* say3(T.FR_HARIGAMI_AGAIN);
  yield* esaLine();
});

/** S19 の あと、貼り紙で 1回。 */
function* esaLine(): Co {
  if (!flag('flag_ch3_esa_done') || flag(FF.esa) || !knHere()) return;
  setFlag(FF.esa, 1);
  yield* say(T.FR_ESA_KN);
}

/** 3 生き物 役・4 目と 指（大写し）・済んだ あとの くぼみ。 */
registerScript('obj_fr_suisou', function* (): Co {
  se('se_examine');
  if (!knHere() || !frOpen()) {
    yield* say3(frDone() ? T.FR_KUBOMI : T.FR_SUISOU_HITORI);
    return;
  }
  if (frDone()) {
    yield* say3(T.FR_KUBOMI);
    if (!flag(FF.kubomi)) {
      setFlag(FF.kubomi, 1);
      yield* say(T.FR_KUBOMI_KN);
    }
    return;
  }
  if (!flag(FF.yaku)) {
    yield* say(T.FR_SUISOU_MAE);
    return;
  }
  if (!flag(FF.in)) {
    if (!flag(FF.ikimono)) {
      yield* say(T.FR_YAKU_A);
      setFlag(FF.ikimono, 1);
      se('se_c3_aq_glass', { vol: 0.5 });
      knTank(true);
      yield 300;
      yield* say(T.FR_YAKU_B);
    } else {
      const [talk, ...narr] = T.FR_YAKU_AGAIN.split(/\n(?=@narr)/);
      yield* say(talk);
      se('se_c3_aq_glass', { vol: 0.5 });
      knTank(true);
      yield 300;
      yield* say3(narr.join('\n'));
    }
    if (flag(FF.fureai)) return;
  }
  if (flag(FF.fureai)) {
    yield* say3(T.FR_FUREAI_END.split(/\n(?=@narr)/).slice(1).join('\n'));
    return;
  }
  if (!flag(FF.te)) {
    yield* say(T.FR_TE_MADA);
    return;
  }
  if (!flag(FF.me) && !flag(FF.yubi)) yield* say(T.FR_FUREAI_A);
  yield* fureaiGame();
});

/** 4 手（手洗い場）。 */
registerScript('obj_fr_jaguchi', function* (): Co {
  se('se_examine');
  setFlag(FF.jag, 1);
  if (!frOpen() || !flag(FF.yaku)) {
    yield* say3(T.FR_JAGUCHI);
    return;
  }
  if (flag(FF.te)) {
    yield* say3(T.FR_JAGUCHI_SUMI);
    return;
  }
  for (;;) {
    const ans = yield* say3(T.FR_JAGUCHI_ASK);
    if (ans === 0) break;
    if (ans < 0) return;
    if (knHere()) yield* say(T.FR_SEKKEN);
    else return;
  }
  se('se_h_watercup', { vol: 0.8 });
  yield 300;
  setFlag(FF.te, 1);
  yield* say3(T.FR_MIZU);
});

registerScript('obj_fr_oke', function* (): Co {
  se('se_examine');
  setFlag(FF.oke, 1);
  yield* say3(T.FR_OKE);
});
registerScript('obj_fr_fumidai', function* (): Co {
  se('se_examine');
  setFlag(FF.fumi, 1);
  yield* say3(T.FR_FUMIDAI);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.fureai(step = 'to', auto = false, mochi = false)（auto：大写しを 自動で 選ぶ。mochi：指で 1回 持ち上げる）
 *   'fuda'   S16 の 間（回廊の 前）、回廊の 南の 戸の 前 (33,5) 下向き（札だけ）
 *   'to'     段階3、S16 の あと、回廊の 南の 戸の 前 (33,5) 下向き（開く）
 *   'in'     戸が 開いた あと、ふれあいの 磯の 北の 戸の 下 (6,2)（入った ときの 1回）
 *   'yaku'   入った あと、貼り紙の 前 (1,2) 上向き
 *   'suisou' 貼り紙の あと、水槽の 前 (6,2) 下向き（生き物 役）
 *   'te'     グソっ君が 水槽に いる、手洗い場の 前 (9,2) 右向き
 *   'me'     手を 洗った あと、水槽の 前 (6,2) 下向き（大写し）
 *   'yomu'   3つ すんだ あと、貼り紙の 前 (1,2) 上向き（いちばん 下の 字）
 *   'done'   すんだ あと、水槽の 前 (6,2) 下向き
 *   'late'   S20 の あと、回廊の 南の 戸の 前（閉まった まま）
 */
if (import.meta.env.DEV) {
  registerDebug('fureai', (step = 'to', auto = false, mochi = false) => {
    qaAuto = !!auto;
    qaMochi = !!mochi;
    cmd().jump?.('ch3:kairo', true);
    if (flag(FF.in)) knTank(false);
    for (const id of Object.values(FF)) setFlag(id, 0);
    setFlag('flag_ch3_stage', 3);
    setFlag('flag_ch3_aq_enter', 1);
    setFlag('flag_ch3_kairo_done', 1);
    setFlag('flag_ch3_tsugao1', 0);
    const go = (m: string, x: number, y: number, d: string, after?: () => void) => {
      setTimeout(() => {
        cmd().warp?.(m, x, y, d);
        if (after) setTimeout(after, 400);
      }, 700);
      return cmd().warp?.(m, x, y, d);
    };
    if (step === 'fuda') {
      setFlag('flag_ch3_kairo_done', 0);
      return go(KAIRO, TO_MAE[0], TO_MAE[1], 'down');
    }
    if (step === 'to') return go(KAIRO, TO_MAE[0], TO_MAE[1], 'down');
    if (step === 'late') {
      setFlag('flag_ch3_tsugao1', 1);
      return go(KAIRO, TO_MAE[0], TO_MAE[1], 'down');
    }
    setFlag(FF.to, 1);
    setFlag(FF.start, 1);
    if (step === 'in') return go(FUREAI, FR_IN_AT[0], FR_IN_AT[1], 'down');
    setFlag(FF.inn, 1);
    if (step === 'yaku') return go(FUREAI, 1, 2, 'up');
    setFlag(FF.yaku, 1);
    if (step === 'suisou') return go(FUREAI, 6, 2, 'down');
    setFlag(FF.ikimono, 1);
    const tank = () => knTank(true);
    if (step === 'te') return go(FUREAI, 9, 2, 'right', tank);
    setFlag(FF.te, 1);
    if (step === 'me') return go(FUREAI, 6, 2, 'down', tank);
    setFlag(FF.me, 7);
    setFlag(FF.yubi, 1);
    setFlag(FF.fureai, 1);
    if (step === 'yomu') return go(FUREAI, 1, 2, 'up', tank);
    setFlag(FF.yomu, 1);
    setFlag(FF.done, 1);
    return go(FUREAI, 6, 2, 'down');
  });

  registerDebug('frState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(FF)) flags[k] = flag(id);
    const f = field();
    const p = game.ui.widgets.find((w) => w instanceof FureaiPanel) as FureaiPanel | undefined;
    return {
      flags,
      open: frOpen(),
      door: openDoor(),
      kn: f?.follower ? { visible: f.follower.visible, at: [f.follower.tileX, f.follower.tileY] } : null,
      panel: p ? { phase: p.phase, cur: p.cur } : null,
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px (names filled in); no 天丼; no clock time; no さん in the narration. */
export function frTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '本日も、休館', 'おかわり、あるよ', 'もう 1杯', '暗くて しめった', 'いただき', '牛は、しゃべらん', 'ダンゴムシ', 'ポコシャ', '前にも'];
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
      for (const raw of fillNames(v).split('\n')) {
        const t = raw.trim();
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || !t) {
          flush();
          if (t.startsWith('@')) {
            who = t.slice(1);
            if (!SPEAKERS[who] && who !== 'narr' && who !== 'sys' && !who.includes(':')) bad.push(`${name}: speaker ${who}`);
          }
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
  walkT('fr', T.FR_TEXTS);
  // the close-up's words: the right column, the keys under the picture
  const room = SX + CW - RX - 2;
  for (const l of [FR_UI.me, FR_UI.yubi]) if (measure(l) > room) bad.push(`ui: ${l}: ${measure(l)}px > ${room}`);
  FR_UI.parts.forEach((l, i) => {
    const mark = i < 3 ? FR_UI.seen : FR_UI.touched;
    if (8 + measure(l) + 6 + measure(mark) > room) bad.push(`ui: ${l}+${mark}: wide`);
  });
  if (measure(FR_UI.keys) > RX - SX - 16) bad.push(`ui keys: ${measure(FR_UI.keys)}px > ${RX - SX - 16}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('frText', () => frTextCheck());
