import { chromium } from '/home/user/-/game/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const P = process.argv[2];
const caps = {
  t1: { y: 840, lines: [['m', 80, '8月31日　夕方5時――', 'white']] },
  t2: { y: 840, lines: [['m', 120, '町の時間が、止まった。', 'gold']] },
  t3: { y: 800, lines: [['m', 64, 'なかまは、', 'white'], ['m', 112, '関西弁の オオグソクムシ。', 'gold']] },
  s1: { y: 800, slam: 'たたかう！' },
  s2: { y: 800, slam: 'ノる！' },
  s3: { y: 800, slam: '釣る！' },
  s4: { y: 800, slam: 'ツッコむ！' },
  t4: { y: 800, lines: [['m', 76, '第2章', 'white'], ['m', 112, '夜明けの来ない村へ――', 'gold']] },
  t5: { y: 840, lines: [['m', 120, '朝を、迎えに行け。', 'gold']] },
  t6: { y: 540, lines: [['m', 132, 'だれも倒されない、戦記。', 'gold']] },
  b2: { y: 800, lines: [['m', 64, '迷子センターで、', 'white'], ['m', 112, 'だれかが 待っている。', 'gold']] },
  h1: { y: 860, lines: [['m', 112, '寄り道も、どっさり。', 'gold']] },
  L1: { win: 'ザリガニ釣り' }, L2: { win: '屋上ゆうやけひろば' }, L3: { win: '小学校の 水やり当番' }, L4: { win: '円筒分水の ふたり' },
  L5: { win: '喫茶 初日の出' }, L6: { win: 'トマトの 脇芽かき' }, L7: { win: '天文台で 星さがし' }, L8: { win: '牛舎の おてつだい' },
  k1: { y: 450, nob: 1, lines: [['m', 84, 'これは、ボクが', 'white']] },
  k2: { y: 600, nob: 1, lines: [['m', 128, '平和の象徴になるまでの物語', 'gold']] },
  kk: { y: 960, lines: [['m', 120, '近日公開', 'gold']] },
  t7: { y: 985, lines: [['g', 66, '第1章・第2章　あそべます', 'white']] },
};
const css = `
@font-face{font-family:M;src:url(data:font/woff2;base64,${fs.readFileSync(P + '/font/min.woff2').toString('base64')})}
@font-face{font-family:G;src:url(data:font/woff2;base64,${fs.readFileSync(P + '/font/goth.woff2').toString('base64')})}
html,body{margin:0;width:1920px;height:1080px;background:transparent;overflow:hidden}
.box{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;transform:translateY(-50%)}
.l{white-space:nowrap;line-height:1.15;letter-spacing:0.04em}
.m{font-family:M}.g{font-family:G}
.white{color:#fff;-webkit-text-stroke:10px #1b0d22;paint-order:stroke fill;filter:drop-shadow(0 4px 10px rgba(0,0,0,.7))}
.gold{background:linear-gradient(180deg,#fffbe6 0%,#ffe08a 38%,#f0a92e 62%,#a85a12 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 2px #2a1206) drop-shadow(0 0 2px #2a1206) drop-shadow(0 0 3px #2a1206) drop-shadow(0 0 18px rgba(255,190,80,.75)) drop-shadow(0 6px 10px rgba(0,0,0,.6))}
.band{position:absolute;left:0;right:0;transform:translateY(-50%);background:linear-gradient(180deg,rgba(12,5,22,0) 0%,rgba(12,5,22,.62) 28%,rgba(12,5,22,.62) 72%,rgba(12,5,22,0) 100%)}
.gw{position:relative;display:inline-block}
.gw .sh{position:absolute;left:0;top:0;color:#2a1206;-webkit-text-stroke:16px #2a1206;paint-order:stroke fill}
.gw .gold{position:relative}
.win{position:absolute;top:70px;left:50%;transform:translateX(-50%);font-family:G;font-size:62px;color:#fff;background:rgba(0,0,0,.86);border:7px solid #fff;border-radius:16px;padding:14px 46px 18px;white-space:nowrap;letter-spacing:.06em;box-shadow:0 0 0 5px rgba(0,0,0,.85),0 10px 30px rgba(0,0,0,.6)}
.slam{font-family:G;font-size:210px;color:#fff;-webkit-text-stroke:22px #b8241a;paint-order:stroke fill;transform:rotate(-4deg);letter-spacing:0.02em;
  filter:drop-shadow(0 0 0 #fff) drop-shadow(0 10px 0 #4a0d08) drop-shadow(0 0 30px rgba(255,120,40,.8))}
`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [id, c] of Object.entries(caps)) {
  const inner = c.win ? '' : c.slam ? `<div class="slam l">${c.slam}</div>` : c.lines.map(([f, s, t, k]) => k === 'gold' ? `<div class="gw l ${f}" style="font-size:${s}px"><span class="sh">${t}</span><span class="gold">${t}</span></div>` : `<div class="l ${f} ${k}" style="font-size:${s}px">${t}</div>`).join('');
  const bandH = c.slam || c.win || c.nob ? 0 : c.lines.reduce((a, l) => a + l[1] * 1.15, 0) + 150;
  await page.setContent(`<style>${css}</style>${bandH ? `<div class="band" style="top:${c.y}px;height:${bandH}px"></div>` : ''}${c.win ? `<div class="win">${c.win}</div>` : `<div class="box" style="top:${c.y}px">${inner}</div>`}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${P}/cap/${id}.png`, omitBackground: true });
}
await browser.close();
console.log('ok');
