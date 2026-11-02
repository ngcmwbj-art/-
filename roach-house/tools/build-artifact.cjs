// 1ファイルで配れる版（dist/artifact.html）を作る。
// 使いかた： node tools/build-artifact.cjs   （esbuild を npx で使う）
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const esbuild = process.env.ESBUILD || 'npx --yes esbuild@0.24.0';
let js = execSync(`${esbuild} js/main.js --bundle --format=esm --external:three --minify --charset=utf8`, { cwd: root, maxBuffer: 1 << 26 }).toString();
js = js.replace(/from\s*"three"/g, `from"${THREE_URL}"`);
if (/from\s*"three"/.test(js) || !js.includes(THREE_URL)) throw new Error('three の読み込み先を置きかえられませんでした');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/)[0];
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script type="module"'));
const out = [
  title,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  fonts,
  `<style>\n${css}\n</style>`,
  body.trim(),
  `<script type="module">\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`,
  '',
].join('\n');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/artifact.html'), out);
console.log(`dist/artifact.html ${(out.length / 1024).toFixed(0)} KB`);
