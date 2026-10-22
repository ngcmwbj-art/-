// The page's 「よみこみ中…」 while the game loads (2026-10-22 改善会議 3: the old English
// 「LOADING」 gone): a small しゅん drawn here in pixels (an inline SVG of rects — no image file),
// a sunset-coloured band with a light running along it (no %: the bundle arrives in one piece,
// nothing to count), and the word. Before the game's own font is loaded: the system's.
//
// tools/make-artifact.mjs puts it in the published page; index.html (the dev server's and the
// build's page) carries the same markup, pasted from `node tools/boot-splash.mjs`.
// src/main.ts removes #boot when the title is ready.

/** しゅん, front view, 12 × 16 (minato.ts's colours: the hair's ahoge, the bug net's hoop top-left). */
const SHUN = [
  '.OOO...H....',
  'O...OHHHH...',
  'O..HHHHHHHH.',
  '.OOHHHHHHHH.',
  '..OHHSSSSHH.',
  '...HSESSESH.',
  '....SSSSSS..',
  '...gGGGGGGg.',
  '..gGGPPGGGGg',
  '..SGGPPGGGGS',
  '..SGGGGGLGGS',
  '...DGGGGKGD.',
  '....BBBBBB..',
  '....BB..BB..',
  '....SS..SS..',
  '...RRR..RRR.',
];
const COL = {
  O: '#C8A06A', H: '#2B1E1A', S: '#FFD9B8', E: '#2A2440', g: '#6CC48A', G: '#3FA66B', D: '#2E6B4A',
  P: '#F4F1E8', B: '#2F4A8A', R: '#E84E3C', L: '#4AA8E0', K: '#FFD23F',
};

function shunSvg() {
  let rects = '';
  SHUN.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (COL[c]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${COL[c]}"/>`;
    });
  });
  return `<svg class="shun" viewBox="0 0 12 16" width="36" height="48" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

export const bootCss = `#boot { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; color: #E8D9B5; font: 14px/1.4 sans-serif; letter-spacing: .15em; }
  #boot .shun { image-rendering: pixelated; animation: boot-hop .5s steps(2, jump-none) infinite alternate; }
  #boot .band { position: relative; width: 140px; height: 6px; overflow: hidden; border-radius: 3px;
    background: linear-gradient(90deg, #3a2a4a, #6b3a4a 50%, #3a2a4a); }
  #boot .band::after { content: ''; position: absolute; top: 0; bottom: 0; left: -60px; width: 60px; border-radius: 3px;
    background: linear-gradient(90deg, transparent, #F7C27A 40%, #E84E3C 75%, transparent); animation: boot-run 1.4s ease-in-out infinite; }
  @keyframes boot-hop { from { transform: translateY(0); } to { transform: translateY(-3px); } }
  @keyframes boot-run { from { transform: translateX(0); } to { transform: translateX(200px); } }
  @media (prefers-reduced-motion: reduce) { #boot .shun, #boot .band::after { animation: none; } #boot .band::after { left: 40px; } }`;

export const bootHtml = `<div id="boot" role="status">${shunSvg()}<div class="band"></div><div>よみこみ中…</div></div>`;

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  console.log(`  ${bootCss}\n\n${bootHtml}`);
}
