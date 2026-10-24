// Emote balloons shown above field characters. Contract used by the world
// script API; the character art team owns the art. Each emote is a short
// animation (frames played once, last frame held).
//
// The registry lives in emote_registry.ts (so the art module can register
// without an import cycle); the art itself is in emote_art.ts.

export * from './emote_registry';
import './emote_art';
