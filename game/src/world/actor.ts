// Field actors: the player, the follower (Kanenari), NPCs, enemy symbols and
// restored objects. Position = feet (bottom-centre) in world pixels, kept as
// floats for sub-pixel movement; drawing always rounds.

import type { Gfx } from '../engine/gfx';
import type { Dir } from '../game/state';
import {
  animFrame,
  animLength,
  charSprite,
  emoteFrames,
  emoteLoopFrames,
  EMOTE_FRAME_MS,
  idleFrame,
  poseFrame,
  walkFrame,
  type CharSprite,
  type EmoteKind,
} from '../art/chars';

export type ActorKind = 'player' | 'follower' | 'npc' | 'sym' | 'restored';

export const DIR_VEC: Record<Dir, [number, number]> = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

export function dirFromVec(dx: number, dy: number, prev: Dir): Dir {
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return prev;
  if (Math.abs(dx) > Math.abs(dy) + 0.01) return dx > 0 ? 'right' : 'left';
  if (Math.abs(dy) > Math.abs(dx) + 0.01) return dy > 0 ? 'down' : 'up';
  // exact diagonal: keep the previous axis if it matches
  if ((prev === 'left' && dx < 0) || (prev === 'right' && dx > 0) || (prev === 'up' && dy < 0) || (prev === 'down' && dy > 0))
    return prev;
  return dy > 0 ? 'down' : 'up';
}

export class Actor {
  id: string;
  kind: ActorKind;
  spriteId: string;
  sprite: CharSprite;
  x: number;
  y: number;
  dir: Dir = 'down';
  moving = false;
  running = false;
  walkT = 0;
  idleT = 0;
  /** One-off / looping named anim override. */
  anim: string | null = null;
  animT = 0;
  animLoop = true;
  /** Held pose (extra) when idle. */
  pose: string | null = null;
  /** Temporary pose override (look_up etc.). */
  tempPose: string | null = null;
  /** Hop (jump) state. */
  hopT = 0;
  hopDur = 0;
  hopH = 0;
  /** Small "surprised" 1px lift for one frame when talked to. */
  lift = 0;
  emote: { kind: EmoteKind; t: number; dur: number } | null = null;
  visible = true;
  alpha = 1;
  /** Collision box (feet-anchored). */
  bw = 12;
  bh = 8;
  solid = true;
  /** Pixel draw offset (sitting on a wall, perched on a pole...). */
  ox = 0;
  oy = 0;
  /** Long shadow height (0 = none, undefined = sprite height). */
  shadowH: number | undefined;
  /** Scripted path (world px points) and speed (px/s). */
  path: [number, number][] = [];
  pathSpeed = 72;
  /** Arbitrary per-kind state. */
  data: Record<string, unknown> = {};
  /** Blink (stun) until this time (ms). */
  blinkUntil = 0;
  /** Face direction lock (don't auto-face while walking scripted paths). */
  faceLock = false;
  /** Custom draw (restored props on trees etc.). */
  drawFn: ((g: Gfx, x: number, y: number) => void) | null = null;

  constructor(id: string, kind: ActorKind, spriteId: string, x: number, y: number) {
    this.id = id;
    this.kind = kind;
    this.spriteId = spriteId;
    this.sprite = charSprite(spriteId);
    this.x = x;
    this.y = y;
  }

  setSprite(id: string): void {
    this.spriteId = id;
    this.sprite = charSprite(id);
  }

  get tileX(): number {
    return Math.floor(this.x / 16);
  }
  get tileY(): number {
    return Math.floor((this.y - 1) / 16);
  }

  playAnim(name: string, loop = false): void {
    this.anim = name;
    this.animT = 0;
    this.animLoop = loop;
  }

  animDone(): boolean {
    if (!this.anim) return true;
    const a = this.sprite.anims?.[this.anim];
    if (!a) return this.animT > 400;
    return !this.animLoop && this.animT >= animLength(a);
  }

  hop(h = 6, ms = 260): void {
    this.hopT = 0;
    this.hopDur = ms;
    this.hopH = h;
  }

  showEmote(kind: EmoteKind, dur = 1200): void {
    this.emote = { kind, t: 0, dur };
  }

  update(dt: number): void {
    if (this.moving) this.walkT += dt;
    else this.walkT = 0;
    this.idleT += dt;
    if (this.anim) {
      this.animT += dt;
      if (!this.animLoop && this.animDone() && this.animT > 5000) this.anim = null;
    }
    if (this.hopDur > 0) {
      this.hopT += dt;
      if (this.hopT >= this.hopDur) this.hopDur = 0;
    }
    if (this.lift > 0) this.lift -= dt;
    if (this.emote) {
      this.emote.t += dt;
      if (this.emote.dur > 0 && this.emote.t > this.emote.dur) this.emote = null;
    }
  }

  hopOffset(): number {
    if (this.hopDur <= 0) return 0;
    const p = this.hopT / this.hopDur;
    return -Math.round(Math.sin(p * Math.PI) * this.hopH);
  }

  frame(): HTMLCanvasElement {
    const s = this.sprite;
    if (this.anim) {
      const a = s.anims?.[this.anim];
      if (a) return animFrame(s, this.anim, this.animLoop ? this.animT : Math.min(this.animT, animLength(a) - 1), this.dir);
      return poseFrame(s, this.anim, this.dir);
    }
    if (this.tempPose) return poseFrame(s, this.tempPose, this.dir);
    if (this.moving) return walkFrame(s, this.dir, this.walkT, this.running);
    if (this.pose) {
      const a = s.anims?.[this.pose];
      if (a) return animFrame(s, this.pose, this.idleT, this.dir);
      if (s.extra?.[this.pose] || s.extraDir?.[this.pose]) return poseFrame(s, this.pose, this.dir);
    }
    return idleFrame(s, this.dir, this.idleT + (this.data.idlePhase as number | undefined ?? 0));
  }

  /** Top-left draw position (world px) of the current frame. */
  drawPos(img: HTMLCanvasElement): [number, number] {
    const x = Math.round(this.x + this.ox - img.width / 2);
    const y = Math.round(this.y + this.oy - img.height + this.hopOffset() - (this.lift > 0 ? 1 : 0));
    return [x, y];
  }

  draw(g: Gfx, camX: number, camY: number, t: number): void {
    if (!this.visible) return;
    if (this.blinkUntil > t && Math.floor(t / 80) % 2 === 0) return;
    if (this.drawFn) {
      this.drawFn(g, Math.round(this.x + this.ox - camX), Math.round(this.y + this.oy - camY));
      return;
    }
    const img = this.frame();
    const [x, y] = this.drawPos(img);
    g.img(img, x - camX, y - camY, this.alpha < 1 ? { alpha: this.alpha } : {});
  }

  drawEmote(g: Gfx, camX: number, camY: number): void {
    if (!this.emote || !this.visible) return;
    const frames = emoteFrames(this.emote.kind);
    const pop = frames.length * EMOTE_FRAME_MS;
    let img: HTMLCanvasElement;
    if (this.emote.t < pop) img = frames[Math.min(frames.length - 1, Math.floor(this.emote.t / EMOTE_FRAME_MS))];
    else {
      const loop = emoteLoopFrames(this.emote.kind);
      img = loop[Math.floor((this.emote.t - pop) / (EMOTE_FRAME_MS * 3)) % loop.length];
    }
    const top = this.y + this.oy - this.sprite.h + this.hopOffset() - 2;
    g.img(img, Math.round(this.x + this.ox - img.width / 2 - camX), Math.round(top - img.height - camY));
  }
}
