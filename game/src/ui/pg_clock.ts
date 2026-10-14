// クリア後の時計の画面（05_postgame 3.2・3.4・8.2）：時間帯の小さな印（8×8）、
// HUD の札の「6:40」（10分きざみ）、黒の上での早回り、壁の時計の読み口。
// しくみ（時刻・時間帯）は world/postgame.ts。ここは見せ方だけ。
//
//   pgClockFace()                    HUD の札の文字（「6:40」）。クリア後でなければ null
//   pgBandIcon('yu')                 時間帯の印（8×8。やり残しのページも使う）
//   pgBadgeImg('yu')                 HUD の札の左の小さな丸い札（12×12）
//   yield* pgClockRun(from, to)      ツガオ便・待つ：HUD の数字が早く回る（1.5秒）
//   （壁の時計の読み口は pg_wallclock.ts。絵から読むので import を持たない）

import type { Co } from '../engine/co';
import { PixelCanvas } from '../engine/pixel';
import { sfx } from '../audio';
import { pgBandAt, pgMin, pgOn, PG_DAY_MIN, type PgBand } from '../world/postgame';
import { UI } from './window';

// ---------------------------------------------------------------- 時刻の文字

/** 分 → 「6:40」（10分きざみ。05 3.2）。 */
export function pgFaceAt(min: number): string {
  const m = (((Math.floor(min / 10) * 10) % PG_DAY_MIN) + PG_DAY_MIN) % PG_DAY_MIN;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** HUD の札の文字。クリア後でなければ null（いつもの章の時計）。 */
export function pgClockFace(): string | null {
  return pgOn() ? pgFaceAt(pgMin()) : null;
}

// ---------------------------------------------------------------- 時間帯の印

/** 帯ごとの札の地の色（印が読めるように。夜は紺）。 */
const BADGE_BG: Record<PgBand, string> = {
  asa: '#D8E8EE',
  hiru: '#CFE6F4',
  yu: '#F6D2AE',
  yoru: '#2E3A5C',
};

const iconCache = new Map<string, HTMLCanvasElement>();

/**
 * 時間帯の印 8×8（05 3.2）：朝＝のぼる日、昼＝まるい日、夕方＝しずむ日、夜＝月。
 * `dim`：まだ窓が開いていない（やり残しのページの暗い印）。
 */
export function pgBandIcon(b: PgBand, dim = false): HTMLCanvasElement {
  const k = `${b}:${dim ? 1 : 0}`;
  let c = iconCache.get(k);
  if (c) return c;
  const p = new PixelCanvas(8, 8);
  const ink = UI.border;
  if (b === 'asa') {
    // 地平線から半分出た日と、上へ3本の光
    p.hline(0, 7, 7, ink);
    p.rect(2, 5, 4, 2, '#F2A541');
    p.hline(3, 4, 4, '#F2A541');
    p.set(2, 5, '#F6C445');
    p.set(3, 4, '#F6C445');
    p.set(1, 3, '#E08A2E');
    p.set(6, 3, '#E08A2E');
    p.set(3, 1, '#E08A2E');
    p.set(4, 1, '#E08A2E');
  } else if (b === 'hiru') {
    // まるい日（光の点が4方へ）
    p.rect(2, 2, 4, 4, '#F6C445');
    p.hline(3, 4, 1, '#F6C445');
    p.hline(3, 4, 6, '#E0A43A');
    p.vline(1, 3, 4, '#F6C445');
    p.vline(6, 3, 4, '#E0A43A');
    p.set(3, 3, '#FFF1B8');
    p.set(0, 0, '#E0A43A');
    p.set(7, 0, '#E0A43A');
    p.set(0, 7, '#E0A43A');
    p.set(7, 7, '#E0A43A');
  } else if (b === 'yu') {
    // 地平線にしずむ日（朱）と、水に映る光
    p.hline(0, 7, 5, ink);
    p.rect(2, 3, 4, 2, UI.accent);
    p.hline(3, 4, 2, UI.accent);
    p.set(3, 3, UI.accentLight);
    p.hline(2, 5, 6, UI.accentLight);
    p.hline(3, 4, 7, UI.accentLight);
  } else {
    // 三日月（左がふくらむ）と星1つ
    const moon = '#F4E3A1';
    p.vline(1, 2, 5, moon);
    p.vline(2, 1, 6, moon);
    p.set(3, 0, moon);
    p.set(3, 7, moon);
    p.set(3, 1, moon);
    p.set(3, 6, moon);
    p.set(4, 0, moon);
    p.set(4, 7, moon);
    p.set(6, 2, '#FFFFFF');
  }
  if (dim) {
    // 暗い印：色を紙の色へ寄せる
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) if (p.alpha(x, y)) p.set(x, y, b === 'yoru' ? '#9AA0A8' : '#B8B0A0');
  }
  c = p.toCanvas();
  iconCache.set(k, c);
  return c;
}

const badgeCache = new Map<PgBand, HTMLCanvasElement>();

/** HUD の時計の札の左に下げる、丸い小さな札（12×12）。地の色は時間帯の色。 */
export function pgBadgeImg(b: PgBand): HTMLCanvasElement {
  let c = badgeCache.get(b);
  if (c) return c;
  const p = new PixelCanvas(12, 12);
  const ink = UI.border;
  // 角をおとした枠（時計の札と同じ墨）
  p.rect(1, 0, 10, 12, ink);
  p.rect(0, 1, 12, 10, ink);
  p.rect(1, 1, 10, 10, BADGE_BG[b]);
  // 札の厚み（下と右）
  p.hline(1, 10, 10, b === 'yoru' ? '#1E2640' : '#C8C2B4');
  p.vline(10, 2, 10, b === 'yoru' ? '#1E2640' : '#C8C2B4');
  p.blit(toPixel(pgBandIcon(b)), 2, 2);
  c = p.toCanvas();
  badgeCache.set(b, c);
  return c;
}

/** 印の canvas を PixelCanvas へ（札に貼る）。 */
function toPixel(src: HTMLCanvasElement): PixelCanvas {
  const p = new PixelCanvas(src.width, src.height);
  const d = src.getContext('2d')!.getImageData(0, 0, src.width, src.height).data;
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      if (d[i + 3] > 127) p.set(x, y, `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
    }
  return p;
}

// ---------------------------------------------------------------- 早回り（3.4・8.2）

let runFace: string | null = null;
let runMin = 0;

/** 早回りの間の札の文字（hud.ts が読む）。null：いつもの時刻。 */
export function pgRunFace(): string | null {
  return runFace;
}

/**
 * HUD の数字が from → to（ゲームの分）へ早く回る（第3章 S04 の 11:58 → 12:00 の見せ方。
 * 10分ずつ、ぜんぶで `ms`）。時刻そのものは呼ぶ側が先に進めておく（pgAdvance / pgSkipTo）。
 * 黒の上で見せるときは、まわりを fieldCurtain(1, …) で暗くしておく（札は残る）。
 *
 *   const from = pgMin(); pgAdvance(90);
 *   yield* fieldCurtain(1, 400); yield* pgClockRun(from, pgMin()); …
 */
export function* pgClockRun(from: number, to: number, ms = 1500): Co {
  let d = to - from;
  if (d < 0) d += PG_DAY_MIN;
  const a = Math.floor(from / 10);
  const steps = Math.max(1, Math.floor((from + d) / 10) - a);
  const each = ms / steps;
  let ticked = 0;
  for (let i = 1; i <= steps; i++) {
    runMin = (a + i) * 10;
    runFace = pgFaceAt(runMin);
    // めくる音は数を絞って（10分ごとに鳴らすと うるさい）
    if (i === steps || i - ticked >= Math.max(1, Math.round(steps / 5))) {
      sfx('se_clock_flip', { pitch: 1 + Math.min(0.2, i * 0.01) });
      ticked = i;
    }
    yield each;
  }
  yield 250;
  runFace = null;
}

/** 早回りの間の時間帯（札の左の印もいっしょに回る）。null：いつもの時間帯。 */
export function pgRunBand(): PgBand | null {
  return runFace === null ? null : pgBandAt(runMin);
}

/** 早回りを途中でやめた（場面の飛ばし・タイトルへ）。 */
export function pgClockRunReset(): void {
  runFace = null;
}
