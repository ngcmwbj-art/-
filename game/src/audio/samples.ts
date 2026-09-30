// Sample lines for each dialog voice (sound test and offline QA renders).
// Short, in character, and original — just enough text for the blips to
// show their colour (pitch set, vowel formants, sentence-end lifts).

export const VOICE_SAMPLES: Record<string, string> = {
  narr: 'ゆうがたの 町に、かげが のびていく。',
  mother: 'しゅん、ごはんまでには かえってきなさいね。',
  maruyama: 'へい、らっしゃい！ 焼きそば 焼けたよ。',
  obaa: 'あんた、五時の チャイム、きこえたかい？',
  mamekichi: 'まいど！ きょうは なにに する？',
  inui: 'この 時計はね……すこし、おくれて いるんだ。',
  tsurumi: 'いじょう なし！ あそこの 公園の 鉄棒は いいぞー！',
  sae: 'ねえねえ、いまの 影、うごかなかった？',
  jk: 'あー、きょう なんか 長くない？',
  chugaku: 'べつに。……ふつう だろ。',
  postman: 'おとどけものです。ハンコ、おねがいします。',
  madam: 'あらあら、日が しずまない わねえ。負けない！',
  girl: 'わたし、ブランコ いちばん 高く こげるよ！',
  kid: 'ガチャ、また おなじの でた！',
  ojii: 'むかしはのう、この 川で よく あそんだ もんじゃ。',
  mizumaki: 'ほーら、つめたいぞー！',
  shadow: '…………まだ、かえらないの？ 限界です……',
  hato: 'クルッポー。ここから さきは とおせません。',
  dog: 'ワン！ ワンワン！',
  cat: 'にゃあ。',
  crow: 'カア。カア。',
  tv: 'つづいて、あしたの お天気です。',
  broadcast: 'こちらは、夕鳴町 役場です。まいごの おしらせです。',
  broadcast_child: '……だれか。',
  vending: 'イラッシャイマセ。アッタカ～イ。',
  omukaemachi: 'おむかえ、まだ かな。',
  flip: 'ようこそ 夕鳴町へ！',
  kanenari_voice: '……おいしい。',
  default: 'こんにちは。いい 夕方ですね。',
  // ゆう（時計店。02 #69）
  tokio: 'いらっしゃい。この店の 時計は、1秒も くるって いません。',
  // かずゆき（喫茶 夕顔。★2026-09-30 マスター→かずゆき、02 #71）とぶーさんの本体（02 #71）
  kazuyuki: 'いらっしゃい。豆は、星見台の じいさんが 焙煎して くれるんだ。',
  bu: 'ああ、影かい。公園で 残業してる だろう。',
  // グソっ君（★2026-09-29 カネナリくん→グソっ君。04_gusokkun_plan）
  gusokkun: 'な、なんやこれ……！ めっちゃ 美味いやんけ！',
  // マル（02 #65）、おぴぃ（02 #66）、よね・とよぞう（02 #67）
  maru: '5時の バスを 待っとるの。',
  tamotsu: '釣り？ してないよ。浮きを 浮かべてる だけ。',
  yone: 'ここから こっちが 夕鳴町。お茶は 1つの 水筒。',
  toyozou: 'じいさんの 代は、水の ことで 口も きかんかった。',
  // chapter 2 (53_ch2_audio 9)
  h_train: 'つぎは、星見台。星見台です。',
  h_tetsuya: '……マダ タガヤセマス。ヒト ウネ……モウ ヒト ウネ……。',
  yobimodoshi: '……くりこちゃん。……へんじが ありません。',
  h_mujin: 'きゅうり 3本 100円。おすすめです。',
  h_gon: 'キャン！ キャンキャン！',
  h_driver: 'おや、電車で 来たのかい。ぼくは 郵便配達の さんかど。',
  h_kucho: 'えー、星見台 区長の ハモで ございます。',
  h_yoshie: 'お茶 飲んで いきなさい。……ええから、食べなさい。',
  h_fumi: 'おはだっちょ！ ……いや、夜だったね。',
  h_mitsu: '……ほどよいなぁ。',
  h_gen: '誰が らっきょやねん！',
  h_tome: '水の 見回りじゃ。穂が 実を ためとる ところでな。',
  h_sawako: 'いらっしゃい。……あら、いらっしゃいって 言っちゃった。',
  broadcast_room: 'あー、あー。……本日は 晴天なり。',
  tsugao: '……ふむ。ご苦労。……偶然では ありませんな。',
  dakoku: 'マダ ホウコクガ アリマス。ガチャン。',
  // ツガオ便 (53 9.1, 9.2)
  hirosuke: 'ども！ おれは ヒロスケ。わはは！ ……焼き芋 食うか？',
  pokosha: '……あ。こ、こんばんは……。さすが 師匠！',
  piichan: 'ココッ？',
};

/**
 * Lines the mix is calibrated on (report.ts: audioReport, audioMixSuggest)
 * where a voice's sample shows off a rule that stands above its everyday
 * level on purpose: ヒロスケさん's laugh, ポコシャさん's 「さすが 師匠！」 (×1.8).
 * Their everyday lines sit on the fader; those moments ride above it.
 */
export const VOICE_CAL: Record<string, string> = {
  hirosuke: '師匠は、寝てるよ。朝の 5時に 起こす 決まりでね。',
  pokosha: '自分、ポコシャ、です。ツガオ師匠の、弟子を して います。',
};

/** Characters per second of the dialog box (10.1: 40 chars/s; {spd=0.4} for the last line). */
export function voiceCps(id: string): number {
  return id === 'kanenari_voice' ? 16 : id === 'omukaemachi' || id === 'shadow' || id === 'yobimodoshi' ? 28 : 40;
}
