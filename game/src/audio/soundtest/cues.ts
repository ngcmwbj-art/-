// Sound-test cues (演出): the audio side of the cue sheets in 40_audio 12–13,
// played through the public API exactly as the event / battle code calls it.
// Every step is scheduled on the audio clock and ticked off on the page as it
// fires, so QA can hear and see the timeline together.

import { atTime } from '../clock';
import { liveGraph } from '../engine';
import * as A from '../index';
import { currentPlayer } from '../music';

export interface CueStep {
  /** Seconds from the start of the cue. */
  t: number;
  /** 5×7-font caption on the card. */
  text: string;
  fn: () => void;
}

export interface Cue {
  id: string;
  label: string;
  /** Section of 40_audio the cue follows. */
  ref: string;
  /** Steps are generated at start (some depend on what is playing). */
  build(say: (voice: string, text: string) => number): CueStep[];
}

export interface CueRun {
  cue: Cue;
  steps: CueStep[];
  fired: boolean[];
  t0: number;
  gen: number;
  done: boolean;
}

let gen = 0;
let run: CueRun | null = null;

export function currentCue(): CueRun | null {
  return run;
}

export function cancelCue(): void {
  gen++;
  run = null;
}

export function startCue(cue: Cue, say: (voice: string, text: string) => number): CueRun | null {
  const g = liveGraph();
  if (!g) return null;
  const my = ++gen;
  const steps = cue.build(say).sort((a, b) => a.t - b.t);
  const t0 = g.ctx.currentTime + 0.05;
  const r: CueRun = { cue, steps, fired: steps.map(() => false), t0, gen: my, done: false };
  run = r;
  steps.forEach((s, i) =>
    atTime(t0 + s.t, () => {
      if (gen !== my) return;
      r.fired[i] = true;
      s.fn();
      if (r.fired.every(Boolean)) r.done = true;
    }),
  );
  return r;
}

// ---------------------------------------------------------------------------

const S = (t: number, text: string, fn: () => void): CueStep => ({ t, text, fn });
const at = (id: string, o?: A.SfxOpts) => () => A.sfx(id, o);

/** Make sure a field song is playing; returns the lead-in (s) before the cue proper. */
function withField(steps: CueStep[], id = 'bgm_town_s0'): number {
  const cur = A.currentBgmId();
  if (cur && /town|home|shop|mall/.test(cur)) return 0;
  steps.push(
    S(0, 'PLAY ' + id, () => {
      A.setSpace('outdoor');
      A.playBgm(id, { fade: 0.3 });
    }),
  );
  return 2.6;
}

function withBattle(steps: CueStep[], kire = 0): number {
  const cur = A.currentBgmId();
  if (cur === 'bgm_battle' || cur === 'bgm_midboss' || cur === 'bgm_boss') {
    if (kire) steps.push(S(0, `KIRE ${kire}`, () => A.setMusicParam('kire', kire)));
    return kire ? 1.2 : 0;
  }
  steps.push(
    S(0, 'PLAY BGM_BATTLE', () => {
      A.setSpace('battle');
      A.setMusicParam('kire', kire);
      A.playBgm('bgm_battle');
    }),
  );
  return 4.0;
}

export const CUES: Cue[] = [
  {
    id: 'chime4',
    label: '五時のチャイム（とぎれる）',
    ref: '1.3 / 9.6',
    build: () => [
      S(0, 'CHIME G4 A4 C5 E5', () => void A.playChimeMotif({ notes: 4, gap: 0.45, cut: true })),
      S(1.95, 'CUT (-100 CENTS, ECHO GONE)', () => undefined),
    ],
  },
  {
    id: 'five',
    label: '17:00 の瞬間',
    ref: '13.1',
    build: () => {
      const s: CueStep[] = [
        S(0, 'TOWN S0 + HIGURASHI', () => {
          A.setSpace('outdoor');
          A.setMusicParam('stage', 0);
          A.playBgm('bgm_town_s0', { fade: 0.3 });
          A.playAmbient('amb_higurashi', { fade: 0.5 });
        }),
      ];
      const o = 4;
      s.push(
        S(o + 0.3, 'SE_CLOCK_FLIP', at('se_clock_flip')),
        S(o + 1.0, 'SE_CLOCK_FLIP', at('se_clock_flip')),
        S(o + 1.3, 'DUCK -12DB + CHIME x4', () => {
          A.duckMusic(0.25, 1.9);
          void A.playChimeMotif({ notes: 4, gap: 0.45, cut: true });
        }),
        S(o + 3.2, 'TAPE STOP -1 / HIGURASHI OFF', () => {
          A.bgmTapeStop(0.4, -1);
          A.stopAmbient('amb_higurashi', 0.05);
        }),
        S(o + 3.3, 'AMB_STILL IN (0.6S)', () => A.playAmbient('amb_still', { fade: 0.6 })),
      );
      return s;
    },
  },
  {
    id: 'hanko_given',
    label: '町・段階1がもどる',
    ref: '13.1',
    build: () => [
      S(0, 'SE_DOOR', at('se_door')),
      S(0.9, 'BGM_TOWN_S1 (FADE 1.5)', () => {
        A.stopAmbient('amb_higurashi', 0.3);
        A.playAmbient('amb_still', { fade: 0.6 });
        A.playBgm('bgm_town_s1', { fade: 1.5 });
      }),
    ],
  },
  {
    id: 'broadcast',
    label: '迷子の放送（段階2へ）',
    ref: '13.2',
    build: (say) => {
      const s: CueStep[] = [];
      const lead = A.currentBgmId() === 'bgm_town_s1' ? 0 : 3;
      if (lead)
        s.push(
          S(0, 'PLAY BGM_TOWN_S1', () => {
            A.setSpace('outdoor');
            A.playBgm('bgm_town_s1', { fade: 0.4 });
            A.playAmbient('amb_still', { fade: 0.4 });
          }),
        );
      let t = lead;
      s.push(S(t, 'DUCK -9DB + SE_PA_CHIME', () => {
        A.duckMusic(0.35, 6.5);
        A.sfx('se_pa_chime');
      }));
      t += 1.9;
      const line1 = 'こちらは 夕鳴町 役場です。まいごの おしらせです。';
      s.push(S(t, 'VOICE BROADCAST', () => void say('broadcast', line1)));
      t += [...line1].length / 40 + 0.9;
      s.push(S(t, 'VOICE BROADCAST_CHILD', () => void say('broadcast_child', '……だれか。')));
      t += 2.8;
      s.push(
        S(t, 'BGM OUT (1.0S)', () => A.stopBgm(1.0)),
        S(t + 0.6, 'SE_SHADOW_SWING + AMB_S2_TOWN', () => {
          A.sfx('se_shadow_swing');
          A.stopAmbient('amb_still', 0.6);
          A.playAmbient('amb_s2_town', { fade: 1.5 });
        }),
        S(t + 2.2, 'SE_CHAIN (FAR)', at('se_chain', { vol: 0.7, pan: 0.4 })),
        S(t + 3.4, 'SE_FLIP', at('se_flip')),
        S(t + 4.6, 'BGM_TOWN_S2 (FADE 2.0)', () => A.playBgm('bgm_town_s2', { fade: 2.0 })),
      );
      return s;
    },
  },
  {
    id: 'encounter',
    label: 'フィールドから戦闘へ',
    ref: '12.1',
    build: () => {
      const s: CueStep[] = [];
      const o = withField(s);
      s.push(
        S(o, 'TAPE BRAKE (-500 CENTS)', () => A.musicEncounter()),
        S(o + 0.1, 'SE_ENCOUNTER', at('se_encounter')),
        S(o + 0.5, 'SPACE BATTLE + BGM_BATTLE', () => {
          A.setSpace('battle');
          A.playBgm('bgm_battle');
        }),
        S(o + 0.8, 'SE_ENEMY_APPEAR', at('se_enemy_appear', { pan: -0.2 })),
        S(o + 1.0, 'SE_ENEMY_APPEAR', at('se_enemy_appear', { pan: 0.25, pitch: 1.06 })),
        S(o + 1.4, 'SE_INITIATIVE', at('se_initiative')),
      );
      return s;
    },
  },
  {
    id: 'victory',
    label: '勝利からフィールドへ',
    ref: '12.3 / 6.2',
    build: () => {
      const s: CueStep[] = [];
      let o = withField(s);
      s.push(
        S(o, 'ENCOUNTER', () => {
          A.musicEncounter();
          A.sfx('se_encounter');
        }),
        S(o + 0.5, 'BGM_BATTLE', () => {
          A.setSpace('battle');
          A.playBgm('bgm_battle');
        }),
      );
      o += 5;
      s.push(
        S(o, 'SE_HIT_PASHI + SE_KO', () => {
          A.sfx('se_hit_pashi');
          A.sfx('se_ko', { at: (liveGraph()?.ctx.currentTime ?? 0) + 0.25 });
          A.duckMusic(0.25, 1.1);
        }),
        S(o + 1.2, 'SE_POTON + SE_DEFEAT_CHORD', () => {
          A.sfx('se_poton');
          A.sfx('se_defeat_chord');
        }),
        S(o + 2.2, 'BGM_JINGLE_VICTORY', () => A.playBgm('bgm_jingle_victory')),
        S(o + 8.5, 'RETURN TO FIELD (RESUME)', () => {
          A.setSpace('outdoor');
          A.musicReturnToField(0.8);
        }),
      );
      return s;
    },
  },
  {
    id: 'flee',
    label: 'にげる',
    ref: '12.3',
    build: () => {
      const s: CueStep[] = [];
      let o = withField(s);
      s.push(
        S(o, 'ENCOUNTER', () => {
          A.musicEncounter();
          A.sfx('se_encounter');
        }),
        S(o + 0.5, 'BGM_BATTLE', () => {
          A.setSpace('battle');
          A.playBgm('bgm_battle');
        }),
      );
      o += 4.5;
      s.push(
        S(o, 'SE_FLEE + TRIP (-300 CENTS)', () => {
          A.sfx('se_flee');
          A.musicFlee();
        }),
        S(o + 0.75, 'RETURN TO FIELD (RESUME)', () => {
          A.setSpace('outdoor');
          A.musicReturnToField(0.8);
        }),
      );
      return s;
    },
  },
  {
    id: 'kire',
    label: 'キレのレイヤー 0→3',
    ref: '5.7 / 7.2',
    build: () => {
      const s: CueStep[] = [];
      const o = withBattle(s, 0);
      const beat = 60 / 152;
      s.push(
        S(o, 'KIRE 1 (NO CHANGE)', () => {
          A.sfx('se_kire_up', { level: 1 });
          A.setMusicParam('kire', 1);
        }),
        S(o + beat * 8, 'KIRE 2: HATS', () => {
          A.sfx('se_kire_up', { level: 2 });
          A.setMusicParam('kire', 2);
        }),
        S(o + beat * 16, 'KIRE 3: BASS +8VA, CLAP, ARP', () => {
          A.sfx('se_kire_up', { level: 3 });
          A.setMusicParam('kire', 3);
        }),
      );
      return s;
    },
  },
  {
    id: 'nori',
    label: 'ノリツッコミ',
    ref: '13.3',
    build: () => {
      const s: CueStep[] = [];
      const o = withBattle(s, 3) + 1.5;
      let sing: A.LoopHandle | null = null;
      s.push(
        S(o, 'SE_KIRE_FULL', at('se_kire_full')),
        S(o + 0.15, 'DUCK -12DB', () => A.duckMusic(0.25, 1.2)),
        S(o + 0.35, 'SE_NORI_SING (BOKE)', () => void (sing = A.sfxLoop('se_nori_sing'))),
        S(o + 1.1, 'SE_BISHI x1.3 (STOP BOKE)', () => {
          sing?.stop(0.02);
          A.sfx('se_bishi', { vol: 1.3 });
        }),
        S(o + 1.35, 'MUTE 0.15S', () => A.muteMusic(0.15)),
        S(o + 1.7, 'SE_DON + SE_CHIME_CHORD', () => {
          A.sfx('se_don');
          A.sfx('se_chime_chord');
        }),
        S(o + 2.3, 'KIRE 0 (NEXT BAR)', () => A.setMusicParam('kire', 0)),
      );
      return s;
    },
  },
  {
    id: 'midboss',
    label: '中ボスのおじぎ',
    ref: '5.8 / 12.1',
    build: () => [
      S(0, 'SE_OJIGI_PRESS (0.6)', () => {
        A.stopBgm(0.3);
        A.sfx('se_ojigi_press', { vol: 0.6 });
      }),
      S(0.9, 'BGM_MIDBOSS', () => {
        A.setSpace('battle');
        A.setMusicParam('kire', 0);
        A.playBgm('bgm_midboss');
      }),
    ],
  },
  {
    id: 'boss2',
    label: 'ボス 第2段階へ',
    ref: '7.3 / 13.4',
    build: () => {
      const s: CueStep[] = [];
      let o = 0;
      if (A.currentBgmId() !== 'bgm_boss') {
        s.push(
          S(0, 'BGM_BOSS (FROM BO1)', () => {
            A.setSpace('maigo');
            A.setMusicParam('boss_phase', 1);
            A.setMusicParam('kire', 0);
            A.playBgm('bgm_boss');
          }),
        );
        o = 14;
      }
      s.push(
        S(o, 'ROUND END: CHIME G4', at('se_chime_note', { note: 'G4' })),
        S(o + 0.5, 'CHIME A4', at('se_chime_note', { note: 'A4' })),
        S(o + 1.0, 'CHIME C5', at('se_chime_note', { note: 'C5' })),
        S(o + 1.5, 'CHIME E5 HOLD 1.2 (+CHOIR E6)', at('se_chime_note', { note: 'E5', hold: 1.2 })),
        S(o + 4.0, 'MUTE 0.43S (ONE BEAT)', () => A.muteMusic(0.43)),
        S(o + 4.3, 'SE_BOSS_VOICE', at('se_boss_voice')),
        S(o + 5.0, 'BOSS_PHASE 2 (E MINOR)', () => A.setMusicParam('boss_phase', 2)),
      );
      return s;
    },
  },
  {
    id: 'bossFinal',
    label: 'ボス 最終局面と鐘',
    ref: '5.9 / 13.4',
    build: () => {
      const s: CueStep[] = [];
      let o = 0;
      const p = currentPlayer();
      if (A.currentBgmId() !== 'bgm_boss' || !p) {
        s.push(
          S(0, 'BGM_BOSS PHASE 2', () => {
            A.setSpace('maigo');
            A.setMusicParam('boss_phase', 2);
            A.playBgm('bgm_boss');
          }),
        );
        o = 12;
      }
      s.push(
        S(o, 'BOSS_PHASE 3: PAD ONLY (1.5S)', () => A.setMusicParam('boss_phase', 3)),
        S(o + 2.5, 'SE_STEP_KANENARI', at('se_step_kanenari')),
        S(o + 2.95, 'SE_STEP_KANENARI', at('se_step_kanenari')),
        S(o + 3.4, 'SE_STEP_KANENARI', at('se_step_kanenari')),
        S(o + 4.2, 'MUTE 0.6S (TRUE SILENCE)', () => A.muteMusic(0.6)),
        S(o + 4.8, 'SE_BELL_KANENARI: PAD -> CADD9', at('se_bell_kanenari')),
        S(o + 9.5, 'SE_HANKO_LEARN', at('se_hanko_learn')),
        S(o + 11.0, 'SE_STAMP_HEAVY 0.9 + HANAMARU', () => {
          A.sfx('se_stamp_heavy', { pitch: 0.9 });
          A.sfx('se_hanamaru', { grade: 'kukkiri' });
        }),
        S(o + 13.5, 'LIGHT_FLY x12 + STOPBGM(2.0)', () => {
          const t = liveGraph()?.ctx.currentTime ?? 0;
          for (let i = 0; i < 12; i++) A.sfx('se_light_fly', { at: t + i * 0.25, pan: ((i * 7) % 11) / 5.5 - 1, pitch: i === 11 ? 0.8 : 1 });
          A.stopBgm(2.0);
        }),
      );
      return s;
    },
  },
  {
    id: 'ending',
    label: 'エンディングのチャイム（8音）',
    ref: '13.5',
    build: () => [
      S(0, 'SE_AUTO_DOOR', () => {
        A.stopBgm(0.6);
        A.stopAllAmbient(0.6);
        A.setSpace('outdoor');
        A.sfx('se_auto_door');
      }),
      S(0.5, 'CHIME: ALL 8 NOTES', () => {
        void A.playChimeMotif({
          notes: 8,
          gap: 0.45,
          lastHold: 2.0,
          onNote: (i) => {
            if (i === 4) A.playAmbient('amb_night_insects', { fade: 3 });
          },
        }).then(() => {
          A.sfx('se_higurashi_call');
        });
      }),
      S(0.5 + 0.45 * 4, '5TH NOTE: NIGHT INSECTS IN', () => undefined),
      S(7.2, 'BGM_ENDING (FADE 1.0)', () => A.playBgm('bgm_ending', { fade: 1.0 })),
    ],
  },
  {
    id: 'night',
    label: '踏切とノート（夜）',
    ref: '13.5 / 5.11',
    build: (say) => {
      const s: CueStep[] = [
        S(0, 'BGM_NIGHT (FADE 1.5), SPACE NIGHT', () => {
          A.stopBgm(0.4);
          A.setSpace('night');
          A.playAmbient('amb_night_insects', { fade: 1 });
          A.playBgm('bgm_night', { fade: 1.5 });
        }),
        S(0.8, 'SE_CROSSING_UP', at('se_crossing_up')),
        S(2.2, 'SE_TRAIN_PASS', at('se_train_pass')),
        S(6.4, 'SE_PAPER_BAG', at('se_paper_bag')),
        S(7.4, 'SE_ZIPPER', at('se_zipper')),
        S(10.4, 'KANENARI_VOICE (-4DB)', () => void say('kanenari_voice', '……おいしい。')),
        S(12.8, 'SE_BELL_KANENARI_SHORT', at('se_bell_kanenari_short')),
        S(14.4, 'SE_STAR', at('se_star')),
      ];
      const pen = 16;
      for (let i = 0; i < 5; i++) s.push(S(pen + i * 0.12, i ? '' : 'SE_PEN_WRITE x5', at('se_pen_write')));
      s.push(
        S(pen + 1.2, 'SE_PAPER_OPEN 0.7', at('se_paper_open', { pitch: 0.7 })),
        S(pen + 2.2, 'TSUZUKU: SE_STAMP_HEAVY', at('se_stamp_heavy')),
        S(pen + 4.2, 'STOPBGM(1.5), INSECTS STAY', () => A.stopBgm(1.5)),
      );
      return s;
    },
  },
  {
    id: 'charge',
    label: 'ハンコの溜め（sfxLoop）',
    ref: '9.5',
    build: () => {
      const s: CueStep[] = [];
      let h: A.LoopHandle | null = null;
      let zone = 0;
      s.push(S(0, 'SE_HANKO_READY + LOOP', () => {
        A.sfx('se_hanko_ready');
        h = A.sfxLoop('se_hanko_charge');
      }));
      const n = 64;
      for (let i = 1; i <= n; i++) {
        const u = i / n;
        const ph = (u * 2) % 2;
        const a = ph <= 1 ? ph : 2 - ph;
        s.push(
          S(0.2 + u * 3.2, i === 1 ? 'AMOUNT 0 -> 1 -> 0 (x2)' : '', () => {
            h?.set('amount', a);
            const z = a >= 0.82 ? 1 : 0;
            if (z && !zone) A.sfx('se_hanko_zone');
            zone = z;
            h?.set('zone', z);
          }),
        );
      }
      s.push(
        S(3.55, 'RELEASE: STAMP_HEAVY + THUD_LOW', () => {
          h?.stop(0.02);
          A.sfx('se_stamp_heavy');
          A.sfx('se_thud_low');
        }),
      );
      return s;
    },
  },
  {
    id: 'roulette',
    label: '当たりルーレット（sfxLoop）',
    ref: '9.9',
    build: () => {
      let h: A.LoopHandle | null = null;
      return [
        S(0, 'SE_ROULETTE LOOP', () => void (h = A.sfxLoop('se_roulette'))),
        S(2.0, 'STOP + SE_ATARI', () => {
          h?.stop(0.01);
          A.sfx('se_atari');
        }),
      ];
    },
  },
  {
    id: 'jingles',
    label: 'ジングルで一時停止',
    ref: '6.1',
    build: () => {
      const s: CueStep[] = [];
      const o = withField(s, 'bgm_home');
      s.push(
        S(o + 0.5, 'BGM_JINGLE_ITEM (PAUSE SONG)', () => A.playBgm('bgm_jingle_item')),
        S(o + 1.0, 'BGM_JINGLE_JOIN (QUEUED)', () => A.playBgm('bgm_jingle_join')),
        S(o + 7.0, 'SONG RESUMES (0.4S)', () => undefined),
      );
      return s;
    },
  },
  {
    id: 'levelup',
    label: '通知表の判とジングル',
    ref: '6.3 / 9.5',
    build: () => {
      const semis = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
      const s: CueStep[] = [
        S(0, 'SE_PAPER_OPEN + JINGLE_LEVELUP', () => {
          A.sfx('se_paper_open');
          A.playBgm('bgm_jingle_levelup');
        }),
      ];
      semis.forEach((st, i) =>
        s.push(S(0.96 + 0.12 * i, i ? '' : 'ROWS: STAMP_LIGHT ON THE C MAJOR SCALE', at('se_stamp_light', { pitch: Math.pow(2, st / 12) }))),
      );
      return s;
    },
  },
  {
    id: 'gameover',
    label: '全滅',
    ref: '12.5',
    build: () => {
      const s: CueStep[] = [];
      const o = withBattle(s, 0);
      s.push(
        S(o, 'SE_KO', at('se_ko')),
        S(o + 0.5, 'BATTLE BGM OUT 0.8S, AMB OFF', () => {
          A.stopBgm(0.8);
          A.stopAllAmbient(0.8);
        }),
        S(o + 2.0, 'BGM_JINGLE_GAMEOVER', () => A.playBgm('bgm_jingle_gameover')),
      );
      return s;
    },
  },
];
