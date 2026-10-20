// HD-2D: chapter 3's ending (60 10.29, 62 8.9 5): its cuts run on the field — the breakwater, the
// lighthouse's plinth, the truck's bed, 夕鳴町's ginza at 17:00 and at 5:10, the house — so in HD-2D
// they are the 3D places already; each gets a lens here (through events/ending.ts's endingView.shot,
// as chapter 1's and 2's). The south-facing camera of 62 8.9 (the sea behind everyone) is left for
// later: the lenses stay on the field's north-looking axis, a little lower and nearer.

import type { ShotDef } from './cut';

export const C3_SHOTS: Record<string, ShotDef> = {
  // S29 the lunch on the beach (2026-10-20, events/ch3/ending.ts BEACH): low and near over the griddle in
  // the middle, the half ring of people behind; drifting out a little as the scene goes round the beach
  e3_goza: { lens: { pitch: 30, fov: 24, dist: 17, lookN: 0, lift: 0.7 }, to: { pitch: 31, dist: 18.5 }, drift: 20000 },
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
  // S25 the last pick-up (events/ch3/shuuka.ts): the quay by the breakwater, low over the truck and the waiting people
  c3s_quay: { lens: { pitch: 27, fov: 24, dist: 17.5, lookN: 0, lift: 0.7 }, to: { pitch: 26, dist: 16.5 }, drift: 12000 },
  // the cape: along the coast road with the truck, a little high to see the sea past the guard rail
  c3s_misaki: { lens: { pitch: 31, fov: 24, dist: 20, lookN: 0, lift: 0.6 }, to: { pitch: 30, dist: 18.5 }, drift: 12000 },
  // …and closing in on everyone before the old aquarium
  c3s_misaki_close: { lens: { pitch: 27, fov: 22, dist: 17, lookN: 0, lift: 0.8 } },
  // S30 the memories (events/ch3/kioku.ts): the deep sea from above, slowly down; the tank face on, low;
  // the closing day a little wider; the park at night low under the clock tower
  k3_deep: { lens: { pitch: 46, fov: 24, dist: 17, lookN: 0, lift: 0.2 }, to: { pitch: 40, dist: 14.5 }, drift: 3000 },
  k3_tank: { lens: { pitch: 18, fov: 24, dist: 15, lookN: 0, lift: 1.6 }, to: { pitch: 16, dist: 13 }, drift: 3400 },
  k3_close: { lens: { pitch: 22, fov: 26, dist: 17, lookN: 0, lift: 1.4 }, to: { pitch: 20, dist: 15.5 }, drift: 3600 },
  k3_park: { lens: { pitch: 26, fov: 24, dist: 16, lookN: 0, lift: 0.4 }, to: { pitch: 24, dist: 14.5 }, drift: 3200 },
  // (the bed has its own camera, hd2d/nidai.ts)
  c3s_out: { lens: {} },
};
