// Field enemy symbols (00_concept 6.11, 20_systems_battle 14): idle and
// chase behaviours, back-attack / ambush detection, the battle hand-off and
// the "restored object" left behind after a win.
//
// Chapter 2 (51_ch2_battle 11.2 / 11.3, 52 1.5 / 8.5) adds seven behaviours —
// sune, boar, mujin, kakashi, kakashi_stand, fence, tetsuya — and the rule
// of the dark: a symbol standing on a dark tile notices nothing while it is
// out of the tomato light's reach (R + 8px); the moment it comes into it a
// 「？」 pops over it and it stands dazzled for 0.5 s (the time to slip away
// or get behind it). テツヤ carries his own headlight (render.ts draws the
// fan from a.data.lampAngle).

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
import { cellAt } from './maps';
import { villagePulse } from './hoshi';
import type { SymbolObj } from './types';
import * as snd from './audio';

type Mode =
  | 'idle' | 'notice' | 'chase' | 'return' | 'rest' | 'shy' | 'stun'
  // chapter 2
  | 'turn' | 'roll' | 'paw' | 'charge' | 'leap' | 'leapUp' | 'drive' | 'stop';

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
  // ---- chapter 2
  /** The facing it keeps at its post. */
  homeDir?: Dir;
  /** The second facing a boar turns to (every 3 s). */
  altDir?: Dir;
  /** Its band (px, feet): it never leaves it (SymbolObj.span). */
  span?: [number, number, number, number];
  /** Was it within the light's reach last frame (dark symbols)? */
  lit?: boolean;
  /** Dazzled by the light (ms left). */
  dazzle?: number;
  /** A straight run: unit vector and px so far (the rolling tomato, the charging boar). */
  rv?: [number, number];
  run?: number;
  /** A tile hop / leap in progress: from, to, elapsed, length (ms). */
  hopFrom?: [number, number];
  hopT?: number;
  hopMs?: number;
  /** The glance over the shoulder (ms left) of a sulking tomato. */
  glance?: number;
  turned?: boolean;
  /** Village-clock tick last seen (the fence keeper's steps). */
  pulseSeen?: number;
  stepFrom?: [number, number];
  stepTo?: [number, number];
  /** テツヤ: the angle of the lamp while he turns at an end of the furrow. */
  lampFrom?: number;
  /** Width of the feet box it walks with (narrower than its contact box). */
  moveW?: number;
}

/** Chapter-2 behaviours (51 11.2). */
const CH2_MOVES = new Set(['sune', 'boar', 'mujin', 'kakashi', 'kakashi_stand', 'fence', 'tetsuya']);

/** Does the sprite have this pose (an anim or a still), so a.pose may name it? */
function hasPose(a: Actor, name: string): boolean {
  const s = a.sprite;
  return !!(s.anims?.[name] || s.extra?.[name] || s.extraDir?.[name]);
}
function setPose(a: Actor, name: string | null): void {
  a.pose = name && hasPose(a, name) ? name : null;
}
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

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
  if (e.includes('sune_tomato')) return 'sune';
  if (e.includes('chototsu')) return 'boar';
  if (e.includes('mujin')) return 'mujin';
  if (e.includes('henoheno')) return 'kakashi_stand';
  if (e.includes('biribiri')) return 'fence';
  if (e.includes('tetsuya')) return 'tetsuya';
  return 'momisugi';
}

export class SymbolAI {
  /** The party's grace this frame (FieldScene.symbolsCalm): nobody notices, charges or walks into Minato. */
  private calmNow = false;

  constructor(private f: FieldScene) {}

  /** Would a symbol whose feet stand at (x, y) touch Minato (the contact boxes of checkContacts, 2px margin)? */
  private touchesPlayer(a: Actor, x: number, y: number): boolean {
    const p = this.f.player;
    const al = x + a.ox - a.bw / 2 - 2;
    const ar = x + a.ox + a.bw / 2 + 2;
    const at = y - Math.max(a.bh, 10) - 2;
    const ab = y + 3;
    return p.x - 5 < ar && p.x + 5 > al && p.y - 8 < ab && p.y > at;
  }

  /**
   * Free for a symbol to move to (walls, and Minato himself while the party
   * is in its grace). One lying on something solid (the cicada on the tree's
   * planting) may move as long as it enters no solid tile it isn't on already.
   */
  private freeFor(a: Actor, x: number, y: number): boolean {
    // chapter-2 symbols are wider to touch than to walk: their feet fit a
    // 1-tile lane (the boar between the greenhouses, the fence keeper along
    // the fence posts) — 51 11.2's boxes are the contact boxes
    const wide = a.bw;
    const mw = (a.data.sym as SymState | undefined)?.moveW;
    if (mw) a.bw = mw;
    try {
      if (!this.f.free(a, x, y, true)) {
        const now = this.solidUnder(a, a.x, a.y);
        if (!now.size) return false;
        for (const k of this.solidUnder(a, x, y)) if (!now.has(k)) return false;
      }
    } finally {
      a.bw = wide;
    }
    return !(this.calmNow && this.touchesPlayer(a, x, y) && !this.touchesPlayer(a, a.x, a.y));
  }

  /** Solid tiles (keys) under the feet box of `a` standing at (x, y); a box off the map counts as solid. */
  private solidUnder(a: Actor, x: number, y: number): Set<number> {
    const out = new Set<number>();
    const m = this.f.map;
    const l = x - a.bw / 2;
    const r = x + a.bw / 2 - 0.01;
    const t = y - a.bh;
    const b = y - 0.01;
    if (l < 0 || t < 0 || r >= m.w * 16 || b >= m.h * 16) out.add(-1);
    for (const px of [l, (l + r) / 2, r])
      for (const py of [t, b]) {
        const tx = Math.floor(px / 16);
        const ty = Math.floor(py / 16);
        if (this.f.isSolidTile(tx, ty)) out.add(ty * 4096 + tx);
      }
    return out;
  }

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
    // contact boxes follow the field sprite's width (14.1: big enemies)
    a.bw = k === 'ojigi' ? 22 : k === 'semi' ? 20 : k === 'soujirou' ? 20 : 12;
    a.bh = 8;
    a.solid = k === 'ojigi';
    if (k === 'soujirou') st.timer = 600;
    if (k === 'semi') a.pose = 'dead';
    if (k === 'hato') a.pose = 'peck';
    a.data.idlePhase = Math.floor(Math.random() * 3000);
    if (CH2_MOVES.has(k)) this.initCh2(a, st, o);
  }

  /** Chapter-2 set-up (51 11.2: contact boxes, posts, bands, the boar's second facing, テツヤ's lamp). */
  private initCh2(a: Actor, st: SymState, o: SymbolObj): void {
    const k = st.kind;
    st.homeDir = o.dir ?? 'down';
    const box: Record<string, [number, number]> = {
      sune: [o.enemies.length > 1 ? 22 : 16, 8],
      boar: [20, 8],
      mujin: [12, 8],
      kakashi: [12, 8],
      kakashi_stand: [12, 8],
      fence: [20, 8],
      tetsuya: [26, 10],
    };
    [a.bw, a.bh] = box[k] ?? [12, 8];
    st.moveW = k === 'tetsuya' ? 16 : 12;
    if (o.span) {
      const r = o.span;
      st.span = [r.x * T + 8, r.y * T + 16, (r.x + r.w - 1) * T + 8, (r.y + r.h - 1) * T + 16];
    }
    if (o.to) st.b = [o.to[0] * T + 8, o.to[1] * T + 16];
    st.a = [a.x, a.y];
    st.timer = 600 + Math.random() * 1800;
    if (k === 'boar') {
      // the second facing: a side with room in front of it, else the other side
      const side: Dir[] = st.homeDir === 'up' || st.homeDir === 'down' ? ['left', 'right'] : ['up', 'down'];
      const room = (d: Dir) => {
        const [vx, vy] = DIR_VEC[d];
        let n = 0;
        for (let i = 1; i <= 3; i++) if (this.f.free(a, a.x + vx * T * i, a.y + vy * T * i, true)) n++;
        return n;
      };
      st.altDir = room(side[0]) >= room(side[1]) ? side[0] : side[1];
      // the one at the wallow rolls in the mud, the other digs at the greenhouse skirt
      const c = cellAt(this.f.map, Math.floor(a.x / T), Math.floor((a.y - 1) / T));
      a.data.boarIdle = String(c?.ground ?? '').includes('nuta') ? 'wallow' : 'dig';
      setPose(a, a.data.boarIdle as string);
    }
    if (k === 'kakashi') {
      // the ridge it hops along: its band's two ends, else home ↔ to
      if (st.span) {
        const [x0, y0, x1, y1] = st.span;
        const horiz = x1 - x0 >= y1 - y0;
        st.a = horiz ? [x0, a.y] : [a.x, y0];
        st.b = horiz ? [x1, a.y] : [a.x, y1];
      }
      st.toB = true;
      st.timer = 2000 * Math.random();
    }
    if (k === 'fence') {
      st.toB = true;
      if (!st.span) st.span = [Math.min(st.a[0], st.b?.[0] ?? a.x), Math.min(st.a[1], st.b?.[1] ?? a.y), Math.max(st.a[0], st.b?.[0] ?? a.x), Math.max(st.a[1], st.b?.[1] ?? a.y)];
      st.pulseSeen = -1;
    }
    if (k === 'tetsuya') {
      st.mode = 'drive';
      st.toB = true;
      a.data.selfLit = true;
      a.data.lampAngle = st.homeDir === 'left' ? Math.PI : 0;
      a.solid = false;
    }
    if (k === 'mujin') st.timer = 1000 * Math.random();
    if (k === 'sune') setPose(a, 'sulk');
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
    // a scene has it (api holdSymbol / aimLamp): it stands as the scene left it
    if (a.data.scripted) {
      a.moving = false;
      return;
    }
    const st = this.st(a);
    const f = this.f;
    // just arrived / just back from an event or a battle: they carry on
    // idling but don't notice him, charge, or roll into him
    this.calmNow = f.symbolsCalm();
    if (this.calmNow) active = false;
    if (st.mode === 'stun') {
      st.timer -= dt;
      a.moving = false;
      if (st.timer <= 0) {
        st.mode = 'idle';
        st.timer = 1500;
      }
      return;
    }
    // the dark (51 11.3): out of the light's reach nothing is noticed; coming
    // into it, a 「？」 and 0.5 s dazzled on the spot
    if (f.light.actorInDark(a)) {
      const lit = f.light.symbolLit(a);
      if (lit && st.lit === false && st.kind !== 'tetsuya') {
        a.showEmote('question', 900);
        snd.seAt('se_emote_question', a.x, a.y, { vol: 0.5, pitch: 1.2 });
        st.dazzle = 500;
      }
      st.lit = lit;
      if (!lit) active = false;
    } else st.lit = true;
    if ((st.dazzle ?? 0) > 0) {
      st.dazzle! -= dt;
      a.moving = false;
      return;
    }
    const d = this.dist(a);
    const p = f.player;
    const toP = () => stepToward(a, p.x, p.y, 0, 0, this.nw()); // face only
    void toP;
    // outclassed symbols blush and freeze (14.5): no chasing, no running away.
    // Within 4 tiles they turn to Minato, show 照れ and quiver in place until
    // he is 6 tiles away again.
    if (active && this.outclassed(a) && st.kind !== 'semi' && st.kind !== 'tetsuya' && (d < 4 || (st.mode === 'shy' && d < 6))) {
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
      case 'sune':
        this.sune(a, st, d, dt, active);
        break;
      case 'boar':
        this.boar(a, st, dt, active);
        break;
      case 'mujin':
        this.mujin(a, st, d, dt, active);
        break;
      case 'kakashi':
      case 'kakashi_stand':
        this.kakashi(a, st, d, dt, active);
        break;
      case 'fence':
        this.fence(a, st, d, dt, active);
        break;
      case 'tetsuya':
        this.tetsuya(a, st, dt);
        break;
    }
  }

  private nw() {
    return {
      t: this.f.t,
      free: (b: Actor, x: number, y: number) => this.freeFor(b, x, y),
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
        snd.seAt('se_symbol_notice', a.x, a.y);
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
      // along the street and back, never a tile south (in front of it
      // stands the arcade pillar that would hide it: occlusion QA)
      const dirs: Dir[] = ['left', 'right', 'up'];
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
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
          snd.seAt('se_semi_hop', a.x, a.y);
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
    // it jumps when he steps into the lane right next to it (its body is
    // 24px wide: 1.5 tiles centre to centre); walking past a tile further
    // off — up the alley beside the higurashi tree, from wherever in that
    // lane — lets it be, so it stays an optional fight
    if (active && d < 1.5) {
      st.mode = 'chase';
      st.hops = 3;
      st.timer = 120;
      a.showEmote('exclaim', 600);
      snd.seAt('se_symbol_notice', a.x, a.y);
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
      snd.seAt('se_symbol_notice', a.x, a.y);
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
      snd.seAt('se_symbol_notice', a.x, a.y);
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
    if (!this.freeFor(a, tx, ty)) return;
    a.dir = dirFromVec(tx - a.x, ty - a.y, a.dir);
    st.hopTarget = [tx, ty];
    a.hop(6, chase ? 280 : 320);
    snd.seAt('se_umbrella_hop', a.x, a.y, { vol: 0.6 });
  }

  private ojigi(a: Actor, st: SymState, dt: number): void {
    a.moving = false;
    st.timer -= dt;
    if (st.timer <= 0) {
      st.timer = 3000;
      a.playAnim('bow');
    }
  }

  /**
   * ソウジロウ (14.2): drives straight on at 2.5 and turns 90° at walls (25%
   * about-face). It doesn't steer after Minato, it rams: once he stands in
   * its lane — the row or the column it can drive along, up to 9 tiles away
   * with nothing solid in between — it spins round to face him (！), then
   * drives at him in a straight line at 4.0 until it hits a wall or has
   * passed him, and only then rolls on as before. At a wall it prefers the
   * turn that points it at his side of the corridor.
   */
  private soujirou(a: Actor, st: SymState, d: number, dt: number, active: boolean): void {
    const p = this.f.player;
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    if (st.timer > 0) st.timer -= dt;
    if (st.mode === 'notice') {
      // the little spin towards him, then go
      a.moving = false;
      if (st.timer <= 0) {
        st.mode = 'chase';
        snd.seAt('se_robot_bump', a.x, a.y, { vol: 0.35, pitch: 1.4 });
      }
      return;
    }
    if (st.mode === 'chase') {
      const [fx, fy] = DIR_VEC[a.dir];
      // passed him by more than a tile, or he left the lane far behind: roll on
      const along = dx * fx + dy * fy;
      if (!active || along < -20 || d > 11) {
        st.mode = 'idle';
        st.timer = 1400;
        return;
      }
      if (!this.drive(a, 4.0 * T, dt)) {
        st.mode = 'idle';
        st.timer = 1400;
        this.bumpTurn(a, dx, dy);
      }
      return;
    }
    // idle: is he in a lane it can drive down?
    if (active && st.timer <= 0 && !this.outclassed(a)) {
      const lane = this.laneTo(a, dx, dy);
      if (lane) {
        st.mode = 'notice';
        st.timer = 380;
        a.dir = lane;
        a.moving = false;
        a.showEmote('exclaim', 700);
        snd.seAt('se_symbol_notice', a.x, a.y);
        return;
      }
    }
    if (!this.drive(a, 2.5 * T, dt)) this.bumpTurn(a, active && d < 9 ? dx : 0, active && d < 9 ? dy : 0);
  }

  /** Drive straight ahead; false when a wall is in the way. */
  private drive(a: Actor, speed: number, dt: number): boolean {
    const [fx, fy] = DIR_VEC[a.dir];
    const nx = a.x + (fx * speed * dt) / 1000;
    const ny = a.y + (fy * speed * dt) / 1000;
    if (!this.freeFor(a, nx, ny)) {
      a.moving = false;
      return false;
    }
    a.x = nx;
    a.y = ny;
    a.moving = true;
    return true;
  }

  /** Bumped a wall: 90° (towards (dx,dy) when given), 25% about-face. */
  private bumpTurn(a: Actor, dx: number, dy: number): void {
    snd.seAt('se_robot_bump', a.x, a.y, { vol: 0.5 });
    const [fx] = DIR_VEC[a.dir];
    const back = ({ up: 'down', down: 'up', left: 'right', right: 'left' } as Record<Dir, Dir>)[a.dir];
    const side: Dir[] = fx !== 0 ? ['up', 'down'] : ['left', 'right'];
    const r = Math.random();
    if (r < 0.25) {
      a.dir = back;
      return;
    }
    const toward = fx !== 0 ? (dy < -4 ? 'up' : dy > 4 ? 'down' : null) : dx < -4 ? 'left' : dx > 4 ? 'right' : null;
    // turn his way 3 times in 4 (a wall on that side sends it the other way)
    const pick: Dir = toward && r < 0.81 ? toward : side[Math.floor(Math.random() * 2)];
    const [px, py] = DIR_VEC[pick];
    a.dir = this.f.free(a, a.x + px * 4, a.y + py * 4, true) ? pick : side[0] === pick ? side[1] : side[0];
  }

  /**
   * The direction of a clear straight run from the vacuum to the player
   * (his feet within 7px of its row or column, at most 9 tiles), or null.
   */
  private laneTo(a: Actor, dx: number, dy: number): Dir | null {
    let dir: Dir | null = null;
    if (Math.abs(dy) <= 7 && Math.abs(dx) <= 9 * T) dir = dx < 0 ? 'left' : 'right';
    else if (Math.abs(dx) <= 7 && Math.abs(dy) <= 9 * T) dir = dy < 0 ? 'up' : 'down';
    if (!dir) return null;
    const [fx, fy] = DIR_VEC[dir];
    const dist = Math.abs(fx ? dx : dy);
    for (let s = 8; s < dist; s += 6) if (!this.f.free(a, a.x + fx * s, a.y + fy * s, true)) return null;
    return dir;
  }

  // ---------------------------------------------------------------- chapter 2 (51 11.2)

  /** Clamp a feet position to the symbol's band (SymbolObj.span). */
  private inSpan(st: SymState, x: number, y: number): [number, number] {
    if (!st.span) return [x, y];
    const [x0, y0, x1, y1] = st.span;
    return [Math.max(x0, Math.min(x1, x)), Math.max(y0, Math.min(y1, y))];
  }

  /**
   * One hop of a tile-hopper (ヘノヘノ課長, ムジン販売員): a hop in progress is
   * carried on (moved in a straight line under the arc); otherwise the next
   * hop towards (tx, ty) starts — one tile, or less when the goal is nearer.
   * Returns true when it stands at the goal (or can't get any closer).
   */
  private hopToward(a: Actor, st: SymState, tx: number, ty: number, ms: number, h: number, dt: number, se?: () => void): boolean {
    if (st.hopTarget && st.hopFrom) {
      st.hopT = (st.hopT ?? 0) + dt;
      const k = Math.min(1, st.hopT / (st.hopMs ?? ms));
      a.x = st.hopFrom[0] + (st.hopTarget[0] - st.hopFrom[0]) * k;
      a.y = st.hopFrom[1] + (st.hopTarget[1] - st.hopFrom[1]) * k;
      a.moving = false;
      if (k >= 1) {
        st.hopTarget = undefined;
        st.hopFrom = undefined;
      }
      return false;
    }
    const dx = tx - a.x;
    const dy = ty - a.y;
    const l = Math.hypot(dx, dy);
    if (l < 1) {
      a.x = tx;
      a.y = ty;
      return true;
    }
    const step = Math.min(T, l);
    // straight at it, else along one axis (the ridge, the band), else stay
    const tries: [number, number][] = [[(dx / l) * step, (dy / l) * step]];
    if (Math.abs(dx) >= Math.abs(dy)) tries.push([Math.sign(dx) * Math.min(T, Math.abs(dx)), 0], [0, Math.sign(dy) * Math.min(T, Math.abs(dy))]);
    else tries.push([0, Math.sign(dy) * Math.min(T, Math.abs(dy))], [Math.sign(dx) * Math.min(T, Math.abs(dx)), 0]);
    for (const [mx, my] of tries) {
      if (Math.abs(mx) + Math.abs(my) < 1) continue;
      let [nx, ny] = this.inSpan(st, a.x + mx, a.y + my);
      if (Math.abs(nx - a.x) + Math.abs(ny - a.y) < 1) continue;
      if (!this.freeFor(a, nx, ny) || !this.freeFor(a, (a.x + nx) / 2, (a.y + ny) / 2)) continue;
      nx = Math.round(nx);
      ny = Math.round(ny);
      a.dir = dirFromVec(nx - a.x, ny - a.y, a.dir);
      st.hopFrom = [a.x, a.y];
      st.hopTarget = [nx, ny];
      st.hopT = 0;
      st.hopMs = ms;
      a.hop(h, ms);
      se?.();
      return false;
    }
    a.moving = false;
    return true;
  }

  /** Walk (not hop) back to the post and take up its facing again; true when there. */
  private walkHome(a: Actor, st: SymState, speed: number, dt: number): boolean {
    const [hx, hy] = st.home;
    if (stepToward(a, hx, hy, speed, dt, this.nw()) || Math.hypot(hx - a.x, hy - a.y) < 1) {
      a.x = hx;
      a.y = hy;
      a.moving = false;
      a.dir = st.homeDir ?? a.dir;
      return true;
    }
    if (!a.moving) {
      // blocked on the way (the party stands there): wait a moment
      st.timer = (st.timer ?? 0) - dt;
    }
    return false;
  }

  /**
   * スネトマト (sune): sulks with its back to the aisle, glancing over its
   * shoulder every 3 s (and the little 「ぷいっ」 back); within 3 tiles in any
   * direction it turns round in 0.5 s (se_h_sune) and rolls straight at where
   * he stood (2.5 tiles/s); at a wall — or 6 tiles on — it stops for 1.5 s,
   * turns again, and goes home when he has gone.
   */
  private sune(a: Actor, st: SymState, d: number, dt: number, active: boolean): void {
    const p = this.f.player;
    switch (st.mode) {
      case 'turn': {
        st.timer -= dt;
        a.moving = false;
        if (!st.turned && st.timer <= 250) {
          st.turned = true;
          const [hx, hy] = DIR_VEC[a.dir];
          a.dir = hx !== 0 ? (p.y < a.y ? 'up' : 'down') : p.x < a.x ? 'left' : 'right';
          void hy;
        }
        if (st.timer <= 0) {
          a.dir = dirFromVec(p.x - a.x, p.y - a.y, a.dir);
          const dx = p.x - a.x;
          const dy = p.y - a.y;
          const l = Math.hypot(dx, dy) || 1;
          st.rv = [dx / l, dy / l];
          st.run = 0;
          st.mode = 'roll';
          snd.seAt('se_h_roll', a.x, a.y, { vol: 0.5 });
        }
        return;
      }
      case 'roll': {
        const sp = (2.5 * T * dt) / 1000;
        const [vx, vy] = st.rv ?? [0, 1];
        const nx = a.x + vx * sp;
        const ny = a.y + vy * sp;
        if (!active || (st.run ?? 0) >= 6 * T || !this.freeFor(a, nx, ny)) {
          st.mode = 'rest';
          st.timer = 1500;
          a.moving = false;
          setPose(a, 'sulk');
          return;
        }
        a.x = nx;
        a.y = ny;
        st.run = (st.run ?? 0) + sp;
        a.dir = dirFromVec(vx, vy, a.dir);
        if (hasPose(a, 'roll')) {
          a.pose = 'roll';
          a.moving = false;
        } else a.moving = true;
        return;
      }
      case 'rest':
        st.timer -= dt;
        a.moving = false;
        if (st.timer > 0) return;
        if (active && d < 5) {
          st.mode = 'turn';
          st.timer = 500;
          st.turned = false;
          snd.seAt('se_h_sune', a.x, a.y);
        } else st.mode = 'return';
        return;
      case 'return':
        setPose(a, null);
        if (this.walkHome(a, st, 1.2 * T, dt)) {
          st.mode = 'idle';
          st.timer = 3000;
          setPose(a, 'sulk');
          a.hop(1, 120);
          snd.seAt('se_h_sune', a.x, a.y, { vol: 0.5 });
        } else if (active && d < 3) {
          st.mode = 'turn';
          st.timer = 500;
          st.turned = false;
          snd.seAt('se_h_sune', a.x, a.y);
        }
        return;
    }
    // idle: back turned; a glance over the shoulder every 3 s
    a.moving = false;
    st.timer -= dt;
    if ((st.glance ?? 0) > 0) {
      st.glance! -= dt;
      if (st.glance! <= 0) {
        a.dir = st.homeDir ?? a.dir;
        a.hop(1, 120);
      }
    } else if (st.timer <= 0) {
      st.timer = 3000;
      st.glance = 160;
      const h = st.homeDir ?? 'up';
      const sides: Dir[] = h === 'up' || h === 'down' ? ['left', 'right'] : ['up', 'down'];
      a.dir = sides[Math.floor(this.f.t / 3000) % 2];
    }
    if (active && d < 3) {
      st.mode = 'turn';
      st.timer = 500;
      st.turned = false;
      st.glance = 0;
      setPose(a, null);
      snd.seAt('se_h_sune', a.x, a.y);
    }
  }

  /** Is he in the boar's view: ahead within ±30°, 5 tiles, nothing solid between? */
  private boarSees(a: Actor): boolean {
    const p = this.f.player;
    const [fx, fy] = DIR_VEC[a.dir];
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    const l = Math.hypot(dx, dy);
    if (l < 1 || l > 5 * T + 4) return false;
    if ((dx * fx + dy * fy) / l < Math.cos(Math.PI / 6)) return false;
    for (let s = 8; s < l - 6; s += 6) if (!this.f.free(a, a.x + (dx / l) * s, a.y + (dy / l) * s, true)) return false;
    return true;
  }

  /**
   * チョトツ (boar): digs at the greenhouse skirt / rolls in the wallow,
   * turning between two facings every 3 s. Ahead within ±30° and 5 tiles:
   * 0.4 s of pawing the ground (se_h_boar level 0), then a straight charge
   * of 5 tiles at 5.5 tiles/s along its facing (level 1) — it never turns on
   * the field, a step aside and it goes by — then 2 s snorting and back.
   */
  private boar(a: Actor, st: SymState, dt: number, active: boolean): void {
    switch (st.mode) {
      case 'paw':
        st.timer -= dt;
        a.moving = false;
        if (st.timer <= 0) {
          st.mode = 'charge';
          st.run = 0;
          setPose(a, 'charge');
          snd.seAt('se_h_boar', a.x, a.y, { level: 1, vol: 0.6 });
        }
        return;
      case 'charge': {
        const sp = (5.5 * T * dt) / 1000;
        const [vx, vy] = DIR_VEC[a.dir];
        const nx = a.x + vx * sp;
        const ny = a.y + vy * sp;
        if ((st.run ?? 0) >= 5 * T || !this.freeFor(a, nx, ny)) {
          st.mode = 'rest';
          st.timer = 2000;
          a.moving = false;
          a.running = false;
          setPose(a, 'snort');
          return;
        }
        a.x = nx;
        a.y = ny;
        st.run = (st.run ?? 0) + sp;
        if (a.pose !== 'charge') {
          a.moving = true;
          a.running = true;
        }
        return;
      }
      case 'rest':
        st.timer -= dt;
        a.moving = false;
        if (st.timer <= 0) {
          st.mode = 'return';
          setPose(a, null);
        }
        return;
      case 'return':
        if (this.walkHome(a, st, 1.5 * T, dt)) {
          st.mode = 'idle';
          st.timer = 3000;
          setPose(a, a.data.boarIdle as string);
        }
        return;
    }
    a.moving = false;
    st.timer -= dt;
    if (st.timer <= 0) {
      st.timer = 3000;
      a.dir = a.dir === st.homeDir ? st.altDir ?? a.dir : st.homeDir ?? a.dir;
    }
    if (active && this.boarSees(a)) {
      st.mode = 'paw';
      st.timer = 400;
      setPose(a, 'paw');
      a.showEmote('exclaim', 700);
      snd.seAt('se_h_boar', a.x, a.y, { level: 0 });
    }
  }

  /**
   * ムジン販売員 (mujin): bobs on the stall's board once a second; within 2
   * tiles it jumps down (se_h_charin) to the tile in front of the stall
   * (SymbolObj.to) and hops after him at 3 tiles/s; 5 tiles away it hops
   * back and up onto its board.
   */
  private mujin(a: Actor, st: SymState, d: number, dt: number, active: boolean): void {
    const post = st.b ?? [st.home[0], st.home[1] + T];
    const leap = (to: [number, number], next: Mode, ms: number, h: number) => {
      st.hopFrom = [a.x, a.y];
      st.hopTarget = to;
      st.hopT = 0;
      st.hopMs = ms;
      st.mode = next;
      a.hop(h, ms);
    };
    // a leap onto / off the board ignores the board being solid
    if (st.mode === 'leap' || st.mode === 'leapUp') {
      st.hopT = (st.hopT ?? 0) + dt;
      const k = Math.min(1, st.hopT / (st.hopMs ?? 360));
      const [x0, y0] = st.hopFrom!;
      const [x1, y1] = st.hopTarget!;
      a.x = x0 + (x1 - x0) * k;
      a.y = y0 + (y1 - y0) * k;
      a.moving = false;
      if (k < 1) return;
      st.hopTarget = undefined;
      st.hopFrom = undefined;
      if (st.mode === 'leapUp') {
        st.mode = 'idle';
        st.timer = 1000;
        a.dir = st.homeDir ?? 'down';
      } else st.mode = 'chase';
      return;
    }
    if (st.mode === 'chase') {
      if (!active || d > 5) {
        st.mode = 'return';
        return;
      }
      const p = this.f.player;
      if (Math.hypot(p.x - a.x, p.y - a.y) > 10) this.hopToward(a, st, p.x, p.y, 330, 4, dt);
      else a.dir = dirFromVec(p.x - a.x, p.y - a.y, a.dir);
      return;
    }
    if (st.mode === 'return') {
      if (this.hopToward(a, st, post[0], post[1], 330, 4, dt)) leap([st.home[0], st.home[1]], 'leapUp', 380, 8);
      return;
    }
    // idle on the board
    a.moving = false;
    st.timer -= dt;
    if (st.timer <= 0) {
      st.timer = 1000;
      a.hop(3, 240);
    }
    if (active && d < 2) {
      a.showEmote('exclaim', 700);
      snd.seAt('se_h_charin', a.x, a.y, { vol: 0.5 });
      leap([post[0], post[1]], 'leap', 380, 9);
    }
  }

  /**
   * ヘノヘノ課長 (kakashi / kakashi_stand): one-legged hops. `kakashi` hops a
   * tile every 2 s along its ridge and notices him ahead of it (the half it
   * faces) within 4 tiles; `kakashi_stand` stands still and notices him
   * within 3 in any direction, turning round in 0.5 s. Then it hops at him,
   * a tile every 0.4 s (it takes the lantern for a bird), staying on its
   * ridge; 6 tiles away it goes back to its post. Each hop: se_h_kakashi_hop.
   */
  private kakashi(a: Actor, st: SymState, d: number, dt: number, active: boolean): void {
    const p = this.f.player;
    const hopSe = () => snd.seAt('se_h_kakashi_hop', a.x, a.y);
    const stand = st.kind === 'kakashi_stand';
    switch (st.mode) {
      case 'turn':
        st.timer -= dt;
        a.moving = false;
        if (!st.turned && st.timer <= 250) {
          st.turned = true;
          const h = st.homeDir ?? 'down';
          a.dir = h === 'up' || h === 'down' ? (p.x < a.x ? 'left' : 'right') : p.y < a.y ? 'up' : 'down';
        }
        if (st.timer <= 0) {
          a.dir = dirFromVec(p.x - a.x, p.y - a.y, a.dir);
          a.showEmote('exclaim', 700);
          snd.seAt('se_symbol_notice', a.x, a.y);
          st.mode = 'chase';
          st.timer = 0;
        }
        return;
      case 'chase':
        if (!st.hopTarget && (!active || d > 6)) {
          st.mode = 'return';
          return;
        }
        if (Math.hypot(p.x - a.x, p.y - a.y) > 12) this.hopToward(a, st, p.x, p.y, 400, 5, dt, hopSe);
        else if (!st.hopTarget) a.dir = dirFromVec(p.x - a.x, p.y - a.y, a.dir);
        else this.hopToward(a, st, p.x, p.y, 400, 5, dt, hopSe);
        return;
      case 'return':
        if (this.hopToward(a, st, st.home[0], st.home[1], 400, 5, dt, hopSe)) {
          st.mode = 'idle';
          st.timer = 2000;
          a.dir = st.homeDir ?? 'down';
        }
        return;
    }
    // idle
    if (st.hopTarget) {
      this.hopToward(a, st, 0, 0, 400, 5, dt);
      return;
    }
    a.moving = false;
    if (!stand) {
      st.timer -= dt;
      if (st.timer <= 0) {
        st.timer = 2000;
        const tgt = st.toB ? st.b ?? st.home : st.a ?? st.home;
        if (this.hopToward(a, st, tgt[0], tgt[1], 400, 5, 0, hopSe)) {
          st.toB = !st.toB;
          const back = st.toB ? st.b ?? st.home : st.a ?? st.home;
          this.hopToward(a, st, back[0], back[1], 400, 5, 0, hopSe);
        }
      }
    }
    if (!active) return;
    if (stand) {
      if (d < 3) {
        st.mode = 'turn';
        st.timer = 500;
        st.turned = false;
      }
      return;
    }
    const [fx, fy] = DIR_VEC[a.dir];
    const ahead = (p.x - a.x) * fx + (p.y - a.y) * fy > 0;
    if (d < 4 && ahead) {
      a.showEmote('exclaim', 700);
      snd.seAt('se_symbol_notice', a.x, a.y);
      st.mode = 'chase';
      st.timer = 0;
    }
  }

  /**
   * ビリビリ番 (fence): keeps to its band along the fence (x37–38). On the
   * patrol it steps a tile each tick of the village's 1.0 s clock — 0.5 s
   * moving, 0.5 s still, se_h_biri at .25 with each step. He within 3 tiles
   * ahead along the fence: it comes at him at 2.0 tiles/s (still for a beat
   * on every pulse) but never leaves the band; 5 tiles away it goes back.
   */
  private fence(a: Actor, st: SymState, d: number, dt: number, active: boolean): void {
    const p = this.f.player;
    const pulse = villagePulse();
    const newTick = st.pulseSeen !== undefined && pulse < st.pulseSeen;
    st.pulseSeen = pulse;
    if (st.mode === 'chase') {
      if (!active || d > 5) {
        st.mode = 'idle';
        st.stepTo = undefined;
        return;
      }
      if (newTick) snd.seAt('se_h_biri', a.x, a.y, { vol: 0.25 });
      if (pulse < 120) {
        a.moving = false;
        return;
      }
      const [tx, ty] = this.inSpan(st, p.x, p.y);
      stepToward(a, tx, ty, 2.0 * T, dt, this.nw());
      return;
    }
    // patrol: a tile per tick
    if (newTick) {
      const tgt = st.toB ? st.b ?? st.home : st.a ?? st.home;
      if (Math.hypot(tgt[0] - a.x, tgt[1] - a.y) < 1) st.toB = !st.toB;
      const goal = st.toB ? st.b ?? st.home : st.a ?? st.home;
      const dx = goal[0] - a.x;
      const dy = goal[1] - a.y;
      const l = Math.hypot(dx, dy);
      if (l >= 1) {
        const k = Math.min(T, l) / l;
        const to = this.inSpan(st, a.x + dx * k, a.y + dy * k);
        if (this.freeFor(a, to[0], to[1])) {
          st.stepFrom = [a.x, a.y];
          st.stepTo = to;
          a.dir = dirFromVec(dx, dy, a.dir);
          snd.seAt('se_h_biri', a.x, a.y, { vol: 0.25 });
        }
      }
    }
    if (st.stepTo && st.stepFrom) {
      const k = Math.min(1, pulse / 500);
      a.x = st.stepFrom[0] + (st.stepTo[0] - st.stepFrom[0]) * k;
      a.y = st.stepFrom[1] + (st.stepTo[1] - st.stepFrom[1]) * k;
      a.moving = k < 1;
      if (k >= 1) st.stepTo = undefined;
    } else a.moving = false;
    if (!active) return;
    // ahead along the fence within 3 tiles (and near the band across it)
    const [fx, fy] = DIR_VEC[a.dir];
    const along = (p.x - a.x) * fx + (p.y - a.y) * fy;
    const across = Math.abs((p.x - a.x) * fy) + Math.abs((p.y - a.y) * fx);
    if (along > 0 && along <= 3 * T + 4 && across <= 2.5 * T) {
      st.mode = 'chase';
      st.stepTo = undefined;
      a.showEmote('exclaim', 700);
      snd.seAt('se_symbol_notice', a.x, a.y);
    }
  }

  /**
   * 耕うん機テツヤ (tetsuya): drives the tilled furrow (y4, x39–56) at 1.5
   * tiles/s; at each end it stops for 0.5 s, turns round — its headlight
   * sweeping over the hill path — and drives back (ambientEvent
   * 'amb_h_tetsuya' 'turn'). It notices nobody: touching it (or
   * trig_ch2_tetsuya) starts evt_ch2_tetsuya.
   */
  private tetsuya(a: Actor, st: SymState, dt: number): void {
    const A = st.a ?? st.home;
    const B = st.b ?? st.home;
    if (st.mode === 'stop') {
      st.timer -= dt;
      a.moving = false;
      const k = 1 - Math.max(0, st.timer) / 500;
      const from = st.lampFrom ?? 0;
      // the lamp turns through the north (up, −π/2): it sweeps the hill path
      const to = from === 0 ? -Math.PI : 0;
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      a.data.lampAngle = from + (to - from) * e;
      if (k >= 0.5) a.dir = st.toB ? 'right' : 'left';
      if (st.timer <= 0) {
        a.data.lampAngle = st.toB ? 0 : Math.PI;
        st.mode = 'drive';
      }
      return;
    }
    const tgt = st.toB ? B : A;
    a.data.lampAngle = st.toB ? 0 : Math.PI;
    const reached = stepToward(a, tgt[0], tgt[1], 1.5 * T, dt, this.nw());
    if (reached || (!a.moving && Math.abs(tgt[0] - a.x) < 2)) {
      st.mode = 'stop';
      st.timer = 500;
      st.lampFrom = st.toB ? 0 : -Math.PI;
      st.toB = !st.toB;
      snd.ambientEvent('amb_h_tetsuya', 'turn');
    }
    if (st.mode === 'drive') a.dir = st.toB ? 'right' : 'left';
  }

  // ---------------------------------------------------------------- contact

  checkContacts(): void {
    const f = this.f;
    if (f.t < f.invincibleUntil) return;
    const p = f.player;
    // in the grace only Minato walking into a symbol starts a battle
    if (!p.moving && f.symbolsCalm()) return;
    // player 10×8 at the feet; the symbol as wide as its field sprite (bw)
    // and at least 10 deep, so walking into (or standing on) a symbol whose
    // body visibly overlaps Minato's feet always starts the battle
    const pl = p.x - 5;
    const pr = p.x + 5;
    const pt = p.y - 8;
    const pb = p.y;
    for (const a of f.actors) {
      if (a.kind !== 'sym' || !a.visible) continue;
      const st = this.st(a);
      if (st.mode === 'stun') continue;
      const w = a.bw;
      const al = a.x + a.ox - w / 2;
      const ar = a.x + a.ox + w / 2;
      const at = a.y - Math.max(a.bh, 10);
      const ab = a.y + 1;
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
    if (st.kind === 'semi' || st.kind === 'ojigi' || st.kind === 'tetsuya') return 'normal';
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
