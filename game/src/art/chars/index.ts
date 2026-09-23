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
//    Every NPC / animal / symbol has 'look_up' (17:00), in all four facings
//    (extraDir; pick with poseFrame(s, name, dir)).
//  - anims: named animations; animsDir holds direction-specific versions.
//    Held poses that an NPC stays in ('sit', 'crouch', 'sketch', 'chop',
//    'peck', 'sleep', 'dead', 'hop', 'beckon') are looping anims with their
//    breathing / blinking / fidget, so `actor.pose = name` stays alive and
//    keeps facing the player. Use animFrame(s, name, t, dir) / animOf().
//  - Kanenari's 'flip' extra has the 24×16 board composited in (24×39 frame);
//    anims 'flip' (raise) and 'flip_turn' (turn the board over). The raw
//    arms-up pose is 'flip_raw' + FLIP_ANCHOR for callers with their own board.
//  - Flip boards for UI / battle: flipBoard(variant), flipBoardText(text),
//    flipBoardPanel(w, h), flipBoardMini() (16×12), flipIcon() (10×8),
//    flipBoardEdge() (mid-turn).
//  - Kanenari's frames are 20px wide (arms of 'wave' / 'pose' reach past the
//    bell); like every frame they are centred on the feet. His 'glow' anim
//    has the pulsing #FFE7A3 ring composited in (32×34 frames); glowRing(i)
//    (32×32, 8 frames: two pulses r8→14) is the same ring as an overlay for
//    battle / UI, centred at (feetX, feetY + GLOW_CENTER_DY).
//  - Frame widths can differ from CharSprite.w (Kanenari's glow / flip,
//    the ojigi machine's cord): always centre on the feet.
//  - Emotes: emoteFrames(kind) pops in, emoteLoopFrames(kind) keeps it alive.
//    Kinds: exclaim question dots note sweat anger heart zzz light shy.
//
// The registry and helpers live in registry.ts; this module re-exports them
// and imports every content module so a single import of 'art/chars'
// registers all characters, portraits, emotes and the QA gallery (?scene=chars).

export * from './registry';
export { flipBoard, flipBoardEdge, flipBoardMini, flipBoardPanel, flipBoardText, flipIcon } from './flip';
export { FLIP_ANCHOR } from './people/kanenari';
export { glowRing, GLOW_RING_FRAMES, GLOW_CENTER_DY } from './glow';
export { emoteFrames, emoteLoopFrames, EMOTE_KINDS, EMOTE_FRAME_MS, type EmoteKind } from './emotes';
import './content';
import './gallery_reg';
