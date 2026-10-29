#!/usr/bin/env bash
# 公開ページ（GitHub Pages）を、今のゲームで更新する
# - 公開中のブランチ（PAGES_BRANCH）の farm-roguelike/ フォルダだけを入れ替える。ほかのゲームには触らない
# - 遊ぶのに要るもの（index.html・css・js・data・assets）だけを写す
# 使い方：bash farm-roguelike/tools/publish-pages.sh "何を変えたか（1行）"
set -euo pipefail
PAGES_BRANCH="${PAGES_BRANCH:-claude/kei-truck-runner-game-ngc2ni}"
GAME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(git -C "$GAME_DIR" rev-parse --show-toplevel)"
SRC_SHA="$(git -C "$REPO" rev-parse --short HEAD)"
WORK="$(mktemp -d)/pages"
MSG="${1:-最新に更新}"

git -C "$REPO" fetch -q origin "$PAGES_BRANCH"
git -C "$REPO" worktree add -q --detach "$WORK" "origin/$PAGES_BRANCH"
trap 'git -C "$REPO" worktree remove --force "$WORK" >/dev/null 2>&1 || true' EXIT

rm -rf "$WORK/farm-roguelike"
mkdir -p "$WORK/farm-roguelike"
cp -r "$GAME_DIR/index.html" "$GAME_DIR/css" "$GAME_DIR/js" "$GAME_DIR/data" "$GAME_DIR/assets" "$WORK/farm-roguelike/"
git -C "$WORK" add -A farm-roguelike
if git -C "$WORK" diff --cached --quiet; then echo "公開ページはすでに最新"; exit 0; fi
git -C "$WORK" commit -q -m "防農作戦（farm-roguelike）：$MSG

開発ブランチ claude/farming-roguelike-game-7r3v4g の $SRC_SHA 時点

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
for i in 1 2 3 4; do
  git -C "$WORK" push -q origin "HEAD:$PAGES_BRANCH" && break
  sleep $((2 ** i))
done
echo "公開ページを更新しました（$PAGES_BRANCH）"
