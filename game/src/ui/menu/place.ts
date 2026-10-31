// 手帳の 今いる 場所（改善会議 2026-10-29 の4。ドラクエの メニューの 地名）。
//
// 開いたときに 1回 決める（つぎの目当てと 同じ）。名前は 名前の札・セーブ欄と 同じ
// placeNameFor（hud.ts）で 決める（地名が ずれない）。
// 置き場所：手帳の 下の ふち（折り目の 真ん中）。上の ふちは がま口・つぎの目当て・時計・
// みました帳の 冊の テープで 埋まっていて、長い 地名（ユウナリ 健康器具コーナー 196px）と
// 長い 目当て（212px）は 1行に 並ばない。札は 名前の札と 同じ テープの 色。
// ハンコの ページは 説明の 2行が 下の ふちまで 使うので 出さない。
// 改善会議 2026-10-31 の 7：ほかの ページも、中身が テープの 所（下の ふちの y 200 から）まで 来る ときは 出さない
// （せっていの 説明の 2行、みました帳の 右の ページの 下の 文など）。ページを 透明な 板に 1回 描いて 見る
// ずらせる ときは 右・左の ページへ ずらす（placeTapeX。ページの 選んでいる 所が 変わった とき、それ以外は 0.5秒ごと）。

import { Gfx } from '../../engine/gfx';
import { H, W } from '../../engine/screen';
import { hitsButtons } from '../../engine/safezones';
import { field } from '../../world/field';
import { PLACE_TAPE, placeNameFor } from '../hud';
import { drawTape, rectA, textW, UI } from '../window';
import { FOLD, SP } from './notebook';

/** The place where しゅん is standing (the field under the menu), or ''. */
export function placeLine(): string {
  const f = field();
  return f ? placeNameFor(f.map.id, f.player.tileX, f.player.tileY) : '';
}

const PIN_RED = '#D8423A';

/** A little map pin (5×8), drawn in code. */
function drawPin(g: Gfx, x: number, y: number): void {
  g.rect(x + 1, y, 3, 1, PIN_RED);
  g.rect(x, y + 1, 5, 3, PIN_RED);
  g.rect(x + 1, y + 4, 3, 1, PIN_RED);
  g.rect(x + 1, y + 1, 1, 1, '#F6C0B4');
  g.rect(x + 2, y + 5, 1, 3, UI.border);
}

/** The strip on the bottom edge, centred on the fold (dx: the menu's slide). */
export function placeTapeRect(text: string): { x: number; y: number; w: number; h: number } {
  const w = textW(text) + 22;
  return { x: Math.round(FOLD - w / 2), y: H - 16, w, h: 16 };
}

export function drawPlaceTape(g: Gfx, text: string, dx: number, alpha: number, at?: number): void {
  if (!text) return;
  const r = placeTapeRect(text);
  const x = (at ?? r.x) + dx;
  g.alpha(alpha, () => {
    rectA(g, x + 3, r.y + 2, r.w - 3, r.h - 2, UI.night, 0.25);
    drawTape(g, x, r.y, r.w, r.h, '', { color: PLACE_TAPE, seed: 5 });
    drawPin(g, x + 7, r.y + 4);
    g.text(text, x + 15, r.y, { color: UI.text });
  });
}

// ---- テープが ページの 中身に かかるか（改善会議 2026-10-31 の 7） ----------------------------------

let probe: { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D; g: Gfx } | null = null;
let lastSig = '';
let lastAt = -1e9;
let lastX: number | null = null;
const used = new Uint8Array(W);

/** ページの 選んでいる 所（数・文字・真偽と、数の 配列。…T で 終わる 時間は 入れない）。 */
export function pageSig(id: string, page: object): string {
  const parts = [id];
  for (const [k, v] of Object.entries(page)) {
    if (/T$/.test(k)) continue;
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') parts.push(`${k}=${v}`);
    else if (Array.isArray(v) && v.length < 16) parts.push(`${k}=${JSON.stringify(v)}`);
    else if (v && typeof v === 'object' && !Array.isArray(v)) parts.push(`${k}:o`);
    else if (v === null) parts.push(`${k}:-`);
  }
  return parts.join('|');
}

/**
 * テープを 置ける 所（x。置けなければ null）：ページだけを 透明な 板に 描いて、テープの 高さ（y 200 から 下）に 何も ない 所を さがす。まず 折り目の 真ん中、だめなら 右の ページ・左の ページへ ずらす
 * （スマホ縦の 大きい 字では 一覧の 下の ▼が 折り目の 左に 来る）。sig（pageSig）が 変わった とき と、
 * 0.5秒ごとに 見なおす。
 */
export function placeTapeX(text: string, sig: string, now: number, drawPage: (g: Gfx) => void): number | null {
  if (!text) return null;
  const same = sig === lastSig;
  if (same && now - lastAt < 500 && now >= lastAt) return lastX;
  lastSig = sig;
  lastAt = now;
  const r = placeTapeRect(text);
  lastX = r.x;
  try {
    if (!probe) {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.imageSmoothingEnabled = false;
      probe = { c, ctx, g: new Gfx(ctx, W, H) };
    }
    const { ctx, g } = probe;
    ctx.clearRect(0, 0, W, H);
    drawPage(g);
    const y0 = r.y;
    const d = ctx.getImageData(0, y0, W, H - y0).data;
    // (the same page state keeps what it has used: a blinking or bobbing mark can't make the tape hop)
    if (!same) used.fill(0);
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) used[((i - 3) / 4) % W] = 1;
    // (the tape and its shadow: w + 3)
    // (iPad 横の 下の すみの ボタンにも かけない)
    const fits = (x: number) => {
      if (hitsButtons(x, r.y, r.w + 3, r.h)) return false;
      for (let k = x; k < x + r.w + 3; k++) if (k < 0 || k >= W || used[k]) return false;
      return true;
    };
    const lo = SP.x + 2;
    const hi = SP.x + SP.w - 2 - r.w - 3;
    const cands = [r.x, FOLD + 6, FOLD - 6 - r.w - 3].map((x) => Math.max(lo, Math.min(hi, x)));
    lastX = cands.find(fits) ?? null;
  } catch {
    lastX = r.x;
  }
  return lastX;
}
