// 型ぬき 番付（01_ch1_index の 変更の 記録 2026-10-13、docs/ideas/2026-10-13.md の 案3）の 画面 2つ：
//
//   ・KatanukiGame：大写しの 型ぬき。うす桃色の 板に 型の 線。決定を 押す あいだ 針が 線を すすみ、長く 押すほど
//     速い（1.4秒で いちばん 速く）。曲がり角や 細い ところで 速すぎると、板の はしへ ひびが のびる（はしに
//     とどくと 割れる）。指を はなすと ひびは 少し ふさがる。グソっ君の はさみは しめって いて、押して いる
//     あいだ 板が しめる（右の めもり）。しめると やわらかく なって ぬきやすいが、しめりすぎると 線が とける。
//     コツ（番付の 5人）で 助けが 増える：さや＝はじめに 線が 1回 光る（細い ところに 印）、ひより＝はなすと
//     ひびが ふさがるのが 見える（速く ふさがる）、ちず＝めもりに ちょうどの 帯、なんばるわん＝1枚に 1回
//     「負けない！」（割れる ところで もちこたえる）、ピー・コック＝最後の 角の 手前の 印。段階2 の 板は、
//     北東へ のびる ひびだけ 少し 速い（小さな いじわる）。
//     型：ひょうたん（ふくらみ2つと へた）・かさ（柄の 曲がり）・ちょうちょ（細い 触角）・いかり（輪と 2本の つめ）。
//     いかりは 細い ところを 1つ ぬける たびに グソっ君の 1行（下の 帯）。
//   ・BanzukeCard：『型ぬき 名人 番付』の 寄り（先週の 夏まつり → 書きかえの あと）。書きかえでは グソっ君の
//     札が 左から 書かれて いく（write 0〜1）。
//
//   iPad 横（ボタンが 下の 角）でも かからない よう、窓は y 6〜148 の まん中に おく（markText）。

import type { Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import type { Input } from '../engine/input';
import { W } from '../engine/screen';
import { ease } from '../engine/tween';
import { markText } from '../engine/textzones';
import { sfx } from '../audio';
import { drawDigits, digitsWidth } from './digits';
import { drawWindow, UI } from './window';
import { BANZUKE_CARD, BANZUKE_ROWS, IKARI_COUNT, KATA_NAME, KATA_UI, type KataKey, type TipKey } from '../data/text/katanuki';
import { HOWTO } from '../data/text/howto';

// ================================================================ 型の 線（板の 上の px、閉じた 線）

type Pt = [number, number];

interface Shape {
  /** 1px ごとの 点 */
  pts: Pt[];
  /** 点ごとの あぶなさ 0〜1（曲がり・細さ） */
  danger: number[];
  /** 外向きの 向き（ひびの 向き） */
  nrm: Pt[];
  /** いかりの グソっ君の 1行の 位置（点の 番号） */
  marks: number[];
  /** 最後の 角の 手前（ピー・コックの 印） */
  tame: number;
  /** 線の 内側（ぬける ぶん）の 絵 */
  piece: HTMLCanvasElement;
}

/** 板の 大きさ（px）。 */
export const BOARD_W = 164;
export const BOARD_H = 106;

function arc(out: Pt[], cx: number, cy: number, r: number, a0: number, a1: number): void {
  const n = Math.max(4, Math.ceil((Math.abs(a1 - a0) * r) / 1.5));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
}

/** The outline of each shape, round 0,0 (y down), and the indices of its marked corners. */
function outline(k: KataKey): { pts: Pt[]; marks: number[]; scale: number } {
  const p: Pt[] = [];
  const marks: number[] = [];
  if (k === 'hyoutan') {
    // two bulges (top r13, bottom r20) and the little stem on top
    arc(p, 0, -15, 13, 0.862, -1.416);
    p.push([2, -27.85], [2, -33], [-2, -33], [-2, -27.85]);
    arc(p, 0, -15, 13, -1.725, -4.004);
    arc(p, 0, 13, 20, 4.276, -1.135);
    return { pts: p, marks, scale: 1.35 };
  }
  if (k === 'kasa') {
    // the canopy over the top (a point at its tip), the scalloped edge, the handle and its hook
    arc(p, 0, -2, 34, -Math.PI, -Math.PI / 2 - 0.045);
    p.push([0, -41]);
    arc(p, 0, -2, 34, -Math.PI / 2 + 0.045, 0);
    const scallop = (x1: number, x0: number) => {
      for (let i = 1; i <= 16; i++) {
        const t = i / 16;
        p.push([x1 + (x0 - x1) * t, -2 - 4 * Math.sin(Math.PI * t)]);
      }
    };
    scallop(34, 18);
    scallop(18, 2.5);
    p.push([2.5, 26]);
    arc(p, -4.5, 26, 7, 0, Math.PI);
    p.push([-11.5, 21], [-6.5, 21]);
    arc(p, -4.5, 26, 2, Math.PI, 0);
    p.push([-2.5, -2]);
    scallop(-2.5, -18);
    scallop(-18, -34);
    return { pts: p, marks, scale: 1.2 };
  }
  if (k === 'chou') {
    // four wings (the upper pair larger) round a thin body, two thin feelers
    const N = 2400;
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
      let r = 34 * (0.2 + 0.8 * Math.pow(Math.abs(Math.sin(2 * a)), 0.8)) * (Math.sin(a) < 0 ? 1.12 : 0.86);
      for (const fa of [-Math.PI / 2 - 0.13, -Math.PI / 2 + 0.13]) {
        let d = a - fa;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        r += 15 * Math.exp(-((d / 0.03) ** 2));
      }
      p.push([Math.cos(a) * r, Math.sin(a) * r + 3]);
    }
    return { pts: p, marks, scale: 1.12 };
  }
  // いかり：the ring, the shaft with its stock, the arms and the two flukes
  arc(p, 0, -30, 7, 1.936, 2 * Math.PI + 1.206);
  marks.push(p.length - 1);
  p.push([2.5, -20], [13, -20], [13, -15], [2.5, -15], [2.5, 18.83]);
  arc(p, 0, 0, 19, 1.439, -0.26);
  p.push([27, -15]);
  marks.push(p.length - 1);
  arc(p, 0, 0, 24, -0.12, Math.PI + 0.12);
  p.push([-27, -15]);
  marks.push(p.length - 1);
  arc(p, 0, 0, 19, Math.PI + 0.26, 1.703);
  p.push([-2.5, -15], [-13, -15], [-13, -20], [-2.5, -20]);
  marks.push(p.length - 2);
  p.push([-2.5, -23.46]);
  return { pts: p, marks, scale: 1.2 };
}

const shapes = new Map<KataKey, Shape>();

export function kataShape(k: KataKey): Shape {
  const hit = shapes.get(k);
  if (hit) return hit;
  const o = outline(k);
  // scale and centre on the board
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of o.pts) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const src = o.pts.map(([x, y]) => [BOARD_W / 2 + (x - cx) * o.scale, BOARD_H / 2 + (y - cy) * o.scale] as Pt);
  // resample every 1px along the closed line (and where the marked corners fall)
  const pts: Pt[] = [];
  const at: number[] = [];
  let carry = 0;
  for (let i = 0; i < src.length; i++) {
    const a = src[i];
    const b = src[(i + 1) % src.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    at.push(pts.length);
    let s = carry;
    while (s < len) {
      const t = s / len;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      s += 1;
    }
    carry = s - len;
  }
  const n = pts.length;
  const P = (i: number) => pts[((i % n) + n) % n];
  // the danger: how sharply it turns, and how close the other side of the piece is
  const danger: number[] = [];
  const nrm: Pt[] = [];
  let mx = 0, my = 0;
  for (const [x, y] of pts) {
    mx += x / n;
    my += y / n;
  }
  for (let i = 0; i < n; i++) {
    const a = P(i - 3), b = P(i), c = P(i + 3);
    const a1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const a2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let da = Math.abs(a2 - a1);
    if (da > Math.PI) da = Math.PI * 2 - da;
    const curv = Math.min(1, da / 1.0);
    let near = 99;
    for (let j = 0; j < n; j++) {
      let dj = Math.abs(i - j);
      dj = Math.min(dj, n - dj);
      if (dj < 10) continue;
      const d = Math.hypot(pts[j][0] - b[0], pts[j][1] - b[1]);
      if (d < near) near = d;
    }
    const thin = Math.max(0, Math.min(1, (7 - near) / 5));
    danger.push(Math.max(curv, thin));
    // the normal pointing away from the piece
    let nx = -(c[1] - a[1]);
    let ny = c[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    if (nx * (b[0] - mx) + ny * (b[1] - my) < 0) {
      nx = -nx;
      ny = -ny;
    }
    nrm.push([nx, ny]);
  }
  // spread each corner a little (the needle feels it coming)
  const spread = danger.map((_, i) => {
    let m = 0;
    for (let k = -2; k <= 2; k++) m = Math.max(m, danger[((i + k) % n + n) % n] * (1 - Math.abs(k) * 0.15));
    return m;
  });
  // the last corner before the end
  let tame = n - 1;
  for (let i = n - 12; i > n * 0.5; i--) {
    if (spread[i] > 0.6) {
      let j = i;
      while (j > 0 && spread[j - 1] > 0.6) j--;
      tame = Math.max(0, j - 7);
      break;
    }
  }
  const sh: Shape = { pts, danger: spread, nrm, marks: o.marks.map((m) => at[m] ?? 0), tame, piece: pieceArt(pts) };
  shapes.set(k, sh);
  return sh;
}

// ================================================================ 絵：板・ぬけた 型・型の 小さな 絵

const C = {
  board: '#F2C9C4',
  boardLt: '#FBE3DC',
  boardDk: '#DDA9A6',
  boardEdge: '#B97E80',
  speck: '#E8B7B3',
  groove: '#C99096',
  grooveDone: '#9A5C66',
  crumb: '#FFF3EE',
  crack: '#6E3A44',
  crackLt: '#C08A90',
  wet: '#C48A92',
  needle: '#D6DCE4',
  needleDk: '#5A6270',
  head: '#E23B2E',
  water: '#6FB5E0',
  waterDk: '#3C7FB0',
  band: '#F2C14E',
  shadow: '#5B4A7A',
};

function inside(pts: Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** The piece inside the line (lit from the top left), on a canvas the board's size. */
function pieceArt(pts: Pt[]): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(BOARD_W, BOARD_H);
  const step = Math.max(1, Math.floor(pts.length / 220));
  const poly = pts.filter((_, i) => i % step === 0);
  const inMap: boolean[] = [];
  for (let y = 0; y < BOARD_H; y++) for (let x = 0; x < BOARD_W; x++) inMap.push(inside(poly, x + 0.5, y + 0.5));
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < BOARD_W && y < BOARD_H && inMap[y * BOARD_W + x];
  for (let y = 0; y < BOARD_H; y++)
    for (let x = 0; x < BOARD_W; x++) {
      if (!at(x, y)) continue;
      let col: string = C.board;
      if (!at(x - 1, y) || !at(x, y - 1)) col = C.boardLt;
      else if (!at(x + 1, y) || !at(x, y + 1)) col = C.boardDk;
      else if ((x * 7 + y * 13) % 29 === 0) col = C.speck;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  return c;
}

let boardCache: HTMLCanvasElement | null = null;

/** The pale pink board with its bevel and specks. */
function boardArt(): HTMLCanvasElement {
  if (boardCache) return boardCache;
  const [c, ctx] = makeCanvas(BOARD_W, BOARD_H);
  for (let y = 0; y < BOARD_H; y++)
    for (let x = 0; x < BOARD_W; x++) {
      // rounded corners
      const cx = x < 3 ? 3 - x : x > BOARD_W - 4 ? x - (BOARD_W - 4) : 0;
      const cy = y < 3 ? 3 - y : y > BOARD_H - 4 ? y - (BOARD_H - 4) : 0;
      if (cx * cx + cy * cy > 9) continue;
      let col: string = C.board;
      if (x === 0 || y === 0 || cx * cx + cy * cy > 4) col = C.boardLt;
      else if (x === BOARD_W - 1 || y === BOARD_H - 1) col = C.boardEdge;
      else if (x === BOARD_W - 2 || y === BOARD_H - 2) col = C.boardDk;
      else {
        const h = (x * 374761393 + y * 668265263) >>> 0;
        if (h % 23 === 0) col = C.speck;
        else if (h % 97 === 0) col = C.boardLt;
      }
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  boardCache = c;
  return c;
}

const icons = new Map<string, HTMLCanvasElement>();

/** A small picture of a cut-out shape (the notebook page): its outline filled pink, scaled down. */
export function kataIcon(k: KataKey, size = 28): HTMLCanvasElement {
  const key = `${k}:${size}`;
  const hit = icons.get(key);
  if (hit) return hit;
  const sh = kataShape(k);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of sh.pts) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const s = (size - 2) / Math.max(x1 - x0, y1 - y0);
  const [c, ctx] = makeCanvas(size, size);
  const ox = (size - (x1 - x0) * s) / 2;
  const oy = (size - (y1 - y0) * s) / 2;
  const step = Math.max(1, Math.floor(sh.pts.length / 160));
  const poly = sh.pts.filter((_, i) => i % step === 0).map(([x, y]) => [(x - x0) * s + ox, (y - y0) * s + oy] as Pt);
  const inn = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && inside(poly, x + 0.5, y + 0.5);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!inn(x, y)) continue;
      const edge = !inn(x - 1, y) || !inn(x + 1, y) || !inn(x, y - 1) || !inn(x, y + 1);
      ctx.fillStyle = edge ? C.grooveDone : !inn(x - 1, y - 1) ? C.boardLt : C.board;
      ctx.fillRect(x, y, 1, 1);
    }
  icons.set(key, c);
  return c;
}

/** The red pen's mark: はなまる (a spiral with petals), まる, ちょん (a tick). `k` 0〜1 draws it in. */
export function drawPenMark(g: Gfx, kind: 'hanamaru' | 'maru' | 'chon', cx: number, cy: number, k = 1): void {
  const col = UI.accent;
  if (kind === 'chon') {
    const n = Math.round(6 * k);
    for (let i = 0; i < n; i++) g.px(cx - 3 + i, cy + (i < 2 ? i : 2 - (i - 2)), col);
    return;
  }
  const r = kind === 'hanamaru' ? 6 : 5;
  const steps = Math.round(48 * k);
  for (let i = 0; i < steps; i++) {
    const a = (i / 48) * Math.PI * 2 - Math.PI / 2;
    const rr = kind === 'hanamaru' ? r - (i / 48) * 3 : r;
    g.px(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, col);
  }
  if (kind === 'hanamaru' && k >= 1) {
    // the petals round it
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.ring(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 2, col);
    }
  }
}

// ================================================================ 型ぬきの 画面

export type KataResult = 'clear' | 'ware' | 'toke' | 'yame';
export type KataGrade = 'hanamaru' | 'maru' | 'chon';

export interface KataOpts {
  tips: Set<TipKey>;
  /** 段階2 の 板（北東の ひびが 少し 速い） */
  ne: boolean;
}

const PANEL_W = 272;
const PANEL_H = 142;
const PANEL_Y = 6;
const BX = 10;
const BY = 10;

/** 押した 長さ → 速さ（px/秒）。 */
const speedOf = (hold: number) => 10 + 62 * Math.pow(Math.min(1, hold / 1400), 1.3);

export class KatanukiGame implements Widget {
  /** QA (__game.cmd.katanukiBot)：押す・はなすを 自動で（ひびを 出さない 速さで） */
  static bot = false;
  /** QA：いまの 1枚（__game.cmd.katanukiState） */
  static last: KatanukiGame | null = null;
  /** QA：針・ひび・しめり */
  qa(): Record<string, number | string> {
    return { kata: this.kata, pos: Math.round(this.pos), len: this.sh.pts.length, crack: +this.crack.toFixed(2), maxCrack: +this.maxCrack.toFixed(2), wet: +this.wet.toFixed(2), melt: +this.melt.toFixed(2), result: this.done ? this.result : '' };
  }
  modal = true;
  /** 大写し：タッチの けっていが 画面の どこでも（engine/touch.ts）。 */
  closeup = true;
  /** はじめの カード（改善会議 10-25 の1、ui/closeup.ts）。 */
  howto = HOWTO.katanuki;
  done = false;
  result: KataResult = 'yame';
  grade: KataGrade = 'chon';
  /** いちばん のびた ひび（0〜1） */
  maxCrack = 0;
  private t = 0;
  private out = -1;
  private sh: Shape;
  /** 針の 位置（線の 上の px） */
  private pos = 0;
  private hold = 0;
  private v = 0;
  private wet = 0;
  private melt = 0;
  private crack = 0;
  private crackAt = 0;
  private crackPath: Pt[] = [];
  private crackNE = false;
  private makenaiUsed = false;
  private makenaiT = -1;
  /** さやの コツ：はじめの 光（ms）。0 で 始まる */
  private intro: number;
  private endT = -1;
  private brokeT = -1;
  private scrape = 0;
  private crumbs: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  private say = '';
  private sayT = 0;
  private nextMark = 0;
  private healGlow = 0;
  private seed = Math.floor(Math.random() * 1e6);

  constructor(
    private kata: KataKey,
    private o: KataOpts,
  ) {
    this.sh = kataShape(kata);
    KatanukiGame.last = this;
    this.intro = o.tips.has('sae') ? 1500 : 0;
  }

  get x(): number {
    return Math.round((W - PANEL_W) / 2);
  }

  /** もどる（改善会議 10-25 の4、ui/closeup.ts）：ぬいている 間は やめる（グソっ君「きょうは ここまでや」）。 */
  quittable(): boolean {
    return this.endT < 0 && this.brokeT < 0 && this.out < 0;
  }
  quit(): boolean {
    this.finish('yame');
    return true;
  }

  private finish(r: KataResult): void {
    this.result = r;
    if (this.out < 0) this.out = 0;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    if (this.out >= 0) {
      this.out += dt;
      if (this.out >= 180) this.done = true;
      return;
    }
    if (this.sayT > 0) this.sayT -= dt;
    if (this.makenaiT >= 0) {
      this.makenaiT += dt;
      if (this.makenaiT > 1100) this.makenaiT = -1;
    }
    this.crumbs = this.crumbs.filter((c) => (c.life -= dt) > 0);
    for (const c of this.crumbs) {
      c.x += (c.vx * dt) / 1000;
      c.y += (c.vy * dt) / 1000;
      c.vy += (120 * dt) / 1000;
    }
    // the end: the piece out and the red pen; or the board in two
    if (this.endT >= 0) {
      this.endT += dt;
      if (this.endT > 1700 || (this.endT > 500 && input.pressed('confirm'))) this.finish('clear');
      return;
    }
    if (this.brokeT >= 0) {
      this.brokeT += dt;
      if (this.brokeT > 1000) this.finish(this.melt >= 1 ? 'toke' : 'ware');
      return;
    }
    if (this.t < 260 + this.intro) return;
    if (input.pressed('cancel')) {
      sfx('se_cancel');
      this.finish('yame');
      return;
    }
    const s = dt / 1000;
    const n = this.sh.pts.length;
    const pressing = KatanukiGame.bot ? this.botPress(dt) : input.down('confirm');
    if (pressing) {
      this.hold += dt;
      this.v = speedOf(this.hold);
      this.wet = Math.min(1, this.wet + 0.035 * s);
    } else {
      this.hold = 0;
      this.v = 0;
      this.wet = Math.max(0, this.wet - 0.06 * s);
    }
    // too wet: the line melts
    if (this.wet > 0.85 && pressing) this.melt += s * (this.wet - 0.85) * 5;
    else this.melt = Math.max(0, this.melt - s * 0.3);
    if (this.melt >= 1) {
      this.melt = 1;
      this.brokeT = 0;
      sfx('se_drip', { pitch: 0.7, vol: 0.8 });
      return;
    }
    const i = Math.min(n - 1, Math.floor(this.pos));
    if (pressing) {
      const soft = 1 + 0.35 * Math.max(0, Math.min(1, (this.wet - 0.25) / 0.35));
      const safe = (16 + 58 * (1 - this.sh.danger[i])) * soft;
      if (this.v > safe) {
        if (this.crack < 0.02) this.newCrack(i);
        const k = (this.v / safe - 1) * 1.5 * (this.crackNE && this.o.ne ? 1.3 : 1);
        this.crack += k * s;
      }
      const before = this.pos;
      this.pos = Math.min(n, this.pos + this.v * s);
      this.scrape += this.pos - before;
      if (this.scrape > 5) {
        this.scrape = 0;
        sfx('se_pen_write', { pitch: 1.9 + Math.random() * 0.3, vol: 0.18 });
        const [px, py] = this.sh.pts[Math.min(n - 1, Math.floor(this.pos))];
        this.crumbs.push({ x: px, y: py, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 380 });
      }
      // いかり：グソっ君の 1行
      if (this.kata === 'ikari') {
        while (this.nextMark < this.sh.marks.length && this.pos >= this.sh.marks[this.nextMark]) {
          this.say = IKARI_COUNT[this.nextMark] ?? '';
          this.sayT = 1800;
          this.nextMark++;
        }
      }
    } else if (this.crack > 0) {
      const heal = this.o.tips.has('hiyori') ? 0.3 : 0.12;
      this.crack = Math.max(0, this.crack - heal * s);
      this.healGlow = this.o.tips.has('hiyori') ? 1 : 0;
    }
    if (pressing) this.healGlow = 0;
    this.maxCrack = Math.max(this.maxCrack, Math.min(1, this.crack));
    if (this.crack >= 1) {
      if (this.o.tips.has('madam') && !this.makenaiUsed) {
        this.makenaiUsed = true;
        this.crack = 0.55;
        this.makenaiT = 0;
        this.hold = 0;
        sfx('se_stamp_heavy', { pitch: 1.3, vol: 0.6 });
      } else {
        this.crack = 1;
        this.brokeT = 0;
        sfx('se_part_break', { pitch: 1.6, vol: 0.7 });
        return;
      }
    }
    if (this.pos >= n) {
      this.endT = 0;
      this.grade = this.makenaiUsed || this.maxCrack >= 0.65 ? 'chon' : this.maxCrack >= 0.3 ? 'maru' : 'hanamaru';
      sfx('se_hanamaru_draw', { vol: 0.7 });
    }
  }

  /** QA: press while the speed it would reach stays under the safe speed of the next few px. */
  private botPress(dt: number): boolean {
    if (this.wet > 0.8) return false;
    const n = this.sh.pts.length;
    const soft = 1 + 0.35 * Math.max(0, Math.min(1, (this.wet - 0.25) / 0.35));
    let safe = 99;
    for (let d = 0; d < 10; d++) safe = Math.min(safe, (16 + 58 * (1 - this.sh.danger[Math.min(n - 1, Math.floor(this.pos) + d)])) * soft);
    return speedOf(this.hold + dt) <= safe * 0.95;
  }

  /** A new crack from the needle out to the board's edge (jagged, seeded). */
  private newCrack(i: number): void {
    const [x, y] = this.sh.pts[i];
    const [nx, ny] = this.sh.nrm[i];
    this.crackAt = i;
    // towards the edge
    let len = 0;
    while (len < 200) {
      const cx = x + nx * len;
      const cy = y + ny * len;
      if (cx < 1 || cy < 1 || cx > BOARD_W - 2 || cy > BOARD_H - 2) break;
      len += 1;
    }
    this.crackNE = nx > 0.25 && ny < -0.25;
    const pts: Pt[] = [[x, y]];
    let h = (this.seed + i * 7919) >>> 0;
    const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    for (let d = 3; d < len; d += 3) {
      const j = (rnd() - 0.5) * 3;
      pts.push([x + nx * d - ny * j, y + ny * d + nx * j]);
    }
    pts.push([x + nx * len, y + ny * len]);
    this.crackPath = pts;
  }

  draw(g: Gfx): void {
    const k = Math.min(1, this.t / 200);
    const a = this.out >= 0 ? Math.max(0, 1 - this.out / 180) : ease.quadOut(k);
    if (a <= 0) return;
    const x = this.x;
    const y = PANEL_Y + Math.round((1 - ease.backOut(k)) * 8);
    markText(x, PANEL_Y, PANEL_W, PANEL_H);
    drawWindow(g, x, y, PANEL_W, PANEL_H, UI, a, { curl: false });
    if (a < 0.6) return;
    g.alpha(a, () => this.body(g, x, y));
  }

  private body(g: Gfx, px: number, py: number): void {
    let shake = 0;
    if (this.brokeT >= 0 && this.brokeT < 260) shake = Math.round(Math.sin(this.brokeT / 18) * 2);
    const bx = px + BX + shake;
    const by = py + BY;
    const sh = this.sh;
    const n = sh.pts.length;
    // the board's shadow and the board
    g.rect(bx + 2, by + 3, BOARD_W, BOARD_H, C.shadow, 0.35);
    if (this.endT >= 0) {
      // the board with the hole, the piece lifted beside it
      g.img(boardArt(), bx, by);
      g.alpha(0.55, () => g.img(sh.piece, bx, by, { tint: C.boardEdge, tintAmount: 1 }));
      const lift = Math.round(ease.backOut(Math.min(1, this.endT / 400)) * 4);
      g.alpha(0.35, () => g.img(sh.piece, bx + 2, by + 2, { tint: C.shadow, tintAmount: 1 }));
      g.img(sh.piece, bx, by - lift);
      const mk = Math.min(1, Math.max(0, (this.endT - 450) / 600));
      if (mk > 0) drawPenMark(g, this.grade, bx + BOARD_W - 14, by + BOARD_H - 14, mk);
    } else {
      g.img(boardArt(), bx, by);
      // the wet spot round the needle
      if (this.wet > 0.05) {
        const [wx, wy] = sh.pts[Math.min(n - 1, Math.floor(this.pos))];
        g.alpha(Math.min(0.45, this.wet * 0.5), () => g.circle(bx + wx, by + wy, 2 + this.wet * 6, C.wet));
      }
      // the line: still to cut (dotted), cut (dark, with crumbs on its edge)
      const intro = this.intro > 0 ? (this.t - 200) / this.intro : 2;
      for (let i = 0; i < n; i++) {
        const [lx, ly] = sh.pts[i];
        if (i < this.pos) {
          g.px(bx + lx, by + ly, C.grooveDone);
        } else if (i % 2 === 0) g.px(bx + lx, by + ly, C.groove);
        // さやの コツ：the light runs along once; the thin places keep a mark
        if (this.o.tips.has('sae')) {
          if (intro < 1.2 && Math.abs(i / n - intro) < 0.025) g.px(bx + lx, by + ly, '#FFFFFF');
          if (intro >= 0 && sh.danger[i] > 0.7 && i >= this.pos && i % 3 === 0 && Math.abs(i / n) < Math.min(1, intro)) g.px(bx + lx, by + ly, C.band);
        }
      }
      // melting: the line goes soft round the needle
      if (this.melt > 0.05) {
        const i0 = Math.floor(this.pos);
        g.alpha(this.melt * 0.8, () => {
          for (let d = -6; d <= 6; d++) {
            const [lx, ly] = sh.pts[Math.max(0, Math.min(n - 1, i0 + d))];
            g.rect(bx + lx - 1, by + ly - 1, 3, 3, C.groove);
          }
        });
      }
      // ピー・コックの コツ：最後の 角の 手前の しるし
      if (this.o.tips.has('kazuo') && this.pos < sh.tame + 4) {
        const [tx, ty] = sh.pts[sh.tame];
        const [nx, ny] = sh.nrm[sh.tame];
        for (let d = 2; d <= 6; d++) g.px(bx + tx + nx * d, by + ty + ny * d, UI.accent);
        if (Math.floor(this.t / 300) % 2 === 0) g.px(bx + tx + nx * 8, by + ty + ny * 8, UI.accent);
      }
      // the crack
      if (this.crack > 0.01 && this.crackPath.length > 1) {
        const c = Math.min(1, this.crack);
        const total = this.crackPath.length - 1;
        const upto = c * total;
        const col = this.healGlow > 0 ? (Math.floor(this.t / 120) % 2 ? C.crackLt : '#FFFFFF') : C.crack;
        for (let j = 0; j < Math.ceil(upto); j++) {
          const p0 = this.crackPath[j];
          const p1 = this.crackPath[j + 1];
          const f = Math.min(1, upto - j);
          g.line(bx + p0[0], by + p0[1], bx + p0[0] + (p1[0] - p0[0]) * f, by + p0[1] + (p1[1] - p0[1]) * f, col);
        }
        if (this.brokeT >= 0) {
          // split: a second branch and the gap
          for (let j = 0; j < total; j++) {
            const p0 = this.crackPath[j];
            g.px(bx + p0[0] + 1, by + p0[1], C.crackLt);
          }
        }
      }
      // crumbs
      for (const c of this.crumbs) g.px(bx + c.x, by + c.y, C.crumb);
      // the needle: a pin from the upper right, its point on the line
      if (this.brokeT < 0) {
        const [nx, ny] = sh.pts[Math.min(n - 1, Math.floor(this.pos))];
        const dip = this.v > 0 ? 1 : 0;
        const tx = bx + nx;
        const ty = by + ny + dip;
        g.line(tx, ty, tx + 9, ty - 13, C.needleDk);
        g.line(tx + 1, ty, tx + 10, ty - 13, C.needle);
        g.circle(tx + 11, ty - 15, 2, C.head);
        g.px(tx + 10, ty - 16, '#FF9A8A');
      }
      // なんばるわんの コツ：負けない！
      if (this.makenaiT >= 0) {
        const kk = Math.min(1, this.makenaiT / 160);
        const cx = bx + BOARD_W / 2;
        const cy = by + BOARD_H / 2;
        g.alpha(Math.min(1, (1100 - this.makenaiT) / 300), () => {
          g.ring(cx, cy, 30 + (1 - kk) * 10, UI.accent);
          g.ring(cx, cy, 29 + (1 - kk) * 10, UI.accent);
          g.text(KATA_UI.makenai, cx, cy - 8, { color: UI.accent, outline: UI.white, align: 'center' });
        });
      }
    }
    // the right column: the shape's name, the wetness gauge
    const rx = px + BX + BOARD_W + 10;
    g.text(KATA_NAME[this.kata], rx, py + 8, { color: UI.text });
    g.text(KATA_UI.shimeri, rx, py + 30, { color: UI.pencil });
    const gx = rx + 4;
    const gy = py + 50;
    const gh = 62;
    g.rect(gx - 1, gy - 1, 14, gh + 2, UI.border);
    g.rect(gx, gy, 12, gh, UI.white);
    const fh = Math.round(gh * this.wet);
    g.rect(gx, gy + gh - fh, 12, fh, this.melt > 0.05 && Math.floor(this.t / 140) % 2 ? C.waterDk : C.water);
    g.rect(gx, gy + gh - fh, 12, 1, '#BFE3F7');
    if (this.o.tips.has('chizu')) {
      // ちずの コツ：ちょうどの 帯
      const b0 = gy + gh - Math.round(gh * 0.7);
      const b1 = gy + gh - Math.round(gh * 0.45);
      g.rect(gx + 13, b0, 3, b1 - b0, C.band);
      g.rect(gx - 4, b0, 3, b1 - b0, C.band);
    }
    // the red pen line for 0.85 (melts above it)
    const my = gy + gh - Math.round(gh * 0.85);
    g.rect(gx, my, 12, 1, UI.accent);
    // the strip under the board: グソっ君's word (いかり) or the cancel note
    const sy = py + BY + BOARD_H + 6;
    if (this.sayT > 0 && this.say) {
      g.text('グソっ君', px + BX, sy, { color: UI.pencil });
      g.text(this.say, px + BX + 72, sy, { color: UI.text });
    }
  }
}

// ================================================================ 番付の 寄り

export type BanzukeState = 'before' | 'yokozuna' | 'ozeki';

export interface BanzukeOpts {
  state: BanzukeState;
  dokugaku?: boolean;
  meijin?: boolean;
  /** 割った 数（書きかえの あと、すみに） */
  wari?: number;
  /** グソっ君の 札を 書いて いる ところ（0〜1。書きかえの 場面） */
  write?: number;
}

const CARD_W = 214;
const ROW = 16;

/**
 * The hand-written ranking, close up: a paper sheet high on the screen while
 * the words run (not modal). It rises in and fades out on its own.
 */
export class BanzukeCard implements Widget {
  modal = false;
  done = false;
  private t = 0;
  private out = -1;
  constructor(public o: BanzukeOpts) {}

  update(dt: number): void {
    this.t += dt;
    if (this.out >= 0) {
      this.out += dt;
      if (this.out >= 220) this.done = true;
    }
  }

  close(): void {
    if (this.out < 0) this.out = 0;
  }

  /** The rows as they stand: [rank (or '' under the one above), side, name, グソっ君's]. */
  private rows(): { rank: string; side: string; name: string; kn: boolean }[] {
    const r: { rank: string; side: string; name: string; kn: boolean }[] = [];
    const st = this.o.state;
    for (const b of BANZUKE_ROWS) {
      if (b.rank === '横綱' && st === 'yokozuna') {
        r.push({ rank: b.rank, side: BANZUKE_CARD.east, name: b.name, kn: false });
        r.push({ rank: '', side: BANZUKE_CARD.west, name: BANZUKE_CARD.kn, kn: true });
      } else if (b.rank === '大関' && st === 'ozeki') {
        r.push({ rank: b.rank, side: '', name: b.name, kn: false });
        r.push({ rank: '', side: '', name: BANZUKE_CARD.kn, kn: true });
      } else r.push({ rank: b.rank, side: '', name: b.name, kn: false });
    }
    return r;
  }

  draw(g: Gfx): void {
    const k = Math.min(1, this.t / 220);
    const a = this.out >= 0 ? Math.max(0, 1 - this.out / 220) : ease.quadOut(k);
    if (a <= 0) return;
    const dy = Math.round((1 - ease.backOut(k)) * 10);
    g.alpha(a, () => this.sheet(g, dy));
  }

  private sheet(g: Gfx, dy: number): void {
    const rows = this.rows();
    const foot = this.o.state !== 'before' && (this.o.wari ?? 0) > 0;
    const h = 10 + 18 + 6 + rows.length * ROW + (foot ? ROW + 2 : 0) + 8;
    const x = Math.round(W / 2 - CARD_W / 2);
    const y = 6 + dy;
    markText(x, 6, CARD_W, h, true);
    // the paper (washi), its shadow, the tape at the top corners
    g.rect(x + 3, y + 4, CARD_W, h, '#0B0B14', 0.4);
    g.rect(x, y, CARD_W, h, '#F4ECD8');
    g.rect(x, y, CARD_W, 1, '#FFF9EA');
    g.rect(x, y + h - 1, CARD_W, 1, '#D8C9A8');
    g.rect(x + CARD_W - 1, y, 1, h, '#D8C9A8');
    for (let i = 0; i < 40; i++) g.px(x + ((i * 53) % (CARD_W - 4)) + 2, y + ((i * 31) % (h - 4)) + 2, '#E6DAC0');
    g.rect(x + 8, y - 3, 18, 6, UI.tape, 0.85);
    g.rect(x + CARD_W - 26, y - 3, 18, 6, UI.tape, 0.85);
    // the title band
    g.rect(x + 6, y + 8, CARD_W - 12, 20, '#B8241E');
    g.text(BANZUKE_CARD.title, x + CARD_W / 2, y + 10, { color: '#FFF6D8', align: 'center' });
    const y0 = y + 34;
    rows.forEach((r, i) => {
      const ry = y0 + i * ROW;
      if (r.rank) {
        g.text(r.rank, x + 10, ry, { color: '#B8241E' });
        if (i > 0) g.rect(x + 8, ry - 1, CARD_W - 16, 1, '#D8C9A8');
      }
      let nx = x + 50;
      if (r.side) {
        g.text(r.side, nx, ry, { color: '#B8241E' });
        nx += 20;
      }
      if (r.kn) {
        // the new slip (light wood), written in from the left
        const w = 4 * 16 + 6;
        const wk = this.o.write ?? 1;
        g.rect(nx - 3, ry, w, ROW - 1, '#E8C890');
        g.rect(nx - 3, ry + ROW - 2, w, 1, '#C8A06A');
        g.clip(nx - 3, ry - 2, Math.round(w * wk), ROW + 2, () => g.text(r.name, nx, ry, { color: UI.text }));
        if (wk < 1) {
          const px = nx - 3 + Math.round(w * wk);
          g.line(px, ry + 12, px + 6, ry + 2, UI.accent);
        }
        if (wk >= 1 && this.o.dokugaku) g.text(BANZUKE_CARD.dokugaku, nx + w + 4, ry, { color: UI.pencil });
        if (wk >= 1 && this.o.meijin) g.text(BANZUKE_CARD.meijin, x + CARD_W - 10 - 32, ry, { color: UI.accent });
      } else g.text(r.name, nx, ry, { color: UI.text });
    });
    // the corner: how many were broken (after the rewrite), small, in pencil
    if (foot) {
      const fy = y0 + rows.length * ROW + 2;
      const s = String(Math.min(999, this.o.wari ?? 0));
      const dw = digitsWidth(s, 1) * 2;
      drawDigits(g, s, x + CARD_W - 10 - dw, fy + 3, { color: UI.pencil, scale: 2 });
      g.text(BANZUKE_CARD.wari, x + CARD_W - 10 - dw - 6, fy, { color: UI.pencil, align: 'right' });
    }
  }
}
