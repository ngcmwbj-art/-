【あなたの担当: ui（第2章のUI）】担当: src/ui/**（battle チームの src/ui/hankocase.ts, src/ui/menu/hanko.ts, src/ui/menu/stats.ts を除く）、src/game/state.ts（saveSnapshot/loadSnapshot の追加だけ）、1枚絵・章の扉・タイトルの差分
主な参照: 02_ch2_index.md 6.1・6.2・7章 ui、50_ch2_story.md 1.4（章の切り替え・セーブ・つづきから）・10章（台本の中のUI）、52_ch2_level_art.md 12章（タイトルの差分）・13章（UI：みました帳②、アイコン8つ、呼び声の吹き出し、HUDの時計）・1枚絵（cut_h_village_lit, cut_h_sunrise）・章の扉、51 13章（ボス戦のトマトの札など戦闘UIのうち ui 側の部品）
既存の参照: src/ui（title.ts, title_art.ts, flow.ts, save.ts, autosave.ts, hud.ts, menu/*, shop.ts, ending.ts, dialog.ts）

実装するもの:
1. 章の切り替え：第1章クリアデータの書き込み（markClear の後）、startChapter2('continue'|'title')、開始スナップショット、markClearCh2、つづきからの分岐、第2章クリア後の1ページ
2. タイトル：メニュー4つ（はじめる／つづきから／第2章から／せってい）、確認ダイアログ、つづきからの「第2章」の付箋、クリア後のカード2段、title_art の2つの差分
3. HUD：第2章の時計（4:59 など、コロンの扱い、プレート出しっぱなし）、地名、回覧板の地図（目的メモ）、呼び声の吹き出し
4. みました帳②と①②の切り替え、アイコン8つ、無人販売所のショップ、セーブのカードの②の数
5. 1枚絵 cut_h_village_lit（村の人は描かない）と cut_h_sunrise、章の扉（第2章のタイトルカード）
6. ボス戦の UI のうち ui 側の部品（battle チームと 51 13章で分担を確認。battle 側のファイルは編集しない）
第1章のタイトル・セーブ・オートセーブ・つづきからが変わらないこと。最後に第1章の通しテストを実行する。
