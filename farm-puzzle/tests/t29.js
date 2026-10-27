const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errors=[];
for (const vp of [{ width: 375, height: 667, tag: 'se' }, { width: 1280, height: 800, tag: 'pc' }]) {
const m = await b.newPage({viewport:vp}); m.on('pageerror', e => errors.push(e.message));
await m.goto('http://localhost:8765/');
// 夏：トマト・オクラ（チャレンジ・種あり）を収穫ずみ。ほかのチャレンジは種なし
await m.evaluate(k => localStorage.setItem(k, JSON.stringify({version:2,tutorialDone:true,tipHiddenDay:'x',onboardStep:2,seasonIndex:1,harvested:{tomato:1,okra:1,cabbage:1,lettuce:1},unlocked:['okra']})), 'hatake-puzzle-save');
await m.reload(); await m.waitForTimeout(300); await m.click('.tab[data-screen="zukan"]'); await m.waitForTimeout(100);
console.log(vp.tag, 'now:', await m.textContent('.zukan-count-now'), '| all:', await m.textContent('.zukan-count-all'));
await m.locator('.zukan-head').screenshot({ path: `${process.env.SP}/s29-${vp.tag}-head.png` });
await m.close(); }
console.log('errors', errors); await b.close(); })();
