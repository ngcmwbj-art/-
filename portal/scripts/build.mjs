// ステップ5：games.json とプレビューの記録（previews/<id>.json）から一覧ページを作る
// 先に検証（validate.mjs）を通し、NG なら作らない。
// 出力：dist/index.html（単体ページ）、dist/embed.html（既存サイトに貼る部分）、dist/portal.css、dist/portal.js、dist/games.data.json
import { readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PORTAL, DIST, PREVIEWS, loadGames, log } from './lib.mjs';

try { execFileSync('node', [path.join(PORTAL, 'scripts/validate.mjs')], { stdio: 'inherit' }); }
catch { console.error('✗ 検証が通らないので一覧ページは作りません'); process.exit(1); }

const { site, games } = loadGames();
const T = (f) => readFileSync(path.join(PORTAL, 'template', f), 'utf8');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── ばねの物理計算 → CSS の linear() イージング ──
   質量1・ばね定数 k・減衰 c の振動を、静止位置0から1へ動かしたときの位置を数値積分し、
   止まるまでの時間（duration）と、その間の位置を等間隔に並べた linear(...) を作る */
function spring({ stiffness, damping, mass = 1 }) {
  const dt = 1 / 1000; let x = 0, v = 0, t = 0; const pts = [];
  let still = 0;
  while (t < 3) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt; x += v * dt; t += dt;
    pts.push(x);
    still = Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01 ? still + dt : 0;
    if (still > 0.05) break;
  }
  const duration = Math.round(t * 1000);
  const N = 48;
  const samples = Array.from({ length: N + 1 }, (_, i) => (i === N ? 1 : pts[Math.min(pts.length - 1, Math.round((i / N) * (pts.length - 1)))]));
  const peak = Math.max(...pts);
  return {
    duration,
    easing: `linear(${samples.map((s) => +s.toFixed(4)).join(', ')})`,
    // linear() が使えないブラウザ向けの近い曲線（行き過ぎがあるときは戻りのある3次ベジェ）
    fallback: peak > 1.01 ? 'cubic-bezier(.34, 1.42, .52, 1)' : 'cubic-bezier(.22, 1, .36, 1)',
    overshoot: +((peak - 1) * 100).toFixed(1),
  };
}
const SPRINGS = {
  frame: spring({ stiffness: 190, damping: 17 }),   // 枠：少し行き過ぎて戻る
  content: spring({ stiffness: 140, damping: 19 }), // 中身：ほぼ行き過ぎない、やわらかい
};

/** 背景色に対して読みやすい文字色（白か濃い色）を WCAG のコントラスト比で選ぶ */
function inkFor(hex) {
  const ch = (i) => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return contrast(L, 1) >= contrast(L, 0.0137) ? '#ffffff' : '#1d1a15';
}

const meta = Object.fromEntries(games.map((g) => {
  const f = path.join(PREVIEWS, `${g.id}.json`);
  return [g.id, existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null];
}));

const genres = [...new Set(games.map((g) => g.genre))];
const icon = {
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  play: '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>',
};

function card(g) {
  const m = meta[g.id];
  const live = g.status === '公開中';
  const search = [g.title, g.tagline, g.genre, ...g.tags, g.howToPlay || '', g.status].join(' ');
  const media = m
    ? `<img src="${esc(m.poster)}" alt="${esc(g.title)}のプレイ画面" loading="lazy" decoding="async" width="640" height="400">
        <video muted loop playsinline preload="none" aria-hidden="true" tabindex="-1" data-webm="${esc(m.webm)}" data-mp4="${esc(m.mp4)}"></video>
        <button class="gp-play-toggle" type="button" aria-pressed="false" aria-label="プレビューを再生">${icon.play}${icon.pause}</button>`
    : `<div class="gp-noprev">プレビューなし</div>`;
  const cta = live
    ? `<a class="gp-cta" href="${esc(g.url)}" target="_blank" rel="noopener">あそぶ ${icon.arrow}</a>`
    : `<span class="gp-cta" role="link" aria-disabled="true">開発中のため、まだ遊べません</span>`;
  return `
    <li class="gp-card ${live ? 'is-live' : 'is-dev'}" id="game-${esc(g.id)}" data-id="${esc(g.id)}" data-genre="${esc(g.genre)}" data-status="${esc(g.status)}" data-search="${esc(search)}" style="--tc:${g.themeColor};--tc-ink:${inkFor(g.themeColor)}">
      <div class="gp-media">
        ${media}
        <div class="gp-badges"><span class="gp-genre">${esc(g.genre)}</span>${live ? '' : `<span class="gp-status">開発中</span>`}</div>
      </div>
      <div class="gp-body">
        <h2 class="gp-name">${esc(g.title)}</h2>
        <p class="gp-tagline">${esc(g.tagline)}</p>
        ${g.howToPlay ? `<p class="gp-how">${esc(g.howToPlay)}</p>` : ''}
        <ul class="gp-tags" aria-label="タグ">${g.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${g.platform?.length ? `<p class="gp-meta">対応：${esc(g.platform.join('・'))}</p>` : ''}
        ${cta}
      </div>
    </li>`;
}

const portal = `
  <section class="gp-portal" data-game-portal aria-label="ゲーム一覧">
    <div class="gp-tools">
      <label class="gp-search">${icon.search}
        <input type="search" placeholder="ゲーム名・タグで探す" aria-label="ゲーム名・タグで探す" autocomplete="off" enterkeyhint="search">
      </label>
      <fieldset class="gp-chips" aria-label="ジャンルで絞り込む">
        <button class="gp-chip" type="button" data-genre="all" aria-pressed="true">すべて <small>${games.length}</small></button>
        ${genres.map((ge) => `<button class="gp-chip" type="button" data-genre="${esc(ge)}" aria-pressed="false">${esc(ge)} <small>${games.filter((g) => g.genre === ge).length}</small></button>`).join('\n        ')}
      </fieldset>
    </div>
    <p class="gp-count" aria-live="polite">${games.length}本を表示中</p>
    <ul class="gp-grid">${games.map(card).join('')}
    </ul>
    <div class="gp-empty" hidden><p>条件に合うゲームがありません。</p><button class="gp-chip gp-reset" type="button">条件をクリア</button></div>
  </section>`;

const builtAt = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' });
const html = T('index.html')
  .replaceAll('{{SITE_TITLE}}', esc(site.title)).replaceAll('{{LEAD}}', esc(site.lead))
  .replaceAll('{{COUNT}}', String(games.length)).replaceAll('{{BUILT_AT}}', esc(builtAt))
  .replace('{{PORTAL}}', portal);
writeFileSync(path.join(DIST, 'index.html'), html);
// Claude の Artifact で公開するとき用（外枠の <html><head><body> は公開時に付くので、中身だけにする）
writeFileSync(path.join(DIST, 'artifact.html'), html
  .replace(/^[\s\S]*?<head>/, '').replace('<meta charset="utf-8">', '').replace(/<meta name="viewport"[^>]*>/, '<meta name="claude:viewport-fit-sides" content="cover">')
  .replace('</head>', '').replace('<body>', '').replace('</body>', '').replace('</html>', '').trim() + '\n');
writeFileSync(path.join(DIST, 'embed.html'), `<!-- 既存のページに貼るときは、<head> に portal.css、</body> の前に portal.js を読み込み、この部分を置く。previews/ も同じ場所に置く -->\n<link rel="stylesheet" href="portal.css">\n${portal}\n<script src="portal.js" defer></script>\n`);
writeFileSync(path.join(DIST, 'portal.css'), T('portal.css'));
writeFileSync(path.join(DIST, 'portal.js'), T('portal.js').replace('/*SPRINGS*/', `const SPRINGS = ${JSON.stringify({ frame: SPRINGS.frame, content: SPRINGS.content })};`));
// 表示と突き合わせるための、実際に使ったデータ（QC で使う）
writeFileSync(path.join(DIST, 'games.data.json'), JSON.stringify({ site, builtAt, springs: SPRINGS, games: games.map((g) => ({ ...g, preview: meta[g.id] })) }, null, 2) + '\n');

// games.json に無いゲームのプレビューが残っていたら消す
const ids = new Set(games.map((g) => g.id));
for (const f of readdirSync(PREVIEWS)) { const id = f.replace(/\.(webm|mp4|jpg|json)$/, ''); if (!ids.has(id)) { rmSync(path.join(PREVIEWS, f)); log(`古いプレビューを削除：${f}`); } }

const missing = games.filter((g) => !meta[g.id]).map((g) => g.id);
log(`✓ 一覧ページを作りました：${path.relative(PORTAL, path.join(DIST, 'index.html'))}（${games.length}本、ばね：枠 ${SPRINGS.frame.duration}ms・行き過ぎ${SPRINGS.frame.overshoot}%／中身 ${SPRINGS.content.duration}ms・行き過ぎ${SPRINGS.content.overshoot}%）`);
if (missing.length) log(`  注意：プレビューが無いゲーム：${missing.join(', ')}（node scripts/capture.mjs ${missing.join(' ')}）`);
