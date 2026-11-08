// 出現アニメーションの確認：読み込み直後から一定間隔でコマを撮り、1枚の画像に並べる（review/motion.png）
// 時計を止めて進めるので、毎回同じコマになる。枠→映像→文字の順にずれて出てくるかを目で見る
import path from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { PORTAL, DIST, serveStatic, loadPlaywright, log } from './lib.mjs';

const OUT = path.join(PORTAL, 'review');
const tmp = path.join(OUT, '_motion');
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
const { chromium } = loadPlaywright();
const { url, close } = await serveStatic(DIST);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
await page.clock.install();
await page.clock.pauseAt(Date.now() + 1000);
await page.route(/\.(webm|mp4)$/, (r) => r.abort()); // 動画は止めて、動きだけを見る
await page.goto(url + '/index.html', { waitUntil: 'networkidle' });
// CSS / Web Animations も時計と同じだけ進める
const step = (ms) => page.evaluate((m) => { for (const a of document.getAnimations()) { if (!a.__s) { a.__s = 1; a.pause(); a.currentTime = 0; } else a.currentTime = (a.currentTime || 0) + m; } }, ms);
const times = [0, 80, 160, 240, 320, 400, 520, 640, 800, 1000, 1300, 1700];
let t = 0;
for (const [i, at] of times.entries()) {
  await page.clock.runFor(at - t); await step(at - t); t = at;
  await page.screenshot({ path: path.join(tmp, `${String(i).padStart(2, '0')}.png`), clip: { x: 0, y: 280, width: 1280, height: 580 } });
}
await browser.close(); await close();
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1', '-i', path.join(tmp, '%02d.png'),
  '-vf', `scale=640:-1,drawtext=text='%{eif\\:n\\:d}':x=8:y=8:fontsize=20:fontcolor=red,tile=3x4`, '-frames:v', '1', path.join(OUT, 'motion.png')]);
log(`✓ ${path.relative(process.cwd(), path.join(OUT, 'motion.png'))}（${times.map((x) => x + 'ms').join(' / ')}）`);
