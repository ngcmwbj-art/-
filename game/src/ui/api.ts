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
//
// Chapter 2 (02_ch2_index 6.1–6.2, 50_ch2_story 1.4 / 10章, 52_ch2_level_art 12–13):
//   yield* startChapter2('continue' | 'title') the start state, chapter2Adjust(), the start
//                                              snapshot, then evt_ch2_prologue on black
//   chapter2LevelUps()                         what chapter2Adjust() raised (the 通知表)
//   yield* playChapterDoor()                   章の扉: the 「第2章」 seal and the title by hand
//   showCallBubble('……ナナミちゃん。')         the loudspeaker's bubble (the caller plays the voice)
//   yield* playCallBubble(text)                the bubble with its own 'broadcast' blips
//   setClockText('19:31')                      the plate's time (null: the map's own)
//   yield* fieldCurtain(1, 600) / setFieldCurtain(0)  the field goes dark under the HUD
//   const cut = yield* openSunriseCut()        cut_h_sunrise: cut.rise(), cut.close()
//   yield* playEndingNotebookCh2()             カット6 → markClearCh2() → the title
//   markClearCh2() / clearRecordCh2()          the chapter 2 clear data and record
//   yield* openShop('shop_hoshi_mujin')        the 無人販売所 (per-visit limits, the coin box)
//   yield* saveConfirm('narr', { text, options })  the save card with another question
//   cut_h_village_lit is registered with the battle (registerBattleCut)

export { say, choose, ask, caption, dialogVisible, type SayOpts, type ChooseOpts } from './dialog';
export { openShop, registerShop, type ShopDef } from './shop';
export { saveMenu, saveWithStamp, saveConfirm } from './save';
export { openMenu, runMenu, runSettings, menuOpen } from './menu';
export {
  setMenuEnabled,
  showClock,
  showPlaceName,
  notifyItem,
  skipItemCard,
  drawClockPlate,
  CLOCK_TIMES,
  CLOCK_TIMES_H,
  showCallBubble,
  playCallBubble,
  clearCallBubble,
  setClockText,
  fieldCurtain,
  setFieldCurtain,
} from './hud';
export {
  registerNewGameHook,
  startNewGame,
  continueGame,
  toTitle,
  markClear,
  clearRecord,
  startChapter2,
  chapter2LevelUps,
  markClearCh2,
  clearRecordCh2,
  saveKind,
  chapter1Cleared,
  msgPages,
} from './flow';
export { playChapterDoor } from './chapter_door';
export { openSunriseCut, playSunriseCut, type SunriseCut } from './cut_sunrise';
export { drawVillageLit, prepareVillageLit } from './cut_village_lit';
export { runGameOver } from './gameover';
export { playNightSkyCut, hideNightSky, playEndingNotebook, playEndingNotebookCh2 } from './ending';
export { showGuide } from './guide';
export { showBubble, bubble, drawBubble } from './bubble';
export { ditherOut, ditherIn } from './transition';
export { settings, textSpeedMul } from './settings';
export { UI, drawWindow } from './window';
