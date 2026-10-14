// クリア後（05_postgame 4.3）の音：町 × 時間帯の曲と、帯の変わり目の移り。
// field.ts の applyAudio が、クリア後（pgOn()）はまずここに聞く。第1章〜第3章の
// 選び方（地図の bgm・hoshi.ts・c3audio.ts）は、ここを通らない（pgOn() の外は変わらない）。
//
//   夕鳴町     朝：曲なし（今のクリア後の朝のまま）  昼：第3章の昼前の町（'hirumae'）
//              夕方：bgm_town_s0（第1章の動いている夕方）  夜：曲なし
//   星見台     朝：bgm_hoshi_morning  昼・夕方：その静かな形（pg_shizuka。仮）  夜：bgm_hoshi_night（h1）
//   海ぞいの町 昼：bgm_umi_noon  朝・夕方：その静かな形（pg_shizuka。仮）  夜：曲なし
//
// 帯が変わると（onPgBand）、今の曲は小節の終わりから 6秒で落ち、次の曲が 4秒で入る
// （audio.playBgmBand）。同じ曲は形だけ変わる。会話の duck はそのまま。
// 環境音は第1期は今ある物の組みかえだけ（時間帯の環境音は第2期）。

import * as audio from '../audio';
import { registerDebug } from '../debug';
import { flag } from '../game/state';
import * as snd from './audio';
import { applyC3Params, c3PgPlan, leaveC3Audio } from './c3audio';
import { ambKept, field, type FieldScene } from './field';
import { applyHoshiParams, hoshiAmb, hoshiBgm, hoshiSpace, hoshiVariant } from './hoshi';
import type { MapDef } from './types';
import { onPgBand, pgBand, pgOn, pgTownOf, type PgBand } from './postgame';

type Pa = 'town' | 'yama' | 'umi' | 'kannai';

interface PgPlan {
  /** undefined：曲に触らない（地図が曲を持たない）。null：曲なし。 */
  bgm: string | null | undefined;
  variant?: string;
  /** 静かな形（pg_shizuka）。 */
  shizuka: 0 | 1;
  amb: string[];
  ambVol: Record<string, { vol: number; lp?: number }>;
  space: string;
  pa: Pa;
}

const NIGHT = 'bgm_hoshi_night';
const MORNING = 'bgm_hoshi_morning';

/** 星見台の夜だけの床（虫・テツヤ・防火塔・放送のうなり・トマト）：昼の間は鳴らさない。 */
const HOSHI_NIGHT_ONLY = new Set(['amb_h_insects', 'amb_h_tetsuya', 'amb_h_boukatou', 'amb_h_pa_hum', 'amb_h_tomato', 'amb_h_yama']);
/** 海ぞいの町の夜に残す床（波・港・防波堤・浜・灯台の中・食堂）。カモメ・セミ・市場は無し。 */
const UMI_NIGHT_KEEP = new Set(['amb_c3_umi', 'amb_c3_minato', 'amb_c3_bouhatei', 'amb_c3_kaisui', 'amb_c3_toudai', 'amb_c3_shokudo', 'amb_c3_siren_room', 'amb_c3_suichu']);

function defaultSpace(def: MapDef, outdoor: string): string {
  return def.space ?? (def.kind === 'indoor' ? 'room' : outdoor);
}

/** 夕鳴町（第1章の地図。部屋・店・モールも）。 */
function yunariPlan(def: MapDef, band: PgBand): PgPlan {
  const b0 = def.bgm?.[0];
  const a0 = def.amb?.[0] ?? [];
  const noHigu = a0.filter((id) => id !== 'amb_higurashi');
  const ambVol: Record<string, { vol: number; lp?: number }> = { ...(def.ambVol ?? {}) };
  const base = { shizuka: 0 as const, space: defaultSpace(def, 'outdoor'), pa: (def.pa ?? 'town') as Pa };
  switch (band) {
    case 'asa':
      // 今のクリア後の朝（S33 のあと）：曲は鳴っていない
      return { ...base, bgm: b0 === undefined ? undefined : null, amb: noHigu, ambVol };
    case 'hiru': {
      // 第3章の昼前（S01〜S04）：段階0の曲を 'hirumae' の形で、ヒグラシ → ツクツクボウシ
      const amb = a0.map((id) => (id === 'amb_higurashi' ? 'amb_c3_hirumae' : id));
      if (def.id === 'map_home_2f') ambVol.amb_c3_hirumae = { vol: 0.4, lp: 2500 };
      const variant = b0 === 'bgm_home' || b0 === 'bgm_town_s0' ? 'hirumae' : undefined;
      return { ...base, bgm: b0, variant, amb, ambVol };
    }
    case 'yu':
      // 第1章の動いている夕方（段階0の曲。s1・s2 は使わない）
      if (def.id === 'map_home_2f') ambVol.amb_higurashi = { vol: 0.4, lp: 2500 };
      return { ...base, bgm: b0, amb: a0, ambVol };
    case 'yoru':
    default:
      // 曲なし＋第1章の夜の床（無い地図は、ヒグラシをぬいた段階0の床）
      return { ...base, bgm: b0 === undefined ? undefined : null, amb: def.amb?.[3] ?? noHigu, ambVol };
  }
}

/** 星見台（第2章の地図）。 */
function hoshiPlan(def: MapDef, band: PgBand): PgPlan {
  const night = hoshiBgm(def, 1);
  const base = { space: hoshiSpace(def), pa: (def.pa ?? 'yama') as Pa, ambVol: { ...(def.ambVol ?? {}) } };
  if (band === 'yoru') {
    // 第2章の h1 の夜のまま（灯りの夜）
    return { ...base, bgm: night, variant: night === NIGHT ? hoshiVariant(def) : def.variant, shizuka: 0, amb: hoshiAmb(def, 1) };
  }
  // 朝・昼・夕方：第2章のエンディングの朝の曲。朝の外だけ ふつうの形、ほかは静かな形（仮）
  const bgm = night === NIGHT ? MORNING : night;
  const shizuka: 0 | 1 = band === 'asa' && def.kind !== 'indoor' ? 0 : 1;
  const amb = hoshiAmb(def, 0).filter((id) => !HOSHI_NIGHT_ONLY.has(id));
  return { ...base, bgm, shizuka, amb };
}

/** 海ぞいの町（第3章の地図。旧水族館と荷台は null：今の道）。 */
function umiPlan(def: MapDef, band: PgBand): PgPlan | null {
  const p = c3PgPlan(def);
  if (!p) return null;
  if (band === 'yoru') return { ...p, bgm: null, variant: undefined, shizuka: 1, amb: p.amb.filter((id) => UMI_NIGHT_KEEP.has(id)) };
  return { ...p, shizuka: band === 'hiru' ? 0 : 1 };
}

/** その地図・その帯の音（null：この地図はいつもの道で）。 */
export function pgAudioPlan(def: MapDef, band: PgBand = pgBand()): PgPlan | null {
  const town = pgTownOf(def);
  if (town === 'umi') return umiPlan(def, band);
  if (town === 'hoshi') return hoshiPlan(def, band);
  return yunariPlan(def, band);
}

/** 静かな形の数字（地図がいつもの道のときも、町と帯で決める）。 */
function shizukaOf(def: MapDef, band: PgBand): 0 | 1 {
  const town = pgTownOf(def);
  if (town === 'umi') return band === 'hiru' ? 0 : 1;
  if (town === 'hoshi') return band === 'asa' && def.kind !== 'indoor' ? 0 : 1;
  return 0;
}

function setShizuka(v: 0 | 1): void {
  if ((audio.getMusicParams() as { pg_shizuka?: number }).pg_shizuka !== v) audio.setMusicParam('pg_shizuka', v);
}

function callAudio(name: string, ...args: unknown[]): void {
  const fn = (audio as unknown as Record<string, ((...a: unknown[]) => unknown) | undefined>)[name];
  if (typeof fn !== 'function') return;
  try {
    fn(...args);
  } catch (e) {
    if (import.meta.env.DEV) console.warn(`[world/pgaudio] ${name} failed`, e);
  }
}

/** この地図で、前にこのしくみが鳴らした床（帯の変わり目に、これだけを止める）。 */
let lastBeds: { map: string; ids: string[] } = { map: '', ids: [] };
/** ツガオ便に乗っている間（黒の中）：帯が変わっても曲を出さない。 */
let riding = false;

/**
 * field.ts applyAudio の入口。クリア後でなければ false（いつもの道。静かな形も 0 に戻す）。
 * クリア後でも、旧水族館・荷台は false（c3audio の段階4の道。静かな形だけ帯で置く）。
 */
export function applyPgAudio(f: FieldScene, entering: boolean, music = true): boolean {
  if (!pgOn()) {
    setShizuka(0);
    riding = false;
    return false;
  }
  const def = f.map.def;
  const band = pgBand();
  const plan = pgAudioPlan(def, band);
  if (entering) riding = false;
  if (!plan) {
    setShizuka(shizukaOf(def, band));
    return false;
  }
  const town = pgTownOf(def);
  // ---- 空間・放送・パラメータ
  snd.setSpace(plan.space);
  if (town === 'umi') {
    applyC3Params(def);
    callAudio('setPaMode', plan.pa);
    callAudio('setUnderwater', def.id === 'map_c3_umi' ? 1 : 0);
  } else {
    leaveC3Audio();
    applyHoshiParams(def);
    // 夕鳴町の夕方は flag_stage 2（寄り道の条件のため）だが、曲は段階0の形
    snd.setMusicParam('stage', town === 'hoshi' ? 3 : 0);
  }
  // ---- 曲
  setShizuka(plan.shizuka);
  if (music && plan.bgm !== undefined && !flag('flag_bgm_hold') && !(riding && !entering)) {
    if (entering) {
      if (plan.bgm) audio.playBgm(plan.bgm, { fade: 0.6, resume: true, variant: plan.variant });
      else snd.bgm(null, 0.6);
    } else audio.playBgmBand(plan.bgm, { variant: plan.variant });
  }
  // ---- 床（環境音）
  const amb = plan.amb;
  f.renderer.ambient = amb;
  const playing = snd.activeAmbients();
  const keep = new Set<string>(amb);
  for (const id of ambKept(def.id)) keep.add(id);
  if (entering) {
    if (playing) {
      for (const id of playing) if (!keep.has(id)) snd.stopAmbient(id, 0.3);
    } else snd.stopAllAmbient(0.3);
  } else if (playing && lastBeds.map === def.id) {
    // 帯の変わり目：前の帯にこのしくみが鳴らした床で、今の帯に無い物だけ 4秒で
    for (const id of lastBeds.ids) if (!keep.has(id) && playing.includes(id)) snd.stopAmbient(id, 4);
  }
  const positional = f.renderer.positionalBeds();
  for (const id of amb) {
    const on = playing?.includes(id) ?? false;
    const opts: { vol?: number; fade?: number; lp?: number } = { fade: entering ? 0.6 : 4 };
    const wall = plan.ambVol[id];
    if (wall) {
      opts.vol = wall.vol;
      opts.lp = wall.lp ?? 20000;
    } else if (positional.includes(id)) {
      if (on) delete opts.vol;
      else opts.vol = 0;
    } else if (entering && on) {
      opts.vol = 1;
      opts.lp = 20000;
    }
    snd.playAmbient(id, opts);
  }
  lastBeds = { map: def.id, ids: [...amb] };
  f.renderer.positionalAmbience();
  return true;
}

// 帯が変わったとき（時計・乗る・待つ・寝る）：今の地図の曲と床を、次の帯へ
onPgBand(() => {
  const f = field();
  if (!f?.map) return;
  try {
    if (!applyPgAudio(f, false)) f.applyAudio(false);
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[world/pgaudio] band change failed', e);
  }
});

// ---------------------------------------------------------------- ツガオ便（05 8.2）

/**
 * ツガオ便に乗る（E の台本から。黒になる前）：あおりの音、走りだす音、曲は 1.2秒で落とし、
 * 荷台のエンジン（amb_c3_keitora）。着くまで、帯が変わっても曲は出さない。
 */
export function pgRideBoard(): void {
  riding = true;
  snd.se('se_truck_aori', { vol: 0.5 });
  snd.se('se_keitora_go', { vol: 0.55 });
  audio.stopBgm(1.2);
  snd.playAmbient('amb_c3_keitora', { vol: 0.6, fade: 0.8 });
}

/** 着いた（黒の中、地図を変えたあと・フェードインの前）：エンジンを落として止まる音。 */
export function pgRideArrive(): void {
  riding = false;
  snd.stopAmbient('amb_c3_keitora', 0.6);
  snd.se('se_keitora_stop', { vol: 0.45 });
}

/** 早回りの刻み（U の pgClockRun から、10分ごとに。i：何歩目、n：全部の歩数）。 */
export function pgKizami(i: number, n: number): void {
  snd.se('se_pg_kizami', { pitch: 1 + Math.min(0.25, (i / Math.max(1, n)) * 0.25) });
}

/** QA：今の地図・帯で何が鳴るはずか。 */
export function pgAudioDebug(band?: PgBand): unknown {
  const f = field();
  if (!f?.map) return null;
  const b = band ?? pgBand();
  const plan = pgAudioPlan(f.map.def, b);
  return {
    map: f.map.def.id,
    band: b,
    plan: plan ? { bgm: plan.bgm, variant: plan.variant, shizuka: plan.shizuka, amb: plan.amb } : 'いつもの道（c3audio）',
    now: { bgm: audio.currentBgmId(), pending: audio.bgmBandPending(), amb: snd.activeAmbients(), shizuka: (audio.getMusicParams() as { pg_shizuka?: number }).pg_shizuka },
  };
}

// QA：__game.cmd.pgAudio()       今の地図・帯の曲と床（plan）と、今 鳴っている物（now）
//     __game.cmd.pgAudio('yoru') その帯なら何が鳴るか（時刻は変えない）
if (import.meta.env.DEV) registerDebug('pgAudio', ((band?: PgBand) => pgAudioDebug(band)) as never);
