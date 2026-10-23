// しるし（改善会議 2026-10-20 の 1・2。docs/kaizen/2026-10-20.md）：
//   2 きらり　まだ調べていない「調べられる物」に、主人公の近く（3マス）だけ小さな「！」
//   1 行き先　グソっ君のヒント〔次、どうする？〕を聞いたあと、その行き先の人・扉・物の上に同じ「！」
//   3 寄り道　短い あいだだけ 遊べる 寄り道の 人の 上に 同じ「！」（addMarkSource。げむきか 10-23 案2 の ツリノ：
//            第3章 S13〜S14 の 短い 窓で 見のがさないように。遠くからでも 見える）
// どちらも同じ形・同じ色（会議：印が2種類あると画面がうるさい）。点滅はおだやかに（明るさが 1.8 秒で
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
// QA（開発サーバー）：__game.cmd.marks()  今の印（きらり・行き先）の一覧

import type { Gfx } from '../engine/gfx';
import { PixelCanvas } from '../engine/pixel';
import { registerDebug } from '../debug';
import { flag } from '../game/state';
import { settings } from '../ui/settings';
import type { Actor } from './actor';
import type { FieldScene } from './field';
import { fxAt, registerWorldFx } from './fx';
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
  }
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
  }));
