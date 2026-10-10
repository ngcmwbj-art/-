#!/usr/bin/env node
// Packs the production build (dist/) into one self-contained HTML page for
// publishing as a claude.ai Artifact: the JS bundle is inlined as a module
// script and the pixel font is embedded as a data: URI. The Artifact host adds
// its own <!doctype>/<html>/<head>/<body> skeleton, so the output starts with
// <title> and <style>.
//
//   npm run build && node tools/make-artifact.mjs   → dist-artifact/hanamaru-sunset.html
//   VITE_CH2_OPEN=1 npm run build && node tools/make-artifact.mjs --ch2
//                                                   → dist-artifact/shun-ch2.html (the chapter-2 page:
//                                                     「第2章から」 on the title from the start)
//   VITE_HD2D_DEMO=1 npm run build && node tools/make-artifact.mjs --hd2d
//                                                   → dist-artifact/shun-hd2d.html (the HD-2D prototype:
//                                                     HD-2D on, 「はじめる」 opens in 夕鳴銀座; src/hd2d)
//   --dist <dir> --out <dir>                        another build folder / output folder (a trial build
//                                                     beside the shared dist/, e.g. vite build --outDir)
//
// Every page carries the HD-2D layer (src/hd2d with three.js, 02 #85 2026-10-06: chapter 1 in
// HD-2D from the start, せってい「表示」 to go back to 2D); main.ts runs it only once the title is up.

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argOf = (name, def) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : def;
};
const dist = argOf('--dist', path.join(root, 'dist'));
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const src = /<script type="module"[^>]*src="\.\/([^"]+)"/.exec(html)?.[1];
if (!src) throw new Error('bundle script not found in dist/index.html');
let js = fs.readFileSync(path.join(dist, src), 'utf8');

const font = fs.readFileSync(path.join(dist, 'fonts', 'game.woff2')).toString('base64');
const fontRef = '`./fonts/game.woff2`';
if (!js.includes(fontRef)) throw new Error('font URL not found in bundle');
js = js.replace(fontRef, '`data:font/woff2;base64,' + font + '`');
// A literal "</script" inside the bundle would end the inline script early.
js = js.replace(/<\/script/gi, '<\\/script');

const ch2 = process.argv.includes('--ch2');
const hd2d = process.argv.includes('--hd2d');
if (!js.includes('WebGLRenderer')) throw new Error('the bundle has no three.js: the HD-2D layer (src/hd2d) is missing');
const title = hd2d ? 'しゅんの夕暮れあぜ道戦記 HD-2D 試作' : ch2 ? 'しゅんの夕暮れあぜ道戦記 第2章' : 'しゅんの夕暮れあぜ道戦記';
const page = `<title>${title}</title>
<style>
  html, body { background: #0b0a12; height: 100%; margin: 0; overflow: hidden; }
  body { display: flex; align-items: center; justify-content: center; touch-action: none; }
  #screen { display: block; outline: none; image-rendering: pixelated; image-rendering: crisp-edges; }
  #boot { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
    color: #6f6a8a; font: 12px/1.4 monospace; letter-spacing: .2em; }
</style>
<canvas id="screen" tabindex="0" aria-label="しゅんの夕暮れあぜ道戦記 ゲーム画面"></canvas>
<div id="boot">LOADING</div>
<script type="module">
${js}
</script>
`;

const outDir = argOf('--out', path.join(root, 'dist-artifact'));
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, hd2d ? 'shun-hd2d.html' : ch2 ? 'shun-ch2.html' : 'hanamaru-sunset.html');
fs.writeFileSync(out, page);
console.log(`artifact page → ${path.relative(root, out)} (${Math.round(page.length / 1024)} KB)`);
