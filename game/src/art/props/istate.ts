// Tiny shared state between the level logic (data/maps/lv_logic.ts) and the
// interior / mall art: when the current map was entered (field time, ms), so
// one-shot animations can start from the entry (the 1.3 s tube in 迷子センター,
// dryer No.5's single turn in stage 2) and stay in sync with the ambience.
export const lvTime = {
  map: '',
  /** Field time (ms) when `map` was entered. */
  enterT: 0,
  /** 迷子センター: the heap of lost things shudders until this field time (evt_boss_intro). */
  pileShakeUntil: 0,
  /** 迷子センター: the heap is hidden (it has risen as the boss). */
  pileHidden: false,
  /**
   * 2F rest bench (evt_save_bench staging): the party sitting on it. Each
   * sitter is a field sprite id and its x on the bench (px from the bench
   * tile's left edge); `t0` = field time they sat down (a 2px settle).
   */
  bench: null as { t0: number; sitters: { sprite: string; x: number }[] } | null,
  /** M1: field time the café's half-lowered shutter started to slide down a notch (0 = not yet). */
  cafeShutterT0: 0,
  /** M4: field time the toy shop's shutter was lifted a little to peek under it (0 = not). */
  toyPeekT0: 0,
};
