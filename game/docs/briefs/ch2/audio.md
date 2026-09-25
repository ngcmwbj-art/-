【あなたの担当: audio（第2章のサウンド）】担当: src/audio/**
主な参照: 53_ch2_audio.md（最重要。全章、特に15章の優先度と14章の変更点）、02_ch2_index.md 6.5・7章 audio、50_ch2_story.md（台本の音のキュー）、51（戦闘の音楽パラメータ）
既存の参照: src/audio の第1章の実装（シーケンサ、楽器、曲、SE、環境音、ボイス、防災無線の PaChain、サウンドテスト、audioReport などのQAコマンド）

実装するもの:
1. 新曲3つ（bgm_hoshi_night＝段階でパートが足される、bgm_boss_yobimodoshi、bgm_hoshi_morning）と、戦闘曲・中ボス曲の夜の版。音楽パラメータ h_stage / h_light / tenko / h_rest、variant、RESUMABLE
2. 新楽器（ins_lantern, ins_reed_organ, drm_mic_tap, drm_cricket, drm_putt）
3. 朝のチャイム playMorningChime、防災無線の山の型と距離、呼び声、「……おはよう。」の声
4. 第2章のSE（sfx_ch2.ts）、環境音 amb_h_*（カエル、8月末の虫、用水路、電気柵のパルス、牛舎＝大きな換気扇と牛の鼻息・反すう、風と稲、遠いイノシシなど。牛の首の鎖やカウベルは鳴らさない＝53の正確さの表）、村人13の声
5. 空間 yama / barn、サウンドテストの「第2章」タブ
6. 音量・クリップ・ラウドネスを既存のQAコマンドで数値確認し、第1章の曲と並べて統一感を確かめる。封印した音形の自動検査（53 16.1）
第1章の音が変わらないこと（既存の曲・SEのデフォルト動作を変えない）。
