// Window frame rendering shared by dialog, menus and battle UI.
// The UI pass owns the final look; keep the signature stable.

import type { Gfx } from '../engine/gfx';

export interface WindowStyle {
  bg: string;
  bg2: string;
  border: string;
  borderDark: string;
  shadow: string;
  text: string;
  textDim: string;
  accent: string;
}

export const UI = {
  bg: '#1c1a33',
  bg2: '#24214a',
  border: '#f4ecd8',
  borderDark: '#8c83b8',
  shadow: '#07060d',
  text: '#f4ecd8',
  textDim: '#8c83b8',
  accent: '#ffd35a',
} satisfies WindowStyle;

/** Draw a framed window. (x, y, w, h) is the outer rectangle. */
export function drawWindow(g: Gfx, x: number, y: number, w: number, h: number, s: WindowStyle = UI, alpha = 1): void {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  if (w < 6 || h < 6) return;
  g.alpha(alpha, () => {
    // drop shadow
    g.rect(x + 2, y + 2, w, h, s.shadow, 0.6);
    // body with rounded 1px corners
    g.rect(x + 1, y, w - 2, h, s.border);
    g.rect(x, y + 1, w, h - 2, s.border);
    g.rect(x + 2, y + 2, w - 4, h - 4, s.borderDark);
    g.rect(x + 3, y + 3, w - 6, h - 6, s.bg);
    // subtle top band
    g.rect(x + 3, y + 3, w - 6, Math.min(6, h - 6), s.bg2);
  });
}
