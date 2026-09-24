// Shared helpers for the scenario scripts: party / item bookkeeping, event
// battles with evt_gameover, camera pans that respect centred rooms, a
// non-blocking narration line, and small staging utilities.

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { drawGlyph } from '../engine/font';
import { H, W } from '../engine/screen';
import { animate, ease } from '../engine/tween';
import { flag, setFlag, state, type Dir } from '../game/state';
import { getItem, isKeyItem } from '../data/battle';
import { startBattle, type BattleOpts } from '../battle/api';
import { field, type FieldScene } from '../world/field';
import { runMsg } from '../world/msg';
import { actor, walk } from '../world/api';
import { DIR_VEC } from '../world/actor';
import { runGameOver } from '../ui/gameover';
import { continueGame } from '../ui/flow';
import { layoutPages, BOX } from '../ui/dialog';
import { drawWindow, UI } from '../ui/window';
import { playBgm, sfx } from '../audio';
import { registerWorldFx } from '../world/fx';

export const INVENTORY_CAP = 14;

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

/** Items that count against the 14-slot bag (大事なものは数えない). */
export function bagCount(): number {
  return state.inventory.filter((id) => !isKeyItem(id)).length;
}

/** A 大事なもの: never blocked by a full bag, never duplicated. */
export function giveKey(id: string): void {
  if (!state.inventory.includes(id)) state.inventory.push(id);
}

/** An ordinary item: false (and nothing changes) when the bag is full. */
export function giveItem(id: string): boolean {
  if (bagCount() >= INVENTORY_CAP) return false;
  state.inventory.push(id);
  return true;
}

export function itemName(id: string): string {
  return getItem(id)?.name ?? id;
}

/** 大事なもの入手: the item jingle (music pauses and resumes by itself) and the @sys line. */
export function* getKeyItem(id: string, text: string, jingle = true): Co {
  giveKey(id);
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
  if (r === 'win') return 'win';
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

/** The free tile next to (tx, ty) on the side of (fromX, fromY) — for "walk up to someone". */
export function besideToward(tx: number, ty: number, fromX: number, fromY: number): [number, number] {
  const dx = fromX - tx;
  const dy = fromY - ty;
  const cands: [number, number][] = [];
  if (Math.abs(dx) >= Math.abs(dy)) cands.push([Math.sign(dx) || 1, 0], [0, Math.sign(dy) || 1], [0, -(Math.sign(dy) || 1)]);
  else cands.push([0, Math.sign(dy) || 1], [Math.sign(dx) || 1, 0], [-(Math.sign(dx) || 1), 0]);
  cands.push([-(Math.sign(dx) || 1), 0], [0, -(Math.sign(dy) || 1)]);
  for (const [ox, oy] of cands) if (tileFree(tx + ox, ty + oy)) return [tx + ox, ty + oy];
  return [tx + (Math.sign(dx) || 1), ty];
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
 * A narration line shown in the dialog window's place while the player keeps
 * walking (evt_alley_open: 「入力はロックしない、auto 1500ms」). Not modal.
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

  constructor(text: string, private hold: number) {
    this.glyphs = layoutPages(text)[0] ?? [];
  }

  update(dt: number): void {
    this.t += dt;
    if (this.outT >= 0) {
      this.outT += dt;
      if (this.outT > 200) this.done = true;
      return;
    }
    if (this.t < 120) return;
    if (this.shown < this.glyphs.length) {
      if (this.pause > 0) {
        this.pause -= dt;
        return;
      }
      this.acc += (dt / 1000) * 40;
      while (this.acc >= 1 && this.shown < this.glyphs.length && this.pause <= 0) {
        this.acc -= 1;
        const g = this.glyphs[this.shown++];
        if (g.ch.trim()) sfx('se_page', { vol: 0.05 });
        this.pause = g.pause;
      }
      return;
    }
    this.holdT += dt;
    if (this.holdT >= this.hold) this.outT = 0;
  }

  draw(g: Gfx): void {
    const kIn = ease.cubicOut(Math.min(1, this.t / 120));
    const kOut = this.outT >= 0 ? 1 - Math.min(1, this.outT / 200) : 1;
    const a = kIn * kOut;
    if (a <= 0) return;
    const y = BOX.y + Math.round((1 - kIn) * 6);
    drawWindow(g, BOX.x, y, BOX.w, BOX.h, UI, a, { margin: 14, curl: false });
    const ctx = g.ctx;
    ctx.save();
    ctx.globalAlpha = a;
    for (let i = 0; i < this.shown && i < this.glyphs.length; i++) {
      const gl = this.glyphs[i];
      drawGlyph(ctx, gl.ch, BOX.textX + gl.x, y + BOX.padY + gl.y, gl.color);
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
