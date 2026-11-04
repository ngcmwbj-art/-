// 「さいばい槽の上で実を食べて卵を産むだけ」で勝てるかを確かめるボット（第5回会議の議題）
// 使いかた： RUNS='[["s1",1],["s3",1]]' URL=http://localhost:8765/index.html?q=low node tests/farm.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/index.html?q=low';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.__rh && window.__rh.game);
  const runs = process.env.RUNS ? JSON.parse(process.env.RUNS) : [['s1', 1], ['s3', 1], ['s5', 1]];
  for (const [diff, seed] of runs) {
    const r = await page.evaluate(({ diff, seed }) => {
      const RH = window.__rh, g = RH.game;
      g.start(diff, seed * 7919);
      g.setMode('search');
      const rows = RH.rows;
      const step = (gg, inp) => {
        const p = gg.player;
        inp.mx = 0; inp.mz = 0; inp.dash = false; inp.actionHeld = false;
        if (!p || !p.alive) return;
        if (p.st === 'stuck') { inp.press('action'); return; }
        if (gg.nutrition >= 100) inp.press('egg');
        if (gg.mode !== 'search') gg.setMode('search');
        const steer = (ex, ez) => { const n = Math.hypot(ex, ez) || 1, fx = Math.sin(gg.camYaw), fz = Math.cos(gg.camYaw); inp.mz = (ex * fx + ez * fz) / n; inp.mx = (-ex * fz + ez * fx) / n; };
        if (p.y < 1) {
          // いちばん近いさいばい槽の横へ行って登る
          const c = gg.context();
          if (c && c.text === '登る') { inp.press('action'); return; }
          let best = null, bd = 1e9;
          for (const row of rows) for (const s of [-1, 1]) { const x = Math.max(row.minX + 1, Math.min(row.maxX - 1, p.x)), z = row.z + s * (row.hw + 0.25); const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = { x, z }; } }
          steer(best.x - p.x, best.z - p.z);
          return;
        }
        // さいばい槽の上：近くの実を食べつづける（がっつきすぎない）
        if (gg.fruitInReach(p)) { inp.actionHeld = p.greed < 80; return; }
        let best = null, bd = 1e9;
        for (const f of RH.plantFruits) {
          if (!f.alive || (f.sprayed && f.sprayed > gg.clock)) continue;
          if (Math.abs(f.z - p.z) > 0.7) continue;
          const d = Math.abs(f.x - p.x);
          if (d < bd) { bd = d; best = f; }
        }
        if (best) steer(best.x - p.x, best.z - p.z);
      };
      const res = RH.sim(900, 1 / 30, (gg, inp) => step(gg, inp));
      const s = g.stats;
      return { diff, seed, res: g.result ? { win: g.result.win, reason: g.result.reason, time: Math.round(g.result.elapsed) } : null, ruined: g.ruined, shipped: g.shipped, maxNymphs: s.maxNymphs, byNymph: s.byNymph, byPlayer: s.byPlayer, fruits: s.fruits, deaths: s.deaths, issues: res };
    }, { diff, seed });
    console.log(JSON.stringify(r));
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
