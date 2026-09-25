// Sound-test cues for chapter 2 (53_ch2_audio 12, the cue sheets of 星見台):
// the audio side of each scene, played through the public API exactly as the
// event and battle code calls it (timings from the script, 50 10章 / 51).

import { liveGraph } from '../engine';
import * as A from '../index';
import type { LoopHandle } from '../registry';
import type { Cue, CueStep } from './cues';

const S = (t: number, text: string, fn: () => void): CueStep => ({ t, text, fn });
const at = (id: string, o?: A.SfxOpts) => () => A.sfx(id, o);

/** Loops a cue started and has to stop later (the crossing bell, the idles). */
const loops = new Map<string, LoopHandle>();
function loop(id: string, o?: A.SfxOpts): () => void {
  return () => {
    loops.get(id)?.stop(0.1);
    loops.set(id, A.sfxLoop(id, o));
  };
}
function stopLoop(id: string, fade: number): () => void {
  return () => {
    loops.get(id)?.stop(fade);
    loops.delete(id);
  };
}
/** The chapter-2 cue sheets stop their loops when another cue starts or the page stops everything. */
export function stopCueLoops(): void {
  for (const h of loops.values()) h.stop(0.2);
  loops.clear();
}

/** 星見台 as the field sets it up (53 4.2): space, PA, stage, the beds. */
function village(stage: number, variant = 'outdoor'): void {
  A.setSpace(variant === 'barn' ? 'barn' : variant === 'outdoor' || variant === 'hill' ? 'yama' : 'room');
  A.setPaMode('yama');
  A.setMusicParam('h_stage', stage);
  const beds = variant === 'barn' ? ['amb_h_barn'] : variant === 'house' ? ['amb_h_house', 'amb_h_hachi'] : ['amb_h_insects', 'amb_h_wind'];
  for (const id of beds) A.playAmbient(id, { fade: 1 });
}

/** One call from the hill (53 7.4): open the line, the name, close it. */
function call(say: (v: string, t: string) => number, s: CueStep[], t: number, line: string, open: boolean): number {
  if (open) s.push(S(t, 'SE_H_PA_OPEN', at('se_h_pa_open')));
  const t1 = t + (open ? 0.35 : 0);
  s.push(S(t1, `BROADCAST ${open ? '' : '(LINE OPEN) '}+ DUCK -4DB`, () => {
    A.duckMusic(0.63, 3);
    say('broadcast', line);
  }));
  const t2 = t1 + [...line].length / 40 + 0.4;
  if (open) s.push(S(t2, 'SE_H_PA_CLOSE', at('se_h_pa_close')));
  else s.push(S(t2, 'ECHO x3 (FEEDBACK 0.6, 2.0S)', () => A.paEcho(0.6, 2.0)));
  return t2 + 0.3;
}

export const CH2_CUES: Cue[] = [
  {
    id: 'h_prologue',
    label: '踏切と明かりのない電車',
    ref: '12.1',
    build: () => [
      S(0, 'NIGHT: BGM_NIGHT, INSECTS', () => {
        stopCueLoops();
        A.setSpace('night');
        A.setPaMode('town');
        A.setMusicParam('h_stage', -1);
        A.playAmbient('amb_night_insects', { fade: 1 });
        A.playAmbient('amb_kawabe', { vol: 0.5, fade: 1 });
        A.playBgm('bgm_night', { fade: 1.5 });
      }),
      S(5, 'CROSSING BELL (LOOP) + DOWN, BGM OUT 1.5S', () => {
        loop('se_h_crossing_bell')();
        A.sfx('se_h_crossing_down');
        A.stopBgm(1.5);
      }),
      S(9, 'SE_H_TRAIN_BRAKE', at('se_h_train_brake')),
      S(10.5, 'BELL STOP(0): CUT MID-STRIKE', stopLoop('se_h_crossing_bell', 0)),
      S(11.6, 'SE_H_TRAIN_DOOR + IDLE (LOOP)', () => {
        A.sfx('se_h_train_door');
        loop('se_h_train_idle')();
      }),
      S(13, 'SE_STEP_WOOD 1.3', at('se_step_wood', { pitch: 1.3, vol: 0.6 })),
      S(15, 'KANENARI UP THE STEP', () => {
        A.sfx('se_step_kanenari');
        A.sfx('se_bell_dud', { vol: 0.5 });
      }),
      S(16.6, 'DOOR, IDLE OFF, THE TRAIN LEAVES', () => {
        A.sfx('se_h_train_door');
        stopLoop('se_h_train_idle', 0.3)();
        A.sfx('se_train_pass', { pitch: 0.8, vol: 0.7 });
        A.stopAllAmbient(1.0);
      }),
    ],
  },
  {
    id: 'h_arrive',
    label: '星見台駅に着く',
    ref: '12.2',
    build: (say) => {
      const s: CueStep[] = [
        S(0, 'ROOM, AMB_H_TRAIN', () => {
          stopCueLoops();
          A.stopBgm(0.4);
          A.stopAllAmbient(0.4);
          A.setSpace('room');
          A.playAmbient('amb_h_train', { fade: 0.6 });
        }),
        S(3, 'SE_H_TRAIN_CHIME', at('se_h_train_chime')),
        S(4.6, 'VOICE H_TRAIN', () => void say('h_train', 'つぎは、星見台。星見台です。')),
        S(7.5, 'BRAKE (0.6), TRAIN OUT', () => {
          A.sfx('se_h_train_brake', { vol: 0.6 });
          A.stopAmbient('amb_h_train', 0.4);
        }),
        S(9.2, 'YAMA / PA YAMA / H_STAGE 0 / BEDS', () => village(0)),
        S(10, 'SE_H_TRAIN_DOOR, THE TRAIN BACKS AWAY', () => {
          A.sfx('se_h_train_door');
          A.sfx('se_train_far', { vol: 0.6 });
        }),
        S(12, 'HUD 19:30 -> 4:59', () => {
          const t = liveGraph()?.ctx.currentTime ?? 0;
          [1, 1.06, 0.9].forEach((p, i) => A.sfx('se_clock_flip', { at: t + i * 0.12, pitch: p }));
        }),
        S(12.1, 'BGM_HOSHI_NIGHT (HI1, FADE 2.0)', () => A.playBgm('bgm_hoshi_night', { fade: 2.0, resume: false, variant: 'outdoor' })),
        S(12.2, 'PA DISTANCE 1.0 (THE STATION)', () => A.setPaDistance(1)),
      ];
      call(say, s, 15.1, '……おぴぴちゃん。', true);
      return s;
    },
  },
  {
    id: 'h_light',
    label: 'はなまるトマトと灯り',
    ref: '12.5',
    build: () => [
      S(0, 'HOUSE: VINYL DOOR, VARIANT HOUSE, TOMATO HUM', () => {
        stopCueLoops();
        village(0, 'house');
        A.sfx('se_h_vinyl_door');
        A.playAmbient('amb_h_tomato', { fade: 1 });
        A.playBgm('bgm_hoshi_night', { fade: 1, variant: 'house' });
      }),
      S(5, 'SE_H_ROLL -> SE_H_SUNE', () => {
        A.sfx('se_h_roll');
        A.sfx('se_h_sune', { at: (liveGraph()?.ctx.currentTime ?? 0) + 0.7 });
      }),
      S(8, 'FUSHIGI: SE_STAMP + SE_MIMASHITA', () => {
        A.sfx('se_stamp');
        A.sfx('se_mimashita', { grade: 'kukkiri' });
      }),
      S(10, 'TOMATO GLOWS x1.6', () => {
        A.sfx('se_emote_light');
        A.setAmbientVol('amb_h_tomato', 1.6, 0.6);
      }),
      S(12, 'SE_H_TOMATO_CATCH, TOMATO HUM OUT', () => {
        A.sfx('se_h_tomato_catch');
        A.stopAmbient('amb_h_tomato', 0.8);
      }),
      S(13.6, 'SE_H_LANTERN_SET', at('se_h_lantern_set')),
      S(14.6, 'BGM_JINGLE_ITEM', () => A.playBgm('bgm_jingle_item')),
      S(19, 'SE_H_LIGHT_SPREAD + H_STAGE 1 (NEXT BAR: A1)', () => {
        A.sfx('se_h_light_spread');
        A.setMusicParam('h_stage', 1);
      }),
      S(19.2, 'SE_H_BOUKATOU_ON (FAR)', at('se_h_boukatou_on', { vol: 0.2 })),
      S(21, 'SE_H_SUNE (FAR, 0.4)', at('se_h_sune', { vol: 0.4 })),
      S(26, 'OUT: VINYL DOOR, VARIANT OUTDOOR', () => {
        A.sfx('se_h_vinyl_door');
        A.stopAmbient('amb_h_house', 0.8);
        A.stopAmbient('amb_h_hachi', 0.8);
        village(1);
        A.playAmbient('amb_h_boukatou', { vol: 0.3, fade: 1 });
        A.playBgm('bgm_hoshi_night', { variant: 'outdoor' });
      }),
    ],
  },
  {
    id: 'h_calls',
    label: '呼び声（遠い・近い・屋内）',
    ref: '7.3 / 7.4',
    build: (say) => {
      const s: CueStep[] = [
        S(0, 'H_STAGE 1 OUTDOORS, PA YAMA', () => {
          stopCueLoops();
          village(1);
          A.playBgm('bgm_hoshi_night', { fade: 1, variant: 'outdoor' });
        }),
        S(2.5, 'D = 1.0 (THE SOUTH END)', () => A.setPaDistance(1)),
      ];
      let t = call(say, s, 3, '……もとくん。', true) + 1.5;
      s.push(S(t, 'D = 0.35 (THE FOOT OF THE PATH)', () => A.setPaDistance(0.35)));
      t = call(say, s, t + 0.5, '……クリコさん。', true) + 1.5;
      s.push(S(t, 'INDOORS (-12DB, LP 1.2K)', () => A.setPaDistance(0.6, true)));
      t = call(say, s, t + 0.5, '……シュンスケくん。', true) + 1.5;
      s.push(S(t, 'H_STAGE 2: THE LINE STAYS OPEN', () => {
        A.setPaDistance(0.5);
        A.setMusicParam('h_stage', 2);
        A.playAmbient('amb_h_pa_hum', { fade: 2 });
      }));
      t = call(say, s, t + 2.5, 'こちらは、防災 星見台です。', false);
      call(say, s, t + 1.5, '……アスカちゃん。', false);
      return s;
    },
  },
  {
    id: 'h_yobigoe',
    label: 'よびごえ（段階2へ）',
    ref: '12.11',
    build: (say) => {
      const s: CueStep[] = [
        S(0, 'AFTER TETSUYA: INSECTS ONLY', () => {
          stopCueLoops();
          A.stopBgm(0.8);
          village(1);
          A.playAmbient('amb_h_kusa', { fade: 1 });
          A.setPaDistance(0.36);
        }),
        S(2, 'SE_H_PA_OPEN (0.8) + SE_PA_CHIME (0.7)', () => {
          A.sfx('se_h_pa_open', { vol: 0.8 });
          A.sfx('se_pa_chime', { vol: 0.7, at: (liveGraph()?.ctx.currentTime ?? 0) + 0.3 });
          A.duckMusic(0.5, 9);
        }),
        S(4, 'NAMES (BROADCAST)', () => void say('broadcast', '……おぴぴちゃん。……シュンスケくん。……もとくん。')),
        S(6.6, 'ECHO x3', () => A.paEcho(0.6, 2.0)),
      ];
      const t = 7;
      s.push(S(t + 0.6, 'SCARECROWS TURN TO THE HILL', () => {
        const now = liveGraph()?.ctx.currentTime ?? 0;
        for (let i = 0; i < 4; i++) A.sfx('se_h_kakashi_turn', { at: now + i * 0.11, pan: -0.5 + i * 0.3 });
        for (let i = 0; i < 3; i++) A.sfx('se_h_kakashi_turn', { at: now + 0.2 + i * 0.13, vol: 0.3, pan: -0.4 });
      }));
      s.push(S(t + 0.7, 'H_STAGE 2 + AMB_H_PA_HUM', () => {
        A.setMusicParam('h_stage', 2);
        A.playAmbient('amb_h_pa_hum', { fade: 2 });
      }));
      s.push(S(t + 2.1, 'BGM_HOSHI_NIGHT FROM HI1 (FADE 3.0)', () => A.playBgm('bgm_hoshi_night', { fade: 3.0, resume: false, variant: 'outdoor' })));
      s.push(S(t + 5, 'SE_H_KEITORA', at('se_h_keitora')));
      return s;
    },
  },
  {
    id: 'h_tetsuya',
    label: '耕うん機テツヤ（夜の版）',
    ref: '12.10 / 5.5',
    build: () => [
      S(0, 'FIELD H_STAGE 1 + AMB_H_TETSUYA', () => {
        stopCueLoops();
        village(1);
        A.playAmbient('amb_h_tetsuya', { vol: 0.5, fade: 1 });
        A.playBgm('bgm_hoshi_night', { fade: 1, variant: 'outdoor' });
      }),
      S(3, "FURROW'S END: 'TURN'", () => A.ambientEvent('amb_h_tetsuya', 'turn')),
      S(6, 'BGM OUT 0.8, ENGINE FORWARD', () => {
        A.stopBgm(0.8);
        A.setAmbientVol('amb_h_tetsuya', 1, 0.6);
      }),
      S(7.5, 'SE_GLINT (HEADLIGHT)', at('se_glint', { pitch: 0.6, vol: 0.5 })),
      S(9, 'SE_H_TILLER 3 (0.7), ENGINE TO THE BATTLE', () => {
        A.sfx('se_h_tiller', { level: 3, vol: 0.7 });
        A.stopAmbient('amb_h_tetsuya', 0.3);
      }),
      S(10.6, 'BATTLE: BGM_MIDBOSS AT NIGHT (PUTT)', () => {
        A.setSpace('battle');
        A.playBgm('bgm_midboss');
      }),
      S(22, 'OTSUKARE: TILLER 5 + H_REST 1', () => {
        A.sfx('se_h_tiller', { level: 5, vol: 0.6 });
        A.setMusicParam('h_rest', 1);
      }),
      S(30, 'BREAK OVER: TILLER 4 + H_REST 0', () => {
        A.sfx('se_h_tiller', { level: 4 });
        A.setMusicParam('h_rest', 0);
      }),
      S(36, 'SE_H_STALL', at('se_h_stall')),
    ],
  },
  {
    id: 'h_boss',
    label: 'ヨビモドシ戦（点呼と灯り）',
    ref: '12.13 / 8.6',
    build: (say) => {
      const s: CueStep[] = [
        S(0, 'THE HILL: INSECTS AND WIND', () => {
          stopCueLoops();
          A.stopBgm(1.0);
          village(2, 'hill');
          A.setPaDistance(0);
        }),
        S(2, 'SE_PA_CHIME (-35 CENTS)', at('se_pa_chime')),
        S(4.2, 'VOICE YOBIMODOSHI', () => void say('yobimodoshi', '……そこに、だれか いますか。')),
        S(7, 'SE_H_PA_LAST', at('se_h_pa_last')),
        S(8.6, 'BGM_BOSS_YOBIMODOSHI (YI1)', () => {
          A.setSpace('battle');
          A.playBgm('bgm_boss_yobimodoshi');
        }),
      ];
      const o = 16;
      const tag = (t: number, n: number, note: string) =>
        s.push(S(t, `TENKO ${n} (${note})`, () => {
          A.sfx('se_h_tenko', { note });
          A.setMusicParam('tenko', n);
        }));
      tag(o, 1, 'D6');
      tag(o + 4, 2, 'A5');
      tag(o + 8, 3, 'F5');
      s.push(
        S(o + 12, 'YOFUKASHI: HOWL x4, HIT, TENKO 0', () => {
          const now = liveGraph()?.ctx.currentTime ?? 0;
          [1, 0.89, 0.84, 0.75].forEach((p, i) => A.sfx('se_h_howl', { pitch: p, at: now + i * 0.2 }));
          A.sfx('se_h_yofukashi', { at: now + 0.9 });
          setTimeout(() => A.setMusicParam('tenko', 0), 1000);
        }),
        S(o + 16, 'TOMATO UP: GLOW, H_LIGHT 1 (+0.7S)', () => {
          A.sfx('se_h_tomato_glow');
          setTimeout(() => A.setMusicParam('h_light', 1), 700);
        }),
        S(o + 26, 'SE_H_DIM + H_LIGHT 0', () => {
          A.sfx('se_h_dim');
          A.setMusicParam('h_light', 0);
        }),
        S(o + 30, 'PART BREAK: ECHO -1', () => {
          A.sfx('se_part_break');
          A.sfx('se_h_howl', { pitch: 1 });
        }),
        S(o + 34, 'PHASE 2: MUTE 0.45, AA1', () => {
          A.muteMusic(0.45);
          A.setMusicParam('boss_phase', 2);
        }),
        S(o + 38, 'TENKO 2 (HALF BARS)', () => A.setMusicParam('tenko', 2)),
      );
      return s;
    },
  },
  {
    id: 'h_boss_final',
    label: '最終局面（音楽が眠る）',
    ref: '12.13 最終局面',
    build: (say) => {
      const s: CueStep[] = [];
      let o = 0;
      if (A.currentBgmId() !== 'bgm_boss_yobimodoshi') {
        s.push(S(0, 'BGM_BOSS_YOBIMODOSHI, INSECTS', () => {
          stopCueLoops();
          village(2, 'hill');
          A.setSpace('battle');
          A.playBgm('bgm_boss_yobimodoshi');
        }));
        o = 9;
      }
      s.push(
        S(o, 'BOSS_PHASE 3: THE MUSIC FALLS ASLEEP (1.0S)', () => A.setMusicParam('boss_phase', 3)),
        S(o + 1.6, 'VOICE YOBIMODOSHI', () => void say('yobimodoshi', '……みなさん、おうちに かえりましょう。')),
        S(o + 5.2, 'SE_STEP_KANENARI x3', () => {
          const now = liveGraph()?.ctx.currentTime ?? 0;
          for (let i = 0; i < 3; i++) A.sfx('se_step_kanenari', { at: now + i * 0.4 });
        }),
        S(o + 6.5, 'SE_SWING (0.5)', at('se_swing', { vol: 0.5 })),
        S(o + 6.7, 'SE_H_TOMATO_GLOW KUKKIRI (2.0S LIGHT)', at('se_h_tomato_glow', { grade: 'kukkiri' })),
        S(o + 11, 'SE_HANKO_READY -> CHARGE', () => {
          A.sfx('se_hanko_ready');
          A.sfx('se_hanko_charge', { at: (liveGraph()?.ctx.currentTime ?? 0) + 0.5 });
        }),
        S(o + 13, 'SE_STAMP_HEAVY 0.85 + SE_STAR', () => {
          A.sfx('se_stamp_heavy', { pitch: 0.85 });
          A.sfx('se_star');
        }),
        S(o + 14, 'VOICE: ……おやすみなさい。', () => void say('yobimodoshi', '……おやすみなさい。')),
        S(o + 16.5, 'SE_PA_CHIME_END 0.5: IN TUNE, THE 4TH NOTE', at('se_pa_chime_end', { pitch: 0.5, vol: 0.8 })),
        S(o + 20, 'FADE TO BLACK: ALL AMBIENCE OUT (1.5S)', () => A.stopAllAmbient(1.5)),
      );
      return s;
    },
  },
  {
    id: 'h_morning',
    label: '5:00 のチャイムと日の出',
    ref: '12.14 カット1',
    build: (say) => [
      S(0, 'SILENCE, 4:59', () => {
        stopCueLoops();
        A.stopBgm(0.5);
        A.stopAllAmbient(0.5);
        A.setSpace('yama');
        A.setPaMode('yama');
        A.setPaDistance(0);
        A.setMusicParam('h_stage', 2);
      }),
      S(2, 'SE_CLOCK_FLIP: 5:00', at('se_clock_flip')),
      S(2.4, 'PLAYMORNINGCHIME, INSECTS 0.3, WIND 0.6', () => {
        void A.playMorningChime({
          onNote: (i) => {
            if (i === 4) A.playAmbient('amb_h_dawn', { fade: 4 });
          },
        });
        A.playAmbient('amb_h_insects', { vol: 0.3, fade: 2 });
        A.playAmbient('amb_h_wind', { vol: 0.6, fade: 2 });
      }),
      S(2.4 + 0.55 * 4, '5TH NOTE: AMB_H_DAWN (HIGURASHI)', () => undefined),
      S(8.6, 'SE_H_TOMATO_RISE + BGM_HOSHI_MORNING (DAWN)', () => {
        A.sfx('se_h_tomato_rise');
        A.playBgm('bgm_hoshi_morning', { fade: 3.0 });
      }),
      S(12, 'SE_H_SUNRISE, INSECTS OUT, WIND DIES', () => {
        A.sfx('se_h_sunrise');
        A.stopAmbient('amb_h_insects', 3);
        A.ambientEvent('amb_h_wind', 'none');
        A.setAmbientVol('amb_h_wind', 0.4, 3);
      }),
      S(15.5, 'NARR', () => void say('narr', '夕焼けを ためこんだ トマトが、朝焼けに なった。')),
      S(20.5, 'KANENARI: ……おはよう。 (-4DB)', () => void say('kanenari_voice', '……おはよう。')),
      S(23.5, 'SE_BELL_KANENARI_SHORT', at('se_bell_kanenari_short')),
      S(24.5, 'H_STAGE 3: NEXT BAR MI1', () => A.setMusicParam('h_stage', 3)),
    ],
  },
  {
    id: 'h_village_morning',
    label: '村の朝と村営バス',
    ref: '12.14 カット2〜4',
    build: () => [
      S(0, 'MORNING (H_STAGE 3), DAWN', () => {
        stopCueLoops();
        A.setSpace('yama');
        A.setMusicParam('h_stage', 3);
        A.playAmbient('amb_h_dawn', { fade: 1 });
        if (A.currentBgmId() !== 'bgm_hoshi_morning') A.playBgm('bgm_hoshi_morning', { fade: 1 });
      }),
      S(1.5, '2A BARN: LIGHTS, CART, ONE MOO', () => {
        A.playAmbient('amb_h_barn', { vol: 0.6, fade: 1 });
        A.sfx('se_h_barn_light');
        const now = liveGraph()?.ctx.currentTime ?? 0;
        A.sfx('se_h_feed_cart', { at: now + 1.2 });
        A.sfx('se_h_moo', { at: now + 3.6 });
      }),
      S(7, '2B HOUSE: SIDES UP, TOMATOES RIPEN', () => {
        A.stopAmbient('amb_h_barn', 0.8);
        A.sfx('se_h_side_roll');
        A.sfx('se_h_ripen', { at: (liveGraph()?.ctx.currentTime ?? 0) + 2.6 });
      }),
      S(11.5, '2C TERRACES: DEW, WATER GATES', () => {
        A.sfx('se_glint', { vol: 0.3 });
        A.playAmbient('amb_h_tanada', { vol: 0.8, fade: 1 });
      }),
      S(14, '2D WINDOW', () => {
        A.stopAmbient('amb_h_tanada', 1);
        A.sfx('se_door', { pitch: 1.25, vol: 0.7 });
      }),
      S(16, '3 BUS IDLE (LOOP)', loop('se_h_bus_idle', { vol: 0.6 })),
      S(19, 'SE_H_BUS_DOOR', at('se_h_bus_door')),
      S(20.2, 'IDLE OFF -> SE_H_BUS_DEPART, THE PAPILLON BARKS', () => {
        stopLoop('se_h_bus_idle', 0.2)();
        A.sfx('se_h_bus_depart');
        A.sfx('se_dog_bark', { pitch: 1.33, at: (liveGraph()?.ctx.currentTime ?? 0) + 1.2 });
      }),
      S(25, '4 THE TOWN AT NIGHT: ALL OUT, H_STAGE -1', () => {
        A.stopBgm(1.0);
        A.stopAllAmbient(0.8);
        A.setMusicParam('h_stage', -1);
        A.setPaMode('town');
        A.setSpace('night');
        A.playAmbient('amb_night_insects', { fade: 1.0 });
      }),
      S(27, 'SE_H_BUS_ARRIVE -> DOOR', () => {
        A.sfx('se_h_bus_arrive');
        A.sfx('se_h_bus_door', { at: (liveGraph()?.ctx.currentTime ?? 0) + 1.8 });
      }),
      S(30, 'HUD 6:12 -> 19:31', () => {
        const t = liveGraph()?.ctx.currentTime ?? 0;
        [1, 1.06, 1.12].forEach((p, i) => A.sfx('se_clock_flip', { at: t + i * 0.12, pitch: p }));
      }),
      S(32, 'THE BUS GOES HOME (RIGHT)', at('se_h_bus_depart', { vol: 0.6, pan: 0.3 })),
    ],
  },
  {
    id: 'tsugao',
    label: 'ツガオの部屋（つづくのあと）',
    ref: '12.14 カット7',
    build: (say) => [
      S(0, 'BLACK, SILENCE', () => {
        stopCueLoops();
        A.stopBgm(0.3);
        A.stopAllAmbient(0.3);
        A.setMusicParam('h_stage', -1);
        A.setPaMode('town');
      }),
      S(1.2, 'ROOM, AMB_TSUGAO_ROOM, BGM_TSUGAO (T1)', () => {
        A.setSpace('room');
        A.playAmbient('amb_tsugao_room', { fade: 1.5 });
        A.playBgm('bgm_tsugao', { fade: 2.0 });
      }),
      S(5, 'VOICE DAKOKU (+ SE_DAKOKU)', () => void say('dakoku', 'ホウコク シマス。ガチャン。')),
      S(9, 'YUNARI: CLOCK RESTART, CLOCK 1', () => {
        A.sfx('se_clock_restart');
        setTimeout(() => A.ambientEvent('amb_tsugao_room', 'tick', 'yunari'), 3300);
      }),
      S(14, 'VOICE TSUGAO', () => void say('tsugao', '……ふむ。ご苦労。')),
      S(17, 'TSUGAO: つがおちゃん 寝る〜♪', () => void say('tsugao', 'では、つがおちゃん 寝る〜♪')),
      S(20, 'HOSHIMI: CLOCK RESTART, CLOCK 2', () => {
        A.sfx('se_clock_restart', { note: 'hoshimi' });
        setTimeout(() => A.ambientEvent('amb_tsugao_room', 'tick', 'hoshimi'), 3300);
      }),
      S(27, 'SE_PAGE, STOP BGM (0), UMI', () => {
        A.sfx('se_page');
        A.stopBgm(0);
        A.ambientEvent('amb_tsugao_room', 'umi');
      }),
      S(30, 'SE_MADA_STAMP (DRY INK)', at('se_mada_stamp')),
      S(34, 'SE_LAMP_CLICK, ALL OUT (0.5S)', () => {
        A.sfx('se_lamp_click');
        A.stopAllAmbient(0.5);
      }),
    ],
  },
  {
    id: 'h_barn',
    label: '牛舎の夜（そろった反すう）',
    ref: '12.7 / 8.9 #08',
    build: () => [
      S(0, 'BARN: VARIANT BARN (-12DB), SPACE BARN', () => {
        stopCueLoops();
        A.stopAllAmbient(0.6);
        village(1, 'barn');
        A.sfx('se_door_heavy');
        A.playBgm('bgm_hoshi_night', { fade: 1, variant: 'barn' });
      }),
      S(2.5, 'SE_H_SHODOKU x2 (KANENARI .85)', () => {
        A.sfx('se_h_shodoku');
        A.sfx('se_h_shodoku', { pitch: 0.85, at: (liveGraph()?.ctx.currentTime ?? 0) + 0.45 });
      }),
      S(10, 'FUSHIGI 08: SYNC_ON (NORTH 3, IN STEP)', () => A.ambientEvent('amb_h_barn', 'sync_on', 0.2)),
      S(22, 'PRESSED: SYNC_OFF', () => A.ambientEvent('amb_h_barn', 'sync_off', 0.2)),
      S(26, 'SE_H_FEEDBAG', at('se_h_feedbag')),
    ],
  },
];
