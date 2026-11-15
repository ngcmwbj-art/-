// sw.js の中の「控えておくファイルの一覧」と「版の印」を作りなおす。
//   node tools/build-sw.mjs          … sw.js を書きかえる
//   node tools/build-sw.mjs --check  … 今の sw.js が最新かどうかだけ調べる（古ければ exit 1）
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// アプリ本体として控えるもの（tests/ や tools/ は入れない）
const TOP = ['index.html', 'manifest.webmanifest'];
const DIRS = ['css', 'js', 'icons'];
const EXT = /\.(html|css|js|mjs|json|webmanifest|png|svg|ico|jpg|jpeg|webp)$/i;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

export function compute() {
  const files = [...TOP.map((f) => join(root, f)), ...DIRS.flatMap((d) => walk(join(root, d)))];
  const hash = createHash('sha256');
  const list = [];
  for (const f of files) {
    const rel = relative(root, f).split('\\').join('/');
    hash.update(rel);
    hash.update(readFileSync(f));
    list.push(`./${rel}`);
  }
  return { version: hash.digest('hex').slice(0, 12), files: ['./', ...list] };
}

export function render(src, { version, files }) {
  const block = [
    '/* build-sw:begin */',
    `const VERSION = '${version}';`,
    'const FILES = [',
    ...files.map((f) => `  '${f}',`),
    '];',
    '/* build-sw:end */',
  ].join('\n');
  const re = /\/\* build-sw:begin \*\/[\s\S]*?\/\* build-sw:end \*\//;
  if (!re.test(src)) throw new Error('sw.js に build-sw の目印がありません');
  return src.replace(re, block);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const swPath = join(root, 'sw.js');
  const src = readFileSync(swPath, 'utf8');
  const next = render(src, compute());
  if (process.argv.includes('--check')) {
    if (src !== next) {
      console.error('sw.js が古いままです。`node tools/build-sw.mjs` を流してください。');
      process.exit(1);
    }
    console.log('sw.js は最新です。');
  } else {
    writeFileSync(swPath, next);
    console.log(`sw.js を更新しました（${compute().files.length} ファイル）。`);
  }
}
