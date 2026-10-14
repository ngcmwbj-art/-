// シークレットエンディング「40年ぶりの 休み」（05_postgame 10.2）の音。E の台本がここを呼ぶ。
// 新しい曲は作らない（今ある曲の割りあてと形ちがいだけ）：
//   #2 カット（次の日を回る、約1分）：bgm_tsugaobin（ツガオ便の朝の曲）'iki' から、
//       最後の旧水族館の入口で 'kaeri'。カットごとに、その場所・時間帯の床を小さく
//   #3〜#4 夕方の公園：曲なし → ヒグラシ（第1章の夕方）と川
//   #5 17:00：5時のチャイム 8音（playChimeMotif。第1章のクリア後・第3章 S32 と同じ）→ ヒグラシが 3秒でもどる
//       焼きそばのパックを渡す：袋の「かさっ」
//   #6 タイムカードの『休』にはなまる：se_pg_yasumi_hanamaru（「みんなの はなまる」の小さい版）
//       1枚絵：bgm_tsugao の静かな形（pg_shizuka 1、時計 2つが動いている。仮）
//   #7 操作がもどる：pgSecretEnd() で町のいつもの音（pgaudio）へ
// どの関数も、場面が flag_bgm_hold を立てていてもそのまま鳴らす（場面の音なので）。

import * as audio from '../audio';
import { registerDebug } from '../debug';
import * as snd from './audio';
import { field } from './field';
import { applyPgAudio, pgAudioHold } from './pgaudio';

export type PgSecretCut = 'hoshi' | 'yunari' | 'minato' | 'aq';

/** カットごとの床（その場所・その時間帯。曲の下に小さく）。 */
const CUT_BEDS: Record<PgSecretCut, { id: string; vol: number }[]> = {
  // 夜明け前の星見台（マサルとキャベツ）：夜明けの床
  hoshi: [{ id: 'amb_h_dawn', vol: 0.6 }],
  // 朝の夕鳴町（たかしに卸す）：スズメと遠くの車
  yunari: [
    { id: 'amb_pg_suzume', vol: 0.6 },
    { id: 'amb_pg_kuruma', vol: 0.5 },
  ],
  // 昼の港（ナミエの店）：波とカモメ
  minato: [
    { id: 'amb_c3_umi', vol: 0.5 },
    { id: 'amb_c3_tori', vol: 0.6 },
  ],
  // 旧水族館の入口（エゴがタイムカードに『休』の欄を作る）：館の床
  aq: [{ id: 'amb_c3_aq_kan', vol: 0.7 }],
};
const ALL_CUT_BEDS = [...new Set(Object.values(CUT_BEDS).flatMap((l) => l.map((b) => b.id)))];

/** #2 の頭（暗転のあと、次の日）：ツガオ便の朝の曲を 'iki' で。曲以外の床は全部落とす。 */
export function pgSecretCutsStart(): void {
  // ここから pgSecretEnd() まで、地図の出入り・帯の変わり目でいつもの音にもどさない
  pgAudioHold(true);
  snd.stopAllAmbient(0.8);
  audio.setMusicParam('pg_shizuka', 0);
  snd.setSpace('outdoor');
  audio.playBgm('bgm_tsugaobin', { variant: 'iki', fade: 1.2 });
}

/** #2 のカットの切りかえ（絵が変わる時）：床をそのカットの物に。最後の旧水族館で曲は 'kaeri' の形へ。 */
export function pgSecretCut(cut: PgSecretCut): void {
  const want = CUT_BEDS[cut];
  for (const id of ALL_CUT_BEDS) if (!want.some((b) => b.id === id)) snd.stopAmbient(id, 0.6);
  for (const b of want) snd.playAmbient(b.id, { vol: b.vol, fade: 0.8, lp: 20000 });
  if (cut === 'aq' && audio.currentBgmId() === 'bgm_tsugaobin') audio.playBgm('bgm_tsugaobin', { variant: 'kaeri' });
}

/** #3 夕方の公園へ（暗転の中）：曲を落とし、ヒグラシと川。 */
export function pgSecretPark(): void {
  pgAudioHold(true);
  audio.stopBgm(2.0);
  for (const id of ALL_CUT_BEDS) snd.stopAmbient(id, 1.0);
  snd.setSpace('outdoor');
  snd.playAmbient('amb_higurashi', { vol: 1, fade: 3, lp: 20000 });
  snd.playAmbient('amb_kawabe', { vol: 0.5, fade: 3, lp: 20000 });
}

/**
 * #5 17:00：5時のチャイム 8音（正しい音程で、最後の音まで）。鳴っている間は床を下げ、
 * 鳴り終わったらヒグラシが 3秒でもどる。最後の音が消えたら解決。
 */
export async function pgSecretChime(): Promise<void> {
  snd.setAmbientVol('amb_higurashi', 0.25, 0.8);
  snd.setAmbientVol('amb_kawabe', 0.2, 0.8);
  await audio.playChimeMotif({ notes: 8 });
  snd.setAmbientVol('amb_higurashi', 1, 3);
  snd.setAmbientVol('amb_kawabe', 0.5, 3);
}

/** #5 焼きそばのパックを渡す・ふたを開ける（袋の「かさっ」）。 */
export function pgSecretPack(): void {
  snd.se('se_paper_bag', { vol: 0.8 });
}

/** #6 タイムカードの『休』の欄に、しゅんがはなまるを押す。 */
export function pgSecretHanamaru(): void {
  snd.se('se_pg_yasumi_hanamaru');
}

/** #6 1枚絵：ツガオの曲の静かな形（仮）。2つの町の時計は動いている（clock 2）。床はヒグラシを小さく残す。 */
export function pgSecretPicture(): void {
  audio.setMusicParam('pg_shizuka', 1);
  audio.playBgm('bgm_tsugao', { fade: 2.5 });
  // playBgm が bgm_tsugao の時計を 0 にもどすので、そのあとで
  audio.setMusicParam('clock', 2);
  snd.setAmbientVol('amb_higurashi', 0.35, 2);
  snd.setAmbientVol('amb_kawabe', 0.25, 2);
}

/** #7 操作がもどる（17:10 の公園）：曲を落として、町のいつもの音（夕方の夕鳴町）へ。 */
export function pgSecretEnd(): void {
  pgAudioHold(false);
  audio.stopBgm(2.0);
  audio.setMusicParam('clock', 0);
  const f = field();
  if (f?.map) applyPgAudio(f, true);
}

// QA：__game.cmd.pgSecretAudio('cuts' | 'hoshi' | 'yunari' | 'minato' | 'aq' | 'park' | 'chime' | 'pack' | 'hanamaru' | 'picture' | 'end')
if (import.meta.env.DEV)
  registerDebug('pgSecretAudio', ((what: string) => {
    audio.unlockAudio();
    if (what === 'cuts') pgSecretCutsStart();
    else if (what === 'hoshi' || what === 'yunari' || what === 'minato' || what === 'aq') pgSecretCut(what);
    else if (what === 'park') pgSecretPark();
    else if (what === 'chime') void pgSecretChime();
    else if (what === 'pack') pgSecretPack();
    else if (what === 'hanamaru') pgSecretHanamaru();
    else if (what === 'picture') pgSecretPicture();
    else if (what === 'end') pgSecretEnd();
    return { bgm: audio.currentBgmId(), amb: snd.activeAmbients() };
  }) as never);
