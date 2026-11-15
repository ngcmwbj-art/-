// icons/icon.svg と icons/favicon.svg から、アプリのアイコン画像（PNG）を書き出す。
//   node tools/make-icons.mjs
// Playwright（Chromium）で SVG を描かせて撮ります。もう一度流せば同じものができます。
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (_) { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
const icon = readFileSync(join(dir, 'icon.svg'), 'utf8');
const favicon = readFileSync(join(dir, 'favicon.svg'), 'utf8');

// maskable 用：背景は端まで、絵（音符）だけを中央の 62% に収める
const maskable = icon.replace('<g id="mark"', '<g transform="translate(256 256) scale(.62) translate(-256 -246)"><g id="mark"').replace('</g>\n</svg>', '</g></g>\n</svg>');

const jobs = [
  { file: 'apple-touch-icon.png', size: 180, svg: icon },
  { file: 'icon-192.png', size: 192, svg: icon },
  { file: 'icon-512.png', size: 512, svg: icon },
  { file: 'icon-maskable-512.png', size: 512, svg: maskable },
  { file: 'favicon-32.png', size: 32, svg: favicon, transparent: true },
];

const browser = await chromium.launch();
for (const job of jobs) {
  const page = await browser.newPage({ viewport: { width: job.size, height: job.size }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${job.size}px;height:${job.size}px}</style>${job.svg}`);
  await page.screenshot({ path: join(dir, job.file), omitBackground: !!job.transparent, clip: { x: 0, y: 0, width: job.size, height: job.size } });
  await page.close();
  console.log(`icons/${job.file}（${job.size}×${job.size}）`);
}
await browser.close();
