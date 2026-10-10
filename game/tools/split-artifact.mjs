#!/usr/bin/env node
// Split a one-file artifact page into the page and its script (app.js), for publishing
// as a two-file artifact (the page's `files` gets app.js).
//
//   node tools/split-artifact.mjs dist-artifact/shun-hd2d.html <out dir>
//
// 2026-10-05: the HD-2D page as one file was refused at publish ("artifact-pr-review
// machinery … too large for a review page") though it is no review page; the same page
// with its script beside it publishes (tasks/handoff.md).
import fs from 'node:fs';
import path from 'node:path';

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('usage: node tools/split-artifact.mjs <page.html> <out dir>');
  process.exit(1);
}
const html = fs.readFileSync(src, 'utf8');
const open = '<script type="module">';
const i = html.indexOf(open);
const j = i < 0 ? -1 : html.indexOf('</script>', i);
if (i < 0 || j < 0 || html.indexOf(open, j) >= 0) {
  console.error('expected exactly one inline module script');
  process.exit(1);
}
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, path.basename(src)), html.slice(0, i) + '<script type="module" src="app.js"></script>' + html.slice(j + '</script>'.length));
fs.writeFileSync(path.join(out, 'app.js'), html.slice(i + open.length, j));
console.log(`page → ${path.join(out, path.basename(src))}, script → ${path.join(out, 'app.js')}`);
