// ゲームのソースを git から .work/<id>/ に取り出し、必要ならビルドする（ゲーム本体のファイルは書き換えない）
// 使い方：node scripts/prepare.mjs [id ...]   （--fetch で先に git fetch origin）
import { execSync } from 'node:child_process';
import { rmSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { REPO, WORK, loadGames, pickGames, git, gameRoot, log } from './lib.mjs';

if (process.argv.includes('--fetch')) execSync("git fetch origin '+refs/heads/*:refs/remotes/origin/*'", { cwd: REPO, stdio: 'inherit' });

const { games } = loadGames();
const built = new Map(); // 同じ ref+path+build は1回だけ（グソクの2本など）
for (const g of pickGames(games)) {
  const s = g.source;
  const commit = git('rev-parse', s.ref).trim();
  const key = `${commit}:${s.path}:${JSON.stringify(s.build || [])}`;
  const dest = path.join(WORK, g.id);
  const stamp = path.join(dest, '.prepared');
  if (existsSync(stamp) && readFileSync(stamp, 'utf8') === key) { log(`[${g.id}] 取り出し済み（${commit.slice(0, 7)}）`); continue; }
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  if (built.has(key)) {
    execSync(`cp -a "${built.get(key)}/." "${dest}/"`);
    log(`[${g.id}] ${built.get(key)} を複製`);
  } else {
    execSync(`git archive "${s.ref}" "${s.path}" | tar -x -C "${dest}"`, { cwd: REPO, stdio: 'inherit', shell: '/bin/bash' });
    log(`[${g.id}] ${s.ref}（${commit.slice(0, 7)}）の ${s.path}/ を取り出し`);
    for (const cmd of s.build || []) {
      log(`[${g.id}] ビルド：${cmd}`);
      execSync(cmd, { cwd: gameRoot(g), stdio: 'inherit' });
    }
    built.set(key, dest);
  }
  writeFileSync(stamp, key);
}
log('✓ 取り出し完了');
