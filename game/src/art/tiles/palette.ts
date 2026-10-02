// Master palette (30_level_art.md 7.1). Backgrounds, props and field UI are
// drawn only with these colors; grading (multiply / screen overlays) adds the
// time-of-day tint at render time.

export const P = {
  // light / sunset
  glint: '#FFF6D8',
  horizon: '#FFE7A3',
  sky: '#F7C27A',
  sun: '#F2894B',
  sunDeep: '#E8603C',
  peach: '#D9728A',
  crimson: '#E0567A',
  sunShade: '#B04A7A',
  // shadow / night
  lilac: '#7A5AA0',
  shade: '#5B4A7A',
  shadeDeep: '#4A3A6E',
  nightShade: '#3A2B5C',
  ink: '#2A2440',
  night: '#1B1733',
  void: '#0B0B14',
  // neutrals
  white: '#F4F1E8',
  concreteLt: '#E8E4D8',
  concrete: '#C8C2B4',
  steel: '#9AA0A8',
  asphalt: '#6B7186',
  charcoal: '#3A3F48',
  // greens
  leafLt: '#C9E08A',
  leafYoung: '#9BCB6B',
  leaf: '#5FA85A',
  leafDeep: '#3FA66B',
  leafShade: '#2E6B4A',
  // vermilion / red
  vermLt: '#FF6A4D',
  red: '#E84E3C',
  verm: '#E23B2E',
  vermShade: '#B8241E',
  maroon: '#8A2E3A',
  // gold / yellow / wood
  gold: '#FFD23F',
  goldPale: '#F6D98A',
  brass: '#D9A441',
  brassOld: '#A8742A',
  woodLt: '#C8A06A',
  wood: '#8A5A3A',
  woodDark: '#5A3A2A',
  // blue / water
  glow: '#5CE1FF',
  aqua: '#7FD1E8',
  blue: '#4AA8E0',
  navy: '#2F4A8A',
  // skin
  skin1: '#FFD9B8',
  skin2: '#F2B894',
  skin3: '#E0A882',
  skin4: '#C98A6A',
  // paper
  paper: '#FBF3DC',
  paperGrid: '#E8D9B5',
} as const;

export type PaletteKey = keyof typeof P;

/** Outer outline color for props (7.5). */
export const OUTLINE = P.ink;
/** Rim light on the sun-facing (left) edge. */
export const RIM = P.sun;
