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
// 環境音（第2期）：朝 スズメ・遠くの車、昼 セミ、夕方 ヒグラシ、夜 コオロギ・カネタタキ
// （audio/ambience_pg.ts）。海ぞいの町は波とカモメ（夜はカモメなし）。星見台の夜は第2章のまま。
// 部屋の中は小さく。旧水族館は段階4（開館の準備中）：館の曲の静かな形。

import * as audio from '../audio';
import { registerDebug } from '../debug';
import { flag } from '../game/state';
import * as snd from './audio';
import { applyC3Params, c3PgAqPlan, c3PgPlan, leaveC3Audio } from './c3audio';
import { ambKept, field, type FieldScene } from './field';
import { applyHoshiParams, hoshiAmb, hoshiBgm, hoshiSpace, hoshiVariant } from './hoshi';
import type { MapDef } from './types';
import { onPgBand, pgBand, pgMin, pgOn, pgTownOf, type PgBand } from './postgame';

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

/** 部屋の中で聞く外の時間帯の床：小さく、こもらせる（05 4.3「部屋の中は小さく」）。 */
const WALL = { vol: 0.35, lp: 2000 };

/** 時間帯の床（ambience_pg.ts と第1章のヒグラシ）。 */
const TIME_BEDS: Record<PgBand, string[]> = {
  asa: ['amb_pg_suzume'],
  hiru: ['amb_pg_semi'],
  yu: ['amb_higurashi'],
  yoru: ['amb_pg_mushi'],
};
const ALL_TIME_BEDS = new Set(['amb_pg_suzume', 'amb_pg_semi', 'amb_pg_mushi', 'amb_pg_kuruma', 'amb_higurashi', 'amb_c3_hirumae', 'amb_night_insects', 'amb_train_far']);

/** 外の床を加える（部屋の中なら小さく）。 */
function addBeds(amb: string[], ambVol: Record<string, { vol: number; lp?: number }>, ids: string[], indoor: boolean, vol?: number): void {
  for (const id of ids) {
    if (!amb.includes(id)) amb.push(id);
    if (indoor) ambVol[id] = { vol: WALL.vol * (vol ?? 1), lp: WALL.lp };
    else if (vol !== undefined) ambVol[id] = { vol, lp: 20000 };
  }
}

/**
 * 夕鳴町（第1章の地図。部屋・店・モールも）。外の床は：朝 スズメ・遠くの車、昼 セミ・遠くの車、
 * 夕方 ヒグラシ（第1章の夕方）、夜 コオロギ・カネタタキ・遠い電車（踏切）・まばらな車。
 * 部屋は、第1章で外のヒグラシが聞こえていた部屋だけ、外の床を小さく。
 */
function yunariPlan(def: MapDef, band: PgBand): PgPlan {
  const b0 = def.bgm?.[0];
  const a0 = def.amb?.[0] ?? [];
  const indoor = def.kind === 'indoor';
  // 外が聞こえる地図か（外の地図、またはヒグラシが窓ごしに聞こえていた部屋）
  const hearsOut = !indoor || a0.includes('amb_higurashi');
  const own = a0.filter((id) => !ALL_TIME_BEDS.has(id));
  const ambVol: Record<string, { vol: number; lp?: number }> = { ...(def.ambVol ?? {}) };
  const base = { shizuka: 0 as const, space: defaultSpace(def, 'outdoor'), pa: (def.pa ?? 'town') as Pa };
  const amb = [...own];
  const add = (ids: string[], vol?: number) => {
    if (!hearsOut) return;
    addBeds(amb, ambVol, ids, indoor, vol);
    // 家の2階は第1章のとおり（窓が近い：.4・2.5 kHz）
    if (def.id === 'map_home_2f') for (const id of ids) ambVol[id] = { vol: 0.4 * (vol ?? 1), lp: 2500 };
  };
  switch (band) {
    case 'asa':
      // 今のクリア後の朝（S33 のあと）：曲は鳴っていない
      add(['amb_pg_suzume', 'amb_pg_kuruma']);
      return { ...base, bgm: b0 === undefined ? undefined : null, amb, ambVol };
    case 'hiru': {
      // 第3章の昼前（S01〜S04）の曲を 'hirumae' の形で
      add(['amb_pg_semi', 'amb_pg_kuruma']);
      const variant = b0 === 'bgm_home' || b0 === 'bgm_town_s0' ? 'hirumae' : undefined;
      return { ...base, bgm: b0, variant, amb, ambVol };
    }
    case 'yu':
      // 第1章の動いている夕方（段階0の曲と床。s1・s2 は使わない）
      add(['amb_higurashi']);
      return { ...base, bgm: b0, amb, ambVol };
    case 'yoru':
    default: {
      // 曲なし。夜の町が寂しすぎないように：虫を近くに、遠い電車、まばらな車。
      // 第1章の夜の床（amb[3]）があればその自分の床（川など）、無ければ段階0の床から商店街のざわめきをぬく
      const night = (def.amb?.[3] ?? own).filter((id) => !ALL_TIME_BEDS.has(id) && id !== 'amb_arcade');
      const n = [...night];
      amb.length = 0;
      amb.push(...n);
      add(['amb_pg_mushi']);
      if (!indoor) add(['amb_train_far']);
      if (!indoor) add(['amb_pg_kuruma'], 0.5);
      return { ...base, bgm: b0 === undefined ? undefined : null, amb, ambVol };
    }
  }
}

/** 星見台（第2章の地図）。 */
function hoshiPlan(def: MapDef, band: PgBand): PgPlan {
  const night = hoshiBgm(def, 1);
  const base = { space: hoshiSpace(def), pa: (def.pa ?? 'yama') as Pa, ambVol: { ...(def.ambVol ?? {}) } as Record<string, { vol: number; lp?: number }> };
  if (band === 'yoru') {
    // 第2章の h1 の夜のまま（灯りの夜）
    return { ...base, bgm: night, variant: night === NIGHT ? hoshiVariant(def) : def.variant, shizuka: 0, amb: hoshiAmb(def, 1) };
  }
  // 朝・昼・夕方：第2章のエンディングの朝の曲。朝の外だけ ふつうの形、ほかは静かな形（仮）
  const bgm = night === NIGHT ? MORNING : night;
  const indoor = def.kind === 'indoor';
  const shizuka: 0 | 1 = band === 'asa' && !indoor ? 0 : 1;
  const amb = hoshiAmb(def, 0).filter((id) => !HOSHI_NIGHT_ONLY.has(id));
  // 外が聞こえる地図（外、または夜に外の虫が聞こえる部屋）に、時間帯の床
  const hearsOut = !indoor || hoshiAmb(def, 1).includes('amb_h_insects') || hoshiAmb(def, 0).includes('amb_h_insects');
  if (hearsOut) addBeds(amb, base.ambVol, TIME_BEDS[band], indoor);
  return { ...base, bgm, shizuka, amb };
}

/** 海ぞいの町の時間帯の床：朝 カモメとスズメ、昼 今の昼の床（セミ・カモメ）、夕方 カモメとヒグラシ、夜 波と港と虫（カモメなし）。 */
function umiBeds(p: { amb: string[]; ambVol: Record<string, { vol: number; lp?: number }> }, band: PgBand, indoor: boolean): { amb: string[]; ambVol: Record<string, { vol: number; lp?: number }> } {
  const ambVol = { ...p.ambVol };
  const hearsOut = !indoor || p.amb.includes('amb_c3_umi');
  if (band === 'hiru') return { amb: [...p.amb], ambVol };
  if (band === 'yoru') {
    const amb = p.amb.filter((id) => UMI_NIGHT_KEEP.has(id));
    if (hearsOut) addBeds(amb, ambVol, ['amb_pg_mushi'], indoor, 0.5);
    return { amb, ambVol };
  }
  const amb = p.amb.filter((id) => id !== 'amb_c3_semi');
  if (hearsOut) addBeds(amb, ambVol, band === 'asa' ? ['amb_pg_suzume'] : ['amb_higurashi'], indoor, band === 'asa' ? 0.6 : 0.8);
  return { amb, ambVol };
}

/** 旧水族館が開いている時刻（開館の準備：9:00〜16:59。05 3.5）。 */
function aqOpen(): boolean {
  const m = pgMin();
  return m >= 9 * 60 && m < 17 * 60;
}

/** 海ぞいの町（第3章の地図。荷台は null：今の道）。旧水族館は段階4（開館の準備中）。 */
function umiPlan(def: MapDef, band: PgBand): PgPlan | null {
  const indoor = def.kind === 'indoor';
  const aq = c3PgAqPlan(def);
  if (aq) {
    // 開いている間は館の曲の静かな形、閉まったあと（中に残っているとき）は床だけ
    const open = aqOpen();
    return { ...aq, bgm: open ? aq.bgm : null, variant: open ? aq.variant : undefined, shizuka: 1 };
  }
  const p = c3PgPlan(def);
  if (!p) return null;
  const beds = umiBeds(p, band, indoor);
  if (band === 'yoru') return { ...p, ...beds, bgm: null, variant: undefined, shizuka: 1 };
  return { ...p, ...beds, shizuka: band === 'hiru' ? 0 : 1 };
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
/** 場面が音を持っている間（シークレットエンディング）：地図が変わっても、帯が変わっても触らない。 */
let sceneHold = false;
/** シークレットエンディングの台本の音（pg_secret_audio.ts）が、始まりで true、終わりで false。 */
export function pgAudioHold(on: boolean): void {
  sceneHold = on;
}

/**
 * field.ts applyAudio の入口。クリア後でなければ false（いつもの道。静かな形も 0 に戻す）。
 * クリア後でも、荷台は false（c3audio の段階4の道。静かな形だけ帯で置く）。
 */
export function applyPgAudio(f: FieldScene, entering: boolean, music = true): boolean {
  if (!pgOn()) {
    setShizuka(0);
    riding = false;
    sceneHold = false;
    return false;
  }
  if (sceneHold) return true;
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
  // 段階4のホール：昼の光が空の水槽に入り、うなりが半分に（63 7.5。c3audio と同じ）
  if (def.id === 'map_c3_aq_hall') callAudio('ambientEvent', 'amb_c3_aq_hall', 'hiru');
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

// 旧水族館の 9:00・17:00（帯の変わり目ではない）：中にいるとき、館の曲を出す・落とす
let aqWasOpen: boolean | null = null;
if (typeof window !== 'undefined')
  window.setInterval(() => {
    if (!pgOn()) {
      aqWasOpen = null;
      return;
    }
    const f = field();
    if (!f?.map || !f.map.def.id.startsWith('map_c3_aq')) {
      aqWasOpen = null;
      return;
    }
    const open = aqOpen();
    if (aqWasOpen !== null && open !== aqWasOpen) {
      try {
        applyPgAudio(f, false);
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[world/pgaudio] aquarium hours failed', e);
      }
    }
    aqWasOpen = open;
  }, 2000);

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
