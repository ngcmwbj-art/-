// HD-2D: chapter 3's ending (60 10.29, 62 8.9 5): its cuts run on the field — the breakwater, the
// lighthouse's plinth, the truck's bed, 夕鳴町's ginza at 17:00 and at 5:10, the house — so in HD-2D
// they are the 3D places already; each gets a lens here (through events/ending.ts's endingView.shot,
// as chapter 1's and 2's). The south-facing camera of 62 8.9 (the sea behind everyone) is left for
// later: the lenses stay on the field's north-looking axis, a little lower and nearer.

import type { ShotDef } from './cut';

export const C3_SHOTS: Record<string, ShotDef> = {
  // S29 the lunch on the breakwater: low along the goza, the griddle's steam in the middle
  e3_goza: { lens: { pitch: 30, fov: 26, dist: 23, lookN: 0, lift: 0.5 }, to: { pitch: 28, dist: 21.5 }, drift: 9000 },
  // S30 under the lighthouse: the three on the plinth, close and quiet
  e3_toudai: { lens: { pitch: 28, fov: 22, dist: 20, lookN: 0.4, lift: 0.7 }, to: { pitch: 27, dist: 18.5 }, drift: 12000 },
  // S31 everyone lined up for the photo: wide, a little low
  e3_photo: { lens: { pitch: 31, fov: 30, dist: 25, lookN: 0, lift: 0.4 } },
  // S32 the ginza's corner at 17:00 (the chime)
  e3_ginza_eve: { lens: { pitch: 34, fov: 26, dist: 24, lookN: 0.3, lift: 0.5 }, to: { pitch: 32, dist: 22.5 }, drift: 8000 },
  // S32 the house's entrance (chapter 1's cut 4 lens)
  e3_home: { lens: { pitch: 30, fov: 24, dist: 21, lift: 0.6 }, to: { dist: 20 }, drift: 6000 },
  // S33 たかしの 店 at 5:10: the truck, the shutter going up, グソっ君 in the cook's cap
  e3_ginza_asa: { lens: { pitch: 33, fov: 24, dist: 22, lookN: 0.3, lift: 0.6 }, to: { pitch: 31, dist: 20.5 }, drift: 9000 },
  // back to the field's camera
  e3_out: { lens: {} },
};
