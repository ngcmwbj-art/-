// クリア後のシークレットエンディング「40年ぶりの 休み」の1枚絵（05_postgame 10.2）：夕方の夕鳴公園、
// 時計塔の下のベンチ。ナイトキャップで寝ぼけたツガオ、横にグソっ君としゅん、ベンチの上に焼きそばの
// パック。384×216 をコードで描く（2D・HD-2D とも同じ絵：第3章の集合写真と同じ扱い。HD-2D の
// フィールドの同じ構図は hd2d/cut_pg.ts の 'pg_park'）。
//
//   yield* playC3Cut('cut_pg_secret', { ms })     1枚絵（E の台本 events/pg_secret.ts が呼ぶ）
//   yield* playC3Cut('cut_pg_ichinichi', { ms })  1日を回るカット（約60秒）：夜明け前の星見台 → 朝の夕鳴町
//                                                  → 昼の港 → 旧水族館の入口。今の町とその時刻の光で、
//                                                  フィールドで撮る（world/pg_secret.ts の所と時刻、HD-2D は
//                                                  hd2d/cut_pg.ts のレンズ）。黒で始まり、黒で終わる
//   yasumiArt()                                     絵だけ（openC3Still で台詞を重ねるとき）

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { BAYER4, PixelCanvas } from '../engine/pixel';
import { charSprite, hasChar, poseFrame } from '../art/chars/registry';
import { yakisobaPack } from '../art/props/pg_props';
import { registerC3Cut } from '../events/ch3/cuts';
import { openC3Still, playC3Still, type StillArt } from './cut_c3';
import { field } from '../world/field';
import { pgSetMin } from '../world/postgame';
import { PG_SECRET_CUTS } from '../world/pg_secret';

const W = 384;
const H = 216;

/** The facing-us frame of a field sprite (its pose extra if it has one). */
function figure(id: string, pose?: string): HTMLCanvasElement | null {
  if (!hasChar(id)) return null;
  const s = charSprite(id);
  if (pose && s.extra?.[pose]) return s.extra[pose];
  return pose ? poseFrame(s, pose, 'down') : s.walk.down[0];
}

/** The evening's picture without the people (the park at 16:50, the sun low in the west at the left). */
function park(): PixelCanvas {
  const p = new PixelCanvas(W, H);
  // the sky: the evening's warm band from the top down (chapter 1's 16:52, pal_stage0), dithered
  const SKY = ['#C88AA0', '#E89A7A', '#F2B080', '#F7C27A'];
  for (let y = 0; y < 128; y++) {
    const k = Math.min(2.999, (y / 128) * 3);
    const i = Math.floor(k);
    const f = k - i;
    for (let x = 0; x < W; x++) p.set(x, y, f * 16 > BAYER4[y % 4][x % 4] ? SKY[i + 1] : SKY[i]);
  }
  // the sun going down behind the roofs at the left, its glow
  p.ellipse(46, 112, 20, 20, '#FFE7A3');
  p.ellipse(46, 112, 15, 15, '#FFF6D8');
  // the town beyond the park: roofs and the school's block, one flat dusk colour, a few lit windows
  const FAR = '#8A6A88';
  p.rect(0, 112, W, 28, FAR);
  for (const [x, w, h] of [[0, 60, 18], [64, 48, 12], [120, 80, 24], [210, 56, 14], [270, 70, 20], [344, 40, 10]] as const) {
    p.rect(x, 112 - h, w, h, FAR);
    p.hline(x, x + w - 1, 112 - h, '#9A7A96');
  }
  for (const [x, y] of [[132, 96], [150, 96], [168, 102], [292, 98], [310, 98]] as const) p.rect(x, y, 4, 3, '#F6D98A');
  // the wisteria trellis at the far left (its shade)
  p.rect(0, 124, 70, 6, '#6A5A4A');
  for (let x = 2; x < 70; x += 10) p.vline(x, 130, 170, '#5A4A3A');
  for (let i = 0; i < 26; i++) p.ellipse((i * 29) % 72, 120 + ((i * 7) % 8), 5, 3, i % 2 ? '#7A9A5A' : '#6A8A4A');
  // the ground: the park's sand, warm, long shadows running east (to the right)
  for (let y = 140; y < H; y++) {
    const c = y < 150 ? '#C8A07A' : y < 180 ? '#D4AC84' : '#DCB48C';
    p.hline(0, W - 1, y, c);
  }
  for (let i = 0; i < 90; i++) p.set((i * 97) % W, 142 + ((i * 41) % 74), '#B8906A');
  // the clock tower (fushigi_08's): the pole, the round face at 4:58, its long shadow
  const TX = 262;
  p.poly([[TX + 4, 176], [TX + 120, 186], [TX + 120, 190], [TX + 4, 180]], '#B08868');
  p.rect(TX - 4, 40, 8, 138, '#5A6E80');
  p.vline(TX - 4, 40, 177, '#7A8EA0');
  p.vline(TX + 3, 40, 177, '#3A4A5A');
  p.rect(TX - 8, 174, 16, 6, '#4A5A6A');
  p.ellipse(TX, 34, 18, 18, '#3A4A5A');
  p.ellipse(TX, 34, 16, 16, '#F4F1E8');
  p.ring(TX, 34, 16, 16, '#C8C4B8');
  for (let k = 0; k < 12; k++) p.set(Math.round(TX + Math.sin((k / 12) * Math.PI * 2) * 13), Math.round(34 - Math.cos((k / 12) * Math.PI * 2) * 13), '#3A3F48');
  // 4:58: the hour hand nearly at 5, the minute hand nearly at 12 (the chime is still to come)
  p.line(TX, 34, TX + 5, 41, '#1B1733');
  p.line(TX, 34, TX - 1, 22, '#1B1733');
  p.set(TX, 34, '#E23B2E');
  // the bench under it: the wooden slats, the iron legs, its shadow
  const BX = 116;
  const BW = 140;
  const SY = 150;
  p.poly([[BX + 6, SY + 26], [BX + BW + 40, SY + 32], [BX + BW + 40, SY + 36], [BX + 6, SY + 30]], '#B88E6A');
  p.rect(BX, SY - 22, BW, 4, '#8A5A3A');
  p.rect(BX, SY - 16, BW, 4, '#8A5A3A');
  p.hline(BX, BX + BW - 1, SY - 22, '#A87A4A');
  p.hline(BX, BX + BW - 1, SY - 16, '#A87A4A');
  p.rect(BX - 2, SY - 2, BW + 4, 6, '#9A6A44');
  p.hline(BX - 2, BX + BW + 1, SY - 2, '#C8925E');
  p.hline(BX - 2, BX + BW + 1, SY + 3, '#6A4A30');
  for (const lx of [BX + 6, BX + BW - 10]) {
    p.rect(lx, SY + 4, 4, 22, '#3A3F48');
    p.rect(lx, SY - 24, 3, 26, '#3A3F48');
  }
  return p;
}

let base: HTMLCanvasElement | null = null;

/** The picture (built once): the park, ツガオ on the bench, the pack beside him, the two in front. */
function picture(): HTMLCanvasElement {
  if (base) return base;
  const p = park();
  const c = p.toCanvas();
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const S = 3;
  const put = (img: HTMLCanvasElement | null, cx: number, foot: number, flip = false) => {
    if (!img) return;
    const w = img.width * S;
    const h = img.height * S;
    // the contact shadow, then the figure (scaled, nearest)
    g.fillStyle = 'rgba(90,58,42,0.35)';
    g.fillRect(Math.round(cx - w / 3), foot - 3, Math.round((w * 2) / 3), 4);
    g.save();
    if (flip) {
      g.translate(Math.round(cx + w / 2), foot - h);
      g.scale(-1, 1);
      g.drawImage(img, 0, 0, w, h);
    } else g.drawImage(img, Math.round(cx - w / 2), foot - h, w, h);
    g.restore();
  };
  // ツガオ asleep on the bench's right half (the nightcap's seated frames sit a little low on their foot)
  put(figure('npc_tsugao_nightcap') ?? figure('npc_tsugao'), 214, 160);
  // the yakisoba pack beside him on the seat
  const pack = yakisobaPack();
  g.drawImage(pack, 156, 148 - pack.height * S + 3, pack.width * S, pack.height * S);
  // グソっ君 and しゅん in front, a little to the left, their long shadows to the right
  g.fillStyle = 'rgba(138,96,70,0.35)';
  g.fillRect(98, 203, 70, 5);
  g.fillRect(48, 205, 66, 5);
  put(figure('kanenari'), 124, 206);
  put(figure('minato'), 72, 208);
  // the evening's warm cast over all of it, a soft vignette
  g.fillStyle = 'rgba(255,180,120,0.10)';
  g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(58,43,92,0.32)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  base = c;
  return c;
}

/** The secret ending's still (05_postgame 10.2 #6): the Z's of his doze float up a little. */
export function yasumiArt(): StillArt {
  const img = picture();
  return {
    draw(g, t) {
      g.img(img, 0, 0);
      // the doze: two small z's drifting up off the nightcap, slowly
      for (let k = 0; k < 2; k++) {
        const u = ((t / 2600 + k * 0.5) % 1 + 1) % 1;
        const x = Math.round(232 + u * 10 + k * 4);
        const y = Math.round(92 - u * 18);
        const a = u < 0.2 ? u / 0.2 : u > 0.8 ? (1 - u) / 0.2 : 1;
        g.alpha(a * 0.9, () => {
          g.rect(x, y, 5, 1, '#F4F1E8');
          g.rect(x + 3, y + 1, 1, 1, '#F4F1E8');
          g.rect(x + 2, y + 2, 1, 1, '#F4F1E8');
          g.rect(x + 1, y + 3, 1, 1, '#F4F1E8');
          g.rect(x, y + 4, 5, 1, '#F4F1E8');
        });
      }
    },
  };
}

/** As the chapter's other cuts: from black up out of it and back, or over the field and away. */
function* cut(ms: number): Co {
  if (game.fadeAlpha >= 0.5) {
    const s = yield* openC3Still(yasumiArt(), { fade: 1 });
    yield* game.fadeIn(500);
    yield Math.max(0, ms - 1000);
    yield* game.fadeOut(500);
    yield* s.close(1);
    return;
  }
  yield* playC3Still(yasumiArt(), { ms: Math.max(0, ms - 600), fade: 300, out: 300 });
}

registerC3Cut('cut_pg_secret', (o) => cut(o.ms ?? 4000));
registerC3Cut('cut_pg_yasumi', (o) => cut(o.ms ?? 4000));

/**
 * 1日を回る（10.2 #2）：each place of PG_SECRET_CUTS in turn — Minato set down there, the clock at
 * its hour (the light follows at once), the HD-2D lens — out of black and back into it. The people
 * in them are the scenario's (it stages them with the field's own calls before or round this).
 */
function* ichinichi(ms: number): Co {
  const f = field();
  if (!f) return;
  const { endingView } = (yield import('../events/ending')) as typeof import('../events/ending');
  const per = Math.max(2500, ms / PG_SECRET_CUTS.length);
  if (game.fadeAlpha < 0.99) yield* game.fadeOut(500);
  for (const c of PG_SECRET_CUTS) {
    f.loadMap(c.at.map, c.at.x, c.at.y, c.at.dir ?? 'down');
    f.renderer.onMapChange();
    pgSetMin(c.min);
    f.pgSnap();
    f.syncFollower(true);
    f.snapCamera();
    endingView.shot(f, c.shot);
    yield* game.fadeIn(600);
    yield per - 1200;
    yield* game.fadeOut(600);
  }
  endingView.shot(f, null);
}

registerC3Cut('cut_pg_ichinichi', (o) => ichinichi(o.ms ?? 60000));
