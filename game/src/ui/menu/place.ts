// 手帳の 今いる 場所（改善会議 2026-10-29 の4。ドラクエの メニューの 地名）。
//
// 開いたときに 1回 決める（つぎの目当てと 同じ）。名前は 名前の札・セーブ欄と 同じ
// placeNameFor（hud.ts）で 決める（地名が ずれない）。
// 置き場所：手帳の 下の ふち（折り目の 真ん中）。上の ふちは がま口・つぎの目当て・時計・
// みました帳の 冊の テープで 埋まっていて、長い 地名（ユウナリ 健康器具コーナー 196px）と
// 長い 目当て（212px）は 1行に 並ばない。札は 名前の札と 同じ テープの 色。
// ハンコの ページは 説明の 2行が 下の ふちまで 使うので 出さない。

import type { Gfx } from '../../engine/gfx';
import { H } from '../../engine/screen';
import { field } from '../../world/field';
import { PLACE_TAPE, placeNameFor } from '../hud';
import { drawTape, rectA, textW, UI } from '../window';
import { FOLD } from './notebook';

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

export function drawPlaceTape(g: Gfx, text: string, dx: number, alpha: number): void {
  if (!text) return;
  const r = placeTapeRect(text);
  const x = r.x + dx;
  g.alpha(alpha, () => {
    rectA(g, x + 3, r.y + 2, r.w - 3, r.h - 2, UI.night, 0.25);
    drawTape(g, x, r.y, r.w, r.h, '', { color: PLACE_TAPE, seed: 5 });
    drawPin(g, x + 7, r.y + 4);
    g.text(text, x + 15, r.y, { color: UI.text });
  });
}
