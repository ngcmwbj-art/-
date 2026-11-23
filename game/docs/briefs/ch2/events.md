【あなたの担当: events（第2章のシナリオ実装）】担当: src/events/**（新規 src/events/ch2/*）、src/data/text/**（新規 hoshi_npcs.ts, hoshi_objects.ts, hoshi_events.ts）、tools/playthrough.mjs
主な参照: 50_ch2_story.md（最重要：全テキスト・台本・フラグ・NPC・ふしぎ・調べる物116）、02_ch2_index.md 4章（通しプレイ・自動テストのビート）・6.6・7章 events、53 12章（音のキューシート）、52（座標）、51（戦闘の呼び出し）
既存の参照: src/events（第1章のイベントの書き方、lib.ts、stage.ts、debug.ts の jump/CHAIN）、src/data/text、src/world/api.ts（registerScript などのスクリプトAPI）、src/ui（say/ask/choose、ショップ、セーブ）、src/battle/api.ts（startBattle）

進め方（他チームが並行してマップ・戦闘・UIを作っている）:
1. まずテキストを全部データにする：50の3章（NPC11の段階ごとの台詞、h0_1 のキー）、8章（ふしぎ10）、9章（調べる物116）、10章（全イベントの台本）を src/data/text/hoshi_*.ts に正確に写す（1メッセージ3行×全角21文字の規則を検証するスクリプトを回す）
2. 全イベントのスクリプト（evt_ch2_prologue 〜 evt_ch2_ending、evt_ch2_dark_block、セーブと休憩、ショップ、呼び声、カネナリくんの場所ごとのフリップ）を src/events/ch2/*.ts に。音の呼び出しは53 12章のキューシートどおり（未登録のSEは無音で進む）。マップ・スプライト・戦闘・UIの関数がまだ無い所は、設計書のIDとシグネチャで呼び、無ければ安全に飛ばす
3. デバッグ：CHAIN2 と __game.cmd.jump の第2章版（02 4.5）
4. tools/playthrough.mjs に --chapter 2 を足す（第1章の通しテストは今のまま動くこと）
5. できたところから実際にプレイしてスクリーンショットで確認（台詞の正確さ、間、カメラ、エモート、SE）
このラウンドで他チームの部品がそろわず通しで動かない所は、報告の「統合で残っていること」に一覧で書く。
