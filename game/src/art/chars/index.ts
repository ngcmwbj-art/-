// Character sprite contract (field sprites for the party, NPCs, animals and
// field enemies). The character art team owns the implementation; the
// world team only calls charSprite()/portrait().
//
// Frame conventions:
//  - Field sprites are w×h (usually 16×24). The anchor is the bottom-center
//    of the canvas (feet). Draw at (x - w/2, y - h).
//  - walk[dir] is a looping walk cycle; walk[dir][0] is the standing pose.
//  - idle[dir] (optional) is a slow idle loop (breathing / blinking).
//  - Left-facing frames are provided explicitly (no runtime flipping needed).
//  - extra: named one-off poses ('surprised', 'sit', 'sleep', 'hurt', ...).
//
// The registry and helpers live in registry.ts; this module re-exports them
// and imports every content module so a single import of 'art/chars'
// registers all characters, portraits, emotes and the QA gallery (?scene=chars).

export * from './registry';
export { flipBoard, flipBoardPanel, flipIcon } from './flip';
export { emoteFrames, emoteLoopFrames, EMOTE_KINDS, EMOTE_FRAME_MS, type EmoteKind } from './emotes';
import './content';
