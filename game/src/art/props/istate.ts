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
};
