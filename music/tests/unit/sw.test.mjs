// sw.js の「控えるファイルの一覧」と版の印が、今のファイルと合っているかを確かめる。
// 落ちたら `node tools/build-sw.mjs` を流してください。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compute, render } from '../../tools/build-sw.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('sw.js は最新（アプリのファイルを変えたら node tools/build-sw.mjs）', () => {
  const src = readFileSync(join(root, 'sw.js'), 'utf8');
  assert.equal(src, render(src, compute()), 'sw.js が古いままです。node tools/build-sw.mjs を流してください');
});

test('控えるファイルは全部そろっていて、テスト用のものは入っていない', () => {
  const { files } = compute();
  for (const f of files) {
    if (f === './') continue;
    assert.ok(existsSync(join(root, f)), `${f} がありません`);
    assert.ok(!/^\.\/(tests|tools)\//.test(f), `${f} は控えなくてよいファイルです`);
  }
  for (const must of ['./index.html', './manifest.webmanifest', './css/app.css', './css/coverflow.css', './js/app.js', './js/tags.js', './js/icons.js', './js/coverflow.js', './icons/apple-touch-icon.png']) {
    assert.ok(files.includes(must), `${must} が一覧にありません`);
  }
});

test('index.html と manifest が指しているファイルがある', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"#:]+)"/g)) {
    assert.ok(existsSync(join(root, m[1])), `index.html が指す ${m[1]} がありません`);
  }
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) assert.ok(existsSync(join(root, icon.src)), `manifest が指す ${icon.src} がありません`);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
});
