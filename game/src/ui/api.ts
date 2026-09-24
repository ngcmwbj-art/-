// Public UI API for the scenario team (import from 'src/ui/api').
//
//   yield* say(text, { name, voice })          dialog (ui/dialog.ts)
//   const i = yield* choose(['a', 'b'])
//   const j = yield* ask('ソースは？', ['べつ', 'いっしょ'], { name: '母', voice: 'mother' })
//   yield* caption(['8月31日。', '夏休み、最後の日。'])   text on a black screen
//   yield* openShop('shop_hinoya')             ひのや (12.1)
//   yield* saveMenu('jizo' | 'bench')          お地蔵さん / 2F bench (5.22)
//   yield* saveWithStamp()                     save + the 「ほぞん」 seal
//   yield* runMenu()                           open the field menu and wait
//   setMenuEnabled(false)                      keep C/Tab/X from opening it
//   registerNewGameHook(fn)                    runs on 「はじめる」
//   yield* runGameOver({ boss })               evt_gameover for canLose battles
//   yield* playNightSkyCut()                   ending cut 6 (cut_night_sky)
//   yield* playEndingNotebook()                ending cut 7 → 「つづく」 → title
//   yield* toTitle()                           back to the title
//   showPlaceName('夕鳴公園') / notifyItem('item_ramune') / showClock()
//   skipItemCard('item_hanko_case')          the next pick-up of it makes no HUD note
//   showGuide('移動：十字キー\n調べる・話す：Z')
//   showBubble('npc_mamekichi', 'まいど！')    speech bubble over an actor
//   yield* ditherOut(600) / ditherIn(600)     pixel dissolve transitions

export { say, choose, ask, caption, dialogVisible, type SayOpts, type ChooseOpts } from './dialog';
export { openShop, registerShop, type ShopDef } from './shop';
export { saveMenu, saveWithStamp, saveConfirm } from './save';
export { openMenu, runMenu, runSettings, menuOpen } from './menu';
export { setMenuEnabled, showClock, showPlaceName, notifyItem, skipItemCard, drawClockPlate, CLOCK_TIMES } from './hud';
export { registerNewGameHook, startNewGame, continueGame, toTitle, markClear, clearRecord } from './flow';
export { runGameOver } from './gameover';
export { playNightSkyCut, hideNightSky, playEndingNotebook } from './ending';
export { showGuide } from './guide';
export { showBubble, bubble, drawBubble } from './bubble';
export { ditherOut, ditherIn } from './transition';
export { settings, textSpeedMul } from './settings';
export { UI, drawWindow } from './window';
