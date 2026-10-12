// Dialog blips (40_audio 10). Each character has a waveform, a base note and
// a small scale; the pitch of every blip is chosen from the character code so
// a line always "sings" the same way. Kana vowels colour the tone with two
// band-passes (a hum, never words).

import { activeAmbients } from './ambience';
import { cur, dbToGain, hasGraph, midiHz, noteMidi, voice, type VoiceOpts, type Wave } from './engine';
import { currentId, duck, duckAmbience, musicParams } from './music';
import { sfxTable, type SfxOpts } from './registry';
import { setTextBlip } from './index';
import { trimOr1, voiceTrim } from './mix';
import { songTable } from './registry';
import { atTime } from './clock';

interface VoiceDef {
  label: string;
  wave: Wave | 'none';
  /** Second layer wave and its level. */
  wave2?: [Wave, number];
  base: string | number;
  scale: number[];
  /** Blip length (ms) and envelope. */
  len: number;
  A?: number;
  D?: number;
  S?: number;
  R?: number;
  every: number;
  v: number;
  formant?: boolean;
  child?: boolean;
  lp?: number;
  lpQ?: number;
  bp?: [number, number];
  vib?: [number, number];
  rev?: number;
  /** Each blip slides down (cents). */
  fall?: number;
  /** Each blip starts sharp and settles (cents, ms). */
  scoop?: [number, number];
  pa?: boolean;
  noise?: { bp: number; q: number; level: number };
  fixedSeq?: number[];
  /** Amplitude modulation on every blip: rate (Hz), depth, shape (an engine's grain). */
  am?: [number, number, OscillatorType?];
  /** Start every blip this many cents off and slide home (a rise at the attack). */
  scoopAll?: [number, number];
  /** 53 9.2: a page that starts with a name is called with the falling minor third (broadcast, yobimodoshi). */
  calls?: boolean;
}

export const VOICES: Record<string, VoiceDef> = {
  narr: { label: '地の文', wave: 'noise', base: 0, scale: [0], len: 12, A: 0, D: 10, S: 0, R: 4, every: 3, v: 0.012, bp: [3000, 1.5] },
  sys: { label: 'システム', wave: 'none', base: 0, scale: [0], len: 0, every: 99, v: 0 },
  mother: { label: '母', wave: 'triangle', base: 'A4', scale: [0, 2, 4, 7, 9], len: 40, A: 2, D: 30, S: 0.5, R: 15, every: 2, v: 0.07, formant: true },
  maruyama: { label: 'たかし（焼きそば屋）', wave: 'sine', base: 'D3', scale: [0, 3, 5, 7, 10], len: 45, every: 2, v: 0.09, lp: 1400 },
  obaa: { label: 'おばあ', wave: 'triangle', base: 'E4', scale: [0, 2, 5, 7], len: 50, every: 3, v: 0.06, formant: true, vib: [6, 25], noise: { bp: 2000, q: 1, level: 0.4 } },
  mamekichi: { label: 'くま吉', wave: 'square', base: 'C5', scale: [0, 2, 4, 7, 9, 12], len: 22, every: 2, v: 0.05, formant: true },
  inui: { label: 'えすけ', wave: 'triangle', base: 'G4', scale: [0, 2, 4], len: 55, A: 8, every: 3, v: 0.05, lp: 2000 },
  tsurumi: { label: 'ワイスタ巡査', wave: 'square', base: 'A4', scale: [0, 5, 7, 12], len: 20, A: 0, D: 15, S: 0, R: 8, every: 2, v: 0.05 },
  sae: { label: 'さや', wave: 'pulse25', base: 'D5', scale: [0, 2, 4, 7, 9], len: 26, every: 2, v: 0.05, formant: true, child: true },
  jk: { label: '女子高生', wave: 'triangle', wave2: ['square', 0.3], base: 'G4', scale: [0, 2, 4], len: 40, every: 3, v: 0.05, fall: -80 },
  chugaku: { label: '中学生', wave: 'square', base: 'A3', scale: [0, 3, 5, 7], len: 35, every: 2, v: 0.05, lp: 2400 },
  postman: { label: '郵便屋さん', wave: 'triangle', wave2: ['sine', 0.6], base: 'D4', scale: [0, 2, 4, 7, 9], len: 38, A: 5, every: 2, v: 0.06, lp: 1600 },
  madam: { label: 'なんばるわん', wave: 'triangle', base: 'C5', scale: [0, 4, 7, 9], len: 45, every: 3, v: 0.05, vib: [6, 35], rev: 0.2 },
  girl: { label: 'ひより', wave: 'triangle', base: 'E5', scale: [0, 2, 4, 7, 9, 12], len: 28, every: 2, v: 0.05, formant: true, child: true },
  kid: { label: 'ともき', wave: 'square', base: 'G5', scale: [0, 2, 4, 7], len: 20, every: 2, v: 0.045, formant: true, child: true },
  ojii: { label: 'しんご', wave: 'triangle', base: 'G3', scale: [0, 2, 5], len: 60, every: 3, v: 0.07, vib: [5, 20], formant: true },
  // マル (02 #65, 53 9.1): とまたろうの妻、89歳。小さく、やわらかく、ゆっくり。おばあ（E4・かすれ）、
  // ぴょん夫人（B4・速い）と、基準音・速さ・ビブラートで分ける
  maru: { label: 'マル（とまたろうの妻）', wave: 'triangle', base: 'G4', scale: [0, 2, 4, 7], len: 48, A: 6, every: 3, v: 0.055, vib: [5, 14], lp: 2200, formant: true },
  // おぴぃ (02 #66, 40 10。★2026-09-29 依頼主の指示で たもつ→おぴぃ、40代の女性。IDは 据え置き)：
  // 閉店した つりえさ屋。さっぱり・さばさば、口数 少なめで ぼそっと。中低音の C#4、
  // 間隔2の 歯切れで、各ブリップの 語尾を 少し 落とす（ぼそっと）。ビブラートなし。
  // ふでの先生（C4・ビブラート・リバーブ）、よね（D4・頭が はずむ）、きぬ（B4）、
  // 母（A4）、ちず・おかみ（F4）と、音の 高さ・語尾の 落ち・こもりで 分ける
  tamotsu: { label: 'おぴぃ（元つりえさ屋）', wave: 'triangle', wave2: ['square', 0.12], base: 'C#4', scale: [0, 2, 5, 7], len: 32, A: 2, D: 22, S: 0.4, R: 10, every: 2, v: 0.055, lp: 1900, fall: -45, formant: true },
  // ゆう (02 #69, 40 10。★2026-09-29 依頼主の指示で 時計店の ときお→ゆう、40代の女性。
  // 声を 郵便屋さん `postman` から 分けた。IDは npc_tokio に そろえて `tokio`)：
  // 丁寧で 落ち着いた 中音。三角波に サインを 重ねた まるい F#4、2文字に1音、
  // 各ブリップを +30セント 上げて 終える（語尾が 少し 上がる、ていねいな 声）。
  // ちず・おかみ（F4・矩形波25%・頭で はずむ）、母（A4・三角波だけ）、おぴぃ（C#4・
  // 語尾が 落ちる）、ふでの先生（C4・ビブラート）、よね（D4）、きぬ（B4）と 分ける
  tokio: { label: 'ゆう（時計店チクタク堂）', wave: 'triangle', wave2: ['sine', 0.4], base: 'F#4', scale: [0, 2, 5, 7, 9], len: 34, A: 3, D: 22, S: 0.5, R: 12, every: 2, v: 0.055, lp: 2400, fall: 30, formant: true },
  // よねと とよぞう (02 #67, 40 10): 円筒分水の 2人、70代。よねは 口が 早い 中音
  // （おばあ E4・かすれ、マル G4・ゆっくり と、速さと 声の 立ちあがりで 分ける）、
  // とよぞうは 低くて 言葉少な（トマじい E3、しんご G3 より 低く、まるい）
  yone: { label: 'よね（分水）', wave: 'triangle', wave2: ['square', 0.1], base: 'D4', scale: [0, 2, 4, 7, 9], len: 30, A: 2, every: 2, v: 0.055, vib: [6, 10], formant: true, scoop: [60, 15] },
  toyozou: { label: 'とよぞう（分水）', wave: 'triangle', wave2: ['sine', 0.5], base: 'A2', scale: [0, 2, 5, 7], len: 62, A: 6, every: 3, v: 0.07, vib: [4, 10], lp: 1500, formant: true },
  mizumaki: { label: 'ちず', wave: 'pulse25', base: 'F4', scale: [0, 4, 7, 12], len: 30, every: 2, v: 0.05, scoop: [100, 20] },
  shadow: { label: 'ぶーさん', wave: 'square', base: 'A3', scale: [0, 2, 3, 7], len: 40, every: 2, v: 0.05, lp: 500, lpQ: 2, rev: 0.3 },
  // ぶーさんの本体 (02 #71): the shadow's own voice without the muffle — the same
  // square A3 and set, the low-pass opened up (1.3 kHz, no Q, no reverb), the vowels on
  bu: { label: 'ぶーさんの本体（影と同じ声の、こもりを取った音）', wave: 'square', base: 'A3', scale: [0, 2, 3, 7], len: 40, every: 2, v: 0.05, lp: 1300, formant: true },
  // かずゆき (02 #71。★2026-09-30 依頼主の指示で 喫茶 初日の出の マスター→かずゆき、40代の男性。
  // 前の声は ペロ `h_mitsu`)：落ち着いた 中低音。サインに 三角波を 重ねた まるい A#3、
  // 2文字に1音、各ブリップを −20セントへ 少し 落として 終える（静かに 言い切る）。
  // ビブラートなし。ペロ（A3・3文字に1音・ビブラートと息）、ヒロスケ（B3・三角波・
  // ビブラート）、中学生（A3・矩形波）、グソっ君（C4・はずむ）、しんご（G3）、
  // たかし（D3・FM）と、高さ・波形・語尾で 分ける
  kazuyuki: { label: 'かずゆき（喫茶 初日の出）', wave: 'sine', wave2: ['triangle', 0.45], base: 'A#3', scale: [0, 2, 5, 7, 9], len: 42, A: 4, D: 28, S: 0.5, R: 14, every: 2, v: 0.06, lp: 1700, fall: -20, formant: true },
  hato: { label: 'ハト／ハト係長', wave: 'pulse12', base: 'E6', scale: [0, 2, 4], len: 14, every: 2, v: 0.035 },
  dog: { label: 'コタロウ', wave: 'square', base: 'A3', scale: [0, 0, 3], len: 30, every: 3, v: 0.05, lp: 900 },
  cat: { label: 'ネコ', wave: 'triangle', base: 'B5', scale: [0, 2], len: 12, every: 3, v: 0.03 },
  crow: { label: 'カラス', wave: 'sawtooth', base: 600, scale: [0], len: 40, every: 3, v: 0.04, bp: [1100, 3], noise: { bp: 1100, q: 3, level: 0.6 } },
  tv: { label: 'テレビ', wave: 'square', base: 'C5', scale: [0, 2, 4, 7], len: 24, every: 2, v: 0.04, bp: [1400, 2] },
  broadcast: { label: '防災無線', wave: 'sine', base: 'A4', scale: [0, 2, 4], len: 45, every: 2, v: 0.04, pa: true, noise: { bp: 1200, q: 4, level: 0.5 } },
  broadcast_child: { label: '放送の最後の1行', wave: 'triangle', base: 'A5', scale: [0, 2, 3, 7], len: 40, every: 3, v: 0.035, pa: true, formant: true, child: true },
  vending: { label: 'おじぎ自販機', wave: 'pulse12', base: 'A4', scale: [0], len: 60, every: 2, v: 0.04, formant: true, fixedSeq: [0, 0, -2, 0, 3, 0, -2, -2, -5, -5, -7] },
  omukaemachi: { label: 'オムカエマチ', wave: 'triangle', base: 'A5', scale: [0, 2, 3, 7], len: 40, every: 3, v: 0.035, formant: true, child: true, rev: 0.5 },
  flip: { label: 'フリップ（いまは未使用）', wave: 'sawtooth', base: 2000, scale: [0, 1], len: 35, every: 3, v: 0.02, bp: [2400, 4], vib: [28, 60] },
  kanenari_voice: { label: '初めての声（いまは未使用）', wave: 'triangle', wave2: ['sawtooth', 0.2], base: 'D3', scale: [0], len: 140, A: 20, R: 100, every: 1, v: 0.07, formant: true, rev: 0.35 },
  // グソっ君 (★2026-09-29 依頼主の指示で カネナリくん→グソっ君、04_gusokkun_plan 7):
  // はずむ 関西弁。明るい 中音の C4、矩形波25%に 三角波を 重ねて、短く 速い ブリップ。
  // 各ブリップの 頭が +70セントから はねて 落ちつき、音の 高さは 低い 組（0 2 4）と
  // 高い 組（5 7 9）を 交互に とって 上下に はずむ。語尾は はっきり 曲がる：「、」「！」で
  // 上がり（〜やで↑、美味いやんけ↑）、「？」で 大きく 上がり、「。」で 下がる（〜や↓）。
  // くま吉（C5・矩形波）、ワイスタ巡査（A4・矩形波）、区長（G3・25%・ゆっくり）、
  // ちず（F4・25%）、ヒロスケ（B3・三角波）、ポコシャ（D4・サイン）と 分ける
  gusokkun: { label: 'グソっ君', wave: 'pulse25', wave2: ['triangle', 0.35], base: 'C4', scale: [0, 2, 4, 5, 7, 9], len: 24, A: 1, D: 16, S: 0.45, R: 8, every: 2, v: 0.055, lp: 2600, scoop: [70, 16], formant: true },
  default: { label: '（指定なし）', wave: 'triangle', base: 'A4', scale: [0, 2, 4, 7, 9], len: 30, every: 2, v: 0.045, formant: true },
  // ---- chapter 2 (53_ch2_audio 9.1). The ids keep the first cast's names (50 3.2);
  // the five men of the village and さんかど never share base, wave, set and pace
  h_driver: { label: 'さんかど（郵便配達員）', wave: 'triangle', base: 'E4', scale: [0, 2, 4, 7], len: 34, A: 3, D: 20, S: 0.45, R: 10, every: 2, v: 0.055, lp: 2000, formant: true },
  h_kucho: { label: 'ハモ区長', wave: 'pulse25', base: 'G3', scale: [0, 2, 4, 5, 7], len: 42, every: 2, v: 0.06, lp: 2000, formant: true },
  h_yoshie: { label: 'ぴょん夫人', wave: 'triangle', base: 'B4', scale: [0, 2, 4, 7], len: 28, every: 2, v: 0.055, formant: true },
  h_fumi: { label: 'まつ先生', wave: 'triangle', base: 'C4', scale: [0, 2, 4, 7, 9], len: 46, A: 4, every: 2, v: 0.055, vib: [5, 6], rev: 0.15, formant: true, noise: { bp: 2000, q: 1, level: 0.08 } },
  h_mitsu: { label: 'ペロ', wave: 'triangle', base: 'A3', scale: [0, 3, 5, 7], len: 52, A: 6, every: 3, v: 0.06, lp: 1500, vib: [4, 8], formant: true, noise: { bp: 1200, q: 1, level: 0.12 } },
  h_gen: { label: 'マサル', wave: 'square', base: 'F3', scale: [0, 3, 5, 7], len: 26, A: 0, D: 20, S: 0, every: 3, v: 0.06, lp: 1600, formant: true },
  h_tome: { label: 'トマじい', wave: 'triangle', base: 'E3', scale: [0, 2, 5], len: 70, every: 3, v: 0.07, vib: [4.5, 18], formant: true },
  h_sawako: { label: 'ソワカ', wave: 'triangle', base: 'E5', scale: [0, 2, 4, 7, 9, 12], len: 32, every: 2, v: 0.05, scoop: [80, 20], formant: true },
  h_train: { label: 'みっちゃそ（車内放送）', wave: 'square', base: 'F4', scale: [0, 2, 4], len: 36, every: 2, v: 0.04, bp: [1300, 2], rev: 0.2 },
  h_tetsuya: { label: '耕うん機テツヤ', wave: 'pulse12', base: 'D4', scale: [0], len: 50, A: 1, every: 2, v: 0.045, fixedSeq: [0, 0, 2, 0], am: [15, 0.6, 'square'] },
  yobimodoshi: { label: 'ヨビモドシ', wave: 'sine', base: 'G4', scale: [0, 2, 3, 7], len: 50, every: 2, v: 0.045, pa: true, noise: { bp: 1200, q: 4, level: 0.5 }, calls: true },
  h_mujin: { label: 'ムジン販売員の札', wave: 'sawtooth', base: 1600, scale: [0, 1], len: 35, every: 3, v: 0.02, bp: [2000, 4], vib: [28, 60] },
  // ふくじんづけ (a papillon; the id is the first cast's dog): コタロウ's bark +5, a small dog's 「キャン」
  h_gon: { label: 'ふくじんづけ（パピヨン）', wave: 'square', base: 'D4', scale: [0, 0, 5], len: 22, every: 3, v: 0.045, lp: 1600 },
  // ツガオ (53 9.1; chapter 3 hears them again): the calm, heavy boss of まだまだ団 — and, the
  // same voice, the village's ツガオさん of ツガオ便 (the room adds its reverb .25: roomRev)
  tsugao: { label: 'ツガオ（ツガオ便／まだまだ団の団長）', wave: 'sawtooth', base: 'D3', scale: [0, 1, 5, 7], len: 50, A: 6, every: 3, v: 0.05, lp: 900, vib: [3, 5], formant: true },
  dakoku: { label: 'エゴ（タイムレコーダー）', wave: 'pulse12', base: 'C5', scale: [0], len: 25, every: 2, v: 0.035, fixedSeq: [0, 0, 7, 0] },
  // ツガオ便's two (53 9.1, 9.2): ヒロスケさん, 44, sociable, talks a lot and laughs (a beard in the way);
  // ポコシャさん, 40, a big man with a small shy voice; ぴーちゃん, a hen (no blips: one call a page)
  hirosuke: { label: 'ヒロスケ（ツガオ便）', wave: 'triangle', base: 'B3', scale: [0, 2, 4, 7], len: 30, A: 2, every: 2, v: 0.06, lp: 2000, vib: [5, 8], formant: true, noise: { bp: 900, q: 1, level: 0.03 } },
  pokosha: { label: 'ポコシャ（ツガオ便）', wave: 'sine', wave2: ['triangle', 0.25], base: 'D4', scale: [0, 2, 3], len: 32, A: 8, every: 3, v: 0.035, lp: 1400, formant: true },
  piichan: { label: 'ぴーちゃん（めんどり）', wave: 'none', base: 0, scale: [0], len: 0, every: 99, v: 0 },
  // the branch school's broadcast room: its own small speaker, not the hill's (ふしぎ10, 53 8.9)
  broadcast_room: { label: '放送室のスピーカー', wave: 'sine', base: 'A4', scale: [0, 2, 4], len: 45, every: 2, v: 0.04, lp: 800, noise: { bp: 900, q: 3, level: 0.4 }, rev: 0.15 },
  // ---- chapter 3 (63_ch3_audio 9.1): 海ぞいの町. The names are provisional, so the
  // voices are named by role (npc_c3_shokudo → c3_shokudo) and never follow a
  // renamed name tag. No two share base, wave, set and pace with each other or
  // with the voices of chapters 1–2 (16.2)
  c3_shokudo: { label: 'ナミエ（食堂かもめのおかみ）', wave: 'triangle', wave2: ['sine', 0.4], base: 'G4', scale: [0, 2, 4, 7, 9, 12], len: 30, A: 2, D: 20, S: 0.5, R: 12, every: 2, v: 0.06, lp: 2600, scoop: [60, 15], formant: true },
  c3_jouren: { label: 'ゴロウ（常連の漁師）', wave: 'sawtooth', wave2: ['triangle', 0.5], base: 'F#3', scale: [0, 3, 5], len: 58, A: 6, every: 3, v: 0.065, lp: 1100, formant: true },
  c3_seri: { label: 'ゲン（セリ人）', wave: 'pulse25', base: 'B3', scale: [0, 2, 4, 5, 7], len: 26, A: 1, D: 18, S: 0.4, R: 8, every: 1, v: 0.07, lp: 2400, formant: true },
  c3_seri_deshi: { label: 'ツグミ（若いセリ人）', wave: 'sine', wave2: ['triangle', 0.3], base: 'C#5', scale: [0, 2, 4, 7], len: 26, A: 4, every: 3, v: 0.035, lp: 2200, formant: true },
  c3_sirenban: { label: 'ミナト（サイレン塔の番人）', wave: 'pulse12', wave2: ['triangle', 0.4], base: 'E3', scale: [0, 2, 5, 7], len: 40, A: 0, D: 25, S: 0, every: 2, v: 0.06, lp: 1600, formant: true },
  c3_toudai: { label: 'テル（灯台のおばあ）', wave: 'triangle', base: 'F#4', scale: [0, 2, 4, 7], len: 52, A: 6, every: 3, v: 0.055, vib: [5, 16], formant: true },
  c3_mago: { label: 'ウミ（ミナトとテルの孫）', wave: 'pulse25', wave2: ['triangle', 0.3], base: 'F5', scale: [0, 2, 4, 7, 9], len: 22, A: 1, every: 2, v: 0.05, formant: true, child: true },
  c3_kanshiin: { label: 'カイト（監視員）', wave: 'square', base: 'D#4', scale: [0, 4, 7], len: 24, A: 0, D: 18, S: 0, every: 2, v: 0.05, lp: 2800, formant: true },
  c3_himono_otto: { label: 'ホシオ（干物屋の夫）', wave: 'sawtooth', base: 'A3', scale: [0, 3, 5], len: 30, every: 2, v: 0.055, lp: 1600, formant: true },
  c3_himono_tsuma: { label: 'ホシミ（干物屋の妻）', wave: 'sawtooth', base: 'A4', scale: [0, 3, 5], len: 30, every: 2, v: 0.05, lp: 2000, formant: true },
  c3_tsuri: { label: 'ツリノ（防波堤の釣り人）', wave: 'triangle', wave2: ['sine', 0.5], base: 'G#3', scale: [0, 2, 5], len: 75, A: 8, every: 4, v: 0.06, vib: [4, 10], formant: true },
  c3_uketsuke: { label: 'ハキコ（元・受付）', wave: 'sine', wave2: ['triangle', 0.25], base: 'A#4', scale: [0, 2, 4], len: 34, A: 3, every: 2, v: 0.045, lp: 2200, rev: 0.15, formant: true },
  c3_kid: { label: '防波堤の子ども', wave: 'square', base: 'A5', scale: [0, 2, 4, 7], len: 20, every: 2, v: 0.045, formant: true, child: true },
  // the two that are not people (9.1): the retiring siren speaks through its own
  // tower's speaker (bus_pa 'umi'), each blip rising like the head of the siren;
  // the big pot whose lid never closes bubbles after every blip
  nariosame: { label: 'ナリオサメ（引退するサイレン）', wave: 'sawtooth', wave2: ['square', 0.6], base: 'E4', scale: [0, 3, 7], len: 55, every: 3, v: 0.04, bp: [659, 0.8], pa: true, scoopAll: [-400, 50] },
  okawarinabe: { label: 'オカワリナベ（ふたの閉まらない大鍋）', wave: 'square', base: 'C3', scale: [0, 0, 5], len: 45, every: 3, v: 0.04, lp: 800 },
  // 係長の声 (63 9.1): the black balloons only ポコシャ hears — never words (two
  // notes a semitone apart), hard and muddy, ringing inside his head; never
  // louder than ポコシャ's own big voice (v .04 at most)
  kakaricho: { label: '係長の声（黒い吹き出し）', wave: 'square', wave2: ['sawtooth', 0.6], base: 'G2', scale: [0, 1], len: 45, A: 0, D: 30, S: 0.6, R: 10, every: 2, v: 0.04, lp: 700, rev: 0.4 },
};
// the three children of the breakwater: the same voice at +0 / +2 / −2 (63 9.1)
VOICES.c3_kid_a = { ...VOICES.c3_kid, label: '防波堤の子ども（1）' };
VOICES.c3_kid_b = { ...VOICES.c3_kid, label: '防波堤の子ども（2）', base: 'B5' };
VOICES.c3_kid_c = { ...VOICES.c3_kid, label: '防波堤の子ども（3）', base: 'G5' };
// 星見台 calls the names on the same speaker as the town's broadcast (53 9.2)
VOICES.broadcast.calls = true;
// 旧水族館 (63 9.2): ポコシャ on the ceiling speakers (bus_pa 'kannai', ×1.4 — the
// one place he can be heard best); ツガオ's 表の声 for the one page
// 「……でっけえ エビ、だな。」 (S20); グソっ君 low on himself in the store room
// (S21: no bounce, the low set, slower, ×0.7) and coming back (half the bounce)
VOICES.pokosha_pa = { ...VOICES.pokosha, label: 'ポコシャ（館内放送）', v: VOICES.pokosha.v * 1.4, pa: true };
VOICES.tsugao_omote = { ...VOICES.tsugao, label: 'ツガオ（表の声。S20 の「でっけえ エビ」）' };
VOICES.gusokkun_yowai = { ...VOICES.gusokkun, label: 'グソっ君（弱る。S21）', scale: [0, 2, 4], every: 3, v: VOICES.gusokkun.v * 0.7, scoop: undefined };
VOICES.gusokkun_nurui = { ...VOICES.gusokkun, label: 'グソっ君（はずみが半分もどる。S21）', scoop: [35, 16] };

const ALIAS: Record<string, string> = {
  // (kanenari / npc_kanenari: グソっ君 talks now, ★2026-09-29 — no more flip board)
  mom: 'mother', haha: 'mother', kanenari: 'gusokkun', old: 'obaa', narration: 'narr', narrator: 'narr', system: 'sys',
  sand_girl: 'girl', gacha_boy: 'kid', shadow_man: 'shadow', kotaro: 'dog', minato: 'none', omu: 'omukaemachi',
  // chapter 2: @npc_hoshi_* speak with their h_* voice (53 9.1)
  hoshi_mitsu: 'h_mitsu', hoshi_gen: 'h_gen', hoshi_fumi: 'h_fumi', hoshi_kucho: 'h_kucho', hoshi_yoshie: 'h_yoshie',
  hoshi_tome: 'h_tome', hoshi_sawako: 'h_sawako', hoshi_busdriver: 'h_driver', hoshi_driver: 'h_driver',
  hoshi_traindriver: 'h_train', hoshi_gon: 'h_gon', hoshi_speaker: 'broadcast', hoshi_mujin: 'h_mujin',
  tetsuya: 'h_tetsuya', boss_yobimodoshi: 'yobimodoshi', mujin: 'h_mujin', gon: 'h_gon',
  // chapter 3: ヤキソバン is たかし (63 9.1)
  yakisoban: 'maruyama',
};

// ---------------------------------------------------------------------------
// text helpers

const SILENT = new Set([...' 　、。，．,.…‥―ー－-「」『』（）()！？!?・〜~ゃゅょっぁぃぅぇぉゎァィゥェォャュョッヮ♪★☆◆◇■□○●“”"\'：:；;／/＿_']);

const VOWEL_OF: Record<string, string> = {};
{
  const rows: [string, string][] = [
    ['a', 'あかさたなはまやらわがざだばぱアカサタナハマヤラワガザダバパ'],
    ['i', 'いきしちにひみりぎじぢびぴイキシチニヒミリギジヂビピ'],
    ['u', 'うくすつぬふむゆるぐずづぶぷウクスツヌフムユルグズヅブプヴ'],
    ['e', 'えけせてねへめれげぜでべぺエケセテネヘメレゲゼデベペ'],
    ['o', 'おこそとのほもよろをごぞどぼぽオコソトノホモヨロヲゴゾドボポ'],
    ['n', 'んン'],
  ];
  for (const [v, chars] of rows) for (const ch of chars) VOWEL_OF[ch] = v;
}
const FORMANT: Record<string, [number, number]> = { a: [800, 1250], i: [300, 2300], u: [330, 1400], e: [480, 1900], o: [500, 850] };

function vowelOf(ch: string): string {
  const v = VOWEL_OF[ch];
  if (v) return v;
  const code = ch.codePointAt(0) ?? 0;
  return 'aiueo'[code % 5];
}

function hashCh(ch: string): number {
  let h = ch.codePointAt(0) ?? 0;
  h = Math.imul(h ^ (h >>> 7), 0x5bd1e995);
  h ^= h >>> 13;
  return h >>> 0;
}

// ---------------------------------------------------------------------------

interface State {
  last: number;
  lastSemi: number;
  repeat: number;
  seqI: number;
  lastMidi: number;
  lastT: number;
  /** The last three pitches (semitones from the base), for the sealed-answer guard. */
  hist: number[];
  /** The next voiced character opens a line (a pause, or after 。). */
  lineStart?: boolean;
  /** This line calls a name (53 9.2): blips counted from its start. */
  nameLine?: boolean;
  nameI?: number;
  /** The last character given, voiced or not (ちゃん / くん / さん). */
  prevCh?: string;
  /** マサルさん's tsukkomi page (53 9.2). */
  tsukkomi?: boolean;
  /** How far into まつ先生's 「おはだっちょ」 the page is (0 = not). */
  oha?: number;
  /** ふくじんづけ is asleep for the rest of the page (「……ぷすー。」). */
  asleep?: boolean;
  /** ツガオ's 「つがおちゃん 寝る〜♪」 page: an octave up, bright and bouncing. */
  chan?: boolean;
  /** エゴの「ガチャン」: the rest of the word is the machine, not a blip. */
  gachan?: number;
  /** The last character of any kind (voiced or not): a page starts after 0.8 s of none. */
  lastAny?: number;
  /** The page opened with 「……」 (ポコシャさん hesitates before his first word). */
  headDots?: boolean;
  /** No voiced character of this page has sounded yet. */
  firstVoiced?: boolean;
  /** The next voiced character opens a line (a page, or after 。！？…). */
  lineHead?: boolean;
  /** ツガオ in the village: the first page after a long sleep (one eye open). */
  wake?: boolean;
  /** ヒロスケさん: 1 after the ど of 「ども」. */
  domo?: number;
  /** ヒロスケさん laughing (「わはは」「はっはっは」): the next step of 0 +4 +7, 0 = not. */
  laugh?: number;
  /** ヒロスケさん's 「焼き芋 食うか？」 line. */
  imo?: boolean;
  /** ポコシャさん's 「さすが 師匠」: how far into it (0 = not), and how it comes out. */
  sasuga?: number;
  sasugaForm?: 'loud' | 'quiet';
  /** ポコシャさん after blurting it out: 1 = the next page is small, 2 = this page is. */
  shy?: number;
  /** ポコシャさん stammered 「こ、こ」: the character that repeats (it always sounds). */
  stam?: string;
  /** ポコシャさん's hesitation: no blip of his sounds before this (ctx time). */
  quietUntil?: number;
  /** ぴーちゃん's one call of the page, decided by its letters (53 9.1). */
  hen?: Hen;
  /** グソっ君: blips since his phrase began (low / high sets in turn). */
  bounce?: number;
  /** 海ぞいの町 (63 9.2): the last voiced characters of the page (「ごちそう……」). */
  c3recent?: string;
  /** The siren already cut this line short. */
  c3siren?: boolean;
  /** A fixed figure under way on this page: its notes and how far into it. */
  c3fig?: number[];
  c3figI?: number;
  /** ゲン's 「ひゃく」: 1 after the ひ. */
  hyaku?: number;
  /** ツグミ's 「売った！」 out loud (1), and the page after it (2: small). */
  utta?: number;
  /** カイト's page that opened with his whistle (the rest ×0.8). */
  fue?: boolean;
  /** ゴロウ's 「……もう」 page (a breath before it, a sigh at the end). */
  mou?: boolean;
  /** ヤキソバン's 「ヤキソバン、出前に 参上。」 page (1; its M10 blips counted in ykI), and the page after it (2: shy). */
  yk?: number;
  ykI?: number;
  /** ポコシャ's 「……自分は、悪く ない！」: how far into 悪く ない (1–4), 5 done; and the small page after it. */
  ookii?: number;
  ookiiAfter?: boolean;
}

interface Hen {
  kind: 'koko' | 'koke' | 'kuu' | null;
  first: string;
  q: boolean;
  said: boolean;
  t: number;
}
const st: Record<string, State> = {};
let kanenariSeq = 0;
/** Which of Kanenari's two words is being said (the character after お decides: 53 9.3). */
let kanenariWord: 'oishii' | 'ohayou' = 'oishii';
let paSwellCheck: { t: number } | null = null;

/** QA: forget the per-voice spacing state (offline renders start at t = 0). */
export function resetVoiceState(): void {
  // (an offline render ends here: a character still held is said)
  flushHeld();
  for (const k of Object.keys(st)) delete st[k];
  kanenariSeq = 0;
  kanenariWord = 'oishii';
}

export function resolveVoice(voiceId: string): string {
  return resolve(voiceId);
}

function resolve(id: string): string {
  let v = id.startsWith('npc_') ? id.slice(4) : id;
  v = ALIAS[v] ?? v;
  return v;
}

function isBattle(): boolean {
  const id = currentId();
  return !!id && !!songTable.get(id)?.battle;
}

/**
 * A character held back until the next one decides how it sounds (53 9.2:
 * ハモ区長's 「えー」, ペロ's 「なぁ」). It is let go 60 ms later at most.
 */
type HoldKind = 'ee' | 'naa' | 'tsu' | 'ga' | 'wa' | 'ha' | 'ka' | 'word';
type BlipMode = 'plain' | 'ee' | 'naa' | 'chan' | 'gachan' | 'laugh' | 'imo' | 'stam' | 'sasuga';
let held: { id: string; ch: string; t: number; kind: HoldKind; allowed: boolean } | null = null;

/** What the character after a held one makes of it (null: it is said as it is). */
function heldBecomes(kind: HoldKind, heldCh: string, next: string): BlipMode | null {
  switch (kind) {
    case 'ee':
      return next === 'ー' ? 'ee' : null;
    case 'naa':
      return next === 'ぁ' ? 'naa' : null;
    case 'tsu':
      return next === 'が' ? 'chan' : null;
    case 'ga':
      return next === 'チ' ? 'gachan' : null;
    // ヒロスケさん's 「わはは」 / 「はっはっは」
    case 'wa':
      return next === 'は' ? 'laugh' : null;
    case 'ha':
      return next === 'っ' ? 'laugh' : null;
    // 「……焼き芋 食うか？」: the last か bounces up
    case 'ka':
      return next === '？' || next === '?' ? 'imo' : null;
    // ポコシャさん: a word's first letter — 「こ、こんばんは」 or 「さすが 師匠」
    case 'word':
      return next === '、' ? 'stam' : heldCh === 'さ' && next === 'す' ? 'sasuga' : null;
  }
}

/** One dialog character. `at` (ctx time) is only for offline renders (QA). */
export function blip(voiceId: string, ch: string, at?: number): void {
  if (!hasGraph()) return;
  const id = resolve(voiceId);
  if (id === 'none' || id === 'sys') return;
  const now = at ?? cur().ctx.currentTime;
  if (held) {
    const h = held;
    held = null;
    const becomes = h.id === id ? heldBecomes(h.kind, h.ch, ch) : null;
    if (becomes) blipAt(h.id, h.ch, h.t, becomes);
    else if (h.allowed) blipAt(h.id, h.ch, h.t, 'plain');
  }
  blipAt(id, ch, now);
}

/** Let a held character go (the line ended on it), and a hen's call still waiting. */
function flushHeld(): void {
  if (held) {
    const h = held;
    held = null;
    if (h.allowed) blipAt(h.id, h.ch, h.t, 'plain');
  }
  const hen = st.piichan?.hen;
  if (hen && !hen.said) sayHen(hen, hen.t + 0.12);
}

/**
 * ツガオの部屋 (cut 7): its reverb for ツガオ, the whisper behind the frosted
 * door for ポコシャさん and ぴーちゃん (53 9.1, 9.2). In the village the same
 * voices are dry — the place's own space (yama) is their room.
 */
function inTsugaoRoom(): boolean {
  return currentId() === 'bgm_tsugao' || activeAmbients().includes('amb_tsugao_room');
}

const LINE_END = '。！？!?\n';
/** Characters after which a word begins (ポコシャさん's stammer and 「さすが」). */
const WORD_EDGE = '…‥、。！？!? 　\n';

/**
 * ぴーちゃん (53 9.1, 9.2): no blips — one call at the head of the page, the
 * one its letters say (「ココッ」「コケッ」「クゥ」); a 「？」 lifts its last sound
 * +3. Heard when the line tells which (at its 。？！, or 0.15 s in).
 */
function henChar(s: State, ch: string, now: number, pageStart: boolean): void {
  if (pageStart || !s.hen) {
    if (s.hen && !s.hen.said) sayHen(s.hen, now);
    s.hen = { kind: null, first: '', q: false, said: false, t: now };
  }
  const h = s.hen;
  if (h.said) return;
  if (ch === 'ク' || ch === 'く') h.kind = 'kuu';
  else if (ch === 'コ' || ch === 'こ') {
    if (h.first) h.kind ??= 'koko';
    h.first = 'コ';
  } else if ((ch === 'ケ' || ch === 'け') && h.first) h.kind = 'koke';
  if (ch === '？' || ch === '?') h.q = true;
  if (LINE_END.includes(ch)) {
    sayHen(h, now);
    return;
  }
  if (!cur().offline && (h.first || h.kind)) {
    atTime(now + 0.15, () => {
      if (!h.said) sayHen(h, Math.max(now + 0.15, cur().ctx.currentTime));
    });
  }
}
function sayHen(h: Hen, at: number): void {
  if (h.said) return;
  h.said = true;
  const kind = h.kind ?? (h.first ? 'koko' : null);
  if (!kind) return;
  const g = cur();
  const room = inTsugaoRoom();
  const o: SfxOpts & { dest: AudioNode; rev: number } = { at, vol: room ? 0.6 : 1, note: h.q ? 'q' : undefined, dest: g.voiceBus, rev: room ? 0.3 : 0.08 };
  sfxTable.get(`se_piichan_${kind}`)?.(o);
  if (!g.offline && !isBattle()) duck(dbToGain(-2), 0.15, 0.35, 0.4);
}

function blipAt(id: string, ch: string, now: number, mode?: BlipMode): void {
  const def = VOICES[id] ?? VOICES.default;
  const g = cur();
  const s = (st[id] ??= { last: -1, lastSemi: 99, repeat: 0, seqI: 0, lastMidi: 60, lastT: 0, hist: [], lineStart: true });
  const prevCh = s.prevCh;
  s.prevCh = ch;
  // a page, counting every character (the dots too): 0.8 s of nothing before it
  const pageStart = mode === undefined && (s.lastAny === undefined || now - s.lastAny > 0.8);
  if (mode === undefined) s.lastAny = now;
  if (pageStart) {
    s.headDots = ch === '…' || ch === '‥';
    s.firstVoiced = true;
    s.lineHead = true;
    s.laugh = 0;
    s.imo = false;
    s.sasuga = 0;
    s.stam = undefined;
    s.quietUntil = undefined;
    // ポコシャさん: the page after his outburst is small; the one after that, his usual
    s.shy = s.shy === 1 ? 2 : 0;
    // 海ぞいの町 (63 9.2)
    s.c3recent = '';
    s.c3siren = false;
    s.c3fig = undefined;
    s.hyaku = 0;
    s.utta = s.utta === 1 ? 2 : 0;
    s.fue = false;
    s.mou = false;
    // 旧水族館 (63 9.2)
    s.yk = s.yk === 1 ? 2 : 0;
    s.ookiiAfter = !!s.ookii && s.ookii >= 2;
    s.ookii = 0;
  }
  if (id === 'piichan') {
    henChar(s, ch, now, pageStart);
    return;
  }
  // a page: the first character after a pause (0.8 s, 53 9.2)
  const pageHead = now - s.lastT > 0.8 || s.lastT === 0;
  if (pageHead && mode === undefined) {
    s.tsukkomi = false;
    s.oha = 0;
    s.asleep = false;
    s.chan = false;
    s.domo = 0;
    // ツガオさん in the village wakes for his first page after a long sleep (53 9.2)
    if (id === 'tsugao') s.wake = (s.lastT === 0 || now - s.lastT > 20) && !inTsugaoRoom();
  }
  if (mode === 'chan') s.chan = true;
  // 旧水族館 (63 9.2: S15〜S24): ツガオ and ヒロスケ speak with their 裏の顔
  const ura = (id === 'tsugao' || id === 'hirosuke') && musicParams().c3_phase === 2;
  // エゴの「ガチャン」: the machine punches the card where the word stands (53 9.2)
  if (mode === 'gachan') {
    s.gachan = 2;
    s.lastT = now;
    sfxTable.get('se_dakoku')?.({ at: now });
    return;
  }
  if (id === 'dakoku' && s.gachan && (ch === 'チ' || ch === 'ャ' || ch === 'ン')) {
    if (ch === 'ン') s.gachan = 0;
    return;
  }
  // a name line (53 9.2) ends with its sentence; a pause opens a new line.
  // Only 星見台's speaker calls names (夕鳴町's broadcast is chapter 1's, unchanged)
  const calls = !!def.calls && (id === 'yobimodoshi' || g.pa.mode === 'yama');
  if (calls) {
    if (now - s.lastT > 0.6) s.lineStart = true;
    if (ch === '。' || ch === '」' || ch === '？' || ch === '?' || ch === '\n') {
      s.lineStart = true;
      s.nameLine = false;
    }
    // 「……」 at the head of a line: a name is being called
    if (s.lineStart && (ch === '…' || ch === '‥')) {
      s.lineStart = false;
      s.nameLine = true;
      s.nameI = 0;
    }
  }
  // ふくじんづけ asleep, 「……ぷすー。」: no blips, one breath through the nose
  if (id === 'h_gon') {
    if (ch === '。') s.asleep = false;
    else if (s.asleep) return;
    else if (ch === 'ぷ') {
      s.asleep = true;
      s.lastT = now;
      voice({ at: now + 0.005, dest: g.voiceBus, wave: 'noise', dur: 0.09, attack: 0.015, decay: 0.05, sustain: 0.5, release: 0.04, vol: 0.006 * trimOr1(voiceTrim(id)), filter: { type: 'bandpass', freq: 1200, q: 1.4 } });
      return;
    }
  }

  // lines and words for ツガオ便's two (53 9.2): a laugh, a 「焼き芋」 line and
  // 「さすが 師匠」 end with their sentence
  let blurted = false;
  if (mode === undefined && (id === 'hirosuke' || id === 'pokosha')) {
    if (LINE_END.includes(ch) || ch === '…' || ch === '‥') s.lineHead = true;
    if (ch !== 'は' && ch !== 'っ' && ch !== 'ッ') s.laugh = 0;
    if (LINE_END.includes(ch)) s.imo = false;
    if (LINE_END.includes(ch) || ch === '、') {
      blurted = !!s.sasuga && s.sasugaForm === 'loud';
      // 「さすが 師匠！」 out loud: the next page comes out small (照れて)
      if (blurted && (ch === '！' || ch === '!')) s.shy = 1;
      s.sasuga = 0;
    }
  }
  // グソっ君 (関西弁): every phrase ends with a clear bend — up at 「、」 and
  // 「！」, right up at 「？」, down at 「。」; the next phrase bounces afresh
  if (id === 'gusokkun' && '、。！？!?'.includes(ch)) {
    if (now - s.lastT < 0.5) {
      const bend = ch === '。' ? -4 : ch === '、' ? 3 : ch === '？' || ch === '?' ? 7 : 5;
      play(def, id, s.lastMidi, now + 0.01, bend, ch === '。' ? 0.9 : 1.15, 'a', true);
    }
    s.bounce = 0;
    return;
  }
  // 海ぞいの町 (63 9.2): 「ごちそう……」 — at 12:00 every townsperson who starts
  // to say it is cut short by the head of the siren (once a line); ゴロウ's
  // 「……もう 1杯。」 ends on a sigh (−2, 120 ms)
  if (id.startsWith('c3_')) {
    if (!SILENT.has(ch) && ch.trim()) s.c3recent = ((s.c3recent ?? '') + ch).slice(-6);
    if ((ch === '…' || ch === '‥') && !s.c3siren && (s.c3recent ?? '').endsWith('ごちそう') && musicParams().c3_noon !== 1 && now - s.lastT < 0.5) {
      s.c3siren = true;
      s.c3recent = '';
      sfxTable.get('se_c3_siren_head')?.({ at: now + 0.01 });
    }
    if (ch === '。' && id === 'c3_jouren' && s.mou && now - s.lastT < 0.5) {
      play(def, id, s.lastMidi - 2, now + 0.01, 0, 0.8, 'u', false, undefined, 120);
      s.mou = false;
      return;
    }
  }
  // ナリオサメ (63 9.2): at the end of a page its voice turns back into the siren's
  // head (×.3) — not once the final phase has come (its last words let go), nor after 12:01
  if (id === 'nariosame' && ch === '。') {
    const mp = musicParams();
    if (now - s.lastT < 0.5 && mp.c3_noon !== 1 && mp.boss_phase < 3) sfxTable.get('se_c3_siren_head')?.({ at: now + 0.01, vol: 0.3, level: 1 });
    return;
  }
  // sentence endings: a little rise for "？", a push for "！"
  if (ch === '？' || ch === '?' || ch === '！' || ch === '!') {
    if (now - s.lastT < 0.5 && def.wave !== 'none' && id !== 'narr') {
      const q = ch === '？' || ch === '?';
      // (ツガオの裏の顔 never shouts: ×1.05)
      play(def, id, s.lastMidi, now + 0.01, q ? 5 : 2, q ? 1 : (ura && id === 'tsugao' ? 1.05 : 1.2) * (s.tsukkomi ? 1.25 : 1) * (blurted ? 1.8 : 1), 'a', true, roomRev(id));
    }
    return;
  }
  if (ch === '。' && id === 'chugaku' && now - s.lastT < 0.5) {
    // 語尾にリバーブ: the last blip rings once more, wet
    play(def, id, s.lastMidi, now + 0.01, 0, 0.6, 'a', false, 0.6);
    return;
  }
  if (SILENT.has(ch) || !ch.trim()) return;
  // 53 9.2: a line that starts with a name (after the "……", or a katakana
  // name when the caller leaves the dots out) is called, not said: the first
  // blip on the voice's note, then 0 / −3 in turn (the falling minor third of
  // 「オ・ピ・ピー」); the last ん of ちゃん / くん / さん always sounds, low and
  // long. The sealed answer cannot come out of it.
  if (calls && s.lineStart) {
    s.lineStart = false;
    s.nameLine = isKatakana(ch);
    s.nameI = 0;
  }
  const honorific = !!s.nameLine && ch === 'ん' && !!prevCh && 'ゃくさ'.includes(prevCh);
  // マサルさん's tsukkomi (53 9.2): a page that opens with 「誰が」 comes out fast and loud
  if (id === 'h_gen' && pageHead && ch === '誰') s.tsukkomi = true;
  // まつ先生's 「おはだっちょ」: the four blips climb the major arpeggio 0 +4 +7 +12
  let oha = -1;
  if (id === 'h_fumi') {
    const step = s.oha ?? 0;
    if (pageHead && ch === 'お') oha = 0;
    else if (step > 0 && ch === 'はだち'[step - 1]) oha = step;
    s.oha = oha >= 0 && oha < 3 ? oha + 1 : 0;
  }
  // ヒロスケさん (53 9.2): 「ども」 opens bright (+4 +7); a 「焼き芋」 line bounces at its end
  let forced = false;
  let domo = -1;
  if (id === 'hirosuke') {
    if (pageHead && mode === undefined && ch === 'ど' && !ura) domo = 0;
    else if (s.domo === 1 && ch === 'も') domo = 1;
    s.domo = domo === 0 ? 1 : 0;
    if (s.lineHead && mode === undefined) s.imo = ch === '焼';
  }
  // ポコシャさん (53 9.2): 「さすが 師匠」 — out loud (a page's first word, or said
  // after a pause in the middle of one), murmured (a page that opens 「……」),
  // whispered behind the door in ツガオの部屋
  if (id === 'pokosha') {
    if (mode === 'sasuga') {
      s.sasuga = 1;
      s.sasugaForm = !inTsugaoRoom() && !(s.firstVoiced && s.headDots) ? 'loud' : 'quiet';
    } else if (s.sasuga && mode === undefined) s.sasuga++;
    if (s.stam === ch && mode === undefined) forced = true;
  }
  // 海ぞいの町's fixed figures (63 9.2): ナミエ's 「おかわり」 bounces up 0 +4 +7 +12;
  // the dried-fish couple's 「干しすぎ！」「干したりない！」 run 0 +3 +5 +3 +5; ゲン's
  // 「ひゃく」 is always 0 +2; ツグミ's 「売った！」 says it out loud (+7, +12, ×2);
  // カイト's 「ピッ」 is his whistle, not a blip
  let c3Semi: number | null = null;
  let c3Vol = 1;
  let c3Delay = 0;
  if (id.startsWith('c3_') && mode === undefined) {
    if (pageHead && id === 'c3_shokudo' && ch === 'お') s.c3fig = [0, 4, 7, 12];
    if (pageHead && (id === 'c3_himono_otto' || id === 'c3_himono_tsuma') && ch === '干') s.c3fig = [0, 3, 5, 3, 5, 3];
    if (pageHead) s.c3figI = 0;
    if (s.c3fig) {
      const i = s.c3figI ?? 0;
      const want = id === 'c3_shokudo' ? 'おかわり'[i] : undefined;
      if (i < s.c3fig.length && (want === undefined || want === ch)) {
        c3Semi = s.c3fig[i];
        s.c3figI = i + 1;
      } else s.c3fig = undefined;
    }
    if (id === 'c3_seri') {
      if (ch === 'ひ') {
        c3Semi = 0;
        s.hyaku = 1;
      } else if (ch === 'く' && s.hyaku === 1) {
        c3Semi = 2;
        s.hyaku = 0;
      } else s.hyaku = 0;
    }
    if (id === 'c3_seri_deshi') {
      if (ch === '売') s.utta = 1;
      if (s.utta === 1 && (ch === '売' || ch === 'た')) {
        c3Semi = ch === '売' ? 7 : 12;
        c3Vol = 2;
      }
      if (s.utta === 2) c3Vol = 0.7;
    }
    if (id === 'c3_kanshiin') {
      if (pageHead && ch === 'ピ') {
        s.fue = true;
        s.lastT = now;
        s.last = now;
        sfxTable.get('se_c3_fue')?.({ at: now + 0.005 });
        return;
      }
      if (s.fue) c3Vol = 0.8;
    }
    if (id === 'c3_jouren' && s.firstVoiced && s.headDots && ch === 'も') {
      // 「……もう」: a breath before it (what is said in that breath is swallowed)
      s.mou = true;
      c3Delay = 0.3;
      s.quietUntil = now + 0.33;
    } else if (id === 'c3_jouren' && s.quietUntil !== undefined && now < s.quietUntil) return;
  }
  // ヤキソバン's name (63 9.2): a page that opens 「ヤキソバン」 — M10 (0 0 +5 +7)
  // on the first four blips, ×1.3, wetter, fast; the page after it ×0.8, slow (照れる)
  if (id === 'maruyama' && mode === undefined) {
    if (pageHead && ch === 'ヤ') {
      s.yk = 1;
      s.ykI = 0;
    }
    if (s.yk === 1) {
      const i = s.ykI ?? 0;
      if (i < 4) {
        c3Semi = [0, 0, 5, 7][i];
        s.ykI = i + 1;
      }
      c3Vol = 1.3;
    } else if (s.yk === 2) c3Vol = 0.8;
  }
  // ポコシャ's 「……自分は、悪く ない！」 (63 9.2, S24): 0 +5 +7 +12 at ×2.2, fast —
  // his own voice, wider than his admiring 0 +4 +7 +9; the next page small again
  if (id === 'pokosha' && (mode === undefined || mode === 'plain')) {
    if (ch === '悪' && !s.ookii) s.ookii = 1;
    if (s.ookii && s.ookii <= 4) {
      c3Semi = [0, 5, 7, 12][s.ookii - 1];
      c3Vol = 2.2;
      s.ookii++;
    }
    if (s.ookiiAfter) c3Vol *= 0.6;
  }
  if (c3Semi !== null) forced = true;
  const loud = id === 'pokosha' && !!s.sasuga && s.sasugaForm === 'loud';
  if (loud || domo >= 0 || mode === 'laugh' || mode === 'imo' || mode === 'stam' || (id === 'hirosuke' && s.laugh)) forced = true;
  const lineHead = !!s.lineHead;
  s.lineHead = false;
  // spacing: the voice's interval in characters at 40 chars/s (ツガオさん waking: 4)
  const every = s.tsukkomi || s.chan || loud || s.yk === 1 || (!!s.ookii && s.ookii <= 5) ? 1 : s.yk === 2 ? 3 : s.wake || (ura && id === 'tsugao') ? 4 : ura ? 3 : def.every;
  const minGap = every * 0.025 * 0.9;
  const allowed = now - s.last >= minGap;
  // ハモ区長's 「えー」 and ペロ's 「なぁ」: the next character decides
  // (and ツガオ's 「つがおちゃん」, エゴ's 「ガチャン」, ヒロスケさん's laugh and
  // 「……か？」, ポコシャさん's first letters: a stammer or 「さすが」)
  const holdKind: HoldKind | null =
    id === 'h_kucho' && pageHead && ch === 'え'
      ? 'ee'
      : id === 'h_mitsu' && ch === 'な'
        ? 'naa'
        : id === 'tsugao' && !s.chan && ch === 'つ'
          ? 'tsu'
          : id === 'dakoku' && ch === 'ガ'
            ? 'ga'
            : id === 'hirosuke' && !ura && !s.laugh && ch === 'わ'
              ? 'wa'
              : id === 'hirosuke' && !ura && !s.laugh && ch === 'は'
                ? 'ha'
                : id === 'hirosuke' && s.imo && ch === 'か'
                  ? 'ka'
                  : id === 'pokosha' && !s.sasuga && !forced && (lineHead || prevCh === undefined || WORD_EDGE.includes(prevCh))
                    ? 'word'
                    : null;
  if (mode === undefined && holdKind) {
    held = { id, ch, t: now, kind: holdKind, allowed };
    s.prevCh = prevCh;
    if (!g.offline) {
      const mine = held;
      atTime(now + 0.06, () => {
        if (held === mine) flushHeld();
      });
    }
    return;
  }
  if (!allowed && !honorific && !forced && oha < 0 && mode !== 'ee' && mode !== 'naa' && mode !== 'chan') return;
  // a new page of the flip (and the sign's cardboard): the whole marker squeak
  if ((id === 'flip' || id === 'h_mujin') && now - s.last > 0.8) {
    s.last = now;
    s.lastT = now;
    sfxTable.get('se_flip')?.({ vol: 0.9, at: now, pitch: id === 'h_mujin' ? 1.2 : 1 });
    return;
  }
  s.last = now;
  if (s.stam === ch && mode === undefined) s.stam = undefined;
  // ポコシャさん hesitates (53 9.2): a page that opens 「……」 or with a stammer
  // waits 150 ms before its first blip; the words after it keep their spacing
  // and come out that much later, in order (quietUntil below) — a murmured
  // 「……さすが 師匠。」 is late, not swallowed
  let delay = 0;
  if (id === 'pokosha' && s.firstVoiced && (s.headDots || mode === 'stam')) delay = 0.15;
  const headOfPage = !!s.firstVoiced;
  s.firstVoiced = false;

  let semi: number;
  let volK = s.tsukkomi ? 1.25 : 1;
  let longMs = 0;
  let glide = 0;
  let lpOverride: number | undefined;
  if (s.wake && id === 'tsugao' && !s.chan) volK *= 0.85;
  // 裏の顔 (63 9.2): ツガオ takes 250 ms before each page (筋を通す間); ヒロスケ ×0.9, no bounce
  if (ura && id === 'tsugao' && !s.chan && headOfPage) delay += 0.25;
  if (ura && id === 'hirosuke') volK *= 0.9;
  volK *= c3Vol;
  delay += c3Delay;
  if (id === 'pokosha') {
    if (inTsugaoRoom()) {
      // 「……さすが 師匠。」 from the dark behind the frosted door
      volK *= 0.5;
      lpOverride = 1200;
    } else if (s.sasuga && s.sasugaForm === 'quiet') {
      volK *= 0.6;
      lpOverride = 1000;
    } else if (loud) volK *= 1.8;
    if (s.shy === 2) volK *= 0.8;
    if (mode === 'stam') {
      volK *= 0.7;
      s.stam = ch;
    }
  }
  if (loud) {
    // さ す が 師 匠: 0 +4 +7 +9 (+9 held): the admiring voice rises
    const i = (s.sasuga ?? 1) - 1;
    semi = [0, 4, 7, 9, 9][Math.min(4, i)];
    if (i >= 4) longMs = 110;
  } else if (domo >= 0) {
    semi = domo === 0 ? 4 : 7;
  } else if (mode === 'laugh' || (id === 'hirosuke' && s.laugh)) {
    // 「わはは」: short blips on 0 +4 +7 over and over (a laugh, not words)
    const k = mode === 'laugh' ? 0 : s.laugh ?? 0;
    semi = [0, 4, 7][k % 3];
    s.laugh = k + 1;
    longMs = 50;
  } else if (mode === 'imo') {
    // 「……焼き芋 食うか？」: the か jumps +5 and holds 140 ms (the ？ still lifts it)
    semi = 5;
    longMs = 140;
  } else if (mode === 'ee') {
    // 「えー」: one long blip, sinking 30 cents
    semi = def.scale[0];
    longMs = 280;
    glide = -0.3;
  } else if (mode === 'naa') {
    // 「なぁ」: the な stretches to 160 ms and sighs down two semitones over 200 ms
    semi = def.scale[hashCh(ch) % def.scale.length];
    longMs = 160;
    glide = -2;
  } else if (oha >= 0) {
    semi = [0, 4, 7, 12][oha];
    if (oha === 3) longMs = 120;
    if (currentId() === 'bgm_hoshi_morning') volK = 0.9;
  } else if (c3Semi !== null) {
    semi = c3Semi;
  } else if (s.nameLine) {
    const i = s.nameI ?? 0;
    s.nameI = i + 1;
    semi = honorific ? -3 : i === 0 ? 0 : i % 2 === 1 ? 0 : -3;
    if (honorific) longMs = 120;
  } else if (def.fixedSeq) {
    semi = def.fixedSeq[s.seqI++ % def.fixedSeq.length];
  } else if (id === 'kanenari_voice') {
    // the character after お tells the two words apart (53 9.3):
    // "……おいしい。": お 0, い +3, し +3, い −2 (long, falling)
    // "……おはよう。": お 0, は +5, よ +5 (a little softer), う +5 → +3 (long:
    // it settles on F, the morning song's tonic)
    if (ch === 'お') kanenariWord = 'oishii';
    else if (kanenariSeq === 1) kanenariWord = ch === 'は' ? 'ohayou' : 'oishii';
    if (kanenariWord === 'ohayou') {
      semi = ch === 'お' ? 0 : 5;
      if (ch === 'よ') volK = 0.85;
      if (ch === 'う') longMs = 320;
    } else {
      const map: Record<string, number> = { お: 0, い: kanenariSeq >= 2 ? -2 : 3, し: 3 };
      semi = map[ch] ?? 0;
      if (ch === 'い' && kanenariSeq >= 3) longMs = 300;
    }
    if (longMs) glide = -2;
    kanenariSeq = ch === 'お' ? 1 : kanenariSeq + 1;
  } else {
    // マサルさん's tsukkomi uses only the top two notes of his set (5 7);
    // グソっ君 bounces: the low half of his set, then the high half, in turn
    let scale = s.tsukkomi ? def.scale.slice(-2) : def.scale;
    if (id === 'gusokkun') {
      if (pageHead) s.bounce = 0;
      const b = (s.bounce = (s.bounce ?? 0) + 1);
      scale = b % 2 === 1 ? def.scale.slice(0, 3) : def.scale.slice(3);
    }
    semi = scale[hashCh(ch) % scale.length];
    // ミナト (63 9.2): as exact as his clock — the same note may come again
    if (semi === s.lastSemi && id !== 'c3_sirenban') {
      s.repeat++;
      if (s.repeat >= 2) {
        semi = scale[(scale.indexOf(semi) + 1) % scale.length];
        s.repeat = 0;
      }
    } else s.repeat = 0;
    // the chime's sealed answer (−2, −3, +3 in any key, 1.3) must not slip out
    // of a chatty line either: step aside to the next note of the voice's set
    const h = s.hist;
    if (h.length >= 3 && h[1] - h[0] === -2 && h[2] - h[1] === -3 && semi - h[2] === 3) {
      const i = scale.indexOf(semi);
      semi = scale[(i + 1) % scale.length];
      if (semi - h[2] === 3) semi = scale[(i + 2) % scale.length];
    }
  }
  s.hist.push(semi);
  if (s.hist.length > 3) s.hist.shift();
  s.lastSemi = semi;
  const baseMidi = typeof def.base === 'number' ? 69 + 12 * Math.log2(def.base / 440) : noteMidi(def.base);
  const midi = baseMidi + semi + (s.chan ? 12 : 0);
  s.lastMidi = midi;
  s.lastT = now;
  if (s.chan) {
    // 「つがおちゃん 寝る〜♪」: an octave up, a triangle, a little bounce at every
    // blip — and 「る」 turns 0 → +5 → 0 over 240 ms. The drop from the calm low
    // voice is the joke (53 9.2)
    const bright: VoiceDef = { ...def, wave: 'triangle', lp: 2600, scoop: [80, 20], vib: undefined };
    if (ch === 'る') [0, 5, 0].forEach((k, i) => play(bright, id, midi + k, now + 0.005 + i * 0.08, 0, volK, 'u', false, roomRev(id), 90));
    else play(bright, id, midi, now + 0.005, 0, volK, vowelOf(ch), false, roomRev(id));
  } else {
    let d = def;
    // ヒロスケさん's pages open with a bounce (+60 cents → 0 in 15 ms)
    if (id === 'hirosuke' && headOfPage && !ura) d = { ...d, scoop: [60, 15] };
    if (id === 'pokosha' && s.ookiiAfter) lpOverride = 1000;
    if (lpOverride) d = { ...d, lp: lpOverride };
    let at = now + 0.005 + delay;
    if (id === 'pokosha') {
      // after his hesitation the words keep their order (a stammer right behind it waits too)
      if (!delay && s.quietUntil !== undefined && at < s.quietUntil) at = s.quietUntil;
      s.quietUntil = delay || at === s.quietUntil ? at + 0.05 : s.quietUntil;
    }
    play(d, id, midi, at, 0, volK, mode === 'ee' ? 'e' : vowelOf(ch), false, id === 'maruyama' && s.yk === 1 ? 0.3 : roomRev(id), longMs, glide);
  }
  if (id === 'yobimodoshi') openLineHum(now);
  // オカワリナベ: a little bubble after each blip (sine 300 → 520 Hz, 20 ms)
  if (id === 'okawarinabe') voice({ at: now + 0.005 + delay + def.len / 1000, dest: g.voiceBus, wave: 'sine', freq: 300, freqEnd: 520, glide: 0.02, dur: 0.02, attack: 0.002, decay: 0.02, sustain: 0, release: 0.01, vol: 0.004 * trimOr1(voiceTrim(id)) });
  if (g.offline) return;
  if (id === 'kanenari_voice') {
    // the night song leans back (−4 dB) under the four hums
    duck(dbToGain(-4), 0.15, 0.6, 0.6);
  } else if (def.pa && g.pa.mode === 'yama') {
    // 星見台 (53 10.3): the calls come from far up the valley (−4 / −2 dB);
    // close under the horns (the hill, the boss) they take more room (−6 / −4)
    const d = g.pa.distance;
    const near = (d.override ?? d.d) < 0.3 && !d.indoor;
    if (near) {
      duck(dbToGain(-6), 0.3, 0.5, 0.8);
      duckAmbience(dbToGain(-4), 0.3, 0.5, 0.8);
    } else {
      duck(dbToGain(-4), 0.2, 0.5, 0.6);
      duckAmbience(dbToGain(-2), 0.2, 0.5, 0.6);
    }
  } else if (id === 'pokosha_pa') {
    // 館内放送 (63 10.3): BGM −6 dB, ambience −3 dB
    duck(dbToGain(-6), 0.3, 0.5, 0.8);
    duckAmbience(dbToGain(-3), 0.3, 0.5, 0.8);
  } else if (def.pa && id !== 'nariosame') {
    duck(dbToGain(-9), 0.3, 0.5, 0.8);
    duckAmbience(dbToGain(-6), 0.3, 0.5, 0.8);
    if (id === 'broadcast_child') schedulePaSwell();
  } else if (!isBattle() && id !== 'narr') {
    // field dialog: music −2 dB while text is running (11.3)
    duck(dbToGain(-2), 0.15, 0.35, 0.4);
  }
}

/** The reverb ツガオの部屋 gives a voice (53 9.1, 9.2); undefined = the voice's own. */
function roomRev(id: string): number | undefined {
  if (id !== 'tsugao' && id !== 'pokosha') return undefined;
  return inTsugaoRoom() ? (id === 'tsugao' ? 0.25 : 0.3) : undefined;
}

/** After the last line of the broadcast, the PA echo answers three times (13.2). */
function schedulePaSwell(): void {
  const g = cur();
  const t = g.ctx.currentTime;
  paSwellCheck = { t };
  atTime(t + 0.45, () => {
    if (!paSwellCheck || paSwellCheck.t !== t) return;
    paSwellCheck = null;
    g.pa.swell(0.6, 2.0);
  });
}

/** Katakana (a name called on the speaker: シュンスケ, アスカ…). */
function isKatakana(ch: string): boolean {
  return (ch >= 'ァ' && ch <= 'ヺ') || ch === 'ヴ';
}

/**
 * ヨビモドシ's open line (53 9.2): a low hum (55 + 110 Hz, and the buzz of
 * its harmonics that a small speaker carries) runs into the PA while it
 * speaks, and fades 0.6 s after the last blip, over 0.4 s.
 */
const hums = new WeakMap<BaseAudioContext, { oscs: OscillatorNode[]; gain: GainNode; until: number }>();
function openLineHum(t: number): void {
  const g = cur();
  const c = g.ctx;
  let h = hums.get(c);
  if (!h || h.until < t + 0.02) {
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.12);
    const oscs: OscillatorNode[] = [];
    for (const [f, v, type] of [
      [55, 0.006, 'sine'],
      [110, 0.006, 'sine'],
      [110, 0.0022, 'sawtooth'],
    ] as [number, number, OscillatorType][]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const k = c.createGain();
      k.gain.value = v * trimOr1(voiceTrim('yobimodoshi'));
      let tail: AudioNode = k;
      if (type === 'sawtooth') {
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        k.connect(lp);
        tail = lp;
      }
      o.connect(k);
      tail.connect(gain);
      o.start(t);
      oscs.push(o);
    }
    gain.connect(g.pa.input);
    h = { oscs, gain, until: t };
    hums.set(c, h);
    oscs[0].onended = () => gain.disconnect();
  } else {
    const p = h.gain.gain;
    p.cancelScheduledValues(t);
    p.setValueAtTime(1, t);
  }
  const fadeAt = t + 0.6;
  h.gain.gain.setValueAtTime(1, fadeAt);
  h.gain.gain.linearRampToValueAtTime(0, fadeAt + 0.4);
  h.until = fadeAt + 0.4;
  for (const o of h.oscs) o.stop(h.until + 0.05);
  g.pa.wake(h.until + 1);
}

function play(def: VoiceDef, id: string, midi: number, t: number, bend: number, volK: number, vowel: string, isTail: boolean, revOverride?: number, longMs = 0, glideSemis = 0): void {
  if (def.wave === 'none') return;
  const g = cur();
  const dest = def.pa ? g.pa.input : g.voiceBus;
  if (def.pa) g.pa.open(t);
  const long = longMs > 0;
  const dur = (long ? longMs : def.len) / 1000;
  const k = def.child ? 1.2 : 1;
  const [f1, f2] = FORMANT[vowel] ?? FORMANT.a;
  const f = def.wave === 'noise' ? 1000 : midiHz(midi);
  const dogDown = id === 'dog' && musicParams().stage >= 1 && musicParams().stage < 3 ? -100 : 0;
  const base: VoiceOpts = {
    at: t,
    dest,
    freq: f,
    dur: Math.max(0.008, dur - (def.R ?? 15) / 1000),
    attack: (def.A ?? 2) / 1000,
    decay: (def.D ?? Math.max(10, def.len * 0.5)) / 1000,
    sustain: def.S ?? 0.55,
    release: (def.R ?? 15) / 1000,
    vol: def.v * volK * trimOr1(voiceTrim(id)),
    detune: dogDown,
    reverb: revOverride ?? def.rev,
  };
  if (bend) {
    base.freqEnd = f * Math.pow(2, bend / 12);
    base.glide = 0.06;
    base.dur = 0.07;
  }
  if (long) {
    // a long blip: Kanenari's words settle two semitones down (い −2 → …,
    // う +5 → +3), 「なぁ」 sighs two down over 200 ms, 「えー」 sinks 30 cents;
    // a called name's last ん simply rings
    if (glideSemis) {
      base.freqEnd = f * Math.pow(2, glideSemis / 12);
      base.glide = id === 'h_mitsu' ? 0.2 : id === 'kanenari_voice' ? 0.3 : dur * 0.94;
    }
    base.dur = Math.max(0.02, dur - (def.R ?? 15) / 1000);
  }
  if (def.am) base.am = { rate: def.am[0], depth: def.am[1], shape: def.am[2] };
  if (def.fall) {
    base.freqEnd = f * Math.pow(2, def.fall / 1200);
    base.glide = dur;
  }
  if (def.scoop) {
    base.scoop = def.scoop[0];
    base.scoopTime = def.scoop[1] / 1000;
  }
  if (def.vib) base.vibrato = { rate: def.vib[0], depth: def.vib[1] };
  if (def.lp) base.filter = { type: 'lowpass', freq: def.lp, q: def.lpQ ?? 0.7 };
  if (def.bp) base.filter = { type: 'bandpass', freq: def.bp[0], q: def.bp[1] };
  if (def.formant && !isTail) base.formant = { f1: f1 * k, f2: f2 * k, q1: 5, q2: 7, mix: 0.4, lp: vowel === 'n' ? 450 : undefined };
  if (id === 'maruyama') base.fm = { ratio: 1, index: 2.5, indexEnd: 0.8, indexTime: 40 };
  // グソっ君's directions in the dark (63 9.2): his voice from the way he means
  if (voicePan !== null && id.startsWith('gusokkun')) base.pan = voicePan;

  if (id === 'omukaemachi' || id === 'broadcast_child') {
    // two layers at once: a low breath pad + a child's high note 15 ms later
    voice({ at: t, dest, wave: 'sawtooth', freq: 110, dur: 0.08, attack: 0.06, decay: 0.05, sustain: 0.7, release: 0.15, vol: 0.04 * volK * trimOr1(voiceTrim(id)), filter: { type: 'lowpass', freq: 600 }, reverb: 0.5 });
    voice({ ...base, at: t + 0.015, wave: 'triangle', reverb: 0.5 });
    return;
  }
  if (def.wave === 'noise') {
    voice({ ...base, wave: 'noise' });
    return;
  }
  if (id === 'dakoku') {
    // the time recorder's little "カチ" at the head of every blip
    voice({ at: t, dest, wave: 'triangle', freq: 2400, dur: 0.003, attack: 0.0005, decay: 0.006, sustain: 0, release: 0.004, vol: base.vol ?? 0 });
  }
  voice({ ...base, wave: def.wave });
  if (def.wave2) voice({ ...base, wave: def.wave2[0], vol: (base.vol ?? 0) * def.wave2[1], formant: undefined });
  if (def.noise) voice({ ...base, wave: 'noise', freq: 1000, freqEnd: undefined, vol: (base.vol ?? 0) * def.noise.level, filter: { type: 'bandpass', freq: def.noise.bp, q: def.noise.q }, formant: undefined, fm: undefined });
  if (id === 'kanenari_voice' && vowel === 'i' && kanenariSeq === 3) {
    // the "sh" of し
    voice({ at: t, dest, wave: 'noise', freq: 1000, dur: 0.06, attack: 0.01, decay: 0.04, sustain: 0.5, release: 0.02, vol: 0.02 * trimOr1(voiceTrim(id)), filter: { type: 'bandpass', freq: 3500, q: 1.5 } });
  }
}

setTextBlip(blip);

let voicePan: number | null = null;
/**
 * 63 9.2 (S18 深海の展示室): グソっ君's directions are heard from where he points
 * — 「……右や」 +.6, left −.6, straight on 0 — not from where he stands. Set it
 * before the line, null after. The ambience steps back −4 dB while it is set (10.3).
 */
export function setVoicePan(pan: number | null): void {
  voicePan = pan === null || !Number.isFinite(pan) ? null : Math.max(-1, Math.min(1, pan));
  if (voicePan !== null && hasGraph()) duckAmbience(dbToGain(-4), 0.1, 2.5, 0.4);
}

// ---------------------------------------------------------------------------
// 63_ch3_audio 9.2: the whole town at once — 「いただきます」 (S12's clasped
// hands, S13 and S29 on the breakwater) and 「ごちそうさま でした！」 (S13). Each
// voice says the six blips at the same moment, on the same figure (M9 or
// M9′) in its own octave: the pitches are everyone's own, the turn is shared.
// At most 12 voices (more are thinned), v .008 each and .06 together. A hum
// of vowels, never words (1.7).

const CHORUS: Record<'itadakimasu' | 'gochisousama', { semis: number[]; vowels: string }> = {
  itadakimasu: { semis: [0, 0, 2, 4, 7, 4], vowels: 'iaaiau' },
  gochisousama: { semis: [7, 4, 2, 0, 2, 0], vowels: 'oiouaa' },
};

/**
 * The town's voices together (the ids are voice or speaker ids: aliases are
 * resolved; duplicates count once). Resolves after the last blip.
 */
export function chorusBlips(voiceIds: string[], motif: 'itadakimasu' | 'gochisousama' = 'itadakimasu', gap = 0.16): Promise<void> {
  if (!hasGraph()) return Promise.resolve();
  const g = cur();
  const ids = [...new Set(voiceIds.map((v) => resolve(v)))].filter((id) => VOICES[id] && VOICES[id].wave !== 'none' && VOICES[id].wave !== 'noise');
  // thin evenly down to 12
  const pick = ids.length <= 12 ? ids : Array.from({ length: 12 }, (_, i) => ids[Math.floor((i * ids.length) / 12)]);
  const n = Math.max(1, pick.length);
  const each = Math.min(0.008, 0.06 / n);
  const f = CHORUS[motif];
  const t0 = g.ctx.currentTime + 0.05;
  pick.forEach((id, k) => {
    const def = VOICES[id];
    const base = typeof def.base === 'number' ? 69 + 12 * Math.log2(def.base / 440) : noteMidi(def.base);
    // the G nearest the voice's own note (G is the tonic of 海ぞいの町)
    const g0 = 67 + 12 * Math.round((base - 67) / 12);
    const volK = each / Math.max(0.001, def.v);
    // a few ms apart: many people, one breath
    const lag = g.offline ? 0 : (k % 4) * 0.006;
    f.semis.forEach((s, i) => {
      const last = i === f.semis.length - 1;
      play(def, id, g0 + s, t0 + lag + i * gap, 0, volK, f.vowels[i], false, undefined, last ? 260 : Math.max(0, gap * 1000 - def.len - 10));
    });
  });
  const end = t0 + gap * f.semis.length + 0.4;
  if (g.offline) return Promise.resolve();
  return new Promise((res) => atTime(end, res));
}
