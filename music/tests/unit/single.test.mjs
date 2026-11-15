// 1ファイル版（tools/build-single.mjs）が、こわれずに作れるかを確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleScripts, buildSingle } from '../../tools/build-single.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('スクリプトを1つにまとめたものが、文法として正しい', () => {
  const code = bundleScripts();
  assert.doesNotThrow(() => new vm.Script(code), 'まとめたスクリプトに文法のまちがいがあります');
  assert.ok(!/^\s*(import|export)\s/m.test(code), 'import / export が残っています');
  assert.ok(!code.includes('import.meta'), 'import.meta が残っています');
});

test('js/ のファイルが全部入っている', () => {
  const code = bundleScripts();
  for (const f of readdirSync(join(root, 'js')).filter((n) => n.endsWith('.js'))) {
    assert.ok(code.includes(`__m['${f}'] = `), `js/${f} が入っていません`);
  }
});

test('1ファイル版は、ほかのファイルを読みに行かない', () => {
  for (const artifact of [false, true]) {
    const html = buildSingle({ artifact });
    assert.ok(!/<link\b/i.test(html), '<link> が残っています');
    assert.ok(!/<script[^>]+\bsrc=/i.test(html), '<script src> が残っています');
    assert.ok(html.includes('window.__MUSIC_PREVIEW__ = true'), 'お試し版の印がありません');
    assert.ok(html.includes('<title>ミュージック</title>'));
    assert.equal(/<!DOCTYPE html>/i.test(html), !artifact);
    // <script> の中身に </script> がそのまま出ていない（そこで切れてしまう）
    const scripts = html.split(/<script>/).slice(1).map((part) => part.slice(0, part.lastIndexOf('</script>')));
    for (const body of scripts) assert.ok(!/<\/script/i.test(body.replace(/<\\\/script/gi, '')), '</script> が中に出ています');
  }
});
