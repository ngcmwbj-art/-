// アプリ全体を1つの HTML ファイルにまとめる。
//   node tools/build-single.mjs --out <出力先.html>            … そのまま開ける1ファイル版（パソコンで試す用）
//   node tools/build-single.mjs --out <出力先.html> --artifact  … Claude の Artifact に載せる形（<html> などの外枠なし）
//
// 1ファイル版は「見た目と操作を試す」ためのものです。Service Worker が無いので通信なしでは開けず、
// 画面にもその旨が出ます（window.__MUSIC_PREVIEW__）。ふだん使う版は、フォルダごと https の置き場所に置きます。
//
// 外のライブラリは使わず、このアプリの書き方（import { … } from './x.js' と export function / class / const）
// だけを相手にした、ごく小さなまとめ役です。ちがう書き方が混ざったら、エラーで知らせます。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const IMPORT_RE = /^import\s+\{([^}]*)\}\s+from\s+'\.\/([^']+)';[ \t]*$/gm;
const EXPORT_RE = /^export\s+(async\s+function|function|class|const|let)\s+([A-Za-z_$][\w$]*)/gm;

export function bundleScripts(entry = 'app.js') {
  const order = [];
  const seen = new Set();
  const visit = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    const src = read(`js/${name}`);
    for (const m of src.matchAll(IMPORT_RE)) visit(m[2]);
    order.push(name);
  };
  visit(entry);

  const parts = ["'use strict';", 'const __m = {};'];
  for (const name of order) {
    let code = read(`js/${name}`);
    const names = [];
    code = code.replace(IMPORT_RE, (_, list, from) => {
      const fields = list.split(',').map((s) => s.trim()).filter(Boolean)
        .map((s) => s.replace(/^(\S+)\s+as\s+(\S+)$/, '$1: $2'));
      return `const { ${fields.join(', ')} } = __m['${from}'];`;
    });
    code = code.replace(EXPORT_RE, (_, kind, id) => { names.push(id); return `${kind} ${id}`; });
    code = code.replace(/import\.meta\.url/g, 'document.baseURI');
    if (/^\s*(import|export)\b/m.test(code)) {
      throw new Error(`js/${name} に、まとめ役が知らない import / export の書き方があります`);
    }
    parts.push(`\n// ── js/${name} ──\n__m['${name}'] = (function () {\n${code}\nreturn { ${names.join(', ')} };\n})();`);
  }
  return `(function () {\n${parts.join('\n')}\n})();`;
}

export function buildSingle({ artifact = false } = {}) {
  const html = read('index.html');
  const body = html.slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('</body>'))
    .replace(/<noscript>[\s\S]*?<\/noscript>\s*/g, '')
    .replace(/<script\b[^>]*><\/script>\s*/g, '');
  const css = `${read('css/app.css')}\n${read('css/coverflow.css')}`;
  // </script> という文字が中に出てきても、そこで切れないようにする
  const js = bundleScripts().replace(/<\/script/gi, '<\\/script');
  const title = artifact ? 'ミュージック お試し版' : 'ミュージック';
  const inner = [
    `<title>${title}</title>`,
    `<style>\n${css}\n</style>`,
    body.trim(),
    '<script>window.__MUSIC_PREVIEW__ = true;</script>',
    `<script>\n${js}\n</script>`,
  ].join('\n');
  if (artifact) return `${inner}\n`;
  return [
    '<!DOCTYPE html>',
    '<html lang="ja">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    '<meta name="theme-color" content="#000000">',
    '</head>',
    '<body>',
    inner,
    '</body>',
    '</html>',
    '',
  ].join('\n').replace(`</head>\n<body>\n<title>${title}</title>`, `<title>${title}</title>\n</head>\n<body>`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const i = process.argv.indexOf('--out');
  if (i < 0 || !process.argv[i + 1]) {
    console.error('使い方: node tools/build-single.mjs --out <出力先.html> [--artifact]');
    process.exit(1);
  }
  const out = resolve(process.argv[i + 1]);
  mkdirSync(dirname(out), { recursive: true });
  const text = buildSingle({ artifact: process.argv.includes('--artifact') });
  writeFileSync(out, text);
  console.log(`${out}（${Math.round(text.length / 1024)} KB）`);
}
