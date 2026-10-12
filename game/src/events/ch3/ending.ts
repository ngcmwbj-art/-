// evt_ch3_ending（60_ch3_story 10.29・10.30、61 21.2、62 5.3・5.4・12.6〜12.9、63 12.21〜12.24）:
// 約4分30秒、そのあと「おわり」とタイトル。第3章（シリーズ）の終わり。
//
//   カット1 S29 防波堤の昼ごはん（map_umizoi、段階4 の午後）：たかしの鉄板、グソっ君が返す、
//          「……いただきます。」→ 焼きそばの3回目。カット1b みんなの昼ごはん（吹き出し）。
//          ヤキソバンは ここで隊列を外れる（removeYakisoban・flag_ch3_yk_left）。
//   カット2 S30 真相（灯台の台座。ツガオ・グソっ君・しゅんだけ。BGM なし）。
//          「おかえりなさい」をよろいの裏に → 記憶の断片 → 「……すまんかった。」→ flag_ch3_truth。
//   カット3 S31 集合写真（来た人だけが写る。W の cut_c3_photo があればそれ、なければ
//          画面の写しを白いふちの写真にして出す）。
//   カット4 S32 帰り道（荷台）→ 銀座の角 16:59 → 5時のチャイムが最後まで → 小林家の玄関。
//   カット5 S33 翌朝 5:10、焼きそばのたかしの前。
//   カット6 みました帳 ③ とハンコケース（10枠）、ふたの内側に「おわり」→ クリアの保存
//          （clear_ch3.ts）→ タイトル。
//
// どのカットもフィールドの上で撮る（第2章のエンディングと同じ作り）。HD-2D はそのまま立体の場面。
// 来た人は 60 3.4 の表の人のうち flag_ch3_kita_<id>。0人でも、海ぞいの町の人で埋まる。

import type { Co } from '../../engine/co';
import { game, type Scene } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { W, H } from '../../engine/screen';
import { flag, setFlag, type Dir } from '../../game/state';
import { playAmbient, playBgm, playChimeMotif, stopAllAmbient, stopAmbient, stopBgm } from '../../audio';
import * as audio from '../../audio';
import { anim, despawn, registerScript, setFollowerVisible, spawn, walk } from '../../world/api';
import type { Actor } from '../../world/actor';
import { hasMap } from '../../world/maps';
import { hasChar } from '../../art/chars/registry';
import * as battleData from '../../data/battle';
import { setClockText, showClock, uiHud } from '../../ui/hud';
import { ditherIn, ditherOut } from '../../ui/transition';
import * as T from '../../data/text/c3_story4';
import { C3_NAMES } from '../../data/text/c3_names';
import { F } from '../lib';
import { endingView } from '../ending';
import { fnOf, se } from '../ch2/compat';
import { say3 } from './common';
import { spawnTruck } from './prologue';
import { kitaIds } from './minna';
import { hasC3Cut, playC3Cut } from './cuts';
import { markClearCh3 } from '../../ui/clear_ch3';
import { playEndingNotebookCh3 } from '../../ui/ending_ch3';

// ---------------------------------------------------------------- staging helpers

/** Load a map for a cut: everyone of the map out of the frame, the player at (x, y) (shown or not). */
function cutTo(map: string, x: number, y: number, o: { show?: boolean; dir?: Dir; shot?: string } = {}): void {
  const f = F();
  if (hasMap(map)) f.loadMap(map, x, y, o.dir ?? 'down');
  // (HD-2D: the shot's lens, src/hd2d/cut_c3.ts; 2D: nothing)
  endingView.shot(f, o.shot ?? 'e3_out');
  setFollowerVisible(false);
  f.player.visible = !!o.show;
  f.player.alpha = 1;
  f.syncFollower(true);
  for (const a of f.actors)
    if (a !== f.player && (a.kind === 'npc' || a.kind === 'sym')) {
      a.visible = false;
      a.solid = false;
      a.data.scripted = true;
    }
  f.snapCamera();
  uiHud.clearNotes();
}

/** Someone for a cut: their own sprite (or a stand-in), scripted, ghost. */
function put(id: string, x: number, y: number, dir: Dir, spr?: string, p?: string): Actor {
  const aid = `e3_${id}`;
  despawn(aid);
  const s = spr ?? id;
  const a = spawn(aid, x, y, { sprite: hasChar(s) ? s : hasChar(id) ? id : 'npc_obaa', dir, ghost: true });
  a.data.scripted = true;
  a.solid = false;
  if (p) a.tempPose = p;
  return a;
}

function poseOf(id: string, p: string | null): void {
  const a = F().actorById(id.startsWith('e3_') || id === 'player' ? id : `e3_${id}`);
  if (a) a.tempPose = p;
}

function* playAnim(id: string, name: string): Co {
  const aid = id === 'player' ? id : `e3_${id}`;
  if (F().actorById(aid)) yield* anim(aid, name, { wait: true });
}

function clearCast(): void {
  for (const a of [...F().actors]) if (a.id.startsWith('e3_')) despawn(a.id);
}

function* fadeCut(ms = 400): Co {
  yield* game.fadeOut(ms, '#0B0B14');
}

/** A pause the player can hurry by holding Z (×3), as in the other endings. */
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

const TOWN = Object.keys(C3_NAMES);

/**
 * The breakwater (62 5.4): the back row y31, the front y32. The fixed ones
 * first, then the town and the people who came fill the free places from
 * the middle out.
 */
function placeBreakwater(center: number, fixed: [string, number, number, Dir, string?, string?][]): void {
  const taken = new Set<string>();
  for (const [id, x, y, d, spr, p] of fixed) {
    put(id, x, y, d, spr, p);
    taken.add(`${x},${y}`);
  }
  const others = [...TOWN.filter((id) => !fixed.some((f) => f[0] === id)), ...kitaIds()];
  const spots: [number, number][] = [];
  for (const y of [32, 31]) for (let x = 6; x <= 44; x++) if (!taken.has(`${x},${y}`)) spots.push([x, y]);
  spots.sort((a, b) => Math.abs(a[0] - center) - Math.abs(b[0] - center) || b[1] - a[1]);
  others.forEach((id, i) => {
    const s = spots[i];
    if (s) put(id, s[0], s[1], 'down');
  });
}

// ---------------------------------------------------------------- カット1 S29 防波堤の昼ごはん

function* cut1Lunch(): Co {
  setFlag('flag_c3_end_goza', 1);
  cutTo('map_umizoi', 29, 32, { show: true, dir: 'down', shot: 'e3_goza' });
  placeBreakwater(30, [
    ['npc_maruyama', 30, 31, 'down', 'npc_maruyama_hige', 'fry'],
    ['kanenari', 31, 31, 'down', 'kanenari', 'hera'],
    ['npc_tsugao', 22, 31, 'down', 'npc_tsugao_shirt'],
    ['npc_hirosuke', 24, 32, 'down'],
    ['npc_pokosha', 26, 32, 'down'],
    ['npc_c3_uketsuke', 27, 32, 'down'],
    ['npc_dakoku', 25, 31, 'down', 'npc_dakoku_daisha'],
    ['npc_c3_sirenban', 6, 30, 'down'],
    ['npc_c3_toudai', 7, 30, 'down'],
    ['npc_c3_mago', 8, 30, 'down'],
    ['npc_c3_shokudo', 33, 31, 'down'],
    ['npc_c3_jouren', 34, 32, 'down'],
    ['npc_c3_himono_otto', 36, 32, 'down'],
    ['npc_c3_himono_tsuma', 37, 32, 'down'],
  ]);
  const p = F().player;
  p.dir = 'down';
  playAmbient('amb_c3_umi', { fade: 1.5 });
  playAmbient('amb_c3_bouhatei', { vol: 0.6, fade: 1.5 });
  setClockText('13:00', { cut: true });
  yield* game.fadeIn(700);
  se('se_c3_goza', { vol: 0.6 });
  playBgm('bgm_hirugohan', { variant: 'minna', fade: 2.0 });
  se('se_fry', { vol: 0.5 });
  yield* beat(900);
  yield* say3(T.S29_A);
  // グソっ君 turns it with the ヘラ: not well; the noodles fly a little
  poseOf('kanenari', null);
  yield* playAnim('kanenari', 'fry');
  se('se_c3_spatula', { vol: 0.6 });
  yield 300;
  se('se_c3_spatula', { vol: 0.6 });
  yield* playAnim('kanenari', 'fry');
  poseOf('kanenari', 'hera');
  yield* say3(T.S29_DEKITA);
  yield 300;
  yield* say3(T.S29_DEKITATE);
  se('se_plate', { vol: 0.5 });
  poseOf('kanenari', 'gassho');
  se('se_c3_gassho', { count: 1 });
  yield 500;
  yield* say3(T.S29_ITADAKIMASU);
  poseOf('kanenari', null);
  yield* playAnim('kanenari', 'eat');
  poseOf('kanenari', 'shock');
  se('se_shock', { vol: 0.7 });
  const kn = F().actorById('e3_kanenari');
  if (kn) {
    for (let i = 0; i < 2; i++) {
      kn.lift = 6;
      yield 120;
      kn.lift = 0;
      yield 120;
    }
  }
  yield* say3(T.S29_UMAI);
  poseOf('kanenari', 'hera');
  // カット1b みんなの昼ごはん（各2秒）
  for (const [id, line] of T.S29_MINNA) {
    const aid = `e3_${id}`;
    if (!F().actorById(aid)) continue;
    const { showBubble } = (yield import('../../ui/bubble')) as typeof import('../../ui/bubble');
    showBubble(aid, line, 1800);
    if (id === 'npc_hirosuke') se('se_yakiimo', { vol: 0.5 });
    yield* beat(2000);
  }
  // ポコシャとハキコが並んで会釈
  poseOf('npc_pokosha', 'bow_small');
  poseOf('npc_c3_uketsuke', 'bow_small');
  yield* beat(1200);
  poseOf('npc_pokosha', null);
  poseOf('npc_c3_uketsuke', null);
  yield* say3(T.S29_B);
  // ツガオ, at the end of the mat, eating たかし's yakisoba without a word
  poseOf('npc_tsugao', 'eat');
  yield* say3(T.S29_TSUGAO);
  yield* beat(800);
  stopBgm(3.0);
  yield* fadeCut(900);
  clearCast();
  setFlag('flag_c3_end_goza', 0);
}

// ---------------------------------------------------------------- カット2 S30 真相

/** The three memories (W's cut_c3_kioku_1〜3; else three tinted frames, 0.8 s each). */
class MemoryScene implements Scene {
  transparent = false;
  t = 0;
  constructor(private readonly n: number) {}
  update(dt: number): void {
    this.t += dt;
  }
  draw(g: Gfx): void {
    const cols = ['#1A2A3A', '#2A5A6A', '#1B1733'];
    g.clear(cols[this.n] ?? '#1B1733');
    if (this.n === 0) {
      // marine snow: white grains falling slowly
      for (let i = 0; i < 60; i++) {
        const x = (i * 97) % W;
        const y = ((i * 53 + this.t * 0.02 * (1 + (i % 3))) % (H + 10)) - 5;
        g.rect(x, Math.round(y), 1, 1, '#E8F4F8', 0.7);
      }
    } else if (this.n === 1) {
      // the tank's glass and a big finger touching it
      g.rect(0, 0, W, H, '#7FD1E8', 0.12);
      g.rect(W / 2 - 18, 40, 36, 120, '#C98A6A', 0.85);
      g.rect(W / 2 - 18, 40, 36, 14, '#A86A4E', 0.85);
      g.rect(W / 2 - 4, 46, 3, 3, '#1B1733');
    } else {
      // the park's clock tower at night, from low down; two red tail lights far off
      g.rect(W / 2 - 10, 30, 20, 186, '#2A2440');
      g.rect(W / 2 - 16, 24, 32, 30, '#3A3458');
      g.rect(W / 2 - 9, 31, 18, 16, '#E8E0C8', 0.8);
      g.rect(W - 80, 180, 2, 2, '#E23B2E');
      g.rect(W - 74, 180, 2, 2, '#E23B2E');
      g.rect(W / 2 + 20, 196, 12, 6, '#FFD23F', 0.9);
    }
    // the edges melt (2px dither)
    for (let x = 0; x < W; x += 2) {
      g.rect(x, 0, 1, 2, '#0B0B14', 0.6);
      g.rect(x + 1, H - 2, 1, 2, '#0B0B14', 0.6);
    }
  }
}

function* memories(): Co {
  if (yield* playC3Cut('cut_c3_kioku', { ms: 2400 })) return;
  const under = fnOf(audio, 'setUnderwater');
  for (let i = 0; i < 3; i++) {
    const has = hasC3Cut(`cut_c3_kioku_${i + 1}`);
    if (i === 0) under?.(1);
    if (i === 2) under?.(0);
    if (has) {
      yield* playC3Cut(`cut_c3_kioku_${i + 1}`, { ms: 800 });
      continue;
    }
    const sc = new MemoryScene(i);
    game.push(sc);
    yield 800;
    if (game.top === sc) game.pop();
  }
  under?.(0);
}

function* cut2Truth(): Co {
  cutTo('map_umizoi', 9, 30, { show: true, dir: 'left', shot: 'e3_toudai' });
  put('npc_tsugao', 8, 30, 'down', 'npc_tsugao_shirt');
  put('kanenari', 7, 30, 'right', 'kanenari');
  playAmbient('amb_c3_umi', { fade: 1.0 });
  playAmbient('amb_c3_bouhatei', { vol: 0.5, fade: 1.0 });
  setClockText(null, { cut: true });
  yield* game.fadeIn(900);
  yield* beat(800);
  // the cap off, in both hands; 表の「みんなのオヤジ」の声
  poseOf('npc_tsugao', 'cap_chest');
  yield 500;
  yield* say3(T.SHINSO_A);
  yield* say3(T.SHINSO_B);
  yield 900;
  yield* say3(T.SHINSO_C);
  // グソっ君 looks at しゅん; しゅん opens the hanko case and goes round behind him
  const kn = F().actorById('e3_kanenari');
  if (kn) kn.dir = 'right';
  yield 600;
  se('se_paper_open', { vol: 0.5 });
  yield* walk('player', [[9, 31], [6, 31], [6, 30]], { speed: 1.6, face: 'right' });
  if (kn) kn.dir = 'right';
  poseOf('player', 'stamp');
  yield 300;
  se('se_stamp', { vol: 0.6 });
  yield 800;
  poseOf('player', null);
  yield* say3(T.SHINSO_TOKERU);
  se('se_c3_kosogeru', { vol: 0.4 });
  game.flash('#FFFFFF', 300, 1);
  yield 300;
  yield* memories();
  yield 300;
  yield* say3(T.SHINSO_OMOIDASHITA);
  se('se_c3_aq_esa_bell', { vol: 0.4 });
  yield* say3(T.SHINSO_ESA);
  // he bows deeply, the cap at his chest
  const ts = F().actorById('e3_npc_tsugao');
  if (ts) yield* anim('e3_npc_tsugao', 'bow_deep', { wait: true });
  poseOf('npc_tsugao', 'bow');
  yield 1500;
  yield* say3(T.SHINSO_SUMAN);
  yield 900;
  poseOf('npc_tsugao', 'cap_chest');
  yield* say3(T.SHINSO_KOUEN);
  yield 2000;
  // グソっ君 comes round in front of him
  if (kn) yield* walk('e3_kanenari', [[7, 31], [8, 31]], { speed: 1.0, face: 'up' });
  yield* say3(T.SHINSO_KN);
  poseOf('kanenari', 'handshake');
  poseOf('npc_tsugao', 'give');
  yield 700;
  yield* say3(T.SHINSO_END);
  setFlag('flag_ch3_truth', 1);
  yield* beat(1200);
  yield* fadeCut(900);
  clearCast();
}

// ---------------------------------------------------------------- カット3 S31 集合写真

/** The photo (fallback): what is on the screen, in a white border, a little tilted (62 12.8). */
class PhotoScene implements Scene {
  transparent = false;
  t = 0;
  constructor(private readonly img: HTMLCanvasElement) {}
  update(dt: number): void {
    this.t += dt;
  }
  draw(g: Gfx): void {
    g.clear('#2A2440');
    const ctx = g.ctx;
    const k = Math.min(1, this.t / 400);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate((-2.5 * Math.PI) / 180);
    ctx.globalAlpha = k;
    ctx.fillStyle = '#1B1420';
    ctx.fillRect(-166 + 3, -98 + 3, 332, 196);
    ctx.fillStyle = '#F4F1E8';
    ctx.fillRect(-166, -98, 332, 196);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.img, -160, -92, 320, 180);
    ctx.restore();
  }
}

function snapshot(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const scr = (game as unknown as { screen?: { display: HTMLCanvasElement; buffer: HTMLCanvasElement } }).screen;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  if (scr) ctx.drawImage(scr.display, 0, 0, W, H);
  return c;
}

function* cut3Photo(): Co {
  const kita = kitaIds();
  const master = kita.includes('npc_photo_master');
  // (W's tripod at (31,33) on the sea's edge, facing everyone to the north)
  setFlag('flag_c3_end_tripod', 1);
  cutTo('map_umizoi', 31, 32, { show: true, dir: 'down', shot: 'e3_photo' });
  placeBreakwater(31, [
    ['kanenari', 32, 32, 'down', 'kanenari'],
    ['npc_maruyama', 33, 32, 'down', 'npc_maruyama_hige'],
    ['npc_tsugao', 31, 31, 'down', 'npc_tsugao'],
    ['npc_hirosuke', 30, 32, 'down'],
    ['npc_pokosha', 34, 32, 'down'],
    ['npc_piichan', 35, 32, 'down'],
    ['npc_dakoku', 32, 31, 'down', 'npc_dakoku_daisha'],
    ['npc_c3_kanshiin', 29, 32, 'down'],
  ]);
  const p = F().player;
  p.dir = 'down';
  // (the photographer behind the tripod, facing the breakwater)
  despawn('e3_npc_photo_master');
  if (master) put('npc_photo_master', 32, 33, 'up');
  else put('npc_pokosha', 32, 33, 'up');
  playBgm('bgm_hirugohan', { variant: 'minna', fade: 2.0 });
  yield* game.fadeIn(700);
  se('se_step_stone', { vol: 0.4 });
  yield* beat(600);
  if (master) yield* say3(T.PHOTO_MASTER);
  else {
    yield* say3(T.PHOTO_POKOSHA);
    for (let i = 0; i < 4; i++) {
      se('se_cursor', { vol: 0.3, pitch: 1.6 });
      yield 250;
    }
    // he runs back to his place
    yield* walk('e3_npc_pokosha', [[34, 33], [34, 32]], { speed: 3.2, face: 'down' });
  }
  se('se_c3_fue', { vol: 0.6 });
  yield* say3(T.PHOTO_FUE);
  stopBgm(0.5);
  yield 1000;
  const shot = snapshot();
  se('se_c3_photo');
  game.flash('#FFFFFF', 200, 1);
  yield 150;
  playBgm('bgm_c3_ending', { variant: 'photo', fade: 0.4 });
  if (!(yield* playC3Cut('cut_c3_photo', { kita, town: TOWN, ms: 2000 }))) {
    const sc = new PhotoScene(shot);
    game.push(sc);
    yield* beat(2600);
    yield* fadeCut(500);
    if (game.top === sc) game.pop();
  } else yield* fadeCut(500);
  clearCast();
  setFlag('flag_c3_end_tripod', 0);
  stopAllAmbient(0.6);
}

// ---------------------------------------------------------------- カット4 S32 帰り道と5時のチャイム

function* cut4Home(): Co {
  // the bed of the truck: しゅん・グソっ君・たかし; ツガオ at the wheel, ポコシャ beside him, ヒロスケ at the back
  if (hasMap('map_c3_nidai')) {
    cutTo('map_c3_nidai', 4, 3, { show: true, dir: 'right' });
    put('kanenari', 5, 3, 'right', 'kanenari');
    put('npc_maruyama', 3, 3, 'right', 'npc_maruyama_hige');
    put('npc_hirosuke', 1, 3, 'right');
    setFlag('flag_c3_nidai_view', 1);
    playAmbient('amb_c3_keitora', { vol: 0.6, fade: 0.6 });
    yield* game.fadeIn(600);
    yield* beat(1200);
    yield* say3(T.KAERI_A);
    setFlag('flag_c3_nidai_view', 0);
    yield* beat(1500);
    yield* fadeCut(600);
    stopAmbient('amb_c3_keitora', 0.6);
    clearCast();
  }
  // 銀座の角, 16:59 → 17:00, the chime rings to its last note (62 5.3: the light of chapter 1's start)
  // 夕鳴町 in chapter 1's 17:00 light (W: flag_c3_end_light 1, read when the map loads)
  setFlag('flag_c3_end_light', 1);
  cutTo('map_town', 44, 26, { show: true, dir: 'down', shot: 'e3_ginza_eve' });
  put('kanenari', 43, 26, 'down', 'kanenari');
  spawnTruck('e3_truck', 45, 30, 'down');
  setFlag('flag_hud_hidden', 0);
  setClockText('16:59', { cut: true });
  showClock(6000);
  yield* game.fadeIn(700);
  se('se_keitora_stop', { vol: 0.6 });
  const duck = fnOf(audio, 'duckMusic');
  yield* beat(1500);
  setClockText('17:00', { cut: true });
  duck?.(0.3, 16);
  yield playChimeMotif({ notes: 8 });
  playAmbient('amb_higurashi', { fade: 3 });
  yield* say3(T.CHIME_NARR);
  yield* say3(T.CHIME_KN);
  yield* beat(800);
  yield* fadeCut(700);
  despawn('e3_truck');
  clearCast();
  // 小林家の玄関
  cutTo('map_home_1f', 2, 7, { show: true, dir: 'up', shot: 'e3_home' });
  put('kanenari', 3, 7, 'up', 'kanenari');
  stopBgm(2.0);
  stopAllAmbient(1.0);
  se('se_door');
  playBgm('bgm_night', { fade: 1.5 });
  const mom = F().actors.find((a) => a.id === 'npc_mother');
  let momA: Actor | null = null;
  if (mom) {
    momA = put('npc_mother', mom.tileX, mom.tileY, 'down', 'npc_mother');
  }
  yield* game.fadeIn(500);
  yield 400;
  if (momA) momA.dir = 'down';
  yield* say3(T.HOME_A);
  yield* beat(1000);
  yield* fadeCut(900);
  clearCast();
}

// ---------------------------------------------------------------- カット5 S33 いつもの明日

function* cut5Morning(): Co {
  // 5:10 the next morning (W: flag_c3_end_light 2, pal_c3_akegata; たかし's shutter is up)
  setFlag('flag_c3_end_light', 2);
  stopBgm(0.5);
  cutTo('map_town', 27, 25, { show: false, dir: 'up', shot: 'e3_ginza_asa' });
  setClockText('5:10', { cut: true });
  spawnTruck('e3_truck', 31, 24, 'left');
  put('npc_tsugao', 30, 23, 'left', 'npc_tsugao');
  put('npc_maruyama', 27, 23, 'down', 'npc_maruyama_hige');
  put('kanenari', 26, 23, 'down', 'npc_kanenari_cook');
  F().snapCamera();
  yield* game.fadeIn(900);
  se('se_keitora_stop', { vol: 0.5 });
  yield 400;
  se('se_truck_aori', { vol: 0.5 });
  yield 600;
  se('se_h_deli_put', { vol: 0.6 });
  yield* beat(800);
  se('se_shutter', { vol: 0.5 });
  playBgm('bgm_c3_ending', { variant: 'asa', fade: 0.6 });
  yield* beat(800);
  se('se_pen_write', { vol: 0.5 });
  yield* say3(T.ASA_A);
  // しゅん, with his satchel, on the way to school
  const p = F().player;
  p.x = 20 * 16 + 8;
  p.y = 24 * 16 + 16;
  p.visible = true;
  yield* walk('player', [[25, 24]], { speed: 1.4, face: 'right' });
  poseOf('kanenari', 'wave');
  yield* say3(T.ASA_B);
  // ツガオ便 off to the next delivery; ツガオ's hand out of the window
  despawn('e3_npc_tsugao');
  se('se_keitora_go', { vol: 0.6 });
  yield* say3(T.ASA_C);
  const truck = F().actorById('e3_truck');
  if (truck) {
    truck.data.scripted = true;
    truck.solid = false;
    yield* walk('e3_truck', [[40, 24]], { speed: 2.6 });
  }
  yield* walk('player', [[28, 24], [34, 24]], { speed: 1.4, face: 'right' });
  yield* beat(800);
  yield* fadeCut(900);
  despawn('e3_truck');
  clearCast();
}

// ---------------------------------------------------------------- evt_ch3_ending

export function* evtEnding(): Co {
  setFlag('flag_ch3_stage', 4);
  // ヤキソバン leaves the line here (61 21.2): たかし goes back to his shop
  setFlag('flag_ch3_yk_left', 1);
  fnOf(battleData, 'removeYakisoban')?.();
  setFlag('flag_hud_hidden', 1);
  setFlag('flag_bgm_hold', 1);
  game.fadeColor = '#0B0B14';
  if (game.fadeAlpha < 1) game.fadeAlpha = 1;
  yield* cut1Lunch();
  yield* cut2Truth();
  yield* cut3Photo();
  yield* cut4Home();
  yield* cut5Morning();
  setFlag('flag_hud_hidden', 1);
  endingView.shot(F(), 'e3_out');
  // カット6: the notebook ③ and the case, 「おわり」; the clear data is written
  yield* playEndingNotebookCh3();
  setFlag('flag_bgm_hold', 0);
  endingView.shot(F(), null);
  markClearCh3();
  stopBgm(0.3);
  stopAllAmbient(0.3);
  setFlag('flag_hud_hidden', 0);
  yield* ditherOut(1, '#0B0B14');
  game.fadeAlpha = 0;
  yield 300;
  const { TitleScene } = (yield import('../../ui/title')) as typeof import('../../ui/title');
  game.replaceAll(new TitleScene(true));
  yield* ditherIn(900);
}

registerScript('evt_ch3_ending', function* (): Co {
  yield* evtEnding();
});

/** QA: one cut of the ending from a prepared state (1–5). */
export const CH3_ENDING_CUTS: Record<number, () => Co> = {
  1: cut1Lunch,
  2: cut2Truth,
  3: cut3Photo,
  4: cut4Home,
  5: cut5Morning,
};

