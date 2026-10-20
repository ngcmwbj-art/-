// クリア後（05_postgame）：第3章クリアのあとの「1日がめぐる町」の入口。
// 時計（flag_pg_min / flag_pg_day）、時間帯、段階のフラグの書きかえ、章の門、
// 人の配置（pgSchedule）を、ここ1か所で持つ。E・U・A はこのファイルを読む。
// しくみは全部 pgOn()（flag_ch3_clear）の中だけで動く。第1章〜第3章は変わらない。

import { flag, setFlag } from '../game/state';
import { GRADES, GRADES_C, GRADES_H, type Grade } from './lighting';
import { isCh2Map, isCh3Map } from './maps';
import type { MapDef } from './types';

// ---------------------------------------------------------------- 型と表

/** 時間帯（05 3.1）：朝 5:00〜10:59、昼 11:00〜14:59、夕方 15:00〜18:59、夜 19:00〜4:59。 */
export type PgBand = 'asa' | 'hiru' | 'yu' | 'yoru';

/** 3つの町（同じ時計）。 */
export type PgTown = 'yunari' | 'hoshi' | 'umi';

export interface PgBandDef {
  id: PgBand;
  /** 画面に出す名前（「夕方に なった。」の「夕方」）。 */
  name: string;
  /** 始まりの時刻（ゲームの分、0〜1439）。 */
  start: number;
  /** 長さ（ゲームの分）。 */
  len: number;
  /** 実時間の長さ（ms）。 */
  realMs: number;
  /** `p` キーの名前（6.2）：pa・ph・py・pn。 */
  key: 'pa' | 'ph' | 'py' | 'pn';
}

/** 時計の数字は全部この表（05 3.1。1日 = 実時間 24分。仮）。 */
export const PG_BANDS: readonly PgBandDef[] = [
  { id: 'asa', name: '朝', start: 5 * 60, len: 6 * 60, realMs: 5 * 60_000, key: 'pa' },
  { id: 'hiru', name: '昼', start: 11 * 60, len: 4 * 60, realMs: 5 * 60_000, key: 'ph' },
  { id: 'yu', name: '夕方', start: 15 * 60, len: 4 * 60, realMs: 6 * 60_000, key: 'py' },
  { id: 'yoru', name: '夜', start: 19 * 60, len: 10 * 60, realMs: 8 * 60_000, key: 'pn' },
];

export const PG_DAY_MIN = 1440;
/** 「つづきから」で時計が無いときの時刻：5:10（クリアデータの銀座の朝。05 5.4）。 */
export const PG_START_MIN = 5 * 60 + 10;

/** 人の配置の1つ（4.2）。 */
export interface PgSpot {
  map: string;
  x: number;
  y: number;
  dir?: 'down' | 'up' | 'left' | 'right';
}

// ---------------------------------------------------------------- 読む

/** クリア後か（flag_ch3_clear だけで決める。05 5.1）。 */
export function pgOn(): boolean {
  return flag('flag_ch3_clear') > 0;
}

/** 今の時刻（ゲームの分、0〜1439）。クリア後でない・時計がまだ無いときは PG_START_MIN。 */
export function pgMin(): number {
  const v = flag('flag_pg_min');
  return v > 0 ? (v - 1) % PG_DAY_MIN : PG_START_MIN;
}

/** 何日目か（1〜）。 */
export function pgDay(): number {
  return Math.max(1, flag('flag_pg_day'));
}

/** 分 → 時間帯。 */
export function pgBandAt(min: number): PgBand {
  const m = ((min % PG_DAY_MIN) + PG_DAY_MIN) % PG_DAY_MIN;
  if (m >= 5 * 60 && m < 11 * 60) return 'asa';
  if (m >= 11 * 60 && m < 15 * 60) return 'hiru';
  if (m >= 15 * 60 && m < 19 * 60) return 'yu';
  return 'yoru';
}

/** 今の時間帯。 */
export function pgBand(): PgBand {
  return pgBandAt(pgMin());
}

export function pgBandDef(b: PgBand = pgBand()): PgBandDef {
  return PG_BANDS.find((d) => d.id === b)!;
}

/** 「6:40」の形（10分きざみにするのは U。ここは分まで）。 */
export function pgClockText(min = pgMin()): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${m < 10 ? '0' : ''}${m}`;
}

/** 地図がどの町か（部屋も、その町の物）。 */
export function pgTownOf(def: MapDef | undefined | null): PgTown {
  if (isCh3Map(def)) return 'umi';
  if (isCh2Map(def)) return 'hoshi';
  return 'yunari';
}

// ---------------------------------------------------------------- 章の門（5.2）

/** 第1章の時間か：第2章の前、またはクリア後の夕方（hajimete.ts・hokokusho.ts の ch1()）。 */
export function pgCh1(): boolean {
  return !flag('flag_ch2_started') || (pgOn() && pgBand() === 'yu');
}

/** クリア後の夜（第2章の窓。lanternOn() に足す条件）。 */
export function pgCh2(): boolean {
  return pgOn() && pgBand() === 'yoru';
}

/** クリア後の昼（第3章の窓）。 */
export function pgCh3(): boolean {
  return pgOn() && pgBand() === 'hiru';
}

/**
 * 05 5.3 の守り：第1章の段階2の見た目のおかしさ（HUD のちらつき、北東への流れ、
 * 赤とんぼ、打ち水など）を出すか。クリア後の夕方は段階2でも出さない。
 */
export function oddOn(): boolean {
  return flag('flag_stage') === 2 && !pgOn();
}

/**
 * 絵が読む第1章の段階（PropEnv.stage・水・赤とんぼなど）：クリア後の夕方は段階2だが、
 * 見た目は動いている町（段階3：今のクリア後の朝と同じ）にする。ふしぎ（09 のカート）は
 * flag_stage を直に読むので、そのまま押せる。
 */
export function pgVisStage(s: number): number {
  return s === 2 && pgOn() ? 3 : s;
}

// ---------------------------------------------------------------- 書く（中身は下の実装）

type Listener = (band: PgBand, prev: PgBand | null) => void;
const bandListeners: Listener[] = [];

/** 時間帯が変わったときに呼ぶ（U の知らせ、A の曲）。時計・乗る・待つ・寝る・読み込みのどれでも。 */
export function onPgBand(fn: Listener): void {
  bandListeners.push(fn);
}

let lastBand: PgBand | null = null;

function writeMin(min: number): void {
  setFlag('flag_pg_min', (((min % PG_DAY_MIN) + PG_DAY_MIN) % PG_DAY_MIN) + 1);
}

/** 時間帯が変わっていれば段階を書いて知らせる。 */
function bandCheck(): void {
  const b = pgBand();
  if (b === lastBand) return;
  const prev = lastBand;
  lastBand = b;
  applyPgStages();
  for (const fn of bandListeners) fn(b, prev);
}

/**
 * 時計を min 分進める（ツガオ便 60・90・150、QA）。日をまたげば flag_pg_day +1。
 * クリア後でなければ何もしない。
 */
export function pgAdvance(min: number): void {
  if (!pgOn() || !(min > 0)) return;
  pgEnsure();
  const cur = pgMin();
  const next = cur + Math.round(min);
  const days = Math.floor(next / PG_DAY_MIN);
  if (days > 0) setFlag('flag_pg_day', pgDay() + days);
  writeMin(next);
  bandCheck();
}

/** その時間帯の始まりまで進める（待つ・寝る）。今がその帯なら次の日の始まりまで。 */
export function pgSkipTo(band: PgBand): void {
  if (!pgOn()) return;
  pgEnsure();
  const cur = pgMin();
  const start = pgBandDef(band).start;
  let d = start - cur;
  if (d <= 0) d += PG_DAY_MIN;
  pgAdvance(d);
}

/** 時刻をじかに置く（QA）。日は変えない。 */
export function pgSetMin(min: number): void {
  if (!pgOn()) return;
  pgEnsure();
  writeMin(min);
  bandCheck();
}

/** 時計が無ければ作る（「つづきから」で読んだとき・クリアの直後。05 5.4）。 */
export function pgEnsure(): void {
  if (!pgOn()) return;
  if (!flag('flag_pg_min')) writeMin(PG_START_MIN);
  if (!flag('flag_pg_day')) setFlag('flag_pg_day', 1);
}

/** 読み込みのあと（ui/flow など）：時計を作って段階を書き、知らせの基準を今の帯に。 */
export function pgOnLoad(): void {
  lastBand = null;
  if (!pgOn()) return;
  pgEnsure();
  lastBand = pgBand();
  applyPgStages();
}

// ---------------------------------------------------------------- 段階のフラグ（5.2）

/** 帯 → 段階のフラグ（05 5.2 の表）。 */
export const PG_STAGES: Record<PgBand, { flag_stage: number; flag_clock: number; flag_ch2_stage: number; flag_ch3_stage: number }> = {
  asa: { flag_stage: 3, flag_clock: 4, flag_ch2_stage: 3, flag_ch3_stage: 4 },
  hiru: { flag_stage: 3, flag_clock: 4, flag_ch2_stage: 3, flag_ch3_stage: 4 },
  yu: { flag_stage: 2, flag_clock: 3, flag_ch2_stage: 3, flag_ch3_stage: 4 },
  yoru: { flag_stage: 3, flag_clock: 4, flag_ch2_stage: 1, flag_ch3_stage: 4 },
};

let stageHook: ((changed: string[]) => void) | null = null;
/** field.ts が入れる：今いる地図の段階のフラグが変わったら物をやり直す。 */
export function setPgStageHook(fn: (changed: string[]) => void): void {
  stageHook = fn;
}

/**
 * 今の時間帯の段階のフラグを書く（05 5.2）。flag_c3_end_light も 0 に。
 * 変わったフラグがあれば field にやり直しを頼む。クリア後でなければ何もしない。
 */
export function applyPgStages(): void {
  if (!pgOn()) return;
  const want = PG_STAGES[pgBand()];
  const changed: string[] = [];
  for (const [k, v] of Object.entries(want)) {
    if (flag(k) !== v) {
      setFlag(k, v);
      changed.push(k);
    }
  }
  if (flag('flag_c3_end_light')) {
    setFlag('flag_c3_end_light', 0);
    changed.push('flag_c3_end_light');
  }
  if (changed.length && stageHook) stageHook(changed);
}

// ---------------------------------------------------------------- 人の配置（4.2）

/**
 * クリア後の人の配置：pgSchedule に載っている人は、表がその地図の NPC の cond に勝つ。
 * 戻り値：true = この地図のこの人を出す、false = 出さない、null = 表に無い（いつもの cond）。
 * 実体は pg_schedule.ts（pgPresentImpl）。
 */
export function pgPresent(npcId: string, mapId?: string): boolean | null {
  if (!pgOn()) return null;
  return presentImpl ? presentImpl(npcId, mapId) : null;
}

/** その人の今の帯の居場所（表に無い人は undefined、いない帯は null）。 */
export function pgSpot(npcId: string, band: PgBand = pgBand()): PgSpot | null | undefined {
  return spotImpl ? spotImpl(npcId, band) : undefined;
}

let presentImpl: ((npcId: string, mapId?: string) => boolean | null) | null = null;
let spotImpl: ((npcId: string, band: PgBand) => PgSpot | null | undefined) | null = null;
/** pg_schedule.ts が入れる。 */
export function setPgScheduleImpl(present: typeof presentImpl, spot: typeof spotImpl): void {
  presentImpl = present;
  spotImpl = spot;
}

// ---------------------------------------------------------------- 時計を進める（3.3）

let freeCheck: (() => boolean) | null = null;
/** 「フィールドで操作できる間か」の判定（field が入れる）。 */
export function setPgFreeCheck(fn: () => boolean): void {
  freeCheck = fn;
}

/** 実時間 1ms あたりのゲームの分（帯ごと）。 */
function minPerMs(b: PgBand): number {
  const d = pgBandDef(b);
  return d.len / d.realMs;
}

let carry = 0;
/** QA：時計の速さ（pg('speed', 10)）。 */
export let pgSpeed = 1;
export function setPgSpeed(v: number): void {
  pgSpeed = v > 0 ? v : 1;
}

/** 毎フレーム（field の update から）。操作できる間だけ進む。 */
export function pgTick(dtMs: number): void {
  if (!pgOn()) return;
  if (!flag('flag_pg_min')) pgOnLoad();
  if (lastBand === null) lastBand = pgBand();
  if (freeCheck && !freeCheck()) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  const dt = Math.min(dtMs, 100) * pgSpeed;
  carry += dt * minPerMs(pgBand());
  if (carry < 1) return;
  const whole = Math.floor(carry);
  carry -= whole;
  pgAdvance(whole);
}

/** 帯の中の進み具合 0〜1（光の移りなど）。 */
export function pgBandProgress(min = pgMin()): number {
  const b = pgBandAt(min);
  const d = pgBandDef(b);
  return (((min - d.start + PG_DAY_MIN) % PG_DAY_MIN) + carry) / d.len;
}

// ---------------------------------------------------------------- 光（4.1）

/** HD-2D の日の光の色（hd2d/view.ts lightOf）。 */
export type PgSun = 'noon' | 'dawn' | 'eve';

interface PgLight {
  /** プリセットの名前（同じなら移らない）。 */
  id: string;
  grade: () => Grade;
  sun: PgSun;
}

const L_C = (k: keyof typeof GRADES_C, sun: PgSun): PgLight => ({ id: k, grade: () => GRADES_C[k], sun });
const L_H = (k: keyof typeof GRADES_H, sun: PgSun): PgLight => ({ id: k, grade: () => GRADES_H[k], sun });

/** 町 × 時間帯の光（05 4.1）。星見台の昼 hd・夕方 hy、海ぞいの朝 c7・夕方 c8・夜 c9 は第2期の新しい光（lighting.ts）。 */
export const PG_LIGHT: Record<PgTown, Record<PgBand, PgLight>> = {
  yunari: {
    asa: L_C('c5', 'dawn'),
    hiru: L_C('c0', 'noon'),
    yu: L_C('c6', 'eve'),
    yoru: { id: 's3', grade: () => GRADES[3], sun: 'eve' },
  },
  hoshi: {
    asa: L_H('h3c', 'dawn'),
    hiru: L_H('hd', 'noon'),
    yu: L_H('hy', 'eve'),
    yoru: L_H('h1', 'eve'),
  },
  umi: {
    asa: L_C('c7', 'dawn'),
    hiru: L_C('c4', 'noon'),
    yu: L_C('c8', 'eve'),
    yoru: L_C('c9', 'eve'),
  },
};

/** 時間帯の変わり目の光の移り（実時間 ms。05 4.1）。 */
export const PG_GRADE_MS = 20_000;

/** この地図の今の光（クリア後でなければ null）。 */
export function pgLight(def: MapDef | undefined | null): PgLight | null {
  if (!pgOn() || !def) return null;
  return PG_LIGHT[pgTownOf(def)][pgBand()];
}

/**
 * 部屋の色（render.ts・hd2d/room.ts）：'day' = 昼の窓の光（INDOOR_MUL_C0）、'eve' = 夕方（INDOOR_MUL[0]）、
 * 'night' = グレードの夜のまま（夕方の色から夜へ）。夕鳴町は4つの帯、海ぞいの町は夕方と夜だけ
 * （朝・昼は第3章の部屋のまま）。星見台の部屋は朝・夜の色を持つので null（hoshi.ts roomMorningK）。
 */
export function pgRoomTone(def: MapDef | undefined | null): 'day' | 'eve' | 'night' | null {
  if (!pgOn() || !def) return null;
  const town = pgTownOf(def);
  const b = pgBand();
  if (town === 'yunari') return b === 'asa' || b === 'hiru' ? 'day' : b === 'yu' ? 'eve' : 'night';
  if (town === 'umi') return b === 'yu' ? 'eve' : b === 'yoru' ? 'night' : null;
  return null;
}

/** 影の向きの角度（画面の向き、度）：5:00 東の日（影は西）→ 12:00 真北 → 18:00 東へ。 */
function shadowAngle(min: number): number {
  const h = min / 60;
  const A_MORN = -162.5;
  const A_NOON = -90;
  const A_EVE = 14;
  if (h < 5 || h >= 19) return A_EVE;
  if (h < 12) return A_MORN + ((A_NOON - A_MORN) * (h - 5)) / 7;
  return A_NOON + ((A_EVE - A_NOON) * Math.min(1, (h - 12) / 6));
}

/**
 * 外の地図の影の向き（render.ts の 2D の影・hd2d/view.ts の日）。時刻で回る。
 * 地図の shadowVec より先に読む。クリア後でない・部屋なら undefined。
 */
export function pgShadowVec(def: MapDef | undefined | null): [number, number] | undefined {
  if (!pgOn() || !def || def.kind === 'indoor') return undefined;
  const a = (shadowAngle(pgMin() + carry) * Math.PI) / 180;
  return [Math.cos(a), Math.sin(a)];
}

// ---------------------------------------------------------------- 旧水族館（3.5・5.3）

/** 旧水族館が開いている時間（開館の準備：9:00〜16:59）。中にいる間は追い出さない（入口の戸だけが閉まる）。 */
export const PG_AQ_OPEN: readonly [number, number] = [9 * 60, 17 * 60];
export function pgAqOpen(min = pgMin()): boolean {
  return min >= PG_AQ_OPEN[0] && min < PG_AQ_OPEN[1];
}

// ---------------------------------------------------------------- ツガオ便（8.1）

/**
 * ツガオ便の止まる所（どの時間帯でもいる。05 8.1）：夕鳴町・海ぞいの町は after.ts の c3_truck_c4
 * （この座標）。星見台は第2章の転回場の軽トラの絵（prop_tsugao_truck (42,41)）がそのまま止まる所で、
 * ツガオはその横（pg_tsugao_hoshi (41,43)、data/maps/hoshi_village.ts）。
 */
export const PG_TRUCK_STOPS: Record<string, { x: number; y: number; dir: 'down' | 'up' | 'left' | 'right' }> = {
  map_town: { x: 45, y: 30, dir: 'down' },
  map_umizoi: { x: 23, y: 18, dir: 'right' },
  // 岬（旧水族館の 前。2026-10-20 町の 外へ 移した）：港と 岬の あいだも ツガオ便
  map_c3_misaki: { x: 22, y: 14, dir: 'up' },
  map_hoshimidai: { x: 42, y: 41, dir: 'left' },
};

/** 止まっているツガオ便の絵：夕鳴町の夕方は昼寝（tsugao_truck_nap）。 */
export function pgTruckKind(mapId: string): 'tsugao_truck' | 'tsugao_truck_nap' {
  return pgOn() && mapId === 'map_town' && pgBand() === 'yu' ? 'tsugao_truck_nap' : 'tsugao_truck';
}

// ---------------------------------------------------------------- 灯り（5.2）

/** クリア後のトマトの灯り：夜の星見台で点く（lanternOn() のクリア後の条件。E と同じ）。 */
export function pgLantern(): boolean {
  return pgOn() && pgBand() === 'yoru';
}

// ---------------------------------------------------------------- 会話のキー（6.2）

/**
 * `p` キー（調べる物の表：world/maps.ts pickStage）：クリア後だけ、段階のキーより先に読む。
 * 帯の `pa/ph/py/pn` → `p`。無ければ undefined（いつもの段階のキーへ）。
 */
export function pgPickKey<T>(rec: Record<string, T>): T | undefined {
  if (!pgOn()) return undefined;
  const k = pgBandDef().key;
  if (rec[k] !== undefined) return rec[k];
  if (rec.p !== undefined) return rec.p;
  return undefined;
}

/**
 * `p` キー（人の会話の表：world/interact.ts pickTalk）：はじめての1回は `p_1`
 * （flag_seen_<id>_p_1 で数える）→ 帯の `pa/ph/py/pn` → `p`。無ければ null。
 */
export function pgTalkKey(npcId: string, table: Record<string, unknown>): string | null {
  if (!pgOn()) return null;
  const seen = `flag_seen_${npcId}_p_1`;
  if (table.p_1 !== undefined && !flag(seen)) {
    setFlag(seen, 1);
    return 'p_1';
  }
  const k = pgBandDef().key;
  if (table[k] !== undefined) return k;
  if (table.p !== undefined) return 'p';
  return null;
}

/** その表に `p` のキーがあるか。 */
export function hasPgKeys(rec: Record<string, unknown>): boolean {
  for (const k of ['p', 'p_1', 'pa', 'ph', 'py', 'pn']) if (rec[k] !== undefined) return true;
  return false;
}
