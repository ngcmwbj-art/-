// せってい (10_narrative 12.4, 40_audio 11.6, 20_systems_battle 19.5):
// おんがく / こうかおん (0..10), 文字の はやさ (おそい・ふつう・はやい),
// ツッコミ判定 (ふつう・ひろい) and 表示 (HD-2D・2D, 02 #85: chapter 1 in
// 3D from the start, src/hd2d). Kept in localStorage apart from the save
// file, so they survive a new game; ツッコミ判定 is mirrored into
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
  /** 表示 HD-2D (chapter 1's places drawn in 3D; false: the 2D pictures) */
  hd2d: boolean;
}

const KEY = 'hanamaru-settings-v1';

export const settings: Settings = { bgm: getVolume('bgm'), se: getVolume('se'), speed: 1, wide: false, hd2d: true };

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
    if (typeof s.hd2d === 'boolean') settings.hd2d = s.hd2d;
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
export const VIEW_LABELS = ['HD-2D', '2D'];

/**
 * 表示 and the HD-2D layer (src/hd2d, loaded apart: main.ts): `webgl` turns
 * false when this device can't draw it (the page then notes that it stays
 * 2D); `listeners` hear each change of the setting (main.ts loads the layer
 * the first time HD-2D is chosen).
 */
export const view = { webgl: true, listeners: [] as ((hd2d: boolean) => void)[] };

/** Choose 表示 (saved at once, like every setting). */
export function setView(hd2d: boolean): void {
  settings.hd2d = hd2d;
  saveSettings();
  for (const fn of view.listeners) fn(hd2d);
}

load();
applySettings();
