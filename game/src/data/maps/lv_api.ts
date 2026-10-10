// Public API of the interiors / mall level module for other teams (events).
//
//   import { maigoPileShake, maigoPileHide } from '../data/maps/lv_api';
//   maigoPileShake(900);   // evt_boss_intro: the heap of lost things shudders (2px)
//   maigoPileHide(true);   // the heap has risen as オムカエマチ (hide the prop)
//
// Both only change what the M5 prop draws; the state resets on entering a map
// (hidden again automatically once flag_boss_beaten is set).

import { lvTime } from '../../art/props/istate';
import { field } from '../../world/field';

/** 迷子センター (evt_boss_intro): the heap of lost things shudders 2px for `ms`. */
export function maigoPileShake(ms = 900): void {
  lvTime.pileShakeUntil = (field()?.t ?? 0) + ms;
}

/** 迷子センター: hide the heap (it has risen as the boss) / show it again. */
export function maigoPileHide(hidden = true): void {
  lvTime.pileHidden = hidden;
}
