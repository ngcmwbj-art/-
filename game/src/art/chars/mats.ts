// Shared materials built from the master palette (30_level_art 7.1): the
// four skin steps and the design's hair colour, so every person in town is
// lit from the same few tones instead of each inventing near-copies.

import { mat } from './fig';

/** Children and fair adults: #FFD9B8 face, #E0A882 shade, #C98A6A deepest (9.1). */
export const SKIN_LIGHT = mat('#FFD9B8', { shade: '#E0A882', light: '#FFD9B8', dark: '#C98A6A' });
/** Most adults: one step down (#F2B894), lit to #FFD9B8. */
export const SKIN_MID = mat('#F2B894', { shade: '#E0A882', light: '#FFD9B8', dark: '#C98A6A' });
/** Sun-tanned (丸山): #E0A882 face, #C98A6A shade. */
export const SKIN_TAN = mat('#E0A882', { shade: '#C98A6A', light: '#F2B894', dark: '#8A5A3A' });
/** Black hair (#2B1E1A, light #5A3A2A — 9.1 / 9.3); its shadow falls into the outline hue. */
export const HAIR_BLACK = mat('#2B1E1A', { shade: '#2A2440', light: '#5A3A2A', dark: '#1B1733' });
