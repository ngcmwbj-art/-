// Emote balloon registry (the contract is re-exported by emotes.ts).
// Each emote is a short animation: frames are played once at EMOTE_FRAME_MS
// and the last frame is held. The art pops in (squash & stretch) and then
// settles. Anchor: bottom-center of the canvas — place it so the tail points
// at the character's head (about 2px above the sprite's top).

import { PixelCanvas } from '../../engine/pixel';

/**
 * 'shy' = 照れ (three vermilion blush strokes, 20_systems_battle 14.5: an
 * outclassed symbol blushes and freezes when it is looked at).
 */
export type EmoteKind = 'exclaim' | 'question' | 'dots' | 'note' | 'sweat' | 'anger' | 'heart' | 'zzz' | 'light' | 'shy';

export const EMOTE_KINDS: EmoteKind[] = ['exclaim', 'question', 'dots', 'note', 'sweat', 'anger', 'heart', 'zzz', 'light', 'shy'];

/** Recommended ms per emote frame. */
export const EMOTE_FRAME_MS = 60;

type Builder = () => HTMLCanvasElement[];
const builders = new Map<EmoteKind, Builder>();
const cache = new Map<EmoteKind, HTMLCanvasElement[]>();
const loopBuilders = new Map<EmoteKind, Builder>();
const loopCache = new Map<EmoteKind, HTMLCanvasElement[]>();

export function registerEmote(kind: EmoteKind, b: Builder, loop?: Builder): void {
  builders.set(kind, b);
  cache.delete(kind);
  if (loop) {
    loopBuilders.set(kind, loop);
    loopCache.delete(kind);
  }
}

/** Frames of the emote balloon (anchor: bottom-center of the canvas). */
export function emoteFrames(kind: EmoteKind): HTMLCanvasElement[] {
  let f = cache.get(kind);
  if (!f) {
    const b = builders.get(kind);
    f = b ? b() : [basic()];
    cache.set(kind, f);
  }
  return f;
}

/**
 * Optional looping continuation (same canvas size as the last pop frame) for
 * emotes that stay up a while (zzz, note, sweat...). Play at EMOTE_FRAME_MS * 3.
 * Falls back to the held last frame.
 */
export function emoteLoopFrames(kind: EmoteKind): HTMLCanvasElement[] {
  let f = loopCache.get(kind);
  if (!f) {
    const b = loopBuilders.get(kind);
    f = b ? b() : [emoteFrames(kind)[emoteFrames(kind).length - 1]];
    loopCache.set(kind, f);
  }
  return f;
}

function basic(): HTMLCanvasElement {
  const p = new PixelCanvas(13, 14);
  p.ellipse(6.5, 6, 6, 5.5, '#fbf3dc');
  p.poly([[4, 10], [8, 10], [5, 13]], '#fbf3dc');
  p.outline('#2a2440');
  return p.toCanvas();
}
