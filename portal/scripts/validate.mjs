// ステップ3：games.json の機械チェック。1件でも NG があれば終了コード1（描画に進まない）
// 使い方：node scripts/validate.mjs
import path from 'node:path';
import { existsSync } from 'node:fs';
import { PORTAL, loadGames, loadJSON, existsInRef, gitOk } from './lib.mjs';

const data = loadGames();
const registry = loadJSON(path.join(PORTAL, 'link-registry.json'));
const errors = [], warns = [];
const err = (id, msg) => errors.push(`[${id}] ${msg}`);
const warn = (id, msg) => warns.push(`[${id}] ${msg}`);

const REQUIRED = ['id', 'title', 'tagline', 'genre', 'tags', 'url', 'themeColor', 'status'];
const STATUS = ['公開中', '開発中'];
const isUnknown = (v) => typeof v === 'string' && v.includes('未確認');
const len = (s) => [...s].length; // 絵文字・全角も1字

if (!data.site?.title) err('site', 'site.title がありません');
if (!Array.isArray(data.games) || !data.games.length) err('site', 'games が空です');

const seen = { id: new Map(), title: new Map(), url: new Map() };
for (const [i, g] of (data.games || []).entries()) {
  const id = g.id || `#${i}`;
  // 必須項目
  for (const k of REQUIRED) {
    const v = g[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) err(id, `必須項目 ${k} がありません`);
  }
  if (g.id && !/^[a-z0-9][a-z0-9-]*$/.test(g.id)) err(id, 'id は半角英小文字・数字・ハイフンのみ');
  if (typeof g.tagline === 'string' && len(g.tagline) > 20) err(id, `tagline が20字を超えています（${len(g.tagline)}字）：${g.tagline}`);
  if (g.status && !STATUS.includes(g.status)) err(id, `status は ${STATUS.join('／')} のどちらか：${g.status}`);
  if (g.themeColor && !/^#[0-9a-fA-F]{6}$/.test(g.themeColor)) err(id, `themeColor は #rrggbb 形式で：${g.themeColor}`);
  if (g.tags && (!Array.isArray(g.tags) || g.tags.some((t) => typeof t !== 'string' || !t.trim()))) err(id, 'tags は文字列の配列');
  if (g.tags && new Set(g.tags).size !== g.tags.length) err(id, 'tags に重複があります');
  for (const k of REQUIRED) if (isUnknown(g[k]) && !(k === 'url' && g.status === '開発中')) err(id, `${k} が「未確認」のままです（公開中のゲームには必要）`);

  // 重複
  for (const k of ['id', 'title', 'url']) {
    if (!g[k] || isUnknown(g[k])) continue;
    const key = String(g[k]).trim().normalize('NFKC');
    if (seen[k].has(key)) err(id, `${k} が ${seen[k].get(key)} と重複：${g[k]}`); else seen[k].set(key, id);
  }

  // URL の実在
  if (g.url && !isUnknown(g.url)) {
    let u; try { u = new URL(g.url); } catch { err(id, `url の形が不正：${g.url}`); }
    if (u) {
      if (u.protocol !== 'https:') err(id, `url は https で：${g.url}`);
      if (g.url.startsWith(data.site.pagesBase)) {
        // GitHub Pages：公開元ブランチにファイルがあるか
        let rel = g.url.slice(data.site.pagesBase.length);
        if (rel === '' || rel.endsWith('/')) rel += 'index.html';
        if (!gitOk('rev-parse', '--verify', data.site.pagesRef)) err(id, `公開元ブランチ ${data.site.pagesRef} が見つかりません（git fetch が必要）`);
        else if (!existsInRef(data.site.pagesRef, rel)) err(id, `公開元ブランチに ${rel} がありません`);
      } else if (u.hostname === 'claude.ai' && u.pathname.startsWith('/artifact/')) {
        // Artifact：台帳にあるか・題名が合うか
        const hit = registry.artifacts.find((a) => a.url === g.url);
        if (!hit) err(id, `Artifact の台帳（link-registry.json）に無い URL：${g.url}`);
        else if (hit.title.normalize('NFKC') !== g.title.normalize('NFKC')) err(id, `Artifact の題名「${hit.title}」とゲーム名が一致しません`);
      } else {
        warn(id, `自動で実在を確かめられない URL です（手で開いて確認）：${g.url}`);
      }
    }
  }

  // ソース（プレビュー生成用）
  const s = g.source;
  if (!s) err(id, 'source（ref, path, serve, entry）がありません');
  else {
    for (const k of ['ref', 'path', 'entry']) if (!s[k]) err(id, `source.${k} がありません`);
    if (s.ref && !gitOk('rev-parse', '--verify', s.ref)) err(id, `source.ref ${s.ref} が見つかりません（git fetch origin が必要）`);
    else if (s.ref && s.path && !existsInRef(s.ref, s.path)) err(id, `${s.ref} に ${s.path} がありません`);
    else if (s.ref && !s.build?.length && !existsInRef(s.ref, path.posix.join(s.path, s.serve || '.', s.entry))) err(id, `${s.ref} に入口 ${path.posix.join(s.path, s.serve || '.', s.entry)} がありません`);
  }
  // プレビューの手順書
  const recipe = g.preview?.recipe;
  if (!recipe) err(id, 'preview.recipe がありません');
  else if (!existsSync(path.join(PORTAL, recipe))) err(id, `手順書 ${recipe} がありません`);

  if (g.unverified?.length) warn(id, `未確認：${g.unverified.join(' ／ ')}`);
}

console.log(`games.json：${data.games?.length ?? 0} 本`);
for (const w of warns) console.log('  注意 ' + w);
for (const e of errors) console.log('  NG   ' + e);
if (errors.length) { console.log(`\n✗ 検証 NG（${errors.length}件）。直すまで描画に進みません。`); process.exit(1); }
console.log('\n✓ 検証 OK');
