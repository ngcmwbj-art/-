// Field enemy symbols (00_concept 6.11, 20_systems_battle 14): idle and
// chase behaviours, back-attack / ambush detection, the battle hand-off and
// the "restored object" left behind after a win.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { state, type Dir } from '../game/state';
import { startBattle } from '../battle/api';
import { getEnemy } from '../data/battle';
import type { Actor } from './actor';
import { DIR_VEC, dirFromVec } from './actor';
import type { FieldScene } from './field';
import { stepToward } from './npc';
import { getScript } from './scripts';
import type { SymbolObj } from './types';
import * as snd from './audio';

type Mode = 'idle' | 'notice' | 'chase' | 'return' | 'rest' | 'shy' | 'stun';

interface SymState {
  obj: SymbolObj;
  kind: NonNullable<SymbolObj['move']>;
  mode: Mode;
  timer: number;
  home: [number, number];
  /** Patrol endpoints (px). */
  a?: [number, number];
  b?: [number, number];
  toB?: boolean;
  hops?: number;
  hopTarget?: [number, number];
  noticed?: boolean;
}

const T = 16;

function kindFor(o: SymbolObj): SymState['kind'] {
  if (o.move) return o.move;
  const e = o.enemies[0] ?? '';
  if (e.includes('hato')) return 'hato';
  if (e.includes('semi')) return 'semi';
  if (e.includes('cone')) return 'cone';
  if (e.includes('wasure')) return 'umbrella';
  if (e.includes('ojigi')) return 'ojigi';
  if (e.includes('souji')) return 'soujirou';
  return 'momisugi';
}

export class SymbolAI {
  constructor(private f: FieldScene) {}

  init(a: Actor, o: SymbolObj): void {
    const k = kindFor(o);
    const st: SymState = { obj: o, kind: k, mode: 'idle', timer: 1000 + Math.random() * 2000, home: [a.x, a.y] };
    if (k === 'cone' && o.to) {
      st.a = [a.x, a.y];
      st.b = [o.to[0] * T + 8, o.to[1] * T + 16];
      st.toB = true;
      st.timer = (o.phase ?? 0) * 1000;
    }
    a.data.sym = st;
    a.bw = k === 'ojigi' ? 22 : k === 'semi' ? 20 : 12;
    a.bh = 8;
    a.solid = k === 'ojigi';
    if (k === 'semi') a.pose = 'dead';
    if (k === 'hato') a.pose = 'peck';
    a.data.idlePhase = Math.floor(Math.random() * 3000);
  }

  private st(a: Actor): SymState {
    return a.data.sym as SymState;
  }

  private dist(a: Actor): number {
    return Math.hypot(this.f.player.x - a.x, this.f.player.y - a.y) / T;
  }

  /** Party is 2+ levels above the enemy: the symbol looks away and keeps its distance (14.5). */
  private outclassed(a: Actor): boolean {
    const st = this.st(a);
    if (st.kind === 'ojigi') return false;
    const lvl = getEnemy(st.obj.enemies[0] ?? '')?.lvl ?? 1;
    const party = Math.max(1, ...state.party.map((m) => m.level));
    return party >= lvl + 2;
  }

  update(a: Actor, dt: number, active: boolean): void {
    a.update(dt);
    const st = this.st(a);
    const f = this.f;
    if (st.mode === 'stun') {
      st.timer -= dt;
      a.moving = false;
      if (st.timer <= 0) {
        st.mode = 'idle';
        st.timer = 1500;
      }
      return;
    }
    const d = this.dist(a);
    const p = f.player;
    const toP = () => stepToward(a, p.x, p.y, 0, 0, this.nw()); // face only
    void toP;
    // outclassed symbols blush and freeze (14.5): no chasing, no running away.
    // Within 4 tiles they turn to Minato, show 照れ and quiver in place until
    // he is 6 tiles away again.
    if (active && this.outclassed(a) && st.kind !== 'semi' && (d < 4 || (st.mode === 'shy' && d < 6))) {
      if (st.mode !== 'shy') {
        st.mode = 'shy';
        a.showEmote('shy', 0);
        a.data.shyX = a.x;
      }
      a.moving = false;
      a.path = [];
      a.dir = dirFromVec(p.x - a.x, p.y - a.y, a.dir);
      // tiny tremble (1px, every other 90ms)
      a.ox = Math.floor(f.t / 90) % 2 ? 1 : 0;
      return;
    } else if (st.mode === 'shy') {
      st.mode = 'return';
      a.ox = 0;
      if (a.emote?.kind === 'shy') a.emote = null;
    }

    switch (st.kind) {
      case 'hato':
        this.hato(a, st, d, dt, active);
        break;
      case 'semi':
        this.semi(a, st, d, dt, active);
        break;
      case 'cone':
        this.cone(a, st, d, dt, active);
        break;
      case 'umbrella':
        this.umbrella(a, st, d, dt, active);
        break;
      case 'ojigi':
        this.ojigi(a, st, dt);
        break;
      case 'soujirou':
        this.soujirou(a, st, d, dt, active);
        break;
      case 'momisugi':
        a.moving = false;
        a.pose = d < 3 && active ? 'beckon' : null;
        break;
    }
  }

  private nw() {
    return {
      t: this.f.t,
      free: (b: Actor, x: number, y: number) => this.f.free(b, x, y, true),
      actorById: (id: string) => this.f.actorById(id),
      motion: 1,
    };
  }

  private hato(a: Actor, st: SymState, d: number, dt: number, active: boolean): void {
    const p = this.f.player;
    if (active && d < 4) {
      if (!st.noticed) {
        st.noticed = true;
        a.showEmote('exclaim', 700);
        snd.se('se_symbol_notice');
      }
      a.pose = null;
      stepToward(a, p.x, p.y, 3.0 * T, dt, this.nw());
      return;
    }
    st.noticed = false;
    if (st.hopTarget) {
      if (stepToward(a, st.hopTarget[0], st.hopTarget[1], 1.5 * T, dt, this.nw()) || !a.moving) st.hopTarget = undefined;
      return;
    }
    a.moving = false;
    a.pose = 'peck';
    st.timer -= dt;
    if (st.timer <= 0) {
      st.timer = 2000 + Math.random() * 2000;
      const dirs: Dir[] = ['left', 'right', 'up', 'down'];
      const dir = dirs[Math.floor(Math.random() * 4)];
      const [vx, vy] = DIR_VEC[dir];
      const tx = st.home[0] + vx * T * (Math.random() < 0.5 ? 0 : 1);
      const ty = st.home[1] + vy * T * (Math.random() < 0.5 ? 0 : 1);
      st.hopTarget = [tx, ty];
    }
  }

  private semi(a: Actor, st: SymState, d: number, dt: number, active: boolean): void {
    const p = this.f.player;
    if (st.mode === 'rest') {
      st.timer -= dt;
      a.pose = 'dead';
      a.moving = false;
      if (st.timer <= 0) st.mode = 'idle';
      return;
    }
    if (st.mode === 'chase') {
      st.timer -= dt;
      if (a.hopDur <= 0) {
        if (st.timer <= 0) {
          if ((st.hops ?? 0) <= 0) {
            st.mode = 'rest';
            st.timer = 1500;
            return;
          }
          st.hops = (st.hops ?? 0) - 1;
          a.hop(7, 250);
          snd.se('se_semi_hop');
          const dx = p.x - a.x;
          const dy = p.y - a.y;
          const l = Math.hypot(dx, dy) || 1;
          st.hopTarget = [a.x + (dx / l) * 5 * T * 0.25, a.y + (dy / l) * 5 * T * 0.25];
          st.timer = 450;
        }
      }
      if (st.hopTarget && a.hopDur > 0) {
        stepToward(a, st.hopTarget[0], st.hopTarget[1], 5 * T, dt, this.nw());
      }
      a.pose = a.hopDur > 0 ? 'hop' : 'dead';
      a.moving = false;
      return;
    }
    // idle: legs twitch now and then
    a.moving = false;
    a.pose = 'dead';
    st.timer -= dt;
    if (st.timer <= 0) {
      st.timer = 1500 + Math.random() * 2500;
      a.playAnim('twitch');
    }
    if (active && d < 2) {
      st.mode = 'chase';
      st.hops = 3;
      st.timer = 120;
      a.showEmote('exclaim', 600);
      snd.se('se_symbol_notice');
    }
  }

  private cone(a: Actor, st: SymState, d: number, dt: number, active: boolean): void {
    const p = this.f.player;
    const [fx, fy] = DIR_VEC[a.dir];
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const inFront = (dx * fx + dy * fy) / l > Math.cos(Math.PI / 4);
    if (st.mode === 'chase' || st.mode === 'notice') {
      if (d > 4) {
        st.mode = 'return';
        return;
      }
      if (st.mode === 'notice') {
        st.timer -= dt;
        a.moving = false;
        if (st.timer <= 0) st.mode = 'chase';
        return;
      }
      stepToward(a, p.x, p.y, 2.0 * T, dt, this.nw());
      return;
    }
    if (st.mode === 'return') {
      const h = st.toB ? st.a! : st.b!;
      if (stepToward(a, h[0], h[1], 1.5 * T, dt, this.nw())) st.mode = 'idle';
      return;
    }
    if (active && d < 3 && inFront) {
      st.mode = 'notice';
      st.timer = 900;
      a.showEmote('note', 1600);
      snd.se('se_symbol_notice');
      return;
    }
    // patrol 3 tiles
    if (st.timer > 0) {
      st.timer -= dt;
      a.moving = false;
      return;
    }
    const tgt = st.toB ? st.b! : st.a!;
    if (stepToward(a, tgt[0], tgt[1], 1.5 * T, dt, this.nw())) {
      st.toB = !st.toB;
      st.timer = 500;
    }
  }

  private umbrella(a: Actor, st: SymState, d: number, dt: number, active: boolean): void {
    const p = this.f.player;
    const r = (st.obj.radius ?? 3) * T;
    if (a.hopDur > 0 && st.hopTarget) {
      stepToward(a, st.hopTarget[0], st.hopTarget[1], 3.5 * T, dt, this.nw());
      a.moving = false;
      return;
    }
    st.timer -= dt;
    a.moving = false;
    if (st.timer > 0) return;
    const chase = active && d < 3;
    if (chase && !st.noticed) {
      st.noticed = true;
      a.showEmote('question', 700);
      snd.se('se_symbol_notice');
    }
    if (!chase) st.noticed = false;
    st.timer = chase ? 450 : 800;
    let tx: number;
    let ty: number;
    if (chase) {
      const dx = p.x - a.x;
      const dy = p.y - a.y;
      const l = Math.hypot(dx, dy) || 1;
      tx = a.x + (dx / l) * T;
      ty = a.y + (dy / l) * T;
    } else {
      const dirs: Dir[] = ['left', 'right', 'up', 'down'];
      const dir = dirs[Math.floor(Math.random() * 4)];
      const [vx, vy] = DIR_VEC[dir];
      tx = a.x + vx * T;
      ty = a.y + vy * T;
      if (Math.hypot(tx - st.home[0], ty - st.home[1]) > r) {
        tx = a.x + Math.sign(st.home[0] - a.x) * T;
        ty = a.y + Math.sign(st.home[1] - a.y) * T;
      }
    }
    if (!this.f.free(a, tx, ty, true)) return;
    a.dir = dirFromVec(tx - a.x, ty - a.y, a.dir);
    st.hopTarget = [tx, ty];
    a.hop(6, chase ? 280 : 320);
    snd.se('se_umbrella_hop', { vol: 0.6 });
  }

  private ojigi(a: Actor, st: SymState, dt: number): void {
    a.moving = false;
    st.timer -= dt;
    if (st.timer <= 0) {
      st.timer = 3000;
      a.playAnim('bow');
    }
  }

  private soujirou(a: Actor, st: SymState, d: number, dt: number, active: boolean): void {
    const p = this.f.player;
    const [fx, fy] = DIR_VEC[a.dir];
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const inFront = (dx * fx + dy * fy) / l > 0.8 && d < 3;
    const sp = (active && inFront ? 4.0 : 2.5) * T;
    const nx = a.x + (fx * sp * dt) / 1000;
    const ny = a.y + (fy * sp * dt) / 1000;
    if (this.f.free(a, nx, ny, true)) {
      a.x = nx;
      a.y = ny;
      a.moving = true;
    } else {
      snd.se('se_robot_bump', { vol: 0.5 });
      const turn: Dir[] = fx !== 0 ? ['up', 'down'] : ['left', 'right'];
      a.dir = Math.random() < 0.25 ? (({ up: 'down', down: 'up', left: 'right', right: 'left' }) as Record<Dir, Dir>)[a.dir] : turn[Math.floor(Math.random() * 2)];
    }
  }

  // ---------------------------------------------------------------- contact

  checkContacts(): void {
    const f = this.f;
    if (f.t < f.invincibleUntil) return;
    const p = f.player;
    for (const a of f.actors) {
      if (a.kind !== 'sym') continue;
      const st = this.st(a);
      if (st.mode === 'stun') continue;
      const pl = p.x - 5;
      const pr = p.x + 5;
      const pt = p.y - 8;
      const pb = p.y;
      const w = a.bw;
      const al = a.x - w / 2;
      const ar = a.x + w / 2;
      const at = a.y - 8;
      const ab = a.y;
      if (pl < ar && pr > al && pt < ab && pb > at) {
        this.touch(a, 'contact');
        return;
      }
    }
  }

  /** Initiative from facing (14.3). */
  initiative(a: Actor): 'party' | 'enemy' | 'normal' {
    const st = this.st(a);
    const p = this.f.player;
    if (st.kind === 'semi' || st.kind === 'ojigi') return 'normal';
    if (this.outclassed(a)) return 'party';
    const edir = st.kind === 'momisugi' ? 'down' : a.dir;
    const [ex, ey] = DIR_VEC[edir];
    let dx = p.x - a.x;
    let dy = p.y - a.y;
    let l = Math.hypot(dx, dy) || 1;
    if ((ex * dx + ey * dy) / l < -0.7) return 'party';
    const [px, py] = DIR_VEC[p.dir];
    dx = -dx;
    dy = -dy;
    l = Math.hypot(dx, dy) || 1;
    if ((px * dx + py * dy) / l < -0.7) return 'enemy';
    return 'normal';
  }

  touch(a: Actor, how: 'contact' | 'talk'): void {
    const st = this.st(a);
    const f = this.f;
    const scriptId = st.obj.script;
    if (scriptId && getScript(scriptId)) {
      f.runScriptId(scriptId, st.obj.id);
      return;
    }
    const ini = how === 'talk' ? 'normal' : this.initiative(a);
    f.startScript(this.battleCo(a, ini));
  }

  /** All symbols of one encounter (linked pairs). */
  private group(a: Actor): Actor[] {
    const key = this.st(a).obj.link ?? this.st(a).obj.id;
    return this.f.actors.filter((b) => b.kind === 'sym' && ((this.st(b).obj.link ?? this.st(b).obj.id) === key));
  }

  *battleCo(a: Actor, initiative: 'party' | 'enemy' | 'normal'): Co {
    const f = this.f;
    const st = this.st(a);
    const group = this.group(a);
    const key = st.obj.link ?? st.obj.id;
    const main = group.map((g) => this.st(g).obj).find((o) => o.enemies.length) ?? st.obj;
    const enemies = main.enemies;
    for (const g of group) g.moving = false;
    f.player.moving = false;
    const res = yield* startBattle({ enemies, initiative, music: main.music });
    if (res === 'win') {
      defeatSymbol(f, key);
    } else if (res === 'flee') {
      for (const g of group) {
        const s = this.st(g);
        s.mode = 'stun';
        s.timer = 3000;
        g.blinkUntil = f.t + 3000;
      }
      f.invincibleUntil = f.t + 1500;
      f.player.blinkUntil = f.t + 1500;
    } else {
      // lost & retried: push the player one tile back, stun the symbol
      const [dx, dy] = DIR_VEC[f.player.dir];
      const bx = f.player.x - dx * 16;
      const by = f.player.y - dy * 16;
      if (f.free(f.player, bx, by)) {
        f.player.x = bx;
        f.player.y = by;
      }
      for (const g of group) {
        const s = this.st(g);
        s.mode = 'stun';
        s.timer = 3000;
        g.blinkUntil = f.t + 3000;
      }
      f.invincibleUntil = f.t + 1500;
    }
    void game;
  }
}

/** Mark a symbol encounter as won: it never comes back and leaves its restored object. */
export function defeatSymbol(f: FieldScene, key: string): void {
  state.taken[key] = true;
  for (const a of [...f.actors]) {
    if (a.kind !== 'sym') continue;
    const st = a.data.sym as SymState;
    if ((st.obj.link ?? st.obj.id) === key) f.removeActor(a);
  }
  f.refreshPresence();
}
