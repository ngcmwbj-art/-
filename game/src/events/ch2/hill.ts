// 星見の丘 (50_ch2_story 10.13〜10.15, 52 5章, 53 12.12〜12.13):
//   evt_ch2_hill        — up the dark path; one red lamp is looking at them
//   trig_ch2_hill_top   — the upper plaza: 「ベンチで ひと休み……」
//   evt_ch2_boss_intro  — the loudspeaker goes on calling the roll → ヨビモドシ
// The battle itself (phase 2, the finale, 「おやすみなさい」) is the battle
// team's (51 10章); after the win the screen is black and evt_ch2_ending
// takes over.

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { ease } from '../../engine/tween';
import { flag, setFlag } from '../../game/state';
import { stopAmbient, stopBgm } from '../../audio';
import { noteCall, registerScript } from '../../world/api';
import type { FieldScene } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { runMsg } from '../../world/msg';
import { drawTape } from '../../ui/window';
import * as T from '../../data/text/hoshi_events';
import { F } from '../lib';
import { holdCalls } from './calls';
import { se } from './compat';
import { firstThisLoad, runCue, storyBattle } from './common';

// ---------------------------------------------------------------- 10.13 evt_ch2_hill

registerScript('evt_ch2_hill', function* (): Co {
  if (flag('flag_ch2_hill_enter') || flag('flag_ch2_boss_beaten')) return;
  if (!firstThisLoad('evt_ch2_hill')) return;
  setFlag('flag_ch2_hill_enter', 1);
  const f = F();
  f.player.dir = 'up';
  yield 500;
  yield* runMsg(T.HILL_ENTER);
});

/** The upper plaza (y ≤ 7), once: カネナリくん suggests the bench first. */
registerScript('trig_ch2_hill_top', function* (): Co {
  if (flag('flag_ch2_hill_top')) return;
  setFlag('flag_ch2_hill_top', 1);
  se('se_flip');
  yield* runMsg(T.HILL_TOP);
});

// ---------------------------------------------------------------- the lamp's look and the name tag (world fx)

/** The pole's lamp and horns (prop_h_speaker_pole at (15,2): the lamp 17px right of its tile, the horns at the top). */
const POLE_X = 15 * 16 + 16;
const LAMP_Y = 2 * 16 - 20;

const look = { on: false, t: 0, x: POLE_X, y: LAMP_Y + 40 };
const tag = { n: 0, show: false, t: 0 };

registerWorldFx({
  map: 'map_hoshi_hill',
  update(_f: FieldScene, dt: number) {
    if (look.on) look.t += dt;
    if (tag.show) tag.t += dt;
  },
  draw(_f: FieldScene, g: Gfx, cx: number, cy: number, layer) {
    if (layer === 'glow' && look.on) {
      // the red lamp's gaze: a faint red disc sweeping left and right, then resting on them
      const k = Math.min(1, look.t / 400);
      g.alpha(0.16 * k, () => g.circle(Math.round(look.x - cx), Math.round(look.y - cy), 12, '#E84E3C'));
      g.alpha(0.1 * k, () => g.circle(Math.round(look.x - cx), Math.round(look.y - cy), 18, '#FF6A4D'));
    }
    if (layer === 'top' && tag.show) {
      // a red name tag over the pole's plate, written one character at a time
      const text = T.BOSS_NAME.slice(0, tag.n);
      const w = 16 * T.BOSS_NAME.length + 12;
      const x = Math.round(POLE_X - w / 2 - cx);
      const y = Math.round(LAMP_Y + 16 - cy);
      const a = Math.min(1, tag.t / 200);
      drawTape(g, x, y, w, 18, text, { color: '#E23B2E', ink: '#FBF3DC', alpha: a, seed: 7 });
    }
  },
});

/** The gaze sweeps (left, right) and stops over Minato. */
function* lampLook(): Co {
  const f = F();
  const p = f.player;
  look.on = true;
  look.t = 0;
  const path: [number, number][] = [
    [POLE_X - 60, p.y - 10],
    [POLE_X + 60, p.y - 6],
    [p.x, p.y - 8],
  ];
  let x0 = POLE_X;
  let y0 = LAMP_Y + 30;
  for (const [x1, y1] of path) {
    const t0 = game.time;
    const ms = 900;
    while (game.time - t0 < ms) {
      const q = ease.sineInOut(Math.min(1, (game.time - t0) / ms));
      look.x = x0 + (x1 - x0) * q;
      look.y = y0 + (y1 - y0) * q;
      yield null;
    }
    x0 = x1;
    y0 = y1;
    yield 200;
  }
  look.x = p.x;
  look.y = p.y - 8;
}

// ---------------------------------------------------------------- 10.14 evt_ch2_boss_intro

export function* evtBossIntro(): Co {
  if (flag('flag_ch2_boss_beaten')) return;
  for (;;) {
    const f = F();
    const p = f.player;
    p.dir = 'up';
    // the song goes; the calls and the line's hum stop: only insects and wind
    stopBgm(1.0);
    holdCalls(true);
    stopAmbient('amb_h_pa_hum', 1.0);
    yield 1100;
    // the lamp looks for them, and finds them; one horn's mouth glows
    yield* lampLook();
    yield 400;
    // 「ピンポンパンポーン。」: the chime itself, no text blips
    se('se_pa_chime', { pitch: 0.98 });
    noteCall();
    yield* runMsg(T.BOSS_CHIME.replace('@npc_hoshi_speaker', '@防災無線:none'));
    yield* runMsg(T.BOSS_TENKO);
    yield* runCue(T.BOSS_ASK, {
      *flip() {
        // カネナリくん steps forward and holds a flip high
        const k = F().follower;
        if (k) {
          k.data.scripted = true;
          const y0 = k.y;
          k.y = y0 - 6;
          k.dir = 'up';
          yield 120;
          k.tempPose = k.sprite.extra?.hold_up || k.sprite.extraDir?.hold_up ? 'hold_up' : null;
        }
        se('se_flip');
        yield 300;
      },
    });
    const k = F().follower;
    if (k) {
      k.tempPose = null;
      delete k.data.scripted;
    }
    yield 600;
    yield* runMsg(T.BOSS_MORNING);
    // the name tag: 「ヨビモドシ」 written over the plate, a pen stroke a character
    tag.show = true;
    tag.t = 0;
    tag.n = 0;
    for (let i = 1; i <= T.BOSS_NAME.length; i++) {
      tag.n = i;
      se('se_pen_write');
      yield 100;
    }
    yield 700;
    // the broadcast's closing chime, its last note only
    se('se_h_pa_last');
    yield 500;
    setFlag('flag_ch2_hill', 1);
    look.on = false;
    const r = yield* storyBattle({ enemies: ['boss_yobimodoshi'], boss: true, music: 'bgm_boss_yobimodoshi', background: 'bg_h_boss', canLose: true }, 'boss');
    tag.show = false;
    if (r === 'load') return;
    if (r === 'win') {
      setFlag('flag_ch2_boss_beaten', 1);
      const { evtEnding } = (yield import('./ending')) as typeof import('./ending');
      yield* evtEnding();
      return;
    }
    // 「戦う前から やりなおす」: from the top of the scene
    const g = F();
    g.player.x = 15 * 16 + 8;
    g.player.y = 6 * 16 + 16;
    g.player.dir = 'up';
    g.syncFollower(true);
    g.snapCamera();
    yield* game.fadeIn(400);
  }
}
registerScript('evt_ch2_boss_intro', evtBossIntro);
registerScript('trig_ch2_boss_intro', evtBossIntro);
