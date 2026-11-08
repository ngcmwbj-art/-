// ステップ4：プレビュー生成。ゲームを Playwright で起動し、時計を止めて1コマずつ進めながら撮る。
//  - 時刻は固定（page.clock）、Math.random はシード固定 → 同じ手順なら毎回同じ映像になる
//  - 入力は recipes/<id>.mjs に書く（ゲーム本体は一切書き換えない）
//  - 録れないゲーム（手順書が mode:'still' か、録画が失敗）は静止画＋パララックスで代替
// 使い方：node scripts/capture.mjs [id ...] [--verify]   --verify は2回撮って同じ映像になるか確かめる
import { mkdirSync, rmSync, readdirSync, statSync, writeFileSync, existsSync, readFileSync, copyFileSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PORTAL, WORK, PREVIEWS, loadGames, pickGames, serveStatic, loadPlaywright, gameLocalPath, git, log } from './lib.mjs';

const OUT_W = 640, OUT_H = 400;               // カードの動画の大きさ（16:10）
const MAX_BYTES = 1024 * 1024;                 // 1本 1MB まで
const FIXED_TIME = new Date('2026-11-01T10:00:00+09:00'); // 録画の中の「今」
const VERIFY = process.argv.includes('--verify');
const { chromium } = loadPlaywright();

// ── CDN の代わり：jsdelivr / unpkg の npm パッケージを npm レジストリから取って手元で返す ──
const CDN_DIR = path.join(WORK, '_cdn');
function cdnFile(url) {
  const m = /^https:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com)\/((?:@[^/]+\/)?[^@/]+)@([^/]+)\/(.*)$/.exec(url);
  if (!m) return null;
  const [, name, ver, rest] = m;
  const dir = path.join(CDN_DIR, `${name.replace('/', '__')}@${ver}`);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    const tgz = execFileSync('npm', ['pack', `${name}@${ver}`, '--silent', '--pack-destination', dir], { encoding: 'utf8' }).trim().split('\n').pop();
    execSync(`tar -xzf "${tgz}" --strip-components=1 && rm "${tgz}"`, { cwd: dir });
  }
  const f = path.join(dir, rest.split('?')[0]);
  return existsSync(f) ? f : null;
}

// raf:'frame' のときは requestAnimationFrame を「1コマに1回だけ描く」ものに差し替える（重い 3D で描画が積み上がらないように）
const RAF_SCRIPT = `(() => {
  let q = [], id = 0;
  window.requestAnimationFrame = (cb) => { q.push([++id, cb]); return id; };
  window.cancelAnimationFrame = (i) => { q = q.filter((x) => x[0] !== i); };
  window.__portalFrame = () => { const run = q; q = []; const t = performance.now(); for (const [, cb] of run) { try { cb(t); } catch (e) { setTimeout(() => { throw e; }); } } };
})();`;

const SEED_SCRIPT = (seed) => `(() => {
  let a = ${seed >>> 0};
  window.__portalReseed = (s) => { a = s >>> 0; };
  Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  // CSS のアニメーション・トランジションは偽の時計では止まらないので、見つけしだい止めて、コマごとに同じだけ進める
  window.__portalStepAnimations = (ms) => {
    for (const a of document.getAnimations()) {
      if (a.playState === 'finished' || a.playState === 'idle') continue;
      // はじめて見つけたものは止めて 0 から（見つかるまでの実時間の進みを捨てる＝毎回同じ位置から）
      if (!a.__portal) { a.__portal = true; a.pause(); a.currentTime = 0; continue; }
      const end = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming().endTime : Infinity;
      const next = (Number(a.currentTime) || 0) + ms;
      if (Number.isFinite(end) && next >= end) a.finish(); else a.currentTime = next;
    }
  };
})();`;

const sha = (buf) => createHash('sha1').update(buf).digest('hex');
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

/** 1回分の録画。frames/ にPNGを並べ、stills/ に静止画を置く */
async function record(browser, base, g, recipe, workDir) {
  const fps = recipe.fps ?? 12.5; // 1コマ80ms＝描画周期16msのちょうど5倍（割り切れないとコマごとに時刻がずれる）
  const frameMs = 1000 / fps;
  const vp = recipe.viewport ?? { width: 960, height: 600 };
  const ctx = await browser.newContext({
    viewport: vp, deviceScaleFactor: recipe.scale ?? 1, hasTouch: !!recipe.mobile, isMobile: !!recipe.mobile,
    locale: 'ja-JP', timezoneId: 'Asia/Tokyo', reducedMotion: 'no-preference', serviceWorkers: 'block',
  });
  const block = [/script\.google\.com/, /google-analytics|googletagmanager/, ...(recipe.block || [])];
  await ctx.route('**/*', async (route) => {
    const url = route.request().url();
    if (block.some((re) => re.test(url))) return route.abort();
    if (/^https:\/\/(cdn\.jsdelivr\.net\/npm|unpkg\.com)\//.test(url)) {
      const f = cdnFile(url);
      return f ? route.fulfill({ path: f }) : route.abort();
    }
    return route.continue();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // install だけでは時計は実時間で進み続ける。pauseAt で止めて、以後は runFor でだけ進める
  await page.clock.install({ time: FIXED_TIME });
  await page.clock.pauseAt(new Date(FIXED_TIME.getTime() + 1000));
  // 時計の差し替えより後に登録する（rAF の差し替えを時計側に上書きされないように）
  await ctx.addInitScript(SEED_SCRIPT(recipe.seed ?? 20261101));
  if (recipe.raf === 'frame') await ctx.addInitScript(RAF_SCRIPT);
  // pointerLock:'emulate'：クリックでマウスを固定して視点を回すゲーム用。本物の固定は許可される時刻が実時間で決まり毎回ずれるので、
  // 撮影用ブラウザの中で「すぐ固定された」ことにする（固定中のクリックで攻撃する作りでも動く）。'off' は固定させない
  if (recipe.pointerLock === 'emulate') await ctx.addInitScript(`(() => {
    let locked = null;
    const fire = () => queueMicrotask(() => document.dispatchEvent(new Event('pointerlockchange')));
    Object.defineProperty(Document.prototype, 'pointerLockElement', { configurable: true, get() { return locked; } });
    Element.prototype.requestPointerLock = function () { locked = this; fire(); return Promise.resolve(); };
    Document.prototype.exitPointerLock = function () { locked = null; fire(); };
  })();`);
  else if (recipe.pointerLock === 'off') await ctx.addInitScript(`Element.prototype.requestPointerLock = function () { return Promise.reject(new Error('撮影中はポインターロックしない')); };`);

  const framesDir = path.join(workDir, 'frames'), stillsDir = path.join(workDir, 'stills');
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true }); mkdirSync(stillsDir, { recursive: true });
  let n = 0;
  let sinceRender = 0;
  const stepAnims = async (ms, recording = false) => {
    // raf:'frame'：録画中は毎コマ描く。待ち時間中は 300ms に1回だけ描く（ソフトウェア描画が積み上がって止まらないように）
    sinceRender += ms;
    if (recipe.raf === 'frame' && (recording || sinceRender >= 300)) { sinceRender = 0; await page.evaluate(() => window.__portalFrame?.()).catch(() => {}); }
    if (recipe.cssAnimations !== 'real') await page.evaluate((m) => window.__portalStepAnimations?.(m), ms).catch(() => {});
  };
  const realWait = (ms) => new Promise((r) => setTimeout(r, ms));
  const h = {
    page, fps, vp,
    /** 録画せずに時間を進める（ゲーム内の時間） */
    advance: async (ms) => { await page.clock.runFor(Math.round(ms)); await stepAnims(ms); },
    /** 読み込み待ち：ゲーム内の時間と実時間の両方を少しずつ進める */
    settle: async (ms = 1000) => { for (let t = 0; t < ms; t += 100) { await page.clock.runFor(100); await stepAnims(100); await realWait(30); } },
    /** 条件が満たされるまで settle（最大 timeout ms） */
    until: async (fn, timeout = 15000, arg) => {
      for (let t = 0; t < timeout; t += 100) { if (await page.evaluate(fn, arg).catch(() => false)) return true; await page.clock.runFor(100); await stepAnims(100); await realWait(40); }
      throw new Error(`待ち条件が満たされませんでした：${fn.toString().slice(0, 80)}`);
    },
    /** 録画：n コマ進めて1コマずつ撮る。each(i) を毎コマの前に呼べる */
    frames: async (count, each) => {
      if (!ready) await h.ready();
      for (let i = 0; i < count; i++) {
        if (each) await each(i);
        await page.clock.runFor(frameMs);
        await stepAnims(frameMs, true);
        await page.screenshot({ path: path.join(framesDir, `${String(n++).padStart(5, '0')}.png`), animations: 'allow', clip: h.clip || undefined, timeout: 180000 });
      }
    },
    /** 静止画（タイトル画面など）。最初に撮ったものがポスターになる */
    still: async (name) => { await page.screenshot({ path: path.join(stillsDir, `${name}.png`), clip: h.clip || undefined, timeout: 180000 }); },
    /** 撮る範囲を絞る（{x,y,width,height}。null で全体） */
    clip: null,
    click: async (target) => {
      const loc = typeof target === 'string' && !/^[#.\[]|^[a-z]+[\[#.:]/i.test(target) ? page.getByText(target, { exact: false }).first() : page.locator(target).first();
      await loc.click({ timeout: 10000 });
    },
    tap: async (x, y) => { if (recipe.mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); },
    key: async (k) => page.keyboard.press(k),
    down: async (k) => page.keyboard.down(k),
    up: async (k) => page.keyboard.up(k),
    /** マウスで a→b へドラッグ（steps コマかけて動かし、その様子も録る） */
    drag: async (a, b, steps = 8, record = true) => {
      await page.mouse.move(a[0], a[1]); await page.mouse.down();
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps);
        if (record) await h.frames(1); else await h.advance(frameMs);
      }
      await page.mouse.up();
    },
    eval: (fn, arg) => page.evaluate(fn, arg),
    /** 準備完了の合図：ここから先を毎回同じにする。乱数を最初の値に戻し、ゲーム内時刻を次の1秒ちょうどに揃える */
    ready: async () => {
      const now = await page.evaluate(() => Date.now());
      if (recipe.readyAt) {
        // 開いてから readyAt ms ちょうどのゲーム内時刻に揃える（読み込みの速さで経過時間が変わらないように）
        const target = FIXED_TIME.getTime() + 1000 + recipe.readyAt;
        if (now > target) throw new Error(`readyAt（${recipe.readyAt}ms）より読み込みに時間がかかりました。readyAt を大きくしてください`);
        await page.clock.runFor(target - now);
      } else await page.clock.runFor(1000 - (now % 1000));
      await page.evaluate((s) => window.__portalReseed?.(s), recipe.seed ?? 20261101);
      ready = true;
    },
  };
  let ready = false;
  try {
    await page.goto(base + gameLocalPath(g), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await h.settle(recipe.loadMs ?? 1500);
    await recipe.run(h);
  } catch (e) {
    // 失敗したときの画面を残す（原因調べ用。ポスターには使わない）
    await page.screenshot({ path: path.join(workDir, 'error.png') }).catch(() => {});
    e.pageErrors = errors;
    throw e;
  } finally {
    await ctx.close();
  }
  return { frames: n, fps, errors, framesDir, stillsDir };
}

/** 撮ったコマを動画にする。容量が大きければ画質を下げて作り直す */
function encode(id, rec, recipe, theme) {
  const fit = recipe.fit ?? 'cover';
  const vf = fit === 'contain'
    // 縦長の画面など：ぼかした拡大を背景に敷き、中央に全体を収める
    ? `split[a][b];[a]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,crop=${OUT_W}:${OUT_H},boxblur=18:2,eq=brightness=-0.12[bg];[b]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p`
    : `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,crop=${OUT_W}:${OUT_H},format=yuv420p`;
  const input = ['-framerate', String(rec.fps), '-i', path.join(rec.framesDir, '%05d.png')];
  const webm = path.join(PREVIEWS, `${id}.webm`), mp4 = path.join(PREVIEWS, `${id}.mp4`);
  for (const crf of [36, 42, 48, 54]) {
    ff([...input, '-vf', vf, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-an', webm]);
    if (statSync(webm).size <= MAX_BYTES * 0.8) break;
  }
  for (const crf of [28, 32, 36, 40]) {
    ff([...input, '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4]);
    if (statSync(mp4).size <= MAX_BYTES * 0.8) break;
  }
  return { webm: statSync(webm).size, mp4: statSync(mp4).size };
}

/** ポスター（最初の静止画、無ければ最初のコマ） */
function poster(id, rec, recipe) {
  const stills = readdirSync(rec.stillsDir).sort();
  const src = stills.length ? path.join(rec.stillsDir, stills[0]) : path.join(rec.framesDir, '00000.png');
  const out = path.join(PREVIEWS, `${id}.jpg`);
  const vf = (recipe.fit ?? 'cover') === 'contain'
    ? `split[a][b];[a]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,crop=${OUT_W}:${OUT_H},boxblur=18:2,eq=brightness=-0.12[bg];[b]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`
    : `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=increase,crop=${OUT_W}:${OUT_H}`;
  ff(['-i', src, '-vf', vf, '-q:v', '5', out]);
  return statSync(out).size;
}

/** 代替：静止画2枚までをゆっくりズーム・横移動させ、切り替える（パララックス風） */
function parallax(id, rec, recipe) {
  let stills = readdirSync(rec.stillsDir).sort().map((f) => path.join(rec.stillsDir, f));
  if (!stills.length && existsSync(path.join(rec.framesDir, '00000.png'))) stills = [path.join(rec.framesDir, '00000.png')];
  if (!stills.length) throw new Error('静止画が1枚も撮れていません');
  stills = stills.slice(0, 2);
  const fps = 15, seg = 3.2, frames = Math.round(fps * seg);
  const dir = path.join(path.dirname(rec.framesDir), 'parallax');
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  stills.forEach((s, i) => {
    const dirx = i % 2 ? '-1' : '1';
    ff(['-loop', '1', '-i', s, '-vf',
      `scale=${OUT_W * 2}:${OUT_H * 2}:force_original_aspect_ratio=increase,crop=${OUT_W * 2}:${OUT_H * 2},zoompan=z='1.04+0.10*on/${frames}':x='iw/2-(iw/zoom/2)+${dirx}*on*0.9':y='ih/2-(ih/zoom/2)':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${fps}`,
      '-frames:v', String(frames), path.join(dir, `seg${i}.mp4`)]);
  });
  const seg0 = path.join(dir, 'seg0.mp4');
  let joined = seg0;
  if (stills.length > 1) {
    joined = path.join(dir, 'joined.mp4');
    ff(['-i', seg0, '-i', path.join(dir, 'seg1.mp4'), '-filter_complex', `xfade=transition=fade:duration=0.6:offset=${seg - 0.6}`, joined]);
  }
  const outFrames = path.join(dir, 'frames'); mkdirSync(outFrames);
  ff(['-i', joined, path.join(outFrames, '%05d.png')]);
  return { ...rec, framesDir: outFrames, fps };
}

/** 2回分のコマを1枚ずつ比べた PSNR（同一なら Infinity） */
function framePsnr(dirA, dirB) {
  const stats = path.join(path.dirname(dirA), '..', 'psnr.log');
  ff(['-framerate', '10', '-i', path.join(dirA, '%05d.png'), '-framerate', '10', '-i', path.join(dirB, '%05d.png'), '-lavfi', `psnr=stats_file=${stats}`, '-f', 'null', '-']);
  return readFileSync(stats, 'utf8').trim().split('\n').map((l) => { const v = /psnr_avg:(\S+)/.exec(l)?.[1]; return v === 'inf' ? Infinity : +v; });
}

function framesHash(dir) {
  return readdirSync(dir).sort().map((f) => sha(readFileSync(path.join(dir, f))));
}

// ── 本体 ──
const { games } = loadGames();
const targets = pickGames(games);
mkdirSync(PREVIEWS, { recursive: true });
// 記録はゲームごとの previews/<id>.json（別々に並行して撮っても壊れない）
const manifest = {};
const { url: base, close } = await serveStatic(WORK);
// 2D のゲームは素のブラウザ（速い）、WebGL のゲーム（手順書で webgl:true）だけソフトウェア描画のブラウザを使う
const browsers = {};
const getBrowser = async (webgl) => browsers[webgl] ??= await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', ...(webgl ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [])],
});
let failed = 0;
for (const g of targets) {
  const t0 = Date.now();
  const recipe = (await import(pathToFileURL(path.join(PORTAL, g.preview.recipe)).href + `?t=${t0}`)).default;
  const workDir = path.join(WORK, '_capture', g.id);
  let rec, mode = recipe.mode ?? 'play', note = '';
  try {
    rec = await record(await getBrowser(!!recipe.webgl), base, g, recipe, path.join(workDir, 'a'));
    if (mode === 'play' && rec.frames < (recipe.fps ?? 12.5) * 2) throw new Error(`録れたコマが少なすぎます（${rec.frames}）`);
  } catch (e) {
    log(`[${g.id}] 録画できませんでした：${e.message.split('\n')[0]}（画面：${path.relative(PORTAL, path.join(workDir, 'a', 'error.png'))}）`);
    if (e.pageErrors?.length) log(`[${g.id}]   ページのエラー：${e.pageErrors.slice(0, 3).join(' / ')}`);
    note = `録画失敗のため静止画で代替：${e.message.split('\n')[0]}`;
    mode = 'still';
    rec = rec ?? { framesDir: path.join(workDir, 'a', 'frames'), stillsDir: path.join(workDir, 'a', 'stills'), frames: 0, fps: 15, errors: [] };
  }
  try {
    let deterministic = null;
    if (VERIFY && mode === 'play') {
      const rec2 = await record(await getBrowser(!!recipe.webgl), base, g, recipe, path.join(workDir, 'b'));
      const a = framesHash(rec.framesDir), b = framesHash(rec2.framesDir);
      const same = a.filter((x, i) => x === b[i]).length;
      // 完全一致に加え、PSNR 45dB 以上（目では区別できない差）を「同じコマ」とみなす
      const psnr = framePsnr(rec.framesDir, rec2.framesDir);
      const near = psnr.filter((v) => v >= 45).length;
      deterministic = { frames: a.length, identical: same, nearIdentical: near, ratio: +(near / Math.max(a.length, 1)).toFixed(3), minPsnr: Math.min(...psnr), sameCount: a.length === b.length };
    }
    const src = mode === 'still' ? parallax(g.id, rec, recipe) : rec;
    const bytes = encode(g.id, src, recipe, g.themeColor);
    const posterBytes = poster(g.id, rec.frames || readdirSync(rec.stillsDir).length ? rec : src, recipe);
    manifest[g.id] = {
      mode, fps: src.fps, frames: readdirSync(src.framesDir).length, seconds: +(readdirSync(src.framesDir).length / src.fps).toFixed(2),
      webm: `previews/${g.id}.webm`, mp4: `previews/${g.id}.mp4`, poster: `previews/${g.id}.jpg`,
      bytes: { ...bytes, poster: posterBytes }, deterministic, note: note || recipe.note || '',
      pageErrors: rec.errors.slice(0, 5), sourceCommit: git('rev-parse', '--short', g.source.ref).trim(), recipe: g.preview.recipe,
    };
    log(`[${g.id}] ${mode === 'play' ? '録画' : '静止画＋パララックス'} ${manifest[g.id].seconds}秒 webm ${(bytes.webm / 1024).toFixed(0)}KB / mp4 ${(bytes.mp4 / 1024).toFixed(0)}KB` +
      (deterministic ? ` 再現性 ${deterministic.nearIdentical}/${deterministic.frames} コマ一致（完全一致 ${deterministic.identical}、最小PSNR ${deterministic.minPsnr === Infinity ? '∞' : deterministic.minPsnr.toFixed(1)}dB）` : '') + `（${((Date.now() - t0) / 1000).toFixed(0)}秒）`);
  } catch (e) {
    failed++;
    log(`[${g.id}] ✗ プレビューを作れませんでした：${e.message}`);
    rmSync(path.join(PREVIEWS, `${g.id}.json`), { force: true });
    continue;
  }
  writeFileSync(path.join(PREVIEWS, `${g.id}.json`), JSON.stringify({ id: g.id, capturedAt: new Date().toISOString(), ...manifest[g.id] }, null, 2) + '\n');
}
for (const b of Object.values(browsers)) await b.close();
await close();
if (failed) { log(`✗ ${failed} 本でプレビューが作れませんでした`); process.exit(1); }
log('✓ プレビュー生成 完了');
