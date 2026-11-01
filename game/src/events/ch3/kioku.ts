// S30 グソっ君の 記憶の 断片（60_ch3_story 10.29 カット2）を フィールドの 上で（2026-10-20 依頼主「グソっ君の
// 過去の話を打ち明ける時のフラッシュバックがクオリティ低過ぎるから、ちゃんと作り直して」。前は 1枚絵 3枚
// ×0.8 秒＝ui/cut_c3.ts kiokuArt）。文・順番・フラグは 前の まま（文の ない 回想。黒い 判が とけた 白い
// 光の あと → 回想 →「……思い出した。」）。見せる 中身は ツガオの 話（SHINSO_B・C）の 範囲の まま、
// こわく ならない ように：
//
//   K1 深い 海  沖の 底 (map_c3_umi_oki) を 暗い 青に：マリンスノーが 降る 中、小さな グソっ君が 1ぴき、泡。
//   K2 水族館   大水槽の ホール (map_c3_aq_hall) の 開いて いた ころ：ガラスの 向こうに 小さな グソっ君、
//               前を 人が 通りすぎて いく。
//   K3 閉館の 日 同じ ホール、だれも いない：ツガオ（背広）が ガラスの 前に 立ち、明かりが 1つずつ 消えて、
//               水槽の 青い 光と ふたり だけが 残る。
//   K4 公園の 夜 夕鳴町の 公園 (map_town) の 時計塔の 下に グソっ君。遠くへ 赤い テールランプが 2つ。
//
// 色は「回想の 色」：HD-2D は 仕上げの 層（hd2d/post.ts memA、events/ending.ts endingView.memory）で 色を
// あせさせ、ふちを 暗く。2D は この ファイルの 層（うすい 色と ふちの ディザ）。どちらも ふちが とける。
// 戦いの 実験の ところは 絵に しない（ツガオの 言葉の まま）。道具や 檻は 出さない。

import type { Co } from '../../engine/co';
import { game, type Widget } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { BAYER4 } from '../../engine/pixel';
import { H, W } from '../../engine/screen';
import { flag, setFlag, type Dir } from '../../game/state';
import { playAmbient, stopAllAmbient } from '../../audio';
import * as audio from '../../audio';
import { despawn, setFollowerVisible, spawn } from '../../world/api';
import type { Actor } from '../../world/actor';
import { hasMap } from '../../world/maps';
import { fxAt, fxElsewhere, registerWorldFx } from '../../world/fx';
import type { FieldScene } from '../../world/field';
import { uiHud } from '../../ui/hud';
import { F } from '../lib';
import { endingView } from '../ending';
import { fnOf, se } from '../ch2/compat';
import { jumpMap } from './prologue';
import { camAt, panPx } from './stagecam';
import { registerDebug } from '../../debug';

/** The flag the memories' maps read (umi_oki's chain hidden, the shinkai's dark off …). */
export const KIOKU_FLAG = 'flag_c3_kioku';

// ---------------------------------------------------------------- the memory's tone

interface Tone {
  tint: [number, number, number];
  mul: [number, number, number];
  /** The 2D's wash and the edges' colour. */
  wash: string;
  edge: string;
}
const TONES: Record<'deep' | 'warm' | 'dusk' | 'night', Tone> = {
  deep: { tint: [0.86, 0.98, 1.12], mul: [0.3, 0.42, 0.7], wash: '#123050', edge: '#0B1626' },
  warm: { tint: [1.1, 1.0, 0.84], mul: [1.75, 1.62, 1.4], wash: '#C8A878', edge: '#F4EAD8' },
  dusk: { tint: [1.04, 0.98, 0.9], mul: [1.1, 1.06, 1.08], wash: '#6A5A6A', edge: '#2A2440' },
  night: { tint: [0.9, 0.96, 1.1], mul: [0.4, 0.44, 0.66], wash: '#1B1733', edge: '#0B0B14' },
};

function setTone(t: Tone, k = 1): void {
  const m = endingView.memory;
  m.k = k;
  m.tint = t.tint;
  m.mul = t.mul;
}

/** The 2D layer over the memory: the melting edges (dithered), a faint wash in 2D, the film's slow flicker. */
class MemoryEdge implements Widget {
  modal = false;
  done = false;
  t = 0;
  tone: Tone = TONES.warm;
  /** 0..1 how much of it shows. */
  k = 0;
  update(dt: number): void {
    this.t += dt;
  }
  draw(g: Gfx): void {
    if (this.k <= 0) return;
    const f = F();
    const hd = fxElsewhere(f);
    // (2D: the tone the HD-2D finish gives, as a wash)
    if (!hd) g.rect(0, 0, W, H, this.tone.wash, 0.28 * this.k);
    // the edges melt: an ordered dither toward the tone's edge colour over the outer 22 px
    const px = 22;
    for (let y = 0; y < H; y += 2)
      for (let x = 0; x < W; x += 2) {
        const d = Math.min(x, y, W - 1 - x, H - 1 - y);
        if (d >= px) {
          if (y > px && y < H - px) x = Math.max(x, W - px - 2);
          continue;
        }
        const k = (1 - d / px) * this.k;
        if (k * 16 > BAYER4[(y >> 1) % 4][(x >> 1) % 4]) g.rect(x, y, 2, 2, this.tone.edge, 0.9);
      }
    // the old film's flicker
    const fl = (Math.sin(this.t / 70) + Math.sin(this.t / 43)) * 0.012;
    if (fl > 0) g.rect(0, 0, W, H, '#FFFFFF', fl * this.k);
  }
}

// ---------------------------------------------------------------- what moves in the memories (anchored to the world)

/** The little グソっ君 of the memories (a small isopod, 16×10, drawn into the frame; brown and round as he is). */
function littleKn(g: Gfx, x: number, y: number, t: number, alpha: number, flip: boolean): void {
  const ox = Math.round(x) - 8;
  const oy = Math.round(y) - 9;
  const s = (c: number, r: number, w: number, h: number, col: string) => g.rect(flip ? ox + 16 - c - w : ox + c, oy + r, w, h, col, alpha);
  // the legs, paddling slowly
  const k = Math.floor(t / 220) % 2;
  for (let i = 0; i < 5; i++) s(3 + i * 2, 8 + ((i + k) % 2), 1, 1, '#6A4A3A');
  // the body: segments, darker lines between them
  s(2, 3, 12, 5, '#B8865A');
  s(3, 2, 10, 1, '#C89A6A');
  s(4, 1, 8, 1, '#D8B080');
  for (const c of [5, 8, 11]) s(c, 2, 1, 6, '#8A5A3A');
  s(1, 4, 1, 3, '#A8764A');
  s(14, 4, 1, 3, '#A8764A');
  // the head at the front, its eye, the feelers
  s(13, 4, 2, 3, '#C89A6A');
  s(14, 5, 1, 1, '#1B1733');
  s(15, 3 - k, 1, 1, '#8A5A3A');
  s(15, 2 - k, 1, 1, '#8A5A3A');
}

interface Mote {
  x: number;
  y: number;
  v: number;
}

const fx = {
  /** Which memory is up ('' = none): what the layer draws. */
  on: '' as '' | 'deep' | 'tank' | 'park',
  /** The little one's world px (on the ground under it) and how high over it. */
  kn: [0, 0, 0] as [number, number, number],
  knFlip: false,
  /** The tank's glow (0..1). */
  glow: 1,
  /** The tail lights (world px and their alpha). */
  tail: [0, 0, 0] as [number, number, number],
  snow: [] as Mote[],
  bubbles: [] as { x: number; h: number; t: number }[],
  lamps: [] as [number, number][],
};

function fxUpdate(f: FieldScene, dt: number): void {
  if (!fx.on) return;
  if (fx.on === 'deep') {
    // the marine snow, in the screen's own px: white specks falling slowly
    while (fx.snow.length < 70) fx.snow.push({ x: Math.random() * W, y: Math.random() * H, v: 0.004 + Math.random() * 0.01 });
    for (const m of fx.snow) {
      m.y += dt * m.v;
      m.x += Math.sin((f.t + m.v * 1e5) / 900) * 0.02;
      if (m.y > H + 2) {
        m.y = -2;
        m.x = Math.random() * W;
      }
    }
  }
  if (fx.on === 'deep' || fx.on === 'tank') {
    if (Math.random() < dt / 520) fx.bubbles.push({ x: fx.kn[0] + 4 + Math.random() * 3, h: fx.kn[2] + 6, t: 0 });
    for (const b of fx.bubbles) {
      b.t += dt;
      b.h += dt * 0.02;
      b.x += Math.sin(b.t / 180) * 0.06;
    }
    fx.bubbles = fx.bubbles.filter((b) => b.t < 2200);
  }
}

function fxDraw(f: FieldScene, g: Gfx, cx: number, cy: number): void {
  if (!fx.on) return;
  const t = f.t;
  if (fx.on === 'deep') {
    // a faint light from far above, then the snow
    g.composite('lighter', () => {
      for (let y = 0; y < H; y += 2) g.rect(150 + Math.round(y * 0.25), y, 70, 2, '#3A6A9A', 0.06 * (1 - y / H));
    });
    for (const m of fx.snow) g.rect(Math.round(m.x), Math.round(m.y), 1, 1, '#E8F4F8', 0.75);
  }
  if (fx.on === 'tank') {
    // the tank's blue light round the little one (it stays when the hall goes dark)
    const [x, y] = fxAt(f, fx.kn[0], fx.kn[1] - fx.kn[2], cx, cy, fx.kn[1]);
    g.composite('lighter', () => {
      for (let r = 6; r >= 1; r--) g.rect(Math.round(x) - r * 6, Math.round(y) - r * 3 - 4, r * 12, r * 6, '#2E6A9A', 0.05 * fx.glow);
    });
  }
  if (fx.on === 'deep' || fx.on === 'tank') {
    const [x, y] = fxAt(f, fx.kn[0], fx.kn[1] - fx.kn[2], cx, cy, fx.kn[1]);
    littleKn(g, x, y, t, fx.on === 'tank' ? 0.92 : 1, fx.knFlip);
    for (const b of fx.bubbles) {
      const [bx, by] = fxAt(f, b.x, fx.kn[1] - b.h, cx, cy, fx.kn[1]);
      g.ring(Math.round(bx), Math.round(by), 1, '#E8FAFF');
    }
  }
  if (fx.on === 'park') {
    // the park's lamps (on at night) and the two red tail lights going away
    g.composite('lighter', () => {
      for (const [lx, ly] of fx.lamps) {
        const [x, y] = fxAt(f, lx, ly - 40, cx, cy, ly);
        for (let r = 5; r >= 1; r--) g.rect(Math.round(x) - r * 3, Math.round(y) - r * 3, r * 6, r * 6, '#FFE7A3', 0.06);
        g.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, '#FFF6D8', 0.9);
      }
      const [tx, ty, ta] = fx.tail;
      if (ta > 0) {
        const [x, y] = fxAt(f, tx, ty - 6, cx, cy, ty);
        for (const dx of [-3, 3]) {
          g.rect(Math.round(x) + dx - 2, Math.round(y) - 2, 5, 5, '#E23B2E', 0.25 * ta);
          g.rect(Math.round(x) + dx, Math.round(y), 1, 1, '#FF6A5A', ta);
        }
      }
    });
  }
}

for (const map of ['map_c3_umi_oki', 'map_c3_aq_hall', 'map_town'])
  registerWorldFx({
    map,
    anchored: true,
    update: (f, dt) => fxUpdate(f, dt),
    draw(f, g, cx, cy, layer) {
      if (layer === 'top') fxDraw(f, g, cx, cy);
    },
  });

// ---------------------------------------------------------------- staging

function who(aid: string, x: number, y: number, dir: Dir, spr: string): Actor {
  despawn(aid);
  const a = spawn(aid, x, y, { sprite: spr, dir, ghost: true });
  a.data.scripted = true;
  a.data.noSee = true;
  a.solid = false;
  return a;
}

/** A memory's map under the white/black: its people away, the player hidden at (x, y). */
function stageMap(map: string, x: number, y: number, shot: string): void {
  const f = F();
  jumpMap(map, x, y, 'down');
  endingView.shot(f, shot);
  setFollowerVisible(false);
  f.player.visible = false;
  f.syncFollower(true);
  // (everyone of the map and the party's followers: only the memory's own people)
  for (const a of f.actors)
    if (a !== f.player && !a.id.startsWith('c3_kk_')) {
      a.visible = false;
      if (a === f.follower) continue;
      a.solid = false;
      a.data.scripted = true;
    }
  f.snapCamera();
  uiHud.clearNotes();
  // (only the memory's own sounds)
  stopAllAmbient(0.2);
}

/**
 * The party kept out of the memory: leaving the sea floor turns グソっ君 the follower visible again
 * (kaisui.ts, a frame after the map changes) — hidden again here, for a few frames.
 */
function* keepPartyHidden(): Co {
  for (let i = 0; i < 4; i++) {
    yield null;
    setFollowerVisible(false);
    const f = F();
    f.player.visible = false;
    if (f.follower) f.follower.visible = false;
  }
}

function clearKioku(): void {
  for (const a of [...F().actors]) if (a.id.startsWith('c3_kk_')) despawn(a.id);
}

/**
 * A walk run beside the scene (game.scripts.run) that ends when the walker is taken away too — a cut to
 * the next shot despawns whoever is still on the way (world/api walk would wait for them for ever and
 * keep the field from the player).
 */
function* stroll(id: string, to: [number, number][], speed: number): Co {
  const a = F().actorById(id);
  if (!a) return;
  a.pathSpeed = speed * 16;
  a.data.scripted = true;
  a.path.push(...to.map(([x, y]) => [x * 16 + 8, y * 16 + 16] as [number, number]));
  yield () => a.path.length === 0 || F().actorById(id) !== a;
  a.moving = false;
}

/** A wait the player can hurry by holding Z (×3). */
function* beat(ms: number): Co {
  let left = ms;
  let last = game.time;
  while (left > 0) {
    yield null;
    const dt = game.time - last;
    last = game.time;
    left -= game.input.down('confirm') ? dt * 3 : dt;
  }
}

/** Can the memories be played on the field (their maps are there)? */
export function canKioku(): boolean {
  return hasMap('map_c3_umi_oki') && hasMap('map_c3_aq_hall') && hasMap('map_town');
}

/**
 * The four memories, about 11 s (Z hurries them), from the white of the black stamp melting to the white
 * again; `back()` puts the present (the lighthouse's plinth) up under the last white.
 */
export function* playKiokuField(back: () => void): Co {
  const under = fnOf(audio, 'setUnderwater');
  const edge = new MemoryEdge();
  game.ui.push(edge);
  setFlag(KIOKU_FLAG, 1);
  const keepHud = flag('flag_hud_hidden');
  setFlag('flag_hud_hidden', 1);
  game.fadeColor = '#FFFFFF';
  yield* game.fadeOut(200, '#FFFFFF');
  // ---- K1 the deep sea
  stageMap('map_c3_umi_oki', 6, 8, 'k3_deep');
  fx.on = 'deep';
  fx.kn = [6 * 16 + 8, 8 * 16 + 14, 0];
  fx.knFlip = false;
  fx.snow = [];
  fx.bubbles = [];
  edge.tone = TONES.deep;
  setTone(TONES.deep, 1);
  edge.k = 1;
  camAt(6 * 16 + 8, 8 * 16);
  under?.(1);
  playAmbient('amb_c3_suichu', { vol: 0.5, fade: 0.4 });
  yield* game.fadeIn(500);
  se('se_yoburi_awa', { vol: 0.3 });
  game.scripts.run(panPx(6 * 16 + 8, 8 * 16 + 6, 2600));
  yield* beat(2600);
  yield* game.fadeOut(350, '#0B0B14');
  under?.(0);
  fx.on = '';
  // ---- K2 the old aquarium, open: the little one behind the glass, people going past
  stageMap('map_c3_aq_hall', 12, 9, 'k3_tank');
  game.scripts.run(keepPartyHidden());
  fx.on = 'tank';
  fx.glow = 1;
  fx.kn = [12 * 16 + 8, 4 * 16 + 12, 10];
  fx.bubbles = [];
  edge.tone = TONES.warm;
  setTone(TONES.warm, 1);
  camAt(12 * 16 + 8, 7 * 16);
  playAmbient('amb_c3_aq_hall', { vol: 0.5, fade: 0.4 });
  // (from the frame's edges, across in front of the tank: the visitors of the days it was open)
  const walkers: [string, number, number, number, number][] = [
    ['npc_walker_shufu', 5, 8, 19, 1.7],
    ['npc_walker_kid', 20, 9, 5, 2.2],
    ['npc_walker_salaryman', 4, 9, 19, 2.0],
    ['npc_postman', 21, 8, 6, 1.8],
  ];
  walkers.forEach(([spr, x, y, tx, sp], i) => {
    const a = who(`c3_kk_v${i}`, x, y, tx > x ? 'right' : 'left', spr);
    a.visible = false;
    game.scripts.run(
      (function* (): Co {
        yield i * 650;
        a.visible = true;
        yield* stroll(a.id, [[tx, y]], sp);
        despawn(a.id);
      })(),
    );
  });
  yield* game.fadeIn(400);
  // the little one crawls along the tank's floor to the glass
  const k2 = game.time;
  game.scripts.run(
    (function* (): Co {
      while (fx.on === 'tank' && game.time - k2 < 3200) {
        fx.kn[0] = 12 * 16 + 8 - 18 + ((game.time - k2) / 3200) * 30;
        yield null;
      }
    })(),
  );
  se('se_step_tile', { vol: 0.15 });
  yield* beat(3000);
  yield* game.fadeOut(300, '#0B0B14');
  clearKioku();
  // ---- K3 the closing day: nobody but ツガオ at the glass; the lights go out one by one
  stageMap('map_c3_aq_hall', 12, 9, 'k3_close');
  fx.on = 'tank';
  fx.glow = 1;
  fx.kn = [12 * 16 + 14, 4 * 16 + 12, 10];
  fx.knFlip = true;
  edge.tone = TONES.dusk;
  setTone(TONES.dusk, 1);
  camAt(12 * 16 + 8, 7 * 16 + 8);
  who('c3_kk_ts', 12, 6, 'up', 'npc_tsugao_suit');
  yield* game.fadeIn(400);
  yield* beat(900);
  const steps: [number, number, number][] = [
    [0.78, 0.75, 0.84],
    [0.55, 0.53, 0.64],
    [0.36, 0.35, 0.48],
  ];
  for (const m of steps) {
    se('se_lamp_click', { vol: 0.35 });
    endingView.memory.mul = m;
    yield* beat(620);
  }
  yield* beat(500);
  yield* game.fadeOut(400, '#0B0B14');
  clearKioku();
  fx.on = '';
  // ---- K4 夕鳴町's park at night: グソっ君 under the clock tower, two tail lights going away
  stageMap('map_town', 15, 9, 'k3_park');
  fx.on = 'park';
  fx.lamps = [
    [12 * 16 + 8, 10 * 16 + 16],
    [19 * 16 + 8, 10 * 16 + 16],
    [12 * 16 + 8, 3 * 16 + 16],
    [19 * 16 + 8, 3 * 16 + 16],
  ];
  edge.tone = TONES.night;
  setTone(TONES.night, 1);
  camAt(17 * 16 + 8, 12 * 16 + 8);
  const kn = who('c3_kk_kn', 16, 9, 'down', 'kanenari');
  kn.moving = false;
  playAmbient('amb_pg_mushi', { vol: 0.35, fade: 0.6 });
  fx.tail = [20 * 16, 15 * 16, 1];
  yield* game.fadeIn(500);
  se('se_keitora_go', { vol: 0.15 });
  const t0 = game.time;
  game.scripts.run(
    (function* (): Co {
      while (fx.on === 'park' && game.time - t0 < 2600) {
        const p = (game.time - t0) / 2600;
        fx.tail = [(20 + p * 9) * 16, 15 * 16 - p * 6, 1 - p * 0.8];
        yield null;
      }
      fx.tail[2] = 0;
    })(),
  );
  yield* beat(1500);
  kn.dir = 'right';
  yield* beat(1500);
  // ---- back to the present, through the white
  yield* game.fadeOut(300, '#FFFFFF');
  fx.on = '';
  fx.tail[2] = 0;
  clearKioku();
  endingView.memory.k = 0;
  endingView.memory.mul = [1, 1, 1];
  edge.k = 0;
  edge.done = true;
  setFlag(KIOKU_FLAG, 0);
  setFlag('flag_hud_hidden', keepHud);
  stopAllAmbient(0.2);
  back();
  yield* game.fadeIn(500);
  game.fadeColor = '#0B0B14';
}

// QA (dev server): the memories alone, now (back to where the player stood): __game.cmd.c3kioku()
if (import.meta.env.DEV)
  registerDebug('c3kioku', () => {
    const f = F();
    // (as in the ending: たかし has left the line by S30)
    setFlag('flag_ch3_yk_left', 1);
    const at = { map: f.map.id, x: f.player.tileX, y: f.player.tileY };
    f.startScript(
      (function* (): Co {
        yield* playKiokuField(() => {
          jumpMap(at.map, at.x, at.y, 'down');
          F().player.visible = true;
          endingView.shot(F(), null);
        });
      })(),
    );
    return 'kioku';
  });
if (import.meta.env.DEV) registerDebug('c3kiokuFx', () => ({ on: fx.on, kn: fx.kn, snow: fx.snow.length, cam: [F().camX, F().camY], map: F().map.id, proj: fxAt(F(), fx.kn[0], fx.kn[1], F().camX, F().camY) }));
