// 戦闘の ひとことヒント（2026-10-22 改善会議 4）：何ラウンドか 止まっている とき
// （ツッコミが 決まらない／敵が 減らない）だけ、画面の すみに 小さく 1行。1回の 戦闘で 1回まで。
//
//  - 止まっている ラウンド：「！」が あったのに ツッコミが 1つも 決まらなかった、または 敵の HP が
//    へらず だれも 思いださなかった（すねて いる・ふた・錠・巻きもどし も ここに 入る）。
//  - それが 3ラウンド 続いたら、つぎの コマンド入力の あいだだけ 出す（HINT_ROUNDS）。
//  - 言葉は その戦闘の 決まり（ch2rules・ch3rules・ボス）に 合わせて HINTS の 上から 合う物。
//    ツッコミだけが 決まらない ときは ツッコミの 言葉。
//  - 付箋（チュートリアル）・一覧・カードが 出ている 間は 出さない（しるしと 同時に 出さない）。
//    練習の 戦闘・負け戦（ツガオ初戦）・コマンドが 1つに 決まる 場面では 出さない。

import { flag } from '../game/state';
import type { Gfx } from '../engine/gfx';
import { measure } from '../engine/font';
import { markText } from '../engine/textzones';
import type { BattleScene } from './scene';
import type { PartyCmd } from './model';
import { tapeCanvas } from './ui/note';
import { yobiState } from './boss_yobimodoshi';
import { potReady } from './ch3rules';

/** Rounds in a row with no headway before the hint shows. */
export const HINT_ROUNDS = 3;
/** How long it stays up (ms of command input). */
const HINT_MS = 9000;

interface Hint {
  /** Matches this battle and what is stuck now. */
  when: (s: BattleScene) => boolean;
  text: string;
}

const alive = (s: BattleScene, id: string) => s.aliveEnemies.find((e) => e.id === id);
const has = (s: BattleScene, skill: string) => !!s.minato?.m.skills.includes(skill);

/** The rules' words, the first that fits (the enemies' own way out first). */
export const HINTS: Hint[] = [
  // 第1章（20 11.2）
  { when: (s) => s.aliveEnemies.some((e) => e.id === 'enemy_semi_final' && !e.mem.seen) && has(s, 'skill_mimashita'), text: '死んだふりに『みました』' },
  // 第2章（51 7章・9.2）
  { when: (s) => s.aliveEnemies.some((e) => e.status.sune) && has(s, 'skill_mimashita'), text: 'すねたら『みました』' },
  { when: (s) => s.aliveEnemies.some((e) => e.status.tetsuya && !(e.status.kyuukei ?? 0)) && has(s, 'skill_otsukaresama'), text: '『おつかれさま』で 休ませよう' },
  { when: (s) => s.bossKind === 'yobimodoshi' && !yobiState(s).light && yobiState(s).charge <= 0, text: 'もちものの トマトで てらそう' },
  { when: (s) => s.bossKind === 'yobimodoshi', text: '光った ラッパに『みました』' },
  { when: (s) => s.bossKind === 'omukaemachi', text: '光る 部位に『みました』' },
  // 第3章（ch3rules・boss_c3aq）
  { when: (s) => s.aliveEnemies.some((e) => e.status.c3_mayoi), text: 'いいよどんだら ツッコミ' },
  { when: (s) => !!potReady(s) && has(s, 'skill_hanamaru'), text: '鍋に『はなまる』' },
  { when: (s) => !!alive(s, 'enemy_okawarinabe')?.status.c3_futa, text: 'ガタガタしたら ツッコミ' },
  { when: (s) => !!alive(s, 'enemy_nariosame') && has(s, 'skill_itadakimasu'), text: 'もどる ときは『いただきます』' },
  { when: (s) => !!alive(s, 'boss_hirosuke') && has(s, 'skill_gochisousama'), text: '黒い『まだ』に『ごちそうさま』' },
  { when: (s) => !!alive(s, 'boss_pokosha'), text: '黒い ふきだしに『ツッコむ』' },
  // どの 戦闘でも
  { when: (s) => !!flag('flag_got_hanko') && (s.memo.hintTataku ?? 0) >= HINT_ROUNDS && (s.minato?.m.mp ?? 0) > 0, text: 'ハンコは 長押し、光ったら はなす' },
  { when: () => true, text: 'ボケ負けの 相手は よく きく' },
];

/** ツッコミだけが 決まらない とき. */
export const HINT_TSUKKOMI = '輪が とじる ときに けってい';

/** Every line the hint can say (the text checks). */
export function hintTexts(): string[] {
  return [...HINTS.map((h) => h.text), HINT_TSUKKOMI];
}

// ---- the record of each round --------------------------------------------------------------

const hpSum = (s: BattleScene) => s.enemies.reduce((n, e) => n + (e.alive ? Math.max(0, e.hp) : 0), 0);
const aliveN = (s: BattleScene) => s.aliveEnemies.length;

/** A tsukkomi window resolved (enemy.ts hitLoop): answered or not. */
export function hintTsukkomi(s: BattleScene, ok: boolean): void {
  s.memo.hintTsukN = (s.memo.hintTsukN ?? 0) + 1;
  if (ok) s.memo.hintTsukOk = (s.memo.hintTsukOk ?? 0) + 1;
}

function quiet(s: BattleScene): boolean {
  return !!s.lesson || s.enemies.some((e) => e.id === 'boss_tsugao_1') || !!s.memo.bossFinal || !!s.memo.nafudaTurn;
}

/** Before the commands of a round: the last round judged, and the hint put up when it is time. */
export function hintRoundStart(s: BattleScene): void {
  if (s.round > 1 && s.memo.hintHp0 !== undefined) {
    const tsukN = s.memo.hintTsukN ?? 0;
    const noTsuk = tsukN > 0 && !(s.memo.hintTsukOk ?? 0);
    const noProg = hpSum(s) >= s.memo.hintHp0 && aliveN(s) >= (s.memo.hintAlive0 ?? 0);
    s.memo.hintStuck = noTsuk || noProg ? (s.memo.hintStuck ?? 0) + 1 : 0;
    s.memo.hintNoProg = noProg ? 1 : 0;
  }
  s.memo.hintHp0 = hpSum(s);
  s.memo.hintAlive0 = aliveN(s);
  s.memo.hintTsukN = 0;
  s.memo.hintTsukOk = 0;
  if (s.memo.hintDone || (s.memo.hintStuck ?? 0) < HINT_ROUNDS || quiet(s)) return;
  const text = s.memo.hintNoProg ? HINTS.find((h) => h.when(s))?.text : HINT_TSUKKOMI;
  if (!text) return;
  s.memo.hintDone = 1;
  hint = { s, text, t: 0 };
}

/** After the commands: しゅん's たたく counted (the hanko's word), the hint taken down. */
export function hintCommands(s: BattleScene, cmds: readonly PartyCmd[]): void {
  const mine = cmds.find((c) => c.u.id === 'minato');
  s.memo.hintTataku = mine?.kind === 'attack' ? (s.memo.hintTataku ?? 0) + 1 : 0;
  if (hint?.s === s) hint = null;
}

let hint: { s: BattleScene; text: string; t: number; rt?: number } | null = null;

/** QA: the hint up now (or put one up: `__game.cmd.bhint('…')`). */
export function hintNow(s: BattleScene, text?: string): string | null {
  if (text) hint = { s, text, t: 0 };
  return hint?.s === s ? hint.text : null;
}

/**
 * The hint in the corner: a small tape under the band's left end (where the
 * tutorial sticky would sit — never both), while the commands are chosen.
 */
export function drawHint(s: BattleScene, g: Gfx): void {
  if (!hint || hint.s !== s) return;
  const dt = hint.rt === undefined ? 0 : Math.max(0, Math.min(100, s.rt - hint.rt));
  hint.rt = s.rt;
  if (!s.cmd || s.sticky || s.list || s.card) return;
  hint.t += dt;
  if (hint.t > HINT_MS + 300) {
    hint = null;
    return;
  }
  const w = measure(hint.text) + 14;
  const img = tapeCanvas(w, 18, hint.text, '#E8D9B5', 7);
  const x = 8;
  const y = s.msg.bottom + 4;
  const k = Math.min(1, hint.t / 200) * (hint.t > HINT_MS ? Math.max(0, 1 - (hint.t - HINT_MS) / 300) : 1);
  markText(x, y, w, 18);
  g.alpha(0.9 * k, () => g.img(img, x, y - Math.round((1 - Math.min(1, hint!.t / 200)) * 4)));
}
