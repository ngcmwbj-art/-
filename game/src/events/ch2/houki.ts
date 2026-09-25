// 耕作放棄地と山道の入口 (50_ch2_story 10.10〜10.12, 52 3.6・8.6, 53 12.8〜12.11):
//   evt_ch2_houki   — the tall grass; far off, a headlight going to and fro
//   evt_ch2_tetsuya — the walk-behind tiller that won't stop tilling the path → 中ボス
//   evt_ch2_yobigoe — the broadcast doesn't stop any more; every scarecrow turns
//                     to the mountain; マサルさん's truck brings まつ先生. Stage 2.

import type { Co } from '../../engine/co';
import { all } from '../../engine/co';
import { game } from '../../engine/game';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag } from '../../game/state';
import { playAmbient, playBgm, stopAmbient, stopBgm } from '../../audio';
import { aimLamp, defeatSymbol, despawn, face, holdSymbol, kakashiTurn, noteCall, registerScript, setStage, spawn, walk } from '../../world/api';
import type { Actor } from '../../world/actor';
import type { FieldScene } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { runMsg } from '../../world/msg';
import { getProp } from '../../art/props/registry';
import * as T from '../../data/text/hoshi_events';
import { F, floatLine, panBack, panTo, sendAway } from '../lib';
import { ambVol, musicParam, paEcho, se } from './compat';
import { npc, poseIf, runCue, storyBattle, unpose } from './common';

// ---------------------------------------------------------------- 10.10 evt_ch2_houki

/** Through the gate into the old fields: a line while he walks (the input is not stopped). */
registerScript('evt_ch2_houki', function* (): Co {
  if (flag('flag_ch2_houki_enter')) return;
  setFlag('flag_ch2_houki_enter', 1);
  floatLine(T.HOUKI_LINE, 1500);
});

// ---------------------------------------------------------------- 10.11 evt_ch2_tetsuya

export function* evtTetsuya(): Co {
  if (flag('flag_ch2_tetsuya_beaten') || !flag('flag_ch2_gate_open')) return;
  for (;;) {
    const f = F();
    const p = f.player;
    p.dir = 'up';
    const tet = f.actorById('sym_hoshi_07') ?? null;
    // the camera to the tiller; the field's song stops, the engine comes forward
    stopBgm(0.8);
    ambVol('amb_h_tetsuya', 1, 0.6);
    if (tet) yield* panTo(Math.max(p.tileX - 3, Math.min(p.tileX + 3, tet.tileX)), Math.max(3, tet.tileY), 600);
    yield 300;
    // it stops and turns the headlight on them: bright
    if (tet) {
      holdSymbol('sym_hoshi_07', true);
      aimLamp('sym_hoshi_07', 'player');
    }
    se('se_glint', { pitch: 0.6, vol: 0.5 });
    game.flash('#FFF6D8', 70, 0.2);
    yield 500;
    yield* runMsg(T.TETSUYA_A);
    // it revs and lurches one tile at them: ドッドッ
    se('se_h_tiller', { level: 3, vol: 0.7 });
    stopAmbient('amb_h_tetsuya', 0.3);
    game.shake(2, 300);
    if (tet) {
      const x0 = tet.x;
      const y0 = tet.y;
      const dx = Math.sign(p.x - x0) * (Math.abs(p.x - x0) > 24 ? 16 : 0);
      const dy = p.y > y0 ? 16 : 0;
      poseIf(tet, 'charge');
      yield* animate(260, (q) => {
        tet.x = x0 + dx * ease.quadOut(q);
        tet.y = y0 + dy * ease.quadOut(q);
      });
    }
    yield 250;
    const r = yield* storyBattle({ enemies: ['enemy_tetsuya'], music: 'bgm_midboss', background: 'bg_h_tetsuya', canLose: true }, 'tetsuya');
    if (r === 'load') return;
    if (r === 'win') {
      // no field song after it (evt_ch2_yobigoe starts it again, 53 12.10)
      stopBgm(0);
      setFlag('flag_ch2_tetsuya_beaten', 1);
      // it backs off to the side of the path's mouth (45,2); the headlight goes out
      defeatSymbol('sym_hoshi_07');
      yield* evtYobigoe();
      return;
    }
    // 「戦う前から やりなおす」: the page from the top
    const g = F();
    const t2 = g.actorById('sym_hoshi_07');
    if (t2) holdSymbol('sym_hoshi_07', false);
    g.player.x = Math.max(38, Math.min(57, g.player.tileX)) * 16 + 8;
    g.player.y = 8 * 16 + 16;
    g.player.dir = 'up';
    g.syncFollower(true);
    g.snapCamera();
    ambVol('amb_h_tetsuya', 0.6, 0.1);
    yield* game.fadeIn(400);
  }
}
registerScript('evt_ch2_tetsuya', evtTetsuya);
registerScript('trig_ch2_tetsuya', evtTetsuya);

// ---------------------------------------------------------------- 10.12 evt_ch2_yobigoe

/** The truck parked at the path's mouth (prop_h_keitora_parked, (50,2)) waits for our truck to arrive. */
let truckDriving = false;
const PARKED = 'prop_h_keitora_parked';
registerWorldFx({
  map: 'map_hoshimidai',
  update(f: FieldScene) {
    if (!truckDriving) return;
    for (const p of f.props) if (p.obj.t === 'prop' && p.obj.prop === PARKED) p.present = false;
  },
});

/** The light truck driving up the old lane, seen from behind (the parked prop's picture) with its lights on. */
function spawnTruck(y: number): Actor {
  const a = spawn('ch2_yobi_truck', 50, y, { sprite: 'kanenari', ghost: true });
  // it carries its own headlights: seen in the dark from afar
  a.kind = 'follower';
  a.data.scripted = true;
  a.solid = false;
  a.x = 50 * 16;
  a.y = y * 16 + 30;
  const art = getProp(PARKED, {});
  const img = art?.img({} as never) ?? null;
  a.drawFn = (g, x, yy) => {
    if (!img) return;
    // the two beams to the north
    for (const dx of [6, 27]) {
      g.rect(Math.round(x + dx - 3), Math.round(yy - 64), 7, 30, '#FFE7A3', 0.08);
      g.rect(Math.round(x + dx - 2), Math.round(yy - 50), 5, 18, '#FFE7A3', 0.1);
    }
    g.img(img, Math.round(x), Math.round(yy - 33));
    g.rect(Math.round(x + 5), Math.round(yy - 36), 3, 1, '#FFE7A3', 0.9);
    g.rect(Math.round(x + 26), Math.round(yy - 36), 3, 1, '#FFE7A3', 0.9);
  };
  return a;
}

export function* evtYobigoe(): Co {
  const f = F();
  const p = f.player;
  const k = f.follower;
  p.dir = 'up';
  // 1.0 s of quiet: the engine gone, only the insects
  yield 1000;
  // from the top of the mountain the broadcast comes, and doesn't stop
  se('se_h_pa_open', { vol: 0.8 });
  yield 250;
  se('se_pa_chime', { vol: 0.7 });
  noteCall();
  yield* panTo(p.tileX, Math.max(2, p.tileY - 3), 600);
  yield 400;
  yield* runMsg(T.YOBIGOE_BROADCAST);
  // the valley answers three times (the mountain's long echo)
  paEcho(0.6, 2.0);
  yield 300;
  // t=0: over the fence to the east end of the terraces (the scarecrows at (30,6)(29,12)(25,15))
  yield* all(
    panTo(30, 9, 800),
    (function* (): Co {
      yield 600;
      // t=0.6: every scarecrow turns to the mountain, ギ、ギ (1.2 s); the palette goes to stage 2 (1.5 s)
      kakashiTurn('hill');
      setStage(2, { ms: 1500 });
      musicParam('h_stage', 2);
      playAmbient('amb_h_pa_hum', { fade: 2 });
    })(),
  );
  yield 1600;
  yield* runMsg(T.YOBIGOE_KAKASHI);
  // t≈3.0: back to Minato; the night's song again from its intro, in stage 2's scoring
  yield* panBack(800);
  playBgm('bgm_hoshi_night', { fade: 3.0, resume: false });
  yield 500;

  // headlights from behind: マサルさん's light truck up the old lane, stopping at the path's mouth
  const own = { gen: npc('npc_hoshi_gen'), fumi: npc('npc_hoshi_fumi') };
  for (const a of [own.gen, own.fumi]) if (a) a.visible = false;
  truckDriving = true;
  const truck = spawnTruck(15);
  se('se_h_keitora');
  p.dir = 'down';
  if (k) k.dir = 'down';
  const y0 = truck.y;
  const y1 = 2 * 16 + 30;
  yield* animate(3000, (q) => (truck.y = y0 + (y1 - y0) * ease.quadOut(q)), ease.linear);
  truck.y = y1;
  p.dir = 'right';
  if (k) k.dir = 'right';
  yield 500;
  // マサルさん gets out and opens the passenger door; まつ先生 gets out and pushes up the glasses
  const gen = spawn('ch2_yobi_gen', 52, 3, { sprite: 'npc_hoshi_gen', dir: 'left', ghost: true });
  gen.data.scripted = true;
  gen.kind = 'follower';
  se('se_door', { pitch: 1.2, vol: 0.6 });
  yield 500;
  yield* walk('ch2_yobi_gen', [[52, 4], [50, 4]], { speed: 2.4 });
  gen.dir = 'up';
  yield 300;
  se('se_door', { pitch: 1.3, vol: 0.5 });
  yield 300;
  const fumi = spawn('ch2_yobi_fumi', 50, 4, { sprite: 'npc_hoshi_fumi', dir: 'down', ghost: true });
  fumi.data.scripted = true;
  fumi.kind = 'follower';
  fumi.alpha = 0;
  yield* animate(250, (q) => (fumi.alpha = q));
  yield* walk('ch2_yobi_gen', [51, 4], { speed: 2.4, face: 'left' });
  yield* walk('ch2_yobi_fumi', [[50, 5], [49, 5]], { speed: 1.8 });
  face('ch2_yobi_fumi', 'player');
  poseIf(fumi, 'glasses');
  yield 400;
  unpose(fumi);
  face('ch2_yobi_fumi', 'player');
  p.dir = 'up';
  yield* runCue(T.YOBIGOE_FUMI, {
    *look() {
      fumi.dir = 'up';
      poseIf(fumi, 'look_hill');
      yield 900;
      unpose(fumi);
      face('ch2_yobi_fumi', 'player');
    },
  });
  // he walks back down to the gate; the truck stays with its lights on the path's mouth
  truckDriving = false;
  despawn('ch2_yobi_truck');
  sendAway(gen, [[51, 5], [51, 17], [50, 19]], 2.6, 0, true);
  // まつ先生 stays beside the path's mouth (47,2)
  yield* walk('ch2_yobi_fumi', [[48, 5], [47, 5], [47, 2]], { speed: 1.8, face: 'down' });
  despawn('ch2_yobi_fumi');
  for (const a of [own.gen, own.fumi]) if (a) a.visible = true;
  const f2 = F();
  f2.refreshPresence();
  const fOwn = f2.actorById('npc_hoshi_fumi');
  if (fOwn) {
    fOwn.visible = true;
    fOwn.dir = 'down';
  }
  unpose(p, k);
  setFlag('flag_ch2_keitora_here', 1);
}
registerScript('evt_ch2_yobigoe', function* (): Co {
  if (!flag('flag_ch2_tetsuya_beaten') || flag('flag_ch2_stage') >= 2) return;
  yield* evtYobigoe();
});
