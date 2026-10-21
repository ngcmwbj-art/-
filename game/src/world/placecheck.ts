// 重なり・めりこみの点検（開発用。改善会議 2026-10-21 の 4、docs/kaizen/2026-10-21.md）。
// 遊ぶ人には見えない：開発サーバーの __game.cmd からだけ呼ぶ。
//
// 地図ごとに、人（npc・シンボル・もどった物・主人公）と 物（prop・obj の solid の四角：軽トラ、
// 木、袋…）と 場面で並べた人（spawn。今その地図にいる人はみな数える）が、
//   マス目：かべ・建物・物の マスの上に立っていないか、2人が 同じマス／体の幅より近くないか、
//           物の solid の四角が かべ・建物・ほかの物の solid に 重なっていないか
//   絵：   同じ奥行き（足の線が 6px 以内）の 2人の 絵が 大きく重なっていないか（色のある画素で）、
//          手前に描かれる物・かべに 体が 隠れていないか（occlusion.ts の coverage、35% から）
// を 一覧にする。HD-2D の 立体での めりこみ（人の 絵が 建物の 中に 立つ）は hd2d/index.ts の
// hd2dPeople（overlap.ts の 立体の 記録に 人の 板を 足して 調べる）。
//
//   __game.cmd.placeCheck()                 今の地図（いま並んでいる人・spawn した人も）
//   __game.cmd.placeCheck({ player: false })
//   __game.cmd.placeCheckMaps(['map_town', …])  地図ごと（省略：すべて。今の 進みの flag のまま）
//
// 見つかった物を 直すかは 人が決める（わざと 重ねている所：座る人・カウンターの 店番・
// ghost の人・主人公と グソっ君 は 外してある）。

import type { Actor } from './actor';
import { field, type FieldScene, type PropInst } from './field';
import { cellAt, hasMap, mapIds } from './maps';
import { coverage, opaque } from './occlusion';
import type { NpcObj } from './types';
import { registerDebug } from '../debug';

export interface PlaceIssue {
  /** 'マス:かべ' 'マス:物' 'マス:人どうし' '物:かべ' '物:物' '絵:人どうし' '絵:かくれる' */
  kind: string;
  a: string;
  b?: string;
  /** マス (x, y). */
  at: [number, number];
  note?: string;
}

/** かべ・建物の マス（物の 下書きの 'prop'・木の幹・カウンター・水・田は 物の側なので外す）。 */
const WALL_TAGS = new Set(['facade', 'iwall', 'wall', 'roof', 'door', 'void', 'fence', 'rfence', 'hedge', 'guardrail', 'parapet']);
function wallCell(f: FieldScene, x: number, y: number): string | null {
  const c = cellAt(f.map, x, y);
  if (!c.solid) return null;
  if (c.tag && !WALL_TAGS.has(c.tag)) return null;
  return c.tag ?? 'solid';
}

/** その人の 絵（車は 描く関数の 絵）と 左上（世界の px）。 */
function picture(a: Actor): { img: HTMLCanvasElement; x: number; y: number } | null {
  if (a.drawFn) {
    const img = a.data.shadowFrame as HTMLCanvasElement | undefined;
    if (!img) return null;
    return { img, x: Math.round(a.x + a.ox - Math.floor(img.width / 2)), y: Math.round(a.y + a.oy - img.height + 1) };
  }
  const img = a.frame();
  const [x, y] = a.drawPos(img);
  return { img, x, y };
}

/** わざと 何かに 重ねて 立たせている人（occlusion.ts と同じ 決め）。 */
function meant(f: FieldScene, a: Actor): boolean {
  const def = a.data.def as NpcObj | undefined;
  if (a.kind !== 'npc' || !def) return false;
  if (def.ghost) return true;
  if (def.pose === 'sit' || a.pose === 'sit') return true;
  return !!cellAt(f.map, a.tileX, a.tileY + 1).counter;
}

function propName(p: PropInst): string {
  const id = p.obj.t === 'prop' ? p.obj.prop : (p.obj.prop ?? p.obj.id);
  return `${id}@${p.x / 16},${p.y / 16}`;
}

/** 今の地図を 点検する。`player`: 主人公も（既定 true。地図めぐりでは false）。 */
export function placeCheck(f: FieldScene, o: { player?: boolean; hide?: number; overlap?: number } = {}): PlaceIssue[] {
  const out: PlaceIssue[] = [];
  const hideMin = o.hide ?? 0.35;
  const overlapMin = o.overlap ?? 0.25;
  // (the town's traffic waits off the map's edge: not standing anywhere)
  const onMap = (a: Actor) => a.x >= 0 && a.y > 0 && a.x < f.map.w * 16 && a.y <= f.map.h * 16;
  const people = f.actors.filter((a) => a.visible && a.alpha > 0.5 && a.kind !== 'follower' && onMap(a));
  if (o.player !== false) people.push(f.player);
  // ---- マス目：人の 立つ マス
  for (const a of people) {
    if (meant(f, a)) continue;
    const tx = Math.floor(a.x / 16);
    const ty = Math.floor((a.y - 1) / 16);
    const w = wallCell(f, tx, ty);
    if (w) out.push({ kind: 'マス:かべ', a: a.id, at: [tx, ty], note: w });
    else if (f.propSolidAt(tx, ty)) {
      const by = f.props.filter((p) => p.present && p.obj.solid && inSolid(p, tx, ty)).map(propName);
      // 車（drawFn）が 自分の solid の上に いるのは あたりまえ
      if (!a.drawFn) out.push({ kind: 'マス:物', a: a.id, b: by.join(' ') || undefined, at: [tx, ty] });
    }
  }
  // ---- 人どうし（マス・絵）
  for (let i = 0; i < people.length; i++)
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i];
      const b = people[j];
      if (a.kind === 'player' || b.kind === 'player') {
        // (主人公と ついてくる グソっ君は いつも 近い)
        const other = a.kind === 'player' ? b : a;
        if (other === f.follower) continue;
      }
      if (meant(f, a) && meant(f, b)) continue;
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      const at: [number, number] = [Math.floor(a.x / 16), Math.floor((a.y - 1) / 16)];
      if (!a.drawFn && !b.drawFn && dx < 10 && dy < 8) {
        out.push({ kind: 'マス:人どうし', a: a.id, b: b.id, at, note: `${Math.round(dx)}px ${Math.round(dy)}px` });
        continue;
      }
      if (dy > 6) continue;
      const pa = picture(a);
      const pb = picture(b);
      if (!pa || !pb) continue;
      const r = pixelOverlap(pa, pb);
      if (r >= overlapMin) out.push({ kind: '絵:人どうし', a: a.id, b: b.id, at, note: `${Math.round(r * 100)}%` });
    }
  // ---- 絵：手前の 物・かべに かくれる
  for (const a of people) {
    if (meant(f, a) || a.drawFn) continue;
    const c = coverage(f, a.x + a.ox, a.y + a.oy, a.frame());
    if (c.frac >= hideMin) out.push({ kind: '絵:かくれる', a: a.id, b: c.by.join(' '), at: [Math.floor(a.x / 16), Math.floor((a.y - 1) / 16)], note: `${Math.round(c.frac * 100)}%` });
  }
  // ---- 物の solid の四角
  const solids = f.props.filter((p) => p.present && p.obj.solid);
  for (const p of solids) {
    const [dx, dy, w, h] = p.obj.solid!;
    const x0 = p.obj.x + dx;
    const y0 = p.obj.y + dy;
    const walls: string[] = [];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (wallCell(f, x, y)) walls.push(`${x},${y}`);
    if (walls.length) out.push({ kind: '物:かべ', a: propName(p), at: [x0, y0], note: `${walls.length}マス ${walls.slice(0, 4).join(' ')}` });
  }
  for (let i = 0; i < solids.length; i++)
    for (let j = i + 1; j < solids.length; j++) {
      const a = solids[i];
      const b = solids[j];
      const [ax, ay, aw, ah] = a.obj.solid!;
      const [bx, by, bw, bh] = b.obj.solid!;
      const x0 = Math.max(a.obj.x + ax, b.obj.x + bx);
      const x1 = Math.min(a.obj.x + ax + aw, b.obj.x + bx + bw);
      const y0 = Math.max(a.obj.y + ay, b.obj.y + by);
      const y1 = Math.min(a.obj.y + ay + ah, b.obj.y + by + bh);
      if (x1 > x0 && y1 > y0) out.push({ kind: '物:物', a: propName(a), b: propName(b), at: [x0, y0], note: `${(x1 - x0) * (y1 - y0)}マス` });
    }
  return out;
}

function inSolid(p: PropInst, tx: number, ty: number): boolean {
  const [dx, dy, w, h] = p.obj.solid!;
  return tx >= p.obj.x + dx && tx < p.obj.x + dx + w && ty >= p.obj.y + dy && ty < p.obj.y + dy + h;
}

/** 2つの 絵の 色のある画素の 重なり（小さいほうの 画素の 割合）。 */
function pixelOverlap(a: { img: HTMLCanvasElement; x: number; y: number }, b: { img: HTMLCanvasElement; x: number; y: number }): number {
  const x0 = Math.max(a.x, b.x);
  const x1 = Math.min(a.x + a.img.width, b.x + b.img.width);
  const y0 = Math.max(a.y, b.y);
  const y1 = Math.min(a.y + a.img.height, b.y + b.img.height);
  if (x1 <= x0 || y1 <= y0) return 0;
  const ma = opaque(a.img);
  const mb = opaque(b.img);
  let n = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) if (ma[(y - a.y) * a.img.width + (x - a.x)] && mb[(y - b.y) * b.img.width + (x - b.x)]) n++;
  const na = ma.reduce((s, v) => s + v, 0);
  const nb = mb.reduce((s, v) => s + v, 0);
  return n / Math.max(1, Math.min(na, nb));
}

if (import.meta.env.DEV) {
  registerDebug('placeCheck', (o: { player?: boolean; hide?: number; overlap?: number } = {}) => {
    const f = field();
    if (!f) return 'field not active';
    return placeCheck(f, o);
  });
  /**
   * 地図めぐり：その地図を 今の flag のまま 読みこんで 点検し、最後に もとの地図へ もどす
   * （loadMap だけ：入ったときの 台本は 走らない。ワープの 道は 通らない）。
   */
  registerDebug('placeCheckMaps', (ids?: string[], o: { hide?: number; overlap?: number } = {}) => {
    const f = field();
    if (!f) return 'field not active';
    const back = { map: f.map.id, x: f.player.tileX, y: f.player.tileY, dir: f.player.dir };
    const res: Record<string, PlaceIssue[] | string> = {};
    for (const id of ids ?? mapIds()) {
      if (!hasMap(id)) {
        res[id] = 'no such map';
        continue;
      }
      try {
        f.loadMap(id, 1, 1, 'down');
        const r = placeCheck(f, { ...o, player: false });
        if (r.length) res[id] = r;
      } catch (e) {
        res[id] = `error: ${(e as Error).message}`;
      }
    }
    f.loadMap(back.map, back.x, back.y, back.dir);
    return res;
  });
}
