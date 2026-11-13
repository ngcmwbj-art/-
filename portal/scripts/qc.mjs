// ステップ7：QC。全部 OK になるまで「完成」と言わない。
//  1. リンク：公開中は games.json の url と同じリンク・新しいタブ。開発中はリンクなし。url の実在は validate.mjs の結果も使う
//             ゲーム本体が手元で起動できたこと（プレビューを撮れたこと）も確かめる
//  2. プレビュー：全カードで動画が実際に再生される（PC・スマホ・WebM が使えないブラウザ＝MP4 側）
//  3. JSON と表示の一致：本数・題名・一言・ジャンル・タグ・状態・リンク先
//  4. 重さ：最初の表示で動画を読み込まない（遅延読み込み）、1本 1MB 以下、最初の転送量
//  5. 絞り込み・検索が JSON から計算した本数と合う
// 使い方：node scripts/qc.mjs
import { readFileSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PORTAL, DIST, PREVIEWS, loadGames, searchText, serveStatic, loadPlaywright, log } from './lib.mjs';

const results = [];
const check = (group, name, ok, detail = '') => results.push({ group, name, ok: !!ok, detail });
const { games, site } = loadGames();

// ── 0. 検証（validate.mjs）をもう一度
let validateOut = '';
try { validateOut = execFileSync('node', [path.join(PORTAL, 'scripts/validate.mjs')], { encoding: 'utf8' }); check('リンク', 'games.json の検証（必須項目・URLの実在・重複）', true); }
catch (e) { check('リンク', 'games.json の検証（必須項目・URLの実在・重複）', false, e.stdout); }

// ── プレビューのファイルと記録
for (const g of games) {
  const f = path.join(PREVIEWS, `${g.id}.json`);
  if (!existsSync(f)) { check('プレビュー', `${g.id}：プレビューの記録がある`, false, 'node scripts/capture.mjs ' + g.id); continue; }
  const m = JSON.parse(readFileSync(f, 'utf8'));
  const sizes = ['webm', 'mp4', 'poster'].map((k) => [k, existsSync(path.join(DIST, m[k])) ? statSync(path.join(DIST, m[k])).size : -1]);
  check('重さ', `${g.id}：動画 10KB〜1MB・静止画 2KB 以上（${sizes.map(([k, s]) => `${k} ${(s / 1024).toFixed(0)}KB`).join(' / ')}）`, sizes.every(([k, s]) => s > (k === "poster" ? 2 : 10) * 1024 && s <= 1024 * 1024));
  check('リンク', `${g.id}：ゲーム本体が手元で起動し、${m.mode === 'play' ? 'プレイを録画できた' : '静止画で代替した'}`, m.frames > 0, m.note || '');
}

const { chromium } = loadPlaywright();
const { url, close } = await serveStatic(DIST);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function open(opts, init) {
  const ctx = await browser.newContext({ locale: 'ja-JP', ...opts });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const net = [], errs = [];
  page.on('request', (r) => net.push(r.url()));
  page.on('requestfinished', async (r) => { try { const s = await r.sizes(); net.bytes = (net.bytes || 0) + s.responseBodySize; } catch {} });
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
  await page.goto(url + '/index.html', { waitUntil: 'networkidle' });
  return { ctx, page, net, errs };
}

/** 全カードを順に画面に入れ、動画の時間が進むか（＝実際に再生されているか）を見る */
async function playback(label, opts, init) {
  const { ctx, page, errs } = await open(opts, init);
  const n = await page.locator('.gp-card').count();
  for (let i = 0; i < n; i++) {
    const card = page.locator('.gp-card').nth(i);
    const id = await card.getAttribute('data-id');
    await card.locator('.gp-media').scrollIntoViewIfNeeded();
    let st = null;
    try {
      await page.waitForFunction((el) => { const v = el.querySelector('video'); return v && v.readyState >= 2 && v.currentTime > 0.3 && !v.paused; }, await card.elementHandle(), { timeout: 8000 });
      st = await card.evaluate((el) => { const v = el.querySelector('video'); return { t: v.currentTime, src: v.currentSrc.split('/').pop(), w: v.videoWidth, h: v.videoHeight }; });
    } catch { st = await card.evaluate((el) => { const v = el.querySelector('video'); return v ? { t: v.currentTime, paused: v.paused, ready: v.readyState, src: v.currentSrc, err: v.error?.code } : null; }); }
    const ok = st && st.t > 0.3 && st.w > 0;
    check('プレビュー', `${label}：${id} の動画が再生される${ok ? `（${st.src} ${st.w}×${st.h}）` : ''}`, ok, ok ? '' : JSON.stringify(st));
  }
  check('プレビュー', `${label}：ページにエラーがない`, errs.length === 0, errs.join(' / '));
  await ctx.close();
}

// ── 2. 再生：PC / スマホ / WebM を使えないブラウザ（MP4 に切り替わるか）
await playback('PC', { viewport: { width: 1280, height: 860 } });
await playback('スマホ', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await playback('スマホ・WebM非対応（MP4）', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  `(() => { const o = HTMLMediaElement.prototype.canPlayType; HTMLMediaElement.prototype.canPlayType = function (t) { return /webm/.test(t) ? '' : o.call(this, t); }; })();`);

// ── 表示：画面に入ったかの検知（IntersectionObserver）が届かない表示でも、全カードが見える（アプリ内の表示などで真っ白にならない）
{
  const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    `window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };`);
  await page.waitForTimeout(1500);
  const op = await page.$$eval('.gp-card', (cs) => cs.map((c) => +getComputedStyle(c).opacity));
  check('表示', `検知が届かない表示でも全カードが見える（不透明 ${op.filter((o) => o === 1).length} / ${op.length} 枚）`, op.length && op.every((o) => o === 1));
  await ctx.close();
}

// ── 3. JSON と表示の一致・1. リンク・5. 絞り込み
{
  const { ctx, page, net, errs } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const shown = await page.$$eval('.gp-card', (cards) => cards.map((c) => ({
    id: c.dataset.id, title: c.querySelector('.gp-name')?.textContent.trim(), tagline: c.querySelector('.gp-tagline')?.textContent.trim(),
    genre: c.querySelector('.gp-genre')?.textContent.trim(), facts: [...c.querySelectorAll('.gp-facts li')].map((l) => l.textContent.trim()),
    caption: c.querySelector('.gp-caption')?.textContent.trim() ?? null, selfLink: c.querySelector('.gp-name a')?.getAttribute('href') ?? null,
    dev: !!c.querySelector('.gp-status'), href: c.querySelector('a.gp-cta')?.getAttribute('href') ?? null,
    target: c.querySelector('a.gp-cta')?.getAttribute('target') ?? null, disabled: c.querySelector('.gp-cta')?.getAttribute('aria-disabled') === 'true',
    color: c.style.getPropertyValue('--tc').trim(),
  })));
  check('JSONと表示', `本数が同じ（JSON ${games.length} / 表示 ${shown.length}）`, shown.length === games.length);
  check('JSONと表示', '並び順が JSON と同じ', shown.map((s) => s.id).join() === games.map((g) => g.id).join());
  for (const g of games) {
    const s = shown.find((x) => x.id === g.id);
    if (!s) { check('JSONと表示', `${g.id}：カードがある`, false); continue; }
    const diffs = [];
    if (s.title !== g.title) diffs.push(`題名 ${s.title}`);
    if (s.tagline !== g.tagline) diffs.push(`一言 ${s.tagline}`);
    if (s.genre !== g.genre) diffs.push(`ジャンル ${s.genre}`);
    if (s.facts.join('|') !== [g.playTime, g.difficulty, g.moods.slice(0, 2).join('・')].join('|')) diffs.push(`時間・むずかしさ・気分 ${s.facts}`);
    if (s.caption !== g.caption) diffs.push(`動画の一言 ${s.caption}`);
    if (s.selfLink !== `#game-${g.id}`) diffs.push(`直接リンク ${s.selfLink}`);
    if (s.color.toLowerCase() !== g.themeColor.toLowerCase()) diffs.push(`色 ${s.color}`);
    if (s.dev !== (g.status === '開発中')) diffs.push('状態の表示');
    check('JSONと表示', `${g.id}：題名・一言・ジャンル・時間・むずかしさ・気分・動画の一言・色・状態が一致`, !diffs.length, diffs.join(', '));
    if (g.status === '公開中') check('リンク', `${g.id}：リンク先が games.json と同じで新しいタブで開く`, s.href === g.url && s.target === '_blank', `${s.href} ${s.target}`);
    else check('リンク', `${g.id}：開発中なのでリンクが無効`, s.href === null && s.disabled, JSON.stringify(s));
  }
  // 4. 遅延読み込み：最初の表示で読んだ動画の数
  const videos = net.filter((u) => /\.(webm|mp4)$/.test(u));
  const imgs = net.filter((u) => /previews\/.*\.jpg$/.test(u));
  // 動画は「最初の画面に見えているカード」の分だけ読むはず（静止画の先読みはブラウザ任せ。数画面分は先に読む）
  const inView = await page.$$eval('.gp-card', (cs) => cs.filter((c) => { const r = c.querySelector('.gp-media').getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).length);
  check('重さ', `最初の表示で読む動画は見えているカードの分だけ（読んだ動画 ${videos.length} 本 ≦ 見えているカード ${inView} 枚 ／ 全 ${games.length} 本。静止画 ${imgs.length} 枚）`, videos.length <= inView && videos.length < games.length);
  check('重さ', `最初の表示の転送量が 1.5MB 以下（${((net.bytes || 0) / 1024).toFixed(0)}KB、外部フォント除く手元分）`, (net.bytes || 0) < 1.5 * 1024 * 1024);

  // 5. 絞り込み
  for (const mo of site.moods.filter((m) => games.some((g) => g.moods.includes(m)))) {
    await page.click(`.gp-chip[data-mood="${mo}"]`);
    const vis = await page.$$eval('.gp-card:not([hidden])', (c) => c.map((x) => x.dataset.id));
    const want = games.filter((g) => g.moods.includes(mo)).map((g) => g.id);
    check('絞り込み', `気分「${mo}」で ${want.length} 本`, vis.join() === want.join(), vis.join());
  }
  await page.click('.gp-chip[data-mood="all"]');
  for (const q of ['農業', 'ぐそく', 'かんたん', '5分', 'ないゲーム名xyz']) {
    await page.fill('.gp-search input', q);
    const vis = await page.$$eval('.gp-card:not([hidden])', (c) => c.map((x) => x.dataset.id));
    const nq = (s) => s.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
    const want = games.filter((g) => nq(searchText(g)).includes(nq(q))).map((g) => g.id);
    const emptyShown = await page.isVisible('.gp-empty');
    check('絞り込み', `検索「${q}」で ${want.length} 本${want.length ? '' : '（「見つかりません」を表示）'}`, vis.join() === want.join() && emptyShown === (want.length === 0), vis.join());
  }
  // 「あそぶ」ボタンの色が全ゲームで同じ（色がばらばらだと、暗いボタンが押せないように見える）
  await page.fill('.gp-search input', '');
  const ctaColors = await page.$$eval('a.gp-cta', (as) => [...new Set(as.map((a) => getComputedStyle(a).backgroundColor))]);
  check('表示', `「あそぶ」ボタンの色が全ゲームで同じ（${ctaColors.join(' / ')}）`, ctaColors.length === 1);
  check('表示', '「別の画面で開きます」の一言がボタンにある', (await page.$$eval('a.gp-cta small', (e) => e.length)) === games.filter((g) => g.status === '公開中').length);
  // ゲームごとの直接リンク：#game-<id> で開くとそのカードが画面に入る
  const last = games[games.length - 1];
  await page.goto(url + `/index.html#game-${last.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const inViewLast = await page.$eval(`#game-${last.id}`, (c) => { const r = c.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
  check('リンク', `直接リンク（#game-${last.id}）で開くとそのカードが画面に出る`, inViewLast);
  for (const g of games) {
    const f = path.join(DIST, 'g', `${g.id}.html`);
    const t = existsSync(f) ? readFileSync(f, 'utf8') : '';
    check('リンク', `${g.id}：貼ったとき用の小さなページ（題名・説明・一覧のカードへ移る）`, t.includes(`og:title" content="${g.title}`) && t.includes(`#game-${g.id}`));
  }
  check('リンク', 'ページ全体の貼ったとき用の絵（og.jpg）がある', existsSync(path.join(DIST, 'og.jpg')) && statSync(path.join(DIST, 'og.jpg')).size > 10 * 1024);
  check('JSONと表示', 'ページにエラーがない', errs.length === 0, errs.join(' / '));
  await ctx.close();
}
await browser.close();
await close();

// ── 報告
let ng = 0;
for (const group of [...new Set(results.map((r) => r.group))]) {
  log(`\n■ ${group}`);
  for (const r of results.filter((x) => x.group === group)) { if (!r.ok) ng++; log(`  ${r.ok ? '✓' : '✗'} ${r.name}${!r.ok && r.detail ? `\n      → ${String(r.detail).trim().slice(0, 400)}` : ''}`); }
}
const unverified = validateOut.split('\n').filter((l) => l.includes('未確認'));
if (unverified.length) { log('\n■ この環境では確かめられないこと（人の目で確認）'); unverified.forEach((l) => log('  ・' + l.replace(/^\s*注意\s*/, ''))); }
log(`\n${ng ? `✗ QC NG：${ng} 件` : `✓ QC 全 ${results.length} 項目 OK`}`);
process.exit(ng ? 1 : 0);
