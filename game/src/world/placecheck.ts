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
//   __game.cmd.placeCheck({ scene: true })  場面で並べた ghost の人どうしも 数える（改善会議 10-23 の3）
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
import { vehicleBodyDepth, type VehicleView } from '../art/props/vehicles';
import { game } from '../engine/game';
import { H, W } from '../engine/screen';
import { dialogSpeech, dialogVisible } from '../ui/dialog';
import { lastSpeaker, speakerOf } from './msg';

export interface PlaceIssue {
  /** 'マス:かべ' 'マス:物' 'マス:人どうし' '物:かべ' '物:物' '絵:人どうし' '絵:かくれる' '車:かべ' '車:物' '車:人' */
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
function meantFor(f: FieldScene, a: Actor, scene = false): boolean {
  const def = a.data.def as NpcObj | undefined;
  if (a.kind !== 'npc' || !def) return false;
  // (a scene's people are spawned ghost — they walk through each other — but where they stand still counts: `scene`)
  if (def.ghost && !scene) return true;
  if (def.pose === 'sit' || a.pose === 'sit') return true;
  return !!cellAt(f.map, a.tileX, a.tileY + 1).counter;
}

function propName(p: PropInst): string {
  const id = p.obj.t === 'prop' ? p.obj.prop : (p.obj.prop ?? p.obj.id);
  return `${id}@${p.x / 16},${p.y / 16}`;
}

/** 今の地図を 点検する。`player`: 主人公も（既定 true。地図めぐりでは false）。 */
export function placeCheck(f: FieldScene, o: { player?: boolean; hide?: number; overlap?: number; scene?: boolean } = {}): PlaceIssue[] {
  const out: PlaceIssue[] = [];
  const meant = (f: FieldScene, a: Actor) => meantFor(f, a, !!o.scene);
  const hideMin = o.hide ?? 0.35;
  const overlapMin = o.overlap ?? 0.25;
  // (the town's traffic waits off the map's edge: not standing anywhere)
  const onMap = (a: Actor) => a.x >= 0 && a.y > 0 && a.x < f.map.w * 16 && a.y <= f.map.h * 16;
  // (the riders up on a truck's bed sit close on purpose: shuuka.ts ride())
  const people = f.actors.filter((a) => a.visible && a.alpha > 0.5 && a.kind !== 'follower' && onMap(a) && !a.data.riding);
  // (a hidden player — a scene staged without him — stands nowhere)
  if (o.player !== false && f.player.visible) people.push(f.player);
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
  // ---- 車の 体（改善会議 10-23 の2）：止めた 軽トラの 体（絵の幅 × 横 16px・縦 60px 北へ。HD-2D の 立体と 同じ）が
  // かべ・建物・物の マスに 入っていないか、人（主人公・グソっ君も）の 足が 体の 中に ないか
  for (const v of f.actors) {
    if (!v.data.vehicle || !v.visible || !onMap(v)) continue;
    const img = v.data.shadowFrame as HTMLCanvasElement | undefined;
    const w = img?.width ?? 30;
    const x0 = v.x + v.ox - Math.floor(w / 2);
    const x1 = x0 + w;
    const z1 = v.y;
    const z0 = v.y - vehicleBodyDepth(v.dir as VehicleView);
    const name = `${v.id}(車)`;
    const walls: string[] = [];
    const things: string[] = [];
    for (let ty = Math.floor((z0 + 1) / 16); ty <= Math.floor((z1 - 1) / 16); ty++)
      for (let tx = Math.floor((x0 + 1) / 16); tx <= Math.floor((x1 - 1) / 16); tx++) {
        if (wallCell(f, tx, ty)) walls.push(`${tx},${ty}`);
        else if (f.propSolidAt(tx, ty)) things.push(`${tx},${ty}`);
      }
    const at: [number, number] = [Math.floor(v.x / 16), Math.floor((v.y - 1) / 16)];
    if (walls.length) out.push({ kind: '車:かべ', a: name, at, note: `${walls.length}マス ${walls.slice(0, 4).join(' ')}` });
    if (things.length) out.push({ kind: '車:物', a: name, at, note: `${things.length}マス ${things.slice(0, 4).join(' ')}` });
    for (const a of [...people, ...(f.follower && f.follower.visible ? [f.follower] : [])]) {
      // (the riders up on the bed: lift; S25 ride())
      if (a === v || a.data.vehicle || meant(f, a) || a.lift > 0 || a.data.riding) continue;
      // (on the body's back or front plane too: the picture stands in it, half buried or flickering)
      if (a.y < z0 - 2 || a.y > z1 + 2) continue;
      const hw = Math.max(4, a.bw / 2);
      if (a.x + a.ox + hw <= x0 || a.x + a.ox - hw >= x1) continue;
      out.push({ kind: '車:人', a: a.id, b: name, at: [Math.floor(a.x / 16), Math.floor((a.y - 1) / 16)], note: a.y > z1 - 1 ? '体の 前の 面' : a.y < z0 + 1 ? '体の うしろの 面' : `体の 中 ${Math.round(z1 - a.y)}px` });
    }
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
  registerDebug('placeCheck', (o: { player?: boolean; hide?: number; overlap?: number; scene?: boolean } = {}) => {
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

// ---------------------------------------------------------------- 会話の カメラ（改善会議 2026-10-24 の3）
//
// 会話の あいだ、話している人が 画面の 端に 寄りすぎて いないか（第2章 集会所の 件、10-23：HD-2D の
// 部屋の カメラが 区長たちを 端に 映していた）。HD-2D の f.projected で その人の 足と 頭の 画面の
// 位置を 数え、ページを 打ち終えて キーを 待つ ときに 1回ずつ 見る（カメラの 寄せが 終わった あと）。
// 横の 端から EDGE_X px より 内に 足が ない、頭が 上の 端の 外、足が 下の 外 のとき 記録する。
// 画面の 中でも しゅんから 6マス（FAR_TILES）以上 はなれて 話して いれば「遠」（改善会議 2026-10-25）。
//
//   __game.cmd.talkEdgeLog()        記録（地図・話す人・画面の 位置・どちらの 端・数）
//   __game.cmd.talkEdgeLog(true)    記録を 空に（通しテストの 初めに）
//   __game.cmd.talkEdgeLog(true, 190)  空にして 端の 幅を 変える（点検の 点検：190 なら だれでも 数える）
//
// 記録の 初めの SHOT_MAX 件は その ときの 画面の 絵（data URL、tools/playthrough.mjs が png に 書き出す）。
// 遊ぶ人には 見えない（開発サーバーだけ）。

/** 横の 端から これより 内に 足が あると「寄りすぎ」（画面 384 の 1/8）。 */
let EDGE_X = 48;
/** しゅんから これより 遠い 所で 話して いると「遠」（改善会議 2026-10-25。マス）。 */
const FAR_TILES = 6;
const SHOT_MAX = 12;
export interface TalkEdge {
  map: string;
  /** 話す人の id（メッセージの 話し手、なければ 話しかけた 相手）。 */
  who: string;
  /** 名札。 */
  name: string;
  /** 足の 画面の 位置（384×216）。 */
  x: number;
  y: number;
  /** '左' '右' '上' '下'（上：頭が 画面の 上の 外、下：足が 下の 外）、'遠'（画面の 中だが しゅんから 6マス 以上）。 */
  side: string;
  /** 同じ 地図・人・端で 見つかった ページの 数。 */
  n: number;
  /** ページの 初めの 字。 */
  text: string;
  shot?: string;
}
const edgeLog: TalkEdge[] = [];
const edgeSeen = new Set<string>();
let edgePending: TalkEdge | null = null;
let edgeShots = 0;

function talkEdgeSample(): void {
  // the picture of the frame just shown (the 3D town under the 2D buffer): taken one draw after the find
  if (edgePending) {
    try {
      const d = game.screen.display;
      const c = document.createElement('canvas');
      c.width = W * 2;
      c.height = H * 2;
      const cx = c.getContext('2d')!;
      cx.imageSmoothingEnabled = false;
      cx.drawImage(d, 0, 0, c.width, c.height);
      edgePending.shot = c.toDataURL('image/png');
    } catch {
      // (a tainted or lost canvas: the list without the picture)
    }
    edgePending = null;
  }
  const f = field();
  if (!f || game.top !== f || f.viewScale !== 1 || !dialogVisible()) return;
  const sp = dialogSpeech();
  // (an empty page: the window lingering as it goes, the scene already cut elsewhere)
  if (!sp || sp.typing || !sp.text.trim()) return;
  // who speaks: the msg block's speaker, the voice's person, else the one spoken to — not when the
  // words are someone not standing here (the loudspeaker's 防災無線, a voice off the map)
  const tag = (lastSpeaker() ?? '').split(':')[0];
  const byTag = tag === 'flip' || tag === 'npc_kanenari' ? (f.follower ?? f.actorById('npc_kanenari')) : tag ? f.actorById(tag) : undefined;
  if (tag && tag !== 'narr' && !byTag) return;
  const byVoice = !byTag && sp.voice ? f.actorById(`npc_${sp.voice}`) : undefined;
  const t = f.talking;
  const talkingSpeaks = !!t && (!sp.voice || speakerOf(t.id).voice === undefined || speakerOf(t.id).voice === sp.voice);
  const a = byTag ?? byVoice ?? (talkingSpeaks ? t : null);
  if (!a || !a.visible || a.alpha <= 0.5 || a === f.player) return;
  const key = `${f.map.id}|${a.id}|${sp.page}|${sp.text.slice(0, 12)}`;
  if (edgeSeen.has(key)) return;
  edgeSeen.add(key);
  const foot = a.y + Math.max(0, a.oy);
  const fp = f.projected(a.x + a.ox, foot, foot);
  // (2D: only HD-2D's camera is counted — the game is played in HD-2D)
  if (!fp) return;
  const hp = f.projected(a.x + a.ox, foot - 26, foot);
  const [x, y] = fp;
  // (2026-10-25 改善会議「遠くから話す人はそばへ」: on the frame but FAR_TILES or more from しゅん — '遠')
  const far = Math.hypot(a.x - f.player.x, a.y - f.player.y) / 16 >= FAR_TILES;
  const side = x < EDGE_X ? '左' : x > W - EDGE_X ? '右' : hp && hp[1] < 0 ? '上' : y > H ? '下' : far ? '遠' : '';
  if (!side) return;
  const old = edgeLog.find((e) => e.map === f.map.id && e.who === a.id && e.side === side);
  if (old) {
    old.n++;
    return;
  }
  const e: TalkEdge = { map: f.map.id, who: a.id, name: sp.name, x: Math.round(x), y: Math.round(y), side, n: 1, text: sp.text.replace(/\n/g, ' ').slice(0, 16) };
  edgeLog.push(e);
  if (edgeLog.length > 200) edgeLog.shift();
  if (edgeShots < SHOT_MAX) {
    edgeShots++;
    edgePending = e;
  }
}

if (import.meta.env.DEV) {
  game.overlays.push(talkEdgeSample);
  registerDebug('talkEdgeLog', (clear = false, edge?: number) => {
    if (edge !== undefined) EDGE_X = edge;
    const r = edgeLog.slice();
    if (clear) {
      edgeLog.length = 0;
      edgeSeen.clear();
      edgeShots = 0;
    }
    return r;
  });
}
