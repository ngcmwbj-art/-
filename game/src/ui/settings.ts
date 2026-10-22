// せってい (10_narrative 12.4, 40_audio 11.6, 20_systems_battle 19.5):
// おんがく / こうかおん (0..10), 文字の はやさ (おそい・ふつう・はやい),
// ツッコミ判定 (ふつう・ひろい), しるし (あり・なし: world/marks.ts, 改善会議 2026-10-20) and 明るさ
// (ふつう・あかるい: the dark places lifted more, hd2d/view.ts darkLift — 改善会議 2026-10-22). (表示 HD-2D／2D is gone: the game is always
// HD-2D, src/hd2d — 2026-10-13 依頼主の決定; an old saved hd2d is not read.) Kept in
// localStorage apart from the save file, so they survive a new game; ツッコミ判定 is mirrored into
// flag_opt_tsukkomi_wide for the battle system.

import { flag, setFlag } from '../game/state';
import { getVolume, setVolume } from '../audio';
import { isTouchDevice } from '../engine/touch';

export type TextSpeed = 0 | 1 | 2;

export interface Settings {
  bgm: number;
  se: number;
  /** 0 おそい, 1 ふつう, 2 はやい */
  speed: TextSpeed;
  /** ツッコミ判定 ひろい */
  wide: boolean;
  /** しるし あり（調べられる物の きらり・ヒントの行き先の「！」、改善会議 2026-10-20。world/marks.ts） */
  marks: boolean;
  /** 明るさ あかるい（夜・建物の中など 暗い所を もっと 持ち上げる、改善会議 2026-10-22。hd2d/view.ts darkLift） */
  bright: boolean;
}

const KEY = 'hanamaru-settings-v1';

export const settings: Settings = { bgm: getVolume('bgm'), se: getVolume('se'), speed: 1, wide: false, marks: true, bright: false };

function load(): void {
  // On a touch screen the 「！」 is harder to hit in time: start with ひろい
  // there (a saved choice still wins).
  if (isTouchDevice()) settings.wide = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as Partial<Settings>;
    if (typeof s.bgm === 'number') settings.bgm = clamp(s.bgm);
    if (typeof s.se === 'number') settings.se = clamp(s.se);
    if (s.speed === 0 || s.speed === 1 || s.speed === 2) settings.speed = s.speed;
    if (typeof s.wide === 'boolean') settings.wide = s.wide;
    if (typeof s.marks === 'boolean') settings.marks = s.marks;
    if (typeof s.bright === 'boolean') settings.bright = s.bright;
  } catch {
    /* private mode etc. */
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(10, Math.round(v)));
}

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

/** Push the settings into the audio mixer and the battle flag. */
export function applySettings(): void {
  setVolume('bgm', settings.bgm);
  setVolume('se', settings.se);
  syncSettingFlags();
}

/** Mirror ツッコミ判定 into state.flags (call after a new game / load). */
export function syncSettingFlags(): void {
  const want = settings.wide ? 1 : 0;
  if (flag('flag_opt_tsukkomi_wide') !== want) setFlag('flag_opt_tsukkomi_wide', want);
}

/** Characters per second multiplier for dialog text (おそい / ふつう / はやい). */
export function textSpeedMul(): number {
  return [0.62, 1, 1.7][settings.speed];
}

export const SPEED_LABELS = ['おそい', 'ふつう', 'はやい'];
export const WIDE_LABELS = ['ふつう', 'ひろい'];
export const MARK_LABELS = ['あり', 'なし'];
export const BRIGHT_LABELS = ['ふつう', 'あかるい'];

load();
applySettings();
