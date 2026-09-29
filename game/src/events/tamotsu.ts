// 第1章「浮きを 見ている だけ」（2026-09-29 依頼主の採用。02_ch2_index #66、
// 10_narrative 6.25・7.21、30_level_art 3.4・3.5・3.13・4.18・9.3）。
//
// おぴぃ（npc_tamotsu。★2026-09-29 依頼主の指示で たもつ→おぴぃ、40代の女性。IDは 据え置き）：
// 閉店した つりえさ屋の元店主。対岸の畦道の 東の端 (21,39)、
// 伏せた バケツに 座って、田んぼの 水口 (20,41) の ペットボトルの しかけを 見ている。
//   1回目：2倍に寄って〔meet〕（小林さんとこの しゅんくん、あだ名は おぴぃ、道具を 貸す）。
//   それから：北岸に 置いたままの種を、話すたびに 1つずつ（見た物だけ。メダカは 最後）
//     uki（石段の浮き）→ kanban（看板の『ザリガニは 可』）→ gyotaku（32cm → 29cm）
//     → sao（竿は おまわりさんの あずかりもの。懸垂の はなまるを もらった人には 地の文を1行）
//     → medaka（『換気中』も えさも おぴぃ。「店は 3月で 閉めた。メダカは、閉められない。」）
//   答える種が ないときは 段階の台詞（s0_1/s0_2、s1 は {wave}、s2「糸が 北東へ……」）。
//   最後に「……やってく？」→ ザリガニ釣り（src/events/tsuri.ts）。水口を 調べても 同じ。
// 釣ったあと：計る（盛る）→ はじめての1匹は ラムネ → 記録は ザリ拓（つりえさ屋の壁、
//   魚拓の となり）→ グソっ君の「今、盛ったやろ」（1回）→ 放す。
//   長靴（おぴぃの。1回）、空き缶（持って帰る → ほめる）、ぬし（計らない。おぴぃの浮き）。
//
//   __game.cmd.tamotsu(stage)          対岸の おぴぃの前へ（段階 0/1/2 の状態を作る）
//   __game.cmd.tsuri(opts)             釣りを すぐに（{ stage, spot, kind, cm, outcome, auto }）
//   __game.cmd.zari({ best, count })   記録と 釣った数を 入れる（0 で消す）
//   __game.cmd.tamotsuText()           全ページの 文字幅（3行・336px。wrapCheck も 呼ぶ）

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { measure } from '../engine/font';
import { addItem, flag, setFlag } from '../game/state';
import { registerDebug } from '../debug';
import { actor, msg, registerScript, se, stage } from '../world/api';
import { field } from '../world/field';
import { SPEAKERS } from '../world/msg';
import { uiHud } from '../ui/hud';
import {
  BOOT,
  BOOT_END,
  BOOT_FLIP,
  CAN,
  CAN_KEEP,
  CAN_PRAISE,
  CAN_PRAISE_1,
  DROP,
  DROP_1,
  EARLY,
  EARLY_1,
  FIRST,
  FIRST_FULL,
  FLIP_MORI,
  GOT_RAMUNE,
  LOST,
  LOST_1,
  MIZUGUCHI,
  NUSHI,
  NUSHI_AGAIN,
  NUSHI_GET,
  NUSHI_GIFT,
  NUSHI_RELEASE,
  OWED,
  RECORD,
  RECORD_1,
  RECORD_1B,
  RELEASE,
  RELEASE_1,
  RELEASE_NARR_1,
  STILL_HOLD,
  TAMOTSU,
  TAMOTSU_SPEAKER,
  releaseNarr,
  tamotsuMeasure,
  tamotsuTextSamples,
  zariTakuText,
} from '../data/text/tamotsu';
import { F, getKeyItem, panBack, panTo, walkTo } from './lib';
import { forceBoxPos, keyGuide, talkZoom, zoomOut } from './stage';
import {
  cardMeasure,
  cardMori,
  cardShow,
  cardTrace,
  closePanel,
  openPanel,
  playRound,
  releaseAnim,
  tsuriCamera,
  tsuriGuideRows,
  type CatchKind,
  type Outcome,
  type RoundResult,
  type Spot,
  type TsuriPanel,
} from './tsuri';

SPEAKERS.npc_tamotsu ??= TAMOTSU_SPEAKER;

/** Flags (10_narrative 3.6). */
export const TF = {
  met: 'flag_tamotsu_met',
  /** 釣った ザリガニの数（長靴は 数えない。缶の中の子は 数える）。 */
  count: 'flag_zari_count',
  /** 釣りを した回数（1回＝下ろした 1回）。 */
  tries: 'flag_zari_try',
  /** 記録：おぴぃ 認定の いちばん大きい cm（ザリ拓）。 */
  best: 'flag_zari_best',
  ramune: 'flag_zari_ramune',
  ramuneOwed: 'flag_zari_ramune_owed',
  boot: 'flag_zari_boot',
  can: 'flag_zari_can',
  nushi: 'flag_zari_nushi',
  /** 土管で ぬしに 会わなかった回数（8回目で 出る）。 */
  dokanDry: 'flag_zari_dokan_dry',
  flipMori: 'flag_zari_flip_mori',
  flipBoot: 'flag_zari_flip_boot',
  early: 'flag_zari_early',
  lost: 'flag_zari_lost',
  drop: 'flag_zari_drop',
  release: 'flag_zari_release',
  mori: 'flag_zari_mori',
} as const;

/** The seeds left on the north bank, in the order they are answered, and what must have been seen. */
const SEEDS: { key: 'uki' | 'kanban' | 'gyotaku' | 'sao' | 'medaka'; seen: string }[] = [
  { key: 'uki', seen: 'flag_seen_obj_river_steps' },
  { key: 'kanban', seen: 'flag_seen_obj_canal_sign' },
  { key: 'gyotaku', seen: 'flag_seen_obj_sb_gyotaku' },
  { key: 'sao', seen: 'flag_seen_obj_sb_rods' },
  { key: 'medaka', seen: 'flag_seen_obj_sb_tank' },
];
const seedFlag = (k: string) => `flag_tamotsu_${k}`;

/** The next seed to answer (seen, not yet answered; the medaka always last). */
function nextSeed(): (typeof SEEDS)[number]['key'] | null {
  for (const s of SEEDS) if (flag(s.seen) && !flag(seedFlag(s.key))) return s.key;
  return null;
}

/** Her line of the stage (s1: the same words every time, and the narration adds a line the 2nd time). */
function stageLine(s: number): string {
  const f = `flag_seen_npc_tamotsu_s${s}`;
  const n = flag(f);
  setFlag(f, n + 1);
  const T = TAMOTSU as Record<string, string>;
  return T[`s${s}_${Math.min(2, n + 1)}`] ?? T.s0_1;
}

function kanenariWatching(): boolean {
  return !!flag('flag_kanenari_joined') && !!field()?.follower?.visible;
}

// ---------------------------------------------------------------- QA

let qaForce: { kind?: CatchKind; cm?: number; spot?: Spot; outcome?: Outcome } | undefined;
let qaAuto = false;

// ---------------------------------------------------------------- talking to おぴぃ

function* giveOwedRamune(): Co {
  if (!flag(TF.ramuneOwed)) return;
  yield* msg(OWED);
  if (addItem('item_ramune')) {
    setFlag(TF.ramuneOwed, 0);
    setFlag(TF.ramune, 1);
    yield 34;
    uiHud.clearNotes();
    se('se_item');
    yield* msg(GOT_RAMUNE);
  } else yield* msg(FIRST_FULL);
}

registerScript('npc_tamotsu', function* (): Co {
  const s = stage();
  if (s > 2) return;
  const f = field();
  const a = actor('npc_tamotsu');
  yield* giveOwedRamune();
  if (!flag(TF.met)) {
    // the first talk: close on the two of them (2×), as with the town's first meetings
    const z = f && a ? yield* talkZoom(f.player, a) : null;
    yield* msg(TAMOTSU.meet);
    if (s >= 1) yield* msg(stageLine(s));
    if (z) yield* zoomOut(z, 300);
    setFlag(TF.met, 1);
  } else {
    const seed = nextSeed();
    if (seed) {
      yield* msg((TAMOTSU as Record<string, string>)[seed]);
      setFlag(seedFlag(seed), 1);
      if (seed === 'sao' && flag('flag_got_hanamaru_kensui')) yield* msg(TAMOTSU.sao_kensui);
    } else yield* msg(stageLine(s));
  }
  const i = yield* msg(TAMOTSU.ask);
  if (i === 0) yield* tsuriSession();
});

/** 水口 (20,41): what is in it by the stage; then, once she has been met, the same offer. */
registerScript('obj_tamotsu_mizuguchi', function* (): Co {
  se('se_examine');
  const s = stage();
  yield* msg(s === 1 ? MIZUGUCHI.s1 : s === 2 ? MIZUGUCHI.s2 : MIZUGUCHI.s0);
  if (s > 2) return;
  if (!flag(TF.met)) {
    yield* msg(MIZUGUCHI.nudge);
    return;
  }
  const a = actor('npc_tamotsu');
  const p = field()?.player;
  if (a && p) a.dir = 'left';
  const i = yield* msg(TAMOTSU.mizuguchi_ask);
  if (a) a.dir = 'down';
  if (i === 0) yield* tsuriSession();
});

/** つりえさ屋の魚拓：今の文のまま。ザリ拓が 貼られていれば、となりの 1ページを 足す。 */
registerScript('obj_sb_gyotaku', function* (ctx): Co {
  yield* ctx.runDefault();
  const best = flag(TF.best);
  if (best > 0) yield* msg(zariTakuText(best, stage()));
});

// ---------------------------------------------------------------- the fishing

function* tsuriSession(): Co {
  const f = F();
  const p = f.player;
  const s = stage();
  // to the edge of the inlet, facing it; おぴぃ watches the same water
  if (p.tileX !== 20 || p.tileY !== 40) yield* walkTo('player', 20, 40, { face: 'down' });
  p.dir = 'down';
  const a = actor('npc_tamotsu');
  if (a) {
    a.data.scripted = true;
    a.dir = 'down';
  }
  forceBoxPos('bottom');
  const cam = tsuriCamera();
  yield* panTo((cam.x - 8) / 16, (cam.y - 8) / 16, 500);
  const panel = yield* openPanel(s, flag(TF.best));
  panel.auto = qaAuto;
  panel.onNet = (on) => {
    if (a) a.tempPose = on ? 'scoop' : null;
  };
  // the first time: she tells how it goes, with the water in view
  if (!flag(TF.tries)) {
    yield* msg(TAMOTSU.howto);
    panel.clearInput();
    if (!qaAuto) keyGuide(tsuriGuideRows(), 4200, 8);
  }
  try {
    for (;;) {
      const r = yield* playRound(panel, {
        first: !flag(TF.tries),
        bootFound: !!flag(TF.boot),
        dokanDry: flag(TF.dokanDry),
        force: qaForce,
      });
      if (r.outcome === 'quit') break;
      if (r.outcome !== 'caught') panel.phase = 'end';
      setFlag(TF.tries, flag(TF.tries) + 1);
      if (r.spot === 'dokan') setFlag(TF.dokanDry, r.kind === 'nushi' ? 0 : flag(TF.dokanDry) + 1);
      yield* afterRound(panel, r, s);
      if (qaAuto) break;
      const i = yield* msg(TAMOTSU.again);
      if (i !== 0) break;
    }
  } finally {
    // (a jump in QA may cut the scene: the window must not stay)
    if (!panel.done) {
      panel.cues.clear();
      panel.done = true;
      game.ui.remove(panel);
    }
  }
  yield* msg(TAMOTSU.bye);
  yield* panBack(500);
  forceBoxPos(null);
  if (a) {
    a.tempPose = null;
    a.dir = 'down';
    delete a.data.scripted;
  }
}

/** Everything after one round: the words of the miss, or the catch on the page, then back to the water. */
function* afterRound(panel: TsuriPanel, r: RoundResult, s: number): Co {
  const pick = (list: string[], key: string) => {
    const n = flag(key);
    setFlag(key, n + 1);
    return list[(n - 1 + list.length) % list.length];
  };
  if (r.outcome === 'early') {
    yield* msg(flag(TF.early) ? pick(EARLY, TF.early) : (setFlag(TF.early, 1), EARLY_1));
    return;
  }
  if (r.outcome === 'lost') {
    yield* msg(flag(TF.lost) ? pick(LOST, TF.lost) : (setFlag(TF.lost, 1), LOST_1));
    return;
  }
  if (r.outcome === 'drop') {
    yield* msg(flag(TF.drop) ? pick(DROP, TF.drop) : (setFlag(TF.drop, 1), DROP_1));
    return;
  }
  // ---- caught
  if (r.kind === 'boot') {
    yield* cardShow(panel, 'boot', 0, { noRuler: true });
    yield* msg(BOOT);
    if (kanenariWatching() && !flag(TF.flipBoot)) {
      setFlag(TF.flipBoot, 1);
      yield* msg(BOOT_FLIP);
    }
    yield* msg(BOOT_END);
    setFlag(TF.boot, 1);
    yield* releaseAnim(panel, r.spot, 'boot', 0);
    return;
  }
  if (r.kind === 'nushi') {
    yield* cardShow(panel, 'nushi', r.cm, { noRuler: true });
    if (!flag(TF.nushi)) {
      yield* msg(NUSHI);
      setFlag(TF.nushi, 1);
      yield* msg(NUSHI_GIFT);
      yield* getKeyItem('item_tamotsu_uki', NUSHI_GET);
      yield* releaseAnim(panel, r.spot, 'nushi', r.cm, { nushi: true });
      yield* msg(NUSHI_RELEASE);
    } else {
      yield* releaseAnim(panel, r.spot, 'nushi', r.cm, { nushi: true });
      yield* msg(NUSHI_AGAIN);
    }
    return;
  }
  const inCan = r.kind === 'can';
  if (inCan) {
    yield* cardShow(panel, 'can', r.cm, { noRuler: true });
    yield* msg(CAN);
  }
  // on the ruler: the pencil number, then her bump
  yield* cardShow(panel, r.kind, r.cm);
  if (s === 1) yield* msg(STILL_HOLD);
  yield* cardMeasure(panel);
  const k = flag(TF.mori);
  setFlag(TF.mori, k + 1);
  const [line, cert] = tamotsuMeasure(r.kind as 'kozari' | 'zari' | 'makka' | 'can', r.cm, k, s);
  yield* msg(line);
  yield* cardMori(panel, cert);
  if (cert > r.cm && kanenariWatching() && !flag(TF.flipMori)) {
    setFlag(TF.flipMori, 1);
    yield* msg(FLIP_MORI);
  }
  const first = !flag(TF.count);
  setFlag(TF.count, flag(TF.count) + 1);
  if (first) {
    yield* msg(FIRST);
    if (addItem('item_ramune')) {
      setFlag(TF.ramune, 1);
      yield 34;
      uiHud.clearNotes();
      se('se_item');
      yield* msg(GOT_RAMUNE);
    } else {
      setFlag(TF.ramuneOwed, 1);
      yield* msg(FIRST_FULL);
    }
  }
  const best = flag(TF.best);
  if (cert > best) {
    yield* msg(best ? RECORD : RECORD_1);
    yield* cardTrace(panel, cert);
    setFlag(TF.best, cert);
    panel.record = cert;
    yield 400;
    if (!best) yield* msg(RECORD_1B);
  }
  if (inCan) {
    yield* msg(CAN_KEEP);
    yield* msg(flag(TF.can) ? CAN_PRAISE : CAN_PRAISE_1);
    setFlag(TF.can, flag(TF.can) + 1);
  }
  // let it go: it walks home tail first, the するめ in its claws
  const n = flag(TF.release);
  setFlag(TF.release, n + 1);
  yield* msg(n ? RELEASE[(n - 1) % RELEASE.length] : RELEASE_1);
  yield* releaseAnim(panel, r.spot, r.kind, r.cm);
  yield* msg(n ? releaseNarr(r.spot, n) : RELEASE_NARR_1);
}

// ---------------------------------------------------------------- QA

/** Every page: at most 3 lines, each at most 336 px (10 1.1). */
export function tamotsuTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  for (const [name, src] of Object.entries(tamotsuTextSamples())) {
    let lines: string[] = [];
    const flush = () => {
      if (!lines.length) return;
      pages++;
      if (lines.length > 3) bad.push(`${name}: ${lines.length} lines: ${lines.join('／')}`);
      lines = [];
    };
    for (const raw of src.split('\n')) {
      const t = raw.trim();
      if (!t || t.startsWith('>')) continue;
      if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || /^\[.*\]$/.test(t)) {
        flush();
        continue;
      }
      const w = measure(t.replace(/\{[^}]*\}/g, ''));
      if (w > 336) bad.push(`${name}: ${w}px: ${t}`);
      lines.push(t);
    }
    flush();
  }
  if ([...TAMOTSU_SPEAKER.name].length > 6) bad.push(`name tag ${TAMOTSU_SPEAKER.name}`);
  // the words in the first chapter that are kept for later (10 2.x): 平和, まだ, 17
  for (const [name, src] of Object.entries(tamotsuTextSamples())) if (/平和|まだ|17/.test(src.replace(/\{[^}]*\}/g, ''))) bad.push(`${name}: a word kept for later`);
  return { pages, bad };
}
registerDebug('tamotsuText', () => tamotsuTextCheck());

const BEAT: Record<number, string> = { 0: 'town', 1: 'alley', 2: 'stage2' };

/** QA: in front of おぴぃ at a stage (0/1/2). `talk`: flags as if she was met and every seed seen. */
registerDebug('tamotsu', (st = 0, o: { met?: boolean; seeds?: boolean; x?: number; y?: number; dir?: string } = {}) => {
  const cmd = (window as unknown as { __game: { cmd: Record<string, (...a: unknown[]) => unknown> } }).__game.cmd;
  cmd.jump?.(BEAT[st] ?? 'town', true);
  if (o.met) setFlag(TF.met, 1);
  if (o.seeds) for (const s of SEEDS) setFlag(s.seen, 1);
  return cmd.warp?.('map_town', o.x ?? 20, o.y ?? 39, o.dir ?? 'right');
});

/**
 * QA: start the fishing at once, from where he stands by おぴぃ. opts:
 * { spot: 'kusa'|'ishi'|'dokan', kind, cm, outcome: 'drop', auto: true } (auto plays itself).
 */
registerDebug('tsuri', (o: { spot?: Spot; kind?: CatchKind; cm?: number; outcome?: Outcome; auto?: boolean; met?: boolean } = {}) => {
  const f = field();
  if (!f) return 'field not active';
  qaForce = o.spot || o.kind || o.cm || o.outcome ? { spot: o.spot, kind: o.kind, cm: o.cm, outcome: o.outcome } : undefined;
  qaAuto = !!o.auto;
  if (o.met !== false) setFlag(TF.met, 1);
  f.startScript(
    (function* (): Co {
      try {
        yield* tsuriSession();
      } finally {
        qaForce = undefined;
        qaAuto = false;
      }
    })(),
  );
  return 'tsuri';
});

/** QA: the record and the count (0 clears the record, the ザリ拓 goes). */
registerDebug('zari', (o: { best?: number; count?: number; tries?: number; boot?: number; nushi?: number } = {}) => {
  if (o.best !== undefined) setFlag(TF.best, o.best);
  if (o.count !== undefined) setFlag(TF.count, o.count);
  if (o.tries !== undefined) setFlag(TF.tries, o.tries);
  if (o.boot !== undefined) setFlag(TF.boot, o.boot);
  if (o.nushi !== undefined) setFlag(TF.nushi, o.nushi);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(TF)) out[k] = flag(v);
  return out;
});
