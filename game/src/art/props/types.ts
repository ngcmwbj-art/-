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
  /**
   * Emissive layer (lamps, LEDs, neon, lit window glass). It is painted into
   * a separate buffer right after this prop in depth order, anything drawn
   * later in front of it cuts it out, and the buffer is laid over the world
   * after grading, so lights never darken and never paint over things that
   * stand in front of them.
   */
  glow?(g: Gfx, x: number, y: number, env: PropEnv): void;
  /** The glow belongs to a foreground part (lanterns under an overhead sign): painted after the fg layer, never cut. */
  glowFg?: boolean;
  /**
   * Light cast onto the surroundings (pools under street lamps, window light
   * on the pavement, lamp light on a floor). Drawn additively into the light
   * map that multiplies the graded world, so it brightens the ground and
   * whatever stands in it instead of painting a flat shape over it.
   */
  light?(g: Gfx, x: number, y: number, env: PropEnv): void;
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
  /**
   * "X-ray": while the player (or the follower) stands behind this prop (feet
   * above its foot line) and at least 30% of the character's pixels are
   * hidden by the prop's pixels, a see-through hole (an ellipse round the
   * character with a 2px dithered rim) opens in the prop in 0.15s, so tall
   * things (poles, pillars, flags) never hide characters and never vanish
   * as a whole. The value is the alpha left inside the hole (0 = open).
   * Whatever still covers a character is also drawn as a #2A2440 α50%
   * silhouette of it (for every prop and structure, xray or not).
   */
  xray?: number;
  /** Contact-shadow ellipse width (px) at the foot line. */
  contact?: number;
  /** Contact shadow centre x relative to anchor (px). */
  contactX?: number;
}

export type PropBuilder = (opts: Record<string, unknown>) => PropArt;
