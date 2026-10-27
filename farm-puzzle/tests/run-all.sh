#!/bin/bash
# はたけパズルのテストをまとめて流す（Playwright と Chromium が入っていること）
#   使い方：farm-puzzle フォルダで  bash tests/run-all.sh
#   - localhost:8765 でゲームを配る（動いていなければここで起動する）
#   - 画面の写真は $SP（なければ一時フォルダ）に保存される
#   - 最後に「失敗」の数を出す。1つでもあれば終了コード 1
cd "$(dirname "$0")/.." || exit 1
export SP="${SP:-$(mktemp -d)}"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
curl -s localhost:8765 >/dev/null || (setsid python3 -m http.server 8765 >/dev/null 2>&1 &)
sleep 1
fail=0
for f in tests/t*.js; do
  if [ "$(basename "$f")" = "t38.js" ]; then
    # 画面のはみ出し点検は、文字の大きさ3段で（次の目標の「…」は意図どおりなので数えない）
    for big in false true xl; do
      out=$(BIG=$big timeout 300 node "$f" 2>&1)
      bad=$(echo "$out" | grep -E "^  " | grep -v "goal-text")
      if [ -n "$bad" ] || ! echo "$out" | grep -q "^errors \[\]"; then echo "失敗: $f ($big)"; echo "$out" | tail -8; fail=$((fail+1)); else echo "OK  : $f ($big)"; fi
    done
    continue
  fi
  out=$(timeout 300 node "$f" 2>&1)
  if echo "$out" | grep -q "^errors \[\]"; then echo "OK  : $f"; else echo "失敗: $f"; echo "$out" | tail -8; fail=$((fail+1)); fi
done
echo "---- 失敗 $fail 本 ----"
[ "$fail" -eq 0 ]
