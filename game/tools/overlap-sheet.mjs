#!/usr/bin/env node
// 重なり・めりこみの点検：HD-2D の画面写真を 並べた 1枚の 一覧（改善会議 2026-10-21 の 4。開発用）。
// 開発サーバー（127.0.0.1:5173）が 動いているとき：
//
//   node tools/overlap-sheet.mjs --out /tmp/overlap            主な地図と場面（下の SHOTS）
//   node tools/overlap-sheet.mjs --out /tmp/overlap --only town,umizoi
//   node tools/overlap-sheet.mjs --out /tmp/overlap --cols 4 --hd2dq normal
//
// 1枚ずつ：その場所へ行き（話の段を __game.cmd.jump で、地図は warp で。地図だけの写真は
// その地図の人が いちばん 集まる あたりへ）、__game.cmd.placeCheck()（マス目と 2D の絵）と
// __game.cmd.hd2dPeople()（HD-2D の 立体で 人が 物に めりこむ）の 数を 写真の 下に 書く。
// 出す物：<out>/NN_<label>.png、<out>/sheet.png（一覧）、<out>/issues.json（見つかった物の 全部）。
// 直すかどうかは 人が決める（わざと 重ねている物もある：placecheck.ts の 冒頭）。

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = opt('--base', 'http://127.0.0.1:5173/');
const OUT = opt('--out', 'shots/overlap');
const COLS = Number(opt('--cols', '3'));
const Q = opt('--hd2dq', 'light');
const ONLY = opt('--only', '')
  .split(',')
  .filter(Boolean);

/**
 * 写真の 一覧。jump：話の段（__game.cmd.jump の 名前）。map：その地図へ（x, y を 省くと 人の 集まる 所）。
 * stage / hstage：第1章・第2章の 段（__game.cmd.stage・flag_ch2_stage）。
 */
const SHOTS = [
  { label: 'town', jump: 'maruyama', note: '夕鳴銀座（第1章 夕方前）' },
  { label: 'town_hinoya', jump: 'chime', noRun: true, note: 'ひのやの前' },
  { label: 'town_park', map: 'map_town', x: 20, y: 10, note: '夕鳴公園' },
  { label: 'school', map: 'map_school' },
  { label: 'kotei', map: 'map_school_kotei' },
  { label: 'aze', map: 'map_aze' },
  { label: 'seki', map: 'map_seki' },
  { label: 'mall_roof', map: 'map_mall_roof' },
  { label: 'hoshimidai', map: 'map_hoshimidai', hstage: 1 },
  { label: 'ch2_yoriai', jump: 'ch2:yoriai', wait: 7000, note: '分校の前（寄り合いの 場面）' },
  { label: 'hoshi_hill', map: 'map_hoshi_hill', hstage: 1 },
  { label: 'hoshi_sawa', map: 'map_hoshi_sawa', hstage: 1 },
  { label: 'umizoi', jump: 'ch3:umizoi', note: '海ぞいの町（第3章）' },
  { label: 'ch3_kids', jump: 'ch3:arrive', wait: 9000, note: '港に着く（S06 子どもたちを 並べた 場面）' },
  { label: 'misaki', map: 'map_c3_misaki' },
  { label: 'iso', map: 'map_c3_iso' },
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}?hd2d=1&hd2dq=${Q}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 30000 });
await page.waitForTimeout(1200);

const shots = [];
const all = {};
let n = 0;
for (const s of SHOTS) {
  if (ONLY.length && !ONLY.includes(s.label)) continue;
  try {
    if (s.jump) await page.evaluate(([b, nr]) => __game.cmd.jump(b, nr), [s.jump, !!s.noRun]);
    else {
      // a field to warp from (the first time)
      const has = await page.evaluate(() => !!__game.cmd.fieldRef());
      if (!has) {
        await page.evaluate(() => __game.cmd.jump('maruyama', true));
        await page.waitForTimeout(1500);
      }
      if (s.hstage !== undefined) await page.evaluate((v) => __game.cmd.flag('flag_ch2_stage', v), s.hstage);
      if (s.stage !== undefined) await page.evaluate((v) => __game.cmd.stage(v), s.stage);
      await page.evaluate(([m, x, y]) => {
        __game.cmd.noclip(true);
        // (loadMap, not warp: the map's entrance talk doesn't start over the picture)
        const f = __game.cmd.fieldRef();
        f.loadMap(m, x ?? 1, y ?? 1, 'down');
        f.syncFollower?.(true);
        if (x !== undefined) return;
        // where the people of the map gather: the middle of them (else of the map)
        const ps = f.actors.filter((a) => a.visible && a.x >= 0 && a.x < f.map.w * 16 && a.y > 0 && a.y <= f.map.h * 16);
        const cx = ps.length ? ps.reduce((t, a) => t + a.x, 0) / ps.length : (f.map.w * 16) / 2;
        const cy = ps.length ? ps.reduce((t, a) => t + a.y, 0) / ps.length : (f.map.h * 16) / 2;
        f.player.x = Math.floor(cx / 16) * 16 + 8;
        f.player.y = Math.floor(cy / 16) * 16 + 16;
      }, [s.map, s.x, s.y]);
    }
    await page.waitForTimeout(s.wait ?? 3500);
    // (a map's picture: the player is only the camera there, not counted)
    const r = await page.evaluate((cam) => ({
      map: __game.cmd.fieldRef()?.map.id,
      place: __game.cmd.placeCheck({ player: !cam }),
      hd2d: (() => {
        const h = __game.cmd.hd2dPeople();
        return Array.isArray(h) && cam ? h.filter((o) => !/\((player|follower)\)$/.test(o.front) && !/\((player|follower)\)$/.test(o.back)) : h;
      })(),
      props: __game.cmd.hd2dOverlaps ? __game.cmd.hd2dOverlaps({ min: 8 }).length : null,
    }), !s.jump);
    const file = `${String(n++).padStart(2, '0')}_${s.label}.png`;
    await page.locator('canvas').first().screenshot({ path: path.join(OUT, file) });
    all[s.label] = r;
    const place = Array.isArray(r.place) ? r.place : [];
    const hd = Array.isArray(r.hd2d) ? r.hd2d : [];
    shots.push({ file, label: s.label, note: s.note ?? r.map, place, hd, props: r.props });
    console.log(`${file}  ${r.map}  マス・2D ${place.length}  HD-2D 人 ${hd.length}  HD-2D 物どうし ${r.props ?? '-'}`);
  } catch (e) {
    console.log(`${s.label}: ${e.message}`);
  }
}

// ---- the sheet: the pictures in a grid, the counts and the first findings under each
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const cell = (s) => {
  const img = fs.readFileSync(path.join(OUT, s.file)).toString('base64');
  const lines = [...s.place.map((p) => `${p.kind} ${p.a}${p.b ? ' × ' + p.b : ''} (${p.at})${p.note ? ' ' + p.note : ''}`), ...s.hd.map((h) => `HD-2D ${h.front} × ${h.back} (${h.at}) ${h.px || h.flush}px`)];
  return `<figure><img src="data:image/png;base64,${img}"><figcaption><b>${esc(s.label)}</b> ${esc(s.note)} — マス・2D ${s.place.length} / HD-2D 人 ${s.hd.length} / 物どうし ${s.props ?? '-'}<br>${lines.slice(0, 6).map(esc).join('<br>')}${lines.length > 6 ? `<br>…ほか ${lines.length - 6}` : ''}</figcaption></figure>`;
};
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:12px;background:#fff;font:12px/1.35 sans-serif;color:#222}
.g{display:grid;grid-template-columns:repeat(${COLS},384px);gap:10px}
figure{margin:0}img{width:384px;height:216px;image-rendering:pixelated;display:block;border:1px solid #888}
figcaption{padding:3px 2px}</style><div class="g">${shots.map(cell).join('')}</div>`;
const sheet = await browser.newPage({ viewport: { width: COLS * 394 + 24, height: 400 } });
await sheet.setContent(html);
await sheet.waitForTimeout(300);
await sheet.screenshot({ path: path.join(OUT, 'sheet.png'), fullPage: true });
fs.writeFileSync(path.join(OUT, 'issues.json'), JSON.stringify({ base: BASE, hd2dq: Q, shots: all, errors }, null, 2));
console.log(`sheet: ${path.join(OUT, 'sheet.png')}  pageerrors ${errors.length}`);
await browser.close();
