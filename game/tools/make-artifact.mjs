#!/usr/bin/env node
// Packs the production build (dist/) into one self-contained HTML page for
// publishing as a claude.ai Artifact: the JS bundle is inlined as a module
// script and the pixel font is embedded as a data: URI. The Artifact host adds
// its own <!doctype>/<html>/<head>/<body> skeleton, so the output starts with
// <title> and <style>.
//
//   npm run build && node tools/make-artifact.mjs   → dist-artifact/hanamaru-sunset.html

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
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

const page = `<title>シュンの夕暮れあぜ道戦記</title>
<style>
  html, body { background: #0b0a12; height: 100%; margin: 0; overflow: hidden; }
  body { display: flex; align-items: center; justify-content: center; touch-action: none; }
  #screen { display: block; outline: none; image-rendering: pixelated; image-rendering: crisp-edges; }
  #boot { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
    color: #6f6a8a; font: 12px/1.4 monospace; letter-spacing: .2em; }
</style>
<canvas id="screen" tabindex="0" aria-label="シュンの夕暮れあぜ道戦記 ゲーム画面"></canvas>
<div id="boot">LOADING</div>
<script type="module">
${js}
</script>
`;

const outDir = path.join(root, 'dist-artifact');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'hanamaru-sunset.html');
fs.writeFileSync(out, page);
console.log(`artifact page → ${path.relative(root, out)} (${Math.round(page.length / 1024)} KB)`);
