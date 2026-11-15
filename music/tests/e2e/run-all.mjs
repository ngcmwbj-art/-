// 画面を動かすテストをまとめて流す。  node tests/e2e/run-all.mjs
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
let failed = 0;
for (const file of ['app.check.mjs', 'coverflow.check.mjs']) {
  console.log(`\n══════ ${file} ══════`);
  const r = spawnSync(process.execPath, [join(here, file)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} 本のテストが落ちました` : '\n画面のテストはすべて通りました');
process.exit(failed ? 1 : 0);
