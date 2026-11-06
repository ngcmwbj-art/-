#!/usr/bin/env bash
# まとめてテストを流す：  bash tests/run-all.sh
# 先にゲームのフォルダで簡易サーバーを立てておく： python3 -m http.server 8765
set -e
cd "$(dirname "$0")/.."
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
for t in mechanics simple input sim; do
  echo "== $t"
  node "tests/$t.cjs" | tee "/tmp/roach-$t.log"
  grep -q "^FAIL" "/tmp/roach-$t.log" && { echo "失敗あり: $t"; exit 1; }
  grep -q "^ERRORS 0" "/tmp/roach-$t.log" || { echo "エラーあり: $t"; exit 1; }
done
if [ -f dist/artifact.html ]; then echo "== artifact"; node tests/artifact.cjs; fi
echo "すべて通過"
