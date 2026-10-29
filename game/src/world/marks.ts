// しるし（改善会議 2026-10-20 の 1・2。docs/kaizen/2026-10-20.md）：
//   2 きらり　まだ調べていない「調べられる物」に、主人公の近く（3マス）だけ小さな「！」
//   1 行き先　グソっ君のヒント〔次、どうする？〕を聞いたあと、その行き先の人・扉・物の上に同じ「！」
//   3 寄り道　短い あいだだけ 遊べる 寄り道の 人の 上に 同じ「！」（addMarkSource。げむきか 10-23 案2 の ツリノ：
//            第3章 S13〜S14 の 短い 窓で 見のがさないように。遠くからでも 見える）
//   4 調べる枠（改善会議 2026-10-27 の3）　今 けってい を押したら 調べる 人・物（field.examineTarget()）の
//            足もとに、四すみの かぎ（「 」を 4つ 地面に 置いた 形）。頭の上の「！」とは 形も 場所も ちがう。
//            歩いている あいだは 相手を 変えない（止まって 0.12 秒 たったら 新しい 相手に うつる。同じ 相手なら
//            そのまま）。会話・大写し・メニューのあいだは 出さない。「しるし：なし」で いっしょに 消える。
//            （改善会議 2026-10-28 の1）線は 2 px、かぎは 6 px。敵のシンボル（kind 'sym'）には 出さない。
//            （改善会議 2026-10-29 の2）しゅんが 枠に かさなる とき（真下から 上を 向いた とき）は、
//            かぎを しゅんの 左右へ 寄せて 少し 小さく（高さは 相手の 足もとの まま）。頭の上へ 上げると
//            相手の 体・顔・帽子に かかるので やめた。しゅんの 体の 所は くりぬく（HD-2D）／しゅんの 下（2D）。
// 1〜3 は同じ形・同じ色（会議：印が2種類あると画面がうるさい）。点滅はおだやかに（明るさが 1.8 秒で
// ゆっくり上下するだけ）。せってい「しるし：あり／なし」で まとめて消せる（ui/settings.ts marks）。
//
// 光らせる物（本筋に関係ない飾りまで光らせない）：obj_ の物のうち
//   ・隠れた品・お金（reward）で、まだ もらっていない物
//   ・押せる ふしぎ（fushigi、その段階で始まっていて まだ押していない物）
//   ・そのときだけ置かれる物（cond に flag・notFlag・taken・notTaken・when がある物：手伝いの場所、
//     符丁の切れはし、日誌、足あと、星見台の虫…）で、まだ調べていない物
// ふつうの飾り（いつも置いてある地の文だけの物）と、人・閉まった扉（door_* の物）は光らせない。
// 「調べた」は interact.ts が flag_seen_look_<id> に残す（前からの flag_seen_<id> も調べた扱い）。
//
// 絵は世界の fx（anchored、'glow' の層）：2D でも HD-2D でも、物の頭の高さ（fxAt の foot）に描く。
// 操作できないあいだ（会話・場面・メニュー）は出さない。
//
// QA（開発サーバー）：__game.cmd.marks()  今の印（きらり・行き先・調べる枠）の一覧

import type { Gfx } from '../engine/gfx';
import { PixelCanvas } from '../engine/pixel';
import { registerDebug } from '../debug';
import { flag } from '../game/state';
import { settings } from '../ui/settings';
import type { Actor } from './actor';
import type { FieldScene } from './field';
import { fxAt, fxElsewhere, registerWorldFx } from './fx';
import { fushigiActive, fushigiDone } from './fushigi';
import type { DoorObj, ExamineObj } from './types';

/** 印の立つ所（世界の px）：x、印の下の端 y、その高さの もとの地面の線 foot。 */
export interface MarkAnchor {
  x: number;
  y: number;
  foot: number;
}

/** きらりが出る近さ（マス、主人公の足から物の四角まで）。 */
const NEAR_TILES = 3;
/** 物の印の高さの上限（px、足もとから）。 */
const MAX_LIFT = 44;
/** 一度に出す きらりの数（近い順）。 */
const MAX_GLINTS = 3;

// ---------------------------------------------------------------- 調べた記録

/** その物を もう調べたか（flag_seen_look_<id>、前からの flag_seen_<id>）。 */
export function looked(id: string): boolean {
  return flag('flag_seen_look_' + id) > 0 || flag('flag_seen_' + id) > 0;
}

const CAUSE_KEYS = ['flag', 'notFlag', 'taken', 'notTaken', 'when'] as const;

/** きらりを出す物か（上の決め方）。 */
export function glintable(o: ExamineObj): boolean {
  if (o.id.startsWith('door_')) return false;
  if (o.reward) return !flag(o.reward.flag);
  if (o.fushigi && fushigiActive(o.fushigi) && !fushigiDone(o.fushigi)) return true;
  const c = o.cond;
  if (c && CAUSE_KEYS.some((k) => c[k] !== undefined)) return !looked(o.id);
  return false;
}

// ---------------------------------------------------------------- 印の高さ

/** 物の頭の上（その物の絵があれば絵の上の端、無ければ四角の上の端）。 */
export function objAnchor(f: FieldScene, o: ExamineObj): MarkAnchor {
  const w = o.w ?? 1;
  const h = o.h ?? 1;
  const x = (o.x + w / 2) * 16;
  if (o.flat) {
    const foot = (o.y + h / 2) * 16 + 4;
    return { x, y: foot - 12, foot };
  }
  // the picture of it: its own prop, else a small prop standing in its rect
  let best: { top: number; foot: number } | null = null;
  for (const p of f.props) {
    if (!p.present || p.art.flat) continue;
    const own = p.obj === o;
    const tx = p.x / 16;
    const ty = p.y / 16;
    if (!own && (tx < o.x || tx >= o.x + w || ty < o.y || ty >= o.y + h || p.art.h > 64)) continue;
    const top = p.y + p.art.oy;
    const foot = p.y + p.art.foot;
    if (own) {
      best = { top, foot };
      break;
    }
    if (!best || top < best.top) best = { top, foot };
  }
  // (a tall picture — the clock tower over its base — keeps the mark within reach of what is examined)
  if (best) return { x, y: Math.max(best.top - 2, best.foot - MAX_LIFT), foot: best.foot };
  const foot = (o.y + h) * 16;
  return { x, y: o.y * 16 - 2, foot };
}

/** 人の頭の上。 */
export function actorAnchor(a: Actor): MarkAnchor {
  return { x: a.x + a.ox, y: a.y + Math.min(0, a.oy) - (a.sprite?.h ?? 24) - 3, foot: a.y };
}

/** 扉の上（扉の高さ 1.5 マスほど）。 */
export function doorAnchor(d: DoorObj): MarkAnchor {
  const foot = (d.y + (d.h ?? 1)) * 16;
  return { x: (d.x + (d.w ?? 1) / 2) * 16, y: foot - 26, foot };
}

// ---------------------------------------------------------------- 行き先（kn_hint.ts が渡す）

let hintMark: ((f: FieldScene) => MarkAnchor | null) | null = null;

/** グソっ君のヒントの行き先（events/kn_hint.ts）。 */
export function setHintMarkSource(fn: (f: FieldScene) => MarkAnchor | null): void {
  hintMark = fn;
}

// ---------------------------------------------------------------- 寄り道の しるし（台本が 渡す）

const extraSources: ((f: FieldScene) => MarkAnchor | null)[] = [];

/** 寄り道の 人の 上の「！」を 足す（その寄り道の 台本が 渡す。出さない ときは null）。 */
export function addMarkSource(fn: (f: FieldScene) => MarkAnchor | null): void {
  extraSources.push(fn);
}

// ---------------------------------------------------------------- きらりの選び

interface Shown {
  a: number;
  at: MarkAnchor;
  want: boolean;
}

const glints = new Map<string, Shown>();
let hint: Shown | null = null;
const extras: (Shown | null)[] = [];
let pickT = 0;
let mapId = '';
let showA = 0;

// ---------------------------------------------------------------- 調べる枠

interface Aim {
  key: string;
  actor?: Actor;
  obj?: ExamineObj;
  a: number;
  /** 出てからの時間（かぎが 外から 寄ってくる）。 */
  t: number;
  want: boolean;
}

/** 止まってから 新しい 相手に うつるまで（ms）。 */
const AIM_SETTLE = 120;
const aims: Aim[] = [];
let stillMs = 0;

function aimKey(t: { actor?: Actor; obj?: ExamineObj }): string {
  return t.actor ? 'a:' + t.actor.id : `o:${t.obj!.id}@${t.obj!.x},${t.obj!.y}`;
}

function updateAim(f: FieldScene, dt: number): void {
  stillMs = f.player.moving ? 0 : stillMs + dt;
  const on = settings.marks && f.controllable;
  const t0 = on ? f.examineTarget() : null;
  // (not on an enemy symbol: walking into it is what happens there)
  const t = t0?.actor?.kind === 'sym' ? null : t0;
  const key = t ? aimKey(t) : '';
  const cur = aims.find((x) => x.want);
  if (!t) {
    if (cur) cur.want = false;
  } else if (cur && cur.key === key) {
    // the same one: it stays (walking along beside it too)
  } else {
    if (cur) cur.want = false;
    // a new one only once he stands still (no flicker while walking past things)
    if (stillMs >= AIM_SETTLE) {
      const old = aims.find((x) => x.key === key);
      if (old) old.want = true;
      else aims.push({ key, actor: t.actor, obj: t.obj, a: 0, t: 0, want: true });
    }
  }
  for (let i = aims.length - 1; i >= 0; i--) {
    const x = aims[i];
    x.t += dt;
    x.a = x.want ? Math.min(1, x.a + dt / 150) : Math.max(0, x.a - dt / 150);
    if (!x.want && x.a <= 0) aims.splice(i, 1);
  }
}

/** 枠の地面の四角（世界の px：左・奥・右・手前）。 */
function aimRect(f: FieldScene, x: Aim): [number, number, number, number] | null {
  if (x.actor) {
    const a = x.actor;
    if (!a.visible) return null;
    const hw = Math.max(a.bw, 10) / 2 + 5;
    const cx = a.x + a.ox;
    const foot = a.y + Math.max(0, a.oy);
    return [cx - hw, foot - 5, cx + hw, foot + 3];
  }
  const o = x.obj!;
  const w = o.w ?? 1;
  const h = o.h ?? 1;
  if (o.flat) return [o.x * 16 + 1, o.y * 16 + 3, (o.x + w) * 16 - 1, (o.y + h) * 16 - 1];
  const at = objAnchor(f, o);
  const hw = Math.min(w * 16, 48) / 2 + 1;
  return [at.x - hw, at.foot - 7, at.x + hw, at.foot + 2];
}

/** 線の太さ（px）と、かぎの長さ（px）。 */
const AIM_LINE = 2;
const AIM_ARM = 6;

/** 2 px の点を 2 つの点のあいだに 並べる（影の色、その上に 明るい色）。 */
function dots(g: Gfx, x0: number, y0: number, x1: number, y1: number, col: string, oy: number): void {
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  g.ctx.fillStyle = col;
  const h = AIM_LINE / 2;
  for (let i = 0; i <= n; i++)
    g.ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n - h), Math.round(y0 + ((y1 - y0) * i) / n - h) + oy, AIM_LINE, AIM_LINE);
}

/** 人の 絵の 画面の 四角（左・上・右・下。くりぬき と 持ち上げに 使う）。 */
function bodyRect(f: FieldScene, b: Actor, cx: number, cy: number): [number, number, number, number] {
  const [fx0, fy0] = fxAt(f, b.x - 8, b.y, cx, cy, b.y);
  const [fx1, fy1] = fxAt(f, b.x + 8, b.y - (b.sprite?.h ?? 24) - 2, cx, cy, b.y);
  return [Math.min(fx0, fx1), Math.min(fy0, fy1) - 1, Math.max(fx0, fx1), Math.max(fy0, fy1) + 1];
}

/** 四すみの かぎ（地面の四角の すみから、となりの すみへ 6 px ずつ）。 */
function drawAim(g: Gfx, f: FieldScene, x: Aim, cx: number, cy: number): void {
  if (x.a <= 0.01) return;
  const r = aimRect(f, x);
  if (!r) return;
  // the corners come in from 3 px out as it appears
  const out = 3 * (1 - Math.min(1, x.t / 180)) ** 2;
  const [l, t, rr, b] = [r[0] - out, r[1] - out, r[2] + out, r[3] + out];
  const pts = [
    [l, t],
    [rr, t],
    [rr, b],
    [l, b],
  ].map(([wx, wy]) => [...fxAt(f, wx, wy, cx, cy, wy)] as [number, number]);
  const ctx = g.ctx;
  ctx.save();
  // he stands over the frame (looking straight up at someone): the corners move out to his left
  // and right, a little smaller, at the same height (on the ground at the other's feet), so they
  // show beside him and never lie over the other's body, head or hat (2D and HD-2D alike)
  const p = f.player;
  let arm = AIM_ARM;
  if (p.visible && x.actor !== p) {
    const [bl, bt, br, bb] = bodyRect(f, p, cx, cy);
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    // (his middle inside the frame: standing beside it, he only covers one end, which the cut-out keeps)
    const mid = (bl + br) / 2;
    if (mid > Math.min(...xs) && mid < Math.max(...xs) && Math.max(...ys) > bt && Math.min(...ys) < bb) {
      arm = AIM_ARM - 1;
      // (the arm ends 2 px inside his rect: the rect is wider than the picture of him)
      const gap = arm - 2;
      const dl = Math.min(0, bl - gap - Math.min(pts[0][0], pts[3][0]));
      const dr = Math.max(0, br + gap - Math.max(pts[1][0], pts[2][0]));
      pts[0][0] += dl;
      pts[3][0] += dl;
      pts[1][0] += dr;
      pts[2][0] += dr;
      const my = (Math.min(...ys) + Math.max(...ys)) / 2;
      for (const q of pts) q[1] = my + (q[1] - my) * 0.7;
    }
  }
  // HD-2D: the frame lies over the picture, so leave out whoever stands in front of
  // it (Minato and his partner): it reads as lying behind them, as in 2D
  if (fxElsewhere(f)) {
    ctx.beginPath();
    ctx.rect(-50, -50, 10000, 10000);
    for (const b of [p, f.follower]) {
      if (!b || !b.visible || b === x.actor) continue;
      const [l, tp, r, bm] = bodyRect(f, b, cx, cy);
      ctx.rect(l, bm, r - l, tp - bm);
    }
    ctx.clip('evenodd');
  }
  g.alpha(x.a, () => {
    for (const [col, oy] of [
      ['#2A2440', 1],
      ['#FFF6D8', 0],
    ] as const) {
      for (let i = 0; i < 4; i++) {
        const [ax, ay] = pts[i];
        for (const j of [(i + 1) % 4, (i + 3) % 4]) {
          const [bx, by] = pts[j];
          const len = Math.hypot(bx - ax, by - ay) || 1;
          const k = Math.min(0.45, arm / len);
          dots(g, ax, ay, ax + (bx - ax) * k, ay + (by - ay) * k, col, oy);
        }
      }
    }
  });
  ctx.restore();
}

function pickGlints(f: FieldScene): void {
  for (const s of glints.values()) s.want = false;
  const p = f.player;
  const px = p.x;
  const py = p.y - 4;
  const near: [number, ExamineObj][] = [];
  for (const o of f.map.objects) {
    if (o.t !== 'obj') continue;
    const w = o.w ?? 1;
    const h = o.h ?? 1;
    // nearest point of its rect
    const nx = Math.max(o.x * 16, Math.min((o.x + w) * 16, px));
    const ny = Math.max(o.y * 16, Math.min((o.y + h) * 16, py));
    const d = Math.hypot(nx - px, ny - py) / 16;
    if (d > NEAR_TILES) continue;
    if (!f.objOk(o) || !glintable(o) || !f.light.canExamine(o)) continue;
    near.push([d, o]);
  }
  near.sort((u, v) => u[0] - v[0]);
  for (const [, o] of near.slice(0, MAX_GLINTS)) {
    const key = `${o.id}@${o.x},${o.y}`;
    const at = objAnchor(f, o);
    const s = glints.get(key);
    if (s) {
      s.want = true;
      s.at = at;
    } else glints.set(key, { a: 0, at, want: true });
  }
}

function update(f: FieldScene, dt: number): void {
  if (f.map.id !== mapId) {
    mapId = f.map.id;
    glints.clear();
    hint = null;
    extras.length = 0;
    pickT = 0;
    aims.length = 0;
  }
  updateAim(f, dt);
  const on = settings.marks && f.controllable;
  // the whole layer fades out under a talk / an event / a menu, and back in after
  showA = on ? Math.min(1, showA + dt / 250) : Math.max(0, showA - dt / 120);
  pickT -= dt;
  if (pickT <= 0) {
    pickT = 200;
    if (settings.marks) pickGlints(f);
    else for (const s of glints.values()) s.want = false;
  }
  // the destination every frame (a person or a symbol on the move keeps it over the head)
  const at = settings.marks && hintMark ? hintMark(f) : null;
  if (at) {
    if (hint) {
      hint.at = at;
      hint.want = true;
    } else hint = { a: 0, at, want: true };
  } else if (hint) hint.want = false;
  extraSources.forEach((fn, i) => {
    const xa = settings.marks ? fn(f) : null;
    let s = extras[i] ?? null;
    if (xa) {
      if (s) {
        s.at = xa;
        s.want = true;
      } else s = { a: 0, at: xa, want: true };
    } else if (s) s.want = false;
    if (s) {
      s.a = s.want ? Math.min(1, s.a + dt / 300) : Math.max(0, s.a - dt / 400);
      if (!s.want && s.a <= 0) s = null;
    }
    extras[i] = s;
  });
  for (const [k, s] of glints) {
    s.a = s.want ? Math.min(1, s.a + dt / 300) : Math.max(0, s.a - dt / 400);
    if (!s.want && s.a <= 0) glints.delete(k);
  }
  if (hint) {
    hint.a = hint.want ? Math.min(1, hint.a + dt / 300) : Math.max(0, hint.a - dt / 400);
    if (!hint.want && hint.a <= 0) hint = null;
  }
}

// ---------------------------------------------------------------- 絵

let markImg: HTMLCanvasElement | null = null;
/** 小さな「！」（5×11、墨の ふち、黄色。上の1列が明るい）。 */
function mark(): HTMLCanvasElement {
  if (markImg) return markImg;
  const p = PixelCanvas.fromArt(
    [
      '.###.',
      '#hhh#',
      '#yyy#',
      '#yyy#',
      '#yyy#',
      '#yoy#',
      '.#o#.',
      '..#..',
      '.###.',
      '#hyy#',
      '.###.',
    ],
    { '#': '#2A2440', y: '#FFD23F', h: '#FFF6D8', o: '#E8A52A' },
  );
  markImg = p.toCanvas();
  return markImg;
}

/** 印を1つ（a：出かた 0..1）。明るさが 1.8 秒で ゆっくり上下する。 */
function drawMark(g: Gfx, f: FieldScene, at: MarkAnchor, a: number, cx: number, cy: number, t: number): void {
  if (a <= 0.01) return;
  const [sx, sy] = fxAt(f, at.x, at.y, cx, cy, at.foot);
  const k = 0.5 + 0.5 * Math.sin((t / 1800) * Math.PI * 2);
  const img = mark();
  const bob = k > 0.5 ? 0 : 1;
  g.img(img, Math.round(sx - img.width / 2), Math.round(sy - img.height + bob), { alpha: a * (0.72 + 0.28 * k) });
}

registerWorldFx({
  map: '',
  anchored: true,
  update,
  draw(f, g, cx, cy, layer) {
    // the frame lies on the ground (under the people in 2D)
    if (layer === 'ground') for (const x of aims) drawAim(g, f, x, cx, cy);
    if (layer !== 'glow' || showA <= 0.01) return;
    const t = performance.now();
    g.alpha(showA, () => {
      // (a glint on the destination itself: the one mark)
      const h = hint?.at;
      for (const s of glints.values()) if (!h || Math.abs(s.at.x - h.x) > 4 || Math.abs(s.at.y - h.y) > 4) drawMark(g, f, s.at, s.a, cx, cy, t);
      if (hint) drawMark(g, f, hint.at, hint.a, cx, cy, t);
      for (const s of extras) if (s && (!h || Math.abs(s.at.x - h.x) > 4 || Math.abs(s.at.y - h.y) > 4)) drawMark(g, f, s.at, s.a, cx, cy, t);
    });
  },
});

if (import.meta.env.DEV)
  registerDebug('marks', () => ({
    on: settings.marks,
    glints: [...glints.entries()].map(([k, s]) => ({ id: k, a: Math.round(s.a * 100) / 100, at: [Math.round(s.at.x), Math.round(s.at.y)] })),
    hint: hint ? { a: Math.round(hint.a * 100) / 100, at: [Math.round(hint.at.x), Math.round(hint.at.y), Math.round(hint.at.foot)] } : null,
    extras: extras.filter((s): s is Shown => !!s).map((s) => ({ a: Math.round(s.a * 100) / 100, at: [Math.round(s.at.x), Math.round(s.at.y)] })),
    aim: aims.map((x) => ({ key: x.key, a: Math.round(x.a * 100) / 100, want: x.want })),
  }));
