// 自動プレイ：ボットで最後まで遊び、異常（例外・NaN・場外）がないか、勝ち負けの釣り合いを見る
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/index.html?q=low';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__rh && window.__rh.game);
  const runs = process.env.RUNS ? JSON.parse(process.env.RUNS) : [['easy', 1], ['easy', 2], ['normal', 1], ['normal', 2], ['normal', 3], ['hard', 1], ['hard', 2]];
  const style = process.env.STYLE || 'smart';
  for (const [diff, seed] of runs) {
    const r = await page.evaluate(({ diff, seed, style }) => {
      const RH = window.__rh, g = RH.game;
      g.start(diff, seed * 7919);
      const log = [];
      const ok = g.kill.bind(g);
      g.kill = (r, cause) => { if (r.isPlayer) log.push([Math.round(g.elapsed), cause, g.farmer.state, r.st, r.y.toFixed(1), r.x.toFixed(1), r.z.toFixed(1), g.hideFactor(r)]); ok(r, cause); };
      const issues = new Set();
      let eatOn = true, t = 0;
      const bot = (g, inp, i) => {
        t = i / 30;
        const p = g.player;
        inp.mx = 0; inp.mz = 0; inp.dash = false; inp.actionHeld = false;
        if (!p || !p.alive) return;
        if (p.st === 'stuck') { if (i % 4 === 0) inp.press('action'); return; }
        if (style === 'smart') {
          if (i % (30 * 35) === 0) inp.press(['cmd1', 'cmd2', 'cmd1', 'cmd3'][(i / (30 * 35)) % 4]);
        }
        if (g.nutrition >= 100) inp.press('egg');
        if (style === 'smart' && g.canAttackNow() && (g.farmer.carry || g.farmer.state === 'CHASE')) inp.press('attack');
        const f = g.farmer;
        const steer = (ex, ez, dash = true) => {
          const n = Math.hypot(ex, ez) || 1, fx = Math.sin(g.camYaw), fz = Math.cos(g.camYaw);
          inp.mz = (ex * fx + ez * fz) / n; inp.mx = (-ex * fz + ez * fx) / n; inp.dash = dash;
        };
        // 燻煙剤：サイレンと緑の線をたよりに逃げ場へ（人も同じ情報を持っている）
        if (style === 'smart' && g.safeRings && g.safeRings.length) {
          const sp = g.nearestSafe(p), d = Math.hypot(sp.x - p.x, sp.z - p.z);
          if (d > 0.6) { if (p.surface >= 0) steer(sp.x - p.x, sp.z - p.z); else steer(sp.x - p.x, sp.z - p.z); }
          return;
        }
        // ネコ：鈴が近い・ねらわれたら、ネコと反対へ逃げる
        const C = g.cat;
        if (style === 'smart' && C && p.surface < 0 && (C.target === p && (C.st === 'stalk' || C.st === 'pounce'))) {
          steer(p.x - C.x, p.z - C.z);
          return;
        }
        const danger = (f.act && !f.act.done && Math.hypot(f.act.x - p.x, f.act.z - p.z) < f.act.radius + 0.6) ||
          g.clouds.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < c.r + 0.4 && Math.abs(c.y - p.y) < 1.5);
        if (style === 'smart' && ((f.state === 'CHASE' && f.target === p) || danger)) {
          // 近い隠れ場所（台の下か畝の下）へ逃げて、着いたらじっとする
          const spots = [];
          for (const z of [-8, -1, 6]) for (const x of [9.5, 12, 14.5, 17]) spots.push({ x, z });
          for (const z of [-10, -5, 0, 5, 10]) for (let x = -16; x <= 2; x += 3) spots.push({ x, z });
          let hs = spots[0], hd = 1e9;
          for (const s of spots) {
            let sc = Math.hypot(s.x - p.x, s.z - p.z) - 0.5 * Math.hypot(s.x - f.x, s.z - f.z);
            if (g.clouds.some((c) => Math.hypot(c.x - s.x, c.z - s.z) < c.r + 1)) sc += 50;
            if (Math.hypot(s.x - f.x, s.z - f.z) < 3) sc += 20;
            if (sc < hd) { hd = sc; hs = s; }
          }
          const dx = hs.x - p.x, dz = hs.z - p.z, d = Math.hypot(dx, dz);
          if (p.surface >= 0 || d > 0.3 || danger) {
            let ex = dx, ez = dz;
            if ((danger && d < 0.3) || p.surface >= 0) { ex = p.x - f.x; ez = p.z - f.z; }
            const n = Math.hypot(ex, ez) || 1;
            const fx = Math.sin(g.camYaw), fz = Math.cos(g.camYaw);
            inp.mz = (ex * fx + ez * fz) / n; inp.mx = (-ex * fz + ez * fx) / n; inp.dash = true;
          }
          return;
        }
        const reach = g.crateInReach(p);
        if (reach) {
          if (p.greed > 82) eatOn = false;
          if (p.greed < 30) eatOn = true;
          inp.actionHeld = eatOn;
          return;
        }
        let best = null, bd = 1e9;
        for (const c of g.crates) {
          if (c.rotten || c.shipped || c.carried) continue;
          const d = Math.hypot(c.x - p.x, c.z - p.z);
          if (d < bd) { bd = d; best = c; }
        }
        if (!best) return;
        let tx = best.x, tz = best.z;
        const T = [{ x: 13, z: -8 }, { x: 13, z: -1 }, { x: 13, z: 6 }];
        if (best.table >= 0) {
          const tb = T[best.table];
          if (p.surface === best.table) { tz = tb.z + (p.z < tb.z ? -0.85 : 0.85); }
          else if (p.surface < 0) {
            tz = p.z < tb.z ? tb.z - 1.45 : tb.z + 1.45;
            const ctx = g.context();
            if (ctx && ctx.text === '台に登る' && Math.abs(p.x - best.x) < 1.2) { inp.press('action'); return; }
          }
        } else tz = best.z + (p.z < best.z ? -0.72 : 0.72);
        const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1;
        const fx = Math.sin(g.camYaw), fz = Math.cos(g.camYaw);
        inp.mz = (dx * fx + dz * fz) / d;
        inp.mx = (-dx * fz + dz * fx) / d;
        inp.dash = d > 4 && g.farmer.state !== 'WORK';
      };
      let guard = 0;
      const stateTime = {};
      while (g.state === 'play' && guard++ < 900) {
        const k = g.farmer.state + (g.farmer.state === 'WORK' ? ':' + g.farmer.phase : '');
        stateTime[k] = (stateTime[k] || 0) + 1;
        const bad = RH.sim(1, 1 / 30, bot);
        bad.forEach((b) => issues.add(b));
      }
      const f = g.farmer;
      return { diff, seed, res: g.result && { win: g.result.win, reason: g.result.reason, rank: g.result.rank, time: Math.round(g.result.elapsed) },
        ruined: g.ruined, shipped: g.shipped, traps: g.traps.length, anger: f.anger, nymphs: g.nymphs.length, stats: g.stats, issues: [...issues], log, stateTime };
    }, { diff, seed, style });
    console.log(JSON.stringify(r));
  }
  console.log('ERRORS', errors.length, errors.slice(0, 5).join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
