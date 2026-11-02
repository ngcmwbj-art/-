// 共通の道具：パス、games.json の読み込み、git、静的サーバー
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PORTAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(PORTAL, '..');
export const WORK = path.join(PORTAL, '.work');       // ゲームの取り出し先（git 管理外）
export const DIST = path.join(PORTAL, 'dist');        // 出来上がったポータル
export const PREVIEWS = path.join(DIST, 'previews');

export const loadJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
// GAMES_FILE で別のファイルを試せる（検証スクリプトのテスト用）
export const loadGames = () => loadJSON(process.env.GAMES_FILE || path.join(PORTAL, 'games.json'));

export const git = (...args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
export const gitOk = (...args) => { try { git(...args); return true; } catch { return false; } };
/** ref の中にそのパスのファイルがあるか */
export const existsInRef = (ref, p) => gitOk('cat-file', '-e', `${ref}:${p}`);

/** Playwright は ESM の import では見つからないことがあるので require で読む */
export function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try { return req('playwright'); } catch { return req(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim() + '/playwright'); }
}

/** 引数で id を絞る：node x.mjs keitora masato */
export function pickGames(all, argv = process.argv.slice(2)) {
  const ids = argv.filter((a) => !a.startsWith('-'));
  if (!ids.length) return all;
  const unknown = ids.filter((id) => !all.some((g) => g.id === id));
  if (unknown.length) throw new Error(`games.json に無い id: ${unknown.join(', ')}`);
  return all.filter((g) => ids.includes(g.id));
}

/** 取り出したゲームのフォルダ（.work/<id>/<path>）。build はここで実行する */
export const gameRoot = (g) => path.join(WORK, g.id, g.source.path);
/** 手元で開くときの URL パス（.work をサーバーの根にしたとき）：/<id>/<path>/<serve>/<entry> */
export const gameLocalPath = (g) => '/' + path.posix.join(g.id, g.source.path, g.source.serve || '.', g.source.entry);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

/** 文字コードつきで返す静的サーバー（python の http.server は charset を付けず、グソクが文字化けするため自前） */
export function serveStatic(root, port = 0) {
  const server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(root, p);
    if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
    if (existsSync(f) && statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!existsSync(f)) { res.writeHead(404).end('not found'); return; }
    const size = statSync(f).size;
    const type = MIME[path.extname(f).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) { // 動画の再生にはRange対応が要る
      let start = range[1] ? +range[1] : 0, end = range[2] ? Math.min(+range[2], size - 1) : size - 1;
      if (!range[1] && range[2]) { start = Math.max(0, size - +range[2]); end = size - 1; } // bytes=-N（最後の N バイト）
      if (start >= size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      createReadStream(f, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') return res.end();
    createReadStream(f).pipe(res);
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) })));
}

export const log = (...a) => console.log(...a);
