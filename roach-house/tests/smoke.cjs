// 起動して数十秒うごかし、エラーが出ないか・画面が描けるかを確かめる
const { chromium } = require('playwright');
(async () => {
const URL = process.env.URL || 'http://localhost:8765/index.html?q=low';
const out = process.argv[2] || '.';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
await page.goto(URL);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/s-title.png` });
await page.click('[data-diff="normal"]');
await page.waitForTimeout(800);
await page.keyboard.down('KeyD');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyD');
await page.screenshot({ path: `${out}/s-play.png` });
const st = await page.evaluate(() => { const g = window.__rh.game; return { p: [g.player.x, g.player.z], f: [g.farmer.x, g.farmer.z, g.farmer.state, g.farmer.phase], fps: window.__rh.fps }; });
console.log(JSON.stringify(st));
console.log('ERRORS', errors.length, errors.slice(0, 5).join('\n'));
await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
