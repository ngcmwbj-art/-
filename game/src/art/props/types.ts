// Prop art contract used by the field renderer.
import type { Gfx } from '../../engine/gfx';
import type { Grade } from '../../world/lighting';

export interface PropEnv {
  /** World time (ms). */
  t: number;
  /** Current stage (0/1/2, 3 = night). */
  stage: number;
  grade: Grade;
  /** Ambient-motion factor: 1 normal, 0 frozen (stage 1). */
  motion: number;
  /** Frozen-time clock: advances only while motion > 0 (ms). */
  mt: number;
  flag(id: string): number;
  /** Per-instance random seed. */
  seed: number;
  /** Distance (px) from the player's feet to the anchor tile center. */
  near: number;
  /** Player feet position in world px. */
  px: number;
  py: number;
}

export interface PropPart {
  ox: number;
  oy: number;
  img(env: PropEnv): HTMLCanvasElement | null;
  /** Fade to this alpha when the player is under it (tree canopies). */
  fade?: { x: number; y: number; w: number; h: number; alpha: number };
}

export interface PropArt {
  /** Art top-left relative to the anchor tile's top-left (px). */
  ox: number;
  oy: number;
  w: number;
  h: number;
  /** Depth-sort y relative to the anchor tile's top (px). */
  foot: number;
  img(env: PropEnv): HTMLCanvasElement | null;
  /** Parts drawn above characters (canopies, wires, signs overhead). */
  fg?: PropPart[];
  /** Extra per-frame drawing on top of the base image (world px of anchor tile). */
  over?(g: Gfx, x: number, y: number, env: PropEnv): void;
  /** Emissive layer drawn after grading (lamps, LEDs, neon). */
  glow?(g: Gfx, x: number, y: number, env: PropEnv): void;
  /** Long cast shadow from the silhouette of img() (height of the caster in px). */
  shadow?: number;
  /** Silhouette used for the cast shadow (defaults to img()). */
  shadowImg?(env: PropEnv): HTMLCanvasElement | null;
  /** Custom shadow painter into the shadow buffer (solid colour, world px). */
  shadowFn?(ctx: CanvasRenderingContext2D, x: number, y: number, dir: [number, number], len: number, env: PropEnv): void;
  /** Drawn flat on the ground (decal layer), never y-sorted. */
  flat?: boolean;
  /** Sky-reflecting glass mask (same size/offset as img). */
  glass?: HTMLCanvasElement;
  /** Contact-shadow ellipse width (px) at the foot line. */
  contact?: number;
  /** Contact shadow centre x relative to anchor (px). */
  contactX?: number;
}

export type PropBuilder = (opts: Record<string, unknown>) => PropArt;
