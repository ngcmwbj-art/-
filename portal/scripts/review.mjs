// ステップ6：フレームレビュー。PC 幅とスマホ幅で一覧ページを撮り、崩れ・はみ出しを機械でも調べる
// 出力：portal/review/pc.png, sp.png（全体）, pc-top.png, sp-top.png（最初の画面）, cards-*.png（各カードの再生中の様子）
// 使い方：node scripts/review.mjs
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PORTAL, DIST, serveStatic, loadPlaywright, log } from './lib.mjs';

const OUT = path.join(PORTAL, 'review');
mkdirSync(OUT, { recursive: true });
const { chromium } = loadPlaywright();
const { url, close } = await serveStatic(DIST);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const VIEWS = [
  { name: 'pc', viewport: { width: 1280, height: 860 } },
  { name: 'tab', viewport: { width: 820, height: 1100 }, isMobile: true, hasTouch: true },
  { name: 'ipad-mini', viewport: { width: 744, height: 1133 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'ipad-768', viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'sp', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'sp-narrow', viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'sp-landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];
const problems = [];
for (const v of VIEWS) {
  const ctx = await browser.newContext({ viewport: v.viewport, isMobile: !!v.isMobile, hasTouch: !!v.hasTouch, deviceScaleFactor: v.deviceScaleFactor ?? 1, locale: 'ja-JP' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
  await page.goto(url + '/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600); // 出現アニメーションが終わるまで
  await page.screenshot({ path: path.join(OUT, `${v.name}-top.png`) });
  // 下までスクロールして全カードを出し、動画を再生させる
  const n = await page.locator('.gp-card').count();
  for (let i = 0; i < n; i++) {
    const card = page.locator('.gp-card').nth(i);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    if (v.name === 'pc' || v.name === 'sp') await card.screenshot({ path: path.join(OUT, `cards-${v.name}-${i + 1}.png`) });
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `${v.name}.png`), fullPage: true });

  // 機械でのはみ出し検査
  const r = await page.evaluate(() => {
    const out = [];
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) out.push(`ページが横にはみ出しています（${de.scrollWidth} > ${de.clientWidth}）`);
    for (const el of document.querySelectorAll('.gp-portal *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || el.closest('[hidden]') || el.tagName === 'svg' || el.closest('svg')) continue;
      const rect = el.getBoundingClientRect();
      const inScroller = el.closest('.gp-chips') && getComputedStyle(el.closest('.gp-chips')).overflowX === 'auto';
      if (rect.width && !inScroller && (rect.right > de.clientWidth + 1 || rect.left < -1)) out.push(`画面外：${el.className || el.tagName}「${(el.textContent || '').trim().slice(0, 20)}」`);
      if (['gp-name', 'gp-tagline', 'gp-how', 'gp-cta', 'gp-chip'].some((c) => el.classList.contains(c)) && el.scrollWidth > el.clientWidth + 1) out.push(`文字があふれています：${el.className}「${el.textContent.trim().slice(0, 20)}」`);
    }
    // カードの中身がカードからはみ出していないか
    for (const card of document.querySelectorAll('.gp-card:not([hidden])')) {
      const c = card.getBoundingClientRect();
      for (const el of card.querySelectorAll('.gp-body > *, .gp-badges > *')) {
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > c.right + 1 || b.left < c.left - 1)) out.push(`カードからはみ出し：${card.dataset.id} の ${el.className}`);
      }
    }
    // 押す場所の大きさ（44px 前後）
    for (const el of document.querySelectorAll('.gp-chip, .gp-cta, .gp-search input')) {
      const b = el.getBoundingClientRect();
      if (b.width && b.height < 36) out.push(`押す場所が小さい：${el.className}（高さ${Math.round(b.height)}px）`);
    }
    const playing = [...document.querySelectorAll('.gp-media video')].map((v) => ({ id: v.closest('.gp-card').dataset.id, t: v.currentTime, paused: v.paused, ready: v.readyState }));
    return { out, playing, cols: getComputedStyle(document.querySelector('.gp-grid')).gridTemplateColumns.split(' ').length };
  });
  for (const o of r.out) problems.push(`[${v.name}] ${o}`);
  for (const e of errs) problems.push(`[${v.name}] エラー：${e}`);
  log(`[${v.name} ${v.viewport.width}px] 列数 ${r.cols}、カード ${n} 枚、はみ出し等 ${r.out.length} 件、エラー ${errs.length} 件`);
  await ctx.close();
}
await browser.close();
await close();
log(`スクリーンショット：${path.relative(process.cwd(), OUT)}/`);
if (problems.length) { for (const p of problems) log('  NG ' + p); log(`✗ レビューで ${problems.length} 件の問題`); process.exit(1); }
log('✓ 崩れ・はみ出しは見つかりませんでした（見た目は画像で確認すること）');
