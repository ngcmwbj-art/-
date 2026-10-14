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
  // かずゆき（喫茶 初日の出。★2026-09-30 マスター→かずゆき、02 #71）とぶーさんの本体（02 #71）
  kazuyuki: 'いらっしゃい。豆は、星見台の じいさんが 焙煎して くれるんだ。',
  bu: 'ああ、影かい。公園で 残業してる だろう。',
  // グソっ君（★2026-09-29 カネナリくん→グソっ君。04_gusokkun_plan）
  gusokkun: 'な、なんやこれ……！ めっちゃ 美味いやんけ！',
  // マル（02 #65）、おぴぃ（02 #66）、いつき・あさひ（02 #67）
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
  tsugao: '……ほうか。ご苦労じゃった。……偶然じゃ なかろう。',
  dakoku: 'マダ ホウコクガ アリマス。ガチャン。',
  // ツガオ便 (53 9.1, 9.2)
  hirosuke: 'ども！ おれは ヒロスケ。わはは！ ……焼き芋 食うか？',
  pokosha: '……あ。こ、こんばんは……。さすが 師匠！',
  piichan: 'ココッ？',
  // chapter 3 (63_ch3_audio 9.1, 9.2): 海ぞいの町
  c3_shokudo: 'おかわり、あるよ！ 遠慮 せんで 食べんさい。',
  c3_jouren: '……もう 1杯。',
  c3_seri: '……はい、ひゃくえん、ひゃく……',
  c3_seri_deshi: '……はい、売った！',
  c3_sirenban: '正午は、1秒も ずらさん。',
  c3_toudai: '昼の 灯台は、ひと休み しとるんよ。',
  c3_mago: 'じいちゃん、また 時計 見とる！',
  c3_kanshiin: 'ピッ！ ……あ、つい。',
  c3_himono_otto: '干しすぎ！ 干物は 干しすぎ くらいが ええ。',
  c3_himono_tsuma: '干したりない！ やわらかいのが ええの。',
  c3_tsuri: '釣れん ねえ。……まあ、ええか。',
  c3_uketsuke: 'ようこそ、お越し くださいました。',
  c3_kid: 'しゅん、どっから 来たん？',
  c3_kid_a: 'しゅん、どっから 来たん？',
  nariosame: '……マダ、鳴リ終ワリタク ナイ。',
  okawarinabe: 'おかわり……おかわり……。',
  kakaricho: 'なにを やっとるんだ。まだか。',
  pokosha_pa: '……そこは、立入禁止です。',
  tsugao_omote: '……でっけえ エビ、だな。',
  gusokkun_yowai: '……かっこ悪いな。',
  gusokkun_nurui: 'ぬるいのに、うまいわ。',
  c3_kid_b: 'それ、でっかい ダンゴムシ？',
  c3_kid_c: 'お昼、まだ 終わらんのよ。',
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
  // 海ぞいの町: their everyday lines (the whistle, 「売った！」 and the sigh ride apart)
  c3_kanshiin: '遊泳 区域は、旗の 内側 です。',
  c3_seri_deshi: 'セリは 朝です。いまは、止まって います。',
  c3_jouren: 'わしは 毎日、ここで 食う。',
  c3_seri: 'きょうの 最後の 1箱 じゃ。',
};

/** Characters per second of the dialog box (10.1: 40 chars/s; {spd=0.4} for the last line). */
export function voiceCps(id: string): number {
  return id === 'kanenari_voice' ? 16 : id === 'omukaemachi' || id === 'shadow' || id === 'yobimodoshi' ? 28 : 40;
}
