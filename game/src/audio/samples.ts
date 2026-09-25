// Sample lines for each dialog voice (sound test and offline QA renders).
// Short, in character, and original — just enough text for the blips to
// show their colour (pitch set, vowel formants, sentence-end lifts).

export const VOICE_SAMPLES: Record<string, string> = {
  narr: 'ゆうがたの 町に、かげが のびていく。',
  mother: 'ミナト、ごはんまでには かえってきなさいね。',
  maruyama: 'へい、らっしゃい！ コロッケ あがったよ。',
  obaa: 'あんた、五時の チャイム、きこえたかい？',
  mamekichi: 'まいど！ きょうは なにに する？',
  inui: 'この 時計はね……すこし、おくれて いるんだ。',
  tsurumi: 'こちら 夕鳴町 交番。いじょう なし！',
  sae: 'ねえねえ、いまの 影、うごかなかった？',
  jk: 'あー、きょう なんか 長くない？',
  chugaku: 'べつに。……ふつう だろ。',
  postman: 'おとどけものです。ハンコ、おねがいします。',
  madam: 'あらあら、日が しずまない わねえ。',
  girl: 'わたし、ブランコ いちばん 高く こげるよ！',
  kid: 'ガチャ、また おなじの でた！',
  ojii: 'むかしはのう、この 川で よく あそんだ もんじゃ。',
  mizumaki: 'ほーら、つめたいぞー！',
  shadow: '…………まだ、かえらないの？',
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
  // chapter 2 (53_ch2_audio 9)
  h_train: 'つぎは、星見台。星見台です。',
  h_tetsuya: '……マダ タガヤセマス。ヒト ウネ……モウ ヒト ウネ……。',
  yobimodoshi: '……ナナミちゃん。……へんじが ありません。',
  h_mujin: 'きゅうり 3本 100円。おすすめです。',
  h_gon: 'ワン。……ワフ。',
  broadcast_room: 'あー、あー。……本日は 晴天なり。',
};

/** Characters per second of the dialog box (10.1: 40 chars/s; {spd=0.4} for the last line). */
export function voiceCps(id: string): number {
  return id === 'kanenari_voice' ? 16 : id === 'omukaemachi' || id === 'shadow' || id === 'yobimodoshi' ? 28 : 40;
}
