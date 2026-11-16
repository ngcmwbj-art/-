#!/usr/bin/env node
/*
 * coverflow.check.mjs — ジャケットが流れる画面（js/coverflow.js）の動作を確かめる
 *
 * 使い方:
 *   node tests/e2e/coverflow.check.mjs
 *   CF_SHOTS=/どこか/の/フォルダ node tests/e2e/coverflow.check.mjs   … 写真の置き場所を変える
 *
 * 見本ページ（tests/coverflow-demo.html）を小さなサーバーで開き、Playwright（Chromium）で
 * ドラッグ・はじき・タップ・裏返し・曲のタップ・キーボード・ホイール・タッチを試します。
 * 1つでも期待とちがえば、最後に一覧を出して exit 1 で終わります。
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');                    // music/
const SHOTS = process.env.CF_SHOTS || path.join(os.tmpdir(), 'coverflow-shots');
fs.mkdirSync(SHOTS, { recursive: true });

// 部品の中の数字と同じもの（期待する値を計算するため）
const SIZE_RATIO = 0.55;
const DRAG_UNIT = 0.36;
const MAX_COVERS = 21;      // 左右 10 枚 + 中央 1 枚がいちばん多いとき

// ───────── 結果の記録 ─────────
const results = [];
let section = '';
function check(name, ok, detail = '') {
  results.push({ section, name, ok: !!ok, detail });
  console.log(`${ok ? '  ok  ' : '  NG  '} ${name}${detail ? `  … ${detail}` : ''}`);
}
function begin(title) {
  section = title;
  console.log(`\n■ ${title}`);
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────── 小さな静的サーバー ─────────
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
};
function startServer() {
  const srv = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(req.url.split('?')[0]); } catch { rel = '/'; }
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(srv)));   // 空いているポートを使う
}

// ───────── PNG を読む（写真の色を確かめるための、最小限のもの） ─────────
function decodePng(buf) {
  let p = 8, w = 0, h = 0, ct = 0;
  const parts = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    else if (type === 'IDAT') parts.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0;
  if (!bpp) throw new Error(`この PNG の形式（${ct}）は読めません`);
  const raw = zlib.inflateSync(Buffer.concat(parts));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 255;
    }
  }
  /** (x0,y0)-(x1,y1) の四角の明るさの平均（0〜255） */
  const brightness = (x0, y0, x1, y1) => {
    let sum = 0, n = 0;
    for (let y = Math.max(0, Math.round(y0)); y < Math.min(h, Math.round(y1)); y++) {
      for (let x = Math.max(0, Math.round(x0)); x < Math.min(w, Math.round(x1)); x++) {
        const i = y * stride + x * bpp;
        sum += (out[i] + out[i + 1] + out[i + 2]) / 3;
        n++;
      }
    }
    return n ? sum / n : 0;
  };
  return { w, h, brightness };
}

// ───────── ページを操作する小道具 ─────────
async function openDemo(browser, base, { width, height, query = '', context = {} }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, ...context });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  // requestAnimationFrame が何回たのまれたかを数える（止まっているかを確かめるため）
  await page.addInitScript(() => {
    const orig = window.requestAnimationFrame.bind(window);
    window.__raf = 0;
    window.requestAnimationFrame = (cb) => { window.__raf++; return orig(cb); };
  });
  await page.goto(`${base}/tests/coverflow-demo.html${query}`);
  await page.waitForSelector('.cf-root');
  await page.waitForTimeout(450);          // ふわっと出るのと、画像の読みこみを待つ
  return { ctx, page, errors };
}

const state = (page) => page.evaluate(() => {
  const r = document.querySelector('.cf-root');
  const covers = [...document.querySelectorAll('.cf-cover')];
  return {
    index: Number(r.getAttribute('data-cf-index')),
    key: r.getAttribute('data-cf-key'),
    flipped: r.getAttribute('data-cf-flipped') === '1',
    moving: r.getAttribute('data-cf-moving') === '1',
    covers: covers.length,
    indexes: covers.map((c) => c._cf.index).sort((a, b) => a - b),
    imgs: document.querySelectorAll('.cf-root img').length,
    W: window.innerWidth,
    H: window.innerHeight,
    size: parseFloat(r.style.getPropertyValue('--cf-size')),
    top: parseFloat(r.style.getPropertyValue('--cf-top')),
    raf: window.__raf,
  };
});

const cover = (page, i) => page.evaluate((idx) => {
  const el = [...document.querySelectorAll('.cf-cover')].find((c) => c._cf.index === idx);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const m = /translate3d\(([-\d.]+)px,\s*([-\d.]+)(?:px)?,\s*([-\d.]+)px\)\s*rotateY\(([-\d.]+)deg\)/.exec(el.style.transform) || [];
  return {
    left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height,
    z: Number(cs.zIndex), visible: cs.visibility !== 'hidden', tf: el.style.transform,
    x: Number(m[1]), depth: Number(m[3]), rot: Number(m[4]),
    hasArt: el.classList.contains('cf-has-art'),
  };
}, i);

async function settled(page, timeout = 6000) {
  await page.waitForTimeout(40);
  await page.waitForFunction(() => document.querySelector('.cf-root').getAttribute('data-cf-moving') === '0', null, { timeout });
  await page.waitForTimeout(30);
}

async function shot(page, name) {
  const file = path.join(SHOTS, name);
  await page.screenshot({ path: file });
  console.log(`  写真  ${file}`);
  return file;
}

/** マウスで (x0,y) から dx だけ横に引く。hold > 0 なら離す前に止めておく（勢いを 0 にする） */
async function dragBy(page, x0, y, dx, { steps = 10, stepWait = 16, hold = 0, release = true } = {}) {
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x0 + (dx * i) / steps, y);
    if (stepWait) await page.waitForTimeout(stepWait);
  }
  if (hold) await page.waitForTimeout(hold);
  if (release) await page.mouse.up();
}

// ───────── ここから確かめる ─────────
async function flowMain(browser, base) {
  begin('667×375: 見た目と並び');
  const { ctx, page, errors } = await openDemo(browser, base, { width: 667, height: 375 });
  let s = await state(page);
  const W = s.W, H = s.H, S = s.size;
  const unit = Math.min(130, Math.max(48, S * DRAG_UNIT));
  const cy = s.top + S / 2;

  check('はじめに 12 番が中央', s.index === 12 && s.key === 'al-12', `index=${s.index} key=${s.key}`);
  check('ジャケットの一辺が画面の高さの 55% ほど', near(S, H * SIZE_RATIO, 1.5), `${S}px / 高さ ${H}px`);
  check('DOM のジャケットは少しだけ', s.covers >= 9 && s.covers <= MAX_COVERS, `${s.covers} 枚`);
  check('中央のまわりが、すきまなく並んでいる', s.indexes.every((v, i) => i === 0 || v === s.indexes[i - 1] + 1) && s.indexes.includes(12), s.indexes.join(','));

  const c = await cover(page, 12);
  check('中央のジャケットは正面向きで、画面のまん中', near(c.rot, 0, 0.01) && near((c.left + c.right) / 2, W / 2, 0.6) && near(c.width, S, 1) && near(c.height, S, 1),
    `幅${c.width.toFixed(1)} 高さ${c.height.toFixed(1)} 中心x=${((c.left + c.right) / 2).toFixed(1)}`);

  const l1 = await cover(page, 11), r1 = await cover(page, 13);
  check('となりは約 70° かたむいて奥へ下がる', near(l1.rot, 70, 0.5) && near(r1.rot, -70, 0.5) && l1.depth < -50 && r1.depth < -50, `左 ${l1.rot}° 右 ${r1.rot}° 奥行き ${l1.depth}px`);
  check('横のジャケットは中央より小さく見える', l1.height < c.height * 0.92 && l1.width < c.width * 0.6, `横 ${l1.width.toFixed(0)}×${l1.height.toFixed(0)} / 中央 ${c.width.toFixed(0)}×${c.height.toFixed(0)}`);

  let sym = true, order = true, detail = '';
  let prevL = c, prevR = c;
  for (let k = 1; k <= 5; k++) {
    const L = await cover(page, 12 - k), R = await cover(page, 12 + k);
    if (!L || !R) { sym = false; detail = `±${k} が無い`; break; }
    if (!near(L.left + R.right, W, 1) || !near(L.right + R.left, W, 1) || !near(L.top, R.top, 0.6) || !near(L.height, R.height, 0.6)) { sym = false; detail = `±${k}: L[${L.left.toFixed(1)},${L.right.toFixed(1)}] R[${R.left.toFixed(1)},${R.right.toFixed(1)}]`; }
    if (!(L.z < prevL.z && R.z < prevR.z)) { order = false; detail = `±${k}: z=${L.z}/${R.z}`; }
    if (!(L.left < prevL.left && R.right > prevR.right)) { order = false; detail = `±${k}: 位置の順がおかしい`; }
    prevL = L; prevR = R;
  }
  check('左右対称に並んでいる', sym, detail);
  check('中央に近いほど手前（z-index が大きい）', order, detail);

  // 実際の重なり: 11 番と 10 番が重なるところでは 11 番が上にある
  const l2 = await cover(page, 10);
  const hit = await page.evaluate(([xa, xb, y]) => {
    const at = (x) => { const el = document.elementFromPoint(x, y); const cv = el && el.closest('.cf-cover'); return cv ? cv._cf.index : -1; };
    return [at(xa), at(xb)];
  }, [l1.left + 4, (l2.left + l1.left) / 2, cy]);
  check('重なったところは、中央に近いほうが上に見えている', hit[0] === 11 && hit[1] === 10, `11番の左はし→${hit[0]} / そのさらに左→${hit[1]}`);

  // 文字
  const cap = await page.evaluate(() => {
    const t = document.querySelector('.cf-title'), a = document.querySelector('.cf-artist');
    const rt = t.getBoundingClientRect(), ra = a.getBoundingClientRect();
    const ct = getComputedStyle(t), ca = getComputedStyle(a);
    return {
      title: t.textContent, artist: a.textContent, tTop: rt.top, tBottom: rt.bottom, aTop: ra.top, aBottom: ra.bottom, mid: (rt.left + rt.right) / 2,
      weight: Number(ct.fontWeight), color: ct.color, aColor: ca.color, wrap: ct.whiteSpace, ell: ct.textOverflow,
      want: window.__demo.albums[12],
    };
  });
  check('中央の下にアルバム名（白・太字）とアーティスト名（灰色）', cap.title === cap.want.title && cap.artist === cap.want.artist && cap.weight >= 700 && cap.color === 'rgb(255, 255, 255)' && cap.aColor !== cap.color,
    `「${cap.title}」/「${cap.artist}」 ${cap.color} / ${cap.aColor}`);
  check('文字はジャケットのすぐ下・まん中・画面の中', cap.tTop >= c.bottom && cap.tTop < c.bottom + 20 && cap.aTop >= cap.tBottom - 1 && cap.aBottom < H && near(cap.mid, W / 2, 1),
    `ジャケット下=${c.bottom.toFixed(0)} 題=${cap.tTop.toFixed(0)}〜${cap.tBottom.toFixed(0)} 人=${cap.aTop.toFixed(0)}〜${cap.aBottom.toFixed(0)}`);
  check('長い名前は1行で … になる設定', cap.wrap === 'nowrap' && cap.ell === 'ellipsis');

  // 画像
  const art = await page.evaluate(() => {
    const covers = [...document.querySelectorAll('.cf-cover')];
    const by = (i) => covers.find((cv) => cv._cf.index === i);
    const faceBg = getComputedStyle(by(10).querySelector('.cf-face')).backgroundImage;
    return {
      loaded: covers.filter((cv) => cv.classList.contains('cf-has-art')).length,
      total: covers.length,
      noArt: covers.filter((cv) => cv._cf.index % 7 === 3).length,
      async: covers.every((cv) => cv.querySelector('img').decoding === 'async'),
      defaultHasArt: by(10).classList.contains('cf-has-art'),
      defaultBg: faceBg.includes('svg') && faceBg.includes('gradient'),
      reflect: getComputedStyle(by(12).querySelector('.cf-face')).webkitBoxReflect || '',
      calls: window.__demo.artCalls(),
    };
  });
  check('見えているジャケットの画像が読みこまれている', art.loaded === art.total - art.noArt, `${art.loaded}/${art.total}（ジャケットなし ${art.noArt} 枚）`);
  check('画像は decoding="async"', art.async);
  check('ジャケットなしは、既定の絵（灰色のグラデーション + 音符の SVG）', !art.defaultHasArt && art.defaultBg);
  check('画像は見える範囲のぶんだけ取りに行く', art.calls <= s.covers + 2, `getArtUrl ${art.calls} 回 / ジャケット ${s.covers} 枚`);
  check('床への映りこみ（-webkit-box-reflect）が付いている', art.reflect.startsWith('below'), art.reflect.slice(0, 40));
  check('スタイルシートが読まれていれば、二重に読みこまない', await page.evaluate(() => document.querySelector('link[data-cf-css]') === null));

  // 止まっているあいだは requestAnimationFrame を回さない
  const raf0 = (await state(page)).raf;
  await page.waitForTimeout(400);
  const raf1 = (await state(page)).raf;
  check('止まっているあいだは rAF を回さない', raf1 === raf0, `${raf0} → ${raf1}`);

  // 写真で色を確かめる（背景は黒・下に映りこみがあって、下へ行くほど消える）
  const file = await shot(page, '01-667x375-center.png');
  const png = decodePng(fs.readFileSync(file));
  const d = 2;
  const bgTop = png.brightness(4 * d, 4 * d, 60 * d, 30 * d);
  const face = png.brightness((c.left + 8) * d, (c.bottom - 30) * d, (c.left + S * 0.22) * d, (c.bottom - 4) * d);
  const refl = png.brightness((c.left + 8) * d, (c.bottom + 3) * d, (c.left + S * 0.22) * d, (c.bottom + 24) * d);
  const reflFar = png.brightness((c.left + 8) * d, (c.bottom + S * 0.5) * d, (c.left + S * 0.22) * d, (c.bottom + S * 0.56) * d);
  check('背景は黒', bgTop < 3, `明るさ ${bgTop.toFixed(1)}`);
  check('ジャケットの下に、うすい映りこみがある', refl > 6 && refl < face * 0.7, `ジャケットの下のはし ${face.toFixed(1)} → 映りこみ ${refl.toFixed(1)}`);
  check('映りこみは下へ行くほど消える', reflFar < refl * 0.35 && reflFar < 6, `近く ${refl.toFixed(1)} → 遠く ${reflFar.toFixed(1)}`);

  // ───────── ドラッグ・慣性 ─────────
  begin('667×375: ドラッグ・慣性・タップ');
  await dragBy(page, W / 2, cy, -(unit * 3 + 6), { steps: 14, hold: 260, release: false });
  let mid = await state(page);
  const midCover = await cover(page, 12);
  check('ドラッグ中は指に付いて流れる', mid.index === 15 && mid.moving && Math.abs(midCover.rot) > 60, `index=${mid.index} 12番のかたむき=${midCover.rot}`);
  const rafA = mid.raf;
  await page.waitForTimeout(300);
  const rafB = (await state(page)).raf;
  check('指を止めているあいだは rAF を回さない', rafB === rafA, `${rafA} → ${rafB}`);
  await shot(page, '02-667x375-dragging.png');
  await page.mouse.up();
  await settled(page);
  s = await state(page);
  let cc = await cover(page, 15);
  check('ゆっくり 3 枚ぶん引いて離すと、3 枚先にぴたりと止まる', s.index === 15 && cc.x === 0 && cc.rot === 0, `index=${s.index} x=${cc.x} rot=${cc.rot}`);

  // とちゅうの写真（2 枚のあいだ）
  await dragBy(page, W / 2, cy, -(unit * 0.5 + 8), { steps: 6, hold: 200, release: false });
  await shot(page, '03-667x375-between.png');
  const a15 = await cover(page, 15), a16 = await cover(page, 16);
  check('2 枚のあいだでは、両方がななめを向く', a15.rot > 15 && a15.rot < 60 && a16.rot < -15 && a16.rot > -60, `15番 ${a15.rot}° / 16番 ${a16.rot}°`);
  await page.mouse.up();
  await settled(page);

  // 小さな動き（8px 未満）はタップ、それより大きければドラッグ
  s = await state(page);
  const before = s.index;
  await dragBy(page, W / 2, cy, 14, { steps: 3, hold: 200 });
  await settled(page);
  s = await state(page);
  check('14px 動かして離す → ドラッグあつかい（裏返らず、元の1枚にもどる）', s.index === before && !s.flipped, `index=${s.index} flipped=${s.flipped}`);

  const n1 = await cover(page, before + 1), n2 = await cover(page, before + 2);
  const tapX = (n1.right + n2.right) / 2;
  await dragBy(page, tapX, cy, 5, { steps: 2, stepWait: 10 });     // 5px ぶれたタップ
  await settled(page);
  s = await state(page);
  check('横のジャケットをタップ（5px のぶれ）→ それが中央に来る', s.index === before + 2 && !s.flipped, `${before} → ${s.index}`);

  const pL = await cover(page, s.index - 3), pL2 = await cover(page, s.index - 2);
  await page.mouse.click((pL.left + pL2.left) / 2, cy);
  await settled(page);
  const after3 = (await state(page)).index;
  check('左のジャケットをタップ → 3 枚もどる', after3 === s.index - 3, `${s.index} → ${after3}`);

  // はじく（速く動かして、すぐ離す）
  s = await state(page);
  const flingFrom = s.index;
  await dragBy(page, W / 2 + 100, cy, -200, { steps: 5, stepWait: 16 });
  const justAfter = await state(page);
  await page.waitForTimeout(120);
  await shot(page, '04-667x375-flinging.png');
  await settled(page);
  s = await state(page);
  cc = await cover(page, s.index);
  const flingDelta = s.index - flingFrom;
  check('速くはじくと、指を動かしたぶんより多く流れる（慣性）', justAfter.moving && flingDelta > 200 / unit + 2, `指は ${(200 / unit).toFixed(1)} 枚ぶん → ${flingDelta} 枚流れた`);
  check('はじいたあとも、1枚にぴたりと止まる', cc.x === 0 && cc.rot === 0 && !s.moving, `index=${s.index} x=${cc.x}`);
  check('はじいたあと、止まれば rAF も止まる', (await state(page)).raf === (await (async () => { await page.waitForTimeout(300); return state(page); })()).raf);

  // 減速がなめらかか: はじいたあとの位置を細かく記録して、速さが少しずつ落ちるのを見る
  await page.keyboard.press('Home');
  await settled(page);
  await page.evaluate(() => {
    window.__trace = [];
    const t0 = performance.now();
    const read = () => {
      const covers = [...document.querySelectorAll('.cf-cover')];
      // いちばん正面に近い1枚の「番号 + ずれ」から、小数の位置を出す
      let best = null;
      for (const cv of covers) {
        const m = /translate3d\(([-\d.]+)px/.exec(cv.style.transform);
        const r = /rotateY\(([-\d.]+)deg\)/.exec(cv.style.transform);
        if (!m || !r) continue;
        const rot = Number(r[1]);
        if (!best || Math.abs(rot) < Math.abs(best.rot)) best = { i: cv._cf.index, rot };
      }
      if (best) window.__trace.push({ t: performance.now() - t0, p: best.i + best.rot / 70 });
      if (performance.now() - t0 < 2500) setTimeout(read, 12);
    };
    read();
  });
  await dragBy(page, W / 2 + 120, cy, -240, { steps: 6, stepWait: 16 });
  await settled(page);
  const trace = await page.evaluate(() => window.__trace);
  const afterRelease = trace.filter((q) => q.t > 140);
  let maxJump = 0, backwards = 0, speeds = [];
  for (let i = 1; i < afterRelease.length; i++) {
    const dp = afterRelease[i].p - afterRelease[i - 1].p;
    const dtt = afterRelease[i].t - afterRelease[i - 1].t;
    if (dp < -0.02) backwards++;
    if (dtt > 0) { maxJump = Math.max(maxJump, Math.abs(dp)); speeds.push(dp / dtt * 1000); }
  }
  const firstQ = speeds.slice(0, Math.max(1, Math.floor(speeds.length / 4)));
  const lastQ = speeds.slice(-Math.max(1, Math.floor(speeds.length / 4)));
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  s = await state(page);
  check('慣性の減速はなめらか（急に飛ばない・逆もどりしない・だんだん遅くなる）', s.index >= 6 && backwards === 0 && avg(firstQ) > avg(lastQ) * 3 && maxJump < 2.5,
    `0 → ${s.index} 枚 / はじめの速さ ${avg(firstQ).toFixed(1)} 枚/秒 → おわり ${avg(lastQ).toFixed(2)} 枚/秒 / 1コマの最大 ${maxJump.toFixed(2)} 枚`);

  // 端
  begin('667×375: 両端');
  await page.keyboard.press('Home');
  await settled(page);
  check('Home キーで先頭へ', (await state(page)).index === 0);
  await shot(page, '05-667x375-first.png');
  await dragBy(page, W / 2, cy, 220, { steps: 10, hold: 220, release: false });
  const pulled = await cover(page, 0);
  const gapPx = S * 0.9;
  check('先頭でさらに引くと、ゴムのように重くなる（引いた量より少ししか動かない）', pulled.x > 20 && pulled.x < gapPx * 0.95, `220px（${(220 / unit).toFixed(1)} 枚ぶん）引いて ${pulled.x.toFixed(0)}px（1枚ぶんは ${gapPx.toFixed(0)}px）`);
  await shot(page, '06-667x375-rubber.png');
  await page.mouse.up();
  await settled(page);
  cc = await cover(page, 0);
  check('離すと先頭にもどる', (await state(page)).index === 0 && cc.x === 0, `x=${cc.x}`);

  // 先頭で、さらに手前へ強くはじく → 少しだけ行き過ぎて戻る
  await page.evaluate(() => {
    window.__maxX = 0;
    const t0 = performance.now();
    const read = () => {
      const cv = [...document.querySelectorAll('.cf-cover')].find((q) => q._cf.index === 0);
      const m = cv && /translate3d\(([-\d.]+)px/.exec(cv.style.transform);
      if (m) window.__maxX = Math.max(window.__maxX, Number(m[1]));
      if (performance.now() - t0 < 1500) setTimeout(read, 8);
    };
    read();
  });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await settled(page);
  await dragBy(page, W / 2 - 150, cy, 300, { steps: 5, stepWait: 16 });
  await settled(page);
  const maxX = await page.evaluate(() => window.__maxX);
  cc = await cover(page, 0);
  check('先頭へ強くはじいても、少し行き過ぎるだけで先頭に止まる', (await state(page)).index === 0 && cc.x === 0 && maxX > 1 && maxX < gapPx * 0.6, `行き過ぎ ${maxX.toFixed(1)}px（1枚ぶん ${gapPx.toFixed(0)}px）`);

  await page.keyboard.press('End');
  await settled(page);
  s = await state(page);
  check('End キーで最後へ', s.index === 39, `index=${s.index}`);
  await dragBy(page, W / 2 + 100, cy, -260, { steps: 5, stepWait: 16 });
  await settled(page);
  cc = await cover(page, 39);
  check('最後でさらにはじいても、最後の1枚に止まる', (await state(page)).index === 39 && cc.x === 0);
  await shot(page, '07-667x375-last.png');

  // ───────── 裏返し ─────────
  begin('667×375: 裏返しと曲の一覧');
  await page.evaluate(() => window.__cf.show({ focusKey: 'al-12' }));
  await settled(page);
  // 裏返しのようすを細かく記録する
  await page.evaluate(() => {
    window.__flip = [];
    const t0 = performance.now();
    const read = () => {
      const cv = [...document.querySelectorAll('.cf-cover')].find((q) => q._cf.index === 12);
      const p = document.querySelector('.cf-panel');
      const rc = cv && /rotateY\(([-\d.]+)deg\)/.exec(cv.style.transform);
      const rp = /rotateY\(([-\d.]+)deg\)/.exec(p.style.transform);
      window.__flip.push({
        t: performance.now() - t0, cover: rc ? Number(rc[1]) : null, coverVisible: cv ? getComputedStyle(cv).visibility !== 'hidden' : false,
        panel: rp ? Number(rp[1]) : null, panelOpen: p.classList.contains('cf-open'), panelTf: p.style.transform,
      });
      if (performance.now() - t0 < 1400) setTimeout(read, 8);
    };
    read();
  });
  await page.mouse.click(W / 2, cy);                     // 中央のジャケットをタップ
  await page.waitForTimeout(130);
  await shot(page, '08-667x375-flip-early.png');
  await page.waitForTimeout(60);
  await shot(page, '09-667x375-flip-late.png');
  await settled(page);
  const fl = await page.evaluate(() => window.__flip);
  const turning = fl.filter((q) => q.cover != null && q.cover > 1 && q.cover < 90 && q.coverVisible);
  const arriving = fl.filter((q) => q.panel != null && q.panel > -90 && q.panel < -1 && q.panelOpen);
  const tStart = turning.length ? turning[0].t : NaN;
  const done = fl.find((q) => q.panelOpen && q.panelTf === '' && q.t > tStart);
  const flipMs = done ? done.t - tStart : NaN;
  const bothShown = fl.filter((q) => q.coverVisible && q.panelOpen).length;
  check('中央をタップ → その場で回って裏返る（表が 0→90°、裏が -90→0°）', turning.length >= 3 && arriving.length >= 3, `表 ${turning.length} コマ / 裏 ${arriving.length} コマ`);
  check('裏返しは約 0.5 秒', flipMs > 380 && flipMs < 800, `${Math.round(flipMs)}ms`);
  check('表と裏が同時に見えることはない', bothShown === 0, `${bothShown} コマ`);

  s = await state(page);
  const panel = await page.evaluate(() => {
    const p = document.querySelector('.cf-panel');
    const r = p.getBoundingClientRect();
    const head = p.querySelector('.cf-panel-head');
    const rows = [...p.querySelectorAll('.cf-row')];
    const list = p.querySelector('.cf-tracks');
    const first = rows[0].querySelector('.cf-track');
    return {
      left: r.left, top: r.top, right: r.right, bottom: r.bottom,
      visible: getComputedStyle(p).visibility === 'visible',
      headBg: getComputedStyle(head).backgroundImage,
      headTitle: p.querySelector('.cf-panel-title').textContent, headArtist: p.querySelector('.cf-panel-artist').textContent,
      headBottom: head.getBoundingClientRect().bottom, listTop: list.getBoundingClientRect().top,
      listBg: getComputedStyle(list).backgroundColor, overflowY: getComputedStyle(list).overflowY,
      rows: rows.length, rowH: rows[0].getBoundingClientRect().height,
      texts: rows.map((li) => [...li.querySelectorAll('span')].map((sp) => sp.textContent)),
      tracks: window.__demo.albums && window.__cf ? null : null,
      firstNo: first.querySelector('.cf-track-no').textContent,
    };
  });
  const want = await page.evaluate(() => {
    // 見本ページと同じ作り方で、12 番のアルバムの曲を数える
    const i = 12; const count = 5 + (i * 3) % 11; return { count };
  });
  const c12 = await cover(page, 12);
  check('裏返ったあとは、表のジャケットがかくれて曲の一覧が出ている', s.flipped && panel.visible && !c12.visible);
  check('一覧は画面のまん中に、画面からはみ出さずに出る', near((panel.left + panel.right) / 2, W / 2, 1) && panel.top >= 0 && panel.bottom <= H && panel.left >= 0 && panel.bottom - panel.top > H * 0.8,
    `${panel.left},${panel.top} 〜 ${panel.right},${panel.bottom}`);
  check('上は見出し（アルバム名・アーティスト名）', panel.headTitle === cap.want.title && panel.headArtist === cap.want.artist && near(panel.headBottom, panel.listTop, 0.6),
    `「${panel.headTitle}」/「${panel.headArtist}」`);
  check('下は曲リスト（行の高さ 44px・縦スクロール）', panel.rowH === 44 && panel.overflowY === 'auto' && panel.rows === want.count, `${panel.rows} 行 × ${panel.rowH}px`);
  const fmtOk = panel.texts.every((t) => /^\d+$/.test(t[0]) && t[1].length > 0 && (t[2] === '' || /^\d+:\d\d$/.test(t[2])));
  check('各行に 番号・題名・長さ（m:ss）', fmtOk && panel.texts[0][0] === '1' && panel.texts[6][0] === '7' && panel.texts[7][2] === '', JSON.stringify(panel.texts.slice(0, 2)));
  await shot(page, '10-667x375-back.png');

  // 曲をタップ
  await page.click('.cf-track[data-cf-i="2"]');
  await page.waitForTimeout(60);
  let play = await page.evaluate(() => ({
    plays: window.__demo.state.plays,
    playing: [...document.querySelectorAll('.cf-row')].map((li, i) => (li.classList.contains('cf-playing') ? i : -1)).filter((i) => i >= 0),
    icon: getComputedStyle(document.querySelector('.cf-row.cf-playing .cf-track-no') || document.body).backgroundImage,
    flipped: document.querySelector('.cf-root').getAttribute('data-cf-flipped'),
  }));
  check('曲をタップ → onPlayTrack(album, index) が呼ばれる', play.plays.length === 1 && play.plays[0].key === 'al-12' && play.plays[0].index === 2, JSON.stringify(play.plays));
  check('再生中の曲に青いスピーカーの印が付く（裏面は開いたまま）', play.playing.join() === '2' && play.icon.includes('svg') && play.flipped === '1', `印のある行: ${play.playing.join()}`);
  await shot(page, '11-667x375-back-playing.png');

  // 外から再生中の曲が変わった → refresh() で印が移る
  await page.evaluate(() => { window.__demo.state.nowPlayingId = 12000; window.__cf.refresh(); });
  play = await page.evaluate(() => [...document.querySelectorAll('.cf-row')].map((li, i) => (li.classList.contains('cf-playing') ? i : -1)).filter((i) => i >= 0));
  check('refresh() で「再生中」の印が付けなおされる', play.join() === '0', `印のある行: ${play.join()}`);

  // 裏面のあいだは、うしろのジャケットは動かない
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  check('裏返っているあいだは ← → で流れない', (await state(page)).index === 12);

  // 外をタップで戻る
  await page.mouse.click(24, H / 2);
  await settled(page);
  s = await state(page);
  const pv = await page.evaluate(() => ({ vis: getComputedStyle(document.querySelector('.cf-panel')).visibility, rows: document.querySelectorAll('.cf-row').length }));
  check('裏面の外をタップ → 表にもどる', !s.flipped && pv.vis === 'hidden' && (await cover(page, 12)).visible && pv.rows === 0);

  // 「i」ボタン
  await page.click('.cf-info');
  await settled(page);
  check('右下の「i」ボタン → 裏返る', (await state(page)).flipped);
  await page.click('.cf-info');
  await settled(page);
  check('もう一度「i」ボタン → もどる', !(await state(page)).flipped);

  // 60 曲のアルバム: 縦にスクロールできる。ホイールは一覧だけを動かす
  await page.evaluate(() => window.__cf.show({ focusKey: 'al-10' }));
  await settled(page);
  await page.keyboard.press('Enter');
  await settled(page);
  const sc0 = await page.evaluate(() => { const l = document.querySelector('.cf-tracks'); return { sh: l.scrollHeight, ch: l.clientHeight, rows: l.children.length }; });
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(250);
  const sc1 = await page.evaluate(() => document.querySelector('.cf-tracks').scrollTop);
  s = await state(page);
  check('曲が多いアルバムは一覧を縦にスクロールできる', sc0.rows === 60 && sc0.sh > sc0.ch && sc1 > 100 && s.index === 10 && s.flipped, `60 行 / 中身 ${sc0.sh}px / 見える ${sc0.ch}px / 動いた ${sc1}px`);
  await shot(page, '12-667x375-back-scrolled.png');
  // ↓ キーで行をえらんで Enter で再生
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(60);
  const kp = await page.evaluate(() => window.__demo.state.plays.slice(-1)[0]);
  check('裏面で ↓ ↓ Enter → 2 行目の曲が再生される', kp && kp.key === 'al-10' && kp.index === 1, JSON.stringify(kp));
  await page.keyboard.press('Escape');
  await settled(page);
  check('Esc で表にもどる', !(await state(page)).flipped);

  // ───────── キーボード・ホイール ─────────
  begin('667×375: キーボード・ホイール');
  await page.evaluate(() => window.__cf.show({ focusKey: 'al-20' }));
  await settled(page);
  await page.keyboard.press('ArrowRight');
  await settled(page);
  check('→ で 1 枚進む', (await state(page)).index === 21);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await settled(page);
  check('→ → で 2 枚進む（続けて押しても数が合う）', (await state(page)).index === 23);
  await page.keyboard.press('ArrowLeft');
  await settled(page);
  check('← で 1 枚もどる', (await state(page)).index === 22);
  await page.keyboard.press('Enter');
  await settled(page);
  const hd = await page.evaluate(() => document.querySelector('.cf-panel-title').textContent === window.__demo.albums[22].title);
  check('Enter で裏返す', (await state(page)).flipped && hd);
  await page.keyboard.press('Escape');
  await settled(page);
  check('Esc で戻す', !(await state(page)).flipped && (await state(page)).index === 22);

  // ホイール。ブラウザのふり方によって、送った量と届く量がちがうことがあるので、届いた量を記録して比べる
  await page.evaluate(() => {
    window.__wheel = [];
    document.addEventListener('wheel', (e) => window.__wheel.push({ dx: e.deltaX, dy: e.deltaY, prevented: false, ev: e }), true);
    document.addEventListener('wheel', (e) => { const w = window.__wheel[window.__wheel.length - 1]; if (w && w.ev === e) w.prevented = e.defaultPrevented; });
  });
  const wheelGot = async () => page.evaluate(() => { const w = window.__wheel.splice(0); return { dx: w.reduce((a, q) => a + q.dx, 0), dy: w.reduce((a, q) => a + q.dy, 0), prevented: w.every((q) => q.prevented), n: w.length }; });
  await page.mouse.move(W / 2, cy);
  await page.mouse.wheel(520, 0);                      // トラックパッドの横スクロール
  await page.waitForTimeout(350);
  await settled(page);
  let got = await wheelGot();
  s = await state(page);
  cc = await cover(page, s.index);
  const wantH = 22 + got.dx / 100;
  check('横スクロールで、回した量（100px で 1 枚）だけ流れて、1枚に止まる', got.n > 0 && Math.abs(s.index - wantH) <= 0.5 && s.index > 22 && cc.x === 0, `届いた量 ${got.dx}px → 22 から ${s.index}`);
  check('ホイールでページごと動かない（preventDefault している）', got.prevented);
  let wBefore = s.index;
  await page.mouse.wheel(0, -200);                     // マウスホイール（たて）
  await page.waitForTimeout(350);
  await settled(page);
  got = await wheelGot();
  s = await state(page);
  check('マウスホイール（たて）でも、100px で 1 枚流れる', got.dy < 0 && s.index === Math.round(wBefore + got.dy / 100), `届いた量 ${got.dy}px → ${wBefore} から ${s.index}`);
  wBefore = s.index;
  await page.mouse.wheel(0, 16);                       // 1 目もりが小さいマウス
  await page.waitForTimeout(350);
  await settled(page);
  got = await wheelGot();
  s = await state(page);
  check('少しだけ回しても、回した向きへ 1 枚は進む', got.dy > 0 && got.dy < 30 && s.index === wBefore + 1, `届いた量 ${got.dy}px → ${wBefore} から ${s.index}`);

  // ───────── hide / show / setAlbums ─────────
  begin('667×375: hide・show・setAlbums');
  const beforeHide = (await state(page)).index;
  await page.keyboard.press('ArrowRight');             // 動いているとちゅうで hide する
  await page.keyboard.press('ArrowRight');
  await page.evaluate(() => window.__cf.hide());
  const h0 = await page.evaluate(() => ({
    visible: window.__cf.isVisible(), hidden: document.getElementById('stage').hidden,
    display: getComputedStyle(document.getElementById('stage')).display,
    covers: document.querySelectorAll('.cf-cover').length, imgs: document.querySelectorAll('.cf-root img').length, raf: window.__raf,
  }));
  await page.waitForTimeout(450);
  const h1 = await page.evaluate(() => ({ raf: window.__raf }));
  check('hide() → 見えなくなる（isVisible() も false）', !h0.visible && h0.hidden && h0.display === 'none');
  check('hide() → ジャケットと画像を全部はなす', h0.covers === 0 && h0.imgs === 0, `ジャケット ${h0.covers} / img ${h0.imgs}`);
  check('hide() 後は rAF が止まる', h1.raf === h0.raf, `${h0.raf} → ${h1.raf}`);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  check('hide() 中はキーを受けつけない・rAF も回らない', (await page.evaluate(() => window.__raf)) === h0.raf);

  await page.evaluate(() => window.__cf.show());
  await settled(page);
  s = await state(page);
  check('show() → 前回の位置（流れていた行き先）で出る', s.index === beforeHide + 2 && s.covers > 8 && (await page.evaluate(() => window.__cf.isVisible())), `index=${s.index}`);
  await page.evaluate(() => { window.__cf.hide(); window.__cf.show({ focusKey: 'al-30' }); });
  await settled(page);
  s = await state(page);
  check('show({ focusKey }) → そのアルバムが中央', s.index === 30 && s.key === 'al-30');
  await page.evaluate(() => window.__cf.show({ focusKey: 'そんなアルバムは無い' }));
  await settled(page);
  check('知らない focusKey なら、位置はそのまま', (await state(page)).index === 30);

  // 並べなおし
  const callsBefore = await page.evaluate(() => window.__demo.artCalls());
  await page.evaluate(() => window.__cf.setAlbums(window.__demo.albums.slice().reverse()));
  await settled(page);
  s = await state(page);
  const kept = await page.evaluate(() => {
    const cv = [...document.querySelectorAll('.cf-cover')].find((q) => q._cf.index === 9);
    return { hasArt: cv.classList.contains('cf-has-art'), calls: window.__demo.artCalls() };
  });
  check('setAlbums（逆順）→ 中央のアルバムはそのまま中央', s.key === 'al-30' && s.index === 9, `index=${s.index} key=${s.key}`);
  check('並べなおしても、同じアルバムの絵は取りなおさない', kept.hasArt && kept.calls === callsBefore, `getArtUrl ${callsBefore} → ${kept.calls}`);
  await page.evaluate(() => window.__cf.setAlbums([]));
  await page.waitForTimeout(120);
  const em = await page.evaluate(() => ({
    covers: document.querySelectorAll('.cf-cover').length,
    msg: getComputedStyle(document.querySelector('.cf-empty-msg')).display, text: document.querySelector('.cf-empty-msg').textContent,
    info: getComputedStyle(document.querySelector('.cf-info')).display,
  }));
  check('アルバムが 0 枚 → やさしい文言を出す', em.covers === 0 && em.msg === 'flex' && em.text.length > 0 && em.info === 'none', em.text);
  await shot(page, '13-667x375-empty.png');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.mouse.click(W / 2, cy);
  await page.waitForTimeout(100);
  check('0 枚のときに操作しても、何も起きない', !(await state(page)).flipped);
  await page.evaluate(() => { window.__cf.setAlbums(window.__demo.albums); window.__cf.show({ focusKey: 'al-12' }); });
  await settled(page);
  s = await state(page);
  check('また並べると、ふつうに出る', s.index === 12 && s.covers >= 9);

  // 裏返して曲を見ているときに並べなおす: そのアルバムが残っていれば、開いたまま
  await page.evaluate(() => window.__cf.show({ focusKey: 'al-10' }));
  await page.keyboard.press('Enter');
  await settled(page);
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(200);
  const scrollBefore = await page.evaluate(() => document.querySelector('.cf-tracks').scrollTop);
  await page.evaluate(() => window.__cf.setAlbums(window.__demo.albums.slice().reverse()));
  await settled(page);
  s = await state(page);
  const keptOpen = await page.evaluate(() => ({
    title: document.querySelector('.cf-panel-title').textContent === window.__demo.albums[10].title,
    rows: document.querySelectorAll('.cf-row').length,
    scroll: document.querySelector('.cf-tracks').scrollTop,
    vis: getComputedStyle(document.querySelector('.cf-panel')).visibility,
    frontHidden: [...document.querySelectorAll('.cf-cover')].filter((cv) => getComputedStyle(cv).visibility === 'hidden').map((cv) => cv._cf.index).join(),
  }));
  check('裏返したまま setAlbums → そのアルバムが残っていれば、一覧は開いたまま（スクロールの位置も同じ）',
    s.flipped && s.key === 'al-10' && s.index === 29 && keptOpen.title && keptOpen.rows === 60 && keptOpen.vis === 'visible' && keptOpen.scroll === scrollBefore && scrollBefore > 0 && keptOpen.frontHidden === '29',
    `index=${s.index} スクロール ${scrollBefore} → ${keptOpen.scroll} かくれている表=${keptOpen.frontHidden}`);
  await page.keyboard.press('Escape');
  await settled(page);
  s = await state(page);
  check('そのあと Esc でふつうに戻れる', !s.flipped && (await cover(page, 29)).visible && (await cover(page, 29)).rot === 0);

  // 裏返しのとちゅうで、そのアルバムが無くなる並べなおし → 表にもどって正しく並ぶ
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__cf.setAlbums(window.__demo.albums.slice(20)));
  await settled(page);
  s = await state(page);
  const okAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.cf-panel')).visibility === 'hidden'
    && document.querySelectorAll('.cf-row').length === 0
    && [...document.querySelectorAll('.cf-cover')].every((cv) => getComputedStyle(cv).visibility === 'visible' && !/scale/.test(cv.style.transform)));
  check('裏返しのとちゅうで、そのアルバムが消える setAlbums → 表にもどって正しく並ぶ', !s.flipped && okAfter && s.index >= 0 && s.index < 20, `index=${s.index} key=${s.key}`);
  await page.evaluate(() => { window.__cf.setAlbums(window.__demo.albums); window.__cf.show({ focusKey: 'al-12' }); });
  await settled(page);

  // ───────── 画面の大きさが変わる ─────────
  begin('画面の大きさ');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);
  await settled(page);
  s = await state(page);
  cc = await cover(page, s.index);
  check('844×390 に変えると並べなおす（一辺は高さの 55%・まん中）', near(s.size, 390 * SIZE_RATIO, 1.5) && near((cc.left + cc.right) / 2, 422, 0.6) && s.index === 12, `一辺 ${s.size}px`);
  const L = await cover(page, s.index - 3), R = await cover(page, s.index + 3);
  check('844×390 でも左右対称', near(L.left + R.right, 844, 1) && near(L.top, R.top, 0.6));
  await page.waitForTimeout(250);
  await shot(page, '14-844x390-center.png');
  await page.keyboard.press('Enter');
  await settled(page);
  const p2 = await page.evaluate(() => { const r = document.querySelector('.cf-panel').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
  check('844×390 の裏面も、まん中で画面の中', near((p2.l + p2.r) / 2, 422, 1) && p2.t >= 0 && p2.b <= 390, JSON.stringify(p2));
  await shot(page, '15-844x390-back.png');
  // 裏返ったまま回転（大きさが変わる）しても、一覧が画面の中にある
  await page.setViewportSize({ width: 568, height: 320 });
  await page.waitForTimeout(300);
  const p3 = await page.evaluate(() => { const r = document.querySelector('.cf-panel').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
  check('裏返ったまま 568×320 になっても、一覧は画面の中', (await state(page)).flipped && near((p3.l + p3.r) / 2, 284, 1) && p3.t >= 0 && p3.b <= 320, JSON.stringify(p3));
  await shot(page, '16-568x320-back.png');
  await page.keyboard.press('Escape');
  await settled(page);
  await page.waitForTimeout(200);
  s = await state(page);
  check('568×320: 一辺は高さの 55%', near(s.size, 320 * SIZE_RATIO, 1.5), `${s.size}px`);
  await shot(page, '17-568x320-center.png');
  await page.setViewportSize({ width: 932, height: 430 });
  await page.waitForTimeout(450);
  s = await state(page);
  const edge = await cover(page, s.indexes[s.indexes.length - 1]);
  check('932×430: ジャケットが画面の右はしまで届いている', near(s.size, 430 * SIZE_RATIO, 1.5) && edge.left > 932 - 60 && s.covers <= MAX_COVERS, `一辺 ${s.size}px / ${s.covers} 枚 / いちばん右の左はし ${edge.left.toFixed(0)}px`);
  await shot(page, '18-932x430-center.png');
  // たて向き（主ではないが、こわれないこと）
  await page.setViewportSize({ width: 390, height: 700 });
  await page.waitForTimeout(450);
  s = await state(page);
  cc = await cover(page, s.index);
  check('たて向き 390×700 でも、中央のジャケットが画面におさまる', cc.left >= 0 && cc.right <= 390 && cc.bottom < 700, `一辺 ${s.size}px`);
  await shot(page, '19-390x700-portrait.png');

  // destroy
  await page.setViewportSize({ width: 667, height: 375 });
  await page.waitForTimeout(200);
  const rafD0 = await page.evaluate(() => { window.__cf.destroy(); return window.__raf; });
  await page.waitForTimeout(300);
  const dd = await page.evaluate(() => ({ root: document.querySelectorAll('.cf-root').length, raf: window.__raf, vis: window.__cf.isVisible() }));
  await page.keyboard.press('ArrowRight');
  check('destroy() → 部品が消えて、rAF もキーも止まる', dd.root === 0 && dd.raf === rafD0 && !dd.vis);

  check('ページにエラーが出ていない', errors.length === 0, errors.join(' | '));
  await ctx.close();
  return { flingDelta };
}

async function flowThousand(browser, base) {
  begin('アルバム 1000 枚');
  const { ctx, page, errors } = await openDemo(browser, base, { width: 844, height: 390, query: '?n=1000&focus=500' });
  let s = await state(page);
  const W = s.W, S = s.size, cy = s.top + S / 2;
  check('1000 枚でも DOM のジャケットは 20 前後', s.index === 500 && s.covers >= 9 && s.covers <= MAX_COVERS, `${s.covers} 枚 / img ${s.imgs} 個`);

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const metric = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    const get = (n) => (metrics.find((m) => m.name === n) || {}).value || 0;
    return { layouts: get('LayoutCount'), styles: get('RecalcStyleCount'), raf: await page.evaluate(() => window.__raf) };
  };

  // 流れているあいだ、DOM の枚数をずっと見張る
  await page.evaluate(() => {
    window.__maxCovers = 0;
    window.__watch = setInterval(() => { window.__maxCovers = Math.max(window.__maxCovers, document.querySelectorAll('.cf-cover').length); }, 10);
  });
  const m0 = await metric();
  const t0 = Date.now();
  for (let i = 0; i < 4; i++) {                          // 続けて 4 回、強くはじく
    await dragBy(page, W / 2 + 160, cy, -320, { steps: 5, stepWait: 14 });
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(100);
  await shot(page, '20-844x390-1000-flinging.png');
  await settled(page, 10000);
  const m1 = await metric();
  const took = Date.now() - t0;
  s = await state(page);
  const maxCovers = await page.evaluate(() => { clearInterval(window.__watch); return window.__maxCovers; });
  const cc = await cover(page, s.index);
  const frames = m1.raf - m0.raf;
  check('続けて強くはじくと、何十枚も流れる', s.index - 500 >= 30, `500 → ${s.index}`);
  check('流れているあいだも DOM のジャケットは 20 前後のまま', maxCovers <= MAX_COVERS && s.covers <= MAX_COVERS, `いちばん多いとき ${maxCovers} 枚`);
  check('止まったら 1 枚にぴたり', cc.x === 0 && cc.rot === 0);
  check('毎コマはレイアウトを起こしていない（動きは transform だけ）', m1.layouts - m0.layouts < frames * 0.6, `${frames} コマ（${took}ms）のあいだにレイアウト ${m1.layouts - m0.layouts} 回・スタイル計算 ${m1.styles - m0.styles} 回`);

  await page.waitForTimeout(300);
  const loaded = await page.evaluate(() => {
    const cs = [...document.querySelectorAll('.cf-cover')];
    return { loaded: cs.filter((cv) => cv.classList.contains('cf-has-art')).length, noArt: cs.filter((cv) => cv._cf.index % 7 === 3).length, total: cs.length, calls: window.__demo.artCalls() };
  });
  check('止まったあと、見えているジャケットの画像がそろう', loaded.loaded === loaded.total - loaded.noArt, `${loaded.loaded}/${loaded.total}`);
  check('速く流れているあいだは、通りすぎるだけのジャケットの画像を取りに行かない', loaded.calls < (s.index - 500) + 30, `${s.index - 500} 枚流れて getArtUrl は ${loaded.calls} 回`);
  await shot(page, '21-844x390-1000-settled.png');

  await page.keyboard.press('End');
  await settled(page, 10000);
  s = await state(page);
  check('End で 1000 枚目まで行ける', s.index === 999 && s.covers <= MAX_COVERS, `index=${s.index} / ${s.covers} 枚`);
  await page.keyboard.press('Home');
  await settled(page, 10000);
  s = await state(page);
  check('Home で先頭にもどれる', s.index === 0 && s.covers <= MAX_COVERS);

  await page.evaluate(() => window.__cf.hide());
  const r0 = await page.evaluate(() => ({ raf: window.__raf, covers: document.querySelectorAll('.cf-cover').length }));
  await page.waitForTimeout(400);
  check('1000 枚でも hide() 後は rAF が止まり、ジャケットは 0 枚', (await page.evaluate(() => window.__raf)) === r0.raf && r0.covers === 0);
  check('ページにエラーが出ていない', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function flowTouch(browser, base) {
  begin('タッチ操作（スマホのふり）');
  const { ctx, page, errors } = await openDemo(browser, base, {
    width: 667, height: 375, context: { hasTouch: true, isMobile: true },
  });
  let s = await state(page);
  const W = s.W, H = s.H, S = s.size, cy = s.top + S / 2;
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: Math.round(x), y: Math.round(y), id: 1 }] });

  const ta = await page.evaluate(() => ({
    root: getComputedStyle(document.querySelector('.cf-root')).touchAction,
    flow: getComputedStyle(document.querySelector('.cf-flow')).touchAction,
    list: getComputedStyle(document.querySelector('.cf-tracks')).touchAction,
  }));
  check('touch-action: ジャケットのところは none、曲の一覧は pan-y', ta.root === 'none' && ta.flow === 'none' && ta.list === 'pan-y', JSON.stringify(ta));

  // 指で左へはじく
  await touch('touchStart', W / 2 + 120, cy);
  for (let i = 1; i <= 6; i++) { await touch('touchMove', W / 2 + 120 - i * 35, cy + i * 2); await sleep(16); }
  await touch('touchEnd');
  await settled(page);
  s = await state(page);
  const cc = await cover(page, s.index);
  check('指ではじくと流れて、1枚に止まる', s.index - 12 >= 4 && cc.x === 0, `12 → ${s.index}`);
  const vp = await page.evaluate(() => ({ sx: window.scrollX, sy: window.scrollY, scale: window.visualViewport ? window.visualViewport.scale : 1 }));
  check('ページはスクロールも拡大もしていない', vp.sx === 0 && vp.sy === 0 && vp.scale === 1, JSON.stringify(vp));

  // 指でタップ: 横 → 中央へ、中央 → 裏返す、曲 → 再生、外 → 戻る
  const idx = s.index;
  const n1 = await cover(page, idx + 1), n2 = await cover(page, idx + 2);
  await page.touchscreen.tap((n1.right + n2.right) / 2, cy);
  await settled(page);
  check('指で横のジャケットをタップ → 中央へ', (await state(page)).index === idx + 2);
  await page.touchscreen.tap(W / 2, cy);
  await settled(page);
  check('指で中央をタップ → 裏返る（すぐ閉じたりしない）', (await state(page)).flipped);
  await page.waitForTimeout(200);
  check('裏返ったまま開いている', (await state(page)).flipped);
  const row = await page.evaluate(() => { const r = document.querySelector('.cf-track[data-cf-i="1"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.touchscreen.tap(row.x, row.y);
  await page.waitForTimeout(80);
  const plays = await page.evaluate(() => window.__demo.state.plays);
  check('指で曲をタップ → onPlayTrack', plays.length === 1 && plays[0].index === 1 && plays[0].key === `al-${idx + 2}`, JSON.stringify(plays));
  await shot(page, '22-667x375-touch-back.png');
  await page.touchscreen.tap(20, H - 30);
  await settled(page);
  check('指で外をタップ → 表にもどる', !(await state(page)).flipped);
  check('ページにエラーが出ていない', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function flowReduced(browser, base, normalFlingDelta) {
  begin('動きを減らす設定（prefers-reduced-motion）');
  const { ctx, page, errors } = await openDemo(browser, base, { width: 667, height: 375, context: { reducedMotion: 'reduce' } });
  let s = await state(page);
  const W = s.W, S = s.size, cy = s.top + S / 2;
  await page.evaluate(() => {
    window.__rot = 0;
    const t0 = performance.now();
    const read = () => {
      const p = document.querySelector('.cf-panel');
      if (/rotateY\((?!0(\.0+)?deg)/.test(p.style.transform)) window.__rot++;
      const cv = document.querySelector('.cf-cover.cf-center');
      if (cv && /rotateY\((?!-?0(\.0+)?deg)/.test(cv.style.transform)) window.__rot++;
      if (performance.now() - t0 < 700) setTimeout(read, 8);
    };
    read();
  });
  const t0 = Date.now();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.cf-root').getAttribute('data-cf-moving') === '0' && document.querySelector('.cf-root').getAttribute('data-cf-flipped') === '1');
  const ms = Date.now() - t0;
  const rot = await page.evaluate(() => window.__rot);
  check('裏返しは短く（0.3 秒以内）、回さずにふわっと出す', ms < 320 && rot === 0, `${ms}ms / 回転のコマ ${rot}`);
  const vis = await page.evaluate(() => getComputedStyle(document.querySelector('.cf-panel')).visibility);
  check('曲の一覧は出ている', vis === 'visible');
  await shot(page, '23-667x375-reduced-back.png');
  await page.keyboard.press('Escape');
  await settled(page);
  check('Esc で戻る', !(await state(page)).flipped);

  const from = (await state(page)).index;
  await dragBy(page, W / 2 + 100, cy, -200, { steps: 5, stepWait: 16 });
  await settled(page);
  s = await state(page);
  const delta = s.index - from;
  const cc = await cover(page, s.index);
  check('慣性はひかえめ（ふつうのときより流れる枚数が少ない）', delta >= 2 && delta < normalFlingDelta && cc.x === 0, `ふつう ${normalFlingDelta} 枚 → ひかえめ ${delta} 枚`);
  check('ページにエラーが出ていない', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function flowCopyReflection(browser, base) {
  begin('映りこみの別の作り方（-webkit-box-reflect が無いブラウザ用）');
  const { ctx, page, errors } = await openDemo(browser, base, { width: 667, height: 375, query: '?reflect=copy' });
  const s = await state(page);
  const info = await page.evaluate(() => {
    const cs = [...document.querySelectorAll('.cf-cover')];
    const center = cs.find((cv) => cv._cf.index === 12);
    const refl = center.querySelector('.cf-refl');
    return {
      all: cs.every((cv) => cv.querySelector('.cf-refl img')),
      native: getComputedStyle(center.querySelector(':scope > .cf-face')).webkitBoxReflect,
      flip: refl ? getComputedStyle(refl).transform : '',
      mask: refl ? (getComputedStyle(refl).webkitMaskImage || getComputedStyle(refl).maskImage) : '',
      src: refl ? refl.querySelector('img').getAttribute('src') === center.querySelector(':scope > .cf-face img').getAttribute('src') : false,
    };
  });
  check('上下反転した複製 + だんだん消えるマスクで作っている', info.all && info.native === 'none' && info.flip.includes('-1') && info.mask.includes('gradient') && info.src, `transform=${info.flip}`);
  const c = await cover(page, 12);
  const file = await shot(page, '24-667x375-copy-reflection.png');
  const png = decodePng(fs.readFileSync(file));
  const d = 2, S = s.size;
  const face = png.brightness((c.left + 8) * d, (c.bottom - 30) * d, (c.left + S * 0.22) * d, (c.bottom - 4) * d);
  const refl = png.brightness((c.left + 8) * d, (c.bottom + 3) * d, (c.left + S * 0.22) * d, (c.bottom + 24) * d);
  const far = png.brightness((c.left + 8) * d, (c.bottom + S * 0.5) * d, (c.left + S * 0.22) * d, (c.bottom + S * 0.56) * d);
  check('この作り方でも、映りこみが見えて下へ消える', refl > 6 && refl < face * 0.7 && far < refl * 0.35, `ジャケット ${face.toFixed(1)} → 映りこみ ${refl.toFixed(1)} → 遠く ${far.toFixed(1)}`);
  // ふつうの作り方の写真と、同じ場所の明るさがほぼ同じ
  const ref = path.join(SHOTS, '01-667x375-center.png');
  if (fs.existsSync(ref)) {
    const a = decodePng(fs.readFileSync(ref));
    const ra = a.brightness((c.left + 8) * d, (c.bottom + 3) * d, (c.left + S * 0.22) * d, (c.bottom + 24) * d);
    check('ふつうの作り方（box-reflect）と見た目がそろっている', Math.abs(ra - refl) < 4, `box-reflect ${ra.toFixed(1)} / 複製 ${refl.toFixed(1)}`);
  }
  await page.mouse.click(c.left + S / 2, c.top + S / 2);
  await settled(page);
  check('この作り方でも裏返せる', (await state(page)).flipped);
  check('ページにエラーが出ていない', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function flowNoCss(browser, base) {
  begin('スタイルシートを読み忘れたページ');
  const ctx = await browser.newContext({ viewport: { width: 667, height: 375 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 見本ページから <link> を抜いたものを返す
  await page.route('**/tests/coverflow-demo.html*', async (route) => {
    const html = fs.readFileSync(path.join(ROOT, 'tests', 'coverflow-demo.html'), 'utf8').replace(/<link rel="stylesheet"[^>]*>/, '');
    await route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
  });
  await page.goto(`${base}/tests/coverflow-demo.html`);
  await page.waitForSelector('.cf-root');
  await page.waitForTimeout(600);
  const s = await state(page);
  const c = await cover(page, 12);
  const linked = await page.evaluate(() => !!document.querySelector('link[data-cf-css]'));
  check('部品が自分で css/coverflow.css を読みこんで、正しく並ぶ', linked && c && near(c.width, s.size, 1) && near((c.left + c.right) / 2, 333.5, 0.6), c ? `幅 ${c.width.toFixed(1)}` : 'ジャケットが無い');
  check('ページにエラーが出ていない', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ───────── 実行 ─────────
const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
let crashed = null;
try {
  const { flingDelta } = await flowMain(browser, base);
  await flowThousand(browser, base);
  await flowTouch(browser, base);
  await flowReduced(browser, base, flingDelta);
  await flowCopyReflection(browser, base);
  await flowNoCss(browser, base);
} catch (err) {
  crashed = err;
} finally {
  await browser.close();
  server.close();
}

const bad = results.filter((r) => !r.ok);
console.log('\n────────────────────────────────');
console.log(`確かめた数: ${results.length} / だめだった数: ${bad.length}`);
console.log(`写真の置き場所: ${SHOTS}`);
if (bad.length) {
  console.log('\nだめだったもの:');
  for (const r of bad) console.log(`  - [${r.section}] ${r.name}${r.detail ? `  … ${r.detail}` : ''}`);
}
if (crashed) {
  console.error('\nとちゅうで止まりました:');
  console.error(crashed);
}
process.exit(bad.length || crashed ? 1 : 0);
