// Shared helpers for the scenario scripts: party / item bookkeeping, event
// battles with evt_gameover, camera pans that respect centred rooms, a
// non-blocking narration line, and small staging utilities.

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { drawGlyph } from '../engine/font';
import { H, W } from '../engine/screen';
import { animate, ease } from '../engine/tween';
import { addItem, flag, setFlag, state, type Dir } from '../game/state';
import { getItem } from '../data/battle';
import { startBattle, type BattleOpts } from '../battle/api';
import { field, type FieldScene } from '../world/field';
import { runMsg } from '../world/msg';
import { actor, walk } from '../world/api';
import { DIR_VEC, type Actor } from '../world/actor';
import { runGameOver } from '../ui/gameover';
import { uiHud } from '../ui/hud';
import { continueGame } from '../ui/flow';
import { layoutPages, BOX } from '../ui/dialog';
import { drawWindow, UI } from '../ui/window';
import { playBgm, sfx } from '../audio';
import { registerWorldFx } from '../world/fx';

/** The running field scene (throws if there is none). */
export function F(): FieldScene {
  const f = field();
  if (!f) throw new Error('[events] field scene is not active');
  return f;
}

export function onMap(id: string): boolean {
  return field()?.map.id === id;
}

// ---------------------------------------------------------------- items

/** A 大事なもの: never blocked by a full bag (state.addItem doesn't count them), never duplicated. */
export function giveKey(id: string): void {
  if (!state.inventory.includes(id)) addItem(id);
}

export function itemName(id: string): string {
  return getItem(id)?.name ?? id;
}

/** 大事なもの入手: the item jingle (music pauses and resumes by itself) and the @sys line. */
export function* getKeyItem(id: string, text: string, jingle = true): Co {
  giveKey(id);
  // the @sys line says it; no HUD pick-up card on top of it
  yield 34;
  uiHud.clearNotes();
  if (jingle) playBgm('bgm_jingle_item');
  else sfx('se_item');
  yield* runMsg(text);
}

export function minato() {
  return state.party.find((m) => m.id === 'minato');
}

export function addMp(n: number): void {
  const m = minato();
  if (m) m.mp = Math.min(m.maxMp, m.mp + n);
}

export function healHp(): void {
  for (const m of state.party) m.hp = m.maxHp;
}

// ---------------------------------------------------------------- music

/** Keep the map from (re)starting its stage song (17:00 → the hanko case). */
export function holdBgm(on: boolean): void {
  setFlag('flag_bgm_hold', on ? 1 : 0);
}

// ---------------------------------------------------------------- battles

export type EventBattleResult = 'win' | 'retry' | 'load';

/**
 * A story battle that can be lost (10_narrative 5.21 evt_gameover):
 * 'win'; 'retry' = 「戦う前から やりなおす」 (HP full, 朱肉 back to the start
 * value; the caller replays its event from the top); 'load' = the save was
 * loaded and a new field is running (the caller must stop).
 */
export function* eventBattle(o: BattleOpts): Co<EventBattleResult> {
  const mp0 = new Map(state.party.map((m) => [m.id, m.mp] as const));
  const r = yield* startBattle({ ...o, canLose: true });
  if (r === 'win') {
    grace();
    return 'win';
  }
  if (r === 'flee') return 'retry';
  // the battle ended on the dark screen: keep it dark until the page is up
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  const choice = yield* runGameOver({ boss: !!o.boss });
  if (choice === 'load') {
    const ok = yield* continueGame();
    if (ok) return 'load';
  }
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = Math.min(m.maxMp, mp0.get(m.id) ?? m.mp);
    m.status = {};
  }
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  return 'retry';
}

/** A moment of peace after a story scene: field symbols can't start a battle yet. */
export function grace(ms = 2500): void {
  const f = field();
  if (f) f.invincibleUntil = f.t + ms;
}

// ---------------------------------------------------------------- camera

/** Camera top-left for a world-pixel centre, clamped like the field does (centred rooms stay centred). */
function camFor(f: FieldScene, x: number, y: number): [number, number] {
  const mw = f.map.w * 16;
  const mh = f.map.h * 16;
  const fixed = f.map.def.camera === 'fixed';
  const cx = mw <= W || fixed ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, x - W / 2));
  const cy = mh <= H || fixed ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, y - H / 2));
  return [cx, cy];
}

/** Pan so tile (tx, ty) is centred (ease-in-out). */
export function* panTo(tx: number, ty: number, ms = 800): Co {
  const f = F();
  const x0 = f.camX;
  const y0 = f.camY;
  const [x1, y1] = camFor(f, tx * 16 + 8, ty * 16 + 8);
  f.camOverride = { x: x1 + W / 2, y: y1 + H / 2 };
  yield* animate(
    ms,
    (p) => {
      f.camX = x0 + (x1 - x0) * p;
      f.camY = y0 + (y1 - y0) * p;
    },
    ease.sineInOut,
  );
}

/** Pan back to the player and hand the camera back. */
export function* panBack(ms = 600): Co {
  const f = F();
  if (!f.camOverride) return;
  const x0 = f.camX;
  const y0 = f.camY;
  const [tx, ty] = f.followTarget();
  yield* animate(
    ms,
    (p) => {
      f.camX = x0 + (tx - x0) * p;
      f.camY = y0 + (ty - y0) * p;
    },
    ease.sineInOut,
  );
  f.camOverride = null;
}

/** Hold the camera where it is (cutscene framing) until panBack / release. */
export function holdCamera(): void {
  const f = F();
  f.camOverride = { x: f.camX + W / 2, y: f.camY + H / 2 };
}

export function releaseCamera(): void {
  const f = field();
  if (f) f.camOverride = null;
}

// ---------------------------------------------------------------- positions

export function playerTile(): [number, number] {
  const p = F().player;
  return [p.tileX, p.tileY];
}

/** Is tile (tx, ty) walkable for a character (ignoring other characters)? */
export function tileFree(tx: number, ty: number): boolean {
  const f = F();
  return f.free(f.player, tx * 16 + 8, ty * 16 + 16, true);
}

/**
 * Would someone standing on tile (tx, ty) be hidden behind a tall prop drawn
 * in front of them (an arcade pillar, a signboard)? NPCs get no x-ray
 * silhouette, so a scene must not put its actors there.
 */
export function hiddenAt(tx: number, ty: number): boolean {
  const f = F();
  const x = tx * 16 + 8;
  const y = ty * 16 + 16;
  for (const p of f.props) {
    if (!p.present || p.art.flat) continue;
    const a = p.art;
    if (p.y + a.foot <= y) continue;
    const l = p.x + a.ox;
    const t = p.y + a.oy;
    const ox = Math.min(x + 6, l + a.w) - Math.max(x - 6, l);
    const oy = Math.min(y, t + a.h) - Math.max(y - 20, t);
    if (ox >= 6 && oy >= 10) return true;
  }
  return false;
}

/** The free tile next to (tx, ty) on the side of (fromX, fromY) — for "walk up to someone". */
export function besideToward(tx: number, ty: number, fromX: number, fromY: number): [number, number] {
  const dx = fromX - tx;
  const dy = fromY - ty;
  const cands: [number, number][] = [];
  if (Math.abs(dx) >= Math.abs(dy)) cands.push([Math.sign(dx) || 1, 0], [0, Math.sign(dy) || 1], [0, -(Math.sign(dy) || 1)]);
  else cands.push([0, Math.sign(dy) || 1], [Math.sign(dx) || 1, 0], [-(Math.sign(dx) || 1), 0]);
  cands.push([-(Math.sign(dx) || 1), 0], [0, -(Math.sign(dy) || 1)]);
  // someone else already standing there (the one walking up, at (fromX, fromY), doesn't count)
  const f = F();
  const taken = (x: number, y: number) =>
    f.actors.some((a) => a.visible && a.solid && a.kind !== 'follower' && a.tileX === x && a.tileY === y && !(a.tileX === fromX && a.tileY === fromY));
  // free, in sight and nobody there first; then free and nobody there; then any free tile
  const tiers: ((x: number, y: number) => boolean)[] = [
    (x, y) => tileFree(x, y) && !taken(x, y) && !hiddenAt(x, y),
    (x, y) => tileFree(x, y) && !taken(x, y),
    (x, y) => tileFree(x, y),
  ];
  for (const ok of tiers) for (const [ox, oy] of cands) if (ok(tx + ox, ty + oy)) return [tx + ox, ty + oy];
  return [tx + (Math.sign(dx) || 1), ty];
}

/**
 * Finish the step an actor is in: onto the nearest whole tile (keeping its
 * facing). Scenes stage people by tiles; a stop that left Minato a pixel over
 * a tile line would put whoever walks up to him a tile too far.
 */
export function* settle(a: Actor, speed = 4.5): Co {
  const x = Math.round((a.x - 8) / 16) * 16 + 8;
  const y = Math.round((a.y - 16) / 16) * 16 + 16;
  if (Math.abs(a.x - x) < 0.5 && Math.abs(a.y - y) < 0.5) {
    a.x = x;
    a.y = y;
    return;
  }
  if (!tileFree(Math.floor(x / 16), Math.floor((y - 1) / 16))) return;
  const dir = a.dir;
  a.path = [[x, y]];
  a.pathSpeed = speed * 16;
  a.faceLock = true;
  yield () => a.path.length === 0;
  a.faceLock = false;
  a.moving = false;
  a.dir = dir;
}

/** Direction from tile a to tile b (dominant axis). */
export function dirTo(ax: number, ay: number, bx: number, by: number): Dir {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}

/** An L-shaped tile path from the actor's tile to (tx, ty): horizontal first, or vertical first. */
export function lPath(id: string, tx: number, ty: number, vertFirst = false): [number, number][] {
  const a = actor(id);
  if (!a) return [[tx, ty]];
  const sx = a.tileX;
  const sy = a.tileY;
  const mid: [number, number] = vertFirst ? [sx, ty] : [tx, sy];
  const out: [number, number][] = [];
  if (mid[0] !== sx || mid[1] !== sy) out.push(mid);
  if (mid[0] !== tx || mid[1] !== ty) out.push([tx, ty]);
  return out.length ? out : [[tx, ty]];
}

export function* walkTo(id: string, tx: number, ty: number, opts: { speed?: number; face?: Dir; vertFirst?: boolean } = {}): Co {
  const path = lPath(id, tx, ty, opts.vertFirst);
  yield* walk(id, path, { speed: opts.speed, face: opts.face });
}

/**
 * A short tile route (4-way, breadth first, within `radius` tiles of the
 * start) over free tiles, never through `avoid` (e.g. the player's tile).
 * The start is not included. Null if there is none.
 */
export function tileRoute(from: [number, number], to: [number, number], avoid: [number, number][] = [], radius = 5): [number, number][] | null {
  const key = (x: number, y: number) => `${x},${y}`;
  const blocked = new Set(avoid.map(([x, y]) => key(x, y)));
  const prev = new Map<string, string | null>([[key(...from), null]]);
  const q: [number, number][] = [from];
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === to[0] && y === to[1]) {
      const out: [number, number][] = [];
      let k: string | null = key(x, y);
      while (k && k !== key(...from)) {
        const [a, b] = k.split(',').map(Number);
        out.unshift([a, b]);
        k = prev.get(k) ?? null;
      }
      return out;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = key(nx, ny);
      if (prev.has(k) || blocked.has(k)) continue;
      if (Math.abs(nx - from[0]) + Math.abs(ny - from[1]) > radius) continue;
      if (!tileFree(nx, ny)) continue;
      prev.set(k, key(x, y));
      q.push([nx, ny]);
    }
  }
  return null;
}

/** The tile where the follower falls in when it is (re)placed: behind the player, else beside (as the field does). */
export function followerSpot(): [number, number] | null {
  const p = F().player;
  const [dx, dy] = DIR_VEC[p.dir];
  for (const [ex, ey] of [[-dx, -dy], [dy, dx], [-dy, -dx], [dx, dy]]) {
    const x = p.tileX + ex;
    const y = p.tileY + ey;
    if (tileFree(x, y)) return [x, y];
  }
  return null;
}

/** Step the player one tile back (away from where they face), if free. */
export function stepBack(): void {
  const f = F();
  const p = f.player;
  const [dx, dy] = DIR_VEC[p.dir];
  const nx = p.x - dx * 16;
  const ny = p.y - dy * 16;
  if (f.free(p, nx, ny)) {
    p.x = nx;
    p.y = ny;
  }
}

// ---------------------------------------------------------------- the non-blocking line

/**
 * A narration line that doesn't take the controls (evt_alley_open:
 * 「入力はロックしない、auto 1500ms」): a small paper note over Minato's head
 * with a thought tail, typed in pencil. It follows him while he walks and
 * stays clear of the HUD row (place name, clock) and of the dialog window's
 * place, so nothing on screen is stacked on top of anything else.
 */
class FloatLine implements Widget {
  modal = false;
  done = false;
  private t = 0;
  private glyphs: ReturnType<typeof layoutPages>[number];
  private shown = 0;
  private acc = 0;
  private pause = 0;
  private holdT = 0;
  private outT = -1;
  private w: number;
  private h: number;
  private map: string | undefined;

  constructor(text: string, private hold: number) {
    this.map = field()?.map.id;
    this.glyphs = layoutPages(text, 336, UI.pencil)[0] ?? [];
    let right = 0;
    let bottom = 0;
    for (const g of this.glyphs) {
      right = Math.max(right, g.x + (g.ch.charCodeAt(0) < 0x80 ? 8 : 16));
      bottom = Math.max(bottom, g.y + 18);
    }
    this.w = right + 16;
    this.h = bottom + 8;
  }

  update(dt: number): void {
    this.t += dt;
    const f = field();
    if (this.outT >= 0) {
      this.outT += dt;
      if (this.outT > 220) this.done = true;
      return;
    }
    // a scene taking the screen (a battle, a warp) ends the note
    if (!f || game.top !== f || f.map.id !== this.map) {
      this.outT = 0;
      return;
    }
    if (this.t < 140) return;
    if (this.shown < this.glyphs.length) {
      if (this.pause > 0) {
        this.pause -= dt;
        return;
      }
      this.acc += (dt / 1000) * 40;
      while (this.acc >= 1 && this.shown < this.glyphs.length && this.pause <= 0) {
        this.acc -= 1;
        const g = this.glyphs[this.shown++];
        if (g.ch.trim() && this.shown % 2) sfx('se_page', { vol: 0.04 });
        this.pause = g.pause;
      }
      return;
    }
    this.holdT += dt;
    if (this.holdT >= this.hold) this.outT = 0;
  }

  draw(g: Gfx): void {
    const f = field();
    if (!f || game.top !== f) return;
    const kIn = ease.cubicOut(Math.min(1, this.t / 140));
    const kOut = this.outT >= 0 ? 1 - Math.min(1, this.outT / 220) : 1;
    const a = kIn * kOut;
    if (a <= 0) return;
    const p = f.player;
    const px = Math.round(p.x - f.camX);
    const head = Math.round(p.y - f.camY) - 26;
    const w = this.w;
    const h = this.h;
    // above the head; below the feet when there is no room above
    const above = head - 16 - h >= 30;
    const x = Math.max(8, Math.min(W - 8 - w, px - Math.round(w / 2)));
    let y = above ? head - 16 - h : Math.round(p.y - f.camY) + 14;
    y = Math.max(30, Math.min(BOX.y - 6 - h, y)) + Math.round((1 - kIn) * 3);
    drawWindow(g, x, y, w, h, UI, a, { curl: false, grid: false });
    // the thought tail: two little rings and a dot stepping down to his head
    g.alpha(a, () => {
      const tx = Math.max(x + 10, Math.min(x + w - 10, px));
      const s = above ? 1 : -1;
      const y0 = above ? y + h : y;
      g.circle(tx, y0 + s * 5, 3, UI.bg);
      g.ring(tx, y0 + s * 5, 3, UI.border);
      g.circle(tx + 2, y0 + s * 11, 1, UI.bg);
      g.ring(tx + 2, y0 + s * 11, 1, UI.border);
    });
    const ctx = g.ctx;
    ctx.save();
    ctx.globalAlpha = a;
    for (let i = 0; i < this.shown && i < this.glyphs.length; i++) {
      const gl = this.glyphs[i];
      drawGlyph(ctx, gl.ch, x + 8 + gl.x, y + 4 + gl.y, gl.color);
    }
    ctx.restore();
  }
}

export function floatLine(text: string, hold = 1500): void {
  game.ui.push(new FloatLine(text, hold));
}

// ---------------------------------------------------------------- misc

export function* wait(ms: number): Co {
  yield ms;
}

/** A one-shot flag: returns true the first time it is asked. */
export function once(id: string): boolean {
  if (flag(id)) return false;
  setFlag(id, 1);
  return true;
}

// ---------------------------------------------------------------- walkers that don't hold the player

interface Walker {
  a: import('../world/actor').Actor;
  delay: number;
  remove: boolean;
  started: boolean;
  pts: [number, number][];
  speed: number;
}
const walkers: Walker[] = [];

/**
 * Send an NPC along a tile path without blocking the player (the field moves
 * it); with `remove` it disappears once it is out of sight or has arrived.
 */
export function sendAway(a: import('../world/actor').Actor, pts: [number, number][], speed: number, delay = 0, remove = true): void {
  a.data.scripted = true;
  walkers.push({ a, delay, remove, started: false, pts, speed });
}

registerWorldFx({
  map: '',
  update(f, dt) {
    for (let i = walkers.length - 1; i >= 0; i--) {
      const w = walkers[i];
      if (!f.actors.includes(w.a)) {
        walkers.splice(i, 1);
        continue;
      }
      if (!w.started) {
        w.delay -= dt;
        if (w.delay > 0) continue;
        w.started = true;
        w.a.pose = null;
        w.a.pathSpeed = w.speed * 16;
        w.a.path = w.pts.map(([x, y]) => [x * 16 + 8, y * 16 + 16] as [number, number]);
      }
      const off = w.a.x < f.camX - 24 || w.a.x > f.camX + W + 24 || w.a.y < f.camY - 8 || w.a.y > f.camY + H + 40;
      if (!w.a.path.length || (off && w.remove)) {
        if (w.remove) f.removeActor(w.a);
        else delete w.a.data.scripted;
        walkers.splice(i, 1);
      }
    }
  },
});

// ---------------------------------------------------------------- talk tables

/** Only the stage keys (sN, sN_k) of a talk table — what pickTalk() understands. */
export function stageKeys(t: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(t)) if (/^s\d(_\d)?$/.test(k)) out[k] = v;
  return out;
}
