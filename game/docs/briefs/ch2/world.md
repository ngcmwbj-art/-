【あなたの担当: world（第2章のためのフィールドエンジンの拡張）】担当: src/world/**
主な参照: 02_ch2_index.md 6.2・6.3・7章「world & levels」、52_ch2_level_art.md（1章 区域・8章 光と影・9章 段階ごとの見た目・11章 シンボル・14章 QA基準）、51_ch2_battle.md 11章（シンボルの動き）、53_ch2_audio.md 4.2・7.3・17章（フィールド側から呼ぶ音）、50_ch2_story.md（トリガー・イベントの前提）

最初の30分でやること（levels チームがマップデータを書くために必要）: src/world/types.ts に 02 6.2 の型（MapDef.stageFlag / dark / chapter / zones、TriggerObj.stayMs と on:'stay'、ExamineObj.litOnly、SymbolObj.move の新しい値、タグ 'egate' など）を足し、既存マップが型エラーにならないことを確認する。

実装するもの（02 7章 world & levels の world 側。マップデータそのものは levels チーム）:
1. 段階の仕組みの一般化：MapDef.stageFlag、currentStage()、pickTalk の h キー、setStage、GRADES_H（夜 pal_h0〜h2、朝 pal_h3a〜c）、屋内の下地。既定は第1章の動きのまま
2. トマトの灯り（暗がりと光）：光のマップの4段、暗がりの中の物は灯りの中だけ描く・調べる、「？」、灯りの影とリムライト、はなまるトマトを取る前の光源。スマホでも60fpsが出るようにキャッシュする（02 6.3、52 8章）
3. シンボルの動き7種（51 11.2）、暗がりでの気づき方。テツヤのヘッドライト
4. on:'stay' のトリガー、ゲートの衝突タグ 'egate'、1.0秒の村の時計、呼び声のタイマー、位置の環境音・放送の距離・setPaMode/setSpace/h_stage の呼び出し（音のAPIが未実装なら安全に何もしない）
5. 段階ごとの見た目の切り替え（かかしの向き、防犯灯、蛾、水面の星、明けの明星など 52 9章。絵そのものは levels/chars が作る。あなたはそれを切り替える仕組み）
6. HUDの時計・地名のフィールド側（src/world/hud.ts。UIチームの src/ui/hud.ts と分担。02 6.2）
7. デバッグ：dark の表示、灯りの半径、段階切り替え（第2章）など
第2章のマップがまだ無い間は、テスト用の小さなマップを src/world 内のデバッグ用として作って確かめてよい（最終的には消すか、デバッグ専用として残す）。最後に第1章の通しテストで回帰がないことを確認する。
