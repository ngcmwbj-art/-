// Chapter 2 battle system text (50_ch2_story.md 6.7–6.8, 7.1–7.4; 51 22章).
// One entry = pages; '\n' breaks a page into the band's two lines.
// Variables: $actor $target $enemy $n $item $part $name $name2

export const SYS2 = {
  // おつかれさま (50 6.8)
  otsukare: ['$enemyに『おつかれさま』を\n押した！', '$enemyは ひと息 ついた。\n次の 行動を 休む！'],
  otsukareFail: ['$enemyは 休む ひまが ないと\n言いたげだ。'],
  otsukareBoss: ['「……まだ、休めません。」'],
  otsukareResting: ['$enemyは もう 休憩中だ。'],
  restAct: ['$enemyは 休憩中だ。'],
  /** おかえりなさい chosen in a chapter-2 battle (no turn used). */
  okaeriCh2: ['これは、あの 子たちに\n押した ハンコだ。'],
  /** おやすみなさい chosen in a battle after the chapter-2 boss (no turn used). */
  oyasumiAfter: ['……いまは、押す ときじゃ ない。'],
  // level rewards (50 6.8, 51 16.4)
  lv6: ['カネナリくんの 鐘の 調子が\n少し よくなった！'],
  lv7: ['ミナトの ペケが\nはみだす ように なった！'],
  /** かねを鳴らす, Lv6 and up, when it rings (replaces pages 2–3). */
  kaneKon: ['……コン、と 小さく 鳴った。', 'いい 空気で、\nキレが 2つ たまった！'],
  pekeHamidashi: ['ペケが となりまで\nはみだした！'],
  pekeHamidashi1: ['はみだした ペケが、\nふちに もう一度 当たった！'],
  // statuses (50 6.7)
  henjiOnMinato: ['ミナトは つい『はい』と\n返事を しかけた！'],
  henjiOnKanenari: ['カネナリくんは フリップに\n『はい』と 書いてしまった！'],
  henjiAct: ['$targetは 返事の 口の まま\n固まっている。'],
  henjiOff: ['$targetは 口を とじた。'],
  henjiGuard: ['$targetは 返事を\nのみこんだ！'],
  suneAct: ['$enemyは 背中を 向けたままだ。'],
  // ビリビリ番 (50 6.3)
  shockFirst: ['……じーん と した。'],
  // はなまるトマト (50 6.7, 7.1)
  tomatoRaise: ['$actorは はなまるトマトを\nかかげた！', 'あたりが 夕焼け色に\n照らされた！'],
  tomatoRaiseKanenari: ['カネナリくんは アミを 受けとって、\nトマトを かかげた！', 'あたりが 夕焼け色に\n照らされた！'],
  tomatoDim: ['トマトの 光が、少し 落ちついた。'],
  tomatoCharging: ['トマトは まだ 光を\nためている。'],
  tomatoLit: ['トマトは いま、せいいっぱい\n光っている。'],
  /** Second line of the tomato's description in the boss battle's item list (13.3). */
  tomatoDesc2: 'かかげると、2ラウンド 明るい。',
  /** The dark ラッパ while it is being chosen (1 line). */
  rappaDark: '暗くて よく 見えない。',
  rappaDarkStamp: ['暗くて、どこを 見れば いいか\nわからない。'],
  rappaUnknown: 'ラッパ（？）',
  /** やりなおし on a name tag (50 6.8). */
  yarinaoshiTenko: ['名札が 1つ、白紙に もどった！'],
  // 梅干し and 回覧板の朱肉 on Kanenari-kun: kept, no turn (50 7.2)
  keepItem: [] as string[],
  /** ハトの名刺 on ヘノヘノ課長 (50 6.2): 課長 gets ボケ負け, the turn is used. */
  hatoMeishiKacho: ['ミナトは ハトの名刺を さしだした。', 'ヘノヘノ課長は 受けとって、\n困った 顔に 描きなおした。'],
  /** A retry of the boss: Kanenari-kun's flip says what beat them (the chapter-1 flip's twin). */
  retryFlip: '4つ目の 名前の 前は まもる',
  /** 〔にげる・テツヤ〕 (no turn). */
  noFleeTetsuya: ['テツヤが 山道の 入口を\n耕しつづけている。'],
};

/**
 * 点呼 names in order (50 3.2): the ones who left, called every night. The
 * boss starts again from the top when the list runs out.
 */
export const TENKO_NAMES = ['おぴぴちゃん', 'シュンスケくん', 'もとくん', 'アスカちゃん', 'サトシくん', 'タクミくん', 'クリコさん', 'タカシさん'];

/** The chapter-2 report card's せんせいより use REPORT.teacher[6|7]; the cover gets a small ②. */
export const REPORT_CH2 = {
  coverMark: '②',
  /** Prologue report card (chapter2Adjust level-ups): its heading. */
  summerTitle: 'なつやすみの つうちひょう',
};
