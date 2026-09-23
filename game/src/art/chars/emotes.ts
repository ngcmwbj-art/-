// Emote balloons shown above field characters. Contract used by the world
// script API; the character art team owns the art. Each emote is a short
// animation (frames played once, last frame held).

import { PixelCanvas } from '../../engine/pixel';

export type EmoteKind = 'exclaim' | 'question' | 'dots' | 'note' | 'sweat' | 'anger' | 'heart' | 'zzz' | 'light';

export const EMOTE_KINDS: EmoteKind[] = ['exclaim', 'question', 'dots', 'note', 'sweat', 'anger', 'heart', 'zzz', 'light'];

type Builder = () => HTMLCanvasElement[];
const builders = new Map<EmoteKind, Builder>();
const cache = new Map<EmoteKind, HTMLCanvasElement[]>();

export function registerEmote(kind: EmoteKind, b: Builder): void {
  builders.set(kind, b);
  cache.delete(kind);
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

function basic(): HTMLCanvasElement {
  const p = new PixelCanvas(13, 14);
  p.ellipse(6.5, 6, 6, 5.5, '#fbf3dc');
  p.poly([[4, 10], [8, 10], [5, 13]], '#fbf3dc');
  p.outline('#2a2440');
  return p.toCanvas();
}
