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
//  - Portraits are 32×32; portrait(id, mood, { size: 64 }) gives a 64×64
//    close-up (drawn at 64 for minato:tsukkomi, a clean 2× of the 32 face
//    otherwise; hasLargePortrait(id, mood) tells which).
//  - npc_shadow_man has an extra 'notice' (eyes open wide) for when the
//    player comes close.
//  - Emotes: emoteFrames(kind) pops in, emoteLoopFrames(kind) keeps it alive.
//    Kinds: exclaim question dots note sweat anger heart zzz light shy.
//  - Palette (30_level_art 7.1): every sprite is snapped, when first built,
//    to the 48-colour master palette plus at most 8 colours of its own
//    (quant.ts); paletteReport(id) lists a sprite's own colours.
//  - Rim light (7.3): the 1px sunset rim in the outline column follows the
//    stage — #F2894B (stages 0–1), #E0567A (stage 2), #F4E6A8 (mall maps),
//    none at night (plain outline). It tracks flag_stage / state.map by
//    itself; setRimLight(color | null) overrides it (e.g. a street-lamp
//    #FFE7A3 at night), autoRimLight() hands control back. Every built
//    sprite is repainted in place, so held CharSprite objects update.
//  - Enemy 'enemy_ojigi_jihanki' rests in a 30° bow; 'upright' / look_up
//    straighten it, anim 'bow' goes 30° → 90° → 30°.
//  - 'enemy_semi_final' is 24×14 (belly up, legs in the air; walk = hop,
//    anims 'twitch' / 'hop', held pose 'dead'); 'restored_enemy_semi_final'
//    is a 12×12 cicada seen from behind on a trunk (anim 'fly').
//  - 'enemy_momisugi' (24×32) faces the viewer from the front-left, shows
//    the recliner profile from the side and its vented back from behind;
//    anim 'beckon' exists for every facing.
//  - Passers-by (people/walkers.ts, the world's 'passerby' routes):
//    npc_walker_shufu / npc_walker_salaryman (18×24), npc_walker_kid (18×24,
//    the walk cycle is a run; his balloon rises into the headroom, frames
//    28 tall), npc_walker_bike (24×28; walk = pedalling, idle = stopped with
//    a foot down). Idle loops are their pause at a route end (receipt,
//    watch, wiping sweat, tugging the balloon); every walk frame doubles as
//    the stage-1 frozen stride, and the silhouettes carry the stage-2
//    shadow-only walkers.
//
// The registry and helpers live in registry.ts; this module re-exports them
// and imports every content module so a single import of 'art/chars'
// registers all characters, portraits, emotes and the QA gallery (?scene=chars).

export * from './registry';
export { flipBoard, flipBoardEdge, flipBoardMini, flipBoardPanel, flipBoardText, flipIcon } from './flip';
export { FLIP_ANCHOR } from './people/kanenari';
export { glowRing, GLOW_RING_FRAMES, GLOW_CENTER_DY } from './glow';
export { setRimLight, autoRimLight, rimForStage, currentRim, paletteReport } from './quant';
export { headroomReport, PAD as HEADROOM } from './rig';
export { emoteFrames, emoteLoopFrames, EMOTE_KINDS, EMOTE_FRAME_MS, type EmoteKind } from './emotes';
import './content';
import './gallery_reg';
